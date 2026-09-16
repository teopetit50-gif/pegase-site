import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  Clock,
  FileText,
  MessageSquare,
  Pause,
  Plug,
  Search,
  Users,
} from "lucide-react";
import {
  siGmail,
  siGoogledrive,
  siGooglesheets,
  siNotion,
  siQuickbooks,
  siShopify,
  siStripe,
} from "simple-icons";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import { POSTS } from "@/lib/content";
import "./nos-offres.css";

/* ══════════════════════════════════════════════════════════════════════
   /offres — « Nos offres »

   16/09/2026 — REFONTE COMPLÈTE. Teo : « refais la page nos offres de
   omegaai.fr, exactement la même chose que https://scale.com/data-engine,
   dans le détail près : les textes, leurs tailles, le design, tout. »

   La page précédente (25/07, refondue le 11/09) décalquait
   ocoya.com/features/create et assemblait six composants 21st.dev
   (bento-grid-01, bento-02, features-4, how-it-works-01, audit-log,
   cta-3). Elle part en entier. Ces six composants restent au dépôt —
   `features-4`, `how-it-works-01` et `cta-3` servent d'autres pages —
   mais plus aucun n'est appelé ici, et le bloc `.offres` de globals.css
   n'habille plus cette route (il habille encore /, /blog, /integrations
   et /tarifs/site : ne pas le supprimer).

   Le relevé de la référence — colonne, rythme, échelle typographique,
   rayons, couleurs — est en tête de nos-offres.css, avec les quatre
   écarts de FORME. Ci-dessous, les écarts de CONTENU.

   ── CE QUI EST REPRIS AU PIXEL ───────────────────────────────────────
   L'enchaînement des blocs de la référence, dans son ordre :
     1  image pleine, coins à 24, texte calé en bas          (hero)
     2  bande d'outils en une rangée, logos en noir
     3  panneau doux + 2×2 cartes blanches
     4  panneau de couleur + énoncé + bouton noir
     5  ── à partir d'ici, tout vit sur le fond doux #f2f2f2 ──
        a  étiquette/titre/chapô centrés, puis bloc scindé texte + fenêtre
        b  étiquette/titre/chapô, grande console, légende mono, rangée
        c  étiquette/titre, quatre cartes hautes à liste à puces
        d  étiquette/titre, quatre vignettes de ressources
        e  panneau ardoise, citation, signature
        f  image pleine, titre, deux boutons                  (pied d'appel)

   ── LES ÉCARTS DE CONTENU, et pourquoi ───────────────────────────────
   Un décalque n'autorise pas à recopier ce que la référence se permet.
   Chaque fois, la géométrie est gardée et le contenu remplacé.

   · BLOC 2 — la référence aligne sept logos de CLIENTS (Meta, Pinterest,
     TIME…). Nous n'avons aucun client à nommer, et un logo de client
     inventé est une pratique commerciale trompeuse. Même rangée, mêmes
     hauteurs : ce sont les outils DU CLIENT sur lesquels les systèmes se
     branchent, ceux de /integrations. La légende monospace au-dessus est
     un AJOUT (la référence n'en a pas) : sans elle, une rangée de logos
     sous un hero se lit comme une liste de références.

   · BLOC 3 — la référence y écrit « The Scale Data Engine is trusted by
     the world's leading ML teams ». Remplacé par ce qui ne change pas
     chez le client. Les quatre cartes portent les QUATRE ARGUMENTS de
     l'ancienne page, resserrés au budget de la référence le 16/09 (voir
     le commentaire d'ARGUMENTS) — l'incise sur la Région Guadeloupe est
     la seule chose qu'on n'a pas coupée, et elle est obligatoire : le
     Chèque TIC est un dispositif régional, la retirer sur un site à
     portée nationale rendrait la mention trompeuse.

   · BLOC 4 — le panneau est au ROUGE de la référence (#E7131A, relevé
     rgb(231,19,26)) et porte un mot-symbole en serif blanc, comme son
     logotype à elle. Teo, 16/09 : « je veux la même couleur et la même
     police, là c'est noir et le logo est moche. » Le signe alpha
     « sur mesure » de public/logos sortait terne sur du noir.

   · BLOC 4 — « Customer Case Study » + une étude de cas nommée. Nous
     n'en avons pas. Même géométrie, le sur-mesure à la place : c'est le
     seul énoncé de la page qui appelle un panneau à lui seul, et il
     fermait déjà l'ancienne page.

   · BLOC 5b — la référence aligne QUATRE colonnes sous sa grande image.
     Nous en avons trois (les trois étapes de la mise en place) et il n'y
     a pas de quatrième à inventer : la grille passe à trois colonnes à
     partir de 1280, même gouttière, pas de colonne vide.

   · BLOC 5e — la référence place ici une citation client signée. Les
     témoignages du site sont vides par construction (lib/temoignages.ts).
     À la place, du vrai de même forme typographique : l'énoncé du
     PROBLÈME que les quatre systèmes règlent, repris de lib/content.ts
     (FAMILLES[0].proof). La signature n'est donc pas une personne mais
     la portée de la phrase.

   · PARTOUT — aucun montant. Le site n'affiche plus de prix depuis le
     15/09 ; les boutons mènent au diagnostic. Et aucun outil À NOUS
     n'est nommé : ni éditeur, ni fournisseur de modèles.

   · Les fenêtres et la console sont des EXEMPLES, et le disent dans leur
     propre chrome — elles ne montrent les données d'aucun client.

   ── LE BUDGET DE TEXTE ───────────────────────────────────────────────
   Teo, 16/09 : « il y a trop de texte sur les sections, regarde comme
   eux n'en mettent pas trop. » Relevé sur la référence, à 1440 :
     chapô du hero      70 signes
     chapô de section   45 à 47
     texte de carte     93 à 142
     paragraphe long    182 à 188, et il n'y en a QU'UN dans la page
     pied d'appel       aucun paragraphe — un titre et deux boutons
   Les nôtres faisaient 152, 165, 140, 163 et 118. Ils sont ramenés dans
   ces fourchettes ; le paragraphe du bloc scindé (190) est le seul long
   de la page, comme chez eux, et le paragraphe du pied d'appel a été
   SUPPRIMÉ. Aucun fait n'est perdu : ce qui part est de la redite.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  alternates: { canonical: "/offres" },
  title: "Nos offres | Omega.AI",
  description:
    "Quatre systèmes prêts à déployer : encaissements, réactivation commerciale, demandes entrantes, flux documentaires. Branchés sur vos outils, arrêtés à votre validation.",
};

/* ─────────────────────────────────────────────────────────────────────
   Données de page
   ───────────────────────────────────────────────────────────────────── */

/* BLOC 2 — sept outils du client, comme la référence aligne sept logos.
   Les chemins viennent de simple-icons, déjà au dépôt pour /integrations.

   16/09 (Teo, « les logos sont mal faits ») — ce sont des LOGOTYPES et
   non des signes nus : la référence aligne « Pinterest », « Meta »,
   « instacart » écrits en toutes lettres, 90 à 111 px de large. Un « M »
   ou un « N » seul, à 24 px, ne se lit pas. Le nom est composé dans
   NOTRE police : c'est un rappel typographique, pas la reproduction d'un
   logotype de marque. Les libellés sont raccourcis (« Sheets », « Drive »)
   pour tenir la largeur de la rangée sans la faire défiler. */
const OUTILS = [
  { marque: siGmail, nom: "Gmail" },
  { marque: siGooglesheets, nom: "Sheets" },
  { marque: siStripe, nom: "Stripe" },
  { marque: siShopify, nom: "Shopify" },
  { marque: siGoogledrive, nom: "Drive" },
  { marque: siNotion, nom: "Notion" },
  { marque: siQuickbooks, nom: "QuickBooks" },
];

/* BLOC 3 — les quatre arguments. Les quatre pastilles reprennent les
   quatre couleurs de la référence (archive-purple, foundry-tan,
   atlas-blue, evergreen).

   16/09/2026 (Teo, « il y a un peu trop de texte dans les cards ») — les
   quatre textes sont RESSERRÉS. Ils venaient de lui (07/08) et tenaient
   dans le gabarit précédent ; ici la carte de la référence tourne autour
   de 110 signes et les nôtres en faisaient 124 à 265. Aucun fait n'est
   perdu, seules les redites et les incises de précaution partent — sauf
   dans le quatrième, où l'incise « Région Guadeloupe » RESTE : le Chèque
   TIC est un dispositif régional et la retirer sur un site à portée
   nationale rendrait la mention trompeuse. Il reste donc la carte la
   plus longue (158 contre ~110), et c'est le bon arbitrage. */
const ARGUMENTS = [
  {
    teinte: "#79648c",
    titre: "Intégration à votre environnement",
    texte:
      "Nos systèmes s'intègrent à vos outils existants sans imposer le moindre changement d'organisation.",
  },
  {
    teinte: "#a8927c",
    titre: "Contrôle humain",
    texte:
      "Vous gardez la validation des actions sensibles. Les règles et les niveaux d'autonomie sont définis avec vous.",
  },
  {
    teinte: "#273252",
    titre: "Sécurité des données",
    texte:
      "Les environnements clients sont cloisonnés, les données chiffrées et les accès contrôlés.",
  },
  {
    teinte: "#193a29",
    titre: "Financement éligible",
    texte:
      "Une partie de l'investissement peut relever du Chèque TIC, dispositif de la Région Guadeloupe réservé aux entreprises qui y sont immatriculées.",
  },
];

/* BLOC 5a — la fenêtre d'exemple. Mêmes trois faits que le journal de
   l'ancienne page : une relance rédigée qui attend l'accord, une réponse
   partie APRÈS validation, une relance suspendue par le client. */
const JOURNAL = [
  {
    icone: Clock,
    titre: "Relance FA-2402",
    sous: "Message rédigé, en attente de validation.",
    etat: "à valider",
    attente: true,
  },
  {
    icone: Check,
    titre: "Réponse · demande reçue à 21 h 04",
    sous: "Partie après votre validation.",
    etat: "envoyé",
    attente: false,
  },
  {
    icone: Pause,
    titre: "Relance DV-0891 · service achats",
    sous: "Suspendue : montant à revoir avant envoi.",
    etat: "suspendu",
    attente: false,
  },
];

/* BLOC 5b — la rangée : les trois étapes de la mise en place (voir
   l'écart documenté en tête de fichier). */
const ETAPES = [
  {
    icone: Search,
    titre: "Diagnostic, 30 min",
    texte: "Nous chiffrons le processus qui vous coûte le plus.",
  },
  { icone: Plug, titre: "Intégration", texte: "Une demi-journée sur votre environnement." },
  {
    icone: CheckCheck,
    titre: "Cycle supervisé",
    texte: "Vos équipes valident chaque action pendant deux semaines, le temps d'ajuster les règles.",
  },
];

/* BLOC 5b — les quatre colonnes de la console d'exemple. Quatre lignes
   chacune, pas trois : à trois, la moitié basse du cadre restait noire
   alors que la grande image de la référence remplit son rapport. Les
   libellés tiennent sur UNE ligne dans une colonne de 210 px — au-delà
   ils sont coupés par des points de suspension, ce qui se voit. */
const CONSOLE = [
  {
    code: "CASHD",
    lignes: ["Devis DV-0891 · J+3", "Facture FA-2402 · J+7", "Facture FA-2318 · J+21", "En attente d'accord"],
  },
  {
    code: "RELOAD",
    lignes: ["14 comptes inactifs", "Classés par valeur", "1 message / trimestre", "Ancré sur l'historique"],
  },
  {
    code: "FRONTD",
    lignes: ["Demande · 21 h 04", "Réponse rédigée", "Rendez-vous proposé", "Avis demandé ensuite"],
  },
  {
    code: "FILED",
    lignes: ["Bon de livraison lu", "Montants contrôlés", "Classé au dossier", "Réponse rédigée"],
  },
];

/* BLOC 5c — les quatre paquets. Les listes sont volontairement inégales
   (4 / 4 / 3 / 2), comme celles de la référence (4 / 3 / 2 / 1) : rien
   n'est ajouté pour égaliser une colonne. Chaque ligne reprend un fait
   déjà publié sur la page produit correspondante (lib/content.ts). */
const PAQUETS = [
  {
    icone: Bell,
    titre: "CASHD",
    href: "/offres/relances-impayes",
    lignes: [
      "Devis sans réponse relancés dès le troisième jour",
      "Factures échues relancées à J+7 puis J+21",
      "Relance graduée selon le montant et le retard",
      "Aucun envoi sans votre validation",
    ],
  },
  {
    icone: Users,
    titre: "RELOAD",
    href: "/offres/nouvelles-affaires",
    lignes: [
      "Clients inactifs repérés dans votre historique",
      "Classés par valeur et par récence",
      "Un message par compte et par trimestre",
      "Entretiens dus et commandes jamais reprises",
    ],
  },
  {
    icone: MessageSquare,
    titre: "FRONTD",
    href: "/offres/demandes-clients",
    lignes: [
      "Une réponse à toute heure, sur le canal d'origine",
      "Rien hors de la base que vous avez validée",
      "Prise de rendez-vous menée jusqu'au bout",
    ],
  },
  {
    icone: FileText,
    titre: "FILED",
    href: "/offres/factures-fournisseurs",
    lignes: ["Tout document reçu, lu puis contrôlé", "Classé au bon dossier, la réponse rédigée"],
  },
];

/* BLOC 5d — quatre articles RÉELS du site (lib/content.ts). Aucune
   vignette inventée : chaque couverture est celle du billet. */
const RESSOURCES = [
  "impayes-cout-attendre",
  "btp-devis-jamais-relances",
  "immobilier-repondre-en-premier",
  "facturation-electronique-2026",
]
  .map((slug) => POSTS.find((p) => p.slug === slug))
  .filter((p): p is (typeof POSTS)[number] => Boolean(p));

/* ─────────────────────────────────────────────────────────────────────
   Briques
   ───────────────────────────────────────────────────────────────────── */

/* Le bouton de la référence (« FlatCta ») : un voile `currentColor` qui
   monte du bas au survol, et le libellé qui rentre à 0.9. Le voile est un
   enfant absolu, pas un `background` — voir nos-offres.css § 3. */
function Cta({
  href,
  children,
  variante = "noir",
}: {
  href: string;
  children: React.ReactNode;
  variante?: "noir" | "blanc" | "trait" | "trait-blanc";
}) {
  return (
    <Link href={href} className={`ofd-cta ofd-cta--${variante}`}>
      <span aria-hidden className="ofd-cta__voile" />
      <span className="ofd-cta__lbl">{children}</span>
    </Link>
  );
}

/* La variante à pastille du hero et du pied d'appel : la flèche défile
   dans sa fenêtre (deux exemplaires translatés de 50 %). */
function CtaPastille({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="ofd-cta ofd-cta--blanc ofd-cta--pastille">
      <span aria-hidden className="ofd-cta__voile" />
      <span className="ofd-cta__lbl">
        {children}
        <span aria-hidden className="ofd-pastille">
          <span className="ofd-pastille__rail">
            <span>
              <ArrowRight size={16} strokeWidth={1.75} />
            </span>
            <span>
              <ArrowRight size={16} strokeWidth={1.75} />
            </span>
          </span>
        </span>
      </span>
    </Link>
  );
}

function TeteSection({
  etiquette,
  titre,
  chapo,
  large = false,
}: {
  etiquette: string;
  titre: string;
  chapo?: string;
  large?: boolean;
}) {
  return (
    <div data-reveal className={`ofd-tete${large ? " ofd-tete--large" : ""}`}>
      <p className="ofd-etiquette">{etiquette}</p>
      <h2 className="ofd-h2">{titre}</h2>
      {chapo ? <p className="ofd-chapo">{chapo}</p> : null}
    </div>
  );
}

/* Le fond à points de la colonne de gauche du bloc 3.
   La référence y pose un planisphère en points livré en un seul fichier :
   c'est son actif, on ne le recopie pas. Celui-ci est calculé — une
   sphère de points, même emprise carrée et même poids visuel. Rendu côté
   serveur, sans aléatoire : deux visites donnent la même image. */
function MotifPoints() {
  const pas = 17;
  const rayon = 190;
  const points: { x: number; y: number; o: number }[] = [];
  for (let i = -rayon; i <= rayon; i += pas) {
    for (let j = -rayon; j <= rayon; j += pas) {
      const d = Math.hypot(i, j);
      if (d > rayon) continue;
      /* Réglé le 16/09 sur l'image que Teo a fournie : un disque PLEIN et
         régulier, gris moyen, avec un dégradé radial discret vers le
         centre-gauche. La première version penchait trop à gauche — le
         bord droit s'effaçait et le motif se lisait en escalier. */
      const o = 0.34 + 0.26 * (1 - d / rayon) + 0.1 * Math.max(0, 1 - (i + rayon) / (2 * rayon));
      points.push({ x: 200 + i, y: 200 + j, o: Math.min(0.7, o) });
    }
  }
  return (
    <svg viewBox="0 0 400 400" role="img" aria-label="Motif : une sphère composée de points">
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.6} fill="#5b5b5b" opacity={p.o} />
      ))}
    </svg>
  );
}

/* Le coin plein des cartes du bloc 3 — relevé TEL QUEL dans le DOM de la
   référence : un viewBox de 6×6, un triangle à angle droit aux sommets
   arrondis, peint en `currentColor`. La couleur vient de la carte. */
function CoinPlein() {
  return (
    <svg width="6" height="6" viewBox="0 0 6 6" fill="none" aria-hidden="true">
      <path
        d="M5.0957 0H0.376033C0.041944 0 -0.125369 0.403928 0.110868 0.640165L4.83054 5.35983C5.06677 5.59607 5.4707 5.42876 5.4707 5.09467V0.375C5.4707 0.167893 5.30281 0 5.0957 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ChromeFenetre({ titre }: { titre: string }) {
  return (
    <div className="ofd-fenetre__barre">
      <span aria-hidden className="ofd-fenetre__points">
        <i style={{ background: "#ff5f57" }} />
        <i style={{ background: "#febc2e" }} />
        <i style={{ background: "#28c840" }} />
      </span>
      <span className="ofd-fenetre__titre">{titre}</span>
      <span className="ofd-fenetre__mention">Exemple</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   La page
   ───────────────────────────────────────────────────────────────────── */

export default function OffresPage() {
  return (
    <PageShell>
      <PageMotion />

      <div className="ofd">
        {/* ═══ 1 · HERO — image pleine, coins à 24, texte calé en bas ═══
            data-monde="clair" : le header caméléon du site doit passer en
            verre clair au-dessus de la marge blanche qui borde la carte. */}
        <section data-monde="clair" className="ofd-pleine ofd-pleine--haut">
          <div className="ofd-hero">
            <Image
              src="/photos/tarifs-hero-atrium.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="ofd-hero__media"
            />
            <div aria-hidden className="ofd-hero-voile" />
            <div className="ofd-hero__col">
              {/* budget de signes de la référence : titre 11, chapô 66.
                  Le nôtre : 50 et 76 — le chapô de l'ancienne page en
                  faisait 230, il devenait un paragraphe dans ce gabarit. */}
              <h1 data-reveal className="ofd-h1">
                Commencez par le processus qui a le plus d&apos;impact.
              </h1>
              <p data-reveal className="ofd-lead">
                Un processus à la fois. Sur vos outils, sous vos règles, à votre validation.
              </p>
              <div data-reveal className="ofd-hero__actions">
                <CtaPastille href="/commencer">Commencer</CtaPastille>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 2 · BANDE D'OUTILS ═══ */}
        <section data-monde="clair" className="ofd-sec ofd-sec--haut">
          <div className="ofd-wrap">
            <p className="ofd-mono ofd-outils__legende">Se branche sur les outils déjà en place</p>
            <div className="ofd-outils">
              <ul>
                {OUTILS.map(({ marque, nom }) => (
                  <li key={nom}>
                    <span className="ofd-outil">
                      <svg viewBox="0 0 24 24" role="img" aria-label={marque.title}>
                        <path d={marque.path} />
                      </svg>
                      <span>{nom}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ═══ 3 · PANNEAU DOUX + LES QUATRE ARGUMENTS ═══ */}
        <section data-monde="clair" className="ofd-sec">
          <div className="ofd-wrap">
            <div className="ofd-panneau">
              <div className="ofd-panneau__grille">
                <div className="ofd-panneau__gauche">
                  <div data-reveal className="ofd-panneau__intro">
                    <h2 className="ofd-h3">Ce qui ne change pas chez vous.</h2>
                    <p className="ofd-body">
                      Les systèmes lisent et écrivent dans les outils déjà en place. Aucun compte à
                      créer, aucune donnée à migrer.
                    </p>
                  </div>
                  <div aria-hidden className="ofd-panneau__motif">
                    <MotifPoints />
                  </div>
                </div>

                <div className="ofd-quatre">
                  {ARGUMENTS.map(({ teinte, titre, texte }) => (
                    <article key={titre} data-reveal className="ofd-carte">
                      <div className="ofd-carte__tete">
                        <h3 className="ofd-h5">{titre}</h3>
                        <span className="ofd-carte__puce" style={{ color: teinte }}>
                          <CoinPlein />
                        </span>
                      </div>
                      <p className="ofd-body">{texte}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 4 · PANNEAU DE COULEUR + ÉNONCÉ ═══ */}
        <section data-monde="clair" className="ofd-sec">
          <div className="ofd-wrap">
            <div className="ofd-duo">
              <div aria-hidden className="ofd-duo__marque">
                {/* Mot-symbole en serif blanc sur le rouge de la référence
                    (#E7131A). Remplace le signe alpha « sur mesure », que
                    Teo a trouvé terne sur fond noir le 16/09. */}
                <span className="ofd-duo__signe">Sur mesure</span>
              </div>
              <div className="ofd-duo__texte">
                <div data-reveal>
                  <p className="ofd-mono">Sur mesure</p>
                  <h3 className="ofd-h3">
                    Si votre besoin n&apos;entre dans aucune de ces cases, le sur-mesure prend le relais.
                  </h3>
                </div>
                <div data-reveal>
                  <Cta href="/offres/sur-mesure">Découvrir le sur-mesure</Cta>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 5 · LA ZONE DOUCE — tout ce qui suit vit sur #f2f2f2 ═══ */}
        <div className="ofd-zone-douce">
          {/* ─── 5a · bloc scindé : l'énoncé à droite, la fenêtre à gauche ─── */}
          <section data-monde="clair" className="ofd-sec ofd-sec--plein">
            <div className="ofd-wrap">
              <TeteSection
                etiquette="Contrôle humain"
                titre="Rien ne part sans vous."
                chapo="Chaque action attend votre accord. Vous décidez ensuite, règle par règle, de ce qui part seul."
                large
              />

              <div className="ofd-scinde">
                <div data-reveal className="ofd-scinde__texte">
                  <p className="ofd-h4">Un journal de tout ce qui part</p>
                  <p className="ofd-scinde__sous">Le système propose, vous tranchez.</p>
                  <p className="ofd-scinde__corps">
                    Les règles et les niveaux d&apos;autonomie sont définis avec vous. Chaque entreprise
                    dispose d&apos;un espace chiffré et cloisonné, et les modèles ne reçoivent que le
                    strict nécessaire à chaque tâche.
                  </p>
                  <div className="ofd-scinde__actions">
                    <Cta href="/commencer">Commencer</Cta>
                    <Cta href="/integrations" variante="trait">
                      Vérifier la compatibilité
                    </Cta>
                  </div>
                </div>

                <div data-reveal className="ofd-scinde__media">
                  <div className="ofd-fenetre">
                    <ChromeFenetre titre="File de validation" />
                    <div className="ofd-fenetre__corps">
                      {JOURNAL.map(({ icone: Icone, titre, sous, etat, attente }) => (
                        <div key={titre} className={`ofd-ligne${attente ? " ofd-ligne--attente" : ""}`}>
                          <span aria-hidden className="ofd-ligne__icone">
                            <Icone size={12} strokeWidth={1.75} />
                          </span>
                          <span className="ofd-ligne__corps">
                            <span className="ofd-ligne__titre">{titre}</span>
                            <span className="ofd-ligne__sous">{sous}</span>
                          </span>
                          <span className="ofd-ligne__etat">{etat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ─── 5b · grande console, légende mono, rangée ─── */}
          <section data-monde="clair" className="ofd-sec">
            <div className="ofd-wrap">
              <TeteSection
                etiquette="Ce qu'on installe"
                titre="Un système par processus, branché sur vos outils."
                chapo="Un processus chacun, traité en continu, arrêté à votre validation."
              />

              <div className="ofd-large">
                <div data-reveal className="ofd-console">
                  <div className="ofd-fenetre">
                    <ChromeFenetre titre="Les quatre systèmes" />
                    <div className="ofd-fenetre__corps ofd-fenetre__corps--colonnes">
                      {CONSOLE.map((col) => (
                        <div key={col.code} className="ofd-colonne">
                          <span className="ofd-ligne__etat">{col.code}</span>
                          {col.lignes.map((l) => (
                            <span key={l} className="ofd-ligne ofd-ligne--puce">
                              <span className="ofd-ligne__titre">{l}</span>
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="ofd-rangee">
                  <p className="ofd-mono ofd-rangee__legende">La mise en place, en trois étapes</p>
                  <div className="ofd-rangee__grille">
                    {ETAPES.map(({ icone: Icone, titre, texte }) => (
                      <div key={titre} data-reveal className="ofd-entree">
                        <span aria-hidden className="ofd-entree__icone">
                          <Icone size={24} strokeWidth={1.5} />
                        </span>
                        <div>
                          <h3 className="ofd-h5">{titre}</h3>
                          <p className="ofd-body">{texte}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ─── 5c · les quatre cartes à liste ─── */}
          <section id="catalogue" data-monde="clair" className="ofd-sec ofd-ancre">
            <div className="ofd-wrap">
              <TeteSection
                etiquette="Le catalogue"
                titre="Quatre systèmes couvrent les processus les plus répétitifs"
              />

              <div className="ofd-cartes4">
                {PAQUETS.map(({ icone: Icone, titre, href, lignes }) => (
                  <Link key={titre} href={href} data-reveal className="ofd-fiche">
                    <div className="ofd-fiche__tete">
                      <span aria-hidden className="ofd-fiche__icone">
                        <Icone size={24} strokeWidth={1.5} />
                      </span>
                      <h3 className="ofd-h5">{titre}</h3>
                    </div>
                    <ul>
                      {lignes.map((l) => (
                        <li key={l} className="ofd-body">
                          <Check size={16} strokeWidth={2} />
                          <span>{l}</span>
                        </li>
                      ))}
                    </ul>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* ─── 5d · les ressources ─── */}
          <section data-monde="clair" className="ofd-sec">
            <div className="ofd-wrap">
              <TeteSection etiquette="Ressources" titre="Pour aller plus loin" />

              <div className="ofd-ressources">
                {RESSOURCES.map((p) => (
                  <Link key={p.slug} href={`/blog/${p.slug}`} data-reveal className="ofd-ressource">
                    <div className="ofd-ressource__vignette">
                      <Image
                        src={p.cover}
                        alt=""
                        width={640}
                        height={402}
                        sizes="(max-width: 1024px) 100vw, 25vw"
                      />
                    </div>
                    <div className="ofd-ressource__texte">
                      <p className="ofd-ressource__cat">{p.cat}</p>
                      <h3 className="ofd-ressource__titre">{p.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* ─── 5e · le panneau ardoise ─── */}
          <section data-monde="clair" className="ofd-sec">
            <div className="ofd-wrap">
              <div className="ofd-ardoise">
                <div className="ofd-ardoise__grille">
                  <p className="ofd-ardoise__label">{"Le problème\nqu'ils règlent"}</p>
                  <div className="ofd-ardoise__corps">
                    <p data-reveal className="ofd-citation">
                      «&nbsp;Une entreprise ne perd pas son chiffre d&apos;un coup. Elle le perd par un
                      devis sans réponse, un appel manqué, une facture jamais relancée.&nbsp;»
                    </p>
                    <div data-reveal className="ofd-ardoise__signature">
                      <p>
                        Des demandes plus rapides que leur traitement, des relances suspendues à une
                        personne.
                      </p>
                      <span className="ofd-ardoise__tag">Ce que les quatre systèmes reprennent</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ─── 5f · le pied d'appel ─── */}
          <section data-monde="clair" className="ofd-pleine ofd-sec">
            <div className="ofd-hero">
              <Image
                src="/photos/tarifs-cloture-facade.jpg"
                alt=""
                fill
                sizes="100vw"
                className="ofd-hero__media"
              />
              <div aria-hidden className="ofd-hero-voile" />
              <div className="ofd-hero__col">
                <h2 data-reveal className="ofd-h1">
                  Un chiffrage avant tout engagement.
                </h2>
                <div data-reveal className="ofd-hero__actions">
                  <CtaPastille href="/commencer">Commencer</CtaPastille>
                  <Cta href="/offres/sur-mesure" variante="trait-blanc">
                    Découvrir le sur-mesure
                  </Cta>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
