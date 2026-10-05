-- TOUT_4.sql — partie 4/4 de TOUT.sql (tests 39 à 50). Lancer les quatre dans l'ordre.

-- 39 — un objet d'un type restreint n'est pas lisible sans ligne dans acces_objets
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_39_objet_restreint_sans_acces() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; objet uuid;
begin
  jeu := tests.jeu();
  objet := gen_random_uuid();
  perform tests.inserer_minimal('public', 'objets_restreints', jsonb_build_object('client_id', jeu ->> 'client_a', 'objet_type', 'dossier_essai_a5'));
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  return next ok(not tests.lit_objet((jeu ->> 'client_a')::uuid, 'dossier_essai_a5', objet), 'lit_objet() refuse un objet restreint sans acces_objets');
  perform tests.redevenir_admin();
end $f$;



-- 40 — le même objet devient lisible avec une ligne acces_objets pour l'utilisateur
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_40_objet_restreint_avec_acces() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; objet uuid;
begin
  jeu := tests.jeu();
  objet := gen_random_uuid();
  perform tests.inserer_minimal('public', 'objets_restreints', jsonb_build_object('client_id', jeu ->> 'client_a', 'objet_type', 'dossier_essai_a5'));
  perform tests.inserer_minimal('public', 'acces_objets', jsonb_build_object('client_id', jeu ->> 'client_a', 'objet_type', 'dossier_essai_a5', 'objet_id', objet, 'user_id', jeu ->> 'user_a'));
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  return next ok(tests.lit_objet((jeu ->> 'client_a')::uuid, 'dossier_essai_a5', objet), 'lit_objet() accepte avec un accès nominatif');
  return next ok(not tests.lit_objet((jeu ->> 'client_a')::uuid, 'dossier_essai_a5', gen_random_uuid()), 'mais pas un autre objet du même type');
  perform tests.endosser((jeu ->> 'user_b')::uuid);
  return next ok(not tests.lit_objet((jeu ->> 'client_a')::uuid, 'dossier_essai_a5', objet), 'ni un utilisateur d''un autre client');
  perform tests.redevenir_admin();
end $f$;



-- 41 — un objet d'un type non restreint est lisible par tout membre du client, par personne d'ailleurs
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_41_objet_non_restreint() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; objet uuid;
begin
  jeu := tests.jeu();
  objet := gen_random_uuid();
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  return next ok(tests.lit_objet((jeu ->> 'client_a')::uuid, 'type_libre_a5', objet), 'Membre du client : lecture permise');
  perform tests.endosser((jeu ->> 'user_b')::uuid);
  return next ok(not tests.lit_objet((jeu ->> 'client_a')::uuid, 'type_libre_a5', objet), 'Membre d''un autre client : lecture refusée');
  perform tests.redevenir_admin();
end $f$;



-- 42 — sur toute table locataire, client_id est un uuid NOT NULL
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_42_client_id_uuid_non_nul() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select c.table_name, c.data_type, c.is_nullable from information_schema.columns c
    where c.table_schema = 'public' and c.column_name = 'client_id'
      and c.table_name in (select regexp_replace(nom, '^public\.', '') from private.tables_locataires)
      and (c.data_type <> 'uuid' or c.is_nullable = 'YES')
      -- une table qui porte une colonne « interne » (alertes) admet client_id null pour les lignes internes Omega
      and not exists (select 1 from information_schema.columns i where i.table_schema = 'public' and i.table_name = c.table_name and i.column_name = 'interne')
    order by 1
  $q$, 'client_id uuid NOT NULL partout (une colonne nullable échapperait à « client_id in (mes_clients()) »)');
end $f$;



-- 43 — chaque table locataire a une politique fondée sur private.mes_clients() ou private.lit_objet()
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_43_politiques_fondees_sur_mes_clients() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select tl.nom from private.tables_locataires tl
    where not exists (
      select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = regexp_replace(tl.nom, '^public\.', '')
        and (coalesce(p.qual, '') || coalesce(p.with_check, '')) ~ '(mes_clients|lit_objet)')
      -- une table interne fermée à authenticated (aucun SELECT) n'a pas besoin de politique
      and has_table_privilege('authenticated', to_regclass('public.' || quote_ident(regexp_replace(tl.nom, '^public\.', ''))), 'SELECT')
    order by 1
  $q$, 'Toute table locataire lisible par authenticated est protégée par mes_clients() ou lit_objet()');
end $f$;



-- 44 — authenticated n'exécute dans private que les fonctions qu'une politique ou une fonction publique utilise
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_44_private_fonctions_exposees() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
      and has_function_privilege('authenticated', p.oid, 'execute')
      and not exists (select 1 from pg_policies pol where (coalesce(pol.qual, '') || coalesce(pol.with_check, '')) ~ ('private\.' || p.proname || '\('))
      and not exists (select 1 from pg_proc q join pg_namespace m on m.oid = q.pronamespace where m.nspname = 'public' and q.prosrc ~ ('private\.' || p.proname || '\('))
    order by 1
  $q$, 'Aucune fonction de private exécutable par authenticated sans usage connu (politique RLS ou fonction publique)');
  return next is_empty($q$
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype and has_function_privilege('anon', p.oid, 'execute') order by 1
  $q$, 'anon n''exécute aucune fonction de private');
end $f$;



-- 45 — toute fonction SECURITY DEFINER exécutable par anon/authenticated fixe son search_path
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_45_security_definer_search_path() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select n.nspname || '.' || p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prosecdef
      and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c where c like 'search_path=%')
    order by 1
  $q$, 'Pas de SECURITY DEFINER exposé sans search_path fixé (détournement par schéma)');
end $f$;



-- 46 — aucune vue publique lisible par authenticated ne contourne la RLS (security_invoker)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_46_vues_security_invoker() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
      and has_table_privilege('authenticated', c.oid, 'select')
      and not exists (select 1 from unnest(coalesce(c.reloptions, '{}'::text[])) o where o in ('security_invoker=true', 'security_invoker=on'))
    order by 1
  $q$, 'Toute vue lisible par authenticated est security_invoker (sinon elle lit avec les droits de son propriétaire)');
end $f$;



-- 47 — les clés de chiffrement par dossier de Tamila ne sont pas lisibles en clair par un client
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_47_tamila_cles_protegees() returns setof text
language plpgsql as $f$
declare
  nom text; rls boolean; schema_cles text;
begin
  select n.nspname || '.' || c.relname, c.relrowsecurity, n.nspname into nom, rls, schema_cles
  from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relname = 'tamila_cles' and c.relkind = 'r' limit 1;
  return next ok(nom is not null, 'La table tamila_cles existe' || coalesce(' (' || nom || ')', ''));
  if nom is null then return; end if;
  if schema_cles = 'private' then
    return next pass('tamila_cles est dans private : hors de portée d''anon/authenticated');
    return;
  end if;
  return next ok(rls, 'RLS activée sur ' || nom);
  return next is_empty($q$
    select column_name, grantee from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'tamila_cles' and grantee in ('anon', 'authenticated') and privilege_type = 'SELECT'
      and column_name ~* '(cle|secret|key|chiffr|wrap)'
  $q$, 'Aucune colonne de clé lisible par anon/authenticated (la clé ne doit sortir que via la porte prévue)');
end $f$;



-- 48 — les alertes internes Omega (client_id null) ne sont pas lisibles par un client
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_48_alertes_internes_invisibles() returns setof text
language plpgsql as $f$
declare
  jeu jsonb;
begin
  jeu := tests.jeu();
  perform tests.inserer_minimal('public', 'alertes', jsonb_build_object('client_id', null, 'interne', true, 'niveau', 'info', 'source', 'essai_a5', 'titre', 'Alerte interne d''essai A5'));
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  return next is(tests.compter('public', 'alertes', 'client_id is null'), 0::bigint, 'A ne voit aucune alerte interne');
  return next is(tests.compter('public', 'alertes', format('client_id is not null and client_id <> %L', jeu ->> 'client_a')), 0::bigint, 'ni les alertes des autres clients');
  perform tests.redevenir_admin();
end $f$;



-- 49 — private.verifier_sauvegardes() lève l'alerte sans preuve récente et l'acquitte dès qu'une restauration réussie de moins de 26 h est écrite
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_49_verifier_sauvegardes() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  perform private.verifier_sauvegardes();
  return next ok(exists (select 1 from public.alertes where cle_regroupement = 'sauvegarde:manquante' and acquittee_le is null), 'Sans preuve récente : alerte sauvegarde:manquante ouverte');
  insert into private.sauvegardes (faite_le, octets, sha256, restauration, detail, execution)
  values (now(), 1024, repeat('a', 64), 'reussie', '{"essai": "A5"}'::jsonb, 'https://github.com/essai/a5/actions/runs/0');
  perform private.verifier_sauvegardes();
  return next ok(not exists (select 1 from public.alertes where cle_regroupement = 'sauvegarde:manquante' and acquittee_le is null), 'Avec une preuve « reussie » récente : alerte acquittée');
  return next throws_ok($q$ insert into private.sauvegardes (faite_le, octets, sha256, restauration, detail) values (now(), 1, 'x', 'peut-etre', '{}') $q$, null, null, 'Un verdict hors liste est refusé par la contrainte (sinon : la poser)');
end $f$;



-- 50 — l'export et l'effacement prouvés sont outillés
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_50_export_effacement_prouves() returns setof text
language plpgsql as $f$
declare
  portes text;
begin
  return next has_column('public'::name, 'effacements'::name, 'empreinte_export'::name, 'effacements.empreinte_export : l''export précède l''effacement');
  return next has_column('public'::name, 'effacements'::name, 'lignes'::name, 'effacements.lignes : le compte des lignes effacées par table');
  return next has_table('public'::name, 'effacements_objets'::name, 'effacements_objets existe (effacement par objet)');
  select string_agg(n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', ' ; ') into portes
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private') and p.proname ~* '(export|effac)';
  return next ok(portes is not null, 'Des portes d''export/effacement existent');
  return next diag('Portes : ' || coalesce(portes, 'aucune'));
  return next is_empty($q$
    select tablename, policyname from pg_policies where schemaname = 'public' and tablename in ('effacements', 'effacements_objets') and cmd in ('DELETE', 'UPDATE')
  $q$, 'Les preuves d''effacement ne se modifient ni ne s''effacent');
  return next is_empty($q$
    select nom from private.tables_locataires tl where ordre_effacement is null
  $q$, 'Chaque table locataire a son rang dans l''ordre d''effacement');
end $f$;



select * from runtests('tests'::name, '^test_(39|40|41|42|43|44|45|46|47|48|49|50)_');
