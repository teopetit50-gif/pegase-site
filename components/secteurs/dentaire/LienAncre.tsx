"use client";
/* Lien vers une section de la page (« Voir la démo » → #demo). La source
   posait un <button> qui appelait sa fonction `A()` ; c'est ici un vrai
   lien d'ancre — il se lit comme tel au clavier et au lecteur d'écran —
   dont le clic fait le même défilement doux (outils.ts, `allerA`). Les
   props (className, enfants) passent telles quelles : `BoutonDegrade
   asChild` peut l'habiller. */
import type { ComponentProps } from "react";
import { allerA } from "./outils";

type Props = Omit<ComponentProps<"a">, "href"> & { cible: string };

export default function LienAncre({ cible, onClick, ...reste }: Props) {
  return (
    <a
      href={`#${cible}`}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        allerA(cible);
      }}
      {...reste}
    />
  );
}
