-- Tests A4 — lot 61 (a4_69) : les trois écarts réels du banc (Einvoi COH-FXC-002, 005, 016). Doublures : organisation et factures d'exemple.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_ticket (a4_43_tickets_de_caisse.sql), à poser avant. Ce fichier ne supprime rien.

create or replace function tests.test_a4_69_01_base_taux() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); a jsonb; b jsonb; c jsonb; v uuid;
begin
  -- 002 : 100 × 20 % = 20, la facture dit 19.
  a := tests.a4_facture(o, 'ia', 'BT-002', 119);
  v := (a ->> 'facture')::uuid;
  update public.filed_factures set montant_ht = 100, montant_tva = 19, montant_ttc = 119 where id = v;
  insert into public.filed_factures_tva (client_id, facture_id, document_id, categorie, taux, base, montant, source)
  values ((o ->> 'client')::uuid, v, (a ->> 'document')::uuid, 'S', 20, 100, 19, 'ia');
  perform private.filed_controler_facture(v);
  return next ok((select resultat = 'anomalie' and gravite = 'attention' and message like '%à 20 % sur 100,00 €, la TVA est 20,00 €, la facture dit 19,00 €%'
                    from public.filed_controles where facture_id = v and code = 'tva.ventilation' and cle = 'base_taux'),
                 '002 : base × taux vérifié ligne à ligne (BR-CO-17)');
  -- Juste : rien.
  b := tests.a4_facture(o, 'ia', 'BT-002-OK', 120);
  insert into public.filed_factures_tva (client_id, facture_id, document_id, categorie, taux, base, montant, source)
  values ((o ->> 'client')::uuid, (b ->> 'facture')::uuid, (b ->> 'document')::uuid, 'S', 20, 100, 20, 'ia');
  update public.filed_factures set montant_ht = 100, montant_tva = 20, montant_ttc = 120 where id = (b ->> 'facture')::uuid;
  perform private.filed_controler_facture((b ->> 'facture')::uuid);
  return next is((select resultat from public.filed_controles where facture_id = (b ->> 'facture')::uuid and code = 'tva.ventilation' and cle = 'base_taux'),
                 'ok', 'Juste : base × taux = TVA');
  -- L'arrondi ligne à ligne : trois lignes de 10,01 € à 20 % (2,00 € chacune), 6,00 € pour 30,03 × 20 % = 6,01 € : pas un écart.
  c := tests.a4_facture(o, 'ia', 'BT-002-ARR', 36.03);
  update public.filed_factures set montant_ht = 30.03, montant_tva = 6.00, montant_ttc = 36.03 where id = (c ->> 'facture')::uuid;
  insert into public.filed_factures_lignes (client_id, facture_id, document_id, rang, designation, quantite, prix_unitaire, montant_ht, taux_tva, source)
  select (o ->> 'client')::uuid, (c ->> 'facture')::uuid, (c ->> 'document')::uuid, n, 'Ligne ' || n, 1, 10.01, 10.01, 20, 'ia' from generate_series(1, 3) n;
  insert into public.filed_factures_tva (client_id, facture_id, document_id, categorie, taux, base, montant, source)
  values ((o ->> 'client')::uuid, (c ->> 'facture')::uuid, (c ->> 'document')::uuid, 'S', 20, 30.03, 6.00, 'ia');
  perform private.filed_controler_facture((c ->> 'facture')::uuid);
  return next is((select resultat from public.filed_controles where facture_id = (c ->> 'facture')::uuid and code = 'tva.ventilation' and cle = 'base_taux'),
                 'ok', 'L''arrondi ligne à ligne (1 centime sur 3 lignes) n''est pas un écart');
end $f$;

create or replace function tests.test_a4_69_02_net_a_payer() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); a jsonb; b jsonb; c jsonb;
begin
  -- 005 : 114 − 14 + 0,01 = 100,01 ; la facture dit 100.
  a := tests.a4_facture(o, 'ia', 'NAP-005', 114);
  update public.filed_factures set montant_ttc = 114, montant_ht = 95, montant_tva = 19, montant_prepaye = 14, montant_arrondi = 0.01, net_a_payer = 100
   where id = (a ->> 'facture')::uuid;
  perform private.filed_controler_facture((a ->> 'facture')::uuid);
  return next ok((select resultat = 'anomalie' and gravite = 'attention' and message like 'Net à payer de 100,00 € au lieu de 100,01 €%'
                    from public.filed_controles where facture_id = (a ->> 'facture')::uuid and code = 'montant.net_a_payer'),
                 '005 : net à payer recalculé, TTC − acompte + arrondi (BR-CO-16)');
  -- L'arrondi lu sur la pièce, quand la facture ne l'a pas encore.
  b := tests.a4_facture(o, 'ia', 'NAP-005-LU', 114);
  update public.filed_factures set montant_ttc = 114, montant_ht = 95, montant_tva = 19, montant_prepaye = 14, net_a_payer = 100.01
   where id = (b ->> 'facture')::uuid;
  insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee)
  values ((o ->> 'client')::uuid, (b ->> 'piece')::uuid, 'montant_arrondi', to_jsonb(0.01), '0,01', 'ia', 0.95, true);
  perform private.filed_controler_facture((b ->> 'facture')::uuid);
  return next ok((select montant_arrondi from public.filed_factures where id = (b ->> 'facture')::uuid) = 0.01
                 and (select resultat from public.filed_controles where facture_id = (b ->> 'facture')::uuid and code = 'montant.net_a_payer') = 'ok',
                 'L''arrondi lu sur la pièce est repris, le net juste est ok');
  -- Sans acompte ni arrondi : l'information d'avant.
  c := tests.a4_facture(o, 'ia', 'NAP-INFO', 120);
  update public.filed_factures set net_a_payer = 100 where id = (c ->> 'facture')::uuid;
  perform private.filed_controler_facture((c ->> 'facture')::uuid);
  return next is((select gravite from public.filed_controles where facture_id = (c ->> 'facture')::uuid and code = 'montant.net_a_payer'),
                 'info', 'Sans acompte ni arrondi connus : une information, comme avant');
end $f$;

create or replace function tests.test_a4_69_03_structuree_pas_ticket() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); a jsonb; t jsonb;
begin
  -- 016 : une facture structurée (valeurs lues en XML) sans vendeur : jamais un ticket, le vendeur manquant se voit.
  a := tests.a4_facture(o, 'xml', 'XML-016', 120);
  update public.filed_factures set fournisseur_id = null, fournisseur_identification = null, fournisseur_lu = '{}' where id = (a ->> 'facture')::uuid;
  perform private.filed_controler_facture((a ->> 'facture')::uuid);
  return next ok((select not est_ticket and fournisseur_id is null from public.filed_factures where id = (a ->> 'facture')::uuid)
                 and (select resultat from public.filed_controles where facture_id = (a ->> 'facture')::uuid and code = 'lecture.complete') = 'anomalie',
                 '016 : structurée sans vendeur, pas un ticket ; lecture.complete le dit');
  -- Un ticket lu par l'IA reste un ticket (a4_55 inchangé).
  t := tests.a4_ticket(o, 12.5);
  perform private.filed_controler_facture((t ->> 'facture')::uuid);
  return next ok((select est_ticket from public.filed_factures where id = (t ->> 'facture')::uuid), 'Un ticket lu par l''IA reste un ticket');
end $f$;

create or replace function tests.test_a4_69_04_banc() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v jsonb;
begin
  v := private.filed_banc_scenario((o ->> 'client')::uuid, (select scenario from private.filed_banc_cas where code = 'EINVOI-COH-FXC-002'));
  return next is(private.filed_banc_juger('tva.ventilation', '{"resultat": "anomalie"}', v), 'juste', 'Banc : COH-FXC-002 juste');
  v := private.filed_banc_scenario((o ->> 'client')::uuid, (select scenario from private.filed_banc_cas where code = 'EINVOI-COH-FXC-005'));
  return next is(private.filed_banc_juger('montant.net_a_payer', '{"resultat": "anomalie", "gravites": ["attention", "bloquant"]}', v), 'juste',
                 'Banc : COH-FXC-005 juste');
  v := private.filed_banc_scenario((o ->> 'client')::uuid, (select scenario from private.filed_banc_cas where code = 'EINVOI-COH-FXC-016'));
  return next is(private.filed_banc_juger('lecture.complete', '{"resultat": "anomalie"}', v), 'juste', 'Banc : COH-FXC-016 juste');
end $f$;
