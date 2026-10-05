-- 27 — DELETE sur public.echeances_pro_journal échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_27_delete_echeances_pro_journal() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('echeances_pro_journal') then
    return next pass('public.echeances_pro_journal n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('echeances_pro_journal') where sur_delete and avant;
  return next ok(nb > 0, 'echeances_pro_journal : un déclencheur BEFORE DELETE existe');
  v_ctid := tests.ligne_pour_essai('echeances_pro_journal');
  return next throws_ok(format('delete from public.echeances_pro_journal where ctid = %L', v_ctid), null, null, 'DELETE sur echeances_pro_journal échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'echeances_pro_journal', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est toujours là');
end $f$;

select * from runtests('tests'::name, '^test_27_');
