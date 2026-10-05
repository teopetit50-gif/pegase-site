-- 13 — un client ne peut pas écrire une ligne au nom d'un autre client
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_13_ecriture_chez_autrui_refusee() returns setof text
language plpgsql as $f$
declare
  jeu jsonb;
begin
  jeu := tests.jeu();
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  return next throws_ok(
    format('select tests.inserer_minimal(''public'', ''acces_objets'', %L::jsonb)', jsonb_build_object('client_id', jeu ->> 'client_b', 'objet_type', 'essai_a5', 'objet_id', gen_random_uuid(), 'user_id', jeu ->> 'user_a')::text),
    '42501', null, 'INSERT dans acces_objets avec le client_id de B, par A : refusé (42501)');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_13_');
