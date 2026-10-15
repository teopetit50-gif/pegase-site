/* Les pièces que le permis exigera (chiffrage, ligne 23) : déduites du type d'autorisation et de ce que Lorani sait du
   projet (nature, permis : ERP, évaluation environnementale ; PLU : secteur protégé), puis rapprochées des pièces déjà
   déposées sur le projet par leur code (« PC2-plan-masse.pdf », « PCMI 5 façades.pdf ») ou par la référence donnée au
   contrôle du dossier. Sources : bordereaux des pièces jointes des Cerfa 13409 (PC) et 13406 (PCMI), C. urb.
   art. R431-7 à R431-10, R431-14, R431-16 et R431-30. Ne sont pas couverts (dits à l'écran) : l'attestation
   parasismique, l'attestation d'étude exigée par un PPR, l'IGH, la démolition, le lotissement, les déclarations
   préalables et les permis d'aménager. */

import type { Dossier, Permis, PieceProjet, Projet, TypeAutorisation } from "./types";

export type PieceExigee = {
  code: string;
  libelle: string;
  article: string;
  /* pourquoi elle est exigée ici (vide pour une pièce toujours exigée) */
  motif: string | null;
  /* ce qui n'est pas certain : à confirmer par l'agence */
  a_confirmer: string | null;
  complement: string | null;
  fournie: PieceProjet | null;
  demandee: boolean;
};

export type Bordereau = {
  type: "pc" | "pcmi";
  /* le type vient du permis ouvert, sinon de la nature du projet */
  deduit: boolean;
  pieces: PieceExigee[];
  non_couvert: string;
};

const BASE: [number, string, string][] = [
  [1, "Plan de situation du terrain", "R431-7 a)"],
  [2, "Plan de masse des constructions", "R431-9"],
  [3, "Plan en coupe du terrain et de la construction", "R431-10 b)"],
  [4, "Notice décrivant le terrain et présentant le projet", "R431-8"],
  [5, "Plan des façades et des toitures", "R431-10 a)"],
  [6, "Document graphique d’insertion", "R431-10 c)"],
  [7, "Photographie situant le terrain dans l’environnement proche", "R431-10 d)"],
  [8, "Photographie situant le terrain dans le paysage lointain", "R431-10 d)"],
];

/* « PC 02 - Plan de masse.pdf » → « PC2-PLAN DE MASSE.PDF » ; « pcmi_5.pdf » → « PCMI5.PDF » */
export const codeNormalise = (nom: string) => nom.toUpperCase().replace(/^(PCMI|PC)[\s_.-]*0*(\d)/, "$1$2");
const porteLeCode = (nom: string, code: string) => new RegExp(`^${code.replace("-", "\\-")}([^0-9-]|-(?!\\d)|$)`).test(codeNormalise(nom));

export function bordereau(projet: Projet, dossier: Dossier): Bordereau | null {
  const permis: Permis | undefined = dossier.permis.filter((p) => p.projet_id === projet.id && p.actif).sort((a, b) => b.cree_le.localeCompare(a.cree_le))[0];
  const t: TypeAutorisation = permis?.type_autorisation ?? (projet.nature === "maison_individuelle" ? "pcmi" : "pc");
  if (t !== "pc" && t !== "pcmi") return null;
  const plu = dossier.plu.find((x) => x.projet_id === projet.id);
  const pieces = dossier.pieces.filter((p) => p.objet_id === projet.id);
  const references = dossier.controlePieces.filter((x) => x.reference && dossier.controles.some((c) => c.id === x.controle_id && c.projet_id === projet.id));
  const demandees = new Set((permis?.pieces_demandees ?? []).map((x) => codeNormalise(x.code).replace(/\s/g, "")));
  const prefixe = t === "pcmi" ? "PCMI" : "PC";
  const secteur = !!(permis?.secteur_protege || plu?.secteur_protege);
  const erp = projet.nature === "erp" || !!permis?.erp_autorisation;

  const trouver = (code: string): PieceProjet | null =>
    pieces.find((p) => porteLeCode(p.nom_fichier, code))
    ?? pieces.find((p) => references.some((r) => r.piece_id === p.id && porteLeCode(r.reference ?? "", code)))
    ?? null;
  const piece = (code: string, libelle: string, article: string, motif: string | null = null, a_confirmer: string | null = null, complement: string | null = null): PieceExigee =>
    ({ code, libelle, article: `C. urb. art. ${article}`, motif, a_confirmer, complement, fournie: trouver(code), demandee: demandees.has(code) });

  const liste: PieceExigee[] = BASE.map(([n, libelle, article]) => piece(`${prefixe}${n}`, libelle, article, null, null,
    n === 4 && secteur ? "Terrain en abords de monument historique ou en site patrimonial : la notice indique aussi les matériaux et les modalités d’exécution des travaux (R431-14)." : null));
  if (t === "pc" && permis?.evaluation_environnementale) {
    liste.push(piece("PC11", "Étude d’impact, ou décision de dispense de l’autorité environnementale", "R431-16 a)", "Le permis est soumis à évaluation environnementale."));
  }
  if (projet.nature !== "autre") {
    liste.push(piece(t === "pcmi" ? "PCMI14-1" : "PC16-1", "Attestation de prise en compte de la réglementation environnementale (RE2020)", "R431-16 j)",
      null, "Exigée pour une construction neuve soumise à la RE2020 ; pas pour une extension ou une surélévation de faible surface."));
  }
  if (t === "pc" && erp) {
    liste.push(piece("PC39", "Dossier spécifique : conformité aux règles d’accessibilité", "R431-30 a)", "Le projet est un établissement recevant du public."));
    liste.push(piece("PC40", "Dossier spécifique : conformité aux règles de sécurité contre l’incendie", "R431-30 b)", "Le projet est un établissement recevant du public."));
  }
  return {
    type: t, deduit: !permis, pieces: liste,
    non_couvert: "Non déduits ici : l’attestation parasismique, l’attestation d’étude exigée par un plan de prévention des risques, l’IGH, la démolition et le lotissement. Vérifiez-les sur le bordereau du Cerfa.",
  };
}
