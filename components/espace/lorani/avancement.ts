/* L'avancement d'une situation (b5_32), comme la base le calcule (private.lorani_situation_avancement) : déclaré =
   cumul / (marché + avenants) ; constaté = le dernier avancement du lot dans un compte rendu diffusé dont la visite
   précède la réception de la situation. Au-delà de 5 points d'écart, la base lève une alerte. */

import type { CompteRendu, Dossier, Marche, Situation } from "./types";

export const ECART_AVANCEMENT = 5;

export function avancementSituation(s: Situation, m: Marche, dossier: Dossier): { declare: number; constate: number | null; cr: CompteRendu | null } {
  const total = m.montant_ht + m.avenants_ht;
  const declare = total > 0 ? Math.round((1000 * s.cumul_ht) / total) / 10 : 0;
  const cr = dossier.comptesRendus
    .filter((c) => c.projet_id === s.projet_id && c.statut === "diffuse" && c.visite_le <= s.recue_le && typeof c.avancement_lots?.[m.lot_id] === "number")
    .sort((a, b) => b.visite_le.localeCompare(a.visite_le) || b.numero - a.numero)[0] ?? null;
  return { declare, constate: cr ? (cr.avancement_lots?.[m.lot_id] ?? null) : null, cr };
}

export const pct = (n: number) => `${String(Math.round(n * 10) / 10).replace(".", ",")} %`;
