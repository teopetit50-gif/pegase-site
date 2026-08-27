"use client";

import { Children, useState } from "react";

/* ══════════════════════════════════════════════════════════════════════
   <Categorie> — une famille du catalogue : titre, trois modèles, et un
   bouton qui déplie le reste.

   Découpage voulu par Teo le 03/08 : « range les design et site par
   catégorie […] tu mets 3 et un bouton voir plus ». Vingt-deux cartes
   d'affilée, c'était un mur qu'on faisait défiler sans jamais choisir.

   Les cartes arrivent en `children`, déjà rendues par le serveur — c'est
   ce qui permet à ce composant d'être le SEUL morceau client de la page.
   <CarteModele> reste un composant serveur ; on n'envoie pas au navigateur
   le balisage de vingt-deux cartes pour gérer un bouton.

   Les cartes au-delà de la troisième sont RENDUES mais masquées en CSS,
   jamais retirées de l'arbre. Deux raisons : le HTML livré contient les
   vingt-deux modèles, donc Google les voit tous ; et le dépliage est
   instantané, sans à-coup de montage. Les images ne sont pas chargées pour
   autant — next/image reste en `loading="lazy"`, et un conteneur en
   `display:none` n'entre jamais dans le viewport.
   ══════════════════════════════════════════════════════════════════════ */

const SEUIL = 3;

export default function Categorie({
  titre,
  pour,
  children,
}: {
  titre: string;
  pour: string;
  children: React.ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  const cartes = Children.toArray(children);
  const reste = cartes.length - SEUIL;

  return (
    <div className="mt-14 first:mt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <h3 className="text-[clamp(1.15rem,1.9vw,1.5rem)]">{titre}</h3>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[color:var(--m-faible)]">
          {cartes.length} modèle{cartes.length > 1 ? "s" : ""}
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-[color:var(--m-doux)]">
        {pour}
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {cartes.map((carte, i) => (
          <div key={i} className={!ouvert && i >= SEUIL ? "hidden" : undefined}>
            {carte}
          </div>
        ))}
      </div>

      {reste > 0 && (
        <button
          type="button"
          onClick={() => setOuvert((v) => !v)}
          aria-expanded={ouvert}
          className="m-voirplus mt-6 inline-flex items-center gap-2 rounded-[var(--radius-btn)]
                     border border-black/15 px-5 py-2.5 text-[13.5px] font-medium
                     transition-colors hover:border-black/35 hover:bg-black/[0.04]"
        >
          {/* accord : la famille « Vos clients réservent » n'a qu'un modèle
              de plus, et « Voir les 1 autres » se remarque tout de suite */}
          {ouvert ? "Réduire" : reste === 1 ? "Voir le dernier" : `Voir les ${reste} autres`}
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
            className={`transition-transform duration-300 ${ouvert ? "rotate-180" : ""}`}
          >
            <path
              d="M4 6.5 8 10.5l4-4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
