"use client";

/* ══════════════════════════════════════════════════════════════════════
   L'horloge de l'espace client : celle du navigateur, jamais celle du
   serveur (21/10/2026)

   Le serveur (Vercel) tourne en UTC, le visiteur est en Guadeloupe
   (UTC−4). Une heure, un « Hier », un « aujourd'hui » écrits par le
   serveur ne sont pas ceux que le navigateur recalcule à l'hydratation,
   et React jette alors tout l'arbre (erreur #418, vue en production sur
   /espace2). La règle : rien de ce qui dépend de l'heure, du jour ou du
   fuseau du visiteur n'est rendu avant le montage. Au rendu serveur et
   pendant l'hydratation, ces crochets répondent `null` des deux côtés —
   l'écran montre son squelette, exactement comme en attendant la base
   réelle — puis le navigateur rend la page avec sa propre horloge, dans
   une seconde passe synchrone, avant la première peinture qui suit
   l'hydratation.

   Les dates calendaires (AAAA-MM-JJ), elles, se formatent en UTC dans
   components/espace/format.ts : « 2026-10-16 » se lit 16/10/2026 partout,
   et non la veille au soir à l'ouest de Greenwich.
   ══════════════════════════════════════════════════════════════════════ */

import { useState, useSyncExternalStore } from "react";
import { minuit } from "./filed/calculs";

const rien = () => () => {};
const vrai = () => true;
const faux = () => false;

/** Vrai une fois la page montée dans le navigateur ; faux au rendu serveur et pendant l'hydratation. */
export function useMonte(): boolean {
  return useSyncExternalStore(rien, vrai, faux);
}

/** Minuit local d'aujourd'hui, en millisecondes — null tant que la page n'est pas montée. */
export function useAujourdhui(): number | null {
  const [t] = useState(minuit);
  return useMonte() ? t : null;
}

/** L'instant d'arrivée sur la page, en millisecondes — null tant que la page n'est pas montée. */
export function useMaintenant(): number | null {
  const [t] = useState(Date.now);
  return useMonte() ? t : null;
}
