"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le graphique du pilotage, d'après les tableaux de Vercel (09/10/2026,
   « Function Invocations », « 429 Status Codes », envoyés par Teo) :

     · en tête à droite, les pastilles de légende (point de couleur, nom,
       total, écart avec la période d'avant) — cliquer masque ou montre
       la série ; et trois boutons : courbe en escalier, barres, liste ;
     · la courbe en escalier : un trait fin, l'aire teintée dessous, les
       séries superposées, trois repères gris à peine marqués ;
     · au survol : une ligne de repère et une bulle (date, puis chaque
       série et sa valeur en chiffres à chasse fixe) ;
     · sous le graphique, le tableau des séries : moyenne, meilleur jour,
       total et écart.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { ChartColumn, ChartLine, List } from "lucide-react";

export type Serie = { cle: string; libelle: string; valeurs: number[]; avant: number[]; couleur?: string };
type Mode = "courbe" | "barres" | "liste";
const JOUR = 86_400_000;
const COULEURS = ["var(--v2-blue-700)", "var(--v2-amber-700)", "var(--v2-green-700)", "#8e4ec6"];
const L = 1000;
const H = 220;

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

export default function Graphique({ series: brutes, debut }: { series: Serie[]; debut: number }) {
  const series = brutes.map((s, i) => ({ ...s, couleur: s.couleur ?? COULEURS[i % COULEURS.length] }));
  const [caches, setCaches] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("courbe");
  const [survol, setSurvol] = useState<number | null>(null);
  const visibles = series.filter((s) => !caches.includes(s.cle));
  const n = series[0]?.valeurs.length ?? 0;
  const empile = (i: number) => visibles.reduce((a, s) => a + s.valeurs[i], 0);
  const haut = arrondi(Math.max(0, ...(mode === "barres" ? Array.from({ length: n }, (_, i) => empile(i)) : visibles.flatMap((s) => s.valeurs))));
  const date = (i: number, long = false) => new Date(debut + i * JOUR).toLocaleDateString("fr-FR", long ? { weekday: "short", day: "numeric", month: "long" } : { day: "numeric", month: "short" });
  const reperes = n > 1 ? [0, Math.round((n - 1) / 2), n - 1] : [0];
  const y = (v: number) => H - (v / haut) * H;
  const escalier = (v: number[]) => v.map((x, i) => `${i ? "H" : "M0,"}${i ? `${(i / n) * L}V${y(x)}` : y(x)}`).join("") + `H${L}`;
  const basculer = (cle: string) => setCaches((c) => (c.includes(cle) ? c.filter((x) => x !== cle) : visibles.length > 1 ? [...c, cle] : c));

  return (
    <div className="om-graph">
      <div className="om-graph-tete">
        <div className="om-graph-legende" role="group" aria-label="Séries affichées">
          {series.map((s) => (
            <button key={s.cle} type="button" className="om-graph-pastille" aria-pressed={!caches.includes(s.cle)} onClick={() => basculer(s.cle)}>
              <i style={{ background: s.couleur }} aria-hidden="true" />
              {s.libelle}
            </button>
          ))}
        </div>
        <div className="om-graph-modes" role="group" aria-label="Affichage">
          {(
            [
              ["courbe", ChartLine, "Courbe"],
              ["barres", ChartColumn, "Barres"],
              ["liste", List, "Liste"],
            ] as const
          ).map(([m, Icone, nom]) => (
            <button key={m} type="button" aria-label={nom} title={nom} aria-pressed={mode === m} onClick={() => setMode(m)}>
              <Icone width={15} height={15} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {mode === "liste" ? (
        <div className="om-graph-liste">
          <table className="om-graph-table">
            <thead>
              <tr>
                <th>Jour</th>
                {visibles.map((s) => (
                  <th key={s.cle}>{s.libelle}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: n }, (_, k) => n - 1 - k).map((i) => (
                <tr key={i}>
                  <td>{i === n - 1 ? "Aujourd'hui" : date(i, true)}</td>
                  {visibles.map((s) => (
                    <td key={s.cle} data-zero={s.valeurs[i] ? undefined : ""}>
                      {s.valeurs[i].toLocaleString("fr-FR")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="om-graph-corps">
          <div className="om-graph-axe-y" aria-hidden="true">
            {[1, 0.5, 0].map((p) => (
              <span key={p}>{Math.round(haut * p).toLocaleString("fr-FR")}</span>
            ))}
          </div>
          <div className="om-graph-zone" onMouseLeave={() => setSurvol(null)}>
            {[0, 0.5, 1].map((p) => (
              <span key={p} className="om-graph-grille" style={{ bottom: `${p * 100}%` }} aria-hidden="true" />
            ))}
            {mode === "courbe" ? (
              <svg key={`c${caches.join()}${n}`} className="om-graph-svg" viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none" role="img" aria-label={visibles.map((s) => `${s.libelle} : ${somme(s.valeurs)}`).join(", ")}>
                {visibles.map((s) => {
                  const d = escalier(s.valeurs);
                  return (
                    <g key={s.cle}>
                      <path d={`${d}V${H}H0Z`} fill={s.couleur} fillOpacity={0.12} />
                      <path d={d} fill="none" stroke={s.couleur} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                    </g>
                  );
                })}
              </svg>
            ) : (
              <ol key={`b${caches.join()}${n}`} className="om-graph-barres" style={{ gap: n > 60 ? 1 : n > 20 ? 3 : 6 }}>
                {Array.from({ length: n }, (_, i) => (
                  <li key={i}>
                    <span className="om-graph-pile" style={{ height: `${(empile(i) / haut) * 100}%`, animationDelay: `${Math.min(i * 6, 240)}ms` }}>
                      {visibles.map((s) =>
                        s.valeurs[i] ? <span key={s.cle} style={{ flexGrow: s.valeurs[i], background: s.couleur }} /> : null,
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <ol className="om-graph-cibles" aria-hidden="true">
              {Array.from({ length: n }, (_, i) => (
                <li key={i} data-survol={survol === i ? "" : undefined} onMouseEnter={() => setSurvol(i)} />
              ))}
            </ol>
            {survol !== null ? (
              <div className="om-graph-bulle" data-bord={survol < n * 0.2 ? "gauche" : survol > n * 0.8 ? "droite" : undefined} style={{ left: `${((survol + 0.5) / n) * 100}%` }} role="status">
                <span className="om-graph-bulle-date">{date(survol, true)}</span>
                {visibles.map((s) => (
                  <span key={s.cle} className="om-graph-bulle-ligne">
                    <i style={{ background: s.couleur }} aria-hidden="true" />
                    {s.libelle}
                    <b>{s.valeurs[survol].toLocaleString("fr-FR")}</b>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <span />
          <div className="om-graph-axe" aria-hidden="true">
            {reperes.map((i) => (
              <span key={i} style={{ left: `${((i + 0.5) / n) * 100}%` }}>
                {i === n - 1 ? "Aujourd'hui" : date(i)}
              </span>
            ))}
          </div>
        </div>
      )}

      <table className="om-graph-table om-graph-resume">
        <thead>
          <tr>
            <th>Série</th>
            <th>Par jour</th>
            <th>Meilleur jour</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {series.map((s) => {
            const t = somme(s.valeurs);
            const max = Math.max(0, ...s.valeurs);
            return (
              <tr key={s.cle} data-cache={caches.includes(s.cle) ? "" : undefined}>
                <td>
                  <i style={{ background: s.couleur }} aria-hidden="true" />
                  {s.libelle}
                </td>
                <td>{(t / Math.max(1, n)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</td>
                <td>{max ? `${max} · ${date(s.valeurs.indexOf(max))}` : "—"}</td>
                <td>
                  <Ecart t={t} a={somme(s.avant)} />
                  <b>{t.toLocaleString("fr-FR")}</b>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
