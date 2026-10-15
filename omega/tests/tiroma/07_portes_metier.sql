-- B3-07 — Plans sans rendez-vous, vérifications avant les rendez-vous, charge des fauteuils, accord de mutuelle
-- (étapes 12, 13 et 4 du scénario). Après 00_aides_b3.sql, 00b_export_logosw.sql, b3_01 à b3_05, b3_07, b3_08.
-- runtests() annule tout.

create or replace function tests.test_b3_07_portes_metier() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  j date := tests.b3_jour();
  r jsonb;
  v_plans jsonb;
  v_avant jsonb;
  v_charge jsonb;
  v_d001 uuid;
  v_d002 uuid;
  e jsonb;
begin
  r := tests.b3_cabinet_releve('initial');
  perform tests.b3_deposer_releve((r ->> 'branchement')::uuid, array['agenda', 'actes'], 'courant', 'b3:courant');
  perform tests.b3_traiter();
  select id into v_d001 from public.tiroma_plans where entite_id = entite and source_ref = 'D001';
  select id into v_d002 from public.tiroma_plans where entite_id = entite and source_ref = 'D002';

  -- 12. Les plans signés sans rendez-vous, du plus ancien au plus récent.
  perform tests.b3_endosser('gerant');
  v_plans := public.tiroma_plans_sans_rendez_vous(banc, entite);
  return next is(jsonb_array_length(v_plans), 4, 'quatre plans signés ou commencés attendent un rendez-vous (D005, présenté, n''y est pas)');
  return next is((select string_agg(x.value ->> 'devis_numero', ',' order by o) from jsonb_array_elements(v_plans) with ordinality x(value, o)), 'D001,D002,D003,D004',
                 'du plus ancien au plus récent : D001, D002, D003, D004');
  e := v_plans -> 0;
  return next ok((e ->> 'jours_depuis')::integer = 42 and e ->> 'patient_nom' = 'Marguerite Delannoy' and (e #>> '{prochaine,rang}')::integer = 1,
                 'D001 : Marguerite Delannoy, 42 jours, prochaine séance : la 1re');
  return next is((e ->> 'proches_a_planifier')::integer, 1, 'D001 : un proche (même famille) a aussi un plan à poser');
  return next ok((v_plans -> 1 ->> 'statut') = 'commence' and (v_plans -> 1 #>> '{prochaine,rang}')::integer = 2, 'D002 : commencé, prochaine séance : la 2e');
  return next is((v_plans -> 2 ->> 'jours_avant_expiration')::integer, 22, 'D003 : expire dans 22 jours');
  return next ok((v_plans -> 3 ->> 'ne_pas_contacter')::boolean, 'D004 : le patient ne veut pas être contacté, c''est dit');
  return next ok(not (e ->> 'mutuelle_accord_sans_rdv')::boolean, 'avant toute saisie, aucun accord de mutuelle n''est connu (l''export ne le porte pas)');

  -- b3_07 : l'assistante note l'accord de la mutuelle sur D001 ; le collaborateur ne peut pas sur un plan qui n'est pas le sien.
  perform tests.b3_endosser('referent');
  r := public.tiroma_noter_mutuelle(v_d001, 'accord', j - 21, 'accord reçu par courrier');
  return next is(r ->> 'mutuelle_statut', 'accord', 'l''assistante note l''accord de la mutuelle sur D001');
  return next is((r ->> 'mutuelle_reponse_le')::date, j - 21, 'daté du jour de la réponse');
  return next throws_ok(format('select public.tiroma_noter_mutuelle(%L, ''peut-etre'')', v_d001), '22023', null, 'un statut inconnu est refusé (22023)');
  perform tests.b3_endosser('daf2');
  return next throws_ok(format('select public.tiroma_noter_mutuelle(%L, ''demandee'')', v_d001), '42501', null,
                        'daf2, sans profil, ne note rien (42501)');
  perform tests.b3_endosser('daf');
  r := public.tiroma_noter_mutuelle(v_d002, 'non_requise');
  return next is(r ->> 'mutuelle_statut', 'non_requise', 'le collaborateur (périmètre cabinet) note sur D002 (Dr Rousseau)');
  perform tests.b3_endosser('gerant');
  return next ok((public.tiroma_plans_sans_rendez_vous(banc, entite) -> 0 ->> 'mutuelle_accord_sans_rdv')::boolean, 'D001 remonte désormais « accord de mutuelle reçu, sans rendez-vous »');
  return next ok(exists (select 1 from public.journal_opposable where client_id = banc and action = 'tiroma.mutuelle_notee'), 'journal : « tiroma.mutuelle_notee »');

  -- 13. Avant les rendez-vous.
  v_avant := public.tiroma_avant_rendez_vous(banc, entite, null);
  return next ok(jsonb_array_length(v_avant) >= 6, format('%s vérifications', jsonb_array_length(v_avant)));
  return next ok(exists (select 1 from jsonb_array_elements(v_avant) x where x.value ->> 'nature' = 'labo' and x.value ->> 'gravite' = 'critique' and x.value ->> 'patient_nom' = 'Michel Dorville' and x.value ->> 'texte' like '%pas revenu du laboratoire%'),
                 'laboratoire : la couronne de Michel Dorville n''est pas revenue (critique)');
  return next ok(exists (select 1 from jsonb_array_elements(v_avant) x where x.value ->> 'nature' = 'implant' and x.value ->> 'gravite' = 'attention' and x.value ->> 'texte' like '%NB-4.3-10%'),
                 'implants : la référence NB-4.3-10 est sous le seuil (attention)');
  return next ok(exists (select 1 from jsonb_array_elements(v_avant) x where x.value ->> 'nature' = 'devis_expire' and x.value ->> 'texte' like '%D003%'),
                 'devis : D003 expire dans 22 jours');
  return next ok(exists (select 1 from jsonb_array_elements(v_avant) x where x.value ->> 'nature' = 'mutuelle_accord' and x.value ->> 'texte' like '%D001%'),
                 'mutuelle : accord reçu sur D001, aucun rendez-vous n''a suivi');
  return next ok(exists (select 1 from jsonb_array_elements(v_avant) x where x.value ->> 'nature' = 'odf_accord' and x.value ->> 'patient_nom' = 'Inès Bertrand'),
                 'orthodontie : l''accord d''Inès Bertrand n''a pas été suivi d''un début');
  return next ok(exists (select 1 from jsonb_array_elements(v_avant) x where x.value ->> 'nature' = 'interruption' and x.value ->> 'patient_nom' = 'Patrice Zami'),
                 'traitement interrompu : la 2e séance de Patrice Zami n''est pas posée');
  return next ok(exists (select 1 from jsonb_array_elements(v_avant) x where x.value ->> 'nature' = 'devis_sans_reponse' and x.value ->> 'texte' like '%D005%'),
                 'devis sans réponse : D005');
  return next is((v_avant -> 0 ->> 'gravite'), 'critique', 'le critique vient en premier');

  -- 4/13. La charge des fauteuils, réservée au titulaire.
  v_charge := public.tiroma_charge_fauteuils(banc, entite, null);
  return next is((v_charge ->> 'jour')::date, j, 'la charge du jour');
  return next is(jsonb_array_length(v_charge -> 'fauteuils'), 3, 'trois fauteuils');
  if extract(isodow from j) between 1 and 5 then
    return next ok((select (x.value #>> '{journee,ouvert_min}')::numeric = 540 from jsonb_array_elements(v_charge -> 'fauteuils') x where x.value ->> 'nom' = 'Fauteuil 3'),
                   'fauteuil 3 : 540 minutes ouvertes un jour de semaine');
    return next ok((select (x.value #>> '{matin,vide}')::boolean from jsonb_array_elements(v_charge -> 'fauteuils') x where x.value ->> 'nom' = 'Fauteuil 3'),
                   'fauteuil 3 : matinée vide (rien de prévu)');
    return next ok((select (x.value #>> '{journee,prevu_min}')::numeric > 0 from jsonb_array_elements(v_charge -> 'fauteuils') x where x.value ->> 'nom' = 'Fauteuil 1'),
                   'fauteuil 1 : des minutes prévues');
  else
    return next skip('jour J hors semaine : la charge du jour ne se mesure pas (horaires du lundi au samedi)');
    return next skip('(idem)');
    return next skip('(idem)');
  end if;
  return next ok((select x.value ->> 'assistante_habituelle' = 'Assistante (banc)' from jsonb_array_elements(v_charge -> 'fauteuils') x where x.value ->> 'nom' = 'Fauteuil 1'),
                 'fauteuil 1 : son assistante habituelle est nommée');
  perform tests.b3_endosser('referent');
  return next throws_ok(format('select public.tiroma_charge_fauteuils(%L, %L, null)', banc, entite), '42501', null, 'l''assistante ne lit pas la charge (42501)');
  perform tests.b3_endosser('daf');
  return next throws_ok(format('select public.tiroma_charge_fauteuils(%L, %L, null)', banc, entite), '42501', null, 'ni le collaborateur (42501)');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b3_07_');
