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
  role text not null check (role in ('gerant', 'valideur', 'collaborateur', 'admin')), perimetre_total boolean not null default false,
  primary key (user_id, client_id)
);
-- La création d'un client est journalisée (comme sur le socle)
create or replace function private.journaliser_client() returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
begin perform private.journaliser(new.id, 'client.cree', 'client', new.id::text, jsonb_build_object('nom', new.nom), null); return new; end $$;

create table public.delegations (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), de_user uuid not null, a_user uuid not null, jusqu_au timestamptz);

create or replace function private.mes_clients() returns setof uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select client_id from public.comptes where user_id = auth.uid()
$$;
-- (EXECUTE reste à PUBLIC comme sur le socle réel ; la migration a5_01 le reprend, lancer.sh l'applique après la maquette)

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
  hash_precedent bytea, hash bytea not null,
  constraint journal_opposable_hash_check check (octet_length(hash) = 32),
  constraint journal_opposable_acteur_type_check check (acteur_type in ('utilisateur', 'operateur', 'systeme')),
  constraint journal_opposable_action_check check (length(action) between 1 and 120),
  constraint journal_opposable_objet_type_check check (objet_type is null or length(objet_type) between 1 and 80)
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
create trigger t_journal_ajout_seul before update or delete on public.journal_opposable for each row execute function private.ajout_seul();
-- La porte d'écriture : calcule hash et hash_precedent sous verrou consultatif (comme sur le socle réel ; pas de déclencheur de calcul).
create or replace function private.journaliser(p_client uuid, p_action text, p_objet_type text, p_objet_id text, p_donnees jsonb, p_entite uuid) returns bigint
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare precedent bytea; v_id bigint; quand timestamptz := clock_timestamp(); acteur uuid := auth.uid();
begin
  perform pg_advisory_xact_lock(hashtext(p_client::text));
  select hash into precedent from public.journal_opposable where client_id = p_client order by id desc limit 1;
  insert into public.journal_opposable (client_id, entite_id, survenu_le, acteur_type, acteur_id, action, objet_type, objet_id, donnees, hash_precedent, hash)
  values (p_client, p_entite, quand, case when acteur is null then 'systeme' else 'utilisateur' end, acteur, p_action, p_objet_type, p_objet_id, p_donnees, precedent,
          extensions.digest(coalesce(precedent, '\x'::bytea) || convert_to(concat_ws('|', p_client, p_entite, quand, case when acteur is null then 'systeme' else 'utilisateur' end, acteur, null, p_action, p_objet_type, p_objet_id, coalesce(p_donnees::text, '')), 'utf8'), 'sha256'))
  returning id into v_id;
  return v_id;
end $$;

create trigger t_clients_journal after insert on public.clients for each row execute function private.journaliser_client();

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
create table public.effacements (client_efface uuid primary key, nom_client text not null, efface_le timestamptz not null default now(), par uuid, empreinte_export text not null constraint effacements_empreinte_export_check check (empreinte_export ~ '^[0-9a-f]{64}$'), lignes jsonb not null default '{}', comptes_orphelins int not null default 0, fichiers jsonb);
create table public.effacements_objets (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), objet_type text not null, objet_id text not null, efface_le timestamptz not null default now(), par uuid, lignes jsonb not null default '{}');
create table public.filed_historique (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), facture_id bigint, survenu_le timestamptz not null default now(), etape text not null check (etape ~ '^[a-z][a-z0-9_.]{1,59}$'), objet_type text not null check (objet_type ~ '^filed_[a-z_]{1,33}$'), message text not null check (length(message) between 1 and 500), acteur_type text not null check (acteur_type in ('utilisateur', 'operateur', 'systeme')), detail jsonb);
create table public.suivis (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), objet text not null);
create table public.suivis_evenements (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), suivi_id bigint not null references public.suivis(id), survenu_le timestamptz not null default now(), type text not null constraint suivis_evenements_type_check check (type = any (array['ouverture', 'promesse', 'glissement', 'relance', 'signe', 'cloture', 'expiration'])));
create table public.echeances_pro (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), libelle text not null, echeance date not null);
create table public.echeances_pro_journal (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), echeance_id bigint, survenu_le timestamptz not null default now(), action text not null);
do $$ declare t text; begin
  foreach t in array array['effacements', 'effacements_objets', 'filed_historique', 'suivis_evenements', 'echeances_pro_journal'] loop
    execute format('create trigger t_%s_ajout_seul before update or delete on public.%I for each row execute function private.ajout_seul()', t, t);
  end loop;
end $$;

-- Envois soumis à accord ---------------------------------------------------------
create table private.canaux_envoi (canal text primary key, libelle text not null, adresse text, sujet boolean default false, longueur_max int, pieces boolean default false, consentement_toujours boolean not null default false, permis_sante boolean not null default false, plages_non_transactionnel jsonb, note text);
insert into private.canaux_envoi (canal, libelle, consentement_toujours, plages_non_transactionnel, note) values
  ('email', 'Courriel', false, '{"jours": [1,2,3,4,5,6], "debut": "08:00", "fin": "20:00"}', 'Prospection B2C : opposition respectée'),
  ('whatsapp', 'WhatsApp', true, '{"jours": [1,2,3,4,5,6], "debut": "08:00", "fin": "20:00"}', null),
  ('lre', 'Lettre recommandée électronique', false, null, null),
  ('appel', 'Appel', true, '{"jours": [1,2,3,4,5], "debut": "10:00", "fin": "20:00"}', null),
  ('sms', 'SMS', true, '{"jours": [1,2,3,4,5,6], "debut": "08:00", "fin": "20:00"}', 'Jamais le dimanche ni les jours fériés'),
  ('telephone', 'Téléphone', true, '{"jours": [1,2,3,4,5], "debut": "10:00", "fin": "20:00", "pause": ["13:00", "14:00"]}', 'Démarchage : plages légales'),
  ('courrier', 'Courrier postal', false, null, null);
create table public.oppositions (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), type text not null check (type in ('prospect', 'client', 'contact')), canal text not null, adresse text not null, ref text, depuis timestamptz not null default now(), jusqu_au timestamptz, motif text, source text, par uuid);
create or replace function private.opposer(p_client uuid, p_type text, p_adresse text, p_canal text, p_ref text, p_jusqu_au timestamptz, p_motif text, p_source text, p_par uuid) returns bigint
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id bigint;
begin
  insert into public.oppositions (client_id, type, canal, adresse, ref, jusqu_au, motif, source, par) values (p_client, p_type, p_canal, lower(p_adresse), p_ref, p_jusqu_au, p_motif, p_source, p_par) returning id into v_id;
  return v_id;
end $$;
create table public.consentements (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), canal text not null, adresse text not null, donne_le timestamptz not null default now(), retire_le timestamptz);
create table public.envois (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id),
  canal text not null references private.canaux_envoi(canal), destinataire_adresse text not null,
  transactionnel boolean not null default true,
  echeance timestamptz, reprise_le timestamptz,
  statut text not null default 'a_envoyer', cree_le timestamptz not null default now()
);
create table public.envois_evenements (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), envoi_id uuid not null references public.envois(id), survenu_le timestamptz not null default now(), type text not null constraint envois_evenements_type_check check (type = any (array['remis', 'rebond_temporaire', 'rebond', 'plainte', 'refuse'])), detail jsonb);
create trigger t_envois_evenements_ajout_seul before update or delete on public.envois_evenements for each row execute function private.ajout_seul();

-- Les verrous : lus par la tâche d'envoi, pas un déclencheur d'insertion.
create or replace function private.verrous_envoi(p_e public.envois, p_complet boolean, p_instant timestamptz) returns jsonb
language plpgsql stable security definer set search_path = public, private, pg_temp as $$
declare verrous jsonb := '[]'::jsonb; plages jsonb; debut time; fin time; jours int[]; local_ts timestamptz;
begin
  if exists (select 1 from public.oppositions o where o.client_id = p_e.client_id and o.canal = p_e.canal and o.adresse = lower(p_e.destinataire_adresse) and coalesce(o.jusqu_au, 'infinity') > p_instant) then
    verrous := verrous || jsonb_build_object('verrou', 'opposition', 'detail', 'destinataire en opposition sur ce canal');
  end if;
  if not p_e.transactionnel then
    select plages_non_transactionnel into plages from private.canaux_envoi where canal = p_e.canal;
    if plages is not null then
      debut := (plages ->> 'debut')::time; fin := (plages ->> 'fin')::time;
      select array_agg(x::int) into jours from jsonb_array_elements_text(plages -> 'jours') x;
      local_ts := p_instant at time zone 'Europe/Paris';
      if not (extract(isodow from local_ts)::int = any(jours) and local_ts::time >= debut and local_ts::time < fin) then
        verrous := verrous || jsonb_build_object('verrou', 'hors_plage', 'detail', 'différé à la prochaine plage légale du canal ' || p_e.canal);
      end if;
    end if;
  end if;
  return jsonb_build_object('bloque', jsonb_array_length(verrous) > 0, 'verrous', verrous);
end $$;

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

-- Sources (c), (d), (e) de fonctions de private requises par authenticated :
-- (c) un déclencheur SECURITY INVOKER qui appelle une aide ; (d) une vue lisible qui appelle une aide ; (e) un DEFAULT qui appelle une aide.
create or replace function private.horodatage() returns timestamptz language sql stable as $$ select now() $$;
create or replace function private.ecrit_par_la_brique(p_client uuid) returns boolean language sql stable as $$ select p_client is not null $$;
create or replace function private.libelle_canal(p_canal text) returns text language sql stable security definer set search_path = private, pg_temp as $$ select libelle from private.canaux_envoi where canal = p_canal $$;
create or replace function private.verifier_brique() returns trigger language plpgsql as $$
begin if not private.ecrit_par_la_brique(new.client_id) then raise exception 'client requis'; end if; return new; end $$;
create table public.notes_internes (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), texte text not null, cree_le timestamptz not null default private.horodatage());
create trigger t_notes_brique before insert on public.notes_internes for each row execute function private.verifier_brique();
create view public.v_envois_libelles with (security_invoker = on) as select e.id, e.client_id, e.canal, private.libelle_canal(e.canal) as canal_libelle, e.statut from public.envois e;
grant select on public.v_envois_libelles to authenticated;

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


-- Gabarits communs : client_id null = gabarit global Omega, visible de tous les clients
create table public.gabarits_messages (id bigint generated always as identity primary key, client_id uuid references public.clients(id), canal text not null, nom text not null, corps text not null);

-- Table interne : RLS activée, aucune politique, aucun droit pour authenticated (cas voulu)
create table public.filed_compteurs (id bigint generated always as identity primary key, client_id uuid not null references public.clients(id), compteur int not null default 0);

-- Registre des locataires : toutes les tables publiques à client_id ------------------------
insert into private.tables_locataires (nom, ordre_effacement)
select c.table_name, row_number() over (order by c.table_name) from information_schema.columns c join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name where c.table_schema = 'public' and c.column_name = 'client_id' and t.table_type = 'BASE TABLE';
insert into private.tables_objets (nom, objet_type, colonne, ordre_effacement) values ('acces_objets', '*', 'objet_id', 1);

-- RLS et droits -----------------------------------------------------------------------
do $$ declare t text; begin
  for t in select nom from private.tables_locataires loop
    execute format('alter table public.%I enable row level security', t);
    if t = 'filed_compteurs' then continue; end if;
    if t = 'gabarits_messages' then
      execute 'create policy lecture_client on public.gabarits_messages for select to authenticated using (client_id is null or client_id in (select private.mes_clients()))';
      execute 'grant select on public.gabarits_messages to authenticated';
      continue;
    end if;
    execute format('create policy lecture_client on public.%I for select to authenticated using (client_id in (select private.mes_clients()))', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;
-- les pièces : droit par objet quand l'objet est restreint, sinon gérant/admin
drop policy lecture_client on public.pieces;
create policy lecture_piece on public.pieces for select to authenticated
  using (case when objet_id is not null then private.lit_objet(client_id, objet_type, objet_id)
              else exists (select 1 from public.comptes c where c.user_id = auth.uid() and c.client_id = pieces.client_id and c.role in ('gerant', 'admin')) end);
-- Le journal se lit par les gérants et admins seulement
drop policy lecture_client on public.journal_opposable;
create policy lecture_journal on public.journal_opposable for select to authenticated
  using (client_id in (select c.client_id from public.comptes c where c.user_id = auth.uid() and c.role in ('gerant', 'admin')));
alter table public.clients enable row level security;
create policy lecture_client on public.clients for select to authenticated using (id in (select private.mes_clients()));
grant select on public.clients to authenticated;
-- écritures permises aux membres, toujours chez eux
create policy ecriture_client on public.acces_objets for insert to authenticated with check (client_id in (select private.mes_clients()));
create policy ecriture_client on public.oppositions for insert to authenticated with check (client_id in (select private.mes_clients()));
create policy ecriture_client on public.envois for insert to authenticated with check (client_id in (select private.mes_clients()));
create policy ecriture_client on public.notes_internes for insert to authenticated with check (client_id in (select private.mes_clients()));
create policy ecriture_client on public.approbations for insert to authenticated
  with check (client_id in (select private.mes_clients()) and (approuve_par = auth.uid()
    or exists (select 1 from public.delegations d where d.client_id = approbations.client_id and d.de_user = approuve_par and d.a_user = auth.uid() and coalesce(d.jusqu_au, 'infinity') > now())));
grant insert on public.acces_objets, public.oppositions, public.envois, public.approbations, public.notes_internes to authenticated;
-- clés Tamila : la colonne de clé n'est jamais lisible par un client
revoke select on public.tamila_cles from authenticated;
grant select (id, client_id, dossier_id, cree_le) on public.tamila_cles to authenticated;
-- lecture seule des pièces de journal pour authenticated, écriture par les portes seulement
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
grant insert on public.acces_objets, public.oppositions, public.envois, public.approbations, public.notes_internes to authenticated;
-- les preuves d'effacement n'ont pas de client_id (le client n'existe plus) : RLS activée, lecture par personne côté client
alter table public.effacements enable row level security;
