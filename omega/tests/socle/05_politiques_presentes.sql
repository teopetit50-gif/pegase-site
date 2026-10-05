-- 05 — chaque table locataire porte au moins une politique
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_05_politiques_presentes() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select tl.nom from private.tables_locataires tl
    where not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = regexp_replace(tl.nom, '^public\.', ''))
  $q$, 'Aucune table locataire sans politique (RLS activée sans politique = tout refusé, mais c''est un oubli)');
end $f$;

select * from runtests('tests'::name, '^test_05_');
