"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani sur le gabarit Nivara — Dossier.tsx (09/11/2026)
   La section « Process » de la référence : sourcil `text-small
   text-graphite`, énoncé `mt-6 max-w-[30ch] font-statement text-statement
   leading-[1.08] text-balance` gris (#cfcfcf) qui passe à l'encre une
   fois lu, puis à `mt-20 m:mt-28` deux colonnes (`m:gap-12 m:px-8
   l:gap-24 l:px-16`) : une planche 4/5 légendée à gauche, le texte long
   (`prose-long`) et une seconde planche décalée (`mt-16 m:mt-24 l:mt-32`)
   à droite. Les planches ont leur parallaxe (échelle 1,15 puis 1,18,
   translation de −8 % à 0). Le voile `clip-path` de la référence est
   remplacé par l'apparition de l'accueil.
   Textes : « 03 — Le dossier » ; le point relevé de la maquette et sa
   proposition en texte long, les libellés de la planche ouverte en
   légendes. Images : deux planches d'archives (Unsplash) de la page
   actuelle, en traits d'encre sur `bg-paper-light`.
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import { useEffect, useRef } from "react";
import Apparition, { GroupeApparition, MotsApparition } from "@/components/accueil/Apparition";
import { DOSSIER } from "./textes";
import { useParallaxe } from "./parallaxe";

function Planche({ legende, image }: { legende: string; image: string }) {
  const img = useParallaxe<HTMLDivElement>((el, p) => {
    el.style.transform = `translateY(${(-8 + 8 * p).toFixed(2)}%)`;
  });
  return (
    <figure>
      <Apparition>
        <div className="relative aspect-[4/5] overflow-hidden bg-paper-light">
          <div className="relative h-full w-full" style={{ transform: "scale(1.15)" }}>
            <div ref={img} className="absolute inset-0 scale-[1.18]">
              <Image alt="" src={image} fill sizes="(min-width: 1200px) 40vw, (min-width: 810px) 45vw, 100vw" className="object-cover" />
            </div>
          </div>
        </div>
      </Apparition>
      <figcaption className="mt-3 text-small text-graphite">
        <Apparition>{legende}</Apparition>
      </figcaption>
    </figure>
  );
}

export default function Dossier() {
  const enonce = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const el = enonce.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (en) => {
        if (en.some((e) => e.isIntersecting)) {
          el.dataset.vu = "";
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section
      data-monde="clair"
      className="mx-auto w-full max-w-[1600px] px-4 pt-28 min-[810px]:px-8 min-[810px]:pt-40"
    >
      <GroupeApparition retard={1400}>
        <Apparition as="p" className="text-small text-graphite">
          {DOSSIER.sourcil}
        </Apparition>
        <h2 ref={enonce} className="n-enonce-gris mt-6 max-w-[30ch] font-statement text-statement leading-[1.08] text-balance">
          <MotsApparition texte={DOSSIER.titre} depart={100} pas={45} />
        </h2>
      </GroupeApparition>
      <div className="mt-20 grid gap-16 min-[810px]:mt-28 min-[810px]:grid-cols-2 min-[810px]:gap-12 min-[810px]:px-8 min-[1200px]:gap-24 min-[1200px]:px-16">
        <Planche legende={DOSSIER.planches[0].legende} image={DOSSIER.planches[0].image} />
        <div>
          <Apparition className="prose-long">
            {DOSSIER.point.map((t, i) => (
              <p key={t} className={i ? "mt-6" : ""}>
                {t}
              </p>
            ))}
          </Apparition>
          <div className="mt-16 min-[810px]:mt-24 min-[1200px]:mt-32">
            <Planche legende={DOSSIER.planches[1].legende} image={DOSSIER.planches[1].image} />
          </div>
        </div>
      </div>
    </section>
  );
}
