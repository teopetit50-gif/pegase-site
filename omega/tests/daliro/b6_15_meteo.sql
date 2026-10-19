-- b6_15 — DALIRO : l'alerte météo sur les tâches sensibles (session B6, 06/10/2026), b6_21.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_21.
-- runtests() annule tout. Aucun appel réseau : la prévision est rangée à partir d'une réponse Open-Meteo d'exemple,
-- comme private.btp_meteo_lire le fait d'une réponse reçue par pg_net.
--
-- Trois passages : « Couverture » extérieure (seuils par défaut), « Grue » extérieure (rafales 50 km/h, pluie 20 mm),
-- « Peinture intérieure ». Prévision : J+1 pluie 12,4 mm ; J+2 rafales 72 km/h ; J+3 gel −3 °C.

create or replace function tests.test_b6_15_meteo() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_mo uuid; v_ch uuid; v_autre uuid; v_lot uuid;
  v_j date := (now() at time zone 'Europe/Paris')::date;
  v_reponse jsonb; v_risques jsonb; v_m jsonb;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO de la météo') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut, latitude, longitude)
  values (v_client, 'Chantier de la météo', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert', 45.771944, 4.890171) returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch, '01', 'Lot de la météo', 'client') returning id into v_lot;
  insert into public.btp_passages (client_id, chantier_id, lot_id, tache, debut, fin, exterieur) values
    (v_client, v_ch, v_lot, 'Couverture', v_j, v_j + 4, true),
    (v_client, v_ch, v_lot, 'Peinture intérieure', v_j, v_j + 4, false);
  insert into public.btp_passages (client_id, chantier_id, lot_id, tache, debut, fin, exterieur, seuil_pluie_mm, seuil_vent_kmh)
  values (v_client, v_ch, v_lot, 'Grue', v_j + 2, v_j + 3, true, 20, 50);

  -- ── Les droits ──
  return next ok(not has_function_privilege('authenticated', 'private.btp_meteo_demander(timestamp with time zone)', 'execute'), 'authenticated ne déclenche pas de requête météo');
  return next ok(not has_table_privilege('authenticated', 'public.btp_meteo', 'insert'), 'La prévision ne s''écrit que par le serveur');

  -- ── L'adresse demandée : réglée, arrondie, modèle Météo-France ──
  perform tests.redevenir_admin();
  update private.reglages set valeur = 'https://api.open-meteo.com/v1/forecast' where cle = 'daliro_meteo_url';
  insert into private.reglages (cle, valeur) select 'daliro_meteo_url', 'https://api.open-meteo.com/v1/forecast'
  where not exists (select 1 from private.reglages where cle = 'daliro_meteo_url');
  return next ok(private.btp_meteo_adresse(45.77, 4.89) like 'https://api.open-meteo.com/v1/forecast?latitude=45.77&longitude=4.89&daily=precipitation_sum,wind_gusts_10m_max,temperature_2m_min,temperature_2m_max&timezone=Europe%2FParis&forecast_days=7&models=meteofrance_seamless%',
                 'L''adresse : position arrondie à 0,01°, données du jour, modèle Météo-France');
  update private.reglages set valeur = '' where cle = 'daliro_meteo_url';
  return next ok(private.btp_meteo_adresse(45.77, 4.89) is null, 'Sans adresse réglée, rien n''est demandé');

  -- ── La réponse rangée ──
  v_reponse := jsonb_build_object('daily', jsonb_build_object(
    'time', jsonb_build_array(v_j, v_j + 1, v_j + 2, v_j + 3),
    'precipitation_sum', jsonb_build_array(0.0, 12.4, 1.0, 0.2),
    'wind_gusts_10m_max', jsonb_build_array(20, 35, 72, 15),
    'temperature_2m_min', jsonb_build_array(6, 4, 2, -3),
    'temperature_2m_max', jsonb_build_array(14, 12, 10, 5)));
  return next is(jsonb_array_length(private.btp_meteo_lire_reponse(v_reponse)), 4, 'La réponse donne quatre jours');
  return next is(private.btp_meteo_lire_reponse(v_reponse) -> 1 ->> 'pluie_mm', '12.4', 'J+1 : 12,4 mm de pluie');
  insert into public.btp_meteo (chantier_id, client_id, entite_id, latitude, longitude, demande_id, demandee_le, recue_le, prevision)
  select c.id, c.client_id, c.entite_id, 45.77, 4.89, null, now(), now(), private.btp_meteo_lire_reponse(v_reponse) from public.btp_chantiers c where c.id = v_ch;

  -- ── Les risques ──
  v_risques := private.btp_risques_meteo(v_client, v_j, v_ch);
  return next is(jsonb_array_length(v_risques), 2, 'Deux passages à risque (la peinture intérieure ne compte pas)');
  return next ok(exists (select 1 from jsonb_array_elements(v_risques) x where x ->> 'texte' like 'Chantier de la météo, % ' || to_char(v_j + 1, 'DD/MM') || ' : pluie 12,4 mm (seuil 5) sur « Couverture » (extérieur) — décalez ou protégez'),
                 'Couverture : la pluie de J+1 dépasse le seuil par défaut (5 mm)');
  return next ok(exists (select 1 from jsonb_array_elements(v_risques) x where x ->> 'passage_id' = (select p.id::text from public.btp_passages p where p.chantier_id = v_ch and p.tache = 'Grue')
                                                                       and x ->> 'texte' like '%' || to_char(v_j + 2, 'DD/MM') || ' : rafales 72 km/h (seuil 50)%'),
                 'Grue : ses propres seuils ; rafales de J+2 au-dessus de 50 km/h');
  update public.btp_passages set statut = 'annule' where chantier_id = v_ch and tache = 'Grue';
  return next ok(exists (select 1 from jsonb_array_elements(private.btp_risques_meteo(v_client, v_j + 3, v_ch)) x where x ->> 'texte' like '%' || to_char(v_j + 3, 'DD/MM') || ' : gel, -3 °C sur « Couverture »%'),
                 'Le gel de J+3 est signalé (minimale sous 0 °C) — vu de J+3 : à J+2, les rafales de 72 km/h passent avant');

  -- ── L'alerte et le point du matin ──
  perform private.btp_alerter_meteo(v_ch);
  return next ok(exists (select 1 from public.alertes a where a.client_id = v_client and a.source = 'daliro_meteo' and a.titre like 'Météo — Chantier de la météo, %Couverture%'),
                 'Une alerte « Météo » est levée');
  perform private.btp_alerter_meteo(v_ch);
  return next is((select count(*)::int from public.alertes a where a.client_id = v_client and a.source = 'daliro_meteo' and a.acquittee_le is null
                    and a.titre like 'Météo — Chantier de la météo, %'), 1, 'Relancer n''en lève pas une deuxième (les alertes du banc déjà levées ne comptent pas)');
  return next ok(exists (select 1 from jsonb_array_elements(private.btp_point_matin_lignes(v_client, v_j)) x where x ->> 'texte' like 'Chantier de la météo, %pluie 12,4 mm%' and x ->> 'gravite' = 'attention'),
                 'Le point du matin la porte');

  -- ── L'écran ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_m := public.btp_meteo_chantier(v_ch);
  return next ok((v_m ->> 'localise')::boolean and jsonb_array_length(v_m -> 'prevision') = 4 and jsonb_array_length(v_m -> 'risques') = 1,
                 'L''écran lit la prévision et le risque restant');
  perform tests.redevenir_admin();
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier sans adresse localisée', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_autre;
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next ok(not (public.btp_meteo_chantier(v_autre) ->> 'localise')::boolean, 'Un chantier non localisé est dit tel');
end $f$;

select * from runtests('tests'::name, '^test_b6_15_');
