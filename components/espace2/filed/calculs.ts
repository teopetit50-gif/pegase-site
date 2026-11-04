/* Les règles de « À payer », reprises telles quelles de l'écran actuel
   (components/espace/filed/EcranAPayer.tsx, session A3) pour servir au
   nouvel écran et aux compteurs de la vue d'ensemble : groupes
   d'échéance, dû, reste à payer, totaux par devise. */

import { montant } from "@/components/espace/format";
import type { EtatPaiement, FactureDuFournisseur } from "@/components/espace/filed/portes";
import { REGLEMENTS_EXEMPLE } from "@/components/espace/exemples/filed";

/* 04/11 — la tranche « Dans 31 à 60 jours » : l'échéancier donne la prévision de décaissement à trente et
   soixante jours, comme filed_echeancier (a4_06 : « 30 jours », « 60 jours », « au-delà ») (promesse FILED n° 49) */
export type Groupe = "retard" | "semaine" | "mois" | "deux_mois" | "plus_tard" | "sans";
export const GROUPES: { cle: Groupe; libelle: string; sous: string; teinte: "rouge" | "ambre" | "bleu" | "gris" }[] = [
  { cle: "retard", libelle: "En retard", sous: "échéance dépassée", teinte: "rouge" },
  { cle: "semaine", libelle: "Cette semaine", sous: "dans les 7 jours", teinte: "ambre" },
  { cle: "mois", libelle: "Ce mois-ci", sous: "dans les 30 jours", teinte: "bleu" },
  { cle: "deux_mois", libelle: "Dans 31 à 60 jours", sous: "prévision à soixante jours", teinte: "gris" },
  { cle: "plus_tard", libelle: "Plus tard", sous: "au-delà de 60 jours", teinte: "gris" },
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
  if (jours <= 60) return "deux_mois";
  return "plus_tard";
}

/* 04/11 — la prévision de décaissement à trente et à soixante jours (le reste à payer, échu compris), au sens de
   filed_echeancier : ce qui tombe d'ici trente jours, puis d'ici soixante (promesse FILED n° 49) */
export function prevision(lignes: FactureDuFournisseur[], etats: Etats, aujourdhui: number): { trente: number; soixante: number } {
  let trente = 0;
  let soixante = 0;
  for (const f of lignes) {
    if (f.nature === "avoir" || etats[f.id]?.etat === "payee") continue;
    const g = groupeDe(f, aujourdhui);
    const r = aPayer(f, etats);
    if (g === "retard" || g === "semaine" || g === "mois") trente += r;
    if (g !== "plus_tard" && g !== "sans") soixante += r;
  }
  return { trente: Math.round(trente * 100) / 100, soixante: Math.round(soixante * 100) / 100 };
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

/* l'exemple : un règlement partiel sur la facture en retard, comme l'écran actuel ; 04/11 — et le ticket de caisse
   réglé en carte au comptoir (REGLEMENTS_EXEMPLE, exemples/filed.ts) */
export function etatsExemple(factures: FactureDuFournisseur[], aujourdhui: number): Etats {
  const e: Etats = {};
  for (const f of factures) {
    if (!A_PAYER.has(f.statut) || f.nature === "avoir") continue;
    const d = du(f);
    const r = f.reference ? REGLEMENTS_EXEMPLE[f.reference] : undefined;
    const regle = r ? (r.montant ?? d) : 0;
    const reste = Math.round((d - regle) * 100) / 100;
    e[f.id] = { du: d, regle, reste, etat: !regle ? "a_payer" : reste <= 0.004 ? "payee" : "partielle", dernier_le: r ? new Date(aujourdhui - r.ilYa * JOUR).toISOString() : null, nb_reglements: regle ? 1 : 0 };
  }
  return e;
}
