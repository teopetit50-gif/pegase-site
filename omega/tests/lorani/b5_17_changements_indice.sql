-- Tests B5 — LORANI : ce qui a changé d'un indice à l'autre, y compris ce que le contrôle ne relève pas (b5_28).
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c ; aides tests.b5_* de b5_01.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_b5_17_changements_indice() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid;
  v_projet uuid; v_pc2 uuid; v_pc4a uuid; v_pc4b uuid; v_ca uuid; v_cb uuid; r jsonb; ch jsonb; x jsonb;
begin
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid; v_referent := (jeu ->> 'referent')::uuid;
  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, nature)
  values (v_client, 'Immeuble Talensac (test b5_17)', '44000', 'Nantes', '44109', 'logement_collectif') returning id into v_projet;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_projet, v_referent, 'chef_projet');
  perform tests.b5_admin();

  v_pc2 := tests.b5_lire(v_referent, v_projet, 'PC2-b5_17.pdf', 'lorani_planche', jsonb_build_array(
    jsonb_build_object('champ', 'mesure.hauteur_faitage_m.projet', 'valeur', '12.40', 'texte', '+12,40')));
  v_pc4a := tests.b5_lire(v_referent, v_projet, 'PC4-niveaux-indA-b5_17.pdf', 'lorani_planche', jsonb_build_array(
    jsonb_build_object('champ', 'mesure.hauteur_faitage_m.projet', 'valeur', '12.40', 'texte', '+12,40'),
    jsonb_build_object('champ', 'mesure.largeur_m.tremie_r1', 'valeur', '1.20', 'texte', 'trémie 120')));
  v_pc4b := tests.b5_lire(v_referent, v_projet, 'PC4-niveaux-indB-b5_17.pdf', 'lorani_planche', jsonb_build_array(
    jsonb_build_object('champ', 'mesure.hauteur_faitage_m.projet', 'valeur', '12.42', 'texte', '+12,42'),
    jsonb_build_object('champ', 'mesure.largeur_m.tremie_r1', 'valeur', '1.80', 'texte', 'trémie 180'),
    jsonb_build_object('champ', 'mesure.largeur_m.porte_local_velos', 'valeur', '1.40', 'texte', 'PL 140')));
  r := private.lorani_lectures_passage();

  -- ── 1. Indice A, puis indice B ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_controles (client_id, projet_id, intitule, indice) values (v_client, v_projet, 'Dépôt du PC', 'A') returning id into v_ca;
  insert into public.lorani_controle_pieces (client_id, projet_id, controle_id, piece_id, role, reference) values
    (v_client, v_projet, v_ca, v_pc2, 'planche', 'PC2'), (v_client, v_projet, v_ca, v_pc4a, 'planche', 'PC4');
  r := public.lorani_lancer_controle(v_ca);
  insert into public.lorani_controles (client_id, projet_id, intitule, indice, precedent_id) values (v_client, v_projet, 'Dépôt du PC', 'B', v_ca) returning id into v_cb;
  insert into public.lorani_controle_pieces (client_id, projet_id, controle_id, piece_id, role, reference) values
    (v_client, v_projet, v_cb, v_pc2, 'planche', 'PC2'), (v_client, v_projet, v_cb, v_pc4b, 'planche', 'PC4');
  r := public.lorani_lancer_controle(v_cb);
  perform tests.b5_admin();
  return next ok((select changements = '[]'::jsonb from public.lorani_controles where id = v_ca), '1. indice A : rien à comparer, pas de changement');
  select changements into ch from public.lorani_controles where id = v_cb;

  -- ── 2. La trémie déplacée sans avis : listée, non relevée ──
  select e into x from jsonb_array_elements(ch) e where e ->> 'objet' = 'tremie_r1';
  return next ok(x ->> 'reference' = 'PC4' and (x ->> 'avant')::numeric = 1.20 and (x ->> 'apres')::numeric = 1.80 and not (x ->> 'releve')::boolean
                 and x ->> 'libelle' = 'la largeur de « tremie r1 »' and x ->> 'texte_apres' = 'trémie 180',
                 '2. PC4 : la largeur de la trémie du R+1 passe de 1,20 m à 1,80 m, aucun contrôle ne l''a relevée : ' || coalesce(x::text, 'absente'));

  -- ── 3. Sous la tolérance : rien ; une valeur apparue : listée ──
  return next ok(not exists (select 1 from jsonb_array_elements(ch) e where e ->> 'grandeur' = 'hauteur_faitage_m'),
                 '3. faîtage 12,40 → 12,42 m (sous la tolérance de 5 cm) : pas de changement');
  return next ok(exists (select 1 from jsonb_array_elements(ch) e where e ->> 'objet' = 'porte_local_velos' and e -> 'avant' = 'null'::jsonb and (e ->> 'apres')::numeric = 1.40),
                 '3. la porte du local vélos apparaît à l''indice B : listée, sans valeur avant');
  return next is(jsonb_array_length(ch), 2, '3. deux changements en tout (PC2 identique)');

  -- ── 4. L'alerte, et les constats inchangés ──
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:controle:%s:changements', v_cb)
                         and titre like '%indice B : 2 valeurs changées depuis l''indice A sans être relevées par le contrôle — PC4 la largeur%'),
                 '4. alerte au chef de projet : 2 valeurs changées sans être relevées');
  return next ok((select count(*) from public.lorani_constats where controle_id = v_cb) = (select constats_nb from public.lorani_controles where id = v_cb),
                 '4. les changements ne sont pas des constats : le compte des constats ne bouge pas');
end $f$;

select * from runtests('tests'::name, '^test_b5_17_');
