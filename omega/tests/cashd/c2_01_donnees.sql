-- c2_01 — CASHD, palier 1 : comptes, factures, balance âgée, règlements et lettrage (session C2, 06/10/2026).
-- Exécutable tel quel par execute_sql sur la RECETTE, après c2_00_jeu.sql et la migration c2_01_donnees. runtests()
-- annule tout.

create or replace function tests.test_c2_01_donnees() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid; v_collab uuid; p jsonb; j date := tests.c2_jour();
  v_r jsonb; v_reg uuid; v_imp uuid; v_t jsonb; v_b record; v_e record;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  v_collab := tests.c2_compte(v_client, 'collaborateur', 'c2-collab@banc-varelo.test');

  -- ── Installer ──
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  return next throws_ok(format('select public.cashd_installer(%L)', v_client), '42501', null, 'Un valideur n''installe pas CASHD');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.cashd_ecrire_compte(null, %L, %L)', v_client, '{"reference":"X","nom":"X"}'), '55000', null,
                        'Avant l''installation, aucun compte ne se saisit');
  v_r := public.cashd_installer(v_client);
  return next is(v_r ->> 'mode' || '/' || (v_r ->> 'delai_paiement_jours') || '/' || (v_r ->> 'indemnite_forfaitaire')::numeric, 'essai/30/40.00',
                 'Installé en mode essai, délai de 30 jours, indemnité de 40 €');
  return next throws_ok(format('select public.cashd_regler(%L, %L)', v_client, '{"delai_paiement_jours": 75}'), '23514', null,
                        'Un délai de paiement de plus de 60 jours est refusé (L441-10)');
  return next throws_ok(format('select public.cashd_regler(%L, %L)', v_client, '{"couleur": "rouge"}'), '22023', null, 'Un réglage inconnu est refusé');
  perform public.cashd_regler(v_client, '{"taux_penalites": 0.1215}');

  -- ── Le portefeuille ──
  p := tests.c2_portefeuille();
  return next is((select count(*)::int from public.cashd_comptes c where c.client_id = v_client), 3, 'Trois comptes clients saisis');
  return next is((select f.echeance from public.cashd_factures f where f.id = (p ->> 'f4')::uuid), j - 1 + 30,
                 'Sans échéance donnée : émission + 30 jours (délai du compte)');
  return next throws_ok(format('select public.cashd_ecrire_facture(null, %L, %L)', v_client,
                               jsonb_build_object('compte_id', p ->> 'sci', 'numero', 'F-2026-101', 'date_emission', j, 'montant_ttc', 1)), '23505', null,
                        'Un même numéro de facture ne se saisit pas deux fois');
  return next throws_ok(format('select public.cashd_ecrire_facture(null, %L, %L)', v_client,
                               jsonb_build_object('compte_id', p ->> 'sci', 'numero', 'F-X', 'date_emission', j, 'echeance', j - 1, 'montant_ttc', 1)), '23514', null,
                        'Une échéance antérieure à l''émission est refusée');

  -- ── La balance âgée ──
  select * into v_b from public.cashd_balance_agee b where b.compte_id = (p ->> 'sci')::uuid;
  return next is(v_b.echu_31_60 || '/' || v_b.non_echu || '/' || v_b.encours || '/' || v_b.retard_max_jours, '12000.00/6000.00/18000.00/45',
                 'SCI : 12 000 € échus en tranche 31-60 jours, 6 000 € non échus, encours 18 000 €, retard 45 jours');
  select * into v_b from public.cashd_balance_agee b where b.compte_id = (p ->> 'hotel')::uuid;
  return next is(v_b.echu_plus_90 || '/' || v_b.credits, '3600.00/600.00', 'Hôtel : 3 600 € à plus de 90 jours, un avoir de 600 € en crédit');
  select * into v_e from public.cashd_factures_etat f where f.id = (p ->> 'd1')::uuid;
  return next is(v_e.jours_ecoules || '/' || v_e.statut || '/' || coalesce(v_e.tranche, 'aucune'), '5/en_attente/aucune',
                 'Le devis porte ses 5 jours écoulés depuis l''envoi, hors encours');
  v_t := public.cashd_tableau(v_client);
  return next is((v_t #>> '{totaux,echu}')::numeric || '/' || (v_t #>> '{totaux,encours}')::numeric || '/' || (v_t #>> '{totaux,comptes_en_retard}'),
                 '15600.00/24000.00/2', 'Le tableau : 15 600 € échus au total, 24 000 € d''encours, deux comptes en retard');

  -- ── Les règlements et le lettrage ──
  -- 1. Un virement qui cite la facture : lettré seul.
  v_r := public.cashd_noter_reglement(v_client, null, 5000, j - 1, 'VIR SCI LEFEVRE FACT F-2026-101', 'virement');
  v_reg := (v_r ->> 'reglement')::uuid;
  return next is((v_r ->> 'imputations')::int || '/' || (v_r ->> 'a_imputer')::numeric || '/' || (v_r ->> 'compte'), '1/0.00/' || (p ->> 'sci'),
                 'Un virement qui cite F-2026-101 est lettré seul, et prend le compte de la facture');
  select * into v_e from public.cashd_factures_etat f where f.id = (p ->> 'f1')::uuid;
  return next is(v_e.reste_du || '/' || v_e.statut, '7000.00/ouverte', 'Règlement partiel : 7 000 € restent dus, la facture reste ouverte');
  v_r := public.cashd_noter_reglement(v_client, null, 5000, j - 1, 'VIR SCI LEFEVRE FACT F-2026-101', 'virement');
  return next is(v_r ->> 'deja_note', 'true', 'Le même règlement noté deux fois (double clic, import rejoué) ne l''est qu''une fois');
  return next throws_ok(format('select public.cashd_noter_reglement(%L, null, 10, %L)', v_client, j + 1), '22023', null, 'Un règlement daté du futur est refusé');
  return next throws_ok(format('select public.cashd_noter_reglement(%L, null, 0)', v_client), '22023', null, 'Un montant nul est refusé');
  -- 2. Le solde au montant exact sans référence : la seule facture ouverte du compte de ce montant.
  v_r := public.cashd_noter_reglement(v_client, (p ->> 'sci')::uuid, 7000, j, null, 'virement');
  return next is((v_r ->> 'imputations')::int, 1, 'Un règlement du compte au montant exact d''une seule facture ouverte est lettré seul');
  return next is((select f.statut from public.cashd_factures f where f.id = (p ->> 'f1')::uuid), 'soldee', 'F-2026-101 entièrement réglée : soldée');
  -- 3. Un virement sans référence ni compte : à imputer, avec ses propositions.
  v_r := public.cashd_noter_reglement(v_client, null, 2400, j, null, 'virement');
  v_reg := (v_r ->> 'reglement')::uuid;
  return next is((v_r ->> 'imputations')::int || '/' || (v_r ->> 'a_imputer')::numeric, '0/2400.00', 'Un virement sans référence ni compte reste à imputer');
  return next is((public.cashd_propositions(v_reg) #>> '{0,factures,0,numero}'), 'F-2026-150', 'La facture probable est proposée (montant exact)');
  return next is(jsonb_array_length(public.cashd_tableau(v_client) -> 'a_imputer'), 1, 'Le tableau le montre « à imputer »');
  v_r := public.cashd_lettrer(v_reg, (p ->> 'f4')::uuid);
  return next is((v_r ->> 'reste_du')::numeric || '/' || (v_r ->> 'a_imputer')::numeric, '0.00/0.00', 'Lettré à la main : la facture de la mairie est soldée');
  return next throws_ok(format('select public.cashd_lettrer(%L, %L, 1)', v_reg, p ->> 'f2'), '23514', null,
                        'Un règlement déjà entièrement imputé ne s''impute plus');
  -- 4. L'avoir imputé sur la facture de l'hôtel.
  v_r := public.cashd_imputer_avoir((p ->> 'a1')::uuid, (p ->> 'f3')::uuid);
  return next is((v_r ->> 'reste_du')::numeric || '/' || (v_r ->> 'avoir_reste')::numeric, '3000.00/0.00', 'L''avoir de 600 € est déduit : 3 000 € restent dus');
  return next is((select f.statut from public.cashd_factures f where f.id = (p ->> 'a1')::uuid), 'soldee', 'L''avoir entièrement imputé est soldé');
  return next throws_ok(format('select public.cashd_imputer_avoir(%L, %L)', p ->> 'a1', p ->> 'f3'), '23514', null, 'Un avoir épuisé ne s''impute plus');
  -- 5. Annuler une imputation : la facture redevient ouverte, rien n'est effacé.
  v_imp := (select x.id from public.cashd_imputations x where x.facture_id = (p ->> 'f4')::uuid and x.annulee_le is null);
  return next throws_ok(format('select public.cashd_annuler_imputation(%L, %L)', v_imp, ''), '22023', null, 'Une annulation sans motif est refusée');
  v_r := public.cashd_annuler_imputation(v_imp, 'Virement de la Métropole, pas de la mairie');
  return next is((v_r ->> 'reste_du')::numeric || '/' || (select f.statut from public.cashd_factures f where f.id = (p ->> 'f4')::uuid), '2400.00/ouverte',
                 'Imputation annulée : la facture redevient ouverte, 2 400 € dus');
  return next is((select count(*)::int from public.cashd_imputations x where x.id = v_imp and x.annulee_le is not null), 1, 'L''imputation annulée reste, marquée annulée');
  -- 6. Un chèque impayé : le règlement est annulé avec ses imputations.
  v_r := public.cashd_noter_reglement(v_client, (p ->> 'hotel')::uuid, 1000, j, 'CHQ 0012345', 'cheque', (p ->> 'f3')::uuid);
  v_reg := (v_r ->> 'reglement')::uuid;
  return next is((select f.reste_du from public.cashd_factures_etat f where f.id = (p ->> 'f3')::uuid), 2000.00::numeric(14,2), 'Chèque de 1 000 € imputé sur la facture désignée');
  perform public.cashd_annuler_reglement(v_reg, 'Chèque revenu impayé');
  return next is((select f.reste_du from public.cashd_factures_etat f where f.id = (p ->> 'f3')::uuid), 3000.00::numeric(14,2), 'Chèque impayé annulé : la facture redevient due de 3 000 €');

  -- ── La fiche du compte ──
  v_t := public.cashd_fiche_compte((p ->> 'sci')::uuid);
  return next is(jsonb_array_length(v_t -> 'pieces') || '/' || jsonb_array_length(v_t -> 'reglements') || '/' || (v_t #>> '{balance,encours}')::numeric,
                 '3/2/6000.00', 'La fiche de la SCI : 3 pièces, 2 règlements, 6 000 € d''encours');

  -- ── Les droits ──
  perform tests.endosser(v_collab, 'c2-collab@banc-varelo.test');
  return next throws_ok(format('select public.cashd_noter_reglement(%L, null, 10)', v_client), '42501', null, 'Un collaborateur sans droit ne note pas de règlement');
  return next is((select count(*)::int from public.cashd_comptes c where c.client_id = v_client), 3, 'Le collaborateur lit les comptes de son périmètre');
  perform tests.redevenir_admin();
  insert into public.droits (client_id, droit, user_id) values (v_client, 'cashd.gerer', v_collab);
  perform tests.endosser(v_collab, 'c2-collab@banc-varelo.test');
  return next lives_ok(format('select public.cashd_noter_reglement(%L, %L, 10, null, %L)', v_client, p ->> 'mairie', 'ACOMPTE MAIRIE'),
                       'Avec le droit « cashd.gerer », le collaborateur note un règlement');
  return next throws_ok(format('select public.cashd_regler(%L, %L)', v_client, '{"mode": "reel"}'), '42501', null, 'Seul le gérant passe CASHD en mode réel');

  perform tests.redevenir_admin();
  return next ok(tests.c2_journal(v_client, 'cashd.imputation') is not null and tests.c2_journal(v_client, 'cashd.imputation_annulee') is not null
                 and tests.c2_journal(v_client, 'cashd.reglement_annule') is not null, 'Imputations, annulations et règlement annulé sont au journal');
end $f$;
