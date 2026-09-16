"use client";

import { Archive, CalendarClock, MessageSquare, TrendingUp } from "lucide-react";
import { BENTO, PROTOCOLE } from "@/lib/produits/relances";
import { useState } from "react";

import { FeatureCard } from "./ui/grid-feature-cards";

/* Le détail du moteur, sur le composant `grid-feature-cards`.

   Quatre grandes cartes de 380 px minimum, chacune avec son illustration
   animée, sont devenues quatre cases d'une grille dense. On garde
   toutefois la frise du protocole : c'est le meilleur visuel de la page,
   et elle dit en une rangée ce qu'aucune phrase ne dit aussi vite.

   RAPATRIEMENT 11/09 — `border-border` → `border-[#e6e6e6]`,
   `border-foreground/20 bg-foreground text-background` →
   `border-[#171717]/20 bg-[#171717] text-[#ffffff]`, `bg-card` →
   `bg-[#ffffff]`, `text-foreground` → `text-[#171717]`, `bg-border` →
   `bg-[#e6e6e6]`, `text-muted-foreground` → `text-[#737373]`,
   `divide-border` → `divide-[#e6e6e6]`. */

const ICONES = {
  echeancier: CalendarClock,
  escalade: TrendingUp,
  ton: MessageSquare,
  journal: Archive,
} as const;

function Frise() {
  const n = PROTOCOLE.jalons.length;
  return (
    <ol className="mt-12 grid gap-x-4 gap-y-5 border-[#e6e6e6] border-y py-8 sm:grid-cols-2 lg:grid-cols-4">
      {PROTOCOLE.jalons.map((j, i) => {
        const dernier = i === n - 1;
        return (
          <li key={j.jalon} className="flex gap-4 lg:block">
            <div className="lg:mb-4">
              <div className="relative flex items-center">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full border font-medium font-mono text-[11px] ${
                    dernier
                      ? "border-[#171717]/20 bg-[#171717] text-[#ffffff]"
                      : "border-[#e6e6e6] bg-[#ffffff] text-[#171717]"
                  }`}
                >
                  {j.jalon}
                </span>
                {!dernier ? (
                  <span className="max-lg:hidden absolute left-11 h-px w-[calc(100%_-_1rem)] bg-[#e6e6e6]" />
                ) : null}
              </div>
            </div>
            <div>
              <p className="font-medium text-[#171717] text-sm">{j.etape}</p>
              <p className="mt-0.5 text-[#737373] text-xs leading-relaxed">{j.precision}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* Combien de cartes restent sur téléphone. Deux : assez pour montrer de
   quoi parle le bloc, et la moitié de sa hauteur. */
const CARTES_MOBILE = 2;

export function Bento() {
  /* 16/09/2026 (Teo, par l'associé) — « toute la page CASHD est cent fois
     trop remplie sur mobile ». Arbitrage de l'associé : replier plutôt
     que couper, rien de perdu. Les quatre cartes s'empilent sous 640 et
     pèsent la moitié des 1 500 px de la section. Deux restent, deux
     suivent d'un geste. Dès `sm` elles sont sur deux colonnes, dès `lg`
     sur quatre : le repli n'y a plus lieu d'être, et le bouton n'est même
     pas rendu. */
  const [tout, setTout] = useState(false);
  return (
    <section id="detail" data-monde="clair" className="scroll-mt-24 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-end gap-8 md:grid-cols-2 md:gap-12">
          <h2 className="text-balance font-bold text-4xl text-[#171717] tracking-tight md:text-5xl">
            {BENTO.titre}
          </h2>
          <p className="max-w-md text-base text-[#737373] leading-relaxed">{BENTO.chapo}</p>
        </div>

        <Frise />
        <p className="mt-4 max-w-2xl text-[#737373] text-sm leading-relaxed">{PROTOCOLE.note}</p>

        <div className="mt-12 grid grid-cols-1 divide-x divide-y divide-dashed divide-[#e6e6e6] border border-[#e6e6e6] border-dashed sm:grid-cols-2 lg:grid-cols-4">
          {BENTO.cartes.map((c, i) => (
            <FeatureCard
              key={c.id}
              graine={i}
              className={i < CARTES_MOBILE || tout ? undefined : "hidden sm:block"}
              fonctionnalite={{
                titre: c.titre,
                icone: ICONES[c.id],
                texte: c.texte,
              }}
            />
          ))}
        </div>
        {BENTO.cartes.length > CARTES_MOBILE ? (
          <button
            type="button"
            aria-expanded={tout}
            onClick={() => setTout((v) => !v)}
            className="mt-6 font-medium text-[#737373] text-sm underline underline-offset-4 sm:hidden"
          >
            {tout ? "Réduire" : `Lire la suite (${BENTO.cartes.length - CARTES_MOBILE} autres)`}
          </button>
        ) : null}
      </div>
    </section>
  );
}
