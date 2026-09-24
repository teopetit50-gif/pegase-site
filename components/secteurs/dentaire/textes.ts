/* ══════════════════════════════════════════════════════════════════════
   Tiroma — les TEXTES et les données de la page, sortis du balisage.

   Recopiés de OMEGA/dentaire-site/src/components/landing.jsx — version
   finale du 24/09/2026 (17 h, heure de la Guadeloupe) : les ajouts de la
   session « fonctions » (laboratoire, mutuelles, implants, orthodontie,
   écran « Avant les rendez-vous ») ET le rhabillage dentaire. Ils étaient semés
   dans les composants sous des noms minifiés (`mV`, `mz`, `mj`, `mH`,
   `mG`, `mW`, `m9`, et des tableaux écrits en ligne). Rien n'est réécrit,
   sauf ce qui est noté ligne par ligne.

   CE QUI A ÉTÉ VÉRIFIÉ (règles maison, en plus de ce que dit le
   LISEZ-MOI de la source) :
   • Aucun témoignage : les huit « situations types » n'ont ni nom de
     personne ni cabinet réel ; chaque carte le dit (« Situation type »).
   • Deux chiffres seulement, sourcés et vérifiés dans l'étude du secteur
     (plans-et-decisions/secteurs/cabinets-dentaires-2026-09.md) : 49 % des
     annulations dentaires à moins de 48 h remplacées (Doctolib, 2024) et
     5 418 cabinets de 3 à 49 salariés (Sirene, NAF 86.23Z).
   • Aucun prix : « Sur audit » partout, le calculateur n'estime que ce que
     coûtent les créneaux perdus, avec les chiffres du visiteur.
   • Aucune promesse de lecture de radios ni d'aide au diagnostic : Tiroma
     lit l'agenda, les plans et les devis, rien de clinique.
   • Aucun de nos outils techniques n'est nommé. WhatsApp et l'e-mail sont
     les canaux où le CABINET reçoit son point du matin, pas notre pile.
   ══════════════════════════════════════════════════════════════════════ */
import type { LucideIcon } from "lucide-react";
import {
  BellRing,
  CalendarDays,
  CalendarX,
  ClipboardList,
  ListChecks,
  Receipt,
  Stethoscope,
  Users,
  Armchair,
  Building2,
  CalendarRange,
  FlaskConical,
  Hourglass,
  Package,
  ShieldCheck,
} from "lucide-react";

/* ── Héros ─────────────────────────────────────────────────────────── */

/* La deuxième ligne du titre, qui change toutes les 3 s (`mV`). */
export const LIGNES_TOURNANTES = [
  "Chaque créneau sauvé.",
  "Chaque plan planifié.",
  "Chaque contrôle revu.",
  "Chaque matin à 7 h.",
];

/* Les six pastilles sous les boutons : à la place des réseaux sociaux de
   la référence, ce que Tiroma lit (aucun compte inventé). */
export const PASTILLES_LUES: { nom: string; Icone: LucideIcon }[] = [
  { nom: "Agenda du cabinet", Icone: CalendarDays },
  { nom: "Plans de traitement", Icone: ClipboardList },
  { nom: "Devis signés", Icone: Receipt },
  { nom: "Patients", Icone: Users },
  { nom: "Fauteuils", Icone: Armchair },
  { nom: "Point du matin", Icone: BellRing },
];

/* Le bandeau qui défile au bas du héros : à la place des logos clients de
   la référence, les données que Tiroma rapproche. */
export const BANDEAU_LU: { cle: string; Icone: LucideIcon; libelle: string }[] = [
  { cle: "agenda", Icone: CalendarDays, libelle: "Agenda du cabinet" },
  { cle: "plans", Icone: ClipboardList, libelle: "Plans de traitement" },
  { cle: "devis", Icone: Receipt, libelle: "Devis signés" },
  { cle: "annul", Icone: CalendarX, libelle: "Annulations" },
  { cle: "attente", Icone: ListChecks, libelle: "Liste d'attente" },
  { cle: "equipe", Icone: Users, libelle: "Présences de l'équipe" },
  { cle: "controles", Icone: Stethoscope, libelle: "Contrôles dus" },
  { cle: "matin", Icone: BellRing, libelle: "Point du matin à 7 h" },
  { cle: "labo", Icone: FlaskConical, libelle: "Travaux de laboratoire" },
  { cle: "mutuelles", Icone: ShieldCheck, libelle: "Accords des mutuelles" },
  { cle: "stock", Icone: Package, libelle: "Stock d'implants" },
];

/* ── Les quatre écrans (captures dessinées pour Tiroma, données d'exemple
   étiquetées comme telles sur chaque capture) ───────────────────────── */

const ECRANS_DOSSIER = "/secteurs-dentaire/ecrans";

export type Ecran = { id: string; badge: string; titre: string; texte: string; src: string };

export const ECRANS: Ecran[] = [
  {
    id: "point",
    badge: "Chaque matin",
    titre: "Point du matin",
    texte: "Les trois décisions du jour, prêtes à 7 h.",
    src: `${ECRANS_DOSSIER}/point-du-matin.png`,
  },
  {
    id: "creneaux",
    badge: "En direct",
    titre: "Créneaux à sauver",
    texte: "Chaque annulation arrive avec les patients qui peuvent la reprendre.",
    src: `${ECRANS_DOSSIER}/creneaux.png`,
  },
  {
    id: "fauteuils",
    badge: "En direct",
    titre: "Charge des fauteuils",
    texte: "Qui tourne à vide aujourd'hui, et quoi déplacer.",
    src: `${ECRANS_DOSSIER}/fauteuils.png`,
  },
  {
    id: "plans",
    badge: "En direct",
    titre: "Plans sans rendez-vous",
    texte: "Les devis signés qui dorment, du plus ancien au plus récent.",
    src: `${ECRANS_DOSSIER}/plans.png`,
  },
  {
    id: "avant",
    badge: "À J-2",
    titre: "Avant les rendez-vous",
    texte: "La prothèse revenue du laboratoire, l'implant en stock, l'accord de la mutuelle.",
    src: `${ECRANS_DOSSIER}/avant.png`,
  },
];

/* Les onglets empilés de « Votre cabinet, lu en une page ». */
export const ONGLETS_ECRANS: { titre: string; valeur: string; src: string; legende: string }[] = [
  { titre: "Point du matin", valeur: "point", src: ECRANS[0].src, legende: "Tiroma · point du matin" },
  { titre: "Créneaux", valeur: "creneaux", src: ECRANS[1].src, legende: "Tiroma · créneaux à sauver" },
  { titre: "Fauteuils", valeur: "fauteuils", src: ECRANS[2].src, legende: "Tiroma · charge des fauteuils" },
  { titre: "Plans", valeur: "plans", src: ECRANS[3].src, legende: "Tiroma · plans sans rendez-vous" },
];

/* ── « De l'annulation au fauteuil occupé » (`mj`) ──────────────────── */

export const ETAPES = [
  {
    titre: "L'agenda et les plans, lus",
    texte:
      "Tout au long de la journée, Tiroma lit l'agenda, les plans, les devis, les travaux confiés au laboratoire et les réponses des mutuelles. Une annulation saisie à 8 h remonte dans les minutes qui suivent, en lecture seule.",
  },
  {
    titre: "Le créneau sauvé",
    texte:
      "Un patient annule la veille : Tiroma dit qui peut prendre sa place. D'abord un plan accepté, puis la liste d'attente, puis un contrôle dû. L'assistante appelle, le fauteuil reste occupé.",
  },
  {
    titre: "Le plan planifié",
    texte:
      "Les devis signés sans rendez-vous remontent chaque matin, du plus ancien au plus récent, avec le créneau qui leur convient.",
  },
  {
    titre: "Le fauteuil qui tourne",
    texte:
      "Fauteuil sans assistante, demi-journée vide, séance longue mal placée : la charge se lit par fauteuil, pour le titulaire seul, jamais par personne.",
  },
];

/* ── Avant / après (section Écrans) ─────────────────────────────────── */

export const SANS_TIROMA = [
  "L'annulation découverte en ouvrant l'agenda",
  "Le créneau libre reste vide ou part au premier qui appelle",
  "Le devis signé dort : le patient attendait l'accord de sa mutuelle, puis personne n'a rappelé",
  "La prothèse pas revenue du laboratoire se découvre le jour de la pose",
];
export const AVEC_TIROMA = [
  "À 7 h, chaque créneau libéré arrive avec ses patients",
  "Plan accepté d'abord, puis liste d'attente, puis contrôle dû",
  "Les plans signés sans rendez-vous remontent seuls",
  "Deux jours avant la pose, le retour du laboratoire est vérifié",
];

/* ── « Ni un logiciel, ni une assistante de plus » : la comparaison par
   CATÉGORIES d'outils, sans viser aucun éditeur. `true` = point bleu,
   `false` = tiret, sinon le texte. ───────────────────────────────────── */

export type Case = boolean | string;
export const COMPARATIF_COLONNES = ["Tiroma", "Logiciel de cabinet", "Agenda en ligne", "Assistante seule"];
export const COMPARATIF: { critere: string; cases: [Case, Case, Case, Case] }[] = [
  { critere: "Créneau libéré proposé à un patient précis", cases: [true, false, "Premier qui appelle", "De mémoire"] },
  { critere: "Plans signés sans rendez-vous, chaque matin", cases: [true, "Sur requête", false, "Rarement"] },
  { critere: "Contrôles dus rapprochés des trous d'agenda", cases: [true, false, "Rappels en masse", "Manuel"] },
  { critere: "Retour du laboratoire vérifié avant la pose", cases: [true, false, false, "Au téléphone"] },
  { critere: "Accords des mutuelles rapprochés de l'agenda", cases: [true, false, false, "Manuel"] },
  { critere: "Implants des chirurgies rapprochés du stock", cases: [true, "Stock général", false, "De mémoire"] },
  { critere: "Charge lue par fauteuil, jamais par personne", cases: [true, "Partiel", false, false] },
  { critere: "Point du matin par WhatsApp ou e-mail", cases: [true, false, false, "À l'oral"] },
  { critere: "Aucune double saisie", cases: [true, true, "Partiel", false] },
  { critere: "Mise en route", cases: ["Sur audit", true, "Abonnement", "Formation"] },
  { critere: "Coût", cases: ["Sur audit", "Inclus", "Variable", "Un salaire"] },
];

/* ── « Pour quels cabinets ? » (`mH`, `mG`, `mW`). Les classes de teinte
   restent écrites en entier : Tailwind ne génère que ce qu'il lit. ──── */

export const CABINETS = [
  {
    Icone: Stethoscope,
    titre: "Cabinet de 2 à 3 fauteuils",
    texte:
      "Le titulaire soigne toute la journée. Tiroma prépare le matin ce qu'il n'a pas le temps de regarder : les trous, les plans qui dorment, les contrôles dus.",
    points: [
      "Créneaux libérés avec leurs patients",
      "Plans signés sans rendez-vous",
      "Contrôles dus rapprochés de l'agenda",
      "Retours du laboratoire vérifiés avant la pose",
      "Point du matin sur WhatsApp",
    ],
    fait: "⏱ Prêt chaque jour à 7 h",
    lueur: "bg-gradient-to-br from-[#4f9587]/10 to-[#4f9587]/0",
    fondIcone: "group-hover:bg-gradient-to-br group-hover:from-[#4f9587]/20 group-hover:to-[#4f9587]/0",
    couleurIcone: "group-hover:text-[#3b7a6e]",
  },
  {
    Icone: Users,
    titre: "Cabinet de groupe",
    texte:
      "Plusieurs praticiens, plusieurs assistantes, un agenda qui bouge toute la journée. Tiroma dit quel fauteuil tourne à vide et quoi déplacer.",
    points: [
      "Charge par fauteuil et par demi-journée",
      "Assistante absente : soins à basculer",
      "Demi-journées vides des collaborateurs",
      "Une liste d'attente commune",
      "Implants des chirurgies rapprochés du stock",
    ],
    fait: "🦷 Lu par fauteuil",
    lueur: "bg-gradient-to-br from-[#4f9587]/10 to-[#4f9587]/0",
    fondIcone: "group-hover:bg-gradient-to-br group-hover:from-[#4f9587]/20 group-hover:to-[#4f9587]/0",
    couleurIcone: "group-hover:text-[#3b7a6e]",
  },
  {
    Icone: Building2,
    titre: "Centre dentaire",
    texte:
      "Plusieurs sites, une direction. Chaque centre reçoit son point du matin, la direction voit la synthèse de la semaine.",
    points: [
      "Un point du matin par centre",
      "Synthèse de la semaine pour la direction",
      "Mêmes règles de priorité partout",
      "Droits d'accès par rôle",
      "Taux de réinscription et d'acceptation des devis",
    ],
    fait: "✨ Un point par centre",
    lueur: "bg-gradient-to-br from-[#4f9587]/10 to-[#4f9587]/0",
    fondIcone: "group-hover:bg-gradient-to-br group-hover:from-[#4f9587]/20 group-hover:to-[#4f9587]/0",
    couleurIcone: "group-hover:text-[#3b7a6e]",
  },
];

/* ── « Ce que vivent les cabinets » : des SITUATIONS TYPES, pas des avis
   (`mz`). La forme des cartes de témoignage de la référence, le fond du
   métier ; aucune personne ni aucun cabinet réels. ─────────────────── */

export const SITUATIONS: { quand: string; cabinet: string; sujet: string; Icone: LucideIcon; recit: string }[] = [
  {
    quand: "Le lundi, 8 h 10",
    cabinet: "Cabinet de 3 fauteuils",
    sujet: "Annulation",
    Icone: CalendarX,
    recit:
      "Deux annulations reçues pendant le week-end. L'assistante les découvre en ouvrant l'agenda, et le premier créneau est déjà passé.",
  },
  {
    quand: "Le mardi, 11 h",
    cabinet: "Cabinet de groupe",
    sujet: "Plan signé",
    Icone: ClipboardList,
    recit:
      "Le devis de la couronne a été signé il y a six semaines. Personne n'a posé le rendez-vous, et le patient n'a pas rappelé.",
  },
  {
    quand: "Le mercredi, 14 h",
    cabinet: "Cabinet de 2 fauteuils",
    sujet: "Équipe",
    Icone: Users,
    recit:
      "L'assistante est en formation. Le fauteuil 3 tourne à moitié, alors que deux soins auraient pu passer sur le fauteuil 1.",
  },
  {
    quand: "Le jeudi, 9 h",
    cabinet: "Centre dentaire",
    sujet: "Liste d'attente",
    Icone: ListChecks,
    recit:
      "Neuf patients veulent venir plus tôt. Le créneau libéré part au premier qui appelle, pas à celui qui en a le plus besoin.",
  },
  {
    quand: "Le vendredi, 17 h",
    cabinet: "Cabinet de 4 fauteuils",
    sujet: "Contrôles",
    Icone: Stethoscope,
    recit:
      "Quarante-six patients n'ont pas été revus depuis plus d'un an. La liste existe dans le logiciel, personne n'a le temps de la sortir.",
  },
  {
    quand: "Toute la semaine",
    cabinet: "Cabinet de groupe",
    sujet: "Collaborateur",
    Icone: CalendarDays,
    recit: "Le collaborateur a une demi-journée vide jeudi. Le titulaire l'apprend le jeudi matin.",
  },
  {
    quand: "Le soir",
    cabinet: "Cabinet de 3 fauteuils",
    sujet: "Traitement interrompu",
    Icone: CalendarX,
    recit:
      "La deuxième séance du traitement de racine n'a jamais été posée. Le dossier dort jusqu'à la prochaine douleur.",
  },
  {
    quand: "Le mardi, 18 h",
    cabinet: "Cabinet de 3 fauteuils",
    sujet: "Laboratoire",
    Icone: FlaskConical,
    recit:
      "La couronne de M. D. devait revenir du laboratoire lundi. La pose est jeudi à 9 h, et personne n'a vérifié qu'elle était arrivée.",
  },
  {
    quand: "Le lundi, 10 h",
    cabinet: "Cabinet de groupe",
    sujet: "Mutuelle",
    Icone: ShieldCheck,
    recit:
      "La mutuelle a donné son accord pour le bridge il y a trois semaines. Le patient attend qu'on l'appelle, et le cabinet attend qu'il rappelle.",
  },
  {
    quand: "Fin du mois",
    cabinet: "Cabinet de 2 fauteuils",
    sujet: "Devis",
    Icone: Hourglass,
    recit:
      "Le devis signé en juin arrive à échéance. Passé la date, il faudra le refaire et redemander l'accord de la mutuelle.",
  },
  {
    quand: "La veille, 19 h",
    cabinet: "Centre dentaire",
    sujet: "Implants",
    Icone: Package,
    recit:
      "Deux poses d'implants sont prévues demain matin. L'une des deux références manque au stock, et on le découvre au fauteuil.",
  },
  {
    quand: "Au printemps",
    cabinet: "Cabinet de 4 fauteuils",
    sujet: "Orthodontie",
    Icone: CalendarRange,
    recit:
      "L'accord de l'Assurance maladie est arrivé en mars. Le traitement n'a pas commencé, alors que l'accord ne vaut que six mois.",
  },
  {
    quand: "Chaque matin",
    cabinet: "Tous les cabinets",
    sujet: "Point du matin",
    Icone: BellRing,
    recit:
      "Tout est dans le logiciel. Ce qui manque, c'est quelqu'un qui le lise avant 8 h et dise quoi faire.",
  },
];

/* Les deux chiffres sourcés (voir l'en-tête). */
export const CHIFFRES_SOURCES = [
  { chiffre: "49 %", texte: "des annulations tardives remplacées", source: "Doctolib, 2024" },
  { chiffre: "5 418", texte: "cabinets de 3 à 49 salariés", source: "Sirene, 2026" },
];

/* ── Formules : aucun montant, « Sur audit » ────────────────────────── */

export type Formule = {
  cle: string;
  nom: string;
  texte: string;
  conseillee: boolean;
  points: string[];
  detail: { libelle: string; inclus: boolean; indice?: string }[];
};

export const FORMULES: Formule[] = [
  {
    cle: "cabinet",
    nom: "Cabinet",
    texte: "2 à 3 fauteuils, un titulaire.",
    conseillee: false,
    points: [
      "Point du matin chaque jour ouvré",
      "Créneaux à sauver",
      "Plans sans rendez-vous",
      "Contrôles dus",
      "Retours du laboratoire avant la pose",
      "Accords des mutuelles sans rendez-vous",
      "Devis qui arrivent à échéance",
      "Famille à planifier dans la foulée",
    ],
    detail: [
      { libelle: "Point du matin à 7 h", inclus: true },
      { libelle: "Créneaux à sauver", inclus: true },
      { libelle: "Plans sans rendez-vous", inclus: true },
      { libelle: "Retours du laboratoire", inclus: true },
      { libelle: "Accords des mutuelles", inclus: true },
      { libelle: "Charge des fauteuils", inclus: false, indice: "dès Groupe" },
      { libelle: "Implants des chirurgies", inclus: false, indice: "dès Groupe" },
      { libelle: "Synthèse de la semaine", inclus: false, indice: "dès Centre" },
      { libelle: "Plusieurs sites", inclus: false, indice: "Réseau" },
    ],
  },
  {
    cle: "groupe",
    nom: "Groupe",
    texte: "4 à 6 fauteuils, plusieurs praticiens.",
    conseillee: false,
    points: [
      "Tout ce que contient Cabinet",
      "Charge des fauteuils",
      "Demi-journées vides",
      "Liste d'attente commune",
      "Implants des chirurgies de la semaine",
      "Orthodontie : accords et semestres",
      "Absences probables",
      "Droits par rôle",
    ],
    detail: [
      { libelle: "Tout ce que contient Cabinet", inclus: true },
      { libelle: "Charge des fauteuils", inclus: true },
      { libelle: "Liste d'attente commune", inclus: true },
      { libelle: "Implants des chirurgies", inclus: true },
      { libelle: "Orthodontie : accords et semestres", inclus: true },
      { libelle: "Synthèse de la semaine", inclus: false, indice: "dès Centre" },
    ],
  },
  {
    cle: "centre",
    nom: "Centre",
    texte: "7 à 10 fauteuils, une équipe.",
    conseillee: true,
    points: [
      "Tout ce que contient Groupe",
      "Synthèse de la semaine",
      "Objectifs par fauteuil",
      "Taux de réinscription",
      "Taux d'acceptation des devis",
      "Appels à refaire",
      "Accompagnement au lancement",
    ],
    detail: [
      { libelle: "Tout ce que contient Groupe", inclus: true },
      { libelle: "Synthèse de la semaine", inclus: true },
      { libelle: "Taux de réinscription et d'acceptation", inclus: true },
      { libelle: "Accompagnement au lancement", inclus: true },
      { libelle: "Plusieurs sites", inclus: false, indice: "Réseau" },
    ],
  },
  {
    cle: "reseau",
    nom: "Réseau",
    texte: "Plusieurs sites, une direction.",
    conseillee: false,
    points: [
      "Tout ce que contient Centre",
      "Un point du matin par site",
      "Synthèse pour la direction",
      "Règles de priorité communes",
    ],
    detail: [
      { libelle: "Tout ce que contient Centre", inclus: true },
      { libelle: "Un point du matin par site", inclus: true },
      { libelle: "Synthèse pour la direction", inclus: true },
    ],
  },
];

/* ── Questions fréquentes (`m9`) ────────────────────────────────────── */

export const QUESTIONS = [
  {
    q: "Faut-il changer de logiciel de cabinet ?",
    r: "Non. Tiroma se branche sur le logiciel que vous utilisez déjà et le lit, sans y écrire. Vos assistantes continuent de travailler comme aujourd'hui ; seul le point du matin s'ajoute.",
  },
  {
    q: "Que fait Tiroma de mes données patients ?",
    r: "Il les lit pour préparer le point du matin, rien de plus. Les accès sont journalisés, les droits se donnent par rôle, et vous pouvez tout exporter ou tout effacer à tout moment. Les conditions d'hébergement sont écrites dans le contrat.",
  },
  {
    q: "Qui appelle les patients ?",
    r: "Votre assistante. Tiroma dit qui appeler en premier et pourquoi ; il ne contacte jamais un patient à votre place.",
  },
  {
    q: "Comment Tiroma choisit-il le patient pour un créneau ?",
    r: "Avec les règles de votre cabinet, fixées ensemble au départ : par défaut, un plan de traitement accepté passe avant la liste d'attente, qui passe avant un contrôle dû. La durée du soin et les préférences connues du patient sont prises en compte.",
  },
  {
    q: "Et si la prothèse n'est pas revenue du laboratoire ?",
    r: "Tiroma rapproche chaque travail confié au laboratoire de sa date de pose. S'il n'est pas revenu deux jours avant, l'assistante le sait le matin même : elle relance le laboratoire ou décale la pose, et le créneau libéré est proposé à un autre patient.",
  },
  {
    q: "Tiroma suit-il les accords des mutuelles ?",
    r: "Oui. Quand la mutuelle a donné son accord, Tiroma vérifie qu'un rendez-vous a suivi. Il signale aussi le devis qui arrive à échéance, avant qu'il faille le refaire et redemander l'accord.",
  },
  {
    q: "Une annulation du matin attend-elle le lendemain ?",
    r: "Non. Tiroma lit l'agenda tout au long de la journée : une annulation saisie à 8 h remonte avec les patients qui peuvent la reprendre dans les minutes qui suivent, sans attendre le point du lendemain.",
  },
  {
    q: "Et pour l'orthodontie et les implants ?",
    r: "Tiroma signale l'accord de l'Assurance maladie dont le traitement n'a pas commencé, alors que l'accord ne vaut que six mois, et le semestre suivant qui n'a pas été posé. Pour chaque chirurgie de la semaine, il vérifie que l'implant prévu est en stock, dans la bonne référence.",
  },
  {
    q: "Combien coûte Tiroma ?",
    r: "Le prix dépend du nombre de fauteuils et de sites. Il se fixe à l'audit, en une demi-heure, avant tout engagement.",
  },
  {
    q: "Est-ce que Tiroma note mon équipe ?",
    r: "Non. La charge se lit par fauteuil et par demi-journée, jamais par personne, et la vue « charge des fauteuils » est réservée au titulaire.",
  },
];
