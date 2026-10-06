/* Les formes que servent public.offload_tableau() et public.offload_fiche(p_compte) (c4_04). */

export type Niveau = "eteint" | "decroche" | "saison" | "ralentit" | "ok" | "sans_achat" | "sous_seuil";

export type Raison = { code: string; points: number; phrase: string };

export type Signal = {
  compte_id: string;
  jour: string;
  niveau: Niveau;
  depuis_le: string;
  score: number;
  priorite: number;
  valeur_annuelle: number | null;
  nb_achats: number;
  premier_achat: string | null;
  dernier_achat: string | null;
  rythme_jours: number | null;
  panier_moyen: number | null;
  attendu_le: string | null;
  jours_silence: number | null;
  retard: number | null;
  ca_12m: number | null;
  ca_12m_precedent: number | null;
  cloture_le: string | null;
  avant_cloture: boolean;
  raisons: Raison[];
};

export type StatutReprise = "a_valider" | "appel" | "envoyee" | "relance_a_valider" | "relancee" | "repondue" | "close";

export type Reprise = {
  id: string;
  compte_id: string;
  statut: StatutReprise;
  issue: string | null;
  motif: string | null;
  ouverte_par: "detection" | "manuel";
  envoye1_le: string | null;
  envoye2_le: string | null;
  repondu_le: string | null;
  close_le: string | null;
  cree_le: string;
  envoi1?: { statut: string; mode: string; verrou: string | null; sujet: string | null } | null;
  envoi2?: { statut: string; mode: string; verrou: string | null; sujet: string | null } | null;
};

export type Compte = {
  id: string;
  entite_id: string;
  ref: string;
  nom: string;
  contact: string | null;
  email: string | null;
  telephone: string | null;
  commercial: string | null;
  groupe: string | null;
  ville: string | null;
  secteur: string | null;
  source: "import" | "saisie";
  statut: "suivi" | "exclu" | "arrete";
  statut_motif: string | null;
  signal: Signal | null;
  reprise?: Reprise | null;
};

export type Tache = {
  id: string;
  compte_id: string;
  compte_nom?: string;
  reprise_id: string | null;
  type: "appel" | "repondre";
  titre: string;
  detail: string | null;
  commercial: string | null;
  echeance: string;
  statut: "a_faire" | "faite" | "abandonnee";
  compte_rendu: string | null;
  faite_le: string | null;
};

export type AValider = {
  reprise: string;
  compte_id: string;
  compte_nom: string;
  statut: StatutReprise;
  rang: 1 | 2;
  envoi: string | null;
  demande: string | null;
  mode: string | null;
  destinataire: string | null;
  sujet: string | null;
  corps: string | null;
  cree_le: string;
};

export type Reglages = {
  client_id: string;
  mode: "essai" | "reel";
  delai_silence_jours: number;
  montant_min: number;
  jour_cloture: number | null;
  alerte_avant_cloture_jours: number;
  signature: string | null;
  delai_relance_jours: number;
  quarantaine_jours: number;
  plafond_reprises_jour: number;
};

export type Compteurs = Record<
  "eteint" | "decroche" | "saison" | "ralentit" | "ok" | "sans_achat" | "avant_cloture" | "comptes" | "a_valider" | "appels" | "reponses",
  number
>;

export type Tableau = {
  client: string | null;
  reglages: Reglages | null;
  compteurs: Compteurs;
  comptes: Compte[];
  a_valider: AValider[];
  taches: Tache[];
};

export type Achat = {
  id: string;
  compte_id: string;
  date_achat: string;
  montant_ht: number;
  reference: string | null;
  libelle: string | null;
  nature: "facture" | "commande" | "avoir";
  source: "import" | "saisie";
  annule_le: string | null;
  annule_motif: string | null;
};

export type Mois = { mois: string; montant: number; pieces: number };

export type Fiche = {
  compte: Compte;
  signal: Signal | null;
  mois: Mois[];
  achats: Achat[];
  nb_achats: number;
  reprises: Reprise[];
  taches: Tache[];
};
