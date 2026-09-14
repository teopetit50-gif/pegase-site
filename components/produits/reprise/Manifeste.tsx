"use client";

import { useEffect, useRef, useState } from "react";
import { MANIFESTE } from "@/lib/produits/reprise";

/** Trame de points : reprise du motif de la référence (cercle r=1, pas 16px,
 *  masqué par une ellipse radiale). */
export function TramePoints({ id }: { id: string }) {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full text-neutral-400/80 [mask-image:radial-gradient(ellipse_at_center,white,transparent_80%)]"
    >
      <defs>
        <pattern id={id} width={16} height={16} patternUnits="userSpaceOnUse" patternContentUnits="userSpaceOnUse">
          <circle cx={1} cy={1} r={1} fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Citation révélée mot à mot au défilement : une piste de 200 vh, un panneau
 *  collant, et un mot qui s'allume par tranche de progression.
 *
 *  C'EST LA CITATION QUI DEVENAIT BLANC SUR BLANC sur le site source, quand la
 *  variante `dark:` suivait l'OS au lieu de suivre la classe. Ici la question
 *  ne se pose plus : ses deux `dark:` (`dark:text-white/20` sur le mot éteint,
 *  `dark:text-white` sur le mot allumé) sont RETIRÉS — la page est figée dans
 *  son monde clair, et les moitiés claires (`text-black/20`, `text-black`)
 *  restent parfaitement lisibles sur le fond #f5f5f5. */
export function Manifeste() {
  const piste = useRef<HTMLDivElement>(null);
  const [avance, setAvance] = useState(0);
  const mots = MANIFESTE.phrase.split(" ");

  useEffect(() => {
    let brut = 0;
    const mesurer = () => {
      const e = piste.current;
      if (!e) return;
      const r = e.getBoundingClientRect();
      const course = r.height - window.innerHeight;
      setAvance(course <= 0 ? 1 : Math.min(1, Math.max(0, -r.top / course)));
      brut = 0;
    };
    const auCadre = () => {
      if (brut) return;
      brut = requestAnimationFrame(mesurer);
    };
    mesurer();
    window.addEventListener("scroll", auCadre, { passive: true });
    window.addEventListener("resize", auCadre);
    return () => {
      window.removeEventListener("scroll", auCadre);
      window.removeEventListener("resize", auCadre);
      if (brut) cancelAnimationFrame(brut);
    };
  }, []);

  return (
    <div
      className="relative z-10 border-x"
      style={{
        maskImage: "linear-gradient(to bottom, transparent, black 40%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent, black 40%)",
      }}
    >
      <div className="sticky top-10 mx-4 border-0" style={{ marginTop: "-65vh" }}>
        <TramePoints id="trame-manifeste" />
        <div ref={piste} className="relative h-[200vh]">
          <div className="sticky top-0 mx-auto flex h-[100vh] max-w-4xl flex-col items-center justify-center bg-transparent">
            <p className="flex flex-wrap justify-center p-5 text-center font-medium text-black/20 text-xl sm:text-3xl md:p-8 md:text-[2rem] lg:p-10 lg:text-[2.5rem] xl:text-[3.1rem]">
              {mots.map((mot, i) => {
                /* Chaque mot s'allume sur sa propre tranche de la course. */
                const debut = i / mots.length;
                const opacite = Math.min(1, Math.max(0, (avance - debut) * mots.length));
                return (
                  <span key={`${mot}-${i}`} className="relative mx-1 lg:mx-2.5">
                    <span className="absolute opacity-30">{mot}</span>
                    <span className="text-black" style={{ opacity: opacite }}>
                      {mot}
                    </span>
                  </span>
                );
              })}
            </p>
            <div className="mt-8 flex flex-col items-center gap-1">
              <p className="font-semibold text-[#737373] text-sm sm:text-base">
                {MANIFESTE.signature}
              </p>
              <p className="text-[#737373]/70 text-xs sm:text-sm">
                {MANIFESTE.precision}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
