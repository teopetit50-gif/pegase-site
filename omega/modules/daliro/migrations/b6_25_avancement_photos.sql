-- b6_25 — DALIRO : l'avancement lu dans les photos, proposé à la situation de fin de mois (session B6, 06/10/2026)
--
-- LA PROMESSE (/secteurs/btp) : « Les photos de la semaine servent de base à la situation de fin de mois. »
--
-- CE QUI EST POSÉ. Le lecteur d'A1 (lecteur.media, b6_24b) rend, pour chaque message du terrain, des « demandes » ;
-- la nature « avancement » ({ouvrage, lot_code?, pourcentage?, source: {media, extrait}}) est demandée à A1. Une photo
-- ne donne jamais un chiffre sûr : l'avancement n'est qu'une PROPOSITION, jamais appliquée seule.
--   · public.btp_avancement_photos(situation) : pour une situation en préparation (ou refusée), chaque ligne reçoit
--     l'avancement le plus récent lu dans les photos du chantier depuis la situation validée précédente et jusqu'au
--     lendemain de la fin de période : la ligne dont la désignation partage un mot (4 lettres ou plus) avec l'ouvrage
--     lu, sinon la seule ligne du lot. Seulement s'il fait avancer la ligne (un cumul ne recule pas) et ne dépasse pas
--     100 %. Avec la date, l'auteur, l'extrait et le chemin de la photo ; les lectures qui ne se rattachent à aucune
--     ligne sont rendues à part (« non_rattaches »).
--   · Reprendre une proposition passe par la porte existante btp_avancer_situation (b6_12), par une personne.
-- Droits : le bureau qui voit les prix (private.btp_exiger_bureau), comme les situations.
--
-- Règles de pose : create or replace ; rien n'est retiré ni effacé.

create or replace function private.btp_mots_ouvrage(p text)
 returns text[]
 language sql
 immutable
 set search_path to ''
as $function$
  select coalesce(array_agg(distinct w), '{}')
  from regexp_split_to_table(lower(translate(coalesce(p, ''), 'ÀÂÄÉÈÊËÎÏÔÖÙÛÜÇàâäéèêëîïôöùûüç', 'AAAEEEEIIOOUUUCaaaeeeeiioouuuc')), '[^a-z0-9]+') w
  where char_length(w) >= 4
$function$;

create or replace function public.btp_avancement_photos(p_situation uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  s public.btp_situations;
  v_depuis date;
  v_lectures jsonb;
  v_propositions jsonb := '[]'::jsonb;
  v_non_rattaches jsonb := '[]'::jsonb;
  a jsonb;
  v_lot uuid;
  v_ligne record;
  v_lignes uuid[];
  v_pris uuid[] := '{}';
begin
  select * into s from public.btp_situations where id = p_situation;
  if not found then
    raise exception 'Situation introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(s.client_id, s.entite_id);
  if s.statut not in ('brouillon', 'refusee') then
    return jsonb_build_object('propositions', '[]'::jsonb, 'non_rattaches', '[]'::jsonb, 'motif', 'situation déjà soumise ou validée');
  end if;
  select max(x.periode_fin) into v_depuis from public.btp_situations x
  where x.chantier_id = s.chantier_id and x.statut = 'validee' and x.numero < s.numero;

  -- Les lectures « avancement » du chantier sur la période, les plus récentes d'abord.
  select coalesce(jsonb_agg(jsonb_build_object(
           'message', m.id, 'le', m.recu_le, 'de_nom', m.de_nom,
           'ouvrage', d ->> 'ouvrage', 'lot_code', d ->> 'lot_code', 'pourcentage', (d ->> 'pourcentage')::numeric,
           'extrait', d -> 'source' ->> 'extrait',
           'photo', (select p ->> 'chemin' from jsonb_array_elements(m.pieces) with ordinality q(p, o)
                     where o = coalesce((d -> 'source' ->> 'media')::integer, 0) and coalesce(p ->> 'mime', '') like 'image/%'))
         order by m.recu_le desc), '[]'::jsonb)
    into v_lectures
  from public.btp_messages m
  cross join lateral jsonb_array_elements(coalesce(m.lecture -> 'demandes', '[]'::jsonb)) d
  where m.chantier_id = s.chantier_id and m.statut = 'range'
    and d ->> 'nature' = 'avancement' and (d ->> 'pourcentage') ~ '^[0-9]+(\.[0-9]+)?$'
    and (v_depuis is null or (m.recu_le at time zone 'Europe/Paris')::date > v_depuis)
    and (m.recu_le at time zone 'Europe/Paris')::date <= s.periode_fin + 1;

  for a in select x from jsonb_array_elements(v_lectures) x loop
    select l.id into v_lot from public.btp_lots l where l.chantier_id = s.chantier_id and l.code = a ->> 'lot_code';
    -- La ligne qui partage un mot avec l'ouvrage lu (dans le lot s'il est connu), sinon la seule ligne du lot.
    select array_agg(sl.id order by sl.ordre) into v_lignes
    from public.btp_situations_lignes sl
    where sl.situation_id = s.id and (v_lot is null or sl.lot_id = v_lot)
      and private.btp_mots_ouvrage(sl.designation) && private.btp_mots_ouvrage(a ->> 'ouvrage');
    if coalesce(cardinality(v_lignes), 0) <> 1 and v_lot is not null then
      select array_agg(sl.id) into v_lignes from public.btp_situations_lignes sl where sl.situation_id = s.id and sl.lot_id = v_lot;
      if cardinality(v_lignes) <> 1 then
        v_lignes := null;
      end if;
    elsif coalesce(cardinality(v_lignes), 0) <> 1 then
      v_lignes := null;
    end if;
    if v_lignes is null then
      v_non_rattaches := v_non_rattaches || a;
      continue;
    end if;
    continue when v_lignes[1] = any (v_pris);   -- la lecture la plus récente l'emporte
    select sl.id, sl.designation, sl.avancement, sl.lot_id into v_ligne from public.btp_situations_lignes sl where sl.id = v_lignes[1];
    v_pris := v_pris || v_ligne.id;
    continue when (a ->> 'pourcentage')::numeric <= v_ligne.avancement or (a ->> 'pourcentage')::numeric > 100;
    v_propositions := v_propositions || (a || jsonb_build_object('ligne', v_ligne.id, 'designation', v_ligne.designation,
                                                                 'actuel', v_ligne.avancement, 'propose', round((a ->> 'pourcentage')::numeric, 2)));
  end loop;
  return jsonb_build_object('propositions', v_propositions, 'non_rattaches', v_non_rattaches, 'depuis', v_depuis);
end $function$;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt)
revoke execute on function private.btp_mots_ouvrage(text) from public, anon, authenticated;
grant execute on function private.btp_mots_ouvrage(text) to service_role;
revoke execute on function public.btp_avancement_photos(uuid) from public, anon;
grant execute on function public.btp_avancement_photos(uuid) to authenticated, service_role;
