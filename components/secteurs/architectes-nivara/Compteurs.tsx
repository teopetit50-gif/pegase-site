"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani sur le gabarit Nivara — Compteurs.tsx (09/11/2026)
   La section de chiffres collée de la référence (« Since 2011 ») :
   section `h-[260svh]`, cadre `sticky top-0 h-svh`, photo sous un
   `clip-path` qui s'ouvre au défilement puis un voile encre, bloc de
   texte centré (grille 12 : h2 `text-small` sur 3, chapô `font-statement
   text-h4 max-w-[34ch]` sur 8 à partir de la 5e, `dl` à deux colonnes
   `gap-x-6 gap-y-10` : filet `bg-paper/30`, libellé `text-small
   text-paper/70 pt-4`, valeur `font-headline text-title`).
   Relevé du défilement (f = fraction de la hauteur de section) :
   · cadre `inset(30% 35%)` → `inset(0)` et échelle 1,25 → 1 sur
     f ∈ [0 ; 0,33] ;
   · voile 0 → 0,55 sur f ∈ [0,17 ; 0,40] ;
   · texte opacité 0 → 1 et 40 px → 0 sur f ∈ [0,35 ; 0,50] ;
   · filets et valeurs sur f ∈ [0,38 ; 0,60].
   Ce n'est pas une apparition mais un mouvement lié au défilement : il
   est gardé tel quel. Textes : les compteurs de la page actuelle.
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import { useEffect, useRef } from "react";
import { COMPTEURS } from "./textes";

const borne = (x: number) => Math.min(1, Math.max(0, x));
const lin = (f: number, a: number, b: number) => borne((f - a) / (b - a));

export default function Compteurs() {
  const section = useRef<HTMLElement>(null);
  const cadre = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLDivElement>(null);
  const voile = useRef<HTMLDivElement>(null);
  const texte = useRef<HTMLDivElement>(null);
  const liste = useRef<HTMLDListElement>(null);

  useEffect(() => {
    const s = section.current;
    if (!s) return;
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let planifie = 0;
    const poser = () => {
      planifie = 0;
      const r = s.getBoundingClientRect();
      const f = reduit ? 1 : borne(-r.top / r.height);
      const t = lin(f, 0, 0.33);
      if (cadre.current) cadre.current.style.clipPath = `inset(${(30 * (1 - t)).toFixed(3)}% ${(35 * (1 - t)).toFixed(3)}%)`;
      if (photo.current) photo.current.style.transform = `scale(${(1.25 - 0.25 * t).toFixed(4)})`;
      if (voile.current) voile.current.style.opacity = (0.55 * lin(f, 0.17, 0.4)).toFixed(3);
      const u = lin(f, 0.35, 0.5);
      if (texte.current) {
        texte.current.style.opacity = u.toFixed(3);
        texte.current.style.transform = `translateY(${(40 * (1 - u)).toFixed(1)}px)`;
      }
      if (liste.current) {
        const v = lin(f, 0.38, 0.6);
        liste.current.querySelectorAll<HTMLElement>("[data-filet]").forEach((el) => (el.style.transform = `scaleX(${v.toFixed(3)})`));
        liste.current.querySelectorAll<HTMLElement>("dd").forEach((el) => {
          el.style.opacity = v.toFixed(3);
          el.style.transform = `translateY(${(20 * (1 - v)).toFixed(1)}px)`;
        });
      }
    };
    const au = () => {
      if (!planifie) planifie = requestAnimationFrame(poser);
    };
    window.addEventListener("scroll", au, { passive: true });
    window.addEventListener("resize", au);
    poser();
    return () => {
      window.removeEventListener("scroll", au);
      window.removeEventListener("resize", au);
      if (planifie) cancelAnimationFrame(planifie);
    };
  }, []);

  return (
    <section ref={section} aria-labelledby="compteurs-title" className="relative mt-28 h-[260svh] min-[810px]:mt-40">
      <div className="sticky top-0 h-svh overflow-hidden">
        <div ref={cadre} className="absolute inset-0 bg-ink" style={{ clipPath: "inset(30% 35%)" }}>
          <div ref={photo} className="absolute inset-0" style={{ transform: "scale(1.25)" }}>
            <Image alt="" src={COMPTEURS.image} fill sizes="100vw" className="object-cover" />
          </div>
          <div ref={voile} className="absolute inset-0 bg-ink" style={{ opacity: 0 }} />
        </div>
        <div
          ref={texte}
          className="pointer-events-none relative mx-auto flex h-full w-full max-w-[1600px] flex-col justify-center px-4 text-paper min-[810px]:px-8"
          style={{ opacity: 0, transform: "translateY(40px)" }}
        >
          <div className="grid gap-10 min-[810px]:grid-cols-12">
            <h2 id="compteurs-title" className="text-small min-[810px]:col-span-3">
              {COMPTEURS.titre}
            </h2>
            <p className="max-w-[34ch] font-statement text-h4 min-[810px]:col-span-8 min-[810px]:col-start-5">
              {COMPTEURS.sous}
            </p>
            <dl ref={liste} className="grid grid-cols-2 gap-x-6 gap-y-10 min-[810px]:col-span-8 min-[810px]:col-start-5 min-[810px]:mt-6">
              {COMPTEURS.valeurs.map((v) => (
                <div key={v.libelle}>
                  <dt className="text-small text-paper/70">
                    <span data-filet className="block h-px origin-left bg-paper/30" style={{ transform: "scaleX(0)" }} />
                    <span className="block pt-4">{v.libelle}</span>
                  </dt>
                  <dd className="mt-2 font-headline text-title leading-none" style={{ opacity: 0, transform: "translateY(20px)" }}>
                    <span className="tabular-nums">{v.valeur}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
