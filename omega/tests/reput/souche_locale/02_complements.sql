-- 02_complements.sql — SOUCHE LOCALE : ce que REPUT appelle du socle et que la souche de B4 n'a pas.
-- Comportements IMITÉS (pas copiés) à partir de omega/SOCLE-EXTRAITS-COMMUN.sql. Jamais sur la recette.
alter table public.comptes_entites add column if not exists cree_le timestamptz default now();
-- journaliser_module à sept arguments (l'entité), comme le socle.
create or replace function private.journaliser_module(p_client uuid, p_module text, p_action text, p_objet_type text, p_objet_id text,
                                                      p_donnees jsonb, p_entite uuid) returns bigint
language plpgsql security definer set search_path to '' as $$
declare v_avant text := current_setting('omega.module', true); v_id bigint;
begin
  if p_action !~ ('^' || p_module || '\.[a-z][a-z0-9_.]{1,79}$') then
    raise exception 'Une action de module commence par son nom : « %.… ».', p_module using errcode = '22023';
  end if;
  perform set_config('omega.module', p_module, true);
  v_id := private.journaliser(p_client, p_action, p_objet_type, p_objet_id, coalesce(p_donnees, '{}'::jsonb), p_entite);
  perform set_config('omega.module', coalesce(v_avant, ''), true);
  return v_id;
end $$;

-- ── Réceptions (A2, lot 18) ──
create table if not exists public.receptions (
  id bigserial primary key, client_id uuid not null references public.clients(id) on delete cascade, entite_id uuid, module text,
  canal text not null check (canal in ('email', 'whatsapp', 'sms', 'formulaire')), boite text not null, identifiant_externe text not null,
  de_adresse text, de_empreinte text, de_nom text, sujet text, corps text, corps_html text, pieces jsonb not null default '[]',
  detail jsonb not null default '{}', en_reponse_a uuid, fil text, langue text,
  statut text not null default 'nouvelle' check (statut in ('nouvelle', 'lue', 'traitee', 'ignoree', 'indesirable')),
  traite_par uuid, recu_le timestamptz not null default now(), cree_le timestamptz not null default now(), maj_le timestamptz not null default now(),
  unique (client_id, canal, identifiant_externe));

-- ── Envois (lot 17), réduits à ce que REPUT lit ; préparation imitée : a_valider, validé si la décision l'est ──
create table if not exists public.envois (
  id uuid primary key default gen_random_uuid(), client_id uuid not null, entite_id uuid, module text not null, objet_type text, objet_id text,
  canal text not null check (canal in ('email', 'whatsapp', 'sms', 'lre', 'appel')), destinataire_adresse text, destinataire_nom text,
  destinataire_langue text not null default 'fr', sujet text, corps text not null, transactionnel boolean not null, donnees_sante boolean not null,
  demande_id uuid references public.demandes_validation(id) on delete set null, adossee boolean not null default false, mode text not null default 'essai',
  statut text not null default 'a_valider', verrou text, motif text, echeance timestamptz not null default now() + interval '7 days',
  cle_idempotence text not null, envoye_le timestamptz, cree_le timestamptz not null default now(), unique (client_id, cle_idempotence));
create table if not exists private.souche_verrous (adresse text primary key, code text not null, motif text);

create or replace function private.preparer_envoi(p_client uuid, p_module text, p_objet_type text, p_objet_id text, p_canal text, p_destinataire jsonb,
  p_gabarit text default null, p_variables jsonb default '{}', p_sujet text default null, p_corps text default null, p_pieces uuid[] default null,
  p_cle_idempotence text default null, p_entite uuid default null, p_transactionnel boolean default false, p_donnees_sante boolean default false,
  p_echeance timestamptz default null, p_options jsonb default '{}') returns uuid
language plpgsql security definer set search_path to '' as $$
declare v_id uuid; v_d public.demandes_validation; v_v private.souche_verrous;
begin
  select e.id into v_id from public.envois e where e.client_id = p_client and e.cle_idempotence = p_cle_idempotence;
  if v_id is not null then return v_id; end if;
  if p_canal = 'email' and p_sujet is null then raise exception 'Un envoi par courriel porte un sujet.' using errcode = '22023'; end if;
  if p_canal <> 'email' and p_sujet is not null then raise exception 'Un envoi par % n''a pas de sujet.', p_canal using errcode = '22023'; end if;
  if p_canal = 'sms' and char_length(p_corps) > 640 then raise exception 'Message trop long pour le canal SMS.' using errcode = '22023'; end if;
  select * into v_d from public.demandes_validation d where d.id = (p_options ->> 'demande')::uuid;
  if v_d.id is null or v_d.module <> p_module or v_d.objet_type is distinct from p_objet_type or v_d.objet_id is distinct from p_objet_id then
    raise exception 'Cette décision ne porte pas sur cet envoi : même module, même objet.' using errcode = '22023';
  end if;
  insert into public.envois (client_id, entite_id, module, objet_type, objet_id, canal, destinataire_adresse, destinataire_nom, destinataire_langue,
    sujet, corps, transactionnel, donnees_sante, demande_id, adossee, cle_idempotence)
  values (p_client, p_entite, p_module, p_objet_type, p_objet_id, p_canal, p_destinataire ->> 'adresse', p_destinataire ->> 'nom',
    coalesce(p_destinataire ->> 'langue', 'fr'), p_sujet, p_corps, p_transactionnel, p_donnees_sante, v_d.id, true, p_cle_idempotence)
  returning id into v_id;
  select * into v_v from private.souche_verrous s where s.adresse = p_destinataire ->> 'adresse';
  if v_v.code is not null then
    update public.envois set statut = 'bloque', verrou = v_v.code, motif = v_v.motif where id = v_id;
  elsif v_d.statut = 'approuvee' then
    update public.envois set statut = 'pret' where id = v_id;
  end if;
  return v_id;
end $$;
create or replace function private.souche_suivre_demande() returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.statut = 'approuvee' then update public.envois set statut = 'pret' where demande_id = new.id and statut = 'a_valider';
  elsif new.statut in ('rejetee', 'expiree', 'annulee') then update public.envois set statut = 'annule' where demande_id = new.id and statut = 'a_valider'; end if;
  return null;
end $$;
drop trigger if exists demandes_validation_envois on public.demandes_validation;
create trigger demandes_validation_envois after update of statut on public.demandes_validation for each row execute function private.souche_suivre_demande();

-- ── pg_cron imité ──
create schema if not exists cron;
create table if not exists cron.job (jobid bigserial primary key, jobname text unique, schedule text, command text);
create or replace function cron.schedule(p_nom text, p_quand text, p_commande text) returns bigint language sql as $$
  insert into cron.job (jobname, schedule, command) values (p_nom, p_quand, p_commande) on conflict (jobname) do update set schedule = excluded.schedule returning jobid $$;
create table if not exists public.reglages_envois (id uuid primary key default gen_random_uuid(), client_id uuid not null, module text,
  mode text not null default 'essai', essai_adresse text, canaux text[]);
-- Droits du socle sur la file (comme la recette) : authenticated décide en son nom, lit les demandes.
grant select, insert on public.approbations to authenticated;
grant select on public.demandes_validation to authenticated;
