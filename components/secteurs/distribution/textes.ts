/* ══════════════════════════════════════════════════════════════════════
   Namolu (nom de travail, 24/09/2026) — les textes de /secteurs/distribution

   Le produit « groupes » : un seul produit, trois modules (bricolage,
   frais, spécialisé), pour les groupes de distribution d'outre-mer. Tout
   fait avancé ici vient des trois rapports d'instruction du 24/09 :
   OMEGA/plans-et-decisions/secteurs/groupes-{bricolage,supermarches,
   grandes-surfaces-specialisees}-2026-09.md, sources citées dedans.

   Ce qui n'est PAS ici, à dessein (règles maison) :
   • aucun client, logo ni témoignage — la référence (toolio.com) en est
     pleine ; les emplacements portent des métiers, des faits de secteur
     sourcés et des faits de conception ;
   • aucun pourcentage de gain promis : aucun chiffre de démarque ni de
     rupture outre-mer n'est publié (rapports, § « points durs ») ;
   • aucun prix ; aucun outil à nous nommé ;
   • aucun groupe nommé : « ne pas prêter une enseigne à un groupe ».
   ══════════════════════════════════════════════════════════════════════ */

export const HEROS = {
  ligne1: "Chaque conteneur",
  ligne2: "au bon départ",
  chapo:
    "Chaque matin, Namolu lit les ventes, les stocks et les conteneurs en mer de votre groupe, puis dit quoi commander, quoi faire venir par avion, quoi transférer d'une île à l'autre et quoi démarquer.",
  bouton: "Réserver un audit",
};

/* le bandeau de la référence porte des logos clients : ici, les métiers
   des groupes que Namolu sert (rapports, § 1 « le terrain ») */
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

export const ATOUTS = [
  {
    titre: "Trois décisions par matin, pas un tableau de plus",
    texte:
      "À 7 h, la direction des achats et chaque directeur de magasin reçoivent au plus trois décisions, chacune avec sa raison et son chiffre, par e-mail ou sur WhatsApp. Les articles du bouclier qualité-prix passent en premier.",
    lien: "Le point du matin",
    ancre: "#modules",
  },
  {
    titre: "Le conteneur comme unité de décision",
    texte:
      "Pour chaque fournisseur dont le départ approche : les références, les quantités, le remplissage et la date de rupture si l'on ne commande pas. Ce qui arriverait après la rupture part par avion.",
    lien: "Le module Conteneur",
    ancre: "#modules",
  },
  {
    titre: "Chaque magasin, chaque île",
    texte:
      "La couverture en semaines, magasin par magasin et île par île. Namolu propose le transfert vers le magasin où l'article se vend, ou la démarque avant les soldes du département, dans les règles de la loi AGEC.",
    lien: "Le stock qui dort",
    ancre: "#modules",
  },
  {
    titre: "Au-dessus de ce que vous avez déjà",
    texte:
      "Namolu lit votre ERP, vos caisses, votre entrepôt et les fichiers de vos transitaires, en lecture seule. Vos équipes n'ont rien à ressaisir ni à remplacer, et rien ne part sans leur validation.",
    lien: "Les sources lues",
    ancre: "#modules",
  },
];

/* leur « Results in months, not years » : des chiffres de performance
   client. Ici, des faits de conception, vrais pour tous les groupes. */
export const GARANTIES = {
  titre: "Ce que Namolu tient chaque matin",
  faits: [
    { chiffre: "7 h", libelle: "Le point du matin, chaque jour" },
    { chiffre: "3", libelle: "Décisions au plus, chacune justifiée" },
    { chiffre: "0", libelle: "Écriture dans vos logiciels" },
    { chiffre: "100 %", libelle: "Des décisions validées par vos équipes" },
  ],
};

/* leurs trois onglets (Merchandise Plan, Assortment Item Plan,
   Allocation) : nos trois modules, un par métier du groupe */
export const MODULES = [
  {
    cle: "bricolage",
    onglet: "Bricolage",
    titre: "Bricolage",
    texte:
      "Le prochain conteneur à compléter, la saison cyclonique préparée avant juin et le stock qui dort transféré ou démarqué.",
    lien: "Tester sur vos données",
  },
  {
    cle: "frais",
    onglet: "Frais",
    titre: "Frais",
    texte:
      "La commande du frais par bateau ou par avion, l'arrivage des producteurs locaux et les dates courtes, rayon par rayon.",
    lien: "Tester sur vos données",
  },
  {
    cle: "specialise",
    onglet: "Spécialisé",
    titre: "Spécialisé",
    texte:
      "Le temps fort acheté six mois avant, le conteneur de Noël réparti entre magasins et îles, l'encombrant livré du bon dépôt.",
    lien: "Tester sur vos données",
  },
];

/* leur carrousel de témoignages : des situations de secteur, sans
   personne nommée. Les chiffres sont publics et sourcés ; la phrase en
   italique est le problème, écrit par nous, pas une citation. */
export const CAS = [
  {
    etiquette: "Bricolage",
    contexte:
      "Dans un réseau de quatre magasins de bricolage outre-mer, le réassort se décide en départs de conteneurs, pour des dizaines de milliers de références et des centaines de fournisseurs.",
    probleme:
      "Le prochain départ est dans six jours. Ce qui n'entre pas dans ce conteneur arrivera après la rupture, sauf par avion.",
    chiffres: [
      { valeur: "34 000", libelle: "références à suivre" },
      { valeur: "350", libelle: "fournisseurs" },
      { valeur: "2 500", libelle: "conteneurs par an" },
    ],
    source: "Un réseau de quatre magasins à La Réunion, Le Moniteur, 2020.",
  },
  {
    etiquette: "Frais",
    contexte:
      "Dans l'alimentaire d'outre-mer, les frais d'approche pèsent un tiers du coût d'achat et la marge des supermarchés est déjà négative : chaque perte coûte plus cher qu'en métropole.",
    probleme:
      "Le frais part par bateau une fois par semaine, et par avion quand la date limite ne tiendrait pas la traversée.",
    chiffres: [
      { valeur: "33,3 %", libelle: "du coût d'achat en frais d'approche" },
      { valeur: "−1,4 %", libelle: "de marge nette des supermarchés" },
      { valeur: "30 à 42 %", libelle: "d'écart de prix avec la métropole" },
    ],
    source: "Martinique, Autorité de la concurrence, avis 26-A-01 ; écart de prix : INSEE, 2022.",
  },
  {
    etiquette: "Spécialisé",
    contexte:
      "Dans le jouet, le sport ou le meuble, le temps fort se joue six mois avant : il faut acheter, puis répartir le conteneur entre les magasins et les îles, retard du navire compris.",
    probleme:
      "Le conteneur de Noël se commande en été. Ce qu'on y met décide de ce qui manquera en décembre.",
    chiffres: [
      { valeur: "51 %", libelle: "des ventes de jouets au dernier trimestre, en France" },
      { valeur: "6 semaines", libelle: "de réassort pour une enseigne de sport" },
      { valeur: "6 mois", libelle: "entre l'achat et le temps fort" },
    ],
    source: "Jouets : Circana, 2025, France entière ; réassort : une enseigne de sport à La Réunion.",
  },
];

export const APPEL = {
  titre: "Voir Namolu sur vos données",
  texte:
    "L'audit dure trente minutes : nous regardons vos ventes, vos stocks et vos prochains départs, puis nous vous montrons le point du matin que Namolu vous aurait remis.",
  bouton: "Réserver un audit",
};
