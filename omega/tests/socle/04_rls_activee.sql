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

select * from runtests('tests'::name, '^test_04_');
