-- 07 — La muraille (étape 12) : une personne du cabinet écartée d'un dossier, levée par décision du gérant.
-- Après 00_jeu_tamila.sql. runtests() annule tout.

create or replace function tests.test_b4_07_muraille() returns setof text
language plpgsql as $f$
declare jeu jsonb; v_dossier uuid; v_m uuid; m public.tamila_murailles; v_demande uuid; v_statut text;
begin
  jeu := tests.tamila_scene();
  v_dossier := (jeu ->> 'dossier')::uuid;

  -- Avant : l'admin (associé) voit le dossier.
  perform tests.endosser((jeu ->> 'admin')::uuid, 'b4-haddad@essai.invalid');
  return next is(tests.compter('public', 'tamila_dossiers', format('id = %L', v_dossier)), 1::bigint, 'avant la muraille, Me Haddad voit le dossier');
  return next throws_ok(format('select public.tamila_poser_muraille(%L::uuid, %L::uuid)', v_dossier, jeu ->> 'avocat'), '42501', null, 'un admin ne pose pas de muraille : le gérant seul (42501)');
  perform tests.redevenir_admin();

  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_poser_muraille(%L::uuid, %L::uuid)', v_dossier, jeu ->> 'gerant'), '22023', null, 'un gérant ne se met pas lui-même derrière une muraille (22023)');
  return next throws_ok(format('select public.tamila_poser_muraille(%L::uuid, %L::uuid)', v_dossier, jeu ->> 'autre_gerant'), '23503', null, 'une personne d''un autre cabinet n''est pas « écartée » (23503)');
  v_m := public.tamila_poser_muraille(v_dossier, (jeu ->> 'admin')::uuid, tests.tamila_chiffre('Conflit d''intérêts : ancien conseil de Bâti-Sud ' || tests.tamila_sentinelle()));
  return next ok(v_m is not null, 'le gérant écarte Me Haddad (motif chiffré)');
  return next is(public.tamila_poser_muraille(v_dossier, (jeu ->> 'admin')::uuid), v_m, 'reposée, la même muraille est rendue (idempotente)');
  perform tests.redevenir_admin();
  select * into m from public.tamila_murailles where id = v_m;
  return next is(m.pose_par, (jeu ->> 'gerant')::uuid, 'posée par le gérant');
  return next ok(m.leve_le is null, 'en place');
  return next ok(private.tamila_chiffre_valide(m.motif_chiffre) and position(tests.tamila_sentinelle() in encode(m.motif_chiffre, 'escape')) = 0, 'le motif est chiffré, jamais en clair');

  -- Après : Me Haddad ne voit plus rien du dossier, mais sait qu'une muraille le vise.
  perform tests.endosser((jeu ->> 'admin')::uuid, 'b4-haddad@essai.invalid');
  return next is(tests.compter('public', 'tamila_dossiers', format('id = %L', v_dossier)), 0::bigint, 'derrière la muraille, Me Haddad ne voit plus le dossier');
  return next is(tests.compter('public', 'tamila_parties', format('dossier_id = %L', v_dossier)), 0::bigint, 'ni ses parties');
  return next is(tests.compter('public', 'tamila_murailles', format('id = %L', v_m)), 1::bigint, 'il voit la muraille qui le vise (sans son motif en clair)');
  return next throws_ok(format('select public.tamila_consulter(%L::uuid)', v_dossier), '42501', null, 'il ne le consulte pas (42501)');
  return next throws_ok(format('select public.tamila_demander_levee_muraille(%L::uuid)', v_m), '42501', null, 'la personne écartée ne demande pas elle-même la levée (42501)');
  perform tests.redevenir_admin();
  -- Il ne peut plus être ajouté au dossier.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_ajouter_membre(%L::uuid, %L::uuid, ''intervenant'')', v_dossier, jeu ->> 'admin'), '42501', null, 'une muraille écarte : pas d''ajout au dossier (42501)');
  -- L'autre associé voit la muraille ; l'avocat intervenant, non.
  return next is(tests.compter('public', 'tamila_murailles', format('id = %L', v_m)), 1::bigint, 'le gérant lit la muraille');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next is(tests.compter('public', 'tamila_murailles', format('id = %L', v_m)), 0::bigint, 'l''avocat intervenant ne lit pas les murailles');
  perform tests.redevenir_admin();

  -- Levée : le gérant la demande, la règle (gérant) la décide.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  v_demande := public.tamila_demander_levee_muraille(v_m);
  return next is(public.tamila_demander_levee_muraille(v_m), v_demande, 'une seconde demande rend la même (en attente)');
  perform tests.redevenir_admin();
  return next is((select type_action from public.demandes_validation where id = v_demande), 'lever_muraille', 'demande « lever_muraille »');
  return next is((select statut from public.demandes_validation where id = v_demande), 'en_attente', 'en attente');
  return next is((select demande_levee_id from public.tamila_murailles where id = v_m), v_demande, 'la muraille connaît sa demande de levée');
  -- L'avocat (valideur) ne décide pas une levée.
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  begin
    v_statut := public.tamila_decider(v_demande, 'approuve');
  exception when others then
    v_statut := 'refus:' || sqlstate;
  end;
  perform tests.redevenir_admin();
  return next ok((select leve_le from public.tamila_murailles where id = v_m) is null, format('un avocat ne lève pas une muraille (%s)', v_statut));
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  v_statut := public.tamila_decider(v_demande, 'approuve', 'Le conflit a cessé.');
  perform tests.redevenir_admin();
  return next is(v_statut, 'executee', 'le gérant approuve : exécutée');
  select * into m from public.tamila_murailles where id = v_m;
  return next ok(m.leve_le is not null, 'muraille levée');
  return next is(m.leve_par, (jeu ->> 'gerant')::uuid, 'par le gérant');
  perform tests.endosser((jeu ->> 'admin')::uuid, 'b4-haddad@essai.invalid');
  return next is(tests.compter('public', 'tamila_dossiers', format('id = %L', v_dossier)), 1::bigint, 'levée, Me Haddad revoit le dossier (associé)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_demander_levee_muraille(%L::uuid)', v_m), '55000', null, 'déjà levée (55000)');
  perform tests.redevenir_admin();
  return next ok(tests.tamila_clair_dans('demandes_validation', tests.tamila_sentinelle()) = 0, 'la demande de levée ne porte pas le motif en clair');
end $f$;

select * from runtests('tests'::name, '^test_b4_07_');
