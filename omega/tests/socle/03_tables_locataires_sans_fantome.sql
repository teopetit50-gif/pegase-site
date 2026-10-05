-- 03 — private.tables_locataires ne cite que des tables qui existent
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_03_tables_locataires_sans_fantome() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select nom from private.tables_locataires where to_regclass('public.' || quote_ident(regexp_replace(nom, '^public\.', ''))) is null
  $q$, 'Chaque entrée de tables_locataires désigne une table réelle');
  return next is_empty($q$ select nom from private.tables_locataires where ordre_effacement is null $q$, 'Chaque table locataire a un ordre d''effacement');
end $f$;

select * from runtests('tests'::name, '^test_03_');
