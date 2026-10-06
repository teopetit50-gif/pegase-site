-- Tests A4 — lot 16 (a4_24) : un historique de plusieurs exercices se reprend en une fois à l'installation.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_siren_aleatoire (a4_12_echange_pa.sql), à poser avant. `select * from runtests('tests', '^test_a4_')` ;
-- runtests() annule tout. Données d'exemple seulement.

-- Un FEC d'exemple : l'en-tête des 18 champs puis les lignes (champs séparés par « ; » ici, remplacés par le séparateur).
create or replace function tests.a4_fec(p_sep text, p_lignes text[])
returns text language sql immutable as $$
  select array_to_string(
    array['JournalCode;JournalLib;EcritureNum;EcritureDate;CompteNum;CompteLib;CompAuxNum;CompAuxLib;PieceRef;PieceDate;EcritureLib;Debit;Credit;EcritureLet;DateLet;ValidDate;Montantdevise;Idevise']
    || p_lignes, chr(13) || chr(10)) || chr(13) || chr(10)
$$;
create or replace function tests.a4_fec_sep(p_sep text, p_lignes text[])
returns text language sql immutable as $$ select replace(tests.a4_fec(p_sep, p_lignes), ';', p_sep) $$;

-- 2024 : à-nouveaux, deux factures Delorme (606100, 613200), un règlement, une facture d'un tiers sans 6 (immobilisation 218).
create or replace function tests.a4_fec_2024() returns text language sql immutable as $$
  select tests.a4_fec_sep(chr(9), array[
    'AN;A nouveaux;1;20240101;512000;Banque;;;AN;20240101;A nouveau;1 500,00;0,00;;;20240101;;',
    'AN;A nouveaux;1;20240101;101000;Capital;;;AN;20240101;A nouveau;0,00;1 500,00;;;20240101;;',
    'HA;Achats;2;20240315;606100;Fournitures administratives;;;FA-2024-001;20240315;Delorme papeterie;100,00;0,00;;;20240316;;',
    'HA;Achats;2;20240315;445660;TVA deductible;;;FA-2024-001;20240315;Delorme papeterie;20,00;0,00;;;20240316;;',
    'HA;Achats;2;20240315;401000;Fournisseurs;FDELORME;Papeterie Delorme SARL;FA-2024-001;20240315;Delorme papeterie;0,00;120,00;A;20240401;20240316;;',
    'HA;Achats;3;20240610;613200;Locations immobilieres;;;FA-2024-077;20240610;Delorme location;50,00;0,00;;;20240611;;',
    'HA;Achats;3;20240610;445660;TVA deductible;;;FA-2024-077;20240610;Delorme location;10,00;0,00;;;20240611;;',
    'HA;Achats;3;20240610;401000;Fournisseurs;FDELORME;Papeterie Delorme SARL;FA-2024-077;20240610;Delorme location;0,00;60,00;;;20240611;;',
    'HA;Achats;4;20240920;218300;Materiel informatique;;;MAC-88;20240920;Ordinateur;1 000,00;0,00;;;20240921;;',
    'HA;Achats;4;20240920;445620;TVA sur immobilisations;;;MAC-88;20240920;Ordinateur;200,00;0,00;;;20240921;;',
    'HA;Achats;4;20240920;404000;Fournisseurs immobilisations;FPOMME;Pomme Distribution SAS;MAC-88;20240920;Ordinateur;0,00;1 200,00;;;20240921;;',
    'BQ;Banque;5;20240401;401000;Fournisseurs;FDELORME;Papeterie Delorme SARL;VIR-1;20240401;Reglement Delorme;120,00;0,00;A;20240401;20240401;;',
    'BQ;Banque;5;20240401;512000;Banque;;;VIR-1;20240401;Reglement Delorme;0,00;120,00;;;20240401;;'])
$$;

-- 2025, séparé par « | » : une facture Delorme (606100).
create or replace function tests.a4_fec_2025() returns text language sql immutable as $$
  select tests.a4_fec_sep('|', array[
    'HA;Achats;1;20250205;606100;Fournitures administratives;;;FA-2025-014;20250205;Delorme papeterie;80,00;0,00;;;20250206;;',
    'HA;Achats;1;20250205;445660;TVA deductible;;;FA-2025-014;20250205;Delorme papeterie;16,00;0,00;;;20250206;;',
    'HA;Achats;1;20250205;401000;Fournisseurs;FDELORME;Papeterie Delorme;FA-2025-014;20250205;Delorme papeterie;0,00;96,00;;;20250206;;'])
$$;

-- Le gérant de l'organisation agit.
create or replace function tests.a4_agir(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;

create or replace function tests.test_a4_24_01_reprise() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; v_e uuid := (o ->> 'entite')::uuid; v_s text := tests.a4_siren_aleatoire();
        r jsonb; v_x public.filed_exercices; v_t public.filed_reprise_tiers; v_fichiers jsonb;
begin
  update public.entites set siren = v_s where id = v_e;
  v_fichiers := jsonb_build_array(
    jsonb_build_object('nom_fichier', v_s || 'FEC20251231.txt', 'contenu', tests.a4_fec_2025()),
    jsonb_build_object('nom_fichier', v_s || 'FEC20241231.txt', 'contenu', tests.a4_fec_2024()),
    jsonb_build_object('nom_fichier', v_s || 'FEC20231231.txt', 'contenu', tests.a4_fec_sep(chr(9), array[
      'HA;Achats;1;20230505;606100;Fournitures;;;X-1;20230505;Desequilibre;10,00;0,00;;;20230506;;',
      'HA;Achats;1;20230505;401000;Fournisseurs;FDELORME;Papeterie Delorme;X-1;20230505;Desequilibre;0,00;12,00;;;20230506;;'])),
    jsonb_build_object('nom_fichier', '999999999FEC20221231.txt', 'contenu', tests.a4_fec_2025()));
  perform tests.a4_agir((o ->> 'gerant')::uuid);
  r := public.filed_reprendre_historique(v_cl, v_e, v_fichiers);
  reset role;

  return next is(r -> 0 ->> 'nom_fichier', '999999999FEC20221231.txt', 'Les fichiers sont repris du plus ancien au plus récent');
  return next ok(r -> 0 ->> 'erreur' like '%SIREN 999999999%', 'Le FEC d''une autre société est refusé');
  return next ok(r -> 1 ->> 'erreur' like 'Écritures déséquilibrées : HA 1%', 'Un FEC déséquilibré est refusé, seul');
  return next is((r -> 2 ->> 'lignes')::int, 13, '2024 : 13 lignes reprises');
  return next is((r -> 2 ->> 'ecritures')::int, 5, 'en 5 écritures');
  return next is((r -> 2 ->> 'total_debit')::numeric, 3000.00::numeric, 'total des débits');
  return next is((r -> 3 ->> 'lignes')::int, 3, '2025 (séparé par « | ») : 3 lignes');

  select * into v_x from public.filed_exercices where id = (r -> 2 ->> 'exercice')::uuid;
  return next is(v_x.debut || ' ' || v_x.fin || ' ' || v_x.statut, '2024-01-01 2024-12-31 cloture', 'Exercice 2024 créé clos');
  select * into v_x from public.filed_exercices where id = (r -> 3 ->> 'exercice')::uuid;
  return next is(v_x.debut, date '2025-01-01', 'L''exercice 2025 suit 2024 (et non la date de sa première écriture)');
  return next is((select count(*) from public.filed_exercices where client_id = v_cl and entite_id = v_e and fin < date '2024-01-01'), 0::bigint,
                 'Aucun exercice pour les fichiers refusés');

  return next is((select string_agg(numero || ':' || nature || ':' || source, ',' order by numero) from public.filed_plan_comptable
                   where client_id = v_cl and numero in ('606100', '613200', '218300')),
                 '218300:immobilisation:import,606100:charge:import,613200:charge:import', 'Comptes 2 et 6 posés au plan, source import');
  return next is((select count(*) from public.filed_plan_comptable where client_id = v_cl and numero in ('512000', '401000', '445660')), 0::bigint,
                 'ni banque, ni tiers, ni TVA');

  select * into v_t from public.filed_reprise_tiers where client_id = v_cl and comp_aux_num = 'FDELORME';
  return next is(v_t.pieces, 3, 'Delorme : trois pièces d''achat (le règlement n''en est pas une)');
  return next is(v_t.comptes, '{"606100": 2, "613200": 1}'::jsonb, 'et ses comptes habituels');
  return next is(v_t.comp_aux_lib, 'Papeterie Delorme', 'le libellé le plus récent');
  return next ok(exists (select 1 from public.filed_reprise_tiers where client_id = v_cl and comp_aux_num = 'FPOMME' and comptes = '{"218300": 1}'),
                 'Un fournisseur d''immobilisation (404) aussi');
  return next is((r -> -1 ->> 'tiers_a_lier')::int, 2, 'Deux tiers sans fournisseur FILED encore');
  return next ok(exists (select 1 from public.journal_opposable where client_id = v_cl and action = 'filed.reprise_fec'), 'Au journal');

  v_fichiers := jsonb_build_array(jsonb_build_object('nom_fichier', v_s || 'FEC20241231.txt', 'contenu', tests.a4_fec_2024()));
  perform tests.a4_agir((o ->> 'gerant')::uuid);
  r := public.filed_reprendre_historique(v_cl, v_e, v_fichiers);
  reset role;
  return next ok((r -> 0 ->> 'deja')::boolean, 'Rejouée : déjà reprise');
  return next is((select count(*) from public.filed_reprise_ecritures where client_id = v_cl), 16::bigint, 'sans une ligne de plus');
end $f$;

create or replace function tests.test_a4_24_02_apprentissage_et_doublon() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; v_e uuid := (o ->> 'entite')::uuid; v_s text := tests.a4_siren_aleatoire();
        v_four uuid; fa jsonb; v_f uuid; v_fichiers jsonb;
begin
  update public.entites set siren = v_s where id = v_e;
  v_fichiers := jsonb_build_array(
    jsonb_build_object('nom_fichier', v_s || 'FEC20241231.txt', 'contenu', tests.a4_fec_2024()),
    jsonb_build_object('nom_fichier', v_s || 'FEC20251231.txt', 'contenu', tests.a4_fec_2025()));
  perform tests.a4_agir((o ->> 'gerant')::uuid);
  perform public.filed_reprendre_historique(v_cl, v_e, v_fichiers);
  reset role;

  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source, siren)
  values (v_cl, null, 'PAPETERIE DELORME', 'papeterie delorme', 'FR', 'actif', 'saisie', tests.a4_siren_aleatoire()) returning id into v_four;
  return next is((select fournisseur_id from public.filed_reprise_tiers where client_id = v_cl and comp_aux_num = 'FDELORME'), v_four,
                 'Le fournisseur créé après la reprise retrouve son tiers par le nom');
  return next is((select a.nb_validees from public.filed_imputations_apprises a join public.filed_plan_comptable c on c.id = a.compte_id
                   where a.fournisseur_id = v_four and c.numero = '606100'), 2, 'et apprend ses comptes : 606100 deux fois');
  return next is((select a.nb_validees from public.filed_imputations_apprises a join public.filed_plan_comptable c on c.id = a.compte_id
                   where a.fournisseur_id = v_four and c.numero = '613200'), 1, '613200 une fois');

  fa := tests.a4_facture(o, 'humain', 'FA 2024 001', 120);
  v_f := (fa ->> 'facture')::uuid;
  update public.filed_factures set fournisseur_id = v_four where id = v_f;
  perform private.filed_controler_facture(v_f);
  return next ok(exists (select 1 from public.filed_controles where facture_id = v_f and code = 'doublon.historique' and resultat = 'anomalie'
                           and gravite = 'bloquant' and message like '%écriture HA 2 du 15/03/2024%'),
                 'Une facture déjà comptabilisée dans l''ancien logiciel est signalée, avec son écriture');
  return next is((select statut from public.filed_factures where id = v_f), 'bloquee', 'et bloquée');

  fa := tests.a4_facture(o, 'humain', 'FA-2026-005', 120);
  v_f := (fa ->> 'facture')::uuid;
  update public.filed_factures set fournisseur_id = v_four where id = v_f;
  perform private.filed_controler_facture(v_f);
  return next ok(not exists (select 1 from public.filed_controles where facture_id = v_f and code = 'doublon.historique' and resultat = 'anomalie'),
                 'Une facture nouvelle du même fournisseur passe');

  fa := tests.a4_facture(o, 'humain', 'FA-2024-001', 120);
  v_f := (fa ->> 'facture')::uuid;
  perform private.filed_controler_facture(v_f);
  return next ok(not exists (select 1 from public.filed_controles where facture_id = v_f and code = 'doublon.historique' and resultat = 'anomalie'),
                 'Le même numéro chez un autre fournisseur n''est pas un doublon');
end $f$;

create or replace function tests.test_a4_24_03_refus_et_droits() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; v_e uuid := (o ->> 'entite')::uuid; r jsonb; v_fichiers jsonb;
begin
  perform tests.a4_agir((o ->> 'valideur')::uuid);
  return next throws_ok(format($$select public.filed_reprendre_historique(%L, %L, '[{"nom_fichier": "x", "contenu": ""}]')$$, v_cl, v_e), '42501', null,
                        'Un valideur ne reprend pas l''historique');
  reset role;
  v_fichiers := jsonb_build_array(
    jsonb_build_object('nom_fichier', 'export-compta.txt', 'contenu', tests.a4_fec_2025()),
    jsonb_build_object('nom_fichier', '123456782FEC20211231.txt', 'contenu', 'JournalCode;EcritureNum' || chr(10) || 'HA;1'),
    jsonb_build_object('nom_fichier', '123456782FEC20241231.txt', 'contenu', tests.a4_fec_sep(chr(9), array[
      'HA;Achats;1;20250105;606100;Fournitures;;;X-1;20250105;Hors exercice;10,00;0,00;;;20250106;;',
      'HA;Achats;1;20250105;401000;Fournisseurs;F1;F1;X-1;20250105;Hors exercice;0,00;10,00;;;20250106;;'])),
    jsonb_build_object('nom_fichier', '123456782FEC20240630.txt', 'contenu', tests.a4_fec_sep(chr(9), array[
      'HA;Achats;1;2024-13-45;606100;Fournitures;;;X-1;20240105;Date folle;10,00;0,00;;;20240106;;',
      'HA;Achats;1;20240105;401000;Fournisseurs;F1;F1;X-1;20240105;Date folle;0,00;10,00;;;20240106;;'])),
    jsonb_build_object('nom_fichier', '123456782FEC' || to_char(current_date + 30, 'YYYYMMDD') || '.txt', 'contenu', tests.a4_fec_2025()));
  perform tests.a4_agir((o ->> 'gerant')::uuid);
  r := public.filed_reprendre_historique(v_cl, v_e, v_fichiers);
  reset role;
  -- Ordre de reprise : sans date d'abord, puis 2021, 2024-06, 2024-12, le futur.
  return next ok(r -> 0 ->> 'erreur' like '%nom de FEC%', 'Un fichier mal nommé est refusé');
  return next ok(r -> 1 ->> 'erreur' like '%Séparateur inconnu%', 'Un fichier sans séparateur de FEC aussi');
  return next ok(r -> 2 ->> 'erreur' like '%illisible, ligne(s) 2%', 'Une date illisible, avec sa ligne : ' || coalesce(r -> 2 ->> 'erreur', r::text));
  return next ok(r -> 3 ->> 'erreur' like '%après la clôture%', 'Une écriture après la clôture aussi');
  return next ok(r -> 4 ->> 'erreur' like '%pas passée%', 'Un exercice pas encore clos aussi');
  return next is((select count(*) from public.filed_reprises where client_id = v_cl), 0::bigint, 'Rien de repris');
  return next ok(not has_function_privilege('authenticated', 'private.filed_reprendre_fec(uuid, uuid, text, text, date, uuid)', 'execute')
                 and not has_function_privilege('authenticated', 'private.filed_lier_tiers_reprise(uuid, uuid)', 'execute')
                 and not has_function_privilege('authenticated', 'private.filed_fournisseurs_lier_reprise()', 'execute'),
                 'Les fonctions internes ne sont pas ouvertes aux membres');
  return next ok(not has_function_privilege('anon', 'public.filed_reprendre_historique(uuid, uuid, jsonb)', 'execute'), 'ni la porte à anon');
end $f$;
