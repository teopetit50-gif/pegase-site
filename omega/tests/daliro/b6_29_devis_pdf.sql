-- b6_29 — DALIRO : le devis en PDF, déposé, lu (lecteur d'A1), importé (session B6, 15/10/2026), b6_33.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_33.
-- runtests() annule tout. Le lecteur n'est pas appelé : sa lecture (CHAMPS-LECTURE.md, § Daliro) est posée sur la
-- pièce comme il le ferait (pieces_valeurs « lignes », statut « lue »).

create or replace function tests.test_b6_29_devis_pdf() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_collab uuid;
  v_mo uuid; v_ch uuid; v_lot uuid; v_m uuid; v_m2 uuid; v_piece uuid; v_lu jsonb; v_r jsonb;
  v_sha text := md5(random()::text) || md5(random()::text);
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');
  v_collab := tests.b6_compte(v_client, 'collaborateur', 'b6-devis-collab@banc-varelo.test');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO du devis PDF') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier du devis PDF', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch, '02', 'Gros œuvre', 'client') returning id into v_lot;
  v_m := public.btp_ecrire_marche(null, v_ch, jsonb_build_object('reference', 'PDF-1', 'mode_prix', 'unitaire', 'montant_ht_declare', 2674, 'retenue_taux', 0));

  -- ── Les droits et les refus ──
  return next ok(not has_function_privilege('anon', 'public.btp_deposer_devis(uuid, text, text, bigint, text, text)', 'execute'), 'anon ne dépose pas de devis');
  perform tests.endosser(v_collab, 'b6-devis-collab@banc-varelo.test');
  return next throws_ok(format('select public.btp_deposer_devis(%L, %L, %L, 1000, %L, %L)', v_m, 'devis.pdf', 'application/pdf', v_sha, v_client || '/btp_marche/' || v_m || '/devis.pdf'),
                        '42501', null, 'Un collaborateur ne dépose pas de devis');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.btp_deposer_devis(%L, %L, %L, 1000, %L, %L)', v_m, 'devis.xlsx', 'application/vnd.ms-excel', v_sha, v_client || '/btp_marche/' || v_m || '/devis.xlsx'),
                        '22023', null, 'Un tableur ne se dépose pas ici (il se colle ou s''exporte en CSV)');
  return next throws_ok(format('select public.btp_deposer_devis(%L, %L, %L, 1000, %L, %L)', v_m, 'devis.pdf', 'application/pdf', v_sha, v_client || '/ailleurs/devis.pdf'),
                        '22023', null, 'Le fichier se range sous le marché');

  -- ── Le dépôt ──
  v_piece := public.btp_deposer_devis(v_m, 'Devis 2026-114.pdf', 'application/pdf', 182000, v_sha, v_client || '/btp_marche/' || v_m || '/devis-2026-114.pdf');
  return next is((select p.module || '/' || p.objet_type || '/' || p.type_piece || '/' || p.statut from public.pieces p where p.id = v_piece),
                 'daliro/btp_marche/daliro_devis/recue', 'Le PDF est une pièce daliro du marché, reçue, type daliro_devis (le socle en demande la lecture)');
  return next throws_ok(format('select public.btp_deposer_devis(%L, %L, %L, 182000, %L, %L)', v_m, 'Devis bis.pdf', 'application/pdf', v_sha, v_client || '/btp_marche/' || v_m || '/bis.pdf'),
                        '23505', null, 'Le même fichier deux fois est refusé');
  return next is(public.btp_devis_lu(v_m) ->> 'statut', 'recue', 'Avant la lecture : reçu, pas de lignes');

  -- ── La lecture rendue par le lecteur ──
  perform tests.redevenir_admin();
  insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, page, source, confiance, verifiee) values
    (v_client, v_piece, 'lignes', jsonb_build_array(
       jsonb_build_object('numero', '1.1', 'lot', '02', 'designation', 'Chape ciment sur plancher', 'unite', 'm²', 'quantite', 38, 'prix_unitaire', 48, 'montant', 1824),
       jsonb_build_object('numero', '1.2', 'lot', 'GROS ŒUVRE', 'designation', 'Installation de chantier', 'unite', 'ft', 'quantite', null, 'prix_unitaire', null, 'montant', 850)),
     null, 1, 'ia', 0.92, true),
    (v_client, v_piece, 'montant_total_ht', '2674'::jsonb, '2 674,00', 2, 'ia', 0.95, true);
  update public.pieces set statut = 'lue' where id = v_piece;

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_lu := public.btp_devis_lu(v_m);
  return next is((v_lu ->> 'statut') || '/' || jsonb_array_length(v_lu -> 'lignes') || '/' || (v_lu ->> 'montant_total_ht') || '/' || (v_lu ->> 'lignes_verifiees'),
                 'lue/2/2674/true', 'Lu : deux lignes, 2 674 € HT, lignes vérifiées');

  -- ── L'import (ce que l'écran envoie après l'aperçu) ──
  v_r := public.btp_importer_lignes(v_m, jsonb_build_array(
    jsonb_build_object('designation', 'Chape ciment sur plancher', 'nature', 'ouvrage', 'numero', '1.1', 'lot_id', v_lot, 'unite_lue', 'm²', 'quantite', 38, 'prix_unitaire_ht', 48, 'montant_ht', 1824),
    jsonb_build_object('designation', 'Installation de chantier', 'nature', 'forfait', 'numero', '1.2', 'section', 'GROS ŒUVRE', 'lot_id', v_lot, 'unite_lue', 'ft', 'montant_ht', 850)));
  return next is((v_r ->> 'creees')::int, 2, 'Les deux lignes lues entrent au marché, par la porte du socle');
  return next is((select string_agg(l.numero || ':' || l.controle, ',' order by l.ordre) from public.btp_lignes_marche l where l.marche_id = v_m), '1.1:ok,1.2:ok',
                 'Contrôlées comme une saisie');

  -- ── Un marché vérifié ne reçoit plus de devis ──
  perform public.btp_verifier_marche(v_m);
  return next throws_ok(format('select public.btp_deposer_devis(%L, %L, %L, 1000, %L, %L)', v_m, 'autre.pdf', 'application/pdf', md5('x') || md5('y'), v_client || '/btp_marche/' || v_m || '/autre.pdf'),
                        '23514', null, 'Marché vérifié : plus de dépôt de devis');
  return next ok(tests.b6_journal(v_client, 'daliro.devis_depose', v_m::text) is not null, 'Le dépôt est au journal');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b6_29_');
