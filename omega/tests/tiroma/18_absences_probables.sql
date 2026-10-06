-- B3-18 — Les absences probables (b3_17) : un score à règles, chaque point avec sa raison ; la confirmation au rappel
-- l'efface, un NON au rappel est rendu à part. Après 00, 00b, b3_01 à b3_17. runtests() annule tout.

create or replace function tests.test_b3_18_absences_probables() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  r jsonb;
  x jsonb;
  e jsonb;
  v_fuseau text;
  j date;
  v_absent uuid;
  v_nouveau uuid;
  v_rdv_absent uuid;
  v_rdv_nouveau uuid;
begin
  r := tests.b3_cabinet_releve('initial');
  select en.fuseau into v_fuseau from public.entites en where en.id = entite;
  j := (now() at time zone v_fuseau)::date;

  -- Deux patients fictifs : Jean Absent (deux manqués en 2026) et Lina Nouvelle (jamais venue, rendez-vous pris il y a 90 jours).
  perform tests.redevenir_admin();
  perform set_config('omega.tiroma_moteur', 'releve', true);
  insert into public.tiroma_patients (client_id, entite_id, source_ref, nom, prenom) values (banc, entite, 'P-B3-18-A', 'Absent', 'Jean') returning id into v_absent;
  insert into public.tiroma_patients (client_id, entite_id, source_ref, nom, prenom) values (banc, entite, 'P-B3-18-N', 'Nouvelle', 'Lina') returning id into v_nouveau;
  insert into public.tiroma_rendez_vous (client_id, entite_id, source_ref, patient_id, debut, fin, statut) values
    (banc, entite, 'R-B3-18-1', v_absent, (j - 60 + time '10:00') at time zone v_fuseau, (j - 60 + time '10:30') at time zone v_fuseau, 'manque'),
    (banc, entite, 'R-B3-18-2', v_absent, (j - 30 + time '10:00') at time zone v_fuseau, (j - 30 + time '10:30') at time zone v_fuseau, 'manque');
  insert into public.tiroma_rendez_vous (client_id, entite_id, source_ref, patient_id, debut, fin, statut)
  values (banc, entite, 'R-B3-18-3', v_absent, (j + 1 + time '10:00') at time zone v_fuseau, (j + 1 + time '10:30') at time zone v_fuseau, 'prevu')
  returning id into v_rdv_absent;
  insert into public.tiroma_rendez_vous (client_id, entite_id, source_ref, patient_id, debut, fin, statut, cree_source_le)
  values (banc, entite, 'R-B3-18-4', v_nouveau, (j + 2 + time '16:00') at time zone v_fuseau, (j + 2 + time '16:30') at time zone v_fuseau, 'prevu',
          (j - 88 + time '09:00') at time zone v_fuseau)
  returning id into v_rdv_nouveau;
  perform set_config('omega.tiroma_moteur', '', true);

  -- Qui lit.
  perform tests.b3_endosser('daf2');
  return next throws_ok(format('select public.tiroma_absences_probables(%L, %L)', banc, entite), '42501', null, 'daf2, sans profil, ne lit rien (42501)');
  perform tests.b3_endosser('referent');
  return next throws_ok(format('select public.tiroma_absences_probables(%L, %L, 0)', banc, entite), '22023', null, 'un horizon nul est refusé (22023)');

  x := public.tiroma_absences_probables(banc, entite, 3);
  select v into e from jsonb_array_elements(x) v where (v ->> 'rendez_vous_id')::uuid = v_rdv_absent;
  return next is(e ->> 'niveau', 'fort', 'Jean Absent, deux manqués en 18 mois : absence probable « forte »');
  return next ok((e -> 'raisons') ? '2 rendez-vous manqués en 18 mois', 'la raison est dite : « 2 rendez-vous manqués en 18 mois »');
  return next is(e ->> 'patient_nom', 'Jean Absent', 'l''assistante voit son nom');
  select v into e from jsonb_array_elements(x) v where (v ->> 'rendez_vous_id')::uuid = v_rdv_nouveau;
  return next ok(e is not null and (e ->> 'score')::integer >= 2, format('Lina Nouvelle est listée (score %s)', e ->> 'score'));
  return next ok((e -> 'raisons') ? 'nouveau patient' and (e -> 'raisons') ? 'pris il y a 90 jours', 'raisons : nouveau patient, pris il y a 90 jours');
  return next ok(not exists (select 1 from jsonb_array_elements(x) v where (v ->> 'score')::integer < 2 and v ->> 'niveau' <> 'annonce'),
                 'rien sous 2 points n''est listé');
  return next ok((x -> 0 ->> 'score')::integer >= (x -> -1 ->> 'score')::integer, 'du plus probable au moins probable');

  -- Jean confirme au rappel : −3, il sort de la liste. Lina répond NON : rendue à part, « a annoncé son absence ».
  perform tests.redevenir_admin();
  insert into public.tiroma_reponses_rappels (client_id, entite_id, patient_id, rendez_vous_id, envoi_id, reception_id, reponse)
  values (banc, entite, v_absent, v_rdv_absent, gen_random_uuid(), -1801, 'confirme'),
         (banc, entite, v_nouveau, v_rdv_nouveau, gen_random_uuid(), -1802, 'annule');
  perform tests.b3_endosser('referent');
  x := public.tiroma_absences_probables(banc, entite, 3);
  return next ok(not exists (select 1 from jsonb_array_elements(x) v where (v ->> 'rendez_vous_id')::uuid = v_rdv_absent),
                 'Jean a confirmé au rappel : il n''est plus listé');
  select v into e from jsonb_array_elements(x) v where (v ->> 'rendez_vous_id')::uuid = v_rdv_nouveau;
  return next is(e ->> 'niveau', 'annonce', 'Lina a répondu NON : « annonce »');
  return next is(x -> 0 ->> 'rendez_vous_id', v_rdv_nouveau::text, 'les absences annoncées viennent en tête');

  -- L'horizon : à un jour, le rendez-vous de Lina (J+2) n'est pas regardé.
  x := public.tiroma_absences_probables(banc, entite, 1);
  return next ok(not exists (select 1 from jsonb_array_elements(x) v where (v ->> 'rendez_vous_id')::uuid = v_rdv_nouveau), 'à un jour, J+2 n''est pas regardé');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b3_18_');
