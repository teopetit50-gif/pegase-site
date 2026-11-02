"use client";

/* ══════════════════════════════════════════════════════════════════════
   VARELO — ce que les boutons de la référence gardent dans le navigateur
   (02/11/2026, décision de Teo : « trouve une utilité aux boutons »).
   Même sens dans les six métiers de l'espace 2 :
     · espace2:favoris:varelo  — l'étoile : un objet épinglé remonte en
       tête de « Ce matin », section « Épinglés » ;
     · espace2:suivis:varelo   — la cloche / Subscribe : un élément suivi
       passe en tête de sa file, marqué « suivi » ;
   et les outils communs : export CSV des lignes affichées, copie dans le
   presse-papier (lien, résumé pour l'assistant), calculs sur les lignes.
   Rien ne part en base : portes inchangées, aucune migration.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useMemo } from "react";
import { ecrireStockage, useStockage } from "../Collection";

export type Epingle = { cle: string; libelle: string; href: string; genre: string };

function lire<T>(brut: string | null): T[] {
  if (!brut) return [];
  try {
    const v = JSON.parse(brut);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

/* l'étoile : épingler un objet ou une page (Ce matin, section « Épinglés ») */
export function useFavoris() {
  const cle = "espace2:favoris:varelo";
  const brut = useStockage(cle);
  const liste = useMemo(() => lire<Epingle>(brut), [brut]);
  const estEpingle = useCallback((c: string) => liste.some((e) => e.cle === c), [liste]);
  const basculer = useCallback(
    (e: Epingle) => {
      const deja = liste.some((x) => x.cle === e.cle);
      ecrireStockage(cle, JSON.stringify(deja ? liste.filter((x) => x.cle !== e.cle) : [e, ...liste]));
      return !deja;
    },
    [liste],
  );
  /* épingler plusieurs objets d'un coup (actions groupées) */
  const ajouter = useCallback(
    (es: Epingle[]) => {
      const nouveaux = es.filter((e) => !liste.some((x) => x.cle === e.cle));
      ecrireStockage(cle, JSON.stringify([...nouveaux, ...liste]));
      return nouveaux.length;
    },
    [liste],
  );
  return { liste, estEpingle, basculer, ajouter };
}

/* la cloche : suivre un élément (il passe en tête de sa file, marqué « suivi ») */
export function useSuivis() {
  const cle = "espace2:suivis:varelo";
  const brut = useStockage(cle);
  const liste = useMemo(() => lire<string>(brut), [brut]);
  const estSuivi = useCallback((c: string) => liste.includes(c), [liste]);
  const basculer = useCallback(
    (c: string) => {
      const deja = liste.includes(c);
      ecrireStockage(cle, JSON.stringify(deja ? liste.filter((x) => x !== c) : [c, ...liste]));
      return !deja;
    },
    [liste],
  );
  return { liste, estSuivi, basculer };
}

/* une cellule CSV protégée contre l'injection tableur (comme l'export du référentiel) */
const cellule = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s0 = String(v);
  const s = /^[=+@\t\r]/.test(s0) || /^-[^0-9 ]/.test(s0) ? `'${s0}` : s0;
  return /[;"\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
};

/* télécharge les lignes affichées (filtres compris) en CSV ; rend le nombre de lignes */
export function exporterCsv(nom: string, entetes: string[], lignes: unknown[][]): number {
  const csv = [entetes.map(cellule).join(";"), ...lignes.map((l) => l.map(cellule).join(";"))].join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nom}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return lignes.length;
}

/* copie dans le presse-papier ; rend vrai si c'est fait */
export async function copier(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    return false;
  }
}
