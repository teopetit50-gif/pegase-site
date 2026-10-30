/* ══════════════════════════════════════════════════════════════════════
   Le monde d'EXEMPLE des écrans client — le socle (05/10/2026)

   /espace3 : un groupe fictif, « Groupe Soléa » (dix-huit sociétés aux
   Antilles, en Guyane et au Havre), cinq personnes, un périmètre : tout ce qui est
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
  [EXEMPLE_MOI]: { nom: "Vous", role: "gerant" },
  "00000000-0000-4000-8000-0000000000a2": { nom: "Hélène Laurent (DAF)", role: "admin" },
  "00000000-0000-4000-8000-0000000000a3": { nom: "Patrick Bellay (Juridique)", role: "valideur" },
  "00000000-0000-4000-8000-0000000000a4": { nom: "Maëva Rosan (Marketing)", role: "valideur" },
  "00000000-0000-4000-8000-0000000000a5": { nom: "Didier Darius (DSI)", role: "admin" },
};
export const CLAIRE = "00000000-0000-4000-8000-0000000000a2";
export const YANIS = "00000000-0000-4000-8000-0000000000a3";
export const SOFIA = "00000000-0000-4000-8000-0000000000a4";
export const MARC = "00000000-0000-4000-8000-0000000000a5";

/* 30/10/2026 — /espace3 : le groupe fictif « Groupe Soléa », dix-huit sociétés */
export const ENTITES = [
  { id: "00000000-0000-4000-8000-0000000000e1", nom: "Soléa Holding (siège)", principale: true },
  { id: "00000000-0000-4000-8000-0000000000e2", nom: "Soléa Market Jarry", principale: false },
  { id: "00000000-0000-4000-8000-0000000000e3", nom: "Soléa Market Lamentin", principale: false },
  { id: "00000000-0000-4000-8000-0000000000e4", nom: "Soléa Auto Guadeloupe", principale: false },
  { id: "00000000-0000-4000-8000-0000000000e5", nom: "Soléa Import", principale: false },
  { id: "00000000-0000-4000-8000-0000000000e6", nom: "Brico Soléa Martinique", principale: false },
  { id: "00000000-0000-4000-8000-0000000000e7", nom: "Soléa Market Destreland", principale: false },
  { id: "00000000-0000-4000-8000-0000000000e8", nom: "Soléa Market Cayenne", principale: false },
  { id: "00000000-0000-4000-8000-0000000000e9", nom: "Proxi Soléa (12 magasins)", principale: false },
  { id: "00000000-0000-4000-8000-0000000000ea", nom: "Soléa Auto Martinique", principale: false },
  { id: "00000000-0000-4000-8000-0000000000eb", nom: "Soléa Location", principale: false },
  { id: "00000000-0000-4000-8000-0000000000ec", nom: "Soléa Pièces", principale: false },
  { id: "00000000-0000-4000-8000-0000000000ed", nom: "Brico Soléa Guadeloupe", principale: false },
  { id: "00000000-0000-4000-8000-0000000000ee", nom: "Maison Soléa", principale: false },
  { id: "00000000-0000-4000-8000-0000000000ef", nom: "Soléa Froid", principale: false },
  { id: "00000000-0000-4000-8000-0000000000f0", nom: "Soléa Transit (Le Havre)", principale: false },
  { id: "00000000-0000-4000-8000-0000000000f1", nom: "Soléa Immobilier", principale: false },
  { id: "00000000-0000-4000-8000-0000000000f2", nom: "Soléa Gestion", principale: false },
];
export const SIEGE = ENTITES[0].id;
export const AGENCE = ENTITES[1].id;
export const LAMENTIN = ENTITES[2].id;
export const AUTO_GP = ENTITES[3].id;
export const IMPORT = ENTITES[4].id;
export const BRICO_MQ = ENTITES[5].id;

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
