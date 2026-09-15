"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/cn";

/* ══════════════════════════════════════════════════════════════════════
   GridPatternCard — la carte à trame quadrillée + pastilles (21st.dev,
   « card-with-grid-ellipsis-pattern »), reprise le 15/09/2026.

   TROIS ADAPTATIONS, toutes obligatoires ici :

   1. LES JETONS shadcn N'EXISTENT PAS dans ce site. `bg-background`,
      `border-border`, `text-foreground` ne sont déclarés nulle part
      (`@theme inline` de app/globals.css ne porte que --color-bg,
      --color-panel, --color-line…). Tailwind v4 n'émet alors AUCUNE règle
      pour ces classes : la carte serait transparente et sans filet, sans
      qu'aucune erreur ne le dise. On passe donc par le vocabulaire du
      monde `.resa` (--r-filet, --r-texte, --r-faible), avec des valeurs de
      repli pour les pages qui n'ouvrent pas ce monde.

   2. `border` SEUL peint en `currentColor` en v4 — un filet de la couleur
      du texte, ici presque noir. La couleur du filet est donc écrite.

   3. LE MODÈLE EXTENSIONNE tailwind.config.js pour ses deux images de
      fond ; ce site est en Tailwind v4 et n'a pas de fichier de
      configuration. Les deux utilitaires `bg-grid-pattern` /
      `bg-grid-pattern-light` sont déclarés en `@utility` dans
      app/globals.css — même nom, même rendu, autre porte d'entrée.

   L'ENTRÉE EN SCÈNE RESTE `animate`, jouée au montage, et pas
   `whileInView` : sur la page des tarifs la carte est dans le premier
   écran (elle se place sous le sélecteur, au-dessus de la grille), donc le
   fondu se voit. Surtout, `whileInView` laisse la carte à `opacity: 0`
   tant que l'observateur n'a pas tiré — et un observateur qui ne tire pas
   (onglet en arrière-plan au montage, volet replié, page mesurée par un
   robot) rendrait un appel à l'action INVISIBLE, sans un bruit. Au montage,
   le pire cas est un fondu qu'on rate.
   ══════════════════════════════════════════════════════════════════════ */

interface GridPatternCardProps {
  children: ReactNode;
  className?: string;
  patternClassName?: string;
  gradientClassName?: string;
}

export function GridPatternCard({
  children,
  className,
  patternClassName,
  gradientClassName,
}: GridPatternCardProps) {
  /* qui a demandé moins d'animations n'a pas de fondu : la carte est là,
     posée. Le reste du calculateur suit déjà cette règle. */
  const sobre = useReducedMotion();

  return (
    <motion.div
      className={cn(
        "w-full overflow-hidden rounded-xl border p-3",
        "border-[color:var(--r-filet,#e3e3e3)] bg-white",
        className,
      )}
      initial={sobre ? false : { opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: sobre ? 0 : 0.8, ease: "easeOut" }}
    >
      <div
        className={cn(
          "size-full bg-grid-pattern-light bg-[length:30px_30px] bg-repeat",
          patternClassName,
        )}
      >
        <div
          className={cn(
            "size-full bg-linear-to-tr from-white/90 via-white/40 to-white/10",
            gradientClassName,
          )}
        >
          {children}
        </div>
      </div>
    </motion.div>
  );
}

export function GridPatternCardBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 text-left md:p-6", className)} {...props} />;
}
