-- b1_10 — VARELO, vague 3 : le point du matin du groupe (migration b1_07_point_du_matin, après b1_04 à b1_06)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5), b1_00_aides.sql,
-- b1_08_contrats.sql (aide tests.b1_contrat) et b1_09_reciproques.sql (aide tests.b1_preparer_reciproques).
-- runtests() annule tout ce que le test écrit. Motif : ^test_b1_10_

-- Le groupe des réciproques (A↔B en écart de 500, C→A non reconnu), plus : un plafond dépassé chez un client
-- ordinaire de A, une balance fournisseurs de C vieille de 20 jours, un contrat de A à dénoncer dans 5 jours
-- et un contrat de B à dénoncer dans 20 jours.
create or replace function tests.b1_preparer_matin() returns jsonb
language plpgsql as $$
declare
  b jsonb := tests.b1_preparer_reciproques();
  v_client uuid := (b ->> 'client')::uuid;
  g uuid := (b ->> 'gerant')::uuid;
  v_c100 uuid;
  c_a uuid; c_b uuid;
begin
  select c.objet_id into v_c100 from public.grp_ref_codes c
   where c.client_id = v_client and c.entite_id = (b ->> 'soc_a')::uuid and c.nature = 'client' and c.code_local = 'C100';
  perform tests.endosser(g, 'b1-gerant@essai.invalid');
  perform public.grp_regler_plafond(v_c100, 1000, null, 'essai du point du matin');
  perform public.grp_deposer_encours(v_client, (b ->> 'soc_c')::uuid, 'fournisseur', current_date - 20,
    jsonb_build_array(jsonb_build_object('code', 'FX9', 'total', '10')), 'C fournisseurs, ancienne');
  perform tests.redevenir_admin();
  c_a := tests.b1_contrat(v_client, (b ->> 'soc_a')::uuid, jsonb_build_object('tiers', 'Loueur de chariots', 'intitule', 'Location de chariots',
           'date_echeance', current_date + 15, 'preavis_valeur', 10, 'preavis_unite', 'jours', 'montant_annuel', '7800'), g, 'b1-gerant@essai.invalid');
  c_b := tests.b1_contrat(v_client, (b ->> 'soc_b')::uuid, jsonb_build_object('tiers', 'Assureur', 'intitule', 'Flotte automobile',
           'date_echeance', current_date + 50, 'preavis_valeur', 1, 'preavis_unite', 'mois'), g, 'b1-gerant@essai.invalid');
  return b || jsonb_build_object('c100', v_c100, 'contrat_a', c_a, 'contrat_b', c_b);
end $$;

-- ---------------------------------------------------------------------------
create or replace function tests.test_b1_10_ce_matin() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid;
  m jsonb;
  t text;
begin
  b := tests.b1_preparer_matin();
  v_client := (b ->> 'client')::uuid;

  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  m := public.grp_ce_matin(v_client);
  perform tests.redevenir_admin();
  return next is(jsonb_array_length(m -> 'contrats'), 2, 'deux contrats à dénoncer dans les 30 jours');
  return next ok((m -> 'contrats' -> 0 ->> 'texte') like 'Avant le % : dénoncer « Location de chariots » (Loueur de chariots, Essai B1 Distribution) — 7 800 € par an'
                 and (m -> 'contrats' -> 0 ->> 'gravite') = 'critique', format('le plus pressé d''abord, en critique : %s', m -> 'contrats' -> 0 ->> 'texte'));
  return next is(m -> 'contrats' -> 1 ->> 'gravite', 'attention', 'le second, à 20 jours, en attention');
  select string_agg(x ->> 'texte', ' | ') into t from jsonb_array_elements(m -> 'encours') x;
  return next ok(t like '%Client ordinaire : 1 234 € d''encours pour le groupe, plafond 1 000 €%', format('le client au-dessus de son plafond : %s', t));
  return next ok(t like '%La balance fournisseurs de Essai B1 Services date du % (20 jours) : à redéposer%', 'la balance de 20 jours est signalée');
  select string_agg(x ->> 'texte', ' | ') into t from jsonb_array_elements(m -> 'reciproques') x;
  return next ok(t like '%Essai B1 Distribution → Essai B1 Logistique : écart de 500 € à expliquer%', format('l''écart intragroupe : %s', t));
  return next ok(t like '%Essai B1 Services dit que Essai B1 Distribution lui doit 700 € ; Essai B1 Distribution ne reconnaît rien%', 'la dette non reconnue');
  return next is(jsonb_array_length(m -> 'reciproques'), 2, 'deux réciproques à traiter (la paire qui concorde n''y est pas)');

  -- au périmètre de la personne : le collaborateur de la seule société A ne voit pas le contrat de B
  perform tests.endosser((b ->> 'partiel')::uuid, 'b1-collaborateur-a@essai.invalid');
  m := public.grp_ce_matin(v_client);
  perform tests.redevenir_admin();
  return next ok(jsonb_array_length(m -> 'contrats') = 1 and (m -> 'contrats' -> 0 ->> 'texte') like '%Location de chariots%', 'périmètre partiel : seul le contrat de sa société');
  -- une autre organisation
  perform tests.endosser((b ->> 'etranger')::uuid, 'a5-client-b@essai.invalid');
  return next throws_ok(format('select public.grp_ce_matin(%L)', v_client), 'P0002', null, 'le point d''un autre groupe : introuvable (P0002)');
  perform tests.redevenir_admin();
end $f$;

-- ---------------------------------------------------------------------------
create or replace function tests.test_b1_10_depot() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid;
  v_matin timestamptz := (current_date + time '06:00') at time zone 'Europe/Paris';
  v_df uuid; v_dj uuid;
  n integer;
begin
  b := tests.b1_preparer_matin();
  v_client := (b ->> 'client')::uuid;
  select id into v_df from public.equipes where client_id = v_client and cle = 'direction_financiere';
  select id into v_dj from public.equipes where client_id = v_client and cle = 'direction_juridique';

  n := private.grp_deposer_points((current_date + time '04:00') at time zone 'Europe/Paris');
  return next is(tests.compter('public', 'points_sections', format('client_id = %L and module = ''varelo''', v_client)), 0::bigint, 'avant 5 h, rien n''est déposé');
  n := private.grp_deposer_points(v_matin);
  return next cmp_ok(n, '>=', 1, 'à 6 h, le point du groupe est déposé');
  return next is(tests.compter('public', 'points_sections', format('client_id = %L and module = ''varelo'' and role = ''gerant'' and jour = current_date', v_client)), 3::bigint,
                 'au gérant : contrats, encours, réciproques');
  return next is(tests.compter('public', 'points_sections', format('client_id = %L and module = ''varelo'' and equipe_id = %L', v_client, v_df)), 3::bigint,
                 'à la direction financière : les trois');
  return next is(tests.compter('public', 'points_sections', format('client_id = %L and module = ''varelo'' and equipe_id = %L and titre = ''Contrats à dénoncer''', v_client, v_dj)), 1::bigint,
                 'à la direction juridique : les contrats seulement');
  return next is(tests.compter('public', 'points_sections', format('client_id = %L and module = ''varelo'' and equipe_id = %L', v_client, v_dj)), 1::bigint,
                 'rien d''autre à la direction juridique');
  return next is(tests.compter('public', 'points_sections', format('client_id = %L and module = ''varelo'' and titre = ''Contrats à dénoncer'' and nb_items = 2 and not sante', v_client)), 3::bigint,
                 'chaque section des contrats porte deux lignes, sans donnée de santé');
  return next is(tests.compter('public', 'battements', format('client_id = %L and module = ''varelo_matin''', v_client)), 1::bigint, 'le battement varelo_matin bat');
  -- rejoué : rien en double
  perform private.grp_deposer_points(v_matin);
  return next is(tests.compter('public', 'points_sections', format('client_id = %L and module = ''varelo''', v_client)), 7::bigint, 'rejoué : toujours sept sections');
  -- les deux contrats dénoncés : leur section est retirée partout
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  perform public.grp_denoncer_contrat((b ->> 'contrat_a')::uuid, current_date, null);
  perform public.grp_denoncer_contrat((b ->> 'contrat_b')::uuid, current_date, null);
  perform tests.redevenir_admin();
  perform private.grp_deposer_points(v_matin);
  return next is(tests.compter('public', 'points_sections', format('client_id = %L and module = ''varelo'' and titre = ''Contrats à dénoncer''', v_client)), 0::bigint,
                 'plus rien à dénoncer : la section des contrats est retirée');
  return next is(tests.compter('public', 'points_sections', format('client_id = %L and module = ''varelo''', v_client)), 4::bigint, 'restent encours et réciproques (gérant, DF)');
end $f$;
