"use client";

import { useEffect, useRef, useState } from "react";
import { ecouterDefilement } from "./defilement";
import { Etiquette } from "./Bouton";
import { Etincelle } from "./Icones";
import { PanneauAvis, PanneauReponse } from "./Panneaux";
import { SchemaCircuits } from "./Figures";
import { CAPACITES } from "@/lib/produits/accueil";

/* Les trois cartes sont `sticky` avec un décalage croissant (top-24/28/32)
   et des plans qui montent (z-10/20/30) : en descendant, chacune vient se
   poser sur la précédente en laissant dépasser son bord. Relevé tel quel. */
const PANNEAUX = {
  conversation: PanneauReponse,
  /* La liste des quatre circuits disait la même chose en douze lignes de
     texte : le schéma la remplace, même emplacement. */
  tri: SchemaCircuits,
  avis: PanneauAvis,
} as const;

/* Les décalages collants. Ceux de la référence (96 / 112 / 128, soit 16 px
   d'écart) marchent chez elle parce que ses cartes font 284 px de haut à
   390 px de large. Les nôtres en font trois fois plus : arrivé à la dernière,
   on ne voyait plus le bord des précédentes. Sous `sm`, l'écart passe donc à
   52 px, et la valeur n'est pas ronde par hasard. Une carte couverte étant
   réduite à 0,9 depuis son bord haut, son étiquette occupe 21,6 → 39,6 px et
   son titre commence à 54 px : 52 px de dépassement montrent donc
   l'étiquette entière et RIEN du titre. Essayé à 72 puis 64 px : le titre de
   la carte couverte se faisait couper en plein milieu d'une ligne, ce qui est
   plus laid qu'un petit dépassement. Au-delà de `sm`, le relevé de la
   référence est conservé.

   Et une ombre portée vers le HAUT sur chaque carte : c'est elle qui fait
   lire le recouvrement quand le dépassement est petit. Sans elle, deux
   pastels voisins se touchent sans qu'on voie lequel passe devant. */
const CALAGE = [
  "sticky max-sm:top-13 top-24 z-10",
  "sticky max-sm:top-26 top-28 z-20",
  "sticky max-sm:top-39 top-32 z-30",
];

/* La pile n'est pas qu'un empilement : chez la référence, une carte qui
   passe DESSOUS rétrécit à `scale(0.9)` depuis son bord haut — relevé au
   getComputedStyle (matrice 0.9, origine « 640px 0px », largeur 1152 pour un
   conteneur de 1280). C'est ce qui donne la profondeur ; sans lui le
   décalque est juste au pixel et paraît mort.

   Une carte est « couverte » dès qu'une carte suivante a atteint sa position
   collante. Écouteur unique, cadencé à l'image. */
export function Capacites() {
  const cartes = useRef<(HTMLDivElement | null)[]>([]);
  /* Un booléen PAR carte, et non l'indice de la dernière collée : une carte
     est couverte dès que la suivante la CHEVAUCHE à l'écran. Le critère
     « la suivante a atteint son décalage collant » se trompait dans le dernier
     tiers du défilement — la dernière carte n'atteint pas toujours son
     décalage (le conteneur s'arrête avant), et la carte du milieu se
     retrouvait à découvert alors qu'elle était visiblement recouverte. */
  const [couvertes, setCouvertes] = useState<boolean[]>([]);

  useEffect(() =>
    ecouterDefilement(() => {
      const etat = cartes.current.map((el, i) => {
        const suivante = cartes.current[i + 1];
        if (!el || !suivante) return false;
        return suivante.getBoundingClientRect().top < el.getBoundingClientRect().bottom - 8;
      });
      setCouvertes(etat);
    }), []);

  return (
    <section data-monde="clair" id="capacites" className="scroll-mt-24 bg-white rounded-xl px-3 py-12 max-sm:py-14 lg:py-25">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-6xl mx-auto">
          <Etiquette centre>{CAPACITES.etiquette}</Etiquette>

          <h2 className="mt-4 block lg:hidden text-2xl max-sm:text-[22px] max-sm:leading-[28px] sm:text-3xl leading-normal -tracking-[1px] mb-10 max-sm:mb-8 text-center font-medium text-neutral-400">
            {CAPACITES.titreDebut}{" "}
            <span className="text-neutral-900">{CAPACITES.titreMots[0]}</span>,{" "}
            <span className="text-neutral-900">{CAPACITES.titreMots[1]}</span>{" "}
            {CAPACITES.titreLiaison}{" "}
            <span className="text-neutral-900">{CAPACITES.titreFin}</span>
          </h2>

          <h2 className="mt-4 hidden lg:block text-3xl leading-normal lg:text-4xl xl:text-5xl -tracking-[2px] mb-23 text-center font-medium text-neutral-400 lg:leading-tight">
            <span className="block">{CAPACITES.titreDebut}</span>
            <span className="block">
              <span className="text-neutral-900 inline-flex items-center gap-2">
                {CAPACITES.titreMots[0]}
                <Etincelle className="hidden sm:block text-neutral-300" />
              </span>
              ,{" "}
              <span className="text-neutral-900 inline-flex items-center gap-2">
                {CAPACITES.titreMots[1]}
                <Etincelle className="hidden sm:block text-neutral-300" />
              </span>
            </span>
            <span className="block">
              {CAPACITES.titreLiaison}{" "}
              <span className="text-neutral-900">{CAPACITES.titreFin}</span>
            </span>
          </h2>
        </div>

        {/* Marge basse sous la pile : sans elle, la dernière carte n'atteint
            jamais son décalage collant (le conteneur s'arrête avant), elle
            s'immobilise 30 px trop haut, et le dépassement de la carte du
            milieu passe de 52 à 83 px — assez pour couper son titre. */}
        <div className="space-y-6 relative max-sm:pb-14">
          {CAPACITES.cartes.map((c, i) => {
            const Panneau = PANNEAUX[c.panneau as keyof typeof PANNEAUX];
            const couverte = couvertes[i] === true;
            return (
              <div
                key={c.titre}
                ref={(el) => {
                  cartes.current[i] = el;
                }}
                className={`${c.teinte} ${CALAGE[i]} lg:items-center gap-8 py-6 px-6 sm:px-12 rounded-xl flex flex-col lg:flex-row origin-top shadow-[0_-10px_24px_-6px_rgba(23,23,23,.10)] transition-transform duration-300 ease-out ${
                  couverte ? "scale-90" : "scale-100"
                }`}
              >
                <div className="lg:w-1/2 space-y-4">
                  <Etiquette>{c.etiquette}</Etiquette>
                  {/* Une carte couverte ne montre plus que son étiquette sous
                      `sm` : selon l'endroit exact où l'on s'arrête de
                      défiler, son dépassement va de 52 à 83 px, et à 83 px
                      son titre se faisait couper en plein milieu d'une ligne.
                      Masquer le reste rend le dépassement propre à toutes les
                      hauteurs. */}
                  <div
                    className={`space-y-4 transition-opacity duration-200 ${
                      couverte ? "max-sm:opacity-0" : ""
                    }`}
                  >
                  <h3 className="text-3xl max-sm:text-[24px] max-sm:leading-[28px] -tracking-[2px] max-sm:-tracking-[0.5px] sm:text-4xl lg:text-5xl font-medium text-neutral-900 lg:leading-14">
                    {c.titre}
                  </h3>
                  <p className="text-lg max-sm:text-[15px] max-sm:leading-[1.55] text-neutral-500 font-normal">{c.texte}</p>
                  </div>
                </div>
                <div className="lg:w-1/2">
                  <Panneau />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
