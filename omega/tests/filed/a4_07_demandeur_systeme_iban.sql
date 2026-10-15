-- Tests A4 — a4_13 : (a) la demande de validation née d'un recontrôle est déposée par le système, la personne qui a
-- confirmé le fournisseur peut donc valider la facture qu'elle n'a pas saisie ; (b) un IBAN proposé ne reste jamais
-- sans demande ouverte. Données d'exemple seulement ; bloc DO autonome, tout est annulé à la fin (rollback).
begin;
do $$
declare
  v_cl uuid := gen_random_uuid(); v_e uuid; v_v uuid := gen_random_uuid(); v_c uuid := gen_random_uuid(); v_g uuid := gen_random_uuid();
  v_four uuid; v_piece uuid; v_doc uuid; v_f uuid; v_statut text; v_d public.demandes_validation; v_ib uuid; v_ib2 uuid; v_n int; v_ok boolean;
begin
  insert into auth.users (id, email, instance_id, aud, role, encrypted_password, created_at, updated_at)
  select u, u::text || '@exemple.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '', now(), now() from unnest(array[v_v, v_c, v_g]) u;
  insert into public.clients (id, nom) values (v_cl, 'Organisation d''exemple A4 quinquies');
  select e.id into v_e from public.entites e where e.client_id = v_cl and e.principale;
  update public.entites set siren = '987654329' where id = v_e;
  insert into public.comptes (user_id, client_id, role) values (v_v, v_cl, 'valideur'), (v_c, v_cl, 'collaborateur'), (v_g, v_cl, 'gerant');
  set local role service_role; perform public.filed_installer(v_cl); reset role;

  -- Une facture d'un fournisseur nouveau, déposée par le collaborateur v_c.
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut)
  values (gen_random_uuid(), v_cl, 'filed', 'depot', 'facture-orange.pdf', 'application/pdf', 2048, repeat('7', 64), v_cl::text || '/filed_document/test/facture-orange.pdf', 'filed_document', 'orange', 'lue') returning id into v_piece;
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, depose_par, nom_fichier, sha256, recu_le, etat, nature, nature_source)
  values (v_cl, v_e, 2026, 7, v_piece, 'depot', v_c, 'facture-orange.pdf', repeat('7', 64), now(), 'a_traiter', 'facture', 'humain') returning id into v_doc;
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source, document_origine)
  values (v_cl, 'ORA', 'Opérateur d''exemple SA', 'operateur d exemple sa', 'FR', 'a_confirmer', 'facture', v_doc) returning id into v_four;
  insert into public.filed_factures (client_id, entite_id, document_id, nature, numero, numero_normalise, date_emission, date_reception, devise, montant_ht, montant_tva, montant_ttc, fournisseur_id, fournisseur_identification, fournisseur_lu, acheteur_lu, empreinte_donnees, statut)
  values (v_cl, v_e, v_doc, 'facture', 'FAC-0471', 'FAC0471', date '2026-10-01', current_date, 'EUR', 50, 10, 60, v_four, 'creation', '{"nom": "Opérateur d''exemple SA"}', '{"siren": "987654329"}', repeat('8', 64), 'a_completer')
  returning id into v_f;
  -- Un IBAN proposé sur une AUTRE pièce, par le collaborateur : il partira à la file à la confirmation.
  insert into public.filed_fournisseurs_ibans (client_id, fournisseur_id, iban, iban_masque, empreinte, statut, source, document_id, propose_par, propose_le)
  values (v_cl, v_four, 'FR7630006000011234567890189', 'FR76 •••• 0189', repeat('9', 64), 'propose', 'facture', null, v_c, now()) returning id into v_ib;
  v_statut := private.filed_controler_facture(v_f);
  assert v_statut = 'bloquee', 'bloquée sur fournisseur à confirmer (' || v_statut || ')';

  -- ── (a) Le valideur confirme le fournisseur : la demande de la facture est celle du système ──
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_v, 'role', 'authenticated')::text, true);
  perform public.filed_confirmer_fournisseur(v_four, 'Opérateur connu, contrat signé.');
  reset role;
  assert (select statut from public.filed_factures where id = v_f) = 'a_valider', 'facture à valider après confirmation';
  select * into v_d from public.demandes_validation
   where client_id = v_cl and objet_type = 'filed_facture' and objet_id = v_f::text and statut = 'en_attente';
  assert v_d.id is not null, 'demande de validation de la facture déposée';
  assert v_d.demandeur_type = 'systeme' and v_d.demandeur_id is null, 'demandeur : système (reçu ' || v_d.demandeur_type || ' / ' || coalesce(v_d.demandeur_id::text, 'null') || ')';
  assert v_d.payload -> 'saisi_par' ? v_c::text, 'le déposant reste dans saisi_par';
  assert not (v_d.payload -> 'saisi_par' ? v_v::text), 'celui qui a confirmé le fournisseur n''est pas un saisisseur';
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_c, 'role', 'authenticated')::text, true);
  begin
    insert into public.approbations (demande_id, decision) values (v_d.id, 'approuve');
    raise exception 'le déposant a pu approuver sa facture';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claims', json_build_object('sub', v_v, 'role', 'authenticated')::text, true);
  insert into public.approbations (demande_id, decision) values (v_d.id, 'approuve');
  reset role;
  assert (select statut from public.demandes_validation where id = v_d.id) in ('approuvee', 'executee'), 'le valideur qui a confirmé le fournisseur valide la facture';
  raise notice 'OK (a) demande née d''un recontrôle : déposée par le système, validable par qui a confirmé le fournisseur';

  -- ── (b) L'IBAN parti à la file : demande du système, son proposant ne la valide pas ──
  select * into v_d from public.demandes_validation
   where client_id = v_cl and type_action = 'filed.valider_iban' and objet_id = v_ib::text and statut = 'en_attente';
  assert v_d.id is not null, 'IBAN à la file après confirmation';
  assert v_d.demandeur_type = 'systeme' and v_d.demandeur_id is null, 'demande d''IBAN : système';
  assert v_d.payload -> 'saisi_par' ? v_c::text, 'le proposant de l''IBAN est dans saisi_par';
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_c, 'role', 'authenticated')::text, true);
  begin
    insert into public.approbations (demande_id, decision) values (v_d.id, 'approuve');
    raise exception 'le proposant a pu valider son IBAN';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- Annulée (par l'administration, faute de membre demandeur) : l'IBAN encore proposé repart à la file.
  update public.demandes_validation set statut = 'annulee' where id = v_d.id;
  assert (select statut from public.filed_fournisseurs_ibans where id = v_ib) = 'propose', 'IBAN toujours proposé';
  select count(*) into v_n from public.demandes_validation
   where client_id = v_cl and type_action = 'filed.valider_iban' and objet_id = v_ib::text and statut = 'en_attente';
  assert v_n = 1, 'une demande ouverte après l''annulation (reçu ' || v_n || ')';
  assert (select demandeur_type from public.demandes_validation
           where client_id = v_cl and type_action = 'filed.valider_iban' and objet_id = v_ib::text and statut = 'en_attente') = 'systeme', 'redéposée par le système';
  assert exists (select 1 from public.filed_historique where objet_id = v_four::text and etape = 'iban_repropose'), 'historique : IBAN reproposé';
  raise notice 'OK (b) une demande d''IBAN annulée est reposée tant que l''IBAN est proposé';

  -- Validée : plus rien ne se repose ensuite.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_g, 'role', 'authenticated')::text, true);
  insert into public.approbations (demande_id, decision)
  select d.id, 'approuve' from public.demandes_validation d
   where d.client_id = v_cl and d.type_action = 'filed.valider_iban' and d.objet_id = v_ib::text and d.statut = 'en_attente';
  reset role;
  perform private.filed_traiter(10);

  -- ── Reprise : un IBAN proposé chez un fournisseur actif, sans demande, en reçoit une ; une seule ──
  insert into public.filed_fournisseurs_ibans (client_id, fournisseur_id, iban, iban_masque, empreinte, statut, source, document_id, propose_par, propose_le)
  values (v_cl, v_four, 'FR7630006000019876543210144', 'FR76 •••• 0144', repeat('a', 64), 'propose', 'saisie', null, v_c, now()) returning id into v_ib2;
  assert private.filed_reprendre_ibans_sans_demande(v_cl) = 1, 'reprise : une demande déposée';
  assert private.filed_reprendre_ibans_sans_demande(v_cl) = 0, 'reprise rejouée : rien de plus';
  assert (select count(*) from public.demandes_validation where client_id = v_cl and type_action = 'filed.valider_iban' and objet_id = v_ib2::text) = 1, 'une seule demande pour l''IBAN repris';

  -- ── Reprise : une demande de facture ouverte au nom d'une personne (avant a4_13) est redéposée par le système ──
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut)
  values (gen_random_uuid(), v_cl, 'filed', 'depot', 'facture-orange-2.pdf', 'application/pdf', 2048, repeat('b', 64), v_cl::text || '/filed_document/test/facture-orange-2.pdf', 'filed_document', 'orange2', 'lue') returning id into v_piece;
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, depose_par, nom_fichier, sha256, recu_le, etat, nature, nature_source)
  values (v_cl, v_e, 2026, 8, v_piece, 'depot', v_c, 'facture-orange-2.pdf', repeat('b', 64), now(), 'a_traiter', 'facture', 'humain') returning id into v_doc;
  insert into public.filed_factures (client_id, entite_id, document_id, nature, numero, numero_normalise, date_emission, date_reception, devise, montant_ht, montant_tva, montant_ttc, fournisseur_id, fournisseur_identification, fournisseur_lu, acheteur_lu, empreinte_donnees, statut)
  values (v_cl, v_e, v_doc, 'facture', 'FAC-0472', 'FAC0472', date '2026-09-02', current_date, 'EUR', 80, 16, 96, v_four, 'creation', '{"nom": "Opérateur d''exemple SA"}', '{"siren": "987654329"}', repeat('c', 64), 'a_completer')
  returning id into v_f;
  v_statut := private.filed_controler_facture(v_f);
  select * into v_d from public.demandes_validation where client_id = v_cl and objet_id = v_f::text and statut = 'en_attente';
  assert v_statut = 'a_valider' and v_d.id is not null, 'seconde facture à valider (' || v_statut || ' : ' || (select string_agg(code || '=' || message, ' | ') from public.filed_controles where facture_id = v_f and resultat = 'anomalie') || ')';
  -- L'état d'avant a4_13, recréé à la main (les déclencheurs de garde sont suspendus le temps d'une ligne ;
  -- sans le droit de le faire, ce cas n'est pas joué et le test le dit).
  begin
    set local session_replication_role = replica;
    v_ok := true;
  exception when insufficient_privilege then
    v_ok := false;
  end;
  if v_ok then
    update public.demandes_validation set demandeur_type = 'utilisateur', demandeur_id = v_v where id = v_d.id;
    set local session_replication_role = origin;
    assert private.filed_reprendre_demandes_facture(v_cl) = 1, 'reprise : une demande redéposée';
    assert (select statut from public.demandes_validation where id = v_d.id) = 'annulee', 'l''ancienne demande est annulée';
    assert (select demandeur_type from public.demandes_validation where client_id = v_cl and objet_id = v_f::text and statut = 'en_attente') = 'systeme', 'la nouvelle est celle du système';
    assert private.filed_reprendre_demandes_facture(v_cl) = 0, 'reprise rejouée : rien de plus';
  else
    assert private.filed_reprendre_demandes_facture(v_cl) = 0, 'reprise : rien à redéposer pour une demande du système';
    raise notice 'session_replication_role non permis ici : la reprise d''une demande au nom d''une personne n''est pas jouée';
  end if;
  raise notice 'OK reprise des demandes de facture ouvertes au nom d''une personne';
  raise notice 'DEMANDEUR SYSTÈME ET IBAN SANS DEMANDE (a4_13) : tous les contrôles passent.';
end $$;
rollback;
