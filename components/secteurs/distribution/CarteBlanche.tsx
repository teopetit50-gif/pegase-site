"use client";

import { useEffect, useRef, type ReactNode } from "react";

/* ══ les cartes blanches de la référence ══════════════════════════════
   Relevé au défilement (CDP, 1440 × 900) : la carte est pleine largeur
   quand elle occupe l'écran, et se resserre jusqu'à 32 px de chaque côté
   quand elle sort par le haut (0 → 12 → 32 px pour 0 → 300 → 600 px de
   défilement) ou tant qu'elle n'est qu'à moitié entrée par le bas. Rien
   sous 1024 : sur téléphone la carte reste pleine largeur. La valeur est
   écrite dans --nm-marge (distribution.css, .nm-carte). */
export default function CarteBlanche({ className = "", children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const doux = (t: number) => 1 - (1 - t) * (1 - t);
    const poser = () => {
      raf = 0;
      if (window.innerWidth < 1024) {
        el.style.setProperty("--nm-marge", "0px");
        return;
      }
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const sortie = Math.min(1, Math.max(0, -r.top / 600));
      const entree = Math.min(1, Math.max(0, (r.top - 0.55 * vh) / (0.45 * vh)));
      el.style.setProperty("--nm-marge", `${(32 * doux(Math.max(sortie, entree))).toFixed(1)}px`);
    };
    const demander = () => {
      if (!raf) raf = requestAnimationFrame(poser);
    };
    poser();
    window.addEventListener("scroll", demander, { passive: true });
    window.addEventListener("resize", demander, { passive: true });
    return () => {
      window.removeEventListener("scroll", demander);
      window.removeEventListener("resize", demander);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <section ref={ref} data-header-theme="default" className={`nm-carte ${className}`}>
      {children}
    </section>
  );
}
