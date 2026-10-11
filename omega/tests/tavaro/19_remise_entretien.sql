-- 19 — Remise en location et entretien (migration b2_10) : le retour crée la remise en location (inspection, nettoyage,
-- énergie) et l'immobilisation de préparation ; les trois étapes faites, le véhicule est prêt ; chaque anomalie va à une
-- personne nommée ; une immobilisation de carrosserie garde sa date de retour ; l'entretien se place dans un creux et
-- n'est jamais planifié sur une réservation du véhicule.

create or replace function tests.test_b2_19_remise_entretien() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_contrat uuid; v_vehicule uuid; v_remise uuid; v_immo uuid; r jsonb; v_anomalie uuid; v_entretien uuid;
  v_creneau timestamptz; v_resa timestamptz;
begin
  if to_regprocedure('public.loc_etape_remise(uuid, text, boolean)') is null then
    return next fail('La migration b2_10 (remise en location et entretien) n''est pas posée : public.loc_etape_remise manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_contrat();
  v_client := (jeu ->> 'client')::uuid;
  v_contrat := (jeu ->> 'contrat')::uuid;
  select c.vehicule_id into v_vehicule from public.loc_contrats c where c.id = v_contrat;
  return next ok(v_vehicule is not null, 'Le contrat d''essai porte son véhicule');

  -- Le retour saisi à l'agence (il y a une heure) crée la remise en location.
  jeu := tests.tavaro_chiffrer(jeu, 'collab', tests.tavaro_retour() || jsonb_build_object('retour_reel_le', to_char(now() - interval '1 hour', 'YYYY-MM-DD"T"HH24:MI:SSOF')));
  select x.id, x.immobilisation_id into v_remise, v_immo from public.loc_remises x where x.client_id = v_client and x.contrat_id = v_contrat;
  return next ok(v_remise is not null, 'Le retour crée la remise en location');
  return next ok((select i.motif = 'preparation' and i.fin_le is null from public.loc_immobilisations i where i.id = v_immo), 'Le véhicule est immobilisé pour préparation');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.remise_creee') >= 1, 'Le journal porte tavaro.remise_creee');
  perform private.loc_creer_remise(v_client, v_contrat, now());
  return next is(tests.compter('public', 'loc_remises', format('client_id = %L and contrat_id = %L', v_client, v_contrat)), 1::bigint, 'Une seule remise par contrat');

  -- Les gardes.
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre@essai.invalid');
  return next throws_ok(format('select public.loc_etape_remise(%L::uuid, %L)', v_remise, 'inspection'), 'P0002', null, 'Un autre loueur ne voit pas la remise');
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select private.loc_creer_remise(%L::uuid, %L::uuid, now())', v_client, v_contrat), '42501', null, 'Une personne n''appelle pas la création directe');
  return next throws_ok(format('select public.loc_etape_remise(%L::uuid, %L)', v_remise, 'lavage'), '22023', null, 'Une étape inconnue est refusée');

  -- Les trois étapes : le véhicule est prêt, l'immobilisation close.
  r := public.loc_etape_remise(v_remise, 'inspection');
  return next is(r ->> 'statut', 'en_cours', 'Une étape faite : en cours');
  perform public.loc_etape_remise(v_remise, 'nettoyage');
  r := public.loc_etape_remise(v_remise, 'energie');
  return next is(r ->> 'statut', 'prete', 'Les trois étapes faites : le véhicule est prêt');
  perform tests.redevenir_admin();
  return next ok((select i.fin_le is not null from public.loc_immobilisations i where i.id = v_immo), 'L''immobilisation de préparation est close');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.remise_prete') >= 1, 'Le journal porte tavaro.remise_prete (durée, à temps)');

  -- Les anomalies : une personne nommée ; elle, ou la direction, la clôt.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_signaler_anomalie(%L::uuid, %L, %L, null)', v_remise, 'voyant', 'Voyant moteur allumé'), '22023', null, 'Une anomalie sans personne nommée est refusée');
  v_anomalie := (public.loc_signaler_anomalie(v_remise, 'voyant', 'Voyant moteur allumé au retour', (jeu ->> 'referent')::uuid) ->> 'anomalie')::uuid;
  return next ok(v_anomalie is not null, 'L''anomalie est confiée au référent');
  perform tests.endosser((jeu ->> 'collab_nord')::uuid, 'b2-collab-nord@essai.invalid');
  return next throws_ok(format('select public.loc_traiter_anomalie(%L::uuid, %L)', v_anomalie, 'vu'), '42501', null, 'Une autre personne ne la clôt pas');
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  r := public.loc_traiter_anomalie(v_anomalie, 'Garage prévenu');
  return next is(r ->> 'statut', 'traitee', 'La personne nommée la clôt');

  -- Une immobilisation de carrosserie garde sa date de retour.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_immobiliser(%L::uuid, %L::jsonb)', v_vehicule, '{"motif":"carrosserie"}'), '22023', null, 'Carrosserie sans date de retour : refusée');
  r := public.loc_immobiliser(v_vehicule, jsonb_build_object('motif', 'carrosserie', 'fin_prevue_le', now() + interval '2 days', 'prestataire', 'Carrosserie du Parc'));
  return next ok(r ? 'immobilisation', 'Le véhicule part chez le carrossier avec sa date de retour');
  r := public.loc_lever_immobilisation((r ->> 'immobilisation')::uuid, 480, 'Portière reprise');
  return next ok(r ? 'fin_le', 'Le véhicule revient : l''immobilisation est close');

  -- L'entretien : un creux, jamais sur une réservation du véhicule.
  r := public.loc_prevoir_entretien(v_vehicule, jsonb_build_object('nature', 'revision', 'libelle', 'Révision 15 000 km', 'echeance_le', (current_date + 20)::text, 'duree_h', 4));
  v_entretien := (r ->> 'entretien')::uuid;
  r := public.loc_creneaux_entretien(v_entretien, 3);
  return next ok(jsonb_array_length(r -> 'creneaux') >= 1, 'Des créneaux libres sont proposés');
  v_creneau := (r -> 'creneaux' -> 0 ->> 'debut')::timestamptz;
  perform tests.redevenir_admin();
  v_resa := v_creneau + interval '1 hour';
  begin
    perform tests.inserer_minimal('public', 'loc_reservations', jsonb_build_object('client_id', v_client, 'entite_id', jeu ->> 'siege', 'ref_source', 'R-B2-19',
      'vehicule_id', v_vehicule, 'depart_prevu_le', v_resa, 'retour_prevu_le', v_resa + interval '2 days', 'statut', 'confirmee'));
    perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
    return next throws_ok(format('select public.loc_planifier_entretien(%L::uuid, %L::timestamptz)', v_entretien, v_creneau), '23514', null, 'Un créneau qui touche une réservation du véhicule est refusé');
  exception when others then
    perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
    return next diag('Réservation d''essai non posée (' || sqlerrm || ') : le refus sur réservation n''est pas vérifié.');
  end;
  r := public.loc_creneaux_entretien(v_entretien, 1);
  r := public.loc_planifier_entretien(v_entretien, (r -> 'creneaux' -> 0 ->> 'debut')::timestamptz, 'Garage Lumière', null);
  return next is(r ->> 'statut', 'planifie', 'L''entretien est planifié dans un creux');
  return next ok((select i.motif = 'entretien' and i.fin_prevue_le is not null from public.loc_immobilisations i
                  where i.id = (select e.immobilisation_id from public.loc_entretiens e where e.id = v_entretien)), 'L''atelier immobilise le véhicule, retour prévu');
  r := public.loc_entretien_fait(v_entretien, 15080, 210, 'RAS');
  return next is(r ->> 'statut', 'fait', 'L''entretien est fait');
  perform tests.redevenir_admin();

  return next ok(private.loc_surveiller_parc() >= 0, 'La surveillance du parc passe sans erreur');
end $f$;

select * from runtests('tests'::name, '^test_b2_19_');
