-- B3-14 — Le pilotage du titulaire (b3_13) : devis présentés et signés sur 30 jours, paniers, devis à relancer, chiffre
-- signé qui attend un rendez-vous, rendez-vous manqués par praticien. Après 00, 00b, b3_01 à b3_13. runtests() annule tout.
-- Les devis du banc (00b) : D001 présenté J-50 signé, D002 J-45 commencé, D003 J-14 signé (Libre), D004 J-6 signé,
-- D005 J-20 présenté (Dorville, 780 €).

create or replace function tests.test_b3_14_pilotage() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  r jsonb;
  p jsonb;
  v_dorville uuid;
begin
  r := tests.b3_cabinet_releve('initial');
  select id into v_dorville from public.tiroma_patients where entite_id = entite and source_ref = 'P008';
  -- Le relevé du lendemain : R005 (Dr Lacour, J-2) est manqué.
  perform tests.b3_deposer_releve((r ->> 'branchement')::uuid, array['agenda', 'actes'], 'courant', 'b3:courant');
  perform tests.b3_traiter();

  -- Qui lit : le titulaire seul (et la direction) ; ni l'assistante, ni le collaborateur, ni un compte sans profil.
  perform tests.b3_endosser('referent');
  return next throws_ok(format('select public.tiroma_pilotage(%L, %L)', banc, entite), '42501', null, 'l''assistante ne lit pas le pilotage (42501)');
  perform tests.b3_endosser('daf');
  return next throws_ok(format('select public.tiroma_pilotage(%L, %L)', banc, entite), '42501', null, 'le collaborateur non plus (42501)');
  perform tests.b3_endosser('daf2');
  return next throws_ok(format('select public.tiroma_pilotage(%L, %L)', banc, entite), '42501', null, 'ni daf2, sans profil (42501)');

  perform tests.b3_endosser('gerant');
  return next throws_ok(format('select public.tiroma_pilotage(%L, %L, 3)', banc, entite), '22023', null, 'une période de moins de 7 jours est refusée (22023)');
  p := public.tiroma_pilotage(banc, entite);
  return next is((p #>> '{periode,jours}')::integer, 30, 'trente jours par défaut');

  -- Devis.
  return next is((p #>> '{devis,presentes}')::integer, 3, 'trois devis présentés en trente jours (D003, D004, D005)');
  return next is((p #>> '{devis,signes}')::integer, 2, 'deux signés (D003, D004)');
  return next is((p #>> '{devis,taux}')::numeric, 0.667, 'taux d''acceptation : 0,667');
  return next is((p #>> '{devis,montant_presente}')::numeric, 3825::numeric, 'montant présenté : 3 825 €');
  return next is((p #>> '{devis,montant_signe}')::numeric, 3045::numeric, 'montant signé : 3 045 €');
  return next is((select (x ->> 'signes')::integer from jsonb_array_elements(p #> '{devis,par_panier}') x where x ->> 'panier' = 'libre'), 1,
                 'panier libre : D003 signé');
  return next is((select (x ->> 'presentes')::integer from jsonb_array_elements(p #> '{devis,par_panier}') x where x ->> 'panier' = 'non_precise'), 2,
                 'panier non précisé : D004 et D005');
  return next is((p #>> '{devis,precedent,presentes}')::integer, 2, 'période d''avant : D001 et D002 présentés');
  return next is((p #>> '{devis,precedent,taux}')::numeric, 1.000, 'et tous deux signés');

  -- Devis en attente, à relancer.
  return next is((p #>> '{en_attente,devis}')::integer, 1, 'un devis attend une réponse (D005)');
  return next is((p #>> '{en_attente,montant}')::numeric, 780::numeric, '780 € en attente');
  return next is((p #>> '{en_attente,a_relancer}')::integer, 1, 'présenté il y a 20 jours, jamais relancé : à relancer');
  return next is(p #>> '{en_attente,a_relancer_liste,0,patient_nom}', 'Michel Dorville', 'la liste nomme Michel Dorville (le titulaire voit ses patients)');
  return next is(p #>> '{en_attente,a_relancer_liste,0,devis_numero}', 'D005', 'devis D005');

  -- Le chiffre signé qui attend un rendez-vous : la même liste que la porte de b3_03.
  return next is((p #>> '{plans_sans_rdv,nombre}')::integer, jsonb_array_length(public.tiroma_plans_sans_rendez_vous(banc, entite)),
                 'plans signés sans rendez-vous : le même compte que la carte « Plans sans rendez-vous »');
  return next ok((p #>> '{plans_sans_rdv,montant}')::numeric > 0, format('leur montant est donné (%s €)', p #>> '{plans_sans_rdv,montant}'));

  -- Rendez-vous manqués.
  return next is((p #>> '{rendez_vous,manques}')::integer, 1, 'un rendez-vous manqué sur la période (R005)');
  return next ok((p #>> '{rendez_vous,passes}')::integer >= 10, format('%s rendez-vous passés', p #>> '{rendez_vous,passes}'));
  return next is((select (x ->> 'manques')::integer from jsonb_array_elements(p #> '{rendez_vous,par_praticien}') x where x ->> 'nom' = 'Dr Lacour'), 1,
                 'le manqué est chez Dr Lacour');
  return next is(p #>> '{rendez_vous,par_praticien,0,nom}', 'Dr Lacour', 'le praticien le plus touché vient en premier');

  -- Une relance notée (b3_12) sort le devis de la liste « à relancer » pour quatorze jours.
  perform tests.b3_endosser('referent');
  perform public.tiroma_noter_appel(banc, entite, v_dorville, 'devis', 'message', (select id from public.tiroma_plans where entite_id = entite and source_ref = 'D005'));
  perform tests.b3_endosser('gerant');
  p := public.tiroma_pilotage(banc, entite);
  return next is((p #>> '{en_attente,a_relancer}')::integer, 0, 'après l''appel de l''assistante, plus rien à relancer');
  return next is((p #>> '{appels,appels}')::integer, 1, 'l''appel est compté dans la période');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b3_14_');
