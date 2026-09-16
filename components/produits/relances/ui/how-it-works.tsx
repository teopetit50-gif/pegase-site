"use client";

import { cn } from "@/components/produits/relances/utils";
import type React from "react";
import { useState } from "react";

/* Composant 21st.dev « how-it-works », adapté.
   Trois écarts au code d'origine, tous notés ici :
   1. Les données ne sont pas en dur dans le composant : elles arrivent en
      `props`, sinon le texte du site vit à deux endroits.
   2. La rangée de numéros n'apparaît qu'à partir de `md`. Son trait de
      liaison est calé en dur sur trois colonnes (`left-[16.6667%]`) ; en
      une seule colonne il traverse le vide.
   3. Le survol d'origine (`hover:scale-105 hover:bg-muted`) déplace la
      carte et change son fond : trop bavard pour cette page, qui n'a
      aucune autre carte qui bouge au survol. On garde l'ombre.

   RAPATRIEMENT 11/09 — couleurs converties en valeurs arbitraires :
   `border-border` → `border-[#e6e6e6]`, `bg-card` → `bg-[#ffffff]`,
   `text-card-foreground` → `text-[#171717]`, `bg-muted` → `bg-[#f5f5f5]`,
   `text-foreground` → `text-[#171717]`, `text-muted-foreground` →
   `text-[#737373]`, `bg-foreground/15` → `bg-[#171717]/15`,
   `bg-foreground` → `bg-[#171717]`, `ring-background` → `ring-[#ffffff]`,
   `hover:border-foreground/20` → `hover:border-[#171717]/20`.
   ⚠ `bg-muted` méritait une attention particulière : l'utilitaire EXISTE
   sur ce site — mais il y vaut #9b9ba3, le gris de texte de la charte
   sombre, et non le #f5f5f5 de la référence. Seul cas du rapatriement où
   une utilitaire du site source aurait peint, et peint faux. */

export interface Etape {
  icone: React.ReactNode;
  titre: string;
  texte: string;
  points: readonly string[];
}

function CarteEtape({ icone, titre, texte, points, className }: Etape & { className?: string }) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-[#e6e6e6] bg-[#ffffff] p-6 text-[#171717] transition-shadow duration-300",
        "hover:border-[#171717]/20 hover:shadow-lg",
        className,
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-[#f5f5f5] text-[#171717]">
        {icone}
      </div>
      <h3 className="mb-2 font-semibold text-xl">{titre}</h3>
      <p className="mb-6 text-[#737373]">{texte}</p>
      <ul className="space-y-3">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-3">
            <span className="mt-[7px] flex size-4 shrink-0 items-center justify-center rounded-full bg-[#171717]/15">
              <span className="size-2 rounded-full bg-[#171717]" />
            </span>
            <span className="text-[#737373] text-sm leading-relaxed">{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HowItWorks({
  sourcil,
  titre,
  chapo,
  etapes,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  sourcil: string;
  titre: string;
  chapo: string;
  etapes: readonly Etape[];
}) {
  /* 16/09/2026 (Teo, par l'associé) — « toute la page est cent fois trop
     remplie sur mobile, mettre beaucoup moins de texte ». Arbitrage de
     l'associé le même jour : replier plutôt que couper — « rien de perdu,
     tout derrière un geste ».

     Les trois cartes s'empilent sous 768 et pèsent près de 1 500 px à
     elles seules, titre et chapô compris. La première reste, les autres
     suivent d'un geste. Sur ordinateur elles sont sur TROIS COLONNES et
     coûtent la hauteur d'une seule : le repli n'y a aucun sens, et le
     bouton n'y est même pas rendu (`md:hidden`).

     Les cartes cachées restent dans le DOM (`hidden md:block`) : même
     balisage partout, rien ne clignote au montage, et la recherche dans
     la page les trouve. */
  const [tout, setTout] = useState(false);
  return (
    <section
      data-monde="clair"
      className={cn("w-full py-16 sm:py-20 md:py-28", className)}
      {...props}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-4xl text-center md:mb-16">
          <p className="font-mono text-[11px] text-[#737373] uppercase tracking-[0.2em]">
            {sourcil}
          </p>
          <h2 className="mt-6 text-balance font-bold text-4xl text-[#171717] tracking-tight md:text-5xl">
            {titre}
          </h2>
          <p className="mt-4 text-balance text-lg text-[#737373]">{chapo}</p>
        </div>

        {/* Les numéros et leur trait de liaison : à partir de md seulement. */}
        <div className="relative mx-auto mb-8 hidden w-full max-w-4xl md:block">
          <div
            aria-hidden
            className="-translate-y-1/2 absolute top-1/2 left-[16.6667%] h-px w-[66.6667%] bg-[#e6e6e6]"
          />
          <div className="relative grid grid-cols-3">
            {etapes.map((e, i) => (
              <div
                key={e.titre}
                className="flex size-8 items-center justify-center justify-self-center rounded-full bg-[#f5f5f5] font-mono font-semibold text-[#171717] text-sm ring-4 ring-[#ffffff]"
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {etapes.map((e, i) => (
            <CarteEtape
              key={e.titre}
              {...e}
              className={i === 0 || tout ? undefined : "hidden md:block"}
            />
          ))}
        </div>
        {etapes.length > 1 ? (
          <div className="mx-auto mt-6 max-w-4xl md:hidden">
            <button
              type="button"
              aria-expanded={tout}
              onClick={() => setTout((v) => !v)
              }
              className="font-medium text-[#737373] text-sm underline underline-offset-4"
            >
              {tout ? "Réduire" : `Lire la suite (${etapes.length - 1} autres)`}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
