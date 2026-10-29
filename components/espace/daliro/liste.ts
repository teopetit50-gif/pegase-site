/* ══════════════════════════════════════════════════════════════════════
   La famille d'un chantier et la liste d'exemple recalculée depuis les
   tableaux (sorties de EcranDaliro le 29/10/2026 pour que les pages de
   l'espace 2 s'en servent sans charger l'écran de /espace)
   ══════════════════════════════════════════════════════════════════════ */

import type { Famille } from "./etats";
import type { Chantier, Tableau } from "./types";

export function famille(c: Chantier): Famille | null {
  if ((c.nb_bloquants ?? 0) > 0) return "bloque";
  if ((c.nb_avenants_en_cours ?? 0) > 0) return "a_signer";
  const conf = c.prochain_passage?.confirmation;
  if (conf === "demandee" || conf === "sans_reponse" || conf === "declinee") return "a_confirmer";
  if (c.statut === "ouvert" || c.statut === "suspendu") return "ouvert";
  return null;
}

/* la liste d'exemple se recalcule depuis les tableaux (en mémoire) */
export function listeDepuis(tableaux: Record<string, Tableau>): Chantier[] {
  return Object.values(tableaux).map((t) => ({
    ...t.chantier,
    nb_lots: t.lots.length,
    nb_bloquants: t.controles.filter((k) => k.gravite === "bloquant").length,
    nb_attention: t.controles.filter((k) => k.gravite === "attention").length,
    marche_verifie: t.marches.some((m) => m.statut === "verifie"),
    nb_avenants_en_cours: t.avenants.filter((a) => a.statut === "brouillon" || a.statut === "soumis").length,
    nb_avenants_signes: t.avenants.filter((a) => a.statut === "signe").length,
    prochain_passage: (() => {
      const p = [...t.passages].filter((x) => x.statut === "prevu").sort((a, b) => a.debut.localeCompare(b.debut))[0];
      return p ? { id: p.id, debut: p.debut, fin: p.fin, tache: p.tache, confirmation: p.confirmation, intervenant_type: p.intervenant_type, intervenant_nom: p.intervenant_nom ?? null } : null;
    })(),
  }));
}
