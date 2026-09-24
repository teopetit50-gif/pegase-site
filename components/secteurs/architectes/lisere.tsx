"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — lisere.tsx
   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   ui/border-beam.tsx`. Rien ne change dans le code : les couleurs du trait viennent des appelants (Fonctionnement.tsx), cœur d'encre sur le blanc. `@/lib/utils` → `@/lib/cn`.
   Ce qu'en disait la source :
   ══════════════════════════════════════════════════════════════════════ */
/* Liseré lumineux — port du composant de la référence (bundle Parlo, fonction « k ») : un trait en dégradé, long de
   lightWidth/8 % du périmètre (borné à 12–36 %), parcourt le bord de la carte en boucle linéaire
   (strokeDashoffset 100 → 0). Le rendu serveur de la référence le fige ; c'est framer-motion qui le fait tourner. */
import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

export interface BorderBeamProps {
  lightWidth?: number;
  duration?: number;
  lightColor?: string;
  lightColorEnd?: string;
  borderWidth?: number;
  className?: string;
}

export default function BorderBeam({
  lightWidth = 200,
  duration = 10,
  lightColor = "#FAFAFA",
  lightColorEnd,
  borderWidth = 1,
  className,
}: BorderBeamProps) {
  const id = "beam" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const o = Math.min(36, Math.max(12, lightWidth / 8));
  const fin = lightColorEnd ?? lightColor;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={cn(
        "pointer-events-none absolute inset-0 z-10 size-full overflow-visible rounded-[inherit]",
        className,
      )}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={lightColor} stopOpacity="0" />
          <stop offset="0.35" stopColor={lightColor} stopOpacity="0.5" />
          <stop offset="0.5" stopColor={fin} stopOpacity="1" />
          <stop offset="0.65" stopColor={lightColor} stopOpacity="0.5" />
          <stop offset="1" stopColor={lightColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.rect
        x={borderWidth / 2}
        y={borderWidth / 2}
        width={100 - borderWidth}
        height={100 - borderWidth}
        rx="12"
        ry="12"
        pathLength="100"
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={borderWidth}
        strokeLinecap="round"
        strokeDasharray={`${o} ${100 - o}`}
        initial={{ strokeDashoffset: 100 }}
        animate={{ strokeDashoffset: [100, 0] }}
        transition={{ duration, ease: "linear", repeat: Infinity }}
      />
    </svg>
  );
}
