"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani sur le gabarit Nivara — Accordeon.tsx (09/11/2026)
   La colonne d'accordéons de la référence (« Design » / « Delivery ») :
   un intertitre `pb-3 text-small text-graphite`, un filet encre, puis
   des rangs `h4 > button` (`flex w-full items-center justify-between
   gap-6 py-5`, libellé `font-display text-h4` qui avance de 6 px au
   survol, croix de 16 px dont la barre verticale se couche à
   l'ouverture), chacun suivi d'un filet `bg-rule`. Un seul rang ouvert à
   la fois (relevé : ouvrir le deuxième ferme le premier) ; le premier
   l'est au chargement. Chaque rang porte l'apparition de l'accueil.
   ══════════════════════════════════════════════════════════════════════ */
import { useId, useState, type ReactNode } from "react";
import Apparition from "@/components/accueil/Apparition";

export type Rang = { titre: string; contenu: ReactNode };

export default function Accordeon({
  intertitre,
  rangs,
  ouvert = 0,
}: {
  intertitre: string;
  rangs: Rang[];
  /** rang ouvert au chargement, −1 pour aucun */
  ouvert?: number;
}) {
  const [actif, setActif] = useState(ouvert);
  const id = useId();
  return (
    <div>
      <Apparition>
        <h3 className="pb-3 text-small text-graphite">{intertitre}</h3>
      </Apparition>
      <div aria-hidden="true" className="h-px origin-left bg-ink" />
      {rangs.map((r, i) => {
        const est = actif === i;
        return (
          <Apparition key={r.titre} delai={60 * (i + 1)}>
            <h4>
              <button
                id={`${id}-b${i}`}
                type="button"
                aria-expanded={est}
                aria-controls={`${id}-p${i}`}
                onClick={() => setActif(est ? -1 : i)}
                className="group flex w-full cursor-pointer items-center justify-between gap-6 py-5 text-left"
              >
                <span className="font-display text-h4 transition-transform duration-500 ease-[var(--ease-out)] group-hover:translate-x-1.5">
                  {r.titre}
                </span>
                <span aria-hidden="true" className="relative size-4 shrink-0">
                  <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current" />
                  <span
                    className="absolute inset-y-0 left-1/2 w-px bg-current transition-transform duration-500 ease-[var(--ease-out)]"
                    style={{ transform: `translateX(-50%) scaleY(${est ? 0 : 1})` }}
                  />
                </span>
              </button>
            </h4>
            <div
              id={`${id}-p${i}`}
              role="region"
              aria-labelledby={`${id}-b${i}`}
              className="n-panneau"
              data-ouvert={est ? "" : undefined}
            >
              <div>{r.contenu}</div>
            </div>
            <div aria-hidden="true" className="h-px origin-left bg-rule" />
          </Apparition>
        );
      })}
    </div>
  );
}
