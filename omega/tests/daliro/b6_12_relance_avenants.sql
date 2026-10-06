-- b6_12 — DALIRO : la relance des avenants non signés au point du matin (session B6, 06/10/2026), b6_18.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_18.
-- runtests() annule tout.
--
-- Trois avenants sur « Chantier des relances » : n° 1 validé (800 € HT) pas encore signé, n° 2 soumis en attente,
-- n° 3 en préparation. Le temps passe en appelant private.btp_point_matin_lignes avec un jour plus tardif.

create or replace function tests.test_b6_12_relance_avenants() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid;
  v_mo uuid; v_ch uuid; v_lot uuid; v_m uuid; v_av1 uuid; v_av2 uuid; v_av3 uuid; v_dem uuid;
  v_lignes jsonb;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO des relances') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier des relances', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch, '01', 'Lot des relances', 'client') returning id into v_lot;
  v_m := public.btp_ecrire_marche(null, v_ch, jsonb_build_object('reference', 'REL-1', 'mode_prix', 'forfait', 'montant_ht_declare', 1000, 'retenue_taux', 0));
  perform public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Travaux', 'unite_lue', 'forfait', 'nature', 'forfait', 'montant_ht', 1000, 'lot_id', v_lot));
  perform public.btp_verifier_marche(v_m);

  v_av1 := public.btp_ouvrir_avenant(v_ch, 'Deux portes de placard en plus');
  perform public.btp_chiffrer_ligne_avenant(v_av1, 2, null, v_lot, 'Porte de placard coulissante (relance)', 'u', 400);
  v_dem := public.btp_soumettre_avenant(v_av1);
  v_av2 := public.btp_ouvrir_avenant(v_ch, 'Seuil de la porte d''entrée');
  perform public.btp_chiffrer_ligne_avenant(v_av2, 1, null, v_lot, 'Seuil aluminium (relance)', 'u', 120);
  perform public.btp_soumettre_avenant(v_av2);
  v_av3 := public.btp_ouvrir_avenant(v_ch, 'Habillage du coffre de volet');
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, decision, commentaire) values (v_dem, 'approuve', 'Relance (essai)');
  perform tests.redevenir_admin();

  -- ── Aujourd'hui : seul l'avenant validé se relance ──
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_lignes
  from jsonb_array_elements(private.btp_point_matin_lignes(v_client, current_date)) x where x ->> 'texte' like 'Chantier des relances : avenant%';
  return next is(jsonb_array_length(v_lignes), 1, 'Aujourd''hui : une seule relance (l''avenant validé)');
  return next ok(v_lignes -> 0 ->> 'texte' like 'Chantier des relances : avenant n° 1 « Deux portes de placard en plus » (800,00 € HT) validé, pas encore signé : faites-le signer par le maître d''ouvrage avant d''exécuter (C. civ. art. 1793)'
                 and v_lignes -> 0 ->> 'gravite' = 'attention', 'Validé, pas signé : « faites-le signer », montant HT, attention');
  return next ok(v_lignes -> 0 ->> 'lien' = '/espace/daliro' and v_lignes -> 0 ->> 'objet_id' = v_ch::text, 'La ligne mène au chantier');

  -- ── Quinze jours plus tard : les trois ──
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_lignes
  from jsonb_array_elements(private.btp_point_matin_lignes(v_client, current_date + 15)) x where x ->> 'texte' like 'Chantier des relances : avenant%';
  return next is(jsonb_array_length(v_lignes), 3, 'Quinze jours plus tard : trois relances');
  return next ok(exists (select 1 from jsonb_array_elements(v_lignes) x where x ->> 'texte' like '%avenant n° 1 %pas encore signé%' and x ->> 'gravite' = 'critique'),
                 'Validé depuis plus de 14 jours sans signature : critique');
  return next ok(exists (select 1 from jsonb_array_elements(v_lignes) x where x ->> 'texte' like '%avenant n° 2 « Seuil de la porte d''entrée » en attente de validation depuis le %décidez dans « À valider »'
                                                                       and x ->> 'gravite' = 'attention'),
                 'Soumis, en attente depuis plus de 7 jours : attention');
  return next ok(exists (select 1 from jsonb_array_elements(v_lignes) x where x ->> 'texte' like '%avenant n° 3 « Habillage du coffre de volet » en préparation depuis le %ou abandonnez-le'
                                                                       and x ->> 'gravite' = 'info'),
                 'En préparation depuis plus de 7 jours : info');

  -- ── Signé : la relance disparaît ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.btp_signer_avenant(v_av1, null, current_date);
  perform tests.redevenir_admin();
  return next ok(not exists (select 1 from jsonb_array_elements(private.btp_point_matin_lignes(v_client, current_date + 15)) x where x ->> 'texte' like 'Chantier des relances : avenant n° 1 %'),
                 'Une fois signé, l''avenant n''est plus relancé');
end $f$;

select * from runtests('tests'::name, '^test_b6_12_');
