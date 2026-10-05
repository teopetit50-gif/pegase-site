-- Tests A4 — le parcours d'une facture : identité vérifiée, exercice, validation par la file, archive au journal,
-- imputation apprise, comptabilisation, échéancier, règlement, export. Données d'exemple seulement.
-- Exécutable tel quel (DO … assert …) ; tout est annulé à la fin (rollback).
-- Lignes du site rendues vraies : voir NOTES-A4.md.
begin;
do $$
declare
  v_cl uuid := gen_random_uuid(); v_e uuid := gen_random_uuid();
  v_g uuid := gen_random_uuid(); v_v uuid := gen_random_uuid(); v_c uuid := gen_random_uuid();
  v_four uuid; v_piece uuid; v_doc uuid; v_f uuid; v_f2 uuid; v_exo uuid; v_compte uuid; v_centre uuid;
  v_statut text; v_d public.demandes_validation; v_n int; v_j jsonb; v_imp public.filed_imputations; v_csv text; v_r record;
begin
  -- ── Une organisation d'exemple : un gérant, un valideur, un collaborateur ──
  insert into auth.users (id, email, instance_id, aud, role, encrypted_password, created_at, updated_at) values
    (v_g, 'gerant@exemple.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '', now(), now()),
    (v_v, 'valideur@exemple.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '', now(), now()),
    (v_c, 'collaborateur@exemple.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '', now(), now());
  insert into public.clients (id, nom) values (v_cl, 'Organisation d''exemple A4');
  insert into public.entites (id, client_id, nom, type, principale, fuseau, siren) values (v_e, v_cl, 'Société d''exemple', 'societe', true, 'Europe/Paris', '987654329');
  insert into public.comptes (user_id, client_id, role) values (v_g, v_cl, 'gerant'), (v_v, v_cl, 'valideur'), (v_c, v_cl, 'collaborateur');
  set local role service_role;
  perform public.filed_installer(v_cl);
  reset role;
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, siren, tva, pays, statut)
  values (v_cl, 'FOUR1', 'Fournisseur d''exemple', 'fournisseur d exemple', '123456782', 'FR11123456782', 'FR', 'actif') returning id into v_four;

  -- ── Le gérant pose l'exercice, un compte et un centre ──
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_g, 'role', 'authenticated')::text, true);
  v_exo := public.filed_ouvrir_exercice(v_cl, null, date '2026-01-01', date '2026-12-31', 'Exercice 2026');
  v_compte := public.filed_poser_compte(v_cl, null, '6061', 'Fournitures non stockables', 'charge', true);
  v_centre := public.filed_poser_centre(v_cl, null, 'ATELIER', 'Atelier');
  reset role;
  assert v_exo is not null and v_compte is not null and v_centre is not null, 'exercice, compte et centre posés';
  raise notice 'OK plan comptable et centre de coût par organisation';

  -- ── Une facture reçue, déposée par le collaborateur ──
  insert into public.pieces (id, client_id, objet_type, objet_id, sha256, statut) values (gen_random_uuid(), v_cl, 'filed_document', 'x', repeat('a', 64), 'lue') returning id into v_piece;
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, reference, piece_id, source, depose_par, sha256, recu_le, etat, nature)
  values (v_cl, v_e, 2026, 1, 'R2026-000001', v_piece, 'courriel', v_c, repeat('a', 64), now() - interval '2 days', 'a_traiter', 'facture') returning id into v_doc;
  insert into public.filed_factures (client_id, entite_id, document_id, nature, numero, numero_normalise, date_emission, date_reception, echeance_lue, devise, montant_ht, montant_tva, montant_ttc,
                                     fournisseur_id, fournisseur_identification, fournisseur_lu, acheteur_lu, empreinte_donnees, statut)
  values (v_cl, v_e, v_doc, 'facture', 'F-2026-001', 'F2026001', date '2026-03-10', current_date, current_date + 20, 'EUR', 100.00, 20.00, 120.00,
          v_four, 'siren', '{"siren": "123456782", "tva": "FR11123456782", "nom": "Fournisseur d''exemple"}', '{"siren": "987654329"}', repeat('b', 64), 'a_completer')
  returning id into v_f;

  -- ── Le contrôle : identité, exercice, puis la demande de validation ──
  v_statut := private.filed_controler_facture(v_f);
  assert v_statut = 'a_valider', 'facture à valider, reçu : ' || v_statut;
  assert (select resultat from public.filed_controles where facture_id = v_f and code = 'identite.tva_intracom') = 'ok', 'TVA intracommunautaire vérifiée (format + clé)';
  assert (select resultat from public.filed_controles where facture_id = v_f and code = 'identite.siren') = 'ok', 'SIREN vérifié (clé)';
  assert (select resultat from public.filed_controles where facture_id = v_f and code = 'identite.coherence') = 'ok', 'TVA et SIREN cohérents';
  assert (select resultat from public.filed_controles where facture_id = v_f and code = 'identite.registre') = 'anomalie', 'registre : vérification demandée à l''ouvrier';
  assert exists (select 1 from public.filed_verifications_tiers where client_id = v_cl and registre = 'vies' and identifiant = 'FR11123456782' and repondu_le is null), 'demande VIES ouverte';
  raise notice 'OK le numéro de TVA intracommunautaire et le SIREN sont vérifiés avant classement';
  assert (select exercice_id from public.filed_factures_exercices where facture_id = v_f) = v_exo, 'facture affectée à son exercice';
  assert (select resultat from public.filed_controles where facture_id = v_f and code = 'exercice.cloture') = 'ok', 'exercice ouvert : pas d''orientation';
  select * into v_d from public.demandes_validation where module = 'filed' and objet_type = 'filed_facture' and objet_id = v_f::text and statut = 'en_attente';
  assert v_d.id is not null and v_d.type_action = 'filed.valider_facture', 'demande de validation déposée';
  assert (v_d.payload->'saisi_par') @> to_jsonb(array[v_c]), 'le déposant est connu de la demande';
  raise notice 'OK demande de validation déposée (type %, % approbation(s), rôles %)', v_d.type_action, v_d.approbations_requises, v_d.roles_autorises;

  -- ── Le valideur approuve, le moteur exécute : validée, archivée au journal ──
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_v, 'role', 'authenticated')::text, true);
  insert into public.approbations (demande_id, decision, commentaire) values (v_d.id, 'approuve', 'Conforme au devis.');
  reset role;
  assert (select statut from public.demandes_validation where id = v_d.id) = 'approuvee', 'demande approuvée par le socle';
  v_j := private.filed_traiter(10);
  assert (v_j->>'decisions')::int >= 1, 'le moteur a exécuté la décision : ' || v_j::text;
  assert (select statut from public.filed_factures where id = v_f) = 'validee', 'facture validée';
  assert (select statut from public.demandes_validation where id = v_d.id) = 'executee', 'demande exécutée';
  assert (select count(*) from public.filed_archives where facture_id = v_f) = 1, 'une archive';
  assert exists (select 1 from public.journal_opposable j join public.filed_archives a on a.journal_id = j.id where a.facture_id = v_f and j.action = 'filed.archive' and j.donnees->>'empreinte_archive' = a.empreinte_archive), 'empreinte au journal opposable';
  assert exists (select 1 from public.filed_factures_annexes where facture_id = v_f and nature = 'approbation' and texte = 'Conforme au devis.'), 'le commentaire d''approbation reste attaché';
  raise notice 'OK validée, archivage probant : empreinte au journal';

  -- ── Le recontrôle ne touche pas à la décision ──
  v_statut := private.filed_controler_facture(v_f);
  assert v_statut = 'validee', 'une facture validée garde son statut au recontrôle : ' || v_statut;

  -- ── Piste d'audit et intégrité, lues par le gérant ──
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_g, 'role', 'authenticated')::text, true);
  select count(*) into v_n from public.filed_piste_audit(v_f);
  assert v_n >= 8, 'piste d''audit reconstituée (' || v_n || ' lignes)';
  assert (select count(distinct source) from public.filed_piste_audit(v_f)) >= 5, 'la piste couvre document, historique, contrôles, validation, archive, journal';
  v_j := public.filed_verifier_archive(v_f);
  assert (v_j->>'integre')::boolean, 'archive intègre : ' || v_j::text;
  raise notice 'OK piste d''audit reconstituable (% lignes), archive intègre', v_n;

  -- ── L'imputation posée par le gérant, apprise pour le fournisseur ──
  v_n := public.filed_imputer_facture(v_f, jsonb_build_array(jsonb_build_object('numero', '6061', 'code', 'ATELIER', 'montant_ht', 100)), 'Fournitures atelier');
  assert v_n = 1, 'une ligne imputée';
  reset role;
  assert (select count(*) from public.filed_imputations where facture_id = v_f and statut = 'validee' and compte_id = v_compte and centre_id = v_centre) = 1, 'compte et centre portés par la facture';
  assert (select nb_validees from public.filed_imputations_apprises where fournisseur_id = v_four and compte_id = v_compte and centre_id = v_centre) = 1, 'imputation apprise';
  raise notice 'OK chaque pièce est affectée au plan comptable et au centre de coût';

  -- ── Une deuxième facture du même fournisseur : l'imputation est proposée, jamais écrite ──
  insert into public.pieces (id, client_id, objet_type, objet_id, sha256, statut) values (gen_random_uuid(), v_cl, 'filed_document', 'y', repeat('c', 64), 'lue') returning id into v_piece;
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, reference, piece_id, source, depose_par, sha256, recu_le, etat, nature)
  values (v_cl, v_e, 2026, 2, 'R2026-000002', v_piece, 'courriel', v_c, repeat('c', 64), now() - interval '1 day', 'a_traiter', 'facture') returning id into v_doc;
  insert into public.filed_factures (client_id, entite_id, document_id, nature, numero, numero_normalise, date_emission, date_reception, echeance_lue, devise, montant_ht, montant_tva, montant_ttc,
                                     fournisseur_id, fournisseur_identification, fournisseur_lu, acheteur_lu, empreinte_donnees, statut)
  values (v_cl, v_e, v_doc, 'facture', 'F-2026-002', 'F2026002', date '2026-04-02', current_date, current_date + 45, 'EUR', 250.00, 50.00, 300.00,
          v_four, 'siren', '{"siren": "123456782", "tva": "FR11123456782"}', '{"siren": "987654329"}', repeat('d', 64), 'a_completer')
  returning id into v_f2;
  v_statut := private.filed_controler_facture(v_f2);
  assert v_statut = 'a_valider', 'deuxième facture à valider : ' || v_statut;
  select * into v_imp from public.filed_imputations where facture_id = v_f2;
  assert v_imp.statut = 'proposee' and v_imp.origine = 'apprise' and v_imp.compte_id = v_compte and v_imp.centre_id = v_centre and v_imp.demande_id is not null, 'imputation apprise proposée, soumise à validation';
  assert (select type_action from public.demandes_validation where id = v_imp.demande_id) = 'filed.imputer', 'demande filed.imputer déposée';
  raise notice 'OK l''imputation analytique s''apprend fournisseur par fournisseur, proposée à validation (confiance %)', v_imp.confiance;

  -- Le valideur approuve l'imputation : elle devient l'écriture de la facture, l'apprentissage se renforce.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_v, 'role', 'authenticated')::text, true);
  insert into public.approbations (demande_id, decision) values (v_imp.demande_id, 'approuve');
  reset role;
  v_j := private.filed_traiter(10);
  assert (select statut from public.filed_imputations where id = v_imp.id) = 'validee', 'imputation validée par la file';
  assert (select nb_validees from public.filed_imputations_apprises where fournisseur_id = v_four and compte_id = v_compte and centre_id = v_centre) = 2, 'apprentissage renforcé';

  -- ── Pilotage : en cours, échéancier, engagé, délai, mesures, export ──
  -- La deuxième facture est encore à valider ; la première est validée, échéance à 20 jours.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_g, 'role', 'authenticated')::text, true);
  assert (select nombre from public.filed_pieces_en_cours(v_cl) where categorie = 'attente') = 1, 'une pièce en attente d''approbation';
  assert (select count(*) from public.filed_echeancier(v_cl) where facture_id = v_f and horizon = '30 jours' and reste_a_payer = 120.00) = 1, 'échéancier : 120 € à 30 jours';
  assert (select count(*) from public.filed_engage_mois(v_cl, date '2026-03-01') where fournisseur_id = v_four and centre_id = v_centre and montant_ht = 100.00) = 1, 'engagé de mars par fournisseur et centre';
  assert (select nb_factures from public.filed_delai_traitement(v_cl, current_date - 30, current_date)) = 1, 'délai de traitement mesuré sur une facture';
  assert (select delai_moyen_jours from public.filed_delai_traitement(v_cl, current_date - 30, current_date)) between 1.9 and 2.1, 'délai moyen ≈ 2 jours (réception → classement)';
  v_csv := public.filed_exporter_tableau(v_cl, 'factures', current_date - 1, current_date);
  assert v_csv like '%F-2026-001%' and v_csv like '%6061%' and v_csv like '%Exercice 2026%', 'export CSV des factures avec compte et exercice';
  v_csv := public.filed_exporter_tableau(v_cl, 'echeancier');
  assert v_csv like '%120,00%', 'export CSV de l''échéancier';
  perform public.filed_marquer_reglee(v_f, current_date, null, 'virement', 'VIR-1');
  assert (select count(*) from public.filed_echeancier(v_cl) where facture_id = v_f) = 0, 'réglée : sortie de l''échéancier';
  perform public.filed_comptabiliser_facture(v_f, 'Lot du jour');
  reset role;
  assert (select statut from public.filed_factures where id = v_f) = 'comptabilisee', 'facture comptabilisée';
  assert exists (select 1 from public.journal_opposable where client_id = v_cl and action = 'filed.export'), 'chaque export s''inscrit au journal';
  v_n := private.filed_mesurer(v_cl, current_date);
  assert (select valeur from public.mesures where client_id = v_cl and indicateur = 'filed.pieces_attente' and entite_id is null and debut = current_date) = 1, 'mesure filed.pieces_attente';
  assert (select valeur from public.mesures where client_id = v_cl and indicateur = 'filed.delai_traitement' and entite_id is null and debut = current_date) between 1.9 and 2.1, 'mesure filed.delai_traitement';
  raise notice 'OK pilotage : engagé, échéancier, délai, pièces en cours, mesures, export';

  -- ── Le journal reste chaîné ──
  assert (select count(*) from public.journal_opposable where client_id = v_cl) >= 6, 'journal nourri';
  raise notice 'PARCOURS FACTURE : tous les contrôles passent.';
end $$;
rollback;
