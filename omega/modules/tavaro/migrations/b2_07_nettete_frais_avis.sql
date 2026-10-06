-- b2_07 — Deux promesses de la vitrine tenues (audit des promesses, § 2 Tavaro ; session B2, 06/10/2026) :
--   « la photo floue est refusée » (module 12, état des lieux signé) et « les frais de dossier lui sont refacturés »
--   (module 14, amendes).
--
-- 1. LA PHOTO FLOUE. L'écran mesure la netteté de chaque photo dans le navigateur (variance du laplacien sur l'image
--    réduite à 512 px ; components/espace/tavaro/nettete.ts) et refuse une photo sous le seuil avant même l'envoi. La base
--    garde la mesure de chaque photo (photos[].nettete, preuves[].nettete) et refuse de passer un état des lieux à
--    « signé » si une photo mesurée est sous le seuil du loueur (loc_reglages.nettete_min, 40 par défaut). Une photo que
--    le navigateur n'a pas pu mesurer (format non décodé) passe : la mesure absente n'est pas un flou.
-- 2. LES FRAIS DE DOSSIER D'UN AVIS. public.loc_refacturer_avis(avis) : un avis désigné produit une proposition d'une
--    ligne, le poste FRAIS_AVIS du barème en vigueur, qui suit le chemin de toute facture (demande de validation, accord
--    d'une autre personne, facture émise, courriel). Le retour du contrat doit être déjà facturé ou sans rien à facturer :
--    le socle ne rechiffre pas un contrat facturé. Une seule refacturation par avis. Le poste doit exister au barème et
--    être prévu par les conditions générales du loueur (à vérifier par Teo pour chaque client).
-- Rien n'est effacé ; aucune contrainte retirée.

alter table public.loc_reglages add column if not exists nettete_min numeric(10,1) not null default 40;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'loc_reglages_nettete_min_check') then
    alter table public.loc_reglages add constraint loc_reglages_nettete_min_check check (nettete_min >= 0 and nettete_min <= 100000);
  end if;
end $$;
comment on column public.loc_reglages.nettete_min is 'b2_07 : netteté minimale d''une photo d''état des lieux (variance du laplacien, image réduite à 512 px)';

alter table public.loc_avis_contravention add column if not exists refacture_proposition_id uuid;
comment on column public.loc_avis_contravention.refacture_proposition_id is 'b2_07 : la proposition qui refacture les frais de dossier de l''avis au locataire';

-- La lecture d'un constat garde maintenant la netteté mesurée de chaque photo (b2_05 la retirait).
CREATE OR REPLACE FUNCTION private.loc_lire_constat(p_valeurs jsonb, OUT photos jsonb, OUT dommages jsonb)
 RETURNS record
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  x jsonb;
  p jsonb;
  v_preuves jsonb;
  v_n numeric;
begin
  photos := '[]'::jsonb;
  dommages := '[]'::jsonb;
  for x in select * from jsonb_array_elements(case when jsonb_typeof(p_valeurs -> 'photos') = 'array' then p_valeurs -> 'photos' else '[]'::jsonb end) loop
    if nullif(btrim(x ->> 'chemin'), '') is null then
      raise exception 'Une photo de l''état des lieux n''a pas de chemin.' using errcode = '22023';
    end if;
    v_n := case when jsonb_typeof(x -> 'nettete') = 'number' then least(greatest((x ->> 'nettete')::numeric, 0), 1000000) end;
    photos := photos || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('vue', left(x ->> 'vue', 40), 'chemin', left(x ->> 'chemin', 500),
                                                                                'prise_le', left(x ->> 'prise_le', 40), 'nettete', round(v_n, 1))));
  end loop;
  for x in select * from jsonb_array_elements(case when jsonb_typeof(p_valeurs -> 'dommages') = 'array' then p_valeurs -> 'dommages' else '[]'::jsonb end) loop
    if not (x ->> 'zone' = any (private.loc_zones_dommage())) then
      raise exception 'Zone de dommage inconnue : %.', coalesce(x ->> 'zone', 'vide') using errcode = '22023';
    end if;
    if nullif(btrim(x ->> 'description'), '') is null then
      raise exception 'Un dommage noté a une description.' using errcode = '22023';
    end if;
    v_preuves := '[]'::jsonb;
    for p in select * from jsonb_array_elements(case when jsonb_typeof(x -> 'preuves') = 'array' then x -> 'preuves' else '[]'::jsonb end) loop
      if nullif(btrim(p ->> 'chemin'), '') is not null then
        v_n := case when jsonb_typeof(p -> 'nettete') = 'number' then least(greatest((p ->> 'nettete')::numeric, 0), 1000000) end;
        v_preuves := v_preuves || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('chemin', left(p ->> 'chemin', 500), 'prise_le', left(p ->> 'prise_le', 40),
                                                                                         'nettete', round(v_n, 1))));
      end if;
    end loop;
    if jsonb_array_length(v_preuves) = 0 then
      raise exception 'Le dommage « % » n''a pas de photo : sans photo, il ne protège personne.', left(x ->> 'description', 60) using errcode = '22023';
    end if;
    dommages := dommages || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('zone', x ->> 'zone', 'code', nullif(upper(btrim(x ->> 'code')), ''),
                                                                                    'description', left(btrim(x ->> 'description'), 300), 'preuves', v_preuves)));
  end loop;
end $function$;

-- La garde de la signature : pas de « signé » avec une photo floue.
CREATE OR REPLACE FUNCTION private.loc_exiger_photos_nettes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_min numeric;
  v_floue text;
begin
  if new.statut = 'signe' and old.statut = 'brouillon' then
    select coalesce((select g.nettete_min from public.loc_reglages g where g.client_id = new.client_id), 40) into v_min;
    select string_agg(s.nom || ' (' || s.n || ')', ', ') into v_floue
    from (
      select coalesce(p ->> 'vue', 'photo') as nom, (p ->> 'nettete')::numeric as n
      from jsonb_array_elements(new.photos) p where jsonb_typeof(p -> 'nettete') = 'number'
      union all
      select 'dommage ' || coalesce(d ->> 'zone', '?'), (pr ->> 'nettete')::numeric
      from jsonb_array_elements(new.dommages) d, jsonb_array_elements(d -> 'preuves') pr where jsonb_typeof(pr -> 'nettete') = 'number'
    ) s
    where s.n < v_min;
    if v_floue is not null then
      raise exception 'Photo floue : % — sous la netteté minimale (%). Reprenez-la avant de faire signer.', v_floue, v_min using errcode = '22023';
    end if;
  end if;
  return new;
end $function$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'loc_edl_photos_nettes' and tgrelid = 'public.loc_etats_des_lieux'::regclass) then
    create trigger loc_edl_photos_nettes before update of statut on public.loc_etats_des_lieux for each row execute function private.loc_exiger_photos_nettes();
  end if;
end $$;

-- Les frais de dossier d'un avis désigné, refacturés au locataire par le chemin de toute facture.
CREATE OR REPLACE FUNCTION public.loc_refacturer_avis(p_avis uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  a public.loc_avis_contravention := private.loc_avis_de_l_agence(p_avis, array['gerant', 'admin', 'valideur', 'collaborateur'],
                                       'Votre rôle ne permet pas de refacturer un avis.');
  c public.loc_contrats;
  lb public.loc_bareme_lignes;
  v_fuseau text;
  v_bareme uuid;
  v_version integer;
  v_prop uuid;
  v_ht numeric;
begin
  perform 1 from public.loc_avis_contravention x where x.id = a.id for update;
  if a.statut <> 'designe' or a.contrat_id is null then
    raise exception 'Seul un avis désigné, rattaché à un contrat, se refacture.' using errcode = '23514';
  end if;
  if a.refacture_proposition_id is not null then
    raise exception 'Les frais de cet avis sont déjà refacturés.' using errcode = '23514';
  end if;
  select * into c from public.loc_contrats x where x.client_id = a.client_id and x.id = a.contrat_id;
  if exists (select 1 from public.loc_propositions p where p.client_id = c.client_id and p.contrat_id = c.id
             and p.statut in ('calculee', 'preuve_manquante', 'a_valider', 'validee')) then
    raise exception 'Le retour de ce contrat est en cours de facturation : refacturez l''avis une fois la facture émise.' using errcode = '55000';
  end if;
  if not exists (select 1 from public.loc_propositions p where p.client_id = c.client_id and p.contrat_id = c.id
                 and p.statut in ('facturee', 'rien_a_facturer', 'refusee')) then
    raise exception 'Le retour de ce contrat n''est pas encore chiffré : chiffrez-le d''abord, puis refacturez l''avis.' using errcode = '55000';
  end if;
  select e.fuseau into v_fuseau from public.entites e where e.client_id = c.client_id and e.id = c.entite_id;
  v_bareme := private.loc_bareme_en_vigueur(c.client_id, (now() at time zone coalesce(v_fuseau, 'Europe/Paris'))::date);
  select * into lb from public.loc_bareme_lignes l where l.client_id = c.client_id and l.bareme_id = v_bareme and l.code = 'FRAIS_AVIS'
  order by l.categorie_id nulls last limit 1;
  if lb.id is null or lb.prix_eur is null then
    raise exception 'Ajoutez au barème la ligne FRAIS_AVIS (frais de gestion d''un avis de contravention, au forfait, prévue par vos conditions générales).' using errcode = '23514';
  end if;

  select coalesce(max(p.version), 0) + 1 into v_version from public.loc_propositions p where p.client_id = c.client_id and p.contrat_id = c.id;
  insert into public.loc_propositions (client_id, entite_id, contrat_id, version, source, bareme_id, entrees, calculee_par)
  values (c.client_id, c.entite_id, c.id, v_version, 'saisie', v_bareme,
          jsonb_build_object('objet', 'frais_avis', 'avis', a.id, 'numero_avis', a.numero_avis, 'infraction_le', a.infraction_le),
          (select auth.uid()))
  returning id into v_prop;
  v_ht := round(lb.prix_eur, 2);
  perform private.loc_poser_ligne(c.client_id, v_prop, 1, 'frais', lb.famille, lb.code,
    lb.libelle || ' — avis n° ' || a.numero_avis || ' du ' || to_char(a.infraction_le at time zone coalesce(v_fuseau, 'Europe/Paris'), 'DD/MM/YYYY'),
    lb.id, lb.unite, 1, lb.prix_eur, v_ht, lb.regime_tva, private.loc_taux_tva(c.client_id, c.entite_id, lb.taux_tva), 'chiffree',
    jsonb_build_object('avis', a.id, 'designe_le', a.designe_le, 'mode', a.mode_designation),
    jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('note', format('Avis n° %s, conducteur désigné le %s (%s)', a.numero_avis,
                                                                          to_char(a.designe_le at time zone coalesce(v_fuseau, 'Europe/Paris'), 'DD/MM/YYYY'),
                                                                          case a.mode_designation when 'lrar' then 'lettre recommandée' else 'en ligne, ANTAI' end),
                                                       'piece', a.piece_id))),
    false);
  update public.loc_propositions p
     set statut = 'calculee',
         total_ht = (select coalesce(sum(l.montant_ht), 0) from public.loc_proposition_lignes l where l.proposition_id = v_prop),
         total_tva = (select coalesce(sum(l.montant_tva), 0) from public.loc_proposition_lignes l where l.proposition_id = v_prop),
         total_ttc = (select coalesce(sum(l.montant_ttc), 0) from public.loc_proposition_lignes l where l.proposition_id = v_prop),
         total_frais_ttc = (select coalesce(sum(l.montant_ttc), 0) from public.loc_proposition_lignes l where l.proposition_id = v_prop)
   where p.id = v_prop;
  update public.loc_avis_contravention set refacture_proposition_id = v_prop where id = a.id;
  perform private.deposer_travail(c.client_id, 'tavaro', 'tavaro.deposer_demande', jsonb_build_object('proposition', v_prop),
                                  'tavaro:deposer:' || v_prop::text, 0::smallint);
  perform private.journaliser_module(c.client_id, 'tavaro', 'tavaro.avis_refacture', 'loc_avis_contravention', a.id::text,
    jsonb_build_object('numero_avis', a.numero_avis, 'contrat', c.numero, 'proposition', v_prop, 'montant_ht', v_ht), c.entite_id);
  return jsonb_build_object('avis', a.id, 'proposition', v_prop, 'montant_ht', v_ht);
end $function$;

revoke all on function private.loc_exiger_photos_nettes() from public, anon, authenticated;
revoke all on function public.loc_refacturer_avis(uuid) from public, anon;
grant execute on function public.loc_refacturer_avis(uuid) to authenticated, service_role;
