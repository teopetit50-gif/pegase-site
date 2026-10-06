/* ══════════════════════════════════════════════════════════════════════
   Les formes de l'écran DALIRO (05/10/2026, session B6)

   Décalquées des tables btp_* de la recette (omega/SOCLE-EXTRAITS-DALIRO.sql)
   et des migrations b6_01 à b6_04 : les noms de champs sont CEUX des
   tables et des vues, pour qu'une ligne lue par Supabase entre ici sans
   traduction, et que le jeu d'exemple ait exactement la même forme. Le
   tableau d'un chantier est la forme rendue par public.btp_tableau_chantier
   (jsonb) ; la liste, celle de public.btp_liste_chantiers.
   ══════════════════════════════════════════════════════════════════════ */

export type StatutChantier = "preparation" | "ouvert" | "suspendu" | "receptionne" | "clos" | "annule";
export type Gravite = "bloquant" | "attention" | "info";

export type Etape = { etape: number; etapes: number; lot_id: string | null; lot_libelle: string | null; avancement_pct: number };

export type Chantier = {
  id: string;
  client_id: string;
  entite_id: string;
  nom: string;
  reference: string | null;
  adresse: string | null;
  code_postal: string;
  commune: string;
  departement: string;
  territoire: string;
  zone_tva: string;
  regime_tva: string;
  maitre_ouvrage_type: "particulier" | "professionnel" | "acheteur_public";
  nature_marche: "public" | "prive" | null;
  place_client: "titulaire" | "sous_traitant" | "cotraitant";
  maitre_ouvrage_id: string | null;
  maitre_oeuvre_id: string | null;
  donneur_ordre_id: string | null;
  conducteur_id: string | null;
  statut: StatutChantier;
  date_debut: string | null;
  date_fin_prevue: string | null;
  date_reception: string | null;
  ouvert_le: string | null;
  cree_le: string;
  /* enrichissements de btp_liste_chantiers / btp_tableau_chantier */
  etape?: Etape | null;
  maitre_ouvrage_nom?: string | null;
  maitre_oeuvre_nom?: string | null;
  donneur_ordre_nom?: string | null;
  nb_lots?: number;
  nb_bloquants?: number;
  nb_attention?: number;
  marche_verifie?: boolean;
  prochain_passage?: { id: string; debut: string; fin: string; tache: string | null; confirmation: Confirmation; intervenant_type: string; intervenant_nom: string | null } | null;
  nb_avenants_en_cours?: number;
  nb_avenants_signes?: number;
};

export type Lot = {
  id: string;
  chantier_id: string;
  code: string;
  libelle: string;
  corps_etat: string | null;
  corps_etat_libelle?: string | null;
  rang: number;
  execution: "client" | "sous_traitant" | "autre_titulaire";
  tiers_id: string | null;
  tiers_nom?: string | null;
  equipe_id: string | null;
  equipe_nom?: string | null;
  exterieur: boolean;
  statut: "a_venir" | "en_cours" | "termine";
  acceptation?: "a_demander" | "demandee" | "acceptee" | "refusee" | "caduque" | null;
};

export type ControleLigne = "ok" | "incomplet" | "montant_faux";

export type LigneMarche = {
  id: string;
  marche_id: string;
  lot_id: string | null;
  ordre: number;
  numero: string | null;
  section: string | null;
  designation: string;
  unite: string | null;
  quantite: number | null;
  nature: "ouvrage" | "fourniture" | "forfait" | "option";
  controle: ControleLigne;
  ecart_accepte: boolean;
  ecart_motif: string | null;
  corrigee: boolean;
  /* null sans le droit voir_prix (vue btp_lignes_marche_chiffrees) */
  prix_unitaire_ht: number | null;
  montant_ht: number | null;
  ecart: number | null;
};

export type ControleMarche = { ligne_id: string | null; ordre: number | null; code: string; bloquant: boolean; message: string | null };

export type Marche = {
  id: string;
  chantier_id: string;
  reference: string | null;
  objet: string | null;
  date_signature: string | null;
  mode_prix: "forfait" | "unitaire" | "mixte";
  retenue_taux: number;
  retenue_base: "ht" | "ttc";
  retenue_caution: boolean;
  source: "saisie" | "tableur" | "pdf" | "api";
  piece_id: string | null;
  statut: "a_verifier" | "verifie";
  verifie_par: string | null;
  verifie_libelle: string | null;
  verifie_le: string | null;
  montant_ht_declare: number | null;
  total_ht_lignes: number | null;
  lignes: LigneMarche[];
  controles: ControleMarche[];
};

export type Controle = {
  chantier_id: string | null;
  objet_type: string;
  objet_id: string;
  code: string;
  gravite: Gravite;
  message: string;
};

export type Confirmation = "non_demandee" | "demandee" | "confirmee" | "declinee" | "sans_reponse";

export type EvenementConfirmation = {
  id: string;
  passage_id: string;
  evenement: "demandee" | "confirmee" | "declinee" | "sans_reponse";
  canal: string | null;
  cle: string;
  detail: Record<string, unknown>;
  survenu_le: string;
};

export type Passage = {
  id: string;
  chantier_id: string;
  lot_id: string | null;
  lot_code?: string | null;
  lot_libelle?: string | null;
  equipe_id: string | null;
  tiers_id: string | null;
  intervenant_type: "equipe" | "tiers" | "inconnu";
  intervenant_lu: string | null;
  intervenant_nom?: string | null;
  rapprochement: "identique" | "ressemblance" | "manuel" | null;
  tache: string | null;
  debut: string;
  fin: string;
  exterieur: boolean;
  statut: "prevu" | "fait" | "annule";
  confirmation: Confirmation;
  confirmation_le: string | null;
  source: "saisie" | "tableur" | "alobees" | "api";
  source_ref: string | null;
  version: number;
  confirmations?: EvenementConfirmation[];
  envoi?: EnvoiPassage | null;
};

/* La dernière demande J-2 partie pour un passage (public.envois, b6_07). */
export type EnvoiPassage = {
  id: string;
  canal: string;
  mode: "essai" | "reel";
  statut: string;
  verrou: string | null;
  cree_le: string;
  envoye_le: string | null;
  remise: string | null;
  remise_le: string | null;
  accord?: { politique: string; active_le: string | null } | null;
};

export type Dependance = {
  id: string;
  chantier_id: string;
  amont_id: string;
  aval_id: string;
  delai_min_jours: number;
  origine: "saisie" | "gabarit" | "import";
  confirmee: boolean;
  amont_tache?: string | null;
  aval_tache?: string | null;
};

export type Acceptation = {
  id: string;
  chantier_id: string;
  tiers_id: string;
  tiers_nom?: string | null;
  mode: "acte_special" | "lettre" | "avenant" | "autre";
  statut: "a_demander" | "demandee" | "acceptee" | "refusee" | "caduque";
  paiement_direct: boolean;
  demandee_le: string | null;
  decidee_le: string | null;
};

export type StatutAvenant = "brouillon" | "soumis" | "signe" | "refuse" | "abandonne";

export type LigneAvenant = {
  id: string;
  avenant_id: string;
  lot_id: string | null;
  prix_id: string | null;
  ordre: number;
  designation: string;
  unite: string;
  quantite: number;
  sens: 1 | -1;
  nature: "ouvrage" | "fourniture" | "forfait";
  origine_prix: "bibliotheque" | "saisie";
  prix_unitaire_ht: number | null;
  montant_ht: number | null;
};

export type Avenant = {
  id: string;
  chantier_id: string;
  marche_id: string | null;
  numero: number;
  objet: string;
  origine: { canal?: string; auteur?: string; date?: string; texte?: string } & Record<string, unknown>;
  statut: StatutAvenant;
  demande_id: string | null;
  demande_statut?: string | null;
  piece_id: string | null;
  soumis_le: string | null;
  signe_le: string | null;
  signe_par: string | null;
  signe_libelle: string | null;
  motif: string | null;
  cree_le: string;
  nb_lignes: number;
  montant_ht: number | null;
  lignes: LigneAvenant[];
};

export type FactureChantier = {
  id: string;
  facture_id: string;
  document_id: string | null;
  chantier_id: string;
  lot_id: string | null;
  lot_code: string | null;
  lot_libelle: string | null;
  marche_id: string | null;
  statut: "rattachee" | "detachee";
  motif: string | null;
  fournisseur_siren: string | null;
  fournisseur_id: string | null;
  fournisseur_nom: string | null;
  facture_numero: string | null;
  facture_nature: "facture" | "avoir" | null;
  facture_statut: string | null;
  document_reference: string | null;
  date_emission: string | null;
  echeance_lue: string | null;
  montant_ht: number | null;
  montant_ttc: number | null;
  rattache_libelle: string | null;
  cree_le: string;
};

export type DebourseLot = {
  lot_id: string;
  code: string;
  libelle: string;
  execution: Lot["execution"];
  tiers_id: string | null;
  lot_statut: Lot["statut"];
  nb_factures: number;
  engage_marche_ht: number | null;
  engage_avenants_ht: number | null;
  facture_ht: number | null;
  reste_ht: number | null;
};

export type Vigilance = "sans_objet" | "absente" | "echue" | "a_verifier" | "a_renouveler" | "a_jour";

export type Tiers = {
  id: string;
  roles: string[];
  nom: string;
  siren: string | null;
  telephone: string | null;
  email: string | null;
  canal: string | null;
  commune: string | null;
  corps_etat: string[];
  departements: string[];
  confirmer_passages: boolean;
  vigilance_attestation_le: string | null;
  vigilance_verifiee_le: string | null;
  actif: boolean;
  vigilance?: Vigilance;
};

export type Prix = {
  id: string;
  designation: string;
  unite: string;
  corps_etat: string | null;
  origine: "marche" | "saisie";
  ligne_marche_id: string | null;
  date_prix: string;
  statut: "propose" | "valide" | "retire";
  prix_unitaire_ht: number | null;
};

export type Remplacant = { tiers_id: string; nom: string; telephone: string | null; email: string | null; canal: string; vigilance: Vigilance; corps_commun: boolean; departement_ok: boolean };

/* une facture FILED du client, pas encore rattachée, candidate au rattachement */
export type FactureCandidate = { id: string; numero: string | null; date_emission: string | null; montant_ht: number | null; fournisseur_nom: string | null; fournisseur_siren: string | null; statut: string };

/* le tableau complet d'un chantier (public.btp_tableau_chantier) */
export type Tableau = {
  chantier: Chantier;
  reglages: { formule: "demarrage" | "chantiers" | "entreprise"; quota_chantiers: number; quota_comptes_bureau: number } | null;
  voit_prix: boolean;
  lots: Lot[];
  marches: Marche[];
  controles: Controle[];
  controles_organisation: Controle[];
  passages: Passage[];
  dependances: Dependance[];
  acceptations: Acceptation[];
  avenants: Avenant[];
  factures: FactureChantier[];
  debourse: DebourseLot[];
  tiers: Tiers[];
  equipes: { id: string; nom: string }[];
  bibliotheque: Prix[];
  /* b6_12 : les situations de travaux (vide sans le droit voir_prix) */
  situations?: Situation[];
  /* b6_13 : la réception (null tant qu'elle n'est pas prononcée, ou sans le droit voir_prix) */
  reception?: Reception | null;
};

export type Reserve = {
  id: string;
  reception_id: string;
  lot_id: string | null;
  ordre: number;
  description: string;
  statut: "ouverte" | "levee";
  levee_le: string | null;
};
export type Reception = {
  id: string;
  chantier_id: string;
  date_reception: string;
  avec_reserves: boolean;
  retenue_montant: number;
  retenue_caution: boolean;
  retenue_due_le: string;
  retenue_statut: "bloquee" | "opposee" | "liberee";
  retenue_etat?: "bloquee" | "liberable" | "opposee" | "liberee";
  opposition_le: string | null;
  opposition_motif: string | null;
  liberee_le: string | null;
  liberee_avant_terme: boolean;
  decompte_statut: "a_preparer" | "projet" | "envoye" | "accepte" | "conteste";
  decompte_marche_ht: number | null;
  decompte_facture_ht: number | null;
  decompte_reste_ht: number | null;
  decompte_retenue: number | null;
  decompte_envoye_le: string | null;
  decompte_repondu_le: string | null;
  decompte_motif: string | null;
  decompte_echeance?: string;
  reserves: Reserve[];
};

/* Une situation de travaux (b6_12) : acompte mensuel à l'avancement cumulé. */
export type LigneSituation = {
  id: string;
  situation_id: string;
  origine: "marche" | "avenant";
  ligne_marche_id: string | null;
  ligne_avenant_id: string | null;
  avenant_numero: number | null;
  lot_id: string | null;
  ordre: number;
  designation: string;
  base_ht: number;
  avancement: number;
  precedent_avancement: number;
  cumule_ht: number;
  precedent_ht: number;
};
export type StatutSituation = "brouillon" | "soumise" | "refusee" | "validee" | "annulee";
export type Situation = {
  id: string;
  chantier_id: string;
  marche_id: string;
  numero: number;
  periode_fin: string;
  statut: StatutSituation;
  regime_tva: "normal" | "autoliquidation" | "non_applicable" | "hors_champ";
  taux_tva: number;
  autoliquidation: boolean;
  retenue_taux: number;
  retenue_base: "ht" | "ttc";
  retenue_caution: boolean;
  cumul_ht: number;
  precedent_ht: number;
  periode_ht: number;
  tva: number;
  retenue: number;
  net_a_payer: number;
  mentions: string[];
  demande_id: string | null;
  demande_statut?: string | null;
  soumise_le: string | null;
  validee_le: string | null;
  validee_libelle: string | null;
  motif: string | null;
  lignes: LigneSituation[];
  /* b6_16 : l'encaissement */
  echeance?: string | null;
  penalites_taux?: number | null;
  encaisse?: number;
  paiements?: PaiementSituation[];
};
export type PaiementSituation = { id: string; situation_id: string; recu_le: string; montant: number; reference: string | null };

/* L'accord permanent des confirmations J-2 (b6_08) : trois politiques du socle, une par canal. */
export type CanalAccordJ2 = {
  canal: "email" | "whatsapp" | "sms";
  statut: "aucun" | "a_valider" | "active" | "refusee" | "revoquee";
  politique: string | null;
  debut: string | null;
  fin: string | null;
  active_le: string | null;
  cree_le: string | null;
  donne_par_libelle: string | null;
  demande_statut: string | null;
  revoquee_le: string | null;
  revoquee_par_libelle: string | null;
  motif_revocation: string | null;
  nombre_mensuel: number | null;
  utilises_mois: number | null;
};
export type AccordJ2 = {
  etat: "aucun" | "a_valider" | "actif" | "partiel" | "revoque";
  fin: string | null;
  canaux: CanalAccordJ2[];
  /* b6_09 : le lecteur est-il le seul décideur (gérant, admin, valideur) de l'organisation ? */
  seul_decideur?: boolean;
};

/* b6_17 : le pointage des heures et la rentabilité du chantier (public.btp_heures_chantier) */
export type IntervenantHeures = {
  id: string;
  nom: string;
  role_terrain: "chef_equipe" | "compagnon" | "conducteur" | "autre";
  actif: boolean;
  equipe_id: string | null;
  equipe_nom: string | null;
};
export type Pointage = {
  id: string;
  intervenant_id: string;
  jour: string;
  lot_id: string | null;
  heures: number;
  note: string | null;
  source: "saisie" | "equipe" | "message";
};
export type RentabiliteLot = {
  lot_id: string | null;
  code: string | null;
  libelle: string;
  vendu_ht: number;
  facture_ht: number;
  heures: number;
  main_oeuvre_ht: number;
  heures_sans_cout: number;
  achats_ht: number;
  debourse_ht: number;
  marge_ht: number;
};
export type Rentabilite = {
  vendu_ht: number;
  facture_ht: number;
  heures: number;
  heures_sans_cout: number;
  main_oeuvre_ht: number;
  achats_ht: number;
  debourse_ht: number;
  marge_ht: number;
  marge_taux: number | null;
  lots: RentabiliteLot[];
};
export type HeuresChantier = {
  chantier_id: string;
  lundi: string;
  jours: string[];
  intervenants: IntervenantHeures[];
  equipes: { id: string; nom: string }[];
  pointages: Pointage[];
  semaine_heures: number;
  total_heures: number;
  voit_prix: boolean;
  cout_defaut: number | null;
  rentabilite: Rentabilite | null;
};
/* Le retour d'un pointage : les totaux de l'intervenant et les alertes du Code du travail. */
export type RetourPointage = { jour_total: number; semaine_total: number; alertes: string[] };

/* b6_19 : le recalage du planning (public.btp_proposer_recalage, btp_recaler, btp_terminer_passage) */
export type DeplacementPassage = {
  passage_id: string;
  tache: string | null;
  lot_id: string | null;
  intervenant: string | null;
  ancien_debut: string;
  ancien_fin: string;
  nouveau_debut: string;
  nouveau_fin: string;
  reconfirmer: boolean;
  exterieur: boolean;
};
export type Recalage = {
  passage_id: string;
  chantier_id: string;
  nouvelle_fin: string;
  deplaces: DeplacementPassage[];
  nombre: number;
  fin_planning: string | null;
  fin_prevue_chantier: string | null;
};

/* b6_21 : la météo du chantier (public.btp_meteo_chantier) */
export type JourMeteo = { jour: string; pluie_mm: number | null; rafales_kmh: number | null; tmin: number | null; tmax: number | null };
export type RisqueMeteo = { passage_id: string; tache: string | null; chantier_id: string; jour: string; motifs: string[]; texte: string };
export type MeteoChantier = { localise: boolean; ouverte: boolean; prevision: JourMeteo[]; recue_le: string | null; erreur: string | null; risques: RisqueMeteo[] };

/* b6_22 : l'approvisionnement (public.btp_appro_chantier) */
export type EtatCommande = "a_commander" | "a_commander_vite" | "commande_en_retard" | "commandee" | "livraison_tardive" | "livraison_trop_tot" | "livraison_attendue" | "livree_partielle" | "livree" | "annulee";
export type Commande = {
  id: string;
  chantier_id: string;
  lot_id: string | null;
  lot_code?: string | null;
  passage_id: string | null;
  passage_tache?: string | null;
  fournisseur_id: string | null;
  fournisseur_nom: string | null;
  objet: string;
  quantite_texte: string | null;
  reference: string | null;
  delai_jours: number;
  besoin_le: string | null;
  statut: "a_commander" | "commandee" | "livree_partielle" | "livree" | "annulee";
  commandee_le: string | null;
  livraison_prevue: string | null;
  livree_le: string | null;
  note: string | null;
  motif: string | null;
  /* b6_23 : quantité du devis, matériel à rendre, bons de livraison */
  ligne_marche_id?: string | null;
  quantite?: number | null;
  unite?: string | null;
  a_retourner?: boolean;
  retour_prevu?: string | null;
  retourne_le?: string | null;
  livraisons?: LivraisonCommande[];
  echeances: {
    besoin_le: string | null; livrer_avant: string | null; livrer_le?: string | null; commander_avant: string | null; etat: EtatCommande;
    quantite_commandee?: number | null; quantite_livree?: number | null; ecart?: number | null;
    retour_prevu?: string | null; retour?: "sur_chantier" | "a_rendre" | "rendu" | null;
  };
};
export type LivraisonCommande = { id: string; livree_le: string; quantite: number | null; bon_reference: string | null; piece_id: string | null; note: string | null };
export type Appro = { commandes: Commande[]; fournisseurs: { id: string; nom: string }[]; devis_verifie?: boolean };
