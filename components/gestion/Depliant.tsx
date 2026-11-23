"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Apparition from "./Apparition";
import { preparerVolet } from "./volet";

/* ══════════════════════════════════════════════════════════════════════
   L'accordéon à écran de /gestion (« Run anywhere. Scale everywhere. »,
   balisage.txt ligne 778 : à gauche un dessin qui change avec le volet
   ouvert, à droite un accordéon de trois volets). Les classes sont celles
   de la référence, dans l'ordre du DOM. Les icônes et les écrans arrivent
   déjà rendus par le serveur.

   LE COMPORTEMENT, comme chez eux : un volet est toujours ouvert (leur
   `onValueChange` ignore la fermeture), et le dessin de gauche suit le
   volet. LE MOUVEMENT : le volet se déplie en 0,2 s (accordion-down /
   accordion-up) ; l'écran sort puis le suivant entre, opacité et échelle
   0,96, 0,35 s chacun (leur AnimatePresence en mode « wait »).

   Écarts :
   · LE CADRE SUIT L'ÉCRAN. Chez eux un dessin SVG est centré dans un
     cadre au rapport figé (656/469, soit 620 × 443 à 1440 ; 14/13 sur
     téléphone). Un écran de logiciel ne se réduit pas comme un dessin : le
     rapport reste la taille de départ, et le cadre grandit si l'écran est
     plus haut. Les trois écrans sont empilés dans la même case : le cadre
     a la hauteur du plus haut et ne bouge pas quand on change de volet.
     Mesuré à 1440 : la carte fait 572 × 471 au lieu de 572 × 395 (le plus
     haut des trois écrans, les modules métier, fait 421 px pour 347 px
     utiles), et la section 631 px au lieu de 589 ;
   · sous `sm` les marges du cadre passent de 16 + 24 px à 0 + 8 px : à
     390 px leur dessin tient dans 242 px, un écran en demande 300 ;
   · le premier volet est ouvert au chargement (le deuxième chez eux) ;
   · leur accordéon est en `<h3>` : gardé tel quel.
   ══════════════════════════════════════════════════════════════════════ */

export type Volet = { id: string; titre: string; texte: string; icone: ReactNode; visuel: ReactNode };

const DUREE = 350;

export default function Depliant({ entete, volets }: { entete: ReactNode; volets: Volet[] }) {
  const [ouvert, setOuvert] = useState(0);
  const [montre, setMontre] = useState(0);
  const [phase, setPhase] = useState<"repos" | "sort" | "entre">("repos");
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    },
    [],
  );

  const ouvrir = (i: number) => {
    if (i === ouvert) return;
    preparerVolet(`volet-${volets[ouvert].id}`);
    preparerVolet(`volet-${volets[i].id}`);
    setOuvert(i);
    if (minuteur.current) clearTimeout(minuteur.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMontre(i);
      setPhase("repos");
      return;
    }
    setPhase("sort");
    minuteur.current = setTimeout(() => {
      setMontre(i);
      setPhase("entre");
    }, DUREE);
  };

  return (
    <div className="grid grid-cols-1 items-start gap-8 px-4 py-8 md:px-8 md:py-10 lg:grid-cols-[minmax(0,620px)_minmax(260px,1fr)] lg:gap-12 xl:px-12 xl:py-14">
      <Apparition x={-20} y={0} className="order-1 w-full min-w-0 lg:order-1">
        <div className="relative mx-auto grid w-full max-w-[480px] grid-cols-[minmax(0,1fr)] md:mx-0 md:max-w-none">
          {/* la cale : elle donne au cadre le rapport de la référence ; l'écran, dans la même case, peut le dépasser */}
          <div
            className="pointer-events-none col-start-1 row-start-1 aspect-[14/13] w-full self-start md:aspect-[656/469]"
            aria-hidden="true"
          />
          <div className="col-start-1 row-start-1 grid p-0 sm:p-6">
            <div className="relative grid grid-cols-[minmax(0,1fr)] place-items-center overflow-hidden rounded-[18px] border border-stone-200 bg-stone-100/70 p-2 shadow-inner sm:p-6">
              {volets.map((v, i) => (
                <div
                  key={v.id}
                  aria-hidden={i !== montre}
                  className={`col-start-1 row-start-1 w-full min-w-0 max-w-[27rem] ${i === montre ? "" : "invisible"} ${
                    i === montre && phase === "sort" ? "ge-ecran-sort" : ""
                  } ${i === montre && phase === "entre" ? "ge-ecran-entre" : ""}`}
                >
                  {v.visuel}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Apparition>
      <Apparition x={20} y={0} retard={0.1} className="order-2 flex flex-col lg:order-2">
        {entete}
        <div className="flex w-full flex-col">
          {volets.map((v, i) => {
            const actif = i === ouvert;
            return (
              <div key={v.id} className="border-b border-stone-200 last:border-b-0">
                <h3 className="flex">
                  <button
                    type="button"
                    id={`bouton-${v.id}`}
                    aria-expanded={actif}
                    aria-controls={`volet-${v.id}`}
                    onClick={() => ouvrir(i)}
                    className={`group relative flex flex-1 cursor-pointer items-center justify-between gap-4 rounded-[10px] border border-transparent py-6 text-left text-base font-medium outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#4b4038]/40 ${
                      actif ? "text-stone-900" : ""
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center transition-colors ${
                        actif ? "text-[#342d27]" : "text-stone-500"
                      }`}
                    >
                      {v.icone}
                    </span>
                    <span className={`transition-colors ${actif ? "text-stone-900" : "text-stone-500"}`}>{v.titre}</span>
                    {actif ? (
                      <ChevronUp className="pointer-events-none ml-auto size-4 shrink-0 text-[#78716c]" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="pointer-events-none ml-auto size-4 shrink-0 text-[#78716c]" aria-hidden="true" />
                    )}
                  </button>
                </h3>
                <div
                  id={`volet-${v.id}`}
                  role="region"
                  aria-labelledby={`bouton-${v.id}`}
                  data-etat={actif ? "ouvert" : "ferme"}
                  className="ge-volet text-sm"
                >
                  <div className="pb-6 pt-0">
                    <p className="leading-snug text-stone-600">{v.texte}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Apparition>
    </div>
  );
}
