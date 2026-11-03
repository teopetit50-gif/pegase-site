"use client";

/* ══════════════════════════════════════════════════════════════════════
   LORANI — ce que les boutons de la référence gardent dans le navigateur
   (02/11/2026, décision de Teo : « trouve une utilité aux boutons »)

   Les boutons de Linear et d'Attio sans geste du métier derrière font une
   chose réelle, côté navigateur, sans toucher à la base (portes inchangées,
   aucune migration) ; même sens dans les six métiers de l'espace 2 :

     espace2:favoris:lorani   l'étoile « Add to favorites » → Épingler :
                              l'objet remonte en tête de la vue d'ensemble
                              (section « Épinglés ») ; liste de clés
     espace2:suivis:lorani    la cloche / Subscribe → Suivre : les courriers
                              de l'objet passent en tête du Courrier, marqués
                              « suivi » ; liste de clés
     espace2:reportes:lorani  Snooze → Reporter : l'élément quitte sa liste
                              jusqu'à la date choisie ; clé → date ISO

   Une clé dit la sorte d'objet : « permis:<id> », « projet:<id> »,
   « honoraire:<id> », « courrier:<clé de la ligne> ».
   Rien de tout cela n'est partagé entre appareils ni entre membres : c'est
   écrit sous les boutons (title) qui le posent.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useSyncExternalStore } from "react";

export type Sorte = "favoris" | "suivis" | "reportes";
const cle = (s: Sorte) => `espace2:${s}:lorani`;
const EVENEMENT = "espace2:lorani:local";

/* lecture tolérante : un navigateur sans stockage (navigation privée, données bloquées) rend une liste vide */
function lire(s: Sorte): string {
  try {
    return window.localStorage.getItem(cle(s)) ?? "";
  } catch {
    return "";
  }
}
function ecrire(s: Sorte, valeur: unknown) {
  try {
    window.localStorage.setItem(cle(s), JSON.stringify(valeur));
  } catch {
    /* stockage refusé : le geste reste sans effet durable, la page le dit au survol */
  }
  window.dispatchEvent(new Event(EVENEMENT));
}
function abonner(rappel: () => void) {
  window.addEventListener("storage", rappel);
  window.addEventListener(EVENEMENT, rappel);
  return () => {
    window.removeEventListener("storage", rappel);
    window.removeEventListener(EVENEMENT, rappel);
  };
}

/* le texte brut est l'instantané (stable entre deux rendus) ; il est lu ensuite */
const texteDe = (s: Sorte) => () => lire(s);
const rienCote = () => "";
function liste(brut: string): string[] {
  try {
    const v = JSON.parse(brut || "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function table(brut: string): Record<string, string> {
  try {
    const v = JSON.parse(brut || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/* épingles ou suivis : l'ensemble des clés et la bascule */
export function useMarques(s: "favoris" | "suivis") {
  const brut = useSyncExternalStore(abonner, texteDe(s), rienCote);
  const cles = liste(brut);
  const basculer = useCallback(
    (k: string) => {
      const l = liste(lire(s));
      ecrire(s, l.includes(k) ? l.filter((x) => x !== k) : [k, ...l]);
    },
    [s],
  );
  const poser = useCallback(
    (ks: string[], oui: boolean) => {
      const l = liste(lire(s)).filter((x) => !ks.includes(x));
      ecrire(s, oui ? [...ks, ...l] : l);
    },
    [s],
  );
  return { cles, a: (k: string) => cles.includes(k), basculer, poser };
}

/* reports : clé → date ISO (AAAA-MM-JJ) ; un report passé ne cache plus rien */
export function useReports() {
  const brut = useSyncExternalStore(abonner, texteDe("reportes"), rienCote);
  const t = table(brut);
  const auj = new Date().toISOString().slice(0, 10);
  const jusqua = (k: string) => (t[k] && t[k] > auj ? t[k] : null);
  const reporter = useCallback((k: string, date: string | null) => {
    const m = table(lire("reportes"));
    if (date) m[k] = date;
    else delete m[k];
    ecrire("reportes", m);
  }, []);
  return { jusqua, reporter, nombre: Object.values(t).filter((d) => d > auj).length };
}

/* effacer ce que le navigateur garde pour des clés données (Réglages, « Danger zone ») */
export function oublier(cles: string[]) {
  for (const s of ["favoris", "suivis"] as const) ecrire(s, liste(lire(s)).filter((k) => !cles.includes(k)));
  const m = table(lire("reportes"));
  for (const k of cles) delete m[k];
  ecrire("reportes", m);
}

/* les dates proposées par « Reporter » (Snooze de Linear : demain, la semaine prochaine, un mois) */
export function datesReport(): { cle: string; libelle: string; date: string }[] {
  const d = (n: number) => {
    const x = new Date();
    x.setDate(x.getDate() + n);
    return x.toISOString().slice(0, 10);
  };
  const lundi = (() => {
    const x = new Date();
    const n = ((8 - x.getDay()) % 7) || 7;
    x.setDate(x.getDate() + n);
    return x.toISOString().slice(0, 10);
  })();
  return [
    { cle: "demain", libelle: "Demain", date: d(1) },
    { cle: "trois", libelle: "Dans trois jours", date: d(3) },
    { cle: "lundi", libelle: "Lundi prochain", date: lundi },
    { cle: "mois", libelle: "Dans un mois", date: d(30) },
  ];
}

/* ——— export CSV des lignes affichées (séparateur « ; » et BOM : Excel en français l'ouvre tel quel) ——— */
export function exporterCsv(nom: string, entetes: string[], lignes: (string | number | null | undefined)[][]) {
  const cellule = (v: string | number | null | undefined) => {
    const t = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const texte = [entetes, ...lignes].map((l) => l.map(cellule).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`﻿${texte}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom.endsWith(".csv") ? nom : `${nom}.csv`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ——— presse-papier ——— */
export async function copier(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    return false;
  }
}

/* ——— « Add calculation » d'Attio : somme, moyenne ou décompte d'une colonne sur les lignes affichées ——— */
export type Calcul = "aucun" | "somme" | "moyenne" | "decompte";
export function calculer(c: Calcul, valeurs: (number | null)[]): number | null {
  const nombres = valeurs.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (c === "decompte") return nombres.length;
  if (!nombres.length) return null;
  const somme = nombres.reduce((s, v) => s + v, 0);
  return c === "somme" ? somme : c === "moyenne" ? somme / nombres.length : null;
}
export const LIBELLES_CALCUL: Record<Calcul, string> = { aucun: "Aucun calcul", somme: "Somme", moyenne: "Moyenne", decompte: "Décompte" };
