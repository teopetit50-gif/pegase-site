"use client";

/* ══════════════════════════════════════════════════════════════════════
   LES RÈGLES DE MARGE — décalque de l'« EdgeRulers » de la référence.

   Les deux marges de la page (32 / 52 / 72 px selon la largeur) portent une
   hachure horizontale très fine. Elle n'est pas un motif répété : la marge
   est découpée en tronçons, un par élément marqué `data-gutter-guide`
   (« top » = son bord haut, « bottom » = son bord bas), et dans chaque
   tronçon le pas de la hachure est ajusté (≈ 7 px) pour TOMBER JUSTE sur
   ses deux bords. C'est ce qui fait que chaque filet horizontal de la page
   se prolonge exactement dans la marge.

   La position des repères dépend de la mise en page réelle : elle est
   mesurée dans le navigateur, et remesurée quand la page ou un repère
   change de taille. Le HTML servi ne contient donc que les deux cadres
   vides, comme sur la référence.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";

type Props = {
  couleur?: string;
  /** false : le premier tronçon commence 1 px plus bas (pied de page). */
  repereHaut?: boolean;
  /** false : pas de tronçon après le dernier repère (pied de page). */
  repereBas?: boolean;
};

export default function SxRegles({ couleur = "#dcdcda", repereHaut = true, repereBas = true }: Props) {
  const racine = useRef<HTMLDivElement | null>(null);
  const [reperes, setReperes] = useState<number[]>([]);

  useEffect(() => {
    const el = racine.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    let image = 0;
    const mesurer = () => {
      const cadre = el.getBoundingClientRect();
      const points = [0, cadre.height - 1];
      parent.querySelectorAll<HTMLElement>("[data-gutter-guide]").forEach((g) => {
        const b = g.getBoundingClientRect();
        const y = g.dataset.gutterGuide === "bottom" ? Math.round(b.top + b.height) - 1 : Math.round(b.top);
        points.push(y - Math.round(cadre.top));
      });
      const tries = [...new Set(points.filter((v) => v >= 0 && v < cadre.height))].sort((a, b) => a - b);
      setReperes((avant) =>
        avant.length === tries.length && avant.every((v, i) => Math.abs(v - tries[i]) < 0.1) ? avant : tries,
      );
    };
    const planifier = () => {
      cancelAnimationFrame(image);
      image = requestAnimationFrame(mesurer);
    };
    const taille = new ResizeObserver(planifier);
    taille.observe(parent);
    parent.querySelectorAll("[data-gutter-guide]").forEach((g) => taille.observe(g));
    window.addEventListener("resize", planifier);
    window.addEventListener("scroll", planifier, { passive: true });
    planifier();
    return () => {
      taille.disconnect();
      window.removeEventListener("resize", planifier);
      window.removeEventListener("scroll", planifier);
      cancelAnimationFrame(image);
    };
  }, []);

  return (
    <div
      ref={racine}
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-1/2 z-0 mx-auto w-full max-w-[1920px] -translate-x-1/2"
    >
      {["left-0 border-r", "right-0 border-l"].map((cote) => (
        <div
          key={cote}
          className={`absolute inset-y-0 border-solid ${cote} w-[32px] ipad:w-[52px] desktop-sm:w-[72px]`}
          style={{ borderColor: couleur }}
        >
          {(repereBas ? reperes : reperes.slice(0, -1)).map((y, i) => {
            const h = (reperes[i + 1] ?? y + 1) - y;
            const pas = h / Math.max(1, Math.round(h / 7));
            const saut = i === 0 && !repereHaut ? 1 : 0;
            return (
              <span
                key={i}
                className="absolute inset-x-0"
                style={{
                  top: y + saut,
                  height: h - saut,
                  backgroundImage: `linear-gradient(to bottom, ${couleur} 1px, transparent 1px)`,
                  backgroundSize: `100% ${pas}px`,
                  backgroundPosition: saut ? `0 ${pas - saut}px` : undefined,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
