"use client";

/* AnimatedList — repris du registre **Magic UI** (MIT),
 * `npx shadcn@latest add "https://magicui.design/r/animated-list.json"`,
 * moissonné dans `OMEGA/toyota-guadeloupe/bibliotheque`. Le composant est
 * gardé tel quel dans sa mécanique (un minuteur révèle les enfants un par un,
 * le plus récent en tête, ressort `spring` + `layout` pour le décalage) ;
 * seules les classes de conteneur sont passées par l'appelant.
 *
 * Pourquoi celui-là : la figure maison qu'il remplace (une barre de 24 h avec
 * des pastilles d'heures) montrait la même idée en beaucoup moins bien.
 * Ici, les demandes arrivent devant le visiteur, ce qui EST le sujet.
 */

import React, { useEffect, useMemo, useState, type ComponentPropsWithoutRef } from "react";
import { AnimatePresence, motion, type MotionProps } from "motion/react";
import { cn } from "../utils";

export function AnimatedListItem({ children }: { children: React.ReactNode }) {
  const animations: MotionProps = {
    initial: { scale: 0.96, opacity: 0 },
    animate: { scale: 1, opacity: 1, originY: 0 },
    exit: { scale: 0.96, opacity: 0 },
    transition: { type: "spring", stiffness: 350, damping: 40 },
  };

  return (
    <motion.div {...animations} layout className="mx-auto w-full">
      {children}
    </motion.div>
  );
}

export interface AnimatedListProps extends ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode;
  delay?: number;
  /** Boucler ou s'arrêter sur la pile complète. La démo du registre boucle à
   *  l'infini ; ici on s'arrête, parce que la pile finie est l'argument. */
  boucle?: boolean;
}

export const AnimatedList = React.memo(
  ({ children, className, delay = 1400, boucle = false, ...props }: AnimatedListProps) => {
    const [index, setIndex] = useState(0);
    const childrenArray = useMemo(() => React.Children.toArray(children), [children]);

    useEffect(() => {
      if (!boucle && index >= childrenArray.length - 1) return;
      const t = setTimeout(() => {
        setIndex((i) => (i + 1) % childrenArray.length);
      }, delay);
      return () => clearTimeout(t);
    }, [index, delay, childrenArray.length, boucle]);

    const itemsToShow = useMemo(
      () => childrenArray.slice(0, index + 1).reverse(),
      [index, childrenArray],
    );

    return (
      <div className={cn("flex flex-col items-center gap-3", className)} {...props}>
        <AnimatePresence>
          {itemsToShow.map((item) => (
            <AnimatedListItem key={(item as React.ReactElement).key}>{item}</AnimatedListItem>
          ))}
        </AnimatePresence>
      </div>
    );
  },
);

AnimatedList.displayName = "AnimatedList";
