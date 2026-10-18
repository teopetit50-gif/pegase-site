-- 13 — L'identité désignée s'efface un an après la désignation (migration b2_04, art. 9 du code de procédure pénale) :
-- l'avis reste (plaque, heure, montant, statut, mode, référence), seule l'identité part ; une désignation récente reste entière.

create or replace function tests.test_b2_13_designation_conservation() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_vieux uuid; v_recent uuid; a public.loc_avis_contravention; n integer;
  v_jour date := (now() at time zone 'Europe/Paris')::date;
  v_personne jsonb := jsonb_build_object('nom', 'Durand', 'prenom', 'Marie', 'date_naissance', '1985-03-02', 'lieu_naissance', 'Lyon',
                                         'adresse', '3 rue des Lilas, 75011 Paris', 'permis_numero', '12AB34567');
begin
  if to_regprocedure('private.loc_effacer_designations(timestamptz)') is null then
    return next fail('La migration b2_04 (conservation de la désignation) n''est pas posée : private.loc_effacer_designations manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_contrat();
  v_client := (jeu ->> 'client')::uuid;

  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  v_vieux := (public.loc_enregistrer_avis(jsonb_build_object('numero_avis', 'VIEUX-01', 'immatriculation', 'GA-123-BC',
               'infraction_le', '2026-10-02T14:12:00+02:00', 'montant_eur', 135, 'avis_envoye_le', v_jour - 1)) ->> 'avis')::uuid;
  v_recent := (public.loc_enregistrer_avis(jsonb_build_object('numero_avis', 'RECENT-01', 'immatriculation', 'GA-123-BC',
               'infraction_le', '2026-10-02T16:40:00+02:00', 'montant_eur', 68, 'avis_envoye_le', v_jour - 1)) ->> 'avis')::uuid;
  perform public.loc_designer_conducteur(v_vieux, v_personne, 'antai_en_ligne', 'ANTAI-1');
  perform public.loc_designer_conducteur(v_recent, v_personne, 'lrar', 'RAR-2');
  perform tests.redevenir_admin();

  -- Le premier a été désigné il y a treize mois, le second il y a six.
  update public.loc_avis_contravention set designe_le = now() - interval '13 months' where id = v_vieux;
  update public.loc_avis_contravention set designe_le = now() - interval '6 months' where id = v_recent;

  n := private.loc_effacer_designations(now());
  return next ok(n >= 1, format('Le passage efface au moins une désignation (%s)', n));
  select * into a from public.loc_avis_contravention where id = v_vieux;
  return next ok(a.designation_effacee_le is not null, 'Au-delà d''un an, la date d''effacement est posée');
  return next ok(not (a.designation ? 'nom') and not (a.designation ? 'permis_numero') and not (a.designation ? 'date_naissance') and not (a.designation ? 'adresse'),
                 'L''identité (nom, permis, naissance, adresse) est effacée');
  return next is(a.designation ->> 'type', 'personne', 'La forme de la désignation reste (une personne)');
  return next ok(a.statut = 'designe' and a.immatriculation = 'GA-123-BC' and a.montant_eur = 135 and a.mode_designation = 'antai_en_ligne'
                 and a.reference_designation = 'ANTAI-1' and a.designe_le is not null and a.hors_delai is not null,
                 'Le reste de l''avis reste : statut, plaque, montant, mode, référence, date, délai tenu');
  select * into a from public.loc_avis_contravention where id = v_recent;
  return next ok(a.designation ->> 'nom' = 'Durand' and a.designation_effacee_le is null, 'Une désignation de six mois reste entière');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.designations_effacees') >= 1, 'Le journal opposable compte l''effacement (sans identité)');
  return next is((select count(*) from public.journal_opposable j where j.client_id = v_client and j::text like '%12AB34567%'), 0::bigint,
                 'Aucune identité au journal');
  n := private.loc_effacer_designations(now());
  return next is((select count(*)::integer from public.loc_avis_contravention x where x.client_id = v_client and x.designation_effacee_le is not null), 1,
                 'Rejoué, le passage n''efface rien de plus');
end $f$;

select * from runtests('tests'::name, '^test_b2_13_');
