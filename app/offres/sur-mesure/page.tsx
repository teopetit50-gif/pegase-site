import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import { AgentTrace, type TraceSpan } from "@/components/ui/agent-trace";
import { HalftoneFlow } from "@/components/ui/halftone-flow";
import HeroReplie from "@/components/surmesure/HeroReplie";
import {
  SigneHubspot,
  SigneNotion,
  SigneStripe,
  CroquisDocument,
  CroquisPont,
  CroquisSuivi,
} from "@/components/surmesure/Panneaux";
import { FAMILLES } from "@/lib/content";
import { fr } from "@/lib/typo";
import { FICHES } from "@/lib/fiches";
import type { Fiche } from "@/lib/fiches";
import {
  AppWindow,
  ArrowLeftRight,
  CalendarCheck,
  FileSearch,
  LayoutDashboard,
  MessagesSquare,
} from "lucide-react";
import "./sur-mesure.css";

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
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  alternates: { canonical: "/offres/sur-mesure" },
  title: "Sur mesure | Omega.AI",
  description:
    "Quand aucun des quatre systèmes ne couvre le besoin, Omega.AI conçoit celui qui manque : cadré, chiffré, puis construit sur vos règles et intégré à votre environnement.",
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
      "Un processus interne, un logiciel métier, un pont entre deux outils ou un contrôle répétitif : le périmètre se définit avec vos équipes, puis s'écrit avant tout chiffrage.",
    detailChapo:
      "Ce que nous cadrons avant d'écrire une ligne, ce que nous construisons, et ce qui reste sous votre décision.",
    cibleChapo:
      "Aucun secteur n'est exclu : un système sur mesure se justifie dès qu'une tâche se répète selon des règles qui peuvent s'écrire, quel que soit le métier.",
    faqChapo: "Les questions qu'une direction pose avant de lancer un projet sur mesure.",
  },

  fonctionnement: [
    "Le catalogue Omega.AI couvre quatre processus présents dans presque toutes les organisations : les encaissements, la réactivation commerciale, les demandes entrantes et les flux documentaires. Ils se déploient vite parce que le besoin est le même partout. Le sur-mesure commence là où cette hypothèse s'arrête : quand le processus qui coûte le plus cher est propre à votre métier, à votre organisation ou à votre système d'information, et qu'aucun produit sur étagère ne le traite sans le déformer.",
    "Le périmètre n'est pas limité à l'automatisation de messages. Un système sur mesure peut être un logiciel métier complet avec son interface et sa base de données, un pont entre deux outils qui ne communiquent pas, un calcul ou un contrôle répété que personne n'a le temps de faire, une extraction de données depuis des documents, un tableau de bord alimenté en continu, ou un assistant interne qui répond sur vos propres procédures. Si la tâche s'exécute aujourd'hui à la main et suit des règles qu'on peut écrire, elle peut être reprise.",
    "La méthode ne change pas de celle des quatre systèmes : on part de votre processus réel, pas d'un modèle. On écrit les règles avec vous, on définit ce qui s'exécute seul et ce qui attend votre validation, et on branche le résultat sur les outils que vous utilisez déjà plutôt que d'en imposer de nouveaux. La mise en production est progressive : un périmètre restreint d'abord, mesuré, puis élargi une fois qu'il tient.",
  ],

  points: [
    "Logiciels métier : une application avec son interface, sa base et ses droits, quand aucun outil du marché ne suit le fonctionnement de vos services",
    "Ponts entre outils : deux logiciels qui ne communiquent pas, une double saisie quotidienne ou un export repris à la main chaque semaine",
    "Traitement de documents : lecture, contrôle, extraction et classement de pièces reçues dans n'importe quel format",
    "Contrôles et calculs répétitifs : vérifications de cohérence, alertes sur seuils, états produits à date fixe sans intervention de vos équipes",
  ],

  controle:
    "Le niveau d'autonomie se décide règle par règle, avec vous : ce qui s'exécute seul, ce qui attend une validation, et ce qui ne part jamais sans un accord explicite. Rien n'est figé, puisqu'un réglage se modifie en cours d'exploitation.",

  /* Le sur-mesure ne se branche pas sur une liste fermée : ces quatre
     entrées sont les FAMILLES d'outils les plus fréquentes, pas une
     limite. */
  outils: [
    "Vos outils métier",
    "Google Sheets / Excel",
    "Gmail / Outlook",
    "Bases de données",
  ],

  cible: [
    "Industrie & production",
    "Santé & professions libérales",
    "Transport & logistique",
    "Immobilier & gestion",
    "Cabinets & conseil",
    "Commerce & distribution",
    "BTP & travaux publics",
    "Associations & secteur public",
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
      q: "Travaillez-vous dans mon secteur ?",
      a: "La question porte moins sur le secteur que sur le processus. Une extraction de données depuis des documents fonctionne de la même façon chez un transporteur et dans un groupe de distribution : seuls les règles métier et le vocabulaire changent, et c'est précisément ce que le cadrage écrit avec vos équipes.",
    },
    {
      q: "Quels sont les délais et le coût ?",
      a: "Ils dépendent entièrement du périmètre, et c'est la raison pour laquelle le cadrage précède le devis. Un pont entre deux outils se compte en jours, un logiciel métier complet en semaines. Vous recevez un montant ferme et un périmètre écrit avant de vous engager.",
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
      "Les trois premiers suivent des règles qui s'écrivent. Le quatrième demande un jugement au cas par cas : il reste chez vous, et nous le disons au cadrage.",
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
  { id: "ecriture", label: "ecriture.outil-metier", kind: "io", start: 7640, end: 8720, detail: "3 lignes" },
  { id: "journal", label: "journal.ecriture", kind: "io", start: 8760, end: 9100, detail: "horodaté" },
];
const TRACE_TOTAL = 9100;

/* ——— § 8 · les six périmètres ———————————————————————————————————
   Les quatre premiers sont `FICHE.points`, coupés au premier deux-points
   (intitulé / développement). Les deux derniers sont les deux périmètres
   que `fonctionnement[1]` cite sans que la liste les reprenne : le
   tableau de bord et l'assistant interne. Rien d'inventé.

   LA COUPE EST TOLÉRANTE À L'ESPACE. Le deuxième périmètre porte
   l'INSÉCABLE devant son deux-points, comme le veut la typographie
   française : une coupe sur `" : "` ne trouvait rien et affichait la
   phrase entière en gras. `\s` couvre U+00A0 et U+202F en JavaScript. */
const ICONES_PERIMETRE = [AppWindow, ArrowLeftRight, FileSearch, CalendarCheck];

const PERIMETRES = [
  ...FICHE.points.map((pt, i) => {
    const coupe = pt.match(/^(.*?)\s*:\s*(.*)$/);
    const titre = coupe ? coupe[1] : pt;
    const suite = coupe ? coupe[2] : "";
    return {
      Icone: ICONES_PERIMETRE[i],
      titre,
      /* la suite d'un deux-points est en minuscule dans la fiche ; seule,
         elle redevient une phrase */
      texte: suite ? suite.charAt(0).toUpperCase() + suite.slice(1) + "." : "",
    };
  }),
  {
    Icone: LayoutDashboard,
    titre: "Tableaux de bord",
    texte:
      "Un état alimenté en continu, à la place d'un fichier consolidé à la main en fin de mois.",
  },
  {
    Icone: MessagesSquare,
    titre: "Assistants internes",
    texte: "Un assistant qui répond à vos équipes sur vos propres procédures, pas sur le web.",
  },
];

/* ——— § 9 · trois besoins traités, un croquis chacun ——————————————
   Les trois premières lignes de `FICHE.demo` — celles dont les règles
   s'écrivent. La quatrième, celle qu'on écarte, ferme la section en une
   phrase plutôt que d'occuper une vignette. */
const EXEMPLES = [
  { nature: "Pont entre outils", titre: FICHE.demo.type === "list" ? FICHE.demo.items[0].text : "", Croquis: CroquisPont },
  { nature: "Traitement de documents", titre: FICHE.demo.type === "list" ? FICHE.demo.items[1].text : "", Croquis: CroquisDocument },
  { nature: "Logiciel métier", titre: FICHE.demo.type === "list" ? FICHE.demo.items[2].text : "", Croquis: CroquisSuivi },
];

/* ——— § 10 · les quatre paquets du catalogue ——————————————————————
   Lus dans FAMILLES : si un paquet change de nom ou de slug, la page
   suit. La photo et le pitch viennent de la fiche du paquet — ce sont
   exactement ceux que porte sa propre page. */
const CATALOGUE = ["CASHD", "RELOAD", "FRONTD", "FILED"];

/* « CASHD · encaissements » → « encaissements ». Le séparateur du
   catalogue est le point médian ; les autres formes sont acceptées parce
   que FAMILLES en a porté plusieurs. */
const sansNom = (titre: string, nom: string) =>
  titre.startsWith(nom) ? titre.slice(nom.length).replace(/^[\s·:–—-]+/, "") : titre;

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

/* ══ les deux pièces de balisage répétées ═════════════════════════════ */

function Fleche() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5 12h14m0 0-6-6m6 6-6 6" />
    </svg>
  );
}

/* Le bouton de la référence : un voile `currentColor` traverse le fond,
   la flèche défile dans sa pastille. Les deux exemplaires de la flèche
   sont ce qui donne le défilement — ne pas en retirer un. */
function Bouton({
  href,
  children,
  noir = false,
}: {
  href: string;
  children: React.ReactNode;
  noir?: boolean;
}) {
  return (
    <Link href={href} className={`smd-cta${noir ? " smd-cta--noir" : ""}`}>
      <span aria-hidden className="smd-cta__voile" />
      <span className="smd-cta__lbl">
        {children}
        <span aria-hidden className="smd-pastille">
          <span className="smd-pastille__rail">
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

function Entete({
  etiquette,
  titre,
  chapo,
}: {
  etiquette: string;
  titre: string;
  chapo?: string;
}) {
  return (
    <div className="smd-entete">
      <p data-reveal className="smd-etiquette">
        {etiquette}
      </p>
      <h2 data-reveal className="smd-h2">
        {titre}
      </h2>
      {chapo && (
        <p data-reveal className="smd-chapo">
          {chapo}
        </p>
      )}
    </div>
  );
}

/* ══ la page ══════════════════════════════════════════════════════════ */

export default function SurMesurePage() {
  const catalogue = FAMILLES.flatMap((f) => f.moteurs)
    .filter((x) => CATALOGUE.includes(x.system))
    .sort((a, b) => CATALOGUE.indexOf(a.system) - CATALOGUE.indexOf(b.system))
    .map((x) => ({
      system: x.system,
      role: sansNom(x.title, x.system),
      href: `/offres/${x.slug}`,
      photo: FICHES[x.system]?.photo ?? "",
      photoAlt: FICHES[x.system]?.photoAlt ?? "",
    }));

  return (
    <PageShell>
      <PageMotion />
      <div className="smd">
        {/* ════════ 1 · HERO PLEINE IMAGE ════════
            16/09, Teo, capture contre capture : « notre titre n'est pas
            assez long comme eux, je veux la même longueur, la même police
            et les mêmes majuscules ; la phrase en dessous est trop longue,
            la leur est plus courte ; et change l'image de fond. »

            LE TITRE. Leur « Generative AI Data Engine » fait 25 signes et
            quatre mots, en capitales de titre. « Sur mesure » en faisait
            dix. « Système Métier Sur Mesure » fait 25 signes, quatre mots.
            Les capitales sur « Sur » et « Mesure » ne sont PAS la
            typographie française — c'est voulu, et c'est le seul endroit
            de la page où on se le permet : chez eux comme ici, ce titre
            n'est pas une phrase, c'est le NOM du produit, et un nom de
            produit porte ses capitales. Le reste de la page garde la
            règle française (« Le système qui n'existe pas encore. »).

            LA PHRASE. Leur « Powering the Next Frontier of AI. » fait 33
            signes. Le pitch de la fiche en fait 63 et tenait sur deux
            lignes là où la leur en tient une. Coupé à 32 — c'est la
            seconde moitié du pitch de Teo, mot pour mot ; la première
            moitié est déjà le titre de l'aperçu, 900 px plus bas.

            L'IMAGE. L'atrium partait de /tarifs et ne disait rien du
            sur-mesure. Le plateau de bureaux dit l'endroit où vit le
            processus qu'on vient reprendre — et la page parle à des
            directions, pas à un atelier. Crédits dans
            public/photos/CREDITS.txt. */}
        {/* `HeroReplie` : en haut de page l'image est pleine, au premier
            défilement elle rentre dans son cadre. La scène garde une
            hauteur fixe dans le flux — voir le bloc « le hero qui se
            replie » de sur-mesure.css pour la raison. Le cadre perd son
            `padding-inline`, c'est la scène qui le porte désormais. */}
        <div className="smd-cadre--hero">
          <HeroReplie>
          <section className="smd-plein">
            <Image
              src="/photos/tarifs-installation-bureau.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div aria-hidden className="smd-voile smd-voile--clair" />
            <div className="smd-plein__texte">
              <h1 data-arrivee className="smd-h1">
                Système Métier Sur Mesure
              </h1>
              <p data-arrivee className="smd-lead">
                Nous concevons celui qui manque.
              </p>
              <div data-arrivee>
                <Bouton href="/reserver-un-audit">Parler de votre cas</Bouton>
              </div>
            </div>
          </section>
          </HeroReplie>
        </div>

        {/* ════════ 2 · LES OUTILS DU CLIENT ════════
            L'emplacement de leur bandeau « Trusted by » — écart nº 1. */}
        <section className="smd-sec">
          <div className="smd-wrap">
            {/* UNE SEULE LIGNE, comme la référence. Leur phrase fait 46
                signes (« Trusted by the world’s most ambitious AI teams. »)
                et tient avec son lien dans les 698 px de la colonne. La
                nôtre en faisait 78 et passait à deux lignes : c'est le
                budget de texte qui se relève, pas la largeur qui
                s'élargit. */}
            <p data-reveal className="smd-chapo mx-auto mb-12 max-w-[698px] !text-base !text-black/70 text-center">
              <span className="mr-2">Un système sur mesure se branche sur vos outils.</span>
              <Link href="/integrations" className="smd-lien !text-base">
                Voir nos intégrations
                <span aria-hidden>→</span>
              </Link>
            </p>
            {/* la rangée de la référence est dans leur `.container` : 720 à
                768, 976 à 1024, 1280 au-delà. Notre colonne rend les deux
                premiers d'elle-même, le plafond de 1280 pose le troisième. */}
            <ul
              data-reveal
              className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-14 gap-y-6 sm:justify-around"
            >
              {OUTILS.map(({ nom, Signe }) => (
                <li key={nom} className="smd-marque">
                  <Signe />
                  {nom}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ════════ 3 · APERÇU ════════ */}
        <section className="smd-sec">
          <div className="smd-wrap">
            <Entete
              etiquette="Aperçu"
              titre="Un système, pas un produit."
              chapo={fr(FICHE.sections?.pointsChapo ?? "")}
            />
          </div>
        </section>

        {/* ════════ 4 · UNE EXÉCUTION, ÉTAPE PAR ÉTAPE ════════
            L'emplacement de leur grand schéma. Depuis le 16/09 il porte
            le déroulé d'une exécution, qu'on peut rejouer à la main —
            voir `TRACE` plus haut pour ce qu'il montre et ce qu'il ne
            montre pas. Le composant est enveloppé dans le même cadre que
            les autres pièces, mais SANS `smd-panneau` : il a son propre
            fond blanc et son propre filet. */}
        <section className="smd-sec">
          <div className="smd-wrap">
            <div data-reveal>
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
              <p className="smd-body mt-4 !text-[0.8125rem]">
                Exemple de déroulé, sur des durées réalistes. Les étapes et leur
                enchaînement sont ceux d’un système en service&nbsp;; les valeurs ne
                sont pas celles d’un client.
              </p>
            </div>
          </div>
        </section>

        {/* ════════ 5 · LE PARI ════════
            L'emplacement de leur citation signée — écart nº 2 : personne
            n'est cité, la page porte sa propre position. */}
        <section className="smd-sec">
          {/* `smd-large` et NON `smd-wrap` : sur la référence cette carte
              sort de la colonne de 1472 et suit la vue jusqu'à 1888 —
              voir le relevé en tête de sur-mesure.css. */}
          <div className="smd-large">
            <div data-reveal className="smd-citation">
              <div className="flex flex-col gap-10 lg:grid lg:grid-cols-12 lg:gap-8">
                <p className="smd-citation__label lg:col-span-3 lg:self-end">
                  Ce que le catalogue{"\n"}ne couvre pas
                </p>
                <div className="flex flex-col justify-between gap-12 lg:col-span-8 lg:col-start-5">
                  <p className="smd-citation__texte">
                    «&nbsp;Le sur-mesure commence là où l&apos;hypothèse du catalogue
                    s&apos;arrête&nbsp;: quand le processus qui coûte le plus cher est propre à
                    votre métier, et qu&apos;aucun produit sur étagère ne le traite sans le
                    déformer.&nbsp;»
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-4 lg:justify-end lg:gap-6">
                    <p className="smd-citation__nom">Omega.AI</p>
                    <span className="smd-citation__jeton">Cadrage avant devis</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════ 6 · RÈGLE PAR RÈGLE ════════ */}
        <section className="smd-sec">
          <div className="smd-wrap">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16">
              <h3 data-reveal className="smd-h3">
                {fr(FICHE.controle ?? "")}
              </h3>
              {/* 16/09, Teo : « remplace le truc noir du modèle de base
                  par ce composant ». La référence pose ici une carte NOIRE
                  avec un rendu abstrait coloré — un de leurs actifs. À sa
                  place, la nappe de points animée : même cadre, même noir,
                  même rapport de forme, et rien d'emprunté.

                  Les couleurs ne sont pas celles du composant d'origine
                  (rouge et orange) : elles descendent du vert de la
                  citation, pour que le bloc appartienne à la page. Trois
                  triplets à changer si Teo veut une autre teinte.

                  Ce panneau remplace la carte « Niveau d'autonomie »
                  (`PanneauReglages`, désormais orpheline dans
                  Panneaux.tsx). Rien ne se perd : ses trois niveaux
                  RÉPÉTAIENT la phrase de gauche, qui les énumère déjà. */}
              <div data-reveal className="smd-nappe">
                <HalftoneFlow className="smd-nappe__toile" />
              </div>
            </div>
          </div>
        </section>

        {/* ════════ 7 · L'ESPACE CLIENT ════════
            Leur deuxième grande capture produit. La nôtre est réelle :
            l'espace client Omega, alimenté par le jeu de démonstration
            écrit en dur dans le dépôt du cockpit — aucune donnée client.
            Voir app/page.tsx pour la route de prise de vue. */}
        <section className="smd-sec">
          <div className="smd-wrap">
            <Entete
              etiquette="Ce que vous obtenez"
              titre="Un système de plus, dans le même espace."
              chapo={fr(
                "Un système sur mesure se livre là où vivent déjà les autres : la même file de validation, le même journal de ce qui est parti, les mêmes droits par service. Vos équipes n'ouvrent pas un outil de plus."
              )}
            />
            <div data-reveal className="smd-panneau">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/fonds/tableau-de-bord.webp"
                alt="L'espace client Omega : la liste des débiteurs, leur état et l'encours échu au total — ici le module d'encaissements du catalogue."
                width={2160}
                height={1350}
              />
            </div>
          </div>
        </section>

        {/* ════════ 8 · LES SIX PÉRIMÈTRES ════════ */}
        <section className="smd-sec">
          <div className="smd-wrap">
            <Entete
              etiquette="Périmètres"
              titre="Ce que couvre le sur-mesure."
              chapo="Si la tâche s'exécute aujourd'hui à la main et suit des règles qu'on peut écrire, elle peut être reprise."
            />
            <div className="smd-fonctions">
              {PERIMETRES.map(({ Icone, titre, texte }) => (
                <div data-reveal key={titre} className="smd-fonction">
                  <figure>
                    <Icone strokeWidth={1.25} />
                  </figure>
                  <h4 className="smd-h4">{titre}</h4>
                  <p className="smd-body">{texte}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ 9 · TROIS BESOINS TRAITÉS ════════
            L'emplacement de leurs vidéos de démonstration — écart nº 3. */}
        <section className="smd-sec">
          <div className="smd-wrap">
            <Entete etiquette="Exemples" titre="Trois besoins traités hors catalogue." />
            <div className="smd-vignettes">
              {EXEMPLES.map(({ nature, titre, Croquis }) => (
                <div data-reveal key={nature}>
                  <div className="smd-vignette__cadre">
                    <Croquis />
                  </div>
                  <h4 className="smd-h4 mb-3 mt-2 !leading-[1.33]">{titre}</h4>
                  <p className="smd-body">{nature}</p>
                </div>
              ))}
            </div>
            <p data-reveal className="smd-body mt-10 max-w-[698px]">
              {FICHE.demo.type === "list" ? fr(FICHE.demo.footer ?? "") : ""}
            </p>
          </div>
        </section>

        {/* ════════ 10 · LE CATALOGUE ════════
            L'emplacement de leurs études de cas. Les nôtres sont les
            quatre pages produit : de la vraie navigation, pas une
            référence client. */}
        <section className="smd-sec">
          <div className="smd-wrap">
            <Entete
              etiquette="Le catalogue"
              titre="Les quatre systèmes déjà construits."
              chapo={fr(
                "Avant de concevoir celui qui manque, vérifiez qu'il n'existe pas : quatre processus sont présents dans presque toutes les organisations, et se déploient sans cadrage."
              )}
            />
            <div className="smd-ressources">
              {catalogue.map((p) => (
                <Link data-reveal key={p.system} href={p.href} className="smd-ressource block">
                  <div className="smd-ressource__cadre">
                    {p.photo && (
                      <Image
                        src={p.photo}
                        alt={p.photoAlt}
                        width={640}
                        height={402}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    )}
                  </div>
                  <div className="pt-6">
                    <p className="smd-ressource__cat">{p.role}</p>
                    <h4 className="smd-h4">{p.system}</h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ 11 · L'APPEL ════════ */}
        <div className="smd-cadre smd-cadre--appel">
          <section className="smd-plein">
            <Image
              src="/photos/tarifs-cloture-facade.jpg"
              alt=""
              fill
              loading="lazy"
              sizes="100vw"
              className="object-cover"
            />
            <div aria-hidden className="smd-voile" />
            <div className="smd-plein__texte">
              <h2 data-reveal className="smd-h1">
                Parler de votre cas.
              </h2>
              <p data-reveal className="smd-lead max-w-[42rem]">
                Trente minutes pour décrire le processus tel qu&apos;il se déroule
                aujourd&apos;hui. Rien n&apos;est chiffré avant que ce soit clair pour vous
                comme pour nous.
              </p>
              <div data-reveal>
                <Bouton href="/reserver-un-audit">Réserver un audit</Bouton>
              </div>
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
