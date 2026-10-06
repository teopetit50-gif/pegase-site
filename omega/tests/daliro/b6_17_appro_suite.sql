-- b6_17 — DALIRO : liste cadencée depuis le devis, livraisons calées, bons de livraison rapprochés, retours
-- (session B6, 06/10/2026), b6_23. Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les
-- migrations b6_01 à b6_23. runtests() annule tout.
--
-- Un marché vérifié : 14 fenêtres (u), 40 m² d'isolant, 10 h de main-d'œuvre (pas une matière) ; un passage « Pose »
-- dans 30 jours sur le lot. La liste en tire deux commandes ; les fenêtres arrivent en deux bons (10 puis 5 : un
-- manquant puis un excédent) ; une nacelle louée doit repartir.

create or replace function tests.b6_echeances_suite(p_commande uuid, p_jour date) returns jsonb
language sql security definer set search_path to '' as $$ select private.btp_echeances_commande(p_commande, p_jour) $$;

create or replace function tests.test_b6_17_appro_suite() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid;
  v_mo uuid; v_ch uuid; v_lot uuid; v_m uuid; v_p uuid; v_fen uuid; v_nac uuid;
  v_j date := (now() at time zone 'Europe/Paris')::date;
  v_r jsonb; v_lignes jsonb;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO de la liste') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier de la liste', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch, '01', 'Lot de la liste', 'client') returning id into v_lot;
  insert into public.btp_passages (client_id, chantier_id, lot_id, tache, debut, fin)
  values (v_client, v_ch, v_lot, 'Pose de la liste', v_j + 30, v_j + 34) returning id into v_p;

  return next throws_ok(format('select public.btp_preparer_liste(%L)', v_ch), '23514', null, 'Sans marché vérifié, pas de liste');
  v_m := public.btp_ecrire_marche(null, v_ch, jsonb_build_object('reference', 'LIS-1', 'mode_prix', 'unitaire', 'montant_ht_declare', 13300, 'retenue_taux', 0));
  perform public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Fenêtre PVC 120x135 (liste)', 'unite_lue', 'u', 'nature', 'fourniture',
                                                                'quantite', 14, 'prix_unitaire_ht', 600, 'montant_ht', 8400, 'lot_id', v_lot));
  perform public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Isolant laine de bois (liste)', 'unite_lue', 'm2', 'nature', 'ouvrage',
                                                                'quantite', 40, 'prix_unitaire_ht', 35, 'montant_ht', 1400, 'lot_id', v_lot));
  perform public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Main-d''œuvre de pose (liste)', 'unite_lue', 'h', 'nature', 'ouvrage',
                                                                'quantite', 100, 'prix_unitaire_ht', 35, 'montant_ht', 3500, 'lot_id', v_lot));
  perform public.btp_verifier_marche(v_m);

  -- ── La liste cadencée depuis le devis ──
  v_r := public.btp_preparer_liste(v_ch);
  return next is(v_r ->> 'creees', '2', 'Deux commandes tirées du devis (les heures ne sont pas une matière)');
  return next is((public.btp_preparer_liste(v_ch) ->> 'deja')::int, 2, 'Rejouer ne double rien');
  select k.id into v_fen from public.btp_commandes k where k.chantier_id = v_ch and k.objet = 'Fenêtre PVC 120x135 (liste)';
  return next is((select k.quantite_texte || '/' || k.passage_id::text from public.btp_commandes k where k.id = v_fen), '14 u/' || v_p::text,
                 'Quantité du devis, passage du planning');
  return next is((select k.quantite_texte from public.btp_commandes k where k.chantier_id = v_ch and k.objet like 'Isolant%'), '40 m²', 'Les m² s''écrivent m²');

  -- ── Commander : le fournisseur est exigé à ce moment ──
  return next throws_ok(format('select public.btp_noter_commande(%L, %L)', v_fen, v_j + 10), '22023', null, 'Sans fournisseur, on ne commande pas');
  perform public.btp_ecrire_commande(v_fen, null, jsonb_build_object('fournisseur_libelle', 'Menuiseries de la liste', 'delai_jours', 15));
  return next is(public.btp_noter_commande(v_fen, v_j + 5, v_j) ->> 'etat', 'livraison_trop_tot', 'Livrée trois semaines avant la pose : trop tôt (stockage sur site)');
  v_r := public.btp_noter_commande(v_fen, (tests.b6_echeances_suite(v_fen, v_j) ->> 'livrer_le')::date, v_j);
  return next is(v_r ->> 'etat', 'commandee', 'Livrée la veille ouvrée de la pose : calée');

  -- ── Les bons de livraison rapprochés ──
  v_r := public.btp_recevoir(v_fen, v_j, 10, 'BL-LISTE-1');
  return next is(v_r ->> 'rapprochement' || '/' || (v_r ->> 'etat'), 'manquant/livree_partielle', 'Premier bon : 10 sur 14, il en manque');
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from jsonb_array_elements(private.btp_point_matin_lignes(v_client, v_j)) x
                         where x ->> 'texte' like 'Chantier de la liste : « Fenêtre PVC 120x135 (liste) » chez Menuiseries de la liste — il manque 4 u au bon de livraison : relancez'),
                 'Le point du matin : il manque 4 fenêtres');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_r := public.btp_recevoir(v_fen, v_j, 5, 'BL-LISTE-2');
  return next is(v_r ->> 'rapprochement' || '/' || (v_r ->> 'etat') || '/' || (v_r ->> 'ecart')::numeric, 'excedent/livree/1.000', 'Second bon : 15 pour 14, un en trop');
  return next is((select count(*)::int from public.btp_livraisons l where l.commande_id = v_fen), 2, 'Les deux bons sont gardés');

  -- ── Le matériel à rendre ──
  v_nac := public.btp_ecrire_commande(null, v_ch, jsonb_build_object('objet', 'Nacelle 12 m (liste)', 'fournisseur_libelle', 'Loueur de la liste',
                                                                    'delai_jours', 1, 'passage_id', v_p, 'a_retourner', true));
  return next is(tests.b6_echeances_suite(v_nac, v_j) ->> 'retour_prevu', public.ajouter_jours(v_j + 34, 1, 'ouvres', 'metropole')::text,
                 'À rendre le jour ouvré qui suit la fin du passage');
  perform public.btp_noter_commande(v_nac, v_j, v_j);
  perform public.btp_recevoir(v_nac, v_j);
  perform public.btp_noter_retour(v_nac, null, v_j - 1);
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from jsonb_array_elements(private.btp_point_matin_lignes(v_client, v_j)) x
                         where x ->> 'texte' like 'Chantier de la liste : « Nacelle 12 m (liste) » (Loueur de la liste) devait repartir le % et reste sur le chantier — rendez-le, chaque jour se paie'),
                 'Le point du matin relance la nacelle à rendre');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.btp_noter_retour(%L, %L)', v_nac, v_j + 1), '22023', null, 'Un retour ne se note pas dans le futur');
  return next is(public.btp_noter_retour(v_nac, v_j) ->> 'retour', 'rendu', 'Rendue');
  perform tests.redevenir_admin();
  return next ok(tests.b6_journal(v_client, 'daliro.materiel_rendu', v_nac::text) is not null, 'Le retour est au journal');
end $f$;

select * from runtests('tests'::name, '^test_b6_17_');
