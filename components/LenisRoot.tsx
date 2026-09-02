"use client";

/* ══════════════════════════════════════════════════════════════════════
   LenisRoot — UNE instance Lenis pour tout le site (01/09/2026)

   Jusqu'ici PageMotion créait un Lenis par page et le détruisait à la
   navigation : l'inertie en cours mourait avec lui, et la nouvelle page
   « redescendait » parfois vers l'ancienne cible. Ici l'instance vit dans
   le layout racine, survit aux navigations, et :
     · `stopInertiaOnNavigate` remet le scroll à zéro au clic d'un lien
       interne (Lenis 1.3), `popstate` fait de même pour le bouton retour
       — le scrollIntoView de Next n'est plus jamais contredit ;
     · le panneau du Header (data-menu-open sur <html>) met Lenis en
       pause, comme avant, mais l'observateur persiste lui aussi ;
     · prefers-reduced-motion est suivi EN DIRECT : la préférence changée
       en cours de session démonte (ou remonte) Lenis.

   ScrollTrigger reste synchronisé (lenis → ScrollTrigger.update, une seule
   boucle sur gsap.ticker) ; PageMotion ne garde que les reveals.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

export default function LenisRoot() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const root = document.documentElement;
    let lenis: Lenis | null = null;
    let tick: ((t: number) => void) | null = null;

    const syncMenu = () => {
      if (!lenis) return;
      if (root.dataset.menuOpen === "true") lenis.stop();
      else lenis.start();
    };
    const obs = new MutationObserver(syncMenu);
    /* stop() puis start() : les deux appellent le reset() privé de Lenis */
    const onPop = () => {
      if (!lenis) return;
      lenis.stop();
      lenis.start();
    };

    const monter = () => {
      if (lenis || mq.matches) return;
      lenis = new Lenis({ lerp: 0.1, stopInertiaOnNavigate: true });
      lenis.on("scroll", ScrollTrigger.update);
      tick = (t) => lenis?.raf(t * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      obs.observe(root, { attributes: true, attributeFilter: ["data-menu-open"] });
      syncMenu();
      window.addEventListener("popstate", onPop);
    };
    const demonter = () => {
      if (!lenis) return;
      window.removeEventListener("popstate", onPop);
      obs.disconnect();
      if (tick) gsap.ticker.remove(tick);
      lenis.destroy();
      lenis = null;
      tick = null;
    };
    const onChange = () => (mq.matches ? demonter() : monter());

    monter();
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
      demonter();
    };
  }, []);

  return null;
}
