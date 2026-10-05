-- Test B7 — le scénario de bout en bout : le contrôle d'A4 ouvre une demande, le déclencheur b7_01 dépose le travail,
-- l'ouvrier répond par noter_identite (VIES valide + Sirene en complément), la facture est recontrôlée et identite.registre
-- passe ok avec « Numéro de TVA confirmé par VIES le JJ/MM/AAAA ». Une seconde facture du même fournisseur réutilise la réponse.
-- Données d'exemple seulement (DO … assert …, comme les tests A4) ; tout est annulé à la fin (rollback). Joué vert le 5/10 sur la
-- souche locale d'A4 + a4_01..09 + b7_01 ; à rejouer sur la recette après la pose de b7_01.
begin;
do $$
declare
  v_cl uuid := gen_random_uuid(); v_e uuid; v_g uuid := gen_random_uuid(); v_c uuid := gen_random_uuid();
  v_four uuid; v_piece uuid; v_doc uuid; v_f uuid; v_statut text; v_verif public.filed_verifications_tiers; t public.travaux; r jsonb; ctl public.filed_controles;
begin
  insert into auth.users (id, email, instance_id, aud, role, encrypted_password, created_at, updated_at) values
    (v_g, 'gerant@b7.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '', now(), now()),
    (v_c, 'collab@b7.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '', now(), now());
  insert into public.clients (id, nom) values (v_cl, 'Organisation d''exemple B7');
  select e.id into v_e from public.entites e where e.client_id = v_cl and e.principale;
  update public.entites set siren = '987654329', fuseau = 'Europe/Paris' where id = v_e;
  insert into public.comptes (user_id, client_id, role) values (v_g, v_cl, 'gerant'), (v_c, v_cl, 'collaborateur');
  set local role service_role; perform public.filed_installer(v_cl); reset role;
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, siren, tva, pays, statut, source)
  values (v_cl, 'FOUR1', 'Fournisseur d''exemple', 'fournisseur d exemple', '123456782', 'FR11123456782', 'FR', 'actif', 'saisie') returning id into v_four;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_g, 'role', 'authenticated')::text, true);
  perform public.filed_ouvrir_exercice(v_cl, null, date '2026-01-01', date '2026-12-31', 'Exercice 2026');
  reset role;
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut) values (gen_random_uuid(), v_cl, 'filed', 'depot', 'facture-x.pdf', 'application/pdf', 1024, repeat('a', 64), v_cl::text || '/filed_document/test/facture-x.pdf', 'filed_document', 'x', 'lue') returning id into v_piece;
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, depose_par, nom_fichier, sha256, recu_le, etat, nature, nature_source)
  values (v_cl, v_e, 2026, 1, v_piece, 'courriel', v_c, 'facture-1.pdf', repeat('a', 64), now() - interval '2 days', 'a_traiter', 'facture', 'humain') returning id into v_doc;
  insert into public.filed_factures (client_id, entite_id, document_id, nature, numero, numero_normalise, date_emission, date_reception, echeance_lue, devise, montant_ht, montant_tva, montant_ttc,
                                     fournisseur_id, fournisseur_identification, fournisseur_lu, acheteur_lu, empreinte_donnees, statut)
  values (v_cl, v_e, v_doc, 'facture', 'F-2026-001', 'F2026001', date '2026-03-10', current_date, current_date + 20, 'EUR', 100.00, 20.00, 120.00,
          v_four, 'siren', '{"siren": "123456782", "tva": "FR11123456782", "nom": "Fournisseur d''exemple"}', '{"siren": "987654329"}', repeat('b', 64), 'a_completer')
  returning id into v_f;

  -- 1. Le contrôle ouvre la demande VIES → mon déclencheur dépose le travail.
  v_statut := private.filed_controler_facture(v_f);
  select * into ctl from public.filed_controles where facture_id = v_f and code = 'identite.registre';
  raise notice 'après contrôle : statut % ; identite.registre = % « % »', v_statut, ctl.resultat, ctl.message;
  select * into v_verif from public.filed_verifications_tiers where client_id = v_cl and registre = 'vies' and identifiant = 'FR11123456782' and repondu_le is null;
  assert v_verif.id is not null, 'demande VIES ouverte';
  select * into t from public.travaux where cle = 'verification:' || v_verif.id::text;
  assert t.id is not null and t.genre = 'identite.verifier', 'travail déposé par le déclencheur';
  raise notice 'travail % : genre %, charge %', t.id, t.genre, t.charge;

  -- 2. L'ouvrier répond (comme noter_identite le reçoit) : VIES valide + Sirene en complément.
  r := public.noter_identite(v_verif.id, 'valide',
    '{"registre":"vies","pays":"FR","numero":"11123456782","etat":"valide","nom":"FOURNISSEUR D EXEMPLE","consulte_le":"2026-10-05T21:00:00Z","coherence":{"siren":"123456782","cle_ok":true,"sirene":"actif","noms_concordent":true},"verifie_par":"identite/2026-10-05"}'::jsonb,
    'vies',
    '[{"registre":"sirene","identifiant":"123456782","resultat":"valide","preuve":{"registre":"sirene","etat":"actif","denomination":"FOURNISSEUR D EXEMPLE"},"source":"sirene"}]'::jsonb);
  raise notice 'noter_identite → %', r;
  assert (r ->> 'recontrolees')::int = 1, 'une facture recontrôlée';

  -- 3. Le contrôle est relu : identite.registre passe ok, avec le « vérifié le … par … ».
  select * into ctl from public.filed_controles where facture_id = v_f and code = 'identite.registre';
  raise notice 'après réponse : identite.registre = % « % »', ctl.resultat, ctl.message;
  assert ctl.resultat = 'ok', 'identite.registre levé';
  assert (select statut from public.filed_factures where id = v_f) = 'a_valider', 'facture toujours à valider';
  assert (select count(*) from public.identites_registre) = 2, 'deux entrées de cache (vies + sirene)';

  -- 4. Une seconde facture du même fournisseur (sa propre pièce : une pièce = un document) : le contrôle trouve la
  --    réponse récente, aucune nouvelle demande.
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut) values (gen_random_uuid(), v_cl, 'filed', 'depot', 'facture-2.pdf', 'application/pdf', 1024, repeat('c', 64), v_cl::text || '/filed_document/test/facture-2.pdf', 'filed_document', 'y', 'lue') returning id into v_piece;
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, depose_par, nom_fichier, sha256, recu_le, etat, nature, nature_source)
  values (v_cl, v_e, 2026, 2, v_piece, 'courriel', v_c, 'facture-2.pdf', repeat('c', 64), now() - interval '1 day', 'a_traiter', 'facture', 'humain') returning id into v_doc;
  insert into public.filed_factures (client_id, entite_id, document_id, nature, numero, numero_normalise, date_emission, date_reception, devise, montant_ht, montant_tva, montant_ttc,
                                     fournisseur_id, fournisseur_identification, fournisseur_lu, acheteur_lu, empreinte_donnees, statut)
  values (v_cl, v_e, v_doc, 'facture', 'F-2026-002', 'F2026002', date '2026-04-10', current_date, 'EUR', 50.00, 10.00, 60.00,
          v_four, 'siren', '{"siren": "123456782", "tva": "FR11123456782"}', '{"siren": "987654329"}', repeat('d', 64), 'a_completer')
  returning id into v_f;
  v_statut := private.filed_controler_facture(v_f);
  select * into ctl from public.filed_controles where facture_id = v_f and code = 'identite.registre';
  raise notice 'seconde facture : identite.registre = % « % »', ctl.resultat, ctl.message;
  assert ctl.resultat = 'ok', 'réponse récente réutilisée';
  assert (select count(*) from public.filed_verifications_tiers where client_id = v_cl and repondu_le is null) = 0, 'aucune nouvelle demande';
  raise notice 'SCÉNARIO B7 : de bout en bout, tout passe.';
end $$;
rollback;
