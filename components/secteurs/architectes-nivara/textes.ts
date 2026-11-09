/* ══════════════════════════════════════════════════════════════════════
   Lorani sur le gabarit Nivara — textes.ts (09/11/2026)

   TOUS les textes de /secteurs/architectes, recopiés LETTRE PAR LETTRE
   depuis components/secteurs/architectes/ (textes.ts, Produit, Fonctionne-
   ment, Dossier, Fonctionnalites, FileDesPoints, Compteurs, Metiers,
   Formules, Questions, Appel). Règle absolue de la maison : aucune phrase
   du site n'est reformulée, seul le dessin change. Ce fichier ne fait que
   les ranger dans les briques de la référence
   (https://nivara-architecture-template.vercel.app/) ; la clé de chaque
   bloc dit d'où vient le texte.

   Ce qui n'a PAS de brique chez Nivara et reste donc hors de cette page :
   les maquettes d'écran du produit (Produit, Fonctionnement, Dossier,
   FileDesPoints — leurs libellés d'interface « Lot 03 · Gros œuvre »,
   « 62 % », « Signalé »…), le rail de logos des logiciels de dessin et
   ses neuf glyphes de l'appel final. Rien d'autre n'est laissé.
   ══════════════════════════════════════════════════════════════════════ */

export const CONTACT = {
  audit: "/reserver-un-audit",
  demo: "/reserver-un-audit",
};

/* textes.ts › HERO */
export const HERO = {
  lignes: ["Chaque pièce de l'opération,", "vérifiée du permis à la réception"],
  texte:
    "Lorani lit toutes les pièces de l'opération, planches, CCTP, DPGF, offres, fiches techniques, situations et PV, et les croise entre elles et avec les règles françaises. Vous recevez chaque incohérence avec la page, la valeur lue et la correction proposée, et chaque visa, chaque décision reste datée dans un journal opposable.",
  garanties: ["Sans BIM", "Vos PDF, même scannés", "Une preuve par point", "Hébergé dans l'UE"],
  audit: "Réserver un audit",
  demo: "Voir la démo",
};

/* Produit.tsx › « 01 — Le produit » : le titre devient l'énoncé centré de
   la référence (deux pastilles d'image entre les mots, comme chez Nivara),
   le chapô va en tête des « moments », les quatre arguments deviennent la
   première colonne d'accordéons. */
export const PRODUIT = {
  sourcil: "01 — Le produit",
  titre: ["Une incohérence entre deux pièces", "ne se voit qu'en les lisant ensemble."],
  texte:
    "Lorani lit toutes les pièces de l'opération, les unes contre les autres : planches, CCTP, DPGF, offres, fiches techniques, situations et PV. Du dépôt du permis à la réception, vous arbitrez sur un dossier vérifié, et chaque décision reste datée.",
  audit: "Réserver un audit",
  arguments: [
    {
      titre: "Chaque pièce est croisée avec les autres",
      texte:
        "Lorani relit ensemble les plans, les coupes, les façades, le CCTP, la DPGF, les offres et les fiches techniques. Une cote modifiée à un endroit est retrouvée partout où elle apparaît.",
      image: "/secteurs-architectes/plans/salle-circulaire.webp",
    },
    {
      titre: "Les règles opposables sont citées",
      texte:
        "Chaque point cite l'article qu'il met en défaut : règlement du plan local d'urbanisme (PLU), accessibilité, sécurité incendie des établissements recevant du public (ERP), RE2020, DTU ou Avis Technique.",
      image: "/secteurs-architectes/plans/facades.webp",
    },
    {
      titre: "Une preuve pour chaque point",
      texte:
        "Chaque point cite la planche, l'extrait et les deux valeurs lues, puis explique l'écart et propose une correction.",
      image: "/secteurs-architectes/plans/salles-ovales.webp",
    },
    {
      titre: "L'architecte décide, et la décision reste",
      texte:
        "Lorani ne modifie aucun fichier : il remet une liste de points à arbitrer, chacun avec la pièce et la page. Ce que vous en décidez est daté et versé au journal de l'opération.",
      image: "/secteurs-architectes/plans/cafe-restaurant.webp",
    },
  ],
};

/* Fonctionnement.tsx › « 02 — Fonctionnement » : le titre devient le h2 de
   la grille 4/7 de la référence (« Every stage, in house »), les quatre
   phases la seconde colonne d'accordéons, chacune avec sa phrase d'accroche,
   son paragraphe et ses puces. */
export const FONCTIONNEMENT = {
  sourcil: "02 — Fonctionnement",
  titre: "Quatre moments où le dossier est vérifié, du dépôt du permis à la réception.",
  phases: [
    {
      titre: "Permis et délais",
      accroche: "Le permis part complet, et son calendrier est tenu.",
      texte:
        "Lorani vérifie les pièces du Cerfa, la cohérence entre planches et les règles chiffrées du PLU, puis suit la demande de pièces, les délais, l'affichage et la purge des recours, jour après jour.",
      puces: [
        "Pièces PC1 à PC8 et surfaces",
        "Pièces du Cerfa : complétude et cohérence entre planches",
        "Règles chiffrées du PLU citées par article",
        "Demande de pièces, délais, affichage et recours suivis",
      ],
      image: "/secteurs-architectes/photos/tertiaire.jpg",
    },
    {
      titre: "DCE et offres",
      accroche: "Aucune planche n'est lue seule.",
      texte:
        "Lorani croise les plans avec le CCTP et la DPGF, puis chaque offre reçue avec la DPGF, ligne par ligne : les incohérences et les postes non chiffrés ressortent avant l'attribution.",
      puces: [
        "Planches contre CCTP et DPGF, poste par poste",
        "Offres contre DPGF : postes non chiffrés, écarts",
        "Rapport d'analyse prêt à signer",
        "Métré des plans contre les quantités",
        "Décennales contrôlées contre le lot",
      ],
      image: "/secteurs-architectes/photos/equipements-publics.jpg",
    },
    {
      titre: "Situations et décisions",
      accroche: "Chaque situation est contrôlée, chaque décision est datée.",
      texte:
        "Lorani compare la situation reçue au marché, à la précédente et au compte rendu de chantier, chiffre l'écart, puis inscrit ce que vous décidez au journal de l'opération.",
      puces: [
        "Marché, avenants et révision BT",
        "Avancement déclaré contre constaté",
        "Retenue, avance et pénalités recalculées",
        "Ordres de service et décisions, datés et motivés",
      ],
      image: "/secteurs-architectes/photos/rehabilitation.jpg",
    },
    {
      titre: "Visa des fiches techniques",
      accroche: "Chaque fiche technique est confrontée au CCTP.",
      texte:
        "Lorani vérifie le classement au feu, l'Avis Technique et les PV d'essai de chaque document d'exécution, puis prépare le bordereau de visa avec les observations en regard : visa sans observation (VSO), visa avec observations (VAO) ou refus.",
      puces: [
        "Classement au feu et Avis Technique",
        "Bordereau VSO · VAO · refus",
        "Notes de calcul et PV d'essais",
        "Date butoir calée sur la commande",
      ],
      image: "/secteurs-architectes/photos/logement.jpg",
    },
  ],
};

/* Metiers.tsx › « 05 — Métiers » : le carrousel plein cadre de la
   référence (« Selected work »). Chaque carte du rail devient une
   diapositive : la phase en titre, l'agence et son secteur en légende,
   la phrase de la carte sous le titre. */
export const METIERS = {
  sourcil: "05 — Métiers",
  titre: "Où le dossier se perd-il ?",
  sous: "Cinq étapes où une incohérence coûte cher.",
  lien: "Voir la démo",
  cartes: [
    {
      phase: "Concours et permis",
      agence: "Agence de 6 personnes",
      secteur: "Logement collectif",
      texte:
        "Le plan de masse et la coupe donnent deux cotes de recul différentes, et l'incohérence est corrigée avant le dépôt plutôt qu'à la demande du service instructeur.",
      image: "/secteurs-architectes/photos/logement.jpg",
    },
    {
      phase: "Analyse des offres",
      agence: "Agence de 12 personnes",
      secteur: "Équipements publics",
      texte:
        "Sur quatre offres reçues dans quatre formats, un poste n'est chiffré par aucune entreprise, et il ressort à l'analyse plutôt qu'au chantier en plus-value.",
      image: "/secteurs-architectes/photos/equipements-publics.jpg",
    },
    {
      phase: "Situations de travaux",
      agence: "Agence de 3 personnes",
      secteur: "Réhabilitation",
      texte:
        "Une situation facture 62 % d'avancement alors que le chantier en est à 55 %, et l'écart est chiffré avant que la situation soit visée.",
      image: "/secteurs-architectes/photos/rehabilitation.jpg",
    },
    {
      phase: "Visa des documents",
      agence: "Groupement de maîtrise d'œuvre",
      secteur: "Tertiaire",
      texte:
        "La fiche technique d'une porte annonce EI 30 quand le CCTP exige EI 60, et le visa est refusé avant la commande plutôt qu'à la réception.",
      image: "/secteurs-architectes/photos/tertiaire.jpg",
    },
    {
      phase: "Réception et clôture",
      agence: "Agence de 8 personnes",
      secteur: "Logement",
      texte:
        "Le PV de réception porte une réserve sans levée datée, et le dossier de clôture la signale avant la fin de la garantie de parfait achèvement plutôt qu'au premier sinistre.",
      image: "/photos/tarifs-abonnement-facade.jpg",
    },
  ],
  logiciels: "Les plans de vos logiciels, lus en PDF ou en DWG",
};

/* Dossier.tsx › « 03 — Le dossier » : la section « Process » de la
   référence (sourcil, grand énoncé, deux planches légendées, un texte
   long). Le texte long est le point relevé de la maquette et sa
   proposition ; les légendes, les libellés de la planche ouverte. */
export const DOSSIER = {
  sourcil: "03 — Le dossier",
  titre: "Chaque point arrive avec sa preuve : la planche, l'extrait, l'article et la correction proposée.",
  point: [
    "La cote de recul lue sur le plan de masse (4,80 m) diffère de celle de la coupe AA (5,20 m). Le PLU impose 5,00 m au minimum en limite séparative, donc l'une des deux pièces met le permis en défaut.",
    "Proposition : retenir 5,20 m sur le plan de masse et le plan RDC, puis vérifier la surface de plancher qui en découle. Aucun fichier n'a été modifié.",
  ],
  planches: [
    { legende: "Plan de masse · Indice C · p. 02", image: "/secteurs-architectes/plans/salle-circulaire.webp" },
    { legende: "Pièces concernées : PC2, coupe AA", image: "/secteurs-architectes/plans/salles-ovales.webp" },
  ],
};

/* textes.ts › COMPTEURS : la section de chiffres collée de la référence
   (« Since 2011 »). */
export const COMPTEURS = {
  titre: "Toutes les pièces de l'opération",
  sous: "sont lues et croisées.",
  bouton: "Voir Lorani en action",
  valeurs: [
    { valeur: "5", libelle: "Phases, du dépôt du permis à la réception" },
    { valeur: "1", libelle: "Preuve pour chaque point relevé" },
    { valeur: "0", libelle: "Fichier modifié" },
    { valeur: "FR", libelle: "PLU, DTU, ERP et RE2020" },
  ],
  image: "/secteurs-architectes/photos/tertiaire.jpg",
};

/* Fonctionnalites.tsx › « 04 — Fonctionnalités » + FileDesPoints.tsx :
   la section « Buildings are finished when people move in » de la
   référence (images éparses, titre centré, lien), suivie des cinq
   fonctions en liste filetée. */
export const FONCTIONNALITES = {
  sourcil: "04 — Fonctionnalités",
  titre: "Chaque point relevé attend l'arbitrage de l'architecte.",
  lien: "Voir Lorani en action",
  fonctions: [
    {
      titre: "Toutes les planches sont relues",
      texte: "Chaque planche est croisée avec les autres et avec les pièces écrites : aucune n'est lue seule.",
    },
    {
      titre: "Chaque type de pièce a sa lecture",
      texte:
        "Un plan, une DPGF et une fiche technique ne se contrôlent pas de la même façon : Lorani applique à chacun sa propre lecture.",
    },
    {
      titre: "Les situations sont suivies",
      texte: "Lorani compare chaque situation reçue au marché et à la précédente, puis chiffre l'écart.",
    },
    {
      titre: "Une alerte dès la réception",
      texte:
        "Chaque situation, indice ou offre est lu dès sa réception, et l'écart est signalé le jour même. La date butoir de chaque visa est calée sur le délai de commande de l'ouvrage.",
    },
    {
      titre: "Une question suivie jusqu'à la réponse",
      texte:
        "Chaque point part en question à l'entreprise ou au BET, avec l'extrait joint. Lorani suit ensuite la réponse, et la question qui attend depuis huit jours remonte le matin.",
    },
  ],
  images: [
    "/secteurs-architectes/photos/logement.jpg",
    "/photos/tarifs-hero-atrium.jpg",
    "/secteurs-architectes/photos/equipements-publics.jpg",
    "/photos/tarifs-abonnement-facade.jpg",
    "/secteurs-architectes/photos/rehabilitation.jpg",
    "/secteurs-architectes/photos/tertiaire.jpg",
    "/photos/tarifs-cloture-facade.jpg",
  ],
};

/* Formules.tsx › « 06 — Formules » : la section « Where we build » de la
   référence (grille 6/5, carte à points au-delà de 1200 px), puis les
   quatre formules et leurs lignes en colonnes filetées. */
export const FORMULES = {
  sourcil: "06 — Formules",
  titre: "Un dossier à prix fixe pour juger, puis un prix par taille d'agence",
  audit: "Réserver un audit",
  formules: [
    {
      titre: "Découverte",
      pour: "Pour juger Lorani sur un dossier déjà clos, sans abonnement",
      prix: "Prix fixe",
      lignes: [
        "Un permis instruit ou un DCE attribué, relu en entier",
        "Planches croisées entre elles, avec le CCTP et la DPGF",
        "Pièces du permis : complétude et règles chiffrées du PLU",
        "Fiches techniques confrontées au CCTP, bordereau de visa",
        "Chaque point avec la page, la valeur lue et la correction",
        "Rapport PDF annoté et Excel",
        "Réalisé pendant l'audit, résultat en quelques heures",
        "Remboursé si moins de trois points confirmés",
      ],
    },
    {
      titre: "Agence",
      pour: "Pour les agences de 1 à 5 personnes",
      prix: "Sur audit",
      lignes: [
        "Tout ce que contient Découverte, sur toutes vos opérations",
        "Plans croisés, rapport PDF annoté",
        "Permis : pièces du Cerfa et PLU",
        "Accessibilité, ERP et RE2020",
        "PLU, servitudes et risques lus depuis l'adresse",
        "Calendrier du permis jusqu'à la purge des recours",
        "Surfaces recalculées contre le Cerfa",
        "RE2020 : attestation comparée aux plans",
        "Revérification à chaque indice",
        "Questions posées au dossier",
      ],
    },
    {
      titre: "Cabinet",
      pour: "Pour les agences de 6 à 20 personnes",
      prix: "Sur audit",
      avant: true,
      lignes: [
        "Tout ce que contient Agence",
        "Analyse des offres sur DPGF",
        "Métré des plans contre la DPGF",
        "Décennales contrôlées contre le lot",
        "Visa des fiches techniques : VSO, VAO, refus",
        "Visas calés sur les délais de commande",
        "Situations et décomptes",
        "Ordres de service : montant et délai",
        "Questions suivies jusqu'à la réponse",
        "Journal des décisions de l'opération, exportable",
        "Checklists de l'agence",
        "Export Excel par lot",
        "Utilisateurs sans supplément",
        "Hébergement dans l'UE",
      ],
    },
    {
      titre: "Groupement",
      pour: "Pour les agences de plus de 20 personnes, les groupements et les maîtres d'ouvrage",
      prix: "Sur audit",
      lignes: [
        "Tout ce que contient Cabinet",
        "Bureaux d'études invités",
        "Fonds de plan BET croisés",
        "Comptes rendus de chantier rédigés",
        "Réserves suivies jusqu'à la fin de la GPA",
        "Complétude du DOE à la réception",
        "Dossier de défense décennale",
        "Registre daté des visas",
        "Honoraires par phase contre temps passé",
        "Historique des indices sans limite",
        "Contrôles définis avec vous",
        "Import depuis vos plateformes de projet",
        "Accès sans limite d'équipe",
        "Règles de votre charte intégrées",
      ],
    },
  ],
};

/* Questions.tsx : l'accordéon de la référence, en deux colonnes. */
export const QUESTIONS = {
  titre: "Questions fréquentes",
  sous: "Ce que les agences demandent avant d'essayer.",
  liste: [
    {
      q: "Quelles pièces Lorani lit-il ?",
      r: "Tout le dossier, du permis à la réception : plans, coupes, façades et nomenclatures en PDF, même scannés, ou en DWG ; CCTP, DPGF et offres des entreprises en Excel ou en PDF ; pièces du permis, fiches techniques, plans d'exécution, PV d'essais, situations de travaux, comptes rendus et PV de réception. Il les rapproche ensuite entre elles.",
    },
    {
      q: "Faut-il une maquette BIM ?",
      r: "Non. Un jeu de plans en PDF suffit. Lorani ne vous demande ni de changer de logiciel ni de reprendre vos gabarits.",
    },
    {
      q: "Que se passe-t-il en cas d'erreur de lecture ?",
      r: "L'erreur se voit immédiatement, car chaque point porte l'extrait de la planche, les deux valeurs lues et l'article cité. Un point écarté ne revient pas à l'indice suivant.",
    },
    {
      q: "Comment la fiabilité est-elle mesurée ?",
      r: "Un point est tenu pour valide quand vous confirmez, en le relisant, que la valeur lue figure bien dans la pièce à la page indiquée et que l'écart existe. Nous mesurons ce taux sur les points relus par les agences et nous le publions. Un contrôle à l'unité qui rend moins de trois points confirmés est remboursé.",
    },
    {
      q: "Pourquoi un seul outil du permis à la réception ?",
      r: "Parce qu'une incohérence passe d'une phase à l'autre : une cote fausse au permis devient un poste faux à la DPGF, puis une réserve à la réception. Les outils qui traitent chacun une phase ne la voient pas passer. Lorani garde le même dossier d'un bout à l'autre, avec le référentiel français, et chaque décision y reste datée.",
    },
    {
      q: "Qui porte la responsabilité ?",
      r: "L'architecte, comme aujourd'hui : Lorani assiste la relecture et ne certifie aucune conformité, si bien qu'un rapport sans point ne vaut pas avis favorable. Chaque contrôle est daté et conservé, ce qui documente le soin apporté au dossier.",
    },
    {
      q: "Quelles règles connaît-il ?",
      r: "Celles d'un dossier français : le règlement de la zone du PLU, les pièces PC1 à PC8, l'accessibilité, la sécurité incendie des ERP et de l'habitation, la RE2020, les DTU et le CCAG-Travaux. Vos propres checklists s'y ajoutent.",
    },
    {
      q: "Faut-il téléverser le règlement du PLU ?",
      r: "Non. À partir de l'adresse du terrain, Lorani lit la zone du PLU et son règlement, les servitudes, les risques connus (inondation, argile, sismicité) et le périmètre des Monuments historiques, puis en déduit les pièces que le permis exigera.",
    },
    {
      q: "Lorani suit-il le permis après le dépôt ?",
      r: "Oui. Il suit le délai d'instruction, la demande de pièces complémentaires et la réponse à préparer, puis la date du permis tacite et la fin du délai de recours des tiers à partir de l'affichage. Vous savez quand le chantier peut démarrer.",
    },
    {
      q: "Lorani suit-il les réponses des entreprises et du BET ?",
      r: "Oui. Chaque question posée garde sa date, et celle qui attend une réponse depuis plus de huit jours remonte le matin. La date butoir de chaque visa est calée sur le délai de commande de l'ouvrage : la fiche des menuiseries à dix semaines est signalée à J-⁠10.",
    },
    {
      q: "Lorani contrôle-t-il les quantités de la DPGF ?",
      r: "Oui. Il mesure les surfaces et les longueurs sur les plans, puis les compare aux quantités de la DPGF, lot par lot. Un poste sous-estimé ressort avant la consultation, là où il deviendrait sinon une plus-value de chantier.",
    },
    {
      q: "Et les assurances des entreprises retenues ?",
      r: "Lorani lit chaque attestation décennale et vérifie que les activités couvertes correspondent au lot attribué, ainsi que les dates et le plafond. C'est un contrôle que l'architecte doit au maître d'ouvrage, et le registre en garde la date.",
    },
    {
      q: "Lorani aide-t-il pendant le chantier et à la réception ?",
      r: "Il rédige le compte rendu de chantier à partir de vos notes et photos de visite, calcule l'incidence de chaque ordre de service sur le montant et le délai, puis suit chaque réserve jusqu'à sa levée et la fin de la garantie de parfait achèvement.",
    },
    {
      q: "Lorani suit-il les honoraires de l'agence ?",
      r: "Oui, phase par phase : le temps passé est rapporté aux honoraires de chaque élément de mission, de l'esquisse à la réception. Une phase qui consomme plus que prévu remonte avant la fin de la mission.",
    },
    {
      q: "Que reste-t-il des contrôles des années plus tard ?",
      r: "Vous gardez un dossier daté, exportable en une fois : chaque point signalé, chaque visa rendu et chaque refus, avec la pièce et la date. S'il y a un sinistre des années après la réception, vous retrouvez ce que l'agence avait relevé et quand.",
    },
    {
      q: "Que se passe-t-il quand un indice change ?",
      r: "Lorani compare le nouvel indice au précédent, y compris les changements non signalés, puis ne remonte que les écarts nouveaux. Vous ne relisez pas ce qui a déjà été vu.",
    },
    {
      q: "Lorani modifie-t-il les fichiers de l'agence ?",
      r: "Non. Il lit vos fichiers et n'en écrit aucun. Le rapport, en PDF annoté et en Excel, est un document à part que vous gardez ou joignez au dossier.",
    },
    {
      q: "Où sont hébergés les dossiers ?",
      r: "Ils sont hébergés dans l'Union européenne et chiffrés pendant leur transfert comme pendant leur conservation. Ils ne servent à entraîner aucun modèle, et vous pouvez les retirer à tout moment, rapports compris.",
    },
    {
      q: "Comment l'essayer ?",
      r: "L'audit se fait sur un dossier déjà clos que vous connaissez : un permis instruit ou un DCE attribué. Vous comparez ce que Lorani relève à ce que l'instruction ou le chantier avait révélé, puis l'audit fixe la formule. Le premier dossier est à prix fixe, sans abonnement.",
    },
  ],
};

/* textes.ts › APPEL : la section de clôture plein cadre de la référence
   (« Have a site or a brief? Let's talk. »). */
export const APPEL = {
  lignes: ["Jugez Lorani sur un permis déjà instruit", "ou un DCE déjà attribué"],
  audit: "Réserver un audit",
  formules: "Voir les formules",
  image: "/photos/tarifs-cloture-facade.jpg",
};
