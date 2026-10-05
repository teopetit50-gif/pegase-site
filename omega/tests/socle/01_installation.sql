-- 01 — pgTAP, schéma tests et objets du socle présents
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_01_installation() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next ok(exists (select 1 from pg_proc where proname = 'runtests'), 'pgTAP est chargée (runtests disponible)');
  return next has_schema('tests', 'le schéma tests existe');
  return next has_schema('private', 'le schéma private existe');
  return next has_function('private'::name, 'mes_clients'::name, 'private.mes_clients() existe');
  return next has_function('private'::name, 'lit_objet'::name, 'private.lit_objet() existe');
  return next has_function('private'::name, 'verifier_sauvegardes'::name, 'private.verifier_sauvegardes() existe');
  return next has_function('public'::name, 'verifier_journal_client'::name, 'public.verifier_journal_client() existe');
  return next has_table('public'::name, 'journal_opposable'::name, 'public.journal_opposable existe');
  return next has_table('private'::name, 'tables_locataires'::name, 'private.tables_locataires existe');
  return next has_table('private'::name, 'sauvegardes'::name, 'private.sauvegardes existe');
end $f$;

select * from runtests('tests'::name, '^test_01_');
