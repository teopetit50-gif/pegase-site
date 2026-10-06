-- b6_21 — DALIRO : l'avancement lu dans les photos, proposé à la situation (session B6, 06/10/2026), b6_25.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_25.
-- runtests() annule tout. Le lecteur n'est pas appelé : ses lectures « avancement » (nature demandée à A1) sont
-- posées sur les messages rangés comme public.daliro_media_lu le ferait.
--
-- Le chantier : marché vérifié, lot 01, L1 « Menuiseries extérieures » 5 000 €, L2 « Garde-corps » 3 000 €.
-- Les lectures : menuiseries 30 % (il y a 5 jours) ; hier, menuiseries 60 % avec photo, garde-corps 0 %, carrelage 40 %
-- (aucune ligne) ; menuiseries 90 % dans trois jours, après la période (ignorée).

create or replace function tests.test_b6_21_avancement() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_collab uuid;
  v_mo uuid; v_ch uuid; v_lot uuid; v_m uuid; v_l1 uuid; v_l2 uuid; v_s uuid; v_sl1 uuid;
  v_r jsonb; v_rec bigint := -floor(random() * 1000000000)::bigint;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');
  v_collab := tests.b6_compte(v_client, 'collaborateur', 'b6-avancement-collab@banc-varelo.test');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO de l''avancement') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier de l''avancement', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch, '01', 'Lot de l''avancement', 'client') returning id into v_lot;
  v_m := public.btp_ecrire_marche(null, v_ch, jsonb_build_object('reference', 'AVA-1', 'mode_prix', 'unitaire', 'montant_ht_declare', 8000, 'retenue_taux', 0));
  v_l1 := public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Menuiseries extérieures', 'unite_lue', 'u', 'quantite', 100, 'prix_unitaire_ht', 50, 'montant_ht', 5000, 'lot_id', v_lot));
  v_l2 := public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Garde-corps', 'unite_lue', 'u', 'quantite', 10, 'prix_unitaire_ht', 300, 'montant_ht', 3000, 'lot_id', v_lot));
  perform public.btp_verifier_marche(v_m);
  v_s := public.btp_ouvrir_situation(v_ch, current_date);
  select id into v_sl1 from public.btp_situations_lignes where situation_id = v_s and ligne_marche_id = v_l1;

  -- ── Les lectures rangées sur le chantier ──
  perform tests.redevenir_admin();
  insert into public.btp_messages (client_id, reception_id, chantier_id, canal, de_nom, pieces, statut, recu_le, lecture) values
   (v_client, v_rec, v_ch, 'whatsapp', 'Chef d''équipe', jsonb_build_array(jsonb_build_object('chemin', 'ava/1.jpg', 'mime', 'image/jpeg')), 'range', now() - interval '5 days',
    '{"demandes": [{"nature": "avancement", "lot_code": "01", "ouvrage": "menuiseries", "pourcentage": 30, "source": {"media": 1}}]}'),
   (v_client, v_rec - 1, v_ch, 'whatsapp', 'Chef d''équipe', jsonb_build_array(jsonb_build_object('chemin', 'ava/2.ogg', 'mime', 'audio/ogg'), jsonb_build_object('chemin', 'ava/2.jpg', 'mime', 'image/jpeg')), 'range', now() - interval '1 day',
    '{"demandes": [{"nature": "avancement", "lot_code": "01", "ouvrage": "Menuiseries posées", "pourcentage": 60, "source": {"media": 2, "extrait": "les fenêtres du R+1 sont posées"}},
                   {"nature": "avancement", "lot_code": "01", "ouvrage": "garde-corps", "pourcentage": 0},
                   {"nature": "avancement", "ouvrage": "carrelage", "pourcentage": 40},
                   {"nature": "travail_supplementaire", "texte": "reprise d''enduit", "quantite": 2}]}'),
   (v_client, v_rec - 2, v_ch, 'whatsapp', 'Chef d''équipe', '[]', 'range', now() + interval '3 days',
    '{"demandes": [{"nature": "avancement", "lot_code": "01", "ouvrage": "menuiseries", "pourcentage": 90}]}');

  -- ── Les droits ──
  return next ok(not has_function_privilege('anon', 'public.btp_avancement_photos(uuid)', 'execute'), 'anon ne lit pas les propositions');
  return next ok(not has_function_privilege('authenticated', 'private.btp_mots_ouvrage(text)', 'execute'), 'Le découpage en mots reste au serveur');
  perform tests.endosser(v_collab, 'b6-avancement-collab@banc-varelo.test');
  return next throws_ok(format('select public.btp_avancement_photos(%L)', v_s), '42501', null, 'Un collaborateur sans les prix ne lit pas les propositions');

  -- ── Les propositions ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_r := public.btp_avancement_photos(v_s);
  return next is(jsonb_array_length(v_r -> 'propositions'), 1, 'Une proposition : les menuiseries (le garde-corps à 0 % ne fait rien avancer)');
  return next is((v_r -> 'propositions' -> 0 ->> 'ligne') || '/' || (v_r -> 'propositions' -> 0 ->> 'actuel') || '/' || (v_r -> 'propositions' -> 0 ->> 'propose'),
                 v_sl1::text || '/0.00/60.00', 'La lecture la plus récente l''emporte : 60 %, pas 30 %, ni 90 % lu après la période');
  return next is((v_r -> 'propositions' -> 0 ->> 'photo') || ' — ' || (v_r -> 'propositions' -> 0 ->> 'extrait'), 'ava/2.jpg — les fenêtres du R+1 sont posées',
                 'Avec la photo citée par la lecture et l''extrait');
  return next is((select string_agg(x ->> 'ouvrage', ',') from jsonb_array_elements(v_r -> 'non_rattaches') x), 'carrelage',
                 'Le carrelage, sans lot ni ligne, est rendu à part');

  -- ── Rien ne s'applique seul ; reprise par la porte existante ──
  return next is((select avancement from public.btp_situations_lignes where id = v_sl1), 0.00::numeric, 'La proposition n''a rien appliqué');
  perform public.btp_avancer_situation(v_sl1, 60);
  return next is(jsonb_array_length(public.btp_avancement_photos(v_s) -> 'propositions'), 0, 'Reprise : plus rien à proposer');
  perform public.btp_soumettre_situation(v_s);
  return next is(public.btp_avancement_photos(v_s) ->> 'motif', 'situation déjà soumise ou validée', 'Une situation soumise ne reçoit plus de proposition');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b6_21_');
