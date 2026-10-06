-- 20 — L'effacement réel des fichiers d'un dossier à son échéance (migration b4_11). Après 00_jeu_tamila.sql,
-- b4_01 à b4_11. L'ouvrier tamila-purge efface au bucket ; ici, son passage est simulé en faisant quitter à
-- l'objet le préfixe du cabinet (le bucket refuse qu'on y efface en SQL). runtests() annule tout.

create or replace function tests.test_b4_20_effacement_fichiers() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_dossier uuid; v_piece uuid; v_chemin text; v_orphelin text; v_voisin text;
  v_demande uuid; r jsonb; v_noms text[];
begin
  jeu := tests.tamila_scene();
  v_client := (jeu ->> 'client')::uuid;
  v_dossier := (jeu ->> 'dossier')::uuid;
  v_piece := tests.tamila_piece(jeu, 'conclusions.pdf.chiffre');
  v_chemin := (select chemin from public.pieces where id = v_piece);
  v_orphelin := v_client::text || '/tamila_dossier/' || v_dossier::text || '/orphelin.chiffre';
  v_voisin := v_client::text || '/tamila_dossier/' || gen_random_uuid()::text || '/voisin.chiffre';
  insert into storage.objects (bucket_id, name) values ('omega-clients', v_chemin), ('omega-clients', v_orphelin), ('omega-clients', v_voisin);

  -- Personne d'autre que le serveur.
  return next ok(not has_function_privilege('authenticated', 'public.tamila_dossier_a_effacer(uuid)', 'execute')
                 and not has_function_privilege('authenticated', 'public.tamila_effacer_dossier_verifie(uuid)', 'execute')
                 and not has_function_privilege('anon', 'public.tamila_fichiers_restants(uuid)', 'execute')
                 and not has_function_privilege('authenticated', 'private.tamila_fichiers_du_dossier(uuid, uuid)', 'execute'),
                 'les portes de l''effacement : service_role seul');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select private.tamila_dossier_a_effacer(%L::uuid)', v_dossier), '42501', null, 'le gérant ne liste pas les fichiers à effacer (42501)');

  -- Un dossier ouvert : rien ne part.
  perform tests.redevenir_admin();
  perform tests.endosser_serveur();
  return next throws_ok(format('select public.tamila_dossier_a_effacer(%L::uuid)', v_dossier), '55000', null, 'dossier ouvert : aucun fichier listé (55000)');
  return next is(public.tamila_fichiers_restants(v_dossier), 2, 'deux fichiers du dossier au stockage (la pièce et un orphelin), pas le voisin');
  perform tests.redevenir_admin();

  -- Clôture approuvée par le gérant (associé) ; avant l'échéance, rien ne part non plus.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  v_demande := public.tamila_demander_cloture(v_dossier);
  perform public.tamila_decider(v_demande, 'approuve');
  perform tests.redevenir_admin();
  return next is((select statut from public.tamila_dossiers where id = v_dossier), 'clos', 'dossier clos');
  perform tests.endosser_serveur();
  return next throws_ok(format('select public.tamila_dossier_a_effacer(%L::uuid)', v_dossier), '55000', null, 'clos mais avant J+7 : aucun fichier listé (55000)');
  perform tests.redevenir_admin();

  -- À l'échéance : la liste, puis le refus tant qu'un fichier reste.
  update public.tamila_dossiers set effacement_prevu_le = now() - interval '1 hour' where id = v_dossier;
  perform tests.endosser_serveur();
  r := public.tamila_dossier_a_effacer(v_dossier);
  select array_agg(e ->> 'nom' order by e ->> 'nom') into v_noms from jsonb_array_elements(r -> 'fichiers') e;
  return next is(v_noms, array(select x from unnest(array[v_chemin, v_orphelin]) x order by 1), 'la liste : la pièce et l''orphelin du dossier, rien d''autre');
  return next ok((r ->> 'deja_efface')::boolean = false and r ? 'manifeste' and (r ->> 'client')::uuid = v_client, 'le manifeste est préparé, le cabinet nommé');
  return next throws_ok(format('select public.tamila_effacer_dossier_verifie(%L::uuid)', v_dossier), '55000', null, 'deux fichiers au stockage : l''effacement attend (55000)');
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from private.manifestes_effacement m where m.cle = v_client::text || '/tamila_dossier/' || v_dossier::text), 'manifeste posé (preparer_effacement)');
  return next is((select statut from public.tamila_dossiers where id = v_dossier), 'clos', 'le dossier reste clos, intact');

  -- L'ouvrier efface la pièce : il reste l'orphelin, toujours refusé.
  update storage.objects set name = 'b4-efface-au-bucket/' || name where name = v_chemin;
  perform tests.endosser_serveur();
  return next is(public.tamila_fichiers_restants(v_dossier), 1, 'un fichier restant');
  return next throws_ok(format('select public.tamila_effacer_dossier_verifie(%L::uuid)', v_dossier), '55000', null, 'un seul fichier restant suffit à refuser (55000)');
  perform tests.redevenir_admin();

  -- Plus rien : la preuve est posée, la clé désactivée, le voisin intact.
  update storage.objects set name = 'b4-efface-au-bucket/' || name where name = v_orphelin;
  perform tests.endosser_serveur();
  r := public.tamila_effacer_dossier_verifie(v_dossier);
  return next is((r ->> 'fichiers_restants')::int, 0, 'effacement vérifié : zéro fichier restant');
  perform tests.redevenir_admin();
  return next is((select statut from public.tamila_dossiers where id = v_dossier), 'efface', 'dossier effacé');
  return next ok(exists (select 1 from public.tamila_effacements e where e.dossier_id = v_dossier and e.motif = 'cloture'), 'la preuve d''effacement est posée (motif clôture)');
  return next is((select statut from public.tamila_cles where dossier_id = v_dossier), 'desactivee', 'la clé est désactivée, détruite dans sept jours');
  return next ok(exists (select 1 from storage.objects where name = v_voisin), 'le fichier d''un autre dossier n''a pas bougé');

  -- Rejoué : rien de plus.
  perform tests.endosser_serveur();
  r := public.tamila_dossier_a_effacer(v_dossier);
  return next ok((r ->> 'deja_efface')::boolean and jsonb_array_length(r -> 'fichiers') = 0, 'redemandé : déjà effacé, aucun fichier');
  r := public.tamila_effacer_dossier_verifie(v_dossier);
  return next ok((r ->> 'deja_efface')::boolean, 'reconstaté : déjà effacé, même preuve');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b4_20_');
