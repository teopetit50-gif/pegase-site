-- Tests B5 — LORANI : ordres de service et leur incidence, réserves suivies jusqu'à la levée, fin de la GPA (b5_19).
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c, comptes gerant / referent.
-- Les aides tests.b5_* sont celles de omega/tests/lorani/b5_01_parcours_permis.sql (à poser avant).
-- Joue la vraie chaîne des délais : private.controler_delais → travail lorani.chantier.rappel → passage.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_b5_10_os_reserves() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid;
  v_projet uuid; v_lot uuid; v_marche uuid; v_os1 uuid; v_os2 uuid; v_r1 uuid; v_r2 uuid; v_d uuid; r jsonb;
  i public.lorani_os_incidence;
  o public.lorani_ordres_service;
  v_demarrage date := current_date - 118;
begin
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid; v_referent := (jeu ->> 'referent')::uuid;

  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, adresse, code_postal, commune, code_insee, nature, marche_public)
  values (v_client, 'Pôle enfance (test b5_10)', '4 avenue Roger-Salengro', '69120', 'Vaulx-en-Velin', '69256', 'erp', true) returning id into v_projet;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_projet, v_referent, 'chef_projet');
  insert into public.lorani_lots (client_id, projet_id, numero, intitule) values (v_client, v_projet, '02', 'Gros œuvre') returning id into v_lot;
  insert into public.lorani_marches (client_id, projet_id, lot_id, titulaire, montant_ht, delai_execution_jours)
  values (v_client, v_projet, v_lot, 'Bâti Ouest SAS', 400000, 240) returning id into v_marche;
  perform tests.b5_admin();

  -- ── 1. L'OS de démarrage date le marché ; l'entreprise a 15 jours pour ses réserves ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_ordres_service (client_id, entite_id, projet_id, marche_id, nature, objet, emis_le, notifie_le)
  values (v_client, v_client, v_projet, v_marche, 'demarrage', 'Démarrage des travaux', v_demarrage - 2, v_demarrage) returning id into v_os1;
  perform tests.b5_admin();
  select * into o from public.lorani_ordres_service where id = v_os1;
  return next ok(o.numero = 1 and o.reserves_jusquau = v_demarrage + 15 and o.projet_id = v_projet,
                 '1. OS n° 1 numéroté seul, réserves de l''entreprise possibles jusqu''à notification + 15 jours (CCAG, art. 3.8.2)');
  return next is((select demarrage_le from public.lorani_marches where id = v_marche), v_demarrage, '1. … l''OS de démarrage date le marché');

  -- ── 2. Travaux supplémentaires : incidence sur le montant et le délai ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_ordres_service (client_id, entite_id, projet_id, marche_id, nature, objet, emis_le, notifie_le, montant_ht, delai_jours)
  values (v_client, v_client, v_projet, v_marche, 'travaux_supplementaires', 'Reprise en sous-œuvre', current_date - 60, current_date - 59, 38000, 15) returning id into v_os2;
  perform tests.b5_admin();
  select * into i from public.lorani_os_incidence where marche_id = v_marche;
  return next ok(i.os_montant_ht = 38000 and i.montant_a_date = 438000 and i.part_pct = 9.5 and i.os_jours = 15,
                 '2. OS n° 2 : +38 000 € HT (9,5 % du marché), +15 jours');
  return next is(private.lorani_fin_contractuelle(v_marche), v_demarrage + 240 + 15, '2. … fin contractuelle = démarrage + 240 jours + 15');
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:os:%s:delai', v_os2)
                         and titre like '%OS n° 2 (Bâti Ouest SAS), +15 jours sur le délai ; fin contractuelle le ' || to_char(v_demarrage + 255, 'DD/MM/YYYY') || '%'),
                 '2. … alerte : la nouvelle fin contractuelle');
  return next ok(not exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:os:marche:%s:montant', v_marche)),
                 '2. … sous 15 % : pas d''alerte de montant');

  -- ── 3. Un arrêt puis une reprise : dix jours ajoutés ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_ordres_service (client_id, entite_id, projet_id, marche_id, nature, objet, emis_le, montant_ht, delai_jours)
  values (v_client, v_client, v_projet, v_marche, 'arret', 'Intempéries', current_date - 30, 999, 9);
  insert into public.lorani_ordres_service (client_id, entite_id, projet_id, marche_id, nature, objet, emis_le)
  values (v_client, v_client, v_projet, v_marche, 'reprise', 'Reprise après intempéries', current_date - 20);
  perform tests.b5_admin();
  select * into i from public.lorani_os_incidence where marche_id = v_marche;
  return next ok(i.arret_jours = 10 and i.os_montant_ht = 38000 and i.os_jours = 15, '3. arrêt de 10 jours compté ; un arrêt ne porte ni montant ni jours propres');
  return next is(private.lorani_fin_contractuelle(v_marche), v_demarrage + 240 + 15 + 10, '3. … la fin contractuelle recule de 10 jours');

  -- ── 4. Au-delà de 15 % en marché public : alerte (CCP, art. R2194-8) ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_ordres_service (client_id, entite_id, projet_id, marche_id, nature, objet, montant_ht)
  values (v_client, v_client, v_projet, v_marche, 'travaux_modificatifs', 'Dalle épaissie', 25000);
  perform tests.b5_admin();
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:os:marche:%s:montant', v_marche) and niveau = 'attention'
                         and titre like '%+15,8 % du marché initial (463 000 € HT à date) : au-delà de 15 %, la modification est à examiner (CCP, art. R2194-8)%'),
                 '4. OS cumulés +15,8 % : alerte « attention », article R2194-8 cité');
  perform tests.b5_endosser(v_referent);
  update public.lorani_ordres_service set statut = 'signe_reserves', reserves_entreprise = 'Prix unitaire contesté' where id = v_os2;
  return next throws_ok(format('update public.lorani_ordres_service set statut = %L, reserves_entreprise = null where id = %L', 'signe_reserves', v_os1),
                        '23514', null, '4. signé avec réserves : le texte des réserves est obligatoire');
  perform tests.b5_admin();
  return next ok(exists (select 1 from public.journal_opposable where client_id = v_client and action = 'lorani.os_modifie' and objet_id = v_projet::text),
                 '4. journal : lorani.os_emis, lorani.os_modifie');

  -- ── 5. Les réserves : numérotées, datées au registre, levées ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_reserves (client_id, entite_id, projet_id, marche_id, intitule, localisation, lever_avant)
  values (v_client, v_client, v_projet, v_marche, 'Fissure en sous-face de dalle', 'R+1, salle 3', current_date + 10) returning id into v_r1;
  insert into public.lorani_reserves (client_id, entite_id, projet_id, intitule, lever_avant)
  values (v_client, v_client, v_projet, 'Joint de dilatation à reprendre', current_date + 3) returning id into v_r2;
  perform tests.b5_admin();
  return next ok((select numero = 1 and lot_id = v_lot and delai_id is not null from public.lorani_reserves where id = v_r1)
                 and (select numero = 2 from public.lorani_reserves where id = v_r2),
                 '5. réserves n° 1 (lot du marché repris) et n° 2, chacune avec son échéance « à lever avant »');
  return next ok((select d.echeance = current_date + 10 and d.rappels @> array[7, 0] and d.libelle = 'Réserve n° 1 (lot 02) : Fissure en sous-face de dalle'
                  from public.delais d join public.lorani_reserves x on x.delai_id = d.id where x.id = v_r1), '5. … libellé, date et rappels J-7, J');
  perform tests.b5_endosser(v_referent);
  update public.lorani_reserves set statut = 'levee' where id = v_r1;
  perform tests.b5_admin();
  return next ok((select x.levee_le = current_date and d.statut = 'tenu' from public.lorani_reserves x join public.delais d on d.id = x.delai_id where x.id = v_r1),
                 '5. levée : datée du jour, l''échéance est tenue');
  return next ok(exists (select 1 from public.journal_opposable where client_id = v_client and action = 'lorani.reserve_levee' and objet_id = v_projet::text),
                 '5. … journal : lorani.reserve_levee');

  -- ── 6. Le rappel d'une réserve, par la vraie chaîne ──
  perform private.controler_delais(now());
  r := private.lorani_lectures_passage();
  return next ok((r ->> 'erreurs')::integer = 0, '6. le passage prend les rappels du chantier sans erreur : ' || r::text);
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement like format('lorani:reserve:%s:rappel:%%', v_r2)
                         and titre like '%réserve n° 2 à lever avant le ' || to_char(current_date + 3, 'DD/MM/YYYY') || '%Joint de dilatation%'),
                 '6. rappel : « réserve n° 2 à lever avant le … »');
  return next ok(not exists (select 1 from public.alertes where client_id = v_client and cle_regroupement like format('lorani:reserve:%s:%%', v_r1)),
                 '6. … rien pour la réserve levée');

  -- ── 7. La réception : la fin de la GPA au registre, et son rappel avec les réserves restantes ──
  perform tests.b5_endosser(v_referent);
  update public.lorani_projets set reception_le = current_date - 330 where id = v_projet;
  perform tests.b5_admin();
  select gpa_delai_id into v_d from public.lorani_projets where id = v_projet;
  return next ok((select echeance = (current_date - 330 + interval '1 year')::date and rappels @> array[60, 30, 7, 0] and statut = 'ouvert' from public.delais where id = v_d),
                 '7. réception datée : fin de la GPA un an après (C. civ., art. 1792-6), rappels J-60, J-30, J-7, J');
  perform private.controler_delais(now());
  r := private.lorani_lectures_passage();
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement like format('lorani:gpa:%s:rappel:%%', v_projet) and niveau = 'attention'
                         and titre like '%fin de la garantie de parfait achèvement le%1 réserve non levée (sans lot : 1) : retenue de garantie à conserver%'),
                 '7. rappel de fin de GPA : 1 réserve non levée, retenue de garantie à conserver (loi 71-584, art. 2)');

  -- ── 8. Droits ──
  return next ok(has_table_privilege('authenticated', 'public.lorani_ordres_service', 'INSERT') and has_table_privilege('authenticated', 'public.lorani_reserves', 'UPDATE')
                 and not has_table_privilege('anon', 'public.lorani_reserves', 'SELECT') and has_table_privilege('authenticated', 'public.lorani_os_incidence', 'SELECT'),
                 '8. un membre émet un OS et lève une réserve ; la vue d''incidence se lit ; anon ne lit rien');
end $f$;

select * from runtests('tests'::name, '^test_b5_10_');
