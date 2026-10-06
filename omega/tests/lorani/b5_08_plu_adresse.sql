-- Tests B5 — LORANI : le PLU d'un projet trouvé depuis son adresse (b5_17), Géoportail de l'urbanisme.
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c, comptes gerant / referent.
-- Les aides tests.b5_* sont celles de omega/tests/lorani/b5_01_parcours_permis.sql (à poser avant).
-- Aucun appel réseau n'aboutit ici : runtests() annule la transaction, donc les demandes mises en file par pg_net ne
-- partent pas ; les réponses des services sont jouées par private.lorani_plu_poser avec des extraits des vraies réponses
-- (géocodage Géoplateforme et API Carto GPU, relevées le 06/10/2026 pour la rue des Hauts-Pavés à Nantes).

create or replace function tests.test_b5_08_plu_adresse() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid;
  v_projet uuid; v_sans uuid; v_rnu uuid; r jsonb;
  l public.lorani_plu;
  v_geo text := '{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Point","coordinates":[-1.567262,47.225675]},"properties":{"label":"Rue des Hauts Pavés 44000 Nantes","score":0.8219,"citycode":"44109","type":"street"}}]}';
  v_zone text := '{"type":"FeatureCollection","features":[{"type":"Feature","geometry":null,"properties":{"partition":"DU_244400404","libelle":"UMa","libelong":"Secteur de développement des centralités actuelles ou en devenir","typezone":"U","nomfic":"244400404_reglement_20260518.pdf","urlfic":"https://metropole.nantes.fr/files/live/sites/metropolenantesfr/files/plum_appro/4_R%c3%a8glement/4-1_R%c3%a8glement_%c3%a9crit/4-1-1_R%c3%a8glement/R%c3%a8glement.pdf","idurba":"244400404_PLUI_20260518","datvalid":""}}]}';
  v_doc text := '{"type":"FeatureCollection","features":[{"type":"Feature","geometry":null,"properties":{"grid_title":"PLUI NANTES METROPOLE","name":"244400404_PLUi_20260518","partition":"DU_244400404","du_type":"PLUi"}}]}';
  v_psc text := '{"type":"FeatureCollection","features":[{"type":"Feature","geometry":null,"properties":{"libelle":"Orientation d''Aménagement et de Programmation  Loire (OAP)","typepsc":"18","stypepsc":"03"}},{"type":"Feature","geometry":null,"properties":{"libelle":"Orientation d''Aménagement et de Programmation  Loire (OAP)","typepsc":"18","stypepsc":"03"}}]}';
begin
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid; v_referent := (jeu ->> 'referent')::uuid;

  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, adresse, code_postal, commune, code_insee, parcelles, nature)
  values (v_client, 'Maison Lemoine (test b5_08)', '12 rue des Hauts-Pavés', '44000', 'Nantes', '44109', array['AB 123'], 'maison_individuelle') returning id into v_projet;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_projet, v_referent, 'chef_projet');
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, parcelles, nature)
  values (v_client, 'Façade Mercière (test b5_08)', '69002', 'Lyon 2e', '69382', array['AC 77'], 'tertiaire') returning id into v_sans;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_sans, v_referent, 'chef_projet');
  insert into public.lorani_projets (client_id, nom, adresse, code_postal, commune, code_insee, nature)
  values (v_client, 'Grange Ruaux (test b5_08)', 'Le Bourg', '23200', 'Saint-Pardoux-le-Neuf', '23230', 'maison_individuelle') returning id into v_rnu;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_rnu, v_referent, 'chef_projet');
  perform tests.b5_admin();

  -- ── 1. Le chef de projet lance la recherche : l'adresse part au géocodage ──
  perform tests.b5_endosser(v_referent);
  r := public.lorani_chercher_plu(v_projet);
  perform tests.b5_admin();
  select * into l from public.lorani_plu where projet_id = v_projet;
  return next ok(l.statut = 'geocodage' and l.methode = 'adresse' and l.req_geo is not null and l.requete = '12 rue des Hauts-Pavés 44000 Nantes' and l.demande_par = v_referent,
                 '1. recherche lancée : géocodage de « 12 rue des Hauts-Pavés 44000 Nantes », demande en file (pg_net)');
  return next ok(r ->> 'statut' = 'geocodage' and not (r ? 'geom'), '1. … la porte rend la ligne, sans géométrie');

  -- ── 2. Le point trouvé part au zonage ──
  r := private.lorani_plu_poser(v_projet, 'geo', 200, v_geo);
  select * into l from public.lorani_plu where projet_id = v_projet;
  return next ok(l.statut = 'zonage' and l.lon = -1.567262 and l.lat = 47.225675 and l.point_libelle = 'Rue des Hauts Pavés 44000 Nantes' and l.point_score = 0.822
                 and l.req_zone is not null and l.req_doc is not null and l.req_psc is not null,
                 '2. point trouvé (Rue des Hauts Pavés, score 0,822) : zone, document et prescriptions demandés ensemble');

  -- ── 3. Zone et document reviennent ; les prescriptions en échec n'empêchent rien ──
  perform private.lorani_plu_poser(v_projet, 'zone', 200, v_zone);
  perform private.lorani_plu_poser(v_projet, 'doc', 200, v_doc);
  return next is((select statut from public.lorani_plu where projet_id = v_projet), 'zonage', '3. tant que les prescriptions n''ont pas répondu, on attend');
  perform private.lorani_plu_poser(v_projet, 'psc', 504, null);
  select * into l from public.lorani_plu where projet_id = v_projet;
  return next ok(l.statut = 'trouve' and l.zone = 'UMa' and l.zones -> 0 ->> 'typezone' = 'U' and l.document ->> 'du_type' = 'PLUi'
                 and l.document ->> 'titre' = 'PLUI NANTES METROPOLE' and l.reglement_url like 'https://metropole.nantes.fr/%R%c3%a8glement.pdf' and l.trouve_le is not null,
                 '3. trouvé : zone UMa (U) du PLUi Nantes Métropole, lien du règlement');
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:plu:%s', v_projet)
                         and titre = '« Maison Lemoine (test b5_08) » : zone UMa du PLUI NANTES METROPOLE, règlement en ligne.'),
                 '3. … alerte au chef de projet');
  return next ok(exists (select 1 from public.journal_opposable where client_id = v_client and action = 'lorani.plu_trouve' and objet_id = v_projet::text),
                 '3. … journal : lorani.plu_trouve');

  -- ── 4. Relancée, les prescriptions arrivent (dédoublonnées) ──
  perform tests.b5_endosser(v_referent);
  perform public.lorani_chercher_plu(v_projet);
  perform tests.b5_admin();
  return next ok((select statut = 'geocodage' and zone is null and jsonb_array_length(zones) = 0 from public.lorani_plu where projet_id = v_projet),
                 '4. relancée, la recherche repart de zéro');
  perform private.lorani_plu_poser(v_projet, 'geo', 200, v_geo);
  perform private.lorani_plu_poser(v_projet, 'zone', 200, v_zone);
  perform private.lorani_plu_poser(v_projet, 'doc', 200, v_doc);
  perform private.lorani_plu_poser(v_projet, 'psc', 200, v_psc);
  select * into l from public.lorani_plu where projet_id = v_projet;
  return next ok(l.statut = 'trouve' and jsonb_array_length(l.prescriptions) = 1 and l.prescriptions -> 0 ->> 'typepsc' = '18',
                 '4. … une prescription (OAP Loire), dédoublonnée');

  -- ── 5. Pas d'adresse : la parcelle, avec l'arrondissement de Lyon ──
  perform tests.b5_endosser(v_referent);
  r := public.lorani_chercher_plu(v_sans);
  perform tests.b5_admin();
  select * into l from public.lorani_plu where projet_id = v_sans;
  return next ok(l.statut = 'geocodage' and l.methode = 'parcelle' and l.requete = '69382 AC 77', '5. sans adresse : la parcelle AC 77 est cherchée au cadastre');
  return next is(private.lorani_cadastre_params('69382', 'AC 77'), '{"code_insee": "69123", "code_arr": "382", "section": "AC", "numero": "0077"}'::jsonb,
                 '5. … Lyon 2e : commune 69123, arrondissement 382, numéro sur quatre chiffres');
  perform private.lorani_plu_poser(v_sans, 'geo', 200, '{"type":"FeatureCollection","features":[]}');
  return next ok((select statut = 'introuvable' and erreur = 'Parcelle 69382 AC 77 introuvable au cadastre.' from public.lorani_plu where projet_id = v_sans),
                 '5. … parcelle absente du cadastre : introuvable, raison dite');

  -- ── 6. Une commune au RNU : pas de zone, et le Géoportail le dit ──
  perform tests.b5_endosser(v_referent);
  perform public.lorani_chercher_plu(v_rnu);
  perform tests.b5_admin();
  perform private.lorani_plu_poser(v_rnu, 'geo', 200, '{"features":[{"geometry":{"type":"Point","coordinates":[2.21,45.95]},"properties":{"label":"Le Bourg 23200 Saint-Pardoux-le-Neuf","score":0.9,"citycode":"23230","type":"street"}}]}');
  perform private.lorani_plu_poser(v_rnu, 'zone', 200, '{"type":"FeatureCollection","features":[]}');
  perform private.lorani_plu_poser(v_rnu, 'doc', 200, '{"type":"FeatureCollection","features":[]}');
  perform private.lorani_plu_poser(v_rnu, 'psc', 200, '{"type":"FeatureCollection","features":[]}');
  return next ok((select statut = 'zonage' and req_rnu is not null from public.lorani_plu where projet_id = v_rnu), '6. aucune zone : la commune est interrogée (RNU ?)');
  perform private.lorani_plu_poser(v_rnu, 'rnu', 200, '{"features":[{"properties":{"insee":"23230","name":"SAINT-PARDOUX-LE-NEUF","is_rnu":true}}]}');
  return next ok((select statut = 'introuvable' and rnu and erreur like 'Commune au règlement national d''urbanisme (RNU)%' from public.lorani_plu where projet_id = v_rnu),
                 '6. … commune au RNU : pas de PLU, les articles R111-1 et suivants s''appliquent');

  -- ── 7. Un service qui ne répond pas ──
  perform tests.b5_endosser(v_referent);
  perform public.lorani_chercher_plu(v_projet);
  perform tests.b5_admin();
  perform private.lorani_plu_poser(v_projet, 'geo', 503, 'Service Unavailable');
  return next ok((select statut = 'erreur' and erreur = 'Le service de géocodage n''a pas répondu (HTTP 503).' from public.lorani_plu where projet_id = v_projet),
                 '7. géocodage en panne : erreur, raison dite');

  -- ── 8. Droits ──
  perform tests.b5_endosser(v_referent);
  return next ok((select count(*) = 3 from public.lorani_plu where projet_id in (v_projet, v_sans, v_rnu)), '8. le chef de projet lit le PLU de ses projets');
  r := public.lorani_suivre_plu(v_projet);
  return next ok(r ->> 'statut' = 'erreur', '8. … et le suit par la porte');
  perform tests.b5_admin();
  return next ok(has_table_privilege('authenticated', 'public.lorani_plu', 'SELECT') and not has_table_privilege('authenticated', 'public.lorani_plu', 'INSERT')
                 and not has_table_privilege('authenticated', 'public.lorani_plu', 'UPDATE') and not has_table_privilege('anon', 'public.lorani_plu', 'SELECT'),
                 '8. la ligne s''écrit par le socle seul ; anon ne lit rien');
end $f$;

select * from runtests('tests'::name, '^test_b5_08_');
