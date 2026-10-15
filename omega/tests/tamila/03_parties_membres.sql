-- 03 — Parties, membres, consultation tracée (étapes 3, 4 et 10). Après 00_jeu_tamila.sql. runtests() annule tout.

create or replace function tests.test_b4_03_parties_membres() returns setof text
language plpgsql as $f$
declare jeu jsonb; v_dossier uuid; p public.tamila_parties; v_jusqu timestamptz;
begin
  jeu := tests.tamila_scene();
  v_dossier := (jeu ->> 'dossier')::uuid;

  -- ── Les parties ──
  select * into p from public.tamila_parties where id = (jeu ->> 'partie_client')::uuid;
  return next is(p.qualite, 'client', 'la partie « client » est posée');
  return next is(p.residence, 'guadeloupe', 'elle demeure en Guadeloupe');
  return next is(p.role_procedure, 'appelant', 'appelante');
  return next ok(private.tamila_chiffre_valide(p.nom_chiffre) and private.tamila_chiffre_valide(p.courriels_chiffres), 'nom et courriels chiffrés');
  return next is((select count(*) from public.tamila_parties where dossier_id = v_dossier), 3::bigint, 'trois parties au dossier');
  return next is(private.tamila_residence_client(v_dossier, 'metropole'), 'guadeloupe', 'la résidence du client retenue pour l''augmentation : Guadeloupe');

  -- Modifier, retirer : par qui écrit dans le dossier.
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next lives_ok(format('select public.tamila_modifier_partie(%L::uuid, null, null, ''martinique'')', jeu ->> 'partie_adverse'), 'l''avocat intervenant corrige la résidence d''une partie');
  perform tests.redevenir_admin();
  return next is((select residence from public.tamila_parties where id = (jeu ->> 'partie_adverse')::uuid), 'martinique', 'résidence corrigée');
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  return next throws_ok(format('select public.tamila_retirer_partie(%L::uuid)', jeu ->> 'partie_confrere'), '42501', null, 'le stagiaire (lecteur) ne retire pas de partie (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next lives_ok(format('select public.tamila_retirer_partie(%L::uuid)', jeu ->> 'partie_confrere'), 'le gérant retire le confrère');
  perform tests.redevenir_admin();
  return next is((select count(*) from public.tamila_parties where dossier_id = v_dossier), 2::bigint, 'deux parties restent');

  -- ── Les membres ──
  return next is((select role_dossier from public.tamila_dossiers_membres where dossier_id = v_dossier and user_id = (jeu ->> 'avocat')::uuid), 'intervenant', 'Me Rousseau est intervenant');
  select jusqu_au into v_jusqu from public.tamila_dossiers_membres where dossier_id = v_dossier and user_id = (jeu ->> 'stagiaire')::uuid;
  return next ok(v_jusqu is not null and v_jusqu > now(), 'le stagiaire est lecteur, borné dans le temps');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_ajouter_membre(%L::uuid, %L::uuid, ''intervenant'')', v_dossier, jeu ->> 'stagiaire'), '22023', null,
    'un stagiaire n''entre qu''en lecteur (22023)');
  return next throws_ok(format('select public.tamila_ajouter_membre(%L::uuid, %L::uuid, ''responsable'')', v_dossier, jeu ->> 'assistante'), '22023', null,
    'le responsable d''un dossier est un avocat (22023)');
  return next throws_ok(format('select public.tamila_ajouter_membre(%L::uuid, %L::uuid, ''lecteur'')', v_dossier, jeu ->> 'autre_gerant'), '23503', null,
    'une personne d''un autre cabinet n''entre pas (23503)');
  return next throws_ok(format('select public.tamila_ajouter_membre(%L::uuid, %L::uuid, ''lecteur'', now() - interval ''1 day'')', v_dossier, jeu ->> 'assistante'), '22023', null,
    'un accès borné finit dans le futur (22023)');
  return next throws_ok(format('select public.tamila_retirer_membre(%L::uuid, %L::uuid)', v_dossier, jeu ->> 'gerant'), '23514', null,
    'le dossier garde toujours un responsable (23514)');
  perform tests.redevenir_admin();
  -- L'avocat intervenant n'ajoute personne ; il peut se retirer lui-même.
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next throws_ok(format('select public.tamila_ajouter_membre(%L::uuid, %L::uuid, ''intervenant'')', v_dossier, jeu ->> 'assistante'), '42501', null,
    'un intervenant n''ajoute personne au dossier (42501)');
  return next lives_ok(format('select public.tamila_retirer_membre(%L::uuid, %L::uuid)', v_dossier, jeu ->> 'avocat'), 'Me Rousseau se retire du dossier');
  return next is(tests.compter('public', 'tamila_dossiers', format('id = %L', v_dossier)), 0::bigint, 'retiré, il ne voit plus le dossier');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  perform public.tamila_ajouter_membre(v_dossier, (jeu ->> 'avocat')::uuid, 'intervenant', null);
  perform tests.redevenir_admin();

  -- ── La consultation tracée : les parties se lisent après ──
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next is(tests.compter('public', 'tamila_parties', format('dossier_id = %L', v_dossier)), 0::bigint,
    'avant toute lecture tracée, les parties (noms chiffrés) ne se lisent pas');
  return next throws_ok(format('select public.tamila_consulter(%L::uuid, ''texte libre !'')', v_dossier), '22023', null, 'le contexte d''une lecture est un code (22023)');
  return next ok((select public.tamila_consulter(v_dossier, 'dossier')) > now() + interval '29 minutes', 'tamila_consulter trace la lecture et rend la fin de la fenêtre (30 min)');
  return next is(tests.compter('public', 'tamila_parties', format('dossier_id = %L', v_dossier)), 2::bigint, 'après la lecture tracée, les parties se lisent');
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from public.lectures l where l.client_id = (jeu ->> 'client')::uuid and l.objet_type = 'tamila_dossier'
                         and l.objet_id = v_dossier::text and l.user_id = (jeu ->> 'avocat')::uuid), 'la lecture est inscrite (qui, quel dossier, quand)');
  -- Le stagiaire lecteur : il voit le dossier mais n'y écrit pas.
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  return next is(tests.compter('public', 'tamila_dossiers', format('id = %L', v_dossier)), 1::bigint, 'le stagiaire lecteur voit le dossier');
  return next throws_ok(format('select public.tamila_ajouter_partie(%L::uuid, tests.tamila_chiffre(''x''), ''tiers'')', v_dossier), '42501', null, 'mais n''y écrit pas (42501)');
  perform tests.redevenir_admin();
  -- Le cabinet voisin ne consulte pas.
  perform tests.endosser((jeu ->> 'autre_gerant')::uuid, 'b4-voisin@essai.invalid');
  return next throws_ok(format('select public.tamila_consulter(%L::uuid)', v_dossier), '42501', null, 'le cabinet voisin ne consulte pas le dossier (42501)');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b4_03_');
