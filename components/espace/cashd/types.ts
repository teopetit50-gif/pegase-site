/* ══════════════════════════════════════════════════════════════════════
   CASHD — les formes lues en base (06/10/2026, session C2)

   Elles suivent au champ près ce que rendent les portes et les vues de
   omega/modules/cashd/migrations/c2_01_donnees.sql et c2_02_moteur.sql :
   cashd_tableau, cashd_fiche_compte, cashd_relances_du_jour, cashd_suivi,
   cashd_propositions. Les montants arrivent en nombres (numeric → JSON).
   ══════════════════════════════════════════════════════════════════════ */

export type StatutCompte = "actif" | "pause" | "litige" | "recouvrement" | "hors_perimetre" | "attente_contact";
export type Nature = "facture" | "acompte" | "avoir" | "devis";
export type Tranche = "non_echu" | "1_30" | "31_60" | "61_90" | "plus_90";

export type Reglages = {
  client_id: string;
  mode: "essai" | "reel";
  delai_paiement_jours: number;
  taux_penalites: number | null;
  indemnite_forfaitaire: number;
  seuil_relance: number;
  seuil_direction?: number | null;
  heure_relances?: string;
  /* c2_04 : le ton, les moyens de règlement, le métier */
  seuil_ton?: number | null;
  moyens_reglement?: string | null;
  echelonnement_des?: number | null;
  metier?: "general" | "btp";
  relance_commande_jours?: number;
  suivi_facturation_jours?: number;
  /* c2_06 : qui valide selon le montant */
  paliers_validation?: PalierValidation[] | null;
  /* c2_08 : un chargé ne voit que son portefeuille */
  portefeuille_par_charge?: boolean;
};

export type RoleValidation = "valideur" | "admin" | "gerant";
export type PalierValidation = { montant: number; roles: RoleValidation[] };

export type Totaux = {
  encours: number;
  echu: number;
  non_echu: number;
  echu_1_30: number;
  echu_31_60: number;
  echu_61_90: number;
  echu_plus_90: number;
  en_litige: number;
  credits: number;
  comptes_en_retard: number;
  factures_echues: number;
  au_dessus_du_plafond: number;
};

/* Une ligne de la balance âgée (vue cashd_balance_agee) */
export type Balance = {
  compte_id: string;
  client_id: string;
  entite_id: string;
  reference: string;
  nom: string;
  groupe: string | null;
  statut: StatutCompte;
  plafond_encours: number | null;
  devise: string;
  non_echu: number;
  echu_1_30: number;
  echu_31_60: number;
  echu_61_90: number;
  echu_plus_90: number;
  echu: number;
  en_litige: number;
  encours: number;
  credits: number;
  factures_ouvertes: number;
  factures_echues: number;
  retard_max_jours: number;
  plus_ancienne_echeance: string | null;
  depasse_plafond?: boolean;
};

export type ReglementEtat = {
  id: string;
  compte_id: string | null;
  compte?: string | null;
  recu_le: string;
  montant: number;
  mode: string | null;
  reference: string | null;
  libelle: string | null;
  statut: "actif" | "annule";
  impute: number;
  a_imputer: number;
};

export type DevisEnAttente = {
  id: string;
  numero: string;
  compte_id: string;
  compte: string;
  montant_ttc: number;
  date_emission: string;
  jours_ecoules: number;
};

export type Tableau = {
  reglages: Reglages | null;
  totaux: Totaux;
  comptes: Balance[];
  a_imputer: ReglementEtat[];
  devis_en_attente: DevisEnAttente[];
  dernier_import: string | null;
};

export type Compte = {
  id: string;
  client_id: string;
  entite_id: string;
  reference: string;
  nom: string;
  groupe: string | null;
  secteur?: string | null;
  siren: string | null;
  langue: string;
  contact_facturation_nom: string | null;
  contact_facturation_email: string | null;
  contact_commercial_email: string | null;
  plafond_encours: number | null;
  reciproque: boolean;
  statut: StatutCompte;
  statut_motif: string | null;
  statut_le: string | null;
};

/* Une pièce et son état (vue cashd_factures_etat) */
export type Piece = {
  id: string;
  compte_id: string;
  nature: Nature;
  numero: string;
  date_emission: string;
  echeance: string | null;
  montant_ttc: number;
  statut: string;
  statut_motif: string | null;
  regle: number;
  avoirs_imputes: number;
  reste_du: number;
  jours_ecoules: number;
  retard_jours: number;
  tranche: Tranche | null;
  devise?: string;
  montant_conteste?: number;
  reste_relancable?: number;
  echeance_origine?: string | null;
  reste_du_eur?: number | null;
  /* c2_04 (fiche du compte) */
  solde_decision?: "abandonne" | "reclame" | null;
  solde_decision_motif?: string | null;
  accord_oral_le?: string | null;
  accord_note?: string | null;
  attente_commande_le?: string | null;
  attente_commande_email?: string | null;
  attente_commande_nom?: string | null;
  attente_commande_motif?: string | null;
};

/* La séquence d'une pièce (vue cashd_suivi) */
export type Suivi = {
  facture_id: string;
  palier_atteint: string | null;
  palier_atteint_le: string | null;
  derniere_relance_statut: string | null;
  palier_suivant: string | null;
  palier_suivant_le: string | null;
  etat_sequence: "litige" | "reciproque" | "sequence_terminee" | "pas_encore_relancee" | "en_cours" | StatutCompte;
};

export type Fiche = {
  compte: Compte;
  balance: Balance | null;
  pieces: Piece[];
  reglements: ReglementEtat[];
  suivi: Suivi[];
  /* c2_05 : les réponses reçues à trancher, les pièces jointes */
  reponses_lues?: ReponseLue[];
  pieces_jointes?: PieceJointe[];
};

export type ReponseLue = {
  id: string;
  relance_id: string;
  lecture: "contestation" | "absence" | "promesse" | "autre";
  indice: string | null;
  proposition: "litige" | "attente_contact" | "pause" | "aucune";
  statut: "proposee" | "acceptee" | "ecartee";
  cree_le: string;
};

export type NaturePiece = "facture_pdf" | "bon_livraison" | "bon_commande" | "contrat" | "autre";
export type PieceJointe = { id: string; facture_id: string; nature: NaturePiece; chemin: string; nom: string; cree_le: string };

export type EtatRelance = "a_valider" | "validee" | "refusee" | "envoyee" | "coupee" | "non_reglee" | "sans_adresse" | "bloquee" | "echec" | "preparee";

export type Relance = {
  id: string;
  compte_id: string;
  compte: string;
  jour: string;
  nature: "facture" | "devis";
  palier: string;
  langue: string;
  destinataire_adresse: string | null;
  destinataire_nom: string | null;
  sujet: string | null;
  corps: string | null;
  montant: number;
  penalites: number;
  indemnites: number;
  statut: string;
  etat: EtatRelance;
  motif: string | null;
  demande_id: string | null;
  envoi_id: string | null;
  envoye_le: string | null;
  canal?: string | null;
  envoi_main?: { canal: string; envoye_le: string; note: string | null } | null;
  gabarit?: string | null;
  variante?: number | null;
  pieces: { facture_id: string; numero: string; palier: string; reste_du: number; retard_jours: number; penalites: number; indemnite: number }[];
};

export type Proposition = {
  raison: "montant_exact" | "plus_anciennes";
  factures: { id: string; numero: string; compte?: string; reste_du: number; echeance: string | null }[];
};

/* c2_04 — les textes de l'organisation (porte cashd_gabarits) */
export type CleGabarit = "rappel" | "relance" | "mise_en_demeure" | "devis_rappel" | "devis_relance";
export type Gabarit = {
  cle: CleGabarit;
  langue: string;
  variante: number;
  personnalise: boolean;
  sujet: string;
  corps: string;
  defaut_sujet: string | null;
  defaut_corps: string | null;
  maj_le: string | null;
};
export type LigneGabarit = { langue: string; nature: "facture" | "devis"; modele: string; maj_le: string | null };
export type Gabarits = { gabarits: Gabarit[]; variables: Record<string, string>; lignes?: LigneGabarit[] };

/* c2_04 — la relance adressée au service qui émet un bon de commande (table cashd_relances_commande) */
export type RelanceCommande = {
  id: string;
  facture_id: string;
  compte_id: string;
  jour: string;
  destinataire_adresse: string;
  destinataire_nom: string | null;
  sujet: string | null;
  corps: string | null;
  statut: "preparee" | "a_valider" | "non_reglee" | "bloquee" | "coupee" | "echec";
  motif: string | null;
};
