"use client";

import { useEffect, useRef, type ReactNode } from "react";

/* ══ les cartes blanches de la référence ══════════════════════════════
   Relevé au défilement (CDP, 1440 × 900, 24/09) sur les cartes de
   concurrence.com : la carte est pleine largeur tant qu'elle occupe
   l'écran, et se resserre jusqu'à 32 px de chaque côté —
   • en SORTANT, selon la position de son BAS : 0 px quand le bas passe
     sous le bord de l'écran, 4 / 15 / 26 / 32 px quand il est à 93 / 76 /
     60 / 42 % de la hauteur (Teo : « elle est censée disparaître, fin
     dézoomer ») ;
   • en ENTRANT, selon la position de son HAUT : 26 / 15 / 5 / 0 px quand
     il est à 90 / 74 / 57 / 40 % de la hauteur.
   Rien sous 1024 : sur téléphone la carte reste pleine largeur. La valeur
   est écrite dans --nm-marge (distribution.css, .nm-carte). La première
   version se calait sur le HAUT à la sortie : juste pour le hero, faux
   pour les cartes plus hautes que l'écran, qui se resserraient trop tôt. */
export default function CarteBlanche({ className = "", children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const poser = () => {
      if (window.innerWidth < 1024) {
        el.style.setProperty("--nm-marge", "0px");
        return;
      }
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const borne = (x: number) => Math.min(1, Math.max(0, x));
      const entree = Math.pow(borne((r.top - 0.4 * vh) / (0.55 * vh)), 1.4);
      const sortie = 1 - Math.pow(1 - borne((vh - r.bottom) / (0.55 * vh)), 1.3);
      el.style.setProperty("--nm-marge", `${(32 * Math.max(entree, sortie)).toFixed(1)}px`);
    };
    /* directement sur l'événement, sans requestAnimationFrame : un rAF en
       attente qui ne tire pas (onglet ralenti, capture) bloquait toutes
       les mises à jour suivantes. Le défilement ne tire déjà qu'une fois
       par image. */
    poser();
    window.addEventListener("scroll", poser, { passive: true });
    window.addEventListener("resize", poser, { passive: true });
    return () => {
      window.removeEventListener("scroll", poser);
      window.removeEventListener("resize", poser);
    };
  }, []);
  return (
    <section ref={ref} data-header-theme="default" className={`nm-carte ${className}`}>
      {children}
    </section>
  );
}
