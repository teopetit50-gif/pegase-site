"use client";

import { useEffect, useState } from "react";
import { BoutonReservation } from "./ModeleUrl";
import "./BarreReservation.css";

/* ══════════════════════════════════════════════════════════════════════
   <BarreReservation> — la barre de réservation du téléphone,
   /reserver-un-audit (27/09/2026)

   Teo : « oublie pas de faire la version mobile de la page ». À 390 px,
   la page fait près de dix écrans : une fois les trois cartes du haut
   passées, plus aucun bouton de réservation avant le tableau, puis plus
   rien avant l'appel final. Cette barre répond à la question qu'on se
   pose à mi-page — et maintenant ? — sans qu'on ait à remonter.

   Le geste est celui de la barre de l'accueil (components/accueil/
   BarreAction.tsx, 15/09 : entrée par le bas, flou derrière, marge de la
   zone de sécurité de l'iPhone, bouton de 44 px). Elle est réécrite ici
   plutôt que réutilisée : celle de l'accueil annonce « Audit gratuit,
   30 minutes », un format qui n'existe plus, et son bouton ramènerait sur
   cette même page. Celle-ci mène droit à l'agenda, par
   <BoutonReservation>, avec le modèle, l'estimation et la formule de site
   lus dans l'URL.

   QUAND ELLE PARAÎT : seulement quand aucun autre bouton de réservation
   n'est à portée —
   · pas tant que les cartes des formats (la première section) sont à
     l'écran : chacune porte le sien ;
   · plus dès que l'appel final (#reserver) ou le pied de page entrent
     dans la fenêtre.
   Trois `IntersectionObserver`, aucun calcul au défilement.

   Elle s'éteint à 1024 px (en CSS) : le bouton « Commencer » de l'en-tête
   est toujours visible au bureau. Sous le panneau du menu mobile
   (z-index 40) : ouvert, le menu la recouvre.
   ══════════════════════════════════════════════════════════════════════ */
export default function BarreReservation({
  formule,
  titre,
  sous,
}: {
  formule: string;
  titre: string;
  sous: string;
}) {
  const [cartesPassees, setCartesPassees] = useState(false);
  const [finEnVue, setFinEnVue] = useState(false);

  useEffect(() => {
    const cartes = document.querySelector(".resa .fg");
    const fin = [document.querySelector("#reserver"), document.querySelector("footer")].filter(
      (e): e is Element => e !== null,
    );
    const visibles = new Set<Element>();

    const obsCartes = cartes
      ? new IntersectionObserver(([e]) => {
          /* passées = sorties PAR LE HAUT, pas encore atteintes */
          setCartesPassees(!e.isIntersecting && e.boundingClientRect.top < 0);
        })
      : null;
    const obsFin = new IntersectionObserver((entrees) => {
      for (const e of entrees) {
        if (e.isIntersecting) visibles.add(e.target);
        else visibles.delete(e.target);
      }
      setFinEnVue(visibles.size > 0);
    });

    if (cartes && obsCartes) obsCartes.observe(cartes);
    fin.forEach((e) => obsFin.observe(e));
    return () => {
      obsCartes?.disconnect();
      obsFin.disconnect();
    };
  }, []);

  const ouverte = cartesPassees && !finEnVue;

  return (
    <div className="br" data-ouverte={ouverte ? "oui" : "non"}>
      <div className="br-dedans">
        <p className="br-dit">
          <span className="br-titre">{titre}</span>
          <span className="br-sous">{sous}</span>
        </p>
        <BoutonReservation formule={formule} className="r-btn r-btn--noir br-btn">
          Réserver
        </BoutonReservation>
      </div>
    </div>
  );
}
