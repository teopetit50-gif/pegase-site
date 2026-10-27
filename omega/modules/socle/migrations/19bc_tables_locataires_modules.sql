-- 19bc_tables_locataires_modules.sql — toute table d'une organisation des modules est inscrite dans
-- private.tables_locataires (convergence, 27/10/2026 ; plan/CONVERGENCE-BASES.md du dépôt omega-metiers, étape 4).
--
-- Pourquoi : private.exporter_client et private.effacer_client ne parcourent que cette liste. Le relevé du 27/10 sur la
-- recette trouve 62 tables à client_id des modules qui n'y sont pas : CASHD 1, GRP 15, LOC 26, OFFLOAD 16, TIROMA 4.
-- Elles manquaient à l'export d'une organisation (RGPD art. 15 et 20) et à son effacement (art. 17) ; les tables TIROMA,
-- sans cascade vers clients, faisaient même échouer l'effacement à sa dernière ligne (delete from clients).
-- Même défaut, même remède que b6_80 côté métiers (dépôt omega-metiers).
--
-- Pas inscrites, à dessein : filed_conservation, filed_conservation_clients, filed_conservation_purges, le dépôt
-- légal de FILED (a4_40) : il survit à l'effacement de l'organisation jusqu'à son terme, et a son propre export
-- (filed_exporter_conservation). tamila_coffres et tamila_coffre_journal : leur sort est à trancher avec TAM-01.
-- Les gardiens (tests/socle/02, et b6_80 côté métiers) nomment ces exemptions.
--
-- L'ordre d'effacement est 100 ; la boucle d'effacer_client reprend une table qu'une clé étrangère retient.
-- Rejouable : on conflict do nothing. Rien n'est retiré. Aucune fonction nouvelle.

insert into private.tables_locataires (nom, ordre_effacement, note) values
  ('cashd_taux_change', 100, 'cashd (inscrite par le socle 19bc)'),
  ('grp_balances_depots', 100, 'grp (inscrite par le socle 19bc)'),
  ('grp_balances_lignes', 100, 'grp (inscrite par le socle 19bc)'),
  ('grp_contrats', 100, 'grp (inscrite par le socle 19bc)'),
  ('grp_decisions', 100, 'grp (inscrite par le socle 19bc)'),
  ('grp_encours_depots', 100, 'grp (inscrite par le socle 19bc)'),
  ('grp_encours_lignes', 100, 'grp (inscrite par le socle 19bc)'),
  ('grp_encours_plafonds', 100, 'grp (inscrite par le socle 19bc)'),
  ('grp_objectifs', 100, 'grp (inscrite par le socle 19bc)'),
  ('grp_receptions', 100, 'grp (inscrite par le socle 19bc)'),
  ('grp_reciproques_justifs', 100, 'grp (inscrite par le socle 19bc)'),
  ('grp_reglages', 100, 'grp (inscrite par le socle 19bc)'),
  ('grp_reportings', 100, 'grp (inscrite par le socle 19bc)'),
  ('grp_reportings_echeances', 100, 'grp (inscrite par le socle 19bc)'),
  ('grp_sources_demandes', 100, 'grp (inscrite par le socle 19bc)'),
  ('grp_ventes_caisse', 100, 'grp (inscrite par le socle 19bc)'),
  ('loc_anomalies_retour', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_audit_lignes', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_audits', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_avis_contravention', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_cautions', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_contestations', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_controles_conducteur', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_cotes_revente', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_entretiens', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_etats_des_lieux', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_factures_pieces', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_grille_assistance', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_immobilisations', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_incidents', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_passages_peage', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_questions', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_rappels', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_rappels_vehicules', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_releves_constructeur', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_remises', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_responsables_agence', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_sinistres', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_sorties_flotte', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_transferts', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_vehicules_conformite', 100, 'loc (inscrite par le socle 19bc)'),
  ('loc_vehicules_economie', 100, 'loc (inscrite par le socle 19bc)'),
  ('offload_achats', 100, 'offload (inscrite par le socle 19bc)'),
  ('offload_affaires', 100, 'offload (inscrite par le socle 19bc)'),
  ('offload_arretes', 100, 'offload (inscrite par le socle 19bc)'),
  ('offload_comptes', 100, 'offload (inscrite par le socle 19bc)'),
  ('offload_contacts', 100, 'offload (inscrite par le socle 19bc)'),
  ('offload_contrats', 100, 'offload (inscrite par le socle 19bc)'),
  ('offload_echeances', 100, 'offload (inscrite par le socle 19bc)'),
  ('offload_equipements', 100, 'offload (inscrite par le socle 19bc)'),
  ('offload_exclusions', 100, 'offload (inscrite par le socle 19bc)'),
  ('offload_interventions', 100, 'offload (inscrite par le socle 19bc)'),
  ('offload_rapprochements', 100, 'offload (inscrite par le socle 19bc)'),
  ('offload_reglages', 100, 'offload (inscrite par le socle 19bc)'),
  ('offload_regles', 100, 'offload (inscrite par le socle 19bc)'),
  ('offload_reprises', 100, 'offload (inscrite par le socle 19bc)'),
  ('offload_signaux', 100, 'offload (inscrite par le socle 19bc)'),
  ('offload_taches', 100, 'offload (inscrite par le socle 19bc)'),
  ('tiroma_absences_membres', 100, 'tiroma (inscrite par le socle 19bc)'),
  ('tiroma_appels', 100, 'tiroma (inscrite par le socle 19bc)'),
  ('tiroma_contacts', 100, 'tiroma (inscrite par le socle 19bc)'),
  ('tiroma_reponses_rappels', 100, 'tiroma (inscrite par le socle 19bc)')
on conflict (nom) do nothing;

-- Contrôle : chaque table de ce lot est inscrite et porte client_id ; il n'en reste aucune hors exemptions.
do $$
declare v_manque text;
begin
  select string_agg(c.relname, ', ' order by c.relname) into v_manque
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
    and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'client_id' and not a.attisdropped)
    and not exists (select 1 from private.tables_locataires t where t.nom = c.relname)
    and c.relname not in ('filed_conservation', 'filed_conservation_clients', 'filed_conservation_purges',
                          'tamila_coffres', 'tamila_coffre_journal');
  if v_manque is not null then
    raise exception '19bc : tables à client_id encore hors de tables_locataires : %', v_manque;
  end if;
end $$;
