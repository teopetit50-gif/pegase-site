-- Tests A4 — lot 18 (a4_26, a4_26b) : registre IDE suisse, HMRC, attestation humaine hors registre, comptes système
-- réglables. pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation et tests.a4_facture (a4_10_facture_electronique.sql).
-- À jouer APRÈS a4_26b (retrait des anciennes contraintes) : sinon uid_ch et hmrc sont encore refusés.
-- `select * from runtests('tests', '^test_a4_')` ; runtests() annule tout. Données d'exemple seulement.

-- Une facture de l'organisation d'exemple, rattachée à un fournisseur étranger créé pour l'occasion. Rend {facture, fournisseur}.
create or replace function tests.a4_facture_etrangere(p_org jsonb, p_numero text, p_pays text, p_tva text) returns jsonb
language plpgsql as $$
declare fa jsonb := tests.a4_facture(p_org, 'ia', p_numero, 120); v_four uuid;
begin
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source, tva)
  values ((p_org ->> 'client')::uuid, 'ETR' || p_pays, 'Fournisseur étranger ' || p_pays, 'fournisseur etranger ' || lower(p_pays), p_pays, 'actif', 'saisie', p_tva)
  returning id into v_four;
  update public.filed_factures set fournisseur_id = v_four, fournisseur_lu = jsonb_build_object('tva', p_tva), regime_tva = 'hors_ue'
   where id = (fa ->> 'facture')::uuid;
  return fa || jsonb_build_object('fournisseur', v_four);
end $$;

create or replace function tests.test_a4_26_01_cles() returns setof text
language plpgsql as $f$
begin
  return next is((select registre || ' ' || identifiant || ' ' || cle_verifiee from private.filed_identifiant_etranger('CHE-116.281.710 MWST')),
                 'uid_ch CHE116281710 true', 'IDE suisse : forme, suffixe MWST et clé modulo 11');
  return next is((select cle_verifiee from private.filed_identifiant_etranger('CHE-116.281.711')), false, 'une clé fausse est vue');
  return next is((select format_ok from private.filed_identifiant_etranger('CHE-116.281')), false, 'une forme courte aussi');
  return next is((select registre || ' ' || identifiant || ' ' || cle_verifiee from private.filed_identifiant_etranger('GB 980 7806 84')),
                 'hmrc GB980780684 true', 'TVA britannique : clé modulo 97');
  return next is((select cle_verifiee from private.filed_identifiant_etranger('GB980780685')), false, 'une clé fausse est vue');
  return next ok((select format_ok and cle_verifiee is null from private.filed_identifiant_etranger('GBGD001')), 'GD + 3 chiffres : forme seule');
  return next ok((select registre is null and pays = 'NO' from private.filed_identifiant_etranger('NO 923609016 MVA')), 'Norvège : pas de registre');
  return next is((select count(*) from private.filed_identifiant_etranger('DE123456789')), 0::bigint, 'un numéro de l''Union reste à l''analyse VIES');
  return next is((select count(*) from private.filed_identifiant_etranger('XI123456789')), 0::bigint, 'l''Irlande du Nord aussi');
end $f$;

create or replace function tests.test_a4_26_02_suisse() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb; v_f uuid; v_v uuid;
begin
  fa := tests.a4_facture_etrangere(o, 'CH-001', 'CH', 'CHE-116.281.710 MWST');
  v_f := (fa ->> 'facture')::uuid;
  perform private.filed_controler_facture(v_f);
  return next ok(exists (select 1 from public.filed_controles where facture_id = v_f and code = 'identite.tva_intracom' and resultat <> 'anomalie'),
                 'Un numéro suisse bien formé n''est plus « invalide »');
  select id into v_v from public.filed_verifications_tiers where client_id = (o ->> 'client')::uuid and registre = 'uid_ch' and identifiant = 'CHE116281710';
  return next ok(v_v is not null, 'La vérification est demandée au registre IDE suisse');
  return next ok(exists (select 1 from public.filed_controles where facture_id = v_f and code = 'identite.registre' and resultat = 'anomalie'
                           and message like '%registre IDE suisse%vérification demandée%'), 'en attendant : attention');
  perform private.filed_repondre_verification(v_v, 'valide', '{"nom": "Fournisseur étranger CH"}');
  return next is((select identite_source from public.filed_fournisseurs where id = (fa ->> 'fournisseur')::uuid), 'uid_ch',
                 'La réponse remplit le verdict du fournisseur');
  return next ok(exists (select 1 from public.filed_controles where facture_id = v_f and code = 'identite.registre' and resultat <> 'anomalie'
                           and message like 'Identité confirmée par le registre IDE suisse%'), 'et la facture est recontrôlée');

  fa := tests.a4_facture_etrangere(o, 'CH-002', 'LI', 'CHE-116.281.711');
  v_f := (fa ->> 'facture')::uuid;
  perform private.filed_controler_facture(v_f);
  return next ok(exists (select 1 from public.filed_controles where facture_id = v_f and code = 'identite.tva_intracom' and resultat = 'anomalie' and gravite = 'bloquant'),
                 'Une clé IDE fausse bloque');
end $f$;

create or replace function tests.test_a4_26_03_royaume_uni() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb; v_f uuid; v_v uuid;
begin
  fa := tests.a4_facture_etrangere(o, 'GB-001', 'GB', 'GB980780684');
  v_f := (fa ->> 'facture')::uuid;
  perform private.filed_controler_facture(v_f);
  select id into v_v from public.filed_verifications_tiers where client_id = (o ->> 'client')::uuid and registre = 'hmrc' and identifiant = 'GB980780684';
  return next ok(v_v is not null, 'GB : la vérification est demandée à HMRC');
  perform private.filed_repondre_verification(v_v, 'invalide', '{}');
  return next ok(exists (select 1 from public.filed_controles where facture_id = v_f and code = 'identite.registre' and resultat = 'anomalie'
                           and gravite = 'bloquant' and message like 'HMRC ne reconnaît pas%'), 'Un refus de HMRC bloque');
end $f$;

create or replace function tests.test_a4_26_04_sans_registre() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb; v_f uuid;
begin
  fa := tests.a4_facture_etrangere(o, 'NO-001', 'NO', 'NO 923609016 MVA');
  v_f := (fa ->> 'facture')::uuid;
  perform private.filed_controler_facture(v_f);
  return next ok(exists (select 1 from public.filed_controles where facture_id = v_f and code = 'identite.tva_intracom' and resultat = 'anomalie' and gravite = 'attention'),
                 'Norvège : numéro hors Union en attention, pas bloquant');
  return next ok(exists (select 1 from public.filed_controles where facture_id = v_f and code = 'identite.registre' and resultat = 'anomalie'
                           and gravite = 'attention' and message like '%à attester par une personne%'), 'identité à attester par une personne');
  return next ok(not exists (select 1 from public.filed_verifications_tiers where client_id = (o ->> 'client')::uuid and identifiant like 'NO%'),
                 'aucun registre interrogé');
  perform set_config('request.jwt.claims', json_build_object('sub', o ->> 'gerant', 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.filed_attester_identite((fa ->> 'fournisseur')::uuid, 'Extrait du registre Brønnøysund reçu par courriel');
  reset role;
  return next ok(exists (select 1 from public.filed_controles where facture_id = v_f and code = 'identite.registre' and resultat <> 'anomalie'
                           and message like '%attestée par une personne%'), 'L''attestation lève l''attention');

  fa := tests.a4_facture_etrangere(o, 'DE-001', 'DE', 'DE123456789');
  v_f := (fa ->> 'facture')::uuid;
  perform private.filed_controler_facture(v_f);
  return next ok(not exists (select 1 from public.filed_controles where facture_id = v_f and code = 'identite.registre' and message like '%attester%'),
                 'Un fournisseur de l''Union n''est jamais renvoyé à l''attestation');
end $f$;

create or replace function tests.test_a4_26_05_contraintes_et_comptes() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation();
begin
  return next ok((select bool_and(convalidated) from pg_constraint where conname in ('filed_verifications_tiers_registre_v2',
                   'filed_fournisseurs_identite_source_v2', 'filed_comptes_systeme_role_v2')) and
                 (select count(*) from pg_constraint where conname in ('filed_verifications_tiers_registre_v2',
                   'filed_fournisseurs_identite_source_v2', 'filed_comptes_systeme_role_v2')) = 3, 'Les trois contraintes élargies, validées');
  return next ok(not exists (select 1 from pg_constraint where conname in ('filed_verifications_tiers_registre_check', 'filed_comptes_systeme_role_check')),
                 'les anciennes sont retirées (a4_26b)');
  return next throws_ok(format($$insert into public.filed_verifications_tiers (client_id, registre, identifiant) values (%L, 'gleif', 'X')$$, o ->> 'client'),
                        '23514', null, 'Un registre inconnu reste refusé');
  perform set_config('request.jwt.claims', json_build_object('sub', o ->> 'gerant', 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.filed_regler_compte_systeme((o ->> 'client')::uuid, 'tva_due_intracom', '445200', 'TVA due intracommunautaire');
  perform public.filed_regler_compte_systeme((o ->> 'client')::uuid, 'gain_change', '766000', 'Gains de change');
  reset role;
  return next is((select numero from private.filed_compte_systeme((o ->> 'client')::uuid, 'tva_due_intracom')), '445200', 'Le compte de TVA due se règle');
  return next is((select numero from private.filed_compte_systeme((o ->> 'client')::uuid, 'gain_change')), '766000', 'le gain de change aussi');
  return next ok(not has_function_privilege('authenticated', 'private.filed_identifiant_etranger(text)', 'execute'), 'Les fonctions internes restent fermées');
end $f$;
