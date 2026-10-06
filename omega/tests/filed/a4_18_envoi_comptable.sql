-- Tests A4 — lot 17 (a4_25) : les écritures partent vers Pennylane, Sage, Cegid et QuickBooks (fichiers d'import).
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_compte, tests.a4_imputer, tests.a4_comptabiliser (a4_11_ecritures_fec.sql), à poser avant.
-- `select * from runtests('tests', '^test_a4_')` ; runtests() annule tout. Données d'exemple seulement.

-- Une facture de 120 € TTC comptabilisée (6061 / 44566 / 401). Rend {piece, document, facture}.
create or replace function tests.a4_facture_comptabilisee(p_org jsonb, p_numero text) returns jsonb language plpgsql as $$
declare fa jsonb := tests.a4_facture(p_org, 'ia', p_numero, 120); v_c uuid;
begin
  select id into v_c from public.filed_plan_comptable where client_id = (p_org ->> 'client')::uuid and numero = '6061';
  perform tests.a4_imputer(fa, coalesce(v_c, tests.a4_compte(p_org, '6061', 'Fournitures non stockables')), 100);
  perform tests.a4_comptabiliser(fa);
  return fa;
end $$;

-- L'export, comme le serveur. Rend le jsonb de filed_exporter_ecritures.
create or replace function tests.a4_exporter(p_org jsonb, p_format text, p_du date default null, p_au date default null) returns jsonb
language plpgsql as $$
declare r jsonb;
begin
  set local role service_role;
  r := public.filed_exporter_ecritures((p_org ->> 'client')::uuid, (p_org ->> 'entite')::uuid, p_format, null, p_du, p_au);
  reset role;
  return r;
end $$;

-- Les lignes d'un fichier rendu (sans la dernière, vide).
create or replace function tests.a4_lignes_fichier(p jsonb, p_n integer default 0) returns text[] language sql immutable as $$
  select (string_to_array(p -> 'fichiers' -> p_n ->> 'contenu', chr(13) || chr(10)))[1:cardinality(string_to_array(p -> 'fichiers' -> p_n ->> 'contenu', chr(13) || chr(10))) - 1]
$$;

create or replace function tests.test_a4_25_01_formats() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); r jsonb; l text[]; x text;
begin
  perform tests.a4_facture_comptabilisee(o, 'ENV-001');

  r := tests.a4_exporter(o, 'pennylane', date '2000-01-01', date '2100-12-31');
  l := tests.a4_lignes_fichier(r);
  return next is(l[1], 'Date;Code journal;Numéro de compte;Libellé;Débit;Crédit;Numéro de pièce;Devise;Débit_devise_origine;Crédit_devise_origine',
                 'Pennylane : l''en-tête du modèle d''import');
  return next is(cardinality(l), 4, 'puis les trois lignes de l''écriture');
  return next ok(exists (select 1 from unnest(l) z where z like '%;HA;6061;%;100,00;0,00;ENV-001;EUR;;'), 'la charge, virgule décimale, la pièce');
  return next ok(exists (select 1 from unnest(l) z where z like '%;HA;401XML;%;0,00;120,00;ENV-001;%'), 'le fournisseur en 401 alphanumérique');
  return next ok(r -> 'fichiers' -> 0 ->> 'nom_fichier' like 'omega-ecritures-%-pennylane.csv', 'nommé .csv');
  return next ok((r ->> 'equilibre')::boolean, 'équilibré');

  r := tests.a4_exporter(o, 'sage', date '2000-01-01', date '2100-12-31');
  l := tests.a4_lignes_fichier(r);
  return next is(char_length(l[1]), 30, 'Sage : la première ligne, le nom de la société sur 30');
  return next ok((select bool_and(char_length(z) = 138) from unnest(l[2:]) z), 'des lignes de 138 caractères');
  select z into x from unnest(l[2:]) z where substr(z, 12, 13) like '401%';
  return next is(substr(x, 1, 3) || '|' || substr(x, 10, 2) || '|' || substr(x, 25, 1) || '|' || btrim(substr(x, 26, 13)) || '|' || substr(x, 84, 1) || '|' || btrim(substr(x, 85, 20)),
                 'HA |FF|X|XML|C|120.00', 'journal, type de pièce, tiers, sens et montant au point, à leur place');
  return next ok(r -> 'fichiers' -> 0 ->> 'nom_fichier' like '%.pnm', 'nommé .pnm');

  r := tests.a4_exporter(o, 'cegid', date '2000-01-01', date '2100-12-31');
  l := tests.a4_lignes_fichier(r);
  return next ok(l[1] like '***S5CLIJRLSTD%', 'Cegid : l''en-tête TRA en mode journal');
  return next ok(exists (select 1 from unnest(l) z where z like '***CAEXML%FOUX401%'), 'le compte de tiers du fournisseur');
  return next ok((select bool_and(char_length(z) = 222) from unnest(l) z where z not like '***%'), 'des mouvements de 222 caractères');
  select z into x from unnest(l) z where z not like '***%' and substr(z, 14, 17) like '401%';
  return next is(substr(x, 12, 2) || '|' || substr(x, 31, 1) || '|' || btrim(substr(x, 32, 17)) || '|' || substr(x, 130, 1) || '|'
                 || btrim(substr(x, 131, 20)) || '|' || substr(x, 151, 1) || '|' || substr(x, 173, 3),
                 'FF|X|XML|C|120,00|N|E--', 'nature, auxiliaire, sens, montant à la virgule, type et code montant à leur place');
  return next ok(r -> 'fichiers' -> 0 ->> 'nom_fichier' like '%.tra', 'nommé .tra');

  r := tests.a4_exporter(o, 'quickbooks', date '2000-01-01', date '2100-12-31');
  l := tests.a4_lignes_fichier(r);
  return next is(l[1], 'Numéro de journal,Date du journal,Nom du compte,Description,Débits,Crédits,Nom', 'QuickBooks : les colonnes de l''import');
  return next ok(exists (select 1 from unnest(l) z where z like 'HA-%,Fournisseurs,%,,120.00,Fournisseur structuré d''exemple'),
                 'la ligne fournisseur porte son nom (colonne Nom)');
  return next ok(exists (select 1 from unnest(l) z where z like 'HA-%,Fournitures non stockables,%,100.00,,'), 'le compte par son nom');
end $f$;

create or replace function tests.test_a4_25_02_curseur() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); r jsonb;
begin
  perform tests.a4_facture_comptabilisee(o, 'CUR-001');
  r := tests.a4_exporter(o, 'pennylane');
  return next is((r ->> 'ecritures')::int, 1, 'Premier envoi : l''écriture');
  return next is(r ->> 'mode', 'nouvelles', 'en mode « nouvelles »');
  r := tests.a4_exporter(o, 'pennylane');
  return next is((r ->> 'ecritures')::int, 0, 'Deuxième envoi : rien de nouveau');
  return next is(jsonb_array_length(r -> 'fichiers'), 0, 'aucun fichier');
  r := tests.a4_exporter(o, 'sage');
  return next is((r ->> 'ecritures')::int, 1, 'Le curseur est propre à chaque format');
  perform tests.a4_facture_comptabilisee(o, 'CUR-002');
  r := tests.a4_exporter(o, 'pennylane', date '2000-01-01', date '2100-12-31');
  return next is((r ->> 'ecritures')::int, 2, 'Une période reprend tout');
  r := tests.a4_exporter(o, 'pennylane');
  return next is((r ->> 'ecritures')::int, 1, 'sans avancer le curseur : la nouvelle part au prochain envoi');
  return next ok(exists (select 1 from public.journal_opposable where client_id = (o ->> 'client')::uuid and action = 'filed.envoi_comptable'), 'Au journal');
  return next is((select count(*) from public.filed_envois_comptables where client_id = (o ->> 'client')::uuid), 4::bigint, 'Quatre envois tracés');
end $f$;

create or replace function tests.test_a4_25_03_quickbooks_decoupe() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb; r jsonb; v_f public.filed_factures;
begin
  fa := tests.a4_facture_comptabilisee(o, 'QB-001');
  select * into v_f from public.filed_factures where id = (fa ->> 'facture')::uuid;
  -- 500 écritures de deux lignes de plus : 1 003 lignes en tout.
  insert into public.filed_ecritures (client_id, entite_id, exercice_id, exercice_cle, journal_code, journal_lib, ecriture_num, ecriture_date,
    compte_num, compte_lib, piece_ref, piece_date, ecriture_lib, debit, credit, valid_date, origine, facture_id, document_id)
  select e.client_id, e.entite_id, e.exercice_id, e.exercice_cle, 'OD', 'Opérations diverses', 1000 + g, e.ecriture_date,
         c.num, c.lib, 'OD-' || g, e.ecriture_date, 'Essai ' || g, case when c.d then 10 else 0 end, case when c.d then 0 else 10 end,
         current_date, 'facture', e.facture_id, e.document_id
    from (select * from public.filed_ecritures where facture_id = v_f.id limit 1) e
    cross join generate_series(1, 500) g
    cross join (values ('6061', 'Fournitures non stockables', true), ('4710', 'Compte d''attente', false)) c(num, lib, d);
  r := tests.a4_exporter(o, 'quickbooks', date '2000-01-01', date '2100-12-31');
  return next is(jsonb_array_length(r -> 'fichiers'), 2, 'QuickBooks : 1 003 lignes en deux fichiers');
  return next ok((select bool_and((f ->> 'lignes')::int < 1000) from jsonb_array_elements(r -> 'fichiers') f), 'chacun sous 1 000 lignes');
  return next is((select sum((f ->> 'lignes')::int) from jsonb_array_elements(r -> 'fichiers') f), 1003::bigint, 'aucune ligne perdue');
  return next is((select count(*) from (
                    select split_part(z, ',', 1) j from jsonb_array_elements(r -> 'fichiers') with ordinality f(x, n),
                           unnest(string_to_array(f.x ->> 'contenu', chr(13) || chr(10))) z
                     where z like 'OD-%' or z like 'HA-%' group by 1 having count(distinct f.n) > 1) s), 0::bigint,
                 'une écriture n''est jamais coupée entre deux fichiers');
end $f$;

create or replace function tests.test_a4_25_04_refus_et_droits() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation();
begin
  set local role service_role;
  return next throws_ok(format($$select public.filed_exporter_ecritures(%L, %L, 'ebp')$$, o ->> 'client', o ->> 'entite'), '22023', null, 'Format inconnu refusé');
  return next throws_ok(format($$select public.filed_exporter_ecritures(%L, %L, 'sage', null, date '2026-12-31', date '2026-01-01')$$, o ->> 'client', o ->> 'entite'),
                        '22023', null, 'Période à l''envers refusée');
  reset role;
  return next ok(not has_function_privilege('anon', 'public.filed_exporter_ecritures(uuid, uuid, text, uuid, date, date)', 'execute'), 'Fermé à anon');
  return next ok(not has_function_privilege('authenticated', 'private.filed_envoi_lignes(uuid, uuid, bigint, uuid, date, date)', 'execute'),
                 'Les lignes internes ne sont pas ouvertes aux membres');
end $f$;
