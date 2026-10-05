-- Lecture seule : la liste exacte que a5_01_private_execute.sql retient (même règle), sous forme de GRANT prêts à figer.
-- À lancer sur la recette AVANT la migration (pour relire) et APRÈS (pour vérifier) ; coller le résultat dans NOTES-COORDINATEUR.md.
with recursive requises as (
  select distinct p.oid, p.proname, 'politique RLS'::text as raison
  from pg_depend d join pg_proc p on p.oid = d.refobjid and d.refclassid = 'pg_proc'::regclass
  join pg_namespace n on n.oid = p.pronamespace
  where d.classid = 'pg_policy'::regclass and n.nspname = 'private'
  union
  select distinct p.oid, p.proname, 'appelée par public.' || q.proname
  from pg_proc q join pg_namespace m on m.oid = q.pronamespace
  join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
  where m.nspname = 'public' and q.prokind = 'f' and not q.prosecdef and has_function_privilege('authenticated', q.oid, 'execute')
    and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
    and q.prosrc ~ ('private\.' || p.proname || '\s*\(')
  union
  select distinct p.oid, p.proname, 'appelée par private.' || q.proname
  from requises x join pg_proc q on q.oid = x.oid
  join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
  where not q.prosecdef and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype and p.oid <> q.oid
    and q.prosrc ~ ('private\.' || p.proname || '\s*\(')
)
select format('grant execute on function %s to authenticated; -- %s', oid::regprocedure, string_agg(distinct raison, ' ; ')) as grant_a_figer
from requises group by oid order by oid::regprocedure::text;
