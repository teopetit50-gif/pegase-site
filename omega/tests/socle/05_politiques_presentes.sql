-- 05 — chaque table locataire porte au moins une politique
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_05_politiques_presentes() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  -- Une table interne peut n'avoir aucune politique : RLS activée + aucun droit SELECT pour authenticated = tout refusé, c'est voulu.
  -- Ce qui est interdit : une table lisible par authenticated sans aucune politique (RLS seule ne dit pas qui lit quoi).
  return next is_empty($q$
    select tl.nom from private.tables_locataires tl
    where not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = regexp_replace(tl.nom, '^public\.', ''))
      and has_table_privilege('authenticated', to_regclass('public.' || quote_ident(regexp_replace(tl.nom, '^public\.', ''))), 'SELECT')
  $q$, 'Aucune table locataire lisible par authenticated sans politique');
  return next diag('Tables locataires sans politique mais fermées à authenticated (voulu) : ' || coalesce((
    select string_agg(regexp_replace(tl.nom, '^public\.', ''), ', ' order by tl.nom) from private.tables_locataires tl
    where not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = regexp_replace(tl.nom, '^public\.', ''))), 'aucune'));
end $f$;

select * from runtests('tests'::name, '^test_05_');
