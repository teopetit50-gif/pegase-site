/* ══════════════════════════════════════════════════════════════════════
   CASHD — exporter un tableau vers un tableur (06/10/2026, C2)

   CSV au point-virgule, montants à la française, BOM UTF-8 : il s'ouvre
   tel quel dans Excel ou LibreOffice. Rien ne sort du navigateur.
   ══════════════════════════════════════════════════════════════════════ */

import type { Balance, Relance } from "./types";

function cellule(v: unknown): string {
  if (v === null || v === undefined) return "";
  const t = typeof v === "number" ? v.toFixed(2).replace(".", ",") : String(v);
  return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

function telecharger(nom: string, lignes: unknown[][]) {
  const texte = "﻿" + lignes.map((l) => l.map(cellule).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([texte], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exporterBalance(comptes: Balance[], jour: string) {
  telecharger(`balance-agee-${jour}.csv`, [
    ["Code client", "Client", "Statut", "Non échu", "1 à 30 j", "31 à 60 j", "61 à 90 j", "Plus de 90 j", "Échu", "En litige", "Encours", "Crédits", "Plafond", "Retard max (j)"],
    ...comptes.map((b) => [b.reference, b.nom, b.statut, b.non_echu, b.echu_1_30, b.echu_31_60, b.echu_61_90, b.echu_plus_90, b.echu, b.en_litige, b.encours, b.credits, b.plafond_encours, b.retard_max_jours]),
  ]);
}

export function exporterRelances(relances: Relance[], jour: string) {
  telecharger(`relances-${jour}.csv`, [
    ["Écrite le", "Client", "Palier", "État", "Destinataire", "Objet", "Montant", "Indemnité", "Pénalités", "Partie le"],
    ...relances.map((r) => [r.jour, r.compte, r.palier, r.etat, r.destinataire_adresse, r.sujet, r.montant, r.indemnites, r.penalites, r.envoye_le]),
  ]);
}

export function exporterJson(nom: string, contenu: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(contenu, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
