"use client";

/* Couche motion COMMUNE à toutes les pages (extraite de SolutionsMotion le
   22/07 pour l'alignement charte v2 de /contact, /articles, /audit et des
   fiches moteurs) — reveals GSAP staggerés sur [data-reveal], blur-in
   unique des intertitres [data-intertitre], entrée spéciale des tuiles
   claires [data-claire] (scale 0.96→1 + montée de luminosité).

   01/09 — Lenis n'est plus créé ici : une seule instance vit dans le layout
   racine (components/LenisRoot.tsx), avec l'observateur du menu. Et les
   reveals ne prennent QUE ce qui est sous la ligne de flottaison : le
   premier écran appartient à la cascade de components/Arrivee.tsx — avant,
   le fondu de page et les reveals se superposaient sur les mêmes blocs.

   prefers-reduced-motion : aucun tween — page statique. Les éléments sont
   visibles par défaut : GSAP ne fait que les entrées, donc une panne de JS
   ne masque jamais le contenu. */

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* easing charte [0.16,1,0.3,1] ≈ power4.out — punchy, jamais d'ease-in */
const EASE = "power4.out";

/* position DANS LE DOCUMENT (indépendante du scroll courant, que Next
   remet à zéro dans le même cycle) ≥ hauteur de fenêtre */
const sousLaLigne = (sel: string) =>
  gsap.utils
    .toArray<HTMLElement>(sel)
    .filter((el) => el.getBoundingClientRect().top + window.scrollY >= window.innerHeight);

export default function PageMotion() {
  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /* ——— reveals des tuiles et blocs ——— */
    const reveals = sousLaLigne("[data-reveal]");
    if (reveals.length) {
      ScrollTrigger.batch(reveals, {
        start: "top 88%",
        once: true,
        onEnter: (els) =>
          gsap.fromTo(
            els,
            { opacity: 0, y: 26 },
            { opacity: 1, y: 0, duration: 0.75, ease: EASE, stagger: 0.07, overwrite: true }
          ),
      });
    }

    /* ——— intertitres : blur-in discret, une seule fois ——— */
    sousLaLigne("[data-intertitre]").forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, filter: "blur(10px)", y: 10 },
        {
          opacity: 1,
          filter: "blur(0px)",
          y: 0,
          duration: 0.8,
          ease: EASE,
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        }
      );
    });

    /* ——— tuile claire : scale + montée de luminosité ——— */
    sousLaLigne("[data-claire]").forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, scale: 0.96, filter: "brightness(0.65)" },
        {
          opacity: 1,
          scale: 1,
          filter: "brightness(1)",
          duration: 0.9,
          ease: EASE,
          scrollTrigger: { trigger: el, start: "top 82%", once: true },
        }
      );
    });

    /* ——— filets de sécurité ———
       1. les positions des triggers sont calculées au montage ; si la page
          se monte avant que polices/images aient fixé la mise en page (ou
          dans un onglet dont le viewport n'est pas encore dimensionné), les
          starts sont faux et les entrées ne partent jamais.
       2. dans ce cas les éléments resteraient à opacity 0 — c'est-à-dire du
          contenu invisible. Le watchdog les rend visibles quoi qu'il arrive
          (la cascade d'Arrivee est finie depuis longtemps à 2,5 s). */
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);

    const watchdog = window.setTimeout(() => {
      document
        .querySelectorAll<HTMLElement>(
          "[data-reveal], [data-intertitre], [data-claire], [data-arrivee]"
        )
        .forEach((el) => {
          /* uniquement ce qui est DANS le premier écran : plus bas, une
             opacité basse signifie « pas encore révélé », pas « bloqué » */
          const r = el.getBoundingClientRect();
          if (r.top > window.innerHeight) return;
          if (parseFloat(getComputedStyle(el).opacity) < 0.95) {
            gsap.set(el, { opacity: 1, y: 0, scale: 1, clearProps: "filter" });
          }
        });
    }, 2500);

    return () => {
      window.removeEventListener("load", onLoad);
      window.clearTimeout(watchdog);
    };
  });

  return null;
}
