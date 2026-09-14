"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";

/* ══════════════════════════════════════════════════════════════════════
   « BENTO À LUEUR » — la grille inégale qui s'éclaire sous le pointeur
   (11/09/2026)

   ORIGINE. `cybernetic-bento-grid` (21st.dev) — une grille de tuiles de
   tailles inégales (`col-span-2 row-span-2`, `row-span-2`, `col-span-2`)
   dont chacune pose `--mouse-x` / `--mouse-y` sur elle-même à chaque
   mouvement de souris, une feuille de style se chargeant d'en tirer une
   lueur. Demandé par Teo le 11/09 en même temps que les deux autres
   reprises du jour.

   POURQUOI ICI. La section « à lire » était le plus GRAND bloc de texte de
   la page : 35 lignes vues sur 1 564 px (`outils/lignes-sections.mjs` à
   1 440 px), soit quatre cartes rigoureusement identiques en 2 × 2, chacune
   avec pastille, date, titre de deux lignes, extrait de trois à quatre
   lignes et un « Lire ». Quatre fois la même chose, et rien qui distingue
   l'article qu'on voudrait faire lire des trois autres. La grille inégale
   règle les deux défauts d'un coup : le premier article prend une tuile
   double, les extraits tombent, et la section descend à 12 lignes.

   CE QUI EST JETÉ de la source :

   1. Le fond sombre. L'original est noir (`text-white`, `bg-neutral-800`,
      `text-gray-400`). Cette section reste dans le monde CLAIR, et c'est
      une consigne, pas un goût : une bande noire posée au milieu de neuf
      sections claires a déjà été essayée sur cette page le 11/09 au matin
      et retirée dans la minute. La lueur est donc de l'encre à 5 % sur du
      blanc, pas un néon sur du noir.
   2. `cn()` / `components/ui` : absents de ce dépôt (voir `BentoChange`).
   3. La feuille `.bento-item` / `.bento-grid` / `.main-container` que la
      source suppose écrite à côté. Tout est ici en utilitaires et en
      `style` en ligne : `globals.css` fait 7 000 lignes et plusieurs
      sessions y écrivent le même jour — un composant qui n'y touche pas
      ne peut pas se faire écraser.
   4. Les six intitulés de démonstration (« Real-time Analytics »,
      « Global CDN »…) et le `Chart Placeholder` : les quatre articles du
      site sont les vrais, et ils ont leur page.

   ÉCART ASSUMÉ. La lueur de l'original est un liseré. Ici c'est une NAPPE
   à l'intérieur de la tuile — un disque d'encre très pâle qui suit le
   pointeur. `CartesLueur`, deux sections plus haut, porte déjà le liseré :
   répéter le même effet à 800 px d'intervalle l'aurait usé. Même idée, deux
   expressions, et la page n'a pas deux fois le même reflet.

   ÉCART ASSUMÉ (2). Seule la grande tuile garde un extrait, ramené à deux
   lignes. Une tuile sur deux rangées qui ne porterait qu'un titre serait
   un trou ; c'est le seul texte de la section qui n'a pas été coupé.
   ══════════════════════════════════════════════════════════════════════ */

export type TuileBento = {
  cat: string;
  date: string;
  titre: string;
  href: string;
  /** l'accroche, portée par la grande tuile seulement */
  extrait?: string;
  /** l'empan de la tuile dans la grille de quatre colonnes */
  span: string;
  grande?: boolean;
};

function Tuile({ cat, date, titre, href, extrait, span, grande }: TuileBento) {
  const cadre = useRef<HTMLAnchorElement>(null);
  const [souris, setSouris] = useState<{ x: number; y: number } | null>(null);

  const suivre = useCallback((e: React.MouseEvent) => {
    const r = cadre.current?.getBoundingClientRect();
    if (r) setSouris({ x: e.clientX - r.left, y: e.clientY - r.top });
  }, []);

  return (
    <Link
      ref={cadre}
      href={href}
      onMouseMove={suivre}
      onMouseLeave={() => setSouris(null)}
      data-reveal
      className={`group relative flex min-h-[168px] flex-col justify-between overflow-hidden rounded-[14px] border border-[#e4e4e7] bg-white p-7 transition-colors duration-300 hover:border-[#c4c4c8] ${span}`}
    >
      {/* la nappe d'encre qui suit le pointeur — 5 % d'opacité, c'est la
          limite au-delà de laquelle le blanc de la page se salit. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={
          souris
            ? {
                background: `radial-gradient(260px circle at ${souris.x}px ${souris.y}px, rgba(9,9,11,0.055), transparent 68%)`,
              }
            : undefined
        }
      />

      <span className="relative z-10 flex items-center gap-3">
        <span className="o-pill o-pill--xs">{cat}</span>
        <span className="o-small !text-[13px]">{date}</span>
      </span>

      {/* `<a>` a un modèle de contenu transparent : le titre d'article
          reste un `<h3>` à l'intérieur du lien, comme dans la grille qu'on
          remplace. Le perdre aurait rendu la section invisible à qui
          parcourt la page par ses titres. */}
      <span className="relative z-10 mt-10 block">
        <h3
          className={
            grande
              ? "o-h5 !text-[27px] !leading-[35px]"
              : "o-h5 !text-[19px] !leading-[27px]"
          }
        >
          {titre}
        </h3>
        {extrait ? (
          <p className="o-small mt-3 !text-[15px] !leading-[23px] !text-[#52525b]">
            {extrait}
          </p>
        ) : null}
        <span className="o-link mt-5 !text-[14px]">
          Lire
          <svg
            aria-hidden
            width={12}
            height={12}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>
      </span>
    </Link>
  );
}

export default function BentoLueur({ tuiles }: { tuiles: TuileBento[] }) {
  return (
    /* quatre colonnes sur `lg`, deux sur `sm`, une en dessous : les empans
       sont préfixés `lg:` dans les données, donc la grille se remet d'elle-même
       à plat sur les petites largeurs. */
    <div className="grid auto-rows-auto grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tuiles.map((t) => (
        <Tuile key={t.href} {...t} />
      ))}
    </div>
  );
}
