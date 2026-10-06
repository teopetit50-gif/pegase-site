-- Tests B5 — LORANI : les objets des pièces sœurs donnés au lecteur (b5_22).
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c ; aides tests.b5_* de b5_01.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_b5_13_objets_controle() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid;
  v_projet uuid; v_pc2 uuid; v_pc5 uuid; v_seule uuid; v_c uuid; r jsonb;
begin
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid; v_referent := (jeu ->> 'referent')::uuid;
  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, nature)
  values (v_client, 'Maison Lemoine (test b5_13)', '44000', 'Nantes', '44109', 'maison_individuelle') returning id into v_projet;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_projet, v_referent, 'chef_projet');
  perform tests.b5_admin();

  v_pc2 := tests.b5_lire(v_referent, v_projet, 'PC2-b5_13.pdf', 'lorani_planche', jsonb_build_array(
    jsonb_build_object('champ', 'mesure.hauteur_faitage_m.batiment_a', 'valeur', '9.85', 'texte', '9,85'),
    jsonb_build_object('champ', 'mesure.recul_voie_m.projet', 'valeur', '5.00', 'texte', '5,00')));
  v_pc5 := tests.b5_lire(v_referent, v_projet, 'PC5-b5_13.pdf', 'lorani_planche', jsonb_build_array(
    jsonb_build_object('champ', 'mesure.hauteur_faitage_m.batiment_a', 'valeur', '9.85', 'texte', '9,85')));

  -- ── 1. Hors contrôle : les pièces du même projet ──
  r := public.lorani_objets_controle(v_pc5);
  return next ok(r @> '[{"grandeur": "hauteur_faitage_m", "objet": "batiment_a"}, {"grandeur": "recul_voie_m", "objet": "projet"}]'::jsonb
                 and jsonb_array_length(r) = 2, '1. hors contrôle : les objets des autres pièces du projet, sans doublon : ' || r::text);
  return next ok(not (r::text ~ '9\.85'), '1. … sans aucune valeur');

  -- ── 2. Dans un contrôle : les seules pièces du contrôle ──
  v_seule := tests.b5_lire(v_referent, v_projet, 'PC9-hors-controle.pdf', 'lorani_planche', jsonb_build_array(
    jsonb_build_object('champ', 'mesure.largeur_m.garage', 'valeur', '3.20', 'texte', '3,20')));
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_controles (client_id, projet_id, intitule) values (v_client, v_projet, 'Dépôt') returning id into v_c;
  insert into public.lorani_controle_pieces (client_id, projet_id, controle_id, piece_id, role) values
    (v_client, v_projet, v_c, v_pc2, 'planche'), (v_client, v_projet, v_c, v_pc5, 'planche');
  perform tests.b5_admin();
  r := public.lorani_objets_controle(v_pc5);
  return next ok(jsonb_array_length(r) = 2 and not (r @> '[{"objet": "garage"}]'::jsonb), '2. dans un contrôle : les pièces sœurs du contrôle seulement');

  -- ── 3. Garde-fous ──
  return next is(public.lorani_objets_controle(gen_random_uuid()), '[]'::jsonb, '3. pièce inconnue : liste vide');
  return next ok(not has_function_privilege('authenticated', 'public.lorani_objets_controle(uuid)', 'EXECUTE')
                 and not has_function_privilege('anon', 'public.lorani_objets_controle(uuid)', 'EXECUTE')
                 and has_function_privilege('service_role', 'public.lorani_objets_controle(uuid)', 'EXECUTE'),
                 '3. réservée à la clé de service (le lecteur)');
end $f$;

select * from runtests('tests'::name, '^test_b5_13_');
