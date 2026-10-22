-- c3_39 — REPUT, TREPUT-15 : un appel d'astreinte qui n'a jamais sonné reste « non_passe » : pas d'escalade, pas
-- d'épuisement, une alerte au gérant ; repris par l'ouvrier à son retour. Exécutable tel quel par execute_sql sur la
-- RECETTE, après c3_00 à c3_38 et les migrations c3_01 à c3_39. Numéros fictifs ; aucun appel réel. runtests() annule tout.

create or replace function tests.test_c3_39_astreinte_non_passe() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; m1 uuid; m2 uuid; v_dem uuid; v_j jsonb; v_t timestamptz := now();
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid;
  perform tests.redevenir_admin();
  v_gerant := tests.c3_compte(v_client, 'gerant', 'c3-39-gerant@banc-varelo.test');
  m1 := tests.c3_compte(v_client, 'collaborateur', 'c3-39-m1@banc-varelo.test');
  m2 := tests.c3_compte(v_client, 'collaborateur', 'c3-39-m2@banc-varelo.test');
  perform public.reput_installer(v_client);
  perform tests.endosser(v_gerant, 'c3-39-gerant@banc-varelo.test');
  perform public.reput_regler_astreinte(v_client, true, 10);
  perform public.reput_poser_garde(v_client, null, m1, '06 00 00 03 91', v_t - interval '1 hour', v_t + interval '1 day', 1);
  perform public.reput_poser_garde(v_client, null, m2, '06 00 00 03 92', v_t - interval '1 hour', v_t + interval '1 day', 2);
  perform tests.redevenir_admin();

  -- ── Aucun ouvrier : l'appel n'est jamais pris ──
  v_dem := tests.c3_15_demande(v_client, 'email', 'c3-39a@exemple.test', 'Fictif Panne', 'Le compteur électrique fume.');
  update public.reput_demandes set urgence = true where id = v_dem;
  v_j := private.reput_astreinte(v_t + interval '11 minutes');
  return next is((select statut from public.reput_appels where demande_id = v_dem and rang = 1), 'non_passe',
                 'Jamais pris au délai : « non_passe », pas « sans_reponse »');
  return next ok(not exists (select 1 from public.reput_appels where demande_id = v_dem and rang = 2), 'Pas d''escalade : le rang 2 ne sonnerait pas davantage');
  return next ok((select astreinte_epuisee_le is null from public.reput_demandes where id = v_dem), 'Pas d''astreinte « épuisée »');
  return next ok(exists (select 1 from public.alertes a where a.client_id = v_client and a.titre like 'L''appel d''astreinte n''a pas pu partir%Fictif Panne%'),
                 'Le gérant est alerté : l''appel n''a pas pu partir');
  return next ok(tests.c3_journal(v_client, 'reput.astreinte_non_passee', v_dem::text) is not null
                 and tests.c3_journal(v_client, 'reput.astreinte_epuisee', v_dem::text) is null,
                 'Le journal dit « non passé », jamais « épuisée »');
  perform private.reput_astreinte(v_t + interval '25 minutes');
  return next is((select count(*)::int from public.alertes a where a.client_id = v_client and a.titre like 'L''appel d''astreinte n''a pas pu partir%Fictif Panne%'), 1,
                 'Une seule alerte, même si la panne dure');

  -- ── Pris par l'ouvrier sans nouvelle de Twilio : non passé aussi ──
  update public.reput_appels set statut = 'en_cours', essai_le = v_t + interval '26 minutes' where demande_id = v_dem and rang = 1;
  perform private.reput_astreinte(v_t + interval '37 minutes');
  return next is((select statut from public.reput_appels where demande_id = v_dem and rang = 1), 'non_passe', 'Pris sans « sonne » : non passé');

  -- ── L'ouvrier revient : l'appel part ──
  v_j := public.reput_appels_a_passer(10, v_t + interval '38 minutes');
  return next ok(exists (select 1 from jsonb_array_elements(v_j) x where x ->> 'telephone' = '+33600000391'), 'Un appel non passé est repris par l''ouvrier');
  perform tests.endosser(v_gerant, 'c3-39-gerant@banc-varelo.test');
  return next ok(exists (select 1 from public.reput_astreinte_suivi s where s.demande_id = v_dem and s.etat = 'Appel en cours'), 'Le suivi le montre en cours');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_c3_39_');
