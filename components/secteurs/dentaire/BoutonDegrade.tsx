"use client";
/* ══════════════════════════════════════════════════════════════════════
   BoutonDegrade — le « gradient-button » de 21st.dev que portait la
   source (`C_mD`, `GradientButton`). Le fond radial vert d'eau et son
   liseré animé au survol vivent dans dentaire.css
   (`.dentaire-bouton-degrade`, ex-`.gradient-button`).

   La source écrivait sa fonction cva à la main (bundle recompilé) : une
   seule variante réellement utilisée, `default`. Elle est réduite ici à
   sa liste de classes, fusionnée par `cn` exactement comme avant — les
   `px-6 py-3 text-sm` des appelants remplacent donc `px-9 py-4 text-base`,
   et `text-sm` retire `leading-[19px]` (règle de tailwind-merge, la même
   dans la source).

   `asChild` : le bouton habille son enfant (un <Link> vers
   /reserver-un-audit, ou une ancre de la page) au lieu d'être un
   <button>. `focus-visible:ring-ring` de la source ne visait aucune
   couleur définie ; il est retiré, l'anneau garde la couleur du texte.
   ══════════════════════════════════════════════════════════════════════ */
import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps } from "react";
import { cn } from "./outils";

const BASE = [
  "dentaire-bouton-degrade",
  "inline-flex items-center justify-center",
  "rounded-[6px] min-w-[132px] px-9 py-4",
  "text-base leading-[19px] font-[500] text-white",
  "font-sans font-bold",
  "focus-visible:outline-none focus-visible:ring-1",
  "disabled:pointer-events-none disabled:opacity-50",
];

type Props = ComponentProps<"button"> & { asChild?: boolean };

export default function BoutonDegrade({ className, asChild = false, ...reste }: Props) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(BASE, className)} {...reste} />;
}
