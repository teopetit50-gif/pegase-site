-- b6_24 — DALIRO : le devis importé d'un coup (session B6, 11/10/2026), b6_28.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_28.
-- runtests() annule tout. Les lignes sont celles que l'écran envoie après avoir lu le tableau collé (devis.ts).

create or replace function tests.test_b6_24_import() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_collab uuid;
  v_mo uuid; v_ch uuid; v_lot uuid; v_m uuid; v_r jsonb;
  v_lignes jsonb; v_n integer;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');
  v_collab := tests.b6_compte(v_client, 'collaborateur', 'b6-import-collab@banc-varelo.test');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO de l''import') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier de l''import', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch, '02', 'Gros œuvre', 'client') returning id into v_lot;
  v_m := public.btp_ecrire_marche(null, v_ch, jsonb_build_object('reference', 'IMP-1', 'mode_prix', 'mixte', 'montant_ht_declare', 4378, 'retenue_taux', 0));

  v_lignes := jsonb_build_array(
    jsonb_build_object('designation', 'Chape ciment sur plancher', 'nature', 'ouvrage', 'numero', '1.1', 'section', 'GROS ŒUVRE', 'lot_id', v_lot,
                       'unite_lue', 'm²', 'quantite', 38, 'prix_unitaire_ht', 48, 'montant_ht', 1824),
    jsonb_build_object('designation', 'Garde-corps acier', 'nature', 'ouvrage', 'numero', '1.2', 'section', 'GROS ŒUVRE', 'lot_id', v_lot,
                       'unite_lue', 'ml', 'quantite', 12, 'prix_unitaire_ht', 142, 'montant_ht', 1700),
    jsonb_build_object('designation', 'Installation de chantier', 'nature', 'forfait', 'numero', '1.3', 'section', 'GROS ŒUVRE', 'lot_id', null,
                       'unite_lue', 'ft', 'montant_ht', 850),
    jsonb_build_object('designation', 'Ligne au champ inconnu', 'nature', 'ouvrage', 'couleur', 'rouge'));

  -- ── Les droits ──
  return next ok(not has_function_privilege('anon', 'public.btp_importer_lignes(uuid, jsonb)', 'execute'), 'anon n''importe pas');
  perform tests.endosser(v_collab, 'b6-import-collab@banc-varelo.test');
  begin
    v_n := (public.btp_importer_lignes(v_m, v_lignes) ->> 'creees')::int;
  exception when others then
    v_n := 0;  -- la RLS peut lui cacher le marché : « Marché introuvable »
  end;
  return next is(v_n, 0, 'Un collaborateur sans le droit d''écrire le marché : aucune ligne n''entre (chaque ligne passe par la porte du socle)');

  -- ── L'import ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_r := public.btp_importer_lignes(v_m, v_lignes);
  return next is((v_r ->> 'creees')::int || '/' || jsonb_array_length(v_r -> 'refus'), '3/1', 'Trois lignes importées, une refusée');
  return next is((v_r -> 'refus' -> 0 ->> 'rang')::int, 4, 'La ligne refusée est rendue avec son rang…');
  return next ok(v_r -> 'refus' -> 0 ->> 'message' like '%Champ inconnu%', '… et le message de la base');
  return next is((select string_agg(l.numero || ':' || coalesce(l.unite, '∅') || ':' || l.controle, ',' order by l.ordre)
                  from public.btp_lignes_marche l where l.marche_id = v_m),
                 '1.1:m2:ok,1.2:ml:montant_faux,1.3:forfait:ok',
                 'Unités normalisées par le socle ; contrôle calculé (12 × 142 ≠ 1 700 : montant faux, à corriger ou accepter)');
  return next is((select count(*)::int from public.btp_lignes_marche l where l.marche_id = v_m and l.section = 'GROS ŒUVRE' and l.lot_id = v_lot), 2,
                 'Section et lot repris');
  return next is((select m.statut from public.btp_marches m where m.id = v_m), 'a_verifier', 'Le marché reste à vérifier');
  return next throws_ok(format('select public.btp_importer_lignes(%L, %L::jsonb)', v_m, '[]'), '22023', null, 'Rien à importer : refusé');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b6_24_');
