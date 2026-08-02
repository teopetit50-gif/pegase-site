"use client";

/* Spotlight satin — la « Spotlight Card » de 21st.dev réécrite charte :
   un halo GRIS SATIN qui suit le curseur DANS la surface (règle cartes du
   site : la brillance vit à l'intérieur, jamais en couleur, jamais sur le
   contour). Le JS ne fait que poser --sx/--sy sur la carte elle-même ;
   l'affichage est gaté hover+pointer:fine côté CSS, donc inerte au tactile
   et sous reduced-motion (une opacité au survol, pas un mouvement). */

import { useRef } from "react";

export default function CarteSpotlight({
  children,
  className = "",
  nuit = false,
}: {
  children: React.ReactNode;
  className?: string;
  nuit?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--sx", `${e.clientX - r.left}px`);
    el.style.setProperty("--sy", `${e.clientY - r.top}px`);
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={`pa-spot ${nuit ? "pa-spot--nuit" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
