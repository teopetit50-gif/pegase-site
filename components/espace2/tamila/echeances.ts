/* TAMILA — les échéances du cabinet réunies (02/11/2026, DECOUPAGES.md § TAMILA) :
   délais (B20), audiences (B21), étapes d'expertise (B24) et relances de pièces
   attendues (B22), sans ouvrir un seul dossier (lecture des tables du cabinet). */

import { joursAvant, ACTES, NATURES_AUDIENCE, delaiCourt } from "@/components/espace/tamila/regles";
import type { Attente, Audience, Delai, Expertise } from "@/components/espace/tamila/types";
import type { NomTamIcone } from "./TamIcone";

export type Echeance = {
  cle: string;
  dossier: string;
  genre: "delai" | "audience" | "expertise" | "relance";
  titre: string;
  date: string; /* AAAA-MM-JJ ou ISO */
  creee: string;
  aConfirmer: boolean;
  statut: NomTamIcone;
  responsable: string | null;
  etiquette: string;
};

const ETAPES: [keyof Expertise, keyof Expertise, string][] = [
  ["consignation_avant", "consignation_versee_le", "Expertise : consignation à verser"],
  ["pre_rapport_attendu_le", "pre_rapport_recu_le", "Expertise : pré-rapport attendu"],
  ["dires_jusqu_au", "dires_deposes_le", "Expertise : dires à adresser à l'expert"],
  ["rapport_attendu_le", "rapport_recu_le", "Expertise : rapport définitif attendu"],
];

export function echeancesDe(delais: Delai[], audiences: Audience[], expertises: Expertise[], attentes: Attente[], objetDe: (a: Attente) => string | null): Echeance[] {
  const out: Echeance[] = [];
  for (const t of delais) {
    if (!delaiCourt(t)) continue;
    const article = t.regle_code ? t.regle_code.split(".").slice(2).join(".").replace(/\.(appelant|intime)$/, "") : null;
    out.push({
      cle: `d:${t.id}`, dossier: t.dossier_id, genre: "delai",
      titre: `${ACTES[t.acte]}${article ? ` (art. ${article})` : t.nature === "date_fixee" ? " (date fixée)" : ""}`,
      date: t.echeance_retenue, creee: t.cree_le, aConfirmer: t.statut === "a_confirmer",
      statut: t.statut === "a_confirmer" ? "IssueStatusTodo" : "IssueStatusStarted", responsable: t.responsable_id, etiquette: "Délai",
    });
  }
  for (const a of audiences) {
    if (a.statut !== "prevue" || joursAvant(a.date_heure) < 0) continue;
    out.push({
      cle: `a:${a.id}`, dossier: a.dossier_id, genre: "audience", titre: `Audience : ${NATURES_AUDIENCE[a.nature].toLowerCase()}${a.chambre ? `, ${a.chambre}` : ""}`,
      date: a.date_heure, creee: a.cree_le, aConfirmer: false, statut: "IssueStatusTodo", responsable: a.avocat_id, etiquette: "Audience",
    });
  }
  for (const x of expertises) {
    if (x.statut !== "en_cours") continue;
    const etape = ETAPES.find(([attendu, fait]) => x[attendu] && !x[fait]);
    if (!etape) continue;
    out.push({
      cle: `x:${x.id}`, dossier: x.dossier_id, genre: "expertise", titre: etape[2], date: String(x[etape[0]]), creee: x.cree_le, aConfirmer: false,
      statut: "IssueStatusStarted", responsable: null, etiquette: "Expertise",
    });
  }
  for (const at of attentes) {
    if (at.statut !== "attendue" || !at.relance_le) continue;
    const objet = objetDe(at);
    out.push({
      cle: `r:${at.id}`, dossier: at.dossier_id, genre: "relance", titre: `Relancer ${at.de === "client" ? "le client" : at.de === "confrere" ? "le confrère" : "le tiers"} : ${objet ?? "objet chiffré"}`,
      date: at.relance_le, creee: at.cree_le, aConfirmer: false, statut: "IssueStatusTodo", responsable: null, etiquette: "Relance",
    });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/* La priorité de Linear, lue dans le temps qui reste : dépassé ou sous deux jours → Urgent, une semaine → High,
   quinze jours → Medium, au-delà → Low. */
export function prioriteDe(date: string): { icone: NomTamIcone; libelle: string } {
  const j = joursAvant(date);
  if (j <= 2) return { icone: "Priority1", libelle: j < 0 ? "Dépassée" : "Urgente" };
  if (j <= 7) return { icone: "Priority2", libelle: "Haute" };
  if (j <= 15) return { icone: "Priority3", libelle: "Moyenne" };
  return { icone: "Priority4", libelle: "Basse" };
}

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export function dateCourte(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return `${d.getDate()} ${MOIS[d.getMonth()]}`;
}
export function dateLongue(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
export function ilYaCourt(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 60) return `il y a ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}
