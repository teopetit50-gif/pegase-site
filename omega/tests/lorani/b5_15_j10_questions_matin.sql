-- Tests B5 — LORANI : le visa daté par la commande rappelé à J-10, les questions de plus de huit jours au point du matin (b5_25).
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c ; aides tests.b5_* de b5_01.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_b5_15_j10_questions_matin() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid; v_daf2 uuid;
  v_projet uuid; v_v1 uuid; v_v2 uuid; v_ent uuid; v_cr uuid; v_q9 uuid; v_q3 uuid; v_q20 uuid; n integer;
  d public.delais;
begin
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid; v_referent := (jeu ->> 'referent')::uuid; v_daf2 := (jeu ->> 'daf2')::uuid;
  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, nature)
  values (v_client, 'Groupe scolaire Lamartine (test b5_15)', '44000', 'Nantes', '44109', 'erp') returning id into v_projet;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_projet, v_referent, 'chef_projet');
  insert into public.lorani_intervenants (client_id, projet_id, nature, organisme) values (v_client, v_projet, 'bet_structure', 'Structures Atlantique') returning id into v_ent;
  perform tests.b5_admin();

  -- ── 1. Visa daté par la commande : rappel à J-10 ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_visas (client_id, projet_id, document, commande_le) values (v_client, v_projet, 'Fiche des menuiseries extérieures', current_date + 30) returning id into v_v1;
  insert into public.lorani_visas (client_id, projet_id, document) values (v_client, v_projet, 'Note de calcul des planchers') returning id into v_v2;
  perform tests.b5_admin();
  select * into d from public.delais where id = (select delai_id from public.lorani_visas where id = v_v1);
  return next ok(d.echeance = private.lorani_veille_ouvree(current_date + 30) and d.rappels @> array[10, 3, 1, 0] and d.rappels <@ array[10, 3, 1, 0],
                 '1. fiche des menuiseries, commande dans 30 jours : échéance la veille ouvrée, rappels J-10, J-3, J-1, J');
  select * into d from public.delais where id = (select delai_id from public.lorani_visas where id = v_v2);
  return next ok(d.rappels @> array[3, 1, 0] and d.rappels <@ array[3, 1, 0], '1. … sans date de commande : J-3, J-1, J comme avant');

  -- ── 2. Les questions : 9 jours, 20 jours, 3 jours ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_comptes_rendus (client_id, entite_id, projet_id, visite_le) values (v_client, v_client, v_projet, current_date - 20) returning id into v_cr;
  insert into public.lorani_points (client_id, entite_id, projet_id, intervenant_id, nature, texte, ouvert_au_cr)
  values (v_client, v_client, v_projet, v_ent, 'question', 'Trémie du R+1 : confirmer la position de la poutre', v_cr) returning id into v_q9;
  insert into public.lorani_points (client_id, entite_id, projet_id, nature, texte, ouvert_au_cr)
  values (v_client, v_client, v_projet, 'question', 'Réservations des gaines en sous-sol', v_cr) returning id into v_q20;
  insert into public.lorani_points (client_id, entite_id, projet_id, intervenant_id, nature, texte, ouvert_au_cr)
  values (v_client, v_client, v_projet, v_ent, 'question', 'Charge du plancher de la salle de motricité', v_cr) returning id into v_q3;
  perform tests.b5_admin();
  update public.lorani_points set cree_le = now() - interval '9 days' where id = v_q9;
  update public.lorani_points set cree_le = now() - interval '20 days' where id = v_q20;
  update public.lorani_points set cree_le = now() - interval '3 days' where id = v_q3;

  n := private.lorani_deposer_questions(v_client, current_date);
  return next ok(n >= 2, format('2. section « Questions sans réponse » déposée (%s sections : gérant, chef de projet…)', n));
  return next ok(exists (select 1 from public.points_sections ps join public.points_items i on i.section_id = ps.id
                         where ps.client_id = v_client and ps.module = 'lorani' and ps.jour = current_date and ps.destinataire = v_referent
                           and ps.titre = 'Questions sans réponse'
                           and i.texte like '%Groupe scolaire Lamartine%la question à Structures Atlantique attend une réponse depuis 9 jours — Trémie du R+1%'),
                 '2. le chef de projet lit « la question à Structures Atlantique attend une réponse depuis 9 jours — Trémie du R+1… »');
  return next ok(exists (select 1 from public.points_sections ps join public.points_items i on i.section_id = ps.id
                         where ps.client_id = v_client and ps.module = 'lorani' and ps.jour = current_date and ps.destinataire = v_referent
                           and ps.titre = 'Questions sans réponse' and i.texte like '%depuis 20 jours — Réservations des gaines%' and i.gravite = 'critique'),
                 '2. … celle de 20 jours aussi, en « critique » (plus de quinze jours)');
  return next ok(not exists (select 1 from public.points_sections ps join public.points_items i on i.section_id = ps.id
                             where ps.client_id = v_client and ps.module = 'lorani' and ps.jour = current_date and i.texte like '%salle de motricité%'),
                 '2. … pas celle de 3 jours');
  return next ok(not exists (select 1 from public.points_sections ps where ps.client_id = v_client and ps.module = 'lorani' and ps.jour = current_date
                             and ps.destinataire = v_daf2 and ps.titre = 'Questions sans réponse'),
                 '2. … rien pour le valideur hors projet');

  -- ── 3. Répondue, elle quitte le point du matin ; le point du matin de Lorani dépose les deux sections ──
  perform tests.b5_endosser(v_referent);
  update public.lorani_points set statut = 'repondu', reponse = 'Poutre décalée de 20 cm, plan BET indice C.', repondu_le = current_date where id in (v_q9, v_q20);
  perform tests.b5_admin();
  n := private.lorani_deposer_point(v_client, current_date);
  return next ok(not exists (select 1 from public.points_sections ps join public.points_items i on i.section_id = ps.id
                             where ps.client_id = v_client and ps.module = 'lorani' and ps.jour = current_date and ps.destinataire = v_referent
                               and i.texte like '%Groupe scolaire Lamartine%'),
                 format('3. répondues : la section du chef de projet ne les montre plus (le point du matin de Lorani les relit : %s sections)', n));
  return next ok(not has_function_privilege('authenticated', 'private.lorani_deposer_questions(uuid, date)', 'EXECUTE'),
                 '3. la fonction n''est pas ouverte aux membres');
end $f$;

select * from runtests('tests'::name, '^test_b5_15_');
