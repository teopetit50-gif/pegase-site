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

select * from runtests('tests'::name, '^test_08_');
