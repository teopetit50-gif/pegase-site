/* ══════════════════════════════════════════════════════════════════════
   OFFLOAD — exporter les tableaux du pilotage vers un tableur (c4_09)

   CSV au point-virgule, montants à la française, BOM UTF-8 : il s'ouvre
   tel quel dans Excel ou LibreOffice. Une cellule qui commencerait par
   = + - @ est protégée (apostrophe) contre l'injection de formule. Rien ne
   sort du navigateur. À la demande depuis l'écran ; à date fixe, l'arrêté
   mensuel posé la nuit s'exporte de la même façon.
   ══════════════════════════════════════════════════════════════════════ */

import type { Pilotage } from "./types";

type Cellule = string | number | null | undefined;

function cellule(v: Cellule): string {
  if (v === null || v === undefined) return "";
  let t = typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(".", ",")) : String(v);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

function telecharger(nom: string, lignes: Cellule[][]) {
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

const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export function tableauVagues(p: Pilotage): Cellule[][] {
  return [
    ["Vague", "Comptes sollicités", "Chiffre en jeu HT", "Messages partis", "Appels", "Réponses", "Taux de réponse (%)", "Commandes reprises", "Chiffre repris HT"],
    ...p.vagues.map((v) => [v.vague, n(v.comptes), n(v.en_jeu), n(v.messages), n(v.appels), n(v.reponses), n(v.taux_reponse), n(v.commandes), n(v.chiffre_repris)]),
  ];
}

const AXES: [keyof Pilotage["taux"], string][] = [["segment", "Segment"], ["niveau", "Niveau du signal"], ["canal", "Canal"], ["message", "Message"]];

export function tableauTaux(p: Pilotage): Cellule[][] {
  const l: Cellule[][] = [["Axe", "Valeur", "Sollicités", "Réponses", "Taux de réponse (%)"]];
  for (const [cle, libelle] of AXES) for (const t of p.taux[cle] ?? []) l.push([libelle, t.valeur, n(t.sollicites), n(t.reponses), n(t.taux)]);
  return l;
}

export function tableauSuivi(p: Pilotage): Cellule[][] {
  return [
    ["Mois", "Échéances honorées", "dont après un message", "Commandes reprises", "Chiffre repris HT", "Affaires retirées après relance", "Valeur libérée HT"],
    ...p.suivi.map((m) => [m.mois, n(m.echeances_honorees), n(m.echeances_apres_message), n(m.commandes_reprises), n(m.chiffre_repris), n(m.affaires_retirees), n(m.valeur_liberee)]),
  ];
}

export function tableauEntites(p: Pilotage): Cellule[][] {
  const tete = ["Niveau", "Société", "Site", "Comptes sollicités", "Chiffre en jeu HT", "Réponses", "Commandes reprises", "Chiffre repris HT", "Échéances honorées", "Affaires retirées"];
  const l: Cellule[][] = [tete];
  for (const e of p.entites.par_entite) l.push(["Entité", e.societe, "", n(e.comptes), n(e.en_jeu), n(e.reponses), n(e.commandes), n(e.chiffre_repris), n(e.echeances_honorees), n(e.affaires_retirees)]);
  for (const s of p.entites.par_site) l.push(["Site", s.societe, s.site, n(s.comptes), n(s.en_jeu), n(s.reponses), n(s.commandes), n(s.chiffre_repris), n(s.echeances_honorees), n(s.affaires_retirees)]);
  const c = p.entites.consolide;
  if (c) l.push(["Consolidé", "", "", n(c.comptes), n(c.en_jeu), n(c.reponses), n(c.commandes), n(c.chiffre_repris), n(c.echeances_honorees), n(c.affaires_retirees)]);
  return l;
}

export type TableauPilotage = "vagues" | "taux" | "suivi" | "entites";

const TABLEAUX: Record<TableauPilotage, { titre: string; fn: (p: Pilotage) => Cellule[][] }> = {
  vagues: { titre: "Chiffre remis en jeu, vague par vague", fn: tableauVagues },
  taux: { titre: "Taux de réponse comparés", fn: tableauTaux },
  suivi: { titre: "Tableau de suivi", fn: tableauSuivi },
  entites: { titre: "Résultats par entité, par site et en consolidé", fn: tableauEntites },
};

export function exporterTableau(p: Pilotage, quoi: TableauPilotage, jour: string) {
  telecharger(`offload-${quoi}-${jour}.csv`, TABLEAUX[quoi].fn(p));
}

/** L'arrêté complet : les quatre tableaux à la suite, chacun sous son titre. */
export function exporterArrete(p: Pilotage, jour: string) {
  const l: Cellule[][] = [[`OFFLOAD — arrêté du ${jour}`], [`Période depuis le ${p.depuis}`]];
  for (const cle of Object.keys(TABLEAUX) as TableauPilotage[]) l.push([], [TABLEAUX[cle].titre], ...TABLEAUX[cle].fn(p));
  telecharger(`offload-arrete-${jour}.csv`, l);
}
