-- Tests A4 — lot 14 (a4_22) : autoliquidation, contre-valeur en euros et écart de change, extourne.
-- pgTAP, schéma « tests » d'A5 ; utilise les aides d'a4_10 (tests.a4_organisation, tests.a4_facture) et d'a4_11
-- (tests.a4_compte, tests.a4_imputer, tests.a4_comptabiliser), à poser avant. runtests() annule tout.

create or replace function tests.test_a4_22_01_autoliquidation() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb; fb jsonb; v_c uuid;
begin
  v_c := tests.a4_compte(o, '6061', 'Fournitures non stockables');
  fa := tests.a4_facture(o, 'ia', 'UE-001', 1000);
  update public.filed_factures set regime_tva = 'intracom', montant_ht = 1000, montant_tva = 0, montant_ttc = 1000 where id = (fa ->> 'facture')::uuid;
  perform tests.a4_imputer(fa, v_c, 1000);
  perform tests.a4_comptabiliser(fa);
  return next is((select debit from public.filed_ecritures where facture_id = (fa ->> 'facture')::uuid and compte_num = '44566'), 200.00::numeric,
                 'Intracommunautaire : TVA déductible calculée au taux normal');
  return next is((select credit from public.filed_ecritures where facture_id = (fa ->> 'facture')::uuid and compte_num = '4452'), 200.00::numeric,
                 'et TVA due au 4452');
  return next is((select credit from public.filed_ecritures where facture_id = (fa ->> 'facture')::uuid and compte_num = '401'), 1000.00::numeric,
                 'le fournisseur n''est crédité que du hors taxes');
  return next is((select sum(debit) - sum(credit) from public.filed_ecritures where facture_id = (fa ->> 'facture')::uuid), 0.00::numeric, 'équilibrée');

  fb := tests.a4_facture(o, 'ia', 'BTP-001', 500);
  update public.filed_factures set regime_tva = 'autoliquidation', montant_ht = 500, montant_tva = 0, montant_ttc = 500 where id = (fb ->> 'facture')::uuid;
  perform tests.a4_imputer(fb, v_c, 500);
  perform tests.a4_comptabiliser(fb);
  return next is((select credit from public.filed_ecritures where facture_id = (fb ->> 'facture')::uuid and compte_num = '4457'), 100.00::numeric,
                 'Sous-traitance BTP : TVA autoliquidée au 4457');
end $f$;

create or replace function tests.test_a4_22_02_devise_et_change() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb; v_f uuid; v_let text;
begin
  fa := tests.a4_facture(o, 'ia', 'USD-001', 1200);
  v_f := (fa ->> 'facture')::uuid;
  update public.filed_factures set devise = 'USD', montant_ht = 1000, montant_tva = 200, montant_ttc = 1200, date_emission = date '2026-09-28' where id = v_f;
  perform tests.a4_imputer(fa, tests.a4_compte(o, '6061', 'Fournitures non stockables'), 1000);
  update public.filed_factures set statut = 'validee' where id = v_f;
  return next throws_ok(format($$update public.filed_factures set statut = 'comptabilisee' where id = %L$$, v_f), '55000', null,
                        'Sans taux de change du jour : comptabilisation refusée');
  set local role service_role;
  perform public.filed_poser_taux_change('USD', date '2026-09-28', 1.1);
  perform public.filed_poser_taux_change('USD', current_date, 1.2);
  reset role;
  update public.filed_factures set statut = 'comptabilisee' where id = v_f;
  return next is((select debit from public.filed_ecritures where facture_id = v_f and compte_num = '6061'), 909.09::numeric, 'Charge en euros : 1 000 $ / 1,1');
  return next is((select montant_devise || ' ' || idevise from public.filed_ecritures where facture_id = v_f and compte_num = '6061'), '1000.00 USD',
                 'Montantdevise et Idevise');
  return next is((select credit from public.filed_ecritures where facture_id = v_f and compte_num = '401' and origine = 'facture'), 1090.91::numeric,
                 'Fournisseur en euros, solde exact de l''écriture');
  return next is((select sum(debit) - sum(credit) from public.filed_ecritures where facture_id = v_f), 0.00::numeric, 'équilibrée');
  insert into public.filed_reglements (client_id, facture_id, document_id, regle_le, montant, mode, reference)
  values ((o ->> 'client')::uuid, v_f, (fa ->> 'document')::uuid, current_date, 1200, 'virement', 'VIR-USD');
  return next is((select debit from public.filed_ecritures where facture_id = v_f and origine = 'reglement' and compte_num = '401'), 1090.91::numeric,
                 'Règlement : le fournisseur soldé au taux de la facture');
  return next is((select credit from public.filed_ecritures where facture_id = v_f and origine = 'reglement' and compte_num = '512'), 1000.00::numeric,
                 'la banque au taux du jour du règlement');
  return next is((select credit from public.filed_ecritures where facture_id = v_f and compte_num = '766'), 90.91::numeric, 'l''écart en gain de change (766)');
  select ecriture_let into v_let from public.filed_ecritures where facture_id = v_f and compte_num = '401' and origine = 'facture';
  return next ok(v_let is not null, 'Le fournisseur est lettré');
end $f$;

create or replace function tests.test_a4_22_03_extourne() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb; v_f uuid; v_ext integer; n bigint;
begin
  fa := tests.a4_facture(o, 'ia', 'EXT-001', 120);
  v_f := (fa ->> 'facture')::uuid;
  perform tests.a4_imputer(fa, tests.a4_compte(o, '6061', 'Fournitures non stockables'), 100);
  set local role service_role;
  return next throws_ok(format($$select public.filed_extourner_facture(%L, 'Erreur de compte')$$, v_f), '55000', null, 'Non comptabilisée : pas d''extourne');
  reset role;
  perform tests.a4_comptabiliser(fa);
  set local role service_role;
  return next throws_ok(format($$select public.filed_extourner_facture(%L, 'x')$$, v_f), '22023', null, 'Une extourne dit pourquoi');
  v_ext := public.filed_extourner_facture(v_f, 'Mauvais compte de charge');
  reset role;
  return next is((select statut from public.filed_factures where id = v_f), 'validee', 'La facture revient validée');
  return next is((select count(*) from public.filed_ecritures where facture_id = v_f and extourne_de is not null), 3::bigint, 'Trois lignes contre-passées');
  return next is((select credit from public.filed_ecritures where facture_id = v_f and extourne_de is not null and compte_num = '6061'), 100.00::numeric,
                 'La charge passe au crédit');
  return next is((select sum(debit) - sum(credit) from public.filed_ecritures where facture_id = v_f and compte_num = '6061'), 0.00::numeric,
                 'La charge est annulée');
  return next ok(exists (select 1 from public.journal_opposable where client_id = (o ->> 'client')::uuid and action = 'filed.extourne'), 'Au journal');
  update public.filed_factures set statut = 'comptabilisee' where id = v_f;
  select count(distinct ecriture_num) into n from public.filed_ecritures where facture_id = v_f and origine = 'facture';
  return next is(n, 3::bigint, 'Recomptabilisée : une nouvelle écriture d''achat (achat, extourne, achat)');
  return next is((select sum(debit) - sum(credit) from public.filed_ecritures where facture_id = v_f and compte_num = '6061'), 100.00::numeric,
                 'La charge compte une fois');
end $f$;
