-- Extraits du socle Omega pour Tamila (cabinets d avocats, délais, dossiers chiffrés) — préfixe tamila_
-- Recette ygwbgpowzlbdaajlsqkn, photographie du 5 octobre 2026, 22 h 30, par le coordinateur.
-- Ce fichier NE S'EXÉCUTE PAS : il sert à écrire des « create or replace », des écrans et des tests.
-- Les ouvriers n'appellent jamais Supabase ; ce qui manque ici se demande au coordinateur.
-- Contenu : 13 tables, 1 vues, 110 fonctions, 3 crons.


-- ══════════════════ TABLES ══════════════════

-- ═══ TABLE public.tamila_appels
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  dossier_id uuid not null
  introduit_le date not null
  regime text not null default 
CASE
    WHEN (introduit_le >= '2024-09-01'::date) THEN 'cpc'::text
    ELSE 'cpc2017'::text
END
  procedure text not null default 'a_orienter'::text
  role_client text not null
  territoire text not null
  cloture_previsible_le date
  cree_le timestamp with time zone not null default now()
  cree_par uuid
  maj_le timestamp with time zone not null default now()
  constraint tamila_appels_client_id_dossier_id_fkey FOREIGN KEY (client_id, dossier_id) REFERENCES tamila_dossiers(client_id, id) ON DELETE CASCADE
  constraint tamila_appels_client_id_id_key UNIQUE (client_id, id)
  constraint tamila_appels_introduit_le_check CHECK ((introduit_le >= '2017-09-01'::date))
  constraint tamila_appels_pkey PRIMARY KEY (id)
  constraint tamila_appels_procedure_check CHECK ((procedure = ANY (ARRAY['a_orienter'::text, 'mise_en_etat'::text, 'bref_delai'::text])))
  constraint tamila_appels_role_client_check CHECK ((role_client = ANY (ARRAY['appelant'::text, 'intime'::text, 'intervenant_force'::text, 'intervenant_volontaire'::text])))
  constraint tamila_appels_territoire_check CHECK ((territoire = ANY (ARRAY['metropole'::text, 'alsace-moselle'::text, 'guadeloupe'::text, 'martinique'::text, 'guyane'::text, 'la-reunion'::text, 'mayotte'::text, 'saint-barthelemy'::text, 'saint-martin'::text, 'saint-pierre-et-miquelon'::text])))
  constraint tamila_appels_territoire_fkey FOREIGN KEY (territoire) REFERENCES territoires(code)
  constraint tamila_appels_un_par_dossier UNIQUE (dossier_id)
  policy "on lit l'appel des dossiers qu'on voit" SELECT to authenticated using (private.tamila_voit_dossier_pour(( SELECT auth.uid() AS uid), client_id, (dossier_id)::text)) with check ()
  CREATE TRIGGER tamila_appels_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tamila_appels FOR EACH ROW EXECUTE FUNCTION private.tracer('+dossier_id', '+introduit_le', '+regime', '+procedure', '+role_client', '+territoire', '+cloture_previsible_le')
  grants authenticated: SELECT

-- ═══ TABLE public.tamila_audiences
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  dossier_id uuid not null
  avis_id uuid
  date_heure timestamp with time zone not null
  heure_connue boolean not null default true
  nature text not null
  juridiction text
  chambre text
  avocat_id uuid
  statut text not null default 'prevue'::text
  renvoyee_a uuid
  source text not null
  cree_le timestamp with time zone not null default now()
  cree_par uuid
  maj_le timestamp with time zone not null default now()
  constraint tamila_audiences_avis_id_fkey FOREIGN KEY (avis_id) REFERENCES tamila_avis(id) ON DELETE SET NULL
  constraint tamila_audiences_avocat_fkey FOREIGN KEY (avocat_id, client_id) REFERENCES comptes(user_id, client_id) ON DELETE SET NULL (avocat_id)
  constraint tamila_audiences_chambre_check CHECK (((char_length(chambre) >= 1) AND (char_length(chambre) <= 120)))
  constraint tamila_audiences_client_id_dossier_id_fkey FOREIGN KEY (client_id, dossier_id) REFERENCES tamila_dossiers(client_id, id) ON DELETE CASCADE
  constraint tamila_audiences_client_id_id_key UNIQUE (client_id, id)
  constraint tamila_audiences_juridiction_check CHECK (((char_length(juridiction) >= 1) AND (char_length(juridiction) <= 120)))
  constraint tamila_audiences_nature_check CHECK ((nature = ANY (ARRAY['plaidoiries'::text, 'mise_en_etat'::text, 'orientation'::text, 'reglement_amiable'::text, 'audience'::text])))
  constraint tamila_audiences_pkey PRIMARY KEY (id)
  constraint tamila_audiences_renvoyee_a_fkey FOREIGN KEY (renvoyee_a) REFERENCES tamila_audiences(id) ON DELETE SET NULL
  constraint tamila_audiences_source_check CHECK ((source = ANY (ARRAY['avis'::text, 'agenda'::text, 'saisie'::text])))
  constraint tamila_audiences_statut_check CHECK ((statut = ANY (ARRAY['prevue'::text, 'renvoyee'::text, 'tenue'::text, 'annulee'::text])))
  policy "on lit les audiences des dossiers qu'on voit" SELECT to authenticated using (private.tamila_voit_dossier_pour(( SELECT auth.uid() AS uid), client_id, (dossier_id)::text)) with check ()
  CREATE TRIGGER tamila_audiences_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tamila_audiences FOR EACH ROW EXECUTE FUNCTION private.tracer('+dossier_id', '+date_heure', '+nature', '+statut', '+avocat_id', '+source', '+renvoyee_a')
  grants authenticated: SELECT

-- ═══ TABLE public.tamila_avis
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  dossier_id uuid not null
  piece_id uuid
  type_avis text not null
  date_avis date not null
  date_audience timestamp with time zone
  heure_audience_connue boolean
  date_cloture_previsible date
  date_limite date
  partie_visee text
  rang smallint
  depose_le timestamp with time zone
  confiance text not null
  rg_concorde boolean
  statut text not null default 'lu'::text
  effet text
  cree_le timestamp with time zone not null default now()
  cree_par uuid
  constraint tamila_avis_client_id_dossier_id_fkey FOREIGN KEY (client_id, dossier_id) REFERENCES tamila_dossiers(client_id, id) ON DELETE CASCADE
  constraint tamila_avis_client_id_id_key UNIQUE (client_id, id)
  constraint tamila_avis_confiance_check CHECK ((confiance = ANY (ARRAY['gabarit'::text, 'modele'::text, 'saisie'::text])))
  constraint tamila_avis_effet_check CHECK ((effet ~ '^[a-z][a-z_]{2,40}$'::text))
  constraint tamila_avis_partie_visee_check CHECK ((partie_visee = ANY (ARRAY['appelant'::text, 'intime'::text, 'intervenant'::text])))
  constraint tamila_avis_pkey PRIMARY KEY (id)
  constraint tamila_avis_rang_check CHECK (((rang >= 1) AND (rang <= 99)))
  constraint tamila_avis_statut_check CHECK ((statut = ANY (ARRAY['lu'::text, 'applique'::text, 'sans_effet'::text, 'a_rattacher'::text, 'a_verifier'::text])))
  constraint tamila_avis_type_avis_check CHECK ((type_avis = ANY (ARRAY['rpva_avis_fixation'::text, 'rpva_avis_902'::text, 'rpva_declaration_appel'::text, 'rpva_conclusions'::text, 'rpva_appel_incident'::text, 'rpva_intervention'::text, 'rpva_ordonnance_mee'::text, 'rpva_avis_audience'::text, 'rpva_accuse_depot'::text, 'rpva_interruption'::text])))
  policy "on lit les avis des dossiers qu'on voit" SELECT to authenticated using (private.tamila_voit_dossier_pour(( SELECT auth.uid() AS uid), client_id, (dossier_id)::text)) with check ()
  CREATE TRIGGER tamila_avis_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tamila_avis FOR EACH ROW EXECUTE FUNCTION private.tracer('+dossier_id', '+piece_id', '+type_avis', '+date_avis', '+date_audience', '+date_cloture_previsible', '+date_limite', '+partie_visee', '+rang', '+depose_le', '+confiance', '+rg_concorde', '+statut', '+effet')
  grants authenticated: SELECT

-- ═══ TABLE public.tamila_cles
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  dossier_id uuid not null
  fournisseur text not null
  reference text not null
  enveloppe bytea not null
  algorithme text not null default 'aes-256-gcm'::text
  statut text not null default 'active'::text
  creee_le timestamp with time zone not null default now()
  desactivee_le timestamp with time zone
  destruction_prevue_le timestamp with time zone
  detruite_le timestamp with time zone
  preuve jsonb
  constraint tamila_cles_algorithme_check CHECK ((algorithme = 'aes-256-gcm'::text))
  constraint tamila_cles_client_id_dossier_id_fkey FOREIGN KEY (client_id, dossier_id) REFERENCES tamila_dossiers(client_id, id) ON DELETE CASCADE
  constraint tamila_cles_dossier_id_key UNIQUE (dossier_id)
  constraint tamila_cles_enveloppe_check CHECK (((octet_length(enveloppe) >= 16) AND (octet_length(enveloppe) <= 4096)))
  constraint tamila_cles_fournisseur_check CHECK ((fournisseur = ANY (ARRAY['local'::text, 'scaleway'::text])))
  constraint tamila_cles_pkey PRIMARY KEY (id)
  constraint tamila_cles_reference_check CHECK ((reference ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$'::text))
  constraint tamila_cles_statut_check CHECK ((statut = ANY (ARRAY['active'::text, 'desactivee'::text, 'detruite'::text])))
  policy "les associes lisent l'etat des cles" SELECT to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check ()
  CREATE TRIGGER tamila_cles_garder BEFORE DELETE OR UPDATE ON public.tamila_cles FOR EACH ROW EXECUTE FUNCTION private.tamila_garder_cle()
  CREATE TRIGGER tamila_cles_tracer AFTER INSERT OR UPDATE ON public.tamila_cles FOR EACH ROW EXECUTE FUNCTION private.tracer('+dossier_id', '+fournisseur', '+statut', '+desactivee_le', '+destruction_prevue_le', '+detruite_le')
  grants authenticated: SELECT

-- ═══ TABLE public.tamila_delais
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  dossier_id uuid not null
  appel_id uuid
  avis_id uuid
  delai_id uuid not null
  nature text not null
  regle_code text
  regle_version smallint
  acte text not null
  depart date
  territoire text not null
  residence text
  augmentation_mois smallint not null default 0
  motif_augmentation text
  echeance_calculee date
  echeance_retenue date not null
  raisons text[] not null default '{}'::text[]
  calcul jsonb
  source_date text
  statut text not null default 'a_confirmer'::text
  demande_id uuid
  confirme_par uuid
  confirme_le timestamp with time zone
  confirmation text
  motif_correction text
  responsable_id uuid
  interrompu_le date
  motif_interruption text
  acte_depose_le date
  motif_cloture text
  preuve_piece_id uuid
  clos_par uuid
  clos_le timestamp with time zone
  motif_annulation text
  annule_par uuid
  annule_le timestamp with time zone
  depasse_le timestamp with time zone
  relance_48h_le timestamp with time zone
  relance_j8_le timestamp with time zone
  cree_le timestamp with time zone not null default now()
  cree_par uuid
  maj_le timestamp with time zone not null default now()
  constraint tamila_delais_acte_check CHECK ((acte = ANY (ARRAY['signifier_declaration'::text, 'conclure'::text, 'signifier_conclusions'::text, 'autre'::text])))
  constraint tamila_delais_annule CHECK (((statut <> 'annule'::text) OR ((annule_le IS NOT NULL) AND (annule_par IS NOT NULL) AND (motif_annulation IS NOT NULL))))
  constraint tamila_delais_appel_id_fkey FOREIGN KEY (appel_id) REFERENCES tamila_appels(id) ON DELETE SET NULL
  constraint tamila_delais_augmentation_mois_check CHECK (((augmentation_mois >= 0) AND (augmentation_mois <= 2)))
  constraint tamila_delais_avis_id_fkey FOREIGN KEY (avis_id) REFERENCES tamila_avis(id) ON DELETE SET NULL
  constraint tamila_delais_calcul CHECK (((nature <> 'regle'::text) OR ((depart IS NOT NULL) AND (echeance_calculee IS NOT NULL) AND (residence IS NOT NULL) AND (motif_augmentation IS NOT NULL))))
  constraint tamila_delais_client_id_delai_id_fkey FOREIGN KEY (client_id, delai_id) REFERENCES delais(client_id, id) ON DELETE CASCADE
  constraint tamila_delais_client_id_dossier_id_fkey FOREIGN KEY (client_id, dossier_id) REFERENCES tamila_dossiers(client_id, id) ON DELETE CASCADE
  constraint tamila_delais_client_id_id_key UNIQUE (client_id, id)
  constraint tamila_delais_clos CHECK (((statut <> 'clos'::text) OR ((clos_le IS NOT NULL) AND (acte_depose_le IS NOT NULL) AND (motif_cloture IS NOT NULL) AND ((motif_cloture <> 'accuse_rpva'::text) OR (preuve_piece_id IS NOT NULL)) AND ((motif_cloture <> 'declaration'::text) OR (clos_par IS NOT NULL)))))
  constraint tamila_delais_confirmation_check CHECK ((confirmation = ANY (ARRAY['approbation'::text, 'modification'::text, 'saisie'::text])))
  constraint tamila_delais_confirme CHECK (((statut <> 'confirme'::text) OR ((confirme_par IS NOT NULL) AND (confirme_le IS NOT NULL) AND (confirmation IS NOT NULL))))
  constraint tamila_delais_date_fixee CHECK (((nature <> 'date_fixee'::text) OR (source_date IS NOT NULL)))
  constraint tamila_delais_interrompu CHECK (((statut <> 'interrompu'::text) OR ((interrompu_le IS NOT NULL) AND (motif_interruption IS NOT NULL))))
  constraint tamila_delais_motif_annulation_check CHECK ((motif_annulation = ANY (ARRAY['desistement'::text, 'caducite_prononcee'::text, 'irrecevabilite_prononcee'::text, 'radiation'::text, 'procedure_changee'::text, 'erreur'::text, 'doublon'::text, 'autre'::text])))
  constraint tamila_delais_motif_augmentation_check CHECK ((motif_augmentation = ANY (ARRAY['aucune'::text, 'non_augmentable'::text, 'outre_mer_devant_metropole'::text, 'hors_collectivite'::text, 'etranger'::text, 'etranger_devant_outre_mer'::text, 'domicile_inconnu'::text])))
  constraint tamila_delais_motif_cloture_check CHECK ((motif_cloture = ANY (ARRAY['accuse_rpva'::text, 'declaration'::text])))
  constraint tamila_delais_motif_correction_check CHECK ((motif_correction = ANY (ARRAY['calcul_errone'::text, 'date_notifiee'::text, 'delai_modifie_par_le_juge'::text, 'reprise_apres_interruption'::text, 'autre'::text])))
  constraint tamila_delais_motif_interruption_check CHECK ((motif_interruption = ANY (ARRAY['mediation'::text, 'conciliation'::text, 'procedure_participative'::text, 'mise_en_etat_simplifiee'::text, 'audience_reglement_amiable'::text, 'a_preciser'::text])))
  constraint tamila_delais_nature_check CHECK ((nature = ANY (ARRAY['regle'::text, 'date_fixee'::text])))
  constraint tamila_delais_pkey PRIMARY KEY (id)
  constraint tamila_delais_raisons_check CHECK ((raisons <@ ARRAY['domicile_inconnu'::text, 'fin_de_mois_augmentation'::text, 'etranger_devant_outre_mer'::text, 'type_propose_par_modele'::text, 'rg_non_verifie'::text, 'rang_a_verifier'::text, 'procedure_changee'::text]))
  constraint tamila_delais_regle CHECK ((((nature = 'regle'::text) = (regle_code IS NOT NULL)) AND ((regle_code IS NULL) = (regle_version IS NULL))))
  constraint tamila_delais_regle_code_regle_version_fkey FOREIGN KEY (regle_code, regle_version) REFERENCES regles_delais(code, version)
  constraint tamila_delais_residence_check CHECK ((residence = ANY (ARRAY['metropole'::text, 'alsace-moselle'::text, 'guadeloupe'::text, 'martinique'::text, 'guyane'::text, 'la-reunion'::text, 'mayotte'::text, 'saint-barthelemy'::text, 'saint-martin'::text, 'saint-pierre-et-miquelon'::text, 'nouvelle-caledonie'::text, 'polynesie-francaise'::text, 'wallis-et-futuna'::text, 'taaf'::text, 'etranger'::text, 'inconnue'::text])))
  constraint tamila_delais_source_date_check CHECK ((source_date = ANY (ARRAY['calendrier_de_procedure'::text, 'ordonnance'::text, 'avis'::text, 'saisie'::text])))
  constraint tamila_delais_statut_check CHECK ((statut = ANY (ARRAY['a_confirmer'::text, 'confirme'::text, 'rejete'::text, 'interrompu'::text, 'clos'::text, 'annule'::text])))
  constraint tamila_delais_territoire_fkey FOREIGN KEY (territoire) REFERENCES territoires(code)
  constraint tamila_delais_un_delai_de_b5 UNIQUE (delai_id)
  policy "on lit les delais des dossiers qu'on voit" SELECT to authenticated using (private.tamila_voit_dossier_pour(( SELECT auth.uid() AS uid), client_id, (dossier_id)::text)) with check ()
  CREATE TRIGGER tamila_delais_garder BEFORE DELETE OR UPDATE ON public.tamila_delais FOR EACH ROW EXECUTE FUNCTION private.tamila_garder_delai()
  CREATE TRIGGER tamila_delais_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tamila_delais FOR EACH ROW EXECUTE FUNCTION private.tracer('+dossier_id', '+delai_id', '+nature', '+regle_code', '+regle_version', '+acte', '+depart', '+territoire', '+augmentation_mois', '+motif_augmentation', '+echeance_calculee', '+echeance_retenue', '+raisons', '+statut', '+demande_id', '+confirme_par', '+confirmation', '+motif_correction', '+interrompu_le', '+motif_interruption', '+acte_depose_le', '+motif_cloture', '+preuve_piece_id', '+clos_par', '+motif_annulation', '+annule_par', '+depasse_le')
  grants authenticated: SELECT

-- ═══ TABLE public.tamila_dossiers
  id uuid not null
  client_id uuid not null
  entite_id uuid not null
  reference_chiffree bytea
  intitule_chiffre bytea
  numero_rg_chiffre bytea
  matiere text
  juridiction text
  territoire text
  mode text not null default 'contentieux'::text
  statut text not null
  perso boolean not null default false
  proprietaire_perso uuid
  responsable_id uuid
  cree_le timestamp with time zone not null default now()
  cree_par uuid
  demande_ouverture_id uuid
  ouvert_le timestamp with time zone
  ouvert_par uuid
  audit_fin_le timestamp with time zone
  clos_le timestamp with time zone
  demande_cloture_id uuid
  statut_avant_cloture text
  effacement_prevu_le timestamp with time zone
  efface_le timestamp with time zone
  motif_effacement text
  constraint tamila_dossiers_audit CHECK (((statut <> 'audit'::text) OR (audit_fin_le IS NOT NULL)))
  constraint tamila_dossiers_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint tamila_dossiers_client_id_id_key UNIQUE (client_id, id)
  constraint tamila_dossiers_contenu CHECK ((((statut = 'efface'::text) = ((reference_chiffree IS NULL) AND (intitule_chiffre IS NULL))) AND ((statut <> 'efface'::text) OR ((numero_rg_chiffre IS NULL) AND (juridiction IS NULL)))))
  constraint tamila_dossiers_entite_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id)
  constraint tamila_dossiers_intitule_chiffre_check CHECK (private.tamila_chiffre_valide(intitule_chiffre))
  constraint tamila_dossiers_juridiction_check CHECK (((char_length(juridiction) >= 1) AND (char_length(juridiction) <= 120)))
  constraint tamila_dossiers_matiere_check CHECK ((matiere ~ '^[a-z][a-z0-9_]{1,40}$'::text))
  constraint tamila_dossiers_mode_check CHECK ((mode = ANY (ARRAY['contentieux'::text, 'dommage_corporel'::text])))
  constraint tamila_dossiers_motif_effacement_check CHECK ((motif_effacement = ANY (ARRAY['cloture'::text, 'fin_audit'::text, 'ouverture_refusee'::text])))
  constraint tamila_dossiers_numero_rg_chiffre_check CHECK (private.tamila_chiffre_valide(numero_rg_chiffre))
  constraint tamila_dossiers_perso CHECK ((perso = (proprietaire_perso IS NOT NULL)))
  constraint tamila_dossiers_pkey PRIMARY KEY (id)
  constraint tamila_dossiers_proprietaire_fkey FOREIGN KEY (proprietaire_perso, client_id) REFERENCES comptes(user_id, client_id)
  constraint tamila_dossiers_reference_chiffree_check CHECK (private.tamila_chiffre_valide(reference_chiffree))
  constraint tamila_dossiers_responsable_fkey FOREIGN KEY (responsable_id, client_id) REFERENCES comptes(user_id, client_id) ON DELETE SET NULL (responsable_id)
  constraint tamila_dossiers_statut_avant_cloture_check CHECK ((statut_avant_cloture = ANY (ARRAY['ouvert'::text, 'audit'::text])))
  constraint tamila_dossiers_statut_check CHECK ((statut = ANY (ARRAY['attente'::text, 'ouvert'::text, 'audit'::text, 'clos'::text, 'efface'::text, 'refuse'::text])))
  constraint tamila_dossiers_territoire_fkey FOREIGN KEY (territoire) REFERENCES territoires(code)
  policy "on lit les dossiers qu'on voit" SELECT to authenticated using (private.tamila_voit_dossier_pour(( SELECT auth.uid() AS uid), client_id, (id)::text)) with check ()
  CREATE TRIGGER tamila_dossiers_garder BEFORE DELETE ON public.tamila_dossiers FOR EACH ROW EXECUTE FUNCTION private.tamila_garder_dossier()
  CREATE TRIGGER tamila_dossiers_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tamila_dossiers FOR EACH ROW EXECUTE FUNCTION private.tracer('+entite_id', '+matiere', '+territoire', '+mode', '+statut', '+perso', '+proprietaire_perso', '+responsable_id', '+demande_ouverture_id', '+ouvert_le', '+ouvert_par', '+audit_fin_le', '+clos_le', '+demande_cloture_id', '+effacement_prevu_le', '+efface_le', '+motif_effacement')
  grants authenticated: SELECT

-- ═══ TABLE public.tamila_dossiers_membres
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  dossier_id uuid not null
  user_id uuid not null
  role_dossier text not null
  jusqu_au timestamp with time zone
  ajoute_par uuid
  ajoute_le timestamp with time zone not null default now()
  constraint tamila_dossiers_membres_client_id_dossier_id_fkey FOREIGN KEY (client_id, dossier_id) REFERENCES tamila_dossiers(client_id, id) ON DELETE CASCADE
  constraint tamila_dossiers_membres_pkey PRIMARY KEY (id)
  constraint tamila_dossiers_membres_role_dossier_check CHECK ((role_dossier = ANY (ARRAY['responsable'::text, 'intervenant'::text, 'lecteur'::text])))
  constraint tamila_dossiers_membres_une_fois UNIQUE (dossier_id, user_id)
  constraint tamila_dossiers_membres_user_id_client_id_fkey FOREIGN KEY (user_id, client_id) REFERENCES comptes(user_id, client_id) ON DELETE CASCADE
  policy "on lit les membres des dossiers qu'on voit" SELECT to authenticated using (private.tamila_voit_dossier_pour(( SELECT auth.uid() AS uid), client_id, (dossier_id)::text)) with check ()
  CREATE TRIGGER tamila_dossiers_membres_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tamila_dossiers_membres FOR EACH ROW EXECUTE FUNCTION private.tracer('+dossier_id', '+user_id', '+role_dossier', '+jusqu_au', '+ajoute_par')
  grants authenticated: SELECT

-- ═══ TABLE public.tamila_effacements
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  dossier_id uuid not null
  motif text not null
  demande_id uuid
  effacement_objet_id uuid
  efface_le timestamp with time zone not null default now()
  pieces integer not null
  pages integer not null
  octets bigint not null
  fichiers integer not null
  empreinte_fichiers text
  empreinte_export text
  constraint tamila_effacements_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint tamila_effacements_empreinte_export_check CHECK ((empreinte_export ~ '^[0-9a-f]{64}$'::text))
  constraint tamila_effacements_empreinte_fichiers_check CHECK ((empreinte_fichiers ~ '^[0-9a-f]{64}$'::text))
  constraint tamila_effacements_fichiers_check CHECK ((fichiers >= 0))
  constraint tamila_effacements_motif_check CHECK ((motif = ANY (ARRAY['cloture'::text, 'fin_audit'::text, 'ouverture_refusee'::text])))
  constraint tamila_effacements_octets_check CHECK ((octets >= 0))
  constraint tamila_effacements_pages_check CHECK ((pages >= 0))
  constraint tamila_effacements_pieces_check CHECK ((pieces >= 0))
  constraint tamila_effacements_pkey PRIMARY KEY (id)
  constraint tamila_effacements_une_fois UNIQUE (dossier_id)
  policy "les associes lisent les preuves d'effacement" SELECT to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check ()
  CREATE TRIGGER tamila_effacements_immuables BEFORE DELETE OR UPDATE ON public.tamila_effacements FOR EACH ROW EXECUTE FUNCTION private.tamila_preuves_immuables()
  CREATE TRIGGER tamila_effacements_tracer AFTER INSERT ON public.tamila_effacements FOR EACH ROW EXECUTE FUNCTION private.tracer('+dossier_id', '+motif', '+demande_id', '+pieces', '+pages', '+octets', '+fichiers', '+empreinte_fichiers', '+empreinte_export')
  grants authenticated: SELECT

-- ═══ TABLE public.tamila_exports
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  dossier_id uuid
  demande_par uuid not null
  statut text not null default 'a_preparer'::text
  chemin text
  octets bigint
  empreinte_manifeste text
  motif_echec text
  cree_le timestamp with time zone not null default now()
  pret_le timestamp with time zone
  expire_le timestamp with time zone
  telecharge_le timestamp with time zone
  telechargements integer not null default 0
  purge_le timestamp with time zone
  constraint tamila_exports_chemin_check CHECK (((char_length(chemin) >= 1) AND (char_length(chemin) <= 1024)))
  constraint tamila_exports_client_id_dossier_id_fkey FOREIGN KEY (client_id, dossier_id) REFERENCES tamila_dossiers(client_id, id) ON DELETE CASCADE
  constraint tamila_exports_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint tamila_exports_empreinte_manifeste_check CHECK ((empreinte_manifeste ~ '^[0-9a-f]{64}$'::text))
  constraint tamila_exports_motif_echec_check CHECK ((motif_echec ~ '^[a-z][a-z0-9_]{1,60}$'::text))
  constraint tamila_exports_octets_check CHECK ((octets >= 0))
  constraint tamila_exports_pkey PRIMARY KEY (id)
  constraint tamila_exports_statut_check CHECK ((statut = ANY (ARRAY['a_preparer'::text, 'pret'::text, 'expire'::text, 'echec'::text])))
  constraint tamila_exports_telechargements_check CHECK ((telechargements >= 0))
  policy "on lit les exports des dossiers qu'on voit" SELECT to authenticated using ((((dossier_id IS NULL) AND private.a_un_role(client_id, ARRAY['gerant'::text])) OR ((dossier_id IS NOT NULL) AND private.tamila_voit_dossier_pour(( SELECT auth.uid() AS uid), client_id, (dossier_id)::text)))) with check ()
  CREATE TRIGGER tamila_exports_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tamila_exports FOR EACH ROW EXECUTE FUNCTION private.tracer('+dossier_id', '+statut', '+demande_par', '+octets', '+empreinte_manifeste', '+expire_le', '+telecharge_le', '+telechargements', '+purge_le', '+motif_echec')
  grants authenticated: SELECT

-- ═══ TABLE public.tamila_murailles
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  dossier_id uuid not null
  user_id uuid not null
  motif_chiffre bytea
  pose_par uuid not null
  pose_le timestamp with time zone not null default now()
  leve_le timestamp with time zone
  leve_par uuid
  demande_levee_id uuid
  constraint tamila_murailles_client_id_dossier_id_fkey FOREIGN KEY (client_id, dossier_id) REFERENCES tamila_dossiers(client_id, id) ON DELETE CASCADE
  constraint tamila_murailles_motif_chiffre_check CHECK (private.tamila_chiffre_valide(motif_chiffre))
  constraint tamila_murailles_pkey PRIMARY KEY (id)
  constraint tamila_murailles_user_id_client_id_fkey FOREIGN KEY (user_id, client_id) REFERENCES comptes(user_id, client_id) ON DELETE CASCADE
  policy "la personne ecartee et les associes lisent les murailles" SELECT to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) OR (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]) AND private.tamila_voit_dossier_pour(( SELECT auth.uid() AS uid), client_id, (dossier_id)::text)))) with check ()
  CREATE TRIGGER tamila_murailles_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tamila_murailles FOR EACH ROW EXECUTE FUNCTION private.tracer('+dossier_id', '+user_id', '+pose_par', '+leve_le', '+leve_par', '+demande_levee_id')
  grants authenticated: SELECT

-- ═══ TABLE public.tamila_parties
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  dossier_id uuid not null
  nom_chiffre bytea not null
  qualite text not null
  role_procedure text
  residence text not null default 'inconnue'::text
  courriels_chiffres bytea
  cree_le timestamp with time zone not null default now()
  cree_par uuid
  constraint tamila_parties_client_id_dossier_id_fkey FOREIGN KEY (client_id, dossier_id) REFERENCES tamila_dossiers(client_id, id) ON DELETE CASCADE
  constraint tamila_parties_courriels_chiffres_check CHECK (private.tamila_chiffre_valide(courriels_chiffres))
  constraint tamila_parties_nom_chiffre_check CHECK (private.tamila_chiffre_valide(nom_chiffre))
  constraint tamila_parties_pkey PRIMARY KEY (id)
  constraint tamila_parties_qualite_check CHECK ((qualite = ANY (ARRAY['client'::text, 'adverse'::text, 'confrere_adverse'::text, 'expert'::text, 'juridiction'::text, 'tiers'::text])))
  constraint tamila_parties_residence_check CHECK ((residence = ANY (ARRAY['metropole'::text, 'alsace-moselle'::text, 'guadeloupe'::text, 'martinique'::text, 'guyane'::text, 'la-reunion'::text, 'mayotte'::text, 'saint-barthelemy'::text, 'saint-martin'::text, 'saint-pierre-et-miquelon'::text, 'nouvelle-caledonie'::text, 'polynesie-francaise'::text, 'wallis-et-futuna'::text, 'taaf'::text, 'etranger'::text, 'inconnue'::text])))
  constraint tamila_parties_role_procedure_check CHECK ((role_procedure = ANY (ARRAY['appelant'::text, 'intime'::text, 'intervenant_force'::text, 'intervenant_volontaire'::text])))
  policy "on lit les parties apres une lecture tracee" SELECT to authenticated using (private.tamila_lit_dossier_pour(( SELECT auth.uid() AS uid), client_id, (dossier_id)::text)) with check ()
  CREATE TRIGGER tamila_parties_tracer AFTER INSERT OR DELETE OR UPDATE ON public.tamila_parties FOR EACH ROW EXECUTE FUNCTION private.tracer('+dossier_id', '+qualite', '+role_procedure', '+residence')
  grants authenticated: SELECT

-- ═══ TABLE public.tamila_reglages
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  delai_cloture_jours smallint not null default 7
  conservation_audit_jours smallint not null default 30
  conservation_exports_jours smallint not null default 7
  maj_le timestamp with time zone not null default now()
  constraint tamila_reglages_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint tamila_reglages_client_id_key UNIQUE (client_id)
  constraint tamila_reglages_conservation_audit_jours_check CHECK (((conservation_audit_jours >= 0) AND (conservation_audit_jours <= 90)))
  constraint tamila_reglages_conservation_exports_jours_check CHECK (((conservation_exports_jours >= 1) AND (conservation_exports_jours <= 30)))
  constraint tamila_reglages_delai_cloture_jours_check CHECK (((delai_cloture_jours >= 0) AND (delai_cloture_jours <= 30)))
  constraint tamila_reglages_pkey PRIMARY KEY (id)
  policy "le gerant regle tamila" UPDATE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text])) with check (private.a_un_role(client_id, ARRAY['gerant'::text]))
  policy "membres lisent les reglages de tamila" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER tamila_reglages_tracer AFTER INSERT OR UPDATE ON public.tamila_reglages FOR EACH ROW EXECUTE FUNCTION private.tracer('+delai_cloture_jours', '+conservation_audit_jours', '+conservation_exports_jours')
  grants authenticated: SELECT,UPDATE

-- ═══ TABLE public.tamila_regles_procedure
  code text not null
  regime text not null
  evenement text not null
  procedures text[] not null
  partie text not null
  acte text not null
  augmentable boolean not null
  interruptible boolean not null
  sanction text not null
  article text not null
  libelle_court text not null
  constraint tamila_regles_procedure_acte_check CHECK ((acte = ANY (ARRAY['signifier_declaration'::text, 'conclure'::text, 'signifier_conclusions'::text])))
  constraint tamila_regles_procedure_article_check CHECK (((char_length(article) >= 3) AND (char_length(article) <= 40)))
  constraint tamila_regles_procedure_code_check CHECK ((code ~ '^tamila\.cpc(2017)?\.[a-z0-9_.]{3,60}$'::text))
  constraint tamila_regles_procedure_evenement_check CHECK ((evenement = ANY (ARRAY['avis_signifier_declaration'::text, 'declaration_appel'::text, 'avis_fixation_bref_delai'::text, 'notification_conclusions_appelant'::text, 'notification_appel_incident'::text, 'notification_intervention_forcee'::text, 'intervention_volontaire'::text, 'expiration_delai_conclure'::text])))
  constraint tamila_regles_procedure_libelle_court_check CHECK (((char_length(libelle_court) >= 3) AND (char_length(libelle_court) <= 80)))
  constraint tamila_regles_procedure_partie_check CHECK ((partie = ANY (ARRAY['appelant'::text, 'intime'::text, 'intervenant_force'::text, 'intervenant_volontaire'::text, 'destinataire'::text, 'toutes'::text])))
  constraint tamila_regles_procedure_pkey PRIMARY KEY (code)
  constraint tamila_regles_procedure_procedures_check CHECK (((cardinality(procedures) > 0) AND (procedures <@ ARRAY['a_orienter'::text, 'mise_en_etat'::text, 'bref_delai'::text])))
  constraint tamila_regles_procedure_regime CHECK (((regime = 'cpc2017'::text) = (code ~~ 'tamila.cpc2017.%'::text)))
  constraint tamila_regles_procedure_regime_check CHECK ((regime = ANY (ARRAY['cpc'::text, 'cpc2017'::text])))
  constraint tamila_regles_procedure_sanction_check CHECK ((sanction = ANY (ARRAY['caducite'::text, 'irrecevabilite'::text, 'selon_la_partie'::text])))
  policy "les regles de procedure se lisent par tous" SELECT to authenticated using (true) with check ()

  grants authenticated: SELECT


-- ══════════════════ VUES ══════════════════

-- ═══ VUE public.tamila_registre
 SELECT id,
    client_id,
    reference_chiffree,
    statut,
    mode,
    ouvert_le,
    effacement_prevu_le,
    private.tamila_lieu_conservation() AS lieu_conservation
   FROM tamila_dossiers d
  WHERE statut = ANY (ARRAY['attente'::text, 'ouvert'::text, 'audit'::text, 'clos'::text]);


-- ══════════════════ FONCTIONS (public et private, telles quelles) ══════════════════

-- ═══ FONCTION private.tamila_ajouter_audience
CREATE OR REPLACE FUNCTION private.tamila_ajouter_audience(p_dossier uuid, p_date_heure timestamp with time zone, p_nature text DEFAULT 'audience'::text, p_juridiction text DEFAULT NULL::text, p_chambre text DEFAULT NULL::text, p_avocat uuid DEFAULT NULL::uuid, p_heure_connue boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_id uuid;
begin
  v_d := private.tamila_dossier_ecrit(p_dossier, false);
  if p_date_heure is null then
    raise exception 'La date de l''audience est nécessaire.' using errcode = '22023';
  end if;
  if p_avocat is not null and not private.tamila_est_avocat(p_avocat, v_d.client_id) then
    raise exception 'L''avocat de l''audience est un avocat du cabinet.' using errcode = '22023';
  end if;
  insert into public.tamila_audiences (client_id, dossier_id, date_heure, heure_connue, nature, juridiction, chambre, avocat_id,
                                       source, cree_par)
  values (v_d.client_id, p_dossier, p_date_heure, coalesce(p_heure_connue, true), coalesce(p_nature, 'audience'),
          coalesce(p_juridiction, v_d.juridiction), p_chambre, p_avocat, case when v_uid is null then 'agenda' else 'saisie' end, v_uid)
  returning id into v_id;
  return v_id;
end $function$


-- ═══ FONCTION private.tamila_ajouter_membre
CREATE OR REPLACE FUNCTION private.tamila_ajouter_membre(p_dossier uuid, p_user uuid, p_role text DEFAULT 'intervenant'::text, p_jusqu_au timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_role_cible text;
begin
  select * into v_d from public.tamila_dossiers where id = p_dossier for update;
  if v_uid is null or not found or not private.tamila_voit_dossier_pour(v_uid, v_d.client_id, p_dossier::text) then
    raise exception 'Ce dossier ne vous est pas ouvert.' using errcode = '42501';
  end if;
  if not private.tamila_gere_dossier_pour(v_uid, p_dossier) then
    raise exception 'Seul le responsable du dossier, ou un associé, y ajoute quelqu''un.' using errcode = '42501';
  end if;
  if p_role is null or p_role not in ('responsable', 'intervenant', 'lecteur') then
    raise exception 'Rôle inconnu : %.', coalesce(p_role, 'vide') using errcode = '22023';
  end if;
  select c.role into v_role_cible from public.comptes c where c.user_id = p_user and c.client_id = v_d.client_id;
  if v_role_cible is null then
    raise exception 'Cette personne n''est pas membre du cabinet.' using errcode = '23503';
  end if;
  if exists (select 1 from public.tamila_murailles m
             where m.dossier_id = p_dossier and m.user_id = p_user and m.leve_le is null) then
    raise exception 'Une muraille écarte cette personne du dossier.' using errcode = '42501';
  end if;
  if v_role_cible = 'lecteur' and p_role <> 'lecteur' then
    raise exception 'Un stagiaire entre dans un dossier en lecteur.' using errcode = '22023';
  end if;
  if p_role = 'responsable' and v_role_cible not in ('gerant', 'admin', 'valideur') then
    raise exception 'Le responsable d''un dossier est un avocat.' using errcode = '22023';
  end if;
  if p_jusqu_au is not null and p_jusqu_au <= now() then
    raise exception 'Un accès borné finit dans le futur.' using errcode = '22023';
  end if;
  insert into public.tamila_dossiers_membres (client_id, dossier_id, user_id, role_dossier, jusqu_au, ajoute_par)
  values (v_d.client_id, p_dossier, p_user, p_role, p_jusqu_au, v_uid)
  on conflict (dossier_id, user_id) do update
    set role_dossier = excluded.role_dossier, jusqu_au = excluded.jusqu_au, ajoute_par = excluded.ajoute_par;
end $function$


-- ═══ FONCTION private.tamila_ajouter_partie
CREATE OR REPLACE FUNCTION private.tamila_ajouter_partie(p_dossier uuid, p_nom bytea, p_qualite text, p_residence text DEFAULT 'inconnue'::text, p_role_procedure text DEFAULT NULL::text, p_courriels bytea DEFAULT NULL::bytea)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_id uuid;
begin
  select * into v_d from public.tamila_dossiers where id = p_dossier;
  if v_uid is null or not found or not private.tamila_ecrit_dossier_pour(v_uid, v_d.client_id, p_dossier::text) then
    raise exception 'Vous n''écrivez pas dans ce dossier.' using errcode = '42501';
  end if;
  insert into public.tamila_parties (client_id, dossier_id, nom_chiffre, qualite, role_procedure, residence,
                                     courriels_chiffres, cree_par)
  values (v_d.client_id, p_dossier, p_nom, p_qualite, p_role_procedure, coalesce(p_residence, 'inconnue'),
          p_courriels, v_uid)
  returning id into v_id;
  return v_id;
end $function$


-- ═══ FONCTION private.tamila_annuler_cloture
CREATE OR REPLACE FUNCTION private.tamila_annuler_cloture(p_dossier uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
begin
  select * into v_d from public.tamila_dossiers where id = p_dossier for update;
  if v_uid is null or not found or not private.a_un_role(v_d.client_id, array['gerant'])
     or not private.tamila_voit_dossier_pour(v_uid, v_d.client_id, p_dossier::text) then
    raise exception 'Seul un gérant annule une clôture.' using errcode = '42501';
  end if;
  if v_d.statut <> 'clos' then
    raise exception 'Ce dossier n''est pas clos.' using errcode = '55000';
  end if;
  if v_d.effacement_prevu_le <= now() then
    raise exception 'L''échéance est passée : l''effacement est en cours.' using errcode = '55000';
  end if;
  update public.tamila_dossiers
     set statut = v_d.statut_avant_cloture, clos_le = null, demande_cloture_id = null, statut_avant_cloture = null,
         effacement_prevu_le = case when v_d.statut_avant_cloture = 'audit' then private.tamila_echeance_effacement(
             v_d.audit_fin_le, (select r.conservation_audit_jours from public.tamila_reglages r where r.client_id = v_d.client_id),
             private.tamila_fuseau(v_d.client_id, v_d.entite_id)) end
   where id = p_dossier;
end $function$


-- ═══ FONCTION private.tamila_annuler_confirmation
CREATE OR REPLACE FUNCTION private.tamila_annuler_confirmation(p_delai uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.demandes_validation d set statut = 'annulee'
   where d.id = (select t.demande_id from public.tamila_delais t where t.id = p_delai) and d.statut = 'en_attente';
end $function$


-- ═══ FONCTION private.tamila_annuler_delai
CREATE OR REPLACE FUNCTION private.tamila_annuler_delai(p_delai uuid, p_motif text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_porte text;
  v_uid uuid := (select auth.uid());
  t public.tamila_delais;
begin
  select * into t from public.tamila_delais where id = p_delai;
  if v_uid is null or not found then
    raise exception 'Un délai s''annule par un avocat du dossier.' using errcode = '42501';
  end if;
  perform private.tamila_dossier_ecrit(t.dossier_id, true);
  select * into t from public.tamila_delais where id = p_delai for update;
  if t.statut in ('clos', 'annule') then
    raise exception 'Ce délai est déjà clos ou annulé.' using errcode = '55000';
  end if;
  if p_motif is null or p_motif not in ('desistement', 'caducite_prononcee', 'irrecevabilite_prononcee', 'radiation',
                                        'procedure_changee', 'erreur', 'doublon', 'autre') then
    raise exception 'Motif d''annulation inconnu : %.', coalesce(p_motif, 'vide') using errcode = '22023';
  end if;
  perform private.tamila_annuler_confirmation(t.id);
  update public.tamila_delais set statut = 'annule', motif_annulation = p_motif, annule_par = v_uid, annule_le = now()
   where id = t.id;
  if (select d.statut from public.delais d where d.id = t.delai_id) in ('ouvert', 'depasse') then
    v_porte := private.tamila_ouvrir_porte();
    perform private.clore_delai(t.delai_id, 'annule', 'Annulé par un avocat : ' || private.tamila_libelle(p_motif) || '.');
    perform private.tamila_fermer_porte(v_porte);
  end if;
  perform private.journaliser_module(t.client_id, 'tamila', 'tamila.delai.annule', 'tamila_dossier', t.dossier_id::text,
    jsonb_build_object('delai', t.id, 'motif', p_motif));
end $function$


-- ═══ FONCTION private.tamila_appliquer_avis
CREATE OR REPLACE FUNCTION private.tamila_appliquer_avis(p_avis uuid, p_uid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v public.tamila_avis;
  v_d public.tamila_dossiers;
  v_a public.tamila_appels;
  v_raisons text[] := '{}';
  v_delais uuid[] := '{}';
  v_audience uuid;
  v_oriente boolean := false;
  v_interrompus integer := 0;
  v_statut text;
  v_effet text;
  v_role text;
  r record;
begin
  select * into v from public.tamila_avis where id = p_avis for update;
  select * into v_d from public.tamila_dossiers where id = v.dossier_id;
  select * into v_a from public.tamila_appels where dossier_id = v.dossier_id for update;

  if v.rg_concorde is false then
    update public.tamila_avis set statut = 'a_verifier', effet = 'rg_different' where id = v.id;
    perform private.lever_alerte_module(v.client_id, 'tamila', 'critique',
      'Un avis RPVA ne porte pas le n° RG de son dossier : rattachez-le au bon dossier',
      jsonb_build_object('avis', v.id, 'dossier', v.dossier_id, 'type', v.type_avis), 'avis_rg:' || v.id::text, true,
      v_d.responsable_id);
    return jsonb_build_object('avis', v.id, 'statut', 'a_verifier', 'effet', 'rg_different', 'delais', '[]'::jsonb);
  end if;
  if v.rg_concorde is null then
    v_raisons := v_raisons || 'rg_non_verifie'::text;
  end if;
  if v.confiance = 'modele' then
    v_raisons := v_raisons || 'type_propose_par_modele'::text;
    perform private.lever_alerte_module(v.client_id, 'tamila', 'attention', 'Avis RPVA sans gabarit : type proposé par le modèle',
      jsonb_build_object('avis', v.id, 'type', v.type_avis), 'gabarit_manquant:' || v.type_avis, false, null);
  end if;

  if v.type_avis = 'rpva_accuse_depot' then
    update public.tamila_avis set statut = 'a_rattacher', effet = 'preuve_a_rattacher' where id = v.id;
    perform private.lever_alerte_module(v.client_id, 'tamila', 'attention',
      'Un accusé de dépôt RPVA est arrivé : rattachez-le au délai qu''il éteint',
      jsonb_build_object('avis', v.id, 'dossier', v.dossier_id, 'depose_le', v.depose_le), 'avis_depot:' || v.id::text, true,
      v_d.responsable_id);
    return jsonb_build_object('avis', v.id, 'statut', 'a_rattacher', 'effet', 'preuve_a_rattacher', 'delais', '[]'::jsonb);
  end if;

  begin
    if v.type_avis = 'rpva_avis_audience' then
      if v.date_audience is not null then
        insert into public.tamila_audiences (client_id, dossier_id, avis_id, date_heure, heure_connue, nature, source, cree_par)
        values (v.client_id, v.dossier_id, v.id, v.date_audience, coalesce(v.heure_audience_connue, false), 'audience', 'avis', p_uid)
        returning id into v_audience;
      end if;
    else
      if v_a.id is null and v.type_avis = 'rpva_declaration_appel' then
        v_role := case v.partie_visee when 'appelant' then 'appelant' when 'intime' then 'intime' end;
        if v_role is not null and v_d.territoire in ('metropole', 'alsace-moselle', 'guadeloupe', 'martinique', 'guyane',
             'la-reunion', 'mayotte', 'saint-barthelemy', 'saint-martin', 'saint-pierre-et-miquelon') then
          insert into public.tamila_appels (client_id, dossier_id, introduit_le, role_client, territoire, cree_par)
          values (v.client_id, v.dossier_id, v.date_avis, v_role, v_d.territoire, p_uid)
          returning * into v_a;
        end if;
      end if;
      if v_a.id is null then
        v_effet := case when v.type_avis = 'rpva_declaration_appel' and v.partie_visee in ('appelant', 'intime')
                        then 'juridiction_a_preciser' else 'appel_a_declarer' end;
        update public.tamila_avis set statut = 'sans_effet', effet = v_effet where id = v.id;
        perform private.lever_alerte_module(v.client_id, 'tamila', 'attention',
          case v_effet when 'juridiction_a_preciser'
               then 'Un avis RPVA est arrivé : précisez la cour d''appel du dossier pour que Tamila en calcule les délais'
               else 'Un avis RPVA est arrivé : déclarez l''appel du dossier pour que Tamila en calcule les délais' end,
          jsonb_build_object('avis', v.id, 'dossier', v.dossier_id, 'type', v.type_avis), 'avis_appel:' || v.dossier_id::text,
          true, v_d.responsable_id);
        return jsonb_build_object('avis', v.id, 'statut', 'sans_effet', 'effet', v_effet, 'delais', '[]'::jsonb);
      end if;

      if v.type_avis = 'rpva_declaration_appel' then
        v_delais := private.tamila_appliquer_evenement(v_d, v_a, 'declaration_appel', v.date_avis, v.id, v_raisons, p_uid, false);
      elsif v.type_avis = 'rpva_avis_902' then
        v_delais := private.tamila_appliquer_evenement(v_d, v_a, 'avis_signifier_declaration', v.date_avis, v.id, v_raisons,
                                                       p_uid, false);
      elsif v.type_avis = 'rpva_avis_fixation' then
        if v_a.procedure <> 'bref_delai' then
          perform private.tamila_orienter(v_a.id, 'bref_delai');
          select * into v_a from public.tamila_appels where id = v_a.id;
          v_oriente := true;
        end if;
        v_delais := private.tamila_appliquer_evenement(v_d, v_a, 'avis_fixation_bref_delai', v.date_avis, v.id, v_raisons,
                                                       p_uid, false);
        if v.date_audience is not null then
          insert into public.tamila_audiences (client_id, dossier_id, avis_id, date_heure, heure_connue, nature, juridiction,
                                               source, cree_par)
          values (v.client_id, v.dossier_id, v.id, v.date_audience, coalesce(v.heure_audience_connue, false), 'plaidoiries',
                  v_d.juridiction, 'avis', p_uid)
          returning id into v_audience;
        end if;
      elsif v.type_avis = 'rpva_ordonnance_mee' then
        if v_a.procedure = 'a_orienter' then
          perform private.tamila_orienter(v_a.id, 'mise_en_etat');
          v_oriente := true;
        end if;
        if v.date_limite is not null then
          v_delais := array[private.tamila_poser_date_fixee(v_d, v_a.territoire, v.date_limite, 'autre', 'ordonnance', v.id,
                                                            v_raisons, p_uid, false)];
        end if;
      elsif v.type_avis = 'rpva_conclusions' then
        -- Les conclusions de l'appelant notifiées à l'intimé : 909 (906-2 à bref délai),
        -- pour les premières seulement (celles de l'art. 908).
        if v.partie_visee = 'appelant' and v_a.role_client = 'intime' and coalesce(v.rang, 1) = 1 then
          v_delais := private.tamila_appliquer_evenement(v_d, v_a, 'notification_conclusions_appelant', v.date_avis, v.id,
            v_raisons || case when v.rang is null then array['rang_a_verifier'] else '{}'::text[] end, p_uid, false);
        end if;
      elsif v.type_avis = 'rpva_appel_incident' then
        v_delais := private.tamila_appliquer_evenement(v_d, v_a, 'notification_appel_incident', v.date_avis, v.id, v_raisons,
                                                       p_uid, false);
      elsif v.type_avis = 'rpva_intervention' then
        if v_a.role_client = 'intervenant_force' then
          v_delais := private.tamila_appliquer_evenement(v_d, v_a, 'notification_intervention_forcee', v.date_avis, v.id,
                                                         v_raisons, p_uid, false);
        elsif v_a.role_client = 'intervenant_volontaire' then
          v_delais := private.tamila_appliquer_evenement(v_d, v_a, 'intervention_volontaire', v.date_avis, v.id, v_raisons,
                                                         p_uid, false);
        end if;
      elsif v.type_avis = 'rpva_interruption' then
        for r in
          select t.id from public.tamila_delais t join public.tamila_regles_procedure p on p.code = t.regle_code
          where t.dossier_id = v.dossier_id and t.statut in ('a_confirmer', 'confirme', 'rejete') and p.interruptible
          order by t.echeance_retenue
        loop
          perform private.tamila_interrompre(r.id, 'a_preciser', v.date_avis);
          v_interrompus := v_interrompus + 1;
        end loop;
      end if;
      if v.date_cloture_previsible is not null then
        update public.tamila_appels set cloture_previsible_le = v.date_cloture_previsible, maj_le = now() where id = v_a.id;
      end if;
    end if;
  exception when others then
    update public.tamila_avis set statut = 'a_verifier', effet = 'erreur' where id = v.id;
    perform private.lever_alerte_module(v.client_id, 'tamila', 'critique',
      'Un avis RPVA n''a pas pu être appliqué : vérifiez les délais du dossier',
      jsonb_build_object('avis', v.id, 'dossier', v.dossier_id, 'type', v.type_avis, 'erreur', left(sqlerrm, 300)),
      'avis_erreur:' || v.id::text, true, v_d.responsable_id);
    return jsonb_build_object('avis', v.id, 'statut', 'a_verifier', 'effet', 'erreur', 'erreur', left(sqlerrm, 300),
                              'delais', '[]'::jsonb);
  end;

  v_effet := case when cardinality(v_delais) > 0 then 'delais_poses'
                  when v_interrompus > 0 then 'delais_interrompus'
                  when v_audience is not null then 'audience_ajoutee'
                  when v_oriente then 'procedure_orientee'
                  else 'aucun_delai' end;
  v_statut := case when v_effet = 'aucun_delai' then 'sans_effet' else 'applique' end;
  update public.tamila_avis set statut = v_statut, effet = v_effet where id = v.id;
  return jsonb_build_object('avis', v.id, 'statut', v_statut, 'effet', v_effet, 'delais', to_jsonb(v_delais),
                            'audience', v_audience, 'interrompus', v_interrompus);
end $function$


-- ═══ FONCTION private.tamila_appliquer_evenement
CREATE OR REPLACE FUNCTION private.tamila_appliquer_evenement(p_dossier tamila_dossiers, p_appel tamila_appels, p_evenement text, p_date date, p_avis uuid, p_raisons text[], p_uid uuid, p_sauf_echus boolean)
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  v_residence text := private.tamila_residence_client(p_dossier.id, p_appel.territoire);
  v_ids uuid[] := '{}';
begin
  for r in
    select p.code from public.tamila_regles_procedure p
    where p.regime = p_appel.regime and p.evenement = p_evenement and p_appel.procedure = any (p.procedures)
      and (p.partie in ('destinataire', 'toutes') or p.partie = p_appel.role_client)
    order by p.code
  loop
    -- Un appel déclaré après coup n'entre pas avec des délais déjà échus.
    continue when p_sauf_echus and (private.tamila_calculer_delai(r.code, p_date, p_appel.territoire, v_residence) ->> 'echeance')::date
                                    < private.tamila_aujourdhui(p_appel.territoire);
    v_ids := v_ids || private.tamila_poser(p_dossier, p_appel, r.code, p_date, v_residence, p_avis, p_raisons, p_uid);
  end loop;
  return v_ids;
end $function$


-- ═══ FONCTION private.tamila_augmentation
CREATE OR REPLACE FUNCTION private.tamila_augmentation(p_territoire text, p_residence text, OUT mois integer, OUT motif text, OUT incertain text)
 RETURNS record
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
begin
  if p_residence is null or p_residence not in (
       'metropole', 'alsace-moselle', 'guadeloupe', 'martinique', 'guyane', 'la-reunion', 'mayotte', 'saint-barthelemy',
       'saint-martin', 'saint-pierre-et-miquelon', 'nouvelle-caledonie', 'polynesie-francaise', 'wallis-et-futuna', 'taaf',
       'etranger', 'inconnue') then
    raise exception 'Résidence inconnue : %.', coalesce(p_residence, 'vide') using errcode = '22023';
  end if;
  if p_residence = 'inconnue' then
    mois := null; motif := 'domicile_inconnu'; incertain := 'domicile_inconnu';
  elsif p_residence = 'etranger' then
    if p_territoire in ('metropole', 'alsace-moselle') then
      mois := 2; motif := 'etranger';
    else
      -- Hors de la collectivité (un mois) ou à l'étranger (deux) : un mois, à confirmer.
      mois := 1; motif := 'etranger_devant_outre_mer'; incertain := 'etranger_devant_outre_mer';
    end if;
  elsif p_territoire in ('metropole', 'alsace-moselle') then
    if p_residence in ('guadeloupe', 'guyane', 'martinique', 'la-reunion', 'mayotte', 'saint-barthelemy', 'saint-martin',
                       'saint-pierre-et-miquelon', 'polynesie-francaise', 'wallis-et-futuna', 'nouvelle-caledonie', 'taaf') then
      mois := 1; motif := 'outre_mer_devant_metropole';
    else
      mois := 0; motif := 'aucune';
    end if;
  elsif p_territoire in ('guadeloupe', 'guyane', 'martinique', 'la-reunion', 'mayotte', 'saint-barthelemy', 'saint-martin',
                         'saint-pierre-et-miquelon', 'wallis-et-futuna') and p_residence <> p_territoire then
    mois := 1; motif := 'hors_collectivite';
  else
    mois := 0; motif := 'aucune';
  end if;
end $function$


-- ═══ FONCTION private.tamila_aujourdhui
CREATE OR REPLACE FUNCTION private.tamila_aujourdhui(p_territoire text, p_instant timestamp with time zone DEFAULT now())
 RETURNS date
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select (p_instant at time zone coalesce((select t.fuseau from public.territoires t where t.code = p_territoire), 'Europe/Paris'))::date
$function$


-- ═══ FONCTION private.tamila_avis_lu
CREATE OR REPLACE FUNCTION private.tamila_avis_lu(p_client uuid, p_dossier uuid, p_piece uuid, p_type text, p_valeurs jsonb, p_confiance text DEFAULT 'gabarit'::text, p_rg_concorde boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_existant uuid;
  v_fuseau text;
  v_id uuid;
  v_date_avis date;
  v_audience timestamptz;
  v_cloture date;
  v_limite date;
  v_partie text;
  v_rang smallint;
  v_depose timestamptz;
  v_texte text;
begin
  v_d := private.tamila_dossier_ecrit(p_dossier, false);
  if v_d.client_id <> p_client then
    raise exception 'Ce dossier n''est pas celui de ce cabinet.' using errcode = '42501';
  end if;
  if v_d.statut not in ('ouvert', 'audit') then
    raise exception 'Les avis d''un dossier se lisent quand il est ouvert.' using errcode = '55000';
  end if;
  if p_type is null or p_type not in ('rpva_avis_fixation', 'rpva_avis_902', 'rpva_declaration_appel', 'rpva_conclusions',
       'rpva_appel_incident', 'rpva_intervention', 'rpva_ordonnance_mee', 'rpva_avis_audience', 'rpva_accuse_depot',
       'rpva_interruption') then
    raise exception 'Type d''avis inconnu : %.', coalesce(p_type, 'vide') using errcode = '22023';
  end if;
  if v_uid is not null then
    p_confiance := 'saisie';
  elsif p_confiance is null or p_confiance not in ('gabarit', 'modele') then
    raise exception 'Confiance inconnue : %.', coalesce(p_confiance, 'vide') using errcode = '22023';
  end if;
  if p_piece is not null then
    select a.id into v_existant from public.tamila_avis a where a.piece_id = p_piece;
    if v_existant is not null then
      return (select jsonb_build_object('avis', a.id, 'statut', a.statut, 'effet', a.effet, 'deja_lu', true,
                                        'delais', coalesce((select jsonb_agg(t.id) from public.tamila_delais t where t.avis_id = a.id),
                                                           '[]'::jsonb))
              from public.tamila_avis a where a.id = v_existant);
    end if;
    if not exists (select 1 from public.pieces pc
                   where pc.id = p_piece and pc.client_id = p_client and pc.objet_type = 'tamila_dossier'
                     and pc.objet_id = p_dossier::text) then
      raise exception 'Cette pièce n''est pas dans le dossier.' using errcode = '22023';
    end if;
  end if;
  select tr.fuseau into v_fuseau from public.territoires tr
   where tr.code = coalesce((select a.territoire from public.tamila_appels a where a.dossier_id = p_dossier), v_d.territoire, 'metropole');
  p_valeurs := coalesce(p_valeurs, '{}'::jsonb);
  begin
    v_date_avis := (p_valeurs ->> 'date_avis')::date;
    v_texte := p_valeurs ->> 'date_audience';
    if v_texte is not null then
      v_audience := v_texte::timestamp at time zone v_fuseau;
    end if;
    v_cloture := (p_valeurs ->> 'date_cloture_previsible')::date;
    v_limite := (p_valeurs ->> 'date_limite')::date;
    if p_valeurs ->> 'depose_le' is not null then
      v_depose := (p_valeurs ->> 'depose_le')::timestamp at time zone v_fuseau;
    end if;
  exception when others then
    raise exception 'Une date de l''avis est illisible.' using errcode = '22023';
  end;
  if v_date_avis is null then
    raise exception 'La date de l''avis est nécessaire.' using errcode = '22023';
  end if;
  v_partie := case when p_valeurs ->> 'partie_visee' in ('appelant', 'intime', 'intervenant') then p_valeurs ->> 'partie_visee' end;
  v_rang := case when p_valeurs ->> 'rang' ~ '^[1-9][0-9]?$' then (p_valeurs ->> 'rang')::smallint end;
  if p_type = 'rpva_accuse_depot' and v_depose is null then
    raise exception 'Un accusé de dépôt porte sa date de dépôt.' using errcode = '22023';
  end if;

  insert into public.tamila_avis (client_id, dossier_id, piece_id, type_avis, date_avis, date_audience, heure_audience_connue,
    date_cloture_previsible, date_limite, partie_visee, rang, depose_le, confiance, rg_concorde, cree_par)
  values (p_client, p_dossier, p_piece, p_type, v_date_avis, v_audience,
    case when v_texte is not null then char_length(v_texte) > 10 end, v_cloture, v_limite, v_partie, v_rang, v_depose,
    p_confiance, p_rg_concorde, v_uid)
  returning id into v_id;
  return private.tamila_appliquer_avis(v_id, v_uid);
end $function$


-- ═══ FONCTION private.tamila_balayer_decisions
CREATE OR REPLACE FUNCTION private.tamila_balayer_decisions()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r record; n integer := 0;
begin
  for r in
    select d.id from public.demandes_validation d
    where d.module = 'tamila' and d.type_action in ('ouvrir_dossier', 'cloturer_dossier', 'lever_muraille', 'confirmer_delai')
      and (d.statut = 'approuvee' or (d.statut = 'rejetee' and d.decide_le > now() - interval '2 days'))
    order by d.cree_le
  loop
    perform private.tamila_executer_demande(r.id);
    n := n + 1;
  end loop;
  return n;
end $function$


-- ═══ FONCTION private.tamila_brute_augmentee
CREATE OR REPLACE FUNCTION private.tamila_brute_augmentee(p_quantite integer, p_unite text, p_depart date, p_mois integer, OUT brute date, OUT d_un_bloc date)
 RETURNS record
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
begin
  if p_unite = 'mois' then
    d_un_bloc := public.ajouter_mois(p_depart, p_quantite + p_mois);
    brute := least(d_un_bloc, public.ajouter_mois(public.ajouter_mois(p_depart, p_quantite), p_mois));
  elsif p_unite = 'jours' then
    brute := public.ajouter_mois(p_depart, p_mois) + p_quantite;
    d_un_bloc := brute;
  else
    raise exception 'Unité non prise en charge : %.', coalesce(p_unite, 'vide') using errcode = '22023';
  end if;
end $function$


-- ═══ FONCTION private.tamila_calculer_delai
CREATE OR REPLACE FUNCTION private.tamila_calculer_delai(p_regle text, p_depart date, p_territoire text, p_residence text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  p public.tamila_regles_procedure;
  g public.regles_delais;
  v_base jsonb;
  v_b5 jsonb;
  v_aug record;
  v_mois integer := 0;
  v_motif text;
  v_incertain text;
  v_brute date;
  v_un_bloc date;
  v_echeance date;
  v_raisons text[] := '{}';
  v_autres jsonb := '[]'::jsonb;
  v_art text;
  v_detail text;
  v_source text;
  e jsonb;
begin
  select * into p from public.tamila_regles_procedure where code = p_regle;
  if not found then
    raise exception 'Règle de procédure inconnue : %.', coalesce(p_regle, 'vide') using errcode = '22023';
  end if;
  if p_territoire in ('nouvelle-caledonie', 'polynesie-francaise', 'wallis-et-futuna') then
    raise exception 'Cette juridiction applique la procédure civile locale : Tamila n''y calcule pas les délais.'
      using errcode = '22023', hint = 'Saisir la date fixée (tamila_poser_date).';
  end if;
  if p_territoire is null or p_territoire not in ('metropole', 'alsace-moselle', 'guadeloupe', 'martinique', 'guyane',
       'la-reunion', 'mayotte', 'saint-barthelemy', 'saint-martin', 'saint-pierre-et-miquelon') then
    raise exception 'Territoire inconnu : %.', coalesce(p_territoire, 'vide') using errcode = '22023';
  end if;
  if p_depart is null then
    raise exception 'Le départ du délai est nécessaire.' using errcode = '22023';
  end if;
  select * into v_aug from private.tamila_augmentation(p_territoire, p_residence);

  -- B5 : la version en vigueur au départ, la date brute et sa prorogation.
  v_base := public.echeance_de(p_regle, p_depart, p_territoire);
  select * into g from public.regles_delais where code = p_regle and version = (v_base ->> 'version')::smallint;
  v_art := case p.regime when 'cpc' then 'art. 915-4' else 'art. 911-2 ancien' end;
  if p.augmentable then
    v_mois := coalesce(v_aug.mois, 0);
    v_motif := v_aug.motif;
    v_incertain := v_aug.incertain;
    if v_incertain is not null then
      v_raisons := array[v_incertain];
    end if;
  else
    v_motif := 'non_augmentable';
  end if;

  select b.brute, b.d_un_bloc into v_brute, v_un_bloc
  from private.tamila_brute_augmentee(g.quantite, g.unite, p_depart, v_mois) b;
  v_echeance := public.proroger(v_brute, p_territoire);
  -- B5 porte l'augmentation (lot 16) ; la référence de Tamila la recalcule et les deux doivent concorder.
  v_b5 := public.echeance_de(p_regle, p_depart, p_territoire, v_mois);
  if v_echeance <> (v_b5 ->> 'echeance')::date or (v_mois = 0 and v_brute <> (v_b5 ->> 'brute')::date) then
    raise exception 'Le calcul de Tamila et celui de B5 divergent pour % au %.', p_regle, p_depart using errcode = 'XX000';
  end if;

  -- Les autres dates possibles, montrées avec la date retenue (la plus proche).
  if v_un_bloc <> v_brute then
    v_un_bloc := public.proroger(v_un_bloc, p_territoire);
    if v_un_bloc <> v_echeance then
      v_raisons := v_raisons || 'fin_de_mois_augmentation'::text;
      v_autres := v_autres || jsonb_build_object('motif', 'd_un_bloc', 'echeance', v_un_bloc);
    end if;
  end if;
  if v_incertain = 'domicile_inconnu' then
    v_autres := v_autres
      || jsonb_build_object('motif', 'un_mois_de_plus', 'echeance', public.proroger(
           (select b.brute from private.tamila_brute_augmentee(g.quantite, g.unite, p_depart, 1) b), p_territoire))
      || jsonb_build_object('motif', 'deux_mois_de_plus', 'echeance', public.proroger(
           (select b.brute from private.tamila_brute_augmentee(g.quantite, g.unite, p_depart, 2) b), p_territoire));
  elsif v_incertain = 'etranger_devant_outre_mer' then
    v_autres := v_autres
      || jsonb_build_object('motif', 'deux_mois_de_plus', 'echeance', public.proroger(
           (select b.brute from private.tamila_brute_augmentee(g.quantite, g.unite, p_depart, 2) b), p_territoire));
  end if;
  v_autres := coalesce((select jsonb_agg(x order by (x ->> 'motif') collate "C") from jsonb_array_elements(v_autres) x),
                       '[]'::jsonb);
  if ('fin_de_mois_augmentation' = any (v_raisons)) <> coalesce((v_b5 ->> 'a_confirmer')::boolean, false)
     or ('fin_de_mois_augmentation' = any (v_raisons)
         and v_un_bloc is distinct from (v_b5 ->> 'lecture_d_un_bloc')::date) then
    raise exception 'La fin de mois de Tamila et celle de B5 divergent pour % au %.', p_regle, p_depart using errcode = 'XX000';
  end if;
  v_raisons := array(select r from unnest(v_raisons) r order by r collate "C");

  v_source := case when v_mois > 0 then
    'Augmentation ' || case v_mois when 1 then 'd''un mois' else 'de deux mois' end || ' (' || v_art || ' : '
    || case v_motif
         when 'outre_mer_devant_metropole' then 'partie demeurant outre-mer devant une juridiction de métropole'
         when 'hors_collectivite' then 'partie qui ne demeure pas dans la collectivité de la juridiction'
         when 'etranger' then 'partie demeurant à l''étranger'
         else 'partie demeurant à l''étranger devant une juridiction d''outre-mer, à confirmer' end || ').' end;

  v_detail := g.quantite::text || case g.unite when 'mois' then ' mois' else case when g.quantite > 1 then ' jours' else ' jour' end end
    || ' à compter du ' || private.jour_en_toutes_lettres(p_depart) || ' (CPC, art. ' || p.article
    || case when p.regime = 'cpc2017' then ', dans sa rédaction antérieure au 01/09/2024' else '' end || ')'
    || case v_motif
         when 'outre_mer_devant_metropole' then ', augmentés d''un mois (partie demeurant outre-mer devant une juridiction de métropole, ' || v_art || ')'
         when 'hors_collectivite' then ', augmentés d''un mois (partie qui ne demeure pas dans la collectivité de la juridiction, ' || v_art || ')'
         when 'etranger' then ', augmentés de deux mois (partie demeurant à l''étranger, ' || v_art || ')'
         when 'etranger_devant_outre_mer' then ', augmentés d''un mois (partie demeurant à l''étranger devant une juridiction d''outre-mer, ' || v_art || ')'
         when 'domicile_inconnu' then ', sans augmentation retenue : domicile de la partie à préciser (' || v_art || ')'
         when 'non_augmentable' then ', délai que l''' || v_art || ' n''augmente pas'
         else '' end
    || case when g.unite = 'jours' and v_mois > 0 then ', les mois d''abord, puis les jours (art. 641, al. 3)' else '' end
    || ' : ' || private.jour_en_toutes_lettres(v_brute)
    || case when v_echeance <> v_brute then ', prorogé au ' || private.jour_en_toutes_lettres(v_echeance) || ' (art. 642)' else '' end
    || '.'
    || case when 'domicile_inconnu' = any (v_raisons)
            then ' À confirmer : le domicile de la partie est inconnu ; la date la plus proche est retenue.' else '' end
    || case when 'etranger_devant_outre_mer' = any (v_raisons)
            then ' À confirmer : devant une juridiction d''outre-mer, une partie à l''étranger a un mois (hors de la collectivité) ou deux (à l''étranger) ; un mois est retenu.' else '' end
    || case when 'fin_de_mois_augmentation' = any (v_raisons)
            then ' À confirmer : fin de mois ; calculé d''un bloc, le délai finirait plus tard ; la date la plus proche est retenue.' else '' end;
  for e in select * from jsonb_array_elements(v_autres) loop
    v_detail := v_detail || ' ' || case e ->> 'motif' when 'd_un_bloc' then 'Calculé d''un bloc'
                                                       when 'un_mois_de_plus' then 'Avec un mois de plus'
                                                       else 'Avec deux mois de plus' end
                || ' : ' || private.jour_en_toutes_lettres((e ->> 'echeance')::date) || '.';
  end loop;

  return jsonb_build_object(
    'echeance', v_echeance, 'brute', v_brute, 'base', (v_base ->> 'echeance')::date,
    'regle', p.code, 'version', g.version, 'regime', p.regime, 'article', p.article, 'acte', p.acte, 'sanction', p.sanction,
    'libelle', g.libelle, 'source', g.source_texte, 'source_url', g.source_url,
    'territoire', p_territoire, 'residence', p_residence, 'depart', p_depart,
    'augmentation_mois', v_mois, 'motif_augmentation', v_motif, 'source_augmentation', v_source,
    'raisons', to_jsonb(v_raisons), 'alternatives', v_autres, 'detail', v_detail);
end $function$


-- ═══ FONCTION private.tamila_changer_audience
CREATE OR REPLACE FUNCTION private.tamila_changer_audience(p_audience uuid, p_statut text, p_renvoi_le timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  a public.tamila_audiences;
  v_id uuid;
begin
  select * into a from public.tamila_audiences where id = p_audience;
  if not found then
    raise exception 'Audience introuvable.' using errcode = '42501';
  end if;
  perform private.tamila_dossier_ecrit(a.dossier_id, false);
  if a.statut <> 'prevue' then
    raise exception 'Cette audience n''est plus prévue.' using errcode = '55000';
  end if;
  if p_statut is null or p_statut not in ('renvoyee', 'tenue', 'annulee') then
    raise exception 'Statut inconnu : %.', coalesce(p_statut, 'vide') using errcode = '22023';
  end if;
  if p_statut = 'renvoyee' then
    if p_renvoi_le is null or p_renvoi_le <= a.date_heure then
      raise exception 'Un renvoi porte une date postérieure à l''audience.' using errcode = '22023';
    end if;
    insert into public.tamila_audiences (client_id, dossier_id, avis_id, date_heure, heure_connue, nature, juridiction, chambre,
                                         avocat_id, source, cree_par)
    values (a.client_id, a.dossier_id, a.avis_id, p_renvoi_le, a.heure_connue, a.nature, a.juridiction, a.chambre, a.avocat_id,
            case when v_uid is null then 'agenda' else 'saisie' end, v_uid)
    returning id into v_id;
  end if;
  update public.tamila_audiences set statut = p_statut, renvoyee_a = v_id, maj_le = now() where id = a.id;
  return coalesce(v_id, a.id);
end $function$


-- ═══ FONCTION private.tamila_chiffre_valide
CREATE OR REPLACE FUNCTION private.tamila_chiffre_valide(p bytea)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select p is null or (octet_length(p) >= 29 and get_byte(p, 0) = 1)
$function$


-- ═══ FONCTION private.tamila_cle_detruite
CREATE OR REPLACE FUNCTION private.tamila_cle_detruite(p_dossier uuid, p_preuve jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_k public.tamila_cles;
begin
  if (select auth.uid()) is not null or private.tamila_role_session() <> 'service_role' then
    raise exception 'La destruction d''une clé est faite par le serveur, au coffre à clés.' using errcode = '42501';
  end if;
  select * into v_k from public.tamila_cles where dossier_id = p_dossier for update;
  if not found then
    raise exception 'Clé introuvable.' using errcode = 'P0002';
  end if;
  if v_k.statut <> 'desactivee' or v_k.destruction_prevue_le > now() then
    raise exception 'Cette clé ne se détruit pas encore : elle est désactivée à l''effacement, détruite sept jours après.'
      using errcode = '55000';
  end if;
  update public.tamila_cles
     set statut = 'detruite', detruite_le = now(), preuve = coalesce(p_preuve, '{}'::jsonb),
         enveloppe = '\x00000000000000000000000000000000'::bytea
   where id = v_k.id;
end $function$


-- ═══ FONCTION private.tamila_consulter
CREATE OR REPLACE FUNCTION private.tamila_consulter(p_dossier uuid, p_contexte text DEFAULT 'dossier'::text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
begin
  if v_uid is null then
    raise exception 'Une lecture est tracée au nom d''une personne connectée.' using errcode = '42501';
  end if;
  if p_contexte is null or p_contexte !~ '^[a-z][a-z0-9_.]{1,40}$' then
    raise exception 'Le contexte d''une lecture est un code (dossier, piece, export…), jamais un texte libre.'
      using errcode = '22023';
  end if;
  select * into v_d from public.tamila_dossiers where id = p_dossier;
  if not found or not private.tamila_voit_dossier_pour(v_uid, v_d.client_id, p_dossier::text) then
    raise exception 'Ce dossier ne vous est pas ouvert.' using errcode = '42501';
  end if;
  if v_d.statut not in ('attente', 'ouvert', 'audit', 'clos') then
    raise exception 'Ce dossier n''a plus de contenu.' using errcode = '55000';
  end if;
  perform private.tracer_lecture(v_d.client_id, 'tamila_dossier', p_dossier::text, p_contexte);
  return now() + interval '30 minutes';
end $function$


-- ═══ FONCTION private.tamila_controler_delais
CREATE OR REPLACE FUNCTION private.tamila_controler_delais(p_maintenant timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  w public.travaux;
  r record;
  v_ok boolean;
  v_depasses integer := 0;
  v_48h integer := 0;
  v_j8 integer := 0;
  v_destinataires uuid[];
begin
  -- 1. Les dépassements publiés par B5 (delai.depasse.tamila).
  for w in select * from private.prendre_travaux(array['tamila.delai_depasse'], 200, interval '5 minutes', 'tamila-delais') loop
    begin
      v_ok := false;
      for r in
        update public.tamila_delais t set depasse_le = p_maintenant
         where t.delai_id = private.tamila_uuid(w.charge ->> 'delai') and t.statut in ('a_confirmer', 'confirme', 'rejete')
           and t.depasse_le is null
        returning t.id, t.client_id, t.dossier_id, t.echeance_retenue, t.responsable_id
      loop
        perform private.lever_alerte_module(r.client_id, 'tamila', 'critique', 'Délai de procédure dépassé sans acte déposé',
          jsonb_build_object('delai', r.id, 'dossier', r.dossier_id, 'echeance', r.echeance_retenue),
          'delai_depasse:' || r.id::text, true, r.responsable_id);
        v_ok := true;
        v_depasses := v_depasses + 1;
      end loop;
      perform private.finir_travail(w.id, jsonb_build_object('depasse', v_ok));
    exception when others then
      perform private.echouer_travail(w.id, left(sqlerrm, 500));
    end;
  end loop;

  -- 2. Quarante-huit heures sans confirmation : l'avocat responsable est avisé.
  for r in
    select t.id, t.client_id, t.dossier_id, t.echeance_retenue, t.responsable_id from public.tamila_delais t
    where t.statut in ('a_confirmer', 'rejete') and t.relance_48h_le is null and t.cree_le <= p_maintenant - interval '48 hours'
    for update of t skip locked
  loop
    perform private.lever_alerte_module(r.client_id, 'tamila', 'attention', 'Délai de procédure à confirmer depuis 48 heures',
      jsonb_build_object('delai', r.id, 'dossier', r.dossier_id, 'echeance', r.echeance_retenue),
      'delai_48h:' || r.id::text, true, r.responsable_id);
    update public.tamila_delais set relance_48h_le = p_maintenant where id = r.id;
    v_48h := v_48h + 1;
  end loop;

  -- 3. À huit jours, toujours pas confirmé : un courriel par Tamila à l'avocat
  --    et aux associés qui voient le dossier, et une alerte critique.
  for r in
    select t.id, t.client_id, t.dossier_id, t.echeance_retenue, t.responsable_id from public.tamila_delais t
    join public.territoires tr on tr.code = t.territoire
    where t.statut in ('a_confirmer', 'rejete') and t.relance_j8_le is null
      and t.echeance_retenue - (p_maintenant at time zone tr.fuseau)::date <= 8
    for update of t skip locked
  loop
    select array_agg(distinct u.id order by u.id) into v_destinataires from (
      select r.responsable_id as id where r.responsable_id is not null
      union
      select c.user_id from public.comptes c
      where c.client_id = r.client_id and c.role in ('gerant', 'admin')
        and private.tamila_voit_dossier_pour(c.user_id, r.client_id, r.dossier_id::text)) u;
    perform private.deposer_travail(r.client_id, 'tamila', 'tamila.courriel',
      jsonb_build_object('modele', 'delai_non_confirme_j8', 'delai', r.id, 'dossier', r.dossier_id,
                         'echeance', r.echeance_retenue, 'destinataires', to_jsonb(coalesce(v_destinataires, '{}'::uuid[]))),
      'tamila:j8:' || r.id::text, 5::smallint);
    perform private.lever_alerte_module(r.client_id, 'tamila', 'critique', 'Délai de procédure non confirmé à huit jours ou moins',
      jsonb_build_object('delai', r.id, 'dossier', r.dossier_id, 'echeance', r.echeance_retenue),
      'delai_j8:' || r.id::text, true, r.responsable_id);
    update public.tamila_delais set relance_j8_le = p_maintenant where id = r.id;
    v_j8 := v_j8 + 1;
  end loop;

  -- 4. Le battement de chaque cabinet, même sans rien à faire.
  for r in select g.client_id from public.tamila_reglages g loop
    perform private.battre(r.client_id, 'tamila_delais',
      jsonb_build_object('depasses', v_depasses, 'relances_48h', v_48h, 'relances_j8', v_j8), null);
  end loop;
  return jsonb_build_object('depasses', v_depasses, 'relances_48h', v_48h, 'relances_j8', v_j8);
end $function$


-- ═══ FONCTION private.tamila_convertir_audit
CREATE OR REPLACE FUNCTION private.tamila_convertir_audit(p_dossier uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
begin
  select * into v_d from public.tamila_dossiers where id = p_dossier for update;
  if v_uid is null or not found or not private.a_un_role(v_d.client_id, array['gerant'])
     or not private.tamila_voit_dossier_pour(v_uid, v_d.client_id, p_dossier::text) then
    raise exception 'Seul un gérant convertit un audit en dossier ordinaire.' using errcode = '42501';
  end if;
  if v_d.statut <> 'audit' then
    raise exception 'Ce dossier n''est pas un audit en cours.' using errcode = '55000';
  end if;
  update public.tamila_dossiers set statut = 'ouvert', effacement_prevu_le = null where id = p_dossier;
end $function$


-- ═══ FONCTION private.tamila_corriger_delai
CREATE OR REPLACE FUNCTION private.tamila_corriger_delai(p_delai uuid, p_echeance date, p_motif text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_porte text;
  v_uid uuid := (select auth.uid());
  t public.tamila_delais;
  v_b5 public.delais;
  v_nouveau uuid;
  v_source text;
begin
  select * into t from public.tamila_delais where id = p_delai;
  if v_uid is null or not found then
    raise exception 'Une date se corrige par un avocat du dossier.' using errcode = '42501';
  end if;
  perform private.tamila_dossier_ecrit(t.dossier_id, true);
  select * into t from public.tamila_delais where id = p_delai for update;
  if t.statut not in ('a_confirmer', 'rejete', 'confirme', 'interrompu') then
    raise exception 'Ce délai est clos ou annulé.' using errcode = '55000';
  end if;
  if p_motif is null or p_motif not in ('calcul_errone', 'date_notifiee', 'delai_modifie_par_le_juge',
                                        'reprise_apres_interruption', 'autre') then
    raise exception 'Motif de correction inconnu : %.', coalesce(p_motif, 'vide') using errcode = '22023';
  end if;
  if p_echeance is null then
    raise exception 'La date corrigée est nécessaire.' using errcode = '22023';
  end if;
  v_source := 'Date saisie par un avocat : ' || private.tamila_libelle(p_motif) || '.';
  select * into v_b5 from public.delais where id = t.delai_id;
  if v_b5.statut in ('ouvert', 'depasse') then
    v_porte := private.tamila_ouvrir_porte();
    perform private.notifier_delai(t.delai_id, p_echeance, v_source);
    perform private.tamila_fermer_porte(v_porte);
  else
    -- Le délai de B5 a été clos (interruption) : un nouveau porte la date.
    v_porte := private.tamila_ouvrir_porte();
    v_nouveau := private.poser_delai_date(t.client_id, 'tamila', 'tamila_dossier', t.dossier_id::text, v_b5.libelle, p_echeance,
      v_source, t.territoire, '{7,2,0}', t.responsable_id, v_b5.action_attendue,
      'tamila:' || t.id::text || ':' || extract(epoch from clock_timestamp())::bigint::text);
    perform private.tamila_fermer_porte(v_porte);
  end if;
  perform private.tamila_annuler_confirmation(t.id);
  update public.tamila_delais
     set statut = 'confirme', echeance_retenue = p_echeance, confirmation = 'saisie', confirme_par = v_uid, confirme_le = now(),
         motif_correction = p_motif, delai_id = coalesce(v_nouveau, delai_id),
         depasse_le = case when p_echeance >= private.tamila_aujourdhui(t.territoire) then null else depasse_le end
   where id = t.id;
  perform private.journaliser_module(t.client_id, 'tamila', 'tamila.delai.corrige', 'tamila_dossier', t.dossier_id::text,
    jsonb_build_object('delai', t.id, 'echeance', p_echeance, 'avant', t.echeance_retenue, 'motif', p_motif));
end $function$


-- ═══ FONCTION private.tamila_creer_dossier
CREATE OR REPLACE FUNCTION private.tamila_creer_dossier(p_client uuid, p_dossier uuid, p_reference bytea, p_intitule bytea, p_cle_fournisseur text, p_cle_reference text, p_cle_enveloppe bytea, p_numero_rg bytea DEFAULT NULL::bytea, p_matiere text DEFAULT NULL::text, p_juridiction text DEFAULT NULL::text, p_territoire text DEFAULT NULL::text, p_mode text DEFAULT 'contentieux'::text, p_perso boolean DEFAULT false, p_audit_fin date DEFAULT NULL::date, p_responsable uuid DEFAULT NULL::uuid, p_entite uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_role text;
  v_role_resp text;
  v_entite uuid;
  v_fuseau text;
  v_statut text;
  v_responsable uuid;
  v_audit_fin timestamptz;
  v_demande uuid;
begin
  if v_uid is null then
    raise exception 'Un dossier s''ouvre par une personne connectée.' using errcode = '42501';
  end if;
  select c.role into v_role from public.comptes c where c.user_id = v_uid and c.client_id = p_client;
  if v_role is null or v_role = 'lecteur' then
    raise exception 'Vous ne pouvez pas ouvrir de dossier dans ce cabinet.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.tamila_reglages r where r.client_id = p_client) then
    raise exception 'Tamila n''est pas installé pour ce cabinet.' using errcode = '55000';
  end if;
  if p_dossier is null then
    raise exception 'L''identifiant du dossier est donné par le serveur, avec sa clé.' using errcode = '22023';
  end if;
  if coalesce(p_perso, false) and v_role <> 'valideur' then
    raise exception 'La clientèle personnelle est celle d''un avocat collaborateur (RIN, art. 14).' using errcode = '42501';
  end if;
  if p_audit_fin is not null and v_role not in ('gerant', 'admin') then
    raise exception 'Un audit s''ouvre par un associé, contrat d''audit signé.' using errcode = '42501';
  end if;
  if coalesce(p_perso, false) and p_audit_fin is not null then
    raise exception 'Un audit n''est pas une clientèle personnelle.' using errcode = '22023';
  end if;

  v_entite := coalesce(p_entite, (select e.id from public.entites e where e.client_id = p_client and e.principale));
  if not private.perimetre_couvre(v_uid, p_client, v_entite) then
    raise exception 'Cette entité est hors de votre périmètre.' using errcode = '42501';
  end if;
  select e.fuseau into v_fuseau from public.entites e where e.client_id = p_client and e.id = v_entite;
  if v_fuseau is null then
    raise exception 'Entité introuvable.' using errcode = 'P0002';
  end if;

  if p_responsable is not null and p_responsable <> v_uid then
    if coalesce(p_perso, false) then
      raise exception 'Le titulaire d''une clientèle personnelle en est le responsable.' using errcode = '22023';
    end if;
    select c.role into v_role_resp from public.comptes c where c.user_id = p_responsable and c.client_id = p_client;
    if v_role_resp is null or v_role_resp not in ('gerant', 'admin', 'valideur') then
      raise exception 'Le responsable d''un dossier est un avocat du cabinet.' using errcode = '22023';
    end if;
    v_responsable := p_responsable;
  elsif v_role = 'collaborateur' then
    raise exception 'Désignez l''avocat responsable du dossier.' using errcode = '22023';
  else
    v_responsable := v_uid;
  end if;

  v_statut := case when v_role = 'collaborateur' then 'attente'
                   when p_audit_fin is not null then 'audit'
                   else 'ouvert' end;
  if p_audit_fin is not null then
    v_audit_fin := (p_audit_fin + time '23:59:59') at time zone v_fuseau;
  end if;

  insert into public.tamila_dossiers (
    id, client_id, entite_id, reference_chiffree, intitule_chiffre, numero_rg_chiffre, matiere, juridiction,
    territoire, mode, statut, perso, proprietaire_perso, responsable_id, cree_par, ouvert_le, ouvert_par,
    audit_fin_le, effacement_prevu_le)
  values (
    p_dossier, p_client, v_entite, p_reference, p_intitule, p_numero_rg, p_matiere, p_juridiction,
    p_territoire, coalesce(p_mode, 'contentieux'), v_statut, coalesce(p_perso, false),
    case when p_perso then v_uid end, v_responsable, v_uid,
    case when v_statut <> 'attente' then now() end, case when v_statut <> 'attente' then v_uid end,
    v_audit_fin,
    case when v_audit_fin is not null then private.tamila_echeance_effacement(v_audit_fin,
      (select r.conservation_audit_jours from public.tamila_reglages r where r.client_id = p_client), v_fuseau) end);

  insert into public.tamila_cles (client_id, dossier_id, fournisseur, reference, enveloppe)
  values (p_client, p_dossier, p_cle_fournisseur, p_cle_reference, p_cle_enveloppe);

  insert into public.tamila_dossiers_membres (client_id, dossier_id, user_id, role_dossier, ajoute_par)
  values (p_client, p_dossier, v_responsable, 'responsable', v_uid);

  if v_role = 'collaborateur' then
    insert into public.tamila_dossiers_membres (client_id, dossier_id, user_id, role_dossier, ajoute_par)
    values (p_client, p_dossier, v_uid, 'intervenant', v_uid);
    insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id,
                                            resume, payload, cle_idempotence)
    values (p_client, v_entite, 'tamila', 'ouvrir_dossier', 'tamila_dossier', p_dossier::text,
            'Ouverture d''un dossier à la lecture',
            jsonb_build_object('dossier_id', p_dossier, 'initiateur', v_uid, 'responsable', v_responsable),
            'tamila:ouvrir:' || p_dossier::text)
    returning id into v_demande;
    update public.tamila_dossiers set demande_ouverture_id = v_demande where id = p_dossier;
    perform private.tamila_executer_demande(v_demande);
  end if;
  return p_dossier;
end $function$


-- ═══ FONCTION private.tamila_decider
CREATE OR REPLACE FUNCTION private.tamila_decider(p_demande uuid, p_decision text, p_commentaire text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.demandes_validation;
begin
  select * into v_d from public.demandes_validation where id = p_demande;
  if v_uid is null or not found or v_d.module <> 'tamila' then
    raise exception 'Demande introuvable.' using errcode = 'P0002';
  end if;
  if not private.tamila_voit_dossier_pour(v_uid, v_d.client_id, v_d.objet_id) then
    raise exception 'Vous n''avez pas accès au dossier de cette demande.' using errcode = '42501';
  end if;
  insert into public.approbations (demande_id, decision, commentaire) values (p_demande, p_decision, p_commentaire);
  return coalesce(private.tamila_executer_demande(p_demande),
                  (select d.statut from public.demandes_validation d where d.id = p_demande));
end $function$


-- ═══ FONCTION private.tamila_declarer_acte
CREATE OR REPLACE FUNCTION private.tamila_declarer_acte(p_delai uuid, p_depose_le date, p_piece uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_porte text;
  v_uid uuid := (select auth.uid());
  t public.tamila_delais;
  v_d public.tamila_dossiers;
begin
  select * into t from public.tamila_delais where id = p_delai;
  if not found then
    raise exception 'Délai introuvable.' using errcode = '42501';
  end if;
  if v_uid is null and p_piece is null then
    raise exception 'Le serveur clôt un délai sur un accusé de dépôt seulement.' using errcode = '42501';
  end if;
  v_d := private.tamila_dossier_ecrit(t.dossier_id, p_piece is null);
  select * into t from public.tamila_delais where id = p_delai for update;
  if t.statut not in ('a_confirmer', 'confirme', 'rejete', 'interrompu') then
    raise exception 'Ce délai est déjà clos ou annulé.' using errcode = '55000';
  end if;
  if p_depose_le is null or p_depose_le < date '2017-09-01'
     or p_depose_le > greatest(private.tamila_aujourdhui(t.territoire), private.tamila_aujourdhui('metropole')) then
    raise exception 'La date du dépôt est un jour passé, ou aujourd''hui.' using errcode = '22023';
  end if;
  if p_piece is not null and not exists (
       select 1 from public.pieces pc
       where pc.id = p_piece and pc.client_id = t.client_id and pc.objet_type = 'tamila_dossier' and pc.objet_id = t.dossier_id::text) then
    raise exception 'Cette pièce n''est pas dans le dossier du délai.' using errcode = '22023';
  end if;
  perform private.tamila_annuler_confirmation(t.id);
  update public.tamila_delais
     set statut = 'clos', acte_depose_le = p_depose_le, motif_cloture = case when p_piece is null then 'declaration' else 'accuse_rpva' end,
         preuve_piece_id = p_piece, clos_par = v_uid, clos_le = now()
   where id = t.id;
  if (select d.statut from public.delais d where d.id = t.delai_id) in ('ouvert', 'depasse') then
    v_porte := private.tamila_ouvrir_porte();
    perform private.clore_delai(t.delai_id, 'tenu', null);
    perform private.tamila_fermer_porte(v_porte);
  end if;
  if p_piece is not null then
    update public.tamila_avis set statut = 'applique', effet = 'delai_clos' where piece_id = p_piece and statut = 'a_rattacher';
  end if;
  if p_depose_le > t.echeance_retenue then
    perform private.lever_alerte_module(t.client_id, 'tamila', 'critique', 'Acte déposé après l''échéance du délai',
      jsonb_build_object('delai', t.id, 'dossier', t.dossier_id, 'echeance', t.echeance_retenue, 'depose_le', p_depose_le),
      'delai_hors_delai:' || t.id::text, true, t.responsable_id);
  end if;
  perform private.journaliser_module(t.client_id, 'tamila', 'tamila.delai.clos', 'tamila_dossier', t.dossier_id::text,
    jsonb_build_object('delai', t.id, 'motif', case when p_piece is null then 'declaration' else 'accuse_rpva' end,
                       'depose_le', p_depose_le, 'piece', p_piece));
end $function$


-- ═══ FONCTION private.tamila_declarer_appel
CREATE OR REPLACE FUNCTION private.tamila_declarer_appel(p_dossier uuid, p_introduit_le date, p_role text, p_procedure text DEFAULT 'a_orienter'::text, p_territoire text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_a public.tamila_appels;
  v_territoire text;
  v_nouveau boolean := false;
begin
  v_d := private.tamila_dossier_ecrit(p_dossier, false);
  if p_role is null or p_role not in ('appelant', 'intime', 'intervenant_force', 'intervenant_volontaire') then
    raise exception 'Rôle du client inconnu : %.', coalesce(p_role, 'vide') using errcode = '22023';
  end if;
  if p_procedure is null or p_procedure not in ('a_orienter', 'mise_en_etat', 'bref_delai') then
    raise exception 'Procédure inconnue : %.', coalesce(p_procedure, 'vide') using errcode = '22023';
  end if;
  v_territoire := coalesce(p_territoire, v_d.territoire);
  if v_territoire in ('nouvelle-caledonie', 'polynesie-francaise', 'wallis-et-futuna') then
    raise exception 'Cette cour applique la procédure civile locale : Tamila n''y calcule pas les délais ; saisissez les dates fixées.'
      using errcode = '22023';
  end if;
  if v_territoire is null or v_territoire not in ('metropole', 'alsace-moselle', 'guadeloupe', 'martinique', 'guyane',
       'la-reunion', 'mayotte', 'saint-barthelemy', 'saint-martin', 'saint-pierre-et-miquelon') then
    raise exception 'Précisez le siège de la cour d''appel : son calendrier proroge les délais.' using errcode = '22023';
  end if;
  if p_introduit_le is null or p_introduit_le < date '2017-09-01' then
    raise exception 'Tamila calcule les délais des appels introduits depuis le 01/09/2017 ; pour un appel plus ancien, saisissez les dates.'
      using errcode = '22023';
  end if;
  if p_introduit_le > greatest(private.tamila_aujourdhui(v_territoire), private.tamila_aujourdhui('metropole')) then
    raise exception 'Un appel ne s''introduit pas dans le futur.' using errcode = '22023';
  end if;

  select * into v_a from public.tamila_appels where dossier_id = p_dossier for update;
  if found then
    if v_a.introduit_le <> p_introduit_le and exists (
         select 1 from public.tamila_delais t where t.appel_id = v_a.id and t.nature = 'regle' and t.statut <> 'annule') then
      raise exception 'Des délais sont posés sur cet appel : annulez-les avant de changer sa date.' using errcode = '55000';
    end if;
    update public.tamila_appels
       set introduit_le = p_introduit_le, role_client = p_role, territoire = v_territoire, maj_le = now()
     where id = v_a.id;
    perform private.tamila_orienter(v_a.id, p_procedure);
  else
    insert into public.tamila_appels (client_id, dossier_id, introduit_le, procedure, role_client, territoire, cree_par)
    values (v_d.client_id, p_dossier, p_introduit_le, p_procedure, p_role, v_territoire, v_uid)
    returning * into v_a;
    v_nouveau := true;
  end if;
  select * into v_a from public.tamila_appels where dossier_id = p_dossier;
  -- La déclaration d'appel fait courir ses délais (908 pour l'appelant), sauf ceux déjà échus.
  if v_nouveau then
    perform private.tamila_appliquer_evenement(v_d, v_a, 'declaration_appel', p_introduit_le, null, '{}', v_uid, true);
  end if;
  perform private.tamila_rejouer_avis(p_dossier, v_uid);
  return v_a.id;
end $function$


-- ═══ FONCTION private.tamila_demander_cloture
CREATE OR REPLACE FUNCTION private.tamila_demander_cloture(p_dossier uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_demande uuid;
begin
  select * into v_d from public.tamila_dossiers where id = p_dossier for update;
  if v_uid is null or not found or not private.tamila_voit_dossier_pour(v_uid, v_d.client_id, p_dossier::text) then
    raise exception 'Ce dossier ne vous est pas ouvert.' using errcode = '42501';
  end if;
  if v_d.statut not in ('ouvert', 'audit') then
    raise exception 'Ce dossier n''est pas ouvert.' using errcode = '55000';
  end if;
  if not private.tamila_gere_dossier_pour(v_uid, p_dossier) then
    raise exception 'Seul le responsable du dossier, ou un associé, en demande la clôture.' using errcode = '42501';
  end if;
  select d.id into v_demande from public.demandes_validation d
   where d.client_id = v_d.client_id and d.module = 'tamila' and d.type_action = 'cloturer_dossier'
     and d.objet_id = p_dossier::text and d.statut = 'en_attente';
  if v_demande is not null then
    return v_demande;
  end if;
  v_demande := private.tamila_deposer_demande_systeme(v_d.client_id, v_d.entite_id, 'cloturer_dossier', p_dossier,
    'Clôture d''un dossier et effacement de son contenu',
    jsonb_build_object('dossier_id', p_dossier, 'initiateur', v_uid),
    'tamila:cloture:' || p_dossier::text || ':' || extract(epoch from clock_timestamp())::bigint::text);
  perform private.tamila_executer_demande(v_demande);
  return v_demande;
end $function$


-- ═══ FONCTION private.tamila_demander_export
CREATE OR REPLACE FUNCTION private.tamila_demander_export(p_dossier uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_id uuid;
begin
  select * into v_d from public.tamila_dossiers where id = p_dossier;
  if v_uid is null or not found or not private.tamila_voit_dossier_pour(v_uid, v_d.client_id, p_dossier::text) then
    raise exception 'Ce dossier ne vous est pas ouvert.' using errcode = '42501';
  end if;
  if not private.tamila_lit_dossier_pour(v_uid, v_d.client_id, p_dossier::text) then
    raise exception 'Exporter est une lecture : tracez-la d''abord (consulter le dossier).' using errcode = '42501';
  end if;
  if v_d.statut not in ('attente', 'ouvert', 'audit', 'clos') then
    raise exception 'Ce dossier n''a plus de contenu.' using errcode = '55000';
  end if;
  insert into public.tamila_exports (client_id, dossier_id, demande_par) values (v_d.client_id, p_dossier, v_uid)
  returning id into v_id;
  perform private.deposer_travail(v_d.client_id, 'tamila', 'tamila.exporter',
    jsonb_build_object('export', v_id, 'dossier', p_dossier), 'tamila:exporter:' || v_id::text, 3::smallint);
  return v_id;
end $function$


-- ═══ FONCTION private.tamila_demander_export_cabinet
CREATE OR REPLACE FUNCTION private.tamila_demander_export_cabinet(p_client uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant']) then
    raise exception 'L''export de tous les dossiers est réservé au gérant.' using errcode = '42501';
  end if;
  insert into public.tamila_exports (client_id, dossier_id, demande_par) values (p_client, null, v_uid)
  returning id into v_id;
  perform private.deposer_travail(p_client, 'tamila', 'tamila.exporter',
    jsonb_build_object('export', v_id, 'cabinet', true), 'tamila:exporter:' || v_id::text, 3::smallint);
  -- Les autres associés sont prévenus.
  perform private.lever_alerte_module(p_client => p_client, p_module => 'tamila', p_niveau => 'attention',
    p_titre => 'Un gérant a demandé l''export de tous les dossiers',
    p_detail => jsonb_build_object('export', v_id, 'demandeur', v_uid),
    p_cle => 'export_cabinet:' || v_id::text, p_pour_client => true);
  return v_id;
end $function$


-- ═══ FONCTION private.tamila_demander_levee_muraille
CREATE OR REPLACE FUNCTION private.tamila_demander_levee_muraille(p_muraille uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_m public.tamila_murailles;
  v_d public.tamila_dossiers;
  v_demande uuid;
begin
  select * into v_m from public.tamila_murailles where id = p_muraille for update;
  if v_uid is null or not found then
    raise exception 'Muraille introuvable.' using errcode = '42501';
  end if;
  if v_m.user_id = v_uid then
    raise exception 'La personne écartée ne demande pas elle-même la levée.' using errcode = '42501';
  end if;
  select * into v_d from public.tamila_dossiers where id = v_m.dossier_id;
  if not private.a_un_role(v_m.client_id, array['gerant'])
     or not private.tamila_voit_dossier_pour(v_uid, v_m.client_id, v_m.dossier_id::text) then
    raise exception 'Seul un gérant demande la levée d''une muraille.' using errcode = '42501';
  end if;
  if v_m.leve_le is not null then
    raise exception 'Cette muraille est déjà levée.' using errcode = '55000';
  end if;
  select d.id into v_demande from public.demandes_validation d
   where d.client_id = v_m.client_id and d.module = 'tamila' and d.type_action = 'lever_muraille'
     and d.statut = 'en_attente' and d.payload ->> 'muraille_id' = v_m.id::text;
  if v_demande is not null then
    return v_demande;
  end if;
  v_demande := private.tamila_deposer_demande_systeme(v_m.client_id, v_d.entite_id, 'lever_muraille', v_m.dossier_id,
    'Levée d''une muraille sur un dossier',
    jsonb_build_object('dossier_id', v_m.dossier_id, 'muraille_id', v_m.id, 'initiateur', v_uid),
    'tamila:lever:' || v_m.id::text || ':' || extract(epoch from clock_timestamp())::bigint::text);
  update public.tamila_murailles set demande_levee_id = v_demande where id = v_m.id;
  perform private.tamila_executer_demande(v_demande);
  return v_demande;
end $function$


-- ═══ FONCTION private.tamila_deposer_confirmation
CREATE OR REPLACE FUNCTION private.tamila_deposer_confirmation(p_delai uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t public.tamila_delais;
  v_d public.tamila_dossiers;
  v_article text;
  v_demande uuid;
begin
  select * into t from public.tamila_delais where id = p_delai;
  select * into v_d from public.tamila_dossiers where id = t.dossier_id;
  select p.article into v_article from public.tamila_regles_procedure p where p.code = t.regle_code;
  v_demande := private.tamila_deposer_demande_systeme(t.client_id, v_d.entite_id, 'confirmer_delai', t.dossier_id,
    'Confirmer un délai de procédure : ' || coalesce('CPC, art. ' || v_article, 'date fixée par le juge')
      || ', échéance le ' || to_char(t.echeance_retenue, 'DD/MM/YYYY'),
    jsonb_build_object('delai_id', t.id, 'echeance', t.echeance_retenue, 'regle', t.regle_code, 'depart', t.depart,
                       'acte', t.acte, 'raisons', to_jsonb(t.raisons)),
    'tamila:confirmer:' || t.id::text);
  update public.tamila_delais set demande_id = v_demande where id = t.id;
  return v_demande;
end $function$


-- ═══ FONCTION private.tamila_deposer_demande_systeme
CREATE OR REPLACE FUNCTION private.tamila_deposer_demande_systeme(p_client uuid, p_entite uuid, p_type text, p_dossier uuid, p_resume text, p_payload jsonb, p_cle text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_claims text := current_setting('request.jwt.claims', true);
  v_sub text := current_setting('request.jwt.claim.sub', true);
  v_id uuid;
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('omega.module', 'tamila', true);
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id,
                                          resume, payload, cle_idempotence)
  values (p_client, p_entite, 'tamila', p_type, 'tamila_dossier', p_dossier::text, p_resume, p_payload, p_cle)
  returning id into v_id;
  perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
  perform set_config('request.jwt.claim.sub', coalesce(v_sub, ''), true);
  perform set_config('omega.module', '', true);
  return v_id;
end $function$


-- ═══ FONCTION private.tamila_dossier_ecrit
CREATE OR REPLACE FUNCTION private.tamila_dossier_ecrit(p_dossier uuid, p_avocat boolean)
 RETURNS tamila_dossiers
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
begin
  select * into v_d from public.tamila_dossiers where id = p_dossier for update;
  if v_uid is null then
    if private.tamila_role_session() not in ('service_role', 'postgres') then
      raise exception 'Seul un membre du dossier, ou le serveur, fait ce geste.' using errcode = '42501';
    end if;
    if not found then
      raise exception 'Dossier introuvable.' using errcode = 'P0002';
    end if;
  else
    if not found or not private.tamila_ecrit_dossier_pour(v_uid, v_d.client_id, p_dossier::text) then
      raise exception 'Vous n''écrivez pas dans ce dossier.' using errcode = '42501';
    end if;
    if p_avocat and not private.tamila_est_avocat(v_uid, v_d.client_id) then
      raise exception 'Ce geste revient à un avocat du dossier.' using errcode = '42501';
    end if;
  end if;
  if v_d.statut not in ('attente', 'ouvert', 'audit') then
    raise exception 'Ce dossier n''est pas ouvert.' using errcode = '55000';
  end if;
  return v_d;
end $function$


-- ═══ FONCTION private.tamila_echeance_effacement
CREATE OR REPLACE FUNCTION private.tamila_echeance_effacement(p_depuis timestamp with time zone, p_jours integer, p_fuseau text)
 RETURNS timestamp with time zone
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select greatest(p_depuis,
    ((((p_depuis at time zone p_fuseau)::date + p_jours) + time '03:00') at time zone p_fuseau))
$function$


-- ═══ FONCTION private.tamila_echec_demande
CREATE OR REPLACE FUNCTION private.tamila_echec_demande(p_demande uuid, p_motif text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.demandes_validation set statut = 'echec_execution', motif_echec = p_motif where id = p_demande;
  return 'echec_execution';
end $function$


-- ═══ FONCTION private.tamila_ecrit_dossier_pour
CREATE OR REPLACE FUNCTION private.tamila_ecrit_dossier_pour(p_user uuid, p_client uuid, p_objet_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce((
    select true
    from public.tamila_dossiers d
    join public.comptes c on c.client_id = d.client_id and c.user_id = p_user
    where d.id = private.tamila_uuid(p_objet_id)
      and d.client_id = p_client
      and d.statut in ('attente', 'ouvert', 'audit')
      and c.role <> 'lecteur'
      and private.tamila_voit_dossier_pour(p_user, p_client, p_objet_id)
      and (exists (select 1 from public.tamila_dossiers_membres dm
                   where dm.dossier_id = d.id and dm.user_id = p_user
                     and dm.role_dossier in ('responsable', 'intervenant')
                     and (dm.jusqu_au is null or dm.jusqu_au > now()))
           or (d.perso and d.proprietaire_perso = p_user)
           or (not d.perso and c.role in ('gerant', 'admin')))
  ), false)
$function$


-- ═══ FONCTION private.tamila_effacer_dossier
CREATE OR REPLACE FUNCTION private.tamila_effacer_dossier(p_dossier uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_d public.tamila_dossiers;
  v_demande public.demandes_validation;
  v_motif text;
  v_pieces integer;
  v_pages integer;
  v_octets bigint;
  v_manifeste jsonb;
  v_export text;
  v_socle jsonb;
  v_preuve public.tamila_effacements;
begin
  if (select auth.uid()) is not null or private.tamila_role_session() <> 'service_role' then
    raise exception 'L''effacement d''un dossier est fait par le serveur, à son échéance.' using errcode = '42501';
  end if;
  select * into v_d from public.tamila_dossiers where id = p_dossier for update;
  if not found then
    raise exception 'Dossier introuvable.' using errcode = 'P0002';
  end if;
  if v_d.statut = 'efface' then
    select * into v_preuve from public.tamila_effacements where dossier_id = p_dossier;
    return jsonb_build_object('dossier', p_dossier, 'deja_efface', true, 'preuve', to_jsonb(v_preuve));
  end if;

  if v_d.statut = 'clos' then
    select * into v_demande from public.demandes_validation where id = v_d.demande_cloture_id;
    if not found or v_demande.type_action <> 'cloturer_dossier' or v_demande.statut <> 'executee'
       or v_demande.politique_id is not null then
      raise exception 'Aucune clôture approuvée pour ce dossier.' using errcode = '55000';
    end if;
    v_motif := 'cloture';
  elsif v_d.statut = 'audit' then
    v_motif := 'fin_audit';
  elsif v_d.statut = 'refuse' then
    v_motif := 'ouverture_refusee';
  else
    raise exception 'Ce dossier n''est pas clos : aucune clôture approuvée.' using errcode = '55000';
  end if;
  if v_d.effacement_prevu_le is null or v_d.effacement_prevu_le > now() then
    raise exception 'L''échéance de l''effacement n''est pas atteinte.' using errcode = '55000';
  end if;
  select m.manifeste into v_manifeste from private.manifestes_effacement m
   where m.cle = v_d.client_id::text || '/tamila_dossier/' || v_d.id::text;
  if v_manifeste is null then
    raise exception 'La liste des fichiers n''est pas préparée (preparer_effacement) : rien ne s''efface sans elle.'
      using errcode = '55000';
  end if;

  select count(*), coalesce(sum(p.nb_pages), 0), coalesce(sum(p.octets), 0) into v_pieces, v_pages, v_octets
  from public.pieces p
  where p.client_id = v_d.client_id and p.objet_type = 'tamila_dossier' and p.objet_id = v_d.id::text;
  select e.empreinte_manifeste into v_export from public.tamila_exports e
   where e.dossier_id = v_d.id and e.empreinte_manifeste is not null
   order by e.pret_le desc nulls last limit 1;

  perform set_config('omega.tamila_effacement', v_d.id::text, true);
  v_socle := private.effacer_objet(v_d.client_id, 'tamila_dossier', v_d.id::text, v_d.id::text, 'tamila.' || v_motif);
  perform set_config('omega.tamila_effacement', '', true);

  update public.tamila_dossiers
     set statut = 'efface', reference_chiffree = null, intitule_chiffre = null, numero_rg_chiffre = null,
         juridiction = null, efface_le = now(), motif_effacement = v_motif
   where id = v_d.id;

  insert into public.tamila_effacements (client_id, dossier_id, motif, demande_id, effacement_objet_id, pieces, pages,
                                         octets, fichiers, empreinte_fichiers, empreinte_export)
  values (v_d.client_id, v_d.id, v_motif, case when v_motif = 'cloture' then v_demande.id end,
          (select o.id from public.effacements_objets o
           where o.client_id = v_d.client_id and o.objet_type = 'tamila_dossier' and o.objet_id = v_d.id::text
           order by o.efface_le desc limit 1),
          v_pieces, v_pages, v_octets, coalesce((v_manifeste ->> 'nombre')::integer, 0),
          v_manifeste ->> 'empreinte_sha256', v_export)
  returning * into v_preuve;

  update public.tamila_cles
     set statut = 'desactivee', desactivee_le = now(), destruction_prevue_le = now() + interval '7 days'
   where dossier_id = v_d.id and statut = 'active';

  return jsonb_build_object('dossier', v_d.id, 'preuve', to_jsonb(v_preuve), 'socle', v_socle);
end $function$


-- ═══ FONCTION private.tamila_est_avocat
CREATE OR REPLACE FUNCTION private.tamila_est_avocat(p_user uuid, p_client uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.comptes c
                 where c.user_id = p_user and c.client_id = p_client and c.role in ('gerant', 'admin', 'valideur'))
$function$


-- ═══ FONCTION private.tamila_executer_confirmation
CREATE OR REPLACE FUNCTION private.tamila_executer_confirmation(p_demande uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_porte text;
  v_d public.demandes_validation;
  t public.tamila_delais;
  v_decideur uuid;
  v_echeance date;
  v_modifie boolean;
begin
  select * into v_d from public.demandes_validation where id = p_demande for update;
  if not found or v_d.module <> 'tamila' or v_d.type_action <> 'confirmer_delai' then
    return null;
  end if;
  if v_d.statut not in ('approuvee', 'rejetee') then
    return v_d.statut;
  end if;
  select * into t from public.tamila_delais
   where id = private.tamila_uuid(v_d.payload ->> 'delai_id') and client_id = v_d.client_id and dossier_id::text = v_d.objet_id
   for update;

  if v_d.statut = 'rejetee' then
    -- Rejeté : le délai reste dans la liste ; un avocat saisit la bonne date, ou l'annule.
    if found and t.statut = 'a_confirmer' and t.demande_id = v_d.id then
      update public.tamila_delais set statut = 'rejete' where id = t.id;
      perform private.journaliser_module(t.client_id, 'tamila', 'tamila.delai.rejete', 'tamila_dossier', t.dossier_id::text,
        jsonb_build_object('delai', t.id, 'demande', v_d.id));
    end if;
    return 'rejetee';
  end if;

  if not found then
    return private.tamila_echec_demande(v_d.id, 'Délai introuvable.');
  end if;
  if v_d.politique_id is not null then
    return private.tamila_echec_demande(v_d.id, 'Chaque délai est confirmé par un avocat : un accord permanent ne le couvre pas.');
  end if;
  if exists (select 1 from public.approbations a
             where a.demande_id = v_d.id and a.decision = 'approuve'
               and not (private.tamila_est_avocat(coalesce(a.au_nom_de, a.user_id), v_d.client_id)
                        and private.tamila_voit_dossier_pour(coalesce(a.au_nom_de, a.user_id), v_d.client_id, v_d.objet_id)
                        and private.tamila_voit_dossier_pour(a.user_id, v_d.client_id, v_d.objet_id))) then
    return private.tamila_echec_demande(v_d.id, 'Un délai est confirmé par un avocat qui a accès au dossier.');
  end if;
  if t.statut <> 'a_confirmer'
     or not (t.demande_id = v_d.id or t.demande_id::text is not distinct from (v_d.payload ->> 'remplace')) then
    return private.tamila_echec_demande(v_d.id, 'Ce délai n''attend plus cette confirmation.');
  end if;
  begin
    v_echeance := (v_d.payload ->> 'echeance')::date;
  exception when others then
    v_echeance := null;
  end;
  if v_echeance is null then
    return private.tamila_echec_demande(v_d.id, 'La date à confirmer est illisible.');
  end if;
  v_modifie := v_d.payload ? 'remplace';
  select coalesce(a.au_nom_de, a.user_id) into v_decideur
  from public.approbations a where a.demande_id = v_d.id and a.decision = 'approuve'
  order by a.decide_le desc limit 1;

  if v_echeance <> t.echeance_retenue then
    if (select d.statut from public.delais d where d.id = t.delai_id) not in ('ouvert', 'depasse') then
      return private.tamila_echec_demande(v_d.id, 'Le délai de B5 a été clos hors de Tamila : saisir la date (tamila_corriger_delai).');
    end if;
    v_porte := private.tamila_ouvrir_porte();
    perform private.notifier_delai(t.delai_id, v_echeance, 'Date modifiée par un avocat avant sa confirmation.');
    perform private.tamila_fermer_porte(v_porte);
  end if;
  update public.tamila_delais
     set statut = 'confirme', echeance_retenue = v_echeance, confirme_par = v_decideur, confirme_le = now(),
         confirmation = case when v_modifie then 'modification' else 'approbation' end, demande_id = v_d.id
   where id = t.id;
  update public.demandes_validation set statut = 'executee' where id = v_d.id;
  perform private.journaliser_module(t.client_id, 'tamila', 'tamila.delai.confirme', 'tamila_dossier', t.dossier_id::text,
    jsonb_build_object('delai', t.id, 'echeance', v_echeance, 'par', v_decideur,
                       'confirmation', case when v_modifie then 'modification' else 'approbation' end));
  return 'executee';
end $function$


-- ═══ FONCTION private.tamila_executer_demande
CREATE OR REPLACE FUNCTION private.tamila_executer_demande(p_demande uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_d public.demandes_validation;
  v_dossier public.tamila_dossiers;
  v_decideur uuid;
  v_nouvelle uuid;
begin
  select * into v_d from public.demandes_validation where id = p_demande for update;
  if not found or v_d.module <> 'tamila' then
    return null;
  end if;
  if v_d.type_action = 'confirmer_delai' then
    return private.tamila_executer_confirmation(p_demande);
  end if;
  select * into v_dossier from public.tamila_dossiers
   where id = private.tamila_uuid(v_d.objet_id) and client_id = v_d.client_id for update;

  if v_d.statut = 'approuvee' then
    if v_d.type_action not in ('ouvrir_dossier', 'cloturer_dossier', 'lever_muraille') then
      return v_d.statut;  -- un autre moteur de Tamila l'exécute
    end if;
    -- Une personne pour chaque décision qui engage : jamais un accord permanent.
    if v_d.politique_id is not null and v_d.type_action in ('cloturer_dossier', 'lever_muraille') then
      update public.demandes_validation
         set statut = 'echec_execution',
             motif_echec = 'Cette décision revient à une personne : un accord permanent ne la couvre pas.'
       where id = v_d.id;
      return 'echec_execution';
    end if;
    -- Chaque approbation vient d'une personne qui voit le dossier.
    if exists (select 1 from public.approbations a
               where a.demande_id = v_d.id and a.decision = 'approuve'
                 and not (private.tamila_voit_dossier_pour(coalesce(a.au_nom_de, a.user_id), v_d.client_id, v_d.objet_id)
                          and private.tamila_voit_dossier_pour(a.user_id, v_d.client_id, v_d.objet_id))) then
      update public.demandes_validation
         set statut = 'echec_execution',
             motif_echec = 'Une approbation vient d''une personne qui n''a pas accès au dossier.'
       where id = v_d.id;
      return 'echec_execution';
    end if;
    if v_dossier.id is null then
      update public.demandes_validation set statut = 'echec_execution', motif_echec = 'Dossier introuvable.' where id = v_d.id;
      return 'echec_execution';
    end if;
    select coalesce(a.au_nom_de, a.user_id) into v_decideur
    from public.approbations a where a.demande_id = v_d.id and a.decision = 'approuve'
    order by a.decide_le desc limit 1;

    if v_d.type_action = 'ouvrir_dossier' then
      if v_dossier.statut <> 'attente' then
        update public.demandes_validation set statut = 'echec_execution',
               motif_echec = 'Le dossier n''attend plus son ouverture.' where id = v_d.id;
        return 'echec_execution';
      end if;
      update public.tamila_dossiers set statut = 'ouvert', ouvert_le = now(), ouvert_par = v_decideur
       where id = v_dossier.id;
      -- Les pièces tenues pendant l'attente partent à la lecture.
      update public.pieces set statut = 'recue'
       where client_id = v_d.client_id and module = 'tamila' and objet_type = 'tamila_dossier'
         and objet_id = v_dossier.id::text and statut = 'a_rattacher';
    elsif v_d.type_action = 'cloturer_dossier' then
      if v_dossier.statut not in ('ouvert', 'audit') then
        update public.demandes_validation set statut = 'echec_execution',
               motif_echec = 'Le dossier n''est plus ouvert.' where id = v_d.id;
        return 'echec_execution';
      end if;
      update public.tamila_dossiers
         set statut = 'clos', statut_avant_cloture = v_dossier.statut, clos_le = now(), demande_cloture_id = v_d.id,
             effacement_prevu_le = private.tamila_echeance_effacement(now(),
               (select r.delai_cloture_jours from public.tamila_reglages r where r.client_id = v_d.client_id),
               private.tamila_fuseau(v_dossier.client_id, v_dossier.entite_id))
       where id = v_dossier.id;
    else -- lever_muraille
      update public.tamila_murailles set leve_le = now(), leve_par = v_decideur
       where id = private.tamila_uuid(v_d.payload ->> 'muraille_id') and dossier_id = v_dossier.id and leve_le is null;
      if not found then
        update public.demandes_validation set statut = 'echec_execution',
               motif_echec = 'La muraille est déjà levée.' where id = v_d.id;
        return 'echec_execution';
      end if;
    end if;
    update public.demandes_validation set statut = 'executee' where id = v_d.id;
    return 'executee';

  elsif v_d.statut = 'rejetee' and v_d.type_action = 'ouvrir_dossier' and v_dossier.id is not null
        and v_dossier.statut = 'attente' and v_dossier.demande_ouverture_id = v_d.id then
    if exists (select 1 from public.approbations a
               where a.demande_id = v_d.id and a.decision = 'rejete'
                 and not private.tamila_voit_dossier_pour(coalesce(a.au_nom_de, a.user_id), v_d.client_id, v_d.objet_id)) then
      -- Un refus venu de qui ne voit pas le dossier est écarté : la demande repart.
      v_nouvelle := private.tamila_deposer_demande_systeme(v_d.client_id, v_d.entite_id, 'ouvrir_dossier', v_dossier.id,
        v_d.resume, v_d.payload || jsonb_build_object('remplace', v_d.id),
        'tamila:ouvrir:' || v_dossier.id::text || ':' || extract(epoch from clock_timestamp())::bigint::text);
      update public.tamila_dossiers set demande_ouverture_id = v_nouvelle where id = v_dossier.id;
      perform private.journaliser_module(v_d.client_id, 'tamila', 'tamila.decision.ecartee', 'demandes_validation',
        v_d.id::text, jsonb_build_object('nouvelle', v_nouvelle));
      return 'rejetee';
    end if;
    -- Refusé : le dossier n'a jamais été lu ; il part à l'effacement dès la prochaine ronde.
    update public.tamila_dossiers set statut = 'refuse', effacement_prevu_le = now() where id = v_dossier.id;
    return 'rejetee';
  end if;
  return v_d.statut;
end $function$


-- ═══ FONCTION private.tamila_export_echec
CREATE OR REPLACE FUNCTION private.tamila_export_echec(p_export uuid, p_motif text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is not null or private.tamila_role_session() <> 'service_role' then
    raise exception 'Un échec d''export est déclaré par le serveur.' using errcode = '42501';
  end if;
  update public.tamila_exports set statut = 'echec', motif_echec = p_motif where id = p_export and statut = 'a_preparer';
  if not found then
    raise exception 'Cet export n''est pas en préparation.' using errcode = '55000';
  end if;
end $function$


-- ═══ FONCTION private.tamila_export_pret
CREATE OR REPLACE FUNCTION private.tamila_export_pret(p_export uuid, p_chemin text, p_octets bigint, p_empreinte text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_e public.tamila_exports;
begin
  if (select auth.uid()) is not null or private.tamila_role_session() <> 'service_role' then
    raise exception 'Une archive est déclarée prête par le serveur.' using errcode = '42501';
  end if;
  select * into v_e from public.tamila_exports where id = p_export for update;
  if not found or v_e.statut <> 'a_preparer' then
    raise exception 'Cet export n''est pas en préparation.' using errcode = '55000';
  end if;
  if not starts_with(p_chemin, v_e.client_id::text || case when v_e.dossier_id is null then '/tamila/exports/'
                                 else '/tamila_dossier/' || v_e.dossier_id::text || '/exports/' end) then
    raise exception 'L''archive se range sous le cabinet et son dossier.' using errcode = '22023';
  end if;
  update public.tamila_exports
     set statut = 'pret', chemin = p_chemin, octets = p_octets, empreinte_manifeste = p_empreinte, pret_le = now(),
         expire_le = now() + make_interval(days => (select r.conservation_exports_jours from public.tamila_reglages r
                                                    where r.client_id = v_e.client_id))
   where id = p_export;
end $function$


-- ═══ FONCTION private.tamila_export_purge
CREATE OR REPLACE FUNCTION private.tamila_export_purge(p_export uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_e public.tamila_exports;
begin
  if (select auth.uid()) is not null or private.tamila_role_session() <> 'service_role' then
    raise exception 'La purge d''une archive est faite par le serveur.' using errcode = '42501';
  end if;
  select * into v_e from public.tamila_exports where id = p_export for update;
  if not found or v_e.statut not in ('expire', 'echec') then
    raise exception 'Cette archive n''est pas à purger.' using errcode = '55000';
  end if;
  if v_e.chemin is not null and exists (
       select 1 from storage.objects o join private.buckets_locataires b on b.bucket = o.bucket_id
       where o.name = v_e.chemin) then
    raise exception 'Le fichier de l''archive est encore au coffre : le serveur l''efface d''abord.' using errcode = '55000';
  end if;
  update public.tamila_exports set purge_le = now() where id = p_export;
end $function$


-- ═══ FONCTION private.tamila_fermer_porte
CREATE OR REPLACE FUNCTION private.tamila_fermer_porte(p_avant text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  perform set_config('omega.delai_module', coalesce(p_avant, ''), true);
end $function$


-- ═══ FONCTION private.tamila_fuseau
CREATE OR REPLACE FUNCTION private.tamila_fuseau(p_client uuid, p_entite uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce((select e.fuseau from public.entites e where e.client_id = p_client and e.id = p_entite), 'Europe/Paris')
$function$


-- ═══ FONCTION private.tamila_garder_cle
CREATE OR REPLACE FUNCTION private.tamila_garder_cle()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'DELETE' then
    if old.client_id::text = coalesce(current_setting('omega.effacement_client', true), '') then
      return old;
    end if;
    raise exception 'Une clé de dossier ne se supprime pas : elle se détruit au coffre, et la preuve reste.'
      using errcode = '42501';
  end if;
  if (new.id, new.client_id, new.dossier_id, new.fournisseur, new.reference, new.algorithme, new.creee_le)
     is distinct from (old.id, old.client_id, old.dossier_id, old.fournisseur, old.reference, old.algorithme, old.creee_le) then
    raise exception 'Une clé de dossier ne se retouche pas.' using errcode = '42501';
  end if;
  if new.statut is distinct from old.statut and not (
       (old.statut = 'active' and new.statut = 'desactivee')
    or (old.statut = 'desactivee' and new.statut = 'detruite')) then
    raise exception 'Passage refusé : % vers %.', old.statut, new.statut using errcode = '23514';
  end if;
  if new.enveloppe is distinct from old.enveloppe and new.statut <> 'detruite' then
    raise exception 'L''enveloppe d''une clé ne change qu''à sa destruction.' using errcode = '42501';
  end if;
  return new;
end $function$


-- ═══ FONCTION private.tamila_garder_delai
CREATE OR REPLACE FUNCTION private.tamila_garder_delai()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if old.client_id::text = coalesce(current_setting('omega.effacement_client', true), '')
     or coalesce(current_setting('omega.effacement_objet', true), '') = 'oui' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'DELETE' then
    raise exception 'Un délai de procédure ne se retire pas : il se clôt sur l''acte déposé, ou s''annule avec son motif.'
      using errcode = '42501';
  end if;
  if old.statut in ('clos', 'annule') then
    raise exception 'Ce délai est clos : il ne change plus.' using errcode = '55000';
  end if;
  if (new.id, new.client_id, new.dossier_id, new.nature, new.regle_code, new.regle_version, new.depart, new.territoire,
      new.echeance_calculee, new.cree_le, new.cree_par)
     is distinct from
     (old.id, old.client_id, old.dossier_id, old.nature, old.regle_code, old.regle_version, old.depart, old.territoire,
      old.echeance_calculee, old.cree_le, old.cree_par) then
    raise exception 'Le calcul d''un délai ne se retouche pas : l''avocat corrige la date retenue.' using errcode = '42501';
  end if;
  if new.statut is distinct from old.statut and not (
       (old.statut = 'a_confirmer' and new.statut in ('confirme', 'rejete', 'interrompu', 'clos', 'annule'))
    or (old.statut = 'rejete' and new.statut in ('confirme', 'interrompu', 'clos', 'annule'))
    or (old.statut = 'confirme' and new.statut in ('interrompu', 'clos', 'annule'))
    or (old.statut = 'interrompu' and new.statut in ('confirme', 'clos', 'annule'))) then
    raise exception 'Passage refusé : % vers %.', old.statut, new.statut using errcode = '23514';
  end if;
  new.maj_le := now();
  return new;
end $function$


-- ═══ FONCTION private.tamila_garder_dossier
CREATE OR REPLACE FUNCTION private.tamila_garder_dossier()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if old.client_id::text = coalesce(current_setting('omega.effacement_client', true), '') then
    return old;
  end if;
  if coalesce(current_setting('omega.tamila_effacement', true), '') = old.id::text then
    return null;
  end if;
  raise exception 'Un dossier Tamila ne s''efface que par sa clôture approuvée, à son échéance.'
    using errcode = '42501';
end $function$


-- ═══ FONCTION private.tamila_gere_dossier_pour
CREATE OR REPLACE FUNCTION private.tamila_gere_dossier_pour(p_user uuid, p_dossier uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce((
    select true
    from public.tamila_dossiers d
    join public.comptes c on c.client_id = d.client_id and c.user_id = p_user
    where d.id = p_dossier
      and d.statut in ('attente', 'ouvert', 'audit')
      and private.tamila_voit_dossier_pour(p_user, d.client_id, d.id::text)
      and (exists (select 1 from public.tamila_dossiers_membres dm
                   where dm.dossier_id = d.id and dm.user_id = p_user and dm.role_dossier = 'responsable'
                     and (dm.jusqu_au is null or dm.jusqu_au > now()))
           or (d.perso and d.proprietaire_perso = p_user)
           or (not d.perso and c.role in ('gerant', 'admin')))
  ), false)
$function$


-- ═══ FONCTION private.tamila_installer
CREATE OR REPLACE FUNCTION private.tamila_installer(p_client uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_fuseau text;
begin
  if not exists (select 1 from public.clients where id = p_client) then
    raise exception 'Cabinet introuvable.' using errcode = 'P0002';
  end if;
  if v_uid is null then
    if private.tamila_role_session() not in ('service_role', 'postgres') then
      raise exception 'Seul un gérant, ou Omega, installe Tamila.' using errcode = '42501';
    end if;
  elsif not private.a_un_role(p_client, array['gerant']) then
    raise exception 'Seul un gérant, ou Omega, installe Tamila.' using errcode = '42501';
  end if;

  insert into public.tamila_reglages (client_id) values (p_client) on conflict (client_id) do nothing;

  -- La clôture revient aux associés ; la levée d'une muraille, au gérant ; la
  -- confirmation d'un délai, à un avocat.
  insert into public.regles_validation (client_id, module, type_action, roles_autorises, approbations_requises)
  select p_client, 'tamila', t.type_action, t.roles, 1
  from (values ('cloturer_dossier', array['gerant', 'admin']), ('lever_muraille', array['gerant']),
               ('confirmer_delai', array['gerant', 'admin', 'valideur'])) t(type_action, roles)
  where not exists (select 1 from public.regles_validation r
                    where r.client_id = p_client and r.module = 'tamila' and r.type_action = t.type_action);

  select e.fuseau into v_fuseau from public.entites e where e.client_id = p_client and e.principale;
  perform private.regler_battement(p_client, 'tamila_coffre', interval '2 hours', null, coalesce(v_fuseau, 'Europe/Paris'));
  perform private.regler_battement(p_client, 'tamila_delais', interval '2 hours', null, coalesce(v_fuseau, 'Europe/Paris'));
end $function$


-- ═══ FONCTION private.tamila_interrompre
CREATE OR REPLACE FUNCTION private.tamila_interrompre(p_delai uuid, p_motif text, p_depuis date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_porte text;
  t public.tamila_delais;
begin
  select * into t from public.tamila_delais where id = p_delai for update;
  if t.statut not in ('a_confirmer', 'confirme', 'rejete') then
    raise exception 'Ce délai ne court pas : il ne s''interrompt pas.' using errcode = '55000';
  end if;
  if t.nature <> 'regle' or not exists (select 1 from public.tamila_regles_procedure p
                                        where p.code = t.regle_code and p.interruptible) then
    raise exception 'Seuls les délais pour conclure s''interrompent (art. 915-3 ; ancien art. 910-2).' using errcode = '22023';
  end if;
  if p_motif is null or p_motif not in ('mediation', 'conciliation', 'procedure_participative', 'mise_en_etat_simplifiee',
                                        'audience_reglement_amiable', 'a_preciser') then
    raise exception 'Cause d''interruption inconnue : %.', coalesce(p_motif, 'vide') using errcode = '22023';
  end if;
  if p_depuis is null or p_depuis > greatest(private.tamila_aujourdhui(t.territoire), private.tamila_aujourdhui('metropole')) then
    raise exception 'L''interruption part d''une date passée ou du jour.' using errcode = '22023';
  end if;
  perform private.tamila_annuler_confirmation(t.id);
  update public.tamila_delais set statut = 'interrompu', interrompu_le = p_depuis, motif_interruption = p_motif where id = t.id;
  if (select d.statut from public.delais d where d.id = t.delai_id) in ('ouvert', 'depasse') then
    v_porte := private.tamila_ouvrir_porte();
    perform private.clore_delai(t.delai_id, 'annule',
      'Interrompu (CPC, art. 915-3) : ' || private.tamila_libelle(p_motif) || ' ; l''avocat saisit la nouvelle échéance.');
    perform private.tamila_fermer_porte(v_porte);
  end if;
  perform private.journaliser_module(t.client_id, 'tamila', 'tamila.delai.interrompu', 'tamila_dossier', t.dossier_id::text,
    jsonb_build_object('delai', t.id, 'motif', p_motif, 'depuis', p_depuis));
end $function$


-- ═══ FONCTION private.tamila_interrompre_delai
CREATE OR REPLACE FUNCTION private.tamila_interrompre_delai(p_delai uuid, p_motif text, p_depuis date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t public.tamila_delais;
begin
  select * into t from public.tamila_delais where id = p_delai;
  if not found then
    raise exception 'Délai introuvable.' using errcode = '42501';
  end if;
  perform private.tamila_dossier_ecrit(t.dossier_id, true);
  perform private.tamila_interrompre(p_delai, p_motif, p_depuis);
end $function$


-- ═══ FONCTION private.tamila_libelle
CREATE OR REPLACE FUNCTION private.tamila_libelle(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case p
    when 'signifier_declaration' then 'Signifier la déclaration d''appel'
    when 'conclure' then 'Remettre ses conclusions au greffe et les notifier'
    when 'signifier_conclusions' then 'Signifier les conclusions aux parties non constituées'
    when 'autre' then 'Accomplir l''acte fixé par le juge'
    when 'calcul_errone' then 'calcul à reprendre'
    when 'date_notifiee' then 'date notifiée par le greffe'
    when 'delai_modifie_par_le_juge' then 'délai modifié par le juge (art. 911, al. 2, et 906-2, al. 6)'
    when 'reprise_apres_interruption' then 'reprise après interruption'
    when 'desistement' then 'désistement'
    when 'caducite_prononcee' then 'caducité prononcée'
    when 'irrecevabilite_prononcee' then 'irrecevabilité prononcée'
    when 'radiation' then 'radiation'
    when 'procedure_changee' then 'la procédure a changé'
    when 'erreur' then 'délai posé par erreur'
    when 'doublon' then 'doublon'
    when 'mediation' then 'médiation'
    when 'conciliation' then 'conciliation'
    when 'procedure_participative' then 'convention de procédure participative'
    when 'mise_en_etat_simplifiee' then 'convention de mise en état simplifiée'
    when 'audience_reglement_amiable' then 'audience de règlement amiable'
    when 'a_preciser' then 'cause à préciser'
    else p end
$function$


-- ═══ FONCTION private.tamila_lieu_conservation
CREATE OR REPLACE FUNCTION private.tamila_lieu_conservation()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce((select r.valeur from private.reglages r where r.cle = 'tamila_lieu_conservation'),
                  'non renseigné')
$function$


-- ═══ FONCTION private.tamila_lit_dossier_pour
CREATE OR REPLACE FUNCTION private.tamila_lit_dossier_pour(p_user uuid, p_client uuid, p_objet_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select private.tamila_voit_dossier_pour(p_user, p_client, p_objet_id)
     and exists (select 1 from public.lectures l
                 where l.client_id = p_client and l.objet_type = 'tamila_dossier' and l.objet_id = p_objet_id
                   and l.user_id = p_user and l.lu_le > now() - interval '30 minutes')
$function$


-- ═══ FONCTION private.tamila_modifier_partie
CREATE OR REPLACE FUNCTION private.tamila_modifier_partie(p_partie uuid, p_nom bytea DEFAULT NULL::bytea, p_qualite text DEFAULT NULL::text, p_residence text DEFAULT NULL::text, p_role_procedure text DEFAULT NULL::text, p_courriels bytea DEFAULT NULL::bytea)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_p public.tamila_parties;
begin
  select * into v_p from public.tamila_parties where id = p_partie for update;
  if v_uid is null or not found or not private.tamila_ecrit_dossier_pour(v_uid, v_p.client_id, v_p.dossier_id::text) then
    raise exception 'Vous n''écrivez pas dans ce dossier.' using errcode = '42501';
  end if;
  update public.tamila_parties
     set nom_chiffre = coalesce(p_nom, nom_chiffre), qualite = coalesce(p_qualite, qualite),
         residence = coalesce(p_residence, residence), role_procedure = coalesce(p_role_procedure, role_procedure),
         courriels_chiffres = coalesce(p_courriels, courriels_chiffres)
   where id = p_partie;
end $function$


-- ═══ FONCTION private.tamila_orienter
CREATE OR REPLACE FUNCTION private.tamila_orienter(p_appel uuid, p_procedure text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_procedure is null or p_procedure not in ('a_orienter', 'mise_en_etat', 'bref_delai') then
    raise exception 'Procédure inconnue : %.', coalesce(p_procedure, 'vide') using errcode = '22023';
  end if;
  update public.tamila_appels set procedure = p_procedure, maj_le = now() where id = p_appel and procedure <> p_procedure;
  update public.tamila_delais t
     set raisons = array(select r from (select distinct r from unnest(t.raisons || 'procedure_changee'::text) r) x
                         order by r collate "C")
    from public.tamila_regles_procedure p
   where t.appel_id = p_appel and t.regle_code = p.code and not (p_procedure = any (p.procedures))
     and t.statut in ('a_confirmer', 'confirme', 'rejete') and not ('procedure_changee' = any (t.raisons));
end $function$


-- ═══ FONCTION private.tamila_orienter_appel
CREATE OR REPLACE FUNCTION private.tamila_orienter_appel(p_dossier uuid, p_procedure text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_a public.tamila_appels;
begin
  perform private.tamila_dossier_ecrit(p_dossier, false);
  select * into v_a from public.tamila_appels where dossier_id = p_dossier for update;
  if not found then
    raise exception 'Déclarez d''abord l''appel du dossier.' using errcode = 'P0002';
  end if;
  perform private.tamila_orienter(v_a.id, p_procedure);
end $function$


-- ═══ FONCTION private.tamila_ouvrir_porte
CREATE OR REPLACE FUNCTION private.tamila_ouvrir_porte()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_avant text := current_setting('omega.delai_module', true);
begin
  perform set_config('omega.delai_module', 'tamila', true);
  return v_avant;
end $function$


-- ═══ FONCTION private.tamila_poser
CREATE OR REPLACE FUNCTION private.tamila_poser(p_dossier tamila_dossiers, p_appel tamila_appels, p_regle text, p_depart date, p_residence text, p_avis uuid, p_raisons text[], p_uid uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_porte text;
  p public.tamila_regles_procedure;
  v_calcul jsonb;
  v_echeance date;
  v_b5 uuid;
  v_id uuid;
begin
  select * into p from public.tamila_regles_procedure where code = p_regle;
  if not found then
    raise exception 'Règle de procédure inconnue : %.', coalesce(p_regle, 'vide') using errcode = '22023';
  end if;
  if p.regime <> p_appel.regime then
    raise exception 'La règle % est celle des appels introduits %, l''appel du dossier a été introduit le % (décret n° 2023-1391, art. 16).',
      p_regle, case p.regime when 'cpc' then 'depuis le 01/09/2024' else 'avant le 01/09/2024' end,
      to_char(p_appel.introduit_le, 'DD/MM/YYYY') using errcode = '22023';
  end if;
  if not (p_appel.procedure = any (p.procedures)) then
    raise exception 'La règle % vaut pour la procédure %, l''appel est en procédure « % » : déclarez d''abord son orientation.',
      p_regle, array_to_string(p.procedures, ' ou '), p_appel.procedure using errcode = '22023';
  end if;
  if p_depart is null or p_depart < p_appel.introduit_le then
    raise exception 'Un délai de l''appel ne part pas avant la déclaration d''appel (%).', to_char(p_appel.introduit_le, 'DD/MM/YYYY')
      using errcode = '22023';
  end if;
  v_calcul := private.tamila_calculer_delai(p_regle, p_depart, p_appel.territoire, p_residence);
  v_echeance := (v_calcul ->> 'echeance')::date;

  -- Le délai de B5 : la règle, l'augmentation (lot 16), son calcul et ses rappels.
  v_porte := private.tamila_ouvrir_porte();
  v_b5 := private.poser_delai(p_dossier.client_id, 'tamila', 'tamila_dossier', p_dossier.id::text,
    p.libelle_court || ' (CPC, art. ' || p.article || ')', p_regle, p_depart, p_appel.territoire, '{7,2,0}',
    p_dossier.responsable_id, private.tamila_libelle(p.acte),
    'tamila:' || p_dossier.id::text || ':' || p_regle || ':' || p_depart::text,
    (v_calcul ->> 'augmentation_mois')::integer);
  perform private.tamila_fermer_porte(v_porte);
  select t.id into v_id from public.tamila_delais t where t.delai_id = v_b5;
  if v_id is not null then
    return v_id;
  end if;
  if (select d.echeance from public.delais d where d.id = v_b5) <> v_echeance then
    raise exception 'B5 et Tamila divergent pour % au % : le délai n''est pas posé.', p_regle, p_depart using errcode = 'XX000';
  end if;

  insert into public.tamila_delais (client_id, dossier_id, appel_id, avis_id, delai_id, nature, regle_code, regle_version, acte,
    depart, territoire, residence, augmentation_mois, motif_augmentation, echeance_calculee, echeance_retenue, raisons, calcul,
    statut, responsable_id, cree_par)
  values (p_dossier.client_id, p_dossier.id, p_appel.id, p_avis, v_b5, 'regle', p_regle, (v_calcul ->> 'version')::smallint,
    p.acte, p_depart, p_appel.territoire, p_residence, (v_calcul ->> 'augmentation_mois')::smallint,
    v_calcul ->> 'motif_augmentation', v_echeance, v_echeance,
    array(select r from (select distinct r from unnest(array(select jsonb_array_elements_text(v_calcul -> 'raisons'))
                                                        || coalesce(p_raisons, '{}')) r) x
          order by r collate "C"),
    v_calcul, 'a_confirmer', p_dossier.responsable_id, p_uid)
  returning id into v_id;
  perform private.tamila_deposer_confirmation(v_id);
  return v_id;
end $function$


-- ═══ FONCTION private.tamila_poser_date
CREATE OR REPLACE FUNCTION private.tamila_poser_date(p_dossier uuid, p_echeance date, p_acte text DEFAULT 'autre'::text, p_source text DEFAULT 'saisie'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
begin
  v_d := private.tamila_dossier_ecrit(p_dossier, false);
  return private.tamila_poser_date_fixee(v_d,
    coalesce((select a.territoire from public.tamila_appels a where a.dossier_id = p_dossier), v_d.territoire, 'metropole'),
    p_echeance, p_acte, p_source, null, '{}', v_uid,
    v_uid is not null and private.tamila_est_avocat(v_uid, v_d.client_id));
end $function$


-- ═══ FONCTION private.tamila_poser_date_fixee
CREATE OR REPLACE FUNCTION private.tamila_poser_date_fixee(p_dossier tamila_dossiers, p_territoire text, p_echeance date, p_acte text, p_source text, p_avis uuid, p_raisons text[], p_uid uuid, p_confirme boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_porte text;
  v_b5 uuid;
  v_id uuid;
begin
  if p_echeance is null then
    raise exception 'La date fixée est nécessaire.' using errcode = '22023';
  end if;
  if p_acte is null or p_acte not in ('signifier_declaration', 'conclure', 'signifier_conclusions', 'autre') then
    raise exception 'Acte inconnu : %.', coalesce(p_acte, 'vide') using errcode = '22023';
  end if;
  if p_source is null or p_source not in ('calendrier_de_procedure', 'ordonnance', 'avis', 'saisie') then
    raise exception 'Source inconnue : %.', coalesce(p_source, 'vide') using errcode = '22023';
  end if;
  v_porte := private.tamila_ouvrir_porte();
  v_b5 := private.poser_delai_date(p_dossier.client_id, 'tamila', 'tamila_dossier', p_dossier.id::text,
    'Date fixée par le juge : ' || lower(private.tamila_libelle(p_acte)), p_echeance,
    case p_source when 'calendrier_de_procedure' then 'Calendrier de procédure'
                  when 'ordonnance' then 'Ordonnance du conseiller de la mise en état'
                  when 'avis' then 'Avis du greffe' else 'Saisie au dossier' end,
    p_territoire, '{7,2,0}', p_dossier.responsable_id, private.tamila_libelle(p_acte),
    'tamila:' || p_dossier.id::text || ':date:' || p_echeance::text || ':' || p_acte || ':' || coalesce(p_avis::text, 'saisie'));
  perform private.tamila_fermer_porte(v_porte);
  select t.id into v_id from public.tamila_delais t where t.delai_id = v_b5;
  if v_id is not null then
    return v_id;
  end if;
  insert into public.tamila_delais (client_id, dossier_id, appel_id, avis_id, delai_id, nature, acte, territoire, echeance_retenue,
    raisons, source_date, statut, confirme_par, confirme_le, confirmation, responsable_id, cree_par)
  values (p_dossier.client_id, p_dossier.id, (select a.id from public.tamila_appels a where a.dossier_id = p_dossier.id), p_avis,
    v_b5, 'date_fixee', p_acte, p_territoire, p_echeance, coalesce(p_raisons, '{}'), p_source,
    case when p_confirme then 'confirme' else 'a_confirmer' end,
    case when p_confirme then p_uid end, case when p_confirme then now() end, case when p_confirme then 'saisie' end,
    p_dossier.responsable_id, p_uid)
  returning id into v_id;
  if not p_confirme then
    perform private.tamila_deposer_confirmation(v_id);
  end if;
  return v_id;
end $function$


-- ═══ FONCTION private.tamila_poser_delai
CREATE OR REPLACE FUNCTION private.tamila_poser_delai(p_dossier uuid, p_regle text, p_depart date, p_residence text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_d public.tamila_dossiers;
  v_a public.tamila_appels;
begin
  v_d := private.tamila_dossier_ecrit(p_dossier, false);
  select * into v_a from public.tamila_appels where dossier_id = p_dossier;
  if not found then
    raise exception 'Déclarez d''abord l''appel du dossier : sa date fixe le régime des délais.' using errcode = 'P0002';
  end if;
  return private.tamila_poser(v_d, v_a, p_regle, p_depart,
    coalesce(p_residence, private.tamila_residence_client(p_dossier, v_a.territoire)), null, '{}', (select auth.uid()));
end $function$


-- ═══ FONCTION private.tamila_poser_muraille
CREATE OR REPLACE FUNCTION private.tamila_poser_muraille(p_dossier uuid, p_user uuid, p_motif bytea DEFAULT NULL::bytea)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_id uuid;
begin
  select * into v_d from public.tamila_dossiers where id = p_dossier for update;
  if v_uid is null or not found or not private.a_un_role(v_d.client_id, array['gerant'])
     or not private.tamila_voit_dossier_pour(v_uid, v_d.client_id, p_dossier::text) then
    raise exception 'Seul un gérant pose une muraille, sur un dossier qu''il voit.' using errcode = '42501';
  end if;
  if p_user = v_uid then
    raise exception 'Un gérant ne se met pas lui-même derrière une muraille : un autre gérant la pose.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.comptes c where c.user_id = p_user and c.client_id = v_d.client_id) then
    raise exception 'Cette personne n''est pas membre du cabinet.' using errcode = '23503';
  end if;
  if v_d.perso and p_user = v_d.proprietaire_perso then
    raise exception 'Le titulaire d''une clientèle personnelle ne s''écarte pas de son dossier.' using errcode = '22023';
  end if;
  select m.id into v_id from public.tamila_murailles m
   where m.dossier_id = p_dossier and m.user_id = p_user and m.leve_le is null;
  if v_id is not null then
    return v_id;
  end if;
  if exists (select 1 from public.tamila_dossiers_membres dm
             where dm.dossier_id = p_dossier and dm.user_id = p_user and dm.role_dossier = 'responsable')
     and not exists (select 1 from public.tamila_dossiers_membres o
                     where o.dossier_id = p_dossier and o.user_id <> p_user and o.role_dossier = 'responsable'
                       and (o.jusqu_au is null or o.jusqu_au > now())) then
    raise exception 'Cette personne est le seul responsable du dossier : désignez-en un autre d''abord.' using errcode = '23514';
  end if;
  delete from public.tamila_dossiers_membres where dossier_id = p_dossier and user_id = p_user;
  if v_d.responsable_id = p_user then
    update public.tamila_dossiers
       set responsable_id = (select o.user_id from public.tamila_dossiers_membres o
                             where o.dossier_id = p_dossier and o.role_dossier = 'responsable'
                             order by o.ajoute_le limit 1)
     where id = p_dossier;
  end if;
  insert into public.tamila_murailles (client_id, dossier_id, user_id, motif_chiffre, pose_par)
  values (v_d.client_id, p_dossier, p_user, p_motif, v_uid)
  returning id into v_id;
  return v_id;
end $function$


-- ═══ FONCTION private.tamila_preuves_immuables
CREATE OR REPLACE FUNCTION private.tamila_preuves_immuables()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'DELETE' and old.client_id::text = coalesce(current_setting('omega.effacement_client', true), '') then
    return old;
  end if;
  raise exception 'La preuve d''un effacement ne se modifie pas et ne s''efface pas.' using errcode = '42501';
end $function$


-- ═══ FONCTION private.tamila_registre_hors_vue
CREATE OR REPLACE FUNCTION private.tamila_registre_hors_vue(p_client uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Ce compte revient aux associés.' using errcode = '42501';
  end if;
  return (select count(*)::integer from public.tamila_dossiers d
          where d.client_id = p_client and d.statut in ('attente', 'ouvert', 'audit', 'clos')
            and not private.tamila_voit_dossier_pour(v_uid, p_client, d.id::text));
end $function$


-- ═══ FONCTION private.tamila_rejouer_avis
CREATE OR REPLACE FUNCTION private.tamila_rejouer_avis(p_dossier uuid, p_uid uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r record; n integer := 0;
begin
  for r in
    select a.id from public.tamila_avis a
    where a.dossier_id = p_dossier and a.statut = 'sans_effet' and a.effet in ('appel_a_declarer', 'juridiction_a_preciser')
    order by a.date_avis, a.cree_le
  loop
    perform private.tamila_appliquer_avis(r.id, p_uid);
    n := n + 1;
  end loop;
  return n;
end $function$


-- ═══ FONCTION private.tamila_residence_client
CREATE OR REPLACE FUNCTION private.tamila_residence_client(p_dossier uuid, p_territoire text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(
    (select 'inconnue'::text from public.tamila_parties pt
     where pt.dossier_id = p_dossier and pt.qualite = 'client' and pt.residence = 'inconnue' limit 1),
    (select pt.residence from public.tamila_parties pt
     cross join lateral private.tamila_augmentation(p_territoire, pt.residence) a
     where pt.dossier_id = p_dossier and pt.qualite = 'client'
     order by a.mois, pt.residence limit 1),
    'inconnue')
$function$


-- ═══ FONCTION private.tamila_retirer_membre
CREATE OR REPLACE FUNCTION private.tamila_retirer_membre(p_dossier uuid, p_user uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_m public.tamila_dossiers_membres;
begin
  select * into v_d from public.tamila_dossiers where id = p_dossier for update;
  if v_uid is null or not found or not private.tamila_voit_dossier_pour(v_uid, v_d.client_id, p_dossier::text) then
    raise exception 'Ce dossier ne vous est pas ouvert.' using errcode = '42501';
  end if;
  if p_user <> v_uid and not private.tamila_gere_dossier_pour(v_uid, p_dossier) then
    raise exception 'Seul le responsable du dossier, ou un associé, en retire quelqu''un.' using errcode = '42501';
  end if;
  select * into v_m from public.tamila_dossiers_membres where dossier_id = p_dossier and user_id = p_user;
  if not found then
    raise exception 'Cette personne n''est pas membre du dossier.' using errcode = 'P0002';
  end if;
  if v_d.perso and p_user = v_d.proprietaire_perso then
    raise exception 'Le titulaire d''une clientèle personnelle reste membre de son dossier.' using errcode = '23514';
  end if;
  if v_m.role_dossier = 'responsable' and not exists (
       select 1 from public.tamila_dossiers_membres o
       where o.dossier_id = p_dossier and o.user_id <> p_user and o.role_dossier = 'responsable'
         and (o.jusqu_au is null or o.jusqu_au > now())) then
    raise exception 'Le dossier garde toujours un responsable : désignez-en un autre d''abord.' using errcode = '23514';
  end if;
  delete from public.tamila_dossiers_membres where id = v_m.id;
  if v_d.responsable_id = p_user then
    update public.tamila_dossiers
       set responsable_id = (select o.user_id from public.tamila_dossiers_membres o
                             where o.dossier_id = p_dossier and o.role_dossier = 'responsable'
                             order by o.ajoute_le limit 1)
     where id = p_dossier;
  end if;
end $function$


-- ═══ FONCTION private.tamila_retirer_partie
CREATE OR REPLACE FUNCTION private.tamila_retirer_partie(p_partie uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_p public.tamila_parties;
begin
  select * into v_p from public.tamila_parties where id = p_partie for update;
  if v_uid is null or not found or not private.tamila_ecrit_dossier_pour(v_uid, v_p.client_id, v_p.dossier_id::text) then
    raise exception 'Vous n''écrivez pas dans ce dossier.' using errcode = '42501';
  end if;
  delete from public.tamila_parties where id = p_partie;
end $function$


-- ═══ FONCTION private.tamila_role_session
CREATE OR REPLACE FUNCTION private.tamila_role_session()
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(nullif(current_setting('role', true), 'none'), session_user::text)
$function$


-- ═══ FONCTION private.tamila_tache_horaire
CREATE OR REPLACE FUNCTION private.tamila_tache_horaire(p_maintenant timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  v_effacements integer := 0;
  v_retards integer := 0;
  v_cles integer := 0;
  v_exports integer := 0;
  v_acces integer := 0;
  v_decisions integer := 0;
begin
  -- Les décisions qu'aucun événement n'aurait portées.
  v_decisions := private.tamila_balayer_decisions();

  -- Les effacements échus partent à l'ouvrier ; échus depuis plus de 24 h, une alerte critique.
  for r in
    select d.id, d.client_id, d.effacement_prevu_le from public.tamila_dossiers d
    where d.statut in ('clos', 'audit', 'refuse') and d.effacement_prevu_le <= p_maintenant
  loop
    perform private.deposer_travail(r.client_id, 'tamila', 'tamila.effacer_dossier',
      jsonb_build_object('dossier', r.id), 'tamila:effacer:' || r.id::text, 5::smallint);
    v_effacements := v_effacements + 1;
    if r.effacement_prevu_le < p_maintenant - interval '24 hours' then
      perform private.lever_alerte_module(p_client => r.client_id, p_module => 'tamila', p_niveau => 'critique',
        p_titre => 'Effacement de dossier en retard de plus de 24 heures',
        p_detail => jsonb_build_object('dossier', r.id, 'echeance', r.effacement_prevu_le),
        p_cle => 'effacement_retard:' || r.id::text, p_pour_client => false);
      v_retards := v_retards + 1;
    end if;
  end loop;

  -- Les clés désactivées depuis sept jours se détruisent au coffre.
  for r in
    select k.dossier_id, k.client_id from public.tamila_cles k
    where k.statut = 'desactivee' and k.destruction_prevue_le <= p_maintenant
  loop
    perform private.deposer_travail(r.client_id, 'tamila', 'tamila.detruire_cle',
      jsonb_build_object('dossier', r.dossier_id), 'tamila:cle:' || r.dossier_id::text, 5::smallint);
    v_cles := v_cles + 1;
  end loop;

  -- Les archives échues se purgent.
  for r in
    update public.tamila_exports set statut = 'expire'
     where statut = 'pret' and expire_le <= p_maintenant
    returning id, client_id, chemin
  loop
    perform private.deposer_travail(r.client_id, 'tamila', 'tamila.purger_export',
      jsonb_build_object('export', r.id, 'chemin', r.chemin), 'tamila:purger:' || r.id::text, 0::smallint);
    v_exports := v_exports + 1;
  end loop;

  -- Les accès bornés échus sont retirés (journalisés comme toute sortie).
  delete from public.tamila_dossiers_membres where jusqu_au is not null and jusqu_au <= p_maintenant;
  get diagnostics v_acces = row_count;

  -- Le battement de chaque cabinet, même sans rien à faire.
  for r in select g.client_id from public.tamila_reglages g loop
    perform private.battre(r.client_id, 'tamila_coffre',
      jsonb_build_object('effacements_dus', v_effacements, 'cles_a_detruire', v_cles), null);
  end loop;

  return jsonb_build_object('effacements', v_effacements, 'retards', v_retards, 'cles', v_cles,
                            'exports', v_exports, 'acces_retires', v_acces, 'decisions_rattrapees', v_decisions);
end $function$


-- ═══ FONCTION private.tamila_telecharger_export
CREATE OR REPLACE FUNCTION private.tamila_telecharger_export(p_export uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_e public.tamila_exports;
begin
  select * into v_e from public.tamila_exports where id = p_export for update;
  if v_uid is null or not found
     or (v_e.dossier_id is null and not private.a_un_role(v_e.client_id, array['gerant']))
     or (v_e.dossier_id is not null and not private.tamila_voit_dossier_pour(v_uid, v_e.client_id, v_e.dossier_id::text)) then
    raise exception 'Cet export ne vous est pas ouvert.' using errcode = '42501';
  end if;
  if v_e.statut <> 'pret' or v_e.expire_le <= now() then
    raise exception 'Cette archive n''est pas disponible.' using errcode = '55000';
  end if;
  if v_e.dossier_id is not null then
    perform private.tracer_lecture(v_e.client_id, 'tamila_dossier', v_e.dossier_id::text, 'export.telechargement');
  end if;
  update public.tamila_exports set telechargements = telechargements + 1, telecharge_le = now() where id = p_export;
  return v_e.chemin;
end $function$


-- ═══ FONCTION private.tamila_traiter_decisions
CREATE OR REPLACE FUNCTION private.tamila_traiter_decisions()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r public.travaux;
  v text;
  n integer := 0;
begin
  for r in select * from private.prendre_travaux(array['tamila.decision'], 100, interval '5 minutes', 'tamila-base') loop
    begin
      v := private.tamila_executer_demande(private.tamila_uuid(r.charge ->> 'demande'));
      perform private.finir_travail(r.id, jsonb_build_object('statut', v));
    exception when others then
      perform private.echouer_travail(r.id, left(sqlerrm, 500));
    end;
    n := n + 1;
  end loop;
  return n;
end $function$


-- ═══ FONCTION private.tamila_uuid
CREATE OR REPLACE FUNCTION private.tamila_uuid(p text)
 RETURNS uuid
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
begin
  return p::uuid;
exception when invalid_text_representation then
  return null;
end $function$


-- ═══ FONCTION private.tamila_voit_dossier_pour
CREATE OR REPLACE FUNCTION private.tamila_voit_dossier_pour(p_user uuid, p_client uuid, p_objet_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce((
    select true
    from public.tamila_dossiers d
    join public.comptes c on c.client_id = d.client_id and c.user_id = p_user
    where d.id = private.tamila_uuid(p_objet_id)
      and d.client_id = p_client
      and not exists (select 1 from public.tamila_murailles m
                      where m.dossier_id = d.id and m.user_id = p_user and m.leve_le is null)
      and (exists (select 1 from public.tamila_dossiers_membres dm
                   where dm.dossier_id = d.id and dm.user_id = p_user
                     and (dm.jusqu_au is null or dm.jusqu_au > now()))
           or (d.perso and d.proprietaire_perso = p_user)
           or (not d.perso and c.role in ('gerant', 'admin')
               and private.perimetre_couvre(p_user, d.client_id, d.entite_id)))
  ), false)
$function$


-- ═══ FONCTION public.tamila_ajouter_audience
CREATE OR REPLACE FUNCTION public.tamila_ajouter_audience(p_dossier uuid, p_date_heure timestamp with time zone, p_nature text DEFAULT 'audience'::text, p_juridiction text DEFAULT NULL::text, p_chambre text DEFAULT NULL::text, p_avocat uuid DEFAULT NULL::uuid, p_heure_connue boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.tamila_ajouter_audience(p_dossier, p_date_heure, p_nature, p_juridiction, p_chambre, p_avocat, p_heure_connue)
$function$


-- ═══ FONCTION public.tamila_ajouter_membre
CREATE OR REPLACE FUNCTION public.tamila_ajouter_membre(p_dossier uuid, p_user uuid, p_role text DEFAULT 'intervenant'::text, p_jusqu_au timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.tamila_ajouter_membre(p_dossier, p_user, p_role, p_jusqu_au)
$function$


-- ═══ FONCTION public.tamila_ajouter_partie
CREATE OR REPLACE FUNCTION public.tamila_ajouter_partie(p_dossier uuid, p_nom bytea, p_qualite text, p_residence text DEFAULT 'inconnue'::text, p_role_procedure text DEFAULT NULL::text, p_courriels bytea DEFAULT NULL::bytea)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.tamila_ajouter_partie(p_dossier, p_nom, p_qualite, p_residence, p_role_procedure, p_courriels)
$function$


-- ═══ FONCTION public.tamila_annuler_cloture
CREATE OR REPLACE FUNCTION public.tamila_annuler_cloture(p_dossier uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.tamila_annuler_cloture(p_dossier) $function$


-- ═══ FONCTION public.tamila_annuler_delai
CREATE OR REPLACE FUNCTION public.tamila_annuler_delai(p_delai uuid, p_motif text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.tamila_annuler_delai(p_delai, p_motif) $function$


-- ═══ FONCTION public.tamila_avis_lu
CREATE OR REPLACE FUNCTION public.tamila_avis_lu(p_client uuid, p_dossier uuid, p_piece uuid, p_type text, p_valeurs jsonb, p_confiance text DEFAULT 'gabarit'::text, p_rg_concorde boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.tamila_avis_lu(p_client, p_dossier, p_piece, p_type, p_valeurs, p_confiance, p_rg_concorde)
$function$


-- ═══ FONCTION public.tamila_calculer_delai
CREATE OR REPLACE FUNCTION public.tamila_calculer_delai(p_regle text, p_depart date, p_territoire text, p_residence text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select private.tamila_calculer_delai(p_regle, p_depart, p_territoire, p_residence)
$function$


-- ═══ FONCTION public.tamila_changer_audience
CREATE OR REPLACE FUNCTION public.tamila_changer_audience(p_audience uuid, p_statut text, p_renvoi_le timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.tamila_changer_audience(p_audience, p_statut, p_renvoi_le)
$function$


-- ═══ FONCTION public.tamila_cle_detruite
CREATE OR REPLACE FUNCTION public.tamila_cle_detruite(p_dossier uuid, p_preuve jsonb)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.tamila_cle_detruite(p_dossier, p_preuve) $function$


-- ═══ FONCTION public.tamila_consulter
CREATE OR REPLACE FUNCTION public.tamila_consulter(p_dossier uuid, p_contexte text DEFAULT 'dossier'::text)
 RETURNS timestamp with time zone
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.tamila_consulter(p_dossier, p_contexte) $function$


-- ═══ FONCTION public.tamila_convertir_audit
CREATE OR REPLACE FUNCTION public.tamila_convertir_audit(p_dossier uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.tamila_convertir_audit(p_dossier) $function$


-- ═══ FONCTION public.tamila_corriger_delai
CREATE OR REPLACE FUNCTION public.tamila_corriger_delai(p_delai uuid, p_echeance date, p_motif text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.tamila_corriger_delai(p_delai, p_echeance, p_motif) $function$


-- ═══ FONCTION public.tamila_creer_dossier
CREATE OR REPLACE FUNCTION public.tamila_creer_dossier(p_client uuid, p_dossier uuid, p_reference bytea, p_intitule bytea, p_cle_fournisseur text, p_cle_reference text, p_cle_enveloppe bytea, p_numero_rg bytea DEFAULT NULL::bytea, p_matiere text DEFAULT NULL::text, p_juridiction text DEFAULT NULL::text, p_territoire text DEFAULT NULL::text, p_mode text DEFAULT 'contentieux'::text, p_perso boolean DEFAULT false, p_audit_fin date DEFAULT NULL::date, p_responsable uuid DEFAULT NULL::uuid, p_entite uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.tamila_creer_dossier(p_client, p_dossier, p_reference, p_intitule, p_cle_fournisseur, p_cle_reference,
    p_cle_enveloppe, p_numero_rg, p_matiere, p_juridiction, p_territoire, p_mode, p_perso, p_audit_fin, p_responsable, p_entite)
$function$


-- ═══ FONCTION public.tamila_decider
CREATE OR REPLACE FUNCTION public.tamila_decider(p_demande uuid, p_decision text, p_commentaire text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.tamila_decider(p_demande, p_decision, p_commentaire)
$function$


-- ═══ FONCTION public.tamila_declarer_acte
CREATE OR REPLACE FUNCTION public.tamila_declarer_acte(p_delai uuid, p_depose_le date, p_piece uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.tamila_declarer_acte(p_delai, p_depose_le, p_piece) $function$


-- ═══ FONCTION public.tamila_declarer_appel
CREATE OR REPLACE FUNCTION public.tamila_declarer_appel(p_dossier uuid, p_introduit_le date, p_role text, p_procedure text DEFAULT 'a_orienter'::text, p_territoire text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.tamila_declarer_appel(p_dossier, p_introduit_le, p_role, p_procedure, p_territoire)
$function$


-- ═══ FONCTION public.tamila_demander_cloture
CREATE OR REPLACE FUNCTION public.tamila_demander_cloture(p_dossier uuid)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.tamila_demander_cloture(p_dossier) $function$


-- ═══ FONCTION public.tamila_demander_export
CREATE OR REPLACE FUNCTION public.tamila_demander_export(p_dossier uuid)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.tamila_demander_export(p_dossier) $function$


-- ═══ FONCTION public.tamila_demander_export_cabinet
CREATE OR REPLACE FUNCTION public.tamila_demander_export_cabinet(p_client uuid)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.tamila_demander_export_cabinet(p_client) $function$


-- ═══ FONCTION public.tamila_demander_levee_muraille
CREATE OR REPLACE FUNCTION public.tamila_demander_levee_muraille(p_muraille uuid)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.tamila_demander_levee_muraille(p_muraille) $function$


-- ═══ FONCTION public.tamila_effacer_dossier
CREATE OR REPLACE FUNCTION public.tamila_effacer_dossier(p_dossier uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.tamila_effacer_dossier(p_dossier) $function$


-- ═══ FONCTION public.tamila_export_echec
CREATE OR REPLACE FUNCTION public.tamila_export_echec(p_export uuid, p_motif text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.tamila_export_echec(p_export, p_motif) $function$


-- ═══ FONCTION public.tamila_export_pret
CREATE OR REPLACE FUNCTION public.tamila_export_pret(p_export uuid, p_chemin text, p_octets bigint, p_empreinte text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.tamila_export_pret(p_export, p_chemin, p_octets, p_empreinte)
$function$


-- ═══ FONCTION public.tamila_export_purge
CREATE OR REPLACE FUNCTION public.tamila_export_purge(p_export uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.tamila_export_purge(p_export) $function$


-- ═══ FONCTION public.tamila_installer
CREATE OR REPLACE FUNCTION public.tamila_installer(p_client uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.tamila_installer(p_client) $function$


-- ═══ FONCTION public.tamila_interrompre_delai
CREATE OR REPLACE FUNCTION public.tamila_interrompre_delai(p_delai uuid, p_motif text, p_depuis date)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.tamila_interrompre_delai(p_delai, p_motif, p_depuis)
$function$


-- ═══ FONCTION public.tamila_modifier_partie
CREATE OR REPLACE FUNCTION public.tamila_modifier_partie(p_partie uuid, p_nom bytea DEFAULT NULL::bytea, p_qualite text DEFAULT NULL::text, p_residence text DEFAULT NULL::text, p_role_procedure text DEFAULT NULL::text, p_courriels bytea DEFAULT NULL::bytea)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.tamila_modifier_partie(p_partie, p_nom, p_qualite, p_residence, p_role_procedure, p_courriels)
$function$


-- ═══ FONCTION public.tamila_orienter_appel
CREATE OR REPLACE FUNCTION public.tamila_orienter_appel(p_dossier uuid, p_procedure text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.tamila_orienter_appel(p_dossier, p_procedure) $function$


-- ═══ FONCTION public.tamila_poser_date
CREATE OR REPLACE FUNCTION public.tamila_poser_date(p_dossier uuid, p_echeance date, p_acte text DEFAULT 'autre'::text, p_source text DEFAULT 'saisie'::text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.tamila_poser_date(p_dossier, p_echeance, p_acte, p_source)
$function$


-- ═══ FONCTION public.tamila_poser_delai
CREATE OR REPLACE FUNCTION public.tamila_poser_delai(p_dossier uuid, p_regle text, p_depart date, p_residence text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.tamila_poser_delai(p_dossier, p_regle, p_depart, p_residence)
$function$


-- ═══ FONCTION public.tamila_poser_muraille
CREATE OR REPLACE FUNCTION public.tamila_poser_muraille(p_dossier uuid, p_user uuid, p_motif bytea DEFAULT NULL::bytea)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.tamila_poser_muraille(p_dossier, p_user, p_motif) $function$


-- ═══ FONCTION public.tamila_registre_hors_vue
CREATE OR REPLACE FUNCTION public.tamila_registre_hors_vue(p_client uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select private.tamila_registre_hors_vue(p_client) $function$


-- ═══ FONCTION public.tamila_retirer_membre
CREATE OR REPLACE FUNCTION public.tamila_retirer_membre(p_dossier uuid, p_user uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.tamila_retirer_membre(p_dossier, p_user) $function$


-- ═══ FONCTION public.tamila_retirer_partie
CREATE OR REPLACE FUNCTION public.tamila_retirer_partie(p_partie uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.tamila_retirer_partie(p_partie) $function$


-- ═══ FONCTION public.tamila_telecharger_export
CREATE OR REPLACE FUNCTION public.tamila_telecharger_export(p_export uuid)
 RETURNS text
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.tamila_telecharger_export(p_export) $function$



-- ══════════════════ CRONS ══════════════════

-- ═══ CRON tamila-coffre [11 * * * *] select private.tamila_tache_horaire()

-- ═══ CRON tamila-decisions [* * * * *] select private.tamila_traiter_decisions()

-- ═══ CRON tamila-delais [17 * * * *] select private.tamila_controler_delais()
