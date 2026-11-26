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

   Vivante comme la référence (entrees.ts) : à l'entrée, les montants
   montent et les barres poussent de gauche à droite, chaque repère avec un
   léger rebond et son étiquette ; au survol, les barres de la ligne visée
   se soulèvent, les autres postes pâlissent, une info-bulle dit le poste,
   son montant et sa part du facturé.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { aLEntree, bouger, composer, COURBES, css, decouper } from "./entrees";

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

/* courbes du survol (référence : outBack(2) pour soulever, outBack(1.6)
   pour faire paraître l'info-bulle) */
const SOULEVER = COURBES.outBack(2);
const PARAITRE = COURBES.outBack(1.6);

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
  const bulleRef = useRef<HTMLDivElement | null>(null);
  const [largeur, setLargeur] = useState(940);
  const [mesure, setMesure] = useState(false);
  /* la ligne survolée (indice dans `lignes`), et la dernière montrée :
     l'info-bulle reste posée pendant qu'elle s'efface */
  const [survol, setSurvol] = useState<number | null>(null);
  const [montree, setMontree] = useState<number | null>(null);

  useEffect(() => {
    const cadre = svg.current?.parentElement;
    if (!cadre) return;
    const obs = new ResizeObserver(([e]) => {
      const l = e.contentRect.width;
      if (l > 0) {
        setLargeur(l);
        setMesure(true);
      }
    });
    obs.observe(cadre);
    return () => obs.disconnect();
  }, []);

  const nombre = Math.max(2, Math.round((largeur - 3) / PAS) + 1);
  const pas = (largeur - 3) / (nombre - 1);
  const totaux = categories.map((c) => c.montants.reduce((a, m) => a + Math.max(0, m), 0));
  const total = totaux.reduce((a, b) => a + b, 0);
  const limites = bornes(totaux, nombre);

  const barres: { x: number; categorie: number; ligne: number; teinte: string; repere: boolean }[] = [];
  const lignes: { categorie: number; debut: number; fin: number; montant: number }[] = [];
  categories.forEach((c, t) => {
    const debut = limites[t];
    const fin = limites[t + 1];
    const montants = c.montants.length ? c.montants : null;
    const sous = bornes(montants ?? [1, 1, 1], fin - debut);
    const teintes = nuances(montants ? montants.length : 3, TEINTES[c.couleur]);
    if (!montants) lignes.push({ categorie: t, debut, fin, montant: totaux[t] });
    sous.slice(0, -1).forEach((a, r) => {
      if (montants) lignes.push({ categorie: t, debut: debut + a, fin: debut + sous[r + 1], montant: Math.max(0, montants[r]) });
      for (let s = debut + a; s < debut + sous[r + 1]; s++) {
        barres.push({ x: milli(s * pas), categorie: t, ligne: lignes.length - 1, teinte: teintes[r], repere: s === debut });
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

  /* ── L'entrée, une fois la largeur mesurée (le nombre de barres en dépend) ── */
  useEffect(() => {
    const cadre = svg.current?.parentElement;
    const carte = cadre?.closest('[data-slot="chart-card"]');
    if (!mesure || !cadre || !carte) return;
    const { outExpo, outQuad, outBack } = COURBES;
    const q = (el: Element, sel: string) => [...el.querySelectorAll<HTMLElement>(sel)];
    return aLEntree(carte, (c) => {
      const chiffres = q(carte, '[data-slot="pay-breakdown-chart-revenue"], [data-slot="pay-breakdown-chart-expenses"], [data-slot="pay-breakdown-chart-share"]');
      const m = chiffres.map((e) => decouper(e.textContent || ""));
      c.suivre((p) => chiffres.forEach((e, i) => (e.textContent = composer(m[i], null, p))), { duree: 1600, courbe: outExpo, a: 0 })
        .ajouter(q(carte, '[data-slot="chart-change-badge"]'), { opacity: 0, transform: "scale(.6)" }, { duree: 600, courbe: outBack(2), a: 250, decale: 120 })
        .ajouter(q(carte, '[data-slot="pay-breakdown-chart-manage"]'), { opacity: 0, transform: "translateY(4px)" }, { duree: 500, courbe: outQuad, a: 200 })
        .ajouter(q(carte, '[data-slot="pay-breakdown-chart-divider"]'), { transform: "scaleX(0)" }, { duree: 900, courbe: outExpo, a: 150 });
      const reperes = q(cadre, '[data-slot="pay-breakdown-chart-label"]');
      q(cadre, '[data-slot="pay-breakdown-chart-tick"]').forEach((t) => {
        const a = 300 + 6 * Number(t.getAttribute("data-index"));
        if (!t.hasAttribute("data-marker")) {
          c.ajouter([t], { transform: "scaleY(0)" }, { duree: 700, courbe: outExpo, a });
          return;
        }
        c.ajouter([t], { transform: "scaleY(0)" }, { duree: 900, courbe: outBack(1.4), a });
        const etiquette = reperes[Number(t.getAttribute("data-category"))];
        if (etiquette) c.ajouter([etiquette], { opacity: 0, transform: "translateX(-6px)" }, { duree: 500, courbe: outQuad, a: a + 120 });
      });
    });
  }, [mesure]);

  /* ── Le survol : quelle ligne est sous le pointeur ── */
  const etat = useRef({ lignes, pas, nombre });
  useLayoutEffect(() => {
    etat.current = { lignes, pas, nombre };
  });
  useEffect(() => {
    const cadre = svg.current?.parentElement;
    if (!cadre) return;
    const viser = (e: PointerEvent) => {
      const { lignes: ls, pas: p, nombre: n } = etat.current;
      const r = cadre.getBoundingClientRect();
      const echelle = r.width / (cadre.offsetWidth || r.width || 1) || 1;
      const x = (e.clientX - r.left) / echelle;
      const s = p > 0 ? Math.min(n - 1, Math.max(0, Math.round((x - 1.5) / p))) : 0;
      const i = Math.max(0, ls.findIndex((l) => s >= l.debut && s < l.fin));
      setSurvol(i);
      setMontree(i);
    };
    const quitter = () => setSurvol(null);
    cadre.addEventListener("pointermove", viser);
    cadre.addEventListener("pointerdown", viser);
    cadre.addEventListener("pointerleave", quitter);
    return () => {
      cadre.removeEventListener("pointermove", viser);
      cadre.removeEventListener("pointerdown", viser);
      cadre.removeEventListener("pointerleave", quitter);
    };
  }, []);

  const visee = survol !== null ? lignes[survol] : undefined;
  const categorieVisee = visee ? visee.categorie : null;
  const montre = montree !== null ? lignes[montree] : undefined;

  /* L'info-bulle se pose au milieu de sa ligne, au-dessus de la jauge, sans
     sortir du cadre ; elle glisse d'une ligne à l'autre. */
  const place = useRef<{ gauche: number; visible: boolean } | null>(null);
  useLayoutEffect(() => {
    const el = bulleRef.current;
    if (!el || !montre) return;
    const w = el.offsetWidth;
    const centre = ((montre.debut + montre.fin - 1) / 2) * pas + 1.5;
    const gauche = Math.round(Math.min(Math.max(centre - w / 2, 0), Math.max(0, largeur - w)));
    el.style.left = `${gauche}px`;
    el.style.top = `${34 - el.offsetHeight}px`;
    const avant = place.current;
    const visible = survol !== null;
    place.current = { gauche, visible };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (visible && (!avant || !avant.visible)) {
      bouger(el, { opacity: 0, transform: "translateY(4px) scale(.94)" }, 320, PARAITRE);
    } else if (visible && avant && avant.gauche !== gauche) {
      bouger(el, { transform: `translateX(${avant.gauche - gauche}px)` }, 380, COURBES.outExpo);
    }
  }, [montre, survol, pas, largeur]);

  const euros = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  const pourcent = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " %";
  /* au-dessus de la ligne visée, ses barres se soulèvent depuis le centre */
  const soulevees = visee ? barres.map((b, i) => ({ b, i })).filter(({ b }) => b.ligne === survol && !b.repere) : [];
  const milieu = soulevees.length ? (soulevees[0].i + soulevees[soulevees.length - 1].i) / 2 : 0;

  return (
    <>
      <svg ref={svg} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
        {barres.map((b, i) => {
          const h = b.repere ? HAUT : BAS;
          const y = HAUT - h;
          const leve = survol !== null && b.ligne === survol && !b.repere;
          return (
            <g
              key={i}
              data-slot="pay-breakdown-chart-tick"
              data-index={i}
              data-category={b.categorie}
              data-marker={b.repere || undefined}
              className={`origin-bottom transition-opacity duration-300 motion-reduce:transition-none [transform-box:fill-box]${
                categorieVisee !== null && b.categorie !== categorieVisee ? " opacity-35" : ""
              }`}
            >
              <g
                data-slot="pay-breakdown-chart-lift"
                className="origin-bottom [transform-box:fill-box] motion-reduce:transition-none"
                style={
                  leve
                    ? { transform: `scaleY(${82 / 72})`, transition: `transform 450ms ${css(SOULEVER)} ${Math.round(Math.abs(i - milieu) * 18)}ms` }
                    : { transition: "transform 300ms cubic-bezier(.5,1,.89,1)" }
                }
              >
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
          className={`pointer-events-none absolute top-2 flex flex-col items-start gap-1 transition-opacity duration-300 motion-reduce:transition-none${
            etiquettes[t].cachee ? " opacity-0" : categorieVisee !== null && categorieVisee !== t ? " opacity-35" : ""
          }`}
          style={{ left: etiquettes[t].gauche, maxWidth: etiquettes[t].place }}
        >
          <span className="typo-label-01-medium -my-0.5 max-w-full truncate py-0.5 text-fg-soft">{c.etiquette}</span>
          <span data-slot="pay-breakdown-chart-share" className="typo-label-02-medium hug-w whitespace-nowrap text-fg-loud">
            {c.part}
          </span>
        </span>
      ))}
      {montre && (
        <div
          ref={bulleRef}
          aria-hidden="true"
          data-slot="pay-breakdown-chart-tooltip"
          className={`sxb-bulle${survol !== null ? "" : " sxb-bulle-cachee"}`}
        >
          <span className="typo-label-02-regular hug-w sxb-bulle-pale">{categories[montre.categorie]?.etiquette}</span>
          <span className="typo-label-03-medium hug-w sxb-bulle-blanc">{euros(montre.montant)}</span>
          <span className="typo-label-02-regular hug-w sxb-bulle-pale">{pourcent(total > 0 ? (montre.montant / total) * 100 : 0)} du facturé</span>
        </div>
      )}
    </>
  );
}
