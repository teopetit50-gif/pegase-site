-- B3-17 — Le taux de réinscription (b3_15 / b3_16) : les patients vus qui ont déjà un prochain rendez-vous, et ceux
-- repartis sans suite, à rappeler. Après 00, 00b, b3_01 à b3_16. runtests() annule tout.

create or replace function tests.test_b3_17_reinscription() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  r jsonb;
  x jsonb;
  v_fuseau text;
  j date;
  v_visites integer;
  v_reinscrits integer;
  v_sans uuid;
  v_nom text;
begin
  r := tests.b3_cabinet_releve('initial');
  select e.fuseau into v_fuseau from public.entites e where e.id = entite;
  j := (now() at time zone v_fuseau)::date;

  -- L'attendu, avec la même définition, directement sur la base.
  with v as (
    select distinct on (r2.patient_id, (r2.debut at time zone v_fuseau)::date) r2.patient_id, r2.debut
    from public.tiroma_rendez_vous r2
    where r2.entite_id = entite and r2.patient_id is not null and (r2.statut = 'honore' or (r2.statut = 'prevu' and r2.presume = 'honore'))
      and (r2.debut at time zone v_fuseau)::date between j - 29 and j and r2.debut < now()
    order by r2.patient_id, (r2.debut at time zone v_fuseau)::date, r2.debut desc
  )
  select count(*), count(*) filter (where exists (select 1 from public.tiroma_rendez_vous n where n.entite_id = entite and n.patient_id = v.patient_id
                                                    and n.debut > v.debut and n.statut not in ('annule', 'supprime') and n.disparu_le is null))
    into v_visites, v_reinscrits
  from v;

  -- Qui lit.
  perform tests.b3_endosser('daf');
  return next throws_ok(format('select public.tiroma_reinscription(%L, %L)', banc, entite), '42501', null, 'le collaborateur ne lit pas la réinscription (42501)');
  perform tests.b3_endosser('daf2');
  return next throws_ok(format('select public.tiroma_reinscription(%L, %L)', banc, entite), '42501', null, 'ni daf2 sans profil (42501)');

  perform tests.b3_endosser('gerant');
  return next throws_ok(format('select public.tiroma_reinscription(%L, %L, 3)', banc, entite), '22023', null, 'une période de moins de 7 jours est refusée (22023)');
  x := public.tiroma_reinscription(banc, entite);
  return next ok(v_visites >= 10, format('le banc a des visites sur trente jours (%s)', v_visites));
  return next is((x ->> 'visites')::integer, v_visites, 'le compte des visites');
  return next is((x ->> 'reinscrits')::integer, v_reinscrits, format('%s patients vus ont déjà un prochain rendez-vous', v_reinscrits));
  return next is((x ->> 'taux')::numeric, round(v_reinscrits::numeric / nullif(v_visites, 0), 3), 'le taux de réinscription');
  return next ok(jsonb_array_length(x -> 'par_praticien') >= 1, 'le titulaire voit le détail par praticien');
  return next ok(x #> '{precedent}' ? 'taux', 'la période d''avant est donnée');

  -- Les patients repartis sans suite : ni prochain rendez-vous, ni plan en cours.
  return next ok(jsonb_array_length(x -> 'sans_suite') <= 25,
                 format('%s patient(s) vu(s) sans prochain rendez-vous (25 au plus)', jsonb_array_length(x -> 'sans_suite')));
  return next ok(not exists (select 1 from jsonb_array_elements(x -> 'sans_suite') s
                             where exists (select 1 from public.tiroma_rendez_vous n where n.entite_id = entite and n.patient_id = (s ->> 'patient_id')::uuid
                                             and n.debut > now() and n.statut not in ('annule', 'supprime'))),
                 'aucun patient de la liste n''a de rendez-vous à venir');
  return next ok(not exists (select 1 from jsonb_array_elements(x -> 'sans_suite') s
                             join public.tiroma_patients pa on pa.id = (s ->> 'patient_id')::uuid where pa.ne_pas_contacter),
                 'aucun patient « ne pas contacter » dans la liste');

  -- Un patient vu hier, sans suite, inscrit pour le test : il apparaît, puis l'appel noté l'en sort.
  perform tests.redevenir_admin();
  perform set_config('omega.tiroma_moteur', 'releve', true);
  insert into public.tiroma_patients (client_id, entite_id, source_ref, nom, prenom)
  values (banc, entite, 'P-B3-17', 'Sans-Suite', 'Hugo') returning id into v_sans;
  insert into public.tiroma_rendez_vous (client_id, entite_id, source_ref, patient_id, debut, fin, statut)
  values (banc, entite, 'R-B3-17', v_sans, (j - 1 + time '10:00') at time zone v_fuseau, (j - 1 + time '10:30') at time zone v_fuseau, 'honore');
  perform set_config('omega.tiroma_moteur', '', true);
  perform tests.b3_endosser('referent');
  x := public.tiroma_reinscription(banc, entite);
  select s ->> 'patient_nom' into v_nom from jsonb_array_elements(x -> 'sans_suite') s where (s ->> 'patient_id')::uuid = v_sans;
  return next is(v_nom, 'Hugo Sans-Suite', 'l''assistante voit Hugo Sans-Suite, vu hier et reparti sans rendez-vous');
  return next is(jsonb_array_length(x -> 'par_praticien'), 0, 'l''assistante n''a pas le détail par praticien');
  perform public.tiroma_noter_appel(banc, entite, v_sans, 'controle', 'message');
  x := public.tiroma_reinscription(banc, entite);
  return next ok(not exists (select 1 from jsonb_array_elements(x -> 'sans_suite') s where (s ->> 'patient_id')::uuid = v_sans),
                 'appelé : il sort de la liste pour quatorze jours');

  -- La direction : les chiffres, sans les noms.
  perform tests.redevenir_admin();
  insert into public.tiroma_profils (client_id, user_id, entite_id, profil) values (banc, tests.b3_compte('daf2'), entite, 'direction');
  perform tests.b3_endosser('daf2');
  x := public.tiroma_reinscription(banc, entite);
  return next is((x ->> 'visites')::integer, v_visites + 1, 'la direction lit les mêmes chiffres (avec la visite d''Hugo)');
  return next ok(not exists (select 1 from jsonb_array_elements(x -> 'sans_suite') s where s ->> 'patient_nom' <> 'Patient du cabinet'),
                 'mais aucun nom de patient');

  -- La synthèse de la semaine porte aussi la réinscription.
  perform tests.b3_endosser('gerant');
  x := public.tiroma_synthese_semaine(banc, entite, date_trunc('week', j - 1)::date);
  return next ok((x -> 'cabinets' -> 0) ? 'reinscription' and (x -> 'total') ? 'reinscription_taux', 'la synthèse de la semaine donne la réinscription');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b3_17_');
