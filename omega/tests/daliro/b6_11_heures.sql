-- b6_11 — DALIRO : le pointage des heures et la rentabilité du chantier (session B6, 06/10/2026), b6_17.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_17.
-- runtests() annule tout.
--
-- Un marché de 1 000 € HT sur un lot, facturé à 100 % ; l'équipe « Pose B6 » (Ali, Bruno) pointe 8 h hier sur le lot ;
-- Bruno 4 h hors lot aujourd'hui. Coûts chargés : 38 €/h par défaut, 45 €/h pour Bruno.
-- Main-d'œuvre : lot 8 × 38 + 8 × 45 = 664 € ; hors lot 4 × 45 = 180 € ; marge à date 1 000 − 844 = 156 €.

create or replace function tests.test_b6_11_heures() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid; v_collab uuid;
  v_mo uuid; v_ch uuid; v_lot uuid; v_m uuid; v_s uuid; v_dem uuid; v_eq uuid; v_ali uuid; v_bruno uuid; v_chloe uuid;
  v_auj date := (now() at time zone 'Europe/Paris')::date;
  v_lundi date; v_r jsonb; v_h jsonb; k integer;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');
  v_collab := tests.b6_compte(v_client, 'collaborateur', 'b6-heures-collab@banc-varelo.test');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO des heures') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier des heures', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch, '01', 'Lot des heures', 'client') returning id into v_lot;
  v_m := public.btp_ecrire_marche(null, v_ch, jsonb_build_object('reference', 'HEU-1', 'mode_prix', 'forfait', 'montant_ht_declare', 1000, 'retenue_taux', 0));
  perform public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Travaux', 'unite_lue', 'forfait', 'nature', 'forfait', 'montant_ht', 1000, 'lot_id', v_lot));
  perform public.btp_verifier_marche(v_m);
  v_s := public.btp_ouvrir_situation(v_ch, current_date - 1);
  perform public.btp_avancer_situation((select l.id from public.btp_situations_lignes l where l.situation_id = v_s), 100);
  v_dem := public.btp_soumettre_situation(v_s);
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire) values (v_dem, v_client, v_daf, 'approuve', 'Heures (essai)');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.btp_valider_situation(v_s);

  insert into public.btp_equipes (client_id, nom) values (v_client, 'Pose B6 heures') returning id into v_eq;
  insert into public.btp_intervenants (client_id, nom, equipe_id) values (v_client, 'Ali Heures', v_eq) returning id into v_ali;
  insert into public.btp_intervenants (client_id, nom, equipe_id) values (v_client, 'Bruno Heures', v_eq) returning id into v_bruno;
  insert into public.btp_intervenants (client_id, nom) values (v_client, 'Chloé Heures') returning id into v_chloe;

  -- ── Les droits ──
  return next ok(not has_function_privilege('anon', 'public.btp_pointer(uuid, uuid, date, numeric, uuid, text)', 'execute'), 'anon ne pointe pas');
  return next ok(not has_table_privilege('authenticated', 'public.btp_pointages', 'insert'), 'Les heures ne s''écrivent que par la porte');
  return next ok(not has_function_privilege('authenticated', 'private.btp_rentabilite(uuid)', 'execute'), 'authenticated n''appelle pas la rentabilité privée');

  -- ── Pointer ──
  v_r := public.btp_pointer_equipe(v_ch, v_eq, v_auj - 1, 8, v_lot);
  return next is((v_r ->> 'pointes')::int, 2, 'L''équipe pointe sa journée : 2 intervenants à 8 h');
  v_r := public.btp_pointer(v_ch, v_ali, v_auj - 1, 11, v_lot);
  return next ok((v_r -> 'alertes') ->> 0 like 'Ali Heures : 11 h le %, au-delà de 10 h (L3121-18)%', 'Au-delà de 10 h : pointé, avec l''alerte');
  return next throws_ok(format('select public.btp_pointer(%L, %L, %L, 2)', v_ch, v_ali, v_auj - 1), '23514', null,
                        'Plus de 12 h dans la journée, tous lots confondus : refusé');
  return next throws_ok(format('select public.btp_pointer(%L, %L, %L, 8)', v_ch, v_ali, v_auj + 1), '22023', null, 'Un jour à venir : refusé');
  return next throws_ok(format('select public.btp_pointer(%L, %L, %L, 7.3)', v_ch, v_ali, v_auj - 1), '22023', null, 'Pas au quart d''heure : refusé');
  return next throws_ok(format('select public.btp_pointer(%L, %L, %L, 4, %L)', v_ch, v_ali, v_auj - 1, gen_random_uuid()), '22023', null, 'Un lot d''un autre chantier : refusé');
  v_r := public.btp_pointer(v_ch, v_ali, v_auj - 1, 8, v_lot);
  return next is((select count(*)::int || '/' || sum(p.heures) from public.btp_pointages p where p.intervenant_id = v_ali), '1/8.00',
                 'Corriger réécrit la même ligne (8 h)');

  -- ── Le collaborateur pointe, sans voir les coûts ──
  perform tests.endosser(v_collab, 'b6-heures-collab@banc-varelo.test');
  v_r := public.btp_pointer(v_ch, v_bruno, v_auj, 4, null, 'Rangement');
  return next is((v_r ->> 'heures')::numeric, 4::numeric, 'Le collaborateur pointe 4 h hors lot');
  v_h := public.btp_heures_chantier(v_ch);
  return next ok((v_h ->> 'voit_prix')::boolean is false and v_h ->> 'rentabilite' is null, 'Sans le droit de voir les prix : ni coût ni marge');
  return next throws_ok(format('select public.btp_poser_cout_horaire(%L, null, 50)', v_client), '42501', null, 'Le collaborateur ne pose pas de coût horaire');

  -- ── Les coûts horaires ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.btp_poser_cout_horaire(v_client, null, 35, v_auj - 90);
  perform public.btp_poser_cout_horaire(v_client, null, 38, v_auj - 90);
  perform public.btp_poser_cout_horaire(v_client, v_bruno, 45, v_auj - 90);
  return next is((select count(*)::int from public.btp_couts_horaires c where c.client_id = v_client), 2, 'Reposer un coût à la même date le remplace');
  return next throws_ok(format('select public.btp_poser_cout_horaire(%L, null, 0)', v_client), '22023', null, 'Un coût nul est refusé');
  perform tests.endosser(v_collab, 'b6-heures-collab@banc-varelo.test');
  return next is((select count(*)::int from public.btp_couts_horaires c where c.client_id = v_client), 0, 'Le collaborateur ne lit pas les coûts');

  -- ── La rentabilité ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_h := public.btp_heures_chantier(v_ch) -> 'rentabilite';
  return next is((v_h ->> 'facture_ht')::numeric || '/' || (v_h ->> 'heures')::numeric || '/' || (v_h ->> 'main_oeuvre_ht')::numeric || '/' || (v_h ->> 'marge_ht')::numeric,
                 '1000.00/20.00/844.00/156.00', 'Rentabilité : facturé 1 000, 20 h, main-d''œuvre 844, marge 156');
  return next is((select (x ->> 'main_oeuvre_ht')::numeric || '/' || (x ->> 'marge_ht')::numeric from jsonb_array_elements(v_h -> 'lots') x where x ->> 'lot_id' = v_lot::text),
                 '664.00/336.00', 'Le lot : main-d''œuvre 8 × 38 + 8 × 45 = 664, marge 336');

  -- ── 0 h efface ; la semaine ; les 48 h ──
  perform public.btp_pointer(v_ch, v_bruno, v_auj, 0);
  return next is((public.btp_heures_chantier(v_ch) ->> 'total_heures')::numeric, 16.00, 'Pointer 0 h retire la journée du total');
  v_lundi := v_auj - extract(isodow from v_auj)::integer + 1 - 7;
  for k in 0 .. 4 loop
    v_r := public.btp_pointer(v_ch, v_chloe, v_lundi + k, 10, v_lot);
  end loop;
  return next ok((v_r -> 'alertes') ->> 0 like 'Chloé Heures : 50 h dans la semaine du %, au-delà de 48 h (L3121-20).', 'Au-delà de 48 h dans la semaine : l''alerte');
  return next is((select count(*)::int from jsonb_array_elements(public.btp_heures_chantier(v_ch, v_lundi + 3) -> 'pointages') x where x ->> 'intervenant_id' = v_chloe::text), 5,
                 'La semaine demandée porte les 5 pointages de Chloé');
  perform tests.redevenir_admin();
  update public.btp_intervenants set actif = false where id = v_chloe;
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.btp_pointer(%L, %L, %L, 4)', v_ch, v_chloe, v_auj), '23514', null, 'Un intervenant inactif ne se pointe plus');
  perform tests.redevenir_admin();
  return next ok(tests.b6_journal(v_client, 'daliro.heures_pointees', v_ch::text) is not null, 'Les pointages sont au journal');
end $f$;

select * from runtests('tests'::name, '^test_b6_11_');
