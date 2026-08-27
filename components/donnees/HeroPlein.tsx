"use client";

import { useEffect, useRef } from "react";

/* ══════════════════════════════════════════════════════════════════════
   /vos-donnees — le hero qui se replie (08/08/2026)

   Demande de Teo : en haut de page l'image occupe tout l'écran ; dès qu'on
   fait défiler, elle se replie dans le cadre arrondi où elle se trouve
   aujourd'hui — marges de 16, rayon de 24, hauteur 720.

   LE PIÈGE, ET COMMENT IL EST ÉVITÉ. La façon naïve est d'animer la hauteur
   du hero : le reste de la page remonte alors plus vite qu'on ne défile, la
   hauteur du document change à chaque image, et le défilement part en
   crabe — c'est le défaut classique de cet effet. Ici la BOÎTE DE FLUX ne
   bouge jamais : `.vd-hero-scene` fait 720 (480 en dessous de 768) du début
   à la fin. C'est le hero, en position absolue à l'intérieur, qui déborde
   vers le bas et sur les côtés quand on est en haut, puis rentre dans sa
   boîte. Zéro recalcul de mise en page, zéro saut.

   Ce composant ne fait qu'une chose : écrire `--vd-p` (0 → 1) sur la scène,
   à chaque image, dans une boucle rAF. Toute la géométrie est en CSS, dans
   le bloc `.vd` de globals.css.

   SANS JAVASCRIPT, ou avant l'hydratation : `data-plein` n'est pas posé, et
   la scène garde sa mise en page statique — le cadre arrondi, tel qu'il
   était avant cet effet. Rien ne clignote et rien ne casse.

   `prefers-reduced-motion` : `--vd-p` est figé à 1. Le hero est directement
   dans son cadre, l'effet n'a jamais lieu.
   ══════════════════════════════════════════════════════════════════════ */

/* Distance de défilement sur laquelle le repli se joue. 360 : assez long
   pour qu'on voie le mouvement, assez court pour que le pli soit fini avant
   que le titre n'atteigne le haut de l'écran. */
const COURSE = 360;

export default function HeroPlein({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = ref.current;
    if (!scene) return;

    const moinsDeMouvement = window.matchMedia("(prefers-reduced-motion: reduce)");
    let rafId = 0;
    let dernier = -1;
    let mesureL = -1;
    let mesureH = -1;

    /* hauteur de l'état « plein » : du haut de la scène au bas de la fenêtre.
       Mesurée plutôt que codée en dur — le bandeau d'annonce est refermable,
       donc le haut de la scène n'est pas à une position connue d'avance. */
    const mesurer = () => {
      mesureL = window.innerWidth;
      mesureH = window.innerHeight;
      const fin = mesureL >= 768 ? 720 : 480;
      const haut = scene.getBoundingClientRect().top + window.scrollY;
      scene.style.setProperty(
        "--vd-hero-plein",
        `${Math.max(fin, mesureH - haut)}px`,
      );
      dernier = -1;
    };

    const peindre = () => {
      rafId = 0;
      /* Filet de sécurité : si la fenêtre a changé de taille sans que
         l'évènement `resize` nous parvienne — ça arrive quand la mesure
         initiale tombe avant que le conteneur ait sa taille définitive — on
         re-mesure. La comparaison est gratuite ; le `getBoundingClientRect`
         qui coûte n'a lieu que si les dimensions ont bougé. */
      if (window.innerWidth !== mesureL || window.innerHeight !== mesureH) {
        mesurer();
      }
      const p = moinsDeMouvement.matches
        ? 1
        : Math.min(1, Math.max(0, window.scrollY / COURSE));
      /* on n'écrit que si la valeur bouge d'au moins 1/500 : au repos, en bas
         de page, la boucle ne touche plus au style et le navigateur n'a plus
         rien à repeindre. */
      if (Math.abs(p - dernier) < 0.002) return;
      dernier = p;
      scene.style.setProperty("--vd-p", p.toFixed(4));
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
    <div ref={ref} className="vd-hero-scene">
      {children}
    </div>
  );
}
