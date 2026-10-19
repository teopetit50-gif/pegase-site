-- c3_21 — REPUT : le bloc rendez-vous côté base (créneaux, durée par type, rappel, replanification), sans agenda.
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_20 (aides tests.c3_*, dont tests.c3_15_demande de
-- c3_15) et les migrations c3_01 à c3_21. Contacts fictifs. Banc en essai : rien ne part pour de vrai. runtests() annule tout.

create or replace function tests.test_c3_21_rendez_vous() returns setof text
language plpgsql as $f$
declare
  banc jsonb; jeu jsonb;
  v_client uuid; v_gerant uuid; v_collab uuid; v_lecteur uuid; v_autre uuid; v_lyon uuid; v_dem uuid;
  v_c jsonb; s1 timestamptz; s2 timestamptz; s3 timestamptz; v_j jsonb; v_rdv uuid; v_rdv2 uuid; v_rdv3 uuid; v_r public.reput_rdv; v_corps text;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid;
  perform tests.redevenir_admin();
  v_gerant := tests.c3_compte(v_client, 'gerant', 'c3-21-gerant@banc-varelo.test');
  v_collab := tests.c3_compte(v_client, 'collaborateur', 'c3-21-collab@banc-varelo.test');
  v_lecteur := tests.c3_compte(v_client, 'lecteur', 'c3-21-lecteur@banc-varelo.test');
  insert into public.entites (client_id, nom, type) values (v_client, 'Agence de Lyon (C3-21)', 'site') returning id into v_lyon;
  jeu := tests.jeu();
  v_autre := (jeu ->> 'gerant_a')::uuid;
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);
  v_dem := tests.c3_15_demande(v_client, 'email', 'c3-21@exemple.test', 'Fictif Rendez-vous', 'Pouvez-vous passer pour un diagnostic ?');

  -- ── Régler : types, plages ──
  return next ok(not has_function_privilege('anon', 'public.reput_poser_rdv(uuid, uuid, text, timestamptz, uuid, text)', 'execute'),
                 'anon ne pose pas de rendez-vous');
  perform tests.endosser(v_collab, 'c3-21-collab@banc-varelo.test');
  return next throws_ok(format('select public.reput_regler_type_rdv(%L, %L, %L, 60)', v_client, 'diagnostic', 'Diagnostic'), '42501', null,
                        'Un collaborateur ne règle pas les types de rendez-vous');
  perform tests.endosser(v_gerant, 'c3-21-gerant@banc-varelo.test');
  return next throws_ok(format('select public.reput_regler_type_rdv(%L, %L, %L, 0)', v_client, 'nul', 'Nul'), '23514', null,
                        'Une durée hors de 5 à 480 minutes est refusée');
  perform public.reput_regler_type_rdv(v_client, 'diagnostic', 'Diagnostic', 60, 24);
  perform public.reput_regler_type_rdv(v_client, 'court', 'Passage court', 30, 0);
  perform public.reput_regler_plages(v_client, null, (select jsonb_agg(jsonb_build_object('jour', j, 'debut', '08:00', 'fin', '18:00'))
                                                       from generate_series(1, 7) j));
  return next is((select count(*)::int from public.reput_rdv_plages p where p.client_id = v_client and p.entite_id is null and p.actif), 7,
                 'Sept plages actives (08 h - 18 h chaque jour)');

  -- ── Les créneaux libres ──
  perform tests.endosser(v_collab, 'c3-21-collab@banc-varelo.test');
  v_c := public.reput_creneaux_libres(v_client, null, 'diagnostic', null, 5) -> 'creneaux';
  return next is(jsonb_array_length(v_c), 5, 'Cinq créneaux libres proposés');
  s1 := (v_c -> 0 ->> 'debut')::timestamptz; s2 := (v_c -> 1 ->> 'debut')::timestamptz; s3 := (v_c -> 2 ->> 'debut')::timestamptz;
  return next ok(s1 >= now() + interval '1 hour' and s2 > s1 and (v_c -> 0 ->> 'fin')::timestamptz = s1 + interval '60 minutes',
                 'À partir d''une heure d''ici, dans l''ordre, au pas de la durée du type (60 min)');
  return next ok(extract(hour from s1 at time zone 'Europe/Paris') between 8 and 17, 'Dans les plages, à l''heure du site');

  -- ── Poser ──
  v_j := public.reput_poser_rdv(v_client, null, 'diagnostic', s1, v_dem);
  v_rdv := (v_j ->> 'rdv')::uuid;
  select * into v_r from public.reput_rdv x where x.id = v_rdv;
  return next ok((v_j ->> 'pose')::boolean and v_r.fin = s1 + interval '60 minutes' and v_r.statut = 'confirme',
                 'Le rendez-vous est posé, pour la durée du type');
  return next ok(v_r.canal = 'email' and v_r.adresse = 'c3-21@exemple.test' and v_r.client_nom = 'Fictif Rendez-vous' and v_r.demande_id = v_dem,
                 'Rattaché à la demande : nom, canal et adresse du client');
  return next is(v_r.rappel_le, s1 - interval '24 hours', 'Le rappel est prévu au délai du type (24 h avant)');
  v_j := public.reput_poser_rdv(v_client, null, 'diagnostic', s1);
  return next ok(not (v_j ->> 'pose')::boolean and jsonb_array_length(v_j -> 'suivants') = 3 and (v_j -> 'suivants' -> 0 ->> 'debut')::timestamptz > s1,
                 'Créneau déjà pris : rien n''est posé, les trois suivants sont proposés');
  return next ok(not exists (select 1 from jsonb_array_elements(public.reput_creneaux_libres(v_client, null, 'diagnostic', null, 10) -> 'creneaux') c
                             where (c ->> 'debut')::timestamptz = s1),
                 'Le créneau pris n''est plus proposé');
  return next ok(not (public.reput_poser_rdv(v_client, null, 'court', s1 + interval '30 minutes') ->> 'pose')::boolean,
                 'Deux rendez-vous ne se chevauchent jamais sur un même planning');
  perform tests.redevenir_admin();
  return next ok(tests.c3_journal(v_client, 'reput.rdv_pose', v_rdv::text) is not null, 'Journal : reput.rdv_pose');

  -- ── Qui ──
  perform tests.endosser(v_lecteur, 'c3-21-lecteur@banc-varelo.test');
  return next throws_ok(format('select public.reput_poser_rdv(%L, null, %L, %L::timestamptz)', v_client, 'diagnostic', s2), '42501', null,
                        'Un lecteur ne pose pas de rendez-vous');
  perform tests.endosser(v_autre, 'a5-gerant-a@essai.invalid');
  return next throws_ok(format('select public.reput_creneaux_libres(%L, null, %L)', v_client, 'diagnostic'), '42501', null,
                        'Une autre organisation ne lit pas le planning');
  return next is(tests.compter('public', 'reput_rdv', format('client_id = %L', v_client))::int, 0, 'Une autre organisation ne lit pas les rendez-vous');

  -- ── Fermer ──
  perform tests.endosser(v_gerant, 'c3-21-gerant@banc-varelo.test');
  v_j := public.reput_fermer(v_client, null, s2, s2 + interval '1 hour', 'Formation (C3-21)');
  return next ok(not exists (select 1 from jsonb_array_elements(public.reput_creneaux_libres(v_client, null, 'diagnostic', null, 10) -> 'creneaux') c
                             where (c ->> 'debut')::timestamptz = s2),
                 'Une fermeture retire ses créneaux');
  return next is((public.reput_fermer(v_client, null, s1 - interval '10 minutes', s1 + interval '10 minutes') ->> 'rdv_a_replanifier')::int, 1,
                 'Une fermeture sur un rendez-vous posé le dit (à replanifier par une personne)');

  -- ── Replanifier, annuler ──
  perform tests.endosser(v_collab, 'c3-21-collab@banc-varelo.test');
  v_j := public.reput_replanifier_rdv(v_rdv, s3, 'Le client préfère plus tard');
  v_rdv2 := (v_j ->> 'rdv')::uuid;
  return next ok((v_j ->> 'pose')::boolean and (select x.statut from public.reput_rdv x where x.id = v_rdv) = 'replanifie'
                 and (select x.remplace from public.reput_rdv x where x.id = v_rdv2) = v_rdv,
                 'Replanifié : l''ancien rendez-vous est remplacé par le nouveau');
  return next is((select x.rappel_le from public.reput_rdv x where x.id = v_rdv2), s3 - interval '24 hours', 'Le rappel suit la nouvelle heure');
  return next ok((public.reput_annuler_rdv(v_rdv2, 'Annulé par le client') ->> 'annule')::boolean, 'Annulé');
  return next ok(exists (select 1 from jsonb_array_elements(public.reput_creneaux_libres(v_client, null, 'diagnostic', null, 10) -> 'creneaux') c
                             where (c ->> 'debut')::timestamptz = s3),
                 'Annulé : le créneau redevient libre');

  -- ── Le rappel ──
  v_rdv3 := (public.reput_poser_rdv(v_client, null, 'diagnostic', s3, v_dem) ->> 'rdv')::uuid;
  perform tests.redevenir_admin();
  perform private.reput_rappeler_rdv(now());
  select * into v_r from public.reput_rdv x where x.id = v_rdv3;
  select e.corps into v_corps from public.envois e where e.id = v_r.rappel_envoi;
  return next ok(v_r.rappel_envoi is not null, 'Au délai du rappel, le message au client est préparé');
  return next ok(v_corps like '%Nous vous rappelons votre rendez-vous « Diagnostic » le %' and v_corps like '%répondre à ce message%',
                 'Le rappel dit le type, la date et l''heure, et comment le déplacer');
  return next is((select e.statut from public.envois e where e.id = v_r.rappel_envoi), 'a_valider',
                 'Sans accord « reput.rappel_rdv », le rappel attend la validation');
  return next ok(not exists (select 1 from public.envois e where e.cle_idempotence = 'reput:rappel_rdv:' || v_rdv2::text),
                 'Un rendez-vous annulé n''a pas de rappel');
  perform private.reput_rappeler_rdv(now() + interval '15 minutes');
  return next is((select count(*)::int from public.envois e where e.cle_idempotence = 'reput:rappel_rdv:' || v_rdv3::text), 1,
                 'Rejoué, le rappel ne repart pas');

  -- ── Un site a son propre planning ──
  perform tests.endosser(v_collab, 'c3-21-collab@banc-varelo.test');
  return next is(public.reput_creneaux_libres(v_client, v_lyon, 'diagnostic') -> 'creneaux', '[]'::jsonb,
                 'Un site sans plages n''offre aucun créneau (son planning est le sien)');
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from cron.job j where j.jobname = 'reput-rdv-rappels'), 'La tâche reput-rdv-rappels est posée');
end $f$;

select * from runtests('tests'::name, '^test_c3_21_');
