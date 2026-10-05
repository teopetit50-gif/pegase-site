-- Tests A4 — circuit de validation, clôture, charges récurrentes, écarts signalés, identité fausse.
-- Données d'exemple seulement. Exécutable tel quel ; tout est annulé à la fin (rollback).
begin;
do $$
declare
  v_cl uuid := gen_random_uuid(); v_e uuid;
  v_g uuid := gen_random_uuid(); v_v uuid := gen_random_uuid(); v_v2 uuid := gen_random_uuid(); v_c uuid := gen_random_uuid();
  v_four uuid; v_exo uuid; v_compte uuid; v_centre uuid; v_circuit uuid; v_charge uuid; v_cmd uuid; v_cmdl uuid;
  v_f uuid; v_d public.demandes_validation; v_d2 public.demandes_validation; v_statut text; v_j jsonb; v_n int; v_r record; v_val public.filed_validations; v_exp uuid;
  function_facture text;
begin
  -- ── Organisation d'exemple ──
  insert into auth.users (id, email, instance_id, aud, role, encrypted_password, created_at, updated_at)
  select u, u::text || '@exemple.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '', now(), now() from unnest(array[v_g, v_v, v_v2, v_c]) u;
  insert into public.clients (id, nom) values (v_cl, 'Organisation d''exemple A4 bis');
  select e.id into v_e from public.entites e where e.client_id = v_cl and e.principale; -- le socle crée l'entité principale avec le client
  update public.entites set siren = '987654329', fuseau = 'Europe/Paris' where id = v_e;
  insert into public.comptes (user_id, client_id, role) values (v_g, v_cl, 'gerant'), (v_v, v_cl, 'valideur'), (v_v2, v_cl, 'valideur'), (v_c, v_cl, 'collaborateur');
  set local role service_role; perform public.filed_installer(v_cl); reset role;
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, siren, tva, pays, statut, source)
  values (v_cl, 'ABON', 'Hébergeur d''exemple', 'hebergeur d exemple', '123456782', 'FR11123456782', 'FR', 'actif', 'saisie') returning id into v_four;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_g, 'role', 'authenticated')::text, true);
  v_exo := public.filed_ouvrir_exercice(v_cl, null, date '2025-01-01', date '2025-12-31');
  perform public.filed_ouvrir_exercice(v_cl, null, date '2026-01-01', date '2026-12-31');
  v_compte := public.filed_poser_compte(v_cl, null, '6132', 'Locations', 'charge', true);
  v_centre := public.filed_poser_centre(v_cl, null, 'SIEGE', 'Siège');
  -- Un circuit : au-dessus de 1 000 €, deux approbations distinctes ; relance à 2 jours, remontée à 5.
  v_circuit := public.filed_regler_circuit(v_cl, null, null, 1000, null, 2, array['gerant', 'admin', 'valideur'], null, 1, 2, 5);
  reset role;
  assert exists (select 1 from public.regles_validation r join public.filed_circuits c on c.regle_id = r.id where c.id = v_circuit and r.approbations_requises = 2 and r.montant_min = 1000 and r.type_action = 'filed.valider_facture'), 'la règle du circuit est dans le socle';
  raise notice 'OK circuit : au-delà d''un seuil, deux approbations';

  -- ══ 1. Clôture : une pièce de 2025 reçue après la clôture va à l''exercice 2026, avec sa mention ══
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_g, 'role', 'authenticated')::text, true);
  v_n := public.filed_cloturer_exercice(v_exo, date '2026-03-31', 'Bilan arrêté');
  reset role;
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut) values (gen_random_uuid(), v_cl, 'filed', 'depot', 'facture-p1.pdf', 'application/pdf', 1024, repeat('1', 64), v_cl::text || '/filed_document/test/facture-p1.pdf', 'filed_document', 'p1', 'lue') returning id into v_r;
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, depose_par, nom_fichier, sha256, recu_le, etat, nature, nature_source)
  values (v_cl, v_e, 2026, 11, v_r.id, 'courriel', v_c, 'facture-11.pdf', repeat('1', 64), now(), 'a_traiter', 'facture', 'humain') returning id into v_r;
  insert into public.filed_factures (client_id, entite_id, document_id, nature, numero, numero_normalise, date_emission, date_reception, devise, montant_ht, montant_tva, montant_ttc, fournisseur_id, fournisseur_identification, fournisseur_lu, acheteur_lu, empreinte_donnees, statut)
  values (v_cl, v_e, v_r.id, 'facture', 'F-2025-900', 'F2025900', date '2025-12-15', date '2026-04-10', 'EUR', 80, 16, 96, v_four, 'siren', '{"siren": "123456782", "tva": "FR11123456782"}', '{"siren": "987654329"}', repeat('2', 64), 'a_completer')
  returning id into v_f;
  v_statut := private.filed_controler_facture(v_f);
  select * into v_r from public.filed_factures_exercices where facture_id = v_f;
  assert v_r.orientee and v_r.exercice_id <> v_exo and v_r.mention like 'Pièce du 15/12/2025 reçue le 10/04/2026, après la clôture%orientée vers l''exercice Exercice 2026.', 'orientée vers l''exercice suivant : ' || coalesce(v_r.mention, '?');
  assert (select resultat from public.filed_controles where facture_id = v_f and code = 'exercice.cloture') = 'anomalie', 'le contrôle exercice.cloture le signale';
  assert v_statut = 'a_valider', 'l''orientation n''empêche pas la validation : ' || v_statut;
  raise notice 'OK pièce reçue après la clôture : orientée vers l''exercice suivant, avec sa mention';

  -- ══ 2. Deux approbations distinctes au-dessus du seuil, dont une par délégation datée ══
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut) values (gen_random_uuid(), v_cl, 'filed', 'depot', 'facture-p2.pdf', 'application/pdf', 1024, repeat('3', 64), v_cl::text || '/filed_document/test/facture-p2.pdf', 'filed_document', 'p2', 'lue') returning id into v_r;
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, depose_par, nom_fichier, sha256, recu_le, etat, nature, nature_source)
  -- Déposée par le gérant : le collaborateur décidera par délégation (le déposant ne décide pas).
  values (v_cl, v_e, 2026, 12, v_r.id, 'courriel', v_g, 'facture-12.pdf', repeat('3', 64), now(), 'a_traiter', 'facture', 'humain') returning id into v_r;
  insert into public.filed_factures (client_id, entite_id, document_id, nature, numero, numero_normalise, date_emission, date_reception, devise, montant_ht, montant_tva, montant_ttc, fournisseur_id, fournisseur_identification, fournisseur_lu, acheteur_lu, empreinte_donnees, statut)
  values (v_cl, v_e, v_r.id, 'facture', 'F-2026-100', 'F2026100', date '2026-05-02', current_date, 'EUR', 2000, 400, 2400, v_four, 'siren', '{"siren": "123456782", "tva": "FR11123456782"}', '{"siren": "987654329"}', repeat('4', 64), 'a_completer')
  returning id into v_f;
  v_statut := private.filed_controler_facture(v_f);
  select * into v_d from public.demandes_validation where objet_type = 'filed_facture' and objet_id = v_f::text and statut = 'en_attente';
  assert v_d.approbations_requises = 2, 'deux approbations exigées au-dessus de 1 000 € (reçu : ' || v_d.approbations_requises || ')';
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_v, 'role', 'authenticated')::text, true);
  insert into public.approbations (demande_id, decision) values (v_d.id, 'approuve');
  reset role;
  assert (select statut from public.demandes_validation where id = v_d.id) = 'en_attente', 'une seule approbation ne suffit pas';
  -- Le valideur 2 est absent : le collaborateur décide en son nom, par délégation datée.
  insert into public.delegations (client_id, delegant, delegataire, debut, fin, motif) values (v_cl, v_v2, v_c, now() - interval '1 day', now() + interval '7 days', 'Congés');
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_c, 'role', 'authenticated')::text, true);
  begin
    insert into public.approbations (demande_id, decision) values (v_d.id, 'approuve');
    raise exception 'un collaborateur sans délégation ne devrait pas décider';
  exception when insufficient_privilege then null;
  end;
  insert into public.approbations (demande_id, decision, au_nom_de, commentaire) values (v_d.id, 'approuve', v_v2, 'Approuvé pendant les congés du valideur.');
  reset role;
  assert (select statut from public.demandes_validation where id = v_d.id) = 'approuvee', 'deux approbations distinctes, la seconde par délégation';
  v_j := private.filed_traiter(10);
  assert (select statut from public.filed_factures where id = v_f) = 'validee', 'facture validée après deux approbations';
  raise notice 'OK deux approbations distinctes au-delà du seuil ; délégation datée honorée';

  -- ══ 3. Celui qui saisit n''approuve pas : le déposant (valideur v2) tente d''approuver, le socle refuse ══
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut) values (gen_random_uuid(), v_cl, 'filed', 'depot', 'facture-p3.pdf', 'application/pdf', 1024, repeat('5', 64), v_cl::text || '/filed_document/test/facture-p3.pdf', 'filed_document', 'p3', 'lue') returning id into v_r;
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, depose_par, nom_fichier, sha256, recu_le, etat, nature, nature_source)
  values (v_cl, v_e, 2026, 13, v_r.id, 'depot', v_v2, 'facture-13.pdf', repeat('5', 64), now(), 'a_traiter', 'facture', 'humain') returning id into v_r;
  insert into public.filed_factures (client_id, entite_id, document_id, nature, numero, numero_normalise, date_emission, date_reception, devise, montant_ht, montant_tva, montant_ttc, fournisseur_id, fournisseur_identification, fournisseur_lu, acheteur_lu, empreinte_donnees, statut)
  values (v_cl, v_e, v_r.id, 'facture', 'F-2026-101', 'F2026101', date '2026-05-03', current_date, 'EUR', 300, 60, 360, v_four, 'siren', '{"siren": "123456782", "tva": "FR11123456782"}', '{"siren": "987654329"}', repeat('6', 64), 'a_completer')
  returning id into v_f;
  v_statut := private.filed_controler_facture(v_f);
  select * into v_d from public.demandes_validation where objet_type = 'filed_facture' and objet_id = v_f::text and statut = 'en_attente';
  assert (v_d.payload->'saisi_par') @> to_jsonb(array[v_v2]), 'le déposant est dans saisi_par';
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_v2, 'role', 'authenticated')::text, true);
  begin
    insert into public.approbations (demande_id, decision) values (v_d.id, 'approuve');
    raise exception 'le saisisseur a pu approuver';
  exception when insufficient_privilege then null;
  end;
  reset role;
  assert (select statut from public.demandes_validation where id = v_d.id) = 'en_attente', 'la demande reste en attente';
  assert (select statut from public.filed_factures where id = v_f) = 'a_valider', 'la facture reste à valider';
  v_d2 := v_d;
  raise notice 'OK celui qui saisit et celui qui approuve ne sont pas la même personne (refusé à l''insertion par le socle)';

  -- ══ 4. Relance, puis remontée d''un niveau ══
  assert (select count(*) from private.filed_relancer_validations(now() + interval '1 day') ) = 1, 'rien avant le délai';
  assert (select relance_le from public.filed_validations where demande_id = v_d2.id) is null, 'pas encore relancée';
  v_j := private.filed_relancer_validations(now() + interval '3 days');
  assert (v_j->>'relances')::int >= 1 and (select relance_le from public.filed_validations where demande_id = v_d2.id) is not null, 'relancée après 3 jours : ' || v_j::text;
  assert exists (select 1 from public.alertes where client_id = v_cl and cle_regroupement = 'filed:relance:' || v_d2.id::text), 'alerte de relance';
  v_j := private.filed_relancer_validations(now() + interval '8 days'); -- sous le seuil du circuit : délais par défaut, 3 puis 7 jours
  assert (select statut from public.demandes_validation where id = v_d2.id) = 'annulee', 'la demande de niveau 1 est annulée';
  select * into v_d from public.demandes_validation where objet_type = 'filed_facture' and objet_id = v_f::text and statut = 'en_attente';
  assert v_d.type_action = 'filed.valider_facture.direction' and v_d.roles_autorises = array['gerant', 'admin'], 'remontée à la direction : ' || v_d.type_action || ' ' || v_d.roles_autorises::text;
  raise notice 'OK approbateur relancé, puis la pièce remonte d''un niveau';

  -- ══ 5. Refus avec motif, commentaire et pièce attachés ══
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_c, 'role', 'authenticated')::text, true);
  perform public.filed_joindre_annexe(v_f, 'Le devis signé est joint.', null);
  perform set_config('request.jwt.claims', json_build_object('sub', v_g, 'role', 'authenticated')::text, true);
  insert into public.approbations (demande_id, decision, commentaire) values (v_d.id, 'rejete', 'Prestation non commandée.');
  reset role;
  v_j := private.filed_traiter(10);
  assert (select statut from public.filed_factures where id = v_f) = 'refusee', 'facture refusée par la direction';
  assert exists (select 1 from public.filed_factures_annexes where facture_id = v_f and nature = 'motif_refus' and texte = 'Prestation non commandée.'), 'le motif de refus reste attaché';
  assert exists (select 1 from public.filed_factures_annexes where facture_id = v_f and nature = 'commentaire'), 'le commentaire reste attaché';
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_g, 'role', 'authenticated')::text, true);
  assert (select nombre from public.filed_pieces_en_cours(v_cl) where categorie = 'attente') = 1, 'reste en attente : la pièce orientée vers 2026, seule';
  reset role;
  raise notice 'OK commentaire, pièce jointe et motif de refus attachés à la facture';

  -- ══ 6. Un numéro de TVA faux bloque la pièce ══
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut) values (gen_random_uuid(), v_cl, 'filed', 'depot', 'facture-p4.pdf', 'application/pdf', 1024, repeat('7', 64), v_cl::text || '/filed_document/test/facture-p4.pdf', 'filed_document', 'p4', 'lue') returning id into v_r;
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, depose_par, nom_fichier, sha256, recu_le, etat, nature, nature_source)
  values (v_cl, v_e, 2026, 14, v_r.id, 'courriel', v_c, 'facture-14.pdf', repeat('7', 64), now(), 'a_traiter', 'facture', 'humain') returning id into v_r;
  insert into public.filed_factures (client_id, entite_id, document_id, nature, numero, numero_normalise, date_emission, date_reception, devise, montant_ht, montant_tva, montant_ttc, fournisseur_id, fournisseur_identification, fournisseur_lu, acheteur_lu, empreinte_donnees, statut)
  values (v_cl, v_e, v_r.id, 'facture', 'F-2026-102', 'F2026102', date '2026-05-04', current_date, 'EUR', 10, 2, 12, v_four, 'nom', '{"tva": "FR12123456782"}', '{"siren": "987654329"}', repeat('8', 64), 'a_completer')
  returning id into v_f;
  v_statut := private.filed_controler_facture(v_f);
  assert v_statut = 'bloquee', 'TVA à clé fausse : bloquée (reçu : ' || v_statut || ')';
  assert (select resultat || '/' || gravite from public.filed_controles where facture_id = v_f and code = 'identite.tva_intracom') = 'anomalie/bloquant', 'identite.tva_intracom bloquant';
  assert not exists (select 1 from public.demandes_validation where objet_type = 'filed_facture' and objet_id = v_f::text and statut = 'en_attente'), 'aucune demande pour une pièce bloquée';
  raise notice 'OK numéro de TVA faux : la pièce ne se classe pas';
  -- Un fournisseur sans numéro de TVA (SIREN seul) : vérification Sirene demandée, pas de blocage.
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, siren, pays, statut, source) values (v_cl, 'SIR', 'Artisan d''exemple', 'artisan d exemple', '100000009', 'FR', 'actif', 'saisie') returning id into v_r;
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut) values (gen_random_uuid(), v_cl, 'filed', 'depot', 'facture-p4b.pdf', 'application/pdf', 1024, repeat('e', 64), v_cl::text || '/filed_document/test/facture-p4b.pdf', 'filed_document', 'p4b', 'lue') returning id into v_exp;
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, depose_par, nom_fichier, sha256, recu_le, etat, nature, nature_source)
  values (v_cl, v_e, 2026, 17, v_exp, 'courriel', v_c, 'facture-17.pdf', repeat('e', 64), now(), 'a_traiter', 'facture', 'humain') returning id into v_exp;
  insert into public.filed_factures (client_id, entite_id, document_id, nature, numero, numero_normalise, date_emission, date_reception, devise, montant_ht, montant_tva, montant_ttc, fournisseur_id, fournisseur_identification, fournisseur_lu, acheteur_lu, empreinte_donnees, statut)
  values (v_cl, v_e, v_exp, 'facture', 'ART-7', 'ART7', date '2026-05-06', current_date, 'EUR', 100, 20, 120, v_r.id, 'siren', '{"siren": "100000009"}', '{"siren": "987654329"}', repeat('f', 64), 'a_completer')
  returning id into v_f;
  v_statut := private.filed_controler_facture(v_f);
  assert v_statut = 'a_valider', 'SIREN seul : à valider (reçu : ' || v_statut || ')';
  assert (select resultat || '/' || gravite from public.filed_controles where facture_id = v_f and code = 'identite.tva_intracom') = 'anomalie/attention', 'sans TVA : attention, pas blocage';
  assert exists (select 1 from public.filed_verifications_tiers where client_id = v_cl and registre = 'sirene' and identifiant = '100000009'), 'vérification Sirene demandée';
  raise notice 'OK fournisseur sans numéro de TVA : SIREN vérifié, Sirene demandé';

  -- ══ 7. Charges récurrentes : écritures attendues, facture absente, facture reconnue ══
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_g, 'role', 'authenticated')::text, true);
  v_charge := public.filed_declarer_charge_recurrente(v_cl, null, v_four, 'Hébergement mensuel', 'mensuelle', 49.00, v_compte, v_centre, date '2026-01-01', null, 5, 10, 10);
  reset role;
  select count(*) into v_n from public.filed_charges_attendues where charge_id = v_charge;
  assert v_n >= 13, 'écritures attendues produites sans ressaisie (' || v_n || ')';
  assert (select count(*) from public.filed_charges_attendues where charge_id = v_charge and periode = date '2026-03-01' and attendue_le = date '2026-03-05') = 1, 'période de mars attendue le 5';
  v_n := private.filed_verifier_charges_manquantes(v_cl, date '2026-03-20');
  assert (select statut from public.filed_charges_attendues where charge_id = v_charge and periode = date '2026-02-01') = 'manquante', 'février manquante au 20 mars';
  assert (select statut from public.filed_charges_attendues where charge_id = v_charge and periode = date '2026-03-01') = 'manquante', 'mars manquante au 20 mars (5 + 10 jours)';
  assert (select statut from public.filed_charges_attendues where charge_id = v_charge and periode = date '2026-04-01') = 'attendue', 'avril encore attendue';
  assert exists (select 1 from public.alertes where client_id = v_cl and niveau = 'attention' and titre like 'Facture attendue absente : Hébergement mensuel%03/2026%'), 'alerte : facture attendue absente';
  raise notice 'OK charges récurrentes : écritures attendues, facture absente → alerte';
  -- La facture de mars arrive : reconnue, l'imputation de la charge est proposée.
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut) values (gen_random_uuid(), v_cl, 'filed', 'depot', 'facture-p5.pdf', 'application/pdf', 1024, repeat('9', 64), v_cl::text || '/filed_document/test/facture-p5.pdf', 'filed_document', 'p5', 'lue') returning id into v_r;
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, depose_par, nom_fichier, sha256, recu_le, etat, nature, nature_source)
  values (v_cl, v_e, 2026, 15, v_r.id, 'courriel', v_c, 'facture-15.pdf', repeat('9', 64), now(), 'a_traiter', 'facture', 'humain') returning id into v_r;
  insert into public.filed_factures (client_id, entite_id, document_id, nature, numero, numero_normalise, date_emission, date_reception, devise, montant_ht, montant_tva, montant_ttc, fournisseur_id, fournisseur_identification, fournisseur_lu, acheteur_lu, empreinte_donnees, statut)
  values (v_cl, v_e, v_r.id, 'facture', 'HEB-2026-03', 'HEB202603', date '2026-03-04', current_date, 'EUR', 49.00, 9.80, 58.80, v_four, 'siren', '{"siren": "123456782", "tva": "FR11123456782"}', '{"siren": "987654329"}', repeat('a', 64), 'a_completer')
  returning id into v_f;
  v_statut := private.filed_controler_facture(v_f);
  assert (select statut from public.filed_charges_attendues where charge_id = v_charge and periode = date '2026-03-01') = 'recue', 'mars servie par la facture';
  assert (select facture_id from public.filed_charges_attendues where charge_id = v_charge and periode = date '2026-03-01') = v_f, 'rattachée';
  assert exists (select 1 from public.filed_imputations i where i.facture_id = v_f and i.statut = 'proposee' and i.origine = 'recurrente' and i.compte_id = v_compte and i.centre_id = v_centre), 'imputation de la charge proposée, à valider';
  assert exists (select 1 from public.alertes a join public.filed_charges_attendues ca on a.cle_regroupement = 'filed:charge_manquante:' || ca.id::text
                 where ca.charge_id = v_charge and ca.periode = date '2026-03-01' and a.acquittee_le is not null), 'l''alerte de mars est acquittée par la facture arrivée tard';
  raise notice 'OK la facture d''abonnement reçue sert son écriture attendue, imputation proposée';

  -- ══ 8. Écart de prix dans la tolérance : signalé, pas absorbé ══
  insert into public.filed_commandes (id, client_id, entite_id, fournisseur_id, numero, numero_normalise, source) values (gen_random_uuid(), v_cl, v_e, v_four, 'CMD-1', 'CMD1', 'saisie') returning id into v_cmd;
  insert into public.filed_commandes_lignes (client_id, commande_id, rang, designation, quantite, prix_unitaire, montant_ht, source) values (v_cl, v_cmd, 1, 'Licence', 10, 10.00, 100.00, 'saisie') returning id into v_cmdl;
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut) values (gen_random_uuid(), v_cl, 'filed', 'depot', 'facture-p6.pdf', 'application/pdf', 1024, repeat('b', 64), v_cl::text || '/filed_document/test/facture-p6.pdf', 'filed_document', 'p6', 'lue') returning id into v_r;
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, depose_par, nom_fichier, sha256, recu_le, etat, nature, nature_source)
  values (v_cl, v_e, 2026, 16, v_r.id, 'courriel', v_c, 'facture-16.pdf', repeat('b', 64), now(), 'a_traiter', 'facture', 'humain') returning id into v_r;
  -- La commande se cite dans refs (le rapprochement du socle retrouve la commande et pose commande_id lui-même) ;
  -- la tolérance de prix vaut 0 % à l'installation : on la règle à 2 % pour ce cas.
  update public.filed_reglages set ecart_prix_pct = 2 where client_id = v_cl and entite_id is null;
  insert into public.filed_factures (client_id, entite_id, document_id, nature, numero, numero_normalise, date_emission, date_reception, devise, montant_ht, montant_tva, montant_ttc, fournisseur_id, fournisseur_identification, fournisseur_lu, acheteur_lu, empreinte_donnees, statut, refs)
  values (v_cl, v_e, v_r.id, 'facture', 'F-2026-103', 'F2026103', date '2026-05-05', current_date, 'EUR', 101.00, 20.20, 121.20, v_four, 'siren', '{"siren": "123456782", "tva": "FR11123456782"}', '{"siren": "987654329"}', repeat('c', 64), 'a_completer', '{"commande": "CMD-1"}')
  returning id into v_f;
  insert into public.filed_factures_lignes (client_id, facture_id, document_id, rang, designation, quantite, prix_unitaire, montant_ht, source) values (v_cl, v_f, v_r.id, 1, 'Licence', 10, 10.10, 101.00, 'humain');
  v_statut := private.filed_controler_facture(v_f);
  assert v_statut = 'a_valider', 'un écart de 1 % (tolérance 2 %) ne bloque pas : ' || v_statut;
  select * into v_r from public.filed_controles where facture_id = v_f and code = 'rapprochement.prix';
  assert v_r.resultat = 'anomalie' and v_r.gravite = 'info' and (v_r.preuve->>'dans_tolerance')::boolean, 'l''écart dans la tolérance est signalé en info : ' || coalesce(v_r.message, 'absent');
  raise notice 'OK écart de prix dans la tolérance : signalé, pas absorbé';

  -- ══ 9. Litige et export programmé ══
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_g, 'role', 'authenticated')::text, true);
  perform public.filed_ouvrir_litige(v_f, 'Prix unitaire contesté auprès du fournisseur.');
  assert (select nombre from public.filed_pieces_en_cours(v_cl) where categorie = 'litige') = 1, 'une pièce en litige';
  v_exp := public.filed_programmer_export(v_cl, 'en_cours', 'hebdomadaire', 1, null, null);
  reset role;
  update public.filed_exports_programmes set prochain_le = current_date where id = v_exp;
  v_n := private.filed_produire_exports(current_date);
  assert v_n = 1 and exists (select 1 from public.filed_exports x where x.programme_id = v_exp and x.contenu like '%litige%'), 'export à date fixe produit';
  assert (select prochain_le from public.filed_exports_programmes where id = v_exp) > current_date, 'prochain export planifié';
  raise notice 'OK litige compté ; export à date fixe produit et replanifié';

  raise notice 'CIRCUIT ET CHARGES : tous les contrôles passent.';
end $$;
rollback;
