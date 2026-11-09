"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani sur le gabarit Nivara — parallaxe.ts (09/11/2026)
   La référence déplace ses images au défilement (le cadre du premier
   écran suit à 45 % du défilement, la photo de clôture va de −12 % à
   +12 %, les images éparses et les planches ont chacune leur vitesse).
   Un seul mécanisme ici : à chaque défilement, cadencé à l'image, on
   donne à l'appelant la position de l'élément dans la fenêtre
   (0 = son haut entre par le bas, 1 = son bas sort par le haut) et le
   défilement courant ; il pose ce qu'il veut. Rien en mouvement réduit.
   ══════════════════════════════════════════════════════════════════════ */
import { useEffect, useRef } from "react";

export function useParallaxe<T extends HTMLElement>(
  poser: (el: T, progression: number, scrollY: number, rect: DOMRect) => void,
) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let planifie = 0;
    const mesurer = () => {
      planifie = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      poser(el, p, window.scrollY, r);
    };
    const au = () => {
      if (!planifie) planifie = requestAnimationFrame(mesurer);
    };
    window.addEventListener("scroll", au, { passive: true });
    window.addEventListener("resize", au);
    mesurer();
    return () => {
      window.removeEventListener("scroll", au);
      window.removeEventListener("resize", au);
      if (planifie) cancelAnimationFrame(planifie);
    };
  }, [poser]);
  return ref;
}
