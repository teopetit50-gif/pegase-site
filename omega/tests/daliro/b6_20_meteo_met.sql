-- b6_20 — DALIRO : la météo par MET Norway (session B6, 06/10/2026), b6_21b.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_24b (dont b6_21b).
-- runtests() annule tout. Aucun appel réseau : une réponse Locationforecast 2.0 d'exemple est lue comme celle reçue
-- par pg_net.

create or replace function tests.b6_met_lire(p jsonb) returns jsonb
language sql security definer set search_path to '' as $$ select private.btp_meteo_lire_met(p) $$;
create or replace function tests.b6_met_risques(p_client uuid, p_jour date, p_chantier uuid) returns jsonb
language sql security definer set search_path to '' as $$ select private.btp_risques_meteo(p_client, p_jour, p_chantier) $$;

create or replace function tests.test_b6_20_meteo_met() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_mo uuid; v_ch uuid; v_lot uuid;
  v_j date := (now() at time zone 'Europe/Paris')::date;
  v_rep jsonb; v_jours jsonb; v_r jsonb;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');

  -- ── L'adresse et le fournisseur ──
  update private.reglages set valeur = 'https://api.met.no/weatherapi/locationforecast/2.0/compact' where cle = 'daliro_meteo_url';
  insert into private.reglages (cle, valeur) select 'daliro_meteo_url', 'https://api.met.no/weatherapi/locationforecast/2.0/compact'
  where not exists (select 1 from private.reglages where cle = 'daliro_meteo_url');
  return next is(private.btp_meteo_adresse(45.771944, 4.890171), 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=45.77&lon=4.89',
                 'MET Norway : lat et lon seules, deux décimales (quatre au plus exigées)');
  return next is(private.btp_meteo_fournisseur(), 'met_norway', 'Le fournisseur se lit dans l''adresse');

  -- ── La lecture : jours de Paris, pluie horaire puis par 6 heures, vent en km/h ──
  -- J+1 : deux heures (1,5 + 2 mm ; vent 12,5 m/s = 45 km/h ; 3 et 6 °C) ; 22 h 30 Z de J+1 = J+2 à Paris en heure d'été
  -- ou J+1 en hiver : on ne l'utilise pas. J+3 : un pas de 6 heures (pas de next_1_hours) : 4,2 mm, -2 °C.
  v_rep := jsonb_build_object('properties', jsonb_build_object('timeseries', jsonb_build_array(
    jsonb_build_object('time', (v_j + 1)::text || 'T08:00:00Z', 'data', jsonb_build_object(
      'instant', jsonb_build_object('details', jsonb_build_object('air_temperature', 3, 'wind_speed', 12.5)),
      'next_1_hours', jsonb_build_object('details', jsonb_build_object('precipitation_amount', 1.5)),
      'next_6_hours', jsonb_build_object('details', jsonb_build_object('precipitation_amount', 9)))),
    jsonb_build_object('time', (v_j + 1)::text || 'T09:00:00Z', 'data', jsonb_build_object(
      'instant', jsonb_build_object('details', jsonb_build_object('air_temperature', 6, 'wind_speed', 8)),
      'next_1_hours', jsonb_build_object('details', jsonb_build_object('precipitation_amount', 2)))),
    jsonb_build_object('time', (v_j + 3)::text || 'T06:00:00Z', 'data', jsonb_build_object(
      'instant', jsonb_build_object('details', jsonb_build_object('air_temperature', -2, 'wind_speed', 2)),
      'next_6_hours', jsonb_build_object('details', jsonb_build_object('precipitation_amount', 4.2)))))));
  v_jours := tests.b6_met_lire(v_rep);
  return next is(jsonb_array_length(v_jours), 2, 'Deux jours de prévision');
  return next is(v_jours -> 0 ->> 'jour' || '/' || (v_jours -> 0 ->> 'pluie_mm') || '/' || (v_jours -> 0 ->> 'vent_kmh') || '/' || (v_jours -> 0 ->> 'tmin') || '/' || (v_jours -> 0 ->> 'tmax'),
                 (v_j + 1)::text || '/3.5/45/3.0/6.0', 'J+1 : 3,5 mm (les heures, pas le cumul de 6 h), vent 45 km/h, 3 à 6 °C');
  return next is(v_jours -> 1 ->> 'pluie_mm' || '/' || (v_jours -> 1 ->> 'tmin'), '4.2/-2.0', 'J+3 : le pas de 6 heures compte quand il n''y a plus d''heure');
  return next ok(v_jours -> 0 -> 'rafales_kmh' = 'null'::jsonb, 'Pas de rafales chez MET Norway hors de Scandinavie');

  -- ── Les risques : vent moyen à partir des deux tiers du seuil ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO de MET') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut, latitude, longitude)
  values (v_client, 'Chantier MET', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert', 45.771944, 4.890171) returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch, '01', 'Lot MET', 'client') returning id into v_lot;
  insert into public.btp_passages (client_id, chantier_id, lot_id, tache, debut, fin, exterieur) values (v_client, v_ch, v_lot, 'Couverture MET', v_j, v_j + 4, true);
  perform tests.redevenir_admin();
  insert into public.btp_meteo (chantier_id, client_id, entite_id, latitude, longitude, demandee_le, recue_le, prevision, fournisseur)
  select c.id, c.client_id, c.entite_id, 45.77, 4.89, now(), now(), v_jours, 'met_norway' from public.btp_chantiers c where c.id = v_ch;
  v_r := tests.b6_met_risques(v_client, v_j, v_ch);
  return next ok(v_r -> 0 ->> 'texte' like 'Chantier MET, % ' || to_char(v_j + 1, 'DD/MM') || ' : vent moyen 45 km/h, rafales probables au-delà de 60 sur « Couverture MET » (extérieur) — décalez ou protégez',
                 'Vent moyen 45 km/h (≥ 40) : rafales probables au-delà de 60, dit tel quel');
  return next ok(exists (select 1 from jsonb_array_elements(tests.b6_met_risques(v_client, v_j + 3, v_ch)) x where x ->> 'texte' like '%gel, -2 °C%'),
                 'Le gel de J+3 vu de J+3');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next is(public.btp_meteo_chantier(v_ch) ->> 'fournisseur', 'met_norway', 'L''écran sait qu''il faut citer MET Norway');
end $f$;

select * from runtests('tests'::name, '^test_b6_20_');
