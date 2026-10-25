"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le gabarit « Users » de Supabase, au 1:1 (22/10/2026)

   Pleine largeur : en-tête de 48 px, barre d'outils teintée (recherche à
   gauche, actions à droite), grille aux colonnes séparées par un filet,
   état vide centré, pied « Total » collé en bas ; le volet de droite porte
   le détail d'une ligne ou un formulaire d'ajout, comme le panneau
   « Add user » de Supabase. Mesures dans ./sb.css.
   ══════════════════════════════════════════════════════════════════════ */

import { Users, X } from "lucide-react";
import "./sb.css";

export function SbDonnees({
  titre,
  outils,
  colonnes,
  lignes,
  vide,
  total,
  volet,
}: {
  titre: string;
  outils: { gauche?: React.ReactNode; droite?: React.ReactNode };
  colonnes: string[];
  lignes: { cle: string; cellules: React.ReactNode[]; choisie?: boolean; ouvrir?: () => void }[] | null;
  vide: { titre: string; texte: string };
  total: React.ReactNode;
  volet?: { titre: string; fermer: () => void; contenu: React.ReactNode; pied?: React.ReactNode } | null;
}) {
  return (
    <div className="sb-conseil v2-arrivee">
      <div className="sb-conseil-tete">
        <h1 className="sb-conseil-titre">{titre}</h1>
      </div>
      <div className="sb-donnees-outils">
        <div>{outils.gauche}</div>
        <div>{outils.droite}</div>
      </div>
      <div className="sb-conseil-corps">
        <div className="sb-grille-donnees sb-grille-colonnes">
          <table>
            <thead>
              <tr>
                {colonnes.map((c, i) => (
                  <th key={`${c}-${i}`} scope="col">
                    {c || <span className="v2-sr">Gestes</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(lignes ?? []).map((l) => (
                <tr
                  key={l.cle}
                  aria-selected={l.choisie}
                  tabIndex={l.ouvrir ? 0 : undefined}
                  onClick={l.ouvrir}
                  onKeyDown={(e) => {
                    if (l.ouvrir && (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
                      e.preventDefault();
                      l.ouvrir();
                    }
                  }}
                >
                  {l.cellules.map((c, i) => (
                    <td key={i}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {lignes && !lignes.length ? (
            <div className="sb-conseil-vide">
              <Users width={18} height={18} strokeWidth={1.5} aria-hidden="true" />
              <p style={{ margin: 0 }}>{vide.titre}</p>
              <span>{vide.texte}</span>
            </div>
          ) : null}
        </div>
        {volet ? (
          <aside className="sb-volet-detail" aria-label={volet.titre}>
            <div className="sb-volet-detail-tete">
              <span>{volet.titre}</span>
              <button type="button" className="v2-btn v2-btn--petit v2-btn--fantome v2-btn--icone" onClick={volet.fermer} aria-label="Fermer">
                <X width={14} height={14} aria-hidden="true" />
              </button>
            </div>
            <div className="sb-volet-detail-corps">{volet.contenu}</div>
            {volet.pied ? <div className="sb-volet-detail-pied">{volet.pied}</div> : null}
          </aside>
        ) : null}
      </div>
      <div className="sb-donnees-pied">
        <span>{total}</span>
      </div>
    </div>
  );
}
