-- c3_40 — REPUT, TREPUT-16 et TREPUT-17 : une astreinte épuisée alerte le gérant (l'écran la met en tête) ; le
-- dépôt prend un verrou par contact (deux messages à la même seconde ne passent plus tous deux au modèle) ; le résumé de
-- la file distingue « en partie dans la base » de « hors base ». Exécutable tel quel par execute_sql sur la RECETTE, après
-- c3_00 à c3_39 et les migrations c3_01 à c3_40. Numéros fictifs ; aucun appel réel. runtests() annule tout.

create or replace function tests.test_c3_40_astreinte_epuisee_course() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; m1 uuid; m2 uuid; v_dem uuid; v_j jsonb; v_dv uuid; v_fiche uuid; v_t timestamptz := now();
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid;
  perform tests.redevenir_admin();
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  v_gerant := tests.c3_compte(v_client, 'gerant', 'c3-40-gerant@banc-varelo.test');
  m1 := tests.c3_compte(v_client, 'collaborateur', 'c3-40-m1@banc-varelo.test');
  m2 := tests.c3_compte(v_client, 'collaborateur', 'c3-40-m2@banc-varelo.test');
  perform public.reput_installer(v_client);
  perform tests.endosser(v_gerant, 'c3-40-gerant@banc-varelo.test');
  perform public.reput_regler_astreinte(v_client, true, 10);
  perform public.reput_poser_garde(v_client, null, m1, '06 00 00 04 01', v_t - interval '1 hour', v_t + interval '1 day', 1);
  perform public.reput_poser_garde(v_client, null, m2, '06 00 00 04 02', v_t - interval '1 hour', v_t + interval '1 day', 2);
  perform tests.redevenir_admin();

  -- ── TREPUT-16 : les deux gardes en échec → épuisée, alerte, validation en tête ──
  v_dem := tests.c3_15_demande(v_client, 'email', 'c3-40a@exemple.test', 'Fictif Épuisé', 'Le ballon d''eau chaude fuit au plafond.');
  v_j := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'autre', 'langue', 'fr', 'couverte', false, 'urgence', true,
           'corps', 'Votre demande est transmise à notre équipe.'));
  v_dv := (v_j ->> 'demande_validation')::uuid;
  perform public.reput_appel_issue((select id from public.reput_appels where demande_id = v_dem and rang = 1), 'echec');
  perform private.reput_astreinte(v_t + interval '1 minute');
  perform public.reput_appel_issue((select id from public.reput_appels where demande_id = v_dem and rang = 2), 'echec');
  perform private.reput_astreinte(v_t + interval '2 minutes');
  return next ok((select astreinte_epuisee_le is not null from public.reput_demandes where id = v_dem), 'Les deux rangs en échec : astreinte épuisée');
  return next ok(exists (select 1 from public.alertes a where a.client_id = v_client and a.niveau = 'critique'
                         and a.titre like 'Urgence sans personne de garde : Fictif Épuisé%'), 'Le gérant reçoit une alerte critique');
  perform private.reput_astreinte(v_t + interval '3 minutes');
  return next is((select count(*)::int from public.alertes a where a.client_id = v_client and a.titre like 'Urgence sans personne de garde : Fictif Épuisé%'), 1,
                 'Une seule alerte');

  -- ── TREPUT-17 : le verrou par contact est pris avant la création de la demande ──
  return next ok(pg_get_functiondef('public.reput_commencer(bigint)'::regprocedure) like '%pg_advisory_xact_lock%reput_cles_contact%',
                 'reput_commencer met en file deux dépôts du même contact (verrou de transaction)');

  -- ── Le résumé : des fiches citées sans tout couvrir ──
  perform tests.endosser(v_gerant, 'c3-40-gerant@banc-varelo.test');
  v_fiche := (public.reput_ecrire_connaissance(null, v_client, jsonb_build_object('sujet', 'horaires', 'genre', 'horaires',
    'titre', 'Horaires (C3-40)', 'contenu', 'Du lundi au vendredi de 8 h 30 à 18 h.', 'source', 'Gérant')) ->> 'id')::uuid;
  perform tests.redevenir_admin();
  update public.reput_connaissances set statut = 'validee' where id = v_fiche and statut <> 'validee';
  v_dem := tests.c3_15_demande(v_client, 'email', 'c3-40b@exemple.test', 'Fictif Résumé', 'Ouvert samedi, et le prix d''un ramonage ?');
  v_j := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'horaires', 'langue', 'fr', 'couverte', false,
           'sources', jsonb_build_array(v_fiche), 'corps', 'Nous sommes ouverts du lundi au vendredi ; pour le ramonage, notre équipe revient vers vous.'));
  return next ok((select resume like '%(en partie dans la base : à relire)' from public.demandes_validation where id = (v_j ->> 'demande_validation')::uuid),
                 'Fiches citées sans tout couvrir : « en partie dans la base », pas « hors base »');
  v_dem := tests.c3_15_demande(v_client, 'email', 'c3-40c@exemple.test', 'Fictif Hors', 'Faites-vous les piscines ?');
  v_j := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'autre', 'langue', 'fr', 'couverte', false, 'corps', 'Notre équipe revient vers vous.'));
  return next ok((select resume like '%(hors base : à compléter)' from public.demandes_validation where id = (v_j ->> 'demande_validation')::uuid),
                 'Aucune fiche : « hors base : à compléter »');
end $f$;

select * from runtests('tests'::name, '^test_c3_40_');
