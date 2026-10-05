/* La lecture des états FILED pour l'écran — pure (05/10/2026).
   Quatre familles en tête d'écran : bloquées, en litige, en attente, puis
   le reste (classées, intégrées, doublons, illisibles). */

import type { Controle, DocumentFiled, EtatDocument, Facture, NatureDocument, StatutFacture } from "../types";

export type Famille = "bloquee" | "litige" | "attente" | "reste";

export function famille(document: DocumentFiled, facture: Facture | null): Famille {
  if (facture?.statut === "bloquee") return "bloquee";
  if (facture && (facture.statut === "ecartee" || facture.anomalies.some((c) => c.startsWith("rapprochement.")))) return "litige";
  if (document.etat === "en_lecture" || document.etat === "a_classer" || document.etat === "a_traiter") return "attente";
  if (facture && (facture.statut === "a_completer" || facture.statut === "a_valider") && document.etat !== "classe" && document.etat !== "integre") return "attente";
  return "reste";
}

export const FAMILLES: { cle: Famille; libelle: string; sous: string; teinte: "rouge" | "ambre" | "bleu" | "gris" }[] = [
  { cle: "bloquee", libelle: "Bloquées", sous: "un contrôle bloquant a échoué", teinte: "rouge" },
  { cle: "litige", libelle: "En litige", sous: "écart avec la commande ou facture écartée", teinte: "ambre" },
  { cle: "attente", libelle: "En attente", sous: "en lecture, à classer, à valider", teinte: "bleu" },
  { cle: "reste", libelle: "Traitées", sous: "classées, intégrées, doublons", teinte: "gris" },
];

export const ETATS: Record<EtatDocument, { libelle: string; teinte: "vert" | "ambre" | "rouge" | "bleu" | "gris" }> = {
  en_lecture: { libelle: "En lecture", teinte: "bleu" },
  a_classer: { libelle: "À classer", teinte: "ambre" },
  illisible: { libelle: "Illisible", teinte: "rouge" },
  doublon: { libelle: "Doublon", teinte: "gris" },
  classe: { libelle: "Classé", teinte: "vert" },
  a_traiter: { libelle: "À traiter", teinte: "ambre" },
  integre: { libelle: "Intégré", teinte: "vert" },
};

export const STATUTS_FACTURE: Record<StatutFacture, { libelle: string; teinte: "vert" | "ambre" | "rouge" | "bleu" | "gris" }> = {
  a_completer: { libelle: "À compléter", teinte: "ambre" },
  bloquee: { libelle: "Bloquée", teinte: "rouge" },
  a_valider: { libelle: "À valider", teinte: "bleu" },
  ecartee: { libelle: "Écartée", teinte: "gris" },
};

export const NATURES: Record<NatureDocument, string> = {
  facture: "Facture",
  avoir: "Avoir",
  bon_commande: "Bon de commande",
  bon_livraison: "Bon de livraison",
  devis: "Devis",
  releve: "Relevé",
  contrat: "Contrat",
  attestation_assurance: "Attestation d'assurance",
  autre: "Autre",
};

export const SOURCES: Record<DocumentFiled["source"], string> = {
  depot: "Dépôt",
  courriel: "Courriel",
  connecteur: "Connecteur",
  api: "API",
};

/* Les familles de contrôles, en clair. */
export const FAMILLES_CONTROLE: Record<string, string> = {
  mentions: "Mentions obligatoires",
  fournisseur: "Fournisseur",
  tva: "TVA",
  totaux: "Totaux",
  lignes: "Lignes",
  doublon: "Doublon",
  rapprochement: "Rapprochement commande",
  echeance: "Échéance",
  avoir: "Avoir",
  iban: "Coordonnées bancaires",
};

export function grouperControles(controles: Controle[]) {
  return {
    echoues: controles.filter((c) => c.resultat === "anomalie").sort((a, b) => (a.gravite === "bloquant" ? -1 : 1) - (b.gravite === "bloquant" ? -1 : 1)),
    leves: controles.filter((c) => c.resultat === "levee"),
    passes: controles.filter((c) => c.resultat === "ok"),
  };
}

/* Les champs d'une facture qu'on peut corriger par filed_corriger_facture :
   clé envoyée → libellé, type de saisie. */
export const CHAMPS_CORRIGEABLES: { cle: string; libelle: string; type: "texte" | "date" | "montant" }[] = [
  { cle: "numero", libelle: "Numéro de facture", type: "texte" },
  { cle: "date_emission", libelle: "Date d'émission", type: "date" },
  { cle: "echeance_lue", libelle: "Échéance", type: "date" },
  { cle: "montant_ht", libelle: "Montant HT", type: "montant" },
  { cle: "montant_tva", libelle: "Montant TVA", type: "montant" },
  { cle: "montant_ttc", libelle: "Montant TTC", type: "montant" },
  { cle: "net_a_payer", libelle: "Net à payer", type: "montant" },
  { cle: "iban", libelle: "IBAN", type: "texte" },
];

/* Le champ d'une valeur lue (pieces_valeurs.champ) ↔ la colonne de facture :
   pour surligner la bonne boîte quand on clique une valeur de l'en-tête. */
export const CHAMP_PAR_COLONNE: Record<string, string> = {
  numero: "facture.numero",
  date_emission: "facture.date_emission",
  echeance_lue: "facture.echeance",
  montant_ht: "totaux.ht",
  montant_tva: "totaux.tva",
  montant_ttc: "totaux.ttc",
  net_a_payer: "totaux.ttc",
  iban: "paiement.iban",
  fournisseur: "fournisseur.nom",
  siren: "fournisseur.siren",
  tva: "fournisseur.tva",
};

export function libelleChamp(champ: string): string {
  const d: Record<string, string> = {
    "fournisseur.nom": "Fournisseur",
    "fournisseur.siren": "SIREN",
    "fournisseur.tva": "N° TVA",
    "facture.numero": "N° de facture",
    "facture.date_emission": "Date d'émission",
    "facture.echeance": "Échéance",
    "acheteur.nom": "Acheteur",
    "totaux.ht": "Total HT",
    "totaux.tva": "TVA",
    "totaux.ttc": "Total TTC",
    "paiement.iban": "IBAN",
    "document.type": "Nature",
  };
  if (d[champ]) return d[champ];
  const m = champ.match(/^lignes\.(\d+)\.(\w+)$/);
  if (m) return `Ligne ${m[1]} — ${m[2] === "designation" ? "désignation" : m[2] === "montant_ht" ? "montant HT" : m[2]}`;
  return champ.replace(/[._]/g, " ");
}
