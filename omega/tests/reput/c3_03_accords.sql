-- c3_03 — REPUT : l'accord permanent par sujet, Valider / Corriger / Refuser, le point du matin (migration c3_03).
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00_jeu.sql, c3_02_preparation.sql (pour
-- tests.c3_reception et tests.c3_remettre) et les migrations c3_01 à c3_03. Banc en mode essai ; runtests() annule tout.

create or replace function tests.c3_repondre(p_client uuid, p_de text, p_nom text, p_corps text, p_sujet text, p_couverte boolean,
                                             p_sources uuid[], p_reponse text) returns jsonb
language plpgsql as $$
declare v_rec bigint; v_dem uuid;
begin
  v_rec := tests.c3_reception(p_client, 'email', p_de, p_nom, 'Question', p_corps);
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  return public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', p_sujet, 'langue', 'fr', 'couverte', p_couverte,
    'sources', to_jsonb(coalesce(p_sources, '{}'::uuid[])), 'corps', p_reponse));
end $$;

create or replace function tests.test_c3_03_accords() returns setof text
language plpgsql as $f$
declare
  banc jsonb; jeu jsonb;
  v_client uuid; v_gerant uuid; v_daf uuid; v_collab uuid; v_client_a uuid; v_gerant_a uuid;
  v_h uuid; v_t uuid; v_j jsonb; v_pol uuid; v_act uuid; v_r jsonb; v_rep uuid; v_new uuid; v_items jsonb; v_old_envoi uuid;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  jeu := tests.jeu();
  v_client_a := (jeu ->> 'client_a')::uuid; v_gerant_a := (jeu ->> 'gerant_a')::uuid;
  v_collab := tests.c3_compte(v_client, 'collaborateur', 'c3-accord-collab@banc-varelo.test');
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_h := (public.reput_ecrire_connaissance(null, v_client, jsonb_build_object('sujet', 'horaires', 'genre', 'horaires',
    'titre', 'Horaires', 'contenu', 'Le samedi de 9 h à 12 h.', 'source', 'Gérant')) ->> 'id')::uuid;
  v_t := (public.reput_ecrire_connaissance(null, v_client, jsonb_build_object('sujet', 'tarifs', 'genre', 'tarif',
    'titre', 'Diagnostic', 'contenu', '89 € TTC.', 'source', 'Grille')) ->> 'id')::uuid;

  -- ── La garde : jamais d'accord sur ce qui doit être relu ──
  return next throws_ok(format($q$insert into public.politiques (client_id, module, type_action, libelle, nombre_mensuel, fin)
                                 values (%L, 'reput', 'reput.transferer', 'x', 10, now() + interval '30 days')$q$, v_client),
                        '42501', null, 'Aucune politique sur reput.transferer, même par un INSERT direct du gérant');
  return next throws_ok(format($q$insert into public.politiques (client_id, module, type_action, libelle, nombre_mensuel, fin)
                                 values (%L, 'reput', 'reput.repondre.reclamation', 'x', 10, now() + interval '30 days')$q$, v_client),
                        '42501', null, 'Aucune politique sur les réclamations');
  return next throws_ok(format('select public.reput_donner_accord(%L, %L)', v_client, 'urgence'), '42501', null,
                        'La porte refuse un accord sur les urgences');
  perform tests.endosser(v_collab, 'c3-accord-collab@banc-varelo.test');
  return next throws_ok(format('select public.reput_donner_accord(%L, %L)', v_client, 'horaires'), '42501', null, 'Un collaborateur ne donne pas d''accord');
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  return next throws_ok(format('select public.reput_donner_accord(%L, %L)', v_client, 'horaires'), '42501', null, 'Un valideur ne donne pas d''accord');

  -- ── Sans accord : la réponse attend ──
  perform tests.redevenir_admin();
  v_r := tests.c3_repondre(v_client, 'a@exemple.test', 'A', 'Ouvert samedi ?', 'horaires', true, array[v_h], 'Oui, le samedi de 9 h à 12 h.');
  return next is(v_r ->> 'envoi_statut', 'a_valider', 'Sans accord : l''envoi attend la validation');

  -- ── Le gérant donne l'accord « horaires » ; un autre décideur l'active ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_j := public.reput_donner_accord(v_client, 'horaires');
  v_pol := (v_j ->> 'proposee')::uuid;
  return next ok(v_pol is not null, 'Accord proposé sur le sujet horaires');
  return next is((select p.type_action from public.politiques p where p.id = v_pol), 'reput.repondre.horaires', 'Une politique du socle, type reput.repondre.horaires');
  return next is((select p.statut from public.politiques p where p.id = v_pol), 'a_valider', 'à valider');
  return next is((public.reput_donner_accord(v_client, 'horaires') ->> 'proposee'), null, 'Redonner l''accord ne crée rien de plus');
  select p.demande_id into v_act from public.politiques p where p.id = v_pol;
  return next throws_ok(format('select public.reput_activer_accord_seul(%L, %L)', v_client, 'horaires'), '42501', null,
                        'Le gérant n''active pas seul quand d''autres décideurs existent');
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision) values (v_act, v_client, v_daf, 'approuve');
  perform tests.redevenir_admin();
  return next is((select p.statut from public.politiques p where p.id = v_pol), 'active', 'Le valideur active l''accord');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next is((select x ->> 'statut' from jsonb_array_elements(public.reput_accords(v_client) -> 'sujets') x where x ->> 'sujet' = 'horaires'),
                 'active', 'reput_accords : horaires actif');
  return next is((select x ->> 'statut' from jsonb_array_elements(public.reput_accords(v_client) -> 'sujets') x where x ->> 'sujet' = 'reclamation'),
                 'aucun', 'reput_accords : réclamation sans accord');
  perform tests.redevenir_admin();

  -- ── Avec l'accord : la réponse couverte part seule, et seulement elle ──
  v_r := tests.c3_repondre(v_client, 'b@exemple.test', 'B', 'Ouvert samedi ?', 'horaires', true, array[v_h], 'Oui, le samedi de 9 h à 12 h.');
  return next is(v_r ->> 'politique', v_pol::text, 'La demande de validation naît approuvée par l''accord');
  return next isnt(v_r ->> 'envoi_statut', 'a_valider', 'L''envoi n''attend pas : il part (verrous du socle compris)');
  return next is(v_r ->> 'statut', 'validee', 'La demande est validée sans personne');
  return next is(tests.c3_remettre((v_r ->> 'envoi')::uuid), 'envoye', 'L''ouvrier d''envoi la remet (voie du socle)');
  perform private.reput_synchroniser(v_client);
  return next is((select d.statut from public.reput_demandes d where d.id = (v_r ->> 'demande')::uuid), 'envoyee', 'Partie seule : répondue');
  v_r := tests.c3_repondre(v_client, 'c@exemple.test', 'C', 'Ouvert le 25 décembre ?', 'horaires', false, null, 'Nous vérifions et revenons vers vous.');
  return next is(v_r ->> 'envoi_statut', 'a_valider', 'Même sujet, hors base : attend la validation');
  v_r := tests.c3_repondre(v_client, 'd@exemple.test', 'D', 'Prix ?', 'tarifs', true, array[v_t], '89 € TTC.');
  return next is(v_r ->> 'envoi_statut', 'a_valider', 'Autre sujet, sans accord : attend la validation');
  v_rep := (v_r ->> 'reponse')::uuid;

  -- ── Valider / Refuser ──
  perform tests.endosser(v_collab, 'c3-accord-collab@banc-varelo.test');
  return next throws_ok(format('select public.reput_decider(%L, %L)', v_rep, 'valider'), '42501', null, 'Un collaborateur ne valide pas');
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  return next throws_ok(format('select public.reput_decider(%L, %L, null)', v_rep, 'refuser'), '22023', null, 'Refuser sans motif est refusé');
  v_j := public.reput_decider(v_rep, 'valider');
  return next is(v_j ->> 'statut', 'approuvee', 'Valider : la réponse est approuvée');
  return next is(v_j -> 'demande' ->> 'statut', 'validee', 'et la demande validée, aussitôt');
  return next throws_ok(format('select public.reput_decider(%L, %L)', v_rep, 'valider'), '23514', null, 'Une réponse décidée ne se redécide pas');
  perform tests.redevenir_admin();
  v_r := tests.c3_repondre(v_client, 'e@exemple.test', 'E', 'Prix ?', 'tarifs', true, array[v_t], '89 € TTC.');
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  v_j := public.reput_decider((v_r ->> 'reponse')::uuid, 'refuser', 'Client en litige : je l''appelle.');
  return next is(v_j ->> 'statut', 'refusee', 'Refuser : la réponse est refusée');

  -- ── Corriger : une version 2, redéposée par le serveur, que le correcteur peut valider ──
  perform tests.redevenir_admin();
  v_r := tests.c3_repondre(v_client, 'f@exemple.test', 'F', 'Prix ?', 'tarifs', true, array[v_t], '89 € TTC.');
  v_rep := (v_r ->> 'reponse')::uuid; v_old_envoi := (v_r ->> 'envoi')::uuid;
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  v_j := public.reput_corriger(v_rep, E'Bonjour,\n\nLe diagnostic coûte 89 € TTC ; il est offert si vous commandez.\n\nL''équipe');
  v_new := (v_j ->> 'reponse')::uuid;
  return next is((v_j ->> 'version')::int, 2, 'Corriger crée une version 2');
  return next is((select p.redigee_par from public.reput_reponses p where p.id = v_new), v_daf, 'rédigée par la personne');
  return next is((select p.statut from public.reput_reponses p where p.id = v_rep), 'remplacee', 'La version 1 est remplacée');
  perform tests.redevenir_admin();
  return next isnt((select e.statut from public.envois e where e.id = v_old_envoi), 'a_valider', 'L''envoi de la version 1 ne part plus');
  perform private.reput_ouvrier(20);
  return next ok((select p.demande_validation_id is not null and p.envoi_id is not null from public.reput_reponses p where p.id = v_new),
                 'Le serveur a redéposé la version 2 (file et envoi)');
  return next is((select e.corps from public.envois e join public.reput_reponses p on p.envoi_id = e.id where p.id = v_new),
                 E'Bonjour,\n\nLe diagnostic coûte 89 € TTC ; il est offert si vous commandez.\n\nL''équipe', 'L''envoi porte le texte corrigé');
  return next is((select d.type_action from public.demandes_validation d join public.reput_reponses p on p.demande_validation_id = d.id where p.id = v_new),
                 'reput.transferer.tarifs', 'Une réponse corrigée n''est jamais couverte par un accord (à relire, par sujet)');
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  return next is(public.reput_decider(v_new, 'valider') ->> 'statut', 'approuvee', 'Le correcteur valide sa correction');

  -- ── Révoquer : la suivante attend de nouveau ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next is((public.reput_revoquer_accord(v_client, 'horaires', 'Nouveaux horaires à relire') ->> 'revoquees')::int, 1, 'Accord révoqué');
  perform tests.redevenir_admin();
  v_r := tests.c3_repondre(v_client, 'g@exemple.test', 'G', 'Ouvert samedi ?', 'horaires', true, array[v_h], 'Oui, le samedi de 9 h à 12 h.');
  return next is(v_r ->> 'envoi_statut', 'a_valider', 'Après révocation, la réponse attend de nouveau');

  -- ── Le gérant seul décideur active lui-même ──
  perform public.reput_installer(v_client_a);
  perform tests.endosser(v_gerant_a, 'a5-gerant-a@essai.invalid');
  perform public.reput_donner_accord(v_client_a, 'horaires');
  v_j := public.reput_activer_accord_seul(v_client_a, 'horaires');
  return next is((v_j ->> 'activees')::int, 1, 'Le seul décideur active lui-même son accord');
  perform tests.redevenir_admin();
  return next is((select p.statut from public.politiques p where p.client_id = v_client_a and p.module = 'reput'), 'active', 'L''accord est actif');

  -- ── Le point du matin ──
  v_items := private.reput_point_matin_lignes(v_client, ((now() at time zone 'Europe/Paris')::date + 1));
  return next ok(jsonb_array_length(v_items) >= 2, 'Le point du matin a une synthèse et les demandes en attente');
  return next ok(v_items -> 0 ->> 'texte' like 'Hier : % demandes reçues, % répondue% (dont 1 partie seule par accord). En attente de votre validation : %',
                 'Synthèse : reçues, répondues (dont parties seules), en attente — ' || coalesce(v_items -> 0 ->> 'texte', 'rien'));
  return next ok(exists (select 1 from jsonb_array_elements(v_items) x where x ->> 'texte' like '%réponse prête, à valider'), 'Une ligne par réponse à valider');
  return next is(private.reput_deposer_points(((now() at time zone 'Europe/Paris')::date + 1)::timestamp at time zone 'Europe/Paris' + interval '4 hours'), 0,
                 'Avant 5 h, rien n''est déposé');
  return next ok(private.reput_deposer_points(((now() at time zone 'Europe/Paris')::date + 1)::timestamp at time zone 'Europe/Paris' + interval '6 hours') >= 1,
                 'À 6 h, la section est déposée');
  return next ok(not exists (select 1 from public.alertes a where a.client_id = v_client and a.cle_regroupement like '%point:depot:reput%'),
                 'sans alerte de dépôt');
  return next ok(exists (select 1 from cron.job j where j.jobname = 'reput-matin'), 'Cron reput-matin posé');
  return next ok((select j.command from cron.job j where j.jobname = 'reput-synchro') like '%reput_ouvrier%', 'reput-synchro passe par l''ouvrier de base');
end $f$;

select * from runtests('tests'::name, '^test_c3_03_');
