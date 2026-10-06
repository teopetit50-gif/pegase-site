/* ══════════════════════════════════════════════════════════════════════
   Les formes de l'écran TAVARO — /espace/tavaro (06/10/2026, session B2)

   Décalquées de omega/SOCLE-EXTRAITS-TAVARO.sql (recette, photographie du
   05/10) : les noms de champs sont CEUX des tables loc_*, pour qu'une ligne
   lue par Supabase entre ici sans traduction et que le jeu d'exemple ait
   exactement la même forme.
   ══════════════════════════════════════════════════════════════════════ */

export type StatutContrat = "ouvert" | "clos" | "annule";
export type SourceContrat = "export" | "pdf" | "comptoir" | "connecteur" | "saisie";
export type PolitiqueCarburant = "plein_contre_plein" | "meme_niveau" | "prepaye" | "seuil";

export type Contrat = {
  id: string;
  client_id: string;
  entite_id: string;
  entite_retour_id: string | null;
  numero: string;
  reservation_id: string | null;
  vehicule_id: string | null;
  categorie_id: string | null;
  locataire_id: string | null;
  depart_le: string;
  retour_prevu_le: string;
  retour_reel_le: string | null;
  km_depart: number | null;
  km_retour: number | null;
  km_inclus: number | null;
  km_inclus_jour: number | null;
  km_illimite: boolean;
  politique_carburant: PolitiqueCarburant | null;
  seuil_charge_pct: number | null;
  tarif_jour_eur: number | null;
  franchise_eur: number | null;
  franchise_reduite_eur: number | null;
  rachat_franchise: boolean | null;
  options: string[] | null;
  depot_eur: number | null;
  conditions_version: string | null;
  statut: StatutContrat;
  source: SourceContrat;
  piece_id: string | null;
  /* champ → {par, le} : qui a saisi quoi, à la main */
  saisies: Record<string, { par: string; le: string }>;
  avertissements: { code: string; champ?: string; n?: number }[];
  disparu_le: string | null;
  cree_le: string;
  maj_le: string;
};

export type Locataire = {
  id: string;
  type: "particulier" | "professionnel";
  nom: string | null;
  prenom: string | null;
  raison_sociale: string | null;
  /* b2_06 : le SIREN d'un client professionnel (facture électronique) */
  siren?: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  anonymise_le: string | null;
};

export type Vehicule = {
  id: string;
  immatriculation: string;
  modele: string | null;
  categorie_id: string | null;
  energie: string | null;
  reservoir_l: number | null;
  statut: "a_confirmer" | "actif" | "sorti";
  km_dernier: number | null;
};

export type Categorie = { id: string; code: string; libelle: string };

export type Agence = { id: string; entite_id: string; code: string; taux_tva: number | null; actif: boolean };

export type Amendement = {
  id: string;
  contrat_id: string;
  type: "prolongation" | "restitution_decalee" | "retard_offert" | "changement_vehicule";
  retour_prevu_le: string | null;
  km_inclus: number | null;
  sans_frais: boolean;
  origine: "export" | "assistance" | "agence" | "pdf";
  motif: string | null;
  accorde_par: string | null;
  accorde_le: string;
};

export type StatutProposition =
  | "calculee"
  | "preuve_manquante"
  | "rien_a_facturer"
  | "a_valider"
  | "validee"
  | "facturee"
  | "refusee"
  | "expiree"
  | "remplacee";

export type Famille = "carburant" | "kilometres" | "retard" | "dommage" | "nettoyage" | "frais" | "autre";
export type Unite = "huitieme" | "litre" | "km" | "jour_entame" | "forfait" | "devis";
export type RegimeTva = "taxable" | "hors_champ";

export type Preuve = { photo?: string; note?: string; prise_le?: string; chemin?: string };

export type Avertissement = { poste: string; code: string; bloquant: boolean; detail?: string };

export type Proposition = {
  id: string;
  contrat_id: string;
  entite_id: string;
  version: number;
  statut: StatutProposition;
  source: "edl" | "saisie" | "export";
  bareme_id: string | null;
  hors_bareme: boolean;
  non_contradictoire: boolean;
  entrees: Record<string, unknown>;
  avertissements: Avertissement[];
  calcul_retard: Record<string, unknown> | null;
  calcul_km: Record<string, unknown> | null;
  calcul_carburant: Record<string, unknown> | null;
  plafond_eur: number | null;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  total_frais_ttc: number;
  total_dommages_ttc: number;
  demande_id: string | null;
  calculee_le: string;
  calculee_par: string | null;
};

export type LigneProposition = {
  id: string;
  proposition_id: string;
  rang: number;
  nature: "frais" | "dommage";
  famille: Famille;
  code: string;
  libelle: string;
  unite: Unite | null;
  quantite: number;
  prix_unitaire: number | null;
  montant_ht: number;
  regime_tva: RegimeTva;
  taux_tva: number | null;
  montant_tva: number;
  montant_ttc: number;
  statut: "chiffree" | "a_chiffrer" | "preuve_manquante";
  plafonnee: boolean;
  hors_bareme: boolean;
  calcul: Record<string, unknown>;
  preuves: Preuve[];
};

export type StatutFacture = "emise" | "envoyee" | "reglee" | "litige" | "avoir";
export type ModeReglement = "depot" | "comptoir" | "virement" | "carte" | "autre";

export type Facture = {
  id: string;
  contrat_id: string;
  contrat_numero: string;
  proposition_id: string;
  demande_id: string;
  nature: "frais" | "dommages";
  reference: string;
  emise_le: string;
  date_facture: string;
  echeance_le: string;
  a_debiter_avant: string | null;
  statut: StatutFacture;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  emetteur: Record<string, string>;
  destinataire: Record<string, string>;
  mentions: Record<string, unknown>;
  regle_le: string | null;
  mode_reglement: ModeReglement | null;
  litige_motif: string | null;
  envoi_id: string | null;
  /* b2_08 : le PDF de la facture, joint au courriel avec les photos datées */
  pdf_piece_id?: string | null;
  /* b2_02 */
  relances?: number;
  relance_le?: string | null;
};

export type LigneFacture = {
  id: string;
  facture_id: string;
  rang: number;
  code: string;
  libelle: string;
  famille: Famille;
  unite: Unite | null;
  quantite: number;
  prix_unitaire: number | null;
  montant_ht: number;
  regime_tva: RegimeTva;
  taux_tva: number | null;
  montant_tva: number;
  montant_ttc: number;
  /* la ligne du barème appliquée (null : hors barème, sur devis) */
  bareme_ligne_id?: string | null;
  preuves: Preuve[];
};

export type StatutAvoir = "a_valider" | "emis" | "refuse" | "expire" | "annule";

export type Avoir = {
  id: string;
  facture_id: string;
  facture_reference: string;
  contrat_id: string;
  contrat_numero: string;
  motif: string;
  total: boolean;
  montant_ht: number;
  montant_tva: number;
  montant_ttc: number;
  statut: StatutAvoir;
  demande_id: string | null;
  demande_par: string | null;
  reference: string | null;
  emis_le: string | null;
  date_avoir: string | null;
  envoye_le: string | null;
  cree_le: string;
};

export type Bareme = {
  id: string;
  libelle: string;
  date_effet: string;
  statut: "publie" | "retire";
  publie_le: string;
  retire_le: string | null;
  motif_retrait: string | null;
};

export type LigneBareme = {
  id: string;
  bareme_id: string;
  code: string;
  libelle: string;
  famille: Famille;
  unite: Unite;
  prix_eur: number | null;
  regime_tva: RegimeTva;
  taux_tva: number | null;
  categorie_id: string | null;
  nature: "frais" | "dommage";
  rang: number;
};

export type Reglages = {
  tolerance_retard_min: number;
  echeance_pro_jours: number;
  tva_sur_debits: boolean;
  emetteur: Record<string, string>;
  /* b2_07 : netteté minimale d'une photo d'état des lieux (absente tant que la migration n'est pas posée) */
  nettete_min?: number;
  /* b2_09 : le délai laissé par la banque pour répondre à une contestation, et l'adresse de son service */
  contestation_delai_jours?: number;
  contestation_adresse?: string | null;
  /* b2_10 : durée d'une remise en location, marge avant le prochain départ */
  remise_duree_min?: number;
  remise_marge_min?: number;
};

/* l'état d'une demande de validation du socle, tel que l'écran le montre */
export type DemandeCourte = {
  id: string;
  type_action: string;
  statut: string;
  approbations_requises: number;
  roles_autorises: string[];
  echeance: string | null;
  demandeur_id: string | null;
};

/* une ligne du journal opposable, pour le fil du contrat */
export type LigneJournal = {
  id: string | number;
  action: string;
  objet_type: string | null;
  objet_id: string | null;
  donnees: Record<string, unknown>;
  survenu_le: string;
};

/* ce que l'agent saisit au retour : la forme exacte attendue par loc_chiffrer_retour */
export type DommageSaisi = { code: string; zone?: ZoneDommage; libelle?: string; quantite?: number; prix_eur?: number; devis_eur?: number; regime_tva?: RegimeTva; preuves: Preuve[] };
export type PosteSaisi = { code: string; libelle?: string; quantite?: number; prix_eur?: number; devis_eur?: number; nature?: "frais" | "dommage"; preuves: Preuve[] };
export type Retour = {
  retour_reel_le: string;
  km_retour: number | null;
  carburant_depart_8: number | null;
  carburant_retour_8: number | null;
  charge_retour_pct: number | null;
  non_contradictoire: boolean;
  dommages: DommageSaisi[];
  postes: PosteSaisi[];
  preuves: { carburant?: Preuve[]; km?: Preuve[]; retard?: Preuve[] };
};

/* le dossier complet d'un contrat, tel que l'écran le montre */
export type Dossier = {
  contrat: Contrat;
  locataire: Locataire | null;
  vehicule: Vehicule | null;
  categorie: Categorie | null;
  amendements: Amendement[];
  propositions: Proposition[];
  lignes: LigneProposition[];
  factures: Facture[];
  lignesFactures: LigneFacture[];
  avoirs: Avoir[];
  demandes: DemandeCourte[];
  journal: LigneJournal[];
  /* b2_05 : les états des lieux de départ et de retour (vide tant que la migration n'est pas posée) */
  etats: EtatDesLieux[];
};

export type Role = "gerant" | "admin" | "valideur" | "collaborateur" | "lecteur";

/* ——— les avis de contravention (migration b2_03, vague 3) ——— */
export type StatutAvis = "a_rapprocher" | "a_designer" | "designe" | "classe";
export type DesignationPersonne = { type: "personne"; nom: string; prenom: string; date_naissance: string; lieu_naissance: string; adresse: string; permis_numero: string; permis_delivre_le?: string; permis_lieu?: string };
export type DesignationSociete = { type: "societe"; raison_sociale: string; siren: string; adresse: string };
/* un an après la désignation, l'identité s'efface (b2_04, art. 9 du code de procédure pénale) : la forme reste */
export type DesignationEffacee = { type: "personne" | "societe"; effacee_le: string };
export type AvisContravention = {
  id: string;
  client_id: string;
  entite_id: string | null;
  numero_avis: string;
  immatriculation: string;
  vehicule_id: string | null;
  infraction_le: string;
  lieu: string | null;
  nature: string | null;
  montant_eur: number | null;
  avis_envoye_le: string;
  recu_le: string;
  echeance_le: string;
  contrat_id: string | null;
  locataire_id: string | null;
  rapprochement: "auto" | "manuel" | null;
  candidats: number;
  statut: StatutAvis;
  designation: DesignationPersonne | DesignationSociete | DesignationEffacee | null;
  designation_effacee_le?: string | null;
  mode_designation: "antai_en_ligne" | "lrar" | null;
  reference_designation: string | null;
  designe_le: string | null;
  designe_par: string | null;
  hors_delai: boolean | null;
  motif_classement: string | null;
  classe_le: string | null;
  classe_par: string | null;
  source: "saisie" | "lecture";
  cree_par: string | null;
  cree_le: string;
  /* b2_07 : la proposition qui refacture les frais de dossier au locataire */
  refacture_proposition_id?: string | null;
};

/* ——— l'état des lieux contradictoire (migration b2_05, vague 3) ——— */
export type ZoneDommage = "avant" | "arriere" | "flanc_gauche" | "flanc_droit" | "toit" | "pare_brise" | "vitres" | "jantes" | "interieur" | "coffre";
export type PhotoEtat = { vue: string; chemin: string; prise_le?: string; nettete?: number };
export type DommageConstate = { zone: ZoneDommage; code?: string; description: string; preuves: { chemin: string; prise_le?: string; nettete?: number }[] };
export type EtatDesLieux = {
  id: string;
  client_id: string;
  entite_id: string;
  contrat_id: string;
  moment: "depart" | "retour";
  statut: "brouillon" | "signe" | "refuse";
  releve_le: string;
  km: number | null;
  carburant_8: number | null;
  charge_pct: number | null;
  photos: PhotoEtat[];
  dommages: DommageConstate[];
  observations: string | null;
  caution_eur: number | null;
  caution_mode: "empreinte_carte" | "cheque" | "especes" | "virement" | "aucune" | null;
  caution_reference: string | null;
  caution_statut: "prise" | "levee" | null;
  caution_levee_le: string | null;
  caution_motif: string | null;
  signataire_nom: string | null;
  signature_chemin: string | null;
  signe_le: string | null;
  empreinte: string | null;
  refus_motif: string | null;
  refuse_le: string | null;
  etabli_par: string | null;
  cree_le: string;
};

/* b2_09 : les contestations bancaires d'une facture (rétrofacturation) et le dossier de réponse envoyé à la banque */
export type StatutContestation = "ouverte" | "dossier_pret" | "envoyee" | "gagnee" | "perdue" | "abandonnee";
export type ForceDossier = { code: "contrat" | "edl_depart" | "edl_retour" | "photos" | "bareme" | "contradictoire" | "envoi"; ok: boolean; libelle: string };
export type Contestation = {
  id: string;
  client_id: string;
  entite_id: string;
  facture_id: string;
  contrat_id: string;
  reference_banque: string;
  motif_banque: string;
  montant_eur: number;
  recue_le: string;
  repondre_avant: string;
  adresse_banque: string | null;
  statut: StatutContestation;
  forces: ForceDossier[];
  dossier_piece_id: string | null;
  dossier_sha256: string | null;
  dossier_pages: number | null;
  dossier_le: string | null;
  dossier_chemin: string | null;
  envoi_id: string | null;
  envoyee_le: string | null;
  envoyee_par: string | null;
  issue_le: string | null;
  issue_par: string | null;
  issue_note: string | null;
  notes: string | null;
  cree_par: string | null;
  cree_le: string;
};

/* b2_10 : la remise en location créée au retour, ses anomalies, les immobilisations et l'entretien */
export type EtapeRemise = "inspection" | "nettoyage" | "energie";
export type Remise = {
  id: string;
  client_id: string;
  entite_id: string;
  vehicule_id: string;
  contrat_id: string;
  retour_le: string;
  prochain_depart_le: string | null;
  prochain_depart_source: "reservation" | "contrat" | "categorie" | null;
  prochain_depart_ref: string | null;
  limite_le: string | null;
  responsable: string | null;
  statut: "a_faire" | "en_cours" | "prete" | "annulee";
  inspection_le: string | null;
  inspection_par: string | null;
  nettoyage_le: string | null;
  nettoyage_par: string | null;
  energie_le: string | null;
  energie_par: string | null;
  prete_le: string | null;
  immobilisation_id: string | null;
  alerte: "risque" | "retard" | null;
  annulee_motif: string | null;
  cree_le: string;
};
export type TypeAnomalie = "voyant" | "dommage" | "proprete" | "objet_oublie" | "pneu" | "cle_papiers" | "equipement" | "autre";
export type AnomalieRetour = {
  id: string;
  entite_id: string;
  remise_id: string;
  vehicule_id: string;
  type: TypeAnomalie;
  description: string;
  responsable: string;
  statut: "ouverte" | "traitee";
  signalee_par: string | null;
  signalee_le: string;
  traitee_le: string | null;
  traitee_par: string | null;
  note: string | null;
};
export type MotifImmobilisation = "preparation" | "entretien" | "carrosserie" | "controle_technique" | "sinistre" | "attente_pieces" | "rappel_constructeur" | "autre";
export type Immobilisation = {
  id: string;
  entite_id: string | null;
  vehicule_id: string;
  motif: MotifImmobilisation;
  debut_le: string;
  fin_prevue_le: string | null;
  fin_le: string | null;
  contrat_id: string | null;
  prestataire: string | null;
  cout_eur: number | null;
  notes: string | null;
  cree_le: string;
};
export type NatureEntretien = "revision" | "vidange" | "controle_technique" | "pneus" | "freins" | "climatisation" | "autre";
export type Entretien = {
  id: string;
  entite_id: string | null;
  vehicule_id: string;
  nature: NatureEntretien;
  libelle: string | null;
  echeance_le: string | null;
  echeance_km: number | null;
  duree_h: number;
  statut: "a_planifier" | "planifie" | "fait" | "annule";
  debut_le: string | null;
  fin_le: string | null;
  atelier_nom: string | null;
  atelier_adresse: string | null;
  envoi_id: string | null;
  immobilisation_id: string | null;
  fait_le: string | null;
  km_fait: number | null;
  cout_eur: number | null;
  notes: string | null;
};
export type Creneau = { debut: string; fin: string; avant_echeance: boolean };
export type Parc = {
  vehicules: (Vehicule & { entite_id?: string | null })[];
  remises: Remise[];
  anomalies: AnomalieRetour[];
  immobilisations: Immobilisation[];
  entretiens: Entretien[];
  /* les personnes de l'organisation à qui confier une remise ou une anomalie */
  membres: { user_id: string; role: string }[];
};

/* b2_11 : la fiche économique d'un véhicule et les sorties de flotte */
export type AvisFlotte = "sortir" | "surveiller" | "garder" | "restituer";
export type CanalSortie = "reprise_concession" | "marchand" | "encheres" | "particulier" | "restitution_loueur";
export type SourceCote = "argus" | "la_centrale" | "offre_reprise" | "offre_marchand" | "estimation";
export type FicheVehicule = {
  vehicule: string;
  immatriculation: string;
  modele: string | null;
  utilitaire: boolean;
  periode: { du: string; au: string; jours: number };
  revenu: { location: number; frais: number; total: number; jours_loues: number; contrats_sans_tarif: number };
  couts: { atelier: number; financement: number; perte_valeur: number | null; total: number };
  marge: number;
  utilisation_pct: number;
  jours_immobilises: number;
  km: number | null;
  km_an: number | null;
  age_mois: number | null;
  financement: "achat" | "credit" | "lld" | "loa";
  fin_contrat_le: string | null;
  cote: { eur: number; source: SourceCote; le: string } | null;
  valeur_comptable: number | null;
  ecart_cote_comptable: number | null;
  avis: AvisFlotte;
  raisons: string[];
  moment: string | null;
  moment_le: string | null;
  canal: CanalSortie;
  canal_raison: string;
  complet: boolean;
};
export type SortieFlotte = {
  id: string;
  vehicule_id: string;
  statut: "proposee" | "validee" | "refusee" | "vendue" | "annulee";
  canal: CanalSortie;
  prix_vise_eur: number | null;
  mise_en_vente_le: string | null;
  motif: string;
  fiche: FicheVehicule;
  propose_par: string;
  propose_le: string;
  decide_par: string | null;
  decide_le: string | null;
  refus_motif: string | null;
  prix_vente_eur: number | null;
  vendu_le: string | null;
  acheteur: string | null;
};
export type Flotte = { fiches: FicheVehicule[]; sorties: SortieFlotte[] };
