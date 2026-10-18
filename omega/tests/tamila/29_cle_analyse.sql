-- 29 — La clé d'un dossier au coffre, rendue au lecteur pour une lecture longue (migration b4_20). Après 00_jeu_tamila.sql,
-- b4_01 à b4_20 (et le socle 19an). runtests() annule tout.

create or replace function tests.test_b4_29_cle_analyse() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_dossier uuid; v_autre uuid; v_p1 uuid; v_p2 uuid; v_p3 uuid; v_etrangere uuid; r jsonb;
  v_maitre text := '0b5c1e2a-4d6f-4a8b-9c0d-1e2f3a4b5c6d'; v_env bytea := decode(repeat('5c', 120), 'hex');
  v_a uuid; v_b uuid; v_journal bigint; n bigint;
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


  -- Sans analyse, une pièce lue n'a pas de clé à rendre (b4_05 inchangé).
  perform tests.endosser_serveur();
  return next throws_ok(format('select public.tamila_coffre_pour_lecteur(%L::uuid)', v_p1), '55000', null, 'pièce lue, sans analyse : pas de clé (55000)');
  r := public.tamila_coffre_pour_lecteur(v_p3);
  return next ok(r ->> 'fournisseur' = 'scaleway' and r ->> 'analyse' is null, 'une pièce à lire : la clé, comme avant');
  perform tests.redevenir_admin();

  -- Une chronologie demandée sur les pièces lues : la clé revient au lecteur par l'une d'elles.
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  v_a := public.tamila_demander_analyse(v_dossier, 'chronologie');
  perform tests.redevenir_admin();
  select count(*) into n from public.tamila_coffre_journal where dossier_id = v_dossier and pour = 'lecteur';
  perform tests.endosser_serveur();
  r := public.tamila_coffre_pour_lecteur(v_p1);
  perform tests.redevenir_admin();
  return next ok(r ->> 'fournisseur' = 'scaleway' and r ->> 'enveloppe' is not null and (r ->> 'analyse')::uuid = v_a,
                 'pièce lue couverte par une analyse demandée : la clé, avec l''analyse');
  return next is((select count(*) from public.tamila_coffre_journal where dossier_id = v_dossier and pour = 'lecteur'), n + 1,
                 'la remise est journalisée');

  -- L'analyse finie : la porte se referme.
  execute format('update public.analyses set statut = ''finie'', finie_le = now() where id = %L', v_a);
  perform tests.endosser_serveur();
  return next throws_ok(format('select public.tamila_coffre_pour_lecteur(%L::uuid)', v_p1), '55000', null, 'analyse finie : plus de clé (55000)');
  perform tests.redevenir_admin();

  -- Une analyse sur une seule pièce n'ouvre pas l'autre.
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  v_b := public.tamila_demander_analyse(v_dossier, 'bordereau', array[v_p2]);
  perform tests.redevenir_admin();
  perform tests.endosser_serveur();
  return next ok((public.tamila_coffre_pour_lecteur(v_p2) ->> 'analyse')::uuid = v_b, 'la pièce de l''analyse : la clé');
  return next throws_ok(format('select public.tamila_coffre_pour_lecteur(%L::uuid)', v_p1), '55000', null, 'une pièce hors de l''analyse : refus (55000)');
  perform tests.redevenir_admin();

  -- Une personne ne passe jamais par cette porte.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select private.tamila_coffre_pour_lecteur(%L::uuid)', v_p2), '42501', null, 'une personne : refus (42501)');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b4_29_');
