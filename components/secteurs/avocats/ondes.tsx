/* ══════════════════════════════════════════════════════════════════════
   Tamila (cabinets d'avocats) — ondes.tsx

   COPIÉ le 24/09/2026 à 13 h 37 de `OMEGA/cabinetos-site/src/components/ui/
   ripple.tsx`. Géométrie (six cercles de 170 px en 110 px, opacité 0,24 −
   0,03 par rang, dernier en pointillés) et pulsation inchangées. Ce qui
   change :
   · `animate-ripple` → `avocats-ripple` (keyframe préfixée, avocats.css).
     La classe était écrite dans un gabarit `…`, hors de portée de l'outil
     de conversion : convertie à la main.
   · MONDE BLANC. Sur le noir, chaque disque était du BLANC à 25 % (×
     l'opacité de son rang) : les six empilés éclaircissaient le centre
     d'environ 22 %. Le geste se garde, le sens s'inverse : les disques
     FONCENT le blanc. Mais une ombre pèse plus qu'une lueur à opacité
     égale (memory/basculer-un-composant-sombre-en-clair.md) : l'encre est
     ramenée de 25 à 16 %, et c'est une encre ardoise (#1e293b), pas le
     noir, pour que l'onde se marie au halo bleu posé derrière elle. Le
     centre fonce ainsi d'environ 15 %.
   · `shadow-xl` RETIRÉE. Noire à 10 % sur le fond noir de la source, elle
     n'était pas visible : ce que la page montrait, c'était des disques
     sans ombre. Sur le blanc, même divisée par 1,5, elle dessinait sous
     chaque disque un croissant gris décalé de 20 px — six croissants
     empilés, une tache sale sous l'icône (constaté sur la capture 1440 du
     24/09). Le rendu fidèle est donc l'absence d'ombre.
   · Le filet de chaque cercle (`border`, sans couleur) suit la règle de
     base d'avocats.css (#e6e6e6), comme la source suivait la sienne.
   ══════════════════════════════════════════════════════════════════════ */
import React from "react";
import { cn } from "@/lib/cn";

/* Ripple — Magic UI (@dillionverma sur 21st.dev), réglages relevés dans le DOM de la référence. */
export function Ripple({
  mainCircleSize = 170,
  step = 110,
  mainCircleOpacity = 0.24,
  numCircles = 6,
  className,
}: {
  mainCircleSize?: number;
  step?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
  className?: string;
}) {
  return (
    <div className={cn("pointer-events-none select-none absolute inset-0 [mask-image:linear-gradient(to_bottom,white,transparent)]", className)}>
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * step;
        return (
          <div
            key={i}
            className="absolute avocats-ripple rounded-full bg-[#1e293b]/16 border"
            style={{
              "--i": i,
              width: `${size}px`,
              height: `${size}px`,
              opacity: Math.round((mainCircleOpacity - i * 0.03) * 100) / 100,
              animationDelay: `${i * 0.06}s`,
              borderStyle: i === numCircles - 1 ? "dashed" : "solid",
              borderWidth: "1px",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) scale(1)",
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}
