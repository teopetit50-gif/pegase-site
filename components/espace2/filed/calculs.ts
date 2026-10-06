/* Les règles de « À payer », reprises telles quelles de l'écran actuel
   (components/espace/filed/EcranAPayer.tsx, session A3) pour servir au
   nouvel écran et aux compteurs de la vue d'ensemble : groupes
   d'échéance, dû, reste à payer, totaux par devise. */

import { montant } from "@/components/espace/format";
import type { EtatPaiement, FactureDuFournisseur } from "@/components/espace/filed/portes";

export type Groupe = "retard" | "semaine" | "mois" | "plus_tard" | "sans";
export const GROUPES: { cle: Groupe; libelle: string; sous: string; teinte: "rouge" | "ambre" | "bleu" | "gris" }[] = [
  { cle: "retard", libelle: "En retard", sous: "échéance dépassée", teinte: "rouge" },
  { cle: "semaine", libelle: "Cette semaine", sous: "dans les 7 jours", teinte: "ambre" },
  { cle: "mois", libelle: "Ce mois-ci", sous: "dans les 30 jours", teinte: "bleu" },
  { cle: "plus_tard", libelle: "Plus tard", sous: "au-delà de 30 jours", teinte: "gris" },
  { cle: "sans", libelle: "Sans échéance", sous: "aucune échéance lue", teinte: "gris" },
];
export const A_PAYER = new Set(["validee", "comptabilisee"]);
export const JOUR = 86_400_000;
export type Etats = Record<string, EtatPaiement>;

/* minuit local, pour compter des jours entiers */
export const jourDe = (iso: string) => {
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, j).getTime();
};

export const minuit = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

export function groupeDe(f: FactureDuFournisseur, aujourdhui: number): Groupe {
  if (!f.echeance_lue) return "sans";
  const jours = Math.round((jourDe(f.echeance_lue) - aujourdhui) / JOUR);
  if (jours < 0) return "retard";
  if (jours <= 7) return "semaine";
  if (jours <= 30) return "mois";
  return "plus_tard";
}

/* le dû : le net à payer s'il est lu, sinon le TTC ; un avoir se déduit */
export const du = (f: FactureDuFournisseur) => {
  const m = f.net_a_payer ?? f.montant_ttc ?? 0;
  return f.nature === "avoir" ? -Math.abs(m) : m;
};

/* le montant à payer : le reste selon filed_etat_paiement, sinon le dû */
export const aPayer = (f: FactureDuFournisseur, etats: Etats) => (f.nature !== "avoir" && etats[f.id] ? etats[f.id].reste : du(f));

export function totaux(lignes: FactureDuFournisseur[], etats: Etats): string {
  const parDevise = new Map<string, number>();
  for (const l of lignes) parDevise.set(l.devise, (parDevise.get(l.devise) ?? 0) + aPayer(l, etats));
  return Array.from(parDevise.entries()).map(([d, t]) => montant(Math.round(t * 100) / 100, d)).join(" + ") || montant(0);
}

/* l'exemple : un règlement partiel sur la facture en retard, comme l'écran actuel */
export function etatsExemple(factures: FactureDuFournisseur[], aujourdhui: number): Etats {
  const e: Etats = {};
  for (const f of factures) {
    if (!A_PAYER.has(f.statut) || f.nature === "avoir") continue;
    const d = du(f);
    const regle = f.reference === "R2026-000018" ? 1000 : 0;
    e[f.id] = { du: d, regle, reste: Math.round((d - regle) * 100) / 100, etat: regle ? "partielle" : "a_payer", dernier_le: regle ? new Date(aujourdhui - 2 * JOUR).toISOString() : null, nb_reglements: regle ? 1 : 0 };
  }
  return e;
}
