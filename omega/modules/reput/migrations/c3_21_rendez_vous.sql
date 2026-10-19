-- c3_21 — REPUT : le bloc rendez-vous côté base — créneaux, durée par type, rappel, replanification — SANS agenda externe
-- (session C3, 19/10/2026)
--
-- Chiffrage #27, #30, #81 (décision de Teo du 17/10 : K:122 = transmission au service qui tient le planning, pas d'agenda
-- branché). Ce lot donne à ce service un planning DANS la base, sans connecteur agenda :
--   · public.reput_rdv_types : les types de rendez-vous de l'organisation (code, libellé, DURÉE en minutes, délai du RAPPEL
--     en heures, service qui les tient) — porte reput_regler_type_rdv (gérant, administrateur).
--   · public.reput_rdv_plages : les heures d'ouverture au rendez-vous, par jour de la semaine, pour l'organisation ou un site,
--     éventuellement pour un seul type ; public.reput_rdv_fermetures : congés, fermetures — portes reput_regler_plages et
--     reput_fermer (gérant, administrateur du périmètre). Une plage n'est jamais effacée : elle est désactivée.
--   · public.reput_creneaux_libres(p_client, p_entite, p_type, p_du, p_nombre) : les prochains créneaux LIBRES (plages, moins
--     fermetures, moins rendez-vous posés, à partir d'une heure d'ici), heure du site.
--   · public.reput_rdv : les rendez-vous. reput_poser_rdv (une personne qui traite les demandes, sur son périmètre) pose un
--     créneau libre ; s'il vient d'être pris, rien n'est posé et les SUIVANTS sont rendus (« le second client se voit
--     proposer les suivants »). Deux rendez-vous ne se chevauchent jamais sur un même planning (verrou par planning).
--     reput_replanifier_rdv (l'ancien passe « replanifie », le nouveau le remplace) et reput_annuler_rdv.
--   · LE RAPPEL : la tâche « reput-rdv-rappels » (chaque quart d'heure) prépare, au délai du type avant l'heure, un message
--     au client sur le canal de la demande (sous la signature des réglages du site) — par la préparation d'envoi du socle,
--     donc relu ou couvert par un accord « reput.rappel_rdv », comme l'accusé. Rien ne part pour de vrai en mode essai.
-- Aucune écriture dans un agenda : le connecteur agenda reste hors de ce lot.
--
-- Règles de pose : create … if not exists, create or replace ; ni DROP ni DELETE.

create table if not exists public.reput_rdv_types (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  code text not null,
  libelle text not null,
  duree_minutes integer not null default 30,
  rappel_heures integer not null default 24,
  equipe_id uuid,
  actif boolean not null default true,
  maj_le timestamptz not null default now(),
  constraint reput_rdv_types_code_key unique (client_id, code),
  constraint reput_rdv_types_code_check check (code ~ '^[a-z][a-z0-9_]{1,39}$'),
  constraint reput_rdv_types_libelle_check check (char_length(btrim(libelle)) between 1 and 120),
  constraint reput_rdv_types_duree_check check (duree_minutes between 5 and 480),
  constraint reput_rdv_types_rappel_check check (rappel_heures between 0 and 168)
);

create table if not exists public.reput_rdv_plages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  jour integer not null,
  debut time not null,
  fin time not null,
  type_code text,
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  constraint reput_rdv_plages_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id) on delete cascade,
  constraint reput_rdv_plages_jour_check check (jour between 1 and 7),
  constraint reput_rdv_plages_heures_check check (debut < fin)
);
create index if not exists reput_rdv_plages_idx on public.reput_rdv_plages (client_id, entite_id, jour) where actif;

create table if not exists public.reput_rdv_fermetures (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  du timestamptz not null,
  au timestamptz not null,
  motif text,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  constraint reput_rdv_fermetures_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id) on delete cascade,
  constraint reput_rdv_fermetures_periode_check check (du < au),
  constraint reput_rdv_fermetures_motif_check check (motif is null or char_length(motif) <= 200)
);

create table if not exists public.reput_rdv (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  demande_id uuid references public.reput_demandes(id) on delete set null,
  type_code text not null,
  debut timestamptz not null,
  fin timestamptz not null,
  statut text not null default 'confirme',
  client_nom text,
  canal text,
  adresse text,
  rappel_le timestamptz,
  rappel_envoi uuid references public.envois(id) on delete set null,
  remplace uuid references public.reput_rdv(id) on delete set null,
  motif text,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint reput_rdv_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id) on delete cascade,
  constraint reput_rdv_statut_check check (statut in ('confirme', 'replanifie', 'annule', 'honore', 'absent')),
  constraint reput_rdv_periode_check check (debut < fin),
  constraint reput_rdv_canal_check check ((canal is null) = (adresse is null) and (canal is null or canal in ('email', 'whatsapp', 'sms'))),
  constraint reput_rdv_textes_check check ((client_nom is null or char_length(client_nom) <= 200) and (motif is null or char_length(motif) <= 500))
);
create index if not exists reput_rdv_planning_idx on public.reput_rdv (client_id, entite_id, debut) where statut = 'confirme';
create index if not exists reput_rdv_rappel_idx on public.reput_rdv (rappel_le) where statut = 'confirme' and rappel_envoi is null;

alter table public.reput_rdv_types enable row level security;
alter table public.reput_rdv_plages enable row level security;
alter table public.reput_rdv_fermetures enable row level security;
alter table public.reput_rdv enable row level security;
revoke all on public.reput_rdv_types, public.reput_rdv_plages, public.reput_rdv_fermetures, public.reput_rdv from authenticated, anon;
grant select on public.reput_rdv_types, public.reput_rdv_plages, public.reput_rdv_fermetures, public.reput_rdv to authenticated;
grant all on public.reput_rdv_types, public.reput_rdv_plages, public.reput_rdv_fermetures, public.reput_rdv to service_role;

do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reput_rdv_types' and policyname = 'membres lisent les types de rendez-vous') then
    create policy "membres lisent les types de rendez-vous" on public.reput_rdv_types for select to authenticated
      using (client_id in (select private.mes_clients()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reput_rdv_plages' and policyname = 'membres lisent les plages de leur perimetre') then
    create policy "membres lisent les plages de leur perimetre" on public.reput_rdv_plages for select to authenticated
      using (client_id in (select private.mes_clients()) and private.perimetre_couvre((select auth.uid()), client_id, entite_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reput_rdv_fermetures' and policyname = 'membres lisent les fermetures de leur perimetre') then
    create policy "membres lisent les fermetures de leur perimetre" on public.reput_rdv_fermetures for select to authenticated
      using (client_id in (select private.mes_clients()) and private.perimetre_couvre((select auth.uid()), client_id, entite_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reput_rdv' and policyname = 'membres lisent les rendez-vous de leur perimetre') then
    create policy "membres lisent les rendez-vous de leur perimetre" on public.reput_rdv for select to authenticated
      using (client_id in (select private.mes_clients()) and private.perimetre_couvre((select auth.uid()), client_id, entite_id));
  end if;
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom)
                 select x from unnest(array['reput_rdv_types', 'reput_rdv_plages', 'reput_rdv_fermetures', 'reput_rdv']) x
                 where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then
      raise notice 'tables_locataires : %', sqlerrm;
    end;
  end if;
end $do$;

-- ─────────────────────────────────────────────────────────────────────────
-- Aides
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.reput_fuseau(p_client uuid, p_entite uuid)
 returns text
 language sql
 stable security definer
 set search_path to ''
as $function$
  select coalesce((select e.fuseau from public.entites e where e.client_id = p_client and e.id = p_entite),
                  (select e.fuseau from public.entites e where e.client_id = p_client and e.principale), 'Europe/Paris')
$function$;

revoke execute on function private.reput_fuseau(uuid, uuid) from public, anon, authenticated;

-- Dirige le planning d'un site (gérant, administrateur, périmètre strict : toute l'organisation = périmètre complet).
create or replace function private.reput_dirige_planning(p_client uuid, p_entite uuid)
 returns void
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Le planning des rendez-vous se règle par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  if p_entite is null then
    if not exists (select 1 from public.comptes c where c.user_id = v_uid and c.client_id = p_client and c.perimetre_total) then
      raise exception 'Le planning de toute l''organisation demande un périmètre complet.' using errcode = '42501';
    end if;
  elsif not exists (select 1 from public.entites e where e.client_id = p_client and e.id = p_entite) then
    raise exception 'Entité introuvable dans cette organisation.' using errcode = '22023';
  elsif not private.perimetre_couvre(v_uid, p_client, p_entite) then
    raise exception 'Cette entité n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
end $function$;

revoke execute on function private.reput_dirige_planning(uuid, uuid) from public, anon, authenticated;

-- Traite les rendez-vous d'un site : une personne qui traite les demandes (pas un lecteur), sur son périmètre.
create or replace function private.reput_tient_planning(p_client uuid, p_entite uuid)
 returns void
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin', 'valideur', 'collaborateur'])
     or not private.perimetre_couvre(v_uid, p_client, p_entite) then
    raise exception 'Les rendez-vous se posent par une personne qui traite les demandes de ce site.' using errcode = '42501';
  end if;
end $function$;

revoke execute on function private.reput_tient_planning(uuid, uuid) from public, anon, authenticated;

-- Les créneaux libres : plages actives du jour (pour ce type ou tous), au pas de la durée, à partir d'une heure d'ici,
-- hors fermetures et hors rendez-vous confirmés du même planning (organisation ou site).
create or replace function private.reput_creneaux(p_client uuid, p_entite uuid, p_type text, p_du timestamptz, p_nombre integer,
                                                  p_sauf uuid default null)
 returns table (debut timestamptz, fin timestamptz)
 language sql
 stable security definer
 set search_path to ''
as $function$
  with t as (select x.duree_minutes from public.reput_rdv_types x where x.client_id = p_client and x.code = p_type and x.actif),
  fz as (select private.reput_fuseau(p_client, p_entite) as fz),
  jours as (
    select ((greatest(p_du, now()) at time zone fz.fz)::date + g) as j
    from fz, generate_series(0, 62) g
  ),
  candidats as (
    select ((j.j + pl.debut) + make_interval(mins => t.duree_minutes * k)) at time zone fz.fz as debut,
           ((j.j + pl.debut) + make_interval(mins => t.duree_minutes * (k + 1))) at time zone fz.fz as fin
    from t, fz, jours j
    join public.reput_rdv_plages pl on pl.client_id = p_client and pl.entite_id is not distinct from p_entite and pl.actif
      and pl.jour = extract(isodow from j.j) and (pl.type_code is null or pl.type_code = p_type)
    cross join lateral generate_series(0, greatest(0, (extract(epoch from (pl.fin - pl.debut)) / 60)::int / t.duree_minutes - 1)) k
    where (pl.debut + make_interval(mins => t.duree_minutes * (k + 1))) <= pl.fin
  )
  select distinct c.debut, c.fin
  from candidats c
  where c.debut >= greatest(p_du, now() + interval '1 hour')
    and not exists (select 1 from public.reput_rdv_fermetures f where f.client_id = p_client and f.entite_id is not distinct from p_entite
                    and f.du < c.fin and f.au > c.debut)
    and not exists (select 1 from public.reput_rdv r where r.client_id = p_client and r.entite_id is not distinct from p_entite
                    and r.statut = 'confirme' and r.id is distinct from p_sauf and r.debut < c.fin and r.fin > c.debut)
  order by c.debut
  limit greatest(1, least(coalesce(p_nombre, 5), 50))
$function$;

revoke execute on function private.reput_creneaux(uuid, uuid, text, timestamptz, integer, uuid) from public, anon, authenticated;

create or replace function private.reput_creneaux_json(p_client uuid, p_entite uuid, p_type text, p_du timestamptz, p_nombre integer,
                                                       p_sauf uuid default null)
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  select coalesce(jsonb_agg(jsonb_build_object('debut', c.debut, 'fin', c.fin) order by c.debut), '[]'::jsonb)
  from private.reput_creneaux(p_client, p_entite, p_type, p_du, p_nombre, p_sauf) c
$function$;

revoke execute on function private.reput_creneaux_json(uuid, uuid, text, timestamptz, integer, uuid) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Régler le planning
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.reput_regler_type_rdv(p_client uuid, p_code text, p_libelle text, p_duree_minutes integer,
                                                        p_rappel_heures integer default 24, p_equipe uuid default null,
                                                        p_actif boolean default true)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_id uuid; v_code text := lower(btrim(coalesce(p_code, '')));
begin
  perform private.reput_dirige_planning(p_client, null);
  if p_equipe is not null and not exists (select 1 from public.equipes e where e.client_id = p_client and e.id = p_equipe) then
    raise exception 'Équipe introuvable dans cette organisation.' using errcode = '22023';
  end if;
  insert into public.reput_rdv_types (client_id, code, libelle, duree_minutes, rappel_heures, equipe_id, actif)
  values (p_client, v_code, btrim(p_libelle), p_duree_minutes, coalesce(p_rappel_heures, 24), p_equipe, coalesce(p_actif, true))
  on conflict (client_id, code) do update set libelle = excluded.libelle, duree_minutes = excluded.duree_minutes,
    rappel_heures = excluded.rappel_heures, equipe_id = excluded.equipe_id, actif = excluded.actif, maj_le = now()
  returning id into v_id;
  perform private.journaliser_module(p_client, 'reput', 'reput.rdv_type_regle', 'reput_rdv_types', v_id::text,
    jsonb_build_object('code', v_code, 'duree', p_duree_minutes, 'rappel', p_rappel_heures, 'actif', coalesce(p_actif, true)), null);
  return jsonb_build_object('type', v_id, 'code', v_code);
end $function$;

revoke execute on function public.reput_regler_type_rdv(uuid, text, text, integer, integer, uuid, boolean) from public, anon;
grant execute on function public.reput_regler_type_rdv(uuid, text, text, integer, integer, uuid, boolean) to authenticated, service_role;

-- Les plages d'un planning, remplacées d'un coup : les anciennes sont désactivées, jamais effacées.
-- p_plages : [{"jour": 1, "debut": "09:00", "fin": "12:00", "type": null}, …]
create or replace function public.reput_regler_plages(p_client uuid, p_entite uuid, p_plages jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare x jsonb; n integer := 0;
begin
  perform private.reput_dirige_planning(p_client, p_entite);
  if p_plages is null or jsonb_typeof(p_plages) <> 'array' or jsonb_array_length(p_plages) > 70 then
    raise exception 'Les plages forment une liste (70 au plus).' using errcode = '22023';
  end if;
  update public.reput_rdv_plages pl set actif = false
  where pl.client_id = p_client and pl.entite_id is not distinct from p_entite and pl.actif;
  for x in select * from jsonb_array_elements(p_plages) loop
    if nullif(x ->> 'type', '') is not null
       and not exists (select 1 from public.reput_rdv_types t where t.client_id = p_client and t.code = x ->> 'type') then
      raise exception 'Type de rendez-vous inconnu : %.', x ->> 'type' using errcode = '22023';
    end if;
    insert into public.reput_rdv_plages (client_id, entite_id, jour, debut, fin, type_code)
    values (p_client, p_entite, (x ->> 'jour')::int, (x ->> 'debut')::time, (x ->> 'fin')::time, nullif(x ->> 'type', ''));
    n := n + 1;
  end loop;
  perform private.journaliser_module(p_client, 'reput', 'reput.rdv_plages_reglees', 'clients', p_client::text,
    jsonb_build_object('entite', p_entite, 'plages', n), p_entite);
  return jsonb_build_object('entite', p_entite, 'plages', n);
end $function$;

revoke execute on function public.reput_regler_plages(uuid, uuid, jsonb) from public, anon;
grant execute on function public.reput_regler_plages(uuid, uuid, jsonb) to authenticated, service_role;

create or replace function public.reput_fermer(p_client uuid, p_entite uuid, p_du timestamptz, p_au timestamptz, p_motif text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_id uuid; v_touches integer;
begin
  perform private.reput_dirige_planning(p_client, p_entite);
  insert into public.reput_rdv_fermetures (client_id, entite_id, du, au, motif, cree_par)
  values (p_client, p_entite, p_du, p_au, nullif(btrim(p_motif), ''), (select auth.uid()))
  returning id into v_id;
  select count(*)::int into v_touches from public.reput_rdv r
  where r.client_id = p_client and r.entite_id is not distinct from p_entite and r.statut = 'confirme' and r.debut < p_au and r.fin > p_du;
  perform private.journaliser_module(p_client, 'reput', 'reput.rdv_fermeture', 'reput_rdv_fermetures', v_id::text,
    jsonb_build_object('entite', p_entite, 'du', p_du, 'au', p_au, 'rdv_a_replanifier', v_touches), p_entite);
  -- Les rendez-vous déjà posés dans la fermeture ne bougent pas seuls : ils sont dits, une personne les replanifie.
  return jsonb_build_object('fermeture', v_id, 'rdv_a_replanifier', v_touches);
end $function$;

revoke execute on function public.reput_fermer(uuid, uuid, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.reput_fermer(uuid, uuid, timestamptz, timestamptz, text) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Les créneaux, les rendez-vous
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.reput_creneaux_libres(p_client uuid, p_entite uuid, p_type text, p_du timestamptz default null,
                                                        p_nombre integer default 5)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  if not private.reput_est_serveur() then
    if (select auth.uid()) is null or p_client not in (select private.mes_clients())
       or not private.perimetre_couvre((select auth.uid()), p_client, p_entite) then
      raise exception 'Ce planning n''est pas dans votre périmètre.' using errcode = '42501';
    end if;
  end if;
  if not exists (select 1 from public.reput_rdv_types t where t.client_id = p_client and t.code = p_type and t.actif) then
    raise exception 'Type de rendez-vous inconnu ou inactif : %.', p_type using errcode = '22023';
  end if;
  return jsonb_build_object('type', p_type, 'entite', p_entite, 'fuseau', private.reput_fuseau(p_client, p_entite),
                            'creneaux', private.reput_creneaux_json(p_client, p_entite, p_type, coalesce(p_du, now()), p_nombre));
end $function$;

revoke execute on function public.reput_creneaux_libres(uuid, uuid, text, timestamptz, integer) from public, anon;
grant execute on function public.reput_creneaux_libres(uuid, uuid, text, timestamptz, integer) to authenticated, service_role;

-- Pose un rendez-vous sur un créneau libre (verrou par planning) ; pris entre-temps → rien n'est posé, les suivants sont rendus.
create or replace function private.reput_poser(p_client uuid, p_entite uuid, p_type text, p_debut timestamptz, p_demande uuid,
                                               p_nom text, p_canal text, p_adresse text, p_remplace uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  t public.reput_rdv_types;
  v_id uuid;
begin
  select * into t from public.reput_rdv_types x where x.client_id = p_client and x.code = p_type and x.actif;
  if t.id is null then
    raise exception 'Type de rendez-vous inconnu ou inactif : %.', p_type using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('reput_rdv:' || p_client::text || ':' || coalesce(p_entite::text, '-'), 0));
  if not exists (select 1 from private.reput_creneaux(p_client, p_entite, p_type, p_debut, 1, p_remplace) c where c.debut = p_debut) then
    return jsonb_build_object('pose', false, 'motif', 'Ce créneau n''est pas libre (pris entre-temps, fermé ou hors des plages).',
                              'suivants', private.reput_creneaux_json(p_client, p_entite, p_type, p_debut, 3, p_remplace));
  end if;
  insert into public.reput_rdv (client_id, entite_id, demande_id, type_code, debut, fin, client_nom, canal, adresse, rappel_le, remplace, cree_par)
  values (p_client, p_entite, p_demande, p_type, p_debut, p_debut + make_interval(mins => t.duree_minutes), left(nullif(btrim(p_nom), ''), 200),
          p_canal, nullif(btrim(p_adresse), ''),
          case when t.rappel_heures > 0 then p_debut - make_interval(hours => t.rappel_heures) end, p_remplace, (select auth.uid()))
  returning id into v_id;
  return jsonb_build_object('pose', true, 'rdv', v_id, 'debut', p_debut, 'fin', p_debut + make_interval(mins => t.duree_minutes));
end $function$;

revoke execute on function private.reput_poser(uuid, uuid, text, timestamptz, uuid, text, text, text, uuid) from public, anon, authenticated;

create or replace function public.reput_poser_rdv(p_client uuid, p_entite uuid, p_type text, p_debut timestamptz,
                                                  p_demande uuid default null, p_nom text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes;
  v_j jsonb;
begin
  perform private.reput_tient_planning(p_client, p_entite);
  if p_demande is not null then
    d := private.reput_demande_lue(p_demande);
    if d.client_id <> p_client then
      raise exception 'Cette demande n''est pas de cette organisation.' using errcode = '22023';
    end if;
  end if;
  v_j := private.reput_poser(p_client, p_entite, p_type, p_debut, d.id, coalesce(nullif(btrim(p_nom), ''), d.de_nom),
                             d.canal_reponse, d.adresse_reponse, null);
  if (v_j ->> 'pose')::boolean then
    perform private.journaliser_module(p_client, 'reput', 'reput.rdv_pose', 'reput_rdv', v_j ->> 'rdv',
      jsonb_build_object('type', p_type, 'debut', p_debut, 'demande', d.id, 'par', (select auth.uid())), p_entite);
  end if;
  return v_j;
end $function$;

revoke execute on function public.reput_poser_rdv(uuid, uuid, text, timestamptz, uuid, text) from public, anon;
grant execute on function public.reput_poser_rdv(uuid, uuid, text, timestamptz, uuid, text) to authenticated, service_role;

create or replace function public.reput_replanifier_rdv(p_rdv uuid, p_debut timestamptz, p_motif text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.reput_rdv;
  v_j jsonb;
begin
  select * into r from public.reput_rdv x where x.id = p_rdv for update;
  if r.id is null then
    raise exception 'Rendez-vous introuvable.' using errcode = 'P0002';
  end if;
  perform private.reput_tient_planning(r.client_id, r.entite_id);
  if r.statut <> 'confirme' then
    raise exception 'Seul un rendez-vous confirmé se replanifie.' using errcode = '22023';
  end if;
  v_j := private.reput_poser(r.client_id, r.entite_id, r.type_code, p_debut, r.demande_id, r.client_nom, r.canal, r.adresse, r.id);
  if (v_j ->> 'pose')::boolean then
    update public.reput_rdv x set statut = 'replanifie', motif = left(nullif(btrim(p_motif), ''), 500), maj_le = now() where x.id = r.id;
    perform private.journaliser_module(r.client_id, 'reput', 'reput.rdv_replanifie', 'reput_rdv', r.id::text,
      jsonb_build_object('nouveau', v_j ->> 'rdv', 'avant', r.debut, 'apres', p_debut, 'par', (select auth.uid())), r.entite_id);
  end if;
  return v_j;
end $function$;

revoke execute on function public.reput_replanifier_rdv(uuid, timestamptz, text) from public, anon;
grant execute on function public.reput_replanifier_rdv(uuid, timestamptz, text) to authenticated, service_role;

create or replace function public.reput_annuler_rdv(p_rdv uuid, p_motif text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare r public.reput_rdv;
begin
  select * into r from public.reput_rdv x where x.id = p_rdv for update;
  if r.id is null then
    raise exception 'Rendez-vous introuvable.' using errcode = 'P0002';
  end if;
  perform private.reput_tient_planning(r.client_id, r.entite_id);
  if r.statut <> 'confirme' then
    return jsonb_build_object('rdv', r.id, 'annule', false, 'statut', r.statut);
  end if;
  update public.reput_rdv x set statut = 'annule', motif = left(nullif(btrim(p_motif), ''), 500), maj_le = now() where x.id = r.id;
  perform private.journaliser_module(r.client_id, 'reput', 'reput.rdv_annule', 'reput_rdv', r.id::text,
    jsonb_build_object('debut', r.debut, 'par', (select auth.uid())), r.entite_id);
  return jsonb_build_object('rdv', r.id, 'annule', true);
end $function$;

revoke execute on function public.reput_annuler_rdv(uuid, text) from public, anon;
grant execute on function public.reput_annuler_rdv(uuid, text) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Le rappel
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.reput_rappeler_rdv(p_maintenant timestamptz default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  g public.reput_reglages;
  v_fz text;
  v_corps text;
  v_objet text;
  v_dv uuid;
  v_envoi uuid;
  n integer := 0;
begin
  for r in
    select x.*, t.libelle, coalesce(e.nom, c.nom) as lieu
    from public.reput_rdv x
    join public.reput_rdv_types t on t.client_id = x.client_id and t.code = x.type_code
    join public.clients c on c.id = x.client_id
    left join public.entites e on e.client_id = x.client_id and e.id = x.entite_id
    where x.statut = 'confirme' and x.rappel_envoi is null and x.rappel_le is not null and x.rappel_le <= p_maintenant
      and x.debut > p_maintenant and x.canal is not null
    order by x.rappel_le
    limit 200
  loop
    select * into g from public.reput_reglages rg
    where rg.client_id = r.client_id and (rg.entite_id = r.entite_id or rg.entite_id is null)
    order by (rg.entite_id is not null) desc limit 1;
    continue when g.id is null or not g.actif;
    v_fz := private.reput_fuseau(r.client_id, r.entite_id);
    v_corps := concat_ws(E'\n\n', nullif(btrim(g.formule_appel), ''),
      format('Nous vous rappelons votre rendez-vous « %s » le %s à %s (%s). Pour le déplacer ou l''annuler, il suffit de répondre à ce message.',
             r.libelle, to_char(r.debut at time zone v_fz, 'DD/MM/YYYY'), replace(to_char(r.debut at time zone v_fz, 'HH24:MI'), ':', ' h '),
             r.lieu),
      concat_ws(E'\n', nullif(btrim(g.formule_politesse), ''), nullif(btrim(g.signature), '')),
      nullif(btrim(g.mention_automatisee), ''));
    v_objet := case when r.canal = 'email' then left('Rappel : votre rendez-vous du ' || to_char(r.debut at time zone v_fz, 'DD/MM/YYYY'), 300) end;
    begin
      insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload,
                                              echeance, cle_idempotence)
      values (r.client_id, r.entite_id, 'reput', 'reput.rappel_rdv', 'reput_rdv', r.id::text,
              left('Rappel de rendez-vous à ' || coalesce(r.client_nom, r.adresse), 500),
              jsonb_build_object('rdv', r.id, 'canal', r.canal, 'objet', v_objet, 'corps', v_corps),
              r.debut, 'reput:rappel_rdv:' || r.id::text)
      returning id into v_dv;
      v_envoi := private.preparer_envoi(r.client_id, 'reput', 'reput_rdv', r.id::text, r.canal,
        jsonb_build_object('adresse', r.adresse, 'nom', r.client_nom, 'langue', 'fr', 'professionnel', false),
        null, '{}'::jsonb, v_objet, v_corps, null::uuid[], 'reput:rappel_rdv:' || r.id::text, r.entite_id,
        true, false, r.debut, jsonb_build_object('demande', v_dv));
      update public.reput_rdv x set rappel_envoi = v_envoi, maj_le = now() where x.id = r.id;
      perform private.journaliser_module(r.client_id, 'reput', 'reput.rdv_rappel_prepare', 'reput_rdv', r.id::text,
        jsonb_build_object('envoi', v_envoi, 'demande_validation', v_dv), r.entite_id);
      n := n + 1;
    exception when others then
      perform private.journaliser_module(r.client_id, 'reput', 'reput.rdv_rappel_echec', 'reput_rdv', r.id::text,
        jsonb_build_object('erreur', left(sqlerrm, 200)), r.entite_id);
    end;
  end loop;
  return n;
end $function$;

revoke execute on function private.reput_rappeler_rdv(timestamptz) from public, anon, authenticated;

-- La tâche : chaque quart d'heure ; rejouable.
select cron.schedule('reput-rdv-rappels', '*/15 * * * *', $cron$select private.reput_rappeler_rdv()$cron$);
