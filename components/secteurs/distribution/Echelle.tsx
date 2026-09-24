"use client";

import { useEffect, useRef } from "react";

/* Le dessin qui RÉTRÉCIT au lieu de se réorganiser — même mécanique que
   components/surmesure/Ajuste.tsx (16/09), avec les classes de cette
   page. L'écran codé remplace une capture de la référence : comme une
   image, il se met à l'échelle et garde sa forme à toutes les largeurs.
   Sans JavaScript, facteur 1 : le dessin est rogné à droite, pas cassé. */
export default function Echelle({ largeur, children }: { largeur: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cadre = ref.current;
    const dedans = cadre?.firstElementChild as HTMLElement | null;
    if (!cadre || !dedans) return;
    const mesurer = () => {
      const dispo = cadre.clientWidth;
      if (!dispo) return;
      const k = Math.min(1, dispo / largeur);
      cadre.style.setProperty("--nm-k", String(k));
      cadre.style.height = `${Math.round(dedans.offsetHeight * k)}px`;
    };
    const ro = new ResizeObserver(mesurer);
    ro.observe(cadre);
    ro.observe(dedans);
    mesurer();
    return () => ro.disconnect();
  }, [largeur]);
  return (
    <div ref={ref} className="nm-echelle" style={{ "--nm-l": `${largeur}px` } as React.CSSProperties}>
      <div className="nm-echelle__in">{children}</div>
    </div>
  );
}
