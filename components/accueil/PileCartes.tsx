"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "motion/react";

/* ══════════════════════════════════════════════════════════════════════
   La pile de cartes du catalogue — empilement au défilement (11/09/2026)

   ORIGINE. `cards-stack` de @youcefbnm (21st.dev, MIT) —
   https://21st.dev/@youcefbnm/components/cards-stack, code pris sur
   `21st.dev/r/youcefbnm/cards-stack`. Deux primitives et rien d'autre :
   un conteneur qui pose une perspective, et une carte `position: sticky`
   dont le `top` et le `z` augmentent avec son rang. Les cartes se
   rattrapent donc les unes les autres et s'empilent en biseau, la
   suivante recouvrant la précédente sans la faire disparaître.

   POURQUOI ICI. Le catalogue rendait les quatre systèmes en une grille de
   quatre colonnes de 285 px. À cette largeur, chaque carte n'avait de
   place que pour un intitulé et deux lignes — quatre vignettes qu'on
   balaie sans en lire aucune. Empilées, elles passent en pleine largeur :
   chacune occupe le centre de l'écran à son tour, et le visiteur en voit
   une à la fois. C'est le rôle de carrefour de cette page — présenter les
   quatre produits en catalogue, pas les argumenter — et un catalogue se
   feuillette.

   CE QUI EST JETÉ. Son `cn()` de shadcn : ce dépôt n'a pas de
   `lib/utils`, la classe est concaténée à la main comme partout ailleurs.
   Rien d'autre — le composant d'origine ne porte aucun habillage, c'est
   sa qualité.

   ÉCART ASSUMÉ. `layout="position"` de la source est conservé mais ne
   sert que si les cartes changent d'ordre ; ici elles n'en changent
   jamais. Il est gardé pour ne pas diverger de l'original sans raison, et
   parce qu'il ne coûte rien tant qu'aucun `layoutId` n'est posé.

   Deux contraintes à respecter à l'usage, sinon l'effet ne se voit pas :
   · aucun parent entre `ContainerScroll` et les cartes ne doit porter
     `overflow: hidden` — `position: sticky` y meurt sans un bruit ;
   · l'empilement suppose que chaque carte soit plus courte que la
     fenêtre, sinon la suivante arrive avant qu'on ait fini de lire.
   ══════════════════════════════════════════════════════════════════════ */

type CarteCollanteProps = HTMLMotionProps<"div"> & {
  index: number;
  /* écart ajouté par la source entre deux cartes de la pile */
  decalageY?: number;
  decalageZ?: number;
  /* AJOUT au composant d'origine : la hauteur à laquelle la première carte
     s'arrête. La source fige le `top` de la carte 0 à 0, donc la pile se
     colle sous le bord haut de la fenêtre — or ce site a un en-tête fixe,
     et la première carte passait dessous. */
  debutY?: number;
};

export const ContainerScroll = React.forwardRef<
  HTMLDivElement,
  React.HTMLProps<HTMLDivElement>
>(({ children, className, style, ...props }, ref) => (
  <div
    ref={ref}
    className={["relative w-full", className].filter(Boolean).join(" ")}
    style={{ perspective: "1000px", ...style }}
    {...props}
  >
    {children}
  </div>
));
ContainerScroll.displayName = "ContainerScroll";

export const CarteCollante = React.forwardRef<HTMLDivElement, CarteCollanteProps>(
  (
    {
      index,
      decalageY = 10,
      decalageZ = 10,
      debutY = 0,
      children,
      className,
      style,
      ...props
    },
    ref,
  ) => (
    <motion.div
      ref={ref}
      layout="position"
      style={{
        top: debutY + index * decalageY,
        z: index * decalageZ,
        backfaceVisibility: "hidden",
        ...style,
      }}
      className={["sticky", className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </motion.div>
  ),
);
CarteCollante.displayName = "CarteCollante";
