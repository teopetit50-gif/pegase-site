-- b3_12 — Le registre des appels : ce que l'assistante a fait de chaque proposition de Tiroma, et ce que ça a rapporté.
--
-- CE QUE ÇA CORRIGE (vague 3, manque n° 1, NOTES-B3) : Tiroma propose qui appeler (créneau libéré, plan signé sans
-- rendez-vous, devis sans réponse, contrôle dû, liste d'attente) mais ne garde aucune trace de l'appel. Le lendemain,
-- les mêmes noms reviennent ; deux assistantes appellent le même patient ; personne ne sait si « message laissé » date
-- d'hier ou de la semaine dernière ; et le titulaire ne voit jamais ce que Tiroma a rapporté. Ici, chaque appel est
-- noté en un geste (une issue codée, jamais de texte libre : rien de médical n'est écrit), le patient « à rappeler »
-- revient le jour dit, et un rendez-vous noté « pris » n'est compté que lorsque le relevé suivant le trouve dans
-- l'agenda du logiciel (vu après l'appel, pour plus tard, non annulé).
--
-- Rien ne sort d'Omega : c'est l'équipe qui téléphone. Aucun envoi, donc aucun verrou santé en jeu.
--
-- CE QUE ÇA POSE :
--   table public.tiroma_appels (un appel = une ligne ; lecture sous RLS comme la liste d'attente ; aucune écriture
--     directe : seule la porte écrit) ;
--   public.tiroma_noter_appel(p_client, p_entite, p_patient uuid, p_motif text, p_issue text, p_plan uuid = null,
--     p_evenement bigint = null, p_rappeler_le date = null) → uuid
--       motifs : creneau | plan | devis | controle | attente | autre
--       issues : rdv_pris | message | pas_de_reponse | rappeler (avec p_rappeler_le, d'aujourd'hui à J+180)
--                | refus | ne_plus_contacter
--   public.tiroma_appels(p_client, p_entite, p_jours int = 30) → jsonb
--       { jour, a_reprendre: [suivi], derniers: {patient_id: dernier appel}, bilan: {appels, patients, rdv_pris,
--         confirmes, refus, ne_plus_contacter, a_reporter_logiciel, valeur_plans, minutes_creneaux} }
--       un « suivi » = la dernière ligne d'une série (patient, motif, plan) dont l'issue appelle une suite
--       (message, pas_de_reponse, rappeler) ; « du » quand c'est pour aujourd'hui ou avant.
-- Profils : titulaire, assistante, collaborateur (sur ses patients). Journal « tiroma.appel_note » (codes seuls).
-- Idempotent : create table if not exists, create or replace, politique et clés ajoutées seulement si absentes, grant.
-- v2 (06/10) : clés étrangères (ex-b3_12b), heure réelle de l'appel (clock_timestamp), prénom de l'appelant par son profil.

create table if not exists public.tiroma_appels (
  id uuid not null default gen_random_uuid() primary key,
  client_id uuid not null,
  entite_id uuid not null,
  patient_id uuid not null,
  motif text not null check (motif in ('creneau', 'plan', 'devis', 'controle', 'attente', 'autre')),
  plan_id uuid,
  evenement_id bigint,
  issue text not null check (issue in ('rdv_pris', 'message', 'pas_de_reponse', 'rappeler', 'refus', 'ne_plus_contacter')),
  rappeler_le date,
  appele_le timestamp with time zone not null default clock_timestamp(),
  appele_par uuid,
  constraint tiroma_appels_rappel check ((issue = 'rappeler') = (rappeler_le is not null))
);

-- L'heure de l'appel est l'heure réelle de l'écriture (clock_timestamp), pas celle du début de la transaction : deux
-- appels notés dans la même transaction (un test, un lot) gardent leur ordre, et « le dernier appel » est bien le dernier.
alter table public.tiroma_appels alter column appele_le set default clock_timestamp();

-- Les clés (ex-b3_12b, accordées par le coordinateur le 06/10) : un patient effacé (droit à l'effacement, purge)
-- emporte ses appels ; un plan effacé laisse l'appel, sans plan. Ajoutées si elles manquent, « not valid » puis
-- validées : une ligne orpheline éventuelle est signalée sans bloquer la pose.
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.tiroma_appels'::regclass and conname = 'tiroma_appels_patient_fkey') then
    alter table public.tiroma_appels add constraint tiroma_appels_patient_fkey
      foreign key (client_id, entite_id, patient_id) references public.tiroma_patients (client_id, entite_id, id)
      on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.tiroma_appels'::regclass and conname = 'tiroma_appels_plan_fkey') then
    alter table public.tiroma_appels add constraint tiroma_appels_plan_fkey
      foreign key (client_id, entite_id, plan_id) references public.tiroma_plans (client_id, entite_id, id)
      on delete set null (plan_id) not valid;
  end if;
  begin
    alter table public.tiroma_appels validate constraint tiroma_appels_patient_fkey;
    alter table public.tiroma_appels validate constraint tiroma_appels_plan_fkey;
  exception when foreign_key_violation then
    raise notice 'b3_12 : des appels orphelins empêchent la validation ; les clés jouent pour toute nouvelle écriture.';
  end;
end $$;

create index if not exists tiroma_appels_serie on public.tiroma_appels (client_id, entite_id, patient_id, motif, appele_le desc);
create index if not exists tiroma_appels_jour on public.tiroma_appels (client_id, entite_id, appele_le desc);
create index if not exists tiroma_appels_plan on public.tiroma_appels (client_id, entite_id, plan_id) where plan_id is not null;

alter table public.tiroma_appels enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tiroma_appels'
                 and policyname = 'tiroma : on voit les appels des patients qu''on voit') then
    create policy "tiroma : on voit les appels des patients qu'on voit" on public.tiroma_appels
      for select to authenticated
      using (client_id in (select private.mes_clients()) and patient_id in (select pa.id from public.tiroma_patients pa));
  end if;
end $$;

revoke all on table public.tiroma_appels from public, anon, authenticated;
grant select on table public.tiroma_appels to authenticated;
grant all on table public.tiroma_appels to service_role;

-- ——— Qui a appelé : le prénom du membre relié au profil (assistante), sinon le praticien du profil ———
create or replace function private.tiroma_appelant(p_client uuid, p_entite uuid, p_user uuid)
 returns text
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select coalesce(
    (select m.prenom from public.tiroma_profils pr join public.tiroma_membres m on m.id = pr.membre_id
      where pr.client_id = p_client and pr.entite_id = p_entite and pr.user_id = p_user limit 1),
    (select m.prenom from public.tiroma_membres m where m.client_id = p_client and m.entite_id = p_entite and m.user_id = p_user limit 1),
    (select x.nom_affiche from public.tiroma_profils pr join public.tiroma_praticiens x on x.id = pr.praticien_id
      where pr.client_id = p_client and pr.entite_id = p_entite and pr.user_id = p_user limit 1))
$function$;

-- ——— Noter un appel ———
create or replace function private.tiroma_noter_appel(p_client uuid, p_entite uuid, p_patient uuid, p_motif text, p_issue text,
  p_plan uuid default null, p_evenement bigint default null, p_rappeler_le date default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  rg record;
  pa public.tiroma_patients;
  v_fuseau text;
  v_jour date;
  v_id uuid;
begin
  rg := private.tiroma_exiger_regard(p_client, p_entite, array['titulaire', 'collaborateur', 'assistante']);
  if p_motif is null or p_motif not in ('creneau', 'plan', 'devis', 'controle', 'attente', 'autre') then
    raise exception 'Le motif vaut creneau, plan, devis, controle, attente ou autre.' using errcode = '22023';
  end if;
  if p_issue is null or p_issue not in ('rdv_pris', 'message', 'pas_de_reponse', 'rappeler', 'refus', 'ne_plus_contacter') then
    raise exception 'L''issue vaut rdv_pris, message, pas_de_reponse, rappeler, refus ou ne_plus_contacter.' using errcode = '22023';
  end if;
  select * into pa from public.tiroma_patients where id = p_patient and client_id = p_client and entite_id = p_entite;
  if not found then
    raise exception 'Patient introuvable dans ce cabinet.' using errcode = 'P0002';
  end if;
  if not rg.voit_tous and (rg.praticien_id is null or pa.praticien_habituel_id is distinct from rg.praticien_id) then
    raise exception 'Ce patient n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  if pa.ne_pas_contacter then
    raise exception 'Ce patient a demandé à ne pas être contacté : aucun appel ne se note.' using errcode = '22023';
  end if;
  if p_plan is not null and not exists (select 1 from public.tiroma_plans pl
                                        where pl.id = p_plan and pl.client_id = p_client and pl.entite_id = p_entite and pl.patient_id = p_patient) then
    raise exception 'Ce plan n''est pas celui de ce patient.' using errcode = '22023';
  end if;
  select e.fuseau into v_fuseau from public.entites e where e.client_id = p_client and e.id = p_entite;
  v_jour := (now() at time zone coalesce(v_fuseau, 'Europe/Paris'))::date;
  if p_issue = 'rappeler' then
    if p_rappeler_le is null or p_rappeler_le < v_jour or p_rappeler_le > v_jour + 180 then
      raise exception '« À rappeler » demande une date, d''aujourd''hui à six mois.' using errcode = '22023';
    end if;
  elsif p_rappeler_le is not null then
    raise exception 'Une date de rappel ne va qu''avec l''issue « rappeler ».' using errcode = '22023';
  end if;

  -- Un double clic ne fait pas deux appels : même personne, même patient, même motif, même issue, moins de deux minutes.
  select a.id into v_id from public.tiroma_appels a
  where a.client_id = p_client and a.entite_id = p_entite and a.patient_id = p_patient and a.motif = p_motif
    and a.plan_id is not distinct from p_plan and a.issue = p_issue
    and a.appele_par is not distinct from (select auth.uid()) and a.appele_le > now() - interval '2 minutes'
  order by a.appele_le desc limit 1;
  if v_id is not null then
    return v_id;
  end if;

  insert into public.tiroma_appels (client_id, entite_id, patient_id, motif, plan_id, evenement_id, issue, rappeler_le, appele_par)
  values (p_client, p_entite, p_patient, p_motif, p_plan, p_evenement, p_issue, p_rappeler_le, (select auth.uid()))
  returning id into v_id;
  perform private.journaliser_module(p_client, 'tiroma', 'tiroma.appel_note', 'tiroma_appels', v_id::text,
    jsonb_strip_nulls(jsonb_build_object('patient', p_patient, 'motif', p_motif, 'issue', p_issue, 'plan', p_plan,
                                         'rappeler_le', p_rappeler_le)), p_entite);
  return v_id;
end $function$;

-- ——— Le registre lu : à reprendre aujourd'hui, le dernier appel de chaque patient, le bilan de la période ———
create or replace function private.tiroma_appels_lire(p_client uuid, p_entite uuid, p_jours integer default 30)
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
  v_depuis timestamp with time zone;
  v_reprendre jsonb;
  v_derniers jsonb;
  v_bilan jsonb;
begin
  rg := private.tiroma_exiger_regard(p_client, p_entite, array['titulaire', 'collaborateur', 'assistante']);
  if p_jours is null or p_jours not between 1 and 366 then
    raise exception 'La période va de 1 à 366 jours.' using errcode = '22023';
  end if;
  select e.fuseau into v_fuseau from public.entites e where e.client_id = p_client and e.id = p_entite;
  v_fuseau := coalesce(v_fuseau, 'Europe/Paris');
  v_jour := (now() at time zone v_fuseau)::date;
  v_depuis := (v_jour - p_jours)::timestamp at time zone v_fuseau;

  with vus as (
    select a.*, pa.nom, pa.prenom, pa.ne_pas_contacter,
           (rg.voit_tous or pa.praticien_habituel_id = rg.praticien_id) as voit_nom,
           private.tiroma_appelant(a.client_id, a.entite_id, a.appele_par) as par_prenom
    from public.tiroma_appels a
    join public.tiroma_patients pa on pa.id = a.patient_id
    where a.client_id = p_client and a.entite_id = p_entite
      and (rg.voit_tous or (rg.praticien_id is not null and pa.praticien_habituel_id = rg.praticien_id))
  ),
  series as (
    select distinct on (v.patient_id, v.motif, v.plan_id) v.*,
           count(*) over (partition by v.patient_id, v.motif, v.plan_id) as tentatives
    from vus v
    order by v.patient_id, v.motif, v.plan_id, v.appele_le desc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'patient_id', s.patient_id, 'patient_nom', private.tiroma_nom_patient(s.voit_nom, s.nom, s.prenom),
           'motif', s.motif, 'plan_id', s.plan_id, 'issue', s.issue, 'rappeler_le', s.rappeler_le,
           'appele_le', s.appele_le, 'par', s.par_prenom, 'tentatives', s.tentatives,
           'du', coalesce(s.rappeler_le <= v_jour, (s.appele_le at time zone v_fuseau)::date < v_jour))
         order by coalesce(s.rappeler_le, (s.appele_le at time zone v_fuseau)::date + 1), s.appele_le), '[]'::jsonb)
    into v_reprendre
  from series s
  where s.issue in ('message', 'pas_de_reponse', 'rappeler') and not s.ne_pas_contacter
    and s.appele_le >= now() - interval '60 days';

  with vus as (
    select a.*, private.tiroma_appelant(a.client_id, a.entite_id, a.appele_par) as par_prenom
    from public.tiroma_appels a
    join public.tiroma_patients pa on pa.id = a.patient_id
    where a.client_id = p_client and a.entite_id = p_entite and a.appele_le >= now() - interval '60 days'
      and (rg.voit_tous or (rg.praticien_id is not null and pa.praticien_habituel_id = rg.praticien_id))
  ),
  dernier as (
    select distinct on (v.patient_id) v.* from vus v order by v.patient_id, v.appele_le desc
  )
  select coalesce(jsonb_object_agg(d.patient_id::text, jsonb_build_object(
           'motif', d.motif, 'issue', d.issue, 'appele_le', d.appele_le, 'rappeler_le', d.rappeler_le, 'par', d.par_prenom)), '{}'::jsonb)
    into v_derniers
  from dernier d;

  with periode as (
    select a.*, pa.ne_pas_contacter as deja_note_logiciel,
           (select r.id from public.tiroma_rendez_vous r
             where r.client_id = a.client_id and r.entite_id = a.entite_id and r.patient_id = a.patient_id
               and r.vu_premier_le >= a.appele_le and r.debut > a.appele_le
               and r.statut not in ('annule', 'supprime') and r.disparu_le is null
             order by r.debut limit 1) as rdv_id
    from public.tiroma_appels a
    join public.tiroma_patients pa on pa.id = a.patient_id
    where a.client_id = p_client and a.entite_id = p_entite and a.appele_le >= v_depuis
      and (rg.voit_tous or (rg.praticien_id is not null and pa.praticien_habituel_id = rg.praticien_id))
  ),
  confirmes as (
    select p.* from periode p where p.issue = 'rdv_pris' and p.rdv_id is not null
  )
  select jsonb_build_object(
           'jours', p_jours,
           'appels', (select count(*) from periode),
           'patients', (select count(distinct patient_id) from periode),
           'rdv_pris', (select count(*) from periode where issue = 'rdv_pris'),
           'confirmes', (select count(*) from confirmes),
           'refus', (select count(*) from periode where issue = 'refus'),
           'ne_plus_contacter', (select count(*) from periode where issue = 'ne_plus_contacter'),
           -- Le logiciel reste la référence : un refus de contact noté ici doit y être reporté (le relevé l'écraserait).
           'a_reporter_logiciel', (select count(distinct patient_id) from periode where issue = 'ne_plus_contacter' and not deja_note_logiciel),
           -- Ce que Tiroma a rapporté : le montant des plans dont la suite est désormais à l'agenda (chaque plan une fois,
           -- qu'on l'ait appelé pour son plan ou pour reprendre un créneau),
           -- et les minutes de fauteuil reprises sur les créneaux libérés.
           'valeur_plans', coalesce((select sum(pl.montant) from public.tiroma_plans pl
                                     where pl.id in (select c.plan_id from confirmes c where c.plan_id is not null)), 0),
           'minutes_creneaux', coalesce((select sum(extract(epoch from (r.fin - r.debut)) / 60)::integer from public.tiroma_rendez_vous r
                                         where r.id in (select c.rdv_id from confirmes c where c.motif in ('creneau', 'attente'))), 0))
    into v_bilan;

  return jsonb_build_object('jour', v_jour, 'a_reprendre', v_reprendre, 'derniers', v_derniers, 'bilan', v_bilan);
end $function$;

create or replace function public.tiroma_noter_appel(p_client uuid, p_entite uuid, p_patient uuid, p_motif text, p_issue text,
  p_plan uuid default null, p_evenement bigint default null, p_rappeler_le date default null)
 returns uuid
 language sql
 set search_path to ''
as $function$
  select private.tiroma_noter_appel(p_client, p_entite, p_patient, p_motif, p_issue, p_plan, p_evenement, p_rappeler_le)
$function$;

create or replace function public.tiroma_appels(p_client uuid, p_entite uuid, p_jours integer default 30)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select private.tiroma_appels_lire(p_client, p_entite, p_jours)
$function$;

revoke all on function public.tiroma_noter_appel(uuid, uuid, uuid, text, text, uuid, bigint, date) from public, anon;
revoke all on function public.tiroma_appels(uuid, uuid, integer) from public, anon;
revoke all on function private.tiroma_noter_appel(uuid, uuid, uuid, text, text, uuid, bigint, date) from public, anon;
revoke all on function private.tiroma_appels_lire(uuid, uuid, integer) from public, anon;
grant execute on function public.tiroma_noter_appel(uuid, uuid, uuid, text, text, uuid, bigint, date) to authenticated, service_role;
grant execute on function public.tiroma_appels(uuid, uuid, integer) to authenticated, service_role;
grant execute on function private.tiroma_noter_appel(uuid, uuid, uuid, text, text, uuid, bigint, date) to authenticated, service_role;
grant execute on function private.tiroma_appels_lire(uuid, uuid, integer) to authenticated, service_role;
revoke all on function private.tiroma_appelant(uuid, uuid, uuid) from public, anon;
grant execute on function private.tiroma_appelant(uuid, uuid, uuid) to authenticated, service_role;

select 'b3_12 v2 registre des appels posé' as resultat, (select count(*) from pg_constraint where conrelid = 'public.tiroma_appels'::regclass and contype = 'f' and convalidated) as cles_validees;
