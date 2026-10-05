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
      and (c.data_type <> 'uuid' or (c.is_nullable = 'YES'
        -- client_id nullable admis (lignes globales Omega : gabarits communs, travaux système, alertes internes)
        -- à condition que chaque politique SELECT permissive pour authenticated conditionne client_id : un null n'y passe jamais.
        and exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.table_name and p.cmd in ('SELECT', 'ALL') and p.permissive = 'PERMISSIVE'
                      and ('authenticated' = any(p.roles) or p.roles = '{public}'::name[]) and coalesce(p.qual, '') !~ 'client_id')))
    order by 1
  $q$, 'client_id est uuid partout, et s''il est nullable, toute politique de lecture le conditionne (un null reste invisible aux clients)');
  return next diag('Tables locataires à client_id nullable (lignes globales) : ' || coalesce((
    select string_agg(c.table_name, ', ' order by c.table_name) from information_schema.columns c
    where c.table_schema = 'public' and c.column_name = 'client_id' and c.is_nullable = 'YES'
      and c.table_name in (select regexp_replace(nom, '^public\.', '') from private.tables_locataires)), 'aucune'));
end $f$;

select * from runtests('tests'::name, '^test_42_');
