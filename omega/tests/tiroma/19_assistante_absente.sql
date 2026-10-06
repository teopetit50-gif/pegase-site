-- B3-19 — Assistante absente : les soins à basculer (b3_18). L'assistante du banc (Fauteuil 1) est absente ; un soin
-- prévu demain à 11 h 15 sur le Fauteuil 1 doit pouvoir basculer sur le Fauteuil 2 (équipé « soins », libre, avec Élodie).
-- Après 00, 00b, b3_01 à b3_18. runtests() annule tout.

create or replace function tests.test_b3_19_assistante_absente() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  r jsonb;
  x jsonb;
  s jsonb;
  v_fuseau text;
  j date;
  f1 uuid;
  f2 uuid;
  v_assistante uuid;
  v_elodie uuid;
  v_type uuid;
  v_rdv uuid;
  v_absence uuid;
  v_absence2 uuid;
begin
  r := tests.b3_cabinet_releve('initial');
  select en.fuseau into v_fuseau from public.entites en where en.id = entite;
  j := (now() at time zone v_fuseau)::date;
  select id into f1 from public.tiroma_fauteuils where entite_id = entite and nom = 'Fauteuil 1';
  select id into f2 from public.tiroma_fauteuils where entite_id = entite and nom = 'Fauteuil 2';
  select id into v_assistante from public.tiroma_membres where entite_id = entite and prenom = 'Assistante (banc)';
  select id into v_type from public.tiroma_types_rdv where entite_id = entite and libelle_source = 'Soin composite';

  -- Élodie, assistante du Fauteuil 2 ; un soin composite demain à 11 h 15 sur le Fauteuil 1 (le Fauteuil 2 est libre à
  -- cette heure : l'agenda du banc l'occupe à 9 h, 14 h, 14 h 30 et 16 h).
  perform tests.b3_endosser('gerant');
  insert into public.tiroma_membres (client_id, entite_id, prenom, fauteuil_habituel_id) values (banc, entite, 'Élodie', f2) returning id into v_elodie;
  perform tests.redevenir_admin();
  perform set_config('omega.tiroma_moteur', 'releve', true);
  insert into public.tiroma_rendez_vous (client_id, entite_id, source_ref, patient_id, fauteuil_id, type_rdv_id, debut, fin, statut)
  values (banc, entite, 'R-B3-19', (select id from public.tiroma_patients where entite_id = entite and source_ref = 'P009'), f1, v_type,
          (j + 1 + time '11:15') at time zone v_fuseau, (j + 1 + time '11:45') at time zone v_fuseau, 'prevu')
  returning id into v_rdv;
  perform set_config('omega.tiroma_moteur', '', true);

  -- Noter l'absence.
  perform tests.b3_endosser('daf');
  return next throws_ok(format('select public.tiroma_noter_absence_membre(%L, %L, %L, now(), now() + interval ''3 days'', ''conge'')', banc, entite, v_assistante),
                        '42501', null, 'le collaborateur ne note pas l''absence d''une assistante (42501)');
  perform tests.b3_endosser('referent');
  return next throws_ok(format('select public.tiroma_noter_absence_membre(%L, %L, %L, now(), now() - interval ''1 day'', ''conge'')', banc, entite, v_assistante),
                        '22023', null, 'une absence qui finit avant de commencer est refusée (22023)');
  return next throws_ok(format('select public.tiroma_noter_absence_membre(%L, %L, %L, now(), now() + interval ''1 day'', ''grippe'')', banc, entite, v_assistante),
                        '22023', null, 'un motif hors liste est refusé : aucune raison médicale n''est demandée (22023)');
  v_absence := public.tiroma_noter_absence_membre(banc, entite, v_assistante, now(), now() + interval '3 days', 'conge');
  return next ok(v_absence is not null, 'l''assistante note son absence (congé, trois jours)');

  -- Les soins à basculer.
  x := public.tiroma_soins_a_basculer(banc, entite, 7);
  return next is(jsonb_array_length(x), 1, 'une absence touche les sept prochains jours');
  return next is(x -> 0 ->> 'fauteuil_nom', 'Fauteuil 1', 'elle concerne le Fauteuil 1');
  select v into s from jsonb_array_elements(x -> 0 -> 'soins') v where (v ->> 'rendez_vous_id')::uuid = v_rdv;
  return next ok(s is not null, 'le soin composite de demain 11 h 15 est à basculer');
  return next ok(exists (select 1 from jsonb_array_elements(s -> 'vers') v where v ->> 'fauteuil_nom' = 'Fauteuil 2' and v ->> 'assistante' = 'Élodie'),
                 'vers le Fauteuil 2, avec Élodie');
  return next ok(not exists (select 1 from jsonb_array_elements(s -> 'vers') v where v ->> 'fauteuil_nom' = 'Fauteuil 3'),
                 'pas vers le Fauteuil 3 : personne pour y assister');
  return next ok(not exists (select 1 from jsonb_array_elements(x -> 0 -> 'soins') v, jsonb_array_elements(v -> 'vers') w
                             where (w ->> 'fauteuil_id')::uuid = f1), 'jamais vers le fauteuil de l''absente');

  -- Élodie absente aussi : plus de fauteuil où basculer.
  v_absence2 := public.tiroma_noter_absence_membre(banc, entite, v_elodie, now(), now() + interval '2 days', 'formation');
  x := public.tiroma_soins_a_basculer(banc, entite, 7);
  select v into s from jsonb_array_elements(x) a, jsonb_array_elements(a -> 'soins') v where (v ->> 'rendez_vous_id')::uuid = v_rdv;
  return next is(jsonb_array_length(s -> 'vers'), 0, 'Élodie absente aussi : aucun fauteuil avec une assistante présente');

  -- Clore l'absence : elle cesse de jouer.
  perform public.tiroma_retirer_absence_membre(v_absence);
  perform public.tiroma_retirer_absence_membre(v_absence2);
  x := public.tiroma_soins_a_basculer(banc, entite, 7);
  return next is(jsonb_array_length(x), 0, 'absences closes : plus rien à basculer');
  return next ok(exists (select 1 from public.tiroma_absences_membres a where a.id = v_absence and a.close_le is not null),
                 'l''absence est close, pas effacée (l''historique reste)');

  perform tests.b3_endosser('daf2');
  return next throws_ok(format('select public.tiroma_soins_a_basculer(%L, %L)', banc, entite), '42501', null, 'daf2 ne lit rien (42501)');
  return next is((select count(*) from public.tiroma_absences_membres), 0::bigint, 'ni ne voit une absence');
  perform tests.b3_endosser('gerant');
  return next ok(exists (select 1 from public.journal_opposable where client_id = banc and action = 'tiroma.absence_membre_notee'), 'journal : « tiroma.absence_membre_notee »');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b3_19_');
