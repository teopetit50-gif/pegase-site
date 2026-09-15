"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le monde de /tarifs, remonté d'un cran (15/09/2026)

   POURQUOI CE FICHIER EXISTE. Le sélecteur « Indépendants et PME |
   Groupes et multi-sites » est né le 15/09 DANS components/tarifs/Grille,
   avec son état. La grille bascule donc entièrement, mais les sections
   qui la suivent — Chèque TIC, appel final — n'en savaient rien : elles
   continuaient de dire « Réserver un audit » sous une grille qui venait
   d'annoncer « Réserver un diagnostic ». Rien n'était cassé (les deux
   boutons mènent à la même page), c'était un écart de vocabulaire sur un
   même écran, devenu visible quand /commencer a commencé à envoyer les
   organisations sur /tarifs?monde=structure au lieu de sauter à l'audit.

   LA CONTRAINTE QU'IL NE FAUT PAS DÉFAIRE — LA PAGE RESTE STATIQUE. Le
   monde se lit par useSyncExternalStore et NON par useSearchParams :
     · `serveur()` répond toujours « pme », donc le HTML servi est celui
       des indépendants — prix dans le fichier, pas de bascule client
       jusqu'à un Suspense, pas de rendu dynamique de la route ;
     · `client()` lit l'URL au premier rendu du navigateur, ce qui rend
       /tarifs?monde=structure partageable ;
     · l'instantané serveur et le premier instantané client peuvent
       différer sans divergence d'hydratation : React rend d'abord le
       premier, puis passe au second — c'est le contrat du hook, et c'est
       déjà ce que fait la périodicité depuis le 03/09.

   POURQUOI UN CONTEXTE ET PAS UN MODULE GLOBAL. L'état doit vivre aussi
   longtemps que la page, pas plus : une variable de module garderait
   « structure » après un aller-retour vers une autre page, et le visiteur
   reviendrait sur un HTML « pme » qui basculerait sous ses yeux. Le
   provider est monté par app/tarifs/page.tsx, qui reste un composant
   SERVEUR — les sections lui sont passées en `children`, il ne les rend
   pas lui-même.
   ══════════════════════════════════════════════════════════════════════ */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { lireMonde, type Monde } from "@/lib/paliers";

/* ——— l'URL, comme source de départ ———
   `popstate` suffit : rien n'écrit le paramètre, il ne peut changer que
   par une navigation. La périodicité s'abonne à la même chose (Grille). */
export function souscrireUrl(rappel: () => void) {
  window.addEventListener("popstate", rappel);
  return () => window.removeEventListener("popstate", rappel);
}
function mondeDeLUrl(): Monde {
  return lireMonde(new URLSearchParams(window.location.search).get("monde"));
}
function mondeServeur(): Monde {
  return "pme";
}

const Contexte = createContext<{ monde: Monde; choisir: (m: Monde) => void }>({
  monde: "pme",
  choisir: () => {},
});

export function MondeProvider({ children }: { children: ReactNode }) {
  const mondeUrl = useSyncExternalStore(souscrireUrl, mondeDeLUrl, mondeServeur);
  /* le clic du visiteur prend le dessus sur l'URL, jamais l'inverse */
  const [choix, setChoix] = useState<Monde | null>(null);
  const choisir = useCallback((m: Monde) => setChoix(m), []);
  const valeur = useMemo(
    () => ({ monde: choix ?? mondeUrl, choisir }),
    [choix, mondeUrl, choisir],
  );
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

/* Le monde courant. Hors provider — une section de /tarifs reprise
   ailleurs — il vaut « pme » : la valeur par défaut du contexte est la
   même que l'instantané serveur, donc une reprise hors page rend
   exactement ce que le HTML de /tarifs rendait avant ce fichier. */
export function useMonde(): Monde {
  return useContext(Contexte).monde;
}

export function useChoisirMonde(): (m: Monde) => void {
  return useContext(Contexte).choisir;
}
