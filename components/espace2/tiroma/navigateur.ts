"use client";

/* ══════════════════════════════════════════════════════════════════════
   TIROMA — les utilités côté navigateur des boutons de la référence
   (02/11/2026, décision de Teo : « trouve une utilité aux boutons »)

   Quand un bouton des pages copiées (étoile, cloche, Snooze, case à
   cocher, « Copy as prompt », téléchargement…) n'a pas de geste en base
   derrière lui, il agit ici, dans ce navigateur, sans rien écrire en base
   (portes inchangées) :
     · espace2:favoris:tiroma  — épinglés, en tête d'Aujourd'hui ;
     · espace2:suivis:tiroma   — patients suivis, en tête de Créneaux et appels ;
     · espace2:reportes:tiroma — éléments reportés jusqu'à une date ;
     · espace2:notes:tiroma    — notes de ce poste sur un fil ;
     · espace2:assignes:tiroma — qui appelle, par fil ;
     · espace2:liens:tiroma    — plans liés à un fil ;
     · espace2:vues:tiroma     — filtres enregistrés de Fauteuils.
   Le presse-papier et l'export CSV servent « Copy as prompt » et les
   boutons de téléchargement.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useMemo } from "react";
import { ecrireStockage, useStockage } from "../Collection";

export const CLES = {
  favoris: "espace2:favoris:tiroma",
  suivis: "espace2:suivis:tiroma",
  reportes: "espace2:reportes:tiroma",
  notes: "espace2:notes:tiroma",
  assignes: "espace2:assignes:tiroma",
  liens: "espace2:liens:tiroma",
  vues: "espace2:vues:tiroma",
} as const;

function lire<T>(brut: string | null, defaut: T): T {
  if (!brut) return defaut;
  try {
    return JSON.parse(brut) as T;
  } catch {
    return defaut;
  }
}

/* un objet { clé → valeur } gardé dans le localStorage, relu à chaque changement */
export function useTable<V>(cle: string): [Record<string, V>, (k: string, v: V | null) => void] {
  const brut = useStockage(cle);
  const table = useMemo(() => lire<Record<string, V>>(brut, {}), [brut]);
  const poser = useCallback(
    (k: string, v: V | null) => {
      const t = { ...lire<Record<string, V>>(typeof window === "undefined" ? null : localStorage.getItem(cle), {}) };
      if (v === null) delete t[k];
      else t[k] = v;
      ecrireStockage(cle, JSON.stringify(t));
    },
    [cle],
  );
  return [table, poser];
}

export type Favori = { titre: string; href: string; type: string; depuis: string };
export const useFavoris = () => useTable<Favori>(CLES.favoris);
/* patient_id → nom */
export const useSuivis = () => useTable<string>(CLES.suivis);
/* clé de l'élément → date ISO (AAAA-MM-JJ) jusqu'à laquelle il est masqué */
export const useReportes = () => useTable<string>(CLES.reportes);
export const useNotes = () => useTable<{ texte: string; le: string }[]>(CLES.notes);
export const useAssignes = () => useTable<string>(CLES.assignes);
export const useLiens = () => useTable<{ libelle: string; href: string }[]>(CLES.liens);
export type VueEnregistree = { nom: string; href: string };
export const useVues = () => useTable<VueEnregistree>(CLES.vues);

export function aujourdHuiISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function dansJours(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const estReporte = (reportes: Record<string, string>, cle: string) => !!reportes[cle] && reportes[cle] > aujourdHuiISO();

export async function copier(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    try {
      const zone = document.createElement("textarea");
      zone.value = texte;
      document.body.appendChild(zone);
      zone.select();
      const ok = document.execCommand("copy");
      zone.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/* CSV au point-virgule (Excel en français), BOM UTF-8, guillemets doublés */
export function exporterCSV(nom: string, entetes: string[], lignes: (string | number | null | undefined)[][]) {
  const cellule = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const texte = "﻿" + [entetes, ...lignes].map((l) => l.map(cellule).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([texte], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nom}-${aujourdHuiISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
