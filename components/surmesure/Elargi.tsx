"use client";

import { useEffect, useRef } from "react";

/* ══════════════════════════════════════════════════════════════════════
   La carte qui s'élargit au défilement (16/09/2026)

   Teo : « le texte apparaît et la taille du composant se zoome et
   dézoome en fonction du scroll, je veux la même chose ».

   ── LE RELEVÉ, SUR LA RÉFÉRENCE ──────────────────────────────────────
   Mesuré sur scale.com/generative-ai-data-engine, fenêtre 1600 × 900,
   à la molette, `prefers-reduced-motion` forcé à `no-preference` :

     haut de la carte   1080   921   880   841   780   694   615   455   295
     largeur            1397  1397  1413  1442  1476  1510  1530  1548  1552

   Deux vérifications qui décident de l'implémentation :
   • EN REMONTANT, la carte RÉTRÉCIT (880 → 1413, 1080 → 1397). Ce n'est
     donc pas une animation déclenchée une fois à l'entrée.
   • À L'ARRÊT, elle ne bouge plus : 1476 à t+0,12 s comme à t+1,6 s. Il
     n'y a donc aucune durée, aucune inertie — c'est une fonction PURE de
     la position de défilement.

   D'où ce composant : pas de transition CSS, pas de ressort. On lit la
   position à chaque image et on écrit une variable, c'est tout. Une
   transition ajouterait un retard que la référence n'a pas.

   ── LA COURBE ────────────────────────────────────────────────────────
   `p` va de 0 quand le haut de la carte touche le bas de la fenêtre, à 1
   quand il atteint le tiers haut. La largeur suit `1 − (1 − p)³` : un
   ease-out cubique, ajusté sur les neuf points ci-dessus (l'exposant
   mesuré tombe entre 2,9 et 3,3 selon le point).

   87,3 % → 97,0 % de la fenêtre : ce sont les deux largeurs relevées,
   rapportées aux 1600 de la mesure.

   `prefers-reduced-motion` : la variable reste à 0, la carte garde sa
   largeur de repos. Rien ne bouge.
   ══════════════════════════════════════════════════════════════════════ */

export default function Elargi({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let dernier = -1;

    const peindre = () => {
      raf = 0;
      const haut = el.getBoundingClientRect().top;
      const vh = window.innerHeight;
      /* Début : le haut de la carte touche le bas de la fenêtre.
         Fin : il atteint le tiers haut. Relevé à 900 → 900 puis 300. */
      const course = vh - vh / 3;
      const p = Math.min(1, Math.max(0, (vh - haut) / course));
      const val = 1 - Math.pow(1 - p, 3);
      /* On n'écrit que si ça bouge d'au moins 1/500 : au repos, la boucle
         ne touche plus au style et le navigateur n'a rien à repeindre. */
      if (Math.abs(val - dernier) < 0.002) return;
      dernier = val;
      el.style.setProperty("--smd-zoom", val.toFixed(4));
    };

    const planifier = () => {
      if (!raf) raf = requestAnimationFrame(peindre);
    };

    peindre();
    window.addEventListener("scroll", planifier, { passive: true });
    window.addEventListener("resize", planifier);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", planifier);
      window.removeEventListener("resize", planifier);
    };
  }, []);

  return (
    <div ref={ref} className="smd-elargi">
      {children}
    </div>
  );
}
