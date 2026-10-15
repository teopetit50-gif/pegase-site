-- Tests B5 — LORANI : le contrôle étendu (RE2020, accessibilité, sécurité incendie ERP, Cerfa et BET croisés) et la
-- complétude du DOE à la réception (b5_21, sur le moteur de b5_16).
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c, comptes gerant / referent.
-- Les aides tests.b5_* (dont tests.b5_lire) sont celles de omega/tests/lorani/b5_01_parcours_permis.sql (à poser avant).
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_b5_12_conformite_doe() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid;
  v_projet uuid; v_lot uuid; v_pc4 uuid; v_cerfa uuid; v_re uuid; v_bet uuid; v_c uuid; r jsonb; n integer;
  k public.lorani_constats;
begin
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid; v_referent := (jeu ->> 'referent')::uuid;

  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, adresse, code_postal, commune, code_insee, nature, marche_public)
  values (v_client, 'Pôle enfance (test b5_12)', '4 avenue Roger-Salengro', '69120', 'Vaulx-en-Velin', '69256', 'erp', true) returning id into v_projet;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_projet, v_referent, 'chef_projet');
  insert into public.lorani_lots (client_id, projet_id, numero, intitule) values (v_client, v_projet, '02', 'Gros œuvre') returning id into v_lot;
  insert into public.lorani_intervenants (client_id, projet_id, nature, organisme, lot_id) values (v_client, v_projet, 'entreprise', 'Bâti Ouest SAS', v_lot);
  perform tests.b5_admin();

  -- ── 1. Les pièces lues ──
  v_pc4 := tests.b5_lire(v_referent, v_projet, 'PC4-plan-RDC.pdf', 'lorani_planche', jsonb_build_array(
    jsonb_build_object('champ', 'mesure.largeur_porte_m.porte_entree', 'valeur', '0.83', 'texte', 'PL 83'),
    jsonb_build_object('champ', 'mesure.largeur_degagement_m.couloir_nord', 'valeur', '1.40', 'texte', '1,40'),
    jsonb_build_object('champ', 'mesure.distance_escalier_m.salle_motricite', 'valeur', '46', 'texte', '46 m'),
    jsonb_build_object('champ', 'mesure.effectif_nb.batiment', 'valeur', '240', 'texte', 'Effectif 240'),
    jsonb_build_object('champ', 'mesure.degagements_nb.batiment', 'valeur', '1', 'texte', '1 dégagement'),
    jsonb_build_object('champ', 'mesure.pente_rampe_pct.rampe_entree', 'valeur', '4', 'texte', 'Pente 4 %'),
    jsonb_build_object('champ', 'mesure.surface_plancher_m2.projet', 'valeur', '1250', 'texte', 'SDP 1 250 m²')));
  v_cerfa := tests.b5_lire(v_referent, v_projet, 'Cerfa-13409.pdf', 'lorani_cerfa', jsonb_build_array(
    jsonb_build_object('champ', 'mesure.surface_plancher_m2.projet', 'valeur', '1212', 'texte', '1 212')));
  v_re := tests.b5_lire(v_referent, v_projet, 'Attestation-RE2020.pdf', 'lorani_attestation_re2020', jsonb_build_array(
    jsonb_build_object('champ', 're2020.bbio', 'valeur', '78.3', 'texte', 'Bbio = 78,3'),
    jsonb_build_object('champ', 're2020.bbio_max', 'valeur', '72', 'texte', 'Bbio max = 72'),
    jsonb_build_object('champ', 're2020.cep', 'valeur', '60', 'texte', 'Cep = 60'),
    jsonb_build_object('champ', 're2020.cep_max', 'valeur', '75', 'texte', 'Cep max = 75')));
  v_bet := tests.b5_lire(v_referent, v_projet, 'BET-structure-RDC.pdf', 'lorani_plan_bet', jsonb_build_array(
    jsonb_build_object('champ', 'mesure.largeur_degagement_m.couloir_nord', 'valeur', '1.20', 'texte', 'Couloir 1,20')));
  r := private.lorani_lectures_passage();

  -- ── 2. Le contrôle ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_controles (client_id, projet_id, intitule) values (v_client, v_projet, 'Permis de construire') returning id into v_c;
  insert into public.lorani_controle_pieces (client_id, projet_id, controle_id, piece_id, role, reference) values
    (v_client, v_projet, v_c, v_pc4, 'planche', 'PC4'), (v_client, v_projet, v_c, v_cerfa, 'cerfa', 'Cerfa'),
    (v_client, v_projet, v_c, v_re, 're2020', 'Attestation RE2020'), (v_client, v_projet, v_c, v_bet, 'bet', 'BET structure');
  r := public.lorani_lancer_controle(v_c);
  perform tests.b5_admin();
  return next ok((r ->> 'constats')::integer = 6, '2. contrôle passé : 6 constats : ' || r::text);

  select * into k from public.lorani_constats where controle_id = v_c and signature = 're2020|bbio';
  return next ok(k.nature = 're2020' and k.gravite = 'bloquant' and k.article = 'RE2020, arrêté du 4 août 2021'
                 and k.titre = 'Le besoin bioclimatique (Bbio) : 78,3 sur Attestation RE2020, p. 1, au-delà de son maximum de 72.',
                 '2. RE2020 : Bbio 78,3 au-delà de 72, bloquant : ' || coalesce(k.titre, '∅'));
  return next ok(not exists (select 1 from public.lorani_constats where controle_id = v_c and signature = 're2020|cep'), '2. … Cep sous son maximum : rien');
  select * into k from public.lorani_constats where controle_id = v_c and signature = 'accessibilite|largeur_porte_m|porte_entree|min';
  return next ok(k.gravite = 'majeur' and k.article = 'arrêté du 20 avril 2017, art. 10'
                 and k.titre like 'La largeur de passage de la porte de « porte entree » (0,83 m sur PC4, p. 1) est sous le minimum d''accessibilité%',
                 '2. accessibilité ERP : porte de 0,83 m sous 0,90 m (arrêté du 20 avril 2017, art. 10)');
  return next ok(not exists (select 1 from public.lorani_constats where controle_id = v_c and signature like 'accessibilite|pente_rampe_pct%'), '2. … rampe à 4 % : conforme');
  return next ok(exists (select 1 from public.lorani_constats where controle_id = v_c and signature = 'securite_incendie|distance_escalier_m|salle_motricite|max' and gravite = 'bloquant'),
                 '2. sécurité incendie : 46 m jusqu''à un escalier, au-delà de 40 m (CO 43)');
  return next ok(exists (select 1 from public.lorani_constats where controle_id = v_c and signature = 'securite_incendie|degagements_nb|batiment'
                         and titre like '%1 dégagement pour un effectif de 240%il en faut au moins 2.'),
                 '2. sécurité incendie : 1 dégagement pour 240 personnes, il en faut 2 (CO 38)');
  return next ok(exists (select 1 from public.lorani_constats where controle_id = v_c and signature = 'incoherence|surface_plancher_m2|projet'
                         and titre = 'La surface de plancher diffère d''une pièce à l''autre : 1212 m² sur Cerfa (p. 1) ; 1250 m² sur PC4 (p. 1).'),
                 '2. Cerfa contre planche : 1 212 m² au Cerfa, 1 250 m² sur PC4');
  return next ok(exists (select 1 from public.lorani_constats where controle_id = v_c and signature = 'incoherence|largeur_degagement_m|couloir_nord'),
                 '2. fond de plan BET contre planche : couloir de 1,20 m chez le BET, 1,40 m sur PC4');
  return next ok(not exists (select 1 from public.lorani_constats where controle_id = v_c and signature like 'securite_incendie|largeur_degagement_m%'),
                 '2. … les deux largeurs respectent une unité de passage (0,90 m)');

  -- ── 3. Les listes de rôles et de natures se redéfinissent sans retirer de contrainte ──
  return next ok(private.lorani_role_controle_valide('bet') and private.lorani_nature_constat_valide('securite_incendie') and not private.lorani_role_controle_valide('inconnu'),
                 '3. rôles et natures tenus par des fonctions');

  -- ── 4. Le DOE ──
  perform tests.b5_endosser(v_referent);
  n := public.lorani_preparer_doe(v_projet);
  return next ok(n = 6 and public.lorani_preparer_doe(v_projet) = 0, '4. liste type : 5 pièces pour le lot 02 et le DIUO ; rejouée, rien de plus');
  update public.lorani_doe set piece_id = v_pc4 where projet_id = v_projet and nature = 'plans';
  update public.lorani_doe set statut = 'sans_objet', motif = 'Aucun équipement sous garantie' where projet_id = v_projet and nature = 'garanties';
  perform tests.b5_admin();
  return next ok((select statut = 'recu' and recu_le = current_date from public.lorani_doe where projet_id = v_projet and nature = 'plans'), '4. une pièce rattachée : reçue, datée');
  perform tests.b5_endosser(v_referent);
  return next throws_ok(format('update public.lorani_doe set statut = %L where projet_id = %L and nature = %L', 'sans_objet', v_projet, 'fiches'), '23514', null,
                        '4. « sans objet » sans motif est refusé');
  update public.lorani_projets set reception_le = current_date where id = v_projet;
  perform tests.b5_admin();
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:doe:%s:%s', v_projet, v_lot)
                         and titre like '%DOE incomplet à la réception — lot 02 (Bâti Ouest SAS) : 3 pièces manquantes%'),
                 '4. réception : « DOE incomplet — lot 02 (Bâti Ouest SAS) : 3 pièces manquantes »');
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:doe:%s:projet', v_projet) and titre like '%DIUO%'),
                 '4. … et le DIUO du projet');
  return next ok(exists (select 1 from public.journal_opposable where client_id = v_client and action = 'lorani.doe_a_la_reception' and objet_id = v_projet::text),
                 '4. journal : lorani.doe_a_la_reception');
end $f$;

select * from runtests('tests'::name, '^test_b5_12_');
