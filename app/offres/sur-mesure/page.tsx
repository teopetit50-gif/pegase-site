import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import GabaritHome from "@/components/offres/gabarits/GabaritHome";
import { FAMILLES } from "@/lib/content";
import { FICHES } from "@/lib/fiches";
import type { Fiche } from "@/lib/fiches";
import {
  ACCENT_FAMILLE,
  ACCENT_FAMILLE_SOMBRE,
  type MoteurAvecFamille,
} from "@/components/offres/gabarits/types";

/* ══════════════════════════════════════════════════════════════════════
   /offres/sur-mesure — 07/08/2026 (Teo)

   ROUTE STATIQUE, PAS UN PAQUET. Elle rend le gabarit « home », celui de
   CASHD, à l'identique — c'était la demande : « exactement le même design
   que quand on clique sur la carte FILED ou CASHD ».

   Pourquoi ici et pas dans FAMILLES / FICHES, comme les six autres :
   le sur-mesure n'est pas un paquet catalogue. L'inscrire dans FAMILLES
   l'aurait propagé partout où la liste des paquets est lue — le bandeau
   « les autres moteurs » de chaque fiche, PepitesSection, Publics, les
   grilles de /offres, le sitemap — et surtout il aurait cassé les copies
   qui comptent : « Quatre choses en moins », « quatre postes », les grilles
   en quatre colonnes. Un cinquième élément dans un tableau dont le nombre
   est écrit en toutes lettres ailleurs, c'est une régression garantie.

   Next.js donne priorité au segment statique sur le segment dynamique :
   /offres/sur-mesure atterrit donc ici et jamais dans [system], dont le
   generateStaticParams ne le connaît pas. Aucun conflit à arbitrer.

   Contrepartie assumée : cette page ne figure PAS dans le bandeau « autres
   moteurs » des fiches catalogue, et pas non plus dans le sitemap tant
   qu'on ne l'y ajoute pas à la main. Elle s'atteint par la quatrième carte
   de /offres. Si elle doit être découverte autrement, c'est le sitemap
   qu'il faut ouvrir, pas FAMILLES.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Sur mesure | Omega.AI",
  description:
    "Quand aucun des quatre systèmes ne correspond : on construit celui qui manque, sur vos règles et dans votre secteur.",
};

/* Une famille de façade, uniquement pour satisfaire le contrat du gabarit
   (il lit `m.famille.tag` pour la pastille du hero). Elle n'est jamais
   exportée ni parcourue : `moteurs` reste vide à dessein, pour qu'aucun
   code qui viendrait à la lire par erreur n'y trouve un cinquième paquet. */
const FAMILLE_SUR_MESURE = {
  id: "sur-mesure",
  tag: "Sur mesure",
  accent: "text-gold",
  title1: "Ce qui n'existe pas encore",
  title2: "se construit.",
  desc: "Quand le besoin ne rentre dans aucun des quatre systèmes du catalogue, il devient un projet à part entière.",
  cta: "Parler de votre cas",
  proof: {
    type: "quote" as const,
    text: "Un logiciel métier, un flux entre deux outils qui ne se parlent pas, un contrôle que personne n'a le temps de faire : la plupart des besoins n'ont pas de produit tout fait.",
    sub: "C'est précisément là que le sur-mesure se justifie, et nulle part ailleurs.",
  },
  moteurs: [],
};

const MOTEUR: MoteurAvecFamille = {
  system: "SUR MESURE",
  slug: "sur-mesure",
  title: "SUR MESURE · le système qui n'existe pas encore",
  job: "Votre besoin est décrit, cadré, puis construit : un système taillé sur vos règles, dans votre secteur, branché sur vos outils.",
  benefit:
    "Aucun catalogue à faire entrer de force dans votre métier : on part de votre processus.",
  famille: FAMILLE_SUR_MESURE,
};

const FICHE: Fiche = {
  pitch: "Ce qui n'existe pas encore, on le construit.",

  sections: {
    pointsTitre: "Ce que couvre le sur-mesure.",
    pointsChapo:
      "Un processus interne, un logiciel métier, un pont entre deux outils, un contrôle répétitif : le périmètre se définit avec vous, pas dans un catalogue.",
    detailChapo:
      "Comment un besoin devient un système : ce qu'on cadre avant d'écrire une ligne, ce qu'on construit, et ce qui reste sous votre décision.",
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

  /* Le sur-mesure ne se branche pas sur une liste fermée : ces quatre entrées
     sont les FAMILLES d'outils les plus fréquentes, pas une limite. Le
     gabarit les affiche en pastilles et en bandeau, d'où le format court. */
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
    "BTP & artisanat",
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
      {
        text: "Double saisie entre l'outil de devis et la compta",
        badge: "Pont",
        tone: "ok",
      },
      {
        text: "Bons de livraison lus et contrôlés à réception",
        badge: "Documents",
        tone: "ok",
      },
      {
        text: "Suivi de parc avec alertes d'échéance",
        badge: "Logiciel",
        tone: "ok",
      },
      {
        text: "Tâche qui demande un jugement au cas par cas",
        badge: "Écarté",
        tone: "off",
      },
    ],
    footer:
      "Les trois premiers suivent des règles qu'on peut écrire. Le quatrième non : il reste chez vous, et on vous le dit au cadrage.",
  },
};

/* Les quatre paquets du catalogue alimentent le bandeau « les autres ». On
   les lit dans FAMILLES plutôt que de les recopier : si un paquet change de
   nom ou de slug, cette page suit sans intervention. */
const CATALOGUE = ["CASHD", "RELOAD", "FRONTD", "FILED"];

const sansNom = (titre: string, nom: string) =>
  titre.startsWith(nom)
    ? titre.slice(nom.length).replace(/^\s*[ : –-]\s*/, "")
    : titre;

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
      <GabaritHome
        m={MOTEUR}
        fiche={FICHE}
        role={sansNom(MOTEUR.title, MOTEUR.system)}
        paragraphes={FICHE.fonctionnement as string[]}
        accent={ACCENT_FAMILLE.installes}
        accentSombre={ACCENT_FAMILLE_SOMBRE.installes}
        autres={autres}
      />
    </PageShell>
  );
}
