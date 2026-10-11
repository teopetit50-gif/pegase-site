"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le graphique du pilotage, à la manière des tuiles de PMT (11/10/2026)

   Demande de Teo : « exactement ceux du PMT, 1:1 ». Une tuile par série,
   en grille, chacune comme un graphique de cours :
     · en tête : le nom de la série, « vue d'ensemble », la valeur du jour
       et l'écart avec la période précédente ;
     · le tracé : un trait fin, anguleux d'un jour à l'autre (pas lissé),
       un dégradé de la couleur sous la courbe ;
     · l'échelle à droite, la dernière valeur dans une étiquette pleine
       sur l'axe, reliée à la courbe par un pointillé ;
     · les dates en bas ; au survol, un réticule et une bulle.
   Écart assumé : PMT mêle l'orange et le bleu ; ici, tout est en bleu, la
   seule couleur du tableau de bord (Teo, 10/10).
   ══════════════════════════════════════════════════════════════════════ */

import { useId, useState } from "react";

export type Serie = { cle: string; libelle: string; valeurs: number[]; avant: number[]; couleur?: string };
const JOUR = 86_400_000;
const L = 600;
const H = 160;

const somme = (v: number[]) => v.reduce((a, b) => a + b, 0);
function arrondi(max: number) {
  if (max <= 4) return 4;
  const pas = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / pas;
  return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * pas;
}
export function Ecart({ t, a, inverse }: { t: number; a: number; inverse?: boolean }) {
  const e = a ? (t - a) / a : null;
  const bon = e === null || e === 0 ? undefined : (e > 0) !== !!inverse ? "haut" : "bas";
  return (
    <span className="om-ecart" data-sens={bon} title={`Période précédente : ${a.toLocaleString("fr-FR")}`}>
      {e === null ? (t ? "nouveau" : "—") : `${e > 0 ? "+" : e < 0 ? "−" : ""}${Math.round(Math.abs(e) * 100)} %`}
    </span>
  );
}

export default function Graphique({ series, debut }: { series: Serie[]; debut: number }) {
  return (
    <div className="om-pmt">
      {series.map((s) => (
        <Tuile key={s.cle} s={s} debut={debut} />
      ))}
    </div>
  );
}

function Tuile({ s, debut }: { s: Serie; debut: number }) {
  const id = useId().replace(/:/g, "");
  const [survol, setSurvol] = useState<number | null>(null);
  const v = s.valeurs;
  const n = v.length;
  const haut = arrondi(Math.max(1, ...v));
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * L : 0);
  const y = (val: number) => H - (val / haut) * (H - 8) - 4;
  const trace = v.map((val, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(val).toFixed(1)}`).join("");
  const derniere = v[n - 1] ?? 0;
  const veille = v[n - 2] ?? 0;
  const ecartJour = derniere - veille;
  const date = (i: number, long = false) => new Date(debut + i * JOUR).toLocaleDateString("fr-FR", long ? { weekday: "short", day: "numeric", month: "long" } : { day: "numeric", month: "short" });
  const reperes = n > 2 ? [0, Math.round((n - 1) / 3), Math.round(((n - 1) * 2) / 3), n - 1] : [0, n - 1];
  const graduations = [1, 0.75, 0.5, 0.25, 0].map((p) => Math.round(haut * p));
  const total = somme(v);

  return (
    <section className="om-pmt-tuile" aria-label={`${s.libelle} : ${total} sur la période`}>
      <header className="om-pmt-tete">
        <p className="om-pmt-nom">
          <b>{s.libelle}</b>
          <span>Vue d&apos;ensemble</span>
        </p>
        <p className="om-pmt-cours">
          <span className="om-pmt-symbole">{s.libelle.split(" ")[0].toUpperCase().slice(0, 6)}</span>
          <span className="om-pmt-unite">1J</span>
          <b>{derniere.toLocaleString("fr-FR")}</b>
          <span className="om-pmt-variation" data-sens={ecartJour > 0 ? "haut" : ecartJour < 0 ? "bas" : undefined}>
            {ecartJour > 0 ? "+" : ecartJour < 0 ? "−" : ""}
            {Math.abs(ecartJour)} ({veille ? `${ecartJour > 0 ? "+" : ecartJour < 0 ? "−" : ""}${Math.round((Math.abs(ecartJour) / veille) * 100)} %` : "—"})
          </span>
          <span className="om-pmt-total">
            Total <b>{total.toLocaleString("fr-FR")}</b> <Ecart t={total} a={somme(s.avant)} />
          </span>
        </p>
      </header>

      <div className="om-pmt-corps">
        <div className="om-pmt-zone" onMouseLeave={() => setSurvol(null)}>
          {graduations.map((g) => (
            <span key={g} className="om-pmt-grille" style={{ top: `${(y(g) / H) * 100}%` }} aria-hidden="true" />
          ))}
          <svg className="om-pmt-svg" viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${s.libelle}, jour par jour`}>
            <defs>
              <linearGradient id={`d${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--v2-blue-700)" stopOpacity="0.42" />
                <stop offset="100%" stopColor="var(--v2-blue-700)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={`${trace}L${L},${H}L0,${H}Z`} fill={`url(#d${id})`} />
            <path d={trace} fill="none" stroke="var(--v2-blue-700)" strokeWidth={1.25} vectorEffect="non-scaling-stroke" strokeLinejoin="miter" />
            <line x1={0} x2={L} y1={y(derniere)} y2={y(derniere)} stroke="var(--v2-blue-700)" strokeWidth={1} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" opacity={0.7} />
            {survol !== null ? <line x1={x(survol)} x2={x(survol)} y1={0} y2={H} stroke="var(--v2-gray-700)" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" /> : null}
          </svg>
          {survol !== null ? <span className="om-pmt-point" style={{ left: `${(x(survol) / L) * 100}%`, top: `${(y(v[survol]) / H) * 100}%` }} aria-hidden="true" /> : null}
          <ol className="om-pmt-cibles" aria-hidden="true">
            {v.map((_, i) => (
              <li key={i} onMouseEnter={() => setSurvol(i)} />
            ))}
          </ol>
          {survol !== null ? (
            <div className="om-pmt-bulle" data-bord={survol > n * 0.7 ? "droite" : undefined} style={{ left: `${(x(survol) / L) * 100}%` }} role="status">
              <span>{date(survol, true)}</span>
              <b>{v[survol].toLocaleString("fr-FR")}</b>
            </div>
          ) : null}
        </div>
        <div className="om-pmt-axe-y" aria-hidden="true">
          {graduations.map((g) => (
            <span key={g} style={{ top: `${(y(g) / H) * 100}%` }}>
              {g.toLocaleString("fr-FR")}
            </span>
          ))}
          <span className="om-pmt-etiquette" style={{ top: `${(y(derniere) / H) * 100}%` }}>
            {derniere.toLocaleString("fr-FR")}
          </span>
        </div>
        <div className="om-pmt-axe-x" aria-hidden="true">
          {reperes.map((i) => (
            <span key={i} style={{ left: `${(x(i) / L) * 100}%` }} data-bout={i === 0 ? "debut" : i === n - 1 ? "fin" : undefined}>
              {i === n - 1 ? "Auj." : date(i)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
