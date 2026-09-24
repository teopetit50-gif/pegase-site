"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — Compteurs.tsx

   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   stats.tsx` : bande des compteurs et globe, décalque de la section client
   de la référence (« SectionHero » du bundle 38prpq…) — grille 3D de fond,
   titre + bouton étoilé, quatre compteurs (des faits de conception, pas des
   chiffres de traction : règle maison), puis le globe de particules.
   Ce qui change :

   · MONDE BLANC. Cette section est SOMBRE EN DUR jusque dans la référence
     (aucune variante claire dans son bundle). Repris un par un :
       grille 3D, fond              #090909 → #ffffff
       grille 3D, filets            blanc à 12 % → encre à 8 %
       grille 3D, cases au survol   blanc à 16 / 11 / 7 / 4 %
                                  → encre à 10 / 7 / 4,5 / 2,5 %
                                    (une ombre pèse plus qu'une lueur : ÷ 1,5)
       compteurs pleins / vides     #1a1a1a / #121212 (plus clairs que le
                                    fond noir) → #f5f5f5 / #fafafa (plus
                                    foncés que le fond blanc, même écart)
       leur filet                   `border-border/70`, écrit dans un
                                    gabarit `…` que l'outil ne convertit
                                    pas → border-[#e5e5e5]/70
       halo sous le globe           #a3a3a3 / #737373 / #525252 (plus clair
                                    que le fond) → #e5e5e5 / #d4d4d4 /
                                    #c4c4c4 : une flaque grise, même flou
       particules du globe          #a3a3a3 → #737373
   · LES DEUX LIGNES LATÉRALES (`w-px bg-white/10`, à 16 puis 48 px des
     bords) sont RETIRÉES : elles redessinaient, dans la section, les rails
     du cadre de page que Teo a refusés (« il y a les barres sur les
     côtés »). La grille de fond garde ses propres filets.
   · `<main>` → `<section>` : la page d'Omega porte déjà le <main>.
   · « Voir Lorani en action » (un `mailto:`) → /reserver-un-audit.
   · PAGE PLEINE : fond et globe courent d'un bord à l'autre ; le contenu
     et la zone du globe gardent les 30 px de marge du cadre de la source.
   · Paliers maison : `ipad:` → `md:`, `desktop-sm:` → `xl:` (mêmes
     largeurs, 768 et 1280 px).
   ══════════════════════════════════════════════════════════════════════ */
import React, { useEffect, useRef, useState } from "react";
import Grid3D from "./grille-3d";
import StarButton from "./bouton-etoile";
import ParticleSphere from "./sphere";
import { COMPTEURS, CONTACT } from "./textes";

const T = "rgba(255,255,255,0)";
const G1 = `linear-gradient(to right, #e5e5e5 16.8%, ${T} 36.9%, ${T} 63.3%, #e5e5e5 83.2%)`;
const G2 = `linear-gradient(to bottom, ${T} 0%, #d4d4d4 44.5%)`;
const G3 = `linear-gradient(to bottom, ${T} 0%, #c4c4c4 63.6%)`;
const PLEIN = "absolute inset-y-0 left-1/2 w-full -translate-x-1/2";

function Globe() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const e = ref.current;
    if (!e) return;
    setW(Math.round(e.getBoundingClientRect().width));
    const ro = new ResizeObserver(([x]) => setW(Math.round(x.contentRect.width)));
    ro.observe(e);
    return () => ro.disconnect();
  }, []);
  const rayon = Math.min(600, Math.round((75 * Math.max(w, 760)) / 760));
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30 xl:[--globe:min(calc((100vw-96px)*0.6419),calc((min(var(--section-h),1020px)-452px)*2))]"
    >
      <div className="absolute bottom-[-133px] left-1/2 h-[281px] w-[526px] -translate-x-1/2 md:bottom-[-51px] md:h-[474px] md:w-[886px] xl:bottom-0 xl:aspect-[1278/684] xl:h-auto xl:w-[calc(var(--globe)*1.6816)] xl:translate-y-1/2">
        <span className="absolute inset-0 rounded-[50%] opacity-70 blur-[100px]" style={{ backgroundImage: G1 }} />
        <span
          className="absolute top-[calc(50%+25px)] left-1/2 h-[308px] w-[726px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] blur-[75px]"
          style={{ backgroundImage: G2 }}
        />
        <span
          className="absolute top-1/2 left-1/2 h-[169px] w-[314px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] blur-[50px]"
          style={{ backgroundImage: G3 }}
        />
      </div>
      <div className="absolute inset-y-0 right-[46px] left-[46px] overflow-hidden md:right-[78px] md:left-[78px]">
        <div className="pointer-events-auto absolute bottom-[-184px] left-1/2 -translate-x-1/2 overflow-hidden md:bottom-[-181px] xl:bottom-[calc(var(--globe)/-2)] aspect-[1/1.1] w-[min(370px,100%)] md:w-[min(650px,100%)] xl:w-[var(--globe)]">
          <div ref={ref} className="absolute inset-x-0 bottom-0 aspect-square">
            <ParticleSphere
              particlesCount={10000}
              particleScale={5}
              rotationDirection="clockwise"
              speed={20}
              scale={10}
              drag
              smoothing={7}
              dragSpeed={5}
              cursorOn
              cursorRadiusUI={rayon}
              cursorStrengthUI={10}
              sphereColor="#737373"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Compteurs() {
  return (
    <section className="architectes-hero-reveal relative isolate flex min-h-dvh w-full flex-col overflow-hidden bg-[#ffffff] [--section-h:clamp(832px,100dvh,1141px)]">
      <div className={PLEIN}>
        <Grid3D
          backgroundColor="#ffffff"
          boxSize={62}
          borderWidth={1}
          borderColor="rgba(10,10,10,0.08)"
          colors={["rgba(10,10,10,0.10)", "rgba(10,10,10,0.07)", "rgba(10,10,10,0.045)", "rgba(10,10,10,0.025)"]}
        />
      </div>
      <div className="pointer-events-none relative z-10 mx-auto flex w-full flex-col px-[30px] min-h-[874px] md:min-h-[1133px] xl:min-h-[var(--section-h)]">
        <div className="mx-[16px] flex flex-1 flex-col md:mx-[48px]">
          <header className="pointer-events-auto flex flex-col items-start gap-[24px] px-[4px] pt-[48px] md:px-[8px] md:pt-[72px] xl:flex-row xl:items-end xl:justify-between xl:gap-0 xl:pt-[100px]">
            <h2 className="max-w-[340px] font-sans text-[35px] leading-[1.1] tracking-[-0.04em] text-[#0a0a0a] md:max-w-[500px] md:text-[36px]">
              {COMPTEURS.titre}
              <span className="block text-[#737373]">{COMPTEURS.sous}</span>
            </h2>
            <StarButton href={CONTACT.demo}>{COMPTEURS.bouton}</StarButton>
          </header>
          <dl className="grid w-full grid-cols-1 md:grid-cols-2 xl:grid-cols-4 pointer-events-auto mt-[25px] md:mt-[48px] xl:mt-[56px]">
            {COMPTEURS.valeurs.map((v) => (
              <div
                key={v.label}
                className={`flex flex-col items-start gap-[8px] border border-[#e5e5e5]/70 p-[20px] md:self-start md:px-[24px] md:py-[16px] ${v.filled ? "bg-[#f5f5f5]" : "bg-[#fafafa]"} ${v.order}`}
              >
                <dt className="w-full font-sans text-[22px] leading-[1.1] font-medium tracking-[-0.02em] text-[#0a0a0a] md:text-[28px]">
                  {v.value}
                </dt>
                <dd className="font-sans text-[16px] leading-[1.3] text-[#737373] md:max-w-[220px]">{v.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 mx-auto h-[874px] w-full md:h-[1133px] xl:h-[max(var(--section-h),100dvh)]">
        <Globe />
      </div>
    </section>
  );
}
