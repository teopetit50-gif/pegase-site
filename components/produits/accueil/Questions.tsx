"use client";

import { useId, useState } from "react";
import { Etiquette } from "./Bouton";
import { QUESTIONS } from "@/lib/produits/accueil";

/* L'accordéon de la référence est un bouton nu : rien n'annonce l'état, et
   le panneau n'est rattaché à personne. Écart assumé : aria-expanded +
   aria-controls, géométrie identique (filet neutral-100, pastille size-7,
   question 20/28 en 500, réponse pb-5 max-w-xl). */
export function Questions() {
  const [ouvert, setOuvert] = useState(0);
  const base = useId();

  return (
    <section data-monde="clair" id="questions" className="scroll-mt-24 bg-white rounded-xl px-3 py-12 max-sm:py-14 pb-8 lg:py-25">
      <div className="max-w-7xl mx-auto">
        <div className="flex-col flex lg:flex-row justify-between gap-10 xl:gap-16">
          <div className="xl:w-4/12">
            <Etiquette>{QUESTIONS.etiquette}</Etiquette>
            <h2 className="mt-4 text-3xl max-sm:text-[26px] max-sm:leading-[30px] -tracking-[2px] max-sm:-tracking-[1px] sm:text-4xl lg:text-5xl font-medium text-neutral-900 lg:leading-14">
              {QUESTIONS.titre}
            </h2>
          </div>

          <div className="xl:w-6/12">
            <div className="divide-y divide-neutral-100">
              {QUESTIONS.items.map((item, i) => {
                const actif = ouvert === i;
                return (
                  <div className="bg-white" key={item.q}>
                    <button
                      type="button"
                      className="w-full flex items-center gap-4 py-5 text-left cursor-pointer"
                      aria-expanded={actif}
                      aria-controls={`${base}-${i}`}
                      onClick={() => setOuvert(actif ? -1 : i)}
                    >
                      <span
                        /* Pastille relevée sur la référence : #111827 quand
                           l'item est ouvert, transparente sinon, texte
                           #6b7280 au repos. */
                        className={`shrink-0 size-7 rounded-lg flex items-center justify-center transition-colors ${
                          actif ? "bg-[#111827] text-white" : "bg-transparent text-[#6b7280]"
                        }`}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M3.5 8h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                          <path
                            d="M8 3.5v9"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            className={`origin-center transition-transform duration-300 ${
                              actif ? "scale-y-0" : "scale-y-100"
                            }`}
                          />
                        </svg>
                      </span>
                      <span className="font-medium text-xl max-sm:text-[17px] max-sm:leading-[1.35] text-neutral-900">{item.q}</span>
                    </button>
                    <div id={`${base}-${i}`} hidden={!actif}>
                      <p className="pb-5 max-w-xl text-neutral-500 text-base max-sm:text-[15px] leading-relaxed">{item.r}</p>
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
