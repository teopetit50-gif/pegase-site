"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* ══════════════════════════════════════════════════════════════════════
   LA BARRE D'ACTION DU TÉLÉPHONE (15/09/2026)

   Teo : « sur mobile on comprend direct quoi, combien, pour qui ». Les
   trois réponses sont dans le hero ; celle-ci répond à la quatrième
   question, qui n'était posée nulle part : ET MAINTENANT ?

   Le défaut mesuré : l'accueil fait 14 000 px à 375 px. Le bouton du hero
   sorti de l'écran, il n'y a plus AUCUN appel à l'action avant le pied de
   page — un visiteur convaincu à la quatrième section doit remonter treize
   écrans ou descendre le reste pour trouver où réserver.

   ELLE NE PARAÎT PAS TOUT DE SUITE : tant que le hero est à l'écran, son
   propre bouton fait le travail et une barre par-dessus ferait doublon.
   Seuil à 70 % de la hauteur de fenêtre, c'est-à-dire quand le bouton du
   hero vient de sortir par le haut.

   ELLE S'EFFACE DEVANT LE PIED DE PAGE : arrivé là, le visiteur a les
   mêmes liens en clair, et une barre flottante masquerait la dernière
   ligne. `IntersectionObserver` sur le `<footer>` plutôt qu'un calcul de
   position : pas de mesure à refaire au redimensionnement, et rien à
   recalculer à chaque image.

   Elle s'éteint à `lg` : le menu de bureau porte déjà le même bouton, en
   tête et toujours visible. */
export default function BarreAction() {
  const [visible, setVisible] = useState(false);
  const [piedEnVue, setPiedEnVue] = useState(false);

  useEffect(() => {
    const auDefilement = () => setVisible(window.scrollY > window.innerHeight * 0.7);
    auDefilement();
    window.addEventListener("scroll", auDefilement, { passive: true });

    const pied = document.querySelector("footer");
    const obs = pied
      ? new IntersectionObserver(([e]) => setPiedEnVue(e.isIntersecting), {
          rootMargin: "0px",
        })
      : null;
    if (pied && obs) obs.observe(pied);

    return () => {
      window.removeEventListener("scroll", auDefilement);
      obs?.disconnect();
    };
  }, []);

  return (
    <div
      className="o-barre lg:hidden"
      /* `hidden` plutôt qu'une classe conditionnelle : l'attribut sort le
         nœud du flux ET de l'ordre de tabulation, une classe d'opacité
         laisserait un bouton invisible focusable au clavier. */
      data-ouverte={visible && !piedEnVue ? "oui" : "non"}
    >
      <div className="o-barre-dedans">
        <span className="o-barre-dit">
          Audit gratuit, 30 minutes
        </span>
        <Link href="/reserver-un-audit" className="o-barre-btn">
          Réserver
        </Link>
      </div>
    </div>
  );
}
