-- Extraits du socle Omega pour Tiroma (cabinets de soins, rendez-vous) — préfixe tiroma_
-- Recette ygwbgpowzlbdaajlsqkn, photographie du 5 octobre 2026, 22 h 30, par le coordinateur.
-- Ce fichier NE S'EXÉCUTE PAS : il sert à écrire des « create or replace », des écrans et des tests.
-- Les ouvriers n'appellent jamais Supabase ; ce qui manque ici se demande au coordinateur.
-- Contenu : 23 tables, 0 vues, 92 fonctions, 3 crons.


-- ══════════════════ TABLES ══════════════════

-- ═══ TABLE public.tiroma_actes_realises
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  source_ref text not null
  patient_id uuid not null
  date date not null
  code text
  libelle text
  dents smallint[]
  praticien_id uuid
  montant numeric(12,2)
  plan_id uuid
  rendez_vous_id uuid
  empreinte text
  vu_premier_le timestamp with time zone not null default now()
  vu_dernier_le timestamp with time zone not null default now()
  constraint tiroma_actes_realises_client_id_entite_id_patient_id_fkey FOREIGN KEY (client_id, entite_id, patient_id) REFERENCES tiroma_patients(client_id, entite_id, id) ON DELETE CASCADE
  constraint tiroma_actes_realises_client_id_entite_id_plan_id_fkey FOREIGN KEY (client_id, entite_id, plan_id) REFERENCES tiroma_plans(client_id, entite_id, id) ON DELETE SET NULL (plan_id)
  constraint tiroma_actes_realises_client_id_entite_id_praticien_id_fkey FOREIGN KEY (client_id, entite_id, praticien_id) REFERENCES tiroma_praticiens(client_id, entite_id, id) ON DELETE SET NULL (praticien_id)
  constraint tiroma_actes_realises_client_id_entite_id_rendez_vous_id_fkey FOREIGN KEY (client_id, entite_id, rendez_vous_id) REFERENCES tiroma_rendez_vous(client_id, entite_id, id) ON DELETE SET NULL (rendez_vous_id)
  constraint tiroma_actes_realises_code_check CHECK (((char_length(code) >= 1) AND (char_length(code) <= 20)))
  constraint tiroma_actes_realises_dents_check CHECK ((dents <@ ARRAY[(11)::smallint, (12)::smallint, (13)::smallint, (14)::smallint, (15)::smallint, (16)::smallint, (17)::smallint, (18)::smallint, (21)::smallint, (22)::smallint, (23)::smallint, (24)::smallint, (25)::smallint, (26)::smallint, (27)::smallint, (28)::smallint, (31)::smallint, (32)::smallint, (33)::smallint, (34)::smallint, (35)::smallint, (36)::smallint, (37)::smallint, (38)::smallint, (41)::smallint, (42)::smallint, (43)::smallint, (44)::smallint, (45)::smallint, (46)::smallint, (47)::smallint, (48)::smallint, (51)::smallint, (52)::smallint, (53)::smallint, (54)::smallint, (55)::smallint, (61)::smallint, (62)::smallint, (63)::smallint, (64)::smallint, (65)::smallint, (71)::smallint, (72)::smallint, (73)::smallint, (74)::smallint, (75)::smallint, (81)::smallint, (82)::smallint, (83)::smallint, (84)::smallint, (85)::smallint]))
  constraint tiroma_actes_realises_empreinte_check CHECK ((empreinte ~ '^[0-9a-f]{64}$'::text))
  constraint tiroma_actes_realises_libelle_check CHECK (((char_length(libelle) >= 1) AND (char_length(libelle) <= 200)))
  constraint tiroma_actes_realises_montant_check CHECK ((montant >= (0)::numeric))
  constraint tiroma_actes_realises_pkey PRIMARY KEY (id)
  constraint tiroma_actes_realises_source_ref_check CHECK (((char_length(source_ref) >= 1) AND (char_length(source_ref) <= 200)))
  constraint tiroma_actes_realises_source_une_fois UNIQUE (client_id, entite_id, source_ref)
  policy "tiroma : la production au titulaire, a chacun la sienne" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND ((entite_id IN ( SELECT private.tiroma_cabinets_production() AS tiroma_cabinets_production)) OR ((entite_id, praticien_id) IN ( SELECT p.entite_id,
    p.praticien_id
   FROM private.tiroma_praticiens_production() p(entite_id, praticien_id)))))) with check ()
  CREATE TRIGGER tiroma_actes_realises_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tiroma_actes_realises FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('+date', '+praticien_id', '+montant', '+plan_id', '+rendez_vous_id')
  grants authenticated: SELECT

-- ═══ TABLE public.tiroma_cabinets
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  logiciel text not null
  logiciel_version text
  heure_point time without time zone not null default '07:00:00'::time without time zone
  perimetre_partage text not null default 'cabinet'::text
  mode text not null default 'a_blanc'::text
  mode_depuis timestamp with time zone not null default now()
  statut text not null default 'installation'::text
  dernier_releve_le timestamp with time zone
  dernier_releve_ok_le timestamp with time zone
  releves_douteux_suite smallint not null default 0
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint tiroma_cabinets_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id) ON DELETE CASCADE
  constraint tiroma_cabinets_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint tiroma_cabinets_client_id_id_key UNIQUE (client_id, id)
  constraint tiroma_cabinets_heure_point_check CHECK (((heure_point >= '05:00:00'::time without time zone) AND (heure_point <= '11:00:00'::time without time zone)))
  constraint tiroma_cabinets_logiciel_check CHECK ((logiciel = ANY (ARRAY['logosw'::text, 'julie'::text, 'veasy'::text, 'weclever'::text, 'trophy'::text, 'desmos'::text, 'autre'::text])))
  constraint tiroma_cabinets_logiciel_version_check CHECK (((char_length(logiciel_version) >= 1) AND (char_length(logiciel_version) <= 60)))
  constraint tiroma_cabinets_mode_check CHECK ((mode = ANY (ARRAY['a_blanc'::text, 'reel'::text])))
  constraint tiroma_cabinets_perimetre_partage_check CHECK ((perimetre_partage = ANY (ARRAY['cabinet'::text, 'praticien'::text])))
  constraint tiroma_cabinets_pkey PRIMARY KEY (id)
  constraint tiroma_cabinets_releves_douteux_suite_check CHECK ((releves_douteux_suite >= 0))
  constraint tiroma_cabinets_statut_check CHECK ((statut = ANY (ARRAY['installation'::text, 'actif'::text, 'coupe'::text, 'clos'::text])))
  constraint tiroma_cabinets_une_fois UNIQUE (client_id, entite_id)
  policy "tiroma : le titulaire regle son cabinet" UPDATE to authenticated using (private.tiroma_est_titulaire(client_id, entite_id)) with check (private.tiroma_est_titulaire(client_id, entite_id))
  policy "tiroma : les profils du cabinet le voient" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (entite_id IN ( SELECT private.tiroma_cabinets_ou(ARRAY['titulaire'::text, 'collaborateur'::text, 'assistante'::text, 'direction'::text]) AS tiroma_cabinets_ou)))) with check ()
  CREATE TRIGGER tiroma_cabinets_maj_le BEFORE UPDATE ON public.tiroma_cabinets FOR EACH ROW EXECUTE FUNCTION private.tiroma_maj_le()
  CREATE TRIGGER tiroma_cabinets_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tiroma_cabinets FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('dernier_releve_le', 'maj_le')
  grants authenticated: SELECT,UPDATE

-- ═══ TABLE public.tiroma_capacites
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  domaine text not null
  etat text not null
  mesure jsonb not null default '{}'::jsonb
  calcule_le timestamp with time zone not null default now()
  constraint tiroma_capacites_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES tiroma_cabinets(client_id, entite_id) ON DELETE CASCADE
  constraint tiroma_capacites_domaine_check CHECK ((domaine ~ '^[a-z][a-z_]{2,40}$'::text))
  constraint tiroma_capacites_etat_check CHECK ((etat = ANY (ARRAY['tenu'::text, 'partiel'::text, 'non_tenu'::text, 'inconnu'::text])))
  constraint tiroma_capacites_pkey PRIMARY KEY (id)
  constraint tiroma_capacites_une_fois UNIQUE (client_id, entite_id, domaine)
  policy "tiroma : les profils voient les capacites" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (entite_id IN ( SELECT private.tiroma_cabinets_ou(ARRAY['titulaire'::text, 'collaborateur'::text, 'assistante'::text, 'direction'::text]) AS tiroma_cabinets_ou)))) with check ()
  CREATE TRIGGER tiroma_capacites_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tiroma_capacites FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('calcule_le')
  grants authenticated: SELECT

-- ═══ TABLE public.tiroma_effaces
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  empreinte_ref text not null
  efface_le timestamp with time zone not null default now()
  constraint tiroma_effaces_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES tiroma_cabinets(client_id, entite_id) ON DELETE CASCADE
  constraint tiroma_effaces_empreinte_ref_check CHECK ((empreinte_ref ~ '^[0-9a-f]{64}$'::text))
  constraint tiroma_effaces_pkey PRIMARY KEY (id)
  constraint tiroma_effaces_une_fois UNIQUE (client_id, entite_id, empreinte_ref)

  CREATE TRIGGER tiroma_effaces_tracer AFTER INSERT OR DELETE ON public.tiroma_effaces FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('+efface_le')
  grants authenticated: aucun

-- ═══ TABLE public.tiroma_ententes_odf
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  source_ref text
  patient_id uuid not null
  demande_le date
  accord_le date
  accord_par_silence boolean not null default false
  debut_le date
  semestre_courant smallint
  semestre_fin_le date
  fin_le date
  statut text not null
  empreinte text
  vu_dernier_le timestamp with time zone
  maj_le timestamp with time zone not null default now()
  constraint tiroma_ententes_odf_client_id_entite_id_patient_id_fkey FOREIGN KEY (client_id, entite_id, patient_id) REFERENCES tiroma_patients(client_id, entite_id, id) ON DELETE CASCADE
  constraint tiroma_ententes_odf_empreinte_check CHECK ((empreinte ~ '^[0-9a-f]{64}$'::text))
  constraint tiroma_ententes_odf_pkey PRIMARY KEY (id)
  constraint tiroma_ententes_odf_semestre_courant_check CHECK (((semestre_courant >= 0) AND (semestre_courant <= 12)))
  constraint tiroma_ententes_odf_source_ref_check CHECK (((char_length(source_ref) >= 1) AND (char_length(source_ref) <= 200)))
  constraint tiroma_ententes_odf_source_une_fois UNIQUE (client_id, entite_id, source_ref)
  constraint tiroma_ententes_odf_statut_check CHECK ((statut = ANY (ARRAY['demandee'::text, 'accordee'::text, 'commencee'::text, 'terminee'::text, 'abandonnee'::text, 'refusee'::text])))
  policy "tiroma : on voit les ententes des patients qu'on voit" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (patient_id IN ( SELECT pa.id
   FROM tiroma_patients pa)))) with check ()
  CREATE TRIGGER tiroma_ententes_odf_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tiroma_ententes_odf FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('+statut', '+demande_le', '+accord_le', '+accord_par_silence', '+debut_le', '+semestre_courant', '+fin_le')
  grants authenticated: SELECT

-- ═══ TABLE public.tiroma_evenements_agenda
  id bigint not null
  client_id uuid not null
  entite_id uuid not null
  rendez_vous_id uuid
  patient_id uuid
  type text not null
  avant jsonb
  apres jsonb
  detecte_le timestamp with time zone not null default now()
  releve_id uuid
  cle_idempotence text not null
  constraint tiroma_evenements_agenda_cle_idempotence_check CHECK (((char_length(cle_idempotence) >= 1) AND (char_length(cle_idempotence) <= 200)))
  constraint tiroma_evenements_agenda_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES tiroma_cabinets(client_id, entite_id) ON DELETE CASCADE
  constraint tiroma_evenements_agenda_client_id_entite_id_patient_id_fkey FOREIGN KEY (client_id, entite_id, patient_id) REFERENCES tiroma_patients(client_id, entite_id, id) ON DELETE CASCADE
  constraint tiroma_evenements_agenda_client_id_entite_id_releve_id_fkey FOREIGN KEY (client_id, entite_id, releve_id) REFERENCES tiroma_releves(client_id, entite_id, id) ON DELETE SET NULL (releve_id)
  constraint tiroma_evenements_agenda_client_id_entite_id_rendez_vous_i_fkey FOREIGN KEY (client_id, entite_id, rendez_vous_id) REFERENCES tiroma_rendez_vous(client_id, entite_id, id) ON DELETE CASCADE
  constraint tiroma_evenements_agenda_pkey PRIMARY KEY (id)
  constraint tiroma_evenements_agenda_type_check CHECK ((type = ANY (ARRAY['creation'::text, 'modification'::text, 'annulation'::text, 'report'::text, 'deplacement'::text, 'absence'::text, 'honore'::text, 'presume_honore'::text, 'fusion'::text, 'reapparition'::text])))
  constraint tiroma_evenements_une_fois UNIQUE (client_id, cle_idempotence)
  policy "tiroma : on voit les evenements des rendez-vous qu'on voit" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (rendez_vous_id IN ( SELECT r.id
   FROM tiroma_rendez_vous r)))) with check ()
  CREATE TRIGGER tiroma_evenements_agenda_tracer AFTER INSERT ON public.tiroma_evenements_agenda FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('+type', '+rendez_vous_id', '+releve_id')
  CREATE TRIGGER tiroma_evenements_immuables BEFORE DELETE OR UPDATE ON public.tiroma_evenements_agenda FOR EACH ROW EXECUTE FUNCTION private.tiroma_evenements_immuables()
  CREATE TRIGGER tiroma_evenements_sans_vidage BEFORE TRUNCATE ON public.tiroma_evenements_agenda FOR EACH STATEMENT EXECUTE FUNCTION private.tiroma_evenements_sans_vidage()
  grants authenticated: SELECT

-- ═══ TABLE public.tiroma_fauteuils
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  source_ref text
  nom text not null
  capacites text[] not null default ARRAY['soins'::text]
  objectif_occupation numeric(4,3)
  actif boolean not null default true
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint tiroma_fauteuils_capacites_check CHECK (((cardinality(capacites) >= 1) AND (capacites <@ ARRAY['soins'::text, 'prothese'::text, 'chirurgie'::text, 'orthodontie'::text, 'prevention'::text])))
  constraint tiroma_fauteuils_cle UNIQUE (client_id, entite_id, id)
  constraint tiroma_fauteuils_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES tiroma_cabinets(client_id, entite_id) ON DELETE CASCADE
  constraint tiroma_fauteuils_nom_check CHECK (((char_length(btrim(nom)) >= 1) AND (char_length(btrim(nom)) <= 80)))
  constraint tiroma_fauteuils_objectif_occupation_check CHECK (((objectif_occupation >= (0)::numeric) AND (objectif_occupation <= (1)::numeric)))
  constraint tiroma_fauteuils_pkey PRIMARY KEY (id)
  constraint tiroma_fauteuils_source_ref_check CHECK (((char_length(source_ref) >= 1) AND (char_length(source_ref) <= 200)))
  constraint tiroma_fauteuils_source_une_fois UNIQUE (client_id, entite_id, source_ref)
  policy "tiroma : le titulaire ajoute un fauteuil" INSERT to authenticated using () with check (private.tiroma_est_titulaire(client_id, entite_id))
  policy "tiroma : le titulaire change un fauteuil" UPDATE to authenticated using (private.tiroma_est_titulaire(client_id, entite_id)) with check (private.tiroma_est_titulaire(client_id, entite_id))
  policy "tiroma : le titulaire retire un fauteuil" DELETE to authenticated using (private.tiroma_est_titulaire(client_id, entite_id)) with check ()
  policy "tiroma : les profils voient les fauteuils" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (entite_id IN ( SELECT private.tiroma_cabinets_ou(ARRAY['titulaire'::text, 'collaborateur'::text, 'assistante'::text, 'direction'::text]) AS tiroma_cabinets_ou)))) with check ()
  CREATE TRIGGER tiroma_fauteuils_maj_le BEFORE UPDATE ON public.tiroma_fauteuils FOR EACH ROW EXECUTE FUNCTION private.tiroma_maj_le()
  CREATE TRIGGER tiroma_fauteuils_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tiroma_fauteuils FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.tiroma_fermetures
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  praticien_id uuid
  fauteuil_id uuid
  debut timestamp with time zone not null
  fin timestamp with time zone not null
  nature text not null
  source text not null default 'saisie'::text
  source_ref text
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint tiroma_fermetures_client_id_entite_id_fauteuil_id_fkey FOREIGN KEY (client_id, entite_id, fauteuil_id) REFERENCES tiroma_fauteuils(client_id, entite_id, id) ON DELETE CASCADE
  constraint tiroma_fermetures_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES tiroma_cabinets(client_id, entite_id) ON DELETE CASCADE
  constraint tiroma_fermetures_client_id_entite_id_praticien_id_fkey FOREIGN KEY (client_id, entite_id, praticien_id) REFERENCES tiroma_praticiens(client_id, entite_id, id) ON DELETE CASCADE
  constraint tiroma_fermetures_nature_check CHECK ((nature = ANY (ARRAY['conge'::text, 'ferie'::text, 'fermeture'::text, 'formation'::text, 'absence'::text])))
  constraint tiroma_fermetures_ordre CHECK ((fin > debut))
  constraint tiroma_fermetures_pkey PRIMARY KEY (id)
  constraint tiroma_fermetures_source_check CHECK ((source = ANY (ARRAY['logiciel'::text, 'saisie'::text])))
  constraint tiroma_fermetures_source_ref_check CHECK (((char_length(source_ref) >= 1) AND (char_length(source_ref) <= 200)))
  policy "tiroma : l'equipe lit les fermetures" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (entite_id IN ( SELECT private.tiroma_cabinets_ou(ARRAY['titulaire'::text, 'collaborateur'::text, 'assistante'::text]) AS tiroma_cabinets_ou)))) with check ()
  policy "tiroma : le titulaire change une fermeture" UPDATE to authenticated using (private.tiroma_est_titulaire(client_id, entite_id)) with check (private.tiroma_est_titulaire(client_id, entite_id))
  policy "tiroma : le titulaire pose une fermeture" INSERT to authenticated using () with check (private.tiroma_est_titulaire(client_id, entite_id))
  policy "tiroma : le titulaire retire une fermeture" DELETE to authenticated using (private.tiroma_est_titulaire(client_id, entite_id)) with check ()
  CREATE TRIGGER tiroma_fermetures_maj_le BEFORE UPDATE ON public.tiroma_fermetures FOR EACH ROW EXECUTE FUNCTION private.tiroma_maj_le()
  CREATE TRIGGER tiroma_fermetures_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tiroma_fermetures FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.tiroma_horaires
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  praticien_id uuid
  fauteuil_id uuid
  jour smallint not null
  debut time without time zone not null
  fin time without time zone not null
  valide_du date
  valide_au date
  exceptionnel boolean not null default false
  source text not null default 'saisie'::text
  source_ref text
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint tiroma_horaires_client_id_entite_id_fauteuil_id_fkey FOREIGN KEY (client_id, entite_id, fauteuil_id) REFERENCES tiroma_fauteuils(client_id, entite_id, id) ON DELETE CASCADE
  constraint tiroma_horaires_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES tiroma_cabinets(client_id, entite_id) ON DELETE CASCADE
  constraint tiroma_horaires_client_id_entite_id_praticien_id_fkey FOREIGN KEY (client_id, entite_id, praticien_id) REFERENCES tiroma_praticiens(client_id, entite_id, id) ON DELETE CASCADE
  constraint tiroma_horaires_exceptionnel CHECK (((NOT exceptionnel) OR ((valide_du IS NOT NULL) AND (valide_au = valide_du) AND (jour = (EXTRACT(isodow FROM valide_du))::smallint))))
  constraint tiroma_horaires_jour_check CHECK (((jour >= 1) AND (jour <= 7)))
  constraint tiroma_horaires_ordre CHECK ((fin > debut))
  constraint tiroma_horaires_periode CHECK (((valide_au IS NULL) OR (valide_du IS NULL) OR (valide_au >= valide_du)))
  constraint tiroma_horaires_pkey PRIMARY KEY (id)
  constraint tiroma_horaires_source_check CHECK ((source = ANY (ARRAY['logiciel'::text, 'saisie'::text])))
  constraint tiroma_horaires_source_ref_check CHECK (((char_length(source_ref) >= 1) AND (char_length(source_ref) <= 200)))
  policy "tiroma : l'equipe lit les horaires" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (entite_id IN ( SELECT private.tiroma_cabinets_ou(ARRAY['titulaire'::text, 'collaborateur'::text, 'assistante'::text]) AS tiroma_cabinets_ou)))) with check ()
  policy "tiroma : le titulaire change un horaire" UPDATE to authenticated using (private.tiroma_est_titulaire(client_id, entite_id)) with check (private.tiroma_est_titulaire(client_id, entite_id))
  policy "tiroma : le titulaire pose un horaire" INSERT to authenticated using () with check (private.tiroma_est_titulaire(client_id, entite_id))
  policy "tiroma : le titulaire retire un horaire" DELETE to authenticated using (private.tiroma_est_titulaire(client_id, entite_id)) with check ()
  CREATE TRIGGER tiroma_horaires_maj_le BEFORE UPDATE ON public.tiroma_horaires FOR EACH ROW EXECUTE FUNCTION private.tiroma_maj_le()
  CREATE TRIGGER tiroma_horaires_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tiroma_horaires FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.tiroma_liste_attente
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  source_ref text
  patient_id uuid not null
  type_rdv_id uuid
  famille text
  duree_min smallint
  praticien_id uuid
  disponibilites jsonb
  preavis_minutes integer
  drapeau_gene boolean not null default false
  rdv_initial_id uuid
  source text not null
  ajoute_le timestamp with time zone not null default now()
  ajoute_par uuid
  retire_le timestamp with time zone
  motif_retrait text
  vu_dernier_le timestamp with time zone
  maj_le timestamp with time zone not null default now()
  constraint tiroma_liste_attente_client_id_entite_id_patient_id_fkey FOREIGN KEY (client_id, entite_id, patient_id) REFERENCES tiroma_patients(client_id, entite_id, id) ON DELETE CASCADE
  constraint tiroma_liste_attente_client_id_entite_id_praticien_id_fkey FOREIGN KEY (client_id, entite_id, praticien_id) REFERENCES tiroma_praticiens(client_id, entite_id, id) ON DELETE SET NULL (praticien_id)
  constraint tiroma_liste_attente_client_id_entite_id_rdv_initial_id_fkey FOREIGN KEY (client_id, entite_id, rdv_initial_id) REFERENCES tiroma_rendez_vous(client_id, entite_id, id) ON DELETE SET NULL (rdv_initial_id)
  constraint tiroma_liste_attente_client_id_entite_id_type_rdv_id_fkey FOREIGN KEY (client_id, entite_id, type_rdv_id) REFERENCES tiroma_types_rdv(client_id, entite_id, id) ON DELETE SET NULL (type_rdv_id)
  constraint tiroma_liste_attente_disponibilites_check CHECK ((jsonb_typeof(disponibilites) = 'array'::text))
  constraint tiroma_liste_attente_duree_min_check CHECK (((duree_min >= 5) AND (duree_min <= 600)))
  constraint tiroma_liste_attente_famille_check CHECK ((famille = ANY (ARRAY['controle'::text, 'detartrage'::text, 'soin_conservateur'::text, 'endodontie'::text, 'prothese_preparation'::text, 'prothese_empreinte'::text, 'prothese_pose'::text, 'implant_chirurgie'::text, 'implant_prothese'::text, 'chirurgie'::text, 'parodontie'::text, 'orthodontie_pose'::text, 'orthodontie_controle'::text, 'urgence'::text, 'premiere_consultation'::text, 'personnel'::text, 'autre'::text])))
  constraint tiroma_liste_attente_motif_retrait_check CHECK ((motif_retrait = ANY (ARRAY['rdv_obtenu'::text, 'date_passee'::text, 'annule'::text, 'doublon'::text, 'autre'::text])))
  constraint tiroma_liste_attente_pkey PRIMARY KEY (id)
  constraint tiroma_liste_attente_preavis_minutes_check CHECK (((preavis_minutes >= 0) AND (preavis_minutes <= 20160)))
  constraint tiroma_liste_attente_retrait CHECK (((retire_le IS NULL) = (motif_retrait IS NULL)))
  constraint tiroma_liste_attente_source_check CHECK ((source = ANY (ARRAY['logiciel'::text, 'tiroma'::text, 'reput'::text])))
  constraint tiroma_liste_attente_source_ref_check CHECK (((char_length(source_ref) >= 1) AND (char_length(source_ref) <= 200)))
  constraint tiroma_liste_attente_source_une_fois UNIQUE (client_id, entite_id, source_ref)
  policy "tiroma : on voit l'attente des patients qu'on voit" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (patient_id IN ( SELECT pa.id
   FROM tiroma_patients pa)))) with check ()
  CREATE TRIGGER tiroma_liste_attente_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tiroma_liste_attente FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('+source', '+praticien_id', '+retire_le', '+motif_retrait')
  grants authenticated: SELECT

-- ═══ TABLE public.tiroma_membres
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  prenom text not null
  fauteuil_habituel_id uuid
  user_id uuid
  actif boolean not null default true
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint tiroma_membres_cle UNIQUE (client_id, entite_id, id)
  constraint tiroma_membres_client_id_entite_id_fauteuil_habituel_id_fkey FOREIGN KEY (client_id, entite_id, fauteuil_habituel_id) REFERENCES tiroma_fauteuils(client_id, entite_id, id) ON DELETE SET NULL (fauteuil_habituel_id)
  constraint tiroma_membres_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES tiroma_cabinets(client_id, entite_id) ON DELETE CASCADE
  constraint tiroma_membres_pkey PRIMARY KEY (id)
  constraint tiroma_membres_prenom_check CHECK (((char_length(btrim(prenom)) >= 1) AND (char_length(btrim(prenom)) <= 60)))
  constraint tiroma_membres_user_id_client_id_fkey FOREIGN KEY (user_id, client_id) REFERENCES comptes(user_id, client_id) ON DELETE SET NULL (user_id)
  policy "tiroma : le titulaire ajoute un membre" INSERT to authenticated using () with check (private.tiroma_est_titulaire(client_id, entite_id))
  policy "tiroma : le titulaire change un membre" UPDATE to authenticated using (private.tiroma_est_titulaire(client_id, entite_id)) with check (private.tiroma_est_titulaire(client_id, entite_id))
  policy "tiroma : le titulaire retire un membre" DELETE to authenticated using (private.tiroma_est_titulaire(client_id, entite_id)) with check ()
  policy "tiroma : le titulaire voit l'equipe, chacun sa ligne" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND ((user_id = ( SELECT auth.uid() AS uid)) OR (entite_id IN ( SELECT private.tiroma_cabinets_ou(ARRAY['titulaire'::text]) AS tiroma_cabinets_ou))))) with check ()
  CREATE TRIGGER tiroma_membres_maj_le BEFORE UPDATE ON public.tiroma_membres FOR EACH ROW EXECUTE FUNCTION private.tiroma_maj_le()
  CREATE TRIGGER tiroma_membres_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tiroma_membres FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.tiroma_patients
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  source_ref text not null
  nom text not null
  prenom text
  naissance date
  commune_insee text
  praticien_habituel_id uuid
  famille_ref text
  assure_empreinte text
  disponibilites jsonb
  preavis_minutes integer
  ne_pas_contacter boolean not null default false
  questionnaire_le date
  dernier_rdv_le date
  prochain_rdv_le timestamp with time zone
  dernier_acte_le date
  dernier_controle_le date
  actif boolean not null default true
  fusionne_dans_id uuid
  empreinte text
  vu_premier_le timestamp with time zone not null default now()
  vu_dernier_le timestamp with time zone not null default now()
  disparu_le timestamp with time zone
  constraint tiroma_patients_assure_empreinte_check CHECK ((assure_empreinte ~ '^[0-9a-f]{64}$'::text))
  constraint tiroma_patients_cle UNIQUE (client_id, entite_id, id)
  constraint tiroma_patients_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES tiroma_cabinets(client_id, entite_id) ON DELETE CASCADE
  constraint tiroma_patients_client_id_entite_id_fusionne_dans_id_fkey FOREIGN KEY (client_id, entite_id, fusionne_dans_id) REFERENCES tiroma_patients(client_id, entite_id, id) ON DELETE SET NULL (fusionne_dans_id)
  constraint tiroma_patients_client_id_entite_id_praticien_habituel_id_fkey FOREIGN KEY (client_id, entite_id, praticien_habituel_id) REFERENCES tiroma_praticiens(client_id, entite_id, id) ON DELETE SET NULL (praticien_habituel_id)
  constraint tiroma_patients_commune_insee_check CHECK ((commune_insee ~ '^[0-9][0-9AB][0-9]{3}$'::text))
  constraint tiroma_patients_disponibilites_check CHECK ((jsonb_typeof(disponibilites) = 'array'::text))
  constraint tiroma_patients_empreinte_check CHECK ((empreinte ~ '^[0-9a-f]{64}$'::text))
  constraint tiroma_patients_famille_ref_check CHECK (((char_length(famille_ref) >= 1) AND (char_length(famille_ref) <= 200)))
  constraint tiroma_patients_naissance_check CHECK ((naissance >= '1900-01-01'::date))
  constraint tiroma_patients_nom_check CHECK (((char_length(btrim(nom)) >= 1) AND (char_length(btrim(nom)) <= 120)))
  constraint tiroma_patients_pas_soi_meme CHECK (((fusionne_dans_id IS NULL) OR (fusionne_dans_id <> id)))
  constraint tiroma_patients_pkey PRIMARY KEY (id)
  constraint tiroma_patients_preavis_minutes_check CHECK (((preavis_minutes >= 0) AND (preavis_minutes <= 20160)))
  constraint tiroma_patients_prenom_check CHECK (((char_length(btrim(prenom)) >= 1) AND (char_length(btrim(prenom)) <= 120)))
  constraint tiroma_patients_source_ref_check CHECK (((char_length(source_ref) >= 1) AND (char_length(source_ref) <= 200)))
  constraint tiroma_patients_source_une_fois UNIQUE (client_id, entite_id, source_ref)
  policy "tiroma : on voit les patients de son perimetre" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND ((entite_id IN ( SELECT private.tiroma_cabinets_patients() AS tiroma_cabinets_patients)) OR ((entite_id, praticien_habituel_id) IN ( SELECT p.entite_id,
    p.praticien_id
   FROM private.tiroma_praticiens_patients() p(entite_id, praticien_id))) OR (id IN ( SELECT r.patient_id
   FROM tiroma_rendez_vous r
  WHERE (r.patient_id IS NOT NULL))) OR (id IN ( SELECT pl.patient_id
   FROM tiroma_plans pl))))) with check ()
  CREATE TRIGGER tiroma_patients_empreinte_effacement AFTER DELETE ON public.tiroma_patients FOR EACH ROW WHEN ((COALESCE(current_setting('omega.effacement_objet'::text, true), ''::text) = 'oui'::text)) EXECUTE FUNCTION private.tiroma_patient_efface()
  CREATE TRIGGER tiroma_patients_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tiroma_patients FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('+actif', '+ne_pas_contacter', '+praticien_habituel_id', '+fusionne_dans_id')
  grants authenticated: SELECT

-- ═══ TABLE public.tiroma_plan_actes
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  plan_id uuid not null
  patient_id uuid not null
  rang smallint not null
  code text
  libelle text
  dents smallint[]
  famille text
  seance smallint
  rdv_ref text
  duree_min smallint
  delai_min_jours smallint
  montant numeric(12,2)
  reste_a_charge numeric(12,2)
  statut text not null default 'a_faire'::text
  fait_le date
  rendez_vous_id uuid
  empreinte text
  constraint tiroma_plan_actes_client_id_entite_id_plan_id_patient_id_fkey FOREIGN KEY (client_id, entite_id, plan_id, patient_id) REFERENCES tiroma_plans(client_id, entite_id, id, patient_id) ON DELETE CASCADE
  constraint tiroma_plan_actes_client_id_entite_id_rendez_vous_id_fkey FOREIGN KEY (client_id, entite_id, rendez_vous_id) REFERENCES tiroma_rendez_vous(client_id, entite_id, id) ON DELETE SET NULL (rendez_vous_id)
  constraint tiroma_plan_actes_code_check CHECK (((char_length(code) >= 1) AND (char_length(code) <= 20)))
  constraint tiroma_plan_actes_delai_min_jours_check CHECK (((delai_min_jours >= 0) AND (delai_min_jours <= 365)))
  constraint tiroma_plan_actes_dents_check CHECK ((dents <@ ARRAY[(11)::smallint, (12)::smallint, (13)::smallint, (14)::smallint, (15)::smallint, (16)::smallint, (17)::smallint, (18)::smallint, (21)::smallint, (22)::smallint, (23)::smallint, (24)::smallint, (25)::smallint, (26)::smallint, (27)::smallint, (28)::smallint, (31)::smallint, (32)::smallint, (33)::smallint, (34)::smallint, (35)::smallint, (36)::smallint, (37)::smallint, (38)::smallint, (41)::smallint, (42)::smallint, (43)::smallint, (44)::smallint, (45)::smallint, (46)::smallint, (47)::smallint, (48)::smallint, (51)::smallint, (52)::smallint, (53)::smallint, (54)::smallint, (55)::smallint, (61)::smallint, (62)::smallint, (63)::smallint, (64)::smallint, (65)::smallint, (71)::smallint, (72)::smallint, (73)::smallint, (74)::smallint, (75)::smallint, (81)::smallint, (82)::smallint, (83)::smallint, (84)::smallint, (85)::smallint]))
  constraint tiroma_plan_actes_duree_min_check CHECK (((duree_min >= 5) AND (duree_min <= 600)))
  constraint tiroma_plan_actes_empreinte_check CHECK ((empreinte ~ '^[0-9a-f]{64}$'::text))
  constraint tiroma_plan_actes_fait_date CHECK (((statut <> 'fait'::text) OR (fait_le IS NOT NULL)))
  constraint tiroma_plan_actes_famille_check CHECK ((famille = ANY (ARRAY['controle'::text, 'detartrage'::text, 'soin_conservateur'::text, 'endodontie'::text, 'prothese_preparation'::text, 'prothese_empreinte'::text, 'prothese_pose'::text, 'implant_chirurgie'::text, 'implant_prothese'::text, 'chirurgie'::text, 'parodontie'::text, 'orthodontie_pose'::text, 'orthodontie_controle'::text, 'urgence'::text, 'premiere_consultation'::text, 'personnel'::text, 'autre'::text])))
  constraint tiroma_plan_actes_libelle_check CHECK (((char_length(libelle) >= 1) AND (char_length(libelle) <= 200)))
  constraint tiroma_plan_actes_montant_check CHECK ((montant >= (0)::numeric))
  constraint tiroma_plan_actes_pkey PRIMARY KEY (id)
  constraint tiroma_plan_actes_rang_check CHECK ((rang >= 1))
  constraint tiroma_plan_actes_rang_une_fois UNIQUE (plan_id, rang)
  constraint tiroma_plan_actes_rdv_ref_check CHECK (((char_length(rdv_ref) >= 1) AND (char_length(rdv_ref) <= 60)))
  constraint tiroma_plan_actes_reste_a_charge_check CHECK ((reste_a_charge >= (0)::numeric))
  constraint tiroma_plan_actes_seance_check CHECK ((seance >= 1))
  constraint tiroma_plan_actes_statut_check CHECK ((statut = ANY (ARRAY['a_faire'::text, 'planifie'::text, 'fait'::text])))
  policy "tiroma : on voit les lignes des plans qu'on voit" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (plan_id IN ( SELECT pl.id
   FROM tiroma_plans pl)))) with check ()
  CREATE TRIGGER tiroma_plan_actes_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tiroma_plan_actes FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('+plan_id', '+statut', '+seance', '+rendez_vous_id', '+fait_le')
  grants authenticated: SELECT

-- ═══ TABLE public.tiroma_plans
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  source_ref text not null
  patient_id uuid not null
  praticien_id uuid
  devis_numero text
  type text not null default 'conventionnel'::text
  statut text not null
  presente_le date
  signe_le date
  signature_source text
  valide_jusqu_au date
  montant numeric(12,2)
  reste_a_charge numeric(12,2)
  part_amo numeric(12,2)
  part_amc numeric(12,2)
  panier text
  alternative_100_sante boolean
  mutuelle_statut text
  mutuelle_demande_le date
  mutuelle_reponse_le date
  mutuelle_source text
  liste text
  entre_en_liste_le timestamp with time zone
  sorti_le timestamp with time zone
  motif_sortie text
  clos_le timestamp with time zone
  a_verifier boolean not null default false
  empreinte text
  vu_premier_le timestamp with time zone not null default now()
  vu_dernier_le timestamp with time zone not null default now()
  disparu_le timestamp with time zone
  constraint tiroma_plans_cle UNIQUE (client_id, entite_id, id)
  constraint tiroma_plans_cle_patient UNIQUE (client_id, entite_id, id, patient_id)
  constraint tiroma_plans_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES tiroma_cabinets(client_id, entite_id) ON DELETE CASCADE
  constraint tiroma_plans_client_id_entite_id_patient_id_fkey FOREIGN KEY (client_id, entite_id, patient_id) REFERENCES tiroma_patients(client_id, entite_id, id) ON DELETE CASCADE
  constraint tiroma_plans_client_id_entite_id_praticien_id_fkey FOREIGN KEY (client_id, entite_id, praticien_id) REFERENCES tiroma_praticiens(client_id, entite_id, id) ON DELETE SET NULL (praticien_id)
  constraint tiroma_plans_devis_numero_check CHECK (((char_length(devis_numero) >= 1) AND (char_length(devis_numero) <= 60)))
  constraint tiroma_plans_empreinte_check CHECK ((empreinte ~ '^[0-9a-f]{64}$'::text))
  constraint tiroma_plans_liste_check CHECK ((liste = ANY (ARRAY['a'::text, 'b'::text, 'c'::text])))
  constraint tiroma_plans_montant_check CHECK ((montant >= (0)::numeric))
  constraint tiroma_plans_motif_sortie_check CHECK (((char_length(motif_sortie) >= 1) AND (char_length(motif_sortie) <= 80)))
  constraint tiroma_plans_mutuelle_source_check CHECK ((mutuelle_source = ANY (ARRAY['logiciel'::text, 'saisie'::text, 'import'::text, 'lecture'::text])))
  constraint tiroma_plans_mutuelle_statut_check CHECK ((mutuelle_statut = ANY (ARRAY['non_requise'::text, 'a_demander'::text, 'demandee'::text, 'accord'::text, 'refus'::text])))
  constraint tiroma_plans_panier_check CHECK ((panier = ANY (ARRAY['100_sante'::text, 'maitrise'::text, 'libre'::text, 'mixte'::text])))
  constraint tiroma_plans_part_amc_check CHECK ((part_amc >= (0)::numeric))
  constraint tiroma_plans_part_amo_check CHECK ((part_amo >= (0)::numeric))
  constraint tiroma_plans_pkey PRIMARY KEY (id)
  constraint tiroma_plans_reste_a_charge_check CHECK ((reste_a_charge >= (0)::numeric))
  constraint tiroma_plans_signature_source_check CHECK ((signature_source = ANY (ARRAY['logiciel'::text, 'deduite'::text, 'saisie'::text])))
  constraint tiroma_plans_source_ref_check CHECK (((char_length(source_ref) >= 1) AND (char_length(source_ref) <= 200)))
  constraint tiroma_plans_source_une_fois UNIQUE (client_id, entite_id, source_ref)
  constraint tiroma_plans_statut_check CHECK ((statut = ANY (ARRAY['presente'::text, 'signe'::text, 'commence'::text, 'termine'::text, 'abandonne'::text, 'expire'::text, 'refuse'::text])))
  constraint tiroma_plans_type_check CHECK ((type = ANY (ARRAY['conventionnel'::text, 'odf'::text, 'hors_nomenclature'::text])))
  policy "tiroma : on voit les plans de son perimetre" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND ((entite_id IN ( SELECT private.tiroma_cabinets_patients() AS tiroma_cabinets_patients)) OR ((entite_id, praticien_id) IN ( SELECT p.entite_id,
    p.praticien_id
   FROM private.tiroma_praticiens_patients() p(entite_id, praticien_id)))))) with check ()
  CREATE TRIGGER tiroma_plans_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tiroma_plans FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('+statut', '+signe_le', '+signature_source', '+valide_jusqu_au', '+liste', '+mutuelle_statut', '+mutuelle_source', '+montant', '+reste_a_charge', '+a_verifier')
  grants authenticated: SELECT

-- ═══ TABLE public.tiroma_praticiens
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  source_ref text
  nom_affiche text not null
  metier text not null default 'collaborateur'::text
  user_id uuid
  actif boolean not null default true
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint tiroma_praticiens_cle UNIQUE (client_id, entite_id, id)
  constraint tiroma_praticiens_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES tiroma_cabinets(client_id, entite_id) ON DELETE CASCADE
  constraint tiroma_praticiens_metier_check CHECK ((metier = ANY (ARRAY['titulaire'::text, 'collaborateur'::text, 'salarie'::text, 'orthodontiste'::text, 'remplacant'::text])))
  constraint tiroma_praticiens_nom_affiche_check CHECK (((char_length(btrim(nom_affiche)) >= 1) AND (char_length(btrim(nom_affiche)) <= 120)))
  constraint tiroma_praticiens_pkey PRIMARY KEY (id)
  constraint tiroma_praticiens_source_ref_check CHECK (((char_length(source_ref) >= 1) AND (char_length(source_ref) <= 200)))
  constraint tiroma_praticiens_source_une_fois UNIQUE (client_id, entite_id, source_ref)
  constraint tiroma_praticiens_user_id_client_id_fkey FOREIGN KEY (user_id, client_id) REFERENCES comptes(user_id, client_id) ON DELETE SET NULL (user_id)
  policy "tiroma : le titulaire ajoute un praticien" INSERT to authenticated using () with check (private.tiroma_est_titulaire(client_id, entite_id))
  policy "tiroma : le titulaire change un praticien" UPDATE to authenticated using (private.tiroma_est_titulaire(client_id, entite_id)) with check (private.tiroma_est_titulaire(client_id, entite_id))
  policy "tiroma : le titulaire retire un praticien" DELETE to authenticated using (private.tiroma_est_titulaire(client_id, entite_id)) with check ()
  policy "tiroma : les profils voient les praticiens" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (entite_id IN ( SELECT private.tiroma_cabinets_ou(ARRAY['titulaire'::text, 'collaborateur'::text, 'assistante'::text, 'direction'::text]) AS tiroma_cabinets_ou)))) with check ()
  CREATE TRIGGER tiroma_praticiens_maj_le BEFORE UPDATE ON public.tiroma_praticiens FOR EACH ROW EXECUTE FUNCTION private.tiroma_maj_le()
  CREATE TRIGGER tiroma_praticiens_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tiroma_praticiens FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.tiroma_profils
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  user_id uuid not null
  entite_id uuid not null
  profil text not null
  praticien_id uuid
  membre_id uuid
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint tiroma_profils_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id) ON DELETE CASCADE
  constraint tiroma_profils_client_id_entite_id_membre_id_fkey FOREIGN KEY (client_id, entite_id, membre_id) REFERENCES tiroma_membres(client_id, entite_id, id) ON DELETE SET NULL (membre_id)
  constraint tiroma_profils_client_id_entite_id_praticien_id_fkey FOREIGN KEY (client_id, entite_id, praticien_id) REFERENCES tiroma_praticiens(client_id, entite_id, id) ON DELETE SET NULL (praticien_id)
  constraint tiroma_profils_pkey PRIMARY KEY (id)
  constraint tiroma_profils_profil_check CHECK ((profil = ANY (ARRAY['titulaire'::text, 'collaborateur'::text, 'assistante'::text, 'direction'::text])))
  constraint tiroma_profils_une_fois UNIQUE (client_id, user_id, entite_id)
  constraint tiroma_profils_user_id_client_id_fkey FOREIGN KEY (user_id, client_id) REFERENCES comptes(user_id, client_id) ON DELETE CASCADE
  policy "tiroma : le gerant change un profil" UPDATE to authenticated using ((private.a_un_role(client_id, ARRAY['gerant'::text]) AND private.voit_entite(client_id, entite_id))) with check ((private.a_un_role(client_id, ARRAY['gerant'::text]) AND private.voit_entite(client_id, entite_id)))
  policy "tiroma : le gerant donne un profil" INSERT to authenticated using () with check ((private.a_un_role(client_id, ARRAY['gerant'::text]) AND private.voit_entite(client_id, entite_id)))
  policy "tiroma : le gerant retire un profil" DELETE to authenticated using ((private.a_un_role(client_id, ARRAY['gerant'::text]) AND private.voit_entite(client_id, entite_id))) with check ()
  policy "tiroma : le gerant voit les profils, chacun les siens" SELECT to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) OR (private.a_un_role(client_id, ARRAY['gerant'::text]) AND private.voit_entite(client_id, entite_id)))) with check ()
  CREATE TRIGGER tiroma_profils_coherent BEFORE INSERT OR UPDATE ON public.tiroma_profils FOR EACH ROW EXECUTE FUNCTION private.tiroma_profil_coherent()
  CREATE TRIGGER tiroma_profils_droits AFTER INSERT OR DELETE OR UPDATE ON public.tiroma_profils FOR EACH ROW EXECUTE FUNCTION private.tiroma_profils_droits()
  CREATE TRIGGER tiroma_profils_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tiroma_profils FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.tiroma_regles
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  ordre_priorite text[] not null default ARRAY['plan'::text, 'attente'::text, 'controle'::text]
  tenir_duree boolean not null default true
  tenir_preferences boolean not null default true
  creneau_min_minutes smallint not null default 20
  delai_min_appel_minutes smallint not null default 90
  reserve_urgences jsonb not null default '[]'::jsonb
  horizon_creneaux_jours smallint not null default 2
  nb_propositions smallint not null default 3
  seuil_controle_mois smallint not null default 12
  patient_actif_mois smallint not null default 36
  actes_controle text[] not null default ARRAY['HBJD001'::text]
  quota_controles_demi_journee smallint not null default 2
  delai_interruption_jours smallint not null default 21
  delai_devis_presente_jours smallint not null default 15
  delai_reponse_mutuelle_jours smallint not null default 15
  alerte_devis_expire_jours smallint not null default 30
  validite_devis_jours smallint
  labo_verif_jours smallint not null default 2
  renouvellement_accord_odf text
  seuil_demi_journee_vide numeric(4,3) not null default 0.200
  garde_min_rdv_jour smallint not null default 10
  garde_part_disparus numeric(4,3) not null default 0.200
  garde_max_annulations smallint not null default 30
  garde_ecart_horloge_s integer not null default 300
  fenetre_report_minutes smallint not null default 30
  maj_le timestamp with time zone not null default now()
  objectif_production_semaine numeric(12,2)
  constraint tiroma_regles_actes_controle_forme CHECK (((cardinality(actes_controle) <= 50) AND (array_position(actes_controle, NULL::text) IS NULL)))
  constraint tiroma_regles_alerte_devis_expire_jours_check CHECK (((alerte_devis_expire_jours >= 1) AND (alerte_devis_expire_jours <= 365)))
  constraint tiroma_regles_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES tiroma_cabinets(client_id, entite_id) ON DELETE CASCADE
  constraint tiroma_regles_creneau_min_minutes_check CHECK (((creneau_min_minutes >= 5) AND (creneau_min_minutes <= 240)))
  constraint tiroma_regles_delai_devis_presente_jours_check CHECK (((delai_devis_presente_jours >= 1) AND (delai_devis_presente_jours <= 365)))
  constraint tiroma_regles_delai_interruption_jours_check CHECK (((delai_interruption_jours >= 1) AND (delai_interruption_jours <= 365)))
  constraint tiroma_regles_delai_min_appel_minutes_check CHECK (((delai_min_appel_minutes >= 0) AND (delai_min_appel_minutes <= 1440)))
  constraint tiroma_regles_delai_reponse_mutuelle_jours_check CHECK (((delai_reponse_mutuelle_jours >= 1) AND (delai_reponse_mutuelle_jours <= 120)))
  constraint tiroma_regles_fenetre_report_minutes_check CHECK (((fenetre_report_minutes >= 1) AND (fenetre_report_minutes <= 1440)))
  constraint tiroma_regles_garde_ecart_horloge_s_check CHECK (((garde_ecart_horloge_s >= 10) AND (garde_ecart_horloge_s <= 86400)))
  constraint tiroma_regles_garde_max_annulations_check CHECK (((garde_max_annulations >= 1) AND (garde_max_annulations <= 10000)))
  constraint tiroma_regles_garde_min_rdv_jour_check CHECK (((garde_min_rdv_jour >= 1) AND (garde_min_rdv_jour <= 1000)))
  constraint tiroma_regles_garde_part_disparus_check CHECK (((garde_part_disparus > (0)::numeric) AND (garde_part_disparus <= (1)::numeric)))
  constraint tiroma_regles_horizon_creneaux_jours_check CHECK (((horizon_creneaux_jours >= 0) AND (horizon_creneaux_jours <= 7)))
  constraint tiroma_regles_labo_verif_jours_check CHECK (((labo_verif_jours >= 0) AND (labo_verif_jours <= 14)))
  constraint tiroma_regles_nb_propositions_check CHECK (((nb_propositions >= 1) AND (nb_propositions <= 5)))
  constraint tiroma_regles_objectif_production_semaine_check CHECK ((objectif_production_semaine >= (0)::numeric))
  constraint tiroma_regles_ordre_priorite_check CHECK (((cardinality(ordre_priorite) = 3) AND (ordre_priorite @> ARRAY['plan'::text, 'attente'::text, 'controle'::text])))
  constraint tiroma_regles_patient_actif_mois_check CHECK (((patient_actif_mois >= 12) AND (patient_actif_mois <= 120)))
  constraint tiroma_regles_pkey PRIMARY KEY (id)
  constraint tiroma_regles_quota_controles_demi_journee_check CHECK (((quota_controles_demi_journee >= 0) AND (quota_controles_demi_journee <= 20)))
  constraint tiroma_regles_renouvellement_accord_odf_check CHECK ((renouvellement_accord_odf = ANY (ARRAY['annuel'::text, 'semestriel'::text, 'aucun'::text])))
  constraint tiroma_regles_reserve_forme CHECK (private.tiroma_reserve_valide(reserve_urgences))
  constraint tiroma_regles_seuil_controle_mois_check CHECK (((seuil_controle_mois >= 3) AND (seuil_controle_mois <= 36)))
  constraint tiroma_regles_seuil_demi_journee_vide_check CHECK (((seuil_demi_journee_vide >= (0)::numeric) AND (seuil_demi_journee_vide <= (1)::numeric)))
  constraint tiroma_regles_une_fois UNIQUE (client_id, entite_id)
  constraint tiroma_regles_validite_devis_jours_check CHECK (((validite_devis_jours >= 1) AND (validite_devis_jours <= 1095)))
  policy "tiroma : le titulaire change ses regles" UPDATE to authenticated using (private.tiroma_est_titulaire(client_id, entite_id)) with check (private.tiroma_est_titulaire(client_id, entite_id))
  policy "tiroma : le titulaire lit ses regles" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (entite_id IN ( SELECT private.tiroma_cabinets_ou(ARRAY['titulaire'::text]) AS tiroma_cabinets_ou)))) with check ()
  CREATE TRIGGER tiroma_regles_maj_le BEFORE UPDATE ON public.tiroma_regles FOR EACH ROW EXECUTE FUNCTION private.tiroma_maj_le()
  CREATE TRIGGER tiroma_regles_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tiroma_regles FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: SELECT,UPDATE

-- ═══ TABLE public.tiroma_releves
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  releve_source_id uuid
  contrat text not null
  voie text not null
  mode text not null
  horloge_connecteur timestamp with time zone
  version_connecteur text
  recu_le timestamp with time zone not null default now()
  fini_le timestamp with time zone
  statut text not null default 'en_cours'::text
  raison text
  compteurs jsonb not null default '{}'::jsonb
  constraint tiroma_releves_cle UNIQUE (client_id, entite_id, id)
  constraint tiroma_releves_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES tiroma_cabinets(client_id, entite_id) ON DELETE CASCADE
  constraint tiroma_releves_contrat_check CHECK ((contrat ~ '^tiroma\.releve\.v[0-9]{1,3}$'::text))
  constraint tiroma_releves_mode_check CHECK ((mode = ANY (ARRAY['rapide'::text, 'courant'::text, 'complet'::text, 'reprise'::text, 'demande'::text])))
  constraint tiroma_releves_pkey PRIMARY KEY (id)
  constraint tiroma_releves_raison_check CHECK ((char_length(raison) <= 500))
  constraint tiroma_releves_source_une_fois UNIQUE (client_id, releve_source_id)
  constraint tiroma_releves_statut_check CHECK ((statut = ANY (ARRAY['en_cours'::text, 'ok'::text, 'douteux'::text, 'refuse'::text, 'echec'::text])))
  constraint tiroma_releves_version_connecteur_check CHECK (((char_length(version_connecteur) >= 1) AND (char_length(version_connecteur) <= 60)))
  constraint tiroma_releves_voie_check CHECK ((voie = ANY (ARRAY['api'::text, 'passerelle'::text, 'exports'::text, 'interface'::text])))
  policy "tiroma : le titulaire voit les releves" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (entite_id IN ( SELECT private.tiroma_cabinets_ou(ARRAY['titulaire'::text]) AS tiroma_cabinets_ou)))) with check ()
  CREATE TRIGGER tiroma_releves_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tiroma_releves FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('+statut', '+raison', '+voie', '+mode', '+contrat', '+releve_source_id')
  grants authenticated: SELECT

-- ═══ TABLE public.tiroma_rendez_vous
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  source_ref text not null
  patient_id uuid
  praticien_id uuid
  fauteuil_id uuid
  type_rdv_id uuid
  debut timestamp with time zone not null
  fin timestamp with time zone not null
  statut text not null default 'prevu'::text
  motif_code text
  presume text
  plan_id uuid
  seance_rang smallint
  cree_source_le timestamp with time zone
  empreinte text
  vu_premier_le timestamp with time zone not null default now()
  vu_dernier_le timestamp with time zone not null default now()
  disparu_le timestamp with time zone
  constraint tiroma_rendez_vous_cle UNIQUE (client_id, entite_id, id)
  constraint tiroma_rendez_vous_client_id_entite_id_fauteuil_id_fkey FOREIGN KEY (client_id, entite_id, fauteuil_id) REFERENCES tiroma_fauteuils(client_id, entite_id, id) ON DELETE SET NULL (fauteuil_id)
  constraint tiroma_rendez_vous_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES tiroma_cabinets(client_id, entite_id) ON DELETE CASCADE
  constraint tiroma_rendez_vous_client_id_entite_id_patient_id_fkey FOREIGN KEY (client_id, entite_id, patient_id) REFERENCES tiroma_patients(client_id, entite_id, id) ON DELETE CASCADE
  constraint tiroma_rendez_vous_client_id_entite_id_plan_id_fkey FOREIGN KEY (client_id, entite_id, plan_id) REFERENCES tiroma_plans(client_id, entite_id, id) ON DELETE SET NULL (plan_id)
  constraint tiroma_rendez_vous_client_id_entite_id_praticien_id_fkey FOREIGN KEY (client_id, entite_id, praticien_id) REFERENCES tiroma_praticiens(client_id, entite_id, id) ON DELETE SET NULL (praticien_id)
  constraint tiroma_rendez_vous_client_id_entite_id_type_rdv_id_fkey FOREIGN KEY (client_id, entite_id, type_rdv_id) REFERENCES tiroma_types_rdv(client_id, entite_id, id) ON DELETE SET NULL (type_rdv_id)
  constraint tiroma_rendez_vous_duree CHECK (((fin > debut) AND ((fin - debut) <= '12:00:00'::interval)))
  constraint tiroma_rendez_vous_empreinte_check CHECK ((empreinte ~ '^[0-9a-f]{64}$'::text))
  constraint tiroma_rendez_vous_motif_code_check CHECK (((char_length(motif_code) >= 1) AND (char_length(motif_code) <= 40)))
  constraint tiroma_rendez_vous_pkey PRIMARY KEY (id)
  constraint tiroma_rendez_vous_presume CHECK (((presume IS NULL) OR (statut = 'prevu'::text)))
  constraint tiroma_rendez_vous_presume_check CHECK ((presume = ANY (ARRAY['honore'::text, 'absent'::text])))
  constraint tiroma_rendez_vous_seance_rang_check CHECK ((seance_rang >= 1))
  constraint tiroma_rendez_vous_source_ref_check CHECK (((char_length(source_ref) >= 1) AND (char_length(source_ref) <= 200)))
  constraint tiroma_rendez_vous_source_une_fois UNIQUE (client_id, entite_id, source_ref)
  constraint tiroma_rendez_vous_statut_check CHECK ((statut = ANY (ARRAY['prevu'::text, 'honore'::text, 'manque'::text, 'annule'::text, 'reporte'::text, 'supprime'::text])))
  policy "tiroma : on voit les rendez-vous de son perimetre" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND ((entite_id IN ( SELECT private.tiroma_cabinets_patients() AS tiroma_cabinets_patients)) OR ((entite_id, praticien_id) IN ( SELECT p.entite_id,
    p.praticien_id
   FROM private.tiroma_praticiens_patients() p(entite_id, praticien_id)))))) with check ()
  CREATE TRIGGER tiroma_rendez_vous_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tiroma_rendez_vous FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('+statut', '+debut', '+fin', '+praticien_id', '+fauteuil_id', '+type_rdv_id', '+plan_id', '+presume')
  grants authenticated: SELECT

-- ═══ TABLE public.tiroma_seances_modele
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  famille text not null
  seances jsonb not null
  statut text not null default 'propose'::text
  valide_par uuid
  valide_le timestamp with time zone
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint tiroma_seances_modele_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES tiroma_cabinets(client_id, entite_id) ON DELETE CASCADE
  constraint tiroma_seances_modele_famille_check CHECK ((famille = ANY (ARRAY['controle'::text, 'detartrage'::text, 'soin_conservateur'::text, 'endodontie'::text, 'prothese_preparation'::text, 'prothese_empreinte'::text, 'prothese_pose'::text, 'implant_chirurgie'::text, 'implant_prothese'::text, 'chirurgie'::text, 'parodontie'::text, 'orthodontie_pose'::text, 'orthodontie_controle'::text, 'urgence'::text, 'premiere_consultation'::text, 'personnel'::text, 'autre'::text])))
  constraint tiroma_seances_modele_forme CHECK (private.tiroma_seances_valides(seances))
  constraint tiroma_seances_modele_pkey PRIMARY KEY (id)
  constraint tiroma_seances_modele_statut_check CHECK ((statut = ANY (ARRAY['propose'::text, 'valide'::text])))
  constraint tiroma_seances_modele_une_fois UNIQUE (client_id, entite_id, famille)
  constraint tiroma_seances_modele_validation_datee CHECK (((statut <> 'valide'::text) OR (valide_le IS NOT NULL)))
  policy "tiroma : le titulaire change une seance type" UPDATE to authenticated using (private.tiroma_est_titulaire(client_id, entite_id)) with check (private.tiroma_est_titulaire(client_id, entite_id))
  policy "tiroma : le titulaire lit les seances types" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (entite_id IN ( SELECT private.tiroma_cabinets_ou(ARRAY['titulaire'::text]) AS tiroma_cabinets_ou)))) with check ()
  policy "tiroma : le titulaire pose une seance type" INSERT to authenticated using () with check (private.tiroma_est_titulaire(client_id, entite_id))
  policy "tiroma : le titulaire retire une seance type" DELETE to authenticated using (private.tiroma_est_titulaire(client_id, entite_id)) with check ()
  CREATE TRIGGER tiroma_seances_modele_signer BEFORE UPDATE ON public.tiroma_seances_modele FOR EACH ROW EXECUTE FUNCTION private.tiroma_signer_validation()
  CREATE TRIGGER tiroma_seances_modele_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tiroma_seances_modele FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.tiroma_stock
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  source_ref text
  famille text not null default 'implant'::text
  marque text
  reference text not null
  diametre_mm numeric(4,2)
  longueur_mm numeric(4,1)
  quantite integer not null default 0
  seuil integer
  lot text
  peremption date
  source text not null default 'saisie'::text
  maj_le timestamp with time zone not null default now()
  vu_dernier_le timestamp with time zone
  constraint tiroma_stock_cle UNIQUE (client_id, entite_id, id)
  constraint tiroma_stock_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES tiroma_cabinets(client_id, entite_id) ON DELETE CASCADE
  constraint tiroma_stock_diametre_mm_check CHECK ((diametre_mm > (0)::numeric))
  constraint tiroma_stock_famille_check CHECK ((famille = ANY (ARRAY['implant'::text, 'autre'::text])))
  constraint tiroma_stock_longueur_mm_check CHECK ((longueur_mm > (0)::numeric))
  constraint tiroma_stock_lot_check CHECK (((char_length(lot) >= 1) AND (char_length(lot) <= 60)))
  constraint tiroma_stock_marque_check CHECK (((char_length(marque) >= 1) AND (char_length(marque) <= 80)))
  constraint tiroma_stock_pkey PRIMARY KEY (id)
  constraint tiroma_stock_quantite_check CHECK ((quantite >= 0))
  constraint tiroma_stock_reference_check CHECK (((char_length(reference) >= 1) AND (char_length(reference) <= 80)))
  constraint tiroma_stock_seuil_check CHECK ((seuil >= 0))
  constraint tiroma_stock_source_check CHECK ((source = ANY (ARRAY['logiciel'::text, 'saisie'::text, 'filed'::text])))
  constraint tiroma_stock_source_ref_check CHECK (((char_length(source_ref) >= 1) AND (char_length(source_ref) <= 200)))
  constraint tiroma_stock_source_une_fois UNIQUE (client_id, entite_id, source_ref)
  policy "tiroma : l'equipe voit le stock" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (entite_id IN ( SELECT private.tiroma_cabinets_ou(ARRAY['titulaire'::text, 'collaborateur'::text, 'assistante'::text]) AS tiroma_cabinets_ou)))) with check ()
  CREATE TRIGGER tiroma_stock_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tiroma_stock FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('maj_le', 'vu_dernier_le')
  grants authenticated: SELECT

-- ═══ TABLE public.tiroma_travaux_labo
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  source_ref text
  patient_id uuid not null
  rendez_vous_pose_id uuid
  rendez_vous_empreinte_id uuid
  laboratoire text
  type_travail text
  envoye_le date
  retour_attendu_le date
  revenu_le date
  statut text not null default 'attendu'::text
  source text not null
  empreinte text
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  vu_dernier_le timestamp with time zone
  constraint tiroma_travaux_labo_client_id_entite_id_patient_id_fkey FOREIGN KEY (client_id, entite_id, patient_id) REFERENCES tiroma_patients(client_id, entite_id, id) ON DELETE CASCADE
  constraint tiroma_travaux_labo_client_id_entite_id_rendez_vous_emprei_fkey FOREIGN KEY (client_id, entite_id, rendez_vous_empreinte_id) REFERENCES tiroma_rendez_vous(client_id, entite_id, id) ON DELETE SET NULL (rendez_vous_empreinte_id)
  constraint tiroma_travaux_labo_client_id_entite_id_rendez_vous_pose_i_fkey FOREIGN KEY (client_id, entite_id, rendez_vous_pose_id) REFERENCES tiroma_rendez_vous(client_id, entite_id, id) ON DELETE SET NULL (rendez_vous_pose_id)
  constraint tiroma_travaux_labo_empreinte_check CHECK ((empreinte ~ '^[0-9a-f]{64}$'::text))
  constraint tiroma_travaux_labo_laboratoire_check CHECK (((char_length(laboratoire) >= 1) AND (char_length(laboratoire) <= 120)))
  constraint tiroma_travaux_labo_pkey PRIMARY KEY (id)
  constraint tiroma_travaux_labo_revenu CHECK (((statut <> 'revenu'::text) OR (revenu_le IS NOT NULL)))
  constraint tiroma_travaux_labo_source_check CHECK ((source = ANY (ARRAY['logiciel'::text, 'saisie'::text, 'deduit'::text, 'lecture'::text])))
  constraint tiroma_travaux_labo_source_ref_check CHECK (((char_length(source_ref) >= 1) AND (char_length(source_ref) <= 200)))
  constraint tiroma_travaux_labo_source_une_fois UNIQUE (client_id, entite_id, source_ref)
  constraint tiroma_travaux_labo_statut_check CHECK ((statut = ANY (ARRAY['attendu'::text, 'en_fabrication'::text, 'revenu'::text, 'annule'::text])))
  constraint tiroma_travaux_labo_type_travail_check CHECK (((char_length(type_travail) >= 1) AND (char_length(type_travail) <= 120)))
  policy "tiroma : on voit les travaux des patients qu'on voit" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (patient_id IN ( SELECT pa.id
   FROM tiroma_patients pa)))) with check ()
  CREATE TRIGGER tiroma_travaux_labo_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tiroma_travaux_labo FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('+statut', '+source', '+envoye_le', '+retour_attendu_le', '+revenu_le', '+rendez_vous_pose_id')
  grants authenticated: SELECT

-- ═══ TABLE public.tiroma_types_rdv
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  libelle_source text not null
  categorie_source text
  duree_defaut_min smallint
  famille text
  necessite_labo boolean not null default false
  chirurgie boolean not null default false
  exige_assistante boolean not null default true
  capacite_requise text
  classe_par text
  confiance text
  statut text not null default 'a_classer'::text
  valide_par uuid
  valide_le timestamp with time zone
  vu_dernier_le timestamp with time zone
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint tiroma_types_rdv_capacite_requise_check CHECK ((capacite_requise = ANY (ARRAY['soins'::text, 'prothese'::text, 'chirurgie'::text, 'orthodontie'::text, 'prevention'::text])))
  constraint tiroma_types_rdv_categorie_source_check CHECK (((char_length(categorie_source) >= 1) AND (char_length(categorie_source) <= 120)))
  constraint tiroma_types_rdv_classe_avant_validation CHECK (((statut = 'a_classer'::text) OR (famille IS NOT NULL)))
  constraint tiroma_types_rdv_classe_par_check CHECK ((classe_par = ANY (ARRAY['regle'::text, 'ia'::text, 'humain'::text])))
  constraint tiroma_types_rdv_cle UNIQUE (client_id, entite_id, id)
  constraint tiroma_types_rdv_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES tiroma_cabinets(client_id, entite_id) ON DELETE CASCADE
  constraint tiroma_types_rdv_confiance_check CHECK ((confiance = ANY (ARRAY['haute'::text, 'moyenne'::text, 'basse'::text])))
  constraint tiroma_types_rdv_duree_defaut_min_check CHECK (((duree_defaut_min >= 5) AND (duree_defaut_min <= 600)))
  constraint tiroma_types_rdv_famille_check CHECK ((famille = ANY (ARRAY['controle'::text, 'detartrage'::text, 'soin_conservateur'::text, 'endodontie'::text, 'prothese_preparation'::text, 'prothese_empreinte'::text, 'prothese_pose'::text, 'implant_chirurgie'::text, 'implant_prothese'::text, 'chirurgie'::text, 'parodontie'::text, 'orthodontie_pose'::text, 'orthodontie_controle'::text, 'urgence'::text, 'premiere_consultation'::text, 'personnel'::text, 'autre'::text])))
  constraint tiroma_types_rdv_libelle_source_check CHECK (((char_length(libelle_source) >= 1) AND (char_length(libelle_source) <= 200)))
  constraint tiroma_types_rdv_pkey PRIMARY KEY (id)
  constraint tiroma_types_rdv_statut_check CHECK ((statut = ANY (ARRAY['a_classer'::text, 'propose'::text, 'valide'::text])))
  constraint tiroma_types_rdv_une_fois UNIQUE (client_id, entite_id, libelle_source)
  constraint tiroma_types_rdv_validation_datee CHECK (((statut <> 'valide'::text) OR (valide_le IS NOT NULL)))
  policy "tiroma : l'equipe lit le vocabulaire" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (entite_id IN ( SELECT private.tiroma_cabinets_ou(ARRAY['titulaire'::text, 'collaborateur'::text, 'assistante'::text]) AS tiroma_cabinets_ou)))) with check ()
  policy "tiroma : le titulaire classe le vocabulaire" UPDATE to authenticated using (private.tiroma_est_titulaire(client_id, entite_id)) with check (private.tiroma_est_titulaire(client_id, entite_id))
  CREATE TRIGGER tiroma_types_rdv_signer BEFORE UPDATE ON public.tiroma_types_rdv FOR EACH ROW EXECUTE FUNCTION private.tiroma_signer_validation()
  CREATE TRIGGER tiroma_types_rdv_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tiroma_types_rdv FOR EACH ROW WHEN (private.tiroma_trace_ecriture()) EXECUTE FUNCTION private.tracer('+famille', '+necessite_labo', '+chirurgie', '+exige_assistante', '+capacite_requise', '+duree_defaut_min', '+classe_par', '+statut', '+valide_par', '+valide_le')
  grants authenticated: SELECT,UPDATE


-- ══════════════════ FONCTIONS (public et private, telles quelles) ══════════════════

-- ═══ FONCTION private.tiroma_accorder_droits
CREATE OR REPLACE FUNCTION private.tiroma_accorder_droits(p_client uuid, p_user uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  delete from public.droits d
  where d.client_id = p_client and d.user_id = p_user
    and d.droit in ('tiroma.voir_sa_production', 'tiroma.voir_charge', 'tiroma.voir_production');
  delete from public.acces_objets a
  where a.client_id = p_client and a.user_id = p_user and a.objet_type = 'praticien';

  if not exists (select 1 from public.comptes c where c.user_id = p_user and c.client_id = p_client) then
    return;
  end if;

  if exists (select 1 from public.tiroma_profils p
             where p.client_id = p_client and p.user_id = p_user and p.praticien_id is not null) then
    insert into public.objets_restreints (client_id, objet_type) values (p_client, 'praticien')
    on conflict (client_id, objet_type) do nothing;
    insert into public.droits (client_id, droit, user_id) values (p_client, 'tiroma.voir_sa_production', p_user)
    on conflict do nothing;
    insert into public.acces_objets (client_id, objet_type, objet_id, user_id, niveau)
    select distinct p_client, 'praticien', p.praticien_id::text, p_user, 'lecture'
    from public.tiroma_profils p
    where p.client_id = p_client and p.user_id = p_user and p.praticien_id is not null
    on conflict do nothing;
  end if;

  if exists (select 1 from public.tiroma_profils p
             where p.client_id = p_client and p.user_id = p_user and p.profil = 'direction') then
    insert into public.droits (client_id, droit, user_id)
    values (p_client, 'tiroma.voir_charge', p_user), (p_client, 'tiroma.voir_production', p_user)
    on conflict do nothing;
  end if;
end $function$


-- ═══ FONCTION private.tiroma_appliquer_actes
CREATE OR REPLACE FUNCTION private.tiroma_appliquer_actes(p_client uuid, p_entite uuid, p_instantane uuid, p_reprise boolean, p_detecte timestamp with time zone, p_fuseau text, p_releve uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e record;
  v_res text;
  n_aj integer := 0; n_mod integer := 0; n_disp integer := 0; n_sans integer := 0; n_ign integer := 0;
begin
  for e in select x.nature, x.avant, x.apres from public.instantanes_ecarts x where x.instantane_id = p_instantane order by x.n nulls last, x.id loop
    if e.nature = 'disparition' then
      -- Un acte retiré du logiciel (erreur de saisie) n'a jamais été facturé.
      delete from public.tiroma_actes_realises
       where client_id = p_client and entite_id = p_entite and source_ref = private.tiroma_v(e.avant, 'ref');
      if found then n_disp := n_disp + 1; else n_ign := n_ign + 1; end if;
      continue;
    end if;
    v_res := private.tiroma_ligne_acte(p_client, p_entite, e.apres, p_fuseau, p_detecte);
    case v_res
      when 'ajout' then n_aj := n_aj + 1;
      when 'modification' then n_mod := n_mod + 1;
      when 'sans_patient' then n_sans := n_sans + 1;
      else n_ign := n_ign + 1;
    end case;
  end loop;
  return jsonb_build_object('ajouts', n_aj, 'modifications', n_mod, 'disparitions', n_disp, 'sans_patient', n_sans, 'ignores', n_ign);
end $function$


-- ═══ FONCTION private.tiroma_appliquer_agenda
CREATE OR REPLACE FUNCTION private.tiroma_appliquer_agenda(p_client uuid, p_entite uuid, p_instantane uuid, p_reprise boolean, p_detecte timestamp with time zone, p_fuseau text, p_releve uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e record;
  r public.tiroma_rendez_vous;
  v_nouveau public.tiroma_rendez_vous;
  v jsonb;
  l jsonb;
  v_lib jsonb[] := '{}'::jsonb[];
  v_ref text; v_patient_ref text; v_motif text; v_statut text;
  v_patient uuid; v_prat uuid; v_faut uuid; v_type uuid; v_plan uuid;
  v_debut timestamptz; v_fin timestamptz; v_duree integer;
  v_avant jsonb; v_apres jsonb;
  n_aj integer := 0; n_mod integer := 0; n_disp integer := 0; n_ev integer := 0; n_classer integer := 0; n_ign integer := 0;
begin
  for e in select x.nature, x.avant, x.apres from public.instantanes_ecarts x where x.instantane_id = p_instantane order by x.n nulls last, x.id loop
    if e.nature = 'disparition' then
      v_ref := private.tiroma_v(e.avant, 'ref');
      select * into r from public.tiroma_rendez_vous where client_id = p_client and entite_id = p_entite and source_ref = v_ref;
      if v_ref is null or not found then
        n_ign := n_ign + 1;
        continue;
      end if;
      n_disp := n_disp + 1;
      if r.statut not in ('annule', 'supprime') then
        if not p_reprise and r.statut in ('prevu', 'honore') and r.debut > p_detecte then
          v_lib := v_lib || jsonb_build_object('rdv', r.id, 'patient', r.patient_id, 'avant', private.tiroma_rdv_json(r),
                                               'nature', 'annulation', 'ref', r.source_ref);
        end if;
        update public.tiroma_rendez_vous
           set statut = 'supprime', presume = null, disparu_le = p_detecte, vu_dernier_le = p_detecte
         where id = r.id;
      else
        update public.tiroma_rendez_vous set disparu_le = coalesce(disparu_le, p_detecte), vu_dernier_le = p_detecte where id = r.id;
      end if;
      continue;
    end if;

    v := e.apres;
    v_ref := private.tiroma_v(v, 'ref');
    v_debut := private.tiroma_v_instant(v, 'debut', p_fuseau);
    if v_ref is null or v_debut is null then
      n_ign := n_ign + 1;
      continue;
    end if;
    v_type := private.tiroma_type_par_libelle(p_client, p_entite, private.tiroma_v(v, 'type'), null, null, p_detecte);
    v_duree := private.tiroma_v_entier(v, 'duree_min');
    v_fin := private.tiroma_v_instant(v, 'fin', p_fuseau);
    if v_fin is null then
      if v_duree is null or v_duree < 1 then
        select t.duree_defaut_min into v_duree from public.tiroma_types_rdv t where t.id = v_type;
      end if;
      v_fin := v_debut + make_interval(mins => coalesce(v_duree, 30));
    end if;
    if v_fin <= v_debut then
      v_fin := v_debut + interval '30 minutes';
    end if;
    if v_fin - v_debut > interval '12 hours' then
      v_fin := v_debut + interval '12 hours';
    end if;
    v_statut := private.tiroma_statut_rdv(private.tiroma_v(v, 'statut'));
    if v_statut is null then
      v_statut := 'prevu';
      n_classer := n_classer + 1;
    end if;
    v_patient_ref := private.tiroma_v(v, 'patient_ref');
    v_patient := private.tiroma_patient_par_ref(p_client, p_entite, v_patient_ref, private.tiroma_v(v, 'patient_nom'), null,
                                                private.tiroma_v_date(v, 'patient_naissance'), p_detecte);
    v_prat := private.tiroma_praticien_par_ref(p_client, p_entite, private.tiroma_v(v, 'praticien'), p_detecte);
    v_faut := private.tiroma_fauteuil_par_ref(p_client, p_entite, private.tiroma_v(v, 'salle'), p_detecte);
    v_plan := null;
    select p.id into v_plan from public.tiroma_plans p
    where p.client_id = p_client and p.entite_id = p_entite and p.source_ref = private.tiroma_v(v, 'devis_ref');
    -- Le motif n'est gardé que sous forme de code : un mot, jamais un texte.
    v_motif := private.tiroma_v(v, 'motif');
    v_motif := case when v_motif ~ '^[[:alnum:]_.-]{1,40}$' then v_motif end;

    select * into r from public.tiroma_rendez_vous where client_id = p_client and entite_id = p_entite and source_ref = left(v_ref, 200);
    if not found then
      insert into public.tiroma_rendez_vous (client_id, entite_id, source_ref, patient_id, praticien_id, fauteuil_id, type_rdv_id,
                                             debut, fin, statut, motif_code, plan_id, seance_rang, cree_source_le, empreinte,
                                             vu_premier_le, vu_dernier_le)
      values (p_client, p_entite, left(v_ref, 200), v_patient, v_prat, v_faut, v_type, v_debut, v_fin, v_statut, v_motif, v_plan,
              nullif(greatest(private.tiroma_v_entier(v, 'seance'), 0), 0), private.tiroma_v_instant(v, 'cree_le', p_fuseau),
              encode(sha256(convert_to(v::text, 'UTF8')), 'hex'), p_detecte, p_detecte)
      returning * into r;
      n_aj := n_aj + 1;
      if not p_reprise and r.statut = 'prevu' and r.debut > p_detecte then
        n_ev := n_ev + private.tiroma_evenement(p_client, p_entite, r.id, r.patient_id, 'creation', null, private.tiroma_rdv_json(r),
                                                p_detecte, p_releve, 'creation:' || r.source_ref || ':' || p_instantane);
      end if;
      continue;
    end if;

    n_mod := n_mod + 1;
    v_avant := private.tiroma_rdv_json(r);
    if v_patient_ref is null then
      v_patient := r.patient_id;
    end if;
    update public.tiroma_rendez_vous
       set patient_id = v_patient, praticien_id = v_prat, fauteuil_id = v_faut, type_rdv_id = v_type,
           debut = v_debut, fin = v_fin, statut = v_statut,
           motif_code = coalesce(v_motif, case when v_statut = r.statut then motif_code end),
           plan_id = coalesce(v_plan, plan_id),
           seance_rang = coalesce(nullif(greatest(private.tiroma_v_entier(v, 'seance'), 0), 0), seance_rang),
           cree_source_le = coalesce(private.tiroma_v_instant(v, 'cree_le', p_fuseau), cree_source_le),
           presume = case when v_statut = 'prevu' then presume end,
           empreinte = encode(sha256(convert_to(v::text, 'UTF8')), 'hex'),
           vu_dernier_le = p_detecte, disparu_le = null
     where id = r.id
     returning * into v_nouveau;
    if p_reprise then
      continue;
    end if;
    v_apres := private.tiroma_rdv_json(v_nouveau);
    if r.statut not in ('annule', 'supprime', 'reporte') and v_statut in ('annule', 'supprime', 'reporte') then
      if r.debut > p_detecte then
        v_lib := v_lib || jsonb_build_object('rdv', r.id, 'patient', r.patient_id, 'avant', v_avant,
                                             'nature', case when v_statut = 'reporte' then 'report' else 'annulation' end, 'ref', r.source_ref);
      end if;
    elsif v_statut = 'manque' and r.statut <> 'manque' then
      n_ev := n_ev + private.tiroma_evenement(p_client, p_entite, r.id, v_nouveau.patient_id, 'absence', v_avant, v_apres,
                                              p_detecte, p_releve, 'absence:' || r.source_ref);
    elsif v_statut = 'honore' and r.statut <> 'honore' then
      n_ev := n_ev + private.tiroma_evenement(p_client, p_entite, r.id, v_nouveau.patient_id, 'honore', v_avant, v_apres,
                                              p_detecte, p_releve, 'honore:' || r.source_ref);
    elsif r.statut in ('annule', 'supprime', 'reporte') and v_statut = 'prevu' then
      n_ev := n_ev + private.tiroma_evenement(p_client, p_entite, r.id, v_nouveau.patient_id, 'reapparition', v_avant, v_apres,
                                              p_detecte, p_releve, 'reapparition:' || r.source_ref || ':' || p_instantane);
    elsif v_statut = 'prevu' and r.statut = 'prevu'
          and (r.debut, r.fin, r.fauteuil_id, r.praticien_id) is distinct from (v_nouveau.debut, v_nouveau.fin, v_nouveau.fauteuil_id, v_nouveau.praticien_id) then
      if r.debut > p_detecte then
        n_ev := n_ev + private.tiroma_evenement(p_client, p_entite, r.id, v_nouveau.patient_id, 'deplacement', v_avant, v_apres,
                                                p_detecte, p_releve, 'deplacement:' || r.source_ref || ':' || p_instantane);
      end if;
    elsif (r.type_rdv_id, r.plan_id) is distinct from (v_nouveau.type_rdv_id, v_nouveau.plan_id)
          or (r.patient_id is distinct from v_nouveau.patient_id
              and not exists (select 1 from public.tiroma_patients p where p.id = r.patient_id and p.fusionne_dans_id = v_nouveau.patient_id)) then
      n_ev := n_ev + private.tiroma_evenement(p_client, p_entite, r.id, v_nouveau.patient_id, 'modification', v_avant, v_apres,
                                              p_detecte, p_releve, 'modification:' || r.source_ref || ':' || p_instantane);
    end if;
  end loop;

  foreach l in array v_lib loop
    v_nouveau := null;
    if (l ->> 'patient') is not null then
      select * into v_nouveau from public.tiroma_rendez_vous n
      where n.client_id = p_client and n.entite_id = p_entite and n.patient_id = (l ->> 'patient')::uuid
        and n.id <> (l ->> 'rdv')::uuid and n.vu_premier_le = p_detecte and n.statut = 'prevu' and n.debut > p_detecte
      order by n.debut
      limit 1;
    end if;
    if v_nouveau.id is not null or l ->> 'nature' = 'report' then
      n_ev := n_ev + private.tiroma_evenement(p_client, p_entite, (l ->> 'rdv')::uuid, (l ->> 'patient')::uuid, 'report', l -> 'avant',
                case when v_nouveau.id is not null
                     then private.tiroma_rdv_json(v_nouveau) || jsonb_build_object('rendez_vous_id', v_nouveau.id) end,
                p_detecte, p_releve, 'report:' || (l ->> 'ref') || ':' || p_instantane);
    else
      n_ev := n_ev + private.tiroma_evenement(p_client, p_entite, (l ->> 'rdv')::uuid, (l ->> 'patient')::uuid, 'annulation', l -> 'avant', null,
                p_detecte, p_releve, 'annulation:' || (l ->> 'ref') || ':' || p_instantane);
    end if;
  end loop;
  return jsonb_build_object('ajouts', n_aj, 'modifications', n_mod, 'disparitions', n_disp, 'evenements', n_ev,
                            'a_classer', n_classer, 'ignores', n_ign);
end $function$


-- ═══ FONCTION private.tiroma_appliquer_attente
CREATE OR REPLACE FUNCTION private.tiroma_appliquer_attente(p_client uuid, p_entite uuid, p_instantane uuid, p_reprise boolean, p_detecte timestamp with time zone, p_fuseau text, p_releve uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e record;
  v_res text;
  n_aj integer := 0; n_mod integer := 0; n_disp integer := 0; n_sans integer := 0; n_ign integer := 0;
begin
  for e in select x.nature, x.avant, x.apres from public.instantanes_ecarts x where x.instantane_id = p_instantane order by x.n nulls last, x.id loop
    if e.nature = 'disparition' then
      update public.tiroma_liste_attente
         set retire_le = p_detecte, motif_retrait = 'autre', vu_dernier_le = p_detecte, maj_le = now()
       where client_id = p_client and entite_id = p_entite and source_ref = private.tiroma_v(e.avant, 'ref') and retire_le is null;
      if found then n_disp := n_disp + 1; else n_ign := n_ign + 1; end if;
      continue;
    end if;
    v_res := private.tiroma_ligne_attente(p_client, p_entite, e.apres, p_fuseau, p_detecte);
    case v_res
      when 'ajout' then n_aj := n_aj + 1;
      when 'modification' then n_mod := n_mod + 1;
      when 'sans_patient' then n_sans := n_sans + 1;
      else n_ign := n_ign + 1;
    end case;
  end loop;
  return jsonb_build_object('ajouts', n_aj, 'modifications', n_mod, 'disparitions', n_disp, 'sans_patient', n_sans, 'ignores', n_ign);
end $function$


-- ═══ FONCTION private.tiroma_appliquer_devis
CREATE OR REPLACE FUNCTION private.tiroma_appliquer_devis(p_client uuid, p_entite uuid, p_instantane uuid, p_reprise boolean, p_detecte timestamp with time zone, p_fuseau text, p_releve uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e record;
  r public.tiroma_plans;
  g public.tiroma_regles;
  v jsonb;
  v_num text; v_statut text;
  v_patient uuid; v_prat uuid;
  v_date date; v_accepte date;
  n_aj integer := 0; n_mod integer := 0; n_disp integer := 0; n_classer integer := 0; n_ign integer := 0; n_sans integer := 0;
begin
  select * into g from public.tiroma_regles where client_id = p_client and entite_id = p_entite;
  for e in select x.nature, x.avant, x.apres from public.instantanes_ecarts x where x.instantane_id = p_instantane order by x.n nulls last, x.id loop
    if e.nature = 'disparition' then
      update public.tiroma_plans set disparu_le = coalesce(disparu_le, p_detecte), vu_dernier_le = p_detecte
       where client_id = p_client and entite_id = p_entite and source_ref = private.tiroma_v(e.avant, 'numero');
      if found then n_disp := n_disp + 1; else n_ign := n_ign + 1; end if;
      continue;
    end if;
    v := e.apres;
    v_num := private.tiroma_v(v, 'numero');
    if v_num is null then
      n_ign := n_ign + 1;
      continue;
    end if;
    v_patient := private.tiroma_patient_par_ref(p_client, p_entite, private.tiroma_v(v, 'patient_ref'), null, null, null, p_detecte);
    if v_patient is null then
      n_sans := n_sans + 1;
      continue;
    end if;
    v_prat := private.tiroma_praticien_par_ref(p_client, p_entite, private.tiroma_v(v, 'praticien'), p_detecte);
    v_date := private.tiroma_v_date(v, 'date');
    v_accepte := private.tiroma_v_date(v, 'accepte_le');
    v_statut := private.tiroma_statut_devis(private.tiroma_v(v, 'statut'));
    if v_statut is null then
      v_statut := 'presente';
      n_classer := n_classer + 1;
    end if;
    if v_statut = 'presente' and v_accepte is not null then
      v_statut := 'signe';
    end if;
    select * into r from public.tiroma_plans where client_id = p_client and entite_id = p_entite and source_ref = left(v_num, 200);
    if not found then
      insert into public.tiroma_plans (client_id, entite_id, source_ref, patient_id, praticien_id, devis_numero, type, statut, presente_le,
                                       signe_le, signature_source, valide_jusqu_au, montant, reste_a_charge, part_amo, part_amc, panier,
                                       alternative_100_sante, clos_le, empreinte, vu_premier_le, vu_dernier_le)
      values (p_client, p_entite, left(v_num, 200), v_patient, v_prat, left(v_num, 60), private.tiroma_type_devis(private.tiroma_v(v, 'type')),
              v_statut, v_date,
              case when v_statut in ('signe', 'commence', 'termine') then v_accepte end,
              case when v_accepte is not null then 'logiciel' end,
              coalesce(private.tiroma_v_date(v, 'valide_jusqu_au'),
                       case when g.validite_devis_jours is not null and v_date is not null then v_date + g.validite_devis_jours end),
              case when private.tiroma_v_decimal(v, 'montant') >= 0 then private.tiroma_v_decimal(v, 'montant') end,
              case when private.tiroma_v_decimal(v, 'reste_a_charge') >= 0 then private.tiroma_v_decimal(v, 'reste_a_charge') end,
              case when private.tiroma_v_decimal(v, 'part_amo') >= 0 then private.tiroma_v_decimal(v, 'part_amo') end,
              case when private.tiroma_v_decimal(v, 'part_amc') >= 0 then private.tiroma_v_decimal(v, 'part_amc') end,
              private.tiroma_panier(private.tiroma_v(v, 'panier')), private.tiroma_v_bool(v, 'alternative_100_sante'),
              case when v_statut in ('termine', 'abandonne', 'expire', 'refuse') then p_detecte end,
              encode(sha256(convert_to(v::text, 'UTF8')), 'hex'), p_detecte, p_detecte);
      n_aj := n_aj + 1;
    else
      update public.tiroma_plans
         set patient_id = v_patient, praticien_id = coalesce(v_prat, praticien_id),
             type = private.tiroma_type_devis(private.tiroma_v(v, 'type')), statut = v_statut,
             presente_le = coalesce(v_date, presente_le),
             signe_le = case when v_statut in ('signe', 'commence', 'termine') then coalesce(v_accepte, signe_le) end,
             signature_source = case when v_accepte is not null then 'logiciel'
                                     when v_statut in ('signe', 'commence', 'termine') then signature_source end,
             valide_jusqu_au = coalesce(private.tiroma_v_date(v, 'valide_jusqu_au'), valide_jusqu_au),
             montant = case when private.tiroma_v_decimal(v, 'montant') >= 0 then private.tiroma_v_decimal(v, 'montant') else montant end,
             reste_a_charge = case when private.tiroma_v_decimal(v, 'reste_a_charge') >= 0 then private.tiroma_v_decimal(v, 'reste_a_charge') else reste_a_charge end,
             part_amo = case when private.tiroma_v_decimal(v, 'part_amo') >= 0 then private.tiroma_v_decimal(v, 'part_amo') else part_amo end,
             part_amc = case when private.tiroma_v_decimal(v, 'part_amc') >= 0 then private.tiroma_v_decimal(v, 'part_amc') else part_amc end,
             panier = coalesce(private.tiroma_panier(private.tiroma_v(v, 'panier')), panier),
             alternative_100_sante = coalesce(private.tiroma_v_bool(v, 'alternative_100_sante'), alternative_100_sante),
             clos_le = case when v_statut in ('termine', 'abandonne', 'expire', 'refuse') then coalesce(clos_le, p_detecte) end,
             empreinte = encode(sha256(convert_to(v::text, 'UTF8')), 'hex'), vu_dernier_le = p_detecte, disparu_le = null
       where id = r.id;
      n_mod := n_mod + 1;
    end if;
  end loop;
  return jsonb_build_object('ajouts', n_aj, 'modifications', n_mod, 'disparitions', n_disp, 'a_classer', n_classer,
                            'ignores', n_ign, 'sans_patient', n_sans);
end $function$


-- ═══ FONCTION private.tiroma_appliquer_devis_lignes
CREATE OR REPLACE FUNCTION private.tiroma_appliquer_devis_lignes(p_client uuid, p_entite uuid, p_instantane uuid, p_reprise boolean, p_detecte timestamp with time zone, p_fuseau text, p_releve uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e record;
  v_res text;
  n_aj integer := 0; n_mod integer := 0; n_disp integer := 0; n_orph integer := 0; n_ign integer := 0;
begin
  for e in select x.nature, x.avant, x.apres from public.instantanes_ecarts x where x.instantane_id = p_instantane order by x.n nulls last, x.id loop
    if e.nature = 'disparition' then
      delete from public.tiroma_plan_actes a using public.tiroma_plans p
       where a.plan_id = p.id and p.client_id = p_client and p.entite_id = p_entite
         and p.source_ref = private.tiroma_v(e.avant, 'numero') and a.rang = private.tiroma_v_entier(e.avant, 'rang');
      if found then n_disp := n_disp + 1; else n_ign := n_ign + 1; end if;
      continue;
    end if;
    v_res := private.tiroma_ligne_devis(p_client, p_entite, e.apres, p_detecte);
    case v_res
      when 'ajout' then n_aj := n_aj + 1;
      when 'modification' then n_mod := n_mod + 1;
      when 'orphelin' then n_orph := n_orph + 1;
      else n_ign := n_ign + 1;
    end case;
  end loop;
  return jsonb_build_object('ajouts', n_aj, 'modifications', n_mod, 'disparitions', n_disp, 'orphelines', n_orph, 'ignores', n_ign);
end $function$


-- ═══ FONCTION private.tiroma_appliquer_labo
CREATE OR REPLACE FUNCTION private.tiroma_appliquer_labo(p_client uuid, p_entite uuid, p_instantane uuid, p_reprise boolean, p_detecte timestamp with time zone, p_fuseau text, p_releve uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e record;
  v_res text;
  n_aj integer := 0; n_mod integer := 0; n_disp integer := 0; n_sans integer := 0; n_ign integer := 0;
begin
  for e in select x.nature, x.avant, x.apres from public.instantanes_ecarts x where x.instantane_id = p_instantane order by x.n nulls last, x.id loop
    if e.nature = 'disparition' then
      update public.tiroma_travaux_labo
         set statut = case when statut = 'revenu' then statut else 'annule' end, maj_le = now(), vu_dernier_le = p_detecte
       where client_id = p_client and entite_id = p_entite and source_ref = private.tiroma_v(e.avant, 'ref');
      if found then n_disp := n_disp + 1; else n_ign := n_ign + 1; end if;
      continue;
    end if;
    v_res := private.tiroma_ligne_labo(p_client, p_entite, e.apres, p_detecte);
    case v_res
      when 'ajout' then n_aj := n_aj + 1;
      when 'modification' then n_mod := n_mod + 1;
      when 'sans_patient' then n_sans := n_sans + 1;
      else n_ign := n_ign + 1;
    end case;
  end loop;
  return jsonb_build_object('ajouts', n_aj, 'modifications', n_mod, 'disparitions', n_disp, 'sans_patient', n_sans, 'ignores', n_ign);
end $function$


-- ═══ FONCTION private.tiroma_appliquer_odf
CREATE OR REPLACE FUNCTION private.tiroma_appliquer_odf(p_client uuid, p_entite uuid, p_instantane uuid, p_reprise boolean, p_detecte timestamp with time zone, p_fuseau text, p_releve uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e record;
  v_res text;
  n_aj integer := 0; n_mod integer := 0; n_disp integer := 0; n_sans integer := 0; n_ign integer := 0;
begin
  for e in select x.nature, x.avant, x.apres from public.instantanes_ecarts x where x.instantane_id = p_instantane order by x.n nulls last, x.id loop
    if e.nature = 'disparition' then
      update public.tiroma_ententes_odf
         set statut = case when statut = 'commencee' then 'terminee' when statut in ('demandee', 'accordee') then 'abandonnee' else statut end,
             fin_le = case when statut = 'commencee' then coalesce(fin_le, (p_detecte at time zone p_fuseau)::date) else fin_le end,
             vu_dernier_le = p_detecte, maj_le = now()
       where client_id = p_client and entite_id = p_entite and source_ref = private.tiroma_v(e.avant, 'ref');
      if found then n_disp := n_disp + 1; else n_ign := n_ign + 1; end if;
      continue;
    end if;
    v_res := private.tiroma_ligne_odf(p_client, p_entite, e.apres, p_detecte);
    case v_res
      when 'ajout' then n_aj := n_aj + 1;
      when 'modification' then n_mod := n_mod + 1;
      when 'sans_patient' then n_sans := n_sans + 1;
      else n_ign := n_ign + 1;
    end case;
  end loop;
  return jsonb_build_object('ajouts', n_aj, 'modifications', n_mod, 'disparitions', n_disp, 'sans_patient', n_sans, 'ignores', n_ign);
end $function$


-- ═══ FONCTION private.tiroma_appliquer_patients
CREATE OR REPLACE FUNCTION private.tiroma_appliquer_patients(p_client uuid, p_entite uuid, p_instantane uuid, p_reprise boolean, p_detecte timestamp with time zone, p_fuseau text, p_releve uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e record;
  r public.tiroma_patients;
  v jsonb;
  v_ref text;
  v_cible uuid;
  v_prat uuid;
  v_naissance date;
  n_aj integer := 0; n_mod integer := 0; n_disp integer := 0; n_ev integer := 0; n_ign integer := 0; n_effaces integer := 0;
begin
  for e in select x.nature, x.avant, x.apres from public.instantanes_ecarts x where x.instantane_id = p_instantane order by x.n nulls last, x.id loop
    if e.nature = 'disparition' then
      v_ref := private.tiroma_v(e.avant, 'ref');
      select * into r from public.tiroma_patients where client_id = p_client and entite_id = p_entite and source_ref = v_ref;
      if v_ref is null or not found then
        n_ign := n_ign + 1;
        continue;
      end if;
      n_disp := n_disp + 1;
      if r.actif then
        select p.id into v_cible from public.tiroma_patients p
        where p.client_id = p_client and p.entite_id = p_entite and p.id <> r.id and p.actif and p.fusionne_dans_id is null
          and p.naissance is not null and p.naissance = r.naissance
          and lower(p.nom) = lower(r.nom) and lower(coalesce(p.prenom, '')) = lower(coalesce(r.prenom, ''))
        order by p.vu_premier_le desc
        limit 1;
        update public.tiroma_patients
           set actif = false, disparu_le = p_detecte, fusionne_dans_id = v_cible, vu_dernier_le = p_detecte
         where id = r.id;
        if v_cible is not null and not p_reprise then
          n_ev := n_ev + private.tiroma_evenement(p_client, p_entite, null, r.id, 'fusion', null,
                    jsonb_build_object('patient_id', v_cible), p_detecte, p_releve, 'fusion:' || r.source_ref || ':' || p_instantane);
        end if;
      end if;
      continue;
    end if;

    v := e.apres;
    v_ref := private.tiroma_v(v, 'ref');
    if v_ref is null then
      n_ign := n_ign + 1;
      continue;
    end if;
    if exists (select 1 from public.tiroma_effaces x
               where x.client_id = p_client and x.entite_id = p_entite
                 and x.empreinte_ref = private.tiroma_empreinte_ref(p_client, p_entite, left(v_ref, 200))) then
      n_effaces := n_effaces + 1;
      continue;
    end if;
    v_prat := private.tiroma_praticien_par_ref(p_client, p_entite, private.tiroma_v(v, 'praticien'), p_detecte);
    v_naissance := private.tiroma_v_date(v, 'naissance');
    v_naissance := case when v_naissance >= date '1900-01-01' then v_naissance end;
    select * into r from public.tiroma_patients where client_id = p_client and entite_id = p_entite and source_ref = left(v_ref, 200);
    if not found then
      insert into public.tiroma_patients (client_id, entite_id, source_ref, nom, prenom, naissance, praticien_habituel_id, famille_ref,
                                          ne_pas_contacter, questionnaire_le, dernier_rdv_le, dernier_controle_le, empreinte,
                                          vu_premier_le, vu_dernier_le)
      values (p_client, p_entite, left(v_ref, 200),
              left(coalesce(private.tiroma_v(v, 'nom'), '(patient ' || left(v_ref, 60) || ')'), 120),
              left(private.tiroma_v(v, 'prenom'), 120), v_naissance, v_prat, left(private.tiroma_v(v, 'famille_ref'), 200),
              coalesce(private.tiroma_v_bool(v, 'ne_pas_contacter'), false), private.tiroma_v_date(v, 'questionnaire_le'),
              private.tiroma_v_date(v, 'dernier_rdv_le'), private.tiroma_v_date(v, 'dernier_bilan_le'),
              encode(sha256(convert_to(v::text, 'UTF8')), 'hex'), p_detecte, p_detecte);
      n_aj := n_aj + 1;
    else
      update public.tiroma_patients
         set nom = left(coalesce(private.tiroma_v(v, 'nom'), nom), 120),
             prenom = left(coalesce(private.tiroma_v(v, 'prenom'), prenom), 120),
             naissance = coalesce(v_naissance, naissance),
             praticien_habituel_id = coalesce(v_prat, praticien_habituel_id),
             famille_ref = left(private.tiroma_v(v, 'famille_ref'), 200),
             ne_pas_contacter = coalesce(private.tiroma_v_bool(v, 'ne_pas_contacter'), false),
             questionnaire_le = coalesce(private.tiroma_v_date(v, 'questionnaire_le'), questionnaire_le),
             dernier_rdv_le = greatest(private.tiroma_v_date(v, 'dernier_rdv_le'), dernier_rdv_le),
             dernier_controle_le = greatest(private.tiroma_v_date(v, 'dernier_bilan_le'), dernier_controle_le),
             actif = true, disparu_le = null, fusionne_dans_id = null,
             empreinte = encode(sha256(convert_to(v::text, 'UTF8')), 'hex'), vu_dernier_le = p_detecte
       where id = r.id;
      n_mod := n_mod + 1;
    end if;
  end loop;
  return jsonb_build_object('ajouts', n_aj, 'modifications', n_mod, 'disparitions', n_disp, 'evenements', n_ev,
                            'ignores', n_ign, 'effaces_ignores', n_effaces);
end $function$


-- ═══ FONCTION private.tiroma_appliquer_releve
CREATE OR REPLACE FUNCTION private.tiroma_appliquer_releve(p_charge jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  b public.branchements;
  k public.tiroma_cabinets;
  rl public.releves;
  i record;
  v_rel uuid;
  v_recu timestamptz;
  v_reprise boolean;
  v_tout_reprise boolean;
  v_douteux boolean := false;
  v_raison text;
  v_jeux jsonb := '{}'::jsonb;
  c jsonb;
  v_res jsonb;
  v_appliques integer := 0;
  v_identiques integer := 0;
  v_lignes boolean := false;
  v_patients boolean := false;
  v_liens boolean := false;
  v_agenda boolean := false;
  v_statut text;
begin
  select * into b from public.branchements where id = (p_charge ->> 'branchement')::uuid;
  if not found or b.module <> 'tiroma' then
    raise exception 'Branchement introuvable ou étranger à Tiroma.' using errcode = 'P0002';
  end if;
  select * into k from public.tiroma_cabinets where client_id = b.client_id and entite_id = b.entite_id;
  if not found then
    raise exception 'Aucun cabinet Tiroma pour ce branchement.' using errcode = 'P0002';
  end if;
  select * into rl from public.releves where id = (p_charge ->> 'releve')::uuid and branchement_id = b.id;
  if not found then
    raise exception 'Relevé introuvable.' using errcode = 'P0002';
  end if;
  v_recu := rl.recu_le;
  perform set_config('omega.tiroma_moteur', 'releve', true);

  select x.id into v_rel from public.tiroma_releves x where x.client_id = b.client_id and x.releve_source_id = rl.id;
  if found then
    if not exists (select 1 from public.instantanes x where x.releve_id = rl.id and x.statut = 'a_appliquer') then
      return jsonb_build_object('releve', v_rel, 'deja_applique', true);
    end if;
  else
    v_tout_reprise := not exists (select 1 from public.instantanes x
                                  where x.releve_id = rl.id and x.statut in ('a_appliquer', 'applique', 'identique') and x.base_id is not null);
    insert into public.tiroma_releves (client_id, entite_id, releve_source_id, contrat, voie, mode, version_connecteur, recu_le, statut)
    values (b.client_id, b.entite_id, rl.id, 'tiroma.releve.v1', b.voie, case when v_tout_reprise then 'reprise' else 'complet' end,
            (select left(x.version_releve, 60) from public.instantanes x where x.releve_id = rl.id and x.version_releve is not null limit 1),
            rl.recu_le, 'en_cours')
    returning id into v_rel;
  end if;

  for i in
    select x.id, x.base_id, x.lignes, x.statut, j.code, j.id as jeu_id
    from public.instantanes x join public.branchements_jeux j on j.id = x.jeu_id
    where x.releve_id = rl.id and x.statut in ('a_appliquer', 'identique') and private.tiroma_ordre_jeu(j.code) is not null
    order by private.tiroma_ordre_jeu(j.code), x.recu_le
  loop
    perform private.tiroma_fermer_alertes_retard(b.client_id, i.jeu_id);
    if i.statut = 'identique' then
      v_identiques := v_identiques + 1;
      continue;
    end if;
    v_reprise := i.base_id is null;
    if i.code = 'agenda' and not v_reprise then
      v_raison := private.tiroma_garde_agenda(b.client_id, b.entite_id, i.id, b.fuseau, v_recu);
      if v_raison is not null then
        perform private.acquitter_instantane(i.id, 'douteux', v_raison);
        v_douteux := true;
        v_jeux := v_jeux || jsonb_build_object(i.code, jsonb_build_object('douteux', v_raison, 'lignes', i.lignes));
        perform private.journaliser_module(b.client_id, 'tiroma', 'tiroma.releve_douteux', 'tiroma_releves', v_rel::text,
          jsonb_build_object('releve', v_rel, 'jeu', i.code, 'raison', v_raison), b.entite_id);
        continue;
      end if;
    end if;
    c := case i.code
      when 'types_rdv'    then private.tiroma_appliquer_types(b.client_id, b.entite_id, i.id, v_reprise, v_recu, b.fuseau, v_rel)
      when 'patients'     then private.tiroma_appliquer_patients(b.client_id, b.entite_id, i.id, v_reprise, v_recu, b.fuseau, v_rel)
      when 'agenda'       then private.tiroma_appliquer_agenda(b.client_id, b.entite_id, i.id, v_reprise, v_recu, b.fuseau, v_rel)
      when 'devis'        then private.tiroma_appliquer_devis(b.client_id, b.entite_id, i.id, v_reprise, v_recu, b.fuseau, v_rel)
      when 'devis_lignes' then private.tiroma_appliquer_devis_lignes(b.client_id, b.entite_id, i.id, v_reprise, v_recu, b.fuseau, v_rel)
      when 'actes'        then private.tiroma_appliquer_actes(b.client_id, b.entite_id, i.id, v_reprise, v_recu, b.fuseau, v_rel)
      when 'labo'         then private.tiroma_appliquer_labo(b.client_id, b.entite_id, i.id, v_reprise, v_recu, b.fuseau, v_rel)
      when 'stock'        then private.tiroma_appliquer_stock(b.client_id, b.entite_id, i.id, v_reprise, v_recu, b.fuseau, v_rel)
      when 'odf'          then private.tiroma_appliquer_odf(b.client_id, b.entite_id, i.id, v_reprise, v_recu, b.fuseau, v_rel)
      when 'attente'      then private.tiroma_appliquer_attente(b.client_id, b.entite_id, i.id, v_reprise, v_recu, b.fuseau, v_rel)
    end;
    perform private.acquitter_instantane(i.id, 'applique');
    v_appliques := v_appliques + 1;
    if v_reprise then
      c := c || jsonb_build_object('reprise', true);
      perform private.journaliser_module(b.client_id, 'tiroma', 'tiroma.reprise_initiale', 'tiroma_releves', v_rel::text,
        jsonb_build_object('releve', v_rel, 'jeu', i.code, 'lignes', i.lignes), b.entite_id);
    end if;
    v_jeux := v_jeux || jsonb_build_object(i.code, c);
    v_lignes := v_lignes or i.code = 'devis' or (i.code = 'devis_lignes' and coalesce((c ->> 'orphelines')::integer, 0) > 0);
    v_patients := v_patients or (i.code = 'patients' and coalesce((c ->> 'ajouts')::integer, 0) > 0);
    v_liens := v_liens or i.code in ('agenda', 'devis', 'devis_lignes');
    v_agenda := v_agenda or i.code in ('agenda', 'actes', 'types_rdv');
  end loop;

  if v_appliques > 0 then
    v_res := private.tiroma_rattraper(b.client_id, b.entite_id, b.id, b.fuseau, v_recu, v_lignes, v_patients, v_liens);
    if v_res <> '{}'::jsonb then
      v_jeux := v_jeux || jsonb_build_object('rattrapage', v_res);
    end if;
    v_jeux := v_jeux || jsonb_build_object('presumes_honores', private.tiroma_presumer_honores(b.client_id, b.entite_id, b.fuseau, v_recu, v_rel));
    v_jeux := v_jeux || jsonb_build_object('patients_maj', private.tiroma_faits_patients(b.client_id, b.entite_id, b.fuseau, v_recu));
    if v_liens or v_agenda then
      v_jeux := v_jeux || jsonb_build_object('rattachements', private.tiroma_rattacher_plans(b.client_id, b.entite_id, b.fuseau, v_recu));
    end if;
    v_jeux := v_jeux || jsonb_build_object('capacites', private.tiroma_mesurer_capacites(b.client_id, b.entite_id, b.id, b.fuseau, v_recu));
  end if;
  v_jeux := v_jeux || jsonb_strip_nulls(jsonb_build_object(
    'identiques', nullif(v_identiques, 0),
    'patients_crees', nullif((select count(*) from public.tiroma_patients p where p.client_id = b.client_id and p.entite_id = b.entite_id and p.vu_premier_le = v_recu), 0),
    'praticiens_crees', nullif((select count(*) from public.tiroma_praticiens p where p.client_id = b.client_id and p.entite_id = b.entite_id and p.cree_le = v_recu), 0),
    'fauteuils_crees', nullif((select count(*) from public.tiroma_fauteuils f where f.client_id = b.client_id and f.entite_id = b.entite_id and f.cree_le = v_recu), 0),
    'types_crees', nullif((select count(*) from public.tiroma_types_rdv t where t.client_id = b.client_id and t.entite_id = b.entite_id and t.cree_le = v_recu), 0)));

  v_statut := case when v_douteux then 'douteux' else 'ok' end;
  update public.tiroma_releves
     set statut = v_statut, fini_le = now(), compteurs = v_jeux,
         raison = case when v_douteux then left((select string_agg(e.value ->> 'douteux', ' ; ') from jsonb_each(v_jeux) e where e.value ? 'douteux'), 500) end
   where id = v_rel;
  update public.tiroma_cabinets
     set dernier_releve_le = greatest(coalesce(dernier_releve_le, v_recu), v_recu),
         dernier_releve_ok_le = case when v_douteux then dernier_releve_ok_le else greatest(coalesce(dernier_releve_ok_le, v_recu), v_recu) end,
         releves_douteux_suite = case when v_douteux then releves_douteux_suite + 1 else 0 end
   where id = k.id;
  perform private.journaliser_module(b.client_id, 'tiroma', 'tiroma.releve_termine', 'tiroma_releves', v_rel::text,
    jsonb_build_object('releve', v_rel, 'statut', v_statut, 'appliques', v_appliques, 'compteurs', v_jeux), b.entite_id);
  if not v_douteux then
    perform private.battre(b.client_id, 'tiroma_releve', jsonb_build_object('releve', v_rel, 'appliques', v_appliques), interval '3 days');
  end if;
  return jsonb_build_object('releve', v_rel, 'statut', v_statut, 'appliques', v_appliques, 'compteurs', v_jeux);
end $function$


-- ═══ FONCTION private.tiroma_appliquer_stock
CREATE OR REPLACE FUNCTION private.tiroma_appliquer_stock(p_client uuid, p_entite uuid, p_instantane uuid, p_reprise boolean, p_detecte timestamp with time zone, p_fuseau text, p_releve uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e record;
  v_res text;
  n_aj integer := 0; n_mod integer := 0; n_disp integer := 0; n_ign integer := 0;
begin
  for e in select x.nature, x.avant, x.apres from public.instantanes_ecarts x where x.instantane_id = p_instantane order by x.n nulls last, x.id loop
    if e.nature = 'disparition' then
      delete from public.tiroma_stock
       where client_id = p_client and entite_id = p_entite and source = 'logiciel'
         and source_ref = left(private.tiroma_v(e.avant, 'reference') || coalesce('#' || private.tiroma_v(e.avant, 'lot'), ''), 200);
      if found then n_disp := n_disp + 1; else n_ign := n_ign + 1; end if;
      continue;
    end if;
    v_res := private.tiroma_ligne_stock(p_client, p_entite, e.apres, p_detecte);
    case v_res
      when 'ajout' then n_aj := n_aj + 1;
      when 'modification' then n_mod := n_mod + 1;
      else n_ign := n_ign + 1;
    end case;
  end loop;
  return jsonb_build_object('ajouts', n_aj, 'modifications', n_mod, 'disparitions', n_disp, 'ignores', n_ign);
end $function$


-- ═══ FONCTION private.tiroma_appliquer_types
CREATE OR REPLACE FUNCTION private.tiroma_appliquer_types(p_client uuid, p_entite uuid, p_instantane uuid, p_reprise boolean, p_detecte timestamp with time zone, p_fuseau text, p_releve uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e record;
  v_lib text;
  n_aj integer := 0; n_mod integer := 0; n_disp integer := 0; n_ign integer := 0;
begin
  for e in select x.nature, x.avant, x.apres from public.instantanes_ecarts x where x.instantane_id = p_instantane order by x.n nulls last, x.id loop
    if e.nature = 'disparition' then
      n_disp := n_disp + 1;
      continue;
    end if;
    v_lib := private.tiroma_v(e.apres, 'libelle');
    if v_lib is null then
      n_ign := n_ign + 1;
      continue;
    end if;
    perform private.tiroma_type_par_libelle(p_client, p_entite, v_lib, private.tiroma_v(e.apres, 'categorie'),
                                            private.tiroma_v_entier(e.apres, 'duree_min'), p_detecte);
    if e.nature = 'ajout' then n_aj := n_aj + 1; else n_mod := n_mod + 1; end if;
  end loop;
  return jsonb_build_object('ajouts', n_aj, 'modifications', n_mod, 'disparitions', n_disp, 'ignores', n_ign,
    'a_classer', (select count(*) from public.tiroma_types_rdv t
                  where t.client_id = p_client and t.entite_id = p_entite and t.statut = 'a_classer'));
end $function$


-- ═══ FONCTION private.tiroma_bornes_jour
CREATE OR REPLACE FUNCTION private.tiroma_bornes_jour(p_jour date, p_fuseau text)
 RETURNS tstzrange
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select tstzrange(p_jour::timestamp at time zone p_fuseau, (p_jour + 1)::timestamp at time zone p_fuseau, '[)')
$function$


-- ═══ FONCTION private.tiroma_brancher_cabinet
CREATE OR REPLACE FUNCTION private.tiroma_brancher_cabinet(p_client uuid, p_entite uuid, p_voie text DEFAULT 'exports'::text, p_libelle text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  k public.tiroma_cabinets;
  e public.entites;
  v_id uuid;
  v_jeux text[];
  v_nom text;
begin
  select * into k from public.tiroma_cabinets where client_id = p_client and entite_id = p_entite;
  if not found then
    raise exception 'Cabinet introuvable : installez-le d''abord (tiroma_installer_cabinet).' using errcode = 'P0002';
  end if;
  if k.statut = 'clos' then
    raise exception 'Ce cabinet est clos.' using errcode = '55000';
  end if;
  select * into e from public.entites where client_id = p_client and id = p_entite;
  if not exists (select 1 from public.modeles_jeux m where m.module = 'tiroma' and m.logiciel = k.logiciel) then
    raise exception 'Aucun modèle d''export pour le logiciel « % » : Tiroma ne lit pour l''instant que Logos_w.', k.logiciel
      using errcode = 'P0002';
  end if;
  v_nom := coalesce(p_libelle, case k.logiciel when 'logosw' then 'Logos_w' when 'julie' then 'Julie' when 'veasy' then 'Veasy'
                                               else initcap(k.logiciel) end || ' — ' || e.nom);
  v_id := private.brancher(p_client, 'tiroma', k.logiciel, p_voie, left(v_nom, 120), p_entite, e.fuseau, null);
  select array_agg(j.code order by private.tiroma_ordre_jeu(j.code)) into v_jeux
  from public.branchements_jeux j where j.branchement_id = v_id;
  update public.tiroma_cabinets set statut = 'actif' where id = k.id and statut in ('installation', 'coupe');
  perform private.journaliser_module(p_client, 'tiroma', 'tiroma.connecteur_active', 'tiroma_cabinets', k.id::text,
    jsonb_build_object('branchement', v_id, 'voie', p_voie, 'logiciel', k.logiciel, 'jeux', to_jsonb(v_jeux)), p_entite);
  perform private.battre(p_client, 'tiroma_releve', jsonb_build_object('branchement', v_id, 'etat', 'branche'), interval '3 days');
  return v_id;
end $function$


-- ═══ FONCTION private.tiroma_cabinets_ou
CREATE OR REPLACE FUNCTION private.tiroma_cabinets_ou(p_profils text[])
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select m.entite_id from private.tiroma_mes_cabinets() m where m.profil = any (p_profils)
$function$


-- ═══ FONCTION private.tiroma_cabinets_patients
CREATE OR REPLACE FUNCTION private.tiroma_cabinets_patients()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select m.entite_id from private.tiroma_mes_cabinets() m
  where m.profil in ('titulaire', 'assistante')
     or (m.profil = 'collaborateur' and m.perimetre = 'cabinet')
     or (m.profil = 'direction' and private.tiroma_droit_expres(m.client_id, 'tiroma.fiches_patients'))
$function$


-- ═══ FONCTION private.tiroma_cabinets_production
CREATE OR REPLACE FUNCTION private.tiroma_cabinets_production()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select m.entite_id from private.tiroma_mes_cabinets() m where m.profil = 'titulaire'
$function$


-- ═══ FONCTION private.tiroma_changer_mode
CREATE OR REPLACE FUNCTION private.tiroma_changer_mode(p_client uuid, p_entite uuid, p_mode text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_avant text; v_id uuid;
begin
  if p_mode is null or p_mode not in ('a_blanc', 'reel') then
    raise exception 'Le mode vaut a_blanc ou reel.' using errcode = '22023';
  end if;
  select k.mode, k.id into v_avant, v_id from public.tiroma_cabinets k
  where k.client_id = p_client and k.entite_id = p_entite for update;
  if not found then
    raise exception 'Cabinet introuvable.' using errcode = 'P0002';
  end if;
  if v_avant = p_mode then
    return;
  end if;
  update public.tiroma_cabinets set mode = p_mode, mode_depuis = now() where id = v_id;
end $function$


-- ═══ FONCTION private.tiroma_dents_fdi
CREATE OR REPLACE FUNCTION private.tiroma_dents_fdi()
 RETURNS smallint[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select array[11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28,
               31, 32, 33, 34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48,
               51, 52, 53, 54, 55, 61, 62, 63, 64, 65, 71, 72, 73, 74, 75, 81, 82, 83, 84, 85]::smallint[]
$function$


-- ═══ FONCTION private.tiroma_droit_expres
CREATE OR REPLACE FUNCTION private.tiroma_droit_expres(p_client uuid, p_droit text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.droits d
    where d.client_id = p_client and d.droit = p_droit
      and (d.user_id = (select auth.uid())
           or d.equipe_id in (select m.equipe_id from public.equipes_membres m
                              where m.user_id = (select auth.uid()) and m.client_id = p_client)))
$function$


-- ═══ FONCTION private.tiroma_empreinte_ref
CREATE OR REPLACE FUNCTION private.tiroma_empreinte_ref(p_client uuid, p_entite uuid, p_source_ref text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select encode(sha256(convert_to(p_client::text || '/' || p_entite::text || '/' || p_source_ref, 'UTF8')), 'hex')
$function$


-- ═══ FONCTION private.tiroma_enregistrer_mesures
CREATE OR REPLACE FUNCTION private.tiroma_enregistrer_mesures(p_client uuid, p_entite uuid, p_passage text, p_jour date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_mode text;
  r record;
  n integer := 0;
begin
  select k.mode into v_mode from public.tiroma_cabinets k where k.client_id = p_client and k.entite_id = p_entite;
  if v_mode is null then
    raise exception 'Cabinet introuvable.' using errcode = 'P0002';
  end if;
  for r in select * from private.tiroma_mesures(p_client, p_entite, p_passage, p_jour) loop
    perform public.enregistrer_mesure(
      p_client => p_client, p_indicateur => r.indicateur, p_version => r.version,
      p_periode_type => 'jour', p_periode_debut => r.jour,
      p_valeur => r.valeur, p_base => r.base, p_mode => v_mode, p_numerateur => r.numerateur,
      p_entite => p_entite, p_objet_type => r.objet_type, p_objet_id => r.objet_id, p_objet_libelle => r.objet_libelle);
    n := n + 1;
  end loop;
  return n;
end $function$


-- ═══ FONCTION private.tiroma_est_titulaire
CREATE OR REPLACE FUNCTION private.tiroma_est_titulaire(p_client uuid, p_entite uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from private.tiroma_mes_cabinets() m
    where m.client_id = p_client and m.entite_id = p_entite and m.profil = 'titulaire')
$function$


-- ═══ FONCTION private.tiroma_etat_capacite
CREATE OR REPLACE FUNCTION private.tiroma_etat_capacite(p_n bigint, p_k bigint, p_seuil numeric)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case when coalesce(p_n, 0) = 0 then 'inconnu'
              when p_k::numeric / p_n >= p_seuil then 'tenu'
              when p_k > 0 then 'partiel'
              else 'non_tenu' end
$function$


-- ═══ FONCTION private.tiroma_evenement
CREATE OR REPLACE FUNCTION private.tiroma_evenement(p_client uuid, p_entite uuid, p_rdv uuid, p_patient uuid, p_type text, p_avant jsonb, p_apres jsonb, p_detecte timestamp with time zone, p_releve uuid, p_cle text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n integer;
begin
  insert into public.tiroma_evenements_agenda (client_id, entite_id, rendez_vous_id, patient_id, type, avant, apres, detecte_le, releve_id, cle_idempotence)
  values (p_client, p_entite, p_rdv, p_patient, p_type, p_avant, p_apres, p_detecte, p_releve, left(p_cle, 200))
  on conflict (client_id, cle_idempotence) do nothing;
  get diagnostics n = row_count;
  return n;
end $function$


-- ═══ FONCTION private.tiroma_evenements_immuables
CREATE OR REPLACE FUNCTION private.tiroma_evenements_immuables()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'DELETE' and (
       old.client_id::text = coalesce(current_setting('omega.effacement_client', true), '')
       or coalesce(current_setting('omega.effacement_objet', true), '') = 'oui'
       or coalesce(current_setting('omega.tiroma_moteur', true), '') = 'purge') then
    return old;
  end if;
  raise exception 'Les événements d''agenda ne se modifient pas et ne s''effacent pas.' using errcode = '42501';
end $function$


-- ═══ FONCTION private.tiroma_evenements_sans_vidage
CREATE OR REPLACE FUNCTION private.tiroma_evenements_sans_vidage()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  raise exception 'Les événements d''agenda ne se vident pas.' using errcode = '42501';
end $function$


-- ═══ FONCTION private.tiroma_faits_patients
CREATE OR REPLACE FUNCTION private.tiroma_faits_patients(p_client uuid, p_entite uuid, p_fuseau text, p_detecte timestamp with time zone)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare g public.tiroma_regles; n integer;
begin
  select * into g from public.tiroma_regles where client_id = p_client and entite_id = p_entite;
  update public.tiroma_patients p
     set dernier_rdv_le = greatest(p.dernier_rdv_le, x.dernier_rdv), prochain_rdv_le = x.prochain,
         dernier_acte_le = greatest(p.dernier_acte_le, x.dernier_acte), dernier_controle_le = greatest(p.dernier_controle_le, x.dernier_controle)
  from (
    select pa.id,
      (select max((r.debut at time zone p_fuseau)::date) from public.tiroma_rendez_vous r
       where r.client_id = p_client and r.entite_id = p_entite and r.patient_id = pa.id and r.debut <= p_detecte
         and (r.statut = 'honore' or (r.statut = 'prevu' and r.presume = 'honore'))) as dernier_rdv,
      (select min(r.debut) from public.tiroma_rendez_vous r
       where r.client_id = p_client and r.entite_id = p_entite and r.patient_id = pa.id and r.statut = 'prevu' and r.debut > p_detecte) as prochain,
      (select max(a.date) from public.tiroma_actes_realises a
       where a.client_id = p_client and a.entite_id = p_entite and a.patient_id = pa.id) as dernier_acte,
      greatest(
        (select max(a.date) from public.tiroma_actes_realises a
         where a.client_id = p_client and a.entite_id = p_entite and a.patient_id = pa.id and a.code = any (g.actes_controle)),
        (select max((r.debut at time zone p_fuseau)::date) from public.tiroma_rendez_vous r
         join public.tiroma_types_rdv t on t.id = r.type_rdv_id
         where r.client_id = p_client and r.entite_id = p_entite and r.patient_id = pa.id and r.debut <= p_detecte
           and t.famille in ('controle', 'detartrage')
           and (r.statut = 'honore' or (r.statut = 'prevu' and r.presume = 'honore')))) as dernier_controle
    from public.tiroma_patients pa
    where pa.client_id = p_client and pa.entite_id = p_entite and pa.actif) x
  where p.id = x.id
    and (p.dernier_rdv_le, p.prochain_rdv_le, p.dernier_acte_le, p.dernier_controle_le) is distinct from
        (greatest(p.dernier_rdv_le, x.dernier_rdv), x.prochain, greatest(p.dernier_acte_le, x.dernier_acte), greatest(p.dernier_controle_le, x.dernier_controle));
  get diagnostics n = row_count;
  return n;
end $function$


-- ═══ FONCTION private.tiroma_famille_par_regle
CREATE OR REPLACE FUNCTION private.tiroma_famille_par_regle(p_libelle text, OUT famille text, OUT necessite_labo boolean, OUT chirurgie boolean, OUT capacite text, OUT confiance text)
 RETURNS record
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  n text := private.tiroma_normaliser(p_libelle);
  r record;
  v_matches integer := 0;
begin
  famille := null; necessite_labo := false; chirurgie := false; capacite := null; confiance := null;
  if n is null then
    return;
  end if;
  for r in
    select * from (values
      (1,  '(reunion|pause|formation|conge|vacance|ferm|perso|admin|bloqu|indispo|repas|dejeuner|absent)', 'personnel', false, false, null::text),
      (2,  '(urgence|urg\.|^urg |douleur|sos)', 'urgence', false, false, 'soins'),
      (3,  '(premiere|1ere|1 ere|nouveau patient|nouv\.? ?pat|premier rdv|1er rdv)', 'premiere_consultation', false, false, 'soins'),
      (4,  '(ortho|odf|bague|aligneur|multi.?attache|gouttiere)', 'orthodontie', false, false, 'orthodontie'),
      (5,  'implant', 'implant', false, true, 'chirurgie'),
      (6,  '(extraction|extrac|avulsion|chir|sagesse|dds|kyste|greffe|sinus|frein|biopsie)', 'chirurgie', false, true, 'chirurgie'),
      (7,  '(paro|surfacage|curetage|lambeau)', 'parodontie', false, false, 'soins'),
      (8,  '(endo|devital|canal|pulp|radiculaire|racine)', 'endodontie', false, false, 'soins'),
      (9,  '(couronne|bridge|inlay|onlay|proth|appareil|stellite|facette|empreinte|essayage|scell|pose|dentier|chape|armature)', 'prothese', true, false, 'prothese'),
      (10, '(detart|prophy|hygien|polissage|nettoyage)', 'detartrage', false, false, 'prevention'),
      (11, '(controle|bilan|visite|check|suivi|revision|ctrl|examen|consultation)', 'controle', false, false, 'prevention'),
      (12, '(soin|carie|composite|obturation|plombage|amalgame|scellement|fluor|pansement|cvi|reconstitution)', 'soin_conservateur', false, false, 'soins')
    ) as t(ordre, motif, fam, labo, chir, cap)
    order by t.ordre
  loop
    if n ~ r.motif then
      v_matches := v_matches + 1;
      if famille is null then
        famille := r.fam; necessite_labo := r.labo; chirurgie := r.chir; capacite := r.cap;
      end if;
    end if;
  end loop;
  if famille = 'orthodontie' then
    famille := case when n ~ '(pose|debut|collage)' then 'orthodontie_pose' else 'orthodontie_controle' end;
  elsif famille = 'implant' then
    if n ~ '(proth|pilier|couronne|cicatri|empreinte)' then
      famille := 'implant_prothese'; necessite_labo := true; chirurgie := false;
    else
      famille := 'implant_chirurgie';
    end if;
  elsif famille = 'prothese' then
    famille := case when n ~ 'empreinte' then 'prothese_empreinte'
                    when n ~ '(pose|scell|collage|livraison)' then 'prothese_pose'
                    else 'prothese_preparation' end;
  end if;
  if famille is not null then
    confiance := case when v_matches = 1 then 'haute' else 'moyenne' end;
  end if;
end $function$


-- ═══ FONCTION private.tiroma_fauteuil_par_ref
CREATE OR REPLACE FUNCTION private.tiroma_fauteuil_par_ref(p_client uuid, p_entite uuid, p_ref text, p_quand timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid; v_sans_ref boolean;
begin
  if p_ref is null then
    return null;
  end if;
  select f.id, f.source_ref is null into v_id, v_sans_ref from public.tiroma_fauteuils f
  where f.client_id = p_client and f.entite_id = p_entite
    and (f.source_ref = left(p_ref, 200) or (f.source_ref is null and lower(f.nom) = lower(p_ref)))
  order by (f.source_ref = left(p_ref, 200)) desc, f.cree_le
  limit 1;
  if v_id is null then
    insert into public.tiroma_fauteuils (client_id, entite_id, source_ref, nom, cree_le)
    values (p_client, p_entite, left(p_ref, 200), left(p_ref, 80), p_quand)
    returning id into v_id;
  elsif v_sans_ref then
    update public.tiroma_fauteuils set source_ref = left(p_ref, 200) where id = v_id;
  end if;
  return v_id;
end $function$


-- ═══ FONCTION private.tiroma_fermer_alerte
CREATE OR REPLACE FUNCTION private.tiroma_fermer_alerte(p_client uuid, p_cle text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  update public.alertes
     set acquittee_le = now(), detail = detail || jsonb_build_object('resolution', 'la mesure est passée')
   where client_id = p_client and cle_regroupement = p_cle and acquittee_le is null
$function$


-- ═══ FONCTION private.tiroma_fermer_alertes_retard
CREATE OR REPLACE FUNCTION private.tiroma_fermer_alertes_retard(p_client uuid, p_jeu uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  update public.alertes
     set acquittee_le = now(), detail = detail || jsonb_build_object('resolution', 'un export est arrivé')
   where client_id = p_client and acquittee_le is null
     and cle_regroupement like 'tiroma:releve:retard:' || p_jeu::text || ':%'
$function$


-- ═══ FONCTION private.tiroma_garde_agenda
CREATE OR REPLACE FUNCTION private.tiroma_garde_agenda(p_client uuid, p_entite uuid, p_instantane uuid, p_fuseau text, p_detecte timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  g public.tiroma_regles;
  i public.instantanes;
  v_du date;
  v_au date;
  n_liberes integer;
  n_base integer;
  n_disp integer;
  v_jours text;
begin
  select * into g from public.tiroma_regles where client_id = p_client and entite_id = p_entite;
  select * into i from public.instantanes where id = p_instantane;
  v_du := (i.garde #>> '{fenetre,du}')::date;
  v_au := (i.garde #>> '{fenetre,au}')::date;
  with ecarts as (
    select x.nature, coalesce(private.tiroma_v(x.apres, 'ref'), private.tiroma_v(x.avant, 'ref')) as ref,
           private.tiroma_statut_rdv(private.tiroma_v(x.apres, 'statut')) as statut_apres
    from public.instantanes_ecarts x where x.instantane_id = p_instantane
  ),
  touches as (
    select r.id, (r.debut at time zone p_fuseau)::date as jour, r.debut, r.statut,
           e.nature = 'disparition' as disparu,
           (e.nature = 'disparition' or e.statut_apres in ('annule', 'supprime')) as vide,
           (e.nature = 'disparition' or e.statut_apres in ('annule', 'supprime', 'reporte')) as libere
    from ecarts e
    join public.tiroma_rendez_vous r on r.client_id = p_client and r.entite_id = p_entite and r.source_ref = e.ref
    where r.statut in ('prevu', 'honore', 'manque')
  ),
  base as (
    select r.id, (r.debut at time zone p_fuseau)::date as jour
    from public.tiroma_rendez_vous r
    where r.client_id = p_client and r.entite_id = p_entite and r.statut in ('prevu', 'honore', 'manque')
      and (v_du is null or (r.debut at time zone p_fuseau)::date between v_du and v_au)
  )
  select (select count(*) from touches t where t.libere and t.statut in ('prevu', 'honore') and t.debut > p_detecte),
         (select count(*) from base),
         (select count(*) from touches t where t.disparu),
         (select string_agg(b.jour::text || ' (' || b.n || ' rendez-vous)', ', ' order by b.jour)
          from (select jour, count(*) as n from base group by jour having count(*) >= g.garde_min_rdv_jour) b
          join (select jour, count(*) as n from touches where vide group by jour) t on t.jour = b.jour and t.n >= b.n)
    into n_liberes, n_base, n_disp, v_jours;
  if v_jours is not null then
    return format('un jour d''au moins %s rendez-vous entièrement vidé en un seul relevé : %s', g.garde_min_rdv_jour, v_jours);
  end if;
  if n_liberes > g.garde_max_annulations then
    return format('%s rendez-vous à venir libérés en un seul relevé (plus de %s)', n_liberes, g.garde_max_annulations);
  end if;
  if n_base >= g.garde_min_rdv_jour and n_disp > g.garde_part_disparus * n_base then
    return format('%s rendez-vous sur %s disparus en un seul relevé (plus de %s %%)', n_disp, n_base, round(g.garde_part_disparus * 100));
  end if;
  return null;
end $function$


-- ═══ FONCTION private.tiroma_horloge
CREATE OR REPLACE FUNCTION private.tiroma_horloge(p_maintenant timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  k record;
  v_local timestamp;
  v_jour date;
  d date;
  n integer;
  v_bilan jsonb := '{}'::jsonb;
begin
  for k in
    select c.id as cabinet_id, c.client_id, c.entite_id, e.fuseau
    from public.tiroma_cabinets c
    join public.entites e on e.client_id = c.client_id and e.id = c.entite_id
    where c.statut = 'actif'
    order by c.client_id, c.entite_id
  loop
    v_local := p_maintenant at time zone k.fuseau;
    v_jour := v_local::date;

    -- Le soir : la journée écoulée, et les deux précédentes si elles ont manqué.
    for d in select generate_series(v_jour - 2, v_jour, interval '1 day')::date loop
      continue when d = v_jour and v_local::time < time '23:30';
      continue when exists (select 1 from private.tiroma_passages p
                            where p.client_id = k.client_id and p.entite_id = k.entite_id
                              and p.tache = 'mesure_soir' and p.jour = d);
      begin
        n := private.tiroma_enregistrer_mesures(k.client_id, k.entite_id, 'soir', d);
        insert into private.tiroma_passages (client_id, entite_id, tache, jour, bilan)
        values (k.client_id, k.entite_id, 'mesure_soir', d, jsonb_build_object('mesures', n));
        perform private.journaliser_module(k.client_id, 'tiroma', 'tiroma.indicateurs_calcules', 'tiroma_cabinets',
          k.cabinet_id::text, jsonb_build_object('passage', 'soir', 'jour', d, 'version', 1, 'mesures', n), k.entite_id);
        perform private.battre(k.client_id, 'tiroma_mesure',
          jsonb_build_object('passage', 'soir', 'jour', d, 'mesures', n), interval '1 day');
        perform private.tiroma_fermer_alerte(k.client_id, 'tiroma:mesure:' || k.cabinet_id || ':soir');
        v_bilan := v_bilan || jsonb_build_object(k.cabinet_id::text || ':soir:' || d, n);
      exception when others then
        perform private.lever_alerte_module(k.client_id, 'tiroma', 'critique',
          'La mesure de Tiroma n''a pas pu se faire',
          jsonb_build_object('cabinet', k.cabinet_id, 'passage', 'soir', 'jour', d, 'erreur', left(sqlerrm, 200)),
          'mesure:' || k.cabinet_id || ':soir', false, null);
      end;
    end loop;

    -- Le matin : les chiffres prévus du jour.
    if v_local::time >= time '06:40' and not exists (
         select 1 from private.tiroma_passages p
         where p.client_id = k.client_id and p.entite_id = k.entite_id and p.tache = 'mesure_matin' and p.jour = v_jour) then
      begin
        n := private.tiroma_enregistrer_mesures(k.client_id, k.entite_id, 'matin', v_jour);
        insert into private.tiroma_passages (client_id, entite_id, tache, jour, bilan)
        values (k.client_id, k.entite_id, 'mesure_matin', v_jour, jsonb_build_object('mesures', n));
        perform private.journaliser_module(k.client_id, 'tiroma', 'tiroma.indicateurs_calcules', 'tiroma_cabinets',
          k.cabinet_id::text, jsonb_build_object('passage', 'matin', 'jour', v_jour, 'version', 1, 'mesures', n), k.entite_id);
        perform private.tiroma_fermer_alerte(k.client_id, 'tiroma:mesure:' || k.cabinet_id || ':matin');
        v_bilan := v_bilan || jsonb_build_object(k.cabinet_id::text || ':matin:' || v_jour, n);
      exception when others then
        perform private.lever_alerte_module(k.client_id, 'tiroma', 'critique',
          'La mesure de Tiroma n''a pas pu se faire',
          jsonb_build_object('cabinet', k.cabinet_id, 'passage', 'matin', 'jour', v_jour, 'erreur', left(sqlerrm, 200)),
          'mesure:' || k.cabinet_id || ':matin', false, null);
      end;
    end if;
  end loop;
  return v_bilan;
end $function$


-- ═══ FONCTION private.tiroma_installer_cabinet
CREATE OR REPLACE FUNCTION private.tiroma_installer_cabinet(p_client uuid, p_entite uuid, p_logiciel text, p_perimetre text DEFAULT 'cabinet'::text, p_logiciel_version text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_fuseau text;
  v_territoire text;
  v_fuseau_territoire text;
  v_complet boolean;
begin
  select e.fuseau into v_fuseau from public.entites e where e.client_id = p_client and e.id = p_entite;
  if not found then
    raise exception 'Entité introuvable dans cette organisation.' using errcode = 'P0002';
  end if;
  v_territoire := private.territoire_de_entite(p_client, p_entite);
  if v_territoire is null then
    raise exception 'Le territoire du cabinet est inconnu : renseignez le code ISO de son entité (GP, FR-971, FR…).'
      using errcode = '22023', hint = 'Tiroma ne suppose jamais la métropole : les jours ouvrés en dépendent.';
  end if;
  select t.fuseau, t.complet into v_fuseau_territoire, v_complet from public.territoires t where t.code = v_territoire;
  if not coalesce(v_complet, false) then
    raise exception 'Les jours fériés de droit local de % ne sont pas au calendrier : Tiroma n''y calcule aucun jour ouvré.', v_territoire
      using errcode = '22023', hint = 'Relever d''abord ces jours dans le texte local (brique B5).';
  end if;
  if v_fuseau is distinct from v_fuseau_territoire then
    raise exception 'Le fuseau de l''entité (%) ne correspond pas à son territoire (%, %).', v_fuseau, v_territoire, v_fuseau_territoire
      using errcode = '22023', hint = '7 h à Pointe-à-Pitre n''est pas 7 h à Paris : le point du matin en dépend.';
  end if;
  insert into public.tiroma_cabinets (client_id, entite_id, logiciel, logiciel_version, perimetre_partage)
  values (p_client, p_entite, p_logiciel, p_logiciel_version, p_perimetre)
  returning id into v_id;
  insert into public.tiroma_regles (client_id, entite_id) values (p_client, p_entite);
  return v_id;
end $function$


-- ═══ FONCTION private.tiroma_ligne_acte
CREATE OR REPLACE FUNCTION private.tiroma_ligne_acte(p_client uuid, p_entite uuid, v jsonb, p_fuseau text, p_detecte timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ref text; v_date date; v_patient uuid; v_prat uuid; v_plan uuid; v_rdv uuid; v_insere boolean;
begin
  v_ref := private.tiroma_v(v, 'ref');
  v_date := private.tiroma_v_date(v, 'date');
  if v_ref is null or v_date is null then
    return 'ignore';
  end if;
  v_patient := private.tiroma_patient_par_ref(p_client, p_entite, private.tiroma_v(v, 'patient_ref'), null, null, null, p_detecte);
  if v_patient is null then
    return 'sans_patient';
  end if;
  v_prat := private.tiroma_praticien_par_ref(p_client, p_entite, private.tiroma_v(v, 'praticien'), p_detecte);
  v_plan := null; v_rdv := null;
  select p.id into v_plan from public.tiroma_plans p
  where p.client_id = p_client and p.entite_id = p_entite and p.source_ref = private.tiroma_v(v, 'devis_numero');
  select r.id into v_rdv from public.tiroma_rendez_vous r
  where r.client_id = p_client and r.entite_id = p_entite and r.source_ref = private.tiroma_v(v, 'rdv_ref');
  if v_rdv is null then
    select r.id into v_rdv from public.tiroma_rendez_vous r
    where r.client_id = p_client and r.entite_id = p_entite and r.patient_id = v_patient
      and (r.debut at time zone p_fuseau)::date = v_date and r.statut in ('prevu', 'honore')
    order by (r.praticien_id = v_prat) desc nulls last, r.debut
    limit 1;
  end if;
  insert into public.tiroma_actes_realises as a (client_id, entite_id, source_ref, patient_id, date, code, libelle, dents, praticien_id,
                                                 montant, plan_id, rendez_vous_id, empreinte, vu_premier_le, vu_dernier_le)
  values (p_client, p_entite, left(v_ref, 200), v_patient, v_date, left(private.tiroma_v(v, 'code'), 20),
          left(private.tiroma_v(v, 'libelle'), 200), private.tiroma_v_dents(v, 'dents'), v_prat,
          case when private.tiroma_v_decimal(v, 'montant') >= 0 then private.tiroma_v_decimal(v, 'montant') end,
          v_plan, v_rdv, encode(sha256(convert_to(v::text, 'UTF8')), 'hex'), p_detecte, p_detecte)
  on conflict (client_id, entite_id, source_ref) do update
    set patient_id = excluded.patient_id, date = excluded.date, code = excluded.code, libelle = excluded.libelle, dents = excluded.dents,
        praticien_id = coalesce(excluded.praticien_id, a.praticien_id), montant = coalesce(excluded.montant, a.montant),
        plan_id = coalesce(excluded.plan_id, a.plan_id), rendez_vous_id = coalesce(excluded.rendez_vous_id, a.rendez_vous_id),
        empreinte = excluded.empreinte, vu_dernier_le = excluded.vu_dernier_le
  returning (xmax::text = '0') into v_insere;
  return case when v_insere then 'ajout' else 'modification' end;
end $function$


-- ═══ FONCTION private.tiroma_ligne_attente
CREATE OR REPLACE FUNCTION private.tiroma_ligne_attente(p_client uuid, p_entite uuid, v jsonb, p_fuseau text, p_detecte timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ref text; v_patient uuid; v_prat uuid; v_type uuid; v_famille text; v_insere boolean;
begin
  v_ref := private.tiroma_v(v, 'ref');
  if v_ref is null then
    return 'ignore';
  end if;
  v_patient := private.tiroma_patient_par_ref(p_client, p_entite, private.tiroma_v(v, 'patient_ref'), null, null, null, p_detecte);
  if v_patient is null then
    return 'sans_patient';
  end if;
  v_prat := private.tiroma_praticien_par_ref(p_client, p_entite, private.tiroma_v(v, 'praticien'), p_detecte);
  v_type := private.tiroma_type_par_libelle(p_client, p_entite, private.tiroma_v(v, 'type'), null, null, p_detecte);
  select t.famille into v_famille from public.tiroma_types_rdv t where t.id = v_type;
  -- Une seule entrée ouverte par patient : celle du logiciel prime.
  update public.tiroma_liste_attente
     set retire_le = p_detecte, motif_retrait = 'doublon', maj_le = now()
   where client_id = p_client and entite_id = p_entite and patient_id = v_patient and retire_le is null
     and source_ref is distinct from left(v_ref, 200);
  insert into public.tiroma_liste_attente as l (client_id, entite_id, source_ref, patient_id, type_rdv_id, famille, duree_min, praticien_id,
                                                source, ajoute_le, vu_dernier_le, maj_le)
  values (p_client, p_entite, left(v_ref, 200), v_patient, v_type, v_famille,
          case when private.tiroma_v_entier(v, 'duree_min') between 5 and 600 then private.tiroma_v_entier(v, 'duree_min') end,
          v_prat, 'logiciel', coalesce(private.tiroma_v_instant(v, 'depuis', p_fuseau), p_detecte), p_detecte, now())
  on conflict (client_id, entite_id, source_ref) do update
    set patient_id = excluded.patient_id, type_rdv_id = coalesce(excluded.type_rdv_id, l.type_rdv_id),
        famille = coalesce(excluded.famille, l.famille), duree_min = coalesce(excluded.duree_min, l.duree_min),
        praticien_id = coalesce(excluded.praticien_id, l.praticien_id), ajoute_le = least(excluded.ajoute_le, l.ajoute_le),
        retire_le = null, motif_retrait = null, vu_dernier_le = excluded.vu_dernier_le, maj_le = now()
  returning (xmax::text = '0') into v_insere;
  return case when v_insere then 'ajout' else 'modification' end;
end $function$


-- ═══ FONCTION private.tiroma_ligne_devis
CREATE OR REPLACE FUNCTION private.tiroma_ligne_devis(p_client uuid, p_entite uuid, v jsonb, p_detecte timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.tiroma_plans;
  f record;
  v_num text; v_rang integer; v_rdv uuid; v_fait date; v_insere boolean;
begin
  v_num := private.tiroma_v(v, 'numero');
  v_rang := private.tiroma_v_entier(v, 'rang');
  if v_num is null or v_rang is null or v_rang < 1 or v_rang > 32000 then
    return 'ignore';
  end if;
  select * into p from public.tiroma_plans where client_id = p_client and entite_id = p_entite and source_ref = left(v_num, 200);
  if not found then
    return 'orphelin';
  end if;
  v_rdv := null;
  select r.id into v_rdv from public.tiroma_rendez_vous r
  where r.client_id = p_client and r.entite_id = p_entite and r.source_ref = private.tiroma_v(v, 'rdv_ref');
  select * into f from private.tiroma_famille_par_regle(private.tiroma_v(v, 'libelle'));
  v_fait := private.tiroma_v_date(v, 'fait_le');
  insert into public.tiroma_plan_actes as a (client_id, entite_id, plan_id, patient_id, rang, code, libelle, dents, famille, seance, rdv_ref,
                                             duree_min, delai_min_jours, montant, reste_a_charge, statut, fait_le, rendez_vous_id, empreinte)
  values (p_client, p_entite, p.id, p.patient_id, v_rang, left(private.tiroma_v(v, 'code'), 20), left(private.tiroma_v(v, 'libelle'), 200),
          private.tiroma_v_dents(v, 'dents'), f.famille,
          case when private.tiroma_v_entier(v, 'seance') >= 1 then private.tiroma_v_entier(v, 'seance') end,
          left(private.tiroma_v(v, 'rdv_ref'), 60),
          case when private.tiroma_v_entier(v, 'duree_min') between 5 and 600 then private.tiroma_v_entier(v, 'duree_min') end,
          case when private.tiroma_v_entier(v, 'delai_min_jours') between 0 and 365 then private.tiroma_v_entier(v, 'delai_min_jours') end,
          case when private.tiroma_v_decimal(v, 'montant') >= 0 then private.tiroma_v_decimal(v, 'montant') end,
          case when private.tiroma_v_decimal(v, 'reste_a_charge') >= 0 then private.tiroma_v_decimal(v, 'reste_a_charge') end,
          case when v_fait is not null then 'fait' when v_rdv is not null then 'planifie' else 'a_faire' end,
          v_fait, v_rdv, encode(sha256(convert_to(v::text, 'UTF8')), 'hex'))
  on conflict (plan_id, rang) do update
    set code = excluded.code, libelle = excluded.libelle, dents = excluded.dents,
        famille = coalesce(excluded.famille, a.famille), seance = coalesce(excluded.seance, a.seance),
        rdv_ref = coalesce(excluded.rdv_ref, a.rdv_ref), duree_min = coalesce(excluded.duree_min, a.duree_min),
        delai_min_jours = coalesce(excluded.delai_min_jours, a.delai_min_jours),
        montant = coalesce(excluded.montant, a.montant), reste_a_charge = coalesce(excluded.reste_a_charge, a.reste_a_charge),
        rendez_vous_id = coalesce(excluded.rendez_vous_id, a.rendez_vous_id),
        fait_le = coalesce(excluded.fait_le, a.fait_le),
        statut = case when coalesce(excluded.fait_le, a.fait_le) is not null then 'fait'
                      when coalesce(excluded.rendez_vous_id, a.rendez_vous_id) is not null then 'planifie'
                      else 'a_faire' end,
        empreinte = excluded.empreinte
  returning (xmax::text = '0') into v_insere;
  if v_rdv is not null then
    update public.tiroma_rendez_vous
       set plan_id = p.id, seance_rang = coalesce(seance_rang, case when private.tiroma_v_entier(v, 'seance') >= 1 then private.tiroma_v_entier(v, 'seance') end)
     where id = v_rdv and plan_id is null;
  end if;
  return case when v_insere then 'ajout' else 'modification' end;
end $function$


-- ═══ FONCTION private.tiroma_ligne_labo
CREATE OR REPLACE FUNCTION private.tiroma_ligne_labo(p_client uuid, p_entite uuid, v jsonb, p_detecte timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ref text; v_patient uuid; v_statut text; n text;
  v_envoye date; v_revenu date; v_pose uuid; v_empreinte uuid; v_insere boolean;
begin
  v_ref := private.tiroma_v(v, 'ref');
  if v_ref is null then
    return 'ignore';
  end if;
  v_patient := private.tiroma_patient_par_ref(p_client, p_entite, private.tiroma_v(v, 'patient_ref'), null, null, null, p_detecte);
  if v_patient is null then
    return 'sans_patient';
  end if;
  v_envoye := private.tiroma_v_date(v, 'envoye_le');
  v_revenu := private.tiroma_v_date(v, 'revenu_le');
  n := private.tiroma_normaliser(private.tiroma_v(v, 'statut'));
  v_statut := case
    when v_revenu is not null then 'revenu'
    when n ~ 'annul' then 'annule'
    when v_envoye is not null or n ~ '(fabric|envoy|labo|revenu|recu|retour|livr)' then 'en_fabrication'
    else 'attendu' end;
  v_pose := null; v_empreinte := null;
  select r.id into v_pose from public.tiroma_rendez_vous r
  where r.client_id = p_client and r.entite_id = p_entite and r.source_ref = private.tiroma_v(v, 'rdv_pose_ref');
  select r.id into v_empreinte from public.tiroma_rendez_vous r
  where r.client_id = p_client and r.entite_id = p_entite and r.source_ref = private.tiroma_v(v, 'rdv_empreinte_ref');
  insert into public.tiroma_travaux_labo as w (client_id, entite_id, source_ref, patient_id, rendez_vous_pose_id, rendez_vous_empreinte_id,
                                               laboratoire, type_travail, envoye_le, retour_attendu_le, revenu_le, statut, source, empreinte,
                                               maj_le, vu_dernier_le)
  values (p_client, p_entite, left(v_ref, 200), v_patient, v_pose, v_empreinte, left(private.tiroma_v(v, 'laboratoire'), 120),
          left(private.tiroma_v(v, 'type_travail'), 120), v_envoye, private.tiroma_v_date(v, 'retour_attendu_le'), v_revenu, v_statut,
          'logiciel', encode(sha256(convert_to(v::text, 'UTF8')), 'hex'), now(), p_detecte)
  on conflict (client_id, entite_id, source_ref) do update
    set patient_id = excluded.patient_id,
        rendez_vous_pose_id = coalesce(excluded.rendez_vous_pose_id, w.rendez_vous_pose_id),
        rendez_vous_empreinte_id = coalesce(excluded.rendez_vous_empreinte_id, w.rendez_vous_empreinte_id),
        laboratoire = coalesce(excluded.laboratoire, w.laboratoire), type_travail = coalesce(excluded.type_travail, w.type_travail),
        envoye_le = coalesce(excluded.envoye_le, w.envoye_le), retour_attendu_le = coalesce(excluded.retour_attendu_le, w.retour_attendu_le),
        revenu_le = coalesce(excluded.revenu_le, w.revenu_le),
        statut = case when coalesce(excluded.revenu_le, w.revenu_le) is not null then 'revenu' else excluded.statut end,
        empreinte = excluded.empreinte, maj_le = now(), vu_dernier_le = excluded.vu_dernier_le
  returning (xmax::text = '0') into v_insere;
  return case when v_insere then 'ajout' else 'modification' end;
end $function$


-- ═══ FONCTION private.tiroma_ligne_odf
CREATE OR REPLACE FUNCTION private.tiroma_ligne_odf(p_client uuid, p_entite uuid, v jsonb, p_detecte timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ref text; v_patient uuid; n text; v_statut text;
  v_demande date; v_accord date; v_debut date; v_fin date; v_insere boolean;
begin
  v_ref := private.tiroma_v(v, 'ref');
  if v_ref is null then
    return 'ignore';
  end if;
  v_patient := private.tiroma_patient_par_ref(p_client, p_entite, private.tiroma_v(v, 'patient_ref'), null, null, null, p_detecte);
  if v_patient is null then
    return 'sans_patient';
  end if;
  v_demande := private.tiroma_v_date(v, 'demande_le');
  v_accord := private.tiroma_v_date(v, 'accord_le');
  v_debut := private.tiroma_v_date(v, 'debut_le');
  v_fin := private.tiroma_v_date(v, 'fin_le');
  n := private.tiroma_normaliser(private.tiroma_v(v, 'statut'));
  v_statut := case
    when n ~ '(refus|rejet)' then 'refusee'
    when n ~ '(abandon|arret|interromp)' then 'abandonnee'
    when v_fin is not null or n ~ '(termin|fini|achev)' then 'terminee'
    when v_debut is not null or n ~ '(commenc|en cours)' then 'commencee'
    when v_accord is not null or n ~ 'accord' then 'accordee'
    else 'demandee' end;
  insert into public.tiroma_ententes_odf as o (client_id, entite_id, source_ref, patient_id, demande_le, accord_le, debut_le, semestre_courant,
                                               fin_le, statut, empreinte, vu_dernier_le, maj_le)
  values (p_client, p_entite, left(v_ref, 200), v_patient, v_demande, v_accord, v_debut,
          case when private.tiroma_v_entier(v, 'semestre') between 0 and 12 then private.tiroma_v_entier(v, 'semestre') end,
          v_fin, v_statut, encode(sha256(convert_to(v::text, 'UTF8')), 'hex'), p_detecte, now())
  on conflict (client_id, entite_id, source_ref) do update
    set patient_id = excluded.patient_id, demande_le = coalesce(excluded.demande_le, o.demande_le),
        accord_le = coalesce(excluded.accord_le, o.accord_le), debut_le = coalesce(excluded.debut_le, o.debut_le),
        semestre_courant = coalesce(excluded.semestre_courant, o.semestre_courant), fin_le = coalesce(excluded.fin_le, o.fin_le),
        statut = excluded.statut, empreinte = excluded.empreinte, vu_dernier_le = excluded.vu_dernier_le, maj_le = now()
  returning (xmax::text = '0') into v_insere;
  return case when v_insere then 'ajout' else 'modification' end;
end $function$


-- ═══ FONCTION private.tiroma_ligne_stock
CREATE OR REPLACE FUNCTION private.tiroma_ligne_stock(p_client uuid, p_entite uuid, v jsonb, p_detecte timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ref text; v_famille text; v_insere boolean;
begin
  if private.tiroma_v(v, 'reference') is null then
    return 'ignore';
  end if;
  v_ref := left(private.tiroma_v(v, 'reference') || coalesce('#' || private.tiroma_v(v, 'lot'), ''), 200);
  v_famille := case
    when private.tiroma_normaliser(private.tiroma_v(v, 'famille')) ~ 'implant'
      or private.tiroma_normaliser(private.tiroma_v(v, 'marque')) ~ '(nobel|straumann|zimmer|biomet|astra|dentsply|anthogyr|biotech|tekka|euroteknika|global d|camlog|bego|osstem|megagen|\mmis\M|neodent|biohorizons|thommen|dentium)'
      or private.tiroma_normaliser(private.tiroma_v(v, 'reference')) ~ 'implant'
    then 'implant' else 'autre' end;
  insert into public.tiroma_stock as s (client_id, entite_id, source_ref, famille, marque, reference, diametre_mm, longueur_mm, quantite,
                                        seuil, lot, peremption, source, maj_le, vu_dernier_le)
  values (p_client, p_entite, v_ref, v_famille, left(private.tiroma_v(v, 'marque'), 80), left(private.tiroma_v(v, 'reference'), 80),
          case when private.tiroma_v_decimal(v, 'diametre_mm') > 0 and private.tiroma_v_decimal(v, 'diametre_mm') < 100 then private.tiroma_v_decimal(v, 'diametre_mm') end,
          case when private.tiroma_v_decimal(v, 'longueur_mm') > 0 and private.tiroma_v_decimal(v, 'longueur_mm') < 1000 then private.tiroma_v_decimal(v, 'longueur_mm') end,
          greatest(coalesce(private.tiroma_v_entier(v, 'quantite'), 0), 0),
          case when private.tiroma_v_entier(v, 'seuil') >= 0 then private.tiroma_v_entier(v, 'seuil') end,
          left(private.tiroma_v(v, 'lot'), 60), private.tiroma_v_date(v, 'peremption'), 'logiciel', now(), p_detecte)
  on conflict (client_id, entite_id, source_ref) do update
    set famille = excluded.famille, marque = coalesce(excluded.marque, s.marque), reference = excluded.reference,
        diametre_mm = coalesce(excluded.diametre_mm, s.diametre_mm), longueur_mm = coalesce(excluded.longueur_mm, s.longueur_mm),
        quantite = excluded.quantite, seuil = coalesce(excluded.seuil, s.seuil), lot = excluded.lot,
        peremption = coalesce(excluded.peremption, s.peremption), source = 'logiciel', maj_le = now(), vu_dernier_le = excluded.vu_dernier_le
  returning (xmax::text = '0') into v_insere;
  return case when v_insere then 'ajout' else 'modification' end;
end $function$


-- ═══ FONCTION private.tiroma_maj_le
CREATE OR REPLACE FUNCTION private.tiroma_maj_le()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.maj_le := now();
  return new;
end $function$


-- ═══ FONCTION private.tiroma_mes_cabinets
CREATE OR REPLACE FUNCTION private.tiroma_mes_cabinets()
 RETURNS TABLE(client_id uuid, entite_id uuid, profil text, praticien_id uuid, membre_id uuid, perimetre text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with recursive
  profils as (
    select p.client_id, p.entite_id, p.profil, p.praticien_id, p.membre_id
    from public.tiroma_profils p
    join public.comptes c on c.user_id = p.user_id and c.client_id = p.client_id
    where p.user_id = (select auth.uid())
      and (c.perimetre_total or exists (
        select 1 from public.comptes_entites ce
        where ce.user_id = c.user_id and ce.client_id = c.client_id and ce.entite_id = p.entite_id))
  ),
  sous_directions as (
    select d.client_id, d.entite_id, 0 as profondeur
    from profils d where d.profil = 'direction'
    union
    select s.client_id, e.id, s.profondeur + 1
    from sous_directions s
    join public.entites e on e.client_id = s.client_id and e.parent_id = s.entite_id
    where s.profondeur < 20
  )
  select p.client_id, p.entite_id, p.profil, p.praticien_id, p.membre_id, k.perimetre_partage
  from profils p
  join public.tiroma_cabinets k on k.client_id = p.client_id and k.entite_id = p.entite_id
  where p.profil <> 'direction'
  union
  select s.client_id, s.entite_id, 'direction', null::uuid, null::uuid, k.perimetre_partage
  from sous_directions s
  join public.tiroma_cabinets k on k.client_id = s.client_id and k.entite_id = s.entite_id
  where not exists (select 1 from profils p where p.entite_id = s.entite_id and p.profil <> 'direction')
$function$


-- ═══ FONCTION private.tiroma_mesure_acceptation
CREATE OR REPLACE FUNCTION private.tiroma_mesure_acceptation(p_client uuid, p_entite uuid, p_jour date)
 RETURNS TABLE(indicateur text, objet_type text, objet_id text, objet_libelle text, numerateur numeric, base numeric, valeur numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select 'tiroma.taux_acceptation_devis', null::text, null::text, null::text,
         count(*) filter (where p.signe_le is not null and p.signe_le <= p.presente_le + 60)::numeric,
         count(*)::numeric,
         round(count(*) filter (where p.signe_le is not null and p.signe_le <= p.presente_le + 60)::numeric / count(*), 6)
  from public.tiroma_plans p
  where p.client_id = p_client and p.entite_id = p_entite and p.type <> 'odf' and p.presente_le = p_jour
  having count(*) > 0
  union all
  select 'tiroma.taux_acceptation_devis_100_sante', null, null, null,
         count(*) filter (where p.signe_le is not null and p.signe_le <= p.presente_le + 60)::numeric,
         count(*)::numeric,
         round(count(*) filter (where p.signe_le is not null and p.signe_le <= p.presente_le + 60)::numeric / count(*), 6)
  from public.tiroma_plans p
  where p.client_id = p_client and p.entite_id = p_entite and p.type <> 'odf' and p.presente_le = p_jour
    and (p.panier = '100_sante' or coalesce(p.alternative_100_sante, false))
  having count(*) > 0
$function$


-- ═══ FONCTION private.tiroma_mesure_controles
CREATE OR REPLACE FUNCTION private.tiroma_mesure_controles(p_client uuid, p_entite uuid, p_jour date)
 RETURNS TABLE(indicateur text, objet_type text, objet_id text, objet_libelle text, numerateur numeric, base numeric, valeur numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with cab as (
    select e.fuseau, g.patient_actif_mois, g.actes_controle
    from public.entites e
    join public.tiroma_regles g on g.client_id = e.client_id and g.entite_id = e.id
    where e.client_id = p_client and e.id = p_entite
  ),
  actifs as (
    select p.id from public.tiroma_patients p, cab
    where p.client_id = p_client and p.entite_id = p_entite and p.actif and p.fusionne_dans_id is null
      and coalesce(greatest(p.dernier_rdv_le, p.dernier_acte_le), (p.vu_premier_le at time zone cab.fuseau)::date)
          >= (p_jour - make_interval(months => cab.patient_actif_mois))::date
  ),
  derniers as (
    select a.id, greatest(
             (select max(x.date) from public.tiroma_actes_realises x, cab
              where x.patient_id = a.id and x.date <= p_jour and x.code = any (cab.actes_controle)),
             (select max((r.debut at time zone cab.fuseau)::date)
              from public.tiroma_rendez_vous r
              join public.tiroma_types_rdv t on t.id = r.type_rdv_id, cab
              where r.patient_id = a.id and t.famille in ('controle', 'detartrage')
                and (r.statut = 'honore' or (r.statut = 'prevu' and r.presume = 'honore'))
                and (r.debut at time zone cab.fuseau)::date <= p_jour)) as dernier
    from actifs a
  )
  select 'tiroma.patients_sans_controle_18m', null::text, null::text, null::text, null::numeric,
         count(*)::numeric,
         count(*) filter (where dernier is null or dernier < (p_jour - interval '18 months')::date)::numeric
  from derniers
  having count(*) > 0
$function$


-- ═══ FONCTION private.tiroma_mesure_laboratoire
CREATE OR REPLACE FUNCTION private.tiroma_mesure_laboratoire(p_client uuid, p_entite uuid, p_jour date)
 RETURNS TABLE(indicateur text, objet_type text, objet_id text, objet_libelle text, numerateur numeric, base numeric, valeur numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with revenus as (
    select lower(btrim(w.laboratoire)) as cle, min(w.laboratoire) over (partition by lower(btrim(w.laboratoire))) as nom,
           (w.revenu_le - w.envoye_le)::numeric as jours
    from public.tiroma_travaux_labo w
    where w.client_id = p_client and w.entite_id = p_entite and w.revenu_le = p_jour
      and w.envoye_le is not null and w.revenu_le >= w.envoye_le
  )
  select 'tiroma.delai_laboratoire', null::text, null::text, null::text,
         sum(jours), count(*)::numeric, round(sum(jours) / count(*), 6)
  from revenus having count(*) > 0
  union all
  select 'tiroma.delai_laboratoire', 'laboratoire', cle, min(nom), sum(jours), count(*), round(sum(jours) / count(*), 6)
  from revenus where cle is not null
  group by cle
$function$


-- ═══ FONCTION private.tiroma_mesure_occupation
CREATE OR REPLACE FUNCTION private.tiroma_mesure_occupation(p_client uuid, p_entite uuid, p_jour date, p_genre text)
 RETURNS TABLE(indicateur text, objet_type text, objet_id text, objet_libelle text, numerateur numeric, base numeric, valeur numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  f record;
  v_ouvert tstzmultirange;
  v_occ numeric;
  v_ouv numeric;
  v_tot_occ numeric := 0;
  v_tot_ouv numeric := 0;
begin
  for f in
    select k.id, k.nom from public.tiroma_fauteuils k
    where k.client_id = p_client and k.entite_id = p_entite and k.actif
    order by k.nom, k.id
  loop
    v_ouvert := private.tiroma_ouvert(p_client, p_entite, f.id, p_jour);
    continue when v_ouvert is null;
    v_ouv := private.tiroma_minutes(v_ouvert);
    continue when v_ouv = 0;
    v_occ := private.tiroma_minutes(private.tiroma_reserve(p_client, p_entite, f.id, p_jour, p_genre) * v_ouvert);
    v_tot_occ := v_tot_occ + v_occ;
    v_tot_ouv := v_tot_ouv + v_ouv;
    indicateur := 'tiroma.occupation_' || p_genre; objet_type := 'fauteuil'; objet_id := f.id::text; objet_libelle := f.nom;
    numerateur := v_occ; base := v_ouv; valeur := round(v_occ / v_ouv, 6);
    return next;
  end loop;
  if v_tot_ouv > 0 then
    indicateur := 'tiroma.occupation_' || p_genre; objet_type := null; objet_id := null; objet_libelle := null;
    numerateur := v_tot_occ; base := v_tot_ouv; valeur := round(v_tot_occ / v_tot_ouv, 6);
    return next;
  end if;
end $function$


-- ═══ FONCTION private.tiroma_mesure_production_prevue
CREATE OR REPLACE FUNCTION private.tiroma_mesure_production_prevue(p_client uuid, p_entite uuid, p_jour date)
 RETURNS TABLE(indicateur text, objet_type text, objet_id text, objet_libelle text, numerateur numeric, base numeric, valeur numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with cab as (select e.fuseau from public.entites e where e.client_id = p_client and e.id = p_entite),
  rdv as (
    select r.id, r.type_rdv_id, r.praticien_id
    from public.tiroma_rendez_vous r, cab
    where r.client_id = p_client and r.entite_id = p_entite
      and r.statut in ('prevu', 'honore')
      and (r.debut at time zone cab.fuseau)::date = p_jour
  ),
  lus as (
    select r.id, r.praticien_id, sum(pa.montant) as montant
    from rdv r join public.tiroma_plan_actes pa on pa.rendez_vous_id = r.id and pa.montant is not null
    group by r.id, r.praticien_id
  ),
  historique as (
    select h.type_rdv_id, sum(a.montant) as montant
    from public.tiroma_rendez_vous h
    join public.tiroma_actes_realises a on a.rendez_vous_id = h.id and a.montant is not null, cab
    where h.client_id = p_client and h.entite_id = p_entite and h.type_rdv_id is not null
      and h.statut = 'honore'
      and (h.debut at time zone cab.fuseau)::date between p_jour - 180 and p_jour - 1
    group by h.id, h.type_rdv_id
  ),
  medianes as (
    select type_rdv_id, percentile_cont(0.5) within group (order by montant)::numeric as mediane
    from historique group by type_rdv_id
  ),
  estimes as (
    select r.id, round(m.mediane, 2) as montant
    from rdv r join medianes m on m.type_rdv_id = r.type_rdv_id
    where not exists (select 1 from lus l where l.id = r.id)
  )
  select 'tiroma.production_prevue', null::text, null::text, null::text, null::numeric, count(*)::numeric, sum(montant)
  from lus having count(*) > 0
  union all
  select 'tiroma.production_prevue_estimee', null, null, null, null, count(*), sum(montant)
  from estimes having count(*) > 0
  union all
  select 'tiroma.production_prevue_praticien', 'praticien', l.praticien_id::text, p.nom_affiche, null, count(*), sum(l.montant)
  from lus l join public.tiroma_praticiens p on p.id = l.praticien_id
  group by l.praticien_id, p.nom_affiche
$function$


-- ═══ FONCTION private.tiroma_mesure_production_realisee
CREATE OR REPLACE FUNCTION private.tiroma_mesure_production_realisee(p_client uuid, p_entite uuid, p_jour date)
 RETURNS TABLE(indicateur text, objet_type text, objet_id text, objet_libelle text, numerateur numeric, base numeric, valeur numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with actes as (
    select a.montant, a.praticien_id, r.fauteuil_id
    from public.tiroma_actes_realises a
    left join public.tiroma_rendez_vous r on r.id = a.rendez_vous_id
    where a.client_id = p_client and a.entite_id = p_entite and a.date = p_jour and a.montant is not null
  )
  select 'tiroma.production_realisee', null::text, null::text, null::text,
         null::numeric, count(*)::numeric, sum(montant)
  from actes having count(*) > 0
  union all
  select 'tiroma.production_realisee', 'fauteuil', a.fauteuil_id::text, k.nom, null, count(*), sum(a.montant)
  from actes a join public.tiroma_fauteuils k on k.id = a.fauteuil_id
  group by a.fauteuil_id, k.nom
  union all
  select 'tiroma.production_realisee_praticien', 'praticien', a.praticien_id::text, p.nom_affiche, null, count(*), sum(a.montant)
  from actes a join public.tiroma_praticiens p on p.id = a.praticien_id
  group by a.praticien_id, p.nom_affiche
$function$


-- ═══ FONCTION private.tiroma_mesure_reinscription
CREATE OR REPLACE FUNCTION private.tiroma_mesure_reinscription(p_client uuid, p_entite uuid, p_jour date)
 RETURNS TABLE(indicateur text, objet_type text, objet_id text, objet_libelle text, numerateur numeric, base numeric, valeur numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with cab as (select e.fuseau from public.entites e where e.client_id = p_client and e.id = p_entite),
  vus as (
    select r.patient_id, max(r.fin) as fin_visite
    from public.tiroma_rendez_vous r, cab
    where r.client_id = p_client and r.entite_id = p_entite and r.patient_id is not null
      and (r.statut = 'honore' or (r.statut = 'prevu' and r.presume = 'honore'))
      and (r.debut at time zone cab.fuseau)::date = p_jour
    group by r.patient_id
  ),
  juges as (
    select v.patient_id, exists (
             select 1 from public.tiroma_rendez_vous s
             where s.client_id = p_client and s.entite_id = p_entite and s.patient_id = v.patient_id
               and s.debut > v.fin_visite and s.statut <> 'supprime'
               and coalesce(s.cree_source_le, s.vu_premier_le) <= v.fin_visite + interval '24 hours'
           ) as reinscrit
    from vus v
  )
  select 'tiroma.taux_reinscription', null::text, null::text, null::text,
         count(*) filter (where reinscrit)::numeric, count(*)::numeric,
         round(count(*) filter (where reinscrit)::numeric / count(*), 6)
  from juges
  having count(*) > 0
$function$


-- ═══ FONCTION private.tiroma_mesure_reprise
CREATE OR REPLACE FUNCTION private.tiroma_mesure_reprise(p_client uuid, p_entite uuid, p_jour date)
 RETURNS TABLE(indicateur text, objet_type text, objet_id text, objet_libelle text, numerateur numeric, base numeric, valeur numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with cab as (
    select e.fuseau, g.creneau_min_minutes
    from public.entites e
    join public.tiroma_regles g on g.client_id = e.client_id and g.entite_id = e.id
    where e.client_id = p_client and e.id = p_entite
  ),
  liberes as (
    select distinct on (ev.rendez_vous_id, ev.avant ->> 'debut')
           ev.rendez_vous_id, ev.detecte_le,
           tstzrange((ev.avant ->> 'debut')::timestamptz, (ev.avant ->> 'fin')::timestamptz) as creneau,
           nullif(ev.avant ->> 'fauteuil_id', '')::uuid as fauteuil_id,
           nullif(ev.avant ->> 'praticien_id', '')::uuid as praticien_id
    from public.tiroma_evenements_agenda ev, cab
    where ev.client_id = p_client and ev.entite_id = p_entite
      and ev.type in ('annulation', 'report', 'deplacement')
      and ev.avant ? 'debut' and ev.avant ? 'fin'
      and ((ev.avant ->> 'debut')::timestamptz at time zone cab.fuseau)::date = p_jour
      and (ev.avant ->> 'debut')::timestamptz > ev.detecte_le
      and (ev.avant ->> 'debut')::timestamptz - ev.detecte_le <= interval '48 hours'
    order by ev.rendez_vous_id, ev.avant ->> 'debut', ev.detecte_le
  ),
  juges as (
    select l.fauteuil_id,
           exists (
             select 1 from public.tiroma_rendez_vous r, cab
             where r.client_id = p_client and r.entite_id = p_entite
               and r.id is distinct from l.rendez_vous_id
               and r.statut in ('prevu', 'honore', 'manque')
               and case when l.fauteuil_id is not null then r.fauteuil_id = l.fauteuil_id
                        else r.praticien_id = l.praticien_id end
               and r.vu_premier_le >= l.detecte_le
               and private.tiroma_minutes(tstzmultirange(tstzrange(r.debut, r.fin) * l.creneau))
                   >= least(private.tiroma_minutes(tstzmultirange(l.creneau)), cab.creneau_min_minutes)
           ) as repris
    from liberes l
  )
  select 'tiroma.taux_reprise_48h', 'fauteuil', j.fauteuil_id::text, k.nom,
         count(*) filter (where j.repris)::numeric, count(*)::numeric,
         round(count(*) filter (where j.repris)::numeric / count(*), 6)
  from juges j
  join public.tiroma_fauteuils k on k.id = j.fauteuil_id
  where j.fauteuil_id is not null
  group by j.fauteuil_id, k.nom
  union all
  select 'tiroma.taux_reprise_48h', null, null, null,
         count(*) filter (where j.repris)::numeric, count(*)::numeric,
         round(count(*) filter (where j.repris)::numeric / count(*), 6)
  from juges j
  having count(*) > 0
$function$


-- ═══ FONCTION private.tiroma_mesurer_capacites
CREATE OR REPLACE FUNCTION private.tiroma_mesurer_capacites(p_client uuid, p_entite uuid, p_branchement uuid, p_fuseau text, p_detecte timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  j date := (p_detecte at time zone p_fuseau)::date;
  n bigint; k bigint; v_etat text;
  v_res jsonb := '{}'::jsonb;
begin
  -- Les fiches de laboratoire : part des rendez-vous de pose (trente jours
  -- autour du relevé) qui ont une fiche, par le lien ou par le patient.
  select count(*), count(*) filter (where exists (
           select 1 from public.tiroma_travaux_labo w
           where w.client_id = p_client and w.entite_id = p_entite
             and (w.rendez_vous_pose_id = r.id
                  or (w.patient_id = r.patient_id
                      and w.envoye_le between (r.debut at time zone p_fuseau)::date - 90 and (r.debut at time zone p_fuseau)::date))))
    into n, k
  from public.tiroma_rendez_vous r join public.tiroma_types_rdv t on t.id = r.type_rdv_id
  where r.client_id = p_client and r.entite_id = p_entite and t.famille = 'prothese_pose' and r.statut in ('prevu', 'honore')
    and (r.debut at time zone p_fuseau)::date between j - 30 and j + 30;
  v_etat := private.tiroma_etat_capacite(n, k, 0.8);
  perform private.tiroma_noter_capacite(p_client, p_entite, p_branchement, 'laboratoire', v_etat,
    jsonb_build_object('poses', n, 'avec_fiche', k, 'jours', 30), p_detecte);
  v_res := v_res || jsonb_build_object('laboratoire', v_etat);

  -- Les statuts « manqué » : au moins un en soixante jours.
  select count(*), count(*) filter (where r.statut = 'manque') into n, k
  from public.tiroma_rendez_vous r
  where r.client_id = p_client and r.entite_id = p_entite and r.debut < p_detecte
    and (r.debut at time zone p_fuseau)::date >= j - 60 and r.statut in ('prevu', 'honore', 'manque');
  v_etat := case when n = 0 then 'inconnu' when k > 0 then 'tenu' else 'non_tenu' end;
  perform private.tiroma_noter_capacite(p_client, p_entite, p_branchement, 'statuts_manques', v_etat,
    jsonb_build_object('rendez_vous', n, 'manques', k, 'jours', 60), p_detecte);
  v_res := v_res || jsonb_build_object('statuts_manques', v_etat);

  -- La date de signature des devis : part des devis signés (présentés dans
  -- les quatre-vingt-dix jours) qui la portent.
  select count(*), count(*) filter (where p.signe_le is not null) into n, k
  from public.tiroma_plans p
  where p.client_id = p_client and p.entite_id = p_entite and p.statut in ('signe', 'commence', 'termine')
    and p.presente_le between j - 90 and j;
  v_etat := private.tiroma_etat_capacite(n, k, 0.8);
  perform private.tiroma_noter_capacite(p_client, p_entite, p_branchement, 'signature_devis', v_etat,
    jsonb_build_object('signes', n, 'dates', k, 'jours', 90), p_detecte);
  v_res := v_res || jsonb_build_object('signature_devis', v_etat);

  -- Les liens familiaux : part des patients actifs qui en portent un.
  select count(*), count(*) filter (where p.famille_ref is not null) into n, k
  from public.tiroma_patients p where p.client_id = p_client and p.entite_id = p_entite and p.actif;
  v_etat := private.tiroma_etat_capacite(n, k, 0.1);
  perform private.tiroma_noter_capacite(p_client, p_entite, p_branchement, 'liens_familiaux', v_etat,
    jsonb_build_object('patients', n, 'avec_lien', k), p_detecte);
  v_res := v_res || jsonb_build_object('liens_familiaux', v_etat);

  -- Le stock : tenu s'il en vient des lignes ; non tenu si un export de stock
  -- est appliqué et vide ; inconnu sans export.
  select count(*) into k from public.tiroma_stock s where s.client_id = p_client and s.entite_id = p_entite and s.source = 'logiciel';
  v_etat := case when k > 0 then 'tenu'
                 when exists (select 1 from public.branchements_jeux x where x.branchement_id = p_branchement and x.code = 'stock' and x.courant_id is not null) then 'non_tenu'
                 else 'inconnu' end;
  perform private.tiroma_noter_capacite(p_client, p_entite, p_branchement, 'stock', v_etat, jsonb_build_object('references', k), p_detecte);
  v_res := v_res || jsonb_build_object('stock', v_etat);

  -- La date de création des rendez-vous (sert à la mesure de réinscription).
  select count(*), count(*) filter (where r.cree_source_le is not null) into n, k
  from public.tiroma_rendez_vous r
  where r.client_id = p_client and r.entite_id = p_entite and (r.debut at time zone p_fuseau)::date between j - 30 and j + 30;
  v_etat := private.tiroma_etat_capacite(n, k, 0.8);
  perform private.tiroma_noter_capacite(p_client, p_entite, p_branchement, 'dates_creation', v_etat,
    jsonb_build_object('rendez_vous', n, 'avec_date', k, 'jours', 30), p_detecte);
  v_res := v_res || jsonb_build_object('dates_creation', v_etat);
  return v_res;
end $function$


-- ═══ FONCTION private.tiroma_mesures
CREATE OR REPLACE FUNCTION private.tiroma_mesures(p_client uuid, p_entite uuid, p_passage text, p_jour date)
 RETURNS TABLE(jour date, indicateur text, version integer, objet_type text, objet_id text, objet_libelle text, numerateur numeric, base numeric, valeur numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  d date;
begin
  if p_passage = 'soir' then
    return query select p_jour, m.indicateur, 1, m.objet_type, m.objet_id, m.objet_libelle, m.numerateur, m.base, m.valeur
                 from private.tiroma_mesure_occupation(p_client, p_entite, p_jour, 'realisee') m;
    return query select p_jour, m.indicateur, 1, m.objet_type, m.objet_id, m.objet_libelle, m.numerateur, m.base, m.valeur
                 from private.tiroma_mesure_reprise(p_client, p_entite, p_jour) m;
    return query select p_jour, m.indicateur, 1, m.objet_type, m.objet_id, m.objet_libelle, m.numerateur, m.base, m.valeur
                 from private.tiroma_mesure_production_realisee(p_client, p_entite, p_jour) m;
    return query select p_jour, m.indicateur, 1, m.objet_type, m.objet_id, m.objet_libelle, m.numerateur, m.base, m.valeur
                 from private.tiroma_mesure_laboratoire(p_client, p_entite, p_jour) m;
    return query select p_jour, m.indicateur, 1, m.objet_type, m.objet_id, m.objet_libelle, m.numerateur, m.base, m.valeur
                 from private.tiroma_mesure_controles(p_client, p_entite, p_jour) m;
    return query select p_jour - 1, m.indicateur, 1, m.objet_type, m.objet_id, m.objet_libelle, m.numerateur, m.base, m.valeur
                 from private.tiroma_mesure_reinscription(p_client, p_entite, p_jour - 1) m;
    for d in select generate_series(p_jour - 60, p_jour, interval '1 day')::date loop
      return query select d, m.indicateur, 1, m.objet_type, m.objet_id, m.objet_libelle, m.numerateur, m.base, m.valeur
                   from private.tiroma_mesure_acceptation(p_client, p_entite, d) m;
    end loop;
  elsif p_passage = 'matin' then
    for d in select generate_series(p_jour, p_jour + 1, interval '1 day')::date loop
      return query select d, m.indicateur, 1, m.objet_type, m.objet_id, m.objet_libelle, m.numerateur, m.base, m.valeur
                   from private.tiroma_mesure_occupation(p_client, p_entite, d, 'prevue') m;
    end loop;
    return query select p_jour, m.indicateur, 1, m.objet_type, m.objet_id, m.objet_libelle, m.numerateur, m.base, m.valeur
                 from private.tiroma_mesure_production_prevue(p_client, p_entite, p_jour) m;
  else
    raise exception 'Passage inconnu : %.', coalesce(p_passage, 'vide') using errcode = '22023';
  end if;
end $function$


-- ═══ FONCTION private.tiroma_minutes
CREATE OR REPLACE FUNCTION private.tiroma_minutes(p tstzmultirange)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select coalesce(sum(extract(epoch from (upper(r) - lower(r))) / 60.0), 0)::numeric
  from unnest(coalesce(p, '{}'::tstzmultirange)) as r
$function$


-- ═══ FONCTION private.tiroma_normaliser
CREATE OR REPLACE FUNCTION private.tiroma_normaliser(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select nullif(regexp_replace(
           translate(replace(replace(lower(btrim(p)), 'œ', 'oe'), 'æ', 'ae'),
                     'àâäáãåéèêëíìîïóòôöõúùûüýÿçñ', 'aaaaaaeeeeiiiiooooouuuuyycn'),
           '\s+', ' ', 'g'), '')
$function$


-- ═══ FONCTION private.tiroma_noter_capacite
CREATE OR REPLACE FUNCTION private.tiroma_noter_capacite(p_client uuid, p_entite uuid, p_branchement uuid, p_domaine text, p_etat text, p_mesure jsonb, p_quand timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.tiroma_capacites (client_id, entite_id, domaine, etat, mesure, calcule_le)
  values (p_client, p_entite, p_domaine, p_etat, p_mesure, p_quand)
  on conflict (client_id, entite_id, domaine) do update
    set etat = excluded.etat, mesure = excluded.mesure, calcule_le = excluded.calcule_le;
  perform private.noter_capacite(p_branchement, p_domaine, jsonb_build_object('lecture', true, 'tenue', p_etat, 'mesure', p_mesure));
end $function$


-- ═══ FONCTION private.tiroma_ordre_jeu
CREATE OR REPLACE FUNCTION private.tiroma_ordre_jeu(p_code text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case p_code
    when 'types_rdv' then 1 when 'patients' then 2 when 'agenda' then 3 when 'devis' then 4 when 'devis_lignes' then 5
    when 'actes' then 6 when 'labo' then 7 when 'stock' then 8 when 'odf' then 9 when 'attente' then 10 end
$function$


-- ═══ FONCTION private.tiroma_ouvert
CREATE OR REPLACE FUNCTION private.tiroma_ouvert(p_client uuid, p_entite uuid, p_fauteuil uuid, p_jour date)
 RETURNS tstzmultirange
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_fuseau text;
  v_territoire text;
  v_complet boolean;
  v_propres boolean;
  v_tenus boolean;
  v_exception boolean;
  v_jour tstzrange;
  v_ouvert tstzmultirange;
  v_ferme tstzmultirange;
begin
  select e.fuseau into v_fuseau from public.entites e where e.client_id = p_client and e.id = p_entite;
  if v_fuseau is null then
    return null;
  end if;
  v_jour := private.tiroma_bornes_jour(p_jour, v_fuseau);
  v_propres := exists (select 1 from public.tiroma_horaires h
                       where h.client_id = p_client and h.entite_id = p_entite and h.fauteuil_id = p_fauteuil);
  v_tenus := v_propres or exists (select 1 from public.tiroma_horaires h
                                  where h.client_id = p_client and h.entite_id = p_entite
                                    and h.fauteuil_id is null and h.praticien_id is null);
  if not v_tenus then
    return null;
  end if;

  v_exception := exists (
    select 1 from public.tiroma_horaires h
    where h.client_id = p_client and h.entite_id = p_entite and h.exceptionnel and h.valide_du = p_jour
      and (case when v_propres then h.fauteuil_id = p_fauteuil
                else h.fauteuil_id is null and h.praticien_id is null end));

  if not v_exception then
    v_territoire := private.territoire_de_entite(p_client, p_entite);
    select t.complet into v_complet from public.territoires t where t.code = v_territoire;
    if not coalesce(v_complet, false) then
      return null;  -- jours fériés inconnus : on ne sait pas si le cabinet ouvre
    end if;
    if public.jour_ferie(p_jour, v_territoire) then
      return '{}'::tstzmultirange;
    end if;
  end if;

  with lignes as (
    select h.* from public.tiroma_horaires h
    where h.client_id = p_client and h.entite_id = p_entite
      and (case when v_propres then h.fauteuil_id = p_fauteuil
                else h.fauteuil_id is null and h.praticien_id is null end)
      and (case when v_exception then h.exceptionnel and h.valide_du = p_jour
                else not h.exceptionnel and h.jour = extract(isodow from p_jour)
                     and (h.valide_du is null or h.valide_du <= p_jour)
                     and (h.valide_au is null or h.valide_au >= p_jour) end)
  )
  select range_agg(
           tstzmultirange(tstzrange((p_jour + l.debut) at time zone v_fuseau, (p_jour + l.fin) at time zone v_fuseau))
           - coalesce((select range_agg(tstzrange(f.debut, f.fin))
                       from public.tiroma_fermetures f
                       where l.praticien_id is not null
                         and f.client_id = p_client and f.entite_id = p_entite
                         and f.praticien_id = l.praticien_id
                         and tstzrange(f.debut, f.fin) && v_jour), '{}'::tstzmultirange))
  into v_ouvert
  from lignes l;

  select range_agg(tstzrange(f.debut, f.fin)) into v_ferme
  from public.tiroma_fermetures f
  where f.client_id = p_client and f.entite_id = p_entite and f.praticien_id is null
    and (f.fauteuil_id is null or f.fauteuil_id = p_fauteuil)
    and tstzrange(f.debut, f.fin) && v_jour;

  return (coalesce(v_ouvert, '{}'::tstzmultirange) - coalesce(v_ferme, '{}'::tstzmultirange))
         * tstzmultirange(v_jour);
end $function$


-- ═══ FONCTION private.tiroma_panier
CREATE OR REPLACE FUNCTION private.tiroma_panier(p text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select case
    when private.tiroma_normaliser(p) ~ '100' then '100_sante'
    when private.tiroma_normaliser(p) ~ '(maitris|moder)' then 'maitrise'
    when private.tiroma_normaliser(p) ~ 'mixte' then 'mixte'
    when private.tiroma_normaliser(p) ~ 'libre' then 'libre'
    else null end
$function$


-- ═══ FONCTION private.tiroma_patient_efface
CREATE OR REPLACE FUNCTION private.tiroma_patient_efface()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.tiroma_effaces (client_id, entite_id, empreinte_ref)
  values (old.client_id, old.entite_id, private.tiroma_empreinte_ref(old.client_id, old.entite_id, old.source_ref))
  on conflict (client_id, entite_id, empreinte_ref) do nothing;
  return null;
end $function$


-- ═══ FONCTION private.tiroma_patient_par_ref
CREATE OR REPLACE FUNCTION private.tiroma_patient_par_ref(p_client uuid, p_entite uuid, p_ref text, p_nom text, p_prenom text, p_naissance date, p_quand timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
  if p_ref is null then
    return null;
  end if;
  select id into v_id from public.tiroma_patients
  where client_id = p_client and entite_id = p_entite and source_ref = left(p_ref, 200);
  if found then
    return v_id;
  end if;
  if exists (select 1 from public.tiroma_effaces x
             where x.client_id = p_client and x.entite_id = p_entite
               and x.empreinte_ref = private.tiroma_empreinte_ref(p_client, p_entite, left(p_ref, 200))) then
    return null;
  end if;
  insert into public.tiroma_patients (client_id, entite_id, source_ref, nom, prenom, naissance, vu_premier_le, vu_dernier_le)
  values (p_client, p_entite, left(p_ref, 200),
          left(coalesce(nullif(btrim(p_nom), ''), '(patient ' || left(p_ref, 60) || ')'), 120),
          left(nullif(btrim(p_prenom), ''), 120), case when p_naissance >= date '1900-01-01' then p_naissance end,
          p_quand, p_quand)
  returning id into v_id;
  return v_id;
end $function$


-- ═══ FONCTION private.tiroma_praticien_par_ref
CREATE OR REPLACE FUNCTION private.tiroma_praticien_par_ref(p_client uuid, p_entite uuid, p_ref text, p_quand timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid; v_sans_ref boolean;
begin
  if p_ref is null then
    return null;
  end if;
  select p.id, p.source_ref is null into v_id, v_sans_ref from public.tiroma_praticiens p
  where p.client_id = p_client and p.entite_id = p_entite
    and (p.source_ref = left(p_ref, 200) or (p.source_ref is null and lower(p.nom_affiche) = lower(p_ref)))
  order by (p.source_ref = left(p_ref, 200)) desc, p.cree_le
  limit 1;
  if v_id is null then
    insert into public.tiroma_praticiens (client_id, entite_id, source_ref, nom_affiche, metier, cree_le)
    values (p_client, p_entite, left(p_ref, 200), left(p_ref, 120), 'collaborateur', p_quand)
    returning id into v_id;
  elsif v_sans_ref then
    update public.tiroma_praticiens set source_ref = left(p_ref, 200) where id = v_id;
  end if;
  return v_id;
end $function$


-- ═══ FONCTION private.tiroma_praticiens_patients
CREATE OR REPLACE FUNCTION private.tiroma_praticiens_patients()
 RETURNS TABLE(entite_id uuid, praticien_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select m.entite_id, coalesce(m.praticien_id, '00000000-0000-0000-0000-000000000000'::uuid)
  from private.tiroma_mes_cabinets() m
  where m.profil = 'collaborateur' and m.perimetre = 'praticien'
$function$


-- ═══ FONCTION private.tiroma_praticiens_production
CREATE OR REPLACE FUNCTION private.tiroma_praticiens_production()
 RETURNS TABLE(entite_id uuid, praticien_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select m.entite_id, coalesce(m.praticien_id, '00000000-0000-0000-0000-000000000000'::uuid)
  from private.tiroma_mes_cabinets() m
  where m.profil = 'collaborateur'
$function$


-- ═══ FONCTION private.tiroma_presumer_honores
CREATE OR REPLACE FUNCTION private.tiroma_presumer_honores(p_client uuid, p_entite uuid, p_fuseau text, p_detecte timestamp with time zone, p_releve uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n integer;
begin
  with maj as (
    update public.tiroma_rendez_vous r set presume = 'honore'
    where r.client_id = p_client and r.entite_id = p_entite and r.statut = 'prevu' and r.presume is null
      and r.fin < p_detecte and r.patient_id is not null
      and exists (select 1 from public.tiroma_actes_realises a
                  where a.client_id = p_client and a.entite_id = p_entite and a.patient_id = r.patient_id
                    and a.date = (r.debut at time zone p_fuseau)::date)
    returning r.id, r.patient_id, r.source_ref, r.debut, r.fin, r.fauteuil_id, r.praticien_id, r.statut)
  insert into public.tiroma_evenements_agenda (client_id, entite_id, rendez_vous_id, patient_id, type, avant, apres, detecte_le, releve_id, cle_idempotence)
  select p_client, p_entite, m.id, m.patient_id, 'presume_honore', null,
         jsonb_build_object('debut', m.debut, 'fin', m.fin, 'fauteuil_id', m.fauteuil_id, 'praticien_id', m.praticien_id, 'statut', m.statut),
         p_detecte, p_releve, left('presume_honore:' || m.source_ref, 200)
  from maj m
  on conflict (client_id, cle_idempotence) do nothing;
  get diagnostics n = row_count;
  return n;
end $function$


-- ═══ FONCTION private.tiroma_profil_coherent
CREATE OR REPLACE FUNCTION private.tiroma_profil_coherent()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_role text;
begin
  select c.role into v_role from public.comptes c where c.user_id = new.user_id and c.client_id = new.client_id;
  if v_role is null then
    raise exception 'La personne n''est pas membre de l''organisation.' using errcode = '23503';
  end if;
  if new.profil = 'titulaire' and v_role <> 'gerant' then
    raise exception 'Un titulaire est gérant de l''organisation.' using errcode = '22023';
  end if;
  if new.profil = 'direction' and v_role not in ('gerant', 'admin') then
    raise exception 'Une direction est gérante ou administratrice de l''organisation.' using errcode = '22023';
  end if;
  if new.profil <> 'direction' and not exists (
       select 1 from public.tiroma_cabinets k where k.client_id = new.client_id and k.entite_id = new.entite_id) then
    raise exception 'Ce profil se pose sur un cabinet installé.' using errcode = '22023';
  end if;
  if new.praticien_id is not null and new.profil not in ('titulaire', 'collaborateur') then
    raise exception 'Seul un dentiste est relié à un praticien.' using errcode = '22023';
  end if;
  if new.membre_id is not null and new.profil <> 'assistante' then
    raise exception 'Seule une assistante est reliée à un membre de l''équipe.' using errcode = '22023';
  end if;
  new.maj_le := now();
  return new;
end $function$


-- ═══ FONCTION private.tiroma_profils_droits
CREATE OR REPLACE FUNCTION private.tiroma_profils_droits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  -- Pendant l'effacement de l'organisation, rien ne se recrée.
  if coalesce(new.client_id, old.client_id)::text = coalesce(current_setting('omega.effacement_client', true), '') then
    return null;
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    perform private.tiroma_accorder_droits(old.client_id, old.user_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform private.tiroma_accorder_droits(new.client_id, new.user_id);
  end if;
  return null;
end $function$


-- ═══ FONCTION private.tiroma_purger
CREATE OR REPLACE FUNCTION private.tiroma_purger(p_maintenant timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_bilan jsonb := '{}'::jsonb;
  v_duree interval;
  t record;
  r record;
begin
  perform set_config('omega.tiroma_moteur', 'purge', true);

  for t in
    select v.nom, v.condition from (values
      (1, 'tiroma_evenements_agenda', 'x.detecte_le < $1 - $2'),
      (2, 'tiroma_liste_attente', 'x.retire_le < $1 - $2'),
      (3, 'tiroma_actes_realises', 'x.date < ($1 - $2)::date'),
      (4, 'tiroma_travaux_labo',
          'coalesce(x.revenu_le, x.retour_attendu_le, x.envoye_le, x.cree_le::date) < ($1 - $2)::date'),
      (5, 'tiroma_ententes_odf',
          '((x.statut in (''terminee'', ''abandonnee'', ''refusee'') and coalesce(x.fin_le, x.maj_le::date) < ($1 - $2)::date)'
          ' or (x.statut in (''demandee'', ''accordee'') and coalesce(x.accord_le, x.demande_le, x.maj_le::date) < ($1 - $2)::date))'),
      (6, 'tiroma_rendez_vous', 'x.fin < $1 - $2'),
      (7, 'tiroma_plans',
          '((x.statut in (''termine'', ''abandonne'', ''expire'', ''refuse'') and coalesce(x.clos_le, x.vu_dernier_le) < $1 - $2)'
          ' or (x.statut = ''presente'' and coalesce(x.presente_le, x.vu_premier_le::date) < ($1 - $2)::date))'),
      (8, 'tiroma_releves', 'x.recu_le < $1 - $2')) as v(rang, nom, condition)
    order by v.rang
  loop
    select c.duree into v_duree from private.tiroma_conservation c where c.nom = t.nom;
    continue when v_duree is null;
    for r in execute format(
      'with d as (delete from public.%I x where %s returning x.client_id, x.id::text as id) '
      'select d.client_id, count(*) as n, jsonb_agg(d.id order by d.id) as ids from d group by d.client_id',
      t.nom, t.condition)
      using p_maintenant, v_duree
    loop
      v_bilan := jsonb_set(v_bilan, array[r.client_id::text],
        coalesce(v_bilan -> r.client_id::text, '{}'::jsonb) || jsonb_build_object(t.nom, jsonb_build_object('n', r.n, 'ids', r.ids)));
    end loop;
  end loop;

  -- Les patients qui ne viennent plus : ni venue ni acte depuis la durée du
  -- cabinet, rien d'ouvert (rendez-vous à venir, attente, plan).
  for r in
    with d as (
      delete from public.tiroma_patients p
      using public.tiroma_regles g
      where g.client_id = p.client_id and g.entite_id = p.entite_id
        and coalesce(greatest(p.dernier_rdv_le, p.dernier_acte_le), (p.vu_premier_le at time zone 'UTC')::date)
            < (p_maintenant - make_interval(months => g.patient_actif_mois))::date
        and not exists (select 1 from public.tiroma_rendez_vous v
                        where v.patient_id = p.id and v.statut = 'prevu' and v.debut >= p_maintenant)
        and not exists (select 1 from public.tiroma_liste_attente a
                        where a.patient_id = p.id and a.retire_le is null)
        and not exists (select 1 from public.tiroma_plans pl
                        where pl.patient_id = p.id and pl.statut in ('presente', 'signe', 'commence'))
      returning p.client_id, p.id::text as id)
    select d.client_id, count(*) as n, jsonb_agg(d.id order by d.id) as ids from d group by d.client_id
  loop
    v_bilan := jsonb_set(v_bilan, array[r.client_id::text],
      coalesce(v_bilan -> r.client_id::text, '{}'::jsonb)
      || jsonb_build_object('tiroma_patients', jsonb_build_object('n', r.n, 'ids', r.ids)));
  end loop;

  -- Une ligne de synthèse par organisation, au journal : les objets retirés.
  for r in select e.key as client, e.value as lignes from jsonb_each(v_bilan) e loop
    perform private.journaliser_module(r.client::uuid, 'tiroma', 'tiroma.purge', 'tiroma', null,
      jsonb_build_object('lignes', r.lignes,
                         'le', to_char(p_maintenant at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')));
  end loop;

  perform set_config('omega.tiroma_moteur', '', true);
  return v_bilan;
end $function$


-- ═══ FONCTION private.tiroma_rattacher_plans
CREATE OR REPLACE FUNCTION private.tiroma_rattacher_plans(p_client uuid, p_entite uuid, p_fuseau text, p_detecte timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c record;
  n_lies integer := 0;
  n_verif integer := 0;
begin
  for c in
    with rdv as (
      select r.id, r.patient_id, r.praticien_id, (r.debut at time zone p_fuseau)::date as jour, t.famille
      from public.tiroma_rendez_vous r join public.tiroma_types_rdv t on t.id = r.type_rdv_id
      where r.client_id = p_client and r.entite_id = p_entite and r.plan_id is null and r.statut = 'prevu' and r.debut > p_detecte
        and r.patient_id is not null and t.famille is not null
        and t.famille not in ('personnel', 'urgence', 'controle', 'detartrage', 'premiere_consultation', 'autre')
    ),
    cand as (
      select v.id as rdv_id, v.famille, p.id as plan_id
      from rdv v
      join public.tiroma_plans p on p.client_id = p_client and p.entite_id = p_entite and p.patient_id = v.patient_id
        and p.statut in ('signe', 'commence') and p.disparu_le is null
        and (p.praticien_id is null or v.praticien_id is null or p.praticien_id = v.praticien_id)
        and v.jour >= coalesce(p.signe_le, p.presente_le, v.jour)
        and v.jour <= coalesce(p.valide_jusqu_au, coalesce(p.presente_le, v.jour) + 365)
      where exists (select 1 from public.tiroma_plan_actes a
                    where a.plan_id = p.id and a.famille = v.famille and a.statut <> 'fait' and a.rendez_vous_id is null)
    )
    select rdv_id, famille, min(plan_id::text)::uuid as plan_id, count(distinct plan_id) as n, array_agg(distinct plan_id) as plans
    from cand group by rdv_id, famille
  loop
    if c.n = 1 then
      update public.tiroma_rendez_vous set plan_id = c.plan_id where id = c.rdv_id;
      update public.tiroma_plan_actes a
         set rendez_vous_id = c.rdv_id, statut = 'planifie'
       where a.id = (select a2.id from public.tiroma_plan_actes a2
                     where a2.plan_id = c.plan_id and a2.famille = c.famille and a2.statut <> 'fait' and a2.rendez_vous_id is null
                     order by a2.rang limit 1);
      n_lies := n_lies + 1;
    else
      update public.tiroma_plans set a_verifier = true where id = any (c.plans) and not a_verifier;
      n_verif := n_verif + 1;
    end if;
  end loop;
  return jsonb_build_object('lies', n_lies, 'a_verifier', n_verif);
end $function$


-- ═══ FONCTION private.tiroma_rattraper
CREATE OR REPLACE FUNCTION private.tiroma_rattraper(p_client uuid, p_entite uuid, p_branchement uuid, p_fuseau text, p_detecte timestamp with time zone, p_lignes boolean, p_patients boolean, p_liens boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  n_lignes integer := 0; n_actes integer := 0; n_labo integer := 0; n_odf integer := 0; n_attente integer := 0; n_liens integer := 0;
  n integer;
begin
  if p_lignes then
    for s in
      select x.valeurs from public.jeux_lignes x join public.branchements_jeux j on j.id = x.jeu_id
      where j.branchement_id = p_branchement and j.code = 'devis_lignes'
        and exists (select 1 from public.tiroma_plans p where p.client_id = p_client and p.entite_id = p_entite
                    and p.source_ref = private.tiroma_v(x.valeurs, 'numero'))
        and not exists (select 1 from public.tiroma_plan_actes a join public.tiroma_plans p on p.id = a.plan_id
                        where p.client_id = p_client and p.entite_id = p_entite
                          and p.source_ref = private.tiroma_v(x.valeurs, 'numero') and a.rang = private.tiroma_v_entier(x.valeurs, 'rang'))
    loop
      if private.tiroma_ligne_devis(p_client, p_entite, s.valeurs, p_detecte) in ('ajout', 'modification') then
        n_lignes := n_lignes + 1;
      end if;
    end loop;
  end if;

  if p_patients then
    for s in
      select j.code, x.valeurs from public.jeux_lignes x join public.branchements_jeux j on j.id = x.jeu_id
      where j.branchement_id = p_branchement and j.code in ('actes', 'labo', 'odf', 'attente')
        and exists (select 1 from public.tiroma_patients p where p.client_id = p_client and p.entite_id = p_entite
                    and p.source_ref = private.tiroma_v(x.valeurs, 'patient_ref'))
        and not exists (
          select 1 from public.tiroma_actes_realises a where j.code = 'actes' and a.client_id = p_client and a.entite_id = p_entite and a.source_ref = private.tiroma_v(x.valeurs, 'ref')
          union all
          select 1 from public.tiroma_travaux_labo w where j.code = 'labo' and w.client_id = p_client and w.entite_id = p_entite and w.source_ref = private.tiroma_v(x.valeurs, 'ref')
          union all
          select 1 from public.tiroma_ententes_odf o where j.code = 'odf' and o.client_id = p_client and o.entite_id = p_entite and o.source_ref = private.tiroma_v(x.valeurs, 'ref')
          union all
          select 1 from public.tiroma_liste_attente l where j.code = 'attente' and l.client_id = p_client and l.entite_id = p_entite and l.source_ref = private.tiroma_v(x.valeurs, 'ref'))
    loop
      case s.code
        when 'actes' then
          if private.tiroma_ligne_acte(p_client, p_entite, s.valeurs, p_fuseau, p_detecte) = 'ajout' then n_actes := n_actes + 1; end if;
        when 'labo' then
          if private.tiroma_ligne_labo(p_client, p_entite, s.valeurs, p_detecte) = 'ajout' then n_labo := n_labo + 1; end if;
        when 'odf' then
          if private.tiroma_ligne_odf(p_client, p_entite, s.valeurs, p_detecte) = 'ajout' then n_odf := n_odf + 1; end if;
        when 'attente' then
          if private.tiroma_ligne_attente(p_client, p_entite, s.valeurs, p_fuseau, p_detecte) = 'ajout' then n_attente := n_attente + 1; end if;
      end case;
    end loop;
  end if;

  if p_liens then
    -- Les rendez-vous qui nomment un devis arrivé depuis.
    update public.tiroma_rendez_vous r set plan_id = p.id
    from public.jeux_lignes x join public.branchements_jeux j on j.id = x.jeu_id, public.tiroma_plans p
    where j.branchement_id = p_branchement and j.code = 'agenda' and r.client_id = p_client and r.entite_id = p_entite
      and r.plan_id is null and r.source_ref = private.tiroma_v(x.valeurs, 'ref')
      and p.client_id = p_client and p.entite_id = p_entite and p.source_ref = private.tiroma_v(x.valeurs, 'devis_ref');
    get diagnostics n = row_count; n_liens := n_liens + n;
    -- Les lignes de devis qui nomment un rendez-vous arrivé depuis.
    update public.tiroma_plan_actes a
       set rendez_vous_id = r.id, statut = case when a.statut = 'fait' then 'fait' else 'planifie' end
    from public.tiroma_rendez_vous r
    where a.client_id = p_client and a.entite_id = p_entite and a.rendez_vous_id is null and a.rdv_ref is not null
      and r.client_id = p_client and r.entite_id = p_entite and r.source_ref = a.rdv_ref;
    get diagnostics n = row_count; n_liens := n_liens + n;
    update public.tiroma_rendez_vous r set plan_id = a.plan_id
    from public.tiroma_plan_actes a
    where r.client_id = p_client and r.entite_id = p_entite and r.plan_id is null and a.rendez_vous_id = r.id;
    -- Les fiches de laboratoire et les actes qui nomment un rendez-vous ou un devis arrivé depuis.
    update public.tiroma_travaux_labo w
       set rendez_vous_pose_id = coalesce(w.rendez_vous_pose_id, rp.id), rendez_vous_empreinte_id = coalesce(w.rendez_vous_empreinte_id, re.id)
    from public.jeux_lignes x join public.branchements_jeux j on j.id = x.jeu_id
    left join public.tiroma_rendez_vous rp on rp.client_id = p_client and rp.entite_id = p_entite and rp.source_ref = private.tiroma_v(x.valeurs, 'rdv_pose_ref')
    left join public.tiroma_rendez_vous re on re.client_id = p_client and re.entite_id = p_entite and re.source_ref = private.tiroma_v(x.valeurs, 'rdv_empreinte_ref')
    where j.branchement_id = p_branchement and j.code = 'labo' and w.client_id = p_client and w.entite_id = p_entite
      and w.source_ref = private.tiroma_v(x.valeurs, 'ref')
      and ((w.rendez_vous_pose_id is null and rp.id is not null) or (w.rendez_vous_empreinte_id is null and re.id is not null));
    get diagnostics n = row_count; n_liens := n_liens + n;
    update public.tiroma_actes_realises a
       set plan_id = coalesce(a.plan_id, p.id), rendez_vous_id = coalesce(a.rendez_vous_id, r.id)
    from public.jeux_lignes x join public.branchements_jeux j on j.id = x.jeu_id
    left join public.tiroma_plans p on p.client_id = p_client and p.entite_id = p_entite and p.source_ref = private.tiroma_v(x.valeurs, 'devis_numero')
    left join public.tiroma_rendez_vous r on r.client_id = p_client and r.entite_id = p_entite and r.source_ref = private.tiroma_v(x.valeurs, 'rdv_ref')
    where j.branchement_id = p_branchement and j.code = 'actes' and a.client_id = p_client and a.entite_id = p_entite
      and a.source_ref = private.tiroma_v(x.valeurs, 'ref')
      and ((a.plan_id is null and p.id is not null) or (a.rendez_vous_id is null and r.id is not null));
    get diagnostics n = row_count; n_liens := n_liens + n;
  end if;
  return jsonb_strip_nulls(jsonb_build_object('lignes_devis', nullif(n_lignes, 0), 'actes', nullif(n_actes, 0), 'labo', nullif(n_labo, 0),
                                              'odf', nullif(n_odf, 0), 'attente', nullif(n_attente, 0), 'liens', nullif(n_liens, 0)));
end $function$


-- ═══ FONCTION private.tiroma_rdv_json
CREATE OR REPLACE FUNCTION private.tiroma_rdv_json(r tiroma_rendez_vous)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select jsonb_build_object('debut', r.debut, 'fin', r.fin, 'fauteuil_id', r.fauteuil_id, 'praticien_id', r.praticien_id, 'statut', r.statut)
$function$


-- ═══ FONCTION private.tiroma_releve_en_retard
CREATE OR REPLACE FUNCTION private.tiroma_releve_en_retard(p_charge jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  j public.branchements_jeux;
  b public.branchements;
  k public.tiroma_cabinets;
  v_avant timestamptz;
  v_id uuid;
begin
  select * into j from public.branchements_jeux where id = (p_charge ->> 'jeu')::uuid;
  if not found then
    return jsonb_build_object('ignore', 'jeu inconnu');
  end if;
  select * into b from public.branchements where id = j.branchement_id;
  select * into k from public.tiroma_cabinets where client_id = b.client_id and entite_id = b.entite_id;
  if not found or k.statut <> 'actif' then
    return jsonb_build_object('ignore', 'cabinet non actif');
  end if;
  v_avant := coalesce((p_charge ->> 'avant')::timestamptz, now());
  v_id := private.lever_alerte_module(b.client_id, 'tiroma', 'attention',
    left(format('Tiroma n''a pas reçu l''export « %s » de votre logiciel ce matin (attendu avant %s) : le point du matin sera incomplet.',
                j.libelle, to_char(v_avant at time zone b.fuseau, 'HH24"h"MI')), 200),
    jsonb_build_object('jeu', j.code, 'attendu_avant', v_avant, 'dernier_recu_le', p_charge -> 'dernier_recu_le', 'donnees_du', p_charge -> 'etat_le'),
    'releve:retard:' || j.id::text || ':' || to_char(v_avant at time zone b.fuseau, 'YYYYMMDD'), true, null);
  return jsonb_strip_nulls(jsonb_build_object('alerte', v_id));
end $function$


-- ═══ FONCTION private.tiroma_reserve
CREATE OR REPLACE FUNCTION private.tiroma_reserve(p_client uuid, p_entite uuid, p_fauteuil uuid, p_jour date, p_genre text)
 RETURNS tstzmultirange
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(range_agg(tstzrange(r.debut, r.fin)), '{}'::tstzmultirange)
  from public.tiroma_rendez_vous r
  join public.entites e on e.client_id = r.client_id and e.id = r.entite_id
  left join public.tiroma_types_rdv t on t.id = r.type_rdv_id
  where r.client_id = p_client and r.entite_id = p_entite and r.fauteuil_id = p_fauteuil
    and tstzrange(r.debut, r.fin) && private.tiroma_bornes_jour(p_jour, e.fuseau)
    and coalesce(t.famille, '') <> 'personnel'
    and case p_genre
          when 'prevue' then r.statut in ('prevu', 'honore')
          when 'realisee' then r.statut = 'honore' or (r.statut = 'prevu' and r.presume = 'honore')
          else false
        end
$function$


-- ═══ FONCTION private.tiroma_reserve_valide
CREATE OR REPLACE FUNCTION private.tiroma_reserve_valide(p jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  e jsonb;
  j jsonb;
begin
  if p is null or jsonb_typeof(p) <> 'array' or jsonb_array_length(p) > 20 then
    return false;
  end if;
  for e in select value from jsonb_array_elements(p) loop
    if jsonb_typeof(e) <> 'object'
       or jsonb_typeof(e -> 'jours') is distinct from 'array' or jsonb_array_length(e -> 'jours') = 0
       or coalesce(e ->> 'demi_journee', '') not in ('matin', 'apres_midi')
       or (e ->> 'minutes') !~ '^[0-9]+$' or (e ->> 'minutes')::integer not between 5 and 240 then
      return false;
    end if;
    for j in select value from jsonb_array_elements(e -> 'jours') loop
      if jsonb_typeof(j) <> 'number' or j::text !~ '^[1-7]$' then
        return false;
      end if;
    end loop;
  end loop;
  return true;
end $function$


-- ═══ FONCTION private.tiroma_seances_valides
CREATE OR REPLACE FUNCTION private.tiroma_seances_valides(p jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  e jsonb;
  n integer := 0;
begin
  if p is null or jsonb_typeof(p) <> 'array' or jsonb_array_length(p) = 0 or jsonb_array_length(p) > 20 then
    return false;
  end if;
  for e in select value from jsonb_array_elements(p) loop
    n := n + 1;
    if jsonb_typeof(e) <> 'object'
       or jsonb_typeof(e -> 'rang') is distinct from 'number' or (e ->> 'rang') !~ '^[0-9]+$'
       or (e ->> 'rang')::integer <> n
       or jsonb_typeof(e -> 'duree_min') is distinct from 'number' or (e ->> 'duree_min') !~ '^[0-9]+$'
       or (e ->> 'duree_min')::integer not between 5 and 600
       or (e ? 'labo' and jsonb_typeof(e -> 'labo') <> 'boolean')
       or (e ? 'delai_min_jours' and ((e ->> 'delai_min_jours') !~ '^[0-9]+$'
                                      or (e ->> 'delai_min_jours')::integer > 365)) then
      return false;
    end if;
  end loop;
  return true;
end $function$


-- ═══ FONCTION private.tiroma_signer_validation
CREATE OR REPLACE FUNCTION private.tiroma_signer_validation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := (select auth.uid());
begin
  -- (deux « if » imbriqués : l'expression intérieure n'est préparée que pour
  -- le vocabulaire, seule table qui porte ces colonnes)
  if tg_table_name = 'tiroma_types_rdv' and v_uid is not null then
    if (new.famille, new.necessite_labo, new.chirurgie, new.exige_assistante, new.capacite_requise, new.duree_defaut_min)
       is distinct from
       (old.famille, old.necessite_labo, old.chirurgie, old.exige_assistante, old.capacite_requise, old.duree_defaut_min) then
      new.classe_par := 'humain';
      new.confiance := null;
    end if;
  end if;
  if new.statut = 'valide' and old.statut is distinct from 'valide' then
    if v_uid is not null then
      new.valide_par := v_uid;
      new.valide_le := now();
    else
      new.valide_le := coalesce(new.valide_le, now());
    end if;
  elsif new.statut <> 'valide' then
    new.valide_par := null;
    new.valide_le := null;
  end if;
  new.maj_le := now();
  return new;
end $function$


-- ═══ FONCTION private.tiroma_statut_devis
CREATE OR REPLACE FUNCTION private.tiroma_statut_devis(p text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare n text := private.tiroma_normaliser(p);
begin
  return case
    when n is null then 'presente'
    when n ~ '(refus|rejet)' then 'refuse'
    when n ~ '(abandon|annul|caduc)' then 'abandonne'
    when n ~ '(expir|perim)' then 'expire'
    when n ~ '(termin|achev|fini|realis|solde)' then 'termine'
    when n ~ '(commenc|en cours|debut)' then 'commence'
    when n ~ '(accept|sign|valid)' and n !~ '(non|pas)' then 'signe'
    when n ~ '(attente|propos|present|emis|edit|envoy|imprim|nouveau|ouvert)' then 'presente'
    else null end;
end $function$


-- ═══ FONCTION private.tiroma_statut_rdv
CREATE OR REPLACE FUNCTION private.tiroma_statut_rdv(p text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare n text := private.tiroma_normaliser(p);
begin
  return case
    when n is null then 'prevu'
    when n ~ '(manqu|absent|absence|lapin|non venu|pas venu|no.?show|^nv$)' then 'manque'
    when n ~ '(supprim|efface)' then 'supprime'
    when n ~ '(report|deplac)' then 'reporte'
    when n ~ 'annul' then 'annule'
    when n ~ '(honor|venu|present|realis|termin|fait|effectu|arriv|en cours|fini)' then 'honore'
    when n ~ '(prevu|confirm|attente|a venir|planifi|pris|valid|^ok$|rappel|programm)' then 'prevu'
    else null end;
end $function$


-- ═══ FONCTION private.tiroma_trace_ecriture
CREATE OR REPLACE FUNCTION private.tiroma_trace_ecriture()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(current_setting('omega.tiroma_moteur', true), '') = ''
      or coalesce(nullif(current_setting('role', true), ''), 'none') not in ('service_role', 'none')
$function$


-- ═══ FONCTION private.tiroma_traiter_travaux
CREATE OR REPLACE FUNCTION private.tiroma_traiter_travaux(p_nombre integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t public.travaux;
  r jsonb;
  n_ok integer := 0;
  n_ko integer := 0;
begin
  perform set_config('omega.tiroma_moteur', 'releve', true);
  for t in
    select * from private.prendre_travaux(array['tiroma.appliquer_releve', 'tiroma.releve_en_retard'], p_nombre, interval '10 minutes', 'tiroma-sql')
  loop
    begin
      r := case t.genre
             when 'tiroma.appliquer_releve' then private.tiroma_appliquer_releve(t.charge)
             else private.tiroma_releve_en_retard(t.charge) end;
      perform private.finir_travail(t.id, r);
      n_ok := n_ok + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlerrm, 2000), true);
      n_ko := n_ko + 1;
    end;
  end loop;
  return jsonb_build_object('faits', n_ok, 'echecs', n_ko);
end $function$


-- ═══ FONCTION private.tiroma_type_devis
CREATE OR REPLACE FUNCTION private.tiroma_type_devis(p text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select case
    when private.tiroma_normaliser(p) ~ '(odf|ortho)' then 'odf'
    when private.tiroma_normaliser(p) ~ '(hors|^hn)' then 'hors_nomenclature'
    else 'conventionnel' end
$function$


-- ═══ FONCTION private.tiroma_type_par_libelle
CREATE OR REPLACE FUNCTION private.tiroma_type_par_libelle(p_client uuid, p_entite uuid, p_libelle text, p_categorie text, p_duree integer, p_quand timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v public.tiroma_types_rdv;
  f record;
begin
  if p_libelle is null then
    return null;
  end if;
  select * into v from public.tiroma_types_rdv
  where client_id = p_client and entite_id = p_entite and libelle_source = left(p_libelle, 200);
  if found then
    update public.tiroma_types_rdv
       set vu_dernier_le = p_quand,
           categorie_source = case when statut <> 'valide' then coalesce(left(p_categorie, 120), categorie_source) else categorie_source end,
           duree_defaut_min = case when statut <> 'valide' and p_duree between 5 and 600 then p_duree else duree_defaut_min end
     where id = v.id
       and (vu_dernier_le is distinct from p_quand
            or (statut <> 'valide' and (p_categorie is not null or p_duree between 5 and 600)));
    return v.id;
  end if;
  select * into f from private.tiroma_famille_par_regle(p_libelle);
  insert into public.tiroma_types_rdv (client_id, entite_id, libelle_source, categorie_source, duree_defaut_min, famille,
                                       necessite_labo, chirurgie, capacite_requise, classe_par, confiance, statut,
                                       vu_dernier_le, cree_le)
  values (p_client, p_entite, left(p_libelle, 200), left(p_categorie, 120), case when p_duree between 5 and 600 then p_duree end,
          f.famille, coalesce(f.necessite_labo, false), coalesce(f.chirurgie, false), f.capacite,
          case when f.famille is not null then 'regle' end, case when f.famille is not null then f.confiance end,
          case when f.famille is not null then 'propose' else 'a_classer' end, p_quand, p_quand)
  returning id into v.id;
  return v.id;
end $function$


-- ═══ FONCTION private.tiroma_v
CREATE OR REPLACE FUNCTION private.tiroma_v(p jsonb, p_cle text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case
    when p is null or not (p ? p_cle) or jsonb_typeof(p -> p_cle) = 'null' then null
    when jsonb_typeof(p -> p_cle) = 'string' then nullif(btrim(p ->> p_cle), '')
    else p ->> p_cle end
$function$


-- ═══ FONCTION private.tiroma_v_bool
CREATE OR REPLACE FUNCTION private.tiroma_v_bool(p jsonb, p_cle text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case
    when p is not null and jsonb_typeof(p -> p_cle) = 'boolean' then (p ->> p_cle)::boolean
    when lower(private.tiroma_v(p, p_cle)) in ('true', 'oui', 'vrai', '1', 'x', 'yes', 'o') then true
    when lower(private.tiroma_v(p, p_cle)) in ('false', 'non', 'faux', '0', 'no', 'n') then false end
$function$


-- ═══ FONCTION private.tiroma_v_date
CREATE OR REPLACE FUNCTION private.tiroma_v_date(p jsonb, p_cle text)
 RETURNS date
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case when private.tiroma_v(p, p_cle) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then left(private.tiroma_v(p, p_cle), 10)::date end
$function$


-- ═══ FONCTION private.tiroma_v_decimal
CREATE OR REPLACE FUNCTION private.tiroma_v_decimal(p jsonb, p_cle text)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case when private.tiroma_v(p, p_cle) ~ '^-?[0-9]{1,12}(\.[0-9]{1,6})?$' then private.tiroma_v(p, p_cle)::numeric end
$function$


-- ═══ FONCTION private.tiroma_v_dents
CREATE OR REPLACE FUNCTION private.tiroma_v_dents(p jsonb, p_cle text)
 RETURNS smallint[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select nullif(array(
    select distinct x::smallint as d
    from regexp_split_to_table(coalesce(private.tiroma_v(p, p_cle), ''), '[^0-9]+') x
    where x ~ '^[1-8][1-8]$' and x::smallint = any (private.tiroma_dents_fdi())
    order by d), '{}'::smallint[])
$function$


-- ═══ FONCTION private.tiroma_v_entier
CREATE OR REPLACE FUNCTION private.tiroma_v_entier(p jsonb, p_cle text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case when private.tiroma_v(p, p_cle) ~ '^-?[0-9]{1,9}([.,]0+)?$'
              then split_part(replace(private.tiroma_v(p, p_cle), ',', '.'), '.', 1)::integer end
$function$


-- ═══ FONCTION private.tiroma_v_instant
CREATE OR REPLACE FUNCTION private.tiroma_v_instant(p jsonb, p_cle text, p_fuseau text)
 RETURNS timestamp with time zone
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select case
    when private.tiroma_v(p, p_cle) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9]{2}:[0-9]{2}' then private.tiroma_v(p, p_cle)::timestamptz
    when private.tiroma_v(p, p_cle) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then (private.tiroma_v(p, p_cle)::date::timestamp) at time zone p_fuseau
  end
$function$


-- ═══ FONCTION public.tiroma_brancher_cabinet
CREATE OR REPLACE FUNCTION public.tiroma_brancher_cabinet(p_client uuid, p_entite uuid, p_voie text DEFAULT 'exports'::text, p_libelle text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.tiroma_brancher_cabinet(p_client, p_entite, p_voie, p_libelle)
$function$


-- ═══ FONCTION public.tiroma_changer_mode
CREATE OR REPLACE FUNCTION public.tiroma_changer_mode(p_client uuid, p_entite uuid, p_mode text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.tiroma_changer_mode(p_client, p_entite, p_mode)
$function$


-- ═══ FONCTION public.tiroma_installer_cabinet
CREATE OR REPLACE FUNCTION public.tiroma_installer_cabinet(p_client uuid, p_entite uuid, p_logiciel text, p_perimetre text DEFAULT 'cabinet'::text, p_logiciel_version text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.tiroma_installer_cabinet(p_client, p_entite, p_logiciel, p_perimetre, p_logiciel_version)
$function$



-- ══════════════════ CRONS ══════════════════

-- ═══ CRON tiroma-horloge [*/10 * * * *] select private.tiroma_horloge()

-- ═══ CRON tiroma-purge [37 3 * * *] select private.tiroma_purger()

-- ═══ CRON tiroma-releves [* * * * *] select private.tiroma_traiter_travaux()
