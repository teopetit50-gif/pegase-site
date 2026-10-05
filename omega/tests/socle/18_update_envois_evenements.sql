-- 18 — UPDATE sur public.envois_evenements échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_18_update_envois_evenements() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  select count(*) into nb from tests.declencheurs_bloquants('envois_evenements') where sur_update and avant;
  return next ok(nb > 0, 'envois_evenements : un déclencheur BEFORE UPDATE existe');
  v_ctid := tests.ligne_pour_essai('envois_evenements');
  select attname into col from pg_attribute where attrelid = 'public.envois_evenements'::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity = '' order by attnum limit 1;
  return next throws_ok(format('update public.envois_evenements set %I = %I where ctid = %L', col, col, v_ctid), null, null, 'UPDATE sur envois_evenements échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'envois_evenements', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est intacte');
end $f$;

select * from runtests('tests'::name, '^test_18_');
