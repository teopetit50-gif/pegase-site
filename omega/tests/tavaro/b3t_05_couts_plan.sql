-- B3T-05 — Le coût et la valeur de revente dans le plan de flotte (b3t_05). Après le 00 d'A5, 00_jeu_tavaro.sql de B2,
-- b2_10 (les immobilisations), b3t_01 à b3t_05. runtests() annule tout.
-- Même flotte que B3T-03 : six citadines au siège, peu louées ; une à NORD, louée trois fois en parallèle chaque
-- semaine. On note 1 250 € d'entretien sur la plus ancienne du siège et une cote sur une autre.

create or replace function tests.test_b3t_05_couts_plan_de_flotte() returns setof text
language plpgsql as $f$
declare
  jeu jsonb := tests.tavaro_jeu();
  c uuid := (jeu ->> 'client')::uuid;
  s uuid := (jeu ->> 'siege')::uuid;
  n uuid := (jeu ->> 'nord')::uuid;
  cb uuid;
  v1 uuid;
  v2 uuid;
  x jsonb;
  e jsonb;
  w jsonb;
begin
  perform tests.redevenir_admin();
  insert into public.loc_categories (client_id, code, libelle, rang) values (c, 'B3T-B', 'Citadine (essai B3)', 2) returning id into cb;
  insert into public.loc_vehicules (client_id, entite_id, immatriculation, format_plaque, categorie_id, mise_en_circulation, km_dernier)
  select c, s, 'BT-5' || lpad(g::text, 2, '0') || '-AA', 'siv', cb, date '2020-01-01' + g * 200, 10000 * g from generate_series(1, 6) g;
  insert into public.loc_vehicules (client_id, entite_id, immatriculation, format_plaque, categorie_id, mise_en_circulation)
  values (c, n, 'BT-599-AA', 'siv', cb, date '2025-01-01');
  select id into v1 from public.loc_vehicules where client_id = c and immatriculation = 'BT-501-AA';
  select id into v2 from public.loc_vehicules where client_id = c and immatriculation = 'BT-502-AA';
  insert into public.loc_contrats (client_id, entite_id, numero, categorie_id, depart_le, retour_prevu_le, retour_reel_le, statut, source)
  select c, n, 'B3T5-N' || g || '-' || k, cb, now() - (g * 7 + 7) * interval '1 day', now() - g * 7 * interval '1 day', now() - g * 7 * interval '1 day', 'clos', 'saisie'
  from generate_series(0, 50) g, generate_series(1, 3) k;
  -- BT-501 : dix jours loués il y a deux mois, puis deux passages à l'atelier (800 € et 450 €, cinq jours en tout).
  insert into public.loc_contrats (client_id, entite_id, numero, categorie_id, vehicule_id, depart_le, retour_prevu_le, retour_reel_le, statut, source)
  values (c, s, 'B3T5-S1', cb, v1, now() - interval '60 days', now() - interval '51 days', now() - interval '51 days', 'clos', 'saisie');
  insert into public.loc_immobilisations (client_id, entite_id, vehicule_id, motif, debut_le, fin_prevue_le, fin_le, cout_eur)
  values (c, s, v1, 'entretien', now() - interval '40 days', now() - interval '38 days', now() - interval '38 days', 800),
         (c, s, v1, 'carrosserie', now() - interval '20 days', now() - interval '19 days', now() - interval '19 days', 450);

  -- 1. La cote de revente : le gérant seul.
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  return next throws_ok(format('select public.loc_noter_cote_revente(%L, 6000)', v2), '42501', null, 'un valideur ne note pas de cote (42501)');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  return next throws_ok(format('select public.loc_noter_cote_revente(%L, -5)', v2), '22023', null, 'une cote négative est refusée (22023)');
  return next throws_ok(format('select public.loc_noter_cote_revente(%L, 6000, %L)', v2, 'devine'), '22023', null, 'une source inconnue est refusée (22023)');
  return next throws_ok(format('select public.loc_noter_cote_revente(%L, 6000, %L, %L)', v2, 'argus', current_date + 3), '22023', null, 'une cote datée de demain est refusée (22023)');
  perform public.loc_noter_cote_revente(v2, 5500, 'saisie', current_date - 200);
  perform public.loc_noter_cote_revente(v2, 6200, 'argus', current_date - 10);
  return next is((select count(*)::integer from public.loc_cotes_revente where client_id = c and vehicule_id = v2), 1, 'une seule cote par véhicule : la dernière remplace');
  return next is((select valeur_eur from public.loc_cotes_revente where client_id = c and vehicule_id = v2), 6200.00::numeric(10,2), 'et c''est la dernière qui reste');

  -- 2. Le plan, avec l'argent.
  x := public.loc_plan_de_flotte(c);
  select v into e from jsonb_array_elements(x -> 'agences') a, jsonb_array_elements(a -> 'categories') v
  where a ->> 'agence' = 'SIEGE' and v ->> 'categorie' = 'B3T-B';
  return next ok(e ? 'a_vendre' and e ? 'renouveler' and e ? 'deplacer', 'les chiffres de b3t_03 sont toujours là');
  select v into w from jsonb_array_elements(e -> 'vehicules') v where v ->> 'immatriculation' = 'BT-501-AA';
  return next ok(w is not null and w ->> 'decision' in ('vendre', 'renouveler'), format('BT-501 (2020) est listé : %s', w ->> 'decision'));
  return next is((w ->> 'entretien_eur')::numeric, 1250::numeric, 'BT-501 : 1 250 € d''entretien sur la période');
  return next ok((w ->> 'interventions')::integer = 2 and (w ->> 'jours_hors_service')::integer >= 4, format('deux passages, %s jours hors service', w ->> 'jours_hors_service'));
  return next ok((w ->> 'jours_loues')::integer = 10 and (w ->> 'entretien_par_jour_loue')::numeric = 125, format('dix jours loués, %s € d''entretien par jour loué', w ->> 'entretien_par_jour_loue'));
  return next ok(w ->> 'cote_eur' is null and w ->> 'raison' like '%cote de revente à noter%', 'sans cote, la ligne le dit');
  select v into w from jsonb_array_elements(e -> 'vehicules') v where v ->> 'immatriculation' = 'BT-502-AA';
  return next ok(w is not null and (w ->> 'cote_eur')::numeric = 6200 and w ->> 'cote_source' = 'argus' and not (w ->> 'cote_ancienne')::boolean,
                 'BT-502 porte sa cote Argus de 6 200 €, récente');
  return next ok((x #>> '{totaux,cotes_manquantes}')::integer >= 1 and (x #>> '{totaux,entretien_flotte_eur}')::numeric >= 1250,
                 format('totaux : %s cote(s) manquante(s), %s € d''entretien sur la flotte', x #>> '{totaux,cotes_manquantes}', x #>> '{totaux,entretien_flotte_eur}'));
  return next ok(not exists (select 1 from jsonb_array_elements(x -> 'agences') a, jsonb_array_elements(a -> 'categories') v, jsonb_array_elements(v -> 'vehicules') z
                             where z ->> 'immatriculation' = 'BT-599-AA'), 'la citadine récente de NORD n''est ni à vendre ni à renouveler');

  perform tests.redevenir_admin();
  return next ok(tests.tavaro_journal(c, 'tavaro.cote_revente_notee') >= 2, 'journal : « tavaro.cote_revente_notee »');
  return next ok(not has_function_privilege('authenticated', 'private.loc_b3t_couts(uuid, date, date)', 'execute')
                 and not has_function_privilege('authenticated', 'private.loc_b3t_plan_couts(uuid, jsonb, timestamp with time zone)', 'execute'),
                 'les calculs internes restent au service');
end $f$;

select * from runtests('tests'::name, '^test_b3t_05_');
