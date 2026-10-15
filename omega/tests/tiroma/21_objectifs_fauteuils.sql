-- B3-21 — Les objectifs par fauteuil (b3_20) : l'occupation réalisée des semaines passées, prévue pour la semaine en
-- cours et la suivante, comparée à l'objectif du fauteuil. Après 00, 00b, b3_01 à b3_20. runtests() annule tout.

create or replace function tests.test_b3_21_objectifs_fauteuils() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  r jsonb;
  x jsonb;
  x2 jsonb;
  v_fuseau text;
  v_territoire text;
  j date;
  v_lundi date;
  d_passe date;
  d_futur date;
  f3 uuid;
  v_patient uuid;
  avant numeric;
  apres numeric;
begin
  r := tests.b3_cabinet_releve('initial');
  select en.fuseau into v_fuseau from public.entites en where en.id = entite;
  j := (now() at time zone v_fuseau)::date;
  v_lundi := date_trunc('week', j)::date;
  v_territoire := private.territoire_de_entite(banc, entite);
  select id into f3 from public.tiroma_fauteuils where entite_id = entite and nom = 'Fauteuil 3';
  select id into v_patient from public.tiroma_patients where entite_id = entite and source_ref = 'P001';
  select g::date into d_passe from generate_series(v_lundi - 7, v_lundi - 3, interval '1 day') g
  where not public.jour_ferie(g::date, v_territoire) order by g limit 1;
  select g::date into d_futur from generate_series(v_lundi + 7, v_lundi + 11, interval '1 day') g
  where not public.jour_ferie(g::date, v_territoire) order by g limit 1;

  -- Qui lit : le titulaire seul.
  perform tests.b3_endosser('referent');
  return next throws_ok(format('select public.tiroma_objectifs_fauteuils(%L, %L)', banc, entite), '42501', null, 'l''assistante ne lit pas les objectifs (42501)');
  perform tests.b3_endosser('daf');
  return next throws_ok(format('select public.tiroma_objectifs_fauteuils(%L, %L)', banc, entite), '42501', null, 'le collaborateur non plus (42501)');
  perform tests.b3_endosser('daf2');
  return next throws_ok(format('select public.tiroma_objectifs_fauteuils(%L, %L)', banc, entite), '42501', null, 'ni daf2 (42501)');
  perform tests.b3_endosser('gerant');
  return next throws_ok(format('select public.tiroma_objectifs_fauteuils(%L, %L, 0)', banc, entite), '22023', null, 'zéro semaine est refusé (22023)');

  -- Le titulaire fixe l'objectif du Fauteuil 3 sous RLS, puis lit.
  update public.tiroma_fauteuils set objectif_occupation = 0.010 where id = f3;
  x := public.tiroma_objectifs_fauteuils(banc, entite, 4);
  return next is(jsonb_array_length(x -> 'semaines'), 6, 'quatre semaines passées, la semaine en cours et la suivante');
  return next ok(x -> 'semaines' -> 3 ->> 'nature' = 'realisee' and x -> 'semaines' -> 4 ->> 'nature' = 'prevue'
                 and (x -> 'semaines' -> 4 ->> 'en_cours')::boolean, 'le passé en réalisé, la semaine en cours en prévu');
  return next ok((select (v ->> 'objectif')::numeric = 0.010 from jsonb_array_elements(x -> 'fauteuils') v where (v ->> 'fauteuil_id')::uuid = f3),
                 'l''objectif du Fauteuil 3 est rendu');
  select (v -> 'semaines' -> 3 ->> 'occupe_min')::numeric into avant from jsonb_array_elements(x -> 'fauteuils') v where (v ->> 'fauteuil_id')::uuid = f3;

  -- Deux heures honorées la semaine dernière sur le Fauteuil 3 ; une heure manquée qui ne compte pas ; une heure
  -- prévue la semaine prochaine.
  perform tests.redevenir_admin();
  perform set_config('omega.tiroma_moteur', 'releve', true);
  insert into public.tiroma_rendez_vous (client_id, entite_id, source_ref, patient_id, fauteuil_id, debut, fin, statut) values
    (banc, entite, 'R-B3-21-1', v_patient, f3, (d_passe + time '08:00') at time zone v_fuseau, (d_passe + time '10:00') at time zone v_fuseau, 'honore'),
    (banc, entite, 'R-B3-21-2', v_patient, f3, (d_passe + time '15:00') at time zone v_fuseau, (d_passe + time '16:00') at time zone v_fuseau, 'manque'),
    (banc, entite, 'R-B3-21-3', v_patient, f3, (d_futur + time '17:00') at time zone v_fuseau, (d_futur + time '18:00') at time zone v_fuseau, 'prevu');
  perform set_config('omega.tiroma_moteur', '', true);
  perform tests.b3_endosser('gerant');
  x2 := public.tiroma_objectifs_fauteuils(banc, entite, 4);
  select (v -> 'semaines' -> 3 ->> 'occupe_min')::numeric into apres from jsonb_array_elements(x2 -> 'fauteuils') v where (v ->> 'fauteuil_id')::uuid = f3;
  return next is(apres - avant, 120::numeric, 'la semaine dernière : deux heures honorées comptent, l''heure manquée non');
  return next is((select (v -> 'semaines' -> 5 ->> 'occupe_min')::numeric from jsonb_array_elements(x2 -> 'fauteuils') v where (v ->> 'fauteuil_id')::uuid = f3)
                 - (select (v -> 'semaines' -> 5 ->> 'occupe_min')::numeric from jsonb_array_elements(x -> 'fauteuils') v where (v ->> 'fauteuil_id')::uuid = f3),
                 60::numeric, 'la semaine prochaine : l''heure prévue compte');
  return next ok((select (v -> 'semaines' -> 3 ->> 'atteint')::boolean from jsonb_array_elements(x2 -> 'fauteuils') v where (v ->> 'fauteuil_id')::uuid = f3),
                 'objectif de 1 % : atteint la semaine dernière');
  return next ok((select (v ->> 'comptees')::integer >= 1 and (v ->> 'moyenne') is not null from jsonb_array_elements(x2 -> 'fauteuils') v where (v ->> 'fauteuil_id')::uuid = f3),
                 'la moyenne des semaines passées est donnée');

  update public.tiroma_fauteuils set objectif_occupation = 1 where id = f3;
  x2 := public.tiroma_objectifs_fauteuils(banc, entite, 4);
  return next ok(not (select (v -> 'semaines' -> 3 ->> 'atteint')::boolean from jsonb_array_elements(x2 -> 'fauteuils') v where (v ->> 'fauteuil_id')::uuid = f3),
                 'objectif de 100 % : non atteint');
  update public.tiroma_fauteuils set objectif_occupation = null where id = f3;
  x2 := public.tiroma_objectifs_fauteuils(banc, entite, 4);
  return next ok((select v -> 'semaines' -> 3 -> 'atteint' = 'null'::jsonb and (v ->> 'comptees')::integer = 0 from jsonb_array_elements(x2 -> 'fauteuils') v
                  where (v ->> 'fauteuil_id')::uuid = f3), 'sans objectif : ni atteint ni manqué');
  return next ok(x2::text !~ '(Delannoy|Marguerite|Rousseau|Lacour)', 'aucun nom de patient ni de praticien');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b3_21_');
