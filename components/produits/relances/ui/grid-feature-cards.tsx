import { cn } from "@/components/produits/relances/utils";
import React from "react";

/* Composant 21st.dev « grid-feature-cards », adapté.

   UN DÉFAUT CORRIGÉ, et il aurait cassé la page : le composant d'origine
   appelle `genRandomPattern()` PENDANT le rendu. Le serveur tire une
   trame, le client en tire une autre, et React signale une divergence
   d'hydratation à chaque carte. On dérive la trame de l'index de la
   carte — même dessin des deux côtés, et le hasard visuel reste.

   RAPATRIEMENT 11/09 — couleurs converties : `text-foreground/75` →
   `text-[#171717]/75`, `text-muted-foreground` → `text-[#737373]`,
   `from-foreground/5 to-foreground/[0.01]` → `from-[#171717]/5
   to-[#171717]/[0.01]`, `fill-foreground/5` → `fill-[#171717]/5`,
   `stroke-foreground/25` → `stroke-[#171717]/25`, `text-foreground` →
   `text-[#171717]`. */

export type Fonctionnalite = {
  titre: string;
  icone: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  texte: string;
};

/** Suite déterministe : même entrée, même trame, serveur comme client. */
function trame(graine: number, longueur = 5): number[][] {
  let x = graine * 9301 + 49297;
  const suivant = () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
  return Array.from({ length: longueur }, () => [
    Math.floor(suivant() * 4) + 7,
    Math.floor(suivant() * 6) + 1,
  ]);
}

export function FeatureCard({
  fonctionnalite,
  graine = 0,
  className,
  ...props
}: React.ComponentProps<"div"> & { fonctionnalite: Fonctionnalite; graine?: number }) {
  const carres = trame(graine + 1);

  return (
    <div className={cn("relative overflow-hidden p-6", className)} {...props}>
      <div className="-mt-2 -ml-20 pointer-events-none absolute top-0 left-1/2 h-full w-full [mask-image:linear-gradient(white,transparent)]">
        <div className="absolute inset-0 bg-gradient-to-r from-[#171717]/5 to-[#171717]/[0.01] opacity-100 [mask-image:radial-gradient(farthest-side_at_top,white,transparent)]">
          <Quadrillage
            width={20}
            height={20}
            x="-12"
            y="4"
            squares={carres}
            className="absolute inset-0 h-full w-full fill-[#171717]/5 stroke-[#171717]/25 mix-blend-overlay"
          />
        </div>
      </div>
      <fonctionnalite.icone className="size-6 text-[#171717]/75" strokeWidth={1} aria-hidden />
      <h3 className="mt-10 font-semibold text-base text-[#171717]">{fonctionnalite.titre}</h3>
      <p className="relative z-20 mt-2 text-[#737373] text-sm leading-relaxed">
        {fonctionnalite.texte}
      </p>
    </div>
  );
}

function Quadrillage({
  width,
  height,
  x,
  y,
  squares,
  ...props
}: React.ComponentProps<"svg"> & {
  width: number;
  height: number;
  x: string;
  y: string;
  squares?: number[][];
}) {
  const id = React.useId();
  return (
    <svg aria-hidden {...props}>
      <defs>
        <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
          <path d={`M.5 ${height}V.5H${width}`} fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
      {squares && (
        <svg x={x} y={y} className="overflow-visible">
          {squares.map(([cx, cy]) => (
            <rect
              key={`${cx}-${cy}`}
              strokeWidth="0"
              width={width + 1}
              height={height + 1}
              x={cx * width}
              y={cy * height}
            />
          ))}
        </svg>
      )}
    </svg>
  );
}
