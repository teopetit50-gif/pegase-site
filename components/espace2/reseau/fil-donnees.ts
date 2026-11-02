/* ══════════════════════════════════════════════════════════════════════
   Réseau Omega · Fil — le contenu de démonstration (02/11/2026)

   ENTIÈREMENT FICTIF, comme les membres (membres.ts) : montré seulement en
   « Données d'exemple » (reseauEnExemple, source.ts). Deux sortes de
   publications :
     · les DEMANDES d'un membre au réseau (« je cherche… », « j'ai en
       trop… »), avec les réponses et ceux qui peuvent aider ;
     · les ALERTES TERRAIN (port, coupure, météo), qu'on peut épingler.
   « Vous » (l'organisation connectée) n'écrit rien ici : ses publications
   et ses réponses naissent dans la page, en état local.

   Les heures sont des écarts en minutes (« il y a… ») et non des dates :
   le rendu du serveur et celui du navigateur disent la même chose.
   ══════════════════════════════════════════════════════════════════════ */

import { MEMBRES, type Ile, type Membre } from "./membres";

export type TypePublication = "demande" | "alerte";
export type GenreAlerte = "port" | "coupure" | "meteo";

/** L'auteur : le slug d'un membre, ou « vous » (l'organisation connectée). */
export type Auteur = string;
export const VOUS: Auteur = "vous";

export type Reponse = { id: string; auteur: Auteur; ilYa: number; texte: string };

export type Publication = {
  id: string;
  type: TypePublication;
  auteur: Auteur;
  /** Minutes écoulées depuis la publication. */
  ilYa: number;
  titre: string;
  texte: string;
  /** L'île concernée : celle de l'auteur, ou celle de l'alerte. */
  ile: Ile;
  /** Une alerte : le lieu et ce qu'elle concerne. */
  lieu?: string;
  genre?: GenreAlerte;
  /** Une demande : pour quand. */
  quand?: string;
  /** Les membres qui ont dit « Je peux aider ». */
  aident: string[];
  reponses: Reponse[];
  /** Une alerte épinglée à l'ouverture du fil. */
  epinglee?: boolean;
};

export const PUBLICATIONS: Publication[] = [
  {
    id: "p-meteo",
    type: "alerte",
    genre: "meteo",
    auteur: "bwa-vert-btp",
    ilYa: 95,
    titre: "Vigilance orange fortes pluies et orages ce soir",
    texte: "La Guadeloupe passe en vigilance orange à partir de 18 h, jusqu'à demain midi. Sur nos chantiers on bâche, on descend les échafaudages et on décale les coulages. Pensez aux livraisons prévues demain matin.",
    ile: "Guadeloupe",
    lieu: "Toute la Guadeloupe",
    aident: [],
    epinglee: true,
    reponses: [
      { id: "r-meteo-1", auteur: "karuko-fret", ilYa: 70, texte: "Les enlèvements de demain matin à Jarry sont maintenus, mais on ne livre pas sur les hauteurs avant 14 h." },
      { id: "r-meteo-2", auteur: "garage-kalbas", ilYa: 41, texte: "Merci. On ferme l'atelier à 17 h ce soir, les véhicules de prêt sont rentrés." },
    ],
  },
  {
    id: "p-electricien",
    type: "demande",
    auteur: "atelier-moko",
    ilYa: 25,
    titre: "Je cherche un électricien dispo cette semaine",
    texte: "Chantier de menuiseries à Petit-Bourg : deux prises à déplacer et une ligne à tirer pour un volet roulant motorisé. Une demi-journée, jeudi ou vendredi. Paiement à la fin du chantier.",
    ile: "Guadeloupe",
    quand: "Jeudi ou vendredi",
    aident: ["solelek"],
    reponses: [
      { id: "r-elec-1", auteur: "solelek", ilYa: 18, texte: "Nous sommes en Martinique, mais notre équipe passe à Baie-Mahault jeudi pour un autre client. Je vous envoie un message pour caler l'heure." },
    ],
  },
  {
    id: "p-jarry",
    type: "alerte",
    genre: "port",
    auteur: "karuko-fret",
    ilYa: 180,
    titre: "Retard du porte-conteneurs au port de Jarry",
    texte: "Le navire parti du Havre le 18 octobre arrive avec quatre jours de retard : déchargement prévu jeudi au lieu de dimanche. Les groupages de la semaine sortent vendredi au plus tôt. Prévenez vos clients si vous attendez de la marchandise.",
    ile: "Guadeloupe",
    lieu: "Port de Jarry",
    aident: [],
    reponses: [
      { id: "r-jarry-1", auteur: "atelier-moko", ilYa: 160, texte: "Nos vitrages sont dedans. Vous savez si le dépotage peut se faire samedi matin ?" },
      { id: "r-jarry-2", auteur: "karuko-fret", ilYa: 150, texte: "Samedi 8 h si le conteneur est contrôlé vendredi. Je vous tiens au courant." },
      { id: "r-jarry-3", auteur: "kaz-zepis", ilYa: 120, texte: "Merci pour l'info, on décale la vente des paniers de Noël d'une semaine." },
    ],
  },
  {
    id: "p-palettes",
    type: "demande",
    auteur: "kaz-zepis",
    ilYa: 300,
    titre: "J'ai 3 palettes de surplus",
    texte: "Trois palettes de cartons de transport neufs (40 × 30 × 30), en trop après une commande. À donner contre enlèvement au Gosier, avant samedi.",
    ile: "Guadeloupe",
    quand: "Avant samedi",
    aident: ["emballa-kreyol", "garage-kalbas"],
    reponses: [
      { id: "r-pal-1", auteur: "garage-kalbas", ilYa: 260, texte: "Une palette nous rendrait service pour l'expédition des pièces. Je peux passer mercredi." },
      { id: "r-pal-2", auteur: "emballa-kreyol", ilYa: 210, texte: "On prend le reste. Et pour la prochaine fois, on fabrique ces formats à Baie-Mahault dès 200 pièces." },
    ],
  },
  {
    id: "p-coupure",
    type: "alerte",
    genre: "coupure",
    auteur: "solelek",
    ilYa: 420,
    titre: "Coupure d'électricité prévue au Lamentin mardi matin",
    texte: "Travaux sur le réseau dans la zone de la Lézarde, mardi de 8 h à 12 h. Pensez aux chambres froides et aux caisses enregistreuses. Nous avons deux groupes électrogènes disponibles à la location.",
    ile: "Martinique",
    lieu: "Le Lamentin, zone de la Lézarde",
    aident: [],
    reponses: [{ id: "r-coup-1", auteur: "frigo-tropik", ilYa: 380, texte: "Nos clients de la zone sont prévenus. On garde un technicien d'astreinte mardi matin." }],
  },
  {
    id: "p-groupement",
    type: "demande",
    auteur: "bwa-vert-btp",
    ilYa: 1440,
    titre: "Partenaires pour un groupement : rénovation de trois écoles aux Abymes",
    texte: "Marché public en trois lots, remise des offres le 20 novembre. Nous prenons le gros œuvre ; il nous faut un électricien et un menuisier pour répondre ensemble. Visite des sites possible lundi.",
    ile: "Guadeloupe",
    quand: "Avant le 20 novembre",
    aident: ["atelier-moko"],
    reponses: [
      { id: "r-grp-1", auteur: "atelier-moko", ilYa: 1300, texte: "Intéressés pour le lot menuiseries. On peut venir à la visite de lundi." },
      { id: "r-grp-2", auteur: "kontab-ile", ilYa: 1200, texte: "Pour le dossier de candidature du groupement, je peux vous aider sur les pièces administratives." },
    ],
  },
  {
    id: "p-gaz",
    type: "demande",
    auteur: "frigo-tropik",
    ilYa: 2880,
    titre: "Qui est partant pour un achat groupé de gaz réfrigérant ?",
    texte: "Nous commandons du R32 pour le premier trimestre. À plusieurs, on passe le seuil de remise du fournisseur et on partage le fret. Il nous manque deux ou trois entreprises.",
    ile: "Martinique",
    quand: "Commande avant le 15 novembre",
    aident: [],
    reponses: [],
  },
  {
    id: "p-chaises",
    type: "demande",
    auteur: "lanmou-traiteur",
    ilYa: 4320,
    titre: "Je cherche 40 chaises et 6 mange-debout pour samedi 14",
    texte: "Cocktail d'entreprise à Fort-de-France, 250 invités. Location ou prêt, livraison vendredi soir, retour dimanche.",
    ile: "Martinique",
    quand: "Samedi 14",
    aident: [],
    reponses: [],
  },
  {
    id: "p-pieces",
    type: "demande",
    auteur: "garage-kalbas",
    ilYa: 5760,
    titre: "Un fournisseur de pièces avec du stock en Guadeloupe ?",
    texte: "Nos commandes de plaquettes et de filtres attendent trois semaines la métropole. On cherche un grossiste qui a le stock sur place, quitte à payer un peu plus cher.",
    ile: "Guadeloupe",
    aident: ["karuko-fret"],
    reponses: [{ id: "r-pie-1", auteur: "karuko-fret", ilYa: 5500, texte: "Pas de stock chez nous, mais un groupage mensuel diviserait vos délais par deux. On en parle ?" }],
  },
];

export const membreDe = (slug: string): Membre | undefined => MEMBRES.find((m) => m.slug === slug);

/** « il y a 25 min », « il y a 3 h », « hier », « il y a 4 j » */
export function ilYa(minutes: number): string {
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 1440) return `il y a ${Math.floor(minutes / 60)} h`;
  if (minutes < 2880) return "hier";
  return `il y a ${Math.floor(minutes / 1440)} j`;
}

/** Les initiales d'un nom : « Atelier Moko » → « AM » */
export const initiales = (nom: string) =>
  nom
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m.charAt(0).toUpperCase())
    .join("");
