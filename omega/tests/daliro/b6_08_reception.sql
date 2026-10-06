-- b6_08 — DALIRO : réception, réserves, retenue de garantie, décompte définitif (session B6, 06/10/2026), b6_13.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_13.
-- runtests() annule tout.
--
-- Chantier A : marché vérifié de 5 000 € HT, retenue 5 % HT ; une situation validée à 100 % (retenue 250 €) ;
-- réception il y a 10 jours avec deux réserves. Chantier B : marché à caution, réception il y a 370 jours.

create or replace function tests.test_b6_08_reception() returns setof text
language plpgsql as $f$
declare
  banc jsonb; jeu jsonb; v_client uuid; v_gerant uuid; v_daf uuid; v_collab uuid; v_autre uuid;
  v_mo uuid; v_a uuid; v_b uuid; v_lot uuid; v_m uuid; v_l uuid; v_s uuid; v_dem uuid; v_ra uuid; v_rb uuid;
  v_res1 uuid; v_res2 uuid; v_j jsonb; v_r jsonb; v_n integer;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');
  v_collab := tests.b6_compte(v_client, 'collaborateur', 'b6-recep-collab@banc-varelo.test');
  jeu := tests.jeu();
  v_autre := (jeu ->> 'gerant_a')::uuid;

  -- ── Chantier A : marché vérifié, une situation validée ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO de la réception') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier de la réception', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_a;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_a, '01', 'Lot de la réception', 'client') returning id into v_lot;
  v_m := public.btp_ecrire_marche(null, v_a, jsonb_build_object('reference', 'REC-1', 'mode_prix', 'forfait', 'montant_ht_declare', 5000, 'retenue_taux', 0.05, 'retenue_base', 'ht'));
  v_l := public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Menuiseries posées', 'unite_lue', 'forfait', 'nature', 'forfait', 'montant_ht', 5000, 'lot_id', v_lot));
  perform public.btp_verifier_marche(v_m);
  v_s := public.btp_ouvrir_situation(v_a, current_date - 15);
  perform public.btp_avancer_situation((select l.id from public.btp_situations_lignes l where l.situation_id = v_s and l.ligne_marche_id = v_l), 100);
  v_dem := public.btp_soumettre_situation(v_s);
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire) values (v_dem, v_client, v_daf, 'approuve', 'Situation finale (essai réception)');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.btp_valider_situation(v_s);
  return next is((select s.retenue from public.btp_situations s where s.id = v_s), 250.00::numeric, 'Départ : la situation validée retient 250 € (5 % de 5 000 HT)');

  -- ── Garde-fous ──
  return next ok(not has_function_privilege('anon', 'public.btp_prononcer_reception(uuid, date, jsonb, uuid)', 'execute'), 'anon ne prononce pas de réception');
  return next ok(not has_function_privilege('authenticated', 'private.btp_alerter_reception(uuid, date)', 'execute'), 'authenticated n''appelle pas les alertes');
  return next ok(not has_table_privilege('authenticated', 'public.btp_receptions', 'update'), 'Les réceptions ne s''écrivent que par les portes');
  perform tests.endosser(v_collab, 'b6-recep-collab@banc-varelo.test');
  return next throws_ok(format('select public.btp_prononcer_reception(%L, current_date)', v_a), '42501', null, 'Un collaborateur ne prononce pas la réception');
  perform tests.endosser(v_autre, 'autre@essai.invalid');
  return next throws_ok(format('select public.btp_prononcer_reception(%L, current_date)', v_a), '42501', null, 'Une autre organisation ne prononce pas la réception');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.btp_prononcer_reception(%L, current_date + 1)', v_a), '22023', null, 'La date de réception n''est pas dans le futur');

  -- ── Réception avec deux réserves ──
  v_ra := public.btp_prononcer_reception(v_a, current_date - 10,
            jsonb_build_array(jsonb_build_object('description', 'Joint de la fenêtre du séjour à reprendre', 'lot', '01'),
                              jsonb_build_object('description', 'Rayure sur la porte palière')));
  return next is((select c.statut || '/' || c.date_reception from public.btp_chantiers c where c.id = v_a), 'receptionne/' || (current_date - 10)::text,
                 'Le chantier est réceptionné à la date du procès-verbal');
  return next is((select r.retenue_montant || '/' || r.retenue_due_le || '/' || r.retenue_statut from public.btp_receptions r where r.id = v_ra),
                 '250.00/' || ((current_date - 10) + interval '1 year')::date::text || '/bloquee', 'Retenue de 250 € due un an après la réception, bloquée d''ici là');
  return next is((select count(*)::int from public.btp_reserves v where v.reception_id = v_ra and v.statut = 'ouverte'), 2, 'Deux réserves ouvertes');
  return next ok((select v.lot_id = v_lot from public.btp_reserves v where v.reception_id = v_ra and v.ordre = 1), 'La première réserve est rattachée au lot 01');
  return next throws_ok(format('select public.btp_prononcer_reception(%L, current_date)', v_a), '23514', null, 'Une réception par chantier');
  v_j := public.btp_tableau_chantier(v_a);
  return next is(v_j -> 'reception' ->> 'retenue_etat', 'bloquee', 'Le tableau du chantier montre la réception et sa retenue bloquée');
  return next is(jsonb_array_length(v_j -> 'reception' -> 'reserves'), 2, 'Avec ses réserves');
  perform tests.endosser(v_collab, 'b6-recep-collab@banc-varelo.test');
  return next is((select count(*)::int from public.btp_reserves v where v.reception_id = v_ra), 2, 'Collaborateur : il lit les réserves (le chantier)');
  return next is((select count(*)::int from public.btp_receptions r where r.id = v_ra), 0, 'Collaborateur sans voit_prix : il ne lit pas la retenue');

  -- ── Les réserves se lèvent ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  select id into v_res1 from public.btp_reserves where reception_id = v_ra and ordre = 1;
  select id into v_res2 from public.btp_reserves where reception_id = v_ra and ordre = 2;
  return next throws_ok(format('select public.btp_lever_reserve(%L, current_date - 30)', v_res1), '22023', null, 'Une réserve ne se lève pas avant la réception');
  perform public.btp_lever_reserve(v_res1, current_date - 2);
  return next is((select v.statut from public.btp_reserves v where v.id = v_res1), 'levee', 'La réserve 1 est levée');
  return next throws_ok(format('select public.btp_lever_reserve(%L)', v_res1), '23514', null, 'Une réserve levée ne se relève pas');

  -- ── La retenue : pas avant un an sans l'accord du maître d'ouvrage et toutes les réserves levées ──
  return next throws_ok(format('select public.btp_liberer_retenue(%L)', v_ra), '23514', null, 'Avant un an, sans accord : la retenue ne se libère pas');
  return next throws_ok(format('select public.btp_liberer_retenue(%L, current_date, true)', v_ra), '23514', null, 'Avec accord mais une réserve ouverte : non plus');
  return next throws_ok(format('select public.btp_opposer_retenue(%L, '' '')', v_ra), '22023', null, 'Une opposition sans motif est refusée');
  v_r := public.btp_opposer_retenue(v_ra, 'Réserve sur la porte palière non levée', current_date - 1);
  return next is(v_r ->> 'retenue_statut', 'opposee', 'Le maître d''ouvrage oppose la retenue, motif gardé');
  return next throws_ok(format('select public.btp_liberer_retenue(%L)', v_ra), '23514', null, 'Opposée et réserve ouverte : la retenue reste');
  perform public.btp_lever_reserve(v_res2);
  v_r := public.btp_liberer_retenue(v_ra);
  return next is(v_r ->> 'retenue_statut' || '/' || (v_r ->> 'liberee_avant_terme'), 'liberee/true', 'Réserves levées : la retenue est libérée (avant terme, opposition purgée)');

  -- ── Le décompte définitif ──
  return next throws_ok(format('select public.btp_envoyer_decompte(%L)', v_ra), '23514', null, 'Pas d''envoi sans projet de décompte');
  v_r := public.btp_preparer_decompte(v_ra);
  return next is((v_r ->> 'decompte_marche_ht')::numeric || '/' || (v_r ->> 'decompte_facture_ht')::numeric || '/' || (v_r ->> 'decompte_reste_ht')::numeric || '/' || (v_r ->> 'decompte_retenue')::numeric,
                 '5000.00/5000.00/0.00/250.00', 'Projet : marché 5 000, facturé 5 000, reste 0, retenue 250');
  perform public.btp_envoyer_decompte(v_ra, current_date);
  return next throws_ok(format('select public.btp_preparer_decompte(%L)', v_ra), '23514', null, 'Envoyé, le décompte ne se recalcule plus');
  return next throws_ok(format('select public.btp_repondre_decompte(%L, false)', v_ra), '22023', null, 'Une contestation porte son motif');
  v_r := public.btp_repondre_decompte(v_ra, true);
  return next is(v_r ->> 'decompte_statut', 'accepte', 'Le maître d''ouvrage accepte le décompte');
  perform tests.redevenir_admin();
  return next ok(tests.b6_journal(v_client, 'daliro.reception_prononcee', v_ra::text) is not null and tests.b6_journal(v_client, 'daliro.retenue_liberee', v_ra::text) is not null,
                 'Réception et libération sont au journal');

  -- ── Chantier B : réception il y a 370 jours, retenue sous caution ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier réceptionné l''an dernier', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_b;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_b, '01', 'Lot de l''an dernier', 'client') returning id into v_lot;
  v_m := public.btp_ecrire_marche(null, v_b, jsonb_build_object('reference', 'REC-2', 'mode_prix', 'forfait', 'montant_ht_declare', 1000,
                                                                 'retenue_taux', 0.05, 'retenue_base', 'ht', 'retenue_caution', true));
  perform public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Travaux de l''an dernier', 'unite_lue', 'forfait', 'nature', 'forfait', 'montant_ht', 1000, 'lot_id', v_lot));
  perform public.btp_verifier_marche(v_m);
  v_rb := public.btp_prononcer_reception(v_b, current_date - 370);
  return next is((select r.retenue_caution::text || '/' || (r.retenue_due_le < current_date)::text from public.btp_receptions r where r.id = v_rb), 'true/true',
                 'Chantier B : retenue sous caution, échéance d''un an passée');
  v_j := public.btp_tableau_chantier(v_b);
  return next is(v_j -> 'reception' ->> 'retenue_etat', 'liberable', 'Passé un an sans opposition : la retenue est « libérable »');
  return next throws_ok(format('select public.btp_opposer_retenue(%L, ''Trop tard'')', v_rb), '23514', null, 'Une opposition après un an est refusée');
  perform tests.redevenir_admin();
  v_n := private.btp_alerter_reception(v_client, current_date);
  return next ok(v_n >= 2, 'Alertes levées (décompte à envoyer, retenue due) : ' || v_n);
  return next ok(exists (select 1 from public.alertes a where a.client_id = v_client and a.titre like 'Chantier réceptionné l''an dernier : la retenue de garantie (caution) est due%'),
                 'L''alerte dit de réclamer la caution');
  return next ok(exists (select 1 from public.alertes a where a.client_id = v_client and a.titre like 'Chantier réceptionné l''an dernier : le décompte final est à envoyer%'),
                 'L''alerte dit d''envoyer le décompte final');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_r := public.btp_liberer_retenue(v_rb);
  return next is(v_r ->> 'retenue_statut' || '/' || (v_r ->> 'liberee_avant_terme'), 'liberee/false', 'Chantier B : caution levée à son terme');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b6_08_');
