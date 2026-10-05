-- 23 — DELETE sur public.filed_historique échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_23_delete_filed_historique() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  select count(*) into nb from tests.declencheurs_bloquants('filed_historique') where sur_delete and avant;
  return next ok(nb > 0, 'filed_historique : un déclencheur BEFORE DELETE existe');
  v_ctid := tests.ligne_pour_essai('filed_historique');
  return next throws_ok(format('delete from public.filed_historique where ctid = %L', v_ctid), null, null, 'DELETE sur filed_historique échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'filed_historique', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est toujours là');
end $f$;

select * from runtests('tests'::name, '^test_23_');
