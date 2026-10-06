-- Tests B5 — LORANI : la date limite d'un visa au registre des délais, ses rappels et son dépassement (b5_15).
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c, comptes gerant / referent.
-- Les aides tests.b5_* sont celles de omega/tests/lorani/b5_01_parcours_permis.sql (à poser avant).
-- Joue la vraie chaîne : private.controler_delais (cron :07) → travail lorani.visa.rappel / depasse →
-- private.lorani_lectures_passage (cron */5). runtests() annule tout ce que le test écrit.

create or replace function tests.test_b5_06_echeance_visas() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid;
  v_projet uuid; v_v1 uuid; v_v2 uuid; v_d1 uuid; v_d1b uuid; v_d2 uuid; r jsonb;
  d public.delais;
begin
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid; v_referent := (jeu ->> 'referent')::uuid;

  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, parcelles, nature)
  values (v_client, 'Résidence Caillaud (test b5_06)', '44000', 'Nantes', '44109', array['MN 2'], 'logement_collectif') returning id into v_projet;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_projet, v_referent, 'chef_projet');
  perform tests.b5_admin();
  return next is((select territoire from public.lorani_projets where id = v_projet), 'metropole', '0. le dossier a son territoire (le registre des délais l''exige)');

  -- ── 1. Un document reçu aujourd'hui : son échéance au registre ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_visas (client_id, projet_id, document) values (v_client, v_projet, 'Note de calcul des planchers') returning id into v_v1;
  perform tests.b5_admin();
  select delai_id into v_d1 from public.lorani_visas where id = v_v1;
  select * into d from public.delais where id = v_d1;
  return next ok(d.id is not null and d.module = 'lorani' and d.objet_type = 'lorani_projet' and d.objet_id = v_projet::text,
                 '1. le visa pose une échéance au registre des délais (module lorani, sur le dossier)');
  return next ok(d.echeance = current_date + 15 and d.statut = 'ouvert' and d.rappels @> array[3, 1, 0] and d.rappels <@ array[3, 1, 0] and d.responsable = v_referent
                 and d.libelle = 'Visa : Note de calcul des planchers (indice A)' and d.cle_idempotence = format('lorani:visa:%s:%s', v_v1, current_date + 15),
                 '1. … à J+15 (CCAG-Travaux, art. 29), rappels J-3, J-1, J, au chef de projet, libellé et clé');

  -- ── 2. La commande de l'ouvrage avance la date limite : l'échéance est remplacée ──
  perform tests.b5_endosser(v_referent);
  update public.lorani_visas set commande_le = current_date + 4 where id = v_v1;
  perform tests.b5_admin();
  select delai_id into v_d1b from public.lorani_visas where id = v_v1;
  return next ok(v_d1b is not null and v_d1b <> v_d1, '2. une nouvelle échéance remplace l''ancienne');
  return next ok((select statut = 'annule' and motif like 'Date limite du visa recalculée%' from public.delais where id = v_d1),
                 '2. … l''ancienne est annulée avec son motif');
  return next is((select echeance from public.delais where id = v_d1b), private.lorani_veille_ouvree(current_date + 4),
                 '2. … la nouvelle tombe la veille ouvrée de la commande');

  -- ── 3. Le rappel, par la vraie chaîne des délais ──
  perform private.controler_delais(now());
  r := private.lorani_lectures_passage();
  return next ok((r ->> 'erreurs')::integer = 0, '3. le passage prend les rappels sans erreur : ' || r::text);
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement like format('lorani:visa:%s:rappel:%%', v_v1)
                         and titre like '%visa à rendre avant le ' || to_char(private.lorani_veille_ouvree(current_date + 4), 'DD/MM/YYYY') || '%Note de calcul des planchers%'),
                 '3. rappel J-n : alerte « visa à rendre avant le … » au chef de projet');

  -- ── 4. L'avis rendu tient l'échéance ──
  perform tests.b5_endosser(v_referent);
  update public.lorani_visas set avis = 'vso' where id = v_v1;
  perform tests.b5_admin();
  return next is((select statut from public.delais where id = v_d1b), 'tenu', '4. avis rendu : l''échéance est tenue');

  -- ── 5. Un document en retard : dépassement signalé ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_visas (client_id, projet_id, document, recu_le) values (v_client, v_projet, 'Plan de réservations', current_date - 20) returning id into v_v2;
  perform tests.b5_admin();
  select delai_id into v_d2 from public.lorani_visas where id = v_v2;
  perform private.controler_delais(now());
  r := private.lorani_lectures_passage();
  return next is((select statut from public.delais where id = v_d2), 'depasse', '5. l''échéance passée est « dépassée » au registre');
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:visa:%s:retard', v_v2)
                         and titre like '%visa en retard, Plan de réservations (indice A) devait être rendu le ' || to_char(current_date - 5, 'DD/MM/YYYY') || '%'),
                 '5. … alerte « visa en retard »');
  perform tests.b5_endosser(v_referent);
  update public.lorani_visas set avis = 'ref', observation = 'Réservations incompatibles avec la trémie' where id = v_v2;
  perform tests.b5_admin();
  return next is((select statut from public.delais where id = v_d2), 'tenu', '5. l''avis rendu en retard tient aussi l''échéance');
end $f$;

select * from runtests('tests'::name, '^test_b5_06_');
