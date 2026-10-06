"use client";

/* ══════════════════════════════════════════════════════════════════════
   La courbe d'un compte : son chiffre HT par mois, sur 24 mois (c4_04).

   Une seule série, donc une seule teinte et pas de légende : le titre la
   nomme. Barres fines arrondies en haut, ancrées à la ligne de base, 2 px
   de vide entre elles ; quadrillage discret ; une ligne pointillée pour la
   moyenne mensuelle des douze mois d'avant, étiquetée directement. Au
   survol (ou au clavier), le mois, le montant et le nombre de pièces ; le
   tableau équivalent est juste en dessous, replié.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { montant } from "../format";
import type { Mois } from "./types";

const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function libelleMois(cle: string, long = false) {
  const [a, m] = cle.split("-");
  return long ? `${MOIS_COURTS[Number(m) - 1]} ${a}` : MOIS_COURTS[Number(m) - 1];
}

export default function Courbe({ mois }: { mois: Mois[] }) {
  const [survol, setSurvol] = useState<number | null>(null);
  const L = 640;
  const H = 180;
  const marge = { haut: 22, bas: 30, gauche: 4, droite: 4 };
  const max = Math.max(1, ...mois.map((m) => Math.max(0, m.montant)));
  const largeur = (L - marge.gauche - marge.droite) / Math.max(1, mois.length);
  const y = (v: number) => marge.haut + (H - marge.haut - marge.bas) * (1 - Math.max(0, v) / max);
  const avant = mois.slice(0, 12);
  const moyenne = avant.length ? avant.reduce((s, m) => s + m.montant, 0) / avant.length : 0;
  const total = mois.reduce((s, m) => s + m.montant, 0);
  const actif = survol !== null ? mois[survol] : null;

  if (total === 0) {
    return <p className="esp-kpi-sous">Aucun achat sur les 24 derniers mois : la courbe est vide.</p>;
  }

  return (
    <figure style={{ margin: 0 }}>
      <figcaption className="esp-kpi-sous" style={{ marginBottom: 6 }}>
        Chiffre d&apos;affaires HT par mois, sur 24 mois
      </figcaption>
      <div style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${L} ${H}`} width="100%" role="img" aria-label="Chiffre d'affaires HT par mois sur 24 mois" style={{ display: "block", overflow: "visible" }}>
          {[0.5, 1].map((f) => (
            <line key={f} x1={marge.gauche} x2={L - marge.droite} y1={y(max * f)} y2={y(max * f)} stroke="var(--r-filet)" strokeWidth={1} />
          ))}
          <line x1={marge.gauche} x2={L - marge.droite} y1={y(0)} y2={y(0)} stroke="var(--r-faible)" strokeWidth={1} />
          {mois.map((m, i) => {
            const x = marge.gauche + i * largeur + 1;
            const l = Math.max(2, largeur - 2);
            const h = y(0) - y(m.montant);
            const r = Math.min(4, l / 2, h);
            const haut = y(m.montant);
            const chemin =
              h <= 0
                ? ""
                : `M${x},${y(0)} V${haut + r} Q${x},${haut} ${x + r},${haut} H${x + l - r} Q${x + l},${haut} ${x + l},${haut + r} V${y(0)} Z`;
            return (
              <g key={m.mois}>
                {chemin ? <path d={chemin} fill="var(--r-texte)" opacity={survol === null || survol === i ? 0.82 : 0.35} /> : null}
                <rect
                  x={marge.gauche + i * largeur}
                  y={marge.haut}
                  width={largeur}
                  height={H - marge.haut - marge.bas}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${libelleMois(m.mois, true)} : ${montant(m.montant)}, ${m.pieces} pièce${m.pieces > 1 ? "s" : ""}`}
                  onMouseEnter={() => setSurvol(i)}
                  onMouseLeave={() => setSurvol(null)}
                  onFocus={() => setSurvol(i)}
                  onBlur={() => setSurvol(null)}
                />
                {i % 6 === 0 ? (
                  <text x={marge.gauche + i * largeur + largeur / 2} y={H - 6} textAnchor="middle" fontSize={16} fill="var(--r-faible)">
                    {libelleMois(m.mois, true)}
                  </text>
                ) : null}
              </g>
            );
          })}
          {moyenne > 0 ? (
            <g>
              <line x1={marge.gauche} x2={L - marge.droite} y1={y(moyenne)} y2={y(moyenne)} stroke="var(--r-faible)" strokeWidth={1.5} strokeDasharray="4 4" />
              <text x={L - marge.droite} y={y(moyenne) - 4} textAnchor="end" fontSize={16} fill="var(--r-faible)">
                moyenne il y a un an : {montant(Math.round(moyenne))}
              </text>
            </g>
          ) : null}
        </svg>
        {actif ? (
          <div
            role="status"
            style={{
              position: "absolute", top: 0, left: `${Math.min(80, Math.max(0, ((survol ?? 0) / mois.length) * 100))}%`,
              background: "#fff", border: "1px solid var(--r-filet)", borderRadius: 8, padding: "6px 8px", fontSize: 12,
              pointerEvents: "none", boxShadow: "0 4px 14px rgba(0,0,0,.08)", whiteSpace: "nowrap",
            }}
          >
            <strong>{libelleMois(actif.mois, true)}</strong> · {montant(actif.montant)} · {actif.pieces} pièce{actif.pieces > 1 ? "s" : ""}
          </div>
        ) : null}
      </div>
      <details style={{ marginTop: 6 }}>
        <summary className="esp-kpi-sous" style={{ cursor: "pointer" }}>Voir les chiffres en tableau</summary>
        <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Chiffre par mois (tableau qui défile)">
          <table className="esp-tableau">
            <thead><tr><th>Mois</th><th className="esp-num">Chiffre HT</th><th className="esp-num">Pièces</th></tr></thead>
            <tbody>
              {[...mois].reverse().map((m) => (
                <tr key={m.mois}><td>{libelleMois(m.mois, true)}</td><td className="esp-num">{montant(m.montant)}</td><td className="esp-num">{m.pieces}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
