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

select * from runtests('tests'::name, '^test_07_');
