/* CASHD — les libellés et teintes des états (06/10/2026, C2). */

import type { Teinte } from "../ui";
import type { EtatRelance, StatutCompte, Suivi } from "./types";

export const STATUTS_COMPTE: Record<StatutCompte, { libelle: string; teinte: Teinte }> = {
  actif: { libelle: "Suivi", teinte: "vert" },
  pause: { libelle: "En pause", teinte: "ambre" },
  litige: { libelle: "En litige", teinte: "rouge" },
  recouvrement: { libelle: "En recouvrement", teinte: "noir" },
  hors_perimetre: { libelle: "Ne plus contacter", teinte: "gris" },
  attente_contact: { libelle: "Contact à désigner", teinte: "ambre" },
};

export const ETATS_RELANCE: Record<EtatRelance, { libelle: string; teinte: Teinte }> = {
  a_valider: { libelle: "À valider", teinte: "ambre" },
  validee: { libelle: "Validée", teinte: "bleu" },
  envoyee: { libelle: "Partie", teinte: "vert" },
  refusee: { libelle: "Refusée", teinte: "gris" },
  coupee: { libelle: "Coupée", teinte: "gris" },
  non_reglee: { libelle: "Écrite — envoi à régler", teinte: "ambre" },
  sans_adresse: { libelle: "Sans adresse", teinte: "rouge" },
  bloquee: { libelle: "Bloquée", teinte: "rouge" },
  echec: { libelle: "Échec", teinte: "rouge" },
  preparee: { libelle: "En préparation", teinte: "gris" },
};

const PALIERS: Record<string, string> = {
  rappel: "Rappel courtois",
  relance: "Relance ferme",
  mise_en_demeure: "Mise en demeure",
  devis_rappel: "Rappel du devis",
  devis_relance: "Relance du devis",
};

export function libellePalier(p: string | null | undefined): string {
  if (!p) return "—";
  return PALIERS[p] ?? p.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export function libelleSequence(s: Suivi | undefined): string {
  if (!s) return "Hors séquence";
  switch (s.etat_sequence) {
    case "litige":
      return "En litige : hors cycle";
    case "reciproque":
      return "Compte réciproque : hors cycle";
    case "sequence_terminee":
      return `${libellePalier(s.palier_atteint)} : dernier palier`;
    case "pas_encore_relancee":
      return "Pas encore relancée";
    case "en_cours":
      return libellePalier(s.palier_atteint);
    default:
      return STATUTS_COMPTE[s.etat_sequence as StatutCompte]?.libelle ?? "—";
  }
}

export const TRANCHES: { cle: "non_echu" | "echu_1_30" | "echu_31_60" | "echu_61_90" | "echu_plus_90"; libelle: string; teinte: string }[] = [
  { cle: "non_echu", libelle: "Non échu", teinte: "c2-t0" },
  { cle: "echu_1_30", libelle: "1 à 30 j", teinte: "c2-t1" },
  { cle: "echu_31_60", libelle: "31 à 60 j", teinte: "c2-t2" },
  { cle: "echu_61_90", libelle: "61 à 90 j", teinte: "c2-t3" },
  { cle: "echu_plus_90", libelle: "Plus de 90 j", teinte: "c2-t4" },
];
