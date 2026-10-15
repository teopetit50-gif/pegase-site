-- 25 — Contrats d'interface sans fournisseur (migration b2_16) : la grille d'assistance de l'agence ; l'appel reçu par
-- le fournisseur de voix retrouve le contrat par le numéro de l'appelant, applique la grille, prévient l'agence, et passe
-- la main à une personne sans grille ni contrat ; les relevés constructeur comparés à l'état des lieux de retour ; la
-- caution préautorisée, capturée sur une facture du contrat dans ses bornes, libérée. Les portes des fournisseurs sont
-- au service seul.

create or replace function tests.test_b2_25_interfaces_tiers() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_contrat uuid; v_vehicule uuid; r jsonb; i1 uuid; k uuid; f uuid; v_ttc numeric;
begin
  if to_regprocedure('public.loc_caution_evenement(uuid, jsonb)') is null then
    return next fail('La migration b2_16 (interfaces tiers) n''est pas posée : public.loc_caution_evenement manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_facture();
  v_client := (jeu ->> 'client')::uuid;
  v_contrat := (jeu ->> 'contrat')::uuid;
  select c.vehicule_id into v_vehicule from public.loc_contrats c where c.id = v_contrat;
  update public.loc_locataires l set telephone = '+33 6 12 34 56 78' from public.loc_contrats c where c.id = v_contrat and l.id = c.locataire_id;
  update public.loc_contrats set statut = 'ouvert' where id = v_contrat;

  -- Les portes des fournisseurs ne s'ouvrent pas à une personne connectée.
  return next ok(not has_function_privilege('authenticated', 'public.loc_assistance_ouvrir(uuid, jsonb)', 'execute')
                 and not has_function_privilege('authenticated', 'public.loc_assistance_evenement(uuid, jsonb)', 'execute')
                 and not has_function_privilege('authenticated', 'public.loc_enregistrer_releves_constructeur(uuid, text, jsonb)', 'execute')
                 and not has_function_privilege('authenticated', 'public.loc_caution_evenement(uuid, jsonb)', 'execute'), 'Les portes des fournisseurs sont au service seul');

  -- La grille : la direction.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_poser_grille_assistance(%L::jsonb)', '[{"type_incident":"panne","action":"depanneuse"}]'), '42501', null, 'Un collaborateur ne règle pas la grille');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  return next throws_ok(format('select public.loc_poser_grille_assistance(%L::jsonb)', '[{"type_incident":"meteorite","action":"depanneuse"}]'), '22023', null, 'Un type d''incident inconnu est refusé');
  r := public.loc_poser_grille_assistance('[{"type_incident":"panne","action":"depanneuse","prestataire":"Dépannage de la Gare","prestataire_telephone":"0100000000","delai_cible_min":45}]');
  return next is((r ->> 'lignes')::int, 1, 'La grille est posée');

  -- L'appel arrive (service).
  perform tests.redevenir_admin();
  r := public.loc_assistance_ouvrir(v_client, '{"fournisseur":"voix-essai","fournisseur_reference":"APPEL-1","canal":"telephone","appelant_telephone":"06 12 34 56 78","type_incident":"panne","position":"A6, sortie 12"}');
  i1 := (r ->> 'incident')::uuid;
  return next ok(r ->> 'contrat' = 'C-2026-0001' and r ->> 'action' = 'depanneuse' and not (r ->> 'transferer')::boolean, 'Le contrat est retrouvé par le numéro, la grille dit la dépanneuse');
  r := public.loc_assistance_ouvrir(v_client, '{"fournisseur":"voix-essai","fournisseur_reference":"APPEL-1","type_incident":"panne"}');
  return next ok((r ->> 'deja')::boolean and (r ->> 'incident')::uuid = i1, 'Rejouer l''appel n''ouvre pas un second dossier');
  r := public.loc_assistance_ouvrir(v_client, '{"fournisseur":"voix-essai","fournisseur_reference":"APPEL-2","appelant_telephone":"0700000000","type_incident":"cle_perdue"}');
  return next ok((r ->> 'transferer')::boolean and r ->> 'contrat' is null, 'Sans contrat ni grille, l''assistant passe la main à une personne');
  return next throws_ok(format('select public.loc_assistance_ouvrir(%L::uuid, %L::jsonb)', v_client, '{"type_incident":"panne"}'), '22023', null, 'Un appel sans référence du fournisseur est refusé');
  perform public.loc_assistance_evenement(i1, jsonb_build_object('type', 'missionne', 'prestataire', 'Dépannage de la Gare', 'arrivee_estimee_le', now() + interval '40 minutes'));
  return next is((select x.statut from public.loc_incidents x where x.id = i1), 'missionne', 'Le dépanneur est missionné');
  return next throws_ok(format('select public.loc_assistance_evenement(%L::uuid, %L::jsonb)', i1, '{"type":"danse"}'), '22023', null, 'Un événement inconnu est refusé');

  -- L'agence clôt, et ouvre le sinistre depuis l'incident.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  r := public.loc_clore_incident(i1, 'Remorqué au garage', true);
  return next ok(r ->> 'sinistre' is not null, 'L''incident clos ouvre le dossier de sinistre');
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre@essai.invalid');
  return next throws_ok(format('select public.loc_clore_incident(%L::uuid)', i1), 'P0002', null, 'Un autre loueur ne voit pas l''incident');

  -- Les relevés constructeur (service), comparés à l'état des lieux de retour.
  perform tests.redevenir_admin();
  r := public.loc_enregistrer_releves_constructeur(v_client, 'agregateur-essai', jsonb_build_array(
    jsonb_build_object('immatriculation', 'GA-123-BC', 'lu_le', '2026-10-05T11:20:00+02:00', 'km', 12640, 'carburant_pct', 62.5),
    jsonb_build_object('immatriculation', 'ZZ-000-ZZ', 'lu_le', '2026-10-05T11:20:00+02:00', 'km', 1)));
  return next is(r, '{"releves": 1, "vehicules_inconnus": 1}'::jsonb, 'Le relevé du véhicule est gardé, l''inconnu compté');
  return next throws_ok(format('select public.loc_enregistrer_releves_constructeur(%L::uuid, %L, %L::jsonb)', v_client, 'agregateur-essai',
                        '[{"immatriculation":"GA-123-BC","lu_le":"2026-10-05T11:00:00+02:00","carburant_pct":140}]'), '22023', null, 'Un relevé hors bornes est refusé');
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  r := public.loc_releve_au_retour(v_contrat);
  return next ok((r -> 'releve' ->> 'km')::int = 12640 and (r -> 'releve' ->> 'carburant_8')::int = 5, 'Le relevé le plus proche du retour est lu, en huitièmes');

  -- La caution.
  r := public.loc_demander_preautorisation(v_contrat);
  k := (r ->> 'caution')::uuid;
  return next throws_ok(format('select public.loc_demander_preautorisation(%L::uuid, 100)', v_contrat), '23505', null, 'Une seule caution en cours par contrat');
  return next throws_ok(format('select public.loc_liberer_caution(%L::uuid)', k), '23514', null, 'Une caution pas encore préautorisée ne se libère pas');
  perform tests.redevenir_admin();
  return next ok((r ->> 'montant_eur')::numeric > 0 and exists (select 1 from public.travaux t where t.cle = 'tavaro:caution:' || k::text || ':preautoriser'),
                 'La préautorisation est demandée au montant du dépôt, le travail attend l''ouvrier du prestataire');
  r := public.loc_caution_evenement(k, jsonb_build_object('type', 'preautorisee', 'prestataire', 'psp-essai', 'reference_externe', 'pi_essai_1', 'expire_le', now() + interval '7 days'));
  return next is(r ->> 'statut', 'preautorisee', 'Le prestataire confirme la préautorisation');
  return next ok((public.loc_caution_evenement(k, '{"type":"preautorisee"}') ->> 'ignore')::boolean, 'Un événement rejoué ne défait rien');
  select (x ->> 'id')::uuid, (x ->> 'total_ttc')::numeric into f, v_ttc from jsonb_array_elements(jeu -> 'factures') x order by (x ->> 'total_ttc')::numeric desc limit 1;
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_capturer_caution(%L::uuid, %L::uuid, 10, %L)', k, f, 'Rayure portière'), '42501', null, 'Un collaborateur ne capture pas la caution');
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  return next throws_ok(format('select public.loc_capturer_caution(%L::uuid, %L::uuid, %s, %L)', k, f, (select x.montant_eur + 1 from public.loc_cautions x where x.id = k), 'Rayure portière'),
                        '22023', null, 'Jamais plus que la préautorisation');
  r := public.loc_capturer_caution(k, f, least(10, v_ttc), 'Rayure portière avant droite');
  return next is(r ->> 'statut', 'capture_demandee', 'La capture est demandée sur une facture du contrat');
  perform tests.redevenir_admin();
  r := public.loc_caution_evenement(k, '{"type":"echec","erreur":"carte refusée"}');
  return next is(r ->> 'statut', 'preautorisee', 'Un échec de capture garde la préautorisation');
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  perform public.loc_capturer_caution(k, f, least(10, v_ttc), 'Rayure portière avant droite');
  perform tests.redevenir_admin();
  r := public.loc_caution_evenement(k, jsonb_build_object('type', 'capturee', 'montant_eur', least(10, v_ttc)));
  return next ok(r ->> 'statut' = 'capturee' and (select x.capture_eur from public.loc_cautions x where x.id = k) = least(10, v_ttc), 'La capture est confirmée');
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  r := public.loc_liberer_caution(k);
  return next is(r ->> 'statut', 'liberation_demandee', 'Le reste se libère');
  perform tests.redevenir_admin();
  return next is((public.loc_caution_evenement(k, '{"type":"liberee"}') ->> 'statut'), 'liberee', 'Le prestataire confirme la libération');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.caution_capturee') >= 1, 'Le journal porte tavaro.caution_capturee');
end $f$;

select * from runtests('tests'::name, '^test_b2_25_');
