-- Tests B5 — LORANI : les servitudes d'utilité publique et les risques lus depuis l'adresse (b5_23 et b5_24, sur b5_17).
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c ; aides tests.b5_* de b5_01.
-- Version 2 (b5_24) : les risques ne viennent plus de l'API Géorisques (injoignable depuis nos hébergeurs) mais des
-- référentiels ouverts chargés en tables (GASPAR, zonage sismique, radon). Le test charge ses propres lignes par
-- private.lorani_ref_charger (runtests annule tout). Servitudes : extrait de la vraie réponse de l'API Carto GPU pour
-- le 31 rue Mercière à Lyon (06/10/2026), jouée par private.lorani_plu_complement_poser.

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

  -- Les référentiels du test (Lyon 2e : la commune pour GASPAR et la sismicité, l'arrondissement pour le radon).
  perform private.lorani_ref_charger('libelles', E'11;Inondation\n13;Séisme\n112;Par une crue à débordement lent de cours d''eau\n127;Tassements différentiels', 'test b5_14', 'test');
  perform private.lorani_ref_charger('risques', '69123;11,13,112', 'test b5_14', 'test');
  perform private.lorani_ref_charger('sismicite', '69123;2;2 - Faible', 'test b5_14', 'test');
  perform private.lorani_ref_charger('radon', '69382;1', 'test b5_14', 'test');

  -- ── 1. Le point trouvé lance les servitudes ; les risques sont posés tout de suite, sans réseau ──
  perform private.lorani_plu_poser(v_projet, 'geo', 200, v_geo);
  select * into l from public.lorani_plu where projet_id = v_projet;
  return next ok(l.complements_statut = 'en_cours' and l.complements ?& array['sup_s', 'sup_l', 'sup_p'] and not (l.complements ?| array['gaspar', 'sismique', 'radon', 'rga']),
                 '1. le point trouvé : servitudes (surface, ligne, point) demandées à l''IGN, plus aucune demande à Géorisques');
  return next ok(l.risques -> 'commune' = '["Inondation", "Séisme"]'::jsonb and l.risques ->> 'sismicite' = '2 - Faible' and l.risques ->> 'radon' = '1'
                 and l.risques -> 'detail' = '["Inondation : par une crue à débordement lent de cours d''eau"]'::jsonb and l.risques ->> 'argiles' is null
                 and not (l.risques ? 'erreurs') and l.risques -> 'sources' -> 'risques' ->> 'source' = 'test b5_14',
                 '1. risques lus dans les tables : Lyon 2e pris sur Lyon (GASPAR, sismicité 2), radon de l''arrondissement (1), sources citées : ' || (l.risques - 'sources')::text);

  -- ── 2. Les servitudes ──
  perform private.lorani_plu_complement_poser(v_projet, 'sup_s', 200, v_sup);
  perform private.lorani_plu_complement_poser(v_projet, 'sup_l', 200, '{"type":"FeatureCollection","features":[]}');
  select * into l from public.lorani_plu where projet_id = v_projet;
  return next ok(jsonb_array_length(l.servitudes) = 3
                 and l.servitudes @> '[{"categorie": "AC1", "libelle_categorie": "Abords de monument historique", "nom": "Cathédrale Saint-Jean et ancienne manécanterie", "assiette": "Périmètre des abords"}]'::jsonb
                 and l.servitudes @> '[{"categorie": "PM1", "libelle_categorie": "Plan de prévention des risques naturels"}]'::jsonb,
                 '2. trois servitudes, dédoublonnées : abords de la cathédrale (AC1), site (AC2), PPR inondation (PM1)');
  return next ok(l.complements_statut = 'en_cours', '2. … une servitude n''est pas encore revenue : on attend');

  -- ── 3. Tout est revenu ; les risques sont gardés ──
  perform private.lorani_plu_complement_poser(v_projet, 'sup_p', 200, '{"type":"FeatureCollection","features":[]}');
  select * into l from public.lorani_plu where projet_id = v_projet;
  return next ok(l.complements_statut = 'fait' and l.risques ->> 'sismicite' = '2 - Faible', '3. les servitudes revenues : « fait », les risques restent');
  return next ok(l.secteur_protege, '3. secteur protégé (abords MH, site)');
  r := private.lorani_risques_commune('99999');
  return next ok(r -> 'erreurs' @> '["sismicité : commune 99999 absente du zonage de 2011 (commune nouvelle ?)"]'::jsonb,
                 '3. une commune absente des référentiels est dite, pas inventée : ' || (r - 'sources')::text);

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
  return next ok(l.complements_statut = 'en_cours' and jsonb_array_length(l.servitudes) = 0 and l.risques ->> 'sismicite' = '2 - Faible' and l.secteur_protege is null,
                 '6. nouvelle recherche : servitudes remises à zéro et redemandées, risques relus');

  -- ── 7. Les référentiels : chargement gardé, lecture fermée ──
  return next throws_ok($$select private.lorani_ref_charger('cadastre', '1;2', 'x', 'x')$$, '22023', null, '7. un référentiel inconnu est refusé');
  return next ok(not has_table_privilege('authenticated', 'public.lorani_ref_risques', 'SELECT') and not has_table_privilege('anon', 'public.lorani_ref_radon', 'SELECT')
                 and not has_function_privilege('authenticated', 'private.lorani_ref_charger(text, text, text, text)', 'EXECUTE')
                 and has_table_privilege('service_role', 'public.lorani_ref_sismicite', 'INSERT'),
                 '7. tables et chargement réservés (clé de service), lus par les fonctions de Lorani');
end $f$;

select * from runtests('tests'::name, '^test_b5_14_');
