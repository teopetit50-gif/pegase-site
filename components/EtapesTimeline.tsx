"use client";

/* « La mise en place » — timeline verticale à révélation progressive au
   scroll (23/07, Teo : « plus pro, tu slides ça débloque le 1, puis le 2,
   puis le 3 »).

   Un rail vertical se remplit en or à mesure qu'on descend dans la section
   (ScrollTrigger scrub, sans pin — robuste avec lenis) ; chaque étape
   s'allume quand le remplissage atteint son nœud : le nœud passe de grisé-
   creux à noir plein cerclé d'or, le texte remonte à pleine opacité.

   Pilotage de l'état : gsap.to INLINE, avec une garde anti-rebond (on ne
   (ré)anime qu'à la bascule réelle on↔off). Surtout PAS de transition CSS
   sur ces éléments — le scrub rappelle la fonction à chaque frame, et une
   transition CSS relancée en boucle gelait la valeur (bug traqué le 23/07 :
   inline non-important perdu, computed figé à 1). Sans transition CSS,
   l'inline posé par GSAP tient.

   Repli sans JS / prefers-reduced-motion : data-on="on" en dur + règles
   .etape[data-on] de globals.css → tout est actif, aucune étape verrouillée. */

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Etape = { n: string; t: string; d: string };

const NOEUD_ON = {
  backgroundColor: "#0f1013",
  color: "#ffffff",
  borderColor: "rgba(0,0,0,0)",
  boxShadow: "0 0 0 4px rgba(183,134,31,0.18)",
};
const NOEUD_OFF = {
  backgroundColor: "#f6f6f5",
  color: "rgba(15,16,19,0.5)",
  borderColor: "rgba(15,16,19,0.18)",
  boxShadow: "0 0 0 0 rgba(183,134,31,0)",
};

export default function EtapesTimeline({ etapes }: { etapes: Etape[] }) {
  const root = useRef<HTMLOListElement>(null);
  const fill = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const items = gsap.utils.toArray<HTMLElement>("[data-step]", root.current!);
      if (!items.length || !fill.current) return;
      const noeud = (el: HTMLElement) => el.querySelector<HTMLElement>(".etape-noeud");

      /* mise en veille initiale (le repli HTML est « tout actif ») */
      gsap.set(fill.current, { scaleY: 0, transformOrigin: "top" });
      const etat = items.map(() => false);
      items.forEach((el) => {
        el.dataset.on = "off";
        gsap.set(el, { opacity: 0.4 });
        const n = noeud(el);
        if (n) gsap.set(n, NOEUD_OFF);
      });

      const appliquer = (p: number) => {
        gsap.set(fill.current, { scaleY: p });
        items.forEach((el, i) => {
          /* seuil réparti (0,25 / 0,5 / 0,75 pour 3 étapes) plutôt qu'aux
             extrêmes 0 et 1 : les trois étapes s'allument DANS la fenêtre de
             scroll, aucune n'est pré-allumée avant d'arriver ni allumée pile à
             la sortie. */
          const seuil = (i + 1) / (items.length + 1);
          const on = p >= seuil;
          if (etat[i] === on) return; // garde : ne bascule qu'au franchissement
          etat[i] = on;
          el.dataset.on = on ? "on" : "off";
          /* gsap.SET (instantané), pas gsap.to : sur cette page, .to sur
             opacity/couleur ne s'appliquait pas (interférence d'environnement
             non élucidée) alors que .set fonctionne — c'est ce qu'utilise
             l'init. La bascule est donc un « pop » net à chaque nœud franchi,
             ce qui colle au geste « unlock ». */
          gsap.set(el, { opacity: on ? 1 : 0.4 });
          const n = noeud(el);
          if (n) gsap.set(n, on ? NOEUD_ON : NOEUD_OFF);
        });
      };

      const st = ScrollTrigger.create({
        trigger: root.current!,
        start: "top 72%",
        end: "bottom 78%",
        scrub: 0.4,
        onUpdate: (self) => appliquer(self.progress),
      });
      appliquer(0);

      return () => st.kill();
    },
    { scope: root }
  );

  return (
    <ol ref={root} className="relative mt-14 space-y-9 sm:mt-16 sm:space-y-10">
      {/* rail de fond (gris) + remplissage (or), alignés sur le centre des
          nœuds : left 21px = mi-largeur d'un nœud de 44px, top/bottom 22px =
          mi-hauteur, pour partir du 1er nœud et finir au dernier. */}
      <span
        aria-hidden
        className="absolute bottom-[22px] left-[21px] top-[22px] w-px bg-[rgba(15,16,19,0.14)]"
      />
      <span
        ref={fill}
        aria-hidden
        className="absolute bottom-[22px] left-[21px] top-[22px] w-px origin-top"
        style={{ background: "linear-gradient(180deg, #b7861f, #8a6519)" }}
      />

      {etapes.map((e) => (
        <li key={e.n} data-step data-on="on" className="etape relative flex gap-5">
          {/* AUCUNE transition CSS ici : GSAP anime l'inline. La classe
              .etape-noeud ne sert qu'au repli sans JS (globals.css). */}
          <span className="etape-noeud relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-[15px] font-semibold tabular-nums">
            {e.n}
          </span>
          <div className="pb-1 pt-1.5">
            <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-[#0f1013] sm:text-[19px]">
              {e.t}
            </h3>
            <p className="mt-2 max-w-md text-[14px] leading-relaxed text-[#52555c] sm:text-[15px]">
              {e.d}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
