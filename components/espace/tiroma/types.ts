/* ══════════════════════════════════════════════════════════════════════
   Les formes de l'écran TIROMA (05/10/2026, session B3)

   Décalquées des tables tiroma_* du socle (omega/SOCLE-EXTRAITS-TIROMA.sql)
   et des portes de lecture posées par B3 (omega/modules/tiroma/migrations/
   b3_02 à b3_05) : les noms de champs sont CEUX de la base, pour qu'une
   ligne lue par Supabase entre ici sans traduction et que l'exemple ait
   exactement la même forme.
   ══════════════════════════════════════════════════════════════════════ */

export type Logiciel = "logosw" | "julie" | "veasy" | "weclever" | "trophy" | "desmos" | "autre";
export type StatutCabinet = "installation" | "actif" | "coupe" | "clos";
export type ModeCabinet = "a_blanc" | "reel";
export type Profil = "titulaire" | "collaborateur" | "assistante" | "direction";

export type Cabinet = {
  id: string;
  client_id: string;
  entite_id: string;
  logiciel: Logiciel;
  logiciel_version: string | null;
  heure_point: string;
  perimetre_partage: "cabinet" | "praticien";
  mode: ModeCabinet;
  mode_depuis: string;
  statut: StatutCabinet;
  dernier_releve_le: string | null;
  dernier_releve_ok_le: string | null;
  releves_douteux_suite: number;
  cree_le: string;
  /* enrichissement d'affichage */
  entite_nom?: string;
};

export type Capacite = "soins" | "prothese" | "chirurgie" | "orthodontie" | "prevention";

export type Fauteuil = {
  id: string;
  entite_id: string;
  nom: string;
  capacites: Capacite[];
  objectif_occupation: number | null;
  actif: boolean;
};

export type Praticien = {
  id: string;
  entite_id: string;
  nom_affiche: string;
  metier: "titulaire" | "collaborateur" | "salarie" | "orthodontiste" | "remplacant";
  actif: boolean;
};

export type Membre = { id: string; entite_id: string; prenom: string; fauteuil_habituel_id: string | null; actif: boolean };

export type Horaire = {
  id: string;
  entite_id: string;
  praticien_id: string | null;
  fauteuil_id: string | null;
  jour: number;
  debut: string;
  fin: string;
  valide_du: string | null;
  valide_au: string | null;
  exceptionnel: boolean;
  source: "logiciel" | "saisie";
};

export type Fermeture = {
  id: string;
  entite_id: string;
  praticien_id: string | null;
  fauteuil_id: string | null;
  debut: string;
  fin: string;
  nature: "conge" | "ferie" | "fermeture" | "formation" | "absence";
  source: "logiciel" | "saisie";
};

export type Regles = {
  id: string;
  entite_id: string;
  ordre_priorite: ("plan" | "attente" | "controle")[];
  tenir_duree: boolean;
  tenir_preferences: boolean;
  creneau_min_minutes: number;
  delai_min_appel_minutes: number;
  horizon_creneaux_jours: number;
  nb_propositions: number;
  seuil_controle_mois: number;
  quota_controles_demi_journee: number;
  delai_interruption_jours: number;
  alerte_devis_expire_jours: number;
  labo_verif_jours: number;
  seuil_demi_journee_vide: number;
  objectif_production_semaine: number | null;
};

export type Releve = {
  id: string;
  entite_id: string;
  voie: "api" | "passerelle" | "exports" | "interface";
  mode: "rapide" | "courant" | "complet" | "reprise" | "demande";
  recu_le: string;
  fini_le: string | null;
  statut: "en_cours" | "ok" | "douteux" | "refuse" | "echec";
  raison: string | null;
  compteurs: Record<string, unknown>;
};

export type CapaciteLue = {
  id: string;
  domaine: string;
  etat: "tenu" | "partiel" | "non_tenu" | "inconnu";
  mesure: Record<string, unknown>;
  calcule_le: string;
};

export type Famille =
  | "controle" | "detartrage" | "soin_conservateur" | "endodontie" | "prothese_preparation" | "prothese_empreinte"
  | "prothese_pose" | "implant_chirurgie" | "implant_prothese" | "chirurgie" | "parodontie" | "orthodontie_pose"
  | "orthodontie_controle" | "urgence" | "premiere_consultation" | "personnel" | "autre";

export type TypeRdv = {
  id: string;
  entite_id: string;
  libelle_source: string;
  categorie_source: string | null;
  duree_defaut_min: number | null;
  famille: Famille | null;
  necessite_labo: boolean;
  chirurgie: boolean;
  exige_assistante: boolean;
  capacite_requise: Capacite | null;
  classe_par: "regle" | "ia" | "humain" | null;
  confiance: "haute" | "moyenne" | "basse" | null;
  statut: "a_classer" | "propose" | "valide";
};

export type Attente = {
  id: string;
  entite_id: string;
  patient_id: string;
  famille: Famille | null;
  duree_min: number | null;
  praticien_id: string | null;
  preavis_minutes: number | null;
  drapeau_gene: boolean;
  source: "logiciel" | "tiroma" | "reput";
  ajoute_le: string;
  retire_le: string | null;
  motif_retrait: "rdv_obtenu" | "date_passee" | "annule" | "doublon" | "autre" | null;
  /* enrichissement d'affichage : le patient, lu sous RLS */
  patient_nom?: string;
};

export type PatientCourt = { id: string; nom: string; prenom: string | null; praticien_habituel_id: string | null; ne_pas_contacter: boolean };

/* ——— les portes de lecture (b3_02 à b3_05) ——— */

export type Candidat = {
  rang: number;
  origine: "plan" | "attente" | "controle";
  patient_id: string;
  patient_nom: string;
  motif: string;
  duree_min: number;
  plan_id: string | null;
  attente_id: string | null;
  depuis: string | null;
  preferences_ok: boolean;
  ne_pas_contacter: boolean;
};

export type Creneau = {
  evenement_id: number | string;
  type: "annulation" | "report" | "deplacement";
  detecte_le: string;
  rendez_vous_id: string | null;
  debut: string;
  fin: string;
  minutes: number;
  fauteuil_id: string | null;
  fauteuil_nom: string | null;
  praticien_id: string | null;
  praticien_nom: string | null;
  famille: Famille | null;
  libre: boolean;
  candidats: Candidat[];
};

export type PlanSansRdv = {
  plan_id: string;
  devis_numero: string | null;
  type: "conventionnel" | "odf" | "hors_nomenclature";
  statut: "signe" | "commence";
  patient_id: string;
  patient_nom: string;
  praticien_id: string | null;
  praticien_nom: string | null;
  signe_le: string | null;
  depuis: string;
  jours_depuis: number;
  montant: number | null;
  reste_a_charge: number | null;
  mutuelle_statut: "non_requise" | "a_demander" | "demandee" | "accord" | "refus" | null;
  mutuelle_reponse_le: string | null;
  mutuelle_accord_sans_rdv: boolean;
  valide_jusqu_au: string | null;
  jours_avant_expiration: number | null;
  a_verifier: boolean;
  lignes_a_faire: number;
  lignes_faites: number;
  prochaine: { rang: number; libelle: string | null; famille: Famille | null; duree_min: number | null; seance: number | null } | null;
  proches_a_planifier: number;
  ne_pas_contacter: boolean;
};

export type NatureVerif =
  | "labo" | "implant" | "devis_expire" | "mutuelle_accord" | "mutuelle_attente" | "odf_accord" | "odf_semestre"
  | "interruption" | "devis_sans_reponse";

export type Verification = {
  nature: NatureVerif;
  gravite: "critique" | "attention" | "info";
  quand: string | null;
  rendez_vous_id: string | null;
  patient_id: string | null;
  patient_nom: string | null;
  texte: string;
  objet_type: string | null;
  objet_id: string | null;
};

export type DemiJournee = { ouvert_min: number; prevu_min: number; taux: number | null; vide: boolean };

export type ChargeFauteuil = {
  fauteuil_id: string;
  nom: string;
  capacites: Capacite[];
  objectif_occupation: number | null;
  assistante_habituelle: string | null;
  matin: DemiJournee;
  apres_midi: DemiJournee;
  journee: DemiJournee;
  rendez_vous: number;
  sans_assistante_exigee: number;
};

export type Charge = {
  jour: string;
  seuil_demi_journee_vide: number;
  fauteuils: ChargeFauteuil[];
  total: { ouvert_min: number; prevu_min: number; taux: number | null };
  demi_journees_vides: number;
};

/* ——— tout ce que l'écran montre pour un cabinet ——— */

export type Dossier = {
  cabinet: Cabinet;
  profil: Profil | null;
  fauteuils: Fauteuil[];
  praticiens: Praticien[];
  membres: Membre[];
  horaires: Horaire[];
  fermetures: Fermeture[];
  regles: Regles | null;
  releves: Releve[];
  capacites: CapaciteLue[];
  types: TypeRdv[];
  attente: Attente[];
  creneaux: Creneau[];
  plans: PlanSansRdv[];
  verifications: Verification[];
  charge: Charge | null;
  appels: RegistreAppels | null;
  pilotage: Pilotage | null;
  rappels: Rappels | null;
  synthese: Synthese | null;
  reinscription: Reinscription | null;
  absences: AbsenceProbable[] | null;
};

/* ——— le registre des appels (b3_12) ——— */

export type MotifAppel = "creneau" | "plan" | "devis" | "controle" | "attente" | "autre";
export type IssueAppel = "rdv_pris" | "message" | "pas_de_reponse" | "rappeler" | "refus" | "ne_plus_contacter";

export type DernierAppel = { motif: MotifAppel; issue: IssueAppel; appele_le: string; rappeler_le: string | null; par: string | null };

export type SuiviAppel = DernierAppel & {
  patient_id: string;
  patient_nom: string;
  plan_id: string | null;
  tentatives: number;
  du: boolean;
};

export type BilanAppels = {
  jours: number;
  appels: number;
  patients: number;
  rdv_pris: number;
  confirmes: number;
  refus: number;
  ne_plus_contacter: number;
  a_reporter_logiciel: number;
  valeur_plans: number;
  minutes_creneaux: number;
};

export type RegistreAppels = {
  jour: string;
  a_reprendre: SuiviAppel[];
  derniers: Record<string, DernierAppel>;
  bilan: BilanAppels;
};

/** Ce qu'on appelle : un patient, pour une raison, éventuellement un plan ou un créneau. */
export type CibleAppel = { patient_id: string; patient_nom: string; motif: MotifAppel; plan_id: string | null; evenement_id: number | string | null };

/* ——— le pilotage du titulaire (b3_13) ——— */

export type DevisARelancer = {
  plan_id: string;
  patient_id: string;
  patient_nom: string;
  devis_numero: string | null;
  montant: number | null;
  reste_a_charge: number | null;
  presente_le: string | null;
  valide_jusqu_au: string | null;
  panier: string | null;
};

export type Pilotage = {
  periode: { du: string; au: string; jours: number };
  devis: {
    presentes: number;
    signes: number;
    taux: number | null;
    montant_presente: number;
    montant_signe: number;
    par_panier: { panier: string; presentes: number; signes: number; montant_signe: number }[];
    precedent: { presentes: number; signes: number; taux: number | null };
  };
  en_attente: { devis: number; montant: number; expirent_30j: number; a_relancer: number; a_relancer_liste: DevisARelancer[] };
  plans_sans_rdv: { nombre: number; montant: number; reste_a_charge: number };
  rendez_vous: {
    passes: number;
    honores: number;
    manques: number;
    annules: number;
    taux_manques: number | null;
    par_praticien: { praticien_id: string | null; nom: string | null; passes: number; manques: number; taux: number | null }[];
    precedent: { passes: number; manques: number; taux_manques: number | null };
  };
  appels: { appels: number; rdv_pris: number };
};

/* ——— les rappels aux patients (b3_14) ——— */

/** Le courriel seul : pas de SMS dans un contexte de santé (décision D6). */
export type CanalPatient = "email";

export type ContactPatient = {
  id: string;
  patient_id: string;
  patient_nom: string;
  canal: CanalPatient;
  adresse: string;
  rappels: boolean;
  relances: boolean;
  source: "oral" | "ecrit" | "formulaire";
  cree_le: string;
};

export type EnvoiRappel = {
  id: string;
  type: "j2" | "plan" | "devis";
  canal: CanalPatient;
  mode: "essai" | "reel";
  statut: string;
  verrou: string | null;
  cree_le: string;
  envoye_le: string | null;
  patient_nom: string;
};

export type ReponseRappel = {
  id: string;
  reponse: "confirme" | "annule" | "a_lire" | "autre_adresse";
  recue_le: string;
  rendez_vous_id: string | null;
  debut: string | null;
  patient_nom: string;
};

export type Rappels = {
  reglage: { mode: "coupe" | "essai" | "reel"; essai: boolean; canaux: string[] | null } | null;
  contacts: ContactPatient[];
  envois: EnvoiRappel[];
  reponses: ReponseRappel[];
};

/* ——— la synthèse de la semaine (b3_15) ——— */

export type SyntheseCabinet = {
  entite_id: string;
  nom: string;
  rdv: { passes: number; honores: number; manques: number; annules: number; taux_manques: number | null };
  creneaux: { liberes: number };
  devis: { presentes: number; signes: number; taux: number | null; montant_signe: number };
  plans_sans_rdv: { nombre: number; montant: number };
  appels: { appels: number; rdv_pris: number; confirmes: number };
  rappels: { prepares: number; envoyes: number; retenus: number };
  reinscription?: { visites: number; reinscrits: number; taux: number | null };
  precedent?: { taux_manques: number | null; devis_signes: number | null; devis_taux: number | null; passes: number | null; reinscription_taux?: number | null };
};

export type Synthese = {
  semaine: { du: string; au: string };
  cabinets: SyntheseCabinet[];
  total: {
    passes: number; manques: number; taux_manques: number | null; creneaux_liberes: number; devis_presentes: number; devis_signes: number;
    montant_signe: number; plans_sans_rdv: number; montant_plans_sans_rdv: number; appels: number; rdv_confirmes: number;
    visites?: number; reinscrits?: number; reinscription_taux?: number | null;
  };
};

/* ——— la réinscription (b3_16) ——— */

export type Reinscription = {
  periode: { du: string; au: string; jours: number };
  visites: number;
  reinscrits: number;
  taux: number | null;
  precedent: { taux: number | null; visites: number | null };
  par_praticien: { praticien_id: string | null; nom: string | null; visites: number; reinscrits: number; taux: number | null }[];
  sans_suite: { patient_id: string; patient_nom: string; derniere_visite: string; praticien: string | null }[];
};

/* ——— les absences probables (b3_17) ——— */

export type AbsenceProbable = {
  rendez_vous_id: string;
  debut: string;
  patient_id: string;
  patient_nom: string;
  praticien_nom: string | null;
  fauteuil_nom: string | null;
  score: number;
  niveau: "fort" | "moyen" | "annonce";
  raisons: string[];
  annonce: boolean;
};
