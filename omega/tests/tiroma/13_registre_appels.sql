-- B3-13 — Le registre des appels (b3_12) : l'assistante note ses appels, le patient « à rappeler » revient le jour dit,
-- un « rendez-vous pris » n'est compté qu'une fois vu dans l'agenda du logiciel, et le titulaire voit ce que ça a
-- rapporté. Après 00, 00b, b3_01 à b3_12. runtests() annule tout.

create or replace function tests.test_b3_13_registre_appels() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  r jsonb;
  j jsonb;
  v_jour date;
  v_delannoy uuid;
  v_bazile uuid;
  v_mondesir uuid;
  v_plan uuid;
  v_montant numeric;
  v_appel uuid;
  v_bis uuid;
begin
  r := tests.b3_cabinet_releve('initial');
  select id into v_delannoy from public.tiroma_patients where entite_id = entite and source_ref = 'P001';
  select id into v_bazile from public.tiroma_patients where entite_id = entite and source_ref = 'P002';
  select id into v_mondesir from public.tiroma_patients where entite_id = entite and source_ref = 'P007';
  select id, montant into v_plan, v_montant from public.tiroma_plans
   where entite_id = entite and patient_id = v_delannoy and statut in ('signe', 'commence') order by signe_le nulls last limit 1;
  v_jour := (now() at time zone (select e.fuseau from public.entites e where e.id = entite))::date;

  perform tests.b3_endosser('referent');
  -- Les refus.
  return next throws_ok(format('select public.tiroma_noter_appel(%L, %L, %L, ''controle'', ''message'')', banc, entite, v_mondesir),
                        '22023', null, 'un patient « ne pas contacter » : aucun appel ne se note (22023)');
  return next throws_ok(format('select public.tiroma_noter_appel(%L, %L, %L, ''plan'', ''rappeler'', %L)', banc, entite, v_delannoy, v_plan),
                        '22023', null, '« à rappeler » sans date est refusé (22023)');
  return next throws_ok(format('select public.tiroma_noter_appel(%L, %L, %L, ''plan'', ''message'', null, null, %L::date)', banc, entite, v_delannoy, v_jour + 2),
                        '22023', null, 'une date de rappel avec une autre issue est refusée (22023)');
  return next throws_ok(format('select public.tiroma_noter_appel(%L, %L, %L, ''plan'', ''message'', %L)', banc, entite, v_bazile, v_plan),
                        '22023', null, 'le plan d''un autre patient est refusé (22023)');
  return next throws_ok(format('select public.tiroma_noter_appel(%L, %L, %L, ''relance'', ''message'')', banc, entite, v_delannoy),
                        '22023', null, 'un motif inconnu est refusé (22023)');

  -- Premier appel : message laissé à Marguerite Delannoy pour son plan ; un double clic ne fait pas deux appels.
  v_appel := public.tiroma_noter_appel(banc, entite, v_delannoy, 'plan', 'message', v_plan);
  return next ok(v_appel is not null, 'l''assistante note « message laissé » pour le plan de Marguerite Delannoy');
  v_bis := public.tiroma_noter_appel(banc, entite, v_delannoy, 'plan', 'message', v_plan);
  return next is(v_bis, v_appel, 'un double clic rend le même appel');
  return next ok((select a.appele_par = tests.b3_compte('referent') and a.issue = 'message' from public.tiroma_appels a where a.id = v_appel),
                 'l''appel est signé de l''assistante');
  -- Kévin Bazile : à rappeler dans trois jours.
  perform public.tiroma_noter_appel(banc, entite, v_bazile, 'controle', 'rappeler', null, null, v_jour + 3);

  j := public.tiroma_appels(banc, entite);
  return next is(jsonb_array_length(j -> 'a_reprendre'), 2, 'deux suivis à reprendre');
  return next is((select x ->> 'patient_nom' from jsonb_array_elements(j -> 'a_reprendre') x where x ->> 'issue' = 'rappeler'), 'Kévin Bazile',
                 'Kévin Bazile est à rappeler');
  return next ok((select not (x ->> 'du')::boolean and x ->> 'rappeler_le' = (v_jour + 3)::text from jsonb_array_elements(j -> 'a_reprendre') x where x ->> 'issue' = 'rappeler'),
                 'son rappel n''est pas dû avant le jour dit');
  return next ok((select x ->> 'par' is not null from jsonb_array_elements(j -> 'a_reprendre') x where x ->> 'issue' = 'message'),
                 'le suivi dit qui a appelé (prénom du membre)');
  return next ok(j -> 'derniers' ? v_delannoy::text, 'le dernier appel de chaque patient est rendu (pour annoter les listes)');

  -- Rendez-vous pris : compté « pris », pas encore « confirmé ».
  perform public.tiroma_noter_appel(banc, entite, v_delannoy, 'plan', 'rdv_pris', v_plan);
  j := public.tiroma_appels(banc, entite);
  return next is((j #>> '{bilan,rdv_pris}')::integer, 1, 'un rendez-vous pris');
  return next is((j #>> '{bilan,confirmes}')::integer, 0, 'pas encore confirmé : le logiciel ne le montre pas');
  return next is(jsonb_array_length(j -> 'a_reprendre'), 1, 'Marguerite Delannoy sort des suivis à reprendre');

  -- Le relevé suivant trouve le rendez-vous dans l'agenda du logiciel.
  perform tests.redevenir_admin();
  perform set_config('omega.tiroma_moteur', 'releve', true);
  insert into public.tiroma_rendez_vous (client_id, entite_id, source_ref, patient_id, debut, fin, statut, plan_id)
  values (banc, entite, 'R-B3-13', v_delannoy, now() + interval '6 days', now() + interval '6 days 45 minutes', 'prevu', v_plan);
  perform set_config('omega.tiroma_moteur', '', true);
  perform tests.b3_endosser('gerant');
  j := public.tiroma_appels(banc, entite);
  return next is((j #>> '{bilan,confirmes}')::integer, 1, 'le titulaire voit le rendez-vous confirmé par le relevé');
  return next is((j #>> '{bilan,valeur_plans}')::numeric, coalesce(v_montant, 0), 'la valeur du plan remis à l''agenda est comptée');
  return next is((j #>> '{bilan,appels}')::integer, 3, 'trois appels sur la période');

  -- Le collaborateur (Dr Rousseau) ne voit que ses patients et n'appelle pas ceux des autres.
  perform tests.b3_endosser('daf');
  j := public.tiroma_appels(banc, entite);
  return next ok(not (j -> 'derniers' ? v_delannoy::text), 'le collaborateur ne voit pas les appels des patients de Dr Lacour');
  return next throws_ok(format('select public.tiroma_noter_appel(%L, %L, %L, ''plan'', ''refus'', %L)', banc, entite, v_delannoy, v_plan),
                        '42501', null, 'il ne note pas d''appel hors de son périmètre (42501)');
  perform tests.b3_endosser('daf2');
  return next throws_ok(format('select public.tiroma_appels(%L, %L)', banc, entite), '42501', null, 'daf2, sans profil, ne lit pas le registre (42501)');
  return next is((select count(*) from public.tiroma_appels), 0::bigint, 'ni ne voit une ligne de la table');

  perform tests.b3_endosser('gerant');
  return next ok(exists (select 1 from public.journal_opposable where client_id = banc and action = 'tiroma.appel_note'), 'journal : « tiroma.appel_note »');
  return next ok(not exists (select 1 from public.journal_opposable where client_id = banc and action = 'tiroma.appel_note'
                             and (donnees::text ilike '%Delannoy%' or donnees::text ilike '%Marguerite%')), 'le journal ne porte aucun nom');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b3_13_');
