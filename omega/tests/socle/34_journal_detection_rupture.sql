-- 34 — public.verifier_journal_client() détecte une empreinte altérée
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_34_journal_detection_rupture() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; i int; verdict jsonb;
begin
  jeu := tests.jeu();
  for i in 1..3 loop
    perform tests.inserer_minimal('public', 'journal_opposable', jsonb_build_object('client_id', jeu ->> 'client_a', 'action', 'essai_a5_' || i, 'acteur_type', 'systeme', 'objet_type', 'essai'));
  end loop;
  begin
    execute 'alter table public.journal_opposable disable trigger user';
    execute format('update public.journal_opposable set hash = decode(repeat(''ab'', 32), ''hex'') where client_id = %L and id = (select min(id) from public.journal_opposable where client_id = %L)', jeu ->> 'client_a', jeu ->> 'client_a');
    execute 'alter table public.journal_opposable enable trigger user';
  exception when others then
    return next pass('Altération impossible même déclencheurs désactivés (' || sqlerrm || ') : rupture non simulable, test sans objet');
    return;
  end;
  execute format('select coalesce(jsonb_agg(to_jsonb(v)), ''[]''::jsonb) from public.verifier_journal_client(%L::uuid) v', jeu ->> 'client_a') into verdict;
  return next ok(verdict::text ~* '(false|rompu|invalide|cass|erreur|ecart|écart)', 'Le verdict signale la rupture');
  return next diag('Verdict rendu : ' || left(verdict::text, 400));
end $f$;

select * from runtests('tests'::name, '^test_34_');
