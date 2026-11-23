"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Apparition from "./Apparition";
import { preparerVolet } from "./volet";

/* ══════════════════════════════════════════════════════════════════════
   Les questions de /gestion (« FAQs », balisage.txt ligne 1287 : le titre
   dans une colonne à gauche, un accordéon à droite). Les classes sont
   celles de la référence, dans l'ordre du DOM.

   LE COMPORTEMENT, comme chez eux (Radix, `type="single" collapsible`) :
   une seule question ouverte à la fois, et un second clic la referme ;
   tout est fermé au chargement. La question ouverte passe en #342d27. Le
   volet se déplie en 0,2 s (accordion-down / accordion-up, volet.ts).

   Écarts :
   · six questions au lieu de seize : celles de l'accueil qui concernent
     le logiciel de gestion ;
   · une réponse fermée reste dans la page (hauteur 0, hors lecture) : chez
     eux elle n'est écrite dans le HTML qu'une fois ouverte ;
   · leurs règles `first:[&[data-state=open]>button]:pt-8…` ne
     sélectionnent rien (un bouton n'a pas de bouton enfant) : non reprises.
   ══════════════════════════════════════════════════════════════════════ */

export type Question = { id: string; q: string; r: string };

/* le titre et les questions arrivent du serveur (app/gestion/page.tsx) :
   textes.ts n'est pas embarqué dans le script de la page */
export function Questions({ titre, liste }: { titre: string; liste: Question[] }) {
  const [ouverte, setOuverte] = useState<number | null>(null);

  const basculer = (i: number) => {
    if (ouverte !== null) preparerVolet(`reponse-${liste[ouverte].id}`);
    if (i !== ouverte) preparerVolet(`reponse-${liste[i].id}`);
    setOuverte(i === ouverte ? null : i);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-stretch">
      <div className="border-b border-stone-200 px-8 py-8 md:w-[223px] md:shrink-0 md:border-b-0 md:border-r md:py-10 lg:w-[315px] lg:py-12 xl:w-[372px] xl:px-12 xl:py-14">
        <Apparition titre className="ge-h2">
          {titre}
        </Apparition>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex w-full flex-col">
          {liste.map((q, i) => {
            const actif = i === ouverte;
            return (
              <div key={q.id} className="border-b border-stone-200 last:border-b-0">
                <h3 className="flex">
                  <button
                    type="button"
                    id={`question-${q.id}`}
                    aria-expanded={actif}
                    aria-controls={`reponse-${q.id}`}
                    onClick={() => basculer(i)}
                    className={`group relative flex flex-1 cursor-pointer items-start justify-between gap-4 rounded-[10px] border border-transparent px-4 py-5 text-left text-base font-medium leading-snug outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#4b4038]/40 md:px-8 md:py-6 xl:px-12 ${
                      actif ? "text-[#342d27]" : "text-stone-900"
                    }`}
                  >
                    {q.q}
                    {actif ? (
                      <ChevronUp className="pointer-events-none ml-auto size-4 shrink-0 text-[#78716c]" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="pointer-events-none ml-auto size-4 shrink-0 text-[#78716c]" aria-hidden="true" />
                    )}
                  </button>
                </h3>
                <div
                  id={`reponse-${q.id}`}
                  role="region"
                  aria-labelledby={`question-${q.id}`}
                  data-etat={actif ? "ouvert" : "ferme"}
                  className="ge-volet text-sm"
                >
                  <div className="px-4 pb-6 pt-0 text-sm leading-relaxed text-stone-600 md:px-8 xl:px-12">{q.r}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
