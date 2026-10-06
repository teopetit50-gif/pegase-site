-- 01_socle.sql — SOUCHE LOCALE du socle Omega pour jouer les tests Tamila (session B4) sur un
-- PostgreSQL 16 local, sans toucher à la recette. Reprend la souche d'A4 (omega/tests/filed/
-- souche_locale, branche worker-a4) : rôles, auth.uid(), tables communes, moteur de validation ;
-- y ajoute ce que Tamila appelle : B5 (délais, règles, territoires, prorogation), lectures tracées,
-- journal par module, traçage des tables, effacement, coffre. Comportements IMITÉS, pas copiés.
-- Ne jamais exécuter sur la recette ni sur la production.

create schema if not exists private; create schema if not exists extensions; create schema if not exists auth; create schema if not exists storage;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public, private, extensions, auth, storage to anon, authenticated, service_role;
create or replace function extensions.digest(bytea, text) returns bytea language sql immutable as $$ select public.digest($1, $2) $$;
create or replace function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub')::uuid $$;
create table auth.users (id uuid primary key, email text, instance_id uuid, aud text, role text, encrypted_password text, email_confirmed_at timestamptz, created_at timestamptz, updated_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb, is_sso_user boolean, is_anonymous boolean);

-- ── Tables du socle ──
create table public.clients (id uuid primary key default gen_random_uuid(), nom text not null, statut text default 'prospect', profil text default 'generique', siren text, config jsonb default '{}');
create table public.entites (id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete cascade, nom text not null, type text default 'societe', principale boolean default false, fuseau text default 'Europe/Paris', siren text, territoire text, unique (client_id, id));
create unique index entites_une_principale_idx on public.entites (client_id) where principale;
create function private.stub_entite_principale() returns trigger language plpgsql as $$ begin insert into public.entites (client_id, nom, principale) values (new.id, new.nom, true); return new; end $$;
create trigger clients_entite_principale after insert on public.clients for each row execute function private.stub_entite_principale();
create table public.comptes (id uuid primary key default gen_random_uuid(), user_id uuid not null, client_id uuid not null references public.clients(id) on delete cascade, role text not null default 'gerant' check (role in ('gerant', 'admin', 'valideur', 'collaborateur', 'lecteur')), perimetre_total boolean default true, unique (user_id, client_id));
create table public.comptes_entites (user_id uuid, client_id uuid, entite_id uuid);
create table public.equipes (id uuid primary key default gen_random_uuid(), client_id uuid not null, nom text not null);
create table public.equipes_membres (equipe_id uuid, user_id uuid);
create table public.pieces (id uuid primary key default gen_random_uuid(), client_id uuid not null, module text not null, source text not null check (source in ('depot', 'courriel', 'connecteur', 'export', 'api')), nom_fichier text not null, mime text not null, octets bigint not null, sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'), chemin text not null, objet_type text, objet_id text, statut text not null default 'recue' check (statut in ('a_rattacher', 'recue', 'en_lecture', 'lue', 'a_verifier', 'a_classer', 'rejetee', 'echec', 'effacee')), chiffrement text check (chiffrement is null or chiffrement in ('dossier:v1')), type_piece text, nb_pages int, piece_mere_id uuid, recue_le timestamptz default now());
create table public.journal_opposable (id bigserial primary key, client_id uuid not null, entite_id uuid, survenu_le timestamptz not null default now(), acteur_type text not null default 'systeme', acteur_id uuid, acteur_libelle text, action text not null, objet_type text not null, objet_id text not null, donnees jsonb not null default '{}', hash_precedent bytea, hash bytea);
create table public.audit_journal (id bigserial primary key, client_id uuid, table_name text, op text, ligne jsonb, survenu_le timestamptz default now());
create table public.alertes (id uuid primary key default gen_random_uuid(), client_id uuid, interne boolean not null default false, niveau text not null check (niveau in ('info', 'attention', 'critique')), source text not null, titre text not null check (char_length(titre) between 1 and 200), detail jsonb default '{}', cle_regroupement text, destinataire uuid, cree_le timestamptz default now(), close_le timestamptz, acquittee_le timestamptz);
create unique index alertes_ouvertes on public.alertes (coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid), cle_regroupement) where close_le is null;
create table public.regles_validation (id uuid primary key default gen_random_uuid(), client_id uuid not null, entite_id uuid, module text not null, montant_min numeric not null default 0 check (montant_min >= 0), montant_max numeric check (montant_max is null or montant_max > montant_min), approbations_requises smallint not null default 1 check (approbations_requises between 1 and 3), roles_autorises text[] not null default array['gerant', 'admin', 'valideur'] check (roles_autorises <@ array['gerant', 'admin', 'valideur'] and cardinality(roles_autorises) >= 1), actif boolean not null default true, cree_le timestamptz default now(), type_action text check (type_action is null or char_length(type_action) between 1 and 80), equipe_id uuid, exige_commentaire boolean default false, exige_piece boolean default false, exige_motif boolean default false);
create table public.demandes_validation (id uuid primary key default gen_random_uuid(), client_id uuid not null, entite_id uuid, module text not null check (module ~ '^[a-z][a-z_]{1,29}$'), type_action text not null check (char_length(type_action) between 1 and 80), objet_type text not null, objet_id text not null, resume text not null check (char_length(resume) between 1 and 500), montant numeric check (montant is null or montant >= 0), devise char(3) default 'EUR', payload jsonb not null default '{}', demandeur_type text, demandeur_id uuid, statut text not null default 'en_attente' check (statut in ('en_attente', 'approuvee', 'rejetee', 'annulee', 'expiree', 'executee', 'echec_execution')), approbations_requises smallint, roles_autorises text[], regle_id uuid, echeance timestamptz, cle_idempotence text not null, cree_le timestamptz default now(), decide_le timestamptz, execute_le timestamptz, motif_echec text, equipe_id uuid, politique_id uuid, exige_commentaire boolean, exige_piece boolean, exige_motif boolean, unique (client_id, cle_idempotence));
create table public.approbations (id uuid primary key default gen_random_uuid(), demande_id uuid not null references public.demandes_validation(id), client_id uuid, user_id uuid, au_nom_de uuid, delegation_id uuid, decision text not null check (decision in ('approuve', 'rejete')), commentaire text check (commentaire is null or char_length(commentaire) <= 2000), piece_id uuid, decide_le timestamptz default now(), cree_le timestamptz default now(), unique (demande_id, user_id));
create table public.delegations (id uuid primary key default gen_random_uuid(), client_id uuid not null, delegant uuid not null, delegataire uuid not null, entite_id uuid, module text, debut timestamptz not null, fin timestamptz not null, motif text, cree_par uuid, cree_le timestamptz default now(), revoquee_le timestamptz);
create table public.travaux (id bigserial primary key, client_id uuid, module text, genre text, charge jsonb default '{}', cle text, priorite smallint default 0, statut text default 'a_faire', resultat jsonb, erreur text, essais int default 0, essais_max int default 5, prochain_le timestamptz default now(), verrou_jusqu_au timestamptz, pris_par text, cree_le timestamptz default now());
create unique index travaux_cle_ouverte on public.travaux (genre, cle) where statut in ('a_faire', 'en_cours');
create table public.battements (client_id uuid, module text, dernier_le timestamptz, primary key (client_id, module));
create table public.lectures (id bigserial primary key, client_id uuid not null, objet_type text not null, objet_id text not null, user_id uuid not null, contexte text, lu_le timestamptz not null default now());
create table public.territoires (code text primary key, nom text, fuseau text not null);
insert into public.territoires (code, nom, fuseau) values
  ('metropole', 'Métropole', 'Europe/Paris'), ('alsace-moselle', 'Alsace-Moselle', 'Europe/Paris'), ('guadeloupe', 'Guadeloupe', 'America/Guadeloupe'),
  ('martinique', 'Martinique', 'America/Martinique'), ('guyane', 'Guyane', 'America/Cayenne'), ('la-reunion', 'La Réunion', 'Indian/Reunion'),
  ('mayotte', 'Mayotte', 'Indian/Mayotte'), ('saint-barthelemy', 'Saint-Barthélemy', 'America/St_Barthelemy'), ('saint-martin', 'Saint-Martin', 'America/Marigot'),
  ('saint-pierre-et-miquelon', 'Saint-Pierre-et-Miquelon', 'America/Miquelon'), ('nouvelle-caledonie', 'Nouvelle-Calédonie', 'Pacific/Noumea'),
  ('polynesie-francaise', 'Polynésie française', 'Pacific/Tahiti'), ('wallis-et-futuna', 'Wallis-et-Futuna', 'Pacific/Wallis');
create table public.regles_delais (code text not null, version smallint not null default 1, quantite int not null, unite text not null check (unite in ('mois', 'jours')), libelle text, source_texte text, source_url text, en_vigueur_du date default '2017-09-01', primary key (code, version));
create table public.delais (id uuid primary key default gen_random_uuid(), client_id uuid not null, module text not null, objet_type text, objet_id text, libelle text, regle text, depart date, territoire text, echeance date not null, statut text not null default 'ouvert' check (statut in ('ouvert', 'depasse', 'tenu', 'annule')), responsable uuid, action_attendue text, cle text, rappels int[], augmentation_mois int default 0, source text, note text, cree_le timestamptz default now(), unique (client_id, id), unique (client_id, cle));
create table public.effacements_objets (id uuid primary key default gen_random_uuid(), client_id uuid, objet_type text, objet_id text, motif text, efface_le timestamptz default now(), detail jsonb);
create table private.manifestes_effacement (cle text primary key, manifeste jsonb);
create table private.reglages (cle text primary key, valeur text);
insert into private.reglages values ('tamila_lieu_conservation', 'Paris (souche locale)');
create table private.buckets_locataires (bucket text primary key);
insert into private.buckets_locataires values ('omega-clients');
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
create table private.tables_locataires (nom text primary key, ordre_effacement smallint not null default 100, note text);
create table private.tables_objets (nom text primary key, objet_type text not null, colonne text not null, ordre_effacement smallint not null default 100);
create table private.abonnements (evenement text, module text, genre text, unique (evenement, module, genre));

-- ── Fonctions du socle : souches ──
create or replace function private.mes_clients() returns setof uuid language sql stable security definer set search_path to '' as $$
  select c.client_id from public.comptes c where c.user_id = (select auth.uid()) $$;
create or replace function private.a_un_role(p_client uuid, p_roles text[]) returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.comptes c where c.user_id = (select auth.uid()) and c.client_id = p_client and c.role = any (p_roles)) $$;
create or replace function private.perimetre_couvre(p_user uuid, p_client uuid, p_entite uuid) returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.comptes c where c.user_id = p_user and c.client_id = p_client and (c.perimetre_total or p_entite is null or exists (select 1 from public.comptes_entites ce where ce.user_id = p_user and ce.entite_id = p_entite))) $$;
create or replace function private.dans_equipe(p_user uuid, p_equipe uuid) returns boolean language sql stable security definer set search_path to '' as $$ select exists (select 1 from public.equipes_membres m where m.equipe_id = p_equipe and m.user_id = p_user) $$;
create or replace function private.politique_couvrante(p_client uuid, p_module text, p_type text, p_entite uuid, p_montant numeric, p_quand timestamptz) returns uuid language sql stable as $$ select null::uuid $$;
create or replace function private.acteur_courant(out acteur_type text, out acteur_id uuid, out acteur_libelle text) language sql stable as $$
  select case when auth.uid() is not null then 'utilisateur' else 'systeme' end, auth.uid(), case when auth.uid() is not null then 'membre' else coalesce(nullif(current_setting('omega.module', true), ''), 'socle') end $$;
create or replace function private.journaliser(p_client uuid, p_action text, p_objet_type text, p_objet_id text, p_donnees jsonb, p_entite uuid) returns bigint language plpgsql security definer set search_path to '' as $$
declare v_prec bytea; v_id bigint; v_a record;
begin
  select * into v_a from private.acteur_courant();
  select j.hash into v_prec from public.journal_opposable j where j.client_id = p_client order by j.id desc limit 1;
  insert into public.journal_opposable (client_id, entite_id, acteur_type, acteur_id, acteur_libelle, action, objet_type, objet_id, donnees, hash_precedent, hash)
  values (p_client, p_entite, v_a.acteur_type, v_a.acteur_id, v_a.acteur_libelle, p_action, p_objet_type, p_objet_id, p_donnees, v_prec,
          extensions.digest(coalesce(v_prec, ''::bytea) || convert_to(p_action || p_objet_type || p_objet_id || p_donnees::text, 'UTF8'), 'sha256'))
  returning id into v_id;
  return v_id;
end $$;
create or replace function private.journaliser_module(p_client uuid, p_module text, p_action text, p_objet_type text, p_objet_id text, p_donnees jsonb default '{}') returns bigint language plpgsql security definer set search_path to '' as $$
declare v_avant text := current_setting('omega.module', true); v_id bigint;
begin
  perform set_config('omega.module', p_module, true);
  v_id := private.journaliser(p_client, p_action, p_objet_type, p_objet_id, coalesce(p_donnees, '{}'::jsonb), null);
  perform set_config('omega.module', coalesce(v_avant, ''), true);
  return v_id;
end $$;
create or replace function private.lever_alerte_module(p_client uuid, p_module text, p_niveau text, p_titre text, p_detail jsonb default '{}', p_cle text default null, p_pour_client boolean default false, p_destinataire uuid default null) returns uuid language plpgsql security definer set search_path to '' as $$
declare v_id uuid;
begin
  insert into public.alertes (client_id, interne, niveau, source, titre, detail, cle_regroupement, destinataire) values (p_client, not p_pour_client, p_niveau, p_module, left(p_titre, 200), p_detail, p_module || ':' || p_cle, p_destinataire)
  on conflict do nothing returning id into v_id; return v_id;
end $$;
create or replace function private.deposer_travail(p_client uuid, p_module text, p_genre text, p_charge jsonb default '{}', p_cle text default null, p_priorite smallint default 0) returns bigint language plpgsql as $$
declare v bigint;
begin
  insert into public.travaux (client_id, module, genre, charge, cle, priorite) values (p_client, p_module, p_genre, p_charge, p_cle, p_priorite)
  on conflict (genre, cle) where statut in ('a_faire', 'en_cours') do update set priorite = excluded.priorite returning id into v;
  return v;
end $$;
create or replace function private.prendre_travaux(p_genres text[], p_n int, p_bail interval, p_ouvrier text) returns setof public.travaux language sql as $$
  update public.travaux set statut = 'en_cours', pris_par = p_ouvrier, verrou_jusqu_au = now() + p_bail where id in (select id from public.travaux where genre = any (p_genres) and statut = 'a_faire' and prochain_le <= now() order by priorite desc, id limit p_n) returning * $$;
create or replace function private.finir_travail(p_id bigint, p_resultat jsonb) returns void language sql as $$ update public.travaux set statut = 'fait', resultat = p_resultat where id = p_id $$;
create or replace function private.echouer_travail(p_id bigint, p_err text) returns void language sql as $$ update public.travaux set statut = 'echec', erreur = p_err where id = p_id $$;
create or replace function private.battre(p_client uuid, p_moteur text, p_detail jsonb, p_x uuid) returns void language sql as $$
  insert into public.battements (client_id, module, dernier_le) values (p_client, p_moteur, now()) on conflict (client_id, module) do update set dernier_le = now() $$;
create or replace function private.regler_battement(p_client uuid, p_moteur text, p_tous_les interval, p_x uuid, p_fuseau text) returns void language sql as $$ select null::void $$;
create or replace function private.tracer_lecture(p_client uuid, p_objet_type text, p_objet_id text, p_contexte text default 'lecture') returns void language plpgsql security definer set search_path to '' as $$
begin
  insert into public.lectures (client_id, objet_type, objet_id, user_id, contexte) values (p_client, p_objet_type, p_objet_id, coalesce((select auth.uid()), '00000000-0000-0000-0000-000000000000'::uuid), p_contexte);
end $$;
-- Le traçage des tables : seules les colonnes citées ('+col') sont relevées, jamais les autres (les chiffrés restent hors de l'audit).
create or replace function private.tracer() returns trigger language plpgsql security definer set search_path to '' as $$
declare v_ligne jsonb := '{}'; v_src jsonb; c text; v_client uuid;
begin
  v_src := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_client := (v_src ->> 'client_id')::uuid;
  for c in select unnest(tg_argv) loop
    c := ltrim(c, '+');
    if v_src ? c then v_ligne := v_ligne || jsonb_build_object(c, v_src -> c); end if;
  end loop;
  insert into public.audit_journal (client_id, table_name, op, ligne) values (v_client, tg_table_name, tg_op, v_ligne);
  return null;
end $$;
-- Le dépôt d'une pièce rattachée à un objet demande sa lecture.
create or replace function private.pieces_demander_lecture() returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.objet_type is not null and new.statut in ('recue', 'a_rattacher', 'lue') then
    perform private.deposer_travail(new.client_id, new.module, 'lecteur.lire', jsonb_build_object('piece', new.id), 'piece:' || new.id::text, 0::smallint);
  end if;
  return null;
end $$;
create trigger pieces_demander_lecture after insert on public.pieces for each row execute function private.pieces_demander_lecture();
-- L'effacement d'un objet (souche) : les pièces de l'objet, une trace.
create or replace function private.effacer_objet(p_client uuid, p_objet_type text, p_objet_id text, p_racine text, p_motif text) returns jsonb language plpgsql security definer set search_path to '' as $$
declare n int; v_id uuid;
begin
  perform set_config('omega.effacement_objet', 'oui', true);
  delete from public.pieces where client_id = p_client and objet_type = p_objet_type and objet_id = p_objet_id;
  get diagnostics n = row_count;
  delete from public.tamila_parties where client_id = p_client and dossier_id::text = p_objet_id;
  delete from public.tamila_avis where client_id = p_client and dossier_id::text = p_objet_id;
  delete from public.tamila_murailles where client_id = p_client and dossier_id::text = p_objet_id;
  perform set_config('omega.effacement_objet', '', true);
  insert into public.effacements_objets (client_id, objet_type, objet_id, motif, detail) values (p_client, p_objet_type, p_objet_id, p_motif, jsonb_build_object('pieces', n)) returning id into v_id;
  return jsonb_build_object('effacement', v_id, 'pieces', n);
end $$;

-- ── B5, les délais (souche fidèle au calcul attendu par Tamila) ──
create or replace function public.ajouter_mois(p_date date, p_mois int) returns date language sql immutable as $$ select (p_date + make_interval(months => p_mois))::date $$;
-- Prorogation (art. 642) : samedi, dimanche et jours fériés de métropole → premier jour ouvrable suivant.
create or replace function private.ferie(p date) returns boolean language plpgsql immutable as $$
declare a int := extract(year from p); paques date; r int;
begin
  -- Pâques (algorithme de Meeus)
  declare g int := a % 19; c int := a / 100; h int := (c - c / 4 - (8 * c + 13) / 25 + 19 * g + 15) % 30; i int := h - (h / 28) * (1 - (h / 28) * (29 / (h + 1)) * ((21 - g) / 11)); j int := (a + a / 4 + i + 2 - c + c / 4) % 7; l int := i - j; m int := 3 + (l + 40) / 44; d int := l + 28 - 31 * (m / 4);
  begin paques := make_date(a, m, d); end;
  return p in (make_date(a, 1, 1), make_date(a, 5, 1), make_date(a, 5, 8), make_date(a, 7, 14), make_date(a, 8, 15), make_date(a, 11, 1), make_date(a, 11, 11), make_date(a, 12, 25), paques + 1, paques + 39, paques + 50);
end $$;
create or replace function public.proroger(p_date date, p_territoire text default 'metropole') returns date language plpgsql immutable as $$
declare d date := p_date;
begin
  while extract(isodow from d) in (6, 7) or private.ferie(d) loop d := d + 1; end loop;
  return d;
end $$;
create or replace function public.echeance_de(p_regle text, p_depart date, p_territoire text, p_mois int default 0) returns jsonb language plpgsql stable as $$
declare g public.regles_delais; v_brute date; v_bloc date; v_ech date; v_bloc_p date;
begin
  select * into g from public.regles_delais where code = p_regle and en_vigueur_du <= p_depart order by version desc limit 1;
  if not found then raise exception 'Règle de délai inconnue : %.', p_regle using errcode = '22023'; end if;
  if g.unite = 'mois' then
    v_bloc := public.ajouter_mois(p_depart, g.quantite + p_mois);
    v_brute := least(v_bloc, public.ajouter_mois(public.ajouter_mois(p_depart, g.quantite), p_mois));
  else
    v_brute := public.ajouter_mois(p_depart, p_mois) + g.quantite; v_bloc := v_brute;
  end if;
  v_ech := public.proroger(v_brute, p_territoire);
  v_bloc_p := public.proroger(v_bloc, p_territoire);
  return jsonb_build_object('echeance', v_ech, 'brute', v_brute, 'version', g.version, 'a_confirmer', v_bloc <> v_brute and v_bloc_p <> v_ech,
                            'lecture_d_un_bloc', case when v_bloc <> v_brute and v_bloc_p <> v_ech then v_bloc_p end);
end $$;
create or replace function private.jour_en_toutes_lettres(p date) returns text language sql immutable as $$
  select (array['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'])[extract(isodow from p)] || ' ' || extract(day from p)::int || ' '
      || (array['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'])[extract(month from p)] || ' ' || extract(year from p)::int $$;
create or replace function private.poser_delai(p_client uuid, p_module text, p_objet_type text, p_objet_id text, p_libelle text, p_regle text, p_depart date, p_territoire text, p_rappels int[], p_responsable uuid, p_action text, p_cle text, p_mois int default 0) returns uuid language plpgsql security definer set search_path to '' as $$
declare v_id uuid; v_ech date;
begin
  select d.id into v_id from public.delais d where d.client_id = p_client and d.cle = p_cle;
  if v_id is not null then return v_id; end if;
  v_ech := (public.echeance_de(p_regle, p_depart, p_territoire, p_mois) ->> 'echeance')::date;
  insert into public.delais (client_id, module, objet_type, objet_id, libelle, regle, depart, territoire, echeance, responsable, action_attendue, cle, rappels, augmentation_mois)
  values (p_client, p_module, p_objet_type, p_objet_id, p_libelle, p_regle, p_depart, p_territoire, v_ech, p_responsable, p_action, p_cle, p_rappels, p_mois) returning id into v_id;
  return v_id;
end $$;
create or replace function private.poser_delai_date(p_client uuid, p_module text, p_objet_type text, p_objet_id text, p_libelle text, p_echeance date, p_source text, p_territoire text, p_rappels int[], p_responsable uuid, p_action text, p_cle text) returns uuid language plpgsql security definer set search_path to '' as $$
declare v_id uuid;
begin
  select d.id into v_id from public.delais d where d.client_id = p_client and d.cle = p_cle;
  if v_id is not null then return v_id; end if;
  insert into public.delais (client_id, module, objet_type, objet_id, libelle, echeance, source, territoire, responsable, action_attendue, cle, rappels)
  values (p_client, p_module, p_objet_type, p_objet_id, p_libelle, p_echeance, p_source, p_territoire, p_responsable, p_action, p_cle, p_rappels) returning id into v_id;
  return v_id;
end $$;
create or replace function private.clore_delai(p_id uuid, p_statut text, p_note text) returns void language sql security definer set search_path to '' as $$
  update public.delais set statut = p_statut, note = p_note where id = p_id and statut in ('ouvert', 'depasse') $$;
create or replace function private.notifier_delai(p_id uuid, p_echeance date, p_source text) returns void language sql security definer set search_path to '' as $$
  update public.delais set echeance = p_echeance, source = p_source where id = p_id $$;

-- ── Le moteur de validation (socle, tel que la souche d'A4 le porte) ──
create or replace function private.preparer_demande() returns trigger language plpgsql security definer set search_path to '' as $function$
declare v_regle public.regles_validation; v_uid uuid := (select auth.uid()); v_politique uuid;
begin
  new.statut := 'en_attente'; new.cree_le := now(); new.decide_le := null; new.execute_le := null; new.motif_echec := null; new.politique_id := null;
  if v_uid is not null then new.demandeur_type := 'utilisateur'; new.demandeur_id := v_uid; else new.demandeur_type := 'systeme'; new.demandeur_id := null; end if;
  select r.* into v_regle from public.regles_validation r
  where r.client_id = new.client_id and r.module = new.module and r.actif
    and ((r.type_action is null and new.type_action <> 'politique.activer') or r.type_action = new.type_action)
    and (r.entite_id is null or r.entite_id = new.entite_id)
    and coalesce(new.montant, 0) >= r.montant_min and (r.montant_max is null or coalesce(new.montant, 0) < r.montant_max)
  order by (r.type_action is not null) desc, (r.entite_id is not null) desc, r.montant_min desc, r.approbations_requises desc limit 1;
  if found then
    new.regle_id := v_regle.id; new.approbations_requises := v_regle.approbations_requises; new.roles_autorises := v_regle.roles_autorises; new.equipe_id := v_regle.equipe_id;
  else
    new.regle_id := null; new.approbations_requises := 1;
    new.roles_autorises := case when new.type_action = 'politique.activer' then array['gerant'] else array['gerant', 'admin', 'valideur'] end; new.equipe_id := null;
  end if;
  v_politique := private.politique_couvrante(new.client_id, new.module, new.type_action, new.entite_id, new.montant, now());
  if v_politique is not null then new.statut := 'approuvee'; new.decide_le := now(); new.politique_id := v_politique; new.approbations_requises := 0; end if;
  return new;
end $function$;
create or replace function private.appliquer_decision() returns trigger language plpgsql security definer set search_path to '' as $function$
declare v_requises smallint; v_oui int; v_non int;
begin
  select d.approbations_requises into v_requises from public.demandes_validation d where d.id = new.demande_id;
  select count(*) filter (where a.decision = 'approuve'), count(*) filter (where a.decision = 'rejete') into v_oui, v_non from public.approbations a where a.demande_id = new.demande_id;
  if v_non > 0 then update public.demandes_validation set statut = 'rejetee' where id = new.demande_id and statut = 'en_attente';
  elsif v_oui >= v_requises then update public.demandes_validation set statut = 'approuvee' where id = new.demande_id and statut = 'en_attente'; end if;
  return null;
end $function$;
create or replace function private.garder_demande() returns trigger language plpgsql set search_path to '' as $function$
begin
  if (new.id, new.client_id, new.entite_id, new.module, new.type_action, new.objet_type, new.objet_id, new.resume, new.montant, new.devise, new.payload, new.demandeur_type, new.demandeur_id, new.approbations_requises, new.roles_autorises, new.equipe_id, new.politique_id, new.echeance, new.cle_idempotence, new.cree_le)
     is distinct from (old.id, old.client_id, old.entite_id, old.module, old.type_action, old.objet_type, old.objet_id, old.resume, old.montant, old.devise, old.payload, old.demandeur_type, old.demandeur_id, old.approbations_requises, old.roles_autorises, old.equipe_id, old.politique_id, old.echeance, old.cle_idempotence, old.cree_le) then
    raise exception 'Une demande de validation ne se modifie pas après sa création : seul son statut avance.' using errcode = '42501';
  end if;
  if new.statut is distinct from old.statut then
    if current_user = 'authenticated' then
      if not (old.statut = 'en_attente' and new.statut = 'annulee' and old.demandeur_id = (select auth.uid())) then
        raise exception 'Seul le demandeur annule une demande en attente ; le reste passe par les décisions.' using errcode = '42501';
      end if;
    elsif not ((old.statut = 'en_attente' and new.statut in ('approuvee', 'rejetee', 'expiree', 'annulee')) or (old.statut = 'approuvee' and new.statut in ('executee', 'echec_execution')) or (old.statut = 'echec_execution' and new.statut in ('executee', 'echec_execution'))) then
      raise exception 'Passage de statut refusé : % vers %.', old.statut, new.statut using errcode = '23514';
    end if;
    if new.statut = 'approuvee' and (select count(*) from public.approbations a where a.demande_id = new.id and a.decision = 'approuve') < new.approbations_requises then
      raise exception 'Approbations insuffisantes : une demande n''est approuvée que par des personnes.' using errcode = '23514';
    end if;
    if new.statut = 'rejetee' and not exists (select 1 from public.approbations a where a.demande_id = new.id and a.decision = 'rejete') then
      raise exception 'Un rejet vient toujours d''une personne.' using errcode = '23514';
    end if;
    if new.statut in ('approuvee', 'rejetee', 'expiree', 'annulee') then new.decide_le := coalesce(new.decide_le, now()); end if;
    if new.statut = 'executee' then new.execute_le := coalesce(new.execute_le, now()); end if;
  end if;
  return new;
end $function$;
create or replace function private.exiger_decideur(p_d public.demandes_validation, p_decideur uuid) returns void language plpgsql stable security definer set search_path to '' as $function$
declare v_role text;
begin
  select c.role into v_role from public.comptes c where c.user_id = p_decideur and c.client_id = p_d.client_id;
  if v_role is null or not (v_role = any (p_d.roles_autorises)) then raise exception 'Ce rôle ne peut pas décider de cette demande.' using errcode = '42501'; end if;
  if not private.perimetre_couvre(p_decideur, p_d.client_id, p_d.entite_id) then raise exception 'Cette demande est hors de votre périmètre.' using errcode = '42501'; end if;
  if p_d.equipe_id is not null and not private.dans_equipe(p_decideur, p_d.equipe_id) then raise exception 'Cette demande revient à une équipe.' using errcode = '42501'; end if;
end $function$;
create or replace function private.preparer_approbation() returns trigger language plpgsql security definer set search_path to '' as $function$
declare v_d public.demandes_validation; v_uid uuid := (select auth.uid());
begin
  select * into v_d from public.demandes_validation where id = new.demande_id;
  if not found then raise exception 'Demande introuvable.' using errcode = 'P0002'; end if;
  if v_d.statut <> 'en_attente' then raise exception 'Cette demande n''attend plus de décision (%).', v_d.statut using errcode = '55000'; end if;
  new.user_id := coalesce(new.user_id, v_uid);
  if new.user_id is null then raise exception 'Une décision vient d''une personne.' using errcode = '42501'; end if;
  new.client_id := v_d.client_id;
  if v_d.demandeur_id = new.user_id or (v_d.payload -> 'saisi_par') @> to_jsonb(new.user_id::text) then
    raise exception 'Celui qui a saisi la pièce ne l''approuve pas.' using errcode = '42501';
  end if;
  perform private.exiger_decideur(v_d, coalesce(new.au_nom_de, new.user_id));
  new.decide_le := now();
  return new;
end $function$;
create trigger demandes_validation_preparer before insert on public.demandes_validation for each row execute function private.preparer_demande();
create trigger demandes_validation_garder before update on public.demandes_validation for each row execute function private.garder_demande();
create trigger approbations_preparer before insert on public.approbations for each row execute function private.preparer_approbation();
create trigger approbations_appliquer after insert on public.approbations for each row execute function private.appliquer_decision();

-- ── Droits : lecture par politique seulement sur les tables Tamila (02) ; ici, ce que le socle accorde ──
alter table public.demandes_validation enable row level security;
create policy "membres lisent leurs demandes" on public.demandes_validation for select to authenticated using (client_id in (select private.mes_clients()));
create policy "demandeur annule" on public.demandes_validation for update to authenticated using (client_id in (select private.mes_clients())) with check (true);
alter table public.approbations enable row level security;
create policy "membres lisent" on public.approbations for select to authenticated using (client_id in (select private.mes_clients()));
create policy "membres decident" on public.approbations for insert to authenticated with check (true);
alter table public.journal_opposable enable row level security;
alter table public.lectures enable row level security;
