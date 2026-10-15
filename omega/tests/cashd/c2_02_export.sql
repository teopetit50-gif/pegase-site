-- c2_02 — CASHD, palier 1 : le facturier relu par la chaîne de relevés du socle, le dépôt depuis l'écran, l'isolement
-- et les droits (session C2, 06/10/2026). Après c2_00_jeu.sql et la migration c2_01_donnees. runtests() annule tout.
--
-- Jour 1 : l'export des factures non soldées d'Atelier Bertin (format Sage : montants « 1 234,56 », dates JJ/MM/AAAA)
-- et le journal des encaissements. Jour 2 : la facture de l'hôtel a disparu de l'export (le facturier l'a vue réglée),
-- celle de la SCI n'a plus que 4 000 € de reste dû.

create or replace function tests.test_c2_02_export() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_b uuid; v_r jsonb; v_t jsonb; v_autre jsonb; j date := tests.c2_jour();
  f text := 'DD/MM/YYYY'; v_sci uuid;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);

  -- ── Brancher le facturier ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_b := public.cashd_brancher(v_client);
  return next is((select string_agg(j.code, ',' order by j.code) from public.branchements_jeux j where j.branchement_id = v_b),
                 'clients,devis,factures,reglements', 'Le facturier branché : quatre jeux (clients, devis, factures, règlements)');
  return next throws_ok(format('select public.cashd_brancher(%L)', v_client), '23505', null, 'Le même facturier ne se branche pas deux fois');

  -- ── Jour 1 ──
  perform tests.redevenir_admin();
  perform tests.c2_deposer_export(v_b, 'factures', jsonb_build_array(
    jsonb_build_object('numero', 'F-2026-101', 'nature', 'Facture', 'compte_ref', 'C-LEFEVRE', 'compte_nom', 'SCI Lefèvre Patrimoine',
                       'compte_email', 'compta@lefevre-patrimoine.test', 'date_emission', to_char(j - 75, f), 'echeance', to_char(j - 45, f),
                       'montant_ht', '10 000,00', 'montant_ttc', '12 000,00', 'reste_du', '12 000,00'),
    jsonb_build_object('numero', 'F-2026-050', 'nature', 'Facture', 'compte_ref', 'C-BROTTEAUX', 'compte_nom', 'Hôtel des Brotteaux',
                       'date_emission', to_char(j - 130, f), 'echeance', to_char(j - 100, f), 'montant_ttc', '3 600,00', 'reste_du', '3 600,00'),
    jsonb_build_object('numero', 'A-2026-007', 'nature', 'Avoir', 'compte_ref', 'C-BROTTEAUX', 'compte_nom', 'Hôtel des Brotteaux',
                       'date_emission', to_char(j - 20, f), 'montant_ttc', '-600,00', 'reste_du', '-600,00'),
    jsonb_build_object('numero', 'F-2026-150', 'nature', 'Facture', 'compte_ref', 'C-CALUIRE', 'compte_nom', 'Mairie de Caluire',
                       'date_emission', to_char(j - 1, f), 'montant_ttc', '2 400,00', 'reste_du', '2 400,00'),
    jsonb_build_object('numero', 'F-2026-999', 'nature', 'Facture', 'compte_ref', 'C-CALUIRE', 'date_emission', '31/02/2026', 'montant_ttc', '10,00')), '1');
  perform tests.c2_deposer_export(v_b, 'reglements', jsonb_build_array(
    jsonb_build_object('date', to_char(j - 1, f), 'montant', '1 000,00', 'compte_ref', 'C-LEFEVRE', 'reference', 'VIR SEPA LEFEVRE', 'libelle', 'REGLT FACT F-2026-101', 'mode', 'VIR')), '1');
  v_r := tests.c2_traiter();
  return next is(v_r ->> 'faits' || '/' || (v_r ->> 'echecs'), '2/0', 'Les deux exports du jour 1 sont appliqués par CASHD');
  return next is((select count(*)::int from public.cashd_comptes c where c.client_id = v_client and c.source = 'export'), 3, 'Trois comptes créés depuis l''export');
  return next is((select c.contact_facturation_email from public.cashd_comptes c where c.client_id = v_client and c.reference = 'C-LEFEVRE'),
                 'compta@lefevre-patrimoine.test', 'L''adresse de facturation lue dans l''export est gardée');
  return next is((select f.nature || '/' || f.montant_ttc from public.cashd_factures f where f.client_id = v_client and f.numero = 'A-2026-007'), 'avoir/600.00',
                 'Un montant négatif « Avoir » devient un avoir de 600 €');
  return next is((select count(*)::int from public.cashd_factures f where f.client_id = v_client and f.numero = 'F-2026-999'), 0, 'La ligne à la date impossible est écartée');
  return next ok((select (t.resultat #>> '{factures,ecartees,0,motif}') like '%date%' from public.travaux t
                  where t.client_id = v_client and t.genre = 'cashd.appliquer_releve' and t.resultat ? 'factures' order by t.id desc limit 1),
                 'Le bilan dit pourquoi la ligne est écartée');
  return next is((select f.reste_du from public.cashd_factures_etat f where f.client_id = v_client and f.numero = 'F-2026-101'), 11000.00::numeric(14,2),
                 'Le règlement du journal, qui cite F-2026-101, est lettré : 11 000 € restent dus');

  -- ── Jour 2 : la facture de l'hôtel a disparu, la SCI ne doit plus que 4 000 € (règlement que le facturier connaît) ──
  perform tests.c2_deposer_export(v_b, 'factures', jsonb_build_array(
    jsonb_build_object('numero', 'F-2026-101', 'nature', 'Facture', 'compte_ref', 'C-LEFEVRE', 'compte_nom', 'SCI Lefèvre Patrimoine',
                       'date_emission', to_char(j - 75, f), 'echeance', to_char(j - 45, f), 'montant_ttc', '12 000,00', 'reste_du', '4 000,00'),
    jsonb_build_object('numero', 'A-2026-007', 'nature', 'Avoir', 'compte_ref', 'C-BROTTEAUX', 'date_emission', to_char(j - 20, f), 'montant_ttc', '-600,00'),
    jsonb_build_object('numero', 'F-2026-150', 'nature', 'Facture', 'compte_ref', 'C-CALUIRE', 'date_emission', to_char(j - 1, f), 'montant_ttc', '2 400,00', 'reste_du', '2 400,00')), '2');
  v_r := tests.c2_traiter();
  return next is(v_r ->> 'echecs', '0', 'L''export du jour 2 est appliqué');
  return next is((select f.statut || ' : ' || f.statut_motif from public.cashd_factures f where f.client_id = v_client and f.numero = 'F-2026-050'),
                 'soldee : absente de l''export du ' || to_char(j, 'DD/MM/YYYY') || ' (factures_2.csv)',
                 'La facture absente de l''export complet est soldée : le règlement de la veille sort de la liste du jour');
  return next is((select f.reste_du from public.cashd_factures_etat f where f.client_id = v_client and f.numero = 'F-2026-101'), 4000.00::numeric(14,2),
                 'Le reste dû lu dans l''export (4 000 €) l''emporte sur le calcul');
  return next ok(tests.c2_journal(v_client, 'cashd.piece_sortie_export') is not null, 'La sortie de la facture est au journal');

  -- ── Le dépôt depuis l'écran (CSV lu dans le navigateur) ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_r := public.cashd_importer(v_client, 'clients', jsonb_build_array(
    jsonb_build_object('code', 'C-LEFEVRE', 'nom', 'SCI Lefèvre Patrimoine', 'siren', '552 100 554', 'plafond', '20 000', 'email_commercial', 'paul.commercial@atelier-bertin.test'),
    jsonb_build_object('code', 'C-GIRAUD', 'nom', 'Peintures Giraud SARL', 'groupe', 'Groupe Giraud', 'langue', 'FR', 'delai_paiement', '45')), false, null, 'clients.csv');
  return next is(v_r ->> 'creees' || '/' || (v_r ->> 'modifiees'), '1/1', 'Fichier clients déposé depuis l''écran : un compte créé, un mis à jour');
  select c.id into v_sci from public.cashd_comptes c where c.client_id = v_client and c.reference = 'C-LEFEVRE';
  return next is((select c.siren || '/' || c.plafond_encours || '/' || c.contact_commercial_email from public.cashd_comptes c where c.id = v_sci),
                 '552100554/20000.00/paul.commercial@atelier-bertin.test', 'SIREN, plafond et contact commercial sont repris');
  return next is((select c.delai_paiement_jours || '/' || c.langue from public.cashd_comptes c where c.client_id = v_client and c.reference = 'C-GIRAUD'), '45/fr',
                 'Délai de 45 jours et langue lus');
  return next throws_ok(format('select public.cashd_importer(%L, %L, %L)', v_client, 'stocks', '[]'), '22023', null, 'Un jeu inconnu est refusé');
  v_t := public.cashd_tableau(v_client);
  return next ok((v_t ->> 'dernier_import') is not null, 'Le tableau date le dernier export lu');

  -- ── Isolement ──
  perform tests.redevenir_admin();
  v_autre := tests.c2_autre_client();
  perform tests.endosser((v_autre ->> 'gerant')::uuid, 'etranger@banc-varelo.test');
  return next is((select count(*)::int from public.cashd_factures f where f.client_id = v_client), 0, 'Un gérant étranger ne lit aucune facture du banc');
  return next is((select count(*)::int from public.cashd_balance_agee b where b.client_id = v_client), 0, 'Ni sa balance âgée');
  return next is((public.cashd_tableau(v_client) #>> '{totaux,encours}')::numeric, 0::numeric, 'Son tableau est vide');
  return next is(public.cashd_fiche_compte(v_sci), null::jsonb, 'Et la fiche d''un compte du banc ne lui rend rien');
  return next throws_ok(format('select public.cashd_importer(%L, %L, %L)', v_client, 'clients', '[]'), '42501', null, 'Il n''importe rien chez le banc');
  return next throws_ok(format('select public.cashd_deposer_export(%L, %L)', v_b, '[]'), '42501', null, 'Ni ne dépose d''export sur son branchement');

  -- ── Les droits ──
  perform tests.redevenir_admin();
  return next ok(not has_function_privilege('anon', 'public.cashd_importer(uuid, text, jsonb, boolean, uuid, text)', 'execute'), 'anon n''exécute pas cashd_importer');
  return next ok(not has_function_privilege('anon', 'public.cashd_tableau(uuid, uuid)', 'execute'), 'anon n''exécute pas cashd_tableau');
  return next ok(not has_function_privilege('authenticated', 'private.cashd_integrer(uuid, uuid, text, jsonb, boolean, text, text)', 'execute'),
                 'authenticated n''exécute pas l''intégration privée');
  return next ok(not has_table_privilege('authenticated', 'public.cashd_factures', 'insert') and not has_table_privilege('authenticated', 'public.cashd_imputations', 'update')
                 and not has_table_privilege('anon', 'public.cashd_comptes', 'select'), 'Les tables ne s''écrivent que par les portes ; anon ne lit rien');
  return next ok((select bool_and(coalesce(c.reloptions::text, '') like '%security_invoker=true%') from pg_class c
                  where c.relname in ('cashd_factures_etat', 'cashd_reglements_etat', 'cashd_balance_agee') and c.relnamespace = 'public'::regnamespace),
                 'Les trois vues sont security_invoker');
  return next ok((select bool_and(c.relrowsecurity) from pg_class c where c.relnamespace = 'public'::regnamespace and c.relname like 'cashd\_%' and c.relkind = 'r'),
                 'RLS sur toutes les tables de CASHD');
end $f$;
