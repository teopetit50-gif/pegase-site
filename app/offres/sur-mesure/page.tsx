import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { AgentTrace, type TraceSpan } from "@/components/ui/agent-trace";
import { HalftoneFlow } from "@/components/ui/halftone-flow";
import Cycle from "@/components/surmesure/Cycle";
import Ajuste from "@/components/surmesure/Ajuste";
import Cadre from "@/components/charte/Cadre";
import Section from "@/components/charte/Section";
import EnTeteSection from "@/components/charte/EnTeteSection";
import Appel from "@/components/charte/Appel";
import Bouton from "@/components/charte/Bouton";
import Pastille from "@/components/charte/Pastille";
import { GrilleCartes, Scene } from "@/components/charte/Cartes";
import {
  SigneHubspot,
  SigneNotion,
  SigneStripe,
  CroquisDocument,
  CroquisPont,
  CroquisSuivi,
  PictoApplication,
  PictoAssistant,
  PictoBord,
  PictoCadran,
  PictoPiece,
  PictoPont,
} from "@/components/surmesure/Panneaux";
import { FAMILLES, agentPaquet, nomPaquet, sansNomPaquet } from "@/lib/content";
import { fr } from "@/lib/typo";
import { Bell, FileText, MessageSquare, Users } from "lucide-react";
import Casestudies, { type Cas } from "@/components/ui/case-studies";
import Feature11, { type Volet } from "@/components/ui/feature-11";
import { FICHES } from "@/lib/fiches";
import type { Fiche } from "@/lib/fiches";
import "./sur-mesure.css";
import "@/components/charte/pages/sur-mesure.css";

/* ══════════════════════════════════════════════════════════════════════
   /offres/sur-mesure — décalque de scale.com/generative-ai-data-engine
   (16/09/2026)

   Demande de Teo, lien à l'appui : « refais complètement la page sur
   mesure — supprime l'ancienne version et refais la nouvelle, ça doit
   être mot pour mot la même page. »

   La page précédente (gabarit maison du 07/08, puis sept reprises
   21st.dev du 14/09, puis passage en blanc le 15/09) est remplacée EN
   ENTIER. Elle n'est plus là : ni ses composants, ni son ordre de
   lecture, ni son habillage. Le relevé au pixel, le choix de police et
   les écarts de forme sont documentés en tête de `./sur-mesure.css`.

   ROUTE STATIQUE, PAS UN PAQUET — inchangé. Le sur-mesure n'est pas dans
   FAMILLES / FICHES : l'y inscrire le propagerait partout où la liste
   des paquets est lue (bandeau « les autres », grilles de /offres,
   sitemap) et casserait les copies qui comptent en toutes lettres
   (« quatre postes », grilles en quatre colonnes). Next donne priorité au
   segment statique : /offres/sur-mesure atterrit ici, jamais dans
   [system]. Elle reste au sitemap (rang 0.9, comme /offres).

   ── LES ONZE SECTIONS, DANS L'ORDRE DE LA RÉFÉRENCE ──────────────────
    1 hero pleine image + bouton      → « Sur mesure » / le pitch
    2 bandeau « trusted by » + lien   → les outils du client (voir écart 1)
    3 étiquette + h2 + chapô          → APERÇU : le système qui manque
    4 grande pièce                    → du besoin au système (les 4 étapes)
    5 carte de citation vert sombre   → le pari de la page (voir écart 2)
    6 phrase à gauche + pièce à droite→ le niveau d'autonomie, règle par règle
    7 étiquette + h2 + chapô + image  → l'espace client, capture réelle
    8 six cartes « Key Features »     → les six périmètres
    9 trois vignettes « Demos »       → trois besoins traités (voir écart 3)
   10 vignettes « Case Studies »      → les quatre systèmes du catalogue
   11 appel pleine image              → parler de votre cas

   ── LES ÉCARTS DE CONTENU ────────────────────────────────────────────
   Chacun est un choix, pas un oubli.

   1. LA PREUVE SOCIALE. La référence ouvre sur « Trusted by the world's
      most ambitious AI teams » et trois logos de clients. Nous n'avons
      pas de logo client à afficher et nous n'en inventons pas : le
      bandeau porte les OUTILS DU CLIENT — ceux sur lesquels un système
      se branche — avec le lien vers /integrations. Même emplacement,
      même rangée, rien d'inventé.

   2. LA CITATION. La référence signe la sienne d'un nom connu du
      secteur. Nous ne citons personne : la grande citation porte le PARI
      de la page — ce que le catalogue ne couvre pas et pourquoi — et la
      signature est la nôtre, pas celle d'un client.

   3. LES DÉMONSTRATIONS. La référence pose trois vignettes de vidéo.
      Nous n'avons pas ces vidéos, et un lecteur vide serait un mensonge
      d'interface : trois croquis au trait, un par nature de besoin,
      dans le même cadre et le même rapport, sans bouton de lecture.

   4. LES LOGOS SUR MOBILE. La référence masque sa rangée de logos sous
      768 px (`hidden md:block`) et ne la remplace par rien. La nôtre
      s'enroule sur deux lignes : une rangée de cinq marques tient à
      390 px, il n'y a pas de raison de la retirer.

   ── CE QUI QUITTE LA PAGE, ET OÙ C'EST PASSÉ ─────────────────────────
   La référence n'a ni FAQ, ni bandeau de secteurs, ni grille
   d'intégrations, ni liste de garanties. Décalquer la page mot pour mot,
   c'est donc s'en séparer. Les textes, eux, restent dans `FICHE`
   ci-dessous — champ pour champ, prêts à être remis :

   • `FICHE.faq` (4 questions) n'est plus rendue. C'était le seul endroit
     du site qui écrivait les délais, le coût, la propriété du code et
     les besoins qu'on refuse. → à remettre si Teo veut une 12ᵉ section.
   • `FICHE.etapes` (les 4 étapes : cadrage, devis, construction, mise en
     service) et `FICHE.cible` (8 secteurs) ne sont PLUS RENDUES depuis
     que le panneau d'aperçu a cédé la place au déroulé d'exécution
     (16/09, demande de Teo). C'est la perte la plus sérieuse de la
     page : la MÉTHODE n'est écrite nulle part ailleurs, or c'est la
     première question d'une direction devant un projet sur mesure. Les
     deux champs restent ici, et le composant qui les mettait en page
     reste dans components/surmesure/Panneaux.tsx (`PanneauMethode`,
     orphelin depuis le 16/09) : les remettre est un import et six
     lignes. → à trancher avec Teo.
   • `FICHE.outils` alimente désormais le bandeau nº 2, sous forme de
     logos plutôt que de pastilles.
   • Les quatre garanties du gabarit (file de validation, journal, données
     chez vous, Chèque TIC) partaient d'un bloc commun aux pages produit,
     pas de cette fiche : elles vivent toujours sur les quatre pages du
     catalogue, vers lesquelles la section 10 renvoie.

   ── LE REGISTRE, PASSE DU 16/09 AU SOIR ──────────────────────────────
   Teo : « les textes sont nuls et génériques, inspire-toi de Scale AI »,
   et « la même densité de texte qu'eux, pas plus développé ». La
   référence tient tous ses énoncés de section entre 80 et 157 signes,
   en fragments sans subordonnée. Huit emplacements dépassaient :

     aperçu (pointsChapo)        168 → 127     (le leur : 139)
     règle par règle (controle)  235 → 146     (le leur : 157)
     ce que vous obtenez         200 → 132     (le leur :  80)
     le catalogue                163 → 114
     les trois exemples      145-176 →  96-108
     fermeture des exemples      152 → 137
     l'appel                     142 → 106     (le leur : aucun texte)

   Ce qui est coupé est à chaque fois une REDITE ou une précaution, pas
   un fait : « avec vous » que la phrase dit déjà deux fois, « Rien n'est
   figé, puisqu'un réglage se modifie » quand la phrase énumère justement
   les réglages, « Vos équipes n'ouvrent pas un outil de plus » qui
   reformule « là où vivent déjà les autres ». Les faits de méthode
   restent intacts dans FICHE.etapes et FICHE.faq.

   La citation de la § 5 N'A PAS bougé : elle est calée sur les 235
   signes de la référence, qui est longue à cet endroit-là aussi.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  alternates: { canonical: "/offres/sur-mesure" },
  title: "Sur mesure | Omega.AI",
  description:
    "Il vous manque un module ? Omega.AI le construit, l'ajoute à votre ERP ou le branche sur vos outils. Ce qu'il fait et son prix sont écrits avant de commencer.",
};

/* La fiche garde la structure `Fiche` du catalogue, champ pour champ :
   c'est ce qui permet de la reporter dans FICHES le jour où le sur-mesure
   deviendrait un paquet, et de comparer ses textes à ceux des autres.
   Aucun texte de Teo n'a bougé depuis le 07/08. */
const FICHE: Fiche = {
  pitch: "Ce que le catalogue ne couvre pas, nous le concevons avec vous.",

  sections: {
    pointsTitre: "Ce que couvre le sur-mesure.",
    pointsChapo:
      "Une tâche interne, une application, un pont entre deux outils. Le rôle du module et son prix sont écrits avant de commencer.",
    detailChapo:
      "Ce que nous cadrons avant d'écrire une ligne, ce que nous construisons, et ce qui reste sous votre décision.",
    cibleChapo:
      "Aucune entreprise n'est exclue : un système sur mesure se justifie dès qu'une tâche se répète selon des règles qui peuvent s'écrire.",
    faqChapo: "Les questions qu'une direction pose avant de lancer un projet sur mesure.",
  },

  fonctionnement: [
    "L'ERP Omega couvre la gestion courante, et ses quatre agents traitent les processus que presque toutes les entreprises partagent : encaissements, réactivation commerciale, demandes entrantes, factures fournisseurs. Le sur-mesure commence là où votre processus le plus coûteux vous est propre, et où aucun produit standard ne le traite sans le déformer.",
    "Une application complète avec ses écrans et ses données, un pont entre deux outils, un contrôle que personne n'a le temps de faire, la lecture de documents, un tableau de bord à jour en continu, un assistant qui répond sur vos procédures. Si la tâche se fait à la main et suit des règles écrites, nous construisons le module qui la prend en charge.",
    "Nous partons de votre processus réel. Nous écrivons les règles avec vous, fixons ce qui s'exécute seul et ce qui attend votre validation, puis le module rejoint votre ERP ou se branche sur vos outils. Un périmètre restreint d'abord, mesuré, puis élargi.",
  ],

  points: [
    "Applications sur mesure : une application avec son interface, sa base et ses droits, quand aucun outil du marché ne suit le fonctionnement de vos services",
    "Ponts entre outils : deux logiciels qui ne communiquent pas, une double saisie quotidienne ou un export repris à la main chaque semaine",
    "Traitement de documents : lecture, contrôle, extraction et classement de pièces reçues dans n'importe quel format",
    "Contrôles et calculs répétitifs : vérifications de cohérence, alertes sur seuils, états produits à date fixe sans intervention de vos équipes",
  ],

  controle:
    "L'autonomie se décide règle par règle : ce qui s'exécute seul, ce qui attend une validation, ce qui ne part jamais sans votre accord.",

  /* Le sur-mesure ne se branche pas sur une liste fermée : ces quatre
     entrées sont les FAMILLES d'outils les plus fréquentes, pas une
     limite. */
  outils: [
    "Vos outils actuels",
    "Google Sheets / Excel",
    "Gmail / Outlook",
    "Bases de données",
  ],

  cible: [
    "Sociétés de 5 à 50 personnes",
    "Sociétés de 50 à 500 personnes",
    "Groupes multi-sociétés",
    "Sièges et filiales",
    "Réseaux et franchises",
    "Associations",
  ],

  etapes: [
    {
      t: "Cadrage du besoin",
      d: "Nous décrivons le processus tel qu'il se déroule aujourd'hui, à quels services il coûte du temps et où il se rompt. Rien n'est chiffré avant que ce soit clair pour vous comme pour nous.",
    },
    {
      t: "Conception et devis",
      d: "Périmètre, règles de gestion, points de validation et coût sont écrits avant de commencer, ce qui vous permet de savoir exactement ce que vous achetez et ce qui reste hors périmètre.",
    },
    {
      t: "Construction",
      d: "Le système est construit sur vos règles et intégré à vos outils. Vos équipes voient des versions intermédiaires, jamais un résultat final découvert à la livraison.",
    },
    {
      t: "Mise en service et suivi",
      d: "Le démarrage se fait sur un périmètre restreint, puis s'élargit une fois l'effet mesuré. Les règles s'ajustent sur les usages réels de vos équipes.",
    },
  ],

  /* Conservée bien que non rendue — voir « ce qui quitte la page ». */
  faq: [
    {
      q: "Y a-t-il des besoins que vous refusez ?",
      a: "Oui, deux cas. Ceux dont les règles ne peuvent pas s'écrire : si chaque situation demande un jugement humain, l'automatisation n'apporte rien de fiable. Et ceux dont le gain ne couvre pas le coût de construction : nous le disons au cadrage, avant tout devis.",
    },
    {
      q: "Notre fonctionnement est-il trop particulier ?",
      a: "La question porte moins sur votre activité que sur le processus. Une extraction de données depuis des documents fonctionne de la même façon dans une société de dix personnes et dans un groupe : seuls les règles et le vocabulaire changent, et c'est précisément ce que le cadrage écrit avec vos équipes.",
    },
    {
      q: "Quels sont les délais et le coût ?",
      a: "Ils dépendent entièrement du périmètre, et c'est la raison pour laquelle le cadrage précède le devis. Un pont entre deux outils se compte en jours, une application complète en semaines. Vous recevez un montant ferme et un périmètre écrit avant de vous engager.",
    },
    {
      q: "À qui appartient ce qui est construit ?",
      a: "Les données restent les vôtres dans tous les cas, comme pour les systèmes du catalogue : hébergement dans l'Union européenne, export et suppression sur demande. Les conditions de propriété et de reprise du système lui-même sont fixées au devis, avant la construction.",
    },
  ],

  demo: {
    type: "list",
    title: "Des besoins traités hors catalogue",
    items: [
      { text: "Double saisie entre l'outil de devis et la compta", badge: "Pont", tone: "ok" },
      { text: "Bons de livraison lus et contrôlés à réception", badge: "Documents", tone: "ok" },
      { text: "Suivi de parc avec alertes d'échéance", badge: "Logiciel", tone: "ok" },
      { text: "Tâche qui demande un jugement au cas par cas", badge: "Écarté", tone: "off" },
    ],
    footer:
      "Les trois suivent des règles qui s'écrivent. Une tâche qui demande un jugement au cas par cas reste chez vous. Nous vous le disons à l'audit.",
  },
};

/* ——— § 4 · le déroulé d'une exécution ————————————————————————————
   16/09, Teo : « remplace cette section par ce composant », en donnant
   l'AgentTrace de 21st.dev. Ce qu'il montre chez son auteur est une
   exécution d'agent de code ; ce qu'il montre ici est le seul déroulé
   qui intéresse un acheteur de sur-mesure : ce que le système fait tout
   seul, et l'endroit exact où il s'arrête pour attendre quelqu'un.

   Les dix étapes reprennent un traitement documentaire — la deuxième
   ligne de `FICHE.demo`, « bons de livraison lus et contrôlés à
   réception ». Elles racontent, dans l'ordre : on reçoit, on lit, on
   rapproche, un contrôle ÉCHOUE, la règle de tolérance tranche, le
   système s'arrête et demande un accord, l'accord arrive, il écrit chez
   le client, il journalise. Le rouge du contrôle et l'attente de
   validation sont le SUJET de la page, pas un accident de démonstration.

   ── CE QUE CE BLOC N'AFFICHE PAS, ET POURQUOI ───────────────────────
   • Pas de `model` dans la tête. Le composant d'origine y écrit le nom
     du modèle ; le site ne nomme jamais notre fournisseur (règle du
     parc). La tête ne porte que l'identifiant et le nombre d'étapes.
   • Pas de jetons. `showTokens` est à false : « 4 820 tk » est du
     vocabulaire de fournisseur de modèles, et ça ne dit rien à une
     direction. La colonne de droite affiche le résultat en clair.
   • Les durées sont un EXEMPLE, et la page le dit sous le bloc. Un
     graphique qui ne montre pas les données d'un vrai client se signale
     comme tel — c'est la règle du parc sur les chiffres.

   `autoPlay` est à false et la tête de lecture part à 62 % : au
   chargement le bloc montre une exécution déjà avancée, contrôle en
   échec compris, plutôt qu'une grille d'étapes grises. Le bouton
   lecture la rejoue depuis le début. */
const TRACE: TraceSpan[] = [
  { id: "reception", label: "reception.piece", kind: "io", start: 0, end: 420, detail: "1 bon de livraison" },
  { id: "lecture", label: "lecture.champs", kind: "tool", start: 460, end: 1980, detail: "18 champs" },
  { id: "rapproche", label: "rapprochement.commande", kind: "tool", start: 2020, end: 2940, detail: "commande trouvée" },
  { id: "controle", label: "controle.coherence", kind: "tool", start: 2980, end: 3820, status: "error", detail: "2 écarts" },
  { id: "tolerance", label: "regle.tolerance", kind: "tool", start: 3860, end: 4180, status: "cached", detail: "seuil connu" },
  { id: "attente", label: "attente.validation", kind: "agent", start: 4220, end: 7600, detail: "accord donné" },
  { id: "avis", label: "avis.responsable", kind: "io", parentId: "attente", start: 4260, end: 4620, detail: "1 destinataire" },
  { id: "reponse", label: "reponse.humaine", kind: "io", parentId: "attente", start: 7180, end: 7560, detail: "validé" },
  { id: "ecriture", label: "ecriture.outil-cible", kind: "io", start: 7640, end: 8720, detail: "3 lignes" },
  { id: "journal", label: "journal.ecriture", kind: "io", start: 8760, end: 9100, detail: "horodaté" },
];
const TRACE_TOTAL = 9100;

/* ——— § 8 · les six périmètres ———————————————————————————————————
   Les intitulés et le fond viennent de `FICHE.points` et de la liste de
   `fonctionnement[1]` (tableau de bord, assistant interne). Rien
   d'inventé — mais les textes sont RÉÉCRITS COURT, et c'est le sujet.

   16/09, Teo : « on a encore trop de texte par rapport à eux ». Relevé
   sur la référence, les six légendes de cette grille font 52, 105, 89,
   43, 85 et 51 signes — 71 en moyenne. Les nôtres en faisaient 129, 115,
   88, 108, 88 et 81, soit 101 : quarante pour cent de trop. Elles sont
   ramenées autour de 63, ce qui est le bon équivalent une fois compté
   que le français court 15 à 20 % plus long que l'anglais.

   La phrase complète de chaque périmètre reste dans `FICHE.points` : on
   coupe l'affichage, on ne perd pas le texte.

   Les pictogrammes sont DESSINÉS (components/surmesure/Panneaux.tsx) et
   non pris dans une bibliothèque : chacun montre la chose, comme ceux de
   la référence. Voir le commentaire en tête de la section 4 du fichier. */
const PERIMETRES = [
  {
    Icone: PictoApplication,
    titre: "Applications sur mesure",
    texte: "Un module avec ses écrans, ses données et ses droits.",
  },
  {
    Icone: PictoPont,
    titre: "Ponts entre outils",
    texte: "Deux logiciels qui ne se parlent pas, une double saisie quotidienne.",
  },
  {
    Icone: PictoPiece,
    titre: "Traitement de documents",
    texte: "Lecture, contrôle et classement des pièces, quel que soit le format.",
  },
  {
    Icone: PictoCadran,
    titre: "Contrôles répétitifs",
    texte: "Vérifications de cohérence, alertes sur seuils, états à date fixe.",
  },
  {
    Icone: PictoBord,
    titre: "Tableaux de bord",
    texte: "Un état alimenté en continu, à la place d'un fichier de fin de mois.",
  },
  {
    Icone: PictoAssistant,
    titre: "Assistants internes",
    texte: "Un assistant qui répond sur vos procédures, pas sur le web.",
  },
];

/* ——— § 9 · trois besoins traités, en études de cas ———————————————
   ⚠ CETTE SECTION A CHANGÉ TROIS FOIS LE 16/09. Elle portait d'abord
   trois vignettes à croquis ; elle est passée au bloc `case-studies` de
   21st.dev ; une autre session l'a ensuite remplacée par la pile de
   cartes `card-slide`. Teo, le soir : « remets celui qui était dans la
   version d'avant » — c'est-à-dire `case-studies`, celui qu'il avait
   demandé pour cette section précisément.

   `card-slide.tsx` reste au dépôt, orphelin, comme `hero-preview-walls`
   qui servait la section 10 : rien n'est perdu, et remettre l'un ou
   l'autre est un import et deux lignes. À trancher avec Teo — il y a
   maintenant DEUX composants de pile qui font la même chose.

   Les trois lignes sont les trois premières de `FICHE.demo` : celles
   dont les règles s'écrivent. La quatrième, celle qu'on écarte, ferme la
   section en une phrase plutôt que d'occuper une ligne.

   Les deux mesures de droite ne sont pas des chiffres de performance —
   la maison n'en invente pas. Ce sont des faits de conception, et chacun
   trace à une phrase déjà publiée : « un pont se compte en jours, un
   logiciel métier complet en semaines » vient de la FAQ de cette fiche. */
const EXEMPLES: Cas[] = [
  {
    id: "pont",
    visuel: <CroquisPont />,
    titre: FICHE.demo.type === "list" ? FICHE.demo.items[0].text : "",
    texte:
      "Deux logiciels qui ne se parlent pas : la donnée passe de l'un à l'autre sans que personne la retape.",
    legende: "Pont entre outils",
    sousLegende: "Règles et prix écrits avant de commencer",
    mesures: [
      { value: "2", label: "Outils reliés", sub: "La donnée n'est saisie qu'une fois" },
      { value: "Jours", label: "Ordre de grandeur", sub: "Le délai exact est écrit avant de commencer" },
    ],
  },
  {
    id: "documents",
    visuel: <CroquisDocument />,
    titre: FICHE.demo.type === "list" ? FICHE.demo.items[1].text : "",
    texte:
      "Les pièces sont lues, contrôlées et classées dès leur arrivée.",
    legende: "Traitement de documents",
    sousLegende: "Contrôle dès la réception",
    mesures: [
      { value: "0", label: "Ressaisie", sub: "Les informations extraites ne sont pas retapées" },
      { value: "Tel quel", label: "Format d'arrivée", sub: "La pièce est lue telle qu'elle arrive" },
    ],
  },
  {
    id: "logiciel",
    visuel: <CroquisSuivi />,
    titre: FICHE.demo.type === "list" ? FICHE.demo.items[2].text : "",
    texte:
      "Un module avec ses écrans, ses données et ses droits, ajouté à votre ERP Omega.",
    legende: "Application sur mesure",
    sousLegende: "Ajouté à votre ERP ou branché sur vos outils",
    mesures: [
      { value: "1", label: "Module", sub: "Écrans, données et droits" },
      { value: "Semaines", label: "Ordre de grandeur", sub: "Le délai exact est écrit avant de commencer" },
    ],
  },
];

/* Les quatre icônes du catalogue — les mêmes que sur /offres, pour qu'un
   paquet se reconnaisse d'une page à l'autre.

   Ce sont des ÉLÉMENTS déjà rendus, pas des composants : `feature-11` est
   un composant client, et lui passer la fonction casse le build au
   prérendu. Voir le commentaire de `Volet.icone`. */
const PICTOS: Record<string, React.ReactNode> = {
  CASHD: <Bell size={16} strokeWidth={1.75} />,
  OFFLOAD: <Users size={16} strokeWidth={1.75} />,
  REPUT: <MessageSquare size={16} strokeWidth={1.75} />,
  FILED: <FileText size={16} strokeWidth={1.75} />,
};

/* ——— § 10 · les quatre paquets du catalogue ——————————————————————
   Lus dans FAMILLES : si un paquet change de nom ou de slug, la page
   suit. La photo et le pitch viennent de la fiche du paquet — ce sont
   exactement ceux que porte sa propre page. */
const CATALOGUE = ["CASHD", "OFFLOAD", "REPUT", "FILED"];

/* ——— § 2 · les outils du client —————————————————————————————————
   TROIS, en mot-symbole noir, comme la référence (Meta / cohere / NTT en
   `brightness-0`). Trois décisions, chacune vérifiée en rendant les
   variantes côte à côte le 16/09 :

   • TROIS et pas cinq : c'est le compte de la référence, et cinq
     pastilles étirées sur 1280 px faisaient une rangée de vignettes, pas
     une ligne de confiance.
   • NOIR : la référence aplatit ses logos. Nos pastilles polychromes
     tiraient l'œil avant le titre.
   • MOT-SYMBOLE et pas pictogramme : aplati en noir, le logo Outlook
     devient un rectangle plein illisible et Drive un triangle. Un
     mot-symbole typographique tient la composition, se lit à toutes les
     largeurs, et n'engage rien — c'est aussi la règle du parc sur les
     marques de tiers.

   16/09, Teo, deux fois. D'abord « eux ils ont à côté des trucs, les
   logos aussi, que tu n'as pas mis chez nous » : le signe est revenu
   devant le mot. Puis « change ça avec des sociétés qui font plus pro,
   genre du monde de la tech » : Gmail, Outlook et Drive sont des outils
   grand public, ces trois-là parlent à une direction.

   LES TROIS SONT DE VRAIES INTÉGRATIONS, déclarées dans `OUTIL_INFOS`
   (lib/integrations.ts) avec ce que le système y fait — paiement, CRM,
   base de connaissance, trois mondes différents. On ne met pas dans ce
   bandeau un outil sur lequel on ne se branche pas, et c'est ce qui
   sépare cette rangée d'un mur de logos.

   ⚠ CE NE SONT PAS DES CLIENTS, et la phrase au-dessus est ce qui
   l'empêche de se lire ainsi. La référence titre la sienne « Trusted by
   the world's most ambitious AI teams » et aligne ses clients ; nous
   n'en avons pas à afficher et nous n'en inventons pas. La nôtre dit
   « se branche sur VOS outils ». Ne pas la retirer ni la raccourcir.

   Le signe vient de `simple-icons` et est peint en noir — le traitement
   de la référence, qui passe ses logos en `brightness-0`. Le détail des
   écarts est en tête de components/surmesure/Panneaux.tsx.

   Ces trois-là sont un échantillon, pas une liste fermée :
   /integrations porte les vingt-huit. */
const OUTILS = [
  { nom: "Stripe", Signe: SigneStripe },
  { nom: "HubSpot", Signe: SigneHubspot },
  { nom: "Notion", Signe: SigneNotion },
];

/* ══ la page ══════════════════════════════════════════════════════════ */

export default function SurMesurePage() {
  const catalogue = FAMILLES.flatMap((f) => f.moteurs)
    .filter((x) => CATALOGUE.includes(x.system))
    .sort((a, b) => CATALOGUE.indexOf(a.system) - CATALOGUE.indexOf(b.system))
    .map((x) => ({
      system: x.system,
      role: sansNomPaquet(x.title, x.system),
      href: `/offres/${x.slug}`,
      photo: FICHES[x.system]?.photo ?? "",
      photoAlt: FICHES[x.system]?.photoAlt ?? "",
      pitch: FICHES[x.system]?.pitch ?? "",
      job: x.job,
      benefit: x.benefit,
    }));

  /* § 10 — les quatre systèmes en onglets (`feature-11`).
     16/09, Teo : « remplace-le par ce composant-là, mais bien sûr les
     polices doivent être adaptées à celles qu'on utilise pour cette
     page. » C'est fait au niveau du composant : il arrive en classes
     `f11-*` nues, et c'est le bloc `.smd` qui les habille — il prend donc
     Geist, comme le reste de la page.

     Rien d'inventé : l'intitulé, le rôle, la phrase de résumé et le
     paragraphe du panneau sortent de la fiche de chaque paquet, ceux que
     porte sa propre page. Le panneau finit par le lien vers elle — un
     onglet n'est pas une porte, et quatre systèmes qui se présentent
     doivent pouvoir se visiter. */
  const volets: Volet[] = catalogue.map((p) => ({
    valeur: p.href.replace("/offres/", ""),
    icone: PICTOS[p.system],
    titre: nomPaquet(p.system),
    resume: fr(p.benefit),
    panneau: (
      <div className="f11-fiche">
        <p className="f11-fiche__role">{fr(p.role)}</p>
        <p className="f11-fiche__corps">{fr(p.job)}</p>
        <Link href={p.href} className="ch-lien">
          Voir {agentPaquet(p.system)}
        </Link>
      </div>
    ),
  }));

  return (
    <PageShell>
      {/* 25/11/2026 — la charte de l'accueil (docs/charte-accueil.md, § 4.2,
          ligne 6). La page passe dans <Cadre> ; chaque bloc du décalque
          devient une section jointive sous l'en-tête de section de
          l'accueil (pastille, h2 à gauche, chapô gris), et les étiquettes
          à chasse fixe deviennent les pastilles, mot pour mot.
          Ce qui part : PageMotion ; le hero qui se repliait au défilement
          (`HeroReplie`) et la révélation de la citation (`Revele`) — aucun
          mouvement lié au défilement dans la charte. La photo du bureau
          reste sous le h1, dans un cadre de rayon 12 ; la façade de
          l'appel passe à côté de la citation, dans le même cadre ; la
          plaque verte de la citation part avec son animation.
          Ce qui reste : la trace d'exécution, la nappe `HalftoneFlow`
          (WebGL) dans son cadre noir de rayon 12, le schéma du cycle dans
          une scène, les études de cas, les onglets des agents.
          `.smd` reste à la racine pour le dessin de ces pièces ; le dessin
          propre à la page : components/charte/pages/sur-mesure.css, sous
          `.charte .sm-page`. */}
      <Cadre>
        <div className="smd sm-page">
          {/* ════════ 1 · LE TITRE DE PAGE, puis la photo ════════
              16/09 — « Votre Module Sur Mesure » est le NOM du produit : il
              porte ses capitales, c'est le seul endroit de la page où on se
              le permet. La phrase est la seconde moitié du pitch de Teo,
              mot pour mot. La photo : le plateau de bureaux, l'endroit où
              vit le processus qu'on vient reprendre (crédits dans
              public/photos/CREDITS.txt). */}
          <Section>
            <EnTeteSection
              niveau={1}
              haut
              pastille="Sur mesure"
              titre="Votre Module Sur Mesure"
              chapo="Il vous manque un module ? Nous le construisons."
              actions={
                <Bouton href="/reserver-un-audit" icone="calendrier">
                  Parler de votre cas
                </Bouton>
              }
            />
            <div className="sm-cellule">
              <div className="sm-photo">
                <Image
                  src="/photos/tarifs-installation-bureau.jpg"
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 1280px) 1260px, 100vw"
                  className="sm-photo__media"
                />
              </div>
            </div>
          </Section>

          {/* ════════ 2 · LES OUTILS DU CLIENT ════════
              ⚠ CE NE SONT PAS DES CLIENTS, et la phrase est ce qui
              l'empêche de se lire ainsi. Ne pas la retirer ni la raccourcir. */}
          <Section>
            <div className="sm-outils">
              <p className="sm-outils__phrase">
                <span>Il se branche sur vos outils.</span>{" "}
                <Link href="/integrations" className="ch-lien">
                  Voir nos intégrations
                  <span aria-hidden>→</span>
                </Link>
              </p>
              {/* la rangée se fait glisser au doigt sous 640 px (le cadre
                  `.smd-bandeau` défile, la rangée reste d'un seul tenant) */}
              <div className="smd-bandeau sm-outils__bandeau">
                <ul className="smd-bandeau__rangee sm-outils__rangee">
                  {OUTILS.map(({ nom, Signe }) => (
                    <li key={nom} className="smd-marque">
                      <Signe />
                      {nom}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          {/* ════════ 3 et 4 · APERÇU, puis une exécution étape par étape ════
              Le déroulé d'une exécution, qu'on peut rejouer à la main —
              voir `TRACE` plus haut pour ce qu'il montre et ce qu'il ne
              montre pas. Il a son propre fond blanc et son propre filet :
              il est posé dans une scène, comme un écran d'exemple. */}
          <Section>
            <EnTeteSection
              pastille="Aperçu"
              titre="Le module qui vous manque."
              chapo={fr(FICHE.sections?.pointsChapo ?? "")}
            />
            <div className="sm-cellule">
              <Scene trame basse className="sm-trace-scene">
                <AgentTrace
                  spans={TRACE}
                  duration={TRACE_TOTAL}
                  runId="traitement_4821"
                  defaultTime={TRACE_TOTAL * 0.62}
                  autoPlay={false}
                  loop
                  showTokens={false}
                  labelWidth={208}
                />
              </Scene>
              <p className="sm-note">
                Exemple de déroulé, sur des durées réalistes. Les étapes et leur
                enchaînement sont ceux d’un module en service&nbsp;; les valeurs ne
                sont pas celles d’un client.
              </p>
            </div>
          </Section>

          {/* ════════ 5 · LE PARI ════════
              L'emplacement de leur citation signée : personne n'est cité,
              la page porte sa propre position. La citation est celle de
              `FICHE.fonctionnement[0]`, MOT POUR MOT. À côté, la façade de
              verre qui fermait la page. */}
          <Section>
            <div className="sm-citation">
              <div className="sm-citation__texte">
                <Pastille>Ce que le logiciel ne couvre pas</Pastille>
                <p className="sm-citation__phrase">
                  «&nbsp;Le sur-mesure commence là où l&apos;ERP s&apos;arrête&nbsp;: quand la tâche qui vous coûte le plus est propre à votre entreprise, et qu&apos;aucun produit standard ne la traite sans la déformer.&nbsp;»
                </p>
                <div className="sm-citation__signature">
                  <span className="sm-citation__nom">Omega.AI</span>
                  <Pastille>Audit avant devis</Pastille>
                </div>
              </div>
              <div className="sm-citation__photo" data-gutter-guide="top">
                <div className="sm-photo sm-photo--cellule">
                  <Image
                    src="/photos/tarifs-abonnement-facade.jpg"
                    alt=""
                    fill
                    loading="lazy"
                    sizes="(min-width: 1001px) 45vw, 100vw"
                    className="sm-photo__media"
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* ════════ 6 · RÈGLE PAR RÈGLE ════════
              La nappe de points animée (`HalftoneFlow`, WebGL) reste, dans
              son cadre noir de rayon 12 : c'est le visuel du bloc. Ses
              couleurs descendent du vert de l'ancienne citation. */}
          <Section>
            <div className="sm-regle">
              <div className="sm-regle__texte">
                <Pastille>Autonomie</Pastille>
                <h2 className="sm-regle__phrase">{fr(FICHE.controle ?? "")}</h2>
              </div>
              <div className="sm-regle__visuel" data-gutter-guide="top">
                <div className="smd-nappe sm-nappe">
                  <HalftoneFlow className="smd-nappe__toile" />
                </div>
              </div>
            </div>
          </Section>

          {/* ════════ 7 · CE QUE VOUS OBTENEZ ════════
              Le SCHÉMA EN BOUCLE (components/surmesure/Cycle.tsx), dans une
              scène. `Ajuste` le rend à sa largeur naturelle (1408) puis le
              RÉDUIT pour tenir : la mise en page n'a pas de palier. */}
          <Section>
            <EnTeteSection
              pastille="Ce que vous obtenez"
              titre="Un module de plus, dans le même ERP."
              chapo={fr(
                "Il s'ajoute à côté des autres. Même validation, même journal, mêmes droits par service."
              )}
            />
            <div className="sm-cellule">
              <div className="ch-scene sm-schema">
                <Ajuste largeur={1408}>
                  <Cycle />
                </Ajuste>
              </div>
            </div>
          </Section>

          {/* ════════ 8 · LES SIX PÉRIMÈTRES, en cellules jointives ════════ */}
          <Section>
            <EnTeteSection
              pastille="Usages"
              titre="Ce que couvre le sur-mesure."
              chapo="Une tâche qui suit des règles claires ? Nous construisons le module qui la fait."
            />
            <GrilleCartes colonnes={3}>
              {PERIMETRES.map(({ Icone, titre, texte }) => (
                <div key={titre} className="ch-carte sm-fonction">
                  <div className="ch-carte-texte">
                    <figure className="sm-fonction__picto">
                      <Icone />
                    </figure>
                    <h3>{titre}</h3>
                    <p>{texte}</p>
                  </div>
                </div>
              ))}
            </GrilleCartes>
          </Section>

          {/* ════════ 9 · TROIS BESOINS TRAITÉS ════════ */}
          <Section>
            <EnTeteSection pastille="Exemples" titre="Trois modules sur mesure." />
            <div className="sm-cellule sm-exemples">
              <Casestudies cas={EXEMPLES} />
              <p className="sm-exemples__pied">
                {FICHE.demo.type === "list" ? fr(FICHE.demo.footer ?? "") : ""}
              </p>
            </div>
          </Section>

          {/* ════════ 10 · LE CATALOGUE ════════
              Les quatre pages produit en onglets (`feature-11`) : de la
              vraie navigation, pas une référence client. */}
          <Section>
            <EnTeteSection
              pastille="Les agents"
              titre="Les quatre agents de l'ERP."
              chapo={fr(
                "Relances, demandes clients, factures fournisseurs, clients inactifs : quatre agents s'en chargent."
              )}
            />
            <div className="sm-cellule sm-agents">
              <Feature11 volets={volets} />
            </div>
          </Section>

          {/* ════════ 11 · L'APPEL ════════ */}
          <Appel
            pastille="Audit"
            titre="Parler de votre cas."
            chapo={
              <>
                Trente minutes sur votre façon de travailler. Le module et son prix sont écrits avant de commencer.
              </>
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
