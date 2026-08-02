"use client";

/* Timeline « la suite » — pattern « process timeline » de 21st.dev dans la
   charte : rail filet, fil OR qui se remplit au fil du scroll (scaleY
   scrubbé — transform only), pastilles encre. Reduced-motion : fil plein,
   rien ne bouge. Lenis est déjà synchronisé à ScrollTrigger par PageMotion. */

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type EtapeSuite = { etape: string; titre: string; texte: string };

export default function TimelineSuite({ etapes }: { etapes: EtapeSuite[] }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(".pa-tl-fill", { scaleY: 1 });
        return;
      }
      gsap.fromTo(
        ".pa-tl-fill",
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top 72%",
            end: "bottom 62%",
            scrub: 0.4,
          },
        }
      );
    },
    { scope: root }
  );

  return (
    <div ref={root} className="pa-tl">
      <div className="pa-tl-rail" aria-hidden>
        <div className="pa-tl-fill" />
      </div>
      <ol className="grid gap-10">
        {etapes.map((e) => (
          <li key={e.etape} className="pa-tl-item" data-reveal>
            <span className="pa-tl-dot" aria-hidden>
              <span />
            </span>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#616161]">
              {e.etape}
            </div>
            <h3 className="r-h4 mt-2">{e.titre}</h3>
            <p className="mt-3 max-w-[52ch] text-[15px] leading-[24px] text-[#3d3d3d]">
              {e.texte}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
