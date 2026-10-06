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
  /* « courriel » : pièce jointe d'un courriel du guichet, rangée seule par son numéro de dossier (b5_11) */
  source?: string | null;
  /* le chemin du fichier dans omega-clients (base réelle) : le rapport du contrôle en rend les pages */
  chemin?: string | null;
  cree_le?: string;
};

/* les honoraires d'un élément de mission (b5_12) et les temps passés dessus */
export type ElementMission = "diag" | "esq" | "aps" | "apd" | "pc" | "pro" | "dce" | "act" | "visa" | "exe" | "det" | "opc" | "aor" | "autre";
export type Honoraire = {
  id: string;
  projet_id: string;
  element: ElementMission;
  intitule: string | null;
  montant_ht: number;
  heures_prevues: number;
  statut: "a_venir" | "en_cours" | "achevee" | "facturee";
  achevee_le: string | null;
  facturee_le: string | null;
};
export type Temps = {
  id: string;
  projet_id: string;
  honoraire_id: string;
  membre: string;
  jour: string;
  heures: number;
  note: string | null;
};

/* le chantier (b5_13) : marchés par lot, situations de travaux, documents d'exécution à viser */
export type Marche = {
  id: string;
  projet_id: string;
  lot_id: string;
  titulaire: string;
  montant_ht: number;
  avenants_ht: number;
  retenue_pct: number;
  delai_verification_jours: number | null;
  actif: boolean;
};
export type Situation = {
  id: string;
  projet_id: string;
  marche_id: string;
  numero: number;
  mois: string;
  cumul_ht: number;
  recue_le: string;
  a_viser_avant: string | null;
  statut: "a_viser" | "visee" | "rectifiee";
  cumul_admis_ht: number | null;
  observation: string | null;
  visee_le: string | null;
};
export type Visa = {
  id: string;
  projet_id: string;
  lot_id: string | null;
  document: string;
  indice: string;
  recu_le: string;
  commande_le: string | null;
  delai_visa_jours: number;
  a_viser_avant: string | null;
  avis: "a_viser" | "vso" | "vao" | "ref";
  observation: string | null;
  vise_le: string | null;
};

/* le contrôle du dossier (b5_16) : les pièces croisées, ce qui est relevé, ce qui est décidé */
export type RolePieceControle = "planche" | "cctp" | "dpgf" | "plu" | "autre";
export type Controle = {
  id: string;
  projet_id: string;
  intitule: string;
  indice: string;
  precedent_id: string | null;
  statut: "en_lecture" | "controle" | "clos";
  lance_le: string | null;
  constats_nb: number;
  cree_le: string;
};
export type ControlePiece = {
  id: string;
  controle_id: string;
  piece_id: string;
  role: RolePieceControle;
  reference: string | null;
};
/* une valeur citée : la pièce, la page, la boîte et le texte lu ; « regle » pour le seuil du PLU */
export type ValeurCitee = {
  piece?: string;
  reference?: string | null;
  page?: number | null;
  valeur?: number | string | null;
  texte?: string | null;
  borne?: "max" | "min";
  article?: string | null;
  regle?: boolean;
  /* fractions de la page, y depuis le haut (contrat de lecture) */
  boite?: { x: number; y: number; l: number; h: number } | null;
};
export type Constat = {
  id: string;
  controle_id: string;
  nature: "incoherence" | "plu" | "cctp_dpgf";
  gravite: "bloquant" | "majeur" | "mineur";
  grandeur: string | null;
  objet: string | null;
  titre: string;
  correction: string | null;
  article: string | null;
  valeurs: ValeurCitee[];
  statut: "ouvert" | "corrige" | "accepte" | "ecarte";
  motif: string | null;
  precedent_id: string | null;
  corrige_au_controle: string | null;
  decide_par: string | null;
  decide_le: string | null;
};

/* le PLU du projet trouvé depuis son adresse (b5_17), Géoportail de l'urbanisme */
export type ZonePlu = { libelle: string | null; libelong: string | null; typezone: string | null; partition: string | null; idurba: string | null; nomfic: string | null; urlfic: string | null; datvalid: string | null };
export type Plu = {
  id: string;
  projet_id: string;
  statut: "a_chercher" | "geocodage" | "zonage" | "trouve" | "introuvable" | "erreur";
  methode: "adresse" | "parcelle" | null;
  requete: string | null;
  point_libelle: string | null;
  point_score: number | null;
  zones: ZonePlu[];
  zone: string | null;
  document: { du_type: string | null; titre: string | null; nom: string | null; partition: string | null } | null;
  reglement_url: string | null;
  prescriptions: { libelle: string | null; typepsc: string | null; stypepsc: string | null }[];
  rnu: boolean | null;
  erreur: string | null;
  demande_le: string;
  trouve_le: string | null;
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
  honoraires: Honoraire[];
  temps: Temps[];
  marches: Marche[];
  situations: Situation[];
  visas: Visa[];
  controles: Controle[];
  controlePieces: ControlePiece[];
  constats: Constat[];
  plu: Plu[];
  /* user_id → nom (annuaire) */
  noms: Record<string, string>;
  /* le compte de la personne connectée (base réelle) */
  moi: { user_id: string; client_id: string; role: string } | null;
};
