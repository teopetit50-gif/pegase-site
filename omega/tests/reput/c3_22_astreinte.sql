-- c3_22 — REPUT : l'astreinte téléphonique (tour de garde, appel, escalade, prise en charge).
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_21 (aides tests.c3_*, dont tests.c3_15_demande de
-- c3_15) et les migrations c3_01 à c3_22. Numéros fictifs (+33 6 00 00 00 0x). Aucun appel réel. runtests() annule tout.

create or replace function tests.test_c3_22_astreinte() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; m1 uuid; m2 uuid; v_lecteur uuid; g1 uuid; g2 uuid;
  v_d1 uuid; v_d2 uuid; v_d3 uuid; v_d4 uuid; v_j jsonb; v_t timestamptz := now();
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid;
  perform tests.redevenir_admin();
  v_gerant := tests.c3_compte(v_client, 'gerant', 'c3-22-gerant@banc-varelo.test');
  m1 := tests.c3_compte(v_client, 'collaborateur', 'c3-22-m1@banc-varelo.test');
  m2 := tests.c3_compte(v_client, 'collaborateur', 'c3-22-m2@banc-varelo.test');
  v_lecteur := tests.c3_compte(v_client, 'lecteur', 'c3-22-lecteur@banc-varelo.test');
  perform public.reput_installer(v_client);

  -- ── Régler, poser la garde ──
  perform tests.endosser(m1, 'c3-22-m1@banc-varelo.test');
  return next throws_ok(format('select public.reput_regler_astreinte(%L, true)', v_client), '42501', null, 'Un collaborateur ne règle pas l''astreinte');
  perform tests.endosser(v_gerant, 'c3-22-gerant@banc-varelo.test');
  perform public.reput_regler_astreinte(v_client, true, 10);
  g1 := (public.reput_poser_garde(v_client, null, m1, '06 00 00 00 01', v_t - interval '1 hour', v_t + interval '1 day', 1) ->> 'garde')::uuid;
  g2 := (public.reput_poser_garde(v_client, null, m2, '+33600000002', v_t - interval '1 hour', v_t + interval '1 day', 2) ->> 'garde')::uuid;
  return next is((select telephone from public.reput_gardes where id = g1), '+33600000001', 'Le numéro est rangé au format international');
  return next throws_ok(format('select public.reput_poser_garde(%L, null, %L, %L, now(), now() + interval ''1 day'')', v_client, v_lecteur, '+33600000003'),
                        '22023', null, 'Un lecteur n''est pas de garde');
  return next throws_ok(format('select public.reput_poser_garde(%L, null, %L, %L, now(), now() + interval ''1 day'')', v_client, m1, '12'),
                        '22023', null, 'Un numéro mal formé est refusé (c3_37 : en clair)');

  -- ── Qui lit la garde (numéros) ──
  perform tests.endosser(m1, 'c3-22-m1@banc-varelo.test');
  return next is(tests.compter('public', 'reput_gardes', format('client_id = %L', v_client))::int, 1, 'Le membre de garde ne lit que sa garde');
  perform tests.endosser(v_lecteur, 'c3-22-lecteur@banc-varelo.test');
  return next is(tests.compter('public', 'reput_gardes', format('client_id = %L', v_client))::int, 0, 'Un lecteur ne lit pas les numéros de garde');
  perform tests.redevenir_admin();

  -- ── Une urgence : le rang 1 est appelé ──
  v_d1 := tests.c3_15_demande(v_client, 'email', 'c3-22a@exemple.test', 'Fictif Urgence', 'Fuite d''eau sous l''évier, ça coule partout.');
  update public.reput_demandes set urgence = true where id = v_d1;
  v_j := private.reput_astreinte(v_t);
  return next ok(exists (select 1 from public.reput_appels a where a.demande_id = v_d1 and a.rang = 1
                                                          and a.user_id = m1 and a.statut = 'a_appeler'),
                 'Une urgence non prise : le rang 1 de la garde est appelé');
  v_j := public.reput_appels_a_passer(10, v_t);
  return next ok(exists (select 1 from jsonb_array_elements(v_j) x where x ->> 'telephone' = '+33600000001' and x ? 'organisation' and not x ? 'demande'),
                 'L''ouvrier reçoit le numéro et l''organisation, rien de la demande');
  return next ok(not exists (select 1 from jsonb_array_elements(public.reput_appels_a_passer(10, v_t)) x where x ->> 'telephone' = '+33600000001'),
                 'Un appel n''est pris qu''une fois');
  perform tests.endosser(m1, 'c3-22-m1@banc-varelo.test');
  return next throws_ok('select public.reput_appels_a_passer()', '42501', null, 'Une personne connectée ne prend pas les appels de l''ouvrier');
  perform tests.redevenir_admin();

  -- ── Sans prise au délai : le rang 2 ──
  v_j := private.reput_astreinte(v_t + interval '5 minutes');
  return next ok(not exists (select 1 from public.reput_appels a where a.demande_id = v_d1 and a.rang = 2), 'Avant le délai, on attend');
  v_j := private.reput_astreinte(v_t + interval '11 minutes');
  return next ok((select a.statut from public.reput_appels a where a.demande_id = v_d1 and a.rang = 1) = 'sans_reponse'
                 and exists (select 1 from public.reput_appels a where a.demande_id = v_d1 and a.rang = 2 and a.user_id = m2),
                 'Au délai sans prise : le rang 1 est noté sans réponse, le rang 2 est appelé');
  v_j := public.reput_appels_a_passer(10, v_t + interval '11 minutes');
  perform public.reput_appel_issue((select a.id from public.reput_appels a where a.demande_id = v_d1 and a.rang = 2), 'pris', 'CA-essai-c3-22');
  return next ok((select urgence_prise_par = m2 and urgence_prise_le is not null from public.reput_demandes where id = v_d1),
                 'Touche 1 : l''urgence est prise par le membre appelé');
  return next ok(tests.c3_journal(v_client, 'reput.urgence_prise', v_d1::text) is not null, 'Journal : reput.urgence_prise');
  return next is((private.reput_astreinte(v_t + interval '30 minutes') ->> 'escalades')::int
                 + (select count(*)::int from public.reput_appels a where a.demande_id = v_d1 and a.rang > 2), 0,
                 'Prise : plus aucun appel');
  return next throws_ok(format('select public.reput_appel_issue(%L, %L)', (select a.id from public.reput_appels a where a.demande_id = v_d1 and a.rang = 1), 'decroche'),
                        '22023', null, 'Une issue inconnue est refusée');

  -- ── Tous les rangs épuisés ──
  v_d2 := tests.c3_15_demande(v_client, 'email', 'c3-22b@exemple.test', 'Fictif Urgence B', 'Plus de chauffage, bébé à la maison.');
  update public.reput_demandes set urgence = true where id = v_d2;
  perform private.reput_astreinte(v_t);
  perform public.reput_appel_issue((select a.id from public.reput_appels a where a.demande_id = v_d2 and a.rang = 1), 'echec');
  perform private.reput_astreinte(v_t + interval '1 minute');
  return next ok(exists (select 1 from public.reput_appels a where a.demande_id = v_d2 and a.rang = 2),
                 'Un appel qui n''aboutit pas passe aussitôt au rang suivant');
  perform private.reput_astreinte(v_t + interval '12 minutes');
  return next ok((select astreinte_epuisee_le is not null from public.reput_demandes where id = v_d2)
                 and tests.c3_journal(v_client, 'reput.astreinte_epuisee', v_d2::text) is not null,
                 'Tous les rangs sans prise : astreinte épuisée, et le journal le dit');

  -- ── Prendre depuis l'espace ──
  v_d3 := tests.c3_15_demande(v_client, 'email', 'c3-22c@exemple.test', 'Fictif Urgence C', 'Porte d''entrée bloquée, impossible de sortir.');
  update public.reput_demandes set urgence = true where id = v_d3;
  perform private.reput_astreinte(v_t);
  perform tests.endosser(v_lecteur, 'c3-22-lecteur@banc-varelo.test');
  return next throws_ok(format('select public.reput_prendre_urgence(%L)', v_d3), '42501', null, 'Un lecteur ne prend pas une urgence');
  perform tests.endosser(m2, 'c3-22-m2@banc-varelo.test');
  return next ok((public.reput_prendre_urgence(v_d3) ->> 'prise')::boolean, 'Un membre prend l''urgence depuis l''espace');
  perform tests.redevenir_admin();
  return next ok(not exists (select 1 from public.reput_appels a where a.demande_id = v_d3 and a.statut in ('a_appeler', 'en_cours', 'sonne')),
                 'Prise depuis l''espace : les appels en attente sont clos');

  -- ── Sans garde ; astreinte coupée ──
  perform tests.endosser(v_gerant, 'c3-22-gerant@banc-varelo.test');
  perform public.reput_retirer_garde(g1);
  perform public.reput_retirer_garde(g2);
  perform tests.redevenir_admin();
  v_d4 := tests.c3_15_demande(v_client, 'email', 'c3-22d@exemple.test', 'Fictif Urgence D', 'Vitrine cassée cette nuit.');
  update public.reput_demandes set urgence = true where id = v_d4;
  perform private.reput_astreinte(v_t);
  return next ok(exists (select 1 from public.reput_appels a where a.demande_id = v_d4 and a.statut = 'sans_garde')
                 and tests.c3_journal(v_client, 'reput.astreinte_sans_garde', v_d4::text) is not null,
                 'Sans garde en cours : noté une fois, et le journal le dit');
  perform tests.endosser(v_gerant, 'c3-22-gerant@banc-varelo.test');
  perform public.reput_regler_astreinte(v_client, false);
  perform tests.redevenir_admin();
  update public.reput_demandes set urgence = true where id = (select tests.c3_15_demande(v_client, 'email', 'c3-22e@exemple.test', 'Fictif E', 'Inondation.'));
  return next is((private.reput_astreinte(v_t) ->> 'lances')::int, 0, 'Astreinte coupée : personne n''est appelé');
  return next ok(exists (select 1 from cron.job j where j.jobname = 'reput-astreinte'), 'La tâche reput-astreinte est posée');
end $f$;

select * from runtests('tests'::name, '^test_c3_22_');
