"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — Appel.tsx, l'appel final

   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   cta.tsx` : rayons animés (composant canevas de la référence), bande
   d'icônes à pas (Stepped Logo Marquee de Monolyth Dev sur 21st.dev, nos
   tuiles de pièces à la place des logos tiers), façades de maisons de ville
   au trait posées sur le bas, titre et boutons. Ce qui change :

   · MONDE BLANC, écrit en dur dans la source et dans la référence :
       rayons            fond #0A0A0A, traits blancs → fond #ffffff,
                         traits d'encre #0a0a0a (même opacité 35 %)
       voile             bg-black/75 → bg-white/75 : les rayons restent un
                         murmure, comme sur le noir
       tuile centrale    `.cta-center-mark` : fond #050505 dans un anneau
                         métallique, respiration entre une lueur blanche et
                         une ombre noire → `.architectes-marque-centre`
                         (architectes.css) : fond blanc, même anneau, ombre
                         d'encre qui s'étoffe quand la tuile grossit
       façades           traits blancs → traits d'encre (même opacité)
   · Le signe : la source posait public/marque.svg (tuile claire, signe en
     PNG incrusté) dans la tuile centrale ; ici le signe officiel en masque
     alpha, dans sa tuile filetée (`TuileSigne`, marque.tsx).
   · « Réserver un audit » → /reserver-un-audit (la source visait
     https://omegaai.fr/reserver). « Voir les formules » reste une ancre de
     la page (#pricing).
   · `.cta-model-marquee` → `.architectes-pas` (mêmes positions, même
     cadence, keyframes préfixées dans architectes.css).
   · PAGE PLEINE : les rayons et les façades courent d'un bord à l'autre ;
     le contenu garde les 30 px de marge du cadre de la source.
   ══════════════════════════════════════════════════════════════════════ */
/* eslint-disable @next/next/no-img-element -- tuiles SVG de 30 px et façades décoratives : pas d'optimiseur. */
import React from "react";
import Rays from "./rayons";
import StarButton from "./bouton-etoile";
import { TuileSigne } from "./marque";
import { APPEL, CONTACT } from "./textes";

export default function Appel() {
  return (
    <section className="relative isolate overflow-hidden bg-[#ffffff] py-20 md:py-[120px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 opacity-35">
        <Rays backgroundColor="#ffffff" lineColor="rgb(10, 10, 10)" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] bg-white/75" />
      {/* Façades de maisons de ville au trait, posées sur le bas de la section comme une rue — voir LISEZ-MOI. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex justify-center">
        <img
          alt=""
          loading="lazy"
          decoding="async"
          width={1498}
          height={718}
          src="/secteurs-architectes/plans/facades.webp"
          className="h-auto w-[min(62%,820px)] max-w-none select-none opacity-[0.2] [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)] max-md:w-[125%] max-md:opacity-[0.14]"
        />
      </div>
      <div className="relative z-10 mx-[30px]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-4xl text-center">
            <div
              aria-label="Pièces lues et lecteurs"
              className="relative mx-auto mb-14 w-[396px] max-w-full translate-y-8 overflow-hidden py-3 md:w-[464px]"
            >
              <div className="architectes-pas relative left-1/2 flex w-max items-center gap-2.5 motion-reduce:animate-none md:gap-3">
                {[0, 1, 2].map((copie) => (
                  <div key={copie} aria-hidden={copie !== 1} className="flex items-center gap-2.5 md:gap-3">
                    {APPEL.glyphes.map((g, i) => (
                      <div
                        key={`${copie}-${i}`}
                        className="flex size-12 shrink-0 items-center justify-center md:size-14"
                      >
                        <img
                          alt={copie === 1 ? g.name : ""}
                          loading="lazy"
                          width={30}
                          height={30}
                          className="size-[30px] object-contain"
                          src={g.src}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-1/2 z-10 flex -translate-x-1/2 items-center px-3"
              >
                <div className="architectes-marque-centre flex size-[60px] items-center justify-center rounded-2xl border-2 border-transparent p-2">
                  <TuileSigne className="size-10" />
                </div>
              </div>
            </div>
            <h2 className="text-balance text-4xl font-semibold tracking-tight lg:text-5xl xl:text-6xl">
              {APPEL.titre}
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <StarButton href={CONTACT.audit}>{APPEL.audit}</StarButton>
              <a
                data-slot="button"
                className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a1a1a1] active:scale-98 shadow-sm bg-[#0a0a0a]/5 shadow-black/10 ring-1 ring-[#0a0a0a]/10 duration-200 hover:bg-[#f5f5f5]/50 h-10 px-5"
                href="#pricing"
              >
                {APPEL.formules}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
