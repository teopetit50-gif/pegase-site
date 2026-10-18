-- b6_04 — DALIRO : l'accord permanent des confirmations J-2 (session B6, 06/10/2026), b6_08.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_08.
-- runtests() annule tout : aucun accord ne reste sur le banc, aucun envoi ne part (banc en mode essai).
-- Le test DIT (diag) si le gérant qui donne l'accord peut approuver lui-même son activation ; sinon un second
-- gérant d'essai l'active, et la question est remontée au coordinateur.

create or replace function tests.test_b6_04_accord_j2() returns setof text
language plpgsql as $f$
declare
  banc jsonb; jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid; v_daf uuid; v_collab uuid; v_gerant2 uuid; v_autre uuid;
  v_mo uuid; v_ch uuid; v_t1 uuid; v_t2 uuid; v_t3 uuid; v_debut date; v_j jsonb; v_etat jsonb;
  v_p1 uuid; v_p2 uuid; v_p3 uuid; v_e1 uuid; v_e2 uuid; v_e3 uuid; v_pol_email uuid; v_dem uuid;
  v_auto text; v_statut_e2 text; n integer;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_referent := (banc ->> 'referent')::uuid;
  v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'daliro', 'essai',
         coalesce((select r.essai_adresse from public.reglages_envois r where r.client_id = v_client and r.module = 'tavaro'),
                  (select r.essai_adresse from public.reglages_envois r where r.client_id = v_client and r.module is null),
                  'essais@omegaai.fr'),
         array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'daliro');
  v_collab := tests.b6_compte(v_client, 'collaborateur', 'b6-accord-collab@banc-varelo.test');
  v_gerant2 := tests.b6_compte(v_client, 'gerant', 'b6-accord-gerant2@banc-varelo.test');
  jeu := tests.jeu();
  v_autre := (jeu ->> 'gerant_a')::uuid;
  v_debut := coalesce(public.ajouter_jours(current_date, 2, 'ouvres', 'metropole'), current_date + 2);
  return next ok(not exists (select 1 from public.politiques p where p.client_id = v_client and p.module = 'daliro' and p.statut in ('a_valider', 'active')),
                 'Départ : aucun accord J-2 sur le banc');

  -- Un chantier ouvert, trois sous-traitants joignables par courriel.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO de l''accord') returning id into v_mo;
  insert into public.btp_tiers (client_id, roles, nom, email, canal) values (v_client, array['sous_traitant'], 'Accord Un', 'un@b6-accord.test', 'email') returning id into v_t1;
  insert into public.btp_tiers (client_id, roles, nom, email, canal) values (v_client, array['sous_traitant'], 'Accord Deux', 'deux@b6-accord.test', 'email') returning id into v_t2;
  insert into public.btp_tiers (client_id, roles, nom, email, canal) values (v_client, array['sous_traitant'], 'Accord Trois', 'trois@b6-accord.test', 'email') returning id into v_t3;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, conducteur_id, statut)
  values (v_client, 'Chantier de l''accord', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, coalesce(v_referent, v_gerant), 'ouvert')
  returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution, tiers_id) values (v_client, v_ch, '01', 'Lot de l''accord', 'sous_traitant', v_t1);
  v_j := public.btp_importer_passages(v_ch, 'tableur', jsonb_build_array(
    jsonb_build_object('ref', 'A1', 'lot', '01', 'intervenant', 'Accord Un', 'tache', 'Pose', 'debut', v_debut, 'fin', v_debut)), false);
  perform tests.redevenir_admin();
  select id into v_p1 from public.btp_passages where chantier_id = v_ch and source_ref = 'A1';

  -- ── Sans accord : la demande J-2 attend dans « À valider » ──
  perform private.btp_demander_confirmations(v_client, current_date);
  perform private.btp_ouvrier(50);
  select e.id into v_e1 from public.envois e where e.client_id = v_client and e.module = 'daliro' and e.objet_id = v_p1::text;
  return next is((select e.statut from public.envois e where e.id = v_e1), 'a_valider', 'Sans accord : l''envoi J-2 attend sa validation');
  return next ok((select d.statut = 'en_attente' and d.politique_id is null from public.envois e join public.demandes_validation d on d.id = e.demande_id where e.id = v_e1),
                 'Sans accord : sa demande est en attente, sans politique');

  -- ── Garde-fous ──
  return next ok(not has_function_privilege('anon', 'public.btp_donner_accord_j2(uuid)', 'execute'), 'anon n''exécute pas btp_donner_accord_j2');
  return next ok(not has_function_privilege('anon', 'public.btp_revoquer_accord_j2(uuid, text)', 'execute'), 'anon n''exécute pas btp_revoquer_accord_j2');
  return next ok(not has_function_privilege('anon', 'public.btp_accord_j2(uuid)', 'execute'), 'anon n''exécute pas btp_accord_j2');
  return next ok(not has_function_privilege('authenticated', 'private.btp_alerter_fin_accord(uuid, timestamptz)', 'execute'), 'authenticated n''exécute pas btp_alerter_fin_accord');
  return next ok(not has_function_privilege('authenticated', 'private.btp_accord_j2_etat(uuid)', 'execute'), 'authenticated n''exécute pas btp_accord_j2_etat');
  perform tests.endosser(v_collab, 'b6-accord-collab@banc-varelo.test');
  return next throws_ok(format('select public.btp_donner_accord_j2(%L)', v_client), '42501', null, 'Un collaborateur ne donne pas l''accord');
  return next throws_ok(format('select public.btp_accord_j2(%L)', v_client), '42501', null, 'Un collaborateur ne lit pas l''accord');
  return next throws_ok(format('select public.btp_revoquer_accord_j2(%L)', v_client), '42501', null, 'Un collaborateur ne révoque pas l''accord');
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  return next throws_ok(format('select public.btp_donner_accord_j2(%L)', v_client), '42501', null, 'Un valideur (rôle simple) ne donne pas l''accord');
  perform tests.endosser(v_autre, 'autre@essai.invalid');
  return next throws_ok(format('select public.btp_donner_accord_j2(%L)', v_client), '42501', null, 'Le gérant d''une autre organisation ne donne pas l''accord du banc');
  perform tests.redevenir_admin();
  return next throws_ok(format('select public.btp_donner_accord_j2(%L)', v_client), '42501', null, 'Le serveur ne donne pas l''accord à la place d''une personne');

  -- ── Le gérant donne l'accord : trois politiques du socle, à valider ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_etat := public.btp_donner_accord_j2(v_client);
  return next is(jsonb_array_length(v_etat -> 'proposees'), 3, 'Trois politiques proposées (courriel, WhatsApp, SMS)');
  return next is(v_etat ->> 'etat', 'a_valider', 'L''accord est « à valider »');
  return next is((select count(*)::int from public.politiques p where p.client_id = v_client and p.module = 'daliro' and p.statut = 'a_valider'
                    and p.nombre_mensuel = 1000 and p.plafond_operation is null and p.cree_par = v_gerant
                    and p.fin between now() + interval '364 days' and now() + interval '366 days'), 3,
                 'Bornées à 1000 par mois, sans plafond par opération, un an, données par le gérant');
  v_etat := public.btp_donner_accord_j2(v_client);
  return next is(jsonb_array_length(v_etat -> 'proposees'), 0, 'Redonner l''accord ne crée rien de plus');
  return next ok(tests.b6_journal(v_client, 'daliro.accord_j2_donne') is not null, 'Le don est au journal');
  select p.id, p.demande_id into v_pol_email, v_dem from public.politiques p
  where p.client_id = v_client and p.module = 'daliro' and p.type_action = 'envoi.email' and p.statut = 'a_valider';

  -- ── L'activation : le gérant peut-il approuver lui-même ? (dit, pas supposé) ──
  begin
    insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
    values (v_dem, v_client, v_gerant, 'approuve', 'Auto-activation de l''accord J-2 (essai B6)');
    v_auto := 'acceptée : statut de la politique = ' || (select p.statut from public.politiques p where p.id = v_pol_email);
  exception when others then
    v_auto := 'refusée : ' || sqlstate || ' ' || sqlerrm;
  end;
  return next diag('AUTO-ACTIVATION par le gérant qui a donné l''accord : ' || v_auto);
  -- Ce qui reste à valider est activé par un second gérant (compte d'essai).
  perform tests.endosser(v_gerant2, 'b6-accord-gerant2@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
  select d.id, v_client, v_gerant2, 'approuve', 'Activation de l''accord J-2 (essai B6)'
  from public.politiques p join public.demandes_validation d on d.id = p.demande_id
  where p.client_id = v_client and p.module = 'daliro' and p.statut = 'a_valider' and d.statut = 'en_attente';
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_etat := public.btp_accord_j2(v_client);
  return next is(v_etat ->> 'etat', 'actif', 'Activé : l''accord est « actif »');
  return next is((select count(*)::int from public.politiques p where p.client_id = v_client and p.module = 'daliro' and p.statut = 'active' and p.active_le is not null), 3,
                 'Les trois politiques sont actives, datées');
  return next ok((select (x ->> 'donne_par')::uuid = v_gerant from jsonb_array_elements(v_etat -> 'canaux') x where x ->> 'canal' = 'email'),
                 'L''état dit qui a donné l''accord');

  -- ── Avec l'accord : la demande J-2 suivante naît approuvée, tracée ──
  v_j := public.btp_importer_passages(v_ch, 'tableur', jsonb_build_array(
    jsonb_build_object('ref', 'A2', 'lot', '01', 'intervenant', 'Accord Deux', 'tache', 'Pose', 'debut', v_debut, 'fin', v_debut)), false);
  perform tests.redevenir_admin();
  select id into v_p2 from public.btp_passages where chantier_id = v_ch and source_ref = 'A2';
  perform private.btp_demander_confirmations(v_client, current_date);
  perform private.btp_ouvrier(50);
  select e.id into v_e2 from public.envois e where e.client_id = v_client and e.module = 'daliro' and e.objet_id = v_p2::text;
  return next ok((select d.statut in ('approuvee', 'executee') and d.politique_id = v_pol_email
                  from public.envois e join public.demandes_validation d on d.id = e.demande_id where e.id = v_e2),
                 'Avec l''accord : la demande de l''envoi J-2 est approuvée par la politique courriel');
  select e.statut into v_statut_e2 from public.envois e where e.id = v_e2;
  return next ok(v_statut_e2 <> 'a_valider', 'Avec l''accord : l''envoi ne passe plus par « À valider » (' || coalesce(v_statut_e2, '?') || ')');
  return next is((select e.mode from public.envois e where e.id = v_e2), 'essai', 'Le mode essai reste prioritaire : l''envoi part à l''adresse d''essai');
  return next ok(tests.b6_journal(v_client, 'daliro.confirmation_par_accord', v_p2::text) is not null,
                 'Le journal porte « approuvé par accord permanent »');
  return next is((select e.statut from public.envois e where e.id = v_e1), 'a_valider', 'L''envoi d''avant l''accord reste à valider (pas d''effet rétroactif)');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_j := public.btp_tableau_chantier(v_ch);
  return next ok((select x -> 'envoi' -> 'accord' ->> 'politique' from jsonb_array_elements(v_j -> 'passages') x where x ->> 'id' = v_p2::text) = v_pol_email::text,
                 'Le tableau du chantier montre l''accord sur l''envoi');
  perform tests.redevenir_admin();

  -- ── Le rappel de fin : 30 jours avant ──
  return next is(private.btp_alerter_fin_accord(v_client, now()), 0, 'Aujourd''hui : aucune alerte de fin');
  n := private.btp_alerter_fin_accord(v_client, now() + interval '340 days');
  return next is(n, 3, 'À 25 jours de la fin : une alerte par politique');
  return next ok(exists (select 1 from public.alertes a where a.client_id = v_client and a.titre like 'L''accord permanent des confirmations J-2 prend fin le%'),
                 'L''alerte dit la date de fin et demande le renouvellement');

  -- ── Révocation ──
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  return next throws_ok(format('select public.btp_revoquer_accord_j2(%L)', v_client), '42501', null, 'Un valideur ne révoque pas l''accord');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_etat := public.btp_revoquer_accord_j2(v_client, 'Fin de l''essai B6');
  return next is((v_etat ->> 'revoquees')::int, 3, 'Le gérant révoque les trois politiques');
  return next is(v_etat ->> 'etat', 'revoque', 'L''accord est « révoqué »');
  return next is((select p.motif_revocation from public.politiques p where p.id = v_pol_email), 'Fin de l''essai B6', 'Le motif est gardé');
  return next ok(tests.b6_journal(v_client, 'daliro.accord_j2_revoque') is not null, 'La révocation est au journal');
  perform tests.redevenir_admin();
  return next is((select e.statut from public.envois e where e.id = v_e2), v_statut_e2, 'L''envoi déjà approuvé ne bouge pas');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_j := public.btp_importer_passages(v_ch, 'tableur', jsonb_build_array(
    jsonb_build_object('ref', 'A3', 'lot', '01', 'intervenant', 'Accord Trois', 'tache', 'Pose', 'debut', v_debut, 'fin', v_debut)), false);
  perform tests.redevenir_admin();
  select id into v_p3 from public.btp_passages where chantier_id = v_ch and source_ref = 'A3';
  perform private.btp_demander_confirmations(v_client, current_date);
  perform private.btp_ouvrier(50);
  select e.id into v_e3 from public.envois e where e.client_id = v_client and e.module = 'daliro' and e.objet_id = v_p3::text;
  return next is((select e.statut from public.envois e where e.id = v_e3), 'a_valider', 'Après révocation : l''envoi suivant retourne dans « À valider »');
  return next ok((select d.politique_id is null from public.envois e join public.demandes_validation d on d.id = e.demande_id where e.id = v_e3),
                 'Après révocation : sa demande n''a pas de politique');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_etat := public.btp_donner_accord_j2(v_client);
  return next is(jsonb_array_length(v_etat -> 'proposees'), 3, 'Après révocation, l''accord peut être redonné (à valider de nouveau)');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b6_04_');
