-- b1_18 — VARELO : les décisions à valider (migration b1_15_decisions, après b1_14)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5), b1_00_aides.sql, b1_07, b1_08 et b1_14.
-- runtests() annule tout ce que le test écrit. Motif : ^test_b1_18_
--
-- Le scénario : un contrat tacite dont la date limite tombe dans 10 jours et une livraison avariée sont proposés
-- d'office ; la DF propose de porter le plafond d'un client à 120 000 €. Chaque décision arrive à sa direction,
-- avec son calcul. La DJ approuve la dénonciation, la DO refuse la protestation (la livraison est classée), la DF
-- approuve le plafond (il est posé). Le point du matin donne au plus trois décisions par destinataire.

create or replace function tests.test_b1_18_decisions() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; a uuid;
  g uuid; ge text := 'b1-gerant@essai.invalid';
  v_dj uuid; v_do uuid; v_df uuid;
  v_transp uuid; v_contrat uuid; v_client_grp uuid;
  r jsonb; v_auto integer; v_auto2 integer;
  dc public.grp_decisions; dr public.grp_decisions; dp public.grp_decisions;
  v_pl jsonb;
  m jsonb;
  i integer;
begin
  b := tests.b1_preparer(7);
  v_client := (b ->> 'client')::uuid; a := (b ->> 'soc_a')::uuid; g := (b ->> 'gerant')::uuid;
  select id into v_dj from public.equipes where client_id = v_client and cle = 'direction_juridique';
  select id into v_do from public.equipes where client_id = v_client and cle = 'direction_operations';
  v_df := (b ->> 'equipe_df')::uuid;
  perform tests.inserer_minimal('public', 'equipes_membres', jsonb_build_object('client_id', v_client, 'equipe_id', v_dj, 'user_id', b ->> 'referent'));
  perform tests.inserer_minimal('public', 'equipes_membres', jsonb_build_object('client_id', v_client, 'equipe_id', v_do, 'user_id', b ->> 'daf2'));
  v_transp := (tests.b1_code(v_client, a, 'F0123')).objet_id;

  -- un contrat tacite à dénoncer sous 10 jours ; une livraison avariée ; un encours clients
  perform tests.endosser(g, ge);
  v_contrat := public.grp_enregistrer_contrat(v_client, a, jsonb_build_object('objet_id', v_transp, 'intitule', 'Transport des palettes',
                 'categorie', 'prestation', 'date_echeance', current_date + 40, 'preavis_valeur', 30, 'preavis_unite', 'jours', 'montant_annuel', '48000'));
  r := public.grp_enregistrer_reception(v_client, a, jsonb_build_object('date_reception', current_date, 'transporteur', 'Transports Caraïbes',
         'avarie', true, 'constat', 'Une palette écrasée.', 'montant_estime', '900'));
  perform public.grp_deposer_encours(v_client, a, 'client', current_date, tests.b1_encours_a(), 'Sage 100');
  perform public.grp_rapprocher(v_client, false);
  perform tests.redevenir_admin();
  select c.objet_id into v_client_grp from public.grp_ref_codes c
  where c.client_id = v_client and c.entite_id = a and c.nature = 'client' and c.code_local = 'C001';

  -- d'office : dénonciation et protestation ; une seconde passe ne propose rien de plus
  v_auto := private.grp_proposer_du_jour(v_client);
  v_auto2 := private.grp_proposer_du_jour(v_client);
  return next is(v_auto, 2, 'd''office : le contrat à 10 jours de sa date limite et la livraison à protester');
  return next is(v_auto2, 0, 'une seconde passe ne propose rien de plus');
  select * into dc from public.grp_decisions where client_id = v_client and genre = 'denoncer_contrat';
  select * into dr from public.grp_decisions where client_id = v_client and genre = 'protester_reception';
  return next ok(dc.calcul like 'Échéance du % − préavis de 30 jours = date limite du %, dans 10 jours ; 48 000 € par an%'
                 and dc.resume like 'Dénoncer « Transport des palettes »%', format('le calcul de la dénonciation : %s', dc.calcul));
  return next is((select d.equipe_id from public.demandes_validation d where d.id = dc.demande_id), v_dj, 'la dénonciation va à la direction juridique');
  return next is((select d.equipe_id from public.demandes_validation d where d.id = dr.demande_id), v_do, 'la protestation va à la direction des opérations');
  return next is(tests.compter('public', 'regles_validation', format('client_id = %L and module = %L and type_action in (%L, %L) and equipe_id in (%L, %L)',
                   v_client, 'varelo', 'varelo.denoncer_contrat', 'varelo.protester_reception', v_dj, v_do)), 2::bigint,
                 'les règles de routage sont posées à la première proposition (une par type, avec son équipe)');

  -- à la main : la DF propose un plafond ; un refus des portes
  perform tests.endosser((b ->> 'daf')::uuid, 'b1-daf@essai.invalid');
  v_pl := public.grp_proposer_decision(v_client, 'relever_plafond', v_client_grp, jsonb_build_object('plafond', '120000', 'motif', 'Client fidèle, garanti par la banque.'));
  return next throws_ok(format('select public.grp_proposer_decision(%L, %L, %L, %L)', v_client, 'relever_plafond', v_client_grp, '{"plafond": "-5"}'),
                 '22023', null, 'un plafond négatif : refusé (22023)');
  return next throws_ok(format('select public.grp_proposer_decision(%L, %L, %L)', v_client, 'payer', v_client_grp), '22023', null, 'une décision inconnue : refusée (22023)');
  perform tests.redevenir_admin();
  select * into dp from public.grp_decisions where id = (v_pl ->> 'decision')::uuid;
  return next ok(dp.calcul like 'Encours du groupe % € (dont % € échus), sans plafond : plafond proposé 120 000 € — Client fidèle%', format('le calcul du plafond : %s', dp.calcul));
  return next is((select d.equipe_id from public.demandes_validation d where d.id = dp.demande_id), v_df, 'le plafond va à la direction financière');
  perform tests.endosser((b ->> 'daf')::uuid, 'b1-daf@essai.invalid');
  r := public.grp_proposer_decision(v_client, 'relever_plafond', v_client_grp, '{"plafond": "130000"}');
  perform tests.redevenir_admin();
  return next ok((r ->> 'deja')::boolean and (r ->> 'decision')::uuid = dp.id, 'une seule décision ouverte par objet');

  -- le point du matin : au plus trois, chacune avec son calcul ; chaque direction les siennes
  m := private.grp_lignes_decisions(v_client, null);
  return next is(jsonb_array_length(m), 3, 'le gérant reçoit les trois décisions');
  return next ok(m -> 0 ->> 'texte' like 'À valider : Protester auprès de Transports Caraïbes%' and m -> 0 ->> 'lien' = '/espace/validations',
                 format('la plus pressée d''abord : %s', m -> 0 ->> 'texte'));
  return next is(jsonb_array_length(private.grp_lignes_decisions(v_client, 'direction_juridique')), 1, 'la DJ reçoit sa seule décision');
  for i in 1..3 loop
    perform private.grp_proposer_decision(v_client, 'protester_reception',
      (public.grp_enregistrer_reception(v_client, a, jsonb_build_object('transporteur', 'Geodis ' || i, 'avarie', true, 'constat', 'Carton ouvert.')) ->> 'reception')::uuid);
  end loop;
  return next is(jsonb_array_length(private.grp_lignes_decisions(v_client, 'direction_operations')), 3, 'quatre protestations en attente : la DO n''en reçoit que trois');

  -- les décisions : la DJ approuve, la DO refuse, la DF approuve ; l'abonnement exécute
  return next throws_ok(format('select tests.b1_decider(%L, ''b1-daf@essai.invalid'', %L, %L, ''approuve'')', b ->> 'daf', v_client, dc.demande_id),
                 '42501', null, 'la DF ne valide pas une dénonciation : elle revient à la DJ (42501)');
  perform tests.b1_decider((b ->> 'referent')::uuid, 'b1-referent@essai.invalid', v_client, dc.demande_id, 'approuve', 'Nous changeons de transporteur.');
  perform tests.b1_decider((b ->> 'daf2')::uuid, 'b1-daf2@essai.invalid', v_client, dr.demande_id, 'rejete', 'Avarie réparée par le fournisseur.');
  perform tests.b1_decider((b ->> 'daf2')::uuid, 'b1-daf2@essai.invalid', v_client, dp.demande_id, 'approuve', 'D''accord.');
  perform private.grp_traiter_travaux(20);
  select * into dc from public.grp_decisions where id = dc.id;
  select * into dr from public.grp_decisions where id = dr.id;
  select * into dp from public.grp_decisions where id = dp.id;
  return next ok(dc.statut = 'approuvee' and dc.resultat ->> 'a_faire' like 'Envoyer la dénonciation avant le %' and dc.motif = 'Nous changeons de transporteur.',
                 'dénonciation validée : à envoyer, le motif de la DJ gardé');
  return next is((select statut from public.grp_contrats where id = v_contrat), 'actif', 'le contrat reste actif tant que la dénonciation n''est pas notée partie');
  return next ok(dr.statut = 'rejetee' and (select statut from public.grp_receptions where id = dr.objet_id) = 'sans_suite',
                 'protestation refusée : la livraison est classée sans suite');
  return next ok(dp.statut = 'executee' and (select plafond from public.grp_encours_plafonds where client_id = v_client and objet_id = v_client_grp) = 120000,
                 'plafond validé : posé à 120 000 €');
  return next is((select statut from public.demandes_validation where id = dp.demande_id), 'executee', 'la demande du plafond est exécutée');
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L and action like ''varelo.decision.%%''', v_client)), 9::bigint,
                 'au journal : six propositions, trois décisions');
  return next is(jsonb_array_length(private.grp_lignes_decisions(v_client, 'direction_juridique')), 0, 'la DJ n''a plus rien à valider');

  -- un refus après décision : la dénonciation n'est pas reproposée pour la même échéance
  return next is(private.grp_proposer_du_jour(v_client), 0, 'rien de reproposé après la décision');
end $f$;
