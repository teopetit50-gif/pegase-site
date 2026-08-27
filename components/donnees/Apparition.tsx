"use client";

import { useEffect, useRef } from "react";

/* ══════════════════════════════════════════════════════════════════════
   /vos-donnees — apparition au défilement (08/08/2026)

   Teo : « pour les graphs, tu fais un effet qui les fait apparaître ».

   Ce composant ne fait qu'une chose : poser `data-vu` sur son conteneur la
   première fois qu'il entre dans l'écran. Tout le mouvement est en CSS, dans
   le bloc `.vd` de globals.css — le JS ne pilote aucune image, il donne juste
   le départ. C'est ce qui garde l'effet fluide même sur un téléphone lent :
   les animations tournent sur le compositeur, pas dans une boucle rAF.

   L'observateur se débranche dès qu'il a déclenché : l'effet joue une fois,
   il ne se rejoue pas si on remonte. Une animation qui se répète à chaque
   passage devient un tic au bout du troisième aller-retour.

   SANS JAVASCRIPT, ou avant l'hydratation : `data-vu` n'est jamais posé.
   Les règles CSS d'apparition sont donc écrites de façon à ce que l'état
   PAR DÉFAUT soit l'état FINAL (visible) — c'est `data-anime`, posé au
   montage, qui autorise l'état de départ invisible. Une page sans JS montre
   tout, tout de suite, plutôt qu'un bloc vide à jamais.

   `prefers-reduced-motion` : traité en CSS, les éléments sont posés
   directement à leur place sans transition.
   ══════════════════════════════════════════════════════════════════════ */

export default function Apparition({
  children,
  className,
  seuil = 0.15,
}: {
  children: React.ReactNode;
  className?: string;
  /* part de l'élément qui doit être visible pour déclencher. 0.15 convient
     aux blocs hauts (les maquettes) ; on ne veut pas attendre qu'un bloc de
     600 px soit entièrement à l'écran pour l'animer. */
  seuil?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.setAttribute("data-anime", "");

    /* déjà visible au chargement (ancre, rechargement à mi-page) : on montre
       sans attendre un défilement qui ne viendra peut-être jamais */
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * (1 - seuil) && r.bottom > 0) {
      el.setAttribute("data-vu", "");
      return;
    }

    const obs = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (e.isIntersecting) {
            el.setAttribute("data-vu", "");
            obs.disconnect();
          }
        }
      },
      { threshold: seuil },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [seuil]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
