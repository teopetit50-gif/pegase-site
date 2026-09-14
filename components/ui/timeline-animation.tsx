"use client";

import { motion, useInView, useReducedMotion, type Variants } from "motion/react";
import type { CSSProperties, ReactNode, RefObject } from "react";

/* ══════════════════════════════════════════════════════════════════════
   timeline-animation — TimelineContent (14/09/2026)

   La dépendance de `pricing-section-3` (ui-layouts) que le composant
   importe sans la livrer. Un bloc qui ENTRE quand un conteneur de
   référence (`timelineRef`) est dans la fenêtre, avec un retard
   proportionnel à son rang (`animationNum`) : c'est la cascade floutée
   de la grille de /tarifs — chapô, sélecteur, cadre, puis chaque carte.

   Deux choix qui ne sont pas dans l'original :
   · `once` vaut true : un bloc entré reste entré. Sinon il repart à zéro
     dès que la section quitte l'écran et rejoue à chaque retour ;
   · prefers-reduced-motion : aucune entrée, le bloc naît visible — la
     règle de toutes les couches motion du site (PageMotion, Arrivee).
   ══════════════════════════════════════════════════════════════════════ */

type Balise = "div" | "p" | "section" | "article" | "span" | "ul" | "li" | "h2" | "h3";

const VARIANTES_PAR_DEFAUT: Variants = {
  visible: (i: number) => ({
    filter: "blur(0px)",
    y: 0,
    opacity: 1,
    transition: { delay: i * 0.5, duration: 0.5 },
  }),
  hidden: { filter: "blur(20px)", y: 0, opacity: 0 },
};

export function TimelineContent({
  children,
  animationNum,
  timelineRef,
  customVariants,
  className,
  as = "div",
  once = true,
  id,
  style,
}: {
  children: ReactNode;
  animationNum: number;
  timelineRef: RefObject<HTMLElement | null>;
  customVariants?: Variants;
  className?: string;
  as?: Balise;
  once?: boolean;
  id?: string;
  style?: CSSProperties;
}) {
  const enVue = useInView(timelineRef, { once });
  const reduit = useReducedMotion();
  const M = motion[as];

  if (reduit) {
    return (
      <M id={id} style={style} className={className}>
        {children}
      </M>
    );
  }

  return (
    <M
      id={id}
      style={style}
      className={className}
      initial="hidden"
      animate={enVue ? "visible" : "hidden"}
      custom={animationNum}
      variants={customVariants ?? VARIANTES_PAR_DEFAUT}
    >
      {children}
    </M>
  );
}
