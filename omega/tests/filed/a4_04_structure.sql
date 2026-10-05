-- Tests A4 — la structure posée par les lots 4 à 6 : tables, RLS, commentaires, effacement, indicateurs, fonctions pures.
-- Exécutable tel quel.
begin;
do $$
declare t text; v_tables text[] := array['filed_exercices', 'filed_plan_comptable', 'filed_centres_cout', 'filed_imputations', 'filed_imputations_apprises',
  'filed_charges_recurrentes', 'filed_charges_attendues', 'filed_factures_exercices', 'filed_verifications_tiers', 'filed_archives', 'filed_reglements',
  'filed_litiges', 'filed_exports_programmes', 'filed_exports', 'filed_circuits', 'filed_validations', 'filed_factures_annexes'];
  c text;
begin
  foreach t in array v_tables loop
    assert to_regclass('public.' || t) is not null, t || ' existe';
    assert (select relrowsecurity from pg_class where oid = ('public.' || t)::regclass), 'RLS activée sur ' || t;
    assert obj_description(('public.' || t)::regclass, 'pg_class') is not null, 'commentaire sur ' || t;
    assert exists (select 1 from pg_policies where schemaname = 'public' and tablename = t), 'politique de lecture sur ' || t;
    assert exists (select 1 from private.tables_locataires where nom = t), t || ' inscrite à l''effacement de l''organisation';
    assert not has_table_privilege('authenticated', 'public.' || t, 'INSERT'), 'authenticated n''écrit pas directement dans ' || t;
  end loop;
  foreach t in array array['filed_imputations', 'filed_factures_exercices', 'filed_archives', 'filed_reglements', 'filed_litiges', 'filed_validations', 'filed_factures_annexes'] loop
    assert exists (select 1 from private.tables_objets where nom = t and objet_type = 'filed_document' and colonne = 'document_id'), t || ' suit le document';
  end loop;
  assert (select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.filed_factures'::regclass and conname = 'filed_factures_statut_v2') like '%comptabilisee%', 'statut étendu (v2)';
  foreach c in array array['filed.engage_mois', 'filed.decaissement_30j', 'filed.decaissement_60j', 'filed.delai_traitement', 'filed.pieces_bloquees', 'filed.pieces_litige', 'filed.pieces_attente', 'filed.charges_manquantes'] loop
    assert exists (select 1 from public.indicateurs where code = c and version = 1 and en_service), 'indicateur ' || c;
  end loop;
  -- Fonctions pures
  assert private.filed_pas_periodicite('mensuelle') = interval '1 month' and private.filed_pas_periodicite('trimestrielle') = interval '3 months' and private.filed_pas_periodicite('x') is null, 'pas de périodicité';
  assert private.filed_empreinte_archive('a', 'b', 'R', 1, '00000000-0000-0000-0000-000000000001') ~ '^[0-9a-f]{64}$', 'empreinte SHA-256';
  assert private.filed_empreinte_archive('a', 'b', 'R', 1, '00000000-0000-0000-0000-000000000001') <> private.filed_empreinte_archive('a', 'b', 'R', 2, '00000000-0000-0000-0000-000000000001'), 'une autre version, une autre empreinte';
  assert private.filed_csv_cellule(1234.50::numeric) = '1234,50' and private.filed_csv_cellule('a "b"'::text) = '"a ""b"""' and private.filed_csv_cellule(date '2026-10-05') = '05/10/2026' and private.filed_csv_cellule(null::text) = '', 'cellules CSV';
  assert private.filed_prochain_export('mensuelle', 5, date '2026-10-05') = date '2026-11-05' and private.filed_prochain_export('mensuelle', 10, date '2026-10-05') = date '2026-10-10', 'prochain export mensuel';
  assert private.filed_prochain_export('hebdomadaire', 1, date '2026-10-05') = date '2026-10-12' and private.filed_prochain_export('hebdomadaire', 3, date '2026-10-05') = date '2026-10-07', 'prochain export hebdomadaire';
  -- Les branchements
  assert pg_get_functiondef('private.filed_controler_facture'::regproc) like '%filed_apres_controle%', 'filed_controler_facture branché';
  assert pg_get_functiondef('private.filed_traiter'::regproc) like '%filed_balayer_lot4%', 'filed_traiter branché';
  assert pg_get_functiondef('private.filed_executer_decision'::regproc) like '%filed_decider_facture%', 'filed_executer_decision branché';
  assert pg_get_functiondef('private.filed_rapprocher_ligne'::regproc) like '%dans_tolerance%', 'filed_rapprocher_ligne branché';
  raise notice 'STRUCTURE : tous les contrôles passent.';
end $$;
rollback;
