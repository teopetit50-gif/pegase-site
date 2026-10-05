-- Maquette locale du socle Omega, pour faire tourner les tests pgTAP sans la recette.
-- Elle reproduit les RÈGLES décrites par le coordinateur (RLS par client_id, journal chaîné en ajout seul,
-- verrous d'envoi, droits par objet, preuves d'effacement, sauvegardes), pas le schéma exact de la production.
-- Elle ne doit JAMAIS être posée sur un projet Supabase : lancer.sh la charge dans un cluster jetable.

-- Rôles Supabase ------------------------------------------------------------
do $$ declare r text; begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if not exists (select 1 from pg_roles where rolname = r) then execute format('create role %I nologin', r); end if;
  end loop;
end $$;
create extension if not exists pgcrypto with schema extensions;

-- Simulacre de GoTrue : auth.users et auth.uid() ------------------------------
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key, instance_id uuid, aud text, role text, email text, encrypted_password text,
  email_confirmed_at timestamptz, created_at timestamptz, updated_at timestamptz,
  raw_app_meta_data jsonb, raw_user_meta_data jsonb, is_sso_user boolean default false, is_anonymous boolean default false
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(current_setting('request.jwt.claim.sub', true), current_setting('request.jwt.claims', true)::jsonb ->> 'sub'), '')::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select nullif(coalesce(current_setting('request.jwt.claim.role', true), current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '')
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid(), auth.role() to anon, authenticated;

-- Schémas ---------------------------------------------------------------------
create schema if not exists private;
grant usage on schema public to anon, authenticated;
grant usage on schema extensions to anon, authenticated; -- comme sur Supabase
grant usage on schema private to authenticated; -- requis par les politiques qui appellent private.mes_clients()

-- Clients, comptes, entités ----------------------------------------------------
create table public.clients (id uuid primary key default gen_random_uuid(), nom text not null, cree_le timestamptz not null default now());
create table public.entites (id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id), nom text not null);
create table public.comptes (
  user_id uuid not null, client_id uuid not null references public.clients(id),
  role text not null check (role in ('membre', 'gerant', 'admin')), perimetre_total boolean not null default false,
  primary key (user_id, client_id)
);
create table public.delegations (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), de_user uuid not null, a_user uuid not null, jusqu_au timestamptz);

create or replace function private.mes_clients() returns setof uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select client_id from public.comptes where user_id = auth.uid()
$$;
grant execute on function private.mes_clients() to authenticated;

-- Registre des tables locataires -----------------------------------------------
create table private.tables_locataires (nom text primary key, ordre_effacement smallint not null, note text);
create table private.tables_objets (nom text primary key, objet_type text not null, colonne text not null, ordre_effacement smallint not null);

-- Journal opposable chaîné ------------------------------------------------------
create table public.journal_opposable (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.clients(id), entite_id uuid,
  survenu_le timestamptz not null default now(),
  acteur_type text not null, acteur_id uuid, acteur_libelle text,
  action text not null, objet_type text, objet_id text, donnees jsonb,
  hash_precedent bytea, hash bytea not null
);
create or replace function private.journal_chainer() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare precedent bytea;
begin
  select hash into precedent from public.journal_opposable where client_id = new.client_id order by id desc limit 1 for update;
  new.hash_precedent := precedent;
  new.survenu_le := coalesce(new.survenu_le, now());
  new.hash := extensions.digest(coalesce(precedent, '\x'::bytea) || convert_to(
    concat_ws('|', new.client_id, new.entite_id, new.survenu_le, new.acteur_type, new.acteur_id, new.acteur_libelle, new.action, new.objet_type, new.objet_id, coalesce(new.donnees::text, '')), 'utf8'), 'sha256');
  return new;
end $$;
create or replace function private.ajout_seul() returns trigger language plpgsql as $$
begin
  raise exception 'Table % en ajout seul : % interdit', tg_table_name, tg_op using errcode = 'P0001';
end $$;
create trigger t_journal_chainer before insert on public.journal_opposable for each row execute function private.journal_chainer();
create trigger t_journal_ajout_seul before update or delete on public.journal_opposable for each row execute function private.ajout_seul();

create or replace function public.verifier_journal_client(p_client uuid) returns table(ok boolean, lignes bigint, premiere_rupture bigint)
language plpgsql stable security definer set search_path = public, extensions, pg_temp as $$
declare r record; precedent bytea := null; attendu bytea; n bigint := 0; rupture bigint := null;
begin
  if not (p_client in (select private.mes_clients()) or current_setting('role', true) not in ('authenticated', 'anon')) then
    raise exception 'Client non accessible' using errcode = '42501';
  end if;
  for r in select * from public.journal_opposable where client_id = p_client order by id loop
    n := n + 1;
    attendu := extensions.digest(coalesce(precedent, '\x'::bytea) || convert_to(
      concat_ws('|', r.client_id, r.entite_id, r.survenu_le, r.acteur_type, r.acteur_id, r.acteur_libelle, r.action, r.objet_type, r.objet_id, coalesce(r.donnees::text, '')), 'utf8'), 'sha256');
    if r.hash_precedent is distinct from precedent or r.hash <> attendu then rupture := coalesce(rupture, r.id); end if;
    precedent := r.hash;
  end loop;
  return query select rupture is null, n, rupture;
end $$;
grant execute on function public.verifier_journal_client(uuid) to authenticated;

-- Autres tables en ajout seul ----------------------------------------------------
create table public.envois_evenements (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), envoi_id bigint, survenu_le timestamptz not null default now(), evenement text not null, detail jsonb);
create table public.effacements (client_efface uuid primary key, nom_client text not null, efface_le timestamptz not null default now(), par uuid, empreinte_export text, lignes jsonb not null default '{}', comptes_orphelins int not null default 0, fichiers jsonb);
create table public.effacements_objets (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), objet_type text not null, objet_id text not null, efface_le timestamptz not null default now(), par uuid, lignes jsonb not null default '{}');
create table public.filed_historique (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), facture_id bigint, survenu_le timestamptz not null default now(), etat text not null, detail jsonb);
create table public.suivis (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), objet text not null);
create table public.suivis_evenements (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), suivi_id bigint, survenu_le timestamptz not null default now(), evenement text not null);
create table public.echeances_pro (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), libelle text not null, echeance date not null);
create table public.echeances_pro_journal (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), echeance_id bigint, survenu_le timestamptz not null default now(), action text not null);
do $$ declare t text; begin
  foreach t in array array['envois_evenements', 'effacements', 'effacements_objets', 'filed_historique', 'suivis_evenements', 'echeances_pro_journal'] loop
    execute format('create trigger t_%s_ajout_seul before update or delete on public.%I for each row execute function private.ajout_seul()', t, t);
  end loop;
end $$;

-- Envois soumis à accord ---------------------------------------------------------
create table private.canaux_envoi (canal text primary key, libelle text not null, adresse text, sujet boolean default false, longueur_max int, pieces boolean default false, consentement_toujours boolean not null default false, permis_sante boolean not null default false, plages_non_transactionnel jsonb, note text);
insert into private.canaux_envoi (canal, libelle, consentement_toujours, plages_non_transactionnel, note) values
  ('courriel', 'Courriel', false, '{"jours": [1,2,3,4,5,6], "debut": "08:00", "fin": "20:00"}', 'Prospection B2C : opposition respectée'),
  ('sms', 'SMS', true, '{"jours": [1,2,3,4,5,6], "debut": "08:00", "fin": "20:00"}', 'Jamais le dimanche ni les jours fériés'),
  ('telephone', 'Téléphone', true, '{"jours": [1,2,3,4,5], "debut": "10:00", "fin": "20:00", "pause": ["13:00", "14:00"]}', 'Démarchage : plages légales'),
  ('courrier', 'Courrier postal', false, null, null);
create table public.oppositions (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), canal text not null, adresse text not null, depuis timestamptz not null default now(), motif text);
create table public.consentements (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), canal text not null, adresse text not null, donne_le timestamptz not null default now(), retire_le timestamptz);
create table public.envois (
  id bigint generated always as identity primary key, client_id uuid not null references public.clients(id),
  canal text not null references private.canaux_envoi(canal), adresse text not null,
  nature text not null default 'transactionnel' check (nature in ('transactionnel', 'prospection', 'information')),
  prevu_le timestamptz not null default now(), differe_a timestamptz,
  statut text not null default 'a_envoyer', cree_le timestamptz not null default now()
);
create or replace function private.envois_verrous() returns trigger
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare plages jsonb; debut time; fin time; jours int[]; local_ts timestamptz; d date; prochain timestamptz;
begin
  if exists (select 1 from public.oppositions o where o.client_id = new.client_id and o.canal = new.canal and lower(o.adresse) = lower(new.adresse)) then
    raise exception 'Envoi refusé : % est en opposition sur le canal %', new.adresse, new.canal using errcode = 'P0001';
  end if;
  if new.nature <> 'transactionnel' then
    select plages_non_transactionnel into plages from private.canaux_envoi where canal = new.canal;
    if plages is not null then
      debut := (plages ->> 'debut')::time; fin := (plages ->> 'fin')::time;
      select array_agg(x::int) into jours from jsonb_array_elements_text(plages -> 'jours') x;
      local_ts := new.prevu_le at time zone 'Europe/Paris';
      if not (extract(isodow from local_ts)::int = any(jours) and local_ts::time >= debut and local_ts::time < fin) then
        d := local_ts::date;
        loop
          if local_ts::time >= fin or not (extract(isodow from local_ts)::int = any(jours)) then d := d + 1; end if;
          exit when extract(isodow from d)::int = any(jours);
          d := d + 1;
        end loop;
        prochain := (d + debut) at time zone 'Europe/Paris';
        if prochain <= new.prevu_le then prochain := ((d + 1) + debut) at time zone 'Europe/Paris'; end if;
        new.statut := 'differe'; new.differe_a := prochain;
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger t_envois_verrous before insert on public.envois for each row execute function private.envois_verrous();

-- Droits par objet -----------------------------------------------------------------
create table public.objets_restreints (client_id uuid not null references public.clients(id), objet_type text not null, primary key (client_id, objet_type));
create table public.acces_objets (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), objet_type text not null, objet_id uuid not null, user_id uuid, equipe_id uuid, niveau text not null default 'lecture');
create table private.gardiens_objets (client_id uuid not null, objet_type text not null, user_id uuid not null, primary key (client_id, objet_type, user_id));
create or replace function private.lit_objet(p_client uuid, p_type text, p_objet uuid) returns boolean
language sql stable security definer set search_path = public, private, pg_temp as $$
  select exists (select 1 from public.comptes c where c.user_id = auth.uid() and c.client_id = p_client)
     and (not exists (select 1 from public.objets_restreints r where r.client_id = p_client and r.objet_type = p_type)
          or exists (select 1 from public.acces_objets a where a.client_id = p_client and a.objet_type = p_type and a.objet_id = p_objet and a.user_id = auth.uid())
          or exists (select 1 from private.gardiens_objets g where g.client_id = p_client and g.objet_type = p_type and g.user_id = auth.uid()))
$$;
grant execute on function private.lit_objet(uuid, text, uuid) to authenticated;

-- Pièces : lisibles par lit_objet() (droits par objet) ------------------------------------
create table public.pieces (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), objet_type text, objet_id uuid, nom text not null, cree_le timestamptz not null default now());

-- Approbations (au nom de soi, ou par délégation) -------------------------------------
create table public.approbations (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), objet_type text not null default 'decision', objet_id text, approuve_par uuid not null, cree_le timestamptz not null default now());

-- Chiffrement par dossier (Tamila) ----------------------------------------------------
create table public.tamila_cles (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), dossier_id uuid not null, cle_chiffree bytea not null, cree_le timestamptz not null default now());

-- Alertes ---------------------------------------------------------------------------
create table public.alertes (id bigint generated always as identity primary key, client_id uuid references public.clients(id), interne boolean not null default false, niveau text not null, source text not null, titre text not null, detail jsonb, cle_regroupement text, cree_le timestamptz not null default now(), acquittee_le timestamptz, acquittee_par uuid, envoyee_le timestamptz, destinataire_id uuid);
create or replace function private.lever_alerte(p_client uuid, p_interne boolean, p_niveau text, p_source text, p_titre text, p_detail jsonb, p_cle text) returns bigint
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id bigint;
begin
  select id into v_id from public.alertes where cle_regroupement = p_cle and acquittee_le is null and client_id is not distinct from p_client limit 1;
  if v_id is not null then return v_id; end if;
  insert into public.alertes (client_id, interne, niveau, source, titre, detail, cle_regroupement) values (p_client, p_interne, p_niveau, p_source, p_titre, p_detail, p_cle) returning id into v_id;
  return v_id;
end $$;

-- Sauvegardes ---------------------------------------------------------------------
create table private.sauvegardes (
  id bigint generated always as identity primary key, faite_le timestamptz not null, octets bigint not null check (octets > 0),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'), restauration text not null check (restauration in ('reussie', 'echouee')),
  detail jsonb not null default '{}', execution text
);
create or replace function private.verifier_sauvegardes() returns void
language plpgsql security definer set search_path = public, private, pg_temp as $$
begin
  if exists (select 1 from private.sauvegardes where restauration = 'reussie' and faite_le > now() - interval '26 hours') then
    update public.alertes set acquittee_le = now() where cle_regroupement = 'sauvegarde:manquante' and acquittee_le is null;
  else
    perform private.lever_alerte(null, true, 'critique', 'sauvegarde', 'Aucune sauvegarde restaurée avec succès depuis 26 heures',
      jsonb_build_object('derniere_reussie', (select max(faite_le) from private.sauvegardes where restauration = 'reussie'),
                         'derniere_tentative', (select max(faite_le) from private.sauvegardes),
                         'que_faire', 'Voir la tâche GitHub « Sauvegarde de la base » et ses secrets SUPABASE_DB_URL et SAUVEGARDE_PHRASE.'), 'sauvegarde:manquante');
  end if;
end $$;

-- Export / effacement prouvés (portes) -------------------------------------------------
create or replace function public.exporter_client(p_client uuid) returns jsonb language sql stable security definer set search_path = public, pg_temp as $$ select jsonb_build_object('client', p_client) $$;
create or replace function private.effacer_client(p_client uuid, p_par uuid) returns void language plpgsql security definer set search_path = public, private, pg_temp as $$ begin null; end $$;
grant execute on function public.exporter_client(uuid) to authenticated;

-- Hygiène des fonctions : rien n'est exécutable par défaut dans private, sauf ce que les politiques utilisent.
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.mes_clients() to authenticated;
grant execute on function private.lit_objet(uuid, text, uuid) to authenticated;

-- Registre des locataires : toutes les tables publiques à client_id ------------------------
insert into private.tables_locataires (nom, ordre_effacement)
select table_name, row_number() over (order by table_name) from information_schema.columns where table_schema = 'public' and column_name = 'client_id';
insert into private.tables_objets (nom, objet_type, colonne, ordre_effacement) values ('acces_objets', '*', 'objet_id', 1);

-- RLS et droits -----------------------------------------------------------------------
do $$ declare t text; begin
  for t in select nom from private.tables_locataires loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy lecture_client on public.%I for select to authenticated using (client_id in (select private.mes_clients()))', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;
-- les pièces : droit par objet quand l'objet est restreint, sinon gérant/admin
drop policy lecture_client on public.pieces;
create policy lecture_piece on public.pieces for select to authenticated
  using (case when objet_id is not null then private.lit_objet(client_id, objet_type, objet_id)
              else exists (select 1 from public.comptes c where c.user_id = auth.uid() and c.client_id = pieces.client_id and c.role in ('gerant', 'admin')) end);
alter table public.clients enable row level security;
create policy lecture_client on public.clients for select to authenticated using (id in (select private.mes_clients()));
grant select on public.clients to authenticated;
-- écritures permises aux membres, toujours chez eux
create policy ecriture_client on public.acces_objets for insert to authenticated with check (client_id in (select private.mes_clients()));
create policy ecriture_client on public.oppositions for insert to authenticated with check (client_id in (select private.mes_clients()));
create policy ecriture_client on public.envois for insert to authenticated with check (client_id in (select private.mes_clients()));
create policy ecriture_client on public.approbations for insert to authenticated
  with check (client_id in (select private.mes_clients()) and (approuve_par = auth.uid()
    or exists (select 1 from public.delegations d where d.client_id = approbations.client_id and d.de_user = approuve_par and d.a_user = auth.uid() and coalesce(d.jusqu_au, 'infinity') > now())));
grant insert on public.acces_objets, public.oppositions, public.envois, public.approbations to authenticated;
-- clés Tamila : la colonne de clé n'est jamais lisible par un client
revoke select on public.tamila_cles from authenticated;
grant select (id, client_id, dossier_id, cree_le) on public.tamila_cles to authenticated;
-- lecture seule des pièces de journal pour authenticated, écriture par les portes seulement
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
grant insert on public.acces_objets, public.oppositions, public.envois, public.approbations to authenticated;
