/* ══════════════════════════════════════════════════════════════════════
   Le monde d'EXEMPLE des écrans client — le socle (05/10/2026)

   Une entreprise fictive, « Atelier Bertin » (menuiserie-agencement,
   Lyon, deux entités), cinq personnes, un périmètre : tout ce qui est
   affiché quand l'interrupteur de source est sur « Données d'exemple ».
   Les identifiants sont des UUID stables ET reconnaissables (ils
   commencent par 0000…) : rien ici ne peut être confondu avec une ligne
   de la base, et rien d'ici n'est jamais écrit en base.

   Les dates sont RELATIVES au jour de la visite (ilYa / dans) pour que
   la file reste lisible — une échéance « en retard » le reste demain.
   ══════════════════════════════════════════════════════════════════════ */

export const EXEMPLE_CLIENT_ID = "00000000-0000-4000-8000-000000000001";

export const EXEMPLE_MOI = "00000000-0000-4000-8000-0000000000a1";

export const PERSONNES: Record<string, { nom: string; role: string }> = {
  [EXEMPLE_MOI]: { nom: "Vous", role: "valideur" },
  "00000000-0000-4000-8000-0000000000a2": { nom: "Claire Morel", role: "gerant" },
  "00000000-0000-4000-8000-0000000000a3": { nom: "Yanis Dupré", role: "valideur" },
  "00000000-0000-4000-8000-0000000000a4": { nom: "Sofia Carvalho", role: "collaborateur" },
  "00000000-0000-4000-8000-0000000000a5": { nom: "Marc Lévy", role: "admin" },
};
export const CLAIRE = "00000000-0000-4000-8000-0000000000a2";
export const YANIS = "00000000-0000-4000-8000-0000000000a3";
export const SOFIA = "00000000-0000-4000-8000-0000000000a4";
export const MARC = "00000000-0000-4000-8000-0000000000a5";

export const ENTITES = [
  { id: "00000000-0000-4000-8000-0000000000e1", nom: "Atelier Bertin — Siège (Lyon)", principale: true },
  { id: "00000000-0000-4000-8000-0000000000e2", nom: "Atelier Bertin — Agence de Grenoble", principale: false },
];
export const SIEGE = ENTITES[0].id;
export const AGENCE = ENTITES[1].id;

export function nomPersonne(id: string | null | undefined): string {
  if (!id) return "Système";
  return PERSONNES[id]?.nom ?? id.slice(0, 8);
}

export function nomEntite(id: string | null | undefined): string {
  if (!id) return "Toutes les entités";
  return ENTITES.find((e) => e.id === id)?.nom ?? id.slice(0, 8);
}

/* ——— dates relatives ——— */
const JOUR = 86_400_000;

export function dans(jours: number, heure = 9): string {
  const d = new Date();
  d.setHours(heure, 0, 0, 0);
  return new Date(d.getTime() + jours * JOUR).toISOString();
}

export function ilYa(jours: number, heure = 9): string {
  return dans(-jours, heure);
}

/** La date du jour en ISO court (AAAA-MM-JJ), heure locale. */
export function aujourdHui(decalage = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + decalage);
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const j = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${j}`;
}
