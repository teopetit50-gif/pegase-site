/* ══════════════════════════════════════════════════════════════════════
   Les formes du référentiel du groupe — VARELO (05/10/2026, session B1)

   Décalquées de omega/SOCLE-EXTRAITS-VARELO.sql (recette, photographie du
   05/10) : les noms de champs sont ceux des tables et des vues, pour
   qu'une ligne lue par Supabase entre ici sans traduction et que le jeu
   d'exemple ait exactement la même forme.
   ══════════════════════════════════════════════════════════════════════ */

export type Nature = "client" | "fournisseur" | "article" | "site";
export const NATURES: Nature[] = ["fournisseur", "client", "article", "site"];

export type EtatCode = "a_traiter" | "nouveau" | "propose" | "confirme";
export type Methode = "nouveau" | "siren" | "tva" | "iban" | "gtin" | "ref_fournisseur" | "nom_cp" | "similarite" | "humain" | "rejet";

/* grp_installations */
export type Installation = {
  client_id: string;
  equipe_referent: string;
  seuil_sur: number;
  seuil_probable: number;
  taille_lot: number;
  bloc_max: number;
  iban_partage_max: number;
  installe_le: string;
  maj_le: string;
};

/* grp_poles */
export type Pole = { id: string; client_id: string; cle: string; nom: string; ordre: number; cree_le: string };

export type StatutBranchement = "a_brancher" | "observation" | "active" | "suspendue";

/* grp_societes_vue */
export type Societe = {
  entite_id: string;
  client_id: string;
  nom: string;
  siren: string | null;
  parent_id: string | null;
  principale: boolean;
  pole_id: string | null;
  pole: string | null;
  territoire_iso: string | null;
  territoire: string | null;
  territoire_libelle: string | null;
  fuseau: string | null;
  logiciel: string | null;
  nomenclature: string | null;
  statut_branchement: StatutBranchement;
};

/* grp_referentiel_codes (vue) */
export type CodeRef = {
  code_id: string;
  client_id: string;
  nature: Nature;
  entite_id: string;
  societe: string;
  code_local: string;
  nom_local: string;
  objet_id: string | null;
  code_groupe: string | null;
  nom_groupe: string | null;
  intragroupe: boolean | null;
  etat: EtatCode;
  methode: Methode | null;
  score: number | null;
  actif: boolean;
  anomalies: Record<string, string>;
  rattache_le: string | null;
};

/* grp_ref_objets */
export type Objet = {
  id: string;
  client_id: string;
  nature: Nature;
  numero: number;
  code_groupe: string;
  nom_groupe: string;
  nom_origine: "auto" | "humain";
  intragroupe: boolean;
  intragroupe_entite_id: string | null;
  entite_id: string | null;
  statut: "actif" | "fusionne";
  fusionne_dans: string | null;
  cree_le: string;
  maj_le: string;
};

export type GenreProposition = "placer" | "deplacer" | "fusionner" | "detacher" | "scinder" | "renommer";
export type Preuve = "sure" | "probable" | "humaine";
export type TypeActionRef =
  | "rattacher_codes"
  | "rapprocher_codes"
  | "rattacher_iban_different"
  | "fusionner_objets"
  | "detacher_code"
  | "scinder_objet"
  | "renommer_objet";
export type StatutProposition = "a_valider" | "ecartee" | "executee" | "rejetee" | "perimee";

/* grp_ref_propositions */
export type Proposition = {
  id: string;
  client_id: string;
  nature: Nature;
  genre: GenreProposition;
  preuve: Preuve;
  type_action: TypeActionRef;
  code_id: string | null;
  codes: string[] | null;
  objet_source: string | null;
  objet_cible: string;
  nom: string | null;
  regle: string | null;
  score: number | null;
  raisons: Record<string, unknown>[];
  preuves: string[];
  cle_paire: string;
  empreinte: string;
  statut: StatutProposition;
  demande_id: string | null;
  motif: string | null;
  decide_par: string | null;
  cree_le: string;
  traite_le: string | null;
};

/* grp_etat_referentiel(p_client) → jsonb, une entrée par nature */
export type EtatNature = {
  codes: number;
  a_traiter: number;
  nouveaux: number;
  proposes: number;
  confirmes: number;
  objets: number;
  propositions_ouvertes: number;
  taux_rattachement: number | null;
  taux_stable: number | null;
};
export type EtatReferentiel = Record<Nature, EtatNature>;

/* grp_deposer_codes → jsonb */
export type ResultatDepot = {
  lus: number;
  nouveaux: number;
  modifies: number;
  inchanges: number;
  anomalies: number;
  rejetes: { ligne: number; code: string | null; motif: string }[];
};

/* grp_rapprocher → jsonb (les clés sûres ; le reste est montré tel quel) */
export type ResultatPassage = Record<string, unknown> & {
  codes_examines?: number;
  objets_crees?: number;
  places_d_office?: number;
  demandes?: number;
  duree_ms?: number;
};

/* une demande de validation du module varelo (demandes_validation) — la
   forme commune est dans ../types ; on en garde ce que l'écran montre */
export type DemandeRef = {
  id: string;
  client_id: string;
  entite_id: string | null;
  module: string;
  type_action: TypeActionRef | string;
  objet_type: string | null;
  objet_id: string | null;
  resume: string;
  payload: Record<string, unknown>;
  demandeur_type?: "utilisateur" | "systeme";
  demandeur_id?: string | null;
  statut: "en_attente" | "approuvee" | "rejetee" | "annulee" | "expiree" | "executee" | "echec_execution";
  approbations_requises: number;
  equipe_id: string | null;
  cree_le: string;
  decide_le: string | null;
};

/* ce que l'écran sait de la personne connectée */
export type Contexte = {
  user_id: string;
  client_id: string;
  role: "gerant" | "admin" | "valideur" | "collaborateur" | "lecteur" | string;
  perimetre_total: boolean;
  /* les clés des équipes dont la personne est membre (referent_donnees, direction_financiere…) */
  equipes: string[];
  /* le nom des équipes par identifiant, pour dire à qui revient un lot */
  noms_equipes: Record<string, { cle: string; nom: string }>;
  /* les entités (toutes natures) du client, pour nommer une société */
  entites: { id: string; nom: string; principale?: boolean }[];
};

export const LIBELLE_NATURE: Record<Nature, { un: string; des: string }> = {
  fournisseur: { un: "fournisseur", des: "fournisseurs" },
  client: { un: "client", des: "clients" },
  article: { un: "article", des: "articles" },
  site: { un: "site", des: "sites" },
};

export const LIBELLE_ETAT: Record<EtatCode, { libelle: string; teinte: "vert" | "ambre" | "bleu" | "gris" }> = {
  a_traiter: { libelle: "À traiter", teinte: "gris" },
  nouveau: { libelle: "Seul", teinte: "bleu" },
  propose: { libelle: "Proposé", teinte: "ambre" },
  confirme: { libelle: "Confirmé", teinte: "vert" },
};

export const LIBELLE_METHODE: Record<Methode, string> = {
  nouveau: "ouvre l'objet",
  siren: "même SIREN",
  tva: "même n° de TVA",
  iban: "même IBAN",
  gtin: "même GTIN",
  ref_fournisseur: "même référence fournisseur",
  nom_cp: "même nom et code postal",
  similarite: "noms proches",
  humain: "décidé par une personne",
  rejet: "écarté par une décision",
};

export const LIBELLE_TYPE_ACTION: Record<TypeActionRef, string> = {
  rattacher_codes: "Rattacher des codes (preuve sûre)",
  rapprocher_codes: "Codes probablement identiques",
  rattacher_iban_different: "Coordonnées bancaires différentes",
  fusionner_objets: "Fusionner deux objets",
  detacher_code: "Détacher un code",
  scinder_objet: "Scinder un objet",
  renommer_objet: "Renommer un objet",
};

export const LIBELLE_BRANCHEMENT: Record<StatutBranchement, { libelle: string; teinte: "vert" | "ambre" | "bleu" | "gris" | "rouge" }> = {
  a_brancher: { libelle: "À brancher", teinte: "gris" },
  observation: { libelle: "En observation", teinte: "bleu" },
  active: { libelle: "Active", teinte: "vert" },
  suspendue: { libelle: "Suspendue", teinte: "rouge" },
};
