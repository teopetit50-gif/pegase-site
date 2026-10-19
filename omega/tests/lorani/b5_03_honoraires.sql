-- Tests B5 — LORANI : les honoraires phase par phase (b5_12, vague 3, manque n° 2).
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c, comptes gerant / referent.
-- Les aides tests.b5_* sont celles de omega/tests/lorani/b5_01_parcours_permis.sql (à poser avant).
-- runtests() annule tout ce que le test écrit.
--
-- Portes empruntées : lorani_projets, lorani_membres_projet, lorani_honoraires, lorani_temps écrits sous RLS par le
-- gérant et le chef de projet ; public.lorani_honoraires_projet lu sous RLS.

create or replace function tests.test_b5_03_honoraires() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid;
  v_projet uuid; v_esq uuid; v_aps uuid; v_t3 uuid; v_tdb jsonb; v_h numeric;
begin
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid; v_referent := (jeu ->> 'referent')::uuid;

  -- ── 1. Le gérant ouvre le projet, nomme le chef de projet et pose les honoraires de deux éléments ──
  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, parcelles, nature)
  values (v_client, 'Maison Lebrun (test b5_03)', '44000', 'Nantes', '44109', array['CD 7'], 'maison_individuelle') returning id into v_projet;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_projet, v_referent, 'chef_projet');
  insert into public.lorani_honoraires (client_id, projet_id, element, montant_ht, heures_prevues)
  values (v_client, v_projet, 'esq', 3000, 30) returning id into v_esq;
  insert into public.lorani_honoraires (client_id, projet_id, element, montant_ht, heures_prevues)
  values (v_client, v_projet, 'aps', 5000, 50) returning id into v_aps;
  return next throws_ok(format('insert into public.lorani_honoraires (client_id, projet_id, element, montant_ht) values (%L, %L, ''esq'', 100)', v_client, v_projet),
                        '23505', null, '1. un élément de mission ne se pose qu''une fois par projet');
  return next throws_ok(format('insert into public.lorani_honoraires (client_id, projet_id, element, montant_ht) values (%L, %L, ''autre'', 100)', v_client, v_projet),
                        '23514', null, '1. un élément « autre » doit être nommé');
  perform tests.b5_admin();
  return next is((select statut from public.lorani_honoraires where id = v_esq), 'a_venir', '1. un élément posé est « à venir »');
  return next ok((select entite_id is not null from public.lorani_honoraires where id = v_esq), '1. … il hérite de l''entité du projet');

  -- ── 2. Le chef de projet saisit ses temps : en cours, puis 80 %, puis dépassé ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_temps (client_id, projet_id, honoraire_id, jour, heures, note)
  values (v_client, v_projet, v_esq, current_date - 2, 20, '  relevé et premières esquisses ');
  perform tests.b5_admin();
  return next is((select statut from public.lorani_honoraires where id = v_esq), 'en_cours', '2. la première saisie passe l''élément « en cours »');
  return next ok((select membre = v_referent and note = 'relevé et premières esquisses' from public.lorani_temps where honoraire_id = v_esq),
                 '2. … la saisie est au nom de celui qui la fait, la note est épurée');
  return next ok(not exists (select 1 from public.alertes where client_id = v_client and cle_regroupement like 'lorani:honoraires:' || v_esq || ':%'),
                 '2. à 20 h sur 30, aucune alerte');
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_temps (client_id, projet_id, honoraire_id, jour, heures) values (v_client, v_projet, v_esq, current_date - 1, 6);
  perform tests.b5_admin();
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:honoraires:%s:80', v_esq)
                         and titre like '%Esquisse a consommé 26 h sur 30 h prévues (87 %%)%'), '2. à 26 h : alerte « 80 % » au chef de projet');
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_temps (client_id, projet_id, honoraire_id, jour, heures) values (v_client, v_projet, v_esq, current_date, 7.5) returning id into v_t3;
  perform tests.b5_admin();
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:honoraires:%s:100', v_esq)
                         and titre like '%33,5 h pour 30 h prévues (+3,5 h)%dépassés%taux réalisé 90 € HT de l''heure%'),
                 '2. à 33,5 h : alerte « dépassé », avec l''écart et le taux horaire réalisé');

  -- ── 3. Les garde-fous de la saisie ──
  perform tests.b5_endosser(v_referent);
  return next throws_ok(format('insert into public.lorani_temps (client_id, projet_id, honoraire_id, membre, jour, heures) values (%L, %L, %L, %L, current_date, 2)',
                               v_client, v_projet, v_aps, v_gerant), '42501', null, '3. on ne saisit pas le temps d''un autre');
  return next throws_ok(format('insert into public.lorani_temps (client_id, projet_id, honoraire_id, jour, heures) values (%L, %L, %L, current_date + 1, 2)',
                               v_client, v_projet, v_aps), '22023', null, '3. pas de temps daté dans le futur');
  return next throws_ok(format('insert into public.lorani_temps (client_id, projet_id, honoraire_id, jour, heures) values (%L, %L, %L, current_date, 25)',
                               v_client, v_projet, v_aps), '23514', null, '3. pas plus de 24 h dans une saisie');
  perform tests.b5_admin();

  -- ── 4. Le tableau de bord, lu par le chef de projet ──
  perform tests.b5_endosser(v_referent);
  v_tdb := public.lorani_honoraires_projet(v_projet);
  perform tests.b5_admin();
  return next is((v_tdb ->> 'montant_ht')::numeric, 8000::numeric, '4. tableau de bord : 8 000 € HT d''honoraires');
  return next is((v_tdb ->> 'heures_passees')::numeric, 33.5::numeric, '4. … 33,5 h passées');
  return next is((v_tdb ->> 'depasses')::integer, 1, '4. … un élément dépassé');
  return next ok((select e ->> 'etat' = 'depasse' and (e ->> 'consommation')::integer = 112 and e ->> 'libelle' = 'Esquisse'
                  from jsonb_array_elements(v_tdb -> 'elements') e where e ->> 'element' = 'esq'), '4. … l''esquisse à 112 %, « depasse »');
  return next is((select e ->> 'element' from jsonb_array_elements(v_tdb -> 'elements') with ordinality x(e, o) order by o limit 1), 'esq',
                 '4. … les éléments dans l''ordre de la mission');

  -- ── 5. Corriger une saisie : la sienne seulement ──
  perform tests.b5_endosser(v_gerant);
  update public.lorani_temps set heures = 1 where id = v_t3;
  perform tests.b5_admin();
  return next is((select heures from public.lorani_temps where id = v_t3), 7.5::numeric, '5. le gérant ne corrige pas le temps du chef de projet');
  perform tests.b5_endosser(v_referent);
  update public.lorani_temps set heures = 0 where id = v_t3;
  v_tdb := public.lorani_honoraires_projet(v_projet);
  perform tests.b5_admin();
  return next is((select heures from public.lorani_temps where id = v_t3), 0::numeric, '5. le chef de projet annule sa saisie (0 h)');
  return next ok((select e ->> 'etat' = 'a_surveiller' from jsonb_array_elements(v_tdb -> 'elements') e where e ->> 'element' = 'esq'),
                 '5. … l''esquisse redevient « à surveiller » (26 h sur 30)');

  -- ── 6. L'élément achevé : l'appel d'honoraires ──
  perform tests.b5_endosser(v_referent);
  update public.lorani_honoraires set statut = 'achevee' where id = v_esq;
  perform tests.b5_admin();
  return next is((select achevee_le from public.lorani_honoraires where id = v_esq), current_date, '6. l''élément achevé prend sa date');
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:honoraires:%s:appel', v_esq)
                         and titre like '%élément « Esquisse » achevé le%Appel d''honoraires à émettre : 3 000,00 € HT%'),
                 '6. … alerte « appel d''honoraires à émettre » avec le montant');
  return next ok(exists (select 1 from public.journal_opposable where client_id = v_client and action = 'lorani.element_acheve' and objet_id = v_projet::text),
                 '6. journal : lorani.element_acheve');
  perform tests.b5_endosser(v_referent);
  update public.lorani_honoraires set statut = 'facturee' where id = v_esq;
  v_tdb := public.lorani_honoraires_projet(v_projet);
  perform tests.b5_admin();
  return next ok((select facturee_le = current_date from public.lorani_honoraires where id = v_esq)
                 and (v_tdb ->> 'montant_facture_ht')::numeric = 3000, '6. facturé : la date est prise, le tableau de bord compte 3 000 € facturés');
end $f$;

select * from runtests('tests'::name, '^test_b5_03_');
