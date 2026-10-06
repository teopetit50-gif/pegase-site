-- b6_02 — Les garde-fous de DALIRO (session B6, 05/10/2026) : isolement entre clients, rôles, prix cachés sans le
-- droit voir_prix, marché vérifié figé, écritures directes refusées là où une porte existe, journal par
-- private.journaliser seulement, installation réservée au serveur.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_04.
-- runtests() annule tout.

create or replace function tests.test_b6_02_garde_fous() returns setof text
language plpgsql as $f$
declare
  banc jsonb; jeu jsonb; v_client uuid; v_gerant uuid; v_daf uuid; v_collab uuid; v_autre uuid; v_autre_client uuid;
  v_mo uuid; v_ch uuid; v_entite uuid; v_lot uuid; v_m uuid; v_l uuid; v_av uuid; v_ce text; n bigint; v_j jsonb;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');
  v_collab := tests.b6_compte(v_client, 'collaborateur', 'b6-collaborateur@banc-varelo.test');
  jeu := tests.jeu();
  v_autre := (jeu ->> 'gerant_a')::uuid; v_autre_client := (jeu ->> 'client_a')::uuid;
  v_ce := tests.b6_corps(1);

  -- Un chantier du banc avec un marché vérifié et un avenant, posé par le gérant.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'Maître d''ouvrage d''essai') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier des garde-fous', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id, entite_id into v_ch, v_entite;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, corps_etat, execution) values (v_client, v_ch, '01', 'Lot unique', v_ce, 'client') returning id into v_lot;
  v_m := public.btp_ecrire_marche(null, v_ch, '{"reference": "GF-1", "mode_prix": "unitaire", "montant_ht_declare": 1000}'::jsonb);
  v_l := public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Ouvrage d''essai', 'unite', 'u', 'quantite', 10, 'prix_unitaire_ht', 100, 'montant_ht', 1000, 'lot_id', v_lot));
  perform public.btp_verifier_marche(v_m);
  v_av := public.btp_ouvrir_avenant(v_ch, 'Avenant d''essai');

  -- ── Isolement : un gérant d'un autre client ne voit rien, n'écrit rien ──
  perform tests.endosser(v_autre, 'autre@essai.invalid');
  return next is(tests.compter('public', 'btp_chantiers', format('client_id = %L', v_client)), 0::bigint, 'Isolement : un autre client ne lit aucun chantier du banc');
  return next is(tests.compter('public', 'btp_lignes_marche', format('client_id = %L', v_client)), 0::bigint, 'Isolement : ni ses lignes de marché');
  return next is(tests.compter('public', 'btp_avenants', format('client_id = %L', v_client)), 0::bigint, 'Isolement : ni ses avenants');
  return next is(tests.compter('public', 'btp_tiers', format('client_id = %L', v_client)), 0::bigint, 'Isolement : ni son annuaire');
  return next ok(public.btp_tableau_chantier(v_ch) is null, 'Isolement : le tableau du chantier est null pour lui');
  return next throws_ok(format('select public.btp_ecrire_marche(%L, null, ''{"objet": "x"}''::jsonb)', v_m), '42501', null, 'Isolement : il ne tient pas un marché du banc');
  return next throws_ok(format('select public.btp_ouvrir_avenant(%L, ''x'')', v_ch), '42501', null, 'Isolement : il n''ouvre pas d''avenant sur un chantier du banc');
  return next throws_ok(format('select public.btp_importer_passages(%L, ''tableur'', ''[]''::jsonb)', v_ch), '42501', null, 'Isolement : il n''importe pas de planning sur un chantier du banc');
  return next throws_ok(format('insert into public.btp_lots (client_id, chantier_id, code, libelle) values (%L, %L, ''99'', ''intrus'')', v_client, v_ch), '42501', null, 'Isolement : il ne pose pas de lot chez le banc');

  -- ── Rôles : le collaborateur du banc lit, sans prix, et ne tient rien ──
  perform tests.endosser(v_collab, 'b6-collaborateur@banc-varelo.test');
  return next is(tests.compter('public', 'btp_chantiers', format('id = %L', v_ch)), 1::bigint, 'Collaborateur : il voit le chantier (périmètre total)');
  return next ok(not public.btp_voit_prix(v_client), 'Collaborateur : sans le droit voir_prix (formule Chantiers)');
  return next ok((select l.prix_unitaire_ht is null and l.montant_ht is null from public.btp_lignes_marche_chiffrees l where l.id = v_l), 'Collaborateur : les lignes du marché sont lues SANS prix');
  return next ok((select m.total_ht_lignes is null from public.btp_marches_chiffres m where m.id = v_m), 'Collaborateur : le total du marché est caché');
  return next ok((select b.prix_unitaire_ht is null from public.btp_bibliotheque_chiffree b where b.client_id = v_client and b.ligne_marche_id = v_l), 'Collaborateur : la bibliothèque est lue sans prix');
  return next ok((select d.engage_marche_ht is null from public.btp_debourse_lots d where d.lot_id = v_lot), 'Collaborateur : le déboursé par lot est caché');
  return next throws_ok(format('insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client) values (%L, ''x'', ''69001'', ''Lyon'', ''particulier'', ''titulaire'')', v_client), '42501', null, 'Collaborateur : il ne crée pas de chantier');
  return next throws_ok(format('select public.btp_ecrire_ligne(null, %L, ''{"designation": "x"}''::jsonb)', v_m), '42501', null, 'Collaborateur : il ne tient pas le marché');
  return next throws_ok(format('select public.btp_poser_prix(%L, ''x'', ''u'', 1)', v_client), '42501', null, 'Collaborateur : il ne pose pas de prix');
  return next throws_ok(format('select public.btp_ouvrir_avenant(%L, ''x'')', v_ch), '42501', null, 'Collaborateur : il n''ouvre pas d''avenant');
  return next throws_ok(format('select public.btp_demander_confirmations(%L)', v_client), '42501', null, 'Collaborateur : il ne demande pas les confirmations');
  return next lives_ok(format('insert into public.btp_tiers (client_id, roles, nom) values (%L, array[''fournisseur''], ''Fournisseur posé par le collaborateur'')', v_client), 'Collaborateur : il enrichit l''annuaire (voulu par le socle)');

  -- ── Le valideur (daf) tient les marchés et les avenants, mais ne rouvre pas et n'installe pas ──
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  return next ok(public.btp_voit_prix(v_client) or not public.btp_voit_prix(v_client), 'Valideur : voit_prix selon ses droits (information)');
  return next throws_ok(format('select public.btp_rouvrir_marche(%L, ''motif'')', v_m), '42501', null, 'Valideur : il ne rouvre pas un marché vérifié (gérant seul)');
  return next throws_ok(format('select public.btp_installer(%L, ''entreprise'', 50, 10)', v_client), '42501', null, 'Valideur : il n''installe pas Daliro');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.btp_installer(%L, ''entreprise'', 50, 10)', v_client), '42501', null, 'Gérant : la façade publique btp_installer reste au serveur (service_role)');

  -- ── Le marché vérifié est figé, même pour le gérant, même en écriture directe ──
  return next throws_ok(format('update public.btp_marches set montant_ht_declare = 2 where id = %L', v_m), '42501', null, 'Gérant : pas d''UPDATE direct sur btp_marches (aucun GRANT)');
  return next throws_ok(format('update public.btp_lignes_marche set quantite = 2 where id = %L', v_l), '42501', null, 'Gérant : pas d''UPDATE direct sur btp_lignes_marche');
  return next throws_ok(format('insert into public.btp_marches (client_id, chantier_id, mode_prix) values (%L, %L, ''forfait'')', v_client, v_ch), '42501', null, 'Gérant : pas d''INSERT direct dans btp_marches (porte btp_ecrire_marche)');
  return next throws_ok(format('insert into public.btp_avenants (client_id, chantier_id, numero, objet) values (%L, %L, 9, ''x'')', v_client, v_ch), '42501', null, 'Gérant : pas d''INSERT direct dans btp_avenants (porte btp_ouvrir_avenant)');
  return next throws_ok(format('update public.btp_avenants set statut = ''signe'', signe_le = current_date where id = %L', v_av), '42501', null, 'Gérant : pas d''UPDATE direct d''un avenant');
  return next throws_ok(format('insert into public.btp_bibliotheque_prix (client_id, designation, unite, prix_unitaire_ht, origine) values (%L, ''x'', ''u'', 1, ''saisie'')', v_client), '42501', null, 'Gérant : pas d''INSERT direct dans la bibliothèque (porte btp_poser_prix)');
  return next throws_ok(format('insert into public.btp_factures_chantier (client_id, facture_id, chantier_id) values (%L, gen_random_uuid(), %L)', v_client, v_ch), '42501', null, 'Gérant : pas d''INSERT direct dans btp_factures_chantier (porte btp_rattacher_facture)');
  return next throws_ok(format('insert into public.btp_confirmations (client_id, passage_id, chantier_id, entite_id, evenement, cle) values (%L, gen_random_uuid(), %L, %L, ''confirmee'', ''x'')', v_client, v_ch, v_entite), '42501', null, 'Gérant : pas d''INSERT direct dans btp_confirmations');
  return next throws_ok(format('insert into public.btp_reglages (client_id, formule) values (%L, ''demarrage'')', v_client), '42501', null, 'Gérant : pas d''INSERT direct dans btp_reglages');

  -- ── Le journal : seulement par private.journaliser ──
  return next throws_ok(format('insert into public.journal_opposable (client_id, action, objet_type, objet_id, donnees) values (%L, ''daliro.faux'', ''x'', ''x'', ''{}'')', v_client), null, null, 'Gérant : pas d''écriture directe au journal opposable');
  perform tests.redevenir_admin();
  select count(*) into n from public.journal_opposable j where j.client_id = v_client and j.action in ('daliro.marche_verifie', 'daliro.avenant_ouvert', 'daliro.installe') and j.objet_id in (v_m::text, v_av::text) or (j.client_id = v_client and j.action = 'daliro.installe');
  return next ok(n >= 3, format('Journal : installation, marché vérifié et avenant ouvert y sont (%s lignes), écrits par les portes', n));
  -- (postgres = le serveur d'Omega, règle du socle : une porte privée appelée par lui passe ; pas d'attente de refus ici.)

  -- ── Le quota de la formule ──
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'demarrage');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  for n in 1..4 loop
    insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
    values (v_client, 'Chantier quota ' || n, '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert');
  end loop;
  return next throws_ok(format('insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut) values (%L, ''Sixième'', ''69100'', ''Villeurbanne'', ''professionnel'', ''titulaire'', %L, ''ouvert'')', v_client, v_mo),
                        'P0001', null, 'Quota : la formule Démarrage ne suit que cinq chantiers ouverts à la fois');
  perform tests.redevenir_admin();
  return next throws_ok(format('select public.btp_installer(%L, ''demarrage'', 3, 2)', v_client), '23514', null, 'Formule : des quotas qui contredisent Démarrage sont refusés');
end $f$;

select * from runtests('tests'::name, '^test_b6_02_');
