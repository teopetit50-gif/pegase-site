"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — onglets.tsx
   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   ui/scroll-spy.tsx`. Rien ne change : le sélecteur des boutons est passé par page.tsx.
   Ce qu'en disait la source :
   ══════════════════════════════════════════════════════════════════════ */
/* Barre latérale de la section « Fonctionnement » : le bouton dont la section est dans la fenêtre porte data-state="active"
   (même mécanique que le composant scroll-spy de 21st.dev repris pour RentalOS). */
import { useEffect } from "react";
export default function ScrollSpy({ ids, buttons, labels }: { ids: string[]; buttons: string; labels: string[] }) {
  useEffect(() => {
    const btns = Array.from(document.querySelectorAll<HTMLElement>(buttons)).filter((b) =>
      labels.includes((b.textContent || "").trim()),
    );
    const secs = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    if (!secs.length) return;
    const set = (id: string) =>
      btns.forEach((b, i) => {
        if (ids[i] === id) b.setAttribute("data-state", "active");
        else b.removeAttribute("data-state");
      });
    const io = new IntersectionObserver(
      (en) => {
        const vis = en.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (vis) set((vis.target as HTMLElement).id);
      },
      { rootMargin: "-40% 0px -45% 0px", threshold: [0, 0.2, 0.5] },
    );
    secs.forEach((s) => io.observe(s));
    btns.forEach((b, i) =>
      b.addEventListener("click", () => secs[i]?.scrollIntoView({ behavior: "smooth", block: "start" })),
    );
    return () => io.disconnect();
  }, [ids, buttons, labels]);
  return null;
}
