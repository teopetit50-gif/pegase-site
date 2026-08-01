/* Contenu détaillé affiché SOUS la présentation de chaque moteur, dans les
   onglets de /solutions (23/07, Teo — 11 rubriques par service).

   Deux règles de fabrication :

   1. On ne réécrit pas ce qui existe. Étapes, démonstration, features,
      cibles, outils et FAQ vivent déjà dans lib/fiches.ts — c'est du contenu
      réel, validé, servi aussi par les fiches complètes. On le RÉUTILISE
      plutôt que d'en faire des placeholders.

   2. On n'invente rien. Tout ce qui n'existe nulle part — le problème, les
      chiffres de preuve, le témoignage, les tarifs, le délai d'installation —
      est un PLACEHOLDER explicite, entre crochets, rendu visiblement comme
      « à compléter » (voir estPlaceholder ci-dessous). Aucun chiffre, aucune
      preuve sociale, aucun prix n'est fabriqué. Règle héritée de
      refs-qonto/NOTES-DESIGN.md.

   ANSWR est le seul service dont Teo a fourni l'intégralité du contenu : il
   est écrit ici tel quel et n'emprunte pas à fiches.ts. */

import { FICHES, type Demo } from "./fiches";

/* Un texte entre crochets est un trou à combler, pas du contenu. Le rendu
   s'appuie là-dessus pour le styliser distinctement. */
export const estPlaceholder = (s: string) => s.trim().startsWith("[") && s.trim().endsWith("]");

export type Etape = { t: string; d: string };
export type Stat = { valeur: string; label: string };
export type QR = { q: string; a: string };

export type ServiceDetail = {
  /* 1 — la douleur, avant la solution */
  probleme: string;
  /* accroche courte, posée en tête du bloc */
  accroche: string;
  /* 2 — le parcours */
  etapes: Etape[];
  /* 3 — la démo en situation réelle */
  demo: Demo;
  demoContexte: string;
  /* 4 — le détail des fonctionnalités */
  inclus: string[];
  /* 5 — secteurs et profils */
  pourQui: string[];
  /* 6 — intégrations */
  integrations: string[];
  /* 7 — preuve */
  stats: Stat[];
  /* Emplacement témoignage client. Rendu en citation. Absent quand aucun
     avis réel n'existe : on n'affiche jamais de faux témoignage. */
  temoignage?: string;
  /* Alternative au témoignage (23/07, Teo) : une phrase de réassurance à la
     voix de l'ENTREPRISE. Rendue en texte courant, jamais en citation — elle
     ne doit pas pouvoir se lire comme un avis client. */
  reassurance?: string;
  /* 8 — modèle de prix. Deux formes possibles :
     — tarifTexte : une phrase (« Sur devis… »), rendue telle quelle ;
     — tarif + tarifDetail : le gabarit « À partir de X par mois ». */
  tarifTexte?: string;
  tarif?: string;
  tarifDetail?: string;
  /* 9 — mise en route */
  installation: string;
  /* 10 — objections */
  faq: QR[];
  /* 11 — action */
  ctaTitre: string;
  ctaTexte: string;
};

/* ——— ANSWR : contenu fourni par Teo, utilisé tel quel ——— */
const ANSWR: ServiceDetail = {
  accroche:
    "ANSWR ne s'invente jamais une réponse — il s'appuie exclusivement sur VOTRE base de connaissances. Hors de son périmètre, il transfère au lieu d'approximer.",
  probleme:
    "Chaque appel manqué le soir, le weekend ou en pleine intervention, c'est un client qui appelle le concurrent. Un standard saturé fait fuir. Un RDV oublié coûte une place vide.",
  etapes: [
    {
      t: "Installation",
      d: "On construit ensemble votre base de connaissances : horaires, tarifs, prestations, durées d'intervention, politique d'annulation, questions fréquentes.",
    },
    {
      t: "Qualification",
      d: "À chaque demande, ANSWR identifie le type : devis, urgence, réclamation ou simple renseignement. Chacun suit son propre circuit.",
    },
    {
      t: "Action",
      d: "Pour un rendez-vous, il propose un créneau réellement libre dans votre agenda, le réserve, confirme au client et programme un rappel la veille.",
    },
    {
      t: "Transfert intelligent",
      d: "Sur une situation sensible ou un mot d'urgence défini avec vous, votre téléphone sonne et la conversation vous arrive avec tout son historique. Le reste tourne seul, chaque échange reste archivé et consultable.",
    },
  ],
  demoContexte: "23 h 04 — l'entreprise est fermée depuis longtemps",
  demo: {
    type: "chat",
    title: "Demande de devis, un mardi à 23 h",
    sub: "ANSWR qualifie, propose un créneau, confirme",
    messages: [
      {
        from: "client",
        text: "Bonsoir, vous faites des devis pour une rénovation salle de bain ?",
        time: "23:04",
      },
      {
        from: "bot",
        text: "Bonsoir ! Oui, la rénovation de salle de bain fait partie de nos prestations. Le devis se fait sur place, après une visite d'une trentaine de minutes. Je peux vous proposer jeudi 14 h ou vendredi 9 h — le premier créneau libre de l'agenda.",
        time: "23:04",
      },
      { from: "client", text: "Jeudi 14h ça m'arrange", time: "23:09" },
      {
        from: "bot",
        text: "C'est noté, jeudi 14 h. Vous recevrez un rappel mercredi soir. Bonne fin de soirée !",
        time: "23:09",
      },
    ],
    note: "Rendez-vous créé dans l'agenda · rappel programmé la veille",
  },
  inclus: [
    "Réponse en moins d'une minute, 24 h/24, weekends et jours fériés compris",
    "Prise de rendez-vous directement dans votre agenda, avec confirmation au client et rappel la veille",
    "Qualification des demandes : devis, urgence, réclamation, renseignement",
    "Ne s'invente jamais de réponse — transfère dès que c'est hors périmètre",
    "Historique de chaque échange archivé et consultable",
  ],
  pourQui: [
    "Artisans",
    "Cabinets (avocats, médecins, kinés)",
    "Cliniques et salons",
    "Agences",
    "PME de services",
  ],
  integrations: ["WhatsApp", "Email", "Google Calendar", "Transfert d'appel"],
  stats: [
    { valeur: "< 1 min", label: "temps de réponse moyen" },
    { valeur: "Zéro", label: "appel manqué" },
    { valeur: "24/7/365", label: "disponibilité" },
  ],
  /* Pas de témoignage : aucun avis client réel n'existe encore. On affiche à
     la place une phrase de réassurance à la voix de l'entreprise (23/07). */
  reassurance:
    "Vos échanges et votre numéro restent les vôtres — chaque conversation est archivée et consultable.",
  tarifTexte: "Sur devis, établi après l'audit gratuit.",
  installation:
    "Opérationnel en quelques jours. On paramètre tout avec vous — rien à coder de votre côté.",
  faq: [
    {
      q: "Et si l'IA ne sait pas répondre ?",
      a: "Elle le dit honnêtement, prévient que quelqu'un va rappeler, et vous transfère la conversation avec tout le contexte. Elle ne brode jamais : hors de son périmètre, elle transfère au lieu d'approximer.",
    },
    {
      q: "Où sont mes données ? Est-ce conforme RGPD ?",
      a: "Vos données restent dans vos outils — votre messagerie, votre agenda — et les moteurs viennent les lire là où elles sont, au lieu de les recopier dans une base tierce. Les modèles reçoivent le strict nécessaire à chaque tâche, jamais l'intégralité d'un fichier, et rien n'est réutilisé à d'autres fins.",
    },
    {
      q: "Je garde mon numéro ?",
      a: "Oui. WhatsApp Business et votre boîte mail sont raccordés à vos identifiants actuels : vos numéros et vos adresses ne changent pas.",
    },
    {
      q: "Ça gère plusieurs langues ?",
      a: "[ANSWR — réponse multilingue à confirmer]",
    },
  ],
  ctaTitre: "Voir ANSWR répondre sur vos propres demandes",
  ctaTexte:
    "La démo se fait sur votre activité réelle : vos horaires, vos prestations, vos questions les plus fréquentes.",
};

/* ——— PAYD, OFFLOAD, REVIVE ———
   Construits depuis fiches.ts pour tout ce qui existe déjà, complétés par des
   placeholders explicites pour ce que Teo doit fournir. */
function depuisFiche(
  system: string,
  manquants: {
    probleme: string;
    demoContexte: string;
    stats: Stat[];
    installation: string;
    ctaTitre: string;
    ctaTexte: string;
  }
): ServiceDetail {
  const f = FICHES[system];
  return {
    accroche: f.pitch,
    probleme: manquants.probleme,
    etapes: f.etapes,
    demo: f.demo,
    demoContexte: manquants.demoContexte,
    inclus: f.points,
    pourQui: f.cible,
    integrations: f.outils,
    stats: manquants.stats,
    temoignage: `[${system} — témoignage client à fournir]`,
    tarif: "[montant à compléter]",
    tarifDetail: "par mois, + installation",
    installation: manquants.installation,
    faq: f.faq,
    ctaTitre: manquants.ctaTitre,
    ctaTexte: manquants.ctaTexte,
  };
}

export const SERVICES_DETAIL: Record<string, ServiceDetail> = {
  ANSWR,
  PAYD: depuisFiche("PAYD", {
    probleme: "[PAYD — problème à remplir : la douleur avant la solution]",
    demoContexte: "Le protocole appliqué à une facture échue",
    stats: [
      { valeur: "[chiffre]", label: "[PAYD — indicateur à fournir]" },
      { valeur: "[chiffre]", label: "[PAYD — indicateur à fournir]" },
      { valeur: "[chiffre]", label: "[PAYD — indicateur à fournir]" },
    ],
    installation: "[PAYD — ce que ça demande au client et le délai de mise en route]",
    ctaTitre: "Chiffrer ce que vos impayés vous coûtent",
    ctaTexte:
      "L'audit part de votre facturier réel : montants en attente, ancienneté des retards, retour attendu.",
  }),
  /* OFFLOAD : contenu fourni par Teo le 23/07 pour le problème, les trois
     indicateurs, le tarif et l'installation. La réassurance remplace
     l'emplacement témoignage — aucun avis client réel à afficher. */
  OFFLOAD: {
    ...depuisFiche("OFFLOAD", {
      probleme:
        "Chaque facture fournisseur, c'est une pièce à retrouver, renommer, classer, puis ressaisir. Les PDF s'empilent, on court après les justificatifs en fin de mois, et le comptable facture le temps qu'il passe à démêler un dossier en vrac. Au bout : des heures perdues, de la TVA oubliée, des pénalités de retard — et une compta qui a toujours un mois de retard sur la réalité.",
      demoContexte: "Une photo de facture reçue en pleine journée",
      stats: [
        { valeur: "0", label: "ligne de saisie de votre côté" },
        { valeur: "100 %", label: "de vos factures classées, nommées et horodatées" },
        { valeur: "1×/mois", label: "un dossier propre, prêt pour le comptable" },
      ],
      installation:
        "Opérationnel en quelques jours. Vous transférez vos factures à une adresse de collecte dédiée, on monte l'arborescence de classement sur votre Drive et on cale le format de transmission avec votre comptable. Rien à installer, rien à ressaisir de votre côté.",
      ctaTitre: "Voir OFFLOAD tourner sur vos propres factures",
      ctaTexte:
        "On prend vos pièces des trois derniers mois et on vous montre le dossier que votre cabinet recevrait.",
    }),
    temoignage: undefined,
    reassurance:
      "Vos factures restent sur votre propre Drive — on ne fait que les collecter, les classer et les préparer.",
    tarifTexte: "Sur devis, établi après l'audit gratuit.",
    tarif: undefined,
    tarifDetail: undefined,
  },
  REVIVE: depuisFiche("REVIVE", {
    probleme: "[REVIVE — problème à remplir : la douleur avant la solution]",
    demoContexte: "Une cliente silencieuse depuis huit mois",
    stats: [
      { valeur: "[chiffre]", label: "[REVIVE — indicateur à fournir]" },
      { valeur: "[chiffre]", label: "[REVIVE — indicateur à fournir]" },
      { valeur: "[chiffre]", label: "[REVIVE — indicateur à fournir]" },
    ],
    installation: "[REVIVE — ce que ça demande au client et le délai de mise en route]",
    ctaTitre: "Savoir ce que dort dans votre fichier client",
    ctaTexte:
      "L'audit mesure combien de clients sont silencieux, depuis quand, et pour quelle valeur historique.",
  }),
};
