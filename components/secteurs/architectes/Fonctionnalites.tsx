/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — Fonctionnalites.tsx, « 04 — Fonctionnalités »

   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   sections/09-features.tsx` (GÉNÉRÉ côté source par l'assembleur ; ici une
   copie du résultat, corrigée à la main). L'en-tête de section ; la grille
   est dans GrilleFonctions.tsx. Ce qui change : jetons clairs (#0a0a0a,
   #737373) ; la planche d'architecte du fond passe des traits blancs aux
   traits d'encre (public/secteurs-architectes/plans/, voir
   Fonctionnement.tsx) ; posée dans la marge de 30 px de la page (page.tsx).
   ══════════════════════════════════════════════════════════════════════ */
/* eslint-disable @next/next/no-img-element -- planche décorative à 22 % d'opacité, masquée en CSS : pas d'optimiseur. */
import React from "react";
import GrilleFonctions from "./GrilleFonctions";

export default function Fonctionnalites() {
  return (
    <>
      <div id="features" className="scroll-mt-24">
        <section className="relative isolate py-16 md:py-20">
          <div
            aria-hidden="true"
            data-reveal="1"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden h-[390px] md:h-[290px] lg:h-[260px] [mask-image:linear-gradient(to_bottom,black_62%,transparent)]"
          >
            <img
              alt=""
              loading="lazy"
              decoding="async"
              width="1600"
              height="1000"
              src="/secteurs-architectes/plans/salle-circulaire.webp"
              className="absolute -top-[90px] right-[-2%] w-[min(66%,940px)] max-w-none select-none opacity-[0.22] [mask-image:radial-gradient(ellipse_62%_62%_at_58%_46%,black_32%,transparent_80%)] max-md:top-0 max-md:right-[-42%] max-md:w-[118%] max-md:opacity-[0.13]"
            />
          </div>
          <div className="mx-auto max-w-7xl px-6">
            <span className="mb-5 block font-mono text-[11px] uppercase tracking-[0.22em] text-[#0a0a0a]/40">
              04 — Fonctionnalités
            </span>
            <h2 className="text-[#737373] max-w-4xl text-balance text-4xl font-medium tracking-tight">
              <span className="text-[#0a0a0a]">Chaque point relevé attend</span> <br /> l&apos;arbitrage de
              l&apos;architecte.
            </h2>
            <GrilleFonctions />
          </div>
        </section>
      </div>
    </>
  );
}
