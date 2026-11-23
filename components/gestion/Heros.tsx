import type { CSSProperties } from "react";
import { Bloc, BoutonLien } from "./Trame";
import { TableauDeBord } from "./visuels";
import { HERO } from "./textes";

/* ══════════════════════════════════════════════════════════════════════
   Le haut de /gestion : le titre, le chapô, deux boutons, puis le grand
   écran sur son fond (balisage.txt lignes 109 à 150). Les classes sont
   celles de la référence, dans l'ordre du DOM.

   Écarts :
   · le chapô est un <p> (un <div> chez eux) ;
   · les deux boutons passent à la ligne quand ils ne tiennent pas
     (`flex-wrap`) : « Réserver un audit offert » fait 24 signes contre 19
     pour « Start building free », et à 390 px la rangée dépasserait les
     308 px utiles ;
   · le grand écran n'est pas une image mais un composant (visuels.tsx,
     TableauDeBord) dans le même cadre : rayon 18 px en haut, filet
     #e7e5e4 sans bord bas. Sa hauteur suit son contenu au lieu du rapport
     de leur capture (1 180 × 736 à 1440) ;
   · le fond : chez eux /hero-bg.jpg répond 404 et son calque est derrière
     un `bg-stone-100`, on ne voit que l'aplat. Ici le même aplat, plus
     leur trame de points et leur dégradé de carte, dessinés en CSS ;
   · l'entrée des trois blocs est une animation CSS (`ge-entree`), aux
     valeurs de leur framer-motion : 0,6 s, 20 px, un bloc toutes les
     0,12 s après 0,1 s.
   ══════════════════════════════════════════════════════════════════════ */

const retard = (s: number) => ({ "--ge-retard": `${s}s` }) as CSSProperties;

export function Heros() {
  return (
    <Bloc id="hero">
      <div className="px-6 pb-0 pt-14 md:px-12 md:pt-22 xl:pt-28">
        <div className="grid grid-cols-1 gap-x-16 gap-y-8 pb-10 md:pb-16 xl:grid-cols-[auto_minmax(0,1fr)] xl:items-end">
          <div className="ge-entree flex flex-col gap-4 xl:w-[41rem]" style={retard(0.1)}>
            <h1 className="ge-h1">
              <span className="block">{HERO.titre[0]}</span>{" "}
              <span className="block text-[#342d27]">{HERO.titre[1]}</span>
            </h1>
          </div>
          <p className="ge-entree text-xl leading-tight text-stone-700" style={retard(0.22)}>
            {HERO.chapo}
          </p>
          <div
            className="ge-entree flex flex-col items-start gap-2.5 min-[360px]:flex-row min-[360px]:flex-wrap min-[360px]:items-center xl:col-span-2"
            style={retard(0.34)}
          >
            <BoutonLien bouton={HERO.principal} />
            <BoutonLien bouton={HERO.second} />
          </div>
        </div>
      </div>
      <div className="relative bg-stone-100 px-4 pt-6 md:px-8 md:pt-10">
        <div
          className="absolute inset-0 bg-gradient-to-br from-stone-50 via-stone-100 to-stone-200/70"
          aria-hidden="true"
        />
        <div className="ge-pointille absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="relative overflow-hidden rounded-t-[18px] border border-b-0 border-stone-200">
          <TableauDeBord />
        </div>
      </div>
    </Bloc>
  );
}
