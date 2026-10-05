-- 44 — authenticated n'exécute dans private que les fonctions qu'une politique ou une fonction publique utilise
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_44_private_fonctions_exposees() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
      and has_function_privilege('authenticated', p.oid, 'execute')
      and not exists (select 1 from pg_policies pol where (coalesce(pol.qual, '') || coalesce(pol.with_check, '')) ~ ('private\.' || p.proname || '\('))
      and not exists (select 1 from pg_proc q join pg_namespace m on m.oid = q.pronamespace where m.nspname = 'public' and q.prosrc ~ ('private\.' || p.proname || '\('))
    order by 1
  $q$, 'Aucune fonction de private exécutable par authenticated sans usage connu (politique RLS ou fonction publique)');
  return next is_empty($q$
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype and has_function_privilege('anon', p.oid, 'execute') order by 1
  $q$, 'anon n''exécute aucune fonction de private');
end $f$;

select * from runtests('tests'::name, '^test_44_');
