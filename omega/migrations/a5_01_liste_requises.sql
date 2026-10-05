-- Lecture seule : la liste exacte que a5_01_private_execute.sql retient (même règle), sous forme de GRANT prêts à figer.
-- À lancer sur la recette AVANT la migration (pour relire) et APRÈS (pour vérifier) ; coller le résultat dans NOTES-COORDINATEUR.md.
-- Même règle que tests.fonctions_private_requises() (omega/tests/socle/00_installation.sql) : sources (a) politiques,
-- (b) fonctions publiques SECURITY INVOKER, (c) déclencheurs SECURITY INVOKER de private, (d) vues lisibles,
-- (e) CHECK de tables publiques et de domaines, DEFAULT, (f) clauses WHEN ; fermeture transitive ; appels qualifiés ou non.
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
select format('grant execute on function %s to authenticated; -- %s', oid::regprocedure, string_agg(distinct raison, ' ; ')) as grant_a_figer
from requises group by oid order by oid::regprocedure::text;
