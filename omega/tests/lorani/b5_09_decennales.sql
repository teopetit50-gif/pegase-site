-- Tests B5 — LORANI : les attestations décennales lues et contrôlées contre le lot (b5_18).
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c, comptes gerant / referent.
-- Les aides tests.b5_* (dont tests.b5_lire, le lecteur joué par ses portes) sont celles de
-- omega/tests/lorani/b5_01_parcours_permis.sql (à poser avant). runtests() annule tout ce que le test écrit.
-- Joue la vraie chaîne : lecture → private.lorani_lectures_passage → attestation contrôlée ; échéance au registre →
-- private.controler_delais → travail lorani.attestation.rappel → passage.

create or replace function tests.test_b5_09_decennales() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid;
  v_projet uuid; v_autre uuid; v_lot uuid; v_lot2 uuid; v_ent uuid; v_ent_autre uuid; v_piece uuid; v_d1 uuid; v_d2 uuid; v_echue uuid; r jsonb;
  a public.lorani_attestations;
begin
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid; v_referent := (jeu ->> 'referent')::uuid;

  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, adresse, code_postal, commune, code_insee, parcelles, nature)
  values (v_client, 'Façade Mercière (test b5_09)', '31 rue Mercière', '69002', 'Lyon 2e', '69382', array['AC 77'], 'tertiaire') returning id into v_projet;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_projet, v_referent, 'chef_projet');
  insert into public.lorani_lots (client_id, projet_id, numero, intitule, activites_requises)
  values (v_client, v_projet, '01', 'Ravalement — pierre de taille', array[' Pierre_Taille', 'ravalement', 'ravalement']) returning id into v_lot;
  insert into public.lorani_lots (client_id, projet_id, numero, intitule) values (v_client, v_projet, '02', 'Échafaudage') returning id into v_lot2;
  insert into public.lorani_intervenants (client_id, projet_id, nature, organisme, siren, lot_id)
  values (v_client, v_projet, 'entreprise', 'Pierres de Bourgogne SARL', '538765432', v_lot) returning id into v_ent;
  insert into public.lorani_marches (client_id, projet_id, lot_id, titulaire, montant_ht, avenants_ht)
  values (v_client, v_projet, v_lot, 'Pierres de Bourgogne SARL', 186000, 7400);
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, nature)
  values (v_client, 'Autre chantier (test b5_09)', '69003', 'Lyon 3e', '69383', 'autre') returning id into v_autre;
  insert into public.lorani_intervenants (client_id, projet_id, nature, organisme) values (v_client, v_autre, 'entreprise', 'Maçonnerie Rhône') returning id into v_ent_autre;
  perform tests.b5_admin();
  return next is((select activites_requises from public.lorani_lots where id = v_lot), array['pierre_taille', 'ravalement'],
                 '0. les activités requises du lot sont nettoyées (minuscules, sans doublon)');

  -- ── 1. L'attestation lue devient une ligne contrôlée ──
  v_piece := tests.b5_lire(v_referent, v_projet, 'attestation-decennale-pierres-bourgogne.pdf', 'lorani_attestation_decennale', jsonb_build_array(
    jsonb_build_object('champ', 'assureur', 'valeur', 'SMABTP', 'texte', 'SMABTP'),
    jsonb_build_object('champ', 'numero_police', 'valeur', '123456 B 1234', 'texte', 'Contrat n° 123456 B 1234'),
    jsonb_build_object('champ', 'assure', 'valeur', 'PIERRES DE BOURGOGNE', 'texte', 'PIERRES DE BOURGOGNE'),
    jsonb_build_object('champ', 'siren', 'valeur', '538 765 432', 'texte', 'SIREN 538 765 432'),
    jsonb_build_object('champ', 'activites', 'valeur', jsonb_build_array('ravalement', 'maconnerie_beton_arme'), 'texte', 'Activités : ravalement de façade ; maçonnerie et béton armé'),
    jsonb_build_object('champ', 'debut', 'valeur', tests.b5_iso(-100), 'texte', 'du ' || tests.b5_fr(-100)),
    jsonb_build_object('champ', 'fin', 'valeur', tests.b5_iso(20), 'texte', 'au ' || tests.b5_fr(20)),
    jsonb_build_object('champ', 'plafond_eur', 'valeur', '150000', 'texte', 'Plafond 150 000 €')));
  r := private.lorani_lectures_passage();
  return next ok((r ->> 'erreurs')::integer = 0, '1. le passage des lectures prend l''attestation sans erreur : ' || r::text);
  select * into a from public.lorani_attestations where piece_id = v_piece;
  return next ok(a.id is not null and a.intervenant_id = v_ent and a.lot_id = v_lot and a.siren = '538765432' and a.assureur = 'SMABTP'
                 and a.activites = array['maconnerie_beton_arme', 'ravalement'] and a.debut = current_date - 100 and a.fin = current_date + 20 and a.plafond_eur = 150000,
                 '1. lue : entreprise reconnue par son SIREN, lot 01, assureur, activités, période, plafond');
  return next ok(a.statut = 'non_conforme' and a.verifie_le is not null
                 and a.constats @> '[{"code": "activite", "gravite": "bloquant", "texte": "Activité du lot 01 non couverte : Taille de pierre et maçonnerie de pierre."}]'::jsonb
                 and a.constats @> '[{"code": "plafond", "gravite": "majeur", "texte": "Plafond de garantie (150 000 €) inférieur au marché du lot (193 400 € HT)."}]'::jsonb,
                 '1. non conforme : la taille de pierre n''est pas couverte, le plafond est sous le marché (193 400 € HT)');
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:attestation:%s', a.id) and niveau = 'attention'
                         and titre like '%décennale de Pierres de Bourgogne SARL non conforme — Activité du lot 01 non couverte%'),
                 '1. … alerte « attention » au chef de projet');
  return next ok(exists (select 1 from public.journal_opposable where client_id = v_client and action = 'lorani.attestation_controlee' and objet_id = v_projet::text),
                 '1. … journal : lorani.attestation_controlee (le registre garde la date du contrôle)');
  r := private.lorani_poser_attestation_lue(v_piece);
  return next ok((r ->> 'deja')::boolean, '1. rejouée, la pièce ne double pas l''attestation');

  -- ── 2. L'échéance au registre des délais ──
  v_d1 := a.delai_id;
  return next ok((select d.echeance = current_date + 20 and d.rappels @> array[30, 7, 0] and d.module = 'lorani' and d.statut = 'ouvert'
                         and d.cle_idempotence = format('lorani:attestation:%s:%s', a.id, current_date + 20) from public.delais d where d.id = v_d1),
                 '2. la fin de validité est une échéance du registre (rappels J-30, J-7, J)');

  -- ── 3. Le chef de projet corrige : lot, puis plafond ──
  perform tests.b5_endosser(v_referent);
  update public.lorani_lots set activites_requises = array['ravalement'] where id = v_lot;
  perform tests.b5_admin();
  select * into a from public.lorani_attestations where piece_id = v_piece;
  return next ok(a.statut = 'non_conforme' and jsonb_array_length(a.constats) = 1 and a.constats -> 0 ->> 'code' = 'plafond',
                 '3. le lot ne demande plus la taille de pierre : l''attestation est revue, reste le plafond');
  perform tests.b5_endosser(v_referent);
  update public.lorani_attestations set plafond_eur = 250000 where id = a.id;
  perform tests.b5_admin();
  return next is((select statut from public.lorani_attestations where id = a.id), 'conforme', '3. plafond corrigé (250 000 €) : conforme');

  -- ── 4. La fin de validité change : l'échéance est remplacée ──
  perform tests.b5_endosser(v_referent);
  update public.lorani_attestations set fin = current_date + 300 where id = a.id;
  perform tests.b5_admin();
  select delai_id into v_d2 from public.lorani_attestations where id = a.id;
  return next ok(v_d2 is not null and v_d2 <> v_d1 and (select statut = 'annule' and motif like 'Fin de validité de l''attestation modifiée%' from public.delais where id = v_d1)
                 and (select echeance from public.delais where id = v_d2) = current_date + 300,
                 '4. nouvelle échéance au registre, l''ancienne annulée avec son motif');

  -- ── 5. La date d'ouverture du chantier doit être couverte ──
  perform tests.b5_endosser(v_referent);
  update public.lorani_projets set ouverture_chantier = current_date - 200 where id = v_projet;
  perform tests.b5_admin();
  select * into a from public.lorani_attestations where id = a.id;
  return next ok(a.statut = 'non_conforme' and a.constats @> jsonb_build_array(jsonb_build_object('code', 'periode', 'gravite', 'bloquant',
                   'texte', format('Ouverture du chantier (%s) hors de la période de validité de l''attestation (du %s au %s).', tests.b5_fr(-200), tests.b5_fr(-100), tests.b5_fr(300)))),
                 '5. chantier ouvert avant le début de la garantie : non conforme (C. assur., art. L241-1)');
  perform tests.b5_endosser(v_referent);
  update public.lorani_projets set ouverture_chantier = current_date - 30 where id = v_projet;
  perform tests.b5_admin();
  return next is((select statut from public.lorani_attestations where id = a.id), 'conforme', '5. … ouverture dans la période : conforme');

  -- ── 6. Le rappel, par la vraie chaîne des délais ──
  perform tests.b5_endosser(v_referent);
  update public.lorani_attestations set fin = current_date + 6 where id = a.id;
  perform tests.b5_admin();
  perform private.controler_delais(now());
  r := private.lorani_lectures_passage();
  return next ok((r ->> 'erreurs')::integer = 0, '6. le passage prend les rappels sans erreur (visas et attestations ignorent ce qui n''est pas à eux) : ' || r::text);
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement like format('lorani:attestation:%s:rappel:%%', a.id)
                         and titre like '%la décennale de Pierres de Bourgogne SARL expire le ' || tests.b5_fr(6) || '%demandez la nouvelle attestation%'),
                 '6. rappel : « la décennale … expire le …, demandez la nouvelle attestation »');

  -- ── 7. Saisie à la main : une attestation échue, une entreprise d'un autre projet refusée ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_attestations (client_id, entite_id, projet_id, intervenant_id, assureur, activites, debut, fin)
  values (v_client, v_client, v_projet, v_ent, 'MAAF Pro', array['ravalement'], current_date - 400, current_date - 35) returning id into v_echue;
  perform tests.b5_admin();
  select * into a from public.lorani_attestations where id = v_echue;
  return next ok(a.statut = 'expiree' and a.delai_id is null and a.lot_id = v_lot, '7. saisie à la main, échue : « expirée », pas d''échéance à venir, lot repris de l''entreprise');
  perform tests.b5_endosser(v_referent);
  return next throws_ok(format('insert into public.lorani_attestations (client_id, entite_id, projet_id, intervenant_id, assureur) values (%L, %L, %L, %L, %L)',
                               v_client, v_client, v_projet, v_ent_autre, 'AXA'), '22023', null, '7. une entreprise d''un autre projet est refusée');
  perform tests.b5_admin();

  -- ── 8. Droits ──
  return next ok(has_table_privilege('authenticated', 'public.lorani_attestations', 'INSERT') and has_table_privilege('authenticated', 'public.lorani_attestations', 'UPDATE')
                 and not has_table_privilege('anon', 'public.lorani_attestations', 'SELECT'),
                 '8. un membre saisit et corrige ; anon ne lit rien');
end $f$;

select * from runtests('tests'::name, '^test_b5_09_');
