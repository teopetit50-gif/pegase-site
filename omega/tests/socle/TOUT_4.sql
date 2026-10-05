-- TOUT_4.sql — partie 4/4 de TOUT.sql (tests 39 à 51). Lancer les quatre dans l'ordre.

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
      and (c.data_type <> 'uuid' or (c.is_nullable = 'YES'
        -- client_id nullable admis (lignes globales Omega : gabarits communs, travaux système, alertes internes)
        -- à condition que chaque politique SELECT permissive pour authenticated conditionne client_id : un null n'y passe jamais.
        and exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.table_name and p.cmd in ('SELECT', 'ALL') and p.permissive = 'PERMISSIVE'
                      and ('authenticated' = any(p.roles) or p.roles = '{public}'::name[]) and coalesce(p.qual, '') !~ 'client_id')))
    order by 1
  $q$, 'client_id est uuid partout, et s''il est nullable, toute politique de lecture le conditionne (un null reste invisible aux clients)');
  return next diag('Tables locataires à client_id nullable (lignes globales) : ' || coalesce((
    select string_agg(c.table_name, ', ' order by c.table_name) from information_schema.columns c
    where c.table_schema = 'public' and c.column_name = 'client_id' and c.is_nullable = 'YES'
      and c.table_name in (select regexp_replace(nom, '^public\.', '') from private.tables_locataires)), 'aucune'));
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
        -- une aide de private, un filtre sur client_id, l'identité (auth.uid()), ou une jointure sur la table parente
        and (coalesce(p.qual, '') || coalesce(p.with_check, '')) ~* '(private\.[a-z_]+\(|client_id|auth\.uid\(\)|exists ?\( ?select)')
      -- une table interne fermée à authenticated (aucun SELECT) n'a pas besoin de politique
      and has_table_privilege('authenticated', to_regclass('public.' || quote_ident(regexp_replace(tl.nom, '^public\.', ''))), 'SELECT')
    order by 1
  $q$, 'Toute table locataire lisible par authenticated a une politique non triviale (aide de private, client_id, auth.uid() ou jointure)');
  -- Pour SECURITE.md : les politiques qui ne passent ni par mes_clients() ni par lit_objet() (autres aides ou jointure sur la table parente)
  return next diag('Politiques hors mes_clients()/lit_objet() : ' || coalesce((
    select string_agg(p.tablename || '.' || p.policyname, ', ' order by 1) from pg_policies p
    where p.schemaname = 'public' and p.tablename in (select regexp_replace(nom, '^public\.', '') from private.tables_locataires)
      and (coalesce(p.qual, '') || coalesce(p.with_check, '')) !~ '(mes_clients|lit_objet)'), 'aucune'));
end $f$;



-- 44 — dans private, anon n'exécute rien, authenticated n'exécute que les fonctions requises, service_role exécute tout
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- Requises = citées par une politique RLS, appelées par une fonction publique SECURITY INVOKER exécutable par authenticated,
-- par un déclencheur SECURITY INVOKER de private, utilisées par une vue lisible, un CHECK/DEFAULT ou la clause WHEN d'un
-- déclencheur de public, avec fermeture transitive (tests.fonctions_private_requises()). Les fonctions de déclencheur
-- elles-mêmes sont hors sujet : Postgres ne vérifie EXECUTE dessus qu'à la création du déclencheur, jamais au déclenchement.
-- La migration omega/migrations/a5_01_private_execute.sql applique exactement cette règle.

create or replace function tests.test_44_private_fonctions_exposees() returns setof text
language plpgsql as $f$
declare
  requises text; en_trop text; manquantes text; nb_total int; nb_exec int;
begin
  select count(*), count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute')) into nb_total, nb_exec
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype;
  select string_agg(nom || ' (' || raison || ')', ', ' order by nom) into requises from tests.fonctions_private_requises();
  select string_agg(p.proname, ', ' order by p.proname) into en_trop
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
    and has_function_privilege('authenticated', p.oid, 'execute')
    and p.oid not in (select oid from tests.fonctions_private_requises());
  select string_agg(nom, ', ' order by nom) into manquantes
  from tests.fonctions_private_requises() r where not has_function_privilege('authenticated', r.oid, 'execute');
  return next is(en_trop, null, format('authenticated n''exécute aucune fonction de private hors des requises (%s exécutables sur %s)', nb_exec, nb_total));
  if en_trop is not null then return next diag('En trop (à révoquer) : ' || en_trop); end if;
  return next is(manquantes, null, 'Toutes les fonctions requises sont exécutables par authenticated (sinon les politiques cassent)');
  if manquantes is not null then return next diag('Manquantes (à accorder) : ' || manquantes); end if;
  return next is_empty($q$
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype and has_function_privilege('anon', p.oid, 'execute') order by 1
  $q$, 'anon n''exécute aucune fonction de private');
  -- (f) service_role, la clé d'Omega, garde tout : il n'est jamais compté parmi les « en trop »
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    return next is_empty($q$
      select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'private' and p.prokind = 'f' and not has_function_privilege('service_role', p.oid, 'execute') order by 1
    $q$, 'service_role exécute toutes les fonctions de private (lecteur, tâches)');
    return next ok(has_schema_privilege('service_role', 'private', 'USAGE'), 'service_role a USAGE sur private');
  end if;
  return next diag('Requises : ' || coalesce(requises, 'aucune'));
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



-- 51 — toute politique RLS a son GRANT, tout GRANT d'écriture a sa politique (authenticated, schéma public)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- Règle posée par le coordinateur le 5/10 (lots 19k et 19l) : une politique sans GRANT est une porte peinte sur un mur ;
-- un GRANT d'écriture sans politique, sur une table en RLS, est un refus silencieux (ou, sans RLS, une table ouverte).

create or replace function tests.test_51_politiques_et_grants() returns setof text
language plpgsql as $f$
begin
  -- 1) Politique → GRANT : pour chaque politique de public visant authenticated (ou public), la commande est accordée.
  return next is_empty($q$
    with pol as (
      select p.tablename, p.policyname, unnest(case p.cmd when 'ALL' then array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] else array[p.cmd::text] end) as commande
      from pg_policies p
      where p.schemaname = 'public' and ('authenticated' = any(p.roles) or p.roles = '{public}'::name[])
    )
    select tablename, policyname, commande from pol
    -- has_any_column_privilege : vrai aussi quand le droit n'est donné que sur certaines colonnes (clés Tamila par exemple)
    where not has_any_column_privilege('authenticated', ('public.' || quote_ident(tablename))::regclass, commande)
    order by 1, 2, 3
  $q$, 'Chaque politique visant authenticated a le GRANT de sa commande (sinon elle ne sert à rien)');

  -- 2) GRANT d'écriture → politique : sur une table en RLS, un INSERT/UPDATE/DELETE accordé à authenticated a sa politique.
  return next is_empty($q$
    with droits as (
      select c.relname as tablename, cmd
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      cross join unnest(array['INSERT', 'UPDATE', 'DELETE']) as cmd
      where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
        and has_table_privilege('authenticated', c.oid, cmd)
    )
    select d.tablename, d.cmd from droits d
    where not exists (
      select 1 from pg_policies p
      where p.schemaname = 'public' and p.tablename = d.tablename and p.cmd in (d.cmd, 'ALL')
        and ('authenticated' = any(p.roles) or p.roles = '{public}'::name[]))
    order by 1, 2
  $q$, 'Chaque GRANT d''écriture à authenticated sur une table en RLS a sa politique (sinon : refus silencieux, ou droit oublié)');

  -- 3) Et jamais d'écriture accordée à authenticated sur une table de public SANS RLS : là, le GRANT ouvre tout.
  return next is_empty($q$
    select c.relname, cmd
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    cross join unnest(array['INSERT', 'UPDATE', 'DELETE']) as cmd
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity and has_table_privilege('authenticated', c.oid, cmd)
    order by 1, 2
  $q$, 'Aucun droit d''écriture pour authenticated sur une table de public sans RLS');

  return next diag('Tables de public sans RLS (à trancher dans SECURITE.md) : ' || coalesce((
    select string_agg(c.relname, ', ' order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity), 'aucune'));
end $f$;



select * from runtests('tests'::name, '^test_(39|40|41|42|43|44|45|46|47|48|49|50|51)_');
