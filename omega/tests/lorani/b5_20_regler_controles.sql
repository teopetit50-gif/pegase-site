-- Tests B5 — LORANI : régler les contrôles d'un projet, tolérances et familles (b5_31).
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c ; aides tests.b5_* de b5_01.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_b5_20_regler_controles() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid; v_daf uuid;
  v_projet uuid; v_pc2 uuid; v_pc5 uuid; v_plu uuid; v_cctp uuid; v_dpgf uuid; v_c uuid; r jsonb;
begin
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid; v_referent := (jeu ->> 'referent')::uuid; v_daf := (jeu ->> 'daf')::uuid;
  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, nature)
  values (v_client, 'Maison Roussel (test b5_20)', '44000', 'Nantes', '44109', 'maison_individuelle') returning id into v_projet;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values
    (v_client, v_projet, v_referent, 'chef_projet'), (v_client, v_projet, v_daf, 'dessinateur');
  insert into public.acces_objets (client_id, objet_type, objet_id, user_id, niveau) values
    (v_client, 'lorani_projet', v_projet::text, v_referent, 'ecriture'), (v_client, 'lorani_projet', v_projet::text, v_daf, 'ecriture')
  on conflict do nothing;
  perform tests.b5_admin();
  v_pc2 := tests.b5_lire(v_referent, v_projet, 'PC2-b5_20.pdf', 'lorani_planche', jsonb_build_array(
    jsonb_build_object('champ', 'mesure.hauteur_faitage_m.projet', 'valeur', '9.85', 'texte', 'H = 9,85 m')));
  v_pc5 := tests.b5_lire(v_referent, v_projet, 'PC5-b5_20.pdf', 'lorani_planche', jsonb_build_array(
    jsonb_build_object('champ', 'mesure.hauteur_faitage_m.projet', 'valeur', '10.20', 'texte', '10,20')));
  v_plu := tests.b5_lire(v_referent, v_projet, 'PLU-b5_20.pdf', 'lorani_plu_reglement', jsonb_build_array(
    jsonb_build_object('champ', 'regle.hauteur_faitage_m.max', 'valeur', '10', 'texte', '10 mètres'),
    jsonb_build_object('champ', 'regle.hauteur_faitage_m.article', 'valeur', 'UB 10', 'texte', 'Article UB 10')));
  v_cctp := tests.b5_lire(v_referent, v_projet, 'CCTP-b5_20.pdf', 'lorani_cctp', jsonb_build_array(
    jsonb_build_object('champ', 'poste.2_1', 'valeur', 'Terrassements', 'texte', '2.1 Terrassements'), jsonb_build_object('champ', 'poste.2_2', 'valeur', 'Fondations', 'texte', '2.2 Fondations')));
  v_dpgf := tests.b5_lire(v_referent, v_projet, 'DPGF-b5_20.pdf', 'lorani_dpgf', jsonb_build_array(
    jsonb_build_object('champ', 'poste.2_1', 'valeur', '120', 'texte', '2.1 Terrassements 120')));
  r := private.lorani_lectures_passage();

  perform tests.b5_endosser(v_referent);
  insert into public.lorani_controles (client_id, projet_id, intitule, indice) values (v_client, v_projet, 'Dépôt du PC', 'A') returning id into v_c;
  insert into public.lorani_controle_pieces (client_id, projet_id, controle_id, piece_id, role, reference) values
    (v_client, v_projet, v_c, v_pc2, 'planche', 'PC2'), (v_client, v_projet, v_c, v_pc5, 'planche', 'PC5'), (v_client, v_projet, v_c, v_plu, 'plu', 'PLU'),
    (v_client, v_projet, v_c, v_cctp, 'cctp', 'CCTP'), (v_client, v_projet, v_c, v_dpgf, 'dpgf', 'DPGF');
  r := public.lorani_lancer_controle(v_c);
  perform tests.b5_admin();
  return next ok((select count(*) filter (where signature = 'incoherence|hauteur_faitage_m|projet') = 1
                         and count(*) filter (where signature = 'plu|hauteur_faitage_m|projet|max') = 1
                         and count(*) filter (where signature = 'cctp_dpgf|cctp|2_2') = 1
                  from public.lorani_constats where controle_id = v_c and statut = 'ouvert'),
                 '0. réglages du code : faîtage incohérent (35 cm), au-delà du PLU, poste 2.2 non chiffré');

  -- ── 1. Qui règle, et ce qui est refusé ──
  perform tests.b5_endosser(v_daf);
  return next throws_ok(format('select public.lorani_regler_controles(%L, %L, %L)', v_projet, '{}', '{}'), '42501', null, '1. un dessinateur ne règle pas les contrôles');
  perform tests.b5_endosser(v_referent);
  return next throws_ok(format('update public.lorani_projets set controle_familles_coupees = %L where id = %L', '{plu}', v_projet), '42501', null, '1. pas de réglage par un UPDATE direct');
  return next throws_ok(format('select public.lorani_regler_controles(%L, %L, %L)', v_projet, '{"hauteur_inconnue_m": 1}', '{}'), '22023', null, '1. grandeur inconnue refusée');
  return next throws_ok(format('select public.lorani_regler_controles(%L, %L, %L)', v_projet, '{"hauteur_faitage_m": 2}', '{}'), '22023', null, '1. tolérance hors bornes refusée (2 m sur un faîtage)');
  return next throws_ok(format('select public.lorani_regler_controles(%L, %L, %L)', v_projet, '{}', '{incoherence,plu,cctp_dpgf,metre_dpgf,re2020,accessibilite,securite_incendie}'), '22023', null,
                        '1. couper toutes les familles est refusé');

  -- ── 2. Le chef de projet règle : 40 cm sur le faîtage, CCTP/DPGF coupé ──
  r := public.lorani_regler_controles(v_projet, '{"hauteur_faitage_m": 0.4}', array['cctp_dpgf']);
  r := public.lorani_lancer_controle(v_c);
  perform tests.b5_admin();
  return next ok((select statut = 'corrige' from public.lorani_constats where controle_id = v_c and signature = 'incoherence|hauteur_faitage_m|projet'),
                 '2. 35 cm d''écart sous 40 cm tolérés : l''incohérence ne se retrouve plus');
  return next ok((select statut = 'ouvert' from public.lorani_constats where controle_id = v_c and signature = 'plu|hauteur_faitage_m|projet|max'),
                 '2. le dépassement du PLU (10,20 m pour 10 m) reste : la marge est d''un dixième de la tolérance');
  return next ok((select statut = 'ecarte' and motif like 'Famille de contrôle coupée%' from public.lorani_constats where controle_id = v_c and signature = 'cctp_dpgf|cctp|2_2'),
                 '2. le constat CCTP/DPGF ouvert est écarté avec le réglage pour motif, pas « corrigé »');
  return next ok(exists (select 1 from public.journal_opposable where client_id = v_client and action = 'lorani.controles_regles' and objet_id = v_projet::text),
                 '2. journal : lorani.controles_regles');

  -- ── 3. Droits ──
  return next ok(not has_function_privilege('anon', 'public.lorani_regler_controles(uuid, jsonb, text[])', 'EXECUTE')
                 and has_function_privilege('authenticated', 'public.lorani_regler_controles(uuid, jsonb, text[])', 'EXECUTE'),
                 '3. la porte est aux membres, pas à anon');
end $f$;

select * from runtests('tests'::name, '^test_b5_20_');
