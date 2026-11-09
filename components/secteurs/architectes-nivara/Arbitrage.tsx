"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani sur le gabarit Nivara — Arbitrage.tsx (09/11/2026)
   La section « Buildings are finished when people move in » de la
   référence, première du bloc `theme-dark` : au-delà de 1200 px, un
   cadre `h-[125svh] min-h-[860px]` où sept images sont posées en
   absolu (positions et largeurs relevées : 3 %/4 %/13 %, 26 %/2 %/16 %,
   droite 5 %/6 %/16 %, droite 4 %/50 %/18 %, 5 %/48 %/12 %, 29 %/80 %/
   15 %, droite 29 %/78 %/10 %), chacune avec sa parallaxe ; au centre,
   le titre `max-w-[16ch] font-statement text-statement`, le chapô
   `mt-5 max-w-[42ch] text-graphite` et le lien `mt-6 text-small`. En
   dessous de 1200 px : le texte, puis une grille `grid-cols-2 gap-3`
   de six images.
   Textes : « 04 — Fonctionnalités » (titre, et « Voir Lorani en action »
   des compteurs pour le lien). Les cinq fonctions de la page actuelle
   suivent dans la brique de liste filetée de la référence (celle de
   « Where we build » sous 1200 px), posée sur sa grille de douze.
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import Apparition, { GroupeApparition, MotsApparition } from "@/components/accueil/Apparition";
import { Lien } from "./Bouton";
import { CONTACT, FONCTIONNALITES } from "./textes";
import { useParallaxe } from "./parallaxe";

const POSES = [
  { cls: "left-[3%] top-[4%] w-[13%]", v: 90 },
  { cls: "left-[26%] top-[2%] w-[16%]", v: 60 },
  { cls: "right-[5%] top-[6%] w-[16%]", v: 110 },
  { cls: "right-[4%] top-[50%] w-[18%]", v: 70 },
  { cls: "left-[5%] top-[48%] w-[12%]", v: 120 },
  { cls: "left-[29%] top-[80%] w-[15%]", v: 80 },
  { cls: "right-[29%] top-[78%] w-[10%]", v: 100 },
];

function Eparse({ src, cls, vitesse }: { src: string; cls: string; vitesse: number }) {
  const ref = useParallaxe<HTMLDivElement>((el, p) => {
    el.style.transform = `translateY(${((0.5 - p) * vitesse).toFixed(1)}px)`;
  });
  return (
    <div ref={ref} className={`absolute ${cls}`}>
      <Image alt="" src={src} width={1600} height={1067} sizes="20vw" className="h-auto w-full" />
    </div>
  );
}

export default function Arbitrage() {
  const f = FONCTIONNALITES;
  return (
    <section
      aria-labelledby="arbitrage-title"
      className="relative mx-auto mt-28 w-full max-w-[1600px] px-4 min-[810px]:mt-40 min-[810px]:px-8"
    >
      <div className="relative hidden h-[125svh] min-h-[860px] min-[1200px]:block">
        {POSES.map((p, i) => (
          <Eparse key={p.cls} src={f.images[i]} cls={p.cls} vitesse={p.v} />
        ))}
      </div>
      <GroupeApparition
        retard={900}
        className="flex flex-col items-center py-10 text-center min-[1200px]:absolute min-[1200px]:inset-0 min-[1200px]:justify-center min-[1200px]:py-0"
      >
        <h2 id="arbitrage-title" className="max-w-[16ch] font-statement text-statement">
          <MotsApparition texte={f.titre} />
        </h2>
        <Apparition delai={600}>
          <Lien href={CONTACT.demo} className="mt-6 inline-block text-small">
            {f.lien}
          </Lien>
        </Apparition>
      </GroupeApparition>
      <div className="grid grid-cols-2 gap-3 min-[1200px]:hidden">
        {f.images.slice(0, 6).map((src) => (
          <Image key={src} alt="" src={src} width={1600} height={1067} sizes="50vw" className="h-auto w-full" />
        ))}
      </div>
      <ol className="mt-20 border-t border-ink min-[810px]:mt-28">
        {f.fonctions.map((fn, i) => (
          <Apparition key={fn.titre} as="li" delai={70 * i} className="grid gap-2 border-b border-rule py-5 min-[810px]:grid-cols-12 min-[810px]:gap-6">
            <p className="font-display text-lead min-[810px]:col-span-4">{fn.titre}</p>
            <p className="max-w-[44ch] text-graphite min-[810px]:col-span-7 min-[810px]:col-start-6">{fn.texte}</p>
          </Apparition>
        ))}
      </ol>
    </section>
  );
}
