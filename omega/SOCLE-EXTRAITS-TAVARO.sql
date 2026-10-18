-- Extraits du socle Omega pour Tavaro (location de véhicules) — préfixe loc_
-- Recette ygwbgpowzlbdaajlsqkn, photographie du 5 octobre 2026, 22 h 30, par le coordinateur.
-- Ce fichier NE S'EXÉCUTE PAS : il sert à écrire des « create or replace », des écrans et des tests.
-- Les ouvriers n'appellent jamais Supabase ; ce qui manque ici se demande au coordinateur.
-- Contenu : 17 tables, 1 vues, 110 fonctions, 4 crons.


-- ══════════════════ TABLES ══════════════════

-- ═══ TABLE public.loc_agences
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  code text not null
  horaires jsonb
  releve_rythme interval not null default '1 day'::interval
  actif boolean not null default true
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  taux_tva numeric(4,2)
  constraint loc_agences_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint loc_agences_client_id_id_key UNIQUE (client_id, id)
  constraint loc_agences_code_check CHECK ((code ~ '^[A-Z0-9][A-Z0-9 _./-]{0,39}$'::text))
  constraint loc_agences_code_unique UNIQUE (client_id, code)
  constraint loc_agences_entite_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id) ON DELETE CASCADE
  constraint loc_agences_pkey PRIMARY KEY (id)
  constraint loc_agences_releve_rythme_check CHECK (((releve_rythme >= '00:15:00'::interval) AND (releve_rythme <= '7 days'::interval)))
  constraint loc_agences_taux_tva_check CHECK (((taux_tva >= (0)::numeric) AND (taux_tva <= (30)::numeric)))
  constraint loc_agences_une_par_entite UNIQUE (client_id, entite_id)
  policy "gerants et admins creent les agences" INSERT to authenticated using () with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))
  policy "gerants et admins reglent les agences" UPDATE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))
  policy "gerants et admins retirent les agences" DELETE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check ()
  policy "membres voient les agences du reseau" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER loc_agences_preparer BEFORE INSERT OR UPDATE OF code, horaires ON public.loc_agences FOR EACH ROW EXECUTE FUNCTION private.loc_preparer_agence()
  CREATE TRIGGER loc_agences_toucher BEFORE UPDATE ON public.loc_agences FOR EACH ROW EXECUTE FUNCTION private.loc_toucher()
  CREATE TRIGGER loc_agences_tracer AFTER INSERT OR DELETE OR UPDATE ON public.loc_agences FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.loc_avoirs
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  entite_emettrice_id uuid not null
  facture_id uuid not null
  facture_reference text not null
  contrat_id uuid not null
  contrat_numero text not null
  motif text not null
  total boolean not null
  montant_ht numeric(12,2) not null
  montant_tva numeric(12,2) not null
  montant_ttc numeric(12,2) not null
  lignes jsonb not null default '[]'::jsonb
  statut text not null default 'a_valider'::text
  demande_id uuid
  demande_par uuid
  annee smallint
  numero integer
  reference text
  emis_le timestamp with time zone
  date_avoir date
  emetteur jsonb
  destinataire jsonb
  mentions jsonb not null default '{}'::jsonb
  envoi_id uuid
  pdf_piece_id uuid
  pdf_sha256 text
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  envoye_le timestamp with time zone
  constraint loc_avoirs_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint loc_avoirs_client_id_id_key UNIQUE (client_id, id)
  constraint loc_avoirs_contrat_fkey FOREIGN KEY (client_id, contrat_id) REFERENCES loc_contrats(client_id, id)
  constraint loc_avoirs_demande_fkey FOREIGN KEY (demande_id) REFERENCES demandes_validation(id)
  constraint loc_avoirs_emettrice_fkey FOREIGN KEY (client_id, entite_emettrice_id) REFERENCES entites(client_id, id)
  constraint loc_avoirs_emis CHECK (((statut = 'emis'::text) = ((reference IS NOT NULL) AND (emis_le IS NOT NULL) AND (emetteur IS NOT NULL))))
  constraint loc_avoirs_entite_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id)
  constraint loc_avoirs_facture_fkey FOREIGN KEY (client_id, facture_id) REFERENCES loc_factures(client_id, id)
  constraint loc_avoirs_lignes_check CHECK ((jsonb_typeof(lignes) = 'array'::text))
  constraint loc_avoirs_montant_ht_check CHECK ((montant_ht >= (0)::numeric))
  constraint loc_avoirs_montant_ttc_check CHECK ((montant_ttc > (0)::numeric))
  constraint loc_avoirs_montant_tva_check CHECK ((montant_tva >= (0)::numeric))
  constraint loc_avoirs_motif_check CHECK (((char_length(motif) >= 3) AND (char_length(motif) <= 500)))
  constraint loc_avoirs_numero_check CHECK ((numero >= 1))
  constraint loc_avoirs_numero_unique UNIQUE (client_id, entite_emettrice_id, annee, numero)
  constraint loc_avoirs_pdf_sha256_check CHECK ((pdf_sha256 ~ '^[0-9a-f]{64}$'::text))
  constraint loc_avoirs_pkey PRIMARY KEY (id)
  constraint loc_avoirs_reference_check CHECK ((reference ~ '^AV-[0-9]{4}-[0-9]{6}$'::text))
  constraint loc_avoirs_reference_unique UNIQUE (client_id, reference)
  constraint loc_avoirs_statut_check CHECK ((statut = ANY (ARRAY['a_valider'::text, 'emis'::text, 'refuse'::text, 'expire'::text, 'annule'::text])))
  policy "on voit les avoirs des factures qu'on voit" SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM loc_factures f
  WHERE ((f.client_id = loc_avoirs.client_id) AND (f.id = loc_avoirs.facture_id))))) with check ()
  CREATE TRIGGER loc_avoirs_garder BEFORE INSERT OR DELETE OR UPDATE ON public.loc_avoirs FOR EACH ROW EXECUTE FUNCTION private.loc_garder_avoir()
  CREATE TRIGGER loc_avoirs_toucher BEFORE UPDATE ON public.loc_avoirs FOR EACH ROW EXECUTE FUNCTION private.loc_toucher()
  CREATE TRIGGER loc_avoirs_tracer AFTER INSERT OR DELETE OR UPDATE ON public.loc_avoirs FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le', 'destinataire', 'motif', 'mentions')
  grants authenticated: SELECT

-- ═══ TABLE public.loc_bareme_lignes
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  bareme_id uuid not null
  code text not null
  libelle text not null
  famille text not null
  unite text not null
  prix_eur numeric(10,2)
  regime_tva text not null
  taux_tva numeric(4,2)
  categorie_id uuid
  nature text default 
CASE
    WHEN (famille = 'dommage'::text) THEN 'dommage'::text
    ELSE 'frais'::text
END
  rang smallint not null default 0
  cree_le timestamp with time zone not null default now()
  constraint loc_bareme_lignes_bareme_fkey FOREIGN KEY (client_id, bareme_id) REFERENCES loc_baremes(client_id, id) ON DELETE CASCADE
  constraint loc_bareme_lignes_categorie_fkey FOREIGN KEY (client_id, categorie_id) REFERENCES loc_categories(client_id, id)
  constraint loc_bareme_lignes_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint loc_bareme_lignes_client_id_id_key UNIQUE (client_id, id)
  constraint loc_bareme_lignes_code_check CHECK ((code ~ '^[A-Z0-9][A-Z0-9_]{1,39}$'::text))
  constraint loc_bareme_lignes_code_unique UNIQUE NULLS NOT DISTINCT (bareme_id, code, categorie_id)
  constraint loc_bareme_lignes_devis CHECK (((unite <> 'devis'::text) OR (prix_eur IS NULL)))
  constraint loc_bareme_lignes_famille_check CHECK ((famille = ANY (ARRAY['carburant'::text, 'kilometres'::text, 'retard'::text, 'dommage'::text, 'nettoyage'::text, 'frais'::text, 'autre'::text])))
  constraint loc_bareme_lignes_libelle_check CHECK (((char_length(btrim(libelle)) >= 1) AND (char_length(btrim(libelle)) <= 200)))
  constraint loc_bareme_lignes_pkey PRIMARY KEY (id)
  constraint loc_bareme_lignes_prix CHECK (((prix_eur IS NOT NULL) OR (unite = 'devis'::text) OR (famille = 'retard'::text)))
  constraint loc_bareme_lignes_prix_eur_check CHECK ((prix_eur >= (0)::numeric))
  constraint loc_bareme_lignes_regime_tva_check CHECK ((regime_tva = ANY (ARRAY['taxable'::text, 'hors_champ'::text])))
  constraint loc_bareme_lignes_taux_tva_check CHECK (((taux_tva >= (0)::numeric) AND (taux_tva <= (30)::numeric)))
  constraint loc_bareme_lignes_unite_check CHECK ((unite = ANY (ARRAY['huitieme'::text, 'litre'::text, 'km'::text, 'jour_entame'::text, 'forfait'::text, 'devis'::text])))
  policy "membres voient les lignes du bareme" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER loc_bareme_lignes_tracer AFTER INSERT OR DELETE OR UPDATE ON public.loc_bareme_lignes FOR EACH ROW EXECUTE FUNCTION private.tracer('cree_le')
  grants authenticated: SELECT

-- ═══ TABLE public.loc_baremes
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  libelle text not null
  date_effet date not null
  statut text not null default 'publie'::text
  publie_par uuid
  publie_le timestamp with time zone not null default now()
  retire_par uuid
  retire_le timestamp with time zone
  motif_retrait text
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint loc_baremes_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint loc_baremes_client_id_id_key UNIQUE (client_id, id)
  constraint loc_baremes_libelle_check CHECK (((char_length(btrim(libelle)) >= 1) AND (char_length(btrim(libelle)) <= 120)))
  constraint loc_baremes_motif_retrait_check CHECK ((char_length(motif_retrait) <= 300))
  constraint loc_baremes_pkey PRIMARY KEY (id)
  constraint loc_baremes_retrait CHECK (((statut = 'retire'::text) = (retire_le IS NOT NULL)))
  constraint loc_baremes_statut_check CHECK ((statut = ANY (ARRAY['publie'::text, 'retire'::text])))
  policy "membres voient les baremes" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER loc_baremes_toucher BEFORE UPDATE ON public.loc_baremes FOR EACH ROW EXECUTE FUNCTION private.loc_toucher()
  CREATE TRIGGER loc_baremes_tracer AFTER INSERT OR DELETE OR UPDATE ON public.loc_baremes FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: SELECT

-- ═══ TABLE public.loc_categories
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  code text not null
  libelle text not null
  rang smallint
  utilitaire boolean not null default false
  statut text not null default 'active'::text
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint loc_categories_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint loc_categories_client_id_id_key UNIQUE (client_id, id)
  constraint loc_categories_code_check CHECK ((code ~ '^[A-Z0-9][A-Z0-9 _./+-]{0,29}$'::text))
  constraint loc_categories_code_unique UNIQUE (client_id, code)
  constraint loc_categories_libelle_check CHECK (((char_length(btrim(libelle)) >= 1) AND (char_length(btrim(libelle)) <= 120)))
  constraint loc_categories_pkey PRIMARY KEY (id)
  constraint loc_categories_rang_check CHECK (((rang >= 1) AND (rang <= 99)))
  constraint loc_categories_statut_check CHECK ((statut = ANY (ARRAY['a_completer'::text, 'active'::text, 'retiree'::text])))
  policy "gerants et admins creent les categories" INSERT to authenticated using () with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))
  policy "gerants et admins reglent les categories" UPDATE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))
  policy "gerants et admins retirent les categories" DELETE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check ()
  policy "membres voient les categories" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER loc_categories_preparer BEFORE INSERT OR UPDATE OF code ON public.loc_categories FOR EACH ROW EXECUTE FUNCTION private.loc_preparer_categorie()
  CREATE TRIGGER loc_categories_toucher BEFORE UPDATE ON public.loc_categories FOR EACH ROW EXECUTE FUNCTION private.loc_toucher()
  CREATE TRIGGER loc_categories_tracer AFTER INSERT OR DELETE OR UPDATE ON public.loc_categories FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.loc_contrats
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  entite_retour_id uuid
  numero text not null
  reservation_id uuid
  vehicule_id uuid
  categorie_id uuid
  locataire_id uuid
  depart_le timestamp with time zone not null
  retour_prevu_le timestamp with time zone not null
  retour_reel_le timestamp with time zone
  km_depart integer
  km_retour integer
  km_inclus integer
  km_inclus_jour integer
  km_illimite boolean not null default false
  politique_carburant text
  seuil_charge_pct smallint
  tarif_jour_eur numeric(10,2)
  franchise_eur numeric(10,2)
  franchise_reduite_eur numeric(10,2)
  rachat_franchise boolean
  options text[]
  depot_eur numeric(10,2)
  conditions_version text
  statut text not null default 'ouvert'::text
  source text not null
  piece_id uuid
  saisies jsonb not null default '{}'::jsonb
  avertissements jsonb not null default '[]'::jsonb
  disparu_le timestamp with time zone
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint loc_contrats_categorie_fkey FOREIGN KEY (client_id, categorie_id) REFERENCES loc_categories(client_id, id)
  constraint loc_contrats_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint loc_contrats_client_id_id_key UNIQUE (client_id, id)
  constraint loc_contrats_conditions_version_check CHECK ((char_length(conditions_version) <= 80))
  constraint loc_contrats_dates CHECK ((retour_prevu_le > depart_le))
  constraint loc_contrats_depot_eur_check CHECK ((depot_eur >= (0)::numeric))
  constraint loc_contrats_entite_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id)
  constraint loc_contrats_entite_retour_fkey FOREIGN KEY (client_id, entite_retour_id) REFERENCES entites(client_id, id)
  constraint loc_contrats_franchise_eur_check CHECK ((franchise_eur >= (0)::numeric))
  constraint loc_contrats_franchise_reduite_eur_check CHECK ((franchise_reduite_eur >= (0)::numeric))
  constraint loc_contrats_franchises CHECK (((franchise_reduite_eur IS NULL) OR (franchise_eur IS NULL) OR (franchise_reduite_eur <= franchise_eur)))
  constraint loc_contrats_km CHECK (((km_retour IS NULL) OR (km_depart IS NULL) OR (km_retour >= km_depart)))
  constraint loc_contrats_km_depart_check CHECK (((km_depart >= 0) AND (km_depart <= 2000000)))
  constraint loc_contrats_km_inclus_check CHECK (((km_inclus >= 0) AND (km_inclus <= 1000000)))
  constraint loc_contrats_km_inclus_jour_check CHECK (((km_inclus_jour >= 0) AND (km_inclus_jour <= 10000)))
  constraint loc_contrats_km_retour_check CHECK (((km_retour >= 0) AND (km_retour <= 2000000)))
  constraint loc_contrats_locataire_fkey FOREIGN KEY (client_id, locataire_id) REFERENCES loc_locataires(client_id, id)
  constraint loc_contrats_numero_check CHECK (((char_length(numero) >= 1) AND (char_length(numero) <= 80)))
  constraint loc_contrats_numero_unique UNIQUE (client_id, numero)
  constraint loc_contrats_piece_fkey FOREIGN KEY (client_id, piece_id) REFERENCES pieces(client_id, id) ON DELETE SET NULL (piece_id)
  constraint loc_contrats_pkey PRIMARY KEY (id)
  constraint loc_contrats_politique_carburant_check CHECK ((politique_carburant = ANY (ARRAY['plein_contre_plein'::text, 'meme_niveau'::text, 'prepaye'::text, 'seuil'::text])))
  constraint loc_contrats_reservation_fkey FOREIGN KEY (client_id, reservation_id) REFERENCES loc_reservations(client_id, id)
  constraint loc_contrats_retour_reel CHECK (((retour_reel_le IS NULL) OR (retour_reel_le >= depart_le)))
  constraint loc_contrats_seuil CHECK (((seuil_charge_pct IS NULL) OR (politique_carburant = 'seuil'::text)))
  constraint loc_contrats_seuil_charge_pct_check CHECK (((seuil_charge_pct >= 0) AND (seuil_charge_pct <= 100)))
  constraint loc_contrats_seuil_requis CHECK (((politique_carburant IS DISTINCT FROM 'seuil'::text) OR (seuil_charge_pct IS NOT NULL)))
  constraint loc_contrats_source_check CHECK ((source = ANY (ARRAY['export'::text, 'pdf'::text, 'comptoir'::text, 'connecteur'::text, 'saisie'::text])))
  constraint loc_contrats_statut_check CHECK ((statut = ANY (ARRAY['ouvert'::text, 'clos'::text, 'annule'::text])))
  constraint loc_contrats_tarif_jour_eur_check CHECK ((tarif_jour_eur >= (0)::numeric))
  constraint loc_contrats_vehicule_fkey FOREIGN KEY (client_id, vehicule_id) REFERENCES loc_vehicules(client_id, id)
  policy "on voit les contrats de son agence" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (private.voit_entite(client_id, entite_id) OR ((entite_retour_id IS NOT NULL) AND private.voit_entite(client_id, entite_retour_id))))) with check ()
  CREATE TRIGGER loc_contrats_toucher BEFORE UPDATE ON public.loc_contrats FOR EACH ROW EXECUTE FUNCTION private.loc_toucher()
  CREATE TRIGGER loc_contrats_tracer AFTER INSERT OR DELETE OR UPDATE ON public.loc_contrats FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le', 'saisies', 'avertissements')
  grants authenticated: SELECT

-- ═══ TABLE public.loc_contrats_amendements
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  contrat_id uuid not null
  type text not null
  retour_prevu_le timestamp with time zone
  km_inclus integer
  vehicule_id uuid
  sans_frais boolean not null default false
  origine text not null
  politique_id uuid
  motif text
  accorde_par uuid
  accorde_le timestamp with time zone not null default now()
  cle text
  cree_le timestamp with time zone not null default now()
  constraint loc_amendements_cle_unique UNIQUE (client_id, cle)
  constraint loc_amendements_client_id_id_key UNIQUE (client_id, id)
  constraint loc_amendements_contrat_fkey FOREIGN KEY (client_id, contrat_id) REFERENCES loc_contrats(client_id, id) ON DELETE CASCADE
  constraint loc_amendements_entite_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id)
  constraint loc_amendements_heure CHECK (((type = ANY (ARRAY['prolongation'::text, 'restitution_decalee'::text])) = (retour_prevu_le IS NOT NULL)))
  constraint loc_amendements_politique_fkey FOREIGN KEY (client_id, politique_id) REFERENCES politiques(client_id, id)
  constraint loc_amendements_vehicule CHECK (((type = 'changement_vehicule'::text) = (vehicule_id IS NOT NULL)))
  constraint loc_amendements_vehicule_fkey FOREIGN KEY (client_id, vehicule_id) REFERENCES loc_vehicules(client_id, id)
  constraint loc_contrats_amendements_cle_check CHECK ((char_length(cle) <= 200))
  constraint loc_contrats_amendements_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint loc_contrats_amendements_km_inclus_check CHECK (((km_inclus >= 0) AND (km_inclus <= 1000000)))
  constraint loc_contrats_amendements_motif_check CHECK ((char_length(motif) <= 500))
  constraint loc_contrats_amendements_origine_check CHECK ((origine = ANY (ARRAY['export'::text, 'assistance'::text, 'agence'::text, 'pdf'::text])))
  constraint loc_contrats_amendements_pkey PRIMARY KEY (id)
  constraint loc_contrats_amendements_type_check CHECK ((type = ANY (ARRAY['prolongation'::text, 'restitution_decalee'::text, 'retard_offert'::text, 'changement_vehicule'::text])))
  policy "on voit les amendements des contrats qu'on voit" SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM loc_contrats c
  WHERE ((c.client_id = loc_contrats_amendements.client_id) AND (c.id = loc_contrats_amendements.contrat_id))))) with check ()
  CREATE TRIGGER loc_amendements_preparer BEFORE INSERT ON public.loc_contrats_amendements FOR EACH ROW EXECUTE FUNCTION private.loc_preparer_amendement()
  CREATE TRIGGER loc_contrats_amendements_tracer AFTER INSERT OR DELETE ON public.loc_contrats_amendements FOR EACH ROW EXECUTE FUNCTION private.tracer('motif')
  grants authenticated: SELECT

-- ═══ TABLE public.loc_facture_lignes
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  facture_id uuid not null
  rang smallint not null
  code text not null
  libelle text not null
  famille text not null
  unite text
  quantite numeric(12,3) not null
  prix_unitaire numeric(10,2)
  montant_ht numeric(12,2) not null
  regime_tva text not null
  taux_tva numeric(4,2)
  montant_tva numeric(12,2) not null
  montant_ttc numeric(12,2) not null
  bareme_ligne_id uuid
  proposition_ligne_id uuid
  preuves jsonb not null default '[]'::jsonb
  cree_le timestamp with time zone not null default now()
  constraint loc_facture_lignes_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint loc_facture_lignes_client_id_id_key UNIQUE (client_id, id)
  constraint loc_facture_lignes_facture_fkey FOREIGN KEY (client_id, facture_id) REFERENCES loc_factures(client_id, id)
  constraint loc_facture_lignes_pkey PRIMARY KEY (id)
  constraint loc_facture_lignes_rang_unique UNIQUE (facture_id, rang)
  constraint loc_facture_lignes_regime_tva_check CHECK ((regime_tva = ANY (ARRAY['taxable'::text, 'hors_champ'::text])))
  policy "on voit les lignes des factures qu'on voit" SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM loc_factures f
  WHERE ((f.client_id = loc_facture_lignes.client_id) AND (f.id = loc_facture_lignes.facture_id))))) with check ()
  CREATE TRIGGER loc_facture_lignes_garder BEFORE DELETE OR UPDATE ON public.loc_facture_lignes FOR EACH ROW EXECUTE FUNCTION private.loc_garder_ligne_facture()
  CREATE TRIGGER loc_facture_lignes_tracer AFTER INSERT OR DELETE OR UPDATE ON public.loc_facture_lignes FOR EACH ROW EXECUTE FUNCTION private.tracer('cree_le')
  grants authenticated: SELECT

-- ═══ TABLE public.loc_factures
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  entite_emettrice_id uuid not null
  contrat_id uuid not null
  contrat_numero text not null
  proposition_id uuid not null
  demande_id uuid not null
  nature text not null
  annee smallint not null
  numero integer not null
  reference text not null
  emise_le timestamp with time zone not null default now()
  date_facture date not null
  echeance_le date not null
  a_debiter_avant date
  statut text not null default 'emise'::text
  total_ht numeric(12,2) not null
  total_tva numeric(12,2) not null
  total_ttc numeric(12,2) not null
  emetteur jsonb not null
  destinataire jsonb not null
  mentions jsonb not null default '{}'::jsonb
  regle_le timestamp with time zone
  mode_reglement text
  litige_motif text
  envoi_id uuid
  pdf_piece_id uuid
  pdf_sha256 text
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint loc_factures_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint loc_factures_client_id_id_key UNIQUE (client_id, id)
  constraint loc_factures_contrat_fkey FOREIGN KEY (client_id, contrat_id) REFERENCES loc_contrats(client_id, id)
  constraint loc_factures_demande_fkey FOREIGN KEY (demande_id) REFERENCES demandes_validation(id)
  constraint loc_factures_emettrice_fkey FOREIGN KEY (client_id, entite_emettrice_id) REFERENCES entites(client_id, id)
  constraint loc_factures_entite_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id)
  constraint loc_factures_litige_motif_check CHECK ((char_length(litige_motif) <= 500))
  constraint loc_factures_mode_reglement_check CHECK ((mode_reglement = ANY (ARRAY['depot'::text, 'comptoir'::text, 'virement'::text, 'carte'::text, 'autre'::text])))
  constraint loc_factures_nature_check CHECK ((nature = ANY (ARRAY['frais'::text, 'dommages'::text])))
  constraint loc_factures_numero_check CHECK ((numero >= 1))
  constraint loc_factures_numero_unique UNIQUE (client_id, entite_emettrice_id, annee, numero)
  constraint loc_factures_pdf_sha256_check CHECK ((pdf_sha256 ~ '^[0-9a-f]{64}$'::text))
  constraint loc_factures_pkey PRIMARY KEY (id)
  constraint loc_factures_proposition_fkey FOREIGN KEY (client_id, proposition_id) REFERENCES loc_propositions(client_id, id)
  constraint loc_factures_reference_check CHECK ((reference ~ '^FA-[0-9]{4}-[0-9]{6}$'::text))
  constraint loc_factures_reference_unique UNIQUE (client_id, reference)
  constraint loc_factures_reglement CHECK (((statut = 'reglee'::text) = ((regle_le IS NOT NULL) AND (mode_reglement IS NOT NULL))))
  constraint loc_factures_statut_check CHECK ((statut = ANY (ARRAY['emise'::text, 'envoyee'::text, 'reglee'::text, 'litige'::text, 'avoir'::text])))
  constraint loc_factures_total_ht_check CHECK ((total_ht >= (0)::numeric))
  constraint loc_factures_total_ttc_check CHECK ((total_ttc >= (0)::numeric))
  constraint loc_factures_total_tva_check CHECK ((total_tva >= (0)::numeric))
  policy "on voit les factures des contrats qu'on voit" SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM loc_contrats c
  WHERE ((c.client_id = loc_factures.client_id) AND (c.id = loc_factures.contrat_id))))) with check ()
  CREATE TRIGGER loc_factures_exiger_demande BEFORE INSERT ON public.loc_factures FOR EACH ROW EXECUTE FUNCTION private.loc_exiger_demande_approuvee()
  CREATE TRIGGER loc_factures_garder BEFORE DELETE OR UPDATE ON public.loc_factures FOR EACH ROW EXECUTE FUNCTION private.loc_garder_facture()
  CREATE TRIGGER loc_factures_toucher BEFORE UPDATE ON public.loc_factures FOR EACH ROW EXECUTE FUNCTION private.loc_toucher()
  CREATE TRIGGER loc_factures_tracer AFTER INSERT OR DELETE OR UPDATE ON public.loc_factures FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le', 'destinataire')
  grants authenticated: SELECT

-- ═══ TABLE public.loc_locataires
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  type text not null default 'particulier'::text
  ref_source text
  nom text
  prenom text
  raison_sociale text
  siren text
  email text
  telephone text
  adresse text
  cle_rapprochement text
  conserver_jusqu_au date
  anonymise_le timestamp with time zone
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint loc_locataires_adresse_check CHECK ((char_length(adresse) <= 500))
  constraint loc_locataires_anonyme CHECK (((anonymise_le IS NULL) OR ((ref_source IS NULL) AND (nom IS NULL) AND (prenom IS NULL) AND (raison_sociale IS NULL) AND (siren IS NULL) AND (email IS NULL) AND (telephone IS NULL) AND (adresse IS NULL) AND (cle_rapprochement IS NULL))))
  constraint loc_locataires_cle_rapprochement_check CHECK ((cle_rapprochement ~ '^[0-9a-f]{64}$'::text))
  constraint loc_locataires_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint loc_locataires_client_id_id_key UNIQUE (client_id, id)
  constraint loc_locataires_email_check CHECK ((char_length(email) <= 320))
  constraint loc_locataires_nom_check CHECK ((char_length(nom) <= 120))
  constraint loc_locataires_pkey PRIMARY KEY (id)
  constraint loc_locataires_prenom_check CHECK ((char_length(prenom) <= 120))
  constraint loc_locataires_raison_sociale_check CHECK ((char_length(raison_sociale) <= 200))
  constraint loc_locataires_ref_source_check CHECK ((char_length(ref_source) <= 80))
  constraint loc_locataires_siren_check CHECK ((siren ~ '^[0-9]{9}$'::text))
  constraint loc_locataires_telephone_check CHECK ((char_length(telephone) <= 40))
  constraint loc_locataires_type_check CHECK ((type = ANY (ARRAY['particulier'::text, 'professionnel'::text])))
  policy "on voit les locataires de ce qu'on voit" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]) OR (EXISTS ( SELECT 1
   FROM loc_contrats c
  WHERE ((c.client_id = loc_locataires.client_id) AND (c.locataire_id = loc_locataires.id)))) OR (EXISTS ( SELECT 1
   FROM loc_reservations r
  WHERE ((r.client_id = loc_locataires.client_id) AND (r.locataire_id = loc_locataires.id))))))) with check ()
  CREATE TRIGGER loc_locataires_toucher BEFORE UPDATE ON public.loc_locataires FOR EACH ROW EXECUTE FUNCTION private.loc_toucher()
  CREATE TRIGGER loc_locataires_tracer AFTER INSERT OR DELETE OR UPDATE ON public.loc_locataires FOR EACH ROW EXECUTE FUNCTION private.tracer('+type', '+conserver_jusqu_au', '+anonymise_le')
  grants authenticated: SELECT

-- ═══ TABLE public.loc_proposition_lignes
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  proposition_id uuid not null
  rang smallint not null
  nature text not null
  famille text not null
  code text not null
  libelle text not null
  bareme_ligne_id uuid
  unite text
  quantite numeric(12,3) not null default 0
  prix_unitaire numeric(10,2)
  montant_ht numeric(12,2) not null default 0
  regime_tva text not null
  taux_tva numeric(4,2)
  montant_tva numeric(12,2) not null default 0
  montant_ttc numeric(12,2) not null default 0
  statut text not null default 'chiffree'::text
  plafonnee boolean not null default false
  hors_bareme boolean not null default false
  calcul jsonb not null default '{}'::jsonb
  preuves jsonb not null default '[]'::jsonb
  cree_le timestamp with time zone not null default now()
  constraint loc_proposition_lignes_bareme_fkey FOREIGN KEY (client_id, bareme_ligne_id) REFERENCES loc_bareme_lignes(client_id, id)
  constraint loc_proposition_lignes_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint loc_proposition_lignes_client_id_id_key UNIQUE (client_id, id)
  constraint loc_proposition_lignes_code_check CHECK ((code ~ '^[A-Z0-9][A-Z0-9_]{1,39}$'::text))
  constraint loc_proposition_lignes_famille_check CHECK ((famille = ANY (ARRAY['carburant'::text, 'kilometres'::text, 'retard'::text, 'dommage'::text, 'nettoyage'::text, 'frais'::text, 'autre'::text])))
  constraint loc_proposition_lignes_libelle_check CHECK (((char_length(libelle) >= 1) AND (char_length(libelle) <= 200)))
  constraint loc_proposition_lignes_nature_check CHECK ((nature = ANY (ARRAY['frais'::text, 'dommage'::text])))
  constraint loc_proposition_lignes_pkey PRIMARY KEY (id)
  constraint loc_proposition_lignes_preuves_check CHECK ((jsonb_typeof(preuves) = 'array'::text))
  constraint loc_proposition_lignes_proposition_fkey FOREIGN KEY (client_id, proposition_id) REFERENCES loc_propositions(client_id, id) ON DELETE CASCADE
  constraint loc_proposition_lignes_quantite_check CHECK ((quantite >= (0)::numeric))
  constraint loc_proposition_lignes_rang_unique UNIQUE (proposition_id, rang)
  constraint loc_proposition_lignes_regime_tva_check CHECK ((regime_tva = ANY (ARRAY['taxable'::text, 'hors_champ'::text])))
  constraint loc_proposition_lignes_statut_check CHECK ((statut = ANY (ARRAY['chiffree'::text, 'a_chiffrer'::text, 'preuve_manquante'::text])))
  constraint loc_proposition_lignes_unite_check CHECK ((unite = ANY (ARRAY['huitieme'::text, 'litre'::text, 'km'::text, 'jour_entame'::text, 'forfait'::text, 'devis'::text])))
  policy "on voit les lignes des propositions qu'on voit" SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM loc_propositions p
  WHERE ((p.client_id = loc_proposition_lignes.client_id) AND (p.id = loc_proposition_lignes.proposition_id))))) with check ()
  CREATE TRIGGER loc_proposition_lignes_tracer AFTER INSERT OR DELETE OR UPDATE ON public.loc_proposition_lignes FOR EACH ROW EXECUTE FUNCTION private.tracer('cree_le')
  grants authenticated: SELECT

-- ═══ TABLE public.loc_propositions
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  contrat_id uuid not null
  version integer not null default 1
  statut text not null default 'calculee'::text
  source text not null
  bareme_id uuid
  hors_bareme boolean not null default false
  non_contradictoire boolean not null default false
  entrees jsonb not null default '{}'::jsonb
  avertissements jsonb not null default '[]'::jsonb
  calcul_retard jsonb
  calcul_km jsonb
  calcul_carburant jsonb
  plafond_eur numeric(10,2)
  total_ht numeric(12,2) not null default 0
  total_tva numeric(12,2) not null default 0
  total_ttc numeric(12,2) not null default 0
  total_frais_ttc numeric(12,2) not null default 0
  total_dommages_ttc numeric(12,2) not null default 0
  demande_id uuid
  calculee_le timestamp with time zone not null default now()
  calculee_par uuid
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint loc_propositions_bareme_fkey FOREIGN KEY (client_id, bareme_id) REFERENCES loc_baremes(client_id, id)
  constraint loc_propositions_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint loc_propositions_client_id_id_key UNIQUE (client_id, id)
  constraint loc_propositions_contrat_fkey FOREIGN KEY (client_id, contrat_id) REFERENCES loc_contrats(client_id, id) ON DELETE CASCADE
  constraint loc_propositions_entite_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id)
  constraint loc_propositions_pkey PRIMARY KEY (id)
  constraint loc_propositions_source_check CHECK ((source = ANY (ARRAY['edl'::text, 'saisie'::text, 'export'::text])))
  constraint loc_propositions_statut_check CHECK ((statut = ANY (ARRAY['calculee'::text, 'preuve_manquante'::text, 'rien_a_facturer'::text, 'a_valider'::text, 'validee'::text, 'facturee'::text, 'refusee'::text, 'expiree'::text, 'remplacee'::text])))
  constraint loc_propositions_version_check CHECK ((version >= 1))
  constraint loc_propositions_version_unique UNIQUE (client_id, contrat_id, version)
  policy "on voit les propositions des contrats qu'on voit" SELECT to authenticated using ((EXISTS ( SELECT 1
   FROM loc_contrats c
  WHERE ((c.client_id = loc_propositions.client_id) AND (c.id = loc_propositions.contrat_id))))) with check ()
  CREATE TRIGGER loc_propositions_toucher BEFORE UPDATE ON public.loc_propositions FOR EACH ROW EXECUTE FUNCTION private.loc_toucher()
  CREATE TRIGGER loc_propositions_tracer AFTER INSERT OR DELETE OR UPDATE ON public.loc_propositions FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: SELECT

-- ═══ TABLE public.loc_reglages
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  duree_contrats_ans smallint not null default 5
  maj_le timestamp with time zone not null default now()
  tolerance_retard_min smallint not null default 59
  emetteur jsonb not null default '{}'::jsonb
  echeance_pro_jours smallint not null default 30
  tva_sur_debits boolean not null default false
  constraint loc_reglages_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint loc_reglages_client_id_key UNIQUE (client_id)
  constraint loc_reglages_duree_contrats_ans_check CHECK (((duree_contrats_ans >= 5) AND (duree_contrats_ans <= 10)))
  constraint loc_reglages_echeance_pro_jours_check CHECK (((echeance_pro_jours >= 0) AND (echeance_pro_jours <= 60)))
  constraint loc_reglages_emetteur_check CHECK (((jsonb_typeof(emetteur) = 'object'::text) AND ((emetteur - ARRAY['adresse'::text, 'numero_tva'::text, 'forme_juridique'::text, 'capital'::text, 'rcs'::text, 'email'::text, 'telephone'::text, 'site'::text]) = '{}'::jsonb)))
  constraint loc_reglages_pkey PRIMARY KEY (id)
  constraint loc_reglages_tolerance_retard_min_check CHECK (((tolerance_retard_min >= 0) AND (tolerance_retard_min <= 1440)))
  policy "le gerant change les reglages de tavaro" UPDATE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text])) with check (private.a_un_role(client_id, ARRAY['gerant'::text]))
  policy "le gerant pose les reglages de tavaro" INSERT to authenticated using () with check (private.a_un_role(client_id, ARRAY['gerant'::text]))
  policy "membres lisent les reglages de tavaro" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER loc_reglages_toucher BEFORE UPDATE ON public.loc_reglages FOR EACH ROW EXECUTE FUNCTION private.loc_toucher()
  CREATE TRIGGER loc_reglages_tracer AFTER INSERT OR UPDATE ON public.loc_reglages FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: INSERT,SELECT,UPDATE

-- ═══ TABLE public.loc_releves
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid
  nature text not null
  source text not null
  cle text not null
  instantane_id uuid
  releve_id uuid
  piece_id uuid
  lu_le timestamp with time zone not null
  applique_le timestamp with time zone not null default now()
  lignes integer not null default 0
  creations integer not null default 0
  modifications integer not null default 0
  disparitions integer not null default 0
  inchangees integer not null default 0
  rejetees integer not null default 0
  erreurs jsonb not null default '[]'::jsonb
  avertissements jsonb not null default '[]'::jsonb
  constraint loc_releves_cle_check CHECK (((char_length(cle) >= 1) AND (char_length(cle) <= 200)))
  constraint loc_releves_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint loc_releves_client_id_id_key UNIQUE (client_id, id)
  constraint loc_releves_entite_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id)
  constraint loc_releves_nature_check CHECK ((nature = ANY (ARRAY['flotte'::text, 'reservations'::text, 'contrats'::text])))
  constraint loc_releves_pkey PRIMARY KEY (id)
  constraint loc_releves_source_check CHECK ((source = ANY (ARRAY['export'::text, 'pdf'::text, 'comptoir'::text, 'connecteur'::text])))
  constraint loc_releves_une_fois UNIQUE (client_id, cle)
  policy "on voit les releves de son agence, la direction tous" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]) OR ((entite_id IS NOT NULL) AND private.voit_entite(client_id, entite_id))))) with check ()
  CREATE TRIGGER loc_releves_tracer AFTER INSERT ON public.loc_releves FOR EACH ROW EXECUTE FUNCTION private.tracer('+nature', '+source', '+instantane_id', '+piece_id', '+lu_le', '+lignes', '+creations', '+modifications', '+disparitions', '+rejetees')
  grants authenticated: SELECT

-- ═══ TABLE public.loc_reservations
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  ref_source text not null
  canal text
  categorie_id uuid
  vehicule_id uuid
  locataire_id uuid
  entite_retour_id uuid
  depart_prevu_le timestamp with time zone not null
  retour_prevu_le timestamp with time zone not null
  statut text not null default 'confirmee'::text
  prepaye boolean
  acompte_eur numeric(10,2)
  vol text
  notes text
  disparue_le timestamp with time zone
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint loc_reservations_acompte_eur_check CHECK ((acompte_eur >= (0)::numeric))
  constraint loc_reservations_canal_check CHECK ((char_length(canal) <= 60))
  constraint loc_reservations_categorie_fkey FOREIGN KEY (client_id, categorie_id) REFERENCES loc_categories(client_id, id)
  constraint loc_reservations_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint loc_reservations_client_id_id_key UNIQUE (client_id, id)
  constraint loc_reservations_dates CHECK ((retour_prevu_le > depart_prevu_le))
  constraint loc_reservations_entite_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id)
  constraint loc_reservations_entite_retour_fkey FOREIGN KEY (client_id, entite_retour_id) REFERENCES entites(client_id, id)
  constraint loc_reservations_locataire_fkey FOREIGN KEY (client_id, locataire_id) REFERENCES loc_locataires(client_id, id)
  constraint loc_reservations_notes_check CHECK ((char_length(notes) <= 2000))
  constraint loc_reservations_pkey PRIMARY KEY (id)
  constraint loc_reservations_ref_source_check CHECK (((char_length(ref_source) >= 1) AND (char_length(ref_source) <= 80)))
  constraint loc_reservations_ref_unique UNIQUE (client_id, ref_source)
  constraint loc_reservations_statut_check CHECK ((statut = ANY (ARRAY['option'::text, 'confirmee'::text, 'annulee'::text, 'no_show'::text, 'convertie'::text])))
  constraint loc_reservations_vehicule_fkey FOREIGN KEY (client_id, vehicule_id) REFERENCES loc_vehicules(client_id, id)
  constraint loc_reservations_vol_check CHECK ((char_length(vol) <= 20))
  policy "on voit les reservations de son agence" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (private.voit_entite(client_id, entite_id) OR ((entite_retour_id IS NOT NULL) AND private.voit_entite(client_id, entite_retour_id))))) with check ()
  CREATE TRIGGER loc_reservations_toucher BEFORE UPDATE ON public.loc_reservations FOR EACH ROW EXECUTE FUNCTION private.loc_toucher()
  CREATE TRIGGER loc_reservations_tracer AFTER INSERT OR DELETE OR UPDATE ON public.loc_reservations FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le', 'notes')
  grants authenticated: SELECT

-- ═══ TABLE public.loc_series_factures
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  annee smallint not null
  dernier integer not null default 0
  maj_le timestamp with time zone not null default now()
  prefixe text not null default 'FA'::text
  constraint loc_series_factures_annee_check CHECK (((annee >= 2020) AND (annee <= 2100)))
  constraint loc_series_factures_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint loc_series_factures_dernier_check CHECK ((dernier >= 0))
  constraint loc_series_factures_entite_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id)
  constraint loc_series_factures_pkey PRIMARY KEY (id)
  constraint loc_series_factures_prefixe_check CHECK ((prefixe = ANY (ARRAY['FA'::text, 'AV'::text])))
  constraint loc_series_factures_unique UNIQUE (client_id, entite_id, prefixe, annee)
  policy "membres voient les series de factures" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER loc_series_factures_tracer AFTER INSERT OR DELETE OR UPDATE ON public.loc_series_factures FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: SELECT

-- ═══ TABLE public.loc_vehicules
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid
  immatriculation text not null
  format_plaque text not null
  vin text
  modele text
  categorie_id uuid
  energie text
  reservoir_l numeric(6,1)
  batterie_kwh numeric(6,1)
  mise_en_circulation date
  statut text not null default 'actif'::text
  km_dernier integer
  km_dernier_le timestamp with time zone
  ref_source text
  disparu_le timestamp with time zone
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint loc_vehicules_batterie_kwh_check CHECK (((batterie_kwh > (0)::numeric) AND (batterie_kwh < (500)::numeric)))
  constraint loc_vehicules_categorie_fkey FOREIGN KEY (client_id, categorie_id) REFERENCES loc_categories(client_id, id)
  constraint loc_vehicules_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint loc_vehicules_client_id_id_key UNIQUE (client_id, id)
  constraint loc_vehicules_energie_check CHECK ((energie = ANY (ARRAY['essence'::text, 'diesel'::text, 'electrique'::text, 'hybride'::text, 'hybride_rechargeable'::text, 'gpl'::text, 'gnv'::text, 'superethanol'::text, 'hydrogene'::text, 'autre'::text])))
  constraint loc_vehicules_entite_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id)
  constraint loc_vehicules_format_plaque_check CHECK ((format_plaque = ANY (ARRAY['siv'::text, 'fni'::text, 'autre'::text])))
  constraint loc_vehicules_immatriculation_check CHECK (((char_length(immatriculation) >= 2) AND (char_length(immatriculation) <= 20)))
  constraint loc_vehicules_km_dernier_check CHECK (((km_dernier >= 0) AND (km_dernier <= 2000000)))
  constraint loc_vehicules_mise_en_circulation_check CHECK ((mise_en_circulation >= '1950-01-01'::date))
  constraint loc_vehicules_modele_check CHECK ((char_length(modele) <= 120))
  constraint loc_vehicules_pkey PRIMARY KEY (id)
  constraint loc_vehicules_plaque_unique UNIQUE (client_id, immatriculation)
  constraint loc_vehicules_ref_source_check CHECK ((char_length(ref_source) <= 80))
  constraint loc_vehicules_reservoir_l_check CHECK (((reservoir_l > (0)::numeric) AND (reservoir_l < (500)::numeric)))
  constraint loc_vehicules_statut_check CHECK ((statut = ANY (ARRAY['a_confirmer'::text, 'actif'::text, 'sorti'::text])))
  constraint loc_vehicules_vin_check CHECK ((vin ~ '^[A-HJ-NPR-Z0-9]{17}$'::text))
  policy "gerants et admins ajoutent un vehicule" INSERT to authenticated using () with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))
  policy "gerants et admins reglent la flotte" UPDATE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))
  policy "membres voient la flotte du reseau" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER loc_vehicules_preparer BEFORE INSERT OR UPDATE OF immatriculation, vin ON public.loc_vehicules FOR EACH ROW EXECUTE FUNCTION private.loc_preparer_vehicule()
  CREATE TRIGGER loc_vehicules_toucher BEFORE UPDATE ON public.loc_vehicules FOR EACH ROW EXECUTE FUNCTION private.loc_toucher()
  CREATE TRIGGER loc_vehicules_tracer AFTER INSERT OR DELETE OR UPDATE ON public.loc_vehicules FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: INSERT,SELECT,UPDATE


-- ══════════════════ VUES ══════════════════

-- ═══ VUE public.loc_fraicheur
 SELECT a.client_id,
    a.entite_id,
    a.code,
    n.nature,
    d.lu_le,
    d.lu_le IS NULL OR d.lu_le < (now() - a.releve_rythme * 1.5::double precision) AS perime
   FROM loc_agences a
     CROSS JOIN ( VALUES ('flotte'::text), ('reservations'::text), ('contrats'::text)) n(nature)
     LEFT JOIN LATERAL ( SELECT max(r.lu_le) AS lu_le
           FROM loc_releves r
          WHERE r.client_id = a.client_id AND r.nature = n.nature AND (r.source = ANY (ARRAY['export'::text, 'connecteur'::text])) AND (r.entite_id = a.entite_id OR r.entite_id IS NULL)) d ON true
  WHERE a.actif;


-- ══════════════════ FONCTIONS (public et private, telles quelles) ══════════════════

-- ═══ FONCTION private.loc_amender_contrat
CREATE OR REPLACE FUNCTION private.loc_amender_contrat(p_contrat uuid, p_type text, p_retour_prevu_le timestamp with time zone DEFAULT NULL::timestamp with time zone, p_km_inclus integer DEFAULT NULL::integer, p_motif text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  c public.loc_contrats;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Un contrat s''amende par une personne connectée.' using errcode = '42501';
  end if;
  select * into c from public.loc_contrats where id = p_contrat for update;
  if not found
     or not exists (select 1 from public.comptes k where k.user_id = v_uid and k.client_id = c.client_id) then
    raise exception 'Contrat introuvable.' using errcode = 'P0002';
  end if;
  if not private.a_un_role(c.client_id, array['gerant', 'admin', 'valideur'])
     or not (private.voit_entite(c.client_id, c.entite_id)
             or (c.entite_retour_id is not null and private.voit_entite(c.client_id, c.entite_retour_id))) then
    raise exception 'Seul le chef d''agence ou la direction amende un contrat.' using errcode = '42501';
  end if;
  if c.statut = 'annule' then
    raise exception 'Ce contrat est annulé.' using errcode = '23514';
  end if;
  if p_type not in ('prolongation', 'restitution_decalee', 'retard_offert') then
    raise exception 'Amendement inconnu : %.', coalesce(p_type, 'vide') using errcode = '22023';
  end if;
  if p_type in ('prolongation', 'restitution_decalee')
     and (p_retour_prevu_le is null or p_retour_prevu_le <= c.depart_le) then
    raise exception 'Un nouveau retour prévu, après le départ, est requis.' using errcode = '22023';
  end if;
  if p_type = 'retard_offert' and p_retour_prevu_le is not null then
    raise exception 'Un retard offert ne déplace pas le retour prévu.' using errcode = '22023';
  end if;
  if p_km_inclus is not null and (p_km_inclus < 0 or p_type = 'retard_offert') then
    raise exception 'Forfait kilométrique refusé.' using errcode = '22023';
  end if;

  insert into public.loc_contrats_amendements (client_id, contrat_id, type, retour_prevu_le, km_inclus, sans_frais,
                                               origine, motif, accorde_par)
  values (c.client_id, c.id, p_type, p_retour_prevu_le, p_km_inclus, p_type in ('restitution_decalee', 'retard_offert'),
          'agence', left(p_motif, 500), v_uid)
  returning id into v_id;
  return v_id;
end $function$


-- ═══ FONCTION private.loc_annuler_attente
CREATE OR REPLACE FUNCTION private.loc_annuler_attente(p_client uuid, p_contrat uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p record;
  n integer := 0;
begin
  for p in select x.id, x.demande_id, x.entite_id from public.loc_propositions x
           where x.client_id = p_client and x.contrat_id = p_contrat and x.statut = 'a_valider' loop
    update public.demandes_validation set statut = 'annulee' where id = p.demande_id and statut = 'en_attente';
    update public.loc_propositions set statut = 'remplacee' where id = p.id;
    perform private.journaliser_module(p_client, 'tavaro', 'tavaro.demande_annulee', 'loc_propositions', p.id::text,
      jsonb_build_object('demande', p.demande_id, 'motif', 'nouveau calcul'), p.entite_id);
    n := n + 1;
  end loop;
  return n;
end $function$


-- ═══ FONCTION private.loc_anonymiser
CREATE OR REPLACE FUNCTION private.loc_anonymiser(p_client uuid, p_locataire uuid, p_motif text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.loc_locataires
     set ref_source = null, nom = null, prenom = null, raison_sociale = null, siren = null, email = null,
         telephone = null, adresse = null, cle_rapprochement = null, anonymise_le = now()
   where client_id = p_client and id = p_locataire and anonymise_le is null;
  if not found then
    return false;
  end if;
  update public.loc_reservations set notes = null, vol = null
   where client_id = p_client and locataire_id = p_locataire and (notes is not null or vol is not null);
  perform private.journaliser_module(p_client, 'tavaro', 'tavaro.locataire_anonymise', 'loc_locataires',
                                     p_locataire::text, jsonb_build_object('motif', p_motif));
  return true;
end $function$


-- ═══ FONCTION private.loc_anonymiser_locataire
CREATE OR REPLACE FUNCTION private.loc_anonymiser_locataire(p_locataire uuid, p_motif text DEFAULT 'demande'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  l public.loc_locataires;
begin
  if v_uid is null then
    raise exception 'Une anonymisation est décidée par une personne connectée.' using errcode = '42501';
  end if;
  select * into l from public.loc_locataires where id = p_locataire for update;
  if not found or not exists (select 1 from public.comptes c where c.user_id = v_uid and c.client_id = l.client_id) then
    raise exception 'Locataire introuvable.' using errcode = 'P0002';
  end if;
  if not private.a_un_role(l.client_id, array['gerant']) then
    raise exception 'Seul le gérant efface une personne.' using errcode = '42501';
  end if;
  if p_motif not in ('demande', 'decision_du_loueur') then
    raise exception 'Motif inconnu : %.', coalesce(p_motif, 'vide') using errcode = '22023';
  end if;
  if l.anonymise_le is not null then
    return jsonb_build_object('locataire', l.id, 'deja_anonyme', true);
  end if;
  if exists (select 1 from public.loc_contrats c
             where c.client_id = l.client_id and c.locataire_id = l.id and c.statut = 'ouvert')
     or exists (select 1 from public.loc_reservations r
                where r.client_id = l.client_id and r.locataire_id = l.id and r.statut in ('option', 'confirmee')
                  and r.disparue_le is null and r.depart_prevu_le > now()) then
    raise exception 'Une location est en cours ou à venir : l''anonymisation attendra sa fin.' using errcode = '55000';
  end if;
  perform private.loc_anonymiser(l.client_id, l.id, p_motif);
  return jsonb_build_object('locataire', l.id, 'deja_anonyme', false);
end $function$


-- ═══ FONCTION private.loc_appliquer_contrat
CREATE OR REPLACE FUNCTION private.loc_appliquer_contrat(p_client uuid, p_ligne jsonb, p_ctx jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v jsonb := coalesce(p_ligne -> 'valeurs', '{}'::jsonb);
  v_lu_le timestamptz := coalesce((p_ctx ->> 'lu_le')::timestamptz, now());
  v_complement boolean := coalesce(p_ctx ->> 'priorite', 'source') = 'complement';
  v_numero text := private.loc_lire_texte(v, 'numero', 80);
  c public.loc_contrats;
  n public.loc_contrats;
  v_existe boolean;
  v_neuf jsonb := '{}'::jsonb;
  v_avert jsonb := '[]'::jsonb;
  v_agence record;
  v_retour record;
  v_texte text;
  v_code text;
  v_id uuid;
  v_km_precedent integer;
  k text;
begin
  if v_numero is null then
    raise exception 'Champ obligatoire manquant : numero.' using errcode = '22023';
  end if;
  select * into c from public.loc_contrats where client_id = p_client and numero = v_numero for update;
  v_existe := found;

  if coalesce(p_ligne ->> 'nature', 'ajout') = 'disparition' then
    if not v_existe or c.disparu_le is not null then
      return jsonb_build_object('effet', 'inchangee');
    end if;
    update public.loc_contrats set disparu_le = v_lu_le where id = c.id;
    return jsonb_build_object('effet', 'disparition', 'avertissements',
      jsonb_build_array(jsonb_build_object('code', 'contrat_disparu_du_logiciel', 'numero', v_numero)));
  end if;

  -- Les agences : le départ, puis le retour (fuseau de chacune pour ses heures).
  select * into v_agence from private.loc_resoudre_agence(p_client, v ->> 'agence',
    coalesce(c.entite_id, (p_ctx ->> 'entite')::uuid));
  if v_agence.entite_id is null then
    raise exception 'Champ obligatoire manquant : agence.' using errcode = '22023';
  end if;
  if private.loc_porte(p_ligne, 'agence') then
    v_neuf := v_neuf || jsonb_build_object('entite_id', v_agence.entite_id);
  end if;
  if private.loc_porte(p_ligne, 'agence_retour') and nullif(btrim(v ->> 'agence_retour'), '') is not null then
    select * into v_retour from private.loc_resoudre_agence(p_client, v ->> 'agence_retour', null);
    v_neuf := v_neuf || jsonb_build_object('entite_retour_id', v_retour.entite_id);
  else
    select * into v_retour from private.loc_resoudre_agence(p_client, null,
      coalesce(c.entite_retour_id, v_agence.entite_id));
  end if;

  -- Les heures, au fuseau de l'agence qui les vit.
  if private.loc_porte(p_ligne, 'depart_le') then
    v_neuf := v_neuf || jsonb_build_object('depart_le', private.loc_lire_instant(v, 'depart_le', v_agence.fuseau));
  end if;
  if private.loc_porte(p_ligne, 'retour_prevu_le') then
    v_neuf := v_neuf || jsonb_build_object('retour_prevu_le', private.loc_lire_instant(v, 'retour_prevu_le', v_retour.fuseau));
  end if;
  if private.loc_porte(p_ligne, 'retour_reel_le') then
    v_neuf := v_neuf || jsonb_build_object('retour_reel_le', private.loc_lire_instant(v, 'retour_reel_le', v_retour.fuseau));
  end if;
  foreach k in array array['depart_le', 'retour_prevu_le', 'retour_reel_le'] loop
    v_texte := private.loc_heure_douteuse(v ->> k, case k when 'depart_le' then v_agence.fuseau else v_retour.fuseau end);
    if v_texte is not null then
      v_avert := v_avert || jsonb_build_array(jsonb_build_object('code', 'heure_' || v_texte, 'champ', k));
    end if;
  end loop;

  -- Les conditions signées.
  foreach k in array array['km_depart', 'km_retour', 'km_inclus', 'km_inclus_jour', 'seuil_charge_pct'] loop
    if private.loc_porte(p_ligne, k) then
      v_neuf := v_neuf || jsonb_build_object(k, private.loc_lire_entier(v, k));
    end if;
  end loop;
  if private.loc_porte(p_ligne, 'km_illimite') then
    v_neuf := v_neuf || jsonb_build_object('km_illimite', coalesce(private.loc_lire_booleen(v, 'km_illimite'), false));
  end if;
  if private.loc_porte(p_ligne, 'rachat_franchise') then
    v_neuf := v_neuf || jsonb_build_object('rachat_franchise', private.loc_lire_booleen(v, 'rachat_franchise'));
  end if;
  foreach k in array array['tarif_jour', 'franchise', 'franchise_reduite', 'depot'] loop
    if private.loc_porte(p_ligne, k) then
      v_neuf := v_neuf || jsonb_build_object(k || '_eur', private.loc_lire_decimal(v, k));
    end if;
  end loop;
  if private.loc_porte(p_ligne, 'politique_carburant') then
    v_code := private.loc_politique_carburant(v ->> 'politique_carburant');
    if v_code is null and nullif(btrim(v ->> 'politique_carburant'), '') is not null then
      v_avert := v_avert || jsonb_build_array(jsonb_build_object('code', 'politique_inconnue', 'champ', 'politique_carburant'));
    elsif v_code is not null or p_ligne ? 'champs' then
      v_neuf := v_neuf || jsonb_build_object('politique_carburant', v_code);
    end if;
  end if;
  if private.loc_porte(p_ligne, 'options') then
    v_neuf := v_neuf || jsonb_build_object('options', to_jsonb(private.loc_options(v ->> 'options')));
  end if;
  if private.loc_porte(p_ligne, 'conditions_version') then
    v_neuf := v_neuf || jsonb_build_object('conditions_version', private.loc_lire_texte(v, 'conditions_version', 80));
  end if;
  if private.loc_porte(p_ligne, 'statut') then
    v_code := private.loc_statut_contrat(v ->> 'statut');
    if v_code is null and nullif(btrim(v ->> 'statut'), '') is not null then
      v_avert := v_avert || jsonb_build_array(jsonb_build_object('code', 'statut_inconnu', 'champ', 'statut'));
    elsif v_code is not null then
      v_neuf := v_neuf || jsonb_build_object('statut', v_code);
    end if;
  end if;

  -- Ce que le contrat désigne : réservation, catégorie, véhicule, locataire.
  if private.loc_porte(p_ligne, 'reservation') then
    select r.id into v_id from public.loc_reservations r
    where r.client_id = p_client and r.ref_source = private.loc_lire_texte(v, 'reservation', 80);
    if v_id is null and nullif(btrim(v ->> 'reservation'), '') is not null then
      v_avert := v_avert || jsonb_build_array(jsonb_build_object('code', 'reservation_inconnue', 'champ', 'reservation'));
    else
      v_neuf := v_neuf || jsonb_build_object('reservation_id', v_id);
    end if;
  end if;
  if private.loc_porte(p_ligne, 'categorie') then
    v_neuf := v_neuf || jsonb_build_object('categorie_id', private.loc_resoudre_categorie(p_client, v ->> 'categorie'));
  end if;
  if private.loc_porte(p_ligne, 'immatriculation') then
    v_neuf := v_neuf || jsonb_build_object('vehicule_id',
      private.loc_resoudre_vehicule(p_client, v ->> 'immatriculation', v_agence.entite_id,
        coalesce((v_neuf ->> 'categorie_id')::uuid, c.categorie_id)));
  end if;
  if exists (select 1 from jsonb_object_keys(v) x where x like 'locataire\_%') then
    v_id := private.loc_resoudre_locataire(p_client, v);
    if v_id is not null then
      v_neuf := v_neuf || jsonb_build_object('locataire_id', v_id);
    end if;
  end if;

  -- Les saisies humaines ne s'écrasent jamais ; un complément ne remplit que les vides.
  select f.p_avert, f.garder into v_avert, v_neuf
  from private.loc_filtrer(to_jsonb(c), v_neuf, coalesce(c.saisies, '{}'::jsonb), v_complement, v_avert) f;

  if not v_existe then
    c.id := gen_random_uuid();
    c.client_id := p_client;
    c.numero := v_numero;
    c.entite_id := v_agence.entite_id;
    c.statut := 'ouvert';
    c.source := coalesce(p_ctx ->> 'source', 'export');
    c.km_illimite := false;
    c.saisies := '{}'::jsonb;
    c.avertissements := '[]'::jsonb;
  end if;
  n := jsonb_populate_record(c, to_jsonb(c) || v_neuf);
  n.disparu_le := null;
  n.piece_id := coalesce(n.piece_id, (p_ctx ->> 'piece')::uuid);
  if n.retour_reel_le is not null and n.statut = 'ouvert' then
    n.statut := 'clos';
  end if;

  -- Les contrôles : l'essentiel rejette la ligne ; le douteux avertit, sans rien deviner.
  if n.depart_le is null or n.retour_prevu_le is null then
    raise exception 'Champ obligatoire manquant : %.',
      case when n.depart_le is null then 'depart_le' else 'retour_prevu_le' end using errcode = '22023';
  end if;
  if n.retour_prevu_le <= n.depart_le then
    raise exception 'Le retour prévu doit suivre le départ (retour_prevu_le).' using errcode = '22023';
  end if;
  if n.retour_reel_le is not null and n.retour_reel_le < n.depart_le then
    raise exception 'Le retour réel précède le départ (retour_reel_le).' using errcode = '22023';
  end if;
  if n.km_depart is not null and n.km_retour is not null and n.km_retour < n.km_depart then
    n.km_depart := c.km_depart;
    n.km_retour := c.km_retour;
    v_avert := v_avert || jsonb_build_array(jsonb_build_object('code', 'kilometrage_incoherent', 'champ', 'km_retour'));
  end if;
  if n.politique_carburant = 'seuil' and n.seuil_charge_pct is null then
    n.politique_carburant := c.politique_carburant;
    v_avert := v_avert || jsonb_build_array(jsonb_build_object('code', 'seuil_absent', 'champ', 'seuil_charge_pct'));
  end if;
  if n.seuil_charge_pct is not null and n.politique_carburant is distinct from 'seuil' then
    n.seuil_charge_pct := null;
  end if;
  if n.franchise_reduite_eur is not null and n.franchise_eur is not null and n.franchise_reduite_eur > n.franchise_eur then
    n.franchise_reduite_eur := c.franchise_reduite_eur;
    v_avert := v_avert || jsonb_build_array(jsonb_build_object('code', 'franchise_reduite_superieure', 'champ', 'franchise_reduite'));
  end if;
  if n.vehicule_id is not null and n.km_depart is not null then
    select max(x.km_retour) into v_km_precedent from public.loc_contrats x
    where x.client_id = p_client and x.vehicule_id = n.vehicule_id and x.id <> n.id and x.depart_le < n.depart_le;
    if v_km_precedent is not null and n.km_depart < v_km_precedent then
      v_avert := v_avert || jsonb_build_array(jsonb_build_object('code', 'compteur_decroissant', 'champ', 'km_depart'));
    end if;
  end if;

  -- Un écart avec le PDF signé reste signalé tant qu'une personne ne l'a pas tranché.
  n.avertissements := v_avert || coalesce((
    select jsonb_agg(a) from jsonb_array_elements(c.avertissements) a
    where a ->> 'code' = 'ecart_avec_le_logiciel'
      and not exists (select 1 from jsonb_array_elements(v_avert) b
                      where b ->> 'code' = a ->> 'code' and b ->> 'champ' = a ->> 'champ')), '[]'::jsonb);

  if not v_existe then
    insert into public.loc_contrats (id, client_id, entite_id, entite_retour_id, numero, reservation_id, vehicule_id,
      categorie_id, locataire_id, depart_le, retour_prevu_le, retour_reel_le, km_depart, km_retour, km_inclus,
      km_inclus_jour, km_illimite, politique_carburant, seuil_charge_pct, tarif_jour_eur, franchise_eur,
      franchise_reduite_eur, rachat_franchise, options, depot_eur, conditions_version, statut, source, piece_id,
      avertissements)
    values (n.id, n.client_id, n.entite_id, n.entite_retour_id, n.numero, n.reservation_id, n.vehicule_id,
      n.categorie_id, n.locataire_id, n.depart_le, n.retour_prevu_le, n.retour_reel_le, n.km_depart, n.km_retour,
      n.km_inclus, n.km_inclus_jour, n.km_illimite, n.politique_carburant, n.seuil_charge_pct, n.tarif_jour_eur,
      n.franchise_eur, n.franchise_reduite_eur, n.rachat_franchise, n.options, n.depot_eur, n.conditions_version,
      n.statut, n.source, n.piece_id, n.avertissements);
  elsif (to_jsonb(n) - 'maj_le') <> (to_jsonb(c) - 'maj_le') then
    update public.loc_contrats
       set entite_id = n.entite_id, entite_retour_id = n.entite_retour_id, reservation_id = n.reservation_id,
           vehicule_id = n.vehicule_id, categorie_id = n.categorie_id, locataire_id = n.locataire_id,
           depart_le = n.depart_le, retour_prevu_le = n.retour_prevu_le, retour_reel_le = n.retour_reel_le,
           km_depart = n.km_depart, km_retour = n.km_retour, km_inclus = n.km_inclus, km_inclus_jour = n.km_inclus_jour,
           km_illimite = n.km_illimite, politique_carburant = n.politique_carburant,
           seuil_charge_pct = n.seuil_charge_pct, tarif_jour_eur = n.tarif_jour_eur, franchise_eur = n.franchise_eur,
           franchise_reduite_eur = n.franchise_reduite_eur, rachat_franchise = n.rachat_franchise,
           options = n.options, depot_eur = n.depot_eur, conditions_version = n.conditions_version,
           statut = n.statut, piece_id = n.piece_id, avertissements = n.avertissements, disparu_le = n.disparu_le
     where id = c.id;
  else
    return jsonb_build_object('effet', 'inchangee', 'avertissements', v_avert);
  end if;

  -- Ce que le contrat entraîne : la réservation est convertie ; le compteur du véhicule avance.
  if n.reservation_id is not null then
    update public.loc_reservations set statut = 'convertie'
     where client_id = p_client and id = n.reservation_id and statut in ('option', 'confirmee');
  end if;
  if n.vehicule_id is not null and n.km_retour is not null and n.retour_reel_le is not null then
    update public.loc_vehicules
       set km_dernier = n.km_retour, km_dernier_le = n.retour_reel_le
     where client_id = p_client and id = n.vehicule_id
       and (km_dernier_le is null or km_dernier_le < n.retour_reel_le);
  end if;
  return jsonb_build_object('effet', case when v_existe then 'modification' else 'creation' end,
                            'avertissements', v_avert);
end $function$


-- ═══ FONCTION private.loc_appliquer_decision
CREATE OR REPLACE FUNCTION private.loc_appliquer_decision(p_charge jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.loc_propositions;
  d public.demandes_validation;
  v_demande uuid := (p_charge ->> 'demande')::uuid;
  v_statut text := p_charge ->> 'statut';
  v_tentative integer;
  v_nouvelle uuid;
  v_numero text;
  v_factures uuid[];
  v_envoi jsonb;
  v_erreur text;
begin
  if p_charge ->> 'objet_type' <> 'loc_propositions' or p_charge ->> 'objet_id' is null then
    return jsonb_build_object('statut', 'ignoree');
  end if;
  select * into p from public.loc_propositions where id = (p_charge ->> 'objet_id')::uuid for update;
  if not found then
    return jsonb_build_object('statut', 'proposition_introuvable');
  end if;
  if p.demande_id is distinct from v_demande then
    return jsonb_build_object('statut', 'demande_depassee', 'proposition', p.id);
  end if;
  select * into d from public.demandes_validation where id = v_demande;
  select c.numero into v_numero from public.loc_contrats c where c.id = p.contrat_id;

  if v_statut = 'approuvee' then
    update public.loc_propositions set statut = 'validee' where id = p.id;
    perform private.journaliser_module(p.client_id, 'tavaro', 'tavaro.proposition_validee', 'loc_propositions', p.id::text,
      jsonb_build_object('demande', v_demande, 'decideurs', p_charge -> 'decideurs', 'montant', p.total_ttc), p.entite_id);
    begin
      v_factures := private.loc_emettre_factures(p.client_id, p.id);
    exception when others then
      v_erreur := left(sqlstate || ' ' || sqlerrm, 500);
      update public.demandes_validation set statut = 'echec_execution', motif_echec = v_erreur where id = v_demande and statut = 'approuvee';
      perform private.lever_alerte_module(p.client_id, 'tavaro', 'critique',
        format('La facture du contrat %s (%s € TTC) n''a pas pu être émise.', coalesce(v_numero, '?'), replace(p.total_ttc::text, '.', ',')),
        jsonb_build_object('proposition', p.id, 'demande', v_demande, 'erreur', v_erreur), 'facture:echec:' || p.id::text, false, null);
      return jsonb_build_object('statut', 'validee', 'facturation', 'echec', 'erreur', v_erreur, 'proposition', p.id);
    end;
    -- Le courriel, adossé à la même décision : c'est son départ qui l'exécute.
    v_envoi := private.loc_envoyer_factures(p.client_id, p.id);
    if v_envoi ->> 'statut' in ('rien', 'non_regle', 'sans_adresse') then
      update public.demandes_validation set statut = 'executee', motif_echec = null
       where id = v_demande and statut in ('approuvee', 'echec_execution');
    end if;
    return jsonb_build_object('statut', 'facturee', 'proposition', p.id, 'factures', to_jsonb(v_factures), 'envoi', v_envoi);
  elsif v_statut = 'rejetee' then
    update public.loc_propositions set statut = 'refusee' where id = p.id;
    perform private.journaliser_module(p.client_id, 'tavaro', 'tavaro.proposition_refusee', 'loc_propositions', p.id::text,
      jsonb_build_object('demande', v_demande, 'decideurs', p_charge -> 'decideurs'), p.entite_id);
    return jsonb_build_object('statut', 'refusee', 'proposition', p.id);
  elsif v_statut = 'expiree' then
    v_tentative := coalesce((d.payload ->> 'tentative')::integer, 1);
    if v_tentative >= 2 then
      update public.loc_propositions set statut = 'expiree' where id = p.id;
      perform private.lever_alerte_module(p.client_id, 'tavaro', 'attention',
        format('La proposition de facture du contrat %s (%s € TTC) n''a pas été décidée deux jours de suite.',
               coalesce(v_numero, '?'), replace(p.total_ttc::text, '.', ',')),
        jsonb_build_object('proposition', p.id, 'demande', v_demande, 'montant', p.total_ttc, 'tentatives', v_tentative),
        'proposition_expiree:' || p.id::text, true, null);
      perform private.journaliser_module(p.client_id, 'tavaro', 'tavaro.proposition_expiree', 'loc_propositions', p.id::text,
        jsonb_build_object('demande', v_demande, 'tentatives', v_tentative), p.entite_id);
      return jsonb_build_object('statut', 'expiree', 'proposition', p.id);
    end if;
    v_nouvelle := private.loc_deposer_demande(p.client_id, p.id, v_tentative + 1);
    perform private.journaliser_module(p.client_id, 'tavaro', 'tavaro.demande_redeposee', 'loc_propositions', p.id::text,
      jsonb_build_object('demande_expiree', v_demande, 'demande', v_nouvelle, 'tentative', v_tentative + 1), p.entite_id);
    return jsonb_build_object('statut', 'redeposee', 'proposition', p.id, 'demande', v_nouvelle);
  end if;
  return jsonb_build_object('statut', 'ignoree');
end $function$


-- ═══ FONCTION private.loc_appliquer_plafond
CREATE OR REPLACE FUNCTION private.loc_appliquer_plafond(p_montants numeric[], p_plafond numeric)
 RETURNS numeric[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  v_reste numeric := p_plafond;
  v_res numeric[] := '{}';
  m numeric;
  v numeric;
begin
  if p_plafond is null then
    return coalesce(p_montants, '{}');
  end if;
  foreach m in array coalesce(p_montants, '{}'::numeric[]) loop
    v := least(m, greatest(v_reste, 0));
    v_reste := v_reste - v;
    v_res := array_append(v_res, v);
  end loop;
  return v_res;
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


-- ═══ FONCTION private.loc_appliquer_reservation
CREATE OR REPLACE FUNCTION private.loc_appliquer_reservation(p_client uuid, p_ligne jsonb, p_ctx jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v jsonb := coalesce(p_ligne -> 'valeurs', '{}'::jsonb);
  v_lu_le timestamptz := coalesce((p_ctx ->> 'lu_le')::timestamptz, now());
  v_ref text := private.loc_lire_texte(v, 'reference', 80);
  c public.loc_reservations;
  n public.loc_reservations;
  v_existe boolean;
  v_neuf jsonb := '{}'::jsonb;
  v_avert jsonb := '[]'::jsonb;
  v_agence record;
  v_retour record;
  v_statut text;
  v_heure text;
  k text;
begin
  if v_ref is null then
    raise exception 'Champ obligatoire manquant : reference.' using errcode = '22023';
  end if;
  select * into c from public.loc_reservations where client_id = p_client and ref_source = v_ref for update;
  v_existe := found;

  if coalesce(p_ligne ->> 'nature', 'ajout') = 'disparition' then
    if not v_existe or c.disparue_le is not null then
      return jsonb_build_object('effet', 'inchangee');
    end if;
    update public.loc_reservations set disparue_le = v_lu_le where id = c.id;
    return jsonb_build_object('effet', 'disparition');
  end if;

  select * into v_agence from private.loc_resoudre_agence(p_client, v ->> 'agence',
    coalesce(c.entite_id, (p_ctx ->> 'entite')::uuid));
  if v_agence.entite_id is null then
    raise exception 'Champ obligatoire manquant : agence.' using errcode = '22023';
  end if;
  if private.loc_porte(p_ligne, 'agence') then
    v_neuf := v_neuf || jsonb_build_object('entite_id', v_agence.entite_id);
  end if;
  select * into v_retour from private.loc_resoudre_agence(p_client, null, coalesce(c.entite_retour_id, v_agence.entite_id));
  if private.loc_porte(p_ligne, 'agence_retour') then
    if nullif(btrim(v ->> 'agence_retour'), '') is null then
      v_neuf := v_neuf || jsonb_build_object('entite_retour_id', null);
    else
      select * into v_retour from private.loc_resoudre_agence(p_client, v ->> 'agence_retour', null);
      v_neuf := v_neuf || jsonb_build_object('entite_retour_id', v_retour.entite_id);
    end if;
  end if;
  if private.loc_porte(p_ligne, 'depart_prevu_le') then
    v_neuf := v_neuf || jsonb_build_object('depart_prevu_le', private.loc_lire_instant(v, 'depart_prevu_le', v_agence.fuseau));
  end if;
  if private.loc_porte(p_ligne, 'retour_prevu_le') then
    v_neuf := v_neuf || jsonb_build_object('retour_prevu_le', private.loc_lire_instant(v, 'retour_prevu_le', v_retour.fuseau));
  end if;
  foreach k in array array['depart_prevu_le', 'retour_prevu_le'] loop
    v_heure := private.loc_heure_douteuse(v ->> k, case k when 'depart_prevu_le' then v_agence.fuseau else v_retour.fuseau end);
    if v_heure is not null then
      v_avert := v_avert || jsonb_build_array(jsonb_build_object('code', 'heure_' || v_heure, 'champ', k));
    end if;
  end loop;
  if private.loc_porte(p_ligne, 'categorie') then
    v_neuf := v_neuf || jsonb_build_object('categorie_id', private.loc_resoudre_categorie(p_client, v ->> 'categorie'));
  end if;
  if private.loc_porte(p_ligne, 'immatriculation') then
    v_neuf := v_neuf || jsonb_build_object('vehicule_id',
      private.loc_resoudre_vehicule(p_client, v ->> 'immatriculation', v_agence.entite_id,
        coalesce((v_neuf ->> 'categorie_id')::uuid, c.categorie_id)));
  end if;
  if private.loc_porte(p_ligne, 'statut') then
    v_statut := private.loc_statut_reservation(v ->> 'statut');
    if v_statut is null and nullif(btrim(v ->> 'statut'), '') is not null then
      v_avert := v_avert || jsonb_build_array(jsonb_build_object('code', 'statut_inconnu', 'champ', 'statut'));
    elsif v_statut is not null then
      v_neuf := v_neuf || jsonb_build_object('statut', v_statut);
    end if;
  end if;
  if private.loc_porte(p_ligne, 'canal') then
    v_neuf := v_neuf || jsonb_build_object('canal', lower(private.loc_lire_texte(v, 'canal', 60)));
  end if;
  if private.loc_porte(p_ligne, 'prepaye') then
    v_neuf := v_neuf || jsonb_build_object('prepaye', private.loc_lire_booleen(v, 'prepaye'));
  end if;
  if private.loc_porte(p_ligne, 'acompte') then
    v_neuf := v_neuf || jsonb_build_object('acompte_eur', private.loc_lire_decimal(v, 'acompte'));
  end if;
  if private.loc_porte(p_ligne, 'vol') then
    v_neuf := v_neuf || jsonb_build_object('vol', upper(private.loc_lire_texte(v, 'vol', 20)));
  end if;
  if private.loc_porte(p_ligne, 'notes') then
    v_neuf := v_neuf || jsonb_build_object('notes', private.loc_lire_texte(v, 'notes', 2000));
  end if;
  if exists (select 1 from jsonb_object_keys(v) x where x like 'locataire\_%') then
    v_neuf := v_neuf || jsonb_build_object('locataire_id', coalesce(private.loc_resoudre_locataire(p_client, v), c.locataire_id));
  end if;

  if not v_existe then
    c.id := gen_random_uuid();
    c.client_id := p_client;
    c.ref_source := v_ref;
    c.entite_id := v_agence.entite_id;
    c.statut := 'confirmee';
  end if;
  n := jsonb_populate_record(c, to_jsonb(c) || v_neuf);
  n.disparue_le := null;
  if n.depart_prevu_le is null or n.retour_prevu_le is null then
    raise exception 'Champ obligatoire manquant : %.',
      case when n.depart_prevu_le is null then 'depart_prevu_le' else 'retour_prevu_le' end using errcode = '22023';
  end if;
  if n.retour_prevu_le <= n.depart_prevu_le then
    raise exception 'Le retour prévu doit suivre le départ (retour_prevu_le).' using errcode = '22023';
  end if;

  if not v_existe then
    insert into public.loc_reservations (id, client_id, entite_id, ref_source, canal, categorie_id, vehicule_id,
                                         locataire_id, entite_retour_id, depart_prevu_le, retour_prevu_le, statut,
                                         prepaye, acompte_eur, vol, notes)
    values (n.id, n.client_id, n.entite_id, n.ref_source, n.canal, n.categorie_id, n.vehicule_id, n.locataire_id,
            n.entite_retour_id, n.depart_prevu_le, n.retour_prevu_le, n.statut, n.prepaye, n.acompte_eur, n.vol, n.notes);
    return jsonb_build_object('effet', 'creation', 'avertissements', v_avert);
  end if;
  if (to_jsonb(n) - 'maj_le') = (to_jsonb(c) - 'maj_le') then
    return jsonb_build_object('effet', 'inchangee', 'avertissements', v_avert);
  end if;
  update public.loc_reservations
     set entite_id = n.entite_id, canal = n.canal, categorie_id = n.categorie_id, vehicule_id = n.vehicule_id,
         locataire_id = n.locataire_id, entite_retour_id = n.entite_retour_id, depart_prevu_le = n.depart_prevu_le,
         retour_prevu_le = n.retour_prevu_le, statut = n.statut, prepaye = n.prepaye, acompte_eur = n.acompte_eur,
         vol = n.vol, notes = n.notes, disparue_le = n.disparue_le
   where id = c.id;
  return jsonb_build_object('effet', 'modification', 'avertissements', v_avert);
end $function$


-- ═══ FONCTION private.loc_appliquer_vehicule
CREATE OR REPLACE FUNCTION private.loc_appliquer_vehicule(p_client uuid, p_ligne jsonb, p_ctx jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v jsonb := coalesce(p_ligne -> 'valeurs', '{}'::jsonb);
  v_lu_le timestamptz := coalesce((p_ctx ->> 'lu_le')::timestamptz, now());
  v_plaque record;
  c public.loc_vehicules;
  n public.loc_vehicules;
  v_existe boolean;
  v_neuf jsonb := '{}'::jsonb;
  v_avert jsonb := '[]'::jsonb;
  v_agence record;
  v_km integer;
  v_km_le timestamptz;
begin
  select * into v_plaque from private.loc_plaque(v ->> 'immatriculation');
  if v_plaque.plaque is null then
    raise exception 'Champ obligatoire manquant : immatriculation.' using errcode = '22023';
  end if;
  select * into c from public.loc_vehicules where client_id = p_client and immatriculation = v_plaque.plaque for update;
  v_existe := found;

  if coalesce(p_ligne ->> 'nature', 'ajout') = 'disparition' then
    if not v_existe or c.disparu_le is not null then
      return jsonb_build_object('effet', 'inchangee');
    end if;
    update public.loc_vehicules set disparu_le = v_lu_le where id = c.id;
    perform private.lever_alerte_module(p_client, 'tavaro', 'attention',
      'Des véhicules ne figurent plus dans le fichier de flotte : à sortir ou à expliquer',
      jsonb_build_object('vehicule', c.id), 'releve:vehicules_disparus', true);
    return jsonb_build_object('effet', 'disparition');
  end if;

  if private.loc_porte(p_ligne, 'agence') then
    select * into v_agence from private.loc_resoudre_agence(p_client, v ->> 'agence', null);
    v_neuf := v_neuf || jsonb_build_object('entite_id', v_agence.entite_id);
  end if;
  if private.loc_porte(p_ligne, 'categorie') then
    v_neuf := v_neuf || jsonb_build_object('categorie_id', private.loc_resoudre_categorie(p_client, v ->> 'categorie'));
  end if;
  if private.loc_porte(p_ligne, 'vin') then
    if upper(regexp_replace(coalesce(v ->> 'vin', ''), '\s', '', 'g')) ~ '^[A-HJ-NPR-Z0-9]{17}$' then
      v_neuf := v_neuf || jsonb_build_object('vin', upper(regexp_replace(v ->> 'vin', '\s', '', 'g')));
    elsif nullif(btrim(v ->> 'vin'), '') is not null then
      v_avert := v_avert || jsonb_build_array(jsonb_build_object('code', 'vin_illisible', 'plaque', v_plaque.plaque));
    end if;
  end if;
  if private.loc_porte(p_ligne, 'modele') then
    v_neuf := v_neuf || jsonb_build_object('modele', private.loc_lire_texte(v, 'modele', 120));
  end if;
  if private.loc_porte(p_ligne, 'energie') then
    v_neuf := v_neuf || jsonb_build_object('energie', private.loc_energie(v ->> 'energie'));
    if private.loc_energie(v ->> 'energie') = 'autre' then
      v_avert := v_avert || jsonb_build_array(jsonb_build_object('code', 'energie_inconnue', 'plaque', v_plaque.plaque));
    end if;
  end if;
  if private.loc_porte(p_ligne, 'reservoir_l') then
    v_neuf := v_neuf || jsonb_build_object('reservoir_l', private.loc_lire_decimal(v, 'reservoir_l'));
  end if;
  if private.loc_porte(p_ligne, 'batterie_kwh') then
    v_neuf := v_neuf || jsonb_build_object('batterie_kwh', private.loc_lire_decimal(v, 'batterie_kwh'));
  end if;
  if private.loc_porte(p_ligne, 'mise_en_circulation') then
    v_neuf := v_neuf || jsonb_build_object('mise_en_circulation', private.loc_lire_date(v, 'mise_en_circulation'));
  end if;
  if private.loc_porte(p_ligne, 'ref') then
    v_neuf := v_neuf || jsonb_build_object('ref_source', private.loc_lire_texte(v, 'ref', 80));
  end if;

  if not v_existe then
    c.id := gen_random_uuid();
    c.client_id := p_client;
    c.immatriculation := v_plaque.plaque;
    c.format_plaque := v_plaque.format;
    c.statut := 'actif';
    c.entite_id := (p_ctx ->> 'entite')::uuid;
  end if;
  n := jsonb_populate_record(c, to_jsonb(c) || v_neuf);
  if v_existe and c.statut = 'a_confirmer' then
    n.statut := 'actif';
  elsif v_existe and c.statut = 'sorti' then
    v_avert := v_avert || jsonb_build_array(jsonb_build_object('code', 'vehicule_sorti_present', 'plaque', v_plaque.plaque));
  end if;
  if v_plaque.format <> 'siv' then
    v_avert := v_avert || jsonb_build_array(jsonb_build_object('code', 'plaque_' || v_plaque.format, 'plaque', v_plaque.plaque));
  end if;
  v_km := private.loc_lire_entier(v, 'km');
  if v_km is not null then
    v_km_le := coalesce(private.loc_lire_instant(v, 'km_le',
                 coalesce((select e.fuseau from public.entites e where e.client_id = p_client and e.id = n.entite_id),
                          'Europe/Paris'), false), v_lu_le);
    if n.km_dernier_le is null or v_km_le >= n.km_dernier_le then
      if n.km_dernier is not null and v_km < n.km_dernier then
        v_avert := v_avert || jsonb_build_array(jsonb_build_object('code', 'compteur_decroissant', 'plaque', v_plaque.plaque));
      end if;
      n.km_dernier := v_km;
      n.km_dernier_le := v_km_le;
    end if;
  end if;
  n.disparu_le := null;

  if not v_existe then
    insert into public.loc_vehicules (id, client_id, entite_id, immatriculation, format_plaque, vin, modele, categorie_id,
                                      energie, reservoir_l, batterie_kwh, mise_en_circulation, statut, km_dernier,
                                      km_dernier_le, ref_source)
    values (n.id, n.client_id, n.entite_id, n.immatriculation, n.format_plaque, n.vin, n.modele, n.categorie_id,
            n.energie, n.reservoir_l, n.batterie_kwh, n.mise_en_circulation, n.statut, n.km_dernier,
            n.km_dernier_le, n.ref_source);
    return jsonb_build_object('effet', 'creation', 'avertissements', v_avert);
  end if;
  if (to_jsonb(n) - 'maj_le') = (to_jsonb(c) - 'maj_le') then
    return jsonb_build_object('effet', 'inchangee', 'avertissements', v_avert);
  end if;
  update public.loc_vehicules
     set entite_id = n.entite_id, vin = n.vin, modele = n.modele, categorie_id = n.categorie_id, energie = n.energie,
         reservoir_l = n.reservoir_l, batterie_kwh = n.batterie_kwh, mise_en_circulation = n.mise_en_circulation,
         statut = n.statut, km_dernier = n.km_dernier, km_dernier_le = n.km_dernier_le, ref_source = n.ref_source,
         disparu_le = n.disparu_le
   where id = c.id;
  return jsonb_build_object('effet', 'modification', 'avertissements', v_avert);
end $function$


-- ═══ FONCTION private.loc_arrondir
CREATE OR REPLACE FUNCTION private.loc_arrondir(p numeric)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE STRICT
 SET search_path TO ''
AS $function$
  select round(p, 2)
$function$


-- ═══ FONCTION private.loc_bareme_en_vigueur
CREATE OR REPLACE FUNCTION private.loc_bareme_en_vigueur(p_client uuid, p_date date)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select b.id from public.loc_baremes b
  where b.client_id = p_client and b.statut = 'publie' and b.date_effet <= p_date
  order by b.date_effet desc limit 1
$function$


-- ═══ FONCTION private.loc_calc_carburant
CREATE OR REPLACE FUNCTION private.loc_calc_carburant(p_politique text, p_depart_8 integer, p_retour_8 integer, p_reservoir_l numeric, p_prix_huitieme numeric, p_prix_litre numeric, p_frais_service numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  v_manquant integer;
  v_litres numeric;
  v_montant numeric;
begin
  if p_depart_8 not between 0 and 8 or p_retour_8 not between 0 and 8 then
    raise exception 'Un niveau de carburant se compte en huitièmes, de 0 à 8.' using errcode = '22023';
  end if;
  if p_politique = 'prepaye' then
    return jsonb_build_object('montant_ht', 0, 'motif', 'prepaye', 'a_verifier', false);
  elsif p_politique = 'seuil' then
    return jsonb_build_object('montant_ht', 0, 'motif', 'voir_charge', 'a_verifier', false);
  elsif coalesce(p_politique, '') not in ('plein_contre_plein', 'meme_niveau') then
    return jsonb_build_object('montant_ht', 0, 'motif', 'politique_inconnue', 'a_verifier', true);
  end if;
  if p_depart_8 is null or p_retour_8 is null then
    return jsonb_build_object('montant_ht', 0, 'motif', 'niveau_inconnu', 'a_verifier', true);
  end if;
  v_manquant := greatest(0, p_depart_8 - p_retour_8);
  if v_manquant = 0 then
    return jsonb_build_object('manquant', 0, 'montant_ht', 0, 'motif', 'niveau_rendu_suffisant', 'a_verifier', false);
  end if;
  if p_prix_huitieme is not null then
    return jsonb_build_object('manquant', v_manquant, 'unite', 'huitieme', 'quantite', v_manquant,
                              'prix_unitaire', p_prix_huitieme, 'montant_ht', round(v_manquant * p_prix_huitieme, 2),
                              'a_verifier', false);
  elsif p_prix_litre is not null then
    if p_reservoir_l is null or p_reservoir_l <= 0 then
      return jsonb_build_object('manquant', v_manquant, 'montant_ht', 0, 'motif', 'reservoir_inconnu', 'a_verifier', true);
    end if;
    v_litres := round(v_manquant * p_reservoir_l / 8, 2);
    v_montant := round(v_litres * p_prix_litre, 2) + coalesce(p_frais_service, 0);
    return jsonb_build_object('manquant', v_manquant, 'unite', 'litre', 'quantite', v_litres,
                              'prix_unitaire', p_prix_litre, 'frais_service', coalesce(p_frais_service, 0),
                              'montant_ht', round(v_montant, 2), 'a_verifier', false);
  end if;
  return jsonb_build_object('manquant', v_manquant, 'montant_ht', 0, 'motif', 'poste_absent_du_bareme', 'a_verifier', true);
end $function$


-- ═══ FONCTION private.loc_calc_charge
CREATE OR REPLACE FUNCTION private.loc_calc_charge(p_seuil_pct integer, p_retour_pct integer, p_forfait numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
begin
  if p_seuil_pct is null or p_retour_pct is null then
    return jsonb_build_object('montant_ht', 0, 'motif', 'niveau_inconnu', 'a_verifier', true);
  end if;
  if p_retour_pct >= p_seuil_pct then
    return jsonb_build_object('montant_ht', 0, 'motif', 'charge_suffisante', 'a_verifier', false);
  end if;
  if p_forfait is null then
    return jsonb_build_object('montant_ht', 0, 'motif', 'poste_absent_du_bareme', 'a_verifier', true);
  end if;
  return jsonb_build_object('unite', 'forfait', 'quantite', 1, 'prix_unitaire', p_forfait,
                            'montant_ht', round(p_forfait, 2), 'a_verifier', false);
end $function$


-- ═══ FONCTION private.loc_calc_km
CREATE OR REPLACE FUNCTION private.loc_calc_km(p_km_depart integer, p_km_retour integer, p_km_inclus integer, p_km_inclus_jour integer, p_km_illimite boolean, p_jours integer, p_heures numeric, p_prix_km numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  v_parcourus integer;
  v_inclus integer;
  v_dep integer;
begin
  if coalesce(p_km_illimite, false) then
    return jsonb_build_object('montant_ht', 0, 'motif', 'illimite', 'a_verifier', false);
  end if;
  if p_km_depart is null or p_km_retour is null then
    return jsonb_build_object('montant_ht', 0, 'motif', 'compteur_inconnu', 'a_verifier', true);
  end if;
  if p_km_retour < p_km_depart then
    return jsonb_build_object('montant_ht', 0, 'motif', 'compteur_decroissant', 'a_verifier', true);
  end if;
  v_parcourus := p_km_retour - p_km_depart;
  if p_heures is not null and p_heures > 0 and v_parcourus / p_heures > 150 then
    return jsonb_build_object('parcourus', v_parcourus, 'montant_ht', 0, 'motif', 'kilometrage_implausible', 'a_verifier', true);
  end if;
  v_inclus := coalesce(p_km_inclus, p_km_inclus_jour * greatest(p_jours, 1));
  if v_inclus is null then
    return jsonb_build_object('parcourus', v_parcourus, 'montant_ht', 0, 'motif', 'forfait_inconnu', 'a_verifier', true);
  end if;
  v_dep := greatest(0, v_parcourus - v_inclus);
  if v_dep = 0 then
    return jsonb_build_object('parcourus', v_parcourus, 'inclus', v_inclus, 'depassement', 0, 'montant_ht', 0,
                              'motif', 'dans_le_forfait', 'a_verifier', false);
  end if;
  if p_prix_km is null then
    return jsonb_build_object('parcourus', v_parcourus, 'inclus', v_inclus, 'depassement', v_dep, 'montant_ht', 0,
                              'motif', 'poste_absent_du_bareme', 'a_verifier', true);
  end if;
  return jsonb_build_object('parcourus', v_parcourus, 'inclus', v_inclus, 'depassement', v_dep, 'unite', 'km',
                            'quantite', v_dep, 'prix_unitaire', p_prix_km, 'montant_ht', round(v_dep * p_prix_km, 2),
                            'a_verifier', false);
end $function$


-- ═══ FONCTION private.loc_calc_retard
CREATE OR REPLACE FUNCTION private.loc_calc_retard(p_retour_prevu timestamp with time zone, p_retour_reel timestamp with time zone, p_fuseau text, p_tolerance_min integer, p_prix_jour numeric, p_offert boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  v_min integer;
  v_jours integer;
begin
  if p_retour_reel is null then
    return jsonb_build_object('montant_ht', 0, 'motif', 'retour_inconnu', 'a_verifier', true);
  end if;
  if p_retour_prevu is null then
    return jsonb_build_object('montant_ht', 0, 'motif', 'retour_prevu_inconnu', 'a_verifier', true);
  end if;
  if p_fuseau is null then
    raise exception 'Fuseau de l''agence manquant.' using errcode = '22023';
  end if;
  v_min := round(extract(epoch from ((p_retour_reel at time zone p_fuseau) - (p_retour_prevu at time zone p_fuseau))) / 60)::integer;
  if coalesce(p_offert, false) then
    return jsonb_build_object('retard_min', v_min, 'montant_ht', 0, 'motif', 'retard_offert', 'a_verifier', false);
  end if;
  if v_min <= 0 then
    return jsonb_build_object('retard_min', v_min, 'montant_ht', 0, 'motif', 'rendu_a_l_heure', 'a_verifier', false);
  end if;
  if v_min <= coalesce(p_tolerance_min, 0) then
    return jsonb_build_object('retard_min', v_min, 'montant_ht', 0, 'motif', 'dans_la_tolerance', 'a_verifier', false);
  end if;
  v_jours := ceil(v_min / 1440.0);
  if p_prix_jour is null then
    return jsonb_build_object('retard_min', v_min, 'jours', v_jours, 'montant_ht', 0, 'motif', 'tarif_inconnu', 'a_verifier', true);
  end if;
  return jsonb_build_object('retard_min', v_min, 'jours', v_jours, 'unite', 'jour_entame', 'quantite', v_jours,
                            'prix_unitaire', p_prix_jour, 'montant_ht', round(v_jours * p_prix_jour, 2), 'a_verifier', false);
end $function$


-- ═══ FONCTION private.loc_chiffrer_et_soumettre
CREATE OR REPLACE FUNCTION private.loc_chiffrer_et_soumettre(p_client uuid, p_contrat uuid, p_retour jsonb, p_source text, p_par uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_prop uuid;
begin
  if exists (select 1 from public.loc_propositions x where x.client_id = p_client and x.contrat_id = p_contrat and x.statut = 'facturee') then
    raise exception 'Ce contrat est déjà facturé : une correction passe par un avoir.' using errcode = '55000';
  end if;
  perform private.loc_annuler_attente(p_client, p_contrat);
  v_prop := private.loc_chiffrer_retour(p_client, p_contrat, p_retour, p_source, p_par);
  if (select x.statut from public.loc_propositions x where x.id = v_prop) = 'calculee' then
    perform private.deposer_travail(p_client, 'tavaro', 'tavaro.deposer_demande', jsonb_build_object('proposition', v_prop),
                                    'tavaro:deposer:' || v_prop::text, 0::smallint);
  end if;
  return v_prop;
end $function$


-- ═══ FONCTION private.loc_chiffrer_retour
CREATE OR REPLACE FUNCTION private.loc_chiffrer_retour(p_client uuid, p_contrat uuid, p_retour jsonb, p_source text, p_par uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.loc_contrats;
  v public.loc_vehicules;
  lb public.loc_bareme_lignes;
  lb2 public.loc_bareme_lignes;
  v_fuseau text;
  v_tol integer;
  v_bareme uuid;
  v_taux numeric;
  v_prop uuid;
  v_version integer;
  v_rang integer := 0;
  v_avert jsonb := '[]'::jsonb;
  v_bloque boolean := false;
  v_hors boolean := false;
  v_non_contra boolean;
  v_retour_reel timestamptz;
  v_retour_prevu timestamptz;
  v_km_retour integer;
  v_dep8 integer;
  v_ret8 integer;
  v_charge integer;
  v_jours integer;
  v_heures numeric;
  v_plafond numeric;
  r_retard jsonb;
  r_km jsonb;
  r_carb jsonb;
  d jsonb;
  v_code text;
  v_preuves jsonb;
  v_quantite numeric;
  v_montant numeric;
  v_statut_ligne text;
  v_calcul jsonb;
  v_dommages numeric[] := '{}';
  v_plafonnes numeric[];
  v_ids uuid[] := '{}';
  v_i integer;
  v_nb_lignes integer;
  v_total_ht numeric;
  v_total_tva numeric;
  v_total_ttc numeric;
  v_statut text;
begin
  -- Le contrat, ses conditions, son agence.
  select * into c from public.loc_contrats where client_id = p_client and id = p_contrat for update;
  if not found then
    raise exception 'Contrat introuvable.' using errcode = 'P0002';
  end if;
  if c.statut = 'annule' then
    raise exception 'Ce contrat est annulé : rien à facturer.' using errcode = '23514';
  end if;
  if exists (select 1 from public.loc_propositions p where p.client_id = p_client and p.contrat_id = c.id and p.statut in ('a_valider', 'validee')) then
    raise exception 'Une proposition de ce contrat est déjà à la validation ou validée : elle ne se recalcule pas.' using errcode = '55000';
  end if;
  if p_retour is null or jsonb_typeof(p_retour) <> 'object' then
    raise exception 'Les valeurs du retour sont illisibles.' using errcode = '22023';
  end if;
  select e.fuseau into v_fuseau from public.entites e where e.client_id = p_client and e.id = c.entite_id;
  v_tol := coalesce((select g.tolerance_retard_min from public.loc_reglages g where g.client_id = p_client), 59);
  if c.vehicule_id is not null then
    select * into v from public.loc_vehicules x where x.client_id = p_client and x.id = c.vehicule_id;
  end if;
  v_bareme := private.loc_bareme_en_vigueur(p_client, (c.depart_le at time zone v_fuseau)::date);
  v_taux := private.loc_taux_tva(p_client, c.entite_id, null);

  -- Les valeurs du retour.
  begin
    v_retour_reel := coalesce((p_retour ->> 'retour_reel_le')::timestamptz, c.retour_reel_le);
    v_km_retour := coalesce((p_retour ->> 'km_retour')::integer, c.km_retour);
    v_dep8 := (p_retour ->> 'carburant_depart_8')::integer;
    v_ret8 := (p_retour ->> 'carburant_retour_8')::integer;
    v_charge := (p_retour ->> 'charge_retour_pct')::integer;
    v_non_contra := coalesce((p_retour ->> 'non_contradictoire')::boolean, false);
  exception when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow or invalid_datetime_format then
    raise exception 'Une valeur du retour est illisible : %.', sqlerrm using errcode = '22023';
  end;
  v_retour_prevu := private.loc_retour_prevu_amende(c.id);
  v_jours := greatest(1, ceil(extract(epoch from ((v_retour_prevu at time zone v_fuseau) - (c.depart_le at time zone v_fuseau))) / 86400.0))::integer;
  v_heures := case when v_retour_reel is not null then extract(epoch from (v_retour_reel - c.depart_le)) / 3600.0 end;

  -- La proposition, nouvelle version ; les précédentes non décidées sont remplacées.
  select coalesce(max(p.version), 0) + 1 into v_version from public.loc_propositions p where p.client_id = p_client and p.contrat_id = c.id;
  update public.loc_propositions set statut = 'remplacee'
   where client_id = p_client and contrat_id = c.id and statut in ('calculee', 'preuve_manquante', 'rien_a_facturer');
  insert into public.loc_propositions (client_id, entite_id, contrat_id, version, source, bareme_id, non_contradictoire, entrees, calculee_par)
  values (p_client, c.entite_id, c.id, v_version, p_source, v_bareme, v_non_contra,
          p_retour - 'dommages' - 'postes' - 'preuves', p_par)
  returning id into v_prop;

  if v_bareme is null then
    v_avert := v_avert || jsonb_build_object('poste', 'bareme', 'code', 'bareme_absent', 'bloquant', true,
      'detail', 'Aucun barème en vigueur à la date du départ : la direction doit en publier un.');
    v_bloque := true;
  else
    -- 1. Carburant, ou charge.
    if c.politique_carburant = 'seuil' then
      lb := private.loc_ligne_bareme(v_bareme, 'CHARGE_SOUS_SEUIL', c.categorie_id);
      r_carb := private.loc_calc_charge(c.seuil_charge_pct, v_charge, lb.prix_eur);
      if (r_carb ->> 'montant_ht')::numeric > 0 then
        v_rang := v_rang + 1;
        perform private.loc_poser_ligne(p_client, v_prop, v_rang, 'frais', 'carburant', lb.code, lb.libelle, lb.id, 'forfait', 1, lb.prix_eur,
          (r_carb ->> 'montant_ht')::numeric, lb.regime_tva, private.loc_taux_tva(p_client, c.entite_id, lb.taux_tva), 'chiffree',
          r_carb, p_retour -> 'preuves' -> 'carburant', false);
      end if;
    else
      lb := private.loc_ligne_bareme_par(v_bareme, 'carburant', 'huitieme', c.categorie_id);
      lb2 := private.loc_ligne_bareme_par(v_bareme, 'carburant', 'litre', c.categorie_id);
      r_carb := private.loc_calc_carburant(c.politique_carburant, v_dep8, v_ret8, v.reservoir_l, lb.prix_eur, lb2.prix_eur,
                  (private.loc_ligne_bareme(v_bareme, 'CARBURANT_SERVICE', c.categorie_id)).prix_eur);
      if (r_carb ->> 'montant_ht')::numeric > 0 then
        v_rang := v_rang + 1;
        if r_carb ->> 'unite' = 'huitieme' then
          perform private.loc_poser_ligne(p_client, v_prop, v_rang, 'frais', 'carburant', lb.code, lb.libelle, lb.id, 'huitieme',
            (r_carb ->> 'quantite')::numeric, lb.prix_eur, (r_carb ->> 'montant_ht')::numeric, lb.regime_tva,
            private.loc_taux_tva(p_client, c.entite_id, lb.taux_tva), 'chiffree', r_carb, p_retour -> 'preuves' -> 'carburant', false);
        else
          perform private.loc_poser_ligne(p_client, v_prop, v_rang, 'frais', 'carburant', lb2.code, lb2.libelle, lb2.id, 'litre',
            (r_carb ->> 'quantite')::numeric, lb2.prix_eur, (r_carb ->> 'montant_ht')::numeric - coalesce((r_carb ->> 'frais_service')::numeric, 0),
            lb2.regime_tva, private.loc_taux_tva(p_client, c.entite_id, lb2.taux_tva), 'chiffree', r_carb - 'frais_service',
            p_retour -> 'preuves' -> 'carburant', false);
          if coalesce((r_carb ->> 'frais_service')::numeric, 0) > 0 then
            lb := private.loc_ligne_bareme(v_bareme, 'CARBURANT_SERVICE', c.categorie_id);
            v_rang := v_rang + 1;
            perform private.loc_poser_ligne(p_client, v_prop, v_rang, 'frais', 'carburant', lb.code, lb.libelle, lb.id, 'forfait', 1, lb.prix_eur,
              lb.prix_eur, lb.regime_tva, private.loc_taux_tva(p_client, c.entite_id, lb.taux_tva), 'chiffree', '{}'::jsonb,
              p_retour -> 'preuves' -> 'carburant', false);
          end if;
        end if;
      end if;
    end if;
    if (r_carb ->> 'a_verifier')::boolean then
      v_avert := v_avert || jsonb_build_object('poste', 'carburant', 'code', r_carb ->> 'motif',
        'bloquant', r_carb ->> 'motif' <> 'poste_absent_du_bareme');
      v_bloque := v_bloque or r_carb ->> 'motif' <> 'poste_absent_du_bareme';
    end if;

    -- 2. Kilomètres.
    lb := private.loc_ligne_bareme_par(v_bareme, 'kilometres', 'km', c.categorie_id);
    r_km := private.loc_calc_km(c.km_depart, v_km_retour, c.km_inclus, c.km_inclus_jour, c.km_illimite, v_jours, v_heures, lb.prix_eur);
    if (r_km ->> 'montant_ht')::numeric > 0 then
      v_rang := v_rang + 1;
      perform private.loc_poser_ligne(p_client, v_prop, v_rang, 'frais', 'kilometres', lb.code, lb.libelle, lb.id, 'km',
        (r_km ->> 'quantite')::numeric, lb.prix_eur, (r_km ->> 'montant_ht')::numeric, lb.regime_tva,
        private.loc_taux_tva(p_client, c.entite_id, lb.taux_tva), 'chiffree', r_km, p_retour -> 'preuves' -> 'km', false);
    end if;
    if (r_km ->> 'a_verifier')::boolean then
      v_avert := v_avert || jsonb_build_object('poste', 'kilometres', 'code', r_km ->> 'motif',
        'bloquant', r_km ->> 'motif' <> 'poste_absent_du_bareme');
      v_bloque := v_bloque or r_km ->> 'motif' <> 'poste_absent_du_bareme';
    end if;

    -- 3. Retard, en heure locale, au tarif du contrat (ou au prix de la ligne).
    lb := private.loc_ligne_bareme_par(v_bareme, 'retard', 'jour_entame', c.categorie_id);
    r_retard := private.loc_calc_retard(v_retour_prevu, v_retour_reel, v_fuseau, v_tol, coalesce(lb.prix_eur, c.tarif_jour_eur),
                                        private.loc_retard_offert(c.id));
    if (r_retard ->> 'montant_ht')::numeric > 0 then
      if lb.id is null then
        v_avert := v_avert || jsonb_build_object('poste', 'retard', 'code', 'poste_absent_du_bareme', 'bloquant', false);
      else
        v_rang := v_rang + 1;
        perform private.loc_poser_ligne(p_client, v_prop, v_rang, 'frais', 'retard', lb.code, lb.libelle, lb.id, 'jour_entame',
          (r_retard ->> 'quantite')::numeric, (r_retard ->> 'prix_unitaire')::numeric, (r_retard ->> 'montant_ht')::numeric, lb.regime_tva,
          private.loc_taux_tva(p_client, c.entite_id, lb.taux_tva), 'chiffree', r_retard, p_retour -> 'preuves' -> 'retard', false);
      end if;
    elsif (r_retard ->> 'a_verifier')::boolean then
      v_avert := v_avert || jsonb_build_object('poste', 'retard', 'code', r_retard ->> 'motif', 'bloquant', true);
      v_bloque := true;
    end if;

    -- 4. Dommages confirmés : au barème de la catégorie, sur devis, ou au prix de l'agence (hors barème).
    v_plafond := private.loc_plafond_franchise(c.franchise_eur, c.franchise_reduite_eur, c.rachat_franchise);
    for d in select * from jsonb_array_elements(coalesce(p_retour -> 'dommages', '[]'::jsonb)) loop
      v_code := upper(btrim(d ->> 'code'));
      v_preuves := coalesce(d -> 'preuves', '[]'::jsonb);
      v_quantite := coalesce(nullif(d ->> 'quantite', '')::numeric, 1);
      lb := private.loc_ligne_bareme(v_bareme, v_code, c.categorie_id);
      if lb.id is null then
        if nullif(d ->> 'prix_eur', '') is not null then
          v_hors := true;
          v_rang := v_rang + 1;
          perform private.loc_poser_ligne(p_client, v_prop, v_rang, 'dommage', 'dommage', v_code, coalesce(d ->> 'libelle', v_code), null, 'forfait',
            v_quantite, (d ->> 'prix_eur')::numeric, v_quantite * (d ->> 'prix_eur')::numeric, coalesce(d ->> 'regime_tva', 'hors_champ'),
            v_taux, case when jsonb_array_length(v_preuves) = 0 then 'preuve_manquante' else 'chiffree' end,
            jsonb_build_object('hors_bareme', true, 'prix_agence', (d ->> 'prix_eur')::numeric), v_preuves, true);
        else
          v_avert := v_avert || jsonb_build_object('poste', v_code, 'code', 'poste_absent_du_bareme', 'bloquant', false);
          continue;
        end if;
      else
        v_calcul := jsonb_build_object('ligne', lb.code, 'unite', lb.unite);
        if jsonb_array_length(v_preuves) = 0 then
          v_statut_ligne := 'preuve_manquante'; v_montant := 0;
          v_avert := v_avert || jsonb_build_object('poste', v_code, 'code', 'preuve_absente', 'bloquant', true);
          v_bloque := true;
        elsif lb.unite = 'devis' then
          if nullif(d ->> 'devis_eur', '') is not null then
            v_statut_ligne := 'chiffree'; v_montant := (d ->> 'devis_eur')::numeric; v_calcul := v_calcul || '{"devis": true}'::jsonb;
          else
            v_statut_ligne := 'a_chiffrer'; v_montant := 0;
            v_avert := v_avert || jsonb_build_object('poste', v_code, 'code', 'devis_attendu', 'bloquant', false);
          end if;
        else
          v_statut_ligne := 'chiffree'; v_montant := v_quantite * lb.prix_eur;
        end if;
        if v_statut_ligne = 'chiffree' and v_plafond is null then
          v_statut_ligne := 'a_chiffrer';
          v_calcul := v_calcul || jsonb_build_object('motif', 'franchise_inconnue', 'montant_bareme', round(v_montant, 2));
          v_montant := 0;
        end if;
        v_rang := v_rang + 1;
        perform private.loc_poser_ligne(p_client, v_prop, v_rang, 'dommage', lb.famille, lb.code, coalesce(d ->> 'libelle', lb.libelle), lb.id, lb.unite,
          v_quantite, lb.prix_eur, v_montant, lb.regime_tva, private.loc_taux_tva(p_client, c.entite_id, lb.taux_tva), v_statut_ligne,
          v_calcul, v_preuves, false);
      end if;
      if jsonb_array_length(v_preuves) = 0 and lb.id is null then
        v_avert := v_avert || jsonb_build_object('poste', v_code, 'code', 'preuve_absente', 'bloquant', true);
        v_bloque := true;
      end if;
    end loop;
    if v_plafond is null and exists (select 1 from public.loc_proposition_lignes l where l.proposition_id = v_prop and l.nature = 'dommage') then
      v_avert := v_avert || jsonb_build_object('poste', 'dommages', 'code', 'franchise_inconnue', 'bloquant', true,
        'detail', 'La franchise du contrat (ou son rachat) est inconnue : à compléter avant de chiffrer un dommage.');
      v_bloque := true;
    end if;
    if v_non_contra and exists (select 1 from public.loc_proposition_lignes l where l.proposition_id = v_prop and l.nature = 'dommage') then
      v_hors := true;
      v_avert := v_avert || jsonb_build_object('poste', 'dommages', 'code', 'etat_des_lieux_non_contradictoire', 'bloquant', false,
        'detail', 'Le client n''a pas signé le retour : les dommages vont à la direction, hors barème.');
    end if;

    -- 5. Les autres postes : nettoyage, clés, frais, ou un prix saisi par l'agence.
    for d in select * from jsonb_array_elements(coalesce(p_retour -> 'postes', '[]'::jsonb)) loop
      v_code := upper(btrim(d ->> 'code'));
      v_preuves := coalesce(d -> 'preuves', '[]'::jsonb);
      v_quantite := coalesce(nullif(d ->> 'quantite', '')::numeric, 1);
      lb := private.loc_ligne_bareme(v_bareme, v_code, c.categorie_id);
      v_statut_ligne := case when jsonb_array_length(v_preuves) = 0 then 'preuve_manquante' else 'chiffree' end;
      if v_statut_ligne = 'preuve_manquante' and (lb.id is not null or nullif(d ->> 'prix_eur', '') is not null) then
        v_avert := v_avert || jsonb_build_object('poste', v_code, 'code', 'preuve_absente', 'bloquant', true);
        v_bloque := true;
      end if;
      if lb.id is null then
        if nullif(d ->> 'prix_eur', '') is not null then
          v_hors := true;
          v_rang := v_rang + 1;
          perform private.loc_poser_ligne(p_client, v_prop, v_rang, coalesce(nullif(d ->> 'nature', ''), 'frais'),
            case when d ->> 'nature' = 'dommage' then 'dommage' else 'autre' end, v_code, coalesce(d ->> 'libelle', v_code), null, 'forfait',
            v_quantite, (d ->> 'prix_eur')::numeric, v_quantite * (d ->> 'prix_eur')::numeric,
            coalesce(d ->> 'regime_tva', case when d ->> 'nature' = 'dommage' then 'hors_champ' else 'taxable' end),
            v_taux, v_statut_ligne, jsonb_build_object('hors_bareme', true, 'prix_agence', (d ->> 'prix_eur')::numeric), v_preuves, true);
        else
          v_avert := v_avert || jsonb_build_object('poste', v_code, 'code', 'poste_absent_du_bareme', 'bloquant', false);
        end if;
        continue;
      end if;
      v_calcul := jsonb_build_object('ligne', lb.code, 'unite', lb.unite);
      if lb.unite = 'devis' and v_statut_ligne = 'chiffree' then
        if nullif(d ->> 'devis_eur', '') is not null then
          v_montant := (d ->> 'devis_eur')::numeric; v_calcul := v_calcul || '{"devis": true}'::jsonb;
        else
          v_statut_ligne := 'a_chiffrer'; v_montant := 0;
          v_avert := v_avert || jsonb_build_object('poste', v_code, 'code', 'devis_attendu', 'bloquant', false);
        end if;
      else
        v_montant := v_quantite * coalesce(lb.prix_eur, 0);
      end if;
      v_rang := v_rang + 1;
      perform private.loc_poser_ligne(p_client, v_prop, v_rang, lb.nature, lb.famille, lb.code, coalesce(d ->> 'libelle', lb.libelle), lb.id, lb.unite,
        v_quantite, lb.prix_eur, v_montant, lb.regime_tva, private.loc_taux_tva(p_client, c.entite_id, lb.taux_tva), v_statut_ligne,
        v_calcul, v_preuves, false);
    end loop;

    -- 6. Le plafond de franchise sur les dommages chiffrés, dans l'ordre des lignes.
    if v_plafond is not null then
      select coalesce(array_agg(l.montant_ttc order by l.rang), '{}'), coalesce(array_agg(l.id order by l.rang), '{}')
        into v_dommages, v_ids
      from public.loc_proposition_lignes l where l.proposition_id = v_prop and l.nature = 'dommage' and l.statut = 'chiffree';
      v_plafonnes := private.loc_appliquer_plafond(v_dommages, v_plafond);
      for v_i in 1 .. coalesce(array_length(v_ids, 1), 0) loop
        if v_plafonnes[v_i] <> v_dommages[v_i] then
          update public.loc_proposition_lignes l
             set montant_ttc = v_plafonnes[v_i],
                 montant_ht = case when l.regime_tva = 'taxable' and l.taux_tva > 0 then round(v_plafonnes[v_i] / (1 + l.taux_tva / 100), 2) else v_plafonnes[v_i] end,
                 montant_tva = v_plafonnes[v_i] - case when l.regime_tva = 'taxable' and l.taux_tva > 0 then round(v_plafonnes[v_i] / (1 + l.taux_tva / 100), 2) else v_plafonnes[v_i] end,
                 plafonnee = true,
                 calcul = l.calcul || jsonb_build_object('montant_bareme_ttc', v_dommages[v_i], 'plafond', v_plafond)
           where l.id = v_ids[v_i];
        end if;
      end loop;
    end if;
  end if;

  -- 7. Les totaux, le statut.
  select count(*), coalesce(sum(montant_ht), 0), coalesce(sum(montant_tva), 0), coalesce(sum(montant_ttc), 0)
    into v_nb_lignes, v_total_ht, v_total_tva, v_total_ttc
  from public.loc_proposition_lignes where proposition_id = v_prop;
  v_statut := case when v_nb_lignes = 0 and not v_bloque then 'rien_a_facturer'
                   when v_bloque then 'preuve_manquante'
                   else 'calculee' end;
  update public.loc_propositions p
     set statut = v_statut, hors_bareme = v_hors, avertissements = v_avert, plafond_eur = v_plafond,
         calcul_retard = r_retard, calcul_km = r_km, calcul_carburant = r_carb,
         total_ht = v_total_ht, total_tva = v_total_tva, total_ttc = v_total_ttc,
         total_frais_ttc = coalesce((select sum(l.montant_ttc) from public.loc_proposition_lignes l where l.proposition_id = v_prop and l.nature = 'frais'), 0),
         total_dommages_ttc = coalesce((select sum(l.montant_ttc) from public.loc_proposition_lignes l where l.proposition_id = v_prop and l.nature = 'dommage'), 0)
   where p.id = v_prop;

  perform private.journaliser_module(p_client, 'tavaro', 'tavaro.proposition_calculee', 'loc_propositions', v_prop::text,
    jsonb_build_object('contrat', c.id, 'numero', c.numero, 'version', v_version, 'statut', v_statut, 'hors_bareme', v_hors,
                       'lignes', v_nb_lignes, 'total_ttc', v_total_ttc, 'source', p_source), c.entite_id);
  perform private.battre(p_client, 'tavaro_facturation', jsonb_build_object('proposition', v_prop, 'statut', v_statut), interval '1 day');
  return v_prop;
end $function$


-- ═══ FONCTION private.loc_chiffrer_retour_agence
CREATE OR REPLACE FUNCTION private.loc_chiffrer_retour_agence(p_contrat uuid, p_retour jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  c public.loc_contrats;
begin
  if v_uid is null then
    raise exception 'Un retour se chiffre par une personne connectée.' using errcode = '42501';
  end if;
  select * into c from public.loc_contrats where id = p_contrat;
  if not found or not exists (select 1 from public.comptes k where k.user_id = v_uid and k.client_id = c.client_id) then
    raise exception 'Contrat introuvable.' using errcode = 'P0002';
  end if;
  if not private.a_un_role(c.client_id, array['gerant', 'admin', 'valideur', 'collaborateur'])
     or not (private.voit_entite(c.client_id, c.entite_id)
             or (c.entite_retour_id is not null and private.voit_entite(c.client_id, c.entite_retour_id))) then
    raise exception 'Ce contrat n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  return private.loc_chiffrer_et_soumettre(c.client_id, c.id, p_retour, 'saisie', v_uid);
end $function$


-- ═══ FONCTION private.loc_cle_rapprochement
CREATE OR REPLACE FUNCTION private.loc_cle_rapprochement(p_client uuid, p_numero_permis text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_num text := upper(regexp_replace(coalesce(p_numero_permis, ''), '[^0-9A-Za-z]', '', 'g'));
  v_cle bytea;
begin
  if v_num = '' or p_client is null then
    return null;
  end if;
  select k.cle into v_cle from private.loc_cles k where k.client_id = p_client;
  if v_cle is null then
    insert into private.loc_cles (client_id, cle)
    values (p_client, sha256(convert_to(gen_random_uuid()::text || gen_random_uuid()::text || clock_timestamp()::text, 'UTF8')))
    on conflict (client_id) do nothing;
    select k.cle into v_cle from private.loc_cles k where k.client_id = p_client;
  end if;
  return encode(private.loc_hmac(v_cle, convert_to(v_num, 'UTF8')), 'hex');
end $function$


-- ═══ FONCTION private.loc_code
CREATE OR REPLACE FUNCTION private.loc_code(p_brut text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select nullif(upper(regexp_replace(btrim(coalesce(p_brut, '')), '\s+', ' ', 'g')), '')
$function$


-- ═══ FONCTION private.loc_completer_contrat
CREATE OR REPLACE FUNCTION private.loc_completer_contrat(p_contrat uuid, p_valeurs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  c public.loc_contrats;
  v_cle text;
  v_val jsonb;
  v_permis text[] := array['km_inclus', 'km_inclus_jour', 'km_illimite', 'politique_carburant', 'seuil_charge_pct',
                           'tarif_jour_eur', 'franchise_eur', 'franchise_reduite_eur', 'rachat_franchise',
                           'depot_eur', 'conditions_version'];
  v_saisies jsonb;
begin
  if v_uid is null then
    raise exception 'Un contrat se complète par une personne connectée.' using errcode = '42501';
  end if;
  select * into c from public.loc_contrats where id = p_contrat for update;
  if not found
     or not exists (select 1 from public.comptes k where k.user_id = v_uid and k.client_id = c.client_id) then
    raise exception 'Contrat introuvable.' using errcode = 'P0002';
  end if;
  if not private.a_un_role(c.client_id, array['gerant', 'admin', 'valideur', 'collaborateur'])
     or not (private.voit_entite(c.client_id, c.entite_id)
             or (c.entite_retour_id is not null and private.voit_entite(c.client_id, c.entite_retour_id))) then
    raise exception 'Ce contrat n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  if c.statut = 'annule' then
    raise exception 'Ce contrat est annulé.' using errcode = '23514';
  end if;
  if p_valeurs is null or jsonb_typeof(p_valeurs) <> 'object' or p_valeurs = '{}'::jsonb then
    raise exception 'Rien à compléter.' using errcode = '22023';
  end if;

  v_saisies := c.saisies;
  for v_cle, v_val in select * from jsonb_each(p_valeurs) loop
    if not (v_cle = any (v_permis)) then
      raise exception 'Seules les conditions du contrat se complètent ici (pas « % »).', v_cle using errcode = '22023';
    end if;
    begin
      case v_cle
        when 'km_inclus' then c.km_inclus := (v_val #>> '{}')::integer;
        when 'km_inclus_jour' then c.km_inclus_jour := (v_val #>> '{}')::integer;
        when 'km_illimite' then c.km_illimite := (v_val #>> '{}')::boolean;
        when 'politique_carburant' then c.politique_carburant := v_val #>> '{}';
        when 'seuil_charge_pct' then c.seuil_charge_pct := (v_val #>> '{}')::smallint;
        when 'tarif_jour_eur' then c.tarif_jour_eur := (v_val #>> '{}')::numeric;
        when 'franchise_eur' then c.franchise_eur := (v_val #>> '{}')::numeric;
        when 'franchise_reduite_eur' then c.franchise_reduite_eur := (v_val #>> '{}')::numeric;
        when 'rachat_franchise' then c.rachat_franchise := (v_val #>> '{}')::boolean;
        when 'depot_eur' then c.depot_eur := (v_val #>> '{}')::numeric;
        when 'conditions_version' then c.conditions_version := left(v_val #>> '{}', 80);
      end case;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Valeur illisible pour « % ».', v_cle using errcode = '22023';
    end;
    v_saisies := v_saisies || jsonb_build_object(v_cle, jsonb_build_object('par', v_uid, 'le', now()));
  end loop;

  begin
    update public.loc_contrats
       set km_inclus = c.km_inclus, km_inclus_jour = c.km_inclus_jour, km_illimite = coalesce(c.km_illimite, false),
           politique_carburant = c.politique_carburant, seuil_charge_pct = c.seuil_charge_pct,
           tarif_jour_eur = c.tarif_jour_eur, franchise_eur = c.franchise_eur,
           franchise_reduite_eur = c.franchise_reduite_eur, rachat_franchise = c.rachat_franchise,
           depot_eur = c.depot_eur, conditions_version = c.conditions_version, saisies = v_saisies,
           -- une saisie tranche l'écart entre le PDF et le logiciel sur ce champ
           avertissements = coalesce((select jsonb_agg(a) from jsonb_array_elements(c.avertissements) a
                                      where not (a ->> 'code' = 'ecart_avec_le_logiciel' and p_valeurs ? (a ->> 'champ'))),
                                     '[]'::jsonb)
     where id = c.id;
  exception when check_violation then
    raise exception 'Condition refusée : %.', sqlerrm using errcode = '22023';
  end;

  return (select jsonb_build_object('contrat', x.id, 'km_inclus', x.km_inclus, 'km_inclus_jour', x.km_inclus_jour,
                                    'km_illimite', x.km_illimite, 'politique_carburant', x.politique_carburant,
                                    'seuil_charge_pct', x.seuil_charge_pct, 'tarif_jour_eur', x.tarif_jour_eur,
                                    'franchise_eur', x.franchise_eur, 'franchise_reduite_eur', x.franchise_reduite_eur,
                                    'rachat_franchise', x.rachat_franchise, 'depot_eur', x.depot_eur,
                                    'conditions_version', x.conditions_version)
          from public.loc_contrats x where x.id = c.id);
end $function$


-- ═══ FONCTION private.loc_confirmer_purge_pieces
CREATE OR REPLACE FUNCTION private.loc_confirmer_purge_pieces(p_client uuid, p_pieces uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_dues uuid[];
  v_n integer;
  v_octets bigint;
begin
  if p_pieces is null or cardinality(p_pieces) = 0 then
    return jsonb_build_object('pieces', 0, 'octets', 0);
  end if;
  select coalesce(array_agg((e ->> 'piece')::uuid), '{}') into v_dues
  from jsonb_array_elements(private.loc_pieces_a_purger(p_client)) e;
  if exists (select 1 from unnest(p_pieces) x where not (x = any (v_dues))) then
    raise exception 'Une pièce demandée n''a pas fini sa durée de conservation.' using errcode = '22023';
  end if;
  if exists (select 1 from public.pieces p join storage.objects o on o.bucket_id = 'omega-clients' and o.name = p.chemin
             where p.client_id = p_client and p.id = any (p_pieces)) then
    raise exception 'Des fichiers sont encore au stockage : le serveur les efface d''abord.' using errcode = '55000';
  end if;
  select count(*), coalesce(sum(p.octets), 0) into v_n, v_octets
  from public.pieces p where p.client_id = p_client and p.id = any (p_pieces);
  delete from public.pieces p where p.client_id = p_client and p.id = any (p_pieces);
  perform private.journaliser_module(p_client, 'tavaro', 'tavaro.pieces_purgees', 'pieces', null,
    jsonb_build_object('pieces', v_n, 'octets', v_octets,
                       'empreinte', encode(sha256(convert_to(array_to_string(
                         array(select x::text from unnest(p_pieces) x order by 1), ','), 'UTF8')), 'hex')));
  return jsonb_build_object('pieces', v_n, 'octets', v_octets);
end $function$


-- ═══ FONCTION private.loc_conservation_locataires
CREATE OR REPLACE FUNCTION private.loc_conservation_locataires(p_client uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n integer;
begin
  update public.loc_locataires l
     set conserver_jusqu_au = x.jusqu_au
    from (
      select l2.id,
             ((coalesce(greatest(
                 (select max(coalesce(c.retour_reel_le, c.retour_prevu_le)) from public.loc_contrats c
                  where c.client_id = l2.client_id and c.locataire_id = l2.id),
                 (select max(r.retour_prevu_le) from public.loc_reservations r
                  where r.client_id = l2.client_id and r.locataire_id = l2.id)), l2.cree_le) at time zone 'UTC')::date
              + make_interval(years => coalesce(g.duree_contrats_ans, 5)))::date as jusqu_au
      from public.loc_locataires l2
      left join public.loc_reglages g on g.client_id = l2.client_id
      where l2.anonymise_le is null and (p_client is null or l2.client_id = p_client)
    ) x
   where l.id = x.id and l.conserver_jusqu_au is distinct from x.jusqu_au;
  get diagnostics n = row_count;
  return n;
end $function$


-- ═══ FONCTION private.loc_decision_avoir
CREATE OR REPLACE FUNCTION private.loc_decision_avoir(p_charge jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  a public.loc_avoirs;
  v_demande uuid := (p_charge ->> 'demande')::uuid;
  v_statut text := p_charge ->> 'statut';
  v_erreur text;
  v_ref text;
  v_envoi jsonb;
begin
  if p_charge ->> 'objet_type' <> 'loc_avoirs' or p_charge ->> 'objet_id' is null then
    return jsonb_build_object('statut', 'ignoree');
  end if;
  select * into a from public.loc_avoirs where id = (p_charge ->> 'objet_id')::uuid for update;
  if not found then
    return jsonb_build_object('statut', 'avoir_introuvable');
  end if;
  if a.demande_id is distinct from v_demande then
    return jsonb_build_object('statut', 'demande_depassee', 'avoir', a.id);
  end if;
  if a.statut <> 'a_valider' then
    return jsonb_build_object('statut', 'deja_traite', 'avoir', a.id);
  end if;

  if v_statut = 'approuvee' then
    begin
      perform private.loc_emettre_avoir(a.client_id, a.id);
    exception when others then
      v_erreur := left(sqlstate || ' ' || sqlerrm, 500);
      update public.demandes_validation set statut = 'echec_execution', motif_echec = v_erreur where id = v_demande and statut = 'approuvee';
      perform private.lever_alerte_module(a.client_id, 'tavaro', 'critique',
        format('L''avoir de %s € sur la facture %s n''a pas pu être émis.', replace(a.montant_ttc::text, '.', ','), a.facture_reference),
        jsonb_build_object('avoir', a.id, 'demande', v_demande, 'erreur', v_erreur), 'avoir:echec:' || a.id::text, false, null);
      return jsonb_build_object('statut', 'a_valider', 'emission', 'echec', 'erreur', v_erreur, 'avoir', a.id);
    end;
    select x.reference into v_ref from public.loc_avoirs x where x.id = a.id;
    -- Le courriel, adossé à la même décision : c'est son départ qui l'exécute.
    v_envoi := private.loc_envoyer_avoir(a.client_id, a.id);
    if v_envoi ->> 'statut' in ('rien', 'non_regle', 'sans_adresse') then
      update public.demandes_validation set statut = 'executee', motif_echec = null
       where id = v_demande and statut in ('approuvee', 'echec_execution');
    end if;
    return jsonb_build_object('statut', 'emis', 'avoir', a.id, 'reference', v_ref, 'envoi', v_envoi);
  elsif v_statut = 'rejetee' then
    update public.loc_avoirs set statut = 'refuse' where id = a.id;
    perform private.lever_alerte_module(a.client_id, 'tavaro', 'attention',
      format('La direction a refusé l''avoir de %s € sur la facture %s (contrat %s).', replace(a.montant_ttc::text, '.', ','), a.facture_reference, a.contrat_numero),
      jsonb_build_object('avoir', a.id, 'demande', v_demande, 'decideurs', p_charge -> 'decideurs'), 'avoir:refuse:' || a.id::text, true, null);
    perform private.journaliser_module(a.client_id, 'tavaro', 'tavaro.avoir_refuse', 'loc_avoirs', a.id::text,
      jsonb_build_object('demande', v_demande, 'decideurs', p_charge -> 'decideurs', 'montant_ttc', a.montant_ttc), a.entite_id);
    return jsonb_build_object('statut', 'refuse', 'avoir', a.id);
  elsif v_statut in ('expiree', 'annulee') then
    update public.loc_avoirs set statut = case v_statut when 'expiree' then 'expire' else 'annule' end where id = a.id;
    if v_statut = 'expiree' then
      perform private.lever_alerte_module(a.client_id, 'tavaro', 'attention',
        format('L''avoir de %s € sur la facture %s n''a pas été décidé en 48 heures : redemandez-le s''il reste dû.',
               replace(a.montant_ttc::text, '.', ','), a.facture_reference),
        jsonb_build_object('avoir', a.id, 'demande', v_demande), 'avoir:expire:' || a.id::text, true, null);
    end if;
    perform private.journaliser_module(a.client_id, 'tavaro', 'tavaro.avoir_' || case v_statut when 'expiree' then 'expire' else 'annule' end,
      'loc_avoirs', a.id::text, jsonb_build_object('demande', v_demande, 'montant_ttc', a.montant_ttc), a.entite_id);
    return jsonb_build_object('statut', case v_statut when 'expiree' then 'expire' else 'annule' end, 'avoir', a.id);
  end if;
  return jsonb_build_object('statut', 'ignoree');
end $function$


-- ═══ FONCTION private.loc_demander_avoir
CREATE OR REPLACE FUNCTION private.loc_demander_avoir(p_facture uuid, p_motif text, p_montant_ttc numeric DEFAULT NULL::numeric, p_maintenant timestamp with time zone DEFAULT now())
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  f public.loc_factures := private.loc_facture_de_l_agence(p_facture);
  v_uid uuid := (select auth.uid());
  v_motif text := left(btrim(p_motif), 500);
  v_deja numeric;
  v_reste numeric;
  v_ttc numeric;
  v_ht numeric;
  v_tva numeric;
  v_total boolean;
  v_lignes jsonb;
  v_avoir uuid;
  v_demande uuid;
  v_resume text;
begin
  if f.statut = 'avoir' then
    raise exception 'Cette facture est déjà annulée par un avoir.' using errcode = '23514';
  end if;
  if exists (select 1 from public.loc_avoirs a where a.client_id = f.client_id and a.facture_id = f.id and a.statut = 'a_valider') then
    raise exception 'Un avoir attend déjà la décision de la direction sur cette facture.' using errcode = '55000';
  end if;
  if v_motif is null or char_length(v_motif) < 3 then
    raise exception 'Un avoir a un motif : ce que la facture avait de faux.' using errcode = '22023';
  end if;
  select coalesce(sum(a.montant_ttc), 0) into v_deja from public.loc_avoirs a where a.client_id = f.client_id and a.facture_id = f.id and a.statut = 'emis';
  v_reste := f.total_ttc - v_deja;
  if v_reste <= 0 then
    raise exception 'Cette facture est déjà entièrement créditée.' using errcode = '23514';
  end if;
  v_ttc := coalesce(p_montant_ttc, v_reste);
  if v_ttc <= 0 or v_ttc > v_reste or v_ttc <> round(v_ttc, 2) then
    raise exception 'Le montant d''un avoir est entre 0,01 et %s € (ce qui reste de la facture), au centime.', replace(v_reste::text, '.', ',')
      using errcode = '22023';
  end if;
  v_total := v_ttc = f.total_ttc;
  if v_total then
    v_ht := f.total_ht;
    v_tva := f.total_tva;
    select coalesce(jsonb_agg(jsonb_build_object('rang', l.rang, 'code', l.code, 'libelle', l.libelle, 'quantite', l.quantite, 'prix_unitaire', l.prix_unitaire,
                                                 'montant_ht', l.montant_ht, 'regime_tva', l.regime_tva, 'taux_tva', l.taux_tva, 'montant_tva', l.montant_tva,
                                                 'montant_ttc', l.montant_ttc) order by l.rang), '[]'::jsonb)
      into v_lignes
    from public.loc_facture_lignes l where l.client_id = f.client_id and l.facture_id = f.id;
  else
    -- Au prorata de la facture : la même part de TVA que la facture entière.
    v_ht := round(v_ttc * f.total_ht / f.total_ttc, 2);
    v_tva := v_ttc - v_ht;
    v_lignes := jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'rang', 1, 'code', 'AVOIR_PARTIEL', 'libelle', format('Avoir partiel sur la facture %s', f.reference), 'quantite', 1, 'prix_unitaire', v_ht,
      'montant_ht', v_ht, 'regime_tva', case when f.total_tva > 0 then 'taxable' else 'hors_champ' end,
      'taux_tva', case when f.total_tva > 0 and f.total_ht > 0 then round(f.total_tva / f.total_ht * 100, 2) end,
      'montant_tva', v_tva, 'montant_ttc', v_ttc)));
  end if;

  insert into public.loc_avoirs (client_id, entite_id, entite_emettrice_id, facture_id, facture_reference, contrat_id, contrat_numero, motif, total,
                                 montant_ht, montant_tva, montant_ttc, lignes, demande_par)
  values (f.client_id, f.entite_id, f.entite_emettrice_id, f.id, f.reference, f.contrat_id, f.contrat_numero, v_motif, v_total,
          v_ht, v_tva, v_ttc, v_lignes, v_uid)
  returning id into v_avoir;

  perform private.loc_regles_par_defaut(f.client_id);
  -- Le résumé entre au journal opposable : le montant et la facture, jamais le motif (un texte libre).
  v_resume := format('Avoir de %s € TTC sur la facture %s (contrat %s), %s', replace(v_ttc::text, '.', ','), f.reference, f.contrat_numero,
                     case when v_total then 'annulation complète' else 'partiel' end);
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, montant, payload, echeance, cle_idempotence)
  values (f.client_id, f.entite_id, 'tavaro', 'avoir.emettre', 'loc_avoirs', v_avoir::text, left(v_resume, 500), v_ttc,
          jsonb_build_object('avoir', v_avoir, 'facture', f.id, 'reference', f.reference, 'contrat', f.contrat_numero, 'montant_ttc', v_ttc,
                             'total', v_total, 'motif', v_motif, 'facture_ttc', f.total_ttc, 'deja_credite', v_deja, 'lignes', v_lignes),
          p_maintenant + interval '48 hours', 'tavaro:avoir:' || v_avoir::text)
  returning id into v_demande;
  update public.loc_avoirs set demande_id = v_demande where id = v_avoir;
  perform private.journaliser_module(f.client_id, 'tavaro', 'tavaro.avoir_demande', 'loc_avoirs', v_avoir::text,
    jsonb_build_object('facture', f.id, 'reference', f.reference, 'montant_ttc', v_ttc, 'total', v_total, 'demande', v_demande, 'contrat', f.contrat_numero),
    f.entite_id);
  return v_avoir;
end $function$


-- ═══ FONCTION private.loc_deposer_demande
CREATE OR REPLACE FUNCTION private.loc_deposer_demande(p_client uuid, p_proposition uuid, p_tentative integer DEFAULT 1, p_maintenant timestamp with time zone DEFAULT now())
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.loc_propositions;
  c public.loc_contrats;
  v_fuseau text;
  v_type text;
  v_resume text;
  v_demande uuid;
  v_nb integer;
  v_echeance timestamptz;
begin
  select * into p from public.loc_propositions where client_id = p_client and id = p_proposition for update;
  if not found then
    raise exception 'Proposition introuvable.' using errcode = 'P0002';
  end if;
  if p.statut = 'a_valider' and exists (select 1 from public.demandes_validation d where d.id = p.demande_id and d.statut = 'en_attente') then
    return p.demande_id;
  end if;
  if p.statut not in ('calculee', 'a_valider') then
    return null;
  end if;
  select * into c from public.loc_contrats where client_id = p_client and id = p.contrat_id;
  select e.fuseau into v_fuseau from public.entites e where e.client_id = p_client and e.id = p.entite_id;
  perform private.loc_regles_par_defaut(p_client);
  v_type := case when p.hors_bareme then 'facture.envoyer_hors_bareme' else 'facture.envoyer' end;
  select count(*) into v_nb from public.loc_proposition_lignes l where l.proposition_id = p.id;
  v_resume := format('Facturer le retour du contrat %s : %s € TTC (frais %s, dommages %s)%s', c.numero,
                     replace(p.total_ttc::text, '.', ','), replace(p.total_frais_ttc::text, '.', ','), replace(p.total_dommages_ttc::text, '.', ','),
                     case when p.hors_bareme then ' — hors barème' else '' end);
  v_echeance := private.loc_echeance_locale(v_fuseau, p_maintenant);
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, montant, payload,
                                          echeance, cle_idempotence)
  values (p_client, p.entite_id, 'tavaro', v_type, 'loc_propositions', p.id::text, left(v_resume, 500), p.total_ttc,
          jsonb_build_object('proposition', p.id, 'contrat', c.id, 'numero', c.numero, 'version', p.version, 'tentative', p_tentative,
                             'total_ttc', p.total_ttc, 'total_frais_ttc', p.total_frais_ttc, 'total_dommages_ttc', p.total_dommages_ttc,
                             'lignes', v_nb, 'hors_bareme', p.hors_bareme, 'non_contradictoire', p.non_contradictoire,
                             'avertissements', p.avertissements),
          v_echeance, 'tavaro:proposition:' || p.id::text || ':t' || p_tentative)
  returning id into v_demande;
  update public.loc_propositions set statut = 'a_valider', demande_id = v_demande where id = p.id;
  perform private.journaliser_module(p_client, 'tavaro', 'tavaro.demande_deposee', 'loc_propositions', p.id::text,
    jsonb_build_object('demande', v_demande, 'type_action', v_type, 'montant', p.total_ttc, 'tentative', p_tentative, 'echeance', v_echeance),
    p.entite_id);
  return v_demande;
end $function$


-- ═══ FONCTION private.loc_deposer_points
CREATE OR REPLACE FUNCTION private.loc_deposer_points(p_maintenant timestamp with time zone DEFAULT now())
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  v_jour date;
  v_items jsonb;
  v_n integer;
  v_montant numeric;
  n integer := 0;
begin
  -- Chaque agence, pour ses valideurs : le chef d'agence.
  for r in
    select a.client_id, a.entite_id, e.fuseau
    from public.loc_agences a
    join public.entites e on e.client_id = a.client_id and e.id = a.entite_id
    where exists (select 1 from public.loc_reglages g where g.client_id = a.client_id)
    order by a.client_id, a.entite_id
  loop
    begin
      v_jour := (p_maintenant at time zone coalesce(r.fuseau, 'UTC'))::date;
      v_items := private.loc_section_facturation(r.client_id, r.entite_id, v_jour);
      perform private.deposer_section(r.client_id, 'tavaro', v_jour, null, 'valideur', 'Facturation des retours', v_items,
                                      r.entite_id, null, false, null, false, 20);
      n := n + 1;
    exception when others then
      perform private.lever_alerte_module(r.client_id, 'tavaro', 'attention',
        'La section « Facturation des retours » du point du matin n''a pas pu être déposée pour une agence.',
        jsonb_build_object('entite', r.entite_id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'point:depot:' || r.entite_id::text, false, null);
    end;
  end loop;
  -- La direction : le réseau, agence par agence, et les avoirs qui attendent sa décision.
  for r in
    select k.id as client_id, e.fuseau
    from public.clients k
    join public.entites e on e.client_id = k.id and e.principale
    where exists (select 1 from public.loc_reglages g where g.client_id = k.id)
  loop
    begin
      v_jour := (p_maintenant at time zone coalesce(r.fuseau, 'UTC'))::date;
      perform private.deposer_section(r.client_id, 'tavaro', v_jour, null, 'gerant', 'Facturation des retours, réseau',
                                      private.loc_section_reseau(r.client_id, v_jour), null, null, false, null, false, 20);
      select count(*), coalesce(sum(a.montant_ttc), 0) into v_n, v_montant
      from public.loc_avoirs a where a.client_id = r.client_id and a.statut = 'a_valider';
      v_items := case when v_n > 0
                      then jsonb_build_array(jsonb_build_object('gabarit', 'tavaro.avoirs_a_decider', 'valeurs', jsonb_build_object('n', v_n, 'montant', v_montant),
                                                               'lien', '/tavaro/avoirs', 'gravite', 'attention'))
                      else '[]'::jsonb end;
      perform private.deposer_section(r.client_id, 'tavaro', v_jour, null, 'gerant', 'Avoirs à décider', v_items, null, null, false, null, false, 25);
      perform private.battre(r.client_id, 'tavaro_matin', jsonb_build_object('jour', v_jour, 'avoirs', v_n), interval '1 day');
      n := n + 1;
    exception when others then
      perform private.lever_alerte_module(r.client_id, 'tavaro', 'attention',
        'Les sections de la direction du point du matin n''ont pas pu être déposées.',
        jsonb_build_object('erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'point:depot:direction', false, null);
    end;
  end loop;
  return n;
end $function$


-- ═══ FONCTION private.loc_echeance_locale
CREATE OR REPLACE FUNCTION private.loc_echeance_locale(p_fuseau text, p_maintenant timestamp with time zone DEFAULT now())
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_local timestamp;
begin
  if p_fuseau is null then
    raise exception 'Fuseau de l''agence manquant.' using errcode = '22023';
  end if;
  v_local := p_maintenant at time zone p_fuseau;
  if v_local::time >= time '22:00' then
    return (v_local::date + 1 + time '23:59:59') at time zone p_fuseau;
  end if;
  return (v_local::date + time '23:59:59') at time zone p_fuseau;
end $function$


-- ═══ FONCTION private.loc_emettre_avoir
CREATE OR REPLACE FUNCTION private.loc_emettre_avoir(p_client uuid, p_avoir uuid, p_maintenant timestamp with time zone DEFAULT now())
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  a public.loc_avoirs;
  f public.loc_factures;
  d public.demandes_validation;
  v_fuseau text;
  v_annee integer;
  v_numero integer;
  v_ref text;
  v_credite numeric;
begin
  select * into a from public.loc_avoirs where client_id = p_client and id = p_avoir for update;
  if not found then
    raise exception 'Avoir introuvable.' using errcode = 'P0002';
  end if;
  if a.statut <> 'a_valider' then
    raise exception 'Seul un avoir en attente s''émet (statut : %).', a.statut using errcode = '23514';
  end if;
  select * into d from public.demandes_validation where id = a.demande_id;
  if not found or d.statut not in ('approuvee', 'echec_execution') then
    raise exception 'Aucun avoir sans demande approuvée par la direction.' using errcode = '23514';
  end if;
  select * into f from public.loc_factures where client_id = p_client and id = a.facture_id for update;
  select e.fuseau into v_fuseau from public.entites e where e.client_id = p_client and e.id = a.entite_id;
  v_annee := extract(year from (p_maintenant at time zone v_fuseau))::integer;
  v_numero := private.loc_numero_serie(p_client, a.entite_emettrice_id, 'AV', v_annee);
  v_ref := format('AV-%s-%s', v_annee, lpad(v_numero::text, 6, '0'));
  update public.loc_avoirs
     set statut = 'emis', annee = v_annee, numero = v_numero, reference = v_ref, emis_le = p_maintenant,
         date_avoir = (p_maintenant at time zone v_fuseau)::date, emetteur = f.emetteur, destinataire = f.destinataire,
         mentions = jsonb_strip_nulls(jsonb_build_object(
           'mandat', f.mentions ->> 'mandat',
           'objet', format('Avoir %s la facture %s du %s', case when a.total then 'annulant' else 'partiel sur' end, f.reference, to_char(f.date_facture, 'DD/MM/YYYY')),
           'motif', a.motif, 'contrat', f.contrat_numero,
           'nature_operations', f.mentions ->> 'nature_operations',
           'tva', f.mentions ->> 'tva',
           'option_debits', f.mentions ->> 'option_debits',
           'mentions_manquantes', f.mentions -> 'mentions_manquantes'))
   where id = a.id;
  -- La facture est annulée quand ses avoirs la couvrent ; une facture réglée garde son règlement (l'avoir vaut remboursement).
  select coalesce(sum(x.montant_ttc), 0) into v_credite from public.loc_avoirs x where x.client_id = p_client and x.facture_id = f.id and x.statut = 'emis';
  if v_credite >= f.total_ttc and f.statut in ('emise', 'envoyee', 'litige') then
    update public.loc_factures set statut = 'avoir' where id = f.id;
  end if;
  -- La demande n'est pas close ici : c'est le départ du courriel qui l'exécute.
  perform private.journaliser_module(p_client, 'tavaro', 'tavaro.avoir_emis', 'loc_avoirs', a.id::text,
    jsonb_build_object('reference', v_ref, 'montant_ttc', a.montant_ttc, 'total', a.total, 'facture', f.id, 'facture_reference', f.reference,
                       'facture_statut', case when v_credite >= f.total_ttc then 'creditee' else 'partiellement_creditee' end,
                       'demande', a.demande_id, 'contrat', f.contrat_numero), a.entite_id);
  perform private.battre(p_client, 'tavaro_facturation', jsonb_build_object('avoir', a.id, 'facture', f.id), interval '1 day');
  return a.id;
end $function$


-- ═══ FONCTION private.loc_emettre_factures
CREATE OR REPLACE FUNCTION private.loc_emettre_factures(p_client uuid, p_proposition uuid, p_maintenant timestamp with time zone DEFAULT now())
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.loc_propositions;
  c public.loc_contrats;
  l public.loc_locataires;
  d public.demandes_validation;
  v_fuseau text;
  v_societe uuid;
  v_nom text;
  v_siren text;
  v_reglages public.loc_reglages;
  v_emetteur jsonb;
  v_destinataire jsonb;
  v_manquantes text[] := '{}';
  v_pro boolean;
  v_retour timestamptz;
  v_annee integer;
  v_date date;
  v_nature text;
  v_numero integer;
  v_ref text;
  v_facture uuid;
  v_factures uuid[] := '{}';
  v_ht numeric;
  v_tva numeric;
  v_ttc numeric;
  v_taxable boolean;
  v_rang integer;
  li record;
begin
  select * into p from public.loc_propositions where client_id = p_client and id = p_proposition for update;
  if not found then
    raise exception 'Proposition introuvable.' using errcode = 'P0002';
  end if;
  if p.statut <> 'validee' then
    raise exception 'Seule une proposition validée se facture (statut : %).', p.statut using errcode = '23514';
  end if;
  select * into d from public.demandes_validation where id = p.demande_id;
  if not found or d.statut not in ('approuvee', 'echec_execution') then
    raise exception 'Aucune facture sans demande approuvée.' using errcode = '23514';
  end if;
  select * into c from public.loc_contrats where client_id = p_client and id = p.contrat_id;
  select e.fuseau into v_fuseau from public.entites e where e.client_id = p_client and e.id = p.entite_id;
  select e.id, e.siren into v_societe, v_siren from public.entites e where e.client_id = p_client and e.principale;
  select k.nom, coalesce(v_siren, k.siren) into v_nom, v_siren from public.clients k where k.id = p_client;
  select * into v_reglages from public.loc_reglages g where g.client_id = p_client;
  if c.locataire_id is not null then
    select * into l from public.loc_locataires x where x.client_id = p_client and x.id = c.locataire_id;
  end if;
  -- La restitution : ce que le retour chiffré a donné, sinon le contrat.
  v_retour := coalesce((p.entrees ->> 'retour_reel_le')::timestamptz, c.retour_reel_le);

  -- L'émetteur : l'organisation, sa société principale, ses réglages.
  v_emetteur := jsonb_strip_nulls(jsonb_build_object('nom', v_nom, 'siren', v_siren)
                || coalesce(v_reglages.emetteur, '{}'::jsonb));
  if v_siren is null then v_manquantes := array_append(v_manquantes, 'siren_emetteur'); end if;
  if v_emetteur ->> 'adresse' is null then v_manquantes := array_append(v_manquantes, 'adresse_emetteur'); end if;

  -- Le destinataire : le locataire du contrat, tel qu'il est connu.
  v_pro := l.id is not null and l.type = 'professionnel';
  if l.id is null or l.anonymise_le is not null then
    v_destinataire := jsonb_build_object('type', 'inconnu');
    v_manquantes := array_append(v_manquantes, 'client');
  else
    v_destinataire := jsonb_strip_nulls(jsonb_build_object(
      'type', l.type, 'nom', nullif(btrim(concat_ws(' ', l.prenom, l.nom)), ''), 'raison_sociale', l.raison_sociale,
      'siren', l.siren, 'adresse', l.adresse, 'email', l.email));
    if v_pro and l.siren is null then v_manquantes := array_append(v_manquantes, 'siren_client'); end if;
    if l.adresse is null then v_manquantes := array_append(v_manquantes, 'adresse_client'); end if;
    if v_pro and l.raison_sociale is null then v_manquantes := array_append(v_manquantes, 'raison_sociale_client'); end if;
    if not v_pro and l.nom is null then v_manquantes := array_append(v_manquantes, 'nom_client'); end if;
  end if;

  v_annee := extract(year from (p_maintenant at time zone v_fuseau))::integer;
  v_date := (p_maintenant at time zone v_fuseau)::date;

  for v_nature in select x from unnest(array['frais', 'dommages']) x loop
    select coalesce(sum(montant_ht), 0), coalesce(sum(montant_tva), 0), coalesce(sum(montant_ttc), 0),
           bool_or(regime_tva = 'taxable')
      into v_ht, v_tva, v_ttc, v_taxable
    from public.loc_proposition_lignes pl
    where pl.proposition_id = p.id and pl.statut = 'chiffree' and pl.montant_ttc > 0
      and pl.nature = case v_nature when 'frais' then 'frais' else 'dommage' end;
    continue when v_ttc <= 0;

    v_numero := private.loc_numero_facture(p_client, v_societe, v_annee);
    v_ref := format('FA-%s-%s', v_annee, lpad(v_numero::text, 6, '0'));
    insert into public.loc_factures (client_id, entite_id, entite_emettrice_id, contrat_id, contrat_numero, proposition_id, demande_id, nature,
                                     annee, numero, reference, emise_le, date_facture, echeance_le, a_debiter_avant,
                                     total_ht, total_tva, total_ttc, emetteur, destinataire, mentions)
    values (p_client, p.entite_id, v_societe, c.id, c.numero, p.id, p.demande_id, v_nature,
            v_annee, v_numero, v_ref, p_maintenant, v_date,
            v_date + case when v_pro then coalesce(v_reglages.echeance_pro_jours, 30) else 0 end,
            case when v_retour is not null then (v_retour at time zone v_fuseau)::date + 10 end,
            v_ht, v_tva, v_ttc, v_emetteur, v_destinataire,
            jsonb_strip_nulls(jsonb_build_object(
              'mandat', format('Facture établie par Omega au nom et pour le compte de %s.', v_nom),
              'objet', case v_nature when 'frais' then 'Frais complémentaires de location' else 'Dommages constatés à la restitution' end,
              'contrat', c.numero,
              'nature_operations', case when v_taxable then 'prestations_de_services' else 'hors_champ' end,
              'option_debits', case when v_taxable and coalesce(v_reglages.tva_sur_debits, false)
                                    then 'Option pour le paiement de la taxe d''après les débits' end,
              'restitution', case when v_retour is not null then to_char(v_retour at time zone v_fuseau, 'DD/MM/YYYY à HH24:MI') end,
              'tva', case when v_taxable then null else 'Indemnité hors du champ de la TVA (BOI-TVA-BASE-10-10-50, § 300).' end,
              'penalites', case when v_pro then 'En cas de retard de paiement : pénalités au taux de la BCE majoré de 10 points, et indemnité forfaitaire de recouvrement de 40 € (C. com. L441-10).' end,
              'debit', case when v_retour is not null then format('À débiter avant le %s en cas de débit sur la carte enregistrée [à vérifier : délai Visa].',
                                                                  to_char((v_retour at time zone v_fuseau)::date + 10, 'DD/MM/YYYY')) end,
              'mentions_manquantes', case when cardinality(v_manquantes) > 0 then to_jsonb(v_manquantes) end)))
    returning id into v_facture;

    v_rang := 0;
    for li in select * from public.loc_proposition_lignes pl
              where pl.proposition_id = p.id and pl.statut = 'chiffree' and pl.montant_ttc > 0
                and pl.nature = case v_nature when 'frais' then 'frais' else 'dommage' end
              order by pl.rang loop
      v_rang := v_rang + 1;
      insert into public.loc_facture_lignes (client_id, facture_id, rang, code, libelle, famille, unite, quantite, prix_unitaire, montant_ht,
                                             regime_tva, taux_tva, montant_tva, montant_ttc, bareme_ligne_id, proposition_ligne_id, preuves)
      values (p_client, v_facture, v_rang, li.code, li.libelle, li.famille, li.unite, li.quantite, li.prix_unitaire, li.montant_ht,
              li.regime_tva, li.taux_tva, li.montant_tva, li.montant_ttc, li.bareme_ligne_id, li.id, li.preuves);
    end loop;

    perform private.journaliser_module(p_client, 'tavaro', 'tavaro.facture_emise', 'loc_factures', v_facture::text,
      jsonb_build_object('reference', v_ref, 'nature', v_nature, 'total_ttc', v_ttc, 'lignes', v_rang, 'contrat', c.id, 'numero_contrat', c.numero,
                         'proposition', p.id, 'demande', p.demande_id, 'mentions_manquantes', to_jsonb(v_manquantes)), p.entite_id);
    v_factures := array_append(v_factures, v_facture);
  end loop;

  update public.loc_propositions set statut = 'facturee' where id = p.id;
  -- La demande n'est pas close ici : c'est le départ du courriel (lot 1 e) qui l'exécute.
  if cardinality(v_manquantes) > 0 and cardinality(v_factures) > 0 then
    perform private.lever_alerte_module(p_client, 'tavaro', 'attention',
      format('Facture %s émise avec des mentions manquantes : %s. Complétez la fiche du loueur ou du client.',
             (select f.reference from public.loc_factures f where f.id = v_factures[1]), array_to_string(v_manquantes, ', ')),
      jsonb_build_object('factures', to_jsonb(v_factures), 'manquantes', to_jsonb(v_manquantes), 'contrat', c.numero),
      'facture:mentions_manquantes:' || p.id::text, true, null);
  end if;
  perform private.battre(p_client, 'tavaro_facturation', jsonb_build_object('proposition', p.id, 'factures', cardinality(v_factures)), interval '1 day');
  return v_factures;
end $function$


-- ═══ FONCTION private.loc_energie
CREATE OR REPLACE FUNCTION private.loc_energie(p_brute text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case
    when c = '' then null
    when c in ('ES', 'ESSENCE', 'SP95', 'SP98', 'E10', 'SANSPLOMB', 'SUPER', 'PETROL', 'GASOLINE') then 'essence'
    when c in ('GO', 'GAZOLE', 'DIESEL', 'GASOIL') then 'diesel'
    when c in ('EL', 'ELECTRIQUE', 'ELECTRICITE', 'ELECTRIC', 'EV', 'BEV', '100ELECTRIQUE') then 'electrique'
    when c in ('EH', 'GH', 'HYBRIDE', 'HYBRID', 'HEV', 'MHEV', 'FULLHYBRID', 'MILDHYBRID',
               'HYBRIDENONRECHARGEABLE', 'HYBRIDEESSENCE', 'HYBRIDEDIESEL') then 'hybride'
    when c in ('EE', 'GL', 'PHEV', 'HYBRIDERECHARGEABLE', 'PLUGIN', 'PLUGINHYBRID', 'HYBRIDEPLUGIN') then 'hybride_rechargeable'
    when c in ('GP', 'EG', 'GPL', 'LPG') then 'gpl'
    when c in ('GN', 'EN', 'GNV', 'CNG', 'GAZNATUREL') then 'gnv'
    when c in ('FE', 'E85', 'SUPERETHANOL', 'FLEXFUEL', 'ETHANOL') then 'superethanol'
    when c in ('H2', 'HYDROGENE', 'HYDROGEN') then 'hydrogene'
    else 'autre'
  end
  from (select upper(regexp_replace(
                 translate(coalesce(p_brute, ''),
                           'àâäáãéèêëíìîïóòôöõúùûüçÀÂÄÁÃÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÇ',
                           'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'),
                 '[^0-9A-Za-z]', '', 'g')) as c) x
$function$


-- ═══ FONCTION private.loc_envoi_issue
CREATE OR REPLACE FUNCTION private.loc_envoi_issue(p_charge jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.loc_propositions;
  a public.loc_avoirs;
  e public.envois;
  v_type text := p_charge ->> 'objet_type';
  v_issue text := split_part(coalesce(p_charge ->> 'evenement', ''), '.', 2);
  v_n integer;
  v_refs text;
  v_quoi text;
  v_numero text;
  v_client uuid;
  v_entite uuid;
  v_objet uuid;
begin
  if v_type not in ('loc_propositions', 'loc_avoirs') or p_charge ->> 'envoi' is null
     or v_issue not in ('envoye', 'bloque', 'refuse', 'annule', 'expire', 'echec', 'non_remis') then
    return jsonb_build_object('statut', 'ignoree');
  end if;
  select * into e from public.envois where id = (p_charge ->> 'envoi')::uuid;
  if e.id is null then
    return jsonb_build_object('statut', 'introuvable');
  end if;

  if v_type = 'loc_avoirs' then
    select * into a from public.loc_avoirs where id = (p_charge ->> 'objet_id')::uuid;
    if a.id is null or a.client_id <> e.client_id then
      return jsonb_build_object('statut', 'introuvable');
    end if;
    v_client := a.client_id; v_entite := a.entite_id; v_objet := a.id;
    v_quoi := 'de l''avoir ' || coalesce(a.reference, '?');
    v_numero := a.contrat_numero;
    if v_issue = 'envoye' then
      update public.loc_avoirs set envoye_le = coalesce(envoye_le, now()) where id = a.id and envoi_id = e.id;
      perform private.journaliser_module(v_client, 'tavaro', 'tavaro.avoir_envoye', 'loc_avoirs', a.id::text,
        jsonb_build_object('envoi', e.id, 'reference', a.reference, 'mode', e.mode, 'contrat', v_numero), v_entite);
      return jsonb_build_object('statut', 'envoyee', 'avoir', a.id);
    end if;
  else
    select * into p from public.loc_propositions where id = (p_charge ->> 'objet_id')::uuid;
    if p.id is null or e.client_id <> p.client_id then
      return jsonb_build_object('statut', 'introuvable');
    end if;
    v_client := p.client_id; v_entite := p.entite_id; v_objet := p.id;
    select count(*)::int, string_agg(x.reference, ' et ' order by x.numero) into v_n, v_refs
    from public.loc_factures x where x.client_id = p.client_id and x.envoi_id = e.id;
    v_quoi := case when v_n > 1 then 'des factures ' else 'de la facture ' end || coalesce(v_refs, '?');
    select x.numero into v_numero from public.loc_contrats x where x.id = p.contrat_id;
    if v_issue = 'envoye' then
      update public.loc_factures set statut = 'envoyee' where client_id = p.client_id and envoi_id = e.id and statut = 'emise';
      perform private.journaliser_module(v_client, 'tavaro', 'tavaro.facture_envoyee', 'loc_propositions', p.id::text,
        jsonb_build_object('envoi', e.id, 'factures', v_refs, 'mode', e.mode, 'contrat', v_numero), v_entite);
      return jsonb_build_object('statut', 'envoyee', 'factures', v_n);
    end if;
  end if;

  perform private.lever_alerte_module(v_client, 'tavaro', case when v_issue = 'echec' then 'critique' else 'attention' end,
    case when v_issue = 'non_remis'
      then format('Le courriel %s (contrat %s) n''a pas été remis%s. Envoyez-le autrement.', v_quoi, coalesce(v_numero, '?'),
                  coalesce(' (' || e.motif || ')', ''))
      else format('Le courriel %s (contrat %s) n''est pas parti%s. Envoyez-le vous-même.', v_quoi, coalesce(v_numero, '?'),
                  coalesce(' (' || e.motif || ')', '')) end,
    jsonb_build_object('objet_type', v_type, 'objet', v_objet, 'envoi', e.id, 'issue', v_issue, 'verrou', e.verrou, 'motif', e.motif),
    case when v_type = 'loc_avoirs' then 'avoir:envoi_' else 'facture:envoi_' end || v_issue || ':' || v_objet::text, true, null);
  perform private.journaliser_module(v_client, 'tavaro', case when v_type = 'loc_avoirs' then 'tavaro.avoir_envoi_' else 'tavaro.facture_envoi_' end || v_issue,
    v_type, v_objet::text, jsonb_build_object('envoi', e.id, 'verrou', e.verrou, 'contrat', v_numero), v_entite);
  return jsonb_build_object('statut', v_issue);
end $function$


-- ═══ FONCTION private.loc_envoyer_avoir
CREATE OR REPLACE FUNCTION private.loc_envoyer_avoir(p_client uuid, p_avoir uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  a public.loc_avoirs;
  f public.loc_factures;
  l public.loc_locataires;
  v_nom_loueur text;
  v_client_nom text;
  v_pro boolean;
  v_agence text;
  v_sujet text;
  v_corps text;
  v_envoi uuid;
  v_statut text;
  v_verrou text;
  v_erreur text;
begin
  select * into a from public.loc_avoirs where client_id = p_client and id = p_avoir;
  if not found or a.statut <> 'emis' then
    return jsonb_build_object('statut', 'rien');
  end if;
  select * into f from public.loc_factures where client_id = p_client and id = a.facture_id;
  select e.nom into v_agence from public.entites e where e.client_id = p_client and e.id = a.entite_id;
  v_nom_loueur := a.emetteur ->> 'nom';
  v_pro := a.destinataire ->> 'type' = 'professionnel';
  v_client_nom := coalesce(a.destinataire ->> 'raison_sociale', a.destinataire ->> 'nom');

  if (private.reglages_envois_effectifs(p_client, 'tavaro') ->> 'mode') is null then
    perform private.lever_alerte_module(p_client, 'tavaro', 'attention',
      format('Le courriel de l''avoir %s (contrat %s) n''est pas parti : l''envoi par courriel n''est pas réglé pour votre organisation. Envoyez-le vous-même.',
             a.reference, a.contrat_numero),
      jsonb_build_object('avoir', a.id, 'reference', a.reference, 'contrat', a.contrat_numero), 'avoir:envoi_non_regle:' || a.id::text, true, null);
    perform private.journaliser_module(p_client, 'tavaro', 'tavaro.avoir_envoi_non_regle', 'loc_avoirs', a.id::text,
      jsonb_build_object('reference', a.reference, 'contrat', a.contrat_numero), a.entite_id);
    return jsonb_build_object('statut', 'non_regle');
  end if;

  select x.* into l from public.loc_locataires x
  where x.client_id = p_client and x.id = (select c.locataire_id from public.loc_contrats c where c.client_id = p_client and c.id = a.contrat_id);
  if l.id is null or l.anonymise_le is not null or nullif(btrim(l.email), '') is null then
    perform private.lever_alerte_module(p_client, 'tavaro', 'attention',
      format('Le courriel de l''avoir %s (contrat %s) n''est pas parti : le locataire n''a pas d''adresse de courriel. Envoyez-le vous-même.', a.reference, a.contrat_numero),
      jsonb_build_object('avoir', a.id, 'reference', a.reference, 'contrat', a.contrat_numero), 'avoir:sans_adresse:' || a.id::text, true, null);
    perform private.journaliser_module(p_client, 'tavaro', 'tavaro.avoir_envoi_sans_adresse', 'loc_avoirs', a.id::text,
      jsonb_build_object('reference', a.reference, 'contrat', a.contrat_numero), a.entite_id);
    return jsonb_build_object('statut', 'sans_adresse');
  end if;

  v_sujet := format('%s : votre avoir %s sur la facture %s — location %s', v_nom_loueur, a.reference, f.reference, a.contrat_numero);
  v_corps := format(E'Bonjour %s,\n\n%s vous adresse l''avoir suivant, qui corrige la facture %s du %s :\n\n',
                    v_client_nom, v_nom_loueur, f.reference, to_char(f.date_facture, 'DD/MM/YYYY'))
    || private.loc_texte_avoir(a, f) || E'\n'
    || format(E'Pour toute question, écrivez à l''agence %s.\n\n', v_agence)
    || coalesce(a.mentions ->> 'mandat', '') || E'\n'
    || v_nom_loueur
    || case when a.emetteur ->> 'siren' is not null then ' — SIREN ' || (a.emetteur ->> 'siren') else '' end
    || case when a.emetteur ->> 'adresse' is not null then ' — ' || (a.emetteur ->> 'adresse') else '' end || E'\n';

  begin
    v_envoi := private.preparer_envoi(p_client, 'tavaro', 'loc_avoirs', a.id::text, 'email',
      jsonb_build_object('adresse', l.email, 'nom', v_client_nom, 'ref', l.id::text, 'professionnel', v_pro, 'langue', 'fr'),
      null, '{}'::jsonb, v_sujet, v_corps, null::uuid[], 'tavaro:avoir_courriel:' || a.id::text, a.entite_id, true, false, null::timestamptz,
      jsonb_build_object('demande', a.demande_id));
  exception when others then
    v_erreur := left(sqlstate || ' ' || sqlerrm, 500);
    update public.demandes_validation set statut = 'echec_execution', motif_echec = v_erreur where id = a.demande_id and statut = 'approuvee';
    perform private.lever_alerte_module(p_client, 'tavaro', 'critique',
      format('Le courriel de l''avoir %s (contrat %s) n''a pas pu être préparé. Envoyez-le vous-même.', a.reference, a.contrat_numero),
      jsonb_build_object('avoir', a.id, 'reference', a.reference, 'erreur', v_erreur), 'avoir:envoi_echec:' || a.id::text, true, null);
    perform private.journaliser_module(p_client, 'tavaro', 'tavaro.avoir_envoi_echec', 'loc_avoirs', a.id::text,
      jsonb_build_object('reference', a.reference, 'erreur', v_erreur), a.entite_id);
    return jsonb_build_object('statut', 'echec', 'erreur', v_erreur);
  end;

  update public.loc_avoirs set envoi_id = v_envoi where id = a.id and envoi_id is null;
  select e.statut, e.verrou into v_statut, v_verrou from public.envois e where e.id = v_envoi;
  perform private.journaliser_module(p_client, 'tavaro', 'tavaro.avoir_envoi_prepare', 'loc_avoirs', a.id::text,
    jsonb_build_object('envoi', v_envoi, 'statut', v_statut, 'verrou', v_verrou, 'reference', a.reference, 'demande', a.demande_id, 'contrat', a.contrat_numero), a.entite_id);
  return jsonb_build_object('statut', 'prepare', 'envoi', v_envoi, 'envoi_statut', v_statut, 'verrou', v_verrou);
end $function$


-- ═══ FONCTION private.loc_envoyer_factures
CREATE OR REPLACE FUNCTION private.loc_envoyer_factures(p_client uuid, p_proposition uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.loc_propositions;
  c public.loc_contrats;
  l public.loc_locataires;
  f public.loc_factures;
  v_n integer;
  v_refs text;
  v_quoi text;
  v_nom_loueur text;
  v_client_nom text;
  v_pro boolean;
  v_agence text;
  v_restitution text;
  v_sujet text;
  v_corps text;
  v_envoi uuid;
  v_statut text;
  v_verrou text;
  v_erreur text;
begin
  select * into p from public.loc_propositions where client_id = p_client and id = p_proposition;
  if not found or p.statut <> 'facturee' then
    return jsonb_build_object('statut', 'rien');
  end if;
  select count(*)::int, string_agg(x.reference, ' et ' order by x.numero) into v_n, v_refs
  from public.loc_factures x where x.client_id = p_client and x.proposition_id = p.id;
  if v_n = 0 then
    return jsonb_build_object('statut', 'rien');
  end if;
  select * into f from public.loc_factures x where x.client_id = p_client and x.proposition_id = p.id order by x.numero limit 1;
  select * into c from public.loc_contrats where client_id = p_client and id = p.contrat_id;
  select e.nom into v_agence from public.entites e where e.client_id = p_client and e.id = p.entite_id;
  v_quoi := case when v_n > 1 then 'des factures ' else 'de la facture ' end || v_refs;
  v_nom_loueur := f.emetteur ->> 'nom';
  v_pro := f.destinataire ->> 'type' = 'professionnel';
  v_client_nom := coalesce(f.destinataire ->> 'raison_sociale', f.destinataire ->> 'nom');

  -- Sans réglage d'envoi pour l'organisation, rien ne passe par B4 : la facture s'envoie à la main.
  if (private.reglages_envois_effectifs(p_client, 'tavaro') ->> 'mode') is null then
    perform private.lever_alerte_module(p_client, 'tavaro', 'attention',
      format('Le courriel %s (contrat %s) n''est pas parti : l''envoi par courriel n''est pas réglé pour votre organisation. Envoyez-la vous-même.',
             v_quoi, c.numero),
      jsonb_build_object('proposition', p.id, 'contrat', c.numero, 'factures', v_refs), 'facture:envoi_non_regle:' || p.id::text, true, null);
    perform private.journaliser_module(p_client, 'tavaro', 'tavaro.facture_envoi_non_regle', 'loc_propositions', p.id::text,
      jsonb_build_object('factures', v_refs, 'contrat', c.numero), p.entite_id);
    return jsonb_build_object('statut', 'non_regle');
  end if;

  if c.locataire_id is not null then
    select * into l from public.loc_locataires x where x.client_id = p_client and x.id = c.locataire_id;
  end if;
  if l.id is null or l.anonymise_le is not null or nullif(btrim(l.email), '') is null then
    perform private.lever_alerte_module(p_client, 'tavaro', 'attention',
      format('Le courriel %s (contrat %s) n''est pas parti : le locataire n''a pas d''adresse de courriel. Envoyez-la vous-même.', v_quoi, c.numero),
      jsonb_build_object('proposition', p.id, 'contrat', c.numero, 'factures', v_refs), 'facture:sans_adresse:' || p.id::text, true, null);
    perform private.journaliser_module(p_client, 'tavaro', 'tavaro.facture_envoi_sans_adresse', 'loc_propositions', p.id::text,
      jsonb_build_object('factures', v_refs, 'contrat', c.numero), p.entite_id);
    return jsonb_build_object('statut', 'sans_adresse');
  end if;

  -- Le texte, au nom du loueur.
  v_restitution := f.mentions ->> 'restitution';
  v_sujet := format('%s : %s %s — location %s', v_nom_loueur, case when v_n > 1 then 'vos factures' else 'votre facture' end, v_refs, c.numero);
  v_corps := format(E'Bonjour %s,\n\nÀ la suite de la restitution du véhicule de la location %s%s, %s vous adresse %s :\n\n',
                    v_client_nom, c.numero, case when v_restitution is not null then ' le ' || v_restitution else '' end, v_nom_loueur,
                    case when v_n > 1 then 'les factures suivantes' else 'la facture suivante' end);
  for f in select * from public.loc_factures x where x.client_id = p_client and x.proposition_id = p.id order by x.numero loop
    v_corps := v_corps || private.loc_texte_facture(f) || E'\n';
  end loop;
  v_corps := v_corps
    || format(E'Les photos datées du départ et du retour et l''état des lieux sont à votre disposition sur simple demande à l''agence %s. Une contestation écrite adressée à l''agence suspend le recouvrement.\n\n', v_agence)
    || coalesce(f.mentions ->> 'mandat', '') || E'\n'
    || v_nom_loueur
    || case when f.emetteur ->> 'siren' is not null then ' — SIREN ' || (f.emetteur ->> 'siren') else '' end
    || case when f.emetteur ->> 'adresse' is not null then ' — ' || (f.emetteur ->> 'adresse') else '' end || E'\n';

  begin
    v_envoi := private.preparer_envoi(p_client, 'tavaro', 'loc_propositions', p.id::text, 'email',
      jsonb_build_object('adresse', l.email, 'nom', v_client_nom, 'ref', l.id::text, 'professionnel', v_pro, 'langue', 'fr'),
      null, '{}'::jsonb, v_sujet, v_corps, null::uuid[], 'tavaro:facture:' || p.id::text, p.entite_id, true, false, null::timestamptz,
      jsonb_build_object('demande', p.demande_id));
  exception when others then
    v_erreur := left(sqlstate || ' ' || sqlerrm, 500);
    update public.demandes_validation set statut = 'echec_execution', motif_echec = v_erreur where id = p.demande_id and statut = 'approuvee';
    perform private.lever_alerte_module(p_client, 'tavaro', 'critique',
      format('Le courriel %s (contrat %s) n''a pas pu être préparé. Envoyez-la vous-même.', v_quoi, c.numero),
      jsonb_build_object('proposition', p.id, 'contrat', c.numero, 'factures', v_refs, 'erreur', v_erreur), 'facture:envoi_echec:' || p.id::text, true, null);
    perform private.journaliser_module(p_client, 'tavaro', 'tavaro.facture_envoi_echec', 'loc_propositions', p.id::text,
      jsonb_build_object('factures', v_refs, 'erreur', v_erreur), p.entite_id);
    return jsonb_build_object('statut', 'echec', 'erreur', v_erreur);
  end;

  update public.loc_factures set envoi_id = v_envoi where client_id = p_client and proposition_id = p.id and envoi_id is null;
  select e.statut, e.verrou into v_statut, v_verrou from public.envois e where e.id = v_envoi;
  perform private.journaliser_module(p_client, 'tavaro', 'tavaro.facture_envoi_prepare', 'loc_propositions', p.id::text,
    jsonb_build_object('envoi', v_envoi, 'statut', v_statut, 'verrou', v_verrou, 'factures', v_refs, 'demande', p.demande_id, 'contrat', c.numero), p.entite_id);
  return jsonb_build_object('statut', 'prepare', 'envoi', v_envoi, 'envoi_statut', v_statut, 'verrou', v_verrou);
end $function$


-- ═══ FONCTION private.loc_eur
CREATE OR REPLACE FUNCTION private.loc_eur(p numeric)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT
 SET search_path TO ''
AS $function$
  select replace(to_char(p, 'FM999999990.00'), '.', ',') || ' €'
$function$


-- ═══ FONCTION private.loc_exiger_demande_approuvee
CREATE OR REPLACE FUNCTION private.loc_exiger_demande_approuvee()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  d public.demandes_validation;
  v_statut text;
begin
  select * into d from public.demandes_validation where id = new.demande_id;
  if not found or d.client_id <> new.client_id or d.module <> 'tavaro' or d.objet_type <> 'loc_propositions'
     or d.objet_id <> new.proposition_id::text or d.statut not in ('approuvee', 'executee') then
    raise exception 'Aucune facture sans demande approuvée sur sa proposition.' using errcode = '23514';
  end if;
  select p.statut into v_statut from public.loc_propositions p where p.client_id = new.client_id and p.id = new.proposition_id;
  if v_statut is null or v_statut not in ('validee', 'facturee') then
    raise exception 'La proposition de cette facture n''est pas validée (%).', coalesce(v_statut, 'introuvable') using errcode = '23514';
  end if;
  return new;
end $function$


-- ═══ FONCTION private.loc_facture_de_l_agence
CREATE OR REPLACE FUNCTION private.loc_facture_de_l_agence(p_facture uuid)
 RETURNS loc_factures
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  f public.loc_factures;
begin
  if v_uid is null then
    raise exception 'Ce geste se fait par une personne connectée.' using errcode = '42501';
  end if;
  select * into f from public.loc_factures where id = p_facture;
  if not found or not exists (select 1 from public.comptes k where k.user_id = v_uid and k.client_id = f.client_id) then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  if not private.a_un_role(f.client_id, array['gerant', 'admin', 'valideur', 'collaborateur'])
     or not private.voit_entite(f.client_id, f.entite_id) then
    raise exception 'Cette facture n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  return f;
end $function$


-- ═══ FONCTION private.loc_filtrer
CREATE OR REPLACE FUNCTION private.loc_filtrer(p_actuel jsonb, p_neuf jsonb, p_saisies jsonb, p_complement boolean, INOUT p_avert jsonb, OUT garder jsonb)
 RETURNS record
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  k text;
  v jsonb;
begin
  garder := '{}'::jsonb;
  for k, v in select * from jsonb_each(p_neuf) loop
    if p_saisies ? k then
      if (p_actuel -> k) is distinct from v and v <> 'null'::jsonb then
        p_avert := p_avert || jsonb_build_array(jsonb_build_object('code', 'saisie_protegee', 'champ', k));
      end if;
    elsif p_complement and coalesce(p_actuel -> k, 'null'::jsonb) <> 'null'::jsonb then
      if (p_actuel -> k) is distinct from v and v <> 'null'::jsonb then
        p_avert := p_avert || jsonb_build_array(jsonb_build_object('code', 'ecart_avec_le_logiciel', 'champ', k));
      end if;
    else
      garder := garder || jsonb_build_object(k, v);
    end if;
  end loop;
end $function$


-- ═══ FONCTION private.loc_garder_avoir
CREATE OR REPLACE FUNCTION private.loc_garder_avoir()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'DELETE' then
    raise exception 'Un avoir ne s''efface pas.' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    if new.statut <> 'a_valider' then
      raise exception 'Un avoir naît en attente de la direction.' using errcode = '23514';
    end if;
    return new;
  end if;
  if new.statut = 'emis' and old.statut <> 'emis' then
    if not exists (select 1 from public.demandes_validation d
                   where d.id = new.demande_id and d.client_id = new.client_id and d.module = 'tavaro' and d.type_action = 'avoir.emettre'
                     and d.objet_type = 'loc_avoirs' and d.objet_id = new.id::text and d.statut in ('approuvee', 'executee')) then
      raise exception 'Aucun avoir sans demande approuvée par la direction.' using errcode = '23514';
    end if;
  end if;
  if old.statut = 'emis'
     and (new.id, new.client_id, new.entite_id, new.entite_emettrice_id, new.facture_id, new.facture_reference, new.contrat_id, new.contrat_numero,
          new.motif, new.total, new.montant_ht, new.montant_tva, new.montant_ttc, new.lignes, new.statut, new.demande_id, new.demande_par,
          new.annee, new.numero, new.reference, new.emis_le, new.date_avoir, new.emetteur, new.destinataire, new.mentions, new.cree_le)
         is distinct from
         (old.id, old.client_id, old.entite_id, old.entite_emettrice_id, old.facture_id, old.facture_reference, old.contrat_id, old.contrat_numero,
          old.motif, old.total, old.montant_ht, old.montant_tva, old.montant_ttc, old.lignes, old.statut, old.demande_id, old.demande_par,
          old.annee, old.numero, old.reference, old.emis_le, old.date_avoir, old.emetteur, old.destinataire, old.mentions, old.cree_le) then
    raise exception 'Un avoir émis ne se modifie pas : seules ses pièces avancent.' using errcode = '42501';
  end if;
  return new;
end $function$


-- ═══ FONCTION private.loc_garder_facture
CREATE OR REPLACE FUNCTION private.loc_garder_facture()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'DELETE' then
    raise exception 'Une facture émise ne s''efface pas : un avoir la corrige.' using errcode = '42501';
  end if;
  if (new.id, new.client_id, new.entite_id, new.entite_emettrice_id, new.contrat_id, new.contrat_numero, new.proposition_id, new.demande_id,
      new.nature, new.annee, new.numero, new.reference, new.emise_le, new.date_facture, new.echeance_le, new.a_debiter_avant,
      new.total_ht, new.total_tva, new.total_ttc, new.emetteur, new.destinataire, new.mentions, new.cree_le)
     is distinct from
     (old.id, old.client_id, old.entite_id, old.entite_emettrice_id, old.contrat_id, old.contrat_numero, old.proposition_id, old.demande_id,
      old.nature, old.annee, old.numero, old.reference, old.emise_le, old.date_facture, old.echeance_le, old.a_debiter_avant,
      old.total_ht, old.total_tva, old.total_ttc, old.emetteur, old.destinataire, old.mentions, old.cree_le) then
    raise exception 'Une facture émise ne se modifie pas : seuls son règlement, son litige et ses pièces avancent.' using errcode = '42501';
  end if;
  return new;
end $function$


-- ═══ FONCTION private.loc_garder_ligne_facture
CREATE OR REPLACE FUNCTION private.loc_garder_ligne_facture()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  raise exception 'Une ligne de facture émise ne se modifie ni ne s''efface.' using errcode = '42501';
end $function$


-- ═══ FONCTION private.loc_heure_douteuse
CREATE OR REPLACE FUNCTION private.loc_heure_douteuse(p_valeur text, p_fuseau text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v text := btrim(p_valeur);
  n timestamp;
  t timestamptz;
begin
  if v is null or v = '' or (v ~ '[T ][0-9]{1,2}:[0-9]{2}' and v ~ '(Z|z|[+-][0-9]{2}(:?[0-9]{2})?)$') then
    return null;
  end if;
  n := v::timestamp;
  t := n at time zone p_fuseau;
  if (t at time zone p_fuseau) <> n then
    return 'inexistante';
  end if;
  if ((t - interval '1 hour') at time zone p_fuseau) = n or ((t + interval '1 hour') at time zone p_fuseau) = n then
    return 'ambigue';
  end if;
  return null;
end $function$


-- ═══ FONCTION private.loc_hmac
CREATE OR REPLACE FUNCTION private.loc_hmac(p_cle bytea, p_message bytea)
 RETURNS bytea
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  k bytea := p_cle;
  ipad bytea;
  opad bytea;
  i integer;
begin
  if octet_length(k) > 64 then
    k := sha256(k);
  end if;
  k := k || decode(repeat('00', 64 - octet_length(k)), 'hex');
  ipad := k;
  opad := k;
  for i in 0..63 loop
    ipad := set_byte(ipad, i, get_byte(k, i) # 54);
    opad := set_byte(opad, i, get_byte(k, i) # 92);
  end loop;
  return sha256(opad || sha256(ipad || p_message));
end $function$


-- ═══ FONCTION private.loc_horaires_valides
CREATE OR REPLACE FUNCTION private.loc_horaires_valides(p jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  e jsonb;
  j jsonb;
begin
  if p is null then
    return true;
  end if;
  if jsonb_typeof(p) <> 'array' or jsonb_array_length(p) = 0 then
    return false;
  end if;
  for e in select * from jsonb_array_elements(p) loop
    if jsonb_typeof(e) <> 'object' or jsonb_typeof(e -> 'jours') is distinct from 'array'
       or jsonb_array_length(e -> 'jours') = 0
       or coalesce(e ->> 'debut', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or coalesce(e ->> 'fin', '') !~ '^(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)$'
       or (e ->> 'debut')::time >= (e ->> 'fin')::time then
      return false;
    end if;
    for j in select * from jsonb_array_elements(e -> 'jours') loop
      if jsonb_typeof(j) <> 'number' or j::text !~ '^[1-7]$' then
        return false;
      end if;
    end loop;
  end loop;
  return true;
end $function$


-- ═══ FONCTION private.loc_huitiemes
CREATE OR REPLACE FUNCTION private.loc_huitiemes(p_pct numeric, p_sens text)
 RETURNS smallint
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case
    when p_pct is null or p_pct < 0 or p_pct > 100 then null
    when (p_pct * 8 / 100) - floor(p_pct * 8 / 100) = 0.5 then
      case when p_sens = 'retour' then ceil(p_pct * 8 / 100) else floor(p_pct * 8 / 100) end
    else round(p_pct * 8 / 100)
  end::smallint
$function$


-- ═══ FONCTION private.loc_instant
CREATE OR REPLACE FUNCTION private.loc_instant(p_valeur text, p_fuseau text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare v text := btrim(p_valeur);
begin
  if v is null or v = '' then
    return null;
  end if;
  if v ~ '[T ][0-9]{1,2}:[0-9]{2}' and v ~ '(Z|z|[+-][0-9]{2}(:?[0-9]{2})?)$' then
    return v::timestamptz;
  end if;
  return v::timestamp at time zone p_fuseau;
end $function$


-- ═══ FONCTION private.loc_ligne_bareme
CREATE OR REPLACE FUNCTION private.loc_ligne_bareme(p_bareme uuid, p_code text, p_categorie uuid)
 RETURNS loc_bareme_lignes
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select l.* from public.loc_bareme_lignes l
  where l.bareme_id = p_bareme and l.code = p_code
    and (l.categorie_id is null or l.categorie_id = p_categorie)
  order by l.categorie_id nulls last limit 1
$function$


-- ═══ FONCTION private.loc_ligne_bareme_par
CREATE OR REPLACE FUNCTION private.loc_ligne_bareme_par(p_bareme uuid, p_famille text, p_unite text, p_categorie uuid)
 RETURNS loc_bareme_lignes
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select l.* from public.loc_bareme_lignes l
  where l.bareme_id = p_bareme and l.famille = p_famille and l.unite = p_unite
    and (l.categorie_id is null or l.categorie_id = p_categorie)
  order by l.categorie_id nulls last, l.rang limit 1
$function$


-- ═══ FONCTION private.loc_lire_booleen
CREATE OR REPLACE FUNCTION private.loc_lire_booleen(p jsonb, p_champ text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare t text := lower(nullif(btrim(p ->> p_champ), ''));
begin
  if t is null then
    return null;
  elsif t in ('true', 'vrai', 'oui', 'o', 'yes', 'y', '1', 'x') then
    return true;
  elsif t in ('false', 'faux', 'non', 'n', 'no', '0') then
    return false;
  end if;
  raise exception 'Valeur illisible : %.', p_champ using errcode = '22023';
end $function$


-- ═══ FONCTION private.loc_lire_contrat_pdf
CREATE OR REPLACE FUNCTION private.loc_lire_contrat_pdf(p_client uuid, p_piece uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.pieces;
  v jsonb := '{}'::jsonb;
  r record;
  k text;
  v_sans_heure text[] := '{}';
  v_entite uuid;
  v_res jsonb;
  v_carte constant jsonb := '{"numero_contrat": "numero", "immatriculation": "immatriculation",
    "depart_le": "depart_le", "retour_prevu_le": "retour_prevu_le", "agence_depart": "agence",
    "agence_retour": "agence_retour", "km_depart": "km_depart", "km_inclus": "km_inclus",
    "km_inclus_jour": "km_inclus_jour", "km_illimite": "km_illimite", "politique_carburant": "politique_carburant",
    "tarif_jour": "tarif_jour", "franchise": "franchise", "franchise_reduite": "franchise_reduite",
    "rachat_franchise": "rachat_franchise", "depot_garantie": "depot", "categorie": "categorie",
    "conducteur_nom": "locataire_nom", "conducteur_prenom": "locataire_prenom"}';
begin
  select * into p from public.pieces where id = p_piece and client_id = p_client;
  if not found then
    return jsonb_build_object('statut', 'introuvable');
  end if;
  if p.module <> 'tavaro' or p.type_piece is distinct from 'contrat_location' then
    return jsonb_build_object('statut', 'ignoree');
  end if;
  if p.statut not in ('lue', 'a_verifier') then
    return jsonb_build_object('statut', 'pas_lue');
  end if;
  if p.chiffrement is not null then
    return jsonb_build_object('statut', 'chiffree');
  end if;

  -- Les seules valeurs vérifiées ; une correction humaine l'emporte.
  for r in
    select distinct on (pv.champ) pv.champ, pv.valeur
    from public.pieces_valeurs pv
    where pv.client_id = p_client and pv.piece_id = p.id and pv.verifiee
    order by pv.champ, (pv.source = 'humain') desc, pv.cree_le desc
  loop
    if v_carte ? r.champ then
      v := v || jsonb_build_object(v_carte ->> r.champ, r.valeur #>> '{}');
    end if;
  end loop;

  -- Une date sans heure ne dit pas l'heure : on ne l'invente pas.
  foreach k in array array['depart_le', 'retour_prevu_le'] loop
    if (v ->> k) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      v_sans_heure := v_sans_heure || k;
      v := v - k;
    end if;
  end loop;

  -- L'agence : celle où la pièce a été déposée, sauf si le contrat en nomme une.
  if p.objet_type = 'loc_agence' and p.objet_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select a.entite_id into v_entite from public.loc_agences a
    where a.client_id = p_client and a.entite_id = p.objet_id::uuid;
  end if;

  v_res := private.loc_appliquer_releve(p_client, 'contrats',
    jsonb_build_array(jsonb_build_object('n', 1, 'nature', 'ajout', 'valeurs', v)),
    jsonb_build_object('cle', 'pdf:' || p.id::text || ':' || coalesce(p.version_lecteur, '') || ':'
                              || coalesce(to_char(p.lue_le at time zone 'UTC', 'YYYYMMDDHH24MISSUS'), ''),
                       'source', 'pdf', 'priorite', 'complement', 'piece', p.id, 'entite', v_entite,
                       'lu_le', coalesce(p.lue_le, now())));
  if (v_res ->> 'rejetees')::integer > 0 then
    perform private.lever_alerte_module(p_client, 'tavaro', 'attention',
      'Un contrat lu dans un PDF n''a pas pu entrer : une valeur manque ou doute',
      jsonb_build_object('piece', p.id, 'motifs', v_res -> 'erreurs', 'dates_sans_heure', to_jsonb(v_sans_heure)),
      'contrat_pdf:' || p.id::text, true);
  end if;
  return v_res || jsonb_build_object('statut', 'applique', 'dates_sans_heure', to_jsonb(v_sans_heure));
end $function$


-- ═══ FONCTION private.loc_lire_date
CREATE OR REPLACE FUNCTION private.loc_lire_date(p jsonb, p_champ text)
 RETURNS date
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare t text := nullif(btrim(p ->> p_champ), '');
begin
  if t is null then
    return null;
  end if;
  if t !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'Valeur illisible : %.', p_champ using errcode = '22023';
  end if;
  return t::date;
exception when datetime_field_overflow or invalid_datetime_format then
  raise exception 'Valeur illisible : %.', p_champ using errcode = '22023';
end $function$


-- ═══ FONCTION private.loc_lire_decimal
CREATE OR REPLACE FUNCTION private.loc_lire_decimal(p jsonb, p_champ text)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare t text := nullif(btrim(p ->> p_champ), '');
begin
  if t is null then
    return null;
  end if;
  if t !~ '^[0-9]{1,9}(\.[0-9]{1,4})?$' then
    raise exception 'Valeur illisible : %.', p_champ using errcode = '22023';
  end if;
  return t::numeric;
end $function$


-- ═══ FONCTION private.loc_lire_entier
CREATE OR REPLACE FUNCTION private.loc_lire_entier(p jsonb, p_champ text)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare t text := nullif(btrim(p ->> p_champ), '');
begin
  if t is null then
    return null;
  end if;
  if t !~ '^[0-9]{1,9}(\.0+)?$' then
    raise exception 'Valeur illisible : %.', p_champ using errcode = '22023';
  end if;
  return trunc(t::numeric)::integer;
end $function$


-- ═══ FONCTION private.loc_lire_instant
CREATE OR REPLACE FUNCTION private.loc_lire_instant(p jsonb, p_champ text, p_fuseau text, p_heure_requise boolean DEFAULT true)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare t text := nullif(btrim(p ->> p_champ), '');
begin
  if t is null then
    return null;
  end if;
  if p_heure_requise and t ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'Heure absente : %.', p_champ using errcode = '22023';
  end if;
  if t !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}([T ][0-9]{1,2}:[0-9]{2}(:[0-9]{2}(\.[0-9]+)?)?)?(Z|z|[+-][0-9]{2}(:?[0-9]{2})?)?$' then
    raise exception 'Valeur illisible : %.', p_champ using errcode = '22023';
  end if;
  return private.loc_instant(t, p_fuseau);
exception when datetime_field_overflow or invalid_datetime_format then
  raise exception 'Valeur illisible : %.', p_champ using errcode = '22023';
end $function$


-- ═══ FONCTION private.loc_lire_texte
CREATE OR REPLACE FUNCTION private.loc_lire_texte(p jsonb, p_champ text, p_max integer DEFAULT 200)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select left(nullif(btrim(p ->> p_champ), ''), p_max)
$function$


-- ═══ FONCTION private.loc_marquer_litige
CREATE OR REPLACE FUNCTION private.loc_marquer_litige(p_facture uuid, p_motif text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  f public.loc_factures := private.loc_facture_de_l_agence(p_facture);
begin
  if f.statut not in ('emise', 'envoyee') then
    raise exception 'Cette facture ne peut pas passer en litige (%).', f.statut using errcode = '23514';
  end if;
  if nullif(btrim(p_motif), '') is null then
    raise exception 'Un litige a un motif : la contestation écrite du client.' using errcode = '22023';
  end if;
  update public.loc_factures set statut = 'litige', litige_motif = left(btrim(p_motif), 500) where id = f.id;
  perform private.journaliser_module(f.client_id, 'tavaro', 'tavaro.facture_litige', 'loc_factures', f.id::text,
    jsonb_build_object('reference', f.reference, 'motif', left(btrim(p_motif), 500)), f.entite_id);
end $function$


-- ═══ FONCTION private.loc_marquer_reglee
CREATE OR REPLACE FUNCTION private.loc_marquer_reglee(p_facture uuid, p_mode text, p_le timestamp with time zone DEFAULT now())
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  f public.loc_factures := private.loc_facture_de_l_agence(p_facture);
begin
  if f.statut not in ('emise', 'envoyee', 'litige') then
    raise exception 'Cette facture n''attend pas de règlement (%).', f.statut using errcode = '23514';
  end if;
  if p_mode not in ('depot', 'comptoir', 'virement', 'carte', 'autre') then
    raise exception 'Mode de règlement inconnu : dépôt, comptoir, virement, carte ou autre.' using errcode = '22023';
  end if;
  update public.loc_factures set statut = 'reglee', regle_le = coalesce(p_le, now()), mode_reglement = p_mode where id = f.id;
  perform private.journaliser_module(f.client_id, 'tavaro', 'tavaro.facture_reglee', 'loc_factures', f.id::text,
    jsonb_build_object('reference', f.reference, 'mode', p_mode, 'le', coalesce(p_le, now()), 'montant', f.total_ttc), f.entite_id);
end $function$


-- ═══ FONCTION private.loc_mesure_contrats_connus
CREATE OR REPLACE FUNCTION private.loc_mesure_contrats_connus(p_client uuid, p_du timestamp with time zone, p_au timestamp with time zone, p_entite uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'indicateur', 'loc_contrat_connu_avant_retour', 'version', 1,
    'du', p_du, 'au', p_au, 'entite', p_entite,
    'numerateur', count(*) filter (where c.cree_le < c.retour_reel_le),
    'denominateur', count(*),
    'valeur', case when count(*) = 0 then null
                   else round(count(*) filter (where c.cree_le < c.retour_reel_le)::numeric / count(*), 4) end)
  from public.loc_contrats c
  where c.client_id = p_client and c.statut <> 'annule'
    and c.retour_reel_le >= p_du and c.retour_reel_le < p_au
    and (p_entite is null or coalesce(c.entite_retour_id, c.entite_id) = p_entite)
$function$


-- ═══ FONCTION private.loc_mesurer
CREATE OR REPLACE FUNCTION private.loc_mesurer(p_client uuid DEFAULT NULL::uuid, p_jour date DEFAULT NULL::date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  v_jour date;
  v_factures numeric;
  v_avoirs numeric;
  v_n integer;
  v_k integer;
  v_heures numeric;
  n integer := 0;
begin
  for r in
    select a.client_id, a.entite_id, e.fuseau
    from public.loc_agences a
    join public.entites e on e.client_id = a.client_id and e.id = a.entite_id
    where p_client is null or a.client_id = p_client
    order by a.client_id, a.entite_id
  loop
    v_jour := coalesce(p_jour, (now() at time zone coalesce(r.fuseau, 'UTC'))::date - 1);
    -- Les euros facturés : les factures du jour, les avoirs du jour déduits.
    select coalesce(sum(f.total_ttc), 0) into v_factures from public.loc_factures f
    where f.client_id = r.client_id and f.entite_id = r.entite_id and f.date_facture = v_jour;
    select coalesce(sum(a.montant_ttc), 0) into v_avoirs from public.loc_avoirs a
    where a.client_id = r.client_id and a.entite_id = r.entite_id and a.statut = 'emis' and a.date_avoir = v_jour;
    if v_factures <> 0 or v_avoirs <> 0 then
      perform private.enregistrer_mesure(r.client_id, 'tavaro.euros_factures', 1, 'jour', v_jour, v_factures - v_avoirs, null, 'reel',
                                         null, r.entite_id, null, null, null, null);
      n := n + 1;
    end if;
    -- Les retours facturés : parmi les retours chiffrés ce jour-là avec des frais, ceux qui ont donné une facture.
    select count(*), count(*) filter (where p.statut = 'facturee') into v_n, v_k
    from public.loc_propositions p
    where p.client_id = r.client_id and p.entite_id = r.entite_id and p.total_ttc > 0 and p.statut <> 'remplacee'
      and (p.calculee_le at time zone coalesce(r.fuseau, 'UTC'))::date = v_jour;
    if v_n > 0 then
      perform private.enregistrer_mesure(r.client_id, 'tavaro.retours_factures', 1, 'jour', v_jour, null, v_n, 'reel',
                                         v_k, r.entite_id, null, null, null, null);
      n := n + 1;
    end if;
    -- Le délai de décision : les demandes de facture décidées ce jour-là.
    select count(*), coalesce(sum(extract(epoch from (d.decide_le - d.cree_le)) / 3600.0), 0) into v_n, v_heures
    from public.demandes_validation d
    where d.client_id = r.client_id and d.entite_id = r.entite_id and d.module = 'tavaro' and d.type_action like 'facture.%'
      and d.decide_le is not null and (d.decide_le at time zone coalesce(r.fuseau, 'UTC'))::date = v_jour;
    if v_n > 0 then
      perform private.enregistrer_mesure(r.client_id, 'tavaro.delai_decision', 1, 'jour', v_jour, null, v_n, 'reel',
                                         round(v_heures, 4), r.entite_id, null, null, null, null);
      n := n + 1;
    end if;
  end loop;
  for r in select distinct a.client_id from public.loc_agences a where p_client is null or a.client_id = p_client loop
    perform private.battre(r.client_id, 'tavaro_mesure', jsonb_build_object('jour', coalesce(p_jour, current_date - 1), 'mesures', n), interval '2 days');
  end loop;
  return n;
end $function$


-- ═══ FONCTION private.loc_mot
CREATE OR REPLACE FUNCTION private.loc_mot(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select nullif(upper(regexp_replace(
           translate(coalesce(p, ''), 'àâäáãéèêëíìîïóòôöõúùûüçÀÂÄÁÃÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÇ',
                     'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'),
           '[^0-9A-Za-z]', '', 'g')), '')
$function$


-- ═══ FONCTION private.loc_numero_facture
CREATE OR REPLACE FUNCTION private.loc_numero_facture(p_client uuid, p_emettrice uuid, p_annee integer)
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select private.loc_numero_serie(p_client, p_emettrice, 'FA', p_annee)
$function$


-- ═══ FONCTION private.loc_numero_serie
CREATE OR REPLACE FUNCTION private.loc_numero_serie(p_client uuid, p_emettrice uuid, p_prefixe text, p_annee integer)
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  insert into public.loc_series_factures (client_id, entite_id, prefixe, annee, dernier) values (p_client, p_emettrice, p_prefixe, p_annee, 1)
  on conflict (client_id, entite_id, prefixe, annee) do update set dernier = public.loc_series_factures.dernier + 1, maj_le = now()
  returning dernier
$function$


-- ═══ FONCTION private.loc_options
CREATE OR REPLACE FUNCTION private.loc_options(p text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select nullif(array(select distinct left(upper(regexp_replace(btrim(
                        translate(o, 'àâäáãéèêëíìîïóòôöõúùûüçÀÂÄÁÃÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÇ',
                                  'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')), '\s+', '_', 'g')), 40)
                      from regexp_split_to_table(coalesce(p, ''), '[,;|]') o
                      where btrim(o) <> '' order by 1), '{}')
$function$


-- ═══ FONCTION private.loc_ouvrier
CREATE OR REPLACE FUNCTION private.loc_ouvrier(p_nombre integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t public.travaux;
  v_res jsonb;
  v_faits integer := 0;
  v_rendus integer := 0;
begin
  for t in
    select * from private.prendre_travaux(array['tavaro.piece_lue', 'tavaro.appliquer_releve', 'tavaro.releve_en_retard',
                                                'tavaro.deposer_demande', 'tavaro.decision', 'tavaro.envoi'],
                                          p_nombre, interval '5 minutes', 'tavaro-base')
  loop
    begin
      v_res := case t.genre
        when 'tavaro.piece_lue' then
          case when t.charge ->> 'module' = 'tavaro' and t.client_id is not null
                    and (t.charge ->> 'piece') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
               then private.loc_lire_contrat_pdf(t.client_id, (t.charge ->> 'piece')::uuid)
               else jsonb_build_object('statut', 'ignoree') end
        when 'tavaro.appliquer_releve' then private.loc_appliquer_releve_b1(t.charge)
        when 'tavaro.releve_en_retard' then private.loc_releve_en_retard(t.charge)
        when 'tavaro.deposer_demande' then
          jsonb_build_object('demande', private.loc_deposer_demande(t.client_id, (t.charge ->> 'proposition')::uuid))
        when 'tavaro.decision' then
          case when t.charge ->> 'objet_type' = 'loc_avoirs' then private.loc_decision_avoir(t.charge)
               else private.loc_appliquer_decision(t.charge) end
        when 'tavaro.envoi' then private.loc_envoi_issue(t.charge)
      end;
      perform private.finir_travail(t.id, v_res);
      v_faits := v_faits + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 300), true);
      v_rendus := v_rendus + 1;
    end;
  end loop;
  return jsonb_build_object('faits', v_faits, 'rendus', v_rendus);
end $function$


-- ═══ FONCTION private.loc_pieces_a_purger
CREATE OR REPLACE FUNCTION private.loc_pieces_a_purger(p_client uuid, p_maintenant timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object('piece', x.id, 'bucket', 'omega-clients', 'chemin', x.chemin,
                                               'octets', x.octets, 'conserver_jusqu_au', x.jusqu_au)
                            order by x.jusqu_au, x.id), '[]'::jsonb)
  from (
    select p.id, p.chemin, p.octets,
           ((coalesce((select max(coalesce(c.retour_reel_le, c.retour_prevu_le)) from public.loc_contrats c
                       where c.client_id = p.client_id and c.piece_id = p.id), p.recue_le) at time zone 'UTC')::date
            + make_interval(years => coalesce((select g.duree_contrats_ans from public.loc_reglages g
                                                where g.client_id = p.client_id), 5)))::date as jusqu_au
    from public.pieces p
    where p.client_id = p_client and p.module = 'tavaro' and p.objet_type = 'loc_agence'
      and (p.type_piece = 'contrat_location' or p.type_piece is null)
  ) x
  where x.jusqu_au < (p_maintenant at time zone 'UTC')::date
$function$


-- ═══ FONCTION private.loc_plafond_franchise
CREATE OR REPLACE FUNCTION private.loc_plafond_franchise(p_franchise numeric, p_franchise_reduite numeric, p_rachat boolean)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case
    when p_rachat then coalesce(p_franchise_reduite, 0)
    when p_rachat is null and p_franchise_reduite is not null then null
    else p_franchise
  end
$function$


-- ═══ FONCTION private.loc_plaque
CREATE OR REPLACE FUNCTION private.loc_plaque(p_brute text, OUT plaque text, OUT format text)
 RETURNS record
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  v text;
  m text[];
begin
  if p_brute is null or btrim(p_brute) = '' then
    return;
  end if;
  v := upper(regexp_replace(p_brute, '[^0-9A-Za-z]', '', 'g'));
  if v ~ '^[A-HJ-NP-TV-Z]{2}[0-9]{3}[A-HJ-NP-TV-Z]{2}$' and substr(v, 3, 3) <> '000'
     and substr(v, 1, 2) <> 'SS' and substr(v, 6, 2) <> 'SS' then
    plaque := substr(v, 1, 2) || '-' || substr(v, 3, 3) || '-' || substr(v, 6, 2);
    format := 'siv';
    return;
  end if;
  m := regexp_match(v, '^([0-9]{1,4})([A-Z]{1,3})(97[1-6]|2A|2B|[0-9]{2})$');
  if m is not null and m[1]::integer > 0 then
    plaque := m[1] || ' ' || m[2] || ' ' || m[3];
    format := 'fni';
    return;
  end if;
  plaque := left(upper(regexp_replace(btrim(p_brute), '\s+', ' ', 'g')), 20);
  format := 'autre';
end $function$


-- ═══ FONCTION private.loc_politique_carburant
CREATE OR REPLACE FUNCTION private.loc_politique_carburant(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case private.loc_mot(p)
    when 'PLEINCONTREPLEIN' then 'plein_contre_plein' when 'PLEINPLEIN' then 'plein_contre_plein'
    when 'PLEINAPLEIN' then 'plein_contre_plein' when 'FULLTOFULL' then 'plein_contre_plein'
    when 'FULLFULL' then 'plein_contre_plein'
    when 'MEMENIVEAU' then 'meme_niveau' when 'SAMETOSAME' then 'meme_niveau' when 'NIVEAUIDENTIQUE' then 'meme_niveau'
    when 'MEMECHARGE' then 'meme_niveau'
    when 'PREPAYE' then 'prepaye' when 'PREPAID' then 'prepaye' when 'FORFAITPLEIN' then 'prepaye'
    when 'FULLTOEMPTY' then 'prepaye' when 'PLEINPREPAYE' then 'prepaye'
    when 'SEUIL' then 'seuil' when 'SEUILDECHARGE' then 'seuil' when 'CHARGEMINIMALE' then 'seuil'
  end
$function$


-- ═══ FONCTION private.loc_porte
CREATE OR REPLACE FUNCTION private.loc_porte(p_ligne jsonb, p_champ text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case
    when p_ligne ? 'champs' then coalesce((p_ligne -> 'champs') ? p_champ, false)
    else nullif(btrim(coalesce(p_ligne -> 'valeurs' ->> p_champ, '')), '') is not null
  end
$function$


-- ═══ FONCTION private.loc_poser_ligne
CREATE OR REPLACE FUNCTION private.loc_poser_ligne(p_client uuid, p_prop uuid, p_rang integer, p_nature text, p_famille text, p_code text, p_libelle text, p_bareme_ligne uuid, p_unite text, p_quantite numeric, p_prix numeric, p_montant_ht numeric, p_regime text, p_taux numeric, p_statut text, p_calcul jsonb, p_preuves jsonb, p_hors_bareme boolean)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tva jsonb;
  v_ht numeric := case when p_statut = 'chiffree' then round(coalesce(p_montant_ht, 0), 2) else 0 end;
begin
  v_tva := case when p_statut = 'chiffree' then private.loc_tva(v_ht, p_regime, p_taux)
                else jsonb_build_object('montant_tva', 0, 'montant_ttc', 0) end;
  insert into public.loc_proposition_lignes (client_id, proposition_id, rang, nature, famille, code, libelle, bareme_ligne_id, unite,
                                             quantite, prix_unitaire, montant_ht, regime_tva, taux_tva, montant_tva, montant_ttc,
                                             statut, hors_bareme, calcul, preuves)
  values (p_client, p_prop, p_rang, p_nature, p_famille, p_code, left(p_libelle, 200), p_bareme_ligne, p_unite,
          coalesce(p_quantite, 0), p_prix, v_ht, p_regime, case when p_regime = 'taxable' then p_taux end,
          (v_tva ->> 'montant_tva')::numeric, (v_tva ->> 'montant_ttc')::numeric,
          p_statut, coalesce(p_hors_bareme, false), coalesce(p_calcul, '{}'::jsonb),
          case when jsonb_typeof(p_preuves) = 'array' then p_preuves else '[]'::jsonb end);
  return (v_tva ->> 'montant_ttc')::numeric;
end $function$


-- ═══ FONCTION private.loc_preparer_agence
CREATE OR REPLACE FUNCTION private.loc_preparer_agence()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.code := private.loc_code(new.code);
  if not private.loc_horaires_valides(new.horaires) then
    raise exception 'Horaires illisibles : [{"jours":[1..7],"debut":"HH:MM","fin":"HH:MM"}] à l''heure de l''agence.'
      using errcode = '22023';
  end if;
  return new;
end $function$


-- ═══ FONCTION private.loc_preparer_amendement
CREATE OR REPLACE FUNCTION private.loc_preparer_amendement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  select c.entite_id into new.entite_id from public.loc_contrats c
  where c.client_id = new.client_id and c.id = new.contrat_id;
  if new.entite_id is null then
    raise exception 'Contrat introuvable.' using errcode = 'P0002';
  end if;
  return new;
end $function$


-- ═══ FONCTION private.loc_preparer_categorie
CREATE OR REPLACE FUNCTION private.loc_preparer_categorie()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.code := private.loc_code(new.code);
  return new;
end $function$


-- ═══ FONCTION private.loc_preparer_vehicule
CREATE OR REPLACE FUNCTION private.loc_preparer_vehicule()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p record;
begin
  select * into p from private.loc_plaque(new.immatriculation);
  if p.plaque is null then
    raise exception 'Une immatriculation est requise.' using errcode = '22023';
  end if;
  new.immatriculation := p.plaque;
  new.format_plaque := p.format;
  if new.vin is not null then
    new.vin := nullif(upper(regexp_replace(new.vin, '\s', '', 'g')), '');
  end if;
  return new;
end $function$


-- ═══ FONCTION private.loc_publier_bareme
CREATE OR REPLACE FUNCTION private.loc_publier_bareme(p_libelle text, p_date_effet date, p_lignes jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_client uuid;
  v_clients integer;
  v_bareme uuid;
  l jsonb;
  v_n integer := 0;
  v_cat uuid;
  v_prix numeric;
  v_taux numeric;
begin
  if v_uid is null then
    raise exception 'Un barème se publie par une personne connectée.' using errcode = '42501';
  end if;
  select count(distinct k.client_id), min(k.client_id::text)::uuid into v_clients, v_client
  from public.comptes k where k.user_id = v_uid;
  if v_clients <> 1 then
    raise exception 'Cette personne n''appartient pas à un seul loueur.' using errcode = '22023';
  end if;
  if not private.a_un_role(v_client, array['gerant', 'admin']) then
    raise exception 'Seule la direction publie le barème.' using errcode = '42501';
  end if;
  if p_libelle is null or char_length(btrim(p_libelle)) = 0 then
    raise exception 'Le barème a un libellé.' using errcode = '22023';
  end if;
  if p_date_effet is null then
    raise exception 'Le barème a une date d''effet.' using errcode = '22023';
  end if;
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' or jsonb_array_length(p_lignes) = 0 then
    raise exception 'Un barème a au moins une ligne.' using errcode = '22023';
  end if;
  if exists (select 1 from public.loc_baremes b
             where b.client_id = v_client and b.date_effet = p_date_effet and b.statut = 'publie') then
    raise exception 'Un barème est déjà en vigueur au % : retirez-le d''abord.', to_char(p_date_effet, 'DD/MM/YYYY')
      using errcode = '22023';
  end if;

  insert into public.loc_baremes (client_id, libelle, date_effet, publie_par)
  values (v_client, btrim(p_libelle), p_date_effet, v_uid) returning id into v_bareme;

  for l in select * from jsonb_array_elements(p_lignes) loop
    v_n := v_n + 1;
    if jsonb_typeof(l) <> 'object' then
      raise exception 'Ligne % : illisible.', v_n using errcode = '22023';
    end if;
    v_cat := null;
    if nullif(btrim(l ->> 'categorie'), '') is not null then
      select c.id into v_cat from public.loc_categories c
      where c.client_id = v_client and c.code = upper(btrim(l ->> 'categorie'));
      if v_cat is null then
        raise exception 'Ligne % : catégorie inconnue « % ».', v_n, l ->> 'categorie' using errcode = '22023';
      end if;
    end if;
    begin
      v_prix := nullif(btrim(l ->> 'prix_eur'), '')::numeric;
      v_taux := nullif(btrim(l ->> 'taux_tva'), '')::numeric;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Ligne % : prix ou taux illisible.', v_n using errcode = '22023';
    end;
    begin
      insert into public.loc_bareme_lignes (client_id, bareme_id, code, libelle, famille, unite, prix_eur, regime_tva,
                                            taux_tva, categorie_id, rang)
      values (v_client, v_bareme, upper(btrim(l ->> 'code')), btrim(l ->> 'libelle'), l ->> 'famille', l ->> 'unite',
              v_prix, l ->> 'regime_tva', v_taux, v_cat, v_n);
    exception
      when unique_violation then
        raise exception 'Ligne % : le code « % » est en double pour la même catégorie.', v_n, upper(btrim(l ->> 'code'))
          using errcode = '22023';
      when check_violation or not_null_violation then
        raise exception 'Ligne % (« % ») refusée : code, libellé, famille, unité, prix et régime de TVA doivent être valides (%).',
          v_n, coalesce(l ->> 'code', '?'), sqlerrm using errcode = '22023';
    end;
  end loop;

  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.bareme_publie', 'loc_baremes', v_bareme::text,
    jsonb_build_object('libelle', btrim(p_libelle), 'date_effet', p_date_effet, 'lignes', v_n), null);
  return v_bareme;
end $function$


-- ═══ FONCTION private.loc_purger
CREATE OR REPLACE FUNCTION private.loc_purger(p_maintenant timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c record;
  r record;
  v_n integer;
  v_total integer := 0;
  v_par_client jsonb := '{}'::jsonb;
begin
  perform private.loc_conservation_locataires(null);
  for c in
    select a.client_id from public.loc_agences a
    union
    select l.client_id from public.loc_locataires l
  loop
    v_n := 0;
    for r in
      select l.id from public.loc_locataires l
      where l.client_id = c.client_id and l.anonymise_le is null
        and l.conserver_jusqu_au < (p_maintenant at time zone 'UTC')::date
        and not exists (select 1 from public.loc_contrats ct
                        where ct.client_id = l.client_id and ct.locataire_id = l.id and ct.statut = 'ouvert')
    loop
      if private.loc_anonymiser(c.client_id, r.id, 'echeance') then
        v_n := v_n + 1;
      end if;
    end loop;
    perform private.battre(c.client_id, 'tavaro_purge',
      jsonb_build_object('anonymises', v_n, 'le', p_maintenant), interval '1 day');
    v_par_client := v_par_client || jsonb_build_object(c.client_id::text, v_n);
    v_total := v_total + v_n;
  end loop;
  return jsonb_build_object('anonymises', v_total, 'par_client', v_par_client);
end $function$


-- ═══ FONCTION private.loc_regles_par_defaut
CREATE OR REPLACE FUNCTION private.loc_regles_par_defaut(p_client uuid)
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
    select * from (values
      ('facture.envoyer', 0::numeric, 1500::numeric, 1::smallint, array['gerant', 'admin', 'valideur']),
      ('facture.envoyer', 1500::numeric, null::numeric, 2::smallint, array['gerant', 'admin', 'valideur']),
      ('facture.envoyer_hors_bareme', 0::numeric, null::numeric, 1::smallint, array['gerant', 'admin']),
      ('avoir.emettre', 0::numeric, null::numeric, 1::smallint, array['gerant', 'admin'])
    ) as x(type_action, montant_min, montant_max, accords, roles)
  loop
    if not exists (select 1 from public.regles_validation g
                   where g.client_id = p_client and g.module = 'tavaro' and g.type_action = r.type_action and g.montant_min = r.montant_min) then
      insert into public.regles_validation (client_id, module, type_action, montant_min, montant_max, approbations_requises, roles_autorises)
      values (p_client, 'tavaro', r.type_action, r.montant_min, r.montant_max, r.accords, r.roles);
      n := n + 1;
    end if;
  end loop;
  if n > 0 then
    perform private.journaliser_module(p_client, 'tavaro', 'tavaro.regles_posees', 'regles_validation', p_client::text,
      jsonb_build_object('regles', n, 'seuil_deux_accords', 1500), null);
  end if;
  return n;
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


-- ═══ FONCTION private.loc_resoudre_agence
CREATE OR REPLACE FUNCTION private.loc_resoudre_agence(p_client uuid, p_code text, p_defaut uuid, OUT entite_id uuid, OUT fuseau text)
 RETURNS record
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if nullif(btrim(p_code), '') is not null then
    select a.entite_id, e.fuseau into entite_id, fuseau
    from public.loc_agences a join public.entites e on e.client_id = a.client_id and e.id = a.entite_id
    where a.client_id = p_client and a.code = private.loc_code(p_code);
    if entite_id is null then
      raise exception 'Agence inconnue : %.', left(private.loc_code(p_code), 40) using errcode = '22023';
    end if;
  elsif p_defaut is not null then
    select e.id, e.fuseau into entite_id, fuseau from public.entites e where e.client_id = p_client and e.id = p_defaut;
  end if;
end $function$


-- ═══ FONCTION private.loc_resoudre_categorie
CREATE OR REPLACE FUNCTION private.loc_resoudre_categorie(p_client uuid, p_code text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_code text := private.loc_code(p_code);
  v_id uuid;
begin
  if v_code is null then
    return null;
  end if;
  if v_code !~ '^[A-Z0-9][A-Z0-9 _./+-]{0,29}$' then
    raise exception 'Valeur illisible : categorie.' using errcode = '22023';
  end if;
  select c.id into v_id from public.loc_categories c where c.client_id = p_client and c.code = v_code;
  if v_id is null then
    insert into public.loc_categories (client_id, code, libelle, statut)
    values (p_client, v_code, v_code, 'a_completer')
    on conflict (client_id, code) do nothing
    returning id into v_id;
    if v_id is null then
      select c.id into v_id from public.loc_categories c where c.client_id = p_client and c.code = v_code;
    else
      perform private.lever_alerte_module(p_client, 'tavaro', 'attention',
        'Une catégorie inconnue est arrivée par le relevé : à compléter',
        jsonb_build_object('categorie', v_code), 'releve:categories_a_completer', true);
    end if;
  end if;
  return v_id;
end $function$


-- ═══ FONCTION private.loc_resoudre_locataire
CREATE OR REPLACE FUNCTION private.loc_resoudre_locataire(p_client uuid, p jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ref text := private.loc_lire_texte(p, 'locataire_ref', 80);
  v_cle text := private.loc_cle_rapprochement(p_client, p ->> 'locataire_permis');
  v_nom text := private.loc_lire_texte(p, 'locataire_nom', 120);
  v_prenom text := private.loc_lire_texte(p, 'locataire_prenom', 120);
  v_raison text := private.loc_lire_texte(p, 'locataire_raison_sociale', 200);
  v_email text := lower(private.loc_lire_texte(p, 'locataire_email', 320));
  v_tel text := private.loc_lire_texte(p, 'locataire_telephone', 40);
  v_adresse text := private.loc_lire_texte(p, 'locataire_adresse', 500);
  v_type text := private.loc_type_locataire(p ->> 'locataire_type');
  v_siren text := nullif(regexp_replace(coalesce(p ->> 'locataire_siren', ''), '\s', '', 'g'), '');
  v_id uuid;
begin
  if v_ref is null and v_cle is null and v_nom is null and v_email is null and v_raison is null then
    return null;
  end if;
  if v_siren !~ '^[0-9]{9}$' then
    v_siren := null;
  end if;
  if v_ref is not null then
    select l.id into v_id from public.loc_locataires l where l.client_id = p_client and l.ref_source = v_ref;
  end if;
  if v_id is null and v_cle is not null then
    select l.id into v_id from public.loc_locataires l where l.client_id = p_client and l.cle_rapprochement = v_cle;
  end if;
  if v_id is null and v_email is not null and v_nom is not null and v_prenom is not null then
    select l.id into v_id from public.loc_locataires l
    where l.client_id = p_client and lower(l.email) = v_email and lower(l.nom) = lower(v_nom)
      and lower(l.prenom) = lower(v_prenom)
    order by l.cree_le limit 1;
  end if;

  if v_id is null then
    insert into public.loc_locataires (client_id, type, ref_source, nom, prenom, raison_sociale, siren, email,
                                       telephone, adresse, cle_rapprochement)
    values (p_client, coalesce(v_type, case when v_raison is not null or v_siren is not null
                                            then 'professionnel' else 'particulier' end),
            v_ref, v_nom, v_prenom, v_raison, v_siren, v_email, v_tel, v_adresse, v_cle)
    returning id into v_id;
  else
    update public.loc_locataires l
       set type = coalesce(v_type, l.type),
           ref_source = coalesce(l.ref_source, v_ref),
           cle_rapprochement = coalesce(l.cle_rapprochement, v_cle),
           nom = coalesce(v_nom, l.nom),
           prenom = coalesce(v_prenom, l.prenom),
           raison_sociale = coalesce(v_raison, l.raison_sociale),
           siren = coalesce(v_siren, l.siren),
           email = coalesce(v_email, l.email),
           telephone = coalesce(v_tel, l.telephone),
           adresse = coalesce(v_adresse, l.adresse)
     where l.id = v_id and l.anonymise_le is null;
  end if;
  return v_id;
end $function$


-- ═══ FONCTION private.loc_resoudre_vehicule
CREATE OR REPLACE FUNCTION private.loc_resoudre_vehicule(p_client uuid, p_plaque text, p_entite uuid, p_categorie uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p record;
  v_id uuid;
begin
  select * into p from private.loc_plaque(p_plaque);
  if p.plaque is null then
    return null;
  end if;
  select v.id into v_id from public.loc_vehicules v where v.client_id = p_client and v.immatriculation = p.plaque;
  if v_id is null then
    insert into public.loc_vehicules (client_id, entite_id, immatriculation, categorie_id, statut)
    values (p_client, p_entite, p.plaque, p_categorie, 'a_confirmer')
    on conflict (client_id, immatriculation) do nothing
    returning id into v_id;
    if v_id is null then
      select v.id into v_id from public.loc_vehicules v where v.client_id = p_client and v.immatriculation = p.plaque;
    else
      perform private.lever_alerte_module(p_client, 'tavaro', 'attention',
        'Un véhicule inconnu du référentiel est arrivé par le relevé : à confirmer',
        jsonb_build_object('vehicule', v_id), 'releve:vehicules_a_confirmer', true);
    end if;
  end if;
  return v_id;
end $function$


-- ═══ FONCTION private.loc_retard_offert
CREATE OR REPLACE FUNCTION private.loc_retard_offert(p_contrat uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.loc_contrats_amendements a
                 where a.contrat_id = p_contrat and a.type = 'retard_offert')
$function$


-- ═══ FONCTION private.loc_retirer_bareme
CREATE OR REPLACE FUNCTION private.loc_retirer_bareme(p_bareme uuid, p_motif text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  b public.loc_baremes;
begin
  if v_uid is null then
    raise exception 'Un barème se retire par une personne connectée.' using errcode = '42501';
  end if;
  select * into b from public.loc_baremes where id = p_bareme for update;
  if not found or not exists (select 1 from public.comptes k where k.user_id = v_uid and k.client_id = b.client_id) then
    raise exception 'Barème introuvable.' using errcode = 'P0002';
  end if;
  if not private.a_un_role(b.client_id, array['gerant', 'admin']) then
    raise exception 'Seule la direction retire un barème.' using errcode = '42501';
  end if;
  if b.statut = 'retire' then
    raise exception 'Ce barème est déjà retiré.' using errcode = '23514';
  end if;
  update public.loc_baremes
     set statut = 'retire', retire_par = v_uid, retire_le = now(), motif_retrait = left(btrim(p_motif), 300)
   where id = b.id;
  perform private.journaliser_module(b.client_id, 'tavaro', 'tavaro.bareme_retire', 'loc_baremes', b.id::text,
    jsonb_build_object('libelle', b.libelle, 'date_effet', b.date_effet, 'motif', left(btrim(p_motif), 300)), null);
end $function$


-- ═══ FONCTION private.loc_retour_prevu_amende
CREATE OR REPLACE FUNCTION private.loc_retour_prevu_amende(p_contrat uuid)
 RETURNS timestamp with time zone
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select greatest(c.retour_prevu_le, max(a.retour_prevu_le))
  from public.loc_contrats c
  left join public.loc_contrats_amendements a
    on a.client_id = c.client_id and a.contrat_id = c.id and a.retour_prevu_le is not null
  where c.id = p_contrat
  group by c.retour_prevu_le
$function$


-- ═══ FONCTION private.loc_section_facturation
CREATE OR REPLACE FUNCTION private.loc_section_facturation(p_client uuid, p_entite uuid, p_jour date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v jsonb := '[]'::jsonb;
  n integer;
  m numeric;
begin
  -- Les propositions qui attendent une décision.
  select count(*), coalesce(sum(p.total_ttc), 0) into n, m
  from public.loc_propositions p
  where p.client_id = p_client and (p_entite is null or p.entite_id = p_entite) and p.statut = 'a_valider';
  if n > 0 then
    v := v || jsonb_build_array(jsonb_build_object('gabarit', 'tavaro.propositions_a_decider', 'valeurs', jsonb_build_object('n', n, 'montant', m),
                                                  'lien', '/tavaro/facturation', 'gravite', 'attention'));
  end if;
  -- Les retours dont la preuve manque : la facture attend.
  select count(*) into n
  from public.loc_propositions p
  where p.client_id = p_client and (p_entite is null or p.entite_id = p_entite) and p.statut = 'preuve_manquante';
  if n > 0 then
    v := v || jsonb_build_array(jsonb_build_object('gabarit', 'tavaro.preuves_manquantes', 'valeurs', jsonb_build_object('n', n),
                                                  'lien', '/tavaro/facturation', 'gravite', 'info'));
  end if;
  -- Les factures à envoyer soi-même : sans courriel, ou dont le courriel n'est pas parti.
  select count(*) into n
  from public.loc_factures f left join public.envois e on e.id = f.envoi_id
  where f.client_id = p_client and (p_entite is null or f.entite_id = p_entite) and f.statut = 'emise'
    and (f.envoi_id is null or e.statut in ('bloque', 'refuse', 'annule', 'expire', 'echec'));
  if n > 0 then
    v := v || jsonb_build_array(jsonb_build_object('gabarit', 'tavaro.factures_a_envoyer', 'valeurs', jsonb_build_object('n', n),
                                                  'lien', '/tavaro/factures', 'gravite', 'attention'));
  end if;
  -- Les factures en litige.
  select count(*), coalesce(sum(f.total_ttc), 0) into n, m
  from public.loc_factures f
  where f.client_id = p_client and (p_entite is null or f.entite_id = p_entite) and f.statut = 'litige';
  if n > 0 then
    v := v || jsonb_build_array(jsonb_build_object('gabarit', 'tavaro.factures_en_litige', 'valeurs', jsonb_build_object('n', n, 'montant', m),
                                                  'lien', '/tavaro/factures', 'gravite', 'attention'));
  end if;
  -- Les factures émises la veille.
  select count(*), coalesce(sum(f.total_ttc), 0) into n, m
  from public.loc_factures f
  where f.client_id = p_client and (p_entite is null or f.entite_id = p_entite) and f.date_facture = p_jour - 1;
  if n > 0 then
    v := v || jsonb_build_array(jsonb_build_object('gabarit', 'tavaro.factures_emises_hier', 'valeurs', jsonb_build_object('n', n, 'montant', m),
                                                  'lien', '/tavaro/factures', 'gravite', 'info'));
  end if;
  return v;
end $function$


-- ═══ FONCTION private.loc_section_reseau
CREATE OR REPLACE FUNCTION private.loc_section_reseau(p_client uuid, p_jour date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v jsonb := '[]'::jsonb;
  r record;
  v_valeurs jsonb;
begin
  for r in
    select a.entite_id, e.nom,
           (select count(*) from public.loc_propositions p where p.client_id = p_client and p.entite_id = a.entite_id and p.statut = 'a_valider') as n,
           (select coalesce(sum(p.total_ttc), 0) from public.loc_propositions p where p.client_id = p_client and p.entite_id = a.entite_id and p.statut = 'a_valider') as montant,
           (select count(*) from public.loc_propositions p where p.client_id = p_client and p.entite_id = a.entite_id and p.statut = 'preuve_manquante') as sans_preuve,
           (select coalesce(sum(f.total_ttc), 0) from public.loc_factures f where f.client_id = p_client and f.entite_id = a.entite_id and f.date_facture = p_jour - 1) as hier
    from public.loc_agences a
    join public.entites e on e.client_id = a.client_id and e.id = a.entite_id
    where a.client_id = p_client
    order by e.nom
  loop
    continue when r.n = 0 and r.sans_preuve = 0 and r.hier = 0;
    v_valeurs := jsonb_build_object('n', r.n, 'montant', r.montant, 'sans_preuve', r.sans_preuve, 'hier', r.hier);
    v := v || jsonb_build_array(jsonb_build_object(
      'texte', r.nom || ' : ' || private.point_rendre_gabarit('tavaro.agence_reseau', 1, v_valeurs),
      'gabarit', 'tavaro.agence_reseau', 'valeurs', v_valeurs, 'lien', '/tavaro/facturation',
      'gravite', case when r.n > 0 then 'attention' else 'info' end));
  end loop;
  return v;
end $function$


-- ═══ FONCTION private.loc_statut_contrat
CREATE OR REPLACE FUNCTION private.loc_statut_contrat(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case private.loc_mot(p)
    when 'OUVERT' then 'ouvert' when 'ENCOURS' then 'ouvert' when 'OPEN' then 'ouvert' when 'CHECKEDOUT' then 'ouvert'
    when 'CLOS' then 'clos' when 'CLOTURE' then 'clos' when 'CLOTUREE' then 'clos' when 'FERME' then 'clos'
    when 'TERMINE' then 'clos' when 'RESTITUE' then 'clos' when 'CLOSED' then 'clos' when 'CHECKEDIN' then 'clos'
    when 'ANNULE' then 'annule' when 'ANNULEE' then 'annule' when 'CANCELLED' then 'annule' when 'CANCELED' then 'annule'
    when 'VOID' then 'annule'
  end
$function$


-- ═══ FONCTION private.loc_statut_reservation
CREATE OR REPLACE FUNCTION private.loc_statut_reservation(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case private.loc_mot(p)
    when 'OPTION' then 'option' when 'DEVIS' then 'option' when 'QUOTE' then 'option' when 'PROVISOIRE' then 'option'
    when 'CONFIRMEE' then 'confirmee' when 'CONFIRME' then 'confirmee' when 'CONFIRMED' then 'confirmee'
    when 'RESERVEE' then 'confirmee' when 'RESERVE' then 'confirmee' when 'BOOKED' then 'confirmee'
    when 'VALIDEE' then 'confirmee'
    when 'ANNULEE' then 'annulee' when 'ANNULE' then 'annulee' when 'CANCELLED' then 'annulee' when 'CANCELED' then 'annulee'
    when 'NOSHOW' then 'no_show' when 'NONPRESENTE' then 'no_show' when 'NONPRESENTEE' then 'no_show'
    when 'CONVERTIE' then 'convertie' when 'CONTRAT' then 'convertie' when 'CHECKEDOUT' then 'convertie'
  end
$function$


-- ═══ FONCTION private.loc_taux_tva
CREATE OR REPLACE FUNCTION private.loc_taux_tva(p_client uuid, p_entite uuid, p_force numeric DEFAULT NULL::numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_taux numeric;
  v_territoire text;
begin
  if p_force is not null then
    return p_force;
  end if;
  select a.taux_tva into v_taux from public.loc_agences a where a.client_id = p_client and a.entite_id = p_entite;
  if v_taux is not null then
    return v_taux;
  end if;
  v_territoire := private.territoire_de_entite(p_client, p_entite);
  v_taux := private.loc_taux_tva_territoire(v_territoire);
  if v_taux is null then
    raise exception 'Taux de TVA inconnu pour cette agence (territoire %) : à fixer sur l''agence avec l''expert-comptable.',
      coalesce(v_territoire, 'non renseigné, étranger ou hors du champ') using errcode = '22023';
  end if;
  return v_taux;
end $function$


-- ═══ FONCTION private.loc_taux_tva_territoire
CREATE OR REPLACE FUNCTION private.loc_taux_tva_territoire(p_territoire text)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case p_territoire
    when 'metropole' then 20
    when 'alsace-moselle' then 20
    when 'guadeloupe' then 8.5
    when 'martinique' then 8.5
    when 'la-reunion' then 8.5
    when 'guyane' then 0
    when 'mayotte' then 0
  end
$function$


-- ═══ FONCTION private.loc_texte_avoir
CREATE OR REPLACE FUNCTION private.loc_texte_avoir(a loc_avoirs, f loc_factures)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v text;
  li jsonb;
begin
  v := format(E'Avoir %s du %s — %s\n', a.reference, to_char(a.date_avoir, 'DD/MM/YYYY'), coalesce(a.mentions ->> 'objet', 'avoir'));
  for li in select x from jsonb_array_elements(a.lignes) x loop
    v := v || '  · ' || (li ->> 'libelle') || ' : ' || private.loc_eur((li ->> 'montant_ht')::numeric)
         || case when li ->> 'regime_tva' = 'taxable' then ' HT' else '' end || E'\n';
  end loop;
  if a.montant_tva > 0 then
    v := v || format(E'  Total HT %s, TVA %s, total TTC %s.\n', private.loc_eur(a.montant_ht), private.loc_eur(a.montant_tva), private.loc_eur(a.montant_ttc));
  else
    v := v || format(E'  Total %s%s.\n', private.loc_eur(a.montant_ttc),
                     case when a.mentions ? 'tva' then ' (indemnité hors du champ de la TVA)' else '' end);
  end if;
  v := v || format(E'  Motif : %s\n', a.motif);
  v := v || case when f.regle_le is not null
                 then format(E'  Il porte sur la facture %s, que vous avez déjà réglée : ce montant vous sera remboursé.\n', f.reference)
                 else format(E'  Il vient en déduction de la facture %s.\n', f.reference) end;
  return v;
end $function$


-- ═══ FONCTION private.loc_texte_facture
CREATE OR REPLACE FUNCTION private.loc_texte_facture(f loc_factures)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v text;
  li record;
begin
  v := format(E'Facture %s du %s — %s\n', f.reference, to_char(f.date_facture, 'DD/MM/YYYY'), coalesce(f.mentions ->> 'objet', f.nature));
  for li in select * from public.loc_facture_lignes x where x.facture_id = f.id order by x.rang loop
    v := v || '  · ' || li.libelle
         || case when li.quantite <> 1 and li.prix_unitaire is not null
                 then format(' (%s × %s)', replace(rtrim(rtrim(li.quantite::text, '0'), '.'), '.', ','), private.loc_eur(li.prix_unitaire))
                 else '' end
         || ' : ' || private.loc_eur(li.montant_ht) || case when li.regime_tva = 'taxable' then ' HT' else '' end || E'\n';
  end loop;
  if f.total_tva > 0 then
    v := v || format(E'  Total HT %s, TVA %s, total TTC %s.\n', private.loc_eur(f.total_ht), private.loc_eur(f.total_tva), private.loc_eur(f.total_ttc));
  else
    v := v || format(E'  Total %s%s.\n', private.loc_eur(f.total_ttc),
                     case when f.mentions ? 'tva' then ' (indemnité hors du champ de la TVA)' else '' end);
  end if;
  if f.mentions ? 'option_debits' then
    v := v || '  ' || (f.mentions ->> 'option_debits') || E'.\n';
  end if;
  v := v || case when f.echeance_le <= f.date_facture then E'  À régler à réception.\n'
                 else format(E'  À régler avant le %s.\n', to_char(f.echeance_le, 'DD/MM/YYYY')) end;
  if f.a_debiter_avant is not null then
    v := v || format(E'  À débiter avant le %s en cas de débit sur la carte enregistrée.\n', to_char(f.a_debiter_avant, 'DD/MM/YYYY'));
  end if;
  if f.mentions ? 'penalites' then
    v := v || '  ' || (f.mentions ->> 'penalites') || E'\n';
  end if;
  return v;
end $function$


-- ═══ FONCTION private.loc_toucher
CREATE OR REPLACE FUNCTION private.loc_toucher()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.maj_le := now();
  return new;
end $function$


-- ═══ FONCTION private.loc_tva
CREATE OR REPLACE FUNCTION private.loc_tva(p_montant_ht numeric, p_regime text, p_taux numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  v_taux numeric;
  v_tva numeric;
begin
  if p_montant_ht is null then
    raise exception 'Montant hors taxes manquant.' using errcode = '22023';
  end if;
  if p_regime = 'hors_champ' then
    v_taux := 0;
    v_tva := 0;
  elsif p_regime = 'taxable' then
    if p_taux is null then
      raise exception 'Taux de TVA manquant pour une ligne taxable.' using errcode = '22023';
    end if;
    v_taux := p_taux;
    v_tva := round(p_montant_ht * p_taux / 100, 2);
  else
    raise exception 'Régime de TVA inconnu : %.', coalesce(p_regime, 'aucun') using errcode = '22023';
  end if;
  return jsonb_build_object('taux', v_taux, 'montant_tva', round(v_tva, 2), 'montant_ttc', round(p_montant_ht + v_tva, 2));
end $function$


-- ═══ FONCTION private.loc_type_locataire
CREATE OR REPLACE FUNCTION private.loc_type_locataire(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case private.loc_mot(p)
    when 'PARTICULIER' then 'particulier' when 'PRIVE' then 'particulier' when 'PRIVATE' then 'particulier'
    when 'B2C' then 'particulier'
    when 'PROFESSIONNEL' then 'professionnel' when 'PRO' then 'professionnel' when 'SOCIETE' then 'professionnel'
    when 'ENTREPRISE' then 'professionnel' when 'B2B' then 'professionnel' when 'BUSINESS' then 'professionnel'
    when 'CORPORATE' then 'professionnel'
  end
$function$


-- ═══ FONCTION public.loc_amender_contrat
CREATE OR REPLACE FUNCTION public.loc_amender_contrat(p_contrat uuid, p_type text, p_retour_prevu_le timestamp with time zone DEFAULT NULL::timestamp with time zone, p_km_inclus integer DEFAULT NULL::integer, p_motif text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.loc_amender_contrat(p_contrat, p_type, p_retour_prevu_le, p_km_inclus, p_motif)
$function$


-- ═══ FONCTION public.loc_anonymiser_locataire
CREATE OR REPLACE FUNCTION public.loc_anonymiser_locataire(p_locataire uuid, p_motif text DEFAULT 'demande'::text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.loc_anonymiser_locataire(p_locataire, p_motif)
$function$


-- ═══ FONCTION public.loc_appliquer_releve
CREATE OR REPLACE FUNCTION public.loc_appliquer_releve(p_client uuid, p_nature text, p_lignes jsonb, p_ctx jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.loc_appliquer_releve(p_client, p_nature, p_lignes, p_ctx)
$function$


-- ═══ FONCTION public.loc_chiffrer_retour
CREATE OR REPLACE FUNCTION public.loc_chiffrer_retour(p_contrat uuid, p_retour jsonb)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.loc_chiffrer_retour_agence(p_contrat, p_retour)
$function$


-- ═══ FONCTION public.loc_completer_contrat
CREATE OR REPLACE FUNCTION public.loc_completer_contrat(p_contrat uuid, p_valeurs jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.loc_completer_contrat(p_contrat, p_valeurs)
$function$


-- ═══ FONCTION public.loc_confirmer_purge_pieces
CREATE OR REPLACE FUNCTION public.loc_confirmer_purge_pieces(p_client uuid, p_pieces uuid[])
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.loc_confirmer_purge_pieces(p_client, p_pieces)
$function$


-- ═══ FONCTION public.loc_demander_avoir
CREATE OR REPLACE FUNCTION public.loc_demander_avoir(p_facture uuid, p_motif text, p_montant_ttc numeric DEFAULT NULL::numeric)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.loc_demander_avoir(p_facture, p_motif, p_montant_ttc)
$function$


-- ═══ FONCTION public.loc_marquer_litige
CREATE OR REPLACE FUNCTION public.loc_marquer_litige(p_facture uuid, p_motif text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.loc_marquer_litige(p_facture, p_motif)
$function$


-- ═══ FONCTION public.loc_marquer_reglee
CREATE OR REPLACE FUNCTION public.loc_marquer_reglee(p_facture uuid, p_mode text, p_le timestamp with time zone DEFAULT now())
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.loc_marquer_reglee(p_facture, p_mode, p_le)
$function$


-- ═══ FONCTION public.loc_pieces_a_purger
CREATE OR REPLACE FUNCTION public.loc_pieces_a_purger(p_client uuid, p_maintenant timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select private.loc_pieces_a_purger(p_client, p_maintenant)
$function$


-- ═══ FONCTION public.loc_publier_bareme
CREATE OR REPLACE FUNCTION public.loc_publier_bareme(p_libelle text, p_date_effet date, p_lignes jsonb)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.loc_publier_bareme(p_libelle, p_date_effet, p_lignes)
$function$


-- ═══ FONCTION public.loc_retirer_bareme
CREATE OR REPLACE FUNCTION public.loc_retirer_bareme(p_bareme uuid, p_motif text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.loc_retirer_bareme(p_bareme, p_motif)
$function$



-- ══════════════════ CRONS ══════════════════

-- ═══ CRON tavaro-matin [*/30 * * * *] select private.loc_deposer_points()

-- ═══ CRON tavaro-mesure [0 9 * * *] select private.loc_mesurer()

-- ═══ CRON tavaro-ouvrier [* * * * *] select private.loc_ouvrier()

-- ═══ CRON tavaro-purge [27 3 * * *] select private.loc_purger()
