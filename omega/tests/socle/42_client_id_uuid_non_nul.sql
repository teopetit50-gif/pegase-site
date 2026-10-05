-- 42 — sur toute table locataire, client_id est un uuid NOT NULL
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_42_client_id_uuid_non_nul() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select c.table_name, c.data_type, c.is_nullable from information_schema.columns c
    where c.table_schema = 'public' and c.column_name = 'client_id'
      and c.table_name in (select regexp_replace(nom, '^public\.', '') from private.tables_locataires)
      and (c.data_type <> 'uuid' or c.is_nullable = 'YES')
      -- une table qui porte une colonne « interne » (alertes) admet client_id null pour les lignes internes Omega
      and not exists (select 1 from information_schema.columns i where i.table_schema = 'public' and i.table_name = c.table_name and i.column_name = 'interne')
    order by 1
  $q$, 'client_id uuid NOT NULL partout (une colonne nullable échapperait à « client_id in (mes_clients()) »)');
end $f$;

select * from runtests('tests'::name, '^test_42_');
