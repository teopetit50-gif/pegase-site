import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { serifAvocats } from "@/app/_polices/serif";
import Ecran, { ECRAN_MATIN } from "@/components/secteurs/distribution/Ecran";
import Echelle from "@/components/secteurs/distribution/Echelle";
import Modules from "@/components/secteurs/distribution/Modules";
import Cas from "@/components/secteurs/distribution/Cas";
import { Fleche } from "@/components/secteurs/distribution/Fleche";
import {
  IllustrationMatin,
  IllustrationConteneur,
  IllustrationIles,
  IllustrationSources,
} from "@/components/secteurs/distribution/Illustrations";
import { HEROS, METIERS, ATOUTS, GARANTIES, APPEL } from "@/components/secteurs/distribution/textes";
import "./distribution.css";

/* ══════════════════════════════════════════════════════════════════════
   /secteurs/distribution — Namolu, le produit des groupes de distribution
   d'outre-mer (nom de travail, 24/09/2026).

   Décalque de toolio.com : le relevé, les paliers et les écarts sont en
   tête de ./distribution.css ; les textes et ce qui n'y est pas à dessein,
   dans components/secteurs/distribution/textes.ts.

   Les sections, dans l'ordre de la référence :
    1 hero : titre sur deux lignes, chapô, bouton, capture décalée
    2 carrousel de logos clients    → les métiers des groupes
    3 grille d'atouts 2 × 2         → point du matin, conteneur, îles, sources
    4 « Results in months »         → ce que Namolu tient chaque matin
    5 trois onglets de modules      → bricolage, frais, spécialisé
    6 carrousel de témoignages      → trois situations de secteur, sourcées
    7 appel                         → réserver un audit
   Entête et pied : ceux d'Omega (PageShell), comme toute page de secteur.
   ══════════════════════════════════════════════════════════════════════ */

const TITRE = "Namolu · le point du matin des groupes de distribution";
const DESCRIPTION =
  "Chaque matin, Namolu lit les ventes, les stocks et les conteneurs en mer d'un groupe de distribution d'outre-mer, et dit quoi commander, quoi faire venir par avion, quoi transférer d'une île à l'autre et quoi démarquer. Conçu par Omega.";

export const metadata: Metadata = {
  title: `${TITRE} | Omega.AI`,
  description: DESCRIPTION,
  alternates: { canonical: "/secteurs/distribution" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Omega.AI",
    title: TITRE,
    description: DESCRIPTION,
    url: "/secteurs/distribution",
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION },
};

const ILLUSTRATIONS = [IllustrationMatin, IllustrationConteneur, IllustrationIles, IllustrationSources];

/* le motif de leur bande d'appel (cercles jaune, bleu, turquoise en bas à
   droite, une image chez eux) redessiné en SVG, sur fond clair */
function Motif() {
  return (
    <svg className="nm-appel__motif" viewBox="0 0 420 260" fill="none" aria-hidden>
      <circle cx="330" cy="300" r="170" stroke="#ffbb16" strokeWidth="46" />
      <circle cx="170" cy="330" r="110" stroke="#0c66dc" strokeWidth="30" />
      <circle cx="430" cy="130" r="70" stroke="#17c7ff" strokeWidth="22" />
    </svg>
  );
}

export default function PageDistribution() {
  return (
    <PageShell>
      <div data-monde="clair" className={`p-distribution ${serifAvocats.variable}`}>
        {/* ════════ 1 · HERO ════════ */}
        <header className="nm-heros">
          <div className="nm-colonne">
            <div className="nm-heros__dedans">
              <h1 className="nm-heros__titre">
                {HEROS.ligne1}
                <strong>{HEROS.ligne2}</strong>
              </h1>
              <p className="nm-heros__chapo">{HEROS.chapo}</p>
              <div className="nm-heros__cta">
                <a href="/reserver-un-audit" className="nm-bouton">
                  <span>{HEROS.bouton}</span>
                  <Fleche />
                </a>
              </div>
              <div className="nm-heros__image">
                <Echelle largeur={940}>
                  <Ecran {...ECRAN_MATIN} />
                </Echelle>
              </div>
            </div>
          </div>
        </header>

        {/* ════════ 2 · LES MÉTIERS ════════ */}
        <section className="nm-bandeau" aria-label="Les métiers des groupes que Namolu sert">
          {[0, 1].map((k) => (
            <div key={k} className="nm-bandeau__piste" aria-hidden={k === 1}>
              {METIERS.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          ))}
        </section>

        {/* ════════ 3 · ATOUTS ════════ */}
        <section className="nm-atouts">
          {[0, 2].map((debut) => (
            <div key={debut} className="nm-atouts__rangee">
              {ATOUTS.slice(debut, debut + 2).map((a, k) => {
                const Illustration = ILLUSTRATIONS[debut + k];
                return (
                  <div key={a.titre} className="nm-atout">
                    <div className="nm-atout__texte">
                      <h2 className="nm-atout__titre">{a.titre}</h2>
                      <p className="nm-atout__para">{a.texte}</p>
                      <a href={a.ancre} className="nm-souligne">
                        <span>{a.lien}</span>
                        <Fleche />
                      </a>
                    </div>
                    <div className="nm-atout__image">
                      <Echelle largeur={591}>
                        <Illustration />
                      </Echelle>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </section>

        {/* ════════ 4 · CE QUE NAMOLU TIENT ════════ */}
        <section className="nm-garanties">
          <div className="nm-colonne nm-garanties__dedans">
            <h2 className="nm-t32">{GARANTIES.titre}</h2>
            <div className="nm-garanties__grille">
              {GARANTIES.faits.map((f, i) => (
                <div key={f.libelle} style={{ display: "contents" }}>
                  {i > 0 && <div className="nm-garanties__sep" aria-hidden />}
                  <div className="nm-garanties__fait">
                    <p className="nm-t52">{f.chiffre}</p>
                    <p className="nm-garanties__libelle">{f.libelle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ 5 · MODULES ════════ */}
        <Modules />

        {/* ════════ 6 · SITUATIONS ════════ */}
        <Cas />

        {/* ════════ 7 · APPEL ════════ */}
        <section className="nm-appel">
          <Motif />
          <div className="nm-appel__dedans">
            <div className="nm-appel__image">
              <Echelle largeur={940}>
                <Ecran {...ECRAN_MATIN} />
              </Echelle>
            </div>
            <div className="nm-appel__texte">
              <h2 className="nm-appel__titre">{APPEL.titre}</h2>
              <p className="nm-appel__para">{APPEL.texte}</p>
              <div>
                <a href="/reserver-un-audit" className="nm-bouton nm-bouton--appel">
                  <span>{APPEL.bouton}</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
