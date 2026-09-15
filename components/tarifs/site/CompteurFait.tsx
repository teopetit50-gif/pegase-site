"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "motion/react";

/* ══════════════════════════════════════════════════════════════════════
   <CompteurFait> — le nombre qui se compte, pour le premier fait (14/09/2026)

   ORIGINE. « Number Ticker » de Magic UI (magicui/number-ticker) : un
   `<span>` dont le texte est réécrit à chaque image par un ressort de
   motion/react (`useMotionValue` → `useSpring`, damping 60, stiffness 100)
   quand `useInView` voit l'élément entrer dans la fenêtre — une fois.

   POURQUOI ICI. « 21 modèles » est le seul fait chiffré de la bande ; le
   voir se compter jusqu'à 21 dit « nous les avons comptés » là où un
   nombre posé se lit comme un slogan. Rien d'autre ne bouge.

   CE QUI EST JETÉ de la source, et pourquoi :
   1. Le rendu serveur à `startValue` (0) : sans JavaScript, ou le temps de
      l'hydratation, la page aurait affiché « 0 modèles ». Le serveur rend
      la valeur FINALE ; le ressort part de 0 et ne repart que lorsque la
      cellule entre dans la fenêtre — le texte saute alors à 0 et remonte.
   2. `Intl.NumberFormat("en-US")` : le séparateur de milliers de la
      locale peut différer entre Node et le navigateur (U+202F / U+00A0),
      ce qui fait un écart d'hydratation ; `formate` écrit lui-même le
      groupement français. Sans effet sur 21, mais le composant reste
      juste au-delà de 999.
   3. `cn()` de `@/lib/utils`, `tracking-wider`, `text-black dark:text-white`,
      `...props` sur le span : le style vit dans FaitsSite.css (`.fs-compteur`),
      pas de `dark:` dans ce monde, aucune prop de passage.
   4. `direction: "down"`, `startValue`, `delay`, `decimalPlaces` : un seul
      usage, une seule direction, des entiers — les props sont réduites à
      la valeur et au mot qui la suit.
   5. `margin: "0px"` de `useInView` : remplacé par « 0px 0px -12% 0px »,
      la ligne à 88 % de la fenêtre où PageMotion déclenche les
      `[data-reveal]` — le compte démarre avec l'apparition de la cellule,
      pas avant elle.

   ÉCARTS ASSUMÉS.
   · prefers-reduced-motion : lu par `matchMedia` DANS l'effet, au moment
     d'entrer dans la fenêtre — jamais au rendu (pas d'écart d'hydratation).
     En mouvement réduit, rien n'est lancé : le « 21 » du serveur reste.
   · La valeur finale reste lisible : le span animé est `aria-hidden`, un
     jumeau `sr-only` porte le nombre pour les lecteurs d'écran, et
     `data-final` sert de fantôme de largeur à la feuille (voir
     `.fs-compteur` dans FaitsSite.css) pour que le mot suivant ne bouge
     pas pendant le compte.
   · Le suffixe est séparé du nombre par une espace ordinaire et non une
     insécable : à 390 px la cellule fait ~160 px et « 21 modèles » à 28 px
     en occupe ~150 — si la police rend plus large que prévu, le mot doit
     pouvoir passer à la ligne plutôt que déborder de la cellule.
   ══════════════════════════════════════════════════════════════════════ */

/* groupement français des milliers (espace fine insécable), déterministe
   des deux côtés — « 21 » reste « 21 » */
function formate(n: number): string {
  const entier = String(Math.max(0, Math.round(n)));
  return entier.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export default function CompteurFait({
  valeur,
  suffixe,
}: {
  /** la valeur finale, entière — rendue telle quelle côté serveur */
  valeur: number;
  /** le mot qui suit le nombre (« modèles ») ; rien si absent */
  suffixe?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const source = useMotionValue(0);
  /* 14/09, recette : avec le réglage de la source (damping 60, stiffness 100)
     le compte mettait 3,5 s à atteindre 21 — mesuré à 12 après 500 ms, 17 à
     1 s, 20 à 2 s. Trois secondes et demie d'un nombre qui grimpe dans une
     bande qui doit se lire d'un coup, c'est un tic, pas un geste. Raidi pour
     finir en ~1,2 s ; damping 30 reste au-dessus de l'amortissement critique
     de ce ressort (2·√180 ≈ 26,8), donc il ne dépasse jamais la valeur —
     l'argent et les comptes ne rebondissent pas. `restDelta` coupe la traîne
     finale, sinon le ressort passe une demi-seconde entre 20,6 et 21. */
  const ressort = useSpring(source, { damping: 30, stiffness: 180, restDelta: 0.25 });
  const visible = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });

  /* à l'entrée dans la fenêtre : on lâche le ressort vers la valeur —
     sauf en mouvement réduit, où le texte du serveur reste en place */
  useEffect(() => {
    if (!visible) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    source.set(valeur);
  }, [visible, source, valeur]);

  /* le ressort écrit le texte lui-même, hors du rendu React */
  useEffect(
    () =>
      ressort.on("change", (courant) => {
        if (ref.current) ref.current.textContent = formate(courant);
      }),
    [ressort]
  );

  const texte = formate(valeur);
  return (
    <>
      <span className="fs-compteur" data-final={texte}>
        <span ref={ref} aria-hidden="true">
          {texte}
        </span>
        <span className="sr-only">{texte}</span>
      </span>
      {suffixe ? ` ${suffixe}` : null}
    </>
  );
}
