-- c3_14 — REPUT : lire et afficher les pièces jointes d'une demande.
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_13 (aides tests.c3_*, dont tests.c3_reception de
-- c3_02) et les migrations c3_01 à c3_14. Aucune pièce réelle : des chemins fictifs sur le client du banc ; rien n'est
-- lu dans le stockage. runtests() annule tout.

create or replace function tests.test_c3_14_pieces() returns setof text
language plpgsql as $f$
declare
  banc jsonb; jeu jsonb;
  v_client uuid; v_gerant uuid; v_collab uuid; v_collab_site uuid; v_autre uuid; v_site uuid; v_site2 uuid;
  v_rec bigint; v_dem uuid; v_rec2 bigint; v_dem2 uuid; v_j jsonb; v_o jsonb; v_jr jsonb;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  v_collab := tests.c3_compte(v_client, 'collaborateur', 'c3-14-collab@banc-varelo.test');
  v_collab_site := tests.c3_compte(v_client, 'collaborateur', 'c3-14-collab-site@banc-varelo.test', false);
  insert into public.entites (client_id, nom, type) values (v_client, 'Agence de Lyon (C3-14)', 'site') returning id into v_site;
  insert into public.entites (client_id, nom, type) values (v_client, 'Agence de Nantes (C3-14)', 'site') returning id into v_site2;
  insert into public.comptes_entites (client_id, user_id, entite_id) values (v_client, v_collab_site, v_site2);
  jeu := tests.jeu();
  v_autre := (jeu ->> 'gerant_a')::uuid;
  perform public.reput_installer(v_client);

  v_rec := tests.c3_reception(v_client, 'email', 'c3-14@exemple.test', 'Fictif Pièces', 'Photo du dressing', 'Voici la photo et le devis.',
                              'reput', jsonb_build_object('pieces_ignorees', jsonb_build_array('trop-gros.zip')));
  update public.receptions set entite_id = v_site, pieces = jsonb_build_array(
    jsonb_build_object('nom', 'dressing.jpg', 'mime', 'image/jpeg', 'taille', 48211, 'chemin', v_client::text || '/receptions/c3-14/dressing.jpg'),
    jsonb_build_object('nom', 'devis.pdf', 'mime', 'application/pdf', 'taille', 90112, 'chemin', v_client::text || '/receptions/c3-14/devis.pdf'),
    jsonb_build_object('nom', 'plan.svg', 'mime', 'image/svg+xml', 'taille', 1200, 'chemin', v_client::text || '/receptions/c3-14/plan.svg'),
    jsonb_build_object('nom', 'ailleurs.pdf', 'mime', 'application/pdf', 'taille', 10, 'chemin', '00000000-0000-4000-8000-000000000000/receptions/x/ailleurs.pdf'),
    jsonb_build_object('nom', 'remonte.pdf', 'mime', 'application/pdf', 'taille', 10, 'chemin', v_client::text || '/receptions/../../autre/remonte.pdf'))
  where id = v_rec;
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  update public.reput_demandes set entite_id = v_site where id = v_dem;
  v_rec2 := tests.c3_reception(v_client, 'whatsapp', '+33600000014', 'Fictif Sans pièce', null, 'Bonjour');
  v_dem2 := (public.reput_commencer(v_rec2) ->> 'demande')::uuid;

  -- ── Droits ──
  return next ok(not has_function_privilege('anon', 'public.reput_pieces(uuid)', 'execute')
                 and not has_function_privilege('anon', 'public.reput_ouvrir_piece(uuid, integer)', 'execute'),
                 'anon n''exécute ni reput_pieces ni reput_ouvrir_piece');
  return next ok(not has_function_privilege('authenticated', 'private.reput_demande_lue(uuid)', 'execute'),
                 'authenticated n''exécute pas private.reput_demande_lue');

  -- ── La liste ──
  perform tests.endosser(v_collab, 'c3-14-collab@banc-varelo.test');
  v_j := public.reput_pieces(v_dem);
  return next is(jsonb_array_length(v_j -> 'pieces'), 5, 'Les cinq pièces de la réception sont listées sur la demande');
  return next is((v_j -> 'pieces' -> 0 ->> 'nature') || '/' || (v_j -> 'pieces' -> 1 ->> 'nature') || '/' || (v_j -> 'pieces' -> 2 ->> 'nature'),
                 'image/pdf/autre', 'Nature : image, PDF ; un SVG n''est pas une image affichable');
  return next is((v_j -> 'pieces' -> 2 ->> 'affichable')::boolean, false, 'Un SVG se télécharge, il ne s''affiche pas dans la page');
  return next is((v_j -> 'pieces' -> 3 ->> 'disponible')::boolean, false, 'Une pièce rangée hors du stockage de l''organisation est indisponible');
  return next ok(not (v_j -> 'pieces' -> 0 ? 'chemin'), 'La liste ne donne pas les chemins');
  return next is(v_j -> 'ignorees', '["trop-gros.zip"]'::jsonb, 'Les pièces non reçues sont dites');
  return next is(public.reput_pieces(v_dem2) -> 'pieces', '[]'::jsonb, 'Une demande sans pièce rend une liste vide');

  -- ── Ouvrir ──
  v_o := public.reput_ouvrir_piece(v_dem, 2);
  return next is(v_o ->> 'chemin', v_client::text || '/receptions/c3-14/devis.pdf', 'Ouvrir rend le chemin à signer de la pièce');
  return next ok(v_o ->> 'bucket' = 'omega-clients' and (v_o ->> 'duree')::int = 300 and (v_o ->> 'affichable')::boolean,
                 'Bucket omega-clients, lien de 5 minutes, PDF affichable');
  return next throws_ok(format('select public.reput_ouvrir_piece(%L, 4)', v_dem), '22023', null,
                        'Un chemin hors de l''organisation n''est jamais rendu');
  return next throws_ok(format('select public.reput_ouvrir_piece(%L, 5)', v_dem), '22023', null,
                        'Un chemin qui remonte (..) n''est jamais rendu');
  return next throws_ok(format('select public.reput_ouvrir_piece(%L, 9)', v_dem), '22023', null, 'Une pièce qui n''existe pas est refusée');
  perform tests.redevenir_admin();
  v_jr := tests.c3_journal(v_client, 'reput.piece.ouverte', v_dem::text);
  return next ok(v_jr is not null and (v_jr -> 'donnees' ->> 'rang')::int = 2, 'Journal : reput.piece.ouverte, avec le rang');
  return next ok(position('devis' in v_jr::text) = 0, 'Le journal ne porte ni le nom du fichier ni son chemin');

  -- ── Qui ne lit pas la demande ──
  perform tests.endosser(v_collab_site, 'c3-14-collab-site@banc-varelo.test');
  return next throws_ok(format('select public.reput_pieces(%L)', v_dem), '42501', null,
                        'Un collaborateur d''un autre site ne liste pas les pièces');
  return next throws_ok(format('select public.reput_ouvrir_piece(%L, 1)', v_dem), '42501', null,
                        'Un collaborateur d''un autre site n''ouvre pas la pièce');
  perform tests.endosser(v_autre, 'a5-gerant-a@essai.invalid');
  return next throws_ok(format('select public.reput_ouvrir_piece(%L, 1)', v_dem), '42501', null,
                        'Une autre organisation n''ouvre pas la pièce');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next is(public.reput_ouvrir_piece(v_dem, 1) ->> 'nature', 'image', 'Le gérant ouvre la photo');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_c3_14_');
