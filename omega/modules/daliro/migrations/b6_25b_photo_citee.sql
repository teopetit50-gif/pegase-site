-- b6_25b — DALIRO : la photo citée par une lecture « avancement » (session B6, 06/10/2026), après b6_25
--
-- CE QUI CHANGE. Le lecteur d'A1 numérote les médias qu'il a reçus (images et sons seulement, au plus six) : un PDF
-- joint n'a pas de numéro. b6_25 cherchait la photo dans TOUTES les pièces du message, au même rang : avec un PDF
-- devant, le rang tombait à côté. La photo se lit désormais dans lecture.medias (n, chemin, nature « photo »), comme
-- le rend le lecteur (CONTRAT-MEDIA.md, nature « avancement » livrée par A1 en e0932e3) ; sans « medias », le rang
-- dans les pièces reste la règle. Le reste de public.btp_avancement_photos est inchangé ; les droits aussi.
--
-- Règles de pose : create or replace ; rien n'est retiré ni effacé.

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
           'photo', coalesce(
                      (select y ->> 'chemin' from jsonb_array_elements(coalesce(m.lecture -> 'medias', '[]'::jsonb)) y
                       where y ->> 'n' = d -> 'source' ->> 'media' and y ->> 'nature' = 'photo' limit 1),
                      (select p ->> 'chemin' from jsonb_array_elements(m.pieces) with ordinality q(p, o)
                       where not (m.lecture ? 'medias') and o = coalesce((d -> 'source' ->> 'media')::integer, 0)
                         and coalesce(p ->> 'mime', '') like 'image/%')))
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
