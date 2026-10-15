-- b3_18 — Assistante absente : les soins à basculer (audit des promesses, § 2 Tiroma, n° 4).
--
-- CE QUE ÇA CORRIGE : la page /secteurs/dentaire promet « Assistante absente : soins à basculer ». Tiroma connaissait
-- l'assistante habituelle de chaque fauteuil (tiroma_membres.fauteuil_habituel_id) et les soins qui exigent une
-- assistante (tiroma_types_rdv.exige_assistante), mais aucune absence d'un membre de l'équipe ne se notait : les
-- fermetures (tiroma_fermetures) ne visent qu'un praticien ou un fauteuil.
--
-- CE QUE ÇA POSE :
--   · table public.tiroma_absences_membres : l'absence d'un membre de l'équipe (du, au, motif : conge, maladie,
--     formation, autre). Aucune raison médicale n'est demandée : « maladie » suffit. Lecture par l'équipe du cabinet
--     (RLS) ; écriture par la porte.
--   · public.tiroma_noter_absence_membre(p_client, p_entite, p_membre, p_debut, p_fin, p_motif) → uuid ;
--     public.tiroma_retirer_absence_membre(p_absence) → void (clôt l'absence : close_le, l'historique reste).
--     Titulaire et assistante.
--   · public.tiroma_soins_a_basculer(p_client, p_entite, p_jours int = 7) → jsonb (titulaire et assistante) :
--     pour chaque absence qui touche les p_jours prochains jours, les rendez-vous prévus sur le fauteuil habituel du
--     membre absent, pendant l'absence, dont le soin exige une assistante ; et pour chacun, les fauteuils vers
--     lesquels le basculer : actifs, équipés pour ce soin (capacité), avec une assistante habituelle présente, et libres
--     sur ce créneau. Le basculement se fait dans le logiciel du cabinet ; Tiroma le verra au relevé suivant.
-- Idempotent : if not exists, create or replace, politique s'il manque, grant.

create table if not exists public.tiroma_absences_membres (
  id uuid not null default gen_random_uuid() primary key,
  client_id uuid not null,
  entite_id uuid not null,
  membre_id uuid not null,
  debut timestamp with time zone not null,
  fin timestamp with time zone not null,
  motif text not null check (motif in ('conge', 'maladie', 'formation', 'autre')),
  cree_le timestamp with time zone not null default clock_timestamp(),
  cree_par uuid,
  close_le timestamp with time zone,
  constraint tiroma_absences_membres_ordre check (fin > debut and fin - debut <= interval '366 days'),
  constraint tiroma_absences_membres_membre_fkey foreign key (client_id, entite_id, membre_id)
    references public.tiroma_membres (client_id, entite_id, id) on delete cascade
);
create index if not exists tiroma_absences_membres_periode on public.tiroma_absences_membres (client_id, entite_id, fin);
alter table public.tiroma_absences_membres enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tiroma_absences_membres'
                 and policyname = 'tiroma : l''equipe lit les absences') then
    create policy "tiroma : l'equipe lit les absences" on public.tiroma_absences_membres
      for select to authenticated
      using (client_id in (select private.mes_clients())
             and entite_id in (select private.tiroma_cabinets_ou(array['titulaire', 'collaborateur', 'assistante'])));
  end if;
end $$;
revoke all on table public.tiroma_absences_membres from public, anon, authenticated;
grant select on table public.tiroma_absences_membres to authenticated;
grant all on table public.tiroma_absences_membres to service_role;

create or replace function private.tiroma_noter_absence_membre(p_client uuid, p_entite uuid, p_membre uuid, p_debut timestamp with time zone,
  p_fin timestamp with time zone, p_motif text default 'conge')
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_id uuid;
begin
  perform private.tiroma_exiger_regard(p_client, p_entite, array['titulaire', 'assistante']);
  if not exists (select 1 from public.tiroma_membres m where m.id = p_membre and m.client_id = p_client and m.entite_id = p_entite) then
    raise exception 'Membre de l''équipe introuvable dans ce cabinet.' using errcode = 'P0002';
  end if;
  if p_motif is null or p_motif not in ('conge', 'maladie', 'formation', 'autre') then
    raise exception 'Le motif vaut conge, maladie, formation ou autre.' using errcode = '22023';
  end if;
  if p_debut is null or p_fin is null or p_fin <= p_debut or p_fin - p_debut > interval '366 days' then
    raise exception 'L''absence va d''un début à une fin plus tardive, un an au plus.' using errcode = '22023';
  end if;
  insert into public.tiroma_absences_membres (client_id, entite_id, membre_id, debut, fin, motif, cree_par)
  values (p_client, p_entite, p_membre, p_debut, p_fin, p_motif, (select auth.uid()))
  returning id into v_id;
  perform private.journaliser_module(p_client, 'tiroma', 'tiroma.absence_membre_notee', 'tiroma_absences_membres', v_id::text,
    jsonb_build_object('membre', p_membre, 'debut', p_debut, 'fin', p_fin, 'motif', p_motif), p_entite);
  return v_id;
end $function$;

create or replace function private.tiroma_retirer_absence_membre(p_absence uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  a public.tiroma_absences_membres;
begin
  select * into a from public.tiroma_absences_membres where id = p_absence;
  if not found then
    return;
  end if;
  perform private.tiroma_exiger_regard(a.client_id, a.entite_id, array['titulaire', 'assistante']);
  -- On ne retire pas la ligne (l'historique reste) : on la clôt (close_le), et sa fin est ramenée à l'instant.
  if a.close_le is null then
    update public.tiroma_absences_membres
       set close_le = clock_timestamp(), fin = least(a.fin, greatest(clock_timestamp(), a.debut + interval '1 second'))
     where id = a.id;
  end if;
  perform private.journaliser_module(a.client_id, 'tiroma', 'tiroma.absence_membre_close', 'tiroma_absences_membres', a.id::text,
    jsonb_build_object('membre', a.membre_id), a.entite_id);
end $function$;

create or replace function private.tiroma_soins_a_basculer_lire(p_client uuid, p_entite uuid, p_jours integer default 7)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_fuseau text;
  v_fin_horizon timestamp with time zone;
  v_res jsonb;
begin
  perform private.tiroma_exiger_regard(p_client, p_entite, array['titulaire', 'assistante']);
  if p_jours is null or p_jours not between 1 and 31 then
    raise exception 'L''horizon va de 1 à 31 jours.' using errcode = '22023';
  end if;
  select coalesce(e.fuseau, 'Europe/Paris') into v_fuseau from public.entites e where e.client_id = p_client and e.id = p_entite;
  v_fin_horizon := ((now() at time zone coalesce(v_fuseau, 'Europe/Paris'))::date + p_jours + 1)::timestamp at time zone coalesce(v_fuseau, 'Europe/Paris');

  with absences as (
    select a.*, m.prenom, m.fauteuil_habituel_id, f.nom as fauteuil_nom
    from public.tiroma_absences_membres a
    join public.tiroma_membres m on m.id = a.membre_id
    left join public.tiroma_fauteuils f on f.id = m.fauteuil_habituel_id
    where a.client_id = p_client and a.entite_id = p_entite and a.close_le is null and a.fin > now() and a.debut < v_fin_horizon
  ),
  soins as (
    select ab.id as absence_id, r.id as rdv_id, r.debut, r.fin, r.fauteuil_id, pa.nom, pa.prenom,
           coalesce(t.libelle_source, 'Soin') as type_libelle,
           coalesce(t.capacite_requise, private.tiroma_capacite_famille(t.famille)) as capacite
    from absences ab
    join public.tiroma_rendez_vous r on r.client_id = p_client and r.entite_id = p_entite and r.fauteuil_id = ab.fauteuil_habituel_id
                                    and r.statut = 'prevu' and r.disparu_le is null
                                    and r.debut < ab.fin and r.fin > ab.debut and r.debut > now() and r.debut < v_fin_horizon
    left join public.tiroma_types_rdv t on t.id = r.type_rdv_id
    left join public.tiroma_patients pa on pa.id = r.patient_id
    where coalesce(t.exige_assistante, true) and coalesce(t.famille, '') <> 'personnel'
  ),
  vers as (
    select s.rdv_id, f.id as fauteuil_id, f.nom as fauteuil_nom,
           (select string_agg(m.prenom, ', ' order by m.prenom) from public.tiroma_membres m
             where m.client_id = p_client and m.entite_id = p_entite and m.fauteuil_habituel_id = f.id and m.actif
               and not exists (select 1 from public.tiroma_absences_membres x where x.membre_id = m.id and x.close_le is null
                                 and x.debut < s.fin and x.fin > s.debut)) as assistante
    from soins s
    join public.tiroma_fauteuils f on f.client_id = p_client and f.entite_id = p_entite and f.actif and f.id is distinct from s.fauteuil_id
                                   and (s.capacite is null or s.capacite = any (f.capacites))
    where not exists (select 1 from public.tiroma_rendez_vous o
                      where o.client_id = p_client and o.entite_id = p_entite and o.fauteuil_id = f.id and o.statut = 'prevu'
                        and o.disparu_le is null and o.debut < s.fin and o.fin > s.debut)
      and not exists (select 1 from public.tiroma_fermetures fe
                      where fe.client_id = p_client and fe.entite_id = p_entite and (fe.fauteuil_id = f.id or fe.fauteuil_id is null)
                        and fe.praticien_id is null and fe.debut < s.fin and fe.fin > s.debut)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'absence_id', ab.id, 'membre_id', ab.membre_id, 'membre', ab.prenom, 'motif', ab.motif, 'debut', ab.debut, 'fin', ab.fin,
           'fauteuil_id', ab.fauteuil_habituel_id, 'fauteuil_nom', ab.fauteuil_nom,
           'soins', (select coalesce(jsonb_agg(jsonb_build_object(
                       'rendez_vous_id', s.rdv_id, 'debut', s.debut, 'fin', s.fin,
                       'patient_nom', private.tiroma_nom_patient(true, s.nom, s.prenom), 'soin', s.type_libelle,
                       'vers', (select coalesce(jsonb_agg(jsonb_build_object('fauteuil_id', v.fauteuil_id, 'fauteuil_nom', v.fauteuil_nom,
                                                                             'assistante', v.assistante) order by v.fauteuil_nom), '[]'::jsonb)
                                from vers v where v.rdv_id = s.rdv_id and v.assistante is not null))
                     order by s.debut), '[]'::jsonb)
                     from soins s where s.absence_id = ab.id))
         order by ab.debut), '[]'::jsonb)
    into v_res
  from absences ab;
  return v_res;
end $function$;

create or replace function public.tiroma_noter_absence_membre(p_client uuid, p_entite uuid, p_membre uuid, p_debut timestamp with time zone,
  p_fin timestamp with time zone, p_motif text default 'conge')
 returns uuid
 language sql
 set search_path to ''
as $function$
  select private.tiroma_noter_absence_membre(p_client, p_entite, p_membre, p_debut, p_fin, p_motif)
$function$;

create or replace function public.tiroma_retirer_absence_membre(p_absence uuid)
 returns void
 language sql
 set search_path to ''
as $function$
  select private.tiroma_retirer_absence_membre(p_absence)
$function$;

create or replace function public.tiroma_soins_a_basculer(p_client uuid, p_entite uuid, p_jours integer default 7)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select private.tiroma_soins_a_basculer_lire(p_client, p_entite, p_jours)
$function$;

revoke all on function public.tiroma_noter_absence_membre(uuid, uuid, uuid, timestamp with time zone, timestamp with time zone, text) from public, anon;
revoke all on function public.tiroma_retirer_absence_membre(uuid) from public, anon;
revoke all on function public.tiroma_soins_a_basculer(uuid, uuid, integer) from public, anon;
grant execute on function public.tiroma_noter_absence_membre(uuid, uuid, uuid, timestamp with time zone, timestamp with time zone, text) to authenticated, service_role;
grant execute on function public.tiroma_retirer_absence_membre(uuid) to authenticated, service_role;
grant execute on function public.tiroma_soins_a_basculer(uuid, uuid, integer) to authenticated, service_role;
revoke all on function private.tiroma_noter_absence_membre(uuid, uuid, uuid, timestamp with time zone, timestamp with time zone, text) from public, anon;
revoke all on function private.tiroma_retirer_absence_membre(uuid) from public, anon;
revoke all on function private.tiroma_soins_a_basculer_lire(uuid, uuid, integer) from public, anon;
grant execute on function private.tiroma_noter_absence_membre(uuid, uuid, uuid, timestamp with time zone, timestamp with time zone, text) to authenticated, service_role;
grant execute on function private.tiroma_retirer_absence_membre(uuid) to authenticated, service_role;
grant execute on function private.tiroma_soins_a_basculer_lire(uuid, uuid, integer) to authenticated, service_role;

select 'b3_18 assistante absente posée' as resultat;
