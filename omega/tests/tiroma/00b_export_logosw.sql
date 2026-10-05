-- 00b — L'export Logos_w d'exemple du cabinet du scénario (session B3), et son dépôt par les portes du socle.
-- Jouable tel quel par execute_sql sur la RECETTE, après 00_aides_b3.sql. Rien ici n'écrit dans le socle : les tests
-- appellent ces aides sous runtests(), qui annule tout.
--
-- Dix fichiers, un par jeu du modèle tiroma/logosw (types_rdv, patients, agenda, devis, devis_lignes, actes, labo,
-- stock, odf, attente). Les dates sont RELATIVES au jour J du test (heure de la Guadeloupe) ; les heures sont celles
-- du cabinet, sans fuseau, comme un vrai export. Trois variantes de l'agenda :
--   'initial' : la semaine type, 4 rendez-vous par jour ouvré de J-5 à J+10, 10 rendez-vous le jour J+3 ;
--   'courant' : le lendemain, R010 (demain 9 h, couronne, Dorville) a disparu, R003 est honoré, R005 manqué ;
--   'vide'    : la journée J+3 entièrement vidée (10 rendez-vous) : le garde-fou de Tiroma doit dire « douteux ».
-- Aucun patient réel : noms inventés.

-- Le jour J, dans le fuseau du cabinet.
create or replace function tests.b3_jour() returns date language sql stable as $$
  select (now() at time zone coalesce((select e.fuseau from public.entites e where e.id = tests.b3_entite()), 'America/Guadeloupe'))::date
$$;

-- Les lignes d'un jeu : tableau d'objets {n, ligne, cle, valeurs, anomalies, empreinte}, comme le lecteur les déposerait.
create or replace function tests.b3_lignes(p_jeu text, p_variante text default 'initial') returns jsonb
language plpgsql stable as $$
declare
  j date := tests.b3_jour();
  v jsonb;
  d date;
  n integer := 0;
  k integer := 0;
  v_lignes jsonb := '[]'::jsonb;
  v_cle text[];
  e jsonb;
  types text[] := array['Contrôle annuel', 'Détartrage', 'Soin composite', 'Couronne — préparation'];
  heures text[] := array['08:30', '10:00', '14:00', '16:00'];
  durees integer[] := array[20, 30, 30, 45];
  salles text[] := array['Fauteuil 1', 'Fauteuil 1', 'Fauteuil 2', 'Fauteuil 2'];
  prats text[] := array['Dr Rousseau', 'Dr Rousseau', 'Dr Lacour', 'Dr Lacour'];
  f text := 'YYYY-MM-DD';
begin
  select m.cle into v_cle from public.modeles_jeux m where m.module = 'tiroma' and m.logiciel = 'logosw' and m.code = p_jeu and m.version = 1;
  if v_cle is null then
    raise exception 'tests.b3_lignes : jeu inconnu %', p_jeu;
  end if;

  if p_jeu = 'types_rdv' then
    v := jsonb_build_array(
      jsonb_build_object('libelle', 'Contrôle annuel', 'categorie', 'Prévention', 'duree_min', '20'),
      jsonb_build_object('libelle', 'Détartrage', 'categorie', 'Prévention', 'duree_min', '30'),
      jsonb_build_object('libelle', 'Soin composite', 'categorie', 'Soins', 'duree_min', '30'),
      jsonb_build_object('libelle', 'Couronne — préparation', 'categorie', 'Prothèse', 'duree_min', '45'),
      jsonb_build_object('libelle', 'Couronne — pose', 'categorie', 'Prothèse', 'duree_min', '45'),
      jsonb_build_object('libelle', 'Implant — chirurgie', 'categorie', 'Chirurgie', 'duree_min', '90'),
      jsonb_build_object('libelle', 'Urgence', 'categorie', 'Soins', 'duree_min', '20'),
      jsonb_build_object('libelle', 'RDV LV', 'duree_min', '30'),
      jsonb_build_object('libelle', 'Réunion d''équipe', 'duree_min', '60'));
  elsif p_jeu = 'patients' then
    v := jsonb_build_array(
      jsonb_build_object('ref', 'P001', 'nom', 'Delannoy', 'prenom', 'Marguerite', 'naissance', '1961-03-04', 'praticien', 'Dr Lacour', 'famille_ref', 'F1', 'dernier_rdv_le', to_char(j - 50, f)),
      jsonb_build_object('ref', 'P002', 'nom', 'Bazile', 'prenom', 'Kévin', 'naissance', '1988-07-19', 'praticien', 'Dr Rousseau', 'dernier_rdv_le', to_char(j - 120, f)),
      jsonb_build_object('ref', 'P003', 'nom', 'Nestor', 'prenom', 'Rosalie', 'naissance', '1954-11-23', 'praticien', 'Dr Lacour', 'dernier_rdv_le', to_char(j - 400, f), 'dernier_bilan_le', to_char(j - 430, f)),
      jsonb_build_object('ref', 'P004', 'nom', 'Nabajoth', 'prenom', 'Jean-Luc', 'naissance', '1975-02-02', 'praticien', 'Dr Rousseau', 'dernier_rdv_le', to_char(j - 200, f)),
      jsonb_build_object('ref', 'P005', 'nom', 'Zami', 'prenom', 'Patrice', 'naissance', '1969-09-30', 'praticien', 'Dr Rousseau', 'dernier_rdv_le', to_char(j - 35, f)),
      jsonb_build_object('ref', 'P006', 'nom', 'Hilaire', 'prenom', 'Nadège', 'naissance', '1982-05-14', 'praticien', 'Dr Lacour', 'dernier_rdv_le', to_char(j - 12, f)),
      jsonb_build_object('ref', 'P007', 'nom', 'Mondésir', 'prenom', 'Lucas', 'naissance', '2016-01-08', 'praticien', 'Dr Lacour', 'famille_ref', 'F1', 'ne_pas_contacter', 'oui', 'dernier_rdv_le', to_char(j - 5, f)),
      jsonb_build_object('ref', 'P008', 'nom', 'Dorville', 'prenom', 'Michel', 'naissance', '1958-12-01', 'praticien', 'Dr Lacour', 'dernier_rdv_le', to_char(j - 9, f)),
      jsonb_build_object('ref', 'P009', 'nom', 'Laurent', 'prenom', 'Christiane', 'naissance', '1964-04-17', 'praticien', 'Dr Lacour', 'dernier_rdv_le', to_char(j - 30, f)),
      jsonb_build_object('ref', 'P010', 'nom', 'Bertrand', 'prenom', 'Inès', 'naissance', '2013-10-10', 'praticien', 'Dr Rousseau', 'dernier_rdv_le', to_char(j - 145, f)));
    for k in 1..20 loop
      v := v || jsonb_build_object('ref', 'Q' || lpad(k::text, 2, '0'), 'nom', 'Patient-essai', 'prenom', 'Numéro ' || k, 'naissance', '1970-01-01',
                                   'praticien', case when k % 2 = 0 then 'Dr Lacour' else 'Dr Rousseau' end, 'dernier_rdv_le', to_char(j - 10, f));
    end loop;
  elsif p_jeu = 'agenda' then
    v := '[]'::jsonb;
    -- La semaine type : quatre rendez-vous par jour ouvré, patients d'essai Q01..Q20.
    for d in select generate_series(j - 5, j + 10, interval '1 day')::date loop
      continue when extract(isodow from d) = 7;
      for k in 1..4 loop
        n := n + 1;
        v := v || jsonb_build_object('ref', 'R' || lpad((100 + n)::text, 3, '0'), 'patient_ref', 'Q' || lpad(((n % 20) + 1)::text, 2, '0'),
               'praticien', prats[k], 'salle', salles[k], 'type', types[k],
               'debut', to_char(d, f) || ' ' || heures[k], 'duree_min', durees[k]::text,
               'statut', case when d < j then 'Honoré' else 'Prévu' end, 'cree_le', to_char(d - 20, f) || ' 12:00');
      end loop;
    end loop;
    -- Le jour J+3 compte dix rendez-vous : six de plus (le garde-fou « journée vidée » demande au moins dix).
    for k in 1..6 loop
      n := n + 1;
      v := v || jsonb_build_object('ref', 'R' || lpad((100 + n)::text, 3, '0'), 'patient_ref', 'Q' || lpad(((n % 20) + 1)::text, 2, '0'),
             'praticien', 'Dr Lacour', 'salle', 'Fauteuil 3', 'type', 'Soin composite',
             'debut', to_char(j + 3, f) || ' ' || lpad((8 + k)::text, 2, '0') || ':15', 'duree_min', '30', 'statut', 'Prévu', 'cree_le', to_char(j - 10, f) || ' 09:00');
    end loop;
    if p_variante = 'vide' then
      select coalesce(jsonb_agg(x.value), '[]'::jsonb) into v from jsonb_array_elements(v) x where (x.value ->> 'debut') not like to_char(j + 3, f) || '%';
    end if;
    -- Les rendez-vous du récit.
    v := v
      || jsonb_build_object('ref', 'R001', 'patient_ref', 'P005', 'praticien', 'Dr Rousseau', 'salle', 'Fauteuil 1', 'type', 'Soin composite', 'debut', to_char(j - 35, f) || ' 10:00', 'duree_min', '60', 'statut', 'Honoré', 'devis_ref', 'D002', 'seance', '1', 'cree_le', to_char(j - 45, f) || ' 09:00')
      || jsonb_build_object('ref', 'R003', 'patient_ref', 'P005', 'praticien', 'Dr Rousseau', 'salle', 'Fauteuil 1', 'type', 'Soin composite', 'debut', to_char(j - 1, f) || ' 11:00', 'duree_min', '30', 'statut', case when p_variante = 'initial' then 'Prévu' else 'Honoré' end, 'cree_le', to_char(j - 15, f) || ' 09:00')
      || jsonb_build_object('ref', 'R004', 'patient_ref', 'Q01', 'praticien', 'Dr Lacour', 'salle', 'Fauteuil 2', 'type', 'Contrôle annuel', 'debut', to_char(j - 2, f) || ' 11:00', 'duree_min', '20', 'statut', 'Prévu', 'cree_le', to_char(j - 30, f) || ' 09:00')
      || jsonb_build_object('ref', 'R005', 'patient_ref', 'Q02', 'praticien', 'Dr Lacour', 'salle', 'Fauteuil 2', 'type', 'Détartrage', 'debut', to_char(j - 2, f) || ' 11:30', 'duree_min', '30', 'statut', case when p_variante = 'initial' then 'Prévu' else 'Manqué' end, 'cree_le', to_char(j - 30, f) || ' 09:00')
      || jsonb_build_object('ref', 'R011', 'patient_ref', 'P008', 'praticien', 'Dr Lacour', 'salle', 'Fauteuil 2', 'type', 'Couronne — pose', 'debut', to_char(j + 2, f) || ' 09:00', 'duree_min', '45', 'statut', 'Prévu', 'cree_le', to_char(j - 9, f) || ' 09:00')
      || jsonb_build_object('ref', 'R012', 'patient_ref', 'P009', 'praticien', 'Dr Lacour', 'salle', 'Fauteuil 2', 'type', 'Implant — chirurgie', 'debut', to_char(j + 1, f) || ' 14:30', 'duree_min', '90', 'statut', 'Prévu', 'cree_le', to_char(j - 20, f) || ' 09:00');
    if p_variante = 'initial' then
      v := v || jsonb_build_object('ref', 'R010', 'patient_ref', 'P008', 'praticien', 'Dr Lacour', 'salle', 'Fauteuil 2', 'type', 'Couronne — préparation', 'debut', to_char(j + 1, f) || ' 09:00', 'duree_min', '45', 'statut', 'Prévu', 'cree_le', to_char(j - 9, f) || ' 09:00');
    end if;
  elsif p_jeu = 'devis' then
    v := jsonb_build_array(
      jsonb_build_object('numero', 'D001', 'patient_ref', 'P001', 'praticien', 'Dr Lacour', 'date', to_char(j - 50, f), 'statut', 'Accepté', 'accepte_le', to_char(j - 42, f), 'montant', '1180', 'reste_a_charge', '420', 'part_amo', '300', 'part_amc', '460', 'valide_jusqu_au', to_char(j + 138, f), 'panier', 'Maîtrisé'),
      jsonb_build_object('numero', 'D002', 'patient_ref', 'P005', 'praticien', 'Dr Rousseau', 'date', to_char(j - 45, f), 'statut', 'Commencé', 'accepte_le', to_char(j - 40, f), 'montant', '640', 'reste_a_charge', '0', 'valide_jusqu_au', to_char(j + 145, f)),
      jsonb_build_object('numero', 'D003', 'patient_ref', 'P006', 'praticien', 'Dr Lacour', 'date', to_char(j - 14, f), 'statut', 'Accepté', 'accepte_le', to_char(j - 12, f), 'montant', '2950', 'reste_a_charge', '1300', 'valide_jusqu_au', to_char(j + 22, f), 'panier', 'Libre'),
      jsonb_build_object('numero', 'D004', 'patient_ref', 'P007', 'date', to_char(j - 6, f), 'statut', 'Accepté', 'accepte_le', to_char(j - 5, f), 'montant', '95', 'reste_a_charge', '28'),
      jsonb_build_object('numero', 'D005', 'patient_ref', 'P008', 'praticien', 'Dr Lacour', 'date', to_char(j - 20, f), 'statut', 'Présenté', 'montant', '780', 'reste_a_charge', '390', 'valide_jusqu_au', to_char(j + 160, f)));
  elsif p_jeu = 'devis_lignes' then
    v := jsonb_build_array(
      jsonb_build_object('numero', 'D001', 'devis_date', to_char(j - 50, f), 'rang', '1', 'code', 'HBLD036', 'libelle', 'Couronne céramique 26 — préparation', 'dents', '26', 'seance', '1', 'duree_min', '45', 'montant', '590'),
      jsonb_build_object('numero', 'D001', 'devis_date', to_char(j - 50, f), 'rang', '2', 'code', 'HBLD036', 'libelle', 'Couronne céramique 26 — pose', 'dents', '26', 'seance', '2', 'duree_min', '45', 'delai_min_jours', '10', 'montant', '590'),
      jsonb_build_object('numero', 'D002', 'devis_date', to_char(j - 45, f), 'rang', '1', 'code', 'HBFD010', 'libelle', 'Traitement de racine 36 — séance 1', 'dents', '36', 'seance', '1', 'duree_min', '60', 'montant', '320', 'fait_le', to_char(j - 35, f), 'rdv_ref', 'R001'),
      jsonb_build_object('numero', 'D002', 'devis_date', to_char(j - 45, f), 'rang', '2', 'code', 'HBFD010', 'libelle', 'Traitement de racine 36 — séance 2', 'dents', '36', 'seance', '2', 'duree_min', '60', 'montant', '320'),
      jsonb_build_object('numero', 'D003', 'devis_date', to_char(j - 14, f), 'rang', '1', 'libelle', 'Bridge 44-46 — préparation', 'dents', '44 45 46', 'seance', '1', 'duree_min', '60', 'montant', '1200'),
      jsonb_build_object('numero', 'D003', 'devis_date', to_char(j - 14, f), 'rang', '2', 'libelle', 'Bridge 44-46 — empreinte', 'dents', '44 45 46', 'seance', '2', 'duree_min', '30', 'montant', '350'),
      jsonb_build_object('numero', 'D003', 'devis_date', to_char(j - 14, f), 'rang', '3', 'libelle', 'Bridge 44-46 — pose', 'dents', '44 45 46', 'seance', '3', 'duree_min', '45', 'montant', '1400'),
      jsonb_build_object('numero', 'D004', 'devis_date', to_char(j - 6, f), 'rang', '1', 'code', 'HBBD005', 'libelle', 'Scellement de sillons', 'dents', '16 26 36 46', 'seance', '1', 'duree_min', '30', 'montant', '95'),
      jsonb_build_object('numero', 'D005', 'devis_date', to_char(j - 20, f), 'rang', '1', 'libelle', 'Inlay-core 15', 'dents', '15', 'seance', '1', 'duree_min', '45', 'montant', '780'));
  elsif p_jeu = 'actes' then
    v := jsonb_build_array(
      jsonb_build_object('ref', 'A001', 'patient_ref', 'P005', 'praticien', 'Dr Rousseau', 'date', to_char(j - 35, f), 'code', 'HBFD010', 'libelle', 'Traitement de racine 36', 'dents', '36', 'montant', '320', 'rdv_ref', 'R001', 'devis_numero', 'D002'),
      jsonb_build_object('ref', 'A002', 'patient_ref', 'Q03', 'praticien', 'Dr Lacour', 'date', to_char(j - 3, f), 'code', 'HBJD001', 'libelle', 'Détartrage', 'montant', '28.92'));
    if p_variante <> 'initial' then
      v := v || jsonb_build_object('ref', 'A003', 'patient_ref', 'Q01', 'praticien', 'Dr Lacour', 'date', to_char(j - 2, f), 'code', 'HBJD001', 'libelle', 'Contrôle', 'montant', '23');
    end if;
  elsif p_jeu = 'labo' then
    v := jsonb_build_array(
      jsonb_build_object('ref', 'L001', 'patient_ref', 'P008', 'laboratoire', 'Labo Caraïbe Prothèse', 'type_travail', 'Couronne céramo-métallique 16', 'envoye_le', to_char(j - 9, f), 'retour_attendu_le', to_char(j - 1, f), 'statut', 'En fabrication', 'rdv_pose_ref', 'R011'));
  elsif p_jeu = 'stock' then
    v := jsonb_build_array(
      jsonb_build_object('reference', 'NB-4.3-10', 'lot', 'L2026-07', 'marque', 'Nobel Biocare', 'famille', 'Implant', 'quantite', '1', 'seuil', '2', 'diametre_mm', '4.3', 'longueur_mm', '10'),
      jsonb_build_object('reference', 'ST-3.5-8', 'lot', 'L2026-09', 'marque', 'Straumann', 'famille', 'Implant', 'quantite', '5', 'seuil', '2', 'diametre_mm', '3.5', 'longueur_mm', '8'));
  elsif p_jeu = 'odf' then
    v := jsonb_build_array(
      jsonb_build_object('ref', 'O001', 'patient_ref', 'P010', 'demande_le', to_char(j - 160, f), 'accord_le', to_char(j - 145, f), 'statut', 'Accordé'));
  elsif p_jeu = 'attente' then
    v := jsonb_build_array(
      jsonb_build_object('ref', 'W001', 'patient_ref', 'P002', 'type', 'Soin composite', 'depuis', to_char(j - 9, f), 'duree_min', '30'),
      jsonb_build_object('ref', 'W002', 'patient_ref', 'P004', 'type', 'Détartrage', 'depuis', to_char(j - 16, f), 'duree_min', '30'));
  end if;

  -- La forme du lecteur : n, ligne, cle (les colonnes clé du jeu, jointes par « | »), valeurs, empreinte (sha256 des valeurs).
  n := 0;
  for e in select x.value from jsonb_array_elements(v) x loop
    n := n + 1;
    v_lignes := v_lignes || jsonb_build_object(
      'n', n, 'ligne', n + 1,
      'cle', (select string_agg(coalesce(e ->> c, ''), '|' order by o) from unnest(v_cle) with ordinality u(c, o)),
      'valeurs', e, 'anomalies', null,
      'empreinte', encode(sha256(convert_to(e::text, 'UTF8')), 'hex'));
  end loop;
  return v_lignes;
end $$;

-- Dépose un relevé (un fichier par jeu demandé) par les portes du socle, comme le ferait le lecteur d'exports :
-- recevoir_releve, puis pour chaque instantané commencer_releve, deposer_lignes, terminer_lecture. À appeler en admin.
-- Rend {releve, instantanes: [{instantane, jeu, statut}]}.
create or replace function tests.b3_deposer_releve(p_branchement uuid, p_jeux text[], p_variante text default 'initial', p_cle text default null)
returns jsonb language plpgsql as $$
declare
  v_client uuid := tests.b3_banc();
  v_fichiers jsonb := '[]'::jsonb;
  v_jeu text;
  v_recu jsonb;
  i jsonb;
  v_lignes jsonb;
  v_res jsonb := '[]'::jsonb;
  v_fin jsonb;
begin
  foreach v_jeu in array p_jeux loop
    v_fichiers := v_fichiers || jsonb_build_object(
      'nom_fichier', v_jeu || '_' || p_variante || '.csv', 'mime', 'text/csv', 'octets', 1000,
      'sha256', encode(sha256(convert_to('b3:' || v_jeu || ':' || p_variante || ':' || coalesce(p_cle, '') || ':' || now()::text, 'UTF8')), 'hex'),
      'chemin', v_client::text || '/branchement/' || p_branchement::text || '/' || v_jeu || '_' || p_variante || '.csv',
      'jeu', v_jeu);
  end loop;
  v_recu := public.recevoir_releve(p_branchement, v_fichiers, 'depot', p_cle, 'tests-b3@banc-varelo.test');
  for i in select x.value from jsonb_array_elements(v_recu -> 'instantanes') x loop
    perform public.commencer_releve((i ->> 'instantane')::uuid);
    v_jeu := (select bj.code from public.instantanes x join public.branchements_jeux bj on bj.id = x.jeu_id where x.id = (i ->> 'instantane')::uuid);
    v_lignes := tests.b3_lignes(v_jeu, p_variante);
    perform public.deposer_lignes((i ->> 'instantane')::uuid, v_lignes);
    v_fin := public.terminer_lecture((i ->> 'instantane')::uuid, jsonb_build_object('statut', 'lu', 'lignes', jsonb_array_length(v_lignes)), 'tests/b3/logosw');
    v_res := v_res || jsonb_build_object('instantane', i ->> 'instantane', 'jeu', v_jeu, 'lignes', jsonb_array_length(v_lignes), 'fin', v_fin);
  end loop;
  return jsonb_build_object('releve', v_recu ->> 'releve', 'instantanes', v_res);
end $$;

-- Fait avancer la file des relevés puis traite les travaux de Tiroma, comme les crons omega-releves-file et
-- tiroma-releves le feraient. Rend le bilan de tiroma_traiter_travaux.
create or replace function tests.b3_traiter() returns jsonb language plpgsql as $$
declare r jsonb; k integer;
begin
  perform private.avancer_releves();
  for k in 1..3 loop
    r := private.tiroma_traiter_travaux(20);
    exit when (r ->> 'faits')::integer = 0 and (r ->> 'echecs')::integer = 0;
  end loop;
  return r;
end $$;

-- Le cabinet installé, équipé, horaires posés, branché, puis le premier relevé appliqué (tous les jeux). Rend
-- {cabinet, branchement, releve, bilan}. En admin à la sortie.
create or replace function tests.b3_cabinet_releve(p_variante text default 'initial') returns jsonb language plpgsql as $$
declare v_cabinet uuid; v_branchement uuid; v_depot jsonb; v_bilan jsonb;
begin
  v_cabinet := tests.b3_installer();
  perform tests.b3_equipe();
  perform tests.b3_horaires();
  v_branchement := public.tiroma_brancher_cabinet(tests.b3_banc(), tests.b3_entite(), 'exports', null);
  perform tests.redevenir_admin();
  v_depot := tests.b3_deposer_releve(v_branchement, array['types_rdv', 'patients', 'agenda', 'devis', 'devis_lignes', 'actes', 'labo', 'stock', 'odf', 'attente'], p_variante, 'b3:' || p_variante);
  v_bilan := tests.b3_traiter();
  return jsonb_build_object('cabinet', v_cabinet, 'branchement', v_branchement, 'releve', v_depot ->> 'releve', 'depot', v_depot, 'bilan', v_bilan);
end $$;

grant execute on all functions in schema tests to authenticated;
select 'export Logos_w d''exemple posé' as resultat;
