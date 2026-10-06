-- TOUT_1.sql — partie 1/4 de TOUT.sql (00_installation + tests 01 à 13). Lancer les quatre dans l'ordre.

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
      v := tests.valeur_parente(format('%I.%I', p_schema, p_table)::regclass, r.colonne, p_valeurs);
      if v is null then v := coalesce(tests.valeur_selon_check(format('%I.%I', p_schema, p_table)::regclass, r.colonne, typ), tests.valeur_exemple(typ)); end if;
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

-- Si la colonne est une clé étrangère mono-colonne, pose une ligne parente minimale (client_id propagé) et rend sa clé.
create or replace function tests.valeur_parente(p_table regclass, p_colonne name, p_valeurs jsonb) returns text
language plpgsql as $$
declare fk record; parent jsonb; valeurs jsonb := '{}'::jsonb; typ regtype; existante text;
begin
  select c.confrelid, (select attname from pg_attribute where attrelid = c.confrelid and attnum = c.confkey[1]) as colonne_parente,
         n.nspname as schema_parent, cl.relname as table_parente
    into fk
  from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
  join pg_class cl on cl.oid = c.confrelid join pg_namespace n on n.oid = cl.relnamespace
  where c.conrelid = p_table and c.contype = 'f' and array_length(c.conkey, 1) = 1 and a.attname = p_colonne
  limit 1;
  if fk is null or fk.table_parente = 'clients' then return null; end if;
  select atttypid::regtype into typ from pg_attribute where attrelid = p_table and attname = p_colonne;
  -- Table de référence (hors public, ou sans client_id) : on prend une valeur existante plutôt que d'en créer une.
  if fk.schema_parent <> 'public' or not exists (select 1 from pg_attribute where attrelid = fk.confrelid and attname = 'client_id') then
    execute format('select %I::text from %I.%I limit 1', fk.colonne_parente, fk.schema_parent, fk.table_parente) into existante;
    if existante is not null then return format('%L::%s', existante, typ); end if;
    if fk.schema_parent <> 'public' then return null; end if;
  end if;
  if p_valeurs ? 'client_id' and exists (select 1 from pg_attribute where attrelid = fk.confrelid and attname = 'client_id') then
    valeurs := jsonb_build_object('client_id', p_valeurs ->> 'client_id');
  end if;
  parent := tests.inserer_minimal(fk.schema_parent, fk.table_parente, valeurs);
  return format('%L::%s', parent ->> fk.colonne_parente, typ);
end $$;

-- Jeu d'essai : deux clients fictifs, deux utilisateurs, deux comptes. Renvoie les identifiants.
-- Tout est annulé par runtests() à la fin de chaque test.
create or replace function tests.jeu() returns jsonb
language plpgsql as $$
declare
  client_a uuid; client_b uuid; user_a uuid := gen_random_uuid(); user_b uuid := gen_random_uuid(); gerant_a uuid := gen_random_uuid();
  ligne jsonb;
  role_membre text; role_gerant text;
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
           (user_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a5-client-b@essai.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, false),
           (gerant_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a5-gerant-a@essai.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, false);
  exception when others then
    raise notice 'tests.jeu : auth.users non alimentée (%), on continue avec des uuid libres', sqlerrm;
  end;

  -- Rôles : un membre « simple » (collaborateur) pour A et B, un gérant pour A.
  role_membre := tests.role_admis('collaborateur');
  role_gerant := tests.role_admis('gerant');
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', user_a, 'client_id', client_a, 'role', role_membre, 'perimetre_total', true));
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', user_b, 'client_id', client_b, 'role', role_membre, 'perimetre_total', true));
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', gerant_a, 'client_id', client_a, 'role', role_gerant, 'perimetre_total', true));

  return jsonb_build_object('client_a', client_a, 'client_b', client_b, 'user_a', user_a, 'user_b', user_b, 'gerant_a', gerant_a, 'role_membre', role_membre, 'role_gerant', role_gerant);
end $$;

-- Un rôle de compte admis : p_prefere s'il est accepté par l'enum ou la contrainte CHECK de comptes.role, sinon le premier admis.
create or replace function tests.role_admis(p_prefere text) returns text
language sql stable as $$
  select coalesce(
    (select enumlabel::text from pg_enum e join pg_attribute a on a.atttypid = e.enumtypid
      where a.attrelid = 'public.comptes'::regclass and a.attname = 'role' and enumlabel = p_prefere),
    (select p_prefere from pg_constraint c where c.conrelid = 'public.comptes'::regclass and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ~ ('''' || p_prefere || '''') limit 1),
    (select enumlabel::text from pg_enum e join pg_attribute a on a.atttypid = e.enumtypid
      where a.attrelid = 'public.comptes'::regclass and a.attname = 'role' order by enumsortorder limit 1),
    (select (regexp_match(pg_get_constraintdef(c.oid), '''([^'']*)'''))[1] from pg_constraint c
      where c.conrelid = 'public.comptes'::regclass and c.contype = 'c' and pg_get_constraintdef(c.oid) ~ 'role' limit 1),
    p_prefere)
$$;

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

-- Une table publique existe-t-elle ici ? (certaines tables du cahier n'existent pas sur tous les environnements)
create or replace function tests.table_existe(p_table text) returns boolean
language sql stable as $$ select to_regclass('public.' || quote_ident(p_table)) is not null $$;

-- Écrit une ligne au journal opposable par la porte du socle (private.journaliser) ; à défaut, insertion directe.
create or replace function tests.journaliser(p_client uuid, p_action text, p_objet_type text default 'essai', p_objet_id text default 'x', p_donnees jsonb default '{}'::jsonb) returns void
language plpgsql as $$
begin
  if to_regprocedure('private.journaliser(uuid, text, text, text, jsonb, uuid)') is not null then
    perform private.journaliser(p_client, p_action, p_objet_type, p_objet_id, p_donnees, null::uuid);
  else
    perform tests.inserer_minimal('public', 'journal_opposable', jsonb_build_object('client_id', p_client, 'action', p_action, 'acteur_type', 'systeme', 'objet_type', p_objet_type, 'objet_id', p_objet_id, 'donnees', p_donnees));
  end if;
end $$;

-- Appelle une fonction de private en castant chaque argument positionnel vers son vrai type ; rend le résultat en jsonb.
create or replace function tests.appeler_privee(p_nom text, variadic p_valeurs text[]) returns jsonb
language plpgsql as $$
declare types text[]; appel text; args text := ''; i int; resultat jsonb;
begin
  select array_agg(format_type(u.t, null) order by u.o) into types
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  cross join lateral unnest(p.proargtypes) with ordinality u(t, o)
  where n.nspname = 'private' and p.proname = p_nom and p.pronargs = array_length(p_valeurs, 1);
  if types is null then raise exception 'tests.appeler_privee : private.%(%) introuvable (% arguments)', p_nom, array_to_string(p_valeurs, ', '), array_length(p_valeurs, 1); end if;
  for i in 1..array_length(p_valeurs, 1) loop
    args := args || case when i > 1 then ', ' else '' end || case when p_valeurs[i] is null then 'null' else format('%L', p_valeurs[i]) end || '::' || types[i];
  end loop;
  appel := format('select to_jsonb(private.%I(%s))', p_nom, args);
  execute appel into resultat;
  return resultat;
end $$;

-- Fonctions de private dont authenticated a légitimement besoin : (a) citées par une politique RLS, (b) appelées par
-- une fonction publique SECURITY INVOKER exécutable par authenticated, (c) appelées par un déclencheur SECURITY INVOKER
-- de private, (d) utilisées par une vue de public lisible par authenticated, (e) utilisées par un CHECK ou un DEFAULT
-- d'une table de public, (f) utilisées dans la clause WHEN d'un déclencheur d'une table de public ; puis fermeture transitive à travers les SECURITY INVOKER retenues. Les fonctions déclencheur
-- elles-mêmes n'ont jamais besoin d'EXECUTE. Même règle que omega/migrations/a5_01_private_execute.sql.
-- Rapide (6/10, la recette dépassait 2 minutes) : chaque texte (corps, CHECK, DEFAULT, WHEN) est lu UNE fois et découpé en
-- identifiants suivis de « ( » ; la jointure se fait ensuite par égalité de nom, sans expression régulière par paire.
-- Même résultat que la version par paires : un identifiant précédé d'un caractère hors [A-Za-z0-9_] et suivi de « ( ».
create or replace function tests.fonctions_private_requises() returns table(oid oid, nom text, raison text)
language sql stable as $$
  with recursive
  cibles as materialized (     -- les fonctions de private qui peuvent être requises
    select p.oid, p.proname::text as proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
  ),
  -- Qui appelle quelle fonction de private, d'après le corps : chaque corps découpé une fois en noms appelés.
  -- Inclusif à dessein : accorder une fonction de trop est bénin, en oublier une casse une écriture client.
  noms_appeles as materialized (
    select distinct q.oid as appelant, m[1] as nom
    from pg_proc q join pg_namespace s on s.oid = q.pronamespace
    cross join lateral regexp_matches(q.prosrc, '(?<![A-Za-z0-9_])([A-Za-z_][A-Za-z0-9_]*)\s*\(', 'g') as m
    where s.nspname in ('public', 'private') and q.prokind = 'f'
  ),
  appels as materialized (
    select a.appelant, c.oid as appelee from noms_appeles a join cibles c on c.proname = a.nom where c.oid <> a.appelant
  ),
  -- Vues de public lisibles par authenticated, et les fonctions dont elles dépendent (pg_depend via la règle : exact).
  vues_lisibles as materialized (
    select v.oid, v.relname from pg_class v join pg_namespace nv on nv.oid = v.relnamespace
    where nv.nspname = 'public' and v.relkind in ('v', 'm') and has_table_privilege('authenticated', v.oid, 'select')
  ),
  fonctions_des_vues as materialized (
    select distinct d.refobjid as fonction, vl.relname
    from pg_depend d join pg_rewrite rw on rw.oid = d.objid and d.classid = 'pg_rewrite'::regclass
    join vues_lisibles vl on vl.oid = rw.ev_class
    where d.refclassid = 'pg_proc'::regclass
  ),
  -- Fonctions publiques SECURITY INVOKER qui s'exécutent avec les droits du client.
  publiques_invoker as materialized (
    select q.oid, 'public.' || q.proname as nom
    from pg_proc q join pg_namespace m on m.oid = q.pronamespace
    where m.nspname = 'public' and q.prokind = 'f' and not q.prosecdef
      and (has_function_privilege('authenticated', q.oid, 'execute') or q.oid in (select fonction from fonctions_des_vues))
  ),
  -- Textes des CHECK, DEFAULT et clauses WHEN, lus une fois, découpés en noms appelés ; plus pg_depend (exact).
  checks as materialized (
    select con.oid, con.conname::text as conname, pg_get_constraintdef(con.oid) as def
    from pg_constraint con left join pg_class c on c.oid = con.conrelid left join pg_namespace nc on nc.oid = c.relnamespace
    where con.contype = 'c' and (con.contypid <> 0 or nc.nspname = 'public')
  ),
  defauts as materialized (
    select ad.oid, c.relname::text as relname, pg_get_expr(ad.adbin, ad.adrelid) as def
    from pg_attrdef ad join pg_class c on c.oid = ad.adrelid join pg_namespace nc on nc.oid = c.relnamespace
    where nc.nspname = 'public'
  ),
  declencheurs as materialized (
    select t.oid, t.tgname::text as tgname, c.relname::text as relname, t.tgfoid,
           substring(pg_get_triggerdef(t.oid) from 'WHEN .*$') as quand
    from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace nc on nc.oid = c.relnamespace
    where not t.tgisinternal and nc.nspname = 'public'
  ),
  requises as (
    -- (a) citées par une politique RLS (pg_depend : exact)
    select c.oid, c.proname, 'politique RLS'::text as raison
    from pg_depend d join cibles c on c.oid = d.refobjid
    where d.classid = 'pg_policy'::regclass and d.refclassid = 'pg_proc'::regclass
    union
    -- (b) appelées par une fonction publique SECURITY INVOKER exécutable par authenticated ou servie par une vue lisible
    select c.oid, c.proname, 'appelée par ' || pi.nom
    from publiques_invoker pi join appels a on a.appelant = pi.oid join cibles c on c.oid = a.appelee
    union
    -- (c) appelées par un déclencheur SECURITY INVOKER de private attaché à une table
    select c.oid, c.proname, 'appelée par le déclencheur private.' || t.proname
    from pg_proc t join pg_namespace nt on nt.oid = t.pronamespace
    join appels a on a.appelant = t.oid join cibles c on c.oid = a.appelee
    where nt.nspname = 'private' and t.prorettype = 'trigger'::regtype and not t.prosecdef
      and exists (select 1 from pg_trigger tg where tg.tgfoid = t.oid and not tg.tgisinternal)
    union
    -- (d) utilisées directement par une vue de public lisible par authenticated
    select c.oid, c.proname, 'vue public.' || f.relname
    from fonctions_des_vues f join cibles c on c.oid = f.fonction
    union
    -- (e1) utilisées par un CHECK d'une table de public ou d'un domaine
    select c.oid, c.proname, 'contrainte ' || k.conname
    from checks k join pg_depend d on d.classid = 'pg_constraint'::regclass and d.objid = k.oid and d.refclassid = 'pg_proc'::regclass
    join cibles c on c.oid = d.refobjid
    union
    select c.oid, c.proname, 'contrainte ' || k.conname
    from checks k cross join lateral regexp_matches(k.def, '(?<![A-Za-z0-9_])([A-Za-z_][A-Za-z0-9_]*)\s*\(', 'g') as m
    join cibles c on c.proname = m[1]
    union
    -- (e2) utilisées par un DEFAULT ou une colonne générée d'une table de public
    select c.oid, c.proname, 'défaut de public.' || x.relname
    from defauts x join pg_depend d on d.classid = 'pg_attrdef'::regclass and d.objid = x.oid and d.refclassid = 'pg_proc'::regclass
    join cibles c on c.oid = d.refobjid
    union
    select c.oid, c.proname, 'défaut de public.' || x.relname
    from defauts x cross join lateral regexp_matches(x.def, '(?<![A-Za-z0-9_])([A-Za-z_][A-Za-z0-9_]*)\s*\(', 'g') as m
    join cibles c on c.proname = m[1]
    union
    -- (f) utilisées dans la clause WHEN d'un déclencheur d'une table de public
    select c.oid, c.proname, 'clause WHEN du déclencheur ' || t.tgname || ' sur public.' || t.relname
    from declencheurs t join pg_depend d on d.classid = 'pg_trigger'::regclass and d.objid = t.oid and d.refclassid = 'pg_proc'::regclass
    join cibles c on c.oid = d.refobjid and c.oid <> t.tgfoid
    union
    select c.oid, c.proname, 'clause WHEN du déclencheur ' || t.tgname || ' sur public.' || t.relname
    from declencheurs t cross join lateral regexp_matches(t.quand, '(?<![A-Za-z0-9_])([A-Za-z_][A-Za-z0-9_]*)\s*\(', 'g') as m
    join cibles c on c.proname = m[1] and c.oid <> t.tgfoid
    where t.quand is not null
    union
    -- fermeture transitive : ce qu'appelle une fonction retenue qui s'exécute encore avec les droits du client (SECURITY INVOKER)
    select c.oid, c.proname, 'appelée par private.' || q.proname
    from requises x join pg_proc q on q.oid = x.oid join appels a on a.appelant = q.oid join cibles c on c.oid = a.appelee
    where not q.prosecdef
  )
  select oid, proname, string_agg(distinct raison, ' ; ') from requises group by oid, proname order by proname;
$$;

-- Le verdict de verifier_journal_client() signale-t-il une rupture ? Lecture tolérante à la forme du retour :
-- un booléen faux sous une clé « ok/valide/coherent/intact », une clé « rupture/faux/ecart » non nulle, ou un mot dans le texte.
create or replace function tests.verdict_signale_rupture(p_verdict jsonb) returns boolean
language sql immutable as $$
  select coalesce(p_verdict::text ~* '(rompu|invalide|cass[ée]e|erreur)', false)
      or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(p_verdict) = 'array' then p_verdict else jsonb_build_array(p_verdict) end) v
                 cross join lateral (select * from jsonb_each(case when jsonb_typeof(v) = 'object' then v else '{}'::jsonb end)) kv
                 where (kv.key ~* '(faus|ruptur|rompu|ecart|écart|invalide)' and jsonb_typeof(kv.value) <> 'null' and kv.value::text not in ('false', '0', '[]', '{}'))
                    or (kv.key ~* '^(ok|valide|coherent|cohérent|intact|chaine_ok|chaîne_ok)$' and kv.value::text = 'false'))
      or (jsonb_typeof(p_verdict) = 'array' and p_verdict @> '[false]'::jsonb)
$$;

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



-- 09 — private.mes_clients() ne rend rien sans JWT
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_09_mes_clients_sans_jwt() returns setof text
language plpgsql as $f$
declare
  n bigint;
begin
  perform tests.redevenir_admin();
  perform set_config('role', 'authenticated', true);
  begin
    execute 'select count(*) from private.mes_clients()' into n;
    return next is(n, 0::bigint, 'Sans JWT, mes_clients() est vide');
  exception when others then
    return next pass('Sans JWT, mes_clients() refuse : ' || sqlerrm);
  end;
  perform tests.redevenir_admin();
end $f$;



-- 10 — private.mes_clients() rend le client du compte endossé, et lui seul
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_10_mes_clients_avec_compte() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; present boolean; present_b boolean; n bigint;
begin
  jeu := tests.jeu();
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  execute format('select %L::uuid in (select * from private.mes_clients())', jeu ->> 'client_a') into present;
  execute format('select %L::uuid in (select * from private.mes_clients())', jeu ->> 'client_b') into present_b;
  execute 'select count(*) from private.mes_clients()' into n;
  return next ok(present, 'Le client A est dans mes_clients() pour l''utilisateur A');
  return next ok(not present_b, 'Le client B n''y est pas');
  return next is(n, 1::bigint, 'Exactement un client');
  perform tests.redevenir_admin();
end $f$;



-- 11 — un client ne lit pas le journal d'un autre
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_11_journal_isole_lecture() returns setof text
language plpgsql as $f$
declare
  jeu jsonb;
begin
  jeu := tests.jeu();
  perform tests.journaliser((jeu ->> 'client_b')::uuid, 'essai_a5');
  perform tests.endosser((jeu ->> 'gerant_a')::uuid);
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L', jeu ->> 'client_b')), 0::bigint, 'Le gérant de A ne voit aucune ligne du journal de B');
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L', jeu ->> 'client_b')), 0::bigint, 'Le collaborateur de A non plus');
  perform tests.redevenir_admin();
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L and action like %L', jeu ->> 'client_b', 'essai_a5%')), 1::bigint, 'La ligne de B existe pourtant (vue en admin)');
end $f$;



-- 12 — un client lit bien son propre journal
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_12_journal_lecture_propre() returns setof text
language plpgsql as $f$
declare
  jeu jsonb;
begin
  jeu := tests.jeu();
  perform tests.journaliser((jeu ->> 'client_a')::uuid, 'essai_a5');
  perform tests.endosser((jeu ->> 'gerant_a')::uuid);
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L and action like %L', jeu ->> 'client_a', 'essai_a5%')), 1::bigint, 'Le gérant de A voit la ligne de journal de A');
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  return next diag('Collaborateur de A : ' || tests.compter('public', 'journal_opposable', format('client_id = %L and action like %L', jeu ->> 'client_a', 'essai_a5%')) || ' ligne(s) visible(s) (le socle réserve le journal aux gérants et admins : 0 attendu là-bas)');
  perform tests.redevenir_admin();
end $f$;



-- 13 — un client ne peut pas écrire une ligne au nom d'un autre client
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_13_ecriture_chez_autrui_refusee() returns setof text
language plpgsql as $f$
declare
  jeu jsonb;
begin
  jeu := tests.jeu();
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  return next throws_ok(
    format('select tests.inserer_minimal(''public'', ''acces_objets'', %L::jsonb)', jsonb_build_object('client_id', jeu ->> 'client_b', 'objet_type', 'essai_a5', 'objet_id', gen_random_uuid(), 'user_id', jeu ->> 'user_a')::text),
    '42501', null, 'INSERT dans acces_objets avec le client_id de B, par A : refusé (42501)');
  perform tests.redevenir_admin();
end $f$;



select * from runtests('tests'::name, '^test_(01|02|03|04|05|06|07|08|09|10|11|12|13)_');
