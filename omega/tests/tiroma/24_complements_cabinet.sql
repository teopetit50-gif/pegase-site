-- B3-24 — Les compléments du cabinet (b3_23) : soins à déplacer, séances longues mal placées, créneaux pour les plans,
-- contrôles dus, export des données. Après 00, 00b, b3_01 à b3_23. runtests() annule tout.
-- Le jour D est le premier jour ouvré, non férié, entre J+1 et J+2 (pas J+3, chargé de dix rendez-vous sur le
-- Fauteuil 3). Le banc : Fauteuil 1 (soins, prévention, « Assistante (banc) »), Fauteuil 2 (soins, prothèse,
-- chirurgie, sans assistante), Fauteuil 3 (orthodontie, soins, sans assistante).

create or replace function tests.test_b3_24_complements_cabinet() returns setof text
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
  f1 uuid; f2 uuid; f3 uuid;
  v_composite uuid;
  v_chir uuid;
  v_patient uuid;
  v_court uuid;
  v_long uuid;
  v_assistante uuid;
begin
  r := tests.b3_cabinet_releve('initial');
  perform tests.redevenir_admin();
  select en.fuseau into v_fuseau from public.entites en where en.id = entite;
  v_territoire := private.territoire_de_entite(banc, entite);
  j := (now() at time zone v_fuseau)::date;
  select g::date into d from generate_series(j + 1, j + 2, interval '1 day') g
  where extract(isodow from g) between 1 and 5 and not public.jour_ferie(g::date, v_territoire) order by g limit 1;
  select id into f1 from public.tiroma_fauteuils where entite_id = entite and nom = 'Fauteuil 1';
  select id into f2 from public.tiroma_fauteuils where entite_id = entite and nom = 'Fauteuil 2';
  select id into f3 from public.tiroma_fauteuils where entite_id = entite and nom = 'Fauteuil 3';
  select id into v_composite from public.tiroma_types_rdv where entite_id = entite and libelle_source = 'Soin composite';
  select id into v_chir from public.tiroma_types_rdv where entite_id = entite and libelle_source = 'Implant — chirurgie';
  select id into v_patient from public.tiroma_patients where entite_id = entite and source_ref = 'P001';
  select id into v_assistante from public.tiroma_membres where entite_id = entite and prenom = 'Assistante (banc)';

  if d is null then
    return next skip('ni J+1 ni J+2 ne sont des jours ouvrés : les deux premiers volets ne se jouent pas aujourd''hui', 8);
  else
    -- Un soin composite de 20 minutes, seul sur le Fauteuil 3 le matin de D ; une chirurgie de 90 minutes sur le
    -- Fauteuil 1, de 11 h 30 à 13 h (elle chevauche la pause de midi).
    perform set_config('omega.tiroma_moteur', 'releve', true);
    -- Les deux types, posés sans dépendre du classement automatique du vocabulaire.
    update public.tiroma_types_rdv set capacite_requise = 'soins', exige_assistante = true where id = v_composite;
    update public.tiroma_types_rdv set capacite_requise = 'chirurgie', exige_assistante = true, chirurgie = true where id = v_chir;
    insert into public.tiroma_rendez_vous (client_id, entite_id, source_ref, patient_id, fauteuil_id, type_rdv_id, debut, fin, statut)
    values (banc, entite, 'R-B3-24-A', v_patient, f3, v_composite, (d + time '11:00') at time zone v_fuseau, (d + time '11:20') at time zone v_fuseau, 'prevu')
    returning id into v_court;
    insert into public.tiroma_rendez_vous (client_id, entite_id, source_ref, patient_id, fauteuil_id, type_rdv_id, debut, fin, statut)
    values (banc, entite, 'R-B3-24-L', v_patient, f1, v_chir, (d + time '11:30') at time zone v_fuseau, (d + time '13:00') at time zone v_fuseau, 'prevu')
    returning id into v_long;
    perform set_config('omega.tiroma_moteur', '', true);

    -- 1. Les soins à déplacer : au titulaire seul.
    perform tests.b3_endosser('referent');
    return next throws_ok(format('select public.tiroma_soins_a_deplacer(%L, %L)', banc, entite), '42501', null, 'l''assistante ne lit pas la charge (42501)');
    perform tests.b3_endosser('gerant');
    x := public.tiroma_soins_a_deplacer(banc, entite, 2);
    select v into e from jsonb_array_elements(x -> 'demi_journees') v, jsonb_array_elements(v -> 'soins') s
    where (s ->> 'rendez_vous_id')::uuid = v_court;
    return next ok(e is not null and e ->> 'fauteuil' = 'Fauteuil 3' and e ->> 'moment' = 'matin', 'le matin de D, le Fauteuil 3 tourne à vide pour un seul soin');
    return next ok((select bool_and(w ->> 'fauteuil' = 'Fauteuil 1') and count(*) >= 1
                    from jsonb_array_elements(e -> 'soins') s, jsonb_array_elements(s -> 'vers') w where (s ->> 'rendez_vous_id')::uuid = v_court),
                   'vers le Fauteuil 1 seulement : libre à 11 h, équipé, avec son assistante (le Fauteuil 2 n''en a pas)');
    return next ok((e ->> 'libere')::boolean, 'la demi-journée du Fauteuil 3 peut être libérée');
    -- L'assistante du Fauteuil 1 absente ce jour-là : plus nulle part où aller.
    perform tests.b3_endosser('referent');
    perform public.tiroma_noter_absence_membre(banc, entite, v_assistante, d::timestamp at time zone v_fuseau, (d + 1)::timestamp at time zone v_fuseau, 'formation');
    perform tests.b3_endosser('gerant');
    x := public.tiroma_soins_a_deplacer(banc, entite, 2);
    return next ok(exists (select 1 from jsonb_array_elements(x -> 'demi_journees') v, jsonb_array_elements(v -> 'soins') s
                           where (s ->> 'rendez_vous_id')::uuid = v_court and jsonb_array_length(s -> 'vers') = 0 and not (v ->> 'libere')::boolean),
                   'assistante du Fauteuil 1 en formation : le soin reste, la demi-journée ne se libère pas');

    -- 2. Les séances longues mal placées : titulaire et assistante.
    perform tests.b3_endosser('referent');
    x := public.tiroma_seances_mal_placees(banc, entite, 7);
    select v into e from jsonb_array_elements(x) v where (v ->> 'rendez_vous_id')::uuid = v_long;
    return next ok(e is not null and (e ->> 'minutes')::integer = 90, 'la chirurgie de 90 minutes est signalée');
    return next ok(exists (select 1 from jsonb_array_elements_text(e -> 'raisons') t where t like 'sort des horaires%')
                   and exists (select 1 from jsonb_array_elements_text(e -> 'raisons') t where t like 'le Fauteuil 1 n''est pas équipé%'),
                   format('raisons : la pause de midi et le fauteuil non équipé (%s)', e -> 'raisons'));
    return next ok(not exists (select 1 from jsonb_array_elements(x) v where (v ->> 'rendez_vous_id')::uuid = v_court), 'un soin de 20 minutes n''est pas une séance longue');
  end if;

  perform tests.b3_endosser('daf2');
  return next throws_ok(format('select public.tiroma_seances_mal_placees(%L, %L)', banc, entite), '42501', null, 'daf2 ne lit rien (42501)');

  -- 3. Un créneau pour chaque plan signé.
  perform tests.b3_endosser('referent');
  x := public.tiroma_creneaux_pour_plans(banc, entite, 14, 3);
  return next ok(jsonb_array_length(x) >= 1, format('%s plan(s) sans rendez-vous', jsonb_array_length(x)));
  return next ok(exists (select 1 from jsonb_array_elements(x) p where jsonb_array_length(p -> 'creneaux') >= 1), 'au moins un plan reçoit des créneaux');
  return next ok(not exists (
                   select 1 from jsonb_array_elements(x) p, jsonb_array_elements(p -> 'creneaux') c
                   where (c ->> 'debut')::timestamptz < (j + 1)::timestamp at time zone v_fuseau
                      or (c ->> 'fin')::timestamptz - (c ->> 'debut')::timestamptz <> make_interval(mins => (p ->> 'duree_min')::integer)
                      or exists (select 1 from public.tiroma_rendez_vous o
                                 where o.client_id = banc and o.entite_id = entite and o.fauteuil_id = (c ->> 'fauteuil_id')::uuid and o.statut = 'prevu'
                                   and tstzrange(o.debut, o.fin) && tstzrange((c ->> 'debut')::timestamptz, (c ->> 'fin')::timestamptz))),
                 'chaque créneau est à partir de demain, de la durée de la séance, sans chevaucher un rendez-vous du fauteuil');
  return next ok(not exists (select 1 from jsonb_array_elements(x) p where jsonb_array_length(p -> 'creneaux') > 3), 'trois créneaux au plus par plan');

  -- 4. Les contrôles dus.
  x := public.tiroma_controles_dus(banc, entite, 200);
  return next ok(exists (select 1 from jsonb_array_elements(x -> 'patients') p where p ->> 'patient_nom' = 'Rosalie Nestor'),
                 'Rosalie Nestor, pas revue depuis plus d''un an, est dans la liste');
  return next ok(not exists (select 1 from jsonb_array_elements(x -> 'patients') p
                             join public.tiroma_patients pa on pa.id = (p ->> 'patient_id')::uuid where pa.ne_pas_contacter),
                 'jamais un patient qui ne veut pas être contacté');
  return next is((x ->> 'total')::integer, jsonb_array_length(x -> 'patients'), 'le total compte la liste (sous la limite)');
  return next throws_ok(format('select public.tiroma_controles_dus(%L, %L, 0)', banc, entite), '22023', null, 'une limite nulle est refusée (22023)');

  -- 5. Tout exporter : au titulaire seul.
  return next throws_ok(format('select public.tiroma_exporter_donnees(%L, %L)', banc, entite), '42501', null, 'l''assistante n''exporte pas (42501)');
  perform tests.b3_endosser('gerant');
  x := public.tiroma_exporter_donnees(banc, entite);
  return next is(jsonb_array_length(x #> '{tables,fauteuils}'), 3, 'l''export porte les trois fauteuils');
  return next ok(jsonb_array_length(x #> '{tables,patients}') >= 30 and jsonb_array_length(x #> '{tables,rendez_vous}') >= 1
                 and x #> '{tables,plan_actes}' is not null, format('et les patients, les rendez-vous, les actes des plans (%s)', x -> 'comptes'));
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from public.journal_opposable where client_id = banc and action = 'tiroma.donnees_exportees'), 'journal : « tiroma.donnees_exportees »');
end $f$;

select * from runtests('tests'::name, '^test_b3_24_');
