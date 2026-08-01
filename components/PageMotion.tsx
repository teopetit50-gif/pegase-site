"use client";

/* Couche motion COMMUNE à toutes les pages (extraite de SolutionsMotion le
   22/07 pour l'alignement charte v2 de /contact, /articles, /audit et des
   fiches moteurs) — LENIS (lerp 0.1) synchronisé ScrollTrigger (une seule
   boucle : lenis.raf piloté par gsap.ticker, lagSmoothing 0), reveals GSAP
   staggerés sur [data-reveal], blur-in unique des intertitres
   [data-intertitre], entrée spéciale des tuiles claires [data-claire]
   (scale 0.96→1 + montée de luminosité).

   prefers-reduced-motion : lenis coupé, aucun tween — page statique. Les
   éléments sont visibles par défaut : GSAP ne fait que les entrées, donc
   une panne de JS ne masque jamais le contenu. */

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* easing charte [0.16,1,0.3,1] ≈ power4.out — punchy, jamais d'ease-in */
const EASE = "power4.out";

export default function PageMotion() {
  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /* ——— lenis, une seule boucle avec gsap.ticker ——— */
    const lenis = new Lenis({ lerp: 0.1 });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    /* ——— reveals des tuiles et blocs ——— */
    ScrollTrigger.batch("[data-reveal]", {
      start: "top 88%",
      once: true,
      onEnter: (els) =>
        gsap.fromTo(
          els,
          { opacity: 0, y: 26 },
          { opacity: 1, y: 0, duration: 0.75, ease: EASE, stagger: 0.07, overwrite: true }
        ),
    });

    /* ——— intertitres : blur-in discret, une seule fois ——— */
    gsap.utils.toArray<HTMLElement>("[data-intertitre]").forEach((el) => {
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
    gsap.utils.toArray<HTMLElement>("[data-claire]").forEach((el) => {
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

    /* ——— menu ouvert : lenis en pause ———
       `overflow: hidden` sur <html> n'arrête pas lenis, qui pilote un scroll
       virtuel : sans cela la page continue de défiler sous le panneau. Le
       Header pose data-menu-open sur <html>, on l'observe ici. */
    const root = document.documentElement;
    const syncMenu = () => {
      if (root.dataset.menuOpen === "true") lenis.stop();
      else lenis.start();
    };
    const menuObs = new MutationObserver(syncMenu);
    menuObs.observe(root, { attributes: true, attributeFilter: ["data-menu-open"] });
    syncMenu();

    /* ——— filets de sécurité ———
       1. les positions des triggers sont calculées au montage ; si la page
          se monte avant que polices/images aient fixé la mise en page (ou
          dans un onglet dont le viewport n'est pas encore dimensionné), les
          starts sont faux et les entrées ne partent jamais.
       2. dans ce cas les éléments resteraient à opacity 0 — c'est-à-dire du
          contenu invisible. Le watchdog les rend visibles quoi qu'il arrive. */
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);

    const watchdog = window.setTimeout(() => {
      document
        .querySelectorAll<HTMLElement>("[data-reveal], [data-intertitre], [data-claire]")
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
      menuObs.disconnect();
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  });

  return null;
}
