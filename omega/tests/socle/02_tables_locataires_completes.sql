-- 02 — toute table publique à client_id est inscrite dans private.tables_locataires
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_02_tables_locataires_completes() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and c.column_name = 'client_id' and t.table_type = 'BASE TABLE'
      and c.table_name not in (select regexp_replace(nom, '^public\.', '') from private.tables_locataires)
    order by 1
  $q$, 'Aucune table publique à client_id n''échappe à private.tables_locataires (sinon l''effacement prouvé la rate)');
end $f$;

select * from runtests('tests'::name, '^test_02_');
