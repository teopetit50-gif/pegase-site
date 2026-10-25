-- c3_43 — REPUT : aucun texte de la base ne désigne le client par « le » ou « la » (rappelez-le, le rappellera…).
-- Exécutable tel quel par execute_sql sur la RECETTE, après les migrations c3_01 à c3_43. runtests() annule tout.

create or replace function tests.test_c3_43_tournures_neutres() returns setof text
language plpgsql as $f$
declare
  v_genres text;
begin
  select string_agg(p.oid::regprocedure::text, ', ' order by p.proname) into v_genres
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private') and p.proname like 'reput\_%'
    and pg_get_functiondef(p.oid) ~* '(rappelez-(le|la)\M|\m(le|la) rappellera\M|\m(le|la) recontacter)';
  return next is(v_genres, null::text, 'Aucune fonction REPUT ne dit « rappelez-le », « le rappellera »…');
  return next ok(pg_get_functiondef('private.reput_astreinte(timestamptz)'::regprocedure) like '%rappelez cette personne vous-même%',
                 'L''alerte d''astreinte épuisée dit « rappelez cette personne vous-même »');
end $f$;

select * from runtests('tests'::name, '^test_c3_43_');
