"use client";

import { useEffect, useRef } from "react";

/* ══════════════════════════════════════════════════════════════════════
   /offres/sur-mesure — le hero qui se replie (16/09/2026)

   Teo : « cette section a un effet, genre elle se réduit quand on défile,
   je veux le même. » En haut de page l'image occupe tout l'écran ; dès
   qu'on fait défiler, elle rentre dans le cadre arrondi où elle est
   aujourd'hui — marges de 16, rayon 24, hauteur 480 (720 dès 768).

   Repris de components/donnees/HeroPlein.tsx (08/08), qui fait la même
   chose pour /vos-donnees. Deux différences seulement : la variable
   s'appelle `--smd-p` et la géométrie vit dans le bloc de CETTE page.
   Le mécanisme, lui, est identique — et ses raisons aussi :

   LE PIÈGE, ET COMMENT IL EST ÉVITÉ. La façon naïve est d'animer la
   hauteur du hero : le reste de la page remonte alors plus vite qu'on ne
   défile, la hauteur du document change à chaque image, et le défilement
   part en crabe. Ici la BOÎTE DE FLUX ne bouge jamais : `.smd-scene` fait
   480 (720 dès 768) du début à la fin. C'est le hero, en position absolue
   à l'intérieur, qui déborde vers le bas et sur les côtés quand on est en
   haut, puis rentre dans sa boîte. Zéro recalcul de mise en page, zéro
   saut.

   Ce composant ne fait qu'une chose : écrire `--smd-p` (0 → 1) sur la
   scène, à chaque image. Toute la géométrie est en CSS.

   SANS JAVASCRIPT, ou avant l'hydratation : `data-plein` n'est pas posé
   et la scène garde sa mise en page statique — le cadre arrondi, tel
   qu'il était avant cet effet. Rien ne clignote, rien ne casse.

   `prefers-reduced-motion` : `--smd-p` est figé à 1, le hero est
   directement dans son cadre et l'effet n'a jamais lieu.
   ══════════════════════════════════════════════════════════════════════ */

/* Distance de défilement sur laquelle le repli se joue. 360 : assez long
   pour qu'on voie le mouvement, assez court pour que le pli soit fini
   avant que le titre n'atteigne le haut de l'écran. */
const COURSE = 360;

export default function HeroReplie({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = ref.current;
    if (!scene) return;

    const moinsDeMouvement = window.matchMedia("(prefers-reduced-motion: reduce)");
    let rafId = 0;
    let dernier = -1;
    let mesureL = -1;
    let mesureH = -1;

    /* Hauteur de l'état « plein » : du haut de la scène au bas de la
       fenêtre. MESURÉE et non codée en dur — la hauteur de l'entête
       dépend du palier, et la scène n'est pas à une position connue
       d'avance. */
    const mesurer = () => {
      mesureL = window.innerWidth;
      mesureH = window.innerHeight;
      const fin = mesureL >= 768 ? 720 : 480;
      const haut = scene.getBoundingClientRect().top + window.scrollY;
      scene.style.setProperty("--smd-hero-plein", `${Math.max(fin, mesureH - haut)}px`);
      dernier = -1;
    };

    const peindre = () => {
      rafId = 0;
      /* Filet de sécurité : la mesure initiale peut tomber avant que le
         conteneur ait sa taille définitive. La comparaison est gratuite ;
         le `getBoundingClientRect` qui coûte n'a lieu que si les
         dimensions ont bougé. */
      if (window.innerWidth !== mesureL || window.innerHeight !== mesureH) mesurer();
      const p = moinsDeMouvement.matches
        ? 1
        : Math.min(1, Math.max(0, window.scrollY / COURSE));
      /* On n'écrit que si la valeur bouge d'au moins 1/500 : une fois le
         pli fini, la boucle ne touche plus au style et le navigateur n'a
         plus rien à repeindre. */
      if (Math.abs(p - dernier) < 0.002) return;
      dernier = p;
      scene.style.setProperty("--smd-p", p.toFixed(4));
    };

    const planifier = () => {
      if (!rafId) rafId = requestAnimationFrame(peindre);
    };

    mesurer();
    peindre();
    scene.setAttribute("data-plein", "");

    const surRedimension = () => {
      mesurer();
      planifier();
    };

    window.addEventListener("scroll", planifier, { passive: true });
    window.addEventListener("resize", surRedimension);
    moinsDeMouvement.addEventListener("change", planifier);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", planifier);
      window.removeEventListener("resize", surRedimension);
      moinsDeMouvement.removeEventListener("change", planifier);
      scene.removeAttribute("data-plein");
    };
  }, []);

  return (
    <div ref={ref} className="smd-scene">
      {children}
    </div>
  );
}
