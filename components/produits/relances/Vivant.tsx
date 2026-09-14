"use client";

import { useSyncExternalStore } from "react";

/* Rapatrié de `OMEGA/cashd-site/components/Vivant.tsx`, réduit à ce que
   l'arbre de la page utilise encore : `useCadence` animait les vignettes
   dessinées à la main, que les composants 21st.dev ont remplacées. */

/** Lit une media query sans `setState` dans un effet : React s'abonne
 *  lui-même à la source externe. */
export function useMedia(requete: string) {
  return useSyncExternalStore(
    (prevenir) => {
      const mq = window.matchMedia(requete);
      mq.addEventListener("change", prevenir);
      return () => mq.removeEventListener("change", prevenir);
    },
    () => window.matchMedia(requete).matches,
    () => false, // au rendu serveur : on suppose le mouvement autorisé
  );
}

export function useMouvementReduit() {
  return useMedia("(prefers-reduced-motion: reduce)");
}
