/* ══════════════════════════════════════════════════════════════════════
   Les formes de l'écran Tamila (05/10/2026, session B4)

   Décalquées des tables du socle (omega/SOCLE-EXTRAITS-TAMILA.sql,
   photographie du 05/10) : les noms de champs sont CEUX des tables, pour
   qu'une ligne lue par Supabase entre ici sans traduction, et que le jeu
   d'exemple ait la même forme.

   Les colonnes `*_chiffre(e)` sont des bytea : Supabase les rend en texte
   hexadécimal (« \x01… »). Le clair n'existe qu'en mémoire du navigateur,
   une fois la clé du dossier déballée (chiffrement.ts) ; il est porté par
   `Clair`, jamais par la ligne.
   ══════════════════════════════════════════════════════════════════════ */

export type Territoire =
  | "metropole" | "alsace-moselle" | "guadeloupe" | "martinique" | "guyane" | "la-reunion" | "mayotte"
  | "saint-barthelemy" | "saint-martin" | "saint-pierre-et-miquelon";

export type Residence = Territoire | "nouvelle-caledonie" | "polynesie-francaise" | "wallis-et-futuna" | "taaf" | "etranger" | "inconnue";

export type StatutDossier = "attente" | "ouvert" | "audit" | "clos" | "efface" | "refuse";

export type Dossier = {
  id: string;
  client_id: string;
  entite_id: string;
  reference_chiffree: string | null;
  intitule_chiffre: string | null;
  numero_rg_chiffre: string | null;
  matiere: string | null;
  juridiction: string | null;
  territoire: Territoire | null;
  mode: "contentieux" | "dommage_corporel";
  statut: StatutDossier;
  perso: boolean;
  proprietaire_perso: string | null;
  responsable_id: string | null;
  cree_le: string;
  cree_par: string | null;
  demande_ouverture_id: string | null;
  ouvert_le: string | null;
  ouvert_par: string | null;
  audit_fin_le: string | null;
  clos_le: string | null;
  demande_cloture_id: string | null;
  statut_avant_cloture: "ouvert" | "audit" | null;
  effacement_prevu_le: string | null;
  efface_le: string | null;
  motif_effacement: "cloture" | "fin_audit" | "ouverture_refusee" | null;
};

/* Ce que le navigateur sait en clair d'un dossier, une fois la clé déballée. */
export type Clair = { reference: string; intitule: string; numero_rg: string | null };

export type Cle = {
  id: string;
  client_id: string;
  dossier_id: string;
  fournisseur: "local" | "scaleway";
  reference: string;
  enveloppe: string;
  algorithme: "aes-256-gcm";
  statut: "active" | "desactivee" | "detruite";
  creee_le: string;
  desactivee_le: string | null;
  destruction_prevue_le: string | null;
  detruite_le: string | null;
};

export type QualitePartie = "client" | "adverse" | "confrere_adverse" | "expert" | "juridiction" | "tiers";
export type RoleProcedure = "appelant" | "intime" | "intervenant_force" | "intervenant_volontaire";

export type Partie = {
  id: string;
  client_id: string;
  dossier_id: string;
  nom_chiffre: string;
  qualite: QualitePartie;
  role_procedure: RoleProcedure | null;
  residence: Residence;
  courriels_chiffres: string | null;
  cree_le: string;
  cree_par: string | null;
};

export type Appel = {
  id: string;
  client_id: string;
  dossier_id: string;
  introduit_le: string;
  regime: "cpc" | "cpc2017";
  procedure: "a_orienter" | "mise_en_etat" | "bref_delai";
  role_client: RoleProcedure;
  territoire: Territoire;
  cloture_previsible_le: string | null;
  cree_le: string;
  maj_le: string;
};

export type StatutDelai = "a_confirmer" | "confirme" | "rejete" | "interrompu" | "clos" | "annule";
export type ActeDelai = "signifier_declaration" | "conclure" | "signifier_conclusions" | "autre";

export type Delai = {
  id: string;
  client_id: string;
  dossier_id: string;
  appel_id: string | null;
  avis_id: string | null;
  delai_id: string;
  nature: "regle" | "date_fixee";
  regle_code: string | null;
  regle_version: number | null;
  acte: ActeDelai;
  depart: string | null;
  territoire: Territoire;
  residence: Residence | null;
  augmentation_mois: number;
  motif_augmentation: string | null;
  echeance_calculee: string | null;
  echeance_retenue: string;
  raisons: string[];
  calcul: CalculDelai | null;
  source_date: "calendrier_de_procedure" | "ordonnance" | "avis" | "saisie" | null;
  statut: StatutDelai;
  demande_id: string | null;
  confirme_par: string | null;
  confirme_le: string | null;
  confirmation: "approbation" | "modification" | "saisie" | null;
  motif_correction: string | null;
  responsable_id: string | null;
  interrompu_le: string | null;
  motif_interruption: string | null;
  acte_depose_le: string | null;
  motif_cloture: "accuse_rpva" | "declaration" | null;
  preuve_piece_id: string | null;
  clos_par: string | null;
  clos_le: string | null;
  motif_annulation: string | null;
  annule_par: string | null;
  annule_le: string | null;
  depasse_le: string | null;
  relance_48h_le: string | null;
  relance_j8_le: string | null;
  cree_le: string;
  maj_le: string;
};

/* Ce que rend tamila_calculer_delai (et que tamila_delais.calcul garde). */
export type CalculDelai = {
  echeance: string;
  brute: string;
  base: string;
  regle: string;
  version: number;
  regime: "cpc" | "cpc2017";
  article: string;
  acte: ActeDelai;
  sanction: "caducite" | "irrecevabilite" | "selon_la_partie";
  libelle: string | null;
  source: string | null;
  source_url: string | null;
  territoire: string;
  residence: string;
  depart: string;
  augmentation_mois: number;
  motif_augmentation: string;
  source_augmentation: string | null;
  raisons: string[];
  alternatives: { motif: string; echeance: string }[];
  detail: string;
};

export type Audience = {
  id: string;
  client_id: string;
  dossier_id: string;
  avis_id: string | null;
  date_heure: string;
  heure_connue: boolean;
  nature: "plaidoiries" | "mise_en_etat" | "orientation" | "reglement_amiable" | "audience";
  juridiction: string | null;
  chambre: string | null;
  avocat_id: string | null;
  statut: "prevue" | "renvoyee" | "tenue" | "annulee";
  renvoyee_a: string | null;
  source: "avis" | "agenda" | "saisie";
  cree_le: string;
};

export type TypeAvis =
  | "rpva_avis_fixation" | "rpva_avis_902" | "rpva_declaration_appel" | "rpva_conclusions" | "rpva_appel_incident"
  | "rpva_intervention" | "rpva_ordonnance_mee" | "rpva_avis_audience" | "rpva_accuse_depot" | "rpva_interruption";

export type Avis = {
  id: string;
  client_id: string;
  dossier_id: string;
  piece_id: string | null;
  type_avis: TypeAvis;
  date_avis: string;
  date_audience: string | null;
  heure_audience_connue: boolean | null;
  date_cloture_previsible: string | null;
  date_limite: string | null;
  partie_visee: "appelant" | "intime" | "intervenant" | null;
  rang: number | null;
  depose_le: string | null;
  confiance: "gabarit" | "modele" | "saisie";
  rg_concorde: boolean | null;
  statut: "lu" | "applique" | "sans_effet" | "a_rattacher" | "a_verifier";
  effet: string | null;
  cree_le: string;
};

export type Membre = {
  id: string;
  client_id: string;
  dossier_id: string;
  user_id: string;
  role_dossier: "responsable" | "intervenant" | "lecteur";
  jusqu_au: string | null;
  ajoute_par: string | null;
  ajoute_le: string;
};

export type Muraille = {
  id: string;
  client_id: string;
  dossier_id: string;
  user_id: string;
  motif_chiffre: string | null;
  pose_par: string;
  pose_le: string;
  leve_le: string | null;
  leve_par: string | null;
  demande_levee_id: string | null;
};

export type Export = {
  id: string;
  client_id: string;
  dossier_id: string | null;
  demande_par: string;
  statut: "a_preparer" | "pret" | "expire" | "echec";
  chemin: string | null;
  octets: number | null;
  empreinte_manifeste: string | null;
  motif_echec: string | null;
  cree_le: string;
  pret_le: string | null;
  expire_le: string | null;
  telecharge_le: string | null;
  telechargements: number;
  purge_le: string | null;
};

export type Reglages = {
  id: string;
  client_id: string;
  delai_cloture_jours: number;
  conservation_audit_jours: number;
  conservation_exports_jours: number;
  maj_le: string;
  /* b4_09 : l'en-tête des factures du cabinet (absent avant la pose) */
  facture_entete?: EnteteFacture;
};

/* L'en-tête des factures du cabinet (b4_09) : ses mentions publiques, les mêmes pour toutes ses factures. */
export type EnteteFacture = {
  nom?: string;
  forme?: string;
  adresse?: string;
  code_postal_ville?: string;
  siren?: string;
  tva_intracom?: string;
  barreau?: string;
  toque?: string;
  telephone?: string;
  courriel?: string;
  iban?: string;
  bic?: string;
  delai_paiement_jours?: number;
  mention_tva?: string;
};

export type RegleProcedure = {
  code: string;
  regime: "cpc" | "cpc2017";
  evenement: string;
  procedures: ("a_orienter" | "mise_en_etat" | "bref_delai")[];
  partie: "appelant" | "intime" | "intervenant_force" | "intervenant_volontaire" | "destinataire" | "toutes";
  acte: "signifier_declaration" | "conclure" | "signifier_conclusions";
  augmentable: boolean;
  interruptible: boolean;
  sanction: "caducite" | "irrecevabilite" | "selon_la_partie";
  article: string;
  libelle_court: string;
};

/* public.demandes_validation, la part utile ici : les demandes Tamila en attente. */
export type DemandeTamila = {
  id: string;
  type_action: "ouvrir_dossier" | "cloturer_dossier" | "lever_muraille" | "confirmer_delai";
  objet_id: string | null;
  resume: string;
  payload: Record<string, unknown>;
  statut: string;
  cree_le: string;
  roles_autorises: string[];
};

/* public.pieces, la part utile ici : les pièces chiffrées d'un dossier (dépôt par tamila_deposer_piece, b4_01). */
export type Piece = {
  id: string;
  client_id: string;
  objet_id: string | null;
  nom_fichier: string;
  mime: string;
  octets: number;
  sha256: string;
  chemin: string;
  statut: "recue" | "a_rattacher" | "en_attente_expediteur" | "en_lecture" | "lue" | "a_verifier" | "a_classer" | "rejetee" | "echec";
  type_piece: string | null;
  nb_pages: number | null;
  chiffrement: "dossier:v1" | null;
  depose_par: string | null;
  recue_le: string;
  motif: string | null;
};

/* public.lectures (tracées par tamila_consulter et les téléchargements). */
export type Lecture = { user_id: string; lu_le: string; contexte: string | null };

/* Une personne du cabinet (public.comptes + annuaire). */
export type Personne = { user_id: string; role: "gerant" | "admin" | "valideur" | "collaborateur" | "lecteur"; nom: string };

/* Le dossier complet, tel que l'écran le montre. */
export type DossierComplet = {
  dossier: Dossier;
  clair: Clair | null;
  cle: Cle | null;
  parties: Partie[];
  partiesClair: Record<string, { nom: string; courriels: string | null }>;
  appel: Appel | null;
  delais: Delai[];
  audiences: Audience[];
  avis: Avis[];
  membres: Membre[];
  murailles: Muraille[];
  exports: Export[];
  pieces: Piece[];
  lectures: Lecture[];
  demandes: DemandeTamila[];
  /* la fenêtre de lecture tracée (tamila_consulter) : jusqu'à quand les parties se lisent */
  consulteJusqu: string | null;
};

/* ——— les honoraires (b4_06, 06/10/2026) ——— */
export type ModeHonoraires = "temps_passe" | "forfait" | "mixte";
export type NatureTemps = "consultation" | "redaction" | "recherche" | "audience" | "rendez_vous" | "correspondance" | "deplacement" | "negociation" | "autre";
export type ModeReglement = "especes" | "cheque" | "virement" | "billet_a_ordre" | "carte";

export type Convention = {
  id: string;
  client_id: string;
  dossier_id: string;
  mode: ModeHonoraires;
  taux_horaire_cents: number | null;
  forfait_cents: number | null;
  complement_resultat_pct: number | null;
  taux_tva: number;
  urgence: boolean;
  statut: "proposee" | "signee" | "resiliee";
  signee_le: string | null;
  piece_id: string | null;
  cree_par: string | null;
  cree_le: string;
  resiliee_le: string | null;
  /* le temps prévu au forfait, en minutes (b4_12) */
  minutes_prevues?: number | null;
};

export type Temps = {
  id: string;
  client_id: string;
  dossier_id: string;
  user_id: string;
  jour: string;
  minutes: number;
  nature: NatureTemps;
  /* chiffrée avec la clé du dossier (hexadécimal « \x01… ») */
  description_chiffree: string | null;
  facturable: boolean;
  statut: "saisi" | "facture" | "annule";
  facture_id: string | null;
  cree_le: string;
  /* l'événement du dossier dont ce temps a été proposé (b4_12) : « audience:<id> », « acte:<id> », « avis:<id> » */
  origine?: string | null;
};

export type Provision = {
  id: string;
  client_id: string;
  dossier_id: string;
  montant_ttc_cents: number;
  demandee_le: string;
  recue_le: string | null;
  mode_reglement: ModeReglement | null;
  statut: "demandee" | "recue" | "annulee";
  facture_id: string | null;
  cree_par: string | null;
  cree_le: string;
};

export type Facture = {
  id: string;
  client_id: string;
  dossier_id: string;
  numero: string;
  nature: "facture" | "compte_definitif";
  emise_le: string;
  jusqu_au: string;
  minutes: number;
  honoraires_temps_cents: number;
  forfait_cents: number;
  debours_cents: number;
  total_ht_cents: number;
  taux_tva: number;
  tva_cents: number;
  total_ttc_cents: number;
  provisions_imputees_cents: number;
  reste_du_cents: number;
  statut: "emise" | "payee" | "annulee";
  payee_le: string | null;
  mode_reglement: ModeReglement | null;
  motif_annulation: string | null;
  emise_par: string | null;
  cree_le: string;
};

export type Honoraires = {
  convention: Convention | null;
  conventions: Convention[];
  temps: Temps[];
  provisions: Provision[];
  factures: Facture[];
  /* les propositions de temps que je ne veux plus voir (b4_12) */
  ecartes?: string[];
};

/* ——— conflits d'intérêts et vigilance LCB-FT (b4_07, 06/10/2026) ——— */
export type ActiviteAssujettie = "transaction_immobiliere" | "transaction_financiere" | "gestion_fonds" | "constitution_societe" | "fiducie" | "cession_entreprise" | "autre_assujettie";

export type Vigilance = {
  dossier_id: string;
  client_id: string;
  assujetti: boolean;
  activite: ActiviteAssujettie | null;
  identification_le: string | null;
  identification_piece: string | null;
  beneficiaire_effectif_le: string | null;
  risque: "faible" | "standard" | "eleve" | null;
  revue_le: string | null;
  par: string | null;
  maj_le: string;
};

/* Ce que rend tamila_conformite. */
export type Conformite = {
  dossier: string;
  index: boolean;
  parties: number;
  parties_indexees: number;
  controles: number;
  conflits_sans_decision: number;
  dernier_controle: { le: string; correspondances: number; conflits: number; decision: string | null } | null;
  vigilance: Vigilance | null;
  vigilance_a_faire: boolean;
};

/* Une correspondance rendue par tamila_controler_conflits. */
export type Trouve = { dossier: string | null; qualite: QualitePartie; statut: string | null; nature: "conflit" | "meme_cote" | "information" };
export type ControleConflits = { controle: string; correspondances: number; conflits: number; hors_vue: number; trouves: Trouve[] };
