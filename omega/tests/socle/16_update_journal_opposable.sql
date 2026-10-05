-- 16 — UPDATE sur public.journal_opposable échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_16_update_journal_opposable() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  select count(*) into nb from tests.declencheurs_bloquants('journal_opposable') where sur_update and avant;
  return next ok(nb > 0, 'journal_opposable : un déclencheur BEFORE UPDATE existe');
  v_ctid := tests.ligne_pour_essai('journal_opposable');
  select attname into col from pg_attribute where attrelid = 'public.journal_opposable'::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity = '' order by attnum limit 1;
  return next throws_ok(format('update public.journal_opposable set %I = %I where ctid = %L', col, col, v_ctid), null, null, 'UPDATE sur journal_opposable échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'journal_opposable', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est intacte');
end $f$;

select * from runtests('tests'::name, '^test_16_');
