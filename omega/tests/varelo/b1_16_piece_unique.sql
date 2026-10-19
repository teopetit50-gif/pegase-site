-- b1_16 — VARELO : une pièce, une livraison (migration b1_13_piece_unique, après b1_11)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5), b1_00_aides.sql et b1_14.
-- runtests() annule tout ce que le test écrit. Motif : ^test_b1_16_
--
-- Le lecteur (A1) lit le bon de livraison de Transports Caraïbes déposé sur grp_societes/<société A> et enregistre
-- la livraison ; la même pièce relue ne crée pas de seconde livraison. Une pièce d'un autre groupe est refusée.

create or replace function tests.test_b1_16_piece() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; a uuid; v_autre uuid;
  v_piece uuid; v_piece_b uuid;
  r1 jsonb; r2 jsonb;
  v_champs jsonb;
begin
  b := tests.b1_preparer(7);
  v_client := (b ->> 'client')::uuid; a := (b ->> 'soc_a')::uuid; v_autre := (b ->> 'client_etranger')::uuid;
  v_piece := gen_random_uuid(); v_piece_b := gen_random_uuid();
  perform tests.inserer_minimal('public', 'pieces', jsonb_build_object('id', v_piece, 'client_id', v_client, 'module', 'varelo', 'objet_type', 'grp_societes',
               'objet_id', a::text, 'source', 'depot', 'nom_fichier', 'bl-caraibes.jpg', 'mime', 'image/jpeg', 'octets', 1000,
               'sha256', repeat('a', 64), 'chemin', v_client::text || '/grp_societes/' || a::text || '/bl-caraibes.jpg'));
  perform tests.inserer_minimal('public', 'pieces', jsonb_build_object('id', v_piece_b, 'client_id', v_autre, 'module', 'varelo', 'source', 'depot',
               'nom_fichier', 'bl.jpg', 'mime', 'image/jpeg', 'octets', 1000, 'sha256', repeat('b', 64), 'chemin', v_autre::text || '/x/bl.jpg'));
  v_champs := jsonb_build_object('date_reception', current_date - 1, 'transporteur', 'Transports Caraïbes', 'document_transport', 'LV-88',
                'colis_attendus', 10, 'colis_recus', 9, 'manquant', true, 'constat', 'Un colis manquant (lu sur le bon).', 'piece_id', v_piece);

  -- le lecteur enregistre (service : sans auth.uid()), puis relit la même pièce
  r1 := private.grp_enregistrer_reception(v_client, a, v_champs);
  r2 := private.grp_enregistrer_reception(v_client, a, v_champs || jsonb_build_object('colis_recus', 8));
  return next ok(not (r1 ->> 'deja')::boolean and (r2 ->> 'deja')::boolean and r1 ->> 'reception' = r2 ->> 'reception',
                 'la même pièce relue rend la livraison déjà enregistrée (deja = true)');
  return next is(tests.compter('public', 'grp_receptions', format('client_id = %L and piece_id = %L', v_client, v_piece)), 1::bigint, 'une seule livraison pour la pièce');
  return next is((select colis_recus from public.grp_receptions where id = (r1 ->> 'reception')::uuid), 9, 'la relecture ne réécrit rien');
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L and action = %L', v_client, 'varelo.reception.enregistree')), 1::bigint,
                 'une seule inscription au journal');
  return next is(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement like %L and acquittee_le is null', v_client, 'varelo:reserve.%')), 1::bigint,
                 'une seule alerte');

  -- l'index tient même sans la porte
  return next throws_ok(format('insert into public.grp_receptions (client_id, entite_id, date_reception, transporteur, piece_id, statut) values (%L, %L, current_date, %L, %L, %L)',
                 v_client, a, 'Doublon', v_piece, 'sans_suite'), '23505', null, 'une seconde livraison pour la même pièce : refusée par l''index (23505)');
  -- les livraisons saisies à la main (sans pièce) ne sont pas concernées
  perform private.grp_enregistrer_reception(v_client, a, jsonb_build_object('transporteur', 'Geodis'));
  perform private.grp_enregistrer_reception(v_client, a, jsonb_build_object('transporteur', 'Geodis'));
  return next is(tests.compter('public', 'grp_receptions', format('client_id = %L and piece_id is null', v_client)), 2::bigint, 'deux livraisons sans pièce : permises');

  return next throws_ok(format('select private.grp_enregistrer_reception(%L, %L, %L)', v_client, a, jsonb_build_object('transporteur', 'X', 'piece_id', v_piece_b)),
                 '22023', null, 'la pièce d''un autre groupe : refusée (22023)');
  return next throws_ok(format('select private.grp_enregistrer_reception(%L, %L, %L)', v_client, a, jsonb_build_object('transporteur', 'X', 'piece_id', 'pas-un-uuid')),
                 '22023', null, 'un identifiant de pièce illisible : refusé (22023)');
end $f$;
