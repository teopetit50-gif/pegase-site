-- c3_41 (et le lot socle c3_41a) — un envoi INTERNE urgent saute le seul verrou HORS_HEURES ; un envoi interne ordinaire
-- et un envoi à un tiers restent différés ; REPUT ne marque urgents que le récapitulatif quand une urgence attend et
-- l'avis d'astreinte épuisée. Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_40 et les migrations
-- c3_01 à c3_41a. Rien n'est envoyé (mode essai). runtests() annule tout.

create or replace function tests.test_c3_41_urgent_hors_heures() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; v_dem uuid;
  v_hors timestamptz := '2026-10-27 02:00:00+00';   -- mardi, 3 h à Paris
  v_dans timestamptz := '2026-10-27 09:00:00+00';   -- mardi, 10 h à Paris
  base jsonb; interne_urgent public.envois; interne public.envois; tiers public.envois;
  r_dans jsonb; r_hors jsonb;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid;
  perform tests.redevenir_admin();
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  v_gerant := tests.c3_compte(v_client, 'gerant', 'c3-41-gerant@banc-varelo.test');
  perform public.reput_installer(v_client);

  -- ── Le socle (c3_41a) : verrous_envoi, à 3 h et à 10 h ──
  base := jsonb_build_object('id', gen_random_uuid(), 'client_id', v_client, 'module', 'reput', 'canal', 'email', 'mode', 'essai',
    'statut', 'a_valider', 'transactionnel', true, 'donnees_sante', false, 'espacement', false, 'sujet', 'Essai C3-41', 'corps', 'Essai.',
    'destinataire_adresse', 'c3-41-gerant@banc-varelo.test', 'destinataire_langue', 'fr', 'destinataire_fuseau', 'Europe/Paris',
    'destinataire_territoire', 'metropole', 'cle_idempotence', 'c3-41-essai', 'cree_le', v_dans, 'echeance', v_dans + interval '7 days');
  interne_urgent := jsonb_populate_record(null::public.envois, base || jsonb_build_object('direct', true, 'destinataire_membre', v_gerant, 'urgent', true));
  interne := jsonb_populate_record(null::public.envois, base || jsonb_build_object('direct', true, 'destinataire_membre', v_gerant, 'urgent', false));
  tiers := jsonb_populate_record(null::public.envois, base || jsonb_build_object('direct', false, 'urgent', true,
                                                                                   'destinataire_adresse', 'client-c3-41@exemple.test'));
  r_dans := private.verrous_envoi(interne_urgent, true, v_dans);
  r_hors := private.verrous_envoi(interne_urgent, true, v_hors);
  return next ok(coalesce(r_hors ->> 'code', '') <> 'HORS_HEURES' and (r_hors ->> 'code') is not distinct from (r_dans ->> 'code'),
                 'Interne urgent : à 3 h, les mêmes verrous qu''à 10 h, sans HORS_HEURES' || coalesce(' [à 10 h : ' || (r_dans ->> 'code') || ']', ''));
  r_dans := private.verrous_envoi(interne, true, v_dans);
  return next is(case when r_dans is null then private.verrous_envoi(interne, true, v_hors) ->> 'code' else 'HORS_HEURES' end, 'HORS_HEURES',
                 'Interne NON urgent : différé HORS_HEURES' || coalesce(' [à 10 h déjà : ' || (r_dans ->> 'code') || ']', ''));
  r_dans := private.verrous_envoi(tiers, true, v_dans);
  return next is(case when r_dans is null then private.verrous_envoi(tiers, true, v_hors) ->> 'code' else 'HORS_HEURES' end, 'HORS_HEURES',
                 'Envoi à un TIERS, même marqué urgent : différé HORS_HEURES' || coalesce(' [à 10 h déjà : ' || (r_dans ->> 'code') || ']', ''));
  perform set_config('omega.envoi_interne_urgent', 'on', true);
  return next ok(coalesce(private.verrous_envoi(tiers, true, v_hors) ->> 'code', '') is not distinct from coalesce(r_dans ->> 'code', 'HORS_HEURES'),
                 'Le drapeau de transaction ne libère jamais un envoi à un tiers');
  return next ok(private.envoi_interne_urgent(interne), 'Le drapeau marque un envoi interne');
  perform set_config('omega.envoi_interne_urgent', 'off', true);
  return next ok(not private.envoi_interne_urgent(interne) and not private.envoi_interne_urgent(tiers), 'Sans drapeau ni colonne : rien d''urgent ; un tiers jamais');

  -- ── REPUT : le récapitulatif d'une urgence est urgent ──
  v_dem := tests.c3_15_demande(v_client, 'email', 'c3-41a@exemple.test', 'Fictif Urgent', 'Fuite de gaz dans la cuisine !');
  perform public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'autre', 'langue', 'fr', 'couverte', false, 'urgence', true,
           'corps', 'Votre demande est transmise à notre équipe.'));
  perform private.reput_prevenir_decideurs(now());
  return next ok(exists (select 1 from public.envois e where e.client_id = v_client and e.cle_idempotence like 'reput.a_valider.urgent:' || v_gerant::text || ':%'
                         and e.urgent and e.destinataire_membre = v_gerant),
                 'Une urgence attend : le récapitulatif part URGENT, avec sa propre clé');
  return next ok(coalesce(current_setting('omega.envoi_interne_urgent', true), '') <> 'on', 'Le drapeau est retombé après l''envoi');

  -- ── REPUT : l'avis d'astreinte épuisée ──
  update public.reput_demandes set astreinte_epuisee_le = now() where id = v_dem;
  return next ok(exists (select 1 from public.envois e where e.client_id = v_client
                         and e.cle_idempotence = 'reput.astreinte_epuisee:' || v_dem::text || ':' || v_gerant::text and e.urgent),
                 'Astreinte épuisée : le gérant reçoit l''avis, URGENT');
end $f$;

select * from runtests('tests'::name, '^test_c3_41_');
