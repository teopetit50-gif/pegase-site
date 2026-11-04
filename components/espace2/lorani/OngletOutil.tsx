/* ══════════════════════════════════════════════════════════════════════
   Un onglet d'un projet LORANI en vraie page d'outil (04/11/2026)

   Teo : « ce ne sont toujours pas des pages à proprement parler — comme
   Honoraires et temps, ou Courrier à ranger, ça c'est une page ». Le
   gabarit est donc celui d'Honoraires (./Honoraires.tsx, ./lor-attio.css,
   Attio au 1:1) : des onglets soulignés pour les listes de l'onglet, une
   barre de vue de 48 (le résumé à gauche, les gestes à droite, le
   principal en bleu), une barre de tri de 49, puis la grille — en-têtes
   de 40, lignes de 36, filets droit et bas — et son pied.

   Aucun geste n'est réécrit : les fenêtres et le détail d'un élément sont
   ceux des parties de ProjetCarte, montées cachées par la page du projet.
   Un bouton de la barre déclenche le geste du même nom (`declencher`), une
   ligne ouvre l'élément dans le volet de droite (`choisir`).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import type { ReactNode } from "react";
import "./lor-attio.css";

export type Colonne = { libelle: string; largeur: string; droite?: boolean };
export type Rang = { id: string; cle?: string; cellules: ReactNode[] };
export type Geste = { libelle: string; principal?: boolean; desactive?: boolean; titre?: string; faire?: () => void };
export type Liste = {
  cle: string;
  libelle: string;
  colonnes: Colonne[];
  rangs: Rang[];
  vide: string;
  tri?: string;
  pied?: string;
  gestes: Geste[];
  /* une carte autonome (elle charge ses données et porte ses gestes) : posée à la place de la grille */
  contenu?: ReactNode;
};

export function OngletOutil({
  listes,
  courante,
  lienListe,
  resume,
  avis,
  declencher,
  choisir,
  choisie,
}: {
  listes: Liste[];
  courante: string;
  lienListe: (cle: string) => string;
  resume: ReactNode;
  avis?: string | null;
  declencher: (libelle: string) => void;
  choisir: (cle: string) => void;
  choisie: string | null;
}) {
  const l = listes.find((x) => x.cle === courante) ?? listes[0];
  const cols = l.colonnes.map((c) => c.largeur).join(" ");
  return (
    <div className="lor-at lor-at-page">
      {listes.length > 1 ? (
        <nav className="lor-at-onglets" aria-label="Listes de l'onglet">
          {listes.map((x) => (
            <Link key={x.cle} href={lienListe(x.cle)} scroll={false} className="lor-at-onglet" aria-current={x.cle === l.cle ? "page" : undefined}>
              {x.libelle}
              {x.contenu ? null : <span className="lor-at-compteur">{x.rangs.length}</span>}
            </Link>
          ))}
        </nav>
      ) : null}
      <div className="lor-at-barre-vue">
        <p className="lor-at-resume">{resume}</p>
        <div className="lor-at-groupe">
          {l.gestes.map((g) => (
            <button
              key={g.libelle}
              type="button"
              className={g.principal ? "lor-at-bouton lor-at-bouton--bleu" : "lor-at-bouton"}
              disabled={g.desactive}
              title={g.titre}
              onClick={() => (g.faire ? g.faire() : declencher(g.libelle))}
            >
              {g.libelle}
            </button>
          ))}
        </div>
      </div>
      {l.contenu ? (
        <div className="lor-at-contenu">{l.contenu}</div>
      ) : (
      <>
      <div className="lor-at-barre-tri">
        <span className="lor-at-tri">
          <span className="lor-at-discret-fort">Trié par</span> {l.tri ?? "date"}
        </span>
        {avis ? <span className="lor-at-avis lor-at-avis--neutre">{avis}</span> : null}
      </div>
      <div className="lor-at-grille lor-at-grille--onglet" role="table" aria-label={l.libelle} style={{ "--lor-at-cols": cols } as React.CSSProperties}>
        <div className="lor-at-rang lor-at-rang--tete" role="row">
          {l.colonnes.map((c) => (
            <span key={c.libelle} className="lor-at-cell" data-droite={c.droite ? "" : undefined} role="columnheader">
              {c.libelle}
            </span>
          ))}
        </div>
        {l.rangs.length ? (
          l.rangs.map((r) => (
            <div
              key={r.id}
              className="lor-at-rang lor-at-rang--ligne"
              role="row"
              tabIndex={r.cle ? 0 : undefined}
              aria-current={r.cle && choisie === r.cle ? "true" : undefined}
              onClick={r.cle ? () => choisir(r.cle!) : undefined}
              onKeyDown={r.cle ? (e) => e.key === "Enter" && choisir(r.cle!) : undefined}
            >
              {r.cellules.map((c, i) => (
                <span key={i} className="lor-at-cell" data-droite={l.colonnes[i]?.droite ? "" : undefined} role="cell">
                  {c}
                </span>
              ))}
            </div>
          ))
        ) : (
          <p className="lor-at-vide">{l.vide}</p>
        )}
        {l.pied && l.rangs.length ? (
          <div className="lor-at-rang lor-at-rang--pied lor-at-pied-onglet" role="row">
            <span className="lor-at-cell" role="cell">
              <span className="lor-at-discret">{l.pied}</span>
            </span>
          </div>
        ) : null}
      </div>
      </>
      )}
    </div>
  );
}

/* une valeur d'état : une pastille de 8 et son libellé (vert fait, bleu en cours, gris en attente, rouge en retard) */
export function Etat({ teinte, children }: { teinte: "vert" | "bleu" | "gris" | "rouge"; children: ReactNode }) {
  return (
    <span className="lor-at-etat" data-teinte={teinte}>
      <span className="lor-at-etat-point" aria-hidden="true" />
      {children}
    </span>
  );
}
