-- b6_01 — Le parcours réel d'une entreprise du bâtiment dans DALIRO, de bout en bout (session B6, 05/10/2026).
-- Atelier Bertin (joué par le client du banc) : chantier Résidence Les Tilleuls, marché, lignes et écart
-- accepté, vérification, bibliothèque de prix, planning importé, dépendances, acceptation du sous-traitant,
-- confirmation à J-2 et remplaçants, avenant chiffré et signé par la file de validation du socle, facture
-- fournisseur rattachée au lot, réouverture du marché, tableau du chantier.
-- Tout passe par les PORTES PUBLIQUES et les écritures autorisées par la RLS ; jamais d'écriture directe
-- dans une table qui a une porte. Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql
-- et les migrations b6_01 à b6_04. runtests() annule tout.

create or replace function tests.test_b6_01_parcours() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_referent uuid; v_daf uuid;
  v_mo uuid; v_dumont uuid; v_rochat uuid; v_fourn uuid; v_equipe uuid;
  v_ch uuid; v_entite uuid; v_territoire text;
  v_lot1 uuid; v_lot2 uuid; v_lot3 uuid; v_ce1 text; v_ce2 text; v_ce3 text;
  v_m uuid; v_l1 uuid; v_l2 uuid; v_l3 uuid; v_l4 uuid; v_l5 uuid; v_l6 uuid;
  v_j jsonb; v_n integer; v_txt text; v_prix142 uuid; v_prixh uuid; v_prix_propose uuid;
  v_j2 date; v_p1 uuid; v_p2 uuid; v_p3 uuid; v_p4 uuid; v_p5 uuid; v_p7 uuid;
  v_acc uuid; v_av uuid; v_la uuid; v_lb uuid; v_dem uuid;
  v_four_filed uuid; v_four_autre uuid; v_piece uuid; v_doc uuid; v_fact uuid; v_fact2 uuid; v_ratt uuid;
  r record;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  v_referent := (banc ->> 'referent')::uuid; v_daf := (banc ->> 'daf')::uuid;
  return next ok(v_gerant is not null and v_daf is not null, 'Le banc a un gérant et un valideur (daf)');

  -- ── 1. Omega installe Daliro, formule Chantiers (serveur) ──
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');
  return next is((select r.quota_chantiers || '/' || r.quota_comptes_bureau from public.btp_reglages r where r.client_id = v_client),
                 '20/5', '1. Formule Chantiers : 20 chantiers, 5 comptes bureau');
  return next ok(tests.b6_journal(v_client, 'daliro.installe') is not null, '1. L''installation est au journal');

  -- ── 2. Le gérant pose l'annuaire ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_ce1 := tests.b6_corps(1); v_ce2 := tests.b6_corps(2); v_ce3 := tests.b6_corps(3);
  insert into public.btp_tiers (client_id, roles, nom, siren, contact_nom, email, canal, adresse, code_postal, commune)
  values (v_client, array['maitre_ouvrage'], 'SCI Lefèvre Patrimoine', '732829320', 'Hélène Lefèvre', 'contact@lefevre-patrimoine.test', 'email',
          '14 rue des Tilleuls', '69100', 'Villeurbanne') returning id into v_mo;
  insert into public.btp_tiers (client_id, roles, nom, siren, siret, telephone, email, canal, code_postal, commune, corps_etat, departements,
                                vigilance_attestation_le)
  values (v_client, array['sous_traitant'], 'Serrurerie Dumont', '552100554', '55210055400013', '+33612345601', 'contact@dumont.test', 'whatsapp',
          '69007', 'Lyon', array[v_ce2], array['69', '01'], current_date - 20) returning id into v_dumont;
  insert into public.btp_tiers (client_id, roles, nom, siren, telephone, canal, code_postal, commune, corps_etat, departements,
                                vigilance_attestation_le, vigilance_verifiee_le)
  values (v_client, array['sous_traitant'], 'Métallerie Rochat', '542107651', '+33612345602', 'sms', '69300', 'Caluire-et-Cuire',
          array[v_ce2], array['69'], current_date - 15, now()) returning id into v_rochat;
  insert into public.btp_tiers (client_id, roles, nom, siren, email, canal)
  values (v_client, array['fournisseur'], 'Menuiseries Rhône-Alpes', '775665011', 'commandes@mra.test', 'email') returning id into v_fourn;
  insert into public.btp_equipes (client_id, nom) values (v_client, 'Pose A') returning id into v_equipe;
  return next is((select public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le) from public.btp_tiers t where t.id = v_dumont),
                 'a_verifier', '2. Dumont : attestation reçue, pas encore vérifiée auprès de l''Urssaf');
  update public.btp_tiers set vigilance_verifiee_le = now() where id = v_dumont;
  return next is((select public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le) from public.btp_tiers t where t.id = v_dumont),
                 'a_jour', '2. Dumont : vigilance à jour après vérification');
  return next throws_ok(format('insert into public.btp_tiers (client_id, roles, nom, telephone) values (%L, array[''sous_traitant''], ''Doublon'', ''+33612345601'')', v_client),
                        '23505', null, '2. Un numéro de téléphone ne désigne qu''une personne de l''annuaire');
  return next throws_ok(format('insert into public.btp_tiers (client_id, roles, nom, siren) values (%L, array[''sous_traitant''], ''Faux SIREN'', ''123456789'')', v_client),
                        '23514', null, '2. Un SIREN qui ne passe pas Luhn est refusé');

  -- ── 3. Le chantier ──
  insert into public.btp_chantiers (client_id, nom, reference, adresse, code_postal, commune, maitre_ouvrage_type, place_client, conducteur_id, date_debut, date_fin_prevue)
  values (v_client, 'Résidence Les Tilleuls', 'TIL-2026', '14 rue des Tilleuls', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_referent,
          current_date, current_date + 120)
  returning id, entite_id, territoire into v_ch, v_entite, v_territoire;
  return next is((select c.departement || '/' || c.territoire || '/' || c.zone_tva || '/' || c.regime_tva from public.btp_chantiers c where c.id = v_ch),
                 '69/metropole/metropole/normal', '3. Département, territoire, zone et régime de TVA déduits du code postal');
  return next is((select e.type from public.entites e where e.id = v_entite), 'site', '3. Une entité « site » est créée pour le chantier');
  return next ok(exists (select 1 from public.btp_controle k where k.chantier_id = v_ch and k.code = 'chantier_sans_lots'), '3. Contrôle : « aucun lot »');
  return next ok(exists (select 1 from public.btp_controle k where k.chantier_id = v_ch and k.code = 'chantier_sans_maitre_ouvrage' and k.gravite = 'bloquant'),
                 '3. Contrôle bloquant : « aucun maître d''ouvrage »');

  -- ── 4. Trois lots, puis l'ouverture ──
  insert into public.btp_lots (client_id, chantier_id, code, libelle, corps_etat, rang, execution, equipe_id)
  values (v_client, v_ch, '01', 'Menuiseries extérieures', v_ce1, 1, 'client', v_equipe) returning id into v_lot1;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, corps_etat, rang, execution, tiers_id)
  values (v_client, v_ch, '02', 'Garde-corps', v_ce2, 2, 'sous_traitant', v_dumont) returning id into v_lot2;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, corps_etat, rang, execution)
  values (v_client, v_ch, '03', 'Peinture des menuiseries', v_ce3, 3, 'autre_titulaire') returning id into v_lot3;
  return next throws_ok(format('insert into public.btp_lots (client_id, chantier_id, code, libelle, execution, tiers_id) values (%L, %L, ''04'', ''Mauvais rôle'', ''sous_traitant'', %L)', v_client, v_ch, v_fourn),
                        '23514', null, '4. Un lot sous-traité exige un tiers qui a le rôle sous_traitant');
  return next throws_ok(format('update public.btp_chantiers set statut = ''ouvert'' where id = %L', v_ch),
                        '23514', null, '4. Ouverture refusée sans maître d''ouvrage');
  update public.btp_chantiers set maitre_ouvrage_id = v_mo, statut = 'ouvert' where id = v_ch;
  return next is((select c.statut from public.btp_chantiers c where c.id = v_ch), 'ouvert', '4. Le chantier est ouvert');
  return next ok((select c.ouvert_le from public.btp_chantiers c where c.id = v_ch) is not null, '4. ouvert_le est posé');
  return next ok(exists (select 1 from public.btp_controle k where k.chantier_id = v_ch and k.code = 'sous_traitant_non_accepte' and k.objet_id = v_lot2),
                 '4. Contrôle : Dumont n''est pas encore accepté par le maître d''ouvrage (loi 75-1334)');
  return next ok(exists (select 1 from public.btp_controle k where k.chantier_id = v_ch and k.code = 'lot_sans_executant' and k.objet_id = v_lot3),
                 '4. Contrôle : le lot 03 n''a pas d''exécutant désigné');
  return next ok(exists (select 1 from public.btp_controle k where k.chantier_id = v_ch and k.code = 'chantier_sans_marche_verifie'),
                 '4. Contrôle : aucun marché vérifié');

  -- ── 5. Le marché signé ──
  v_m := public.btp_ecrire_marche(null, v_ch, jsonb_build_object('reference', 'M-2026-014', 'objet', 'Menuiseries extérieures et garde-corps, 12 logements',
                                                                 'date_signature', current_date - 30, 'mode_prix', 'forfait', 'montant_ht_declare', 90625,
                                                                 'retenue_taux', 0.05, 'retenue_base', 'ht'));
  return next is((select m.statut from public.btp_marches m where m.id = v_m), 'a_verifier', '5. Le marché naît « à vérifier »');
  return next ok(exists (select 1 from public.btp_controle k where k.chantier_id = v_ch and k.code = 'marche_a_verifier' and k.gravite = 'bloquant'),
                 '5. Contrôle bloquant : marché à vérifier');
  return next throws_ok(format('select public.btp_ecrire_marche(%L, null, ''{"source": "pdf"}''::jsonb)', v_m), '22023', null, '5. La source d''un marché ne change pas');

  -- ── 6. Les lignes du devis ──
  v_l1 := public.btp_ecrire_ligne(null, v_m, jsonb_build_object('numero', '1.1', 'designation', 'Fenêtre bois-alu un vantail, vitrage 4/16/4', 'unite_lue', 'U', 'quantite', 24, 'prix_unitaire_ht', 1180, 'montant_ht', 28320, 'lot_id', v_lot1));
  v_l2 := public.btp_ecrire_ligne(null, v_m, jsonb_build_object('numero', '1.2', 'designation', 'Porte d''entrée palière, bloc-porte acier', 'unite_lue', 'u', 'quantite', 12, 'prix_unitaire_ht', 2350, 'montant_ht', 28200, 'lot_id', v_lot1));
  v_l3 := public.btp_ecrire_ligne(null, v_m, jsonb_build_object('numero', '2.1', 'designation', 'Garde-corps acier laqué, hauteur 1,00 m', 'unite_lue', 'ml', 'quantite', 160, 'prix_unitaire_ht', 142, 'montant_ht', 22720, 'lot_id', v_lot2));
  v_l4 := public.btp_ecrire_ligne(null, v_m, jsonb_build_object('numero', '2.2', 'designation', 'Main courante inox brossé', 'unite_lue', 'mètre linéaire', 'quantite', 60, 'prix_unitaire_ht', 23, 'montant_ht', 1300, 'lot_id', v_lot2));
  v_l5 := public.btp_ecrire_ligne(null, v_m, jsonb_build_object('numero', '3.1', 'designation', 'Peinture des menuiseries, deux couches', 'unite_lue', 'm²', 'quantite', 410, 'prix_unitaire_ht', 18.5, 'montant_ht', 7585, 'lot_id', v_lot3));
  v_l6 := public.btp_ecrire_ligne(null, v_m, jsonb_build_object('numero', '0.1', 'designation', 'Installation de chantier', 'unite_lue', 'forfait', 'nature', 'forfait', 'montant_ht', 2500));
  return next is((select l.unite from public.btp_lignes_marche l where l.id = v_l4), 'ml', '6. « mètre linéaire » est lu comme ml');
  return next is((select l.unite from public.btp_lignes_marche l where l.id = v_l5), 'm2', '6. « m² » est lu comme m2');
  return next is((select l.controle from public.btp_lignes_marche l where l.id = v_l4), 'montant_faux', '6. Ligne 2.2 : 60 × 23 ≠ 1 300, montant faux');
  return next is((select l.controle from public.btp_lignes_marche l where l.id = v_l6), 'ok', '6. Un forfait sans quantité est complet');
  return next ok(exists (select 1 from public.btp_controle_marches k where k.marche_id = v_m and k.ligne_id = v_l6 and k.code = 'sans_lot' and k.bloquant),
                 '6. Contrôle du marché : la ligne 0.1 est sans lot');
  return next is((select (l.lu ->> 'unite') from public.btp_lignes_marche l where l.id = v_l5), 'm²', '6. La saisie d''origine est gardée dans « lu »');
  return next throws_ok(format('select public.btp_ecrire_ligne(null, %L, ''{"designation": "x", "couleur": "bleu"}''::jsonb)', v_m), '22023', null, '6. Un champ inconnu est refusé');

  -- ── 7. Vérifier : refusé, avec les raisons ──
  return next throws_like(format('select public.btp_verifier_marche(%L)', v_m), '%montant n''est pas quantité × prix%sans lot%', '7. Vérification refusée : montant faux et ligne sans lot');

  -- ── 8. L'écart accepté, la ligne rattachée ──
  return next throws_ok(format('select public.btp_accepter_ecart(%L, '''')', v_l4), '22023', null, '8. Un écart s''accepte avec son motif');
  return next throws_ok(format('select public.btp_accepter_ecart(%L, ''x'')', v_l3), '22023', null, '8. Une ligne juste n''a pas d''écart à accepter');
  perform public.btp_accepter_ecart(v_l4, 'Remise négociée de 80 € sur la main courante, voir courriel du 12/09');
  return next ok((select l.ecart_accepte and l.ecart_motif like 'Remise négociée%' from public.btp_lignes_marche l where l.id = v_l4), '8. Écart accepté, motif gardé');
  return next ok(tests.b6_journal(v_client, 'daliro.ecart_accepte', v_l4::text) is not null, '8. Journal : daliro.ecart_accepte');
  perform public.btp_ecrire_ligne(v_l6, null, jsonb_build_object('lot_id', v_lot1));
  return next is((select l.lot_id from public.btp_lignes_marche l where l.id = v_l6), v_lot1, '8. La ligne 0.1 est rattachée au lot 01');
  perform public.btp_ecrire_ligne(v_l2, null, jsonb_build_object('designation', 'Porte d''entrée palière, bloc-porte acier, serrure 3 points'));
  return next ok((select l.corrigee from public.btp_lignes_marche l where l.id = v_l2), '8. Une désignation corrigée marque la ligne « corrigée »');
  return next ok((tests.b6_journal(v_client, 'daliro.ligne_corrigee', v_l2::text) -> 'donnees' -> 'modifications') ? 'designation', '8. Journal : daliro.ligne_corrigee avec le champ modifié');
  return next is((select count(*)::int from public.btp_controle_marches k where k.marche_id = v_m and k.bloquant), 0, '8. Plus aucun contrôle bloquant sur le marché');

  -- ── 9. Vérifier : passe ; le marché est figé ; la bibliothèque apprend ──
  v_j := public.btp_verifier_marche(v_m);
  return next is((v_j ->> 'lignes')::int, 6, '9. Marché vérifié : 6 lignes');
  return next is((v_j ->> 'corrigees')::int, 1, '9. Une ligne corrigée');
  return next is((v_j ->> 'prix_proposes')::int, 5, '9. Cinq prix proposés à la bibliothèque (ouvrages et fournitures avec unité et prix)');
  return next is((select m.statut from public.btp_marches m where m.id = v_m), 'verifie', '9. Statut vérifié');
  return next ok((select m.verifie_par = v_gerant from public.btp_marches m where m.id = v_m), '9. verifie_par = le gérant');
  return next throws_ok(format('select public.btp_ecrire_ligne(%L, null, ''{"quantite": 25}''::jsonb)', v_l1), '42501', null, '9. Une ligne d''un marché vérifié ne change plus');
  return next throws_ok(format('select public.btp_retirer_ligne(%L)', v_l1), '42501', null, '9. Une ligne d''un marché vérifié ne se retire pas');
  return next throws_ok(format('select public.btp_ecrire_marche(%L, null, ''{"montant_ht_declare": 1}''::jsonb)', v_m), '42501', null, '9. Un marché vérifié est figé');
  return next ok(not exists (select 1 from public.btp_controle k where k.chantier_id = v_ch and k.code in ('marche_a_verifier', 'chantier_sans_marche_verifie')),
                 '9. Les contrôles « marché à vérifier » et « sans marché vérifié » ont disparu');
  return next ok(tests.b6_journal(v_client, 'daliro.marche_verifie', v_m::text) is not null, '9. Journal : daliro.marche_verifie');
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from public.travaux t where t.client_id = v_client and t.cle = v_m::text) or not exists (select 1 from private.abonnements a where a.evenement = 'daliro.marche_verifie'),
                 '9. L''événement daliro.marche_verifie est publié (ou personne n''y est abonné)');
  return next is((select m.total_ht_lignes from public.btp_marches_chiffres m where m.id = v_m), 90625::numeric, '9. Total des lignes = 90 625 € HT (serveur)');

  -- ── 10. La bibliothèque : le referent valide, le gérant pose ──
  select b.id into v_prix142 from public.btp_bibliotheque_prix b where b.client_id = v_client and b.ligne_marche_id = v_l3;
  select b.id into v_prix_propose from public.btp_bibliotheque_prix b where b.client_id = v_client and b.ligne_marche_id = v_l1;
  return next is((select b.statut from public.btp_bibliotheque_prix b where b.id = v_prix142), 'propose', '10. Le prix du garde-corps est « proposé »');
  perform tests.endosser(coalesce(v_referent, v_gerant), 'referent@banc-varelo.test');
  if v_referent is not null then
    return next throws_ok(format('select public.btp_valider_prix(%L, null)', v_prix142), '42501', null, '10. Sans le droit daliro.valider_prix, le referent (valideur) ne valide pas un prix');
    perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
    insert into public.droits (client_id, droit, user_id) values (v_client, 'daliro.valider_prix', v_referent);
    return next ok(true, '10. Le gérant donne le droit daliro.valider_prix au referent (public.droits)');
    perform tests.endosser(v_referent, 'referent@banc-varelo.test');
  end if;
  perform public.btp_valider_prix(v_prix142, null);
  return next is((select b.statut from public.btp_bibliotheque_prix b where b.id = v_prix142), 'valide', '10. Le referent valide le prix « Garde-corps acier laqué » à 142 €/ml');
  return next throws_ok(format('select public.btp_valider_prix(%L, null)', v_prix142), '23514', null, '10. Un prix déjà validé ne se revalide pas');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_prixh := public.btp_poser_prix(v_client, 'Heure de pose menuisier', 'heure', 48, v_ce1);
  return next is((select b.statut || '/' || b.unite from public.btp_bibliotheque_prix b where b.id = v_prixh), 'valide/h', '10. Le prix de saisie est validé d''emblée, « heure » lu h');
  perform tests.redevenir_admin();
  return next throws_ok(format('update public.btp_bibliotheque_prix set prix_unitaire_ht = 49 where id = %L', v_prixh), '42501', null, '10. Un prix validé ne se retouche pas');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_j := null;
  perform public.btp_poser_prix(v_client, 'Heure de pose menuisier', 'h', 50, v_ce1);
  return next is((select b.statut from public.btp_bibliotheque_prix b where b.id = v_prixh), 'retire', '10. Un nouveau prix validé pour la même désignation retire l''ancien');

  -- ── 11. Le planning importé du tableur ──
  v_j2 := coalesce(public.ajouter_jours(current_date, 2, 'ouvres', v_territoire), current_date + 2);
  v_j := public.btp_importer_passages(v_ch, 'tableur', jsonb_build_array(
    jsonb_build_object('ref', 'P1', 'lot', '01', 'intervenant', 'Pose A', 'tache', 'Pose des fenêtres', 'debut', current_date + 3, 'fin', current_date + 10),
    jsonb_build_object('ref', 'P2', 'lot', '02', 'intervenant', 'Serrurerie Dumont', 'tache', 'Pose des garde-corps', 'debut', current_date + 12, 'fin', current_date + 16, 'exterieur', true),
    jsonb_build_object('ref', 'P3', 'lot', '03', 'intervenant', 'Peintures Giraud', 'tache', 'Peinture des menuiseries', 'debut', current_date + 18, 'fin', current_date + 22),
    jsonb_build_object('ref', 'P4', 'lot', '02', 'intervenant', 'Dumont Serrurerie SARL', 'tache', 'Relevé des cotes garde-corps', 'debut', v_j2, 'fin', v_j2),
    jsonb_build_object('ref', 'P5', 'lot', '01', 'tache', 'Réglages et finitions', 'debut', current_date + 30, 'fin', current_date + 31)));
  return next is(v_j ->> 'crees', '5', '11. Cinq passages créés');
  return next is(v_j ->> 'a_ranger', '1', '11. Un passage à ranger (« Peintures Giraud » ne désigne personne)');
  return next is(v_j ->> 'sans_lot', '0', '11. Aucun passage sans lot');
  select p.id into v_p1 from public.btp_passages p where p.chantier_id = v_ch and p.source_ref = 'P1';
  select p.id into v_p2 from public.btp_passages p where p.chantier_id = v_ch and p.source_ref = 'P2';
  select p.id into v_p3 from public.btp_passages p where p.chantier_id = v_ch and p.source_ref = 'P3';
  select p.id into v_p4 from public.btp_passages p where p.chantier_id = v_ch and p.source_ref = 'P4';
  select p.id into v_p5 from public.btp_passages p where p.chantier_id = v_ch and p.source_ref = 'P5';
  return next is((select p.rapprochement || '/' || p.intervenant_type from public.btp_passages p where p.id = v_p1), 'identique/equipe', '11. « Pose A » : équipe, nom identique');
  return next is((select p.rapprochement || '/' || p.intervenant_type from public.btp_passages p where p.id = v_p4), 'ressemblance/tiers', '11. « Dumont Serrurerie SARL » : Serrurerie Dumont, par ressemblance');
  return next is((select p.intervenant_type from public.btp_passages p where p.id = v_p3), 'inconnu', '11. « Peintures Giraud » : inconnu');
  return next is((select p.equipe_id from public.btp_passages p where p.id = v_p5), v_equipe, '11. Sans intervenant, le passage revient à l''équipe du lot');
  return next ok((select p.exterieur from public.btp_passages p where p.id = v_p2), '11. P2 est en extérieur (lu du tableur)');
  return next ok(exists (select 1 from public.btp_controle k where k.chantier_id = v_ch and k.code = 'passage_a_ranger' and k.objet_id = v_p3), '11. Contrôle : passage à ranger');
  v_j := public.btp_importer_passages(v_ch, 'tableur', jsonb_build_array(
    jsonb_build_object('ref', 'P1', 'lot', '01', 'intervenant', 'Pose A', 'tache', 'Pose des fenêtres', 'debut', current_date + 4, 'fin', current_date + 11),
    jsonb_build_object('ref', 'P2', 'lot', '02', 'intervenant', 'Serrurerie Dumont', 'tache', 'Pose des garde-corps', 'debut', current_date + 12, 'fin', current_date + 16),
    jsonb_build_object('ref', 'P3', 'lot', '03', 'intervenant', 'Peintures Giraud', 'tache', 'Peinture des menuiseries', 'debut', current_date + 18, 'fin', current_date + 22),
    jsonb_build_object('ref', 'P4', 'lot', '02', 'intervenant', 'Dumont Serrurerie SARL', 'tache', 'Relevé des cotes garde-corps', 'debut', v_j2, 'fin', v_j2)));
  return next is(v_j ->> 'mis_a_jour' || '/' || (v_j ->> 'inchanges') || '/' || (v_j ->> 'annules'), '1/3/1', '11. Réimport : P1 déplacé, trois inchangés, P5 annulé (absent du relevé)');
  return next is((select p.version from public.btp_passages p where p.id = v_p1), 2, '11. P1 : version 2');
  return next is((select p.statut from public.btp_passages p where p.id = v_p5), 'annule', '11. P5 annulé');
  v_j := public.btp_importer_passages(v_ch, 'tableur', jsonb_build_array(jsonb_build_object('ref', 'P5', 'lot', '01', 'tache', 'Réglages et finitions', 'debut', current_date + 30, 'fin', current_date + 31)), false);
  return next is((select p.statut from public.btp_passages p where p.id = v_p5), 'prevu', '11. P5 revient « prévu » quand le relevé partiel le ramène');
  return next ok(tests.b6_journal(v_client, 'daliro.planning_releve', v_ch::text) is not null, '11. Journal : daliro.planning_releve');
  return next throws_ok(format('select public.btp_importer_passages(%L, ''excel'', ''[]''::jsonb)', v_ch), '22023', null, '11. Une source d''import inconnue est refusée');

  -- ── 12. Les dépendances ──
  v_n := public.btp_proposer_dependances(v_ch);
  return next ok(v_n >= 4, format('12. %s dépendances proposées d''après l''ordre des corps d''état', v_n));
  return next ok(exists (select 1 from public.btp_dependances d where d.chantier_id = v_ch and d.amont_id = v_p1 and d.aval_id = v_p4 and d.origine = 'gabarit' and not d.confirmee),
                 '12. P1 (menuiseries) précède P4 (garde-corps), proposée, non confirmée');
  return next ok(exists (select 1 from public.btp_controle k where k.chantier_id = v_ch and k.code = 'dependance_non_respectee'),
                 '12. Contrôle : P4 commence avant la fin de P1');
  update public.btp_dependances set confirmee = true where chantier_id = v_ch;
  return next is((select count(*)::int from public.btp_dependances d where d.chantier_id = v_ch and not d.confirmee), 0, '12. Toutes confirmées par le bureau');
  return next throws_ok(format('insert into public.btp_dependances (client_id, chantier_id, amont_id, aval_id) values (%L, %L, %L, %L)', v_client, v_ch, v_p3, v_p1),
                        '23514', null, '12. Une dépendance qui ferme une boucle est refusée');
  return next is(public.btp_proposer_dependances(v_ch), 0, '12. Rien de nouveau à proposer');

  -- ── 13. L'acceptation du sous-traitant ──
  insert into public.btp_acceptations (client_id, chantier_id, tiers_id, mode, paiement_direct) values (v_client, v_ch, v_dumont, 'lettre', false) returning id into v_acc;
  return next is((select a.statut from public.btp_acceptations a where a.id = v_acc), 'a_demander', '13. Acceptation à demander');
  return next throws_ok(format('update public.btp_acceptations set statut = ''caduque'' where id = %L', v_acc), '23514', null, '13. a_demander → caduque est refusé');
  update public.btp_acceptations set statut = 'demandee' where id = v_acc;
  update public.btp_acceptations set statut = 'acceptee' where id = v_acc;
  return next ok((select a.statut = 'acceptee' and a.demandee_le is not null and a.decidee_le is not null from public.btp_acceptations a where a.id = v_acc), '13. Acceptée, datée');
  return next ok(not exists (select 1 from public.btp_controle k where k.chantier_id = v_ch and k.code = 'sous_traitant_non_accepte'), '13. Le contrôle « non accepté » a disparu');

  -- ── 14. J-2 : demander, répondre, remplacer ──
  perform tests.redevenir_admin();
  v_j := public.btp_demander_confirmations(v_client, current_date);
  return next ok((v_j ->> 'demandees')::int >= 1, format('14. %s confirmation(s) demandée(s) pour J-2 (serveur)', v_j ->> 'demandees'));
  return next is((select p.confirmation from public.btp_passages p where p.id = v_p4), 'demandee', '14. P4 (Dumont, dans deux jours ouvrés) : confirmation demandée');
  return next is((select p.confirmation from public.btp_passages p where p.id = v_p2), 'non_demandee', '14. P2 (dans douze jours) : pas encore');
  return next ok(exists (select 1 from public.travaux t where t.client_id = v_client and t.cle like 'confirmation:' || v_p4::text || '%') or not exists (select 1 from private.abonnements a where a.evenement = 'daliro.confirmation_demandee'),
                 '14. L''événement daliro.confirmation_demandee est publié (ou personne n''y est abonné)');
  return next ok(public.btp_repondre_confirmation(v_p4, 'confirmee', 'wa:msg-0001', '{"canal": "whatsapp"}'::jsonb), '14. Dumont confirme (réception)');
  return next is((select p.confirmation from public.btp_passages p where p.id = v_p4), 'confirmee', '14. P4 confirmé');
  return next ok(public.btp_repondre_confirmation(v_p4, 'declinee', 'wa:msg-0001'), '14. La même réponse rejouée rend true…');
  return next is((select p.confirmation from public.btp_passages p where p.id = v_p4), 'confirmee', '14. … et ne réécrit rien');
  return next is((select count(*)::int from public.btp_confirmations x where x.passage_id = v_p4), 2, '14. Deux événements sur P4 : demandée, confirmée');
  return next ok(not public.btp_repondre_confirmation(gen_random_uuid(), 'confirmee', 'wa:inconnu'), '14. Un passage inconnu rend false');
  return next throws_ok(format('select public.btp_repondre_confirmation(%L, ''confirmee'', ''wa:msg-0002'')', v_p2), '23514', null, '14. Répondre sans demande est refusé');
  v_j := public.btp_demander_confirmations(v_client, current_date + 10);
  return next is((select p.confirmation from public.btp_passages p where p.id = v_p2), 'demandee', '14. Dix jours plus tard, P2 est demandé');
  return next ok(public.btp_repondre_confirmation(v_p2, 'declinee', 'wa:msg-0003'), '14. Dumont décline P2');
  return next is((select p.confirmation from public.btp_passages p where p.id = v_p2), 'declinee', '14. P2 décliné');
  select count(*) into v_n from public.btp_proposer_remplacants(v_p2) x where x.tiers_id = v_rochat;
  return next is(v_n, 1, '14. Métallerie Rochat (même corps d''état, 69, vigilance à jour) est proposée en remplacement');
  return next is((select count(*)::int from public.btp_proposer_remplacants(v_p2) x where x.tiers_id = v_dumont), 0, '14. Dumont n''est pas son propre remplaçant');
  return next ok(exists (select 1 from public.alertes a where a.client_id = v_client and a.source = 'daliro_referentiel' and a.titre like 'Serrurerie Dumont a décliné%')
                 or not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'alertes'),
                 '14. Une alerte est levée pour le conducteur (si la table alertes est celle du socle)');
  -- sans réponse : P7 de Dumont dans trois jours, demandé, puis la veille sans réponse
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_j := public.btp_importer_passages(v_ch, 'tableur', jsonb_build_array(jsonb_build_object('ref', 'P7', 'lot', '02', 'intervenant', 'Serrurerie Dumont', 'tache', 'Pose des platines', 'debut', current_date + 3, 'fin', current_date + 3)), false);
  select p.id into v_p7 from public.btp_passages p where p.chantier_id = v_ch and p.source_ref = 'P7';
  perform tests.redevenir_admin();
  perform public.btp_demander_confirmations(v_client, current_date + 1);
  return next is((select p.confirmation from public.btp_passages p where p.id = v_p7), 'demandee', '14. P7 demandé');
  v_j := public.btp_demander_confirmations(v_client, current_date + 2);
  return next is((select p.confirmation from public.btp_passages p where p.id = v_p7), 'sans_reponse', '14. La veille sans réponse : P7 « sans réponse »');
  return next ok((select (x.detail -> 'remplacants') @> jsonb_build_array(jsonb_build_object('tiers', v_rochat)) from public.btp_confirmations x where x.passage_id = v_p7 and x.evenement = 'sans_reponse'),
                 '14. L''événement « sans réponse » porte les remplaçants proposés');
  return next ok(public.btp_repondre_confirmation(v_p7, 'confirmee', 'wa:msg-0004'), '14. Une réponse tardive est encore acceptée');

  -- ── 15. Le travail supplémentaire : l'avenant chiffré sur la bibliothèque ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_av := public.btp_ouvrir_avenant(v_ch, 'Garde-corps supplémentaires sur les balcons du R+3 (12 ml), demandés par le maître d''ouvrage en visite',
                                    jsonb_build_object('canal', 'vocal', 'auteur', 'Chef d''équipe Pose A', 'date', current_date, 'texte', 'Lefèvre veut aussi des garde-corps au R+3, douze mètres.'));
  return next is((select a.numero || '/' || a.statut from public.btp_avenants a where a.id = v_av), '1/brouillon', '15. Avenant n° 1 en brouillon');
  return next is((select a.marche_id from public.btp_avenants a where a.id = v_av), v_m, '15. Il se rattache au marché vérifié');
  return next throws_ok(format('select public.btp_chiffrer_ligne_avenant(%L, 12, %L, %L)', v_av, v_prix_propose, v_lot2), '23514', null, '15. Un prix seulement proposé ne chiffre pas un avenant');
  v_la := public.btp_chiffrer_ligne_avenant(v_av, 12, v_prix142, v_lot2);
  return next is((select l.montant_ht from public.btp_avenants_lignes l where l.id = v_la), 1704.00::numeric, '15. 12 ml × 142 € = 1 704 € HT, prix copié de la bibliothèque');
  return next is((select l.origine_prix || '/' || l.unite from public.btp_avenants_lignes l where l.id = v_la), 'bibliotheque/ml', '15. Origine bibliothèque, unité ml');
  v_lb := public.btp_chiffrer_ligne_avenant(v_av, 12, null, v_lot2, 'Dépose du garde-corps provisoire', 'ml', 15);
  return next is((select l.montant_ht from public.btp_avenants_lignes l where l.id = v_lb), 180.00::numeric, '15. Une ligne saisie librement : 12 × 15 = 180 €');
  return next ok(exists (select 1 from public.btp_bibliotheque_prix b where b.client_id = v_client and b.designation = 'Dépose du garde-corps provisoire' and b.statut = 'propose'),
                 '15. Le prix saisi est proposé à la bibliothèque');
  return next throws_ok(format('select public.btp_chiffrer_ligne_avenant(%L, 1, null, null, ''Sans prix'', ''u'', null)', v_av), '22023', null, '15. Sans prix de bibliothèque, désignation, unité et prix unitaire sont exigés');
  return next is((select a.montant_ht from public.btp_avenants_chiffres a where a.id = v_av), 1884.00::numeric, '15. Total de l''avenant : 1 884 € HT');
  perform public.btp_retirer_ligne_avenant(v_lb);
  return next is((select a.montant_ht from public.btp_avenants_chiffres a where a.id = v_av), 1704.00::numeric, '15. Ligne retirée : 1 704 € HT');
  v_lb := public.btp_chiffrer_ligne_avenant(v_av, 12, null, v_lot2, 'Dépose du garde-corps provisoire', 'ml', 15);
  return next throws_ok(format('select public.btp_signer_avenant(%L)', v_av), '23514', null, '15. Un brouillon ne se signe pas');

  -- ── 16. Soumis à la signature : la file de validation du socle ──
  v_dem := public.btp_soumettre_avenant(v_av);
  return next ok(v_dem is not null, '16. Une demande de validation est déposée');
  return next is((select a.statut from public.btp_avenants a where a.id = v_av), 'soumis', '16. Avenant soumis');
  return next is((select d.type_action || '/' || d.statut from public.demandes_validation d where d.id = v_dem), 'daliro.signer_avenant/en_attente', '16. Demande daliro.signer_avenant en attente');
  return next is((select d.montant from public.demandes_validation d where d.id = v_dem), 1884.00::numeric, '16. Montant de la demande : 1 884 €');
  return next ok((select d.payload -> 'saisi_par' @> to_jsonb(array[v_gerant]) from public.demandes_validation d where d.id = v_dem), '16. Le gérant qui a chiffré est dans saisi_par');
  return next throws_ok(format('select public.btp_chiffrer_ligne_avenant(%L, 1, %L, %L)', v_av, v_prix142, v_lot2), '23514', null, '16. Les lignes d''un avenant soumis ne changent plus');
  return next throws_ok(format('insert into public.approbations (demande_id, decision, commentaire) values (%L, ''approuve'', ''ok'')', v_dem), '42501', null, '16. Celui qui a chiffré ne signe pas (séparation saisie / approbation)');
  return next throws_ok(format('select public.btp_signer_avenant(%L)', v_av), '23514', null, '16. Avant la décision, la signature est refusée');
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, decision, commentaire) values (v_dem, 'approuve', 'Prix de la bibliothèque, dans le budget du lot 02.');
  perform tests.redevenir_admin();
  return next is((select d.statut from public.demandes_validation d where d.id = v_dem), 'approuvee', '16. Approuvée par le daf');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_j := public.btp_signer_avenant(v_av, null, current_date);
  return next is(v_j ->> 'statut', 'signe', '16. Avenant signé');
  return next ok((select a.signe_par = v_gerant and a.signe_le = current_date from public.btp_avenants a where a.id = v_av), '16. Signé aujourd''hui par le gérant');
  perform tests.redevenir_admin();
  return next is((select d.statut from public.demandes_validation d where d.id = v_dem), 'executee', '16. La demande du socle est exécutée');
  return next ok(tests.b6_journal(v_client, 'daliro.avenant_signe', v_av::text) is not null, '16. Journal : daliro.avenant_signe');
  return next throws_ok(format('update public.btp_avenants set objet = ''autre'' where id = %L', v_av), '42501', null, '16. Un avenant signé ne se modifie plus');

  -- ── 17. La facture du sous-traitant, reçue par FILED, rattachée au lot ──
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, siren, tva, pays, statut, source)
  values (v_client, 'DUMONT', 'Serrurerie Dumont', 'serrurerie dumont', '552100554', 'FR' || lpad(((12 + 3 * (552100554::bigint % 97)) % 97)::text, 2, '0') || '552100554', 'FR', 'actif', 'saisie') returning id into v_four_filed;
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, siren, pays, statut, source)
  values (v_client, 'AUTRE', 'Autre Entreprise', 'autre entreprise', '775665011', 'FR', 'actif', 'saisie') returning id into v_four_autre;
  insert into public.pieces (client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut)
  values (v_client, 'filed', 'depot', 'facture-dumont-1.pdf', 'application/pdf', 2048, repeat('e', 64), v_client::text || '/filed_document/b6/facture-dumont-1.pdf', 'filed_document', 'b6', 'lue') returning id into v_piece;
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, nom_fichier, sha256, recu_le, etat, nature, nature_source)
  values (v_client, v_entite, extract(year from current_date)::int, 990001, v_piece, 'courriel', 'facture-dumont-1.pdf', repeat('e', 64), now(), 'a_traiter', 'facture', 'lecteur') returning id into v_doc;
  insert into public.filed_factures (client_id, entite_id, document_id, nature, numero, numero_normalise, date_emission, date_reception, devise, montant_ht, montant_tva, montant_ttc,
                                     fournisseur_id, fournisseur_identification, fournisseur_lu, acheteur_lu, empreinte_donnees, statut)
  values (v_client, v_entite, v_doc, 'facture', 'D-2026-118', 'D2026118', current_date - 2, current_date, 'EUR', 9940.00, 1988.00, 11928.00,
          v_four_filed, 'siren', '{"siren": "552100554", "nom": "Serrurerie Dumont"}', '{}', repeat('f', 64), 'a_valider') returning id into v_fact;
  insert into public.filed_factures (client_id, entite_id, document_id, nature, numero, numero_normalise, date_emission, date_reception, devise, montant_ht, montant_tva, montant_ttc,
                                     fournisseur_id, fournisseur_identification, fournisseur_lu, acheteur_lu, empreinte_donnees, statut)
  values (v_client, v_entite, v_doc, 'facture', 'A-2026-7', 'A20267', current_date - 1, current_date, 'EUR', 500.00, 100.00, 600.00,
          v_four_autre, 'siren', '{"siren": "775665011"}', '{}', repeat('a', 64), 'a_valider') returning id into v_fact2;
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_like(format('select public.btp_rattacher_facture(%L, %L, %L, null)', v_fact2, v_ch, v_lot2), '%n''est pas l''entreprise du lot 02%', '17. Une facture d''un autre SIREN ne se rattache pas au lot de Dumont');
  v_ratt := public.btp_rattacher_facture(v_fact, v_ch, v_lot2, 'Situation n° 1 des garde-corps');
  return next ok(v_ratt is not null, '17. La facture de Dumont est rattachée au lot 02');
  return next is((select x.marche_id from public.btp_factures_chantier x where x.id = v_ratt), v_m, '17. Elle porte le marché vérifié du moment');
  return next is((select f.fournisseur_nom || '/' || f.lot_code from public.btp_factures_chantier_detail f where f.id = v_ratt), 'Serrurerie Dumont/02', '17. Le détail joint fournisseur et lot');
  return next is((select d.engage_marche_ht from public.btp_debourse_lots d where d.lot_id = v_lot2), 24020.00::numeric, '17. Lot 02 : 24 020 € engagés au marché (22 720 + 1 300)');
  return next is((select d.engage_avenants_ht from public.btp_debourse_lots d where d.lot_id = v_lot2), 1884.00::numeric, '17. Lot 02 : 1 884 € d''avenant signé');
  return next is((select d.facture_ht from public.btp_debourse_lots d where d.lot_id = v_lot2), 9940.00::numeric, '17. Lot 02 : 9 940 € facturés');
  return next is((select d.reste_ht from public.btp_debourse_lots d where d.lot_id = v_lot2), 15964.00::numeric, '17. Lot 02 : reste 15 964 € à facturer');
  return next ok(tests.b6_journal(v_client, 'daliro.facture_rattachee', v_ratt::text) is not null, '17. Journal : daliro.facture_rattachee');
  perform public.btp_detacher_facture(v_fact, 'Rattachée au mauvais chantier');
  return next is((select d.facture_ht from public.btp_debourse_lots d where d.lot_id = v_lot2), 0::numeric, '17. Détachée : plus rien de facturé sur le lot');
  v_ratt := public.btp_rattacher_facture(v_fact, v_ch, v_lot2, null);
  return next is((select x.statut from public.btp_factures_chantier x where x.id = v_ratt), 'rattachee', '17. Rattachée de nouveau (même ligne, idempotente)');

  -- ── 18. Rouvrir le marché : le gérant seul ──
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  return next throws_ok(format('select public.btp_rouvrir_marche(%L, ''Désignation à corriger'')', v_m), '42501', null, '18. Le daf (valideur) ne rouvre pas un marché vérifié');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.btp_rouvrir_marche(%L, '''')', v_m), '22023', null, '18. Un marché se rouvre avec son motif');
  perform public.btp_rouvrir_marche(v_m, 'Désignation de la ligne 1.1 à préciser');
  return next is((select m.statut from public.btp_marches m where m.id = v_m), 'a_verifier', '18. Marché rouvert');
  perform public.btp_ecrire_ligne(v_l1, null, jsonb_build_object('designation', 'Fenêtre bois-alu un vantail, vitrage 4/16/4 faible émissivité'));
  v_j := public.btp_verifier_marche(v_m);
  return next is((select m.statut from public.btp_marches m where m.id = v_m), 'verifie', '18. Revérifié');
  return next ok(tests.b6_journal(v_client, 'daliro.marche_rouvert', v_m::text) is not null, '18. Journal : daliro.marche_rouvert');

  -- ── 19. Le tableau du chantier, en un appel ──
  v_j := public.btp_tableau_chantier(v_ch);
  return next ok(v_j is not null, '19. Le gérant lit le tableau du chantier');
  return next is(jsonb_array_length(v_j -> 'lots'), 3, '19. Trois lots');
  return next is(jsonb_array_length(v_j -> 'avenants'), 1, '19. Un avenant');
  return next is(jsonb_array_length(v_j -> 'factures'), 1, '19. Une facture rattachée');
  return next is(jsonb_array_length(v_j -> 'marches'), 1, '19. Un marché');
  return next is(jsonb_array_length(v_j -> 'marches' -> 0 -> 'lignes'), 6, '19. Ses six lignes');
  return next ok((v_j -> 'chantier' ->> 'maitre_ouvrage_nom') = 'SCI Lefèvre Patrimoine', '19. Le maître d''ouvrage est nommé');
  return next ok(jsonb_array_length(v_j -> 'passages') >= 6, '19. Les passages à venir');
  return next ok((v_j -> 'voit_prix')::boolean, '19. Le gérant voit les prix');
  v_j := public.btp_liste_chantiers();
  return next ok(exists (select 1 from jsonb_array_elements(v_j) x where (x ->> 'id')::uuid = v_ch and (x ->> 'marche_verifie')::boolean and (x ->> 'nb_avenants_signes')::int = 1),
                 '19. La liste des chantiers porte le marché vérifié et l''avenant signé');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b6_01_');
