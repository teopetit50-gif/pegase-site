/* ══════════════════════════════════════════════════════════════════════
   Tamila (cabinets d'avocats) — orbites.tsx

   COPIÉ le 24/09/2026 à 13 h 37 de `OMEGA/cabinetos-site/src/components/ui/
   orbiting-circles.tsx`. Géométrie et mouvement inchangés. Ce qui change :
   · `animate-orbit` → `avocats-orbit` (keyframe préfixée, avocats.css) ;
   · MONDE BLANC : le chemin en pointillés était `stroke-white/10` (blanc à
     10 % sur le noir) ; il devient l'encre à 12 % — le même filet discret,
     dans l'autre sens. À 10 % d'encre, le tiret 5/5 d'un pixel se perdait
     dans le halo bleu clair du héros.
   ══════════════════════════════════════════════════════════════════════ */
import React from "react";
import { cn } from "@/lib/cn";

/* OrbitingCircles — Magic UI (@dillionverma/orbiting-circles sur 21st.dev). La fiche 21st est l'ancienne
   version (un enfant par composant, --delay) ; la référence utilise la version à --angle réparti et
   --icon-size, reconstituée ici d'après son DOM rendu. Chemin en pointillés 5/5. */
export function OrbitingCircles({
  className,
  children,
  duration = 20,
  radius = 160,
  path = true,
  iconSize = 30,
}: {
  className?: string;
  children?: React.ReactNode;
  duration?: number;
  radius?: number;
  path?: boolean;
  iconSize?: number;
}) {
  const enfants = React.Children.toArray(children);
  return (
    <>
      {path && (
        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" className="pointer-events-none absolute inset-0 size-full">
          <circle className="stroke-[#171717]/12 stroke-1" strokeDasharray="5 5" cx="50%" cy="50%" r={radius} fill="none" />
        </svg>
      )}
      {enfants.map((enfant, i) => (
        <div
          key={i}
          style={{ "--duration": duration, "--radius": radius, "--angle": (360 / enfants.length) * i, "--icon-size": `${iconSize}px` } as React.CSSProperties}
          className={cn("absolute flex size-[var(--icon-size)] transform-gpu avocats-orbit items-center justify-center rounded-full", className)}
        >
          {enfant}
        </div>
      ))}
    </>
  );
}
