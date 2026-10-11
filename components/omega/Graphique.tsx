"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le graphique du pilotage, à la manière des tuiles de PMT (11/10/2026)

   Demande de Teo : « exactement ceux du PMT ». Une tuile par série, en
   mosaïque, chacune comme un graphique de cours (Recharts, la base des
   graphiques de shadcn et de 21st.dev) :
     · en tête : le nom, la valeur courante sur 7 jours, sa variation sur
       une semaine, le total de la période et l'écart avec la précédente ;
     · le tracé : un trait fin et anguleux, un dégradé dessous, l'échelle
       à droite qui épouse la plage des valeurs (pas forcée à zéro) ;
     · la dernière valeur dans une étiquette pleine sur l'axe, reliée par
       un pointillé ; réticule et bulle au survol.
   Ce qui est tracé : le total sur 7 jours glissants. Les chiffres du jour
   (0, 1, 2…) faisaient une courbe en dents de scie qui retombait à zéro
   chaque jour creux ; le cumul sur 7 jours donne la cadence, en continu,
   comme un cours.
   Écart assumé : PMT mêle orange et bleu ; ici tout est bleu (Teo, 10/10).
   ══════════════════════════════════════════════════════════════════════ */

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type Serie = { cle: string; libelle: string; valeurs: number[]; avant: number[]; couleur?: string };
const JOUR = 86_400_000;
const FENETRE = 7;
const BLEU = "var(--v2-blue-700)";
const MONO = "var(--v2-mono)";

const somme = (v: number[]) => v.reduce((a, b) => a + b, 0);
export function Ecart({ t, a, inverse }: { t: number; a: number; inverse?: boolean }) {
  const e = a ? (t - a) / a : null;
  const bon = e === null || e === 0 ? undefined : (e > 0) !== !!inverse ? "haut" : "bas";
  return (
    <span className="om-ecart" data-sens={bon} title={`Période précédente : ${a.toLocaleString("fr-FR")}`}>
      {e === null ? (t ? "nouveau" : "—") : `${e > 0 ? "+" : e < 0 ? "−" : ""}${Math.round(Math.abs(e) * 100)} %`}
    </span>
  );
}

/* total glissant : la période précédente sert d'amorce pour les six premiers jours */
function glissant(valeurs: number[], avant: number[]) {
  const suite = [...avant.slice(-(FENETRE - 1)), ...valeurs];
  const decalage = suite.length - valeurs.length;
  return valeurs.map((_, i) => somme(suite.slice(Math.max(0, i + decalage - FENETRE + 1), i + decalage + 1)));
}
function bornes(v: number[]): [number, number] {
  const min = Math.min(...v);
  const max = Math.max(...v);
  const marge = Math.max(1, Math.ceil((max - min) * 0.12));
  return [Math.max(0, min - marge), max + marge];
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

const jourCourt = (t: number) => new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

function Tuile({ s, debut }: { s: Serie; debut: number }) {
  const id = useId().replace(/:/g, "");
  const courbe = glissant(s.valeurs, s.avant);
  const n = courbe.length;
  const donnees = courbe.map((val, i) => ({ t: debut + i * JOUR, val, jour: s.valeurs[i] }));
  const derniere = courbe[n - 1] ?? 0;
  const semaineAvant = n > FENETRE ? courbe[n - 1 - FENETRE] : glissant(s.avant, [])[Math.max(0, s.avant.length - 1)] ?? 0;
  const variation = derniere - semaineAvant;
  const [bas, haut] = bornes(courbe.length ? courbe : [0]);
  const reperes = n > 2 ? [0, Math.round((n - 1) / 3), Math.round(((n - 1) * 2) / 3), n - 1].map((i) => debut + i * JOUR) : [debut];
  const total = somme(s.valeurs);
  const signe = (x: number) => (x > 0 ? "+" : x < 0 ? "−" : "");

  return (
    <section className="om-pmt-tuile" aria-label={`${s.libelle} : ${derniere} sur 7 jours, ${total} sur la période`}>
      <header className="om-pmt-tete">
        <p className="om-pmt-nom">
          <b>{s.libelle}</b>
          <span>sur 7 jours glissants</span>
        </p>
        <p className="om-pmt-cours">
          <span className="om-pmt-symbole">{s.libelle.split(" ")[0].toUpperCase().slice(0, 7)}</span>
          <span className="om-pmt-unite">7J</span>
          <b>{derniere.toLocaleString("fr-FR")}</b>
          <span className="om-pmt-variation" data-sens={variation > 0 ? "haut" : variation < 0 ? "bas" : undefined}>
            {signe(variation)}
            {Math.abs(variation)} ({semaineAvant ? `${signe(variation)}${Math.round((Math.abs(variation) / semaineAvant) * 100)} %` : "—"})
          </span>
          <span className="om-pmt-total">
            Période <b>{total.toLocaleString("fr-FR")}</b> <Ecart t={total} a={somme(s.avant)} />
          </span>
        </p>
      </header>

      <div className="om-pmt-corps">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={donnees} margin={{ top: 12, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`d${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BLEU} stopOpacity={0.45} />
                <stop offset="100%" stopColor={BLEU} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--v2-a-300)" strokeDasharray="1 3" />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              ticks={reperes}
              tick={<DateAxe reperes={reperes} />}
              axisLine={{ stroke: "var(--v2-a-400)" }}
              tickLine={false}
              height={22}
              interval={0}
              padding={{ left: 0, right: 0 }}
            />
            <YAxis
              orientation="right"
              domain={[bas, haut]}
              allowDecimals={false}
              tickCount={5}
              width={44}
              tick={{ fill: "var(--v2-gray-900)", fontSize: 10, fontFamily: MONO }}
              axisLine={{ stroke: "var(--v2-a-400)" }}
              tickLine={false}
            />
            <Tooltip content={<Bulle />} cursor={{ stroke: "var(--v2-gray-700)", strokeDasharray: "3 3" }} isAnimationActive={false} />
            <ReferenceLine y={derniere} stroke={BLEU} strokeDasharray="2 3" strokeOpacity={0.75} ifOverflow="extendDomain" label={<Etiquette valeur={derniere} />} />
            <Area type="linear" dataKey="val" stroke={BLEU} strokeWidth={1.25} fill={`url(#d${id})`} isAnimationActive={false} dot={false} activeDot={{ r: 3, fill: BLEU, stroke: "var(--v2-bg-200)", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

/* les dates du bas : la première ancrée à gauche, la dernière à droite, pour ne jamais être coupées */
function DateAxe({ x = 0, y = 0, payload, reperes }: { x?: number; y?: number; payload?: { value: number }; reperes: number[] }) {
  if (!payload) return null;
  const premier = payload.value === reperes[0];
  const dernier = payload.value === reperes[reperes.length - 1];
  return (
    <text x={x + (premier ? 4 : dernier ? -4 : 0)} y={y + 12} textAnchor={premier ? "start" : dernier ? "end" : "middle"} fill="var(--v2-gray-900)" fontSize={10} fontFamily={MONO}>
      {dernier ? "Auj." : jourCourt(payload.value)}
    </text>
  );
}

/* l'étiquette pleine de la dernière valeur, posée sur l'axe de droite */
function Etiquette({ valeur, viewBox }: { valeur: number; viewBox?: { x?: number; y?: number; width?: number } }) {
  if (!viewBox || viewBox.x === undefined || viewBox.y === undefined || viewBox.width === undefined) return null;
  const texte = valeur.toLocaleString("fr-FR");
  const largeur = 8 + texte.length * 6.5;
  const x = viewBox.x + viewBox.width + 3;
  return (
    <g>
      <rect x={x} y={viewBox.y - 8} width={largeur} height={16} rx={3} fill={BLEU} />
      <text x={x + largeur / 2} y={viewBox.y + 4} textAnchor="middle" fill="#fff" fontSize={10} fontFamily={MONO} fontWeight={500}>
        {texte}
      </text>
    </g>
  );
}

function Bulle({ active, payload }: { active?: boolean; payload?: { payload: { t: number; val: number; jour: number } }[] }) {
  const p = active && payload?.[0]?.payload;
  if (!p) return null;
  return (
    <div className="om-pmt-bulle">
      <span>{new Date(p.t).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" })}</span>
      <b>{p.val.toLocaleString("fr-FR")}</b>
      <span>sur 7 jours · {p.jour.toLocaleString("fr-FR")} ce jour-là</span>
    </div>
  );
}
