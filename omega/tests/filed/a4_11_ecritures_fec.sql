-- Tests A4 — lot 10 (a4_17) : les écritures d'achat, de règlement, le lettrage et l'export FEC.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation et tests.a4_facture (a4_10_facture_electronique.sql, à
-- poser avant). `select * from runtests('tests', '^test_a4_')` ; runtests() annule tout. Données d'exemple seulement.

-- Un compte du plan de l'organisation. Rend son id.
create or replace function tests.a4_compte(p_org jsonb, p_numero text, p_libelle text, p_tva_deductible boolean default true)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.filed_plan_comptable (client_id, numero, libelle, nature, tva_deductible)
  values ((p_org ->> 'client')::uuid, p_numero, p_libelle, case when left(p_numero, 1) = '2' then 'immobilisation' else 'charge' end, p_tva_deductible)
  returning id into v_id;
  return v_id;
end $$;

-- Une imputation validée sur une facture.
create or replace function tests.a4_imputer(p_fac jsonb, p_compte uuid, p_ht numeric, p_rang int default 1)
returns void language plpgsql as $$
begin
  insert into public.filed_imputations (client_id, facture_id, document_id, rang, compte_id, montant_ht, statut, origine)
  select f.client_id, f.id, f.document_id, p_rang, p_compte, p_ht, 'validee', 'saisie'
    from public.filed_factures f where f.id = (p_fac ->> 'facture')::uuid;
end $$;

-- Valide puis comptabilise une facture (le statut, comme le fait filed_comptabiliser_facture).
create or replace function tests.a4_comptabiliser(p_fac jsonb) returns void language plpgsql as $$
begin
  update public.filed_factures set statut = 'validee' where id = (p_fac ->> 'facture')::uuid;
  update public.filed_factures set statut = 'comptabilisee' where id = (p_fac ->> 'facture')::uuid;
end $$;

create or replace function tests.test_a4_17_01_ecriture_achat() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb; v_f uuid; n bigint;
begin
  fa := tests.a4_facture(o, 'ia', 'ACH-001', 120);
  v_f := (fa ->> 'facture')::uuid;
  perform tests.a4_imputer(fa, tests.a4_compte(o, '6061', 'Fournitures non stockables'), 100);
  perform tests.a4_comptabiliser(fa);
  return next is((select count(*) from public.filed_ecritures where facture_id = v_f), 3::bigint, 'Trois lignes : charge, TVA, fournisseur');
  return next is((select debit from public.filed_ecritures where facture_id = v_f and compte_num = '6061'), 100.00::numeric, 'Charge 6061 au débit : 100');
  return next is((select debit from public.filed_ecritures where facture_id = v_f and compte_num = '44566'), 20.00::numeric, 'TVA déductible 44566 au débit : 20');
  return next is((select credit from public.filed_ecritures where facture_id = v_f and compte_num = '401'), 120.00::numeric, 'Fournisseur 401 au crédit : 120');
  return next is((select comp_aux_num from public.filed_ecritures where facture_id = v_f and compte_num = '401'), 'XML', 'Le fournisseur en compte auxiliaire');
  return next is((select count(distinct ecriture_num) from public.filed_ecritures where facture_id = v_f), 1::bigint, 'Une seule écriture');
  return next is((select array_agg(distinct journal_code) from public.filed_ecritures where facture_id = v_f), array['HA'], 'Journal des achats');
  return next is((select piece_ref from public.filed_ecritures where facture_id = v_f limit 1), 'ACH-001', 'La pièce est la facture');
  update public.filed_factures set statut = 'validee' where id = v_f;
  update public.filed_factures set statut = 'comptabilisee' where id = v_f;
  select count(*) into n from public.filed_ecritures where facture_id = v_f;
  return next is(n, 3::bigint, 'Recomptabilisée : rien n''est écrit deux fois');
end $f$;

create or replace function tests.test_a4_17_02_immobilisation_et_non_deductible() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb; v_f uuid;
begin
  fa := tests.a4_facture(o, 'ia', 'ACH-002', 1200);
  v_f := (fa ->> 'facture')::uuid;
  perform tests.a4_imputer(fa, tests.a4_compte(o, '2183', 'Matériel informatique'), 600, 1);
  perform tests.a4_imputer(fa, tests.a4_compte(o, '6251', 'Voyages et déplacements', false), 400, 2);
  perform tests.a4_comptabiliser(fa);
  return next is((select debit from public.filed_ecritures where facture_id = v_f and compte_num = '2183'), 600.00::numeric, 'Immobilisation au HT');
  return next is((select debit from public.filed_ecritures where facture_id = v_f and compte_num = '44562'), 120.00::numeric, 'TVA sur immobilisation 44562 au prorata');
  return next is((select debit from public.filed_ecritures where facture_id = v_f and compte_num = '6251'), 480.00::numeric, 'TVA non déductible ajoutée à la charge');
  return next ok(not exists (select 1 from public.filed_ecritures where facture_id = v_f and compte_num = '44566'), 'Pas de 44566');
  return next is((select sum(debit) - sum(credit) from public.filed_ecritures where facture_id = v_f), 0.00::numeric, 'Équilibrée');
end $f$;

create or replace function tests.test_a4_17_03_couverture_et_avoir() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb; av jsonb; v_c uuid;
begin
  v_c := tests.a4_compte(o, '6061', 'Fournitures non stockables');
  fa := tests.a4_facture(o, 'ia', 'ACH-003', 120);
  perform tests.a4_imputer(fa, v_c, 90);
  update public.filed_factures set statut = 'validee' where id = (fa ->> 'facture')::uuid;
  return next throws_ok(format($$update public.filed_factures set statut = 'comptabilisee' where id = %L$$, fa ->> 'facture'),
                        '55000', null, 'Imputations qui ne couvrent pas le HT : comptabilisation refusée');
  av := tests.a4_facture(o, 'ia', 'AV-001', 60);
  update public.filed_factures set nature = 'avoir' where id = (av ->> 'facture')::uuid;
  perform tests.a4_imputer(av, v_c, 50);
  perform tests.a4_comptabiliser(av);
  return next is((select credit from public.filed_ecritures where facture_id = (av ->> 'facture')::uuid and compte_num = '6061'), 50.00::numeric, 'Avoir : charge au crédit');
  return next is((select credit from public.filed_ecritures where facture_id = (av ->> 'facture')::uuid and compte_num = '44566'), 10.00::numeric, 'Avoir : TVA au crédit');
  return next is((select debit from public.filed_ecritures where facture_id = (av ->> 'facture')::uuid and compte_num = '401'), 60.00::numeric, 'Avoir : fournisseur au débit');
end $f$;

create or replace function tests.test_a4_17_04_reglements_et_lettrage() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb; v_f uuid; v_cl uuid; v_let text;
begin
  v_cl := (o ->> 'client')::uuid;
  fa := tests.a4_facture(o, 'ia', 'ACH-004', 120);
  v_f := (fa ->> 'facture')::uuid;
  perform tests.a4_imputer(fa, tests.a4_compte(o, '6061', 'Fournitures non stockables'), 100);
  update public.filed_factures set statut = 'validee' where id = v_f;
  -- Un règlement noté avant la comptabilisation est écrit avec elle.
  insert into public.filed_reglements (client_id, facture_id, document_id, regle_le, montant, mode, reference)
  values (v_cl, v_f, (fa ->> 'document')::uuid, current_date, 50, 'virement', 'VIR-1');
  return next ok(not exists (select 1 from public.filed_ecritures where facture_id = v_f), 'Rien d''écrit avant la comptabilisation');
  update public.filed_factures set statut = 'comptabilisee' where id = v_f;
  return next is((select debit from public.filed_ecritures where facture_id = v_f and journal_code = 'BQ' and compte_num = '401'), 50.00::numeric,
                 'Règlement : 401 au débit, journal BQ');
  return next is((select credit from public.filed_ecritures where facture_id = v_f and journal_code = 'BQ' and compte_num = '512'), 50.00::numeric, 'Banque 512 au crédit');
  return next ok(not exists (select 1 from public.filed_ecritures where facture_id = v_f and ecriture_let is not null), 'Pas encore soldée : pas de lettrage');
  insert into public.filed_reglements (client_id, facture_id, document_id, regle_le, montant, mode, reference)
  values (v_cl, v_f, (fa ->> 'document')::uuid, current_date, 70, 'especes', 'CAISSE-1');
  return next is((select credit from public.filed_ecritures where facture_id = v_f and journal_code = 'CA' and compte_num = '530'), 70.00::numeric, 'Espèces : journal de caisse, 530');
  select ecriture_let into v_let from public.filed_ecritures where facture_id = v_f and compte_num = '401' limit 1;
  return next ok(v_let ~ '^L[0-9]{6}$', 'Soldée : code de lettrage posé (' || coalesce(v_let, 'aucun') || ')');
  return next is((select count(*) from public.filed_ecritures where facture_id = v_f and compte_num = '401' and ecriture_let = v_let and date_let = current_date),
                 3::bigint, 'Les trois lignes 401 portent le même lettrage');
  return next ok(not exists (select 1 from public.filed_ecritures where facture_id = v_f and compte_num <> '401' and ecriture_let is not null),
                 'Seul le compte fournisseur est lettré');
end $f$;

create or replace function tests.test_a4_17_05_suite_et_immuabilite() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_c uuid; fa jsonb; i int; v_id bigint;
begin
  v_c := tests.a4_compte(o, '6061', 'Fournitures non stockables');
  for i in 1..3 loop
    fa := tests.a4_facture(o, 'ia', 'ACH-1' || i, 120);
    perform tests.a4_imputer(fa, v_c, 100);
    perform tests.a4_comptabiliser(fa);
  end loop;
  return next is((select array_agg(distinct ecriture_num order by ecriture_num) from public.filed_ecritures where client_id = (o ->> 'client')::uuid),
                 array[1, 2, 3], 'Numérotation continue : 1, 2, 3');
  return next ok(not exists (select 1 from public.filed_ecritures a join public.filed_ecritures b
                              on b.client_id = a.client_id and b.exercice_cle = a.exercice_cle and b.ecriture_num > a.ecriture_num
                             where a.client_id = (o ->> 'client')::uuid and b.ecriture_date < a.ecriture_date), 'Sans inversion de dates');
  select id into v_id from public.filed_ecritures where client_id = (o ->> 'client')::uuid limit 1;
  return next throws_ok(format('update public.filed_ecritures set debit = debit + 1 where id = %s', v_id), '42501', null, 'Une écriture ne se modifie pas');
end $f$;

create or replace function tests.test_a4_17_06_export_fec() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb; r jsonb; v_lignes text[]; v_l text; v_ok boolean := true;
begin
  fa := tests.a4_facture(o, 'ia', 'ACH-020', 120);
  perform tests.a4_imputer(fa, tests.a4_compte(o, '6061', 'Fournitures	non stockables'), 100);
  perform tests.a4_comptabiliser(fa);
  set local role service_role;
  return next throws_ok(format('select public.filed_exporter_fec(%L, %L)', o ->> 'client', o ->> 'entite'), '55000', null, 'Sans SIREN de la société : pas de FEC');
  reset role;
  update public.entites set siren = '123456782' where id = (o ->> 'entite')::uuid;
  set local role service_role;
  r := public.filed_exporter_fec((o ->> 'client')::uuid, (o ->> 'entite')::uuid);
  reset role;
  return next is(r ->> 'nom_fichier', '123456782FEC' || to_char(current_date, 'YYYY') || '1231.txt', 'Nom : SirenFECAAAAMMJJ (clôture)');
  v_lignes := string_to_array(rtrim(r ->> 'contenu', chr(13) || chr(10)), chr(13) || chr(10));
  return next is(v_lignes[1], 'JournalCode	JournalLib	EcritureNum	EcritureDate	CompteNum	CompteLib	CompAuxNum	CompAuxLib	PieceRef	PieceDate	EcritureLib	Debit	Credit	EcritureLet	DateLet	ValidDate	Montantdevise	Idevise',
                 'Première ligne : les 18 noms de champs');
  foreach v_l in array v_lignes loop
    if cardinality(string_to_array(v_l, chr(9))) <> 18 then v_ok := false; end if;
  end loop;
  return next ok(v_ok, 'Chaque ligne a 18 zones (la tabulation d''un libellé est neutralisée)');
  return next is(cardinality(v_lignes), 4, 'En-tête et trois lignes');
  return next ok(r ->> 'contenu' like '%' || chr(9) || '120,00' || chr(9) || '%', 'Montant à la virgule décimale');
  return next ok(r ->> 'contenu' like '%' || chr(9) || to_char(current_date, 'YYYYMMDD') || chr(9) || '%', 'Dates AAAAMMJJ');
  return next is((r ->> 'equilibre')::boolean, true, 'Débits = crédits');
  return next ok(exists (select 1 from public.journal_opposable where client_id = (o ->> 'client')::uuid and action = 'filed.export_fec'), 'L''export est journalisé');
  return next ok(not has_function_privilege('anon', 'public.filed_exporter_fec(uuid, uuid, uuid, date, date)', 'execute'), 'anon n''exporte pas');
end $f$;

create or replace function tests.test_a4_17_07_rattrapage() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb; fb jsonb; v_c uuid; r jsonb;
begin
  v_c := tests.a4_compte(o, '6061', 'Fournitures non stockables');
  fa := tests.a4_facture(o, 'ia', 'ACH-030', 120);
  perform tests.a4_imputer(fa, v_c, 100);
  fb := tests.a4_facture(o, 'ia', 'ACH-031', 120);
  perform tests.a4_imputer(fb, v_c, 80);
  -- L'état d'avant le lot 10 : comptabilisées sans écritures (déclencheur suspendu le temps de la mise en place).
  alter table public.filed_factures disable trigger filed_factures_ecritures;
  update public.filed_factures set statut = 'comptabilisee' where id in ((fa ->> 'facture')::uuid, (fb ->> 'facture')::uuid);
  alter table public.filed_factures enable trigger filed_factures_ecritures;
  r := public.filed_rattraper_ecritures((o ->> 'client')::uuid);
  return next is((r ->> 'ecrites')::int, 1, 'Une facture rattrapée');
  return next is(jsonb_array_length(r -> 'refusees'), 1, 'Une refusée : ses imputations ne couvrent pas le HT');
  return next is((public.filed_rattraper_ecritures((o ->> 'client')::uuid) ->> 'ecrites')::int, 0, 'Rejoué : rien de plus');
end $f$;
