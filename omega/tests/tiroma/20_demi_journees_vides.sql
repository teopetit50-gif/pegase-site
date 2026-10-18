-- B3-20 — Les demi-journées vides des collaborateurs (b3_19). Dr Rousseau consulte le matin d'un jour D (ses horaires
-- propres) ; Dr Lacour, sans horaires propres, travaille d'habitude l'après-midi de ce jour de la semaine (trois
-- semaines sur huit). D est pris au-delà de l'agenda du banc (J-5 à J+10), qui remplit ces demi-journées au-dessus du
-- seuil. Après 00, 00b, b3_01 à b3_19. runtests() annule tout.

create or replace function tests.test_b3_20_demi_journees_vides() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  r jsonb;
  x jsonb;
  e jsonb;
  v_fuseau text;
  v_territoire text;
  j date;
  d date;
  n integer;
  n0 integer;
  v_lacour uuid;
  v_rousseau uuid;
  v_patient uuid;
begin
  r := tests.b3_cabinet_releve('initial');
  select en.fuseau into v_fuseau from public.entites en where en.id = entite;
  j := (now() at time zone v_fuseau)::date;
  v_territoire := private.territoire_de_entite(banc, entite);
  select id into v_lacour from public.tiroma_praticiens where entite_id = entite and nom_affiche = 'Dr Lacour';
  select id into v_rousseau from public.tiroma_praticiens where entite_id = entite and nom_affiche = 'Dr Rousseau';
  select id into v_patient from public.tiroma_patients where entite_id = entite and source_ref = 'P001';
  -- D : le premier jour ouvré, non férié, entre J+12 et J+18.
  select g::date into d from generate_series(j + 12, j + 18, interval '1 day') g
  where extract(isodow from g) between 1 and 5 and not public.jour_ferie(g::date, v_territoire) order by g limit 1;

  -- Dr Rousseau : le matin de D seulement. Dr Lacour : trois après-midi de ce jour de la semaine, les semaines passées.
  perform tests.b3_endosser('gerant');
  insert into public.tiroma_horaires (client_id, entite_id, praticien_id, jour, debut, fin)
  values (banc, entite, v_rousseau, extract(isodow from d)::smallint, '08:00', '12:00');
  perform tests.redevenir_admin();
  perform set_config('omega.tiroma_moteur', 'releve', true);
  insert into public.tiroma_rendez_vous (client_id, entite_id, source_ref, patient_id, praticien_id, debut, fin, statut)
  select banc, entite, 'R-B3-20-H' || k, v_patient, v_lacour, (d - 7 * k + time '15:00') at time zone v_fuseau, (d - 7 * k + time '15:30') at time zone v_fuseau, 'honore'
  from generate_series(1, 3) k;
  perform set_config('omega.tiroma_moteur', '', true);

  -- Qui lit.
  perform tests.b3_endosser('referent');
  return next throws_ok(format('select public.tiroma_demi_journees_vides(%L, %L)', banc, entite), '42501', null,
                        'l''assistante ne lit pas l''agenda des praticiens (42501)');
  perform tests.b3_endosser('daf2');
  return next throws_ok(format('select public.tiroma_demi_journees_vides(%L, %L)', banc, entite), '42501', null, 'daf2 ne lit rien (42501)');
  perform tests.b3_endosser('gerant');
  return next throws_ok(format('select public.tiroma_demi_journees_vides(%L, %L, 0)', banc, entite), '22023', null, 'un horizon nul est refusé (22023)');

  -- Le titulaire voit les deux.
  x := public.tiroma_demi_journees_vides(banc, entite, 21);
  select v into e from jsonb_array_elements(x -> 'demi_journees') v
  where (v ->> 'praticien_id')::uuid = v_rousseau and (v ->> 'jour')::date = d and v ->> 'moment' = 'matin';
  return next ok(e is not null, format('Dr Rousseau, le %s au matin : demi-journée vide', d));
  return next ok(e ->> 'source' = 'horaires' and (e ->> 'libre_min')::integer = 240, 'ses horaires propres, quatre heures libres');
  return next ok(not exists (select 1 from jsonb_array_elements(x -> 'demi_journees') v
                             where (v ->> 'praticien_id')::uuid = v_rousseau and (v ->> 'jour')::date = d and v ->> 'moment' = 'apres_midi'),
                 'l''après-midi, il ne consulte pas : rien n''est signalé');
  return next ok(exists (select 1 from jsonb_array_elements(x -> 'demi_journees') v
                         where (v ->> 'praticien_id')::uuid = v_lacour and (v ->> 'jour')::date = d and v ->> 'moment' = 'apres_midi'
                           and v ->> 'source' = 'habitude'),
                 'Dr Lacour, sans horaires propres : son après-midi habituel, vide, est signalé');
  n0 := (e ->> 'attente')::integer;

  -- Le collaborateur ne voit que son agenda.
  perform tests.b3_endosser('daf');
  x := public.tiroma_demi_journees_vides(banc, entite, 21);
  return next ok(jsonb_array_length(x -> 'demi_journees') > 0
                 and not exists (select 1 from jsonb_array_elements(x -> 'demi_journees') v where (v ->> 'praticien_id')::uuid <> v_rousseau),
                 'Dr Rousseau ne voit que ses propres demi-journées');

  -- Un patient en liste d'attente pour Dr Rousseau : il est compté.
  perform tests.b3_endosser('referent');
  perform public.tiroma_ajouter_attente(banc, entite, (select id from public.tiroma_patients where entite_id = entite and source_ref = 'P003'),
                                        null, 30, v_rousseau, null, null, false);
  perform tests.b3_endosser('gerant');
  x := public.tiroma_demi_journees_vides(banc, entite, 21);
  select v into e from jsonb_array_elements(x -> 'demi_journees') v
  where (v ->> 'praticien_id')::uuid = v_rousseau and (v ->> 'jour')::date = d and v ->> 'moment' = 'matin';
  return next is((e ->> 'attente')::integer, n0 + 1, 'un patient de plus en liste d''attente pour lui');

  -- Le point du matin du titulaire, trois jours avant D (le dépôt regarde les sept jours qui viennent).
  perform tests.redevenir_admin();
  return next is(private.tiroma_deposer_demi_journees((j + time '04:00') at time zone v_fuseau), 0, 'avant 5 h, rien n''est déposé');
  n := private.tiroma_deposer_demi_journees((d - 3 + time '07:00') at time zone v_fuseau);
  return next ok(n >= 1, format('à 7 h, la section est déposée (%s destinataire(s))', n));
  return next ok(exists (select 1 from public.points_sections s where s.client_id = banc and s.module = 'tiroma' and s.jour = d - 3
                          and s.destinataire = tests.b3_compte('gerant') and s.titre like 'Demi-journées vides%' and s.nb_items >= 2),
                 'au titulaire, une ligne par demi-journée');
  return next ok(not exists (select 1 from public.points_sections s where s.client_id = banc and s.module = 'tiroma'
                              and s.destinataire in (tests.b3_compte('daf'), tests.b3_compte('referent')) and s.titre like 'Demi-journées vides%'),
                 'ni au collaborateur ni à l''assistante');

  -- Un rendez-vous de 3 h 30 remplit le matin de Dr Rousseau ; un congé ferme l'après-midi de Dr Lacour.
  perform set_config('omega.tiroma_moteur', 'releve', true);
  insert into public.tiroma_rendez_vous (client_id, entite_id, source_ref, patient_id, praticien_id, debut, fin, statut)
  values (banc, entite, 'R-B3-20-P', v_patient, v_rousseau, (d + time '08:00') at time zone v_fuseau, (d + time '11:30') at time zone v_fuseau, 'prevu');
  perform set_config('omega.tiroma_moteur', '', true);
  insert into public.tiroma_fermetures (client_id, entite_id, praticien_id, debut, fin, nature)
  values (banc, entite, v_lacour, d::timestamp at time zone v_fuseau, (d + 1)::timestamp at time zone v_fuseau, 'conge');
  perform tests.b3_endosser('gerant');
  x := public.tiroma_demi_journees_vides(banc, entite, 21);
  return next ok(not exists (select 1 from jsonb_array_elements(x -> 'demi_journees') v
                             where (v ->> 'praticien_id')::uuid = v_rousseau and (v ->> 'jour')::date = d),
                 '3 h 30 réservées sur 4 h : le matin de Dr Rousseau n''est plus vide');
  return next ok(not exists (select 1 from jsonb_array_elements(x -> 'demi_journees') v
                             where (v ->> 'praticien_id')::uuid = v_lacour and (v ->> 'jour')::date = d),
                 'Dr Lacour en congé ce jour-là : rien n''est signalé');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b3_20_');
