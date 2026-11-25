"use client";

/* ══════════════════════════════════════════════════════════════════════
   LA JAUGE À BARRES de la fiche (bloc « SxFiche ») — décalque du
   « PayBreakdownChart » de la référence.

   Une rangée de barres fines, une par ≈ 8,68 px de large (937/108), dont la
   première de chaque catégorie monte à pleine hauteur (124 px contre 72).
   Les barres se répartissent entre les catégories, puis entre les lignes
   de chaque catégorie, AU PRORATA des montants — c'est une répartition
   dessinée, pas un axe.

   Le NOMBRE de barres dépend de la largeur réelle du cadre : la référence
   le mesure dans le navigateur (940 px par défaut au rendu serveur, soit
   109 barres), et recalcule à chaque changement de taille. Même formule
   ici, d'où le composant client. Les étiquettes se placent au début de
   leur catégorie et disparaissent quand il leur reste moins de 28 px.

   Non repris (voir LISEZ-MOI) : le survol, l'info-bulle et l'animation
   d'entrée de la bibliothèque d'origine.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";

export type CategorieBarres = {
  cle: string;
  etiquette: string;
  /** part affichée sous l'étiquette, déjà formatée (« 75 % ») */
  part: string;
  couleur: "purple" | "blue" | "orange" | "green" | "yellow";
  montants: number[];
};

const PAS = 937 / 108;
const HAUT = 124;
const BAS = 72;

const TEINTES: Record<CategorieBarres["couleur"], string[]> = {
  purple: ["fill-primary-purple-100", "fill-primary-purple-200", "fill-primary-purple-300", "fill-primary-purple-400", "fill-primary-purple-500"],
  blue: ["fill-primary-blue-100", "fill-primary-blue-200", "fill-primary-blue-300", "fill-primary-blue-400", "fill-primary-blue-500"],
  orange: ["fill-primary-orange-100", "fill-primary-orange-200", "fill-primary-orange-300", "fill-primary-orange-400", "fill-primary-orange-500"],
  green: ["fill-primary-green-100", "fill-primary-green-200", "fill-primary-green-300", "fill-primary-green-400", "fill-primary-green-500"],
  yellow: ["fill-primary-yellow-100", "fill-primary-yellow-100", "fill-primary-yellow-300", "fill-primary-yellow-400", "fill-primary-yellow-500"],
};

const milli = (v: number) => Math.round(1000 * v) / 1000;

/** Répartit `total` crans entre des valeurs, au prorata ; chaque valeur non
    nulle garde au moins un cran quand il y en a assez. Rend les bornes. */
function bornes(valeurs: number[], total: number): number[] {
  const v = valeurs.map((x) => Math.max(0, x));
  const somme = v.reduce((a, b) => a + b, 0);
  const b = [0];
  let cumul = 0;
  for (const x of v) {
    cumul += x;
    b.push(somme > 0 ? Math.round((cumul / somme) * total) : Math.round((b.length / v.length) * total));
  }
  b[b.length - 1] = total;
  if (v.filter((x) => x > 0).length <= total) {
    for (let e = 0; e < v.length; e++) {
      if (v[e] > 0 && !(b[e + 1] > b[e])) {
        if (b[e + 1] < total) {
          for (let t = e + 1; t < b.length - 1 && b[t] <= b[t - 1]; t++) b[t] = b[t - 1] + 1;
        } else {
          for (let t = e; t > 0 && b[t] >= b[t + 1]; t--) b[t] = b[t + 1] - 1;
        }
      }
    }
  }
  return b;
}

function nuances(n: number, gamme: string[]): string[] {
  if (n <= 1) return [gamme[4]];
  if (n === 2) return [gamme[2], gamme[4]];
  return Array.from({ length: n }, (_, t) => gamme[Math.round((4 * t) / (n - 1))]);
}

export default function SxBarres({ categories }: { categories: CategorieBarres[] }) {
  const svg = useRef<SVGSVGElement | null>(null);
  const [largeur, setLargeur] = useState(940);

  useEffect(() => {
    const cadre = svg.current?.parentElement;
    if (!cadre) return;
    const obs = new ResizeObserver(([e]) => {
      const l = e.contentRect.width;
      if (l > 0) setLargeur(l);
    });
    obs.observe(cadre);
    return () => obs.disconnect();
  }, []);

  const nombre = Math.max(2, Math.round((largeur - 3) / PAS) + 1);
  const pas = (largeur - 3) / (nombre - 1);
  const totaux = categories.map((c) => c.montants.reduce((a, m) => a + Math.max(0, m), 0));
  const limites = bornes(totaux, nombre);

  const barres: { x: number; categorie: number; teinte: string; repere: boolean }[] = [];
  categories.forEach((c, t) => {
    const debut = limites[t];
    const fin = limites[t + 1];
    const lignes = c.montants.length ? c.montants : null;
    const sous = bornes(lignes ?? [1, 1, 1], fin - debut);
    const teintes = nuances(lignes ? lignes.length : 3, TEINTES[c.couleur]);
    sous.slice(0, -1).forEach((a, r) => {
      for (let s = debut + a; s < debut + sous[r + 1]; s++) {
        barres.push({ x: milli(s * pas), categorie: t, teinte: teintes[r], repere: s === debut });
      }
    });
  });

  const etiquettes = categories.map((_, t) => {
    const gauche = Math.round(limites[t] * pas + 11);
    const place = Math.max(
      0,
      Math.floor((t < categories.length - 1 ? limites[t + 1] * pas : largeur + 8) - 8 - gauche),
    );
    return { gauche, place, cachee: limites[t + 1] <= limites[t] || place < 28 };
  });

  return (
    <>
      <svg ref={svg} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
        {barres.map((b, i) => {
          const h = b.repere ? HAUT : BAS;
          const y = HAUT - h;
          return (
            <g
              key={i}
              data-slot="pay-breakdown-chart-tick"
              data-index={i}
              data-category={b.categorie}
              data-marker={b.repere || undefined}
              className="origin-bottom transition-opacity duration-300 motion-reduce:transition-none [transform-box:fill-box]"
            >
              <g data-slot="pay-breakdown-chart-lift" className="origin-bottom [transform-box:fill-box]">
                <rect
                  x={milli(b.x - 1)}
                  y={y - 1}
                  width={5}
                  height={h + 2}
                  rx={2.5}
                  className={`transition-[fill] duration-500 motion-reduce:transition-none ${b.teinte}`}
                />
                <rect x={b.x} y={y} width={3} height={h} rx={1.5} fill="#fff" fillOpacity={0.19} />
              </g>
            </g>
          );
        })}
      </svg>
      {categories.map((c, t) => (
        <span
          key={c.cle}
          aria-hidden="true"
          data-slot="pay-breakdown-chart-label"
          className={`pointer-events-none absolute top-2 flex flex-col items-start gap-1 transition-opacity duration-300 motion-reduce:transition-none${etiquettes[t].cachee ? " opacity-0" : ""}`}
          style={{ left: etiquettes[t].gauche, maxWidth: etiquettes[t].place }}
        >
          <span className="typo-label-01-medium -my-0.5 max-w-full truncate py-0.5 text-fg-soft">{c.etiquette}</span>
          <span data-slot="pay-breakdown-chart-share" className="typo-label-02-medium hug-w whitespace-nowrap text-fg-loud">
            {c.part}
          </span>
        </span>
      ))}
    </>
  );
}
