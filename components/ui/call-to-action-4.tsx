import { ArrowRight, Check } from "lucide-react";
import type { ReactNode } from "react";

/* ══════════════════════════════════════════════════════════════════════
   call-to-action-4 — l'appel en carte à deux volets (14/09/2026)

   Reprise du bloc « Call to action four » de Tailark (Méschac Irung,
   publié sur 21st.dev ; source publique : github.com/tailark/blocks,
   registry/bases/radix/veil/blocks/call-to-action/four.tsx). Une carte
   cernée : à gauche le titre, le texte et une liste à coches ; à droite
   un encart voilé qui porte une petite mention, une GRANDE mention (le
   « $0/month » de l'original), une ligne dessous et le bouton.

   Trois écarts assumés : le bouton est celui du site (`r-btn--noir`),
   `font-serif` devient la Jakarta des titres, et la bascule à deux
   colonnes se fait au palier `md` de la page plutôt qu'à la requête de
   conteneur `@xl` (le site n'a pas de `@container` posé ici).
   ══════════════════════════════════════════════════════════════════════ */

export function CallToAction4({
  titre,
  texte,
  points,
  encart,
  className = "",
}: {
  titre: string;
  texte: ReactNode;
  points: string[];
  encart: {
    sur: string;
    grand: string;
    sous: ReactNode;
    bouton: { label: string; href: string };
  };
  className?: string;
}) {
  return (
    <div
      className={`grid gap-8 rounded-xl border border-neutral-200 bg-white p-6 md:grid-cols-2 md:p-8 ${className}`}
    >
      <div>
        {/* 15/09 — 24 px sous 480 : à 390 le `text-3xl` (30/36) posait la
            question du bandeau sur deux lignes hautes, juste au-dessus
            d'une liste à coches de 15 px. La taille de bureau revient dès
            480 px. */}
        <h2 className="text-balance font-[family-name:var(--font-jakarta)] text-2xl font-medium tracking-[-0.02em] text-neutral-900 min-[480px]:text-3xl">
          {titre}
        </h2>
        <p className="mt-3 text-balance text-neutral-500">{texte}</p>
        <ul className="mt-6 space-y-2">
          {points.map((p) => (
            <li key={p} className="flex items-center gap-2 text-sm text-neutral-500">
              <Check aria-hidden className="size-4 shrink-0 text-neutral-900" />
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col justify-center rounded-xl border border-neutral-200 bg-neutral-50 p-6">
        <p className="text-sm text-neutral-500">{encart.sur}</p>
        <p className="mt-1 font-[family-name:var(--font-jakarta)] text-4xl font-medium tracking-[-0.02em] text-neutral-900">
          {encart.grand}
        </p>
        <p className="mt-1 text-sm text-neutral-500">{encart.sous}</p>
        <a href={encart.bouton.href} className="r-btn r-btn--noir mt-6 w-fit gap-2">
          {encart.bouton.label}
          <ArrowRight aria-hidden className="size-4" />
        </a>
      </div>
    </div>
  );
}
