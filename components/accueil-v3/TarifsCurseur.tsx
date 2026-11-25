"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les tarifs de l'accueil, au curseur — 25/11/2026

   Modèle choisi par Teo sur 21st.dev : la « pricing section » à curseur
   « Number of Users » au-dessus de trois cartes (pastille centrée, grand
   prix, description, ligne de calcul, coches, bouton pleine largeur ; la
   carte du milieu en avant).

   Ce qui change par rapport au modèle :
   · le curseur ne recalcule QUE le logiciel de gestion, 34,90 € par
     personne et par mois. Les agents gardent leur prix fixé à l'audit, et
     les deux ne s'additionnent jamais (règle des associés du 24/11) ;
   · pas de Radix Slider ni de Badge shadcn : le projet n'en a pas, et un
     <input type="range"> natif suffit (clavier, lecteur d'écran) sans
     toucher au package-lock que partagent toutes les sessions ;
   · le chiffre roule avec NumberFlow, déjà au projet ;
   · les couleurs sont celles de l'accueil (fond neutral-950, blancs
     translucides), pas les jetons shadcn.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { ArrowRight, CircleCheck } from "lucide-react";
import Apparition from "@/components/accueil/Apparition";
import { CURSEUR, PRIX } from "@/components/accueil-v3/textes";

/* le montant au centime près, sans l'erreur de virgule flottante de 34,9 × 3 */
const montant = (parPersonne: number, personnes: number) =>
  Math.round(parPersonne * 100 * personnes) / 100;

const personnesTexte = (n: number) => (n === 1 ? "1\u00a0personne" : `${n}\u00a0personnes`);

export default function TarifsCurseur() {
  const [personnes, setPersonnes] = useState(CURSEUR.defaut);
  const rempli = ((personnes - CURSEUR.min) / (CURSEUR.max - CURSEUR.min)) * 100;

  return (
    <div className="flex flex-col items-center">
      {/* ── le curseur ── */}
      <div className="mb-10 w-full max-w-md md:mb-14">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <label htmlFor="tc-personnes" className="text-sm font-medium text-white/85">
            {CURSEUR.libelle}
          </label>
          <span className="text-sm font-semibold tabular-nums text-white" aria-hidden>
            {personnesTexte(personnes)}
          </span>
        </div>
        <input
          id="tc-personnes"
          type="range"
          min={CURSEUR.min}
          max={CURSEUR.max}
          step={1}
          value={personnes}
          onChange={(e) => setPersonnes(Number(e.target.value))}
          aria-valuetext={personnesTexte(personnes)}
          className={[
            /* `text-white` fixe la couleur courante : l'accueil la traduit en
               encre (.aa-clair, accueil.css) — piste et curseur la suivent */
            "h-2 w-full cursor-pointer appearance-none rounded-full bg-transparent text-white outline-none",
            "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current",
            "[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full",
            "[&::-webkit-slider-thumb]:-mt-[7px] [&::-webkit-slider-thumb]:size-[22px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-current [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110",
            "[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent",
            "[&::-moz-range-thumb]:size-[18px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-current [&::-moz-range-thumb]:bg-white",
          ].join(" ")}
          style={{
            /* la piste remplie jusqu'au curseur, sans pseudo-élément de plus */
            background: `linear-gradient(to right, currentColor ${rempli}%, color-mix(in srgb, currentColor 12%, transparent) ${rempli}%)`,
          }}
        />
        <div className="mt-2 flex justify-between text-xs tabular-nums text-white/45" aria-hidden>
          <span>{CURSEUR.min}</span>
          <span>{CURSEUR.max}</span>
        </div>
      </div>

      {/* ── les trois cartes ── */}
      <div className="grid w-full grid-cols-1 items-center gap-6 lg:grid-cols-3">
        {PRIX.map((p, k) => {
          const total = p.parPersonne === null ? null : montant(p.parPersonne, personnes);
          return (
            <Apparition
              key={p.nom}
              delai={k * 120}
              className={[
                "relative flex h-full flex-col rounded-2xl border p-7 transition-all duration-200 md:p-9",
                p.fort
                  ? "z-10 border-white/[0.18] bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.35)] lg:scale-[1.04]"
                  : "border-white/[0.08] bg-white/[0.02]",
              ].join(" ")}
            >
              {/* la mention de la carte forte, à cheval sur le filet (comme
                  « Recommandé » sur /tarifs) : dans la pastille du nom, elle
                  la cassait sur deux lignes à 390 px */}
              {p.badge ? (
                <span className="absolute inset-x-0 -top-3.5 mx-auto w-fit whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-medium text-neutral-950">
                  <span aria-hidden>★ </span>
                  {p.badge}
                </span>
              ) : null}

              {/* pastille, prix, description, ligne de calcul — centrés */}
              <div className="text-center">
                <span
                  className={[
                    "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium",
                    p.fort ? "border-white/[0.18] text-white" : "border-white/[0.14] text-white/85",
                  ].join(" ")}
                >
                  {p.nom}
                </span>

                <p
                  className={[
                    "mt-5 text-4xl font-semibold tracking-tight tabular-nums md:text-[2.75rem]",
                    p.fort ? "text-white" : "text-white/90",
                  ].join(" ")}
                >
                  {total === null ? (
                    p.prix
                  ) : (
                    <NumberFlow
                      value={total}
                      locales="fr-FR"
                      format={{
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: Number.isInteger(total) ? 0 : 2,
                        maximumFractionDigits: 2,
                      }}
                    />
                  )}
                  {total === null ? null : <span className="text-xl font-normal text-white/55">/mois</span>}
                </p>

                <p className="mx-auto mt-3 max-w-[30ch] text-sm leading-relaxed text-white/60 text-balance">
                  {p.texte}
                </p>
                <p className="mt-2 text-xs text-white/45">
                  {total === null
                    ? p.sous
                    : personnes === 1
                      ? "HT pour 1\u00a0personne"
                      : `HT pour ${personnesTexte(personnes)}, soit ${p.prix} par personne`}
                </p>
              </div>

              <div className="my-6 border-t border-white/[0.08]" />

              <ul className="flex flex-1 flex-col gap-3">
                {p.points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2.5 text-sm leading-relaxed text-white/70">
                    <CircleCheck
                      aria-hidden
                      className={["mt-0.5 size-4 shrink-0", p.fort ? "text-white" : "text-white/55"].join(" ")}
                      strokeWidth={1.75}
                    />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={p.href}
                className={[
                  "mt-7 inline-flex w-full items-center justify-center gap-1.5 rounded-[10px] px-5 py-3 text-sm font-medium transition-colors",
                  p.fort
                    ? "bg-white text-neutral-950 hover:bg-neutral-200"
                    : "border border-white/[0.14] bg-white/[0.02] text-white hover:bg-white/[0.06]",
                ].join(" ")}
              >
                {p.bouton}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Apparition>
          );
        })}
      </div>
    </div>
  );
}
