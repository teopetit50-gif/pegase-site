"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import HeroScene from "./HeroScene";

gsap.registerPlugin(useGSAP);

const ROTATING = [
  "Relances d'impayés",
  "Réponses clients 24/7",
  "Compta classée",
  "Prospection B2B",
  "Contenu publié",
];

/* Deux lignes verrouillées : « Votre entreprise, » / « moins les corvées. »
   — 26/07 : « pilotée depuis votre poche » promettait une application mobile
   que le site ne livre pas, et sonnait grand public.

   Le mécanisme d'origine est conservé : le dernier segment est soudé par un
   espace insécable pour que « corvées. » ne reste jamais orphelin. Mesuré à
   34px : la ligne 2 fait 281px et tient d'un seul tenant jusqu'à 360px de
   viewport ; en dessous elle casse en « moins » / « les corvées. », jamais
   sur un mot seul. La version « moins l'administratif. » a été écartée pour
   cela — 310px, elle débordait des 303px disponibles sur 375. */
const HEADLINE_LIGNES: string[][] = [
  ["Votre", "entreprise,"],
  ["moins", "les corvées."],
];

function Sparkle() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-8 w-8 sm:h-10 sm:w-10"
      aria-hidden
      style={{ animation: "sparklePulse 2.6s ease-in-out infinite" }}
    >
      <path
        d="M12 1c.6 5.5 4 9.6 11 11-7 1.4-10.4 5.5-11 11-.6-5.5-4-9.6-11-11 7-1.4 10.4-5.5 11-11Z"
        fill="#fff"
      />
    </svg>
  );
}

const enter = (delay: number) => ({
  animation: `heroIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both`,
});

export default function Hero() {
  const panelRef = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % ROTATING.length), 2200);
    return () => clearInterval(t);
  }, []);

  useGSAP(
    () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduced) {
        // titre : les mots montent l'un après l'autre sous un masque
        gsap.from(".hero-word", {
          yPercent: 115,
          duration: 0.9,
          ease: "power4.out",
          stagger: 0.06,
          delay: 0.1,
        });
      }
    },
    { scope: panelRef }
  );

  return (
    <section className="relative overflow-hidden">
      {/* scène WebGL — nébuleuse GPGPU pleine largeur, chargée après le LCP.
          Elle vit sur la section entière (pas le panel en retrait) : aucun
          bord de canvas visible, le champ fond dans le noir de la page */}
      <HeroScene />

      {/* breathing room between header and hero panel */}
      <div className="h-10 sm:h-24" />

      <div className="px-4 pb-6 sm:px-6 sm:pb-8">
        <div
          ref={panelRef}
          className="relative mx-auto flex min-h-[440px] max-w-[1360px] flex-col items-center justify-center px-5 py-14 sm:min-h-[620px] sm:py-20"
        >

          <h1 className="relative z-10 max-w-5xl text-center text-[34px] font-medium leading-[1.08] tracking-[-0.0375em] text-white sm:text-[68px] lg:text-[84px]">
            {HEADLINE_LIGNES.map((ligne, li) => (
              <span key={li} className="block">
                {ligne.map((w, idx) => (
                  <span key={idx} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
                    <span className="hero-word inline-block will-change-transform">
                      {w}
                      {idx < ligne.length - 1 ? " " : ""}
                    </span>
                  </span>
                ))}
              </span>
            ))}
          </h1>

          <div className="relative z-10 mt-8 flex items-center gap-4 sm:mt-10" style={enter(350)}>
            <Sparkle />
            {/* toutes les phrases empilées dans la même cellule : la pastille
                garde la largeur de la plus longue (rien ne bouge autour) et
                le changement se fait en fondu croisé */}
            <span className="inline-grid justify-items-center rounded-full border border-line bg-white/[0.04] px-5 py-2.5 text-[15px] font-medium text-white sm:text-lg">
              {ROTATING.map((label, idx) => (
                <span
                  key={label}
                  className="col-start-1 row-start-1 whitespace-nowrap transition-all duration-500 ease-out"
                  style={{
                    opacity: i === idx ? 1 : 0,
                    transform: i === idx ? "none" : "translateY(6px)",
                  }}
                >
                  {label}
                </span>
              ))}
            </span>
          </div>

          <p
            className="relative z-10 mt-8 max-w-2xl text-center text-base leading-relaxed text-muted sm:mt-10 sm:text-xl"
            style={enter(500)}
          >
            Relance d&apos;impayés, demandes clients, factures fournisseurs :
            douze moteurs qui prennent chacun une tâche précise et la tiennent
            en continu : sur vos outils actuels, sous votre validation.
          </p>

          <a
            href="/reserver-un-audit"
            className="relative z-10 mt-10 rounded-[var(--radius-btn)] bg-white px-7 py-3.5 text-[16px] font-semibold text-black transition hover:bg-neutral-200"
            style={enter(650)}
          >
            Réserver l&apos;audit gratuit
          </a>
        </div>
      </div>
    </section>
  );
}
