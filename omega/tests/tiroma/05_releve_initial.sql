-- B3-05 — Le premier relevé : l'export Logos_w d'exemple entre par les portes du socle et devient le cabinet
-- (étape 7 du scénario, omega/NOTES-B3.md). Après 00_aides_b3.sql, 00b_export_logosw.sql, b3_01 et b3_08.
-- runtests() annule tout.

create or replace function tests.test_b3_05_releve_initial() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  j date := tests.b3_jour();
  r jsonb;
  v_releve uuid;
  n_agenda integer := jsonb_array_length(tests.b3_lignes('agenda', 'initial'));
begin
  r := tests.b3_cabinet_releve('initial');
  return next ok((r #>> '{bilan,echecs}')::integer = 0 and (r #>> '{bilan,faits}')::integer >= 1,
                 format('tiroma_traiter_travaux : %s fait(s), %s échec(s)', r #>> '{bilan,faits}', r #>> '{bilan,echecs}'));
  return next ok(not exists (select 1 from public.travaux t where t.client_id = banc and t.module = 'tiroma' and t.etat = 'echec'),
                 'aucun travail Tiroma en échec' || coalesce((select ' : ' || left(t.erreur, 200) from public.travaux t where t.client_id = banc and t.module = 'tiroma' and t.etat = 'echec' limit 1), ''));
  return next ok(not exists (select 1 from public.instantanes i join public.branchements b on b.id = i.branchement_id
                             where b.client_id = banc and b.module = 'tiroma' and i.statut not in ('applique', 'identique')),
                 'tous les instantanés sont appliqués' || coalesce((select ' (sinon : ' || string_agg(i.statut || ' ' || coalesce(i.motif, ''), ' ; ') || ')'
                   from public.instantanes i join public.branchements b on b.id = i.branchement_id where b.client_id = banc and b.module = 'tiroma' and i.statut not in ('applique', 'identique')), ''));

  select x.id into v_releve from public.tiroma_releves x where x.client_id = banc and x.entite_id = entite order by x.recu_le desc limit 1;
  return next ok(v_releve is not null, 'une ligne tiroma_releves existe');
  return next is((select statut || '/' || mode from public.tiroma_releves where id = v_releve), 'ok/reprise', 'le relevé est « ok », en reprise initiale');
  return next ok((select compteurs ? 'agenda' and compteurs ? 'patients' and compteurs ? 'capacites' from public.tiroma_releves where id = v_releve),
                 'les compteurs du relevé portent agenda, patients, capacites');
  return next is((select statut || '/' || releves_douteux_suite from public.tiroma_cabinets where client_id = banc and entite_id = entite), 'actif/0',
                 'le cabinet est actif, aucun relevé douteux');
  return next ok((select dernier_releve_ok_le is not null from public.tiroma_cabinets where client_id = banc and entite_id = entite), 'dernier_releve_ok_le est posé');

  -- Ce que l'export a créé.
  return next is(tests.compter('public', 'tiroma_patients', format('entite_id = %L', entite)), 30::bigint, '30 patients (10 du récit, 20 d''essai)');
  return next is(tests.compter('public', 'tiroma_praticiens', format('entite_id = %L and source_ref is not null', entite)), 2::bigint,
                 'les deux praticiens posés par le titulaire sont reconnus par leur nom (source_ref posé)');
  return next is(tests.compter('public', 'tiroma_praticiens', format('entite_id = %L', entite)), 2::bigint, 'aucun praticien en double');
  return next is(tests.compter('public', 'tiroma_fauteuils', format('entite_id = %L and source_ref is not null', entite)), 3::bigint,
                 'les trois fauteuils sont reconnus par les salles de l''agenda');
  return next is(tests.compter('public', 'tiroma_types_rdv', format('entite_id = %L', entite)), 9::bigint, '9 types de rendez-vous');
  return next is((select statut from public.tiroma_types_rdv where entite_id = entite and libelle_source = 'RDV LV'), 'a_classer', '« RDV LV » est à classer');
  return next is((select famille || '/' || necessite_labo || '/' || statut from public.tiroma_types_rdv where entite_id = entite and libelle_source = 'Couronne — pose'),
                 'prothese_pose/true/propose', '« Couronne — pose » : prothèse — pose, laboratoire requis, proposé par la règle');
  return next is((select famille from public.tiroma_types_rdv where entite_id = entite and libelle_source = 'Implant — chirurgie'), 'implant_chirurgie', '« Implant — chirurgie » classé');
  return next is((select famille from public.tiroma_types_rdv where entite_id = entite and libelle_source = 'Réunion d''équipe'), 'personnel', '« Réunion d''équipe » est du temps personnel');
  return next is(tests.compter('public', 'tiroma_rendez_vous', format('entite_id = %L', entite)), n_agenda::bigint, format('%s rendez-vous, autant que de lignes dans l''export', n_agenda));
  return next is((select statut from public.tiroma_rendez_vous where entite_id = entite and source_ref = 'R010'), 'prevu', 'R010 (demain 9 h) est prévu');
  return next ok((select r.fauteuil_id = f.id from public.tiroma_rendez_vous r join public.tiroma_fauteuils f on f.entite_id = entite and f.nom = 'Fauteuil 2'
                  where r.entite_id = entite and r.source_ref = 'R010'), 'R010 est sur le fauteuil 2');
  return next ok((select (r.debut at time zone 'America/Guadeloupe')::time = time '09:00' from public.tiroma_rendez_vous r where r.entite_id = entite and r.source_ref = 'R010'),
                 'R010 commence à 9 h, heure du cabinet (b3_08 : les heures de l''export sont locales)');
  return next is(tests.compter('public', 'tiroma_evenements_agenda', format('entite_id = %L', entite)), 0::bigint, 'une reprise initiale ne crée aucun événement d''agenda');
  return next is(tests.compter('public', 'tiroma_plans', format('entite_id = %L', entite)), 5::bigint, '5 plans de traitement');
  return next is((select statut || '/' || signe_le::text || '/' || signature_source from public.tiroma_plans where entite_id = entite and source_ref = 'D001'),
                 format('signe/%s/logiciel', j - 42), 'D001 est signé il y a 42 jours, date lue dans le logiciel');
  return next is((select statut from public.tiroma_plans where entite_id = entite and source_ref = 'D002'), 'commence', 'D002 est commencé');
  return next is((select statut from public.tiroma_plans where entite_id = entite and source_ref = 'D005'), 'presente', 'D005 est présenté');
  return next is((select panier from public.tiroma_plans where entite_id = entite and source_ref = 'D001'), 'maitrise', 'le panier « Maîtrisé » est lu');
  return next is(tests.compter('public', 'tiroma_plan_actes', format('entite_id = %L', entite)), 9::bigint, '9 lignes de plan');
  return next is((select a.statut || '/' || a.fait_le::text from public.tiroma_plan_actes a join public.tiroma_plans p on p.id = a.plan_id where p.entite_id = entite and p.source_ref = 'D002' and a.rang = 1),
                 format('fait/%s', j - 35), 'D002 rang 1 est fait (date lue)');
  return next is((select a.statut from public.tiroma_plan_actes a join public.tiroma_plans p on p.id = a.plan_id where p.entite_id = entite and p.source_ref = 'D002' and a.rang = 2),
                 'a_faire', 'D002 rang 2 reste à faire');
  return next is((select a.famille from public.tiroma_plan_actes a join public.tiroma_plans p on p.id = a.plan_id where p.entite_id = entite and p.source_ref = 'D001' and a.rang = 1),
                 'prothese_preparation', 'D001 rang 1 est classé prothèse — préparation');
  return next is(tests.compter('public', 'tiroma_actes_realises', format('entite_id = %L', entite)), 2::bigint, '2 actes réalisés');
  return next ok((select a.plan_id = p.id and a.rendez_vous_id = r.id from public.tiroma_actes_realises a
                  join public.tiroma_plans p on p.entite_id = entite and p.source_ref = 'D002'
                  join public.tiroma_rendez_vous r on r.entite_id = entite and r.source_ref = 'R001'
                  where a.entite_id = entite and a.source_ref = 'A001'), 'A001 est lié à son plan et à son rendez-vous');
  return next is((select w.statut || '/' || (w.rendez_vous_pose_id = r.id)::text from public.tiroma_travaux_labo w join public.tiroma_rendez_vous r on r.entite_id = entite and r.source_ref = 'R011'
                  where w.entite_id = entite and w.source_ref = 'L001'), 'en_fabrication/true', 'la fiche de laboratoire L001 est en fabrication, liée à la pose R011');
  return next is(tests.compter('public', 'tiroma_stock', format('entite_id = %L and famille = ''implant''', entite)), 2::bigint, '2 références d''implants en stock');
  return next is((select statut from public.tiroma_ententes_odf where entite_id = entite and source_ref = 'O001'), 'accordee', 'l''entente ODF O001 est accordée');
  return next is(tests.compter('public', 'tiroma_liste_attente', format('entite_id = %L and retire_le is null', entite)), 2::bigint, '2 patients en liste d''attente');
  return next is((select dernier_controle_le from public.tiroma_patients where entite_id = entite and source_ref = 'P003'), j - 430, 'Nestor : dernier contrôle il y a 430 jours (bilan lu)');
  return next ok((select prochain_rdv_le is not null from public.tiroma_patients where entite_id = entite and source_ref = 'P008'), 'Dorville : prochain rendez-vous posé par les faits patients');
  return next is(tests.compter('public', 'tiroma_capacites', format('entite_id = %L', entite)), 6::bigint, 'six capacités mesurées (laboratoire, manqués, signatures, familles, stock, dates de création)');
  return next is((select etat from public.tiroma_capacites where entite_id = entite and domaine = 'stock'), 'tenu', 'le stock est tenu');

  -- Le journal opposable, lu par le gérant.
  perform tests.b3_endosser('gerant');
  return next ok(tests.compter('public', 'journal_opposable', format('client_id = %L and action = ''tiroma.reprise_initiale''', banc)) >= 10,
                 'le journal porte une ligne « reprise_initiale » par jeu');
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L and action = ''tiroma.releve_termine''', banc)), 1::bigint, 'et une ligne « releve_termine »');
  -- Les périmètres de lecture.
  return next is(tests.compter('public', 'tiroma_rendez_vous', format('entite_id = %L', entite)), n_agenda::bigint, 'le titulaire voit tous les rendez-vous');
  perform tests.b3_endosser('referent');
  return next is(tests.compter('public', 'tiroma_patients', format('entite_id = %L', entite)), 30::bigint, 'l''assistante voit les patients du cabinet');
  return next is(tests.compter('public', 'tiroma_plans', format('entite_id = %L', entite)), 5::bigint, 'et les plans');
  return next is(tests.compter('public', 'tiroma_actes_realises', format('entite_id = %L', entite)), 0::bigint, 'mais pas la production (actes réalisés)');
  perform tests.b3_endosser('daf');
  return next is(tests.compter('public', 'tiroma_patients', format('entite_id = %L', entite)), 30::bigint, 'le collaborateur (périmètre cabinet) voit les patients');
  return next is(tests.compter('public', 'tiroma_actes_realises', format('entite_id = %L', entite)), 1::bigint, 'et seulement sa production (A001, Dr Rousseau)');
  perform tests.b3_endosser('daf2');
  return next is(tests.compter('public', 'tiroma_patients', format('entite_id = %L', entite)), 0::bigint, 'daf2, sans profil, ne voit aucun patient');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b3_05_');
