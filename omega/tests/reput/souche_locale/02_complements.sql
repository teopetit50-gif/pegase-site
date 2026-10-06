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
  insert into cron.job (jobname, schedule, command) values (p_nom, p_quand, p_commande) on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command returning jobid $$;
create table if not exists public.reglages_envois (id uuid primary key default gen_random_uuid(), client_id uuid not null, module text,
  mode text not null default 'essai', essai_adresse text, canaux text[]);
-- Droits du socle sur la file (comme la recette) : authenticated décide en son nom, lit les demandes.
grant select, insert on public.approbations to authenticated;
grant select on public.demandes_validation to authenticated;

-- ── Accords permanents (public.politiques, lot 16) imités : proposer → demande politique.activer → active ──
create table if not exists public.politiques (
  id uuid primary key default gen_random_uuid(), client_id uuid not null, entite_id uuid, module text not null, type_action text not null,
  libelle text not null, plafond_operation numeric, plafond_mensuel numeric, nombre_mensuel integer, debut timestamptz not null default now(),
  fin timestamptz not null, fuseau text not null default 'Europe/Paris', statut text not null default 'a_valider'
  check (statut in ('a_valider', 'active', 'refusee', 'revoquee')), demande_id uuid, cree_par uuid, cree_le timestamptz not null default now(),
  active_le timestamptz, revoquee_le timestamptz, revoquee_par uuid, motif_revocation text,
  check (plafond_operation is not null or nombre_mensuel is not null));
grant select, insert on public.politiques to authenticated;
create or replace function private.souche_preparer_politique() returns trigger language plpgsql security definer set search_path to '' as $$
begin new.statut := 'a_valider'; new.cree_par := (select auth.uid()); new.cree_le := now(); return new; end $$;
create or replace function private.souche_deposer_activation() returns trigger language plpgsql security definer set search_path to '' as $$
declare v uuid;
begin
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, cle_idempotence)
  values (new.client_id, new.entite_id, new.module, 'politique.activer', 'politique', new.id::text, left('Activer : ' || new.libelle, 500), 'politique:' || new.id)
  returning id into v;
  update public.politiques set demande_id = v where id = new.id;
  return null;
end $$;
create or replace function private.souche_suivre_activation() returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.type_action = 'politique.activer' and new.statut = 'approuvee' and old.statut = 'en_attente' then
    update public.politiques set statut = 'active', active_le = now() where id = new.objet_id::uuid and statut = 'a_valider';
  end if;
  return null;
end $$;
create trigger politiques_preparer before insert on public.politiques for each row execute function private.souche_preparer_politique();
create trigger politiques_deposer_activation after insert on public.politiques for each row execute function private.souche_deposer_activation();
create trigger demandes_validation_suivre_activation after update of statut on public.demandes_validation for each row execute function private.souche_suivre_activation();
create or replace function private.politique_couvrante(p_client uuid, p_module text, p_type text, p_entite uuid, p_montant numeric, p_quand timestamptz)
returns uuid language sql stable security definer set search_path to '' as $$
  select p.id from public.politiques p
  where p.client_id = p_client and p.module = p_module and p.type_action = p_type and p.statut = 'active'
    and (p.entite_id is null or p.entite_id = p_entite) and p_quand >= p.debut and p_quand < p.fin
    and (p.nombre_mensuel is null or (select count(*) from public.demandes_validation d where d.politique_id = p.id) < p.nombre_mensuel)
  order by p.entite_id nulls last limit 1 $$;
create or replace function private.revoquer_politique(p_id uuid, p_motif text) returns void language sql security definer set search_path to '' as $$
  update public.politiques set statut = 'revoquee', revoquee_le = now(), revoquee_par = (select auth.uid()), motif_revocation = p_motif where id = p_id $$;
-- 19af imité : le gérant seul décideur approuve sa propre demande d'activation.
create or replace function private.preparer_approbation() returns trigger language plpgsql security definer set search_path to '' as $function$
declare v_d public.demandes_validation; v_uid uuid := (select auth.uid());
begin
  select * into v_d from public.demandes_validation where id = new.demande_id;
  if not found then raise exception 'Demande introuvable.' using errcode = 'P0002'; end if;
  if v_d.statut <> 'en_attente' then raise exception 'Cette demande n''attend plus de décision (%).', v_d.statut using errcode = '55000'; end if;
  new.user_id := coalesce(new.user_id, v_uid);
  if new.user_id is null then raise exception 'Une décision vient d''une personne.' using errcode = '42501'; end if;
  new.client_id := v_d.client_id;
  if v_d.demandeur_id is not null and v_d.demandeur_id = new.user_id then
    if not (v_d.type_action = 'politique.activer' and private.reput_seul_decideur(v_d.client_id, new.user_id)) then
      raise exception 'Le demandeur ne décide pas de sa propre demande.' using errcode = '42501';
    end if;
    new.commentaire := left('[seul décideur] ' || coalesce(new.commentaire, ''), 2000);
  end if;
  perform private.exiger_decideur(v_d, coalesce(new.au_nom_de, new.user_id));
  new.decide_le := now();
  return new;
end $function$;

-- ── Points du matin (lot 15) imités ──
create table if not exists public.points_sections (client_id uuid, module text, jour date, role text, titre text, items jsonb, ordre int,
  primary key (client_id, module, jour, role, titre));
create or replace function private.deposer_section(p_client uuid, p_module text, p_jour date, p_destinataire uuid, p_role text, p_titre text, p_items jsonb,
  p_entite uuid default null, p_equipe uuid default null, p_sante boolean default false, p_donnees_du timestamptz default null,
  p_incomplete boolean default false, p_ordre integer default 100) returns uuid language plpgsql security definer set search_path to '' as $$
begin
  insert into public.points_sections values (p_client, p_module, p_jour, p_role, p_titre, p_items, p_ordre)
  on conflict (client_id, module, jour, role, titre) do update set items = excluded.items;
  return gen_random_uuid();
end $$;
create or replace function private.retirer_section(p_client uuid, p_module text, p_jour date, p_destinataire uuid, p_role text, p_titre text,
  p_entite uuid, p_equipe uuid) returns void language sql security definer set search_path to '' as $$
  update public.points_sections set items = '[]' where client_id = p_client and module = p_module and jour = p_jour and role = p_role and titre = p_titre $$;
create or replace function private.battre_ouvrier(p_module text, p_genres text[], p_detail jsonb, p_attendu interval default '15 minutes')
returns integer language sql as $$ select 0 $$;
create or replace function private.echouer_travail(p_id bigint, p_err text, p_reprendre boolean) returns text language sql as $$
  update public.travaux set etat = 'echec', erreur = p_err where id = p_id returning 'echec' $$;

-- ── La remise par l'ouvrier d'envoi (lot 17) imitée : commencer (pret → en_cours), confirmer (en_cours → envoye) ──
create or replace function private.commencer_envoi(p_envoi uuid) returns jsonb language plpgsql security definer set search_path to '' as $$
declare e public.envois;
begin
  if (select auth.uid()) is not null then raise exception 'Réservé à l''ouvrier d''envoi (le serveur).' using errcode = '42501'; end if;
  update public.envois set statut = 'en_cours' where id = p_envoi and statut = 'pret' returning * into e;
  if e.id is null then return jsonb_build_object('envoyer', false, 'statut', (select x.statut from public.envois x where x.id = p_envoi)); end if;
  return jsonb_build_object('envoyer', true, 'mode', 'essai');
end $$;
create or replace function private.confirmer_envoi(p_envoi uuid, p_reference text default null) returns void language plpgsql security definer set search_path to '' as $$
begin
  update public.envois set statut = 'envoye', envoye_le = now() where id = p_envoi and statut = 'en_cours';
  if not found then raise exception 'Envoi introuvable, ou pas en cours d''envoi.' using errcode = 'P0002'; end if;
end $$;
