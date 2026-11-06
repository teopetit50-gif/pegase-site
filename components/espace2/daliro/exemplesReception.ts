/* ══════════════════════════════════════════════════════════════════════
   DALIRO, espace 2 : la réception d'exemple étoffée (06/11/2026)

   Teo : « dans la page Réception, il n'y a pas assez de choses : mets des
   exemples pour que je puisse montrer aux gars ». Maison Garnier n'avait
   que deux réserves. Elle en reçoit douze, une ou deux par lot, de toutes
   sortes (fissure, joint, crémone, tôle de rive, prise sans courant,
   carreaux creux, coulure…), cinq déjà levées, une hors devis à chiffrer.

   Appelé après etofferExemple (./donnees) : les lots 03 à 07 de Garnier
   n'existent qu'une fois le chantier étoffé, on les retrouve par leur code.
   Les deux autres chantiers réceptionnés (retenue à réclamer, retenue
   frappée d'opposition) sont dans ./exemplesPlus.

   Identifiants en 0000…f… : rien ici n'est jamais écrit en base.
   ══════════════════════════════════════════════════════════════════════ */

import { aujourdHui } from "@/components/espace/exemples/socle";
import type { Reserve, Tableau } from "@/components/espace/daliro/types";

const GARNIER = "00000000-0000-4000-8000-00000000d760";
const f = (n: number) => `00000000-0000-4000-8000-0000000f${String(n).padStart(4, "0")}`;

/* [code du lot (null : hors lot), description, levée il y a n jours (null : ouverte), identifiant gardé] */
const RESERVES_GARNIER: [string | null, string, number | null, string?][] = [
  ["02", "Joint de la baie coulissante à reprendre côté jardin", null, "00000000-0000-4000-8000-00000000d766"],
  [null, "Habillage de la descente d'eaux pluviales, non prévu au devis", null, "00000000-0000-4000-8000-00000000d767"],
  ["01", "Fissure capillaire en angle de dalle, côté terrasse", 3],
  ["01", "Enduit à reprendre au pied du mur pignon (éclats sur 1,20 m)", null],
  ["02", "Crémone de la fenêtre de la chambre dure à manœuvrer", 2],
  ["03", "Tôle de rive mal fixée au-dessus de la chambre : bruit au vent", null],
  ["04", "Prise du séjour sans courant (circuit 4)", 4],
  ["04", "Cache manquant sur la boîte de dérivation du couloir", null],
  ["05", "Siphon du point d'eau du séjour qui suinte", 5],
  ["06", "Deux carreaux sonnent creux devant la baie", null],
  ["06", "Joint de plinthe à refaire dans la chambre", null],
  ["07", "Coulure de peinture sur la façade sous la fenêtre de la chambre", 1],
];

export function etofferReceptions(base: Record<string, Tableau>): Record<string, Tableau> {
  const t = base[GARNIER];
  if (!t?.reception) return base;
  const lotDe = (code: string | null) => (code ? (t.lots.find((l) => l.code === code)?.id ?? null) : null);
  const reserves: Reserve[] = RESERVES_GARNIER.map(([code, description, levee, garde], i) => ({
    id: garde ?? f(i + 1),
    reception_id: t.reception!.id,
    lot_id: lotDe(code),
    ordre: i + 1,
    description,
    statut: levee === null ? "ouverte" : "levee",
    levee_le: levee === null ? null : aujourdHui(-levee),
  }));
  return { ...base, [GARNIER]: { ...t, reception: { ...t.reception, reserves } } };
}
