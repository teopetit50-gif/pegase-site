-- Extraits du socle Omega pour Lorani (permis, urbanisme) — préfixe lorani_
-- Recette ygwbgpowzlbdaajlsqkn, photographie du 5 octobre 2026, 22 h 30, par le coordinateur.
-- Ce fichier NE S'EXÉCUTE PAS : il sert à écrire des « create or replace », des écrans et des tests.
-- Les ouvriers n'appellent jamais Supabase ; ce qui manque ici se demande au coordinateur.
-- Contenu : 9 tables, 1 vues, 46 fonctions, 2 crons.


-- ══════════════════ TABLES ══════════════════

-- ═══ TABLE public.lorani_cas_rejet
  code text not null
  article text not null
  libelle text not null
  version_texte text not null
  en_vigueur_du date not null
  source_url text not null
  constraint lorani_cas_rejet_article_check CHECK (((char_length(article) >= 3) AND (char_length(article) <= 60)))
  constraint lorani_cas_rejet_code_check CHECK ((code ~ '^r424_[0-9a-z_]{1,10}$'::text))
  constraint lorani_cas_rejet_libelle_check CHECK (((char_length(libelle) >= 3) AND (char_length(libelle) <= 300)))
  constraint lorani_cas_rejet_pkey PRIMARY KEY (code)
  constraint lorani_cas_rejet_source_url_check CHECK ((source_url ~ '^https://'::text))
  constraint lorani_cas_rejet_version_texte_check CHECK (((char_length(version_texte) >= 3) AND (char_length(version_texte) <= 120)))
  policy "la liste des cas de rejet se lit par tous" SELECT to authenticated using (true) with check ()

  grants authenticated: SELECT

-- ═══ TABLE public.lorani_intervenants
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  projet_id uuid not null
  nature text not null
  organisme text not null
  contact text
  email text
  telephone text
  siren text
  lot_id uuid
  actif boolean not null default true
  cree_le timestamp with time zone not null default now()
  constraint lorani_intervenants_client_id_id_key UNIQUE (client_id, id)
  constraint lorani_intervenants_client_id_projet_id_fkey FOREIGN KEY (client_id, projet_id) REFERENCES lorani_projets(client_id, id) ON DELETE CASCADE
  constraint lorani_intervenants_contact_check CHECK (((char_length(btrim(contact)) >= 1) AND (char_length(btrim(contact)) <= 200)))
  constraint lorani_intervenants_email_check CHECK (((char_length(email) <= 320) AND (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'::text)))
  constraint lorani_intervenants_lot_fkey FOREIGN KEY (client_id, projet_id, lot_id) REFERENCES lorani_lots(client_id, projet_id, id) ON DELETE SET NULL (lot_id)
  constraint lorani_intervenants_nature_check CHECK ((nature = ANY (ARRAY['maitre_ouvrage'::text, 'amo'::text, 'bet_structure'::text, 'bet_fluides'::text, 'bet_thermique'::text, 'bet_acoustique'::text, 'bet_vrd'::text, 'economiste'::text, 'controleur_technique'::text, 'coordonnateur_sps'::text, 'opc'::text, 'geometre'::text, 'entreprise'::text, 'autre'::text])))
  constraint lorani_intervenants_organisme_check CHECK (((char_length(btrim(organisme)) >= 1) AND (char_length(btrim(organisme)) <= 200)))
  constraint lorani_intervenants_pkey PRIMARY KEY (id)
  constraint lorani_intervenants_siren_check CHECK ((siren ~ '^[0-9]{9}$'::text))
  constraint lorani_intervenants_telephone_check CHECK ((char_length(telephone) <= 40))
  policy "on voit les intervenants des projets qu'on voit" SELECT to authenticated using (private.lorani_voit_projet(client_id, entite_id, projet_id)) with check ()
  policy "qui ecrit sur le projet ajoute un intervenant" INSERT to authenticated using () with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id))
  policy "qui ecrit sur le projet modifie un intervenant" UPDATE to authenticated using (private.lorani_ecrit_projet(client_id, entite_id, projet_id)) with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id))
  policy "qui ecrit sur le projet retire un intervenant" DELETE to authenticated using (private.lorani_ecrit_projet(client_id, entite_id, projet_id)) with check ()
  CREATE TRIGGER lorani_intervenants_heriter_projet BEFORE INSERT OR UPDATE OF projet_id, entite_id ON public.lorani_intervenants FOR EACH ROW EXECUTE FUNCTION private.lorani_heriter_projet()
  CREATE TRIGGER lorani_intervenants_tracer AFTER INSERT OR DELETE OR UPDATE ON public.lorani_intervenants FOR EACH ROW EXECUTE FUNCTION private.tracer('+projet_id', '+nature', '+lot_id', '+actif')
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.lorani_lots
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  projet_id uuid not null
  numero text not null
  intitule text not null
  activites_requises text[] not null default '{}'::text[]
  cree_le timestamp with time zone not null default now()
  constraint lorani_lots_activites_requises_check CHECK ((cardinality(activites_requises) <= 60))
  constraint lorani_lots_client_id_id_key UNIQUE (client_id, id)
  constraint lorani_lots_client_id_projet_id_fkey FOREIGN KEY (client_id, projet_id) REFERENCES lorani_projets(client_id, id) ON DELETE CASCADE
  constraint lorani_lots_intitule_check CHECK (((char_length(btrim(intitule)) >= 1) AND (char_length(btrim(intitule)) <= 200)))
  constraint lorani_lots_numero_check CHECK ((numero ~ '^[0-9A-Za-z][0-9A-Za-z.-]{0,9}$'::text))
  constraint lorani_lots_numero_une_fois UNIQUE (projet_id, numero)
  constraint lorani_lots_pkey PRIMARY KEY (id)
  constraint lorani_lots_projet_id_key UNIQUE (client_id, projet_id, id)
  policy "on voit les lots des projets qu'on voit" SELECT to authenticated using (private.lorani_voit_projet(client_id, entite_id, projet_id)) with check ()
  policy "qui ecrit sur le projet ajoute un lot" INSERT to authenticated using () with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id))
  policy "qui ecrit sur le projet modifie un lot" UPDATE to authenticated using (private.lorani_ecrit_projet(client_id, entite_id, projet_id)) with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id))
  policy "qui ecrit sur le projet retire un lot" DELETE to authenticated using (private.lorani_ecrit_projet(client_id, entite_id, projet_id)) with check ()
  CREATE TRIGGER lorani_lots_heriter_projet BEFORE INSERT OR UPDATE OF projet_id, entite_id ON public.lorani_lots FOR EACH ROW EXECUTE FUNCTION private.lorani_heriter_projet()
  CREATE TRIGGER lorani_lots_tracer AFTER INSERT OR DELETE OR UPDATE ON public.lorani_lots FOR EACH ROW EXECUTE FUNCTION private.tracer('+projet_id', '+numero')
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.lorani_membres_projet
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  projet_id uuid not null
  user_id uuid not null
  role_projet text not null default 'autre'::text
  cree_le timestamp with time zone not null default now()
  constraint lorani_membres_projet_client_id_projet_id_fkey FOREIGN KEY (client_id, projet_id) REFERENCES lorani_projets(client_id, id) ON DELETE CASCADE
  constraint lorani_membres_projet_pkey PRIMARY KEY (id)
  constraint lorani_membres_projet_role_projet_check CHECK ((role_projet = ANY (ARRAY['associe'::text, 'chef_projet'::text, 'dessinateur'::text, 'assistant'::text, 'economiste'::text, 'autre'::text])))
  constraint lorani_membres_projet_une_fois UNIQUE (projet_id, user_id)
  constraint lorani_membres_projet_user_id_client_id_fkey FOREIGN KEY (user_id, client_id) REFERENCES comptes(user_id, client_id) ON DELETE CASCADE
  policy "gerants, admins et valideurs changent un role" UPDATE to authenticated using (private.lorani_ecrit_projet(client_id, entite_id, projet_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text])) with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]))
  policy "gerants, admins et valideurs composent l'equipe" INSERT to authenticated using () with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]))
  policy "gerants, admins et valideurs retirent de l'equipe" DELETE to authenticated using (private.lorani_ecrit_projet(client_id, entite_id, projet_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text])) with check ()
  policy "on voit l'equipe des projets qu'on voit" SELECT to authenticated using (private.lorani_voit_projet(client_id, entite_id, projet_id)) with check ()
  CREATE TRIGGER lorani_membres_projet_heriter_projet BEFORE INSERT OR UPDATE OF projet_id, entite_id ON public.lorani_membres_projet FOR EACH ROW EXECUTE FUNCTION private.lorani_heriter_projet()
  CREATE TRIGGER lorani_membres_projet_tracer AFTER INSERT OR DELETE OR UPDATE ON public.lorani_membres_projet FOR EACH ROW EXECUTE FUNCTION private.tracer('+projet_id', '+user_id', '+role_projet')
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.lorani_permis
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  projet_id uuid not null
  type_autorisation text not null default 'pc'::text
  numero text
  intitule text
  secteur_protege boolean not null default false
  immeuble_inscrit_mh boolean not null default false
  erp_autorisation boolean not null default false
  igh boolean not null default false
  evaluation_environnementale boolean not null default false
  cas_rejet text[] not null default '{}'::text[]
  date_depot date
  date_demande_pieces date
  date_pieces_fournies date
  delai_notifie_mois smallint
  date_notification_delai date
  decision text
  date_decision date
  date_affichage date
  actif boolean not null default true
  etat text not null default 'a_deposer'::text
  silence text
  date_decision_attendue date
  date_purge date
  calcul jsonb not null default '{}'::jsonb
  calcule_le timestamp with time zone
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  pieces_demandees jsonb not null default '[]'::jsonb
  constraint lorani_permis_affichage_d_un_accord CHECK (((date_affichage IS NULL) OR ((decision = ANY (ARRAY['favorable'::text, 'tacite'::text])) AND (date_affichage >= date_decision))))
  constraint lorani_permis_cas_rejet_check CHECK ((cardinality(cas_rejet) <= 12))
  constraint lorani_permis_client_id_id_key UNIQUE (client_id, id)
  constraint lorani_permis_client_id_projet_id_fkey FOREIGN KEY (client_id, projet_id) REFERENCES lorani_projets(client_id, id) ON DELETE CASCADE
  constraint lorani_permis_decision_apres_depot CHECK (((date_decision IS NULL) OR (date_decision >= date_depot)))
  constraint lorani_permis_decision_check CHECK ((decision = ANY (ARRAY['favorable'::text, 'defavorable'::text, 'tacite'::text, 'rejet_implicite'::text])))
  constraint lorani_permis_decision_datee CHECK (((decision IS NULL) = (date_decision IS NULL)))
  constraint lorani_permis_delai_apres_depot CHECK (((delai_notifie_mois IS NULL) OR (date_depot IS NOT NULL)))
  constraint lorani_permis_delai_notifie_mois_check CHECK (((delai_notifie_mois >= 1) AND (delai_notifie_mois <= 24)))
  constraint lorani_permis_demande_apres_depot CHECK (((date_demande_pieces IS NULL) OR (date_demande_pieces >= date_depot)))
  constraint lorani_permis_etat_check CHECK ((etat = ANY (ARRAY['a_deposer'::text, 'completude'::text, 'pieces_demandees'::text, 'instruction'::text, 'decision_a_confirmer'::text, 'accorde'::text, 'recours_en_cours'::text, 'purge'::text, 'refuse'::text, 'rejete'::text, 'annule'::text, 'classe'::text, 'hors_catalogue'::text])))
  constraint lorani_permis_intitule_check CHECK (((char_length(btrim(intitule)) >= 1) AND (char_length(btrim(intitule)) <= 120)))
  constraint lorani_permis_notification_apres_depot CHECK (((date_notification_delai IS NULL) OR (date_notification_delai >= date_depot)))
  constraint lorani_permis_numero_check CHECK (((char_length(btrim(numero)) >= 1) AND (char_length(btrim(numero)) <= 40)))
  constraint lorani_permis_pieces_apres_demande CHECK (((date_pieces_fournies IS NULL) OR (date_pieces_fournies >= date_demande_pieces)))
  constraint lorani_permis_pieces_demandees_check CHECK (((jsonb_typeof(pieces_demandees) = 'array'::text) AND (jsonb_array_length(pieces_demandees) <= 60)))
  constraint lorani_permis_pkey PRIMARY KEY (id)
  constraint lorani_permis_silence_check CHECK ((silence = ANY (ARRAY['tacite'::text, 'rejet'::text])))
  constraint lorani_permis_type_autorisation_check CHECK ((type_autorisation = ANY (ARRAY['pc'::text, 'pcmi'::text, 'pa'::text, 'pd'::text, 'dp'::text])))
  policy "on voit les permis des projets qu'on voit" SELECT to authenticated using (private.lorani_voit_projet(client_id, entite_id, projet_id)) with check ()
  policy "qui ecrit sur le projet met a jour un permis" UPDATE to authenticated using (private.lorani_ecrit_projet(client_id, entite_id, projet_id)) with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id))
  policy "qui ecrit sur le projet saisit un permis" INSERT to authenticated using () with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id))
  CREATE TRIGGER lorani_permis_garder BEFORE INSERT OR UPDATE ON public.lorani_permis FOR EACH ROW EXECUTE FUNCTION private.lorani_garder_permis()
  CREATE TRIGGER lorani_permis_heriter_projet BEFORE INSERT OR UPDATE OF projet_id, entite_id ON public.lorani_permis FOR EACH ROW EXECUTE FUNCTION private.lorani_heriter_projet()
  CREATE TRIGGER lorani_permis_recalculer AFTER INSERT OR UPDATE OF type_autorisation, secteur_protege, immeuble_inscrit_mh, erp_autorisation, igh, evaluation_environnementale, cas_rejet, date_depot, date_demande_pieces, date_pieces_fournies, delai_notifie_mois, date_notification_delai, decision, date_decision, date_affichage, actif ON public.lorani_permis FOR EACH ROW EXECUTE FUNCTION private.lorani_permis_a_recalculer()
  CREATE TRIGGER lorani_permis_tracer AFTER INSERT OR DELETE OR UPDATE ON public.lorani_permis FOR EACH ROW EXECUTE FUNCTION private.tracer('+projet_id', '+type_autorisation', '+secteur_protege', '+immeuble_inscrit_mh', '+erp_autorisation', '+igh', '+evaluation_environnementale', '+cas_rejet', '+date_depot', '+date_demande_pieces', '+date_pieces_fournies', '+delai_notifie_mois', '+date_notification_delai', '+decision', '+date_decision', '+date_affichage', '+actif', '+etat', '+date_purge', '+pieces_demandees')
  grants authenticated: INSERT,SELECT,UPDATE

-- ═══ TABLE public.lorani_permis_dates_lues
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  projet_id uuid not null
  permis_id uuid
  piece_id uuid not null
  type_piece text not null
  nature text not null
  proposition jsonb not null
  citations jsonb not null default '[]'::jsonb
  verifiee boolean not null
  statut text not null default 'proposee'::text
  confirme jsonb
  decide_par uuid
  decide_le timestamp with time zone
  motif text
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint lorani_permis_dates_lues_citations_check CHECK ((jsonb_typeof(citations) = 'array'::text))
  constraint lorani_permis_dates_lues_client_id_id_key UNIQUE (client_id, id)
  constraint lorani_permis_dates_lues_client_id_permis_id_fkey FOREIGN KEY (client_id, permis_id) REFERENCES lorani_permis(client_id, id) ON DELETE CASCADE
  constraint lorani_permis_dates_lues_client_id_piece_id_fkey FOREIGN KEY (client_id, piece_id) REFERENCES pieces(client_id, id) ON DELETE CASCADE
  constraint lorani_permis_dates_lues_client_id_projet_id_fkey FOREIGN KEY (client_id, projet_id) REFERENCES lorani_projets(client_id, id) ON DELETE CASCADE
  constraint lorani_permis_dates_lues_decidee CHECK (((statut = 'proposee'::text) = (decide_le IS NULL)))
  constraint lorani_permis_dates_lues_motif_check CHECK (((char_length(btrim(motif)) >= 1) AND (char_length(btrim(motif)) <= 300)))
  constraint lorani_permis_dates_lues_nature_check CHECK ((nature = ANY (ARRAY['depot'::text, 'delai_notifie'::text, 'demande_pieces'::text, 'decision'::text, 'decision_tacite'::text, 'affichage'::text])))
  constraint lorani_permis_dates_lues_pkey PRIMARY KEY (id)
  constraint lorani_permis_dates_lues_proposition_check CHECK ((jsonb_typeof(proposition) = 'object'::text))
  constraint lorani_permis_dates_lues_statut_check CHECK ((statut = ANY (ARRAY['proposee'::text, 'confirmee'::text, 'ecartee'::text])))
  constraint lorani_permis_dates_lues_type_piece_check CHECK ((type_piece ~ '^[a-z][a-z0-9_]{1,59}$'::text))
  constraint lorani_permis_dates_lues_une_fois UNIQUE (client_id, piece_id, nature)
  policy "on voit les dates lues des projets qu'on voit" SELECT to authenticated using (private.lorani_voit_projet(client_id, entite_id, projet_id)) with check ()
  CREATE TRIGGER lorani_permis_dates_lues_heriter_projet BEFORE INSERT OR UPDATE OF projet_id, entite_id ON public.lorani_permis_dates_lues FOR EACH ROW EXECUTE FUNCTION private.lorani_heriter_projet()
  CREATE TRIGGER lorani_permis_dates_lues_tracer AFTER INSERT OR DELETE OR UPDATE ON public.lorani_permis_dates_lues FOR EACH ROW EXECUTE FUNCTION private.tracer('+permis_id', '+piece_id', '+type_piece', '+nature', '+verifiee', '+statut', '+decide_par')
  grants authenticated: SELECT

-- ═══ TABLE public.lorani_permis_echeances
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  projet_id uuid not null
  permis_id uuid not null
  nature text not null
  delai_id uuid not null
  signature text not null
  courante boolean not null default true
  cree_le timestamp with time zone not null default now()
  constraint lorani_permis_echeances_client_id_delai_id_fkey FOREIGN KEY (client_id, delai_id) REFERENCES delais(client_id, id) ON DELETE CASCADE
  constraint lorani_permis_echeances_client_id_permis_id_fkey FOREIGN KEY (client_id, permis_id) REFERENCES lorani_permis(client_id, id) ON DELETE CASCADE
  constraint lorani_permis_echeances_client_id_projet_id_fkey FOREIGN KEY (client_id, projet_id) REFERENCES lorani_projets(client_id, id) ON DELETE CASCADE
  constraint lorani_permis_echeances_delai_id_key UNIQUE (delai_id)
  constraint lorani_permis_echeances_nature_check CHECK ((nature = ANY (ARRAY['completude'::text, 'pieces'::text, 'instruction'::text, 'affichage'::text, 'retrait'::text, 'recours'::text, 'purge'::text])))
  constraint lorani_permis_echeances_pkey PRIMARY KEY (id)
  constraint lorani_permis_echeances_signature_check CHECK ((char_length(signature) <= 400))
  policy "on voit les echeances des projets qu'on voit" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (EXISTS ( SELECT 1
   FROM lorani_projets pr
  WHERE ((pr.client_id = lorani_permis_echeances.client_id) AND (pr.id = lorani_permis_echeances.projet_id)))))) with check ()
  CREATE TRIGGER lorani_permis_echeances_tracer AFTER INSERT OR DELETE OR UPDATE ON public.lorani_permis_echeances FOR EACH ROW EXECUTE FUNCTION private.tracer('+permis_id', '+nature', '+delai_id', '+courante')
  grants authenticated: SELECT

-- ═══ TABLE public.lorani_permis_recours
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  projet_id uuid not null
  permis_id uuid not null
  nature text not null
  date_recours date not null
  auteur text
  issue text not null default 'en_cours'::text
  date_issue date
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint lorani_permis_recours_auteur_check CHECK (((char_length(btrim(auteur)) >= 1) AND (char_length(btrim(auteur)) <= 200)))
  constraint lorani_permis_recours_client_id_id_key UNIQUE (client_id, id)
  constraint lorani_permis_recours_client_id_permis_id_fkey FOREIGN KEY (client_id, permis_id) REFERENCES lorani_permis(client_id, id) ON DELETE CASCADE
  constraint lorani_permis_recours_client_id_projet_id_fkey FOREIGN KEY (client_id, projet_id) REFERENCES lorani_projets(client_id, id) ON DELETE CASCADE
  constraint lorani_permis_recours_issue_apres CHECK (((date_issue IS NULL) OR (date_issue >= date_recours)))
  constraint lorani_permis_recours_issue_check CHECK ((issue = ANY (ARRAY['en_cours'::text, 'rejete'::text, 'desiste'::text, 'annulation'::text])))
  constraint lorani_permis_recours_issue_datee CHECK (((issue = 'en_cours'::text) = (date_issue IS NULL)))
  constraint lorani_permis_recours_nature_check CHECK ((nature = ANY (ARRAY['gracieux'::text, 'contentieux'::text, 'prefet'::text])))
  constraint lorani_permis_recours_pkey PRIMARY KEY (id)
  policy "on voit les recours des projets qu'on voit" SELECT to authenticated using (private.lorani_voit_projet(client_id, entite_id, projet_id)) with check ()
  policy "qui ecrit sur le projet met a jour un recours" UPDATE to authenticated using (private.lorani_ecrit_projet(client_id, entite_id, projet_id)) with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id))
  policy "qui ecrit sur le projet retire un recours saisi par erreur" DELETE to authenticated using (private.lorani_ecrit_projet(client_id, entite_id, projet_id)) with check ()
  policy "qui ecrit sur le projet saisit un recours" INSERT to authenticated using () with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id))
  CREATE TRIGGER lorani_permis_recours_preparer BEFORE INSERT OR UPDATE ON public.lorani_permis_recours FOR EACH ROW EXECUTE FUNCTION private.lorani_preparer_recours()
  CREATE TRIGGER lorani_permis_recours_recalculer AFTER INSERT OR DELETE OR UPDATE ON public.lorani_permis_recours FOR EACH ROW EXECUTE FUNCTION private.lorani_recours_a_recalculer()
  CREATE TRIGGER lorani_permis_recours_tracer AFTER INSERT OR DELETE OR UPDATE ON public.lorani_permis_recours FOR EACH ROW EXECUTE FUNCTION private.tracer('+permis_id', '+nature', '+date_recours', '+issue', '+date_issue')
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.lorani_projets
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  nom text not null
  reference text
  adresse text
  code_postal text
  commune text
  code_insee text
  parcelles text[] not null default '{}'::text[]
  nature text not null default 'autre'::text
  marche_public boolean not null default false
  phase text not null default 'esq'::text
  territoire text
  actif boolean not null default true
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint lorani_projets_adresse_check CHECK ((char_length(adresse) <= 300))
  constraint lorani_projets_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint lorani_projets_client_id_id_key UNIQUE (client_id, id)
  constraint lorani_projets_code_insee_check CHECK ((code_insee ~ '^[0-9][0-9AB][0-9]{3}$'::text))
  constraint lorani_projets_code_postal_check CHECK ((code_postal ~ '^[0-9]{5}$'::text))
  constraint lorani_projets_commune_check CHECK (((char_length(btrim(commune)) >= 1) AND (char_length(btrim(commune)) <= 120)))
  constraint lorani_projets_entite_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id)
  constraint lorani_projets_nature_check CHECK ((nature = ANY (ARRAY['maison_individuelle'::text, 'logement_collectif'::text, 'erp'::text, 'igh'::text, 'tertiaire'::text, 'autre'::text])))
  constraint lorani_projets_nom_check CHECK (((char_length(btrim(nom)) >= 1) AND (char_length(btrim(nom)) <= 200)))
  constraint lorani_projets_parcelles_check CHECK ((cardinality(parcelles) <= 200))
  constraint lorani_projets_phase_check CHECK ((phase = ANY (ARRAY['diag'::text, 'esq'::text, 'aps'::text, 'apd'::text, 'pc'::text, 'pro'::text, 'dce'::text, 'act'::text, 'det'::text, 'aor'::text, 'gpa'::text, 'clos'::text])))
  constraint lorani_projets_pkey PRIMARY KEY (id)
  constraint lorani_projets_reference_check CHECK (((char_length(btrim(reference)) >= 1) AND (char_length(btrim(reference)) <= 60)))
  constraint lorani_projets_reference_une_fois UNIQUE (client_id, reference)
  constraint lorani_projets_territoire_check CHECK ((territoire ~ '^[a-z][a-z-]{2,40}$'::text))
  constraint lorani_projets_territoire_fkey FOREIGN KEY (territoire) REFERENCES territoires(code)
  policy "les membres qui agissent ouvrent un projet" INSERT to authenticated using () with check ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text, 'collaborateur'::text]) AND private.perimetre_couvre(( SELECT auth.uid() AS uid), client_id, entite_id)))
  policy "on voit les projets de son perimetre" SELECT to authenticated using (private.lorani_voit_projet(client_id, entite_id, id)) with check ()
  policy "qui ecrit sur le projet le modifie" UPDATE to authenticated using (private.lorani_ecrit_projet(client_id, entite_id, id)) with check (private.lorani_ecrit_projet(client_id, entite_id, id))
  CREATE TRIGGER lorani_projets_ouvrir_au_createur BEFORE INSERT ON public.lorani_projets FOR EACH ROW EXECUTE FUNCTION private.lorani_ouvrir_projet_au_createur()
  CREATE TRIGGER lorani_projets_preparer BEFORE INSERT OR UPDATE ON public.lorani_projets FOR EACH ROW EXECUTE FUNCTION private.lorani_preparer_projet()
  CREATE TRIGGER lorani_projets_recalculer_permis AFTER UPDATE OF territoire, code_insee, code_postal, actif ON public.lorani_projets FOR EACH ROW WHEN (((old.territoire IS DISTINCT FROM new.territoire) OR (old.actif IS DISTINCT FROM new.actif))) EXECUTE FUNCTION private.lorani_projet_a_recalculer()
  CREATE TRIGGER lorani_projets_suivre_entite AFTER UPDATE OF entite_id ON public.lorani_projets FOR EACH ROW WHEN ((old.entite_id IS DISTINCT FROM new.entite_id)) EXECUTE FUNCTION private.lorani_suivre_entite_projet()
  CREATE TRIGGER lorani_projets_tracer AFTER INSERT OR DELETE OR UPDATE ON public.lorani_projets FOR EACH ROW EXECUTE FUNCTION private.tracer('+entite_id', '+nature', '+marche_public', '+phase', '+territoire', '+actif')
  grants authenticated: INSERT,SELECT,UPDATE


-- ══════════════════ VUES ══════════════════

-- ═══ VUE public.lorani_echeances_permis
 SELECT e.permis_id,
    e.projet_id,
    e.nature,
    d.id AS delai_id,
    d.libelle,
    d.echeance,
    d.echeance_calculee,
    d.echeance_notifiee,
    d.statut,
    d.rappels,
    d.rappels_faits,
    d.regle_code,
    d.regle_version,
    d.calcul ->> 'detail'::text AS detail,
    d.calcul ->> 'source'::text AS source,
    d.calcul ->> 'source_url'::text AS source_url,
    d.source_notification,
    d.responsable,
    d.action_attendue
   FROM lorani_permis_echeances e
     JOIN delais d ON d.client_id = e.client_id AND d.id = e.delai_id
  WHERE e.courante;


-- ══════════════════ FONCTIONS (public et private, telles quelles) ══════════════════

-- ═══ FONCTION private.lorani_alerter_rappel
CREATE OR REPLACE FUNCTION private.lorani_alerter_rappel(p lorani_permis, p_projet lorani_projets, p_nature text, p_rappel integer, p_echeance date, p_calcul jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_titre text;
  v_niveau text;
  v_quand text := case p_rappel when 0 then 'aujourd''hui' when 1 then 'demain' else format('dans %s jours', p_rappel) end;
begin
  if p_nature = 'pieces' and p.date_pieces_fournies is null then
    v_niveau := case when p_rappel >= 10 then 'attention' else 'critique' end;
    v_titre := format('%s : pièces manquantes à faire recevoir par la mairie au plus tard le %s (%s), sinon rejet tacite.',
      private.lorani_titre_permis(p, p_projet), to_char(p_echeance, 'DD/MM/YYYY'), v_quand);
  elsif p_nature = 'instruction' and p.decision is null then
    v_niveau := 'info';
    v_titre := format('%s : décision de la mairie attendue au plus tard le %s (%s) ; sans réponse, %s.',
      private.lorani_titre_permis(p, p_projet), to_char(p_echeance, 'DD/MM/YYYY'), v_quand,
      coalesce(p_calcul #>> '{regime,effet_silence}', 'permis tacite'));
  elsif p_nature = 'affichage' and p.date_affichage is null then
    v_niveau := 'attention';
    v_titre := format('%s : affichage sur le terrain non saisi quinze jours après la décision. Tant qu''il n''est pas fait, le recours des tiers ne court pas.',
      private.lorani_titre_permis(p, p_projet));
  else
    return null;
  end if;
  return private.lever_alerte_module(p.client_id, 'lorani', v_niveau, left(v_titre, 200),
    jsonb_build_object('projet', p.projet_id, 'permis', p.id, 'nature', p_nature, 'echeance', p_echeance,
                       'rappel', p_rappel, 'lien', '/secteurs/architectes/permis'),
    format('permis:%s:%s:rappel:%s', p.id, p_nature, p_rappel), true,
    private.lorani_chef_de_projet(p.client_id, p.projet_id));
end $function$


-- ═══ FONCTION private.lorani_alerter_transition
CREATE OR REPLACE FUNCTION private.lorani_alerter_transition(p lorani_permis, p_projet lorani_projets, p_calcul jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_impl jsonb := p_calcul -> 'decision_implicite';
  v_dp boolean := p.type_autorisation = 'dp';
  v_titre text;
  v_niveau text;
  v_cle text;
begin
  if p_calcul ->> 'etat' = 'decision_a_confirmer' and v_impl is not null then
    v_niveau := case when v_impl ->> 'nature' = 'tacite' then 'attention' else 'critique' end;
    v_titre := format('%s : %s le %s si aucune décision ne vous a été notifiée. Confirmez-le, ou saisissez la décision reçue.',
      private.lorani_titre_permis(p, p_projet),
      case when v_impl ->> 'nature' = 'tacite'
           then case when v_dp then 'non-opposition tacite' else 'permis tacite né' end
           else case when v_dp then 'opposition tacite' else 'rejet implicite' end end,
      to_char((v_impl ->> 'date')::date, 'DD/MM/YYYY'));
    v_cle := format('permis:%s:instruction:implicite', p.id);
  elsif p_calcul ->> 'etat' = 'purge' then
    v_niveau := 'info';
    v_titre := format('%s : purgé à l''issue du %s, plus de retrait ni de recours des tiers possible. Chantier sans ce risque dès le %s.',
      private.lorani_titre_permis(p, p_projet), to_char((p_calcul ->> 'date_purge')::date, 'DD/MM/YYYY'),
      to_char((p_calcul ->> 'chantier_sans_risque_le')::date, 'DD/MM/YYYY'));
    v_cle := format('permis:%s:purge:acquise', p.id);
  else
    return null;
  end if;
  return private.lever_alerte_module(p.client_id, 'lorani', v_niveau, left(v_titre, 200),
    jsonb_strip_nulls(jsonb_build_object('projet', p.projet_id, 'permis', p.id, 'etat', p_calcul ->> 'etat',
      'motif', v_impl ->> 'motif', 'date_purge', p_calcul ->> 'date_purge', 'lien', '/secteurs/architectes/permis')),
    v_cle, true, private.lorani_chef_de_projet(p.client_id, p.projet_id));
end $function$


-- ═══ FONCTION private.lorani_calendrier_passage
CREATE OR REPLACE FUNCTION private.lorani_calendrier_passage()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t public.travaux;
  r record;
  v_res jsonb;
  v_jour date;
  n_evenements integer := 0;
  n_recalculs integer := 0;
  n_erreurs integer := 0;
  n_agences integer := 0;
  n_sections integer := 0;
  n_mesures integer := 0;
begin
  -- 1. Les rappels et les dépassements publiés par B5
  for t in select * from private.prendre_travaux(array['lorani.calendrier.rappel', 'lorani.calendrier.depasse'], 500,
                                                 interval '10 minutes', 'lorani_calendrier') loop
    begin
      v_res := private.lorani_calendrier_traiter(t);
      perform private.finir_travail(t.id, v_res);
      n_evenements := n_evenements + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 2000));
      n_erreurs := n_erreurs + 1;
    end;
  end loop;

  -- 2. Une fois par jour local, chaque permis en cours se recalcule
  for r in
    select x.id, x.client_id from public.lorani_permis x
    join public.lorani_projets pr on pr.client_id = x.client_id and pr.id = x.projet_id
    left join public.territoires tt on tt.code = pr.territoire
    where x.etat not in ('classe', 'annule', 'refuse', 'rejete', 'purge', 'a_deposer', 'hors_catalogue')
      and (x.calcule_le is null
           or (x.calcule_le at time zone coalesce(tt.fuseau, 'Europe/Paris'))::date
              < (now() at time zone coalesce(tt.fuseau, 'Europe/Paris'))::date)
  loop
    begin
      perform private.lorani_recalculer_permis(r.id, 'passage quotidien');
      n_recalculs := n_recalculs + 1;
    exception when others then
      n_erreurs := n_erreurs + 1;
      perform private.lever_alerte(r.client_id, true, 'critique', 'lorani', 'Calendrier du permis : un recalcul échoue',
        jsonb_build_object('permis', r.id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'lorani:recalcul:' || r.id);
    end;
  end loop;

  -- 3. Le battement de chaque agence qui a des dossiers en cours, même à vide
  for r in
    select pr.client_id, count(x.id) filter (where x.actif) as permis
    from public.lorani_projets pr
    left join public.lorani_permis x on x.client_id = pr.client_id and x.projet_id = pr.id
    where pr.actif
    group by pr.client_id
  loop
    perform private.battre(r.client_id, 'lorani_calendrier',
      jsonb_build_object('passage', now(), 'permis_suivis', r.permis), interval '1 hour');
    n_agences := n_agences + 1;
  end loop;

  -- 4. Le point du matin et la mesure de chaque agence, chacune à part
  for r in select distinct pr.client_id from public.lorani_projets pr where pr.actif loop
    begin
      v_jour := private.lorani_jour_client(r.client_id);
      n_sections := n_sections + private.lorani_deposer_point(r.client_id, v_jour);
      n_mesures := n_mesures + private.lorani_enregistrer_mesures(r.client_id, v_jour - 1, false)
                             + private.lorani_enregistrer_mesures(r.client_id, v_jour, true);
    exception when others then
      n_erreurs := n_erreurs + 1;
      perform private.lever_alerte(r.client_id, true, 'critique', 'lorani',
        'Calendrier du permis : le point du matin ou la mesure échoue',
        jsonb_build_object('erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'lorani:point_mesure');
    end;
  end loop;

  return jsonb_build_object('evenements', n_evenements, 'recalculs', n_recalculs, 'erreurs', n_erreurs,
                            'agences', n_agences, 'sections', n_sections, 'mesures', n_mesures);
end $function$


-- ═══ FONCTION private.lorani_calendrier_traiter
CREATE OR REPLACE FUNCTION private.lorani_calendrier_traiter(t travaux)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  l public.lorani_permis_echeances;
  p public.lorani_permis;
  v_projet public.lorani_projets;
  v_calcul jsonb;
  v_courante boolean;
  v_alerte uuid;
begin
  select * into l from public.lorani_permis_echeances where delai_id = (t.charge ->> 'delai')::uuid;
  if not found then
    return jsonb_build_object('ignore', 'délai hors du calendrier des permis');
  end if;
  v_calcul := private.lorani_recalculer_permis(l.permis_id, 'evenement');
  if v_calcul is null then
    return jsonb_build_object('ignore', 'permis introuvable');
  end if;
  select x.courante into v_courante from public.lorani_permis_echeances x where x.id = l.id;
  if t.genre = 'lorani.calendrier.rappel' and v_courante then
    select * into p from public.lorani_permis where id = l.permis_id;
    select * into v_projet from public.lorani_projets where client_id = p.client_id and id = p.projet_id;
    v_alerte := private.lorani_alerter_rappel(p, v_projet, l.nature, (t.charge ->> 'rappel')::integer,
                                              (t.charge ->> 'echeance')::date, v_calcul);
  end if;
  return jsonb_strip_nulls(jsonb_build_object('permis', l.permis_id, 'nature', l.nature, 'etat', v_calcul ->> 'etat',
                                              'alerte', v_alerte));
end $function$


-- ═══ FONCTION private.lorani_chef_de_projet
CREATE OR REPLACE FUNCTION private.lorani_chef_de_projet(p_client uuid, p_projet uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select m.user_id from public.lorani_membres_projet m
  where m.client_id = p_client and m.projet_id = p_projet and m.role_projet = 'chef_projet'
  order by m.cree_le, m.user_id limit 1
$function$


-- ═══ FONCTION private.lorani_confirmer_date_lue
CREATE OR REPLACE FUNCTION private.lorani_confirmer_date_lue(p_id uuid, p_valeurs jsonb DEFAULT NULL::jsonb, p_permis uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  d public.lorani_permis_dates_lues;
  x public.lorani_permis;
  v jsonb;
  v_permis uuid;
  v_cles text[];
  v_contrainte text;
  v_ecart text;
begin
  select * into d from public.lorani_permis_dates_lues where id = p_id for update;
  if not found or ((select auth.uid()) is not null
                   and not private.lorani_ecrit_projet(d.client_id, d.entite_id, d.projet_id)) then
    raise exception 'Proposition introuvable.' using errcode = 'P0002';
  end if;
  if d.statut <> 'proposee' then
    raise exception 'Cette proposition est déjà %.', case d.statut when 'confirmee' then 'confirmée' else 'écartée' end
      using errcode = '55000';
  end if;
  v_permis := coalesce(p_permis, d.permis_id);
  if v_permis is null then
    raise exception 'Choisissez le permis que vise cette pièce.' using errcode = '22023';
  end if;
  select * into x from public.lorani_permis where client_id = d.client_id and id = v_permis for update;
  if not found or x.projet_id <> d.projet_id then
    raise exception 'Ce permis n''est pas celui du dossier de la pièce.' using errcode = '22023';
  end if;

  -- Les valeurs lues, corrigées au besoin par le membre ; seulement celles de la nature.
  v_cles := case d.nature
    when 'depot' then array['date_depot', 'numero']
    when 'delai_notifie' then array['delai_notifie_mois', 'date_notification_delai']
    when 'demande_pieces' then array['date_demande_pieces', 'pieces']
    when 'decision' then array['decision', 'date_decision']
    else array['date_decision', 'date_affichage'] end;
  if p_valeurs is not null and (jsonb_typeof(p_valeurs) <> 'object'
                                or exists (select 1 from jsonb_object_keys(p_valeurs) k where not (k = any (v_cles)))) then
    raise exception 'Valeurs attendues pour cette proposition : %.', array_to_string(v_cles, ', ') using errcode = '22023';
  end if;
  select coalesce(jsonb_object_agg(k, val), '{}'::jsonb) into v
  from jsonb_each(d.proposition || coalesce(p_valeurs, '{}'::jsonb)) as e(k, val)
  where k = any (v_cles);

  begin
    case d.nature
      when 'depot' then
        update public.lorani_permis
           set date_depot = (v ->> 'date_depot')::date, numero = coalesce(numero, v ->> 'numero')
         where id = v_permis;
      when 'delai_notifie' then
        update public.lorani_permis
           set delai_notifie_mois = (v ->> 'delai_notifie_mois')::smallint,
               date_notification_delai = coalesce((v ->> 'date_notification_delai')::date, date_notification_delai)
         where id = v_permis;
      when 'demande_pieces' then
        update public.lorani_permis
           set date_demande_pieces = (v ->> 'date_demande_pieces')::date,
               pieces_demandees = coalesce(v -> 'pieces', pieces_demandees)
         where id = v_permis;
      when 'decision' then
        if v ->> 'decision' not in ('favorable', 'defavorable') then
          raise exception 'Décision attendue : favorable ou defavorable.' using errcode = '22023';
        end if;
        update public.lorani_permis
           set decision = v ->> 'decision', date_decision = (v ->> 'date_decision')::date
         where id = v_permis;
      when 'decision_tacite' then
        perform private.lorani_confirmer_decision_implicite(v_permis);
        select * into x from public.lorani_permis where id = v_permis;
        if x.date_decision is distinct from (v ->> 'date_decision')::date then
          v_ecart := format('Le certificat date le permis tacite du %s ; le calcul, du %s.',
            to_char((v ->> 'date_decision')::date, 'DD/MM/YYYY'), to_char(x.date_decision, 'DD/MM/YYYY'));
        end if;
      else
        update public.lorani_permis set date_affichage = (v ->> 'date_affichage')::date where id = v_permis;
    end case;
  exception when check_violation then
    get stacked diagnostics v_contrainte = constraint_name;
    raise exception 'Cette date contredit une autre date du permis : %.', case v_contrainte
      when 'lorani_permis_demande_apres_depot' then 'la demande de pièces ne peut précéder le dépôt'
      when 'lorani_permis_pieces_apres_demande' then 'les pièces ne peuvent être reçues avant d''être demandées'
      when 'lorani_permis_notification_apres_depot' then 'le délai ne peut être notifié avant le dépôt'
      when 'lorani_permis_delai_apres_depot' then 'un délai notifié suppose une date de dépôt'
      when 'lorani_permis_decision_apres_depot' then 'la décision ne peut précéder le dépôt'
      when 'lorani_permis_affichage_d_un_accord' then 'l''affichage suit un permis accordé, jamais avant sa date'
      else 'voyez les dates déjà saisies' end
      using errcode = '22023';
  end;

  update public.lorani_permis_dates_lues
     set statut = 'confirmee', permis_id = v_permis, confirme = v, decide_par = (select auth.uid()), decide_le = now(),
         maj_le = now()
   where id = d.id;
  perform private.journaliser_module(d.client_id, 'lorani', 'lorani.date_permis_confirmee', 'lorani_permis', v_permis::text,
    jsonb_build_object('nature', d.nature, 'valeurs', v - 'numero', 'piece', d.piece_id, 'type_piece', d.type_piece,
                       'verifiee', d.verifiee,
                       'corrigee', coalesce(p_valeurs is not null and exists (
                         select 1 from jsonb_each(p_valeurs) c where d.proposition -> c.key is distinct from c.value), false)),
    d.entite_id);
  update public.alertes
     set acquittee_le = now(), detail = detail || jsonb_build_object('resolution', 'confirmée')
   where client_id = d.client_id and cle_regroupement = 'lorani:lecture:' || d.id and acquittee_le is null;
  return jsonb_strip_nulls(jsonb_build_object('permis', v_permis, 'ecart', v_ecart,
    'calcul', (select x2.calcul from public.lorani_permis x2 where x2.id = v_permis)));
end $function$


-- ═══ FONCTION private.lorani_confirmer_decision_implicite
CREATE OR REPLACE FUNCTION private.lorani_confirmer_decision_implicite(p_permis uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.lorani_permis;
  v_calcul jsonb;
  v_impl jsonb;
begin
  select * into p from public.lorani_permis where id = p_permis;
  if not found then
    raise exception 'Permis introuvable.' using errcode = 'P0002';
  end if;
  if (select auth.uid()) is not null and not private.lorani_ecrit_projet(p.client_id, p.entite_id, p.projet_id) then
    raise exception 'Permis introuvable.' using errcode = 'P0002';
  end if;
  if p.decision is not null then
    raise exception 'Une décision est déjà saisie (%).', p.decision using errcode = '55000';
  end if;
  v_calcul := private.lorani_recalculer_permis(p.id, 'confirmation');
  v_impl := v_calcul -> 'decision_implicite';
  if v_impl is null then
    raise exception 'Aucune décision implicite n''est née : le délai court encore, ou le dossier n''est pas déposé.'
      using errcode = '55000';
  end if;
  update public.lorani_permis
     set decision = v_impl ->> 'nature', date_decision = (v_impl ->> 'date')::date
   where id = p.id;
  perform private.journaliser_module(p.client_id, 'lorani', 'lorani.decision_implicite_confirmee', 'lorani_permis', p.id::text,
    jsonb_build_object('decision', v_impl ->> 'nature', 'date', v_impl ->> 'date'), p.entite_id);
  return (select x.calcul from public.lorani_permis x where x.id = p.id);
end $function$


-- ═══ FONCTION private.lorani_date_lue
CREATE OR REPLACE FUNCTION private.lorani_date_lue(p text)
 RETURNS date
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
begin
  if p is null or p !~ '^\d{4}-\d{2}-\d{2}$' then
    return null;
  end if;
  return p::date;
exception when others then
  return null;
end $function$


-- ═══ FONCTION private.lorani_dates_completes
CREATE OR REPLACE FUNCTION private.lorani_dates_completes(p_client uuid)
 RETURNS TABLE(entite_id uuid, en_cours integer, complets integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select x.entite_id, count(*)::integer,
         count(*) filter (where not exists (select 1 from jsonb_array_elements(coalesce(x.calcul -> 'etapes', '[]'::jsonb)) s
                                            where s ->> 'statut' in ('manque', 'a_confirmer')))::integer
  from public.lorani_permis x
  join public.lorani_projets pr on pr.client_id = x.client_id and pr.id = x.projet_id
  where x.client_id = p_client and x.actif and pr.actif
    and x.etat in ('completude', 'pieces_demandees', 'instruction', 'decision_a_confirmer', 'accorde', 'recours_en_cours')
  group by x.entite_id
$function$


-- ═══ FONCTION private.lorani_deja_saisi
CREATE OR REPLACE FUNCTION private.lorani_deja_saisi(x lorani_permis, p_nature text, v jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select coalesce(case p_nature
    when 'depot' then x.date_depot = (v ->> 'date_depot')::date
                      and (v ->> 'numero' is null or private.lorani_numero_dossier(x.numero) = v ->> 'numero')
    when 'delai_notifie' then x.delai_notifie_mois = (v ->> 'delai_notifie_mois')::smallint
    when 'demande_pieces' then x.date_demande_pieces is not null and x.pieces_demandees = coalesce(v -> 'pieces', '[]'::jsonb)
    when 'decision' then x.decision = v ->> 'decision' and x.date_decision = (v ->> 'date_decision')::date
    when 'decision_tacite' then x.decision = 'tacite' and x.date_decision = (v ->> 'date_decision')::date
    when 'affichage' then x.date_affichage <= (v ->> 'date_affichage')::date
  end, false)
$function$


-- ═══ FONCTION private.lorani_deposer_point
CREATE OR REPLACE FUNCTION private.lorani_deposer_point(p_client uuid, p_jour date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_titre constant text := 'Calendrier des permis';
  v_lignes jsonb;
  v_items jsonb;
  v_du timestamptz;
  m record;
  n integer := 0;
begin
  select coalesce(jsonb_agg(jsonb_build_object('projet', pr.id, 'entite', pr.entite_id, 'calcule_le', x.calcule_le,
                                               'ligne', l.ligne)), '[]'::jsonb)
    into v_lignes
  from public.lorani_permis x
  join public.lorani_projets pr on pr.client_id = x.client_id and pr.id = x.projet_id
  cross join lateral (select private.lorani_ligne_du_point(x, pr, p_jour) as ligne) l
  where x.client_id = p_client and l.ligne is not null;

  for m in select c.user_id, c.role from public.comptes c where c.client_id = p_client order by c.user_id loop
    select coalesce(jsonb_agg(s.ligne order by s.rang, s.jour nulls last, s.texte), '[]'::jsonb), min(s.calcule_le)
      into v_items, v_du
    from (
      select (e.value -> 'ligne') - '_rang' - '_date' as ligne, (e.value #>> '{ligne,_rang}')::integer as rang,
             (e.value #>> '{ligne,_date}')::date as jour, e.value #>> '{ligne,texte}' as texte,
             (e.value ->> 'calcule_le')::timestamptz as calcule_le
      from jsonb_array_elements(v_lignes) e
      where (m.role in ('gerant', 'admin')
             or exists (select 1 from public.lorani_membres_projet mp
                        where mp.client_id = p_client and mp.projet_id = (e.value ->> 'projet')::uuid and mp.user_id = m.user_id))
        and private.lorani_voit_projet_pour(m.user_id, p_client, (e.value ->> 'entite')::uuid, (e.value ->> 'projet')::uuid)
      order by 2, 3 nulls last, 4
      limit 50
    ) s;
    if jsonb_array_length(v_items) = 0 then
      perform private.retirer_section(p_client, 'lorani', p_jour, m.user_id, null, v_titre);
    else
      perform private.deposer_section(p_client, 'lorani', p_jour, m.user_id, null, v_titre, v_items,
                                      null, null, false, v_du, false, 40);
      n := n + 1;
    end if;
  end loop;
  return n;
end $function$


-- ═══ FONCTION private.lorani_ecarter_date_lue
CREATE OR REPLACE FUNCTION private.lorani_ecarter_date_lue(p_id uuid, p_motif text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.lorani_permis_dates_lues;
begin
  select * into d from public.lorani_permis_dates_lues where id = p_id for update;
  if not found or ((select auth.uid()) is not null
                   and not private.lorani_ecrit_projet(d.client_id, d.entite_id, d.projet_id)) then
    raise exception 'Proposition introuvable.' using errcode = 'P0002';
  end if;
  if d.statut <> 'proposee' then
    raise exception 'Cette proposition est déjà %.', case d.statut when 'confirmee' then 'confirmée' else 'écartée' end
      using errcode = '55000';
  end if;
  if nullif(btrim(p_motif), '') is null or char_length(btrim(p_motif)) > 300 then
    raise exception 'Dites en une phrase pourquoi cette lecture est écartée.' using errcode = '22023';
  end if;
  update public.lorani_permis_dates_lues
     set statut = 'ecartee', motif = btrim(p_motif), decide_par = (select auth.uid()), decide_le = now(), maj_le = now()
   where id = d.id;
  perform private.journaliser_module(d.client_id, 'lorani', 'lorani.date_lue_ecartee', 'lorani_permis_dates_lues', d.id::text,
    jsonb_build_object('nature', d.nature, 'piece', d.piece_id, 'type_piece', d.type_piece), d.entite_id);
  update public.alertes
     set acquittee_le = now(), detail = detail || jsonb_build_object('resolution', 'écartée')
   where client_id = d.client_id and cle_regroupement = 'lorani:lecture:' || d.id and acquittee_le is null;
end $function$


-- ═══ FONCTION private.lorani_ecrit_projet
CREATE OR REPLACE FUNCTION private.lorani_ecrit_projet(p_client uuid, p_entite uuid, p_projet uuid, p_roles text[] DEFAULT ARRAY['gerant'::text, 'admin'::text, 'valideur'::text, 'collaborateur'::text])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select private.a_un_role(p_client, p_roles)
     and private.perimetre_couvre((select auth.uid()), p_client, p_entite)
     and private.ecrit_objet(p_client, 'lorani_projet', p_projet::text)
$function$


-- ═══ FONCTION private.lorani_enregistrer_mesures
CREATE OR REPLACE FUNCTION private.lorani_enregistrer_mesures(p_client uuid, p_jour date, p_instantane boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  n integer := 0;
begin
  for r in select * from private.lorani_rappels_j10(p_client, p_jour, p_jour) x where x.base > 0 loop
    perform private.enregistrer_mesure(p_client, 'lorani.calendrier.rappels_j10', 1, 'jour', p_jour,
                                       null, r.base, 'reel', r.partis, r.entite_id);
    n := n + 1;
  end loop;
  if p_instantane then
    for r in select * from private.lorani_dates_completes(p_client) x where x.en_cours > 0 loop
      perform private.enregistrer_mesure(p_client, 'lorani.calendrier.dates_completes', 1, 'jour', p_jour,
                                         null, r.en_cours, 'reel', r.complets, r.entite_id);
      n := n + 1;
    end loop;
  end if;
  return n;
end $function$


-- ═══ FONCTION private.lorani_garder_permis
CREATE OR REPLACE FUNCTION private.lorani_garder_permis()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.numero := nullif(btrim(new.numero), '');
  new.intitule := nullif(btrim(new.intitule), '');
  new.cas_rejet := coalesce((select array_agg(distinct x order by x) from unnest(new.cas_rejet) x where x is not null), '{}');
  if exists (select 1 from unnest(new.cas_rejet) x where not exists (select 1 from public.lorani_cas_rejet c where c.code = x)) then
    raise exception 'Cas de rejet inconnu : %.',
      (select x from unnest(new.cas_rejet) x where not exists (select 1 from public.lorani_cas_rejet c where c.code = x) limit 1)
      using errcode = '22023', hint = 'Voir la liste public.lorani_cas_rejet (art. R*424-2).';
  end if;
  -- Une décision implicite ne se saisit pas : elle se confirme, et le moteur la date.
  if current_user = 'authenticated' and new.decision in ('tacite', 'rejet_implicite') then
    if tg_op = 'INSERT' then
      raise exception 'Une décision implicite se confirme par lorani_confirmer_decision_implicite, qui en calcule la date.'
        using errcode = '42501';
    elsif old.decision is distinct from new.decision or old.date_decision is distinct from new.date_decision then
      raise exception 'Une décision implicite se confirme par lorani_confirmer_decision_implicite, qui en calcule la date.'
        using errcode = '42501';
    end if;
  end if;
  if tg_op = 'UPDATE' then
    new.maj_le := now();
  end if;
  return new;
end $function$


-- ═══ FONCTION private.lorani_heriter_projet
CREATE OR REPLACE FUNCTION private.lorani_heriter_projet()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_entite uuid;
begin
  select p.entite_id into v_entite from public.lorani_projets p
  where p.client_id = new.client_id and p.id = new.projet_id;
  if not found then
    raise exception 'Projet introuvable dans cette organisation.' using errcode = '23503';
  end if;
  new.entite_id := v_entite;
  return new;
end $function$


-- ═══ FONCTION private.lorani_jour_client
CREATE OR REPLACE FUNCTION private.lorani_jour_client(p_client uuid)
 RETURNS date
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select (now() at time zone coalesce(
    (select t.fuseau from public.territoires t where t.code = private.point_territoire_client(p_client)),
    'Europe/Paris'))::date
$function$


-- ═══ FONCTION private.lorani_lectures_passage
CREATE OR REPLACE FUNCTION private.lorani_lectures_passage()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t public.travaux;
  r record;
  v_res jsonb;
  n integer := 0;
  n_erreurs integer := 0;
  n_agences integer := 0;
begin
  for t in select * from private.prendre_travaux(array['lorani.piece_lue'], 200, interval '10 minutes', 'lorani_lecture') loop
    begin
      v_res := private.lorani_lire_piece((t.charge ->> 'piece')::uuid);
      perform private.finir_travail(t.id, v_res);
      n := n + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 2000));
      n_erreurs := n_erreurs + 1;
    end;
  end loop;
  -- Le battement de chaque agence qui a des dossiers en cours, même à vide.
  for r in select distinct pr.client_id from public.lorani_projets pr where pr.actif loop
    perform private.battre(r.client_id, 'lorani_lecture', jsonb_build_object('passage', now()), interval '15 minutes');
    n_agences := n_agences + 1;
  end loop;
  return jsonb_build_object('pieces', n, 'erreurs', n_erreurs, 'agences', n_agences);
end $function$


-- ═══ FONCTION private.lorani_lien_permis
CREATE OR REPLACE FUNCTION private.lorani_lien_permis(p_permis uuid)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select '/secteurs/architectes/permis?permis=' || p_permis::text
$function$


-- ═══ FONCTION private.lorani_ligne_du_point
CREATE OR REPLACE FUNCTION private.lorani_ligne_du_point(p lorani_permis, p_projet lorani_projets, p_jour date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c jsonb := p.calcul;
  v_titre text := private.lorani_titre_permis(p, p_projet);
  v_dp boolean := p.type_autorisation = 'dp';
  v_impl jsonb := p.calcul -> 'decision_implicite';
  v_effet text;
  v_d date;
  v_n integer;
  v_gravite text;
  v_texte text;
begin
  if not p.actif or not p_projet.actif then
    return null;
  end if;
  -- Des dates lues sur les courriers attendent un membre : elles passent avant le reste, sauf une décision implicite.
  if p.etat <> 'decision_a_confirmer' then
    select count(*)::integer into v_n from public.lorani_permis_dates_lues l
    where l.client_id = p.client_id and l.permis_id = p.id and l.statut = 'proposee';
    if v_n > 0 then
      return jsonb_build_object(
        'texte', left(format('%s : %s sur les courriers de la mairie, à confirmer ou à écarter.', v_titre,
                             case when v_n = 1 then 'une date lue' else v_n || ' dates lues' end), 300),
        'lien', private.lorani_lien_permis(p.id), 'gravite', 'attention',
        'objet_type', 'lorani_projet', 'objet_id', p.projet_id::text, '_rang', 2, '_date', null);
    end if;
  end if;
  v_effet := case when c #>> '{regime,silence}' = 'rejet'
                  then case when v_dp then 'opposition tacite' else 'rejet implicite' end
                  else case when v_dp then 'non-opposition tacite' else 'permis tacite' end end;
  case p.etat
    when 'decision_a_confirmer' then
      v_d := (v_impl ->> 'date')::date;
      v_gravite := case when v_impl ->> 'nature' = 'tacite' then 'attention' else 'critique' end;
      v_texte := format('%s : %s le %s si aucune décision ne vous a été notifiée. À confirmer, ou saisir la décision reçue.',
        v_titre,
        case when v_impl ->> 'nature' = 'tacite'
             then case when v_dp then 'non-opposition tacite' else 'permis tacite né' end
             else case when v_dp then 'opposition tacite' else 'rejet implicite' end end,
        to_char(v_d, 'DD/MM/YYYY'));
    when 'pieces_demandees' then
      v_d := (select (s ->> 'date')::date from jsonb_array_elements(c -> 'etapes') s where s ->> 'nature' = 'pieces' limit 1);
      v_gravite := case when v_d - p_jour <= 3 then 'critique' when v_d - p_jour <= 10 then 'attention' else 'info' end;
      v_texte := format('%s : pièces manquantes à faire recevoir par la mairie au plus tard le %s (%s), sinon %s.',
        v_titre, to_char(v_d, 'DD/MM/YYYY'), private.lorani_quand(v_d - p_jour),
        case when v_dp then 'opposition tacite' else 'rejet tacite' end);
    when 'accorde' then
      if p.date_affichage is null then
        v_d := (select (s ->> 'date')::date from jsonb_array_elements(c -> 'etapes') s where s ->> 'nature' = 'affichage' limit 1);
        v_gravite := case when p_jour > v_d then 'attention' else 'info' end;
        v_texte := format('%s : affichage du permis sur le terrain %s, puis sa date à saisir : le recours des tiers ne court qu''à partir de lui.',
          v_titre, case when p_jour > v_d then 'en retard' else 'à faire d''ici le ' || to_char(v_d, 'DD/MM/YYYY') end);
      elsif (c ->> 'date_purge')::date <= p_jour + 30 then
        v_d := (c ->> 'date_purge')::date;
        v_gravite := 'info';
        v_texte := format('%s : purgé à l''issue du %s ; chantier sans risque de retrait ni de recours des tiers dès le %s.',
          v_titre, to_char(v_d, 'DD/MM/YYYY'), to_char(v_d + 1, 'DD/MM/YYYY'));
      else
        return null;
      end if;
    when 'recours_en_cours' then
      v_gravite := 'info';
      v_texte := format('%s : un recours est en cours ; pas de purge avant son issue, à saisir ici.', v_titre);
    when 'completude', 'instruction' then
      v_d := (c ->> 'date_decision_attendue')::date;
      if v_d is null or v_d > p_jour + 30 then
        return null;
      end if;
      v_gravite := 'info';
      v_texte := format('%s : %sdécision de la mairie attendue au plus tard le %s (%s) ; sans réponse, %s le %s.',
        v_titre,
        case when p.etat = 'completude'
             then format('sans demande de pièces d''ici le %s, ', to_char(
                    (select (s ->> 'date')::date from jsonb_array_elements(c -> 'etapes') s where s ->> 'nature' = 'completude' limit 1),
                    'DD/MM/YYYY'))
             else '' end,
        to_char(v_d, 'DD/MM/YYYY'), private.lorani_quand(v_d - p_jour), v_effet, to_char(v_d + 1, 'DD/MM/YYYY'));
    when 'purge' then
      v_d := (c ->> 'date_purge')::date;
      if v_d is null or v_d < p_jour - 8 then
        return null;
      end if;
      v_gravite := 'info';
      v_texte := format('%s : purgé depuis le %s ; le chantier peut démarrer sans risque de retrait ni de recours des tiers.',
        v_titre, to_char(v_d + 1, 'DD/MM/YYYY'));
    else
      return null;
  end case;
  return jsonb_build_object(
    'texte', left(v_texte, 300), 'lien', private.lorani_lien_permis(p.id), 'gravite', v_gravite,
    'objet_type', 'lorani_projet', 'objet_id', p.projet_id::text,
    '_rang', case v_gravite when 'critique' then 1 when 'attention' then 2 else 3 end, '_date', v_d);
end $function$


-- ═══ FONCTION private.lorani_lire_piece
CREATE OR REPLACE FUNCTION private.lorani_lire_piece(p_piece uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.pieces;
  v_projet public.lorani_projets;
  x public.lorani_permis;
  v_valeurs jsonb;
  v_props jsonb;
  e jsonb;
  v_numero text;
  v_permis uuid;
  v_verifiee boolean;
  v_citations jsonb;
  v_id uuid;
  n integer := 0;
begin
  select * into p from public.pieces where id = p_piece;
  if not found then
    return jsonb_build_object('ignore', 'pièce introuvable');
  end if;
  if p.module <> 'lorani' or p.objet_type is distinct from 'lorani_projet' then
    return jsonb_build_object('ignore', 'pièce hors d''un dossier de Lorani');
  end if;
  if p.chiffrement is not null then
    return jsonb_build_object('ignore', 'pièce chiffrée');
  end if;
  if p.statut not in ('lue', 'a_verifier') then
    return jsonb_build_object('ignore', 'pièce non lue');
  end if;
  select * into v_projet from public.lorani_projets pr where pr.client_id = p.client_id and pr.id::text = p.objet_id;
  if not found then
    return jsonb_build_object('ignore', 'dossier introuvable');
  end if;

  v_valeurs := private.lorani_valeurs_de_piece(p.id);
  v_props := private.lorani_propositions(p.type_piece, v_valeurs);
  if jsonb_array_length(v_props) = 0 then
    if p.type_piece = 'lorani_arrete' and v_valeurs #>> '{decision,valeur}' = 'sursis' then
      perform private.lever_alerte_module(p.client_id, 'lorani', 'attention',
        left(format('« %s » : arrêté de sursis à statuer reçu. Le calendrier ne le calcule pas : à voir avec votre conseil.',
                    left(v_projet.nom, 80)), 200),
        jsonb_build_object('projet', v_projet.id, 'piece', p.id, 'lien', '/secteurs/architectes/permis'),
        'lecture:sursis:' || p.id, true, private.lorani_chef_de_projet(p.client_id, v_projet.id));
    end if;
    return jsonb_build_object('piece', p.id, 'type_piece', p.type_piece, 'propositions', 0);
  end if;

  -- Le permis visé : celui dont le numéro concorde, sinon le seul permis en cours du dossier.
  v_numero := private.lorani_numero_dossier(v_valeurs #>> '{numero_dossier,valeur}');
  if v_numero is not null then
    select x2.id into v_permis from public.lorani_permis x2
    where x2.client_id = p.client_id and x2.projet_id = v_projet.id and x2.actif
      and private.lorani_numero_dossier(x2.numero) = v_numero
    order by x2.cree_le limit 1;
  end if;
  if v_permis is null then
    select case when count(*) = 1 then min(x2.id::text)::uuid end into v_permis
    from public.lorani_permis x2
    where x2.client_id = p.client_id and x2.projet_id = v_projet.id and x2.actif
      and (v_numero is null or x2.numero is null or private.lorani_numero_dossier(x2.numero) = v_numero);
  end if;

  for e in select * from jsonb_array_elements(v_props) loop
    if v_permis is not null then
      select * into x from public.lorani_permis where id = v_permis;
      continue when private.lorani_deja_saisi(x, e ->> 'nature', e -> 'valeurs');
    end if;
    v_verifiee := not exists (select 1 from jsonb_array_elements_text(e -> 'champs') c
                              where v_valeurs ? c and jsonb_typeof(v_valeurs -> c) = 'object'
                                and not coalesce((v_valeurs #>> array[c, 'verifiee'])::boolean, false))
                  and not exists (select 1 from jsonb_array_elements_text(e -> 'champs') c,
                                                jsonb_array_elements(case jsonb_typeof(v_valeurs -> c) when 'array'
                                                                          then v_valeurs -> c else '[]'::jsonb end) r
                                  where not coalesce((r ->> 'verifiee')::boolean, false));
    select coalesce(jsonb_agg(jsonb_build_object('champ', c, 'texte', r ->> 'texte', 'page', (r ->> 'page')::integer,
                                                 'verifiee', coalesce((r ->> 'verifiee')::boolean, false))), '[]'::jsonb)
      into v_citations
    from jsonb_array_elements_text(e -> 'champs') c,
         jsonb_array_elements(case jsonb_typeof(v_valeurs -> c) when 'array' then v_valeurs -> c
                                   when 'object' then jsonb_build_array(v_valeurs -> c) else '[]'::jsonb end) r;

    v_id := null;
    insert into public.lorani_permis_dates_lues (client_id, entite_id, projet_id, permis_id, piece_id, type_piece, nature,
                                                 proposition, citations, verifiee)
    values (p.client_id, v_projet.entite_id, v_projet.id, v_permis, p.id, p.type_piece, e ->> 'nature',
            e -> 'valeurs', v_citations, v_verifiee)
    on conflict (client_id, piece_id, nature) do update
      set permis_id = excluded.permis_id, type_piece = excluded.type_piece, proposition = excluded.proposition,
          citations = excluded.citations, verifiee = excluded.verifiee, maj_le = now()
      where lorani_permis_dates_lues.statut = 'proposee'
    returning id into v_id;
    if v_id is not null then
      n := n + 1;
      perform private.lever_alerte_module(p.client_id, 'lorani', 'info',
        left(format('« %s » : %s lu%s sur %s, à confirmer.', left(v_projet.nom, 80),
          case e ->> 'nature' when 'depot' then 'date de dépôt' when 'delai_notifie' then 'délai d''instruction notifié'
                              when 'demande_pieces' then 'demande de pièces' when 'decision' then 'décision de la mairie'
                              when 'decision_tacite' then 'permis tacite' else 'premier jour d''affichage' end,
          case when e ->> 'nature' in ('depot', 'demande_pieces', 'decision') then 'e' else '' end,
          case p.type_piece when 'lorani_recepisse_depot' then 'le récépissé de dépôt'
                            when 'lorani_lettre_delai' then 'la lettre de la mairie'
                            when 'lorani_demande_pieces' then 'la demande de pièces'
                            when 'lorani_arrete' then 'l''arrêté'
                            when 'lorani_certificat_tacite' then 'le certificat'
                            else 'le constat d''affichage' end), 200),
        jsonb_build_object('projet', v_projet.id, 'permis', v_permis, 'piece', p.id, 'proposition', v_id,
                           'lien', '/secteurs/architectes/permis'),
        'lecture:' || v_id, true, private.lorani_chef_de_projet(p.client_id, v_projet.id));
    end if;
  end loop;
  return jsonb_strip_nulls(jsonb_build_object('piece', p.id, 'type_piece', p.type_piece, 'propositions', n,
                                              'permis', v_permis));
end $function$


-- ═══ FONCTION private.lorani_mesurer_calendrier
CREATE OR REPLACE FUNCTION private.lorani_mesurer_calendrier(p_client uuid, p_du date, p_au date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'client', p_client, 'du', p_du, 'au', p_au,
    'rappels_j10', jsonb_build_object(
      'attendus', coalesce((select sum(r.base) from private.lorani_rappels_j10(p_client, p_du, p_au) r), 0),
      'partis', coalesce((select sum(r.partis) from private.lorani_rappels_j10(p_client, p_du, p_au) r), 0)),
    'dates_completes', jsonb_build_object(
      'permis', coalesce((select sum(d.en_cours) from private.lorani_dates_completes(p_client) d), 0),
      'complets', coalesce((select sum(d.complets) from private.lorani_dates_completes(p_client) d), 0)))
$function$


-- ═══ FONCTION private.lorani_numero_dossier
CREATE OR REPLACE FUNCTION private.lorani_numero_dossier(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select nullif(upper(regexp_replace(coalesce(p, ''), '[^0-9A-Za-z]', '', 'g')), '')
$function$


-- ═══ FONCTION private.lorani_ouvrir_projet_au_createur
CREATE OR REPLACE FUNCTION private.lorani_ouvrir_projet_au_createur()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := (select auth.uid());
begin
  -- Seulement pour un membre de l'organisation : pour tout autre, la politique refuse l'insertion.
  if v_uid is not null
     and exists (select 1 from public.comptes c where c.user_id = v_uid and c.client_id = new.client_id)
     and not private.a_un_role(new.client_id, array['gerant']) then
    insert into public.acces_objets (client_id, objet_type, objet_id, user_id, niveau)
    values (new.client_id, 'lorani_projet', new.id::text, v_uid, 'ecriture')
    on conflict do nothing;
  end if;
  return new;
end $function$


-- ═══ FONCTION private.lorani_permis_a_recalculer
CREATE OR REPLACE FUNCTION private.lorani_permis_a_recalculer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform private.lorani_recalculer_permis(new.id, case tg_op when 'INSERT' then 'creation' else 'saisie' end);
  return null;
end $function$


-- ═══ FONCTION private.lorani_poser_echeances
CREATE OR REPLACE FUNCTION private.lorani_poser_echeances(p lorani_permis, p_projet lorani_projets, p_calcul jsonb, p_raison text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e jsonb;
  l public.lorani_permis_echeances;
  d public.delais;
  v_existe boolean;
  v_pose boolean;
  v_sig text;
  v_delai uuid;
  v_n integer;
  v_rappels integer[];
  v_resp uuid := private.lorani_chef_de_projet(p.client_id, p.projet_id);
  v_natures text[] := '{}';
  v_jour date := (p_calcul ->> 'aujourdhui')::date;
  v_libelle text;
  v_cle text;
  v_poses integer := 0;
  v_annules integer := 0;
  v_tenus integer := 0;
  v_motif_fin text;
begin
  for e in select * from jsonb_array_elements(coalesce(p_calcul -> 'echeances', '[]'::jsonb)) loop
    v_natures := v_natures || (e ->> 'nature');
    v_rappels := array(select (x #>> '{}')::integer from jsonb_array_elements(coalesce(e -> 'rappels', '[]'::jsonb)) x);
    v_sig := concat_ws('|', e ->> 'nature', coalesce(e ->> 'regle', ''), coalesce(e ->> 'depart', ''), coalesce(e ->> 'date', ''),
                       coalesce(e ->> 'notifiee', ''), p_projet.territoire, array_to_string(v_rappels, ','),
                       coalesce(v_resp::text, ''));
    v_pose := false;
    select * into l from public.lorani_permis_echeances x where x.permis_id = p.id and x.nature = e ->> 'nature' and x.courante;
    v_existe := found;
    if v_existe and l.signature is distinct from v_sig then
      select * into d from public.delais where id = l.delai_id;
      if found and d.statut in ('ouvert', 'depasse') then
        perform private.clore_delai(d.id, 'annule', left(format('Recalculé (%s) : la base du calcul a changé.', p_raison), 300));
        v_annules := v_annules + 1;
      end if;
      update public.lorani_permis_echeances set courante = false where id = l.id;
      v_existe := false;
    end if;
    if not v_existe then
      select count(*)::integer + 1 into v_n from public.lorani_permis_echeances x
      where x.permis_id = p.id and x.nature = e ->> 'nature';
      v_libelle := left(format('%s « %s » : %s', upper(p.type_autorisation), left(p_projet.nom, 80), e ->> 'libelle'), 200);
      v_cle := format('lorani:permis:%s:%s:%s', p.id, e ->> 'nature', v_n);
      if e ? 'regle' then
        v_delai := private.poser_delai(p.client_id, 'lorani', 'lorani_projet', p.projet_id::text, v_libelle,
          e ->> 'regle', (e ->> 'depart')::date, p_projet.territoire, v_rappels, v_resp, e ->> 'action', v_cle);
        if e ? 'notifiee' then
          perform private.notifier_delai(v_delai, (e ->> 'notifiee')::date, left(e ->> 'source_notification', 300));
        end if;
      else
        v_delai := private.poser_delai_date(p.client_id, 'lorani', 'lorani_projet', p.projet_id::text, v_libelle,
          (e ->> 'date')::date, left(e ->> 'source', 300), p_projet.territoire, v_rappels, v_resp, e ->> 'action', v_cle);
      end if;
      insert into public.lorani_permis_echeances (client_id, projet_id, permis_id, nature, delai_id, signature)
      values (p.client_id, p.projet_id, p.id, e ->> 'nature', v_delai, v_sig)
      returning * into l;
      v_poses := v_poses + 1;
      v_pose := true;
    end if;

    select * into d from public.delais where id = l.delai_id;
    if d.statut in ('ouvert', 'depasse') and (
         e ->> 'statut' = 'tenu'
         or (coalesce((e ->> 'information')::boolean, false) and (d.statut = 'depasse' or d.echeance < v_jour))) then
      perform private.clore_delai(d.id, 'tenu', null);
      v_tenus := v_tenus + 1;
      update public.alertes
         set acquittee_le = now(), detail = detail || jsonb_build_object('resolution', 'échéance tenue')
       where client_id = p.client_id and cle_regroupement like format('lorani:permis:%s:%s:%%', p.id, e ->> 'nature')
         and acquittee_le is null;
    end if;
  end loop;

  v_motif_fin := case p_calcul ->> 'etat'
    when 'classe' then 'Permis classé' when 'annule' then 'Permis annulé ou retiré' when 'refuse' then 'Permis refusé'
    when 'rejete' then 'Demande rejetée' when 'hors_catalogue' then 'Territoire hors du catalogue'
    else 'Échéance sans objet' end;
  for l in select * from public.lorani_permis_echeances x
           where x.permis_id = p.id and x.courante and not (x.nature = any (v_natures)) loop
    select * into d from public.delais where id = l.delai_id;
    if found and d.statut in ('ouvert', 'depasse') then
      perform private.clore_delai(d.id, 'annule', left(format('%s (%s).', v_motif_fin, p_raison), 300));
      v_annules := v_annules + 1;
    end if;
    update public.lorani_permis_echeances set courante = false where id = l.id;
  end loop;

  return jsonb_build_object('poses', v_poses, 'annules', v_annules, 'tenus', v_tenus);
end $function$


-- ═══ FONCTION private.lorani_preparer_projet
CREATE OR REPLACE FUNCTION private.lorani_preparer_projet()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.entite_id is null then
    select e.id into new.entite_id from public.entites e where e.client_id = new.client_id and e.principale;
  end if;
  new.nom := btrim(new.nom);
  new.reference := nullif(btrim(new.reference), '');
  new.commune := nullif(btrim(new.commune), '');
  new.parcelles := coalesce((select array_agg(upper(regexp_replace(btrim(p), '\s+', ' ', 'g')) order by o)
                             from unnest(new.parcelles) with ordinality as u(p, o)
                             where nullif(btrim(p), '') is not null), '{}');
  if exists (select 1 from unnest(new.parcelles) p where p !~ '^[0-9A-Z ]{2,24}$') then
    raise exception 'Référence cadastrale illisible : « % ».',
      (select p from unnest(new.parcelles) p where p !~ '^[0-9A-Z ]{2,24}$' limit 1)
      using errcode = '22023', hint = 'Écrire la section et le numéro, par exemple « AB 123 ».';
  end if;
  new.territoire := coalesce(public.lorani_territoire_du_lieu(new.code_insee, new.code_postal),
                             new.territoire,
                             private.territoire_de_entite(new.client_id, new.entite_id));
  if tg_op = 'UPDATE' then
    new.maj_le := now();
  end if;
  return new;
end $function$


-- ═══ FONCTION private.lorani_preparer_recours
CREATE OR REPLACE FUNCTION private.lorani_preparer_recours()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p public.lorani_permis;
begin
  select * into p from public.lorani_permis where client_id = new.client_id and id = new.permis_id;
  if not found then
    raise exception 'Permis introuvable dans cette organisation.' using errcode = '23503';
  end if;
  new.projet_id := p.projet_id;
  new.entite_id := p.entite_id;
  new.auteur := nullif(btrim(new.auteur), '');
  if p.decision is null or p.decision not in ('favorable', 'tacite') then
    raise exception 'Un recours se saisit contre un permis accordé, exprès ou tacite confirmé.' using errcode = '22023';
  end if;
  if new.date_recours < p.date_decision then
    raise exception 'Le recours (%) ne peut précéder la décision (%).',
      to_char(new.date_recours, 'DD/MM/YYYY'), to_char(p.date_decision, 'DD/MM/YYYY') using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' then
    new.maj_le := now();
  end if;
  return new;
end $function$


-- ═══ FONCTION private.lorani_projet_a_recalculer
CREATE OR REPLACE FUNCTION private.lorani_projet_a_recalculer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r record;
begin
  for r in select x.id from public.lorani_permis x where x.client_id = new.client_id and x.projet_id = new.id loop
    perform private.lorani_recalculer_permis(r.id, 'dossier modifié');
  end loop;
  return null;
end $function$


-- ═══ FONCTION private.lorani_propositions
CREATE OR REPLACE FUNCTION private.lorani_propositions(p_type text, p_valeurs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  v jsonb := coalesce(p_valeurs, '{}'::jsonb);
  v_date date;
  v_decision text;
  v_pieces jsonb;
begin
  if p_type = 'lorani_recepisse_depot' then
    v_date := private.lorani_date_lue(v #>> '{date_depot,valeur}');
    if v_date is not null then
      return jsonb_build_array(jsonb_build_object(
        'nature', 'depot', 'champs', jsonb_build_array('date_depot', 'numero_dossier'),
        'valeurs', jsonb_strip_nulls(jsonb_build_object(
          'date_depot', v_date, 'numero', private.lorani_numero_dossier(v #>> '{numero_dossier,valeur}')))));
    end if;
  elsif p_type = 'lorani_lettre_delai' then
    v_date := private.lorani_date_lue(v #>> '{date_lettre,valeur}');
    if (case when v #>> '{delai_mois,valeur}' ~ '^\d{1,2}$'
             then (v #>> '{delai_mois,valeur}')::integer between 1 and 24 else false end) then
      return jsonb_build_array(jsonb_build_object(
        'nature', 'delai_notifie', 'champs', jsonb_build_array('delai_mois', 'date_lettre'),
        'valeurs', jsonb_strip_nulls(jsonb_build_object(
          'delai_notifie_mois', (v #>> '{delai_mois,valeur}')::integer, 'date_notification_delai', v_date))));
    end if;
  elsif p_type = 'lorani_demande_pieces' then
    v_date := private.lorani_date_lue(v #>> '{date_lettre,valeur}');
    if v_date is not null then
      -- Chaque pièce une fois, dans l'ordre de la lettre.
      select coalesce(jsonb_agg(jsonb_build_object('code', y.code) order by y.rang), '[]'::jsonb)
        into v_pieces
      from (select x.code, min(x.rang) as rang
            from (select upper(regexp_replace(e.valeur #>> '{valeur}', '\s', '', 'g')) as code, e.rang
                  from jsonb_array_elements(case jsonb_typeof(v -> 'pieces') when 'array' then v -> 'pieces'
                                                 when 'object' then jsonb_build_array(v -> 'pieces')
                                                 else '[]'::jsonb end) with ordinality as e(valeur, rang)
                  where e.valeur #>> '{valeur}' ~* '^\s*(PC|PA|PD|DP|CU)\s*\d{1,2}(\s*-?\s*\d{1,2})?\s*$') x
            group by x.code) y;
      return jsonb_build_array(jsonb_build_object(
        'nature', 'demande_pieces', 'champs', jsonb_build_array('date_lettre', 'pieces'),
        'valeurs', jsonb_build_object('date_demande_pieces', v_date, 'pieces', v_pieces)));
    end if;
  elsif p_type = 'lorani_arrete' then
    v_date := private.lorani_date_lue(v #>> '{date_decision,valeur}');
    v_decision := case v #>> '{decision,valeur}'
      when 'accorde' then 'favorable' when 'non_opposition' then 'favorable'
      when 'refuse' then 'defavorable' when 'opposition' then 'defavorable' end;
    if v_date is not null and v_decision is not null then
      return jsonb_build_array(jsonb_build_object(
        'nature', 'decision', 'champs', jsonb_build_array('decision', 'date_decision'),
        'valeurs', jsonb_build_object('decision', v_decision, 'date_decision', v_date)));
    end if;
  elsif p_type = 'lorani_certificat_tacite' then
    v_date := private.lorani_date_lue(v #>> '{date_tacite,valeur}');
    if v_date is not null then
      return jsonb_build_array(jsonb_build_object(
        'nature', 'decision_tacite', 'champs', jsonb_build_array('date_tacite'),
        'valeurs', jsonb_build_object('date_decision', v_date)));
    end if;
  elsif p_type = 'lorani_constat_affichage' then
    v_date := private.lorani_date_lue(v #>> '{date_constat,valeur}');
    if v_date is not null and coalesce(v #>> '{passage,valeur}', '1') = '1' then
      return jsonb_build_array(jsonb_build_object(
        'nature', 'affichage', 'champs', jsonb_build_array('date_constat'),
        'valeurs', jsonb_build_object('date_affichage', v_date)));
    end if;
  end if;
  return '[]'::jsonb;
end $function$


-- ═══ FONCTION private.lorani_quand
CREATE OR REPLACE FUNCTION private.lorani_quand(p_jours integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case when p_jours < 0 then 'dépassé' when p_jours = 0 then 'aujourd''hui' when p_jours = 1 then 'demain'
              else format('dans %s jours', p_jours) end
$function$


-- ═══ FONCTION private.lorani_rappels_j10
CREATE OR REPLACE FUNCTION private.lorani_rappels_j10(p_client uuid, p_du date, p_au date)
 RETURNS TABLE(entite_id uuid, jour date, base integer, partis integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select x.entite_id, d.echeance - 10, count(*)::integer, count(*) filter (where 10 = any (d.rappels_faits))::integer
  from public.lorani_permis_echeances e
  join public.lorani_permis x on x.client_id = e.client_id and x.id = e.permis_id
  join public.delais d on d.client_id = e.client_id and d.id = e.delai_id
  join public.territoires t on t.code = d.territoire
  where e.client_id = p_client and e.nature = 'pieces' and 10 = any (d.rappels)
    and d.echeance - 10 between p_du and p_au
    and (d.cree_le at time zone t.fuseau)::date <= d.echeance - 10
    and (d.clos_le is null or (d.clos_le at time zone t.fuseau)::date > d.echeance - 10 or 10 = any (d.rappels_faits))
  group by x.entite_id, d.echeance - 10
$function$


-- ═══ FONCTION private.lorani_recalculer_permis
CREATE OR REPLACE FUNCTION private.lorani_recalculer_permis(p_permis uuid, p_raison text DEFAULT 'recalcul'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.lorani_permis;
  v_projet public.lorani_projets;
  v_calcul jsonb;
  v_bilan jsonb;
  v_ancien text;
begin
  -- Un dossier qu'on efface ne se recalcule pas.
  if coalesce(current_setting('omega.effacement_objet', true), '') = 'oui'
     or coalesce(current_setting('omega.effacement_client', true), '') <> '' then
    return null;
  end if;
  select * into p from public.lorani_permis where id = p_permis for update;
  if not found then
    return null;
  end if;
  select * into v_projet from public.lorani_projets where client_id = p.client_id and id = p.projet_id;
  v_ancien := p.etat;
  v_calcul := public.lorani_calendrier_permis(
    to_jsonb(p) || jsonb_build_object(
      'territoire', v_projet.territoire,
      'actif', p.actif and v_projet.actif,
      'recours', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'nature', r.nature, 'date_recours', r.date_recours,
                                                                'issue', r.issue, 'date_issue', r.date_issue)
                                            order by r.date_recours, r.id)
                           from public.lorani_permis_recours r where r.permis_id = p.id), '[]'::jsonb)));
  v_bilan := private.lorani_poser_echeances(p, v_projet, v_calcul, p_raison);

  update public.lorani_permis
     set etat = v_calcul ->> 'etat', silence = v_calcul #>> '{regime,silence}',
         date_decision_attendue = (v_calcul ->> 'date_decision_attendue')::date,
         date_purge = (v_calcul ->> 'date_purge')::date, calcul = v_calcul, calcule_le = now()
   where id = p.id;

  if (v_bilan ->> 'poses')::integer + (v_bilan ->> 'annules')::integer + (v_bilan ->> 'tenus')::integer > 0
     or v_ancien is distinct from v_calcul ->> 'etat' then
    perform private.journaliser_module(p.client_id, 'lorani', 'lorani.echeances_recalculees', 'lorani_permis', p.id::text,
      jsonb_build_object('raison', p_raison, 'version', v_calcul ->> 'version', 'etat', v_calcul ->> 'etat') || v_bilan,
      p.entite_id);
  end if;

  -- Une affaire close ferme ses alertes ; puis ce qui est arrivé seul se signale.
  if v_calcul ->> 'etat' in ('classe', 'annule', 'refuse', 'rejete', 'purge', 'hors_catalogue') then
    update public.alertes
       set acquittee_le = now(), detail = detail || jsonb_build_object('resolution', 'permis : ' || (v_calcul ->> 'etat'))
     where client_id = p.client_id and cle_regroupement like format('lorani:permis:%s:%%', p.id) and acquittee_le is null;
  end if;
  if p_raison in ('evenement', 'passage quotidien') and v_ancien is distinct from v_calcul ->> 'etat' then
    perform private.lorani_alerter_transition(p, v_projet, v_calcul);
  end if;
  return v_calcul;
end $function$


-- ═══ FONCTION private.lorani_recours_a_recalculer
CREATE OR REPLACE FUNCTION private.lorani_recours_a_recalculer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'DELETE' then
    perform private.lorani_recalculer_permis(old.permis_id, 'recours');
  else
    perform private.lorani_recalculer_permis(new.permis_id, 'recours');
  end if;
  return null;
end $function$


-- ═══ FONCTION private.lorani_suivre_entite_projet
CREATE OR REPLACE FUNCTION private.lorani_suivre_entite_projet()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.lorani_lots set entite_id = new.entite_id where client_id = new.client_id and projet_id = new.id;
  update public.lorani_intervenants set entite_id = new.entite_id where client_id = new.client_id and projet_id = new.id;
  update public.lorani_membres_projet set entite_id = new.entite_id where client_id = new.client_id and projet_id = new.id;
  return null;
end $function$


-- ═══ FONCTION private.lorani_titre_permis
CREATE OR REPLACE FUNCTION private.lorani_titre_permis(p lorani_permis, p_projet lorani_projets)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select format('%s « %s »', upper(p.type_autorisation), left(p_projet.nom, 60))
$function$


-- ═══ FONCTION private.lorani_valeurs_de_piece
CREATE OR REPLACE FUNCTION private.lorani_valeurs_de_piece(p_piece uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with lues as (
    select pv.id, pv.champ, pv.valeur #>> '{}' as valeur, (pv.verifiee or pv.source = 'humain') as verifiee,
           pv.texte, pv.page, pv.boite, pv.source = 'humain' as humain, pv.cree_le
    from public.pieces_valeurs pv
    where pv.piece_id = p_piece and pv.chiffre is null
  ), simples as (
    select distinct on (l.champ) l.champ,
           jsonb_build_object('valeur', l.valeur, 'verifiee', l.verifiee, 'texte', l.texte, 'page', l.page) as v
    from lues l
    where l.champ <> 'pieces'
    order by l.champ, l.humain desc, l.verifiee desc, l.cree_le desc, l.id
  ), repetes as (
    select l.champ,
           jsonb_agg(jsonb_build_object('valeur', l.valeur, 'verifiee', l.verifiee, 'texte', l.texte, 'page', l.page)
                     order by l.page nulls last, (l.boite ->> 'y1')::numeric desc nulls last,
                              (l.boite ->> 'x0')::numeric nulls last, l.id) as v
    from lues l
    where l.champ = 'pieces'
      and (l.humain or not exists (select 1 from lues h where h.champ = 'pieces' and h.humain))
    group by l.champ
  )
  select coalesce(jsonb_object_agg(x.champ, x.v), '{}'::jsonb)
  from (select * from simples union all select * from repetes) x
$function$


-- ═══ FONCTION private.lorani_voit_projet
CREATE OR REPLACE FUNCTION private.lorani_voit_projet(p_client uuid, p_entite uuid, p_projet uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select p_client in (select private.mes_clients())
     and private.perimetre_couvre((select auth.uid()), p_client, p_entite)
     and private.voit_objet(p_client, 'lorani_projet', p_projet::text)
$function$


-- ═══ FONCTION private.lorani_voit_projet_pour
CREATE OR REPLACE FUNCTION private.lorani_voit_projet_pour(p_user uuid, p_client uuid, p_entite uuid, p_projet uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.comptes c where c.user_id = p_user and c.client_id = p_client)
     and private.perimetre_couvre(p_user, p_client, p_entite)
     and private.voit_objet_pour(p_user, p_client, 'lorani_projet', p_projet::text)
$function$


-- ═══ FONCTION public.lorani_calendrier_permis
CREATE OR REPLACE FUNCTION public.lorani_calendrier_permis(p_faits jsonb, p_aujourdhui date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  f jsonb := coalesce(p_faits, '{}'::jsonb);
  v_type text := coalesce(nullif(f ->> 'type_autorisation', ''), 'pc');
  v_t text := nullif(f ->> 'territoire', '');
  v_actif boolean := coalesce((f ->> 'actif')::boolean, true);
  v_protege boolean := coalesce((f ->> 'secteur_protege')::boolean, false);
  v_mh boolean := coalesce((f ->> 'immeuble_inscrit_mh')::boolean, false);
  v_erp boolean := coalesce((f ->> 'erp_autorisation')::boolean, false);
  v_igh boolean := coalesce((f ->> 'igh')::boolean, false);
  v_eval boolean := coalesce((f ->> 'evaluation_environnementale')::boolean, false);
  v_depot date := (f ->> 'date_depot')::date;
  v_demande date := (f ->> 'date_demande_pieces')::date;
  v_fournies date := (f ->> 'date_pieces_fournies')::date;
  v_notifie integer := (f ->> 'delai_notifie_mois')::integer;
  v_date_notif date := (f ->> 'date_notification_delai')::date;
  v_decision text := nullif(f ->> 'decision', '');
  v_date_decision date := (f ->> 'date_decision')::date;
  v_affichage date := (f ->> 'date_affichage')::date;
  v_nationaux constant text[] := array['metropole', 'alsace-moselle', 'guadeloupe', 'martinique', 'guyane', 'la-reunion', 'mayotte'];
  v_dp boolean;
  v_jour date;
  v_cas text[];
  v_regle text;
  v_motifs jsonb;
  v_silence text;
  v_special boolean;
  v_regime jsonb;
  v_etapes jsonb := '[]'::jsonb;
  v_ech jsonb := '[]'::jsonb;
  v_avert jsonb := '[]'::jsonb;
  v_c jsonb;
  v_fin_completude date;
  v_demande_valide boolean := false;
  v_fin_pieces date;
  v_depart date;
  v_certitude text;
  v_fin_instr date;
  v_fin_calc date;
  v_fin_notif date;
  v_impl_nature text;
  v_impl_date date;
  v_impl_motif text;
  v_attendue date;
  v_accord date;
  v_accord_certain boolean := false;
  v_relance date;
  v_fin_retrait date;
  v_fin_recours date;
  v_bornes date[] := '{}';
  v_en_cours boolean := false;
  v_annule boolean := false;
  v_purge date;
  v_detail_purge text;
  v_etat text;
  r jsonb;
  v_r_nature text;
  v_r_libelle text;
  v_r_date date;
  v_r_issue text;
  v_r_date_issue date;
  v_d date;
begin
  if v_type not in ('pc', 'pcmi', 'pa', 'pd', 'dp') then
    raise exception 'Type d''autorisation inconnu : %.', v_type using errcode = '22023';
  end if;
  if v_t is not null and not exists (select 1 from public.territoires t where t.code = v_t) then
    raise exception 'Territoire inconnu : %.', v_t using errcode = '22023';
  end if;
  v_dp := v_type = 'dp';
  v_jour := coalesce(p_aujourdhui, (now() at time zone coalesce(
    (select t.fuseau from public.territoires t where t.code = v_t), 'Europe/Paris'))::date);

  -- ── Le régime : la règle d'instruction et l'effet du silence ──
  select coalesce(array_agg(distinct x order by x), '{}') into v_cas
  from jsonb_array_elements_text(case when jsonb_typeof(f -> 'cas_rejet') = 'array' then f -> 'cas_rejet' else '[]'::jsonb end) x;
  if exists (select 1 from unnest(v_cas) x where not exists (select 1 from public.lorani_cas_rejet c where c.code = x)) then
    raise exception 'Cas de rejet inconnu : %.',
      (select x from unnest(v_cas) x where not exists (select 1 from public.lorani_cas_rejet c where c.code = x) limit 1)
      using errcode = '22023';
  end if;
  if v_mh then
    v_cas := array(select distinct x from unnest(v_cas || 'r424_2_c'::text) x order by x);
  end if;
  if v_eval and (v_depot is null or v_depot >= date '2025-12-31') then
    v_cas := array(select distinct x from unnest(v_cas || 'r424_2_1'::text) x order by x);
  elsif v_eval then
    v_avert := v_avert || to_jsonb('Évaluation environnementale : la demande est déposée avant le 31/12/2025, l''art. R424-2-1 ne s''applique pas ; le silence vaut accord.'::text);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('code', c.code, 'article', c.article, 'libelle', c.libelle,
                                               'source_url', c.source_url) order by c.code), '[]'::jsonb)
  into v_motifs from public.lorani_cas_rejet c where c.code = any (v_cas);
  v_silence := case when cardinality(v_cas) > 0 then 'rejet' else 'tacite' end;
  v_special := v_eval or 'r424_2_d' = any (v_cas);

  v_regle := 'lorani.urbanisme.instruction_' || case
    when v_mh and not v_dp then 'mh_inscrit'
    when (v_erp or v_igh) and v_type = 'pc' then 'erp_igh'
    when v_protege then v_type || '_protege'
    else v_type end;

  if v_mh and v_dp then
    v_avert := v_avert || to_jsonb('Des travaux sur un immeuble inscrit au titre des monuments historiques relèvent en principe d''un permis : vérifiez le type d''autorisation.'::text);
  end if;
  if (v_erp or v_igh) and v_type <> 'pc' then
    v_avert := v_avert || to_jsonb('Le délai de cinq mois d''un ERP ou d''un IGH (art. R423-28, b) ne vaut que pour un permis de construire.'::text);
  end if;
  if v_dp and exists (select 1 from unnest(v_cas) x where x not in ('r424_2_1', 'r424_2_ii')) then
    v_avert := v_avert || to_jsonb('Déclaration préalable : les cas de l''art. R*424-2, I visent les permis ; vérifiez l''effet du silence (art. R*424-3).'::text);
  end if;
  if v_special then
    v_avert := v_avert || to_jsonb('Enquête publique ou évaluation environnementale : le délai d''instruction peut partir du rapport du commissaire enquêteur (art. R*423-20) ou courir deux mois après ce rapport (art. R423-32). Le délai notifié par la mairie fait foi.'::text);
  end if;

  v_regime := jsonb_build_object(
    'type', v_type, 'regle_instruction', v_regle, 'silence', v_silence, 'motifs_silence', v_motifs,
    'effet_silence', case
      when v_silence = 'tacite' and v_dp then 'non-opposition tacite (art. R*424-1, a)'
      when v_silence = 'tacite' then 'permis tacite (art. R*424-1, b)'
      when v_dp then 'opposition tacite'
      else 'rejet implicite' end,
    'delai_notifie_mois', v_notifie);

  -- ── Hors du code de l'urbanisme national, rien n'est calculé ──
  if v_t is not null and not (v_t = any (v_nationaux)) then
    return jsonb_strip_nulls(jsonb_build_object(
      'version', 'lorani.m4.1', 'territoire', v_t, 'aujourdhui', v_jour,
      'etat', case when v_actif then 'hors_catalogue' else 'classe' end,
      'regime', v_regime, 'etapes', '[]'::jsonb, 'echeances', '[]'::jsonb,
      'avertissements', v_avert || to_jsonb(format(
        'Lorani ne calcule les délais d''urbanisme que là où s''applique le code de l''urbanisme national (métropole, Alsace-Moselle, Guadeloupe, Martinique, Guyane, La Réunion, Mayotte). Les règles de %s ne sont pas encore au catalogue.',
        (select t.libelle from public.territoires t where t.code = v_t)))));
  end if;

  if v_depot is null then
    return jsonb_strip_nulls(jsonb_build_object(
      'version', 'lorani.m4.1', 'territoire', v_t, 'aujourdhui', v_jour,
      'etat', case when v_actif then 'a_deposer' else 'classe' end,
      'regime', v_regime, 'etapes', '[]'::jsonb, 'echeances', '[]'::jsonb, 'avertissements', v_avert));
  end if;

  -- ── 1. Le dépôt et la complétude ──
  v_etapes := v_etapes || jsonb_build_array(jsonb_build_object(
    'nature', 'depot', 'libelle', 'Dépôt du dossier en mairie', 'date', v_depot, 'statut', 'fait'));

  v_c := public.echeance_de('lorani.urbanisme.completude', v_depot, v_t);
  v_fin_completude := (v_c ->> 'echeance')::date;
  v_demande_valide := v_demande is not null and v_demande <= v_fin_completude;
  v_etapes := v_etapes || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
    'nature', 'completude', 'libelle', 'Fin du délai de la mairie pour réclamer des pièces',
    'date', v_fin_completude, 'certitude', 'certaine',
    'statut', case when v_demande_valide then 'fait' when v_jour > v_fin_completude then 'passe' else 'a_venir' end,
    'issue', case
      when v_demande_valide then format('Pièces réclamées : demande reçue le %s.', to_char(v_demande, 'DD/MM/YYYY'))
      when v_jour > v_fin_completude then 'Aucune pièce réclamée à temps : le dossier est réputé complet au dépôt (art. R*423-22).'
      else 'La mairie peut encore réclamer des pièces ou notifier un délai majoré.' end,
    'regle', v_c ->> 'regle', 'version', (v_c ->> 'version')::integer, 'depart', v_depot,
    'detail', v_c ->> 'detail', 'source', v_c ->> 'source', 'source_url', v_c ->> 'source_url')));
  v_ech := v_ech || jsonb_build_array(jsonb_build_object(
    'nature', 'completude', 'libelle', 'fin du délai de la mairie pour réclamer des pièces',
    'regle', 'lorani.urbanisme.completude', 'depart', v_depot, 'echeance', v_fin_completude, 'rappels', '[]'::jsonb,
    'statut', case when v_demande_valide then 'tenu' else 'ouvert' end, 'information', true));
  if v_demande is not null and not v_demande_valide then
    v_avert := v_avert || to_jsonb(format(
      'La demande de pièces reçue le %s est arrivée après le délai d''un mois (fin le %s) : elle ne modifie pas le délai d''instruction (art. R*423-41).',
      to_char(v_demande, 'DD/MM/YYYY'), to_char(v_fin_completude, 'DD/MM/YYYY')));
  end if;

  -- ── 2. Les pièces manquantes ──
  if v_demande_valide then
    v_etapes := v_etapes || jsonb_build_array(jsonb_build_object(
      'nature', 'demande_pieces', 'libelle', 'Demande de pièces manquantes reçue', 'date', v_demande, 'statut', 'fait'));
    v_c := public.echeance_de('lorani.urbanisme.pieces_manquantes', v_demande, v_t);
    v_fin_pieces := (v_c ->> 'echeance')::date;
    if v_fournies is not null and v_fournies <= v_fin_pieces then
      v_depart := v_fournies;
    elsif v_fournies is not null then
      v_impl_nature := 'rejet_implicite';
      v_impl_date := v_fin_pieces + 1;
      v_impl_motif := format('Pièces reçues par la mairie le %s, après le délai de trois mois (fin le %s) : décision tacite de %s (art. R*423-39, b).',
        to_char(v_fournies, 'DD/MM/YYYY'), to_char(v_fin_pieces, 'DD/MM/YYYY'), case when v_dp then 'opposition' else 'rejet' end);
    elsif v_jour > v_fin_pieces then
      v_impl_nature := 'rejet_implicite';
      v_impl_date := v_fin_pieces + 1;
      v_impl_motif := format('Pièces manquantes non reçues par la mairie dans les trois mois (fin le %s) : décision tacite de %s (art. R*423-39, b), si rien n''a été reçu à temps.',
        to_char(v_fin_pieces, 'DD/MM/YYYY'), case when v_dp then 'opposition' else 'rejet' end);
    end if;
    v_etapes := v_etapes || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'nature', 'pieces', 'libelle', 'Pièces manquantes à adresser à la mairie, au plus tard',
      'date', v_fin_pieces, 'certitude', 'certaine',
      'statut', case
        when v_fournies is not null and v_fournies <= v_fin_pieces then 'fait'
        when v_fournies is not null or v_jour > v_fin_pieces then 'manque'
        else 'a_venir' end,
      'issue', case
        when v_fournies is not null and v_fournies <= v_fin_pieces
          then format('Toutes les pièces reçues par la mairie le %s : l''instruction en part (art. R*423-39, c).', to_char(v_fournies, 'DD/MM/YYYY'))
        else v_impl_motif end,
      'regle', v_c ->> 'regle', 'version', (v_c ->> 'version')::integer, 'depart', v_demande,
      'detail', v_c ->> 'detail', 'source', v_c ->> 'source', 'source_url', v_c ->> 'source_url')));
    v_ech := v_ech || jsonb_build_array(jsonb_build_object(
      'nature', 'pieces', 'libelle', 'pièces manquantes à adresser à la mairie',
      'regle', 'lorani.urbanisme.pieces_manquantes', 'depart', v_demande, 'echeance', v_fin_pieces,
      'rappels', '[10, 3, 0]'::jsonb,
      'statut', case when v_fournies is not null and v_fournies <= v_fin_pieces then 'tenu' else 'ouvert' end,
      'information', false,
      'action', 'Adresser à la mairie toutes les pièces demandées (art. R*423-39), puis saisir la date de leur réception.'));
  else
    v_depart := v_depot;
  end if;

  -- ── 3. L'instruction ──
  if v_depart is not null then
    v_c := public.echeance_de(v_regle, v_depart, v_t);
    v_fin_calc := (v_c ->> 'echeance')::date;
    if v_notifie is not null then
      v_fin_notif := public.ajouter_mois(v_depart, v_notifie);
      v_fin_instr := v_fin_notif;
      v_certitude := 'certaine';
      if v_date_notif is not null and v_date_notif > v_fin_completude then
        v_avert := v_avert || to_jsonb(format(
          'Le délai de %s mois a été notifié le %s, après le mois qui suit le dépôt (art. R*423-18) : une majoration notifiée hors délai peut être sans effet ; le délai de droit commun finit le %s.',
          v_notifie, to_char(v_date_notif, 'DD/MM/YYYY'), to_char(v_fin_calc, 'DD/MM/YYYY')));
      end if;
    else
      v_fin_instr := v_fin_calc;
      v_certitude := case
        when v_special then 'a_confirmer'
        when v_demande_valide or v_jour > v_fin_completude then 'certaine'
        else 'prevision' end;
    end if;
    v_etapes := v_etapes || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'nature', 'instruction', 'libelle', 'Fin de l''instruction : décision de la mairie au plus tard',
      'date', v_fin_instr, 'certitude', v_certitude, 'depart', v_depart,
      'statut', case when v_decision is not null then 'fait' when v_jour > v_fin_instr then 'passe' else 'a_venir' end,
      'date_calculee', v_fin_calc, 'date_notifiee', v_fin_notif,
      'regle', v_c ->> 'regle', 'version', (v_c ->> 'version')::integer,
      'detail', v_c ->> 'detail', 'source', v_c ->> 'source', 'source_url', v_c ->> 'source_url')));
    v_ech := v_ech || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'nature', 'instruction', 'libelle', 'fin de l''instruction, décision de la mairie au plus tard',
      'regle', v_regle, 'depart', v_depart, 'echeance', v_fin_instr, 'notifiee', v_fin_notif,
      'source_notification', case when v_notifie is not null then format('Délai de %s mois notifié par la mairie%s.', v_notifie,
        case when v_date_notif is not null then ' le ' || to_char(v_date_notif, 'DD/MM/YYYY') else '' end) end,
      'rappels', '[7]'::jsonb,
      'statut', case when v_decision is not null then 'tenu' else 'ouvert' end, 'information', true,
      'action', 'Surveiller la décision de la mairie ; sans décision notifiée, le calendrier dit l''effet du silence.')));
    v_attendue := v_fin_instr + 1;
    if v_decision is null and v_impl_nature is null and v_jour > v_fin_instr then
      v_impl_nature := case when v_silence = 'rejet' then 'rejet_implicite' else 'tacite' end;
      v_impl_date := v_attendue;
      v_impl_motif := case when v_silence = 'rejet'
        then format('Délai d''instruction écoulé le %s sans décision notifiée : le silence vaut %s (%s).',
               to_char(v_fin_instr, 'DD/MM/YYYY'), case when v_dp then 'opposition' else 'rejet' end,
               (select string_agg(x ->> 'article', ', ') from jsonb_array_elements(v_motifs) x))
        else format('Délai d''instruction écoulé le %s sans décision notifiée : %s (art. R*424-1).',
               to_char(v_fin_instr, 'DD/MM/YYYY'), case when v_dp then 'non-opposition tacite' else 'permis tacite' end) end;
    end if;
  elsif v_impl_nature is null then
    v_etapes := v_etapes || jsonb_build_array(jsonb_build_object(
      'nature', 'instruction', 'libelle', 'L''instruction commencera à la réception de toutes les pièces manquantes (art. R*423-39, c)',
      'statut', 'en_attente'));
  end if;

  -- ── 4. La décision ──
  if v_decision is not null then
    v_etapes := v_etapes || jsonb_build_array(jsonb_build_object(
      'nature', 'decision', 'date', v_date_decision, 'statut', 'fait',
      'libelle', case v_decision
        when 'favorable' then case when v_dp then 'Non-opposition' else 'Permis accordé' end
        when 'defavorable' then case when v_dp then 'Opposition' else 'Permis refusé' end
        when 'tacite' then case when v_dp then 'Non-opposition tacite, confirmée' else 'Permis tacite, confirmé' end
        else case when v_dp then 'Opposition tacite, confirmée' else 'Rejet implicite, confirmé' end end));
    if v_decision in ('tacite', 'rejet_implicite') then
      v_d := case when v_demande_valide and (v_fournies is null or v_fournies > v_fin_pieces) then v_fin_pieces + 1 else v_attendue end;
      if v_d is distinct from v_date_decision then
        v_avert := v_avert || to_jsonb(format('La décision implicite est datée du %s ; le calcul donne le %s.',
          to_char(v_date_decision, 'DD/MM/YYYY'), coalesce(to_char(v_d, 'DD/MM/YYYY'), 'aucune date')));
      end if;
    end if;
    if v_decision = 'defavorable' and v_silence = 'tacite' and v_fin_instr is not null and v_date_decision > v_fin_instr then
      v_avert := v_avert || to_jsonb(format(
        'Refus daté du %s, après la fin de l''instruction (%s) : un permis tacite était né le %s. Ce refus peut valoir retrait du permis tacite, qui suppose une procédure contradictoire préalable (art. L424-5) : à voir avec votre conseil.',
        to_char(v_date_decision, 'DD/MM/YYYY'), to_char(v_fin_instr, 'DD/MM/YYYY'), to_char(v_attendue, 'DD/MM/YYYY')));
    end if;
    if v_decision in ('favorable', 'tacite') then
      v_accord := v_date_decision;
      v_accord_certain := true;
    end if;
  elsif v_impl_nature is not null then
    v_etapes := v_etapes || jsonb_build_array(jsonb_build_object(
      'nature', 'decision', 'date', v_impl_date, 'statut', 'a_confirmer', 'motif', v_impl_motif,
      'libelle', case v_impl_nature
        when 'tacite' then case when v_dp then 'Non-opposition tacite' else 'Permis tacite' end
        else case when v_dp then 'Opposition tacite' else 'Rejet implicite' end end
        || ', si aucune décision ne vous a été notifiée'));
    if v_impl_nature = 'tacite' then
      v_accord := v_impl_date;
    end if;
  end if;

  -- ── 5. L'affichage, le retrait, les recours, la purge ──
  if v_accord is not null then
    v_c := public.echeance_de('lorani.permis.relance_affichage', v_accord, v_t);
    v_relance := (v_c ->> 'echeance')::date;
    if v_affichage is not null then
      v_etapes := v_etapes || jsonb_build_array(jsonb_build_object(
        'nature', 'affichage', 'libelle', 'Premier jour d''affichage sur le terrain', 'date', v_affichage, 'statut', 'fait'));
    else
      v_etapes := v_etapes || jsonb_build_array(jsonb_build_object(
        'nature', 'affichage', 'libelle', 'Affichage du permis sur le terrain, à faire et à saisir', 'date', v_relance,
        'statut', case when v_jour > v_relance then 'manque' else 'a_venir' end,
        'detail', format('Relance le %s, quinze jours après la décision.', to_char(v_relance, 'DD/MM/YYYY'))));
      v_avert := v_avert || to_jsonb('Tant que le permis n''est pas affiché sur le terrain, le délai de recours des tiers ne court pas (art. R*600-2) ; sans affichage, un recours reste possible jusqu''à six mois après l''achèvement des travaux (art. R600-3).'::text);
    end if;
    v_ech := v_ech || jsonb_build_array(jsonb_build_object(
      'nature', 'affichage', 'libelle', 'affichage du permis sur le terrain à saisir',
      'regle', 'lorani.permis.relance_affichage', 'depart', v_accord, 'echeance', v_relance, 'rappels', '[0]'::jsonb,
      'statut', case when v_affichage is not null then 'tenu' else 'ouvert' end, 'information', false,
      'action', 'Afficher le permis sur le terrain (art. R*424-15), puis saisir le premier jour d''affichage.'));

    v_c := public.echeance_de('lorani.urbanisme.retrait', v_accord, v_t);
    v_fin_retrait := (v_c ->> 'echeance')::date;
    v_etapes := v_etapes || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'nature', 'retrait', 'libelle', 'Fin du délai de retrait par la mairie', 'date', v_fin_retrait,
      'certitude', case when v_accord_certain then 'certaine' else 'prevision' end, 'depart', v_accord,
      'statut', case when v_jour > v_fin_retrait then 'passe' else 'a_venir' end,
      'regle', v_c ->> 'regle', 'version', (v_c ->> 'version')::integer,
      'detail', v_c ->> 'detail', 'source', v_c ->> 'source', 'source_url', v_c ->> 'source_url')));
    v_ech := v_ech || jsonb_build_array(jsonb_build_object(
      'nature', 'retrait', 'libelle', 'fin du délai de retrait par la mairie',
      'regle', 'lorani.urbanisme.retrait', 'depart', v_accord, 'echeance', v_fin_retrait, 'rappels', '[]'::jsonb,
      'statut', 'ouvert', 'information', true));

    if v_affichage is not null then
      begin
        v_c := public.echeance_de('lorani.urbanisme.recours_tiers', v_affichage, v_t);
        v_fin_recours := (v_c ->> 'echeance')::date;
        v_etapes := v_etapes || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
          'nature', 'recours', 'libelle', 'Fin du délai de recours des tiers : dernier jour pour agir', 'date', v_fin_recours,
          'certitude', case when v_accord_certain then 'certaine' else 'prevision' end, 'depart', v_affichage,
          'statut', case when v_jour > v_fin_recours then 'passe' else 'a_venir' end,
          'regle', v_c ->> 'regle', 'version', (v_c ->> 'version')::integer,
          'detail', v_c ->> 'detail', 'source', v_c ->> 'source', 'source_url', v_c ->> 'source_url')));
        v_ech := v_ech || jsonb_build_array(jsonb_build_object(
          'nature', 'recours', 'libelle', 'fin du délai de recours des tiers',
          'regle', 'lorani.urbanisme.recours_tiers', 'depart', v_affichage, 'echeance', v_fin_recours, 'rappels', '[]'::jsonb,
          'statut', 'ouvert', 'information', true));
      exception when sqlstate '22023' then
        v_avert := v_avert || to_jsonb('La fin du recours des tiers ne se calcule pas : ' || sqlerrm);
      end;
    end if;

    -- Les recours saisis
    for r in select * from jsonb_array_elements(
               case when jsonb_typeof(f -> 'recours') = 'array' then f -> 'recours' else '[]'::jsonb end) loop
      v_r_nature := r ->> 'nature';
      v_r_date := (r ->> 'date_recours')::date;
      v_r_issue := coalesce(r ->> 'issue', 'en_cours');
      v_r_date_issue := (r ->> 'date_issue')::date;
      v_r_libelle := case v_r_nature when 'gracieux' then 'Recours gracieux' when 'prefet' then 'Déféré du préfet'
                                     else 'Recours contentieux' end;
      if v_r_issue = 'annulation' then
        v_annule := true;
        v_etapes := v_etapes || jsonb_build_array(jsonb_build_object(
          'nature', 'recours_saisi', 'date', v_r_date_issue, 'statut', 'fait',
          'libelle', format('%s du %s : %s annulé ou retiré', v_r_libelle, to_char(v_r_date, 'DD/MM/YYYY'),
                            case when v_dp then 'la non-opposition' else 'le permis' end)));
      elsif v_r_issue = 'en_cours' and v_r_nature = 'gracieux' then
        v_d := (public.echeance_de('lorani.urbanisme.silence_recours_gracieux', v_r_date, v_t) ->> 'echeance')::date;
        if v_jour <= v_d then
          v_en_cours := true;
        end if;
        begin
          v_c := public.echeance_de('lorani.urbanisme.recours_apres_gracieux', v_d, v_t);
          v_bornes := v_bornes || (v_c ->> 'echeance')::date;
          v_etapes := v_etapes || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
            'nature', 'recours_saisi', 'date', (v_c ->> 'echeance')::date, 'certitude', 'prevision',
            'statut', case when v_jour <= v_d then 'en_cours' when v_jour > (v_c ->> 'echeance')::date then 'passe' else 'a_venir' end,
            'libelle', format('%s du %s : sans réponse, rejet implicite le %s ; recours contentieux possible jusqu''au', v_r_libelle,
                              to_char(v_r_date, 'DD/MM/YYYY'), to_char(v_d, 'DD/MM/YYYY')),
            'regle', v_c ->> 'regle', 'detail', v_c ->> 'detail', 'source', v_c ->> 'source', 'source_url', v_c ->> 'source_url')));
        exception when sqlstate '22023' then
          v_en_cours := true;
          v_avert := v_avert || to_jsonb('Le recours contentieux ouvert après le recours gracieux ne se calcule pas : ' || sqlerrm);
        end;
      elsif v_r_issue = 'en_cours' then
        v_en_cours := true;
        v_etapes := v_etapes || jsonb_build_array(jsonb_build_object(
          'nature', 'recours_saisi', 'date', v_r_date, 'statut', 'en_cours',
          'libelle', format('%s du %s en cours : pas de purge avant son issue', v_r_libelle, to_char(v_r_date, 'DD/MM/YYYY'))));
      elsif v_r_nature = 'gracieux' then
        begin
          v_c := public.echeance_de('lorani.urbanisme.recours_apres_gracieux', v_r_date_issue, v_t);
          v_bornes := v_bornes || (v_c ->> 'echeance')::date;
          v_etapes := v_etapes || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
            'nature', 'recours_saisi', 'date', (v_c ->> 'echeance')::date, 'certitude', 'certaine',
            'statut', case when v_jour > (v_c ->> 'echeance')::date then 'passe' else 'a_venir' end,
            'libelle', format('%s du %s, rejeté le %s : recours contentieux possible jusqu''au', v_r_libelle,
                              to_char(v_r_date, 'DD/MM/YYYY'), to_char(v_r_date_issue, 'DD/MM/YYYY')),
            'regle', v_c ->> 'regle', 'detail', v_c ->> 'detail', 'source', v_c ->> 'source', 'source_url', v_c ->> 'source_url')));
        exception when sqlstate '22023' then
          v_en_cours := true;
          v_avert := v_avert || to_jsonb('Le recours contentieux ouvert après le recours gracieux ne se calcule pas : ' || sqlerrm);
        end;
      else
        v_bornes := v_bornes || v_r_date_issue;
        v_etapes := v_etapes || jsonb_build_array(jsonb_build_object(
          'nature', 'recours_saisi', 'date', v_r_date_issue, 'statut', 'fait',
          'libelle', format('%s du %s : issue définitive (%s)', v_r_libelle, to_char(v_r_date, 'DD/MM/YYYY'),
                            case v_r_issue when 'rejete' then 'rejeté' else 'désistement' end)));
      end if;
    end loop;

    if v_annule then
      null;
    elsif v_en_cours then
      v_avert := v_avert || to_jsonb('Un recours est en cours : pas de purge avant son issue, à saisir ici.'::text);
    elsif v_fin_retrait is not null and v_fin_recours is not null then
      v_purge := greatest(v_fin_retrait, v_fin_recours, (select max(x) from unnest(v_bornes) x));
      v_detail_purge := format('La plus tardive des fins : retrait le %s, recours des tiers le %s%s.',
        to_char(v_fin_retrait, 'DD/MM/YYYY'), to_char(v_fin_recours, 'DD/MM/YYYY'),
        case when cardinality(v_bornes) > 0
             then ', recours saisis le ' || (select string_agg(to_char(x, 'DD/MM/YYYY'), ', ' order by x) from unnest(v_bornes) x)
             else '' end);
      v_etapes := v_etapes || jsonb_build_array(jsonb_build_object(
        'nature', 'purge', 'date', v_purge, 'detail', v_detail_purge,
        'libelle', case when v_dp then 'Déclaration' else 'Permis' end || ' purgé de tout retrait et de tout recours des tiers, à l''issue du',
        'certitude', case when v_accord_certain then 'certaine' else 'prevision' end,
        'statut', case when v_jour > v_purge then 'passe' else 'a_venir' end));
      v_etapes := v_etapes || jsonb_build_array(jsonb_build_object(
        'nature', 'chantier', 'date', v_purge + 1,
        'libelle', 'Chantier sans risque de retrait ni de recours des tiers à partir du',
        'certitude', case when v_accord_certain then 'certaine' else 'prevision' end,
        'statut', case when v_jour > v_purge then 'passe' else 'a_venir' end));
      v_ech := v_ech || jsonb_build_array(jsonb_build_object(
        'nature', 'purge', 'libelle', 'permis purgé de tout retrait et de tout recours',
        'date', v_purge, 'echeance', v_purge, 'rappels', '[]'::jsonb, 'statut', 'ouvert', 'information', true,
        'source', left('Lorani : ' || v_detail_purge || ' (C. urb., art. L424-5 et R*600-2)', 300)));
    end if;
  end if;

  -- ── 6. L'état ──
  v_etat := case
    when not v_actif then 'classe'
    when v_annule then 'annule'
    when v_decision = 'defavorable' then 'refuse'
    when v_decision = 'rejet_implicite' then 'rejete'
    when v_decision in ('favorable', 'tacite') then
      case when v_en_cours then 'recours_en_cours'
           when v_purge is not null and v_jour > v_purge then 'purge'
           else 'accorde' end
    when v_impl_nature is not null then 'decision_a_confirmer'
    when v_demande_valide and v_fournies is null then 'pieces_demandees'
    when not v_demande_valide and v_jour <= v_fin_completude then 'completude'
    else 'instruction' end;

  if v_t is null then
    v_avert := v_avert || to_jsonb('Territoire du dossier inconnu : renseignez son code postal ou son code INSEE. Sans lui, la fin du recours des tiers ne se calcule pas et aucune échéance n''est posée.'::text);
  end if;
  if not v_actif or v_annule or v_t is null then
    v_ech := '[]'::jsonb;
  end if;

  return jsonb_strip_nulls(jsonb_build_object(
    'version', 'lorani.m4.1', 'territoire', v_t, 'aujourdhui', v_jour, 'etat', v_etat, 'regime', v_regime,
    'etapes', v_etapes, 'echeances', v_ech,
    'decision_implicite', case when v_impl_nature is not null and v_decision is null
      then jsonb_build_object('nature', v_impl_nature, 'date', v_impl_date, 'motif', v_impl_motif) end,
    'date_decision_attendue', v_fin_instr, 'date_purge', v_purge, 'chantier_sans_risque_le', v_purge + 1,
    'avertissements', v_avert));
end $function$


-- ═══ FONCTION public.lorani_confirmer_date_lue
CREATE OR REPLACE FUNCTION public.lorani_confirmer_date_lue(p_id uuid, p_valeurs jsonb DEFAULT NULL::jsonb, p_permis uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.lorani_confirmer_date_lue(p_id, p_valeurs, p_permis)
$function$


-- ═══ FONCTION public.lorani_confirmer_decision_implicite
CREATE OR REPLACE FUNCTION public.lorani_confirmer_decision_implicite(p_permis uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.lorani_confirmer_decision_implicite(p_permis)
$function$


-- ═══ FONCTION public.lorani_ecarter_date_lue
CREATE OR REPLACE FUNCTION public.lorani_ecarter_date_lue(p_id uuid, p_motif text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.lorani_ecarter_date_lue(p_id, p_motif)
$function$


-- ═══ FONCTION public.lorani_mesurer_calendrier
CREATE OR REPLACE FUNCTION public.lorani_mesurer_calendrier(p_client uuid, p_du date, p_au date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select private.lorani_mesurer_calendrier(p_client, p_du, p_au)
$function$


-- ═══ FONCTION public.lorani_recalculer_permis
CREATE OR REPLACE FUNCTION public.lorani_recalculer_permis(p_permis uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.lorani_recalculer_permis(p_permis, 'demande du serveur')
$function$


-- ═══ FONCTION public.lorani_territoire_du_lieu
CREATE OR REPLACE FUNCTION public.lorani_territoire_du_lieu(p_code_insee text, p_code_postal text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select coalesce(
    case
      when p_code_insee ~ '^97[1-8][0-9]{2}$' then
        (array['guadeloupe', 'martinique', 'guyane', 'la-reunion', 'saint-pierre-et-miquelon', 'mayotte',
               'saint-barthelemy', 'saint-martin'])[substr(p_code_insee, 3, 1)::integer]
      when p_code_insee ~ '^98[6-8][0-9]{2}$' then
        (array['wallis-et-futuna', 'polynesie-francaise', 'nouvelle-caledonie'])[substr(p_code_insee, 3, 1)::integer - 5]
      when p_code_insee ~ '^(57|67|68)[0-9]{3}$' then 'alsace-moselle'
      when p_code_insee ~ '^(0[1-9]|[1-8][0-9]|9[0-5]|2A|2B)[0-9]{3}$' then 'metropole'
    end,
    case
      when p_code_postal = '97133' then 'saint-barthelemy'
      when p_code_postal = '97150' then 'saint-martin'
      when p_code_postal ~ '^97[1-6][0-9]{2}$' then
        (array['guadeloupe', 'martinique', 'guyane', 'la-reunion', 'saint-pierre-et-miquelon', 'mayotte'])
          [substr(p_code_postal, 3, 1)::integer]
      when p_code_postal ~ '^98[6-8][0-9]{2}$' then
        (array['wallis-et-futuna', 'polynesie-francaise', 'nouvelle-caledonie'])[substr(p_code_postal, 3, 1)::integer - 5]
      when p_code_postal ~ '^(57|67|68)[0-9]{3}$' then 'alsace-moselle'
      when p_code_postal ~ '^(0[1-9]|[1-8][0-9]|9[0-5])[0-9]{3}$' then 'metropole'
    end)
$function$



-- ══════════════════ CRONS ══════════════════

-- ═══ CRON lorani-calendrier [12 * * * *] select private.lorani_calendrier_passage()

-- ═══ CRON lorani-lectures [*/5 * * * *] select private.lorani_lectures_passage()
