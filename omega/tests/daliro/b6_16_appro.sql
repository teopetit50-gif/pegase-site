-- b6_16 — DALIRO : l'approvisionnement — commandes, délais, livraisons (session B6, 06/10/2026), b6_22.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_22.
-- runtests() annule tout.
--
-- Un passage « Pose des menuiseries » dans 30 jours ; des fenêtres à 15 jours ouvrés de délai, des volets à 40,
-- de la quincaillerie à commander vite. Les dates attendues sont calculées avec public.ajouter_jours, comme la porte.

-- Les échéances se lisent par une fonction réservée au serveur ; le test, qui endosse des comptes, passe par cette
-- passerelle du schéma tests (security definer).
create or replace function tests.b6_echeances(p_commande uuid, p_jour date) returns jsonb
language sql security definer set search_path to '' as $$ select private.btp_echeances_commande(p_commande, p_jour) $$;

create or replace function tests.test_b6_16_appro() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_collab uuid;
  v_mo uuid; v_four uuid; v_ch uuid; v_lot uuid; v_p uuid; v_k1 uuid; v_k2 uuid; v_k3 uuid;
  v_j date := (now() at time zone 'Europe/Paris')::date;
  v_livrer date; v_e jsonb; v_lignes jsonb;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');
  v_collab := tests.b6_compte(v_client, 'collaborateur', 'b6-appro-collab@banc-varelo.test');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO de l''appro') returning id into v_mo;
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['fournisseur'], 'Menuiseries de l''appro') returning id into v_four;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier de l''appro', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch, '01', 'Lot de l''appro', 'client') returning id into v_lot;
  insert into public.btp_passages (client_id, chantier_id, lot_id, tache, debut, fin)
  values (v_client, v_ch, v_lot, 'Pose des menuiseries', v_j + 30, v_j + 34) returning id into v_p;
  v_livrer := public.ajouter_jours(v_j + 30, -1, 'ouvres', 'metropole');

  -- ── Les droits ──
  return next ok(not has_table_privilege('authenticated', 'public.btp_commandes', 'insert'), 'Les commandes ne s''écrivent que par les portes');
  return next ok(not has_function_privilege('anon', 'public.btp_ecrire_commande(uuid, uuid, jsonb)', 'execute'), 'anon ne commande pas');

  -- ── Ouvrir des commandes ──
  return next throws_ok(format('select public.btp_ecrire_commande(null, %L, ''{"objet": "  ", "fournisseur_libelle": "X"}'')', v_ch), '22023', null, 'Sans objet : refusé');
  return next throws_ok(format('select public.btp_ecrire_commande(null, %L, %L)', v_ch, jsonb_build_object('objet', 'X', 'fournisseur_id', v_mo)), '22023', null,
                        'Un maître d''ouvrage n''est pas un fournisseur');
  v_k1 := public.btp_ecrire_commande(null, v_ch, jsonb_build_object('objet', 'Fenêtres sur mesure', 'quantite_texte', '14 châssis', 'fournisseur_id', v_four,
                                                                   'delai_jours', 15, 'passage_id', v_p, 'lot_id', v_lot));
  v_e := tests.b6_echeances(v_k1, v_j);
  return next is(v_e ->> 'livrer_avant', v_livrer::text, 'Livrer avant : le jour ouvré qui précède le passage');
  return next is(v_e ->> 'commander_avant', public.ajouter_jours(v_livrer, -15, 'ouvres', 'metropole')::text, 'Commander avant : moins les 15 jours ouvrés du fournisseur');
  return next is(v_e ->> 'etat', 'a_commander', 'Il reste du temps : à commander');

  perform tests.endosser(v_collab, 'b6-appro-collab@banc-varelo.test');
  v_k2 := public.btp_ecrire_commande(null, v_ch, jsonb_build_object('objet', 'Volets roulants', 'fournisseur_libelle', 'Volets de l''appro', 'delai_jours', 40, 'passage_id', v_p));
  return next is(tests.b6_echeances(v_k2, v_j) ->> 'etat', 'commande_en_retard', 'Le conducteur (collaborateur) commande ; 40 jours de délai : déjà en retard');
  v_k3 := public.btp_ecrire_commande(null, v_ch, jsonb_build_object('objet', 'Quincaillerie', 'fournisseur_libelle', 'Quincaillerie de l''appro', 'delai_jours', 0, 'besoin_le', v_j + 2));
  return next ok(tests.b6_echeances(v_k3, v_j) ->> 'etat' in ('a_commander_vite', 'commande_en_retard'), 'Besoin dans deux jours : à commander vite');

  -- ── Le point du matin ──
  perform tests.redevenir_admin();
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_lignes from jsonb_array_elements(private.btp_point_matin_lignes(v_client, v_j)) x
  where x ->> 'texte' like 'Chantier de l''appro : %';
  return next ok(exists (select 1 from jsonb_array_elements(v_lignes) x where x ->> 'texte' like '%« Volets roulants » chez Volets de l''appro devait être commandé avant le % — commandez aujourd''hui ou recalez le passage'
                                                                       and x ->> 'gravite' = 'attention'), 'Le point du matin : la commande en retard');
  return next ok(not exists (select 1 from jsonb_array_elements(v_lignes) x where x ->> 'texte' like '%Fenêtres%'), 'Rien sur les fenêtres : il reste du temps');

  -- ── Commander, recevoir ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.btp_noter_commande(%L, %L)', v_k1, v_j - 1), '22023', null, 'Une livraison promise avant la commande est refusée');
  return next is(public.btp_noter_commande(v_k1, v_livrer + 3, v_j, 'CDE-118') ->> 'etat', 'livraison_tardive', 'Promise après le jour où il les faut : livraison tardive');
  return next is(public.btp_noter_commande(v_k1, v_livrer - 2, v_j) ->> 'etat', 'commandee', 'Promise à temps : commandée');
  return next is(tests.b6_echeances(v_k1, v_livrer) ->> 'etat', 'livraison_attendue', 'La date promise passée sans réception : livraison attendue');
  return next throws_ok(format('select public.btp_noter_livraison(%L, %L)', v_k1, v_j + 1), '22023', null, 'Une livraison ne se note pas dans le futur');
  return next is(public.btp_noter_livraison(v_k1, v_j, false, '10 châssis sur 14') ->> 'etat', 'livree_partielle', 'Livraison partielle');
  return next is(public.btp_noter_livraison(v_k1, v_j) ->> 'etat', 'livree', 'Le reste arrive : livrée');

  -- ── Le besoin suit le passage (et donc ses recalages, b6_19) ──
  return next is(tests.b6_echeances(v_k2, v_j) ->> 'besoin_le', (select p.debut::text from public.btp_passages p where p.id = v_p), 'Le besoin est le début du passage');

  -- ── Annuler ──
  return next throws_ok(format('select public.btp_annuler_commande(%L, '''')', v_k3), '22023', null, 'Une annulation sans motif est refusée');
  perform public.btp_annuler_commande(v_k3, 'Prise au dépôt');
  return next is((select k.statut from public.btp_commandes k where k.id = v_k3), 'annulee', 'Annulée avec son motif');
  return next is(jsonb_array_length(public.btp_appro_chantier(v_ch) -> 'commandes'), 3, 'L''écran lit les trois commandes');
  perform tests.redevenir_admin();
  return next ok(tests.b6_journal(v_client, 'daliro.commande_livree', v_k1::text) is not null, 'Les livraisons sont au journal');
end $f$;

select * from runtests('tests'::name, '^test_b6_16_');
