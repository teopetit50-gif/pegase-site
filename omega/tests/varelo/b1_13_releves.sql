-- b1_13 — VARELO : les exports lus d'eux-mêmes (migration b1_10_releves, après b1_04 et b1_08)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5) et b1_00_aides.sql.
-- runtests() annule tout ce que le test écrit. Motif : ^test_b1_13_
--
-- Ce que le test prouve sur la vraie base : les trente modèles passent les contrôles du socle (colonnes_valides,
-- declaration_coherente…) ; le gérant branche le logiciel d'une société par la porte public.brancher et ses cinq
-- jeux sont déclarés ; chaque jeu, tel que le lecteur d'A1 le dépose (valeurs en texte), entre dans Varelo par
-- la même porte que le dépôt à la main. La chaîne complète (fichier reçu → lu → publié → appliqué) se joue par
-- l'essai réel du coordinateur avec le lecteur d'exports.

create or replace function tests.test_b1_13_modeles() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; a uuid;
  v_br uuid;
  l text;
begin
  return next is((select count(*) from public.modeles_jeux where module = 'varelo' and version = 1), 30::bigint, 'trente modèles : six logiciels × cinq jeux');
  foreach l in array array['sage100', 'ebp', 'cegid', 'quadra', 'pennylane', 'tableur'] loop
    return next is((select array_agg(code order by code) from public.modeles_jeux where module = 'varelo' and logiciel = l),
                   array['balance_agee_clients', 'balance_agee_fournisseurs', 'balance_generale', 'clients', 'fournisseurs'], format('%s : les cinq jeux', l));
  end loop;
  return next ok(exists (select 1 from public.modeles_jeux where module = 'varelo' and code = 'fournisseurs' and (colonnes -> 'iban' ->> 'sensible')::boolean),
                 'l''IBAN est une colonne sensible : jamais recopié dans les anomalies ni les journaux');
  return next is((select count(*) from private.abonnements where evenement = 'releve.pret.varelo' and module = 'varelo' and genre = 'varelo.appliquer_releve'), 1::bigint,
                 'abonnement : releve.pret.varelo → varelo.appliquer_releve');

  b := tests.b1_preparer(3);
  v_client := (b ->> 'client')::uuid; a := (b ->> 'soc_a')::uuid;
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  v_br := public.brancher(v_client, 'varelo', 'sage100', 'exports', 'Sage 100 de la société A', a, null,
                          array['fournisseurs', 'clients', 'balance_agee_clients', 'balance_agee_fournisseurs', 'balance_generale']);
  perform tests.redevenir_admin();
  return next isnt(v_br, null::uuid, 'le gérant branche le Sage 100 de la société A');
  return next is(tests.compter('public', 'branchements_jeux', format('branchement_id = %L and actif', v_br)), 5::bigint, 'ses cinq jeux sont déclarés d''après les modèles');
  return next is((select cle from public.branchements_jeux where branchement_id = v_br and code = 'balance_generale'), array['compte'], 'la balance générale a pour clé le compte');
  perform tests.endosser((b ->> 'collab')::uuid, 'b1-collaborateur@essai.invalid');
  return next throws_like(format('select public.brancher(%L, ''varelo'', ''ebp'', ''exports'', ''EBP'', %L)', v_client, a), '%', 'un collaborateur ne branche pas un logiciel');
  perform tests.redevenir_admin();
end $f$;

create or replace function tests.test_b1_13_application() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; a uuid;
  r jsonb;
  x record;
begin
  b := tests.b1_preparer(3);
  v_client := (b ->> 'client')::uuid; a := (b ->> 'soc_a')::uuid;

  -- les lignes telles que le lecteur les dépose : clés des colonnes du jeu, valeurs en texte
  r := private.grp_appliquer_jeu(v_client, a, 'fournisseurs', jsonb_build_array(
         jsonb_build_object('code', 'F0123', 'nom', 'TRANSPORTS CARAIBES SARL', 'siren', '849300124', 'iban', 'FR76 3000 6000 0112 3456 7890 189', 'code_postal', '97122'),
         jsonb_build_object('code', 'F0200', 'nom', 'QUINCAILLERIE DU LAMENTIN')), current_date, 'export sage100 fournisseurs');
  return next ok((r ->> 'nouveaux')::integer = 2, 'le fichier des fournisseurs entre au référentiel (2 codes nouveaux)');
  return next is(tests.compter('public', 'grp_ref_codes', format('client_id = %L and entite_id = %L and nature = ''fournisseur'' and iban_empreinte is not null', v_client, a)), 1::bigint,
                 'l''IBAN n''est gardé qu''en empreinte');
  r := private.grp_appliquer_jeu(v_client, a, 'balance_agee_clients', jsonb_build_array(
         jsonb_build_object('code', 'C001', 'nom', 'HYPER CARAIBES', 'non_echu', '40 000,00', 'echu_30', '12 000', 'echu_plus', '8 000,00'),
         jsonb_build_object('code', 'C002', 'nom', 'Boulangerie du Port', 'total', '1 500,50')), current_date - 1, 'export sage100 balance_agee_clients');
  return next ok((r ->> 'retenus')::integer = 2 and (r ->> 'total')::numeric = 61500.50 and (r ->> 'codes_inscrits')::integer = 2,
                 'la balance âgée clients entre dans l''encours (61 500,50, deux codes inscrits)');
  r := private.grp_appliquer_jeu(v_client, a, 'balance_generale', jsonb_build_array(
         jsonb_build_object('compte', '706000', 'libelle', 'Prestations', 'credit', '80 000,00'),
         jsonb_build_object('compte', '512000', 'libelle', 'Banque', 'debit', '15 000,00')), current_date - 1, 'export sage100 balance_generale');
  select * into x from public.grp_groupe_page where client_id = v_client and entite_id = a;
  return next ok(x.ventes = 80000 and x.tresorerie = 15000 and x.arrete_le = current_date - 1, 'la balance générale nourrit la page du groupe');
  return next is(private.grp_appliquer_jeu(v_client, a, 'stock', '[]'::jsonb, current_date, 'x'), null::jsonb, 'un jeu inconnu de Varelo ne s''applique pas');
  return next throws_ok(format('select private.grp_appliquer_releve(%L)', jsonb_build_object('branchement', gen_random_uuid(), 'releve', gen_random_uuid())), 'P0002', null,
                        'un relevé dont le branchement est inconnu : introuvable (P0002)');
end $f$;
