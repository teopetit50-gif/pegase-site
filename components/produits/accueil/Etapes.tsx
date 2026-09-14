"use client";

import { useEffect, useRef, useState } from "react";
import { ecouterDefilement } from "./defilement";
import { Bouton, Etiquette } from "./Bouton";
import { Ecoute, Livre, Prise } from "./Icones";
import { ETAPES } from "@/lib/produits/accueil";

const VIGNETTES = [Livre, Prise, Ecoute];

/* Le rail de la référence se remplit à mesure qu'on descend : la moitié
   haute de l'étape courante et la moitié basse des précédentes passent en
   noir (h-full ↔ h-0, 150 ms linéaire). L'étape active est celle dont le
   bloc a dépassé les deux tiers de la fenêtre. */
export function Etapes() {
  const [actif, setActif] = useState(0);
  const lignes = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() =>
    ecouterDefilement(() => {
      const ligne = window.innerHeight * 0.66;
      let courant = 0;
      lignes.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top < ligne) courant = i;
      });
      setActif(courant);
    }), []);

  return (
    <section data-monde="clair" id="etapes" className="scroll-mt-24 bg-white rounded-xl px-3 py-12 max-sm:py-14 lg:py-25">
      <div className="max-w-7xl mx-auto">
        <div className="flex-col flex lg:flex-row justify-between gap-14 lg:gap-16 xl:gap-23.5">
          <div className="lg:w-1/2 flex flex-col justify-between gap-10 lg:gap-0">
            <div>
              <Etiquette>{ETAPES.etiquette}</Etiquette>
              <h2 className="mt-4 text-3xl max-sm:text-[26px] max-sm:leading-[30px] -tracking-[2px] max-sm:-tracking-[1px] sm:text-4xl lg:text-5xl font-medium text-neutral-900 lg:leading-14 mb-4">
                {ETAPES.titre}
              </h2>
              <p className="text-lg max-sm:text-[15px] max-sm:leading-[1.55] text-neutral-500 mb-8 max-sm:mb-6 sm:mb-11 font-normal max-w-lg">{ETAPES.chapo}</p>
              <Bouton href={ETAPES.bouton.href}>{ETAPES.bouton.libelle}</Bouton>
            </div>
          </div>

          <div className="lg:w-1/2">
            <div className="flex flex-col">
              {ETAPES.etapes.map((e, i) => {
                const Vignette = VIGNETTES[i];
                const hautPlein = i <= actif;
                const basPlein = i < actif;
                return (
                  <div
                    key={e.numero}
                    ref={(el) => {
                      lignes.current[i] = el;
                    }}
                    className="flex gap-6 items-stretch"
                  >
                    <div className="hidden sm:flex flex-col items-center shrink-0">
                      <div className={`w-0.75 flex-1 overflow-hidden ${i === 0 ? "invisible" : "bg-[#F9F7F7]"}`}>
                        <div
                          className={`w-full bg-neutral-900 transition-all ease-linear duration-150 delay-150 ${
                            hautPlein ? "h-full" : "h-0"
                          }`}
                        />
                      </div>
                      <div className="size-11.5 shrink-0 bg-white flex shadow-[0px_6px_18.6px_0px_rgba(208,208,208,0.45)] items-center justify-center rounded-full border border-neutral-100 z-10">
                        <span
                          className={`font-mono text-sm font-medium transition-colors ease-linear duration-150 ${
                            i <= actif ? "text-neutral-900 delay-300" : "text-neutral-400 delay-0"
                          }`}
                        >
                          {e.numero}
                        </span>
                      </div>
                      <div
                        className={`w-0.75 flex-1 overflow-hidden ${
                          i === ETAPES.etapes.length - 1 ? "invisible" : "bg-[#F9F7F7]"
                        }`}
                      >
                        <div
                          className={`w-full bg-neutral-900 transition-all ease-linear duration-150 delay-150 ${
                            basPlein ? "h-full" : "h-0"
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex-1 py-3">
                      <div
                        className={`p-6 rounded-2xl transition-all duration-300 h-full ${
                          i === actif ? "bg-neutral-100" : "bg-neutral-50"
                        }`}
                      >
                        <div className="mb-4">
                          <Vignette className="size-11.5" />
                        </div>
                        <h3 className="text-xl max-sm:text-[17px] font-medium text-neutral-900 mb-1 -tracking-[0.2px]">{e.titre}</h3>
                        <p className="text-neutral-500 text-sm leading-relaxed">{e.texte}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
