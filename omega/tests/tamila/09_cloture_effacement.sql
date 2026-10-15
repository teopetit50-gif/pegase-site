-- 09 — Clôture, annulation de clôture, effacement à l'échéance, clé (étape 14). Après 00_jeu_tamila.sql. runtests() annule tout.

create or replace function tests.test_b4_09_cloture_effacement() returns setof text
language plpgsql as $f$
declare jeu jsonb; v_dossier uuid; v_demande uuid; d public.tamila_dossiers; v_statut text; r jsonb;
begin
  jeu := tests.tamila_scene();
  v_dossier := (jeu ->> 'dossier')::uuid;

  -- Qui demande la clôture : le responsable ou un associé.
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next throws_ok(format('select public.tamila_demander_cloture(%L::uuid)', v_dossier), '42501', null, 'un intervenant ne demande pas la clôture (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  v_demande := public.tamila_demander_cloture(v_dossier);
  return next is(public.tamila_demander_cloture(v_dossier), v_demande, 'redemandée : la même demande en attente');
  perform tests.redevenir_admin();
  return next is((select type_action from public.demandes_validation where id = v_demande), 'cloturer_dossier', 'demande « cloturer_dossier »');
  return next is((select statut from public.tamila_dossiers where id = v_dossier), 'ouvert', 'tant qu''un associé n''a pas décidé, le dossier reste ouvert');

  -- L'avocat collaborateur ne décide pas ; l'admin (associé) approuve.
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  begin
    v_statut := public.tamila_decider(v_demande, 'approuve');
  exception when others then
    v_statut := 'refus:' || sqlstate;
  end;
  perform tests.redevenir_admin();
  return next is((select statut from public.tamila_dossiers where id = v_dossier), 'ouvert', format('un avocat collaborateur ne clôt pas (%s)', v_statut));
  perform tests.endosser((jeu ->> 'admin')::uuid, 'b4-haddad@essai.invalid');
  v_statut := public.tamila_decider(v_demande, 'approuve', 'Affaire terminée, export téléchargé.');
  perform tests.redevenir_admin();
  return next is(v_statut, 'executee', 'Me Haddad approuve : exécutée');
  select * into d from public.tamila_dossiers where id = v_dossier;
  return next is(d.statut, 'clos', 'dossier clos');
  return next is(d.statut_avant_cloture, 'ouvert', 'il était ouvert');
  return next is(d.demande_cloture_id, v_demande, 'la demande est gardée');
  return next ok(d.effacement_prevu_le > now() + interval '6 days' and d.effacement_prevu_le < now() + interval '8 days', 'effacement prévu à J + 7 (delai_cloture_jours), à 3 h du matin');
  return next is(extract(hour from d.effacement_prevu_le at time zone 'Europe/Paris')::int, 3, 'à 3 h, heure du cabinet');
  -- Clos : on lit encore, on n'écrit plus, on exporte encore.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next is(tests.compter('public', 'tamila_dossiers', format('id = %L', v_dossier)), 1::bigint, 'clos, le dossier se lit encore');
  return next throws_ok(format('select public.tamila_ajouter_partie(%L::uuid, tests.tamila_chiffre(''x''), ''tiers'')', v_dossier), '42501', null, 'mais ne s''écrit plus (42501)');
  perform public.tamila_consulter(v_dossier, 'export');
  return next lives_ok(format('select public.tamila_demander_export(%L::uuid)', v_dossier), 'et s''exporte encore avant l''effacement');

  -- Annulation de la clôture par un gérant, tant que l'échéance n'est pas passée.
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'admin')::uuid, 'b4-haddad@essai.invalid');
  return next throws_ok(format('select public.tamila_annuler_cloture(%L::uuid)', v_dossier), '42501', null, 'seul un gérant annule une clôture (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next lives_ok(format('select public.tamila_annuler_cloture(%L::uuid)', v_dossier), 'le gérant annule la clôture');
  perform tests.redevenir_admin();
  select * into d from public.tamila_dossiers where id = v_dossier;
  return next is(d.statut, 'ouvert', 'rouvert');
  return next ok(d.effacement_prevu_le is null and d.clos_le is null and d.demande_cloture_id is null, 'plus d''échéance d''effacement');

  -- Seconde clôture, puis l'effacement : jamais avant l'échéance, jamais par une personne.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  v_demande := public.tamila_demander_cloture(v_dossier);
  v_statut := public.tamila_decider(v_demande, 'approuve');
  return next is(v_statut, 'executee', 'le gérant, associé, clôt lui-même');
  return next throws_ok(format('select public.tamila_effacer_dossier(%L::uuid)', v_dossier), '42501', null, 'une personne n''efface pas un dossier : le serveur, à l''échéance (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser_serveur();
  return next throws_ok(format('select public.tamila_effacer_dossier(%L::uuid)', v_dossier), '55000', null, 'avant l''échéance, le serveur non plus (55000)');
  perform tests.redevenir_admin();
  return next throws_ok(format('delete from public.tamila_dossiers where id = %L', v_dossier), '42501', null, 'un dossier Tamila ne se supprime pas à la main (42501)');
  return next throws_ok(format('delete from public.tamila_cles where dossier_id = %L', v_dossier), '42501', null, 'une clé de dossier ne se supprime pas (42501)');
  return next throws_ok(format('update public.tamila_cles set enveloppe = decode(''00'', ''hex'') where dossier_id = %L', v_dossier), '42501', null, 'ni ne se retouche (42501)');
  return next throws_ok(format('update public.tamila_cles set statut = ''detruite'' where dossier_id = %L', v_dossier), '23514', null, 'active → détruite sans passer par désactivée : refusé (23514)');
  perform tests.endosser_serveur();
  return next throws_ok(format('select public.tamila_cle_detruite(%L::uuid, ''{}'')', v_dossier), '55000', null, 'la clé ne se détruit qu''une fois désactivée, sept jours après (55000)');
  perform tests.redevenir_admin();

  -- À l'échéance : la ronde dépose l'effacement à l'ouvrier.
  update public.tamila_dossiers set effacement_prevu_le = now() - interval '1 hour' where id = v_dossier;
  r := private.tamila_tache_horaire(now());
  return next ok((r ->> 'effacements')::int >= 1, 'la ronde horaire compte l''effacement dû');
  return next ok(exists (select 1 from public.travaux w where w.genre = 'tamila.effacer_dossier' and w.charge ->> 'dossier' = v_dossier::text), 'un travail « tamila.effacer_dossier » est déposé');
  -- Sans la liste des fichiers préparée, rien ne s'efface.
  perform tests.endosser_serveur();
  return next throws_ok(format('select public.tamila_effacer_dossier(%L::uuid)', v_dossier), '55000', null,
    'sans manifeste d''effacement (preparer_effacement), rien ne s''efface (55000)');
  perform tests.redevenir_admin();
  return next is((select statut from public.tamila_dossiers where id = v_dossier), 'clos', 'le dossier reste clos, intact');
end $f$;

select * from runtests('tests'::name, '^test_b4_09_');
