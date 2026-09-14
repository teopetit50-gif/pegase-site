"use client";

import { useEffect, useRef, useState } from "react";
import { OUTILS } from "@/lib/produits/reprise";
import { Cadre } from "./Cadre";
import { cn } from "./cn";

/** Bandeau d'outils : ceux du CLIENT, jamais notre pile.
 *  Écart assumé : la référence sert des logos SVG ; sans droit d'usage sur
 *  ces marques on pose des mots-symboles typographiques. */
export function BandeauOutils() {
  const bloc = useRef<HTMLDivElement>(null);
  const [vu, setVu] = useState(false);

  useEffect(() => {
    const e = bloc.current;
    if (!e) return;
    const o = new IntersectionObserver(
      ([entree]) => entree.isIntersecting && setVu(true),
      { threshold: 0.2 },
    );
    o.observe(e);
    return () => o.disconnect();
  }, []);

  return (
    <section data-monde="clair">
      <Cadre className="relative flex flex-col items-center justify-between gap-8 p-6 py-10 md:py-12 lg:flex-row lg:gap-12">
        <p className="text-center text-[#737373] lg:max-w-xs lg:text-left">
          {OUTILS.phrase}
        </p>
        <div className="flex w-full min-w-0 flex-1 items-center justify-center lg:justify-end">
          <div
            ref={bloc}
            className={cn(
              "flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-4 overflow-hidden transition-all duration-700 sm:gap-x-6 md:gap-x-8 lg:w-auto",
              vu ? "translate-y-0 opacity-100 blur-0" : "translate-y-10 opacity-0 blur-[10px]",
            )}
          >
            {OUTILS.noms.map((nom, i) => (
              <div
                key={nom}
                className="relative flex h-8 w-20 items-center justify-center transition-all duration-500 sm:h-10 sm:w-24 md:h-12 md:w-28"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <span className="font-medium text-base text-[#737373]/80 tracking-tight sm:text-lg">
                  {nom}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Cadre>
    </section>
  );
}
