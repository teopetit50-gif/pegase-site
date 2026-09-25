"use client";

import { useEffect, useRef, useState } from "react";
import { PROBLEMES } from "./textes";

/* ══ leur carrousel de témoignages, à pastilles de progression ════════
   Balisage relevé (DOM hydraté) : carte h 500 / 576 (xl), rayon 20, fond
   `linear-gradient(158deg, rgba(43,43,43,.28) 22.3%, rgba(201,201,201,.22)
   75.7%)` ; à gauche une colonne de 320 / 464 px pour le logo client ; à
   droite la citation (serif, clamp(18px, 2.5vw, 32px), interligne 1,08)
   puis l'attribution ; au bord droit une gélule verticale de trois
   pastilles : l'active s'allonge (7 × 24) et se remplit de blanc à mesure
   que le temps passe, les autres sont des points de 4 px à 85 %.
   Sur téléphone, les diapositives sont empilées (fondu de 300 ms) et la
   gélule passe à l'horizontale sous la carte.
   ÉCART (règles maison) : ni logo ni personne. Le logo devient le NOM du
   module en serif ; la citation, le problème qu'il règle ; l'attribution,
   le module et son périmètre. */
const DUREE = 8000;

/* 24/09 — le remplissage de la pastille active est une animation CSS
   (distribution.css, .nm-remplit), relancée à chaque diapositive par sa
   `key` ; sa fin fait avancer le carrousel. La première version posait la
   progression dans l'état React à chaque image : la carte entière se
   redessinait 60 fois par seconde et retardait tout le reste de la page
   (les chiffres apparaissaient 600 px trop tard). */
function Gelule({ actif, vertical, aller, suivant }: { actif: number; vertical: boolean; aller: (i: number) => void; suivant: () => void }) {
  return (
    <div
      className={`relative rounded-full flex ${vertical ? "flex-col" : ""} items-center`}
      style={{
        gap: 8,
        padding: vertical ? "10px 6px" : "6px 10px",
        background: `linear-gradient(${vertical ? "to bottom" : "to right"}, rgba(255,255,255,0.08), rgba(255,255,255,0.04))`,
      }}
    >
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          padding: 1,
          background: `linear-gradient(${vertical ? "to bottom" : "to right"}, rgba(255,255,255,0.12), rgba(255,255,255,0.03))`,
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      {PROBLEMES.map((p, i) => (
        <button
          key={p.module}
          type="button"
          className="cursor-pointer shrink-0 relative flex min-h-6 min-w-6 items-center justify-center bg-transparent border-0 p-1"
          aria-label={`Aller au module ${p.module.toLowerCase()}`}
          aria-current={i === actif}
          onClick={() => aller(i)}
        >
          <span
            className="rounded-full block overflow-hidden relative"
            style={{
              width: i === actif ? (vertical ? 7 : 24) : 4,
              height: i === actif ? (vertical ? 24 : 7) : 4,
              backgroundColor: i === actif ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.85)",
              transition: "height 300ms ease-out, width 300ms ease-out, background-color 300ms ease-out",
            }}
          >
            {i === actif && (
              <span
                key={actif}
                className={`absolute rounded-full block bg-white nm-remplit ${vertical ? "nm-remplit--v" : "nm-remplit--h"}`}
                style={{ animationDuration: `${DUREE}ms` }}
                onAnimationEnd={suivant}
              />
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function Temoins() {
  const [actif, setActif] = useState(0);
  const [vu, setVu] = useState(false);
  const cadre = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVu(e.isIntersecting));
    if (cadre.current) io.observe(cadre.current);
    return () => io.disconnect();
  }, []);

  /* une seule gélule est affichée à la fois (l'autre est en display:none,
     son animation ne tourne pas) : les deux peuvent porter la fin */
  const aller = (i: number) => setActif(i);
  const suivant = () => setActif((a) => (a + 1) % PROBLEMES.length);

  return (
    <div ref={cadre} data-nm-vu={vu ? "oui" : "non"}>
      {/* dès 768 */}
      <div className="hidden md:block w-full">
        <div
          className="relative w-full h-[500px] xl:h-[576px] rounded-[20px]"
          style={{ background: "linear-gradient(158deg, rgba(43, 43, 43, 0.28) 22.3%, rgba(201, 201, 201, 0.22) 75.7%)" }}
        >
          <div className="grid h-full">
            {PROBLEMES.map((p, i) => (
              <div
                key={p.module}
                className={`col-start-1 row-start-1 flex h-full transition-opacity duration-300 ${i === actif ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                aria-hidden={i !== actif}
              >
                <div className="flex items-start justify-start pt-[60px] xl:pt-[85px] pl-[50px] xl:pl-[86px] w-[320px] xl:w-[464px] shrink-0">
                  <div className="relative w-[172px] h-[78px] flex items-center">
                    <span className="nm-serif text-[34px] leading-none tracking-[-0.02em] text-white">{p.module}</span>
                  </div>
                </div>
                <div className="flex-1 flex flex-col py-[80px] xl:py-[117px] pr-[60px] xl:pr-[140px]">
                  <div className="flex flex-col gap-[60px]">
                    <p className="nm-serif text-[clamp(18px,2.5vw,32px)] leading-[1.08] tracking-[-0.01em] text-white">{p.texte}</p>
                    <div className="nm-type-body">
                      <p className="text-white">{p.ligne1}</p>
                      <p className="text-[var(--nm-g2)]">{p.ligne2}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute right-[20px] xl:right-[48px] top-1/2 -translate-y-1/2">
            <Gelule actif={actif} vertical aller={aller} suivant={suivant} />
          </div>
        </div>
      </div>

      {/* téléphone */}
      <div className="md:hidden flex justify-center">
        <div className="flex flex-col items-center gap-[30px] w-full">
          <div
            className="w-full rounded-[20px]"
            style={{ background: "linear-gradient(131deg, rgba(43, 43, 43, 0.28) 22.3%, rgba(201, 201, 201, 0.22) 75.7%)" }}
          >
            <div className="grid p-[29px]">
              {PROBLEMES.map((p, i) => (
                <div
                  key={p.module}
                  className={`col-start-1 row-start-1 flex flex-col justify-between transition-opacity duration-300 ${i === actif ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                  aria-hidden={i !== actif}
                >
                  <div className="flex flex-col gap-[48px]">
                    <div className="relative w-[200px] h-[48px] flex items-center">
                      <span className="nm-serif text-[30px] leading-none tracking-[-0.02em] text-white">{p.module}</span>
                    </div>
                    <div className="flex flex-col gap-8">
                      <p className="nm-type-h4 text-white">{p.texte}</p>
                      <div className="nm-sans nm-text-caption">
                        <p className="text-white">{p.ligne1}</p>
                        <p className="text-[var(--nm-g2)]">{p.ligne2}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Gelule actif={actif} vertical={false} aller={aller} suivant={suivant} />
          </div>
        </div>
      </div>
    </div>
  );
}
