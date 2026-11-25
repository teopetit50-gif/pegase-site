import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
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
import { BandeauOutils } from "@/components/offres/BandeauOutils";
import { GlobeCdn } from "@/components/ui/cobe-globe-cdn";
import { ChatMessages } from "@/components/ui/chat-messages";
import PageShell from "@/components/PageShell";
import Ajuste from "@/components/surmesure/Ajuste";
import Cycle from "@/components/offres/Cycle";
import Cadre from "@/components/charte/Cadre";
import Section from "@/components/charte/Section";
import EnTeteSection from "@/components/charte/EnTeteSection";
import Appel from "@/components/charte/Appel";
import Bouton from "@/components/charte/Bouton";
import Pastille from "@/components/charte/Pastille";
import { GrilleCartes, Scene } from "@/components/charte/Cartes";
import { POSTS } from "@/lib/content";
import "./nos-offres.css";
import "@/components/charte/pages/offres.css";

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
  /* 22/11 (Teo, « on part sur le sujet ERP », puis « garde le design exact,
     remplace juste le contenu ») — la page ne présente plus quatre systèmes
     à part mais le logiciel de gestion et ses modules. Aucune structure ni
     aucun style ne change : seuls les textes, à longueur égale. */
  title: "Le logiciel et ses modules | Omega.AI",
  description:
    "Omega, le logiciel de gestion qui se configure avec l'IA : ventes, achats, stock, banque, comptabilité et documents, avec des agents pour les relances, les clients inactifs, les demandes et les factures fournisseurs. Vous décidez de ce qui part.",
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
      "Omega se branche sur vos outils et reprend les données de votre logiciel actuel.",
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
  note: "*Les demandes arrivent par vos canaux habituels, les réponses partent par les mêmes.",
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
  { titre: "Validation", texte: "Votre accord, ou une règle fixée par vous." },
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
    titre: "Relances",
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
    titre: "Clients inactifs",
    href: "/offres/nouvelles-affaires",
    lignes: ["Repérés dans votre historique", "Classement par valeur", "Un message par trimestre"],
  },
  {
    icone: MessageSquare,
    titre: "Demandes clients",
    href: "/offres/demandes-clients",
    lignes: ["Réponse à toute heure", "Prise de rendez-vous"],
  },
  {
    icone: FileText,
    titre: "Factures fournisseurs",
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
  { slug: "devis-sans-relance", libelle: "Les devis sans réponse", icone: FileClock },
  { slug: "repondre-en-premier", libelle: "Répondre en premier", icone: Send },
  { slug: "facturation-electronique-2026", libelle: "La facture électronique", icone: ReceiptText },
]
  .map((r) => ({ ...r, post: POSTS.find((p) => p.slug === r.slug) }))
  .filter((r): r is typeof r & { post: (typeof POSTS)[number] } => Boolean(r.post));

/* ─────────────────────────────────────────────────────────────────────
   Briques
   ───────────────────────────────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────────────────────────────
   La page
   ───────────────────────────────────────────────────────────────────── */

export default function OffresPage() {
  return (
    <PageShell>
      {/* 25/11/2026 — la charte de l'accueil (docs/charte-accueil.md, § 4.2,
          ligne 6). La page passe dans <Cadre> ; les blocs du décalque de
          scale.com deviennent des sections jointives séparées par des
          filets, chacune sous l'en-tête de section de l'accueil (pastille,
          h2 à gauche, chapô gris). Les étiquettes à chasse fixe deviennent
          les pastilles, mot pour mot. Les visuels restent : la photo de
          l'atrium sous le h1 (le texte blanc sur photo part), le globe
          `cobe` dans une scène, le mot-symbole rouge dans un cadre de
          rayon 12, la fenêtre d'exemple, le schéma du cycle, la façade à
          côté de la citation. Le pied d'appel passe au bandeau <Appel>.
          Plus de PageMotion. Tous les boutons sont les `ch-btn` blancs.
          `.ofd` reste à la racine pour le dessin des pièces réemployées
          (bandeau d'outils, cycle, `Ajuste`) ; le dessin propre à la page :
          components/charte/pages/offres.css, sous `.charte .of-page`. */}
      <Cadre>
        <div className="ofd of-page">
          {/* ═══ 1 · LE TITRE DE PAGE, puis la photo dans son cadre ═══ */}
          <Section>
            <EnTeteSection
              niveau={1}
              haut
              pastille="Logiciel"
              titre="Le logiciel"
              chapo="Votre gestion dans un seul outil. Les agents préparent, vous validez."
              actions={
                <Bouton href="/reserver-un-audit" icone="chevron">
                  Commencer
                </Bouton>
              }
            />
            <div className="of-cellule">
              <div className="of-photo">
                <Image
                  src="/photos/tarifs-hero-atrium.jpg"
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 1280px) 1260px, 100vw"
                  className="of-photo__media"
                />
              </div>
            </div>
          </Section>

          {/* ═══ 2 · BANDE D'OUTILS ═══ */}
          <Section>
            <div className="of-outils">
              {/* hors écran : la rangée garde un intitulé pour les lecteurs
                  d'écran, la référence n'en affiche aucun. */}
              <p className="ofd-outils__legende">Se branche sur les outils déjà en place</p>
              {/* Le moteur vient de « Logo Marquee » (ddoemonn, 21st.dev) :
                  voir components/offres/BandeauOutils.tsx pour les écarts. */}
              <BandeauOutils
                outils={OUTILS.map(({ marque, nom }) => ({
                  nom,
                  chemin: marque.path,
                  titre: marque.title,
                }))}
              />
            </div>
          </Section>

          {/* ═══ 3 · OÙ QUE VOUS TRAVAILLIEZ : le globe dans sa scène, les
                 quatre arguments en cellules jointives ═══ */}
          <Section>
            <EnTeteSection
              pastille="En ligne"
              titre="Où que vous travailliez."
              chapo={
                <>
                  Le logiciel tourne en ligne, pas sur un poste. Vos équipes le retrouvent où
                  qu&apos;elles soient.
                </>
              }
            />
            <div className="of-arguments">
              <div className="of-arguments__globe">
                {/* Le globe `cobe` (components/ui/cobe-globe-cdn), sans
                    pastilles de région, sans compteurs, sans arcs ni
                    marqueurs : des points, une rotation, manipulable. */}
                <Scene className="of-globe-scene">
                  <GlobeCdn markers={[]} arcs={[]} libelles={false} trafic={false} className="of-globe" />
                </Scene>
              </div>
              <div className="of-arguments__cartes">
                {ARGUMENTS.map(({ teinte, titre, texte }) => (
                  <article key={titre} className="of-argument">
                    <div className="of-argument__tete">
                      <h3>{titre}</h3>
                      <span className="of-argument__puce" style={{ color: teinte }}>
                        <CoinPlein />
                      </span>
                    </div>
                    <p>{texte}</p>
                  </article>
                ))}
              </div>
            </div>
          </Section>

          {/* ═══ 4 · LE SUR-MESURE : le mot-symbole rouge dans son cadre,
                 l'énoncé à côté ═══ */}
          <Section>
            <div className="of-duo">
              <div className="of-duo__visuel">
                <div aria-hidden className="of-duo__marque">
                  {/* Mot-symbole en serif blanc sur le rouge de la référence
                      (#E7131A). UN SEUL MOT — Teo, 16/09 : « c'est un mot
                      qu'il faut mettre ». */}
                  <span className="of-duo__signe">Omega</span>
                </div>
              </div>
              <div className="of-duo__texte" data-gutter-guide="top">
                <Pastille>Sur mesure</Pastille>
                <h2 className="ch-titre">
                  Il vous manque un module&nbsp;?
                  <br />
                  <span>Nous le construisons et l&apos;ajoutons à votre logiciel.</span>
                </h2>
                <div className="ch-actions">
                  <Bouton href="/offres/sur-mesure" icone="chevron">
                    Découvrir le sur-mesure
                  </Bouton>
                </div>
              </div>
            </div>
          </Section>

          {/* ═══ 5a · CONTRÔLE HUMAIN : la fenêtre d'exemple dans sa scène,
                 le journal à côté ═══ */}
          <Section>
            <EnTeteSection
              pastille="Contrôle humain"
              titre="Vous décidez de ce qui part."
              chapo="Le logiciel propose, vous tranchez."
            />
            <div className="of-scinde">
              <div className="of-scinde__media">
                <Scene trame className="of-scinde__scene">
                  <div className="of-fenetre">
                    <ChatMessages
                      titre="À valider"
                      question={VALIDATION.question}
                      libelleValidation={VALIDATION.libelle}
                      propositions={VALIDATION.propositions}
                      envoi={VALIDATION.envoi}
                    />
                  </div>
                </Scene>
              </div>
              <div className="of-scinde__texte" data-gutter-guide="top">
                <h3>Le journal</h3>
                <p className="of-scinde__sous">Tout ce qui part, et qui l&apos;a validé.</p>
                <p className="of-scinde__corps">
                  Chaque envoi laisse une trace : ce qui est parti, à qui, sur quelle règle, et qui
                  l&apos;a validé. Au départ, tout passe par vous. Ensuite, vous pouvez laisser partir seuls certains envois, et
                  revenir en arrière à tout moment.
                </p>
                <div className="ch-actions">
                  <Bouton href="/reserver-un-audit" icone="chevron">
                    Commencer
                  </Bouton>
                  <Bouton href="/integrations" icone="chevron">
                    Vérifier la compatibilité
                  </Bouton>
                </div>
              </div>
            </div>
          </Section>

          {/* ═══ 5b · CE QUE FAIT UN AGENT : le schéma du cycle dans sa
                 scène, puis ses quatre temps en cellules jointives ═══ */}
          <Section>
            <EnTeteSection
              pastille="Ce que fait un agent"
              titre="Un agent par tâche, de bout en bout."
              chapo="De la demande reçue au message parti."
            />
            <div className="of-cellule">
              {/* `Ajuste` rend le cycle à sa largeur naturelle (1408) puis le
                  RÉDUIT pour tenir dans la scène. La note d'astérisque reste
                  HORS du cadre, sinon elle rétrécirait avec lui. */}
              <div className="ch-scene of-schema">
                <Ajuste largeur={1408}>
                  <Cycle />
                </Ajuste>
              </div>
              <p className="of-schema__note">{SCHEMA.note}</p>
            </div>
            <div className="of-rangee" data-gutter-guide="top">
              <div className="of-rangee__tete">
                <Pastille>Le cycle, temps par temps</Pastille>
              </div>
              <div className="of-rangee__grille">
                {CYCLE.map(({ titre, texte }) => (
                  <div key={titre} className="of-entree">
                    <span aria-hidden className="of-entree__icone">
                      <Check size={18} strokeWidth={2} />
                    </span>
                    <h3>{titre}</h3>
                    <p>{texte}</p>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ═══ 5c · LES QUATRE AGENTS, en grille de cartes jointives ═══ */}
          <Section id="catalogue" className="of-ancre">
            <EnTeteSection pastille="Les agents" titre="Quatre agents pour le travail répétitif." />
            <GrilleCartes colonnes={4}>
              {PAQUETS.map(({ icone: Icone, titre, href, lignes }) => (
                <Link key={titre} href={href} className="ch-carte of-fiche">
                  <div className="ch-carte-texte">
                    <span aria-hidden className="of-fiche__icone">
                      <Icone size={22} strokeWidth={1.5} />
                    </span>
                    <h3>{titre}</h3>
                    <ul>
                      {lignes.map((l) => (
                        <li key={l}>
                          <Check size={16} strokeWidth={2} />
                          <span>{l}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Link>
              ))}
            </GrilleCartes>
          </Section>

          {/* 25/11 (Teo : « arrête de parler ou montrer comme exemple les
              trucs BTP etc, les SaaS métier ; focus sur l'ERP, les agents
              qu'on vend ») — le bloc 5c bis, « Un module par métier », sort
              de la page. Les pages /secteurs restent en ligne, sans lien. */}

          {/* ═══ 5d · LES RESSOURCES : le pictogramme au trait dans sa
                 scène, le titre court dessous ═══ */}
          <Section>
            <EnTeteSection pastille="Ressources" titre="Pour aller plus loin" />
            <GrilleCartes colonnes={4}>
              {RESSOURCES.map(({ slug, libelle, icone: Icone, post }) => (
                <Link
                  key={slug}
                  href={`/blog/${slug}`}
                  className="ch-carte of-ressource"
                  aria-label={post.title}
                  title={post.title}
                >
                  <div aria-hidden className="ch-scene of-ressource__scene">
                    <Icone size={72} strokeWidth={1} />
                  </div>
                  <div className="ch-carte-texte">
                    <p className="of-ressource__cat">{post.cat}</p>
                    <h3>{libelle}</h3>
                  </div>
                </Link>
              ))}
            </GrilleCartes>
          </Section>

          {/* ═══ 5e · LE PROBLÈME QU'ILS RÈGLENT : la phrase, et la façade
                 dans son cadre ═══ */}
          <Section>
            <div className="of-citation">
              <div className="of-citation__texte">
                <Pastille>Le problème qu&apos;ils règlent</Pastille>
                <p className="of-citation__phrase">
                  «&nbsp;Une entreprise ne perd pas son chiffre d&apos;un coup. Elle le perd par un
                  devis sans réponse, un appel manqué, une facture jamais relancée.&nbsp;»
                </p>
                <div className="of-citation__signature">
                  <p>
                    Des demandes plus rapides que leur traitement, des relances suspendues à une
                    personne.
                  </p>
                  <Pastille>Ce que les quatre agents reprennent</Pastille>
                </div>
              </div>
              <div className="of-citation__photo" data-gutter-guide="top">
                {/* 16/09 (Teo, « prends une image mieux, plus pro et
                    nette ») — un mur-rideau de verre, qui répond à l'atrium
                    du haut de page sans le répéter. */}
                <div className="of-photo of-photo--cellule">
                  <Image
                    src="/photos/tarifs-abonnement-facade.jpg"
                    alt=""
                    fill
                    sizes="(min-width: 1001px) 50vw, 100vw"
                    className="of-photo__media"
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* ═══ 5f · LE PIED D'APPEL ═══ */}
          <Appel
            pastille="Prix"
            titre="Un prix écrit avant tout engagement."
            actions={
              <>
                <Bouton href="/reserver-un-audit" icone="chevron">
                  Commencer
                </Bouton>
                <Bouton href="/offres/sur-mesure" icone="chevron">
                  Découvrir le sur-mesure
                </Bouton>
              </>
            }
          />
        </div>
      </Cadre>
    </PageShell>
  );
}
