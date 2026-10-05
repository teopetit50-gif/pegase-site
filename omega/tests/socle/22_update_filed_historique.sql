-- 22 — UPDATE sur public.filed_historique échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_22_update_filed_historique() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('filed_historique') then
    return next pass('public.filed_historique n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('filed_historique') where sur_update and avant;
  return next ok(nb > 0, 'filed_historique : un déclencheur BEFORE UPDATE existe');
  v_ctid := tests.ligne_pour_essai('filed_historique');
  select attname into col from pg_attribute where attrelid = 'public.filed_historique'::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity = '' order by attnum limit 1;
  return next throws_ok(format('update public.filed_historique set %I = %I where ctid = %L', col, col, v_ctid), null, null, 'UPDATE sur filed_historique échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'filed_historique', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est intacte');
end $f$;

select * from runtests('tests'::name, '^test_22_');
