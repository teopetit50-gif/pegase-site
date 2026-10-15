-- Tests B5 — LORANI : choisir qui décide des constats d'un contrôle (b5_30).
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c ; aides tests.b5_* de b5_01.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_b5_19_choisir_decideur() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid; v_daf uuid; v_daf2 uuid;
  v_projet uuid; v_pc2 uuid; v_pc5 uuid; v_c uuid; v_k uuid; r jsonb;
begin
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid; v_referent := (jeu ->> 'referent')::uuid;
  v_daf := (jeu ->> 'daf')::uuid; v_daf2 := (jeu ->> 'daf2')::uuid;
  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, nature)
  values (v_client, 'Maison Guérin (test b5_19)', '44000', 'Nantes', '44109', 'maison_individuelle') returning id into v_projet;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values
    (v_client, v_projet, v_referent, 'chef_projet'), (v_client, v_projet, v_daf, 'dessinateur'), (v_client, v_projet, v_daf2, 'associe');
  insert into public.acces_objets (client_id, objet_type, objet_id, user_id, niveau) values
    (v_client, 'lorani_projet', v_projet::text, v_referent, 'ecriture'), (v_client, 'lorani_projet', v_projet::text, v_daf, 'ecriture'),
    (v_client, 'lorani_projet', v_projet::text, v_daf2, 'ecriture')
  on conflict do nothing;
  perform tests.b5_admin();
  v_pc2 := tests.b5_lire(v_referent, v_projet, 'PC2-b5_19.pdf', 'lorani_planche', jsonb_build_array(
    jsonb_build_object('champ', 'mesure.hauteur_faitage_m.projet', 'valeur', '7.50', 'texte', '+7,50')));
  v_pc5 := tests.b5_lire(v_referent, v_projet, 'PC5-b5_19.pdf', 'lorani_planche', jsonb_build_array(
    jsonb_build_object('champ', 'mesure.hauteur_faitage_m.projet', 'valeur', '7.90', 'texte', '+7,90')));
  r := private.lorani_lectures_passage();

  perform tests.b5_endosser(v_referent);
  insert into public.lorani_controles (client_id, projet_id, intitule, indice) values (v_client, v_projet, 'Dépôt du PC', 'A') returning id into v_c;
  insert into public.lorani_controle_pieces (client_id, projet_id, controle_id, piece_id, role, reference) values
    (v_client, v_projet, v_c, v_pc2, 'planche', 'PC2'), (v_client, v_projet, v_c, v_pc5, 'planche', 'PC5');
  r := public.lorani_lancer_controle(v_c);
  perform tests.b5_admin();
  select id into v_k from public.lorani_constats where controle_id = v_c and signature = 'incoherence|hauteur_faitage_m|projet';
  return next ok(v_k is not null, '0. le contrôle a relevé le faîtage 7,50 m contre 7,90 m');

  -- ── 1. Qui choisit, et qui peut être choisi ──
  perform tests.b5_endosser(v_daf);
  return next throws_ok(format('select public.lorani_choisir_decideur(%L, %L)', v_c, v_daf), '42501', null, '1. un dessinateur ne choisit pas le décideur');
  perform tests.b5_endosser(v_referent);
  return next throws_ok(format('select public.lorani_choisir_decideur(%L, %L)', v_c, gen_random_uuid()), '22023', null, '1. une personne hors du projet ne peut être choisie');
  return next throws_ok(format('update public.lorani_controles set decideur = %L where id = %L', v_daf2, v_c), '42501', null, '1. le décideur ne se change pas par un UPDATE direct');
  r := public.lorani_choisir_decideur(v_c, v_daf2);
  perform tests.b5_admin();
  return next ok((select decideur = v_daf2 from public.lorani_controles where id = v_c), '1. le chef de projet nomme l''associé : ' || r::text);

  -- ── 2. Seul le décideur (ou le gérant) tranche ──
  perform tests.b5_endosser(v_daf);
  return next throws_ok(format('update public.lorani_constats set statut = %L, motif = %L where id = %L', 'ecarte', 'Faîtage à reprendre', v_k), '42501', null,
                        '2. le dessinateur ne tranche pas un constat d''un contrôle qui a un décideur');
  perform tests.b5_endosser(v_referent);
  return next throws_ok(format('update public.lorani_constats set statut = %L, motif = %L where id = %L', 'accepte', 'Faîtage justifié', v_k), '42501', null, '2. le chef de projet non plus');
  perform tests.b5_endosser(v_daf2);
  update public.lorani_constats set statut = 'accepte', motif = 'Faîtage justifié par la coupe PC5' where id = v_k;
  perform tests.b5_admin();
  return next ok((select statut = 'accepte' and decide_par = v_daf2 from public.lorani_constats where id = v_k), '2. l''associé choisi tranche ; la décision porte son nom');
  perform tests.b5_endosser(v_gerant);
  update public.lorani_constats set statut = 'ecarte', motif = 'Coupe PC5 périmée' where id = v_k;
  perform tests.b5_admin();
  return next ok((select statut = 'ecarte' and decide_par = v_gerant from public.lorani_constats where id = v_k), '2. le gérant garde la main');

  -- ── 3. Rendre la décision à tous ──
  perform tests.b5_endosser(v_referent);
  r := public.lorani_choisir_decideur(v_c, null);
  perform tests.b5_endosser(v_daf);
  update public.lorani_constats set statut = 'ouvert', motif = null where id = v_k;
  perform tests.b5_admin();
  return next ok((select statut = 'ouvert' and decide_par = v_daf from public.lorani_constats where id = v_k)
                 and (select decideur is null from public.lorani_controles where id = v_c),
                 '3. sans décideur, tout membre qui écrit tranche à nouveau');
  return next is((select count(*)::int from public.journal_opposable where client_id = v_client and action = 'lorani.decideur_choisi' and objet_id = v_projet::text), 2,
                 '3. journal : deux lorani.decideur_choisi (l''associé, puis personne)');

  -- ── 4. Droits ──
  return next ok(not has_function_privilege('anon', 'public.lorani_choisir_decideur(uuid, uuid)', 'EXECUTE')
                 and has_function_privilege('authenticated', 'public.lorani_choisir_decideur(uuid, uuid)', 'EXECUTE'),
                 '4. la porte est aux membres, pas à anon');
end $f$;

select * from runtests('tests'::name, '^test_b5_19_');
