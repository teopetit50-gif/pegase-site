/* Réseau Omega › Messages — les conversations de démonstration.

   ENTIÈREMENT FICTIF, comme membres.ts : montré seulement en « Données
   d'exemple ». En « Base réelle », la page ne lit rien d'ici (le réseau
   n'a encore aucune table : docs/reseau-espace2/schema-messages.sql).

   « vous » (l'auteur VOUS) est TOUJOURS l'organisation connectée d'Espace
   2 (OrganisationContexte, « CAMA » en exemple), jamais un des 12 membres.
   Dans un texte, `@slug` mentionne un membre et `@vous` l'organisation
   connectée.

   Les dates sont des écarts en jours (0 = aujourd'hui, 1 = hier) et une
   heure locale : la page les pose sur l'horloge du navigateur, jamais sur
   celle du serveur (horloge.ts). */

import { MEMBRES, type Membre } from "./membres";

export const VOUS = "vous";

export type Reaction = { emoji: string; qui: string[] };

export type Message = {
  id: string;
  /** slug d'un membre, ou VOUS */
  auteur: string;
  /** jours avant aujourd'hui */
  jour: number;
  /** HH:MM, heure locale */
  heure: string;
  texte: string;
  reponses?: Message[];
  reactions?: Reaction[];
};

export type GenreSalon = "ile" | "secteur" | "alertes";

export type Salon = {
  id: string;
  nom: string;
  genre: GenreSalon;
  sujet: string;
  membres: string[];
  messages: Message[];
  /** messages non lus à l'arrivée (les derniers du salon) */
  nonLus: number;
};

export type Prive = {
  slug: string;
  messages: Message[];
  nonLus: number;
};

export type Presence = "en-ligne" | "absent";

const tous = MEMBRES.map((m) => m.slug);
const dIle = (ile: Membre["ile"]) => MEMBRES.filter((m) => m.ile === ile).map((m) => m.slug);

export const membre = (slug: string): Membre | undefined => MEMBRES.find((m) => m.slug === slug);

/* la présence de démonstration : qui a l'application ouverte en ce moment */
const EN_LIGNE = new Set(["karuko-fret", "imprim-alize", "atelier-moko", "kaz-zepis", "garage-kalbas", "nauti-sable"]);
export const presenceDe = (slug: string): Presence => (EN_LIGNE.has(slug) ? "en-ligne" : "absent");

let n = 0;
const m = (auteur: string, jour: number, heure: string, texte: string, extra: Partial<Message> = {}): Message => ({ id: `m${++n}`, auteur, jour, heure, texte, ...extra });
const r = (emoji: string, ...qui: string[]): Reaction => ({ emoji, qui });

export const SALONS: Salon[] = [
  {
    id: "alertes",
    nom: "Alertes",
    genre: "alertes",
    sujet: "Alertes terrain des deux îles : météo, port, routes, coupures. Une alerte par message, les échanges en fil.",
    membres: tous,
    nonLus: 1,
    messages: [
      m("karuko-fret", 6, "06:30", "Grève des dockers annoncée au port de Jarry lundi : prévoyez vos enlèvements avant vendredi soir.", { reactions: [r("🙏", "atelier-moko", "kaz-zepis", "garage-kalbas", VOUS)] }),
      m("bwa-vert-btp", 2, "19:10", "Vigilance jaune fortes pluies sur la Basse-Terre jusqu'à demain midi. Chantiers en extérieur à sécuriser.", {
        reponses: [m("atelier-moko", 2, "19:24", "Merci, on décale la pose de Petit-Bourg à jeudi.")],
      }),
      m("nauti-sable", 0, "06:45", "Vigilance houle en Martinique ce week-end sur la côte Atlantique. Les sorties en mer sont suspendues samedi."),
    ],
  },
  {
    id: "guadeloupe",
    nom: "Guadeloupe",
    genre: "ile",
    sujet: "Les entreprises du réseau en Guadeloupe : demandes, coups de main, bons plans.",
    membres: dIle("Guadeloupe"),
    nonLus: 2,
    messages: [
      m("kontab-ile", 2, "08:12", "Rappel : la déclaration de TVA d'octobre est à déposer avant le 19/11. Si quelqu'un a un doute sur l'octroi de mer, je fais un point en visio jeudi à 12 h.", {
        reactions: [r("🙏", "kaz-zepis", "imprim-alize", "atelier-moko"), r("👍", VOUS)],
      }),
      m("atelier-moko", 1, "17:40", "Quelqu'un a un transitaire fiable pour faire venir des vitrages feuilletés depuis Le Havre ? Notre dernier conteneur a pris trois semaines de retard au port.", {
        reponses: [
          m("karuko-fret", 1, "17:52", "Oui, nous. Groupage mensuel, prochain départ le 14/11. Je vous envoie les conditions en privé."),
          m(VOUS, 1, "18:03", "On a fait venir des pare-brise avec @karuko-fret en septembre : rien à redire sur les délais."),
          m("atelier-moko", 1, "18:10", "Parfait, merci à vous deux."),
        ],
      }),
      m("emballa-kreyol", 1, "18:05", "Petite nouvelle : on fait maintenant des étuis en petites séries dès 200 pièces, impression comprise. Si vous importez vos cartons, comparez avant votre prochaine commande.", {
        reactions: [r("👏", "kaz-zepis", "kontab-ile")],
      }),
      m("bwa-vert-btp", 0, "07:55", "Bonjour à tous. Coupure d'eau annoncée aux Abymes demain de 8 h à 14 h, pensez-y pour vos chantiers."),
      m("imprim-alize", 0, "09:20", "@vous vous parliez d'une nouvelle enseigne pour le showroom : on a une nacelle libre la semaine prochaine si vous voulez qu'on passe prendre les mesures."),
      m("kaz-zepis", 0, "09:31", "Pour les paniers de fin d'année, on prend les commandes d'entreprise jusqu'au 5/12. Livraison offerte en Grande-Terre."),
    ],
  },
  {
    id: "martinique",
    nom: "Martinique",
    genre: "ile",
    sujet: "Les entreprises du réseau en Martinique : demandes, coups de main, bons plans.",
    membres: dIle("Martinique"),
    nonLus: 1,
    messages: [
      m("solelek", 3, "10:02", "On cherche un couvreur partenaire dans le Centre pour des poses photovoltaïques en janvier. Trois chantiers déjà signés.", {
        reponses: [
          m("frigo-tropik", 3, "10:40", "Je vous mets en relation avec celui qui a refait nos toitures à Ducos."),
          m("solelek", 3, "10:44", "Volontiers, merci."),
        ],
      }),
      m("lanmou-traiteur", 1, "12:15", "Quelqu'un loue des tentes et des tables pour 300 personnes autour de Fort-de-France ? Événement le 21/11."),
      m("nauti-sable", 0, "08:47", "Houle annoncée ce week-end : on suspend les sorties de samedi. Si vous aviez réservé pour vos équipes, on reporte sans frais."),
    ],
  },
  {
    id: "auto",
    nom: "Auto",
    genre: "secteur",
    sujet: "Garages, concessions, pièces, flottes et mécanique.",
    membres: ["garage-kalbas", "nauti-sable", "frigo-tropik", "karuko-fret"],
    nonLus: 1,
    messages: [
      m("garage-kalbas", 4, "14:30", "Qui a encore du stock local en plaquettes pour utilitaires ? Nos commandes en métropole mettent dix jours.", {
        reponses: [
          m(VOUS, 4, "14:41", "On en a au magasin de Jarry. Passez par le comptoir pièces, je préviens l'équipe."),
          m("garage-kalbas", 4, "14:45", "Top, je passe demain matin."),
        ],
      }),
      m("nauti-sable", 1, "09:05", "Je cherche toujours un mécanicien pour moteurs hors-bord, idéalement avec un camion atelier. @garage-kalbas vous faites ça ?", {
        reponses: [m("garage-kalbas", 1, "09:30", "Pas les hors-bord, désolé. Mais je connais quelqu'un au Marin : je vous envoie son numéro en privé.")],
      }),
      m("frigo-tropik", 0, "10:12", "@vous on a deux utilitaires frigorifiques à remplacer l'an prochain. Quels sont vos délais sur les fourgons aménagés ?"),
    ],
  },
  {
    id: "btp",
    nom: "BTP",
    genre: "secteur",
    sujet: "Bâtiment, second œuvre et marchés publics. Les groupements se montent ici.",
    membres: ["atelier-moko", "bwa-vert-btp", "solelek", "frigo-tropik", "imprim-alize"],
    nonLus: 2,
    messages: [
      m("bwa-vert-btp", 5, "16:00", "Appel d'offres de la Région pour la rénovation de trois collèges : on monte un groupement. Il nous manque un lot menuiseries et un lot électricité.", {
        reponses: [
          m("atelier-moko", 5, "16:22", "Partants pour les menuiseries. On regarde le dossier de consultation ce soir."),
          m("solelek", 5, "17:05", "L'électricité, c'est bon pour nous : on a fait le même type de chantier au Lamentin."),
          m("bwa-vert-btp", 5, "17:20", "Super. Réunion jeudi à 18 h à nos bureaux des Abymes ?"),
        ],
        reactions: [r("💪", "atelier-moko", "solelek")],
      }),
      m("imprim-alize", 0, "07:30", "On cherche un sous-traitant pour de la pose en hauteur (enseignes, de 6 à 8 m). Quelqu'un a une équipe habilitée ?"),
      m("atelier-moko", 0, "08:02", "Attention : rupture annoncée sur les profilés alu chez notre fournisseur de Jarry jusqu'à mi-décembre."),
    ],
  },
  {
    id: "restauration",
    nom: "Restauration",
    genre: "secteur",
    sujet: "Restaurants, traiteurs, épiceries et métiers de bouche.",
    membres: ["lanmou-traiteur", "kaz-zepis", "frigo-tropik", "emballa-kreyol"],
    nonLus: 0,
    messages: [
      m("lanmou-traiteur", 2, "11:00", "On réfléchit à un achat groupé de barquettes compostables. Qui serait intéressé ?", {
        reponses: [
          m("kaz-zepis", 2, "11:18", "Nous, environ 2 000 par mois."),
          m("emballa-kreyol", 2, "12:02", "On peut les fabriquer ici : je prépare un chiffrage pour le groupe."),
        ],
      }),
      m("frigo-tropik", 1, "15:22", "Rappel avant la saison : un contrôle d'étanchéité des chambres froides évite la plupart des pannes de décembre. Il nous reste des créneaux."),
    ],
  },
  {
    id: "commerce",
    nom: "Commerce",
    genre: "secteur",
    sujet: "Boutiques, distribution, services aux entreprises.",
    membres: ["kaz-zepis", "emballa-kreyol", "imprim-alize", "karuko-fret", "kontab-ile"],
    nonLus: 0,
    messages: [
      m("kontab-ile", 3, "09:14", "Pour ceux qui ouvrent une boutique : les aides régionales à l'investissement rouvrent le 1er décembre. Le dossier se prépare en amont."),
      m("kaz-zepis", 1, "11:48", "On cherche un fournisseur d'emballages local pour nos coffrets. @emballa-kreyol, on peut se voir ?", {
        reponses: [m("emballa-kreyol", 1, "12:10", "Avec plaisir. Mardi matin à Baie-Mahault ?")],
      }),
    ],
  },
];

export const PRIVES: Prive[] = [
  {
    slug: "karuko-fret",
    nonLus: 1,
    messages: [
      m("karuko-fret", 1, "18:20", "Bonjour, je reviens vers vous pour le groupage de novembre : il reste 4 m³ dans le conteneur du 14/11."),
      m(VOUS, 1, "18:34", "Bonjour, il nous faudrait 2 m³ pour des pièces de carrosserie."),
      m("karuko-fret", 1, "18:36", "Noté, je vous réserve la place. Je vous envoie la cotation demain."),
      m("karuko-fret", 0, "08:15", "Cotation envoyée par e-mail. Départ confirmé le 14/11, arrivée prévue le 2/12."),
    ],
  },
  {
    slug: "imprim-alize",
    nonLus: 1,
    messages: [
      m(VOUS, 3, "16:02", "Bonjour, on voudrait refaire l'enseigne du showroom avant les fêtes. Vous pourriez nous faire une proposition ?"),
      m("imprim-alize", 0, "09:24", "Je vous mets ici les dimensions de la façade relevées l'an dernier, ça peut servir de base : 9,40 m sur 1,20 m."),
    ],
  },
  {
    slug: "kontab-ile",
    nonLus: 0,
    messages: [
      m(VOUS, 4, "17:30", "Merci pour l'atelier sur la TVA, c'était très clair."),
      m("kontab-ile", 4, "17:42", "Avec plaisir. N'hésitez pas si vous avez une question sur la clôture."),
    ],
  },
  {
    slug: "garage-kalbas",
    nonLus: 0,
    messages: [
      m("garage-kalbas", 4, "14:46", "Je passe demain matin au comptoir pour les plaquettes."),
      m(VOUS, 4, "14:50", "Parfait, c'est préparé au nom de Garage Kalbas."),
    ],
  },
];

/** Les mentions de l'organisation connectée parmi les derniers messages non lus. */
export const mentionsVous = (messages: Message[], nonLus: number) => messages.slice(messages.length - nonLus).filter((x) => /@vous\b/.test(x.texte)).length;
