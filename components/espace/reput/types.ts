/* Les formes lues par l'écran REPUT (06/10/2026, session C3) — telles que
   les tables reput_* (c3_01, c3_02) et la porte reput_accords (c3_03) les
   rendent sous RLS. */

export type StatutDemande = "a_preparer" | "a_valider" | "a_traiter" | "validee" | "envoyee" | "refusee" | "bloquee" | "ignoree";
export type StatutReponse = "a_valider" | "approuvee" | "envoyee" | "refusee" | "bloquee" | "remplacee" | "sans_envoi";
export type Canal = "email" | "whatsapp" | "sms" | "formulaire";

export type Reception = {
  id: number;
  canal: Canal;
  de_nom: string | null;
  de_adresse: string | null;
  sujet: string | null;
  corps: string | null;
  recu_le: string;
  pieces: unknown[] | null;
};

export type Reponse = {
  id: string;
  demande_id: string;
  version: number;
  sujet: string;
  langue: string;
  couverte: boolean;
  objet: string | null;
  corps: string;
  sources: string[];
  raison: string | null;
  type_action: string;
  statut: StatutReponse;
  redigee_par: string | null;
  modele: string | null;
  cout_eur: number;
  cree_le: string;
};

export type Demande = {
  id: string;
  client_id: string;
  entite_id: string | null;
  reception_id: number;
  canal: Canal;
  canal_reponse: "email" | "whatsapp" | "sms" | null;
  adresse_reponse: string | null;
  de_nom: string | null;
  objet: string | null;
  statut: StatutDemande;
  sujet: string | null;
  langue: string | null;
  urgence: boolean;
  couverte: boolean | null;
  motif: string | null;
  recu_le: string;
  preparee_le: string | null;
  decidee_le: string | null;
  envoyee_le: string | null;
};

export type GenreFiche = "question" | "horaires" | "tarif" | "document" | "information";

export type Fiche = {
  id: string;
  entite_id: string | null;
  origine_id: string;
  version: number;
  sujet: string;
  genre: GenreFiche;
  titre: string;
  contenu: string;
  langue: string;
  source: string;
  valide_du: string;
  valide_au: string | null;
  statut: "brouillon" | "validee" | "remplacee" | "retiree";
  cree_le: string;
  valide_le: string | null;
};

export type Sujet = {
  code: string;
  libelle: string;
  description: string | null;
  autorisable: boolean;
  actif: boolean;
  ordre: number;
};

export type AccordSujet = {
  sujet: string;
  genre?: "sujet" | "message";
  libelle: string;
  autorisable: boolean;
  actif: boolean;
  statut: "aucun" | "a_valider" | "active" | "refusee" | "revoquee" | "expire";
  fin: string | null;
  active_le: string | null;
  donne_par_libelle: string | null;
  envoyees_seules_mois: number;
};

export type Accords = { sujets: AccordSujet[]; peut_donner: boolean; seul_decideur: boolean };

export type Reglages = {
  id: string;
  signature: string;
  formule_appel: string;
  formule_politesse: string;
  ton: "vouvoiement" | "tutoiement";
  mention_automatisee: string | null;
  langues: string[];
  actif: boolean;
  accuse: boolean;
  texte_accuse: string;
  lien_avis: string | null;
  texte_avis: string;
};

export type Avis = {
  id: string;
  canal: "email" | "whatsapp" | "sms";
  adresse: string;
  nom: string | null;
  reference: string | null;
  regle_le: string;
  statut: "programme" | "sollicite" | "termine" | "avis_recu" | "ecarte";
  motif: string | null;
  prochain_le: string | null;
  envois: string[];
  cree_le: string;
};

export type Indicateurs = { recues: number; repondues: number; parties_seules: number; hors_base: number; delai_median_minutes: number | null };

export type Monde = {
  reglages: Reglages | null;
  avis: Avis[];
  indicateurs: Indicateurs;
  demandes: Demande[];
  receptions: Record<number, Reception>;
  reponses: Reponse[];
  fiches: Fiche[];
  sujets: Sujet[];
  accords: Accords;
};

export type Client = { client_id: string; user_id: string; role: string };
