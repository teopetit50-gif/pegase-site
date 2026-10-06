/* Les libellés et les teintes de l'écran LORANI (05/10/2026, session B5).
   Tout ce qui est écrit à l'écran passe par ici : jamais une clé du socle
   nue devant une personne. */

import type { Teinte } from "../ui";
import type {
  Decision,
  EtatPermis,
  IssueRecours,
  NatureDateLue,
  NatureIntervenant,
  NatureProjet,
  NatureRecours,
  Permis,
  PhaseProjet,
  RoleProjet,
  StatutEtape,
  TypeAutorisation,
} from "./types";

export const TYPES: Record<TypeAutorisation, { court: string; libelle: string }> = {
  pc: { court: "PC", libelle: "Permis de construire" },
  pcmi: { court: "PCMI", libelle: "Permis de construire — maison individuelle" },
  pa: { court: "PA", libelle: "Permis d'aménager" },
  pd: { court: "PD", libelle: "Permis de démolir" },
  dp: { court: "DP", libelle: "Déclaration préalable" },
};

export const ETATS: Record<EtatPermis, { libelle: string; teinte: Teinte; court: string }> = {
  a_deposer: { libelle: "À déposer", court: "À déposer", teinte: "gris" },
  completude: { libelle: "Dossier déposé — la mairie peut réclamer des pièces", court: "Complétude", teinte: "bleu" },
  pieces_demandees: { libelle: "Pièces manquantes à fournir", court: "Pièces à fournir", teinte: "ambre" },
  instruction: { libelle: "En instruction", court: "Instruction", teinte: "bleu" },
  decision_a_confirmer: { libelle: "Décision implicite à confirmer", court: "À confirmer", teinte: "ambre" },
  accorde: { libelle: "Accordé", court: "Accordé", teinte: "vert" },
  recours_en_cours: { libelle: "Accordé — recours en cours", court: "Recours", teinte: "ambre" },
  purge: { libelle: "Purgé de tout recours", court: "Purgé", teinte: "vert" },
  refuse: { libelle: "Refusé", court: "Refusé", teinte: "rouge" },
  rejete: { libelle: "Rejeté tacitement", court: "Rejeté", teinte: "rouge" },
  annule: { libelle: "Annulé ou retiré", court: "Annulé", teinte: "rouge" },
  classe: { libelle: "Classé", court: "Classé", teinte: "gris" },
  hors_catalogue: { libelle: "Territoire hors du catalogue", court: "Hors catalogue", teinte: "gris" },
};

export const DECISIONS: Record<Decision, string> = {
  favorable: "Accordé",
  defavorable: "Refusé",
  tacite: "Accord tacite",
  rejet_implicite: "Rejet implicite",
};

export const NATURES_PROJET: Record<NatureProjet, string> = {
  maison_individuelle: "Maison individuelle",
  logement_collectif: "Logement collectif",
  erp: "Établissement recevant du public",
  igh: "Immeuble de grande hauteur",
  tertiaire: "Tertiaire",
  autre: "Autre",
};

export const PHASES: Record<PhaseProjet, string> = {
  diag: "Diagnostic",
  esq: "Esquisse",
  aps: "Avant-projet sommaire",
  apd: "Avant-projet définitif",
  pc: "Permis de construire",
  pro: "Projet",
  dce: "Consultation des entreprises",
  act: "Marchés de travaux",
  det: "Direction des travaux",
  aor: "Réception",
  gpa: "Parfait achèvement",
  clos: "Clos",
};

export const NATURES_RECOURS: Record<NatureRecours, string> = {
  gracieux: "Recours gracieux",
  contentieux: "Recours contentieux",
  prefet: "Déféré du préfet",
};

export const ISSUES_RECOURS: Record<IssueRecours, { libelle: string; teinte: Teinte }> = {
  en_cours: { libelle: "En cours", teinte: "ambre" },
  rejete: { libelle: "Rejeté", teinte: "vert" },
  desiste: { libelle: "Désistement", teinte: "vert" },
  annulation: { libelle: "Permis annulé", teinte: "rouge" },
};

export const ROLES_PROJET: Record<RoleProjet, string> = {
  associe: "Associé",
  chef_projet: "Chef de projet",
  dessinateur: "Dessinateur",
  assistant: "Assistant",
  economiste: "Économiste",
  autre: "Autre",
};

export const NATURES_INTERVENANT: Record<NatureIntervenant, string> = {
  maitre_ouvrage: "Maître d'ouvrage",
  amo: "Assistant à maîtrise d'ouvrage",
  bet_structure: "BET structure",
  bet_fluides: "BET fluides",
  bet_thermique: "BET thermique",
  bet_acoustique: "BET acoustique",
  bet_vrd: "BET VRD",
  economiste: "Économiste",
  controleur_technique: "Contrôleur technique",
  coordonnateur_sps: "Coordonnateur SPS",
  opc: "OPC",
  geometre: "Géomètre",
  entreprise: "Entreprise",
  autre: "Autre",
};

/* Les dates lues sur les courriers : ce que la proposition porte, et les
   champs qu'un membre peut corriger avant de confirmer (les clés sont celles
   que lorani_confirmer_date_lue accepte pour chaque nature). */
export const NATURES_DATE_LUE: Record<
  NatureDateLue,
  { libelle: string; piece: string; champs: { cle: string; libelle: string; type: "date" | "texte" | "entier" | "decision" | "pieces" }[] }
> = {
  depot: {
    libelle: "Date de dépôt",
    piece: "récépissé de dépôt",
    champs: [
      { cle: "date_depot", libelle: "Date de dépôt", type: "date" },
      { cle: "numero", libelle: "Numéro du dossier", type: "texte" },
    ],
  },
  delai_notifie: {
    libelle: "Délai d'instruction notifié",
    piece: "lettre de la mairie",
    champs: [
      { cle: "delai_notifie_mois", libelle: "Délai (mois)", type: "entier" },
      { cle: "date_notification_delai", libelle: "Date de la lettre", type: "date" },
    ],
  },
  demande_pieces: {
    libelle: "Demande de pièces manquantes",
    piece: "demande de pièces",
    champs: [
      { cle: "date_demande_pieces", libelle: "Date de la demande", type: "date" },
      { cle: "pieces", libelle: "Pièces réclamées", type: "pieces" },
    ],
  },
  decision: {
    libelle: "Décision de la mairie",
    piece: "arrêté",
    champs: [
      { cle: "decision", libelle: "Décision", type: "decision" },
      { cle: "date_decision", libelle: "Date de la décision", type: "date" },
    ],
  },
  decision_tacite: {
    libelle: "Certificat de permis tacite",
    piece: "certificat",
    champs: [{ cle: "date_decision", libelle: "Date du permis tacite", type: "date" }],
  },
  affichage: {
    libelle: "Premier jour d'affichage",
    piece: "constat d'affichage",
    champs: [{ cle: "date_affichage", libelle: "Premier jour d'affichage", type: "date" }],
  },
};

export const TYPES_PIECE: { cle: string; libelle: string }[] = [
  { cle: "lorani_recepisse_depot", libelle: "Récépissé de dépôt" },
  { cle: "lorani_lettre_delai", libelle: "Lettre de délai d'instruction" },
  { cle: "lorani_demande_pieces", libelle: "Demande de pièces manquantes" },
  { cle: "lorani_arrete", libelle: "Arrêté (accord ou refus)" },
  { cle: "lorani_certificat_tacite", libelle: "Certificat de permis tacite" },
  { cle: "lorani_constat_affichage", libelle: "Constat d'affichage" },
  { cle: "lorani_planche", libelle: "Planche (plan, coupe, façade)" },
  { cle: "lorani_cctp", libelle: "CCTP" },
  { cle: "lorani_dpgf", libelle: "DPGF" },
  { cle: "lorani_plu_reglement", libelle: "Règlement du PLU" },
];

/* les pièces du contrôle du dossier (b5_16) : pas des courriers de la mairie */
export const TYPES_CONTROLE = ["lorani_planche", "lorani_cctp", "lorani_dpgf", "lorani_plu_reglement"];

export function libelleTypePiece(cle: string | null | undefined): string {
  return TYPES_PIECE.find((t) => t.cle === cle)?.libelle ?? "Courrier";
}

/* La teinte d'une étape du calendrier. */
export const STATUTS_ETAPE: Record<StatutEtape, { libelle: string; teinte: Teinte }> = {
  fait: { libelle: "Fait", teinte: "vert" },
  a_venir: { libelle: "À venir", teinte: "bleu" },
  passe: { libelle: "Passé", teinte: "gris" },
  manque: { libelle: "En retard", teinte: "rouge" },
  a_confirmer: { libelle: "À confirmer", teinte: "ambre" },
  en_attente: { libelle: "En attente", teinte: "gris" },
  en_cours: { libelle: "En cours", teinte: "ambre" },
};

/* Les cinq familles des compteurs du haut. */
export type Famille = "a_confirmer" | "pieces" | "instruction" | "accordes" | "clos";

export const FAMILLES: { cle: Famille; libelle: string; sous: string; teinte: Teinte }[] = [
  { cle: "a_confirmer", libelle: "À confirmer", sous: "dates lues, décisions implicites", teinte: "ambre" },
  { cle: "pieces", libelle: "Pièces à fournir", sous: "demandes de la mairie", teinte: "rouge" },
  { cle: "instruction", libelle: "En instruction", sous: "déposés, décision attendue", teinte: "bleu" },
  { cle: "accordes", libelle: "Accordés", sous: "affichage, retrait, recours", teinte: "vert" },
  { cle: "clos", libelle: "Clos", sous: "purgés, refusés, classés", teinte: "gris" },
];

export function famille(p: Permis, datesProposees: number): Famille {
  if (datesProposees > 0 || p.etat === "decision_a_confirmer") return "a_confirmer";
  switch (p.etat) {
    case "pieces_demandees":
      return "pieces";
    case "a_deposer":
    case "completude":
    case "instruction":
      return "instruction";
    case "accorde":
    case "recours_en_cours":
      return "accordes";
    default:
      return "clos";
  }
}

/* Le titre d'un permis, comme le socle l'écrit dans ses alertes : « PCMI « Maison Lemoine » ». */
export function titrePermis(p: Permis, nomProjet: string): string {
  return `${TYPES[p.type_autorisation].court} « ${p.intitule ?? nomProjet} »`;
}

/* La prochaine date qui compte pour un permis, pour trier la liste. */
export function prochaineDate(p: Permis): string | null {
  const c = p.calcul;
  if (p.etat === "decision_a_confirmer") return c.decision_implicite?.date ?? null;
  const aVenir = (c.etapes ?? []).filter((e) => e.date && (e.statut === "a_venir" || e.statut === "manque" || e.statut === "a_confirmer"));
  aVenir.sort((a, b) => (a.date! < b.date! ? -1 : 1));
  return aVenir[0]?.date ?? null;
}

/* Les étapes sans doublon de nature, dans l'ordre où le socle les rend. */
export function libelleRappel(j: number): string {
  if (j === 0) return "le jour même";
  if (j === 1) return "la veille";
  return `${j} jours avant`;
}
