-- Tests A4 — lot 27 (a4_35) : la note de frais, avancée par un salarié, approuvée par un autre, écrite au compte du
-- personnel et remboursée. pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture
-- (a4_10_facture_electronique.sql), tests.a4_compte, tests.a4_imputer (a4_11_ecritures_fec.sql), tests.a4_comme
-- (a4_26_sortie_envois.sql), à poser avant. `select * from runtests('tests', '^test_a4_')` ; runtests() annule tout.

create or replace function tests.test_a4_35_01_note_frais() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb; v_f uuid; v_note uuid; v_col uuid := gen_random_uuid(); v_c uuid; v_let text;
begin
  insert into auth.users (id, email, instance_id, aud, role, encrypted_password, created_at, updated_at)
  values (v_col, 'camille.martin@exemple.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '', now(), now());
  insert into public.comptes (user_id, client_id, role) values (v_col, (o ->> 'client')::uuid, 'collaborateur');
  fa := tests.a4_facture(o, 'ia', 'TICKET-042', 36);
  v_f := (fa ->> 'facture')::uuid;
  v_c := tests.a4_compte(o, '6256', 'Missions');

  reset role; perform tests.a4_comme(v_col);
  return next throws_ok(format('select public.filed_declarer_note_frais(%L, %L)', v_f, o ->> 'valideur'), '42501', null,
                        'Un collaborateur ne déclare pas la note d''un autre');
  v_note := public.filed_declarer_note_frais(v_f, null, null, 'Déjeuner client');
  reset role;
  return next is((select beneficiaire_nom || ':' || statut || ':' || left(code_tiers, 3) from public.filed_notes_frais where id = v_note),
                 'camille.martin:a_rembourser:NDF', 'Sa propre note : bénéficiaire, à rembourser, compte auxiliaire NDF');

  perform tests.a4_imputer(fa, v_c, 30);
  update public.filed_factures set statut = 'a_valider' where id = v_f;
  perform set_config('request.jwt.claims', json_build_object('sub', v_col, 'role', 'authenticated')::text, true);
  return next throws_ok(format('update public.filed_factures set statut = ''validee'' where id = %L', v_f), '42501', null,
                        'Le bénéficiaire n''approuve pas sa propre note');
  perform set_config('request.jwt.claims', json_build_object('sub', o ->> 'valideur', 'role', 'authenticated')::text, true);
  update public.filed_factures set statut = 'validee' where id = v_f;
  update public.filed_factures set statut = 'comptabilisee' where id = v_f;
  perform set_config('request.jwt.claims', '', true);

  return next is((select count(*) from public.filed_ecritures where facture_id = v_f and compte_num = '401'), 0::bigint, 'Rien au fournisseur');
  return next is((select credit || ':' || comp_aux_num || ':' || comp_aux_lib from public.filed_ecritures where facture_id = v_f and compte_num = '421'),
                 '36.00:' || (select code_tiers from public.filed_notes_frais where id = v_note) || ':camille.martin',
                 'La dette au compte 421, au nom de la salariée');
  return next is((select sum(debit) - sum(credit) from public.filed_ecritures where facture_id = v_f), 0.00::numeric, 'Écriture équilibrée');

  reset role; perform tests.a4_comme(v_col);
  return next throws_ok(format('select public.filed_rembourser_note_frais(%L)', v_note), '42501', null, 'On ne se rembourse pas soi-même');
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  perform public.filed_rembourser_note_frais(v_note, current_date, 'virement');
  reset role;
  return next is((select statut from public.filed_notes_frais where id = v_note), 'remboursee', 'Remboursée');
  return next is((select debit from public.filed_ecritures where facture_id = v_f and origine = 'reglement' and compte_num = '421'), 36.00::numeric,
                 'Le remboursement solde le 421');
  select ecriture_let into v_let from public.filed_ecritures where facture_id = v_f and origine = 'facture' and compte_num = '421';
  return next ok(v_let is not null and v_let = (select ecriture_let from public.filed_ecritures where facture_id = v_f and origine = 'reglement' and compte_num = '421'),
                 'et le compte de la salariée est lettré');
end $f$;

create or replace function tests.test_a4_35_02_compte_et_gardes() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb; fb jsonb; v_c uuid;
begin
  fa := tests.a4_facture(o, 'ia', 'PEAGE-7', 12);
  fb := tests.a4_facture(o, 'ia', 'PAYEE-1', 60);
  v_c := tests.a4_compte(o, '6251', 'Voyages et déplacements');
  update public.filed_factures set statut = 'validee' where id = (fb ->> 'facture')::uuid;
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  perform public.filed_marquer_reglee((fb ->> 'facture')::uuid, current_date, 60, 'virement', 'VIR-FOUR');
  return next throws_ok(format('select public.filed_declarer_note_frais(%L, %L)', fb ->> 'facture', o ->> 'valideur'), '55000', null,
                        'Une pièce déjà payée au fournisseur ne devient pas une note de frais');
  perform public.filed_regler_compte_notes_frais((o ->> 'client')::uuid, '4386', 'Notes de frais à rembourser');
  perform public.filed_declarer_note_frais((fa ->> 'facture')::uuid, (o ->> 'valideur')::uuid, 'Jean Dupont');
  reset role;
  perform tests.a4_imputer(fa, v_c, 10);
  update public.filed_factures set statut = 'validee' where id = (fa ->> 'facture')::uuid;
  update public.filed_factures set statut = 'comptabilisee' where id = (fa ->> 'facture')::uuid;
  return next is((select compte_num || ':' || comp_aux_lib from public.filed_ecritures where facture_id = (fa ->> 'facture')::uuid and credit > 0),
                 '4386:Jean Dupont', 'Le compte réglé par l''organisation sert');
  return next ok(not has_function_privilege('authenticated', 'private.filed_compte_tiers(uuid)', 'execute')
             and not has_function_privilege('authenticated', 'private.filed_ecriture_note_frais()', 'execute'), 'Le moteur n''est pas ouvert aux membres');
end $f$;
