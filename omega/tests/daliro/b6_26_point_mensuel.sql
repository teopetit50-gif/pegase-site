-- b6_26 — DALIRO : le point mensuel (session B6, 11/10/2026), b6_30.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_30.
-- runtests() annule tout. Le chantier : marché vérifié de 8 000 € HT ; un avenant repéré par le lecteur (brouillon) ;
-- un avenant du bureau de 180 € HT, signé ; une situation validée qui en facture la moitié (90 €).

create or replace function tests.test_b6_26_point_mensuel() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid; v_collab uuid;
  v_mo uuid; v_ch uuid; v_lot uuid; v_m uuid; v_av uuid; v_av2 uuid; v_dem uuid; v_s uuid; v_r jsonb; v_c jsonb;
  v_mois date := (now() at time zone 'Europe/Paris')::date;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');
  v_collab := tests.b6_compte(v_client, 'collaborateur', 'b6-point-collab@banc-varelo.test');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO du point mensuel') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier du point mensuel', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch, '01', 'Lot du point', 'client') returning id into v_lot;
  v_m := public.btp_ecrire_marche(null, v_ch, jsonb_build_object('reference', 'PM-1', 'mode_prix', 'forfait', 'montant_ht_declare', 8000, 'retenue_taux', 0));
  perform public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Travaux', 'unite_lue', 'forfait', 'nature', 'forfait', 'montant_ht', 8000, 'lot_id', v_lot));
  perform public.btp_verifier_marche(v_m);

  -- L'avenant repéré par le lecteur (brouillon) et celui du bureau, chiffré puis signé.
  v_av := public.btp_ouvrir_avenant(v_ch, 'Reprise de chape (repérée sur photo)', jsonb_build_object('canal', 'photo', 'lecteur', true));
  perform public.btp_chiffrer_ligne_avenant(v_av, 4, null, v_lot, 'Reprise de chape', 'm2', 25);
  v_av2 := public.btp_ouvrir_avenant(v_ch, 'Garde-corps provisoire');
  perform public.btp_chiffrer_ligne_avenant(v_av2, 12, null, v_lot, 'Dépose du garde-corps provisoire', 'ml', 15);
  v_dem := public.btp_soumettre_avenant(v_av2);
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire) values (v_dem, v_client, v_daf, 'approuve', 'Avenant (point mensuel)');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.btp_signer_avenant(v_av2);

  -- ── Les droits ──
  return next ok(not has_function_privilege('anon', 'public.btp_point_mensuel(uuid, date)', 'execute'), 'anon ne lit pas le point mensuel');
  perform tests.endosser(v_collab, 'b6-point-collab@banc-varelo.test');
  return next throws_ok(format('select public.btp_point_mensuel(%L)', v_client), '42501', null, 'Un collaborateur ne lit pas le point mensuel');

  -- ── Le mois en cours ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_r := public.btp_point_mensuel(v_client, v_mois);
  select x into v_c from jsonb_array_elements(v_r -> 'chantiers') x where x ->> 'chantier' = v_ch::text;
  return next is(v_r ->> 'mois', to_char(v_mois, 'YYYY-MM'), 'Le mois demandé');
  return next is((v_c -> 'reperes' ->> 'nombre') || '/' || (v_c -> 'reperes' ->> 'montant_ht')::numeric, '1/100.00', 'Repéré par le lecteur : 1 avenant, 100 € HT (4 m² × 25 €)');
  return next is((v_c -> 'signes' ->> 'nombre') || '/' || (v_c -> 'signes' ->> 'montant_ht')::numeric || '/' || (v_c ->> 'saisis'), '1/180.00/1',
                 'Signé dans le mois : 1 avenant, 180 € HT ; saisi par le bureau : 1');
  return next is((v_c ->> 'signe_total')::numeric || '/' || (v_c ->> 'facture_total')::numeric || '/' || (v_c ->> 'reste_a_facturer')::numeric, '180.00/0/180.00',
                 'Rien encore facturé : 180 € restent à facturer');

  -- ── Une situation validée en facture la moitié ──
  v_s := public.btp_ouvrir_situation(v_ch, current_date);
  perform public.btp_avancer_situation((select l.id from public.btp_situations_lignes l where l.situation_id = v_s and l.origine = 'avenant'), 50);
  v_dem := public.btp_soumettre_situation(v_s);
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire) values (v_dem, v_client, v_daf, 'approuve', 'Situation (point mensuel)');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.btp_valider_situation(v_s);
  select x into v_c from jsonb_array_elements(public.btp_point_mensuel(v_client, v_mois) -> 'chantiers') x where x ->> 'chantier' = v_ch::text;
  return next is((v_c ->> 'facture_total')::numeric || '/' || (v_c ->> 'reste_a_facturer')::numeric, '90.00/90.00',
                 'La situation validée facture 90 € de l''avenant : 90 € restent à facturer');

  -- ── Le mois précédent : le chantier n'y figure pas ──
  return next ok(not exists (select 1 from jsonb_array_elements(public.btp_point_mensuel(v_client, (v_mois - interval '1 month')::date) -> 'chantiers') x
                             where x ->> 'chantier' = v_ch::text), 'Le mois précédent, rien à dire de ce chantier');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b6_26_');
