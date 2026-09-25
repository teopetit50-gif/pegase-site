"use client";

import { useEffect, useRef, useState } from "react";

/* ══ les lumières des deux bandes sombres ═════════════════════════════
   Chez concurrence.com, deux vidéos (desktop-orange-main.mp4 et sa
   jumelle bleue), filmées image par image le 24/09 : des DALLES
   rectangulaires aux bords verticaux nets, calées sur une grille d'une
   dizaine de colonnes, fondues vers le haut ou vers le bas, qui
   apparaissent et disparaissent chacune à son heure, à des hauteurs
   variables ; certaines claires et presque pleines (leur lavande
   #c5bace), la plupart translucides ; de temps en temps un trait vertical
   d'un pixel sur une ligne de la grille. Teo, 24/09 : « l'effet, genre
   elles sortent des barres, spawn et despawn ».
   Même mécanique ici, aux couleurs d'Omega : blanc translucide, et un
   gris très clair à la place de la lavande. Une dalle naît toutes les
   550 ms environ (au plus neuf à la fois), vit 3 à 6 s, entre et sort en
   fondu (distribution.css, .nm-dalle). En pause hors de l'écran. Les
   dégradés de bord haut et bas sont les leurs, à l'identique. */

type Dalle = { id: number; col: number; haut: number; h: number; sens: "haut" | "bas"; clair: boolean; vie: number; trait: boolean };

export default function Lumieres({ fond }: { fond: string }) {
  const [dalles, setDalles] = useState<Dalle[]>([]);
  const [cols, setCols] = useState(10);
  const ref = useRef<HTMLDivElement>(null);
  const vu = useRef(false);
  const n = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const poser = () => setCols(mq.matches ? 10 : 5);
    poser();
    mq.addEventListener("change", poser);
    const io = new IntersectionObserver(([e]) => (vu.current = e.isIntersecting));
    if (ref.current) io.observe(ref.current);
    const naitre = () => {
      if (!vu.current || document.hidden) return;
      const id = ++n.current;
      const vie = 3000 + Math.random() * 3000;
      const d: Dalle = {
        id,
        col: Math.floor(Math.random() * (mq.matches ? 10 : 5)),
        haut: Math.random() * 55,
        h: 18 + Math.random() * 50,
        sens: Math.random() < 0.5 ? "haut" : "bas",
        clair: Math.random() < 0.16,
        trait: Math.random() < 0.18,
        vie,
      };
      setDalles((l) => [...l.slice(-8), d]);
      window.setTimeout(() => setDalles((l) => l.filter((x) => x.id !== id)), vie);
    };
    for (let i = 0; i < 5; i++) naitre();
    const tic = window.setInterval(naitre, 550);
    return () => {
      window.clearInterval(tic);
      io.disconnect();
      mq.removeEventListener("change", poser);
    };
  }, []);

  const l = 100 / cols;
  return (
    <div ref={ref} className="relative w-full overflow-hidden pointer-events-none h-full" aria-hidden>
      {dalles.map((d) =>
        d.trait ? (
          <i
            key={d.id}
            className="nm-dalle nm-dalle--trait"
            style={{ left: `${d.col * l}%`, top: `${d.haut}%`, height: `${d.h + 20}%`, animationDuration: `${d.vie}ms` }}
          />
        ) : (
          <i
            key={d.id}
            className={`nm-dalle ${d.clair ? "nm-dalle--claire" : ""} nm-dalle--${d.sens}`}
            style={{ left: `${d.col * l}%`, width: `${l}%`, top: `${d.haut}%`, height: `${d.h}%`, animationDuration: `${d.vie}ms` }}
          />
        )
      )}
      <div
        className="absolute top-0 inset-x-0 h-[50%] lg:h-[30%] pointer-events-none z-[1]"
        style={{ background: `linear-gradient(to top, transparent, ${fond})` }}
      />
      <div
        className="absolute bottom-0 inset-x-0 h-[50%] lg:h-[30%] pointer-events-none z-[1]"
        style={{ background: `linear-gradient(to bottom, transparent, ${fond})` }}
      />
    </div>
  );
}
