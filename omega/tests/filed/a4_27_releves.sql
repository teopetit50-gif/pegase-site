-- Tests A4 — lot 26 (a4_34) : le relevé bancaire importé (CAMT.053, CSV) et rapproché des factures qu'il règle.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_comme (a4_26_sortie_envois.sql), à poser avant. `select * from runtests('tests', '^test_a4_')` ;
-- runtests() annule tout. Données d'exemple seulement (IBAN d'exemple, valides par leur clé).

-- Une facture validée de p_ttc, numéro p_numero. Rend son id.
create or replace function tests.a4_facture_validee(p_org jsonb, p_numero text, p_ttc numeric) returns uuid language plpgsql as $$
declare v_f uuid := (tests.a4_facture(p_org, 'ia', p_numero, p_ttc) ->> 'facture')::uuid;
begin
  update public.filed_factures set statut = 'validee' where id = v_f;
  return v_f;
end $$;

-- Une écriture CAMT.053 (Ntry). p_sens : DBIT ou CRDT.
create or replace function tests.a4_camt_ntry(p_montant text, p_sens text, p_date text, p_libelle text, p_nom text default null, p_iban text default null)
returns text language sql immutable as $$
  select '<Ntry><Amt Ccy="EUR">' || p_montant || '</Amt><CdtDbtInd>' || p_sens || '</CdtDbtInd><Sts>BOOK</Sts>'
      || '<BookgDt><Dt>' || p_date || '</Dt></BookgDt><ValDt><Dt>' || p_date || '</Dt></ValDt>'
      || '<NtryDtls><TxDtls><Refs><EndToEndId>NOTPROVIDED</EndToEndId></Refs>'
      || case when p_nom is not null or p_iban is not null then '<RltdPties>'
              || coalesce('<Cdtr><Nm>' || p_nom || '</Nm></Cdtr>', '')
              || coalesce('<CdtrAcct><Id><IBAN>' || p_iban || '</IBAN></Id></CdtrAcct>', '') || '</RltdPties>' else '' end
      || '<RmtInf><Ustrd>' || p_libelle || '</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry>'
$$;

create or replace function tests.a4_camt(p_entrees text) returns text language sql immutable as $$
  select '<?xml version="1.0" encoding="UTF-8"?>'
      || '<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02"><BkToCstmrStmt><GrpHdr><MsgId>EX-1</MsgId></GrpHdr><Stmt><Id>EX-1</Id>'
      || '<Acct><Id><IBAN>FR7630004000031234567890143</IBAN></Id></Acct>'
      || '<Bal><Tp><CdOrPrtry><Cd>OPBD</Cd></CdOrPrtry></Tp><Amt Ccy="EUR">10000.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><Dt><Dt>2026-10-01</Dt></Dt></Bal>'
      || '<Bal><Tp><CdOrPrtry><Cd>CLBD</Cd></CdOrPrtry></Tp><Amt Ccy="EUR">9447.50</Amt><CdtDbtInd>CRDT</CdtDbtInd><Dt><Dt>2026-10-07</Dt></Dt></Bal>'
      || p_entrees || '</Stmt></BkToCstmrStmt></Document>'
$$;

create or replace function tests.test_a4_34_01_camt() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); f1 uuid; f2 uuid; f3 uuid; f4 uuid; f5 uuid; r jsonb; v_x text; v_l public.filed_releves_lignes;
begin
  f1 := tests.a4_facture_validee(o, 'REL-001', 120);
  f2 := tests.a4_facture_validee(o, 'REL-002', 240);
  f3 := tests.a4_facture_validee(o, 'REL-003', 240);
  f4 := tests.a4_facture_validee(o, 'REL-004', 360);
  f5 := tests.a4_facture_validee(o, 'REL-005', 60);
  insert into public.filed_fournisseurs_ibans (client_id, fournisseur_id, iban, iban_masque, statut, source)
  values ((o ->> 'client')::uuid, (o ->> 'fournisseur')::uuid, 'FR7630006000011234567890189', 'FR76…0189', 'valide', 'saisie');

  v_x := tests.a4_camt(
       tests.a4_camt_ntry('120.00', 'DBIT', '2026-10-05', 'FACTURE REL-001', 'Fournisseur exemple')
    || tests.a4_camt_ntry('240.00', 'DBIT', '2026-10-05', 'VIR SEPA FOURNISSEUR EXEMPLE')
    || tests.a4_camt_ntry('12.50', 'DBIT', '2026-10-06', 'FRAIS TENUE DE COMPTE')
    || tests.a4_camt_ntry('500.00', 'CRDT', '2026-10-06', 'REMISE CLIENT')
    || tests.a4_camt_ntry('360.00', 'DBIT', '2026-10-06', 'VIR 7781', null, 'FR76 3000 6000 0112 3456 7890 189')
    || tests.a4_camt_ntry('60.00', 'DBIT', '2026-10-05', 'VIR SEPA'));
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  perform public.filed_marquer_reglee(f5, date '2026-10-04', 60, 'virement', 'VIR-MAIN-005');
  r := public.filed_importer_releve((o ->> 'client')::uuid, (o ->> 'entite')::uuid, 'releve-octobre.xml', v_x);
  return next is(r ->> 'format', 'camt053', 'Le CAMT.053 est reconnu');
  return next is((r ->> 'lignes')::int || '/' || (r ->> 'rapprochees')::int || '/' || (r ->> 'proposees')::int || '/' || (r ->> 'a_rapprocher')::int,
                 '6/3/1/2', 'Six opérations : trois rapprochées, une proposée, deux à rapprocher');
  return next is((r ->> 'solde_cloture')::numeric, 9447.50, 'Le solde de clôture est lu');
  return next throws_ok(format('select public.filed_importer_releve(%L, %L, ''copie.xml'', %L)', o ->> 'client', o ->> 'entite', v_x), '23505', null,
                        'Le même fichier deux fois : refusé');
  reset role;

  return next is((select statut || ':' || (facture_id = f1)::text from public.filed_releves_lignes where releve_id = (r ->> 'releve')::uuid and rang = 1),
                 'rapprochee:true', 'Numéro de facture et nom du fournisseur : rapprochée d''office');
  return next ok(exists (select 1 from public.filed_reglements g where g.facture_id = f1 and g.montant = 120 and g.reference like 'RELEVE:%' and g.regle_le = date '2026-10-05'
                           and g.mode = 'virement'), 'et le règlement est noté à la date de l''opération');
  select * into v_l from public.filed_releves_lignes where releve_id = (r ->> 'releve')::uuid and rang = 2;
  return next is(v_l.statut || ':' || jsonb_array_length(v_l.candidats), 'proposee:2', 'Deux factures de 240 € sans numéro : proposées, pas devinées');
  return next is((select statut || ':' || (facture_id = f4)::text || ':' || contrepartie_iban from public.filed_releves_lignes where releve_id = (r ->> 'releve')::uuid and rang = 5),
                 'rapprochee:true:FR76…0189', 'L''IBAN validé du fournisseur suffit, et il n''est gardé que masqué');
  return next is((select statut || ':' || coalesce(motif, '') from public.filed_releves_lignes where releve_id = (r ->> 'releve')::uuid and rang = 6),
                 'rapprochee:Règlement déjà noté', 'Le règlement noté à la main est relié');
  return next is((select count(*) from public.filed_reglements where facture_id = f5), 1::bigint, 'sans être noté deux fois');
  return next is((select statut from public.filed_releves_lignes where releve_id = (r ->> 'releve')::uuid and rang = 4), 'a_rapprocher', 'Un crédit reste à regarder');
  return next is((select compte_masque from public.filed_releves where id = (r ->> 'releve')::uuid), 'FR76…0143', 'Le compte du relevé, masqué');

  -- Une personne décide.
  reset role; perform tests.a4_comme((o ->> 'valideur')::uuid);
  perform public.filed_rapprocher_ligne(v_l.id, f3);
  return next is((select statut || ':' || (facture_id = f3)::text from public.filed_releves_lignes where id = v_l.id), 'rapprochee:true', 'Le valideur choisit la facture');
  return next throws_ok(format('select public.filed_rapprocher_ligne(%L, %L)', v_l.id, f2), '55000', null, 'Une opération ne se rapproche qu''une fois');
  select * into v_l from public.filed_releves_lignes where releve_id = (r ->> 'releve')::uuid and rang = 3;
  return next throws_ok(format('select public.filed_ignorer_ligne(%L, '''')', v_l.id), '22023', null, 'Mettre de côté demande un motif');
  perform public.filed_ignorer_ligne(v_l.id, 'Frais bancaires');
  reset role;
  return next is((select statut || ':' || motif from public.filed_releves_lignes where id = v_l.id), 'ignoree:Frais bancaires', 'Les frais sont mis de côté, avec leur motif');
  return next ok(exists (select 1 from public.journal_opposable j where j.action = 'filed.releve.import' and j.objet_id = r ->> 'releve'), 'L''import est journalisé');
end $f$;

create or replace function tests.test_a4_34_02_csv_chevauchement() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); f6 uuid; r jsonb; v_x text;
begin
  f6 := tests.a4_facture_validee(o, 'REL-006', 1200);
  v_x := tests.a4_camt(tests.a4_camt_ntry('12.50', 'DBIT', '2026-10-06', 'FRAIS TENUE DE COMPTE') || tests.a4_camt_ntry('12.50', 'DBIT', '2026-10-06', 'FRAIS TENUE DE COMPTE'));
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  perform public.filed_importer_releve((o ->> 'client')::uuid, (o ->> 'entite')::uuid, 'octobre.xml', v_x);
  r := public.filed_importer_releve((o ->> 'client')::uuid, (o ->> 'entite')::uuid, 'export.csv',
    'Date;Libellé;Débit;Crédit;Référence' || chr(13) || chr(10)
    || '06/10/2026;FRAIS TENUE DE COMPTE;12,50;;' || chr(13) || chr(10)
    || '06/10/2026;FRAIS TENUE DE COMPTE;12,50;;' || chr(13) || chr(10)
    || '06/10/2026;FRAIS TENUE DE COMPTE;12,50;;' || chr(13) || chr(10)
    || '07/10/2026;"PRLV SEPA FOURNISSEUR; REL-006";1 200,00;;' || chr(13) || chr(10)
    || '07/10/2026;VIREMENT RECU;;2 500,00;' || chr(13) || chr(10));
  reset role;
  return next is(r ->> 'format', 'csv', 'Le CSV est reconnu à son en-tête');
  return next is((r ->> 'lignes')::int || '/' || (r ->> 'deja_connues')::int || '/' || (r ->> 'nouvelles')::int, '5/2/3',
                 'Deux frais déjà connus par le CAMT ; le troisième, identique, est une nouvelle opération');
  return next ok(exists (select 1 from public.filed_reglements g where g.facture_id = f6 and g.montant = 1200 and g.mode = 'prelevement'),
                 'Le prélèvement règle la facture, guillemets et séparateur de milliers compris');
  return next is((select montant from public.filed_releves_lignes where releve_id = (r ->> 'releve')::uuid and rang = 5), 2500.00, 'Un crédit en colonne crédit');
  return next is(private.filed_montant_lu('1.234,56') || ' ' || private.filed_montant_lu('-1,234.56') || ' ' || private.filed_montant_lu('(12,00)'),
                 '1234.56 -1234.56 -12.00', 'Les montants à la française et à l''anglaise');
  reset role; perform tests.a4_comme((o ->> 'valideur')::uuid);
  return next throws_ok(format('select public.filed_importer_releve(%L, %L, ''x.csv'', ''Nom;Valeur'' || chr(10) || ''a;b'')', o ->> 'client', o ->> 'entite'), '22023', null,
                        'Un CSV sans date ni montant est refusé, en le disant');
  reset role;
  return next ok(not has_function_privilege('authenticated', 'private.filed_rapprocher_operation(uuid, text)', 'execute')
             and not has_function_privilege('authenticated', 'private.filed_lire_releve(text, text)', 'execute'), 'Le moteur n''est pas ouvert aux membres');
end $f$;
