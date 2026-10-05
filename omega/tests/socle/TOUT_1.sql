-- TOUT_1.sql — partie 1/4 de TOUT.sql (00_installation + tests 01 à 08). Lancer les quatre dans l'ordre.

-- 00 — Installation de pgTAP et du schéma « tests » sur la RECETTE (ygwbgpowzlbdaajlsqkn).
-- À lancer une fois, avant les fichiers 01 à 50. Rien ici ne touche aux tables du socle.
-- Jamais en production : les tests écrivent des données d'exemple (annulées par runtests, mais tout de même).

create extension if not exists pgtap with schema extensions;
create schema if not exists tests;
comment on schema tests is 'Tests pgTAP du socle Omega (session A5). Données d''exemple uniquement, annulées à la fin de chaque test par runtests().';

-- ---------------------------------------------------------------------------
-- Valeur d'exemple pour un type donné (sert à poser des lignes minimales sans connaître chaque table).
create or replace function tests.valeur_exemple(p_type regtype) returns text
language plpgsql stable as $$
declare
  nom text := p_type::text;
  t pg_type%rowtype;
  etiquette text;
begin
  select * into t from pg_type where oid = p_type;
  if t.typtype = 'd' then return tests.valeur_exemple(t.typbasetype::regtype); end if;
  if t.typtype = 'e' then
    select enumlabel into etiquette from pg_enum where enumtypid = p_type order by enumsortorder limit 1;
    return format('%L::%s', etiquette, nom);
  end if;
  if t.typcategory = 'A' then return format('%L::%s', '{}', nom); end if;
  return case
    when nom = 'uuid' then 'gen_random_uuid()'
    when nom in ('text', 'character varying', 'character', 'citext', 'name') then format('%L::%s', 'essai-a5', nom)
    when nom = 'boolean' then 'false'
    when nom in ('smallint', 'integer', 'bigint', 'numeric', 'real', 'double precision', 'money') then format('0::%s', nom)
    when nom = 'date' then 'current_date'
    when nom in ('timestamp with time zone', 'timestamp without time zone') then format('now()::%s', nom)
    when nom in ('time with time zone', 'time without time zone') then format('%L::%s', '12:00', nom)
    when nom = 'interval' then '''0''::interval'
    when nom in ('jsonb', 'json') then format('%L::%s', '{}', nom)
    when nom = 'bytea' then 'decode(repeat(''00'', 32), ''hex'')'
    when nom = 'inet' then '''127.0.0.1''::inet'
    when nom = 'tstzrange' then 'tstzrange(now(), now() + interval ''1 hour'')'
    when nom = 'daterange' then 'daterange(current_date, current_date + 1)'
    else null
  end;
end $$;

-- Valeur d'exemple qui respecte les contraintes CHECK mono-colonne de la colonne (liste de valeurs, regex, longueur d'octets).
-- Renvoie une expression SQL, ou null si aucune contrainte n'impose quelque chose de reconnaissable.
create or replace function tests.valeur_selon_check(p_table regclass, p_colonne name, p_type regtype) returns text
language plpgsql stable as $$
declare
  def text; m text[]; attnum_col int2; regexes text[] := '{}'; candidat text; tous_ok boolean; rx text;
  candidats text[] := array['essai_a5', 'essai', 'filed_essai', 'essai.a5', repeat('0', 64), repeat('a', 64), 'a', 'A5', '0'];
begin
  select attnum into attnum_col from pg_attribute where attrelid = p_table and attname = p_colonne;
  for def in
    select pg_get_constraintdef(c.oid) from pg_constraint c
    where c.conrelid = p_table and c.contype = 'c' and c.conkey = array[attnum_col]
  loop
    -- col = ANY (ARRAY['a'::text, 'b'::text]) → première valeur
    m := regexp_match(def, '= ANY \(ARRAY\[''([^'']*)''');
    if m is not null then return format('%L::%s', m[1], p_type); end if;
    -- col IN (...) rendu parfois sous forme OR : col = 'a' OR col = 'b'
    m := regexp_match(def, '= ''([^'']*)''::');
    if m is not null and def !~ '~' then return format('%L::%s', m[1], p_type); end if;
    -- octet_length(col) = n → n octets nuls
    m := regexp_match(def, 'octet_length\([^)]*\) = (\d+)');
    if m is not null then return format('decode(repeat(''00'', %s), ''hex'')::%s', m[1], p_type); end if;
    -- col ~ 'regex' (une ou plusieurs) → on testera des candidats
    for rx in select r[1] from regexp_matches(def, '~\*? ''((?:[^'']|'''')*)''', 'g') r loop
      regexes := regexes || replace(rx, '''''', '''');
    end loop;
  end loop;
  if array_length(regexes, 1) > 0 then
    foreach candidat in array candidats loop
      tous_ok := true;
      foreach rx in array regexes loop
        if not (candidat ~ rx) then tous_ok := false; exit; end if;
      end loop;
      if tous_ok then return format('%L::%s', candidat, p_type); end if;
    end loop;
  end if;
  return null;
end $$;

-- Insère une ligne minimale dans une table : les colonnes fournies, plus une valeur d'exemple pour chaque
-- colonne NOT NULL sans défaut. Renvoie la ligne insérée en jsonb.
create or replace function tests.inserer_minimal(p_schema text, p_table text, p_valeurs jsonb default '{}'::jsonb) returns jsonb
language plpgsql as $$
declare
  r record;
  cols text := '';
  vals text := '';
  v text;
  typ regtype;
  resultat jsonb;
begin
  for r in
    select a.attname as colonne, a.atttypid as type_oid, a.attnotnull as non_nul, a.atthasdef as a_defaut,
           a.attidentity <> '' as identite, a.attgenerated <> '' as generee
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = p_schema and c.relname = p_table and a.attnum > 0 and not a.attisdropped
    order by a.attnum
  loop
    typ := r.type_oid::regtype;
    if p_valeurs ? r.colonne then
      if jsonb_typeof(p_valeurs -> r.colonne) = 'null' then v := 'null';
      elsif jsonb_typeof(p_valeurs -> r.colonne) in ('object', 'array') then v := format('%L::%s', (p_valeurs -> r.colonne)::text, typ);
      else v := format('%L::%s', p_valeurs ->> r.colonne, typ);
      end if;
    elsif r.non_nul and not r.a_defaut and not r.identite and not r.generee then
      v := coalesce(tests.valeur_selon_check(format('%I.%I', p_schema, p_table)::regclass, r.colonne, typ), tests.valeur_exemple(typ));
      if v is null then raise exception 'tests.inserer_minimal : pas de valeur d''exemple pour %.%.% (type %)', p_schema, p_table, r.colonne, typ; end if;
    else
      continue;
    end if;
    cols := cols || format('%I,', r.colonne);
    vals := vals || v || ',';
  end loop;
  execute format('insert into %I.%I (%s) values (%s) returning to_jsonb(%I.*)', p_schema, p_table, rtrim(cols, ','), rtrim(vals, ','), p_table) into resultat;
  return resultat;
end $$;

-- Jeu d'essai : deux clients fictifs, deux utilisateurs, deux comptes. Renvoie les identifiants.
-- Tout est annulé par runtests() à la fin de chaque test.
create or replace function tests.jeu() returns jsonb
language plpgsql as $$
declare
  client_a uuid; client_b uuid; user_a uuid := gen_random_uuid(); user_b uuid := gen_random_uuid();
  ligne jsonb;
  role_membre text;
begin
  perform set_config('tests.jeu_actif', 'oui', true);
  ligne := tests.inserer_minimal('public', 'clients', jsonb_build_object('nom', 'Client A — essai A5'));
  client_a := (ligne ->> 'id')::uuid;
  ligne := tests.inserer_minimal('public', 'clients', jsonb_build_object('nom', 'Client B — essai A5'));
  client_b := (ligne ->> 'id')::uuid;

  -- Utilisateurs d'authentification (si la table est accessible ; sinon les user_id restent de simples uuid).
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
    values (user_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a5-client-a@essai.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, false),
           (user_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a5-client-b@essai.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, false);
  exception when others then
    raise notice 'tests.jeu : auth.users non alimentée (%), on continue avec des uuid libres', sqlerrm;
  end;

  -- Rôle de membre « simple » : 'collaborateur' s'il est admis, sinon la première valeur admise (enum ou contrainte CHECK), sinon 'collaborateur'.
  select coalesce(
    (select enumlabel from pg_enum e join pg_attribute a on a.atttypid = e.enumtypid
      where a.attrelid = 'public.comptes'::regclass and a.attname = 'role' and enumlabel = 'collaborateur'),
    (select enumlabel from pg_enum e join pg_attribute a on a.atttypid = e.enumtypid
      where a.attrelid = 'public.comptes'::regclass and a.attname = 'role' order by enumsortorder limit 1),
    (select 'collaborateur' from pg_constraint c where c.conrelid = 'public.comptes'::regclass and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ~ '''collaborateur''' limit 1),
    (select (regexp_match(pg_get_constraintdef(c.oid), '''([^'']*)'''))[1] from pg_constraint c
      where c.conrelid = 'public.comptes'::regclass and c.contype = 'c' and pg_get_constraintdef(c.oid) ~ 'role' limit 1),
    'collaborateur') into role_membre;
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', user_a, 'client_id', client_a, 'role', role_membre, 'perimetre_total', true));
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', user_b, 'client_id', client_b, 'role', role_membre, 'perimetre_total', true));

  return jsonb_build_object('client_a', client_a, 'client_b', client_b, 'user_a', user_a, 'user_b', user_b, 'role_membre', role_membre);
end $$;

-- Endosser un utilisateur authentifié : JWT simulé + rôle authenticated (RLS active).
create or replace function tests.endosser(p_user uuid, p_email text default 'essai@essai.invalid') returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'email', p_email, 'aud', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.email', p_email, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- Revenir au rôle d'origine (postgres) pour poser ou lire des données hors RLS.
create or replace function tests.redevenir_admin() returns void
language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
end $$;

-- Compte les lignes d'une table sous le rôle courant (RLS appliquée si authenticated).
create or replace function tests.compter(p_schema text, p_table text, p_condition text default 'true') returns bigint
language plpgsql as $$
declare n bigint;
begin
  execute format('select count(*) from %I.%I where %s', p_schema, p_table, p_condition) into n;
  return n;
end $$;

-- Première colonne existante parmi des candidates (pour s'adapter aux noms réels sans les connaître d'avance).
create or replace function tests.colonne_parmi(p_table regclass, p_candidates text[]) returns text
language sql stable as $$
  select c.attname::text from unnest(p_candidates) with ordinality cand(nom, rang)
  join pg_attribute c on c.attrelid = p_table and c.attname = cand.nom and c.attnum > 0 and not c.attisdropped
  order by cand.rang limit 1;
$$;

-- Première table existante (schéma public) parmi des candidates.
create or replace function tests.table_parmi(p_candidates text[]) returns text
language sql stable as $$
  select nom from unnest(p_candidates) with ordinality cand(nom, rang)
  where to_regclass('public.' || quote_ident(nom)) is not null order by rang limit 1;
$$;

-- Appelle private.lit_objet avec les bons types d'arguments, quels qu'ils soient.
create or replace function tests.lit_objet(p_client uuid, p_type text, p_objet uuid) returns boolean
language plpgsql as $$
declare types text[]; resultat boolean; appel text;
begin
  select array_agg(format_type(t, null) order by o) into types
  from pg_proc p, unnest(p.proargtypes) with ordinality u(t, o)
  where p.oid = 'private.lit_objet'::regproc;
  appel := format('select private.lit_objet(%L::%s, %L::%s, %L::%s)', p_client, types[1], p_type, types[2], p_objet, types[3]);
  execute appel into resultat;
  return coalesce(resultat, false);
end $$;

-- Tables du socle devant être en ajout seul.
create or replace function tests.tables_ajout_seul() returns setof text language sql immutable as $$
  select unnest(array['journal_opposable', 'envois_evenements', 'effacements', 'filed_historique', 'suivis_evenements', 'echeances_pro_journal']);
$$;

-- Déclencheur BEFORE qui couvre UPDATE et/ou DELETE sur une table (tgtype : 1 = ROW, 2 = BEFORE, 8 = DELETE, 16 = UPDATE).
create or replace function tests.declencheurs_bloquants(p_table text) returns table(nom text, sur_update boolean, sur_delete boolean, avant boolean)
language sql stable as $$
  select t.tgname::text, (t.tgtype & 16) <> 0, (t.tgtype & 8) <> 0, (t.tgtype & 2) <> 0
  from pg_trigger t
  where t.tgrelid = ('public.' || quote_ident(p_table))::regclass and not t.tgisinternal and t.tgenabled <> 'D';
$$;

-- Trouve (ou pose) une ligne d'essai dans une table en ajout seul, renvoie son ctid (toutes n'ont pas de colonne id).
create or replace function tests.ligne_pour_essai(p_table text) returns tid
language plpgsql as $$
declare
  v_ctid tid; jeu jsonb; valeurs jsonb := '{}'::jsonb;
begin
  execute format('select ctid from public.%I limit 1', p_table) into v_ctid;
  if v_ctid is not null then return v_ctid; end if;
  jeu := tests.jeu();
  if tests.colonne_parmi(('public.' || quote_ident(p_table))::regclass, array['client_id']) is not null then
    valeurs := jsonb_build_object('client_id', jeu ->> 'client_a');
  elsif tests.colonne_parmi(('public.' || quote_ident(p_table))::regclass, array['client_efface']) is not null then
    valeurs := jsonb_build_object('client_efface', jeu ->> 'client_b', 'nom_client', 'Client B — essai A5');
  end if;
  perform tests.inserer_minimal('public', p_table, valeurs);
  execute format('select ctid from public.%I limit 1', p_table) into v_ctid;
  return v_ctid;
end $$;

-- Les tests endossent le rôle authenticated puis rappellent ces aides : il faut qu'il puisse les exécuter.
-- Elles s'exécutent avec les droits de l'appelant (pas de SECURITY DEFINER) : aucune élévation possible.
grant usage on schema tests to authenticated;
grant execute on all functions in schema tests to authenticated;
alter default privileges in schema tests grant execute on functions to authenticated;

select 'pgTAP ' || extversion as installation from pg_extension where extname = 'pgtap';


-- 01 — pgTAP, schéma tests et objets du socle présents
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_01_installation() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next ok(exists (select 1 from pg_proc where proname = 'runtests'), 'pgTAP est chargée (runtests disponible)');
  return next has_schema('tests', 'le schéma tests existe');
  return next has_schema('private', 'le schéma private existe');
  return next has_function('private'::name, 'mes_clients'::name, 'private.mes_clients() existe');
  return next has_function('private'::name, 'lit_objet'::name, 'private.lit_objet() existe');
  return next has_function('private'::name, 'verifier_sauvegardes'::name, 'private.verifier_sauvegardes() existe');
  return next has_function('public'::name, 'verifier_journal_client'::name, 'public.verifier_journal_client() existe');
  return next has_table('public'::name, 'journal_opposable'::name, 'public.journal_opposable existe');
  return next has_table('private'::name, 'tables_locataires'::name, 'private.tables_locataires existe');
  return next has_table('private'::name, 'sauvegardes'::name, 'private.sauvegardes existe');
end $f$;



-- 02 — toute table publique à client_id est inscrite dans private.tables_locataires
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_02_tables_locataires_completes() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and c.column_name = 'client_id' and t.table_type = 'BASE TABLE'
      and c.table_name not in (select regexp_replace(nom, '^public\.', '') from private.tables_locataires)
    order by 1
  $q$, 'Aucune table publique à client_id n''échappe à private.tables_locataires (sinon l''effacement prouvé la rate)');
end $f$;



-- 03 — private.tables_locataires ne cite que des tables qui existent
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_03_tables_locataires_sans_fantome() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select nom from private.tables_locataires where to_regclass('public.' || quote_ident(regexp_replace(nom, '^public\.', ''))) is null
  $q$, 'Chaque entrée de tables_locataires désigne une table réelle');
  return next is_empty($q$ select nom from private.tables_locataires where ordre_effacement is null $q$, 'Chaque table locataire a un ordre d''effacement');
end $f$;



-- 04 — la RLS est activée sur chaque table locataire
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_04_rls_activee() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select tl.nom from private.tables_locataires tl
    join pg_class c on c.oid = to_regclass('public.' || quote_ident(regexp_replace(tl.nom, '^public\.', '')))
    where not c.relrowsecurity
  $q$, 'RLS activée (relrowsecurity) sur toutes les tables locataires');
end $f$;



-- 05 — chaque table locataire porte au moins une politique
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_05_politiques_presentes() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  -- Une table interne peut n'avoir aucune politique : RLS activée + aucun droit SELECT pour authenticated = tout refusé, c'est voulu.
  -- Ce qui est interdit : une table lisible par authenticated sans aucune politique (RLS seule ne dit pas qui lit quoi).
  return next is_empty($q$
    select tl.nom from private.tables_locataires tl
    where not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = regexp_replace(tl.nom, '^public\.', ''))
      and has_table_privilege('authenticated', to_regclass('public.' || quote_ident(regexp_replace(tl.nom, '^public\.', ''))), 'SELECT')
  $q$, 'Aucune table locataire lisible par authenticated sans politique');
  return next diag('Tables locataires sans politique mais fermées à authenticated (voulu) : ' || coalesce((
    select string_agg(regexp_replace(tl.nom, '^public\.', ''), ', ' order by tl.nom) from private.tables_locataires tl
    where not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = regexp_replace(tl.nom, '^public\.', ''))), 'aucune'));
end $f$;



-- 06 — aucune politique « true » n'ouvre une table locataire à anon ou authenticated
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_06_pas_de_politique_ouverte() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select p.tablename, p.policyname, p.cmd
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename in (select regexp_replace(nom, '^public\.', '') from private.tables_locataires)
      and p.permissive = 'PERMISSIVE'
      and (p.roles = '{public}'::name[] or 'authenticated' = any(p.roles) or 'anon' = any(p.roles))
      and (coalesce(p.qual, p.with_check) is null or regexp_replace(coalesce(p.qual, p.with_check), '[\s()]', '', 'g') = 'true')
    order by 1, 2
  $q$, 'Pas de politique permissive sans condition pour anon/authenticated sur une table locataire');
end $f$;



-- 07 — ni anon ni authenticated n'ont de droit sur une table du schéma private
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_07_private_sans_select() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select table_name, grantee, privilege_type from information_schema.role_table_grants
    where table_schema = 'private' and grantee in ('anon', 'authenticated') order by 1, 2, 3
  $q$, 'Aucun droit de table pour anon/authenticated dans private');
  return next ok(has_schema_privilege('authenticated', 'private', 'USAGE'),
    'authenticated garde USAGE sur private : indispensable pour que les politiques RLS puissent appeler private.mes_clients() (voir SECURITE.md)');
end $f$;



-- 08 — anon n'écrit sur aucune table locataire
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_08_anon_sans_ecriture() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select table_name, privilege_type from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon' and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
      and table_name in (select regexp_replace(nom, '^public\.', '') from private.tables_locataires)
    order by 1, 2
  $q$, 'anon : aucun INSERT/UPDATE/DELETE/TRUNCATE sur les tables locataires');
end $f$;



select * from runtests('tests'::name, '^test_(01|02|03|04|05|06|07|08)_');
