"use client";

/* MON ESPACE — les épinglés de la vue d'ensemble (l'étoile de Linear), propres à ce
   navigateur, sous leur propre clé : ceux de DALIRO (../daliro/navigateur) restent à DALIRO. */

import { useCallback, useSyncExternalStore } from "react";

export type Objet = { type: string; id: string; titre: string; href: string };
const CLE = "espace2:favoris:teo";
const VIDE = "[]";
const lire = () => {
  try {
    return localStorage.getItem(CLE) ?? VIDE;
  } catch {
    return VIDE;
  }
};
const ecrire = (v: Objet[]) => {
  try {
    localStorage.setItem(CLE, JSON.stringify(v));
  } catch {
    /* stockage indisponible : le geste vaut pour cette visite */
  }
  window.dispatchEvent(new Event(CLE));
};
const abonner = (cb: () => void) => {
  const surStockage = (e: StorageEvent) => e.key === CLE && cb();
  window.addEventListener(CLE, cb);
  window.addEventListener("storage", surStockage);
  return () => {
    window.removeEventListener(CLE, cb);
    window.removeEventListener("storage", surStockage);
  };
};
const memo = new Map<string, Objet[]>();
const parse = (t: string): Objet[] => {
  if (!memo.has(t)) {
    try {
      const v = JSON.parse(t) as unknown;
      memo.set(t, Array.isArray(v) ? (v as Objet[]) : []);
    } catch {
      memo.set(t, []);
    }
  }
  return memo.get(t)!;
};
const meme = (a: { type: string; id: string }, b: { type: string; id: string }) => a.type === b.type && a.id === b.id;

export function useFavorisTeo() {
  const texte = useSyncExternalStore(abonner, lire, () => VIDE);
  const favoris = parse(texte);
  const estEpingle = useCallback((type: string, id: string) => favoris.some((x) => meme(x, { type, id })), [favoris]);
  const basculer = useCallback((o: Objet) => {
    const actuels = parse(lire());
    ecrire(actuels.some((x) => meme(x, o)) ? actuels.filter((x) => !meme(x, o)) : [o, ...actuels]);
  }, []);
  return { favoris, estEpingle, basculer };
}

/* ——— les dates, partout dans Mon espace ——— */
export const aujourdhuiIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
};
/* le jour local d'une date ISO (« 2026-11-11 ») */
export const jourLocal = (iso: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
};
export const heureLocale = (iso: string) => {
  const d = new Date(iso);
  return `${`${d.getHours()}`.padStart(2, "0")}:${`${d.getMinutes()}`.padStart(2, "0")}`;
};
export const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m.charAt(0).toUpperCase())
    .join("") || "?";
/* « +590690123456 » / « 590690123456 » → « +590 690 12 34 56 » (Antilles), « 0612… » pour la métropole */
export function telephoneLisible(v: string): string {
  const n = v.replace(/[^\d+]/g, "");
  const m = /^\+?590(\d{3})(\d{2})(\d{2})(\d{2})$/.exec(n);
  if (m) return `+590 ${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
  const f = /^(?:\+33|0)(\d{9})$/.exec(n);
  if (f) return `0${f[1]}`.replace(/(\d{2})(?=\d)/g, "$1 ");
  return v;
}
export const lienWa = (numero: string, texte?: string) => `https://wa.me/${numero.replace(/[^\d]/g, "")}${texte ? `?text=${encodeURIComponent(texte)}` : ""}`;
