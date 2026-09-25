"use client";

import { useEffect, useRef, useState } from "react";

/* ══ la minuterie commune des deux blocs à onglets ════════════════════
   Chez concurrence.com, « Digital Residency » (01-03) et « AI built for
   your care model » (01-04) passent seuls d'un onglet au suivant tant que
   le bloc est à l'écran, et un clic reprend la main. Même chose ici :
   un onglet toutes les `duree` ms, en pause hors de l'écran. */
export function useOnglets(nombre: number, duree = 6000) {
  const [actif, setActif] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const vu = useRef(false);
  const tic = useRef(0);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => (vu.current = e.isIntersecting), { threshold: 0.2 });
    if (ref.current) io.observe(ref.current);
    const id = window.setInterval(() => {
      if (!vu.current) return;
      tic.current += 250;
      if (tic.current >= duree) {
        tic.current = 0;
        setActif((a) => (a + 1) % nombre);
      }
    }, 250);
    return () => {
      window.clearInterval(id);
      io.disconnect();
    };
  }, [nombre, duree]);
  const choisir = (i: number) => {
    tic.current = -duree; // un clic laisse le double du temps avant de repartir
    setActif(i);
  };
  return { actif, choisir, ref };
}

export const num = (i: number) => String(i + 1).padStart(2, "0");
