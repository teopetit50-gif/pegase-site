-- Tests A4 — lot 7 : l'identité lue sur la pièce remonte ; un fournisseur nouveau se confirme ; le verdict du registre.
-- Données d'exemple seulement. Exécutable tel quel ; tout est annulé à la fin (rollback).
begin;
do $$
declare
  v_cl uuid := gen_random_uuid(); v_e uuid; v_g uuid := gen_random_uuid(); v_v uuid := gen_random_uuid(); v_c uuid := gen_random_uuid();
  v_four uuid; v_piece uuid; v_doc uuid; v_f uuid; v_statut text; v_verif uuid; v_n int; v_r record;
begin
  insert into auth.users (id, email, instance_id, aud, role, encrypted_password, created_at, updated_at)
  select u, u::text || '@exemple.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '', now(), now() from unnest(array[v_g, v_v, v_c]) u;
  insert into public.clients (id, nom) values (v_cl, 'Organisation d''exemple A4 ter');
  select e.id into v_e from public.entites e where e.client_id = v_cl and e.principale;
  update public.entites set siren = '987654329' where id = v_e;
  insert into public.comptes (user_id, client_id, role) values (v_g, v_cl, 'gerant'), (v_v, v_cl, 'valideur'), (v_c, v_cl, 'collaborateur');
  set local role service_role; perform public.filed_installer(v_cl); reset role;

  -- ── Une pièce lue par le lecteur : le fournisseur y a un SIREN, une TVA et un IBAN ; la facture n'a repris que le nom ──
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut)
  values (gen_random_uuid(), v_cl, 'filed', 'courriel', 'facture-lue.pdf', 'application/pdf', 2048, repeat('1', 64), v_cl::text || '/filed_document/test/facture-lue.pdf', 'filed_document', 'lue', 'lue') returning id into v_piece;
  insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee) values
    (v_cl, v_piece, 'fournisseur.nom', to_jsonb('Nettoyage d''exemple SAS'::text), 'Nettoyage d''exemple SAS', 'ia', 0.98, true),
    (v_cl, v_piece, 'fournisseur.siren', to_jsonb('123456782'::text), 'SIREN 123 456 782', 'ia', 0.97, true),
    (v_cl, v_piece, 'fournisseur.tva', to_jsonb('FR11123456782'::text), 'TVA FR11 123 456 782', 'ia', 0.97, true),
    (v_cl, v_piece, 'fournisseur.iban', to_jsonb('FR7630006000011234567890189'::text), 'IBAN FR76 3000 6000 0112 3456 7890 189', 'ia', 0.95, true),
    (v_cl, v_piece, 'numero', to_jsonb('NET-2026-07'::text), 'NET-2026-07', 'ia', 0.99, true);
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, depose_par, nom_fichier, sha256, recu_le, etat, nature, nature_source)
  values (v_cl, v_e, 2026, 3, v_piece, 'courriel', v_c, 'facture-lue.pdf', repeat('1', 64), now(), 'a_traiter', 'facture', 'lecteur') returning id into v_doc;
  -- Fournisseur né de cette facture, à confirmer, sans SIREN ni TVA (c'est le défaut constaté en base réelle).
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source, document_origine)
  values (v_cl, 'NET', 'Nettoyage d''exemple SAS', 'nettoyage d exemple sas', 'FR', 'a_confirmer', 'facture', v_doc) returning id into v_four;
  insert into public.filed_factures (client_id, entite_id, document_id, nature, numero, numero_normalise, date_emission, date_reception, devise, montant_ht, montant_tva, montant_ttc, fournisseur_id, fournisseur_identification, fournisseur_lu, acheteur_lu, empreinte_donnees, statut)
  values (v_cl, v_e, v_doc, 'facture', 'NET-2026-07', 'NET202607', date '2026-07-03', current_date, 'EUR', 500, 100, 600, v_four, 'creation', '{"nom": "Nettoyage d''exemple SAS"}', '{"siren": "987654329"}', repeat('2', 64), 'a_completer')
  returning id into v_f;

  -- ── Le contrôle remonte ce que la pièce donne ──
  v_statut := private.filed_controler_facture(v_f);
  select * into v_r from public.filed_factures where id = v_f;
  assert v_r.fournisseur_lu->>'siren' = '123456782' and v_r.fournisseur_lu->>'tva' = 'FR11123456782', 'fournisseur_lu complété : ' || v_r.fournisseur_lu::text;
  assert v_r.iban = 'FR7630006000011234567890189', 'IBAN de la facture remonté';
  select * into v_r from public.filed_fournisseurs where id = v_four;
  assert v_r.siren = '123456782' and v_r.tva = 'FR11123456782', 'fournisseur complété : SIREN et TVA';
  assert (select resultat from public.filed_controles where facture_id = v_f and code = 'identite.siren') = 'ok', 'identite.siren ok (plus « aucun SIREN »)';
  assert (select resultat from public.filed_controles where facture_id = v_f and code = 'identite.tva_intracom') = 'ok', 'identite.tva_intracom ok';
  assert (select resultat from public.filed_controles where facture_id = v_f and code = 'identite.coherence') = 'ok', 'identite.coherence ok';
  assert v_statut = 'bloquee' and (select resultat from public.filed_controles where facture_id = v_f and code = 'fournisseur.a_confirmer') = 'anomalie', 'bloquée : fournisseur à confirmer, seulement';
  assert exists (select 1 from public.filed_historique where document_id = v_doc and etape = 'identite_completee'), 'historique : identité complétée';
  raise notice 'OK SIREN, TVA et IBAN lus par le lecteur remontent vers la facture et le fournisseur';

  -- ── Le déposant ne confirme pas ; le valideur confirme ; la facture passe à valider ──
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_c, 'role', 'authenticated')::text, true);
  begin
    perform public.filed_confirmer_fournisseur(v_four, 'Je l''ai vu.');
    raise exception 'le collaborateur (déposant, hors rôle) a pu confirmer';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claims', json_build_object('sub', v_v, 'role', 'authenticated')::text, true);
  v_n := public.filed_confirmer_fournisseur(v_four, 'Fournisseur connu de l''atelier, devis signé.');
  reset role;
  select * into v_r from public.filed_fournisseurs where id = v_four;
  assert v_r.statut = 'actif' and v_r.confirme_par = v_v and v_r.confirme_le is not null, 'fournisseur confirmé';
  assert (select statut from public.filed_factures where id = v_f) = 'a_valider', 'facture recontrôlée : à valider';
  assert exists (select 1 from public.journal_opposable where client_id = v_cl and action = 'filed.fournisseur.confirmation'), 'confirmation au journal';
  begin
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', v_g, 'role', 'authenticated')::text, true);
    perform public.filed_confirmer_fournisseur(v_four, 'encore');
    raise exception 'un fournisseur actif a pu être reconfirmé';
  exception when object_not_in_prerequisite_state then null;
  end;
  reset role;
  raise notice 'OK porte filed_confirmer_fournisseur : actif, journal, factures recontrôlées';

  -- ── Le registre répond : le verdict se pose sur le fournisseur, identite.registre passe ──
  assert (select resultat from public.filed_controles where facture_id = v_f and code = 'identite.registre') = 'anomalie', 'registre : en attente de l''ouvrier';
  select id into v_verif from public.filed_verifications_tiers where client_id = v_cl and registre = 'vies' and identifiant = 'FR11123456782' and repondu_le is null;
  assert v_verif is not null, 'vérification VIES demandée';
  set local role service_role;
  perform public.filed_repondre_verification(v_verif, 'valide', '{"nom": "NETTOYAGE D''EXEMPLE SAS", "adresse": "Exemple"}'::jsonb);
  reset role;
  select * into v_r from public.filed_fournisseurs where id = v_four;
  assert v_r.identite_source = 'vies' and v_r.identite_verdict->>'resultat' = 'valide' and v_r.identite_verifiee_le is not null, 'verdict posé sur le fournisseur';
  assert (select resultat from public.filed_controles where facture_id = v_f and code = 'identite.registre') = 'ok', 'identite.registre passé après le verdict (facture recontrôlée)';
  raise notice 'OK verdict du registre : fournisseur marqué, contrôle levé';

  -- ── Une personne atteste l'identité d'un fournisseur hors registre ──
  update public.filed_fournisseurs set identite_verifiee_le = null, identite_source = null, identite_verdict = null where id = v_four;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_g, 'role', 'authenticated')::text, true);
  perform public.filed_attester_identite(v_four, 'Extrait Kbis reçu par courrier.');
  reset role;
  assert (select identite_source from public.filed_fournisseurs where id = v_four) = 'humain', 'identité attestée par une personne';
  raise notice 'IDENTITÉ FOURNISSEUR (lot 7) : tous les contrôles passent.';
end $$;
rollback;
