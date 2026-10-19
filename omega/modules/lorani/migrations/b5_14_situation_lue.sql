-- LORANI, lot B5-14 — une situation de travaux lue par le lecteur devient seule une situation « à viser ».
--
-- Pourquoi : b5_13 a posé le contrôle des situations (marché, précédente, date limite), mais chaque situation devait
-- être saisie à la main dans l'écran. Les entreprises l'envoient en PDF : déposée sur le dossier (écran, ou courriel
-- rangé par b5_11), elle est lue par le lecteur d'A1. Sur le modèle de B4 (Tamila, avis du greffe) : un type de pièce
-- dans la fiche (omega/modules/lorani/CHAMPS-LECTURE-LORANI.md, `lorani_situation_travaux`) et une porte du socle qui
-- pose ce qui est lu.
--
-- Ce qui est posé :
--   · private.lorani_montant_lu(text) → numeric : « 72 500,00 », « 72500.00 », « 72.500,00 € » → 72500.00 ; null si
--     illisible.
--   · private.lorani_poser_situation_lue(p_piece uuid) → jsonb : la pièce (module lorani, objet lorani_projet, lue ou à
--     vérifier, type lorani_situation_travaux) ; ses valeurs (numero_situation, mois, cumul_ht, titulaire, lot) ;
--     le marché : celui du lot cité dont le titulaire concorde (sans accents ni forme juridique), sinon le seul marché
--     dont le titulaire concorde, sinon le seul marché actif du projet ; le numéro : celui lu, sinon le suivant ; puis
--     une ligne lorani_situations « à viser » (reçue le jour de la pièce, piece_id renseigné) : les triggers de b5_13
--     font le reste (date limite, comparaison au marché et à la précédente, alertes). Idempotent (une pièce ne pose
--     qu'une situation ; un numéro déjà reçu n'est pas doublé). Marché introuvable ou ambigu, cumul illisible :
--     alerte « situation lue, à ranger » sur le dossier, rien n'est posé. Journal lorani.situation_lue.
--   · private.lorani_lectures_passage() (corps de b5_11) : une pièce lue de type lorani_situation_travaux passe par
--     cette porte ; les courriers de la mairie suivent private.lorani_lire_piece comme avant.
-- Fonctions nouvelles fermées au public. Migration idempotente ; rien n'est retiré.

CREATE OR REPLACE FUNCTION private.lorani_montant_lu(p text)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  s text := regexp_replace(coalesce(p, ''), '[^0-9,.\-]', '', 'g');
begin
  if s = '' then
    return null;
  end if;
  -- « 72.500,00 » ou « 72 500,00 » : la virgule est décimale ; « 72,500.00 » : le point l'est
  if s ~ ',\d{1,2}$' then
    s := replace(replace(s, '.', ''), ',', '.');
  else
    s := replace(s, ',', '');
  end if;
  return round(s::numeric, 2);
exception when others then
  return null;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_montant_lu(text) FROM PUBLIC;

-- Un nom d'entreprise comparable : minuscules, sans accents ni ponctuation ni forme juridique.
CREATE OR REPLACE FUNCTION private.lorani_nom_comparable(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select nullif(btrim(regexp_replace(
           regexp_replace(lower(translate(coalesce(p, ''), 'ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜàâäçéèêëîïôöùûü', 'AAACEEEEIIOOUUUaaaceeeeiioouuu')),
                          '\m(sas|sasu|sarl|eurl|sa|sci|snc|scop|ets|etablissements|entreprise|societe)\M', ' ', 'g'),
           '[^a-z0-9]+', ' ', 'g')), '')
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_nom_comparable(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.lorani_poser_situation_lue(p_piece uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.pieces;
  pr public.lorani_projets;
  v jsonb;
  v_lot text;
  v_titulaire text;
  v_cumul numeric;
  v_numero integer;
  v_mois date;
  v_marches uuid[];
  m public.lorani_marches;
  v_id uuid;
  v_motif text;
begin
  select * into p from public.pieces where id = p_piece;
  if not found then
    return jsonb_build_object('ignore', 'pièce introuvable');
  end if;
  if p.module <> 'lorani' or p.objet_type is distinct from 'lorani_projet' or p.type_piece is distinct from 'lorani_situation_travaux' then
    return jsonb_build_object('ignore', 'pas une situation de travaux d''un dossier Lorani');
  end if;
  if p.statut not in ('lue', 'a_verifier') then
    return jsonb_build_object('ignore', 'pièce non lue');
  end if;
  select * into pr from public.lorani_projets x where x.client_id = p.client_id and x.id::text = p.objet_id;
  if not found then
    return jsonb_build_object('ignore', 'dossier introuvable');
  end if;
  -- Déjà posée par cette pièce ?
  select s.id into v_id from public.lorani_situations s where s.client_id = p.client_id and s.piece_id = p.id limit 1;
  if v_id is not null then
    return jsonb_build_object('piece', p.id, 'situation', v_id, 'deja', true);
  end if;

  v := private.lorani_valeurs_de_piece(p.id);
  v_lot := nullif(btrim(v #>> '{lot,valeur}'), '');
  v_titulaire := private.lorani_nom_comparable(v #>> '{titulaire,valeur}');
  v_cumul := private.lorani_montant_lu(v #>> '{cumul_ht,valeur}');
  v_numero := case when (v #>> '{numero_situation,valeur}') ~ '^\s*\d{1,3}\s*$' then (v #>> '{numero_situation,valeur}')::integer end;
  v_mois := case when (v #>> '{mois,valeur}') ~ '^\d{4}-\d{2}(-\d{2})?$' then (left(v #>> '{mois,valeur}', 7) || '-01')::date end;

  -- Le marché : lot et titulaire, puis titulaire seul, puis le seul marché du projet.
  select coalesce(array_agg(mm.id), '{}') into v_marches
  from public.lorani_marches mm join public.lorani_lots l on l.id = mm.lot_id
  where mm.projet_id = pr.id and mm.actif and v_lot is not null
    and upper(l.numero) = upper(v_lot)
    and (v_titulaire is null or private.lorani_nom_comparable(mm.titulaire) = v_titulaire
         or private.lorani_nom_comparable(mm.titulaire) like '%' || v_titulaire || '%'
         or v_titulaire like '%' || private.lorani_nom_comparable(mm.titulaire) || '%');
  if cardinality(v_marches) <> 1 and v_titulaire is not null then
    select coalesce(array_agg(mm.id), '{}') into v_marches
    from public.lorani_marches mm
    where mm.projet_id = pr.id and mm.actif
      and (private.lorani_nom_comparable(mm.titulaire) = v_titulaire
           or private.lorani_nom_comparable(mm.titulaire) like '%' || v_titulaire || '%'
           or v_titulaire like '%' || private.lorani_nom_comparable(mm.titulaire) || '%');
  end if;
  if cardinality(v_marches) <> 1 then
    select coalesce(array_agg(mm.id), '{}') into v_marches
    from public.lorani_marches mm where mm.projet_id = pr.id and mm.actif
    having count(*) = 1;
  end if;

  v_motif := case when coalesce(cardinality(v_marches), 0) <> 1 then 'marché non reconnu'
                  when v_cumul is null then 'cumul illisible' end;
  if v_motif is not null then
    perform private.lever_alerte_module(p.client_id, 'lorani', 'attention',
      left(format('« %s » : situation de travaux lue (%s), à ranger : %s%s.', left(pr.nom, 60), left(p.nom_fichier, 60), v_motif,
                  case when v #>> '{titulaire,valeur}' is not null then ' — titulaire lu « ' || left(v #>> '{titulaire,valeur}', 50) || ' »' else '' end), 200),
      jsonb_build_object('projet', pr.id, 'piece', p.id, 'valeurs', v, 'lien', private.lorani_lien_projet(pr.id)),
      'situation_lue:' || p.id, true, private.lorani_chef_de_projet(p.client_id, pr.id));
    return jsonb_build_object('piece', p.id, 'pose', false, 'motif', v_motif);
  end if;

  select * into m from public.lorani_marches where id = v_marches[1];
  if v_numero is null then
    select coalesce(max(s.numero), 0) + 1 into v_numero from public.lorani_situations s where s.marche_id = m.id;
  end if;
  v_id := null;
  insert into public.lorani_situations (client_id, projet_id, marche_id, numero, mois, cumul_ht, recue_le, piece_id)
  values (p.client_id, pr.id, m.id, v_numero, coalesce(v_mois, date_trunc('month', p.recue_le)::date),
          v_cumul, (p.recue_le at time zone 'Europe/Paris')::date, p.id)
  on conflict on constraint lorani_situations_une_fois do nothing
  returning id into v_id;
  if v_id is null then
    perform private.lever_alerte_module(p.client_id, 'lorani', 'attention',
      left(format('« %s » : situation n° %s de %s lue (%s), mais ce numéro est déjà reçu : à vérifier.', left(pr.nom, 60), v_numero,
                  left(m.titulaire, 50), left(p.nom_fichier, 50)), 200),
      jsonb_build_object('projet', pr.id, 'piece', p.id, 'marche', m.id, 'numero', v_numero, 'lien', private.lorani_lien_projet(pr.id)),
      'situation_lue:' || p.id, true, private.lorani_chef_de_projet(p.client_id, pr.id));
    return jsonb_build_object('piece', p.id, 'pose', false, 'motif', 'numéro déjà reçu', 'numero', v_numero);
  end if;
  perform private.journaliser_module(p.client_id, 'lorani', 'lorani.situation_lue', 'lorani_projet', pr.id::text,
    jsonb_build_object('piece', p.id, 'situation', v_id, 'marche', m.id, 'numero', v_numero, 'cumul_ht', v_cumul), pr.entite_id);
  return jsonb_build_object('piece', p.id, 'pose', true, 'situation', v_id, 'marche', m.id, 'numero', v_numero, 'cumul_ht', v_cumul);
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_poser_situation_lue(uuid) FROM PUBLIC;

-- Le passage des lectures (corps de b5_11) aiguille les situations de travaux vers leur porte.
CREATE OR REPLACE FUNCTION private.lorani_lectures_passage()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t public.travaux;
  r record;
  v_res jsonb;
  n integer := 0;
  n_erreurs integer := 0;
  n_agences integer := 0;
begin
  for t in select * from private.prendre_travaux(array['lorani.piece_lue', 'lorani.reception'], 200, interval '10 minutes', 'lorani_lecture') loop
    begin
      if t.genre = 'lorani.reception' then
        v_res := private.lorani_rattacher_reception((t.charge ->> 'reception')::bigint);
      elsif exists (select 1 from public.pieces x where x.id = (t.charge ->> 'piece')::uuid and x.type_piece = 'lorani_situation_travaux') then
        v_res := private.lorani_poser_situation_lue((t.charge ->> 'piece')::uuid);
      else
        v_res := private.lorani_lire_piece((t.charge ->> 'piece')::uuid);
      end if;
      perform private.finir_travail(t.id, v_res);
      n := n + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 2000));
      n_erreurs := n_erreurs + 1;
    end;
  end loop;
  -- Le battement de chaque agence qui a des dossiers en cours, même à vide.
  for r in select distinct pr.client_id from public.lorani_projets pr where pr.actif loop
    perform private.battre(r.client_id, 'lorani_lecture', jsonb_build_object('passage', now()), interval '15 minutes');
    n_agences := n_agences + 1;
  end loop;
  return jsonb_build_object('pieces', n, 'erreurs', n_erreurs, 'agences', n_agences);
end $function$;
