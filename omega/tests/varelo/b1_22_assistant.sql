-- b1_22 — VARELO : l'assistant, côté base (migration b1_19_assistant, après b1_18)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5) et b1_00_aides.sql.
-- runtests() annule tout ce que le test écrit. Motif : ^test_b1_22_

create or replace function tests.test_b1_22_assistant() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid;
  r jsonb;
  v_plafond numeric;
begin
  b := tests.b1_preparer(3);
  v_client := (b ->> 'client')::uuid;
  perform tests.endosser((b ->> 'collab')::uuid, 'b1-collaborateur@essai.invalid');
  return next is(public.grp_assistant_client(), v_client, 'le groupe Varelo de la personne connectée');
  return next throws_ok(format('select public.grp_assistant_budget(%L)', v_client), '42501', null, 'le budget ne se lit pas avec une session (clé de service seulement)');
  return next throws_ok(format('select public.grp_assistant_noter(%L, %L, 0.01, %L, %L, 10, 10)', v_client, b ->> 'collab', 'x', 'anthropic'), '42501', null,
                 'une session ne note pas de dépense');
  perform tests.redevenir_admin();
  perform tests.endosser((b ->> 'etranger')::uuid, 'a5-client-b@essai.invalid');
  return next ok(public.grp_assistant_client() is distinct from v_client, 'une personne d''un autre groupe n''obtient pas ce groupe');
  perform tests.redevenir_admin();

  r := public.grp_assistant_budget(v_client);
  v_plafond := (r ->> 'plafond_eur')::numeric;
  return next ok(v_plafond > 0 and (r ->> 'permis')::boolean and (r ->> 'assistant_eur')::numeric = 0, format('budget du jour : %s', r));
  perform public.grp_assistant_noter(v_client, (b ->> 'collab')::uuid, v_plafond / 2, 'claude-sonnet-5-5', 'anthropic', 1200, 300);
  perform public.grp_assistant_noter(v_client, (b ->> 'collab')::uuid, v_plafond / 2, 'claude-sonnet-5-5', 'anthropic', 1200, 300);
  r := public.grp_assistant_budget(v_client);
  return next ok(not (r ->> 'permis')::boolean and (r ->> 'assistant_eur')::numeric >= v_plafond, format('plafond atteint : refusé (%s)', r));
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L and action = %L', v_client, 'varelo.assistant.reponse')), 2::bigint,
                 'chaque réponse est au journal, avec son coût');
  return next throws_ok(format('select public.grp_assistant_noter(%L, null, -1, %L, %L, 0, 0)', v_client, 'x', 'anthropic'), '22023', null, 'un coût négatif : refusé');
end $f$;
