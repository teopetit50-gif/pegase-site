"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — apparition.tsx
   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   ui/reveal.tsx`. Ce qui change : l'observateur ne cherche les `[data-reveal]` que DANS la page Lorani (`.p-architectes`) ; la source les cherchait dans tout le document, et le site pourrait un jour en porter ailleurs.
   Ce qu'en disait la source :
   ══════════════════════════════════════════════════════════════════════ */
/* Fait apparaître les éléments marqués data-reveal (états initiaux framer-motion de la référence : opacité 0,
   translation de 8 à 20 px) quand ils entrent dans la fenêtre. */
import { useEffect } from "react";
export default function Reveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".p-architectes [data-reveal]"));
    const io = new IntersectionObserver(
      (en) => {
        for (const e of en)
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
      },
      { threshold: 0.15 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return null;
}
