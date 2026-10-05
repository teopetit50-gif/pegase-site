-- 11 — un client ne lit pas le journal d'un autre
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_11_journal_isole_lecture() returns setof text
language plpgsql as $f$
declare
  jeu jsonb;
begin
  jeu := tests.jeu();
  perform tests.journaliser((jeu ->> 'client_b')::uuid, 'essai_a5');
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L', jeu ->> 'client_b')), 0::bigint, 'A ne voit aucune ligne du journal de B');
  perform tests.redevenir_admin();
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L', jeu ->> 'client_b')), 1::bigint, 'La ligne de B existe pourtant (vue en admin)');
end $f$;

select * from runtests('tests'::name, '^test_11_');
