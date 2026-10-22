-- c3_37 — REPUT, TREPUT-10 et TREPUT-11 : l'astreinte refuse en clair ; une demande qui devient urgente lance l'astreinte
-- aussitôt. Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_36 et les migrations c3_01 à c3_37.
-- Numéros fictifs. Aucun appel réel. runtests() annule tout.

create or replace function tests.test_c3_37_astreinte_clair() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; m1 uuid; v_lecteur uuid; v_dem uuid; v_t timestamptz := now();
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid;
  perform tests.redevenir_admin();
  v_gerant := tests.c3_compte(v_client, 'gerant', 'c3-37-gerant@banc-varelo.test');
  m1 := tests.c3_compte(v_client, 'collaborateur', 'c3-37-m1@banc-varelo.test');
  v_lecteur := tests.c3_compte(v_client, 'lecteur', 'c3-37-lecteur@banc-varelo.test');
  perform public.reput_installer(v_client);
  perform tests.endosser(v_gerant, 'c3-37-gerant@banc-varelo.test');

  -- ── TREPUT-10 : les refus disent la règle ──
  return next throws_like(format('select public.reput_regler_astreinte(%L, true, 1)', v_client), '%de 2 à 60 minutes%', 'Délai de 1 minute : la règle est dite');
  return next throws_like(format('select public.reput_poser_garde(%L, null, %L, %L, now(), now() + interval ''1 day'')', v_client, m1, 'abc'),
                          '%Numéro de garde illisible%', 'Téléphone « abc » : le refus le dit');
  return next throws_like(format('select public.reput_poser_garde(%L, null, %L, %L, now() + interval ''1 day'', now())', v_client, m1, '0600000037'),
                          '%fin de la garde%est avant son début%', 'Début après la fin : le refus le dit (c3_38 : le constat)');
  return next throws_like(format('select public.reput_poser_garde(%L, null, %L, %L, now(), now() + interval ''1 day'')', v_client,
                                 '00000000-0000-4000-8000-0000000c3037', '0600000037'),
                          '%n''appartient pas à l''organisation%invitez-le%', 'Membre inconnu : ce qui manque est dit');
  return next throws_like(format('select public.reput_poser_garde(%L, null, %L, %L, now(), now() + interval ''1 day'')', v_client, v_lecteur, '0600000037'),
                          '%est lecteur%', 'Lecteur : le rôle qui manque est dit');
  return next throws_like(format('select public.reput_poser_garde(%L, null, %L, %L, now(), now() + interval ''1 day'', 9)', v_client, m1, '0600000037'),
                          '%de 1%à 5%', 'Rang 9 : la règle est dite');

  -- ── TREPUT-11 : l'urgence lance l'astreinte sans attendre la minute ──
  perform public.reput_regler_astreinte(v_client, true, 10);
  perform public.reput_poser_garde(v_client, null, m1, '06 00 00 00 37', v_t - interval '1 hour', v_t + interval '1 day', 1);
  perform tests.redevenir_admin();
  v_dem := tests.c3_15_demande(v_client, 'email', 'c3-37a@exemple.test', 'Fictif Urgence', 'Le tableau électrique fume.');
  return next ok(not exists (select 1 from public.reput_appels a where a.demande_id = v_dem), 'Pas urgente : aucun appel');
  update public.reput_demandes set urgence = true where id = v_dem;
  return next ok(exists (select 1 from public.reput_appels a where a.demande_id = v_dem and a.rang = 1 and a.user_id = m1 and a.statut = 'a_appeler'),
                 'Devenue urgente : le rang 1 est à appeler aussitôt, sans attendre la tâche');
end $f$;

select * from runtests('tests'::name, '^test_c3_37_');
