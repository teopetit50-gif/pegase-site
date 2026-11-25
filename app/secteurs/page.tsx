import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { FolderOpen, ScanSearch, CircleCheck } from "lucide-react";
import PageShell from "@/components/PageShell";
import { DocumentMetier, ListeMatin } from "@/components/secteurs/ApercusHub";
import Cadre from "@/components/charte/Cadre";
import Section from "@/components/charte/Section";
import EnTeteSection from "@/components/charte/EnTeteSection";
import Appel from "@/components/charte/Appel";
import Bouton from "@/components/charte/Bouton";
import { GrilleCartes, Scene } from "@/components/charte/Cartes";
import { SECTEURS } from "@/lib/secteurs";
import "@/components/charte/pages/secteurs.css";

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
   → 25/11/2026 : ni l'une ni les autres ne servent plus ici (voir « LA
   CHARTE DE L'ACCUEIL » plus bas).

   ── 25/11/2026 : LA CHARTE DE L'ACCUEIL ──────────────────────────────
   (docs/charte-accueil.md, § 2.4 et § 4.2, ligne 7). Le carrefour QUITTE
   la classe `.sct` : arrondis.css, chargé par app/secteurs/layout.tsx
   pour les pages métier, ramenait tout à 6 px sous `.sct`. La page prend
   le kit : <Cadre>, en-têtes de section à gauche, grilles de cartes
   jointives à filets, scènes de rayon 12, boutons blancs, <Appel>.
   ./secteurs.css et ./mobile.css (sous `.sct`, propres au carrefour) ne
   sont plus importés ; aucune page métier ne s'en sert. Partent aussi :
   Mouvements (apparitions et ouverture au défilement), l'inclinaison des
   cartes d'aperçu (CarteApercu), le flottement des fenêtres du héros. Les
   fenêtres dessinées, les listes du matin et la capture de Daliro restent,
   posées dans des scènes. Les signes des logiciels au-dessus de l'appel
   partent : chaque carte porte déjà le sien. Textes inchangés ; les
   pastilles reprennent « Métiers », « Secteurs », « Aperçu », « Le
   principe » et « Audit », déjà sur la page. Le dessin propre à la page :
   components/charte/pages/secteurs.css, sous `.charte .sc-page`.

   ── 24/09 AU SOIR : BLANC, ET CINQ SAAS ──────────────────────────────
   « Omega c'est blanc » : le hero et l'appel, noirs dans la référence,
   passent au clair (fond gris très pâle, voile blanc, bouton noir), et
   l'appel perd sa photo pour les signes des SaaS. Les captures sont celles
   des pages RAPATRIÉES (/secteurs/<slug>, blanches), plus des sites
   Vercel. Avec Tiroma, cinq SaaS : les cartes et les aperçus se rangent
   trois puis deux (secteurs.css, `:has(> :nth-child(5):last-child)`), la
   cinquième fenêtre du hero n'apparaît que dès 1280. Le compte écrit en
   toutes lettres (« les cinq logiciels ») est lu dans SECTEURS.

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
const TEINTES = ["#273252", "#193a29", "#79648c", "#a8927c", "#839cb2", "#0c2542"];
const signeStyle = (i: number, saas: string) =>
  ({ backgroundColor: TEINTES[i % TEINTES.length], "--sct-signe": signe(saas) }) as React.CSSProperties;

/* « les cinq logiciels » : le compte suit la table */
const EN_LETTRES = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit"];
const COMPTE = EN_LETTRES[SECTEURS.length] ?? String(SECTEURS.length);

/* La méthode commune — voir « ce qui n'est pas inventé » plus haut.
   Couleurs des pastilles : celles des trois piliers de la référence. */
const PILIERS: { Icone: LucideIcon; fond: string; titre: string; texte: string }[] = [
  {
    Icone: FolderOpen,
    fond: "#273252",
    titre: "Vos pièces restent dans leur format d'origine",
    texte:
      "Le logiciel lit les photos, les vocaux, les PDF et les scans que vos équipes produisent déjà. Elles continuent d'envoyer ce qu'elles envoient aujourd'hui, sans ressaisie ni application à installer.",
  },
  {
    Icone: ScanSearch,
    fond: "#193a29",
    titre: "Chaque écart arrive avec sa preuve",
    texte:
      "Qu'il s'agisse d'un travail supplémentaire, de deux pièces qui se contredisent ou d'un dommage constaté à la restitution, chaque point renvoie à la photo, à la page ou à l'article qui le fonde.",
  },
  {
    Icone: CircleCheck,
    fond: "#839cb2",
    titre: "Rien ne part sans votre validation",
    texte:
      "Le logiciel prépare l'avenant, la note d'anomalies ou la facture, puis la soumet à la personne habilitée. Aucun document ne part sans sa validation, et le journal garde la trace de chaque décision.",
  },
];

/* 22/11/2026 (Teo) — les fenêtres du héros et les cartes d'aperçu, qui
   montraient deux fois la page d'accueil de chaque logiciel, sont dessinées
   en code (components/secteurs/ApercusHub.tsx). La capture de Daliro, plus
   bas, reste : Teo garde les vraies captures des logiciels métier. */

/* ══ la page ══════════════════════════════════════════════════════════ */

export default function SecteursPage() {
  return (
    <PageShell>
      <Cadre>
        <div className="sc-page">
          {/* ════════ 1 · LE TITRE DE PAGE, puis les documents de chaque
                     métier, dans une scène ════════
              Les fenêtres sont décoratives (aria-hidden) : chaque métier
              est décrit plus bas, dans la bande d'aperçu. */}
          <Section>
            <EnTeteSection
              niveau={1}
              haut
              pastille="Métiers"
              titre="Un logiciel généraliste ignore les règles de votre métier"
              chapo="Chaque logiciel d’Omega lit les pièces d’un seul métier, des photos de chantier aux conclusions adverses, et vous signale chaque écart avec la page qui le prouve."
              actions={
                <Bouton href="/reserver-un-audit" icone="calendrier">
                  Réserver un audit
                </Bouton>
              }
            />
            <div className="sc-cellule">
              <Scene trame className="sc-vitrine">
                <div aria-hidden className="sc-vitrine__grille">
                  {SECTEURS.map((s) => (
                    <div key={s.slug} className="sc-fenetre">
                      <DocumentMetier slug={s.slug} />
                    </div>
                  ))}
                </div>
              </Scene>
            </div>
          </Section>

          {/* ════════ 2 · LES LOGICIELS, un par métier ════════
              Chaque carte mène à la page du logiciel. */}
          <Section>
            <EnTeteSection pastille="Secteurs" titre="Chaque logiciel connaît les règles d'un seul métier" />
            <div className="sc-cartes">
              <GrilleCartes colonnes={3}>
                {SECTEURS.map((s, i) => (
                  <Link key={s.slug} href={`/secteurs/${s.slug}`} className="ch-carte sc-carte">
                    <div className="ch-carte-texte">
                      <span className="sc-carte__tete">
                        <span className="sc-carte__picto">
                          <span
                            aria-hidden
                            className="sc-carte__signe"
                            style={{
                              backgroundColor: TEINTES[i % TEINTES.length],
                              WebkitMaskImage: signe(s.saas),
                              maskImage: signe(s.saas),
                            }}
                          />
                        </span>
                        <span className="sc-carte__nom">{s.saas}</span>
                      </span>
                      <h3>{s.metier}</h3>
                      <p>{s.detail}</p>
                    </div>
                  </Link>
                ))}
              </GrilleCartes>
            </div>
          </Section>

          {/* ════════ 3 · APERÇU ════════
              La liste que chaque client reçoit le matin, dessinée en code
              (ApercusHub), dans une scène. La carte entière mène à la page
              du logiciel. */}
          <Section>
            <EnTeteSection pastille="Aperçu" titre="Chaque logiciel rend un document à valider" />
            <div className="sc-apercus">
              <GrilleCartes colonnes={3}>
                {SECTEURS.map((s, i) => (
                  <Link key={s.slug} href={`/secteurs/${s.slug}`} className="ch-carte sc-apercu">
                    <div className="ch-scene ch-scene--trame sc-apercu__scene">
                      <div className="sc-apercu__fenetre">
                        <ListeMatin slug={s.slug} />
                      </div>
                    </div>
                    <div className="ch-carte-texte">
                      <p className="sc-apercu__metier">{s.metier}</p>
                      <h3 className="sc-apercu__nom">
                        <span aria-hidden className="sc-apercu__signe" style={signeStyle(i, s.saas)} />
                        {s.saas}
                      </h3>
                      <p>{s.apercu}</p>
                    </div>
                  </Link>
                ))}
              </GrilleCartes>
            </div>
          </Section>

          {/* ════════ 4 · LA MÉTHODE ════════
              Une vraie capture de Daliro (« L'essentiel » d'un chantier),
              qui montre les trois temps à la fois : les pièces reçues,
              l'écart relevé, la décision proposée. */}
          <Section>
            <EnTeteSection
              pastille="Le principe"
              titre={<>Les {COMPTE} logiciels suivent la même méthode</>}
              chapo="Ils partent des documents que vous produisez déjà, relèvent chaque écart avec la pièce qui le fonde et laissent la décision à la personne qui signe."
            />
            <div className="sc-methode">
              <div className="sc-methode__visuel">
                <Scene trame className="sc-methode__scene">
                  <div className="sc-capture">
                    <Image
                      src="/apercus-secteurs/btp-essentiel.png"
                      alt="Daliro : l'essentiel d'un chantier — résumé de la semaine, bons de livraison reçus, rendez-vous à venir, planning et activité de l'équipe."
                      width={1748}
                      height={1068}
                      sizes="(min-width: 1001px) 45vw, 90vw"
                    />
                  </div>
                </Scene>
              </div>
              <div className="sc-piliers" data-gutter-guide="top">
                {PILIERS.map(({ Icone, fond, titre, texte }) => (
                  <article key={titre} className="sc-pilier">
                    <div className="sc-pilier__picto" style={{ backgroundColor: fond }}>
                      <Icone strokeWidth={1.75} aria-hidden />
                    </div>
                    <div>
                      <h3>{titre}</h3>
                      <p>{texte}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </Section>

          {/* ════════ 5 · L'APPEL ════════ */}
          <Appel
            pastille="Audit"
            titre="Jugez sur un dossier que vous connaissez"
            chapo={
              "L'audit dure trente minutes : nous examinons vos pièces et vos processus, puis nous vous indiquons lequel de ces logiciels s'applique à votre organisation, ou ce qu'il faudrait construire."
            }
            actions={
              <Bouton href="/reserver-un-audit" icone="calendrier">
                Réserver un audit
              </Bouton>
            }
          />
        </div>
      </Cadre>
    </PageShell>
  );
}
