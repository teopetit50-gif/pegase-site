-- 21 — DELETE sur public.effacements échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_21_delete_effacements() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  select count(*) into nb from tests.declencheurs_bloquants('effacements') where sur_delete and avant;
  return next ok(nb > 0, 'effacements : un déclencheur BEFORE DELETE existe');
  v_ctid := tests.ligne_pour_essai('effacements');
  return next throws_ok(format('delete from public.effacements where ctid = %L', v_ctid), null, null, 'DELETE sur effacements échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'effacements', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est toujours là');
end $f$;

select * from runtests('tests'::name, '^test_21_');
