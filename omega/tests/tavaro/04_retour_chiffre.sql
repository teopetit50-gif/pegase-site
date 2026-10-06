-- 04 — Le collaborateur chiffre le retour (scénario, étape 6) : carburant, kilomètres, retard, dommage plafonné, TVA ;
-- un dommage sans photo bloque ; un retour non contradictoire part hors barème.

create or replace function tests.test_b2_04_retour_chiffre() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_contrat uuid; v_prop uuid; p public.loc_propositions; l public.loc_proposition_lignes; v_prop2 uuid;
begin
  jeu := tests.tavaro_jeu_contrat();
  v_client := (jeu ->> 'client')::uuid;
  v_contrat := (jeu ->> 'contrat')::uuid;

  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_prop := public.loc_chiffrer_retour(v_contrat, tests.tavaro_retour());
  perform tests.redevenir_admin();
  select * into p from public.loc_propositions where id = v_prop;

  return next is(p.statut, 'calculee', format('La proposition est calculée (avertissements : %s)', p.avertissements));
  return next is(p.version, 1, 'Version 1');
  return next is(p.source, 'saisie', 'Source : la saisie de l''agence');
  return next is(p.calculee_par, (jeu ->> 'collab')::uuid, 'Elle porte qui a chiffré');
  return next is(p.bareme_id, (jeu ->> 'bareme')::uuid, 'Au barème en vigueur au départ');
  return next is(p.hors_bareme, false, 'Tout est au barème');
  return next is(p.plafond_eur, 800::numeric, 'Le plafond des dommages est la franchise (800 €, pas de rachat)');

  -- Carburant : 3/8 manquants × 12 € = 36 € HT.
  select * into l from public.loc_proposition_lignes where proposition_id = v_prop and famille = 'carburant';
  return next is(l.quantite, 3::numeric, 'Carburant : 3 huitièmes manquants');
  return next is(l.montant_ht, 36.00::numeric, 'Carburant : 36,00 € HT');
  return next is(l.montant_tva, 7.20::numeric, 'Carburant : TVA 7,20 € (20 %)');
  return next is(jsonb_array_length(l.preuves), 1, 'Carburant : la photo de la jauge est jointe');
  -- Kilomètres : 650 parcourus, 600 inclus, 50 × 0,25 = 12,50 € HT.
  select * into l from public.loc_proposition_lignes where proposition_id = v_prop and famille = 'kilometres';
  return next is(l.quantite, 50::numeric, 'Kilomètres : 50 au-delà du forfait');
  return next is(l.montant_ht, 12.50::numeric, 'Kilomètres : 12,50 € HT');
  -- Retard : 26 h 30 au-delà des 59 min de tolérance → 2 jours entamés × 45 € = 90 € HT.
  select * into l from public.loc_proposition_lignes where proposition_id = v_prop and famille = 'retard';
  return next is(l.quantite, 2::numeric, 'Retard : deux jours entamés (26 h 30, tolérance 59 min)');
  return next is(l.prix_unitaire, 45::numeric, 'Retard : au tarif journalier du contrat');
  return next is(l.montant_ht, 90.00::numeric, 'Retard : 90,00 € HT');
  return next is((p.calcul_retard ->> 'retard_min')::int, 1590, 'Le calcul du retard est gardé (1 590 min)');
  -- Nettoyage : 60 € HT taxable.
  select * into l from public.loc_proposition_lignes where proposition_id = v_prop and famille = 'nettoyage';
  return next is(l.montant_ttc, 72.00::numeric, 'Nettoyage : 72,00 € TTC');
  -- Dommage : rayure 180 € hors champ, sous le plafond.
  select * into l from public.loc_proposition_lignes where proposition_id = v_prop and nature = 'dommage';
  return next is(l.code, 'RAYURE_PORTIERE', 'Dommage : la rayure');
  return next is(l.montant_ttc, 180.00::numeric, 'Dommage : 180,00 €');
  return next is(l.montant_tva, 0::numeric, 'Dommage : hors du champ de la TVA');
  return next is(l.plafonnee, false, 'Dommage : sous la franchise, pas plafonné');
  return next is(l.statut, 'chiffree', 'Dommage : chiffré (photo jointe)');
  -- Totaux : frais 198,50 HT + 39,70 TVA = 238,20 ; dommages 180 ; total 418,20.
  return next is(p.total_frais_ttc, 238.20::numeric, 'Total des frais : 238,20 € TTC');
  return next is(p.total_dommages_ttc, 180.00::numeric, 'Total des dommages : 180,00 €');
  return next is(p.total_ttc, 418.20::numeric, 'Total : 418,20 € TTC');
  return next is(tests.compter('public', 'loc_proposition_lignes', format('proposition_id = %L', v_prop)), 5::bigint, 'Cinq lignes');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.proposition_calculee') >= 1, 'Le journal opposable porte tavaro.proposition_calculee');
  return next is(jsonb_array_length(tests.tavaro_travaux(v_client, 'tavaro.deposer_demande')), 1, 'Le travail tavaro.deposer_demande est déposé dans la file');

  -- Un dommage sans photo : la proposition attend la preuve, aucune demande ne part.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_prop2 := public.loc_chiffrer_retour(v_contrat, jsonb_build_object('retour_reel_le', '2026-10-04T08:00:00+02:00', 'km_retour', 12100,
    'carburant_depart_8', 8, 'carburant_retour_8', 8, 'dommages', jsonb_build_array(jsonb_build_object('code', 'PARE_CHOC'))));
  perform tests.redevenir_admin();
  return next is((select x.statut from public.loc_propositions x where x.id = v_prop2), 'preuve_manquante', 'Un dommage sans photo laisse la proposition en preuve_manquante');
  return next is((select x.statut from public.loc_propositions x where x.id = v_prop), 'remplacee', 'La version précédente non décidée est remplacée');
  return next ok((select x.avertissements from public.loc_propositions x where x.id = v_prop2) @> '[{"poste": "PARE_CHOC", "code": "preuve_absente", "bloquant": true}]'::jsonb, 'L''avertissement nomme le poste et la preuve absente');
  return next is(jsonb_array_length(tests.tavaro_travaux(v_client, 'tavaro.deposer_demande')), 1, 'Aucun nouveau travail de dépôt : la facture attend la preuve');

  -- Un pare-chocs à 950 € photographié : plafonné à la franchise de 800 €.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_prop2 := public.loc_chiffrer_retour(v_contrat, jsonb_build_object('retour_reel_le', '2026-10-04T08:00:00+02:00', 'km_retour', 12100,
    'carburant_depart_8', 8, 'carburant_retour_8', 8, 'dommages', jsonb_build_array(jsonb_build_object('code', 'PARE_CHOC', 'preuves', '[{"photo": "retour/pare-choc.jpg"}]'::jsonb))));
  perform tests.redevenir_admin();
  select * into l from public.loc_proposition_lignes where proposition_id = v_prop2 and nature = 'dommage';
  return next is(l.montant_ttc, 800.00::numeric, 'Le dommage de 950 € est plafonné à la franchise de 800 €');
  return next is(l.plafonnee, true, 'La ligne est marquée plafonnée');
  return next is((l.calcul ->> 'montant_bareme_ttc')::numeric, 950::numeric, 'Le montant du barème reste lisible dans le calcul');

  -- Un retour non signé par le client : les dommages vont à la direction, hors barème.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_prop2 := public.loc_chiffrer_retour(v_contrat, tests.tavaro_retour() || '{"non_contradictoire": true}'::jsonb);
  perform tests.redevenir_admin();
  select * into p from public.loc_propositions where id = v_prop2;
  return next is(p.hors_bareme, true, 'Un état des lieux non contradictoire passe hors barème');
  return next is(p.non_contradictoire, true, 'Et le dit');
  return next ok(p.avertissements @> '[{"code": "etat_des_lieux_non_contradictoire"}]'::jsonb, 'L''avertissement est posé');

  -- Un poste absent du barème avec un prix de l'agence : hors barème ; sans prix : ignoré avec avertissement.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_prop2 := public.loc_chiffrer_retour(v_contrat, jsonb_build_object('retour_reel_le', '2026-10-04T08:00:00+02:00', 'km_retour', 12100,
    'carburant_depart_8', 8, 'carburant_retour_8', 8,
    'postes', jsonb_build_array(jsonb_build_object('code', 'CLE_PERDUE', 'libelle', 'Clé perdue', 'prix_eur', 150, 'preuves', '[{"note": "déclaration du client"}]'::jsonb),
                                jsonb_build_object('code', 'INCONNU'))));
  perform tests.redevenir_admin();
  select * into p from public.loc_propositions where id = v_prop2;
  return next is(p.hors_bareme, true, 'Un prix saisi par l''agence pour un poste absent du barème passe hors barème');
  return next is((select x.montant_ht from public.loc_proposition_lignes x where x.proposition_id = v_prop2 and x.code = 'CLE_PERDUE'), 150::numeric, 'La clé perdue est chiffrée au prix de l''agence');
  return next ok(p.avertissements @> '[{"poste": "INCONNU", "code": "poste_absent_du_bareme"}]'::jsonb, 'Le poste inconnu sans prix est signalé, pas chiffré');

  -- Garde-fous.
  perform tests.endosser((jeu ->> 'collab_nord')::uuid, 'b2-collab-nord@essai.invalid');
  return next lives_ok(format('select public.loc_chiffrer_retour(%L::uuid, tests.tavaro_retour())', v_contrat), 'Un collaborateur à périmètre total chiffre aussi (le périmètre par agence est testé en 10)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre-loueur@essai.invalid');
  return next throws_ok(format('select public.loc_chiffrer_retour(%L::uuid, tests.tavaro_retour())', v_contrat), 'P0002', null, 'Un autre loueur ne chiffre pas ce contrat');
  perform tests.redevenir_admin();
  return next throws_ok(format('select public.loc_chiffrer_retour(%L::uuid, tests.tavaro_retour())', v_contrat), '42501', null, 'Sans personne connectée, pas de chiffrage');
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_chiffrer_retour(%L::uuid, %L::jsonb)', v_contrat, '{"carburant_depart_8": 9, "carburant_retour_8": 2}'), '22023', null, 'Un niveau de carburant hors de 0..8 est refusé');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b2_04_');
