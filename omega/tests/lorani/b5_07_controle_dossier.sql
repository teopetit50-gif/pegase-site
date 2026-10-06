-- Tests B5 — LORANI : le contrôle du dossier (b5_16) — planches croisées entre elles et contre le CCTP, la DPGF et le
-- règlement du PLU ; page, article, correction proposée ; revérification à l'indice suivant ; lancement seul quand
-- toutes les pièces sont lues.
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c, comptes gerant / referent.
-- Les aides tests.b5_* (dont tests.b5_lire, le lecteur joué par ses portes) sont celles de
-- omega/tests/lorani/b5_01_parcours_permis.sql (à poser avant). runtests() annule tout ce que le test écrit.

-- Lire une pièce déjà déposée (pour la mettre dans un contrôle avant sa lecture), comme tests.b5_lire.
create or replace function tests.b5_lire_deposee(p_piece uuid, p_type text, p_valeurs jsonb) returns uuid
language plpgsql as $$
declare
  v_page text := 'PIÈCE DU DOSSIER' || E'\n'; v jsonb; v_vals jsonb := '[]'::jsonb; e jsonb; i integer := 0;
begin
  for e in select * from jsonb_array_elements(p_valeurs) loop
    i := i + 1;
    v_page := v_page || (e ->> 'texte') || E'\n';
    v_vals := v_vals || jsonb_build_object('champ', e ->> 'champ', 'valeur', e -> 'valeur', 'texte', e ->> 'texte', 'page', 1,
      'boite', jsonb_build_object('x', 0.1, 'y', 0.1 + i * 0.05, 'l', 0.4, 'h', 0.02),
      'source', 'ia', 'confiance', 0.97, 'verifiee', true, 'controle', 'citation retrouvée page 1');
  end loop;
  v := jsonb_build_object('statut', 'lue', 'type_piece', p_type, 'confiance_type', 0.98, 'methode', 'natif', 'nb_pages', 1,
    'pages', jsonb_build_array(jsonb_build_object('n', 1, 'methode', 'natif', 'texte', v_page, 'confiance', 0.99, 'largeur', 595, 'hauteur', 842)),
    'valeurs', v_vals);
  perform tests.b5_ouvrier();
  if not public.commencer_lecture(p_piece) then
    raise exception 'tests.b5_lire_deposee : commencer_lecture rend false pour la pièce %', p_piece;
  end if;
  perform public.enregistrer_lecture(p_piece, v, 'lecteur/2026-10-06/essai-b5');
  perform tests.b5_admin();
  return p_piece;
end $$;

create or replace function tests.test_b5_07_controle_dossier() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid;
  v_projet uuid; v_autre uuid; v_pc2 uuid; v_pc5 uuid; v_pc5b uuid; v_plu uuid; v_cctp uuid; v_dpgf uuid; v_etrangere uuid; v_pc6 uuid;
  v_c1 uuid; v_c2 uuid; v_c3 uuid; r jsonb; n integer;
  k public.lorani_constats;
begin
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid; v_referent := (jeu ->> 'referent')::uuid;

  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, parcelles, nature)
  values (v_client, 'Maison Lemoine (test b5_07)', '44000', 'Nantes', '44109', array['AB 12'], 'maison_individuelle') returning id into v_projet;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_projet, v_referent, 'chef_projet');
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, parcelles, nature)
  values (v_client, 'Atelier Ruaux (test b5_07)', '44000', 'Nantes', '44109', array['AB 13'], 'tertiaire') returning id into v_autre;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_autre, v_referent, 'chef_projet');
  perform tests.b5_admin();

  -- ── 0. Les pièces lues, telles que le lecteur les rend (contrat « Le contrôle du dossier ») ──
  v_pc2 := tests.b5_lire(v_referent, v_projet, 'PC2-plan-masse.pdf', 'lorani_planche', jsonb_build_array(
    jsonb_build_object('champ', 'reference', 'valeur', 'PC2', 'texte', 'PC2 — Plan de masse'),
    jsonb_build_object('champ', 'mesure.hauteur_faitage_m.projet', 'valeur', '9.85', 'texte', 'H faîtage = 9,85 m'),
    jsonb_build_object('champ', 'mesure.recul_voie_m.projet', 'valeur', '4.00', 'texte', 'Recul 4,00 m')));
  v_pc5 := tests.b5_lire(v_referent, v_projet, 'PC5-facades.pdf', 'lorani_planche', jsonb_build_array(
    jsonb_build_object('champ', 'reference', 'valeur', 'PC5', 'texte', 'PC5 — Façades'),
    jsonb_build_object('champ', 'mesure.hauteur_faitage_m.projet', 'valeur', '10.20', 'texte', '+10,20'),
    jsonb_build_object('champ', 'mesure.recul_voie_m.projet', 'valeur', '4.02', 'texte', '4,02')));
  v_plu := tests.b5_lire(v_referent, v_projet, 'PLUm-reglement-UB.pdf', 'lorani_plu_reglement', jsonb_build_array(
    jsonb_build_object('champ', 'zone', 'valeur', 'UB', 'texte', 'Zone UB'),
    jsonb_build_object('champ', 'regle.hauteur_faitage_m.max', 'valeur', '10', 'texte', 'La hauteur au faîtage ne peut excéder 10 mètres.'),
    jsonb_build_object('champ', 'regle.hauteur_faitage_m.article', 'valeur', 'UB 10', 'texte', 'Article UB 10'),
    jsonb_build_object('champ', 'regle.recul_voie_m.min', 'valeur', '5', 'texte', 'Recul d''au moins 5 m de l''alignement.'),
    jsonb_build_object('champ', 'regle.recul_voie_m.article', 'valeur', 'UB 6', 'texte', 'Article UB 6')));
  v_cctp := tests.b5_lire(v_referent, v_projet, 'CCTP-lot-02.pdf', 'lorani_cctp', jsonb_build_array(
    jsonb_build_object('champ', 'lot', 'valeur', '02', 'texte', 'Lot 02 — Gros œuvre'),
    jsonb_build_object('champ', 'poste.2_1', 'valeur', 'Terrassements généraux', 'texte', '2.1 Terrassements généraux'),
    jsonb_build_object('champ', 'poste.2_2', 'valeur', 'Fondations superficielles', 'texte', '2.2 Fondations superficielles')));
  v_dpgf := tests.b5_lire(v_referent, v_projet, 'DPGF-lot-02.pdf', 'lorani_dpgf', jsonb_build_array(
    jsonb_build_object('champ', 'lot', 'valeur', '02', 'texte', 'Lot 02'),
    jsonb_build_object('champ', 'poste.2_1', 'valeur', '120', 'texte', '2.1 Terrassements m3 120'),
    jsonb_build_object('champ', 'poste.2_3', 'valeur', '14', 'texte', '2.3 Longrines ml 14')));
  r := private.lorani_lectures_passage();
  return next ok((r ->> 'erreurs')::integer = 0, '0. le passage des lectures prend les pièces du contrôle sans erreur : ' || r::text);
  return next ok(not exists (select 1 from public.lorani_permis_dates_lues where piece_id in (v_pc2, v_pc5, v_plu, v_cctp, v_dpgf)),
                 '0. une planche, un CCTP, une DPGF ou un règlement ne proposent aucune date de permis');

  -- ── 1. Le chef de projet prépare le contrôle et le lance ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_controles (client_id, projet_id, intitule, indice) values (v_client, v_projet, '  Dépôt  du PC ', 'a') returning id into v_c1;
  insert into public.lorani_controle_pieces (client_id, projet_id, controle_id, piece_id, role, reference) values
    (v_client, v_projet, v_c1, v_pc2, 'planche', 'PC2'), (v_client, v_projet, v_c1, v_pc5, 'planche', 'PC5'),
    (v_client, v_projet, v_c1, v_plu, 'plu', 'PLUm UB'), (v_client, v_projet, v_c1, v_cctp, 'cctp', 'CCTP 02'),
    (v_client, v_projet, v_c1, v_dpgf, 'dpgf', 'DPGF 02');
  return next ok((select intitule = 'Dépôt du PC' and indice = 'A' and statut = 'en_lecture' from public.lorani_controles where id = v_c1),
                 '1. le contrôle est préparé : intitulé nettoyé, indice A, « en lecture »');
  r := public.lorani_lancer_controle(v_c1);
  perform tests.b5_admin();
  return next ok((r ->> 'constats')::integer = 5 and (r ->> 'bloquants')::integer = 2, '1. lancé : 5 constats dont 2 bloquants : ' || r::text);
  return next ok((select statut = 'controle' and constats_nb = 5 and lance_le is not null from public.lorani_controles where id = v_c1),
                 '1. … le contrôle est « contrôlé », daté, avec son nombre de constats');

  -- ── 2. Les planches entre elles ──
  select * into k from public.lorani_constats where controle_id = v_c1 and signature = 'incoherence|hauteur_faitage_m|projet';
  return next ok(k.nature = 'incoherence' and k.gravite = 'majeur'
                 and k.titre = 'La hauteur au faîtage diffère d''une pièce à l''autre : 9,85 m sur PC2 (p. 1) ; 10,2 m sur PC5 (p. 1).',
                 '2. faîtage 9,85 m sur PC2, 10,2 m sur PC5 : incohérence, page citée : ' || coalesce(k.titre, '∅'));
  return next ok(k.correction like 'Aligner la hauteur au faîtage sur une seule valeur dans toutes les pièces (écart de 0,35 m).%',
                 '2. … correction proposée : aligner, écart chiffré');
  return next ok(jsonb_array_length(k.valeurs) = 2 and k.valeurs @> jsonb_build_array(jsonb_build_object('piece', v_pc5, 'page', 1, 'texte', '+10,20'))
                 and (k.valeurs -> 0 -> 'boite') is not null, '2. … chaque valeur garde sa pièce, sa page, sa boîte et son texte');
  return next ok(not exists (select 1 from public.lorani_constats where controle_id = v_c1 and signature = 'incoherence|recul_voie_m|projet'),
                 '2. 4,00 m et 4,02 m : sous la tolérance de 5 cm, pas d''incohérence');

  -- ── 3. Contre le règlement du PLU ──
  select * into k from public.lorani_constats where controle_id = v_c1 and signature = 'plu|hauteur_faitage_m|projet|max';
  return next ok(k.gravite = 'bloquant' and k.article = 'UB 10'
                 and k.titre = 'La hauteur au faîtage (10,2 m sur PC5, p. 1) dépasse la règle du PLU (au plus 10 m, article UB 10).',
                 '3. faîtage au-delà du maximum : bloquant, article UB 10 : ' || coalesce(k.titre, '∅'));
  return next ok(k.correction = 'Ramener la hauteur au faîtage à au plus 10 m (article UB 10 du règlement), ou justifier une dérogation.'
                 and k.valeurs @> '[{"regle": true, "borne": "max", "article": "UB 10"}]'::jsonb, '3. … correction proposée, règle citée dans les valeurs');
  select * into k from public.lorani_constats where controle_id = v_c1 and signature = 'plu|recul_voie_m|projet|min';
  return next ok(k.titre like 'Le recul sur voie (4 m sur PC2, p. 1) n''atteint pas la règle du PLU (au moins 5 m, article UB 6).'
                 and jsonb_array_length(k.valeurs) = 3, '3. recul sous le minimum : la pire valeur est citée, les deux planches jointes');

  -- ── 4. CCTP contre DPGF ──
  return next ok(exists (select 1 from public.lorani_constats where controle_id = v_c1 and signature = 'cctp_dpgf|cctp|2_2'
                         and titre = 'Le poste 2.2 « Fondations superficielles » est décrit au CCTP (CCTP 02, p. 1) mais n''est pas chiffré à la DPGF.'),
                 '4. poste 2.2 décrit au CCTP, absent de la DPGF');
  return next ok(exists (select 1 from public.lorani_constats where controle_id = v_c1 and signature = 'cctp_dpgf|dpgf|2_3'
                         and correction = 'Décrire le poste 2.3 au CCTP, ou le retirer de la DPGF.'),
                 '4. poste 2.3 chiffré à la DPGF sans description au CCTP');

  -- ── 5. L'alerte et le journal ──
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:controle:%s', v_c1)
                         and niveau = 'attention' and titre like '%contrôle « Dépôt du PC » (indice A) passé, 5 constats ouverts dont 2 bloquants%'),
                 '5. alerte « attention » au chef de projet');
  return next ok(exists (select 1 from public.journal_opposable where client_id = v_client and action = 'lorani.controle_passe' and objet_id = v_projet::text),
                 '5. journal : lorani.controle_passe');

  -- ── 6. Le chef de projet décide ; le contenu d'un constat ne se réécrit pas ──
  perform tests.b5_endosser(v_referent);
  update public.lorani_constats set statut = 'ecarte', motif = 'Longrines en option, chiffrées à part.' where controle_id = v_c1 and signature = 'cctp_dpgf|dpgf|2_3';
  perform tests.b5_admin();
  return next ok((select statut = 'ecarte' and decide_par = v_referent and decide_le is not null from public.lorani_constats
                  where controle_id = v_c1 and signature = 'cctp_dpgf|dpgf|2_3'), '6. écarté avec son motif : décidé par le chef de projet, daté');
  perform tests.b5_endosser(v_referent);
  return next throws_ok(format('update public.lorani_constats set titre = %L where controle_id = %L and signature = %L', 'Rien à signaler', v_c1, 'plu|recul_voie_m|projet|min'),
                        '42501', null, '6. le titre d''un constat ne se réécrit pas');
  return next throws_ok(format('update public.lorani_constats set statut = %L where controle_id = %L and signature = %L', 'accepte', v_c1, 'cctp_dpgf|cctp|2_2'),
                        '23514', null, '6. accepter sans motif est refusé');
  return next throws_ok(format('insert into public.lorani_controle_pieces (client_id, projet_id, controle_id, piece_id, role) values (%L, %L, %L, %L, %L)',
                               v_client, v_autre, v_c1, tests.b5_lire(v_referent, v_autre, 'plan-autre-projet.pdf', 'lorani_planche', '[]'::jsonb), 'planche'),
                        '22023', null, '6. une pièce d''un autre projet n''entre pas dans le contrôle');
  perform tests.b5_admin();
  return next ok(not has_table_privilege('authenticated', 'public.lorani_constats', 'INSERT')
                 and has_table_privilege('authenticated', 'public.lorani_constats', 'UPDATE')
                 and not has_table_privilege('anon', 'public.lorani_controles', 'SELECT'),
                 '6. privilèges : un membre ne pose pas de constat, il le décide ; anon ne lit rien');

  -- ── 7. Revérification à l'indice B : PC5 corrigée (faîtage 9,85 m), le reste inchangé ──
  v_pc5b := tests.b5_lire(v_referent, v_projet, 'PC5-facades-indB.pdf', 'lorani_planche', jsonb_build_array(
    jsonb_build_object('champ', 'reference', 'valeur', 'PC5', 'texte', 'PC5 — Façades — ind. B'),
    jsonb_build_object('champ', 'mesure.hauteur_faitage_m.projet', 'valeur', '9.85', 'texte', '+9,85'),
    jsonb_build_object('champ', 'mesure.recul_voie_m.projet', 'valeur', '4.02', 'texte', '4,02')));
  r := private.lorani_lectures_passage();
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_controles (client_id, projet_id, intitule, indice, precedent_id) values (v_client, v_projet, 'Dépôt du PC', 'B', v_c1) returning id into v_c2;
  insert into public.lorani_controle_pieces (client_id, projet_id, controle_id, piece_id, role, reference) values
    (v_client, v_projet, v_c2, v_pc2, 'planche', 'PC2'), (v_client, v_projet, v_c2, v_pc5b, 'planche', 'PC5'),
    (v_client, v_projet, v_c2, v_plu, 'plu', 'PLUm UB'), (v_client, v_projet, v_c2, v_cctp, 'cctp', 'CCTP 02'),
    (v_client, v_projet, v_c2, v_dpgf, 'dpgf', 'DPGF 02');
  r := public.lorani_lancer_controle(v_c2);
  perform tests.b5_admin();
  return next ok((r ->> 'constats')::integer = 2 and (r ->> 'corriges')::integer = 2 and (r ->> 'reconduits')::integer = 3,
                 '7. indice B : 2 constats ouverts, 2 corrigés, 3 reconduits : ' || r::text);
  return next ok((select count(*) = 2 from public.lorani_constats where controle_id = v_c1 and statut = 'corrige' and corrige_au_controle = v_c2
                  and motif = 'Corrigé à l''indice B.' and signature in ('incoherence|hauteur_faitage_m|projet', 'plu|hauteur_faitage_m|projet|max')),
                 '7. … le faîtage (incohérence et PLU) passe « corrigé à l''indice B » sur le contrôle A');
  return next ok((select statut = 'ecarte' and motif = 'Longrines en option, chiffrées à part.' and precedent_id is not null
                  from public.lorani_constats where controle_id = v_c2 and signature = 'cctp_dpgf|dpgf|2_3'),
                 '7. … le poste 2.3 écarté à l''indice A le reste à l''indice B, avec son motif');
  return next ok((select statut = 'ouvert' and precedent_id is not null from public.lorani_constats where controle_id = v_c2 and signature = 'plu|recul_voie_m|projet|min'),
                 '7. … le recul toujours sous le minimum reste ouvert, relié à son constat de l''indice A');
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:controle:%s', v_c2)
                         and titre like '%(indice B) passé, 2 constats ouverts dont 1 bloquant ; 2 corrigés depuis l''indice précédent%'),
                 '7. … l''alerte dit ce qui a été corrigé depuis l''indice précédent');

  -- ── 8. Rejoué, le contrôle ne double rien ──
  perform tests.b5_endosser(v_referent);
  r := public.lorani_lancer_controle(v_c2);
  perform tests.b5_admin();
  select count(*) into n from public.lorani_constats where controle_id = v_c2;
  return next ok(n = 3 and (r ->> 'constats')::integer = 2, '8. rejoué : mêmes constats, rien de doublé');

  -- ── 9. Un contrôle « en lecture » se lance seul quand sa dernière pièce est lue ──
  perform tests.b5_endosser(v_referent);
  v_pc6 := public.lorani_deposer_piece(v_projet, 'PC6-coupe.pdf', 'application/pdf', 24000, encode(sha256('PC6-coupe.pdf'::bytea), 'hex'),
                                       format('cccccccc-0000-4000-8000-00000000000c/lorani_projet/%s/%s', v_projet, 'PC6-coupe.pdf'));
  insert into public.lorani_controles (client_id, projet_id, intitule, indice) values (v_client, v_projet, 'Coupe contre plan de masse', 'A') returning id into v_c3;
  insert into public.lorani_controle_pieces (client_id, projet_id, controle_id, piece_id, role, reference) values
    (v_client, v_projet, v_c3, v_pc2, 'planche', 'PC2'), (v_client, v_projet, v_c3, v_pc6, 'planche', 'PC3');
  perform tests.b5_admin();
  r := private.lorani_lectures_passage();
  return next is((select statut from public.lorani_controles where id = v_c3), 'en_lecture', '9. une pièce encore à lire : le contrôle attend');
  perform tests.b5_lire_deposee(v_pc6, 'lorani_planche', jsonb_build_array(
    jsonb_build_object('champ', 'mesure.hauteur_faitage_m.projet', 'valeur', '9.60', 'texte', 'Faîtage +9,60')));
  r := private.lorani_lectures_passage();
  return next ok((r ->> 'erreurs')::integer = 0 and (select statut = 'controle' and constats_nb = 1 from public.lorani_controles where id = v_c3),
                 '9. la dernière pièce lue, le contrôle se lance seul : 1 constat (faîtage 9,85 m contre 9,60 m) : ' || r::text);
end $f$;

select * from runtests('tests'::name, '^test_b5_07_');
