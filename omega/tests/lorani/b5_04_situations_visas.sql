-- Tests B5 — LORANI : le chantier, situations de travaux et visas (b5_13, vague 3, manque n° 3).
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c, comptes gerant / referent.
-- Les aides tests.b5_* sont celles de omega/tests/lorani/b5_01_parcours_permis.sql (à poser avant).
-- runtests() annule tout ce que le test écrit.
--
-- Portes empruntées : lorani_projets, lorani_membres_projet, lorani_lots, lorani_marches, lorani_situations,
-- lorani_visas écrits sous RLS par le gérant et le chef de projet ; public.lorani_chantier_projet lu sous RLS.

create or replace function tests.test_b5_04_situations_visas() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid;
  v_projet uuid; v_public uuid; v_lot uuid; v_lot_pub uuid; v_marche uuid; v_marche_pub uuid;
  v_s1 uuid; v_s2 uuid; v_s3 uuid; v_s4 uuid; v_v1 uuid; v_v2 uuid; v_tdb jsonb;
  s public.lorani_situations;
begin
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid; v_referent := (jeu ->> 'referent')::uuid;

  -- ── 1. Le gérant : un projet privé, son lot de gros œuvre et le marché du titulaire ──
  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, parcelles, nature, marche_public)
  values (v_client, 'Maison Roussel (test b5_04)', '44000', 'Nantes', '44109', array['EF 3'], 'maison_individuelle', false) returning id into v_projet;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_projet, v_referent, 'chef_projet');
  insert into public.lorani_lots (client_id, projet_id, numero, intitule) values (v_client, v_projet, '02', 'Gros œuvre') returning id into v_lot;
  insert into public.lorani_marches (client_id, projet_id, lot_id, titulaire, montant_ht, avenants_ht)
  values (v_client, v_projet, v_lot, '  Bâti  Ouest  SAS ', 120000, 4800) returning id into v_marche;
  return next throws_ok(format('insert into public.lorani_marches (client_id, projet_id, lot_id, titulaire, montant_ht, retenue_pct) values (%L, %L, %L, ''Autre SARL'', 1000, 6)',
                               v_client, v_projet, v_lot), '23514', null, '1. une retenue de garantie au-delà de 5 % est refusée (loi n° 71-584 du 16 juillet 1971)');
  -- un projet en marché public, pour le délai de sept jours (CCAG-Travaux, art. 12.2.2)
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, parcelles, nature, marche_public)
  values (v_client, 'Groupe scolaire (test b5_04)', '44000', 'Nantes', '44109', array['GH 9'], 'erp', true) returning id into v_public;
  insert into public.lorani_lots (client_id, projet_id, numero, intitule) values (v_client, v_public, '01', 'Terrassement') returning id into v_lot_pub;
  insert into public.lorani_marches (client_id, projet_id, lot_id, titulaire, montant_ht)
  values (v_client, v_public, v_lot_pub, 'Terrassements du Lac', 80000) returning id into v_marche_pub;
  perform tests.b5_admin();
  return next ok((select titulaire = 'Bâti Ouest SAS' and delai_verification_jours = 15 and retenue_pct = 5 and entite_id is not null
                  from public.lorani_marches where id = v_marche), '1. le marché privé : titulaire épuré, 15 jours pour vérifier, retenue 5 %, entité héritée');
  return next is((select delai_verification_jours from public.lorani_marches where id = v_marche_pub), 7::smallint,
                 '1. le marché public : 7 jours pour accepter ou rectifier une situation (CCAG-Travaux, art. 12.2.2)');

  -- ── 2. Le chef de projet reçoit et vise les situations ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_situations (client_id, projet_id, marche_id, numero, mois, cumul_ht, recue_le)
  values (v_client, v_projet, v_marche, 1, date_trunc('month', current_date - 60)::date + 14, 30000, current_date - 40) returning id into v_s1;
  update public.lorani_situations set statut = 'visee' where id = v_s1;
  insert into public.lorani_situations (client_id, projet_id, marche_id, numero, mois, cumul_ht, recue_le)
  values (v_client, v_projet, v_marche, 2, current_date - 30, 72500, current_date - 10) returning id into v_s2;
  return next throws_ok(format('update public.lorani_situations set statut = ''rectifiee'', cumul_admis_ht = 70000 where id = %L', v_s2),
                        '23514', null, '2. une situation rectifiée doit dire pourquoi');
  update public.lorani_situations set statut = 'rectifiee', cumul_admis_ht = 70000, observation = 'Fondations spéciales non achevées' where id = v_s2;
  perform tests.b5_admin();
  select * into s from public.lorani_situations where id = v_s1;
  return next ok(s.cumul_admis_ht = 30000 and s.visee_le = current_date and s.visee_par = v_referent and s.a_viser_avant = current_date - 40 + 15
                 and extract(day from s.mois) = 1, '2. visée : cumul admis = cumul demandé, datée, au nom du chef de projet ; à viser 15 jours après réception ; mois ramené au 1er');
  return next is((select cumul_admis_ht from public.lorani_situations where id = v_s2), 70000::numeric, '2. rectifiée : le cumul admis est celui de l''architecte');

  -- ── 3. La situation qui dépasse le marché, puis celle qui recule ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_situations (client_id, projet_id, marche_id, numero, mois, cumul_ht) values (v_client, v_projet, v_marche, 3, current_date, 130000) returning id into v_s3;
  insert into public.lorani_situations (client_id, projet_id, marche_id, numero, mois, cumul_ht) values (v_client, v_projet, v_marche, 4, current_date, 60000) returning id into v_s4;
  return next throws_ok(format('insert into public.lorani_situations (client_id, projet_id, marche_id, numero, mois, cumul_ht) values (%L, %L, %L, 4, current_date, 61000)', v_client, v_projet, v_marche),
                        '23505', null, '3. un numéro de situation ne se reçoit qu''une fois par marché');
  return next throws_ok(format('update public.lorani_situations set numero = 9 where id = %L', v_s4), '55000', null, '3. une situation garde son numéro');
  perform tests.b5_admin();
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:situation:%s:recue', v_s3)
                         and titre like '%situation n° 3 de Bâti Ouest SAS (lot 02) reçue : 130 000,00 € HT cumulés, 60 000,00 € ce mois. À viser avant le ' || to_char(current_date + 15, 'DD/MM/YYYY') || '%'),
                 '3. reçue : alerte avec le cumul, le montant du mois (contre le cumul admis précédent) et la date limite');
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:situation:%s:depasse', v_s3)
                         and titre like '%dépasse le marché et ses avenants (124 800,00 € HT) de 5 200,00 €%'), '3. le cumul dépasse le marché : alerte avec l''écart chiffré');
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:situation:%s:baisse', v_s4)
                         and titre like '%inférieur à celui de la situation précédente (130 000,00 € HT)%'), '3. le cumul recule : alerte');
  return next ok(not exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:situation:%s:depasse', v_s4)),
                 '3. … et pas d''alerte de dépassement pour une situation sous le marché');

  -- ── 4. Les visas : calés sur la commande de l'ouvrage ──
  return next is(private.lorani_veille_ouvree('2026-10-12'::date), '2026-10-09'::date, '4. la veille ouvrée d''un lundi est le vendredi');
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_visas (client_id, projet_id, lot_id, document, indice, commande_le)
  values (v_client, v_projet, v_lot, 'Plans de ferraillage   des fondations', 'a', current_date + 4) returning id into v_v1;
  insert into public.lorani_visas (client_id, projet_id, document, recu_le) values (v_client, v_projet, 'Carnet de détails menuiseries', current_date - 3) returning id into v_v2;
  return next throws_ok(format('update public.lorani_visas set avis = ''ref'' where id = %L', v_v1), '23514', null, '4. un refus de visa doit dire pourquoi');
  perform tests.b5_admin();
  return next ok((select document = 'Plans de ferraillage des fondations' and indice = 'A' and a_viser_avant = private.lorani_veille_ouvree(current_date + 4)
                  from public.lorani_visas where id = v_v1), '4. à viser avant la veille ouvrée de la commande de l''ouvrage (avant le délai de 15 jours)');
  return next is((select a_viser_avant from public.lorani_visas where id = v_v2), current_date - 3 + 15, '4. sans date de commande : 15 jours après réception (CCAG-Travaux, art. 29)');
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:visa:%s:urgent', v_v1)
                         and titre like '%visa urgent, Plans de ferraillage des fondations (indice A)%l''ouvrage se commande le%'), '4. moins de cinq jours : alerte « visa urgent »');
  perform tests.b5_endosser(v_referent);
  update public.lorani_visas set avis = 'vao', observation = 'Enrobage à reprendre en rive' where id = v_v1;
  perform tests.b5_admin();
  return next ok((select vise_le = current_date and vise_par = v_referent from public.lorani_visas where id = v_v1), '4. visé avec observations : daté, au nom du chef de projet');

  -- ── 5. Le tableau du chantier, lu par le chef de projet ──
  perform tests.b5_endosser(v_referent);
  v_tdb := public.lorani_chantier_projet(v_projet);
  perform tests.b5_admin();
  return next ok((v_tdb ->> 'marches_ht')::numeric = 124800 and (v_tdb ->> 'cumul_ht')::numeric = 60000,
                 '5. tableau du chantier : 124 800 € de marchés, 60 000 € cumulés (dernière situation)');
  return next ok((select (m ->> 'avancement')::integer = 48 and (m ->> 'derniere_situation')::integer = 4 and (m ->> 'reste_ht')::numeric = 64800
                  from jsonb_array_elements(v_tdb -> 'marches') m), '5. … le lot 02 à 48 %, situation n° 4, 64 800 € restant');
  return next is(jsonb_array_length(v_tdb -> 'situations_a_viser'), 2, '5. … deux situations à viser');
  return next ok(jsonb_array_length(v_tdb -> 'visas_a_rendre') = 1 and v_tdb #>> '{visas_a_rendre,0,document}' = 'Carnet de détails menuiseries',
                 '5. … un visa à rendre');
end $f$;

select * from runtests('tests'::name, '^test_b5_04_');
