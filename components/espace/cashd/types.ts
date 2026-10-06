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
};

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
};

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
  pieces: { facture_id: string; numero: string; palier: string; reste_du: number; retard_jours: number; penalites: number; indemnite: number }[];
};

export type Proposition = {
  raison: "montant_exact" | "plus_anciennes";
  factures: { id: string; numero: string; compte?: string; reste_du: number; echeance: string | null }[];
};
