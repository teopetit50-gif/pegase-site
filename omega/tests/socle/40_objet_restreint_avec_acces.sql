-- 40 — le même objet devient lisible avec une ligne acces_objets pour l'utilisateur
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_40_objet_restreint_avec_acces() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; objet uuid;
begin
  jeu := tests.jeu();
  objet := gen_random_uuid();
  perform tests.inserer_minimal('public', 'objets_restreints', jsonb_build_object('client_id', jeu ->> 'client_a', 'objet_type', 'dossier_essai_a5'));
  perform tests.inserer_minimal('public', 'acces_objets', jsonb_build_object('client_id', jeu ->> 'client_a', 'objet_type', 'dossier_essai_a5', 'objet_id', objet, 'user_id', jeu ->> 'user_a'));
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  return next ok(tests.lit_objet((jeu ->> 'client_a')::uuid, 'dossier_essai_a5', objet), 'lit_objet() accepte avec un accès nominatif');
  return next ok(not tests.lit_objet((jeu ->> 'client_a')::uuid, 'dossier_essai_a5', gen_random_uuid()), 'mais pas un autre objet du même type');
  perform tests.endosser((jeu ->> 'user_b')::uuid);
  return next ok(not tests.lit_objet((jeu ->> 'client_a')::uuid, 'dossier_essai_a5', objet), 'ni un utilisateur d''un autre client');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_40_');
