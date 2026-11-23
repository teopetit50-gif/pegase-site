"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/* ══════════════════════════════════════════════════════════════════════
   Les onglets par module de /gestion (« Built for teams that ship fast »,
   balisage.txt ligne 199 : des onglets par secteur, une image par onglet).
   Les classes sont celles de la référence, dans l'ordre du DOM. Les écrans
   arrivent déjà rendus par le serveur (prop `visuel`).

   LE MOUVEMENT. Chez eux AnimatePresence en mode « wait » : le panneau
   ouvert sort (opacité 0, 12 px vers le haut, 0,35 s), puis le suivant
   entre par le bas (0,35 s), courbe cubic-bezier(.25, 1, .5, 1). Ici deux
   classes (`ge-onglet-sort`, `ge-onglet-entre`, gestion.css) et un
   minuteur de 350 ms ; l'onglet, lui, change tout de suite. En mouvement
   réduit, le panneau change sans transition.

   Écarts :
   · LA BARRE D'ONGLETS SUR TÉLÉPHONE. Chez eux elle fait 500 px dans une
     colonne de 326 px et sort de la page des deux côtés (relevé à 390 px :
     le premier onglet commence à −55 px, le dernier finit à 445 px). Ici,
     sous `sm`, les quatre onglets se rangent en deux rangées de deux, et
     l'onglet ouvert se lit à son fond gris plutôt qu'au trait du bas ;
   · LE TITRE ET LA BARRE SE METTENT CÔTE À CÔTE DÈS md, PAS DÈS sm. De
     640 à 767 px leur titre n'a plus que 10 à 100 px de large à côté des
     onglets (un mot par ligne) ; ici il reste au-dessus, centré, comme
     sur téléphone. À 768 px et au-delà, rien ne change ;
   · les quatre panneaux sont dans la page (les trois fermés portent
     `hidden`) : chez eux seul le panneau ouvert existe, les autres textes
     ne sont pas dans le HTML ;
   · le titre du panneau est un <h3> (un <p> chez eux) ;
   · l'écran n'est pas une image : sa hauteur suit son contenu (leur
     capture fait 712 × 388 à 1440) ;
   · les flèches du clavier passent d'un onglet à l'autre, comme leur
     composant Radix.
   ══════════════════════════════════════════════════════════════════════ */

export type Onglet = { id: string; titre: string; texte: string; visuel: ReactNode };

const DUREE = 350;

export default function Onglets({ titre, onglets }: { titre: ReactNode; onglets: Onglet[] }) {
  /* l'onglet choisi change tout de suite ; le panneau montré le suit après
     la sortie de l'ancien */
  const [choisi, setChoisi] = useState(0);
  const [montre, setMontre] = useState(0);
  const [phase, setPhase] = useState<"repos" | "sort" | "entre">("repos");
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    },
    [],
  );

  const choisir = (i: number) => {
    if (i === choisi) return;
    setChoisi(i);
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

  const auClavier = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = onglets.length;
    let i = choisi;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") i = (choisi + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") i = (choisi + n - 1) % n;
    else if (e.key === "Home") i = 0;
    else if (e.key === "End") i = n - 1;
    else return;
    e.preventDefault();
    choisir(i);
    document.getElementById(`onglet-${onglets[i].id}`)?.focus();
  };

  return (
    <div className="flex flex-col">
      <div className="p-2 sm:p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-8 px-2 pt-4 sm:px-4 md:flex-row md:items-center md:justify-between md:gap-8 md:py-4 lg:py-0 lg:pr-0 xl:pl-8">
            <h2 className="ge-h2 w-full min-w-0 text-center md:flex-1 md:text-left lg:w-[28rem] lg:flex-none">{titre}</h2>
            <div className="flex w-full flex-col gap-2 sm:w-auto">
              <div
                role="tablist"
                aria-label="Les modules du logiciel"
                onKeyDown={auClavier}
                className="grid w-full grid-cols-2 border border-stone-200 bg-white text-[#78716c] sm:inline-flex sm:h-8 sm:w-fit sm:items-center sm:justify-center"
              >
                {onglets.map((o, i) => {
                  const actif = i === choisi;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="tab"
                      id={`onglet-${o.id}`}
                      aria-selected={actif}
                      aria-controls={`panneau-${o.id}`}
                      tabIndex={actif ? 0 : -1}
                      onClick={() => choisir(i)}
                      className={`relative inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-1.5 border-stone-200 px-2 text-center text-sm font-medium transition-all max-sm:leading-tight outline-none after:absolute after:inset-x-0 after:bottom-[-5px] after:hidden after:h-0.5 after:bg-[#1e1a16] after:transition-opacity hover:bg-stone-50 hover:text-stone-900 focus-visible:ring-[3px] focus-visible:ring-[#78716c]/50 max-sm:odd:border-r max-sm:[&:nth-child(n+3)]:border-t sm:h-[calc(100%-1px)] sm:border-r sm:px-5 sm:whitespace-nowrap sm:last:border-r-0 sm:after:block ${
                        actif
                          ? "text-stone-900 after:opacity-100 max-sm:bg-stone-100"
                          : "text-stone-600 after:opacity-0"
                      }`}
                    >
                      {o.titre}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="rounded-[10px] bg-white sm:bg-stone-50">
            {onglets.map((o, i) => (
              <div
                key={o.id}
                role="tabpanel"
                id={`panneau-${o.id}`}
                aria-labelledby={`onglet-${o.id}`}
                hidden={i !== montre}
                className={`lg:items-start lg:justify-between lg:gap-6 lg:p-4 xl:p-8 ${i === montre ? "lg:flex" : ""} ${
                  i === montre && phase === "sort" ? "ge-onglet-sort" : ""
                } ${i === montre && phase === "entre" ? "ge-onglet-entre" : ""}`}
              >
                <div className="flex flex-col gap-6 px-6 py-6 sm:px-4 lg:min-h-[32rem] lg:min-w-[15.5rem] lg:max-w-[22.5rem] lg:basis-[22.5rem] lg:gap-8 lg:p-0">
                  <h3 className="text-xl font-semibold leading-tight text-stone-900">{o.titre}</h3>
                  <div className="flex flex-col gap-6">
                    <p className="leading-relaxed text-stone-700">{o.texte}</p>
                  </div>
                </div>
                <div className="relative min-w-0 grow self-center px-4 pb-6 sm:px-6 lg:max-w-[44.5rem] lg:basis-[44.5rem] lg:px-0 lg:pb-0">
                  <div className="relative w-full overflow-hidden rounded-[10px]">{o.visuel}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
