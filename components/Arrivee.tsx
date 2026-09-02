"use client";

/* ══════════════════════════════════════════════════════════════════════
   Arrivee — la cascade du premier écran (01/09/2026)

   Remplace le fondu global `page-arrivee` (tout <main> à opacité 0, 0,45 s)
   qui faisait apparaître la page d'un bloc, puis laissait les reveals GSAP
   rejouer par-dessus. Ici la nouvelle page est du DOM vivant dès la
   première image (le <ViewTransition> de PageShell a `enter="none"`) ; seuls
   les éléments marqués [data-arrivee="rôle"] du premier écran partent à 0
   et arrivent EN CASCADE — titre, puis chapô, puis bloc, puis colonnes —
   avec la bezier charte et les temps de lib/transitions.ts.

   Tourne en useLayoutEffect : DANS le callback `update` de la transition,
   avant toute peinture — aucun élément n'est jamais vu à mi-fondu.
   Sous prefers-reduced-motion rien n'est posé à 0 : tout est visible par
   défaut, une panne de JS n'a jamais masqué le contenu.
   ══════════════════════════════════════════════════════════════════════ */

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { CASCADE, EASE_CHARTE, PAS, PORTES, POSE_OBJET, memoire, type Role } from "@/lib/transitions";

gsap.registerPlugin(CustomEase);
CustomEase.create("charte", EASE_CHARTE);

export default function Arrivee() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const depuis = memoire.route;
    memoire.route = pathname;

    /* premier écran = position DANS LE DOCUMENT < hauteur de fenêtre :
       au moment où l'on mesure, Next n'a pas forcément déjà remis le
       scroll à zéro — la mesure relative au document ne dépend pas de
       l'ordre des effets. */
    const els = gsap.utils
      .toArray<HTMLElement>("[data-arrivee]")
      .filter((el) => el.getBoundingClientRect().top + window.scrollY < window.innerHeight);
    if (!els.length) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const mode =
      depuis === null ? "direct" : pathname === "/commencer" && depuis in PORTES ? "retour" : "aller";
    const table = CASCADE[mode];
    const porteRecue = mode === "retour" && depuis ? PORTES[depuis] : null;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "charte", overwrite: true },
        /* rend aux cartes leur translateY de survol */
        onComplete: () => gsap.set(els, { clearProps: "transform,opacity,willChange" }),
      });
      let iCol = 0;

      els.forEach((el) => {
        const role = el.dataset.arrivee as Role;
        const t = table[role];
        if (!t) return;
        let [delai, duree, y] = t;
        if (role === "colonne") {
          delai += (mode === "retour" ? PAS.carteRetour : PAS.colonne) * iCol++;
        }
        /* retour : la carte qui reçoit la pastille / le cadre apparaît en
           place, à l'instant où l'objet se pose — pas de montée */
        if (porteRecue && el.dataset.porte === porteRecue) {
          delai = POSE_OBJET[porteRecue];
          duree = 120;
          y = 0;
        }
        gsap.set(el, { opacity: 0, y: role === "collage" ? 0 : y, willChange: "transform,opacity" });
        tl.to(el, { opacity: 1, y: 0, duration: duree / 1000 }, delai / 1000);
      });

      /* chargement direct : on attend les polices, sinon les métriques
         bougent sous la cascade */
      if (mode === "direct" && document.fonts.status !== "loaded") {
        tl.pause();
        document.fonts.ready.then(() => tl.play());
      }

      const finir = () => tl.progress(1);
      mq.addEventListener("change", finir);
      return () => mq.removeEventListener("change", finir);
    });

    return () => ctx.revert();
  }, [pathname]);

  return null;
}
