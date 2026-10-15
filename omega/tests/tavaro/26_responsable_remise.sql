-- 26 — Une personne nommée sur chaque remise en location (migration b2_17) : la direction règle le responsable des
-- remises de chaque agence ; une remise créée au retour lui revient d'office ; seule une personne de l'organisation
-- est acceptée.

create or replace function tests.test_b2_26_responsable_remise() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_contrat uuid; v_siege uuid; r jsonb;
begin
  if to_regprocedure('public.loc_poser_responsable_remise(uuid, uuid)') is null then
    return next fail('La migration b2_17 (responsable des remises) n''est pas posée : public.loc_poser_responsable_remise manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_contrat();
  v_client := (jeu ->> 'client')::uuid;
  v_contrat := (jeu ->> 'contrat')::uuid;
  v_siege := (jeu ->> 'siege')::uuid;

  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_poser_responsable_remise(%L::uuid, %L::uuid)', v_siege, jeu ->> 'collab'), '42501', null, 'Un collaborateur ne règle pas le responsable des remises');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  return next throws_ok(format('select public.loc_poser_responsable_remise(%L::uuid, null)', v_siege), '22023', null, 'Une personne est obligatoire');
  return next throws_ok(format('select public.loc_poser_responsable_remise(%L::uuid, %L::uuid)', v_siege, jeu ->> 'autre'), '22023', null, 'Une personne d''une autre organisation est refusée');
  r := public.loc_poser_responsable_remise(v_siege, (jeu ->> 'collab')::uuid);
  return next is(r ->> 'responsable', jeu ->> 'collab', 'Le collaborateur du siège reçoit les remises de son agence');

  -- le retour : la remise lui revient d'office
  perform tests.redevenir_admin();
  jeu := tests.tavaro_chiffrer(jeu, 'collab', tests.tavaro_retour() || jsonb_build_object('retour_reel_le', to_char(now() - interval '1 hour', 'YYYY-MM-DD"T"HH24:MI:SSOF')));
  perform tests.redevenir_admin();
  return next is((select x.responsable::text from public.loc_remises x where x.client_id = v_client and x.contrat_id = v_contrat), jeu ->> 'collab', 'La remise créée au retour revient d''office au responsable de l''agence');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.responsable_remise_pose') >= 1, 'Le journal porte tavaro.responsable_remise_pose');
end $f$;

select * from runtests('tests'::name, '^test_b2_26_');
