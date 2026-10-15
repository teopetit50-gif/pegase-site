-- 21 — Départ, rappels du constructeur et Crit'Air (migration b2_12) : la vignette et le contrôle technique saisis par
-- l'agence ; le contrôle du comptoir au départ (Crit'Air, rappel en cours, contrôle technique, entretien dû) ; un rappel
-- immobilisant retire le véhicule, un rappel à planifier crée l'entretien ; les photos des états des lieux signés vont
-- avec la facture.

create or replace function tests.test_b2_21_conformite_rappels() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_contrat uuid; v_vehicule uuid; r jsonb; v_rv uuid; v_immo uuid; v_rappel uuid; v_prop uuid; v_edl uuid;
begin
  if to_regprocedure('public.loc_controle_depart(uuid)') is null then
    return next fail('La migration b2_12 (départ, rappels, Crit''Air) n''est pas posée : public.loc_controle_depart manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_contrat();
  v_client := (jeu ->> 'client')::uuid;
  v_contrat := (jeu ->> 'contrat')::uuid;
  select c.vehicule_id into v_vehicule from public.loc_contrats c where c.id = v_contrat;

  -- La vignette inconnue : le comptoir le dit.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  r := public.loc_controle_depart(v_contrat);
  return next ok(exists (select 1 from jsonb_array_elements(r) x where x ->> 'code' = 'critair' and x ->> 'niveau' = 'attention'), 'Crit''Air inconnu : le comptoir vérifie la vignette');
  return next throws_ok(format('select public.loc_poser_conformite(%L::uuid, %L::jsonb)', v_vehicule, '{"critair":"7"}'), '22023', null, 'Une classe Crit''Air inconnue est refusée');
  r := public.loc_poser_conformite(v_vehicule, jsonb_build_object('critair', '1', 'ct_valide_jusqu_au', (current_date - 1)::text));
  return next is(r ->> 'critair', '1', 'La vignette est saisie');
  r := public.loc_controle_depart(v_contrat);
  return next ok(exists (select 1 from jsonb_array_elements(r) x where x ->> 'code' = 'critair' and x ->> 'niveau' = 'info'), 'La vignette connue est rappelée au client');
  return next ok(exists (select 1 from jsonb_array_elements(r) x where x ->> 'code' = 'controle_technique' and x ->> 'niveau' = 'bloquant'), 'Un contrôle technique expiré bloque le départ');
  perform public.loc_poser_conformite(v_vehicule, jsonb_build_object('ct_valide_jusqu_au', (current_date + 400)::text));
  r := public.loc_controle_depart(v_contrat);
  return next ok(not exists (select 1 from jsonb_array_elements(r) x where x ->> 'code' = 'controle_technique'), 'Un contrôle technique valide ne dit rien');

  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre@essai.invalid');
  return next throws_ok(format('select public.loc_controle_depart(%L::uuid)', v_contrat), 'P0002', null, 'Un autre loueur ne lit pas le contrôle du départ');
  return next throws_ok(format('select public.loc_poser_conformite(%L::uuid, %L::jsonb)', v_vehicule, '{"critair":"2"}'), 'P0002', null, 'Ni ne saisit la vignette');

  -- Les rappels : la direction ou un valideur.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_enregistrer_rappel(%L::jsonb, array[%L::uuid])', '{"reference":"RC-B2-1","libelle":"Airbag passager","gravite":"immobilisant"}', v_vehicule),
                        '42501', null, 'Un collaborateur n''enregistre pas un rappel');
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  return next throws_ok(format('select public.loc_enregistrer_rappel(%L::jsonb, array[%L::uuid])', '{"reference":"RC-B2-1","libelle":"Airbag passager","gravite":"urgent"}', v_vehicule),
                        '22023', null, 'Une gravité inconnue est refusée');
  r := public.loc_enregistrer_rappel(jsonb_build_object('reference', 'RC-B2-1', 'libelle', 'Airbag passager à remplacer', 'gravite', 'immobilisant',
                                                        'constructeur', 'Renault', 'fin_prevue_le', now() + interval '2 days'), array[v_vehicule]);
  v_rappel := (r ->> 'rappel')::uuid;
  select x.id, x.immobilisation_id into v_rv, v_immo from public.loc_rappels_vehicules x where x.rappel_id = v_rappel;
  return next ok(v_immo is not null, 'Un rappel immobilisant immobilise le véhicule');
  return next ok((select i.motif = 'rappel_constructeur' and i.fin_le is null from public.loc_immobilisations i where i.id = v_immo), 'L''immobilisation porte le motif du rappel');
  return next throws_ok(format('select public.loc_enregistrer_rappel(%L::jsonb, array[%L::uuid])', '{"reference":"RC-B2-1","libelle":"Airbag passager","gravite":"immobilisant"}', v_vehicule),
                        '23505', null, 'Une campagne s''enregistre une fois');
  r := public.loc_controle_depart(v_contrat);
  return next ok(exists (select 1 from jsonb_array_elements(r) x where x ->> 'code' = 'rappel' and x ->> 'niveau' = 'bloquant'), 'Le rappel immobilisant bloque le départ');
  r := public.loc_enregistrer_rappel(jsonb_build_object('reference', 'RC-B2-2', 'libelle', 'Mise à jour du calculateur', 'gravite', 'a_planifier',
                                                        'echeance_le', (current_date + 60)::text), array[v_vehicule]);
  return next ok((select x.entretien_id is not null from public.loc_rappels_vehicules x where x.rappel_id = (r ->> 'rappel')::uuid), 'Un rappel à planifier crée l''entretien');

  -- Le rappel fait : l'immobilisation est levée.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  r := public.loc_rappel_fait(v_rv);
  return next is(r ->> 'statut', 'fait', 'Le rappel est fait');
  perform tests.redevenir_admin();
  return next ok((select i.fin_le is not null from public.loc_immobilisations i where i.id = v_immo), 'L''immobilisation du rappel est levée');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.rappel_fait') >= 1, 'Le journal porte tavaro.rappel_fait');
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_rappel_fait(%L::uuid)', v_rv), '23514', null, 'Un rappel clos ne se refait pas');

  -- La surveillance du matin : un contrôle technique qui échoit.
  perform tests.redevenir_admin();
  update public.loc_vehicules_conformite set ct_valide_jusqu_au = current_date + 5 where client_id = v_client and vehicule_id = v_vehicule;
  return next ok(private.loc_surveiller_conformite() >= 1, 'Un contrôle technique qui échoit lève une alerte');

  -- Les photos des états des lieux signés vont avec la facture, celles du départ d'abord.
  jeu := tests.tavaro_jeu_facture();
  v_prop := (jeu ->> 'proposition')::uuid;
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_edl := public.loc_etablir_etat((jeu ->> 'contrat')::uuid, 'depart', jsonb_build_object('km', 12000, 'carburant_8', 8,
             'photos', '[{"vue":"avant","chemin":"edl/avant.jpg"},{"vue":"arriere","chemin":"edl/arriere.jpg"},{"vue":"flanc_gauche","chemin":"edl/gauche.jpg"},{"vue":"flanc_droit","chemin":"edl/droit.jpg"}]'::jsonb));
  perform public.loc_signer_etat(v_edl, 'Marie Durand', 'edl/signature.png');
  perform tests.redevenir_admin();
  r := public.loc_pdf_a_produire(v_prop);
  return next ok(exists (select 1 from jsonb_array_elements(r -> 'factures') f, jsonb_array_elements(f -> 'photos') p
                         where p ->> 'legende' = 'État des lieux de départ — flanc gauche' and p ->> 'chemin' = 'edl/gauche.jpg'), 'Les photos du départ signé sont jointes à la facture, légendées');
end $f$;

select * from runtests('tests'::name, '^test_b2_21_');
