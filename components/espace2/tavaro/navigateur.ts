"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAVARO — l'utilité des boutons de la référence qui n'ont pas de geste
   en base (02/11/2026, décision de Teo : « trouve une utilité aux
   boutons » ; même sens dans les six métiers de l'espace 2).

   Tout reste dans le navigateur : rien n'est écrit en base, rien n'est
   envoyé.
     · Épingler (l'étoile de Linear) : l'objet remonte en tête de la vue
       d'ensemble, section « Épinglés » — localStorage espace2:favoris:tavaro ;
     · Suivre (la cloche) : ses éléments passent en tête de la boîte
       d'arrivée du métier, marqués « suivi » — espace2:suivis:tavaro ;
     · Reporter (Snooze) : l'élément quitte sa liste jusqu'à la date
       choisie — espace2:reportes:tavaro ;
     · Exporter (Import / Export) : la liste affichée en CSV, filtres compris ;
     · Copier pour l'assistant (Copy as prompt) : un résumé en clair dans
       le presse-papier.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useMemo } from "react";
import { ecrireStockage, useStockage } from "../Collection";

export type Repere = { cle: string; libelle: string; href: string; detail?: string };

const FAVORIS = "espace2:favoris:tavaro";
const SUIVIS = "espace2:suivis:tavaro";
const REPORTES = "espace2:reportes:tavaro";

function lireListe<T>(brut: string | null): T[] {
  if (!brut) return [];
  try {
    const v = JSON.parse(brut);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

/* une liste de repères gardée dans le navigateur ; `pret` est faux au rendu serveur */
function useListe(cle: string) {
  const brut = useStockage(cle);
  const liste = useMemo(() => lireListe<Repere>(brut), [brut]);
  const a = useCallback((c: string) => liste.some((x) => x.cle === c), [liste]);
  const basculer = useCallback(
    (r: Repere) => {
      const l = lireListe<Repere>(localStorage.getItem(cle));
      ecrireStockage(cle, JSON.stringify(l.some((x) => x.cle === r.cle) ? l.filter((x) => x.cle !== r.cle) : [r, ...l]));
    },
    [cle],
  );
  return { liste, a, basculer, pret: brut !== null };
}

export const useFavoris = () => useListe(FAVORIS);
export const useSuivis = () => useListe(SUIVIS);

/* Reporter : clé → date (AAAA-MM-JJ) ; un report échu s'efface tout seul de la lecture */
export function useReportes() {
  const brut = useStockage(REPORTES);
  const carte = useMemo(() => {
    try {
      const v = brut ? JSON.parse(brut) : {};
      return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, string>) : {};
    } catch {
      return {};
    }
  }, [brut]);
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const jusquA = useCallback((c: string) => (carte[c] && carte[c] > aujourdhui ? carte[c] : null), [carte, aujourdhui]);
  const reporter = useCallback((c: string, date: string | null) => {
    let v: Record<string, string> = {};
    try {
      v = JSON.parse(localStorage.getItem(REPORTES) ?? "{}") ?? {};
    } catch {}
    if (date) v[c] = date;
    else delete v[c];
    ecrireStockage(REPORTES, JSON.stringify(v));
  }, []);
  const nombre = Object.values(carte).filter((d) => d > aujourdhui).length;
  return { jusquA, reporter, nombre };
}

/* une date « dans n jours », pour les propositions de Reporter */
export const dansJours = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/* Exporter : un CSV au séparateur « ; » (Excel en français), BOM UTF-8 */
export function exporterCsv(nom: string, entetes: string[], lignes: (string | number | null | undefined)[][]) {
  const cellule = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const texte = "﻿" + [entetes, ...lignes].map((l) => l.map(cellule).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([texte], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nom}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* Copier pour l'assistant : le texte en clair, dans le presse-papier */
export async function copier(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    return false;
  }
}
