-- Tests B5 — LORANI : la révision des prix par les index BT et TP (b5_34).
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c ; aides tests.b5_* de b5_01.
-- runtests() annule tout ce que le test écrit. Aucun appel réseau : la réponse de l'INSEE est posée telle qu'elle
-- arrive (SDMX-ML, extrait réel du BT01 relevé le 18/10/2026).

create or replace function tests.test_b5_23_revision_bt() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid;
  v_projet uuid; v_lot uuid; v_marche uuid; v_s2 uuid; v_s3 uuid; x jsonb; n integer;
  v_xml text := '<?xml version=''1.0'' encoding=''UTF-8''?><message:StructureSpecificData xmlns:message="http://www.sdmx.org/resources/sdmxml/schemas/v2_1/message"><message:DataSet>'
    || '<Series IDBANK="001710986" FREQ="M" TITLE_FR="Index du bâtiment - BT01 - Tous corps d''état - Base 2010">'
    || '<Obs TIME_PERIOD="2026-08" OBS_VALUE="139.4" OBS_STATUS="A" OBS_QUAL="DEF" OBS_TYPE="A"/>'
    || '<Obs TIME_PERIOD="2026-07" OBS_VALUE="138.9" OBS_STATUS="A" OBS_QUAL="DEF" OBS_TYPE="A" DATE_JO="2026-09-16"/>'
    || '<Obs TIME_PERIOD="2026-06" OBS_VALUE="138.3" OBS_STATUS="A" OBS_QUAL="DEF" OBS_TYPE="A" DATE_JO="2026-08-15"/>'
    || '<Obs TIME_PERIOD="2026-01" OBS_VALUE="134.7" OBS_STATUS="A" OBS_QUAL="DEF" OBS_TYPE="A" DATE_JO="2026-03-17"/>'
    || '</Series></message:DataSet></message:StructureSpecificData>';
begin
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid; v_referent := (jeu ->> 'referent')::uuid;
  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, nature)
  values (v_client, 'Immeuble Gloriette (test b5_23)', '44000', 'Nantes', '44109', 'logement_collectif') returning id into v_projet;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_projet, v_referent, 'chef_projet');
  insert into public.lorani_lots (client_id, projet_id, numero, intitule) values (v_client, v_projet, '02', 'Gros œuvre') returning id into v_lot;
  return next throws_ok(format('insert into public.lorani_marches (client_id, projet_id, lot_id, titulaire, montant_ht, revision_idbank) values (%L, %L, %L, ''X'', 1000, ''001710986'')', v_client, v_projet, v_lot),
                        '23514', null, '0. un marché révisable dit son mois zéro');
  insert into public.lorani_marches (client_id, projet_id, lot_id, titulaire, montant_ht, revision_idbank, revision_mois_zero)
  values (v_client, v_projet, v_lot, 'Bâti Ouest SAS', 100000, '001710986', '2026-01-01') returning id into v_marche;

  -- ── 1. Les situations, avant que l'index soit relevé ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_situations (client_id, projet_id, marche_id, numero, mois, cumul_ht, recue_le) values (v_client, v_projet, v_marche, 1, '2026-03-01', 20000, current_date - 30);
  update public.lorani_situations set statut = 'visee' where marche_id = v_marche and numero = 1;
  insert into public.lorani_situations (client_id, projet_id, marche_id, numero, mois, cumul_ht, recue_le)
  values (v_client, v_projet, v_marche, 2, '2026-06-01', 30000, current_date - 10) returning id into v_s2;
  insert into public.lorani_situations (client_id, projet_id, marche_id, numero, mois, cumul_ht, recue_le)
  values (v_client, v_projet, v_marche, 3, '2026-12-01', 45000, current_date) returning id into v_s3;
  perform tests.b5_admin();
  select revision into x from public.lorani_situations where id = v_s2;
  return next ok(x ->> 'index' = 'BT01' and x ? 'manque' and (x ->> 'montant_periode')::numeric = 10000,
                 '1. sans index relevé : la révision attend, le montant de la période est connu (10 000 €) : ' || x::text);

  -- ── 2. La réponse de l'INSEE arrive ──
  n := private.lorani_index_poser('001710986', 200, v_xml);
  return next is(n, 4, '2. quatre mois du BT01 lus dans la réponse SDMX');
  return next ok((select valeur = 134.7 and qualite = 'DEF' from public.lorani_ref_index where idbank = '001710986' and mois = '2026-01-01')
                 and (select releve_le is not null and erreur is null from public.lorani_ref_index_series where idbank = '001710986'),
                 '2. janvier 2026 : 134,7, définitif ; la série est relevée');
  select revision into x from public.lorani_situations where id = v_s2;
  return next ok((x ->> 'coefficient')::numeric = 1.0227 and (x ->> 'revision_ht')::numeric = 227 and not (x ->> 'provisoire')::boolean,
                 '2. juin : C = 0,15 + 0,85 × 138,3 / 134,7 = 1,0227 ; 227 € de révision sur 10 000 € : ' || x::text);
  select revision into x from public.lorani_situations where id = v_s3;
  return next ok((x ->> 'provisoire')::boolean and x ->> 'mois_index' = '2026-08-01' and (x ->> 'revision_ht')::numeric = 445.50,
                 '2. décembre, pas encore publié : l''index d''août est pris, révision provisoire de 445,50 € : ' || x::text);

  -- ── 3. Une réponse en erreur ne casse rien ; ajouter une série ──
  n := private.lorani_index_poser('001711007', 503, null);
  return next ok(n = 0 and (select erreur = 'INSEE : 503' from public.lorani_ref_index_series where idbank = '001711007'), '3. INSEE en panne : noté, rien de posé');
  perform tests.b5_endosser(v_referent);
  return next throws_ok($$select public.lorani_ajouter_index('BT02', 'BT02')$$, '22023', null, '3. un idbank a neuf chiffres');
  x := public.lorani_ajouter_index('999999999', 'essai');
  perform tests.b5_admin();
  return next ok((select code = 'ESSAI' from public.lorani_ref_index_series where idbank = '999999999'), '3. une série ajoutée, à relever au prochain passage');
end $f$;

select * from runtests('tests'::name, '^test_b5_23_');
