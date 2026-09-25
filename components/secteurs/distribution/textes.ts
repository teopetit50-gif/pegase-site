/* ══════════════════════════════════════════════════════════════════════
   Namolu (nom de travail) — les textes de /secteurs/distribution, v2
   (décalque de concurrence.com, 24/09/2026)

   Chaque emplacement de la référence reçoit un texte vrai de même forme.
   Les faits viennent des trois rapports d'instruction du 24/09
   (OMEGA/plans-et-decisions/secteurs/groupes-*-2026-09.md) et, pour la
   sécurité, de ce qu'omegaai.fr affirme déjà sur /vos-donnees.

   Ce qui n'est pas repris, à dessein (règles maison) :
   • leurs logos clients (bandeau)            → les métiers des groupes ;
   • leurs chiffres de résultat (10M+, 24x)    → de grands chiffres du secteur, sourcés ;
   • leurs témoignages signés                  → le problème de chaque module ;
   • leurs certifications (SOC 2, HIPAA)       → nos engagements écrits ;
   • leurs financeurs                          → les territoires servis ;
   • leurs articles de blog                    → les trois modules.
   Aucun groupe nommé, aucun gain promis en pourcentage, aucun prix. Les
   enseignes des cartes sont citées à titre d'illustration (voir ENSEIGNES).
   ══════════════════════════════════════════════════════════════════════ */

export const HEROS = {
  surtitre: "Namolu, par Omega",
  titre: "Chaque magasin, chaque île, sur un seul point du matin.",
  chapo: "Un calcul chaque matin sur vos ventes, vos stocks et vos conteneurs en mer.",
  bouton: "Réserver un audit",
  bandeau: "Pensé pour les groupes de distribution d'outre-mer",
};

/* leur bandeau de logos clients : les métiers des groupes (rapports, § 1) */
export const METIERS = [
  "Bricolage",
  "Hypermarchés",
  "Supermarchés",
  "Négoce de matériaux",
  "Sport",
  "Meuble",
  "Électroménager",
  "Jouets",
  "Jardinerie",
  "Équipement de la maison",
];

/* le visuel du hero : ce que Namolu sort un matin (données d'exemple) */
export const DECISIONS = [
  "Compléter le conteneur du 8 octobre",
  "Faire venir 60 disjoncteurs par avion",
  "Transférer 140 ventilateurs entre îles",
  "Démarquer les salons de jardin",
  "Préparer la saison cyclonique",
  "Commander le frais du bateau de lundi",
  "Réduire la tomate importée",
  "Répartir le conteneur de Noël",
  "Garder les canapés au dépôt 2",
  "Rééquilibrer le rayon peinture",
  "Commander les bâches avant juin",
  "Solder la crèmerie en date courte",
  "Retenir 24 groupes électrogènes",
  "Avancer la commande de contreplaqué",
];

/* leurs trois chiffres de résultat (10M+, 24x, 100 %) : de GRANDS chiffres
   vrais, ceux du secteur, sourcés sous la rangée. Teo, 25/09 : « eux c'est
   des gros chiffres, nous ça fait amateur des petits chiffres » (3, 7 h,
   0 avant). Espaces fines insécables dans les milliers. */
export const CHIFFRES = [
  { valeur: "34\u202f000", libelle: "Références dans un réseau de quatre magasins" },
  { valeur: "2\u202f500", libelle: "Conteneurs importés chaque année par ce réseau" },
  { valeur: "33\u202f%", libelle: "Du coût d'achat part en frais d'approche" },
];
export const CHIFFRES_SOURCE =
  "Réseau de bricolage à La Réunion : Le Moniteur, 2020. Frais d'approche en Martinique : Autorité de la concurrence, avis 26-A-01.";

/* leurs trois témoignages : le problème que règle chaque module */
export const PROBLEMES = [
  {
    module: "Bricolage",
    texte:
      "« Le prochain départ est dans six jours. Ce qui n'entre pas dans ce conteneur arrivera après la rupture, sauf par avion. »",
    ligne1: "Module bricolage",
    ligne2: "Le conteneur, la saison cyclonique, le stock qui dort",
  },
  {
    module: "Frais",
    texte:
      "« Le frais part par bateau une fois par semaine, et par avion quand la date limite ne tiendrait pas la traversée. »",
    ligne1: "Module frais",
    ligne2: "Le bateau ou l'avion, l'arrivage local, les dates courtes",
  },
  {
    module: "Spécialisé",
    texte:
      "« Le conteneur de Noël se commande en été. Ce qu'on y met décide de ce qui manquera en décembre. »",
    ligne1: "Module spécialisé",
    ligne2: "Le temps fort, la répartition entre îles, l'encombrant",
  },
];

/* leur bloc « Security for critical operations » : ce que /vos-donnees
   affirme déjà (Francfort, aucune réplication hors UE, TLS et chiffrement
   au repos, journal exportable, serveur dans vos locaux sur demande) */
export const SECURITE = {
  titre: "Vos données, sous votre contrôle.",
  cartes: [
    { titre: "Lecture seule", sous: "Aucune écriture dans vos logiciels" },
    { titre: "Union européenne", sous: "Hébergé à Francfort, sans réplication" },
    { titre: "Chiffrement", sous: "En transit et au repos" },
    { titre: "Journal", sous: "Chaque décision tracée et exportable" },
  ],
  surDemande: "Sur demande",
  options: ["Serveur dans vos locaux", "Conteneurs isolés", "Disque chiffré"],
  lien: "Où vivent vos données",
};

/* 25/09 — Teo : « à la place des photos, mets des enseignes françaises
   pour chaque secteur, Mr Bricolage pour le bricolage… ; c'est légal tant
   qu'on ne dit pas qu'on travaille avec eux, et j'ai l'autorisation des
   magasins de chaque secteur en Guadeloupe ». Photos Wikimedia Commons
   (licences libres, crédits sous les cartes et dans CREDITS.txt) ; la
   ligne du pied précise « à titre d'illustration ». `cadrage` : la
   position de la photo dans la carte, pour garder le logo entier. */
export const ENSEIGNES = {
  titre: "Pensé pour chaque enseigne du groupe.",
  cartes: [
    { nom: "Mr.Bricolage", secteur: "Bricolage", image: "/secteurs-distribution/enseigne-mrbricolage.jpg", cadrage: "60% 40%" },
    { nom: "Carrefour", secteur: "Alimentaire", image: "/secteurs-distribution/enseigne-carrefour.jpg", cadrage: "47% 50%" },
    { nom: "Conforama", secteur: "Maison", image: "/secteurs-distribution/enseigne-conforama.jpg", cadrage: "35% 50%" },
    { nom: "Decathlon", secteur: "Sport", image: "/secteurs-distribution/enseigne-decathlon.jpg", cadrage: "22% 40%" },
  ],
  pied: "Votre enseigne n'est pas dans la liste ? Namolu sert la plupart des magasins d'un groupe.",
  lien: "Parlons-en.",
  mention:
    "Enseignes citées à titre d'illustration, sans lien commercial. Photos Wikimedia Commons : Micki (CC BY-SA 3.0), GD13 (CC BY 4.0), Tabl-trai et Chabe01 (CC BY-SA 4.0).",
};

/* leur « Digital Residency » : la méthode, en trois temps */
export const METHODE = {
  titre: "La méthode Namolu",
  sousTitre: "Un calcul sur vos propres chiffres, validé par vos équipes avant chaque décision.",
  bouton: "Réserver un audit",
  onglets: [
    {
      nom: "Lire",
      titre: "Lire",
      texte:
        "Namolu lit vos ventes, vos stocks, vos commandes en cours et les fichiers de vos transitaires, magasin par magasin, en lecture seule.",
    },
    {
      nom: "Calculer",
      titre: "Calculer",
      texte:
        "Chaque matin, le calcul croise le rythme de vente, le délai de mer et le prochain départ, pour chaque référence et chaque île.",
    },
    {
      nom: "Proposer",
      titre: "Proposer",
      texte:
        "À 7 h, la direction des achats reçoit au plus trois décisions, chacune avec sa raison et son chiffre. Rien ne part sans sa validation.",
    },
  ],
  integration: {
    titre: "Branché sur vos logiciels, sans jamais y écrire.",
    texte:
      "Namolu lit votre ERP, vos caisses, votre entrepôt et les fichiers de vos transitaires. Les données sont hébergées dans l'Union européenne, chiffrées, et chaque décision est inscrite au journal.",
  },
};

/* le bandeau des intégrations : les sources lues, jamais nos outils */
export const SOURCES = [
  "ERP",
  "Caisses",
  "Entrepôt",
  "Transitaires",
  "Fournisseurs",
  "Fichiers Excel",
  "Commandes en cours",
  "Vigilance météo",
];

/* leur « AI built for your care model » : les quatre étapes */
export const ETAPES = {
  titre: "Un point du matin fait pour votre groupe",
  sousTitre: ["Des décisions calées sur vos magasins,", "vos îles et vos départs."],
  bouton: "Réserver un audit",
  liste: [
    {
      nom: "Audit",
      titre: "Audit",
      texte:
        "Trente minutes pour regarder vos ventes, vos stocks et vos prochains départs, et choisir le premier module.",
    },
    {
      nom: "Branchement",
      titre: "Branchement",
      texte: "Namolu se branche en lecture seule sur votre ERP, vos caisses et les fichiers de vos transitaires.",
    },
    {
      nom: "Pilote",
      titre: "Pilote",
      texte: "Un module, un groupe et une île pour commencer, jugés sur une saison entière.",
    },
    {
      nom: "Suivi",
      titre: "Suivi",
      texte: "Chaque décision est inscrite au journal : ce qui a été validé, refusé, et pourquoi.",
    },
  ],
  devise: "Calcul déterministe. Validation humaine.",
  faits: [
    { valeur: "7 h", libelle: "Le point du matin, chaque jour" },
    { valeur: "3", libelle: "Décisions au plus, chacune justifiée" },
    { valeur: "100 %", libelle: "Des décisions validées par vos équipes" },
  ],
};

/* leur « A partnership focused on time-to-value » : le pilote */
export const PILOTE = {
  titre: "Un pilote jugé sur une saison entière.",
  texte:
    "Nous commençons par un module, un groupe et une île. Le pilote se juge sur une saison complète : la saison cyclonique, Noël ou les soldes du département.",
  bouton: "Réserver un audit",
  mois: ["Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov."],
  etiquette: "Saison cyclonique aux Antilles",
};

/* leurs financeurs : les territoires que Namolu sert */
export const TERRITOIRES = {
  titre: "Pensé pour l'outre-mer",
  grands: ["Antilles", "Océan Indien"],
  petits: ["Guadeloupe", "Martinique", "Guyane", "La Réunion", "Mayotte"],
};

/* leurs trois articles : les trois modules */
export const MODULES = {
  titre: "Les trois modules de Namolu.",
  bouton: "Réserver un audit",
  cartes: [
    {
      titre: "Bricolage : le prochain conteneur",
      texte:
        "Le conteneur à compléter, la saison cyclonique préparée avant juin et le stock qui dort transféré ou démarqué.",
      image: "/secteurs-distribution/carte-conteneur.jpg",
    },
    {
      titre: "Frais : le bateau ou l'avion",
      texte:
        "La commande du frais par bateau ou par avion, l'arrivage des producteurs locaux et les dates courtes, rayon par rayon.",
      image: "/secteurs-distribution/carte-frais.jpg",
    },
    {
      titre: "Spécialisé : le temps fort",
      texte:
        "Le temps fort acheté six mois avant, le conteneur de Noël réparti entre magasins et îles, l'encombrant livré du bon dépôt.",
      image: "/secteurs-distribution/carte-entrepot.jpg",
    },
  ],
};

export const APPEL = {
  titre: "Le point du matin des groupes de distribution.",
  bouton: "Réserver un audit",
};

export const AUDIT = "/reserver-un-audit";
