import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import { SystemLogo } from "@/components/logos";
import { Chevron } from "@/components/offres/MediaMoteurs";
import {
  BandeauAutresMoteurs,
  CarteBlanche,
  DemoFiche,
  PastillesOutils,
} from "@/components/offres/MediaFiche";
import { FAMILLES } from "@/lib/content";
import { FICHES } from "@/lib/fiches";
import type { Fiche } from "@/lib/fiches";
import { NOMBRES } from "@/components/offres/gabarits/types";
import { GridFeatureCards, type CaseTrame } from "@/components/ui/grid-feature-cards";
import { FlowCards, type EtapeFlux } from "@/components/ui/flow-cards";
import { IntegrationsTiles } from "@/components/ui/integrations-tiles";
import { Marquee } from "@/components/ui/marquee";
import { Feature08, type CaseArpentee } from "@/components/ui/feature-08";
import { Faq06, TitreDeuxEncres } from "@/components/ui/faq-06";
import { CtaRectangle } from "@/components/ui/cta-rectangle";
import {
  AppWindow,
  ArrowLeftRight,
  Briefcase,
  Building2,
  CalendarCheck,
  Factory,
  FileSearch,
  HardHat,
  Landmark,
  ListChecks,
  ScrollText,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  Ticket,
  Truck,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════
   /offres/sur-mesure — 07/08/2026 (Teo), refondue le 14/09/2026

   ROUTE STATIQUE, PAS UN PAQUET. Elle rendait le gabarit « home » à
   l'identique (« exactement le même design que quand on clique sur la
   carte FILED ou CASHD »). Depuis le 11/09 les quatre pages produit ont
   leur propre design ; cette page était la dernière du catalogue à porter
   les cartes grises numérotées du gabarit.

   Pourquoi ici et pas dans FAMILLES / FICHES : le sur-mesure n'est pas un
   paquet catalogue. L'inscrire dans FAMILLES l'aurait propagé partout où
   la liste des paquets est lue (bandeau « les autres », grilles de
   /offres, sitemap) et cassé les copies qui comptent en toutes lettres
   (« quatre postes », grilles en quatre colonnes). Next donne priorité au
   segment statique : /offres/sur-mesure atterrit ici, jamais dans
   [system]. Elle n'est pas dans le sitemap tant qu'on ne l'y ajoute pas.

   ——— Passe du 14/09/2026 : la page quitte le gabarit ————————————————
   Teo, capture à l'appui : « des sections encore à l'ancienne ; récupère
   les composants sur 21st.dev et change les sections ». Le hero est
   gardé tel quel (c'est sa capture nº 1, il n'était pas en cause) ; tout
   ce qui suit est repris section par section, dans le monde sombre :

   | section                     | composant repris        | auteur         |
   |-----------------------------|-------------------------|----------------|
   | ce que couvre le sur-mesure | grid-feature-cards      | @efferd        |
   | comment un besoin devient   | bento-monochrome-1      | @larsen66      |
   |   un système (les étapes)   |   → flow-cards          |                |
   | sur vos outils              | integrations-4-2        | @efferd        |
   | pensé pour                  | marquee (Magic UI)      | @dillionverma  |
   | ce qui vient avec           | feature-08              | @hirael        |
   | questions directes          | faq-06                  | @hirael        |
   | l'appel final               | cta-with-rectangle      | @mikolajdobrucki|

   Chaque reprise vit dans components/ui/, réencrée à la charte, avec ses
   écarts documentés en tête de fichier.

   CE QUI DISPARAÎT, ET OÙ C'EST PASSÉ — aucun fait perdu :
   • Le bandeau « SUR MESURE se branche sur ce que vous tenez déjà » et la
     grille « Intégrations » (28 marques, deux fois) fusionnent dans
     « Sur vos outils » : huit marques en damier, le texte à gauche.
   • « Trois chaînes » (démo · garde-fous · outils) : la démo et le texte
     des garde-fous sont DÉJÀ dans le hero, à 900 px de là ; les outils
     sont la section d'à côté. C'était le même contenu une deuxième fois.
   • « Le détail » : `fonctionnement[1]` (la liste de ce qu'un système
     peut être) est ce que disent les quatre cases de « Ce que couvre » ;
     `fonctionnement[2]` (la méthode) est ce que racontent les quatre
     étapes, qui n'étaient affichées NULLE PART depuis le retrait des
     jalons le 26/07. Les deux paragraphes restent dans FICHE, prêts si on
     veut les remettre. La carte « Vous gardez la main » répétait mot
     pour mot celle du hero.
   • Le `BlocFaq` (grande carte grise, `<details>`) devient des cartes
     accordéon ; les quatre questions sont inchangées.
   • Le bandeau « les autres systèmes » est GARDÉ : c'est la navigation
     vers les quatre pages produit, et il défile déjà.

   Les textes de Teo n'ont pas bougé. Seuls trois intertitres sont
   nouveaux (« Comment un besoin devient un système. », « Quel que soit
   votre secteur. », « Parler de votre cas. ») — le dernier est l'appel de
   la famille, les deux autres remplacent des titres du gabarit qui
   parlaient d'un « moteur ».
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Sur mesure | Omega.AI",
  description:
    "Quand aucun des quatre systèmes ne correspond : on construit celui qui manque, sur vos règles et dans votre secteur.",
};

const TAG = "Sur mesure";
const SYSTEM = "SUR MESURE";
const ROLE = "le système qui n'existe pas encore";

/* La fiche garde la structure `Fiche` du catalogue, champ pour champ :
   c'est ce qui permet de la reporter dans FICHES le jour où le sur-mesure
   deviendrait un paquet, et de comparer ses textes à ceux des autres. */
const FICHE: Fiche = {
  pitch: "Ce qui n'existe pas encore, on le construit.",

  sections: {
    pointsTitre: "Ce que couvre le sur-mesure.",
    pointsChapo:
      "Un processus interne, un logiciel métier, un pont entre deux outils, un contrôle répétitif : le périmètre se définit avec vous, pas dans un catalogue.",
    detailChapo:
      "Ce qu'on cadre avant d'écrire une ligne, ce qu'on construit, et ce qui reste sous votre décision.",
    cibleChapo:
      "Aucun secteur n'est exclu. Ce qui compte n'est pas votre métier, c'est qu'une tâche s'y répète avec des règles qu'on peut écrire.",
    faqChapo: "Les questions posées avant de lancer un projet sur mesure.",
  },

  fonctionnement: [
    "Le catalogue Omega.AI couvre quatre postes qui reviennent dans presque toutes les entreprises : les impayés, les clients dormants, les demandes entrantes, la paperasse. Ils sont conçus pour être installés vite parce que le problème est le même partout. Le sur-mesure commence exactement là où cette hypothèse tombe : quand la tâche qui vous coûte le plus cher est propre à votre métier, à votre organisation ou à vos outils, et qu'aucun produit sur étagère ne la traite sans la déformer.",
    "Le périmètre n'est pas limité à l'automatisation de messages. Un système sur mesure peut être un logiciel métier complet avec son interface et sa base de données, un pont entre deux outils qui ne communiquent pas, un calcul ou un contrôle répété que personne n'a le temps de faire, une extraction de données depuis des documents, un tableau de bord alimenté en continu, ou un assistant interne qui répond sur vos propres procédures. Si la tâche s'exécute aujourd'hui à la main et suit des règles qu'on peut écrire, elle peut être reprise.",
    "La méthode ne change pas de celle des quatre systèmes : on part de votre processus réel, pas d'un modèle. On écrit les règles avec vous, on définit ce qui s'exécute seul et ce qui attend votre validation, et on branche le résultat sur les outils que vous utilisez déjà plutôt que d'en imposer de nouveaux. La mise en production est progressive : un périmètre restreint d'abord, mesuré, puis élargi une fois qu'il tient.",
  ],

  points: [
    "Logiciels métier : une application avec son interface, sa base et ses droits, quand aucun outil du marché ne suit votre façon de travailler",
    "Ponts entre outils : deux logiciels qui ne se parlent pas, une double saisie quotidienne, un export repris à la main chaque semaine",
    "Traitement de documents : lecture, contrôle, extraction et classement de pièces reçues dans n'importe quel format",
    "Contrôles et calculs répétitifs : vérifications de cohérence, alertes sur seuils, états produits à date fixe sans que personne n'ait à y penser",
  ],

  controle:
    "Le niveau d'autonomie se décide règle par règle, avec vous : ce qui s'exécute seul, ce qui attend une validation, et ce qui ne doit jamais partir sans un accord explicite. Rien n'est figé : un réglage se change en cours de route.",

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
      d: "On décrit le processus tel qu'il se déroule aujourd'hui, à qui il coûte du temps et où il casse. Rien n'est chiffré avant que ce soit clair pour vous comme pour nous.",
    },
    {
      t: "Conception et devis",
      d: "Périmètre, règles de gestion, points de validation et coût : tout est écrit avant de commencer. Vous savez ce que vous achetez, et ce qui est hors périmètre.",
    },
    {
      t: "Construction",
      d: "Le système est bâti sur vos règles et branché sur vos outils. Vous voyez des versions intermédiaires plutôt qu'un résultat final surprise.",
    },
    {
      t: "Mise en service et suivi",
      d: "Démarrage sur un périmètre restreint, mesure de ce que ça change, puis élargissement. Les règles s'ajustent sur vos usages réels.",
    },
  ],

  faq: [
    {
      q: "Y a-t-il des besoins que vous refusez ?",
      a: "Oui, deux cas. Ceux dont les règles ne peuvent pas s'écrire : s'il faut un jugement humain à chaque cas, l'automatisation n'apporte rien de fiable. Et ceux dont le gain ne couvre pas le coût de construction : si une tâche vous prend dix minutes par mois, on vous le dira plutôt que de vous vendre un projet.",
    },
    {
      q: "Est-ce que vous travaillez dans mon secteur ?",
      a: "La question n'est pas le secteur mais le processus. Une extraction de données depuis des documents fonctionne pareil chez un transporteur et dans un cabinet médical : ce sont les règles métier et le vocabulaire qui changent, et ils se recueillent au cadrage. Aucun secteur n'est écarté par principe.",
    },
    {
      q: "Combien de temps et combien ça coûte ?",
      a: "Cela dépend entièrement du périmètre, et c'est pour cette raison que le cadrage précède le devis. Un pont entre deux outils se compte en jours ; un logiciel métier complet en semaines. Vous recevez un montant ferme et un périmètre écrit avant tout engagement.",
    },
    {
      q: "À qui appartient ce qui est construit ?",
      a: "Les données restent les vôtres dans tous les cas, comme pour les systèmes du catalogue : hébergement dans l'Union européenne, export et suppression sur demande. Les conditions de propriété et de reprise du système lui-même sont écrites dans le devis, avant signature.",
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
      "Les trois premiers suivent des règles qu'on peut écrire. Le quatrième non : il reste chez vous, et on vous le dit au cadrage.",
  },
};

/* ——— ce que couvre : « Intitulé : développement » → deux champs ———
   La fiche écrit chaque périmètre en une phrase dont le premier
   deux-points sépare l'intitulé du développement. On coupe là, on ne
   réécrit pas. */
const ICONES_PERIMETRE = [
  <AppWindow key="a" strokeWidth={1.25} />,
  <ArrowLeftRight key="b" strokeWidth={1.25} />,
  <FileSearch key="c" strokeWidth={1.25} />,
  <CalendarCheck key="d" strokeWidth={1.25} />,
];
const PERIMETRES: CaseTrame[] = FICHE.points.map((pt, i) => {
  const [titre, ...reste] = pt.split(" : ");
  const texte = reste.join(" : ");
  /* la suite d'un deux-points est en minuscule dans la fiche ; seule, elle
     redevient une phrase */
  return { icone: ICONES_PERIMETRE[i], titre, texte: texte.charAt(0).toUpperCase() + texte.slice(1) };
});

/* ——— les étapes : rang, phase, pictogramme ———
   Les quatre variantes de pictogramme suivent le sens de chaque étape :
   l'aiguille qui balaie (on regarde), le relais (on écrit et on passe),
   l'onde (on construit), les anneaux qui s'élargissent (on démarre petit
   et on étend). */
const PHASES = ["Cadrage", "Devis", "Construction", "Mise en service"] as const;
const VARIANTES = ["orbit", "relay", "wave", "spark"] as const;
const ETAPES: EtapeFlux[] = FICHE.etapes.map((e, i) => ({
  rang: String(i + 1).padStart(2, "0"),
  meta: `Étape ${i + 1} · ${PHASES[i]}`,
  titre: e.t,
  texte: e.d,
  variante: VARIANTES[i],
}));

/* ——— pensé pour : une icône par secteur, dans l'ordre de la fiche ——— */
const ICONES_SECTEUR = [Factory, Stethoscope, Truck, Building2, Briefcase, ShoppingBag, HardHat, Landmark];

/* ——— ce qui vient avec : les quatre garanties du gabarit, inchangées ——— */
const COMPRIS: CaseArpentee[] = [
  {
    icone: <ListChecks strokeWidth={1.5} />,
    titre: "Une file de validation",
    texte:
      "Tout ce qui doit partir y passe. Vous approuvez, corrigez ou suspendez, aussi longtemps que vous le jugez utile.",
  },
  {
    icone: <ScrollText strokeWidth={1.5} />,
    titre: "Un journal de tout ce qui est parti",
    texte:
      "Chaque envoi est daté, archivé, consultable. Le jour où un client conteste avoir été relancé, la preuve est là.",
  },
  {
    icone: <ShieldCheck strokeWidth={1.5} />,
    titre: "Vos données restent chez vous",
    texte:
      "Un espace chiffré et distinct pour chaque client, hébergé dans l'Union européenne. Seul le strict nécessaire est transmis aux modèles, tâche par tâche.",
  },
  {
    icone: <Ticket strokeWidth={1.5} />,
    titre: "Le Chèque TIC vérifié",
    texte:
      "Pour les entreprises guadeloupéennes éligibles, une partie de l'installation est financée. L'éligibilité est vérifiée pendant l'audit, avant tout engagement de votre part.",
  },
];

/* Les quatre paquets du catalogue alimentent le bandeau « les autres ».
   Lus dans FAMILLES : si un paquet change de nom ou de slug, la page suit. */
const CATALOGUE = ["CASHD", "RELOAD", "FRONTD", "FILED"];

const sansNom = (titre: string, nom: string) =>
  titre.startsWith(nom) ? titre.slice(nom.length).replace(/^\s*[ : –-]\s*/, "") : titre;

function EnTete({ pastille, titre, chapo }: { pastille: string; titre: string; chapo: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div data-reveal>
        <span className="o-pill">{pastille}</span>
      </div>
      <h2 data-reveal className="o-h2 mt-2.5 max-w-[600px]">
        {titre}
      </h2>
      <p data-reveal className="o-lead mt-4 max-w-[650px]">
        {chapo}
      </p>
    </div>
  );
}

export default function SurMesurePage() {
  const autres = FAMILLES.flatMap((f) => f.moteurs)
    .filter((x) => CATALOGUE.includes(x.system))
    .sort((a, b) => CATALOGUE.indexOf(a.system) - CATALOGUE.indexOf(b.system))
    .map((x) => ({
      system: x.system,
      role: sansNom(x.title, x.system),
      pitch: FICHES[x.system]?.pitch ?? x.benefit,
      href: `/offres/${x.slug}`,
    }));

  return (
    <PageShell>
      <PageMotion />
      <div className="offres offres--sombre">
        {/* ════════ 1 · HERO — celui du gabarit « home », inchangé ════════ */}
        <section className="o-gris relative overflow-hidden pb-[90px] pt-[40px] sm:pb-[120px] sm:pt-[81px]">
          <div
            aria-hidden
            className="o-dots o-dots-fade pointer-events-none absolute inset-x-0 top-0 h-[900px]"
          />
          <div className="o-wrap relative">
            <div className="grid grid-cols-1 items-start gap-14 pt-[60px] lg:grid-cols-[700px_minmax(0,1fr)] lg:gap-[76px]">
              <div>
                <div data-reveal className="flex flex-wrap items-center gap-3">
                  <Link href="/offres" className="o-pill o-pill--xs">
                    ← Nos offres
                  </Link>
                  <span className="o-pill o-pill--xs">{TAG}</span>
                </div>

                <div data-reveal className="mt-7 flex items-center gap-4">
                  <SystemLogo system={SYSTEM} />
                  <div>
                    <div
                      className="text-[26px] font-semibold tracking-[-0.03em] text-[#fafafa]"
                      style={{ fontFamily: "var(--font-jakarta)" }}
                    >
                      {SYSTEM}
                    </div>
                    <div className="o-small !text-[#a1a1aa]">· {ROLE}</div>
                  </div>
                </div>

                <h1 data-reveal className="o-h2 mt-6">
                  {FICHE.pitch}
                </h1>

                <p data-reveal className="o-lead mt-5 max-w-[608px]">
                  {FICHE.fonctionnement[0]}
                </p>

                <div data-reveal className="mt-7 flex flex-wrap items-center gap-3">
                  <Link href="/commencer" className="o-btn o-btn--primary">
                    Chiffrer mon cas
                  </Link>
                  <Link href="#methode" className="o-btn o-btn--ghost">
                    Comment il tourne
                    <Chevron taille={13} />
                  </Link>
                </div>

                <div data-reveal className="mt-10">
                  <PastillesOutils outils={FICHE.outils} />
                </div>

                <div data-reveal className="mt-6 flex flex-wrap items-center gap-3">
                  <span className="o-pill o-pill--xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                    SUR VOS OUTILS
                  </span>
                  <span className="o-small !text-[#a1a1aa]">{FICHE.outils.join(" · ")}</span>
                </div>
              </div>

              <div data-reveal className="flex w-full flex-col gap-5 lg:max-w-[404px]">
                <DemoFiche demo={FICHE.demo} />

                <CarteBlanche>
                  <div className="px-6 py-6">
                    <span className="o-demo-fort">
                      <svg
                        width="34"
                        height="34"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.7}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M20 6 9 17l-5-5" />
                        <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8" />
                      </svg>
                    </span>
                    <div
                      className="o-demo-fort mt-5 text-[20px] font-semibold tracking-[-0.02em]"
                      style={{ fontFamily: "var(--font-jakarta)" }}
                    >
                      Vous gardez la main
                    </div>
                    <p className="o-demo-faible mt-2 text-[15px] leading-[1.7]">{FICHE.controle}</p>
                  </div>
                </CarteBlanche>
              </div>
            </div>
          </div>
        </section>

        {/* ════════ 2 · CE QUE COUVRE LE SUR-MESURE ════════ */}
        <section id="fonctionnement" className="o-wrap scroll-mt-24 pb-[72px] pt-[72px] sm:pb-[110px] sm:pt-[110px]">
          <EnTete
            pastille="Ce qu'il fait"
            titre={FICHE.sections!.pointsTitre!}
            chapo={FICHE.sections!.pointsChapo!}
          />
          <div className="mt-10 sm:mt-16">
            <GridFeatureCards cases={PERIMETRES} />
          </div>
        </section>

        {/* ════════ 3 · LES ÉTAPES ════════ */}
        <section id="methode" className="o-wrap scroll-mt-24 pb-[72px] sm:pb-[110px]">
          <EnTete
            pastille="La méthode"
            titre="Comment un besoin devient un système."
            chapo={FICHE.sections!.detailChapo!}
          />
          <div className="mt-10 sm:mt-16">
            <FlowCards etapes={ETAPES} />
          </div>
        </section>

        {/* ════════ 4 · SUR VOS OUTILS ════════ */}
        <section className="o-wrap pb-[72px] sm:pb-[110px]">
          <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
            <div className="max-w-[520px]">
              <div data-reveal>
                <span className="o-pill">Intégrations</span>
              </div>
              <h2 data-reveal className="o-h2 mt-2.5">
                Branché sur ce que vous avez.
              </h2>
              <p data-reveal className="o-lead mt-4">
                Messagerie, tableur, paiement, e-commerce, agenda : le système lit et écrit là
                où vous travaillez déjà. Ni compte à créer, ni migration.
              </p>
              <div data-reveal className="mt-7 flex flex-wrap gap-2.5">
                {FICHE.outils.map((o) => (
                  <span key={o} className="o-pill o-pill--xs">
                    {o}
                  </span>
                ))}
              </div>
            </div>
            <div data-reveal className="flex justify-center md:justify-end">
              <IntegrationsTiles />
            </div>
          </div>
        </section>

        {/* ════════ 5 · PENSÉ POUR ════════ */}
        <section className="pb-[72px] sm:pb-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="Pensé pour"
              titre="Quel que soit votre secteur."
              chapo={FICHE.sections!.cibleChapo!}
            />
          </div>
          <div data-reveal className="mt-10 flex flex-col gap-3 sm:mt-14">
            <Marquee duree={46} pause>
              {FICHE.cible.map((c, i) => {
                const Icone = ICONES_SECTEUR[i];
                return (
                  <span key={c} className="o-pill whitespace-nowrap">
                    <Icone className="h-4 w-4 text-[var(--o-muted)]" strokeWidth={1.5} aria-hidden />
                    {c}
                  </span>
                );
              })}
            </Marquee>
            <Marquee duree={52} pause inverse>
              {[...FICHE.cible].reverse().map((c, i) => {
                const Icone = ICONES_SECTEUR[FICHE.cible.length - 1 - i];
                return (
                  <span key={c} className="o-pill whitespace-nowrap">
                    <Icone className="h-4 w-4 text-[var(--o-muted)]" strokeWidth={1.5} aria-hidden />
                    {c}
                  </span>
                );
              })}
            </Marquee>
          </div>
        </section>

        {/* ════════ 6 · CE QUI VIENT AVEC ════════ */}
        <section className="o-wrap pb-[72px] sm:pb-[110px]">
          <EnTete
            pastille="Compris"
            titre="Ce qui vient avec le système."
            chapo="Le système n'est que la partie visible. Ce qui suit est livré avec, sans supplément et sans négociation."
          />
          <div className="mt-10 sm:mt-16">
            <Feature08 cases={COMPRIS} />
          </div>
        </section>

        {/* ════════ 7 · LES AUTRES SYSTÈMES — bandeau gardé ════════ */}
        <section className="pb-[72px] sm:pb-[110px]">
          <div className="o-wrap flex flex-col items-center text-center">
            <div data-reveal>
              <span className="o-pill">Catalogue</span>
            </div>
            <h2 data-reveal className="o-h2 mt-2.5 max-w-[600px]">
              {NOMBRES[autres.length] ?? autres.length} autre{autres.length > 1 ? "s" : ""} système
              {autres.length > 1 ? "s" : ""}.
            </h2>
            <p data-reveal className="o-lead mt-4 max-w-[650px]">
              Le sur-mesure n&apos;est peut-être pas ce qu&apos;il faut installer en premier.
              L&apos;audit désigne le système au meilleur retour chez vous, et il arrive que ce
              soit un autre.
            </p>
            <div data-reveal className="mt-5">
              <Link href="/offres" className="o-link">
                Voir toutes les offres
                <Chevron />
              </Link>
            </div>
          </div>
          <div data-reveal className="mt-10 sm:mt-16">
            <BandeauAutresMoteurs moteurs={autres} />
          </div>
        </section>

        {/* ════════ 8 · FAQ ════════ */}
        <section className="o-wrap pb-[60px]">
          <div className="flex flex-col items-center text-center">
            <div data-reveal>
              <span className="o-pill">FAQ</span>
            </div>
            <TitreDeuxEncres>Questions directes, réponses directes.</TitreDeuxEncres>
            <p data-reveal className="o-lead mt-4 max-w-[650px]">
              {FICHE.sections!.faqChapo!}
            </p>
          </div>
          <div className="mt-12">
            <Faq06 questions={FICHE.faq} />
          </div>
        </section>

        {/* ════════ 9 · L'APPEL FINAL ════════ */}
        <div className="o-wrap pb-[60px]">
          <CtaRectangle
            pastille={TAG}
            titre="Parler de votre cas."
            texte="Rien n'est chiffré avant que ce soit clair pour vous comme pour nous."
            action={{ label: "Chiffrer mon cas", href: "/commencer" }}
          />
        </div>
      </div>
    </PageShell>
  );
}
