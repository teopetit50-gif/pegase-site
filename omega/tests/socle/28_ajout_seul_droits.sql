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

select * from runtests('tests'::name, '^test_28_');
