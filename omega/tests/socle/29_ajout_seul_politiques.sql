-- 29 — aucune politique UPDATE ou DELETE sur les tables en ajout seul
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_29_ajout_seul_politiques() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select tablename, policyname, cmd from pg_policies
    where schemaname = 'public' and tablename in (select tests.tables_ajout_seul()) and cmd in ('UPDATE', 'DELETE') order by 1, 2
  $q$, 'Pas de politique UPDATE/DELETE sur les six tables en ajout seul');
  return next diag('Tables du cahier absentes ici (sans objet) : ' || coalesce((select string_agg(t.nom, ', ') from tests.tables_ajout_seul() t(nom) where to_regclass('public.' || t.nom) is null), 'aucune'));
end $f$;

select * from runtests('tests'::name, '^test_29_');
