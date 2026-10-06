-- c4_01 — OFFLOAD, palier 1 : l'historique d'achats importé ou saisi (session C4, 06/10/2026).
-- Exécutable tel quel par execute_sql sur la RECETTE, après c4_00_jeu.sql et la migration c4_01. runtests() annule tout.

-- Installation, droits, RLS, modèles d'export.
create or replace function tests.test_c4_01_installation() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_lecteur uuid;
  r jsonb;
  r2 jsonb;
begin
  perform tests.redevenir_admin();
  v_lecteur := tests.c4_compte(v_client, 'lecteur', 'lecteur-c4@banc-varelo.test');

  return next ok(exists (select 1 from public.modeles_jeux m where m.module = 'offload' and m.logiciel = 'tableur' and m.code = 'ventes'),
                 'Le modèle d''export « ventes » existe (modeles_jeux offload/tableur)');
  return next ok(exists (select 1 from public.modeles_jeux m where m.module = 'offload' and m.logiciel = 'tableur' and m.code = 'clients'),
                 'Le modèle d''export « clients » existe');
  return next ok(exists (select 1 from private.abonnements a where a.evenement = 'releve.pret.offload' and a.genre = 'offload.appliquer_releve'),
                 'OFFLOAD est abonné aux relevés prêts');

  perform tests.endosser(v_lecteur, 'lecteur-c4@banc-varelo.test');
  return next throws_ok(format('select public.offload_installer(%L::uuid, null)', v_client), '42501',
                        'Un lecteur n''installe pas OFFLOAD');
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  r := public.offload_installer(v_client, null);
  return next is(r ->> 'mode', 'essai', 'Installé par le gérant, OFFLOAD commence en mode essai');
  return next ok(r ->> 'branchement' is not null, 'Le branchement d''exports est posé');
  return next ok((r -> 'jeux') @> '["clients", "ventes"]'::jsonb, 'Le branchement porte les jeux « clients » et « ventes »');
  r2 := public.offload_installer(v_client, null);
  return next is(r2 ->> 'branchement', r ->> 'branchement', 'Réinstaller ne rebranche rien');
  return next is((select g.mode from public.offload_reglages g where g.client_id = v_client), 'essai', 'Le gérant lit ses réglages');
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'offload.installe'),
                 'L''installation est au journal');

  return next ok((select bool_and(c.relrowsecurity) from pg_class c where c.oid in
                   ('public.offload_reglages'::regclass, 'public.offload_comptes'::regclass, 'public.offload_achats'::regclass)),
                 'RLS active sur les trois tables');
  return next ok(not has_table_privilege('anon', 'public.offload_achats', 'select'), 'anon ne lit pas les achats');
  return next ok(has_table_privilege('authenticated', 'public.offload_achats', 'select')
                 and not has_table_privilege('authenticated', 'public.offload_achats', 'insert')
                 and not has_table_privilege('authenticated', 'public.offload_comptes', 'update')
                 and not has_table_privilege('authenticated', 'public.offload_reglages', 'delete'),
                 'authenticated lit, n''écrit jamais directement');
  return next ok(not has_function_privilege('anon', 'public.offload_saisir_achat(uuid, date, numeric, text, text, text)', 'execute'),
                 'anon n''exécute pas les portes');
  return next ok(not has_function_privilege('authenticated', 'private.offload_appliquer_releve(jsonb)', 'execute')
                 and not has_function_privilege('authenticated', 'private.offload_traiter_travaux(integer)', 'execute'),
                 'L''import reste au serveur');
  return next ok(exists (select 1 from cron.job where jobname = 'offload-releves'), 'Le cron offload-releves est posé');
end $f$;

-- Lire une date et un montant à la française.
create or replace function tests.test_c4_01_lecture() returns setof text
language plpgsql as $f$
begin
  perform tests.redevenir_admin();
  return next is(private.offload_lire_date('14/03/2025'), date '2025-03-14', '14/03/2025');
  return next is(private.offload_lire_date('2025-03-14 10:12:00'), date '2025-03-14', 'ISO avec heure');
  return next is(private.offload_lire_date('14.03.25'), date '2025-03-14', '14.03.25');
  return next is(private.offload_lire_date('20250314'), date '2025-03-14', 'AAAAMMJJ');
  return next is(private.offload_lire_date('31/02/2025'), null::date, 'Une date impossible est illisible');
  return next is(private.offload_lire_date('mars 2025'), null::date, 'Un texte n''est pas une date');
  return next is(private.offload_lire_montant('1 234,50 €'), 1234.50::numeric, '1 234,50 €');
  return next is(private.offload_lire_montant('1.234,50'), 1234.50::numeric, '1.234,50');
  return next is(private.offload_lire_montant('1,234.50'), 1234.50::numeric, '1,234.50');
  return next is(private.offload_lire_montant('(120,00)'), -120.00::numeric, '(120,00) est négatif');
  return next is(private.offload_lire_montant('120,00-'), -120.00::numeric, '120,00- est négatif');
  return next is(private.offload_lire_montant('12 345'), 12345::numeric, '12 345');
  return next is(private.offload_lire_montant('n.c.'), null::numeric, 'n.c. est illisible');
  return next is(private.offload_nature('Avoir'), 'avoir', 'Avoir');
  return next is(private.offload_nature('Bon de commande'), 'commande', 'Bon de commande');
  return next is(private.offload_nature(null), 'facture', 'Sans type : facture');
end $f$;

-- L'import complet : fichier clients, puis ventes à la française, puis un export rejoué et corrigé.
create or replace function tests.test_c4_01_import() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  d jsonb;
  v_c001 uuid;
  n integer;
  v_ventes jsonb;
begin
  perform tests.c4_installer();
  d := tests.c4_deposer('clients', tests.c4_fichier_clients(), 'clients-1');
  return next is((d -> 'traitement' ->> 'faits')::integer, 1, 'Le relevé clients est appliqué par le module');
  return next is((select count(*)::integer from public.offload_comptes c where c.client_id = v_client and c.ref in ('C001', 'C002', 'C003')),
                 3, 'Trois comptes créés depuis le fichier clients');
  select c.id into v_c001 from public.offload_comptes c where c.client_id = v_client and c.ref = 'C001';
  return next is((select c.contact from public.offload_comptes c where c.id = v_c001), 'Martin', 'Le contact est rangé');
  return next is((select x.statut from public.instantanes x where x.id = (d ->> 'instantane')::uuid), 'applique', 'L''instantané clients est appliqué');

  v_ventes := jsonb_build_array(
    jsonb_build_object('compte_ref', 'C001', 'date', '14/03/2025', 'reference', 'F4821', 'montant', '615,00', 'libelle', 'Entretien annuel'),
    jsonb_build_object('compte_ref', 'C001', 'date', '12/09/2025', 'reference', 'F5102', 'montant', '1 234,50 €'),
    jsonb_build_object('compte_ref', 'C001', 'date', '20/09/2025', 'reference', 'AV12', 'montant', '120,00', 'nature', 'Avoir'),
    jsonb_build_object('compte_ref', 'C002', 'date', '2025-06-02', 'reference', 'F4990', 'montant', '890.00'),
    jsonb_build_object('compte_ref', 'C004', 'compte_nom', 'Transports Rival', 'date', '05/01/2026', 'reference', 'F5500', 'montant', '2 400,00'),
    jsonb_build_object('compte_ref', 'C002', 'date', 'pas de date', 'reference', 'F9999', 'montant', '50,00'),
    -- Deux lignes d'une même facture (mêmes client, date, pièce) : le lecteur suffixe la seconde clé « #n ».
    jsonb_build_object('compte_ref', 'C003', 'date', '03/02/2026', 'reference', 'F5600', 'montant', '300,00', 'libelle', 'Fenêtre'),
    jsonb_build_object('compte_ref', 'C003', 'date', '03/02/2026', 'reference', 'F5600', 'montant', '150,00', 'libelle', 'Pose'));
  d := tests.c4_deposer('ventes', v_ventes, 'ventes-1');
  return next is((d -> 'traitement' ->> 'faits')::integer, 1, 'Le relevé ventes est appliqué par le module');
  return next is((select count(*)::integer from public.offload_achats a where a.client_id = v_client), 6,
                 'Six pièces rangées : la ligne sans date est écartée, les deux lignes de F5600 font une pièce');
  return next is((select a.montant_ht from public.offload_achats a where a.compte_id = v_c001 and a.reference = 'F5102'), 1234.50::numeric(14,2),
                 '« 1 234,50 € » est lu 1234,50');
  return next is((select a.date_achat from public.offload_achats a where a.compte_id = v_c001 and a.reference = 'F4821'), date '2025-03-14',
                 '« 14/03/2025 » est lu le 14 mars 2025');
  return next is((select a.montant_ht from public.offload_achats a where a.compte_id = v_c001 and a.reference = 'AV12'), -120.00::numeric(14,2),
                 'Un avoir est rangé en négatif');
  return next is((select c.nom from public.offload_comptes c where c.client_id = v_client and c.ref = 'C004'), 'Transports Rival',
                 'Un client absent du référentiel est créé avec le nom lu dans les ventes');
  return next is((select (j.donnees #>> '{jeux,ventes,ecartees}')::integer from public.journal_opposable j
                  where j.client_id = v_client and j.action = 'offload.import_applique' order by j.id desc limit 1), 1,
                 'Le journal compte la ligne écartée');
  return next is((select a.montant_ht from public.offload_achats a where a.client_id = v_client and a.reference = 'F5600'), 450.00::numeric(14,2),
                 'Deux lignes d''une même facture font une pièce de 450 €');

  -- Le même export, rejoué dans l'autre ordre, avec un montant corrigé : rien ne double, la correction passe.
  v_ventes := jsonb_set(v_ventes, '{1,montant}', '"1 300,00"');
  select coalesce(jsonb_agg(x.value order by x.o desc), '[]'::jsonb) into v_ventes from jsonb_array_elements(v_ventes) with ordinality x(value, o);
  d := tests.c4_deposer('ventes', v_ventes, 'ventes-2');
  select count(*)::integer into n from public.offload_achats a where a.client_id = v_client;
  return next is(n, 6, 'L''export rejoué dans un autre ordre ne double rien');
  return next is((select a.montant_ht from public.offload_achats a where a.compte_id = v_c001 and a.reference = 'F5102'), 1300.00::numeric(14,2),
                 'Le montant corrigé dans le logiciel est repris');
  return next is((select (j.donnees #>> '{jeux,ventes,achats_modifies}')::integer from public.journal_opposable j
                  where j.client_id = v_client and j.action = 'offload.import_applique' order by j.id desc limit 1), 1,
                 'Une seule ligne modifiée');

  -- Un export plus court (les douze derniers mois) n'efface rien de l'historique.
  d := tests.c4_deposer('ventes', jsonb_build_array(
    jsonb_build_object('compte_ref', 'C004', 'date', '05/01/2026', 'reference', 'F5500', 'montant', '2 400,00')), 'ventes-3');
  return next is((select count(*)::integer from public.offload_achats a where a.client_id = v_client), 6,
                 'Un export partiel ajoute, il ne fait rien disparaître');
end $f$;

-- Le garde-fou : un export dont la moitié des lignes est illisible n'est pas appliqué.
create or replace function tests.test_c4_01_garde_fou() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  d jsonb;
begin
  perform tests.c4_installer();
  d := tests.c4_deposer('ventes', jsonb_build_array(
    jsonb_build_object('compte_ref', 'C001', 'date', '14/03/2025', 'reference', 'F1', 'montant', '615,00'),
    jsonb_build_object('compte_ref', 'C001', 'date', '14/03/2025', 'reference', 'F2', 'montant', 'six cents'),
    jsonb_build_object('compte_ref', 'C001', 'date', 'hier', 'reference', 'F3', 'montant', '10'),
    jsonb_build_object('compte_ref', '', 'date', '14/03/2025', 'reference', 'F4', 'montant', '10')), 'douteux-1');
  return next is((select x.statut from public.instantanes x where x.id = (d ->> 'instantane')::uuid), 'douteux',
                 'L''instantané est rendu douteux');
  return next is((select count(*)::integer from public.offload_achats a where a.client_id = v_client), 0, 'Aucun achat rangé');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'offload.import_douteux'),
                 'Le refus est au journal');
end $f$;

-- La saisie à la main, et ses garde-fous.
create or replace function tests.test_c4_01_saisie() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_gerant uuid := (banc ->> 'gerant')::uuid;
  v_lecteur uuid;
  v_compte uuid;
  v_achat uuid;
  v_avoir uuid;
begin
  perform tests.c4_installer();
  v_lecteur := tests.c4_compte(v_client, 'lecteur', 'lecteur-c4@banc-varelo.test');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_compte := public.offload_saisir_compte(v_client, null, null, 'Boulangerie Lemaire', '{"contact": "M. Lemaire", "email": "contact@lemaire.test"}');
  return next ok(v_compte is not null, 'Le gérant saisit un compte sans code : un code S-… lui est donné');
  return next ok((select c.ref like 'S-%' and c.source = 'saisie' from public.offload_comptes c where c.id = v_compte), 'Code et source de saisie');
  v_achat := public.offload_saisir_achat(v_compte, current_date - 40, 480, 'F-77', 'Pains de mie', 'facture');
  v_avoir := public.offload_saisir_achat(v_compte, current_date - 30, 30, 'AV-3', 'Retour', 'avoir');
  return next is((select a.montant_ht from public.offload_achats a where a.id = v_avoir), -30.00::numeric(14,2), 'Un avoir saisi est négatif');
  return next throws_ok(format('select public.offload_saisir_achat(%L::uuid, current_date + 3, 100)', v_compte), '22023',
                        'Un achat n''est jamais daté dans le futur');
  return next throws_ok(format('select public.offload_saisir_compte(%L::uuid, null, null, %L, %L::jsonb)', v_client, 'X', '{"prix": 3}'),
                        '22023', 'Un champ inconnu est refusé');
  return next throws_ok(format('select public.offload_annuler_achat(%L::uuid, %L)', v_achat, '  '), '22023',
                        'Une annulation dit pourquoi');
  perform public.offload_annuler_achat(v_achat, 'Saisi en double');
  return next ok((select a.annule_le is not null and a.annule_motif = 'Saisi en double' from public.offload_achats a where a.id = v_achat),
                 'L''achat est annulé, pas effacé');

  perform tests.endosser(v_lecteur, 'lecteur-c4@banc-varelo.test');
  return next is((select count(*)::integer from public.offload_achats a where a.compte_id = v_compte), 2, 'Le lecteur lit les achats de son organisation');
  return next throws_ok(format('select public.offload_saisir_achat(%L::uuid, current_date - 1, 100)', v_compte), '42501',
                        'Un lecteur ne saisit pas');
  return next throws_ok(format('insert into public.offload_achats (client_id, entite_id, compte_id, date_achat, montant_ht, source) values (%L, %L, %L, current_date, 1, %L)',
                               v_client, banc ->> 'entite', v_compte, 'saisie'), '42501',
                        'Personne n''écrit directement dans la table');
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'offload.achat_annule'
                         and j.objet_id = v_achat::text), 'L''annulation est au journal');
end $f$;

select * from runtests('tests'::name, '^test_c4_01_');
