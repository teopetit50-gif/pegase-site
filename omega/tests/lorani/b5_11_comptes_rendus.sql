-- Tests B5 — LORANI : les comptes rendus de chantier et les points suivis jusqu'à la réponse (b5_20).
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c, comptes gerant / referent.
-- Les aides tests.b5_* sont celles de omega/tests/lorani/b5_01_parcours_permis.sql (à poser avant).
-- runtests() annule tout ce que le test écrit (les relances mises en file ne partent pas).

create or replace function tests.test_b5_11_comptes_rendus() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid;
  v_projet uuid; v_autre uuid; v_lot uuid; v_ent uuid; v_ent_autre uuid; v_cr1 uuid; v_cr2 uuid; v_q1 uuid; v_a1 uuid; v_d1 uuid; r jsonb; c jsonb;
  p public.lorani_points;
begin
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid; v_referent := (jeu ->> 'referent')::uuid;

  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, adresse, code_postal, commune, code_insee, nature)
  values (v_client, 'Immeuble Perrin (test b5_11)', '3 rue Kervégan', '44000', 'Nantes', '44109', 'logement_collectif') returning id into v_projet;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_projet, v_referent, 'chef_projet');
  insert into public.lorani_lots (client_id, projet_id, numero, intitule) values (v_client, v_projet, '02', 'Gros œuvre') returning id into v_lot;
  insert into public.lorani_intervenants (client_id, projet_id, nature, organisme, contact, email, lot_id)
  values (v_client, v_projet, 'entreprise', 'Bâti Ouest SAS', 'Paul Garnier', 'chantier@bati-ouest.exemple', v_lot) returning id into v_ent;
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, nature)
  values (v_client, 'Autre (test b5_11)', '44000', 'Nantes', '44109', 'autre') returning id into v_autre;
  insert into public.lorani_intervenants (client_id, projet_id, nature, organisme) values (v_client, v_autre, 'entreprise', 'Ailleurs SARL') returning id into v_ent_autre;
  perform tests.b5_admin();

  -- ── 1. Le CR n° 1 et ses points ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_comptes_rendus (client_id, entite_id, projet_id, visite_le, presents, notes, prochaine_visite)
  values (v_client, v_client, v_projet, current_date - 14, '[{"nom": "Paul Garnier", "organisme": "Bâti Ouest SAS", "present": true}]', ' Visite du R+1 ', current_date)
  returning id into v_cr1;
  insert into public.lorani_points (client_id, entite_id, projet_id, intervenant_id, nature, texte, echeance, ouvert_au_cr)
  values (v_client, v_client, v_projet, v_ent, 'question', 'Fournir la note de calcul des linteaux  du R+1', current_date + 3, v_cr1) returning id into v_q1;
  insert into public.lorani_points (client_id, entite_id, projet_id, nature, texte, echeance, ouvert_au_cr)
  values (v_client, v_client, v_projet, 'action', 'Transmettre le plan de calepinage révisé', current_date + 1, v_cr1) returning id into v_a1;
  insert into public.lorani_points (client_id, entite_id, projet_id, nature, texte, ouvert_au_cr)
  values (v_client, v_client, v_projet, 'decision', 'Enduit teinte pierre retenu', v_cr1);
  perform tests.b5_admin();
  return next ok((select numero = 1 and notes = 'Visite du R+1' and statut = 'brouillon' from public.lorani_comptes_rendus where id = v_cr1), '1. CR n° 1, notes nettoyées, brouillon');
  select * into p from public.lorani_points where id = v_q1;
  return next ok(p.texte = 'Fournir la note de calcul des linteaux du R+1' and p.lot_id = v_lot and p.statut = 'ouvert' and p.delai_id is not null,
                 '1. question à Bâti Ouest : lot repris de l''entreprise, échéance au registre');
  v_d1 := p.delai_id;
  return next ok((select d.echeance = current_date + 3 and d.rappels @> array[2, 0] and d.libelle like 'Réponse attendue (Bâti Ouest SAS) : Fournir la note%' from public.delais d where d.id = v_d1),
                 '1. … « Réponse attendue (Bâti Ouest SAS) », rappels J-2, J');
  return next ok(p.suivi_id is not null
                 or exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:point:%s:suivi_refuse', v_q1)),
                 '1. … confiée aux relances du socle (suivi), ou, à défaut, l''alerte dit que l''échéance interne la suit');
  return next ok((select statut = 'clos' from public.lorani_points where projet_id = v_projet and nature = 'decision'), '1. une décision naît soldée');

  -- ── 2. Diffusion : le contenu est figé ──
  perform tests.b5_endosser(v_referent);
  update public.lorani_comptes_rendus set statut = 'diffuse' where id = v_cr1;
  perform tests.b5_admin();
  select contenu into c from public.lorani_comptes_rendus where id = v_cr1;
  return next ok(jsonb_array_length(c -> 'nouveaux') = 3 and jsonb_array_length(c -> 'en_suspens') = 0 and (c -> 'cr' ->> 'numero')::integer = 1
                 and (select diffuse_le is not null from public.lorani_comptes_rendus where id = v_cr1),
                 '2. diffusé : contenu figé (3 points nés à ce CR), daté');
  return next ok(exists (select 1 from public.journal_opposable where client_id = v_client and action = 'lorani.cr_diffuse' and objet_id = v_projet::text),
                 '2. … journal : lorani.cr_diffuse');
  perform tests.b5_endosser(v_referent);
  return next throws_ok(format('update public.lorani_comptes_rendus set notes = %L where id = %L', 'réécrit', v_cr1), '55000', null,
                        '2. un CR diffusé ne se réécrit plus');
  perform tests.b5_admin();

  -- ── 3. La réponse arrive : le point est répondu, l'échéance tenue, le suivi clos ──
  perform tests.b5_endosser(v_referent);
  update public.lorani_points set reponse = 'Note transmise par courriel le 02/10' where id = v_q1;
  perform tests.b5_admin();
  select * into p from public.lorani_points where id = v_q1;
  return next ok(p.statut = 'repondu' and p.repondu_le = current_date and (select statut = 'tenu' from public.delais where id = v_d1),
                 '3. la réponse saisie suffit : répondu, daté, échéance tenue');
  return next ok(p.suivi_id is null or (select statut = 'recu' from public.suivis where id = p.suivi_id), '3. … le suivi des relances est clos');

  -- ── 4. Le CR n° 2 : ce qui reste en suspens, ce qui a été soldé ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_comptes_rendus (client_id, entite_id, projet_id, visite_le) values (v_client, v_client, v_projet, current_date) returning id into v_cr2;
  perform tests.b5_admin();
  c := public.lorani_cr_contenu(v_cr2);
  return next ok((c -> 'precedent' ->> 'numero')::integer = 1 and jsonb_array_length(c -> 'nouveaux') = 0
                 and c -> 'en_suspens' @> jsonb_build_array(jsonb_build_object('id', v_a1, 'age_jours', 14, 'ne_au_cr', 1))
                 and jsonb_array_length(c -> 'en_suspens') = 1,
                 '4. CR n° 2 : l''action du CR n° 1 revient en suspens (14 jours) ; la décision ne revient pas');
  return next ok(c -> 'soldes' @> jsonb_build_array(jsonb_build_object('id', v_q1, 'statut', 'repondu', 'reponse', 'Note transmise par courriel le 02/10'))
                 and jsonb_array_length(c -> 'soldes') = 1, '4. … la question répondue est listée comme soldée, avec sa réponse');
  perform tests.b5_endosser(v_referent);
  update public.lorani_comptes_rendus set statut = 'diffuse' where id = v_cr2;
  perform tests.b5_admin();
  return next is((select clos_au_cr from public.lorani_points where id = v_q1), v_cr2, '4. diffusé : la question est soldée au CR n° 2');

  -- ── 5. Le rappel d'une action, par la vraie chaîne ──
  perform private.controler_delais(now());
  r := private.lorani_lectures_passage();
  return next ok((r ->> 'erreurs')::integer = 0, '5. le passage prend le rappel sans erreur : ' || r::text);
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement like format('lorani:point:%s:rappel:%%', v_a1)
                         and titre like '%action non faite (l''équipe) attendue % — Transmettre le plan de calepinage révisé%'),
                 '5. rappel : « action non faite (l''équipe) attendue … »');

  -- ── 6. Garde-fous et droits ──
  perform tests.b5_endosser(v_referent);
  return next throws_ok(format('insert into public.lorani_points (client_id, entite_id, projet_id, intervenant_id, texte) values (%L, %L, %L, %L, %L)',
                               v_client, v_client, v_projet, v_ent_autre, 'Question ailleurs'), '22023', null, '6. un intervenant d''un autre projet est refusé');
  perform tests.b5_admin();
  return next ok(has_table_privilege('authenticated', 'public.lorani_points', 'INSERT') and has_table_privilege('authenticated', 'public.lorani_comptes_rendus', 'UPDATE')
                 and not has_table_privilege('anon', 'public.lorani_points', 'SELECT') and has_function_privilege('authenticated', 'public.lorani_cr_contenu(uuid)', 'EXECUTE'),
                 '6. un membre rédige et met à jour ; le contenu se lit ; anon ne lit rien');
end $f$;

select * from runtests('tests'::name, '^test_b5_11_');
