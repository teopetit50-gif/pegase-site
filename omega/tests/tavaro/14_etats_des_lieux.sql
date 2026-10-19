-- 14 — L'état des lieux contradictoire (vague 3, manque n° 3, migration b2_05) : départ signé avec quatre vues et ses
-- dommages photographiés, empreinte du contenu signé, état figé ; retour non signé constaté ; le chiffrage du socle reçoit
-- le carburant du départ signé, le caractère non contradictoire, et ne facture pas un dommage déjà noté au départ ;
-- la caution se lève quand rien n'est dû.

create or replace function tests.test_b2_14_etats_des_lieux() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_contrat uuid; v_dep uuid; v_ret uuid; r jsonb; e public.loc_etats_des_lieux; p public.loc_propositions; v_prop uuid; n bigint;
  v_photos jsonb := '[{"vue":"avant","chemin":"edl/avant.jpg"},{"vue":"arriere","chemin":"edl/arriere.jpg"},{"vue":"flanc_gauche","chemin":"edl/gauche.jpg"},{"vue":"flanc_droit","chemin":"edl/droit.jpg"},{"vue":"compteur","chemin":"edl/compteur.jpg"}]';
begin
  if to_regprocedure('public.loc_etablir_etat(uuid, text, jsonb)') is null then
    return next fail('La migration b2_05 (états des lieux) n''est pas posée : public.loc_etablir_etat manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_contrat();
  v_client := (jeu ->> 'client')::uuid;
  v_contrat := (jeu ->> 'contrat')::uuid;

  -- Le collaborateur établit le départ au comptoir.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_dep := public.loc_etablir_etat(v_contrat, 'depart', jsonb_build_object('km', 12000, 'carburant_8', 6, 'photos', '[{"vue":"avant","chemin":"edl/avant.jpg"}]'::jsonb));
  return next throws_ok(format('select public.loc_signer_etat(%L::uuid, %L)', v_dep, 'Marie Durand'), '22023', null, 'Sans l''avant, l''arrière et les deux flancs en photo, pas de signature');
  return next throws_ok(format('select public.loc_etablir_etat(%L::uuid, %L, %L::jsonb)', v_contrat, 'depart',
           jsonb_build_object('km', 12000, 'carburant_8', 6, 'photos', v_photos, 'dommages', '[{"zone":"flanc_droit","description":"Rayure portière avant droite"}]'::jsonb)),
         '22023', null, 'Un dommage noté sans photo est refusé');
  return next throws_ok(format('select public.loc_etablir_etat(%L::uuid, %L, %L::jsonb)', v_contrat, 'depart',
           jsonb_build_object('km', 12000, 'photos', v_photos, 'dommages', '[{"zone":"plafonnier","description":"x","preuves":[{"chemin":"edl/x.jpg"}]}]'::jsonb)),
         '22023', null, 'Une zone inconnue est refusée');
  v_dep := public.loc_etablir_etat(v_contrat, 'depart', jsonb_build_object('km', 12000, 'carburant_8', 6, 'photos', v_photos,
             'caution_eur', 800, 'caution_mode', 'empreinte_carte', 'caution_reference', 'AUT-4411',
             'dommages', '[{"zone":"flanc_droit","code":"RAYURE_PORTIERE","description":"Rayure portière avant droite","preuves":[{"chemin":"edl/rayure.jpg"}]}]'::jsonb));
  r := public.loc_signer_etat(v_dep, 'Marie Durand', 'edl/signature.png');
  return next is(r ->> 'statut', 'signe', 'La locataire signe l''état de départ');
  return next ok(r ->> 'empreinte' ~ '^[0-9a-f]{64}$', 'Une empreinte SHA-256 du contenu signé est gardée');
  return next throws_ok(format('select public.loc_etablir_etat(%L::uuid, %L, %L::jsonb)', v_contrat, 'depart', '{"km":1}'), '23514', null, 'Un départ signé ne se refait pas');
  return next throws_ok(format('update public.loc_etats_des_lieux set km = 1 where id = %L', v_dep), '42501', null, 'Aucune écriture directe');
  perform tests.redevenir_admin();
  select * into e from public.loc_etats_des_lieux where id = v_dep;
  return next is(encode(sha256(convert_to(private.loc_contenu_signe(e, e.signataire_nom, e.signe_le), 'UTF8')), 'hex'), e.empreinte, 'L''empreinte se recalcule à l''identique : rien n''a bougé depuis la signature');
  return next is(e.caution_statut, 'prise', 'La caution de 800 € est prise');
  return next throws_ok(format('update public.loc_etats_des_lieux set carburant_8 = 8 where id = %L', v_dep), '42501', null, 'Même le propriétaire de la base ne change pas un état signé');

  -- Un autre loueur ne voit rien.
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre-loueur@essai.invalid');
  return next is(tests.compter('public', 'loc_etats_des_lieux', 'true'), 0::bigint, 'Un autre loueur ne voit aucun état des lieux');
  return next throws_ok(format('select public.loc_etablir_etat(%L::uuid, %L, %L::jsonb)', v_contrat, 'retour', '{}'), 'P0002', null, 'Ni n''en établit chez ce loueur');
  perform tests.redevenir_admin();

  -- Le retour : la locataire n'est pas là (boîte à clés).
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_ret := public.loc_etablir_etat(v_contrat, 'retour', jsonb_build_object('km', 12650, 'carburant_8', 5, 'photos', v_photos));
  return next throws_ok(format('select public.loc_etablir_etat(%L::uuid, %L, %L::jsonb)', v_contrat, 'retour', '{"caution_eur":100}'), '22023', null, 'La caution ne se prend pas au retour');
  r := public.loc_constater_refus(v_ret, 'Client absent : clés déposées dans la boîte.');
  return next is(r ->> 'statut', 'refuse', 'Le retour non signé est constaté, avec son motif');

  -- Le chiffrage : carburant du départ signé (6/8, pas 8/8), non contradictoire, la rayure du flanc droit n'est pas facturée.
  v_prop := public.loc_chiffrer_retour(v_contrat, tests.tavaro_retour()
              || jsonb_build_object('carburant_depart_8', 8, 'non_contradictoire', false,
                                    'dommages', '[{"code":"RAYURE_PORTIERE","zone":"flanc_droit","preuves":[{"photo":"retour/portiere.jpg"}]}]'::jsonb));
  perform tests.redevenir_admin();
  select * into p from public.loc_propositions where id = v_prop;
  return next is((p.entrees ->> 'carburant_depart_8')::int, 6, 'Le carburant au départ est celui de l''état signé');
  return next ok(p.non_contradictoire, 'Le retour non signé rend la proposition non contradictoire');
  return next is(tests.compter('public', 'loc_proposition_lignes', format('proposition_id = %L and nature = %L', v_prop, 'dommage')), 0::bigint,
                 'La rayure déjà notée au départ signé n''est pas facturée');
  return next ok(p.avertissements @> '[{"code":"deja_au_depart"}]' and p.avertissements @> '[{"code":"carburant_depart_signe"}]' and p.avertissements @> '[{"code":"retour_non_signe"}]',
                 'La proposition dit pourquoi : déjà au départ, carburant signé, retour non signé');

  -- La caution attend la facture.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_lever_caution(%L::uuid)', v_contrat), '23514', null, 'Le retour est en facturation : la caution ne se lève pas encore');
  perform tests.redevenir_admin();
  return next ok(tests.tavaro_journal(v_client, 'tavaro.etat_signe') >= 1 and tests.tavaro_journal(v_client, 'tavaro.etat_non_signe') >= 1,
                 'Le journal opposable porte tavaro.etat_signe et tavaro.etat_non_signe');
end $f$;

select * from runtests('tests'::name, '^test_b2_14_');
