-- TOUT_4.sql — partie 4/4 de TOUT.sql (tests 40 à 57). Lancer les quatre dans l'ordre.

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
    -- DELETE n'existe pas au niveau colonne : has_table_privilege pour lui, has_any_column_privilege pour les trois autres
    where not case when commande = 'DELETE' then has_table_privilege('authenticated', ('public.' || quote_ident(tablename))::regclass, commande)
                   else has_any_column_privilege('authenticated', ('public.' || quote_ident(tablename))::regclass, commande) end
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



-- 52 — un envoi portant des données de santé, sur un canal dont permis_sante est faux, est verrouillé (définitivement)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.
-- Règle : private.verrous_envoi rend CANAL_NON_PERMIS dès que p_e.donnees_sante et not canaux_envoi.permis_sante,
-- même hors module de santé (lot socle 19ab). L'envoi est construit en mémoire (jsonb_populate_record) : aucune
-- insertion dans envois, seul le canal et le drapeau varient entre le témoin et l'essai. Module tavaro (pas de santé),
-- mode essai, transactionnel (aucun consentement ni plage requis avant le verrou santé).

create or replace function tests.test_52_sante_canal_non_permis() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client uuid; canal_interdit text; canal_permis text; base jsonb; e public.envois;
  temoin jsonb; sante jsonb; sante_permis jsonb; motif_reglage text;
  code_canal constant text := '(CANAL_NON_PERMIS|sante:canal)';
begin
  jeu := tests.jeu();
  client := (jeu ->> 'client_a')::uuid;
  if to_regprocedure('private.verrous_envoi(public.envois, boolean, timestamp with time zone)') is null then
    return next fail('private.verrous_envoi(envois, boolean, timestamptz) introuvable');
    return;
  end if;
  select c.canal into canal_interdit from private.canaux_envoi c where not c.permis_sante order by (c.canal = 'sms') desc, c.canal limit 1;
  select c.canal into canal_permis from private.canaux_envoi c where c.permis_sante and c.canal in ('email', 'courriel') limit 1;
  if canal_interdit is null then
    return next fail('Aucun canal avec permis_sante = false : la règle n''a rien à garder (SMS attendu non permis)');
    return;
  end if;
  -- Réglage d'envoi du module pour le client d'essai (mode essai, sans santé de module) ; sur la maquette, pas de table.
  if tests.table_existe('reglages_envois') then
    begin
      perform tests.inserer_minimal('public', 'reglages_envois', jsonb_build_object(
        'client_id', client, 'module', 'tavaro', 'mode', 'essai', 'essai_adresse', 'essais-a5@essai.invalid', 'sante', false));
    exception when others then
      motif_reglage := sqlerrm;
    end;
  end if;
  base := jsonb_build_object('id', gen_random_uuid(), 'client_id', client, 'module', 'tavaro', 'mode', 'essai',
            'destinataire_fuseau', 'Europe/Paris', 'destinataire_professionnel', false, 'destinataire_langue', 'fr',
            'transactionnel', true, 'corps', 'Essai A5 : message de santé', 'empreinte', 'essai_a5_' || gen_random_uuid(),
            'cle_idempotence', 'essai_a5_52', 'statut', 'a_valider', 'echeance', now() + interval '1 day',
            'cree_le', now(), 'maj_le', now(), 'variables', '{}'::jsonb, 'pieces', '{}'::uuid[]);
  -- Témoin : même canal, sans donnée de santé → le canal lui-même est permis pour ce module et ce client.
  e := jsonb_populate_record(null::public.envois, base || jsonb_build_object('canal', canal_interdit, 'destinataire_adresse', '+33600000052', 'donnees_sante', false));
  temoin := to_jsonb(private.verrous_envoi(e, true, now()));
  -- Essai : le même envoi, marqué santé.
  e := jsonb_populate_record(null::public.envois, base || jsonb_build_object('canal', canal_interdit, 'destinataire_adresse', '+33600000052', 'donnees_sante', true));
  sante := to_jsonb(private.verrous_envoi(e, true, now()));
  return next ok(coalesce(temoin::text, '') !~* code_canal,
                 format('Témoin : %s sans donnée de santé n''est pas refusé par le canal', canal_interdit));
  return next ok(coalesce(sante::text, '') ~* code_canal,
                 format('%s portant des données de santé (module sans santé) : verrou CANAL_NON_PERMIS', canal_interdit));
  return next ok(coalesce(sante::text, '') !~* '"definitif"\s*:\s*false' and coalesce(sante::text, '') !~* '(differ|report|hors_plage)',
                 'le verrou est définitif : ni différé, ni reporté');
  -- Contre-épreuve : le même envoi de santé sur un canal permis n'est pas refusé par le canal (c'est bien le canal qui bloque).
  if canal_permis is not null then
    e := jsonb_populate_record(null::public.envois, base || jsonb_build_object('canal', canal_permis, 'destinataire_adresse', 'sante-a5@essai.invalid', 'donnees_sante', true));
    sante_permis := to_jsonb(private.verrous_envoi(e, true, now()));
    return next ok(coalesce(sante_permis::text, '') !~* code_canal,
                   format('Contre-épreuve : %s (permis_sante) n''oppose pas CANAL_NON_PERMIS au même envoi', canal_permis));
  else
    return next ok(true, 'Contre-épreuve sans objet : aucun canal courriel permis en santé');
  end if;
  if motif_reglage is not null then return next diag('Réglage d''essai non posé : ' || motif_reglage); end if;
  return next diag('Témoin : ' || left(coalesce(temoin::text, 'null'), 300));
  return next diag('Santé sur ' || canal_interdit || ' : ' || left(coalesce(sante::text, 'null'), 300));
  return next diag('Santé sur ' || coalesce(canal_permis, '—') || ' : ' || left(coalesce(sante_permis::text, 'null'), 300));
end $f$;



-- 53 — un envoi portant des données de santé vers un fournisseur dont agree_sante est faux est verrouillé (définitivement)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit (y compris la bascule d'agree_sante du témoin).
-- Règle : private.verrous_envoi rend SANTE_HORS_CANAL_AGREE (le verrou « sante:fournisseur ») quand p_e.donnees_sante et
-- que le fournisseur retenu n'est pas agréé. En mode essai, le fournisseur est private.reglages.envois_essai_fournisseur
-- (brevo) ; le canal est celui de ce fournisseur, permis en santé, pour que seul le fournisseur puisse bloquer.
-- Témoin : le même envoi, le même fournisseur passé à agree_sante = true dans la transaction, n'a plus ce verrou.

create or replace function tests.test_53_sante_fournisseur_non_agree() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client uuid; v_fournisseur text; v_canal text; base jsonb; e public.envois;
  non_agree jsonb; agree jsonb; sans_sante jsonb; motif_reglage text;
  code_fournisseur constant text := '(SANTE_HORS_CANAL_AGREE|SANTE_FOURNISSEUR|sante:fournisseur)';
begin
  jeu := tests.jeu();
  client := (jeu ->> 'client_a')::uuid;
  if to_regprocedure('private.verrous_envoi(public.envois, boolean, timestamp with time zone)') is null then
    return next fail('private.verrous_envoi(envois, boolean, timestamptz) introuvable');
    return;
  end if;
  if to_regclass('private.fournisseurs_envoi') is null then
    return next fail('private.fournisseurs_envoi introuvable : aucun fournisseur ne peut être dit agréé ou non');
    return;
  end if;
  v_fournisseur := coalesce((select g.valeur from private.reglages g where g.cle = 'envois_essai_fournisseur'), 'brevo');
  select coalesce(f.canal, 'email') into v_canal from private.fournisseurs_envoi f where f.fournisseur = v_fournisseur;
  if v_canal is null then
    return next fail(format('Le fournisseur d''essai %s n''est pas dans private.fournisseurs_envoi', v_fournisseur));
    return;
  end if;
  if not coalesce((select c.permis_sante from private.canaux_envoi c where c.canal = v_canal), false) then
    return next fail(format('Le canal %s du fournisseur d''essai n''est pas permis en santé : le test ne peut isoler le fournisseur', v_canal));
    return;
  end if;
  if tests.table_existe('reglages_envois') then
    begin
      perform tests.inserer_minimal('public', 'reglages_envois', jsonb_build_object(
        'client_id', client, 'module', 'tavaro', 'mode', 'essai', 'essai_adresse', 'essais-a5@essai.invalid', 'sante', false));
    exception when others then
      motif_reglage := sqlerrm;
    end;
  end if;
  base := jsonb_build_object('id', gen_random_uuid(), 'client_id', client, 'module', 'tavaro', 'mode', 'essai', 'canal', v_canal,
            'destinataire_adresse', 'sante-a5@essai.invalid', 'destinataire_fuseau', 'Europe/Paris',
            'destinataire_professionnel', false, 'destinataire_langue', 'fr', 'transactionnel', true,
            'sujet', 'Essai A5', 'corps', 'Essai A5 : message de santé', 'empreinte', 'essai_a5_' || gen_random_uuid(),
            'cle_idempotence', 'essai_a5_53', 'statut', 'a_valider', 'echeance', now() + interval '1 day',
            'cree_le', now(), 'maj_le', now(), 'variables', '{}'::jsonb, 'pieces', '{}'::uuid[]);
  -- Fournisseur non agréé (état exigé par la décision de Teo : aucun n'est agréé sans preuve HDS).
  update private.fournisseurs_envoi f set agree_sante = false where f.fournisseur = v_fournisseur;
  e := jsonb_populate_record(null::public.envois, base || jsonb_build_object('donnees_sante', true));
  non_agree := to_jsonb(private.verrous_envoi(e, true, now()));
  e := jsonb_populate_record(null::public.envois, base || jsonb_build_object('donnees_sante', false));
  sans_sante := to_jsonb(private.verrous_envoi(e, true, now()));
  -- Témoin : le même fournisseur, agréé le temps de la transaction.
  update private.fournisseurs_envoi f set agree_sante = true where f.fournisseur = v_fournisseur;
  e := jsonb_populate_record(null::public.envois, base || jsonb_build_object('donnees_sante', true));
  agree := to_jsonb(private.verrous_envoi(e, true, now()));
  return next ok(coalesce(non_agree::text, '') ~* code_fournisseur,
                 format('Envoi de santé par %s (agree_sante faux) : verrou SANTE_HORS_CANAL_AGREE', v_fournisseur));
  return next ok(coalesce(non_agree::text, '') !~* '"definitif"\s*:\s*false' and coalesce(non_agree::text, '') !~* '(differ|report|hors_plage)',
                 'le verrou est définitif : ni différé, ni reporté vers un autre fournisseur');
  return next ok(coalesce(non_agree::text, '') !~* '(CANAL_NON_PERMIS|sante:canal)',
                 format('ce n''est pas le canal qui bloque (%s est permis en santé)', v_canal));
  return next ok(coalesce(agree::text, '') !~* code_fournisseur,
                 format('Témoin : %s agréé dans la transaction, le même envoi n''a plus ce verrou', v_fournisseur));
  return next ok(coalesce(sans_sante::text, '') !~* code_fournisseur,
                 'Témoin : sans donnée de santé, le fournisseur non agréé n''est pas un verrou');
  if motif_reglage is not null then return next diag('Réglage d''essai non posé : ' || motif_reglage); end if;
  return next diag('Non agréé : ' || left(coalesce(non_agree::text, 'null'), 300));
  return next diag('Agréé (témoin) : ' || left(coalesce(agree::text, 'null'), 300));
  return next diag('Sans santé : ' || left(coalesce(sans_sante::text, 'null'), 300));
end $f$;



-- 54 — le fournisseur écrit sur l'envoi est celui que verrous_envoi a jugé (cohérence de fournisseur_hds)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql. Lecture seule.
-- verrous_envoi juge agree_sante sur le fournisseur de l'expéditeur actif (réel) ou sur envois_essai_fournisseur (essai) ;
-- commencer_envoi (19ab) rend fournisseur_hds d'après envois.fournisseur. Les deux doivent désigner le même fournisseur,
-- sinon l'ouvrier reçoit un fournisseur_hds qui n'est pas celui que le verrou a jugé. Vérifié sur les envois existants.

create or replace function tests.test_54_sante_fournisseur_coherent() returns setof text
language plpgsql as $f$
declare
  essai_f text := coalesce((select g.valeur from private.reglages g where g.cle = 'envois_essai_fournisseur'), 'brevo');
  n_essai int; n_reel int; ecarts_essai text; ecarts_reel text; sante_non_agree text; sans_fournisseur int;
begin
  if not tests.table_existe('envois') or not tests.table_existe('expediteurs') then
    return next ok(true, 'envois ou expediteurs absents : sans objet');
    return;
  end if;
  select count(*), string_agg(e.id::text || ' (' || e.fournisseur || ')', ', ') filter (where e.fournisseur <> essai_f)
    into n_essai, ecarts_essai
  from public.envois e where e.mode = 'essai' and e.fournisseur is not null;
  select count(*), string_agg(e.id::text || ' (' || e.fournisseur || ' ≠ ' || x.fournisseur || ')', ', ') filter (where e.fournisseur is distinct from x.fournisseur)
    into n_reel, ecarts_reel
  from public.envois e join public.expediteurs x on x.client_id = e.client_id and x.id = e.expediteur_id
  where e.mode = 'reel' and e.fournisseur is not null;
  select string_agg(e.id::text || ' (' || coalesce(e.fournisseur, 'aucun') || ', ' || e.statut || ')', ', ')
    into sante_non_agree
  from public.envois e
  where e.donnees_sante and e.statut in ('pret', 'en_cours', 'envoye')
    and not coalesce((select f.agree_sante from private.fournisseurs_envoi f where f.fournisseur = e.fournisseur), false);
  select count(*) into sans_fournisseur from public.envois e where e.statut in ('pret', 'en_cours', 'envoye') and e.fournisseur is null;
  return next ok(ecarts_essai is null, format('Envois d''essai : fournisseur = envois_essai_fournisseur (%s) sur %s envoi(s)', essai_f, n_essai));
  return next ok(ecarts_reel is null, format('Envois réels : fournisseur = celui de l''expéditeur retenu, sur %s envoi(s)', n_reel));
  return next ok(sante_non_agree is null, 'aucun envoi de santé prêt, en cours ou parti vers un fournisseur non agréé');
  if ecarts_essai is not null then return next diag('Écarts essai : ' || left(ecarts_essai, 600)); end if;
  if ecarts_reel is not null then return next diag('Écarts réel : ' || left(ecarts_reel, 600)); end if;
  if sante_non_agree is not null then return next diag('Santé non agréé : ' || left(sante_non_agree, 600)); end if;
  return next diag(format('Envois prêts/en cours/partis sans fournisseur écrit : %s ; un envoi réel sans expediteur_id n''est pas comparé', sans_fournisseur));
end $f$;



-- 55 — lot 19af : un gérant seul décideur active lui-même un accord permanent de la liste blanche, et rien d'autre
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql et le lot 19af.
-- runtests() annule tout ce que le test écrit (client fictif A, comptes, politiques, demandes, approbations).
-- Client A de tests.jeu() : un gérant (gerant_a) et un collaborateur (user_a), donc le gérant y est seul décideur
-- tant qu'on n'ajoute pas de valideur. Les politiques sont proposées comme le fait btp_donner_accord_j2 (b6_08) :
-- module daliro, nombre_mensuel 1000, un an ; le socle dépose leur demande « politique.activer ».

create or replace function tests.test_55_activation_seul_decideur() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client uuid; gerant uuid; membre uuid; daf uuid := gen_random_uuid();
  pol uuid; dem uuid; dem_libre uuid; etat text; com text; code text; msg text;
begin
  if to_regclass('public.politiques') is null or to_regclass('private.activation_seul_autorisee') is null then
    return next ok(true, 'politiques ou lot 19af absents de cet environnement : sans objet');
    return;
  end if;
  jeu := tests.jeu();
  client := (jeu ->> 'client_a')::uuid; gerant := (jeu ->> 'gerant_a')::uuid; membre := (jeu ->> 'user_a')::uuid;

  -- ── Garde-fous de droits ──
  return next ok(not has_table_privilege('anon', 'private.activation_seul_autorisee', 'select')
                 and not has_table_privilege('authenticated', 'private.activation_seul_autorisee', 'select'),
                 'anon et authenticated ne lisent pas la liste blanche');
  return next ok(not has_table_privilege('authenticated', 'private.activation_seul_autorisee', 'insert')
                 and not has_table_privilege('authenticated', 'private.activation_seul_autorisee', 'update'),
                 'authenticated n''écrit pas dans la liste blanche');
  return next ok(not has_function_privilege('anon', 'private.seul_decideur(uuid, uuid)', 'execute')
                 and not has_function_privilege('authenticated', 'private.seul_decideur(uuid, uuid)', 'execute'),
                 'anon et authenticated n''exécutent pas seul_decideur');
  return next ok(not has_function_privilege('anon', 'private.activation_par_seul_decideur(public.demandes_validation, uuid, uuid)', 'execute')
                 and not has_function_privilege('authenticated', 'private.activation_par_seul_decideur(public.demandes_validation, uuid, uuid)', 'execute'),
                 'anon et authenticated n''exécutent pas activation_par_seul_decideur');
  return next is((select count(*)::int from private.activation_seul_autorisee where module = 'daliro'
                    and type_action in ('envoi.email', 'envoi.whatsapp', 'envoi.sms')), 3,
                 'Liste blanche : les trois accords J-2 de Daliro');

  -- ── seul_decideur ──
  return next ok(private.seul_decideur(client, gerant), 'Le gérant sans autre gérant, admin ni valideur est seul décideur');
  return next ok(not private.seul_decideur(client, membre), 'Un collaborateur n''est jamais seul décideur');
  return next ok(not private.seul_decideur((jeu ->> 'client_b')::uuid, gerant), 'Ni le gérant d''une autre organisation');

  -- ── 1. Seul gérant : il active lui-même un accord J-2 (courriel) ──
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  insert into public.politiques (client_id, entite_id, module, type_action, libelle, nombre_mensuel, debut, fin)
  values (client, null, 'daliro', 'envoi.email', 'Accord J-2 courriel (essai A5)', 1000, now(), now() + interval '365 days')
  returning id into pol;
  perform tests.redevenir_admin();
  select p.demande_id into dem from public.politiques p where p.id = pol;
  return next ok(dem is not null and (select d.type_action = 'politique.activer' and d.demandeur_id = gerant and d.statut = 'en_attente'
                                      from public.demandes_validation d where d.id = dem),
                 'La politique proposée par le gérant a sa demande d''activation, dont il est le demandeur');
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  begin
    insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
    values (dem, client, gerant, 'approuve', 'Activation de l''accord J-2');
    code := 'ok';
  exception when others then
    code := sqlstate; msg := sqlerrm;
  end;
  perform tests.redevenir_admin();
  return next is(code, 'ok', 'Seul gérant : son approbation de l''activation est acceptée' || coalesce(' (' || msg || ')', ''));
  select p.statut into etat from public.politiques p where p.id = pol;
  return next is(etat, 'active', 'La politique est active');
  select a.commentaire into com from public.approbations a where a.demande_id = dem and a.user_id = gerant;
  return next is(com, '[seul décideur] Activation de l''accord J-2', 'Le commentaire est marqué « [seul décideur] »');

  -- ── 2. Même cas avec une DAF valideur active : refusé ──
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
    values (daf, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a5-daf-a@essai.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, false);
  exception when others then
    return next diag('auth.users non alimentée pour la DAF : ' || sqlerrm);
  end;
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', daf, 'client_id', client, 'role', 'valideur', 'perimetre_total', true));
  return next ok(not private.seul_decideur(client, gerant), 'Avec une DAF valideur active, le gérant n''est plus seul décideur');
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  insert into public.politiques (client_id, entite_id, module, type_action, libelle, nombre_mensuel, debut, fin)
  values (client, null, 'daliro', 'envoi.whatsapp', 'Accord J-2 WhatsApp (essai A5)', 1000, now(), now() + interval '365 days')
  returning id into pol;
  perform tests.redevenir_admin();
  select p.demande_id into dem from public.politiques p where p.id = pol;
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  return next throws_ok(format('insert into public.approbations (demande_id, client_id, user_id, decision) values (%L, %L, %L, ''approuve'')', dem, client, gerant),
                        '42501', 'Le demandeur ne décide pas de sa propre demande.', 'Avec une DAF valideur : 42501, le demandeur ne décide pas');
  perform tests.redevenir_admin();
  return next is((select p.statut from public.politiques p where p.id = pol), 'a_valider', 'La politique reste à valider');

  -- La DAF bannie n'est plus un compte actif : le gérant redevient seul décideur (pour les cas suivants).
  update auth.users set banned_until = now() + interval '1 day' where id = daf;
  return next ok(private.seul_decideur(client, gerant), 'DAF bannie : le gérant redevient seul décideur');

  -- ── 3. Politique hors liste blanche (même gérant seul) : refusé ──
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  insert into public.politiques (client_id, entite_id, module, type_action, libelle, nombre_mensuel, debut, fin)
  values (client, null, 'tavaro', 'envoi.email', 'Accord hors liste blanche (essai A5)', 1000, now(), now() + interval '365 days')
  returning id into pol;
  perform tests.redevenir_admin();
  select p.demande_id into dem from public.politiques p where p.id = pol;
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  return next throws_ok(format('insert into public.approbations (demande_id, client_id, user_id, decision) values (%L, %L, %L, ''approuve'')', dem, client, gerant),
                        '42501', 'Le demandeur ne décide pas de sa propre demande.', 'Politique hors liste blanche (tavaro/envoi.email) : 42501');
  perform tests.redevenir_admin();

  -- ── 4. Type d'action autre que politique.activer : refusé ──
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  insert into public.demandes_validation (client_id, module, type_action, resume, cle_idempotence)
  values (client, 'daliro', 'essai.a5', 'Demande ordinaire (essai A5)', 'essai_a5_55_' || gen_random_uuid())
  returning id into dem_libre;
  perform tests.redevenir_admin();
  return next ok((select d.demandeur_id = gerant and d.statut = 'en_attente' from public.demandes_validation d where d.id = dem_libre),
                 'Demande ordinaire du gérant, en attente');
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  return next throws_ok(format('insert into public.approbations (demande_id, client_id, user_id, decision) values (%L, %L, %L, ''approuve'')', dem_libre, client, gerant),
                        '42501', 'Le demandeur ne décide pas de sa propre demande.', 'Type d''action autre que politique.activer : 42501');
  perform tests.redevenir_admin();

  -- ── 5. Décision au nom d'un autre (délégation) : jamais l'exception ──
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  insert into public.politiques (client_id, entite_id, module, type_action, libelle, nombre_mensuel, debut, fin)
  values (client, null, 'daliro', 'envoi.sms', 'Accord J-2 SMS (essai A5)', 1000, now(), now() + interval '365 days')
  returning id into pol;
  perform tests.redevenir_admin();
  select p.demande_id into dem from public.politiques p where p.id = pol;
  begin
    perform tests.inserer_minimal('public', 'delegations', jsonb_build_object(
      'client_id', client, 'delegant', gerant, 'delegataire', membre,
      'debut', now() - interval '1 hour', 'fin', now() + interval '1 day'));
  exception when others then
    msg := sqlerrm;
  end;
  if msg is not null then
    return next diag('Délégation d''essai refusée : ' || msg);
  end if;
  perform tests.endosser(membre, 'a5-client-a@essai.invalid');
  code := null; msg := null;
  begin
    insert into public.approbations (demande_id, client_id, user_id, au_nom_de, decision)
    values (dem, client, membre, gerant, 'approuve');
    code := 'ok';
  exception when others then
    code := sqlstate; msg := sqlerrm;
  end;
  perform tests.redevenir_admin();
  return next is(code, '42501', 'Au nom du gérant (délégation) : 42501 (' || coalesce(msg, 'accepté !') || ')');
  return next is((select p.statut from public.politiques p where p.id = pol), 'a_valider', 'La politique SMS reste à valider');
end $f$;



-- 56 — lot 19ai : compteurs de facturation par client et par mois (pièces lues, part reprise par un opérateur)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql et le lot 19ai.
-- runtests() annule tout ce que le test écrit (pièces du client fictif A, compteurs).
-- Les pièces sont posées par tests.inserer_minimal, puis leur statut suit le parcours du lecteur.

create or replace function tests.test_56_compteurs_facturation() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client_a uuid; client_b uuid; user_a uuid; user_b uuid;
  p1 text; p2 text; p3 text; v_lues bigint; v_reprises bigint; v_part numeric; n bigint;
  v_mois date := date_trunc('month', now() at time zone 'Europe/Paris')::date;
begin
  if to_regclass('public.facturation_mesures') is null then
    return next ok(true, 'lot 19ai absent de cet environnement : sans objet');
    return;
  end if;
  jeu := tests.jeu();
  client_a := (jeu ->> 'client_a')::uuid; client_b := (jeu ->> 'client_b')::uuid;
  user_a := (jeu ->> 'user_a')::uuid; user_b := (jeu ->> 'user_b')::uuid;

  -- ── Droits ──
  return next ok(not has_table_privilege('anon', 'public.facturation_mesures', 'select'), 'anon ne lit pas les compteurs');
  return next ok(not has_table_privilege('authenticated', 'public.facturation_mesures', 'insert')
                 and not has_table_privilege('authenticated', 'public.facturation_mesures', 'update'),
                 'authenticated n''écrit pas les compteurs');
  return next ok(not has_table_privilege('authenticated', 'private.mesures_pieces', 'select'), 'authenticated ne lit pas private.mesures_pieces');
  return next ok(not has_function_privilege('authenticated', 'private.facturation_compter_piece()', 'execute'),
                 'authenticated n''exécute pas le compteur');

  -- ── Parcours de lecture ──
  p1 := (tests.inserer_minimal('public', 'pieces', jsonb_build_object('client_id', client_a)) ->> 'id');
  p2 := (tests.inserer_minimal('public', 'pieces', jsonb_build_object('client_id', client_a)) ->> 'id');
  p3 := (tests.inserer_minimal('public', 'pieces', jsonb_build_object('client_id', client_a)) ->> 'id');
  select count(*) into n from public.facturation_mesures where client_id = client_a and mois = v_mois;
  return next is(n, 0::bigint, 'une pièce reçue ne compte pas');

  update public.pieces set statut = 'lue' where id::text = p1;          -- lue d'emblée
  update public.pieces set statut = 'a_verifier' where id::text = p2;   -- reprise par un opérateur
  update public.pieces set statut = 'lue' where id::text = p2;          -- validée ensuite : ne recompte pas
  update public.pieces set statut = 'echec' where id::text = p3;        -- rien de lu : rien de facturé
  update public.pieces set statut = 'lue' where id::text = p1;          -- relue : ne recompte pas

  select pieces_lues, pieces_reprises, part_reprise into v_lues, v_reprises, v_part
  from public.facturation_mois where client_id = client_a and mois = v_mois;
  return next is(v_lues, 2::bigint, 'deux pièces lues (la relue et l''échec ne comptent pas)');
  return next is(v_reprises, 1::bigint, 'une pièce reprise par un opérateur');
  return next is(v_part, 0.5000::numeric, 'part reprise : 0,5');

  -- ── Cloisonnement ──
  perform tests.endosser(user_a);
  select count(*) into n from public.facturation_mois where client_id = client_a;
  return next ok(n >= 1, 'le client A lit ses compteurs');
  perform tests.redevenir_admin();
  perform tests.endosser(user_b);
  select count(*) into n from public.facturation_mois where client_id = client_a;
  return next is(n, 0::bigint, 'le client B ne lit pas ceux de A');
  perform tests.redevenir_admin();
end $f$;



-- 57 — lot 19aj : export complet d'un client, fichiers Storage compris
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql et le lot 19aj.
-- runtests() annule tout ce que le test écrit (demandes d'export, objets Storage fictifs).
-- La fonction Edge export-complet (zip chiffré, lien signé) a ses propres tests Deno ; ici, les portes en base.

create or replace function tests.test_57_export_complet() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client_a uuid; client_b uuid; gerant uuid; membre uuid; user_b uuid;
  ex uuid; code text; n bigint; v_statut text;
begin
  if to_regclass('public.exports_complets') is null then
    return next ok(true, 'lot 19aj absent de cet environnement : sans objet');
    return;
  end if;
  jeu := tests.jeu();
  client_a := (jeu ->> 'client_a')::uuid; client_b := (jeu ->> 'client_b')::uuid;
  gerant := (jeu ->> 'gerant_a')::uuid; membre := (jeu ->> 'user_a')::uuid; user_b := (jeu ->> 'user_b')::uuid;

  -- ── Droits ──
  return next ok(has_function_privilege('authenticated', 'public.demander_export_complet(uuid)', 'execute')
                 and not has_function_privilege('anon', 'public.demander_export_complet(uuid)', 'execute'),
                 'la demande est ouverte à authenticated, fermée à anon');
  return next ok(not has_function_privilege('authenticated', 'private.export_complet_fichiers(uuid)', 'execute')
                 and not has_function_privilege('authenticated', 'private.export_complet_fini(uuid, text, bigint, text, integer, integer, timestamp with time zone)', 'execute')
                 and not has_function_privilege('authenticated', 'private.exports_complets_expires()', 'execute')
                 and not has_function_privilege('authenticated', 'public.export_complet_fichiers(uuid)', 'execute')
                 and not has_function_privilege('anon', 'public.export_complet_fini(uuid, text, bigint, text, integer, integer, timestamp with time zone)', 'execute')
                 and has_function_privilege('service_role', 'public.export_complet_fichiers(uuid)', 'execute'),
                 'la liste des fichiers et l''issue sont réservées au service');
  return next ok(not has_table_privilege('authenticated', 'public.exports_complets', 'insert')
                 and not has_table_privilege('authenticated', 'public.exports_complets', 'update'),
                 'authenticated n''écrit pas les exports directement');

  -- ── Qui peut demander ──
  perform tests.endosser(membre);
  begin
    perform public.demander_export_complet(client_a); code := 'accepté';
  exception when others then code := sqlstate; end;
  perform tests.redevenir_admin();
  return next is(code, '42501', 'un collaborateur ne demande pas l''export complet');

  perform tests.endosser(gerant);
  begin
    perform public.demander_export_complet(client_b); code := 'accepté';
  exception when others then code := sqlstate; end;
  return next is(code, '42501', 'le gérant de A ne demande pas l''export de B');
  ex := public.demander_export_complet(client_a);
  return next ok(ex is not null, 'le gérant de A demande l''export de A');
  begin
    perform public.demander_export_complet(client_a); code := 'accepté';
  exception when others then code := sqlstate; end;
  return next is(code, '55P03', 'une seconde demande pendant la première est refusée');
  perform tests.redevenir_admin();

  -- ── Les fichiers du client, et seulement les siens ──
  insert into storage.objects (bucket_id, name, metadata) values
    ('omega-clients', client_a::text || '/filed/f1.pdf', '{"size": 100}'),
    ('omega-clients', client_a::text || '/tamila/f2.bin', '{"size": 50}'),
    ('omega-clients', client_b::text || '/filed/autre.pdf', '{"size": 70}');
  select count(*) into n from private.export_complet_fichiers(ex);
  return next is(n, 2::bigint, 'deux fichiers pour A, aucun de B');

  -- ── Issue et expiration ──
  perform private.export_complet_fini(ex, client_a::text || '/' || ex::text || '.zip', 1234, repeat('a', 64), 2, 0, now() - interval '1 minute');
  select statut into v_statut from public.exports_complets where id = ex;
  return next is(v_statut, 'pret', 'l''export est prêt');
  select count(*) into n from private.exports_complets_expires() where id = ex;
  return next is(n, 1::bigint, 'un export échu est rendu pour retrait');
  perform private.export_complet_expire(ex);
  select statut into v_statut from public.exports_complets where id = ex;
  return next is(v_statut, 'expire', 'puis marqué expiré');

  -- ── Lecture cloisonnée ──
  perform tests.endosser(user_b);
  select count(*) into n from public.exports_complets where client_id = client_a;
  perform tests.redevenir_admin();
  return next is(n, 0::bigint, 'le client B ne voit pas les exports de A');
end $f$;



select * from runtests('tests'::name, '^test_(40|41|42|43|44|45|46|47|48|49|50|51|52|53|54|55|56|57)_');
