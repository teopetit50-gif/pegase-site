/* La révision des prix d'une situation (b5_34), comme la base la calcule (private.lorani_situation_revision) :
   C = a + (1 − a) × In / I0, arrondi au dix-millième ; a, la partie fixe du marché ; I0, l'index du mois zéro ; In,
   celui du mois des travaux de la situation, ou le dernier publié avant lui (la révision est alors « provisoire »,
   comme pour un index pas encore définitif). Révision HT = montant de la période (cumul moins le cumul retenu de la
   précédente) × (C − 1). En base réelle, l'écran montre ce que la base a calculé ; ce calcul sert au monde d'exemple
   et à montrer la formule. */

import type { IndexValeur, Marche, Revision, Situation } from "./types";

const arrondi = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;
const debutMois = (d: string) => `${d.slice(0, 7)}-01`;

export function revisionSituation(s: Situation, m: Marche, situations: Situation[], valeurs: IndexValeur[], code: string | undefined): Revision {
  if (!m.revision_idbank || !m.revision_mois_zero) return {};
  const prec = situations.filter((x) => x.marche_id === s.marche_id && x.numero < s.numero).sort((a, b) => b.numero - a.numero)[0];
  const periode = arrondi(s.cumul_ht - (prec ? (prec.cumul_admis_ht ?? prec.cumul_ht) : 0), 2);
  const serie = valeurs.filter((v) => v.idbank === m.revision_idbank);
  const i0 = serie.find((v) => v.mois.slice(0, 7) === m.revision_mois_zero!.slice(0, 7))?.valeur ?? null;
  const mois = debutMois(s.mois);
  const i = serie.filter((v) => v.mois.slice(0, 10) <= mois).sort((a, b) => b.mois.localeCompare(a.mois))[0];
  if (i0 === null || !i) {
    return { index: code, idbank: m.revision_idbank, mois_zero: m.revision_mois_zero, i0, mois, montant_periode: periode,
             manque: i0 === null ? "l'index du mois zéro n'est pas encore relevé" : "aucun index relevé pour ce mois" };
  }
  const a = m.revision_partie_fixe ?? 0.15;
  const c = arrondi(a + ((1 - a) * i.valeur) / i0, 4);
  return { index: code, idbank: m.revision_idbank, partie_fixe: a, mois_zero: m.revision_mois_zero, i0, mois, mois_index: i.mois.slice(0, 10), in: i.valeur,
           provisoire: i.mois.slice(0, 10) < mois || (i.qualite ?? "DEF") !== "DEF", coefficient: c, montant_periode: periode, revision_ht: arrondi(periode * (c - 1), 2) };
}

/* « 2026-06-01 » → « juin 2026 » */
export const moisLong = (d: string | null | undefined) =>
  d ? new Date(`${d.slice(0, 7)}-15T12:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "—";
