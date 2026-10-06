-- 12 — Les avis de contravention (vague 3, manque n° 1, migration b2_03) : l'avis reçu est rapproché du contrat par la
-- plaque et l'heure, l'échéance de désignation (envoi + 45 jours) est tenue, la désignation est réservée à la direction
-- et aux valideurs, le classement sans désignation à la direction seule ; un autre loueur ne voit rien.

create or replace function tests.test_b2_12_avis_contravention() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_contrat uuid; r jsonb; v_avis uuid; v_parc uuid; v_tard uuid; n bigint;
  v_jour date := (now() at time zone 'Europe/Paris')::date;
  v_personne jsonb := jsonb_build_object('nom', 'Durand', 'prenom', 'Marie', 'date_naissance', '1985-03-02', 'lieu_naissance', 'Lyon',
                                         'adresse', '3 rue des Lilas, 75011 Paris', 'permis_numero', '12AB34567');
begin
  if to_regprocedure('public.loc_enregistrer_avis(jsonb)') is null then
    return next fail('La migration b2_03 (avis de contravention) n''est pas posée : public.loc_enregistrer_avis manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_contrat();
  v_client := (jeu ->> 'client')::uuid;
  v_contrat := (jeu ->> 'contrat')::uuid;

  -- Le collaborateur saisit l'avis reçu : la plaque (écrite autrement) et l'heure désignent le contrat C-2026-0001.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  r := public.loc_enregistrer_avis(jsonb_build_object('numero_avis', '2026 1002 1412 01', 'immatriculation', 'ga 123 bc',
         'infraction_le', '2026-10-02T14:12:00+02:00', 'lieu', 'A6, Auxerre', 'nature', 'Excès de vitesse inférieur à 20 km/h',
         'montant_eur', 135, 'avis_envoye_le', v_jour - 1));
  v_avis := (r ->> 'avis')::uuid;
  return next is(r ->> 'statut', 'a_designer', 'L''avis est rapproché tout seul : conducteur à désigner');
  return next is((r ->> 'contrat')::uuid, v_contrat, 'Le contrat retrouvé est celui où la voiture était dehors à cette heure');
  return next is((r ->> 'echeance_le')::date, v_jour - 1 + 45, 'L''échéance est la date d''envoi plus 45 jours');
  r := public.loc_enregistrer_avis(jsonb_build_object('numero_avis', '2026 1002 1412 01', 'immatriculation', 'GA-123-BC',
         'infraction_le', '2026-10-02T14:12:00+02:00', 'avis_envoye_le', v_jour - 1));
  return next ok((r ->> 'deja')::boolean and (r ->> 'avis')::uuid = v_avis, 'Le même avis saisi deux fois rend le premier');

  -- Une infraction hors de tout contrat (véhicule au parc) : à rapprocher, l'agence est prévenue.
  r := public.loc_enregistrer_avis(jsonb_build_object('numero_avis', 'PARC-0915', 'immatriculation', 'GA-123-BC',
         'infraction_le', '2026-09-15T10:00:00+02:00', 'avis_envoye_le', v_jour - 1));
  v_parc := (r ->> 'avis')::uuid;
  return next is(r ->> 'statut', 'a_rapprocher', 'Aucun contrat à cette heure : l''avis est à rapprocher');
  perform tests.redevenir_admin();
  return next ok(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement like %L', v_client, '%avis:a_rapprocher:' || v_parc::text)) >= 1,
                 'Une alerte demande de rattacher l''avis');

  -- Les saisies illisibles sont refusées.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_enregistrer_avis(%L::jsonb)', jsonb_build_object('numero_avis', 'SANS-HEURE', 'immatriculation', 'GA-123-BC',
         'infraction_le', '2026-10-02', 'avis_envoye_le', v_jour - 1)), '22023', null, 'Sans l''heure de l''infraction, pas d''avis (c''est elle qui désigne le contrat)');
  return next throws_ok(format('select public.loc_enregistrer_avis(%L::jsonb)', jsonb_build_object('numero_avis', 'SANS-ENVOI', 'immatriculation', 'GA-123-BC',
         'infraction_le', '2026-10-02T14:12:00+02:00')), '22023', null, 'Sans la date d''envoi, pas d''échéance, pas d''avis');

  -- Le collaborateur ne désigne pas : c'est un acte du représentant légal.
  return next throws_ok(format('select public.loc_designer_conducteur(%L::uuid, %L::jsonb, %L)', v_avis, v_personne, 'antai_en_ligne'),
                        '42501', null, 'Le collaborateur ne désigne pas le conducteur');
  return next throws_ok(format('select public.loc_classer_avis(%L::uuid, %L)', v_parc, 'Véhicule au parc : l''agence paie.'),
                        '42501', null, 'Le collaborateur ne classe pas un avis');
  -- Une écriture directe dans la table est refusée.
  return next throws_ok(format('update public.loc_avis_contravention set statut = %L where id = %L', 'classe', v_avis), '42501', null,
                        'Aucune écriture directe dans le registre des avis');
  perform tests.redevenir_admin();

  -- Un autre loueur ne voit ni ne touche rien.
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre-loueur@essai.invalid');
  return next is(tests.compter('public', 'loc_avis_contravention', 'true'), 0::bigint, 'Un autre loueur ne voit aucun avis');
  return next throws_ok(format('select public.loc_rattacher_avis(%L::uuid, %L::uuid)', v_parc, v_contrat), 'P0002', null, 'Un autre loueur ne rattache pas cet avis');
  perform tests.redevenir_admin();

  -- Le référent (valideur) désigne : incomplet refusé, complet consigné, dans le délai.
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  return next throws_ok(format('select public.loc_designer_conducteur(%L::uuid, %L::jsonb, %L)', v_avis, v_personne - 'permis_numero', 'antai_en_ligne'),
                        '22023', null, 'Sans numéro de permis, la désignation est refusée');
  return next throws_ok(format('select public.loc_designer_conducteur(%L::uuid, %L::jsonb, %L)', v_avis, v_personne, 'pigeon_voyageur'),
                        '22023', null, 'Un mode de désignation inconnu est refusé');
  r := public.loc_designer_conducteur(v_avis, v_personne, 'antai_en_ligne', 'ANTAI-778899');
  return next is(r ->> 'statut', 'designe', 'Le conducteur est désigné');
  return next ok(not (r ->> 'hors_delai')::boolean, 'Dans le délai');
  return next throws_ok(format('select public.loc_designer_conducteur(%L::uuid, %L::jsonb, %L)', v_avis, v_personne, 'lrar'),
                        '23514', null, 'Un avis désigné ne se désigne pas deux fois');
  perform tests.redevenir_admin();
  return next ok(tests.tavaro_journal(v_client, 'tavaro.conducteur_designe') >= 1, 'Le journal opposable porte tavaro.conducteur_designe');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.avis_enregistre') >= 2, 'Le journal opposable porte tavaro.avis_enregistre');
  select count(*) into n from public.journal_opposable j where j.client_id = v_client and j::text like '%Lilas%';
  return next is(n, 0::bigint, 'L''identité désignée n''entre pas au journal');

  -- Le gérant classe l'avis du parc, motif obligatoire.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  return next throws_ok(format('select public.loc_classer_avis(%L::uuid, %L)', v_parc, 'court'), '22023', null, 'Un classement sans vrai motif est refusé');
  r := public.loc_classer_avis(v_parc, 'Véhicule au parc ce jour-là : l''agence paie l''avis.');
  return next is(r ->> 'statut', 'classe', 'La direction classe l''avis avec son motif');

  -- Un avis reçu tard (envoyé il y a 43 jours) : l'alerte J-3 part dès la saisie, puis « dépassé » au passage du cron.
  r := public.loc_enregistrer_avis(jsonb_build_object('numero_avis', 'TARD-01', 'immatriculation', 'GA-123-BC',
         'infraction_le', to_char(v_jour - 44, 'YYYY-MM-DD') || 'T10:00:00+02:00', 'avis_envoye_le', v_jour - 43));
  v_tard := (r ->> 'avis')::uuid;
  perform tests.redevenir_admin();
  return next ok(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement like %L', v_client, '%avis:j3:' || v_tard::text)) >= 1,
                 'À deux jours de l''échéance, l''alerte critique part dès la saisie');
  perform private.loc_surveiller_avis(now() + interval '4 days');
  return next ok(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement like %L', v_client, '%avis:depasse:' || v_tard::text)) >= 1,
                 'Échéance passée : l''alerte « 675 € encourus » est levée par le passage quotidien');
end $f$;

select * from runtests('tests'::name, '^test_b2_12_');
