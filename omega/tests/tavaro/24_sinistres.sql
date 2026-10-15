-- 24 — Sinistres (migration b2_15) : le dossier s'ouvre depuis le contrat, immobilise le véhicule, suit ses étapes ;
-- le recours pour perte d'exploitation se chiffre (jours d'immobilisation × tarif journalier moyen × part du tiers) et
-- part à l'assureur du tiers ; un recours sans réponse depuis trente jours se relance ; la direction règle et clôt.

create or replace function tests.test_b2_24_sinistres() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_contrat uuid; r jsonb; v_sin uuid; v_jours numeric; v_montant numeric;
begin
  if to_regprocedure('public.loc_ouvrir_sinistre(jsonb)') is null then
    return next fail('La migration b2_15 (sinistres) n''est pas posée : public.loc_ouvrir_sinistre manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_contrat();
  v_client := (jeu ->> 'client')::uuid;
  v_contrat := (jeu ->> 'contrat')::uuid;

  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_ouvrir_sinistre(%L::jsonb)', jsonb_build_object('contrat', v_contrat, 'survenu_le', now() + interval '2 days', 'nature', 'accident')),
                        '22023', null, 'Un sinistre n''est pas daté dans le futur');
  return next throws_ok(format('select public.loc_ouvrir_sinistre(%L::jsonb)', jsonb_build_object('contrat', v_contrat, 'survenu_le', now(), 'nature', 'grele')),
                        '22023', null, 'Une nature inconnue est refusée');
  r := public.loc_ouvrir_sinistre(jsonb_build_object('contrat', v_contrat, 'survenu_le', now() - interval '4 days', 'nature', 'accident', 'responsabilite', 'tiers',
         'lieu', 'Carrefour de la Gare', 'immobilise', true,
         'tiers', jsonb_build_object('nom', 'M. Tiers', 'assureur', 'Assureur du tiers', 'assureur_adresse', 'recours@assureur.invalid', 'police', 'POL-77')));
  v_sin := (r ->> 'sinistre')::uuid;
  return next ok(r ->> 'reference' ~ '^SIN-[0-9]{4}-[0-9]{4}$', 'Le dossier reçoit sa référence');
  return next ok((select i.motif = 'sinistre' and i.fin_le is null from public.loc_sinistres s join public.loc_immobilisations i on i.id = s.immobilisation_id where s.id = v_sin),
                 'Le véhicule est immobilisé depuis le sinistre');
  r := public.loc_avancer_sinistre(v_sin, 'expertise', '{"expert":{"nom":"Cabinet Expert"},"montant_reparation_eur":"1240.50","note":"Rendez-vous lundi"}');
  return next is(r ->> 'statut', 'expertise', 'Le dossier passe en expertise');
  return next throws_ok(format('select public.loc_avancer_sinistre(%L::uuid, %L)', v_sin, 'clos'), '42501', null, 'Un collaborateur ne clôt pas un dossier');
  return next throws_ok(format('select public.loc_preparer_recours(%L::uuid)', v_sin), '42501', null, 'Ni ne prépare le recours');

  -- Le recours : quatre jours d'immobilisation, au tarif journalier moyen de la catégorie (45 € au contrat d'essai).
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  r := public.loc_preparer_recours(v_sin);
  v_jours := (r ->> 'jours')::numeric; v_montant := (r ->> 'montant')::numeric;
  return next is(v_jours, 4::numeric, 'Quatre jours d''immobilisation depuis le sinistre');
  return next is(v_montant, round(v_jours * (r ->> 'tarif_moyen')::numeric, 2), 'Le montant est jours × tarif moyen, le tiers responsable en entier');
  return next ok(r ->> 'courrier' like '%perte d''exploitation%' and r ->> 'courrier' like '%POL-77%', 'Le courrier nomme la perte d''exploitation et le contrat du tiers');
  return next is((select s.statut from public.loc_sinistres s where s.id = v_sin), 'recours', 'Le dossier passe en recours');
  perform public.loc_avancer_sinistre(v_sin, null, '{"responsabilite":"partagee"}');
  r := public.loc_preparer_recours(v_sin);
  return next is((r ->> 'part')::numeric, 0.5, 'Responsabilité partagée : la moitié');

  -- Trente jours sans réponse : la relance.
  perform tests.redevenir_admin();
  return next ok(private.loc_surveiller_sinistres(now() + interval '31 days') >= 1, 'Un recours sans réponse depuis trente jours se relance');

  -- Régler, clore.
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  return next throws_ok(format('select public.loc_avancer_sinistre(%L::uuid, %L)', v_sin, 'regle'), '22023', null, 'Un règlement porte sa date');
  perform public.loc_avancer_sinistre(v_sin, 'regle', jsonb_build_object('regle_le', current_date, 'montant_recu_eur', v_montant / 2));
  r := public.loc_avancer_sinistre(v_sin, 'clos');
  return next is(r ->> 'statut', 'clos', 'La direction clôt le dossier');
  return next throws_ok(format('select public.loc_avancer_sinistre(%L::uuid, %L)', v_sin, 'recours'), '23514', null, 'Un dossier clos ne bouge plus');
  perform tests.redevenir_admin();
  return next ok(jsonb_array_length((select s.historique from public.loc_sinistres s where s.id = v_sin)) >= 5, 'L''historique garde chaque étape');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.recours_prepare') >= 1, 'Le journal porte tavaro.recours_prepare');
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre@essai.invalid');
  return next throws_ok(format('select public.loc_avancer_sinistre(%L::uuid, %L)', v_sin, 'expertise'), 'P0002', null, 'Un autre loueur ne voit pas le dossier');
end $f$;

select * from runtests('tests'::name, '^test_b2_24_');
