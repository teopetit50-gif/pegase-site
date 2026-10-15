/* ══════════════════════════════════════════════════════════════════════
   Les formes partagées des trois écrans client (05/10/2026)

   Décalquées du schéma Omega (recette ygwbgpowzlbdaajlsqkn, lu le 05/10) :
   les noms de champs sont CEUX des tables, pour qu'une ligne lue par
   Supabase entre ici sans traduction, et que les jeux d'exemple aient
   exactement la même forme.
   ══════════════════════════════════════════════════════════════════════ */

/* ——— le socle ——— */

export type Role = "gerant" | "admin" | "valideur" | "collaborateur" | "lecteur";

export type Compte = {
  user_id: string;
  client_id: string;
  role: Role;
  perimetre_total: boolean;
};

export type Entite = { id: string; nom: string; principale?: boolean };

/* ——— la file de validation ——— */

export type StatutDemande =
  | "en_attente"
  | "approuvee"
  | "rejetee"
  | "annulee"
  | "expiree"
  | "executee"
  | "echec_execution";

export type Demande = {
  id: string;
  client_id: string;
  entite_id: string | null;
  module: string;
  type_action: string;
  objet_type: string | null;
  objet_id: string | null;
  resume: string;
  montant: number | null;
  devise: string;
  payload: Record<string, unknown>;
  demandeur_type: "utilisateur" | "systeme";
  demandeur_id: string | null;
  statut: StatutDemande;
  approbations_requises: number;
  roles_autorises: Role[];
  regle_id: string | null;
  echeance: string | null;
  cree_le: string;
  decide_le: string | null;
  equipe_id: string | null;
  politique_id: string | null;
  /* 05/10 (lot 19) : recopiées de la règle par preparer_demande ; le plus
     strict de la règle et de payload.exigences l'emporte. Absentes sur les
     demandes créées avant le lot 19 : l'écran retombe sur payload.exigences. */
  exige_commentaire?: boolean | null;
  exige_piece?: boolean | null;
  exige_motif?: boolean | null;
  /* enrichissements d'affichage (jointures faites côté écran) */
  entite_nom?: string;
  demandeur_nom?: string;
};

export type Approbation = {
  id: string;
  demande_id: string;
  client_id: string;
  user_id: string;
  au_nom_de: string | null;
  delegation_id: string | null;
  decision: "approuve" | "rejete";
  commentaire: string | null;
  /* 05/10 (lot 19) : la pièce jointe à la décision (→ public.pieces) */
  piece_id?: string | null;
  decide_le: string;
  user_nom?: string;
};

export type Delegation = {
  id: string;
  client_id: string;
  delegant: string;
  delegataire: string;
  entite_id: string | null;
  module: string | null;
  debut: string;
  /* obligatoire en base (NOT NULL) : une délégation a toujours un terme */
  fin: string;
  motif: string | null;
  revoquee_le: string | null;
  delegant_nom?: string;
  delegataire_nom?: string;
};

export type Regle = {
  id: string;
  entite_id: string | null;
  module: string;
  type_action: string | null;
  montant_min: number;
  montant_max: number | null;
  approbations_requises: number;
  roles_autorises: Role[];
  actif: boolean;
  equipe_id: string | null;
  exige_commentaire?: boolean;
  exige_piece?: boolean;
  exige_motif?: boolean;
};

/* public.equipes et equipes_membres : une règle peut réserver la décision aux
   membres d'une équipe (regles_validation.equipe_id → demande.equipe_id) */
export type Equipe = { id: string; cle: string; nom: string };
export type EquipesContexte = {
  noms: Record<string, string>;
  /* equipe_id → user_id des membres */
  membres: Record<string, string[]>;
};

/* public.annuaire(p_client) — qui est qui dans l'organisation (lot 19) */
export type Personne = { user_id: string; nom: string; email: string | null; role: Role };

/* ——— FILED ——— */

export type EtatDocument =
  | "en_lecture"
  | "a_classer"
  | "illisible"
  | "doublon"
  | "classe"
  | "a_traiter"
  | "integre";

export type NatureDocument =
  | "facture"
  | "avoir"
  | "bon_commande"
  | "bon_livraison"
  | "devis"
  | "releve"
  | "contrat"
  | "attestation_assurance"
  | "autre";

export type DocumentFiled = {
  id: string;
  client_id: string;
  entite_id: string | null;
  reference: string;
  piece_id: string | null;
  source: "depot" | "courriel" | "connecteur" | "api";
  expediteur: string | null;
  nom_fichier: string;
  recu_le: string;
  etat: EtatDocument;
  nature: NatureDocument | null;
  nature_source: "lecteur" | "humain" | null;
  doublon_de: string | null;
  motif: string | null;
  lu_le: string | null;
  traite_le: string | null;
  depose_par?: string | null;
};

/* filed_factures_statut_v2 (a4_02) : après la validation, la facture est
   validée, refusée ou comptabilisée */
export type StatutFacture = "a_completer" | "bloquee" | "a_valider" | "ecartee" | "validee" | "refusee" | "comptabilisee";

export type Facture = {
  id: string;
  document_id: string;
  nature: "facture" | "avoir";
  version: number;
  numero: string | null;
  date_emission: string | null;
  date_reception: string | null;
  echeance_lue: string | null;
  devise: string;
  montant_ht: number | null;
  montant_tva: number | null;
  montant_ttc: number | null;
  net_a_payer: number | null;
  regime_tva: string | null;
  fournisseur_id: string | null;
  fournisseur_identification: string | null;
  fournisseur_lu: Record<string, unknown>;
  acheteur_lu: Record<string, unknown>;
  iban: string | null;
  refs: Record<string, unknown>;
  mentions: Record<string, unknown>;
  champs_douteux: string[];
  statut: StatutFacture;
  anomalies: string[];
  nb_bloquants: number;
  nb_attention: number;
  controle_le: string | null;
  commande_id: string | null;
  avoir_de: string | null;
};

export type LigneFacture = {
  id: string;
  rang: number;
  designation: string | null;
  quantite: number | null;
  unite: string | null;
  prix_unitaire: number | null;
  remise: number | null;
  montant_ht: number | null;
  taux_tva: number | null;
  commande_ligne: string | null;
};

export type TvaFacture = {
  id: string;
  categorie: string | null;
  taux: number | null;
  base: number | null;
  montant: number | null;
};

export type Controle = {
  id: string;
  facture_id: string;
  version: number;
  code: string;
  famille: string;
  gravite: "bloquant" | "attention" | "info";
  resultat: "ok" | "anomalie" | "levee";
  message: string;
  motif_officiel: string | null;
  preuve: Record<string, unknown>;
  cle: string;
  levee_id: string | null;
};

export type Levee = {
  id: string;
  code: string;
  cle: string;
  motif: string;
  leve_par: string | null;
  leve_le: string;
  leve_par_nom?: string;
};

export type Fournisseur = {
  id: string;
  code: string | null;
  nom: string;
  siren: string | null;
  siret: string | null;
  tva: string | null;
  pays: string | null;
  statut: "a_confirmer" | "actif" | "bloque" | "refuse";
  regime_tva: string | null;
  /* a4_10 : la pièce qui l'a fait naître, sa confirmation, et le verdict
     sur son identité (registre public ou personne) */
  document_origine?: string | null;
  confirme_le?: string | null;
  confirme_par?: string | null;
  identite_verifiee_le?: string | null;
  identite_source?: "sirene" | "vies" | "humain" | null;
  identite_verdict?: VerdictIdentite | null;
};

export type VerdictIdentite = {
  resultat?: "valide" | "invalide" | "indisponible" | string;
  registre?: string;
  identifiant?: string;
  source?: string;
  verifie_le?: string;
  preuve?: Record<string, unknown> | null;
};

export type IbanFournisseur = {
  id: string;
  fournisseur_id: string;
  iban_masque: string;
  statut: "propose" | "valide" | "refuse" | "revoque";
  propose_le: string;
};

export type Rapprochement = {
  id: string;
  commande_id: string | null;
  mode: "lignes" | "totaux" | "reception" | "aucun";
  nb_lignes: number;
  nb_appariees: number;
  nb_sans_commande: number;
  ecart_prix: number;
  ecart_quantite: number;
  deja_facture: number;
  non_recu: number;
  ecart_montant: number | null;
};

export type Commande = {
  id: string;
  numero: string;
  date_commande: string | null;
  devise: string | null;
  montant_ht: number | null;
  statut: "ouverte" | "soldee" | "annulee";
  fournisseur_id: string | null;
  reference_externe: string | null;
};

export type LigneCommande = {
  id: string;
  commande_id: string;
  rang: number;
  designation: string | null;
  quantite: number | null;
  unite: string | null;
  prix_unitaire: number | null;
  montant_ht: number | null;
};

export type Historique = {
  id: number | string;
  etape: string;
  message: string;
  detail: Record<string, unknown>;
  acteur_type: "utilisateur" | "operateur" | "systeme";
  acteur_libelle: string | null;
  survenu_le: string;
};

export type MotifRefus = { code: string; libelle: string; description: string | null };

/* ——— les pièces ——— */

export type Boite = { x: number; y: number; l: number; h: number };

export type Piece = {
  id: string;
  nom_fichier: string;
  mime: string;
  chemin: string;
  nb_pages: number | null;
  statut: string;
  type_piece: string | null;
  methode: string | null;
};

export type PagePiece = { n: number; texte: string; largeur: number | null; hauteur: number | null };

export type ValeurPiece = {
  id: string;
  champ: string;
  valeur: unknown;
  texte: string | null;
  page: number | null;
  boite: Boite | null;
  source: "xml" | "regle" | "ia" | "tableur" | "humain";
  confiance: number | null;
  verifiee: boolean;
};

/* le dossier complet d'un document, tel que l'écran FILED le montre */
export type DossierFiled = {
  document: DocumentFiled;
  facture: Facture | null;
  lignes: LigneFacture[];
  tva: TvaFacture[];
  controles: Controle[];
  levees: Levee[];
  fournisseur: Fournisseur | null;
  ibans: IbanFournisseur[];
  rapprochement: Rapprochement | null;
  /* les appariements posés à la main : ligne de facture → ligne de commande */
  appariements: { facture_ligne_id: string; commande_ligne_id: string }[];
  historique: Historique[];
  piece: Piece | null;
  pages: PagePiece[];
  valeurs: ValeurPiece[];
  /* qui a déposé la pièce d'origine du fournisseur : cette personne ne le
     confirme pas (filed_confirmer_fournisseur, a4_10) */
  origine_deposee_par?: string | null;
};

/* ——— le point du matin ——— */

export type StatutPoint = "pret" | "vide" | "remis" | "echec" | "perime";

export type PointDuJour = {
  id: string;
  client_id: string;
  user_id: string;
  jour: string;
  territoire: string | null;
  fuseau: string | null;
  heure: string | null;
  statut: StatutPoint;
  canal: "email" | "whatsapp" | null;
  contenu: "complet" | "signal" | null;
  incomplet: boolean;
  motifs: unknown[];
  nb_sections: number;
  nb_items: number;
  nb_critiques: number;
  version: number;
  remis_le: string | null;
  ouvert_le: string | null;
};

export type LignePoint = {
  id: string;
  section_rang: number;
  rang: number;
  module: string | null;
  entite_nom: string | null;
  titre: string | null;
  sante: boolean;
  section_incomplete: boolean;
  texte: string | null;
  lien: string | null;
  gravite: "info" | "attention" | "critique" | null;
  objet_type: string | null;
  objet_id: string | null;
};
