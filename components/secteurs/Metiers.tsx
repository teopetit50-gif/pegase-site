"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import {
  Building2,
  Car,
  ChefHat,
  GraduationCap,
  Glasses,
  HardHat,
  Laptop,
  PackageCheck,
  Scale,
  Truck,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { BLOCS, METIERS, SYSTEMES, type IconeMetier } from "./donnees";

/* ══════════════════════════════════════════════════════════════════════
   Le sélecteur de métier — douze tuiles, un panneau à trois blocs.

   POURQUOI UNE GRILLE ET PAS UNE PISTE D'ONGLETS. La page RELOAD porte
   déjà un sélecteur de métier (components/produits/reprise/Metiers.tsx),
   en piste horizontale. Cinq onglets y tiennent ; douze n'y tiennent pas —
   la piste deviendrait un défilement horizontal où les huit derniers
   métiers sont hors de vue, c'est-à-dire absents. La grille de la
   référence les montre tous d'un coup : le visiteur voit le sien avant de
   cliquer, et c'est tout ce qu'on lui demande de faire ici.

   Le comportement clavier, lui, est repris de ce composant : flèches,
   Origine, Fin, un seul onglet dans l'ordre de tabulation, le focus qui
   suit la sélection. Haut et bas déplacent d'une RANGÉE, ce qui suppose de
   connaître le nombre de colonnes — d'où `colonnes`, qui suit le palier.

   ── CE QUI VIENT DE 21st.dev, ET CE QUI N'EN VIENT PAS ─────────────────
   Teo a demandé de bâtir cette page avec les composants de 21st.dev. Deux
   voies, un résultat chacune :

   · L'API Magic (serveur MCP `magic`) répond « Invalid API key » — la clé
     n'a pas été renouvelée depuis août. Rien à en tirer.
   · Le REGISTRE, lui, rend le code : `fetch('/r/<auteur>/<slug>')` exécuté
     DANS une page 21st.dev répond 200 avec le fichier entier. (En `curl`
     il répond 403 : c'est le cookie qui manque, pas le code.)

   CE QUI EN EST REPRIS : le marqueur de sélection de
   `@builduilabs/animated-tabs` — un `layoutId` framer-motion partagé, qui
   fait GLISSER la barre de l'onglet quitté vers l'onglet choisi au lieu de
   l'éteindre ici pour la rallumer là. Sur une grille à deux dimensions, le
   trajet se lit mieux que sur une piste : c'est lui qui dit au visiteur
   qu'il vient de bouger dans un ensemble, pas de changer d'écran.

   CE QUI N'EN EST PAS REPRIS : le `mix-blend-difference` du composant
   d'origine, qui peint la tuile choisie en noir plein et inverse son texte.
   L'effet est beau et il n'a rien à faire ici — la référence de la page
   (Vertex) compose en gris très clairs, et une tuile noire au milieu de
   douze se lirait comme une erreur d'impression.

   La GÉOMÉTRIE, elle, ne vient pas d'un catalogue mais de la PAGE DÉPLOYÉE
   du modèle Vertex — balisage rendu et feuille compilée. C'est la meilleure
   source qui soit : un catalogue donne la description d'un composant, une
   page en production donne son implémentation.

   ── LE PIÈGE DES UTILITAIRES ───────────────────────────────────────────
   `bg-background`, `text-muted-foreground`, `border-border`, `bg-card` :
   ces classes de la référence N'EXISTENT PAS sur ce site et ne peignent
   RIEN, sans erreur. Toutes les couleurs sont donc en valeur arbitraire.
   ══════════════════════════════════════════════════════════════════════ */

const ICONES: Record<IconeMetier, typeof Wrench> = {
  atelier: Wrench,
  chantier: HardHat,
  negoce: PackageCheck,
  transport: Truck,
  table: UtensilsCrossed,
  cabinet: Scale,
  immeuble: Building2,
  formation: GraduationCap,
  optique: Glasses,
  traiteur: ChefHat,
  concession: Car,
  sav: Laptop,
};

/* Le nombre de colonnes de la grille, par palier. Il sert au clavier, pas
   à la mise en page — celle-ci reste en `grid-cols-*`, donc une divergence
   entre les deux ne casserait que la flèche du haut, jamais l'affichage. */
function useColonnes() {
  const [colonnes, setColonnes] = useState(4);
  useEffect(() => {
    const lg = window.matchMedia("(min-width: 1024px)");
    const md = window.matchMedia("(min-width: 768px)");
    const suivre = () => setColonnes(lg.matches ? 4 : md.matches ? 3 : 2);
    suivre();
    lg.addEventListener("change", suivre);
    md.addEventListener("change", suivre);
    return () => {
      lg.removeEventListener("change", suivre);
      md.removeEventListener("change", suivre);
    };
  }, []);
  return colonnes;
}

export default function Metiers() {
  const [actif, setActif] = useState(0);
  const onglets = useRef<(HTMLButtonElement | null)[]>([]);
  const colonnes = useColonnes();
  /* Sans cette garde, la barre traverse la grille en diagonale chez
     quelqu'un qui a demandé moins de mouvement. On la fait alors
     apparaître à sa place, sans trajet. */
  const sansMouvement = useReducedMotion();

  const auClavier = (e: React.KeyboardEvent) => {
    const n = METIERS.length;
    const cible =
      e.key === "ArrowRight" ? (actif + 1) % n
      : e.key === "ArrowLeft" ? (actif - 1 + n) % n
      : e.key === "ArrowDown" ? (actif + colonnes) % n
      : e.key === "ArrowUp" ? (actif - colonnes + n) % n
      : e.key === "Home" ? 0
      : e.key === "End" ? n - 1
      : null;
    if (cible === null) return;
    e.preventDefault();
    setActif(cible);
    onglets.current[cible]?.focus();
  };

  const m = METIERS[actif];
  const Icone = ICONES[m.icone];

  return (
    <section id="metiers" className="scroll-mt-24">
      <div className="px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-2xl pt-20 pb-12 text-center md:pt-28">
          <p className="sec-sourcil">Les métiers</p>
          <h2 className="sec-h2 mt-5">Douze métiers, douze silences différents.</h2>
          <p className="sec-lead mt-5">
            Ouvrez le vôtre. Chacun dit ce qui lui échappe, ce que nous prenons
            aujourd’hui, et ce qui ne bouge pas de chez lui.
          </p>
        </div>

        {/* Le cadre ne porte QUE son filet haut et son filet gauche : les
            filets droit et bas de chaque tuile ferment le treillis. Un
            `border` complet les doublerait, et deux tiretés à un pixel
            d'écart se lisent comme un trait épais, pas comme une grille.
            La grille et son panneau partagent un même encadré tireté : c'est
            ce qui les lie visuellement, et ce qui fait de la sélection un
            mouvement à l'intérieur d'un cadre plutôt qu'un saut de section. */}
        <div className="relative border-[#e6e6e6] border-t border-l border-dashed">
          {/* Les quatre croix d'intersection de la référence. */}
          <span aria-hidden="true" className="sec-croix -translate-[calc(50%+0.5px)] top-0 left-0" />
          <span aria-hidden="true" className="sec-croix -translate-y-[calc(50%+0.5px)] top-0 right-0 translate-x-[calc(50%+0.5px)]" />
          <span aria-hidden="true" className="sec-croix -translate-x-[calc(50%+0.5px)] bottom-0 left-0 translate-y-[calc(50%+0.5px)]" />
          <span aria-hidden="true" className="sec-croix bottom-0 right-0 translate-x-[calc(50%+0.5px)] translate-y-[calc(50%+0.5px)]" />

          {/* `LayoutGroup` cantonne le `layoutId` à cette grille : une autre
              barre partagée ailleurs sur le site ne viendrait pas s'y lier. */}
          <LayoutGroup id="secteurs">
          <div
            role="tablist"
            aria-label="Les métiers que nous connaissons"
            onKeyDown={auClavier}
            /* 12 tuiles se divisent exactement en 2, 3 et 4 colonnes : le
               treillis de filets est toujours complet, sans rangée bancale.
               Ajouter un treizième métier casserait ça — en ajouter deux le
               réparerait pour 2 et 3 colonnes, pas pour 4. */
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          >
            {METIERS.map((x, i) => {
              const IconeTuile = ICONES[x.icone];
              return (
                <button
                  key={x.cle}
                  ref={(el) => {
                    onglets.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`onglet-${x.cle}`}
                  aria-selected={i === actif}
                  aria-controls={`panneau-${x.cle}`}
                  tabIndex={i === actif ? 0 : -1}
                  onClick={() => setActif(i)}
                  className={cn(
                    "sec-tuile flex min-h-[104px] flex-col justify-between gap-3 p-4 lg:p-5",
                    /* le treillis : chaque tuile porte son filet droit et
                       son filet bas, le cadre extérieur ferme le reste */
                    "border-[#e6e6e6] border-r border-b border-dashed",
                  )}
                >
                  <IconeTuile
                    className="size-[18px] shrink-0 opacity-70"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span className="text-[13px] leading-[18px] lg:text-sm lg:leading-5">
                    {x.nom}
                  </span>
                  {/* La barre de sélection, empruntée à @builduilabs/animated-tabs :
                      un seul élément pour les douze tuiles, identifié par
                      `layoutId`, donc framer-motion l'anime d'une position à
                      l'autre au lieu d'en démonter une et d'en monter une autre.
                      `inset-x-[-1px]` la fait mordre sur les filets voisins,
                      sinon elle paraît plus courte que la tuile. */}
                  {i === actif && (
                    <motion.span
                      layoutId="secteurs-barre"
                      aria-hidden="true"
                      className="-bottom-px absolute inset-x-[-1px] h-0.5 bg-[#171717]"
                      transition={
                        sansMouvement
                          ? { duration: 0 }
                          : { type: "spring", bounce: 0.15, duration: 0.45 }
                      }
                    />
                  )}
                </button>
              );
            })}
          </div>
          </LayoutGroup>

          <div
            key={m.cle}
            role="tabpanel"
            id={`panneau-${m.cle}`}
            aria-labelledby={`onglet-${m.cle}`}
            tabIndex={0}
            className="sec-panneau border-[#e6e6e6] border-t"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-[#e6e6e6] border-b border-dashed px-5 py-4 lg:px-6">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f5f5f5]">
                <Icone
                  className="size-[17px] text-[#171717]/70"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </span>
              <span className="font-medium text-[15px]">{m.complet}</span>
            </div>

            <div className="flex flex-col divide-y divide-[#e6e6e6] divide-dashed lg:flex-row lg:divide-x lg:divide-y-0">
              {[
                { titre: BLOCS.echappe, texte: m.echappe },
                { titre: BLOCS.cherche, texte: m.cherche },
                { titre: BLOCS.reste, texte: m.reste },
              ].map((b) => (
                <div key={b.titre} className="flex flex-col gap-3 p-5 lg:flex-1 lg:p-6">
                  <span className="sec-sourcil">{b.titre}</span>
                  <p className="sec-body">{b.texte}</p>
                </div>
              ))}
            </div>

            {/* L'aiguillage : c'est ce qui justifie la page. On entre par le
                métier, on sort par le système — sinon /secteurs ne serait
                qu'un doublon de /offres écrit dans un autre ordre. */}
            <div className="flex flex-wrap items-center gap-3 border-[#e6e6e6] border-t border-dashed px-5 py-4 lg:px-6">
              <span className="sec-sourcil mr-1">Le système qui le porte</span>
              {m.systemes.map((cle) => (
                <Link
                  key={cle}
                  href={SYSTEMES[cle].href}
                  className="sec-btn sec-btn--creux"
                >
                  {SYSTEMES[cle].nom}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
