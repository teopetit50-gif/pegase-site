-- 12 — un client lit bien son propre journal
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_12_journal_lecture_propre() returns setof text
language plpgsql as $f$
declare
  jeu jsonb;
begin
  jeu := tests.jeu();
  perform tests.journaliser((jeu ->> 'client_a')::uuid, 'essai_a5');
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L', jeu ->> 'client_a')), 1::bigint, 'A voit sa ligne de journal');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_12_');
