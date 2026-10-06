-- Extraits du socle commun Omega — recette ygwbgpowzlbdaajlsqkn, photographie du 5 octobre 2026, 22 h 45, par le coordinateur.
-- Ce fichier NE S'EXÉCUTE PAS. Il sert à tous les ouvriers de la vague 2 (B1–B7) et à A3/A4.
-- Les ouvriers n'appellent jamais Supabase ; ce qui manque ici se demande au coordinateur.
-- Contenu : 55 tables, 84 portes publiques, 117 fonctions privées, 34 crons, 11 jeux de données.


-- ══════════════════ TABLES DU SOCLE COMMUN ══════════════════

-- ═══ TABLE public.abonnements_modules
  client_id uuid not null
  moteur text not null
  code_site text
  demande_id uuid
  choisi_le timestamp with time zone not null default now()
  paye_le timestamp with time zone
  installe_le timestamp with time zone
  suspendu_le timestamp with time zone
  source text not null default 'manuel'::text
  stripe_subscription_id text
  stripe_subscription_item_id text
  visible boolean default ((installe_le IS NOT NULL) AND (suspendu_le IS NULL))
  maj_le timestamp with time zone not null default now()
  constraint abonnements_modules_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint abonnements_modules_code_site_fkey FOREIGN KEY (code_site) REFERENCES catalogue_site(code_site)
  constraint abonnements_modules_demande_id_fkey FOREIGN KEY (demande_id) REFERENCES demandes_audit(id) ON DELETE SET NULL
  constraint abonnements_modules_moteur_fkey FOREIGN KEY (moteur) REFERENCES moteurs_reconnus(code)
  constraint abonnements_modules_pkey PRIMARY KEY (client_id, moteur)
  constraint abonnements_modules_source_check CHECK ((source = ANY (ARRAY['manuel'::text, 'stripe'::text])))
  policy "client lit ses modules" SELECT to authenticated using ((client_id IN ( SELECT mes_clients() AS mes_clients))) with check ()

  grants authenticated: SELECT

-- ═══ TABLE public.acces_objets
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  objet_type text not null
  objet_id text not null
  user_id uuid
  equipe_id uuid
  niveau text not null default 'lecture'::text
  cree_le timestamp with time zone not null default now()
  constraint acces_objets_client_id_equipe_id_fkey FOREIGN KEY (client_id, equipe_id) REFERENCES equipes(client_id, id) ON DELETE CASCADE
  constraint acces_objets_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint acces_objets_niveau_check CHECK ((niveau = ANY (ARRAY['lecture'::text, 'ecriture'::text])))
  constraint acces_objets_objet_id_check CHECK (((char_length(objet_id) >= 1) AND (char_length(objet_id) <= 120)))
  constraint acces_objets_objet_type_check CHECK ((objet_type ~ '^[a-z][a-z0-9_]{1,39}$'::text))
  constraint acces_objets_pkey PRIMARY KEY (id)
  constraint acces_objets_un_titulaire CHECK (((user_id IS NULL) <> (equipe_id IS NULL)))
  constraint acces_objets_une_fois UNIQUE NULLS NOT DISTINCT (client_id, objet_type, objet_id, user_id, equipe_id)
  constraint acces_objets_user_id_client_id_fkey FOREIGN KEY (user_id, client_id) REFERENCES comptes(user_id, client_id) ON DELETE CASCADE
  policy "on voit les acces qui nous concernent" SELECT to authenticated using ((private.a_un_role(client_id, ARRAY['gerant'::text]) OR (user_id = ( SELECT auth.uid() AS uid)) OR ((equipe_id IS NOT NULL) AND private.dans_equipe(( SELECT auth.uid() AS uid), equipe_id)) OR private.ecrit_objet(client_id, objet_type, objet_id))) with check ()
  policy "qui ecrit change le niveau" UPDATE to authenticated using (private.ecrit_objet(client_id, objet_type, objet_id)) with check (private.ecrit_objet(client_id, objet_type, objet_id))
  policy "qui ecrit ferme l'acces" DELETE to authenticated using (private.ecrit_objet(client_id, objet_type, objet_id)) with check ()
  policy "qui ecrit ouvre l'acces" INSERT to authenticated using () with check (private.ecrit_objet(client_id, objet_type, objet_id))
  CREATE TRIGGER acces_objets_tracer AFTER INSERT OR DELETE OR UPDATE ON public.acces_objets FOR EACH ROW EXECUTE FUNCTION private.tracer()
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.alertes
  id uuid not null default gen_random_uuid()
  client_id uuid
  interne boolean not null default false
  niveau text not null
  source text not null
  titre text not null
  detail jsonb not null default '{}'::jsonb
  cle_regroupement text
  cree_le timestamp with time zone not null default now()
  acquittee_le timestamp with time zone
  acquittee_par uuid
  envoyee_le timestamp with time zone
  destinataire_id uuid
  constraint alertes_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint alertes_destinataire_fkey FOREIGN KEY (destinataire_id, client_id) REFERENCES comptes(user_id, client_id) ON DELETE SET NULL (destinataire_id)
  constraint alertes_interne_ou_client CHECK ((interne OR (client_id IS NOT NULL)))
  constraint alertes_niveau_check CHECK ((niveau = ANY (ARRAY['info'::text, 'attention'::text, 'critique'::text])))
  constraint alertes_pkey PRIMARY KEY (id)
  constraint alertes_source_check CHECK (((char_length(source) >= 1) AND (char_length(source) <= 60)))
  constraint alertes_titre_check CHECK (((char_length(titre) >= 1) AND (char_length(titre) <= 200)))
  policy "gerants, admins et valideurs acquittent" UPDATE to authenticated using (((NOT interne) AND private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]))) with check (((NOT interne) AND private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text])))
  policy "membres lisent les alertes de leur organisation" SELECT to authenticated using (((NOT interne) AND (client_id IN ( SELECT private.mes_clients() AS mes_clients)))) with check ()
  CREATE TRIGGER alertes_signer_acquittement BEFORE UPDATE ON public.alertes FOR EACH ROW EXECUTE FUNCTION private.signer_acquittement()
  grants authenticated: SELECT,UPDATE

-- ═══ TABLE public.approbations
  id uuid not null default gen_random_uuid()
  demande_id uuid not null
  client_id uuid not null
  user_id uuid not null
  au_nom_de uuid
  delegation_id uuid
  decision text not null
  commentaire text
  decide_le timestamp with time zone not null default now()
  piece_id uuid
  constraint approbations_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint approbations_commentaire_check CHECK ((char_length(commentaire) <= 2000))
  constraint approbations_decision_check CHECK ((decision = ANY (ARRAY['approuve'::text, 'rejete'::text])))
  constraint approbations_delegation_id_fkey FOREIGN KEY (delegation_id) REFERENCES delegations(id) ON DELETE SET NULL
  constraint approbations_demande_id_fkey FOREIGN KEY (demande_id) REFERENCES demandes_validation(id) ON DELETE CASCADE
  constraint approbations_piece_id_fkey FOREIGN KEY (piece_id) REFERENCES pieces(id) ON DELETE SET NULL
  constraint approbations_pkey PRIMARY KEY (id)
  constraint approbations_une_par_personne UNIQUE (demande_id, user_id)
  constraint approbations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
  policy "on decide en son nom" INSERT to authenticated using () with check ((user_id = ( SELECT auth.uid() AS uid)))
  policy "on voit les decisions des demandes qu'on voit" SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM demandes_validation d
  WHERE (d.id = approbations.demande_id)))) with check ()
  CREATE TRIGGER approbations_appliquer AFTER INSERT ON public.approbations FOR EACH ROW EXECUTE FUNCTION private.appliquer_decision()
  CREATE TRIGGER approbations_preparer BEFORE INSERT ON public.approbations FOR EACH ROW EXECUTE FUNCTION private.preparer_approbation()
  CREATE TRIGGER approbations_tracer AFTER INSERT OR DELETE ON public.approbations FOR EACH ROW EXECUTE FUNCTION private.tracer()
  grants authenticated: INSERT,SELECT

-- ═══ TABLE public.battements
  client_id uuid not null
  module text not null
  dernier_le timestamp with time zone not null default now()
  attendu_toutes interval not null default '1 day'::interval
  actif boolean not null default true
  detail jsonb not null default '{}'::jsonb
  plages jsonb
  fuseau text not null default 'Europe/Paris'::text
  constraint battements_attendu_toutes_check CHECK ((attendu_toutes >= '00:01:00'::interval))
  constraint battements_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint battements_module_check CHECK ((module ~ '^[a-z][a-z_]{1,29}$'::text))
  constraint battements_pkey PRIMARY KEY (client_id, module)
  constraint battements_plages_check CHECK (private.plages_valides(plages))
  policy "membres voient la sante de leurs modules" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER battements_fuseau BEFORE INSERT OR UPDATE OF fuseau ON public.battements FOR EACH ROW EXECUTE FUNCTION private.verifier_fuseau()
  grants authenticated: SELECT

-- ═══ TABLE public.branchements
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid
  module text not null
  logiciel text not null
  libelle text not null
  voie text not null
  statut text not null default 'actif'::text
  capacites jsonb not null default '{}'::jsonb
  fuseau text not null default 'Europe/Paris'::text
  cree_par uuid
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint branchements_capacites_check CHECK (private.capacites_valides(capacites))
  constraint branchements_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id)
  constraint branchements_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint branchements_client_id_id_key UNIQUE (client_id, id)
  constraint branchements_libelle_check CHECK (((char_length(btrim(libelle)) >= 1) AND (char_length(btrim(libelle)) <= 200)))
  constraint branchements_logiciel_check CHECK ((logiciel ~ '^[a-z][a-z0-9_]{1,39}$'::text))
  constraint branchements_module_check CHECK ((module ~ '^[a-z][a-z_]{1,29}$'::text))
  constraint branchements_pkey PRIMARY KEY (id)
  constraint branchements_statut_check CHECK ((statut = ANY (ARRAY['actif'::text, 'suspendu'::text, 'debranche'::text])))
  constraint branchements_un_par_logiciel UNIQUE NULLS NOT DISTINCT (client_id, module, logiciel, entite_id)
  constraint branchements_voie_check CHECK ((voie = ANY (ARRAY['api'::text, 'passerelle'::text, 'exports'::text, 'interface'::text])))
  policy "on voit les branchements de son perimetre" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND ((entite_id IS NULL) OR private.voit_entite(client_id, entite_id)))) with check ()
  CREATE TRIGGER branchements_fuseau BEFORE INSERT OR UPDATE OF fuseau ON public.branchements FOR EACH ROW EXECUTE FUNCTION private.verifier_fuseau()
  CREATE TRIGGER branchements_tracer AFTER INSERT OR DELETE OR UPDATE ON public.branchements FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: SELECT

-- ═══ TABLE public.branchements_jeux
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  branchement_id uuid not null
  code text not null
  modele_id uuid
  libelle text not null
  motif_fichier text
  entetes text[] not null default '{}'::text[]
  colonnes jsonb not null default '{}'::jsonb
  cle text[] not null default '{}'::text[]
  complet boolean not null default true
  fenetre jsonb
  confirmer_disparition smallint not null default 1
  seuil_perte numeric(4,3) not null default 0.2
  perte_min integer not null default 1
  seuil_anomalies numeric(4,3) not null default 0.05
  options jsonb not null default '{}'::jsonb
  accuse boolean not null default true
  rythme interval
  plages jsonb
  attendu jsonb
  actif boolean not null default true
  courant_id uuid
  lignes integer not null default 0
  etat_le timestamp with time zone
  dernier_recu_le timestamp with time zone
  retard_signale timestamp with time zone
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint branchements_jeux_attendu_check CHECK (private.attendu_valide(attendu))
  constraint branchements_jeux_client_id_branchement_id_fkey FOREIGN KEY (client_id, branchement_id) REFERENCES branchements(client_id, id) ON DELETE CASCADE
  constraint branchements_jeux_client_id_id_key UNIQUE (client_id, id)
  constraint branchements_jeux_code_check CHECK ((code ~ '^[a-z][a-z0-9_]{1,39}$'::text))
  constraint branchements_jeux_coherent CHECK (private.declaration_coherente(colonnes, cle, fenetre, entetes))
  constraint branchements_jeux_colonnes_check CHECK (private.colonnes_valides(colonnes))
  constraint branchements_jeux_confirmer_disparition_check CHECK (((confirmer_disparition >= 1) AND (confirmer_disparition <= 10)))
  constraint branchements_jeux_courant_fkey FOREIGN KEY (client_id, courant_id) REFERENCES instantanes(client_id, id) ON DELETE SET NULL (courant_id)
  constraint branchements_jeux_fenetre_check CHECK (private.fenetre_jeu_valide(fenetre))
  constraint branchements_jeux_libelle_check CHECK (((char_length(btrim(libelle)) >= 1) AND (char_length(btrim(libelle)) <= 200)))
  constraint branchements_jeux_modele_id_fkey FOREIGN KEY (modele_id) REFERENCES modeles_jeux(id) ON DELETE SET NULL
  constraint branchements_jeux_motif_fichier_check CHECK (private.motif_valide(motif_fichier))
  constraint branchements_jeux_options_check CHECK (private.options_valides(options))
  constraint branchements_jeux_perte_min_check CHECK ((perte_min >= 1))
  constraint branchements_jeux_pkey PRIMARY KEY (id)
  constraint branchements_jeux_plages_check CHECK (private.plages_valides(plages))
  constraint branchements_jeux_rythme_check CHECK ((rythme >= '00:05:00'::interval))
  constraint branchements_jeux_seuil_anomalies_check CHECK (((seuil_anomalies >= (0)::numeric) AND (seuil_anomalies <= (1)::numeric)))
  constraint branchements_jeux_seuil_perte_check CHECK (((seuil_perte >= (0)::numeric) AND (seuil_perte <= (1)::numeric)))
  constraint branchements_jeux_un_code UNIQUE (branchement_id, code)
  policy "on voit les jeux des branchements qu'on voit" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (EXISTS ( SELECT 1
   FROM branchements b
  WHERE (b.id = branchements_jeux.branchement_id))))) with check ()
  CREATE TRIGGER branchements_jeux_tracer AFTER INSERT OR DELETE OR UPDATE ON public.branchements_jeux FOR EACH ROW EXECUTE FUNCTION private.tracer('courant_id', 'lignes', 'etat_le', 'dernier_recu_le', 'retard_signale', 'maj_le')
  grants authenticated: SELECT

-- ═══ TABLE public.clients
  id uuid not null default gen_random_uuid()
  nom text not null
  siren text
  secteur text
  commune text
  email text
  telephone text
  whatsapp text
  gmail_envoi text
  statut text not null default 'prospect'::text
  config jsonb not null default '{}'::jsonb
  cree_le timestamp with time zone not null default now()
  paiements_verifies_le date
  profil text not null default 'generique'::text
  stripe_customer_id text
  constraint clients_pkey PRIMARY KEY (id)
  constraint clients_siren_key UNIQUE (siren)
  constraint clients_statut_check CHECK ((statut = ANY (ARRAY['prospect'::text, 'actif'::text, 'pause'::text, 'resilie'::text])))
  constraint clients_stripe_customer_id_key UNIQUE (stripe_customer_id)
  constraint fk_clients_profil FOREIGN KEY (profil) REFERENCES profils_metier(secteur)
  policy "client lit sa fiche" SELECT to authenticated using ((id IN ( SELECT mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER clients_a_tracer AFTER INSERT OR UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION private.tracer('config', 'stripe_customer_id')
  CREATE TRIGGER clients_entite_principale AFTER INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION private.creer_entite_principale()
  CREATE TRIGGER trg_audit AFTER DELETE OR UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION f_audit_trail()
  grants authenticated: SELECT

-- ═══ TABLE public.comptes
  user_id uuid not null
  client_id uuid not null
  role text not null default 'gerant'::text
  cree_le timestamp with time zone not null default now()
  perimetre_total boolean not null default true
  constraint comptes_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint comptes_pkey PRIMARY KEY (user_id, client_id)
  constraint comptes_role_check CHECK ((role = ANY (ARRAY['gerant'::text, 'admin'::text, 'valideur'::text, 'collaborateur'::text, 'lecteur'::text])))
  constraint comptes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
  policy "chacun lit son compte, gerants et admins ceux de l'organisation" SELECT to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) OR private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))) with check ()
  policy "gerants et admins changent les roles" UPDATE to authenticated using ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]) AND ((role <> 'gerant'::text) OR private.a_un_role(client_id, ARRAY['gerant'::text])))) with check ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]) AND ((role <> 'gerant'::text) OR private.a_un_role(client_id, ARRAY['gerant'::text]))))
  policy "gerants et admins retirent des comptes" DELETE to authenticated using ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]) AND ((role <> 'gerant'::text) OR private.a_un_role(client_id, ARRAY['gerant'::text])))) with check ()
  CREATE TRIGGER comptes_garder_un_gerant BEFORE DELETE OR UPDATE OF role ON public.comptes FOR EACH ROW EXECUTE FUNCTION private.garder_un_gerant()
  CREATE TRIGGER comptes_tracer AFTER INSERT OR DELETE OR UPDATE ON public.comptes FOR EACH ROW EXECUTE FUNCTION private.tracer()
  grants authenticated: DELETE,SELECT,UPDATE

-- ═══ TABLE public.comptes_entites
  client_id uuid not null
  user_id uuid not null
  entite_id uuid not null
  cree_le timestamp with time zone not null default now()
  constraint comptes_entites_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id) ON DELETE CASCADE
  constraint comptes_entites_pkey PRIMARY KEY (user_id, entite_id)
  constraint comptes_entites_user_id_client_id_fkey FOREIGN KEY (user_id, client_id) REFERENCES comptes(user_id, client_id) ON DELETE CASCADE
  policy "chacun voit son perimetre, gerants et admins tous" SELECT to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) OR private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))) with check ()
  policy "gerants et admins attribuent un perimetre" INSERT to authenticated using () with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))
  policy "gerants et admins retirent un perimetre" DELETE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check ()
  CREATE TRIGGER comptes_entites_tracer AFTER INSERT OR DELETE ON public.comptes_entites FOR EACH ROW EXECUTE FUNCTION private.tracer()
  grants authenticated: DELETE,INSERT,SELECT

-- ═══ TABLE public.consentements
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  canal text not null
  adresse text not null
  adresse_empreinte text not null
  portee text not null default 'transactionnel'::text
  source text not null
  preuve text
  piece_id uuid
  module text
  recueilli_le timestamp with time zone not null default now()
  recueilli_par uuid
  retire_le timestamp with time zone
  motif_retrait text
  constraint consentements_adresse_check CHECK (((char_length(adresse) >= 3) AND (char_length(adresse) <= 254)))
  constraint consentements_canal_check CHECK ((canal = ANY (ARRAY['email'::text, 'whatsapp'::text, 'sms'::text, 'lre'::text, 'appel'::text])))
  constraint consentements_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint consentements_module_check CHECK ((module ~ '^[a-z][a-z_]{1,29}$'::text))
  constraint consentements_motif_retrait_check CHECK ((char_length(motif_retrait) <= 300))
  constraint consentements_piece_fkey FOREIGN KEY (client_id, piece_id) REFERENCES pieces(client_id, id) ON DELETE SET NULL (piece_id)
  constraint consentements_pkey PRIMARY KEY (id)
  constraint consentements_portee_check CHECK ((portee = ANY (ARRAY['transactionnel'::text, 'tout'::text])))
  constraint consentements_preuve_check CHECK ((char_length(preuve) <= 300))
  constraint consentements_source_check CHECK ((source = ANY (ARRAY['formulaire'::text, 'ecrit'::text, 'oral'::text, 'contrat'::text, 'message'::text, 'import'::text])))
  policy "membres voient les consentements" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER consentements_garder BEFORE INSERT OR DELETE OR UPDATE ON public.consentements FOR EACH ROW EXECUTE FUNCTION private.garder_par_les_portes()
  CREATE TRIGGER consentements_tracer AFTER INSERT OR UPDATE ON public.consentements FOR EACH ROW EXECUTE FUNCTION private.tracer('+canal', '+portee', '+source', '+module', '+adresse_empreinte', '+retire_le')
  grants authenticated: SELECT

-- ═══ TABLE public.delais
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  module text not null
  objet_type text not null
  objet_id text not null
  libelle text not null
  territoire text not null
  regle_code text
  regle_version smallint
  depart date
  echeance_calculee date
  echeance_notifiee date
  echeance date default COALESCE(echeance_notifiee, echeance_calculee)
  source_notification text
  calcul jsonb
  rappels integer[] not null default '{7,2,0}'::integer[]
  rappels_faits integer[] not null default '{}'::integer[]
  responsable uuid
  action_attendue text
  statut text not null default 'ouvert'::text
  motif text
  cle_idempotence text
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  clos_le timestamp with time zone
  constraint delais_action_attendue_check CHECK ((char_length(action_attendue) <= 300))
  constraint delais_cle_idempotence_check CHECK ((char_length(cle_idempotence) <= 200))
  constraint delais_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint delais_client_id_id_key UNIQUE (client_id, id)
  constraint delais_libelle_check CHECK (((char_length(libelle) >= 1) AND (char_length(libelle) <= 200)))
  constraint delais_module_check CHECK ((module ~ '^[a-z][a-z_]{1,29}$'::text))
  constraint delais_motif_check CHECK ((char_length(motif) <= 300))
  constraint delais_objet_id_check CHECK (((char_length(objet_id) >= 1) AND (char_length(objet_id) <= 120)))
  constraint delais_objet_type_check CHECK ((objet_type ~ '^[a-z][a-z0-9_]{1,39}$'::text))
  constraint delais_pkey PRIMARY KEY (id)
  constraint delais_regle_code_regle_version_fkey FOREIGN KEY (regle_code, regle_version) REFERENCES regles_delais(code, version)
  constraint delais_regle_complete CHECK (((regle_code IS NULL) = (regle_version IS NULL)))
  constraint delais_responsable_fkey FOREIGN KEY (responsable) REFERENCES auth.users(id) ON DELETE SET NULL
  constraint delais_source_notification_check CHECK ((char_length(source_notification) <= 300))
  constraint delais_statut_check CHECK ((statut = ANY (ARRAY['ouvert'::text, 'tenu'::text, 'depasse'::text, 'annule'::text])))
  constraint delais_territoire_fkey FOREIGN KEY (territoire) REFERENCES territoires(code)
  constraint delais_une_echeance CHECK (((echeance_calculee IS NOT NULL) OR (echeance_notifiee IS NOT NULL)))
  policy "on voit les delais des objets qu'on voit" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND private.voit_objet(client_id, objet_type, objet_id))) with check ()
  CREATE TRIGGER delais_tracer AFTER INSERT OR DELETE OR UPDATE ON public.delais FOR EACH ROW EXECUTE FUNCTION private.tracer('+module', '+objet_type', '+objet_id', '+regle_code', '+territoire', '+echeance_calculee', '+echeance_notifiee', '+statut')
  grants authenticated: SELECT

-- ═══ TABLE public.delegations
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  delegant uuid not null
  delegataire uuid not null
  entite_id uuid
  module text
  debut timestamp with time zone not null default now()
  fin timestamp with time zone not null
  motif text
  cree_par uuid
  cree_le timestamp with time zone not null default now()
  revoquee_le timestamp with time zone
  constraint delegations_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id) ON DELETE CASCADE
  constraint delegations_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint delegations_delegant_client_id_fkey FOREIGN KEY (delegant, client_id) REFERENCES comptes(user_id, client_id) ON DELETE CASCADE
  constraint delegations_delegataire_client_id_fkey FOREIGN KEY (delegataire, client_id) REFERENCES comptes(user_id, client_id) ON DELETE CASCADE
  constraint delegations_module_check CHECK (((module IS NULL) OR (module ~ '^[a-z][a-z_]{1,29}$'::text)))
  constraint delegations_motif_check CHECK ((char_length(motif) <= 500))
  constraint delegations_pas_a_soi CHECK ((delegant <> delegataire))
  constraint delegations_periode CHECK ((fin > debut))
  constraint delegations_pkey PRIMARY KEY (id)
  policy "chacun voit ses delegations, gerants et admins toutes" SELECT to authenticated using ((((( SELECT auth.uid() AS uid) = delegant) OR (( SELECT auth.uid() AS uid) = delegataire)) OR private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))) with check ()
  policy "le delegant, les gerants et admins revoquent" UPDATE to authenticated using (((delegant = ( SELECT auth.uid() AS uid)) OR private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))) with check (((delegant = ( SELECT auth.uid() AS uid)) OR private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])))
  policy "on delegue son droit, ou gerants et admins pour autrui" INSERT to authenticated using () with check ((((delegant = ( SELECT auth.uid() AS uid)) AND private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text])) OR private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])))
  CREATE TRIGGER delegations_preparer BEFORE INSERT ON public.delegations FOR EACH ROW EXECUTE FUNCTION private.preparer_delegation()
  CREATE TRIGGER delegations_tracer AFTER INSERT OR DELETE OR UPDATE ON public.delegations FOR EACH ROW EXECUTE FUNCTION private.tracer()
  grants authenticated: INSERT,SELECT,UPDATE

-- ═══ TABLE public.demandes_validation
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid
  module text not null
  type_action text not null
  objet_type text
  objet_id text
  resume text not null
  montant numeric(14,2)
  devise character(3) not null default 'EUR'::bpchar
  payload jsonb not null default '{}'::jsonb
  demandeur_type text not null default 'utilisateur'::text
  demandeur_id uuid
  statut text not null default 'en_attente'::text
  approbations_requises smallint not null default 1
  roles_autorises text[] not null default ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]
  regle_id uuid
  echeance timestamp with time zone
  cle_idempotence text not null
  cree_le timestamp with time zone not null default now()
  decide_le timestamp with time zone
  execute_le timestamp with time zone
  motif_echec text
  equipe_id uuid
  politique_id uuid
  exige_commentaire boolean not null default false
  exige_piece boolean not null default false
  exige_motif boolean not null default true
  constraint demandes_validation_cle_idempotence_check CHECK (((char_length(cle_idempotence) >= 1) AND (char_length(cle_idempotence) <= 200)))
  constraint demandes_validation_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id)
  constraint demandes_validation_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint demandes_validation_demandeur_type_check CHECK ((demandeur_type = ANY (ARRAY['utilisateur'::text, 'systeme'::text])))
  constraint demandes_validation_equipe_fkey FOREIGN KEY (client_id, equipe_id) REFERENCES equipes(client_id, id) ON DELETE RESTRICT
  constraint demandes_validation_idempotence UNIQUE (client_id, cle_idempotence)
  constraint demandes_validation_module_check CHECK ((module ~ '^[a-z][a-z_]{1,29}$'::text))
  constraint demandes_validation_montant_check CHECK (((montant IS NULL) OR (montant >= (0)::numeric)))
  constraint demandes_validation_pkey PRIMARY KEY (id)
  constraint demandes_validation_politique_fkey FOREIGN KEY (client_id, politique_id) REFERENCES politiques(client_id, id) ON DELETE RESTRICT
  constraint demandes_validation_regle_id_fkey FOREIGN KEY (regle_id) REFERENCES regles_validation(id) ON DELETE SET NULL
  constraint demandes_validation_resume_check CHECK (((char_length(resume) >= 1) AND (char_length(resume) <= 500)))
  constraint demandes_validation_statut_check CHECK ((statut = ANY (ARRAY['en_attente'::text, 'approuvee'::text, 'rejetee'::text, 'annulee'::text, 'expiree'::text, 'executee'::text, 'echec_execution'::text])))
  constraint demandes_validation_type_action_check CHECK (((char_length(type_action) >= 1) AND (char_length(type_action) <= 80)))
  policy "le demandeur annule sa demande en attente" UPDATE to authenticated using (((demandeur_id = ( SELECT auth.uid() AS uid)) AND (statut = 'en_attente'::text))) with check (((demandeur_id = ( SELECT auth.uid() AS uid)) AND (statut = 'annulee'::text)))
  policy "les comptes qui agissent deposent des demandes" INSERT to authenticated using () with check ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text, 'collaborateur'::text]) AND private.perimetre_couvre(( SELECT auth.uid() AS uid), client_id, entite_id) AND private.voit_objet(client_id, objet_type, objet_id)))
  policy "membres voient les demandes de leur perimetre" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND private.perimetre_couvre(( SELECT auth.uid() AS uid), client_id, entite_id) AND private.voit_objet(client_id, objet_type, objet_id))) with check ()
  CREATE TRIGGER demandes_validation_envois AFTER UPDATE OF statut ON public.demandes_validation FOR EACH ROW EXECUTE FUNCTION private.envois_suivre_demande()
  CREATE TRIGGER demandes_validation_envois_modification AFTER INSERT ON public.demandes_validation FOR EACH ROW WHEN ((new.payload ? 'remplace'::text)) EXECUTE FUNCTION private.envois_suivre_modification()
  CREATE TRIGGER demandes_validation_garder BEFORE UPDATE ON public.demandes_validation FOR EACH ROW EXECUTE FUNCTION private.garder_demande()
  CREATE TRIGGER demandes_validation_preparer BEFORE INSERT ON public.demandes_validation FOR EACH ROW EXECUTE FUNCTION private.preparer_demande()
  CREATE TRIGGER demandes_validation_publier_decision AFTER INSERT OR UPDATE OF statut ON public.demandes_validation FOR EACH ROW EXECUTE FUNCTION private.publier_decision()
  CREATE TRIGGER demandes_validation_suivre_activation AFTER UPDATE OF statut ON public.demandes_validation FOR EACH ROW EXECUTE FUNCTION private.suivre_activation()
  CREATE TRIGGER demandes_validation_tracer AFTER INSERT OR DELETE OR UPDATE ON public.demandes_validation FOR EACH ROW EXECUTE FUNCTION private.tracer('payload')
  grants authenticated: INSERT,SELECT,UPDATE

-- ═══ TABLE public.droits
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  droit text not null
  user_id uuid
  equipe_id uuid
  cree_le timestamp with time zone not null default now()
  constraint droits_client_id_equipe_id_fkey FOREIGN KEY (client_id, equipe_id) REFERENCES equipes(client_id, id) ON DELETE CASCADE
  constraint droits_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint droits_droit_check CHECK ((droit ~ '^[a-z][a-z0-9_.]{1,59}$'::text))
  constraint droits_pkey PRIMARY KEY (id)
  constraint droits_un_titulaire CHECK (((user_id IS NULL) <> (equipe_id IS NULL)))
  constraint droits_une_fois UNIQUE NULLS NOT DISTINCT (client_id, droit, user_id, equipe_id)
  constraint droits_user_id_client_id_fkey FOREIGN KEY (user_id, client_id) REFERENCES comptes(user_id, client_id) ON DELETE CASCADE
  policy "le gerant accorde les droits" INSERT to authenticated using () with check (private.a_un_role(client_id, ARRAY['gerant'::text]))
  policy "le gerant retire les droits" DELETE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text])) with check ()
  policy "le gerant voit les droits, chacun les siens" SELECT to authenticated using ((private.a_un_role(client_id, ARRAY['gerant'::text]) OR (user_id = ( SELECT auth.uid() AS uid)) OR ((equipe_id IS NOT NULL) AND private.dans_equipe(( SELECT auth.uid() AS uid), equipe_id)))) with check ()
  CREATE TRIGGER droits_tracer AFTER INSERT OR DELETE ON public.droits FOR EACH ROW EXECUTE FUNCTION private.tracer()
  grants authenticated: DELETE,INSERT,SELECT

-- ═══ TABLE public.effacements
  id uuid not null default gen_random_uuid()
  client_efface uuid not null
  nom_client text not null
  efface_le timestamp with time zone not null default now()
  par text not null
  empreinte_export text not null
  lignes jsonb not null
  comptes_orphelins uuid[] not null default '{}'::uuid[]
  fichiers jsonb not null default '{"nombre": 0}'::jsonb
  constraint effacements_empreinte_export_check CHECK ((empreinte_export ~ '^[0-9a-f]{64}$'::text))
  constraint effacements_par_check CHECK (((char_length(btrim(par)) >= 1) AND (char_length(btrim(par)) <= 200)))
  constraint effacements_pkey PRIMARY KEY (id)

  CREATE TRIGGER effacements_immuables BEFORE DELETE OR UPDATE ON public.effacements FOR EACH ROW EXECUTE FUNCTION private.effacements_immuables()
  grants authenticated: aucun

-- ═══ TABLE public.entites
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  parent_id uuid
  nom text not null
  type text not null default 'societe'::text
  siren text
  principale boolean not null default false
  cree_le timestamp with time zone not null default now()
  fuseau text not null default 'Europe/Paris'::text
  territoire text
  constraint entites_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint entites_client_id_id_key UNIQUE (client_id, id)
  constraint entites_nom_check CHECK (((char_length(btrim(nom)) >= 1) AND (char_length(btrim(nom)) <= 200)))
  constraint entites_parent_meme_client FOREIGN KEY (client_id, parent_id) REFERENCES entites(client_id, id)
  constraint entites_pas_son_propre_parent CHECK (((parent_id IS NULL) OR (parent_id <> id)))
  constraint entites_pkey PRIMARY KEY (id)
  constraint entites_siren_check CHECK ((siren ~ '^[0-9]{9}$'::text))
  constraint entites_territoire_check CHECK ((territoire ~ '^[A-Z]{2}(-[A-Z0-9]{1,3})?$'::text))
  constraint entites_type_check CHECK ((type = ANY (ARRAY['societe'::text, 'etablissement'::text, 'site'::text])))
  policy "gerants et admins creent des entites" INSERT to authenticated using () with check ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]) AND (NOT principale)))
  policy "gerants et admins modifient les entites" UPDATE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))
  policy "gerants et admins suppriment les entites secondaires" DELETE to authenticated using ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]) AND (NOT principale))) with check ()
  policy "membres lisent les entites de leur perimetre" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND private.voit_entite(client_id, id))) with check ()
  CREATE TRIGGER entites_fuseau BEFORE INSERT OR UPDATE OF fuseau ON public.entites FOR EACH ROW EXECUTE FUNCTION private.verifier_fuseau()
  CREATE TRIGGER entites_sans_cycle BEFORE INSERT OR UPDATE OF parent_id ON public.entites FOR EACH ROW EXECUTE FUNCTION private.entites_sans_cycle()
  CREATE TRIGGER entites_tracer AFTER INSERT OR DELETE OR UPDATE ON public.entites FOR EACH ROW EXECUTE FUNCTION private.tracer()
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.envois
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid
  module text not null
  objet_type text
  objet_id text
  canal text not null
  destinataire_adresse text
  destinataire_empreinte text
  destinataire_nom text
  destinataire_ref text
  destinataire_membre uuid
  destinataire_fuseau text not null
  destinataire_territoire text
  destinataire_professionnel boolean not null default false
  destinataire_langue text not null default 'fr'::text
  gabarit_id uuid
  variables jsonb not null default '{}'::jsonb
  sujet text
  corps text not null
  pieces uuid[] not null default '{}'::uuid[]
  empreinte text not null
  repondre_a text
  transactionnel boolean not null
  donnees_sante boolean not null
  espacement boolean not null default true
  demande_id uuid
  adossee boolean not null default false
  direct boolean not null default false
  mode text not null
  expediteur_id uuid
  fournisseur text
  statut text not null default 'a_valider'::text
  verrou text
  motif text
  reprise_le timestamp with time zone
  bail_jusqu_au timestamp with time zone
  echeance timestamp with time zone not null
  essais smallint not null default 0
  reference_externe text
  erreur text
  compte_rendu text
  remise text
  remise_le timestamp with time zone
  suivi_id uuid
  rang smallint
  cle_idempotence text not null
  prepare_par uuid
  modifie_par uuid
  cree_le timestamp with time zone not null default now()
  decide_le timestamp with time zone
  pret_le timestamp with time zone
  envoye_le timestamp with time zone
  clos_le timestamp with time zone
  maj_le timestamp with time zone not null default now()
  constraint envois_adresse_ou_bloque CHECK (((destinataire_adresse IS NOT NULL) OR (statut = 'bloque'::text)))
  constraint envois_canal_check CHECK ((canal = ANY (ARRAY['email'::text, 'whatsapp'::text, 'sms'::text, 'lre'::text, 'appel'::text])))
  constraint envois_cle_idempotence_check CHECK (((char_length(cle_idempotence) >= 1) AND (char_length(cle_idempotence) <= 200)))
  constraint envois_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint envois_client_id_id_key UNIQUE (client_id, id)
  constraint envois_compte_rendu_check CHECK ((char_length(compte_rendu) <= 300))
  constraint envois_demande_id_fkey FOREIGN KEY (demande_id) REFERENCES demandes_validation(id) ON DELETE SET NULL
  constraint envois_destinataire_adresse_check CHECK ((char_length(destinataire_adresse) <= 254))
  constraint envois_destinataire_langue_check CHECK ((destinataire_langue ~ '^[a-z]{2}$'::text))
  constraint envois_destinataire_nom_check CHECK ((char_length(destinataire_nom) <= 200))
  constraint envois_destinataire_ref_check CHECK ((char_length(destinataire_ref) <= 200))
  constraint envois_destinataire_territoire_fkey FOREIGN KEY (destinataire_territoire) REFERENCES territoires(code)
  constraint envois_entite_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id)
  constraint envois_erreur_check CHECK ((char_length(erreur) <= 2000))
  constraint envois_expediteur_fkey FOREIGN KEY (client_id, expediteur_id) REFERENCES expediteurs(client_id, id) ON DELETE SET NULL (expediteur_id)
  constraint envois_gabarit_id_fkey FOREIGN KEY (gabarit_id) REFERENCES gabarits_messages(id)
  constraint envois_idempotence UNIQUE (client_id, cle_idempotence)
  constraint envois_mode_check CHECK ((mode = ANY (ARRAY['essai'::text, 'reel'::text])))
  constraint envois_module_check CHECK ((module ~ '^[a-z][a-z_]{1,29}$'::text))
  constraint envois_motif_check CHECK ((char_length(motif) <= 500))
  constraint envois_objet_complet CHECK (((objet_type IS NULL) = (objet_id IS NULL)))
  constraint envois_objet_id_check CHECK (((char_length(objet_id) >= 1) AND (char_length(objet_id) <= 120)))
  constraint envois_objet_type_check CHECK ((objet_type ~ '^[a-z][a-z0-9_]{1,39}$'::text))
  constraint envois_pkey PRIMARY KEY (id)
  constraint envois_rang_check CHECK ((rang >= 1))
  constraint envois_reference_externe_check CHECK ((char_length(reference_externe) <= 300))
  constraint envois_remise_check CHECK ((remise = ANY (ARRAY['remis'::text, 'rebond_temporaire'::text, 'rebond'::text, 'plainte'::text, 'refuse'::text])))
  constraint envois_repondre_a_check CHECK ((char_length(repondre_a) <= 254))
  constraint envois_statut_check CHECK ((statut = ANY (ARRAY['a_valider'::text, 'differe'::text, 'pret'::text, 'en_cours'::text, 'envoye'::text, 'bloque'::text, 'refuse'::text, 'annule'::text, 'expire'::text, 'echec'::text])))
  constraint envois_suivi_fkey FOREIGN KEY (client_id, suivi_id) REFERENCES suivis(client_id, id) ON DELETE SET NULL (suivi_id)
  constraint envois_verrou_check CHECK ((char_length(verrou) <= 60))
  policy "on voit les envois des objets qu'on voit" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND private.perimetre_couvre(( SELECT auth.uid() AS uid), client_id, entite_id) AND private.voit_objet(client_id, objet_type, objet_id))) with check ()
  CREATE TRIGGER envois_garder BEFORE INSERT OR DELETE OR UPDATE ON public.envois FOR EACH ROW EXECUTE FUNCTION private.garder_envoi()
  CREATE TRIGGER envois_tracer AFTER INSERT OR DELETE OR UPDATE ON public.envois FOR EACH ROW EXECUTE FUNCTION private.tracer('+module', '+objet_type', '+objet_id', '+canal', '+gabarit_id', '+mode', '+statut', '+verrou', '+demande_id', '+direct', '+adossee', '+suivi_id', '+rang', '+empreinte', '+destinataire_empreinte', '+fournisseur', '+essais', '+remise', '+transactionnel', '+donnees_sante', '+echeance')
  grants authenticated: SELECT

-- ═══ TABLE public.envois_evenements
  id bigint not null
  client_id uuid not null
  envoi_id uuid not null
  type text not null
  survenu_le timestamp with time zone not null
  detail jsonb not null default '{}'::jsonb
  recu_le timestamp with time zone not null default now()
  cle text
  constraint envois_evenements_envoi_fkey FOREIGN KEY (client_id, envoi_id) REFERENCES envois(client_id, id) ON DELETE CASCADE
  constraint envois_evenements_pkey PRIMARY KEY (id)
  constraint envois_evenements_type_check CHECK ((type = ANY (ARRAY['remis'::text, 'rebond_temporaire'::text, 'rebond'::text, 'plainte'::text, 'refuse'::text])))
  policy "on voit la remise des envois qu'on voit" SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM envois e
  WHERE (e.id = envois_evenements.envoi_id)))) with check ()
  CREATE TRIGGER envois_evenements_garder BEFORE INSERT OR DELETE OR UPDATE ON public.envois_evenements FOR EACH ROW EXECUTE FUNCTION private.garder_par_les_portes()
  CREATE TRIGGER envois_evenements_tracer AFTER INSERT ON public.envois_evenements FOR EACH ROW EXECUTE FUNCTION private.tracer('+envoi_id', '+type')
  grants authenticated: SELECT

-- ═══ TABLE public.equipes
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  cle text not null
  nom text not null
  cree_le timestamp with time zone not null default now()
  constraint equipes_cle_check CHECK ((cle ~ '^[a-z][a-z0-9_]{1,39}$'::text))
  constraint equipes_client_cle_key UNIQUE (client_id, cle)
  constraint equipes_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint equipes_client_id_id_key UNIQUE (client_id, id)
  constraint equipes_nom_check CHECK (((char_length(btrim(nom)) >= 1) AND (char_length(btrim(nom)) <= 120)))
  constraint equipes_pkey PRIMARY KEY (id)
  policy "gerants et admins creent les equipes" INSERT to authenticated using () with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))
  policy "gerants et admins renomment les equipes" UPDATE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))
  policy "gerants et admins suppriment les equipes" DELETE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check ()
  policy "membres lisent les equipes" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER equipes_tracer AFTER INSERT OR DELETE OR UPDATE ON public.equipes FOR EACH ROW EXECUTE FUNCTION private.tracer()
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.equipes_membres
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  equipe_id uuid not null
  user_id uuid not null
  cree_le timestamp with time zone not null default now()
  constraint equipes_membres_client_id_equipe_id_fkey FOREIGN KEY (client_id, equipe_id) REFERENCES equipes(client_id, id) ON DELETE CASCADE
  constraint equipes_membres_pkey PRIMARY KEY (id)
  constraint equipes_membres_une_fois UNIQUE (equipe_id, user_id)
  constraint equipes_membres_user_id_client_id_fkey FOREIGN KEY (user_id, client_id) REFERENCES comptes(user_id, client_id) ON DELETE CASCADE
  policy "gerants et admins composent les equipes" INSERT to authenticated using () with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))
  policy "gerants et admins retirent des membres d'equipe" DELETE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check ()
  policy "membres lisent la composition des equipes" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER equipes_membres_tracer AFTER INSERT OR DELETE ON public.equipes_membres FOR EACH ROW EXECUTE FUNCTION private.tracer()
  grants authenticated: DELETE,INSERT,SELECT

-- ═══ TABLE public.expediteurs
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  module text
  canal text not null
  fournisseur text not null
  identite text not null
  nom_affiche text
  repondre_a text
  parametres jsonb not null default '{}'::jsonb
  secret_nom text
  statut text not null default 'a_verifier'::text
  verifie_le timestamp with time zone
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint expediteurs_canal_check CHECK ((canal = ANY (ARRAY['email'::text, 'whatsapp'::text, 'sms'::text, 'lre'::text, 'appel'::text])))
  constraint expediteurs_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint expediteurs_client_id_id_key UNIQUE (client_id, id)
  constraint expediteurs_fournisseur_check CHECK ((fournisseur ~ '^[a-z][a-z0-9_]{1,30}$'::text))
  constraint expediteurs_identite_check CHECK (((char_length(btrim(identite)) >= 1) AND (char_length(btrim(identite)) <= 320)))
  constraint expediteurs_module_check CHECK ((module ~ '^[a-z][a-z_]{1,29}$'::text))
  constraint expediteurs_nom_affiche_check CHECK ((char_length(nom_affiche) <= 120))
  constraint expediteurs_parametres_check CHECK ((jsonb_typeof(parametres) = 'object'::text))
  constraint expediteurs_pkey PRIMARY KEY (id)
  constraint expediteurs_repondre_a_check CHECK ((char_length(repondre_a) <= 254))
  constraint expediteurs_secret_nom_check CHECK ((secret_nom ~ '^[a-z][a-z0-9_]{2,80}$'::text))
  constraint expediteurs_statut_check CHECK ((statut = ANY (ARRAY['a_verifier'::text, 'actif'::text, 'suspendu'::text])))
  policy "gerants et admins voient les expediteurs" SELECT to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check ()
  CREATE TRIGGER expediteurs_preparer BEFORE INSERT OR UPDATE ON public.expediteurs FOR EACH ROW EXECUTE FUNCTION private.preparer_expediteur()
  CREATE TRIGGER expediteurs_tracer AFTER INSERT OR DELETE OR UPDATE ON public.expediteurs FOR EACH ROW EXECUTE FUNCTION private.tracer('+module', '+canal', '+fournisseur', '+statut')
  grants authenticated: SELECT

-- ═══ TABLE public.filed_controles
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  facture_id uuid not null
  document_id uuid not null
  version integer not null
  code text not null
  famille text default split_part(code, '.'::text, 1)
  gravite text not null
  resultat text not null
  message text not null
  motif_officiel text
  preuve jsonb not null default '{}'::jsonb
  cle text not null default ''::text
  levee_id uuid
  cree_le timestamp with time zone not null default now()
  constraint filed_controles_client_id_facture_id_fkey FOREIGN KEY (client_id, facture_id) REFERENCES filed_factures(client_id, id) ON DELETE CASCADE
  constraint filed_controles_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint filed_controles_code_check CHECK ((code ~ '^[a-z][a-z_]{1,30}\.[a-z][a-z_]{1,40}$'::text))
  constraint filed_controles_gravite_check CHECK ((gravite = ANY (ARRAY['bloquant'::text, 'attention'::text, 'info'::text])))
  constraint filed_controles_message_check CHECK (((char_length(message) >= 1) AND (char_length(message) <= 500)))
  constraint filed_controles_motif_officiel_fkey FOREIGN KEY (motif_officiel) REFERENCES filed_motifs_refus(code)
  constraint filed_controles_pkey PRIMARY KEY (id)
  constraint filed_controles_resultat_check CHECK ((resultat = ANY (ARRAY['ok'::text, 'anomalie'::text, 'levee'::text])))
  constraint filed_controles_une_fois UNIQUE (facture_id, code, cle)
  policy "on voit les controles des documents qu'on voit" SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM filed_documents d
  WHERE (d.id = filed_controles.document_id)))) with check ()

  grants authenticated: SELECT

-- ═══ TABLE public.filed_documents
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  annee_reception smallint not null
  numero_reception integer not null
  reference text default ((('R'::text || (annee_reception)::text) || '-'::text) || lpad((numero_reception)::text, 6, '0'::text))
  piece_id uuid not null
  source text not null
  expediteur text
  depose_par uuid
  nom_fichier text not null
  sha256 text not null
  recu_le timestamp with time zone not null default now()
  etat text not null default 'en_lecture'::text
  nature text
  nature_source text
  doublon_de uuid
  motif text
  lu_le timestamp with time zone
  traite_le timestamp with time zone
  constraint filed_documents_annee_reception_check CHECK (((annee_reception >= 2000) AND (annee_reception <= 2999)))
  constraint filed_documents_client_id_doublon_de_fkey FOREIGN KEY (client_id, doublon_de) REFERENCES filed_documents(client_id, id) ON DELETE SET NULL (doublon_de)
  constraint filed_documents_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id)
  constraint filed_documents_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint filed_documents_client_id_id_key UNIQUE (client_id, id)
  constraint filed_documents_client_id_piece_id_fkey FOREIGN KEY (client_id, piece_id) REFERENCES pieces(client_id, id)
  constraint filed_documents_doublon CHECK (((doublon_de IS NULL) OR (etat = 'doublon'::text)))
  constraint filed_documents_etat_check CHECK ((etat = ANY (ARRAY['en_lecture'::text, 'a_classer'::text, 'illisible'::text, 'doublon'::text, 'classe'::text, 'a_traiter'::text, 'integre'::text])))
  constraint filed_documents_expediteur_check CHECK ((char_length(expediteur) <= 320))
  constraint filed_documents_motif_check CHECK ((char_length(motif) <= 500))
  constraint filed_documents_nature_check CHECK ((nature = ANY (ARRAY['facture'::text, 'avoir'::text, 'bon_commande'::text, 'bon_livraison'::text, 'devis'::text, 'releve'::text, 'contrat'::text, 'attestation_assurance'::text, 'autre'::text])))
  constraint filed_documents_nature_source_check CHECK ((nature_source = ANY (ARRAY['lecteur'::text, 'humain'::text])))
  constraint filed_documents_nature_sourcee CHECK (((nature IS NULL) = (nature_source IS NULL)))
  constraint filed_documents_nom_fichier_check CHECK (((char_length(nom_fichier) >= 1) AND (char_length(nom_fichier) <= 255)))
  constraint filed_documents_numero_key UNIQUE (client_id, annee_reception, numero_reception)
  constraint filed_documents_numero_reception_check CHECK ((numero_reception >= 1))
  constraint filed_documents_piece_key UNIQUE (piece_id)
  constraint filed_documents_pkey PRIMARY KEY (id)
  constraint filed_documents_sha256_check CHECK ((sha256 ~ '^[0-9a-f]{64}$'::text))
  constraint filed_documents_source_check CHECK ((source = ANY (ARRAY['depot'::text, 'courriel'::text, 'connecteur'::text, 'api'::text])))
  policy "on voit les documents de son perimetre" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND private.voit_entite(client_id, entite_id) AND private.voit_objet(client_id, 'filed_document'::text, (id)::text))) with check ()
  CREATE TRIGGER filed_documents_tracer AFTER INSERT OR DELETE OR UPDATE ON public.filed_documents FOR EACH ROW EXECUTE FUNCTION private.tracer('+reference', '+entite_id', '+piece_id', '+source', '+sha256', '+etat', '+nature', '+nature_source', '+doublon_de')
  grants authenticated: SELECT

-- ═══ TABLE public.filed_factures
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  document_id uuid not null
  nature text not null
  version integer not null default 1
  numero text
  numero_normalise text
  date_emission date
  date_reception date not null
  echeance_lue date
  devise text not null default 'EUR'::text
  montant_ht numeric(14,2)
  montant_tva numeric(14,2)
  montant_ttc numeric(14,2)
  net_a_payer numeric(14,2)
  montant_prepaye numeric(14,2)
  montants_calcules text[] not null default '{}'::text[]
  type_code text
  cadre_facturation text
  regime_tva text
  fournisseur_id uuid
  fournisseur_identification text
  fournisseur_force uuid
  fournisseur_lu jsonb not null default '{}'::jsonb
  acheteur_lu jsonb not null default '{}'::jsonb
  iban text
  refs jsonb not null default '{}'::jsonb
  mentions jsonb not null default '{}'::jsonb
  champs_douteux jsonb not null default '[]'::jsonb
  empreinte_donnees text
  statut text not null default 'a_completer'::text
  doublon_de uuid
  anomalies text[] not null default '{}'::text[]
  nb_bloquants smallint not null default 0
  nb_attention smallint not null default 0
  controle_le timestamp with time zone
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  commande_id uuid
  commande_force uuid
  avoir_de uuid
  constraint filed_factures_cadre_facturation_check CHECK ((char_length(cadre_facturation) <= 10))
  constraint filed_factures_client_id_avoir_de_fkey FOREIGN KEY (client_id, avoir_de) REFERENCES filed_factures(client_id, id) ON DELETE SET NULL (avoir_de)
  constraint filed_factures_client_id_commande_force_fkey FOREIGN KEY (client_id, commande_force) REFERENCES filed_commandes(client_id, id) ON DELETE SET NULL (commande_force)
  constraint filed_factures_client_id_commande_id_fkey FOREIGN KEY (client_id, commande_id) REFERENCES filed_commandes(client_id, id) ON DELETE SET NULL (commande_id)
  constraint filed_factures_client_id_document_id_fkey FOREIGN KEY (client_id, document_id) REFERENCES filed_documents(client_id, id)
  constraint filed_factures_client_id_doublon_de_fkey FOREIGN KEY (client_id, doublon_de) REFERENCES filed_factures(client_id, id) ON DELETE SET NULL (doublon_de)
  constraint filed_factures_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id)
  constraint filed_factures_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint filed_factures_client_id_fournisseur_force_fkey FOREIGN KEY (client_id, fournisseur_force) REFERENCES filed_fournisseurs(client_id, id)
  constraint filed_factures_client_id_fournisseur_id_fkey FOREIGN KEY (client_id, fournisseur_id) REFERENCES filed_fournisseurs(client_id, id)
  constraint filed_factures_client_id_id_key UNIQUE (client_id, id)
  constraint filed_factures_devise_check CHECK ((devise ~ '^[A-Z]{3}$'::text))
  constraint filed_factures_document_key UNIQUE (document_id)
  constraint filed_factures_fournisseur_identification_check CHECK ((fournisseur_identification = ANY (ARRAY['siren'::text, 'tva'::text, 'id_etranger'::text, 'nom'::text, 'creation'::text, 'humain'::text])))
  constraint filed_factures_iban_check CHECK ((iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$'::text))
  constraint filed_factures_nature_check CHECK ((nature = ANY (ARRAY['facture'::text, 'avoir'::text])))
  constraint filed_factures_numero_check CHECK ((char_length(numero) <= 60))
  constraint filed_factures_pkey PRIMARY KEY (id)
  constraint filed_factures_regime_tva_check CHECK ((regime_tva = ANY (ARRAY['normal'::text, 'mixte'::text, 'autoliquidation'::text, 'intracom'::text, 'hors_ue'::text, 'franchise'::text, 'exonere'::text, 'sans_tva'::text])))
  constraint filed_factures_statut_v2 CHECK ((statut = ANY (ARRAY['a_completer'::text, 'bloquee'::text, 'a_valider'::text, 'ecartee'::text, 'validee'::text, 'refusee'::text, 'comptabilisee'::text])))
  constraint filed_factures_type_code_check CHECK ((char_length(type_code) <= 10))
  constraint filed_factures_version_check CHECK ((version >= 1))
  policy "on voit les factures des documents qu'on voit" SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM filed_documents d
  WHERE (d.id = filed_factures.document_id)))) with check ()
  CREATE TRIGGER filed_factures_tracer AFTER INSERT OR DELETE OR UPDATE ON public.filed_factures FOR EACH ROW EXECUTE FUNCTION private.tracer('+document_id', '+entite_id', '+nature', '+version', '+statut', '+fournisseur_id', '+regime_tva', '+doublon_de')
  grants authenticated: SELECT

-- ═══ TABLE public.filed_fournisseurs
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  code text not null
  nom text not null
  nom_normalise text not null
  siren text
  siret text
  tva text
  id_etranger text
  pays text
  statut text not null default 'a_confirmer'::text
  source text not null
  document_origine uuid
  regime_tva text
  confirme_le timestamp with time zone
  confirme_par uuid
  motif text
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint filed_fournisseurs_client_id_document_origine_fkey FOREIGN KEY (client_id, document_origine) REFERENCES filed_documents(client_id, id) ON DELETE SET NULL (document_origine)
  constraint filed_fournisseurs_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint filed_fournisseurs_client_id_id_key UNIQUE (client_id, id)
  constraint filed_fournisseurs_code_check CHECK ((code ~ '^[A-Z0-9][A-Z0-9_.-]{0,29}$'::text))
  constraint filed_fournisseurs_code_key UNIQUE (client_id, code)
  constraint filed_fournisseurs_id_etranger_check CHECK (((char_length(id_etranger) >= 1) AND (char_length(id_etranger) <= 60)))
  constraint filed_fournisseurs_identifie CHECK (((siren IS NOT NULL) OR (tva IS NOT NULL) OR (id_etranger IS NOT NULL) OR (nom_normalise <> ''::text)))
  constraint filed_fournisseurs_motif_check CHECK ((char_length(motif) <= 500))
  constraint filed_fournisseurs_nom_check CHECK (((char_length(btrim(nom)) >= 1) AND (char_length(btrim(nom)) <= 200)))
  constraint filed_fournisseurs_pays_check CHECK ((pays ~ '^[A-Z]{2}$'::text))
  constraint filed_fournisseurs_pkey PRIMARY KEY (id)
  constraint filed_fournisseurs_regime_tva_check CHECK ((regime_tva = ANY (ARRAY['normal'::text, 'autoliquidation_btp'::text, 'franchise'::text, 'exonere'::text])))
  constraint filed_fournisseurs_siren_check CHECK ((siren ~ '^[0-9]{9}$'::text))
  constraint filed_fournisseurs_siret_check CHECK ((siret ~ '^[0-9]{14}$'::text))
  constraint filed_fournisseurs_source_check CHECK ((source = ANY (ARRAY['facture'::text, 'piece'::text, 'saisie'::text, 'import'::text])))
  constraint filed_fournisseurs_statut_check CHECK ((statut = ANY (ARRAY['a_confirmer'::text, 'actif'::text, 'bloque'::text, 'refuse'::text])))
  constraint filed_fournisseurs_tva_check CHECK ((tva ~ '^[A-Z]{2}[0-9A-Z]{2,13}$'::text))
  policy "membres lisent les fournisseurs" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER filed_fournisseurs_tracer AFTER INSERT OR DELETE OR UPDATE ON public.filed_fournisseurs FOR EACH ROW EXECUTE FUNCTION private.tracer('+code', '+statut', '+siren', '+tva', '+pays', '+source', '+regime_tva', '+confirme_par')
  grants authenticated: SELECT

-- ═══ TABLE public.filed_fournisseurs_ibans
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  fournisseur_id uuid not null
  iban text not null
  iban_masque text not null
  empreinte text not null
  statut text not null default 'propose'::text
  source text not null
  document_id uuid
  propose_par uuid
  propose_le timestamp with time zone not null default now()
  decide_le timestamp with time zone
  decide_par uuid
  motif text
  constraint filed_fournisseurs_ibans_client_id_document_id_fkey FOREIGN KEY (client_id, document_id) REFERENCES filed_documents(client_id, id) ON DELETE SET NULL (document_id)
  constraint filed_fournisseurs_ibans_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint filed_fournisseurs_ibans_client_id_fournisseur_id_fkey FOREIGN KEY (client_id, fournisseur_id) REFERENCES filed_fournisseurs(client_id, id) ON DELETE CASCADE
  constraint filed_fournisseurs_ibans_client_id_id_key UNIQUE (client_id, id)
  constraint filed_fournisseurs_ibans_empreinte_check CHECK ((empreinte ~ '^[0-9a-f]{64}$'::text))
  constraint filed_fournisseurs_ibans_iban_check CHECK ((iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$'::text))
  constraint filed_fournisseurs_ibans_motif_check CHECK ((char_length(motif) <= 500))
  constraint filed_fournisseurs_ibans_pkey PRIMARY KEY (id)
  constraint filed_fournisseurs_ibans_source_check CHECK ((source = ANY (ARRAY['facture'::text, 'saisie'::text, 'import'::text])))
  constraint filed_fournisseurs_ibans_statut_check CHECK ((statut = ANY (ARRAY['propose'::text, 'valide'::text, 'refuse'::text, 'revoque'::text])))
  constraint filed_fournisseurs_ibans_une_fois UNIQUE (client_id, fournisseur_id, iban)
  policy "membres lisent les iban des fournisseurs" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER filed_fournisseurs_ibans_tracer AFTER INSERT OR DELETE OR UPDATE ON public.filed_fournisseurs_ibans FOR EACH ROW EXECUTE FUNCTION private.tracer('+fournisseur_id', '+iban_masque', '+empreinte', '+statut', '+source', '+propose_par', '+decide_par')
  grants authenticated: SELECT

-- ═══ TABLE public.filed_verifications_tiers
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  fournisseur_id uuid
  registre text not null
  identifiant text not null
  demande_le timestamp with time zone not null default now()
  repondu_le timestamp with time zone
  resultat text
  preuve jsonb not null default '{}'::jsonb
  cree_le timestamp with time zone not null default now()
  constraint filed_verifications_tiers_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint filed_verifications_tiers_fournisseur_id_fkey FOREIGN KEY (fournisseur_id) REFERENCES filed_fournisseurs(id) ON DELETE CASCADE
  constraint filed_verifications_tiers_pkey PRIMARY KEY (id)
  constraint filed_verifications_tiers_registre_check CHECK ((registre = ANY (ARRAY['vies'::text, 'sirene'::text])))
  constraint filed_verifications_tiers_resultat_check CHECK ((resultat = ANY (ARRAY['valide'::text, 'invalide'::text, 'indisponible'::text])))
  policy "filed_verifications_tiers_lecture" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()

  grants authenticated: SELECT

-- ═══ TABLE public.gabarits_messages
  id uuid not null default gen_random_uuid()
  client_id uuid
  module text not null
  code text not null
  langue text not null default 'fr'::text
  version integer not null default 1
  canal text not null
  libelle text not null
  sujet text
  corps text not null
  variables jsonb not null default '{}'::jsonb
  transactionnel boolean not null default true
  donnees_sante boolean not null default false
  espacement boolean not null default true
  modele_externe text
  statut text not null default 'brouillon'::text
  valide_le timestamp with time zone
  valide_par text
  retire_le timestamp with time zone
  motif_retrait text
  cree_le timestamp with time zone not null default now()
  constraint gabarits_messages_canal_check CHECK ((canal = ANY (ARRAY['email'::text, 'whatsapp'::text, 'sms'::text, 'lre'::text, 'appel'::text])))
  constraint gabarits_messages_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint gabarits_messages_code_check CHECK (((code ~ '^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$'::text) AND (char_length(code) <= 100)))
  constraint gabarits_messages_code_du_module CHECK (starts_with(code, (module || '.'::text)))
  constraint gabarits_messages_corps_check CHECK (((char_length(corps) >= 1) AND (char_length(corps) <= 20000)))
  constraint gabarits_messages_langue_check CHECK ((langue ~ '^[a-z]{2}$'::text))
  constraint gabarits_messages_libelle_check CHECK (((char_length(btrim(libelle)) >= 3) AND (char_length(btrim(libelle)) <= 120)))
  constraint gabarits_messages_modele_externe_check CHECK (((char_length(modele_externe) >= 1) AND (char_length(modele_externe) <= 200)))
  constraint gabarits_messages_module_check CHECK ((module ~ '^[a-z][a-z_]{1,29}$'::text))
  constraint gabarits_messages_motif_retrait_check CHECK ((char_length(motif_retrait) <= 300))
  constraint gabarits_messages_pkey PRIMARY KEY (id)
  constraint gabarits_messages_statut_check CHECK ((statut = ANY (ARRAY['brouillon'::text, 'valide'::text, 'retire'::text])))
  constraint gabarits_messages_sujet_check CHECK (((char_length(sujet) >= 1) AND (char_length(sujet) <= 300)))
  constraint gabarits_messages_une_version UNIQUE NULLS NOT DISTINCT (client_id, code, langue, version)
  constraint gabarits_messages_valide_par_check CHECK ((char_length(valide_par) <= 200))
  constraint gabarits_messages_variables_check CHECK ((jsonb_typeof(variables) = 'object'::text))
  constraint gabarits_messages_version_check CHECK ((version >= 1))
  policy "on lit les gabarits communs et ceux de son organisation" SELECT to authenticated using (((client_id IS NULL) OR (client_id IN ( SELECT private.mes_clients() AS mes_clients)))) with check ()
  CREATE TRIGGER gabarits_messages_preparer BEFORE INSERT OR DELETE OR UPDATE ON public.gabarits_messages FOR EACH ROW EXECUTE FUNCTION private.preparer_gabarit()
  CREATE TRIGGER gabarits_messages_tracer AFTER INSERT OR UPDATE ON public.gabarits_messages FOR EACH ROW EXECUTE FUNCTION private.tracer('+module', '+code', '+langue', '+version', '+canal', '+statut', '+valide_par', '+transactionnel', '+donnees_sante', '+espacement')
  grants authenticated: SELECT

-- ═══ TABLE public.instantanes
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  releve_id uuid not null
  branchement_id uuid not null
  jeu_id uuid
  piece_id uuid not null
  nom_fichier text not null
  sha256 text not null
  octets bigint
  statut text not null default 'recu'::text
  complet boolean
  fenetre jsonb
  perimetre jsonb
  lignes integer
  anomalies integer
  colonnes jsonb
  format jsonb
  base_id uuid
  lignes_base integer
  ajouts integer
  modifications integer
  disparitions integer
  absences integer
  garde jsonb
  force boolean not null default false
  motif text
  version_releve text
  recu_le timestamp with time zone not null default clock_timestamp()
  lu_le timestamp with time zone
  finalise_le timestamp with time zone
  applique_le timestamp with time zone
  publie_le timestamp with time zone
  tranche_par text
  tranche_le timestamp with time zone
  constraint instantanes_anomalies_check CHECK ((anomalies >= 0))
  constraint instantanes_client_id_base_id_fkey FOREIGN KEY (client_id, base_id) REFERENCES instantanes(client_id, id) ON DELETE SET NULL (base_id)
  constraint instantanes_client_id_branchement_id_fkey FOREIGN KEY (client_id, branchement_id) REFERENCES branchements(client_id, id) ON DELETE CASCADE
  constraint instantanes_client_id_id_key UNIQUE (client_id, id)
  constraint instantanes_client_id_jeu_id_fkey FOREIGN KEY (client_id, jeu_id) REFERENCES branchements_jeux(client_id, id) ON DELETE CASCADE
  constraint instantanes_client_id_piece_id_fkey FOREIGN KEY (client_id, piece_id) REFERENCES pieces(client_id, id) ON DELETE CASCADE
  constraint instantanes_client_id_releve_id_fkey FOREIGN KEY (client_id, releve_id) REFERENCES releves(client_id, id) ON DELETE CASCADE
  constraint instantanes_fenetre_check CHECK (private.fenetre_fichier_valide(fenetre))
  constraint instantanes_lignes_check CHECK ((lignes >= 0))
  constraint instantanes_motif_check CHECK ((char_length(motif) <= 500))
  constraint instantanes_nom_fichier_check CHECK (((char_length(nom_fichier) >= 1) AND (char_length(nom_fichier) <= 255)))
  constraint instantanes_octets_check CHECK ((octets >= 0))
  constraint instantanes_perimetre_check CHECK (((perimetre IS NULL) OR ((jsonb_typeof(perimetre) = 'object'::text) AND (perimetre <> '{}'::jsonb))))
  constraint instantanes_pkey PRIMARY KEY (id)
  constraint instantanes_sha256_check CHECK ((sha256 ~ '^[0-9a-f]{64}$'::text))
  constraint instantanes_statut_check CHECK ((statut = ANY (ARRAY['recu'::text, 'en_lecture'::text, 'lu'::text, 'a_appliquer'::text, 'applique'::text, 'identique'::text, 'douteux'::text, 'remplace'::text, 'ecarte'::text, 'a_classer'::text, 'rejete'::text, 'echec'::text])))
  constraint instantanes_tranche_par_check CHECK ((char_length(tranche_par) <= 200))
  constraint instantanes_version_releve_check CHECK ((char_length(version_releve) <= 40))
  policy "on voit les instantanes des branchements qu'on voit" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (EXISTS ( SELECT 1
   FROM branchements b
  WHERE (b.id = instantanes.branchement_id))))) with check ()
  CREATE TRIGGER instantanes_tracer AFTER INSERT OR DELETE OR UPDATE ON public.instantanes FOR EACH ROW EXECUTE FUNCTION private.tracer('+releve_id', '+branchement_id', '+jeu_id', '+sha256', '+statut', '+lignes', '+ajouts', '+modifications', '+disparitions', '+force', '+tranche_par')
  grants authenticated: SELECT

-- ═══ TABLE public.instantanes_ecarts
  id bigint not null
  client_id uuid not null
  instantane_id uuid not null
  jeu_id uuid not null
  cle text not null
  nature text not null
  avant jsonb
  apres jsonb
  champs text[]
  anomalies jsonb
  n integer
  cree_le timestamp with time zone not null default now()
  constraint instantanes_ecarts_client_id_instantane_id_fkey FOREIGN KEY (client_id, instantane_id) REFERENCES instantanes(client_id, id) ON DELETE CASCADE
  constraint instantanes_ecarts_client_id_jeu_id_fkey FOREIGN KEY (client_id, jeu_id) REFERENCES branchements_jeux(client_id, id) ON DELETE CASCADE
  constraint instantanes_ecarts_forme CHECK ((((nature = 'ajout'::text) AND (avant IS NULL) AND (apres IS NOT NULL)) OR ((nature = 'modification'::text) AND (avant IS NOT NULL) AND (apres IS NOT NULL)) OR ((nature = 'disparition'::text) AND (avant IS NOT NULL) AND (apres IS NULL))))
  constraint instantanes_ecarts_nature_check CHECK ((nature = ANY (ARRAY['ajout'::text, 'modification'::text, 'disparition'::text])))
  constraint instantanes_ecarts_pkey PRIMARY KEY (id)
  constraint instantanes_ecarts_une_cle UNIQUE (instantane_id, cle)
  policy "on voit les ecarts des instantanes qu'on voit" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (EXISTS ( SELECT 1
   FROM instantanes i
  WHERE (i.id = instantanes_ecarts.instantane_id))))) with check ()

  grants authenticated: SELECT

-- ═══ TABLE public.jeux_lignes
  client_id uuid not null
  jeu_id uuid not null
  cle text not null
  valeurs jsonb not null
  anomalies jsonb
  empreinte text not null
  sensibles jsonb
  instantane_id uuid
  entre_le timestamp with time zone not null default now()
  modifie_le timestamp with time zone not null default now()
  absences smallint not null default 0
  constraint jeux_lignes_absences_check CHECK ((absences >= 0))
  constraint jeux_lignes_anomalies_check CHECK (((anomalies IS NULL) OR (jsonb_typeof(anomalies) = 'object'::text)))
  constraint jeux_lignes_cle_check CHECK (((char_length(cle) >= 1) AND (char_length(cle) <= 1000)))
  constraint jeux_lignes_client_id_instantane_id_fkey FOREIGN KEY (client_id, instantane_id) REFERENCES instantanes(client_id, id) ON DELETE SET NULL (instantane_id)
  constraint jeux_lignes_client_id_jeu_id_fkey FOREIGN KEY (client_id, jeu_id) REFERENCES branchements_jeux(client_id, id) ON DELETE CASCADE
  constraint jeux_lignes_empreinte_check CHECK ((empreinte ~ '^[0-9a-f]{64}$'::text))
  constraint jeux_lignes_pkey PRIMARY KEY (jeu_id, cle)
  constraint jeux_lignes_valeurs_check CHECK ((jsonb_typeof(valeurs) = 'object'::text))
  policy "on voit l'etat des jeux qu'on voit" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (EXISTS ( SELECT 1
   FROM branchements_jeux j
  WHERE (j.id = jeux_lignes.jeu_id))))) with check ()

  grants authenticated: SELECT

-- ═══ TABLE public.journal_opposable
  id bigint not null
  client_id uuid not null
  entite_id uuid
  survenu_le timestamp with time zone not null
  acteur_type text not null
  acteur_id uuid
  acteur_libelle text
  action text not null
  objet_type text not null
  objet_id text
  donnees jsonb not null default '{}'::jsonb
  hash_precedent bytea
  hash bytea not null
  constraint journal_opposable_acteur_type_check CHECK ((acteur_type = ANY (ARRAY['utilisateur'::text, 'operateur'::text, 'systeme'::text])))
  constraint journal_opposable_action_check CHECK (((char_length(action) >= 1) AND (char_length(action) <= 120)))
  constraint journal_opposable_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint journal_opposable_hash_check CHECK ((octet_length(hash) = 32))
  constraint journal_opposable_objet_type_check CHECK (((char_length(objet_type) >= 1) AND (char_length(objet_type) <= 80)))
  constraint journal_opposable_pkey PRIMARY KEY (id)
  policy "gerants et admins lisent le journal" SELECT to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check ()
  CREATE TRIGGER journal_immuable BEFORE DELETE OR UPDATE ON public.journal_opposable FOR EACH ROW EXECUTE FUNCTION private.journal_immuable()
  CREATE TRIGGER journal_sans_vidage BEFORE TRUNCATE ON public.journal_opposable FOR EACH STATEMENT EXECUTE FUNCTION private.journal_sans_vidage()
  grants authenticated: SELECT

-- ═══ TABLE public.mesures
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  indicateur text not null
  version smallint not null
  mode text not null
  periode_type text not null
  debut date not null
  fin date not null
  valeur numeric not null
  numerateur numeric
  base numeric
  entite_id uuid
  objet_type text
  objet_id text
  objet_libelle text
  enregistre_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint mesures_base_check CHECK ((base >= (0)::numeric))
  constraint mesures_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id)
  constraint mesures_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint mesures_client_id_id_key UNIQUE (client_id, id)
  constraint mesures_indicateur_version_fkey FOREIGN KEY (indicateur, version) REFERENCES indicateurs(code, version)
  constraint mesures_libelle_d_un_objet CHECK (((objet_libelle IS NULL) OR (objet_id IS NOT NULL)))
  constraint mesures_mode_check CHECK ((mode = ANY (ARRAY['a_blanc'::text, 'reel'::text])))
  constraint mesures_objet_complet CHECK (((objet_type IS NULL) = (objet_id IS NULL)))
  constraint mesures_objet_id_check CHECK (((char_length(objet_id) >= 1) AND (char_length(objet_id) <= 120)))
  constraint mesures_objet_libelle_check CHECK (((char_length(btrim(objet_libelle)) >= 1) AND (char_length(btrim(objet_libelle)) <= 120)))
  constraint mesures_objet_type_check CHECK ((objet_type ~ '^[a-z][a-z0-9_]{1,39}$'::text))
  constraint mesures_periode CHECK (
CASE periode_type
    WHEN 'jour'::text THEN (fin = debut)
    WHEN 'semaine'::text THEN ((EXTRACT(isodow FROM debut) = (1)::numeric) AND (fin = (debut + 6)))
    WHEN 'mois'::text THEN ((EXTRACT(day FROM debut) = (1)::numeric) AND (fin = (((debut + '1 mon'::interval))::date - 1)))
    ELSE ((mode = 'a_blanc'::text) AND (fin >= debut) AND ((fin - debut) <= 366))
END)
  constraint mesures_periode_type_check CHECK ((periode_type = ANY (ARRAY['jour'::text, 'semaine'::text, 'mois'::text, 'libre'::text])))
  constraint mesures_pkey PRIMARY KEY (id)
  constraint mesures_une_fois UNIQUE NULLS NOT DISTINCT (client_id, indicateur, version, mode, periode_type, debut, fin, entite_id, objet_type, objet_id)
  policy "on lit les mesures de son perimetre et de ses droits" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND private.mesure_visible(client_id, indicateur, version, entite_id, objet_type, objet_id))) with check ()
  CREATE TRIGGER mesures_perimer_rapports AFTER INSERT OR DELETE OR UPDATE ON public.mesures FOR EACH ROW EXECUTE FUNCTION private.mesure_perimer_rapports()
  CREATE TRIGGER mesures_tracer AFTER INSERT OR DELETE OR UPDATE ON public.mesures FOR EACH ROW EXECUTE FUNCTION private.tracer('+indicateur', '+version', '+mode', '+periode_type', '+debut', '+fin', '+valeur', '+numerateur', '+base', '+entite_id', '+objet_type', '+objet_id')
  grants authenticated: SELECT

-- ═══ TABLE public.modeles_jeux
  id uuid not null default gen_random_uuid()
  module text
  logiciel text
  code text not null
  version smallint not null default 1
  libelle text not null
  motif_fichier text
  entetes text[] not null default '{}'::text[]
  colonnes jsonb not null default '{}'::jsonb
  cle text[] not null default '{}'::text[]
  complet boolean not null default true
  fenetre jsonb
  confirmer_disparition smallint not null default 1
  seuil_perte numeric(4,3) not null default 0.2
  perte_min integer not null default 1
  seuil_anomalies numeric(4,3) not null default 0.05
  options jsonb not null default '{}'::jsonb
  accuse boolean not null default true
  rythme interval
  plages jsonb
  attendu jsonb
  source text
  cree_le timestamp with time zone not null default now()
  constraint modeles_jeux_attendu_check CHECK (private.attendu_valide(attendu))
  constraint modeles_jeux_code_check CHECK ((code ~ '^[a-z][a-z0-9_]{1,39}$'::text))
  constraint modeles_jeux_coherent CHECK (private.declaration_coherente(colonnes, cle, fenetre, entetes))
  constraint modeles_jeux_colonnes_check CHECK (private.colonnes_valides(colonnes))
  constraint modeles_jeux_confirmer_disparition_check CHECK (((confirmer_disparition >= 1) AND (confirmer_disparition <= 10)))
  constraint modeles_jeux_fenetre_check CHECK (private.fenetre_jeu_valide(fenetre))
  constraint modeles_jeux_libelle_check CHECK (((char_length(btrim(libelle)) >= 1) AND (char_length(btrim(libelle)) <= 200)))
  constraint modeles_jeux_logiciel_check CHECK ((logiciel ~ '^[a-z][a-z0-9_]{1,39}$'::text))
  constraint modeles_jeux_module_check CHECK ((module ~ '^[a-z][a-z_]{1,29}$'::text))
  constraint modeles_jeux_motif_fichier_check CHECK (private.motif_valide(motif_fichier))
  constraint modeles_jeux_options_check CHECK (private.options_valides(options))
  constraint modeles_jeux_perte_min_check CHECK ((perte_min >= 1))
  constraint modeles_jeux_pkey PRIMARY KEY (id)
  constraint modeles_jeux_plages_check CHECK (private.plages_valides(plages))
  constraint modeles_jeux_rythme_check CHECK ((rythme >= '00:05:00'::interval))
  constraint modeles_jeux_seuil_anomalies_check CHECK (((seuil_anomalies >= (0)::numeric) AND (seuil_anomalies <= (1)::numeric)))
  constraint modeles_jeux_seuil_perte_check CHECK (((seuil_perte >= (0)::numeric) AND (seuil_perte <= (1)::numeric)))
  constraint modeles_jeux_source_check CHECK ((char_length(source) <= 400))
  constraint modeles_jeux_une_version UNIQUE NULLS NOT DISTINCT (module, logiciel, code, version)
  constraint modeles_jeux_version_check CHECK ((version >= 1))
  policy "les modeles se lisent par tous" SELECT to authenticated using (true) with check ()

  grants authenticated: SELECT

-- ═══ TABLE public.objets_restreints
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  objet_type text not null
  cree_le timestamp with time zone not null default now()
  constraint objets_restreints_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint objets_restreints_objet_type_check CHECK ((objet_type ~ '^[a-z][a-z0-9_]{1,39}$'::text))
  constraint objets_restreints_pkey PRIMARY KEY (id)
  constraint objets_restreints_une_fois UNIQUE (client_id, objet_type)
  policy "le gerant leve une restriction" DELETE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text])) with check ()
  policy "le gerant restreint un type" INSERT to authenticated using () with check (private.a_un_role(client_id, ARRAY['gerant'::text]))
  policy "membres lisent les types restreints" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER objets_restreints_tracer AFTER INSERT OR DELETE ON public.objets_restreints FOR EACH ROW EXECUTE FUNCTION private.tracer()
  grants authenticated: DELETE,INSERT,SELECT

-- ═══ TABLE public.oppositions
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  type text not null
  canal text
  adresse text
  adresse_empreinte text
  ref text
  jusqu_au timestamp with time zone
  motif text
  source text not null
  cree_le timestamp with time zone not null default now()
  cree_par uuid
  levee_le timestamp with time zone
  levee_par uuid
  motif_levee text
  constraint oppositions_adresse_check CHECK (((char_length(adresse) >= 3) AND (char_length(adresse) <= 254)))
  constraint oppositions_canal_check CHECK ((canal = ANY (ARRAY['email'::text, 'whatsapp'::text, 'sms'::text, 'lre'::text, 'appel'::text])))
  constraint oppositions_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint oppositions_motif_check CHECK ((char_length(motif) <= 300))
  constraint oppositions_motif_levee_check CHECK ((char_length(motif_levee) <= 300))
  constraint oppositions_pause_datee CHECK (((type = 'pause'::text) = (jusqu_au IS NOT NULL)))
  constraint oppositions_pkey PRIMARY KEY (id)
  constraint oppositions_ref_check CHECK (((char_length(ref) >= 1) AND (char_length(ref) <= 200)))
  constraint oppositions_source_check CHECK ((source = ANY (ARRAY['message'::text, 'demande'::text, 'client'::text, 'rebond'::text, 'plainte'::text, 'systeme'::text])))
  constraint oppositions_type_check CHECK ((type = ANY (ARRAY['desinscription'::text, 'pause'::text, 'invalide'::text])))
  constraint oppositions_une_cible CHECK (((adresse IS NOT NULL) OR (ref IS NOT NULL)))
  policy "membres voient les oppositions" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER oppositions_garder BEFORE INSERT OR DELETE OR UPDATE ON public.oppositions FOR EACH ROW EXECUTE FUNCTION private.garder_par_les_portes()
  CREATE TRIGGER oppositions_tracer AFTER INSERT OR UPDATE ON public.oppositions FOR EACH ROW EXECUTE FUNCTION private.tracer('+type', '+canal', '+source', '+jusqu_au', '+ref', '+adresse_empreinte', '+levee_le')
  grants authenticated: SELECT

-- ═══ TABLE public.pieces
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  module text not null
  objet_type text
  objet_id text
  source text not null
  expediteur text
  depose_par uuid
  nom_fichier text not null
  mime text not null
  octets bigint not null
  sha256 text not null
  chemin text not null
  statut text not null default 'recue'::text
  type_piece text
  confiance_type numeric(4,3)
  nb_pages integer
  methode text
  version_lecteur text
  piece_mere_id uuid
  motif text
  recue_le timestamp with time zone not null default now()
  lue_le timestamp with time zone
  chiffrement text
  constraint pieces_chemin_check CHECK (((char_length(chemin) >= 1) AND (char_length(chemin) <= 1024)))
  constraint pieces_chiffrement_check CHECK ((chiffrement = 'dossier:v1'::text))
  constraint pieces_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint pieces_client_id_id_key UNIQUE (client_id, id)
  constraint pieces_client_id_piece_mere_id_fkey FOREIGN KEY (client_id, piece_mere_id) REFERENCES pieces(client_id, id) ON DELETE CASCADE
  constraint pieces_confiance_type_check CHECK (((confiance_type >= (0)::numeric) AND (confiance_type <= (1)::numeric)))
  constraint pieces_expediteur_check CHECK ((char_length(expediteur) <= 320))
  constraint pieces_methode_check CHECK ((methode = ANY (ARRAY['natif'::text, 'ocr'::text, 'mixte'::text, 'xml'::text, 'tableur'::text])))
  constraint pieces_mime_check CHECK (((char_length(mime) >= 1) AND (char_length(mime) <= 120)))
  constraint pieces_module_check CHECK ((module ~ '^[a-z][a-z_]{1,29}$'::text))
  constraint pieces_motif_check CHECK ((char_length(motif) <= 500))
  constraint pieces_nb_pages_check CHECK ((nb_pages >= 0))
  constraint pieces_nom_fichier_check CHECK (((char_length(nom_fichier) >= 1) AND (char_length(nom_fichier) <= 255)))
  constraint pieces_objet_complet CHECK (((objet_type IS NULL) = (objet_id IS NULL)))
  constraint pieces_objet_id_check CHECK (((char_length(objet_id) >= 1) AND (char_length(objet_id) <= 120)))
  constraint pieces_objet_type_check CHECK ((objet_type ~ '^[a-z][a-z0-9_]{1,39}$'::text))
  constraint pieces_octets_check CHECK ((octets >= 0))
  constraint pieces_pkey PRIMARY KEY (id)
  constraint pieces_rattachee_avant_lecture CHECK (((objet_id IS NOT NULL) OR (statut = ANY (ARRAY['recue'::text, 'a_rattacher'::text, 'en_attente_expediteur'::text, 'rejetee'::text]))))
  constraint pieces_sha256_check CHECK ((sha256 ~ '^[0-9a-f]{64}$'::text))
  constraint pieces_source_check CHECK ((source = ANY (ARRAY['depot'::text, 'courriel'::text, 'connecteur'::text, 'export'::text, 'api'::text])))
  constraint pieces_statut_check CHECK ((statut = ANY (ARRAY['recue'::text, 'a_rattacher'::text, 'en_attente_expediteur'::text, 'en_lecture'::text, 'lue'::text, 'a_verifier'::text, 'a_classer'::text, 'rejetee'::text, 'echec'::text])))
  constraint pieces_type_piece_check CHECK ((type_piece ~ '^[a-z][a-z0-9_]{1,59}$'::text))
  constraint pieces_une_fois UNIQUE NULLS NOT DISTINCT (client_id, module, objet_type, objet_id, sha256)
  constraint pieces_version_lecteur_check CHECK ((char_length(version_lecteur) <= 40))
  policy "on voit les pieces des objets qu'on lit" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND
CASE
    WHEN (objet_id IS NULL) THEN private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])
    ELSE private.lit_objet(client_id, objet_type, objet_id)
END)) with check ()
  CREATE TRIGGER pieces_chiffrer BEFORE INSERT OR UPDATE OF objet_type, objet_id, chiffrement ON public.pieces FOR EACH ROW EXECUTE FUNCTION private.chiffrer_piece()
  CREATE TRIGGER pieces_clore_suivi AFTER INSERT OR UPDATE OF objet_id, statut, type_piece ON public.pieces FOR EACH ROW EXECUTE FUNCTION private.suivis_piece_recue()
  CREATE TRIGGER pieces_demander_lecture AFTER INSERT OR UPDATE OF objet_id, statut ON public.pieces FOR EACH ROW EXECUTE FUNCTION private.demander_lecture()
  CREATE TRIGGER pieces_preparer_rattachement BEFORE UPDATE OF objet_id ON public.pieces FOR EACH ROW EXECUTE FUNCTION private.preparer_rattachement()
  CREATE TRIGGER pieces_tracer AFTER INSERT OR DELETE OR UPDATE ON public.pieces FOR EACH ROW EXECUTE FUNCTION private.tracer('+module', '+objet_type', '+objet_id', '+source', '+sha256', '+statut', '+type_piece', '+nb_pages', '+methode', '+version_lecteur')
  grants authenticated: SELECT

-- ═══ TABLE public.pieces_pages
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  piece_id uuid not null
  n integer not null
  methode text not null
  texte text not null default ''::text
  confiance numeric(4,3)
  manuscrit boolean not null default false
  largeur numeric(8,2)
  hauteur numeric(8,2)
  texte_chiffre bytea
  constraint pieces_pages_clair_ou_chiffre CHECK (((texte = ''::text) OR (texte_chiffre IS NULL)))
  constraint pieces_pages_client_id_piece_id_fkey FOREIGN KEY (client_id, piece_id) REFERENCES pieces(client_id, id) ON DELETE CASCADE
  constraint pieces_pages_confiance_check CHECK (((confiance >= (0)::numeric) AND (confiance <= (1)::numeric)))
  constraint pieces_pages_methode_check CHECK ((methode = ANY (ARRAY['natif'::text, 'ocr'::text, 'ocr_manuscrit'::text, 'vision'::text])))
  constraint pieces_pages_n_check CHECK ((n >= 1))
  constraint pieces_pages_pkey PRIMARY KEY (id)
  constraint pieces_pages_une_fois UNIQUE (piece_id, n)
  policy "on voit les pages des pieces qu'on voit" SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM pieces p
  WHERE (p.id = pieces_pages.piece_id)))) with check ()
  CREATE TRIGGER pieces_pages_garder_chiffrement BEFORE INSERT OR UPDATE ON public.pieces_pages FOR EACH ROW EXECUTE FUNCTION private.garder_chiffrement()
  grants authenticated: SELECT

-- ═══ TABLE public.pieces_valeurs
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  piece_id uuid not null
  champ text not null
  valeur jsonb not null
  texte text
  page integer
  boite jsonb
  source text not null
  confiance numeric(4,3)
  verifiee boolean not null default false
  controle text
  cree_le timestamp with time zone not null default now()
  chiffre bytea
  constraint pieces_valeurs_champ_check CHECK ((champ ~ '^[a-z][a-z0-9_.]{1,79}$'::text))
  constraint pieces_valeurs_clair_ou_chiffre CHECK (((chiffre IS NULL) OR ((valeur = 'null'::jsonb) AND (texte IS NULL) AND (boite IS NULL) AND (controle IS NULL))))
  constraint pieces_valeurs_client_id_piece_id_fkey FOREIGN KEY (client_id, piece_id) REFERENCES pieces(client_id, id) ON DELETE CASCADE
  constraint pieces_valeurs_confiance_check CHECK (((confiance >= (0)::numeric) AND (confiance <= (1)::numeric)))
  constraint pieces_valeurs_controle_check CHECK ((char_length(controle) <= 300))
  constraint pieces_valeurs_page_check CHECK ((page >= 1))
  constraint pieces_valeurs_pkey PRIMARY KEY (id)
  constraint pieces_valeurs_source_check CHECK ((source = ANY (ARRAY['xml'::text, 'regle'::text, 'ia'::text, 'tableur'::text, 'humain'::text])))
  constraint pieces_valeurs_texte_check CHECK ((char_length(texte) <= 2000))
  policy "on voit les valeurs des pieces qu'on voit" SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM pieces p
  WHERE (p.id = pieces_valeurs.piece_id)))) with check ()
  CREATE TRIGGER pieces_valeurs_garder_chiffrement BEFORE INSERT OR UPDATE ON public.pieces_valeurs FOR EACH ROW EXECUTE FUNCTION private.garder_chiffrement()
  grants authenticated: SELECT

-- ═══ TABLE public.points_du_jour
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  user_id uuid not null
  jour date not null
  territoire text not null
  fuseau text not null
  heure time without time zone not null
  prevu_le timestamp with time zone not null
  du_le timestamp with time zone
  assemble_le timestamp with time zone not null default now()
  statut text not null
  canal text not null
  contenu text not null
  incomplet boolean not null default false
  motifs jsonb not null default '[]'::jsonb
  nb_sections smallint not null default 0
  nb_items smallint not null default 0
  nb_critiques smallint not null default 0
  empreinte text not null
  version smallint not null default 1
  envoi_id uuid
  remis_le timestamp with time zone
  motif_echec text
  ouvert_le timestamp with time zone
  expurge_le timestamp with time zone
  constraint points_du_jour_canal_check CHECK ((canal = ANY (ARRAY['email'::text, 'whatsapp'::text])))
  constraint points_du_jour_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint points_du_jour_client_id_id_key UNIQUE (client_id, id)
  constraint points_du_jour_contenu_check CHECK ((contenu = ANY (ARRAY['complet'::text, 'signal'::text])))
  constraint points_du_jour_empreinte_check CHECK ((empreinte ~ '^[0-9a-f]{64}$'::text))
  constraint points_du_jour_motif_echec_check CHECK ((char_length(motif_echec) <= 300))
  constraint points_du_jour_pkey PRIMARY KEY (id)
  constraint points_du_jour_statut_check CHECK ((statut = ANY (ARRAY['pret'::text, 'vide'::text, 'remis'::text, 'echec'::text, 'perime'::text])))
  constraint points_du_jour_territoire_fkey FOREIGN KEY (territoire) REFERENCES territoires(code)
  constraint points_du_jour_une_fois UNIQUE (client_id, user_id, jour)
  constraint points_du_jour_user_id_client_id_fkey FOREIGN KEY (user_id, client_id) REFERENCES comptes(user_id, client_id) ON DELETE CASCADE
  constraint points_du_jour_version_check CHECK ((version >= 1))
  policy "chacun voit ses points, le gerant tous" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND ((user_id = ( SELECT auth.uid() AS uid)) OR private.a_un_role(client_id, ARRAY['gerant'::text])))) with check ()
  CREATE TRIGGER points_du_jour_tracer AFTER INSERT OR DELETE OR UPDATE ON public.points_du_jour FOR EACH ROW EXECUTE FUNCTION private.tracer('+user_id', '+jour', '+statut', '+prevu_le', '+du_le', '+assemble_le', '+incomplet', '+nb_sections', '+nb_items', '+nb_critiques', '+empreinte', '+version', '+envoi_id', '+ouvert_le', '+expurge_le')
  grants authenticated: SELECT

-- ═══ TABLE public.points_du_jour_lignes
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  point_id uuid not null
  section_rang smallint not null
  rang smallint not null
  section_id uuid
  module text not null
  entite_id uuid
  entite_nom text
  titre text not null
  sante boolean not null default false
  section_incomplete boolean not null default false
  donnees_du timestamp with time zone
  texte text
  lien text
  gravite text
  objet_type text
  objet_id text
  gabarit text
  gabarit_version smallint
  valeurs jsonb
  constraint points_du_jour_lignes_client_id_point_id_fkey FOREIGN KEY (client_id, point_id) REFERENCES points_du_jour(client_id, id) ON DELETE CASCADE
  constraint points_du_jour_lignes_forme CHECK ((((rang = 0) = (texte IS NULL)) AND ((rang = 0) = (gravite IS NULL))))
  constraint points_du_jour_lignes_gravite_check CHECK ((gravite = ANY (ARRAY['info'::text, 'attention'::text, 'critique'::text])))
  constraint points_du_jour_lignes_pkey PRIMARY KEY (id)
  constraint points_du_jour_lignes_une_fois UNIQUE (point_id, section_rang, rang)
  policy "on voit les lignes de ses points, et des objets qu'on voit" SELECT to authenticated using (((EXISTS ( SELECT 1
   FROM points_du_jour p
  WHERE (p.id = points_du_jour_lignes.point_id))) AND ((objet_type IS NULL) OR private.voit_objet(client_id, objet_type, objet_id)))) with check ()
  CREATE TRIGGER points_du_jour_lignes_expurge AFTER DELETE ON public.points_du_jour_lignes FOR EACH ROW EXECUTE FUNCTION private.point_marquer_expurge()
  grants authenticated: SELECT

-- ═══ TABLE public.points_gabarits
  code text not null
  version smallint not null default 1
  texte text not null
  champs jsonb not null default '{}'::jsonb
  valide_par text not null
  valide_le date not null
  en_service boolean not null default true
  cree_le timestamp with time zone not null default now()
  constraint points_gabarits_code_check CHECK ((code ~ '^[a-z][a-z_]{1,29}\.[a-z][a-z0-9_.]{1,79}$'::text))
  constraint points_gabarits_forme CHECK (private.point_gabarit_valide(texte, champs))
  constraint points_gabarits_pkey PRIMARY KEY (code, version)
  constraint points_gabarits_texte_check CHECK ((((char_length(texte) >= 3) AND (char_length(texte) <= 200)) AND (texte !~ '[[:cntrl:]]'::text)))
  constraint points_gabarits_valide_par_check CHECK (((char_length(btrim(valide_par)) >= 2) AND (char_length(btrim(valide_par)) <= 120)))
  constraint points_gabarits_version_check CHECK (((version >= 1) AND (version <= 999)))
  policy "les gabarits du point se lisent par tous" SELECT to authenticated using (true) with check ()

  grants authenticated: SELECT

-- ═══ TABLE public.points_reglages
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  user_id uuid
  actif boolean not null default true
  heure time without time zone
  territoire text
  jours smallint[]
  sauf_feries boolean
  canal text
  contenu text
  si_vide text
  delais_horizon integer
  donnees_sante boolean
  conservation_jours integer
  maj_le timestamp with time zone not null default now()
  maj_par uuid
  horaire_depuis timestamp with time zone not null default now()
  constraint points_reglages_canal_check CHECK ((canal = ANY (ARRAY['email'::text, 'whatsapp'::text])))
  constraint points_reglages_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint points_reglages_conservation_jours_check CHECK (((conservation_jours >= 30) AND (conservation_jours <= 3650)))
  constraint points_reglages_contenu_check CHECK ((contenu = ANY (ARRAY['complet'::text, 'signal'::text])))
  constraint points_reglages_de_l_organisation CHECK (((user_id IS NULL) OR ((donnees_sante IS NULL) AND (conservation_jours IS NULL))))
  constraint points_reglages_delais_horizon_check CHECK (((delais_horizon >= 0) AND (delais_horizon <= 60)))
  constraint points_reglages_heure_check CHECK (((heure IS NULL) OR (EXTRACT(second FROM heure) = (0)::numeric)))
  constraint points_reglages_jours_check CHECK (((jours IS NULL) OR (((cardinality(jours) >= 1) AND (cardinality(jours) <= 7)) AND (jours <@ '{1,2,3,4,5,6,7}'::smallint[]))))
  constraint points_reglages_pkey PRIMARY KEY (id)
  constraint points_reglages_si_vide_check CHECK ((si_vide = ANY (ARRAY['rien'::text, 'court'::text])))
  constraint points_reglages_territoire_fkey FOREIGN KEY (territoire) REFERENCES territoires(code)
  constraint points_reglages_une_fois UNIQUE NULLS NOT DISTINCT (client_id, user_id)
  constraint points_reglages_user_id_client_id_fkey FOREIGN KEY (user_id, client_id) REFERENCES comptes(user_id, client_id) ON DELETE CASCADE
  policy "chacun change son reglage, gerants et admins tous" UPDATE to authenticated using ((((user_id = ( SELECT auth.uid() AS uid)) AND (client_id IN ( SELECT private.mes_clients() AS mes_clients))) OR private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))) with check ((((user_id = ( SELECT auth.uid() AS uid)) AND (client_id IN ( SELECT private.mes_clients() AS mes_clients))) OR private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])))
  policy "chacun pose son reglage, gerants et admins tous" INSERT to authenticated using () with check ((((user_id = ( SELECT auth.uid() AS uid)) AND (client_id IN ( SELECT private.mes_clients() AS mes_clients))) OR private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])))
  policy "chacun retire son reglage, gerants et admins tous" DELETE to authenticated using ((((user_id = ( SELECT auth.uid() AS uid)) AND (client_id IN ( SELECT private.mes_clients() AS mes_clients))) OR private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))) with check ()
  policy "on lit les reglages qui nous concernent" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND ((user_id IS NULL) OR (user_id = ( SELECT auth.uid() AS uid)) OR private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])))) with check ()
  CREATE TRIGGER points_reglages_garder BEFORE INSERT OR UPDATE ON public.points_reglages FOR EACH ROW EXECUTE FUNCTION private.point_garder_reglage()
  CREATE TRIGGER points_reglages_horaire_retire AFTER DELETE ON public.points_reglages FOR EACH ROW EXECUTE FUNCTION private.point_horaire_retire()
  CREATE TRIGGER points_reglages_tracer AFTER INSERT OR DELETE OR UPDATE ON public.points_reglages FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le', 'maj_par', 'horaire_depuis')
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.points_sections
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  module text not null
  jour date not null
  destinataire uuid
  role text
  equipe_id uuid
  entite_id uuid
  titre text not null
  ordre smallint not null default 100
  sante boolean not null default false
  incomplete boolean not null default false
  donnees_du timestamp with time zone
  nb_items smallint not null default 0
  depose_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint points_sections_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id) ON DELETE CASCADE
  constraint points_sections_client_id_equipe_id_fkey FOREIGN KEY (client_id, equipe_id) REFERENCES equipes(client_id, id) ON DELETE CASCADE
  constraint points_sections_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint points_sections_client_id_id_key UNIQUE (client_id, id)
  constraint points_sections_destinataire_client_id_fkey FOREIGN KEY (destinataire, client_id) REFERENCES comptes(user_id, client_id) ON DELETE CASCADE
  constraint points_sections_module_check CHECK ((module ~ '^[a-z][a-z_]{1,29}$'::text))
  constraint points_sections_ordre_check CHECK (((ordre >= 0) AND (ordre <= 999)))
  constraint points_sections_pkey PRIMARY KEY (id)
  constraint points_sections_role_check CHECK ((role = ANY (ARRAY['gerant'::text, 'admin'::text, 'valideur'::text, 'collaborateur'::text, 'lecteur'::text])))
  constraint points_sections_titre_check CHECK ((((char_length(btrim(titre)) >= 1) AND (char_length(btrim(titre)) <= 120)) AND (titre !~ '[[:cntrl:]]'::text)))
  constraint points_sections_une_cible CHECK ((num_nonnulls(destinataire, role, equipe_id) = 1))
  constraint points_sections_une_fois UNIQUE NULLS NOT DISTINCT (client_id, module, jour, destinataire, role, equipe_id, entite_id, titre)
  policy "on voit les sections qui nous sont adressees" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (private.a_un_role(client_id, ARRAY['gerant'::text]) OR private.point_adressee(( SELECT auth.uid() AS uid), client_id, destinataire, role, equipe_id, entite_id)))) with check ()
  CREATE TRIGGER points_sections_tracer AFTER INSERT OR DELETE OR UPDATE ON public.points_sections FOR EACH ROW EXECUTE FUNCTION private.tracer('+module', '+jour', '+destinataire', '+role', '+equipe_id', '+entite_id', '+sante', '+incomplete', '+nb_items', '+maj_le')
  grants authenticated: SELECT

-- ═══ TABLE public.politiques
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid
  module text not null
  type_action text not null
  libelle text not null
  plafond_operation numeric(14,2)
  plafond_mensuel numeric(14,2)
  nombre_mensuel integer
  debut timestamp with time zone not null default now()
  fin timestamp with time zone not null
  fuseau text not null default 'Europe/Paris'::text
  statut text not null default 'a_valider'::text
  demande_id uuid
  cree_par uuid
  cree_le timestamp with time zone not null default now()
  active_le timestamp with time zone
  revoquee_le timestamp with time zone
  revoquee_par uuid
  motif_revocation text
  constraint politiques_bornee CHECK (((plafond_operation IS NOT NULL) OR (nombre_mensuel IS NOT NULL)))
  constraint politiques_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id)
  constraint politiques_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint politiques_client_id_id_key UNIQUE (client_id, id)
  constraint politiques_libelle_check CHECK (((char_length(btrim(libelle)) >= 1) AND (char_length(btrim(libelle)) <= 200)))
  constraint politiques_module_check CHECK ((module ~ '^[a-z][a-z_]{1,29}$'::text))
  constraint politiques_motif_revocation_check CHECK ((char_length(motif_revocation) <= 500))
  constraint politiques_nombre_mensuel_check CHECK (((nombre_mensuel IS NULL) OR (nombre_mensuel > 0)))
  constraint politiques_periode CHECK (((fin > debut) AND (fin <= (debut + '366 days'::interval))))
  constraint politiques_pkey PRIMARY KEY (id)
  constraint politiques_plafond_mensuel_check CHECK (((plafond_mensuel IS NULL) OR (plafond_mensuel > (0)::numeric)))
  constraint politiques_plafond_operation_check CHECK (((plafond_operation IS NULL) OR (plafond_operation > (0)::numeric)))
  constraint politiques_plafonds CHECK (((plafond_mensuel IS NULL) OR (plafond_operation IS NULL) OR (plafond_mensuel >= plafond_operation)))
  constraint politiques_statut_check CHECK ((statut = ANY (ARRAY['a_valider'::text, 'active'::text, 'refusee'::text, 'revoquee'::text])))
  constraint politiques_type_action_check CHECK ((((char_length(type_action) >= 1) AND (char_length(type_action) <= 80)) AND (type_action <> 'politique.activer'::text)))
  policy "gerants et admins proposent un accord permanent" INSERT to authenticated using () with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))
  policy "membres lisent les accords permanents" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER politiques_deposer_activation AFTER INSERT ON public.politiques FOR EACH ROW EXECUTE FUNCTION private.deposer_activation()
  CREATE TRIGGER politiques_fuseau BEFORE INSERT OR UPDATE OF fuseau ON public.politiques FOR EACH ROW EXECUTE FUNCTION private.verifier_fuseau()
  CREATE TRIGGER politiques_garder BEFORE UPDATE ON public.politiques FOR EACH ROW EXECUTE FUNCTION private.garder_politique()
  CREATE TRIGGER politiques_preparer BEFORE INSERT ON public.politiques FOR EACH ROW EXECUTE FUNCTION private.preparer_politique()
  CREATE TRIGGER politiques_tracer AFTER INSERT OR UPDATE ON public.politiques FOR EACH ROW EXECUTE FUNCTION private.tracer()
  grants authenticated: INSERT,SELECT

-- ═══ TABLE public.receptions
  id bigint not null
  client_id uuid not null
  entite_id uuid
  module text
  canal text not null
  boite text not null
  identifiant_externe text not null
  de_adresse text
  de_empreinte text
  de_nom text
  sujet text
  corps text
  corps_html text
  pieces jsonb not null default '[]'::jsonb
  detail jsonb not null default '{}'::jsonb
  en_reponse_a uuid
  fil text
  langue text
  statut text not null default 'nouvelle'::text
  traite_par uuid
  recu_le timestamp with time zone not null default now()
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint receptions_canal_check CHECK ((canal = ANY (ARRAY['email'::text, 'whatsapp'::text, 'sms'::text, 'formulaire'::text])))
  constraint receptions_client_id_canal_identifiant_externe_key UNIQUE (client_id, canal, identifiant_externe)
  constraint receptions_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint receptions_en_reponse_a_fkey FOREIGN KEY (en_reponse_a) REFERENCES envois(id) ON DELETE SET NULL
  constraint receptions_pkey PRIMARY KEY (id)
  constraint receptions_statut_check CHECK ((statut = ANY (ARRAY['nouvelle'::text, 'lue'::text, 'traitee'::text, 'ignoree'::text, 'indesirable'::text])))
  policy "on voit les réceptions de son périmètre" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND private.perimetre_couvre(( SELECT auth.uid() AS uid), client_id, entite_id))) with check ()

  grants authenticated: SELECT

-- ═══ TABLE public.reglages_envois
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  module text
  mode text
  essai_adresse text
  plages jsonb
  feries boolean
  delai_min interval
  plafond_destinataire_jour integer
  plafond_jour integer
  fenetre_doublon interval
  canaux text[]
  pause_reponse interval
  pause_sensible interval
  sante boolean
  maj_le timestamp with time zone not null default now()
  maj_par uuid
  constraint reglages_envois_canaux_check CHECK ((canaux <@ ARRAY['email'::text, 'whatsapp'::text, 'sms'::text, 'lre'::text, 'appel'::text]))
  constraint reglages_envois_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint reglages_envois_delai_min_check CHECK (((delai_min >= '00:00:00'::interval) AND (delai_min <= '90 days'::interval)))
  constraint reglages_envois_essai_adresse_check CHECK ((char_length(essai_adresse) <= 254))
  constraint reglages_envois_fenetre_doublon_check CHECK (((fenetre_doublon >= '00:00:00'::interval) AND (fenetre_doublon <= '365 days'::interval)))
  constraint reglages_envois_mode_check CHECK ((mode = ANY (ARRAY['coupe'::text, 'essai'::text, 'reel'::text])))
  constraint reglages_envois_module_check CHECK ((module ~ '^[a-z][a-z_]{1,29}$'::text))
  constraint reglages_envois_pause_reponse_check CHECK (((pause_reponse >= '00:00:00'::interval) AND (pause_reponse <= '365 days'::interval)))
  constraint reglages_envois_pause_sensible_check CHECK (((pause_sensible >= '00:00:00'::interval) AND (pause_sensible <= '365 days'::interval)))
  constraint reglages_envois_pkey PRIMARY KEY (id)
  constraint reglages_envois_plafond_destinataire_jour_check CHECK (((plafond_destinataire_jour >= 1) AND (plafond_destinataire_jour <= 1000)))
  constraint reglages_envois_plafond_jour_check CHECK (((plafond_jour >= 1) AND (plafond_jour <= 1000000)))
  constraint reglages_envois_reel_par_module CHECK (((module IS NOT NULL) OR (mode IS DISTINCT FROM 'reel'::text)))
  constraint reglages_envois_une_ligne UNIQUE NULLS NOT DISTINCT (client_id, module)
  policy "gerants et admins changent les reglages d'envoi" UPDATE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))
  policy "gerants et admins posent les reglages d'envoi" INSERT to authenticated using () with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))
  policy "gerants et admins retirent un reglage d'envoi" DELETE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check ()
  policy "membres lisent les reglages d'envoi" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER reglages_envois_preparer BEFORE INSERT OR UPDATE ON public.reglages_envois FOR EACH ROW EXECUTE FUNCTION private.preparer_reglages_envois()
  CREATE TRIGGER reglages_envois_tracer AFTER INSERT OR DELETE OR UPDATE ON public.reglages_envois FOR EACH ROW EXECUTE FUNCTION private.tracer('essai_adresse', 'maj_le', 'maj_par')
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.regles_delais
  code text not null
  version smallint not null default 1
  libelle text not null
  quantite integer not null
  unite text not null
  mode text not null default 'calendaires'::text
  proroge boolean not null default false
  source_texte text not null
  source_url text
  en_vigueur_du date not null default '1900-01-01'::date
  en_vigueur_au date
  cree_le timestamp with time zone not null default now()
  constraint regles_delais_code_check CHECK ((code ~ '^[a-z][a-z0-9_.]{2,80}$'::text))
  constraint regles_delais_libelle_check CHECK (((char_length(libelle) >= 3) AND (char_length(libelle) <= 200)))
  constraint regles_delais_mode_check CHECK ((mode = ANY (ARRAY['calendaires'::text, 'ouvres'::text, 'ouvrables'::text, 'francs'::text])))
  constraint regles_delais_mode_des_jours CHECK (((unite = 'jours'::text) OR (mode = ANY (ARRAY['calendaires'::text, 'francs'::text]))))
  constraint regles_delais_periode CHECK (((en_vigueur_au IS NULL) OR (en_vigueur_au >= en_vigueur_du)))
  constraint regles_delais_pkey PRIMARY KEY (code, version)
  constraint regles_delais_source_texte_check CHECK (((char_length(source_texte) >= 3) AND (char_length(source_texte) <= 400)))
  constraint regles_delais_source_url_check CHECK ((source_url ~ '^https://'::text))
  constraint regles_delais_unite_check CHECK ((unite = ANY (ARRAY['jours'::text, 'mois'::text, 'ans'::text])))
  constraint regles_delais_version_check CHECK ((version >= 1))
  policy "les regles se lisent par tous" SELECT to authenticated using (true) with check ()

  grants authenticated: SELECT

-- ═══ TABLE public.regles_validation
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid
  module text not null
  montant_min numeric(14,2) not null default 0
  montant_max numeric(14,2)
  approbations_requises smallint not null default 1
  roles_autorises text[] not null default ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]
  actif boolean not null default true
  cree_le timestamp with time zone not null default now()
  type_action text
  equipe_id uuid
  exige_commentaire boolean not null default false
  exige_piece boolean not null default false
  exige_motif boolean not null default true
  constraint regles_validation_approbations_requises_check CHECK (((approbations_requises >= 1) AND (approbations_requises <= 3)))
  constraint regles_validation_check CHECK (((montant_max IS NULL) OR (montant_max > montant_min)))
  constraint regles_validation_client_id_entite_id_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id) ON DELETE CASCADE
  constraint regles_validation_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint regles_validation_equipe_fkey FOREIGN KEY (client_id, equipe_id) REFERENCES equipes(client_id, id) ON DELETE RESTRICT
  constraint regles_validation_module_check CHECK ((module ~ '^[a-z][a-z_]{1,29}$'::text))
  constraint regles_validation_montant_min_check CHECK ((montant_min >= (0)::numeric))
  constraint regles_validation_pkey PRIMARY KEY (id)
  constraint regles_validation_roles_autorises_check CHECK (((cardinality(roles_autorises) >= 1) AND (roles_autorises <@ ARRAY['gerant'::text, 'admin'::text, 'valideur'::text])))
  constraint regles_validation_type_action_check CHECK (((type_action IS NULL) OR ((char_length(type_action) >= 1) AND (char_length(type_action) <= 80))))
  policy "gerants et admins creent les regles" INSERT to authenticated using () with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))
  policy "gerants et admins modifient les regles" UPDATE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))
  policy "gerants et admins retirent les regles" DELETE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check ()
  policy "membres lisent les regles" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER regles_validation_tracer AFTER INSERT OR DELETE OR UPDATE ON public.regles_validation FOR EACH ROW EXECUTE FUNCTION private.tracer()
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.releves
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  branchement_id uuid not null
  canal text not null
  cle text
  expediteur text
  recu_le timestamp with time zone not null default now()
  constraint releves_canal_check CHECK ((canal = ANY (ARRAY['depot'::text, 'courriel'::text, 'sftp'::text, 'passerelle'::text, 'api'::text, 'interface'::text])))
  constraint releves_cle_check CHECK (((char_length(cle) >= 1) AND (char_length(cle) <= 200)))
  constraint releves_client_id_branchement_id_fkey FOREIGN KEY (client_id, branchement_id) REFERENCES branchements(client_id, id) ON DELETE CASCADE
  constraint releves_client_id_id_key UNIQUE (client_id, id)
  constraint releves_expediteur_check CHECK ((char_length(expediteur) <= 320))
  constraint releves_pkey PRIMARY KEY (id)
  policy "on voit les releves des branchements qu'on voit" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (EXISTS ( SELECT 1
   FROM branchements b
  WHERE (b.id = releves.branchement_id))))) with check ()
  CREATE TRIGGER releves_tracer AFTER INSERT OR DELETE ON public.releves FOR EACH ROW EXECUTE FUNCTION private.tracer('+branchement_id', '+canal')
  grants authenticated: SELECT

-- ═══ TABLE public.suivis
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid
  module text not null
  objet_type text not null
  objet_id text not null
  attendu text not null
  nature text not null default 'reponse'::text
  type_piece text
  tiers jsonb not null
  tiers_nom text
  tiers_ref text
  depuis timestamp with time zone not null default now()
  echeance timestamp with time zone
  territoire text
  date_promise date
  date_promise_initiale date
  glissements smallint not null default 0
  plan jsonb not null default '{}'::jsonb
  relances smallint not null default 0
  derniere_relance_le timestamp with time zone
  prochaine_relance_le timestamp with time zone
  dernier_signe_le timestamp with time zone
  statut text not null default 'ouvert'::text
  issue text
  piece_id uuid
  ouvert_par uuid
  clos_par uuid
  cle_idempotence text
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  clos_le timestamp with time zone
  constraint suivis_attendu_check CHECK (((char_length(btrim(attendu)) >= 1) AND (char_length(btrim(attendu)) <= 200)))
  constraint suivis_cle_idempotence_check CHECK (((char_length(cle_idempotence) >= 1) AND (char_length(cle_idempotence) <= 200)))
  constraint suivis_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint suivis_client_id_id_key UNIQUE (client_id, id)
  constraint suivis_entite_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id)
  constraint suivis_glissements_check CHECK ((glissements >= 0))
  constraint suivis_glissements_datees CHECK (((glissements = 0) OR (date_promise_initiale IS NOT NULL)))
  constraint suivis_issue_check CHECK ((char_length(issue) <= 300))
  constraint suivis_module_check CHECK ((module ~ '^[a-z][a-z_]{1,29}$'::text))
  constraint suivis_nature_check CHECK ((nature = ANY (ARRAY['piece'::text, 'reponse'::text, 'paiement'::text, 'livraison'::text, 'signature'::text, 'autre'::text])))
  constraint suivis_objet_id_check CHECK (((char_length(objet_id) >= 1) AND (char_length(objet_id) <= 120)))
  constraint suivis_objet_type_check CHECK ((objet_type ~ '^[a-z][a-z0-9_]{1,39}$'::text))
  constraint suivis_piece_fkey FOREIGN KEY (client_id, piece_id) REFERENCES pieces(client_id, id) ON DELETE SET NULL (piece_id)
  constraint suivis_piece_typee CHECK (((type_piece IS NULL) OR (nature = 'piece'::text)))
  constraint suivis_pkey PRIMARY KEY (id)
  constraint suivis_plan_check CHECK ((jsonb_typeof(plan) = 'object'::text))
  constraint suivis_relances_check CHECK ((relances >= 0))
  constraint suivis_statut_check CHECK ((statut = ANY (ARRAY['ouvert'::text, 'recu'::text, 'abandonne'::text, 'annule'::text, 'expire'::text])))
  constraint suivis_territoire_fkey FOREIGN KEY (territoire) REFERENCES territoires(code)
  constraint suivis_tiers_check CHECK ((jsonb_typeof(tiers) = 'object'::text))
  constraint suivis_tiers_nom_check CHECK ((char_length(tiers_nom) <= 200))
  constraint suivis_tiers_ref_check CHECK ((char_length(tiers_ref) <= 200))
  constraint suivis_type_piece_check CHECK ((type_piece ~ '^[a-z][a-z0-9_]{1,59}$'::text))
  policy "on voit les suivis des objets qu'on voit" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND private.perimetre_couvre(( SELECT auth.uid() AS uid), client_id, entite_id) AND private.voit_objet(client_id, objet_type, objet_id))) with check ()
  CREATE TRIGGER suivis_garder BEFORE INSERT OR DELETE OR UPDATE ON public.suivis FOR EACH ROW EXECUTE FUNCTION private.garder_suivi()
  CREATE TRIGGER suivis_tracer AFTER INSERT OR DELETE OR UPDATE ON public.suivis FOR EACH ROW EXECUTE FUNCTION private.tracer('+module', '+objet_type', '+objet_id', '+nature', '+type_piece', '+statut', '+glissements', '+relances', '+date_promise', '+echeance', '+piece_id', '+territoire')
  grants authenticated: SELECT

-- ═══ TABLE public.suivis_evenements
  id bigint not null
  client_id uuid not null
  suivi_id uuid not null
  type text not null
  survenu_le timestamp with time zone not null default now()
  date_promise date
  envoi_id uuid
  detail jsonb not null default '{}'::jsonb
  par uuid
  constraint suivis_evenements_pkey PRIMARY KEY (id)
  constraint suivis_evenements_suivi_fkey FOREIGN KEY (client_id, suivi_id) REFERENCES suivis(client_id, id) ON DELETE CASCADE
  constraint suivis_evenements_type_check CHECK ((type = ANY (ARRAY['ouverture'::text, 'promesse'::text, 'glissement'::text, 'relance'::text, 'signe'::text, 'cloture'::text, 'expiration'::text])))
  policy "on voit l'histoire des suivis qu'on voit" SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM suivis s
  WHERE (s.id = suivis_evenements.suivi_id)))) with check ()
  CREATE TRIGGER suivis_evenements_garder BEFORE INSERT OR DELETE OR UPDATE ON public.suivis_evenements FOR EACH ROW EXECUTE FUNCTION private.garder_par_les_portes()
  CREATE TRIGGER suivis_evenements_tracer AFTER INSERT ON public.suivis_evenements FOR EACH ROW EXECUTE FUNCTION private.tracer('+suivi_id', '+type', '+date_promise', '+envoi_id')
  grants authenticated: SELECT

-- ═══ TABLE public.territoires
  code text not null
  libelle text not null
  fuseau text not null
  iso text[] not null default '{}'::text[]
  complet boolean not null default true
  constraint territoires_code_check CHECK ((code ~ '^[a-z][a-z-]{2,40}$'::text))
  constraint territoires_pkey PRIMARY KEY (code)
  policy "le calendrier se lit par tous" SELECT to authenticated using (true) with check ()

  grants authenticated: SELECT

-- ═══ TABLE public.travaux
  id bigint not null
  client_id uuid
  module text not null
  genre text not null
  charge jsonb not null default '{}'::jsonb
  cle text
  etat text not null default 'a_faire'::text
  priorite smallint not null default 0
  essais smallint not null default 0
  essais_max smallint not null default 5
  prochain_le timestamp with time zone not null default now()
  verrou_jusqu_au timestamp with time zone
  pris_par text
  resultat jsonb
  erreur text
  cree_le timestamp with time zone not null default now()
  fini_le timestamp with time zone
  constraint travaux_cle_check CHECK ((char_length(cle) <= 200))
  constraint travaux_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint travaux_erreur_check CHECK ((char_length(erreur) <= 2000))
  constraint travaux_essais_max_check CHECK (((essais_max >= 1) AND (essais_max <= 20)))
  constraint travaux_etat_check CHECK ((etat = ANY (ARRAY['a_faire'::text, 'en_cours'::text, 'fait'::text, 'echec'::text])))
  constraint travaux_genre_check CHECK ((genre ~ '^[a-z][a-z0-9_.]{2,80}$'::text))
  constraint travaux_module_check CHECK ((module ~ '^[a-z][a-z_]{1,29}$'::text))
  constraint travaux_pkey PRIMARY KEY (id)
  constraint travaux_pris_par_check CHECK ((char_length(pris_par) <= 120))


  grants authenticated: aucun


-- ══════════════════ PORTES PUBLIQUES COMMUNES (hors préfixes de module) — avec leurs droits ══════════════════

-- ═══ PORTE public.acquitter_instantane auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.acquitter_instantane(p_instantane uuid, p_verdict text, p_raison text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.acquitter_instantane(p_instantane, p_verdict, p_raison)
$function$


-- ═══ PORTE public.ajouter_jours auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.ajouter_jours(p_depart date, p_nombre integer, p_mode text, p_territoire text DEFAULT 'metropole'::text)
 RETURNS date
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v date := p_depart;
  v_reste integer := abs(p_nombre);
  v_pas integer := case when p_nombre < 0 then -1 else 1 end;
begin
  if p_depart is null or p_nombre is null then
    raise exception 'Un départ et un nombre de jours sont nécessaires.' using errcode = '22023';
  end if;
  if p_mode = 'calendaires' then
    return p_depart + p_nombre;
  elsif p_mode = 'francs' then
    return p_depart + p_nombre + v_pas;
  elsif p_mode not in ('ouvres', 'ouvrables') then
    raise exception 'Mode de décompte inconnu : %.', coalesce(p_mode, 'vide') using errcode = '22023';
  end if;
  while v_reste > 0 loop
    v := v + v_pas;
    if public.jour_ouvre(v, p_territoire, p_mode = 'ouvrables') then
      v_reste := v_reste - 1;
    end if;
  end loop;
  return v;
end $function$


-- ═══ PORTE public.ajouter_mois auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.ajouter_mois(p_depart date, p_nombre integer)
 RETURNS date
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select (p_depart + make_interval(months => p_nombre))::date
$function$


-- ═══ PORTE public.annuaire auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.annuaire(p_client uuid)
 RETURNS TABLE(user_id uuid, nom text, email text, role text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select c.user_id,
         coalesce(nullif(u.raw_user_meta_data ->> 'nom', ''), nullif(u.raw_user_meta_data ->> 'full_name', ''),
                  nullif(u.raw_user_meta_data ->> 'name', ''), initcap(replace(split_part(u.email, '@', 1), '.', ' '))) as nom,
         u.email::text, c.role
  from public.comptes c join auth.users u on u.id = c.user_id
  where c.client_id = p_client
    and (p_client in (select private.mes_clients())
         or coalesce(nullif(current_setting('role', true), 'none'), session_user::text) in ('service_role', 'postgres'))
  order by 2
$function$


-- ═══ PORTE public.annuler_delai auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.annuler_delai(p_delai uuid, p_motif text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.clore_delai(p_delai, 'annule', p_motif)
$function$


-- ═══ PORTE public.annuler_envoi auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.annuler_envoi(p_envoi uuid, p_motif text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.annuler_envoi(p_envoi, p_motif) $function$


-- ═══ PORTE public.apercu_gabarit auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.apercu_gabarit(p_client uuid, p_module text, p_code text, p_variables jsonb DEFAULT '{}'::jsonb, p_langue text DEFAULT 'fr'::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select private.apercu_gabarit(p_client, p_module, p_code, p_variables, p_langue)
$function$


-- ═══ PORTE public.apercu_point auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.apercu_point(p_client uuid, p_user uuid DEFAULT NULL::uuid, p_jour date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select private.apercu_point(p_client, p_user, p_jour)
$function$


-- ═══ PORTE public.arret_general_envois auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.arret_general_envois(p_arret boolean, p_motif text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.arret_general_envois(p_arret, p_motif) $function$


-- ═══ PORTE public.battre_ouvrier auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.battre_ouvrier(p_module text, p_genres text[], p_detail jsonb DEFAULT '{}'::jsonb, p_attendu interval DEFAULT '00:15:00'::interval)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r record; n integer := 0;
begin
  for r in
    select distinct t.client_id from public.travaux t
    where t.genre = any (p_genres) and t.client_id is not null
      and (t.etat in ('a_faire', 'en_cours') or t.fini_le > now() - interval '1 day')
  loop
    perform private.battre(r.client_id, p_module, p_detail, p_attendu);
    n := n + 1;
  end loop;
  return n;
end $function$


-- ═══ PORTE public.brancher auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.brancher(p_client uuid, p_module text, p_logiciel text, p_voie text, p_libelle text, p_entite uuid DEFAULT NULL::uuid, p_fuseau text DEFAULT NULL::text, p_jeux text[] DEFAULT NULL::text[])
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.brancher(p_client, p_module, p_logiciel, p_voie, p_libelle, p_entite, p_fuseau, p_jeux)
$function$


-- ═══ PORTE public.capacite_de auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.capacite_de(p_client uuid, p_domaine text, p_module text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce((
    select case when (b.capacites -> p_domaine ->> 'lecture')::boolean is false then 'non_lu'
                else coalesce(b.capacites -> p_domaine ->> 'tenue', 'inconnu') end
    from public.branchements b
    where b.client_id = p_client and b.statut = 'actif' and (p_module is null or b.module = p_module)
      and b.capacites ? p_domaine
    order by ((b.capacites -> p_domaine ->> 'lecture')::boolean is false),
             case coalesce(b.capacites -> p_domaine ->> 'tenue', 'inconnu')
               when 'tenu' then 1 when 'partiel' then 2 when 'non_tenu' then 3 else 4 end
    limit 1), 'inconnu')
$function$


-- ═══ PORTE public.classer_instantane auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.classer_instantane(p_instantane uuid, p_jeu text, p_par text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.classer_instantane(p_instantane, p_jeu, p_par)
$function$


-- ═══ PORTE public.clore_suivi auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.clore_suivi(p_suivi uuid, p_issue text, p_piece uuid DEFAULT NULL::uuid, p_detail text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.clore_suivi(p_suivi, p_issue, p_piece, p_detail) $function$


-- ═══ PORTE public.commencer_envoi auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.commencer_envoi(p_envoi uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.commencer_envoi(p_envoi) $function$


-- ═══ PORTE public.commencer_lecture auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.commencer_lecture(p_piece uuid)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.commencer_lecture(p_piece)
$function$


-- ═══ PORTE public.commencer_releve auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.commencer_releve(p_instantane uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.commencer_releve(p_instantane)
$function$


-- ═══ PORTE public.confirmer_envoi auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.confirmer_envoi(p_envoi uuid, p_reference text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.confirmer_envoi(p_envoi, p_reference) $function$


-- ═══ PORTE public.consommation_ia_jour auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.consommation_ia_jour(p_client uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select private.consommation_ia_jour(p_client) $function$


-- ═══ PORTE public.construire_rapport_du_mois auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.construire_rapport_du_mois(p_client uuid, p_mois date)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.construire_rapport_du_mois(p_client, p_mois)
$function$


-- ═══ PORTE public.declarer_jeu auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.declarer_jeu(p_branchement uuid, p_code text, p_declaration jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.declarer_jeu(p_branchement, p_code, p_declaration)
$function$


-- ═══ PORTE public.deposer_lignes auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.deposer_lignes(p_instantane uuid, p_lignes jsonb)
 RETURNS integer
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.deposer_lignes(p_instantane, p_lignes)
$function$


-- ═══ PORTE public.deposer_reception auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.deposer_reception(p_client uuid, p_canal text, p_boite text, p_identifiant text, p_de text DEFAULT NULL::text, p_de_nom text DEFAULT NULL::text, p_sujet text DEFAULT NULL::text, p_corps text DEFAULT NULL::text, p_corps_html text DEFAULT NULL::text, p_pieces jsonb DEFAULT '[]'::jsonb, p_detail jsonb DEFAULT '{}'::jsonb, p_recu_le timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.deposer_reception(p_client, p_canal, p_boite, p_identifiant, p_de, p_de_nom, p_sujet, p_corps, p_corps_html, p_pieces, p_detail, p_recu_le)
$function$


-- ═══ PORTE public.deposer_section auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.deposer_section(p_client uuid, p_module text, p_jour date, p_destinataire uuid, p_role text, p_titre text, p_items jsonb, p_entite uuid DEFAULT NULL::uuid, p_equipe uuid DEFAULT NULL::uuid, p_sante boolean DEFAULT false, p_donnees_du timestamp with time zone DEFAULT NULL::timestamp with time zone, p_incomplete boolean DEFAULT false, p_ordre integer DEFAULT 100)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.deposer_section(p_client, p_module, p_jour, p_destinataire, p_role, p_titre, p_items, p_entite,
                                 p_equipe, p_sante, p_donnees_du, p_incomplete, p_ordre)
$function$


-- ═══ PORTE public.deposer_travail auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.deposer_travail(p_client uuid, p_module text, p_genre text, p_charge jsonb DEFAULT '{}'::jsonb, p_cle text DEFAULT NULL::text, p_priorite smallint DEFAULT 0)
 RETURNS bigint
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.deposer_travail(p_client, p_module, p_genre, p_charge, p_cle, p_priorite)
$function$


-- ═══ PORTE public.echeance_de auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.echeance_de(p_regle text, p_depart date, p_territoire text DEFAULT 'metropole'::text, p_augmentation_mois integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  r public.regles_delais;
  v_augmentation integer := coalesce(p_augmentation_mois, 0);
  v_mois integer;
  v_brute date;
  v_finale date;
  v_deux_temps date;
  v_finale_deux_temps date;
  v_retenue date;
  v_a_confirmer boolean := false;
  v_duree text;
  v_detail text;
begin
  if v_augmentation < 0 or v_augmentation > 24 then
    raise exception 'Une augmentation de distance se compte en mois, de 0 à 24.' using errcode = '22023';
  end if;
  select * into r from public.regles_delais g
  where g.code = p_regle and g.en_vigueur_du <= p_depart and (g.en_vigueur_au is null or p_depart <= g.en_vigueur_au)
  order by g.version desc limit 1;
  if not found then
    raise exception 'Aucune règle « % » en vigueur le %.', p_regle, to_char(p_depart, 'DD/MM/YYYY') using errcode = 'P0002';
  end if;
  if v_augmentation > 0 and r.quantite < 0 then
    raise exception 'Une augmentation de distance ne vaut que pour un délai qui court vers l''avant.' using errcode = '22023';
  end if;

  if r.unite in ('mois', 'ans') then
    v_mois := case r.unite when 'mois' then r.quantite else 12 * r.quantite end;
    -- D'un bloc : la durée augmentée (art. 641, al. 2).
    v_brute := public.ajouter_mois(p_depart, v_mois + v_augmentation);
    -- En deux temps : la durée, puis l'augmentation ; en fin de mois, elle peut tomber plus tôt.
    if v_augmentation > 0 then
      v_deux_temps := public.ajouter_mois(public.ajouter_mois(p_depart, v_mois), v_augmentation);
    end if;
    if r.mode = 'francs' then
      v_brute := v_brute + case when r.quantite < 0 then -1 else 1 end;
      v_deux_temps := v_deux_temps + 1;
    end if;
  else
    -- Les mois d'abord, puis les jours (art. 641, al. 3).
    v_brute := public.ajouter_jours(public.ajouter_mois(p_depart, v_augmentation), r.quantite, r.mode, p_territoire);
  end if;

  v_finale := case when r.proroge then public.proroger(v_brute, p_territoire) else v_brute end;
  v_retenue := v_finale;
  if v_deux_temps is not null and v_deux_temps <> v_brute then
    v_finale_deux_temps := case when r.proroge then public.proroger(v_deux_temps, p_territoire) else v_deux_temps end;
    if v_finale_deux_temps <> v_finale then
      v_a_confirmer := true;
      v_retenue := least(v_finale, v_finale_deux_temps);
    end if;
  end if;

  v_duree := abs(r.quantite)::text || ' ' || case r.unite
    when 'mois' then 'mois'
    when 'ans' then case when abs(r.quantite) > 1 then 'ans' else 'an' end
    else case r.mode when 'ouvres' then 'jours ouvrés' when 'ouvrables' then 'jours ouvrables'
                     when 'francs' then 'jours francs' else 'jours' end end
    || case when r.unite <> 'jours' and r.mode = 'francs'
            then case when r.unite = 'ans' and abs(r.quantite) <= 1 then ' franc' else ' francs' end
            else '' end
    || case when v_augmentation > 0
            then case when abs(r.quantite) > 1 then ', augmentés de ' else ', augmenté de ' end
                 || v_augmentation || ' mois (délai de distance)'
            else '' end;
  v_detail := v_duree || case when r.quantite < 0 then ' avant le ' else ' à compter du ' end
    || to_char(p_depart, 'DD/MM/YYYY') || ' : ' || private.jour_en_toutes_lettres(v_brute)
    || case when v_finale <> v_brute
            then ', prorogé au ' || private.jour_en_toutes_lettres(v_finale) || ' (art. 642 du code de procédure civile)'
            else '' end || '.'
    || case when v_a_confirmer
            then ' Lecture en deux temps (la durée, puis l''augmentation) : ' || private.jour_en_toutes_lettres(v_finale_deux_temps)
                 || '. La plus proche est retenue, à confirmer.'
            else '' end;
  return jsonb_build_object('echeance', v_retenue, 'brute', v_brute, 'regle', r.code, 'version', r.version,
                            'libelle', r.libelle, 'source', r.source_texte, 'source_url', r.source_url,
                            'territoire', p_territoire, 'augmentation_mois', v_augmentation,
                            'lecture_d_un_bloc', v_finale, 'lecture_en_deux_temps', v_finale_deux_temps,
                            'a_confirmer', v_a_confirmer, 'detail', v_detail);
end $function$


-- ═══ PORTE public.echouer_envoi auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.echouer_envoi(p_envoi uuid, p_erreur text, p_definitif boolean DEFAULT false)
 RETURNS text
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.echouer_envoi(p_envoi, p_erreur, p_definitif) $function$


-- ═══ PORTE public.echouer_travail auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.echouer_travail(p_id bigint, p_erreur text, p_reprendre boolean DEFAULT true)
 RETURNS text
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.echouer_travail(p_id, p_erreur, p_reprendre)
$function$


-- ═══ PORTE public.effacer_donnees_client auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.effacer_donnees_client(p_client uuid, p_confirmation text, p_par text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.effacer_client(p_client, p_confirmation, p_par) $function$


-- ═══ PORTE public.effacer_objet auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.effacer_objet(p_client uuid, p_objet_type text, p_objet_id text, p_confirmation text, p_par text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.effacer_objet(p_client, p_objet_type, p_objet_id, p_confirmation, p_par)
$function$


-- ═══ PORTE public.enregistrer_lecture auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.enregistrer_lecture(p_piece uuid, p_resultat jsonb, p_version text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.enregistrer_lecture(p_piece, p_resultat, p_version)
$function$


-- ═══ PORTE public.enregistrer_mesure auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.enregistrer_mesure(p_client uuid, p_indicateur text, p_version integer, p_periode_type text, p_periode_debut date, p_valeur numeric, p_base numeric, p_mode text, p_numerateur numeric DEFAULT NULL::numeric, p_entite uuid DEFAULT NULL::uuid, p_objet_type text DEFAULT NULL::text, p_objet_id text DEFAULT NULL::text, p_objet_libelle text DEFAULT NULL::text, p_periode_fin date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.enregistrer_mesure(p_client, p_indicateur, p_version, p_periode_type, p_periode_debut, p_valeur, p_base,
                                    p_mode, p_numerateur, p_entite, p_objet_type, p_objet_id, p_objet_libelle, p_periode_fin)
$function$


-- ═══ PORTE public.exporter_donnees_client auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.exporter_donnees_client(p_client uuid, p_demandeur uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if not exists (select 1 from public.comptes c where c.client_id = p_client and c.user_id = p_demandeur and c.role = 'gerant') then
    raise exception 'Seul un gérant de l''organisation obtient l''export complet.' using errcode = '42501';
  end if;
  return private.exporter_client(p_client, p_demandeur);
end $function$


-- ═══ PORTE public.f_audit_trail auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.f_audit_trail()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_avant jsonb; v_apres jsonb; v_cle text;
begin
  if tg_op in ('UPDATE','DELETE') then v_avant := to_jsonb(old); end if;
  if tg_op in ('INSERT','UPDATE') then v_apres := to_jsonb(new); end if;
  v_cle := coalesce(v_apres->>'id', v_avant->>'id', v_apres->>'cle', v_avant->>'cle',
    (coalesce(v_apres->>'client_id', v_avant->>'client_id') || '/' || coalesce(v_apres->>'moteur', v_avant->>'moteur')));
  -- jamais de secret en clair dans l'audit
  if tg_table_name = 'parametres' and coalesce(v_apres->>'cle', v_avant->>'cle') ilike '%secret%' then
    if v_avant is not null then v_avant := jsonb_set(v_avant, '{valeur}', '"[EXPURGE]"'); end if;
    if v_apres is not null then v_apres := jsonb_set(v_apres, '{valeur}', '"[EXPURGE]"'); end if;
  end if;
  insert into public.audit_journal (table_cible, operation, cle_ligne, avant, apres)
  values (tg_table_name, tg_op, v_cle, v_avant, v_apres);
  return coalesce(new, old);
end $function$


-- ═══ PORTE public.finir_travail auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.finir_travail(p_id bigint, p_resultat jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.finir_travail(p_id, p_resultat)
$function$


-- ═══ PORTE public.jour_ferie auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.jour_ferie(p_jour date, p_territoire text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
begin
  perform private.verifier_calendrier(p_territoire, p_jour);
  return exists (select 1 from public.jours_feries f where f.territoire = p_territoire and f.jour = p_jour);
end $function$


-- ═══ PORTE public.jour_ouvre auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.jour_ouvre(p_jour date, p_territoire text, p_samedi_compte boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_isodow int := extract(isodow from p_jour)::int;
begin
  perform private.verifier_calendrier(p_territoire, p_jour);
  if v_isodow = 7 or (v_isodow = 6 and not p_samedi_compte) then
    return false;
  end if;
  return not exists (select 1 from public.jours_feries f where f.territoire = p_territoire and f.jour = p_jour);
end $function$


-- ═══ PORTE public.journaliser_module auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.journaliser_module(p_client uuid, p_module text, p_action text, p_objet_type text, p_objet_id text, p_donnees jsonb DEFAULT '{}'::jsonb, p_entite uuid DEFAULT NULL::uuid)
 RETURNS bigint
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.journaliser_module(p_client, p_module, p_action, p_objet_type, p_objet_id, p_donnees, p_entite)
$function$


-- ═══ PORTE public.lever_alerte_module auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.lever_alerte_module(p_client uuid, p_module text, p_niveau text, p_titre text, p_detail jsonb DEFAULT '{}'::jsonb, p_cle text DEFAULT NULL::text, p_pour_client boolean DEFAULT false, p_destinataire uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.lever_alerte_module(p_client, p_module, p_niveau, p_titre, p_detail, p_cle, p_pour_client, p_destinataire)
$function$


-- ═══ PORTE public.lever_opposition auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.lever_opposition(p_opposition uuid, p_motif text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.lever_opposition(p_opposition, p_motif) $function$


-- ═══ PORTE public.lire_parametre auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.lire_parametre(p_cle text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select private.lire_parametre(p_cle) $function$


-- ═══ PORTE public.lire_point auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.lire_point(p_point uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.lire_point(p_point)
$function$


-- ═══ PORTE public.marquer_envoi_manuel auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.marquer_envoi_manuel(p_envoi uuid, p_issue text, p_compte_rendu text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.marquer_envoi_manuel(p_envoi, p_issue, p_compte_rendu)
$function$


-- ═══ PORTE public.mes_clients auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.mes_clients()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select client_id from public.comptes where user_id = auth.uid()
$function$


-- ═══ PORTE public.mesurer_suivis auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.mesurer_suivis(p_client uuid, p_module text, p_du timestamp with time zone, p_au timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is not null
     and not exists (select 1 from public.comptes c where c.user_id = (select auth.uid()) and c.client_id = p_client) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  return private.mesurer_suivis(p_client, p_module, p_du, p_au);
end $function$


-- ═══ PORTE public.modifier_demande auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.modifier_demande(p_demande uuid, p_resume text DEFAULT NULL::text, p_montant numeric DEFAULT NULL::numeric, p_payload jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.modifier_demande(p_demande, p_resume, p_montant, p_payload)
$function$


-- ═══ PORTE public.noter_capacite auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.noter_capacite(p_branchement uuid, p_domaine text, p_capacite jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.noter_capacite(p_branchement, p_domaine, p_capacite)
$function$


-- ═══ PORTE public.noter_consentement auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.noter_consentement(p_client uuid, p_canal text, p_adresse text, p_source text, p_portee text DEFAULT 'transactionnel'::text, p_preuve text DEFAULT NULL::text, p_piece uuid DEFAULT NULL::uuid, p_module text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.noter_consentement(p_client, p_canal, p_adresse, p_source, p_portee, p_preuve, p_piece, p_module)
$function$


-- ═══ PORTE public.noter_opposition auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.noter_opposition(p_client uuid, p_type text, p_adresse text DEFAULT NULL::text, p_canal text DEFAULT NULL::text, p_ref text DEFAULT NULL::text, p_jusqu_au timestamp with time zone DEFAULT NULL::timestamp with time zone, p_motif text DEFAULT NULL::text, p_source text DEFAULT 'demande'::text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.noter_opposition(p_client, p_type, p_adresse, p_canal, p_ref, p_jusqu_au, p_motif, p_source)
$function$


-- ═══ PORTE public.noter_promesse auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.noter_promesse(p_suivi uuid, p_date date, p_source text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.noter_promesse(p_suivi, p_date, p_source) $function$


-- ═══ PORTE public.noter_remise auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.noter_remise(p_fournisseur text, p_reference text, p_evenement text, p_detail jsonb DEFAULT '{}'::jsonb, p_survenu_le timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.noter_remise(p_fournisseur, p_reference, p_evenement, p_detail, p_survenu_le)
$function$


-- ═══ PORTE public.noter_remise auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.noter_remise(p_fournisseur text, p_reference text, p_evenement text, p_detail jsonb, p_survenu_le timestamp with time zone, p_cle text)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.noter_remise(p_fournisseur, p_reference, p_evenement, p_detail, p_survenu_le, p_cle)
$function$


-- ═══ PORTE public.noter_signe auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.noter_signe(p_suivi uuid, p_detail text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.noter_signe(p_suivi, p_detail) $function$


-- ═══ PORTE public.notifier_delai auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.notifier_delai(p_delai uuid, p_echeance date, p_source text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.notifier_delai(p_delai, p_echeance, p_source)
$function$


-- ═══ PORTE public.ouvrir_suivi auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.ouvrir_suivi(p_client uuid, p_module text, p_objet_type text, p_objet_id text, p_tiers jsonb, p_attendu text, p_depuis timestamp with time zone DEFAULT now(), p_plan jsonb DEFAULT '{}'::jsonb, p_echeance timestamp with time zone DEFAULT NULL::timestamp with time zone, p_nature text DEFAULT 'reponse'::text, p_type_piece text DEFAULT NULL::text, p_territoire text DEFAULT NULL::text, p_entite uuid DEFAULT NULL::uuid, p_cle text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.ouvrir_suivi(p_client, p_module, p_objet_type, p_objet_id, p_tiers, p_attendu, p_depuis, p_plan, p_echeance,
                              p_nature, p_type_piece, p_territoire, p_entite, p_cle)
$function$


-- ═══ PORTE public.piece_a_lire auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.piece_a_lire(p_piece uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select private.piece_a_lire(p_piece) $function$


-- ═══ PORTE public.poser_delai auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.poser_delai(p_client uuid, p_module text, p_objet_type text, p_objet_id text, p_libelle text, p_regle text, p_depart date, p_territoire text, p_rappels integer[] DEFAULT '{7,2,0}'::integer[], p_responsable uuid DEFAULT NULL::uuid, p_action text DEFAULT NULL::text, p_cle text DEFAULT NULL::text, p_augmentation_mois integer DEFAULT 0)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.poser_delai(p_client, p_module, p_objet_type, p_objet_id, p_libelle, p_regle, p_depart, p_territoire,
                             p_rappels, p_responsable, p_action, p_cle, p_augmentation_mois)
$function$


-- ═══ PORTE public.poser_delai_date auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.poser_delai_date(p_client uuid, p_module text, p_objet_type text, p_objet_id text, p_libelle text, p_echeance date, p_source text, p_territoire text, p_rappels integer[] DEFAULT '{7,2,0}'::integer[], p_responsable uuid DEFAULT NULL::uuid, p_action text DEFAULT NULL::text, p_cle text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.poser_delai_date(p_client, p_module, p_objet_type, p_objet_id, p_libelle, p_echeance, p_source,
                                  p_territoire, p_rappels, p_responsable, p_action, p_cle)
$function$


-- ═══ PORTE public.prendre_travaux auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.prendre_travaux(p_genres text[], p_nombre integer DEFAULT 5, p_bail interval DEFAULT '00:10:00'::interval, p_ouvrier text DEFAULT NULL::text)
 RETURNS SETOF travaux
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select * from private.prendre_travaux(p_genres, p_nombre, p_bail, p_ouvrier)
$function$


-- ═══ PORTE public.preparer_effacement auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.preparer_effacement(p_client uuid, p_objet_type text DEFAULT NULL::text, p_objet_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.preparer_effacement(p_client, p_objet_type, p_objet_id)
$function$


-- ═══ PORTE public.preparer_envoi auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.preparer_envoi(p_client uuid, p_module text, p_objet_type text, p_objet_id text, p_canal text, p_destinataire jsonb, p_gabarit text DEFAULT NULL::text, p_variables jsonb DEFAULT '{}'::jsonb, p_sujet text DEFAULT NULL::text, p_corps text DEFAULT NULL::text, p_pieces uuid[] DEFAULT NULL::uuid[], p_cle_idempotence text DEFAULT NULL::text, p_entite uuid DEFAULT NULL::uuid, p_transactionnel boolean DEFAULT false, p_donnees_sante boolean DEFAULT false, p_echeance timestamp with time zone DEFAULT NULL::timestamp with time zone, p_options jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.preparer_envoi(p_client, p_module, p_objet_type, p_objet_id, p_canal, p_destinataire, p_gabarit,
    p_variables, p_sujet, p_corps, p_pieces, p_cle_idempotence, p_entite, p_transactionnel, p_donnees_sante, p_echeance,
    p_options)
$function$


-- ═══ PORTE public.proroger auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.proroger(p_jour date, p_territoire text)
 RETURNS date
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v date := p_jour;
begin
  while not public.jour_ouvre(v, p_territoire, false) loop
    v := v + 1;
  end loop;
  return v;
end $function$


-- ═══ PORTE public.publier_evenement auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.publier_evenement(p_client uuid, p_evenement text, p_charge jsonb DEFAULT '{}'::jsonb, p_cle text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.publier_evenement(p_client, p_evenement, p_charge, p_cle)
$function$


-- ═══ PORTE public.rapport_du_mois auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.rapport_du_mois(p_client uuid, p_mois date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select private.rapport_du_mois_pour(p_client, p_mois)
$function$


-- ═══ PORTE public.rattacher_membre auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.rattacher_membre(p_client uuid, p_email text, p_role text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.rattacher_membre(p_client, p_email, p_role)
$function$


-- ═══ PORTE public.recevoir_releve auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.recevoir_releve(p_branchement uuid, p_fichiers jsonb, p_canal text DEFAULT 'depot'::text, p_cle text DEFAULT NULL::text, p_expediteur text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.recevoir_releve(p_branchement, p_fichiers, p_canal, p_cle, p_expediteur)
$function$


-- ═══ PORTE public.regler_battement auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.regler_battement(p_client uuid, p_module text, p_attendu interval, p_plages jsonb DEFAULT NULL::jsonb, p_fuseau text DEFAULT 'Europe/Paris'::text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.regler_battement(p_client, p_module, p_attendu, p_plages, p_fuseau)
$function$


-- ═══ PORTE public.regler_branchement auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.regler_branchement(p_branchement uuid, p_reglages jsonb)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.regler_branchement(p_branchement, p_reglages)
$function$


-- ═══ PORTE public.renvoyer_point auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.renvoyer_point(p_point uuid)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.renvoyer_point(p_point)
$function$


-- ═══ PORTE public.resoudre_boite auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.resoudre_boite(p_canal text, p_boite text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select private.resoudre_boite(p_canal, p_boite)
$function$


-- ═══ PORTE public.retirer_consentement auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.retirer_consentement(p_consentement uuid, p_motif text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.retirer_consentement(p_consentement, p_motif) $function$


-- ═══ PORTE public.retirer_gabarit auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.retirer_gabarit(p_gabarit uuid, p_motif text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.retirer_gabarit(p_gabarit, p_motif) $function$


-- ═══ PORTE public.retirer_section auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.retirer_section(p_client uuid, p_module text, p_jour date, p_destinataire uuid, p_role text, p_titre text, p_entite uuid DEFAULT NULL::uuid, p_equipe uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.retirer_section(p_client, p_module, p_jour, p_destinataire, p_role, p_titre, p_entite, p_equipe)
$function$


-- ═══ PORTE public.revoquer_politique auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.revoquer_politique(p_politique uuid, p_motif text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.revoquer_politique(p_politique, p_motif)
$function$


-- ═══ PORTE public.secret_expediteur auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.secret_expediteur(p_envoi uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select private.secret_expediteur(p_envoi) $function$


-- ═══ PORTE public.signaler_battement auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.signaler_battement(p_client uuid, p_module text, p_detail jsonb DEFAULT '{}'::jsonb, p_attendu interval DEFAULT NULL::interval)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.battre(p_client, p_module, p_detail, p_attendu) $function$


-- ═══ PORTE public.tenir_delai auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.tenir_delai(p_delai uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.clore_delai(p_delai, 'tenu', null)
$function$


-- ═══ PORTE public.terminer_lecture auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.terminer_lecture(p_instantane uuid, p_resultat jsonb, p_version text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.terminer_lecture(p_instantane, p_resultat, p_version)
$function$


-- ═══ PORTE public.territoire_calendrier auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.territoire_calendrier(p_iso text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(
    (select t.code from public.territoires t where upper(btrim(p_iso)) = any (t.iso)),
    case when upper(btrim(p_iso)) ~ '^FR-(0[1-9]|[1-8][0-9]|9[0-5]|2A|2B|75C|69M|20R|ARA|BFC|BRE|CVL|HDF|IDF|NOR|NAQ|OCC|PDL|PAC)$'
         then 'metropole' end)
$function$


-- ═══ PORTE public.territoire_de_entite auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.territoire_de_entite(p_client uuid, p_entite uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select private.territoire_de_entite(e.client_id, e.id)
  from public.entites e where e.client_id = p_client and e.id = p_entite
$function$


-- ═══ PORTE public.tracer_lecture auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.tracer_lecture(p_client uuid, p_objet_type text, p_objet_id text, p_contexte text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.tracer_lecture(p_client, p_objet_type, p_objet_id, p_contexte)
$function$


-- ═══ PORTE public.trancher_instantane auth=true anon=false svc=true
CREATE OR REPLACE FUNCTION public.trancher_instantane(p_instantane uuid, p_decision text, p_motif text DEFAULT NULL::text, p_par text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.trancher_instantane(p_instantane, p_decision, p_motif, p_par)
$function$


-- ═══ PORTE public.valider_gabarit auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.valider_gabarit(p_gabarit uuid, p_par text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.valider_gabarit(p_gabarit, p_par) $function$


-- ═══ PORTE public.verifier_journal_client auth=false anon=false svc=true
CREATE OR REPLACE FUNCTION public.verifier_journal_client(p_client uuid)
 RETURNS TABLE(lignes bigint, premiere_ligne_fausse bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select * from private.verifier_journal(p_client)
$function$



-- ══════════════════ FONCTIONS PRIVÉES DU SOCLE (validation, journal, envois, points, travaux, pièces, relevés, délais, FILED pour A4/B7) ══════════════════

-- ═══ FONCTION private.a_le_droit
CREATE OR REPLACE FUNCTION private.a_le_droit(p_client uuid, p_droit text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select private.a_le_droit_pour((select auth.uid()), p_client, p_droit)
$function$


-- ═══ FONCTION private.a_le_droit_pour
CREATE OR REPLACE FUNCTION private.a_le_droit_pour(p_user uuid, p_client uuid, p_droit text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
      select 1 from public.comptes c
      where c.user_id = p_user and c.client_id = p_client and c.role = 'gerant')
    or exists (
      select 1 from public.droits d
      where d.client_id = p_client and d.droit = p_droit
        and (d.user_id = p_user
             or d.equipe_id in (select m.equipe_id from public.equipes_membres m
                                where m.user_id = p_user and m.client_id = p_client)))
$function$


-- ═══ FONCTION private.a_un_role
CREATE OR REPLACE FUNCTION private.a_un_role(p_client uuid, p_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.comptes c
    where c.user_id = (select auth.uid())
      and c.client_id = p_client
      and c.role = any (p_roles)
  )
$function$


-- ═══ FONCTION private.acquitter_instantane
CREATE OR REPLACE FUNCTION private.acquitter_instantane(p_instantane uuid, p_verdict text, p_raison text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  i public.instantanes;
  b public.branchements;
begin
  select * into i from public.instantanes where id = p_instantane for update;
  if not found then
    raise exception 'Instantané introuvable.' using errcode = 'P0002';
  end if;
  if i.statut <> 'a_appliquer' then
    raise exception 'Cet export n''attend pas de verdict (statut %).', i.statut using errcode = '55000';
  end if;
  select * into b from public.branchements where id = i.branchement_id;
  if p_verdict = 'applique' then
    perform private.appliquer_instantane(i.id);
  elsif p_verdict = 'douteux' then
    if nullif(btrim(p_raison), '') is null then
      raise exception 'Un refus dit pourquoi.' using errcode = '22023';
    end if;
    delete from public.instantanes_ecarts where instantane_id = i.id;
    update public.instantanes
       set statut = 'douteux',
           garde = coalesce(garde, '{}'::jsonb) || jsonb_build_object('raison', 'module', 'source', b.module,
                                                                      'detail', left(btrim(p_raison), 300)),
           motif = private.phrase_garde(jsonb_build_object('raison', 'module', 'source', b.module, 'detail', left(btrim(p_raison), 300)))
     where id = i.id;
    update public.pieces set statut = 'a_verifier', motif = left(btrim(p_raison), 500) where id = i.piece_id;
    perform private.alerter_douteux(i.id);
    perform private.fermer_alertes_releve(b.client_id, b.module, 'releve.en_souffrance.' || i.jeu_id::text, 'le module a rendu son verdict');
  else
    raise exception 'Verdict inconnu : % (applique ou douteux).', coalesce(p_verdict, 'vide') using errcode = '22023';
  end if;
  perform private.avancer_jeu(i.jeu_id, private.limite_requete());
  return (select jsonb_build_object('instantane', x.id, 'statut', x.statut) from public.instantanes x where x.id = i.id);
end $function$


-- ═══ FONCTION private.apercu_point
CREATE OR REPLACE FUNCTION private.apercu_point(p_client uuid, p_user uuid DEFAULT NULL::uuid, p_jour date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_role text := coalesce(nullif(current_setting('role', true), 'none'), session_user::text);
  v_user uuid := coalesce(p_user, v_uid);
  v_jour date;
  v_prevu timestamptz;
  r record;
begin
  if v_uid is not null then
    if v_user <> v_uid and not private.a_un_role(p_client, array['gerant']) then
      raise exception 'Seul le gérant regarde le point d''un autre membre.' using errcode = '42501';
    end if;
  elsif v_role not in ('service_role', 'postgres') then
    raise exception 'Le point se regarde par un membre, ou par le serveur.' using errcode = '42501';
  end if;
  if v_user is null or not exists (select 1 from public.comptes c where c.client_id = p_client and c.user_id = v_user) then
    raise exception 'Ce membre n''appartient pas à l''organisation.' using errcode = '42501';
  end if;
  select * into r from private.point_reglage(p_client, v_user);
  v_jour := coalesce(p_jour, (now() at time zone r.fuseau)::date);
  v_prevu := private.point_du(p_client, v_user, v_jour);
  return jsonb_build_object('jour', v_jour, 'fuseau', r.fuseau, 'prevu_le', v_prevu,
                            'du_le', private.point_devenu_du(v_prevu, r.horaire_depuis, now()),
                            'sections', private.point_composer(p_client, v_user, v_jour),
                            'motifs', private.point_motifs(p_client, v_user, v_jour, now()));
end $function$


-- ═══ FONCTION private.appliquer_decision
CREATE OR REPLACE FUNCTION private.appliquer_decision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_requises smallint; v_oui int; v_non int;
begin
  select d.approbations_requises into v_requises from public.demandes_validation d where d.id = new.demande_id;
  select count(*) filter (where a.decision = 'approuve'), count(*) filter (where a.decision = 'rejete') into v_oui, v_non
  from public.approbations a where a.demande_id = new.demande_id;
  if v_non > 0 then
    update public.demandes_validation set statut = 'rejetee' where id = new.demande_id and statut = 'en_attente';
  elsif v_oui >= v_requises then
    update public.demandes_validation set statut = 'approuvee' where id = new.demande_id and statut = 'en_attente';
  end if;
  return null;
end $function$


-- ═══ FONCTION private.appliquer_instantane
CREATE OR REPLACE FUNCTION private.appliquer_instantane(p_instantane uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET enable_nestloop TO 'off'
 SET work_mem TO '32MB'
AS $function$
declare
  i public.instantanes;
  j public.branchements_jeux;
  b public.branchements;
  v_complet boolean;
  v_col text;
  v_du date;
  v_au date;
  v_sensibles text[];
begin
  select * into i from public.instantanes where id = p_instantane for update;
  select * into j from public.branchements_jeux where id = i.jeu_id for update;
  select * into b from public.branchements where id = i.branchement_id;
  v_complet := coalesce(i.complet, j.complet);
  v_col := i.garde #>> '{fenetre,colonne}';
  v_du := (i.garde #>> '{fenetre,du}')::date;
  v_au := (i.garde #>> '{fenetre,au}')::date;
  v_sensibles := private.codes_sensibles(j.colonnes);

  -- Les lignes nouvelles ou changées, et celles qui reviennent après une absence.
  insert into public.jeux_lignes as s (client_id, jeu_id, cle, valeurs, anomalies, empreinte, sensibles, instantane_id,
                                       entre_le, modifie_le, absences)
  select l.client_id, j.id, l.cle, l.valeurs - v_sensibles, nullif(l.anomalies - v_sensibles, '{}'::jsonb), l.empreinte,
         private.empreintes_sensibles(j.id, l.valeurs, v_sensibles), i.id, now(), now(), 0
  from public.instantanes_lignes l
  where l.instantane_id = i.id
    and not exists (select 1 from public.jeux_lignes x
                    where x.jeu_id = j.id and x.cle = l.cle and x.empreinte = l.empreinte and x.absences = 0)
  on conflict (jeu_id, cle) do update
    set valeurs = excluded.valeurs, anomalies = excluded.anomalies, sensibles = excluded.sensibles, absences = 0,
        instantane_id = case when s.empreinte = excluded.empreinte then s.instantane_id else excluded.instantane_id end,
        modifie_le = case when s.empreinte = excluded.empreinte then s.modifie_le else excluded.modifie_le end,
        empreinte = excluded.empreinte;

  if v_complet then
    delete from public.jeux_lignes s
    where s.jeu_id = j.id and s.absences + 1 >= j.confirmer_disparition
      and private.dans_portee(s.valeurs, v_col, v_du, v_au, i.perimetre, b.fuseau)
      and not exists (select 1 from public.instantanes_lignes l where l.instantane_id = i.id and l.cle = s.cle);
    update public.jeux_lignes s set absences = s.absences + 1
    where s.jeu_id = j.id
      and private.dans_portee(s.valeurs, v_col, v_du, v_au, i.perimetre, b.fuseau)
      and not exists (select 1 from public.instantanes_lignes l where l.instantane_id = i.id and l.cle = s.cle);
  end if;

  update public.branchements_jeux
     set courant_id = i.id, lignes = (select count(*) from public.jeux_lignes s where s.jeu_id = j.id)
   where id = j.id;
  update public.instantanes set statut = 'applique', applique_le = now() where id = i.id;
  delete from public.instantanes_lignes where instantane_id = i.id;
  -- La valeur brute d'une colonne sensible ne survit pas à l'application.
  if cardinality(v_sensibles) > 0 then
    update public.instantanes_ecarts
       set avant = avant - v_sensibles, apres = apres - v_sensibles, anomalies = nullif(anomalies - v_sensibles, '{}'::jsonb)
     where instantane_id = i.id;
  end if;
  update public.pieces set statut = 'lue' where id = i.piece_id and statut = 'a_verifier';
  perform private.confirmer_etat(j.id, i.recu_le);
  perform private.fermer_alertes_releve(b.client_id, b.module, 'releve.en_souffrance.' || j.id::text, 'l''export est appliqué');
end $function$


-- ═══ FONCTION private.avancer_jeu
CREATE OR REPLACE FUNCTION private.avancer_jeu(p_jeu uuid, p_limite integer DEFAULT NULL::integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_releve uuid;
  v_lignes integer;
  n integer := 0;
begin
  perform 1 from public.branchements_jeux where id = p_jeu for update;
  loop
    exit when exists (select 1 from public.instantanes where jeu_id = p_jeu and statut = 'a_appliquer');
    select i.id, i.releve_id, i.lignes into v_id, v_releve, v_lignes from public.instantanes i
    where i.jeu_id = p_jeu and i.statut = 'lu'
    order by i.recu_le, i.id
    limit 1;
    exit when not found;
    exit when p_limite is not null
              and coalesce(v_lignes, 0) + (select j.lignes from public.branchements_jeux j where j.id = p_jeu) > p_limite;
    perform private.finaliser_instantane(v_id);
    perform private.publier_releve(v_releve);
    n := n + 1;
  end loop;
  return n;
end $function$


-- ═══ FONCTION private.avancer_releves
CREATE OR REPLACE FUNCTION private.avancer_releves()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  n integer := 0;
begin
  for r in
    select distinct i.jeu_id from public.instantanes i
    where i.statut = 'lu'
      and not exists (select 1 from public.instantanes k where k.jeu_id = i.jeu_id and k.statut = 'a_appliquer')
  loop
    n := n + private.avancer_jeu(r.jeu_id, null);
  end loop;
  return n;
end $function$


-- ═══ FONCTION private.battre
CREATE OR REPLACE FUNCTION private.battre(p_client uuid, p_module text, p_detail jsonb DEFAULT '{}'::jsonb, p_attendu interval DEFAULT NULL::interval)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.battements as b (client_id, module, dernier_le, attendu_toutes, detail)
  values (p_client, p_module, now(), coalesce(p_attendu, interval '1 day'), coalesce(p_detail, '{}'::jsonb))
  on conflict (client_id, module) do update
    set dernier_le = now(), detail = coalesce(p_detail, '{}'::jsonb), attendu_toutes = coalesce(p_attendu, b.attendu_toutes), actif = true;
  update public.alertes set acquittee_le = now(), detail = detail || jsonb_build_object('resolution', 'le module bat de nouveau')
   where client_id = p_client and cle_regroupement = 'battement:' || p_module and acquittee_le is null;
end $function$


-- ═══ FONCTION private.brancher
CREATE OR REPLACE FUNCTION private.brancher(p_client uuid, p_module text, p_logiciel text, p_voie text, p_libelle text, p_entite uuid DEFAULT NULL::uuid, p_fuseau text DEFAULT NULL::text, p_jeux text[] DEFAULT NULL::text[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_code text;
begin
  perform private.exiger_gestion_releve(p_client, p_entite);
  if exists (select 1 from public.branchements b
             where b.client_id = p_client and b.module = p_module and b.logiciel = p_logiciel
               and b.entite_id is not distinct from p_entite) then
    raise exception 'Ce logiciel est déjà branché pour ce module et cette entité.' using errcode = '23505';
  end if;
  insert into public.branchements (client_id, entite_id, module, logiciel, libelle, voie, fuseau, cree_par)
  values (p_client, p_entite, p_module, p_logiciel, p_libelle, p_voie,
          coalesce(p_fuseau,
                   (select e.fuseau from public.entites e where e.client_id = p_client and e.id = p_entite),
                   (select e.fuseau from public.entites e where e.client_id = p_client and e.principale),
                   'Europe/Paris'),
          (select auth.uid()))
  returning id into v_id;
  foreach v_code in array coalesce(p_jeux, array(
    select distinct m.code from public.modeles_jeux m where m.module = p_module and m.logiciel = p_logiciel order by m.code)) loop
    if p_jeux is not null and private.modele_pour(p_module, p_logiciel, v_code) is null then
      raise exception 'Aucun modèle « % » pour %, %.', v_code, p_module, p_logiciel using errcode = 'P0002';
    end if;
    perform private.declarer_jeu(v_id, v_code, '{}'::jsonb);
  end loop;
  return v_id;
end $function$


-- ═══ FONCTION private.chiffrer_piece
CREATE OR REPLACE FUNCTION private.chiffrer_piece()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_schema text;
begin
  if tg_op = 'UPDATE' and old.chiffrement is not null then
    new.chiffrement := old.chiffrement;
    return new;
  end if;
  select c.schema into v_schema from private.objets_chiffres c where c.objet_type = new.objet_type;
  if v_schema is null then
    new.chiffrement := null;
    return new;
  end if;
  if tg_op = 'UPDATE' and (exists (select 1 from public.pieces_pages g where g.piece_id = new.id)
                           or exists (select 1 from public.pieces_valeurs v where v.piece_id = new.id)) then
    raise exception 'Une pièce déjà lue en clair n''entre pas dans un dossier chiffré : la déposer de nouveau.'
      using errcode = '55000';
  end if;
  new.chiffrement := v_schema;
  return new;
end $function$


-- ═══ FONCTION private.classer_instantane
CREATE OR REPLACE FUNCTION private.classer_instantane(p_instantane uuid, p_jeu text, p_par text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  i public.instantanes;
  b public.branchements;
  j public.branchements_jeux;
  v_par text;
begin
  select * into i from public.instantanes where id = p_instantane for update;
  if not found or ((select auth.uid()) is not null and not exists (
       select 1 from public.comptes c where c.user_id = (select auth.uid()) and c.client_id = i.client_id)) then
    raise exception 'Instantané introuvable.' using errcode = 'P0002';
  end if;
  select * into b from public.branchements where id = i.branchement_id;
  perform private.exiger_gestion_releve(b.client_id, b.entite_id);
  v_par := private.signature_releve(p_par);
  if i.statut <> 'a_classer' then
    raise exception 'Cet export n''attend pas d''être classé (statut %).', i.statut using errcode = '55000';
  end if;
  select * into j from public.branchements_jeux where branchement_id = b.id and code = p_jeu and actif;
  if not found then
    raise exception 'Jeu inconnu ou inactif pour ce branchement : %.', coalesce(p_jeu, 'vide') using errcode = '22023';
  end if;
  update public.instantanes set jeu_id = j.id, statut = 'recu', tranche_par = v_par, tranche_le = now(), motif = null
   where id = i.id;
  update public.pieces set statut = 'en_lecture', motif = null where id = i.piece_id;
  perform private.deposer_travail(b.client_id, b.module, 'releve.lire', jsonb_build_object('instantane', i.id),
                                  'instantane:' || i.id::text, 0::smallint);
  if not exists (select 1 from public.instantanes k where k.branchement_id = b.id and k.statut = 'a_classer') then
    perform private.fermer_alertes_releve(b.client_id, b.module, 'releve.a_classer.' || b.id::text, 'classé par ' || v_par);
  end if;
  return jsonb_build_object('instantane', i.id, 'statut', 'recu', 'jeu', j.code);
end $function$


-- ═══ FONCTION private.clore_delai
CREATE OR REPLACE FUNCTION private.clore_delai(p_delai uuid, p_statut text, p_motif text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  d public.delais;
begin
  select * into d from public.delais where id = p_delai for update;
  if not found then
    raise exception 'Délai introuvable.' using errcode = 'P0002';
  end if;
  perform private.exiger_ecriture_delai(d.client_id, d.objet_type, d.objet_id);
  perform private.exiger_porte_du_module(d.module);
  if d.statut in ('tenu', 'annule') then
    raise exception 'Ce délai est déjà clos.' using errcode = '55000';
  end if;
  if p_statut = 'annule' and nullif(btrim(p_motif), '') is null then
    raise exception 'Une annulation dit pourquoi.' using errcode = '22023';
  end if;
  update public.delais set statut = p_statut, motif = p_motif, clos_le = now(), maj_le = now() where id = p_delai;
end $function$


-- ═══ FONCTION private.clore_suivi
CREATE OR REPLACE FUNCTION private.clore_suivi(p_suivi uuid, p_issue text, p_piece uuid DEFAULT NULL::uuid, p_detail text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s public.suivis;
  v_uid uuid := (select auth.uid());
  v_statut text;
  r record;
begin
  s := private.charger_suivi(p_suivi);
  if s.statut <> 'ouvert' then
    raise exception 'Ce suivi est déjà clos (%).', s.statut using errcode = '55000';
  end if;
  v_statut := case p_issue when 'recu' then 'recu' when 'repondu' then 'recu' when 'paye' then 'recu' when 'livre' then 'recu'
                           when 'signe' then 'recu' when 'abandonne' then 'abandonne' when 'annule' then 'annule' end;
  if v_statut is null then
    raise exception 'Issue inconnue : recu, repondu, paye, livre, signe, abandonne ou annule.' using errcode = '22023';
  end if;
  if v_statut <> 'recu' and nullif(btrim(p_detail), '') is null then
    raise exception 'Un abandon ou une annulation dit pourquoi.' using errcode = '22023';
  end if;
  if p_piece is not null and not exists (
       select 1 from public.pieces p where p.client_id = s.client_id and p.id = p_piece) then
    raise exception 'Pièce introuvable dans cette organisation.' using errcode = '22023';
  end if;
  update public.suivis
     set statut = v_statut, issue = left(coalesce(nullif(btrim(p_detail), ''), p_issue), 300), piece_id = p_piece,
         clos_par = v_uid, clos_le = now(), prochaine_relance_le = null
   where id = s.id
  returning * into s;
  -- Une relance en attente n'a plus lieu d'être.
  for r in select e.id from public.envois e where e.suivi_id = s.id and e.statut in ('a_valider', 'differe', 'pret') loop
    perform private.clore_envoi(r.id, 'annule', 'ANNULE', 'Le suivi est clos : la relance n''a plus lieu d''être.');
  end loop;
  perform private.noter_evenement_suivi(s, 'cloture', null, null,
    jsonb_build_object('issue', p_issue, 'statut', v_statut, 'piece', p_piece, 'relances', s.relances, 'glissements', s.glissements,
                       'age_jours', extract(day from (now() - s.depuis))), v_uid);
  perform private.publier_evenement(s.client_id, 'suivi.clos.' || s.module,
    jsonb_build_object('suivi', s.id, 'module', s.module, 'objet_type', s.objet_type, 'objet_id', s.objet_id,
                       'statut', v_statut, 'issue', p_issue, 'piece', p_piece, 'relances', s.relances, 'glissements', s.glissements),
    s.id::text || ':clos');
end $function$


-- ═══ FONCTION private.commencer_lecture
CREATE OR REPLACE FUNCTION private.commencer_lecture(p_piece uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  -- « en_lecture » : un essai précédent s'est interrompu, la file le reprend.
  update public.pieces set statut = 'en_lecture'
   where id = p_piece and objet_id is not null and statut in ('recue', 'en_lecture');
  return found;
end $function$


-- ═══ FONCTION private.commencer_releve
CREATE OR REPLACE FUNCTION private.commencer_releve(p_instantane uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  i public.instantanes;
  b public.branchements;
  p public.pieces;
begin
  select * into i from public.instantanes where id = p_instantane for update;
  if not found or i.statut not in ('recu', 'en_lecture') then
    return null;
  end if;
  select * into b from public.branchements where id = i.branchement_id;
  select * into p from public.pieces where id = i.piece_id;
  -- Un essai interrompu repart de zéro.
  delete from public.instantanes_lignes where instantane_id = i.id;
  if i.statut = 'recu' then
    update public.instantanes set statut = 'en_lecture' where id = i.id;
  end if;
  return jsonb_build_object(
    'instantane', i.id, 'client', i.client_id, 'branchement', b.id, 'module', b.module, 'logiciel', b.logiciel,
    'fuseau', b.fuseau, 'nom_fichier', i.nom_fichier, 'chemin', p.chemin, 'mime', p.mime, 'octets', i.octets,
    'sha256', i.sha256, 'force', i.force,
    'jeu', (select x.code from public.branchements_jeux x where x.id = i.jeu_id),
    'jeux', coalesce((
      select jsonb_agg(jsonb_build_object('code', x.code, 'libelle', x.libelle, 'motif_fichier', x.motif_fichier,
                                          'entetes', to_jsonb(x.entetes), 'colonnes', x.colonnes, 'cle', to_jsonb(x.cle),
                                          'options', x.options) order by x.code)
      from public.branchements_jeux x where x.branchement_id = b.id and (x.actif or x.id = i.jeu_id)), '[]'::jsonb));
end $function$


-- ═══ FONCTION private.confier_envoi
CREATE OR REPLACE FUNCTION private.confier_envoi(p_e envois)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_e.statut = 'pret' and exists (select 1 from private.fournisseurs_envoi f
                                     where f.fournisseur = p_e.fournisseur and f.automatique and f.branche) then
    perform private.deposer_travail(p_e.client_id, p_e.module, 'envois.' || p_e.fournisseur,
                                    jsonb_build_object('envoi', p_e.id), 'envoi:' || p_e.id::text, 0::smallint);
  end if;
end $function$


-- ═══ FONCTION private.controler_delais
CREATE OR REPLACE FUNCTION private.controler_delais(p_maintenant timestamp with time zone DEFAULT now())
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  v_reste integer;
  v_dus integer[];
  v_rappel integer;
  n integer := 0;
begin
  for r in
    select d.*, t.fuseau from public.delais d join public.territoires t on t.code = d.territoire
    where d.statut = 'ouvert'
    for update of d skip locked
  loop
    v_reste := r.echeance - (p_maintenant at time zone r.fuseau)::date;
    if v_reste < 0 then
      update public.delais set statut = 'depasse', maj_le = now() where id = r.id;
      perform private.publier_evenement(r.client_id, 'delai.depasse.' || r.module,
        jsonb_build_object('delai', r.id, 'module', r.module, 'objet_type', r.objet_type, 'objet_id', r.objet_id,
                           'echeance', r.echeance, 'jours_de_retard', -v_reste),
        r.id::text || ':' || r.echeance::text);
      n := n + 1;
      continue;
    end if;
    v_dus := array(select x from unnest(r.rappels) x where x >= v_reste and not (x = any (r.rappels_faits)));
    if cardinality(v_dus) > 0 then
      v_rappel := (select min(x) from unnest(v_dus) x);
      update public.delais set rappels_faits = rappels_faits || v_dus where id = r.id;
      perform private.publier_evenement(r.client_id, 'delai.proche.' || r.module,
        jsonb_build_object('delai', r.id, 'module', r.module, 'objet_type', r.objet_type, 'objet_id', r.objet_id,
                           'echeance', r.echeance, 'jours_restants', v_reste, 'rappel', v_rappel),
        r.id::text || ':' || r.echeance::text || ':' || v_rappel::text);
      n := n + 1;
    end if;
  end loop;
  return n;
end $function$


-- ═══ FONCTION private.controler_releves
CREATE OR REPLACE FUNCTION private.controler_releves(p_maintenant timestamp with time zone DEFAULT now())
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  e jsonb;
  n integer := 0;
  v_jour date;
  v_avant timestamptz;
  v_depuis timestamptz;
  v_debut timestamptz;
  v_cle text;
begin
  -- 1. Le fichier attendu avant une heure fixe.
  for r in
    select j.id, j.client_id, j.branchement_id, j.code, j.libelle, j.attendu, j.dernier_recu_le, j.etat_le,
           j.retard_signale, b.module, b.libelle as b_libelle, b.fuseau
    from public.branchements_jeux j join public.branchements b on b.id = j.branchement_id
    where j.actif and b.statut = 'actif' and j.attendu is not null
  loop
    v_jour := (p_maintenant at time zone r.fuseau)::date;
    for e in select * from jsonb_array_elements(r.attendu) loop
      continue when not ((e -> 'jours') @> to_jsonb(extract(isodow from v_jour)::integer));
      v_avant := (v_jour + (e ->> 'avant')::time) at time zone r.fuseau;
      continue when p_maintenant < v_avant or (r.retard_signale is not null and r.retard_signale >= v_avant);
      v_depuis := (v_jour + coalesce(e ->> 'depuis', '00:00')::time) at time zone r.fuseau;
      continue when exists (
        select 1 from public.instantanes i
        where i.recu_le >= v_depuis
          and (i.jeu_id = r.id or (i.jeu_id is null and i.branchement_id = r.branchement_id and i.statut in ('recu', 'en_lecture'))));
      v_cle := 'releve.en_retard.' || r.id::text || '.' || to_char(v_jour, 'YYYYMMDD');
      perform private.publier_evenement(r.client_id, 'releve.en_retard.' || r.module,
        jsonb_build_object('jeu', r.id, 'code', r.code, 'branchement', r.branchement_id, 'module', r.module,
                           'avant', v_avant, 'depuis', v_depuis, 'dernier_recu_le', r.dernier_recu_le, 'etat_le', r.etat_le),
        r.id::text || ':' || to_char(v_jour, 'YYYYMMDD'));
      if coalesce((e ->> 'alerter')::boolean, true) then
        perform private.lever_alerte_module(r.client_id, r.module, 'attention',
          coalesce(e ->> 'titre', left(format('Le fichier « %s » (%s) n''est pas arrivé à %s : les données datent %s',
                   r.libelle, r.b_libelle, e ->> 'avant',
                   coalesce('du ' || to_char(r.etat_le at time zone r.fuseau, 'DD/MM à HH24:MI'), 'd''avant le premier export')), 200)),
          jsonb_build_object('jeu', r.code, 'avant', v_avant, 'dernier_recu_le', r.dernier_recu_le),
          v_cle, true, null);
      end if;
      update public.branchements_jeux set retard_signale = v_avant where id = r.id;
      n := n + 1;
    end loop;
  end loop;

  -- 2. Le jeu qui se tait dans sa plage, au-delà d'une fois et demie son rythme.
  for r in
    select j.id, j.client_id, j.libelle, j.rythme, j.plages, j.cree_le, j.dernier_recu_le,
           b.module, b.libelle as b_libelle, b.fuseau
    from public.branchements_jeux j join public.branchements b on b.id = j.branchement_id
    where j.actif and b.statut = 'actif' and j.rythme is not null
  loop
    v_debut := private.debut_plage_courante(r.plages, r.fuseau, p_maintenant);
    continue when v_debut is null;
    if greatest(coalesce(r.dernier_recu_le, r.cree_le), v_debut) + r.rythme * 1.5 < p_maintenant then
      if private.lever_alerte_module(r.client_id, r.module, 'attention',
           left(format('Plus aucun fichier « %s » (%s) depuis %s', r.libelle, r.b_libelle,
                       coalesce(to_char(r.dernier_recu_le at time zone r.fuseau, 'DD/MM à HH24:MI'), 'le branchement')), 200),
           jsonb_build_object('jeu', r.id, 'rythme', r.rythme::text, 'dernier_recu_le', r.dernier_recu_le),
           'releve.muet.' || r.id::text, true, null) is not null then
        n := n + 1;
      end if;
    end if;
  end loop;

  -- 3. L'export lu que le module n'applique pas.
  for r in
    select distinct on (i.jeu_id) i.jeu_id, i.client_id, i.finalise_le, j.libelle, b.module, b.libelle as b_libelle
    from public.instantanes i
    join public.branchements_jeux j on j.id = i.jeu_id
    join public.branchements b on b.id = i.branchement_id
    where i.statut = 'a_appliquer' and i.finalise_le < p_maintenant - interval '2 hours'
    order by i.jeu_id, i.finalise_le
  loop
    if private.lever_alerte_module(r.client_id, r.module, 'critique',
         left(format('%s n''applique pas le relevé « %s » (%s) depuis %s', upper(r.module), r.libelle, r.b_libelle,
                     to_char(r.finalise_le at time zone 'UTC', 'DD/MM HH24:MI "UTC"')), 200),
         jsonb_build_object('jeu', r.jeu_id, 'depuis', r.finalise_le),
         'releve.en_souffrance.' || r.jeu_id::text, false, null) is not null then
      n := n + 1;
    end if;
  end loop;
  return n;
end $function$


-- ═══ FONCTION private.creer_envoi
CREATE OR REPLACE FUNCTION private.creer_envoi(p_client uuid, p_module text, p_objet_type text, p_objet_id text, p_canal text, p_destinataire jsonb, p_gabarit text, p_variables jsonb, p_sujet text, p_corps text, p_pieces uuid[], p_cle text, p_entite uuid, p_transactionnel boolean, p_donnees_sante boolean, p_echeance timestamp with time zone, p_direct boolean, p_repondre_a text, p_demande uuid, p_espacement boolean, p_prepare_par uuid, p_suivi uuid, p_rang smallint)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_canal private.canaux_envoi;
  v_module private.modules_envois;
  v_r jsonb;
  v_dest jsonb;
  v_g public.gabarits_messages;
  v_rendu jsonb;
  v_sujet text;
  v_corps text;
  v_transactionnel boolean;
  v_sante boolean;
  v_espacement boolean;
  v_contexte_sante boolean;
  v_pieces uuid[] := coalesce(array(select distinct x from unnest(coalesce(p_pieces, '{}'::uuid[])) x), '{}');
  v_octets bigint;
  v_mode text;
  v_e public.envois;
  v_v jsonb;
  v_d public.demandes_validation;
  v_resume text;
begin
  if not exists (select 1 from public.clients c where c.id = p_client) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  if p_module is null or p_module !~ '^[a-z][a-z_]{1,29}$' then
    raise exception 'Module inconnu : %.', coalesce(p_module, 'vide') using errcode = '22023';
  end if;
  select * into v_canal from private.canaux_envoi c where c.canal = p_canal;
  if v_canal.canal is null then
    raise exception 'Canal inconnu : %. Canaux : email, whatsapp, sms, lre, appel.', coalesce(p_canal, 'vide')
      using errcode = '22023';
  end if;
  if (p_objet_type is null) <> (p_objet_id is null) then
    raise exception 'Un objet se désigne par son type et son identifiant.' using errcode = '22023';
  end if;
  if p_entite is not null and not exists (select 1 from public.entites e where e.client_id = p_client and e.id = p_entite) then
    raise exception 'Entité introuvable dans cette organisation.' using errcode = '22023';
  end if;
  if p_echeance is not null and p_echeance <= now() then
    raise exception 'L''échéance d''un envoi est dans le futur.' using errcode = '22023';
  end if;
  if p_repondre_a is not null and private.normaliser_email(p_repondre_a) is null then
    raise exception 'Adresse de réponse invalide.' using errcode = '22023';
  end if;

  v_dest := private.resoudre_destinataire(p_client, p_canal, p_destinataire, p_entite);
  select * into v_module from private.modules_envois m where m.module = p_module;
  v_r := private.reglages_envois_effectifs(p_client, p_module);
  v_contexte_sante := coalesce(v_module.sante, false) or (v_r ->> 'sante')::boolean;

  -- Le contenu : un gabarit validé, ou un texte.
  if p_gabarit is not null then
    if p_sujet is not null or p_corps is not null then
      raise exception 'Un gabarit ou un texte (sujet, corps), pas les deux.' using errcode = '22023';
    end if;
    v_g := private.gabarit_pour(p_client, p_module, p_gabarit, v_dest ->> 'langue');
    if v_g.id is null then
      raise exception 'Aucun gabarit validé « % » pour le module %.', p_gabarit, p_module using errcode = 'P0002';
    end if;
    if v_g.canal <> p_canal then
      raise exception 'Le gabarit % est écrit pour le canal %, pas pour %.', p_gabarit, v_g.canal, p_canal
        using errcode = '22023';
    end if;
    v_rendu := private.rendre_gabarit(v_g, p_variables, p_client, p_entite);
    v_sujet := v_rendu ->> 'sujet';
    v_corps := v_rendu ->> 'corps';
    v_transactionnel := v_g.transactionnel;
    -- Dans un contexte de santé, un texte libre peut nommer un patient : il porte de la santé.
    v_sante := v_g.donnees_sante or (v_contexte_sante and (v_rendu ->> 'texte_libre')::boolean);
    v_espacement := v_g.espacement;
  else
    if nullif(btrim(p_corps), '') is null then
      raise exception 'Un envoi sans gabarit porte un corps.' using errcode = '22023';
    end if;
    if p_variables is not null and p_variables <> '{}'::jsonb then
      raise exception 'Des variables sans gabarit : rien à remplir.' using errcode = '22023';
    end if;
    v_sujet := nullif(btrim(p_sujet), '');
    v_corps := p_corps;
    v_transactionnel := coalesce(p_transactionnel, false);
    v_sante := coalesce(p_donnees_sante, false) or v_contexte_sante;
    v_espacement := coalesce(p_espacement, true);
  end if;
  if v_canal.sujet = 'obligatoire' and v_sujet is null then
    raise exception 'Un envoi par % porte un sujet.', lower(v_canal.libelle) using errcode = '22023';
  end if;
  if v_canal.sujet = 'interdit' and v_sujet is not null then
    raise exception 'Un envoi par % n''a pas de sujet.', v_canal.libelle using errcode = '22023';
  end if;
  if char_length(v_corps) > v_canal.longueur_max or char_length(coalesce(v_sujet, '')) > 300 then
    raise exception 'Message trop long pour le canal % : % caractères au plus.', v_canal.libelle, v_canal.longueur_max
      using errcode = '22023';
  end if;

  if cardinality(v_pieces) > 0 then
    if not v_canal.pieces then
      raise exception 'Le canal % ne porte pas de pièce jointe.', v_canal.libelle using errcode = '22023';
    end if;
    if cardinality(v_pieces) > 10 then
      raise exception 'Dix pièces jointes au plus.' using errcode = '22023';
    end if;
    if (select count(*) from public.pieces p
        where p.client_id = p_client and p.id = any (v_pieces) and p.statut not in ('rejetee', 'echec')) <> cardinality(v_pieces) then
      raise exception 'Pièce jointe introuvable dans cette organisation, ou illisible.' using errcode = '22023';
    end if;
    select coalesce(sum(p.octets), 0) into v_octets from public.pieces p where p.client_id = p_client and p.id = any (v_pieces);
    if v_octets > 15 * 1024 * 1024 then
      raise exception 'Pièces jointes trop lourdes : 15 Mo au plus.' using errcode = '22023';
    end if;
    v_sante := v_sante or v_contexte_sante;   -- une pièce d'un contexte de santé en porte
  end if;

  v_mode := case when v_r ->> 'mode' = 'essai' then 'essai' else 'reel' end;

  -- La décision métier à laquelle l'envoi s'adosse : vérifiée avant tout, liée dès la naissance.
  if p_demande is not null then
    select * into v_d from public.demandes_validation d where d.id = p_demande for update;
    if v_d.id is null or v_d.client_id <> p_client then
      raise exception 'Décision introuvable dans cette organisation.' using errcode = 'P0002';
    end if;
    if v_d.module <> p_module or v_d.type_action = 'politique.activer'
       or v_d.objet_type is distinct from p_objet_type or v_d.objet_id is distinct from p_objet_id then
      raise exception 'Cette décision ne porte pas sur cet envoi : même module, même objet.' using errcode = '22023';
    end if;
    if v_d.statut not in ('en_attente', 'approuvee') then
      raise exception 'Cette décision n''est plus ouverte (%).', v_d.statut using errcode = '23514';
    end if;
    if exists (select 1 from public.envois x where x.demande_id = p_demande) then
      raise exception 'Cette décision porte déjà un envoi.' using errcode = '23505';
    end if;
  end if;

  insert into public.envois (
    client_id, entite_id, module, objet_type, objet_id, canal,
    destinataire_adresse, destinataire_empreinte, destinataire_nom, destinataire_ref, destinataire_membre,
    destinataire_fuseau, destinataire_territoire, destinataire_professionnel, destinataire_langue,
    gabarit_id, variables, sujet, corps, pieces, empreinte, repondre_a, transactionnel, donnees_sante, espacement,
    demande_id, adossee, direct, mode, statut, verrou, motif, echeance, suivi_id, rang, cle_idempotence, prepare_par,
    cree_le, clos_le)
  values (
    p_client, p_entite, p_module, p_objet_type, p_objet_id, p_canal,
    v_dest ->> 'adresse', private.empreinte_adresse(p_client, v_dest ->> 'adresse'), v_dest ->> 'nom', v_dest ->> 'ref',
    (v_dest ->> 'membre')::uuid, v_dest ->> 'fuseau', v_dest ->> 'territoire', (v_dest ->> 'professionnel')::boolean,
    v_dest ->> 'langue',
    v_g.id, case when v_g.id is null then '{}'::jsonb else coalesce(p_variables, '{}'::jsonb) end,
    v_sujet, v_corps, v_pieces,
    private.empreinte_contenu(p_canal, v_dest ->> 'adresse', v_sujet, v_corps, v_pieces),
    private.normaliser_email(p_repondre_a), v_transactionnel, v_sante, v_espacement,
    p_demande, p_demande is not null, coalesce(p_direct, false), v_mode,
    case when v_dest ->> 'adresse' is null then 'bloque' else 'a_valider' end,
    case when v_dest ->> 'adresse' is null then 'DESTINATAIRE_SANS_ADRESSE' end,
    v_dest ->> 'manque', coalesce(p_echeance, now() + interval '7 days'),
    p_suivi, p_rang, p_cle, p_prepare_par, clock_timestamp(),
    case when v_dest ->> 'adresse' is null then now() end)
  returning * into v_e;

  if v_e.statut = 'bloque' then
    perform private.publier_envoi(v_e, 'bloque');
    return v_e.id;
  end if;

  -- Ce qui ne dépend pas de l'heure : un envoi voué au refus ne dérange personne.
  v_v := private.verrous_envoi(v_e, false, now());
  if v_v ->> 'code' is not null then
    perform private.clore_envoi(v_e.id, 'bloque', v_v ->> 'code', v_v ->> 'motif');
    return v_e.id;
  end if;

  if coalesce(p_direct, false) then
    -- Un membre qui en a le droit décide lui-même : c'est sa décision, tracée.
    perform private.envoi_valide(v_e.id);
  elsif p_demande is not null then
    if v_d.statut = 'approuvee' then
      perform private.envoi_valide(v_e.id);
    end if;
  else
    v_resume := case when v_mode = 'essai' then 'Essai — ' else '' end || v_canal.libelle || ' : '
                || coalesce(v_g.libelle, 'message rédigé');
    insert into public.demandes_validation (
      client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload, echeance, cle_idempotence)
    values (
      p_client, p_entite, p_module, 'envoi.' || p_canal, p_objet_type, p_objet_id, left(v_resume, 500),
      jsonb_build_object(
        'envoi', v_e.id, 'canal', p_canal, 'mode', v_mode,
        'destinataire', jsonb_build_object('nom', v_e.destinataire_nom, 'adresse', v_e.destinataire_adresse),
        'gabarit', case when v_g.id is null then null
                        else jsonb_build_object('code', v_g.code, 'version', v_g.version, 'libelle', v_g.libelle) end,
        'sujet', v_sujet, 'corps', v_corps,
        'pieces', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'nom', p.nom_fichier) order by p.nom_fichier), '[]'::jsonb)
                   from public.pieces p where p.client_id = p_client and p.id = any (v_pieces)),
        'transactionnel', v_transactionnel, 'donnees_sante', v_sante),
      v_e.echeance, 'envoi:' || v_e.id::text)
    returning * into v_d;
    update public.envois set demande_id = v_d.id where id = v_e.id;
    if v_d.statut = 'approuvee' then   -- un accord permanent la couvre
      perform private.envoi_valide(v_e.id);
    end if;
  end if;
  return v_e.id;
end $function$


-- ═══ FONCTION private.dans_equipe
CREATE OR REPLACE FUNCTION private.dans_equipe(p_user uuid, p_equipe uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.equipes_membres m where m.equipe_id = p_equipe and m.user_id = p_user)
$function$


-- ═══ FONCTION private.declarer_jeu
CREATE OR REPLACE FUNCTION private.declarer_jeu(p_branchement uuid, p_code text, p_declaration jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  b public.branchements;
  j public.branchements_jeux;
  m public.modeles_jeux;
  p jsonb := coalesce(p_declaration, '{}'::jsonb);
  d jsonb;
  v_id uuid;
  v_inconnus text;
begin
  select * into b from public.branchements where id = p_branchement;
  if not found then
    raise exception 'Branchement introuvable.' using errcode = 'P0002';
  end if;
  perform private.exiger_gestion_releve(b.client_id, b.entite_id);
  if jsonb_typeof(p) <> 'object' then
    raise exception 'Un jeu se déclare en objet.' using errcode = '22023';
  end if;
  select string_agg(k, ', ') into v_inconnus from jsonb_object_keys(p) k where k not in (
    'libelle', 'motif_fichier', 'entetes', 'colonnes', 'cle', 'complet', 'fenetre', 'confirmer_disparition',
    'seuil_perte', 'perte_min', 'seuil_anomalies', 'options', 'accuse', 'rythme', 'plages', 'attendu', 'actif');
  if v_inconnus is not null then
    raise exception 'Réglage de jeu inconnu : %.', v_inconnus using errcode = '22023';
  end if;

  select * into j from public.branchements_jeux where branchement_id = b.id and code = p_code for update;
  if found then
    update public.branchements_jeux set
      libelle = case when p ? 'libelle' then p ->> 'libelle' else libelle end,
      motif_fichier = case when p ? 'motif_fichier' then p ->> 'motif_fichier' else motif_fichier end,
      entetes = case when p ? 'entetes' then coalesce(private.tableau_texte(p -> 'entetes'), '{}') else entetes end,
      colonnes = case when p ? 'colonnes' then coalesce(nullif(p -> 'colonnes', 'null'::jsonb), '{}'::jsonb) else colonnes end,
      cle = case when p ? 'cle' then coalesce(private.tableau_texte(p -> 'cle'), '{}') else cle end,
      complet = case when p ? 'complet' then coalesce((p ->> 'complet')::boolean, true) else complet end,
      fenetre = case when p ? 'fenetre' then nullif(p -> 'fenetre', 'null'::jsonb) else fenetre end,
      confirmer_disparition = case when p ? 'confirmer_disparition' then (p ->> 'confirmer_disparition')::smallint else confirmer_disparition end,
      seuil_perte = case when p ? 'seuil_perte' then (p ->> 'seuil_perte')::numeric else seuil_perte end,
      perte_min = case when p ? 'perte_min' then (p ->> 'perte_min')::integer else perte_min end,
      seuil_anomalies = case when p ? 'seuil_anomalies' then (p ->> 'seuil_anomalies')::numeric else seuil_anomalies end,
      options = case when p ? 'options' then coalesce(nullif(p -> 'options', 'null'::jsonb), '{}'::jsonb) else options end,
      accuse = case when p ? 'accuse' then (p ->> 'accuse')::boolean else accuse end,
      rythme = case when p ? 'rythme' then (p ->> 'rythme')::interval else rythme end,
      plages = case when p ? 'plages' then nullif(p -> 'plages', 'null'::jsonb) else plages end,
      attendu = case when p ? 'attendu' then nullif(p -> 'attendu', 'null'::jsonb) else attendu end,
      actif = case when p ? 'actif' then (p ->> 'actif')::boolean else actif end,
      maj_le = now()
    where id = j.id;
    -- Une clé qui change rend l'état incomparable : le prochain export repart de zéro.
    if (select x.cle from public.branchements_jeux x where x.id = j.id) is distinct from j.cle then
      if exists (select 1 from public.instantanes i where i.jeu_id = j.id and i.statut in ('lu', 'a_appliquer')) then
        raise exception 'Un export de ce jeu est en cours d''application : changez la clé après lui.' using errcode = '55000';
      end if;
      delete from public.jeux_lignes where jeu_id = j.id;
      update public.branchements_jeux set courant_id = null, lignes = 0, etat_le = null where id = j.id;
    end if;
    return j.id;
  end if;

  m := private.modele_pour(b.module, b.logiciel, p_code);
  d := coalesce(to_jsonb(m) - array['id', 'module', 'logiciel', 'code', 'version', 'source', 'cree_le'], '{}'::jsonb)
       || p;
  insert into public.branchements_jeux (client_id, branchement_id, code, modele_id, libelle, motif_fichier, entetes, colonnes,
    cle, complet, fenetre, confirmer_disparition, seuil_perte, perte_min, seuil_anomalies, options, accuse, rythme, plages,
    attendu, actif)
  values (b.client_id, b.id, p_code, m.id, coalesce(d ->> 'libelle', p_code), d ->> 'motif_fichier',
    coalesce(private.tableau_texte(d -> 'entetes'), '{}'), coalesce(nullif(d -> 'colonnes', 'null'::jsonb), '{}'::jsonb),
    coalesce(private.tableau_texte(d -> 'cle'), '{}'), coalesce((d ->> 'complet')::boolean, true),
    nullif(d -> 'fenetre', 'null'::jsonb), coalesce((d ->> 'confirmer_disparition')::smallint, 1),
    coalesce((d ->> 'seuil_perte')::numeric, 0.2), coalesce((d ->> 'perte_min')::integer, 1),
    coalesce((d ->> 'seuil_anomalies')::numeric, 0.05), coalesce(nullif(d -> 'options', 'null'::jsonb), '{}'::jsonb),
    coalesce((d ->> 'accuse')::boolean, true), (d ->> 'rythme')::interval, nullif(d -> 'plages', 'null'::jsonb),
    nullif(d -> 'attendu', 'null'::jsonb), coalesce((d ->> 'actif')::boolean, true))
  returning id into v_id;
  return v_id;
end $function$


-- ═══ FONCTION private.demander_lecture
CREATE OR REPLACE FUNCTION private.demander_lecture()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.objet_id is not null and new.statut = 'recue' and new.source <> 'export'
     and (tg_op = 'INSERT' or old.objet_id is null or old.statut is distinct from new.statut) then
    perform private.deposer_travail(new.client_id, new.module, 'lecteur.lire',
      jsonb_build_object('piece', new.id), 'piece:' || new.id::text, 0::smallint);
  end if;
  return null;
end $function$


-- ═══ FONCTION private.deposer_reception
CREATE OR REPLACE FUNCTION private.deposer_reception(p_client uuid, p_canal text, p_boite text, p_identifiant text, p_de text DEFAULT NULL::text, p_de_nom text DEFAULT NULL::text, p_sujet text DEFAULT NULL::text, p_corps text DEFAULT NULL::text, p_corps_html text DEFAULT NULL::text, p_pieces jsonb DEFAULT '[]'::jsonb, p_detail jsonb DEFAULT '{}'::jsonb, p_recu_le timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id bigint; v_module text; v_entite uuid; v_reponse uuid; v_boite jsonb;
begin
  perform private.exiger_ouvrier();
  if p_client is null or p_canal is null or p_boite is null or p_identifiant is null then
    raise exception 'Réception incomplète : client, canal, boîte et identifiant externe sont obligatoires.' using errcode = '22023';
  end if;
  if p_canal not in ('email', 'whatsapp', 'sms', 'formulaire') then
    raise exception 'Canal inconnu : email, whatsapp, sms ou formulaire.' using errcode = '22023';
  end if;
  select id into v_id from public.receptions
   where client_id = p_client and canal = p_canal and identifiant_externe = p_identifiant;
  if v_id is not null then
    return jsonb_build_object('id', v_id, 'nouvelle', false);
  end if;
  v_boite := private.resoudre_boite(p_canal, p_boite);
  v_module := coalesce(p_detail ->> 'module', v_boite ->> 'module');
  v_entite := nullif(p_detail ->> 'entite_id', '')::uuid;
  -- Réponse à un envoi : par l'identifiant de message cité (detail.en_reponse_a = reference_externe) ou par l'uuid.
  if p_detail ? 'envoi_id' then
    v_reponse := nullif(p_detail ->> 'envoi_id', '')::uuid;
  elsif p_detail ? 'en_reponse_a' then
    select e.id into v_reponse from public.envois e
     where e.client_id = p_client and e.reference_externe = p_detail ->> 'en_reponse_a'
     order by e.cree_le desc limit 1;
  end if;
  insert into public.receptions (client_id, entite_id, module, canal, boite, identifiant_externe,
    de_adresse, de_empreinte, de_nom, sujet, corps, corps_html, pieces, detail, en_reponse_a, fil, langue, recu_le)
  values (p_client, v_entite, v_module, p_canal, p_boite, p_identifiant,
    p_de, case when p_de is null then null else encode(extensions.digest(lower(trim(p_de)), 'sha256'), 'hex') end,
    left(p_de_nom, 200), left(p_sujet, 1000), p_corps, p_corps_html,
    coalesce(p_pieces, '[]'::jsonb), coalesce(p_detail, '{}'::jsonb) - 'envoi_id' - 'en_reponse_a',
    v_reponse, p_detail ->> 'fil', p_detail ->> 'langue', coalesce(p_recu_le, now()))
  on conflict (client_id, canal, identifiant_externe) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.receptions
     where client_id = p_client and canal = p_canal and identifiant_externe = p_identifiant;
    return jsonb_build_object('id', v_id, 'nouvelle', false);
  end if;
  perform private.publier_evenement(p_client, 'reception.nouvelle',
    jsonb_build_object('reception', v_id, 'canal', p_canal, 'module', v_module, 'en_reponse_a', v_reponse),
    'reception:' || v_id);
  return jsonb_build_object('id', v_id, 'nouvelle', true);
end $function$


-- ═══ FONCTION private.deposer_section
CREATE OR REPLACE FUNCTION private.deposer_section(p_client uuid, p_module text, p_jour date, p_destinataire uuid, p_role text, p_titre text, p_items jsonb, p_entite uuid DEFAULT NULL::uuid, p_equipe uuid DEFAULT NULL::uuid, p_sante boolean DEFAULT false, p_donnees_du timestamp with time zone DEFAULT NULL::timestamp with time zone, p_incomplete boolean DEFAULT false, p_ordre integer DEFAULT 100)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_titre text := btrim(p_titre);
  v_items jsonb := '[]'::jsonb;
  v_existants jsonb;
  e jsonb;
  v_rang integer := 0;
  v_inconnus text;
  v_texte text;
  v_code text;
  v_version integer;
  v_id uuid;
  v_sante boolean;
begin
  if p_module is null or p_module !~ '^[a-z][a-z_]{1,29}$' then
    raise exception 'Module inconnu : %.', coalesce(p_module, 'vide') using errcode = '22023';
  end if;
  if not exists (select 1 from public.clients c where c.id = p_client) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  if p_jour is null then
    raise exception 'Une section vaut pour un jour.' using errcode = '22023';
  end if;
  if num_nonnulls(p_destinataire, p_role, p_equipe) <> 1 then
    raise exception 'Une section s''adresse à un membre, à un rôle ou à une équipe : un seul des trois.' using errcode = '22023';
  end if;
  if p_destinataire is not null
     and not exists (select 1 from public.comptes c where c.client_id = p_client and c.user_id = p_destinataire) then
    raise exception 'Ce destinataire n''est pas membre de l''organisation.' using errcode = '22023';
  end if;
  if p_role is not null and p_role not in ('gerant', 'admin', 'valideur', 'collaborateur', 'lecteur') then
    raise exception 'Rôle inconnu : %.', p_role using errcode = '22023';
  end if;
  if p_equipe is not null and not exists (select 1 from public.equipes q where q.client_id = p_client and q.id = p_equipe) then
    raise exception 'Équipe inconnue dans cette organisation.' using errcode = '22023';
  end if;
  if p_entite is not null and not exists (select 1 from public.entites en where en.client_id = p_client and en.id = p_entite) then
    raise exception 'Entité inconnue dans cette organisation.' using errcode = '22023';
  end if;
  if v_titre is null or char_length(v_titre) not between 1 and 120 or v_titre ~ '[[:cntrl:]]' then
    raise exception 'Le titre tient en une ligne de 120 caractères au plus.' using errcode = '22023';
  end if;
  if p_ordre is null or p_ordre not between 0 and 999 then
    raise exception 'L''ordre d''une section va de 0 à 999.' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 50 then
    raise exception 'Les lignes forment un tableau de 50 au plus ; vide, la section dit « rien à signaler ».' using errcode = '22023';
  end if;

  for e in select x.value from jsonb_array_elements(p_items) x loop
    v_rang := v_rang + 1;
    v_code := null;
    v_version := null;
    if jsonb_typeof(e) <> 'object' then
      raise exception 'La ligne % n''est pas un objet.', v_rang using errcode = '22023';
    end if;
    select string_agg(k, ', ' order by k) into v_inconnus
    from jsonb_object_keys(e) k
    where k not in ('texte', 'lien', 'gravite', 'objet_type', 'objet_id', 'gabarit', 'version', 'valeurs');
    if v_inconnus is not null then
      raise exception 'La ligne % porte des champs inconnus : %.', v_rang, v_inconnus using errcode = '22023';
    end if;
    if coalesce(e ->> 'gravite', '') not in ('info', 'attention', 'critique') then
      raise exception 'La ligne % : la gravité vaut info, attention ou critique.', v_rang using errcode = '22023';
    end if;
    if jsonb_typeof(e -> 'lien') is distinct from 'string' or not private.point_lien_valide(e ->> 'lien') then
      raise exception 'La ligne % : le lien est un chemin de l''espace, qui commence par « / ».', v_rang using errcode = '22023';
    end if;
    if (e ? 'objet_type') <> (e ? 'objet_id')
       or (e ? 'objet_type' and (jsonb_typeof(e -> 'objet_type') <> 'string'
                                 or (e ->> 'objet_type') !~ '^[a-z][a-z0-9_]{1,39}$'
                                 or jsonb_typeof(e -> 'objet_id') <> 'string'
                                 or char_length(e ->> 'objet_id') not between 1 and 120)) then
      raise exception 'La ligne % : un objet se désigne par son type et son identifiant.', v_rang using errcode = '22023';
    end if;
    if e ? 'texte' and jsonb_typeof(e -> 'texte') <> 'string' then
      raise exception 'La ligne % : le texte est une chaîne.', v_rang using errcode = '22023';
    end if;
    v_texte := nullif(btrim(e ->> 'texte'), '');
    if e ? 'gabarit' then
      if jsonb_typeof(e -> 'gabarit') <> 'string' or (e ? 'version' and jsonb_typeof(e -> 'version') <> 'number') then
        raise exception 'La ligne % : un gabarit se nomme par son code ; sa version est un nombre.', v_rang using errcode = '22023';
      end if;
      v_code := e ->> 'gabarit';
      v_version := coalesce((e ->> 'version')::integer,
                            (select max(g.version) from public.points_gabarits g where g.code = v_code and g.en_service));
      if not exists (select 1 from public.points_gabarits g where g.code = v_code and g.version = v_version and g.en_service) then
        raise exception 'La ligne % : gabarit inconnu ou retiré du service (%).', v_rang, v_code using errcode = '22023';
      end if;
      if split_part(v_code, '.', 1) <> p_module then
        raise exception 'La ligne % : un module n''emploie que ses propres gabarits.', v_rang using errcode = '22023';
      end if;
      -- Les valeurs sont vérifiées, même quand un texte les accompagne.
      v_texte := coalesce(v_texte, private.point_rendre_gabarit(v_code, v_version, e -> 'valeurs'));
      perform private.point_rendre_gabarit(v_code, v_version, e -> 'valeurs');
    elsif e ? 'version' or e ? 'valeurs' then
      raise exception 'La ligne % : version et valeurs accompagnent un gabarit.', v_rang using errcode = '22023';
    end if;
    -- Un objet chiffré (lot 14b) ne laisse rien de lui en clair : un gabarit, jamais de texte libre.
    if e ? 'objet_type' and exists (select 1 from private.objets_chiffres oc where oc.objet_type = e ->> 'objet_type')
       and (v_code is null or nullif(btrim(e ->> 'texte'), '') is not null) then
      raise exception 'La ligne % porte sur un objet chiffré (%) : un gabarit seulement, jamais de texte libre.',
        v_rang, e ->> 'objet_type' using errcode = '22023';
    end if;
    if v_texte is null or char_length(v_texte) > 300 or v_texte ~ '[[:cntrl:]]' then
      raise exception 'La ligne % : un texte d''une ligne, de 300 caractères au plus.', v_rang using errcode = '22023';
    end if;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'rang', v_rang, 'texte', v_texte, 'lien', e ->> 'lien', 'gravite', e ->> 'gravite',
      'objet_type', e ->> 'objet_type', 'objet_id', e ->> 'objet_id',
      'gabarit', v_code, 'gabarit_version', v_version,
      'valeurs', case when v_code is null then null else e -> 'valeurs' end));
  end loop;

  v_sante := coalesce(p_sante, false) or private.point_module_sante(p_module);
  perform pg_advisory_xact_lock(hashtextextended(concat_ws('|', 'section', p_client, p_module, p_jour, p_destinataire,
                                                           p_role, p_equipe, p_entite, v_titre), 0));
  select s.id into v_id
  from public.points_sections s
  where s.client_id = p_client and s.module = p_module and s.jour = p_jour
    and s.destinataire is not distinct from p_destinataire and s.role is not distinct from p_role
    and s.equipe_id is not distinct from p_equipe and s.entite_id is not distinct from p_entite and s.titre = v_titre;

  if v_id is null then
    insert into public.points_sections (client_id, module, jour, destinataire, role, equipe_id, entite_id, titre, ordre,
                                        sante, incomplete, donnees_du, nb_items)
    values (p_client, p_module, p_jour, p_destinataire, p_role, p_equipe, p_entite, v_titre, p_ordre,
            v_sante, coalesce(p_incomplete, false), p_donnees_du, v_rang)
    returning id into v_id;
  else
    select coalesce(jsonb_agg(jsonb_build_object(
             'rang', i.rang, 'texte', i.texte, 'lien', i.lien, 'gravite', i.gravite, 'objet_type', i.objet_type,
             'objet_id', i.objet_id, 'gabarit', i.gabarit, 'gabarit_version', i.gabarit_version, 'valeurs', i.valeurs)
             order by i.rang), '[]'::jsonb)
      into v_existants
    from public.points_items i where i.section_id = v_id;
    if v_existants = v_items and exists (
        select 1 from public.points_sections s
        where s.id = v_id and s.ordre = p_ordre and s.sante = v_sante and s.incomplete = coalesce(p_incomplete, false)
          and s.donnees_du is not distinct from p_donnees_du) then
      return v_id;   -- rien n'a changé : ni écriture, ni journal
    end if;
    update public.points_sections
       set ordre = p_ordre, sante = v_sante, incomplete = coalesce(p_incomplete, false), donnees_du = p_donnees_du,
           nb_items = v_rang, maj_le = now()
     where id = v_id;
    delete from public.points_items where section_id = v_id;
  end if;

  insert into public.points_items (client_id, section_id, rang, texte, lien, gravite, objet_type, objet_id,
                                   gabarit, gabarit_version, valeurs)
  select p_client, v_id, (x ->> 'rang')::smallint, x ->> 'texte', x ->> 'lien', x ->> 'gravite', x ->> 'objet_type',
         x ->> 'objet_id', x ->> 'gabarit', (x ->> 'gabarit_version')::smallint, nullif(x -> 'valeurs', 'null'::jsonb)
  from jsonb_array_elements(v_items) x;
  return v_id;
end $function$


-- ═══ FONCTION private.deposer_travail
CREATE OR REPLACE FUNCTION private.deposer_travail(p_client uuid, p_module text, p_genre text, p_charge jsonb DEFAULT '{}'::jsonb, p_cle text DEFAULT NULL::text, p_priorite smallint DEFAULT 0)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id bigint;
begin
  insert into public.travaux (client_id, module, genre, charge, cle, priorite)
  values (p_client, p_module, p_genre, coalesce(p_charge, '{}'::jsonb), p_cle, coalesce(p_priorite, 0))
  on conflict (genre, cle) where cle is not null and etat in ('a_faire', 'en_cours') do nothing
  returning id into v_id;
  if v_id is null then
    select t.id into v_id from public.travaux t
    where t.genre = p_genre and t.cle = p_cle and t.etat in ('a_faire', 'en_cours') limit 1;
  end if;
  return v_id;
end $function$


-- ═══ FONCTION private.echouer_travail
CREATE OR REPLACE FUNCTION private.echouer_travail(p_id bigint, p_erreur text, p_reprendre boolean DEFAULT true)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_t public.travaux;
begin
  select * into v_t from public.travaux where id = p_id and etat = 'en_cours' for update;
  if not found then
    raise exception 'Travail introuvable ou pas en cours : %.', p_id using errcode = 'P0002';
  end if;
  if coalesce(p_reprendre, true) and v_t.essais < v_t.essais_max then
    update public.travaux
       set etat = 'a_faire', erreur = left(p_erreur, 2000), verrou_jusqu_au = null,
           prochain_le = now() + least(interval '6 hours', interval '1 minute' * power(2, v_t.essais - 1))
     where id = p_id;
    return 'repris';
  end if;
  update public.travaux
     set etat = 'echec', erreur = left(p_erreur, 2000), verrou_jusqu_au = null, fini_le = now()
   where id = p_id;
  perform private.lever_alerte(v_t.client_id, true, 'critique', v_t.module,
    format('Travail en échec : %s', v_t.genre),
    jsonb_build_object('travail', v_t.id, 'genre', v_t.genre, 'essais', v_t.essais, 'erreur', left(p_erreur, 300)),
    'travail:' || v_t.genre || ':' || coalesce(v_t.cle, v_t.id::text));
  return 'echec';
end $function$


-- ═══ FONCTION private.enregistrer_lecture
CREATE OR REPLACE FUNCTION private.enregistrer_lecture(p_piece uuid, p_resultat jsonb, p_version text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_p public.pieces;
  v_statut text := p_resultat ->> 'statut';
  v_pages integer;
  v_valeurs integer;
begin
  select * into v_p from public.pieces where id = p_piece for update;
  if not found then
    raise exception 'Pièce introuvable.' using errcode = 'P0002';
  end if;
  if v_p.statut <> 'en_lecture' then
    raise exception 'La pièce n''est pas en lecture (statut %).', v_p.statut using errcode = '55000';
  end if;
  if v_statut is null or v_statut not in ('lue', 'a_verifier', 'a_classer', 'rejetee', 'echec') then
    raise exception 'Statut de lecture inconnu : %.', coalesce(v_statut, 'vide') using errcode = '22023';
  end if;
  if v_p.chiffrement is not null then
    if exists (select 1 from jsonb_array_elements(coalesce(p_resultat -> 'pages', '[]'::jsonb)) e
               where coalesce(e ->> 'texte', '') <> '' or e ->> 'texte_chiffre' is null)
       or exists (select 1 from jsonb_array_elements(coalesce(p_resultat -> 'valeurs', '[]'::jsonb)) e
                  where e ->> 'source' is distinct from 'humain'
                    and (e ->> 'chiffre' is null or coalesce(e -> 'valeur', 'null'::jsonb) <> 'null'::jsonb
                         or e ->> 'texte' is not null or coalesce(e -> 'boite', 'null'::jsonb) <> 'null'::jsonb
                         or e ->> 'controle' is not null)) then
      raise exception 'Pièce chiffrée (%) : ni texte ni valeur en clair.', v_p.chiffrement using errcode = '22023';
    end if;
  elsif exists (select 1 from jsonb_array_elements(coalesce(p_resultat -> 'pages', '[]'::jsonb)) e where e ? 'texte_chiffre')
     or exists (select 1 from jsonb_array_elements(coalesce(p_resultat -> 'valeurs', '[]'::jsonb)) e where e ? 'chiffre') then
    raise exception 'Pièce en clair : rien ne s''y écrit chiffré.' using errcode = '22023';
  end if;

  delete from public.pieces_valeurs where piece_id = p_piece and source <> 'humain';
  delete from public.pieces_pages where piece_id = p_piece;

  insert into public.pieces_pages (client_id, piece_id, n, methode, texte, texte_chiffre, confiance, largeur, hauteur)
  select v_p.client_id, p_piece, (e ->> 'n')::integer, e ->> 'methode',
         case when v_p.chiffrement is null then coalesce(e ->> 'texte', '') else '' end,
         case when v_p.chiffrement is not null then decode(e ->> 'texte_chiffre', 'base64') end,
         (e ->> 'confiance')::numeric, (e ->> 'largeur')::numeric, (e ->> 'hauteur')::numeric
  from jsonb_array_elements(coalesce(p_resultat -> 'pages', '[]'::jsonb)) e;
  get diagnostics v_pages = row_count;

  insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, page, boite, source, confiance, verifiee,
                                     controle, chiffre)
  select v_p.client_id, p_piece, e ->> 'champ',
         case when v_p.chiffrement is null then coalesce(e -> 'valeur', 'null'::jsonb) else 'null'::jsonb end,
         case when v_p.chiffrement is null then left(e ->> 'texte', 2000) end,
         (e ->> 'page')::integer,
         case when v_p.chiffrement is null then nullif(e -> 'boite', 'null'::jsonb) end,
         e ->> 'source', (e ->> 'confiance')::numeric, coalesce((e ->> 'verifiee')::boolean, false),
         case when v_p.chiffrement is null then left(e ->> 'controle', 300) end,
         case when v_p.chiffrement is not null then decode(e ->> 'chiffre', 'base64') end
  from jsonb_array_elements(coalesce(p_resultat -> 'valeurs', '[]'::jsonb)) e
  where e ->> 'source' is distinct from 'humain';
  get diagnostics v_valeurs = row_count;

  update public.pieces
     set statut = v_statut,
         type_piece = nullif(p_resultat ->> 'type_piece', ''),
         confiance_type = (p_resultat ->> 'confiance_type')::numeric,
         nb_pages = coalesce((p_resultat ->> 'nb_pages')::integer, v_pages),
         methode = nullif(p_resultat ->> 'methode', ''),
         version_lecteur = left(p_version, 40),
         motif = left(p_resultat ->> 'motif', 500),
         lue_le = now()
   where id = p_piece;

  if v_statut in ('lue', 'a_verifier') then
    perform private.publier_evenement(v_p.client_id, 'piece_lue.' || v_p.module,
      jsonb_build_object('piece', p_piece, 'module', v_p.module, 'objet_type', v_p.objet_type,
                         'objet_id', v_p.objet_id, 'type_piece', nullif(p_resultat ->> 'type_piece', ''),
                         'statut', v_statut, 'chiffrement', v_p.chiffrement),
      p_piece::text || ':' || coalesce(p_version, ''));
  end if;
  return jsonb_build_object('pages', v_pages, 'valeurs', v_valeurs, 'statut', v_statut);
end $function$


-- ═══ FONCTION private.enregistrer_mesure
CREATE OR REPLACE FUNCTION private.enregistrer_mesure(p_client uuid, p_indicateur text, p_version integer, p_periode_type text, p_periode_debut date, p_valeur numeric, p_base numeric, p_mode text, p_numerateur numeric DEFAULT NULL::numeric, p_entite uuid DEFAULT NULL::uuid, p_objet_type text DEFAULT NULL::text, p_objet_id text DEFAULT NULL::text, p_objet_libelle text DEFAULT NULL::text, p_periode_fin date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ind public.indicateurs;
  v_fin date;
  v_valeur numeric;
  v_num numeric;
  v_libelle text := nullif(btrim(p_objet_libelle), '');
  v_grain text;
  v_id uuid;
begin
  if not exists (select 1 from public.clients c where c.id = p_client) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  select * into v_ind from public.indicateurs i where i.code = p_indicateur and i.version = p_version;
  if not found then
    raise exception 'Indicateur inconnu : % (version %).', coalesce(p_indicateur, 'vide'), coalesce(p_version::text, '?')
      using errcode = '22023', hint = 'Un indicateur s''inscrit par migration dans public.indicateurs.';
  end if;
  if not v_ind.en_service then
    raise exception 'La version % de % est retirée du service.', p_version, p_indicateur using errcode = '22023';
  end if;
  if p_mode is null or p_mode not in ('a_blanc', 'reel') then
    raise exception 'Le mode vaut a_blanc (la situation de départ) ou reel.' using errcode = '22023';
  end if;
  if p_periode_debut is null then
    raise exception 'Une mesure porte sur une période : son début est nécessaire.' using errcode = '22023';
  end if;
  if p_periode_debut > current_date + 1 then
    raise exception 'Une mesure ne porte pas sur l''avenir.' using errcode = '22023';
  end if;

  case p_periode_type
    when 'jour' then
      v_fin := p_periode_debut;
    when 'semaine' then
      if extract(isodow from p_periode_debut) <> 1 then
        raise exception 'Une semaine commence un lundi.' using errcode = '22023';
      end if;
      v_fin := p_periode_debut + 6;
    when 'mois' then
      if extract(day from p_periode_debut) <> 1 then
        raise exception 'Un mois commence le 1er.' using errcode = '22023';
      end if;
      v_fin := (p_periode_debut + interval '1 month')::date - 1;
    when 'libre' then
      if p_mode <> 'a_blanc' then
        raise exception 'Une période libre ne vaut que pour la mesure à blanc : le réel se mesure par jour, semaine ou mois.'
          using errcode = '22023';
      end if;
      if p_periode_fin is null or p_periode_fin < p_periode_debut or p_periode_fin - p_periode_debut > 366 then
        raise exception 'Une période libre a une fin (dernier jour compris), d''un an au plus.' using errcode = '22023';
      end if;
      v_fin := p_periode_fin;
    else
      raise exception 'Période inconnue : jour, semaine, mois ou libre.' using errcode = '22023';
  end case;
  if p_periode_type <> 'libre' and p_periode_fin is not null and p_periode_fin <> v_fin then
    raise exception 'La période % qui commence le % finit le %.', p_periode_type, p_periode_debut, v_fin using errcode = '22023';
  end if;
  if (p_objet_type is null) <> (p_objet_id is null) then
    raise exception 'Un objet se désigne par son type et son identifiant.' using errcode = '22023';
  end if;
  if v_libelle is not null and p_objet_id is null then
    raise exception 'Un libellé d''objet accompagne un objet.' using errcode = '22023';
  end if;
  if p_entite is not null and not exists (select 1 from public.entites e where e.client_id = p_client and e.id = p_entite) then
    raise exception 'Entité inconnue dans cette organisation.' using errcode = '22023';
  end if;

  if v_ind.agregation = 'moyenne' then
    if p_base is null or p_base <= 0 then
      raise exception 'Une moyenne (un taux) a une base positive : son dénominateur.' using errcode = '22023';
    end if;
    if p_numerateur is null and p_valeur is null then
      raise exception 'Une moyenne a un numérateur, ou une valeur.' using errcode = '22023';
    end if;
    v_num := coalesce(p_numerateur, p_valeur * p_base);
    v_valeur := v_num / p_base;
    if p_valeur is not null and abs(p_valeur - v_valeur) > 0.005 + 0.005 * abs(v_valeur) then
      raise exception 'Valeur incohérente : % ne vaut pas % ÷ %.', p_valeur, v_num, p_base
        using errcode = '22023', hint = 'Un pourcentage s''enregistre en fraction : 0,78 pour 78 %.';
    end if;
  else
    if p_valeur is null then
      raise exception 'Une valeur est nécessaire.' using errcode = '22023';
    end if;
    if p_numerateur is not null then
      raise exception 'Un numérateur ne sert qu''aux moyennes.' using errcode = '22023';
    end if;
    if p_base is not null and p_base < 0 then
      raise exception 'Une base est positive.' using errcode = '22023';
    end if;
    v_valeur := p_valeur;
    v_num := null;
  end if;

  -- Une série garde un seul grain : deux grains ensemble compteraient deux fois.
  perform pg_advisory_xact_lock(hashtextextended(concat_ws('|', 'mesure', p_client, p_indicateur, p_version, p_mode,
                                                           p_entite, p_objet_type, p_objet_id), 0));
  select m.periode_type into v_grain
  from public.mesures m
  where m.client_id = p_client and m.indicateur = p_indicateur and m.version = p_version and m.mode = p_mode
    and m.entite_id is not distinct from p_entite and m.objet_type is not distinct from p_objet_type
    and m.objet_id is not distinct from p_objet_id and m.periode_type <> p_periode_type
  limit 1;
  if v_grain is not null then
    raise exception 'Cette série se mesure déjà par %, pas par % : un seul grain par série.', v_grain, p_periode_type
      using errcode = '22023', hint = 'Enregistrer le grain le plus fin : le rapport en tire la semaine et le mois.';
  end if;
  if p_periode_type = 'libre' and exists (
      select 1 from public.mesures m
      where m.client_id = p_client and m.indicateur = p_indicateur and m.version = p_version and m.mode = p_mode
        and m.entite_id is not distinct from p_entite and m.objet_type is not distinct from p_objet_type
        and m.objet_id is not distinct from p_objet_id
        and (m.debut, m.fin) <> (p_periode_debut, v_fin)
        and m.debut <= v_fin and m.fin >= p_periode_debut) then
    raise exception 'Cette période chevauche une autre mesure à blanc de la série.' using errcode = '22023';
  end if;

  select m.id into v_id
  from public.mesures m
  where m.client_id = p_client and m.indicateur = p_indicateur and m.version = p_version and m.mode = p_mode
    and m.periode_type = p_periode_type and m.debut = p_periode_debut and m.fin = v_fin
    and m.entite_id is not distinct from p_entite and m.objet_type is not distinct from p_objet_type
    and m.objet_id is not distinct from p_objet_id;
  if v_id is null then
    insert into public.mesures (client_id, indicateur, version, mode, periode_type, debut, fin, valeur, numerateur, base,
                                entite_id, objet_type, objet_id, objet_libelle)
    values (p_client, p_indicateur, p_version, p_mode, p_periode_type, p_periode_debut, v_fin, v_valeur, v_num, p_base,
            p_entite, p_objet_type, p_objet_id, v_libelle)
    returning id into v_id;
  else
    -- Recalculer remplace ; sans changement, ni écriture ni journal.
    update public.mesures m
       set valeur = v_valeur, numerateur = v_num, base = p_base,
           objet_libelle = coalesce(v_libelle, m.objet_libelle), maj_le = now()
     where m.id = v_id
       and (m.valeur, m.numerateur, m.base, m.objet_libelle)
           is distinct from (v_valeur, v_num, p_base, coalesce(v_libelle, m.objet_libelle));
  end if;
  return v_id;
end $function$


-- ═══ FONCTION private.exiger_decideur
CREATE OR REPLACE FUNCTION private.exiger_decideur(p_d demandes_validation, p_decideur uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_role text;
  v_equipe text;
begin
  select c.role into v_role from public.comptes c
  where c.user_id = p_decideur and c.client_id = p_d.client_id;
  if v_role is null or not (v_role = any (p_d.roles_autorises)) then
    raise exception 'Ce rôle ne peut pas décider de cette demande.' using errcode = '42501';
  end if;
  if not private.perimetre_couvre(p_decideur, p_d.client_id, p_d.entite_id) then
    raise exception 'Cette demande est hors de votre périmètre.' using errcode = '42501';
  end if;
  if p_d.equipe_id is not null and not private.dans_equipe(p_decideur, p_d.equipe_id) then
    select e.nom into v_equipe from public.equipes e where e.id = p_d.equipe_id;
    raise exception 'Cette demande revient à l''équipe « % ».', coalesce(v_equipe, '?') using errcode = '42501';
  end if;
  if not private.voit_objet_pour(p_decideur, p_d.client_id, p_d.objet_type, p_d.objet_id) then
    raise exception 'Vous n''avez pas accès à l''objet de cette demande.' using errcode = '42501';
  end if;
end $function$


-- ═══ FONCTION private.exiger_gestion_releve
CREATE OR REPLACE FUNCTION private.exiger_gestion_releve(p_client uuid, p_entite uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is null then
    if coalesce(nullif(current_setting('role', true), 'none'), session_user::text) in ('service_role', 'postgres') then
      return;
    end if;
    raise exception 'Seuls un gérant ou un administrateur de l''organisation, ou Omega, règlent ses branchements.'
      using errcode = '42501';
  end if;
  if not private.a_un_role(p_client, array['gerant', 'admin'])
     or (p_entite is not null and not private.voit_entite(p_client, p_entite)) then
    raise exception 'Seuls un gérant ou un administrateur de l''organisation, ou Omega, règlent ses branchements.'
      using errcode = '42501';
  end if;
end $function$


-- ═══ FONCTION private.exporter_client
CREATE OR REPLACE FUNCTION private.exporter_client(p_client uuid, p_demandeur uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  v_tables jsonb := '{}'::jsonb;
  v_lignes jsonb;
  v_empreinte text;
begin
  if not exists (select 1 from public.clients where id = p_client) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;

  for r in select t.nom from private.tables_locataires t order by t.nom loop
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text), ''[]''::jsonb) from public.%I x where x.client_id = $1',
      r.nom)
    into v_lignes using p_client;
    v_tables := v_tables || jsonb_build_object(r.nom, v_lignes);
  end loop;

  v_tables := v_tables || jsonb_build_object('clients', (
    select coalesce(jsonb_agg(
      (to_jsonb(c) - 'stripe_customer_id') || jsonb_build_object('config', (
        select coalesce(jsonb_object_agg(e.cle, e.valeur), '{}'::jsonb)
        from jsonb_each(c.config) as e(cle, valeur)
        where e.cle !~* '(token|secret|jeton|password|mot_de_passe|cle_api|api_key)'))), '[]'::jsonb)
    from public.clients c where c.id = p_client));

  v_tables := v_tables || jsonb_build_object('fichiers', (
    select coalesce(jsonb_agg(jsonb_build_object('bucket', f.bucket, 'nom', f.nom, 'octets', f.octets,
                                                 'empreinte', f.empreinte, 'cree_le', f.cree_le)
                              order by f.bucket, f.nom), '[]'::jsonb)
    from private.fichiers_de(p_client) f));

  v_empreinte := encode(sha256(convert_to(v_tables::text, 'UTF8')), 'hex');

  perform private.journaliser(p_client, 'donnees.export', 'clients', p_client::text,
    jsonb_build_object('empreinte_sha256', v_empreinte, 'demandeur', p_demandeur));

  return jsonb_build_object(
    'organisation', p_client,
    'genere_le', to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'empreinte_sha256', v_empreinte,
    'tables', v_tables);
end $function$


-- ═══ FONCTION private.fenetre_jeu_valide
CREATE OR REPLACE FUNCTION private.fenetre_jeu_valide(p jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
begin
  if p is null then
    return true;
  end if;
  if jsonb_typeof(p) <> 'object' or coalesce(p ->> 'colonne', '') !~ '^[a-z][a-z0-9_]{0,62}$'
     or exists (select 1 from jsonb_object_keys(p) x where x not in ('colonne', 'du', 'au', 'observee')) then
    return false;
  end if;
  if p ? 'observee' then
    return p -> 'observee' = 'true'::jsonb and not (p ? 'du') and not (p ? 'au');
  end if;
  if jsonb_typeof(p -> 'du') is distinct from 'number' or jsonb_typeof(p -> 'au') is distinct from 'number'
     or (p ->> 'du') !~ '^-?[0-9]{1,5}$' or (p ->> 'au') !~ '^-?[0-9]{1,5}$' then
    return false;
  end if;
  return (p ->> 'du')::integer <= (p ->> 'au')::integer;
end $function$


-- ═══ FONCTION private.fermer_alertes_releve
CREATE OR REPLACE FUNCTION private.fermer_alertes_releve(p_client uuid, p_module text, p_cle text, p_resolution text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n integer;
begin
  update public.alertes
     set acquittee_le = now(), detail = detail || jsonb_build_object('resolution', p_resolution)
   where client_id = p_client and acquittee_le is null
     and (cle_regroupement = p_module || ':' || p_cle or starts_with(cle_regroupement, p_module || ':' || p_cle || '.'));
  get diagnostics n = row_count;
  return n;
end $function$


-- ═══ FONCTION private.filed_arreter_export
CREATE OR REPLACE FUNCTION private.filed_arreter_export(p_programme uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_p public.filed_exports_programmes;
begin
  select * into v_p from public.filed_exports_programmes where id = p_programme for update;
  if not found then raise exception 'Export programmé introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(v_p.client_id, array['gerant', 'admin'], v_p.entite_id);
  update public.filed_exports_programmes set actif = false, maj_le = now() where id = p_programme;
  perform private.filed_journaliser(v_p.client_id, 'filed.export.arret', 'filed_export_programme', v_p.id::text, '{}'::jsonb, v_p.entite_id);
end $function$


-- ═══ FONCTION private.filed_controler_facture
CREATE OR REPLACE FUNCTION private.filed_controler_facture(p_facture uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_f public.filed_factures;
  v_doc public.filed_documents;
  v_four public.filed_fournisseurs;
  v_ent public.entites;
  v_reglage public.filed_reglages;
  v_regime_ter text;
  v_regime text;
  v_manque text[] := '{}';
  v_tol numeric;
  v_ecart numeric;
  v_somme numeric;
  v_nb_lignes integer;
  v_autre public.filed_factures;
  v_autre_ref text;
  v_ecartee uuid;
  v_ib public.filed_fournisseurs_ibans;
  v_autre_four public.filed_fournisseurs;
  v_pays_iban text;
  v_taux_ok numeric[];
  v_taux_fr numeric[];
  v_taux numeric;
  v_taux_trouve numeric;
  v_hors text[];
  v_tol_taux numeric;
  v_ach_siren text;
  v_ent_siren text;
  v_autre_ent public.entites;
  v_auj date;
  v_statut text;
  v_anomalies text[];
  v_bloquants integer;
  v_attention integer;
  v_lecture boolean;
  v_message text;
begin
  select * into v_f from public.filed_factures where id = p_facture for update;
  if not found then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  select * into v_doc from public.filed_documents where id = v_f.document_id;
  select * into v_four from public.filed_fournisseurs where id = v_f.fournisseur_id;
  select * into v_ent from public.entites where id = v_f.entite_id;
  v_reglage := private.filed_reglage(v_f.client_id, v_f.entite_id);
  v_tol := coalesce(v_reglage.tolerance_totaux, 0.05);
  v_auj := (now() at time zone coalesce(v_ent.fuseau, 'Europe/Paris'))::date;
  select count(*) into v_nb_lignes from public.filed_factures_lignes l where l.facture_id = v_f.id;

  delete from public.filed_controles where facture_id = v_f.id;

  -- ── La lecture : ce qui manque, ce qui reste à vérifier ──
  if v_f.numero is null then v_manque := array_append(v_manque, 'le numéro'); end if;
  if v_f.date_emission is null then v_manque := array_append(v_manque, 'la date d''émission'); end if;
  if v_f.montant_ttc is null then v_manque := array_append(v_manque, 'le total TTC'); end if;
  if v_f.montant_ht is null or v_f.montant_tva is null then v_manque := array_append(v_manque, 'le HT et la TVA'); end if;
  if v_f.fournisseur_id is null then v_manque := array_append(v_manque, 'le fournisseur'); end if;
  perform private.filed_poser_resultat(v_f, 'lecture.complete', 'bloquant', cardinality(v_manque) > 0,
    case when cardinality(v_manque) = 0 then 'Les champs essentiels sont lus.'
         else 'À compléter : ' || array_to_string(v_manque, ', ') || '.' end,
    'NON_CONFORME', jsonb_build_object('manque', to_jsonb(v_manque)));
  perform private.filed_poser_resultat(v_f, 'lecture.verifiee', 'bloquant', jsonb_array_length(v_f.champs_douteux) > 0,
    case when jsonb_array_length(v_f.champs_douteux) = 0 then 'Chaque valeur retenue est vérifiée sur la pièce.'
         else 'À vérifier sur la pièce : ' || (select string_agg(x ->> 'champ' || coalesce(' (' || (x ->> 'controle') || ')', ''), ', ')
                                                from jsonb_array_elements(v_f.champs_douteux) x) || '.' end,
    null, jsonb_build_object('champs', v_f.champs_douteux));

  -- ── Les montants ──
  if v_f.montant_ttc is not null then
    perform private.filed_poser_resultat(v_f, 'montant.nul', 'bloquant', v_f.montant_ttc = 0,
      case when v_f.montant_ttc = 0 then 'Total à zéro : une lecture ratée, le plus souvent. La pièce attend une personne.'
           else 'Le total n''est pas nul.' end, 'MONTANTTOTAL_ERR');
    perform private.filed_poser_resultat(v_f, 'montant.signe', 'bloquant', v_f.nature = 'facture' and v_f.montant_ttc < 0,
      case when v_f.nature = 'facture' and v_f.montant_ttc < 0
           then 'Total négatif sur une facture : c''est peut-être un avoir.' else 'Le signe du total est cohérent.' end,
      'MONTANTTOTAL_ERR', '{}'::jsonb, v_f.montant_ttc::text);
  end if;
  if v_f.montant_ht is not null and v_f.montant_tva is not null and v_f.montant_ttc is not null then
    v_ecart := v_f.montant_ht + v_f.montant_tva - v_f.montant_ttc;
    perform private.filed_poser_resultat(v_f, 'montant.coherence', 'bloquant', abs(v_ecart) > v_tol,
      case when abs(v_ecart) > v_tol
           then format('HT + TVA − TTC = %s : l''écart dépasse la tolérance de %s. La pièce attend une personne.',
                       private.filed_montant_texte(v_ecart), private.filed_montant_texte(v_tol))
           else 'HT + TVA = TTC.' end,
      'CALCUL_ERR', jsonb_build_object('ht', v_f.montant_ht, 'tva', v_f.montant_tva, 'ttc', v_f.montant_ttc,
                                       'ecart', v_ecart, 'tolerance', v_tol), v_ecart::text);
  end if;
  if v_nb_lignes > 0 and v_f.montant_ht is not null then
    select sum(l.montant_ht) into v_somme from public.filed_factures_lignes l where l.facture_id = v_f.id;
    if v_somme is not null then
      perform private.filed_poser_resultat(v_f, 'montant.lignes', 'attention', abs(v_somme - v_f.montant_ht) > v_tol,
        case when abs(v_somme - v_f.montant_ht) > v_tol
             then format('Les lignes font %s pour un HT de %s : remise ou frais au pied de la facture, ou ligne mal lue.',
                         private.filed_montant_texte(v_somme), private.filed_montant_texte(v_f.montant_ht))
             else 'La somme des lignes égale le HT.' end,
        'CALCUL_ERR', jsonb_build_object('somme_lignes', v_somme, 'ht', v_f.montant_ht, 'lignes', v_nb_lignes));
    end if;
  end if;
  if v_f.net_a_payer is not null and v_f.montant_ttc is not null and v_f.net_a_payer <> v_f.montant_ttc then
    perform private.filed_poser_resultat(v_f, 'montant.net_a_payer', 'info', true,
      format('Net à payer de %s pour un TTC de %s : un acompte ou un paiement déjà fait est déduit.',
             private.filed_montant_texte(v_f.net_a_payer), private.filed_montant_texte(v_f.montant_ttc)),
      null, jsonb_build_object('net_a_payer', v_f.net_a_payer, 'ttc', v_f.montant_ttc));
  end if;
  if v_f.devise <> 'EUR' then
    perform private.filed_poser_resultat(v_f, 'montant.devise', 'info', true,
      format('Montants en %s, lus tels qu''ils figurent sur la pièce, sans conversion.', v_f.devise));
  end if;
  if cardinality(v_f.montants_calcules) > 0 then
    perform private.filed_poser_resultat(v_f, 'montant.calcule', 'info', true,
      'Montant déduit des autres, faute de ligne sur la pièce : ' || array_to_string(v_f.montants_calcules, ', ') || '.',
      null, jsonb_build_object('champs', to_jsonb(v_f.montants_calcules)));
  end if;

  -- ── Les doublons : numéro, année de la date d'émission, SIREN du fournisseur
  -- (règles G1.42 et G1.45 de la DGFiP). Seule une pièce reçue plus tôt fait
  -- d'une autre son doublon. ──
  if v_f.numero_normalise is not null and v_f.date_emission is not null and v_f.fournisseur_id is not null then
    select e.* into v_autre
    from public.filed_factures e
    join public.filed_documents d on d.id = e.document_id
    left join public.filed_fournisseurs ef on ef.id = e.fournisseur_id
    where e.client_id = v_f.client_id and e.id <> v_f.id and e.nature = v_f.nature and e.statut <> 'ecartee'
      and (e.fournisseur_id = v_f.fournisseur_id or (v_four.siren is not null and ef.siren = v_four.siren))
      and e.numero_normalise = v_f.numero_normalise
      and extract(year from e.date_emission) = extract(year from v_f.date_emission)
      and (d.annee_reception, d.numero_reception) < (v_doc.annee_reception, v_doc.numero_reception)
    order by d.annee_reception, d.numero_reception
    limit 1;
    if v_autre.id is not null then
      select d.reference into v_autre_ref from public.filed_documents d where d.id = v_autre.document_id;
      if v_autre.montant_ttc is not distinct from v_f.montant_ttc and v_autre.date_emission = v_f.date_emission then
        v_ecartee := v_autre.id;
      end if;
    end if;
    perform private.filed_poser_resultat(v_f, 'doublon.exact', 'bloquant', v_autre.id is not null,
      case when v_autre.id is null then 'Aucune autre facture de ce fournisseur ne porte ce numéro cette année.'
           when v_ecartee is not null then format('Même facture que la pièce %s : même numéro, même date, même montant. Écartée, elle reste consultable.', v_autre_ref)
           else format('Même numéro que la pièce %s, pour un montant de %s au lieu de %s : un numéro ne sert qu''une fois.',
                       v_autre_ref, private.filed_montant_texte(v_f.montant_ttc), private.filed_montant_texte(v_autre.montant_ttc)) end,
      'DOUBLON', case when v_autre.id is null then '{}'::jsonb
                      else jsonb_build_object('facture', v_autre.id, 'piece', v_autre_ref) end,
      coalesce(v_autre.id::text, ''));
  end if;
  if v_f.montant_ttc is not null and v_f.date_emission is not null and v_f.fournisseur_id is not null and v_ecartee is null then
    v_autre := null;
    select e.* into v_autre
    from public.filed_factures e join public.filed_documents d on d.id = e.document_id
    where e.client_id = v_f.client_id and e.id <> v_f.id and e.nature = v_f.nature and e.statut <> 'ecartee'
      and e.fournisseur_id = v_f.fournisseur_id and e.montant_ttc = v_f.montant_ttc
      and e.numero_normalise is distinct from v_f.numero_normalise
      and abs(e.date_emission - v_f.date_emission) <= coalesce(v_reglage.doublon_fenetre_jours, 3)
      and (d.annee_reception, d.numero_reception) < (v_doc.annee_reception, v_doc.numero_reception)
    order by d.annee_reception, d.numero_reception
    limit 1;
    if v_autre.id is not null then
      select d.reference into v_autre_ref from public.filed_documents d where d.id = v_autre.document_id;
    end if;
    perform private.filed_poser_resultat(v_f, 'doublon.probable', 'bloquant', v_autre.id is not null,
      case when v_autre.id is null then 'Aucune facture voisine du même fournisseur au même montant.'
           else format('Même fournisseur, même montant (%s), à %s jour(s) de la pièce %s : doublon probable, sous un autre numéro.',
                       private.filed_montant_texte(v_f.montant_ttc), abs(v_autre.date_emission - v_f.date_emission), v_autre_ref) end,
      'DOUBLON', case when v_autre.id is null then '{}'::jsonb
                      else jsonb_build_object('facture', v_autre.id, 'piece', v_autre_ref, 'numero', v_autre.numero) end,
      coalesce(v_autre.id::text, ''));
    v_autre := null;
    select e.* into v_autre
    from public.filed_factures e join public.filed_documents d on d.id = e.document_id
    where e.client_id = v_f.client_id and e.id <> v_f.id and e.fournisseur_id is distinct from v_f.fournisseur_id
      and e.numero_normalise = v_f.numero_normalise and e.montant_ttc = v_f.montant_ttc
      and e.date_emission = v_f.date_emission and e.statut <> 'ecartee'
      and (d.annee_reception, d.numero_reception) < (v_doc.annee_reception, v_doc.numero_reception)
    limit 1;
    if v_autre.id is not null then
      select d.reference into v_autre_ref from public.filed_documents d where d.id = v_autre.document_id;
      perform private.filed_poser_resultat(v_f, 'doublon.autre_fournisseur', 'attention', true,
        format('Même numéro, même date et même montant que la pièce %s, sous un autre fournisseur : la même facture présentée deux fois ?', v_autre_ref),
        'DOUBLON', jsonb_build_object('facture', v_autre.id, 'piece', v_autre_ref), v_autre.id::text);
    end if;
  end if;

  -- ── Le fournisseur ──
  if v_four.id is not null then
    perform private.filed_poser_resultat(v_f, 'fournisseur.a_confirmer', 'bloquant', v_four.statut = 'a_confirmer',
      case when v_four.statut = 'a_confirmer'
           then format('Fournisseur nouveau (%s) : une personne le confirme avant tout paiement.', private.filed_libelle_fournisseur(v_four))
           else 'Fournisseur connu.' end,
      'EMMET_INC', jsonb_build_object('fournisseur', v_four.id));
    if v_four.statut = 'refuse' then
      perform private.filed_poser_resultat(v_f, 'fournisseur.refuse', 'bloquant', true,
        format('Fournisseur refusé par une personne (%s) : ne pas payer.', coalesce(v_four.motif, 'sans motif écrit')),
        'EMMET_INC', jsonb_build_object('fournisseur', v_four.id));
    end if;
    if v_four.statut = 'bloque' then
      perform private.filed_poser_resultat(v_f, 'fournisseur.bloque', 'bloquant', true,
        format('Fournisseur bloqué (%s) : aucune facture ne passe.', coalesce(v_four.motif, 'sans motif écrit')),
        'CREANCIER_ERR', jsonb_build_object('fournisseur', v_four.id));
    end if;
    if v_f.fournisseur_identification = 'nom' then
      perform private.filed_poser_resultat(v_f, 'fournisseur.identification', 'attention', true,
        'Fournisseur reconnu à son seul nom, faute de SIREN ou de TVA lisibles : vérifier.', null,
        jsonb_build_object('fournisseur', v_four.id));
    end if;
    if v_f.fournisseur_lu ? 'siren' and v_four.siren is not null then
      perform private.filed_poser_resultat(v_f, 'fournisseur.siren', 'bloquant', v_f.fournisseur_lu ->> 'siren' <> v_four.siren,
        case when v_f.fournisseur_lu ->> 'siren' <> v_four.siren
             then format('Le SIREN de la facture (%s) n''est pas celui du fournisseur retenu (%s).', v_f.fournisseur_lu ->> 'siren', v_four.siren)
             else 'Le SIREN de la facture est celui du fournisseur.' end,
        'NON_CONFORME', jsonb_build_object('lu', v_f.fournisseur_lu ->> 'siren', 'fournisseur', v_four.siren),
        v_f.fournisseur_lu ->> 'siren');
    end if;
  end if;

  -- ── L'IBAN ──
  if v_f.iban is not null then
    if not private.filed_iban_valide(v_f.iban) then
      perform private.filed_poser_resultat(v_f, 'iban.invalide', 'bloquant', true,
        format('IBAN faux (%s) : sa clé ne tombe pas juste.', private.filed_masquer_iban(v_f.iban)), 'COORD_BANC_ERR');
    elsif v_four.id is not null then
      select * into v_ib from public.filed_fournisseurs_ibans
      where client_id = v_f.client_id and fournisseur_id = v_four.id and iban = v_f.iban;
      if v_ib.statut = 'refuse' then
        perform private.filed_poser_resultat(v_f, 'iban.refuse', 'bloquant', true,
          format('IBAN déjà refusé pour ce fournisseur (%s) : ne pas payer, alerter.', v_ib.iban_masque), 'COORD_BANC_ERR',
          jsonb_build_object('iban', v_ib.iban_masque, 'refuse_le', v_ib.decide_le));
        perform private.lever_alerte_module(v_f.client_id, 'filed', 'critique',
          left(format('IBAN refusé présenté de nouveau par %s', v_four.nom), 200),
          jsonb_build_object('facture', v_f.id, 'fournisseur', v_four.id, 'iban', v_ib.iban_masque),
          'iban_refuse:' || v_ib.id::text || ':' || v_f.id::text, true, null);
      elsif v_ib.statut = 'propose' and v_four.statut = 'actif' then
        perform private.filed_poser_resultat(v_f, 'iban.nouveau', 'bloquant', true,
          format('Nouvel IBAN (%s) pour ce fournisseur : une personne le vérifie auprès de lui avant tout paiement.', v_ib.iban_masque),
          'COORD_BANC_ERR', jsonb_build_object('iban', v_ib.iban_masque));
      elsif v_ib.statut = 'revoque' then
        perform private.filed_poser_resultat(v_f, 'iban.nouveau', 'bloquant', true,
          format('IBAN révoqué pour ce fournisseur (%s) : il ne sert plus.', v_ib.iban_masque), 'COORD_BANC_ERR',
          jsonb_build_object('iban', v_ib.iban_masque));
      else
        perform private.filed_poser_resultat(v_f, 'iban.nouveau', 'bloquant', false,
          case when v_ib.statut = 'valide' then 'IBAN connu et validé pour ce fournisseur.'
               else 'IBAN proposé avec le fournisseur nouveau : il se valide avec lui.' end);
      end if;
      select f.* into v_autre_four
      from public.filed_fournisseurs_ibans i join public.filed_fournisseurs f on f.id = i.fournisseur_id
      where i.client_id = v_f.client_id and i.iban = v_f.iban and i.statut = 'valide' and i.fournisseur_id <> v_four.id
      limit 1;
      perform private.filed_poser_resultat(v_f, 'iban.partage', 'bloquant', v_autre_four.id is not null,
        case when v_autre_four.id is null then 'L''IBAN n''appartient à aucun autre fournisseur.'
             else format('Cet IBAN est déjà celui d''un autre fournisseur (%s) : affacturage à justifier, ou fraude.', v_autre_four.nom) end,
        'COORD_BANC_ERR', case when v_autre_four.id is null then '{}'::jsonb
                               else jsonb_build_object('autre_fournisseur', v_autre_four.id) end,
        coalesce(v_autre_four.id::text, ''));
      v_pays_iban := left(v_f.iban, 2);
      if v_four.pays is not null and v_pays_iban <> replace(v_four.pays, 'EL', 'GR') then
        perform private.filed_poser_resultat(v_f, 'iban.pays', 'attention', true,
          format('IBAN tenu dans un autre pays (%s) que celui du fournisseur (%s) : à vérifier.', v_pays_iban, v_four.pays),
          'COORD_BANC_ERR', jsonb_build_object('pays_iban', v_pays_iban, 'pays_fournisseur', v_four.pays));
      end if;
    end if;
  elsif v_four.id is not null and not exists (select 1 from public.filed_fournisseurs_ibans i
                                             where i.fournisseur_id = v_four.id and i.statut = 'valide') then
    perform private.filed_poser_resultat(v_f, 'iban.absent', 'info', true,
      'Aucun IBAN sur la facture ni au référentiel : le paiement passera par un autre moyen.');
  end if;

  -- ── Le destinataire : la facture est-elle adressée à cette société ? ──
  v_ach_siren := v_f.acheteur_lu ->> 'siren';
  v_ent_siren := coalesce(v_ent.siren, case when v_ent.principale then (select c.siren from public.clients c where c.id = v_f.client_id) end);
  if v_ach_siren is not null then
    if v_ent_siren = v_ach_siren then
      perform private.filed_poser_resultat(v_f, 'destinataire.societe', 'bloquant', false,
        'Facture adressée à cette société.');
    else
      select e.* into v_autre_ent from public.entites e
      where e.client_id = v_f.client_id and e.id <> v_f.entite_id and e.siren = v_ach_siren
      limit 1;
      if v_autre_ent.id is not null then
        update public.filed_factures set entite_id = v_autre_ent.id where id = v_f.id;
        update public.filed_documents set entite_id = v_autre_ent.id where id = v_f.document_id;
        v_f.entite_id := v_autre_ent.id;
        perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_document', v_f.document_id::text, 'reorientee',
          format('Adressée à %s (SIREN %s) : rangée dans cette société.', v_autre_ent.nom, v_ach_siren),
          jsonb_build_object('entite', v_autre_ent.id, 'siren', v_ach_siren));
        perform private.filed_poser_resultat(v_f, 'destinataire.societe', 'info', true,
          format('Adressée à %s : rangée dans cette société.', v_autre_ent.nom), null,
          jsonb_build_object('entite', v_autre_ent.id));
      elsif v_ent_siren is null then
        perform private.filed_poser_resultat(v_f, 'destinataire.societe', 'info', true,
          'Le SIREN de la société n''est pas renseigné : le destinataire n''est pas vérifié.');
      else
        perform private.filed_poser_resultat(v_f, 'destinataire.societe', 'bloquant', true,
          format('Facture adressée à une autre société (SIREN %s) que celle-ci (SIREN %s).', v_ach_siren, v_ent_siren),
          'DEST_ERR', jsonb_build_object('siren_facture', v_ach_siren, 'siren_societe', v_ent_siren), v_ach_siren);
      end if;
    end if;
  end if;

  -- ── La TVA ──
  if v_f.montant_tva is not null and v_f.montant_ht is not null then
    v_regime := case
      when v_f.montant_tva <> 0 and (select count(distinct t.taux) from public.filed_factures_tva t
                                     where t.facture_id = v_f.id and t.taux > 0) > 1 then 'mixte'
      when v_f.montant_tva <> 0 then 'normal'
      when exists (select 1 from public.filed_factures_tva t where t.facture_id = v_f.id and upper(t.categorie) = 'AE')
           or coalesce((v_f.mentions ->> 'autoliquidation')::boolean, false)
           or v_four.regime_tva = 'autoliquidation_btp' then 'autoliquidation'
      when private.filed_pays_ue(v_four.pays) then 'intracom'
      when v_four.pays is not null and v_four.pays <> 'FR' then 'hors_ue'
      when coalesce((v_f.mentions ->> 'franchise_293b')::boolean, false) or v_four.regime_tva = 'franchise' then 'franchise'
      when exists (select 1 from public.filed_factures_tva t where t.facture_id = v_f.id
                   and upper(t.categorie) in ('E', 'Z', 'G', 'K', 'O'))
           or v_four.regime_tva = 'exonere' then 'exonere'
      else 'sans_tva' end;
    update public.filed_factures set regime_tva = v_regime where id = v_f.id;
    v_f.regime_tva := v_regime;

    if v_four.pays = 'FR' and v_f.montant_ht > coalesce(v_reglage.seuil_mentions_ht, 150)
       and v_regime not in ('franchise') and v_four.tva is null and not (v_f.fournisseur_lu ? 'tva') then
      perform private.filed_poser_resultat(v_f, 'tva.numero', 'attention', true,
        'Numéro de TVA du fournisseur absent de la facture : mention obligatoire (CGI, art. 242 nonies A), et la TVA déductible en dépend.',
        'NON_CONFORME');
    end if;
    if v_f.fournisseur_lu ->> 'tva' like 'FR%' and coalesce(v_f.fournisseur_lu ->> 'siren', v_four.siren) is not null then
      perform private.filed_poser_resultat(v_f, 'tva.numero_siren', 'bloquant',
        right(v_f.fournisseur_lu ->> 'tva', 9) <> coalesce(v_f.fournisseur_lu ->> 'siren', v_four.siren),
        case when right(v_f.fournisseur_lu ->> 'tva', 9) <> coalesce(v_f.fournisseur_lu ->> 'siren', v_four.siren)
             then format('Le numéro de TVA (%s) n''est pas celui du SIREN %s : il appartient à une autre société.',
                         v_f.fournisseur_lu ->> 'tva', coalesce(v_f.fournisseur_lu ->> 'siren', v_four.siren))
             else 'Le numéro de TVA est bien celui du SIREN du fournisseur.' end,
        'NON_CONFORME', '{}'::jsonb, v_f.fournisseur_lu ->> 'tva');
    end if;

    v_regime_ter := private.filed_regime_territorial(v_f.client_id, v_f.entite_id);
    select coalesce(array_agg(distinct t.taux), '{}') into v_taux_fr from public.filed_taux_tva t;
    select coalesce(array_agg(distinct t.taux), '{}') into v_taux_ok from public.filed_taux_tva t
    where v_regime_ter is null or t.regime = v_regime_ter;

    if v_regime in ('normal', 'mixte') then
      if v_regime_ter = 'sans_tva' then
        perform private.filed_poser_resultat(v_f, 'tva.taux', 'attention', true,
          'TVA facturée à une société d''un territoire où la TVA française ne s''applique pas (Guyane, Mayotte, collectivité à fiscalité propre) : à vérifier.',
          'TX_TVA_ERR', jsonb_build_object('territoire', v_regime_ter), 'territoire');
      elsif exists (select 1 from public.filed_factures_tva t where t.facture_id = v_f.id and t.taux is not null) then
        select array_agg(distinct t.taux::text order by t.taux::text) into v_hors from public.filed_factures_tva t
        where t.facture_id = v_f.id and t.taux > 0 and not (t.taux = any (v_taux_fr));
        if v_hors is not null then
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'bloquant', true,
            'Taux de TVA qui n''existe pas en France : ' || array_to_string(v_hors, ' %, ') || ' %.', 'TX_TVA_ERR',
            jsonb_build_object('taux', to_jsonb(v_hors)), array_to_string(v_hors, ','));
        else
          select array_agg(distinct t.taux::text order by t.taux::text) into v_hors from public.filed_factures_tva t
          where t.facture_id = v_f.id and t.taux > 0 and not (t.taux = any (v_taux_ok));
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'attention', v_hors is not null,
            case when v_hors is null then 'Chaque taux de TVA est un taux légal du territoire de la société.'
                 else 'Taux légal ailleurs en France, pas dans le territoire de la société : ' || array_to_string(v_hors, ' %, ') || ' %.' end,
            'TX_TVA_ERR', jsonb_build_object('territoire', v_regime_ter, 'taux', to_jsonb(v_hors)),
            coalesce(array_to_string(v_hors, ','), ''));
        end if;
        select sum(t.montant) into v_somme from public.filed_factures_tva t where t.facture_id = v_f.id;
        if v_somme is not null then
          perform private.filed_poser_resultat(v_f, 'tva.ventilation', 'attention', abs(v_somme - v_f.montant_tva) > v_tol,
            case when abs(v_somme - v_f.montant_tva) > v_tol
                 then format('La ventilation fait %s de TVA pour un total de %s.', private.filed_montant_texte(v_somme),
                             private.filed_montant_texte(v_f.montant_tva))
                 else 'La ventilation de la TVA égale son total.' end,
            'CALCUL_ERR', jsonb_build_object('somme', v_somme, 'tva', v_f.montant_tva));
        end if;
      elsif v_f.montant_ht <> 0 then
        -- Sans ventilation : le taux qui redonne la TVA au centime près, ligne par ligne arrondie.
        v_tol_taux := least(1.00, greatest(0.02, 0.005 * greatest(v_nb_lignes, 1)));
        v_taux_trouve := null;
        foreach v_taux in array v_taux_fr loop
          if abs(round(v_f.montant_ht * v_taux / 100, 2) - v_f.montant_tva) <= v_tol_taux then
            if v_taux_trouve is null or v_taux = any (v_taux_ok) then
              v_taux_trouve := v_taux;
            end if;
          end if;
        end loop;
        if v_taux_trouve is not null and v_taux_trouve = any (v_taux_ok) then
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'bloquant', false,
            format('TVA au taux légal de %s %%.', replace(trim(trailing '.' from trim(trailing '0' from v_taux_trouve::text)), '.', ',')),
            'TX_TVA_ERR', jsonb_build_object('taux', v_taux_trouve, 'territoire', v_regime_ter), v_taux_trouve::text);
        elsif v_taux_trouve is not null then
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'attention', true,
            format('TVA au taux de %s %%, légal ailleurs en France mais pas dans le territoire de la société.',
                   replace(trim(trailing '.' from trim(trailing '0' from v_taux_trouve::text)), '.', ',')),
            'TX_TVA_ERR', jsonb_build_object('taux', v_taux_trouve, 'territoire', v_regime_ter), v_taux_trouve::text);
        elsif v_f.montant_tva / v_f.montant_ht * 100 between (select min(x) from unnest(v_taux_ok) x) - 0.01
                                                         and (select max(x) from unnest(v_taux_ok) x) + 0.01 then
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'attention', true,
            format('Taux moyen de %s %% : plusieurs taux probables, que la pièce ne détaille pas.',
                   replace(round(v_f.montant_tva / v_f.montant_ht * 100, 2)::text, '.', ',')),
            'TX_TVA_ERR', jsonb_build_object('taux_moyen', round(v_f.montant_tva / v_f.montant_ht * 100, 3)),
            round(v_f.montant_tva / v_f.montant_ht * 100, 3)::text);
        else
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'bloquant', true,
            format('Taux moyen de %s %% : aucun taux légal ne redonne cette TVA.',
                   replace(round(v_f.montant_tva / v_f.montant_ht * 100, 2)::text, '.', ',')),
            'TX_TVA_ERR', jsonb_build_object('taux_moyen', round(v_f.montant_tva / v_f.montant_ht * 100, 3)),
            round(v_f.montant_tva / v_f.montant_ht * 100, 3)::text);
        end if;
      end if;
    end if;

    if v_regime = 'sans_tva' and v_f.montant_ht <> 0 then
      perform private.filed_poser_resultat(v_f, 'tva.sans_mention', 'attention', true,
        'Aucune TVA, sans mention d''exonération, d''autoliquidation ou de franchise : à vérifier.', 'TX_TVA_ERR');
    end if;
    if v_four.regime_tva = 'autoliquidation_btp' then
      perform private.filed_poser_resultat(v_f, 'tva.autoliquidation_attendue', 'bloquant', v_f.montant_tva <> 0,
        case when v_f.montant_tva <> 0
             then 'Sous-traitant du bâtiment : sa facture se fait hors taxes avec la mention « autoliquidation » (CGI, art. 283-2 nonies). La TVA facturée est une anomalie.'
             else 'Facture de sous-traitant hors taxes : la TVA sera autoliquidée.' end,
        'TX_TVA_ERR', '{}'::jsonb, v_f.montant_tva::text);
    end if;
    if v_regime in ('autoliquidation', 'intracom', 'hors_ue') then
      perform private.filed_poser_resultat(v_f, 'tva.regime', 'info', true,
        case v_regime
          when 'autoliquidation' then 'TVA due par l''acheteur (autoliquidation) : elle sera déclarée et déduite à l''écriture.'
          when 'intracom' then 'Fournisseur de l''Union européenne, sans TVA : acquisition ou service intracommunautaire, TVA autoliquidée.'
          else 'Fournisseur hors de l''Union, sans TVA : TVA autoliquidée à l''écriture, ou payée à l''importation.' end);
    end if;
  end if;

  -- ── Les dates ──
  if v_f.date_emission is not null then
    perform private.filed_poser_resultat(v_f, 'date.future', 'bloquant', v_f.date_emission > v_auj + 1,
      case when v_f.date_emission > v_auj + 1
           then format('Date d''émission dans le futur (%s) : erreur de lecture ou de saisie.', to_char(v_f.date_emission, 'DD/MM/YYYY'))
           else 'Date d''émission passée.' end,
      'NON_CONFORME', '{}'::jsonb, v_f.date_emission::text);
    if v_f.date_emission < v_auj - 365 then
      perform private.filed_poser_resultat(v_f, 'date.ancienne', 'attention', true,
        format('Pièce émise le %s, reçue le %s : plus d''un an d''écart, l''exercice est à vérifier.',
               to_char(v_f.date_emission, 'DD/MM/YYYY'), to_char(v_f.date_reception, 'DD/MM/YYYY')));
    end if;
    if v_f.echeance_lue is not null and v_f.echeance_lue < v_f.date_emission then
      perform private.filed_poser_resultat(v_f, 'date.echeance', 'attention', true,
        'Échéance antérieure à la date d''émission : à vérifier.', 'MODPAI_ERR');
    end if;
  end if;

  -- ── Le cadre de facturation (règle G1.02) ──
  if upper(coalesce(v_f.cadre_facturation, '')) in ('B2', 'S2', 'M2') then
    perform private.filed_poser_resultat(v_f, 'cadre.deja_payee', 'info', true,
      format('Facture déjà payée (cadre %s) : elle ne se paie pas une seconde fois.', upper(v_f.cadre_facturation)));
  end if;

  -- ── Le rapprochement (lot F3) : la commande, la réception, l'avoir ──
  perform private.filed_rapprocher_facture(v_f.id);

  -- ── Lot 4 (A4) : l'identité du fournisseur (TVA de l'Union, SIREN, registres), l'exercice et la clôture ──
  perform private.filed_controles_identite(v_f.id);
  perform private.filed_controles_comptables(v_f.id);

  -- ── L'état ──
  select count(*) filter (where c.resultat = 'anomalie' and c.gravite = 'bloquant'),
         count(*) filter (where c.resultat = 'anomalie' and c.gravite = 'attention'),
         bool_or(c.resultat = 'anomalie' and c.famille = 'lecture'),
         coalesce(array_agg(c.code order by c.code) filter (where c.resultat = 'anomalie' and c.gravite <> 'info'), '{}')
  into v_bloquants, v_attention, v_lecture, v_anomalies
  from public.filed_controles c where c.facture_id = v_f.id;

  v_statut := case when v_f.statut in ('validee', 'refusee', 'comptabilisee') then v_f.statut -- Lot 4 (A4)
                   when coalesce(v_lecture, false) then 'a_completer'
                   when v_ecartee is not null then 'ecartee'
                   when v_bloquants > 0 then 'bloquee'
                   else 'a_valider' end;

  if v_statut is distinct from v_f.statut or v_anomalies is distinct from v_f.anomalies then
    select string_agg(c.message, ' ' order by c.code) into v_message
    from public.filed_controles c
    where c.facture_id = v_f.id and c.resultat = 'anomalie' and c.gravite = 'bloquant';
    perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_document', v_f.document_id::text,
      'controlee',
      case v_statut
        when 'a_completer' then 'À compléter. ' || coalesce(v_message, '')
        when 'bloquee' then 'Bloquée. ' || coalesce(v_message, '')
        when 'ecartee' then 'Écartée : doublon exact d''une pièce reçue plus tôt.'
        when 'validee' then 'Recontrôlée : validée, le statut reste.' -- Lot 4 (A4)
        when 'refusee' then 'Recontrôlée : refusée, le statut reste.'
        when 'comptabilisee' then 'Recontrôlée : comptabilisée, le statut reste.'
        else 'Contrôlée : prête à valider' || case when v_attention > 0 then format(', avec %s point(s) d''attention.', v_attention) else '.' end end,
      jsonb_build_object('statut', v_statut, 'anomalies', to_jsonb(v_anomalies), 'version', v_f.version));
    perform private.filed_journaliser(v_f.client_id, 'filed.controles', 'filed_facture', v_f.id::text,
      jsonb_build_object('statut', v_statut, 'version', v_f.version, 'anomalies', to_jsonb(v_anomalies)), v_f.entite_id);
  end if;

  update public.filed_factures
     set statut = v_statut, doublon_de = v_ecartee, anomalies = v_anomalies, nb_bloquants = v_bloquants,
         nb_attention = v_attention, controle_le = now(), maj_le = now()
   where id = v_f.id;
  -- ── Lot 4 (A4) : la charge récurrente, l'imputation proposée, la demande de validation ──
  perform private.filed_apres_controle(v_f.id, v_statut);
  return v_statut;
end $function$


-- ═══ FONCTION private.filed_controles_identite
CREATE OR REPLACE FUNCTION private.filed_controles_identite(p_facture uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_f      public.filed_factures;
  v_four   public.filed_fournisseurs;
  v_tva    text;
  v_siren  text;
  v_a      record;
  v_verif  public.filed_verifications_tiers;
  v_siren_tva text;
  v_tva_ok boolean := false;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found then return; end if;
  if v_f.fournisseur_id is not null then
    select * into v_four from public.filed_fournisseurs where id = v_f.fournisseur_id;
  end if;

  v_tva   := coalesce(nullif(v_f.fournisseur_lu->>'tva', ''), v_four.tva);
  v_siren := coalesce(nullif(v_f.fournisseur_lu->>'siren', ''), v_four.siren,
                      case when nullif(v_f.fournisseur_lu->>'siret', '') is not null then left(regexp_replace(v_f.fournisseur_lu->>'siret', '[^0-9]', '', 'g'), 9) end,
                      case when v_four.siret is not null then left(regexp_replace(v_four.siret, '[^0-9]', '', 'g'), 9) end);
  v_siren := nullif(regexp_replace(coalesce(v_siren, ''), '[^0-9]', '', 'g'), '');

  if v_tva is null then
    perform private.filed_poser_resultat(v_f, 'identite.tva_intracom', 'attention', true,
      'Aucun numéro de TVA intracommunautaire sur la pièce ni sur le fournisseur.', 'EMMET_INC',
      jsonb_build_object('tva', null), 'absent');
  else
    select * into v_a from private.filed_tva_intracom_analyser(v_tva);
    v_tva_ok := coalesce(v_a.valide, false);
    perform private.filed_poser_resultat(v_f, 'identite.tva_intracom', 'bloquant', not v_a.valide,
      case when v_a.valide then format('Numéro de TVA %s : %s.', v_a.pays, v_a.motif)
           else format('Numéro de TVA intracommunautaire invalide : %s.', v_a.motif) end,
      'EMMET_INC',
      jsonb_build_object('tva', v_tva, 'pays', v_a.pays, 'format_ok', v_a.format_ok, 'cle_verifiee', v_a.cle_verifiee),
      v_a.numero);
  end if;

  if v_siren is null then
    perform private.filed_poser_resultat(v_f, 'identite.siren', 'attention', true,
      'Aucun SIREN sur la pièce ni sur le fournisseur.', 'EMMET_INC', jsonb_build_object('siren', null), 'absent');
  else
    perform private.filed_poser_resultat(v_f, 'identite.siren', 'bloquant', not private.filed_siren_valide(v_siren),
      case when private.filed_siren_valide(v_siren) then format('SIREN %s : clé correcte.', v_siren)
           else format('SIREN %s : clé de contrôle fausse.', v_siren) end,
      'EMMET_INC', jsonb_build_object('siren', v_siren), v_siren);
  end if;

  v_siren_tva := private.filed_siren_de_tva_fr(v_tva);
  if v_siren_tva is not null and v_siren is not null then
    perform private.filed_poser_resultat(v_f, 'identite.coherence', 'bloquant', v_siren_tva <> v_siren,
      case when v_siren_tva = v_siren then 'Le numéro de TVA et le SIREN désignent la même entreprise.'
           else format('Le numéro de TVA porte le SIREN %s, la pièce donne %s.', v_siren_tva, v_siren) end,
      'EMMET_INC', jsonb_build_object('siren_tva', v_siren_tva, 'siren', v_siren), v_siren_tva || '/' || v_siren);
  end if;

  if v_tva_ok then
    v_verif := private.filed_verification_recente(v_f.client_id, 'vies', v_tva);
    if v_verif.id is null then
      perform private.filed_demander_verification(v_f.client_id, v_f.fournisseur_id, 'vies', v_tva);
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'attention', true,
        'Numéro de TVA pas encore confirmé par VIES : vérification demandée.', 'EMMET_INC',
        jsonb_build_object('registre', 'vies', 'identifiant', v_tva), 'vies:' || v_tva);
    elsif v_verif.resultat = 'invalide' then
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'bloquant', true,
        format('VIES ne reconnaît pas le numéro de TVA %s (réponse du %s).', v_tva, to_char(v_verif.repondu_le, 'DD/MM/YYYY')),
        'EMMET_INC', jsonb_build_object('registre', 'vies', 'identifiant', v_tva, 'repondu_le', v_verif.repondu_le, 'preuve', v_verif.preuve), 'vies:' || v_tva);
    elsif v_verif.resultat = 'indisponible' then
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'attention', true,
        'VIES n''a pas répondu : numéro de TVA à confirmer.', 'EMMET_INC',
        jsonb_build_object('registre', 'vies', 'identifiant', v_tva, 'repondu_le', v_verif.repondu_le), 'vies:' || v_tva);
    else
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'attention', false,
        format('Numéro de TVA confirmé par VIES le %s.', to_char(v_verif.repondu_le, 'DD/MM/YYYY')), null,
        jsonb_build_object('registre', 'vies', 'identifiant', v_tva, 'repondu_le', v_verif.repondu_le), 'vies:' || v_tva);
    end if;
  elsif v_siren is not null and private.filed_siren_valide(v_siren) then
    v_verif := private.filed_verification_recente(v_f.client_id, 'sirene', v_siren);
    if v_verif.id is null then
      perform private.filed_demander_verification(v_f.client_id, v_f.fournisseur_id, 'sirene', v_siren);
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'attention', true,
        'SIREN pas encore confirmé par Sirene : vérification demandée.', 'EMMET_INC',
        jsonb_build_object('registre', 'sirene', 'identifiant', v_siren), 'sirene:' || v_siren);
    elsif v_verif.resultat = 'invalide' then
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'bloquant', true,
        format('Sirene ne connaît pas le SIREN %s, ou l''entreprise est fermée (réponse du %s).', v_siren, to_char(v_verif.repondu_le, 'DD/MM/YYYY')),
        'EMMET_INC', jsonb_build_object('registre', 'sirene', 'identifiant', v_siren, 'repondu_le', v_verif.repondu_le, 'preuve', v_verif.preuve), 'sirene:' || v_siren);
    elsif v_verif.resultat = 'indisponible' then
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'attention', true,
        'Sirene n''a pas répondu : SIREN à confirmer.', 'EMMET_INC',
        jsonb_build_object('registre', 'sirene', 'identifiant', v_siren, 'repondu_le', v_verif.repondu_le), 'sirene:' || v_siren);
    else
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'attention', false,
        format('SIREN confirmé par Sirene le %s.', to_char(v_verif.repondu_le, 'DD/MM/YYYY')), null,
        jsonb_build_object('registre', 'sirene', 'identifiant', v_siren, 'repondu_le', v_verif.repondu_le), 'sirene:' || v_siren);
    end if;
  end if;
end $function$


-- ═══ FONCTION private.filed_creer_fournisseur
CREATE OR REPLACE FUNCTION private.filed_creer_fournisseur(p_client uuid, p_identite jsonb, p_source text, p_document uuid DEFAULT NULL::uuid)
 RETURNS filed_fournisseurs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_f public.filed_fournisseurs;
  v_nom text;
  v_numero integer;
  v_pays text;
begin
  v_nom := coalesce(nullif(btrim(p_identite ->> 'nom'), ''),
                    'Fournisseur ' || coalesce('SIREN ' || (p_identite ->> 'siren'), 'TVA ' || (p_identite ->> 'tva'),
                                               p_identite ->> 'id_etranger', 'sans nom'));
  v_pays := coalesce(p_identite ->> 'pays',
                     case when p_identite ? 'siren' then 'FR'
                          when p_identite ? 'tva' then replace(left(p_identite ->> 'tva', 2), 'EL', 'GR') end);
  v_numero := private.filed_prochain_numero(p_client, 'fournisseur', 0::smallint);
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, siren, siret, tva, id_etranger, pays, statut,
                                         source, document_origine, regime_tva, confirme_le, confirme_par)
  values (p_client, coalesce(nullif(upper(btrim(p_identite ->> 'code')), ''), 'F' || lpad(v_numero::text, 5, '0')),
          left(v_nom, 200), private.filed_normaliser_nom(v_nom), p_identite ->> 'siren', p_identite ->> 'siret',
          p_identite ->> 'tva', p_identite ->> 'id_etranger', v_pays,
          case when p_source = 'import' then 'actif' else 'a_confirmer' end, p_source, p_document,
          nullif(p_identite ->> 'regime_tva', ''),
          case when p_source = 'import' then now() end, case when p_source = 'import' then (select auth.uid()) end)
  returning * into v_f;

  if p_source <> 'import' then
    perform private.filed_deposer_demande(p_client, null, 'filed.valider_fournisseur', 'filed_fournisseur', v_f.id::text,
      'Nouveau fournisseur : ' || private.filed_libelle_fournisseur(v_f)
        || coalesce(', IBAN ' || private.filed_masquer_iban(p_identite ->> 'iban'), ''),
      null,
      jsonb_build_object('fournisseur', v_f.id, 'nom', v_f.nom, 'siren', v_f.siren, 'tva', v_f.tva, 'pays', v_f.pays,
                         'iban', case when p_identite ? 'iban' then private.filed_masquer_iban(p_identite ->> 'iban') end,
                         'iban_empreinte', case when p_identite ? 'iban'
                                                then encode(sha256(convert_to(p_identite ->> 'iban', 'UTF8')), 'hex') end,
                         'document', p_document, 'source', p_source),
      'filed:fournisseur:' || v_f.id::text);
    perform private.filed_historiser(p_client, null, 'filed_fournisseur', v_f.id::text, 'cree',
      'Fournisseur nouveau, né d''une pièce : une personne le confirme avant tout paiement.',
      jsonb_build_object('document', p_document, 'code', v_f.code));
  end if;
  return v_f;
end $function$


-- ═══ FONCTION private.filed_demander_verification
CREATE OR REPLACE FUNCTION private.filed_demander_verification(p_client uuid, p_fournisseur uuid, p_registre text, p_identifiant text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_id uuid; v_ident text := upper(regexp_replace(coalesce(p_identifiant, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if v_ident = '' then return null; end if;
  select id into v_id from public.filed_verifications_tiers
   where client_id = p_client and registre = p_registre and identifiant = v_ident and repondu_le is null
   order by demande_le desc limit 1;
  if v_id is not null then return v_id; end if;
  insert into public.filed_verifications_tiers (client_id, fournisseur_id, registre, identifiant)
  values (p_client, p_fournisseur, p_registre, v_ident) returning id into v_id;
  return v_id;
end $function$


-- ═══ FONCTION private.filed_deposer_demande
CREATE OR REPLACE FUNCTION private.filed_deposer_demande(p_client uuid, p_entite uuid, p_type text, p_objet_type text, p_objet_id text, p_resume text, p_montant numeric, p_payload jsonb, p_cle text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume,
                                          montant, payload, cle_idempotence)
  values (p_client, p_entite, 'filed', p_type, p_objet_type, p_objet_id, left(p_resume, 500), p_montant,
          coalesce(p_payload, '{}'::jsonb), p_cle)
  on conflict (client_id, cle_idempotence) do nothing
  returning id into v_id;
  if v_id is null then
    select d.id into v_id from public.demandes_validation d where d.client_id = p_client and d.cle_idempotence = p_cle;
  end if;
  return v_id;
end $function$


-- ═══ FONCTION private.filed_deposer_piece
CREATE OR REPLACE FUNCTION private.filed_deposer_piece(p_client uuid, p_document uuid, p_nom_fichier text, p_mime text, p_octets bigint, p_sha256 text, p_chemin text, p_entite uuid DEFAULT NULL::uuid, p_source text DEFAULT 'depot'::text, p_expediteur text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_entite uuid;
  v_fuseau text;
  v_uid uuid;
  v_annee smallint;
  v_numero integer;
  v_piece uuid;
  v_original public.filed_documents;
  v_doc public.filed_documents;
begin
  if p_client is null or p_document is null then
    raise exception 'Organisation et document sont obligatoires.' using errcode = '22023';
  end if;
  -- D'abord qui agit, pour ne rien dire d'une organisation à qui n'en est pas.
  v_uid := private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur', 'collaborateur'], null);
  select e.id, e.fuseau into v_entite, v_fuseau from public.entites e
  where e.client_id = p_client and (case when p_entite is null then e.principale else e.id = p_entite end);
  if v_entite is null then
    raise exception 'Société introuvable dans cette organisation.' using errcode = '22023';
  end if;
  if v_uid is not null and not private.perimetre_couvre(v_uid, p_client, v_entite) then
    raise exception 'Cette société est hors de votre périmètre.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.filed_reglages r where r.client_id = p_client and r.entite_id is null and r.actif) then
    raise exception 'FILED n''est pas installé pour cette organisation.' using errcode = '55000';
  end if;
  if p_chemin is null or not starts_with(p_chemin, p_client::text || '/filed_document/' || p_document::text || '/')
     or char_length(p_chemin) <= char_length(p_client::text || '/filed_document/' || p_document::text || '/') then
    raise exception 'Le fichier se range à %/filed_document/%/…', p_client, p_document using errcode = '22023';
  end if;
  if p_source = 'export' then
    raise exception 'Un export se relève par la brique B1 : il n''est pas une pièce à lire.' using errcode = '22023';
  end if;
  if coalesce(p_source, '') not in ('depot', 'courriel', 'connecteur', 'api') then
    raise exception 'Source inconnue : %.', coalesce(p_source, 'vide') using errcode = '22023';
  end if;

  v_annee := extract(year from now() at time zone coalesce(v_fuseau, 'Europe/Paris'))::smallint;
  v_numero := private.filed_prochain_numero(p_client, 'reception', v_annee);

  select d.* into v_original from public.filed_documents d
  where d.client_id = p_client and d.sha256 = lower(p_sha256) and d.etat <> 'doublon'
  order by d.recu_le, d.numero_reception limit 1;

  insert into public.pieces (client_id, module, objet_type, objet_id, source, expediteur, depose_par,
                             nom_fichier, mime, octets, sha256, chemin, statut)
  values (p_client, 'filed', 'filed_document', p_document::text, p_source, p_expediteur, v_uid,
          p_nom_fichier, p_mime, p_octets, lower(p_sha256), p_chemin, 'recue')
  returning id into v_piece;

  insert into public.filed_documents (id, client_id, entite_id, annee_reception, numero_reception, piece_id, source,
                                      expediteur, depose_par, nom_fichier, sha256, etat, doublon_de, motif, traite_le)
  values (p_document, p_client, v_entite, v_annee, v_numero, v_piece, p_source, p_expediteur, v_uid,
          p_nom_fichier, lower(p_sha256),
          case when v_original.id is null then 'en_lecture' else 'doublon' end,
          v_original.id,
          case when v_original.id is null then null
               else left(format('Même fichier que la pièce %s, reçue le %s : écartée, elle reste consultable.',
                                v_original.reference,
                                to_char(v_original.recu_le at time zone coalesce(v_fuseau, 'Europe/Paris'), 'DD/MM/YYYY')), 500) end,
          case when v_original.id is null then null else now() end)
  returning * into v_doc;

  perform private.filed_historiser(p_client, v_doc.id, 'filed_document', v_doc.id::text, 'recu',
    format('Pièce reçue (%s), enregistrée sous le numéro %s.',
           case p_source when 'depot' then 'dépôt' when 'courriel' then 'e-mail' when 'connecteur' then 'connecteur'
                         else 'API' end, v_doc.reference),
    jsonb_build_object('reference', v_doc.reference, 'source', p_source));
  if v_original.id is not null then
    perform private.filed_historiser(p_client, v_doc.id, 'filed_document', v_doc.id::text, 'doublon', v_doc.motif,
      jsonb_build_object('doublon_de', v_original.id, 'reference_originale', v_original.reference));
  end if;

  return jsonb_build_object('document', v_doc.id, 'reference', v_doc.reference, 'piece', v_piece,
                            'etat', v_doc.etat, 'doublon_de', v_doc.doublon_de);
end $function$


-- ═══ FONCTION private.filed_exporter_tableau
CREATE OR REPLACE FUNCTION private.filed_exporter_tableau(p_client uuid, p_tableau text, p_debut date DEFAULT NULL::date, p_fin date DEFAULT NULL::date, p_entite uuid DEFAULT NULL::uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_lignes text[]; v_csv text; v_n integer; v_debut date; v_fin date; v_r record;
begin
  perform private.filed_exiger_lecteur(p_client, p_entite);
  v_debut := coalesce(p_debut, date_trunc('month', current_date::timestamp)::date);
  v_fin := coalesce(p_fin, current_date);
  case p_tableau
    when 'engage' then
      v_lignes := array['Société;Fournisseur;Centre de coût;Nombre de factures;Montant HT;Montant TTC'];
      for v_r in select * from private.filed_engage_mois(p_client, v_debut, p_entite) loop
        v_lignes := v_lignes || (private.filed_csv_cellule(v_r.entite) || ';' || private.filed_csv_cellule(v_r.fournisseur) || ';' || private.filed_csv_cellule(v_r.centre) || ';' || v_r.nb_factures || ';' || private.filed_csv_cellule(v_r.montant_ht) || ';' || private.filed_csv_cellule(v_r.montant_ttc));
      end loop;
    when 'echeancier' then
      v_lignes := array['Horizon;Échéance;Société;Fournisseur;Numéro;Montant TTC;Réglé;Reste à payer;En retard'];
      for v_r in select * from private.filed_echeancier(p_client, v_fin, p_entite) loop
        v_lignes := v_lignes || (private.filed_csv_cellule(v_r.horizon) || ';' || private.filed_csv_cellule(v_r.echeance) || ';' || private.filed_csv_cellule(v_r.entite) || ';' || private.filed_csv_cellule(v_r.fournisseur) || ';' || private.filed_csv_cellule(v_r.numero) || ';' || private.filed_csv_cellule(v_r.montant_ttc) || ';' || private.filed_csv_cellule(v_r.regle) || ';' || private.filed_csv_cellule(v_r.reste_a_payer) || ';' || private.filed_csv_cellule(v_r.en_retard));
      end loop;
    when 'delais' then
      v_lignes := array['Du;Au;Factures classées;Délai moyen (jours);Délai médian (jours);Délai maximal (jours)'];
      for v_r in select * from private.filed_delai_traitement(p_client, v_debut, v_fin, p_entite) loop
        v_lignes := v_lignes || (private.filed_csv_cellule(v_debut) || ';' || private.filed_csv_cellule(v_fin) || ';' || v_r.nb_factures || ';' || private.filed_csv_cellule(v_r.delai_moyen_jours) || ';' || private.filed_csv_cellule(v_r.delai_median_jours) || ';' || private.filed_csv_cellule(v_r.delai_max_jours));
      end loop;
    when 'en_cours' then
      v_lignes := array['Catégorie;Libellé;Nombre;Montant TTC'];
      for v_r in select * from private.filed_pieces_en_cours(p_client, p_entite) loop
        v_lignes := v_lignes || (private.filed_csv_cellule(v_r.categorie) || ';' || private.filed_csv_cellule(v_r.libelle) || ';' || v_r.nombre || ';' || private.filed_csv_cellule(v_r.montant_ttc));
      end loop;
    when 'factures' then
      v_lignes := array['Référence;Société;Fournisseur;Nature;Numéro;Émission;Réception;Échéance;Devise;HT;TVA;TTC;Statut;Anomalies;Compte;Centre;Exercice'];
      for v_r in
        select d.reference, e.nom as entite, fo.nom as fournisseur, f.nature, f.numero, f.date_emission, f.date_reception, f.echeance_lue, f.devise, f.montant_ht, f.montant_tva, f.montant_ttc, f.statut,
               array_to_string(f.anomalies, ' ') as anomalies,
               (select string_agg(c.numero, ' ') from public.filed_imputations i join public.filed_plan_comptable c on c.id = i.compte_id where i.facture_id = f.id and i.statut = 'validee') as comptes,
               (select string_agg(k.code, ' ') from public.filed_imputations i join public.filed_centres_cout k on k.id = i.centre_id where i.facture_id = f.id and i.statut = 'validee') as centres,
               (select x.libelle from public.filed_factures_exercices fe join public.filed_exercices x on x.id = fe.exercice_id where fe.facture_id = f.id) as exercice
          from private.filed_factures_visibles(p_client, p_entite) f
          join public.filed_documents d on d.id = f.document_id
          left join public.entites e on e.id = f.entite_id
          left join public.filed_fournisseurs fo on fo.id = f.fournisseur_id
         where f.date_reception between v_debut and v_fin
         order by d.reference
      loop
        v_lignes := v_lignes || (private.filed_csv_cellule(v_r.reference) || ';' || private.filed_csv_cellule(v_r.entite) || ';' || private.filed_csv_cellule(v_r.fournisseur) || ';' || private.filed_csv_cellule(v_r.nature) || ';' || private.filed_csv_cellule(v_r.numero) || ';' || private.filed_csv_cellule(v_r.date_emission) || ';' || private.filed_csv_cellule(v_r.date_reception) || ';' || private.filed_csv_cellule(v_r.echeance_lue) || ';' || private.filed_csv_cellule(v_r.devise) || ';' || private.filed_csv_cellule(v_r.montant_ht) || ';' || private.filed_csv_cellule(v_r.montant_tva) || ';' || private.filed_csv_cellule(v_r.montant_ttc) || ';' || private.filed_csv_cellule(v_r.statut) || ';' || private.filed_csv_cellule(v_r.anomalies) || ';' || private.filed_csv_cellule(v_r.comptes) || ';' || private.filed_csv_cellule(v_r.centres) || ';' || private.filed_csv_cellule(v_r.exercice));
      end loop;
    else
      raise exception 'Tableau inconnu : % (engage, echeancier, delais, en_cours, factures).', coalesce(p_tableau, 'vide') using errcode = '22023';
  end case;
  v_csv := array_to_string(v_lignes, E'\r\n') || E'\r\n';
  v_n := cardinality(v_lignes) - 1;
  perform private.filed_journaliser(p_client, 'filed.export', 'filed_export', p_tableau,
    jsonb_build_object('tableau', p_tableau, 'du', v_debut, 'au', v_fin, 'entite', p_entite, 'lignes', v_n,
                       'sha256', encode(extensions.digest(convert_to(v_csv, 'UTF8'), 'sha256'), 'hex')), p_entite);
  return v_csv;
end $function$


-- ═══ FONCTION private.filed_historiser
CREATE OR REPLACE FUNCTION private.filed_historiser(p_client uuid, p_document uuid, p_objet_type text, p_objet_id text, p_etape text, p_message text, p_detail jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_acteur record;
begin
  select * into v_acteur from private.acteur_courant();
  insert into public.filed_historique (client_id, document_id, objet_type, objet_id, etape, message, detail,
                                       acteur_type, acteur_id, acteur_libelle)
  values (p_client, p_document, p_objet_type, p_objet_id, p_etape, left(p_message, 500), coalesce(p_detail, '{}'::jsonb),
          v_acteur.acteur_type, v_acteur.acteur_id,
          case when v_acteur.acteur_type = 'systeme' then 'FILED' else v_acteur.acteur_libelle end);
end $function$


-- ═══ FONCTION private.filed_integrer_facture
CREATE OR REPLACE FUNCTION private.filed_integrer_facture(p_document uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_doc public.filed_documents;
  v_f public.filed_factures;
  v jsonb;
  v_ent public.entites;
  v_numero text;
  v_date date;
  v_ech date;
  v_devise text;
  v_ht numeric;
  v_tva numeric;
  v_ttc numeric;
  v_net numeric;
  v_prep numeric;
  v_calcules text[] := '{}';
  v_siren text;
  v_siret text;
  v_tva_four text;
  v_four jsonb;
  v_ach jsonb;
  v_ach_siren text;
  v_iban text;
  v_refs jsonb;
  v_mentions jsonb;
  v_douteux jsonb;
  v_empreinte text;
  v_nouvelle boolean := false;
  v_changee boolean := false;
  v_statut text;
begin
  select * into v_doc from public.filed_documents where id = p_document for update;
  if not found or v_doc.nature not in ('facture', 'avoir') then
    return 'hors_facture';
  end if;
  select * into v_f from public.filed_factures where document_id = p_document for update;
  if found and v_f.statut not in ('a_completer', 'bloquee', 'a_valider', 'ecartee') then
    perform private.filed_historiser(v_doc.client_id, v_doc.id, 'filed_document', v_doc.id::text, 'relue_sans_effet',
      'Relue : la facture est déjà décidée, sa lecture ne la change plus.', jsonb_build_object('statut', v_f.statut));
    return v_f.statut;
  end if;
  select * into v_ent from public.entites where id = v_doc.entite_id;

  v := private.filed_valeurs(v_doc.piece_id);

  v_numero := left(private.filed_texte(v -> 'numero' -> 'valeur'), 60);
  v_date := private.filed_date(v -> 'date' -> 'valeur');
  v_ech := private.filed_date(v -> 'echeance' -> 'valeur');
  v_devise := upper(coalesce(private.filed_texte(v -> 'devise' -> 'valeur'), 'EUR'));
  if v_devise !~ '^[A-Z]{3}$' then
    v_devise := 'EUR';
  end if;
  v_ht := private.filed_nombre(v -> 'montant_ht' -> 'valeur');
  v_tva := private.filed_nombre(v -> 'montant_tva' -> 'valeur');
  v_ttc := private.filed_nombre(v -> 'montant_ttc' -> 'valeur');
  v_net := private.filed_nombre(v -> 'net_a_payer' -> 'valeur');
  v_prep := private.filed_nombre(v -> 'montant_prepaye' -> 'valeur');
  if v_doc.nature = 'avoir' then
    -- Un avoir se garde en montants positifs : son sens est dans sa nature.
    v_ht := abs(v_ht); v_tva := abs(v_tva); v_ttc := abs(v_ttc); v_net := abs(v_net);
  end if;

  v_mentions := jsonb_strip_nulls(jsonb_build_object(
    'autoliquidation', coalesce(private.filed_booleen(v -> 'mention.autoliquidation' -> 'valeur'),
                                case when exists (select 1 from public.pieces_pages pg where pg.piece_id = v_doc.piece_id
                                                  and private.filed_normaliser(pg.texte) ~ '\mauto ?liquidation\M') then true end),
    'franchise_293b', coalesce(private.filed_booleen(v -> 'mention.franchise_293b' -> 'valeur'),
                               case when exists (select 1 from public.pieces_pages pg where pg.piece_id = v_doc.piece_id
                                                 and private.filed_normaliser(pg.texte) ~ '\m293 ?b\M') then true end)));

  -- Les montants que la pièce ne donne pas, et qui se déduisent des autres.
  if v_tva is null and v_ht is not null and v_ttc is not null and v_ht = v_ttc then
    v_tva := 0; v_calcules := array_append(v_calcules, 'TVA nulle (HT égal au TTC)');
  elsif v_tva is null and v_ttc is not null
        and (coalesce((v_mentions ->> 'franchise_293b')::boolean, false) or coalesce((v_mentions ->> 'autoliquidation')::boolean, false)) then
    v_tva := 0; v_calcules := array_append(v_calcules, 'TVA nulle (mention sur la pièce)');
  end if;
  if v_ht is null and v_tva is not null and v_ttc is not null then
    v_ht := v_ttc - v_tva; v_calcules := array_append(v_calcules, 'HT = TTC − TVA');
  end if;

  -- L'identité du fournisseur : seules les valeurs sûres (vérifiées par le code,
  -- ou saisies par une personne) servent à le reconnaître.
  if coalesce((v -> 'fournisseur.siren' ->> 'sure')::boolean, false)
     and private.filed_siren_valide(private.filed_texte(v -> 'fournisseur.siren' -> 'valeur')) then
    v_siren := private.filed_texte(v -> 'fournisseur.siren' -> 'valeur');
  end if;
  if coalesce((v -> 'fournisseur.siret' ->> 'sure')::boolean, false)
     and private.filed_texte(v -> 'fournisseur.siret' -> 'valeur') ~ '^[0-9]{14}$' then
    v_siret := private.filed_texte(v -> 'fournisseur.siret' -> 'valeur');
    if v_siren is null and private.filed_siren_valide(left(v_siret, 9)) then
      v_siren := left(v_siret, 9);
    end if;
  end if;
  if coalesce((v -> 'fournisseur.tva' ->> 'sure')::boolean, false) then
    v_tva_four := upper(regexp_replace(coalesce(private.filed_texte(v -> 'fournisseur.tva' -> 'valeur'), ''), '[\s.\-]', '', 'g'));
    if v_tva_four !~ '^[A-Z]{2}[0-9A-Z]{2,13}$' or (v_tva_four like 'FR%' and not private.filed_tva_fr_valide(v_tva_four)) then
      v_tva_four := null;
    end if;
    if v_siren is null and v_tva_four like 'FR%' then
      v_siren := right(v_tva_four, 9);
    end if;
  end if;
  v_four := jsonb_strip_nulls(jsonb_build_object(
    'nom', left(private.filed_texte(v -> 'fournisseur.nom' -> 'valeur'), 200),
    'siren', v_siren, 'siret', v_siret, 'tva', v_tva_four,
    'id_etranger', case when v_siren is null and v_tva_four is null
                        then left(private.filed_texte(v -> 'fournisseur.id_legal' -> 'valeur'), 60) end,
    'pays', upper(nullif(private.filed_texte(v -> 'fournisseur.pays' -> 'valeur'), ''))));
  if v_four ? 'pays' and (v_four ->> 'pays') !~ '^[A-Z]{2}$' then
    v_four := v_four - 'pays';
  end if;

  v_iban := upper(regexp_replace(coalesce(private.filed_texte(v -> 'fournisseur.iban' -> 'valeur'), ''), '\s', '', 'g'));
  if v_iban !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$' then
    v_iban := null;
  end if;

  if coalesce((v -> 'acheteur.siren' ->> 'sure')::boolean, false)
     and private.filed_siren_valide(private.filed_texte(v -> 'acheteur.siren' -> 'valeur')) then
    v_ach_siren := private.filed_texte(v -> 'acheteur.siren' -> 'valeur');
  elsif coalesce((v -> 'acheteur.siret' ->> 'sure')::boolean, false)
        and private.filed_siren_valide(left(private.filed_texte(v -> 'acheteur.siret' -> 'valeur'), 9)) then
    v_ach_siren := left(private.filed_texte(v -> 'acheteur.siret' -> 'valeur'), 9);
  elsif coalesce((v -> 'acheteur.tva' ->> 'sure')::boolean, false)
        and private.filed_tva_fr_valide(private.filed_texte(v -> 'acheteur.tva' -> 'valeur')) then
    v_ach_siren := right(upper(regexp_replace(private.filed_texte(v -> 'acheteur.tva' -> 'valeur'), '[\s.\-]', '', 'g')), 9);
  end if;
  v_ach := jsonb_strip_nulls(jsonb_build_object(
    'nom', left(private.filed_texte(v -> 'acheteur.nom' -> 'valeur'), 200), 'siren', v_ach_siren,
    'tva', upper(private.filed_texte(v -> 'acheteur.tva' -> 'valeur')),
    'pays', upper(private.filed_texte(v -> 'acheteur.pays' -> 'valeur'))));

  v_refs := jsonb_strip_nulls(jsonb_build_object(
    'commande', left(private.filed_texte(v -> 'commande.reference' -> 'valeur'), 100),
    'livraison', left(private.filed_texte(v -> 'livraison.reference' -> 'valeur'), 100),
    'contrat', left(private.filed_texte(v -> 'contrat.reference' -> 'valeur'), 100),
    'facture_origine', left(private.filed_texte(v -> 'facture_origine.reference' -> 'valeur'), 100),
    'facture_origine_date', private.filed_date(v -> 'facture_origine.date' -> 'valeur'),
    'acheteur', left(private.filed_texte(v -> 'acheteur.reference' -> 'valeur'), 100),
    'livraison_date', private.filed_date(v -> 'livraison.date' -> 'valeur')));

  -- Ce qui compte et reste à vérifier sur la pièce.
  select coalesce(jsonb_agg(jsonb_build_object('champ', c.libelle, 'controle', v -> c.champ ->> 'controle') order by c.rang), '[]'::jsonb)
  into v_douteux
  from (values (1, 'numero', 'numéro'), (2, 'date', 'date'), (3, 'montant_ht', 'HT'), (4, 'montant_tva', 'TVA'),
               (5, 'montant_ttc', 'TTC')) as c(rang, champ, libelle)
  where v ? c.champ and not coalesce((v -> c.champ ->> 'sure')::boolean, false);

  v_empreinte := encode(sha256(convert_to(jsonb_build_object(
    'numero', v_numero, 'date', v_date, 'echeance', v_ech, 'devise', v_devise, 'ht', v_ht, 'tva', v_tva, 'ttc', v_ttc,
    'net', v_net, 'prepaye', v_prep, 'fournisseur', v_four, 'acheteur', v_ach, 'iban', v_iban, 'refs', v_refs,
    'mentions', v_mentions, 'douteux', v_douteux, 'lignes', v -> 'lignes' -> 'valeur',
    'ventilation', v -> 'tva.ventilation' -> 'valeur', 'cadre', v -> 'cadre_facturation' -> 'valeur',
    'type', v -> 'type_code' -> 'valeur')::text, 'UTF8')), 'hex');

  if v_f.id is null then
    insert into public.filed_factures (client_id, entite_id, document_id, nature, numero, numero_normalise, date_emission,
                                       date_reception, echeance_lue, devise, montant_ht, montant_tva, montant_ttc,
                                       net_a_payer, montant_prepaye, montants_calcules, type_code, cadre_facturation,
                                       fournisseur_lu, acheteur_lu, iban, refs, mentions, champs_douteux, empreinte_donnees)
    values (v_doc.client_id, v_doc.entite_id, v_doc.id, v_doc.nature, v_numero, private.filed_normaliser_numero(v_numero),
            v_date, (v_doc.recu_le at time zone coalesce(v_ent.fuseau, 'Europe/Paris'))::date, v_ech, v_devise,
            v_ht, v_tva, v_ttc, v_net, v_prep, v_calcules,
            left(private.filed_texte(v -> 'type_code' -> 'valeur'), 10),
            upper(left(private.filed_texte(v -> 'cadre_facturation' -> 'valeur'), 10)),
            v_four, v_ach, v_iban, v_refs, v_mentions, v_douteux, v_empreinte)
    returning * into v_f;
    v_nouvelle := true;
  elsif v_f.empreinte_donnees is distinct from v_empreinte or v_f.nature <> v_doc.nature then
    update public.filed_factures
       set nature = v_doc.nature, version = version + 1, numero = v_numero,
           numero_normalise = private.filed_normaliser_numero(v_numero), date_emission = v_date, echeance_lue = v_ech,
           devise = v_devise, montant_ht = v_ht, montant_tva = v_tva, montant_ttc = v_ttc, net_a_payer = v_net,
           montant_prepaye = v_prep, montants_calcules = v_calcules,
           type_code = left(private.filed_texte(v -> 'type_code' -> 'valeur'), 10),
           cadre_facturation = upper(left(private.filed_texte(v -> 'cadre_facturation' -> 'valeur'), 10)),
           fournisseur_lu = v_four, acheteur_lu = v_ach, iban = v_iban, refs = v_refs, mentions = v_mentions,
           champs_douteux = v_douteux, empreinte_donnees = v_empreinte, maj_le = now()
     where id = v_f.id
    returning * into v_f;
    v_changee := true;
  end if;

  if v_nouvelle or v_changee then
    delete from public.filed_factures_lignes where facture_id = v_f.id;
    insert into public.filed_factures_lignes (client_id, facture_id, document_id, rang, numero, reference_vendeur,
                                              reference_acheteur, gtin, designation, quantite, unite, prix_unitaire,
                                              prix_brut, remise, montant_ht, taux_tva, categorie_tva, commande_ligne, source)
    select v_f.client_id, v_f.id, v_f.document_id, e.rang::smallint,
           left(private.filed_texte(e.l -> 'numero'), 60), left(private.filed_texte(e.l -> 'reference_vendeur'), 100),
           left(private.filed_texte(e.l -> 'reference_acheteur'), 100), left(private.filed_texte(e.l -> 'gtin'), 40),
           left(private.filed_texte(e.l -> 'designation'), 500),
           case when v_doc.nature = 'avoir' then abs(private.filed_nombre(e.l -> 'quantite')) else private.filed_nombre(e.l -> 'quantite') end,
           left(private.filed_texte(e.l -> 'unite'), 20), private.filed_nombre(e.l -> 'prix_unitaire'),
           private.filed_nombre(e.l -> 'prix_brut'), private.filed_nombre(e.l -> 'remise'),
           case when v_doc.nature = 'avoir' then abs(private.filed_nombre(e.l -> 'montant')) else private.filed_nombre(e.l -> 'montant') end,
           private.filed_nombre(e.l -> 'taux_tva'), left(upper(private.filed_texte(e.l -> 'categorie_tva')), 5),
           left(private.filed_texte(e.l -> 'commande_ligne'), 60),
           case when v -> 'lignes' ->> 'source' in ('xml', 'regle', 'ia', 'humain', 'tableur') then v -> 'lignes' ->> 'source' else 'regle' end
    from jsonb_array_elements(case when jsonb_typeof(v -> 'lignes' -> 'valeur') = 'array' then v -> 'lignes' -> 'valeur'
                                   else '[]'::jsonb end) with ordinality as e(l, rang)
    where e.rang <= 5000 and jsonb_typeof(e.l) = 'object';

    delete from public.filed_factures_tva where facture_id = v_f.id;
    insert into public.filed_factures_tva (client_id, facture_id, document_id, categorie, taux, base, montant, motif, source)
    select v_f.client_id, v_f.id, v_f.document_id, left(upper(private.filed_texte(e.t -> 'categorie')), 5),
           private.filed_nombre(e.t -> 'taux'),
           case when v_doc.nature = 'avoir' then abs(private.filed_nombre(e.t -> 'base')) else private.filed_nombre(e.t -> 'base') end,
           case when v_doc.nature = 'avoir' then abs(private.filed_nombre(e.t -> 'montant')) else private.filed_nombre(e.t -> 'montant') end,
           left(private.filed_texte(e.t -> 'motif'), 300),
           case when v -> 'tva.ventilation' ->> 'source' in ('xml', 'regle', 'ia', 'humain', 'tableur')
                then v -> 'tva.ventilation' ->> 'source' else 'regle' end
    from jsonb_array_elements(case when jsonb_typeof(v -> 'tva.ventilation' -> 'valeur') = 'array'
                                   then v -> 'tva.ventilation' -> 'valeur' else '[]'::jsonb end) as e(t)
    where jsonb_typeof(e.t) = 'object';
  end if;

  perform private.filed_resoudre_fournisseur(v_f.id);

  update public.filed_documents set etat = 'integre', traite_le = now() where id = v_doc.id and etat <> 'integre';
  if v_nouvelle then
    perform private.filed_historiser(v_doc.client_id, v_doc.id, 'filed_document', v_doc.id::text, 'integree',
      format('%s %s du %s, %s TTC.', case v_doc.nature when 'avoir' then 'Avoir' else 'Facture' end,
             coalesce(v_numero, 'sans numéro'), coalesce(to_char(v_date, 'DD/MM/YYYY'), 'date inconnue'),
             private.filed_montant_texte(v_ttc)),
      jsonb_build_object('facture', v_f.id, 'version', 1));
  elsif v_changee then
    perform private.filed_historiser(v_doc.client_id, v_doc.id, 'filed_document', v_doc.id::text, 'mise_a_jour',
      format('Relue ou corrigée : version %s.', v_f.version), jsonb_build_object('facture', v_f.id, 'version', v_f.version));
  end if;

  v_statut := private.filed_controler_facture(v_f.id);
  return v_statut;
end $function$


-- ═══ FONCTION private.filed_integrer_piece
CREATE OR REPLACE FUNCTION private.filed_integrer_piece(p_piece uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_doc public.filed_documents;
  v_p public.pieces;
  v_nature text;
  v_etat text;
  v_motif text;
begin
  select * into v_doc from public.filed_documents where piece_id = p_piece for update;
  if not found then
    return 'hors_filed';
  end if;
  if v_doc.etat = 'doublon' then
    return 'doublon';
  end if;
  select * into v_p from public.pieces where id = p_piece;
  if v_p.statut not in ('lue', 'a_verifier', 'a_classer', 'rejetee', 'echec') then
    return 'pas_encore_lue';
  end if;

  if v_doc.nature_source = 'humain' then
    v_nature := v_doc.nature;
    v_etat := private.filed_etat_de(v_nature);
    v_motif := case when v_p.statut in ('rejetee', 'echec')
                    then coalesce(v_p.motif, 'La pièce n''a pas pu être lue.') end;
  elsif v_p.statut in ('rejetee', 'echec') then
    v_nature := null;
    v_etat := 'illisible';
    v_motif := coalesce(v_p.motif, 'La pièce n''a pas pu être lue.');
  elsif v_p.statut = 'a_classer' then
    v_nature := null;
    v_etat := 'a_classer';
    v_motif := coalesce(v_p.motif, 'Type incertain : une personne le tranche.');
  else
    v_nature := private.filed_nature_de(v_p.type_piece);
    v_etat := private.filed_etat_de(v_nature);
    v_motif := case when v_nature is null then coalesce(v_p.motif, 'Type non reconnu : une personne le tranche.') end;
  end if;

  -- Une facture, un avoir, un bon de commande ou de livraison passe tout de
  -- suite à son moteur, dans la même transaction : son document est « integre ».
  if v_nature in ('facture', 'avoir', 'bon_commande', 'bon_livraison') then
    v_etat := 'integre';
  end if;

  if not (v_doc.etat is not distinct from v_etat and v_doc.nature is not distinct from v_nature
          and v_doc.motif is not distinct from v_motif) then
    update public.filed_documents
       set etat = v_etat, nature = v_nature,
           nature_source = case when v_nature is null then null
                                when v_doc.nature_source = 'humain' then 'humain' else 'lecteur' end,
           motif = v_motif, lu_le = coalesce(v_p.lue_le, now()), traite_le = now()
     where id = v_doc.id;
    perform private.filed_historiser(v_doc.client_id, v_doc.id, 'filed_document', v_doc.id::text,
      case v_etat when 'illisible' then 'illisible' when 'a_classer' then 'a_classer' else 'lu' end,
      case v_etat
        when 'illisible' then 'Pièce illisible : ' || v_motif
        when 'a_classer' then 'À classer : ' || v_motif
        when 'classe' then 'Lue et rangée : ' || private.filed_libelle_nature(v_nature) || '.'
        else 'Lue : ' || private.filed_libelle_nature(v_nature) || '.' end,
      jsonb_build_object('statut_lecture', v_p.statut, 'type_piece', v_p.type_piece, 'nature', v_nature,
                         'version_lecteur', v_p.version_lecteur));
  end if;

  if v_nature in ('facture', 'avoir') then
    return 'facture:' || private.filed_integrer_facture(v_doc.id);
  elsif v_nature = 'bon_commande' then
    return private.filed_integrer_commande(v_doc.id);
  elsif v_nature = 'bon_livraison' then
    return private.filed_integrer_reception(v_doc.id);
  end if;
  return v_etat;
end $function$


-- ═══ FONCTION private.filed_poser_resultat
CREATE OR REPLACE FUNCTION private.filed_poser_resultat(p_f filed_factures, p_code text, p_gravite text, p_anomalie boolean, p_message text, p_motif text DEFAULT NULL::text, p_preuve jsonb DEFAULT '{}'::jsonb, p_cle text DEFAULT ''::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_levee uuid;
  v_resultat text;
begin
  if coalesce(p_anomalie, false) and private.filed_levable(p_code) then
    select l.id into v_levee from public.filed_levees l
    where l.facture_id = p_f.id and l.code = p_code and l.cle = coalesce(p_cle, '');
  end if;
  v_resultat := case when not coalesce(p_anomalie, false) then 'ok' when v_levee is not null then 'levee' else 'anomalie' end;
  insert into public.filed_controles (client_id, facture_id, document_id, version, code, gravite, resultat, message,
                                      motif_officiel, preuve, cle, levee_id)
  values (p_f.client_id, p_f.id, p_f.document_id, p_f.version, p_code, p_gravite, v_resultat, left(p_message, 500),
          p_motif, coalesce(p_preuve, '{}'::jsonb), coalesce(p_cle, ''), v_levee)
  on conflict (facture_id, code, cle) do update
    set gravite = excluded.gravite, resultat = excluded.resultat, message = excluded.message,
        motif_officiel = excluded.motif_officiel, preuve = excluded.preuve, levee_id = excluded.levee_id,
        version = excluded.version, cree_le = now();
  return v_resultat = 'anomalie';
end $function$


-- ═══ FONCTION private.filed_prochain_export
CREATE OR REPLACE FUNCTION private.filed_prochain_export(p_cadence text, p_jour integer, p_apres date)
 RETURNS date
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case p_cadence
    when 'hebdomadaire' then (p_apres + ((p_jour - extract(isodow from p_apres)::int + 7) % 7 + case when (p_jour - extract(isodow from p_apres)::int + 7) % 7 = 0 then 7 else 0 end))::date
    else case when extract(day from p_apres)::int < p_jour then (date_trunc('month', p_apres::timestamp) + (p_jour - 1) * interval '1 day')::date
              else (date_trunc('month', p_apres::timestamp) + interval '1 month' + (p_jour - 1) * interval '1 day')::date end
  end
$function$


-- ═══ FONCTION private.filed_produire_exports
CREATE OR REPLACE FUNCTION private.filed_produire_exports(p_aujourdhui date DEFAULT CURRENT_DATE)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_p public.filed_exports_programmes; v_csv text; v_du date; v_au date; v_id uuid; v_n integer := 0;
begin
  for v_p in select * from public.filed_exports_programmes where actif and prochain_le <= p_aujourdhui order by prochain_le loop
    begin
      if v_p.cadence = 'hebdomadaire' then v_du := p_aujourdhui - 7; else v_du := (date_trunc('month', p_aujourdhui::timestamp) - interval '1 month')::date; end if;
      v_au := p_aujourdhui - 1;
      if v_p.tableau = 'engage' then v_du := (date_trunc('month', p_aujourdhui::timestamp) - interval '1 month')::date; end if;
      v_csv := private.filed_exporter_tableau(v_p.client_id, v_p.tableau, v_du, v_au, v_p.entite_id);
      insert into public.filed_exports (client_id, entite_id, programme_id, tableau, du, au, nb_lignes, sha256, contenu)
      values (v_p.client_id, v_p.entite_id, v_p.id, v_p.tableau, v_du, v_au, greatest(0, array_length(string_to_array(v_csv, E'\r\n'), 1) - 2),
              encode(extensions.digest(convert_to(v_csv, 'UTF8'), 'sha256'), 'hex'), v_csv)
      returning id into v_id;
      update public.filed_exports_programmes set dernier_le = p_aujourdhui, prochain_le = private.filed_prochain_export(cadence, jour, p_aujourdhui), maj_le = now() where id = v_p.id;
      perform private.lever_alerte_module(v_p.client_id, 'filed', 'info',
        left(format('Export prêt : %s (%s au %s)', v_p.tableau, to_char(v_du, 'DD/MM/YYYY'), to_char(v_au, 'DD/MM/YYYY')), 200),
        jsonb_build_object('export', v_id, 'programme', v_p.id, 'tableau', v_p.tableau),
        'export:' || v_id::text, true, v_p.destinataire);
      v_n := v_n + 1;
    exception when others then
      raise warning 'FILED : export programmé % non produit (%)', v_p.id, sqlerrm;
      update public.filed_exports_programmes set prochain_le = p_aujourdhui + 1, maj_le = now() where id = v_p.id;
    end;
  end loop;
  update public.filed_exports set contenu = null, purge_le = now() where contenu is not null and genere_le < now() - interval '90 days';
  return v_n;
end $function$


-- ═══ FONCTION private.filed_programmer_export
CREATE OR REPLACE FUNCTION private.filed_programmer_export(p_client uuid, p_tableau text, p_cadence text, p_jour integer, p_entite uuid DEFAULT NULL::uuid, p_destinataire uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid; v_id uuid;
begin
  v_uid := private.filed_exiger_acteur(p_client, array['gerant', 'admin'], p_entite);
  if p_tableau not in ('engage', 'echeancier', 'delais', 'en_cours', 'factures') then raise exception 'Tableau inconnu : %.', coalesce(p_tableau, 'vide') using errcode = '22023'; end if;
  if p_cadence not in ('hebdomadaire', 'mensuelle') then raise exception 'Cadence inconnue : %.', coalesce(p_cadence, 'vide') using errcode = '22023'; end if;
  if p_cadence = 'hebdomadaire' and p_jour not between 1 and 7 then raise exception 'Le jour d''un export hebdomadaire va de 1 (lundi) à 7.' using errcode = '22023'; end if;
  if p_cadence = 'mensuelle' and p_jour not between 1 and 28 then raise exception 'Le jour d''un export mensuel va de 1 à 28.' using errcode = '22023'; end if;
  insert into public.filed_exports_programmes (client_id, entite_id, tableau, cadence, jour, destinataire, prochain_le, cree_par)
  values (p_client, p_entite, p_tableau, p_cadence, p_jour, coalesce(p_destinataire, v_uid), private.filed_prochain_export(p_cadence, p_jour, current_date), v_uid)
  returning id into v_id;
  perform private.filed_journaliser(p_client, 'filed.export.programme', 'filed_export_programme', v_id::text,
    jsonb_build_object('tableau', p_tableau, 'cadence', p_cadence, 'jour', p_jour), p_entite);
  return v_id;
end $function$


-- ═══ FONCTION private.filed_proposer_iban
CREATE OR REPLACE FUNCTION private.filed_proposer_iban(p_fournisseur uuid, p_iban text, p_source text, p_document uuid DEFAULT NULL::uuid, p_motif text DEFAULT NULL::text)
 RETURNS filed_fournisseurs_ibans
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_f public.filed_fournisseurs;
  v_ib public.filed_fournisseurs_ibans;
  v_iban text := upper(regexp_replace(coalesce(p_iban, ''), '\s', '', 'g'));
begin
  select * into v_f from public.filed_fournisseurs where id = p_fournisseur;
  select * into v_ib from public.filed_fournisseurs_ibans
  where client_id = v_f.client_id and fournisseur_id = v_f.id and iban = v_iban;
  if found then
    return v_ib;
  end if;
  insert into public.filed_fournisseurs_ibans (client_id, fournisseur_id, iban, iban_masque, empreinte, statut, source,
                                               document_id, propose_par, decide_le, decide_par, motif)
  values (v_f.client_id, v_f.id, v_iban, private.filed_masquer_iban(v_iban),
          encode(sha256(convert_to(v_iban, 'UTF8')), 'hex'),
          case when p_source = 'import' then 'valide' else 'propose' end, p_source, p_document, (select auth.uid()),
          case when p_source = 'import' then now() end, case when p_source = 'import' then (select auth.uid()) end,
          left(p_motif, 500))
  returning * into v_ib;

  if p_source <> 'import' and v_f.statut = 'actif' then
    perform private.filed_deposer_demande(v_f.client_id, null, 'filed.valider_iban', 'filed_iban', v_ib.id::text,
      format('Nouvel IBAN pour %s : %s', private.filed_libelle_fournisseur(v_f), v_ib.iban_masque), null,
      jsonb_build_object('fournisseur', v_f.id, 'iban', v_ib.iban_masque, 'empreinte', v_ib.empreinte,
                         'document', p_document, 'source', p_source),
      'filed:iban:' || v_ib.id::text);
    perform private.lever_alerte_module(v_f.client_id, 'filed', 'attention',
      left(format('Nouvel IBAN pour %s : à vérifier auprès du fournisseur avant tout paiement', v_f.nom), 200),
      jsonb_build_object('fournisseur', v_f.id, 'iban', v_ib.iban_masque, 'document', p_document),
      'iban:' || v_ib.id::text, true, null);
    perform private.filed_historiser(v_f.client_id, null, 'filed_fournisseur', v_f.id::text, 'iban_propose',
      format('Nouvel IBAN proposé (%s) : une personne le vérifie avant tout paiement.', v_ib.iban_masque),
      jsonb_build_object('iban', v_ib.iban_masque, 'document', p_document, 'source', p_source));
  end if;
  return v_ib;
end $function$


-- ═══ FONCTION private.filed_recontroler_fournisseur
CREATE OR REPLACE FUNCTION private.filed_recontroler_fournisseur(p_fournisseur uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  n integer := 0;
begin
  for r in select f.id from public.filed_factures f
           where f.fournisseur_id = p_fournisseur and f.statut in ('a_completer', 'bloquee', 'a_valider')
           order by f.cree_le limit 500
  loop
    perform private.filed_controler_facture(r.id);
    n := n + 1;
  end loop;
  return n;
end $function$


-- ═══ FONCTION private.filed_repondre_verification
CREATE OR REPLACE FUNCTION private.filed_repondre_verification(p_verification uuid, p_resultat text, p_preuve jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if p_resultat not in ('valide', 'invalide', 'indisponible') then
    raise exception 'Résultat inconnu : %', p_resultat using errcode = '22023';
  end if;
  update public.filed_verifications_tiers
     set repondu_le = now(), resultat = p_resultat, preuve = coalesce(p_preuve, '{}'::jsonb)
   where id = p_verification and repondu_le is null;
  if not found then
    raise exception 'Vérification inconnue ou déjà répondue.' using errcode = 'P0002';
  end if;
end $function$


-- ═══ FONCTION private.filed_resoudre_fournisseur
CREATE OR REPLACE FUNCTION private.filed_resoudre_fournisseur(p_facture uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_f public.filed_factures;
  v_id uuid;
  v_methode text;
  v_ident jsonb;
  v_four public.filed_fournisseurs;
  v_n integer;
begin
  select * into v_f from public.filed_factures where id = p_facture for update;
  v_ident := v_f.fournisseur_lu;
  if v_f.fournisseur_force is not null then
    v_id := v_f.fournisseur_force;
    v_methode := 'humain';
  else
    if v_ident ? 'siren' then
      select f.id into v_id from public.filed_fournisseurs f
      where f.client_id = v_f.client_id and f.siren = v_ident ->> 'siren';
      v_methode := 'siren';
    end if;
    if v_id is null and v_ident ? 'tva' then
      select f.id into v_id from public.filed_fournisseurs f
      where f.client_id = v_f.client_id and f.tva = v_ident ->> 'tva';
      v_methode := 'tva';
    end if;
    if v_id is null and v_ident ? 'id_etranger' then
      select f.id into v_id from public.filed_fournisseurs f
      where f.client_id = v_f.client_id and f.id_etranger = v_ident ->> 'id_etranger';
      v_methode := 'id_etranger';
    end if;
    if v_id is null and coalesce(private.filed_normaliser_nom(v_ident ->> 'nom'), '') <> '' then
      select count(*), min(f.id::text)::uuid into v_n, v_id from public.filed_fournisseurs f
      where f.client_id = v_f.client_id and f.nom_normalise = private.filed_normaliser_nom(v_ident ->> 'nom')
        and (f.siren is null or not (v_ident ? 'siren') or f.siren = v_ident ->> 'siren')
        and (f.tva is null or not (v_ident ? 'tva') or f.tva = v_ident ->> 'tva');
      if v_n <> 1 then
        v_id := null;
      end if;
      v_methode := 'nom';
    end if;
    if v_id is null and (v_ident ?| array['siren', 'tva', 'id_etranger']
                         or coalesce(private.filed_normaliser_nom(v_ident ->> 'nom'), '') <> '') then
      -- Une seule création à la fois par organisation : deux factures du même
      -- fournisseur nouveau n'en créent pas deux.
      perform pg_advisory_xact_lock(hashtextextended('filed.fournisseur:' || v_f.client_id::text, 0));
      select f.id into v_id from public.filed_fournisseurs f
      where f.client_id = v_f.client_id
        and ((v_ident ? 'siren' and f.siren = v_ident ->> 'siren')
          or (v_ident ? 'tva' and f.tva = v_ident ->> 'tva')
          or (v_ident ? 'id_etranger' and f.id_etranger = v_ident ->> 'id_etranger'))
      limit 1;
      if v_id is null then
        v_four := private.filed_creer_fournisseur(v_f.client_id,
                    v_ident || case when v_f.iban is not null then jsonb_build_object('iban', v_f.iban) else '{}'::jsonb end,
                    'facture', v_f.document_id);
        v_id := v_four.id;
        v_methode := 'creation';
      else
        v_methode := case when v_ident ? 'siren' then 'siren' when v_ident ? 'tva' then 'tva' else 'id_etranger' end;
      end if;
    end if;
  end if;

  update public.filed_factures set fournisseur_id = v_id, fournisseur_identification = case when v_id is null then null else v_methode end
  where id = p_facture;

  if v_id is not null and v_f.iban is not null and private.filed_iban_valide(v_f.iban) then
    perform private.filed_proposer_iban(v_id, v_f.iban, 'facture', v_f.document_id);
  end if;
  return v_id;
end $function$


-- ═══ FONCTION private.filed_valeurs
CREATE OR REPLACE FUNCTION private.filed_valeurs(p_piece uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with scalaires as (
    select distinct on (pv.champ) pv.champ, pv.valeur, pv.verifiee, pv.source, pv.texte, pv.page, pv.controle
    from public.pieces_valeurs pv
    where pv.piece_id = p_piece and pv.champ <> 'lignes'
    order by pv.champ, (pv.source = 'humain') desc, pv.cree_le desc, pv.id desc
  ), lignes as (
    select 'lignes'::text as champ,
           jsonb_agg(e.ligne order by pv.page nulls last, pv.cree_le, pv.id, e.n) as valeur,
           bool_and(pv.verifiee) as verifiee, min(pv.source) as source, null::text as texte,
           min(pv.page) as page, null::text as controle
    from public.pieces_valeurs pv
    cross join lateral jsonb_array_elements(case when jsonb_typeof(pv.valeur) = 'array' then pv.valeur
                                                 else '[]'::jsonb end) with ordinality as e(ligne, n)
    where pv.piece_id = p_piece and pv.champ = 'lignes'
      and (pv.source = 'humain'
           or not exists (select 1 from public.pieces_valeurs h
                          where h.piece_id = p_piece and h.champ = 'lignes' and h.source = 'humain'))
    having count(*) > 0
  )
  select coalesce(jsonb_object_agg(x.champ, jsonb_build_object(
      'valeur', x.valeur, 'sure', x.verifiee or x.source = 'humain', 'source', x.source,
      'texte', x.texte, 'page', x.page, 'controle', x.controle)), '{}'::jsonb)
  from (select * from scalaires union all select * from lignes) x
$function$


-- ═══ FONCTION private.filed_verification_recente
CREATE OR REPLACE FUNCTION private.filed_verification_recente(p_client uuid, p_registre text, p_identifiant text, p_jours integer DEFAULT 90)
 RETURNS filed_verifications_tiers
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select v from public.filed_verifications_tiers v
  where v.client_id = p_client and v.registre = p_registre
    and v.identifiant = upper(regexp_replace(coalesce(p_identifiant, ''), '[^A-Za-z0-9]', '', 'g'))
    and v.repondu_le is not null and v.repondu_le >= now() - make_interval(days => p_jours)
  order by v.repondu_le desc limit 1
$function$


-- ═══ FONCTION private.finaliser_instantane
CREATE OR REPLACE FUNCTION private.finaliser_instantane(p_instantane uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET enable_nestloop TO 'off'
 SET work_mem TO '32MB'
AS $function$
declare
  i public.instantanes;
  j public.branchements_jeux;
  b public.branchements;
  c public.instantanes;
  v_complet boolean;
  v_fenetre jsonb;
  v_col text;
  v_du date;
  v_au date;
  v_base integer;
  v_absents integer := 0;
  v_ajouts integer := 0;
  v_modifs integer := 0;
  v_disp integer := 0;
  v_absentes text[];
  v_sensibles text[];
  v_raison text;
  v_garde jsonb;
begin
  select * into i from public.instantanes where id = p_instantane for update;
  select * into j from public.branchements_jeux where id = i.jeu_id;
  select * into b from public.branchements where id = i.branchement_id;

  -- Un export plus récent de ce jeu fait déjà l'état : celui-ci arrive trop tard.
  if exists (select 1 from public.instantanes k
             where k.jeu_id = j.id and k.id <> i.id and k.statut in ('applique', 'identique') and k.recu_le > i.recu_le) then
    update public.instantanes set statut = 'remplace', finalise_le = now(),
           motif = 'Un export plus récent de ce jeu est déjà appliqué.'
     where id = i.id;
    delete from public.instantanes_lignes where instantane_id = i.id;
    return 'remplace';
  end if;

  v_complet := coalesce(i.complet, j.complet);

  -- La copie exacte de l'export qui fait l'état : rien ne change.
  if not i.force and j.courant_id is not null then
    select * into c from public.instantanes where id = j.courant_id;
    if c.sha256 = i.sha256 and i.complet is null and i.fenetre is null and i.perimetre is null
       and c.complet is null and c.fenetre is null and c.perimetre is null
       and not exists (select 1 from public.jeux_lignes s where s.jeu_id = j.id and s.absences > 0) then
      update public.instantanes
         set statut = 'identique', base_id = c.id, lignes_base = j.lignes, ajouts = 0, modifications = 0,
             disparitions = 0, absences = 0, finalise_le = now()
       where id = i.id;
      delete from public.instantanes_lignes where instantane_id = i.id;
      perform private.confirmer_etat(j.id, i.recu_le);
      return 'identique';
    end if;
  end if;

  v_fenetre := private.fenetre_effective(i.id);
  v_col := v_fenetre ->> 'colonne';
  v_du := (v_fenetre ->> 'du')::date;
  v_au := (v_fenetre ->> 'au')::date;
  v_sensibles := private.codes_sensibles(j.colonnes);

  select count(*) into v_base from public.jeux_lignes s
  where s.jeu_id = j.id and private.dans_portee(s.valeurs, v_col, v_du, v_au, i.perimetre, b.fuseau);
  if v_complet then
    select count(*) into v_absents from public.jeux_lignes s
    where s.jeu_id = j.id and private.dans_portee(s.valeurs, v_col, v_du, v_au, i.perimetre, b.fuseau)
      and not exists (select 1 from public.instantanes_lignes l where l.instantane_id = i.id and l.cle = s.cle);
  end if;
  v_absentes := coalesce(array(select jsonb_array_elements_text(
    case when jsonb_typeof(i.format -> 'colonnes_absentes') = 'array' then i.format -> 'colonnes_absentes' else '[]'::jsonb end)), '{}');

  if not i.force then
    v_raison := case
      when i.lignes = 0 and v_base > 0 then 'vide'
      when cardinality(v_absentes) > 0 then 'colonnes'
      when v_complet and v_base > 0 and v_base - i.lignes >= j.perte_min and (v_base - i.lignes) > j.seuil_perte * v_base
        then 'perte'
      when v_complet and cardinality(j.cle) > 0 and v_base > 0 and v_absents >= j.perte_min and v_absents > j.seuil_perte * v_base
        then 'disparitions'
      when i.lignes > 0 and coalesce(i.anomalies, 0) > j.seuil_anomalies * i.lignes then 'anomalies'
    end;
  end if;
  v_garde := jsonb_strip_nulls(jsonb_build_object(
    'raison', v_raison, 'lignes', i.lignes, 'lignes_base', v_base, 'perte', greatest(v_base - i.lignes, 0),
    'absents', v_absents, 'anomalies', coalesce(i.anomalies, 0),
    'colonnes_absentes', case when cardinality(v_absentes) > 0 then to_jsonb(v_absentes) end,
    'complet', v_complet, 'fenetre', v_fenetre, 'perimetre', i.perimetre, 'seuil_perte', j.seuil_perte,
    'perte_min', j.perte_min, 'seuil_anomalies', j.seuil_anomalies, 'force', case when i.force then true end));

  if v_raison is not null then
    update public.instantanes
       set statut = 'douteux', base_id = j.courant_id, lignes_base = v_base, absences = v_absents, garde = v_garde,
           finalise_le = now(), motif = private.phrase_garde(v_garde)
     where id = i.id;
    update public.pieces set statut = 'a_verifier', motif = private.phrase_garde(v_garde) where id = i.piece_id;
    perform private.alerter_douteux(i.id);
    return 'douteux';
  end if;

  insert into public.instantanes_ecarts (client_id, instantane_id, jeu_id, cle, nature, avant, apres, champs, anomalies, n)
  select i.client_id, i.id, j.id, l.cle, 'ajout', null, l.valeurs, null, l.anomalies, l.n
  from public.instantanes_lignes l
  where l.instantane_id = i.id and not exists (select 1 from public.jeux_lignes s where s.jeu_id = j.id and s.cle = l.cle);
  get diagnostics v_ajouts = row_count;

  insert into public.instantanes_ecarts (client_id, instantane_id, jeu_id, cle, nature, avant, apres, champs, anomalies, n)
  select i.client_id, i.id, j.id, l.cle, 'modification', s.valeurs, l.valeurs,
         array(select distinct x from unnest(
                 private.champs_changes(s.valeurs, l.valeurs - v_sensibles, s.anomalies, nullif(l.anomalies - v_sensibles, '{}'::jsonb))
                 || array(select k from unnest(v_sensibles) k
                          where (private.empreintes_sensibles(j.id, l.valeurs, v_sensibles) -> k)
                                is distinct from (s.sensibles -> k))) x order by x),
         l.anomalies, l.n
  from public.instantanes_lignes l
  join public.jeux_lignes s on s.jeu_id = j.id and s.cle = l.cle
  where l.instantane_id = i.id and s.empreinte <> l.empreinte;
  get diagnostics v_modifs = row_count;

  if v_complet then
    insert into public.instantanes_ecarts (client_id, instantane_id, jeu_id, cle, nature, avant, apres, champs, anomalies, n)
    select i.client_id, i.id, j.id, s.cle, 'disparition', s.valeurs, null, null, null, null
    from public.jeux_lignes s
    where s.jeu_id = j.id and s.absences + 1 >= j.confirmer_disparition
      and private.dans_portee(s.valeurs, v_col, v_du, v_au, i.perimetre, b.fuseau)
      and not exists (select 1 from public.instantanes_lignes l where l.instantane_id = i.id and l.cle = s.cle);
    get diagnostics v_disp = row_count;
  end if;

  update public.instantanes
     set statut = 'a_appliquer', base_id = j.courant_id, lignes_base = v_base, ajouts = v_ajouts,
         modifications = v_modifs, disparitions = v_disp, absences = v_absents, garde = v_garde, finalise_le = now()
   where id = i.id;
  if not j.accuse then
    perform private.appliquer_instantane(i.id);
    return 'applique';
  end if;
  return 'a_appliquer';
end $function$


-- ═══ FONCTION private.finir_travail
CREATE OR REPLACE FUNCTION private.finir_travail(p_id bigint, p_resultat jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.travaux
     set etat = 'fait', resultat = p_resultat, fini_le = now(), verrou_jusqu_au = null
   where id = p_id and etat = 'en_cours';
  if not found then
    raise exception 'Travail introuvable ou pas en cours : %.', p_id using errcode = 'P0002';
  end if;
end $function$


-- ═══ FONCTION private.grp_noter_export
CREATE OR REPLACE FUNCTION private.grp_noter_export(p_client uuid, p_nature text, p_lignes integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is not null and not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'L''export du référentiel revient au gérant et à l''administrateur (la DSI).' using errcode = '42501';
  end if;
  perform private.grp_journal(p_client, 'varelo.referentiel.export', 'grp_referentiel', p_nature,
    jsonb_build_object('nature', p_nature, 'lignes', p_lignes, 'format', 'csv'));
end $function$


-- ═══ FONCTION private.jeu_vu
CREATE OR REPLACE FUNCTION private.jeu_vu(p_jeu uuid, p_quand timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  j public.branchements_jeux;
  v_module text;
begin
  update public.branchements_jeux
     set dernier_recu_le = greatest(coalesce(dernier_recu_le, p_quand), p_quand)
   where id = p_jeu
  returning * into j;
  select b.module into v_module from public.branchements b where b.id = j.branchement_id;
  perform private.fermer_alertes_releve(j.client_id, v_module, 'releve.muet.' || j.id::text, 'un fichier est arrivé');
  perform private.fermer_alertes_releve(j.client_id, v_module, 'releve.en_retard.' || j.id::text, 'un fichier est arrivé');
end $function$


-- ═══ FONCTION private.journaliser
CREATE OR REPLACE FUNCTION private.journaliser(p_client uuid, p_action text, p_objet_type text, p_objet_id text, p_donnees jsonb DEFAULT '{}'::jsonb, p_entite uuid DEFAULT NULL::uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_acteur record; v_precedent bytea; v_id bigint;
  v_quand timestamptz := clock_timestamp();
  v_donnees jsonb := coalesce(p_donnees, '{}'::jsonb);
begin
  select * into v_acteur from private.acteur_courant();
  perform pg_advisory_xact_lock(hashtextextended('omega.journal:' || p_client::text, 0));
  select j.hash into v_precedent from public.journal_opposable j where j.client_id = p_client order by j.id desc limit 1;
  v_id := nextval(pg_get_serial_sequence('public.journal_opposable', 'id'));
  insert into public.journal_opposable (id, client_id, entite_id, survenu_le, acteur_type, acteur_id, acteur_libelle,
    action, objet_type, objet_id, donnees, hash_precedent, hash)
  values (v_id, p_client, p_entite, v_quand, v_acteur.acteur_type, v_acteur.acteur_id, v_acteur.acteur_libelle,
    p_action, p_objet_type, p_objet_id, v_donnees, v_precedent,
    private.empreinte_journal(v_precedent, v_id, p_client, p_entite, v_quand,
      v_acteur.acteur_type, v_acteur.acteur_id, v_acteur.acteur_libelle, p_action, p_objet_type, p_objet_id, v_donnees));
  return v_id;
end $function$


-- ═══ FONCTION private.journaliser_module
CREATE OR REPLACE FUNCTION private.journaliser_module(p_client uuid, p_module text, p_action text, p_objet_type text, p_objet_id text, p_donnees jsonb DEFAULT '{}'::jsonb, p_entite uuid DEFAULT NULL::uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id bigint;
begin
  if p_module is null or p_module !~ '^[a-z][a-z_]{1,29}$' then
    raise exception 'Module inconnu : %.', coalesce(p_module, 'vide') using errcode = '22023';
  end if;
  if p_action is null or p_action !~ ('^' || p_module || '\.[a-z][a-z0-9_.]{1,79}$') then
    raise exception 'Une action de module commence par son nom : « %.… ».', p_module using errcode = '22023';
  end if;
  perform set_config('omega.module', p_module, true);
  v_id := private.journaliser(p_client, p_action, p_objet_type, p_objet_id, coalesce(p_donnees, '{}'::jsonb), p_entite);
  perform set_config('omega.module', '', true);
  return v_id;
end $function$


-- ═══ FONCTION private.lever_alerte
CREATE OR REPLACE FUNCTION private.lever_alerte(p_client uuid, p_interne boolean, p_niveau text, p_source text, p_titre text, p_detail jsonb DEFAULT '{}'::jsonb, p_cle text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
  insert into public.alertes (client_id, interne, niveau, source, titre, detail, cle_regroupement)
  values (p_client, p_interne, p_niveau, p_source, p_titre, coalesce(p_detail, '{}'::jsonb), p_cle)
  on conflict do nothing returning id into v_id;
  return v_id;
end $function$


-- ═══ FONCTION private.lever_alerte_module
CREATE OR REPLACE FUNCTION private.lever_alerte_module(p_client uuid, p_module text, p_niveau text, p_titre text, p_detail jsonb DEFAULT '{}'::jsonb, p_cle text DEFAULT NULL::text, p_pour_client boolean DEFAULT false, p_destinataire uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
  if p_module is null or p_module !~ '^[a-z][a-z_]{1,29}$' then
    raise exception 'Module inconnu : %.', coalesce(p_module, 'vide') using errcode = '22023';
  end if;
  if p_destinataire is not null and not exists (
       select 1 from public.comptes c where c.user_id = p_destinataire and c.client_id = p_client) then
    raise exception 'Le destinataire n''est pas membre de l''organisation.' using errcode = '23503';
  end if;
  v_id := private.lever_alerte(p_client, not coalesce(p_pour_client, false), p_niveau, p_module, p_titre,
                               p_detail, case when p_cle is null then null else p_module || ':' || p_cle end);
  if v_id is not null and p_destinataire is not null then
    update public.alertes set destinataire_id = p_destinataire where id = v_id;
  end if;
  return v_id;
end $function$


-- ═══ FONCTION private.lire_point
CREATE OR REPLACE FUNCTION private.lire_point(p_point uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_role text := coalesce(nullif(current_setting('role', true), 'none'), session_user::text);
  p public.points_du_jour;
begin
  select * into p from public.points_du_jour x where x.id = p_point;
  if not found then
    raise exception 'Point introuvable.' using errcode = 'P0002';
  end if;
  if v_uid is not null then
    if p.user_id <> v_uid and not private.a_un_role(p.client_id, array['gerant']) then
      raise exception 'Point introuvable.' using errcode = 'P0002';
    end if;
    if p.user_id = v_uid and p.ouvert_le is null then
      update public.points_du_jour set ouvert_le = now() where id = p.id;
    end if;
  elsif v_role not in ('service_role', 'postgres') then
    raise exception 'Point introuvable.' using errcode = 'P0002';
  end if;
  return private.point_en_json(p.id, v_uid);
end $function$


-- ═══ FONCTION private.loc_appliquer_releve
CREATE OR REPLACE FUNCTION private.loc_appliquer_releve(p_client uuid, p_nature text, p_lignes jsonb, p_ctx jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_cle text := nullif(btrim(p_ctx ->> 'cle'), '');
  v_lu_le timestamptz := coalesce((p_ctx ->> 'lu_le')::timestamptz, now());
  v_source text := coalesce(p_ctx ->> 'source', 'export');
  r public.loc_releves;
  v_ligne jsonb;
  v_res jsonb;
  v_i integer := 0;
  v_n integer;
  v_effets jsonb := '{"creation": 0, "modification": 0, "disparition": 0, "inchangee": 0}'::jsonb;
  v_rejetees integer := 0;
  v_erreurs jsonb := '[]'::jsonb;
  v_avert jsonb := '[]'::jsonb;
  v_etat text;
  v_interne boolean := false;
  v_id uuid;
begin
  if p_nature is null or p_nature not in ('flotte', 'reservations', 'contrats') then
    raise exception 'Nature de relevé inconnue : %.', coalesce(p_nature, 'vide') using errcode = '22023';
  end if;
  if v_cle is null then
    raise exception 'Un relevé porte sa clé : la même source ne s''applique qu''une fois.' using errcode = '22023';
  end if;
  if v_source not in ('export', 'pdf', 'comptoir', 'connecteur') then
    raise exception 'Source de relevé inconnue : %.', v_source using errcode = '22023';
  end if;
  if not exists (select 1 from public.clients where id = p_client) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' then
    raise exception 'Les lignes d''un relevé forment une liste.' using errcode = '22023';
  end if;

  select * into r from public.loc_releves where client_id = p_client and cle = v_cle;
  if found then
    return jsonb_build_object('releve', r.id, 'deja_applique', true, 'lignes', r.lignes, 'creations', r.creations,
                              'modifications', r.modifications, 'disparitions', r.disparitions,
                              'inchangees', r.inchangees, 'rejetees', r.rejetees);
  end if;

  perform set_config('omega.module', 'tavaro', true);
  for v_ligne in select e from jsonb_array_elements(p_lignes) e loop
    v_i := v_i + 1;
    v_n := coalesce(case when (v_ligne ->> 'n') ~ '^[0-9]{1,9}$' then (v_ligne ->> 'n')::integer end, v_i);
    begin
      v_res := case p_nature
        when 'flotte' then private.loc_appliquer_vehicule(p_client, v_ligne, p_ctx)
        when 'reservations' then private.loc_appliquer_reservation(p_client, v_ligne, p_ctx)
        else private.loc_appliquer_contrat(p_client, v_ligne, p_ctx)
      end;
      v_effets := jsonb_set(v_effets, array[v_res ->> 'effet'], to_jsonb((v_effets ->> (v_res ->> 'effet'))::integer + 1));
      v_avert := v_avert || coalesce((select jsonb_agg(a || jsonb_build_object('n', v_n))
                                      from jsonb_array_elements(coalesce(v_res -> 'avertissements', '[]'::jsonb)) a), '[]'::jsonb);
      if jsonb_typeof(v_ligne -> 'anomalies') = 'object' then
        v_avert := v_avert || coalesce((select jsonb_agg(jsonb_build_object('n', v_n, 'code', 'anomalie_de_lecture', 'champ', k))
                                        from jsonb_object_keys(v_ligne -> 'anomalies') k), '[]'::jsonb);
      end if;
    exception when others then
      get stacked diagnostics v_etat = returned_sqlstate;
      v_rejetees := v_rejetees + 1;
      -- Nos motifs (22023) ne citent que des noms de champs ; les autres erreurs
      -- ne sont jamais recopiées (elles pourraient porter une valeur).
      v_erreurs := v_erreurs || jsonb_build_array(jsonb_build_object('n', v_n,
        'motif', case when v_etat = '22023' then left(sqlerrm, 200) else 'erreur de données (' || v_etat || ')' end));
      if v_etat not like '22%' and v_etat not like '23%' then
        v_interne := true;
      end if;
    end;
  end loop;

  insert into public.loc_releves (client_id, entite_id, nature, source, cle, instantane_id, releve_id, piece_id, lu_le,
                                  lignes, creations, modifications, disparitions, inchangees, rejetees, erreurs,
                                  avertissements)
  values (p_client, (p_ctx ->> 'entite')::uuid, p_nature, v_source, v_cle, (p_ctx ->> 'instantane')::uuid,
          (p_ctx ->> 'releve')::uuid, (p_ctx ->> 'piece')::uuid, v_lu_le, v_i,
          (v_effets ->> 'creation')::integer, (v_effets ->> 'modification')::integer,
          (v_effets ->> 'disparition')::integer, (v_effets ->> 'inchangee')::integer, v_rejetees,
          (select coalesce(jsonb_agg(e), '[]'::jsonb) from (select e from jsonb_array_elements(v_erreurs) e limit 500) x),
          (select coalesce(jsonb_agg(a), '[]'::jsonb) from (select a from jsonb_array_elements(v_avert) a limit 500) x))
  returning id into v_id;

  if v_rejetees > 0 then
    perform private.lever_alerte_module(p_client, 'tavaro', case when v_interne then 'critique' else 'attention' end,
      format('Relevé des %s : %s ligne(s) rejetée(s) sur %s', p_nature, v_rejetees, v_i),
      jsonb_build_object('releve', v_id, 'nature', p_nature, 'rejetees', v_rejetees), 'releve:rejets:' || p_nature, false);
  end if;
  if v_source in ('export', 'connecteur') then
    perform private.battre(p_client, 'tavaro_releve',
      jsonb_build_object('releve', v_id, 'nature', p_nature, 'lignes', v_i, 'rejetees', v_rejetees, 'lu_le', v_lu_le),
      null);
  end if;

  perform set_config('omega.module', '', true);
  return jsonb_build_object('releve', v_id, 'deja_applique', false, 'lignes', v_i,
                            'creations', (v_effets ->> 'creation')::integer,
                            'modifications', (v_effets ->> 'modification')::integer,
                            'disparitions', (v_effets ->> 'disparition')::integer,
                            'inchangees', (v_effets ->> 'inchangee')::integer, 'rejetees', v_rejetees,
                            'erreurs', v_erreurs, 'avertissements', v_avert);
end $function$


-- ═══ FONCTION private.loc_appliquer_releve_b1
CREATE OR REPLACE FUNCTION private.loc_appliquer_releve_b1(p_charge jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  b public.branchements;
  i record;
  v_nature text;
  v_lignes jsonb;
  v_res jsonb;
  v_bilan jsonb := '{}'::jsonb;
  v_appliques integer := 0;
  v_refuses integer := 0;
  v_lu_le timestamptz;
begin
  select * into b from public.branchements where id = (p_charge ->> 'branchement')::uuid;
  if not found or b.module <> 'tavaro' then
    raise exception 'Branchement introuvable ou étranger à Tavaro.' using errcode = 'P0002';
  end if;

  for i in
    select x.id, x.lignes, x.recu_le, x.lu_le, j.code
    from public.instantanes x join public.branchements_jeux j on j.id = x.jeu_id
    where x.releve_id = (p_charge ->> 'releve')::uuid and x.branchement_id = b.id and x.statut = 'a_appliquer'
    order by case j.code when 'flotte' then 1 when 'reservations' then 2 when 'contrats' then 3 else 9 end, x.recu_le
  loop
    v_nature := case i.code when 'flotte' then 'flotte' when 'reservations' then 'reservations' when 'contrats' then 'contrats' end;
    if v_nature is null then
      perform private.acquitter_instantane(i.id, 'douteux', 'Tavaro ne connaît pas le jeu « ' || i.code || ' ».');
      v_refuses := v_refuses + 1;
      v_bilan := v_bilan || jsonb_build_object(i.code, jsonb_build_object('douteux', 'jeu inconnu'));
      continue;
    end if;
    v_lu_le := coalesce(i.lu_le, i.recu_le, now());

    select coalesce(jsonb_agg(jsonb_build_object(
             'n', e.n, 'cle', e.cle, 'nature', e.nature,
             'valeurs', case when e.nature = 'disparition' then e.avant else e.apres end,
             'anomalies', e.anomalies)
             || case when e.nature = 'modification' then jsonb_build_object('champs', to_jsonb(e.champs)) else '{}'::jsonb end
           order by e.n, e.id), '[]'::jsonb)
    into v_lignes
    from public.instantanes_ecarts e where e.instantane_id = i.id;

    v_res := private.loc_appliquer_releve(b.client_id, v_nature, v_lignes,
      jsonb_build_object('cle', 'b1:' || i.id::text, 'source', 'export', 'instantane', i.id,
                         'releve', (p_charge ->> 'releve')::uuid, 'entite', b.entite_id, 'lu_le', v_lu_le));

    -- La garde de Tavaro : un export dont aucune ligne n'a pu entrer ne fait pas l'état.
    if (v_res ->> 'lignes')::integer > 0 and (v_res ->> 'rejetees')::integer = (v_res ->> 'lignes')::integer then
      perform private.acquitter_instantane(i.id, 'douteux',
        format('Tavaro n''a pu appliquer aucune des %s ligne(s) : %s', v_res ->> 'lignes',
               coalesce(v_res -> 'erreurs' -> 0 ->> 'motif', 'motif inconnu')));
      v_refuses := v_refuses + 1;
      v_bilan := v_bilan || jsonb_build_object(i.code, v_res - 'erreurs' - 'avertissements' || '{"douteux": true}'::jsonb);
      continue;
    end if;
    perform private.acquitter_instantane(i.id, 'applique');
    v_appliques := v_appliques + 1;
    v_bilan := v_bilan || jsonb_build_object(i.code, v_res - 'erreurs' - 'avertissements');
  end loop;

  return jsonb_build_object('releve', p_charge ->> 'releve', 'appliques', v_appliques, 'refuses', v_refuses, 'jeux', v_bilan);
end $function$


-- ═══ FONCTION private.loc_releve_en_retard
CREATE OR REPLACE FUNCTION private.loc_releve_en_retard(p_charge jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  b public.branchements;
  j public.branchements_jeux;
  v_entite uuid;
  v_fuseau text;
  v_titre text;
begin
  select * into j from public.branchements_jeux where id = (p_charge ->> 'jeu')::uuid;
  if not found then
    return jsonb_build_object('statut', 'jeu_introuvable');
  end if;
  select * into b from public.branchements where id = j.branchement_id;
  if b.module <> 'tavaro' then
    return jsonb_build_object('statut', 'ignoree');
  end if;
  v_entite := b.entite_id;
  v_fuseau := coalesce(b.fuseau, 'Europe/Paris');
  v_titre := format('Le planning de ce matin n''est pas arrivé ; les heures de départ affichées datent %s.',
                    coalesce('du ' || to_char(j.etat_le at time zone v_fuseau, 'DD/MM à HH24:MI'), 'd''avant le premier export'));
  perform private.lever_alerte_module(b.client_id, 'tavaro', 'attention', v_titre,
    jsonb_build_object('jeu', j.code, 'attendu_avant', p_charge -> 'avant', 'dernier_recu_le', j.dernier_recu_le,
                       'planning_du', j.etat_le, 'entite', v_entite),
    'planning_en_retard:' || j.id::text, true, null);
  perform private.journaliser_module(b.client_id, 'tavaro', 'tavaro.planning_en_retard', 'branchements_jeux', j.id::text,
    jsonb_build_object('jeu', j.code, 'attendu_avant', p_charge -> 'avant', 'planning_du', j.etat_le), v_entite);
  return jsonb_build_object('statut', 'signale', 'jeu', j.code);
end $function$


-- ═══ FONCTION private.mes_clients
CREATE OR REPLACE FUNCTION private.mes_clients()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select c.client_id from public.comptes c where c.user_id = (select auth.uid())
$function$


-- ═══ FONCTION private.noter_consentement
CREATE OR REPLACE FUNCTION private.noter_consentement(p_client uuid, p_canal text, p_adresse text, p_source text, p_portee text DEFAULT 'transactionnel'::text, p_preuve text DEFAULT NULL::text, p_piece uuid DEFAULT NULL::uuid, p_module text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_adresse text := private.normaliser_adresse(p_canal, p_adresse);
  v_uid uuid;
  v_id uuid;
begin
  if p_canal is null or p_canal not in ('email', 'whatsapp', 'sms', 'lre', 'appel') then
    raise exception 'Canal inconnu : %.', coalesce(p_canal, 'vide') using errcode = '22023';
  end if;
  if v_adresse is null then
    raise exception 'Adresse invalide pour le canal %.', p_canal using errcode = '22023';
  end if;
  v_uid := private.exiger_reglage_destinataire(p_client, v_adresse);
  if p_portee is null or p_portee not in ('transactionnel', 'tout') then
    raise exception 'Portée inconnue : transactionnel ou tout.' using errcode = '22023';
  end if;
  if p_source is null or p_source not in ('formulaire', 'ecrit', 'oral', 'contrat', 'message', 'import') then
    raise exception 'Source inconnue : formulaire, ecrit, oral, contrat, message ou import.' using errcode = '22023';
  end if;
  if p_source in ('oral', 'import') and nullif(btrim(p_preuve), '') is null and p_piece is null then
    raise exception 'Un accord oral ou importé dit sa preuve : qui l''a recueilli, quand, comment.' using errcode = '22023';
  end if;
  select k.id into v_id from public.consentements k
  where k.client_id = p_client and k.canal = p_canal and k.adresse = v_adresse and k.portee = p_portee and k.retire_le is null;
  if v_id is null then
    insert into public.consentements (client_id, canal, adresse, adresse_empreinte, portee, source, preuve, piece_id, module, recueilli_par)
    values (p_client, p_canal, v_adresse, private.empreinte_adresse(p_client, v_adresse), p_portee, p_source,
            left(p_preuve, 300), p_piece, p_module, v_uid)
    returning id into v_id;
  end if;
  -- Un nouvel accord de la personne lève sa désinscription de ce canal (pas un import).
  if p_source <> 'import' then
    update public.oppositions
       set levee_le = now(), levee_par = v_uid, motif_levee = 'Nouvel accord du destinataire.'
     where client_id = p_client and adresse = v_adresse and type = 'desinscription' and canal = p_canal and levee_le is null;
  end if;
  return v_id;
end $function$


-- ═══ FONCTION private.noter_opposition
CREATE OR REPLACE FUNCTION private.noter_opposition(p_client uuid, p_type text, p_adresse text DEFAULT NULL::text, p_canal text DEFAULT NULL::text, p_ref text DEFAULT NULL::text, p_jusqu_au timestamp with time zone DEFAULT NULL::timestamp with time zone, p_motif text DEFAULT NULL::text, p_source text DEFAULT 'demande'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid;
  v_adresse text;
begin
  v_adresse := case when p_adresse is null then null
                    when p_canal is not null then private.normaliser_adresse(p_canal, p_adresse)
                    when p_adresse like '%@%' then private.normaliser_email(p_adresse)
                    else private.normaliser_telephone(p_adresse) end;
  v_uid := private.exiger_reglage_destinataire(p_client, v_adresse);
  if p_source is null or p_source not in ('message', 'demande', 'client', 'rebond', 'plainte', 'systeme') then
    raise exception 'Source inconnue : message, demande, client, rebond, plainte ou systeme.' using errcode = '22023';
  end if;
  return private.opposer(p_client, p_type, p_adresse, p_canal, p_ref, p_jusqu_au, p_motif, p_source, v_uid);
end $function$


-- ═══ FONCTION private.noter_remise
CREATE OR REPLACE FUNCTION private.noter_remise(p_fournisseur text, p_reference text, p_evenement text, p_detail jsonb DEFAULT '{}'::jsonb, p_survenu_le timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e public.envois;
begin
  perform private.exiger_ouvrier();
  if p_evenement is null or p_evenement not in ('remis', 'rebond_temporaire', 'rebond', 'plainte', 'refuse') then
    raise exception 'Événement de remise inconnu : remis, rebond_temporaire, rebond, plainte ou refuse.' using errcode = '22023';
  end if;
  select * into e from public.envois x
  where x.fournisseur = p_fournisseur and x.reference_externe = p_reference
  order by x.cree_le desc limit 1;
  if e.id is null then
    return false;
  end if;
  -- Le détail du fournisseur, sans contenu : un code et une raison courte.
  insert into public.envois_evenements (client_id, envoi_id, type, survenu_le, detail)
  values (e.client_id, e.id, p_evenement, coalesce(p_survenu_le, now()),
          jsonb_strip_nulls(jsonb_build_object('code', left(p_detail ->> 'code', 100), 'raison', left(p_detail ->> 'raison', 300))));
  update public.envois set remise = p_evenement, remise_le = coalesce(p_survenu_le, now())
   where id = e.id and (remise is null or private.rang_remise(p_evenement) >= private.rang_remise(remise));
  if p_evenement in ('rebond', 'plainte', 'refuse') then
    perform private.publier_envoi(e, 'non_remis');
  end if;
  if e.mode = 'reel' and p_evenement in ('rebond', 'plainte') then
    perform private.opposer(e.client_id, case p_evenement when 'rebond' then 'invalide' else 'desinscription' end,
      e.destinataire_adresse, e.canal, null, null,
      case p_evenement when 'rebond' then 'Rebond définitif signalé par le fournisseur.'
                       else 'Le destinataire a signalé le message comme indésirable.' end,
      case p_evenement when 'rebond' then 'rebond' else 'plainte' end, null);
  end if;
  return true;
end $function$


-- ═══ FONCTION private.noter_remise
CREATE OR REPLACE FUNCTION private.noter_remise(p_fournisseur text, p_reference text, p_evenement text, p_detail jsonb, p_survenu_le timestamp with time zone, p_cle text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare e public.envois; v_ok boolean;
begin
  perform private.exiger_ouvrier();
  if p_cle is not null then
    select * into e from public.envois x
     where x.fournisseur = p_fournisseur and x.reference_externe = p_reference
     order by x.cree_le desc limit 1;
    if e.id is not null and exists (select 1 from public.envois_evenements ev where ev.envoi_id = e.id and ev.cle = p_cle) then
      return true; -- déjà noté : idempotent
    end if;
  end if;
  v_ok := private.noter_remise(p_fournisseur, p_reference, p_evenement, p_detail, p_survenu_le);
  if v_ok and p_cle is not null and e.id is not null then
    update public.envois_evenements ev set cle = p_cle
     where ev.id = (select max(id) from public.envois_evenements where envoi_id = e.id and type = p_evenement and cle is null);
  end if;
  return v_ok;
end $function$


-- ═══ FONCTION private.notifier_delai
CREATE OR REPLACE FUNCTION private.notifier_delai(p_delai uuid, p_echeance date, p_source text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  d public.delais;
  v_aujourdhui date;
begin
  select * into d from public.delais where id = p_delai for update;
  if not found then
    raise exception 'Délai introuvable.' using errcode = 'P0002';
  end if;
  perform private.exiger_ecriture_delai(d.client_id, d.objet_type, d.objet_id);
  perform private.exiger_porte_du_module(d.module);
  if p_echeance is null or nullif(btrim(p_source), '') is null then
    raise exception 'La date notifiée et sa source sont nécessaires.' using errcode = '22023';
  end if;
  if d.statut in ('tenu', 'annule') then
    raise exception 'Ce délai est clos.' using errcode = '55000';
  end if;
  select (now() at time zone t.fuseau)::date into v_aujourdhui from public.territoires t where t.code = d.territoire;
  update public.delais
     set echeance_notifiee = p_echeance, source_notification = p_source, rappels_faits = '{}',
         statut = case when p_echeance >= v_aujourdhui then 'ouvert' else statut end, maj_le = now()
   where id = p_delai;
end $function$


-- ═══ FONCTION private.opposer
CREATE OR REPLACE FUNCTION private.opposer(p_client uuid, p_type text, p_adresse text, p_canal text, p_ref text, p_jusqu_au timestamp with time zone, p_motif text, p_source text, p_par uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_adresse text;
  v_id uuid;
  v_code text := case p_type when 'invalide' then 'ADRESSE_INVALIDE' when 'desinscription' then 'DESINSCRIT' else 'PAUSE' end;
  r record;
begin
  if p_type is null or p_type not in ('desinscription', 'pause', 'invalide') then
    raise exception 'Opposition inconnue : desinscription, pause ou invalide.' using errcode = '22023';
  end if;
  if p_canal is not null and p_canal not in ('email', 'whatsapp', 'sms', 'lre', 'appel') then
    raise exception 'Canal inconnu : %.', p_canal using errcode = '22023';
  end if;
  if p_adresse is not null then
    v_adresse := case when p_canal is not null then private.normaliser_adresse(p_canal, p_adresse)
                      when p_adresse like '%@%' then private.normaliser_email(p_adresse)
                      else private.normaliser_telephone(p_adresse) end;
    if v_adresse is null then
      raise exception 'Adresse invalide.' using errcode = '22023';
    end if;
  elsif nullif(btrim(p_ref), '') is null then
    raise exception 'Une opposition vise une adresse ou une référence.' using errcode = '22023';
  end if;
  if p_type = 'pause' and (p_jusqu_au is null or p_jusqu_au <= now()) then
    raise exception 'Une pause court jusqu''à une date future.' using errcode = '22023';
  end if;

  select o.id into v_id from public.oppositions o
  where o.client_id = p_client and o.type = p_type and o.levee_le is null
    and o.adresse is not distinct from v_adresse and o.ref is not distinct from nullif(btrim(p_ref), '')
    and o.canal is not distinct from p_canal
    and (p_type <> 'pause' or o.jusqu_au > now())
  limit 1;
  if v_id is not null then
    if p_type = 'pause' then
      update public.oppositions set jusqu_au = greatest(jusqu_au, p_jusqu_au) where id = v_id;
    end if;
  else
    insert into public.oppositions (client_id, type, canal, adresse, adresse_empreinte, ref, jusqu_au, motif, source, cree_par)
    values (p_client, p_type, p_canal, v_adresse, private.empreinte_adresse(p_client, v_adresse), nullif(btrim(p_ref), ''),
            case when p_type = 'pause' then p_jusqu_au end, left(p_motif, 300), p_source, p_par)
    returning id into v_id;
  end if;

  for r in
    select e.id from public.envois e
    where e.client_id = p_client and e.statut in ('a_valider', 'differe', 'pret')
      and ((v_adresse is not null and e.destinataire_adresse = v_adresse)
           or (nullif(btrim(p_ref), '') is not null and e.destinataire_ref = btrim(p_ref)))
      and (p_canal is null or e.canal = p_canal)
      and not (p_type = 'desinscription' and e.canal = 'lre')
  loop
    perform private.clore_envoi(r.id, 'bloque', v_code, case p_type
      when 'invalide' then 'Cette adresse ne reçoit pas les messages (rebond, numéro erroné).'
      when 'desinscription' then 'Cette personne a demandé à ne plus recevoir de messages.'
      else 'Cette personne est en pause : une réponse attend d''être traitée.' end);
  end loop;
  return v_id;
end $function$


-- ═══ FONCTION private.ouvrir_suivi
CREATE OR REPLACE FUNCTION private.ouvrir_suivi(p_client uuid, p_module text, p_objet_type text, p_objet_id text, p_tiers jsonb, p_attendu text, p_depuis timestamp with time zone DEFAULT now(), p_plan jsonb DEFAULT '{}'::jsonb, p_echeance timestamp with time zone DEFAULT NULL::timestamp with time zone, p_nature text DEFAULT 'reponse'::text, p_type_piece text DEFAULT NULL::text, p_territoire text DEFAULT NULL::text, p_entite uuid DEFAULT NULL::uuid, p_cle text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid;
  v_id uuid;
  v_plan jsonb;
  v_dest jsonb;
  v_territoire text;
  s public.suivis;
begin
  v_uid := private.exiger_acteur_suivi(p_client, p_entite, p_objet_type, p_objet_id);
  if p_module is null or p_module !~ '^[a-z][a-z_]{1,29}$' then
    raise exception 'Module inconnu : %.', coalesce(p_module, 'vide') using errcode = '22023';
  end if;
  if p_objet_type is null or p_objet_id is null then
    raise exception 'Un suivi porte sur un objet : type et identifiant.' using errcode = '22023';
  end if;
  if nullif(btrim(p_attendu), '') is null then
    raise exception 'Un suivi dit ce qu''on attend.' using errcode = '22023';
  end if;
  if p_nature is null or p_nature not in ('piece', 'reponse', 'paiement', 'livraison', 'signature', 'autre') then
    raise exception 'Nature inconnue : piece, reponse, paiement, livraison, signature ou autre.' using errcode = '22023';
  end if;
  if p_type_piece is not null and p_nature <> 'piece' then
    raise exception 'Un type de pièce ne vaut que pour une pièce attendue.' using errcode = '22023';
  end if;
  if p_depuis is null or p_depuis > now() + interval '1 day' then
    raise exception 'Le suivi commence à une date passée ou d''aujourd''hui.' using errcode = '22023';
  end if;
  if p_echeance is not null and p_echeance <= now() then
    raise exception 'L''échéance d''un suivi est dans le futur.' using errcode = '22023';
  end if;
  if p_cle is not null then
    select x.id into v_id from public.suivis x where x.client_id = p_client and x.module = p_module and x.cle_idempotence = p_cle;
    if found then
      return v_id;
    end if;
  end if;
  v_plan := private.plan_de_relance(p_plan, p_module);
  -- Le tiers est un destinataire de B4 : vérifié maintenant, pour ne pas découvrir à la relance qu'il est injoignable.
  v_dest := private.resoudre_destinataire(p_client, v_plan ->> 'canal', p_tiers, p_entite);
  v_territoire := coalesce(p_territoire, v_dest ->> 'territoire');
  if v_territoire is not null and not exists (select 1 from public.territoires t where t.code = v_territoire) then
    raise exception 'Territoire inconnu : %.', v_territoire using errcode = '22023';
  end if;

  insert into public.suivis (client_id, entite_id, module, objet_type, objet_id, attendu, nature, type_piece, tiers, tiers_nom,
                             tiers_ref, depuis, echeance, territoire, plan, ouvert_par, cle_idempotence)
  values (p_client, p_entite, p_module, p_objet_type, p_objet_id, btrim(p_attendu), p_nature, p_type_piece,
          p_tiers || jsonb_build_object('fuseau', v_dest ->> 'fuseau'), v_dest ->> 'nom', v_dest ->> 'ref', p_depuis, p_echeance,
          v_territoire, v_plan, v_uid, p_cle)
  returning * into s;
  update public.suivis set prochaine_relance_le = private.prochaine_relance(s, s.depuis) where id = s.id returning * into s;
  perform private.noter_evenement_suivi(s, 'ouverture', null, null,
    jsonb_build_object('nature', s.nature, 'plan', jsonb_build_object('cadence', v_plan ->> 'cadence', 'max', v_plan ->> 'max',
                                                                     'canal', v_plan ->> 'canal')), v_uid);
  return s.id;
end $function$


-- ═══ FONCTION private.perimetre_couvre
CREATE OR REPLACE FUNCTION private.perimetre_couvre(p_user uuid, p_client uuid, p_entite uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.comptes c where c.user_id = p_user and c.client_id = p_client
      and (p_entite is null or c.perimetre_total or exists (select 1 from public.comptes_entites ce
        where ce.user_id = p_user and ce.client_id = p_client and ce.entite_id = p_entite)))
$function$


-- ═══ FONCTION private.point_rendre_gabarit
CREATE OR REPLACE FUNCTION private.point_rendre_gabarit(p_code text, p_version integer, p_valeurs jsonb)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  g public.points_gabarits;
  v_texte text;
  v_m text[];
  v_rendu text;
  v_attendus text;
begin
  select * into g from public.points_gabarits x where x.code = p_code and x.version = p_version;
  if not found then
    raise exception 'Gabarit inconnu : % (version %).', coalesce(p_code, 'vide'), coalesce(p_version::text, '?')
      using errcode = '22023';
  end if;
  if p_valeurs is null or jsonb_typeof(p_valeurs) <> 'object'
     or exists (select 1 from jsonb_object_keys(p_valeurs) k where not (g.champs ? k))
     or exists (select 1 from jsonb_object_keys(g.champs) k where not (p_valeurs ? k)) then
    select string_agg(k, ', ' order by k) into v_attendus from jsonb_object_keys(g.champs) k;
    raise exception 'Le gabarit % attend exactement ces valeurs : %.', p_code, coalesce(v_attendus, 'aucune')
      using errcode = '22023';
  end if;
  v_texte := g.texte;
  for v_m in select regexp_matches(g.texte, '(\{([a-z][a-z0-9_]{0,30})(?:\|([^|{}]*)\|([^|{}]*))?\})', 'g') loop
    v_rendu := private.point_valeur_fr(p_valeurs -> v_m[2], g.champs ->> v_m[2]);
    if v_rendu is null then
      raise exception 'La valeur « % » du gabarit % n''est pas du type %.', v_m[2], p_code, g.champs ->> v_m[2]
        using errcode = '22023';
    end if;
    if v_m[3] is not null then
      v_rendu := v_rendu || chr(160)
                 || case when abs((p_valeurs ->> v_m[2])::numeric) >= 2 then v_m[4] else v_m[3] end;
    end if;
    v_texte := replace(v_texte, v_m[1], v_rendu);
  end loop;
  return v_texte;
end $function$


-- ═══ FONCTION private.points_assembler
CREATE OR REPLACE FUNCTION private.points_assembler(p_maintenant timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c record;
  m record;
  v_id uuid;
  v_etat text;
  v_nb integer;
  v_clients integer := 0;
  v_assembles integer := 0;
  v_remis integer := 0;
  v_echecs integer := 0;
  v_erreurs integer := 0;
  v_perimes integer;
begin
  -- Un point prêt d'un jour révolu ne partira plus.
  update public.points_du_jour p set statut = 'perime'
  where p.statut in ('pret', 'echec') and p.jour < (p_maintenant at time zone p.fuseau)::date;
  get diagnostics v_perimes = row_count;

  for c in
    select cl.id, cl.nom from public.clients cl
    where exists (select 1 from public.points_reglages r where r.client_id = cl.id)
    order by cl.id
  loop
    begin
      v_nb := 0;
      for m in select * from private.points_manquants(c.id, p_maintenant) loop
        begin
          v_id := private.point_assembler(c.id, m.user_id, m.jour, p_maintenant);
          if v_id is not null then
            v_nb := v_nb + 1;
            v_etat := private.point_remettre(v_id);
            if v_etat = 'remis' then
              v_remis := v_remis + 1;
            elsif v_etat = 'echec' then
              v_echecs := v_echecs + 1;
            end if;
          end if;
        exception when others then
          v_erreurs := v_erreurs + 1;
          perform private.lever_alerte(c.id, true, 'critique', 'point_du_matin',
            format('L''assemblage du point du matin échoue chez %s', c.nom),
            jsonb_build_object('jour', m.jour, 'erreur', left(sqlerrm, 300)), 'point_assemblage:' || m.jour);
        end;
      end loop;
      v_assembles := v_assembles + v_nb;

      -- Les points du jour que l'envoi n'a pas encore pris se remettent : prêts
      -- (l'envoi vient d'être branché, un renvoi est demandé) ou en échec sans
      -- envoi ; l'alerte ouverte ne se répète pas. Un envoi que B4 retient
      -- attend qu'on lève son verrou, puis un renvoi.
      if private.point_b4_present() then
        for m in
          select p.id from public.points_du_jour p
          where p.client_id = c.id and p.jour = (p_maintenant at time zone p.fuseau)::date
            and (p.statut = 'pret' or (p.statut = 'echec' and p.envoi_id is null))
        loop
          if private.point_remettre(m.id) = 'remis' then
            v_remis := v_remis + 1;
          end if;
        end loop;
      end if;

      -- Plus aucun point en retard : l'alerte d'échéance se ferme.
      if not exists (select 1 from private.points_manquants(c.id, p_maintenant)) then
        update public.alertes a
           set acquittee_le = now(), detail = a.detail || jsonb_build_object('resolution', 'les points sont prêts')
         where a.client_id = c.id and a.acquittee_le is null and a.source = 'point_du_matin'
           and (a.cle_regroupement like 'point\_retard:%' or a.cle_regroupement like 'point\_retard\_client:%');
      end if;

      perform private.battre(c.id, 'point_du_matin_assemblage',
        jsonb_build_object('assembles', v_nb, 'passage', p_maintenant), interval '1 hour');
      v_clients := v_clients + 1;
    exception when others then
      v_erreurs := v_erreurs + 1;
      perform private.lever_alerte(c.id, true, 'critique', 'point_du_matin',
        format('L''assemblage du point du matin échoue chez %s', c.nom),
        jsonb_build_object('erreur', left(sqlerrm, 300)), 'point_assemblage');
    end;
  end loop;
  return jsonb_build_object('clients', v_clients, 'assembles', v_assembles, 'remis', v_remis,
                            'echecs', v_echecs, 'erreurs', v_erreurs, 'perimes', v_perimes);
end $function$


-- ═══ FONCTION private.points_controler
CREATE OR REPLACE FUNCTION private.points_controler(p_maintenant timestamp with time zone DEFAULT now())
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c record;
  v_nb integer;
  v_jour date;
  v_prevu timestamptz;
  v_du timestamptz;
  n integer := 0;
begin
  for c in
    select cl.id, cl.nom from public.clients cl
    where exists (select 1 from public.points_reglages r where r.client_id = cl.id)
  loop
    begin
      select count(*), min(m.jour), min(m.prevu_le), min(m.du_le) into v_nb, v_jour, v_prevu, v_du
      from private.points_manquants(c.id, p_maintenant) m
      where m.du_le + interval '10 minutes' <= p_maintenant;
      if v_nb > 0 then
        if private.lever_alerte(c.id, true, 'critique', 'point_du_matin',
             format('Le point du matin n''est pas prêt chez %s (%s destinataire%s)', c.nom, v_nb,
                    case when v_nb > 1 then 's' else '' end),
             jsonb_build_object('jour', v_jour, 'prevu_le', v_prevu, 'du_le', v_du, 'manquants', v_nb),
             'point_retard:' || v_jour) is not null then
          n := n + 1;
        end if;
        perform private.lever_alerte(c.id, false, 'attention', 'point_du_matin',
          'Votre point du matin a du retard : l''équipe d''Omega est prévenue.',
          jsonb_build_object('jour', v_jour), 'point_retard_client:' || v_jour);
      end if;
      -- Un territoire inconnu ne se suppose pas : on le demande.
      select count(*) into v_nb
      from public.comptes co
      cross join lateral private.point_reglage(co.client_id, co.user_id) r
      where co.client_id = c.id and r.pose and r.actif and r.territoire is null;
      if v_nb > 0 then
        if private.lever_alerte(c.id, true, 'attention', 'point_du_matin',
             format('Le point du matin de %s membre%s chez %s attend son territoire : le poser dans le réglage',
                    v_nb, case when v_nb > 1 then 's' else '' end, c.nom),
             jsonb_build_object('membres', v_nb), 'point_sans_territoire') is not null then
          n := n + 1;
        end if;
      end if;
    exception when others then
      perform private.lever_alerte(c.id, true, 'critique', 'point_du_matin',
        format('Le contrôle du point du matin échoue chez %s', c.nom),
        jsonb_build_object('erreur', left(sqlerrm, 300)), 'point_controle');
    end;
  end loop;

  -- Des sections attendent chez une organisation sans réglage : personne ne les recevrait.
  for c in
    select s.client_id, cl.nom, count(*) as nb, min(s.jour) as jour
    from public.points_sections s
    join public.clients cl on cl.id = s.client_id
    where s.jour >= (p_maintenant at time zone 'UTC')::date - 1
      and not exists (select 1 from public.points_reglages r where r.client_id = s.client_id)
    group by s.client_id, cl.nom
  loop
    if private.lever_alerte(c.client_id, true, 'attention', 'point_du_matin',
         format('Des sections du point du matin attendent chez %s, sans réglage : personne ne les recevra', c.nom),
         jsonb_build_object('sections', c.nb, 'jour', c.jour), 'point_sans_reglage:' || c.jour) is not null then
      n := n + 1;
    end if;
  end loop;
  return n;
end $function$


-- ═══ FONCTION private.poser_delai
CREATE OR REPLACE FUNCTION private.poser_delai(p_client uuid, p_module text, p_objet_type text, p_objet_id text, p_libelle text, p_regle text, p_depart date, p_territoire text, p_rappels integer[] DEFAULT '{7,2,0}'::integer[], p_responsable uuid DEFAULT NULL::uuid, p_action text DEFAULT NULL::text, p_cle text DEFAULT NULL::text, p_augmentation_mois integer DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_calcul jsonb;
begin
  perform private.exiger_ecriture_delai(p_client, p_objet_type, p_objet_id);
  perform private.exiger_porte_du_module(p_module);
  if p_cle is not null then
    select d.id into v_id from public.delais d where d.client_id = p_client and d.module = p_module and d.cle_idempotence = p_cle;
    if found then
      return v_id;
    end if;
  end if;
  v_calcul := public.echeance_de(p_regle, p_depart, p_territoire, p_augmentation_mois);
  insert into public.delais (client_id, module, objet_type, objet_id, libelle, territoire, regle_code, regle_version, depart,
                             echeance_calculee, calcul, rappels, responsable, action_attendue, cle_idempotence)
  values (p_client, p_module, p_objet_type, p_objet_id, p_libelle, p_territoire, p_regle, (v_calcul ->> 'version')::smallint,
          p_depart, (v_calcul ->> 'echeance')::date, v_calcul, private.rappels_propres(p_rappels), p_responsable, p_action, p_cle)
  returning id into v_id;
  return v_id;
end $function$


-- ═══ FONCTION private.poser_delai_date
CREATE OR REPLACE FUNCTION private.poser_delai_date(p_client uuid, p_module text, p_objet_type text, p_objet_id text, p_libelle text, p_echeance date, p_source text, p_territoire text, p_rappels integer[] DEFAULT '{7,2,0}'::integer[], p_responsable uuid DEFAULT NULL::uuid, p_action text DEFAULT NULL::text, p_cle text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
begin
  perform private.exiger_ecriture_delai(p_client, p_objet_type, p_objet_id);
  perform private.exiger_porte_du_module(p_module);
  if p_echeance is null or nullif(btrim(p_source), '') is null then
    raise exception 'Une date et sa source (l''acte, le courrier, la saisie) sont nécessaires.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.territoires t where t.code = p_territoire) then
    raise exception 'Territoire inconnu : %.', coalesce(p_territoire, 'vide') using errcode = '22023';
  end if;
  if p_cle is not null then
    select d.id into v_id from public.delais d where d.client_id = p_client and d.module = p_module and d.cle_idempotence = p_cle;
    if found then
      return v_id;
    end if;
  end if;
  insert into public.delais (client_id, module, objet_type, objet_id, libelle, territoire, echeance_notifiee,
                             source_notification, rappels, responsable, action_attendue, cle_idempotence)
  values (p_client, p_module, p_objet_type, p_objet_id, p_libelle, p_territoire, p_echeance, p_source,
          private.rappels_propres(p_rappels), p_responsable, p_action, p_cle)
  returning id into v_id;
  return v_id;
end $function$


-- ═══ FONCTION private.prendre_travaux
CREATE OR REPLACE FUNCTION private.prendre_travaux(p_genres text[], p_nombre integer DEFAULT 5, p_bail interval DEFAULT '00:10:00'::interval, p_ouvrier text DEFAULT NULL::text)
 RETURNS SETOF travaux
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  return query
  with choisis as (
    select t.id from public.travaux t
    where t.genre = any (p_genres)
      and ((t.etat = 'a_faire' and t.prochain_le <= now())
           or (t.etat = 'en_cours' and t.verrou_jusqu_au < now()))
    order by t.priorite desc, t.prochain_le, t.id
    limit greatest(1, least(p_nombre, 100))
    for update skip locked
  )
  update public.travaux t
     set etat = 'en_cours', essais = t.essais + 1, verrou_jusqu_au = now() + p_bail,
         pris_par = left(p_ouvrier, 120), erreur = null
    from choisis
   where t.id = choisis.id
  returning t.*;
end $function$


-- ═══ FONCTION private.preparer_approbation
CREATE OR REPLACE FUNCTION private.preparer_approbation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_d public.demandes_validation;
  v_uid uuid := (select auth.uid());
  v_decideur uuid;
  v_delegation uuid;
begin
  if v_uid is null then
    raise exception 'Une décision est toujours prise par une personne connectée.' using errcode = '42501';
  end if;
  select * into v_d from public.demandes_validation where id = new.demande_id for update;
  if not found then
    raise exception 'Demande introuvable.' using errcode = 'P0002';
  end if;
  if v_d.statut <> 'en_attente' then
    raise exception 'Cette demande n''est plus en attente (%).', v_d.statut using errcode = '23514';
  end if;
  if v_d.echeance is not null and v_d.echeance <= now() then
    raise exception 'L''échéance de cette demande est passée.' using errcode = '23514';
  end if;
  new.user_id := v_uid;
  new.client_id := v_d.client_id;
  new.decide_le := now();
  v_decideur := coalesce(new.au_nom_de, v_uid);
  if new.au_nom_de is not null then
    select dl.id into v_delegation
    from public.delegations dl
    where dl.client_id = v_d.client_id
      and dl.delegant = new.au_nom_de
      and dl.delegataire = v_uid
      and dl.revoquee_le is null
      and now() >= dl.debut and now() < dl.fin
      and (dl.entite_id is null or dl.entite_id is not distinct from v_d.entite_id)
      and (dl.module is null or dl.module = v_d.module)
    order by dl.fin desc
    limit 1;
    if v_delegation is null then
      raise exception 'Aucune délégation en cours ne vous permet de décider au nom de cette personne.'
        using errcode = '42501';
    end if;
    new.delegation_id := v_delegation;
  else
    new.delegation_id := null;
  end if;
  if v_d.demandeur_id is not null and (v_uid = v_d.demandeur_id or v_decideur = v_d.demandeur_id) then
    raise exception 'Le demandeur ne décide pas de sa propre demande.' using errcode = '42501';
  end if;
  -- Lot 19c : celui qui a saisi ou corrigé la pièce (payload.saisi_par, tableau d'identifiants) ne l'approuve pas.
  if jsonb_typeof(v_d.payload -> 'saisi_par') = 'array'
     and (v_d.payload -> 'saisi_par' ? v_uid::text or v_d.payload -> 'saisi_par' ? v_decideur::text) then
    raise exception 'Celui qui a saisi la pièce ne l''approuve pas : une autre personne décide.' using errcode = '42501';
  end if;
  perform private.exiger_decideur(v_d, v_decideur);
  if not private.voit_objet_pour(v_uid, v_d.client_id, v_d.objet_type, v_d.objet_id) then
    raise exception 'Vous n''avez pas accès à l''objet de cette demande.' using errcode = '42501';
  end if;
  return new;
end $function$


-- ═══ FONCTION private.preparer_demande
CREATE OR REPLACE FUNCTION private.preparer_demande()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_regle public.regles_validation;
  v_uid uuid := (select auth.uid());
  v_politique uuid;
begin
  new.statut := 'en_attente';
  new.cree_le := now();
  new.decide_le := null;
  new.execute_le := null;
  new.motif_echec := null;
  new.politique_id := null;
  if v_uid is not null then
    new.demandeur_type := 'utilisateur';
    new.demandeur_id := v_uid;
  else
    new.demandeur_type := 'systeme';
    new.demandeur_id := null;
  end if;

  select r.* into v_regle
  from public.regles_validation r
  where r.client_id = new.client_id
    and r.module = new.module
    and r.actif
    and ((r.type_action is null and new.type_action <> 'politique.activer') or r.type_action = new.type_action)
    and (r.entite_id is null or r.entite_id = new.entite_id)
    and coalesce(new.montant, 0) >= r.montant_min
    and (r.montant_max is null or coalesce(new.montant, 0) < r.montant_max)
  order by (r.type_action is not null) desc, (r.entite_id is not null) desc,
           r.montant_min desc, r.approbations_requises desc
  limit 1;

  if found then
    new.regle_id := v_regle.id;
    new.approbations_requises := v_regle.approbations_requises;
    new.roles_autorises := v_regle.roles_autorises;
    new.equipe_id := v_regle.equipe_id;
    -- Les exigences de la règle sont recopiées sur la demande (lot 19) ; une exigence
    -- déjà posée par le module (payload.exigences) l'emporte si elle est plus stricte.
    new.exige_commentaire := coalesce(v_regle.exige_commentaire, false) or coalesce((new.payload -> 'exigences' ->> 'commentaire')::boolean, false);
    new.exige_piece := coalesce(v_regle.exige_piece, false) or coalesce((new.payload -> 'exigences' ->> 'piece_jointe')::boolean, false);
    new.exige_motif := coalesce(v_regle.exige_motif, true) or coalesce((new.payload -> 'exigences' ->> 'motif_refus')::boolean, false);
  else
    new.regle_id := null;
    new.approbations_requises := 1;
    new.roles_autorises := case when new.type_action = 'politique.activer'
                                then array['gerant'] else array['gerant', 'admin', 'valideur'] end;
    new.equipe_id := null;
    new.exige_commentaire := coalesce((new.payload -> 'exigences' ->> 'commentaire')::boolean, false);
    new.exige_piece := coalesce((new.payload -> 'exigences' ->> 'piece_jointe')::boolean, false);
    new.exige_motif := coalesce((new.payload -> 'exigences' ->> 'motif_refus')::boolean, true);
  end if;

  v_politique := private.politique_couvrante(new.client_id, new.module, new.type_action, new.entite_id,
                                             new.montant, now());
  if v_politique is not null then
    new.statut := 'approuvee';
    new.decide_le := now();
    new.politique_id := v_politique;
    new.approbations_requises := 0;
  end if;
  return new;
end $function$


-- ═══ FONCTION private.preparer_effacement
CREATE OR REPLACE FUNCTION private.preparer_effacement(p_client uuid, p_objet_type text DEFAULT NULL::text, p_objet_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_cle text := p_client::text || coalesce('/' || p_objet_type || '/' || p_objet_id, '');
  v_liste jsonb;
  v_manifeste jsonb;
begin
  if not exists (select 1 from public.clients where id = p_client) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  if (p_objet_type is null) <> (p_objet_id is null) then
    raise exception 'Un objet se désigne par son type et son identifiant.' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('bucket', f.bucket, 'nom', f.nom, 'octets', f.octets,
                                               'empreinte', f.empreinte) order by f.bucket, f.nom), '[]'::jsonb)
  into v_liste
  from private.fichiers_de(p_client, p_objet_type, p_objet_id) f;

  v_manifeste := jsonb_build_object(
    'nombre', jsonb_array_length(v_liste),
    'octets', (select coalesce(sum((e ->> 'octets')::bigint), 0) from jsonb_array_elements(v_liste) e),
    'empreinte_sha256', encode(sha256(convert_to(v_liste::text, 'UTF8')), 'hex'),
    'prepare_le', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));

  insert into private.manifestes_effacement (cle, manifeste) values (v_cle, v_manifeste)
  on conflict (cle) do update set manifeste = excluded.manifeste, cree_le = now();
  return jsonb_build_object('manifeste', v_manifeste, 'fichiers', v_liste);
end $function$


-- ═══ FONCTION private.preparer_envoi
CREATE OR REPLACE FUNCTION private.preparer_envoi(p_client uuid, p_module text, p_objet_type text, p_objet_id text, p_canal text, p_destinataire jsonb, p_gabarit text DEFAULT NULL::text, p_variables jsonb DEFAULT '{}'::jsonb, p_sujet text DEFAULT NULL::text, p_corps text DEFAULT NULL::text, p_pieces uuid[] DEFAULT NULL::uuid[], p_cle_idempotence text DEFAULT NULL::text, p_entite uuid DEFAULT NULL::uuid, p_transactionnel boolean DEFAULT false, p_donnees_sante boolean DEFAULT false, p_echeance timestamp with time zone DEFAULT NULL::timestamp with time zone, p_options jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid;
  v_id uuid;
  v_opt jsonb := coalesce(p_options, '{}'::jsonb);
  v_cle text;
  v_direct boolean;
  v_demande uuid;
begin
  v_uid := private.exiger_acteur_envoi(p_client, p_entite, p_objet_type, p_objet_id);
  if nullif(btrim(p_cle_idempotence), '') is null then
    raise exception 'Une clé d''idempotence est obligatoire : rejouer ne doit jamais envoyer deux fois.' using errcode = '22023';
  end if;
  select e.id into v_id from public.envois e where e.client_id = p_client and e.cle_idempotence = btrim(p_cle_idempotence);
  if v_id is not null then
    return v_id;
  end if;
  if jsonb_typeof(v_opt) <> 'object' then
    raise exception 'Les options forment un objet JSON.' using errcode = '22023';
  end if;
  for v_cle in select jsonb_object_keys(v_opt) loop
    if v_cle not in ('direct', 'repondre_a', 'demande', 'espacement') then
      raise exception 'Option inconnue : « % » (direct, repondre_a, demande, espacement).', v_cle using errcode = '22023';
    end if;
  end loop;
  if (v_opt ? 'direct' and jsonb_typeof(v_opt -> 'direct') <> 'boolean')
     or (v_opt ? 'espacement' and jsonb_typeof(v_opt -> 'espacement') <> 'boolean') then
    raise exception 'Les options direct et espacement valent true ou false.' using errcode = '22023';
  end if;
  v_direct := coalesce((v_opt ->> 'direct')::boolean, false);
  if v_direct then
    if v_uid is null then
      raise exception 'Un moteur ne se passe jamais de la validation : un accord permanent peut couvrir ses envois.'
        using errcode = '42501';
    end if;
    if not private.a_le_droit(p_client, 'envois.direct') then
      raise exception 'Envoyer sans validation demande le droit « envois.direct », accordé par le gérant.' using errcode = '42501';
    end if;
    if v_opt ? 'demande' then
      raise exception 'Direct, ou adossé à une décision : pas les deux.' using errcode = '22023';
    end if;
  end if;
  if v_opt ? 'espacement' and v_uid is not null then
    raise exception 'Seul un moteur règle l''espacement d''un texte libre.' using errcode = '42501';
  end if;
  if v_opt ? 'demande' then
    begin
      v_demande := (v_opt ->> 'demande')::uuid;
    exception when others then
      raise exception 'L''option demande est l''identifiant d''une demande de validation.' using errcode = '22023';
    end;
  end if;
  begin
    return private.creer_envoi(
      p_client, p_module, p_objet_type, p_objet_id, p_canal, p_destinataire, p_gabarit, p_variables, p_sujet, p_corps,
      p_pieces, btrim(p_cle_idempotence), p_entite, p_transactionnel, p_donnees_sante, p_echeance,
      v_direct, v_opt ->> 'repondre_a', v_demande, (v_opt ->> 'espacement')::boolean, v_uid, null, null);
  exception when unique_violation then
    -- Deux appels simultanés avec la même clé : le second rend le premier.
    select e.id into v_id from public.envois e where e.client_id = p_client and e.cle_idempotence = btrim(p_cle_idempotence);
    if v_id is null then
      raise;
    end if;
    return v_id;
  end;
end $function$


-- ═══ FONCTION private.preparer_rattachement
CREATE OR REPLACE FUNCTION private.preparer_rattachement()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if old.objet_id is null and new.objet_id is not null and new.statut = 'a_rattacher' then
    new.statut := 'recue';
  end if;
  return new;
end $function$


-- ═══ FONCTION private.publier_decision
CREATE OR REPLACE FUNCTION private.publier_decision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.type_action = 'politique.activer' then
    return null;
  end if;
  if (tg_op = 'INSERT' and new.statut = 'approuvee')
     or (tg_op = 'UPDATE' and old.statut = 'en_attente' and new.statut in ('approuvee', 'rejetee', 'expiree')) then
    perform private.publier_evenement(new.client_id, 'demande.decidee.' || new.module,
      jsonb_build_object(
        'demande', new.id, 'statut', new.statut, 'type_action', new.type_action,
        'objet_type', new.objet_type, 'objet_id', new.objet_id, 'entite', new.entite_id,
        'politique', new.politique_id, 'decide_le', new.decide_le,
        'decideurs', (select coalesce(jsonb_agg(jsonb_build_object('user', a.user_id, 'au_nom_de', a.au_nom_de,
                                                                   'decision', a.decision) order by a.decide_le), '[]'::jsonb)
                      from public.approbations a where a.demande_id = new.id)),
      new.id::text || ':' || new.statut);
  end if;
  return null;
end $function$


-- ═══ FONCTION private.publier_evenement
CREATE OR REPLACE FUNCTION private.publier_evenement(p_client uuid, p_evenement text, p_charge jsonb DEFAULT '{}'::jsonb, p_cle text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r record; n integer := 0;
begin
  for r in select a.module, a.genre from private.abonnements a where a.evenement = p_evenement loop
    perform private.deposer_travail(p_client, r.module, r.genre,
      coalesce(p_charge, '{}'::jsonb) || jsonb_build_object('evenement', p_evenement),
      case when p_cle is null then null else p_evenement || ':' || p_cle end, 0::smallint);
    n := n + 1;
  end loop;
  return n;
end $function$


-- ═══ FONCTION private.publier_releve
CREATE OR REPLACE FUNCTION private.publier_releve(p_releve uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  b public.branchements;
  v_charge jsonb;
  v_n integer;
begin
  if p_releve is null
     or exists (select 1 from public.instantanes i where i.releve_id = p_releve and i.statut in ('recu', 'en_lecture', 'lu'))
     or not exists (select 1 from public.instantanes i
                    where i.releve_id = p_releve and i.statut in ('a_appliquer', 'applique') and i.publie_le is null) then
    return 0;
  end if;
  select x.* into b from public.branchements x join public.releves r on r.branchement_id = x.id where r.id = p_releve;
  select count(*) into v_n from public.instantanes i where i.releve_id = p_releve and i.publie_le is not null;
  v_charge := jsonb_build_object('releve', p_releve, 'branchement', b.id, 'module', b.module, 'logiciel', b.logiciel,
    'entite', b.entite_id, 'instantanes', (
      select jsonb_agg(jsonb_build_object('instantane', i.id, 'jeu', j.code, 'statut', i.statut, 'lignes', i.lignes,
                                          'ajouts', i.ajouts, 'modifications', i.modifications,
                                          'disparitions', i.disparitions, 'force', i.force)
                       order by j.code nulls last, i.recu_le)
      from public.instantanes i left join public.branchements_jeux j on j.id = i.jeu_id
      where i.releve_id = p_releve));
  update public.instantanes set publie_le = now()
   where releve_id = p_releve and statut in ('a_appliquer', 'applique') and publie_le is null;
  return private.publier_evenement(b.client_id, 'releve.pret.' || b.module, v_charge, p_releve::text || ':' || v_n::text);
end $function$


-- ═══ FONCTION private.purger_releves
CREATE OR REPLACE FUNCTION private.purger_releves(p_maintenant timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET enable_nestloop TO 'off'
 SET work_mem TO '32MB'
AS $function$
declare
  r record;
  v_lignes integer;
  v_ecarts integer;
  v_etat integer := 0;
  v_n integer;
begin
  delete from public.instantanes_lignes l using public.instantanes i
  where i.id = l.instantane_id
    and (i.statut in ('applique', 'identique', 'remplace', 'ecarte', 'a_classer', 'rejete', 'echec')
         or (i.statut = 'douteux' and i.finalise_le < p_maintenant - interval '35 days'));
  get diagnostics v_lignes = row_count;

  delete from public.instantanes_ecarts e using public.instantanes i
  where i.id = e.instantane_id and i.statut <> 'a_appliquer' and e.cree_le < p_maintenant - interval '35 days';
  get diagnostics v_ecarts = row_count;

  for r in
    select j.id, j.fenetre, b.fuseau from public.branchements_jeux j join public.branchements b on b.id = j.branchement_id
    where j.fenetre ? 'du'
  loop
    delete from public.jeux_lignes s
    where s.jeu_id = r.id
      and private.date_de(s.valeurs ->> (r.fenetre ->> 'colonne'), r.fuseau)
          < (p_maintenant at time zone r.fuseau)::date + (r.fenetre ->> 'du')::integer - 1;
    get diagnostics v_n = row_count;
    if v_n > 0 then
      update public.branchements_jeux set lignes = (select count(*) from public.jeux_lignes s where s.jeu_id = r.id)
       where id = r.id;
      v_etat := v_etat + v_n;
    end if;
  end loop;
  return jsonb_build_object('lignes', v_lignes, 'ecarts', v_ecarts, 'etat', v_etat);
end $function$


-- ═══ FONCTION private.rattacher_membre
CREATE OR REPLACE FUNCTION private.rattacher_membre(p_client uuid, p_email text, p_role text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_role_session text := coalesce(nullif(current_setting('role', true), 'none'), session_user::text);
  v_membre uuid;
begin
  if p_role is null or p_role not in ('gerant', 'admin', 'valideur', 'collaborateur', 'lecteur') then
    raise exception 'Rôle inconnu : %.', coalesce(p_role, 'vide') using errcode = '22023';
  end if;

  if v_uid is null then
    if v_role_session <> 'service_role' then
      raise exception 'Seul un gérant ou un administrateur ajoute un membre.' using errcode = '42501';
    end if;
  elsif not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Seul un gérant ou un administrateur ajoute un membre.' using errcode = '42501';
  elsif p_role = 'gerant' and not private.a_un_role(p_client, array['gerant']) then
    raise exception 'Seul un gérant nomme un autre gérant.' using errcode = '42501';
  end if;

  select u.id into v_membre
  from auth.users u
  where lower(u.email) = lower(btrim(p_email))
  limit 1;
  if v_membre is null then
    raise exception 'Aucun compte pour cette adresse.' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.comptes c where c.client_id = p_client and c.user_id = v_membre) then
    raise exception 'Cette personne est déjà membre de l''organisation.' using errcode = '23505';
  end if;

  insert into public.comptes (user_id, client_id, role) values (v_membre, p_client, p_role);
  return v_membre;
end $function$


-- ═══ FONCTION private.recevoir_releve
CREATE OR REPLACE FUNCTION private.recevoir_releve(p_branchement uuid, p_fichiers jsonb, p_canal text DEFAULT 'depot'::text, p_cle text DEFAULT NULL::text, p_expediteur text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  b public.branchements;
  j public.branchements_jeux;
  f jsonb;
  v_releve uuid;
  v_rel uuid;
  v_par_jeu jsonb := '{}'::jsonb;
  v_prefixe text;
  v_piece uuid;
  v_courant uuid;
  v_id uuid;
  v_jeu uuid;
  v_recu timestamptz;
  v_statut text;
  v_res jsonb := '[]'::jsonb;
begin
  select * into b from public.branchements where id = p_branchement;
  if not found then
    raise exception 'Branchement introuvable.' using errcode = 'P0002';
  end if;
  if b.statut <> 'actif' then
    raise exception 'Le branchement « % » est %.', b.libelle, b.statut using errcode = '55000';
  end if;
  if p_fichiers is null or jsonb_typeof(p_fichiers) <> 'array' or jsonb_array_length(p_fichiers) = 0 then
    raise exception 'Un relevé porte au moins un fichier.' using errcode = '22023';
  end if;
  if p_cle is not null then
    select r.id into v_releve from public.releves r where r.branchement_id = b.id and r.cle = p_cle;
    if found then
      return private.resume_releve(v_releve) || jsonb_build_object('deja_recu', true);
    end if;
  end if;

  insert into public.releves (client_id, branchement_id, canal, cle, expediteur)
  values (b.client_id, b.id, p_canal, p_cle, left(p_expediteur, 320))
  returning id into v_releve;
  -- Le rangement du socle : <client>/branchement/<id>/… (l'effacement de l'objet le suit).
  v_prefixe := b.client_id::text || '/branchement/' || b.id::text || '/';

  for f in select * from jsonb_array_elements(p_fichiers) loop
    if jsonb_typeof(f) <> 'object' or coalesce(f ->> 'sha256', '') !~ '^[0-9a-f]{64}$'
       or nullif(btrim(f ->> 'nom_fichier'), '') is null or not starts_with(coalesce(f ->> 'chemin', ''), v_prefixe) then
      raise exception 'Fichier mal décrit : nom, empreinte SHA-256 et chemin sous « % » sont nécessaires.', v_prefixe
        using errcode = '22023';
    end if;
    j := null;
    if f ->> 'jeu' is not null then
      select * into j from public.branchements_jeux x where x.branchement_id = b.id and x.code = f ->> 'jeu';
      if not found or not j.actif then
        raise exception 'Jeu inconnu ou inactif pour ce branchement : %.', f ->> 'jeu' using errcode = '22023';
      end if;
    end if;
    if f -> 'fenetre' is not null and f -> 'fenetre' <> 'null'::jsonb
       and not (f -> 'fenetre' ? 'colonne') and (j.id is null or j.fenetre is null) then
      raise exception 'Une fenêtre de fichier nomme sa colonne, ou suit celle de son jeu.' using errcode = '22023';
    end if;
    if f -> 'perimetre' is not null and f -> 'perimetre' <> 'null'::jsonb and j.id is not null and j.colonnes <> '{}'::jsonb
       and exists (select 1 from jsonb_object_keys(f -> 'perimetre') k
                   where not (j.colonnes ? k) or j.colonnes -> k -> 'sensible' = 'true'::jsonb) then
      raise exception 'Un périmètre ne porte que sur des colonnes déclarées et non sensibles.' using errcode = '22023';
    end if;

    -- Le même contenu déjà en cours sur ce branchement : on ne le lit pas deux fois.
    select i.id, i.statut into v_id, v_statut from public.instantanes i
    where i.branchement_id = b.id and i.sha256 = f ->> 'sha256' and i.statut in ('recu', 'en_lecture', 'lu', 'a_appliquer')
      and (j.id is null or i.jeu_id is null or i.jeu_id = j.id)
    order by i.recu_le desc
    limit 1;
    if found then
      v_res := v_res || jsonb_build_array(jsonb_build_object('instantane', v_id, 'nom_fichier', f ->> 'nom_fichier',
                                                             'statut', v_statut, 'deja_recu', true));
      continue;
    end if;

    -- La pièce : une par contenu et par branchement ; elle ne passe jamais par le lecteur de pièces.
    select p.id into v_piece from public.pieces p
    where p.client_id = b.client_id and p.module = b.module and p.objet_type = 'branchement'
      and p.objet_id = b.id::text and p.sha256 = f ->> 'sha256';
    if not found then
      insert into public.pieces (client_id, module, objet_type, objet_id, source, expediteur, nom_fichier, mime, octets,
                                 sha256, chemin, statut, type_piece, confiance_type, methode)
      values (b.client_id, b.module, 'branchement', b.id::text, 'export', left(p_expediteur, 320), left(f ->> 'nom_fichier', 255),
              left(coalesce(nullif(f ->> 'mime', ''), 'application/octet-stream'), 120), coalesce((f ->> 'octets')::bigint, 0),
              f ->> 'sha256', f ->> 'chemin', 'en_lecture', 'export', 1, 'tableur')
      returning id into v_piece;
    end if;

    -- Un seul export par jeu dans un relevé : le second fait son propre relevé.
    v_rel := v_releve;
    if j.id is not null then
      if v_par_jeu ? j.id::text then
        insert into public.releves (client_id, branchement_id, canal, expediteur)
        values (b.client_id, b.id, p_canal, left(p_expediteur, 320))
        returning id into v_rel;
      end if;
      v_par_jeu := v_par_jeu || jsonb_build_object(j.id::text, v_rel);
    end if;

    v_courant := case when f -> 'complet' is null and f -> 'fenetre' is null and f -> 'perimetre' is null
                      then private.identique_au_courant(b.id, j.id, f ->> 'sha256') end;
    if v_courant is not null then
      -- Copie exacte de l'état : rien à lire, l'état est confirmé.
      insert into public.instantanes (client_id, releve_id, branchement_id, jeu_id, piece_id, nom_fichier, sha256, octets,
                                      statut, base_id, lignes, lignes_base, ajouts, modifications, disparitions, absences,
                                      lu_le, finalise_le)
      select b.client_id, v_rel, b.id, c.jeu_id, v_piece, left(f ->> 'nom_fichier', 255), f ->> 'sha256',
             (f ->> 'octets')::bigint, 'identique', c.id, c.lignes, x.lignes, 0, 0, 0, 0, now(), now()
      from public.instantanes c join public.branchements_jeux x on x.id = c.jeu_id
      where c.id = v_courant
      returning id, jeu_id, statut, recu_le into v_id, v_jeu, v_statut, v_recu;
      perform private.jeu_vu(v_jeu, v_recu);
      perform private.confirmer_etat(v_jeu, v_recu);
    else
      insert into public.instantanes (client_id, releve_id, branchement_id, jeu_id, piece_id, nom_fichier, sha256, octets,
                                      complet, fenetre, perimetre)
      values (b.client_id, v_rel, b.id, j.id, v_piece, left(f ->> 'nom_fichier', 255), f ->> 'sha256', (f ->> 'octets')::bigint,
              (f ->> 'complet')::boolean, nullif(f -> 'fenetre', 'null'::jsonb), nullif(f -> 'perimetre', 'null'::jsonb))
      returning id, statut, recu_le into v_id, v_statut, v_recu;
      perform private.deposer_travail(b.client_id, b.module, 'releve.lire', jsonb_build_object('instantane', v_id),
                                      'instantane:' || v_id::text, 0::smallint);
      if j.id is not null then
        perform private.jeu_vu(j.id, v_recu);
      end if;
    end if;
    v_res := v_res || jsonb_build_array(jsonb_build_object('instantane', v_id, 'nom_fichier', f ->> 'nom_fichier',
                                                           'statut', v_statut));
  end loop;
  return jsonb_build_object('releve', v_releve, 'instantanes', v_res);
end $function$


-- ═══ FONCTION private.regler_battement
CREATE OR REPLACE FUNCTION private.regler_battement(p_client uuid, p_module text, p_attendu interval, p_plages jsonb DEFAULT NULL::jsonb, p_fuseau text DEFAULT 'Europe/Paris'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.battements as b (client_id, module, attendu_toutes, plages, fuseau)
  values (p_client, p_module, p_attendu, p_plages, p_fuseau)
  on conflict (client_id, module) do update
    set attendu_toutes = excluded.attendu_toutes, plages = excluded.plages, fuseau = excluded.fuseau;
end $function$


-- ═══ FONCTION private.regler_branchement
CREATE OR REPLACE FUNCTION private.regler_branchement(p_branchement uuid, p_reglages jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  b public.branchements;
  p jsonb := coalesce(p_reglages, '{}'::jsonb);
begin
  select * into b from public.branchements where id = p_branchement for update;
  if not found then
    raise exception 'Branchement introuvable.' using errcode = 'P0002';
  end if;
  perform private.exiger_gestion_releve(b.client_id, b.entite_id);
  if jsonb_typeof(p) <> 'object' or exists (select 1 from jsonb_object_keys(p) k where k not in ('libelle', 'statut', 'voie', 'fuseau')) then
    raise exception 'Réglages possibles : libelle, statut, voie, fuseau.' using errcode = '22023';
  end if;
  update public.branchements set
    libelle = coalesce(p ->> 'libelle', libelle),
    statut = coalesce(p ->> 'statut', statut),
    voie = coalesce(p ->> 'voie', voie),
    fuseau = coalesce(p ->> 'fuseau', fuseau),
    maj_le = now()
  where id = b.id;
end $function$


-- ═══ FONCTION private.resoudre_boite
CREATE OR REPLACE FUNCTION private.resoudre_boite(p_canal text, p_boite text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare x public.expediteurs; c public.clients;
begin
  perform private.exiger_ouvrier();
  if p_canal is null or p_boite is null then return null; end if;
  if p_canal = 'formulaire' then
    select * into c from public.clients k where k.config ->> 'boite_formulaire' = p_boite order by k.cree_le limit 1;
    if c.id is null then return null; end if;
    return jsonb_build_object('client_id', c.id, 'entite_id', null, 'module', coalesce(c.config ->> 'module_formulaire', 'reput'), 'expediteur_id', null);
  end if;
  select * into x from public.expediteurs e
   where e.canal = p_canal
     and (lower(e.identite) = lower(p_boite) or e.parametres ->> 'phone_number_id' = p_boite)
   order by (e.statut = 'actif') desc, e.maj_le desc limit 1;
  if x.id is null then return null; end if;
  return jsonb_build_object('client_id', x.client_id, 'entite_id', null, 'module', x.module, 'expediteur_id', x.id);
end $function$


-- ═══ FONCTION private.resume_releve
CREATE OR REPLACE FUNCTION private.resume_releve(p_releve uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object('releve', p_releve, 'instantanes', coalesce((
    select jsonb_agg(jsonb_build_object('instantane', i.id, 'nom_fichier', i.nom_fichier, 'statut', i.statut,
                                        'jeu', (select j.code from public.branchements_jeux j where j.id = i.jeu_id))
                     order by i.recu_le, i.nom_fichier)
    from public.instantanes i
    where i.releve_id = p_releve), '[]'::jsonb))
$function$


-- ═══ FONCTION private.retirer_section
CREATE OR REPLACE FUNCTION private.retirer_section(p_client uuid, p_module text, p_jour date, p_destinataire uuid, p_role text, p_titre text, p_entite uuid DEFAULT NULL::uuid, p_equipe uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  n integer;
begin
  delete from public.points_sections s
  where s.client_id = p_client and s.module = p_module and s.jour = p_jour
    and s.destinataire is not distinct from p_destinataire and s.role is not distinct from p_role
    and s.equipe_id is not distinct from p_equipe and s.entite_id is not distinct from p_entite
    and s.titre = btrim(p_titre);
  get diagnostics n = row_count;
  return n > 0;
end $function$


-- ═══ FONCTION private.signature_releve
CREATE OR REPLACE FUNCTION private.signature_releve(p_par text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_entetes jsonb;
  v_nom text;
begin
  if v_uid is not null then
    return coalesce((select u.email from auth.users u where u.id = v_uid), v_uid::text);
  end if;
  begin
    v_entetes := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    v_entetes := null;
  end;
  v_nom := coalesce(nullif(btrim(p_par), ''), nullif(current_setting('omega.operateur', true), ''),
                    nullif(v_entetes ->> 'x-omega-operateur', ''));
  if v_nom is null then
    raise exception 'Une décision sur un relevé est toujours signée : qui tranche ?' using errcode = '22023';
  end if;
  perform set_config('omega.operateur', left(v_nom, 120), true);
  return 'operateur ' || left(v_nom, 120);
end $function$


-- ═══ FONCTION private.tache_envois
CREATE OR REPLACE FUNCTION private.tache_envois(p_maintenant timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  e public.envois;
  v_expires integer := 0;
  v_repris integer := 0;
  v_liberes integer := 0;
  v_confies integer := 0;
begin
  -- L'échéance passée : l'envoi n'a plus lieu d'être.
  for r in
    select x.id from public.envois x
    where (x.statut in ('a_valider', 'differe', 'pret') and x.echeance <= p_maintenant)
       or (x.statut = 'en_cours' and x.bail_jusqu_au < p_maintenant and x.echeance <= p_maintenant)
    order by x.echeance limit 1000
  loop
    if private.clore_envoi(r.id, 'expire', 'ECHEANCE', 'L''échéance de cet envoi est passée avant son départ.') then
      v_expires := v_expires + 1;
    end if;
  end loop;
  -- L'heure est venue pour les envois différés.
  for r in
    select x.id from public.envois x
    where x.statut = 'differe' and x.reprise_le <= p_maintenant
    order by x.reprise_le limit 1000
  loop
    perform private.envoi_valide(r.id, p_maintenant);
    v_repris := v_repris + 1;
  end loop;
  -- Un envoi manuel ouvert puis laissé redevient à faire.
  update public.envois set statut = 'pret', bail_jusqu_au = null
   where statut = 'en_cours' and fournisseur = 'manuel' and bail_jusqu_au < p_maintenant;
  get diagnostics v_liberes = row_count;
  -- Un envoi prêt chez un fournisseur branché a toujours son travail.
  for e in
    select x.* from public.envois x
    join private.fournisseurs_envoi f on f.fournisseur = x.fournisseur and f.automatique and f.branche
    where x.statut = 'pret'
      and not exists (select 1 from public.travaux t
                      where t.genre = 'envois.' || x.fournisseur and t.cle = 'envoi:' || x.id::text
                        and t.etat in ('a_faire', 'en_cours'))
    limit 1000
  loop
    perform private.confier_envoi(e);
    v_confies := v_confies + 1;
  end loop;
  return jsonb_build_object('expires', v_expires, 'repris', v_repris, 'liberes', v_liberes, 'confies', v_confies);
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


-- ═══ FONCTION private.territoire_de_entite
CREATE OR REPLACE FUNCTION private.territoire_de_entite(p_client uuid, p_entite uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with recursive chaine (id, parent_id, territoire, rang) as (
    select e.id, e.parent_id, e.territoire, 0
    from public.entites e where e.client_id = p_client and e.id = p_entite
    union all
    select p.id, p.parent_id, p.territoire, c.rang + 1
    from chaine c join public.entites p on p.client_id = p_client and p.id = c.parent_id
    where c.territoire is null and c.rang < 32
  )
  select public.territoire_calendrier(c.territoire) from chaine c
  where c.territoire is not null
  order by c.rang limit 1
$function$


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


-- ═══ FONCTION private.trancher_instantane
CREATE OR REPLACE FUNCTION private.trancher_instantane(p_instantane uuid, p_decision text, p_motif text DEFAULT NULL::text, p_par text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  i public.instantanes;
  b public.branchements;
  j public.branchements_jeux;
  v_par text;
begin
  select * into i from public.instantanes where id = p_instantane for update;
  if not found or ((select auth.uid()) is not null and not exists (
       select 1 from public.comptes c where c.user_id = (select auth.uid()) and c.client_id = i.client_id)) then
    raise exception 'Instantané introuvable.' using errcode = 'P0002';
  end if;
  select * into b from public.branchements where id = i.branchement_id;
  perform private.exiger_gestion_releve(b.client_id, b.entite_id);
  v_par := private.signature_releve(p_par);
  select * into j from public.branchements_jeux where id = i.jeu_id;

  if p_decision = 'appliquer' then
    if i.statut <> 'douteux' then
      raise exception 'Seul un relevé douteux s''applique sur décision (statut %).', i.statut using errcode = '55000';
    end if;
    if exists (select 1 from public.instantanes k
               where k.jeu_id = i.jeu_id and k.id <> i.id and k.recu_le > i.recu_le
                 and k.statut in ('recu', 'en_lecture', 'lu', 'a_appliquer', 'applique', 'identique', 'douteux')) then
      raise exception 'Un export plus récent de ce jeu existe : c''est lui qu''il faut trancher.' using errcode = '55000';
    end if;
    update public.instantanes
       set force = true, tranche_par = v_par, tranche_le = now(),
           motif = left(coalesce(nullif(btrim(p_motif), ''), motif), 500)
     where id = i.id;
    if i.lignes = 0 or exists (select 1 from public.instantanes_lignes l where l.instantane_id = i.id) then
      update public.instantanes set statut = 'lu' where id = i.id;
      perform private.avancer_jeu(i.jeu_id, private.limite_requete());
    else
      -- Les lignes sont purgées : on relit le fichier.
      update public.instantanes set statut = 'recu' where id = i.id;
      perform private.deposer_travail(b.client_id, b.module, 'releve.lire', jsonb_build_object('instantane', i.id),
                                      'instantane:' || i.id::text, 0::smallint);
    end if;
  elsif p_decision = 'ecarter' then
    if i.statut not in ('douteux', 'a_classer', 'rejete', 'echec') then
      raise exception 'Seul un relevé douteux, non reconnu ou illisible s''écarte (statut %).', i.statut using errcode = '55000';
    end if;
    update public.instantanes
       set statut = 'ecarte', tranche_par = v_par, tranche_le = now(),
           motif = left(coalesce(nullif(btrim(p_motif), ''), motif), 500)
     where id = i.id;
    delete from public.instantanes_lignes where instantane_id = i.id;
    update public.pieces set statut = 'lue' where id = i.piece_id and statut = 'a_verifier';
    if i.jeu_id is not null and not exists (select 1 from public.instantanes k where k.jeu_id = i.jeu_id and k.statut = 'douteux') then
      perform private.fermer_alertes_releve(b.client_id, b.module, 'releve.douteux.' || i.jeu_id::text, 'écarté par ' || v_par);
      perform private.fermer_alertes_releve(b.client_id, b.module, 'releve.douteux_suite.' || i.jeu_id::text, 'écarté par ' || v_par);
    end if;
    if not exists (select 1 from public.instantanes k where k.branchement_id = b.id and k.statut = 'a_classer') then
      perform private.fermer_alertes_releve(b.client_id, b.module, 'releve.a_classer.' || b.id::text, 'écarté par ' || v_par);
    end if;
    if not exists (select 1 from public.instantanes k where k.branchement_id = b.id and k.statut in ('rejete', 'echec')) then
      perform private.fermer_alertes_releve(b.client_id, b.module, 'releve.illisible.' || b.id::text, 'écarté par ' || v_par);
    end if;
  else
    raise exception 'Décision inconnue : % (appliquer ou ecarter).', coalesce(p_decision, 'vide') using errcode = '22023';
  end if;
  return (select jsonb_build_object('instantane', x.id, 'statut', x.statut, 'tranche_par', x.tranche_par)
          from public.instantanes x where x.id = i.id);
end $function$


-- ═══ FONCTION private.verifier_calendrier
CREATE OR REPLACE FUNCTION private.verifier_calendrier(p_territoire text, p_jour date)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_complet boolean;
begin
  select t.complet into v_complet from public.territoires t where t.code = p_territoire;
  if not found then
    raise exception 'Territoire inconnu : %.', coalesce(p_territoire, 'vide') using errcode = '22023';
  end if;
  if not v_complet then
    raise exception 'Les jours fériés de droit local de % ne sont pas au calendrier : aucun décompte en jours ouvrés ou ouvrables, ni aucune prorogation, n''y est calculé.', p_territoire
      using errcode = '22023',
            hint = 'Relever ses jours dans le texte local, les ajouter à private.jours_feries_regles, régénérer, puis passer territoires.complet à vrai.';
  end if;
  if not exists (select 1 from public.jours_feries f
                 where f.territoire = p_territoire
                   and f.jour >= make_date(extract(year from p_jour)::int, 1, 1)
                   and f.jour <= make_date(extract(year from p_jour)::int, 12, 31)) then
    raise exception 'Le calendrier officiel de % ne couvre pas %.', p_territoire, extract(year from p_jour)::int
      using errcode = '22023', hint = 'Générer l''année par private.generer_jours_feries, après avoir vérifié les règles.';
  end if;
end $function$


-- ═══ FONCTION private.verrous_envoi
CREATE OR REPLACE FUNCTION private.verrous_envoi(p_e envois, p_complet boolean, p_instant timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r jsonb := private.reglages_envois_effectifs(p_e.client_id, p_e.module);
  v_canal private.canaux_envoi;
  v_module private.modules_envois;
  v_mode text;
  v_exp public.expediteurs;
  v_fournisseur text;
  v_agree boolean;
  v_type text;
  v_jusqu_au timestamptz;
  v_verrou jsonb;
  v_plages jsonb;
  v_legales jsonb;
  v_t timestamptz;
  v_t2 timestamptz;
  v_dernier timestamptz;
  v_delai interval;
  v_n integer;
  v_n_org integer;
  v_debut timestamptz;
  v_fuseau_org text;
  v_complet boolean;
begin
  select * into v_canal from private.canaux_envoi c where c.canal = p_e.canal;
  select * into v_module from private.modules_envois m where m.module = p_e.module;

  if p_complet and coalesce((select g.valeur from private.reglages g where g.cle = 'envois_arret_general'), 'non') = 'oui' then
    return private.verrou('ARRET_GENERAL', 'Arrêt général des envois : rien ne part tant qu''Omega ne l''a pas levé.',
                          false, p_instant + interval '15 minutes');
  end if;

  v_mode := r ->> 'mode';
  if v_mode is null then
    return private.verrou('CONFIG_ABSENTE',
      format('Le module %s n''est pas réglé pour cette organisation : aucun envoi.', p_e.module));
  elsif v_mode = 'coupe' then
    return private.verrou('MOTEUR_COUPE', format('Les envois du module %s sont coupés pour cette organisation.', p_e.module));
  end if;
  if p_e.mode = 'essai' then
    v_mode := 'essai';   -- un envoi préparé en essai ne devient jamais réel
  end if;

  if (v_module.canaux is not null and not (p_e.canal = any (v_module.canaux)))
     or (jsonb_typeof(r -> 'canaux_organisation') = 'array' and not ((r -> 'canaux_organisation') ? p_e.canal))
     or (jsonb_typeof(r -> 'canaux_module') = 'array' and not ((r -> 'canaux_module') ? p_e.canal)) then
    return private.verrou('CANAL_NON_PERMIS', format('Le canal %s n''est pas permis pour ces envois.', v_canal.libelle));
  end if;
  if not v_canal.permis_sante and ((r ->> 'sante')::boolean or coalesce(v_module.sante, false)) then
    return private.verrou('CANAL_NON_PERMIS',
      format('Pas de %s dans un contexte de santé : aucun prestataire n''y est certifié.', v_canal.libelle));
  end if;

  if p_e.destinataire_adresse is null then
    return private.verrou('DESTINATAIRE_SANS_ADRESSE', coalesce(p_e.motif, 'Le destinataire n''a pas d''adresse pour ce canal.'));
  end if;

  if v_mode = 'essai' then
    if r ->> 'essai_adresse' is null then
      return private.verrou('ESSAI_SANS_ADRESSE', 'Mode essai sans adresse où recevoir les messages : réglez essai_adresse.');
    end if;
    v_fournisseur := coalesce((select g.valeur from private.reglages g where g.cle = 'envois_essai_fournisseur'), 'brevo');
  else
    select x.* into v_exp from public.expediteurs x
    where x.client_id = p_e.client_id and x.canal = p_e.canal and x.statut = 'actif'
      and (x.module is null or x.module = p_e.module)
    order by (x.module is not null) desc
    limit 1;
    if v_exp.id is null then
      return private.verrou('EXPEDITEUR_ABSENT',
        format('Aucun expéditeur actif pour le canal %s : Omega le branche à l''installation.', v_canal.libelle));
    end if;
    v_fournisseur := v_exp.fournisseur;
  end if;
  v_agree := coalesce((select f.agree_sante from private.fournisseurs_envoi f where f.fournisseur = v_fournisseur), false);

  select o.type, o.jusqu_au into v_type, v_jusqu_au
  from public.oppositions o
  where o.client_id = p_e.client_id and o.levee_le is null
    and (o.adresse = p_e.destinataire_adresse or (p_e.destinataire_ref is not null and o.ref = p_e.destinataire_ref))
    and (o.canal is null or o.canal = p_e.canal)
    and (o.type <> 'pause' or o.jusqu_au > p_instant)
    and not (o.type = 'desinscription' and p_e.canal = 'lre')
  order by case o.type when 'invalide' then 1 when 'desinscription' then 2 else 3 end, o.jusqu_au desc nulls first
  limit 1;
  if v_type = 'invalide' then
    return private.verrou('ADRESSE_INVALIDE', 'Cette adresse ne reçoit pas les messages (rebond, numéro erroné).');
  elsif v_type = 'desinscription' then
    return private.verrou('DESINSCRIT', 'Cette personne a demandé à ne plus recevoir de messages.');
  elsif v_type = 'pause' then
    return private.verrou('PAUSE', format('Cette personne est en pause jusqu''au %s : une réponse attend d''être traitée.',
                                          private.date_fr(v_jusqu_au, p_e.destinataire_fuseau)));
  end if;

  if (v_canal.consentement_toujours or not p_e.transactionnel
      or (p_e.canal = 'lre' and not p_e.destinataire_professionnel))
     and not exists (select 1 from public.consentements k
                     where k.client_id = p_e.client_id and k.canal = p_e.canal
                       and k.adresse = p_e.destinataire_adresse and k.retire_le is null
                       and (p_e.transactionnel or k.portee = 'tout')) then
    return private.verrou('CONSENTEMENT_ABSENT', case
      when v_canal.consentement_toujours then 'WhatsApp exige l''accord préalable du destinataire : il manque.'
      when not p_e.transactionnel then 'Un message non transactionnel exige l''accord du destinataire : il manque.'
      else 'Une LRE à un particulier exige son accord préalable (CPCE, art. L100) : il manque.' end);
  end if;

  if p_e.donnees_sante and not v_agree then
    return private.verrou('SANTE_HORS_CANAL_AGREE',
      'Ce message porte des données de santé : il ne part que par un expéditeur agréé (HDS, MSSanté).');
  end if;

  if exists (select 1 from public.envois x
             where x.client_id = p_e.client_id and x.canal = p_e.canal and x.mode = p_e.mode
               and x.destinataire_adresse = p_e.destinataire_adresse and x.empreinte = p_e.empreinte
               and x.statut in ('a_valider', 'differe', 'pret', 'en_cours', 'envoye')
               and (p_e.suivi_id is null or x.suivi_id is distinct from p_e.suivi_id)
               and (x.cree_le, x.id) < (p_e.cree_le, p_e.id)
               and x.cree_le > p_instant - (r ->> 'fenetre_doublon')::interval) then
    return private.verrou('DOUBLON', 'Le même message est déjà parti, ou en route, vers ce destinataire.');
  end if;

  if v_module.verrou is not null then
    execute format('select %s($1)', v_module.verrou::regproc) into v_verrou using p_e;
    if v_verrou is not null and nullif(v_verrou ->> 'code', '') is not null then
      if coalesce((v_verrou ->> 'definitif')::boolean, true) then
        return private.verrou(left(v_verrou ->> 'code', 60), coalesce(v_verrou ->> 'motif', 'Verrou du module.'));
      elsif p_complet then
        return private.verrou(left(v_verrou ->> 'code', 60), coalesce(v_verrou ->> 'motif', 'Verrou du module.'), false,
                              coalesce((v_verrou ->> 'reprise_le')::timestamptz, p_instant + interval '1 hour'));
      end if;
    end if;
  end if;

  if p_complet then
    -- Les heures et les jours du destinataire, dans son fuseau ; pour un
    -- message non transactionnel, aussi les heures légales du canal, qui
    -- excluent toujours les jours fériés : il faut alors connaître son calendrier.
    v_plages := r -> 'plages';
    v_legales := case when not p_e.transactionnel then v_canal.plages_non_transactionnel end;
    v_complet := (select t.complet from public.territoires t where t.code = p_e.destinataire_territoire);
    if v_legales is not null and not coalesce(v_complet, false) then
      return private.verrou('CALENDRIER_INCONNU',
        'Démarchage : jamais un jour férié ; le calendrier du destinataire est inconnu ou incomplet, l''envoi est retenu.');
    end if;
    if not (r ->> 'feries')::boolean and v_complet is false then
      return private.verrou('CALENDRIER_INCOMPLET',
        format('Les jours fériés de droit local (%s) ne sont pas au calendrier : l''envoi est retenu. Pour envoyer quand même, autorisez les jours fériés dans les réglages.',
               p_e.destinataire_territoire));
    end if;
    v_t := p_instant;
    for i in 1..20 loop
      v_t2 := private.prochaine_ouverture(v_plages, p_e.destinataire_fuseau, p_e.destinataire_territoire,
                                          (r ->> 'feries')::boolean, v_t);
      exit when v_t2 is null;
      if v_legales is not null then
        v_t2 := private.prochaine_ouverture(v_legales, p_e.destinataire_fuseau, p_e.destinataire_territoire, false, v_t2);
        exit when v_t2 is null;
      end if;
      exit when v_t2 = v_t;
      v_t := v_t2;
    end loop;
    if v_t2 is null or v_t2 > p_instant then
      v_t2 := coalesce(v_t2, p_instant + interval '1 day');
      return private.verrou('HORS_HEURES',
        format('Hors des heures d''envoi du destinataire : départ le %s, heure de %s.',
               private.date_fr(v_t2, p_e.destinataire_fuseau), p_e.destinataire_fuseau), false, v_t2);
    end if;

    if p_e.espacement then
      v_delai := (r ->> 'delai_min')::interval;
      if v_delai > interval '0' then
        select max(coalesce(x.envoye_le, x.pret_le)) into v_dernier
        from public.envois x
        where x.client_id = p_e.client_id and x.id <> p_e.id and x.espacement and x.mode = v_mode
          and x.statut in ('pret', 'en_cours', 'envoye')
          and (x.destinataire_adresse = p_e.destinataire_adresse
               or (p_e.destinataire_ref is not null and x.destinataire_ref = p_e.destinataire_ref));
        if v_dernier is not null and v_dernier + v_delai > p_instant then
          return private.verrou('DELAI_MINIMAL',
            format('Un message est parti vers cette personne le %s : le suivant attend le %s.',
                   private.date_fr(v_dernier, p_e.destinataire_fuseau),
                   private.date_fr(v_dernier + v_delai, p_e.destinataire_fuseau)), false, v_dernier + v_delai);
        end if;
      end if;
      v_debut := date_trunc('day', p_instant at time zone p_e.destinataire_fuseau) at time zone p_e.destinataire_fuseau;
      select count(*) into v_n
      from public.envois x
      where x.client_id = p_e.client_id and x.id <> p_e.id and x.espacement and x.mode = v_mode
        and x.statut in ('pret', 'en_cours', 'envoye') and x.pret_le >= v_debut
        and (x.destinataire_adresse = p_e.destinataire_adresse
             or (p_e.destinataire_ref is not null and x.destinataire_ref = p_e.destinataire_ref));
      if v_n >= (r ->> 'plafond_destinataire_jour')::int then
        return private.verrou('PLAFOND_DESTINATAIRE',
          format('Déjà %s messages aujourd''hui vers cette personne : le suivant part demain.', v_n), false,
          (date_trunc('day', p_instant at time zone p_e.destinataire_fuseau) + interval '1 day') at time zone p_e.destinataire_fuseau);
      end if;
    end if;

    v_fuseau_org := coalesce((select en.fuseau from public.entites en where en.client_id = p_e.client_id and en.principale),
                             'Europe/Paris');
    v_debut := date_trunc('day', p_instant at time zone v_fuseau_org) at time zone v_fuseau_org;
    select count(*) filter (where x.module = p_e.module), count(*) into v_n, v_n_org
    from public.envois x
    where x.client_id = p_e.client_id and x.id <> p_e.id and x.mode = v_mode
      and x.statut in ('pret', 'en_cours', 'envoye') and x.pret_le >= v_debut;
    if v_n >= (r ->> 'plafond_jour')::int then
      return private.verrou('PLAFOND_JOUR',
        format('Plafond du jour atteint pour le module %s (%s envois) : la suite part demain.', p_e.module, v_n), false,
        (date_trunc('day', p_instant at time zone v_fuseau_org) + interval '1 day') at time zone v_fuseau_org);
    end if;
    if v_n_org >= (r ->> 'plafond_jour_organisation')::int then
      return private.verrou('PLAFOND_ORGANISATION',
        format('Plafond du jour atteint pour l''organisation (%s envois) : la suite part demain.', v_n_org), false,
        (date_trunc('day', p_instant at time zone v_fuseau_org) + interval '1 day') at time zone v_fuseau_org);
    end if;
  end if;

  return jsonb_build_object('code', null, 'mode', v_mode, 'expediteur', v_exp.id, 'fournisseur', v_fournisseur);
end $function$


-- ═══ FONCTION private.voit_entite
CREATE OR REPLACE FUNCTION private.voit_entite(p_client uuid, p_entite uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.comptes c
    where c.user_id = (select auth.uid())
      and c.client_id = p_client
      and (c.perimetre_total or exists (
        select 1 from public.comptes_entites ce
        where ce.user_id = c.user_id and ce.client_id = p_client and ce.entite_id = p_entite))
  )
$function$


-- ═══ FONCTION private.voit_objet
CREATE OR REPLACE FUNCTION private.voit_objet(p_client uuid, p_type text, p_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select private.voit_objet_pour((select auth.uid()), p_client, p_type, p_id)
$function$


-- ═══ FONCTION private.voit_objet_pour
CREATE OR REPLACE FUNCTION private.voit_objet_pour(p_user uuid, p_client uuid, p_type text, p_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_gardien regprocedure;
begin
  if p_type is not null and p_id is not null then
    select g.voit into v_gardien from private.gardiens_objets g where g.objet_type = p_type;
    if found then
      if not exists (select 1 from public.comptes c where c.user_id = p_user and c.client_id = p_client) then
        return false;
      end if;
      return private.appeler_gardien(v_gardien, p_user, p_client, p_id);
    end if;
  end if;
  return exists (
      select 1 from public.comptes c
      where c.user_id = p_user and c.client_id = p_client and c.role = 'gerant')
    or (exists (select 1 from public.comptes c where c.user_id = p_user and c.client_id = p_client)
        and (p_type is null or p_id is null
             or not exists (select 1 from public.objets_restreints r
                            where r.client_id = p_client and r.objet_type = p_type)
             or exists (select 1 from public.acces_objets a
                        where a.client_id = p_client and a.objet_type = p_type and a.objet_id = p_id
                          and (a.user_id = p_user
                               or a.equipe_id in (select m.equipe_id from public.equipes_membres m
                                                  where m.user_id = p_user and m.client_id = p_client)))));
end $function$



-- ══════════════════ CRONS ══════════════════

-- ═══ CRON daliro-referentiel [20 6 * * *] select private.btp_tache_referentiel()

-- ═══ CRON lorani-calendrier [12 * * * *] select private.lorani_calendrier_passage()

-- ═══ CRON lorani-lectures [*/5 * * * *] select private.lorani_lectures_passage()

-- ═══ CRON omega-chien-de-garde [*/15 * * * *] select private.tache_chien_de_garde()

-- ═══ CRON omega-controle-delais [7 * * * *] select private.controler_delais()

-- ═══ CRON omega-envois [*/5 * * * *] select private.tache_envois()

-- ═══ CRON omega-expediteur [* * * * *] 
  select net.http_post(
    url := 'https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/expediteur',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 50000)
  from vault.decrypted_secrets s where s.name = 'cle_service'


-- ═══ CRON omega-filed [* * * * *] select private.filed_tache()

-- ═══ CRON omega-lecteur [* * * * *] 
  select net.http_post(
    url := 'https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/lecteur',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000)
  from vault.decrypted_secrets s where s.name = 'cle_service'


-- ═══ CRON omega-mesure [11 * * * *] select private.mesures_tache()

-- ═══ CRON omega-points-assemblage [*/5 * * * *] select private.points_assembler()

-- ═══ CRON omega-points-controle [2-59/5 * * * *] select private.points_controler()

-- ═══ CRON omega-points-purge [29 3 * * *] select private.points_purger()

-- ═══ CRON omega-purge-historique-cron [17 3 * * *] delete from cron.job_run_details where end_time < now() - interval '7 days'

-- ═══ CRON omega-purge-lectures [17 3 * * *] select private.purger_lectures()

-- ═══ CRON omega-purge-releves [47 3 * * *] select private.purger_releves()

-- ═══ CRON omega-purge-travaux [43 3 * * *] select private.purger_travaux()

-- ═══ CRON omega-releves [*/15 * * * *] select private.controler_releves()

-- ═══ CRON omega-releves-file [* * * * *] select private.avancer_releves()

-- ═══ CRON omega-suivis [23 * * * *] select private.controler_suivis()

-- ═══ CRON omega-verifier-sauvegardes [7 8 * * *] select private.verifier_sauvegardes()

-- ═══ CRON tamila-coffre [11 * * * *] select private.tamila_tache_horaire()

-- ═══ CRON tamila-decisions [* * * * *] select private.tamila_traiter_decisions()

-- ═══ CRON tamila-delais [17 * * * *] select private.tamila_controler_delais()

-- ═══ CRON tavaro-matin [*/30 * * * *] select private.loc_deposer_points()

-- ═══ CRON tavaro-mesure [0 9 * * *] select private.loc_mesurer()

-- ═══ CRON tavaro-ouvrier [* * * * *] select private.loc_ouvrier()

-- ═══ CRON tavaro-purge [27 3 * * *] select private.loc_purger()

-- ═══ CRON tiroma-horloge [*/10 * * * *] select private.tiroma_horloge()

-- ═══ CRON tiroma-purge [37 3 * * *] select private.tiroma_purger()

-- ═══ CRON tiroma-releves [* * * * *] select private.tiroma_traiter_travaux()

-- ═══ CRON varelo-referentiel [* * * * *] select private.grp_tache_referentiel()

-- ═══ CRON varelo-referentiel-hebdo [45 4 * * 0] select private.grp_planifier_referentiel(true)

-- ═══ CRON varelo-referentiel-quotidien [30 4 * * *] select private.grp_planifier_referentiel(false)


-- ══════════════════ DONNÉES DE RÉFÉRENCE ══════════════════

-- ═══ DONNÉES private.abonnements
{"evenement":"delai.depasse.lorani","module":"lorani","genre":"lorani.calendrier.depasse"}
{"evenement":"delai.depasse.tamila","module":"tamila","genre":"tamila.delai_depasse"}
{"evenement":"delai.proche.lorani","module":"lorani","genre":"lorani.calendrier.rappel"}
{"evenement":"demande.decidee.filed","module":"filed","genre":"filed.decision"}
{"evenement":"demande.decidee.tamila","module":"tamila","genre":"tamila.decision"}
{"evenement":"demande.decidee.tavaro","module":"tavaro","genre":"tavaro.decision"}
{"evenement":"demande.decidee.varelo","module":"varelo","genre":"varelo.decision"}
{"evenement":"envoi.annule.tavaro","module":"tavaro","genre":"tavaro.envoi"}
{"evenement":"envoi.bloque.tavaro","module":"tavaro","genre":"tavaro.envoi"}
{"evenement":"envoi.echec.tavaro","module":"tavaro","genre":"tavaro.envoi"}
{"evenement":"envoi.envoye.tavaro","module":"tavaro","genre":"tavaro.envoi"}
{"evenement":"envoi.expire.tavaro","module":"tavaro","genre":"tavaro.envoi"}
{"evenement":"envoi.non_remis.tavaro","module":"tavaro","genre":"tavaro.envoi"}
{"evenement":"envoi.refuse.tavaro","module":"tavaro","genre":"tavaro.envoi"}
{"evenement":"piece_lue.filed","module":"filed","genre":"filed.integrer"}
{"evenement":"piece_lue.lorani","module":"lorani","genre":"lorani.piece_lue"}
{"evenement":"piece_lue.tavaro","module":"tavaro","genre":"tavaro.piece_lue"}
{"evenement":"releve.en_retard.tavaro","module":"tavaro","genre":"tavaro.releve_en_retard"}
{"evenement":"releve.en_retard.tiroma","module":"tiroma","genre":"tiroma.releve_en_retard"}
{"evenement":"releve.pret.tavaro","module":"tavaro","genre":"tavaro.appliquer_releve"}
{"evenement":"releve.pret.tiroma","module":"tiroma","genre":"tiroma.appliquer_releve"}

-- ═══ DONNÉES private.canaux_envoi
{"canal":"email","libelle":"Courriel","adresse":"email","sujet":"obligatoire","longueur_max":100000,"pieces":true,"consentement_toujours":false,"permis_sante":true,"plages_non_transactionnel":null,"note":null}
{"canal":"lre","libelle":"Lettre recommandée électronique","adresse":"email","sujet":"obligatoire","longueur_max":100000,"pieces":true,"consentement_toujours":false,"permis_sante":true,"plages_non_transactionnel":null,"note":"Un destinataire non professionnel doit avoir consenti à la recevoir (CPCE, art. L100)."}
{"canal":"appel","libelle":"Appel","adresse":"telephone","sujet":"interdit","longueur_max":2000,"pieces":false,"consentement_toujours":false,"permis_sante":true,"plages_non_transactionnel":[{"fin": "13:00", "debut": "10:00", "jours": [1, 2, 3, 4, 5]}, {"fin": "20:00", "debut": "14:00", "jours": [1, 2, 3, 4, 5]}],"note":"Démarchage : du lundi au vendredi, de 10 h à 13 h et de 14 h à 20 h, jamais un jour férié (décret n° 2022-1313 du 13 octobre 2022)."}
{"canal":"whatsapp","libelle":"WhatsApp","adresse":"telephone","sujet":"interdit","longueur_max":4096,"pieces":true,"consentement_toujours":true,"permis_sante":true,"plages_non_transactionnel":[{"fin": "20:00", "debut": "08:00", "jours": [1, 2, 3, 4, 5, 6]}],"note":"Voie officielle seulement (décision A6) : modèle approuvé par Meta, accord préalable de chaque destinataire."}
{"canal":"sms","libelle":"SMS","adresse":"telephone","sujet":"interdit","longueur_max":612,"pieces":false,"consentement_toujours":false,"permis_sante":false,"plages_non_transactionnel":[{"fin": "20:00", "debut": "08:00", "jours": [1, 2, 3, 4, 5, 6]}],"note":"Aucun prestataire SMS n'est certifié HDS : jamais dans un contexte de santé (dentaire, décision D6)."}

-- ═══ DONNÉES public.droits (banc)
aucune ligne

-- ═══ DONNÉES private.fournisseurs_envoi
{"fournisseur":"scaleway_tem","canal":"email","automatique":true,"branche":false,"agree_sante":false,"note":"Scaleway Transactional Email, Paris (avocats, groupes)."}
{"fournisseur":"gmail","canal":"email","automatique":true,"branche":false,"agree_sante":false,"note":"La boîte Google du client, par l'API Gmail, accès délégué."}
{"fournisseur":"microsoft","canal":"email","automatique":true,"branche":false,"agree_sante":false,"note":"La boîte Microsoft 365 du client, par l'API Graph, accès délégué."}
{"fournisseur":"meta_whatsapp","canal":"whatsapp","automatique":true,"branche":false,"agree_sante":false,"note":"WhatsApp Cloud API de Meta, numéro du client (décision A6)."}
{"fournisseur":"brevo_sms","canal":"sms","automatique":true,"branche":false,"agree_sante":false,"note":"Brevo, SMS transactionnels."}
{"fournisseur":"ovh_sms","canal":"sms","automatique":true,"branche":false,"agree_sante":false,"note":"OVHcloud SMS, expéditeur alphanumérique ou numéro 09."}
{"fournisseur":"ar24","canal":"lre","automatique":true,"branche":false,"agree_sante":false,"note":"AR24, lettre recommandée électronique qualifiée."}
{"fournisseur":"manuel","canal":null,"automatique":false,"branche":true,"agree_sante":false,"note":"Une personne exécute : appel passé par l'équipe, courriel parti de sa propre boîte. Jamais d'ouvrier."}
{"fournisseur":"brevo","canal":"email","automatique":true,"branche":true,"agree_sante":false,"note":"Brevo, API transactionnelle (décision A5, conseillée)."}

-- ═══ DONNÉES public.modeles_jeux
{"id":"d072846c-36f8-4fd5-80dc-5a4978d56d88","module":"tavaro","logiciel":"azloc","code":"contrats","version":1,"libelle":"Contrats du jour","motif_fichier":"^contrats?[_ -]","entetes":["N° contrat","Départ"],"colonnes":{"depot": {"type": "decimal", "entetes": ["Dépôt de garantie"]}, "agence": {"type": "texte", "entetes": ["Agence départ"], "obligatoire": true}, "numero": {"type": "texte", "entetes": ["N° contrat"], "obligatoire": true}, "statut": {"type": "texte", "entetes": ["Statut"]}, "options": {"type": "texte", "entetes": ["Options"]}, "categorie": {"type": "texte", "entetes": ["Catégorie"]}, "depart_le": {"type": "dateheure", "entetes": ["Départ"], "obligatoire": true}, "franchise": {"type": "decimal", "entetes": ["Franchise"]}, "km_depart": {"type": "entier", "entetes": ["Km départ"]}, "km_inclus": {"type": "entier", "entetes": ["Km inclus"]}, "km_retour": {"type": "entier", "entetes": ["Km retour"]}, "tarif_jour": {"type": "decimal", "entetes": ["Tarif jour"]}, "km_illimite": {"type": "booleen", "entetes": ["Km illimités"]}, "reservation": {"type": "texte", "entetes": ["N° réservation"]}, "agence_retour": {"type": "texte", "entetes": ["Agence retour"]}, "locataire_nom": {"type": "texte", "entetes": ["Nom"]}, "locataire_ref": {"type": "texte", "entetes": ["Code client"]}, "km_inclus_jour": {"type": "entier", "entetes": ["Km inclus / jour"]}, "locataire_type": {"type": "texte", "entetes": ["Type client"]}, "retour_reel_le": {"type": "dateheure", "entetes": ["Retour effectif"]}, "immatriculation": {"type": "texte", "entetes": ["Immatriculation"]}, "locataire_email": {"type": "texte", "entetes": ["E-mail"]}, "locataire_siren": {"type": "texte", "entetes": ["SIREN"]}, "retour_prevu_le": {"type": "dateheure", "entetes": ["Retour prévu"], "obligatoire": true}, "locataire_permis": {"type": "texte", "entetes": ["N° permis"], "sensible": true, "facultative": true}, "locataire_prenom": {"type": "texte", "entetes": ["Prénom"]}, "rachat_franchise": {"type": "booleen", "entetes": ["Rachat de franchise"]}, "seuil_charge_pct": {"type": "entier", "entetes": ["Seuil de charge (%)"]}, "franchise_reduite": {"type": "decimal", "entetes": ["Franchise réduite"]}, "locataire_adresse": {"type": "texte", "entetes": ["Adresse"]}, "conditions_version": {"type": "texte", "entetes": ["Version CGL"]}, "locataire_telephone": {"type": "texte", "entetes": ["Téléphone"]}, "politique_carburant": {"type": "texte", "entetes": ["Carburant"]}, "locataire_raison_sociale": {"type": "texte", "entetes": ["Raison sociale"]}},"cle":["numero"],"complet":false,"fenetre":{"colonne": "depart_le", "observee": true},"confirmer_disparition":1,"seuil_perte":0.200,"perte_min":1,"seuil_anomalies":0.300,"options":{},"accuse":true,"rythme":null,"plages":null,"attendu":[{"avant": "07:30", "jours": [1, 2, 3, 4, 5, 6, 7], "alerter": false}],"source":null,"cree_le":"2026-09-29T06:15:45.530203+00:00"}
{"id":"2e0f903f-854f-4415-b72c-2b1e068b930d","module":"tavaro","logiciel":"azloc","code":"flotte","version":1,"libelle":"Flotte","motif_fichier":"^(flotte|vehicules?)[_ -]","entetes":["Immatriculation","Kilométrage"],"colonnes":{"km": {"type": "entier", "entetes": ["Kilométrage"]}, "ref": {"type": "texte", "entetes": ["Réf. interne"]}, "vin": {"type": "texte", "entetes": ["N° de série (VIN)"]}, "km_le": {"type": "dateheure", "entetes": ["Relevé km le"]}, "agence": {"type": "texte", "entetes": ["Agence"]}, "modele": {"type": "texte", "entetes": ["Modèle"]}, "energie": {"type": "texte", "entetes": ["Énergie"]}, "categorie": {"type": "texte", "entetes": ["Catégorie"]}, "reservoir_l": {"type": "decimal", "entetes": ["Réservoir (L)"]}, "batterie_kwh": {"type": "decimal", "entetes": ["Batterie (kWh)"]}, "immatriculation": {"type": "texte", "entetes": ["Immatriculation"], "obligatoire": true}, "mise_en_circulation": {"type": "date", "entetes": ["Date 1re MEC"]}},"cle":["immatriculation"],"complet":true,"fenetre":null,"confirmer_disparition":2,"seuil_perte":0.200,"perte_min":2,"seuil_anomalies":0.200,"options":{},"accuse":true,"rythme":"7 days","plages":null,"attendu":null,"source":null,"cree_le":"2026-09-29T06:15:45.530203+00:00"}
{"id":"450d291f-f57e-47a3-8db2-ef8f915db7a9","module":"tavaro","logiciel":"azloc","code":"reservations","version":1,"libelle":"Réservations","motif_fichier":"^(resa|reservations?)[_ -]","entetes":["N° réservation","Départ prévu"],"colonnes":{"vol": {"type": "texte", "entetes": ["N° vol"]}, "canal": {"type": "texte", "entetes": ["Canal"]}, "notes": {"type": "texte", "entetes": ["Remarques"]}, "agence": {"type": "texte", "entetes": ["Agence départ"], "obligatoire": true}, "statut": {"type": "texte", "entetes": ["Statut"]}, "acompte": {"type": "decimal", "entetes": ["Acompte (€)"]}, "prepaye": {"type": "booleen", "entetes": ["Prépayé"]}, "categorie": {"type": "texte", "entetes": ["Catégorie"]}, "reference": {"type": "texte", "entetes": ["N° réservation"], "obligatoire": true}, "agence_retour": {"type": "texte", "entetes": ["Agence retour"]}, "locataire_nom": {"type": "texte", "entetes": ["Nom"]}, "locataire_ref": {"type": "texte", "entetes": ["Code client"]}, "locataire_type": {"type": "texte", "entetes": ["Type client"]}, "depart_prevu_le": {"type": "dateheure", "entetes": ["Départ prévu"], "obligatoire": true}, "immatriculation": {"type": "texte", "entetes": ["Immatriculation"]}, "locataire_email": {"type": "texte", "entetes": ["E-mail"]}, "locataire_siren": {"type": "texte", "entetes": ["SIREN"]}, "retour_prevu_le": {"type": "dateheure", "entetes": ["Retour prévu"], "obligatoire": true}, "locataire_permis": {"type": "texte", "entetes": ["N° permis"], "sensible": true, "facultative": true}, "locataire_prenom": {"type": "texte", "entetes": ["Prénom"]}, "locataire_adresse": {"type": "texte", "entetes": ["Adresse"]}, "locataire_telephone": {"type": "texte", "entetes": ["Téléphone"]}, "locataire_raison_sociale": {"type": "texte", "entetes": ["Raison sociale"]}},"cle":["reference"],"complet":true,"fenetre":{"au": 120, "du": -30, "colonne": "depart_prevu_le"},"confirmer_disparition":2,"seuil_perte":0.200,"perte_min":5,"seuil_anomalies":0.300,"options":{},"accuse":true,"rythme":null,"plages":null,"attendu":[{"avant": "07:30", "jours": [1, 2, 3, 4, 5, 6, 7], "alerter": false}],"source":null,"cree_le":"2026-09-29T06:15:45.530203+00:00"}
{"id":"b0984d0c-692c-4cf7-a9de-9aecfff440e7","module":"tiroma","logiciel":"logosw","code":"actes","version":1,"libelle":"Actes réalisés","motif_fichier":"^(actes?|feuille|fse)","entetes":["N° acte","Date"],"colonnes":{"ref": {"type": "texte", "entetes": ["N° acte", "Id acte"], "obligatoire": true}, "code": {"type": "texte", "entetes": ["Code", "Code CCAM", "Acte"]}, "date": {"type": "date", "entetes": ["Date", "Date de l'acte"], "obligatoire": true}, "dents": {"type": "texte", "entetes": ["Dents", "Dent"], "facultative": true}, "libelle": {"type": "texte", "entetes": ["Libellé"], "facultative": true}, "montant": {"type": "decimal", "entetes": ["Montant", "Honoraires"]}, "rdv_ref": {"type": "texte", "entetes": ["N° RDV", "Rdv"], "facultative": true}, "praticien": {"type": "texte", "entetes": ["Praticien"]}, "patient_ref": {"type": "texte", "entetes": ["N° patient", "N° dossier", "Patient"], "obligatoire": true}, "devis_numero": {"type": "texte", "entetes": ["N° devis", "Devis"], "facultative": true}},"cle":["ref"],"complet":true,"fenetre":{"au": 1, "du": -45, "colonne": "date"},"confirmer_disparition":2,"seuil_perte":0.200,"perte_min":1,"seuil_anomalies":0.050,"options":{},"accuse":true,"rythme":null,"plages":null,"attendu":[{"avant": "07:30", "jours": [1, 2, 3, 4, 5], "alerter": false}],"source":"OMEGA/moteurs/dentaire.md, M0 (actes réalisés) ; la reprise initiale de 36 mois passe par une fenêtre explicite du fichier ; hypothèses d'en-têtes","cree_le":"2026-09-29T03:44:13.146414+00:00"}
{"id":"4381a436-37e9-4959-9d1d-5245818d5798","module":"tiroma","logiciel":"logosw","code":"agenda","version":1,"libelle":"Agenda","motif_fichier":"^(agenda|rdv|rendez)","entetes":["N° RDV","Début"],"colonnes":{"fin": {"type": "dateheure", "entetes": ["Fin", "Date fin"], "facultative": true}, "ref": {"type": "texte", "entetes": ["N° RDV", "N° rendez-vous", "Id RDV"], "libelle": "Numéro du rendez-vous", "obligatoire": true}, "type": {"type": "texte", "entetes": ["Type", "Type de RDV", "Motif RDV"]}, "debut": {"type": "dateheure", "entetes": ["Début", "Date début", "Date"], "obligatoire": true}, "motif": {"type": "texte", "entetes": ["Motif", "Motif annulation"], "sensible": true, "facultative": true}, "salle": {"type": "texte", "entetes": ["Salle", "Fauteuil", "Agenda"]}, "seance": {"type": "entier", "entetes": ["Séance", "N° séance"], "facultative": true}, "statut": {"type": "texte", "entetes": ["Statut", "État"]}, "cree_le": {"type": "dateheure", "entetes": ["Créé le", "Date de création"], "facultative": true}, "devis_ref": {"type": "texte", "entetes": ["N° devis", "Devis"], "facultative": true}, "duree_min": {"type": "entier", "entetes": ["Durée", "Durée (min)"]}, "praticien": {"type": "texte", "entetes": ["Praticien", "Code praticien"]}, "patient_nom": {"type": "texte", "entetes": ["Nom patient", "Nom"], "sensible": true, "facultative": true}, "patient_ref": {"type": "texte", "entetes": ["N° patient", "N° dossier", "Patient"], "libelle": "Numéro du patient"}, "patient_naissance": {"type": "date", "entetes": ["Naissance", "Date de naissance"], "sensible": true, "facultative": true}},"cle":["ref"],"complet":true,"fenetre":{"au": 120, "du": -30, "colonne": "debut"},"confirmer_disparition":1,"seuil_perte":0.200,"perte_min":1,"seuil_anomalies":0.050,"options":{},"accuse":true,"rythme":null,"plages":null,"attendu":[{"avant": "07:30", "jours": [1, 2, 3, 4, 5], "alerter": false}],"source":"OMEGA/moteurs/dentaire.md, M0 (contrat de relevé v1, agenda) ; en-têtes et statuts : hypothèses à confirmer sur les exports du pilote","cree_le":"2026-09-29T03:44:13.146414+00:00"}
{"id":"393266f7-6292-472c-aa93-c451f8baa52e","module":"tiroma","logiciel":"logosw","code":"attente","version":1,"libelle":"Liste d'attente","motif_fichier":"^(attente|liste[_ -]?attente)","entetes":["N° attente","Depuis"],"colonnes":{"ref": {"type": "texte", "entetes": ["N° attente", "Id"], "obligatoire": true}, "type": {"type": "texte", "entetes": ["Type", "Type de RDV"], "facultative": true}, "depuis": {"type": "date", "entetes": ["Depuis", "Date d'inscription"]}, "duree_min": {"type": "entier", "entetes": ["Durée"], "facultative": true}, "praticien": {"type": "texte", "entetes": ["Praticien"], "facultative": true}, "patient_ref": {"type": "texte", "entetes": ["N° patient", "N° dossier", "Patient"], "obligatoire": true}},"cle":["ref"],"complet":true,"fenetre":null,"confirmer_disparition":2,"seuil_perte":0.200,"perte_min":1,"seuil_anomalies":0.050,"options":{},"accuse":true,"rythme":null,"plages":null,"attendu":null,"source":"OMEGA/moteurs/dentaire.md, M0 (liste d'attente, P12) ; manuel Logos_w p. 166 ; hypothèses d'en-têtes","cree_le":"2026-09-29T03:44:13.146414+00:00"}
{"id":"f109dd4a-8a99-42d7-998d-da642095d524","module":"tiroma","logiciel":"logosw","code":"devis","version":1,"libelle":"Devis et plans de traitement","motif_fichier":"^devis(?![_ -]?lignes)","entetes":["N° devis","Date"],"colonnes":{"date": {"type": "date", "entetes": ["Date", "Date du devis"], "obligatoire": true}, "type": {"type": "texte", "entetes": ["Type"], "facultative": true}, "numero": {"type": "texte", "entetes": ["N° devis", "Numéro"], "obligatoire": true}, "panier": {"type": "texte", "entetes": ["Panier"], "facultative": true}, "statut": {"type": "texte", "entetes": ["Statut", "État"]}, "montant": {"type": "decimal", "entetes": ["Montant", "Total"]}, "part_amc": {"type": "decimal", "entetes": ["Part AMC", "Mutuelle"], "facultative": true}, "part_amo": {"type": "decimal", "entetes": ["Part AMO", "Sécurité sociale"], "facultative": true}, "praticien": {"type": "texte", "entetes": ["Praticien"]}, "accepte_le": {"type": "date", "entetes": ["Accepté le", "Date d'acceptation", "Signé le"], "facultative": true}, "patient_ref": {"type": "texte", "entetes": ["N° patient", "N° dossier", "Patient"], "obligatoire": true}, "reste_a_charge": {"type": "decimal", "entetes": ["Reste à charge", "RAC"], "facultative": true}, "valide_jusqu_au": {"type": "date", "entetes": ["Valide jusqu'au", "Validité"], "facultative": true}, "alternative_100_sante": {"type": "booleen", "entetes": ["Alternative 100 % Santé", "Alternative 100% santé"], "facultative": true}},"cle":["numero"],"complet":true,"fenetre":{"au": 1, "du": -365, "colonne": "date"},"confirmer_disparition":2,"seuil_perte":0.200,"perte_min":1,"seuil_anomalies":0.050,"options":{},"accuse":true,"rythme":null,"plages":null,"attendu":[{"avant": "07:30", "jours": [1, 2, 3, 4, 5], "alerter": false}],"source":"OMEGA/moteurs/dentaire.md, M0 (devis et plans) et §7.2 (date d'acceptation dans Logos_w) ; hypothèses d'en-têtes","cree_le":"2026-09-29T03:44:13.146414+00:00"}
{"id":"4e9395ed-0fc0-4593-9ed6-68eba81cfd87","module":"tiroma","logiciel":"logosw","code":"devis_lignes","version":1,"libelle":"Lignes des devis","motif_fichier":"^(devis[_ -]?lignes|lignes)","entetes":["N° devis","Rang"],"colonnes":{"code": {"type": "texte", "entetes": ["Code", "Code CCAM", "Acte"], "facultative": true}, "rang": {"type": "entier", "entetes": ["Rang", "N° ligne", "Ligne"], "obligatoire": true}, "dents": {"type": "texte", "entetes": ["Dents", "Dent"], "facultative": true}, "numero": {"type": "texte", "entetes": ["N° devis", "Numéro"], "obligatoire": true}, "seance": {"type": "entier", "entetes": ["Séance"], "facultative": true}, "fait_le": {"type": "date", "entetes": ["Fait le", "Réalisé le"], "facultative": true}, "libelle": {"type": "texte", "entetes": ["Libellé"]}, "montant": {"type": "decimal", "entetes": ["Montant", "Honoraires"]}, "rdv_ref": {"type": "texte", "entetes": ["Rdv", "N° RDV"], "facultative": true}, "duree_min": {"type": "entier", "entetes": ["Durée"], "facultative": true}, "devis_date": {"type": "date", "entetes": ["Date du devis", "Date"], "obligatoire": true}, "reste_a_charge": {"type": "decimal", "entetes": ["Reste à charge", "RAC"], "facultative": true}, "delai_min_jours": {"type": "entier", "entetes": ["Délai", "Délai avant le suivant"], "facultative": true}},"cle":["numero","rang"],"complet":true,"fenetre":{"au": 1, "du": -365, "colonne": "devis_date"},"confirmer_disparition":2,"seuil_perte":0.200,"perte_min":1,"seuil_anomalies":0.050,"options":{},"accuse":true,"rythme":null,"plages":null,"attendu":[{"avant": "07:30", "jours": [1, 2, 3, 4, 5], "alerter": false}],"source":"OMEGA/moteurs/dentaire.md, M0 ; manuel Logos_w p. 62 (Rdv, Durée, Délai) ; hypothèses d'en-têtes","cree_le":"2026-09-29T03:44:13.146414+00:00"}
{"id":"2d8d0252-9990-446a-a852-2f355d4370a1","module":"tiroma","logiciel":"logosw","code":"labo","version":1,"libelle":"Fiches de laboratoire","motif_fichier":"^(labo|fiches?)","entetes":["N° fiche","Laboratoire"],"colonnes":{"ref": {"type": "texte", "entetes": ["N° fiche", "Id fiche"], "obligatoire": true}, "statut": {"type": "texte", "entetes": ["Statut", "État"], "facultative": true}, "envoye_le": {"type": "date", "entetes": ["Envoyé le", "Date d'envoi"]}, "revenu_le": {"type": "date", "entetes": ["Revenu le", "Date de retour"], "facultative": true}, "laboratoire": {"type": "texte", "entetes": ["Laboratoire", "Labo"]}, "patient_ref": {"type": "texte", "entetes": ["N° patient", "N° dossier", "Patient"], "obligatoire": true}, "rdv_pose_ref": {"type": "texte", "entetes": ["RDV de pose", "N° RDV pose"], "facultative": true}, "type_travail": {"type": "texte", "entetes": ["Type de travail", "Travail"], "facultative": true}, "rdv_empreinte_ref": {"type": "texte", "entetes": ["RDV d'empreinte", "N° RDV empreinte"], "facultative": true}, "retour_attendu_le": {"type": "date", "entetes": ["Retour attendu", "Date de retour prévue"], "facultative": true}},"cle":["ref"],"complet":true,"fenetre":{"au": 30, "du": -180, "colonne": "envoye_le"},"confirmer_disparition":2,"seuil_perte":0.200,"perte_min":1,"seuil_anomalies":0.050,"options":{},"accuse":true,"rythme":null,"plages":null,"attendu":null,"source":"OMEGA/moteurs/dentaire.md, M0 (fiches de laboratoire, P18) ; manuel Logos_w p. 70-71 ; hypothèses d'en-têtes","cree_le":"2026-09-29T03:44:13.146414+00:00"}
{"id":"e4bc3238-e5f3-4e8a-b6f8-5f6b8d134271","module":"tiroma","logiciel":"logosw","code":"odf","version":1,"libelle":"Ententes d'orthodontie","motif_fichier":"^(odf|ententes?|ortho)","entetes":["N° entente","Demande"],"colonnes":{"ref": {"type": "texte", "entetes": ["N° entente", "Id"], "obligatoire": true}, "fin_le": {"type": "date", "entetes": ["Fin", "Fin du traitement"], "facultative": true}, "statut": {"type": "texte", "entetes": ["Statut", "État"], "facultative": true}, "debut_le": {"type": "date", "entetes": ["Début", "Début du traitement"], "facultative": true}, "semestre": {"type": "entier", "entetes": ["Semestre", "Semestre en cours"], "facultative": true}, "accord_le": {"type": "date", "entetes": ["Accord", "Date d'accord"], "facultative": true}, "demande_le": {"type": "date", "entetes": ["Demande", "Date de demande"]}, "patient_ref": {"type": "texte", "entetes": ["N° patient", "N° dossier", "Patient"], "obligatoire": true}},"cle":["ref"],"complet":true,"fenetre":null,"confirmer_disparition":2,"seuil_perte":0.200,"perte_min":1,"seuil_anomalies":0.050,"options":{},"accuse":true,"rythme":null,"plages":null,"attendu":null,"source":"OMEGA/moteurs/dentaire.md, M0 (ententes d'orthodontie, P25) ; manuel Logos_w p. 45, 71-72 ; hypothèses d'en-têtes","cree_le":"2026-09-29T03:44:13.146414+00:00"}
{"id":"0631e3d9-2e55-4d57-ac30-1f764f6536f1","module":"tiroma","logiciel":"logosw","code":"patients","version":1,"libelle":"Patients actifs","motif_fichier":"^(patients?|liste)","entetes":["N° patient","Nom"],"colonnes":{"nom": {"type": "texte", "entetes": ["Nom"], "sensible": true, "obligatoire": true}, "ref": {"type": "texte", "entetes": ["N° patient", "N° dossier"], "obligatoire": true}, "prenom": {"type": "texte", "entetes": ["Prénom"], "sensible": true}, "naissance": {"type": "date", "entetes": ["Naissance", "Date de naissance"], "sensible": true}, "praticien": {"type": "texte", "entetes": ["Praticien", "Praticien habituel"]}, "famille_ref": {"type": "texte", "entetes": ["Famille", "N° famille", "Lien familial"], "facultative": true}, "dernier_rdv_le": {"type": "date", "entetes": ["Dernier RDV", "Dernière visite"], "facultative": true}, "dernier_bilan_le": {"type": "date", "entetes": ["Dernier bilan", "Bilan de santé"], "facultative": true}, "ne_pas_contacter": {"type": "booleen", "entetes": ["Ne pas contacter", "Refus contact"], "facultative": true}, "questionnaire_le": {"type": "date", "entetes": ["Questionnaire", "Date questionnaire médical"], "facultative": true}},"cle":["ref"],"complet":true,"fenetre":null,"confirmer_disparition":2,"seuil_perte":0.200,"perte_min":1,"seuil_anomalies":0.050,"options":{},"accuse":true,"rythme":null,"plages":null,"attendu":[{"avant": "07:30", "jours": [1, 2, 3, 4, 5], "alerter": false}],"source":"OMEGA/moteurs/dentaire.md, M0 (patients actifs) ; aucun téléphone, aucune note, aucune adresse ; hypothèses d'en-têtes","cree_le":"2026-09-29T03:44:13.146414+00:00"}
{"id":"e2aec7ba-6827-44fb-9293-80d7edf30fcd","module":"tiroma","logiciel":"logosw","code":"stock","version":1,"libelle":"Stock","motif_fichier":"^stock","entetes":["Référence","Quantité"],"colonnes":{"lot": {"type": "texte", "entetes": ["Lot", "N° de lot"]}, "seuil": {"type": "entier", "entetes": ["Seuil", "Seuil d'alerte"], "facultative": true}, "marque": {"type": "texte", "entetes": ["Marque", "Fabricant"], "facultative": true}, "famille": {"type": "texte", "entetes": ["Famille", "Catégorie"], "facultative": true}, "quantite": {"type": "entier", "entetes": ["Quantité", "Qté"], "obligatoire": true}, "reference": {"type": "texte", "entetes": ["Référence", "Réf."], "obligatoire": true}, "peremption": {"type": "date", "entetes": ["Péremption", "Date de péremption"], "facultative": true}, "diametre_mm": {"type": "decimal", "entetes": ["Diamètre", "Ø"], "facultative": true}, "longueur_mm": {"type": "decimal", "entetes": ["Longueur"], "facultative": true}},"cle":["reference","lot"],"complet":true,"fenetre":null,"confirmer_disparition":2,"seuil_perte":0.200,"perte_min":1,"seuil_anomalies":0.050,"options":{},"accuse":true,"rythme":null,"plages":null,"attendu":null,"source":"OMEGA/moteurs/dentaire.md, M0 (stock, P22) ; manuel Logos_w p. 126-131 ; hypothèses d'en-têtes","cree_le":"2026-09-29T03:44:13.146414+00:00"}
{"id":"95e16ae1-5782-4612-a678-720a43f8a00e","module":"tiroma","logiciel":"logosw","code":"types_rdv","version":1,"libelle":"Types de rendez-vous","motif_fichier":"^types?","entetes":["Libellé","Durée"],"colonnes":{"code": {"type": "texte", "entetes": ["Code"], "facultative": true}, "salle": {"type": "texte", "entetes": ["Salle", "Salle associée"], "facultative": true}, "couleur": {"type": "texte", "entetes": ["Couleur"], "facultative": true}, "libelle": {"type": "texte", "entetes": ["Libellé", "Type de RDV"], "obligatoire": true}, "categorie": {"type": "texte", "entetes": ["Catégorie"], "facultative": true}, "duree_min": {"type": "entier", "entetes": ["Durée", "Durée par défaut"]}},"cle":["libelle"],"complet":true,"fenetre":null,"confirmer_disparition":2,"seuil_perte":0.200,"perte_min":1,"seuil_anomalies":0.050,"options":{},"accuse":true,"rythme":null,"plages":null,"attendu":null,"source":"OMEGA/moteurs/dentaire.md, M0 (types de rendez-vous, vocabulaire) ; hypothèses d'en-têtes","cree_le":"2026-09-29T03:44:13.146414+00:00"}
{"id":"4d304b70-ec9d-434f-b9f5-cea8d8ff41ab","module":null,"logiciel":null,"code":"fec","version":1,"libelle":"Fichier des écritures comptables (FEC)","motif_fichier":"^[0-9]{9}FEC[0-9]{8}","entetes":["JournalCode","EcritureNum","EcritureDate","CompteNum"],"colonnes":{"sens": {"type": "texte", "entetes": ["Sens"], "facultative": true}, "debit": {"type": "decimal", "format": ",", "entetes": ["Debit"], "facultative": true}, "credit": {"type": "decimal", "format": ",", "entetes": ["Credit"], "facultative": true}, "nat_op": {"type": "texte", "entetes": ["NatOp"], "facultative": true}, "idevise": {"type": "texte", "entetes": ["Idevise"]}, "montant": {"type": "decimal", "format": ",", "entetes": ["Montant"], "facultative": true}, "date_let": {"type": "date", "format": "aaaammjj", "entetes": ["DateLet"]}, "date_rglt": {"type": "date", "format": "aaaammjj", "entetes": ["DateRglt"], "facultative": true}, "id_client": {"type": "texte", "entetes": ["IdClient"], "facultative": true}, "mode_rglt": {"type": "texte", "entetes": ["ModeRglt"], "facultative": true}, "piece_ref": {"type": "texte", "entetes": ["PieceRef"]}, "compte_lib": {"type": "texte", "entetes": ["CompteLib"]}, "compte_num": {"type": "texte", "entetes": ["CompteNum"], "obligatoire": true}, "piece_date": {"type": "date", "format": "aaaammjj", "entetes": ["PieceDate"]}, "valid_date": {"type": "date", "format": "aaaammjj", "entetes": ["ValidDate"]}, "journal_lib": {"type": "texte", "entetes": ["JournalLib"]}, "comp_aux_lib": {"type": "texte", "entetes": ["CompAuxLib"]}, "comp_aux_num": {"type": "texte", "entetes": ["CompAuxNum"]}, "ecriture_let": {"type": "texte", "entetes": ["EcritureLet"]}, "ecriture_lib": {"type": "texte", "entetes": ["EcritureLib"]}, "ecriture_num": {"type": "texte", "entetes": ["EcritureNum"], "obligatoire": true}, "journal_code": {"type": "texte", "entetes": ["JournalCode"], "obligatoire": true}, "ecriture_date": {"type": "date", "format": "aaaammjj", "entetes": ["EcritureDate"], "obligatoire": true}, "montant_devise": {"type": "decimal", "format": ",", "entetes": ["Montantdevise"]}},"cle":["journal_code","ecriture_num"],"complet":true,"fenetre":{"colonne": "ecriture_date", "observee": true},"confirmer_disparition":1,"seuil_perte":0.200,"perte_min":1,"seuil_anomalies":0.000,"options":{"pied": false},"accuse":true,"rythme":null,"plages":null,"attendu":null,"source":"Livre des procédures fiscales, art. A47 A-1 ; BOI-CF-IOR-60-40-20","cree_le":"2026-09-29T00:42:50.765287+00:00"}

-- ═══ DONNÉES private.modules_envois
{"module":"tiroma","sante":true,"canaux":["email","whatsapp","appel"],"verrou":null,"note":"Dentaire : contexte de santé ; messages aux patients par le courriel du cabinet, jamais de SMS (décision D6)."}

-- ═══ DONNÉES private.reglages (hors secrets)
alertes_destinataire = contact@omegaai.fr
alertes_expediteur = Omega Alertes <alertes@auth.omegaai.fr>
avis_expediteur = Omega <bonjour@auth.omegaai.fr>
envois_arret_general = non
envois_essai_expediteur = essais@omegaai.fr
envois_essai_fournisseur = brevo
envois_essai_nom = Omega — essais
espace_url = https://app.omegaai.fr/espace
plafond_ia_jour_client = 5
tamila_lieu_conservation = Supabase, Francfort (eu-central-1) : instance d'essai, aucune pièce réelle

-- ═══ DONNÉES public.regles_delais
{"code":"commun.paiement.defaut","version":1,"libelle":"Paiement, à défaut de délai convenu","quantite":30,"unite":"jours","mode":"calendaires","proroge":false,"source_texte":"Code de commerce, art. L441-10, I : trente jours après la réception des marchandises ou l'exécution de la prestation.","source_url":null,"en_vigueur_du":"1900-01-01","en_vigueur_au":null,"cree_le":"2026-09-28T21:06:53.548588+00:00"}
{"code":"commun.paiement.maximum","version":1,"libelle":"Paiement, délai convenu le plus long","quantite":60,"unite":"jours","mode":"calendaires","proroge":false,"source_texte":"Code de commerce, art. L441-10, I : soixante jours au plus après la date d'émission de la facture.","source_url":null,"en_vigueur_du":"1900-01-01","en_vigueur_au":null,"cree_le":"2026-09-28T21:06:53.548588+00:00"}
{"code":"lorani.permis.relance_affichage","version":1,"libelle":"Relance de l'affichage du permis sur le terrain","quantite":15,"unite":"jours","mode":"calendaires","proroge":false,"source_texte":"Règle de Lorani : l'affichage sur le terrain est dû dès la notification du permis ou dès que le permis tacite est acquis (C. urb., art. R*424-15), et lui seul fait courir le recours des tiers (art. R*600-2) ; relance si son premier jour n'est pas saisi quinze jours après la décision.","source_url":null,"en_vigueur_du":"1900-01-01","en_vigueur_au":null,"cree_le":"2026-09-28T22:30:28.171913+00:00"}
{"code":"lorani.urbanisme.completude","version":1,"libelle":"Complétude : délai de la mairie pour réclamer les pièces manquantes","quantite":1,"unite":"mois","mode":"calendaires","proroge":false,"source_texte":"C. urb., art. R*423-38 et R*423-22 : la mairie notifie la liste exhaustive des pièces manquantes dans le mois qui suit le dépôt ; à défaut, le dossier est réputé complet. Une demande plus tardive ne modifie pas le délai d'instruction (art. R*423-41).","source_url":"https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074075/LEGISCTA000006175969/","en_vigueur_du":"1900-01-01","en_vigueur_au":null,"cree_le":"2026-09-28T22:30:28.171913+00:00"}
{"code":"lorani.urbanisme.instruction_dp","version":1,"libelle":"Instruction d'une déclaration préalable","quantite":1,"unite":"mois","mode":"calendaires","proroge":false,"source_texte":"C. urb., art. R*423-23, a : un mois pour une déclaration préalable, à compter de la réception en mairie d'un dossier complet (art. R*423-19).","source_url":"https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074075/LEGISCTA000006158835/","en_vigueur_du":"1900-01-01","en_vigueur_au":null,"cree_le":"2026-09-28T22:30:28.171913+00:00"}
{"code":"lorani.urbanisme.instruction_dp_protege","version":1,"libelle":"Instruction d'une déclaration préalable en secteur protégé","quantite":2,"unite":"mois","mode":"calendaires","proroge":false,"source_texte":"C. urb., art. R*423-23, a, et R423-24, c : un mois, majoré d'un mois dans un site patrimonial remarquable ou aux abords des monuments historiques.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000050929926/","en_vigueur_du":"1900-01-01","en_vigueur_au":null,"cree_le":"2026-09-28T22:30:28.171913+00:00"}
{"code":"lorani.urbanisme.instruction_erp_igh","version":1,"libelle":"Instruction d'un permis de construire d'ERP ou d'IGH soumis à autorisation","quantite":5,"unite":"mois","mode":"calendaires","proroge":false,"source_texte":"C. urb., art. R423-28, b : cinq mois pour un permis de construire portant sur un établissement recevant du public soumis à l'autorisation de l'art. L122-3 du CCH, ou sur un immeuble de grande hauteur (art. L122-1 du CCH). Les majorations des art. R423-24 et R423-25 ne s'y ajoutent pas (art. R423-33).","source_url":"https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074075/LEGISCTA000006188186/","en_vigueur_du":"1900-01-01","en_vigueur_au":null,"cree_le":"2026-09-28T22:30:28.171913+00:00"}
{"code":"lorani.urbanisme.instruction_mh_inscrit","version":1,"libelle":"Instruction d'un permis portant sur un immeuble inscrit","quantite":5,"unite":"mois","mode":"calendaires","proroge":false,"source_texte":"C. urb., art. R423-28, a : cinq mois pour un permis portant sur un immeuble inscrit au titre des monuments historiques. Sans décision notifiée dans ce délai, le silence vaut rejet (art. R*424-2, I, c).","source_url":"https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074075/LEGISCTA000006188186/","en_vigueur_du":"1900-01-01","en_vigueur_au":null,"cree_le":"2026-09-28T22:30:28.171913+00:00"}
{"code":"lorani.urbanisme.instruction_pa","version":1,"libelle":"Instruction d'un permis d'aménager","quantite":3,"unite":"mois","mode":"calendaires","proroge":false,"source_texte":"C. urb., art. R*423-23, c : trois mois pour un permis d'aménager, à compter de la réception d'un dossier complet (art. R*423-19).","source_url":"https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074075/LEGISCTA000006158835/","en_vigueur_du":"1900-01-01","en_vigueur_au":null,"cree_le":"2026-09-28T22:30:28.171913+00:00"}
{"code":"lorani.urbanisme.instruction_pa_protege","version":1,"libelle":"Instruction d'un permis d'aménager en secteur protégé","quantite":4,"unite":"mois","mode":"calendaires","proroge":false,"source_texte":"C. urb., art. R*423-23, c, et R423-24, c : trois mois, majorés d'un mois dans un site patrimonial remarquable ou aux abords des monuments historiques.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000050929926/","en_vigueur_du":"1900-01-01","en_vigueur_au":null,"cree_le":"2026-09-28T22:30:28.171913+00:00"}
{"code":"lorani.urbanisme.instruction_pc","version":1,"libelle":"Instruction d'un permis de construire","quantite":3,"unite":"mois","mode":"calendaires","proroge":false,"source_texte":"C. urb., art. R*423-23, c : trois mois pour un permis de construire autre que celui d'une maison individuelle, à compter de la réception d'un dossier complet (art. R*423-19).","source_url":"https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074075/LEGISCTA000006158835/","en_vigueur_du":"1900-01-01","en_vigueur_au":null,"cree_le":"2026-09-28T22:30:28.171913+00:00"}
{"code":"lorani.urbanisme.instruction_pc_protege","version":1,"libelle":"Instruction d'un permis de construire en secteur protégé","quantite":4,"unite":"mois","mode":"calendaires","proroge":false,"source_texte":"C. urb., art. R*423-23, c, et R423-24, c : trois mois, majorés d'un mois dans un site patrimonial remarquable ou aux abords des monuments historiques.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000050929926/","en_vigueur_du":"1900-01-01","en_vigueur_au":null,"cree_le":"2026-09-28T22:30:28.171913+00:00"}
{"code":"lorani.urbanisme.instruction_pcmi","version":1,"libelle":"Instruction d'un permis de construire de maison individuelle","quantite":2,"unite":"mois","mode":"calendaires","proroge":false,"source_texte":"C. urb., art. R*423-23, b : deux mois pour un permis de construire portant sur une maison individuelle ou ses annexes, à compter de la réception d'un dossier complet (art. R*423-19).","source_url":"https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074075/LEGISCTA000006158835/","en_vigueur_du":"1900-01-01","en_vigueur_au":null,"cree_le":"2026-09-28T22:30:28.171913+00:00"}
{"code":"lorani.urbanisme.instruction_pcmi_protege","version":1,"libelle":"Instruction d'un permis de maison individuelle en secteur protégé","quantite":3,"unite":"mois","mode":"calendaires","proroge":false,"source_texte":"C. urb., art. R*423-23, b, et R423-24, c : deux mois, majorés d'un mois dans un site patrimonial remarquable ou aux abords des monuments historiques.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000050929926/","en_vigueur_du":"1900-01-01","en_vigueur_au":null,"cree_le":"2026-09-28T22:30:28.171913+00:00"}
{"code":"lorani.urbanisme.instruction_pd","version":1,"libelle":"Instruction d'un permis de démolir","quantite":2,"unite":"mois","mode":"calendaires","proroge":false,"source_texte":"C. urb., art. R*423-23, b : deux mois pour un permis de démolir, à compter de la réception d'un dossier complet (art. R*423-19).","source_url":"https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074075/LEGISCTA000006158835/","en_vigueur_du":"1900-01-01","en_vigueur_au":null,"cree_le":"2026-09-28T22:30:28.171913+00:00"}
{"code":"lorani.urbanisme.instruction_pd_protege","version":1,"libelle":"Instruction d'un permis de démolir en secteur protégé","quantite":3,"unite":"mois","mode":"calendaires","proroge":false,"source_texte":"C. urb., art. R*423-23, b, et R423-24, c : deux mois, majorés d'un mois dans un site patrimonial remarquable ou aux abords des monuments historiques.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000050929926/","en_vigueur_du":"1900-01-01","en_vigueur_au":null,"cree_le":"2026-09-28T22:30:28.171913+00:00"}
{"code":"lorani.urbanisme.pieces_manquantes","version":1,"libelle":"Pièces manquantes : délai pour les adresser à la mairie","quantite":3,"unite":"mois","mode":"calendaires","proroge":false,"source_texte":"C. urb., art. R*423-39 : les pièces manquantes sont adressées à la mairie dans les trois mois de la réception de la demande ; à défaut, décision tacite de rejet (d'opposition pour une déclaration). Le délai d'instruction court de leur réception.","source_url":"https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074075/LEGISCTA000006175969/","en_vigueur_du":"1900-01-01","en_vigueur_au":null,"cree_le":"2026-09-28T22:30:28.171913+00:00"}
{"code":"lorani.urbanisme.recours_apres_gracieux","version":1,"libelle":"Recours contentieux après le rejet d'un recours gracieux","quantite":2,"unite":"mois","mode":"francs","proroge":true,"source_texte":"CRPA, art. L411-2 : le recours gracieux formé dans le délai interrompt le délai de recours contentieux, qui court de nouveau, deux mois francs, à compter de son rejet exprès ou implicite (CJA, art. R421-1 et R421-2).","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000031367829","en_vigueur_du":"1900-01-01","en_vigueur_au":null,"cree_le":"2026-09-28T22:30:28.171913+00:00"}
{"code":"lorani.urbanisme.recours_tiers","version":1,"libelle":"Recours contentieux des tiers","quantite":2,"unite":"mois","mode":"francs","proroge":true,"source_texte":"C. urb., art. R*600-2 : le délai de recours contentieux des tiers court du premier jour d'une période continue de deux mois d'affichage sur le terrain. Délai franc (CJA, art. R421-1) : dernier jour pour agir le lendemain du quantième, prorogé au premier jour ouvrable.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006820365","en_vigueur_du":"1900-01-01","en_vigueur_au":null,"cree_le":"2026-09-28T22:30:28.171913+00:00"}
{"code":"lorani.urbanisme.retrait","version":1,"libelle":"Retrait du permis par l'administration","quantite":3,"unite":"mois","mode":"calendaires","proroge":false,"source_texte":"C. urb., art. L424-5 : le permis, tacite ou explicite, ne peut être retiré que s'il est illégal et dans le délai de trois mois suivant la date de la décision.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000037667614","en_vigueur_du":"1900-01-01","en_vigueur_au":null,"cree_le":"2026-09-28T22:30:28.171913+00:00"}
{"code":"lorani.urbanisme.silence_recours_gracieux","version":1,"libelle":"Silence de l'administration sur un recours gracieux","quantite":2,"unite":"mois","mode":"calendaires","proroge":false,"source_texte":"CRPA, art. L231-4, 2° : le silence gardé pendant deux mois sur un recours administratif vaut décision de rejet.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000031367619","en_vigueur_du":"1900-01-01","en_vigueur_au":null,"cree_le":"2026-09-28T22:30:28.171913+00:00"}
{"code":"tamila.cpc.902","version":1,"libelle":"Appel : signifier la déclaration d'appel à l'intimé non constitué (CPC, art. 902, al. 3)","quantite":1,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 902, al. 3 : « A peine de caducité de la déclaration d'appel relevée d'office, la signification doit être effectuée dans le mois suivant la réception de cet avis. » Départ : la réception de l'avis du greffier. Augmenté par l'art. 915-4.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048868957","en_vigueur_du":"2024-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc.906_1","version":1,"libelle":"Bref délai : signifier la déclaration d'appel (CPC, art. 906-1)","quantite":20,"unite":"jours","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 906-1 : l'appelant signifie la déclaration d'appel « dans les vingt jours de la réception de l'avis de fixation qui lui est adressé par le greffe », à peine de caducité relevée d'office. Augmenté par l'art. 915-4.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048852558","en_vigueur_du":"2024-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc.906_2.appelant","version":1,"libelle":"Bref délai : conclusions de l'appelant (CPC, art. 906-2, al. 1)","quantite":2,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 906-2, al. 1 : à peine de caducité, l'appelant « dispose d'un délai de deux mois à compter de la réception de l'avis de fixation de l'affaire à bref délai pour remettre ses conclusions au greffe ». Augmenté par l'art. 915-4.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048852560","en_vigueur_du":"2024-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc.906_2.incident","version":1,"libelle":"Bref délai : conclusions de l'intimé à un appel incident ou provoqué (CPC, art. 906-2, al. 3)","quantite":2,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 906-2, al. 3 : à peine d'irrecevabilité, deux mois « à compter de la notification de l'appel incident ou de l'appel provoqué à laquelle est jointe une copie de l'avis de fixation ». Augmenté par l'art. 915-4, dernier alinéa.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048852560","en_vigueur_du":"2024-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc.906_2.intervenant_force","version":1,"libelle":"Bref délai : conclusions de l'intervenant forcé (CPC, art. 906-2, al. 4)","quantite":2,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 906-2, al. 4 : à peine d'irrecevabilité, deux mois « à compter de la notification de la demande d'intervention formée à son encontre à laquelle est jointe une copie de l'avis de fixation ». Augmenté par l'art. 915-4, dernier alinéa.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048852560","en_vigueur_du":"2024-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc.906_2.intervenant_volontaire","version":1,"libelle":"Bref délai : conclusions de l'intervenant volontaire (CPC, art. 906-2, al. 4)","quantite":2,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 906-2, al. 4 : « L'intervenant volontaire dispose, sous la même sanction, du même délai à compter de son intervention volontaire. » L'art. 915-4 ne l'augmente pas.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048852560","en_vigueur_du":"2024-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc.906_2.intime","version":1,"libelle":"Bref délai : conclusions de l'intimé (CPC, art. 906-2, al. 2)","quantite":2,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 906-2, al. 2 : à peine d'irrecevabilité, l'intimé dispose « d'un délai de deux mois à compter de la notification des conclusions de l'appelant » pour conclure et former, le cas échéant, appel incident ou provoqué. Augmenté par l'art. 915-4, dernier alinéa.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048852560","en_vigueur_du":"2024-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc.906_2.signification","version":1,"libelle":"Bref délai : signifier les conclusions à une partie non constituée (CPC, art. 906-2, al. 5)","quantite":1,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 906-2, al. 5 : les conclusions sont signifiées aux parties qui n'ont pas constitué avocat « au plus tard dans le mois suivant l'expiration des délais prévus à ces mêmes alinéas », sous leurs sanctions. Départ : l'expiration du délai pour conclure.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048852560","en_vigueur_du":"2024-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc.908","version":1,"libelle":"Mise en état : conclusions de l'appelant (CPC, art. 908)","quantite":3,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 908 : « A peine de caducité de la déclaration d'appel, relevée d'office, l'appelant dispose d'un délai de trois mois à compter de la déclaration d'appel pour remettre ses conclusions au greffe. » Augmenté par l'art. 915-4.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048869023","en_vigueur_du":"2024-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc.909","version":1,"libelle":"Mise en état : conclusions de l'intimé (CPC, art. 909)","quantite":3,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 909 : l'intimé dispose, à peine d'irrecevabilité relevée d'office, « d'un délai de trois mois à compter de la notification qui lui est faite des conclusions de l'appelant prévues à l'article 908 » pour conclure et former, le cas échéant, appel incident ou provoqué. Augmenté par l'art. 915-4.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048868939","en_vigueur_du":"2024-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc.910.incident","version":1,"libelle":"Mise en état : conclusions de l'intimé à un appel incident ou provoqué (CPC, art. 910, al. 1)","quantite":3,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 910, al. 1 : « L'intimé à un appel incident ou à un appel provoqué dispose, à peine d'irrecevabilité relevée d'office, d'un délai de trois mois à compter de la notification qui lui en est faite pour remettre ses conclusions au greffe. » Augmenté par l'art. 915-4.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048869015","en_vigueur_du":"2024-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc.910.intervenant_force","version":1,"libelle":"Mise en état : conclusions de l'intervenant forcé (CPC, art. 910, al. 2)","quantite":3,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 910, al. 2 : l'intervenant forcé dispose, à peine d'irrecevabilité relevée d'office, de trois mois « à compter de la date à laquelle la demande d'intervention formée à son encontre lui a été notifiée ». Augmenté par l'art. 915-4.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048869015","en_vigueur_du":"2024-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc.910.intervenant_volontaire","version":1,"libelle":"Mise en état : conclusions de l'intervenant volontaire (CPC, art. 910, al. 2)","quantite":3,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 910, al. 2 : « L'intervenant volontaire dispose, sous la même sanction, du même délai à compter de son intervention volontaire. » L'art. 915-4 ne l'augmente pas.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048869015","en_vigueur_du":"2024-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc.911.signification","version":1,"libelle":"Mise en état : signifier les conclusions à une partie non constituée (CPC, art. 911, al. 1)","quantite":1,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 911, al. 1 : « Sous les mêmes sanctions, elles sont signifiées aux parties qui n'ont pas constitué avocat au plus tard dans le mois suivant l'expiration des délais prévus à ces articles. » Départ : l'expiration du délai pour conclure.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048868931","en_vigueur_du":"2024-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc2017.902","version":1,"libelle":"Appel introduit avant le 01/09/2024 : signifier la déclaration d'appel (CPC, art. 902, al. 3 ancien)","quantite":1,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 902, al. 3, rédaction du 01/09/2017 au 31/08/2024 : la signification doit être effectuée « dans le mois de l'avis adressé par le greffe », à peine de caducité relevée d'office. Augmenté par l'ancien art. 911-2.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034757158/2024-08-31","en_vigueur_du":"2017-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc2017.905_1","version":1,"libelle":"Appel introduit avant le 01/09/2024, bref délai : signifier la déclaration d'appel (CPC, art. 905-1 ancien)","quantite":10,"unite":"jours","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 905-1, al. 1, rédaction du 01/09/2017 au 31/08/2024 : l'appelant signifie la déclaration d'appel « dans les dix jours de la réception de l'avis de fixation », à peine de caducité relevée d'office. Augmenté par l'ancien art. 911-2.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034687278/2024-08-31","en_vigueur_du":"2017-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc2017.905_2.appelant","version":1,"libelle":"Appel introduit avant le 01/09/2024, bref délai : conclusions de l'appelant (CPC, art. 905-2, al. 1 ancien)","quantite":1,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 905-2, al. 1, rédaction du 01/09/2017 au 31/08/2024 : à peine de caducité, l'appelant « dispose d'un délai d'un mois à compter de la réception de l'avis de fixation de l'affaire à bref délai pour remettre ses conclusions au greffe ». Augmenté par l'ancien art. 911-2.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034687283/2024-08-31","en_vigueur_du":"2017-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc2017.905_2.incident","version":1,"libelle":"Appel introduit avant le 01/09/2024, bref délai : conclusions sur appel incident ou provoqué (art. 905-2, al. 3 ancien)","quantite":1,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 905-2, al. 3, rédaction du 01/09/2017 au 31/08/2024 : à peine d'irrecevabilité, un mois « à compter de la notification de l'appel incident ou de l'appel provoqué à laquelle est jointe une copie de l'avis de fixation ». Augmenté par l'ancien art. 911-2.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034687283/2024-08-31","en_vigueur_du":"2017-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc2017.905_2.intervenant_force","version":1,"libelle":"Appel introduit avant le 01/09/2024, bref délai : conclusions de l'intervenant forcé (art. 905-2, al. 4 ancien)","quantite":1,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 905-2, al. 4, rédaction du 01/09/2017 au 31/08/2024 : à peine d'irrecevabilité, un mois « à compter de la notification de la demande d'intervention formée à son encontre ». Augmenté par l'ancien art. 911-2, dernier alinéa.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034687283/2024-08-31","en_vigueur_du":"2017-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc2017.905_2.intervenant_volontaire","version":1,"libelle":"Appel introduit avant le 01/09/2024, bref délai : conclusions de l'intervenant volontaire (art. 905-2, al. 4 ancien)","quantite":1,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 905-2, al. 4, rédaction du 01/09/2017 au 31/08/2024 : « L'intervenant volontaire dispose, sous la même sanction, du même délai à compter de son intervention volontaire. » L'ancien art. 911-2 ne l'augmente pas.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034687283/2024-08-31","en_vigueur_du":"2017-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc2017.905_2.intime","version":1,"libelle":"Appel introduit avant le 01/09/2024, bref délai : conclusions de l'intimé (CPC, art. 905-2, al. 2 ancien)","quantite":1,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 905-2, al. 2, rédaction du 01/09/2017 au 31/08/2024 : à peine d'irrecevabilité, l'intimé dispose « d'un délai d'un mois à compter de la notification des conclusions de l'appelant ». Augmenté par l'ancien art. 911-2, dernier alinéa.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034687283/2024-08-31","en_vigueur_du":"2017-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc2017.908","version":1,"libelle":"Appel introduit avant le 01/09/2024 : conclusions de l'appelant (CPC, art. 908 ancien)","quantite":3,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 908, rédaction du 01/09/2017 au 31/08/2024 : « A peine de caducité de la déclaration d'appel, relevée d'office, l'appelant dispose d'un délai de trois mois à compter de la déclaration d'appel pour remettre ses conclusions au greffe. » Augmenté par l'ancien art. 911-2.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034757166/2024-08-31","en_vigueur_du":"2017-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc2017.909","version":1,"libelle":"Appel introduit avant le 01/09/2024 : conclusions de l'intimé (CPC, art. 909 ancien)","quantite":3,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 909, rédaction du 01/09/2017 au 31/08/2024 : l'intimé dispose, à peine d'irrecevabilité relevée d'office, « d'un délai de trois mois à compter de la notification des conclusions de l'appelant prévues à l'article 908 ». Augmenté par l'ancien art. 911-2.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034757168/2024-08-31","en_vigueur_du":"2017-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc2017.910.incident","version":1,"libelle":"Appel introduit avant le 01/09/2024 : conclusions sur appel incident ou provoqué (CPC, art. 910, al. 1 ancien)","quantite":3,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 910, al. 1, rédaction du 01/09/2017 au 31/08/2024 : l'intimé à un appel incident ou provoqué dispose, à peine d'irrecevabilité relevée d'office, « d'un délai de trois mois à compter de la notification qui lui en est faite ». Augmenté par l'ancien art. 911-2.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034757171/2024-08-31","en_vigueur_du":"2017-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc2017.910.intervenant_force","version":1,"libelle":"Appel introduit avant le 01/09/2024 : conclusions de l'intervenant forcé (CPC, art. 910, al. 2 ancien)","quantite":3,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 910, al. 2, rédaction du 01/09/2017 au 31/08/2024 : l'intervenant forcé dispose, à peine d'irrecevabilité, de trois mois « à compter de la date à laquelle la demande d'intervention formée à son encontre lui a été notifiée ». Augmenté par l'ancien art. 911-2.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034757171/2024-08-31","en_vigueur_du":"2017-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc2017.910.intervenant_volontaire","version":1,"libelle":"Appel introduit avant le 01/09/2024 : conclusions de l'intervenant volontaire (CPC, art. 910, al. 2 ancien)","quantite":3,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 910, al. 2, rédaction du 01/09/2017 au 31/08/2024 : « L'intervenant volontaire dispose, sous la même sanction, du même délai à compter de son intervention volontaire. » L'ancien art. 911-2 ne l'augmente pas.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034757171/2024-08-31","en_vigueur_du":"2017-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}
{"code":"tamila.cpc2017.911.signification","version":1,"libelle":"Appel introduit avant le 01/09/2024 : signifier les conclusions à une partie non constituée (art. 911, al. 2 ancien)","quantite":1,"unite":"mois","mode":"calendaires","proroge":true,"source_texte":"CPC, art. 911, al. 2, rédaction du 01/09/2017 au 31/08/2024 : les conclusions sont signifiées « au plus tard dans le mois suivant l'expiration des délais prévus à ces articles aux parties qui n'ont pas constitué avocat ». Départ : l'expiration du délai pour conclure.","source_url":"https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034757177/2024-08-31","en_vigueur_du":"2017-09-01","en_vigueur_au":null,"cree_le":"2026-09-29T02:24:27.405921+00:00"}

-- ═══ DONNÉES public.regles_validation (banc)
{"id":"cee5bd4e-f729-41b8-9390-e8337e6bc64f","client_id":"cccccccc-0000-4000-8000-00000000000c","entite_id":null,"module":"varelo","montant_min":0.00,"montant_max":null,"approbations_requises":1,"roles_autorises":["gerant","admin","valideur"],"actif":true,"cree_le":"2026-09-29T03:38:42.892335+00:00","type_action":"rattacher_codes","equipe_id":"11ca0f43-7a1a-4e2d-a64c-68856b331e1e","exige_commentaire":false,"exige_piece":false,"exige_motif":true}
{"id":"cc19dc3c-1716-4c3c-a7e0-b308c222e347","client_id":"cccccccc-0000-4000-8000-00000000000c","entite_id":null,"module":"varelo","montant_min":0.00,"montant_max":null,"approbations_requises":1,"roles_autorises":["gerant","admin","valideur"],"actif":true,"cree_le":"2026-09-29T03:38:42.892335+00:00","type_action":"rapprocher_codes","equipe_id":"11ca0f43-7a1a-4e2d-a64c-68856b331e1e","exige_commentaire":false,"exige_piece":false,"exige_motif":true}
{"id":"9a34889c-4332-4383-8a95-59bde79a109f","client_id":"cccccccc-0000-4000-8000-00000000000c","entite_id":null,"module":"varelo","montant_min":0.00,"montant_max":null,"approbations_requises":1,"roles_autorises":["gerant","admin","valideur"],"actif":true,"cree_le":"2026-09-29T03:38:42.892335+00:00","type_action":"fusionner_objets","equipe_id":"11ca0f43-7a1a-4e2d-a64c-68856b331e1e","exige_commentaire":false,"exige_piece":false,"exige_motif":true}
{"id":"7f935100-e6a4-47e0-9127-3c1378b73e6b","client_id":"cccccccc-0000-4000-8000-00000000000c","entite_id":null,"module":"varelo","montant_min":0.00,"montant_max":null,"approbations_requises":1,"roles_autorises":["gerant","admin","valideur"],"actif":true,"cree_le":"2026-09-29T03:38:42.892335+00:00","type_action":"detacher_code","equipe_id":"11ca0f43-7a1a-4e2d-a64c-68856b331e1e","exige_commentaire":false,"exige_piece":false,"exige_motif":true}
{"id":"d630d10d-843a-4cba-b27f-b1b931088c89","client_id":"cccccccc-0000-4000-8000-00000000000c","entite_id":null,"module":"varelo","montant_min":0.00,"montant_max":null,"approbations_requises":1,"roles_autorises":["gerant","admin","valideur"],"actif":true,"cree_le":"2026-09-29T03:38:42.892335+00:00","type_action":"scinder_objet","equipe_id":"11ca0f43-7a1a-4e2d-a64c-68856b331e1e","exige_commentaire":false,"exige_piece":false,"exige_motif":true}
{"id":"5e692143-c501-4335-b11c-13c2738b0329","client_id":"cccccccc-0000-4000-8000-00000000000c","entite_id":null,"module":"varelo","montant_min":0.00,"montant_max":null,"approbations_requises":1,"roles_autorises":["gerant","admin","valideur"],"actif":true,"cree_le":"2026-09-29T03:38:42.892335+00:00","type_action":"renommer_objet","equipe_id":"11ca0f43-7a1a-4e2d-a64c-68856b331e1e","exige_commentaire":false,"exige_piece":false,"exige_motif":true}
{"id":"b8c32687-d7d2-484f-8c64-106db95f9d14","client_id":"cccccccc-0000-4000-8000-00000000000c","entite_id":null,"module":"varelo","montant_min":0.00,"montant_max":null,"approbations_requises":2,"roles_autorises":["gerant","admin","valideur"],"actif":true,"cree_le":"2026-09-29T03:38:42.892335+00:00","type_action":"rattacher_iban_different","equipe_id":"48538658-643e-4052-aafc-1f63b3495c87","exige_commentaire":false,"exige_piece":false,"exige_motif":true}

-- ═══ DONNÉES public.tamila_regles_procedure
{"code":"tamila.cpc.902","regime":"cpc","evenement":"avis_signifier_declaration","procedures":["a_orienter","mise_en_etat"],"partie":"appelant","acte":"signifier_declaration","augmentable":true,"interruptible":false,"sanction":"caducite","article":"902, al. 3","libelle_court":"Signifier la déclaration d'appel"}
{"code":"tamila.cpc.906_1","regime":"cpc","evenement":"avis_fixation_bref_delai","procedures":["bref_delai"],"partie":"appelant","acte":"signifier_declaration","augmentable":true,"interruptible":false,"sanction":"caducite","article":"906-1, al. 1","libelle_court":"Signifier la déclaration d'appel"}
{"code":"tamila.cpc.906_2.appelant","regime":"cpc","evenement":"avis_fixation_bref_delai","procedures":["bref_delai"],"partie":"appelant","acte":"conclure","augmentable":true,"interruptible":true,"sanction":"caducite","article":"906-2, al. 1","libelle_court":"Conclusions de l'appelant"}
{"code":"tamila.cpc.906_2.incident","regime":"cpc","evenement":"notification_appel_incident","procedures":["bref_delai"],"partie":"destinataire","acte":"conclure","augmentable":true,"interruptible":true,"sanction":"irrecevabilite","article":"906-2, al. 3","libelle_court":"Conclusions sur appel incident ou provoqué"}
{"code":"tamila.cpc.906_2.intervenant_force","regime":"cpc","evenement":"notification_intervention_forcee","procedures":["bref_delai"],"partie":"intervenant_force","acte":"conclure","augmentable":true,"interruptible":true,"sanction":"irrecevabilite","article":"906-2, al. 4","libelle_court":"Conclusions de l'intervenant forcé"}
{"code":"tamila.cpc.906_2.intervenant_volontaire","regime":"cpc","evenement":"intervention_volontaire","procedures":["bref_delai"],"partie":"intervenant_volontaire","acte":"conclure","augmentable":false,"interruptible":true,"sanction":"irrecevabilite","article":"906-2, al. 4","libelle_court":"Conclusions de l'intervenant volontaire"}
{"code":"tamila.cpc.906_2.intime","regime":"cpc","evenement":"notification_conclusions_appelant","procedures":["bref_delai"],"partie":"intime","acte":"conclure","augmentable":true,"interruptible":true,"sanction":"irrecevabilite","article":"906-2, al. 2","libelle_court":"Conclusions de l'intimé"}
{"code":"tamila.cpc.906_2.signification","regime":"cpc","evenement":"expiration_delai_conclure","procedures":["bref_delai"],"partie":"toutes","acte":"signifier_conclusions","augmentable":false,"interruptible":false,"sanction":"selon_la_partie","article":"906-2, al. 5","libelle_court":"Signifier les conclusions à une partie non constituée"}
{"code":"tamila.cpc.908","regime":"cpc","evenement":"declaration_appel","procedures":["a_orienter","mise_en_etat"],"partie":"appelant","acte":"conclure","augmentable":true,"interruptible":true,"sanction":"caducite","article":"908","libelle_court":"Conclusions de l'appelant"}
{"code":"tamila.cpc.909","regime":"cpc","evenement":"notification_conclusions_appelant","procedures":["a_orienter","mise_en_etat"],"partie":"intime","acte":"conclure","augmentable":true,"interruptible":true,"sanction":"irrecevabilite","article":"909","libelle_court":"Conclusions de l'intimé"}
{"code":"tamila.cpc.910.incident","regime":"cpc","evenement":"notification_appel_incident","procedures":["a_orienter","mise_en_etat"],"partie":"destinataire","acte":"conclure","augmentable":true,"interruptible":true,"sanction":"irrecevabilite","article":"910, al. 1","libelle_court":"Conclusions sur appel incident ou provoqué"}
{"code":"tamila.cpc.910.intervenant_force","regime":"cpc","evenement":"notification_intervention_forcee","procedures":["a_orienter","mise_en_etat"],"partie":"intervenant_force","acte":"conclure","augmentable":true,"interruptible":true,"sanction":"irrecevabilite","article":"910, al. 2","libelle_court":"Conclusions de l'intervenant forcé"}
{"code":"tamila.cpc.910.intervenant_volontaire","regime":"cpc","evenement":"intervention_volontaire","procedures":["a_orienter","mise_en_etat"],"partie":"intervenant_volontaire","acte":"conclure","augmentable":false,"interruptible":true,"sanction":"irrecevabilite","article":"910, al. 2","libelle_court":"Conclusions de l'intervenant volontaire"}
{"code":"tamila.cpc.911.signification","regime":"cpc","evenement":"expiration_delai_conclure","procedures":["a_orienter","mise_en_etat"],"partie":"toutes","acte":"signifier_conclusions","augmentable":false,"interruptible":false,"sanction":"selon_la_partie","article":"911, al. 1","libelle_court":"Signifier les conclusions à une partie non constituée"}
{"code":"tamila.cpc2017.902","regime":"cpc2017","evenement":"avis_signifier_declaration","procedures":["a_orienter","mise_en_etat"],"partie":"appelant","acte":"signifier_declaration","augmentable":true,"interruptible":false,"sanction":"caducite","article":"902, al. 3","libelle_court":"Signifier la déclaration d'appel"}
{"code":"tamila.cpc2017.905_1","regime":"cpc2017","evenement":"avis_fixation_bref_delai","procedures":["bref_delai"],"partie":"appelant","acte":"signifier_declaration","augmentable":true,"interruptible":false,"sanction":"caducite","article":"905-1, al. 1","libelle_court":"Signifier la déclaration d'appel"}
{"code":"tamila.cpc2017.905_2.appelant","regime":"cpc2017","evenement":"avis_fixation_bref_delai","procedures":["bref_delai"],"partie":"appelant","acte":"conclure","augmentable":true,"interruptible":true,"sanction":"caducite","article":"905-2, al. 1","libelle_court":"Conclusions de l'appelant"}
{"code":"tamila.cpc2017.905_2.incident","regime":"cpc2017","evenement":"notification_appel_incident","procedures":["bref_delai"],"partie":"destinataire","acte":"conclure","augmentable":true,"interruptible":true,"sanction":"irrecevabilite","article":"905-2, al. 3","libelle_court":"Conclusions sur appel incident ou provoqué"}
{"code":"tamila.cpc2017.905_2.intervenant_force","regime":"cpc2017","evenement":"notification_intervention_forcee","procedures":["bref_delai"],"partie":"intervenant_force","acte":"conclure","augmentable":true,"interruptible":true,"sanction":"irrecevabilite","article":"905-2, al. 4","libelle_court":"Conclusions de l'intervenant forcé"}
{"code":"tamila.cpc2017.905_2.intervenant_volontaire","regime":"cpc2017","evenement":"intervention_volontaire","procedures":["bref_delai"],"partie":"intervenant_volontaire","acte":"conclure","augmentable":false,"interruptible":true,"sanction":"irrecevabilite","article":"905-2, al. 4","libelle_court":"Conclusions de l'intervenant volontaire"}
{"code":"tamila.cpc2017.905_2.intime","regime":"cpc2017","evenement":"notification_conclusions_appelant","procedures":["bref_delai"],"partie":"intime","acte":"conclure","augmentable":true,"interruptible":true,"sanction":"irrecevabilite","article":"905-2, al. 2","libelle_court":"Conclusions de l'intimé"}
{"code":"tamila.cpc2017.908","regime":"cpc2017","evenement":"declaration_appel","procedures":["a_orienter","mise_en_etat"],"partie":"appelant","acte":"conclure","augmentable":true,"interruptible":true,"sanction":"caducite","article":"908","libelle_court":"Conclusions de l'appelant"}
{"code":"tamila.cpc2017.909","regime":"cpc2017","evenement":"notification_conclusions_appelant","procedures":["a_orienter","mise_en_etat"],"partie":"intime","acte":"conclure","augmentable":true,"interruptible":true,"sanction":"irrecevabilite","article":"909","libelle_court":"Conclusions de l'intimé"}
{"code":"tamila.cpc2017.910.incident","regime":"cpc2017","evenement":"notification_appel_incident","procedures":["a_orienter","mise_en_etat"],"partie":"destinataire","acte":"conclure","augmentable":true,"interruptible":true,"sanction":"irrecevabilite","article":"910, al. 1","libelle_court":"Conclusions sur appel incident ou provoqué"}
{"code":"tamila.cpc2017.910.intervenant_force","regime":"cpc2017","evenement":"notification_intervention_forcee","procedures":["a_orienter","mise_en_etat"],"partie":"intervenant_force","acte":"conclure","augmentable":true,"interruptible":true,"sanction":"irrecevabilite","article":"910, al. 2","libelle_court":"Conclusions de l'intervenant forcé"}
{"code":"tamila.cpc2017.910.intervenant_volontaire","regime":"cpc2017","evenement":"intervention_volontaire","procedures":["a_orienter","mise_en_etat"],"partie":"intervenant_volontaire","acte":"conclure","augmentable":false,"interruptible":true,"sanction":"irrecevabilite","article":"910, al. 2","libelle_court":"Conclusions de l'intervenant volontaire"}
{"code":"tamila.cpc2017.911.signification","regime":"cpc2017","evenement":"expiration_delai_conclure","procedures":["a_orienter","mise_en_etat","bref_delai"],"partie":"toutes","acte":"signifier_conclusions","augmentable":false,"interruptible":false,"sanction":"selon_la_partie","article":"911, al. 2","libelle_court":"Signifier les conclusions à une partie non constituée"}

-- ═══ DONNÉES public.territoires
{"code":"metropole","libelle":"Métropole","fuseau":"Europe/Paris","iso":["FR","FX"],"complet":true}
{"code":"alsace-moselle","libelle":"Alsace-Moselle","fuseau":"Europe/Paris","iso":["FR-6AE","FR-67","FR-68","FR-57"],"complet":true}
{"code":"guadeloupe","libelle":"Guadeloupe","fuseau":"America/Guadeloupe","iso":["GP","FR-971","FR-GP","FR-GUA"],"complet":true}
{"code":"martinique","libelle":"Martinique","fuseau":"America/Martinique","iso":["MQ","FR-972","FR-MQ"],"complet":true}
{"code":"guyane","libelle":"Guyane","fuseau":"America/Cayenne","iso":["GF","FR-973","FR-GF"],"complet":true}
{"code":"la-reunion","libelle":"La Réunion","fuseau":"Indian/Reunion","iso":["RE","FR-974","FR-RE","FR-LRE"],"complet":true}
{"code":"mayotte","libelle":"Mayotte","fuseau":"Indian/Mayotte","iso":["YT","FR-976","FR-YT","FR-MAY"],"complet":true}
{"code":"saint-barthelemy","libelle":"Saint-Barthélemy","fuseau":"America/St_Barthelemy","iso":["BL","FR-BL","FR-977"],"complet":true}
{"code":"saint-martin","libelle":"Saint-Martin","fuseau":"America/Marigot","iso":["MF","FR-MF","FR-978"],"complet":true}
{"code":"saint-pierre-et-miquelon","libelle":"Saint-Pierre-et-Miquelon","fuseau":"America/Miquelon","iso":["PM","FR-PM","FR-975"],"complet":true}
{"code":"nouvelle-caledonie","libelle":"Nouvelle-Calédonie","fuseau":"Pacific/Noumea","iso":["NC","FR-NC","FR-988"],"complet":false}
{"code":"polynesie-francaise","libelle":"Polynésie française","fuseau":"Pacific/Tahiti","iso":["PF","FR-PF","FR-987"],"complet":false}
{"code":"wallis-et-futuna","libelle":"Wallis-et-Futuna","fuseau":"Pacific/Wallis","iso":["WF","FR-WF","FR-986"],"complet":false}
