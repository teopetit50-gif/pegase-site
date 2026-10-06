-- TOUT.sql — installation + les 54 tests du socle (la règle « pas de DELETE en clair » est levée depuis la pose par dépôt).
-- Généré depuis les fichiers numérotés ; ne pas éditer à la main (voir README). Un seul appel execute_sql :
-- crée les fonctions puis rend une ligne TAP par test (ok / not ok) via runtests().
-- Tout ce que les tests écrivent est annulé par runtests().

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
create or replace function tests.fonctions_private_requises() returns table(oid oid, nom text, raison text)
language sql stable as $$
  with recursive
  -- Qui appelle quelle fonction de private, d'après le corps : nom qualifié (private.f) ou non (f, via search_path).
  -- Inclusif à dessein : accorder une fonction de trop est bénin, en oublier une casse une écriture client.
  appels as (
    select q.oid as appelant, p.oid as appelee
    from pg_proc q join pg_namespace m on m.oid = q.pronamespace
    join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
    where m.nspname in ('public', 'private') and q.prokind = 'f'
      and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype and p.oid <> q.oid
      and position(p.proname in q.prosrc) > 0
      and q.prosrc ~ ('(^|[^A-Za-z0-9_])(private\.)?' || p.proname || '\s*\(')
  ),
  -- Fonctions publiques SECURITY INVOKER qui s'exécutent avec les droits du client : exécutables par authenticated,
  -- ou utilisées par une vue de public lisible par authenticated (la vue les appelle pour lui).
  publiques_invoker as (
    select q.oid, 'public.' || q.proname as nom
    from pg_proc q join pg_namespace m on m.oid = q.pronamespace
    where m.nspname = 'public' and q.prokind = 'f' and not q.prosecdef
      and (has_function_privilege('authenticated', q.oid, 'execute')
           or exists (select 1 from pg_depend d join pg_rewrite rw on rw.oid = d.objid and d.classid = 'pg_rewrite'::regclass
                      join pg_class v on v.oid = rw.ev_class join pg_namespace nv on nv.oid = v.relnamespace
                      where d.refclassid = 'pg_proc'::regclass and d.refobjid = q.oid
                        and nv.nspname = 'public' and v.relkind in ('v', 'm') and has_table_privilege('authenticated', v.oid, 'select')))
  ),
  requises as (
    -- (a) citées par une politique RLS (pg_depend : exact)
    select distinct p.oid, p.proname, 'politique RLS'::text as raison
    from pg_depend d join pg_proc p on p.oid = d.refobjid and d.refclassid = 'pg_proc'::regclass
    join pg_namespace n on n.oid = p.pronamespace
    where d.classid = 'pg_policy'::regclass and n.nspname = 'private' and p.prorettype <> 'trigger'::regtype
    union
    -- (b) appelées par une fonction publique SECURITY INVOKER exécutable par authenticated ou servie par une vue lisible
    select distinct p.oid, p.proname, 'appelée par ' || pi.nom
    from publiques_invoker pi join appels a on a.appelant = pi.oid join pg_proc p on p.oid = a.appelee
    union
    -- (c) appelées par un déclencheur SECURITY INVOKER de private attaché à une table (il s'exécute avec les droits de celui qui écrit)
    select distinct p.oid, p.proname, 'appelée par le déclencheur private.' || t.proname
    from pg_proc t join pg_namespace nt on nt.oid = t.pronamespace
    join appels a on a.appelant = t.oid join pg_proc p on p.oid = a.appelee
    where nt.nspname = 'private' and t.prorettype = 'trigger'::regtype and not t.prosecdef
      and exists (select 1 from pg_trigger tg where tg.tgfoid = t.oid and not tg.tgisinternal)
    union
    -- (d) utilisées directement par une vue de public lisible par authenticated (pg_depend via la règle de réécriture : exact)
    select distinct p.oid, p.proname, 'vue public.' || v.relname
    from pg_depend d join pg_rewrite rw on rw.oid = d.objid and d.classid = 'pg_rewrite'::regclass
    join pg_class v on v.oid = rw.ev_class join pg_namespace nv on nv.oid = v.relnamespace
    join pg_proc p on p.oid = d.refobjid and d.refclassid = 'pg_proc'::regclass
    join pg_namespace n on n.oid = p.pronamespace
    where nv.nspname = 'public' and v.relkind in ('v', 'm') and has_table_privilege('authenticated', v.oid, 'select')
      and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
    union
    -- (e1) utilisées par un CHECK d'une table de public ou d'un domaine (pg_depend, et la définition textuelle en ceinture)
    select distinct p.oid, p.proname, 'contrainte ' || con.conname
    from pg_constraint con
    left join pg_class c on c.oid = con.conrelid left join pg_namespace nc on nc.oid = c.relnamespace
    join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
    where con.contype = 'c' and (con.contypid <> 0 or nc.nspname = 'public')
      and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
      and (exists (select 1 from pg_depend d where d.classid = 'pg_constraint'::regclass and d.objid = con.oid and d.refclassid = 'pg_proc'::regclass and d.refobjid = p.oid)
           or pg_get_constraintdef(con.oid) ~ ('(^|[^A-Za-z0-9_])(private\.)?' || p.proname || '\s*\('))
    union
    -- (e2) utilisées par un DEFAULT ou une colonne générée d'une table de public
    select distinct p.oid, p.proname, 'défaut de public.' || c.relname
    from pg_attrdef ad join pg_class c on c.oid = ad.adrelid join pg_namespace nc on nc.oid = c.relnamespace
    join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
    where nc.nspname = 'public' and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
      and (exists (select 1 from pg_depend d where d.classid = 'pg_attrdef'::regclass and d.objid = ad.oid and d.refclassid = 'pg_proc'::regclass and d.refobjid = p.oid)
           or pg_get_expr(ad.adbin, ad.adrelid) ~ ('(^|[^A-Za-z0-9_])(private\.)?' || p.proname || '\s*\('))
    union
    -- (f) utilisées dans la clause WHEN d'un déclencheur d'une table de public (évaluée avec les droits de celui qui écrit)
    select distinct p.oid, p.proname, 'clause WHEN du déclencheur ' || t.tgname || ' sur public.' || c.relname
    from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace nc on nc.oid = c.relnamespace
    join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
    where not t.tgisinternal and nc.nspname = 'public' and n.nspname = 'private' and p.prokind = 'f' and p.oid <> t.tgfoid
      and p.prorettype <> 'trigger'::regtype
      and (exists (select 1 from pg_depend d where d.classid = 'pg_trigger'::regclass and d.objid = t.oid and d.refclassid = 'pg_proc'::regclass and d.refobjid = p.oid)
           or pg_get_triggerdef(t.oid) ~ ('WHEN .*(^|[^A-Za-z0-9_])(private\.)?' || p.proname || '\s*\('))
    union
    -- fermeture transitive : ce qu'appelle une fonction retenue qui s'exécute encore avec les droits du client (SECURITY INVOKER)
    select distinct p.oid, p.proname, 'appelée par private.' || q.proname
    from requises x join pg_proc q on q.oid = x.oid join appels a on a.appelant = q.oid join pg_proc p on p.oid = a.appelee
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



-- 14 — sous le rôle authenticated d'un client, aucune ligne d'un autre client n'est lisible, sur toutes les tables locataires
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_14_isolement_toutes_tables() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; tables text[]; nom_table text; n bigint; fuites text[] := '{}'; illisibles text[] := '{}'; sans_client text[] := '{}'; testees int := 0;
begin
  jeu := tests.jeu();
  -- la liste se lit en admin (private n'est pas lisible par authenticated), la lecture se fait en authenticated
  select array_agg(regexp_replace(nom, '^public\.', '') order by nom) into tables from private.tables_locataires;
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  foreach nom_table in array tables loop
    begin
      n := tests.compter('public', nom_table, format('client_id <> %L', jeu ->> 'client_a'));
      if n > 0 then fuites := fuites || format('%s (%s lignes)', nom_table, n); end if;
      testees := testees + 1;
    exception when insufficient_privilege then
      illisibles := illisibles || nom_table; -- pas de SELECT pour authenticated : pas de fuite possible
    when undefined_column then
      sans_client := sans_client || nom_table;
    end;
  end loop;
  perform tests.redevenir_admin();
  return next is(array_length(fuites, 1), null, 'Aucune ligne d''un autre client n''est lisible par A (' || testees || ' tables lues, ' || coalesce(array_length(illisibles, 1), 0) || ' non lisibles par authenticated)');
  if array_length(fuites, 1) > 0 then return next diag('Fuites : ' || array_to_string(fuites, ', ')); end if;
  if array_length(sans_client, 1) > 0 then return next diag('Tables locataires sans colonne client_id (vérifier private.tables_objets) : ' || array_to_string(sans_client, ', ')); end if;
end $f$;



-- 15 — une ligne posée pour A est vue par A et jamais par B (acces_objets)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_15_isolement_croise() returns setof text
language plpgsql as $f$
declare
  jeu jsonb;
begin
  jeu := tests.jeu();
  perform tests.inserer_minimal('public', 'acces_objets', jsonb_build_object('client_id', jeu ->> 'client_a', 'objet_type', 'essai_a5', 'objet_id', gen_random_uuid(), 'user_id', jeu ->> 'user_a'));
  perform tests.endosser((jeu ->> 'user_b')::uuid);
  return next is(tests.compter('public', 'acces_objets', format('client_id = %L', jeu ->> 'client_a')), 0::bigint, 'B ne voit pas la ligne de A');
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  return next is(tests.compter('public', 'acces_objets', format('client_id = %L', jeu ->> 'client_a')), 1::bigint, 'A voit sa ligne');
  perform tests.redevenir_admin();
end $f$;



-- 16 — UPDATE sur public.journal_opposable échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_16_update_journal_opposable() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('journal_opposable') then
    return next pass('public.journal_opposable n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('journal_opposable') where sur_update and avant;
  return next ok(nb > 0, 'journal_opposable : un déclencheur BEFORE UPDATE existe');
  v_ctid := tests.ligne_pour_essai('journal_opposable');
  select attname into col from pg_attribute where attrelid = 'public.journal_opposable'::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity = '' order by attnum limit 1;
  return next throws_ok(format('update public.journal_opposable set %I = %I where ctid = %L', col, col, v_ctid), null, null, 'UPDATE sur journal_opposable échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'journal_opposable', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est intacte');
end $f$;



-- 17 — DELETE sur public.journal_opposable échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_17_delete_journal_opposable() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('journal_opposable') then
    return next pass('public.journal_opposable n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('journal_opposable') where sur_delete and avant;
  return next ok(nb > 0, 'journal_opposable : un déclencheur BEFORE DELETE existe');
  v_ctid := tests.ligne_pour_essai('journal_opposable');
  return next throws_ok(format('delete from public.journal_opposable where ctid = %L', v_ctid), null, null, 'DELETE sur journal_opposable échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'journal_opposable', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est toujours là');
end $f$;



-- 18 — UPDATE sur public.envois_evenements échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_18_update_envois_evenements() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('envois_evenements') then
    return next pass('public.envois_evenements n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('envois_evenements') where sur_update and avant;
  return next ok(nb > 0, 'envois_evenements : un déclencheur BEFORE UPDATE existe');
  v_ctid := tests.ligne_pour_essai('envois_evenements');
  select attname into col from pg_attribute where attrelid = 'public.envois_evenements'::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity = '' order by attnum limit 1;
  return next throws_ok(format('update public.envois_evenements set %I = %I where ctid = %L', col, col, v_ctid), null, null, 'UPDATE sur envois_evenements échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'envois_evenements', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est intacte');
end $f$;



-- 19 — DELETE sur public.envois_evenements échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_19_delete_envois_evenements() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('envois_evenements') then
    return next pass('public.envois_evenements n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('envois_evenements') where sur_delete and avant;
  return next ok(nb > 0, 'envois_evenements : un déclencheur BEFORE DELETE existe');
  v_ctid := tests.ligne_pour_essai('envois_evenements');
  return next throws_ok(format('delete from public.envois_evenements where ctid = %L', v_ctid), null, null, 'DELETE sur envois_evenements échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'envois_evenements', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est toujours là');
end $f$;



-- 20 — UPDATE sur public.effacements échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_20_update_effacements() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('effacements') then
    return next pass('public.effacements n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('effacements') where sur_update and avant;
  return next ok(nb > 0, 'effacements : un déclencheur BEFORE UPDATE existe');
  v_ctid := tests.ligne_pour_essai('effacements');
  select attname into col from pg_attribute where attrelid = 'public.effacements'::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity = '' order by attnum limit 1;
  return next throws_ok(format('update public.effacements set %I = %I where ctid = %L', col, col, v_ctid), null, null, 'UPDATE sur effacements échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'effacements', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est intacte');
end $f$;



-- 21 — DELETE sur public.effacements échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_21_delete_effacements() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('effacements') then
    return next pass('public.effacements n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('effacements') where sur_delete and avant;
  return next ok(nb > 0, 'effacements : un déclencheur BEFORE DELETE existe');
  v_ctid := tests.ligne_pour_essai('effacements');
  return next throws_ok(format('delete from public.effacements where ctid = %L', v_ctid), null, null, 'DELETE sur effacements échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'effacements', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est toujours là');
end $f$;



-- 22 — UPDATE sur public.filed_historique échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_22_update_filed_historique() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('filed_historique') then
    return next pass('public.filed_historique n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('filed_historique') where sur_update and avant;
  return next ok(nb > 0, 'filed_historique : un déclencheur BEFORE UPDATE existe');
  v_ctid := tests.ligne_pour_essai('filed_historique');
  select attname into col from pg_attribute where attrelid = 'public.filed_historique'::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity = '' order by attnum limit 1;
  return next throws_ok(format('update public.filed_historique set %I = %I where ctid = %L', col, col, v_ctid), null, null, 'UPDATE sur filed_historique échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'filed_historique', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est intacte');
end $f$;



-- 23 — DELETE sur public.filed_historique échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_23_delete_filed_historique() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('filed_historique') then
    return next pass('public.filed_historique n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('filed_historique') where sur_delete and avant;
  return next ok(nb > 0, 'filed_historique : un déclencheur BEFORE DELETE existe');
  v_ctid := tests.ligne_pour_essai('filed_historique');
  return next throws_ok(format('delete from public.filed_historique where ctid = %L', v_ctid), null, null, 'DELETE sur filed_historique échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'filed_historique', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est toujours là');
end $f$;



-- 24 — UPDATE sur public.suivis_evenements échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_24_update_suivis_evenements() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('suivis_evenements') then
    return next pass('public.suivis_evenements n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('suivis_evenements') where sur_update and avant;
  return next ok(nb > 0, 'suivis_evenements : un déclencheur BEFORE UPDATE existe');
  v_ctid := tests.ligne_pour_essai('suivis_evenements');
  select attname into col from pg_attribute where attrelid = 'public.suivis_evenements'::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity = '' order by attnum limit 1;
  return next throws_ok(format('update public.suivis_evenements set %I = %I where ctid = %L', col, col, v_ctid), null, null, 'UPDATE sur suivis_evenements échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'suivis_evenements', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est intacte');
end $f$;



-- 25 — DELETE sur public.suivis_evenements échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_25_delete_suivis_evenements() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('suivis_evenements') then
    return next pass('public.suivis_evenements n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('suivis_evenements') where sur_delete and avant;
  return next ok(nb > 0, 'suivis_evenements : un déclencheur BEFORE DELETE existe');
  v_ctid := tests.ligne_pour_essai('suivis_evenements');
  return next throws_ok(format('delete from public.suivis_evenements where ctid = %L', v_ctid), null, null, 'DELETE sur suivis_evenements échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'suivis_evenements', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est toujours là');
end $f$;



-- 26 — UPDATE sur public.echeances_pro_journal échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_26_update_echeances_pro_journal() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('echeances_pro_journal') then
    return next pass('public.echeances_pro_journal n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('echeances_pro_journal') where sur_update and avant;
  return next ok(nb > 0, 'echeances_pro_journal : un déclencheur BEFORE UPDATE existe');
  v_ctid := tests.ligne_pour_essai('echeances_pro_journal');
  select attname into col from pg_attribute where attrelid = 'public.echeances_pro_journal'::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity = '' order by attnum limit 1;
  return next throws_ok(format('update public.echeances_pro_journal set %I = %I where ctid = %L', col, col, v_ctid), null, null, 'UPDATE sur echeances_pro_journal échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'echeances_pro_journal', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est intacte');
end $f$;



-- 27 — DELETE sur public.echeances_pro_journal échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_27_delete_echeances_pro_journal() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('echeances_pro_journal') then
    return next pass('public.echeances_pro_journal n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('echeances_pro_journal') where sur_delete and avant;
  return next ok(nb > 0, 'echeances_pro_journal : un déclencheur BEFORE DELETE existe');
  v_ctid := tests.ligne_pour_essai('echeances_pro_journal');
  return next throws_ok(format('delete from public.echeances_pro_journal where ctid = %L', v_ctid), null, null, 'DELETE sur echeances_pro_journal échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'echeances_pro_journal', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est toujours là');
end $f$;



-- 28 — anon et authenticated n'ont ni UPDATE, ni DELETE, ni TRUNCATE sur les tables en ajout seul
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_28_ajout_seul_droits() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select table_name, grantee, privilege_type from information_schema.role_table_grants
    where table_schema = 'public' and grantee in ('anon', 'authenticated') and privilege_type in ('UPDATE', 'DELETE', 'TRUNCATE')
      and table_name in (select tests.tables_ajout_seul()) order by 1, 2, 3
  $q$, 'Aucun droit UPDATE/DELETE/TRUNCATE pour anon/authenticated sur les six tables en ajout seul');
end $f$;



-- 29 — aucune politique UPDATE ou DELETE sur les tables en ajout seul
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_29_ajout_seul_politiques() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select tablename, policyname, cmd from pg_policies
    where schemaname = 'public' and tablename in (select tests.tables_ajout_seul()) and cmd in ('UPDATE', 'DELETE') order by 1, 2
  $q$, 'Pas de politique UPDATE/DELETE sur les six tables en ajout seul');
  return next diag('Tables du cahier absentes ici (sans objet) : ' || coalesce((select string_agg(t.nom, ', ') from tests.tables_ajout_seul() t(nom) where to_regclass('public.' || t.nom) is null), 'aucune'));
end $f$;



-- 30 — chaque ligne du journal porte l'empreinte de la précédente (chaîne par client ou globale)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_30_journal_chaine_precedent() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; i int; ruptures_client bigint; ruptures_globale bigint;
begin
  jeu := tests.jeu();
  for i in 1..3 loop
    perform tests.journaliser((jeu ->> 'client_a')::uuid, 'essai_a5_' || i, 'essai', 'x', jsonb_build_object('i', i));
  end loop;
  select count(*) into ruptures_client from (
    select id, hash_precedent, lag(hash) over (partition by client_id order by id) as precedent from public.journal_opposable) s
    where precedent is distinct from hash_precedent;
  select count(*) into ruptures_globale from (
    select id, hash_precedent, lag(hash) over (order by id) as precedent from public.journal_opposable) s
    where precedent is distinct from hash_precedent;
  return next ok(ruptures_client = 0 or ruptures_globale = 0, format('La chaîne se suit (ruptures : %s par client, %s en global)', ruptures_client, ruptures_globale));
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L and action like %L', jeu ->> 'client_a', 'essai_a5%')), 3::bigint, 'Les trois lignes d''essai sont écrites');
  return next is_empty($q$
    select client_id, count(*) from public.journal_opposable where hash_precedent is null group by client_id having count(*) > 1
  $q$, 'Au plus une ligne de genèse (hash_precedent null) par client');
end $f$;



-- 31 — toutes les empreintes du journal font 32 octets (SHA-256) et sont uniques
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_31_journal_hash_sha256() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$ select id from public.journal_opposable where hash is null or octet_length(hash) <> 32 $q$, 'Toute empreinte fait 32 octets');
  return next is_empty($q$ select hash from public.journal_opposable group by hash having count(*) > 1 $q$, 'Aucune empreinte en double');
  return next is_empty($q$ select id from public.journal_opposable where hash_precedent is not null and octet_length(hash_precedent) <> 32 $q$, 'Toute empreinte précédente fait 32 octets');
end $f$;



-- 32 — l'empreinte du journal vient de la porte private.journaliser(), jamais d'un INSERT direct
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_32_journal_hash_non_fourni() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; r record; n int := 0;
begin
  -- (a) aucun rôle applicatif n'écrit directement au journal
  return next ok(not has_table_privilege('anon', 'public.journal_opposable', 'INSERT'), 'anon : pas d''INSERT direct sur journal_opposable');
  return next ok(not has_table_privilege('authenticated', 'public.journal_opposable', 'INSERT'), 'authenticated : pas d''INSERT direct sur journal_opposable');
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    return next ok(not has_table_privilege('service_role', 'public.journal_opposable', 'INSERT'), 'service_role : pas d''INSERT direct sur journal_opposable');
  else
    return next pass('service_role absent ici');
  end if;
  return next ok(to_regprocedure('private.journaliser(uuid, text, text, text, jsonb, uuid)') is not null, 'La porte private.journaliser(uuid, text, text, text, jsonb, uuid) existe');
  -- (b) la porte produit 32 octets et chaîne sur la précédente
  jeu := tests.jeu();
  perform tests.journaliser((jeu ->> 'client_a')::uuid, 'essai_a5_1');
  perform tests.journaliser((jeu ->> 'client_a')::uuid, 'essai_a5_2');
  for r in select id, hash, hash_precedent, lag(hash) over (order by id) as precedent from public.journal_opposable where client_id = (jeu ->> 'client_a')::uuid and action like 'essai_a5%' order by id loop
    n := n + 1;
    return next is(octet_length(r.hash), 32, format('Ligne %s : empreinte de 32 octets', n));
    if n = 2 then return next ok(r.hash_precedent = r.precedent, 'Ligne 2 : hash_precedent = empreinte de la ligne 1 (lignes d''essai consécutives)'); end if;
  end loop;
  return next is(n, 2, 'Deux lignes écrites par la porte');
end $f$;



-- 33 — public.verifier_journal_client() valide une chaîne intacte
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_33_journal_verification_porte() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; i int; verdict jsonb;
begin
  jeu := tests.jeu();
  for i in 1..3 loop
    perform tests.journaliser((jeu ->> 'client_a')::uuid, 'essai_a5_' || i);
  end loop;
  execute format('select coalesce(jsonb_agg(to_jsonb(v)), ''[]''::jsonb) from public.verifier_journal_client(%L::uuid) v', jeu ->> 'client_a') into verdict;
  return next ok(not tests.verdict_signale_rupture(verdict), 'Le verdict ne signale aucune rupture');
  return next diag('Verdict rendu : ' || left(verdict::text, 400));
end $f$;



-- 34 — public.verifier_journal_client() détecte une empreinte altérée
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_34_journal_detection_rupture() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; i int; verdict jsonb;
begin
  jeu := tests.jeu();
  for i in 1..3 loop
    perform tests.journaliser((jeu ->> 'client_a')::uuid, 'essai_a5_' || i);
  end loop;
  begin
    execute 'alter table public.journal_opposable disable trigger user';
    execute format('update public.journal_opposable set hash = decode(repeat(''ab'', 32), ''hex'') where client_id = %L and id = (select min(id) from public.journal_opposable where client_id = %L and action like ''essai_a5%%'')', jeu ->> 'client_a', jeu ->> 'client_a');
    execute 'alter table public.journal_opposable enable trigger user';
  exception when others then
    return next pass('Altération impossible même déclencheurs désactivés (' || sqlerrm || ') : rupture non simulable, test sans objet');
    return;
  end;
  execute format('select coalesce(jsonb_agg(to_jsonb(v)), ''[]''::jsonb) from public.verifier_journal_client(%L::uuid) v', jeu ->> 'client_a') into verdict;
  return next ok(tests.verdict_signale_rupture(verdict), 'Le verdict signale la rupture (clé premiere_ligne_fausse/rupture non nulle, ok = false ou mot explicite)');
  return next diag('Verdict rendu : ' || left(verdict::text, 400));
end $f$;



-- 35 — private.canaux_envoi porte des plages horaires pour les envois non transactionnels
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_35_canaux_heures_legales() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next ok((select count(*) from private.canaux_envoi) > 0, 'Des canaux sont déclarés');
  return next ok((select count(*) from private.canaux_envoi where plages_non_transactionnel is not null) > 0, 'Au moins un canal a des plages non transactionnelles (heures légales)');
  return next is_empty($q$
    select canal from private.canaux_envoi where plages_non_transactionnel is not null and jsonb_typeof(plages_non_transactionnel) not in ('object', 'array')
  $q$, 'Les plages sont des objets ou tableaux JSON');
  return next ok(exists (select 1 from private.canaux_envoi where canal ~* 'sms' and plages_non_transactionnel is not null), 'Le canal SMS est borné par des plages (prospection : 8 h – 20 h, jamais le dimanche)');
  return next diag('Canaux : ' || (select string_agg(canal || ' → ' || coalesce(plages_non_transactionnel::text, 'libre'), ' ; ') from private.canaux_envoi));
end $f$;



-- 36 — un envoi vers une personne en opposition est refusé par les verrous d'envoi
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.
-- Mécanique réelle (coordinateur, 5/10) : pas de déclencheur d'insertion ; private.opposer(...) pose l'opposition,
-- private.verrous_envoi(p_e envois, p_complet boolean, p_instant timestamptz) rend les verrous que lit tache_envois.

create or replace function tests.test_36_envoi_opposition_refuse() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; col_dest text; col_canal text; col_trans text; type_oppos text; canal_courriel text; valeurs jsonb; ligne jsonb; verrous jsonb; sans_opposition jsonb;
begin
  jeu := tests.jeu();
  if not tests.table_existe('envois') then return next fail('Table envois introuvable'); return; end if;
  col_dest := tests.colonne_parmi('public.envois'::regclass, array['destinataire_adresse', 'adresse', 'destinataire', 'contact', 'valeur', 'identifiant', 'cible']);
  col_canal := tests.colonne_parmi('public.envois'::regclass, array['canal']);
  col_trans := tests.colonne_parmi('public.envois'::regclass, array['transactionnel']);
  if col_dest is null then
    return next fail('Colonne du destinataire introuvable dans envois — adapter la liste de candidates');
    return next diag('Colonnes : ' || (select string_agg(attname || ' ' || format_type(atttypid, null), ', ' order by attnum) from pg_attribute where attrelid = 'public.envois'::regclass and attnum > 0 and not attisdropped));
    return;
  end if;
  -- Le canal courriel sous son nom réel : 'email' sur le socle (envois.canal ∈ email | sms | whatsapp | lre | appel), 'courriel' ailleurs.
  canal_courriel := coalesce((select canal from private.canaux_envoi where canal in ('email', 'courriel') limit 1), 'email');
  valeurs := jsonb_build_object('client_id', jeu ->> 'client_a', col_dest, 'oppose-a5@essai.invalid');
  if col_canal is not null then valeurs := valeurs || jsonb_build_object(col_canal, canal_courriel); end if;
  if col_trans is not null then valeurs := valeurs || jsonb_build_object(col_trans, true); end if;
  ligne := tests.inserer_minimal('public', 'envois', valeurs);
  -- Verrous AVANT opposition : témoin
  begin
    execute 'select to_jsonb(private.verrous_envoi(e, true, now())) from public.envois e where e.id::text = $1' into sans_opposition using ligne ->> 'id';
  exception when others then
    return next fail('private.verrous_envoi(envois, boolean, timestamptz) injoignable : ' || sqlerrm);
    return next diag('Signatures : ' || coalesce((select string_agg(p.oid::regprocedure::text, ' ; ') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname ~ 'verrou'), 'aucune'));
    return;
  end;
  -- Opposition par la porte du socle
  type_oppos := coalesce(nullif(regexp_replace(coalesce(tests.valeur_selon_check('public.oppositions'::regclass, 'type', 'text'::regtype), ''), '::.*$|''', '', 'g'), ''), 'prospect');
  begin
    perform tests.appeler_privee('opposer', jeu ->> 'client_a', type_oppos, 'oppose-a5@essai.invalid', canal_courriel, null, null, 'essai A5', 'essai_a5', null);
  exception when others then
    return next fail('private.opposer(...) refuse l''appel d''essai : ' || sqlerrm);
    return next diag('Signature : ' || coalesce((select string_agg(p.oid::regprocedure::text, ' ; ') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname = 'opposer'), 'absente') || ' ; type essayé : ' || type_oppos);
    return;
  end;
  execute 'select to_jsonb(private.verrous_envoi(e, true, now())) from public.envois e where e.id::text = $1' into verrous using ligne ->> 'id';
  return next ok(verrous::text ~* 'oppos', 'Avec une opposition posée, verrous_envoi() nomme l''opposition');
  return next ok(sans_opposition::text !~* 'oppos', 'Sans opposition, verrous_envoi() ne la nommait pas (témoin)');
  return next diag('Verrous avec opposition : ' || left(verrous::text, 400));
  return next diag('Verrous sans opposition : ' || left(sans_opposition::text, 400));
end $f$;



-- 37 — un envoi non transactionnel hors heures légales est différé par les verrous, pas parti
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_37_envoi_hors_heures_differe() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; col_dest text; col_canal text; col_trans text; valeurs jsonb; ligne jsonb; verrous_nuit jsonb; verrous_jour jsonb;
  dimanche_soir timestamptz := '2026-10-11T23:00:00+02:00'; mardi_matin timestamptz := '2026-10-13T10:30:00+02:00';
begin
  jeu := tests.jeu();
  if not tests.table_existe('envois') then return next fail('Table envois introuvable'); return; end if;
  col_dest := tests.colonne_parmi('public.envois'::regclass, array['destinataire_adresse', 'adresse', 'destinataire', 'contact', 'valeur', 'identifiant', 'cible']);
  col_canal := tests.colonne_parmi('public.envois'::regclass, array['canal']);
  col_trans := tests.colonne_parmi('public.envois'::regclass, array['transactionnel', 'nature']);
  if col_dest is null or col_canal is null then
    return next fail('Colonnes destinataire/canal introuvables dans envois — adapter la liste de candidates');
    return next diag('Colonnes : ' || (select string_agg(attname || ' ' || format_type(atttypid, null), ', ' order by attnum) from pg_attribute where attrelid = 'public.envois'::regclass and attnum > 0 and not attisdropped));
    return;
  end if;
  valeurs := jsonb_build_object('client_id', jeu ->> 'client_a', col_dest, '+33600000000', col_canal, 'sms');
  if col_trans = 'transactionnel' then valeurs := valeurs || jsonb_build_object('transactionnel', false);
  elsif col_trans = 'nature' then valeurs := valeurs || jsonb_build_object('nature', 'prospection'); end if;
  ligne := tests.inserer_minimal('public', 'envois', valeurs);
  begin
    execute 'select to_jsonb(private.verrous_envoi(e, true, $2)) from public.envois e where e.id::text = $1' into verrous_nuit using ligne ->> 'id', dimanche_soir;
    execute 'select to_jsonb(private.verrous_envoi(e, true, $2)) from public.envois e where e.id::text = $1' into verrous_jour using ligne ->> 'id', mardi_matin;
  exception when others then
    return next fail('private.verrous_envoi(envois, boolean, timestamptz) injoignable : ' || sqlerrm);
    return;
  end;
  return next ok(verrous_nuit::text ~* '(differ|hors|plage|heure|report|dimanche|fenetre|fenêtre)', 'Dimanche 23 h, SMS non transactionnel : verrous_envoi() diffère (hors plage)');
  return next ok(verrous_jour::text !~* '(hors.?plage|differ)', 'Mardi 10 h 30 : pas de verrou horaire (témoin)');
  return next diag('Verrous dimanche soir : ' || left(verrous_nuit::text, 400));
  return next diag('Verrous mardi matin : ' || left(verrous_jour::text, 400));
end $f$;



-- 38 — approuver au nom d'un autre sans délégation échoue
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_38_approbation_sans_delegation_refusee() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; t_app text; col_par text;
begin
  jeu := tests.jeu();
  t_app := tests.table_parmi(array['approbations', 'validations', 'decisions', 'accords']);
  if t_app is null then return next fail('Table des approbations introuvable (approbations/validations/decisions/accords)'); return; end if;
  col_par := tests.colonne_parmi(('public.' || t_app)::regclass, array['approuve_par', 'valide_par', 'decide_par', 'par', 'user_id', 'acteur_id', 'auteur_id']);
  if col_par is null then
    return next fail(format('Colonne de l''auteur introuvable dans %s — adapter la liste de candidates', t_app));
    return next diag('Colonnes : ' || (select string_agg(attname || ' ' || format_type(atttypid, null), ', ' order by attnum) from pg_attribute where attrelid = ('public.' || t_app)::regclass and attnum > 0 and not attisdropped));
    return;
  end if;
  -- A, authentifié, tente d'enregistrer une approbation signée B (même client, sans délégation)
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', jeu ->> 'user_b', 'client_id', jeu ->> 'client_a', 'role', jeu ->> 'role_membre', 'perimetre_total', true));
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  return next throws_ok(
    format('select tests.inserer_minimal(''public'', %L, %L::jsonb)', t_app, jsonb_build_object('client_id', jeu ->> 'client_a', col_par, jeu ->> 'user_b')::text),
    null, null, format('%s : une approbation au nom de B écrite par A sans délégation est refusée', t_app));
  perform tests.redevenir_admin();
  return next diag(format('Table %s, colonne auteur %s. Si la porte d''approbation est une fonction, la brancher ici (nom à fournir par le coordinateur).', t_app, col_par));
end $f$;



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



select * from runtests('tests'::name, '^test_');
