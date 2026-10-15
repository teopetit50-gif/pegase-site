-- 22 — Transferts entre agences (migration b2_13) : au prochain pic, les réservations sans véhicule d'une agence sont
-- couvertes par les véhicules libres d'une autre agence ; les propositions se regroupent en tournées, se valident ou se
-- refusent par la direction ; un transfert fait déplace le véhicule ; une proposition refaite remplace, ne double pas.

create or replace function tests.test_b2_22_transferts() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; c uuid; s uuid; n uuid; cat uuid; v_jour date; v_depart timestamptz; r jsonb; v_tournee text; v_transfert uuid; v_vehicule uuid;
begin
  if to_regprocedure('public.loc_proposer_transferts(date)') is null then
    return next fail('La migration b2_13 (transferts) n''est pas posée : public.loc_proposer_transferts manque');
    return;
  end if;
  jeu := tests.tavaro_jeu();
  c := (jeu ->> 'client')::uuid; s := (jeu ->> 'siege')::uuid; n := (jeu ->> 'nord')::uuid;
  v_jour := (now() at time zone 'Europe/Paris')::date + 2;
  v_depart := (v_jour::timestamp + time '10:00') at time zone 'Europe/Paris';
  perform tests.redevenir_admin();
  insert into public.loc_categories (client_id, code, libelle, rang) values (c, 'B2T-B', 'Citadine (essai B2)', 2) returning id into cat;
  insert into public.loc_vehicules (client_id, entite_id, immatriculation, format_plaque, categorie_id)
  select c, s, 'BT-22' || g || '-AA', 'siv', cat from generate_series(1, 3) g;
  insert into public.loc_reservations (client_id, entite_id, ref_source, categorie_id, depart_prevu_le, retour_prevu_le, statut)
  select c, n, 'B2T-R' || g, cat, v_depart, v_depart + interval '3 days', 'confirmee' from generate_series(1, 2) g;

  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_proposer_transferts(%L::date)', v_jour), '42501', null, 'Un collaborateur ne propose pas les transferts');

  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  r := public.loc_proposer_transferts(v_jour);
  return next is((r ->> 'transferts')::int, 2, 'Deux réservations sans véhicule au Nord : deux transferts proposés depuis le siège');
  return next is((select count(distinct t.tournee) from public.loc_transferts t where t.client_id = c and t.statut = 'propose'), 1::bigint, 'Ils forment une seule tournée');
  return next ok((select bool_and(t.origine_entite_id = s and t.destination_entite_id = n and t.pour_le < v_depart) from public.loc_transferts t where t.client_id = c and t.statut = 'propose'),
                 'Du siège vers le Nord, la veille du pic');
  perform public.loc_proposer_transferts(v_jour);
  return next is(tests.compter('public', 'loc_transferts', format('client_id = %L and statut = %L', c, 'propose')), 2::bigint, 'Proposer à nouveau remplace, ne double pas');

  select t.tournee into v_tournee from public.loc_transferts t where t.client_id = c and t.statut = 'propose' limit 1;
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_decider_transferts(%L, true)', v_tournee), '42501', null, 'Un collaborateur ne valide pas une tournée');
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  r := public.loc_decider_transferts(v_tournee, true);
  return next is((r ->> 'transferts')::int, 2, 'La tournée entière est validée');
  return next throws_ok(format('select public.loc_decider_transferts(%L, true)', v_tournee), 'P0002', null, 'Une tournée déjà décidée ne se redécide pas');
  r := public.loc_proposer_transferts(v_jour);
  return next is((r ->> 'transferts')::int, 0, 'Les transferts validés comptent : plus rien à proposer');

  select t.id, t.vehicule_id into v_transfert, v_vehicule from public.loc_transferts t where t.client_id = c and t.statut = 'valide' limit 1;
  perform tests.endosser((jeu ->> 'collab_nord')::uuid, 'b2-collab-nord@essai.invalid');
  r := public.loc_transfert_fait(v_transfert, 'Convoyeur Martin');
  return next is(r ->> 'statut', 'fait', 'L''agence d''arrivée note le transfert fait');
  perform tests.redevenir_admin();
  return next is(private.loc_position_vehicule(c, v_vehicule, now()), n, 'Le véhicule est au Nord');
  return next ok(tests.tavaro_journal(c, 'tavaro.transfert_fait') >= 1, 'Le journal porte tavaro.transfert_fait');
  perform tests.endosser((jeu ->> 'collab_nord')::uuid, 'b2-collab-nord@essai.invalid');
  return next throws_ok(format('select public.loc_transfert_fait(%L::uuid)', v_transfert), '23514', null, 'Un transfert fait ne se refait pas');
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre@essai.invalid');
  return next throws_ok(format('select public.loc_transfert_fait(%L::uuid)', v_transfert), 'P0002', null, 'Un autre loueur ne voit pas le transfert');
end $f$;

select * from runtests('tests'::name, '^test_b2_22_');
