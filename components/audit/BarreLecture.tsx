"use client";

/* Barre de lecture du pré-audit — fil noir 2 px en haut du viewport, rempli
   au prorata du défilement (pattern « reading progress » 21st.dev).
   Le transform est posé directement sur l'élément (pas de variable CSS
   héritée), throttlé rAF ; scroll-linked, donc pas de transition. Vit HORS
   du wrapper .resa : son clip-path rognerait un position:fixed. */

import { useEffect, useRef } from "react";

export default function BarreLecture() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const maj = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      el.style.transform = `scaleX(${p})`;
    };
    const demande = () => {
      if (!raf) raf = requestAnimationFrame(maj);
    };
    maj();
    window.addEventListener("scroll", demande, { passive: true });
    window.addEventListener("resize", demande, { passive: true });
    return () => {
      window.removeEventListener("scroll", demande);
      window.removeEventListener("resize", demande);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} aria-hidden className="pa-lecture" />;
}
