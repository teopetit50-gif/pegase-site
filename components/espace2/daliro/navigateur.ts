"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO — les utilités côté navigateur des boutons de la référence qui
   n'ont pas de geste en base (02/11/2026, décision de Teo : « trouve une
   utilité aux boutons »). Même sens dans les six métiers de l'espace 2 :

     Épingler (étoile)   l'objet remonte en tête de la vue d'ensemble,
                         section « Épinglés » — espace2:favoris:daliro
     Suivre (cloche)     les nouveaux messages de l'objet passent en tête
                         d'À ranger, marqués « suivi » — espace2:suivis:daliro
     Reporter (Snooze)   l'élément quitte la liste jusqu'à la date choisie
                         — espace2:reportes:daliro
     Exporter            la liste affichée en CSV (filtres compris)
     Copier              un résumé en clair dans le presse-papier

   Rien n'est envoyé au serveur ; tout vaut pour ce navigateur.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useSyncExternalStore } from "react";

export type Objet = { type: string; id: string; titre: string; href: string };
export type Report = { type: string; id: string; jusqu: string };

const CLES = {
  favoris: "espace2:favoris:daliro",
  suivis: "espace2:suivis:daliro",
  reportes: "espace2:reportes:daliro",
} as const;
type Cle = (typeof CLES)[keyof typeof CLES];

const VIDE = "[]";
const lire = (cle: Cle): string => {
  try {
    return localStorage.getItem(cle) ?? VIDE;
  } catch {
    return VIDE;
  }
};
const ecrire = (cle: Cle, valeur: unknown) => {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    /* stockage indisponible : le geste vaut pour cette visite seulement */
  }
  window.dispatchEvent(new Event(cle));
};
const abonner = (cle: Cle) => (cb: () => void) => {
  const surStockage = (e: StorageEvent) => e.key === cle && cb();
  window.addEventListener(cle, cb);
  window.addEventListener("storage", surStockage);
  return () => {
    window.removeEventListener(cle, cb);
    window.removeEventListener("storage", surStockage);
  };
};
const abonnements = { favoris: abonner(CLES.favoris), suivis: abonner(CLES.suivis), reportes: abonner(CLES.reportes) };
const parse = <T,>(texte: string): T[] => {
  try {
    const v = JSON.parse(texte) as unknown;
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
};
const memo = new Map<string, unknown[]>();
const parseMemo = <T,>(texte: string): T[] => {
  if (!memo.has(texte)) memo.set(texte, parse<T>(texte));
  return memo.get(texte) as T[];
};
const meme = (a: { type: string; id: string }, b: { type: string; id: string }) => a.type === b.type && a.id === b.id;

/* ——— Épingler ——— */
export function useFavoris() {
  const texte = useSyncExternalStore(abonnements.favoris, () => lire(CLES.favoris), () => VIDE);
  const liste = parseMemo<Objet>(texte);
  const estEpingle = useCallback((type: string, id: string) => liste.some((x) => meme(x, { type, id })), [liste]);
  const basculer = useCallback(
    (o: Objet) => {
      const actuels = parse<Objet>(lire(CLES.favoris));
      ecrire(CLES.favoris, actuels.some((x) => meme(x, o)) ? actuels.filter((x) => !meme(x, o)) : [o, ...actuels]);
    },
    [],
  );
  return { favoris: liste, estEpingle, basculer };
}

/* ——— Suivre ——— */
export function useSuivis() {
  const texte = useSyncExternalStore(abonnements.suivis, () => lire(CLES.suivis), () => VIDE);
  const liste = parseMemo<Objet>(texte);
  const estSuivi = useCallback((type: string, id: string) => liste.some((x) => meme(x, { type, id })), [liste]);
  const basculer = useCallback(
    (o: Objet) => {
      const actuels = parse<Objet>(lire(CLES.suivis));
      ecrire(CLES.suivis, actuels.some((x) => meme(x, o)) ? actuels.filter((x) => !meme(x, o)) : [o, ...actuels]);
    },
    [],
  );
  return { suivis: liste, estSuivi, basculer };
}

/* ——— Reporter ——— */
const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
};
export function useReportes() {
  const texte = useSyncExternalStore(abonnements.reportes, () => lire(CLES.reportes), () => VIDE);
  const liste = parseMemo<Report>(texte);
  /* un report échu ne cache plus rien */
  const estReporte = useCallback((type: string, id: string) => liste.some((x) => meme(x, { type, id }) && x.jusqu > aujourdhui()), [liste]);
  const reporter = useCallback((type: string, id: string, jusqu: string) => {
    const actuels = parse<Report>(lire(CLES.reportes)).filter((x) => !meme(x, { type, id }) && x.jusqu > aujourdhui());
    ecrire(CLES.reportes, [...actuels, { type, id, jusqu }]);
  }, []);
  const annuler = useCallback((type: string, id: string) => {
    ecrire(CLES.reportes, parse<Report>(lire(CLES.reportes)).filter((x) => !meme(x, { type, id })));
  }, []);
  return { reportes: liste, estReporte, reporter, annuler };
}

/* ——— Exporter en CSV (séparateur « ; », BOM pour Excel en français) ——— */
export function exporterCsv(nom: string, entetes: string[], lignes: (string | number | null | undefined)[][]) {
  const cellule = (v: string | number | null | undefined) => {
    const t = v === null || v === undefined ? "" : String(v);
    return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const texte = "﻿" + [entetes, ...lignes].map((l) => l.map(cellule).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([texte], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nom}-${aujourdhui()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ——— Copier dans le presse-papier ——— */
export async function copier(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    return false;
  }
}
