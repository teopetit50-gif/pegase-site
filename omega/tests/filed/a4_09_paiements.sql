-- Tests A4 — a4_15 : noter un paiement (partiel puis solde), avec ses gardes ; l'état de paiement se lit.
-- Données d'exemple seulement ; bloc DO autonome, tout est annulé à la fin (rollback).
begin;
do $$
declare
  v_cl uuid := gen_random_uuid(); v_e uuid; v_v uuid := gen_random_uuid(); v_c uuid := gen_random_uuid();
  v_four uuid; v_piece uuid; v_doc uuid; v_f uuid; v_r1 uuid; v_r2 uuid; v_p record;
begin
  insert into auth.users (id, email, instance_id, aud, role, encrypted_password, created_at, updated_at)
  select u, u::text || '@exemple.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '', now(), now() from unnest(array[v_v, v_c]) u;
  insert into public.clients (id, nom) values (v_cl, 'Organisation d''exemple A4 septies');
  select e.id into v_e from public.entites e where e.client_id = v_cl and e.principale;
  insert into public.comptes (user_id, client_id, role) values (v_v, v_cl, 'valideur'), (v_c, v_cl, 'collaborateur');
  set local role service_role; perform public.filed_installer(v_cl); reset role;

  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut)
  values (gen_random_uuid(), v_cl, 'filed', 'depot', 'facture-paiement.pdf', 'application/pdf', 2048, repeat('f', 64), v_cl::text || '/filed_document/test/facture-paiement.pdf', 'filed_document', 'paiement', 'lue') returning id into v_piece;
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, depose_par, nom_fichier, sha256, recu_le, etat, nature, nature_source)
  values (v_cl, v_e, 2026, 11, v_piece, 'depot', v_c, 'facture-paiement.pdf', repeat('f', 64), now(), 'a_traiter', 'facture', 'humain') returning id into v_doc;
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source, siren)
  values (v_cl, 'PAI', 'Fournisseur payé d''exemple', 'fournisseur paye d exemple', 'FR', 'actif', 'saisie', '123456782') returning id into v_four;
  insert into public.filed_factures (client_id, entite_id, document_id, nature, numero, numero_normalise, date_emission, date_reception, devise, montant_ht, montant_tva, montant_ttc, fournisseur_id, fournisseur_identification, fournisseur_lu, acheteur_lu, empreinte_donnees, statut)
  values (v_cl, v_e, v_doc, 'facture', 'PAI-1', 'PAI1', date '2026-09-15', current_date, 'EUR', 100, 20, 120, v_four, 'siren', '{"siren": "123456782"}', '{}', repeat('0', 64), 'a_valider')
  returning id into v_f;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_v, 'role', 'authenticated')::text, true);
  -- ── Pas de paiement sur une facture non validée ──
  begin
    perform public.filed_noter_paiement(v_f, current_date, 50, 'virement', 'VIR-A');
    raise exception 'paiement noté sur une facture à valider';
  exception when object_not_in_prerequisite_state then null;
  end;
  reset role;
  update public.filed_factures set statut = 'validee' where id = v_f;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_v, 'role', 'authenticated')::text, true);
  assert (select etat from public.filed_etat_paiement(v_f)) = 'a_payer', 'état : à payer';
  -- ── Paiement partiel ; la même référence rejouée ne double pas ──
  v_r1 := public.filed_noter_paiement(v_f, current_date - 1, 50, 'virement', 'VIR-A');
  v_r2 := public.filed_noter_paiement(v_f, current_date - 1, 50, 'virement', 'VIR-A');
  assert v_r1 = v_r2, 'la même référence n''est notée qu''une fois';
  select * into v_p from public.filed_etat_paiement(v_f);
  assert v_p.etat = 'partielle' and v_p.regle = 50 and v_p.reste = 70 and v_p.nb_reglements = 1, 'partielle : 50 réglés, 70 restent (' || v_p.etat || ', ' || v_p.reste || ')';
  -- ── Gardes ──
  begin perform public.filed_noter_paiement(v_f, current_date, 100, 'virement', 'VIR-B'); raise exception 'trop-payé accepté';
  exception when invalid_parameter_value then null; end;
  begin perform public.filed_noter_paiement(v_f, current_date + 3, 10, 'virement', 'VIR-C'); raise exception 'date future acceptée';
  exception when invalid_parameter_value then null; end;
  begin perform public.filed_noter_paiement(v_f, current_date, -10, 'virement', 'VIR-D'); raise exception 'montant négatif accepté';
  exception when invalid_parameter_value then null; end;
  begin perform public.filed_noter_paiement(v_f, current_date, 10, 'bitcoin', 'VIR-E'); raise exception 'moyen inconnu accepté';
  exception when invalid_parameter_value then null; end;
  -- ── Un collaborateur ne note pas de paiement ──
  perform set_config('request.jwt.claims', json_build_object('sub', v_c, 'role', 'authenticated')::text, true);
  begin perform public.filed_noter_paiement(v_f, current_date, 10, 'virement', 'VIR-F'); raise exception 'un collaborateur a noté un paiement';
  exception when insufficient_privilege then null; end;
  -- ── Le solde (montant laissé vide = le reste) ; ensuite, plus rien à payer ──
  perform set_config('request.jwt.claims', json_build_object('sub', v_v, 'role', 'authenticated')::text, true);
  perform public.filed_noter_paiement(v_f, current_date, null, 'prelevement', 'PRL-1');
  select * into v_p from public.filed_etat_paiement(v_f);
  assert v_p.etat = 'payee' and v_p.reste = 0 and v_p.nb_reglements = 2 and v_p.dernier_le = current_date, 'payée : ' || v_p.etat;
  begin perform public.filed_noter_paiement(v_f, current_date, null, 'virement', 'VIR-G'); raise exception 'paiement noté sur une facture soldée';
  exception when invalid_parameter_value then null; end;
  reset role;
  assert (select statut from public.filed_factures where id = v_f) = 'validee', 'l''état comptable ne change pas';
  assert (select count(*) from public.filed_historique where document_id = v_doc and etape = 'reglee') = 2, 'deux règlements historisés';
  assert (select count(*) from public.journal_opposable where client_id = v_cl and action = 'filed.reglement') = 2, 'deux règlements au journal';
  raise notice 'PAIEMENTS (a4_15) : tous les contrôles passent.';
end $$;
rollback;
