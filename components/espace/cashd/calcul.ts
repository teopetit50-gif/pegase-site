/* ══════════════════════════════════════════════════════════════════════
   CASHD — le calcul du tableau à partir des fiches (06/10/2026, C2)

   Sert le monde d'exemple : la base fait ce calcul dans ses vues
   (cashd_factures_etat, cashd_balance_agee) et sa porte cashd_tableau ;
   l'exemple le refait ici, avec les mêmes règles, pour que les actions
   jouées en mémoire (un règlement noté, un compte mis en pause) se voient
   aussitôt dans les compteurs.
   ══════════════════════════════════════════════════════════════════════ */

import type { Balance, Fiche, Piece, ReglementEtat, Tableau, Totaux, Tranche } from "./types";

export function jourParis(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function joursEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/* Le reste dû, le retard et la tranche d'une pièce (règles de cashd_factures_etat). */
export function etatPiece(p: Piece, jour = jourParis()): Piece {
  const ouverte = p.statut === "ouverte" || p.statut === "litige";
  const reste = p.nature === "devis" || !ouverte ? 0 : Math.max(Math.round((p.montant_ttc - p.regle - p.avoirs_imputes) * 100) / 100, 0);
  const facture = p.nature === "facture" || p.nature === "acompte";
  const retard = facture && reste > 0 && p.echeance && p.echeance < jour ? joursEntre(p.echeance, jour) : 0;
  let tranche: Tranche | null = null;
  if (facture && reste > 0) {
    if (!p.echeance || p.echeance >= jour) tranche = "non_echu";
    else if (retard <= 30) tranche = "1_30";
    else if (retard <= 60) tranche = "31_60";
    else if (retard <= 90) tranche = "61_90";
    else tranche = "plus_90";
  }
  return { ...p, reste_du: p.nature === "avoir" ? p.reste_du : reste, retard_jours: retard, tranche, jours_ecoules: joursEntre(p.date_emission, jour) };
}

export function balanceDe(f: Fiche): Balance {
  const pieces = f.pieces.map((p) => etatPiece(p)).filter((p) => p.nature === "facture" || p.nature === "acompte");
  const somme = (filtre: (p: Piece) => boolean) => Math.round(pieces.filter(filtre).reduce((s, p) => s + p.reste_du, 0) * 100) / 100;
  const horsLitige = (t: Tranche) => (p: Piece) => p.tranche === t && p.statut !== "litige";
  const credits =
    f.pieces.filter((p) => p.nature === "avoir" && p.statut === "ouverte").reduce((s, p) => s + p.reste_du, 0) +
    f.reglements.filter((r) => r.statut === "actif").reduce((s, r) => s + r.a_imputer, 0);
  return {
    compte_id: f.compte.id,
    client_id: f.compte.client_id,
    entite_id: f.compte.entite_id,
    reference: f.compte.reference,
    nom: f.compte.nom,
    groupe: f.compte.groupe,
    statut: f.compte.statut,
    plafond_encours: f.compte.plafond_encours,
    devise: "EUR",
    non_echu: somme(horsLitige("non_echu")),
    echu_1_30: somme(horsLitige("1_30")),
    echu_31_60: somme(horsLitige("31_60")),
    echu_61_90: somme(horsLitige("61_90")),
    echu_plus_90: somme(horsLitige("plus_90")),
    echu: somme((p) => !!p.tranche && p.tranche !== "non_echu" && p.statut !== "litige"),
    en_litige: somme((p) => p.statut === "litige"),
    encours: somme((p) => !!p.tranche),
    credits,
    factures_ouvertes: pieces.filter((p) => p.tranche).length,
    factures_echues: pieces.filter((p) => p.retard_jours > 0).length,
    retard_max_jours: Math.max(0, ...pieces.map((p) => p.retard_jours)),
    plus_ancienne_echeance: pieces.filter((p) => p.retard_jours > 0).map((p) => p.echeance!).sort()[0] ?? null,
  };
}

export function tableauDe(fiches: Fiche[], base: Pick<Tableau, "reglages" | "dernier_import">, sansCompte: ReglementEtat[] = []): Tableau {
  const comptes = fiches.map(balanceDe).map((b) => ({ ...b, depasse_plafond: b.plafond_encours !== null && b.encours > b.plafond_encours }));
  const s = (k: keyof Balance) => Math.round(comptes.reduce((t, b) => t + (Number(b[k]) || 0), 0) * 100) / 100;
  const totaux: Totaux = {
    encours: s("encours"),
    echu: s("echu"),
    non_echu: s("non_echu"),
    echu_1_30: s("echu_1_30"),
    echu_31_60: s("echu_31_60"),
    echu_61_90: s("echu_61_90"),
    echu_plus_90: s("echu_plus_90"),
    en_litige: s("en_litige"),
    credits: s("credits"),
    comptes_en_retard: comptes.filter((b) => b.echu > 0).length,
    factures_echues: s("factures_echues"),
    au_dessus_du_plafond: comptes.filter((b) => b.depasse_plafond).length,
  };
  const a_imputer = [
    ...sansCompte.filter((r) => r.statut === "actif" && r.a_imputer > 0),
    ...fiches.flatMap((f) => f.reglements.filter((r) => r.statut === "actif" && r.a_imputer > 0).map((r) => ({ ...r, compte: f.compte.nom }))),
  ];
  const devis_en_attente = fiches.flatMap((f) =>
    f.pieces
      .filter((p) => p.nature === "devis" && p.statut === "en_attente")
      .map((p) => ({ id: p.id, numero: p.numero, compte_id: f.compte.id, compte: f.compte.nom, montant_ttc: p.montant_ttc, date_emission: p.date_emission, jours_ecoules: etatPiece(p).jours_ecoules })),
  );
  return {
    ...base,
    totaux,
    comptes: comptes.filter((b) => b.encours > 0 || b.credits > 0 || b.statut !== "actif").sort((a, b) => b.echu - a.echu || b.encours - a.encours || a.nom.localeCompare(b.nom, "fr")),
    a_imputer,
    devis_en_attente,
  };
}
