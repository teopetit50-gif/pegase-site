-- b6_07 — DALIRO : les situations de travaux (session B6, 06/10/2026), b6_12 — Vague 3, n° 1.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_12.
-- runtests() annule tout.
--
-- Le chantier : marché vérifié de 8 000 € HT (L1 menuiseries 100 u × 50 € = 5 000 ; L2 garde-corps 10 u × 300 € =
-- 3 000), retenue de garantie 5 % sur le HT ; avenant signé de 180 € (12 ml × 15 €).
-- Situation n° 1 : L1 40 %, L2 100 %, avenant 50 % → cumul 5 090 ; TVA 20 % 1 018 ; retenue 254,50 ; net 5 853,50.
-- Situation n° 2 : L1 70 % → période 1 500 ; TVA 300 ; retenue 75 ; net 1 725.
-- Un second chantier où l'entreprise est sous-traitante : autoliquidation, pas de TVA, mention 283-2 nonies,
-- retenue sur le « TTC » qui, sans TVA facturée, est le HT.

create or replace function tests.test_b6_07_situations() returns setof text
language plpgsql as $f$
declare
  banc jsonb; jeu jsonb; v_client uuid; v_gerant uuid; v_daf uuid; v_collab uuid; v_autre uuid;
  v_mo uuid; v_ep uuid; v_ch uuid; v_ch2 uuid; v_lot uuid; v_lot2 uuid; v_m uuid; v_m2 uuid;
  v_l1 uuid; v_l2 uuid; v_av uuid; v_dem uuid; v_s1 uuid; v_s2 uuid; v_s3 uuid; v_j jsonb; v_r jsonb;
  v_sl1 uuid; v_sl2 uuid; v_sla uuid;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');
  v_collab := tests.b6_compte(v_client, 'collaborateur', 'b6-situ-collab@banc-varelo.test');
  jeu := tests.jeu();
  v_autre := (jeu ->> 'gerant_a')::uuid;

  -- ── Le chantier, son marché vérifié, son avenant signé ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO des situations') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier des situations', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch, '01', 'Lot des situations', 'client') returning id into v_lot;
  v_m := public.btp_ecrire_marche(null, v_ch, jsonb_build_object('reference', 'SIT-1', 'mode_prix', 'unitaire', 'montant_ht_declare', 8000,
                                                                 'retenue_taux', 0.05, 'retenue_base', 'ht'));
  v_l1 := public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Menuiseries', 'unite_lue', 'u', 'quantite', 100, 'prix_unitaire_ht', 50, 'montant_ht', 5000, 'lot_id', v_lot));
  v_l2 := public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Garde-corps', 'unite_lue', 'u', 'quantite', 10, 'prix_unitaire_ht', 300, 'montant_ht', 3000, 'lot_id', v_lot));

  -- Pas de situation sur un marché à vérifier.
  return next throws_ok(format('select public.btp_ouvrir_situation(%L)', v_ch), '23514', null, 'Pas de situation tant que le marché n''est pas vérifié');
  perform public.btp_verifier_marche(v_m);

  v_av := public.btp_ouvrir_avenant(v_ch, 'Garde-corps provisoire');
  perform public.btp_chiffrer_ligne_avenant(v_av, 12, null, v_lot, 'Dépose du garde-corps provisoire', 'ml', 15);
  v_dem := public.btp_soumettre_avenant(v_av);
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire) values (v_dem, v_client, v_daf, 'approuve', 'Avenant (essai situations)');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.btp_signer_avenant(v_av);

  -- ── Garde-fous ──
  return next ok(not has_function_privilege('anon', 'public.btp_ouvrir_situation(uuid, date, numeric)', 'execute'), 'anon n''ouvre pas de situation');
  return next ok(not has_function_privilege('authenticated', 'private.btp_recalculer_situation(uuid)', 'execute'), 'authenticated n''appelle pas le calcul directement');
  return next ok(not has_table_privilege('authenticated', 'public.btp_situations', 'insert') and not has_table_privilege('authenticated', 'public.btp_situations_lignes', 'update'),
                 'Les situations ne s''écrivent que par les portes');
  perform tests.endosser(v_collab, 'b6-situ-collab@banc-varelo.test');
  return next throws_ok(format('select public.btp_ouvrir_situation(%L)', v_ch), '42501', null, 'Un collaborateur n''ouvre pas de situation');
  perform tests.endosser(v_autre, 'autre@essai.invalid');
  return next throws_ok(format('select public.btp_ouvrir_situation(%L)', v_ch), '42501', null, 'Le gérant d''une autre organisation n''ouvre pas de situation sur le banc');

  -- ── Situation n° 1 ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.btp_ouvrir_situation(%L, current_date, 0.19)', v_ch), '22023', null, 'Un taux de TVA inconnu est refusé');
  v_s1 := public.btp_ouvrir_situation(v_ch, current_date - 1);
  return next is((select s.numero || '/' || s.statut || '/' || s.regime_tva || '/' || s.taux_tva || '/' || s.retenue_taux || '/' || s.retenue_base
                  from public.btp_situations s where s.id = v_s1), '1/brouillon/normal/0.2000/0.0500/ht',
                 'Situation n° 1 en brouillon : TVA 20 % (métropole), retenue 5 % HT reprise du marché');
  return next is((select count(*)::int from public.btp_situations_lignes l where l.situation_id = v_s1), 3, 'Trois lignes : deux du marché, une de l''avenant signé');
  return next throws_ok(format('select public.btp_ouvrir_situation(%L)', v_ch), '23514', null, 'Une seule situation en cours par chantier');
  select id into v_sl1 from public.btp_situations_lignes where situation_id = v_s1 and ligne_marche_id = v_l1;
  select id into v_sl2 from public.btp_situations_lignes where situation_id = v_s1 and ligne_marche_id = v_l2;
  select id into v_sla from public.btp_situations_lignes where situation_id = v_s1 and origine = 'avenant';
  perform public.btp_avancer_situation(v_sl1, 40);
  perform public.btp_avancer_situation(v_sl2, 100);
  v_r := public.btp_avancer_situation(v_sla, 50);
  return next is((v_r ->> 'cumul_ht')::numeric, 5090.00::numeric, 'Cumul : 2 000 + 3 000 + 90 = 5 090 € HT');
  return next is((v_r ->> 'tva')::numeric, 1018.00::numeric, 'TVA 20 % : 1 018 €');
  return next is((v_r ->> 'retenue')::numeric, 254.50::numeric, 'Retenue de garantie 5 % du HT : 254,50 €');
  return next is((v_r ->> 'net_a_payer')::numeric, 5853.50::numeric, 'Net à payer : 5 853,50 €');
  return next ok((v_r -> 'mentions')::text like '%loi n° 71-584%', 'La mention de la retenue cite la loi 71-584');
  return next throws_ok(format('select public.btp_avancer_situation(%L, 120)', v_sl1), '22023', null, 'Un avancement au-delà de 100 % est refusé');
  v_dem := public.btp_soumettre_situation(v_s1);
  return next is((select d.type_action || '/' || d.statut || '/' || d.montant from public.demandes_validation d where d.id = v_dem),
                 'daliro.valider_situation/en_attente/5853.50', 'Soumise : une demande daliro.valider_situation de 5 853,50 € attend');
  return next throws_ok(format('select public.btp_avancer_situation(%L, 50)', v_sl1), '23514', null, 'Soumise, ses avancements sont figés');
  return next throws_ok(format('select public.btp_valider_situation(%L)', v_s1), '23514', null, 'Pas de validation avant l''approbation');
  return next throws_ok(format('insert into public.approbations (demande_id, client_id, user_id, decision) values (%L, %L, %L, ''approuve'')', v_dem, v_client, v_gerant),
                        '42501', null, 'Celui qui l''a saisie ne l''approuve pas');
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire) values (v_dem, v_client, v_daf, 'approuve', 'Situation n° 1 relue');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_r := public.btp_valider_situation(v_s1);
  return next is(v_r ->> 'statut', 'validee', 'Approuvée par la DAF, la situation n° 1 est validée');
  return next is((select d.statut from public.demandes_validation d where d.id = v_dem), 'executee', 'Sa demande est exécutée');
  return next throws_ok(format('select public.btp_annuler_situation(%L)', v_s1), '23514', null, 'Une situation validée ne s''annule pas');
  perform tests.redevenir_admin();
  return next ok(tests.b6_journal(v_client, 'daliro.situation_validee', v_s1::text) is not null, 'La validation est au journal');

  -- ── Situation n° 2 : l'avancement repart du précédent et ne recule pas ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.btp_ouvrir_situation(%L, current_date - 1)', v_ch), '23514', null, 'La période suivante finit après la précédente');
  v_s2 := public.btp_ouvrir_situation(v_ch, current_date);
  return next is((select l.precedent_avancement || '/' || l.avancement from public.btp_situations_lignes l where l.situation_id = v_s2 and l.ligne_marche_id = v_l1),
                 '40.00/40.00', 'Situation n° 2 : L1 repart de 40 %');
  select id into v_sl1 from public.btp_situations_lignes where situation_id = v_s2 and ligne_marche_id = v_l1;
  return next throws_ok(format('select public.btp_soumettre_situation(%L)', v_s2), '23514', null, 'Rien de neuf : rien à soumettre');
  return next throws_ok(format('select public.btp_avancer_situation(%L, 30)', v_sl1), '23514', null, 'L''avancement cumulé ne recule pas');
  v_r := public.btp_avancer_situation(v_sl1, 70);
  return next is((v_r ->> 'periode_ht')::numeric || '/' || (v_r ->> 'tva')::numeric || '/' || (v_r ->> 'retenue')::numeric || '/' || (v_r ->> 'net_a_payer')::numeric,
                 '1500.00/300.00/75.00/1725.00', 'Période n° 2 : 1 500 € HT, TVA 300, retenue 75, net 1 725');
  return next is((v_r ->> 'precedent_ht')::numeric, 5090.00::numeric, 'Le cumul précédent est celui de la situation n° 1');

  -- ── Lecture : RLS et tableau ──
  v_j := public.btp_tableau_chantier(v_ch);
  return next is(jsonb_array_length(v_j -> 'situations'), 2, 'Le tableau du chantier porte les deux situations');
  return next is((select jsonb_array_length(x -> 'lignes') from jsonb_array_elements(v_j -> 'situations') x where x ->> 'id' = v_s2::text), 3, 'Avec leurs lignes');
  perform tests.endosser(v_collab, 'b6-situ-collab@banc-varelo.test');
  return next is((select count(*)::int from public.btp_situations s where s.chantier_id = v_ch), 0, 'Collaborateur sans voit_prix : aucune situation lisible');
  perform tests.endosser(v_autre, 'autre@essai.invalid');
  return next is((select count(*)::int from public.btp_situations s where s.client_id = v_client), 0, 'Autre organisation : aucune situation du banc');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_r := public.btp_annuler_situation(v_s2, 'Essai');
  return next is(v_r ->> 'statut', 'annulee', 'Une situation en brouillon s''annule');

  -- ── Sous-traitance : autoliquidation de la TVA ──
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['entreprise_principale'], 'Entreprise principale des situations') returning id into v_ep;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, donneur_ordre_id, statut)
  values (v_client, 'Chantier en sous-traitance', '69003', 'Lyon', 'professionnel', 'sous_traitant', v_ep, 'ouvert') returning id into v_ch2;
  return next is((select c.regime_tva from public.btp_chantiers c where c.id = v_ch2), 'autoliquidation', 'En sous-traitance, le chantier est en autoliquidation');
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch2, '01', 'Lot sous-traité', 'client') returning id into v_lot2;
  v_m2 := public.btp_ecrire_marche(null, v_ch2, jsonb_build_object('reference', 'ST-1', 'mode_prix', 'forfait', 'montant_ht_declare', 2000, 'retenue_taux', 0.05, 'retenue_base', 'ttc'));
  perform public.btp_ecrire_ligne(null, v_m2, jsonb_build_object('designation', 'Pose', 'unite_lue', 'forfait', 'nature', 'forfait', 'montant_ht', 2000, 'lot_id', v_lot2));
  perform public.btp_verifier_marche(v_m2);
  v_s3 := public.btp_ouvrir_situation(v_ch2);
  v_r := public.btp_avancer_situation((select l.id from public.btp_situations_lignes l where l.situation_id = v_s3 limit 1), 50);
  return next is((v_r ->> 'periode_ht')::numeric || '/' || (v_r ->> 'tva')::numeric || '/' || (v_r ->> 'retenue')::numeric || '/' || (v_r ->> 'net_a_payer')::numeric,
                 '1000.00/0.00/50.00/950.00', 'Autoliquidation : 1 000 € HT, aucune TVA facturée, retenue 50, net 950');
  return next ok((v_r -> 'mentions')::text like '%article 283-2 nonies du CGI%', 'La mention obligatoire de l''autoliquidation est posée');

  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b6_07_');
