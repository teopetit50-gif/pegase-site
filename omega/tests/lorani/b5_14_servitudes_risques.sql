-- Tests B5 — LORANI : les servitudes d'utilité publique et les risques lus depuis l'adresse (b5_23, sur b5_17).
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c ; aides tests.b5_* de b5_01.
-- Aucun appel réseau n'aboutit (runtests annule) : les réponses sont jouées par private.lorani_plu_poser et
-- private.lorani_plu_complement_poser. Servitudes : extrait de la vraie réponse de l'API Carto GPU pour le 31 rue
-- Mercière à Lyon (06/10/2026) ; Géorisques : réponses écrites d'après la forme documentée (le service n'était pas
-- joignable depuis le poste de B5 le 06/10).

create or replace function tests.test_b5_14_servitudes_risques() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid; v_projet uuid; r jsonb;
  l public.lorani_plu;
  v_geo text := '{"features":[{"geometry":{"type":"Point","coordinates":[4.8325,45.762]},"properties":{"label":"31 Rue Mercière 69002 Lyon","score":0.97,"citycode":"69382","type":"housenumber"}}]}';
  v_sup text := '{"type":"FeatureCollection","features":['
    || '{"type":"Feature","geometry":null,"properties":{"suptype":"ac1","typeass":"Périmètre des abords","nomsuplitt":"Cathédrale Saint-Jean et ancienne manécanterie","nomass":"AC1_Cathedrale_abor","fichier":"AC1_Cathedrale-Saint-Jean_19140418_act.pdf"}},'
    || '{"type":"Feature","geometry":null,"properties":{"suptype":"ac1","typeass":"Périmètre des abords","nomsuplitt":"Cathédrale Saint-Jean et ancienne manécanterie","nomass":"AC1_Cathedrale_abor_2","fichier":"AC1_Cathedrale-Saint-Jean_19140418_act.pdf"}},'
    || '{"type":"Feature","geometry":null,"properties":{"suptype":"ac2","typeass":"Enceinte du site","nomsuplitt":"CENTRE HISTORIQUE DE LYON","nomass":"AC2_centre","fichier":""}},'
    || '{"type":"Feature","geometry":null,"properties":{"suptype":"pm1","typeass":"Enveloppe des zonages réglementaires","nomsuplitt":"PPRNi Grand Lyon secteur Lyon Villeurbanne","nomass":"PM1_PPRNi","fichier":""}}]}';
begin
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid; v_referent := (jeu ->> 'referent')::uuid;
  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, adresse, code_postal, commune, code_insee, nature)
  values (v_client, 'Façade Mercière (test b5_14)', '31 rue Mercière', '69002', 'Lyon 2e', '69382', 'tertiaire') returning id into v_projet;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_projet, v_referent, 'chef_projet');
  perform tests.b5_endosser(v_referent);
  perform public.lorani_chercher_plu(v_projet);
  perform tests.b5_admin();

  -- ── 1. Le point trouvé lance aussi les servitudes et les risques ──
  perform private.lorani_plu_poser(v_projet, 'geo', 200, v_geo);
  select * into l from public.lorani_plu where projet_id = v_projet;
  return next ok(l.complements_statut = 'en_cours' and l.complements ?& array['sup_s', 'sup_l', 'sup_p', 'gaspar', 'sismique', 'radon', 'rga'],
                 '1. le point trouvé : servitudes (surface, ligne, point) et Géorisques (commune, sismicité, radon, argiles) demandés ensemble');

  -- ── 2. Les servitudes ──
  perform private.lorani_plu_complement_poser(v_projet, 'sup_s', 200, v_sup);
  perform private.lorani_plu_complement_poser(v_projet, 'sup_l', 200, '{"type":"FeatureCollection","features":[]}');
  perform private.lorani_plu_complement_poser(v_projet, 'sup_p', 200, '{"type":"FeatureCollection","features":[]}');
  select * into l from public.lorani_plu where projet_id = v_projet;
  return next ok(jsonb_array_length(l.servitudes) = 3
                 and l.servitudes @> '[{"categorie": "AC1", "libelle_categorie": "Abords de monument historique", "nom": "Cathédrale Saint-Jean et ancienne manécanterie", "assiette": "Périmètre des abords"}]'::jsonb
                 and l.servitudes @> '[{"categorie": "PM1", "libelle_categorie": "Plan de prévention des risques naturels"}]'::jsonb,
                 '2. trois servitudes, dédoublonnées : abords de la cathédrale (AC1), site (AC2), PPR inondation (PM1)');
  return next ok(l.complements_statut = 'en_cours', '2. … les risques ne sont pas encore revenus : on attend');

  -- ── 3. Les risques ; un service en panne n'arrête rien ──
  perform private.lorani_plu_complement_poser(v_projet, 'gaspar', 200,
    '{"results":1,"data":[{"code_insee":"69382","risques_detail":[{"num_risque":"11","libelle_risque_long":"Inondation"},{"num_risque":"13","libelle_risque_long":"Séisme"},{"num_risque":"11","libelle_risque_long":"Inondation"}]}]}');
  perform private.lorani_plu_complement_poser(v_projet, 'sismique', 200, '{"data":[{"code_insee":"69382","code_zone":"2","zone_sismicite":"2 - FAIBLE"}]}');
  perform private.lorani_plu_complement_poser(v_projet, 'radon', 503, null);
  perform private.lorani_plu_complement_poser(v_projet, 'rga', 200, '{"codeExposition":"1","exposition":"Exposition faible"}');
  select * into l from public.lorani_plu where projet_id = v_projet;
  return next ok(l.risques -> 'commune' = '["Inondation", "Séisme"]'::jsonb and l.risques ->> 'sismicite' = '2 - FAIBLE' and l.risques ->> 'argiles' = 'Exposition faible',
                 '3. risques de la commune (inondation, séisme), sismicité 2, argiles : exposition faible : ' || l.risques::text);
  return next ok(l.complements_statut = 'partiel' and l.risques -> 'erreurs' = '["radon (Géorisques) : HTTP 503"]'::jsonb and not (l.risques ? 'radon'),
                 '3. radon en panne : noté, la recherche finit « partielle » sans rien perdre du reste');
  return next ok(l.secteur_protege, '3. secteur protégé (abords MH, site)');

  -- ── 4. L'alerte et le journal ──
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:plu:%s:servitudes', v_projet) and niveau = 'attention'
                         and titre like '%secteur protégé (Abords de monument historique, Site inscrit ou classé) : avis de l''architecte des Bâtiments de France%'),
                 '4. alerte : secteur protégé, avis de l''ABF, délai majoré');
  return next ok(exists (select 1 from public.journal_opposable where client_id = v_client and action = 'lorani.servitudes_risques' and objet_id = v_projet::text),
                 '4. journal : lorani.servitudes_risques');

  -- ── 5. La porte de l'écran ──
  perform tests.b5_endosser(v_referent);
  r := public.lorani_suivre_plu(v_projet);
  perform tests.b5_admin();
  return next ok(r ? 'servitudes' and r ? 'risques' and not (r ? 'complements') and not (r ? 'geom'), '5. la porte rend servitudes et risques, sans géométrie ni identifiants d''appel');

  -- ── 6. Une nouvelle recherche relance tout ──
  perform tests.b5_endosser(v_referent);
  perform public.lorani_chercher_plu(v_projet);
  perform tests.b5_admin();
  perform private.lorani_plu_poser(v_projet, 'geo', 200, v_geo);
  select * into l from public.lorani_plu where projet_id = v_projet;
  return next ok(l.complements_statut = 'en_cours' and jsonb_array_length(l.servitudes) = 0 and l.risques = '{}'::jsonb and l.secteur_protege is null,
                 '6. nouvelle recherche : servitudes et risques remis à zéro, redemandés');
end $f$;

select * from runtests('tests'::name, '^test_b5_14_');
