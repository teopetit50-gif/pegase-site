import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

/* ══════════════════════════════════════════════════════════════════════
   PatternCard — la carte à semis de pastilles (21st.dev,
   « card-with-ellipsis-pattern »), reprise le 16/09/2026 pour les quatre
   tuiles du catalogue de l'accueil.

   C'est la SŒUR SANS QUADRILLAGE de `GridPatternCard`
   (components/ui/card-with-grid-ellipsis-pattern.tsx, sur le calculateur
   de /tarifs) : même architecture à trois couches — cadre, trame,
   dégradé — mais un fond en semis fin au lieu d'une grille. Les deux
   restent séparées parce que les deux emplacements les portent en même
   temps sur le site.

   TROIS ADAPTATIONS, les mêmes que sa sœur, toutes obligatoires ici :

   1. LES JETONS shadcn N'EXISTENT PAS dans ce site. `bg-background`,
      `border-border`, `text-foreground` ne sont déclarés nulle part
      (`@theme inline` de app/globals.css ne porte que --color-bg,
      --color-panel, --color-line…). Tailwind v4 n'émet alors AUCUNE règle
      pour ces classes : la carte serait transparente et sans filet, sans
      qu'aucune erreur ne le dise. Le cadre est donc écrit en clair —
      papier blanc, filet d'encre diluée — et reste surchargeable par
      `className`.

   2. `border` SEUL peint en `currentColor` en v4 — un filet de la couleur
      du texte, ici presque noir. La couleur du filet est donc écrite.

   3. LE MODÈLE EXTENSIONNE tailwind.config.js pour ses deux images de
      fond ; ce site est en Tailwind v4 et n'a pas de fichier de
      configuration. Les deux utilitaires `bg-dot-pattern` /
      `bg-dot-pattern-light` sont déclarés en `@utility` dans
      app/globals.css — même nom, même rendu, autre porte d'entrée.

   AUCUNE ANIMATION D'ENTRÉE ici, contrairement à `GridPatternCard`. Les
   tuiles du catalogue entrent déjà par GSAP (`[data-reveal]`,
   components/PageMotion.tsx, qui pose opacity/y puis `overwrite: true`) :
   un second moteur sur la même propriété du même nœud laisse la carte à
   mi-chemin. Le composant d'origine n'en avait pas non plus.
   ══════════════════════════════════════════════════════════════════════ */

interface PatternCardProps {
  children: ReactNode;
  className?: string;
  patternClassName?: string;
  gradientClassName?: string;
}

export function PatternCard({
  children,
  className,
  patternClassName,
  gradientClassName,
}: PatternCardProps) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-md border p-3",
        "border-[color:rgba(24,24,27,0.12)] bg-white",
        className,
      )}
    >
      <div
        className={cn(
          "size-full bg-dot-pattern-light bg-[length:30px_30px] bg-repeat",
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
    </div>
  );
}

export function PatternCardBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 text-left md:p-6", className)} {...props} />;
}
