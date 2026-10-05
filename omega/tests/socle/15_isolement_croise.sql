-- 15 — une ligne posée pour A est vue par A et jamais par B (acces_objets)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_15_isolement_croise() returns setof text
language plpgsql as $f$
declare
  jeu jsonb;
begin
  jeu := tests.jeu();
  perform tests.inserer_minimal('public', 'acces_objets', jsonb_build_object('client_id', jeu ->> 'client_a', 'objet_type', 'essai_a5', 'objet_id', gen_random_uuid(), 'user_id', jeu ->> 'user_a'));
  perform tests.endosser((jeu ->> 'user_b')::uuid);
  return next is(tests.compter('public', 'acces_objets', format('client_id = %L', jeu ->> 'client_a')), 0::bigint, 'B ne voit pas la ligne de A');
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  return next is(tests.compter('public', 'acces_objets', format('client_id = %L', jeu ->> 'client_a')), 1::bigint, 'A voit sa ligne');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_15_');
