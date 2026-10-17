-- b6_32 — DALIRO : l'assistant « questions » sur le chantier (session B6, 17/10/2026), b6_36.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_36b.
-- runtests() annule tout. Le modèle n'est pas appelé : la fonction Edge daliro-questions est jouée ici par ses portes,
-- comme le serveur d'Omega les appelle (clé de service ; postgres pour la recette).
--
-- Le chantier : marché vérifié, L1 « Menuiseries extérieures » 100 u × 50 €. Le gérant voit les prix, le
-- collaborateur non.

create or replace function tests.test_b6_32_questions() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_collab uuid;
  v_mo uuid; v_ch uuid; v_lot uuid; v_m uuid;
  v_q1 uuid; v_q2 uuid; v_r jsonb; v_ctx jsonb;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');  -- en Démarrage, tout membre voit les prix
  v_collab := tests.b6_compte(v_client, 'collaborateur', 'b6-questions-collab@banc-varelo.test');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO des questions') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier des questions', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch, '01', 'Lot des questions', 'client') returning id into v_lot;
  v_m := public.btp_ecrire_marche(null, v_ch, jsonb_build_object('reference', 'QUE-1', 'mode_prix', 'unitaire', 'montant_ht_declare', 5000, 'retenue_taux', 0));
  perform public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Menuiseries extérieures', 'unite_lue', 'u', 'quantite', 100, 'prix_unitaire_ht', 50, 'montant_ht', 5000, 'lot_id', v_lot));
  perform public.btp_verifier_marche(v_m);

  -- ── Les droits ──
  return next ok(not has_function_privilege('anon', 'public.btp_poser_question(uuid, text)', 'execute'), 'anon ne pose pas de question');
  return next ok(not has_function_privilege('authenticated', 'public.btp_question_commencer(uuid)', 'execute')
             and not has_function_privilege('authenticated', 'public.btp_question_deposer(uuid, jsonb, text)', 'execute')
             and not has_function_privilege('authenticated', 'public.btp_question_echec(uuid, text)', 'execute'),
                 'Les portes de l''ouvrier restent au serveur');
  return next ok(has_function_privilege('authenticated', 'private.btp_est_serveur()', 'execute'),
                 'b6_36b : les vues du chantier gardent private.btp_est_serveur sous le rôle de la personne');

  -- ── Le gérant pose une question ──
  return next throws_ok(format('select public.btp_poser_question(%L, %L)', v_ch, 'ok'), '22023', null, 'Une question de moins de 3 caractères est refusée');
  v_q1 := public.btp_poser_question(v_ch, '  Qu''est-ce qui n''est pas au devis ?  ');
  return next is((select statut || ' / ' || question from public.btp_questions where id = v_q1), 'en_attente / Qu''est-ce qui n''est pas au devis ?',
                 'La question est enregistrée, en attente, sans les espaces autour');
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from public.travaux t where t.client_id = v_client and t.genre = 'daliro.question' and t.module = 'daliro'
                         and t.charge ->> 'question' = v_q1::text and t.etat = 'a_faire'), 'Le travail daliro.question est déposé pour l''ouvrier');
  select contexte into v_ctx from public.btp_questions where id = v_q1;
  return next is(v_ctx -> 'tableau' -> 'chantier' ->> 'nom', 'Chantier des questions', 'Le contexte porte le tableau du chantier');
  return next is((v_ctx -> 'tableau' -> 'marches' -> 0 -> 'lignes' -> 0 ->> 'prix_unitaire_ht')::numeric, 50::numeric, 'Le gérant voit les prix : ils sont dans son contexte');
  return next ok(not (v_ctx -> 'tableau' ? 'bibliotheque') and v_ctx ? 'fil', 'Sans la bibliothèque de prix, avec le fil');

  -- ── Le collaborateur, sans le droit de voir les prix ──
  perform tests.endosser(v_collab, 'b6-questions-collab@banc-varelo.test');
  v_q2 := public.btp_poser_question(v_ch, 'Préparer la réunion de chantier');
  return next is(jsonb_array_length(public.btp_questions_du_chantier(v_ch)), 1, 'Le collaborateur ne lit que ses questions');
  perform tests.redevenir_admin();
  select contexte into v_ctx from public.btp_questions where id = v_q2;
  return next ok((v_ctx -> 'tableau' -> 'marches' -> 0 -> 'lignes' -> 0 ->> 'prix_unitaire_ht') is null
             and not (v_ctx -> 'tableau' ? 'situations') and not (v_ctx -> 'tableau' ? 'factures')
             and (select not voit_prix from public.btp_questions where id = v_q2),
                 'Sans voir_prix : ni prix, ni situations, ni factures dans son contexte');

  -- ── L'ouvrier : commencer, déposer ──
  v_r := public.btp_question_commencer(v_q1);
  return next is(v_r ->> 'statut' || ' / ' || (v_r ->> 'texte'), 'a_repondre / Qu''est-ce qui n''est pas au devis ?', 'Commencer rend la question et son contexte');
  v_r := public.btp_question_deposer(v_q1, jsonb_build_object('reponse', 'Rien hors devis à ce jour.', 'couverte', true,
           'sources', jsonb_build_array('marché QUE-1'), 'modele', 'claude-essai', 'tokens_entree', 1500, 'tokens_sortie', 100, 'cout_eur', 0.004), 'daliro-questions/essai');
  return next is(v_r ->> 'statut', 'repondue', 'La réponse est déposée');
  return next is(public.btp_question_deposer(v_q1, '{"reponse": "autre"}'::jsonb) ->> 'statut', 'deja', 'Une deuxième réponse ne remplace pas la première');
  perform public.btp_question_echec(v_q1, 'trop tard');
  return next is((select statut || ' / ' || reponse || ' / ' || array_to_string(sources, ',') || ' / ' || cout_eur from public.btp_questions where id = v_q1),
                 'repondue / Rien hors devis à ce jour. / marché QUE-1 / 0.004000', 'Un échec tardif ne touche pas une question répondue');
  perform public.btp_question_echec(v_q2, 'PLAFOND_IA : plafond atteint');
  return next is((select statut from public.btp_questions where id = v_q2), 'echec', 'Une question en attente passe en échec, motif gardé');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_r := public.btp_questions_du_chantier(v_ch);
  return next is(jsonb_array_length(v_r) || ' / ' || (v_r -> 0 ->> 'reponse') || ' / ' || (v_r -> 0 ? 'contexte')::text,
                 '1 / Rien hors devis à ce jour. / false', 'Le gérant relit sa réponse, sans le contexte');
  return next throws_ok(format('select public.btp_question_commencer(%L)', v_q1), '42501', null, 'Une personne ne joue pas l''ouvrier');

  -- ── Trois en attente au plus ──
  perform public.btp_poser_question(v_ch, 'Question deux ?');
  perform public.btp_poser_question(v_ch, 'Question trois ?');
  perform public.btp_poser_question(v_ch, 'Question quatre ?');
  return next throws_ok(format('select public.btp_poser_question(%L, %L)', v_ch, 'Question cinq ?'), '53400', null, 'Une quatrième question en attente est refusée');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b6_32_');
