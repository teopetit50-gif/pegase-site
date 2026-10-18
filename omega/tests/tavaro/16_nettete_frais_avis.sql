-- 16 — Deux promesses de la vitrine (migration b2_07) : la photo floue est refusée à la signature d'un état des lieux, et
-- les frais de dossier d'un avis désigné sont refacturés au locataire, par le chemin de toute facture (validation, émission).

create or replace function tests.test_b2_16_nettete_frais_avis() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_contrat uuid; v_dep uuid; r jsonb; v_avis uuid; v_prop uuid; p public.loc_propositions; v_demande uuid;
  v_jour date := (now() at time zone 'Europe/Paris')::date;
  v_photos jsonb := '[{"vue":"avant","chemin":"edl/avant.jpg","nettete":12.5},{"vue":"arriere","chemin":"edl/arriere.jpg","nettete":310},{"vue":"flanc_gauche","chemin":"edl/gauche.jpg","nettete":250},{"vue":"flanc_droit","chemin":"edl/droit.jpg"}]';
begin
  if to_regprocedure('public.loc_refacturer_avis(uuid)') is null then
    return next fail('La migration b2_07 (netteté, frais d''avis) n''est pas posée : public.loc_refacturer_avis manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_facture();
  v_client := (jeu ->> 'client')::uuid;
  v_contrat := (jeu ->> 'contrat')::uuid;

  -- La photo floue : l'avant mesuré à 12,5 bloque la signature ; repris à 95, l'état se signe et garde la mesure.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_dep := public.loc_etablir_etat(v_contrat, 'depart', jsonb_build_object('km', 12000, 'carburant_8', 8, 'photos', v_photos));
  return next throws_ok(format('select public.loc_signer_etat(%L::uuid, %L)', v_dep, 'Marie Durand'), '22023', null, 'Une vue floue (12,5 sous 40) empêche la signature');
  v_dep := public.loc_etablir_etat(v_contrat, 'depart', jsonb_build_object('km', 12000, 'carburant_8', 8, 'photos', jsonb_set(v_photos, '{0,nettete}', '95'),
             'dommages', '[{"zone":"flanc_droit","description":"Rayure","preuves":[{"chemin":"edl/rayure.jpg","nettete":4}]}]'::jsonb));
  return next throws_ok(format('select public.loc_signer_etat(%L::uuid, %L)', v_dep, 'Marie Durand'), '22023', null, 'La photo floue d''un dommage empêche aussi la signature');
  v_dep := public.loc_etablir_etat(v_contrat, 'depart', jsonb_build_object('km', 12000, 'carburant_8', 8, 'photos', jsonb_set(v_photos, '{0,nettete}', '95')));
  r := public.loc_signer_etat(v_dep, 'Marie Durand');
  return next is(r ->> 'statut', 'signe', 'Reprise nette, la vue passe et l''état se signe');
  perform tests.redevenir_admin();
  return next is((select (e.photos -> 0 ->> 'nettete')::numeric from public.loc_etats_des_lieux e where e.id = v_dep), 95.0, 'La netteté mesurée est gardée avec la photo');
  return next ok((select not (e.photos -> 3 ? 'nettete') from public.loc_etats_des_lieux e where e.id = v_dep), 'Une photo non mesurée passe : la mesure absente n''est pas un flou');

  -- Les frais d'avis : un avis désigné, le poste FRAIS_AVIS au barème, la proposition, la validation, la facture.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  r := public.loc_enregistrer_avis(jsonb_build_object('numero_avis', 'FRAIS-AVIS-01', 'immatriculation', 'GA-123-BC',
         'infraction_le', '2026-10-02T14:12:00+02:00', 'montant_eur', 135, 'avis_envoye_le', v_jour - 1));
  v_avis := (r ->> 'avis')::uuid;
  return next throws_ok(format('select public.loc_refacturer_avis(%L::uuid)', v_avis), '23514', null, 'Un avis pas encore désigné ne se refacture pas');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  perform public.loc_designer_conducteur(v_avis, '{"nom":"Durand","prenom":"Marie","date_naissance":"1985-03-02","lieu_naissance":"Lyon","adresse":"3 rue des Lilas, 75011 Paris","permis_numero":"12AB34567"}', 'antai_en_ligne', 'ANTAI-9');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_refacturer_avis(%L::uuid)', v_avis), '23514', null, 'Sans le poste FRAIS_AVIS au barème, la refacturation est refusée et dit quoi faire');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  perform public.loc_publier_bareme('Barème avec frais d''avis', v_jour, tests.tavaro_bareme_lignes()
    || jsonb_build_array(jsonb_build_object('code', 'FRAIS_AVIS', 'libelle', 'Frais de gestion d''un avis de contravention', 'famille', 'frais', 'unite', 'forfait', 'prix_eur', 30, 'regime_tva', 'taxable', 'taux_tva', 20)));
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  r := public.loc_refacturer_avis(v_avis);
  v_prop := (r ->> 'proposition')::uuid;
  return next throws_ok(format('select public.loc_refacturer_avis(%L::uuid)', v_avis), '23514', null, 'Un avis ne se refacture qu''une fois');
  perform tests.redevenir_admin();
  select * into p from public.loc_propositions where id = v_prop;
  return next ok(p.statut = 'calculee' and p.total_ht = 30 and p.total_ttc = 36 and p.entrees ->> 'objet' = 'frais_avis', format('Une proposition d''une ligne : 30 € HT, 36 € TTC (%s)', p.statut));
  return next ok(tests.tavaro_journal(v_client, 'tavaro.avis_refacture') >= 1, 'Le journal opposable porte tavaro.avis_refacture');
  -- Le chemin de toute facture : l'ouvrier dépose la demande, une autre personne approuve, la facture est émise.
  perform private.loc_ouvrier(50);
  select demande_id into v_demande from public.loc_propositions where id = v_prop;
  return next ok(v_demande is not null, 'La demande de validation est déposée');
  perform tests.tavaro_decider(jeu, v_demande, 'referent');
  perform private.loc_ouvrier(50);
  return next is((select count(*) from public.loc_factures f where f.proposition_id = v_prop and f.total_ttc = 36), 1::bigint, 'Après accord, la facture des frais d''avis est émise (36 € TTC)');
end $f$;

select * from runtests('tests'::name, '^test_b2_16_');
