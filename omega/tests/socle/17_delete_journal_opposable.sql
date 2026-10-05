-- 17 — DELETE sur public.journal_opposable échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_17_delete_journal_opposable() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  select count(*) into nb from tests.declencheurs_bloquants('journal_opposable') where sur_delete and avant;
  return next ok(nb > 0, 'journal_opposable : un déclencheur BEFORE DELETE existe');
  v_ctid := tests.ligne_pour_essai('journal_opposable');
  return next throws_ok(format('delete from public.journal_opposable where ctid = %L', v_ctid), null, null, 'DELETE sur journal_opposable échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'journal_opposable', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est toujours là');
end $f$;

select * from runtests('tests'::name, '^test_17_');
