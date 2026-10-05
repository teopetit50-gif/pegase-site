-- 39 — un objet d'un type restreint n'est pas lisible sans ligne dans acces_objets
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_39_objet_restreint_sans_acces() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; objet uuid;
begin
  jeu := tests.jeu();
  objet := gen_random_uuid();
  perform tests.inserer_minimal('public', 'objets_restreints', jsonb_build_object('client_id', jeu ->> 'client_a', 'objet_type', 'dossier_essai_a5'));
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  return next ok(not tests.lit_objet((jeu ->> 'client_a')::uuid, 'dossier_essai_a5', objet), 'lit_objet() refuse un objet restreint sans acces_objets');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_39_');
