-- 02 — Le contrat arrive par le relevé du logiciel du loueur (scénario, étape 3) : contrat, véhicule, locataire, clé rejouée.

create or replace function tests.test_b2_02_contrat_par_releve() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; r jsonb; r2 jsonb; c public.loc_contrats; v_loc public.loc_locataires;
begin
  jeu := tests.tavaro_jeu();
  v_client := (jeu ->> 'client')::uuid;
  r := tests.tavaro_contrat(jeu);

  return next is((r ->> 'deja_applique')::boolean, false, 'Le relevé est appliqué une première fois');
  return next is((r ->> 'creations')::int, 1, 'Une création');
  return next is((r ->> 'rejetees')::int, 0, format('Aucune ligne rejetée (%s)', r -> 'erreurs'));
  return next isnt(r ->> 'contrat', null, 'Le contrat C-2026-0001 existe');
  select * into c from public.loc_contrats where id = (r ->> 'contrat')::uuid;
  return next is(c.statut, 'ouvert', 'Il est ouvert');
  return next is(c.entite_id, (jeu ->> 'siege')::uuid, 'Il est rattaché à l''agence du siège (code SIEGE)');
  return next is(c.source, 'export', 'Sa source est l''export');
  return next is(c.depart_le, timestamptz '2026-10-01 09:00:00 Europe/Paris', 'Le départ est lu à l''heure de Paris');
  return next is(c.retour_prevu_le, timestamptz '2026-10-04 09:00:00 Europe/Paris', 'Le retour prévu aussi');
  return next is(c.km_depart, 12000, 'Le compteur de départ est lu');
  return next is(c.tarif_jour_eur, 45::numeric, 'Le tarif journalier est lu');
  return next is(c.franchise_eur, 800::numeric, 'La franchise est lue');
  return next isnt(c.vehicule_id, null, 'Le véhicule GA-123-BC est créé');
  return next is((select v.statut from public.loc_vehicules v where v.id = c.vehicule_id), 'a_confirmer', 'Un véhicule inconnu du référentiel naît à confirmer');
  return next is((select v.immatriculation from public.loc_vehicules v where v.id = c.vehicule_id), 'GA-123-BC', 'La plaque est normalisée au format SIV');
  return next isnt(c.locataire_id, null, 'Le locataire est créé');
  select * into v_loc from public.loc_locataires where id = c.locataire_id;
  return next is(v_loc.nom || ' ' || v_loc.prenom || ' ' || v_loc.email, 'Durand Marie marie.durand@essai.invalid', 'Nom, prénom et courriel du locataire sont lus');
  return next is(v_loc.type, 'particulier', 'C''est un particulier');
  return next is(tests.compter('public', 'loc_releves', format('client_id = %L and nature = %L', v_client, 'contrats')), 1::bigint, 'Le relevé est tracé');

  -- La même clé rejouée n'applique rien.
  r2 := tests.tavaro_contrat(jeu);
  return next is((r2 ->> 'deja_applique')::boolean, true, 'La même clé rejouée répond deja_applique');
  return next is(tests.compter('public', 'loc_contrats', format('client_id = %L', v_client)), 1::bigint, 'Toujours un seul contrat');

  -- Une ligne sans numéro est rejetée sans faire tomber le relevé.
  r2 := public.loc_appliquer_releve(v_client, 'contrats',
    jsonb_build_array(jsonb_build_object('n', 1, 'nature', 'ajout', 'valeurs', jsonb_build_object('agence', 'SIEGE', 'depart_le', '2026-10-02T09:00:00', 'retour_prevu_le', '2026-10-03T09:00:00')),
                      tests.tavaro_ligne_contrat('C-2026-0002', 'NORD')),
    jsonb_build_object('cle', 'export:b2:2', 'source', 'export', 'lu_le', now()));
  return next is((r2 ->> 'rejetees')::int, 1, 'La ligne sans numéro est rejetée');
  return next is((r2 ->> 'creations')::int, 1, 'L''autre ligne entre');
  return next ok((r2 -> 'erreurs' -> 0 ->> 'motif') like '%numero%', format('Le motif nomme le champ manquant (%s)', r2 -> 'erreurs' -> 0 ->> 'motif'));
  return next is((select x.entite_id from public.loc_contrats x where x.client_id = v_client and x.numero = 'C-2026-0002'), (jeu ->> 'nord')::uuid, 'Le second contrat est à l''agence Nord');

  -- Le retour réel dans l'export clôt le contrat et fait avancer le compteur du véhicule.
  r2 := public.loc_appliquer_releve(v_client, 'contrats',
    jsonb_build_array(jsonb_build_object('n', 1, 'nature', 'ajout', 'valeurs', jsonb_build_object('numero', 'C-2026-0002', 'agence', 'NORD', 'retour_reel_le', '2026-10-03T10:00:00', 'km_retour', 12300))),
    jsonb_build_object('cle', 'export:b2:3', 'source', 'export', 'lu_le', now()));
  return next is((r2 ->> 'modifications')::int, 1, 'La ligne de retour modifie le contrat');
  return next is((select x.statut from public.loc_contrats x where x.client_id = v_client and x.numero = 'C-2026-0002'), 'clos', 'Un contrat rendu passe clos');
  return next is((select v.km_dernier from public.loc_vehicules v where v.id = c.vehicule_id), 12300, 'Le compteur du véhicule avance au retour');

  -- Une nature ou une source inconnue : refusées.
  return next throws_ok(format('select public.loc_appliquer_releve(%L, %L, %L::jsonb, %L::jsonb)', v_client, 'amendes', '[]', '{"cle": "x"}'), '22023', null, 'Une nature de relevé inconnue est refusée');
  return next throws_ok(format('select public.loc_appliquer_releve(%L, %L, %L::jsonb, %L::jsonb)', v_client, 'contrats', '[]', '{}'), '22023', null, 'Un relevé sans clé est refusé');
end $f$;

select * from runtests('tests'::name, '^test_b2_02_');
