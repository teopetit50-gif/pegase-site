-- B3-06 — Le relevé courant : annulation, honoré, manqué, présumé honoré, créneau à sauver, garde-fou (étapes 9 à 11).
-- Après 00_aides_b3.sql, 00b_export_logosw.sql, b3_01, b3_02 et b3_08. runtests() annule tout.

create or replace function tests.test_b3_06_releve_courant() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  r jsonb;
  v_branchement uuid;
  v_depot jsonb;
  v_bilan jsonb;
  v_rdv uuid;
  v_ev bigint;
  v_creneaux jsonb;
  c jsonb;
begin
  r := tests.b3_cabinet_releve('initial');
  v_branchement := (r ->> 'branchement')::uuid;
  select id into v_rdv from public.tiroma_rendez_vous where entite_id = entite and source_ref = 'R010';

  -- 9/10. Le relevé du lendemain : R010 a disparu, R003 est honoré, R005 manqué, Q01 a un acte le jour de R004.
  v_depot := tests.b3_deposer_releve(v_branchement, array['agenda', 'actes'], 'courant', 'b3:courant');
  v_bilan := tests.b3_traiter();
  return next ok((v_bilan ->> 'echecs')::integer = 0, format('relevé courant traité (%s fait(s), %s échec(s))', v_bilan ->> 'faits', v_bilan ->> 'echecs'));
  return next is(tests.compter('public', 'tiroma_releves', format('entite_id = %L', entite)), 2::bigint, 'deux relevés Tiroma');
  return next is((select statut || '/' || mode from public.tiroma_releves where entite_id = entite order by recu_le desc limit 1), 'ok/complet', 'le second est « ok », complet');
  return next is((select statut from public.tiroma_rendez_vous where id = v_rdv), 'supprime', 'R010 disparu de l''agenda est « supprimé »');
  return next ok((select disparu_le is not null from public.tiroma_rendez_vous where id = v_rdv), 'et daté');
  select id into v_ev from public.tiroma_evenements_agenda where entite_id = entite and rendez_vous_id = v_rdv and type = 'annulation';
  return next ok(v_ev is not null, 'un événement « annulation » est écrit pour R010');
  return next ok((select (avant ->> 'debut') is not null and apres is null from public.tiroma_evenements_agenda where id = v_ev), 'il porte le créneau libéré (avant), rien après');
  return next is((select statut from public.tiroma_rendez_vous where entite_id = entite and source_ref = 'R003'), 'honore', 'R003 est honoré');
  return next ok(exists (select 1 from public.tiroma_evenements_agenda e join public.tiroma_rendez_vous x on x.id = e.rendez_vous_id where x.entite_id = entite and x.source_ref = 'R003' and e.type = 'honore'), 'événement « honoré » pour R003');
  return next is((select statut from public.tiroma_rendez_vous where entite_id = entite and source_ref = 'R005'), 'manque', 'R005 est manqué');
  return next ok(exists (select 1 from public.tiroma_evenements_agenda e join public.tiroma_rendez_vous x on x.id = e.rendez_vous_id where x.entite_id = entite and x.source_ref = 'R005' and e.type = 'absence'), 'événement « absence » pour R005');
  return next is((select statut || '/' || presume from public.tiroma_rendez_vous where entite_id = entite and source_ref = 'R004'), 'prevu/honore', 'R004, prévu sans statut mais avec un acte le même jour, est présumé honoré');
  return next ok(exists (select 1 from public.tiroma_evenements_agenda e join public.tiroma_rendez_vous x on x.id = e.rendez_vous_id where x.entite_id = entite and x.source_ref = 'R004' and e.type = 'presume_honore'), 'événement « présumé honoré » pour R004');
  return next is((select etat from public.tiroma_capacites where entite_id = entite and domaine = 'statuts_manques'), 'tenu', 'capacité : le logiciel tient les statuts « manqué »');

  -- Le journal des événements est immuable.
  return next throws_ok(format('update public.tiroma_evenements_agenda set type = ''honore'' where id = %s', v_ev), '42501', null, 'un événement ne se modifie pas (42501)');
  return next throws_ok(format('del' || 'ete from public.tiroma_evenements_agenda where id = %s', v_ev), '42501', null, 'ni ne s''efface (42501)');

  -- Le créneau à sauver, par la porte, sous le jeton du titulaire.
  perform tests.b3_endosser('gerant');
  v_creneaux := public.tiroma_creneaux_a_sauver(banc, entite);
  return next is(jsonb_array_length(v_creneaux), 1, 'un créneau libéré dans l''horizon');
  c := v_creneaux -> 0;
  return next is(c ->> 'type', 'annulation', 'c''est une annulation');
  return next ok((c ->> 'libre')::boolean and (c ->> 'minutes')::integer = 45 and c ->> 'fauteuil_nom' = 'Fauteuil 2' and c ->> 'praticien_nom' = 'Dr Lacour',
                 format('45 minutes libres, fauteuil 2, Dr Lacour (%s)', c ->> 'debut'));
  return next is(c ->> 'famille', 'prothese_preparation', 'famille du rendez-vous annulé : prothèse — préparation');
  return next is(jsonb_array_length(c -> 'candidats'), 3, 'trois candidats (nb_propositions)');
  return next is(c #>> '{candidats,0,origine}' || ':' || (c #>> '{candidats,0,patient_nom}'), 'plan:Marguerite Delannoy', '1. le plan accepté de Marguerite Delannoy');
  return next is(c #>> '{candidats,1,origine}' || ':' || (c #>> '{candidats,1,patient_nom}'), 'attente:Kévin Bazile', '2. la liste d''attente : Kévin Bazile');
  return next is(c #>> '{candidats,2,origine}' || ':' || (c #>> '{candidats,2,patient_nom}'), 'controle:Rosalie Nestor', '3. le contrôle dû : Rosalie Nestor');
  return next ok(c #>> '{candidats,0,plan_id}' = (select id::text from public.tiroma_plans where entite_id = entite and source_ref = 'D001'), 'le candidat 1 cite le plan D001');
  -- Le collaborateur ne voit que ses créneaux ; daf2 rien.
  perform tests.b3_endosser('daf');
  return next is(jsonb_array_length(public.tiroma_creneaux_a_sauver(banc, entite)), 1, 'le collaborateur (périmètre cabinet) voit le créneau');
  perform tests.b3_endosser('daf2');
  return next throws_ok(format('select public.tiroma_creneaux_a_sauver(%L, %L)', banc, entite), '42501', null, 'daf2, sans profil : « pas dans votre périmètre » (42501)');
  perform tests.redevenir_admin();

  -- 11. Le garde-fou : une journée de dix rendez-vous entièrement vidée en un relevé.
  v_depot := tests.b3_deposer_releve(v_branchement, array['agenda'], 'vide', 'b3:vide');
  v_bilan := tests.b3_traiter();
  return next is((select statut from public.tiroma_releves where entite_id = entite order by recu_le desc limit 1), 'douteux', 'le relevé qui vide une journée est « douteux »');
  return next ok((select raison like '%entièrement vidé%' from public.tiroma_releves where entite_id = entite order by recu_le desc limit 1),
                 'la raison dit la journée vidée : ' || coalesce((select left(raison, 120) from public.tiroma_releves where entite_id = entite order by recu_le desc limit 1), ''));
  return next is((select releves_douteux_suite from public.tiroma_cabinets where entite_id = entite), 1::smallint, 'releves_douteux_suite = 1');
  return next is(tests.compter('public', 'tiroma_rendez_vous', format('entite_id = %L and statut = ''supprime''', entite)), 1::bigint, 'aucun rendez-vous supplémentaire n''a été supprimé (R010 seul)');
  return next ok(exists (select 1 from public.journal_opposable where client_id = banc and action = 'tiroma.releve_douteux'), 'journal : « tiroma.releve_douteux »');
  return next ok(exists (select 1 from public.instantanes i join public.branchements_jeux bj on bj.id = i.jeu_id where bj.branchement_id = v_branchement and bj.code = 'agenda' and i.statut = 'douteux'),
                 'l''instantané de l''agenda est marqué douteux dans le socle');
  -- Puis un relevé normal : le compteur retombe.
  v_depot := tests.b3_deposer_releve(v_branchement, array['agenda'], 'courant', 'b3:courant2');
  v_bilan := tests.b3_traiter();
  return next is((select statut from public.tiroma_releves where entite_id = entite order by recu_le desc limit 1), 'ok', 'le relevé suivant est « ok »');
  return next is((select releves_douteux_suite from public.tiroma_cabinets where entite_id = entite), 0::smallint, 'releves_douteux_suite retombe à 0');
end $f$;

select * from runtests('tests'::name, '^test_b3_06_');
