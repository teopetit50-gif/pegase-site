-- b4_12 — Tamila : le temps proposé à la saisie, et le forfait consommé contre prévu (session B4, 06/10/2026, carnet
-- du coordinateur, n° 2 ; omega/AUDIT-PROMESSES.md § 2).
--
-- POURQUOI. Un avocat oublie de saisir le temps d'une audience ou d'un jeu de conclusions ; le temps non saisi n'est
-- jamais facturé. Le dossier sait pourtant ce qui s'est passé : une audience tenue, un acte déposé, un avis RPVA reçu.
-- L'écran les PROPOSE à la saisie (durée et nature pré-remplies, corrigeables) ; l'avocat saisit ou ignore. Et un
-- forfait se suit : temps passé contre temps prévu au forfait, taux horaire effectif.
--
-- CE QUE ÇA POSE.
--   · tamila_temps.origine (ajoutée si absente) : « audience:<id> », « acte:<id> », « avis:<id> » ; un même événement
--     ne se saisit qu'une fois par personne tant que le temps n'est pas annulé (index unique partiel).
--   · tamila_temps_ecartes : « ne plus me proposer ceci » (par personne, par dossier). Lue par son auteur seul ;
--     écrite par la porte. Effacée avec le dossier (tables_objets).
--   · tamila_conventions.minutes_prevues (ajoutée si absente) : le temps prévu au forfait, posé par qui gère.
--   · Portes : tamila_saisir_temps_propose (l'événement doit être du dossier ; passe par tamila_saisir_temps, mêmes
--     règles), tamila_ecarter_proposition, tamila_prevoir_forfait.
--
-- Rien n'est retiré, rien n'est effacé. Fonctions private : revoke from public ; grant authenticated, service_role.

alter table public.tamila_temps add column if not exists origine text;
do $c$
begin
  if not exists (select 1 from pg_constraint where conname = 'tamila_temps_origine_check') then
    alter table public.tamila_temps add constraint tamila_temps_origine_check
      check (origine is null or origine ~ '^(audience|acte|avis):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
  end if;
end $c$;
create unique index if not exists tamila_temps_origine_unique on public.tamila_temps (dossier_id, user_id, origine)
  where origine is not null and statut <> 'annule';
comment on column public.tamila_temps.origine is
  'Tamila (B4, b4_12) : l''événement du dossier dont ce temps a été proposé à la saisie (audience, acte déposé, avis reçu).';

alter table public.tamila_conventions add column if not exists minutes_prevues integer;
do $c$
begin
  if not exists (select 1 from pg_constraint where conname = 'tamila_conventions_minutes_prevues_check') then
    alter table public.tamila_conventions add constraint tamila_conventions_minutes_prevues_check
      check (minutes_prevues is null or minutes_prevues between 15 and 120000);
  end if;
end $c$;
comment on column public.tamila_conventions.minutes_prevues is
  'Tamila (B4, b4_12) : le temps prévu au forfait (minutes), pour suivre le forfait consommé ; posé par tamila_prevoir_forfait.';

create table if not exists public.tamila_temps_ecartes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  dossier_id uuid not null,
  user_id uuid not null,
  origine text not null,
  ecarte_le timestamptz not null default now(),
  constraint tamila_temps_ecartes_origine_check
    check (origine ~ '^(audience|acte|avis):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  constraint tamila_temps_ecartes_unique unique (dossier_id, user_id, origine)
);
comment on table public.tamila_temps_ecartes is
  'Tamila (B4, b4_12) : les propositions de temps qu''une personne a ignorées ; elles ne lui sont plus proposées.';

do $droits$
begin
  alter table public.tamila_temps_ecartes enable row level security;
  revoke all on table public.tamila_temps_ecartes from anon, authenticated, service_role;
  grant select on table public.tamila_temps_ecartes to authenticated;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tamila_temps_ecartes'
                   and policyname = 'chacun lit ce qu''il a ignoré') then
    create policy "chacun lit ce qu'il a ignoré" on public.tamila_temps_ecartes for select to authenticated
      using (user_id = (select auth.uid()) and private.tamila_voit_dossier_pour((select auth.uid()), client_id, (dossier_id)::text));
  end if;
end $droits$;

do $effacement$
begin
  if to_regclass('private.tables_objets') is not null then
    begin
      execute $q$insert into private.tables_objets (nom, objet_type, colonne) select 'tamila_temps_ecartes', 'tamila_dossier', 'dossier_id'
               where not exists (select 1 from private.tables_objets t where t.nom = 'tamila_temps_ecartes')$q$;
    exception when others then raise notice 'tables_objets : % (à inscrire à la main)', sqlerrm; end;
  end if;
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select 'tamila_temps_ecartes'
               where not exists (select 1 from private.tables_locataires t where t.nom = 'tamila_temps_ecartes')$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $effacement$;

-- L'événement cité est-il bien de ce dossier ?
create or replace function private.tamila_origine_du_dossier(p_dossier uuid, p_origine text)
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_genre text := split_part(p_origine, ':', 1);
  v_id uuid;
begin
  if p_origine is null or p_origine !~ '^(audience|acte|avis):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  v_id := split_part(p_origine, ':', 2)::uuid;
  if v_genre = 'audience' then
    return exists (select 1 from public.tamila_audiences a where a.id = v_id and a.dossier_id = p_dossier and a.statut <> 'annulee');
  elsif v_genre = 'acte' then
    return exists (select 1 from public.tamila_delais t where t.id = v_id and t.dossier_id = p_dossier and t.acte_depose_le is not null);
  else
    return exists (select 1 from public.tamila_avis v where v.id = v_id and v.dossier_id = p_dossier);
  end if;
end $function$;

create or replace function private.tamila_saisir_temps_propose(p_dossier uuid, p_origine text, p_jour date, p_minutes integer,
                                                               p_nature text, p_description bytea default null,
                                                               p_facturable boolean default true)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Le temps passé se saisit par la personne qui l''a passé.' using errcode = '42501';
  end if;
  perform private.tamila_dossier_ecrit(p_dossier, false);
  if not private.tamila_origine_du_dossier(p_dossier, p_origine) then
    raise exception 'Cet événement n''est pas de ce dossier.' using errcode = '22023';
  end if;
  if exists (select 1 from public.tamila_temps t where t.dossier_id = p_dossier and t.user_id = v_uid
               and t.origine = p_origine and t.statut <> 'annule') then
    raise exception 'Ce temps est déjà saisi.' using errcode = '55000';
  end if;
  v_id := private.tamila_saisir_temps(p_dossier, p_jour, p_minutes, p_nature, p_description, p_facturable);
  update public.tamila_temps set origine = p_origine where id = v_id;
  return v_id;
end $function$;

create or replace function private.tamila_ecarter_proposition(p_dossier uuid, p_origine text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
begin
  if v_uid is null then
    raise exception 'Une proposition s''ignore par la personne à qui elle est faite.' using errcode = '42501';
  end if;
  v_d := private.tamila_dossier_ecrit(p_dossier, false);
  if not private.tamila_origine_du_dossier(p_dossier, p_origine) then
    raise exception 'Cet événement n''est pas de ce dossier.' using errcode = '22023';
  end if;
  insert into public.tamila_temps_ecartes (client_id, dossier_id, user_id, origine)
  values (v_d.client_id, p_dossier, v_uid, p_origine)
  on conflict (dossier_id, user_id, origine) do nothing;
end $function$;

create or replace function private.tamila_prevoir_forfait(p_dossier uuid, p_minutes integer)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_c public.tamila_conventions;
begin
  perform private.tamila_honoraires_gere(p_dossier);
  select * into v_c from public.tamila_conventions where dossier_id = p_dossier and statut <> 'resiliee'
   order by cree_le desc limit 1 for update;
  if not found or v_c.mode = 'temps_passe' then
    raise exception 'Le temps prévu se pose sur une convention au forfait (ou mixte).' using errcode = '55000';
  end if;
  if p_minutes is not null and (p_minutes < 15 or p_minutes > 120000) then
    raise exception 'Un temps prévu de 15 minutes à 2 000 heures.' using errcode = '22023';
  end if;
  update public.tamila_conventions set minutes_prevues = p_minutes where id = v_c.id;
end $function$;

create or replace function public.tamila_saisir_temps_propose(p_dossier uuid, p_origine text, p_jour date, p_minutes integer,
                                                              p_nature text, p_description bytea default null,
                                                              p_facturable boolean default true) returns uuid
language sql set search_path to '' as $function$
  select private.tamila_saisir_temps_propose(p_dossier, p_origine, p_jour, p_minutes, p_nature, p_description, p_facturable) $function$;
create or replace function public.tamila_ecarter_proposition(p_dossier uuid, p_origine text) returns void
language sql set search_path to '' as $function$ select private.tamila_ecarter_proposition(p_dossier, p_origine) $function$;
create or replace function public.tamila_prevoir_forfait(p_dossier uuid, p_minutes integer) returns void
language sql set search_path to '' as $function$ select private.tamila_prevoir_forfait(p_dossier, p_minutes) $function$;

do $grants$
declare f text;
begin
  revoke execute on function private.tamila_origine_du_dossier(uuid, text) from public;
  foreach f in array array[
    'tamila_saisir_temps_propose(uuid, text, date, integer, text, bytea, boolean)',
    'tamila_ecarter_proposition(uuid, text)',
    'tamila_prevoir_forfait(uuid, integer)'] loop
    execute format('revoke execute on function private.%s from public', f);
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function private.%s to authenticated, service_role', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $grants$;
