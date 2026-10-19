-- b6_33 — DALIRO : les documents de chantier reçus par Daliro (session B6, 19/10/2026), b6_37.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_37.
-- runtests() annule tout. DOUBLURES : les pièces sont écrites ici, sous le module daliro (pour ne pas réveiller
-- FILED), avec les valeurs qu'un lecteur rendrait pour les types chantier_* (DEMANDE-SOCLE-documents-chantier.md).
-- Aucune vraie pièce : le rejeu sur les six photos NOBAT est celui du coordinateur.

create or replace function tests.b6_piece_doc(p_client uuid, p_type text, p_nb_pages integer, p_statut text default 'lue') returns uuid
language plpgsql security definer set search_path to '' as $$
declare v uuid;
begin
  insert into public.pieces (client_id, module, objet_type, objet_id, source, nom_fichier, mime, octets, sha256, chemin, statut, type_piece, nb_pages)
  values (p_client, 'daliro', 'essai_b6', 'documents-chantier', 'depot', 'doublure-' || coalesce(p_type, 'autre') || '.jpg', 'image/jpeg', 1000,
          md5(random()::text) || md5(random()::text), p_client::text || '/essai_b6/doublure/' || gen_random_uuid()::text || '.jpg',
          p_statut, p_type, p_nb_pages)
  returning id into v;
  return v;
end $$;

create or replace function tests.b6_valeur_doc(p_client uuid, p_piece uuid, p_champ text, p_valeur jsonb, p_page integer, p_verifiee boolean default true) returns void
language sql security definer set search_path to '' as $$
  insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, page, source, verifiee) values (p_client, p_piece, p_champ, p_valeur, p_page, 'ia', p_verifiee)
$$;

create or replace function tests.b6_integrer_document(p_piece uuid) returns jsonb
language sql security definer set search_path to '' as $$ select private.btp_integrer_document(p_piece) $$;

create or replace function tests.test_b6_33_documents_chantier() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_collab uuid;
  v_bokito uuid; v_jade uuid; v_ch1 uuid; v_ch2 uuid; v_ch3 uuid; v_lot uuid; v_m uuid;
  v_pv uuid; v_plan uuid; v_note uuid; v_autre uuid; v_photo uuid;
  v_r jsonb; v_doc uuid;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');
  v_collab := tests.b6_compte(v_client, 'collaborateur', 'b6-documents-collab@banc-varelo.test');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'SCI Bokito (essai b6_33)') returning id into v_bokito;
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'SCI Jade (essai b6_33)') returning id into v_jade;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Bokito bâtiment A (essai)', '97139', 'Les Abymes', 'professionnel', 'titulaire', v_bokito, 'ouvert') returning id into v_ch1;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Jade tranche 1 (essai)', '97139', 'Les Abymes', 'professionnel', 'titulaire', v_jade, 'ouvert') returning id into v_ch2;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Jade tranche 2 (essai)', '97139', 'Les Abymes', 'professionnel', 'titulaire', v_jade, 'ouvert') returning id into v_ch3;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch1, '02', 'Carrelage', 'client') returning id into v_lot;
  v_m := public.btp_ecrire_marche(null, v_ch2, jsonb_build_object('reference', 'JADE-1', 'mode_prix', 'unitaire', 'montant_ht_declare', 1000, 'retenue_taux', 0));

  -- ── Les doublures, comme le lecteur les rendrait ──
  perform tests.redevenir_admin();
  v_pv := tests.b6_piece_doc(v_client, 'chantier_pv_reserves', 1);
  perform tests.b6_valeur_doc(v_client, v_pv, 'date_pv', '"2024-03-25"', 1);
  perform tests.b6_valeur_doc(v_client, v_pv, 'maitre_ouvrage', '"SCI BOKITO (essai b6_33)"', 1);
  perform tests.b6_valeur_doc(v_client, v_pv, 'operation', '"Bâtiment A — opérations préalables à la réception"', 1);
  perform tests.b6_valeur_doc(v_client, v_pv, 'reserves', jsonb_build_array(
    jsonb_build_object('numero', '1', 'localisation', 'Logement A12', 'lot', '02', 'entreprise', 'Carrelages du Sud', 'description', 'Reprise des joints de la salle d''eau', 'echeance', '2024-04-30'),
    jsonb_build_object('numero', '2', 'localisation', 'Façade est', 'description', 'Fissure à reprendre', 'delai', '15 jours'),
    jsonb_build_object('numero', '3', 'description', 'Peinture de la cage d''escalier'),
    jsonb_build_object('numero', '4', 'localisation', 'Hall')), 1, false);

  v_plan := tests.b6_piece_doc(v_client, 'chantier_plan', 1);
  perform tests.b6_valeur_doc(v_client, v_plan, 'titre', '"Plan des fondations"', 1);
  perform tests.b6_valeur_doc(v_client, v_plan, 'numero_plan', '"S-02"', 1);
  perform tests.b6_valeur_doc(v_client, v_plan, 'date', '"2024-01-15"', 1);
  perform tests.b6_valeur_doc(v_client, v_plan, 'echelle', '"1/50"', 1);
  perform tests.b6_valeur_doc(v_client, v_plan, 'maitre_ouvrage', '"SCI JADE (essai b6_33)"', 1);

  v_note := tests.b6_piece_doc(v_client, 'chantier_note_technique', 3);
  perform tests.b6_valeur_doc(v_client, v_note, 'titre', '"Dispositions constructives parasismiques — tranche 1"', 1);
  perform tests.b6_valeur_doc(v_client, v_note, 'maitre_ouvrage', '"SCI JADE (essai b6_33)"', 1);
  perform tests.b6_valeur_doc(v_client, v_note, 'dispositions', jsonb_build_array(
    jsonb_build_object('texte', 'Chaînages verticaux à chaque angle et de part et d''autre des ouvertures', 'reference', 'Eurocode 8', 'page', 2),
    jsonb_build_object('texte', 'Recouvrement des aciers de 50 diamètres')), null, true);

  v_autre := tests.b6_piece_doc(v_client, 'facture', 1);
  v_photo := tests.b6_piece_doc(v_client, 'autre', 1, 'a_classer');

  -- ── Droits ──
  return next ok(not has_function_privilege('authenticated', 'private.btp_integrer_document(uuid)', 'execute')
             and not has_function_privilege('authenticated', 'private.btp_extraire_document(uuid)', 'execute'), 'L''intégration reste au serveur');
  return next ok(not has_function_privilege('anon', 'public.btp_documents_chantier(uuid)', 'execute')
             and not has_function_privilege('anon', 'public.btp_prendre_document(uuid, text, uuid)', 'execute'), 'anon ne lit ni ne classe rien');
  return next ok(pg_get_functiondef('private.btp_ouvrier(integer)'::regprocedure) like '%btp_integrer_document%', 'L''ouvrier prend les travaux daliro.document');

  -- ── Le PV de réserves : rattaché seul (un seul chantier Bokito), trois réserves à lever ──
  v_r := tests.b6_integrer_document(v_pv);
  return next is(v_r ->> 'chantier', v_ch1::text, 'Le PV est rattaché au seul chantier dont le maître d''ouvrage correspond');
  return next is((v_r ->> 'extrait')::integer, 3, 'Trois réserves : la quatrième, sans description, n''est pas inventée');
  return next is((select string_agg(coalesce(numero, '—') || ':' || coalesce(echeance::text, 'sans') || ':' || coalesce(echeance_source, '—'), ' | ' order by ordre)
                  from public.btp_reserves_a_lever where piece_id = v_pv),
                 '1:2024-04-30:ecrite | 2:2024-04-09:calculee | 3:sans:—',
                 'Échéance écrite, ou date du PV + délai écrit en jours, sinon absente');
  return next ok((select bool_and(page = 1 and piece_id = v_pv and statut = 'a_lever' and not verifiee) from public.btp_reserves_a_lever where piece_id = v_pv),
                 'Chaque réserve cite sa pièce et sa page, reste à lever, et garde « non vérifiée » du lecteur');
  return next is((select lot_id from public.btp_reserves_a_lever where piece_id = v_pv and numero = '1'), v_lot, 'Le lot 02 lu est le lot 02 du chantier');
  return next is((select localisation from public.btp_reserves_a_lever where piece_id = v_pv and numero = '3'), null, 'Un champ absent reste absent');
  return next is(tests.b6_integrer_document(v_pv) ->> 'deja', 'true', 'Rejouer ne refait rien');
  return next is((select count(*)::integer from public.btp_reserves_a_lever where piece_id = v_pv), 3, 'Toujours trois réserves');

  -- ── Le plan : deux chantiers Jade, il attend une personne ──
  v_r := tests.b6_integrer_document(v_plan);
  return next is(v_r ->> 'statut', 'a_rattacher', 'Deux chantiers correspondent : le plan reste à rattacher');
  v_doc := (v_r ->> 'document')::uuid;
  return next is((select count(*)::integer from public.btp_references_marche where document_id = v_doc), 0, 'Rien n''est tiré tant qu''il n''est pas rattaché');

  perform tests.endosser(v_collab, 'b6-documents-collab@banc-varelo.test');
  return next throws_ok(format('select public.btp_rattacher_document(%L, %L)', v_doc, v_ch2), '42501', null, 'Un collaborateur ne rattache pas');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_r := public.btp_rattacher_document(v_doc, v_ch2);
  return next is((select titre || ' | ' || numero || ' | ' || coalesce(indice, 'sans indice') || ' | ' || date_document || ' | ' || echelle || ' | ' || page || ' | ' || (marche_id = v_m)::text
                  from public.btp_references_marche where document_id = v_doc),
                 'Plan des fondations | S-02 | sans indice | 2024-01-15 | 1/50 | 1 | true',
                 'Le plan devient une référence du marché du chantier, sans indice puisque le lecteur n''en a pas lu');

  -- ── La note parasismique : rattachée par une personne, ses dispositions avec leur page ──
  perform tests.redevenir_admin();
  v_doc := (tests.b6_integrer_document(v_note) ->> 'document')::uuid;
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.btp_rattacher_document(v_doc, v_ch2);
  return next is((select string_agg(nature || ':' || coalesce(page::text, 'sans page') || ':' || coalesce(reference_normative, '—'), ' | ' order by ordre)
                  from public.btp_references_marche where document_id = v_doc),
                 'note_technique:1:— | disposition:2:Eurocode 8 | disposition:sans page:—',
                 'La note et ses deux dispositions ; une page que le lecteur n''a pas dite reste absente (pièce de 3 pages)');

  -- ── Ce qui n'est pas un document de chantier, et la pièce « à classer » prise en main ──
  perform tests.redevenir_admin();
  return next ok(tests.b6_integrer_document(v_autre) ? 'ignore', 'Une facture n''est pas un document de chantier');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_r := public.btp_prendre_document(v_photo, 'plan', v_ch1);
  return next is((select d.classe_par || ' | ' || coalesce(x.titre, 'sans titre') || ' | ' || x.page from public.btp_documents d
                  join public.btp_references_marche x on x.document_id = d.id where d.piece_id = v_photo),
                 'humain | sans titre | 1', 'Classée par une personne, sans champ lu : une référence sans titre, page 1 d''une pièce d''une page');
  return next throws_ok(format('select public.btp_prendre_document(%L, %L, %L)', v_photo, 'note_technique', v_ch1), '23514', null,
                        'Un document ne change pas de sous-type');

  -- ── Lecture et levée ──
  v_r := public.btp_documents_chantier(v_ch1);
  return next is(jsonb_array_length(v_r -> 'documents') || '/' || jsonb_array_length(v_r -> 'reserves') || '/' || jsonb_array_length(v_r -> 'references'), '2/3/1',
                 'Le chantier Bokito : deux documents, trois réserves, une référence');
  perform public.btp_lever_reserve_lue((select id from public.btp_reserves_a_lever where piece_id = v_pv and numero = '1'), '2024-04-28');
  return next is((select statut || ' ' || levee_le from public.btp_reserves_a_lever where piece_id = v_pv and numero = '1'), 'levee 2024-04-28', 'La réserve 1 est levée');
  return next ok(tests.b6_journal(v_client, 'daliro.document_extrait') is not null, 'Chaque extraction est au journal');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b6_33_');
