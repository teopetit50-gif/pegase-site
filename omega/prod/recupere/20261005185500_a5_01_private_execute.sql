-- recupere 20261005185500 a5_01_private_execute
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Note : a5_01 (A5 d089c36) + compléments c/d/e du coordinateur, tels que posés.
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête 5b2b098f-85c6-4fc2-aa53-f56205f4e031 (mcp__Supabase__execute_sql, 2026-10-05T18:51:42.715Z, résultat : réussi)
-- a5_01_private_execute (A5, commit d089c36) + complément du coordinateur : les fonctions appelées par un déclencheur
-- SECURITY INVOKER, par une vue publique lisible, ou par une contrainte CHECK / valeur par défaut d'une table publique
-- s'exécutent aussi avec les droits de l'utilisateur : elles restent exécutables par authenticated.
do $$
declare
  r record; ajout int; liste text;
begin
  create temp table _a5_requises (oid oid primary key, nom text, signature text, raison text) on commit drop;

  insert into _a5_requises
  select distinct p.oid, p.proname, p.oid::regprocedure::text, 'politique RLS'
  from pg_depend d join pg_proc p on p.oid = d.refobjid and d.refclassid = 'pg_proc'::regclass
  join pg_namespace n on n.oid = p.pronamespace
  where d.classid = 'pg_policy'::regclass and n.nspname = 'private'
  on conflict do nothing;

  insert into _a5_requises
  select distinct p.oid, p.proname, p.oid::regprocedure::text, 'appelée par public.' || q.proname
  from pg_proc q join pg_namespace m on m.oid = q.pronamespace
  join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
  where m.nspname = 'public' and q.prokind = 'f' and not q.prosecdef and has_function_privilege('authenticated', q.oid, 'execute')
    and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
    and q.prosrc ~ ('private\.' || p.proname || '\s*\(')
  on conflict do nothing;

  -- Complément (c) : déclencheurs SECURITY INVOKER de private.
  insert into _a5_requises
  select distinct p.oid, p.proname, p.oid::regprocedure::text, 'appelée par le déclencheur private.' || q.proname
  from pg_proc q join pg_namespace m on m.oid = q.pronamespace
  join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
  where m.nspname = 'private' and q.prorettype = 'trigger'::regtype and not q.prosecdef
    and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
    and q.prosrc ~ ('private\.' || p.proname || '\s*\(')
  on conflict do nothing;

  -- Complément (d) : vues publiques lisibles par authenticated.
  insert into _a5_requises
  select distinct p.oid, p.proname, p.oid::regprocedure::text, 'appelée par la vue public.' || c.relname
  from pg_class c join pg_namespace m on m.oid = c.relnamespace
  join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
  where m.nspname = 'public' and c.relkind = 'v' and has_table_privilege('authenticated', c.oid, 'select')
    and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
    and pg_get_viewdef(c.oid) ~ ('private\.' || p.proname || '\s*\(')
  on conflict do nothing;

  -- Complément (e) : contraintes CHECK et valeurs par défaut des tables publiques.
  insert into _a5_requises
  select distinct p.oid, p.proname, p.oid::regprocedure::text, 'contrainte ou défaut de public.' || c.relname
  from pg_class c join pg_namespace m on m.oid = c.relnamespace
  join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
  where m.nspname = 'public' and c.relkind = 'r'
    and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
    and (exists (select 1 from pg_constraint k where k.conrelid = c.oid and k.contype = 'c' and pg_get_constraintdef(k.oid) ~ ('private\.' || p.proname || '\s*\('))
      or exists (select 1 from pg_attrdef d where d.adrelid = c.oid and pg_get_expr(d.adbin, d.adrelid) ~ ('private\.' || p.proname || '\s*\(')))
  on conflict do nothing;

  loop
    insert into _a5_requises
    select distinct p.oid, p.proname, p.oid::regprocedure::text, 'appelée par private.' || q.proname
    from _a5_requises x join pg_proc q on q.oid = x.oid
    join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
    where not q.prosecdef and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype and p.oid <> q.oid
      and q.prosrc ~ ('private\.' || p.proname || '\s*\(')
    on conflict do nothing;
    get diagnostics ajout = row_count;
    exit when ajout = 0;
  end loop;

  revoke execute on all functions in schema private from public, anon, authenticated;
  revoke execute on all procedures in schema private from public, anon, authenticated;

  for r in select * from _a5_requises order by nom loop
    execute format('grant execute on function %s to authenticated', r.signature);
  end loop;

  alter default privileges in schema private revoke execute on functions from public;
  alter default privileges for role postgres in schema private revoke execute on functions from public;

  select string_agg(signature || ' — ' || raison, E'\n  ' order by nom) into liste from _a5_requises;
  raise notice E'a5_01_private_execute : % fonction(s) de private restent exécutables par authenticated :\n  %',
    (select count(*) from _a5_requises), coalesce(liste, '(aucune)');

  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
               and has_function_privilege('anon', p.oid, 'execute')) then
    raise exception 'a5_01_private_execute : anon exécute encore une fonction de private';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
               and has_function_privilege('authenticated', p.oid, 'execute') and p.oid not in (select oid from _a5_requises)) then
    raise exception 'a5_01_private_execute : authenticated exécute encore une fonction de private hors liste';
  end if;
  create temp table _a5_bilan on commit drop as select raison, count(*) as n from _a5_requises group by raison;
end $$;
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261005185500', 'a5_01_private_execute', array['-- a5_01 (A5, d089c36) + compléments c/d/e du coordinateur ; voir omega/migrations/a5_01_private_execute.sql'])
on conflict do nothing;
select 'authenticated' as role, count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute')) as executables, count(*) as total
from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
union all
select 'anon', count(*) filter (where has_function_privilege('anon', p.oid, 'execute')), count(*)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
union all
select 'complement:' || left(raison, 40), n, 0 from _a5_bilan where raison not like 'politique RLS' and raison not like 'appelée par public.%' and raison not like 'appelée par private.%';
