"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani sur le gabarit Nivara — Curseur.tsx (09/11/2026)
   Le curseur de la référence : au-dessus d'un `[data-cursor]` (le
   carrousel, la clôture), une étiquette capitale suit la souris —
   relevée dans son DOM au survol : `fixed top-0 left-0 z-[60]`, puis un
   `span absolute top-6 left-4 min-w-24 bg-ink/35 px-6 py-3.5 text-caption
   tracking-[0.14em] uppercase backdrop-blur-md`. Seulement sur un
   pointeur fin qui sait survoler.
   ══════════════════════════════════════════════════════════════════════ */
import { useEffect, useRef } from "react";

export default function Curseur() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const etiquette = el.firstElementChild as HTMLSpanElement;
    const bouger = (e: PointerEvent) => {
      el.style.transform = `translateX(${e.clientX}px) translateY(${e.clientY}px)`;
      const cible = (e.target as Element | null)?.closest?.("[data-cursor]");
      if (cible) {
        etiquette.textContent = cible.getAttribute("data-cursor");
        el.dataset.visible = "";
      } else delete el.dataset.visible;
    };
    document.addEventListener("pointermove", bouger, { passive: true });
    return () => document.removeEventListener("pointermove", bouger);
  }, []);
  return (
    <div ref={ref} aria-hidden="true" className="n-curseur">
      <span />
    </div>
  );
}
