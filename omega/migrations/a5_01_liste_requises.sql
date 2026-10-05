-- Lecture seule : la liste exacte que a5_01_private_execute.sql retient (même règle), sous forme de GRANT prêts à figer.
-- À lancer sur la recette AVANT la migration (pour relire) et APRÈS (pour vérifier) ; coller le résultat dans NOTES-COORDINATEUR.md.
with recursive requises as (
    -- (a) citées par une politique RLS (pg_depend : exact)
    select distinct p.oid, p.proname, 'politique RLS'::text as raison
    from pg_depend d join pg_proc p on p.oid = d.refobjid and d.refclassid = 'pg_proc'::regclass
    join pg_namespace n on n.oid = p.pronamespace
    where d.classid = 'pg_policy'::regclass and n.nspname = 'private'
    union
    -- (b) appelées par une fonction publique SECURITY INVOKER exécutable par authenticated
    select distinct p.oid, p.proname, 'appelée par public.' || q.proname
    from pg_proc q join pg_namespace m on m.oid = q.pronamespace
    join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
    where m.nspname = 'public' and q.prokind = 'f' and not q.prosecdef and has_function_privilege('authenticated', q.oid, 'execute')
      and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
      and q.prosrc ~ ('private\.' || p.proname || '\s*\(')
    union
    -- (c) appelées par un déclencheur SECURITY INVOKER de private (il s'exécute avec les droits de l'utilisateur qui écrit)
    select distinct p.oid, p.proname, 'appelée par le déclencheur private.' || t.proname
    from pg_proc t join pg_namespace nt on nt.oid = t.pronamespace
    join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
    where nt.nspname = 'private' and t.prorettype = 'trigger'::regtype and not t.prosecdef
      and exists (select 1 from pg_trigger tg where tg.tgfoid = t.oid and not tg.tgisinternal)
      and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
      and t.prosrc ~ ('private\.' || p.proname || '\s*\(')
    union
    -- (d) utilisées par une vue de public lisible par authenticated (pg_depend via la règle de réécriture : exact)
    select distinct p.oid, p.proname, 'vue public.' || v.relname
    from pg_depend d join pg_rewrite rw on rw.oid = d.objid and d.classid = 'pg_rewrite'::regclass
    join pg_class v on v.oid = rw.ev_class join pg_namespace nv on nv.oid = v.relnamespace
    join pg_proc p on p.oid = d.refobjid and d.refclassid = 'pg_proc'::regclass
    join pg_namespace n on n.oid = p.pronamespace
    where nv.nspname = 'public' and v.relkind in ('v', 'm') and has_table_privilege('authenticated', v.oid, 'select')
      and n.nspname = 'private' and p.prokind = 'f'
    union
    -- (e) utilisées par un CHECK ou un DEFAULT d'une table de public (pg_depend : exact)
    select distinct p.oid, p.proname, 'contrainte/défaut de public.' || c.relname
    from pg_depend d
    join pg_proc p on p.oid = d.refobjid and d.refclassid = 'pg_proc'::regclass
    join pg_namespace n on n.oid = p.pronamespace
    join lateral (
      select con.conrelid as relid from pg_constraint con where d.classid = 'pg_constraint'::regclass and con.oid = d.objid
      union all
      select ad.adrelid from pg_attrdef ad where d.classid = 'pg_attrdef'::regclass and ad.oid = d.objid
    ) src on true
    join pg_class c on c.oid = src.relid join pg_namespace nc on nc.oid = c.relnamespace
    where nc.nspname = 'public' and n.nspname = 'private' and p.prokind = 'f'
    union
    -- fermeture transitive à travers les SECURITY INVOKER retenues
    select distinct p.oid, p.proname, 'appelée par private.' || q.proname
    from requises x join pg_proc q on q.oid = x.oid
    join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
    where not q.prosecdef and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype and p.oid <> q.oid
      and q.prosrc ~ ('private\.' || p.proname || '\s*\(')
  )
select format('grant execute on function %s to authenticated; -- %s', oid::regprocedure, string_agg(distinct raison, ' ; ')) as grant_a_figer
from requises group by oid order by oid::regprocedure::text;
