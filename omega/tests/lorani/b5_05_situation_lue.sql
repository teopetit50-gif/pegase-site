-- Tests B5 — LORANI : une situation de travaux lue par le lecteur devient une situation « à viser » (b5_14).
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c, comptes gerant / referent.
-- Les aides tests.b5_* (dont tests.b5_lire, le lecteur joué par ses portes) sont celles de
-- omega/tests/lorani/b5_01_parcours_permis.sql (à poser avant). runtests() annule tout ce que le test écrit.

create or replace function tests.test_b5_05_situation_lue() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid;
  v_projet uuid; v_seul uuid; v_lot2 uuid; v_lot3 uuid; v_m2 uuid; v_m3 uuid; v_mseul uuid;
  v_piece uuid; v_piece2 uuid; v_piece3 uuid; v_piece4 uuid; r jsonb; n integer;
  s public.lorani_situations;
begin
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid; v_referent := (jeu ->> 'referent')::uuid;

  -- ── 1. Les fonctions de lecture ──
  return next is(private.lorani_montant_lu('72 500,00 €'), 72500.00, '1. « 72 500,00 € » se lit 72 500,00');
  return next is(private.lorani_montant_lu('72500.00'), 72500.00, '1. … la forme canonique du lecteur aussi');
  return next ok(private.lorani_montant_lu('illisible') is null, '1. … un montant illisible rend null');
  return next is(private.lorani_nom_comparable('SARL Bâti-Ouest'), private.lorani_nom_comparable('BATI OUEST'),
                 '1. « SARL Bâti-Ouest » et « BATI OUEST » désignent la même entreprise');

  -- ── 2. Un dossier en chantier : deux lots, deux marchés ; un autre dossier à un seul marché ──
  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, parcelles, nature)
  values (v_client, 'Immeuble Perrin (test b5_05)', '44000', 'Nantes', '44109', array['KL 4'], 'logement_collectif') returning id into v_projet;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_projet, v_referent, 'chef_projet');
  insert into public.lorani_lots (client_id, projet_id, numero, intitule) values (v_client, v_projet, '02', 'Gros œuvre') returning id into v_lot2;
  insert into public.lorani_lots (client_id, projet_id, numero, intitule) values (v_client, v_projet, '03', 'Charpente') returning id into v_lot3;
  insert into public.lorani_marches (client_id, projet_id, lot_id, titulaire, montant_ht) values (v_client, v_projet, v_lot2, 'Bâti Ouest SAS', 120000) returning id into v_m2;
  insert into public.lorani_marches (client_id, projet_id, lot_id, titulaire, montant_ht) values (v_client, v_projet, v_lot3, 'Charpentes Leroux', 48000) returning id into v_m3;
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, parcelles, nature)
  values (v_client, 'Atelier Morin (test b5_05)', '44000', 'Nantes', '44109', array['KL 5'], 'tertiaire') returning id into v_seul;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_seul, v_referent, 'chef_projet');
  insert into public.lorani_lots (client_id, projet_id, numero, intitule) values (v_client, v_seul, '01', 'Lot unique') returning id into v_lot3;
  insert into public.lorani_marches (client_id, projet_id, lot_id, titulaire, montant_ht) values (v_client, v_seul, v_lot3, 'Rénov Atlantique', 30000) returning id into v_mseul;
  perform tests.b5_admin();

  -- ── 3. La situation n° 3 de « BATI OUEST », lot 02, lue sur un PDF ──
  v_piece := tests.b5_lire(v_referent, v_projet, 'situation-03-bati-ouest.pdf', 'lorani_situation_travaux', jsonb_build_array(
    jsonb_build_object('champ', 'numero_situation', 'valeur', '3', 'texte', 'Situation n° 3'),
    jsonb_build_object('champ', 'mois', 'valeur', to_char(current_date - 20, 'YYYY-MM'), 'texte', 'Travaux du mois'),
    jsonb_build_object('champ', 'cumul_ht', 'valeur', '72500.00', 'texte', 'Cumul HT : 72 500,00 €'),
    jsonb_build_object('champ', 'titulaire', 'valeur', 'BATI OUEST', 'texte', 'BATI OUEST'),
    jsonb_build_object('champ', 'lot', 'valeur', '02', 'texte', 'Lot 02 — Gros œuvre')));
  r := private.lorani_lectures_passage();
  return next ok((r ->> 'erreurs')::integer = 0, '3. le passage des lectures prend la situation sans erreur : ' || r::text);
  select * into s from public.lorani_situations where piece_id = v_piece;
  return next ok(s.id is not null and s.marche_id = v_m2, '3. une situation est posée sur le marché du lot 02 (titulaire « BATI OUEST » = « Bâti Ouest SAS »)');
  return next ok(s.numero = 3 and s.cumul_ht = 72500 and s.statut = 'a_viser' and extract(day from s.mois) = 1,
                 '3. … n° 3, 72 500 € HT cumulés, « à viser », mois ramené au 1er');
  return next is(s.a_viser_avant, s.recue_le + 15, '3. … à viser dans les 15 jours de sa réception (marché privé)');
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:situation:%s:recue', s.id)),
                 '3. … l''alerte « situation reçue, à viser avant le » de b5_13 suit');
  return next ok(exists (select 1 from public.journal_opposable where client_id = v_client and action = 'lorani.situation_lue' and objet_id = v_projet::text),
                 '3. journal : lorani.situation_lue');

  -- ── 4. Rejouée, la même pièce ne pose rien de plus ──
  r := private.lorani_poser_situation_lue(v_piece);
  select count(*) into n from public.lorani_situations where marche_id = v_m2;
  return next ok((r ->> 'deja')::boolean and n = 1, '4. rejouée, la pièce ne double pas la situation');

  -- ── 5. Un titulaire inconnu sur un dossier à deux marchés : à ranger, rien n'est posé ──
  v_piece2 := tests.b5_lire(v_referent, v_projet, 'situation-inconnue.pdf', 'lorani_situation_travaux', jsonb_build_array(
    jsonb_build_object('champ', 'cumul_ht', 'valeur', '9000.00', 'texte', 'Cumul HT 9 000,00'),
    jsonb_build_object('champ', 'titulaire', 'valeur', 'Plomberie Garnier', 'texte', 'Plomberie Garnier')));
  r := private.lorani_lectures_passage();
  return next ok(not exists (select 1 from public.lorani_situations where piece_id = v_piece2)
                 and exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = 'lorani:situation_lue:' || v_piece2
                             and titre like '%à ranger : marché non reconnu%Plomberie Garnier%'),
                 '5. titulaire inconnu, deux marchés : alerte « à ranger », aucune situation posée');

  -- ── 6. Un dossier à un seul marché : sans titulaire ni numéro lisibles, la situation y va, au numéro suivant ──
  v_piece3 := tests.b5_lire(v_referent, v_seul, 'situation-renov.pdf', 'lorani_situation_travaux', jsonb_build_array(
    jsonb_build_object('champ', 'cumul_ht', 'valeur', '12 000,00', 'texte', 'Total cumulé 12 000,00')));
  r := private.lorani_lectures_passage();
  select * into s from public.lorani_situations where piece_id = v_piece3;
  return next ok(s.marche_id = v_mseul and s.numero = 1 and s.cumul_ht = 12000, '6. seul marché du dossier : situation n° 1 posée, 12 000 € lus');

  -- ── 7. Un cumul illisible : à ranger ──
  v_piece4 := tests.b5_lire(v_referent, v_seul, 'situation-floue.pdf', 'lorani_situation_travaux', jsonb_build_array(
    jsonb_build_object('champ', 'cumul_ht', 'valeur', 'voir annexe', 'texte', 'voir annexe')));
  r := private.lorani_lectures_passage();
  return next ok(not exists (select 1 from public.lorani_situations where piece_id = v_piece4)
                 and exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = 'lorani:situation_lue:' || v_piece4
                             and titre like '%cumul illisible%'), '7. cumul illisible : alerte « à ranger », rien n''est posé');

  -- ── 8. Les courriers de la mairie suivent toujours leur chaîne ──
  return next ok(not exists (select 1 from public.lorani_permis_dates_lues where piece_id in (v_piece, v_piece2, v_piece3, v_piece4)),
                 '8. une situation ne propose aucune date de permis');
end $f$;

select * from runtests('tests'::name, '^test_b5_05_');
