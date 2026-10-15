-- b1_19 — VARELO : les règles du groupe et les sources validées par la DSI (migration b1_16_regles_groupe, après b1_15)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5), b1_00_aides.sql, b1_07 et b1_18.
-- runtests() annule tout ce que le test écrit. Motif : ^test_b1_19_
--
-- Le gérant écrit une fois : préavis de 2 mois par défaut, dénonciation proposée 45 jours avant la date limite,
-- plafond d'encours de 50 000 € pour tout client, réserve due 2 jours après la livraison. Chaque société en hérite.
-- Puis il demande de brancher le Sage 100 de la société A : la DSI valide, le branchement est fait ; il demande de le
-- débrancher : la DSI valide, il est débranché ; un rebranchement le réactive.

create or replace function tests.test_b1_19_regles() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; a uuid; bb uuid;
  g uuid; ge text := 'b1-gerant@essai.invalid';
  v_transp uuid; v_contrat uuid; v_hyper uuid;
  r jsonb; x record;
begin
  b := tests.b1_preparer(7);
  v_client := (b ->> 'client')::uuid; a := (b ->> 'soc_a')::uuid; bb := (b ->> 'soc_b')::uuid; g := (b ->> 'gerant')::uuid;
  v_transp := (tests.b1_code(v_client, a, 'F0123')).objet_id;

  perform tests.endosser((b ->> 'daf')::uuid, 'b1-daf@essai.invalid');
  return next throws_ok(format('select public.grp_regler_groupe(%L, %L)', v_client, '{"plafond_defaut": "50000"}'), '42501', null,
                 'la DF ne pose pas les règles du groupe (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser(g, ge);
  return next throws_ok(format('select public.grp_regler_groupe(%L, %L)', v_client, '{"preavis_valeur": "2"}'), '22023', null,
                 'un préavis sans son unité : refusé (22023)');
  return next throws_ok(format('select public.grp_regler_groupe(%L, %L)', v_client, '{"reserve_jours": "40"}'), '22023', null,
                 'un délai de réserve de 40 jours : refusé (22023)');
  r := public.grp_regler_groupe(v_client, jsonb_build_object('preavis_valeur', '2', 'preavis_unite', 'mois', 'contrat_jours_decision', '45',
         'plafond_defaut', '50000', 'reserve_jours', '2'));
  return next ok((r ->> 'plafond_defaut')::numeric = 50000 and (r ->> 'reserve_jours')::int = 2, 'le gérant écrit les règles une fois');
  r := public.grp_regler_groupe(v_client, '{"contrat_jours_decision": "45"}');
  return next ok((r ->> 'plafond_defaut')::numeric = 50000 and (r ->> 'preavis_valeur')::int = 2, 'un réglage partiel garde les autres');

  -- préavis : un contrat sans préavis prend celui du groupe, un contrat qui donne le sien le garde
  v_contrat := public.grp_enregistrer_contrat(v_client, bb, jsonb_build_object('tiers', 'Loueur Martinique', 'intitule', 'Location de chariots',
                 'date_echeance', current_date + 80));
  return next ok((select preavis_valeur = 2 and preavis_unite = 'mois' from public.grp_contrats where id = v_contrat),
                 'un contrat sans préavis prend celui du groupe (2 mois), dans une autre société');
  v_hyper := public.grp_enregistrer_contrat(v_client, a, jsonb_build_object('objet_id', v_transp, 'intitule', 'Transport',
               'date_echeance', current_date + 200, 'preavis_valeur', '1', 'preavis_unite', 'mois'));
  return next is((select preavis_valeur::int from public.grp_contrats where id = v_hyper), 1, 'un contrat qui donne son préavis le garde');
  perform tests.redevenir_admin();
  -- date limite = échéance (80 j) − 2 mois ≈ 19 à 22 jours : dans les 45 jours du groupe, hors des 15 jours par défaut
  perform private.grp_proposer_du_jour(v_client);
  return next ok(exists (select 1 from public.grp_decisions d where d.objet_id = v_contrat and d.genre = 'denoncer_contrat'),
                 'la dénonciation est proposée selon le délai du groupe (45 jours)');

  -- plafond : un client sans plafond prend celui du groupe ; son propre plafond l'emporte
  perform tests.endosser(g, ge);
  perform public.grp_deposer_encours(v_client, a, 'client', current_date, tests.b1_encours_a(), 'Sage 100');
  perform public.grp_rapprocher(v_client, false);
  perform tests.redevenir_admin();
  select c.objet_id into v_hyper from public.grp_ref_codes c
  where c.client_id = v_client and c.entite_id = a and c.nature = 'client' and c.code_local = 'C001';
  select * into x from public.grp_encours_groupe where client_id = v_client and objet_id = v_hyper;
  return next ok(x.plafond = 50000 and x.plafond_source = 'groupe' and x.depasse = (x.total > 50000),
                 format('plafond du groupe appliqué (%s, encours %s)', x.plafond, x.total));
  perform tests.endosser(g, ge);
  perform public.grp_regler_plafond(v_hyper, 200000, null, 'Assurance-crédit');
  perform tests.redevenir_admin();
  select * into x from public.grp_encours_groupe where client_id = v_client and objet_id = v_hyper;
  return next ok(x.plafond = 200000 and x.plafond_source = 'objet' and not x.depasse, 'le plafond propre au client l''emporte');

  -- réserve : due 2 jours après la livraison si c'est plus tôt que la loi ; le calcul garde l'échéance légale
  r := public.grp_enregistrer_reception(v_client, a, jsonb_build_object('date_reception', current_date, 'mode', 'aerien',
         'transporteur', 'Air Caraïbes Cargo', 'avarie', true, 'constat', 'Colis ouvert.'));
  select * into x from public.grp_receptions where id = (r ->> 'reception')::uuid;
  return next ok(x.echeance = current_date + 2 and (x.calcul ->> 'echeance_legale')::date > current_date + 2 and x.calcul ->> 'detail' like '%règle du groupe : 2 jours%',
                 format('aérien (14 jours légaux) : due le %s par la règle du groupe', x.echeance));

  -- les sources : la DSI valide le branchement puis le débranchement
  insert into public.equipes (client_id, cle, nom) values (v_client, 'dsi', 'Direction des systèmes d''information') on conflict (client_id, cle) do nothing;
  perform tests.inserer_minimal('public', 'equipes_membres', jsonb_build_object('client_id', v_client,
            'equipe_id', (select id from public.equipes where client_id = v_client and cle = 'dsi'), 'user_id', b ->> 'referent'));
  perform tests.endosser((b ->> 'daf')::uuid, 'b1-daf@essai.invalid');
  return next throws_ok(format('select public.grp_demander_source(%L, %L, %L, %L)', v_client, 'brancher', a, 'sage100'), '42501', null,
                 'la DF ne demande pas de branchement (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser(g, ge);
  r := public.grp_demander_source(v_client, 'brancher', a, 'sage100', array['fournisseurs', 'balance_generale'], 'Le siège passe aux exports');
  return next ok(not (r ->> 'deja')::boolean, 'le gérant demande le branchement du Sage 100 de la société A');
  return next ok((public.grp_demander_source(v_client, 'brancher', a, 'sage100') ->> 'deja')::boolean, 'une seule demande ouverte par logiciel et société');
  return next throws_ok(format('select public.grp_demander_source(%L, %L, %L, %L)', v_client, 'brancher', a, 'logos_w'), 'P0002', null,
                 'un logiciel sans modèle Varelo : refusé (P0002)');
  perform tests.redevenir_admin();
  return next is((select d.equipe_id from public.demandes_validation d where d.id = (r ->> 'demande')::uuid),
                 (select id from public.equipes where client_id = v_client and cle = 'dsi'), 'la demande va à la DSI');
  return next is(tests.compter('public', 'branchements', format('client_id = %L and module = %L and entite_id = %L', v_client, 'varelo', a)), 0::bigint,
                 'rien n''est branché avant l''accord');
  perform tests.b1_decider((b ->> 'referent')::uuid, 'b1-referent@essai.invalid', v_client, (r ->> 'demande')::uuid, 'approuve', 'Lecture seule vérifiée.');
  perform private.grp_traiter_travaux(20);
  select * into x from public.branchements where client_id = v_client and module = 'varelo' and entite_id = a;
  return next ok(x.statut = 'actif' and x.logiciel = 'sage100', 'accord de la DSI : le Sage 100 est branché');
  return next is(tests.compter('public', 'branchements_jeux', format('branchement_id = %L', x.id)), 2::bigint, 'avec les deux jeux demandés');

  perform tests.endosser(g, ge);
  r := public.grp_demander_source(v_client, 'debrancher', a, 'sage100', null, 'Changement de logiciel');
  perform tests.redevenir_admin();
  perform tests.b1_decider((b ->> 'referent')::uuid, 'b1-referent@essai.invalid', v_client, (r ->> 'demande')::uuid, 'approuve', 'Débranchement validé.');
  perform private.grp_traiter_travaux(20);
  return next is((select statut from public.branchements where id = x.id), 'debranche', 'accord de la DSI : le Sage 100 est débranché');
  perform tests.endosser(g, ge);
  return next throws_ok(format('select public.grp_demander_source(%L, %L, %L, %L)', v_client, 'debrancher', a, 'sage100'), '22023', null,
                 'débrancher deux fois : refusé (22023)');
  r := public.grp_demander_source(v_client, 'brancher', a, 'sage100');
  perform tests.redevenir_admin();
  perform tests.b1_decider((b ->> 'referent')::uuid, 'b1-referent@essai.invalid', v_client, (r ->> 'demande')::uuid, 'rejete', 'Pas avant la clôture.');
  perform private.grp_traiter_travaux(20);
  return next ok((select statut from public.branchements where id = x.id) = 'debranche'
                 and (select statut from public.grp_sources_demandes where demande_id = (r ->> 'demande')::uuid) = 'rejetee',
                 'un refus de la DSI ne rebranche rien');
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L and action like ''varelo.source.%%''', v_client)), 6::bigint,
                 'au journal : trois demandes, un branchement, un débranchement, un refus');
end $f$;
