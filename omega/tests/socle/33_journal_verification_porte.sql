-- 33 — public.verifier_journal_client() valide une chaîne intacte
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_33_journal_verification_porte() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; i int; verdict jsonb;
begin
  jeu := tests.jeu();
  for i in 1..3 loop
    perform tests.inserer_minimal('public', 'journal_opposable', jsonb_build_object('client_id', jeu ->> 'client_a', 'action', 'essai_a5_' || i, 'acteur_type', 'systeme', 'objet_type', 'essai'));
  end loop;
  execute format('select coalesce(jsonb_agg(to_jsonb(v)), ''[]''::jsonb) from public.verifier_journal_client(%L::uuid) v', jeu ->> 'client_a') into verdict;
  return next ok(verdict::text !~* '(false|rompu|invalide|cass|erreur|ecart|écart)', 'Le verdict ne signale aucune rupture');
  return next diag('Verdict rendu : ' || left(verdict::text, 400));
end $f$;

select * from runtests('tests'::name, '^test_33_');
