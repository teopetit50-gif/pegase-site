/* ══════════════════════════════════════════════════════════════════════
   La demande d'audit envoyée depuis /reserver-un-audit (18/10/2026).

   Un seul contrôle : le formulaire le lance au clic sur « Continuer », avant
   d'ouvrir l'agenda. Les listes ci-dessous sont celles qu'il affiche.

   ══════════════════════════════════════════════════════════════════════ */

import { SECTEURS } from "@/lib/creneaux";
import { PROFILS } from "@/lib/reservation";

/* Les réponses proposées pour « Comment avez-vous connu Omega ? ». */
export const ORIGINES = [
  "Une recommandation",
  "LinkedIn",
  "Instagram ou Facebook",
  "Une recherche en ligne",
  "Autre",
];

/* Les collectivités et pays où Omega travaille : Omega est basé aux Antilles
   françaises, la liste ne reprend donc pas la liste mondiale de la référence. */
export const PAYS = [
  "Guadeloupe",
  "Martinique",
  "Autre collectivité française",
  "France hexagonale",
  "Autre pays",
];

/* Les trois formats de l'audit en entreprise : Cadrage, Audit process, Audit +
   atelier. Leurs identifiants sont ceux de lib/reservation (PROFILS[1]). */
export const FORMATS = PROFILS[1].formules;

export type Demande = {
  prenom: string;
  nom: string;
  entreprise: string;
  fonction: string;
  email: string;
  pays: string;
  secteur: string;
  origine: string;
  format: string;
};

/* Tous les champs sont obligatoires, comme sur la référence. */
export const CHAMPS = [
  "prenom",
  "nom",
  "entreprise",
  "fonction",
  "email",
  "pays",
  "secteur",
  "origine",
  "format",
] as const;

const LONGUEUR: Record<(typeof CHAMPS)[number], number> = {
  prenom: 80,
  nom: 80,
  entreprise: 120,
  fonction: 120,
  email: 160,
  pays: 60,
  secteur: 60,
  origine: 60,
  format: 20,
};

export const E_MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function libelleFormat(id: string): string {
  const f = FORMATS.find((x) => x.id === id);
  return f ? `${f.nom} · ${f.duree}` : id;
}

export function libelleSecteur(valeur: string): string {
  return SECTEURS.find((s) => s.valeur === valeur)?.libelle ?? valeur;
}

/* Contrôle un corps venu du formulaire. Renvoie la demande propre, ou la liste
   des champs à reprendre. Aucun champ n'est accepté sans passer ici. */
export function controlerDemande(
  brut: Record<string, unknown>,
): { ok: true; demande: Demande } | { ok: false; champs: string[] } {
  const champs: string[] = [];
  const valeurs = {} as Record<(typeof CHAMPS)[number], string>;

  for (const cle of CHAMPS) {
    const v = typeof brut[cle] === "string" ? (brut[cle] as string).trim() : "";
    valeurs[cle] = v.slice(0, LONGUEUR[cle]);
    if (!v) champs.push(cle);
  }

  if (!champs.includes("email") && !E_MAIL.test(valeurs.email)) champs.push("email");
  if (!champs.includes("pays") && !PAYS.includes(valeurs.pays)) champs.push("pays");
  if (!champs.includes("origine") && !ORIGINES.includes(valeurs.origine)) champs.push("origine");
  if (!champs.includes("secteur") && !SECTEURS.some((s) => s.valeur === valeurs.secteur)) {
    champs.push("secteur");
  }
  if (!champs.includes("format") && !FORMATS.some((f) => f.id === valeurs.format)) {
    champs.push("format");
  }

  if (champs.length) return { ok: false, champs };
  return { ok: true, demande: valeurs as Demande };
}
