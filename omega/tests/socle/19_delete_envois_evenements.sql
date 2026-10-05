-- 19 — DELETE sur public.envois_evenements échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_19_delete_envois_evenements() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('envois_evenements') then
    return next pass('public.envois_evenements n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('envois_evenements') where sur_delete and avant;
  return next ok(nb > 0, 'envois_evenements : un déclencheur BEFORE DELETE existe');
  v_ctid := tests.ligne_pour_essai('envois_evenements');
  return next throws_ok(format('delete from public.envois_evenements where ctid = %L', v_ctid), null, null, 'DELETE sur envois_evenements échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'envois_evenements', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est toujours là');
end $f$;

select * from runtests('tests'::name, '^test_19_');
