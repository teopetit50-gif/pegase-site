/* ══════════════════════════════════════════════════════════════════════
   Les formes de l'écran LORANI (05/10/2026, session B5)

   Décalquées du socle (omega/SOCLE-EXTRAITS-LORANI.sql, recette
   ygwbgpowzlbdaajlsqkn photographiée le 05/10) : les noms sont CEUX des
   tables et de la vue lorani_echeances_permis, pour qu'une ligne lue par
   Supabase entre ici sans traduction, et que le jeu d'exemple ait la même
   forme. Le `calcul` d'un permis est la sortie de lorani_calendrier_permis
   (version lorani.m4.1).
   ══════════════════════════════════════════════════════════════════════ */

export type TypeAutorisation = "pc" | "pcmi" | "pa" | "pd" | "dp";

export type EtatPermis =
  | "a_deposer"
  | "completude"
  | "pieces_demandees"
  | "instruction"
  | "decision_a_confirmer"
  | "accorde"
  | "recours_en_cours"
  | "purge"
  | "refuse"
  | "rejete"
  | "annule"
  | "classe"
  | "hors_catalogue";

export type Decision = "favorable" | "defavorable" | "tacite" | "rejet_implicite";

export type NatureProjet = "maison_individuelle" | "logement_collectif" | "erp" | "igh" | "tertiaire" | "autre";
export type PhaseProjet = "diag" | "esq" | "aps" | "apd" | "pc" | "pro" | "dce" | "act" | "det" | "aor" | "gpa" | "clos";

export type Projet = {
  id: string;
  client_id: string;
  entite_id: string;
  nom: string;
  reference: string | null;
  adresse: string | null;
  code_postal: string | null;
  commune: string | null;
  code_insee: string | null;
  parcelles: string[];
  nature: NatureProjet;
  marche_public: boolean;
  phase: PhaseProjet;
  territoire: string | null;
  actif: boolean;
  cree_le: string;
  maj_le: string;
};

/* une étape du calendrier, telle que lorani_calendrier_permis la rend */
export type StatutEtape = "fait" | "a_venir" | "passe" | "manque" | "a_confirmer" | "en_attente" | "en_cours";
export type Etape = {
  nature: string;
  libelle: string;
  date?: string;
  statut: StatutEtape;
  certitude?: "certaine" | "prevision" | "a_confirmer";
  issue?: string;
  motif?: string;
  detail?: string;
  regle?: string;
  version?: number;
  depart?: string;
  date_calculee?: string;
  date_notifiee?: string;
  source?: string;
  source_url?: string;
};

export type MotifSilence = { code: string; article: string; libelle: string; source_url: string };

export type Calcul = {
  version?: string;
  territoire?: string;
  aujourdhui?: string;
  etat: EtatPermis;
  regime?: {
    type: TypeAutorisation;
    regle_instruction: string;
    silence: "tacite" | "rejet";
    motifs_silence: MotifSilence[];
    effet_silence: string;
    delai_notifie_mois?: number | null;
  };
  etapes: Etape[];
  echeances?: unknown[];
  decision_implicite?: { nature: "tacite" | "rejet_implicite"; date: string; motif: string };
  date_decision_attendue?: string;
  date_purge?: string;
  chantier_sans_risque_le?: string;
  avertissements?: string[];
};

export type Permis = {
  id: string;
  client_id: string;
  entite_id: string;
  projet_id: string;
  type_autorisation: TypeAutorisation;
  numero: string | null;
  intitule: string | null;
  secteur_protege: boolean;
  immeuble_inscrit_mh: boolean;
  erp_autorisation: boolean;
  igh: boolean;
  evaluation_environnementale: boolean;
  cas_rejet: string[];
  date_depot: string | null;
  date_demande_pieces: string | null;
  date_pieces_fournies: string | null;
  delai_notifie_mois: number | null;
  date_notification_delai: string | null;
  decision: Decision | null;
  date_decision: string | null;
  date_affichage: string | null;
  actif: boolean;
  etat: EtatPermis;
  silence: "tacite" | "rejet" | null;
  date_decision_attendue: string | null;
  date_purge: string | null;
  calcul: Calcul;
  calcule_le: string | null;
  cree_le: string;
  maj_le: string;
  pieces_demandees: { code: string }[];
  /* l'historique des lettres de demande de pièces (b5_07) ; pieces_demandees en est l'union */
  demandes_pieces?: { date: string; pieces: { code: string }[] }[];
};

export type NatureDateLue = "depot" | "delai_notifie" | "demande_pieces" | "decision" | "decision_tacite" | "affichage";

export type DateLue = {
  id: string;
  client_id: string;
  entite_id: string;
  projet_id: string;
  permis_id: string | null;
  piece_id: string;
  type_piece: string;
  nature: NatureDateLue;
  proposition: Record<string, unknown>;
  citations: { champ: string; texte: string | null; page: number | null; verifiee: boolean }[];
  verifiee: boolean;
  statut: "proposee" | "confirmee" | "ecartee";
  confirme: Record<string, unknown> | null;
  decide_par: string | null;
  decide_le: string | null;
  motif: string | null;
  cree_le: string;
  maj_le: string;
};

/* la vue public.lorani_echeances_permis (lorani_permis_echeances ⋈ delais, courantes) */
export type Echeance = {
  permis_id: string;
  projet_id: string;
  nature: "completude" | "pieces" | "instruction" | "affichage" | "retrait" | "recours" | "purge";
  delai_id: string;
  libelle: string;
  echeance: string;
  echeance_calculee: string | null;
  echeance_notifiee: string | null;
  statut: string;
  rappels: number[];
  rappels_faits: number[];
  regle_code: string | null;
  regle_version: number | null;
  detail: string | null;
  source: string | null;
  source_url: string | null;
  source_notification: string | null;
  responsable: string | null;
  action_attendue: string | null;
};

export type NatureRecours = "gracieux" | "contentieux" | "prefet";
export type IssueRecours = "en_cours" | "rejete" | "desiste" | "annulation";

export type Recours = {
  id: string;
  client_id: string;
  entite_id: string;
  projet_id: string;
  permis_id: string;
  nature: NatureRecours;
  date_recours: string;
  auteur: string | null;
  issue: IssueRecours;
  date_issue: string | null;
  cree_le: string;
  maj_le: string;
};

export type Lot = {
  id: string;
  projet_id: string;
  numero: string;
  intitule: string;
  activites_requises: string[];
};

export type NatureIntervenant =
  | "maitre_ouvrage"
  | "amo"
  | "bet_structure"
  | "bet_fluides"
  | "bet_thermique"
  | "bet_acoustique"
  | "bet_vrd"
  | "economiste"
  | "controleur_technique"
  | "coordonnateur_sps"
  | "opc"
  | "geometre"
  | "entreprise"
  | "autre";

export type Intervenant = {
  id: string;
  projet_id: string;
  nature: NatureIntervenant;
  organisme: string;
  contact: string | null;
  email: string | null;
  telephone: string | null;
  siren: string | null;
  lot_id: string | null;
  actif: boolean;
};

export type RoleProjet = "associe" | "chef_projet" | "dessinateur" | "assistant" | "economiste" | "autre";

export type MembreProjet = {
  id: string;
  projet_id: string;
  user_id: string;
  role_projet: RoleProjet;
};

export type CasRejet = { code: string; article: string; libelle: string; source_url: string };

/* une pièce déposée sur un projet (public.pieces, module lorani) */
export type PieceProjet = {
  id: string;
  objet_id: string;
  nom_fichier: string;
  mime: string;
  statut: string;
  type_piece: string | null;
  /* le motif du lecteur quand il n'a pas reconnu le courrier (a_classer) ou n'a pas pu le lire */
  motif?: string | null;
  cree_le?: string;
};

/* tout ce que l'écran montre, d'une source ou de l'autre */
export type Dossier = {
  projets: Projet[];
  permis: Permis[];
  datesLues: DateLue[];
  echeances: Echeance[];
  recours: Recours[];
  lots: Lot[];
  intervenants: Intervenant[];
  membres: MembreProjet[];
  casRejet: CasRejet[];
  pieces: PieceProjet[];
  /* user_id → nom (annuaire) */
  noms: Record<string, string>;
  /* le compte de la personne connectée (base réelle) */
  moi: { user_id: string; client_id: string; role: string } | null;
};
