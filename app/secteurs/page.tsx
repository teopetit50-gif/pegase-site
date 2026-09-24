import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  CarFront,
  DraftingCompass,
  FolderOpen,
  HardHat,
  ScanSearch,
  Scale,
  CircleCheck,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import Mouvements from "@/components/secteurs/Mouvements";
import { SECTEURS } from "@/lib/secteurs";
import "./secteurs.css";

/* ══════════════════════════════════════════════════════════════════════
   /secteurs — décalque de scale.com/rlenvironments (24/09/2026)

   Les SaaS verticaux d'Omega, un par métier. Tout ce qui décrit un SaaS
   (nom, métier, phrase, lien) est LU dans lib/secteurs.ts : ajouter une
   ligne à `SECTEURS` ajoute une carte, un aperçu et une fenêtre au hero
   — à condition de déposer sa capture dans public/apercus-secteurs/.
   Les pages métier (/secteurs/<slug>) ne sont PAS ici : elles vivent
   dans app/secteurs/[metier]/, écrites à part.

   Le relevé au pixel, la police et les écarts de forme sont en tête de
   ./secteurs.css ; les animations, dans components/secteurs/Mouvements.tsx.

   ── LES SECTIONS, DANS L'ORDRE DE LA RÉFÉRENCE ───────────────────────
    1 hero pleine image + bouton     → « Logiciels métier », les quatre
                                       captures en fenêtres dans le noir
    2 « Features » : 4 cartes        → les quatre SaaS, un par métier —
                                       quatre cartes pour quatre, au compte
    3 « Overview » : cartes à image  → les vraies captures, 2 × 2
    4 « Capabilities »               → SUPPRIMÉE (écart nº 4 du CSS)
    5 « Environment Types »          → la méthode commune aux quatre
    6 appel pleine image             → réserver un audit

   ── LE BUDGET DE TEXTE ───────────────────────────────────────────────
   Tenu sur la référence, emplacement par emplacement (signes) :

                          référence   ici
     titre du hero            15       16
     chapô du hero            75       68
     titre de section      23-46    25-28
     carte : titre         24-40     3-19   (le métier)
     carte : texte        87-150    57-66   (lib/secteurs.ts, `texte`)
     aperçu : texte      105-200     3-19   (le métier, sous le nom)
     titre des piliers        17       12   (« Même méthode » : une ligne
                                             à 1440, comme la leur)
     chapô des piliers       104      106
     item des piliers      41-57    44-56
     titre de l'appel         25       23

   Partout en dessous ou au niveau de la référence : une carte = une
   phrase. Sur téléphone, aucun bloc ne dépasse trois lignes.

   ── CE QUI N'EST PAS INVENTÉ ─────────────────────────────────────────
   • Aucun client, logo, chiffre ni témoignage : la référence n'en a pas
     sur cette page, et on n'en ajoute pas.
   • Les captures sont celles des sites déployés des quatre SaaS, prises
     le 24/09 à 1440 × 1080 (voir public/apercus-secteurs/). Les données
     qu'on y voit sont les jeux de démonstration de ces sites.
   • Les trois items de la méthode tiennent pour les QUATRE SaaS, vérifiés
     sur leurs sites : des données qu'ils ont déjà (photos et vocaux,
     pièces, plans et CCTP, contrats et retours), des écarts renvoyés à
     leur preuve (hors-devis photographié, fait renvoyé à sa pièce,
     contradiction renvoyée à la page, dommage comparé au départ), et une
     décision qui reste au client (avenant « prêt à signer », dossier
     « remis », lecture seule, « vos agences décident de ce qui part »).
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  alternates: { canonical: "/secteurs" },
  title: "Secteurs | Omega.AI",
  description: `Un logiciel par métier : ${SECTEURS.map(
    (s) => `${s.saas} pour ${s.metier === "BTP" ? "le BTP" : `les ${s.metier.toLowerCase()}`}`
  ).join(", ")}.`,
};

/* Un pictogramme par métier, lu par slug ; un métier ajouté sans
   pictogramme prend la mallette. Couleurs : celles des quatre cartes de
   la référence, dans leur ordre. */
const PICTOS: Record<string, LucideIcon> = {
  btp: HardHat,
  avocats: Scale,
  architectes: DraftingCompass,
  "location-automobile": CarFront,
};
const TEINTES = ["#273252", "#193a29", "#79648c", "#a8927c"];

/* La méthode commune — voir « ce qui n'est pas inventé » plus haut.
   Couleurs des pastilles : celles des trois piliers de la référence. */
const PILIERS: { Icone: LucideIcon; fond: string; titre: string; texte: string }[] = [
  {
    Icone: FolderOpen,
    fond: "#273252",
    titre: "Vos données",
    texte: "Photos, pièces, plans, contrats : ce que vous avez déjà.",
  },
  {
    Icone: ScanSearch,
    fond: "#193a29",
    titre: "Les écarts",
    texte: "Repérés un à un, chacun renvoyé à sa preuve.",
  },
  {
    Icone: CircleCheck,
    fond: "#839cb2",
    titre: "Votre décision",
    texte: "Il prépare le travail, la décision reste la vôtre.",
  },
];

const capture = (slug: string) => `/apercus-secteurs/${slug}.png`;

/* ══ le bouton de la référence (FlatCta) ══════════════════════════════
   Même balisage que le `Bouton` de /offres/sur-mesure : le voile qui
   traverse, la flèche qui défile dans sa pastille. Les deux exemplaires
   de la flèche sont ce qui donne le défilement — ne pas en retirer un. */

function Fleche() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5 12h14m0 0-6-6m6 6-6 6" />
    </svg>
  );
}

function Bouton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="sct-cta">
      <span aria-hidden className="sct-cta__voile" />
      <span className="sct-cta__lbl">
        {children}
        <span aria-hidden className="sct-pastille">
          <span className="sct-pastille__rail">
            <span>
              <Fleche />
            </span>
            <span>
              <Fleche />
            </span>
          </span>
        </span>
      </span>
    </Link>
  );
}

function Entete({ etiquette, titre }: { etiquette: string; titre: string }) {
  return (
    <div className="sct-entete">
      <p className="sct-etiquette">{etiquette}</p>
      <h2 className="sct-h2">{titre}</h2>
    </div>
  );
}

/* ══ la page ══════════════════════════════════════════════════════════ */

export default function SecteursPage() {
  return (
    <PageShell>
      <Mouvements />
      <div className="sct" data-sct>
        {/* ════════ 1 · HERO ════════
            Le titre est le NOM de la gamme, en capitales de titre comme
            « RL Environments » (même parti que « Système Métier Sur
            Mesure » sur /offres/sur-mesure) : 16 signes pour leurs 15.
            Les fenêtres sont décoratives (aria-hidden) : les mêmes
            captures sont décrites plus bas, dans la bande d'aperçu. */}
        <div className="sct-cadre sct-cadre--hero">
          <section className="sct-plein">
            <div aria-hidden className="sct-media">
              <div className="sct-lueur" />
              {SECTEURS.map((s, i) => (
                <div key={s.slug} className={`sct-fenetre sct-fenetre--${i}`}>
                  <Image
                    src={capture(s.slug)}
                    alt=""
                    fill
                    loading="eager"
                    sizes="(min-width: 768px) 33vw, 64vw"
                  />
                </div>
              ))}
            </div>
            <div aria-hidden className="sct-voile sct-voile--hero" />
            <div className="sct-plein__texte">
              <h1 className="sct-h1" data-sct-texte="hero">
                Logiciels métier
              </h1>
              <p className="sct-lead" data-sct-texte="hero">
                Un logiciel par métier, qui lit vos données et prépare vos décisions.
              </p>
              <div className="sct-plein__actions" data-sct-cta>
                <Bouton href="/reserver-un-audit">Réserver un audit</Bouton>
              </div>
            </div>
          </section>
        </div>

        {/* ════════ 2 · LES QUATRE SAAS — leur « Features » ════════
            Quatre cartes chez eux, quatre SaaS chez nous : la grille est
            reprise au compte près. Chaque carte mène à la page du SaaS. */}
        <div className="sct-wrap">
          <Entete etiquette="Secteurs" titre="Faits pour un seul métier" />
          <section className="sct-grille" data-sct-grille>
            <div className="sct-cartes">
              {SECTEURS.map((s, i) => {
                const Picto = PICTOS[s.slug] ?? Briefcase;
                return (
                  <div key={s.slug} className="sct-carte-base" data-sct-carte>
                    <Link href={`/secteurs/${s.slug}`} className="sct-carte">
                      <span className="sct-carte__tete">
                        <span className="sct-carte__picto" style={{ color: TEINTES[i % TEINTES.length] }}>
                          <Picto strokeWidth={1.5} aria-hidden />
                        </span>
                        <span className="sct-carte__nom">{s.saas}</span>
                      </span>
                      <h3 className="sct-titre-carte" data-sct-texte="carte">
                        {s.metier}
                      </h3>
                      <p className="sct-texte-carte" data-sct-texte="carte">
                        {s.texte}
                      </p>
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* ════════ 3 · APERÇU — leur « Overview » ════════
            Les vraies captures, prises sur les sites déployés. La carte
            entière mène à la page du SaaS. */}
        <section className="sct-bande">
          <div className="sct-wrap">
            <Entete etiquette="Aperçu" titre="Chaque logiciel, sur sa page" />
            <div className="sct-apercus">
              {SECTEURS.map((s) => (
                <Link key={s.slug} href={`/secteurs/${s.slug}`} className="sct-apercu">
                  <div className="sct-apercu__image">
                    <Image
                      src={capture(s.slug)}
                      alt={`Page d'accueil de ${s.saas}, le logiciel des ${s.metier === "BTP" ? "entreprises du BTP" : s.metier.toLowerCase()}`}
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                    />
                  </div>
                  <div className="sct-apercu__texte">
                    <h3 className="sct-apercu__titre">{s.saas}</h3>
                    <p className="sct-apercu__legende">{s.metier}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ 4 · LA MÉTHODE — leur « Environment Types » ════════
            Leur carré porte une vidéo au trait ; le nôtre, une vraie
            capture de Daliro (« L'essentiel » d'un chantier), qui montre
            les trois temps à la fois : les pièces reçues, l'écart
            relevé, la décision proposée. */}
        <section className="sct-piliers">
          <div className="sct-piliers__grille">
            <div className="sct-piliers__gauche">
              <p className="sct-piliers__etiquette">Le principe</p>
              <h2 className="sct-piliers__titre">Même méthode</h2>
              <p className="sct-piliers__chapo">
                Quatre métiers, une même façon de faire&nbsp;: partir de vos données, trouver les
                écarts, vous laisser décider.
              </p>
              <div className="sct-piliers__media">
                <div className="sct-piliers__capture">
                  <Image
                    src="/apercus-secteurs/btp-essentiel.png"
                    alt="Daliro : l'essentiel d'un chantier — résumé de la semaine, bons de livraison reçus, rendez-vous à venir, planning et activité de l'équipe."
                    width={1748}
                    height={1068}
                    sizes="(min-width: 768px) 36vw, 80vw"
                  />
                </div>
              </div>
            </div>
            <div className="sct-piliers__droite">
              {PILIERS.map(({ Icone, fond, titre, texte }, i) => (
                <div key={titre} data-sct-pilier>
                  <article>
                    <div className="sct-pilier__picto" style={{ backgroundColor: fond }} data-sct-picto>
                      <Icone strokeWidth={1.75} aria-hidden />
                    </div>
                    <div className="sct-pilier__tete">
                      <h3 className="sct-pilier__titre" data-sct-texte="pilier">
                        {titre}
                      </h3>
                      <p className="sct-pilier__texte" data-sct-texte="pilier">
                        {texte}
                      </p>
                    </div>
                  </article>
                  {i < PILIERS.length - 1 && <div className="sct-pilier__filet" data-sct-filet />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ 5 · L'APPEL ════════
            La carte s'ouvre au défilement (clip-path 5 % → 0), comme leur
            « ClipScrollSection ». La photo : un couloir sombre déjà au
            dépôt (crédits dans public/photos/CREDITS.txt) — la référence
            pose ici une photo sombre, pas une capture, et une cinquième
            capture sous le titre aurait fait lire deux textes l'un sur
            l'autre. */}
        <div className="sct-cadre sct-cadre--appel">
          <div className="sct-clip" data-sct-clip>
            <section className="sct-plein sct-plein--appel">
              <Image
                src="/photos/donnees-couloir.jpg"
                alt=""
                fill
                loading="lazy"
                sizes="100vw"
              />
              <div aria-hidden className="sct-voile" />
              <div className="sct-plein__texte">
                <h2 className="sct-h1" data-sct-texte="appel">
                  Parler de votre métier.
                </h2>
                <div className="sct-plein__actions" data-sct-cta-appel>
                  <Bouton href="/reserver-un-audit">Réserver un audit</Bouton>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
