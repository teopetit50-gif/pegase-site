-- 38 — approuver au nom d'un autre sans délégation échoue
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_38_approbation_sans_delegation_refusee() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; t_app text; col_par text;
begin
  jeu := tests.jeu();
  t_app := tests.table_parmi(array['approbations', 'validations', 'decisions', 'accords']);
  if t_app is null then return next fail('Table des approbations introuvable (approbations/validations/decisions/accords)'); return; end if;
  col_par := tests.colonne_parmi(('public.' || t_app)::regclass, array['approuve_par', 'valide_par', 'decide_par', 'par', 'user_id', 'acteur_id', 'auteur_id']);
  if col_par is null then
    return next fail(format('Colonne de l''auteur introuvable dans %s — adapter la liste de candidates', t_app));
    return next diag('Colonnes : ' || (select string_agg(attname || ' ' || format_type(atttypid, null), ', ' order by attnum) from pg_attribute where attrelid = ('public.' || t_app)::regclass and attnum > 0 and not attisdropped));
    return;
  end if;
  -- A, authentifié, tente d'enregistrer une approbation signée B (même client, sans délégation)
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', jeu ->> 'user_b', 'client_id', jeu ->> 'client_a', 'role', jeu ->> 'role_membre', 'perimetre_total', true));
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  return next throws_ok(
    format('select tests.inserer_minimal(''public'', %L, %L::jsonb)', t_app, jsonb_build_object('client_id', jeu ->> 'client_a', col_par, jeu ->> 'user_b')::text),
    null, null, format('%s : une approbation au nom de B écrite par A sans délégation est refusée', t_app));
  perform tests.redevenir_admin();
  return next diag(format('Table %s, colonne auteur %s. Si la porte d''approbation est une fonction, la brancher ici (nom à fournir par le coordinateur).', t_app, col_par));
end $f$;

select * from runtests('tests'::name, '^test_38_');
