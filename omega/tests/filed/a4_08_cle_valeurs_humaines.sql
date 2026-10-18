-- Tests A4 — a4_14 : une valeur saisie ou confirmée par une personne doit passer sa clé ; une TVA FR dont le SIREN
-- échoue au Luhn n'est pas valide et ne fait monter aucun SIREN. Données d'exemple ; bloc DO autonome (rollback).
begin;
do $$
declare
  v_cl uuid := gen_random_uuid(); v_e uuid; v_c uuid := gen_random_uuid();
  v_four uuid; v_piece uuid; v_doc uuid; v_f uuid; v_statut text; v_r record;
begin
  -- ── L'analyse : clé TVA juste mais SIREN faux au Luhn ──
  assert (select valide from private.filed_tva_intracom_analyser('FR52842115763')) = false, 'FR52842115763 : SIREN faux au Luhn, TVA non valide';
  assert (select valide from private.filed_tva_intracom_analyser('FR11123456782')) = true, 'FR11123456782 reste valide';
  assert private.filed_siren_de_tva_fr('FR52842115763') is null, 'aucun SIREN tiré d''une TVA au SIREN faux';
  assert private.filed_siren_de_tva_fr('FR 11 123 456 782') = '123456782', 'SIREN tiré d''une TVA juste';
  raise notice 'OK analyse TVA FR : le SIREN porté passe le Luhn';

  insert into auth.users (id, email, instance_id, aud, role, encrypted_password, created_at, updated_at)
  values (v_c, v_c::text || '@exemple.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '', now(), now());
  insert into public.clients (id, nom) values (v_cl, 'Organisation d''exemple A4 sexies');
  select e.id into v_e from public.entites e where e.client_id = v_cl and e.principale;
  update public.entites set siren = '987654329' where id = v_e;
  insert into public.comptes (user_id, client_id, role) values (v_c, v_cl, 'gerant');
  set local role service_role; perform public.filed_installer(v_cl); reset role;

  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut)
  values (gen_random_uuid(), v_cl, 'filed', 'depot', 'facture-delorme.pdf', 'application/pdf', 2048, repeat('d', 64), v_cl::text || '/filed_document/test/facture-delorme.pdf', 'filed_document', 'delorme', 'lue') returning id into v_piece;

  -- ── Une valeur humaine à clé fausse est refusée (SIREN, TVA, IBAN, SIRET) ──
  begin
    insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee)
    values (v_cl, v_piece, 'fournisseur.siren', to_jsonb('842115763'::text), '842 115 763', 'humain', 1, true);
    raise exception 'un SIREN faux au Luhn a été confirmé';
  exception when invalid_parameter_value then null;
  end;
  begin
    insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee)
    values (v_cl, v_piece, 'fournisseur.tva', to_jsonb('FR52842115763'::text), 'FR52 842 115 763', 'humain', 1, true);
    raise exception 'une TVA au SIREN faux a été confirmée';
  exception when invalid_parameter_value then null;
  end;
  begin
    insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee)
    values (v_cl, v_piece, 'fournisseur.siret', to_jsonb('84211576300015'::text), '842 115 763 00015', 'humain', 1, true);
    raise exception 'un SIRET au SIREN faux a été confirmé';
  exception when invalid_parameter_value then null;
  end;
  begin
    insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee)
    values (v_cl, v_piece, 'fournisseur.iban', to_jsonb('FR76 3000 6000'::text), 'FR76 3000 6000', 'humain', 1, true);
    raise exception 'un IBAN au mauvais format a été confirmé';
  exception when invalid_parameter_value then null;
  end;
  raise notice 'OK une valeur humaine à clé fausse est refusée (22023)';

  -- ── La lecture IA à clé fausse reste possible (elle n'est pas sûre) ; une valeur humaine juste passe ──
  insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee) values
    (v_cl, v_piece, 'fournisseur.nom', to_jsonb('Papeterie d''exemple'::text), 'Papeterie d''exemple', 'ia', 0.98, true),
    (v_cl, v_piece, 'fournisseur.siren', to_jsonb('842115763'::text), 'SIREN 842 115 763', 'ia', 0.7, false),
    (v_cl, v_piece, 'fournisseur.tva', to_jsonb('FR52842115763'::text), 'TVA FR52 842 115 763', 'ia', 0.9, true);
  insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee)
  values (v_cl, v_piece, 'acheteur.siret', to_jsonb('123 456 782 00011'::text), '123 456 782 00011', 'humain', 1, true);
  raise notice 'OK lecture IA conservée telle quelle ; valeur humaine juste acceptée';

  -- ── La TVA « vérifiée » par le lecteur mais au SIREN faux ne fait monter aucun SIREN sur la fiche ──
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, depose_par, nom_fichier, sha256, recu_le, etat, nature, nature_source)
  values (v_cl, v_e, 2026, 9, v_piece, 'depot', v_c, 'facture-delorme.pdf', repeat('d', 64), now(), 'a_traiter', 'facture', 'humain') returning id into v_doc;
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source, document_origine)
  values (v_cl, 'DEL', 'Papeterie d''exemple', 'papeterie d exemple', 'FR', 'a_confirmer', 'facture', v_doc) returning id into v_four;
  insert into public.filed_factures (client_id, entite_id, document_id, nature, numero, numero_normalise, date_emission, date_reception, devise, montant_ht, montant_tva, montant_ttc, fournisseur_id, fournisseur_identification, fournisseur_lu, acheteur_lu, empreinte_donnees, statut)
  values (v_cl, v_e, v_doc, 'facture', 'DEL-1', 'DEL1', date '2026-10-01', current_date, 'EUR', 100, 20, 120, v_four, 'creation', '{"nom": "Papeterie d''exemple"}', '{"siren": "987654329"}', repeat('e', 64), 'a_completer')
  returning id into v_f;
  v_statut := private.filed_controler_facture(v_f);
  select * into v_r from public.filed_fournisseurs where id = v_four;
  assert v_r.siren is null and v_r.tva is null, 'la fiche ne reçoit ni le SIREN faux ni la TVA qui le porte';
  select * into v_r from public.filed_factures where id = v_f;
  assert v_r.fournisseur_lu->>'siren' is null and v_r.fournisseur_lu->>'tva' is null, 'fournisseur_lu sans SIREN ni TVA : ' || v_r.fournisseur_lu::text;
  assert v_r.fournisseur_lu->'non_verifie'->>'tva' = 'FR52842115763', 'la TVA lue est gardée à part, non vérifiée';
  raise notice 'CLÉ DES VALEURS HUMAINES (a4_14) : tous les contrôles passent.';
end $$;
rollback;
