-- 03 — Le collaborateur complète les conditions, le référent prolonge (scénario, étapes 4 et 5) ; les saisies humaines ne s'écrasent pas.

create or replace function tests.test_b2_03_completer_et_amender() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_contrat uuid; r jsonb; c public.loc_contrats; v_am uuid;
begin
  jeu := tests.tavaro_jeu();
  v_client := (jeu ->> 'client')::uuid;
  r := tests.tavaro_contrat(jeu);
  v_contrat := (r ->> 'contrat')::uuid;

  -- Le collaborateur du siège complète.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  r := public.loc_completer_contrat(v_contrat, tests.tavaro_conditions());
  perform tests.redevenir_admin();
  return next is((r ->> 'km_inclus')::int, 600, 'Le forfait kilométrique est posé');
  return next is(r ->> 'politique_carburant', 'plein_contre_plein', 'La politique carburant est posée');
  return next is((r ->> 'rachat_franchise')::boolean, false, 'Le rachat de franchise est posé (non)');
  select * into c from public.loc_contrats where id = v_contrat;
  return next ok(c.saisies ? 'km_inclus' and (c.saisies -> 'km_inclus' ->> 'par')::uuid = (jeu ->> 'collab')::uuid, 'La saisie garde qui l''a faite');

  -- Un relevé suivant ne l'écrase pas.
  r := public.loc_appliquer_releve(v_client, 'contrats',
    jsonb_build_array(jsonb_build_object('n', 1, 'nature', 'ajout', 'valeurs', jsonb_build_object('numero', 'C-2026-0001', 'agence', 'SIEGE', 'km_inclus', 300))),
    jsonb_build_object('cle', 'export:b2:4', 'source', 'export', 'lu_le', now()));
  return next is((select x.km_inclus from public.loc_contrats x where x.id = v_contrat), 600, 'Le forfait saisi par une personne n''est pas écrasé par l''export');
  return next ok((r -> 'avertissements') @> '[{"code": "saisie_protegee", "champ": "km_inclus"}]'::jsonb,
                 format('Le relevé signale la saisie protégée sur km_inclus (code saisie_protegee) : %s', r -> 'avertissements'));

  -- Le collaborateur d'une autre agence, et le gérant d'un autre loueur.
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre-loueur@essai.invalid');
  return next throws_ok(format('select public.loc_completer_contrat(%L::uuid, %L::jsonb)', v_contrat, '{"km_inclus": 1}'), 'P0002', null, 'Un autre loueur ne voit pas ce contrat (introuvable)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_completer_contrat(%L::uuid, %L::jsonb)', v_contrat, '{"numero": "C-9999"}'), '22023', null, 'Seules les conditions se complètent : pas le numéro');
  return next throws_ok(format('select public.loc_completer_contrat(%L::uuid, %L::jsonb)', v_contrat, '{"franchise_reduite_eur": 900}'), '22023', null, 'Une franchise réduite au-dessus de la franchise est refusée (contrainte, traduite)');
  perform tests.redevenir_admin();

  -- Le référent (valideur) prolonge ; le collaborateur ne peut pas.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_amender_contrat(%L::uuid, %L, %L::timestamptz)', v_contrat, 'prolongation', '2026-10-05 09:00:00+02'), '42501', null, 'Le collaborateur n''amende pas un contrat (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  v_am := public.loc_amender_contrat(v_contrat, 'prolongation', timestamptz '2026-10-05 09:00:00 Europe/Paris', null, 'Client retenu un jour de plus');
  return next throws_ok(format('select public.loc_amender_contrat(%L::uuid, %L, %L::timestamptz)', v_contrat, 'retard_offert', '2026-10-06 09:00:00+02'), '22023', null, 'Un retard offert ne déplace pas le retour prévu');
  return next throws_ok(format('select public.loc_amender_contrat(%L::uuid, %L)', v_contrat, 'changement_vehicule'), '22023', null, 'Le changement de véhicule ne passe pas par cette porte');
  perform tests.redevenir_admin();
  return next isnt(v_am, null, 'La prolongation est enregistrée');
  return next is(private.loc_retour_prevu_amende(v_contrat), timestamptz '2026-10-05 09:00:00 Europe/Paris', 'Le retour prévu amendé est celui de la prolongation');
  return next is((select a.origine from public.loc_contrats_amendements a where a.id = v_am), 'agence', 'L''amendement vient de l''agence');
  return next is((select a.accorde_par from public.loc_contrats_amendements a where a.id = v_am), (jeu ->> 'referent')::uuid, 'Il porte qui l''a accordé');
end $f$;

select * from runtests('tests'::name, '^test_b2_03_');
