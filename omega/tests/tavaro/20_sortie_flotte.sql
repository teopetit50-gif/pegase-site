-- 20 — Sortie de flotte (migration b2_11) : la fiche économique d'un véhicule (revenu, coûts, perte de valeur au prix
-- de revente réel, avis, moment, canal), lue par la direction et les valideurs seulement ; la mise en vente proposée,
-- validée par une autre personne de la direction, puis conclue : le véhicule sort de la flotte, tout est au journal.

create or replace function tests.test_b2_20_sortie_flotte() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_vehicule uuid; r jsonb; v_fiches jsonb; v_sortie uuid;
begin
  if to_regprocedure('public.loc_fiches_flotte()') is null then
    return next fail('La migration b2_11 (sortie de flotte) n''est pas posée : public.loc_fiches_flotte manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_contrat();
  v_client := (jeu ->> 'client')::uuid;
  select c.vehicule_id into v_vehicule from public.loc_contrats c where c.id = (jeu ->> 'contrat')::uuid;
  return next ok(v_vehicule is not null, 'Le contrat d''essai porte son véhicule');

  -- La fiche se lit par la direction et les valideurs.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok('select public.loc_fiches_flotte()', '42501', null, 'Un collaborateur ne lit pas la fiche économique');
  return next throws_ok(format('select public.loc_poser_economie(%L::uuid, %L::jsonb)', v_vehicule, '{"cote_eur": 9000, "cote_source": "argus"}'), '42501', null, 'Ni ne saisit la cote');

  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  return next throws_ok(format('select public.loc_poser_economie(%L::uuid, %L::jsonb)', v_vehicule, '{"cote_eur": 9000}'), '22023', null, 'Une cote sans source est refusée');
  r := public.loc_poser_economie(v_vehicule, jsonb_build_object('financement', 'achat', 'prix_achat_eur', 16500, 'cote_eur', 9000, 'cote_source', 'argus', 'valeur_comptable_eur', 7200));
  return next is((r -> 'cote' ->> 'eur')::numeric, 9000::numeric, 'La cote réelle est sur la fiche');
  return next is((r ->> 'ecart_cote_comptable')::numeric, 1800::numeric, 'La fiche montre l''écart entre la cote réelle et la valeur comptable');
  return next ok(r ? 'avis' and r ->> 'avis' in ('sortir', 'surveiller', 'garder') and r ? 'canal' and r ? 'marge', 'La fiche donne un avis, un canal et une marge');
  return next ok((r -> 'revenu' ->> 'jours_loues')::numeric >= 1, 'Le revenu compte les jours loués du contrat');
  v_fiches := public.loc_fiches_flotte();
  return next ok(jsonb_array_length(v_fiches) >= 1, 'Les fiches de la flotte se lisent');

  -- La mise en vente : le gérant propose, il ne valide pas lui-même.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  return next throws_ok(format('select public.loc_proposer_sortie(%L::uuid, %L::jsonb)', v_vehicule, '{}'), '22023', null, 'Une proposition sans motif est refusée');
  v_sortie := (public.loc_proposer_sortie(v_vehicule, jsonb_build_object('motif', 'Marge négative sur douze mois et kilométrage au seuil')) ->> 'sortie')::uuid;
  return next ok(v_sortie is not null, 'La direction propose la mise en vente');
  return next throws_ok(format('select public.loc_proposer_sortie(%L::uuid, %L::jsonb)', v_vehicule, '{"motif": "une seconde fois"}'), '23505', null, 'Une seule sortie ouverte par véhicule');
  return next throws_ok(format('select public.loc_decider_sortie(%L::uuid, true)', v_sortie), '42501', null, 'Celui qui propose ne valide pas lui-même');
  perform public.loc_annuler_sortie(v_sortie, 'Proposée par le valideur à la place');

  -- Le valideur propose ; le gérant valide ; la vente se conclut.
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  v_sortie := (public.loc_proposer_sortie(v_vehicule, jsonb_build_object('motif', 'Marge négative sur douze mois', 'canal', 'marchand')) ->> 'sortie')::uuid;
  return next throws_ok(format('select public.loc_decider_sortie(%L::uuid, true)', v_sortie), '42501', null, 'Un valideur ne valide pas une mise en vente');
  return next throws_ok(format('select public.loc_conclure_sortie(%L::uuid, 8800)', v_sortie), '23514', null, 'Une vente ne se conclut pas avant la validation');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  r := public.loc_decider_sortie(v_sortie, true);
  return next is(r ->> 'statut', 'validee', 'La direction valide la mise en vente');
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  r := public.loc_conclure_sortie(v_sortie, 8800, current_date, 'Marchand d''essai');
  return next is(r ->> 'statut', 'vendue', 'La vente est conclue');
  perform tests.redevenir_admin();
  return next is((select v.statut from public.loc_vehicules v where v.id = v_vehicule), 'sorti', 'Le véhicule est sorti de la flotte');
  return next ok((select (s.fiche ->> 'immatriculation') is not null from public.loc_sorties_flotte s where s.id = v_sortie), 'La fiche est figée sur la sortie');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.sortie_validee') >= 1 and tests.tavaro_journal(v_client, 'tavaro.sortie_conclue') >= 1,
    'Le journal garde la validation et la vente');
  -- b2_11b : l'import ne remet pas en service un véhicule vendu.
  if to_regprocedure('private.loc_garder_vehicule_sorti()') is null then
    return next diag('b2_11b (garde du véhicule sorti) n''est pas posée : non vérifié.');
  else
    update public.loc_vehicules set statut = 'actif' where id = v_vehicule;
    return next is((select v.statut from public.loc_vehicules v where v.id = v_vehicule), 'sorti', 'Un import qui remet « actif » un véhicule vendu ne le remet pas en service');
  end if;
end $f$;

select * from runtests('tests'::name, '^test_b2_20_');
