/* ══════════════════════════════════════════════════════════════════════
   Les briques des pages recopiées de Supabase (22/10/2026)

   Une brique par élément du tableau de bord Supabase, rendu à l'identique
   (mesures et classes dans ./sb.css). Les pages de /espace2 qui prennent un
   gabarit Supabase s'assemblent avec elles :
     <SbPage>      en-tête (titre, description, actions) + barre de filtres
     <SbSection>   une section « résumé à gauche, contenu à droite »
     <SbCompteurs> / <SbCompteur>   la grille « Usage Summary » et ses jauges
     <SbMesure>    la barre et les lignes de quota d'une mesure
     <SbGraphique> la carte graphique, avec son état « No data in period »
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { BarChart3, ChevronRight, ExternalLink } from "lucide-react";
import "./sb.css";

export function SbPage({ titre, description, actions, filtres, children }: { titre: string; description?: React.ReactNode; actions?: React.ReactNode; filtres?: { gauche?: React.ReactNode; droite?: React.ReactNode }; children: React.ReactNode }) {
  return (
    <div className="sb-page v2-arrivee">
      <div className="sb-conteneur">
        <div className="sb-tete">
          <div className="sb-tete-ligne">
            <h1 className="sb-titre">{titre}</h1>
            {actions ? <div className="sb-actions">{actions}</div> : null}
          </div>
          {description ? <p className="sb-description">{description}</p> : null}
        </div>
      </div>
      {filtres ? (
        <div className="sb-filtres">
          <div className="sb-conteneur">
            <div className="sb-filtres-ligne">
              <div className="sb-filtres-gauche">{filtres.gauche}</div>
              <div className="sb-filtres-droite">{filtres.droite}</div>
            </div>
          </div>
        </div>
      ) : null}
      {children}
    </div>
  );
}

export type SbLien = { libelle: string; href: string; externe?: boolean };

export function SbSection({ id, titre, textes = [], liens = [], children }: { id?: string; titre: string; textes?: React.ReactNode[]; liens?: SbLien[]; children: React.ReactNode }) {
  return (
    <div className="sb-bloc" id={id}>
      <div className="sb-conteneur">
        <div className="sb-section">
          <div className="sb-grille">
            <div className="sb-gauche">
              <div className="sb-colle">
                <div className="sb-resume">
                  <p className="sb-resume-titre">{titre}</p>
                  {textes.map((t, i) => (
                    <p key={i}>{t}</p>
                  ))}
                </div>
                {liens.length ? (
                  <div className="sb-liens">
                    <p className="sb-etiquette">Pour aller plus loin</p>
                    {liens.map((l) => (
                      <Link key={l.href} href={l.href} target={l.externe ? "_blank" : undefined} rel={l.externe ? "noreferrer" : undefined}>
                        {l.libelle}
                        <ExternalLink width={14} height={14} aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="sb-droite">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CIRCONFERENCE = 2 * Math.PI * 12;

/* `teinte` : seulement quand le chiffre est un quota (Supabase rougit un quota dépassé) ; neutre sinon */
export function SbJauge({ pct, teinte }: { pct: number; teinte?: "ambre" | "rouge" }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <svg className="sb-jauge" viewBox="0 0 30 30" aria-hidden="true" data-teinte={teinte}>
      <circle className="sb-jauge-fond" cx="15" cy="15" r="12" fill="transparent" strokeWidth="4" />
      <circle className="sb-jauge-trait" cx="15" cy="15" r="12" fill="transparent" strokeWidth="4" strokeDasharray={CIRCONFERENCE} strokeDashoffset={CIRCONFERENCE - (p / 100) * CIRCONFERENCE} />
    </svg>
  );
}

export function SbCompteurs({ children }: { children: React.ReactNode }) {
  return <div className="sb-compteurs">{children}</div>;
}

export function SbCompteur({ libelle, href, valeur, pct, teinte, badge }: { libelle: string; href?: string; valeur: React.ReactNode; pct?: number | null; teinte?: "ambre" | "rouge"; badge?: { texte: string; teinte?: string } }) {
  const tete = (
    <>
      {libelle}
      {badge ? (
        <span className="sb-badge" data-teinte={badge.teinte}>
          {badge.texte}
        </span>
      ) : null}
      {href ? <ChevronRight width={16} height={16} strokeWidth={1.5} aria-hidden="true" /> : null}
    </>
  );
  return (
    <div className="sb-compteur">
      <div className="sb-compteur-texte">
        {href ? (
          <a className="sb-compteur-lien" href={href}>
            {tete}
          </a>
        ) : (
          <span className="sb-compteur-lien">{tete}</span>
        )}
        <span className="sb-compteur-valeur">{valeur}</span>
      </div>
      {pct !== undefined && pct !== null ? <SbJauge pct={pct} teinte={teinte} /> : null}
    </div>
  );
}

export function SbMesure({ titre, pct, lignes, aDroite }: { titre: string; pct?: number | null; lignes: { libelle: string; valeur: React.ReactNode }[]; aDroite?: React.ReactNode }) {
  return (
    <div className="sb-mesure">
      <div className="sb-mesure-tete">
        <span>{titre}</span>
        {aDroite}
      </div>
      {pct !== undefined && pct !== null ? (
        <div className="sb-barre" role="presentation">
          <span style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
        </div>
      ) : null}
      <div className="sb-lignes">
        {lignes.map((l) => (
          <div key={l.libelle} className="sb-ligne">
            <span>{l.libelle}</span>
            <strong>{l.valeur}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export type SbBarre = { cle: string; libelle: string; valeur: number };

export function SbGraphique({ titre, texte, barres, format, vide = "Aucune donnée sur la période", videSous = "Elle s'affichera dès le premier mouvement" }: { titre: string; texte?: string; barres: SbBarre[]; format: (n: number) => string; vide?: string; videSous?: string }) {
  const max = Math.max(0, ...barres.map((b) => b.valeur));
  return (
    <div className="sb-mesure">
      <div className="sb-sous-titre">
        <p>{titre}</p>
        {texte ? <p>{texte}</p> : null}
      </div>
      <div className="sb-graphique">
        {max <= 0 ? (
          <div className="sb-graphique-vide">
            <BarChart3 width={18} height={18} strokeWidth={1.5} aria-hidden="true" />
            <p style={{ margin: 0 }}>{vide}</p>
            <span>{videSous}</span>
          </div>
        ) : (
          <>
            <div className="sb-histo" role="img" aria-label={`${titre} : ${barres.filter((b) => b.valeur > 0).map((b) => `${b.libelle} ${format(b.valeur)}`).join(", ")}`}>
              {barres.map((b) => (
                <span key={b.cle} className="sb-histo-barre" data-vide={b.valeur <= 0 ? "" : undefined} style={{ height: b.valeur > 0 ? `${Math.max(4, (b.valeur / max) * 100)}%` : "2px" }} title={`${b.libelle} : ${format(b.valeur)}`} />
              ))}
            </div>
            <div className="sb-histo-axe">
              <span>{barres[0]?.libelle}</span>
              <span>{barres[barres.length - 1]?.libelle}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
