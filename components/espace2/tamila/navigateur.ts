"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAMILA — l'utilité des boutons de la référence qui n'ont pas de geste
   en base (02/11/2026, décision de Teo : « trouve une utilité aux
   boutons »). Même sens pour les six métiers d'espace2 :
     Étoile        Épingler : l'objet remonte en tête de la vue d'ensemble,
                   section « Épinglés »   → espace2:favoris:tamila
     Cloche        Suivre : ses nouveaux événements passent en tête des
                   Arrivées, marqués « suivi » → espace2:suivis:tamila
     Snooze        Reporter jusqu'à une date → espace2:reportes:tamila
     Copy as prompt  Copier pour l'assistant (presse-papier)
     Export        la liste affichée en CSV, composé ici
   Tout reste dans ce navigateur (localStorage), rien ne part au serveur.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useSyncExternalStore } from "react";

const ecouteurs = new Set<() => void>();
const avertir = () => ecouteurs.forEach((f) => f());
const abonner = (f: () => void) => {
  ecouteurs.add(f);
  const stockage = (e: StorageEvent) => e.key?.startsWith("espace2:") && f();
  window.addEventListener("storage", stockage);
  return () => {
    ecouteurs.delete(f);
    window.removeEventListener("storage", stockage);
  };
};
const cache = new Map<string, { brut: string | null; valeur: Record<string, string> }>();
function lire(cle: string): Record<string, string> {
  let brut: string | null = null;
  try {
    brut = localStorage.getItem(cle);
  } catch {
    brut = null;
  }
  const c = cache.get(cle);
  if (c && c.brut === brut) return c.valeur;
  let valeur: Record<string, string> = {};
  try {
    const x = brut ? JSON.parse(brut) : {};
    valeur = Array.isArray(x) ? Object.fromEntries(x.map((k: string) => [k, new Date().toISOString()])) : x && typeof x === "object" ? x : {};
  } catch {
    valeur = {};
  }
  cache.set(cle, { brut, valeur });
  return valeur;
}
const VIDE: Record<string, string> = {};

/* une table clé → valeur gardée dans ce navigateur, partagée par toutes les pages ouvertes */
export function useMemoire(nom: "favoris" | "suivis" | "reportes") {
  const cle = `espace2:${nom}:tamila`;
  const valeur = useSyncExternalStore(abonner, () => lire(cle), () => VIDE);
  const poser = useCallback(
    (id: string, v: string | null) => {
      const n = { ...lire(cle) };
      if (v === null) delete n[id];
      else n[id] = v;
      try {
        localStorage.setItem(cle, JSON.stringify(n));
      } catch {
        /* stockage indisponible : le geste vaut pour la page */
      }
      avertir();
    },
    [cle],
  );
  const basculer = useCallback((id: string) => poser(id, lire(cle)[id] ? null : new Date().toISOString()), [cle, poser]);
  return { valeur, poser, basculer, a: (id: string) => !!valeur[id] };
}

/* reporté jusqu'à une date (AAAA-MM-JJ) : caché tant qu'elle n'est pas passée */
export const estReporte = (reportes: Record<string, string>, id: string) => !!reportes[id] && reportes[id] > new Date().toISOString().slice(0, 10);

export async function copier(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    return false;
  }
}

/* un CSV (séparateur « ; », BOM pour Excel), composé et téléchargé ici */
export function exporterCsv(nom: string, lignes: (string | number | null | undefined)[][]) {
  const champ = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "﻿" + lignes.map((r) => r.map(champ).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nom}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
