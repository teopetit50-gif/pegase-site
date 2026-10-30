"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le gabarit « Advisors » de Supabase, au 1:1 (22/10/2026)

   La page Security Advisor : en-tête de 48 px, onglets de gravité
   (Errors / Warnings / Info, chacun avec son carré de couleur et son
   compte), barre d'outils teintée, grille des problèmes ; un clic sur une
   ligne ouvre son détail dans un volet à droite. En bas, le pied à trois
   colonnes. Mesures et classes dans ./sb.css. Les pages de /espace3 qui
   listent des points à traiter par gravité (contrôles, urgences) s'en
   servent : elles ne fournissent que leurs onglets, leurs lignes et leur
   détail.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { ListChecks, X } from "lucide-react";
import "./sb.css";

export type SbGravite = { cle: string; libelle: string; teinte: "rouge" | "ambre" | "vert" | "bleu" | "gris"; unite: [string, string] };

export type SbProbleme = {
  cle: string;
  gravite: string;
  type: string;
  element: React.ReactNode;
  description: React.ReactNode;
  /** le contenu du volet de détail */
  detail: React.ReactNode;
};

export function SbConseiller({
  titre,
  gravites,
  problemes,
  actions,
  vide,
  pied,
  colonnes = ["Type", "Élément", "Description"],
}: {
  titre: string;
  gravites: SbGravite[];
  problemes: SbProbleme[] | null;
  actions?: React.ReactNode;
  vide: (g: SbGravite) => { titre: string; texte: string };
  pied?: { titre: string; texte: React.ReactNode; action?: React.ReactNode }[];
  colonnes?: [string, string, string];
}) {
  /* l'onglet ouvert d'abord : la première gravité qui a quelque chose */
  const [choix, setChoix] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const premier = gravites.find((g) => problemes?.some((p) => p.gravite === g.cle))?.cle ?? gravites[0].cle;
  const actif = choix ?? premier;
  const g = gravites.find((x) => x.cle === actif) ?? gravites[0];
  const lignes = (problemes ?? []).filter((p) => p.gravite === actif);
  const detail = lignes.find((p) => p.cle === ouvert) ?? null;
  const v = vide(g);

  return (
    <div className="sb-conseil v2-arrivee">
      <div className="sb-conseil-tete">
        <h1 className="sb-conseil-titre">{titre}</h1>
      </div>
      <div className="sb-onglets" role="tablist" aria-label="Gravité">
        {gravites.map((x) => {
          const n = (problemes ?? []).filter((p) => p.gravite === x.cle).length;
          return (
            <button
              key={x.cle}
              type="button"
              role="tab"
              aria-selected={x.cle === actif}
              className="sb-onglet"
              onClick={() => {
                setChoix(x.cle);
                setOuvert(null);
              }}
            >
              <span className="sb-onglet-nom">
                <span className="sb-onglet-carre" data-teinte={x.teinte} aria-hidden="true" />
                {x.libelle}
              </span>
              <span className="sb-onglet-compte">{problemes ? `${n} ${n > 1 ? x.unite[1] : x.unite[0]}` : "…"}</span>
            </button>
          );
        })}
      </div>
      <div className="sb-conseil-outils">
        <div>
          <span className="sb-onglet-compte">
            {lignes.length} {lignes.length > 1 ? g.unite[1] : g.unite[0]}
          </span>
        </div>
        <div>{actions}</div>
      </div>
      <div className="sb-conseil-corps" role="tabpanel">
        <div className="sb-grille-donnees">
          <table>
            <thead>
              <tr>
                {colonnes.map((c) => (
                  <th key={c} scope="col">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lignes.map((p) => (
                <tr
                  key={p.cle}
                  aria-selected={p.cle === ouvert}
                  tabIndex={0}
                  onClick={() => setOuvert(p.cle === ouvert ? null : p.cle)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOuvert(p.cle === ouvert ? null : p.cle);
                    }
                  }}
                >
                  <td>
                    <span className="sb-type">
                      <span className="sb-onglet-carre" data-teinte={g.teinte} aria-hidden="true" />
                      {p.type}
                    </span>
                  </td>
                  <td>{p.element}</td>
                  <td className="sb-gris">{p.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {problemes && !lignes.length ? (
            <div className="sb-conseil-vide">
              <ListChecks width={18} height={18} strokeWidth={1.5} aria-hidden="true" />
              <p style={{ margin: 0 }}>{v.titre}</p>
              <span>{v.texte}</span>
            </div>
          ) : null}
        </div>
        {detail ? (
          <aside className="sb-volet-detail" aria-label={`Détail : ${detail.type}`}>
            <div className="sb-volet-detail-tete">
              <span>{detail.type}</span>
              <button type="button" className="v2-btn v2-btn--petit v2-btn--fantome v2-btn--icone" onClick={() => setOuvert(null)} aria-label="Fermer le détail">
                <X width={14} height={14} aria-hidden="true" />
              </button>
            </div>
            <div className="sb-volet-detail-corps">{detail.detail}</div>
          </aside>
        ) : null}
      </div>
      {pied?.length ? (
        <div className="sb-conseil-pied">
          {pied.map((x) => (
            <div key={x.titre}>
              <strong>{x.titre}</strong>
              <p>{x.texte}</p>
              {x.action}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
