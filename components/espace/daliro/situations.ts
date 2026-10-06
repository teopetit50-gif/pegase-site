/* Le calcul d'une situation de travaux — pur, le même que private.btp_recalculer_situation (b6_12).
   Sert à l'exemple (en mémoire) ; en base réelle, la base calcule et l'écran relit. */

import type { Chantier, LigneSituation, Situation, Tableau } from "./types";

const arrondi = (v: number) => Math.round(v * 100) / 100;

export function tauxZone(zone: string): number {
  if (zone === "metropole" || zone === "corse") return 0.2;
  if (zone === "guadeloupe" || zone === "martinique" || zone === "la-reunion") return 0.085;
  return 0;
}

export function mentionsSituation(s: Pick<Situation, "autoliquidation" | "regime_tva" | "retenue_caution" | "retenue_taux" | "retenue_base">): string[] {
  const m: string[] = [];
  if (s.autoliquidation) m.push("Autoliquidation de la TVA — article 283-2 nonies du CGI : TVA due par le preneur.");
  else if (s.regime_tva === "non_applicable") m.push("TVA non applicable (article 294 du CGI).");
  else if (s.regime_tva === "hors_champ") m.push("Opération hors du champ de la TVA française.");
  if (s.retenue_caution) m.push("Retenue de garantie remplacée par une caution (loi n° 71-584 du 16 juillet 1971, art. 1er).");
  else if (s.retenue_taux > 0)
    m.push(`Retenue de garantie de ${String(arrondi(s.retenue_taux * 100)).replace(".", ",")} % sur le montant ${s.retenue_base === "ht" ? "HT" : "TTC"} de la période (loi n° 71-584 du 16 juillet 1971), libérée un an après la réception sauf opposition motivée.`);
  return m;
}

export function recalculer(s: Situation): Situation {
  const lignes: LigneSituation[] = s.lignes.map((l) => ({ ...l, cumule_ht: arrondi((l.base_ht * l.avancement) / 100), precedent_ht: arrondi((l.base_ht * l.precedent_avancement) / 100) }));
  const cumul = arrondi(lignes.reduce((t, l) => t + l.cumule_ht, 0));
  const precedent = arrondi(lignes.reduce((t, l) => t + l.precedent_ht, 0));
  const periode = arrondi(cumul - precedent);
  const tva = s.autoliquidation || s.taux_tva === 0 ? 0 : arrondi(periode * s.taux_tva);
  const retenue = s.retenue_caution || s.retenue_taux === 0 ? 0 : arrondi(s.retenue_taux * (s.retenue_base === "ht" ? periode : periode + tva));
  return { ...s, lignes, cumul_ht: cumul, precedent_ht: precedent, periode_ht: periode, tva, retenue, net_a_payer: arrondi(periode + tva - retenue), mentions: mentionsSituation(s) };
}

/* Ouvrir la situation suivante d'un chantier (exemple) : mêmes règles que btp_ouvrir_situation. */
export function ouvrirLocale(t: Tableau, periodeFin: string, tauxChoisi: number | null, nid: () => string): Situation {
  const c: Chantier = t.chantier;
  const marche = t.marches.find((m) => m.statut === "verifie");
  if (!marche) throw new Error("Une situation se calcule sur un marché vérifié ligne à ligne : vérifiez d'abord le marché.");
  const situations = t.situations ?? [];
  const enCours = situations.find((x) => x.statut === "brouillon" || x.statut === "soumise" || x.statut === "refusee");
  if (enCours) throw new Error(`La situation n° ${enCours.numero} est déjà en cours sur ce chantier : terminez-la avant d'en ouvrir une autre.`);
  const prec = [...situations].filter((x) => x.statut === "validee").sort((a, b) => b.numero - a.numero)[0];
  if (prec && periodeFin <= prec.periode_fin) throw new Error(`La période doit finir après celle de la situation n° ${prec.numero}.`);
  const regime = (c.regime_tva || "normal") as Situation["regime_tva"];
  const taux = regime === "non_applicable" || regime === "hors_champ" ? 0 : tauxChoisi ?? tauxZone(c.zone_tva);
  const id = nid();
  const avant = (cle: "ligne_marche_id" | "ligne_avenant_id", v: string) => prec?.lignes.find((l) => l[cle] === v)?.avancement ?? 0;
  const lignes: LigneSituation[] = [
    ...marche.lignes.filter((l) => l.nature !== "option" && l.montant_ht !== null).map((l) => ({
      id: nid(), situation_id: id, origine: "marche" as const, ligne_marche_id: l.id, ligne_avenant_id: null, avenant_numero: null, lot_id: l.lot_id, ordre: l.ordre,
      designation: l.designation, base_ht: l.montant_ht ?? 0, avancement: avant("ligne_marche_id", l.id), precedent_avancement: avant("ligne_marche_id", l.id), cumule_ht: 0, precedent_ht: 0,
    })),
    ...t.avenants.filter((a) => a.statut === "signe").flatMap((a) => a.lignes.map((l) => ({
      id: nid(), situation_id: id, origine: "avenant" as const, ligne_marche_id: null, ligne_avenant_id: l.id, avenant_numero: a.numero, lot_id: l.lot_id, ordre: 100000 + a.numero * 1000 + l.ordre,
      designation: l.designation, base_ht: l.montant_ht ?? 0, avancement: avant("ligne_avenant_id", l.id), precedent_avancement: avant("ligne_avenant_id", l.id), cumule_ht: 0, precedent_ht: 0,
    }))),
  ];
  return recalculer({
    id, chantier_id: c.id, marche_id: marche.id, numero: Math.max(0, ...situations.map((x) => x.numero)) + 1, periode_fin: periodeFin, statut: "brouillon",
    regime_tva: regime, taux_tva: taux, autoliquidation: regime === "autoliquidation", retenue_taux: marche.retenue_taux, retenue_base: marche.retenue_base, retenue_caution: marche.retenue_caution,
    cumul_ht: 0, precedent_ht: 0, periode_ht: 0, tva: 0, retenue: 0, net_a_payer: 0, mentions: [], demande_id: null, demande_statut: null, soumise_le: null, validee_le: null, validee_libelle: null, motif: null, lignes,
  });
}
