/* La lecture des états TAVARO pour l'écran — pure (06/10/2026, session B2).
   Quatre familles en tête d'écran : à chiffrer, à valider, bloquées
   (preuve manquante, litige, impayée), puis le reste. */

import type { Contrat, Dossier, Facture, Famille as FamilleLigne, Proposition, StatutAvoir, StatutContrat, StatutFacture, StatutProposition, Unite } from "./types";

export type Famille = "a_chiffrer" | "a_valider" | "bloquee" | "reste";
export type Teinte = "vert" | "ambre" | "rouge" | "bleu" | "gris" | "noir";

export function propositionVivante(propositions: Proposition[]): Proposition | null {
  const vivantes = propositions.filter((p) => p.statut !== "remplacee");
  return vivantes.sort((a, b) => b.version - a.version)[0] ?? null;
}

export function famille(contrat: Contrat, propositions: Proposition[], factures: Facture[], aujourdhui = new Date()): Famille {
  const p = propositionVivante(propositions);
  if (factures.some((f) => f.statut === "litige")) return "bloquee";
  if (factures.some((f) => (f.statut === "emise" || f.statut === "envoyee") && new Date(f.echeance_le).getTime() + 7 * 86_400_000 < aujourdhui.getTime())) return "bloquee";
  if (p?.statut === "preuve_manquante") return "bloquee";
  if (p?.statut === "a_valider") return "a_valider";
  if (p?.statut === "calculee") return "a_valider";
  if (contrat.statut === "annule") return "reste";
  if (!p && (contrat.retour_reel_le || new Date(contrat.retour_prevu_le) < aujourdhui)) return "a_chiffrer";
  if (p && (p.statut === "refusee" || p.statut === "expiree")) return "a_chiffrer";
  return "reste";
}

export const FAMILLES: { cle: Famille; libelle: string; sous: string; teinte: "rouge" | "ambre" | "bleu" | "gris" }[] = [
  { cle: "a_chiffrer", libelle: "Retours à chiffrer", sous: "rendus ou attendus, sans proposition", teinte: "ambre" },
  { cle: "a_valider", libelle: "À valider", sous: "proposition devant l'agence", teinte: "bleu" },
  { cle: "bloquee", libelle: "Bloqués", sous: "preuve manquante, litige, impayé", teinte: "rouge" },
  { cle: "reste", libelle: "Le reste", sous: "en cours, facturés, réglés", teinte: "gris" },
];

export const STATUTS_CONTRAT: Record<StatutContrat, { libelle: string; teinte: Teinte }> = {
  ouvert: { libelle: "En location", teinte: "bleu" },
  clos: { libelle: "Rendu", teinte: "gris" },
  annule: { libelle: "Annulé", teinte: "gris" },
};

export const STATUTS_PROPOSITION: Record<StatutProposition, { libelle: string; teinte: Teinte }> = {
  calculee: { libelle: "Calculée", teinte: "bleu" },
  preuve_manquante: { libelle: "Preuve manquante", teinte: "rouge" },
  rien_a_facturer: { libelle: "Rien à facturer", teinte: "vert" },
  a_valider: { libelle: "À valider", teinte: "ambre" },
  validee: { libelle: "Validée", teinte: "vert" },
  facturee: { libelle: "Facturée", teinte: "vert" },
  refusee: { libelle: "Refusée", teinte: "rouge" },
  expiree: { libelle: "Expirée", teinte: "gris" },
  remplacee: { libelle: "Remplacée", teinte: "gris" },
};

export const STATUTS_FACTURE: Record<StatutFacture, { libelle: string; teinte: Teinte }> = {
  emise: { libelle: "Émise", teinte: "bleu" },
  envoyee: { libelle: "Envoyée", teinte: "bleu" },
  reglee: { libelle: "Réglée", teinte: "vert" },
  litige: { libelle: "En litige", teinte: "rouge" },
  avoir: { libelle: "Annulée par avoir", teinte: "gris" },
};

export const STATUTS_AVOIR: Record<StatutAvoir, { libelle: string; teinte: Teinte }> = {
  a_valider: { libelle: "Devant la direction", teinte: "ambre" },
  emis: { libelle: "Émis", teinte: "vert" },
  refuse: { libelle: "Refusé", teinte: "rouge" },
  expire: { libelle: "Expiré", teinte: "gris" },
  annule: { libelle: "Annulé", teinte: "gris" },
};

export const FAMILLES_LIGNE: Record<FamilleLigne, string> = {
  carburant: "Carburant",
  kilometres: "Kilomètres",
  retard: "Retard",
  dommage: "Dommage",
  nettoyage: "Nettoyage",
  frais: "Frais",
  autre: "Autre",
};

export const UNITES: Record<Unite, string> = {
  huitieme: "huitième",
  litre: "litre",
  km: "km",
  jour_entame: "jour entamé",
  forfait: "forfait",
  devis: "sur devis",
};

export const POLITIQUES: Record<string, string> = {
  plein_contre_plein: "Plein contre plein",
  meme_niveau: "Même niveau qu'au départ",
  prepaye: "Carburant prépayé",
  seuil: "Charge au-dessus d'un seuil",
};

export const MODES_REGLEMENT: { cle: "depot" | "comptoir" | "virement" | "carte" | "autre"; libelle: string }[] = [
  { cle: "carte", libelle: "Carte enregistrée" },
  { cle: "depot", libelle: "Retenu sur le dépôt" },
  { cle: "comptoir", libelle: "Au comptoir" },
  { cle: "virement", libelle: "Virement" },
  { cle: "autre", libelle: "Autre" },
];

export const AMENDEMENTS: Record<string, string> = {
  prolongation: "Prolongation",
  restitution_decalee: "Restitution décalée (sans frais)",
  retard_offert: "Retard offert",
  changement_vehicule: "Changement de véhicule",
};

/* Les motifs d'avertissement du chiffrage, en clair. */
export const MOTIFS_AVERTISSEMENT: Record<string, string> = {
  bareme_absent: "Aucun barème en vigueur à la date du départ : la direction doit en publier un.",
  preuve_absente: "Aucune photo jointe : le poste attend sa preuve.",
  poste_absent_du_bareme: "Ce poste n'est pas au barème : il n'est pas chiffré.",
  devis_attendu: "Ce dommage se chiffre sur devis : le montant est attendu.",
  franchise_inconnue: "La franchise du contrat (ou son rachat) est inconnue : à compléter avant de chiffrer un dommage.",
  etat_des_lieux_non_contradictoire: "Le client n'a pas signé le retour : les dommages vont à la direction, hors barème.",
  niveau_inconnu: "Le niveau de carburant est inconnu.",
  compteur_inconnu: "Le compteur de retour est inconnu.",
  compteur_decroissant: "Le compteur de retour est inférieur à celui du départ.",
  kilometrage_implausible: "Plus de 150 km par heure de location : à vérifier.",
  forfait_inconnu: "Le forfait kilométrique du contrat est inconnu.",
  retour_inconnu: "L'heure de retour est inconnue.",
  retour_prevu_inconnu: "Le retour prévu est inconnu.",
  tarif_inconnu: "Le tarif journalier est inconnu : le retard ne se chiffre pas.",
  politique_inconnue: "La politique carburant du contrat est inconnue.",
  reservoir_inconnu: "La capacité du réservoir est inconnue.",
};

export function libelleAvertissement(code: string): string {
  return MOTIFS_AVERTISSEMENT[code] ?? code.replace(/_/g, " ");
}

/* Les codes d'avertissement du contrat lui-même (relevé). */
export const AVERTISSEMENTS_CONTRAT: Record<string, string> = {
  ecart_avec_le_logiciel: "Le PDF signé et le logiciel ne disent pas la même chose",
  kilometrage_incoherent: "Kilométrage incohérent",
  seuil_absent: "Politique au seuil sans seuil",
  franchise_reduite_superieure: "Franchise réduite au-dessus de la franchise",
  compteur_decroissant: "Compteur inférieur au contrat précédent",
  politique_inconnue: "Politique carburant inconnue",
  statut_inconnu: "Statut inconnu",
  reservation_inconnue: "Réservation inconnue",
  heure_douteuse: "Heure douteuse",
  heure_absente: "Heure absente",
  contrat_disparu_du_logiciel: "Disparu du logiciel",
};

export function nomLocataire(l: Dossier["locataire"]): string {
  if (!l) return "Locataire inconnu";
  if (l.anonymise_le) return "Locataire anonymisé";
  return l.raison_sociale ?? [l.prenom, l.nom].filter(Boolean).join(" ") ?? "Locataire";
}

/* ce qui reste dû sur une facture : son TTC moins ses avoirs émis */
export function resteDu(f: Facture, avoirs: { facture_id: string; statut: string; montant_ttc: number }[]): number {
  const credite = avoirs.filter((a) => a.facture_id === f.id && a.statut === "emis").reduce((s, a) => s + a.montant_ttc, 0);
  return Math.max(0, Math.round((f.total_ttc - credite) * 100) / 100);
}
