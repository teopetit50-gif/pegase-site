import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Check,
  FileClock,
  FileText,
  Hourglass,
  MessageSquare,
  ReceiptText,
  Send,
  Users,
} from "lucide-react";
import { siAirtable, siAsana, siHubspot, siQuickbooks, siStripe } from "simple-icons";
import { GlobeCdn } from "@/components/ui/cobe-globe-cdn";
import { ChatMessages } from "@/components/ui/chat-messages";
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

   ── LE BUDGET DE TEXTE, EMPLACEMENT PAR EMPLACEMENT ──────────────────
   Teo, 16/09, deux fois : « il y a trop de texte sur les sections » puis
   « fais les textes aussi courts quand c'est court et aussi longs quand
   c'est long ». La consigne n'est donc PAS « faire court » : c'est de
   tenir la longueur de la référence À CHAQUE EMPLACEMENT. Relevé à 1440,
   référence puis nous :

     chapô du hero            70   ·  76
     chapô de section         45-47·  34 et 39      (une ligne, comme eux)
     titre du bloc scindé     13   ·  10   « Generative AI » → « Le journal »
     sous-titre du bloc       45   ·  36
     paragraphe du bloc      188   · 190   LE SEUL long de la page, chez
                                            eux comme chez nous
     texte de carte           93-142· 89-143
     pied d'appel            aucun paragraphe, un titre et deux boutons

   Les chapôs de section faisaient 94 et 66, donc deux lignes là où la
   référence en a une : c'est ce qui se voyait. Le paragraphe du bloc
   scindé, lui, N'A PAS été raccourci — il est long chez eux aussi, et le
   raccourcir aurait été l'autre moitié de l'erreur.

   ── LE REGISTRE, PASSE DU 16/09 AU SOIR ──────────────────────────────
   Teo : « les textes sont nuls et génériques, inspire-toi de comment
   Scale AI écrit les siens », puis « la même densité de texte qu'eux :
   les sections trop remplies, des textes plus pro mais pas plus
   développés que les leurs ». Ce qui a été relevé sur la référence et
   appliqué ici, emplacement par emplacement :

   · CADENCE VERBALE dans le chapô du hero. Leur « Collect, Curate, and
     annotate data. Train models and evaluate. Repeat. » n'est pas une
     phrase, c'est une suite de verbes qui montre le cycle. Le nôtre
     énumérait des compléments (« sur vos outils, sous vos règles ») ;
     il énumère maintenant les temps du traitement.

   · TITRES DE CARTE D'UN SEUL MOT. Leurs quatre cartes s'appellent
     Quality, Cost Effective, Scalability, Diversity. Les nôtres
     portaient des intitulés de rubrique (« Intégration à votre
     environnement ») : le mot seul suffit, le texte dit le reste.

   · FRAGMENTS, PAS DE PHRASES DE PRÉCAUTION. Leurs légendes n'ont ni
     « nos systèmes », ni « permet de », ni proposition subordonnée :
     « Real-time visibility into data collection and curation ». Les
     tournures en « Nos systèmes s'intègrent… sans imposer le moindre… »
     sont celles que Teo lit comme génériques — elles décrivent une
     intention au lieu d'énoncer un fait.

   · LE FAIT LE PLUS PROCHE, PAS LE PLUS LARGE. Le paragraphe du bloc
     scindé répétait les cartes 2 et 3 (règles, chiffrement) sous le
     titre « Le journal » : il dit maintenant ce que le journal contient.
     Un texte qui répète la section d'à côté se lit comme du remplissage,
     quelle que soit sa longueur.

   · AUCUN EMPLACEMENT N'A ÉTÉ RALLONGÉ. Le budget relevé plus haut tient
     toujours ; les quatre cartes passent de 89-158 à 78-129 signes, et
     l'énoncé du panneau rouge de 79 à 96 (le leur en fait 122).
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
/* 16/09 (Teo, « mets des logos qui font plus pro ») — la rangée portait
   Gmail, Drive, Notion, Shopify : des outils de TPE, qui tiraient la page
   vers le bas alors qu'elle parle à des groupes. Les cinq ci-dessous sont
   les plus corporate de la liste de /integrations — ERP et comptabilité,
   CRM, paiement, gestion de projet, base de données.

   CE QU'ON N'Y MET PAS, et ce n'est pas négociable : des logos d'éditeurs
   d'IA. Aucune page publique ne dit avec quoi le produit est fait
   (references/regles-maison.md). Et c'est déjà arrivé : jusqu'au
   05/08/2026 les tuiles de paquets portaient Anthropic, Gemini, Cursor,
   n8n — retirés ce jour-là parce qu'afficher la marque d'un éditeur comme
   signe distinctif d'une offre Omega se lit comme une marque empruntée
   (voir l'en-tête de components/logos.tsx). Cette bande liste les outils
   DU CLIENT, jamais les nôtres. */
const OUTILS = [
  { marque: siHubspot, nom: "HubSpot" },
  { marque: siStripe, nom: "Stripe" },
  { marque: siQuickbooks, nom: "QuickBooks" },
  { marque: siAsana, nom: "Asana" },
  { marque: siAirtable, nom: "Airtable" },
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
    titre: "Intégration",
    texte:
      "Vos outils restent les vôtres. Les systèmes s'y branchent, sans interface de plus.",
  },
  {
    teinte: "#a8927c",
    titre: "Contrôle",
    texte:
      "Les règles s'écrivent avec vous. Les actions sensibles attendent votre accord.",
  },
  {
    teinte: "#273252",
    titre: "Sécurité",
    texte:
      "Un environnement cloisonné par client, des données chiffrées, des accès tracés.",
  },
  {
    teinte: "#193a29",
    titre: "Financement",
    texte:
      "Une partie de l'investissement peut relever du Chèque TIC, aide de la Région Guadeloupe aux entreprises qui y sont immatriculées.",
  },
];

/* BLOC 5a — la fenêtre d'exemple. 16/09, Teo : « prends ce composant et
   refais exactement cette section » (capture de scale.com/data-engine à
   l'appui). Le journal de trois lignes figées laisse la place à la
   fenêtre ANIMÉE de la référence : une demande entre, le système rédige,
   trois brouillons s'empilent, vous tranchez, le message part.

   La mécanique et son relevé sont dans components/ui/chat-messages.tsx ;
   ici, seulement ce qui est dit. C'est la scène exacte de l'énoncé posé à
   côté — « Le système propose, vous tranchez » — et elle ne montre les
   données d'aucun client : le chrome porte « Exemple ».

   Budget de texte relevé sur la référence : 58 signes pour la question,
   54 à 58 pour chaque proposition. Les nôtres tiennent dedans ; deux mots
   de plus et la pastille passe sur deux lignes dans le cadre de 649. */
const VALIDATION = {
  question: "Pouvez-vous me confirmer l'échéance de la facture FA-2402 ?",
  libelle: "Votre validation",
  propositions: [
    { texte: "Facture FA-2402 en retard, règlement attendu sous 24 h." },
    { texte: "Échéance au 3 septembre, le solde est dû depuis 12 jours.", retenue: true },
    { texte: "Votre demande a été transmise au service concerné." },
  ],
  envoi: "Échéance au 3 septembre, le solde est dû depuis 12 jours.",
};

/* BLOC 5b — LE SCHÉMA DU CYCLE.

   16/09 (Teo) — « tu m'as fait deux trucs complètement différents, je veux
   que le schéma soit le même. » Il avait raison : la référence pose ici un
   SCHÉMA — des cartes blanches reliées par des flèches courbes sur le fond
   doux — et nous avions mis une console sombre. Rien à voir.

   Leur schéma est une IMAGE sur leur CDN (2432 × 1274). On ne recopie pas
   l'actif d'autrui (references/regles-maison.md) : celui-ci est redessiné
   en SVG, même topologie et même vocabulaire graphique —
     une entrée et une sortie en pastilles, marquées d'un astérisque et
     renvoyées à une note de bas de schéma, parce qu'elles ne sont pas de
     notre ressort (chez eux : « managed by customers ») ;
     deux cartes hautes sur la ligne centrale, reliées par des flèches
     droites ;
     une boucle par le haut et une par le bas, en arcs ;
     un retour en pointillés depuis la sortie.
   En SVG plutôt qu'en image : net à toute taille, et le texte reste du
   texte — sélectionnable, traduisible, lu par un lecteur d'écran. */
const SCHEMA = {
  entree: "Réception*",
  sortie: "Envoi*",
  gauche: {
    titre: "Qualification",
    sous: "(compréhension)",
    corps: ["La demande est comprise et", "rattachée au bon dossier."],
  },
  droite: {
    titre: "Rédaction",
    sous: "(au cas par cas)",
    corps: ["Le message est écrit depuis vos", "règles, pas d'un modèle figé."],
  },
  haut: {
    titre: "Règles",
    corps: ["Ce que le système a le droit de", "faire, défini avec vous."],
  },
  bas: {
    titre: "Journal",
    corps: ["Tout ce qui est parti, et qui", "l'a validé."],
  },
  retour: "Vos corrections",
  note: "*Réception et envoi se font dans vos outils : aucun compte à créer.",
};

/* BLOC 5b — LA RANGÉE SOUS LE SCHÉMA.

   16/09 (Teo) — « notre section est mal faite, les trucs ne sont pas au
   même endroit ; eux c'est des trucs validés, nous c'est des logos ; il
   faut que ce soit un copier-coller, et on n'a que 3 phrases, eux 4. »

   Deux erreurs, et la seconde était la cause de la première :

   1. LA FORME. La référence coche ses quatre entrées — un seul et même
      chevron, pas un pictogramme différent par ligne. Nous posions une
      loupe, une prise et un double-chevron : trois dessins pour trois
      lignes, là où eux en ont un pour quatre.

   2. LE FOND. Leur rangée ne liste pas des ÉTAPES mais les quatre temps
      du SCHÉMA juste au-dessus (leur diagramme montre SFT, RLHF, Red
      Teaming, Model Evaluation ; leur rangée les reprend). J'y avais mis
      les trois étapes de la mise en place — un contenu qui n'a rien à
      voir avec le schéma, d'où le trou en bas à droite de la grille.
      La rangée reprend donc les quatre temps de NOTRE schéma, dans son
      ordre : réception, qualification, rédaction, validation.

   CE QUI DISPARAÎT DE LA PAGE : les trois étapes de la mise en place
   (diagnostic 30 min, intégration, cycle supervisé). Elles n'ont pas
   d'emplacement dans la référence — je les avais logées ici faute de
   mieux. Elles vivent sur /commencer, et le diagnostic de trente minutes
   reste la promesse du bouton. À remettre si Teo les veut sur cette page,
   mais alors dans une section à elles, pas dans celle-ci.

   Longueurs, référence puis nous : 41-85 signes · 38-58. */
const CYCLE = [
  {
    titre: "Réception",
    texte: "La demande arrive dans vos outils, sur son canal d'origine.",
  },
  { titre: "Qualification", texte: "Comprise et rattachée au bon dossier." },
  { titre: "Rédaction", texte: "Écrit depuis vos règles, pas d'un modèle figé." },
  { titre: "Validation", texte: "Rien ne part sans votre accord." },
];

/* BLOC 5c — les quatre paquets.

   16/09 (Teo) — « la taille des cartes n'est pas la même, les nôtres sont
   plus hautes ; eux il y a moins de trucs, nous il y a trop de texte. »
   Les deux vont ensemble. Leurs puces sont des ÉTIQUETTES de deux ou
   trois mots, jamais des phrases : « Document Processing », « Infrared »,
   « LiDAR » — 5 à 27 signes, une ligne chacune. Les nôtres faisaient 38 à
   55 signes et passaient toutes sur deux lignes : à `min-height: 320`
   identique, c'est le nombre de lignes qui creusait l'écart de hauteur.

   Et le compte : la référence descend 4 / 3 / 2 / 1. Nous faisions
   4 / 4 / 3 / 2. Même dégradé maintenant, sans rien inventer — ce qui
   part est le détail, il est repris sur la page produit de chaque
   paquet, où il a la place de s'écrire en phrases. */
const PAQUETS = [
  {
    icone: Bell,
    titre: "CASHD",
    href: "/offres/relances-impayes",
    lignes: [
      "Relance des devis",
      "Relance des factures échues",
      "Gradation par montant",
      "Validation avant envoi",
    ],
  },
  {
    icone: Users,
    titre: "RELOAD",
    href: "/offres/nouvelles-affaires",
    lignes: ["Clients inactifs", "Classement par valeur", "Un message par trimestre"],
  },
  {
    icone: MessageSquare,
    titre: "FRONTD",
    href: "/offres/demandes-clients",
    lignes: ["Réponse à toute heure", "Prise de rendez-vous"],
  },
  {
    icone: FileText,
    titre: "FILED",
    href: "/offres/factures-fournisseurs",
    lignes: ["Lecture et classement"],
  },
];

/* BLOC 5d — LES RESSOURCES.

   16/09 (Teo) — « cette section n'est pas pareille : eux c'est des trucs
   avec fond blanc, pas nous, nous c'est des images ; et les phrases en
   noir sont encore trop développées chez nous. »

   Deux corrections :

   1. LA VIGNETTE. La référence ne met PAS de photographie : un fond blanc
      et un dessin au trait, centré. Nos couvertures d'articles sont des
      photos sombres — même emprise, poids visuel opposé. La vignette
      passe donc au blanc avec un pictogramme au trait, comme eux. Les
      couvertures restent celles des billets, sur /blog, où elles ont leur
      place.

   2. LE TITRE. Leurs titres de carte font 22 à 33 signes et tiennent sur
      une ligne ; les nôtres, qui sont les titres COMPLETS des billets, en
      font 32 à 62 et passaient tous sur deux lignes. La carte porte
      désormais un `libelle` court — un abrégé fidèle, pas un autre titre.
      Le titre complet du billet n'est pas perdu : il reste le nom
      accessible du lien (`aria-label`), donc ce qu'annonce un lecteur
      d'écran et ce qu'affiche l'infobulle. La page /blog, elle, continue
      d'afficher les titres entiers.

   Longueurs, référence puis nous : 22-33 · 18-25. */
const RESSOURCES = [
  { slug: "impayes-cout-attendre", libelle: "Le coût d'attendre", icone: Hourglass },
  { slug: "btp-devis-jamais-relances", libelle: "Les devis sans réponse", icone: FileClock },
  { slug: "immobilier-repondre-en-premier", libelle: "Répondre en premier", icone: Send },
  { slug: "facturation-electronique-2026", libelle: "La facture électronique", icone: ReceiptText },
]
  .map((r) => ({ ...r, post: POSTS.find((p) => p.slug === r.slug) }))
  .filter((r): r is typeof r & { post: (typeof POSTS)[number] } => Boolean(r.post));

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

/* Le schéma du cycle, redessiné d'après la topologie de la référence.
   Tout est dans un seul viewBox de 1216 × 640 (leur image fait 2432 × 1274,
   même rapport) : les textes suivent donc l'échelle du cadre et restent
   nets à toute taille. */
/* une carte du schéma : cadre blanc, titre, éventuel sous-titre entre
   parenthèses, puis le corps sur deux lignes. Déclarée AU MODULE et non
   dans SchemaCycle : un composant créé pendant le rendu perd son état à
   chaque passe, et eslint le refuse (react/no-unstable-nested-components). */
function SchemaCarte({
  x,
  y,
  l,
  h,
  titre,
  sous,
  corps,
}: {
  x: number;
  y: number;
  l: number;
  h: number;
  titre: string;
  sous?: string;
  corps: string[];
}) {
  return (
    <g>
      <rect x={x} y={y} width={l} height={h} rx={14} fill="#ffffff" filter="url(#ofd-ombre)" />
      <text x={x + 26} y={y + 42} className="ofd-schema__titre">
        {titre}
      </text>
      {sous ? (
        <text x={x + 26} y={y + 68} className="ofd-schema__sous">
          {sous}
        </text>
      ) : null}
      {corps.map((ligne, i) => (
        <text key={ligne} x={x + 26} y={y + (sous ? 118 : 92) + i * 24} className="ofd-schema__corps">
          {ligne}
        </text>
      ))}
    </g>
  );
}

/* une pastille d'entrée, de sortie ou de retour : ce qui n'est pas de
   notre ressort, d'où l'astérisque et la note en bas de schéma. */
function SchemaPastille({
  x,
  y,
  l,
  h,
  texte,
  pointille = false,
}: {
  x: number;
  y: number;
  l: number;
  h: number;
  texte: string;
  pointille?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={l}
        height={h}
        rx={14}
        fill="#ffffff"
        stroke={pointille ? "#c9c9c9" : "none"}
        strokeDasharray={pointille ? "5 5" : undefined}
        filter={pointille ? undefined : "url(#ofd-ombre)"}
      />
      <text x={x + l / 2} y={y + h / 2 + 7} textAnchor="middle" className="ofd-schema__titre">
        {texte}
      </text>
    </g>
  );
}

/* Le schéma du cycle, redessiné d'après la topologie de la référence.
   Tout tient dans un viewBox de 1216 × 660 (leur image fait 2432 × 1274,
   même rapport) : les textes suivent donc l'échelle du cadre et restent
   nets à toute taille. */
function SchemaCycle() {
  const C = SCHEMA;
  return (
    <svg
      viewBox="0 0 1216 660"
      role="img"
      aria-label="Le cycle : réception, qualification, rédaction, envoi, avec la boucle des règles et du journal"
    >
      <defs>
        <filter id="ofd-ombre" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000000" floodOpacity="0.06" />
        </filter>
        <marker
          id="ofd-fleche"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0 L10 5 L0 10 z" fill="#8a8a8a" />
        </marker>
      </defs>

      {/* ── la ligne centrale : entrée → qualification → rédaction → sortie ── */}
      <SchemaPastille x={0} y={286} l={196} h={76} texte={C.entree} />
      <SchemaCarte x={276} y={232} l={290} h={184} {...C.gauche} />
      <SchemaCarte x={650} y={232} l={290} h={184} {...C.droite} />
      <SchemaPastille x={1020} y={286} l={196} h={76} texte={C.sortie} />

      <g stroke="#8a8a8a" strokeWidth="1.6" fill="none" markerEnd="url(#ofd-fleche)">
        <path d="M196 324 H262" />
        <path d="M566 324 H636" />
        <path d="M940 324 H1006" />
        {/* boucle haute : qualification → règles → rédaction */}
        <path d="M352 232 C352 150 366 108 416 108" />
        <path d="M800 108 C850 108 864 150 864 232" />
        {/* boucle basse : rédaction → journal → qualification */}
        <path d="M864 416 C864 498 850 540 800 540" />
        <path d="M416 540 C366 540 352 498 352 416" />
      </g>

      {/* ── les deux cartes de la boucle ── */}
      <SchemaCarte x={416} y={30} l={384} h={156} {...C.haut} />
      <SchemaCarte x={416} y={462} l={384} h={156} {...C.bas} />

      {/* ── le retour en pointillés, depuis la sortie ── */}
      <SchemaPastille x={1000} y={508} l={216} h={64} texte={C.retour} pointille />
      <g
        stroke="#b4b4b4"
        strokeWidth="1.6"
        fill="none"
        strokeDasharray="5 6"
        markerEnd="url(#ofd-fleche)"
      >
        <path d="M1118 362 V502" />
        <path d="M1000 540 H806" />
      </g>

      <text x={608} y={650} textAnchor="middle" className="ofd-schema__note">
        {C.note}
      </text>
    </svg>
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
              {/* 16/09 (Teo, « on a aussi trop de texte, je veux la même
                  chose qu'eux ») — leur hero tient en TROIS éléments : le
                  nom de la page sur UNE ligne (« Data Engine », 11 signes),
                  une promesse d'une ligne (70), un bouton. Le nôtre portait
                  un titre de 50 signes qui passait sur deux lignes à 64 px.
                  « Nos offres » est l'exact pendant de leur « Data Engine » :
                  le nom de la page, et le chapô porte la promesse. */}
              <h1 data-reveal className="ofd-h1">
                Nos offres
              </h1>
              <p data-reveal className="ofd-lead">
                Recevoir, comprendre, rédiger. Vous validez, le système envoie. Chaque jour.
              </p>
              <div data-reveal className="ofd-hero__actions">
                <CtaPastille href="/commencer">Commencer</CtaPastille>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 2 · BANDE D'OUTILS ═══ */}
        <section data-monde="clair" className="ofd-sec ofd-sec--haut">
          <div className="ofd-wrap ofd-wrap--plein">
            {/* hors écran : la rangée garde un intitulé pour les lecteurs
                d'écran, la référence n'en affiche aucun. */}
            <p className="ofd-outils__legende">Se branche sur les outils déjà en place</p>
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
          <div className="ofd-wrap ofd-wrap--plein">
            <div className="ofd-panneau">
              <div className="ofd-panneau__grille">
                <div className="ofd-panneau__gauche">
                  <div data-reveal className="ofd-panneau__intro">
                    {/* 16/09 (Teo, « les tailles de section ne sont pas les
                        mêmes, les cartes non plus ») — et c'était vrai : le
                        panneau faisait 860 contre 810, les cartes 362 contre
                        337. Toute la différence venait d'ICI. La colonne de
                        gauche est ce qui dicte la hauteur du panneau (le
                        globe y pose 560 fixes), et ce titre passait sur DEUX
                        lignes là où « The Best In The Business » tient sur
                        une : 100 px au lieu de 50, reportés tels quels sur
                        le panneau puis sur les quatre cartes.
                        Le titre doit donc tenir en UNE ligne dans les 460 px
                        de `.ofd-panneau__intro`. Mesuré à 40 px : la version
                        d'avant faisait 600 px, « Rien ne change chez vous. »
                        488, « Vos outils ne changent pas. » 502 — le
                        français passe tout juste au-dessus à chaque fois.
                        Celle-ci fait 404 et tient. Ne pas la rallonger sans
                        remesurer : deux mots de plus et les huit blocs de la
                        colonne de droite se décalent. */}
                    <h2 className="ofd-h3">Ce qui ne change pas.</h2>
                    <p className="ofd-body">
                      Les systèmes travaillent dans vos outils, pas à côté. Aucun compte à créer,
                      aucune donnée à migrer.
                    </p>
                  </div>
                  {/* 16/09 (Teo) — le motif à points calculé laisse la
                      place au globe `cobe` (components/ui/cobe-globe-cdn).
                      Pastilles de région et compteurs de débit ÉTEINTS :
                      les valeurs par défaut de la fiche nomment les
                      régions d'un hébergeur et affichent des débits
                      inventés. Il ne reste que des points et des arcs. */}
                  <div className="ofd-panneau__motif">
                    {/* Ni arcs ni marqueurs : à l'écran, les arcs de la
                        fiche rayaient la sphère comme des griffes et les
                        marqueurs faisaient des pâtés noirs sur le bord.
                        La référence, à cette place, pose un planisphère en
                        points — rien d'autre. Le globe garde sa rotation
                        et reste manipulable à la souris, ce que le
                        planisphère ne faisait pas. */}
                    <GlobeCdn
                      markers={[]}
                      arcs={[]}
                      libelles={false}
                      trafic={false}
                      className="ofd-globe"
                    />
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
          <div className="ofd-wrap ofd-wrap--plein">
            <div className="ofd-duo">
              <div aria-hidden className="ofd-duo__marque">
                {/* le rouge est porté par cet enfant, pas par le cadre :
                    la sonde de couleur de l'entête traverse le cadre
                    transparent et lit le blanc de la page. Voir le
                    commentaire de `.ofd-duo__marque` dans nos-offres.css. */}
                <span className="ofd-duo__fond" />
                {/* Mot-symbole en serif blanc sur le rouge de la référence
                    (#E7131A). UN SEUL MOT — Teo, 16/09 : « c'est un mot
                    qu'il faut mettre ». « Sur mesure » passait sur deux
                    lignes et mangeait le champ rouge ; leur logotype à eux
                    est un mot de quatre lettres. */}
                <span className="ofd-duo__signe">Omega</span>
              </div>
              <div className="ofd-duo__texte">
                <div data-reveal>
                  <p className="ofd-mono">Sur mesure</p>
                  <h3 className="ofd-h3">
                    Quand aucun système du catalogue ne couvre le processus, nous concevons celui qui manque.
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
                chapo="Le système propose, vous tranchez."
                large
              />

              <div className="ofd-scinde">
                <div data-reveal className="ofd-scinde__texte">
                  <p className="ofd-h4">Le journal</p>
                  <p className="ofd-scinde__sous">Tout ce qui part, et qui l&apos;a validé.</p>
                  <p className="ofd-scinde__corps">
                    Chaque envoi laisse une trace : ce qui est parti, à qui, sur quelle règle, et qui
                    l&apos;a validé. Les niveaux d&apos;autonomie se règlent poste par poste, et se
                    modifient en cours d&apos;exploitation.
                  </p>
                  <div className="ofd-scinde__actions">
                    <Cta href="/commencer">Commencer</Cta>
                    <Cta href="/integrations" variante="trait">
                      Vérifier la compatibilité
                    </Cta>
                  </div>
                </div>

                <div data-reveal className="ofd-scinde__media">
                  <ChatMessages
                    titre="File de validation"
                    question={VALIDATION.question}
                    libelleValidation={VALIDATION.libelle}
                    propositions={VALIDATION.propositions}
                    envoi={VALIDATION.envoi}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ─── 5b · grande console, légende mono, rangée ─── */}
          <section data-monde="clair" className="ofd-sec">
            <div className="ofd-wrap">
              <TeteSection
                etiquette="Ce qu'on installe"
                titre="Un système par processus, de bout en bout."
                chapo="De la demande reçue au message parti."
              />

              <div className="ofd-large">
                <div data-reveal className="ofd-schema">
                  <SchemaCycle />
                </div>

                <div className="ofd-rangee">
                  <p className="ofd-mono ofd-rangee__legende">Le cycle, temps par temps</p>
                  <div className="ofd-rangee__grille">
                    {CYCLE.map(({ titre, texte }) => (
                      <div key={titre} data-reveal className="ofd-entree">
                        <span aria-hidden className="ofd-entree__icone">
                          <Check size={22} strokeWidth={2} />
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
                titre="Quatre processus, quatre systèmes déjà construits."
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
                {RESSOURCES.map(({ slug, libelle, icone: Icone, post }) => (
                  <Link
                    key={slug}
                    href={`/blog/${slug}`}
                    data-reveal
                    className="ofd-ressource"
                    aria-label={post.title}
                    title={post.title}
                  >
                    <div aria-hidden className="ofd-ressource__vignette">
                      <Icone size={96} strokeWidth={1} />
                    </div>
                    <div className="ofd-ressource__texte">
                      <p className="ofd-ressource__cat">{post.cat}</p>
                      <h3 className="ofd-ressource__titre">{libelle}</h3>
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
                /* 16/09 (Teo, « prends une image mieux, plus pro et
                   nette ») — la façade au coucher de soleil lisait
                   « photo de banque d'images ». Celle-ci est un
                   mur-rideau de verre : graphique, net, et elle répond à
                   l'atrium du hero sans le répéter. */
                src="/photos/tarifs-abonnement-facade.jpg"
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
