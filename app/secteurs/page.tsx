import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { FolderOpen, ScanSearch, CircleCheck } from "lucide-react";
import PageShell from "@/components/PageShell";
import Mouvements from "@/components/secteurs/Mouvements";
import CarteApercu from "@/components/secteurs/CarteApercu";
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

   ── LES TEXTES (réécrits le 24/09 au soir) ───────────────────────────
   Teo, sur la première version : « trop basique, pas pro, on ne comprend
   pas vraiment ». Une carte d'une phrase nommait le résultat sans dire
   ce que le logiciel lit ni ce qu'il rend. Chaque bloc suit désormais
   l'ordre de OMEGA/DOCTRINE-TEXTES-SAAS.md (§ 12, § 16) : ce qu'il lit →
   ce qu'il prépare → ce qui reste au client, en deux phrases conjuguées.
   Tout fait avancé est repris du site déployé du SaaS (relevé du 24/09) ;
   rien n'est promis que ces sites ne disent déjà.

                          référence   ici
     titre du hero            15       22
     chapô du hero            75      143
     titre de section      23-46    31-40
     carte : texte        87-150  166-196   (lib/secteurs.ts, `detail`)
     aperçu : texte      105-200  146-171   (lib/secteurs.ts, `apercu`)
     titre des piliers        17       17
     chapô des piliers       104      159
     item des piliers      41-57  128-148
     titre de l'appel         25       23

   Au-dessus de la référence, à la demande de Teo (« pas détaillé »).
   La figure de la page (règle 5) : le ternaire du chapô du hero.

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

/* Le vrai signe de chaque SaaS, lu par son nom : public/logos/<nom>-mark.png,
   un MASQUE ALPHA (voir components/logos.tsx) — la couleur vient du fond
   du calque, donc de TEINTES. Un SaaS ajouté doit y déposer son signe
   (RAPATRIEMENT.md). Couleurs : celles des quatre cartes de la référence,
   dans leur ordre. */
const signe = (saas: string) => `url(/logos/${saas.toLowerCase()}-mark.png)`;
const TEINTES = ["#273252", "#193a29", "#79648c", "#a8927c"];

/* La méthode commune — voir « ce qui n'est pas inventé » plus haut.
   Couleurs des pastilles : celles des trois piliers de la référence. */
const PILIERS: { Icone: LucideIcon; fond: string; titre: string; texte: string }[] = [
  {
    Icone: FolderOpen,
    fond: "#273252",
    titre: "Vos documents, tels qu'ils sont",
    texte:
      "Photos de chantier, pièces scannées, plans en PDF ou contrats : le logiciel lit ce que vos équipes envoient déjà, sans saisie ni outil à installer.",
  },
  {
    Icone: ScanSearch,
    fond: "#193a29",
    titre: "Chaque écart, avec sa preuve",
    texte:
      "Un travail hors devis, deux pièces qui se contredisent ou un dommage au retour : chaque point relevé renvoie à la photo, à la page ou à l'article qui le fonde.",
  },
  {
    Icone: CircleCheck,
    fond: "#839cb2",
    titre: "La décision vous revient",
    texte:
      "Le logiciel prépare l'avenant, la liste de points ou la facture, puis vous la soumet. Rien ne part tant que vous ne l'avez pas validée.",
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
                Un logiciel par métier
              </h1>
              <p className="sct-lead" data-sct-texte="hero">
                Chacun lit les documents que vos équipes produisent déjà, relève ce qui doit être
                facturé, corrigé ou tranché, puis vous le remet prêt à valider.
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
          <Entete etiquette="Secteurs" titre="Chacun connaît les pièces de son métier" />
          <section className="sct-grille" data-sct-grille>
            <div className="sct-cartes">
              {SECTEURS.map((s, i) => {
                return (
                  <div key={s.slug} className="sct-carte-base" data-sct-carte>
                    <Link href={`/secteurs/${s.slug}`} className="sct-carte">
                      <span className="sct-carte__tete">
                        <span className="sct-carte__picto">
                          <span
                            aria-hidden
                            className="sct-carte__signe"
                            style={{
                              backgroundColor: TEINTES[i % TEINTES.length],
                              WebkitMaskImage: signe(s.saas),
                              maskImage: signe(s.saas),
                            }}
                          />
                        </span>
                        <span className="sct-carte__nom">{s.saas}</span>
                      </span>
                      <h3 className="sct-titre-carte" data-sct-texte="carte">
                        {s.metier}
                      </h3>
                      <p className="sct-texte-carte" data-sct-texte="carte">
                        {s.detail}
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
            <Entete etiquette="Aperçu" titre="Voir chaque logiciel au travail" />
            <div className="sct-apercus">
              {SECTEURS.map((s) => (
                <CarteApercu key={s.slug} href={`/secteurs/${s.slug}`}>
                  <div className="sct-apercu__image">
                    <Image
                      src={capture(s.slug)}
                      alt={`Page d'accueil de ${s.saas}, le logiciel des ${s.metier === "BTP" ? "entreprises du BTP" : s.metier.toLowerCase()}`}
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                    />
                  </div>
                  <div className="sct-apercu__texte">
                    <p className="sct-apercu__metier">{s.metier}</p>
                    <h3 className="sct-apercu__titre">{s.saas}</h3>
                    <p className="sct-apercu__legende">{s.apercu}</p>
                  </div>
                </CarteApercu>
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
              <h2 className="sct-piliers__titre">Une seule méthode</h2>
              <p className="sct-piliers__chapo">
                Les quatre logiciels suivent le même principe&nbsp;: ils partent des documents que
                vous produisez déjà, relèvent chaque écart avec sa preuve et vous laissent la
                décision.
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
                  Parlons de votre métier
                </h2>
                <p className="sct-lead" data-sct-texte="appel">
                  {"En trente minutes, nous regardons vos documents et vos processus, puis nous vous disons lequel de ces logiciels s'applique chez vous, ou ce qu'il faudrait construire."}
                </p>
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
