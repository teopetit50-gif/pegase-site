/* ══════════════════════════════════════════════════════════════════════
   Varelo — les textes de /secteurs/groupes (mise en page v2, décalque de
   concurrence.com du 24/09/2026 ; positionnement refait le 25/09 au soir)

   Teo, 25/09 : changer le nom, et arrêter de parler de distribution —
   le produit « est censé tout faire », pour les grands groupes. Namolu,
   le produit des groupes de distribution (conteneurs, rayons, modules
   bricolage / frais / spécialisé), devient Varelo : le point du matin de
   TOUT un groupe à plusieurs sociétés, pôle par pôle et direction par
   direction.

   La matière vient d'un vrai dossier prospect (voir OMEGA/commercial) :
   un groupe d'une quarantaine de sociétés, six pôles (import, logistique
   du froid, commerce de gros, agences de marques, magasins, centres
   commerciaux), plusieurs territoires, une nomenclature par société, des
   tableurs à côté des ERP, des ERP tenus par la DSI. La page ne nomme
   aucun groupe.

   Terrains écartés à dessein : les prix, les marges et la « vie chère » ;
   l'IA qui répond aux clients ; le tri des candidatures.

   Ce qui n'est pas repris de la référence (règles maison) :
   • leurs logos clients (bandeau)            → les pôles d'un groupe ;
   • leurs chiffres de résultat (10M+, 24x)    → de grands chiffres publics, sourcés ;
   • leurs témoignages signés                  → le problème de chaque module ;
   • leurs certifications (SOC 2, HIPAA)       → nos engagements écrits ;
   • leurs financeurs                          → les territoires servis ;
   • leurs articles de blog                    → les trois modules.
   Aucun groupe nommé, aucun gain promis en pourcentage, aucun prix.
   ══════════════════════════════════════════════════════════════════════ */

export const HEROS = {
  surtitre: "Varelo, par Omega",
  titre: "Chaque société du groupe tient ses chiffres à sa façon.",
  chapo: "Varelo les réunit chaque matin et dit à chaque direction ce qu'elle doit décider.",
  bouton: "Réserver un audit",
  bandeau: "Pensé pour les groupes à plusieurs sociétés",
};

/* leur bandeau de logos clients : les pôles d'un groupe */
export const METIERS = [
  "Import",
  "Logistique",
  "Commerce de gros",
  "Distribution",
  "Agences de marques",
  "Immobilier commercial",
  "Automobile",
  "Industrie",
  "Hôtellerie",
  "Services",
];

/* le visuel du hero : ce que Varelo sort un matin, tous pôles confondus
   (données d'exemple). 38 signes au plus : la colonne ne passe pas à la
   ligne. */
export const DECISIONS = [
  "Dénoncer le contrat de maintenance",
  "Émettre une réserve au transporteur",
  "Réviser le loyer de la boutique 14",
  "Contrôler deux camions frigorifiques",
  "Envoyer le reporting dû à la marque",
  "Relancer l'expert du sinistre de mars",
  "Rapprocher 42 factures et livraisons",
  "Consolider les ventes de la semaine",
  "Préparer la régularisation des charges",
  "Préparer le contrôle Urssaf de mardi",
  "Compléter le conteneur du 8 octobre",
  "Transférer du stock entre entrepôts",
  "Convoquer trois préparateurs lundi",
  "Renouveler l'assurance de la flotte",
];

/* leurs trois chiffres de résultat (10M+, 24x, 100 %) : de GRANDS chiffres
   publics (Teo, 25/09 : « eux c'est des gros chiffres »). Source : Insee,
   « Catégories d'entreprises », Les entreprises en France, édition 2023
   (parue le 06/12/2023), données 2021 — 294 grandes entreprises, 4,2
   millions de salariés en ETP (28 %), 33 % de la valeur ajoutée ; 88
   unités légales en moyenne (secteurs principalement marchands).
   Espaces fines insécables avant les signes. */
export const CHIFFRES = [
  { valeur: "88", libelle: "Sociétés en moyenne dans une grande entreprise française" },
  { valeur: "4,2", libelle: "Millions de salariés dans les grandes entreprises" },
  { valeur: "33 %", libelle: "De la valeur ajoutée des entreprises françaises" },
];
export const CHIFFRES_SOURCE =
  "Insee, Les entreprises en France, édition 2023 (données 2021) : les 294 grandes entreprises du pays, salariés en équivalent temps plein.";

/* leurs trois témoignages : le problème que règle chaque module */
export const PROBLEMES = [
  {
    module: "Direction",
    texte:
      "« Chaque société envoie son reporting à sa façon. Le chiffre du groupe arrive quand le mois est déjà fini. »",
    ligne1: "Module direction générale",
    ligne2: "Le groupe sur une page, chaque matin",
  },
  {
    module: "Finance",
    texte:
      "« Le contrat se renouvelle seul si personne ne le dénonce à temps, et sa date est dans le classeur d'une autre société. »",
    ligne1: "Module finance et juridique",
    ligne2: "Les contrats, les baux, les sinistres, les contrôles",
  },
  {
    module: "Opérations",
    texte:
      "« Si la réserve ne part pas au transporteur dans les trois jours, l'avarie devient une perte sèche. »",
    ligne1: "Module opérations",
    ligne2: "La réception, le transport, la flotte, les marques",
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

/* 25/09 au soir : les quatre enseignes de magasins (Mr.Bricolage,
   Monoprix, Fnac, Galeries Lafayette) deviennent quatre pôles d'un groupe.
   Seul Monoprix reste, pour la distribution ; les autres photos sont
   Unsplash. Crédits sous les cartes et dans CREDITS.txt. `cadrage` : la
   position de la photo dans la carte ; `zoom` (ancré en bas). */
export const ENSEIGNES = {
  titre: "Pensé pour chaque pôle du groupe.",
  cartes: [
    { nom: "Distribution", alt: "Façade d'un magasin Monoprix", image: "/secteurs-groupes/enseigne-monoprix.jpg", cadrage: "50% 45%", zoom: 1 },
    { nom: "Import", alt: "Portiques à conteneurs dans un port", image: "/secteurs-groupes/carte-conteneur.jpg", cadrage: "50% 60%", zoom: 1 },
    { nom: "Logistique", alt: "Allée d'un entrepôt", image: "/secteurs-groupes/carte-entrepot.jpg", cadrage: "50% 50%", zoom: 1 },
    { nom: "Immobilier", alt: "Atrium d'un centre commercial", image: "/secteurs-groupes/pole-immobilier.jpg", cadrage: "50% 50%", zoom: 1 },
  ],
  pied: "Votre activité n'est pas dans la liste ? Varelo sert chaque société d'un groupe.",
  lien: "Parlons-en.",
  mention:
    "Enseigne citée à titre d'illustration, sans lien commercial. Photos : Mathias Reding, Pexels ; Mia de Jesus, 루리 이 et Sung Jin Cho, Unsplash.",
};

/* leur « Digital Residency » : la méthode, en trois temps */
export const METHODE = {
  titre: "La méthode Varelo",
  sousTitre: "Varelo lit les chiffres de toutes vos sociétés, et vos équipes valident chaque décision.",
  bouton: "Réserver un audit",
  onglets: [
    {
      nom: "Lire",
      titre: "Lire",
      texte:
        "Varelo lit les logiciels, les tableurs et les documents de chaque société, en lecture seule, et range leurs chiffres sous un seul référentiel.",
    },
    {
      nom: "Calculer",
      titre: "Calculer",
      texte:
        "Chaque matin, le calcul rapproche les sociétés entre elles : ventes, stocks, factures, contrats, baux et dossiers en cours.",
    },
    {
      nom: "Proposer",
      titre: "Proposer",
      texte:
        "À 7 h, chaque direction reçoit au plus trois décisions, chacune avec sa raison et son chiffre. Rien ne part sans sa validation.",
    },
  ],
  integration: {
    titre: "Branché sur vos logiciels, sans jamais y écrire.",
    texte:
      "Varelo lit les ERP, la comptabilité, la paie et les tableurs de chaque société, et vos systèmes restent à votre DSI. Les données sont hébergées dans l'Union européenne, chiffrées, et chaque décision est inscrite au journal.",
  },
};

/* le bandeau des intégrations : les sources lues, jamais nos outils */
export const SOURCES = [
  "ERP",
  "Comptabilité",
  "Caisses",
  "Paie",
  "Entrepôts",
  "Tableurs",
  "Contrats et baux",
  "Transitaires",
];

/* leur « AI built for your care model » : les quatre étapes */
export const ETAPES = {
  titre: "Un point du matin fait pour votre groupe",
  sousTitre: ["Des décisions calées sur vos sociétés,", "vos directions et vos échéances."],
  bouton: "Réserver un audit",
  liste: [
    {
      nom: "Audit",
      titre: "Audit",
      texte:
        "Trente minutes pour passer en revue vos sociétés et vos directions, et choisir le pôle par lequel commencer.",
    },
    {
      nom: "Branchement",
      titre: "Branchement",
      texte: "Varelo se branche en lecture seule sur les logiciels et les tableurs du pôle choisi.",
    },
    {
      nom: "Pilote",
      titre: "Pilote",
      texte: "Le pilote porte sur un pôle, une société et une direction, et se juge sur un trimestre entier.",
    },
    {
      nom: "Suivi",
      titre: "Suivi",
      texte: "Chaque décision est inscrite au journal : ce qui a été validé, refusé, et pourquoi.",
    },
  ],
  devise: "Calcul déterministe. Validation humaine.",
  faits: [
    { valeur: "7 h", libelle: "Le point du matin, chaque jour" },
    { valeur: "3", libelle: "Décisions au plus par direction, chacune justifiée" },
    { valeur: "100 %", libelle: "Des décisions validées par vos équipes" },
  ],
};

/* leur « A partnership focused on time-to-value » : le pilote. La frise
   (leurs « Week 01…08 ») montre le chemin du premier pôle au groupe. */
export const PILOTE = {
  titre: "Un premier pôle, puis tout le groupe.",
  texte:
    "Nous commençons par un pôle, une société et une direction. Le pilote se juge sur un trimestre complet, puis Varelo s'étend aux autres sociétés du groupe.",
  bouton: "Réserver un audit",
  frise: ["Audit", "Pilote", "Bilan", "Pôle 2", "Pôle 3", "Groupe"],
  etiquette: "Du premier pôle au groupe entier",
};

/* leurs financeurs : les territoires où vivent les sociétés d'un groupe */
export const TERRITOIRES = {
  titre: "Pensé pour les groupes sur plusieurs territoires",
  grands: ["Antilles-Guyane", "Océan Indien"],
  petits: ["Guadeloupe", "Martinique", "Guyane", "La Réunion", "Hexagone"],
};

/* leurs trois articles : les trois modules */
export const MODULES = {
  titre: "Les trois modules de Varelo.",
  bouton: "Réserver un audit",
  cartes: [
    {
      titre: "Direction : le groupe sur une page",
      texte:
        "Chaque matin, la présidence lit sur une seule page les ventes, la trésorerie et les écarts de chaque société.",
      image: "/secteurs-groupes/carte-direction.jpg",
    },
    {
      titre: "Finance et juridique : les échéances",
      texte:
        "Varelo suit les contrats à dénoncer, les baux à réviser, les sinistres en cours et les pièces à produire lors d'un contrôle.",
      image: "/secteurs-groupes/carte-juridique.jpg",
    },
    {
      titre: "Opérations : les flux entre sociétés",
      texte:
        "Varelo rapproche les livraisons de leurs factures, surveille les réserves aux transporteurs et prépare les reportings demandés par les marques.",
      image: "/secteurs-groupes/carte-operations.jpg",
    },
  ],
};

export const APPEL = {
  titre: "Le point du matin de tout le groupe.",
  bouton: "Réserver un audit",
};

export const AUDIT = "/reserver-un-audit";
