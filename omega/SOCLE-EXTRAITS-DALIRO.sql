-- Extraits du socle Omega pour Daliro (BTP, marchés, chantiers) — préfixe btp_
-- Recette ygwbgpowzlbdaajlsqkn, photographie du 5 octobre 2026, 22 h 30, par le coordinateur.
-- Ce fichier NE S'EXÉCUTE PAS : il sert à écrire des « create or replace », des écrans et des tests.
-- Les ouvriers n'appellent jamais Supabase ; ce qui manque ici se demande au coordinateur.
-- Contenu : 13 tables, 6 vues, 69 fonctions, 1 crons.


-- ══════════════════ TABLES ══════════════════

-- ═══ TABLE public.btp_acceptations
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  chantier_id uuid not null
  entite_id uuid not null
  tiers_id uuid not null
  mode text not null default 'lettre'::text
  statut text not null default 'a_demander'::text
  paiement_direct boolean not null
  conditions_paiement text
  demandee_le date
  decidee_le date
  piece_id uuid
  note text
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint btp_acceptations_chantier_fkey FOREIGN KEY (client_id, chantier_id) REFERENCES btp_chantiers(client_id, id) ON DELETE CASCADE
  constraint btp_acceptations_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint btp_acceptations_client_id_id_key UNIQUE (client_id, id)
  constraint btp_acceptations_conditions_paiement_check CHECK ((char_length(conditions_paiement) <= 500))
  constraint btp_acceptations_decision_datee CHECK (((statut <> ALL (ARRAY['acceptee'::text, 'refusee'::text, 'caduque'::text])) OR (decidee_le IS NOT NULL)))
  constraint btp_acceptations_demande_datee CHECK (((statut = 'a_demander'::text) OR (demandee_le IS NOT NULL)))
  constraint btp_acceptations_mode_check CHECK ((mode = ANY (ARRAY['acte_special'::text, 'lettre'::text, 'avenant'::text, 'autre'::text])))
  constraint btp_acceptations_note_check CHECK ((char_length(note) <= 2000))
  constraint btp_acceptations_piece_fkey FOREIGN KEY (client_id, piece_id) REFERENCES pieces(client_id, id) ON DELETE SET NULL (piece_id)
  constraint btp_acceptations_pkey PRIMARY KEY (id)
  constraint btp_acceptations_statut_check CHECK ((statut = ANY (ARRAY['a_demander'::text, 'demandee'::text, 'acceptee'::text, 'refusee'::text, 'caduque'::text])))
  constraint btp_acceptations_tiers_fkey FOREIGN KEY (client_id, tiers_id) REFERENCES btp_tiers(client_id, id) ON DELETE CASCADE
  policy "gerants et admins retirent les acceptations" DELETE to authenticated using ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]) AND private.voit_entite(client_id, entite_id))) with check ()
  policy "le bureau met a jour les acceptations" UPDATE to authenticated using ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]) AND private.voit_entite(client_id, entite_id))) with check ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]) AND private.voit_entite(client_id, entite_id)))
  policy "le bureau tient les acceptations" INSERT to authenticated using () with check ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]) AND private.voit_entite(client_id, ( SELECT c.entite_id
   FROM btp_chantiers c
  WHERE (c.id = btp_acceptations.chantier_id)))))
  policy "membres lisent les acceptations de leurs chantiers" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND private.voit_entite(client_id, entite_id))) with check ()
  CREATE TRIGGER btp_acceptations_preparer BEFORE INSERT OR UPDATE ON public.btp_acceptations FOR EACH ROW EXECUTE FUNCTION private.btp_preparer_acceptation()
  CREATE TRIGGER btp_acceptations_tracer AFTER INSERT OR DELETE OR UPDATE ON public.btp_acceptations FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.btp_bibliotheque_prix
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  designation text not null
  designation_normalisee text default private.btp_normaliser(designation)
  unite text not null
  prix_unitaire_ht numeric(14,4) not null
  corps_etat text
  origine text not null
  ligne_marche_id uuid
  date_prix date not null default CURRENT_DATE
  statut text not null default 'propose'::text
  valide_par uuid
  valide_le timestamp with time zone
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint btp_bibliotheque_prix_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint btp_bibliotheque_prix_client_id_id_key UNIQUE (client_id, id)
  constraint btp_bibliotheque_prix_corps_etat_fkey FOREIGN KEY (corps_etat) REFERENCES btp_corps_etat(code)
  constraint btp_bibliotheque_prix_designation_check CHECK (((char_length(btrim(designation)) >= 1) AND (char_length(btrim(designation)) <= 2000)))
  constraint btp_bibliotheque_prix_ligne_fkey FOREIGN KEY (client_id, ligne_marche_id) REFERENCES btp_lignes_marche(client_id, id) ON DELETE SET NULL (ligne_marche_id)
  constraint btp_bibliotheque_prix_origine_check CHECK ((origine = ANY (ARRAY['marche'::text, 'saisie'::text])))
  constraint btp_bibliotheque_prix_pkey PRIMARY KEY (id)
  constraint btp_bibliotheque_prix_prix_unitaire_ht_check CHECK ((prix_unitaire_ht > (0)::numeric))
  constraint btp_bibliotheque_prix_statut_check CHECK ((statut = ANY (ARRAY['propose'::text, 'valide'::text, 'retire'::text])))
  constraint btp_bibliotheque_prix_unite_check CHECK ((unite = ANY (ARRAY['u'::text, 'ens'::text, 'forfait'::text, 'ml'::text, 'm2'::text, 'm3'::text, 'kg'::text, 't'::text, 'l'::text, 'h'::text, 'j'::text, 'sem'::text, 'mois'::text])))
  constraint btp_bibliotheque_prix_validation CHECK (((statut = 'propose'::text) OR (valide_le IS NOT NULL)))
  policy "membres lisent la bibliotheque de prix" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER btp_bibliotheque_prix_preparer BEFORE INSERT OR UPDATE ON public.btp_bibliotheque_prix FOR EACH ROW EXECUTE FUNCTION private.btp_preparer_prix()
  CREATE TRIGGER btp_bibliotheque_prix_tracer AFTER INSERT OR DELETE OR UPDATE ON public.btp_bibliotheque_prix FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le', 'prix_unitaire_ht')
  grants authenticated: SELECT

-- ═══ TABLE public.btp_chantiers
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  nom text not null
  alias text[] not null default '{}'::text[]
  reference text
  adresse text
  code_postal text not null
  commune text not null
  departement text not null
  territoire text not null
  zone_tva text not null
  latitude numeric(9,6)
  longitude numeric(9,6)
  geocode_source text
  geocode_score numeric(4,3)
  maitre_ouvrage_type text not null
  nature_marche text default 
CASE
    WHEN (maitre_ouvrage_type = 'acheteur_public'::text) THEN 'public'::text
    ELSE 'prive'::text
END
  place_client text not null
  regime_tva text not null
  maitre_ouvrage_id uuid
  maitre_oeuvre_id uuid
  donneur_ordre_id uuid
  conducteur_id uuid
  statut text not null default 'preparation'::text
  date_debut date
  date_fin_prevue date
  date_reception date
  jour_situation smallint
  cree_le timestamp with time zone not null default now()
  ouvert_le timestamp with time zone
  clos_le timestamp with time zone
  maj_le timestamp with time zone not null default now()
  constraint btp_chantiers_adresse_check CHECK ((char_length(adresse) <= 300))
  constraint btp_chantiers_alias_check CHECK ((cardinality(alias) <= 20))
  constraint btp_chantiers_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint btp_chantiers_client_id_id_key UNIQUE (client_id, id)
  constraint btp_chantiers_code_postal_check CHECK ((code_postal ~ '^[0-9]{5}$'::text))
  constraint btp_chantiers_commune_check CHECK (((char_length(btrim(commune)) >= 1) AND (char_length(btrim(commune)) <= 120)))
  constraint btp_chantiers_conducteur_fkey FOREIGN KEY (conducteur_id, client_id) REFERENCES comptes(user_id, client_id) ON DELETE SET NULL (conducteur_id)
  constraint btp_chantiers_coordonnees CHECK (((latitude IS NULL) = (longitude IS NULL)))
  constraint btp_chantiers_dates CHECK (((date_fin_prevue IS NULL) OR (date_debut IS NULL) OR (date_fin_prevue >= date_debut)))
  constraint btp_chantiers_donneur_ordre CHECK (((place_client = 'sous_traitant'::text) OR (donneur_ordre_id IS NULL)))
  constraint btp_chantiers_donneur_ordre_fkey FOREIGN KEY (client_id, donneur_ordre_id) REFERENCES btp_tiers(client_id, id) ON DELETE SET NULL (donneur_ordre_id)
  constraint btp_chantiers_entite_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id)
  constraint btp_chantiers_geocode_score_check CHECK (((geocode_score >= (0)::numeric) AND (geocode_score <= (1)::numeric)))
  constraint btp_chantiers_geocode_source_check CHECK ((geocode_source = ANY (ARRAY['geoplateforme'::text, 'saisie'::text])))
  constraint btp_chantiers_jour_situation_check CHECK (((jour_situation >= 1) AND (jour_situation <= 31)))
  constraint btp_chantiers_latitude_check CHECK (((latitude >= ('-90'::integer)::numeric) AND (latitude <= (90)::numeric)))
  constraint btp_chantiers_longitude_check CHECK (((longitude >= ('-180'::integer)::numeric) AND (longitude <= (180)::numeric)))
  constraint btp_chantiers_maitre_oeuvre_fkey FOREIGN KEY (client_id, maitre_oeuvre_id) REFERENCES btp_tiers(client_id, id) ON DELETE SET NULL (maitre_oeuvre_id)
  constraint btp_chantiers_maitre_ouvrage_fkey FOREIGN KEY (client_id, maitre_ouvrage_id) REFERENCES btp_tiers(client_id, id) ON DELETE SET NULL (maitre_ouvrage_id)
  constraint btp_chantiers_maitre_ouvrage_type_check CHECK ((maitre_ouvrage_type = ANY (ARRAY['particulier'::text, 'professionnel'::text, 'acheteur_public'::text])))
  constraint btp_chantiers_nom_check CHECK (((char_length(btrim(nom)) >= 1) AND (char_length(btrim(nom)) <= 200)))
  constraint btp_chantiers_pkey PRIMARY KEY (id)
  constraint btp_chantiers_place_client_check CHECK ((place_client = ANY (ARRAY['titulaire'::text, 'sous_traitant'::text, 'cotraitant'::text])))
  constraint btp_chantiers_reception CHECK (((statut <> ALL (ARRAY['receptionne'::text, 'clos'::text])) OR (date_reception IS NOT NULL)))
  constraint btp_chantiers_reference_check CHECK ((char_length(reference) <= 60))
  constraint btp_chantiers_regime_tva_check CHECK ((regime_tva = ANY (ARRAY['normal'::text, 'autoliquidation'::text, 'non_applicable'::text, 'hors_champ'::text])))
  constraint btp_chantiers_statut_check CHECK ((statut = ANY (ARRAY['preparation'::text, 'ouvert'::text, 'suspendu'::text, 'receptionne'::text, 'clos'::text, 'annule'::text])))
  constraint btp_chantiers_une_entite UNIQUE (entite_id)
  constraint btp_chantiers_zone_tva_check CHECK ((zone_tva = ANY (ARRAY['metropole'::text, 'corse'::text, 'guadeloupe'::text, 'martinique'::text, 'la-reunion'::text, 'guyane'::text, 'mayotte'::text, 'hors_champ'::text])))
  policy "gerants, admins et conducteurs creent des chantiers" INSERT to authenticated using () with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]))
  policy "gerants, admins et conducteurs modifient leurs chantiers" UPDATE to authenticated using ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]) AND private.voit_entite(client_id, entite_id))) with check ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]) AND private.voit_entite(client_id, entite_id)))
  policy "membres lisent les chantiers de leur perimetre" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND private.btp_voit_chantier(client_id, entite_id))) with check ()
  CREATE TRIGGER btp_chantiers_efface AFTER DELETE ON public.btp_chantiers FOR EACH ROW EXECUTE FUNCTION private.btp_chantier_efface()
  CREATE TRIGGER btp_chantiers_preparer BEFORE INSERT OR UPDATE ON public.btp_chantiers FOR EACH ROW EXECUTE FUNCTION private.btp_preparer_chantier()
  CREATE TRIGGER btp_chantiers_tracer AFTER INSERT OR DELETE OR UPDATE ON public.btp_chantiers FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: INSERT,SELECT,UPDATE

-- ═══ TABLE public.btp_corps_etat
  code text not null
  libelle text not null
  rang_sequence smallint not null
  exterieur boolean not null default false
  constraint btp_corps_etat_code_check CHECK ((code ~ '^[a-z][a-z_]{1,39}$'::text))
  constraint btp_corps_etat_libelle_check CHECK (((char_length(btrim(libelle)) >= 1) AND (char_length(btrim(libelle)) <= 120)))
  constraint btp_corps_etat_pkey PRIMARY KEY (code)
  constraint btp_corps_etat_rang_sequence_check CHECK (((rang_sequence >= 1) AND (rang_sequence <= 99)))
  policy "tout compte lit les corps d'etat" SELECT to authenticated using (true) with check ()

  grants authenticated: SELECT

-- ═══ TABLE public.btp_dependances
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  chantier_id uuid not null
  amont_id uuid not null
  aval_id uuid not null
  delai_min_jours smallint not null default 0
  origine text not null default 'saisie'::text
  confirmee boolean not null default true
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint btp_dependances_amont_fkey FOREIGN KEY (chantier_id, amont_id) REFERENCES btp_passages(chantier_id, id) ON DELETE CASCADE
  constraint btp_dependances_aval_fkey FOREIGN KEY (chantier_id, aval_id) REFERENCES btp_passages(chantier_id, id) ON DELETE CASCADE
  constraint btp_dependances_chantier_fkey FOREIGN KEY (client_id, chantier_id) REFERENCES btp_chantiers(client_id, id) ON DELETE CASCADE
  constraint btp_dependances_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint btp_dependances_client_id_id_key UNIQUE (client_id, id)
  constraint btp_dependances_delai_min_jours_check CHECK (((delai_min_jours >= 0) AND (delai_min_jours <= 365)))
  constraint btp_dependances_origine_check CHECK ((origine = ANY (ARRAY['saisie'::text, 'gabarit'::text, 'import'::text])))
  constraint btp_dependances_pas_soi_meme CHECK ((amont_id <> aval_id))
  constraint btp_dependances_pkey PRIMARY KEY (id)
  constraint btp_dependances_un_lien UNIQUE (amont_id, aval_id)
  policy "le bureau corrige les dependances" UPDATE to authenticated using ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]) AND private.voit_entite(client_id, ( SELECT c.entite_id
   FROM btp_chantiers c
  WHERE (c.id = btp_dependances.chantier_id))))) with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]))
  policy "le bureau pose les dependances" INSERT to authenticated using () with check ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]) AND private.voit_entite(client_id, ( SELECT p.entite_id
   FROM btp_passages p
  WHERE (p.id = btp_dependances.amont_id)))))
  policy "le bureau retire les dependances" DELETE to authenticated using ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]) AND private.voit_entite(client_id, ( SELECT c.entite_id
   FROM btp_chantiers c
  WHERE (c.id = btp_dependances.chantier_id))))) with check ()
  policy "membres lisent les dependances de leurs chantiers" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND private.voit_entite(client_id, ( SELECT c.entite_id
   FROM btp_chantiers c
  WHERE (c.id = btp_dependances.chantier_id))))) with check ()
  CREATE TRIGGER btp_dependances_preparer BEFORE INSERT OR UPDATE ON public.btp_dependances FOR EACH ROW EXECUTE FUNCTION private.btp_preparer_dependance()
  CREATE TRIGGER btp_dependances_tracer AFTER INSERT OR DELETE OR UPDATE ON public.btp_dependances FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.btp_equipes
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  nom text not null
  chef_id uuid
  actif boolean not null default true
  cree_le timestamp with time zone not null default now()
  constraint btp_equipes_chef_fkey FOREIGN KEY (client_id, chef_id) REFERENCES btp_intervenants(client_id, id) ON DELETE SET NULL (chef_id)
  constraint btp_equipes_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint btp_equipes_client_id_id_key UNIQUE (client_id, id)
  constraint btp_equipes_nom_check CHECK (((char_length(btrim(nom)) >= 1) AND (char_length(btrim(nom)) <= 80)))
  constraint btp_equipes_pkey PRIMARY KEY (id)
  constraint btp_equipes_un_nom UNIQUE (client_id, nom)
  policy "gerants et admins retirent des equipes" DELETE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check ()
  policy "le bureau cree les equipes" INSERT to authenticated using () with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text, 'collaborateur'::text]))
  policy "le bureau modifie les equipes" UPDATE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text, 'collaborateur'::text])) with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text, 'collaborateur'::text]))
  policy "membres lisent les equipes" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER btp_equipes_preparer BEFORE INSERT OR UPDATE ON public.btp_equipes FOR EACH ROW EXECUTE FUNCTION private.btp_preparer_personne()
  CREATE TRIGGER btp_equipes_tracer AFTER INSERT OR DELETE OR UPDATE ON public.btp_equipes FOR EACH ROW EXECUTE FUNCTION private.tracer()
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.btp_intervenants
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  nom text not null
  telephone text
  role_terrain text not null default 'compagnon'::text
  equipe_id uuid
  informe_le date
  actif boolean not null default true
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint btp_intervenants_client_id_equipe_id_fkey FOREIGN KEY (client_id, equipe_id) REFERENCES btp_equipes(client_id, id) ON DELETE SET NULL (equipe_id)
  constraint btp_intervenants_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint btp_intervenants_client_id_id_key UNIQUE (client_id, id)
  constraint btp_intervenants_nom_check CHECK (((char_length(btrim(nom)) >= 1) AND (char_length(btrim(nom)) <= 120)))
  constraint btp_intervenants_pkey PRIMARY KEY (id)
  constraint btp_intervenants_role_terrain_check CHECK ((role_terrain = ANY (ARRAY['chef_equipe'::text, 'compagnon'::text, 'conducteur'::text, 'autre'::text])))
  constraint btp_intervenants_telephone_check CHECK ((telephone ~ '^\+[1-9][0-9]{7,14}$'::text))
  policy "gerants et admins retirent des intervenants" DELETE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check ()
  policy "le bureau ajoute des intervenants" INSERT to authenticated using () with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text, 'collaborateur'::text]))
  policy "le bureau modifie les intervenants" UPDATE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text, 'collaborateur'::text])) with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text, 'collaborateur'::text]))
  policy "membres lisent les intervenants" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER btp_intervenants_preparer BEFORE INSERT OR UPDATE ON public.btp_intervenants FOR EACH ROW EXECUTE FUNCTION private.btp_preparer_personne()
  CREATE TRIGGER btp_intervenants_telephone BEFORE INSERT OR UPDATE OF telephone, actif ON public.btp_intervenants FOR EACH ROW EXECUTE FUNCTION private.btp_telephone_unique()
  CREATE TRIGGER btp_intervenants_tracer AFTER INSERT OR DELETE OR UPDATE ON public.btp_intervenants FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.btp_lignes_marche
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  chantier_id uuid not null
  entite_id uuid not null
  marche_id uuid not null
  lot_id uuid
  ordre integer not null default 0
  numero text
  section text
  designation text not null
  designation_normalisee text default private.btp_normaliser(designation)
  unite_lue text
  unite text
  quantite numeric(14,3)
  prix_unitaire_ht numeric(14,4)
  montant_ht numeric(14,2)
  nature text not null default 'ouvrage'::text
  ecart numeric(14,2) default (montant_ht - round((quantite * prix_unitaire_ht), 2))
  controle text default 
CASE
    WHEN (nature = 'forfait'::text) THEN
    CASE
        WHEN (montant_ht IS NULL) THEN 'incomplet'::text
        WHEN ((quantite IS NOT NULL) AND (prix_unitaire_ht IS NOT NULL) AND (abs((round((quantite * prix_unitaire_ht), 2) - montant_ht)) > 0.01)) THEN 'montant_faux'::text
        ELSE 'ok'::text
    END
    WHEN ((quantite IS NULL) OR (prix_unitaire_ht IS NULL) OR (montant_ht IS NULL) OR (unite IS NULL)) THEN 'incomplet'::text
    WHEN (abs((round((quantite * prix_unitaire_ht), 2) - montant_ht)) > 0.01) THEN 'montant_faux'::text
    ELSE 'ok'::text
END
  ecart_accepte boolean not null default false
  ecart_motif text
  lu jsonb not null default '{}'::jsonb
  corrigee boolean not null default false
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint btp_lignes_marche_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint btp_lignes_marche_client_id_id_key UNIQUE (client_id, id)
  constraint btp_lignes_marche_designation_check CHECK (((char_length(btrim(designation)) >= 1) AND (char_length(btrim(designation)) <= 2000)))
  constraint btp_lignes_marche_ecart_motif_check CHECK ((char_length(ecart_motif) <= 500))
  constraint btp_lignes_marche_lot_fkey FOREIGN KEY (chantier_id, lot_id) REFERENCES btp_lots(chantier_id, id) ON DELETE SET NULL (lot_id)
  constraint btp_lignes_marche_marche_fkey FOREIGN KEY (client_id, marche_id) REFERENCES btp_marches(client_id, id) ON DELETE CASCADE
  constraint btp_lignes_marche_motif CHECK (((NOT ecart_accepte) OR (ecart_motif IS NOT NULL)))
  constraint btp_lignes_marche_nature_check CHECK ((nature = ANY (ARRAY['ouvrage'::text, 'fourniture'::text, 'forfait'::text, 'option'::text])))
  constraint btp_lignes_marche_numero_check CHECK ((char_length(numero) <= 30))
  constraint btp_lignes_marche_ordre_check CHECK ((ordre >= 0))
  constraint btp_lignes_marche_pkey PRIMARY KEY (id)
  constraint btp_lignes_marche_section_check CHECK ((char_length(section) <= 300))
  constraint btp_lignes_marche_unite_check CHECK ((unite = ANY (ARRAY['u'::text, 'ens'::text, 'forfait'::text, 'ml'::text, 'm2'::text, 'm3'::text, 'kg'::text, 't'::text, 'l'::text, 'h'::text, 'j'::text, 'sem'::text, 'mois'::text])))
  constraint btp_lignes_marche_unite_lue_check CHECK ((char_length(unite_lue) <= 30))
  policy "membres lisent les lignes des marches de leurs chantiers" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND private.voit_entite(client_id, entite_id))) with check ()
  CREATE TRIGGER btp_lignes_marche_preparer BEFORE INSERT OR DELETE OR UPDATE ON public.btp_lignes_marche FOR EACH ROW EXECUTE FUNCTION private.btp_preparer_ligne_marche()
  grants authenticated: SELECT

-- ═══ TABLE public.btp_lots
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  chantier_id uuid not null
  entite_id uuid not null
  code text not null
  libelle text not null
  corps_etat text
  rang smallint not null default 0
  execution text not null default 'client'::text
  tiers_id uuid
  equipe_id uuid
  referme_par_lot_id uuid
  exterieur boolean not null default false
  statut text not null default 'a_venir'::text
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint btp_lots_chantier_fkey FOREIGN KEY (client_id, chantier_id) REFERENCES btp_chantiers(client_id, id) ON DELETE CASCADE
  constraint btp_lots_chantier_id_id_key UNIQUE (chantier_id, id)
  constraint btp_lots_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint btp_lots_client_id_id_key UNIQUE (client_id, id)
  constraint btp_lots_code_check CHECK ((code ~ '^[0-9A-Za-z][0-9A-Za-z._-]{0,9}$'::text))
  constraint btp_lots_corps_etat_fkey FOREIGN KEY (corps_etat) REFERENCES btp_corps_etat(code)
  constraint btp_lots_equipe_fkey FOREIGN KEY (client_id, equipe_id) REFERENCES btp_equipes(client_id, id) ON DELETE SET NULL (equipe_id)
  constraint btp_lots_executant CHECK ((((execution = 'client'::text) AND (tiers_id IS NULL)) OR ((execution <> 'client'::text) AND (equipe_id IS NULL))))
  constraint btp_lots_execution_check CHECK ((execution = ANY (ARRAY['client'::text, 'sous_traitant'::text, 'autre_titulaire'::text])))
  constraint btp_lots_libelle_check CHECK (((char_length(btrim(libelle)) >= 1) AND (char_length(btrim(libelle)) <= 200)))
  constraint btp_lots_pas_soi_meme CHECK (((referme_par_lot_id IS NULL) OR (referme_par_lot_id <> id)))
  constraint btp_lots_pkey PRIMARY KEY (id)
  constraint btp_lots_rang_check CHECK (((rang >= 0) AND (rang <= 999)))
  constraint btp_lots_referme_fkey FOREIGN KEY (chantier_id, referme_par_lot_id) REFERENCES btp_lots(chantier_id, id) ON DELETE SET NULL (referme_par_lot_id)
  constraint btp_lots_statut_check CHECK ((statut = ANY (ARRAY['a_venir'::text, 'en_cours'::text, 'termine'::text])))
  constraint btp_lots_tiers_fkey FOREIGN KEY (client_id, tiers_id) REFERENCES btp_tiers(client_id, id) ON DELETE SET NULL (tiers_id)
  constraint btp_lots_un_code UNIQUE (chantier_id, code)
  policy "gerants, admins et conducteurs modifient les lots" UPDATE to authenticated using ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]) AND private.voit_entite(client_id, entite_id))) with check ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]) AND private.voit_entite(client_id, entite_id)))
  policy "gerants, admins et conducteurs posent les lots" INSERT to authenticated using () with check ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]) AND private.voit_entite(client_id, entite_id)))
  policy "gerants, admins et conducteurs retirent des lots" DELETE to authenticated using ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]) AND private.voit_entite(client_id, entite_id))) with check ()
  policy "membres lisent les lots de leurs chantiers" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND private.voit_entite(client_id, entite_id))) with check ()
  CREATE TRIGGER btp_lots_preparer BEFORE INSERT OR UPDATE ON public.btp_lots FOR EACH ROW EXECUTE FUNCTION private.btp_preparer_lot()
  CREATE TRIGGER btp_lots_tracer AFTER INSERT OR DELETE OR UPDATE ON public.btp_lots FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.btp_marches
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  chantier_id uuid not null
  entite_id uuid not null
  reference text
  objet text
  date_signature date
  mode_prix text not null
  montant_ht_declare numeric(14,2)
  retenue_taux numeric(5,4) not null default 0
  retenue_base text not null default 'ttc'::text
  retenue_caution boolean not null default false
  source text not null default 'saisie'::text
  piece_id uuid
  statut text not null default 'a_verifier'::text
  verifie_par uuid
  verifie_libelle text
  verifie_le timestamp with time zone
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint btp_marches_chantier_fkey FOREIGN KEY (client_id, chantier_id) REFERENCES btp_chantiers(client_id, id) ON DELETE CASCADE
  constraint btp_marches_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint btp_marches_client_id_id_key UNIQUE (client_id, id)
  constraint btp_marches_mode_prix_check CHECK ((mode_prix = ANY (ARRAY['forfait'::text, 'unitaire'::text, 'mixte'::text])))
  constraint btp_marches_montant_ht_declare_check CHECK ((montant_ht_declare >= (0)::numeric))
  constraint btp_marches_objet_check CHECK ((char_length(objet) <= 500))
  constraint btp_marches_piece_fkey FOREIGN KEY (client_id, piece_id) REFERENCES pieces(client_id, id) ON DELETE SET NULL (piece_id)
  constraint btp_marches_pkey PRIMARY KEY (id)
  constraint btp_marches_reference_check CHECK ((char_length(reference) <= 60))
  constraint btp_marches_retenue_base_check CHECK ((retenue_base = ANY (ARRAY['ht'::text, 'ttc'::text])))
  constraint btp_marches_retenue_taux_check CHECK (((retenue_taux >= (0)::numeric) AND (retenue_taux <= 0.05)))
  constraint btp_marches_source_check CHECK ((source = ANY (ARRAY['saisie'::text, 'tableur'::text, 'pdf'::text, 'api'::text])))
  constraint btp_marches_statut_check CHECK ((statut = ANY (ARRAY['a_verifier'::text, 'verifie'::text])))
  constraint btp_marches_verification CHECK (((statut <> 'verifie'::text) OR (verifie_le IS NOT NULL)))
  policy "membres lisent les marches de leurs chantiers" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND private.voit_entite(client_id, entite_id))) with check ()
  CREATE TRIGGER btp_marches_preparer BEFORE INSERT OR DELETE OR UPDATE ON public.btp_marches FOR EACH ROW EXECUTE FUNCTION private.btp_preparer_marche()
  CREATE TRIGGER btp_marches_tracer AFTER INSERT OR DELETE OR UPDATE ON public.btp_marches FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le', 'montant_ht_declare')
  grants authenticated: SELECT

-- ═══ TABLE public.btp_passages
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  chantier_id uuid not null
  entite_id uuid not null
  lot_id uuid
  equipe_id uuid
  tiers_id uuid
  intervenant_type text not null
  intervenant_lu text
  rapprochement text
  tache text
  debut date not null
  fin date not null
  exterieur boolean not null
  seuil_pluie_mm numeric(5,1)
  seuil_vent_kmh smallint
  seuil_temp_min smallint
  seuil_temp_max smallint
  statut text not null default 'prevu'::text
  confirmation text not null default 'non_demandee'::text
  confirmation_le timestamp with time zone
  remplace_par_id uuid
  source text not null default 'saisie'::text
  source_ref text
  version integer not null default 1
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint btp_passages_chantier_fkey FOREIGN KEY (client_id, chantier_id) REFERENCES btp_chantiers(client_id, id) ON DELETE CASCADE
  constraint btp_passages_chantier_id_id_key UNIQUE (chantier_id, id)
  constraint btp_passages_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint btp_passages_client_id_id_key UNIQUE (client_id, id)
  constraint btp_passages_confirmation_check CHECK ((confirmation = ANY (ARRAY['non_demandee'::text, 'demandee'::text, 'confirmee'::text, 'declinee'::text, 'sans_reponse'::text])))
  constraint btp_passages_confirmation_datee CHECK (((confirmation = 'non_demandee'::text) OR (confirmation_le IS NOT NULL)))
  constraint btp_passages_dates CHECK ((fin >= debut))
  constraint btp_passages_equipe_fkey FOREIGN KEY (client_id, equipe_id) REFERENCES btp_equipes(client_id, id) ON DELETE SET NULL (equipe_id)
  constraint btp_passages_intervenant_lu_check CHECK ((char_length(intervenant_lu) <= 200))
  constraint btp_passages_intervenant_type_check CHECK ((intervenant_type = ANY (ARRAY['equipe'::text, 'tiers'::text, 'inconnu'::text])))
  constraint btp_passages_lot_fkey FOREIGN KEY (chantier_id, lot_id) REFERENCES btp_lots(chantier_id, id) ON DELETE SET NULL (lot_id)
  constraint btp_passages_pas_soi_meme CHECK (((remplace_par_id IS NULL) OR (remplace_par_id <> id)))
  constraint btp_passages_pkey PRIMARY KEY (id)
  constraint btp_passages_rapprochement_check CHECK ((rapprochement = ANY (ARRAY['identique'::text, 'ressemblance'::text, 'manuel'::text])))
  constraint btp_passages_remplace_fkey FOREIGN KEY (chantier_id, remplace_par_id) REFERENCES btp_passages(chantier_id, id) ON DELETE SET NULL (remplace_par_id)
  constraint btp_passages_seuil_pluie_mm_check CHECK ((seuil_pluie_mm >= (0)::numeric))
  constraint btp_passages_seuil_temp_max_check CHECK (((seuil_temp_max >= '-50'::integer) AND (seuil_temp_max <= 60)))
  constraint btp_passages_seuil_temp_min_check CHECK (((seuil_temp_min >= '-50'::integer) AND (seuil_temp_min <= 60)))
  constraint btp_passages_seuil_vent_kmh_check CHECK (((seuil_vent_kmh >= 0) AND (seuil_vent_kmh <= 300)))
  constraint btp_passages_source_check CHECK ((source = ANY (ARRAY['saisie'::text, 'tableur'::text, 'alobees'::text, 'api'::text])))
  constraint btp_passages_source_ref_check CHECK ((char_length(source_ref) <= 120))
  constraint btp_passages_statut_check CHECK ((statut = ANY (ARRAY['prevu'::text, 'fait'::text, 'annule'::text])))
  constraint btp_passages_tache_check CHECK ((char_length(tache) <= 300))
  constraint btp_passages_temperatures CHECK (((seuil_temp_min IS NULL) OR (seuil_temp_max IS NULL) OR (seuil_temp_min < seuil_temp_max)))
  constraint btp_passages_tiers_fkey FOREIGN KEY (client_id, tiers_id) REFERENCES btp_tiers(client_id, id) ON DELETE SET NULL (tiers_id)
  constraint btp_passages_type_intervenant CHECK ((intervenant_type =
CASE
    WHEN (equipe_id IS NOT NULL) THEN 'equipe'::text
    WHEN (tiers_id IS NOT NULL) THEN 'tiers'::text
    ELSE 'inconnu'::text
END))
  constraint btp_passages_un_intervenant CHECK (((equipe_id IS NULL) OR (tiers_id IS NULL)))
  constraint btp_passages_version_check CHECK ((version >= 1))
  policy "le bureau deplace les passages" UPDATE to authenticated using ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]) AND private.voit_entite(client_id, entite_id))) with check ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]) AND private.voit_entite(client_id, entite_id)))
  policy "le bureau pose les passages" INSERT to authenticated using () with check ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]) AND private.voit_entite(client_id, ( SELECT c.entite_id
   FROM btp_chantiers c
  WHERE (c.id = btp_passages.chantier_id)))))
  policy "le bureau retire les passages" DELETE to authenticated using ((private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text]) AND private.voit_entite(client_id, entite_id))) with check ()
  policy "membres lisent les passages de leurs chantiers" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND private.voit_entite(client_id, entite_id))) with check ()
  CREATE TRIGGER btp_passages_preparer BEFORE INSERT OR UPDATE ON public.btp_passages FOR EACH ROW EXECUTE FUNCTION private.btp_preparer_passage()
  CREATE TRIGGER btp_passages_tracer AFTER INSERT OR DELETE OR UPDATE ON public.btp_passages FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.btp_reglages
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  formule text not null
  quota_chantiers integer not null
  quota_comptes_bureau integer not null
  installe_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint btp_reglages_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint btp_reglages_client_id_key UNIQUE (client_id)
  constraint btp_reglages_formule_check CHECK ((formule = ANY (ARRAY['demarrage'::text, 'chantiers'::text, 'entreprise'::text])))
  constraint btp_reglages_pkey PRIMARY KEY (id)
  constraint btp_reglages_quota_chantiers_check CHECK (((quota_chantiers >= 1) AND (quota_chantiers <= 5000)))
  constraint btp_reglages_quota_comptes_bureau_check CHECK (((quota_comptes_bureau >= 1) AND (quota_comptes_bureau <= 5000)))
  constraint btp_reglages_quotas_de_la_formule CHECK (((formule = 'entreprise'::text) OR ((formule = 'demarrage'::text) AND (quota_chantiers = 5) AND (quota_comptes_bureau = 2)) OR ((formule = 'chantiers'::text) AND (quota_chantiers = 20) AND (quota_comptes_bureau = 5))))
  policy "membres lisent les reglages de daliro" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER btp_reglages_preparer BEFORE INSERT OR UPDATE ON public.btp_reglages FOR EACH ROW EXECUTE FUNCTION private.btp_preparer_reglages()
  CREATE TRIGGER btp_reglages_tracer AFTER INSERT OR DELETE OR UPDATE ON public.btp_reglages FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: SELECT

-- ═══ TABLE public.btp_tiers
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  roles text[] not null
  personne_physique boolean not null default false
  nom text not null
  siren text
  siret text
  contact_nom text
  telephone text
  email text
  canal text
  adresse text
  code_postal text
  commune text
  corps_etat text[] not null default '{}'::text[]
  departements text[] not null default '{}'::text[]
  confirmer_passages boolean not null default true
  vigilance_attestation_le date
  vigilance_verifiee_le timestamp with time zone
  vigilance_verifiee_par uuid
  actif boolean not null default true
  note text
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint btp_tiers_adresse_check CHECK ((char_length(adresse) <= 300))
  constraint btp_tiers_canal_check CHECK ((canal = ANY (ARRAY['whatsapp'::text, 'sms'::text, 'email'::text, 'telephone'::text])))
  constraint btp_tiers_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint btp_tiers_client_id_id_key UNIQUE (client_id, id)
  constraint btp_tiers_code_postal_check CHECK ((code_postal ~ '^[0-9]{5}$'::text))
  constraint btp_tiers_commune_check CHECK ((char_length(commune) <= 120))
  constraint btp_tiers_contact_nom_check CHECK ((char_length(contact_nom) <= 120))
  constraint btp_tiers_departements_check CHECK (private.btp_departements_valides(departements))
  constraint btp_tiers_email_check CHECK (((char_length(email) <= 320) AND (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'::text)))
  constraint btp_tiers_nom_check CHECK (((char_length(btrim(nom)) >= 1) AND (char_length(btrim(nom)) <= 200)))
  constraint btp_tiers_note_check CHECK ((char_length(note) <= 2000))
  constraint btp_tiers_particulier_sans_siren CHECK (((NOT personne_physique) OR (siren IS NULL)))
  constraint btp_tiers_pkey PRIMARY KEY (id)
  constraint btp_tiers_roles_check CHECK ((((cardinality(roles) >= 1) AND (cardinality(roles) <= 8)) AND (roles <@ ARRAY['maitre_ouvrage'::text, 'maitre_oeuvre'::text, 'sous_traitant'::text, 'autre_titulaire'::text, 'fournisseur'::text, 'loueur'::text, 'entreprise_principale'::text, 'controleur'::text])))
  constraint btp_tiers_siren_check CHECK (((siren IS NULL) OR ((siren ~ '^[0-9]{9}$'::text) AND private.btp_luhn(siren))))
  constraint btp_tiers_siret_check CHECK ((siret ~ '^[0-9]{14}$'::text))
  constraint btp_tiers_siret_du_siren CHECK (((siret IS NULL) OR (siren IS NULL) OR ("left"(siret, 9) = siren)))
  constraint btp_tiers_siret_valide CHECK (((siret IS NULL) OR private.btp_siret_valide(siret)))
  constraint btp_tiers_telephone_check CHECK ((telephone ~ '^\+[1-9][0-9]{7,14}$'::text))
  constraint btp_tiers_vigilance_verifiee CHECK (((vigilance_verifiee_le IS NULL) OR (vigilance_attestation_le IS NOT NULL)))
  policy "gerants et admins retirent des tiers" DELETE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check ()
  policy "le bureau ajoute des tiers" INSERT to authenticated using () with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text, 'collaborateur'::text]))
  policy "le bureau modifie les tiers" UPDATE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text, 'collaborateur'::text])) with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text, 'valideur'::text, 'collaborateur'::text]))
  policy "membres lisent l'annuaire" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER btp_tiers_preparer BEFORE INSERT OR UPDATE ON public.btp_tiers FOR EACH ROW EXECUTE FUNCTION private.btp_preparer_personne()
  CREATE TRIGGER btp_tiers_telephone BEFORE INSERT OR UPDATE OF telephone, actif ON public.btp_tiers FOR EACH ROW EXECUTE FUNCTION private.btp_telephone_unique()
  CREATE TRIGGER btp_tiers_tracer AFTER INSERT OR DELETE OR UPDATE ON public.btp_tiers FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: DELETE,INSERT,SELECT,UPDATE


-- ══════════════════ VUES ══════════════════

-- ═══ VUE public.btp_bibliotheque_chiffree
 SELECT id,
    client_id,
    designation,
    unite,
    corps_etat,
    origine,
    ligne_marche_id,
    date_prix,
    statut,
    valide_par,
    valide_le,
    private.btp_prix_bibliotheque(id) AS prix_unitaire_ht
   FROM btp_bibliotheque_prix b;

-- ═══ VUE public.btp_chantiers_etape
 WITH l AS (
         SELECT l.client_id,
            l.chantier_id,
            l.id,
            l.libelle,
            l.statut,
            row_number() OVER (PARTITION BY l.chantier_id ORDER BY l.rang, (l.code COLLATE "C")) AS rn
           FROM btp_lots l
        ), e AS (
         SELECT l.client_id,
            l.chantier_id,
            count(*)::integer AS etapes,
            COALESCE(max(l.rn) FILTER (WHERE l.statut = 'en_cours'::text), count(*) FILTER (WHERE l.statut = 'termine'::text))::integer AS etape
           FROM l
          GROUP BY l.client_id, l.chantier_id
        )
 SELECT c.client_id,
    c.id AS chantier_id,
    COALESCE(e.etape, 0) AS etape,
    COALESCE(e.etapes, 0) AS etapes,
    lc.id AS lot_id,
    lc.libelle AS lot_libelle,
        CASE
            WHEN COALESCE(e.etapes, 0) = 0 THEN 0::numeric
            ELSE round(100.0 * e.etape::numeric / e.etapes::numeric)
        END::smallint AS avancement_pct
   FROM btp_chantiers c
     LEFT JOIN e ON e.chantier_id = c.id
     LEFT JOIN l lc ON lc.chantier_id = c.id AND lc.rn = e.etape;

-- ═══ VUE public.btp_controle
 SELECT c.client_id,
    c.id AS chantier_id,
    'btp_chantiers'::text AS objet_type,
    c.id AS objet_id,
    'chantier_sans_maitre_ouvrage'::text AS code,
    'bloquant'::text AS gravite,
    format('%s : aucun maître d''ouvrage désigné ; personne ne peut signer ses avenants.'::text, c.nom) AS message
   FROM btp_chantiers c
  WHERE (c.statut = ANY (ARRAY['preparation'::text, 'ouvert'::text, 'suspendu'::text])) AND c.place_client <> 'sous_traitant'::text AND c.maitre_ouvrage_id IS NULL
UNION ALL
 SELECT c.client_id,
    c.id AS chantier_id,
    'btp_chantiers'::text AS objet_type,
    c.id AS objet_id,
    'chantier_sans_donneur_ordre'::text AS code,
    'bloquant'::text AS gravite,
    format('%s : l''entreprise principale n''est pas désignée ; elle signe les avenants du sous-traitant.'::text, c.nom) AS message
   FROM btp_chantiers c
  WHERE (c.statut = ANY (ARRAY['preparation'::text, 'ouvert'::text, 'suspendu'::text])) AND c.place_client = 'sous_traitant'::text AND c.donneur_ordre_id IS NULL
UNION ALL
 SELECT c.client_id,
    c.id AS chantier_id,
    'btp_chantiers'::text AS objet_type,
    c.id AS objet_id,
    'chantier_sans_conducteur'::text AS code,
    'attention'::text AS gravite,
    format('%s : aucun conducteur de travaux ; ses listes du matin n''ont pas de destinataire.'::text, c.nom) AS message
   FROM btp_chantiers c
  WHERE (c.statut = ANY (ARRAY['ouvert'::text, 'suspendu'::text])) AND c.conducteur_id IS NULL
UNION ALL
 SELECT c.client_id,
    c.id AS chantier_id,
    'btp_chantiers'::text AS objet_type,
    c.id AS objet_id,
    'chantier_sans_lots'::text AS code,
    'attention'::text AS gravite,
    format('%s : aucun lot ; le planning et les passages ne peuvent pas s''y rattacher.'::text, c.nom) AS message
   FROM btp_chantiers c
  WHERE (c.statut = ANY (ARRAY['preparation'::text, 'ouvert'::text, 'suspendu'::text])) AND NOT (EXISTS ( SELECT 1
           FROM btp_lots l
          WHERE l.client_id = c.client_id AND l.chantier_id = c.id))
UNION ALL
 SELECT c.client_id,
    c.id AS chantier_id,
    'btp_chantiers'::text AS objet_type,
    c.id AS objet_id,
    'chantier_sans_planning'::text AS code,
    'attention'::text AS gravite,
    format('%s : aucun passage planifié ; rien à confirmer à J-2, rien à recaler.'::text, c.nom) AS message
   FROM btp_chantiers c
  WHERE c.statut = 'ouvert'::text AND NOT (EXISTS ( SELECT 1
           FROM btp_passages p
          WHERE p.chantier_id = c.id AND p.statut = 'prevu'::text))
UNION ALL
 SELECT c.client_id,
    c.id AS chantier_id,
    'btp_chantiers'::text AS objet_type,
    c.id AS objet_id,
    'chantier_sans_coordonnees'::text AS code,
    'info'::text AS gravite,
    format('%s : adresse non localisée ; pas de météo, ni de rattachement par la position.'::text, c.nom) AS message
   FROM btp_chantiers c
  WHERE (c.statut = ANY (ARRAY['preparation'::text, 'ouvert'::text, 'suspendu'::text])) AND c.latitude IS NULL
UNION ALL
 SELECT c.client_id,
    c.id AS chantier_id,
    'btp_chantiers'::text AS objet_type,
    c.id AS objet_id,
    'chantier_hors_champ_tva'::text AS code,
    'info'::text AS gravite,
    format('%s : collectivité d''outre-mer, hors du champ de la TVA française ; les montants sont préparés hors taxe.'::text, c.nom) AS message
   FROM btp_chantiers c
  WHERE (c.statut = ANY (ARRAY['preparation'::text, 'ouvert'::text, 'suspendu'::text])) AND c.regime_tva = 'hors_champ'::text
UNION ALL
 SELECT c.client_id,
    c.id AS chantier_id,
    'btp_chantiers'::text AS objet_type,
    c.id AS objet_id,
    'chantier_sans_marche_verifie'::text AS code,
    'attention'::text AS gravite,
    format('%s : aucun marché vérifié ; les avenants et les situations ne peuvent pas être chiffrés.'::text, c.nom) AS message
   FROM btp_chantiers c
  WHERE (c.statut = ANY (ARRAY['ouvert'::text, 'suspendu'::text])) AND NOT (EXISTS ( SELECT 1
           FROM btp_marches m
          WHERE m.client_id = c.client_id AND m.chantier_id = c.id AND m.statut = 'verifie'::text))
UNION ALL
 SELECT m.client_id,
    m.chantier_id,
    'btp_marches'::text AS objet_type,
    m.id AS objet_id,
    'marche_a_verifier'::text AS code,
    'bloquant'::text AS gravite,
    format('Marché %s : à vérifier ligne à ligne avant tout chiffrage.'::text, COALESCE(m.reference, 'sans référence'::text)) AS message
   FROM btp_marches m
  WHERE m.statut = 'a_verifier'::text
UNION ALL
 SELECT l.client_id,
    l.chantier_id,
    'btp_lots'::text AS objet_type,
    l.id AS objet_id,
    'lot_sans_executant'::text AS code,
    'attention'::text AS gravite,
    format('Lot %s %s : l''entreprise qui l''exécute n''est pas désignée.'::text, l.code, l.libelle) AS message
   FROM btp_lots l
     JOIN btp_chantiers c ON c.client_id = l.client_id AND c.id = l.chantier_id
  WHERE (c.statut = ANY (ARRAY['preparation'::text, 'ouvert'::text, 'suspendu'::text])) AND l.statut <> 'termine'::text AND (l.execution <> 'client'::text AND l.tiers_id IS NULL OR l.execution = 'client'::text AND l.equipe_id IS NULL)
UNION ALL
 SELECT l.client_id,
    l.chantier_id,
    'btp_lots'::text AS objet_type,
    l.id AS objet_id,
    'sous_traitant_non_accepte'::text AS code,
    'attention'::text AS gravite,
    format('Lot %s %s : %s n''a pas été accepté par le maître d''ouvrage (loi n° 75-1334, art. 3).'::text, l.code, l.libelle, t.nom) AS message
   FROM btp_lots l
     JOIN btp_chantiers c ON c.client_id = l.client_id AND c.id = l.chantier_id
     JOIN btp_tiers t ON t.client_id = l.client_id AND t.id = l.tiers_id
  WHERE (c.statut = ANY (ARRAY['preparation'::text, 'ouvert'::text, 'suspendu'::text])) AND l.statut <> 'termine'::text AND l.execution = 'sous_traitant'::text AND NOT (EXISTS ( SELECT 1
           FROM btp_acceptations a
          WHERE a.chantier_id = l.chantier_id AND a.tiers_id = l.tiers_id AND a.statut = 'acceptee'::text))
UNION ALL
 SELECT p.client_id,
    p.chantier_id,
    'btp_passages'::text AS objet_type,
    p.id AS objet_id,
    'passage_a_ranger'::text AS code,
    'attention'::text AS gravite,
    format('Passage du %s au %s : « %s » ne désigne personne de l''annuaire, ou plusieurs.'::text, to_char(p.debut::timestamp with time zone, 'DD/MM'::text), to_char(p.fin::timestamp with time zone, 'DD/MM'::text), COALESCE(p.intervenant_lu, p.tache, 'sans nom'::text)) AS message
   FROM btp_passages p
  WHERE p.statut = 'prevu'::text AND p.fin >= CURRENT_DATE AND p.intervenant_type = 'inconnu'::text
UNION ALL
 SELECT p.client_id,
    p.chantier_id,
    'btp_passages'::text AS objet_type,
    p.id AS objet_id,
    'passage_sans_lot'::text AS code,
    'attention'::text AS gravite,
    format('Passage du %s au %s (%s) : rattaché à aucun lot.'::text, to_char(p.debut::timestamp with time zone, 'DD/MM'::text), to_char(p.fin::timestamp with time zone, 'DD/MM'::text), COALESCE(p.tache, p.intervenant_lu, 'sans nom'::text)) AS message
   FROM btp_passages p
  WHERE p.statut = 'prevu'::text AND p.fin >= CURRENT_DATE AND p.lot_id IS NULL
UNION ALL
 SELECT d.client_id,
    d.chantier_id,
    'btp_dependances'::text AS objet_type,
    d.id AS objet_id,
    'dependance_non_respectee'::text AS code,
    'attention'::text AS gravite,
    format('« %s » commence le %s, avant le %s : « %s » finit le %s.'::text, COALESCE(b.tache, 'aval'::text), to_char(b.debut::timestamp with time zone, 'DD/MM'::text), to_char(ajouter_jours(a.fin, d.delai_min_jours + 1, 'ouvres'::text, c.territoire)::timestamp with time zone, 'DD/MM'::text), COALESCE(a.tache, 'amont'::text), to_char(a.fin::timestamp with time zone, 'DD/MM'::text)) AS message
   FROM btp_dependances d
     JOIN btp_passages a ON a.id = d.amont_id
     JOIN btp_passages b ON b.id = d.aval_id
     JOIN btp_chantiers c ON c.id = d.chantier_id
  WHERE a.statut = 'prevu'::text AND b.statut = 'prevu'::text AND b.fin >= CURRENT_DATE AND b.debut < ajouter_jours(a.fin, d.delai_min_jours + 1, 'ouvres'::text, c.territoire)
UNION ALL
 SELECT i.client_id,
    NULL::uuid AS chantier_id,
    'btp_intervenants'::text AS objet_type,
    i.id AS objet_id,
    'intervenant_non_informe'::text AS code,
    'bloquant'::text AS gravite,
    format('%s n''a pas été informé que ses messages sont lus (C. trav. L1222-4) : Daliro ne lit rien de lui.'::text, i.nom) AS message
   FROM btp_intervenants i
  WHERE i.actif AND i.informe_le IS NULL
UNION ALL
 SELECT i.client_id,
    NULL::uuid AS chantier_id,
    'btp_intervenants'::text AS objet_type,
    i.id AS objet_id,
    'chef_sans_telephone'::text AS code,
    'attention'::text AS gravite,
    format('%s, chef d''équipe, n''a pas de numéro : ses messages ne peuvent pas être reconnus.'::text, i.nom) AS message
   FROM btp_intervenants i
  WHERE i.actif AND i.role_terrain = 'chef_equipe'::text AND i.telephone IS NULL
UNION ALL
 SELECT t.client_id,
    NULL::uuid AS chantier_id,
    'btp_tiers'::text AS objet_type,
    t.id AS objet_id,
    'vigilance_'::text || btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le) AS code,
        CASE
            WHEN btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le) = 'a_renouveler'::text THEN 'info'::text
            ELSE 'attention'::text
        END AS gravite,
    format('%s : attestation de vigilance %s (C. trav. D8222-5).'::text, t.nom,
        CASE btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le)
            WHEN 'absente'::text THEN 'absente'::text
            WHEN 'echue'::text THEN 'de plus de six mois'::text
            WHEN 'a_verifier'::text THEN 'non vérifiée auprès de l''Urssaf'::text
            ELSE 'à renouveler dans les quinze jours'::text
        END) AS message
   FROM btp_tiers t
  WHERE t.actif AND (btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le) = ANY (ARRAY['absente'::text, 'echue'::text, 'a_verifier'::text, 'a_renouveler'::text]))
UNION ALL
 SELECT t.client_id,
    NULL::uuid AS chantier_id,
    'btp_tiers'::text AS objet_type,
    t.id AS objet_id,
    'sous_traitant_injoignable'::text AS code,
    'attention'::text AS gravite,
    format('%s : ni téléphone ni courriel ; ses passages ne peuvent pas être confirmés.'::text, t.nom) AS message
   FROM btp_tiers t
  WHERE t.actif AND ('sous_traitant'::text = ANY (t.roles)) AND t.telephone IS NULL AND t.email IS NULL;

-- ═══ VUE public.btp_controle_marches
 SELECT l.client_id,
    l.chantier_id,
    l.marche_id,
    l.id AS ligne_id,
    l.ordre,
    l.controle AS code,
    l.nature <> 'option'::text AND (l.controle = 'incomplet'::text OR l.controle = 'montant_faux'::text AND NOT l.ecart_accepte) AS bloquant,
        CASE l.controle
            WHEN 'incomplet'::text THEN 'Quantité, unité, prix unitaire ou montant manquant.'::text
            WHEN 'montant_faux'::text THEN
            CASE
                WHEN l.ecart_accepte THEN 'Écart accepté : '::text || l.ecart_motif
                ELSE 'Le montant n''est pas quantité × prix unitaire.'::text
            END
            ELSE NULL::text
        END AS message
   FROM btp_lignes_marche l
     JOIN btp_marches m ON m.client_id = l.client_id AND m.id = l.marche_id
  WHERE m.statut = 'a_verifier'::text AND l.controle <> 'ok'::text
UNION ALL
 SELECT l.client_id,
    l.chantier_id,
    l.marche_id,
    l.id AS ligne_id,
    l.ordre,
    'sans_lot'::text AS code,
    true AS bloquant,
    'Ligne rattachée à aucun lot du chantier.'::text AS message
   FROM btp_lignes_marche l
     JOIN btp_marches m ON m.client_id = l.client_id AND m.id = l.marche_id
  WHERE m.statut = 'a_verifier'::text AND l.lot_id IS NULL AND l.nature <> 'option'::text
UNION ALL
 SELECT m.client_id,
    m.chantier_id,
    m.id AS marche_id,
    NULL::uuid AS ligne_id,
    NULL::integer AS ordre,
    'total_different'::text AS code,
    true AS bloquant,
    'Le total des lignes diffère du total du devis de plus d''un euro.'::text AS message
   FROM btp_marches m
  WHERE m.statut = 'a_verifier'::text AND private.btp_total_different(m.id);

-- ═══ VUE public.btp_lignes_marche_chiffrees
 SELECT l.id,
    l.client_id,
    l.chantier_id,
    l.marche_id,
    l.lot_id,
    l.ordre,
    l.numero,
    l.section,
    l.designation,
    l.unite,
    l.quantite,
    l.nature,
    l.controle,
    l.ecart_accepte,
    l.ecart_motif,
    l.corrigee,
    p.prix_unitaire_ht,
    p.montant_ht,
    p.ecart
   FROM btp_lignes_marche l
     LEFT JOIN LATERAL private.btp_prix_ligne_marche(l.id) p(prix_unitaire_ht, montant_ht, ecart) ON true;

-- ═══ VUE public.btp_marches_chiffres
 SELECT m.id,
    m.client_id,
    m.chantier_id,
    m.reference,
    m.objet,
    m.date_signature,
    m.mode_prix,
    m.retenue_taux,
    m.retenue_base,
    m.retenue_caution,
    m.source,
    m.piece_id,
    m.statut,
    m.verifie_par,
    m.verifie_libelle,
    m.verifie_le,
    p.montant_ht_declare,
    p.total_ht_lignes
   FROM btp_marches m
     LEFT JOIN LATERAL private.btp_prix_marche(m.id) p(montant_ht_declare, total_ht_lignes) ON true;


-- ══════════════════ FONCTIONS (public et private, telles quelles) ══════════════════

-- ═══ FONCTION private.btp_accepter_ecart
CREATE OR REPLACE FUNCTION private.btp_accepter_ecart(p_ligne uuid, p_motif text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  l public.btp_lignes_marche;
begin
  select * into l from public.btp_lignes_marche where id = p_ligne for update;
  if not found then
    raise exception 'Ligne introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(l.client_id, l.entite_id);
  if l.controle <> 'montant_faux' then
    raise exception 'Cette ligne n''a pas d''écart à accepter.' using errcode = '22023';
  end if;
  if coalesce(btrim(p_motif), '') = '' then
    raise exception 'Un écart s''accepte avec son motif.' using errcode = '22023';
  end if;
  update public.btp_lignes_marche set ecart_accepte = true, ecart_motif = btrim(p_motif) where id = l.id;
  perform private.journaliser(l.client_id, 'daliro.ecart_accepte', 'btp_lignes_marche', l.id::text,
    jsonb_build_object('marche', l.marche_id, 'motif', btrim(p_motif)), l.entite_id);
end $function$


-- ═══ FONCTION private.btp_chantier_efface
CREATE OR REPLACE FUNCTION private.btp_chantier_efface()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if old.client_id::text = coalesce(current_setting('omega.effacement_client', true), '') then
    return null;
  end if;
  begin
    delete from public.entites e where e.client_id = old.client_id and e.id = old.entite_id;
  exception when foreign_key_violation then
    update public.entites e set nom = 'Chantier effacé' where e.client_id = old.client_id and e.id = old.entite_id;
  end;
  return null;
end $function$


-- ═══ FONCTION private.btp_choisir_intervenant
CREATE OR REPLACE FUNCTION private.btp_choisir_intervenant(p_client uuid, p_nom text, OUT genre text, OUT id uuid, OUT mode text)
 RETURNS record
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_premier record;
  v_second record;
  v_identiques integer;
begin
  if coalesce(btrim(p_nom), '') = '' then
    return;
  end if;
  select count(*) into v_identiques from private.btp_rapprocher(p_client, p_nom) x where x.mode = 'identique';
  if v_identiques = 1 then
    select x.genre, x.id, x.mode into genre, id, mode
    from private.btp_rapprocher(p_client, p_nom) x where x.mode = 'identique';
    return;
  elsif v_identiques > 1 then
    return;
  end if;
  select * into v_premier from private.btp_rapprocher(p_client, p_nom) x limit 1;
  if not found or v_premier.score < 0.6 then
    return;
  end if;
  select * into v_second from private.btp_rapprocher(p_client, p_nom) x offset 1 limit 1;
  if found and v_second.score > v_premier.score - 0.2 then
    return;
  end if;
  genre := v_premier.genre;
  id := v_premier.id;
  mode := 'ressemblance';
end $function$


-- ═══ FONCTION private.btp_cree_cycle
CREATE OR REPLACE FUNCTION private.btp_cree_cycle(p_chantier uuid, p_amont uuid, p_aval uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with recursive suite as (
    select d.aval_id from public.btp_dependances d where d.chantier_id = p_chantier and d.amont_id = p_aval
    union
    select d.aval_id from public.btp_dependances d join suite s on d.amont_id = s.aval_id
    where d.chantier_id = p_chantier
  )
  select p_amont = p_aval or exists (select 1 from suite where aval_id = p_amont)
$function$


-- ═══ FONCTION private.btp_departement
CREATE OR REPLACE FUNCTION private.btp_departement(p_code_postal text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select case
    when private.btp_territoire(p_code_postal) is null then null
    when left(p_code_postal, 2) = '20' then case when p_code_postal < '20200' then '2A' else '2B' end
    when p_code_postal = '97133' then '977'
    when p_code_postal = '97150' then '978'
    when left(p_code_postal, 2) in ('97', '98') then left(p_code_postal, 3)
    else left(p_code_postal, 2)
  end
$function$


-- ═══ FONCTION private.btp_departements_valides
CREATE OR REPLACE FUNCTION private.btp_departements_valides(p text[])
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select coalesce(bool_and(d ~ '^(0[1-9]|1[0-9]|2[1-9]|[3-8][0-9]|9[0-5]|2A|2B|97[1-8]|98[678])$'), true)
  from unnest(p) d
$function$


-- ═══ FONCTION private.btp_ecrire_ligne
CREATE OR REPLACE FUNCTION private.btp_ecrire_ligne(p_ligne uuid, p_marche uuid, p_champs jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  m public.btp_marches;
  l public.btp_lignes_marche;
  v_apres public.btp_lignes_marche;
  v_id uuid;
  v_champs jsonb := coalesce(p_champs, '{}'::jsonb);
  v_modifs jsonb := '{}'::jsonb;
  v_cle text;
begin
  if exists (select 1 from jsonb_object_keys(v_champs) k
             where k not in ('designation', 'unite', 'unite_lue', 'quantite', 'prix_unitaire_ht', 'montant_ht', 'nature',
                             'lot_id', 'numero', 'section', 'ordre')) then
    raise exception 'Champ inconnu pour une ligne.' using errcode = '22023';
  end if;
  if p_ligne is null then
    select * into m from public.btp_marches where id = p_marche;
    if not found then
      raise exception 'Marché introuvable.' using errcode = 'P0002';
    end if;
    perform private.btp_exiger_bureau(m.client_id, m.entite_id);
    insert into public.btp_lignes_marche (client_id, marche_id, lot_id, ordre, numero, section, designation, unite_lue,
                                          unite, quantite, prix_unitaire_ht, montant_ht, nature)
    values (m.client_id, m.id, (v_champs ->> 'lot_id')::uuid,
            coalesce((v_champs ->> 'ordre')::integer,
                     (select coalesce(max(x.ordre), 0) + 1 from public.btp_lignes_marche x
                      where x.client_id = m.client_id and x.marche_id = m.id)),
            v_champs ->> 'numero', v_champs ->> 'section', v_champs ->> 'designation', v_champs ->> 'unite_lue',
            v_champs ->> 'unite', (v_champs ->> 'quantite')::numeric, (v_champs ->> 'prix_unitaire_ht')::numeric,
            (v_champs ->> 'montant_ht')::numeric, coalesce(v_champs ->> 'nature', 'ouvrage'))
    returning id into v_id;
    return v_id;
  end if;
  select * into l from public.btp_lignes_marche where id = p_ligne for update;
  if not found then
    raise exception 'Ligne introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(l.client_id, l.entite_id);
  update public.btp_lignes_marche set
    designation = case when v_champs ? 'designation' then v_champs ->> 'designation' else designation end,
    unite_lue = case when v_champs ? 'unite_lue' then v_champs ->> 'unite_lue' else unite_lue end,
    unite = case when v_champs ? 'unite' then v_champs ->> 'unite' else unite end,
    quantite = case when v_champs ? 'quantite' then (v_champs ->> 'quantite')::numeric else quantite end,
    prix_unitaire_ht = case when v_champs ? 'prix_unitaire_ht' then (v_champs ->> 'prix_unitaire_ht')::numeric
                            else prix_unitaire_ht end,
    montant_ht = case when v_champs ? 'montant_ht' then (v_champs ->> 'montant_ht')::numeric else montant_ht end,
    nature = case when v_champs ? 'nature' then v_champs ->> 'nature' else nature end,
    lot_id = case when v_champs ? 'lot_id' then (v_champs ->> 'lot_id')::uuid else lot_id end,
    numero = case when v_champs ? 'numero' then v_champs ->> 'numero' else numero end,
    section = case when v_champs ? 'section' then v_champs ->> 'section' else section end,
    ordre = case when v_champs ? 'ordre' then (v_champs ->> 'ordre')::integer else ordre end
  where id = l.id
  returning * into v_apres;
  for v_cle in select k from jsonb_object_keys(v_champs) k loop
    if (to_jsonb(l) -> v_cle) is distinct from (to_jsonb(v_apres) -> v_cle) then
      v_modifs := v_modifs || jsonb_build_object(v_cle,
        case when v_cle in ('prix_unitaire_ht', 'montant_ht') then to_jsonb('modifié'::text)
             else jsonb_build_array(to_jsonb(l) -> v_cle, to_jsonb(v_apres) -> v_cle) end);
    end if;
  end loop;
  if v_modifs <> '{}'::jsonb then
    perform private.journaliser(l.client_id, 'daliro.ligne_corrigee', 'btp_lignes_marche', l.id::text,
      jsonb_build_object('marche', l.marche_id, 'modifications', v_modifs), l.entite_id);
  end if;
  return l.id;
end $function$


-- ═══ FONCTION private.btp_ecrire_marche
CREATE OR REPLACE FUNCTION private.btp_ecrire_marche(p_marche uuid, p_chantier uuid, p_champs jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_c record;
  m public.btp_marches;
  v_id uuid;
  v_champs jsonb := coalesce(p_champs, '{}'::jsonb);
begin
  if exists (select 1 from jsonb_object_keys(v_champs) k
             where k not in ('reference', 'objet', 'date_signature', 'mode_prix', 'montant_ht_declare', 'retenue_taux',
                             'retenue_base', 'retenue_caution', 'source', 'piece_id')) then
    raise exception 'Champ inconnu pour un marché.' using errcode = '22023';
  end if;
  if p_marche is null then
    select c.client_id, c.id, c.entite_id into v_c from public.btp_chantiers c where c.id = p_chantier;
    if not found then
      raise exception 'Chantier introuvable.' using errcode = 'P0002';
    end if;
    perform private.btp_exiger_bureau(v_c.client_id, v_c.entite_id);
    insert into public.btp_marches (client_id, chantier_id, reference, objet, date_signature, mode_prix,
                                    montant_ht_declare, retenue_taux, retenue_base, retenue_caution, source, piece_id)
    values (v_c.client_id, v_c.id, v_champs ->> 'reference', v_champs ->> 'objet', (v_champs ->> 'date_signature')::date,
            v_champs ->> 'mode_prix', (v_champs ->> 'montant_ht_declare')::numeric,
            coalesce((v_champs ->> 'retenue_taux')::numeric, 0), coalesce(v_champs ->> 'retenue_base', 'ttc'),
            coalesce((v_champs ->> 'retenue_caution')::boolean, false), coalesce(v_champs ->> 'source', 'saisie'),
            (v_champs ->> 'piece_id')::uuid)
    returning id into v_id;
    return v_id;
  end if;
  select * into m from public.btp_marches where id = p_marche for update;
  if not found then
    raise exception 'Marché introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(m.client_id, m.entite_id);
  if v_champs ? 'source' then
    raise exception 'La source d''un marché ne change pas.' using errcode = '22023';
  end if;
  update public.btp_marches set
    reference = case when v_champs ? 'reference' then v_champs ->> 'reference' else reference end,
    objet = case when v_champs ? 'objet' then v_champs ->> 'objet' else objet end,
    date_signature = case when v_champs ? 'date_signature' then (v_champs ->> 'date_signature')::date else date_signature end,
    mode_prix = case when v_champs ? 'mode_prix' then v_champs ->> 'mode_prix' else mode_prix end,
    montant_ht_declare = case when v_champs ? 'montant_ht_declare' then (v_champs ->> 'montant_ht_declare')::numeric
                              else montant_ht_declare end,
    retenue_taux = case when v_champs ? 'retenue_taux' then (v_champs ->> 'retenue_taux')::numeric else retenue_taux end,
    retenue_base = case when v_champs ? 'retenue_base' then v_champs ->> 'retenue_base' else retenue_base end,
    retenue_caution = case when v_champs ? 'retenue_caution' then (v_champs ->> 'retenue_caution')::boolean
                           else retenue_caution end,
    piece_id = case when v_champs ? 'piece_id' then (v_champs ->> 'piece_id')::uuid else piece_id end
  where id = m.id;
  return m.id;
end $function$


-- ═══ FONCTION private.btp_en_effacement
CREATE OR REPLACE FUNCTION private.btp_en_effacement(p_client uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(current_setting('omega.effacement_objet', true), '') = 'oui'
      or coalesce(current_setting('omega.effacement_client', true), '') = p_client::text
$function$


-- ═══ FONCTION private.btp_est_serveur
CREATE OR REPLACE FUNCTION private.btp_est_serveur()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select (select auth.uid()) is null
     and coalesce(nullif(current_setting('role', true), 'none'), session_user::text) in ('service_role', 'postgres')
$function$


-- ═══ FONCTION private.btp_exiger_bureau
CREATE OR REPLACE FUNCTION private.btp_exiger_bureau(p_client uuid, p_entite uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_role text := coalesce(nullif(current_setting('role', true), 'none'), session_user::text);
begin
  if (select auth.uid()) is null then
    if v_role not in ('service_role', 'postgres') then
      raise exception 'Réservé au bureau du client ou au serveur d''Omega.' using errcode = '42501';
    end if;
    return;
  end if;
  if not private.a_un_role(p_client, array['gerant', 'admin', 'valideur'])
     or not private.voit_entite(p_client, p_entite) then
    raise exception 'Ce marché ne vous est pas ouvert.' using errcode = '42501';
  end if;
  if not private.btp_voit_prix(p_client) then
    raise exception 'Il faut le droit de voir les prix pour tenir un marché.' using errcode = '42501';
  end if;
end $function$


-- ═══ FONCTION private.btp_exiger_planning
CREATE OR REPLACE FUNCTION private.btp_exiger_planning(p_client uuid, p_entite uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if private.btp_est_serveur() then
    return;
  end if;
  if (select auth.uid()) is null
     or not private.a_un_role(p_client, array['gerant', 'admin', 'valideur'])
     or not private.voit_entite(p_client, p_entite) then
    raise exception 'Le planning de ce chantier ne vous est pas ouvert.' using errcode = '42501';
  end if;
end $function$


-- ═══ FONCTION private.btp_exiger_role_tiers
CREATE OR REPLACE FUNCTION private.btp_exiger_role_tiers(p_client uuid, p_tiers uuid, p_role text, p_quoi text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_tiers is not null and not exists (
    select 1 from public.btp_tiers t where t.client_id = p_client and t.id = p_tiers and p_role = any (t.roles)) then
    raise exception '% doit être un tiers de l''annuaire qui a le rôle « % ».', p_quoi, p_role using errcode = '23514';
  end if;
end $function$


-- ═══ FONCTION private.btp_exiger_valideur_prix
CREATE OR REPLACE FUNCTION private.btp_exiger_valideur_prix(p_client uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_role text := coalesce(nullif(current_setting('role', true), 'none'), session_user::text);
begin
  if (select auth.uid()) is null then
    if v_role not in ('service_role', 'postgres') then
      raise exception 'Réservé à qui valide les prix.' using errcode = '42501';
    end if;
  elsif not private.a_le_droit(p_client, 'daliro.valider_prix') then
    raise exception 'Il faut le droit de valider les prix.' using errcode = '42501';
  end if;
end $function$


-- ═══ FONCTION private.btp_importer_passages
CREATE OR REPLACE FUNCTION private.btp_importer_passages(p_chantier uuid, p_source text, p_lignes jsonb, p_complet boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid;
  v_entite uuid;
  l jsonb;
  v_ref text;
  v_lot uuid;
  v_choix record;
  v_equipe uuid;
  v_tiers uuid;
  v_rapprochement text;
  v_id uuid;
  v_version_avant integer;
  v_version_apres integer;
  v_refs text[] := '{}';
  v_crees integer := 0;
  v_mis_a_jour integer := 0;
  v_inchanges integer := 0;
  v_annules integer := 0;
  v_a_ranger integer := 0;
  v_sans_lot integer := 0;
begin
  if p_source not in ('tableur', 'alobees', 'api') then
    raise exception 'Source d''import inconnue : %.', coalesce(p_source, 'vide') using errcode = '22023';
  end if;
  if jsonb_typeof(p_lignes) <> 'array' then
    raise exception 'Les lignes du planning forment un tableau.' using errcode = '22023';
  end if;
  select c.client_id, c.entite_id into v_client, v_entite from public.btp_chantiers c where c.id = p_chantier;
  if v_client is null then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_planning(v_client, v_entite);

  for l in select * from jsonb_array_elements(p_lignes) loop
    v_ref := nullif(btrim(l ->> 'ref'), '');
    if v_ref is null then
      raise exception 'Chaque ligne du planning porte une ref, celle de la source.' using errcode = '22023';
    end if;
    v_refs := v_refs || v_ref;
    select lo.id into v_lot from public.btp_lots lo
    where lo.chantier_id = p_chantier and lo.code = btrim(l ->> 'lot');
    if v_lot is null then
      v_sans_lot := v_sans_lot + 1;
    end if;
    v_equipe := (l ->> 'equipe_id')::uuid;
    v_tiers := (l ->> 'tiers_id')::uuid;
    v_rapprochement := case when v_equipe is not null or v_tiers is not null then 'manuel' end;
    if v_equipe is null and v_tiers is null and nullif(btrim(l ->> 'intervenant'), '') is not null then
      select * into v_choix from private.btp_choisir_intervenant(v_client, l ->> 'intervenant');
      if v_choix.genre = 'equipe' then v_equipe := v_choix.id; end if;
      if v_choix.genre = 'tiers' then v_tiers := v_choix.id; end if;
      v_rapprochement := v_choix.mode;
    end if;
    if v_equipe is null and v_tiers is null then
      v_a_ranger := v_a_ranger + 1;
    end if;

    select p.id, p.version into v_id, v_version_avant from public.btp_passages p
    where p.client_id = v_client and p.source = p_source and p.source_ref = v_ref;
    if v_id is null then
      insert into public.btp_passages (client_id, chantier_id, lot_id, equipe_id, tiers_id, intervenant_lu, rapprochement,
                                       tache, debut, fin, exterieur, source, source_ref)
      values (v_client, p_chantier, v_lot, v_equipe, v_tiers, l ->> 'intervenant', v_rapprochement,
              l ->> 'tache', (l ->> 'debut')::date, (l ->> 'fin')::date, (l ->> 'exterieur')::boolean, p_source, v_ref);
      v_crees := v_crees + 1;
    else
      update public.btp_passages p
      set lot_id = coalesce(v_lot, p.lot_id),
          equipe_id = coalesce(v_equipe, case when v_tiers is null then p.equipe_id end),
          tiers_id = coalesce(v_tiers, case when v_equipe is null then p.tiers_id end),
          intervenant_lu = coalesce(l ->> 'intervenant', p.intervenant_lu),
          rapprochement = coalesce(v_rapprochement, p.rapprochement),
          tache = coalesce(l ->> 'tache', p.tache),
          debut = (l ->> 'debut')::date, fin = (l ->> 'fin')::date,
          exterieur = coalesce((l ->> 'exterieur')::boolean, p.exterieur),
          statut = case when p.statut = 'annule' then 'prevu' else p.statut end
      where p.id = v_id
      returning p.version into v_version_apres;
      if v_version_apres > v_version_avant then
        v_mis_a_jour := v_mis_a_jour + 1;
      else
        v_inchanges := v_inchanges + 1;
      end if;
    end if;
  end loop;

  if p_complet then
    update public.btp_passages p set statut = 'annule'
    where p.client_id = v_client and p.chantier_id = p_chantier and p.source = p_source
      and p.source_ref is not null and not (p.source_ref = any (v_refs))
      and p.statut = 'prevu' and p.fin >= current_date;
    get diagnostics v_annules = row_count;
  end if;

  perform private.journaliser(v_client, 'daliro.planning_releve', 'btp_chantiers', p_chantier::text,
    jsonb_build_object('source', p_source, 'lignes', jsonb_array_length(p_lignes), 'crees', v_crees,
                       'mis_a_jour', v_mis_a_jour, 'inchanges', v_inchanges, 'annules', v_annules,
                       'a_ranger', v_a_ranger, 'sans_lot', v_sans_lot), v_entite);
  if v_crees + v_mis_a_jour + v_annules > 0 then
    perform private.publier_evenement(v_client, 'daliro.planning_releve',
      jsonb_build_object('chantier', p_chantier, 'source', p_source, 'crees', v_crees, 'mis_a_jour', v_mis_a_jour,
                         'annules', v_annules),
      'planning:' || p_chantier::text || ':' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS'));
  end if;
  return jsonb_build_object('crees', v_crees, 'mis_a_jour', v_mis_a_jour, 'inchanges', v_inchanges,
                            'annules', v_annules, 'a_ranger', v_a_ranger, 'sans_lot', v_sans_lot);
end $function$


-- ═══ FONCTION private.btp_installer
CREATE OR REPLACE FUNCTION private.btp_installer(p_client uuid, p_formule text, p_quota_chantiers integer DEFAULT NULL::integer, p_quota_comptes integer DEFAULT NULL::integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.clients where id = p_client) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  insert into public.btp_reglages (client_id, formule, quota_chantiers, quota_comptes_bureau)
  values (p_client, p_formule, p_quota_chantiers, p_quota_comptes)
  on conflict (client_id) do update
    set formule = excluded.formule,
        quota_chantiers = excluded.quota_chantiers,
        quota_comptes_bureau = excluded.quota_comptes_bureau
  returning id into v_id;
  return v_id;
end $function$


-- ═══ FONCTION private.btp_iso_chantier
CREATE OR REPLACE FUNCTION private.btp_iso_chantier(p_code_postal text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select case
    when private.btp_territoire(p_code_postal) in ('metropole', 'alsace-moselle')
      then 'FR-' || private.btp_departement(p_code_postal)
    else (select t.iso[1] from public.territoires t where t.code = private.btp_territoire(p_code_postal))
  end
$function$


-- ═══ FONCTION private.btp_luhn
CREATE OR REPLACE FUNCTION private.btp_luhn(p text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select coalesce(p ~ '^[0-9]+$', false) and (
    select sum(case when (length(p) - i) % 2 = 1
                    then case when d * 2 > 9 then d * 2 - 9 else d * 2 end
                    else d end) % 10 = 0
    from (select i, substr(p, i, 1)::int as d from generate_series(1, length(p)) as i) x)
$function$


-- ═══ FONCTION private.btp_mots
CREATE OR REPLACE FUNCTION private.btp_mots(p text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select coalesce(array_agg(distinct m order by m), '{}')
  from (select case when length(m) > 3 then regexp_replace(m, 's$', '') else m end as m
        from unnest(string_to_array(coalesce(private.btp_normaliser(p), ''), ' ')) m) x
  where m <> '' and m not in ('sarl', 'sas', 'sasu', 'eurl', 'sa', 'snc', 'sci', 'ei', 'ets', 'etablissement',
                              'entreprise', 'societe', 'ste', 'cie', 'compagnie', 'groupe', 'et', 'fil', 'frere',
                              'le', 'la', 'les', 'de', 'du', 'des', 'l', 'd', 'equipe')
$function$


-- ═══ FONCTION private.btp_normaliser
CREATE OR REPLACE FUNCTION private.btp_normaliser(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select nullif(btrim(regexp_replace(
    translate(
      replace(replace(replace(replace(lower(p), 'œ', 'oe'), 'Œ', 'oe'), 'æ', 'ae'), 'Æ', 'ae'),
      'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸ',
      'aaaaaaceeeeiiiinooooouuuuyyaaaaaaceeeeiiiinooooouuuuyy'),
    '[^a-z0-9]+', ' ', 'g')), '')
$function$


-- ═══ FONCTION private.btp_poser_prix
CREATE OR REPLACE FUNCTION private.btp_poser_prix(p_client uuid, p_designation text, p_unite text, p_prix_unitaire numeric, p_corps_etat text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
begin
  perform private.btp_exiger_valideur_prix(p_client);
  insert into public.btp_bibliotheque_prix (client_id, designation, unite, prix_unitaire_ht, corps_etat, origine)
  values (p_client, p_designation, coalesce(private.btp_unite(p_unite), p_unite), p_prix_unitaire, p_corps_etat, 'saisie')
  returning id into v_id;
  perform private.btp_valider_prix(v_id, null);
  return v_id;
end $function$


-- ═══ FONCTION private.btp_preparer_acceptation
CREATE OR REPLACE FUNCTION private.btp_preparer_acceptation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_entite uuid;
  v_nature text;
begin
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.client_id := old.client_id;
    new.chantier_id := old.chantier_id;
    new.tiers_id := old.tiers_id;
    new.cree_le := old.cree_le;
  end if;
  select c.entite_id, c.nature_marche into v_entite, v_nature from public.btp_chantiers c
  where c.client_id = new.client_id and c.id = new.chantier_id;
  if v_entite is null then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  new.entite_id := v_entite;
  perform private.btp_exiger_role_tiers(new.client_id, new.tiers_id, 'sous_traitant', 'Le sous-traitant à faire accepter');
  if new.paiement_direct is null then
    new.paiement_direct := (v_nature = 'public');
  end if;
  if tg_op = 'UPDATE' and new.statut is distinct from old.statut and not (
       (old.statut = 'a_demander' and new.statut in ('demandee', 'acceptee', 'refusee'))
    or (old.statut = 'demandee' and new.statut in ('acceptee', 'refusee', 'a_demander'))
    or (old.statut = 'acceptee' and new.statut = 'caduque')
    or (old.statut in ('refusee', 'caduque') and new.statut = 'a_demander')) then
    raise exception 'Passage refusé : % vers %.', old.statut, new.statut using errcode = '23514';
  end if;
  if new.statut <> 'a_demander' then
    new.demandee_le := coalesce(new.demandee_le, current_date);
  end if;
  if new.statut in ('acceptee', 'refusee', 'caduque') then
    new.decidee_le := coalesce(new.decidee_le, current_date);
  elsif new.statut = 'a_demander' then
    new.decidee_le := null;
    new.demandee_le := null;
  end if;
  if new.statut = 'acceptee' and v_nature = 'public' and new.mode <> 'acte_special' then
    raise exception 'En marché public, un sous-traitant est accepté par un acte spécial (DC4).' using errcode = '23514';
  end if;
  new.maj_le := now();
  return new;
end $function$


-- ═══ FONCTION private.btp_preparer_chantier
CREATE OR REPLACE FUNCTION private.btp_preparer_chantier()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_territoire text;
  v_fuseau text;
  v_principale uuid;
  v_formule record;
  v_ouverts integer;
  v_statut_avant text;
  v_coordonnees_posees boolean;
  v_voient uuid[];
begin
  new.nom := btrim(new.nom);
  new.commune := btrim(new.commune);
  new.alias := array(select distinct btrim(a) from unnest(coalesce(new.alias, '{}')) a where btrim(a) <> '' order by 1);

  v_territoire := private.btp_territoire(new.code_postal);
  if v_territoire is null then
    raise exception 'Le code postal % n''est pas couvert par Daliro (métropole, Corse et outre-mer seulement).',
      new.code_postal using errcode = '22023';
  end if;
  select t.fuseau into v_fuseau from public.territoires t where t.code = v_territoire;
  if v_fuseau is null then
    raise exception 'Le territoire « % » manque à la brique des délais : ses jours fériés ne sont pas connus.',
      v_territoire using errcode = '22023';
  end if;
  new.territoire := v_territoire;
  new.departement := private.btp_departement(new.code_postal);
  new.zone_tva := private.btp_zone_tva(new.code_postal);
  new.regime_tva := private.btp_regime_tva(new.zone_tva, new.place_client);

  perform private.btp_exiger_role_tiers(new.client_id, new.maitre_ouvrage_id, 'maitre_ouvrage', 'Le maître d''ouvrage');
  perform private.btp_exiger_role_tiers(new.client_id, new.maitre_oeuvre_id, 'maitre_oeuvre', 'Le maître d''œuvre');
  perform private.btp_exiger_role_tiers(new.client_id, new.donneur_ordre_id, 'entreprise_principale', 'Le donneur d''ordre');

  if tg_op = 'INSERT' then
    if new.statut not in ('preparation', 'ouvert') then
      raise exception 'Un chantier naît en préparation ou ouvert.' using errcode = '23514';
    end if;
    v_statut_avant := null;
    v_coordonnees_posees := new.latitude is not null;
    new.cree_le := now();
    new.ouvert_le := null;
    new.clos_le := null;
    -- L'entité « site » du socle : périmètres, seuils et journal par chantier.
    select e.id into v_principale from public.entites e where e.client_id = new.client_id and e.principale;
    insert into public.entites (client_id, parent_id, nom, type, fuseau, territoire)
    values (new.client_id, v_principale, left(new.nom, 200), 'site', v_fuseau, private.btp_iso_chantier(new.code_postal))
    returning id into new.entite_id;
    v_voient := array[v_uid, new.conducteur_id];
  else
    new.id := old.id;
    new.client_id := old.client_id;
    new.entite_id := old.entite_id;
    new.cree_le := old.cree_le;
    new.ouvert_le := old.ouvert_le;
    new.clos_le := old.clos_le;
    v_statut_avant := old.statut;
    v_coordonnees_posees := (new.latitude, new.longitude) is distinct from (old.latitude, old.longitude)
                            and new.latitude is not null;
    -- Une adresse qui change rend les coordonnées caduques, sauf si on les pose en même temps.
    if (new.adresse, new.code_postal, new.commune) is distinct from (old.adresse, old.code_postal, old.commune)
       and (new.latitude, new.longitude) is not distinct from (old.latitude, old.longitude) then
      new.latitude := null;
      new.longitude := null;
    end if;
    if new.statut is distinct from old.statut and not (
         (old.statut = 'preparation' and new.statut in ('ouvert', 'annule'))
      or (old.statut = 'ouvert' and new.statut in ('suspendu', 'receptionne', 'annule'))
      or (old.statut = 'suspendu' and new.statut in ('ouvert', 'receptionne', 'annule'))
      or (old.statut = 'receptionne' and new.statut in ('clos'))) then
      raise exception 'Passage de statut refusé : % vers %.', old.statut, new.statut using errcode = '23514';
    end if;
    -- L'entité suit le nom et le territoire du chantier.
    if (new.nom, new.code_postal) is distinct from (old.nom, old.code_postal) then
      update public.entites e
      set nom = left(new.nom, 200), fuseau = v_fuseau, territoire = private.btp_iso_chantier(new.code_postal)
      where e.client_id = new.client_id and e.id = new.entite_id;
    end if;
    v_voient := case when new.conducteur_id is distinct from old.conducteur_id then array[new.conducteur_id]
                     else '{}'::uuid[] end;
  end if;

  -- Des coordonnées posées par une personne sont une saisie.
  if v_coordonnees_posees and v_uid is not null then
    new.geocode_source := 'saisie';
    new.geocode_score := null;
  end if;
  if new.latitude is null then
    new.geocode_source := null;
    new.geocode_score := null;
  end if;

  if new.statut in ('ouvert', 'suspendu') and coalesce(v_statut_avant, 'preparation') not in ('ouvert', 'suspendu') then
    -- Sans la situation contractuelle, M2 et M6 ne sauraient pas qui signe.
    if new.place_client in ('titulaire', 'cotraitant') and new.maitre_ouvrage_id is null then
      raise exception 'Pour ouvrir ce chantier, désignez son maître d''ouvrage dans l''annuaire.' using errcode = '23514';
    end if;
    if new.place_client = 'sous_traitant' and new.donneur_ordre_id is null then
      raise exception 'Pour ouvrir ce chantier, désignez l''entreprise principale qui vous sous-traite.' using errcode = '23514';
    end if;
    -- Le quota de la formule, compté sous verrou : deux ouvertures simultanées ne le dépassent pas.
    perform pg_advisory_xact_lock(hashtextextended('daliro.quota:' || new.client_id::text, 0));
    select r.formule, r.quota_chantiers into v_formule from public.btp_reglages r where r.client_id = new.client_id;
    if not found then
      raise exception 'Daliro n''est pas installé pour cette organisation : aucun chantier ne peut s''ouvrir.'
        using errcode = 'P0001';
    end if;
    select count(*) into v_ouverts from public.btp_chantiers c
    where c.client_id = new.client_id and c.statut in ('ouvert', 'suspendu') and c.id <> new.id;
    if v_ouverts + 1 > v_formule.quota_chantiers then
      raise exception 'Quota atteint : la formule suit % chantiers ouverts à la fois. Fermez-en un ou changez de formule.',
        v_formule.quota_chantiers using errcode = 'P0001';
    end if;
    new.ouvert_le := coalesce(new.ouvert_le, now());
  end if;
  if new.statut in ('clos', 'annule') and v_statut_avant is distinct from new.statut then
    new.clos_le := now();
  end if;

  -- Celui qui crée le chantier, et son conducteur, le voient : périmètre du
  -- socle, posé avant l'écriture pour qu'un « insert … returning » le lise.
  insert into public.comptes_entites (client_id, user_id, entite_id)
  select new.client_id, c.user_id, new.entite_id
  from public.comptes c
  where c.client_id = new.client_id and not c.perimetre_total and c.user_id = any (v_voient)
  on conflict do nothing;

  new.maj_le := now();
  return new;
end $function$


-- ═══ FONCTION private.btp_preparer_dependance
CREATE OR REPLACE FUNCTION private.btp_preparer_dependance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client_amont uuid;
  v_chantier_amont uuid;
  v_client_aval uuid;
  v_chantier_aval uuid;
begin
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.client_id := old.client_id;
    new.chantier_id := old.chantier_id;
    new.amont_id := old.amont_id;
    new.aval_id := old.aval_id;
    new.cree_le := old.cree_le;
    new.maj_le := now();
    return new;
  end if;
  select p.client_id, p.chantier_id into v_client_amont, v_chantier_amont from public.btp_passages p where p.id = new.amont_id;
  select p.client_id, p.chantier_id into v_client_aval, v_chantier_aval from public.btp_passages p where p.id = new.aval_id;
  if v_chantier_amont is null or v_chantier_aval is null then
    raise exception 'Passage introuvable.' using errcode = 'P0002';
  end if;
  if v_chantier_amont <> v_chantier_aval or v_client_amont <> new.client_id then
    raise exception 'Une dépendance relie deux passages du même chantier.' using errcode = '23514';
  end if;
  new.chantier_id := v_chantier_amont;
  perform pg_advisory_xact_lock(hashtextextended('daliro.dependances:' || new.chantier_id::text, 0));
  if private.btp_cree_cycle(new.chantier_id, new.amont_id, new.aval_id) then
    raise exception 'Dépendance refusée : elle fermerait une boucle dans le planning.' using errcode = '23514';
  end if;
  new.maj_le := now();
  return new;
end $function$


-- ═══ FONCTION private.btp_preparer_ligne_marche
CREATE OR REPLACE FUNCTION private.btp_preparer_ligne_marche()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_m record;
begin
  if tg_op = 'DELETE' then
    select m.statut into v_m from public.btp_marches m where m.client_id = old.client_id and m.id = old.marche_id;
    if found and v_m.statut = 'verifie' and not private.btp_en_effacement(old.client_id) then
      raise exception 'Un marché vérifié est figé : ses lignes ne changent plus.' using errcode = '42501';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.client_id := old.client_id;
    new.marche_id := old.marche_id;
    new.lu := old.lu;
    new.cree_le := old.cree_le;
  end if;
  select m.chantier_id, m.entite_id, m.statut into v_m from public.btp_marches m
  where m.client_id = new.client_id and m.id = new.marche_id;
  if not found then
    raise exception 'Marché introuvable.' using errcode = 'P0002';
  end if;
  if v_m.statut <> 'a_verifier' then
    raise exception 'Un marché vérifié est figé : ses lignes ne changent plus.' using errcode = '42501';
  end if;
  new.chantier_id := v_m.chantier_id;
  new.entite_id := v_m.entite_id;
  new.designation := btrim(new.designation);
  if tg_op = 'INSERT' then
    new.unite := coalesce(new.unite, private.btp_unite(new.unite_lue));
    new.lu := jsonb_build_object('designation', new.designation, 'unite', coalesce(new.unite_lue, new.unite),
                                 'quantite', new.quantite, 'prix_unitaire_ht', new.prix_unitaire_ht,
                                 'montant_ht', new.montant_ht, 'nature', new.nature);
    new.corrigee := false;
  else
    if new.unite_lue is distinct from old.unite_lue and new.unite is not distinct from old.unite then
      new.unite := private.btp_unite(new.unite_lue);
    end if;
    if (new.designation, new.unite, new.quantite, new.prix_unitaire_ht, new.montant_ht, new.nature)
       is distinct from (old.designation, old.unite, old.quantite, old.prix_unitaire_ht, old.montant_ht, old.nature) then
      new.corrigee := true;
      -- Un écart accepté l'était pour d'autres chiffres.
      if (new.quantite, new.prix_unitaire_ht, new.montant_ht) is distinct from (old.quantite, old.prix_unitaire_ht, old.montant_ht)
         and new.ecart_accepte is not distinct from old.ecart_accepte then
        new.ecart_accepte := false;
      end if;
    end if;
  end if;
  if not new.ecart_accepte then
    new.ecart_motif := null;
  end if;
  new.maj_le := now();
  return new;
end $function$


-- ═══ FONCTION private.btp_preparer_lot
CREATE OR REPLACE FUNCTION private.btp_preparer_lot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.client_id := old.client_id;
    new.chantier_id := old.chantier_id;
    new.cree_le := old.cree_le;
  end if;
  -- L'entité est celle du chantier, jamais celle que l'appelant donnerait.
  select c.entite_id into new.entite_id from public.btp_chantiers c
  where c.client_id = new.client_id and c.id = new.chantier_id;
  if new.entite_id is null then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  new.code := btrim(new.code);
  new.libelle := btrim(new.libelle);
  if new.execution = 'sous_traitant' then
    perform private.btp_exiger_role_tiers(new.client_id, new.tiers_id, 'sous_traitant', 'Le sous-traitant du lot');
  elsif new.execution = 'autre_titulaire' then
    perform private.btp_exiger_role_tiers(new.client_id, new.tiers_id, 'autre_titulaire', 'Le titulaire de l''autre lot');
  end if;
  new.maj_le := now();
  return new;
end $function$


-- ═══ FONCTION private.btp_preparer_marche
CREATE OR REPLACE FUNCTION private.btp_preparer_marche()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_porte text := coalesce(current_setting('daliro.porte', true), '');
begin
  if tg_op = 'DELETE' then
    if old.statut = 'verifie' and not private.btp_en_effacement(old.client_id) then
      raise exception 'Un marché vérifié ne s''efface pas.' using errcode = '42501';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.client_id := old.client_id;
    new.chantier_id := old.chantier_id;
    new.source := old.source;
    new.cree_le := old.cree_le;
  end if;
  select c.entite_id into new.entite_id from public.btp_chantiers c
  where c.client_id = new.client_id and c.id = new.chantier_id;
  if new.entite_id is null then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  if tg_op = 'INSERT' then
    new.statut := 'a_verifier';
    new.verifie_par := null;
    new.verifie_libelle := null;
    new.verifie_le := null;
  elsif new.statut is distinct from old.statut then
    if not ((old.statut = 'a_verifier' and new.statut = 'verifie' and v_porte = 'verifier')
         or (old.statut = 'verifie' and new.statut = 'a_verifier' and v_porte = 'rouvrir')) then
      raise exception 'Un marché ne se vérifie et ne se rouvre que par ses portes.' using errcode = '42501';
    end if;
    if new.statut = 'a_verifier' then
      new.verifie_par := null;
      new.verifie_libelle := null;
      new.verifie_le := null;
    end if;
  elsif old.statut = 'verifie'
        and (new.reference, new.objet, new.date_signature, new.mode_prix, new.montant_ht_declare,
             new.retenue_taux, new.retenue_base, new.piece_id, new.verifie_par, new.verifie_libelle, new.verifie_le)
            is distinct from
            (old.reference, old.objet, old.date_signature, old.mode_prix, old.montant_ht_declare,
             old.retenue_taux, old.retenue_base, old.piece_id, old.verifie_par, old.verifie_libelle, old.verifie_le) then
    raise exception 'Un marché vérifié est figé : rouvrez-le pour le corriger.' using errcode = '42501';
  end if;
  new.maj_le := now();
  return new;
end $function$


-- ═══ FONCTION private.btp_preparer_passage
CREATE OR REPLACE FUNCTION private.btp_preparer_passage()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_entite uuid;
  v_lot_tiers uuid;
  v_lot_equipe uuid;
  v_lot_exterieur boolean := false;
begin
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.client_id := old.client_id;
    new.chantier_id := old.chantier_id;
    new.source := old.source;
    new.cree_le := old.cree_le;
  end if;
  select c.entite_id into v_entite from public.btp_chantiers c
  where c.client_id = new.client_id and c.id = new.chantier_id;
  if v_entite is null then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  new.entite_id := v_entite;
  new.tache := nullif(btrim(new.tache), '');
  new.intervenant_lu := nullif(btrim(new.intervenant_lu), '');
  new.source_ref := nullif(btrim(new.source_ref), '');

  if new.lot_id is not null then
    select l.tiers_id, l.equipe_id, l.exterieur or coalesce(ce.exterieur, false)
    into v_lot_tiers, v_lot_equipe, v_lot_exterieur
    from public.btp_lots l left join public.btp_corps_etat ce on ce.code = l.corps_etat
    where l.chantier_id = new.chantier_id and l.id = new.lot_id;
    -- Sans intervenant ni nom lu, le passage revient à qui exécute le lot.
    if tg_op = 'INSERT' and new.equipe_id is null and new.tiers_id is null and new.intervenant_lu is null then
      new.tiers_id := v_lot_tiers;
      new.equipe_id := v_lot_equipe;
    end if;
  end if;
  if new.exterieur is null then
    new.exterieur := coalesce(v_lot_exterieur, false);
  end if;
  new.intervenant_type := case when new.equipe_id is not null then 'equipe'
                               when new.tiers_id is not null then 'tiers' else 'inconnu' end;
  if new.intervenant_type = 'inconnu' then
    new.rapprochement := null;
  elsif new.rapprochement is null then
    new.rapprochement := 'manuel';
  end if;

  if tg_op = 'INSERT' then
    new.version := 1;
    new.confirmation_le := case when new.confirmation = 'non_demandee' then null
                                else coalesce(new.confirmation_le, now()) end;
  else
    new.version := old.version;
    if (new.debut, new.fin, new.lot_id, new.equipe_id, new.tiers_id, new.tache, new.statut)
       is distinct from (old.debut, old.fin, old.lot_id, old.equipe_id, old.tiers_id, old.tache, old.statut) then
      new.version := old.version + 1;
    end if;
    -- Un passage déplacé, ou confié à quelqu'un d'autre, se reconfirme.
    if (new.debut, new.fin, new.equipe_id, new.tiers_id) is distinct from (old.debut, old.fin, old.equipe_id, old.tiers_id)
       and new.confirmation is not distinct from old.confirmation and old.confirmation <> 'non_demandee' then
      new.confirmation := 'non_demandee';
    end if;
    if new.confirmation is distinct from old.confirmation then
      new.confirmation_le := case when new.confirmation = 'non_demandee' then null
                                  when new.confirmation_le is not distinct from old.confirmation_le then now()
                                  else new.confirmation_le end;
    elsif new.confirmation = 'non_demandee' then
      new.confirmation_le := null;
    end if;
  end if;
  new.maj_le := now();
  return new;
end $function$


-- ═══ FONCTION private.btp_preparer_personne
CREATE OR REPLACE FUNCTION private.btp_preparer_personne()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.nom := btrim(new.nom);
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.client_id := old.client_id;
    new.cree_le := old.cree_le;
  end if;

  if tg_table_name = 'btp_intervenants' then
    if new.informe_le is not null and new.informe_le > current_date + 1 then
      raise exception 'La date d''information ne peut pas être dans le futur.' using errcode = '22023';
    end if;
    new.maj_le := now();
  elsif tg_table_name = 'btp_tiers' then
    if exists (select 1 from unnest(new.corps_etat) c
               where not exists (select 1 from public.btp_corps_etat r where r.code = c)) then
      raise exception 'Corps d''état inconnu parmi %.', new.corps_etat using errcode = '23503';
    end if;
    if tg_op = 'INSERT' then
      if new.vigilance_verifiee_le is not null then
        new.vigilance_verifiee_par := coalesce((select auth.uid()), new.vigilance_verifiee_par);
      end if;
    elsif new.vigilance_attestation_le is distinct from old.vigilance_attestation_le
          and new.vigilance_verifiee_le is not distinct from old.vigilance_verifiee_le then
      -- Une nouvelle attestation n'est pas encore vérifiée.
      new.vigilance_verifiee_le := null;
      new.vigilance_verifiee_par := null;
    elsif new.vigilance_verifiee_le is distinct from old.vigilance_verifiee_le then
      new.vigilance_verifiee_par := case when new.vigilance_verifiee_le is null then null
                                         else coalesce((select auth.uid()), new.vigilance_verifiee_par) end;
    end if;
    new.maj_le := now();
  end if;
  return new;
end $function$


-- ═══ FONCTION private.btp_preparer_prix
CREATE OR REPLACE FUNCTION private.btp_preparer_prix()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.client_id := old.client_id;
    new.origine := old.origine;
    new.cree_le := old.cree_le;
    if old.statut <> 'propose'
       and (new.designation, new.unite, new.prix_unitaire_ht, new.valide_par, new.valide_le)
           is distinct from (old.designation, old.unite, old.prix_unitaire_ht, old.valide_par, old.valide_le) then
      raise exception 'Un prix validé ne se retouche pas : validez-en un nouveau.' using errcode = '42501';
    end if;
    if new.statut is distinct from old.statut and not (
         (old.statut = 'propose' and new.statut in ('valide', 'retire'))
      or (old.statut = 'valide' and new.statut = 'retire')) then
      raise exception 'Passage refusé : % vers %.', old.statut, new.statut using errcode = '23514';
    end if;
  end if;
  new.designation := btrim(new.designation);
  new.maj_le := now();
  return new;
end $function$


-- ═══ FONCTION private.btp_preparer_reglages
CREATE OR REPLACE FUNCTION private.btp_preparer_reglages()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ouverts integer;
  v_chantiers integer := case new.formule when 'demarrage' then 5 when 'chantiers' then 20 end;
  v_comptes integer := case new.formule when 'demarrage' then 2 when 'chantiers' then 5 end;
begin
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.client_id := old.client_id;
    new.installe_le := old.installe_le;
  end if;
  -- Les quotas de Démarrage et de Chantiers sont ceux de la page ; un quota
  -- donné qui les contredit est refusé par la contrainte, jamais corrigé en silence.
  if new.formule in ('demarrage', 'chantiers') then
    if tg_op = 'INSERT' then
      new.quota_chantiers := coalesce(new.quota_chantiers, v_chantiers);
      new.quota_comptes_bureau := coalesce(new.quota_comptes_bureau, v_comptes);
    elsif new.formule is distinct from old.formule then
      if new.quota_chantiers is not distinct from old.quota_chantiers then
        new.quota_chantiers := v_chantiers;
      end if;
      if new.quota_comptes_bureau is not distinct from old.quota_comptes_bureau then
        new.quota_comptes_bureau := v_comptes;
      end if;
    end if;
  elsif new.quota_chantiers is null or new.quota_comptes_bureau is null then
    raise exception 'La formule Entreprise est sur mesure : donnez le nombre de chantiers et de comptes bureau.'
      using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' then
    perform pg_advisory_xact_lock(hashtextextended('daliro.quota:' || new.client_id::text, 0));
    select count(*) into v_ouverts from public.btp_chantiers c
    where c.client_id = new.client_id and c.statut in ('ouvert', 'suspendu');
    if v_ouverts > new.quota_chantiers then
      raise exception '% chantiers sont ouverts : la nouvelle formule n''en suit que %. Fermez-en d''abord %.',
        v_ouverts, new.quota_chantiers, v_ouverts - new.quota_chantiers using errcode = 'P0001';
    end if;
  end if;
  new.maj_le := now();
  return new;
end $function$


-- ═══ FONCTION private.btp_prix_bibliotheque
CREATE OR REPLACE FUNCTION private.btp_prix_bibliotheque(p_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select b.prix_unitaire_ht from public.btp_bibliotheque_prix b
  where b.id = p_id
    and (private.btp_est_serveur() or (b.client_id in (select private.mes_clients()) and private.btp_voit_prix(b.client_id)))
$function$


-- ═══ FONCTION private.btp_prix_ligne_marche
CREATE OR REPLACE FUNCTION private.btp_prix_ligne_marche(p_id uuid)
 RETURNS TABLE(prix_unitaire_ht numeric, montant_ht numeric, ecart numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select l.prix_unitaire_ht, l.montant_ht, l.ecart from public.btp_lignes_marche l
  where l.id = p_id
    and (private.btp_est_serveur() or (private.voit_entite(l.client_id, l.entite_id) and private.btp_voit_prix(l.client_id)))
$function$


-- ═══ FONCTION private.btp_prix_marche
CREATE OR REPLACE FUNCTION private.btp_prix_marche(p_id uuid)
 RETURNS TABLE(montant_ht_declare numeric, total_ht_lignes numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select m.montant_ht_declare,
         (select coalesce(sum(l.montant_ht), 0) from public.btp_lignes_marche l
          where l.client_id = m.client_id and l.marche_id = m.id and l.nature <> 'option')
  from public.btp_marches m
  where m.id = p_id
    and (private.btp_est_serveur() or (private.voit_entite(m.client_id, m.entite_id) and private.btp_voit_prix(m.client_id)))
$function$


-- ═══ FONCTION private.btp_proposer_dependances
CREATE OR REPLACE FUNCTION private.btp_proposer_dependances(p_chantier uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid;
  v_entite uuid;
  r record;
  n integer := 0;
begin
  select c.client_id, c.entite_id into v_client, v_entite from public.btp_chantiers c where c.id = p_chantier;
  if v_client is null then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_planning(v_client, v_entite);
  for r in
    with pas as (
      select p.id, ce.rang_sequence as rang
      from public.btp_passages p
      join public.btp_lots l on l.chantier_id = p.chantier_id and l.id = p.lot_id
      join public.btp_corps_etat ce on ce.code = l.corps_etat
      where p.chantier_id = p_chantier and p.statut = 'prevu'
    ), rangs as (select distinct rang from pas)
    select a.id as amont, b.id as aval
    from pas b
    join lateral (select max(x.rang) as rang from rangs x where x.rang < b.rang) prec on prec.rang is not null
    join pas a on a.rang = prec.rang
    where not exists (select 1 from public.btp_dependances d
                      where (d.amont_id = a.id and d.aval_id = b.id) or (d.amont_id = b.id and d.aval_id = a.id))
    order by a.id, b.id
  loop
    if not private.btp_cree_cycle(p_chantier, r.amont, r.aval) then
      insert into public.btp_dependances (client_id, chantier_id, amont_id, aval_id, origine, confirmee)
      values (v_client, p_chantier, r.amont, r.aval, 'gabarit', false);
      n := n + 1;
    end if;
  end loop;
  if n > 0 then
    perform private.journaliser(v_client, 'daliro.dependances_proposees', 'btp_chantiers', p_chantier::text,
      jsonb_build_object('proposees', n), v_entite);
  end if;
  return n;
end $function$


-- ═══ FONCTION private.btp_rapprocher
CREATE OR REPLACE FUNCTION private.btp_rapprocher(p_client uuid, p_nom text)
 RETURNS TABLE(genre text, id uuid, nom text, score numeric, mode text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with cibles as (
    select 'tiers'::text as genre, t.id, t.nom from public.btp_tiers t where t.client_id = p_client and t.actif
    union all
    select 'equipe', e.id, e.nom from public.btp_equipes e where e.client_id = p_client and e.actif
  ), notes as (
    select c.genre, c.id, c.nom,
           private.btp_normaliser(c.nom) is not distinct from private.btp_normaliser(p_nom) as identique,
           private.btp_ressemblance(c.nom, p_nom) as score
    from cibles c
    where private.btp_est_serveur() or p_client in (select private.mes_clients())
  )
  select genre, id, nom, case when identique then 1 else score end,
         case when identique then 'identique' else 'ressemblance' end
  from notes
  where identique or score >= 0.5
  order by 4 desc, nom collate "C"
$function$


-- ═══ FONCTION private.btp_regime_tva
CREATE OR REPLACE FUNCTION private.btp_regime_tva(p_zone text, p_place_client text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select case
    when p_zone is null then null
    when p_zone = 'hors_champ' then 'hors_champ'
    when p_zone in ('guyane', 'mayotte') then 'non_applicable'
    when p_place_client = 'sous_traitant' then 'autoliquidation'
    else 'normal'
  end
$function$


-- ═══ FONCTION private.btp_ressemblance
CREATE OR REPLACE FUNCTION private.btp_ressemblance(a text, b text)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select case when cardinality(ma) = 0 or cardinality(mb) = 0 then 0
              else round((select count(*) from unnest(ma) x where x = any (mb))::numeric
                         / least(cardinality(ma), cardinality(mb)), 3) end
  from (select private.btp_mots(a) as ma, private.btp_mots(b) as mb) x
$function$


-- ═══ FONCTION private.btp_retirer_ligne
CREATE OR REPLACE FUNCTION private.btp_retirer_ligne(p_ligne uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  l public.btp_lignes_marche;
begin
  select * into l from public.btp_lignes_marche where id = p_ligne for update;
  if not found then
    raise exception 'Ligne introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(l.client_id, l.entite_id);
  delete from public.btp_lignes_marche where id = l.id;
  perform private.journaliser(l.client_id, 'daliro.ligne_retiree', 'btp_lignes_marche', l.id::text,
    jsonb_build_object('marche', l.marche_id, 'designation', l.designation), l.entite_id);
end $function$


-- ═══ FONCTION private.btp_rouvrir_marche
CREATE OR REPLACE FUNCTION private.btp_rouvrir_marche(p_marche uuid, p_motif text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  m public.btp_marches;
begin
  select * into m from public.btp_marches where id = p_marche for update;
  if not found then
    raise exception 'Marché introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(m.client_id, m.entite_id);
  if (select auth.uid()) is not null and not private.a_un_role(m.client_id, array['gerant']) then
    raise exception 'Seul le gérant rouvre un marché vérifié.' using errcode = '42501';
  end if;
  if coalesce(btrim(p_motif), '') = '' then
    raise exception 'Un marché se rouvre avec son motif.' using errcode = '22023';
  end if;
  if m.statut <> 'verifie' then
    raise exception 'Ce marché n''est pas vérifié.' using errcode = '23514';
  end if;
  perform set_config('daliro.porte', 'rouvrir', true);
  update public.btp_marches set statut = 'a_verifier' where id = m.id;
  perform set_config('daliro.porte', '', true);
  perform private.journaliser(m.client_id, 'daliro.marche_rouvert', 'btp_marches', m.id::text,
    jsonb_build_object('motif', btrim(p_motif)), m.entite_id);
end $function$


-- ═══ FONCTION private.btp_siret_valide
CREATE OR REPLACE FUNCTION private.btp_siret_valide(p text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select coalesce(p ~ '^[0-9]{14}$', false) and (
    private.btp_luhn(p)
    or (left(p, 9) = '356000000'
        and (select sum(substr(p, i, 1)::int) from generate_series(1, 14) i) % 5 = 0))
$function$


-- ═══ FONCTION private.btp_tache_referentiel
CREATE OR REPLACE FUNCTION private.btp_tache_referentiel()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  v_res jsonb := '[]'::jsonb;
begin
  for r in select client_id from public.btp_reglages loop
    begin
      v_res := v_res || jsonb_build_object('client', r.client_id, 'resultat', private.btp_veiller_client(r.client_id));
    exception when others then
      perform private.lever_alerte_module(r.client_id, 'daliro_referentiel', 'critique',
        'La veille du référentiel a échoué', jsonb_build_object('erreur', sqlerrm, 'code', sqlstate),
        'veille_echec', false, null);
      v_res := v_res || jsonb_build_object('client', r.client_id, 'erreur', sqlerrm);
    end;
  end loop;
  return v_res;
end $function$


-- ═══ FONCTION private.btp_telephone_unique
CREATE OR REPLACE FUNCTION private.btp_telephone_unique()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.telephone is null or not new.actif then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('daliro.telephone:' || new.client_id::text || new.telephone, 0));
  if exists (select 1 from public.btp_intervenants i
             where i.client_id = new.client_id and i.telephone = new.telephone and i.actif
               and (tg_table_name <> 'btp_intervenants' or i.id <> new.id))
     or exists (select 1 from public.btp_tiers t
                where t.client_id = new.client_id and t.telephone = new.telephone and t.actif
                  and (tg_table_name <> 'btp_tiers' or t.id <> new.id)) then
    raise exception 'Le numéro % est déjà celui d''une autre personne de l''annuaire : un numéro ne désigne qu''une personne.',
      new.telephone using errcode = '23505';
  end if;
  return new;
end $function$


-- ═══ FONCTION private.btp_territoire
CREATE OR REPLACE FUNCTION private.btp_territoire(p_code_postal text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select case
    when p_code_postal is null or p_code_postal !~ '^[0-9]{5}$' then null
    when p_code_postal = '97133' then 'saint-barthelemy'
    when p_code_postal = '97150' then 'saint-martin'
    when left(p_code_postal, 3) = '971' then 'guadeloupe'
    when left(p_code_postal, 3) = '972' then 'martinique'
    when left(p_code_postal, 3) = '973' then 'guyane'
    when left(p_code_postal, 3) = '974' then 'la-reunion'
    when left(p_code_postal, 3) = '975' then 'saint-pierre-et-miquelon'
    when left(p_code_postal, 3) = '976' then 'mayotte'
    when left(p_code_postal, 3) = '986' then 'wallis-et-futuna'
    when left(p_code_postal, 3) = '987' then 'polynesie-francaise'
    when left(p_code_postal, 3) = '988' then 'nouvelle-caledonie'
    when left(p_code_postal, 2) in ('00', '96', '97', '98', '99') then null
    when left(p_code_postal, 2) in ('57', '67', '68') then 'alsace-moselle'
    else 'metropole'
  end
$function$


-- ═══ FONCTION private.btp_total_different
CREATE OR REPLACE FUNCTION private.btp_total_different(p_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select m.montant_ht_declare is not null
     and abs(m.montant_ht_declare - (select coalesce(sum(l.montant_ht), 0) from public.btp_lignes_marche l
                                     where l.client_id = m.client_id and l.marche_id = m.id and l.nature <> 'option')) > 1
  from public.btp_marches m
  where m.id = p_id and (private.btp_est_serveur() or private.voit_entite(m.client_id, m.entite_id))
$function$


-- ═══ FONCTION private.btp_unite
CREATE OR REPLACE FUNCTION private.btp_unite(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select case u
    when 'u' then 'u' when 'un' then 'u' when 'unite' then 'u' when 'unites' then 'u' when 'pce' then 'u'
    when 'pc' then 'u' when 'piece' then 'u' when 'pieces' then 'u' when 'nb' then 'u' when 'nombre' then 'u'
    when 'ens' then 'ens' when 'ensemble' then 'ens'
    when 'ft' then 'forfait' when 'fft' then 'forfait' when 'forfait' then 'forfait' when 'f' then 'forfait'
    when 'forf' then 'forfait'
    when 'm' then 'ml' when 'ml' then 'ml' when 'm l' then 'ml' when 'lm' then 'ml' when 'metre' then 'ml'
    when 'metres' then 'ml' when 'metre lineaire' then 'ml' when 'metres lineaires' then 'ml'
    when 'm2' then 'm2' when 'm 2' then 'm2' when 'metre carre' then 'm2' when 'metres carres' then 'm2'
    when 'm3' then 'm3' when 'm 3' then 'm3' when 'metre cube' then 'm3' when 'metres cubes' then 'm3'
    when 'kg' then 'kg' when 'kilo' then 'kg' when 'kilos' then 'kg' when 'kilogramme' then 'kg'
    when 'kilogrammes' then 'kg'
    when 't' then 't' when 'tonne' then 't' when 'tonnes' then 't'
    when 'l' then 'l' when 'litre' then 'l' when 'litres' then 'l'
    when 'h' then 'h' when 'heure' then 'h' when 'heures' then 'h' when 'hr' then 'h'
    when 'j' then 'j' when 'jour' then 'j' when 'jours' then 'j'
    when 'sem' then 'sem' when 'semaine' then 'sem' when 'semaines' then 'sem'
    when 'mois' then 'mois'
  end
  from (select private.btp_normaliser(replace(replace(p, '²', '2'), '³', '3')) as u) x
$function$


-- ═══ FONCTION private.btp_valider_prix
CREATE OR REPLACE FUNCTION private.btp_valider_prix(p_prix uuid, p_prix_unitaire numeric DEFAULT NULL::numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  b public.btp_bibliotheque_prix;
  v_acteur record;
begin
  select * into b from public.btp_bibliotheque_prix where id = p_prix for update;
  if not found then
    raise exception 'Prix introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_valideur_prix(b.client_id);
  if b.statut <> 'propose' then
    raise exception 'Seul un prix proposé se valide.' using errcode = '23514';
  end if;
  select * into v_acteur from private.acteur_courant();
  update public.btp_bibliotheque_prix set statut = 'retire'
  where client_id = b.client_id and designation_normalisee = b.designation_normalisee and unite = b.unite
    and statut = 'valide';
  update public.btp_bibliotheque_prix
  set prix_unitaire_ht = coalesce(p_prix_unitaire, prix_unitaire_ht), statut = 'valide',
      valide_par = v_acteur.acteur_id, valide_le = now()
  where id = b.id;
  return b.id;
end $function$


-- ═══ FONCTION private.btp_veiller_client
CREATE OR REPLACE FUNCTION private.btp_veiller_client(p_client uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  v_id uuid;
  v_immobiles integer := 0;
  v_vigilances integer := 0;
  v_ouverts integer;
begin
  for r in
    select c.id, c.nom, c.conducteur_id,
           greatest(c.ouvert_le, (select max(p.maj_le) from public.btp_passages p where p.chantier_id = c.id)) as bouge_le
    from public.btp_chantiers c
    where c.client_id = p_client and c.statut = 'ouvert'
  loop
    if r.bouge_le < now() - interval '7 days' then
      v_id := private.lever_alerte_module(p_client, 'daliro_referentiel', 'attention',
        format('%s : le planning n''a pas bougé depuis sept jours', left(r.nom, 150)),
        jsonb_build_object('chantier', r.id, 'depuis', r.bouge_le),
        'planning_immobile:' || r.id::text, true, r.conducteur_id);
      if v_id is not null then
        v_immobiles := v_immobiles + 1;
      end if;
    end if;
  end loop;

  for r in
    select distinct t.id, t.nom,
           public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le) as etat
    from public.btp_tiers t
    join public.btp_passages p on p.client_id = t.client_id and p.tiers_id = t.id
    where t.client_id = p_client and t.actif and 'sous_traitant' = any (t.roles)
      and p.statut = 'prevu' and p.debut between current_date and current_date + 15
      and public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le) in ('absente', 'echue')
  loop
    v_id := private.lever_alerte_module(p_client, 'daliro_referentiel', 'attention',
      format('%s passe sous quinze jours sans attestation de vigilance %s', left(r.nom, 140),
             case r.etat when 'absente' then 'connue' else 'de moins de six mois' end),
      jsonb_build_object('tiers', r.id, 'etat', r.etat), 'vigilance:' || r.id::text, true, null);
    if v_id is not null then
      v_vigilances := v_vigilances + 1;
    end if;
  end loop;

  select count(*) into v_ouverts from public.btp_chantiers c where c.client_id = p_client and c.statut in ('ouvert', 'suspendu');
  perform public.signaler_battement(p_client, 'daliro_referentiel',
    jsonb_build_object('chantiers_ouverts', v_ouverts, 'alertes', v_immobiles + v_vigilances), interval '1 day');
  return jsonb_build_object('chantiers_ouverts', v_ouverts, 'plannings_immobiles', v_immobiles, 'vigilances', v_vigilances);
end $function$


-- ═══ FONCTION private.btp_verifier_marche
CREATE OR REPLACE FUNCTION private.btp_verifier_marche(p_marche uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  m public.btp_marches;
  v_acteur record;
  v_lignes integer;
  v_corrigees integer;
  v_acceptes integer;
  v_incompletes integer;
  v_faux integer;
  v_sans_lot integer;
  v_total numeric(14,2);
  v_raisons text[] := '{}';
  v_proposes integer;
begin
  select * into m from public.btp_marches where id = p_marche for update;
  if not found then
    raise exception 'Marché introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(m.client_id, m.entite_id);
  if m.statut <> 'a_verifier' then
    raise exception 'Ce marché est déjà vérifié.' using errcode = '23514';
  end if;

  select count(*), count(*) filter (where l.corrigee), count(*) filter (where l.ecart_accepte),
         count(*) filter (where l.nature <> 'option' and l.controle = 'incomplet'),
         count(*) filter (where l.nature <> 'option' and l.controle = 'montant_faux' and not l.ecart_accepte),
         count(*) filter (where l.nature <> 'option' and l.lot_id is null),
         coalesce(sum(l.montant_ht) filter (where l.nature <> 'option'), 0)
  into v_lignes, v_corrigees, v_acceptes, v_incompletes, v_faux, v_sans_lot, v_total
  from public.btp_lignes_marche l where l.client_id = m.client_id and l.marche_id = m.id;

  if v_lignes = 0 then
    v_raisons := v_raisons || 'il n''a aucune ligne'::text;
  end if;
  if v_incompletes > 0 then
    v_raisons := v_raisons || format('%s ligne(s) incomplète(s)', v_incompletes);
  end if;
  if v_faux > 0 then
    v_raisons := v_raisons || format('%s ligne(s) dont le montant n''est pas quantité × prix', v_faux);
  end if;
  if v_sans_lot > 0 then
    v_raisons := v_raisons || format('%s ligne(s) sans lot', v_sans_lot);
  end if;
  if m.montant_ht_declare is not null and abs(v_total - m.montant_ht_declare) > 1 then
    v_raisons := v_raisons || 'le total des lignes diffère du total du devis de plus d''un euro'::text;
  end if;
  if cardinality(v_raisons) > 0 then
    raise exception 'Marché non vérifiable : %.', array_to_string(v_raisons, ' ; ') using errcode = '23514';
  end if;

  select * into v_acteur from private.acteur_courant();
  perform set_config('daliro.porte', 'verifier', true);
  update public.btp_marches
  set statut = 'verifie', verifie_par = v_acteur.acteur_id, verifie_libelle = v_acteur.acteur_libelle, verifie_le = now()
  where id = m.id;
  perform set_config('daliro.porte', '', true);

  -- La bibliothèque apprend les prix du marché ; ils n'y valent qu'une fois validés.
  insert into public.btp_bibliotheque_prix (client_id, designation, unite, prix_unitaire_ht, corps_etat, origine,
                                            ligne_marche_id, date_prix)
  select distinct on (l.designation_normalisee, l.unite, l.prix_unitaire_ht)
         l.client_id, l.designation, l.unite, l.prix_unitaire_ht, lo.corps_etat, 'marche', l.id,
         coalesce(m.date_signature, current_date)
  from public.btp_lignes_marche l
  left join public.btp_lots lo on lo.chantier_id = l.chantier_id and lo.id = l.lot_id
  where l.client_id = m.client_id and l.marche_id = m.id and l.nature in ('ouvrage', 'fourniture')
    and l.unite is not null and l.prix_unitaire_ht > 0
    and not exists (select 1 from public.btp_bibliotheque_prix b
                    where b.client_id = l.client_id and b.designation_normalisee = l.designation_normalisee
                      and b.unite = l.unite and b.prix_unitaire_ht = l.prix_unitaire_ht
                      and b.statut in ('propose', 'valide'))
  order by l.designation_normalisee, l.unite, l.prix_unitaire_ht, l.ordre;
  get diagnostics v_proposes = row_count;

  perform private.journaliser(m.client_id, 'daliro.marche_verifie', 'btp_marches', m.id::text,
    jsonb_build_object('lignes', v_lignes, 'corrigees', v_corrigees, 'ecarts_acceptes', v_acceptes,
                       'prix_proposes', v_proposes), m.entite_id);
  perform private.publier_evenement(m.client_id, 'daliro.marche_verifie',
    jsonb_build_object('marche', m.id, 'chantier', m.chantier_id), m.id::text);
  return jsonb_build_object('marche', m.id, 'lignes', v_lignes, 'corrigees', v_corrigees,
    'justes_du_premier_coup', round(100.0 * (v_lignes - v_corrigees) / v_lignes, 1), 'prix_proposes', v_proposes);
end $function$


-- ═══ FONCTION private.btp_voit_chantier
CREATE OR REPLACE FUNCTION private.btp_voit_chantier(p_client uuid, p_entite uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select private.voit_entite(p_client, p_entite)
$function$


-- ═══ FONCTION private.btp_voit_prix
CREATE OR REPLACE FUNCTION private.btp_voit_prix(p_client uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select (select auth.uid()) is not null
     and exists (select 1 from public.comptes c where c.client_id = p_client and c.user_id = (select auth.uid()))
     and (private.a_le_droit(p_client, 'voir_prix')
          or exists (select 1 from public.btp_reglages r where r.client_id = p_client and r.formule = 'demarrage'))
$function$


-- ═══ FONCTION private.btp_zone_tva
CREATE OR REPLACE FUNCTION private.btp_zone_tva(p_code_postal text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select case
    when t is null then null
    when t = 'metropole' and left(p_code_postal, 2) = '20' then 'corse'
    when t in ('metropole', 'alsace-moselle') then 'metropole'
    when t in ('guadeloupe', 'martinique', 'la-reunion', 'guyane', 'mayotte') then t
    else 'hors_champ'
  end
  from (select private.btp_territoire(p_code_postal) as t) x
$function$


-- ═══ FONCTION public.btp_accepter_ecart
CREATE OR REPLACE FUNCTION public.btp_accepter_ecart(p_ligne uuid, p_motif text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.btp_accepter_ecart(p_ligne, p_motif) $function$


-- ═══ FONCTION public.btp_ecrire_ligne
CREATE OR REPLACE FUNCTION public.btp_ecrire_ligne(p_ligne uuid, p_marche uuid, p_champs jsonb)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.btp_ecrire_ligne(p_ligne, p_marche, p_champs) $function$


-- ═══ FONCTION public.btp_ecrire_marche
CREATE OR REPLACE FUNCTION public.btp_ecrire_marche(p_marche uuid, p_chantier uuid, p_champs jsonb)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.btp_ecrire_marche(p_marche, p_chantier, p_champs) $function$


-- ═══ FONCTION public.btp_etat_vigilance
CREATE OR REPLACE FUNCTION public.btp_etat_vigilance(p_roles text[], p_attestation date, p_verifiee timestamp with time zone, p_au date DEFAULT CURRENT_DATE)
 RETURNS text
 LANGUAGE sql
 STABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select case
    when not (coalesce(p_roles, '{}') && array['sous_traitant']) then 'sans_objet'
    when p_attestation is null then 'absente'
    when p_au >= (p_attestation + interval '6 months')::date then 'echue'
    when p_verifiee is null then 'a_verifier'
    when p_au >= (p_attestation + interval '6 months' - interval '15 days')::date then 'a_renouveler'
    else 'a_jour'
  end
$function$


-- ═══ FONCTION public.btp_fonction_ouverte
CREATE OR REPLACE FUNCTION public.btp_fonction_ouverte(p_client uuid, p_fonction text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce((select p_fonction = any (public.btp_fonctions_de(r.formule))
                   from public.btp_reglages r where r.client_id = p_client), false)
$function$


-- ═══ FONCTION public.btp_fonctions_de
CREATE OR REPLACE FUNCTION public.btp_fonctions_de(p_formule text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select case p_formule
    when 'demarrage' then array['lecture', 'avenants', 'signature', 'confirmation_j2', 'annuaire',
                                'point_matin', 'questions', 'audit']
    when 'chantiers' then array['lecture', 'avenants', 'signature', 'confirmation_j2', 'annuaire',
                                'point_matin', 'questions', 'audit',
                                'relance_avenants', 'remplacants', 'ordre_lots', 'meteo', 'liste_cadencee',
                                'livraisons_calees', 'roles_droits', 'journal_validations', 'point_mensuel']
    when 'entreprise' then array['lecture', 'avenants', 'signature', 'confirmation_j2', 'annuaire',
                                 'point_matin', 'questions', 'audit',
                                 'relance_avenants', 'remplacants', 'ordre_lots', 'meteo', 'liste_cadencee',
                                 'livraisons_calees', 'roles_droits', 'journal_validations', 'point_mensuel',
                                 'retours', 'bons_livraison', 'situations']
  end
$function$


-- ═══ FONCTION public.btp_importer_passages
CREATE OR REPLACE FUNCTION public.btp_importer_passages(p_chantier uuid, p_source text, p_lignes jsonb, p_complet boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.btp_importer_passages(p_chantier, p_source, p_lignes, p_complet) $function$


-- ═══ FONCTION public.btp_installer
CREATE OR REPLACE FUNCTION public.btp_installer(p_client uuid, p_formule text, p_quota_chantiers integer DEFAULT NULL::integer, p_quota_comptes integer DEFAULT NULL::integer)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.btp_installer(p_client, p_formule, p_quota_chantiers, p_quota_comptes)
$function$


-- ═══ FONCTION public.btp_poser_prix
CREATE OR REPLACE FUNCTION public.btp_poser_prix(p_client uuid, p_designation text, p_unite text, p_prix_unitaire numeric, p_corps_etat text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.btp_poser_prix(p_client, p_designation, p_unite, p_prix_unitaire, p_corps_etat) $function$


-- ═══ FONCTION public.btp_proposer_dependances
CREATE OR REPLACE FUNCTION public.btp_proposer_dependances(p_chantier uuid)
 RETURNS integer
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.btp_proposer_dependances(p_chantier) $function$


-- ═══ FONCTION public.btp_rapprocher
CREATE OR REPLACE FUNCTION public.btp_rapprocher(p_client uuid, p_nom text)
 RETURNS TABLE(genre text, id uuid, nom text, score numeric, mode text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select * from private.btp_rapprocher(p_client, p_nom)
$function$


-- ═══ FONCTION public.btp_retirer_ligne
CREATE OR REPLACE FUNCTION public.btp_retirer_ligne(p_ligne uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.btp_retirer_ligne(p_ligne) $function$


-- ═══ FONCTION public.btp_rouvrir_marche
CREATE OR REPLACE FUNCTION public.btp_rouvrir_marche(p_marche uuid, p_motif text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.btp_rouvrir_marche(p_marche, p_motif) $function$


-- ═══ FONCTION public.btp_valider_prix
CREATE OR REPLACE FUNCTION public.btp_valider_prix(p_prix uuid, p_prix_unitaire numeric DEFAULT NULL::numeric)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.btp_valider_prix(p_prix, p_prix_unitaire) $function$


-- ═══ FONCTION public.btp_veiller
CREATE OR REPLACE FUNCTION public.btp_veiller(p_client uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.btp_veiller_client(p_client) $function$


-- ═══ FONCTION public.btp_verifier_marche
CREATE OR REPLACE FUNCTION public.btp_verifier_marche(p_marche uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.btp_verifier_marche(p_marche) $function$


-- ═══ FONCTION public.btp_voit_prix
CREATE OR REPLACE FUNCTION public.btp_voit_prix(p_client uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select private.btp_voit_prix(p_client)
$function$



-- ══════════════════ CRONS ══════════════════

-- ═══ CRON daliro-referentiel [20 6 * * *] select private.btp_tache_referentiel()
