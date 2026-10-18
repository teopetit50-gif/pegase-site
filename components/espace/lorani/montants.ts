/* Retenue, avance et pénalités d'une situation (b5_33), comme la base les recalcule
   (private.lorani_situation_montants) : retenue attendue = taux × cumul ; avance (montant initial × taux) remboursée
   de 65 % à 80 % d'exécution (code de la commande publique, art. R2191-11) ; pénalités = jours entre la fin
   contractuelle et la réception × pénalité du marché (à défaut, en marché public, 1/3000 du marché par jour,
   CCAG-Travaux 2021 art. 19.2.1). La base lit aussi les déductions sur la pièce : quand elle a calculé, on garde
   son résultat. */

import type { Marche, Projet, Situation } from "./types";

export type Ecart = { nature: "retenue" | "avance" | "penalites"; attendu: number; deduit: number | null; texte: string };
export type Montants = {
  retenue_attendue: number; retenue_deduite: number | null;
  avance: number; avance_a_rembourser: number; avance_remboursee: number | null;
  fin_contractuelle: string | null; jours_retard: number; penalite_jour: number | null;
  penalites_applicables: number; penalites_deduites: number | null;
  net_attendu: number; ecarts: Ecart[];
};

const arrondi = (n: number) => Math.round(n * 100) / 100;
export const euros = (n: number) => `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} €`;
const jourFr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const plusJours = (d: string, n: number) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const ecartJours = (a: string, b: string) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86400000);

export function montantsSituation(s: Situation, m: Marche, projet: Projet): Montants {
  if (s.montants && "ecarts" in s.montants) return s.montants as Montants;
  const total = m.montant_ht + m.avenants_ht;
  const retenue = arrondi((s.cumul_ht * m.retenue_pct) / 100);
  const avance = arrondi((m.montant_ht * (m.avance_pct ?? 0)) / 100);
  const remb = avance === 0 || total <= 0 ? 0 : arrondi(avance * Math.min(1, Math.max(0, (s.cumul_ht / total - 0.65) / 0.15)));
  const fin = m.demarrage_le && m.delai_execution_jours ? plusJours(m.demarrage_le, m.delai_execution_jours) : null;
  const jours = fin && s.cumul_ht < total ? Math.max(0, ecartJours(s.recue_le, fin)) : 0;
  const parJour = m.penalite_jour_ht ?? (projet.marche_public ? arrondi(total / 3000) : null);
  const penalites = jours > 0 && parJour !== null ? arrondi(jours * parJour) : 0;
  const d = { retenue: s.retenue_deduite_ht ?? null, avance: s.avance_remboursee_ht ?? null, penalites: s.penalites_ht ?? null };
  const ecarts: Ecart[] = [];
  if (m.retenue_pct > 0 && d.retenue !== null && d.retenue < retenue - 1) {
    ecarts.push({ nature: "retenue", attendu: retenue, deduit: d.retenue, texte: d.retenue === 0 ? `la retenue de garantie (${String(m.retenue_pct).replace(".", ",")} %) n’est pas déduite du cumul` : `retenue de garantie déduite ${euros(d.retenue)} au lieu de ${euros(retenue)}` });
  }
  if (remb > 0 && (d.avance ?? 0) < remb - 1) {
    ecarts.push({ nature: "avance", attendu: remb, deduit: d.avance, texte: `avance remboursée ${euros(d.avance ?? 0)} au lieu de ${euros(remb)} (exécution à ${Math.round((100 * s.cumul_ht) / total)} %)` });
  }
  if (penalites > 0 && (d.penalites ?? 0) < penalites - 1 && fin) {
    ecarts.push({ nature: "penalites", attendu: penalites, deduit: d.penalites, texte: `${jours} jour${jours > 1 ? "s" : ""} de retard sur la fin contractuelle du ${jourFr(fin)} : ${euros(penalites)} de pénalités applicables, ${euros(d.penalites ?? 0)} déduits` });
  }
  return { retenue_attendue: retenue, retenue_deduite: d.retenue, avance, avance_a_rembourser: remb, avance_remboursee: d.avance, fin_contractuelle: fin, jours_retard: jours,
    penalite_jour: parJour, penalites_applicables: penalites, penalites_deduites: d.penalites, net_attendu: arrondi(s.cumul_ht - retenue - remb - penalites), ecarts };
}
