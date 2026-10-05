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
