-- 06 — aucune politique « true » n'ouvre une table locataire à anon ou authenticated
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_06_pas_de_politique_ouverte() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select p.tablename, p.policyname, p.cmd
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename in (select regexp_replace(nom, '^public\.', '') from private.tables_locataires)
      and p.permissive = 'PERMISSIVE'
      and (p.roles = '{public}'::name[] or 'authenticated' = any(p.roles) or 'anon' = any(p.roles))
      and (coalesce(p.qual, p.with_check) is null or regexp_replace(coalesce(p.qual, p.with_check), '[\s()]', '', 'g') = 'true')
    order by 1, 2
  $q$, 'Pas de politique permissive sans condition pour anon/authenticated sur une table locataire');
end $f$;

select * from runtests('tests'::name, '^test_06_');
