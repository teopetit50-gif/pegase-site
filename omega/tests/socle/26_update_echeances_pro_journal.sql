-- 26 — UPDATE sur public.echeances_pro_journal échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_26_update_echeances_pro_journal() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  select count(*) into nb from tests.declencheurs_bloquants('echeances_pro_journal') where sur_update and avant;
  return next ok(nb > 0, 'echeances_pro_journal : un déclencheur BEFORE UPDATE existe');
  v_ctid := tests.ligne_pour_essai('echeances_pro_journal');
  select attname into col from pg_attribute where attrelid = 'public.echeances_pro_journal'::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity = '' order by attnum limit 1;
  return next throws_ok(format('update public.echeances_pro_journal set %I = %I where ctid = %L', col, col, v_ctid), null, null, 'UPDATE sur echeances_pro_journal échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'echeances_pro_journal', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est intacte');
end $f$;

select * from runtests('tests'::name, '^test_26_');
