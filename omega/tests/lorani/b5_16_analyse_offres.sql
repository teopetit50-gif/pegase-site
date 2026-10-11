-- Tests B5 — LORANI : l'analyse des offres, chaque offre alignée sur la DPGF ligne par ligne (b5_26).
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c ; aides tests.b5_* de b5_01.
-- Joue la vraie chaîne : DPGF et offres lues (tests.b5_lire, le lecteur joué par ses portes) → private.lorani_lectures_passage
-- → offre posée sur la consultation du lot → analyse. runtests() annule tout ce que le test écrit.

create or replace function tests.test_b5_16_analyse_offres() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid;
  v_projet uuid; v_lot uuid; v_ent uuid; v_dpgf uuid; v_f1 uuid; v_f2 uuid; v_f3 uuid; v_orphe uuid; v_cons uuid; r jsonb;
  c public.lorani_consultations;
  o1 public.lorani_offres; o2 public.lorani_offres; o3 public.lorani_offres;
  m public.lorani_marches;
begin
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid; v_referent := (jeu ->> 'referent')::uuid;
  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, nature)
  values (v_client, 'Résidence des Tanneurs (test b5_16)', '44000', 'Nantes', '44109', 'logement_collectif') returning id into v_projet;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_projet, v_referent, 'chef_projet');
  insert into public.lorani_lots (client_id, projet_id, numero, intitule) values (v_client, v_projet, '08', 'Menuiseries extérieures') returning id into v_lot;
  insert into public.lorani_intervenants (client_id, projet_id, nature, organisme, siren) values (v_client, v_projet, 'entreprise', 'Alu Ouest', '538765439') returning id into v_ent;
  perform tests.b5_admin();

  -- La DPGF chiffrée par la maîtrise d'œuvre (l'estimation) et une offre arrivée trop tôt
  v_dpgf := tests.b5_lire(v_referent, v_projet, 'DPGF-lot08-b5_16.pdf', 'lorani_dpgf', jsonb_build_array(
    jsonb_build_object('champ', 'lot', 'valeur', '08', 'texte', 'LOT 08 — MENUISERIES EXTÉRIEURES'),
    jsonb_build_object('champ', 'poste.8_1', 'valeur', '24', 'texte', '8.1 Fenêtres aluminium 120x135 — 24 u'),
    jsonb_build_object('champ', 'unite.8_1', 'valeur', 'u', 'texte', 'u'),
    jsonb_build_object('champ', 'prix_unitaire.8_1', 'valeur', '850', 'texte', '850,00'),
    jsonb_build_object('champ', 'poste.8_2', 'valeur', '6', 'texte', '8.2 Portes-fenêtres — 6 u'),
    jsonb_build_object('champ', 'montant.8_2', 'valeur', '9000', 'texte', '9 000,00'),
    jsonb_build_object('champ', 'poste.8_3', 'valeur', '1', 'texte', '8.3 Porte d''entrée — 1 u'),
    jsonb_build_object('champ', 'montant.8_3', 'valeur', '3200', 'texte', '3 200,00'),
    jsonb_build_object('champ', 'poste.8_4', 'valeur', '18', 'texte', '8.4 Volets roulants — 18 u'),
    jsonb_build_object('champ', 'montant.8_4', 'valeur', '7200', 'texte', '7 200,00')));
  v_orphe := tests.b5_lire(v_referent, v_projet, 'offre-sans-consultation-b5_16.pdf', 'lorani_offre', jsonb_build_array(
    jsonb_build_object('champ', 'entreprise', 'valeur', 'Vitrages Express', 'texte', 'VITRAGES EXPRESS'),
    jsonb_build_object('champ', 'lot', 'valeur', '12', 'texte', 'Lot 12')));
  v_f3 := tests.b5_lire(v_referent, v_projet, 'offre-ateliers-bois-b5_16.pdf', 'lorani_offre', jsonb_build_array(
    jsonb_build_object('champ', 'entreprise', 'valeur', 'Ateliers Bois', 'texte', 'ATELIERS BOIS'),
    jsonb_build_object('champ', 'lot', 'valeur', '8', 'texte', 'Lot 8'),
    jsonb_build_object('champ', 'montant_total_ht', 'valeur', '38500', 'texte', '38 500,00'),
    jsonb_build_object('champ', 'montant.8_1', 'valeur', '21600', 'texte', '21 600,00'),
    jsonb_build_object('champ', 'montant.8_2', 'valeur', '9300', 'texte', '9 300,00'),
    jsonb_build_object('champ', 'montant.8_4', 'valeur', '7000', 'texte', '7 000,00'),
    jsonb_build_object('champ', 'montant.8_5', 'valeur', '600', 'texte', '8.5 Grilles de ventilation 600,00')));
  r := private.lorani_lectures_passage();
  return next ok((r ->> 'erreurs')::integer = 0, '0. le passage prend la DPGF et deux offres sans erreur : ' || r::text);
  return next ok(not exists (select 1 from public.lorani_offres where piece_id in (v_orphe, v_f3))
                 and exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:offre:%s:a_ranger', v_f3) and acquittee_le is null),
                 '0. une offre sans consultation ouverte n''est pas posée : alerte « à ranger »');

  -- ── 1. La consultation, puis trois offres lues ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_consultations (client_id, projet_id, lot_id, intitule) values (v_client, v_projet, v_lot, 'DCE lot 08') returning id into v_cons;
  perform tests.b5_admin();
  v_f1 := tests.b5_lire(v_referent, v_projet, 'offre-alu-ouest-b5_16.pdf', 'lorani_offre', jsonb_build_array(
    jsonb_build_object('champ', 'entreprise', 'valeur', 'ALU OUEST SAS', 'texte', 'ALU OUEST SAS'),
    jsonb_build_object('champ', 'siren', 'valeur', '538 765 439', 'texte', 'SIREN 538 765 439'),
    jsonb_build_object('champ', 'lot', 'valeur', 'Lot 8', 'texte', 'Lot 8 — Menuiseries'),
    jsonb_build_object('champ', 'montant_total_ht', 'valeur', '40810', 'texte', 'Total HT 40 810,00'),
    jsonb_build_object('champ', 'prix_unitaire.8_1', 'valeur', '820', 'texte', '820,00'),
    jsonb_build_object('champ', 'quantite.8_1', 'valeur', '24', 'texte', '24'),
    jsonb_build_object('champ', 'montant.8_1', 'valeur', '19780', 'texte', '19 780,00'),
    jsonb_build_object('champ', 'montant.8_2', 'valeur', '8400', 'texte', '8 400,00'),
    jsonb_build_object('champ', 'montant.8_3', 'valeur', '3200', 'texte', '3 200,00'),
    jsonb_build_object('champ', 'montant.8_4', 'valeur', '9430', 'texte', '9 430,00')));
  v_f2 := tests.b5_lire(v_referent, v_projet, 'offre-menuiseries-loire-b5_16.xlsx', 'lorani_offre', jsonb_build_array(
    jsonb_build_object('champ', 'entreprise', 'valeur', 'Menuiseries de Loire', 'texte', 'Menuiseries de Loire'),
    jsonb_build_object('champ', 'lot', 'valeur', '08', 'texte', 'Lot 08'),
    jsonb_build_object('champ', 'montant_total_ht', 'valeur', '33600', 'texte', '33 600,00'),
    jsonb_build_object('champ', 'prix_unitaire.8_1', 'valeur', '800', 'texte', '800,00'),
    jsonb_build_object('champ', 'quantite.8_1', 'valeur', '22', 'texte', '22'),
    jsonb_build_object('champ', 'montant.8_1', 'valeur', '17600', 'texte', '17 600,00'),
    jsonb_build_object('champ', 'montant.8_2', 'valeur', '9200', 'texte', '9 200,00'),
    jsonb_build_object('champ', 'montant.8_4', 'valeur', '6800', 'texte', '6 800,00'),
    jsonb_build_object('champ', 'reserve.1', 'valeur', 'Hors pose des appuis de fenêtre', 'texte', 'Hors pose des appuis de fenêtre')));
  r := private.lorani_lectures_passage();
  return next ok((r ->> 'erreurs')::integer = 0, '1. le passage prend les deux autres offres sans erreur : ' || r::text);
  return next ok(exists (select 1 from public.lorani_offres where piece_id = v_f3 and consultation_id = v_cons)
                 and (select acquittee_le is not null from public.alertes where client_id = v_client and cle_regroupement = format('lorani:offre:%s:a_ranger', v_f3) order by acquittee_le desc nulls first limit 1)
                 and not exists (select 1 from public.lorani_offres where piece_id = v_orphe),
                 '1. l''offre d''Ateliers Bois, lue avant la consultation, est reprise à son ouverture (alerte acquittée) ; celle du lot 12 attend toujours');
  select * into o1 from public.lorani_offres where piece_id = v_f1;
  select * into o2 from public.lorani_offres where piece_id = v_f2;
  select * into o3 from public.lorani_offres where piece_id = v_f3;
  return next ok(o1.consultation_id = v_cons and o2.consultation_id = v_cons and o3.consultation_id = v_cons and o1.intervenant_id = v_ent and o1.siren = '538765439',
                 '1. les trois offres (lot « Lot 8 », « 08 », « 8 ») rejoignent la consultation du lot 08 ; Alu Ouest reconnue par son SIREN');

  -- ── 2. Chaque offre, ligne par ligne ──
  return next ok(o1.constats @> '[{"code": "arithmetique", "gravite": "majeur", "ref": "8_1"}]'::jsonb
                 and o1.constats @> '[{"code": "ecart_estimation", "ref": "8_4", "texte": "Poste 8.4 : écart de 31 % à l''estimation (9 430 € contre 7 200 €)."}]'::jsonb,
                 '2. Alu Ouest : 820 × 24 ≠ 19 780 €, et écart de 31 % sur le poste 8.4 : ' || o1.constats::text);
  return next ok(o2.constats @> '[{"code": "non_chiffre", "gravite": "majeur", "ref": "8_3"}]'::jsonb
                 and o2.constats @> '[{"code": "quantite", "ref": "8_1"}]'::jsonb
                 and o2.constats @> '[{"code": "reserve", "texte": "Réserve : Hors pose des appuis de fenêtre"}]'::jsonb,
                 '2. Menuiseries de Loire : 8.3 non chiffré, quantité 22 au lieu de 24, une réserve');
  return next ok(o3.constats @> '[{"code": "non_chiffre", "ref": "8_3"}]'::jsonb and o3.constats @> '[{"code": "hors_dpgf", "ref": "8_5"}]'::jsonb
                 and not (o3.constats @> '[{"code": "total"}]'::jsonb),
                 '2. Ateliers Bois : 8.3 non chiffré, 8.5 ajouté hors DPGF, total juste');

  -- ── 3. La consultation : le classement comparable et les postes chiffrés par une seule entreprise ──
  select * into c from public.lorani_consultations where id = v_cons;
  return next ok(c.statut = 'analysee' and (c.tableau ->> 'estimation_ht')::numeric = 39800 and c.tableau -> 'une_seule_offre' = '["8_3"]'::jsonb
                 and jsonb_array_length(c.tableau -> 'postes') = 4,
                 '3. analysée : estimation 39 800 € (PU × Q ou montant de la DPGF), le poste 8.3 n''est chiffré que par une entreprise sur trois');
  return next ok(o2.id = (select id from public.lorani_offres where consultation_id = v_cons and rang = 1)
                 and (select montant_comparable_ht from public.lorani_offres where id = o2.id) = 36800
                 and (select ecart_estimation_pct from public.lorani_offres where id = o2.id) = -7.54,
                 '3. moins-disante comparable : Menuiseries de Loire, 33 600 € + 3 200 € pour le 8.3 non chiffré = 36 800 € (−7,54 % sur l''estimation)');
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:consultation:%s', v_cons)
                         and titre like '%lot 08 : 3 offres analysées, 2 postes non chiffrés ; la moins-disante comparable : Menuiseries de Loire%'),
                 '3. alerte au chef de projet');
  return next ok(exists (select 1 from public.journal_opposable where client_id = v_client and action = 'lorani.offres_analysees' and objet_id = v_projet::text),
                 '3. journal : lorani.offres_analysees');

  -- ── 4. Rejouée, la pièce ne double pas l'offre ; l'attribution crée le marché ──
  r := private.lorani_poser_offre_lue(v_f2);
  return next ok((r ->> 'deja')::boolean, '4. rejouée, la pièce ne double pas l''offre');
  perform tests.b5_endosser(v_referent);
  r := public.lorani_attribuer_offre(o2.id, 'Moins-disante après complément du poste 8.3');
  perform tests.b5_admin();
  select * into m from public.lorani_marches where id = (r ->> 'marche')::uuid;
  return next ok(m.lot_id = v_lot and m.titulaire = 'Menuiseries de Loire' and m.montant_ht = 33600
                 and (select statut = 'attribuee' and offre_retenue = o2.id from public.lorani_consultations where id = v_cons)
                 and (select statut from public.lorani_offres where id = o2.id) = 'retenue',
                 '4. retenue : la consultation est attribuée, le marché du lot 08 est créé (33 600 € HT) pour les situations');
  return next ok(exists (select 1 from public.journal_opposable where client_id = v_client and action = 'lorani.offre_retenue' and objet_id = v_projet::text),
                 '4. journal : lorani.offre_retenue');
  perform tests.b5_endosser(v_referent);
  return next throws_ok(format('select public.lorani_attribuer_offre(%L)', o1.id), '55000', null, '4. une consultation attribuée ne s''attribue pas deux fois');
  perform tests.b5_admin();

  -- ── 5. Droits ──
  return next ok(has_table_privilege('authenticated', 'public.lorani_offres', 'INSERT') and not has_table_privilege('anon', 'public.lorani_consultations', 'SELECT')
                 and not has_function_privilege('anon', 'public.lorani_attribuer_offre(uuid, text)', 'EXECUTE')
                 and not has_function_privilege('authenticated', 'private.lorani_analyser_consultation(uuid)', 'EXECUTE'),
                 '5. un membre saisit ; anon ne lit rien ; l''analyse passe par les portes');
end $f$;

select * from runtests('tests'::name, '^test_b5_16_');
