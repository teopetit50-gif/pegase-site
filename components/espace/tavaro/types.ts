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
export type DommageSaisi = { code: string; libelle?: string; quantite?: number; prix_eur?: number; devis_eur?: number; regime_tva?: RegimeTva; preuves: Preuve[] };
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
};
