-- c3_01 — REPUT : la base de connaissances (migration c3_01_base_connaissances).
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00_jeu.sql et la migration c3_01.
-- runtests() annule tout : rien ne reste sur le banc.

create or replace function tests.test_c3_01_base() returns setof text
language plpgsql as $f$
declare
  banc jsonb; jeu jsonb;
  v_client uuid; v_gerant uuid; v_daf uuid; v_collab uuid; v_lecteur uuid; v_collab_site uuid; v_autre uuid;
  v_site uuid; v_site2 uuid;
  v_inst jsonb; v_f jsonb; v_h1 uuid; v_h2 uuid; v_t uuid; v_vieille uuid; v_future uuid; v_s uuid; v_base jsonb;
  n integer;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  v_collab := tests.c3_compte(v_client, 'collaborateur', 'c3-collab@banc-varelo.test');
  v_lecteur := tests.c3_compte(v_client, 'lecteur', 'c3-lecteur@banc-varelo.test');
  v_collab_site := tests.c3_compte(v_client, 'collaborateur', 'c3-collab-site@banc-varelo.test', false);
  insert into public.entites (client_id, nom, type) values (v_client, 'Agence de Lyon (C3)', 'site') returning id into v_site;
  insert into public.entites (client_id, nom, type) values (v_client, 'Agence de Nantes (C3)', 'site') returning id into v_site2;
  insert into public.comptes_entites (client_id, user_id, entite_id) values (v_client, v_collab_site, v_site2);
  jeu := tests.jeu();
  v_autre := (jeu ->> 'gerant_a')::uuid;

  -- ── Les droits sur les fonctions ──
  return next ok(not has_function_privilege('anon', 'public.reput_installer(uuid, uuid)', 'execute'), 'anon n''exécute pas reput_installer');
  return next ok(not has_function_privilege('anon', 'public.reput_ecrire_connaissance(uuid, uuid, jsonb)', 'execute'), 'anon n''exécute pas reput_ecrire_connaissance');
  return next ok(not has_function_privilege('authenticated', 'public.reput_base(uuid, uuid, timestamptz)', 'execute'), 'authenticated n''exécute pas reput_base (serveur seul)');
  return next ok(has_function_privilege('service_role', 'public.reput_base(uuid, uuid, timestamptz)', 'execute'), 'service_role exécute reput_base');
  return next ok(not has_function_privilege('authenticated', 'private.reput_installer(uuid, uuid)', 'execute'), 'authenticated n''exécute pas private.reput_installer');
  return next ok(not has_function_privilege('authenticated', 'private.reput_base(uuid, uuid, timestamptz)', 'execute'), 'authenticated n''exécute pas private.reput_base');
  return next ok(not has_table_privilege('authenticated', 'public.reput_connaissances', 'insert'), 'Aucune écriture directe dans reput_connaissances');
  return next ok(not has_table_privilege('authenticated', 'public.reput_sujets', 'update'), 'Aucune écriture directe dans reput_sujets');
  return next ok(exists (select 1 from private.abonnements a where a.evenement = 'reception.nouvelle' and a.module = 'reput' and a.genre = 'reput.preparer'),
                 'Abonnement reception.nouvelle → reput.preparer');

  -- ── Installation ──
  perform tests.endosser(v_collab, 'c3-collab@banc-varelo.test');
  return next throws_ok(format('select public.reput_installer(%L)', v_client), '42501', null, 'Un collaborateur n''installe pas REPUT');
  perform tests.redevenir_admin();
  v_inst := public.reput_installer(v_client);
  return next ok((v_inst ->> 'sujets')::int >= 11, 'Installation par le serveur : les onze sujets par défaut');
  return next is((select r.signature from public.reput_reglages r where r.client_id = v_client and r.entite_id is null),
                 (select c.nom from public.clients c where c.id = v_client), 'La signature par défaut est le nom de l''organisation');
  v_inst := public.reput_installer(v_client);
  return next is((select count(*)::int from public.reput_reglages r where r.client_id = v_client and r.entite_id is null), 1, 'Rejouer l''installation ne crée rien de plus');
  return next is((select autorisable from public.reput_sujets s where s.client_id = v_client and s.code = 'reclamation'), false,
                 'Une réclamation n''est jamais autorisable à l''envoi seul');
  return next is((select autorisable from public.reput_sujets s where s.client_id = v_client and s.code = 'horaires'), true,
                 'Les horaires sont autorisables');

  -- ── Le gérant écrit une fiche : validée d'emblée, tracée ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_f := public.reput_ecrire_connaissance(null, v_client, jsonb_build_object(
    'sujet', 'horaires', 'genre', 'horaires', 'titre', 'Horaires d''ouverture',
    'contenu', 'Du lundi au vendredi, de 8 h 30 à 18 h. Fermé le samedi et le dimanche.',
    'source', 'Fiche Google de l''agence, relue par le gérant'));
  v_h1 := (v_f ->> 'id')::uuid;
  return next is(v_f ->> 'statut', 'validee', 'Une fiche écrite par le gérant est validée');
  return next is((v_f ->> 'version')::int, 1, 'Première version');
  return next ok(tests.c3_journal(v_client, 'reput.connaissance_creee', v_h1::text) is not null, 'Journal : reput.connaissance_creee');
  return next is((select valide_par from public.reput_connaissances where id = v_h1), v_gerant, 'La fiche porte son auteur (valide_par)');
  return next throws_ok(format('select public.reput_ecrire_connaissance(null, %L, %L::jsonb)', v_client,
    '{"sujet":"horaires","genre":"horaires","titre":"Sans source","contenu":"8 h - 18 h"}'), '22023', null, 'Une fiche sans source est refusée');
  return next throws_ok(format('select public.reput_ecrire_connaissance(null, %L, %L::jsonb)', v_client,
    '{"sujet":"inconnu","genre":"question","titre":"Q","contenu":"R","source":"S"}'), '23503', null, 'Un sujet inconnu est refusé');
  return next throws_ok(format('select public.reput_ecrire_connaissance(null, %L, %L::jsonb)', v_client,
    '{"sujet":"tarifs","genre":"question","titre":"Q","contenu":"R","source":"S","prix":12}'), '22023', null, 'Un champ inconnu est refusé');
  return next throws_ok(format('select public.reput_ecrire_connaissance(null, %L, %L::jsonb)', v_client,
    '{"sujet":"tarifs","genre":"recette","titre":"Q","contenu":"R","source":"S"}'), '23514', null, 'Un genre inconnu est refusé');

  -- ── Un collaborateur écrit un brouillon ; un valideur le valide ──
  perform tests.endosser(v_collab, 'c3-collab@banc-varelo.test');
  v_f := public.reput_ecrire_connaissance(null, v_client, jsonb_build_object(
    'sujet', 'tarifs', 'genre', 'tarif', 'titre', 'Prix d''un diagnostic à domicile',
    'contenu', 'Le diagnostic à domicile coûte 89 € TTC, déduits de la facture si les travaux sont commandés.',
    'source', 'Grille tarifaire 2026, page 2'));
  v_t := (v_f ->> 'id')::uuid;
  return next is(v_f ->> 'statut', 'brouillon', 'Une fiche écrite par un collaborateur est un brouillon');
  return next throws_ok(format('select public.reput_valider_connaissance(%L)', v_t), '42501', null, 'Un collaborateur ne valide pas');
  perform tests.redevenir_admin();
  return next ok(not (private.reput_base(v_client) -> 'fiches') @> jsonb_build_array(jsonb_build_object('id', v_t)), 'Un brouillon n''est pas dans la base en vigueur');
  perform tests.endosser(v_lecteur, 'c3-lecteur@banc-varelo.test');
  return next throws_ok(format('select public.reput_ecrire_connaissance(null, %L, %L::jsonb)', v_client,
    '{"sujet":"tarifs","genre":"question","titre":"Q","contenu":"R","source":"S"}'), '42501', null, 'Un lecteur n''écrit pas dans la base');
  return next ok(tests.compter('public', 'reput_connaissances', format('client_id = %L', v_client)) >= 2, 'Un lecteur lit la base (RLS)');
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  v_f := public.reput_valider_connaissance(v_t);
  return next is(v_f ->> 'statut', 'validee', 'Le valideur valide le brouillon');
  return next is((select valide_par from public.reput_connaissances where id = v_t), v_daf, 'La fiche porte son valideur');
  return next is((select cree_par from public.reput_connaissances where id = v_t), v_collab, 'et son rédacteur');
  return next throws_ok(format('select public.reput_valider_connaissance(%L)', v_t), '23514', null, 'Une fiche validée ne se revalide pas');
  perform tests.redevenir_admin();
  return next ok((private.reput_base(v_client) -> 'fiches') @> jsonb_build_array(jsonb_build_object('id', v_t)), 'Validée, elle entre dans la base en vigueur');

  -- ── Une modification d'horaire s'applique à la réponse suivante ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_f := public.reput_ecrire_connaissance(v_h1, v_client, jsonb_build_object(
    'contenu', 'Du lundi au vendredi, de 8 h 30 à 18 h ; le samedi de 9 h à 12 h.', 'source', 'Décision du gérant du 6 octobre'));
  v_h2 := (v_f ->> 'id')::uuid;
  return next is((v_f ->> 'version')::int, 2, 'La correction est une version 2');
  return next is((v_f ->> 'origine')::uuid, v_h1, 'de la même fiche (origine)');
  return next is((select statut from public.reput_connaissances where id = v_h1), 'remplacee', 'La version 1 est remplacée');
  return next is((select remplace_id from public.reput_connaissances where id = v_h2), v_h1, 'La version 2 dit ce qu''elle remplace');
  return next ok(tests.c3_journal(v_client, 'reput.connaissance_corrigee', v_h2::text) is not null, 'Journal : reput.connaissance_corrigee');
  return next throws_ok(format('select public.reput_ecrire_connaissance(%L, %L, %L::jsonb)', v_h1, v_client, '{"contenu":"x"}'),
                        '23514', null, 'On ne corrige pas une version remplacée');
  perform tests.redevenir_admin();
  v_base := private.reput_base(v_client);
  return next is((select count(*)::int from jsonb_array_elements(v_base -> 'fiches') x where x ->> 'origine' = v_h1::text), 1,
                 'La base en vigueur porte une seule version des horaires');
  return next ok(exists (select 1 from jsonb_array_elements(v_base -> 'fiches') x where x ->> 'id' = v_h2::text and x ->> 'contenu' like '%samedi de 9 h%'),
                 'et c''est la nouvelle : la réponse suivante la cite');

  -- ── La période de validité ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_vieille := (public.reput_ecrire_connaissance(null, v_client, jsonb_build_object(
    'sujet', 'tarifs', 'genre', 'tarif', 'titre', 'Tarif 2025', 'contenu', '79 €', 'source', 'Grille 2025',
    'valide_du', current_date - 400, 'valide_au', current_date - 30)) ->> 'id')::uuid;
  v_future := (public.reput_ecrire_connaissance(null, v_client, jsonb_build_object(
    'sujet', 'horaires', 'genre', 'horaires', 'titre', 'Fermeture de Noël', 'contenu', 'Fermé du 24 au 26 décembre.',
    'source', 'Note de service', 'valide_du', current_date + 20, 'valide_au', current_date + 90)) ->> 'id')::uuid;
  return next throws_ok(format('select public.reput_ecrire_connaissance(null, %L, %L::jsonb)', v_client,
    jsonb_build_object('sujet', 'tarifs', 'genre', 'tarif', 'titre', 'T', 'contenu', 'C', 'source', 'S',
                       'valide_du', current_date, 'valide_au', current_date - 1)), '23514', null, 'Une période à l''envers est refusée');
  perform tests.redevenir_admin();
  v_base := private.reput_base(v_client);
  return next ok(not (v_base -> 'fiches') @> jsonb_build_array(jsonb_build_object('id', v_vieille)), 'Une fiche échue n''est plus dans la base');
  return next ok(not (v_base -> 'fiches') @> jsonb_build_array(jsonb_build_object('id', v_future)), 'Une fiche pas encore en vigueur n''y est pas');
  return next ok((private.reput_base(v_client, null, now() + interval '30 days') -> 'fiches') @> jsonb_build_array(jsonb_build_object('id', v_future)),
                 'Elle y entre le jour venu');

  -- ── Retirer ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.reput_retirer_connaissance(%L, %L)', v_t, ' '), '22023', null, 'Retirer sans motif est refusé');
  v_f := public.reput_retirer_connaissance(v_t, 'Le diagnostic n''est plus proposé');
  return next is(v_f ->> 'statut', 'retiree', 'La fiche est retirée');
  perform tests.redevenir_admin();
  return next ok(not (private.reput_base(v_client) -> 'fiches') @> jsonb_build_array(jsonb_build_object('id', v_t)), 'Retirée, elle sort de la base');
  return next ok(tests.c3_journal(v_client, 'reput.connaissance_retiree', v_t::text) is not null, 'Journal : reput.connaissance_retiree');

  -- ── Entité par entité ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_f := public.reput_ecrire_connaissance(null, v_client, jsonb_build_object(
    'entite', v_site, 'sujet', 'horaires', 'genre', 'horaires', 'titre', 'Horaires de l''agence de Lyon',
    'contenu', 'Lyon : du mardi au samedi, 9 h - 19 h.', 'source', 'Directeur d''agence'));
  perform public.reput_regler(v_client, v_site, jsonb_build_object('signature', 'L''équipe de l''agence de Lyon', 'ton', 'vouvoiement',
                                                                    'mention_automatisee', 'Réponse préparée par notre assistant, relue par l''agence.'));
  return next throws_ok(format('select public.reput_regler(%L, null, %L::jsonb)', v_client, '{"couleur":"bleu"}'), '22023', null, 'Un réglage inconnu est refusé');
  return next throws_ok(format('select public.reput_regler(%L, null, %L::jsonb)', v_client, '{"ton":"familier"}'), '23514', null, 'Un ton inconnu est refusé');
  perform tests.redevenir_admin();
  return next ok(not (private.reput_base(v_client) -> 'fiches') @> jsonb_build_array(jsonb_build_object('id', (v_f ->> 'id'))),
                 'La fiche de Lyon n''est pas dans la base de l''organisation');
  v_base := private.reput_base(v_client, v_site);
  return next ok((v_base -> 'fiches') @> jsonb_build_array(jsonb_build_object('id', (v_f ->> 'id'))), 'Elle est dans la base de Lyon');
  return next ok((v_base -> 'fiches') @> jsonb_build_array(jsonb_build_object('id', v_h2::text)), 'avec les fiches communes');
  return next is(v_base -> 'reglages' ->> 'signature', 'L''équipe de l''agence de Lyon', 'Lyon signe de sa propre signature');
  return next is(private.reput_base(v_client, v_site2) -> 'reglages' ->> 'signature',
                 (select c.nom from public.clients c where c.id = v_client), 'Nantes, sans réglage propre, signe au nom de l''organisation');
  perform tests.endosser(v_collab_site, 'c3-collab-site@banc-varelo.test');
  return next throws_ok(format('select public.reput_ecrire_connaissance(null, %L, %L::jsonb)', v_client,
    jsonb_build_object('entite', v_site, 'sujet', 'tarifs', 'genre', 'question', 'titre', 'Q', 'contenu', 'R', 'source', 'S')),
    '42501', null, 'Un collaborateur de Nantes n''écrit pas dans la base de Lyon');
  return next is(tests.compter('public', 'reput_connaissances', format('entite_id = %L', v_site))::int, 0, 'et ne la lit pas (RLS de périmètre)');

  -- ── Sujets ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_ecrire_sujet(v_client, 'reclamation', 'Réclamation', 'Tout mécontentement');
  return next is((select autorisable from public.reput_sujets s where s.client_id = v_client and s.code = 'reclamation'), false,
                 'Réécrire « reclamation » ne la rend pas autorisable');
  v_s := (public.reput_ecrire_sujet(v_client, 'livraison', 'Livraison', 'Délais et suivi de livraison') ->> 'id')::uuid;
  return next is((select autorisable from public.reput_sujets s where s.id = v_s), true, 'Un sujet ajouté est autorisable');
  return next throws_ok(format('select public.reput_ecrire_sujet(%L, %L, %L, null, false)', v_client, 'autre', 'Autre'), '22023', null,
                        'Le sujet « autre » ne se désactive pas');
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  return next throws_ok(format('select public.reput_ecrire_sujet(%L, %L, %L)', v_client, 'x_daf', 'X'), '42501', null, 'Un valideur ne pose pas les sujets');

  -- ── Une autre organisation ne voit ni n'écrit rien ──
  perform tests.endosser(v_autre, 'a5-gerant-a@essai.invalid');
  return next is(tests.compter('public', 'reput_connaissances', format('client_id = %L', v_client))::int, 0, 'Le gérant d''une autre organisation ne lit pas la base du banc');
  return next is(tests.compter('public', 'reput_sujets', format('client_id = %L', v_client))::int, 0, 'ni ses sujets');
  return next throws_ok(format('select public.reput_ecrire_connaissance(null, %L, %L::jsonb)', v_client,
    '{"sujet":"tarifs","genre":"question","titre":"Q","contenu":"R","source":"S"}'), '42501', null, 'ni n''y écrit');
  return next throws_ok(format('select public.reput_base(%L)', v_client), '42501', null, 'ni ne lit la base par la porte du serveur');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_c3_01_');
