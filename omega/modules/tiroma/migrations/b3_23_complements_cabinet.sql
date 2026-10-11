-- b3_23 — Cinq compléments relevés par le chiffrage (omega/CHIFFRAGE/tiroma.md, « Pour tout amener en B »).
--
-- CE QUE ÇA CORRIGE (phrases de /secteurs/dentaire qui n'avaient pas, ou pas entièrement, leur code) :
--   1. « Tiroma montre quel fauteuil tourne à vide aujourd'hui et quels soins déplacer » : hors absence d'une assistante
--      (b3_18), rien ne proposait de regrouper les soins d'un fauteuil à moitié vide ;
--   2. « Tiroma repère […] la séance longue mal placée » : rien ne la repérait ;
--   3. « Les devis signés sans rendez-vous remontent chaque matin […] avec le créneau qui leur convient » : la carte
--      Plans ne proposait aucun créneau ;
--   4. « Quarante-six patients n'ont pas été revus depuis plus d'un an » : le contrôle dû n'existait qu'en candidat d'un
--      créneau libéré, sans liste complète ;
--   5. « vous pouvez tout exporter ou tout effacer à tout moment » : l'effacement existait (B3-10), pas l'export.
--
-- CE QUE ÇA POSE (lectures ; l'export écrit seulement au journal) :
--   1. public.tiroma_soins_a_deplacer(p_client, p_entite, p_jours = 2) — titulaire (la charge ne se lit que par lui) :
--      pour chaque demi-journée « vide » d'un fauteuil (sous le seuil du cabinet) qui porte encore des soins, les
--      fauteuils vers lesquels déplacer chacun : actifs, équipés pour ce soin, libres et ouverts sur ce créneau, avec
--      une assistante habituelle présente si le soin l'exige ; le plus chargé d'abord. « libere » dit si la
--      demi-journée entière peut être libérée.
--   2. public.tiroma_seances_mal_placees(p_client, p_entite, p_jours = 7) — titulaire, assistante : les séances d'au
--      moins 60 minutes (ou de chirurgie) à venir qui sortent des horaires du fauteuil (pause comprise), tombent sur
--      un fauteuil non équipé, sans assistante alors que le soin l'exige, ou quand le praticien est déjà pris ailleurs.
--   3. public.tiroma_creneaux_pour_plans(p_client, p_entite, p_jours = 14, p_max = 3) — titulaire, assistante,
--      collaborateur (ses patients) : pour chaque plan signé sans rendez-vous, les premiers créneaux libres qui
--      conviennent à la séance suivante : durée, fauteuil équipé et ouvert, praticien du plan libre (et à ses
--      horaires propres s'il en a, b3_19), à partir de demain.
--   4. public.tiroma_controles_dus(p_client, p_entite, p_limite = 200) — mêmes profils : les patients actifs dont le
--      dernier contrôle dépasse le seuil du cabinet et qui n'ont pas de rendez-vous à venir (même règle que le
--      candidat « contrôle dû » de b3_02, sans le quota), du plus en retard au moins ; ceux qui ne veulent pas être
--      contactés sont comptés à part, jamais listés.
--   5. public.tiroma_exporter_donnees(p_client, p_entite) — titulaire : toutes les données Tiroma du cabinet, table
--      par table (jsonb), pour qu'il les emporte ; journal « tiroma.donnees_exportees ».
-- Idempotent (create or replace, grant). Aucune table créée ni modifiée.

-- Une assistante habituelle du fauteuil est-elle présente sur [debut, fin) ? (b3_18 : absences notées)
create or replace function private.tiroma_assistante_presente(p_client uuid, p_entite uuid, p_fauteuil uuid,
                                                              p_debut timestamp with time zone, p_fin timestamp with time zone)
 returns text
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select m.prenom from public.tiroma_membres m
  where m.client_id = p_client and m.entite_id = p_entite and m.fauteuil_habituel_id = p_fauteuil and m.actif
    and not exists (select 1 from public.tiroma_absences_membres a
                    where a.client_id = p_client and a.membre_id = m.id and a.close_le is null and a.debut < p_fin and a.fin > p_debut)
  order by m.prenom limit 1
$function$;

-- ─────────────── 1. Les soins à déplacer d'un fauteuil à moitié vide ───────────────

create or replace function private.tiroma_soins_a_deplacer_lire(p_client uuid, p_entite uuid, p_jours integer default 2)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_fuseau text;
  v_jour date;
  d date;
  ch jsonb;
  fa jsonb;
  m text;
  v_plage tstzrange;
  v_soins jsonb;
  v_res jsonb := '[]'::jsonb;
begin
  perform private.tiroma_exiger_regard(p_client, p_entite, array['titulaire']);
  if p_jours is null or p_jours not between 1 and 7 then
    raise exception 'De 1 à 7 jours.' using errcode = '22023';
  end if;
  select coalesce(e.fuseau, 'Europe/Paris') into v_fuseau from public.entites e where e.client_id = p_client and e.id = p_entite;
  v_jour := (now() at time zone coalesce(v_fuseau, 'Europe/Paris'))::date;

  for d in select g::date from generate_series(v_jour, v_jour + p_jours - 1, interval '1 day') g loop
    ch := private.tiroma_charge_fauteuils_pour(p_client, p_entite, d);
    for fa in select x from jsonb_array_elements(ch -> 'fauteuils') x loop
      foreach m in array array['matin', 'apres_midi'] loop
        continue when not coalesce((fa #>> array[m, 'vide'])::boolean, false);
        v_plage := case when m = 'matin' then tstzrange(d::timestamp at time zone v_fuseau, (d + time '13:00') at time zone v_fuseau)
                        else tstzrange((d + time '13:00') at time zone v_fuseau, (d + 1)::timestamp at time zone v_fuseau) end;
        select coalesce(jsonb_agg(jsonb_build_object(
                 'rendez_vous_id', s.id, 'debut', s.debut, 'fin', s.fin,
                 'patient_nom', private.tiroma_nom_patient(true, s.nom, s.prenom), 'soin', s.libelle,
                 'vers', coalesce((
                   select jsonb_agg(jsonb_build_object('fauteuil_id', v.id, 'fauteuil', v.nom, 'taux', v.taux, 'assistante', v.assistante)
                                    order by v.taux desc nulls last, v.nom)
                   from (
                     select f2.id, f2.nom,
                            (select (x #>> array[m, 'taux'])::numeric from jsonb_array_elements(ch -> 'fauteuils') x where (x ->> 'fauteuil_id')::uuid = f2.id) as taux,
                            private.tiroma_assistante_presente(p_client, p_entite, f2.id, s.debut, s.fin) as assistante
                     from public.tiroma_fauteuils f2
                     where f2.client_id = p_client and f2.entite_id = p_entite and f2.actif and f2.id <> (fa ->> 'fauteuil_id')::uuid
                       and (s.capacite is null or s.capacite = any (f2.capacites))
                       and coalesce(private.tiroma_ouvert(p_client, p_entite, f2.id, d), '{}'::tstzmultirange) @> tstzrange(s.debut, s.fin)
                       and not exists (select 1 from public.tiroma_rendez_vous r2
                                       where r2.client_id = p_client and r2.entite_id = p_entite and r2.fauteuil_id = f2.id
                                         and r2.statut = 'prevu' and r2.disparu_le is null and tstzrange(r2.debut, r2.fin) && tstzrange(s.debut, s.fin))
                   ) v
                   where not s.exige or v.assistante is not null), '[]'::jsonb))
               order by s.debut), '[]'::jsonb)
          into v_soins
        from (
          select r.id, r.debut, r.fin, pa.nom, pa.prenom, t.libelle_source as libelle,
                 coalesce(t.capacite_requise, case when t.famille is not null then private.tiroma_capacite_famille(t.famille) end) as capacite,
                 coalesce(t.exige_assistante, true) as exige
          from public.tiroma_rendez_vous r
          left join public.tiroma_types_rdv t on t.id = r.type_rdv_id
          left join public.tiroma_patients pa on pa.id = r.patient_id
          where r.client_id = p_client and r.entite_id = p_entite and r.fauteuil_id = (fa ->> 'fauteuil_id')::uuid
            and r.statut = 'prevu' and r.disparu_le is null and r.debut >= now() and tstzrange(r.debut, r.fin) && v_plage
            and coalesce(t.famille, '') <> 'personnel'
        ) s;
        continue when jsonb_array_length(v_soins) = 0;
        v_res := v_res || jsonb_build_object(
          'jour', d, 'moment', m, 'fauteuil_id', fa ->> 'fauteuil_id', 'fauteuil', fa ->> 'nom',
          'taux', (fa #>> array[m, 'taux'])::numeric, 'soins', v_soins,
          'libere', not exists (select 1 from jsonb_array_elements(v_soins) x where jsonb_array_length(x -> 'vers') = 0));
      end loop;
    end loop;
  end loop;
  return jsonb_build_object('seuil', (select g.seuil_demi_journee_vide from public.tiroma_regles g where g.client_id = p_client and g.entite_id = p_entite),
                            'demi_journees', v_res);
end $function$;

create or replace function public.tiroma_soins_a_deplacer(p_client uuid, p_entite uuid, p_jours integer default 2)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select private.tiroma_soins_a_deplacer_lire(p_client, p_entite, p_jours)
$function$;

-- ─────────────── 2. Les séances longues mal placées ───────────────

create or replace function private.tiroma_seances_mal_placees_lire(p_client uuid, p_entite uuid, p_jours integer default 7)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  rg record;
  v_fuseau text;
  v_res jsonb;
begin
  rg := private.tiroma_exiger_regard(p_client, p_entite, array['titulaire', 'assistante']);
  if p_jours is null or p_jours not between 1 and 28 then
    raise exception 'De 1 à 28 jours.' using errcode = '22023';
  end if;
  select coalesce(e.fuseau, 'Europe/Paris') into v_fuseau from public.entites e where e.client_id = p_client and e.id = p_entite;

  with longues as (
    select r.id, r.debut, r.fin, r.fauteuil_id, r.praticien_id, f.nom as fauteuil, f.capacites, pa.nom, pa.prenom,
           t.libelle_source as soin, coalesce(t.exige_assistante, true) as exige,
           coalesce(t.capacite_requise, case when t.famille is not null then private.tiroma_capacite_famille(t.famille) end) as capacite,
           round(extract(epoch from r.fin - r.debut) / 60)::integer as minutes,
           (r.debut at time zone v_fuseau)::date as jour
    from public.tiroma_rendez_vous r
    join public.tiroma_fauteuils f on f.id = r.fauteuil_id
    left join public.tiroma_types_rdv t on t.id = r.type_rdv_id
    left join public.tiroma_patients pa on pa.id = r.patient_id
    where r.client_id = p_client and r.entite_id = p_entite and r.statut = 'prevu' and r.disparu_le is null
      and r.debut > now() and r.debut < now() + make_interval(days => p_jours)
      and (r.fin - r.debut >= interval '60 minutes' or coalesce(t.chirurgie, false))
      and coalesce(t.famille, '') <> 'personnel'
  ),
  raisons as (
    select l.*,
           array_remove(array[
             case when not coalesce(private.tiroma_ouvert(p_client, p_entite, l.fauteuil_id, l.jour), '{}'::tstzmultirange) @> tstzrange(l.debut, l.fin)
                  then 'sort des horaires du fauteuil (pause ou fermeture comprise)' end,
             case when l.capacite is not null and not (l.capacite = any (l.capacites))
                  then format('le %s n''est pas équipé pour ce soin (%s)', l.fauteuil, l.capacite) end,
             case when l.exige and private.tiroma_assistante_presente(p_client, p_entite, l.fauteuil_id, l.debut, l.fin) is null
                  then 'aucune assistante présente alors que le soin en exige une' end,
             case when l.praticien_id is not null and exists (
                    select 1 from public.tiroma_rendez_vous o
                    where o.client_id = p_client and o.entite_id = p_entite and o.praticien_id = l.praticien_id and o.id <> l.id
                      and o.statut = 'prevu' and o.disparu_le is null and tstzrange(o.debut, o.fin) && tstzrange(l.debut, l.fin))
                  then 'le praticien a un autre rendez-vous en même temps' end], null) as raisons
    from longues l
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'rendez_vous_id', x.id, 'debut', x.debut, 'fin', x.fin, 'minutes', x.minutes, 'fauteuil', x.fauteuil,
           'praticien', (select p.nom_affiche from public.tiroma_praticiens p where p.id = x.praticien_id),
           'patient_nom', private.tiroma_nom_patient(true, x.nom, x.prenom), 'soin', x.soin, 'raisons', to_jsonb(x.raisons))
         order by x.debut), '[]'::jsonb)
    into v_res
  from raisons x
  where cardinality(x.raisons) > 0;
  return v_res;
end $function$;

create or replace function public.tiroma_seances_mal_placees(p_client uuid, p_entite uuid, p_jours integer default 7)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select private.tiroma_seances_mal_placees_lire(p_client, p_entite, p_jours)
$function$;

-- ─────────────── 3. Un créneau pour chaque plan signé ───────────────

create or replace function private.tiroma_creneaux_pour_plans_lire(p_client uuid, p_entite uuid, p_jours integer default 14, p_max integer default 3)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  rg record;
  v_fuseau text;
  v_jour date;
  v_plans jsonb;
  v_res jsonb;
begin
  rg := private.tiroma_exiger_regard(p_client, p_entite, array['titulaire', 'assistante', 'collaborateur']);
  if p_jours is null or p_jours not between 1 and 60 or p_max is null or p_max not between 1 and 10 then
    raise exception 'De 1 à 60 jours, de 1 à 10 créneaux par plan.' using errcode = '22023';
  end if;
  select coalesce(e.fuseau, 'Europe/Paris') into v_fuseau from public.entites e where e.client_id = p_client and e.id = p_entite;
  v_jour := (now() at time zone coalesce(v_fuseau, 'Europe/Paris'))::date;
  v_plans := private.tiroma_plans_sans_rendez_vous_pour(p_client, p_entite, rg.voit_tous, rg.praticien_id);

  with jours as (select g::date as d from generate_series(v_jour + 1, v_jour + p_jours, interval '1 day') g),
  libres as materialized (
    select f.id as fauteuil_id, f.nom as fauteuil, f.capacites, j.d,
           coalesce(private.tiroma_ouvert(p_client, p_entite, f.id, j.d), '{}'::tstzmultirange)
             - private.tiroma_reserve(p_client, p_entite, f.id, j.d, 'prevue') as libre
    from public.tiroma_fauteuils f cross join jours j
    where f.client_id = p_client and f.entite_id = p_entite and f.actif
  ),
  occupe as materialized (
    select r.praticien_id, coalesce(range_agg(tstzrange(r.debut, r.fin)), '{}'::tstzmultirange) as pris
    from public.tiroma_rendez_vous r
    where r.client_id = p_client and r.entite_id = p_entite and r.statut = 'prevu' and r.disparu_le is null and r.praticien_id is not null
      and r.debut >= (v_jour + 1)::timestamp at time zone v_fuseau and r.debut < (v_jour + p_jours + 1)::timestamp at time zone v_fuseau
    group by r.praticien_id
  ),
  plans as (
    select x as plan, (x ->> 'plan_id')::uuid as plan_id,
           coalesce((x #>> '{prochaine,duree_min}')::integer, 30) as duree,
           case when x #>> '{prochaine,famille}' is not null then private.tiroma_capacite_famille(x #>> '{prochaine,famille}') end as capacite,
           coalesce((x ->> 'praticien_id')::uuid, (select pa.praticien_habituel_id from public.tiroma_patients pa where pa.id = (x ->> 'patient_id')::uuid)) as praticien_id
    from jsonb_array_elements(v_plans) x
    where not coalesce((x ->> 'ne_pas_contacter')::boolean, false)
  ),
  propositions as (
    select p.plan_id, l.fauteuil_id, l.fauteuil, lower(z.r) as debut, lower(z.r) + make_interval(mins => p.duree) as fin,
           row_number() over (partition by p.plan_id order by lower(z.r), l.fauteuil) as rang
    from plans p
    join libres l on (p.capacite is null or p.capacite = any (l.capacites))
    cross join lateral unnest(
      l.libre - coalesce((select o.pris from occupe o where o.praticien_id = p.praticien_id), '{}'::tstzmultirange)
    ) as z(r)
    where upper(z.r) - lower(z.r) >= make_interval(mins => p.duree)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'plan_id', p.plan_id, 'patient_nom', p.plan ->> 'patient_nom', 'devis_numero', p.plan ->> 'devis_numero',
           'seance', p.plan #> '{prochaine}', 'duree_min', p.duree,
           'praticien', (select pr.nom_affiche from public.tiroma_praticiens pr where pr.id = p.praticien_id),
           'creneaux', coalesce((select jsonb_agg(jsonb_build_object('debut', q.debut, 'fin', q.fin, 'fauteuil_id', q.fauteuil_id, 'fauteuil', q.fauteuil) order by q.rang)
                                 from propositions q where q.plan_id = p.plan_id and q.rang <= p_max), '[]'::jsonb))
         order by (p.plan ->> 'depuis')::date, p.plan_id), '[]'::jsonb)
    into v_res
  from plans p;
  return v_res;
end $function$;

create or replace function public.tiroma_creneaux_pour_plans(p_client uuid, p_entite uuid, p_jours integer default 14, p_max integer default 3)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select private.tiroma_creneaux_pour_plans_lire(p_client, p_entite, p_jours, p_max)
$function$;

-- ─────────────── 4. La liste des contrôles dus ───────────────

create or replace function private.tiroma_controles_dus_lire(p_client uuid, p_entite uuid, p_limite integer default 200)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  rg record;
  g public.tiroma_regles;
  v_fuseau text;
  v_jour date;
  v_res jsonb;
begin
  rg := private.tiroma_exiger_regard(p_client, p_entite, array['titulaire', 'assistante', 'collaborateur']);
  if p_limite is null or p_limite not between 1 and 1000 then
    raise exception 'De 1 à 1000 patients.' using errcode = '22023';
  end if;
  select * into g from public.tiroma_regles where client_id = p_client and entite_id = p_entite;
  select coalesce(e.fuseau, 'Europe/Paris') into v_fuseau from public.entites e where e.client_id = p_client and e.id = p_entite;
  v_jour := (now() at time zone coalesce(v_fuseau, 'Europe/Paris'))::date;

  with dus as (
    select pa.id, pa.nom, pa.prenom, pa.ne_pas_contacter, pa.dernier_controle_le, pa.praticien_habituel_id,
           greatest(pa.dernier_rdv_le, pa.dernier_acte_le) as derniere_venue
    from public.tiroma_patients pa
    where pa.client_id = p_client and pa.entite_id = p_entite and pa.actif and pa.fusionne_dans_id is null and pa.disparu_le is null
      and (pa.prochain_rdv_le is null or pa.prochain_rdv_le < now())
      and coalesce(pa.dernier_controle_le, date '1900-01-01') < v_jour - make_interval(months => coalesce(g.seuil_controle_mois, 12))
      and coalesce(greatest(pa.dernier_rdv_le, pa.dernier_acte_le), (pa.vu_premier_le at time zone v_fuseau)::date)
          >= v_jour - make_interval(months => coalesce(g.patient_actif_mois, 36))
      and (rg.voit_tous or (rg.praticien_id is not null and pa.praticien_habituel_id = rg.praticien_id))
  )
  select jsonb_build_object(
    'seuil_mois', coalesce(g.seuil_controle_mois, 12),
    'total', (select count(*) from dus where not ne_pas_contacter),
    'ne_pas_contacter', (select count(*) from dus where ne_pas_contacter),
    'patients', coalesce((select jsonb_agg(jsonb_build_object(
        'patient_id', x.id, 'patient_nom', private.tiroma_nom_patient(true, x.nom, x.prenom),
        'dernier_controle_le', x.dernier_controle_le, 'derniere_venue', x.derniere_venue,
        'mois_depuis', case when x.dernier_controle_le is null then null
                            else (extract(year from age(v_jour, x.dernier_controle_le)) * 12 + extract(month from age(v_jour, x.dernier_controle_le)))::integer end,
        'praticien', (select p.nom_affiche from public.tiroma_praticiens p where p.id = x.praticien_habituel_id))
        order by x.dernier_controle_le nulls first, x.nom)
      from (select * from dus where not ne_pas_contacter order by dernier_controle_le nulls first, nom limit p_limite) x), '[]'::jsonb))
    into v_res;
  return v_res;
end $function$;

create or replace function public.tiroma_controles_dus(p_client uuid, p_entite uuid, p_limite integer default 200)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select private.tiroma_controles_dus_lire(p_client, p_entite, p_limite)
$function$;

-- ─────────────── 5. Tout exporter ───────────────

create or replace function private.tiroma_exporter_donnees(p_client uuid, p_entite uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  t text;
  v jsonb;
  v_res jsonb := '{}'::jsonb;
  v_comptes jsonb := '{}'::jsonb;
begin
  perform private.tiroma_exiger_regard(p_client, p_entite, array['titulaire']);
  -- Chaque table Tiroma qui porte client_id et entite_id, telle qu'elle est (une table absente est passée).
  for t in
    select c.table_name from information_schema.columns c
    where c.table_schema = 'public' and c.table_name like 'tiroma\_%' and c.column_name = 'entite_id'
      and exists (select 1 from information_schema.columns c2 where c2.table_schema = 'public' and c2.table_name = c.table_name and c2.column_name = 'client_id')
      and exists (select 1 from information_schema.tables tt where tt.table_schema = 'public' and tt.table_name = c.table_name and tt.table_type = 'BASE TABLE')
    order by c.table_name
  loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x where x.client_id = $1 and x.entite_id = $2', t)
      into v using p_client, p_entite;
    v_res := v_res || jsonb_build_object(substr(t, 8), v);
    v_comptes := v_comptes || jsonb_build_object(substr(t, 8), jsonb_array_length(v));
  end loop;
  -- Les actes des plans n'ont pas d'entite_id : ils suivent leurs plans.
  if to_regclass('public.tiroma_plan_actes') is not null and not (v_res ? 'plan_actes') then
    execute 'select coalesce(jsonb_agg(to_jsonb(a)), ''[]''::jsonb) from public.tiroma_plan_actes a
             join public.tiroma_plans p on p.id = a.plan_id where p.client_id = $1 and p.entite_id = $2'
      into v using p_client, p_entite;
    v_res := v_res || jsonb_build_object('plan_actes', v);
    v_comptes := v_comptes || jsonb_build_object('plan_actes', jsonb_array_length(v));
  end if;
  perform private.journaliser_module(p_client, 'tiroma', 'tiroma.donnees_exportees', 'entites', p_entite::text,
    jsonb_build_object('tables', v_comptes), p_entite);
  return jsonb_build_object('exporte_le', now(), 'entite_id', p_entite, 'comptes', v_comptes, 'tables', v_res);
end $function$;

create or replace function public.tiroma_exporter_donnees(p_client uuid, p_entite uuid)
 returns jsonb
 language sql
 set search_path to ''
as $function$
  select private.tiroma_exporter_donnees(p_client, p_entite)
$function$;

-- ─────────────── Droits ───────────────
revoke all on function public.tiroma_soins_a_deplacer(uuid, uuid, integer) from public, anon;
grant execute on function public.tiroma_soins_a_deplacer(uuid, uuid, integer) to authenticated, service_role;
revoke all on function public.tiroma_seances_mal_placees(uuid, uuid, integer) from public, anon;
grant execute on function public.tiroma_seances_mal_placees(uuid, uuid, integer) to authenticated, service_role;
revoke all on function public.tiroma_creneaux_pour_plans(uuid, uuid, integer, integer) from public, anon;
grant execute on function public.tiroma_creneaux_pour_plans(uuid, uuid, integer, integer) to authenticated, service_role;
revoke all on function public.tiroma_controles_dus(uuid, uuid, integer) from public, anon;
grant execute on function public.tiroma_controles_dus(uuid, uuid, integer) to authenticated, service_role;
revoke all on function public.tiroma_exporter_donnees(uuid, uuid) from public, anon;
grant execute on function public.tiroma_exporter_donnees(uuid, uuid) to authenticated, service_role;

revoke all on function private.tiroma_soins_a_deplacer_lire(uuid, uuid, integer) from public, anon;
grant execute on function private.tiroma_soins_a_deplacer_lire(uuid, uuid, integer) to authenticated, service_role;
revoke all on function private.tiroma_seances_mal_placees_lire(uuid, uuid, integer) from public, anon;
grant execute on function private.tiroma_seances_mal_placees_lire(uuid, uuid, integer) to authenticated, service_role;
revoke all on function private.tiroma_creneaux_pour_plans_lire(uuid, uuid, integer, integer) from public, anon;
grant execute on function private.tiroma_creneaux_pour_plans_lire(uuid, uuid, integer, integer) to authenticated, service_role;
revoke all on function private.tiroma_controles_dus_lire(uuid, uuid, integer) from public, anon;
grant execute on function private.tiroma_controles_dus_lire(uuid, uuid, integer) to authenticated, service_role;
revoke all on function private.tiroma_exporter_donnees(uuid, uuid) from public, anon;
grant execute on function private.tiroma_exporter_donnees(uuid, uuid) to authenticated, service_role;
revoke all on function private.tiroma_assistante_presente(uuid, uuid, uuid, timestamp with time zone, timestamp with time zone) from public, anon, authenticated;
grant execute on function private.tiroma_assistante_presente(uuid, uuid, uuid, timestamp with time zone, timestamp with time zone) to service_role;

select 'b3_23 compléments du cabinet posés' as resultat;
