-- 24 — Demander une lecture longue d'un dossier (migration b4_15, après le socle 19an). Après 00_jeu_tamila.sql,
-- b4_01 à b4_15. runtests() annule tout.

create or replace function tests.test_b4_24_demander_analyse() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_dossier uuid; v_autre uuid; v_p1 uuid; v_p2 uuid; v_p3 uuid; v_etrangere uuid; r jsonb;
  v_maitre text := '0b5c1e2a-4d6f-4a8b-9c0d-1e2f3a4b5c6d'; v_env bytea := decode(repeat('5c', 120), 'hex');
  v_a uuid; v_a2 uuid; n bigint; v_journal bigint;
begin
  jeu := tests.tamila_scene();
  v_client := (jeu ->> 'client')::uuid;
  v_dossier := (jeu ->> 'dossier')::uuid;
  v_p1 := tests.tamila_piece(jeu, 'conclusions-adverses.pdf');
  v_p2 := tests.tamila_piece(jeu, 'expertise.pdf');
  v_p3 := tests.tamila_piece(jeu, 'pas-encore-lue.pdf');
  update public.pieces set statut = 'lue' where id in (v_p1, v_p2);
  v_autre := tests.tamila_dossier(jeu);
  perform tests.redevenir_admin();
  v_etrangere := (tests.inserer_minimal('public', 'pieces', jsonb_build_object('client_id', v_client, 'module', 'tamila', 'source', 'depot',
                  'nom_fichier', 'autre.pdf', 'mime', 'application/pdf', 'octets', 10, 'sha256', repeat('ab', 32),
                  'chemin', v_client::text || '/tamila_dossier/' || v_autre::text || '/autre.pdf', 'objet_type', 'tamila_dossier',
                  'objet_id', v_autre::text, 'chiffrement', 'dossier:v1', 'statut', 'lue')) ->> 'id')::uuid;

  -- Sous la phrase du cabinet : refusé.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_demander_analyse(%L::uuid, ''chronologie'')', v_dossier), '55000', null,
                        'clé sous la phrase du cabinet : passez au coffre (55000)');
  perform tests.redevenir_admin();

  -- Le cabinet passe au coffre, le dossier est ré-enveloppé.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  perform public.tamila_coffre_demander_activation(v_client);
  perform tests.redevenir_admin();
  perform tests.endosser_serveur();
  perform public.tamila_coffre_activer(v_client, 'fr-par', v_maitre, (jeu ->> 'gerant')::uuid);
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  r := public.tamila_coffre_a_reenvelopper(v_dossier);
  v_journal := (r ->> 'journal')::bigint;
  perform tests.redevenir_admin();
  perform tests.endosser_serveur();
  perform public.tamila_coffre_reenveloppe(v_journal, v_env);
  perform tests.redevenir_admin();
  return next is((select fournisseur from public.tamila_cles where dossier_id = v_dossier and statut = 'active'), 'scaleway', 'la clé du dossier est au coffre');

  -- Qui demande.
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  return next throws_ok(format('select public.tamila_demander_analyse(%L::uuid, ''chronologie'')', v_dossier), '42501', null, 'le stagiaire ne demande pas d''analyse (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next throws_ok(format('select public.tamila_demander_analyse(%L::uuid, ''resume'')', v_dossier), '22023', null, 'un type inconnu est refusé (22023)');
  return next throws_ok(format('select public.tamila_demander_analyse(%L::uuid, ''bordereau'', array[%L::uuid])', v_dossier, v_etrangere), '22023', null,
                        'une pièce d''un autre dossier est refusée (22023)');
  v_a := public.tamila_demander_analyse(v_dossier, 'chronologie');
  perform tests.redevenir_admin();
  return next ok(v_a is not null, 'l''avocat demande la chronologie');
  return next is((select pieces from public.analyses where id = v_a), array[v_p1, v_p2], 'sur les pièces lues du dossier, pas sur celle qui attend sa lecture');
  return next ok((select module = 'tamila' and objet_type = 'tamila_dossier' and objet_id = v_dossier::text and type = 'tamila.chronologie'
                         and chiffrement = 'dossier:v1' and statut = 'demandee' from public.analyses where id = v_a), 'la ligne : module, dossier, type, chiffrée');
  return next ok(exists (select 1 from public.travaux w where w.genre = 'lecteur.analyser' and w.charge ->> 'analyse' = v_a::text), 'le travail lecteur.analyser est déposé');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  v_a2 := public.tamila_demander_analyse(v_dossier, 'chronologie');
  return next is(v_a2, v_a, 'redemandée en cours : la même analyse');
  return next ok(public.tamila_demander_analyse(v_dossier, 'bordereau', array[v_p2]) <> v_a, 'un autre type, sur une pièce choisie : une autre analyse');
  perform tests.redevenir_admin();
  return next throws_ok(format('update public.analyses set resultat = ''{"x": 1}'' where id = %L', v_a), '23514', null, 'jamais de résultat en clair (23514)');

  -- Qui lit : qui voit le dossier, murailles comprises.
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  select count(*) into n from public.analyses where objet_id = v_dossier::text;
  return next is(n, 2::bigint, 'l''avocat du dossier voit ses deux analyses');
  perform tests.redevenir_admin();
  insert into public.tamila_murailles (client_id, dossier_id, user_id, pose_par) values (v_client, v_dossier, (jeu ->> 'avocat')::uuid, (jeu ->> 'gerant')::uuid);
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  select count(*) into n from public.analyses where objet_id = v_dossier::text;
  return next is(n, 0::bigint, 'sous muraille, plus rien (politique restrictive)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'autre_gerant')::uuid, 'b4-voisin@essai.invalid');
  select count(*) into n from public.analyses where objet_id = v_dossier::text;
  return next is(n, 0::bigint, 'un autre cabinet ne voit rien');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b4_24_');
