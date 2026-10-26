-- 20261015122308 b3t_05_couts_plan_de_flotte_rattrape
-- Source : dépôt, lot posé sur la recette sans ligne schema_migrations (rattrapé le 25/10) : eb5b4cd267 omega/modules/tavaro/migrations/b3t_05_couts_plan_de_flotte.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : rattrapé : b3t_05_couts_plan_de_flotte.sql @ eb5b4cd267 (posé sur la recette sans ligne schema_migrations).
-- ═══ omega/modules/tavaro/migrations/b3t_05_couts_plan_de_flotte.sql @ eb5b4cd267
-- b3t_05 — Le coût et la valeur de revente dans le plan de flotte (renfort B3 sur Tavaro, 15/10/2026).
--
-- CE QUE ÇA CORRIGE : le plan de flotte (b3t_03) dit combien acheter, vendre, déplacer ou renouveler, mais sans
-- argent : ni ce que chaque véhicule a coûté en entretien, ni ce qu'il vaut à la revente. Le chiffrage le classait
-- en « B » pour cette raison.
--
-- CE QUE ÇA POSE :
--   · table public.loc_cotes_revente : la dernière cote connue de chaque véhicule (une par véhicule, la nouvelle
--     remplace l'ancienne) : valeur en euros, source (« saisie », « argus », « reprise_concession », « autre »),
--     date de la cote, qui l'a notée. Aucune cote n'est inventée : sans abonnement à une base de cotes, c'est le
--     gérant qui la note (devis de reprise, Argus consulté à la main). La cote suit son véhicule (on delete cascade).
--     Lecture par qui voit l'agence du véhicule ; écriture par la porte ;
--   · public.loc_noter_cote_revente(p_vehicule, p_valeur, p_source = 'saisie', p_cote_le = aujourd'hui) → uuid :
--     gérant et admin ; journal « tavaro.cote_revente_notee » ;
--   · private.loc_b3t_couts(p_client, p_du, p_au) → jsonb : par véhicule, sur la période, le coût des
--     immobilisations (public.loc_immobilisations de B2, b2_10, lue par to_regclass : coût noté, jours hors
--     service) et les jours loués (private.loc_b3t_jours_loues, contrats non annulés) ;
--   · public.loc_plan_de_flotte(p_client, p_mois, p_cible) : même porte, même calcul ; chaque catégorie de chaque
--     agence reçoit en plus « vehicules » : les véhicules à vendre et à renouveler, chacun avec son âge, ses
--     kilomètres, son entretien sur la période, ses jours hors service, ses jours loués, son entretien par jour loué,
--     sa cote et la date de la cote (« ancienne » au-delà de 90 jours) ; et « totaux » reçoit la valeur de revente
--     des véhicules à vendre, le nombre de cotes manquantes et l'entretien de toute la flotte sur la période.
-- Lecture seule pour le plan ; idempotent (if not exists, create or replace, politique s'il manque, grant).

create table if not exists public.loc_cotes_revente (
  id uuid not null default gen_random_uuid() primary key,
  client_id uuid not null,
  entite_id uuid,
  vehicule_id uuid not null,
  valeur_eur numeric(10,2) not null check (valeur_eur > 0 and valeur_eur < 10000000),
  source text not null default 'saisie' check (source in ('saisie', 'argus', 'reprise_concession', 'autre')),
  cote_le date not null default current_date,
  note_par uuid,
  note_le timestamp with time zone not null default clock_timestamp(),
  constraint loc_cotes_revente_une_par_vehicule unique (client_id, vehicule_id),
  constraint loc_cotes_revente_vehicule_fkey foreign key (client_id, vehicule_id)
    references public.loc_vehicules (client_id, id) on delete cascade
);
alter table public.loc_cotes_revente enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_cotes_revente'
                 and policyname = 'on voit les cotes de son agence') then
    create policy "on voit les cotes de son agence" on public.loc_cotes_revente for select to authenticated
      using (client_id in (select private.mes_clients()) and (entite_id is null or private.voit_entite(client_id, entite_id)));
  end if;
end $$;
revoke all on table public.loc_cotes_revente from public, anon, authenticated;
grant select on table public.loc_cotes_revente to authenticated;
grant all on table public.loc_cotes_revente to service_role;

create or replace function public.loc_noter_cote_revente(p_vehicule uuid, p_valeur numeric, p_source text default 'saisie', p_cote_le date default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v public.loc_vehicules;
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Ce geste se fait par une personne connectée.' using errcode = '42501';
  end if;
  select * into v from public.loc_vehicules where id = p_vehicule;
  if not found or not exists (select 1 from public.comptes k where k.user_id = (select auth.uid()) and k.client_id = v.client_id) then
    raise exception 'Véhicule introuvable.' using errcode = 'P0002';
  end if;
  if not private.a_un_role(v.client_id, array['gerant', 'admin']) then
    raise exception 'La cote de revente se note par le gérant.' using errcode = '42501';
  end if;
  if p_valeur is null or p_valeur <= 0 or p_valeur >= 10000000 then
    raise exception 'La cote est un montant positif en euros.' using errcode = '22023';
  end if;
  if p_source is null or p_source not in ('saisie', 'argus', 'reprise_concession', 'autre') then
    raise exception 'La source est « saisie », « argus », « reprise_concession » ou « autre ».' using errcode = '22023';
  end if;
  if p_cote_le is not null and p_cote_le > current_date then
    raise exception 'Une cote ne se date pas dans l''avenir.' using errcode = '22023';
  end if;
  insert into public.loc_cotes_revente (client_id, entite_id, vehicule_id, valeur_eur, source, cote_le, note_par, note_le)
  values (v.client_id, v.entite_id, v.id, round(p_valeur, 2), p_source, coalesce(p_cote_le, current_date), (select auth.uid()), clock_timestamp())
  on conflict (client_id, vehicule_id) do update
    set entite_id = excluded.entite_id, valeur_eur = excluded.valeur_eur, source = excluded.source, cote_le = excluded.cote_le,
        note_par = excluded.note_par, note_le = excluded.note_le
  returning id into v_id;
  perform private.journaliser_module(v.client_id, 'tavaro', 'tavaro.cote_revente_notee', 'loc_vehicules', v.id::text,
    jsonb_build_object('valeur_eur', round(p_valeur, 2), 'source', p_source, 'cote_le', coalesce(p_cote_le, current_date)), v.entite_id);
  return v_id;
end $function$;

-- Par véhicule, sur [p_du, p_au] : les jours loués (contrats non annulés, bornés à la période).
create or replace function private.loc_b3t_jours_loues(p_client uuid, p_du date, p_au date)
 returns table (vehicule_id uuid, jours_loues integer)
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  return query
  with loues as (
    select c.vehicule_id as vid,
           sum(greatest(least(coalesce(c.retour_reel_le, greatest(c.retour_prevu_le, now()))::date, p_au) - greatest(c.depart_le::date, p_du), 0) + 1)::integer as jours
    from public.loc_contrats c
    where c.client_id = p_client and c.disparu_le is null and c.statut <> 'annule' and c.vehicule_id is not null
      and c.depart_le::date <= p_au and coalesce(c.retour_reel_le, greatest(c.retour_prevu_le, now()))::date >= p_du
    group by 1
  )
  select v.id, coalesce(l.jours, 0)
  from public.loc_vehicules v left join loues l on l.vid = v.id
  where v.client_id = p_client and v.disparu_le is null;
end $function$;

-- Par véhicule : l'entretien noté, les interventions et les jours hors service (public.loc_immobilisations de B2,
-- lue en dynamique : b3t_05 se pose avant ou après b2_10), et les jours loués.
create or replace function private.loc_b3t_couts(p_client uuid, p_du date, p_au date)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_immo jsonb := '{}'::jsonb;
  v_res jsonb;
begin
  if to_regclass('public.loc_immobilisations') is not null then
    execute 'select coalesce(jsonb_object_agg(x.vehicule_id, jsonb_build_object(''eur'', x.eur, ''n'', x.n, ''jours'', x.jours)), ''{}''::jsonb)
             from (select i.vehicule_id, coalesce(sum(i.cout_eur), 0) as eur, count(*)::integer as n,
                          sum(greatest(least(coalesce(i.fin_le, now())::date, $3) - greatest(i.debut_le::date, $2), 0) + 1)::integer as jours
                   from public.loc_immobilisations i
                   where i.client_id = $1 and i.debut_le::date <= $3 and coalesce(i.fin_le, now())::date >= $2
                   group by 1) x'
      into v_immo using p_client, p_du, p_au;
  end if;
  select coalesce(jsonb_object_agg(c.vehicule_id, jsonb_build_object(
           'entretien_eur', coalesce((v_immo #>> array[c.vehicule_id::text, 'eur'])::numeric, 0),
           'interventions', coalesce((v_immo #>> array[c.vehicule_id::text, 'n'])::integer, 0),
           'jours_hors_service', coalesce((v_immo #>> array[c.vehicule_id::text, 'jours'])::integer, 0),
           'jours_loues', c.jours_loues)), '{}'::jsonb)
    into v_res
  from private.loc_b3t_jours_loues(p_client, p_du, p_au) c;
  return v_res;
end $function$;

-- Le plan de b3t_03, avec l'argent : les véhicules à vendre et à renouveler, un par un.
create or replace function private.loc_b3t_plan_couts(p_client uuid, p_plan jsonb, p_maintenant timestamp with time zone default now())
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_du date := (p_plan #>> '{periode,du}')::date;
  v_au date := (p_plan #>> '{periode,au}')::date;
  v_annee integer := (p_plan ->> 'annee')::integer;
  v_couts jsonb := private.loc_b3t_couts(p_client, v_du, v_au);
  v_agences jsonb := '[]'::jsonb;
  a jsonb;
  k jsonb;
  v_cats jsonb;
  v_vehs jsonb;
begin
  for a in select x from jsonb_array_elements(p_plan -> 'agences') x loop
    v_cats := '[]'::jsonb;
    for k in select y from jsonb_array_elements(a -> 'categories') y loop
      select coalesce(jsonb_agg(jsonb_build_object(
               'vehicule_id', z.id, 'immatriculation', z.immatriculation,
               'decision', case when z.vendre then 'vendre' else 'renouveler' end,
               'mise_en_circulation', z.mise_en_circulation,
               'age_ans', case when z.mise_en_circulation is not null then round(((p_maintenant::date - z.mise_en_circulation) / 365.25)::numeric, 1) end,
               'km', z.km_dernier,
               'entretien_eur', z.entretien, 'interventions', z.interventions, 'jours_hors_service', z.hors_service, 'jours_loues', z.loues,
               'entretien_par_jour_loue', case when z.loues > 0 then round(z.entretien / z.loues, 2) end,
               'cote_eur', z.cote, 'cote_source', z.cote_source, 'cote_le', z.cote_le,
               'cote_ancienne', z.cote_le is not null and z.cote_le < p_maintenant::date - 90,
               'raison', concat_ws(' ; ',
                 case when z.vendre then 'en trop dans la catégorie à cette agence'
                      else concat_ws(' et ',
                             case when z.mise_en_circulation is not null and z.mise_en_circulation <= make_date(v_annee - 4, 1, 1) then 'quatre ans ou plus au 1er janvier' end,
                             case when coalesce(z.km_dernier, 0) >= 120000 then '120 000 km ou plus' end) end,
                 case when z.entretien > 0 then format('%s € d''entretien sur la période', regexp_replace(round(z.entretien)::text, '(\d)(?=(\d{3})+$)', '\1 ', 'g')) end,
                 case when z.cote is null then 'cote de revente à noter' end))
             order by z.vendre desc, z.mise_en_circulation nulls last, z.km_dernier desc nulls last, z.immatriculation), '[]'::jsonb)
        into v_vehs
      from (
        select v.id, v.immatriculation, v.mise_en_circulation, v.km_dernier,
               v.immatriculation in (select jsonb_array_elements_text(k -> 'a_vendre')) as vendre,
               coalesce((v_couts #>> array[v.id::text, 'entretien_eur'])::numeric, 0) as entretien,
               coalesce((v_couts #>> array[v.id::text, 'interventions'])::integer, 0) as interventions,
               coalesce((v_couts #>> array[v.id::text, 'jours_hors_service'])::integer, 0) as hors_service,
               coalesce((v_couts #>> array[v.id::text, 'jours_loues'])::integer, 0) as loues,
               r.valeur_eur as cote, r.source as cote_source, r.cote_le
        from public.loc_vehicules v
        left join public.loc_cotes_revente r on r.client_id = v.client_id and r.vehicule_id = v.id
        where v.client_id = p_client and v.statut = 'actif' and v.disparu_le is null and v.categorie_id = (k ->> 'categorie_id')::uuid
          and private.loc_b3t_position(v.client_id, v.id, v.entite_id) = (a ->> 'entite_id')::uuid
      ) z
      where z.vendre
         or (z.mise_en_circulation is not null and z.mise_en_circulation <= make_date(v_annee - 4, 1, 1))
         or coalesce(z.km_dernier, 0) >= 120000;
      v_cats := v_cats || (k || jsonb_build_object('vehicules', v_vehs,
                  'valeur_revente_eur', (select coalesce(sum((w ->> 'cote_eur')::numeric), 0) from jsonb_array_elements(v_vehs) w where w ->> 'decision' = 'vendre')));
    end loop;
    v_agences := v_agences || (a || jsonb_build_object('categories', v_cats));
  end loop;
  return p_plan || jsonb_build_object('agences', v_agences, 'totaux', (p_plan -> 'totaux') || jsonb_build_object(
    'valeur_revente_a_vendre_eur', (select coalesce(sum((c ->> 'valeur_revente_eur')::numeric), 0)
                                    from jsonb_array_elements(v_agences) x, jsonb_array_elements(x -> 'categories') c),
    'cotes_manquantes', (select count(*) from jsonb_array_elements(v_agences) x, jsonb_array_elements(x -> 'categories') c,
                                              jsonb_array_elements(c -> 'vehicules') w where w ->> 'cote_eur' is null),
    'entretien_flotte_eur', (select coalesce(sum((e.value ->> 'entretien_eur')::numeric), 0) from jsonb_each(v_couts) e)));
end $function$;

create or replace function public.loc_plan_de_flotte(p_client uuid, p_mois integer default 12, p_cible numeric default 0.80)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.loc_b3t_regard(p_client, array['gerant', 'admin']);
  if p_mois is null or p_mois not between 3 and 36 then
    raise exception 'La période va de 3 à 36 mois.' using errcode = '22023';
  end if;
  if p_cible is null or p_cible not between 0.30 and 1 then
    raise exception 'L''utilisation visée va de 30 %% à 100 %%.' using errcode = '22023';
  end if;
  return private.loc_b3t_plan_couts(p_client, private.loc_plan_de_flotte_calc(p_client, p_mois, p_cible, now()), now());
end $function$;

revoke all on function public.loc_noter_cote_revente(uuid, numeric, text, date) from public, anon;
grant execute on function public.loc_noter_cote_revente(uuid, numeric, text, date) to authenticated, service_role;
revoke all on function public.loc_plan_de_flotte(uuid, integer, numeric) from public, anon;
grant execute on function public.loc_plan_de_flotte(uuid, integer, numeric) to authenticated, service_role;
revoke all on function private.loc_b3t_jours_loues(uuid, date, date) from public, anon, authenticated;
grant execute on function private.loc_b3t_jours_loues(uuid, date, date) to service_role;
revoke all on function private.loc_b3t_couts(uuid, date, date) from public, anon, authenticated;
grant execute on function private.loc_b3t_couts(uuid, date, date) to service_role;
revoke all on function private.loc_b3t_plan_couts(uuid, jsonb, timestamp with time zone) from public, anon, authenticated;
grant execute on function private.loc_b3t_plan_couts(uuid, jsonb, timestamp with time zone) to service_role;

select 'b3t_05 coûts et cotes dans le plan de flotte posé' as resultat;
