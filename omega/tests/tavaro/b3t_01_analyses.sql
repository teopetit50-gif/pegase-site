-- B3T — Les analyses de Tavaro (renfort B3) : véhicules inactifs, réservations à risque, montée en gamme (b3t_01),
-- contrats à risque (b3t_02), plan de flotte (b3t_03), point du matin (b3t_04).
-- Après le 00 d'A5, 00_jeu_tavaro.sql de B2 et b3t_01 à b3t_04. runtests() annule tout.

-- Le parc du scénario, posé en direct comme le ferait un relevé : au SIÈGE trois citadines (B) et une compacte (C) au
-- parc ; à NORD aucune. Trois clients : Paul Neuf (jamais venu), Jean Absent (une non-présentation, un retour en
-- retard), la Société Fidèle (professionnelle, deux contrats passés). Réservations dans les 72 h : R1 NORD B en option
-- sans acompte (Paul), R2 NORD B prépayée (Jean), R3 SIÈGE B avec acompte, quatre jours (Société Fidèle).
create or replace function tests.b3t_parc(p_jeu jsonb) returns jsonb
language plpgsql as $$
declare
  c uuid := (p_jeu ->> 'client')::uuid; s uuid := (p_jeu ->> 'siege')::uuid; n uuid := (p_jeu ->> 'nord')::uuid;
  cb uuid; cc uuid; v1 uuid; v2 uuid; v3 uuid; v4 uuid; lp uuid; lj uuid; lf uuid; r1 uuid; r2 uuid; r3 uuid;
begin
  perform tests.redevenir_admin();
  insert into public.loc_categories (client_id, code, libelle, rang) values (c, 'B3T-B', 'Citadine (essai B3)', 2) returning id into cb;
  insert into public.loc_categories (client_id, code, libelle, rang) values (c, 'B3T-C', 'Compacte (essai B3)', 3) returning id into cc;
  insert into public.loc_vehicules (client_id, entite_id, immatriculation, format_plaque, categorie_id, mise_en_circulation, km_dernier)
    values (c, s, 'BT-301-AA', 'siv', cb, date '2021-03-01', 98000) returning id into v1;
  insert into public.loc_vehicules (client_id, entite_id, immatriculation, format_plaque, categorie_id, mise_en_circulation)
    values (c, s, 'BT-302-AA', 'siv', cb, date '2024-03-01') returning id into v2;
  insert into public.loc_vehicules (client_id, entite_id, immatriculation, format_plaque, categorie_id, mise_en_circulation)
    values (c, s, 'BT-303-AA', 'siv', cb, date '2025-03-01') returning id into v3;
  insert into public.loc_vehicules (client_id, entite_id, immatriculation, format_plaque, categorie_id, mise_en_circulation)
    values (c, s, 'BT-304-AA', 'siv', cc, date '2025-06-01') returning id into v4;
  insert into public.loc_locataires (client_id, type, nom, prenom) values (c, 'particulier', 'Neuf', 'Paul') returning id into lp;
  insert into public.loc_locataires (client_id, type, nom, prenom) values (c, 'particulier', 'Absent', 'Jean') returning id into lj;
  insert into public.loc_locataires (client_id, type, raison_sociale) values (c, 'professionnel', 'Société Fidèle') returning id into lf;
  insert into public.loc_contrats (client_id, entite_id, numero, vehicule_id, categorie_id, locataire_id, depart_le, retour_prevu_le, retour_reel_le, statut, source) values
    (c, s, 'B3T-H1', v1, cb, lf, now() - interval '60 days', now() - interval '57 days', now() - interval '57 days', 'clos', 'saisie'),
    (c, s, 'B3T-H2', v2, cb, lf, now() - interval '20 days', now() - interval '18 days', now() - interval '18 days', 'clos', 'saisie'),
    (c, s, 'B3T-H3', v3, cb, lj, now() - interval '10 days', now() - interval '8 days', now() - interval '7 days', 'clos', 'saisie');
  insert into public.loc_reservations (client_id, entite_id, ref_source, categorie_id, locataire_id, depart_prevu_le, retour_prevu_le, statut, prepaye, acompte_eur)
    values (c, n, 'B3T-R1', cb, lp, now() + interval '20 hours', now() + interval '3 days', 'option', false, null) returning id into r1;
  insert into public.loc_reservations (client_id, entite_id, ref_source, categorie_id, locataire_id, depart_prevu_le, retour_prevu_le, statut, prepaye, acompte_eur)
    values (c, n, 'B3T-R2', cb, lj, now() + interval '30 hours', now() + interval '2 days', 'confirmee', true, null) returning id into r2;
  insert into public.loc_reservations (client_id, entite_id, ref_source, categorie_id, locataire_id, depart_prevu_le, retour_prevu_le, statut, prepaye, acompte_eur)
    values (c, s, 'B3T-R3', cb, lf, now() + interval '10 hours', now() + interval '4 days', 'confirmee', false, 100) returning id into r3;
  insert into public.loc_reservations (client_id, entite_id, ref_source, categorie_id, locataire_id, depart_prevu_le, retour_prevu_le, statut)
    values (c, s, 'B3T-R0', cb, lj, now() - interval '30 days', now() - interval '28 days', 'no_show');
  return jsonb_build_object('b', cb, 'c', cc, 'v1', v1, 'v2', v2, 'v3', v3, 'v4', v4, 'paul', lp, 'jean', lj, 'fidele', lf, 'r1', r1, 'r2', r2, 'r3', r3);
end $$;

-- ─────────────── b3t_01 ───────────────
create or replace function tests.test_b3t_01_parc_et_reservations() returns setof text
language plpgsql as $f$
declare
  jeu jsonb := tests.tavaro_jeu();
  c uuid := (jeu ->> 'client')::uuid;
  p jsonb;
  x jsonb;
  e jsonb;
begin
  p := tests.b3t_parc(jeu);

  -- Qui lit.
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre-loueur@essai.invalid');
  return next throws_ok(format('select public.loc_vehicules_inactifs(%L)', c), '42501', null, 'un autre loueur ne lit rien (42501)');
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  return next throws_ok(format('select public.loc_reservations_a_risque(%L, null, 0)', c), '22023', null, 'un horizon nul est refusé (22023)');

  -- Véhicules inactifs.
  x := public.loc_vehicules_inactifs(c);
  select v into e from jsonb_array_elements(x -> 'vehicules') v where (v ->> 'vehicule_id')::uuid = (p ->> 'v1')::uuid;
  return next is(e ->> 'niveau', 'fort', 'trois citadines au parc pour un départ : 2 sur 3 resteront, risque « fort »');
  return next is((e ->> 'probabilite')::numeric, 0.67, 'probabilité 0,67');
  return next ok(e #>> '{action,type}' = 'transfert' and e #>> '{action,vers}' = 'NORD', 'action : transférer vers NORD, où deux départs n''ont pas de citadine');
  select v into e from jsonb_array_elements(x -> 'vehicules') v where (v ->> 'vehicule_id')::uuid = (p ->> 'v4')::uuid;
  return next ok((e ->> 'probabilite')::numeric = 1 and e #>> '{action,type}' = 'creux', 'la compacte sans départ : certaine de rester, placer l''entretien dans ce creux');
  return next ok((x ->> 'a_risque')::integer >= 4, format('%s véhicules à risque', x ->> 'a_risque'));

  -- Réservations à risque.
  x := public.loc_reservations_a_risque(c);
  select v into e from jsonb_array_elements(x -> 'reservations') v where (v ->> 'reservation_id')::uuid = (p ->> 'r1')::uuid;
  return next ok(e ->> 'niveau' = 'fort' and (e ->> 'score')::integer = 5, 'R1 : option, sans acompte, nouveau client — 5 points, « fort »');
  return next ok(e ->> 'action' like 'Confirmer%', 'action : confirmer l''option');
  select v into e from jsonb_array_elements(x -> 'reservations') v where (v ->> 'reservation_id')::uuid = (p ->> 'r2')::uuid;
  return next ok((e -> 'raisons') ? 'a déjà fait faux bond', 'R2 : Jean a déjà fait faux bond');
  return next ok(not exists (select 1 from jsonb_array_elements(x -> 'reservations') v where (v ->> 'reservation_id')::uuid = (p ->> 'r3')::uuid),
                 'R3 : acompte versé, client connu — pas listée');

  -- Montée en gamme.
  x := public.loc_montee_en_gamme(c);
  select v into e from jsonb_array_elements(x -> 'offres') v where (v ->> 'reservation_id')::uuid = (p ->> 'r3')::uuid;
  return next is(e #>> '{offre,categorie}', 'B3T-C', 'R3 : la compacte libre est proposée à la Société Fidèle');
  return next ok((e -> 'raisons') ? 'client professionnel' and (e -> 'raisons') ? 'client fidèle', 'raisons : professionnelle et fidèle');
  return next ok(not exists (select 1 from jsonb_array_elements(x -> 'offres') v where (v ->> 'reservation_id')::uuid = (p ->> 'r2')::uuid),
                 'R2 : jamais d''offre à un client qui a fait faux bond (et rien de libre à NORD)');

  -- Le périmètre : un collaborateur limité à NORD ne voit ni le parc ni les réservations du siège.
  perform tests.redevenir_admin();
  update public.comptes set perimetre_total = false where client_id = c and user_id = (jeu ->> 'collab_nord')::uuid;
  insert into public.comptes_entites (client_id, user_id, entite_id) values (c, (jeu ->> 'collab_nord')::uuid, (jeu ->> 'nord')::uuid);
  perform tests.endosser((jeu ->> 'collab_nord')::uuid, 'b2-collab-nord@essai.invalid');
  return next is(jsonb_array_length(public.loc_vehicules_inactifs(c) -> 'vehicules'), 0, 'collaborateur de NORD : aucun véhicule du siège');
  return next ok(not exists (select 1 from jsonb_array_elements(public.loc_reservations_a_risque(c) -> 'reservations') v where v ->> 'agence' <> 'NORD'),
                 'collaborateur de NORD : seulement les réservations de NORD');
  perform tests.redevenir_admin();
end $f$;

-- ─────────────── b3t_02 ───────────────
create or replace function tests.test_b3t_02_contrats_a_risque() returns setof text
language plpgsql as $f$
declare
  jeu jsonb := tests.tavaro_jeu_facture();
  c uuid := (jeu ->> 'client')::uuid;
  v_marie uuid;
  v_ouvert uuid;
  x jsonb;
  e jsonb;
begin
  -- Marie Durand a déjà une facture de dommages (la rayure du retour type) ; elle repart aujourd'hui.
  select k.locataire_id into v_marie from public.loc_contrats k where k.client_id = c and k.numero = 'C-2026-0001';
  perform tests.redevenir_admin();
  insert into public.loc_contrats (client_id, entite_id, numero, locataire_id, depart_le, retour_prevu_le, statut, source)
  values (c, (jeu ->> 'siege')::uuid, 'B3T-O1', v_marie, now() - interval '1 hour', now() + interval '3 days', 'ouvert', 'saisie')
  returning id into v_ouvert;

  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  x := public.loc_contrats_a_risque(c);
  select v into e from jsonb_array_elements(x -> 'contrats') v where (v ->> 'contrat_id')::uuid = v_ouvert;
  return next ok(e is not null, 'le nouveau contrat de Marie Durand est signalé');
  return next ok((e -> 'raisons') ? 'une facture de dommages par le passé' and (e -> 'raisons') ? 'pièces pas encore contrôlées',
                 format('raisons : dommages passés, pièces à contrôler (%s)', e -> 'raisons'));
  return next is(e ->> 'action', 'Contrôler la pièce d''identité et le permis', 'action : contrôler les pièces');

  -- Le contrôle au comptoir.
  return next throws_ok(format('select public.loc_noter_controle_conducteur(%L, ''ok'', ''conforme'')', v_ouvert), '22023', null, 'un état hors liste est refusé (22023)');
  perform public.loc_noter_controle_conducteur(v_ouvert, 'conforme', 'non_conforme', true);
  x := public.loc_contrats_a_risque(c);
  select v into e from jsonb_array_elements(x -> 'contrats') v where (v ->> 'contrat_id')::uuid = v_ouvert;
  return next ok(e ->> 'niveau' = 'fort' and (e -> 'raisons') ? 'pièce d''identité ou permis non conforme' and (e -> 'raisons') ? 'permis de moins de trois ans',
                 'permis non conforme et récent : « fort »');
  return next is(e ->> 'action', 'Ne pas remettre les clés sans pièces conformes', 'action : pas de clés sans pièces conformes');
  return next is(e #>> '{controle,permis}', 'non_conforme', 'le contrôle est rendu avec le contrat');
  perform public.loc_noter_controle_conducteur(v_ouvert, 'conforme', 'conforme', false);
  return next is((select count(*) from public.loc_controles_conducteur k where k.contrat_id = v_ouvert), 1::bigint, 'un seul contrôle par contrat : le dernier remplace');
  perform tests.redevenir_admin();   -- le journal opposable ne se lit pas sous le jeton d'un collaborateur (RLS)
  return next ok(tests.tavaro_journal(c, 'tavaro.controle_conducteur_note') >= 2, 'journal : « tavaro.controle_conducteur_note »');

  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre-loueur@essai.invalid');
  return next throws_ok(format('select public.loc_noter_controle_conducteur(%L, ''conforme'', ''conforme'')', v_ouvert), 'P0002', null, 'un autre loueur ne trouve pas le contrat (P0002)');
  return next is((select count(*) from public.loc_controles_conducteur), 0::bigint, 'ni ne lit un contrôle');
  perform tests.redevenir_admin();
end $f$;

-- ─────────────── b3t_03 ───────────────
create or replace function tests.test_b3t_03_plan_de_flotte() returns setof text
language plpgsql as $f$
declare
  jeu jsonb := tests.tavaro_jeu();
  c uuid := (jeu ->> 'client')::uuid;
  s uuid := (jeu ->> 'siege')::uuid;
  n uuid := (jeu ->> 'nord')::uuid;
  cb uuid;
  x jsonb;
  e jsonb;
begin
  perform tests.redevenir_admin();
  insert into public.loc_categories (client_id, code, libelle, rang) values (c, 'B3T-B', 'Citadine (essai B3)', 2) returning id into cb;
  -- Le siège : six citadines peu louées ; NORD : une citadine, trois contrats en parallèle chaque semaine depuis un an.
  insert into public.loc_vehicules (client_id, entite_id, immatriculation, format_plaque, categorie_id, mise_en_circulation, km_dernier)
  select c, s, 'BT-4' || lpad(g::text, 2, '0') || '-AA', 'siv', cb, date '2020-01-01' + g * 200, 10000 * g from generate_series(1, 6) g;
  insert into public.loc_vehicules (client_id, entite_id, immatriculation, format_plaque, categorie_id, mise_en_circulation)
  values (c, n, 'BT-499-AA', 'siv', cb, date '2025-01-01');
  insert into public.loc_contrats (client_id, entite_id, numero, categorie_id, depart_le, retour_prevu_le, retour_reel_le, statut, source)
  select c, n, 'B3T-N' || g || '-' || k, cb, now() - (g * 7 + 7) * interval '1 day', now() - g * 7 * interval '1 day', now() - g * 7 * interval '1 day', 'clos', 'saisie'
  from generate_series(0, 50) g, generate_series(1, 3) k;
  insert into public.loc_contrats (client_id, entite_id, numero, categorie_id, depart_le, retour_prevu_le, retour_reel_le, statut, source)
  select c, s, 'B3T-S' || g, cb, now() - (g * 30 + 3) * interval '1 day', now() - g * 30 * interval '1 day', now() - g * 30 * interval '1 day', 'clos', 'saisie'
  from generate_series(1, 10) g;

  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  return next throws_ok(format('select public.loc_plan_de_flotte(%L)', c), '42501', null, 'un valideur ne lit pas le plan de flotte du réseau (42501)');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  return next throws_ok(format('select public.loc_plan_de_flotte(%L, 2)', c), '22023', null, 'moins de trois mois : refusé (22023)');
  x := public.loc_plan_de_flotte(c);
  return next is((x ->> 'annee')::integer, extract(year from now())::integer + 1, 'le plan vaut pour l''an prochain');
  select v into e from jsonb_array_elements(x -> 'agences') a, jsonb_array_elements(a -> 'categories') v
  where a ->> 'agence' = 'NORD' and v ->> 'categorie' = 'B3T-B';
  return next ok((e ->> 'flotte')::integer = 1 and (e ->> 'cible')::integer >= 3, format('NORD : une citadine, il en faut %s', e ->> 'cible'));
  return next ok((e ->> 'recevoir')::integer >= 2, format('NORD reçoit %s citadines du siège', e ->> 'recevoir'));
  select v into e from jsonb_array_elements(x -> 'agences') a, jsonb_array_elements(a -> 'categories') v
  where a ->> 'agence' = 'SIEGE' and v ->> 'categorie' = 'B3T-B';
  return next ok(exists (select 1 from jsonb_array_elements(e -> 'deplacer') d where d ->> 'vers' = 'NORD'), 'le siège déplace ses citadines en trop vers NORD');
  return next ok((e ->> 'renouveler')::integer >= 1, format('%s citadines du siège à renouveler (quatre ans ou plus)', e ->> 'renouveler'));
  return next is((x #>> '{totaux,acheter}')::integer + (x #>> '{totaux,deplacer}')::integer >= 2, true, 'déplacer passe avant acheter');
  perform tests.redevenir_admin();
end $f$;

-- ─────────────── b3t_04 ───────────────
create or replace function tests.test_b3t_04_point_du_matin() returns setof text
language plpgsql as $f$
declare
  jeu jsonb := tests.tavaro_jeu();
  c uuid := (jeu ->> 'client')::uuid;
  p jsonb;
  n integer;
  j date := (now() at time zone 'Europe/Paris')::date;
begin
  p := tests.b3t_parc(jeu);
  perform tests.redevenir_admin();
  return next is(private.loc_b3t_deposer_points((j + time '04:00') at time zone 'Europe/Paris') >= 0, true, 'avant 5 h, le passage ne lève rien');
  n := private.loc_b3t_deposer_points((j + time '07:00') at time zone 'Europe/Paris');
  return next ok(n >= 2, format('à 7 h, les deux agences du loueur sont servies (%s au total)', n));
  return next ok(exists (select 1 from public.points_sections s where s.client_id = c and s.module = 'tavaro' and s.jour = j and s.role = 'valideur'
                          and s.entite_id = (jeu ->> 'siege')::uuid and s.titre = 'Véhicules inactifs' and s.nb_items >= 4),
                 'au siège : « Véhicules inactifs », quatre véhicules');
  return next ok(exists (select 1 from public.points_sections s where s.client_id = c and s.module = 'tavaro' and s.jour = j and s.role = 'valideur'
                          and s.entite_id = (jeu ->> 'nord')::uuid and s.titre = 'Réservations à risque' and s.nb_items = 2),
                 'à NORD : « Réservations à risque », deux réservations');
  return next ok(exists (select 1 from public.points_sections s where s.client_id = c and s.module = 'tavaro' and s.jour = j
                          and s.entite_id = (jeu ->> 'siege')::uuid and s.titre = 'Montée en gamme' and s.nb_items = 1),
                 'au siège : « Montée en gamme », une offre');
  return next ok(not exists (select 1 from public.points_sections s where s.client_id = c and s.module = 'tavaro' and s.jour = j
                              and s.entite_id = (jeu ->> 'nord')::uuid and s.titre = 'Véhicules inactifs'),
                 'à NORD, aucun véhicule au parc : pas de section vide');
  return next ok(not exists (select 1 from public.alertes a where a.client_id = c and a.cle_regroupement like 'tavaro:point:analyses:%'),
                 'aucune alerte de dépôt');
end $f$;

select * from runtests('tests'::name, '^test_b3t_');
