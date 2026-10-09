/* ══════════════════════════════════════════════════════════════════════
   Le score et les cartes de mesure (09/10/2026), d'après « Real
   Experience Score » de Vercel :
     · Score : un anneau (0 à 100), le titre, l'écart avec la période
       d'avant dans une pastille, une phrase ;
     · Mesure : le nom, la valeur colorée selon l'objectif (vert atteint,
       orange en route, rouge loin), une jauge en trois segments avec un
       repère à la position de la valeur ;
     · Colonnes : trois colonnes « à couper / à corriger / bon », chacune
       avec son icône, son compte et une liste nom → chiffre.
   ══════════════════════════════════════════════════════════════════════ */

import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";

export type Ton = "vert" | "orange" | "rouge";
export const tonDe = (ratio: number): Ton => (ratio >= 1 ? "vert" : ratio >= 0.5 ? "orange" : "rouge");

export function Score({ valeur, titre, texte, ecart }: { valeur: number; titre: string; texte: string; ecart?: React.ReactNode }) {
  const v = Math.max(0, Math.min(100, Math.round(valeur)));
  const ton = tonDe(v / 80);
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="om-score">
      <svg width="56" height="56" viewBox="0 0 56 56" className="om-score-anneau" data-ton={ton} aria-hidden="true">
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="4" className="om-score-fond" />
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} transform="rotate(-90 28 28)" className="om-score-arc" />
        <text x="28" y="29" textAnchor="middle" dominantBaseline="middle">
          {v}
        </text>
      </svg>
      <div>
        <p className="om-score-titre">
          {titre} {ecart}
        </p>
        <p className="om-score-texte">{texte}</p>
      </div>
    </div>
  );
}

/* la jauge en trois segments égaux : rouge sous la moitié de l'objectif, orange jusqu'à l'objectif, vert au-delà.
   `ratio` = 1 quand l'objectif est tout juste atteint (pour un coût : plafond ÷ coût) */
export function Mesure({ libelle, valeur, unite, ratio, pied }: { libelle: string; valeur: string; unite?: string; ratio: number | null; pied?: React.ReactNode }) {
  const ton = ratio === null ? undefined : tonDe(ratio);
  const pos = ratio === null ? null : Math.max(0, Math.min(1, ratio / 1.5));
  return (
    <div className="om-mesure">
      <span className="om-mesure-libelle">{libelle}</span>
      <span className="om-mesure-valeur" data-ton={ton}>
        {valeur}
        {unite ? <small>{unite}</small> : null}
      </span>
      <span className="om-mesure-jauge" aria-hidden="true">
        <i />
        <i />
        <i />
        {pos !== null ? <b style={{ left: `${pos * 100}%` }} data-ton={ton} /> : null}
      </span>
      {pied ? <span className="om-mesure-pied">{pied}</span> : null}
    </div>
  );
}

export type Element = { nom: string; chiffre: string; detail?: string };
export function Colonnes({ colonnes }: { colonnes: { ton: Ton; titre: string; elements: Element[]; vide: string }[] }) {
  const ICONES = { rouge: CircleAlert, orange: TriangleAlert, vert: CircleCheck };
  return (
    <div className="om-colonnes">
      {colonnes.map((c) => {
        const Icone = ICONES[c.ton];
        return (
          <div key={c.titre} className="om-colonne">
            <p className="om-colonne-titre" data-ton={c.ton}>
              <Icone width={15} height={15} aria-hidden="true" />
              {c.titre} ({c.elements.length})
            </p>
            {c.elements.length ? (
              <ul>
                {c.elements.map((e) => (
                  <li key={e.nom} title={e.detail}>
                    <span>{e.nom}</span>
                    <b>{e.chiffre}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="om-colonne-vide">{c.vide}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
