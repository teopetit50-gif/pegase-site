-- 29 — Les Questions (migration b2_20) : une personne pose une question, l'ouvrier la prend, ne lit que dans le
-- catalogue fermé (lecture seule, bornée à l'organisation, six lectures au plus), dépose la réponse ; la personne la lit,
-- un autre loueur non. Les portes de l'ouvrier sont au service seul.

create or replace function tests.test_b2_29_questions() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; q uuid; r jsonb; n integer := 0; l text;
begin
  if to_regprocedure('public.loc_poser_question(text, uuid)') is null then
    return next fail('La migration b2_20 (questions) n''est pas posée : public.loc_poser_question manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_contrat();
  v_client := (jeu ->> 'client')::uuid;
  return next ok(not has_function_privilege('authenticated', 'public.loc_question_commencer(uuid)', 'execute')
                 and not has_function_privilege('authenticated', 'public.loc_question_lire(uuid, text, jsonb)', 'execute')
                 and not has_function_privilege('authenticated', 'public.loc_question_repondre(uuid, jsonb, jsonb)', 'execute'), 'Les portes de l''ouvrier sont au service seul');

  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_poser_question(%L)', 'abc'), '22023', null, 'Une question trop courte est refusée');
  q := (public.loc_poser_question('Combien de retours ne sont pas encore facturés ?') ->> 'question')::uuid;
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from public.travaux t where t.cle = 'tavaro:question:' || q::text and t.genre = 'tavaro.question'), 'Le travail tavaro.question attend l''ouvrier');

  r := public.loc_question_commencer(q);
  return next ok(r ->> 'statut' = 'a_traiter' and jsonb_array_length(r -> 'catalogue') = 8, 'L''ouvrier reçoit la question et le catalogue fermé de huit lectures');
  return next throws_ok(format('select public.loc_question_lire(%L::uuid, %L)', q, 'select * from comptes'), '22023', null, 'Une lecture hors catalogue est refusée');
  r := public.loc_question_lire(q, 'retours_non_factures', '{"jours": 30}');
  return next ok(r ? 'nombre' and r ? 'plus_anciens', 'La lecture rend des chiffres bornés à l''organisation');
  for l in select x ->> 'lecture' from jsonb_array_elements(private.loc_catalogue_questions()) x loop
    begin
      perform public.loc_question_lire(q, l, '{}');
      n := n + 1;
    exception when sqlstate '54000' then
      exit;
    end;
  end loop;
  return next is(n, 5, 'Six lectures par question au plus');
  r := public.loc_question_repondre(q, '{"reponse":"Un retour n''est pas encore facturé.","chiffres":[{"libelle":"Retours non facturés","valeur":"1"}],"cause":"Le retour n''est pas chiffré.","decision":"Chiffrer le retour du contrat C-2026-0001."}',
                                    '{"modele":"essai","tokens_entree":1200,"tokens_sortie":200,"cout_eur":0.0045}');
  return next is(r ->> 'statut', 'repondue', 'La réponse est déposée');

  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next is((select x.reponse ->> 'decision' from public.loc_questions x where x.id = q), 'Chiffrer le retour du contrat C-2026-0001.', 'La personne lit la réponse, avec la décision proposée');
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre@essai.invalid');
  return next is(tests.compter('public', 'loc_questions', 'true'), 0::bigint, 'Un autre loueur ne voit aucune question');
end $f$;

select * from runtests('tests'::name, '^test_b2_29_');
