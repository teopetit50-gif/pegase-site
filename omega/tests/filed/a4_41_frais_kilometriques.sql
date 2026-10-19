-- Tests A4 — lot 45 (a4_53) : indemnités kilométriques au barème. Données fictives.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation (a4_10_facture_electronique.sql) et tests.a4_comme
-- (a4_26_sortie_envois.sql), à poser avant. Ce fichier ne supprime rien.

create or replace function tests.test_a4_53_01_bareme() returns setof text
language plpgsql as $f$
begin
  -- Barème BOFiP revenus 2022 (BOI-BAREME-000001 du 20/07/2023). Voiture 5 CV : 0,636 € par km jusqu'à 5 000 km ; 0,357 × d + 1 395 de 5 001 à 20 000 km ; continu à 5 000 km.
  return next is(private.filed_bareme_km(2022, 'voiture', 5, 100), 63.60::numeric, '100 km en 5 CV : 63,60 €');
  return next is(private.filed_bareme_km(2022, 'voiture', 5, 5000), 3180.00::numeric, '5 000 km : 3 180 €');
  return next is(private.filed_bareme_km(2022, 'voiture', 5, 6000), round(6000 * 0.357 + 1395, 2), '6 000 km : la deuxième tranche');
  return next is(private.filed_bareme_km(2022, 'moto', 4, 1000), 468.00::numeric, 'Moto 4 CV : 1 000 km à 0,468');
  return next throws_ok($$select private.filed_bareme_km(1999, 'voiture', 5, 10)$$, '22023', null, 'Sans barème pour l''année : refus clair');
end $f$;

create or replace function tests.test_a4_53_02_trajets() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; v uuid := (o ->> 'valideur')::uuid; g uuid := (o ->> 'gerant')::uuid;
        t1 uuid; t2 uuid; t3 uuid; e jsonb; n integer; v_le date := date_trunc('month', current_date)::date;
begin
  -- La valideuse déclare ses trajets (5 CV) : 4 900 km puis 200 km, qui franchissent la tranche des 5 000 km.
  reset role; perform tests.a4_comme(v);
  t1 := public.filed_declarer_trajet(v_cl, (o ->> 'entite')::uuid, v_le, 4900, 'voiture', 5, 'Tournée clients (exemple)', 'Lyon', 'Grenoble');
  t2 := public.filed_declarer_trajet(v_cl, (o ->> 'entite')::uuid, v_le, 200, 'voiture', 5, 'Rendez-vous fournisseur (exemple)');
  return next throws_ok(format('select public.filed_decider_trajet(%L, true)', t1), '42501', null, 'On n''approuve pas son propre trajet');
  reset role;
  return next is((select montant from public.filed_trajets_km where id = t1), 3116.40::numeric, '4 900 km : 4 900 × 0,636');
  return next is((select montant from public.filed_trajets_km where id = t2), round((5100 * 0.357 + 1395) - 3116.40, 2),
                 'Les 200 km suivants : la part que le barème annuel ajoute');

  -- Le gérant approuve le premier, refuse le second (avec motif) ; un véhicule électrique est majoré de 20 %.
  reset role; perform tests.a4_comme(g);
  perform public.filed_decider_trajet(t1, true);
  return next throws_ok(format('select public.filed_decider_trajet(%L, false)', t2), '22023', null, 'Un refus porte son motif');
  perform public.filed_decider_trajet(t2, false, 'Trajet domicile-travail');
  t3 := public.filed_declarer_trajet(v_cl, (o ->> 'entite')::uuid, v_le, 100, 'voiture', 5, 'Visite (exemple)', null, null, true, v);
  e := public.filed_etat_frais_km(v_cl, v, v_le);
  reset role;
  return next is((select montant from public.filed_trajets_km where id = t3),
                 round((private.filed_bareme_km(2022, 'voiture', 5, 5000) - private.filed_bareme_km(2022, 'voiture', 5, 4900)) * 1.2, 2),
                 'Électrique : +20 %, et le trajet refusé ne compte plus dans le cumul');
  return next is((e ->> 'total_approuve')::numeric, 3116.40::numeric, 'L''état du mois : seul l''approuvé compte dans le total');
  return next ok(e ->> 'contenu' like 'date;depart;arrivee;motif;km;%' and e ->> 'contenu' like '%Lyon%' and e ->> 'contenu' not like '%domicile%',
                 'L''état CSV liste les trajets, sans le refusé');
  reset role; perform tests.a4_comme(g);
  n := public.filed_rembourser_frais_km(v_cl, v, v_le);
  reset role;
  return next is(n, 1, 'Le remboursement marque les trajets approuvés du mois');
  return next is((select statut from public.filed_trajets_km where id = t1), 'remboursee', 'remboursé');
end $f$;
