/* Source unique du contenu : familles de moteurs + articles.
   Consommé par l'accueil, /moteurs, /blog et /blog/[slug]. */

export type Moteur = {
  system: string;
  title: string;
  /* Ce que le moteur fait, en une ligne concrète. */
  job: string;
  /* Le bénéfice tangible, en une ligne. */
  benefit: string;
};

/* Bloc preuve du header de section : soit deux chiffres du problème
   (sourcés — jamais de statistique inventée), soit une formulation
   qualitative forte quand aucun chiffre public solide n'existe. */
export type Proof =
  | {
      type: "stats";
      items: { n: string; unit?: string; label: string; src?: string }[];
    }
  | { type: "quote"; text: string; sub: string };

export type Famille = {
  id: string;
  tag: string;
  accent: string;
  title1: string;
  title2: string;
  desc: string;
  cta: string;
  proof: Proof;
  moteurs: Moteur[];
};

export const FAMILLES: Famille[] = [
  {
    id: "defensifs",
    tag: "Moteurs défensifs",
    accent: "text-gold",
    title1: "L'argent rentre plus vite.",
    title2: "La charge descend.",
    desc: "Impayés relancés, demandes clients traitées, factures fournisseurs classées, clients dormants réveillés : les quatre moteurs les plus installés, branchés sur vos outils actuels.",
    cta: "Voir les moteurs défensifs",
    proof: {
      type: "quote",
      text: "Une entreprise ne perd pas son chiffre d'un coup. Elle le perd par un devis sans réponse, un appel manqué, une facture jamais relancée.",
      sub: "Un garage qui rate des appels, un artisan dont les devis dorment, un restaurant qui classe sa compta le dimanche soir.",
    },
    moteurs: [
      {
        system: "PAYD",
        title: "PAYD — relance devis & factures",
        job: "Vos devis en attente de réponse et vos factures échues font l'objet d'une relance automatique, personnalisée pour chaque client et échelonnée dans le temps. Le recouvrement de votre trésorerie cesse de reposer sur votre vigilance.",
        benefit: "Relance à J+3, J+7, J+21 — aucun envoi sans votre validation.",
      },
      {
        system: "ANSWR",
        title: "ANSWR — réceptionniste 24/7",
        job: "Les demandes reçues par WhatsApp et par mail — horaires, tarifs, disponibilités, prises de rendez-vous — trouvent une réponse à toute heure. Vous n'intervenez que sur les situations qui requièrent réellement votre jugement.",
        benefit: "Une demande reçue à 21 h obtient sa réponse à 21 h.",
      },
      {
        system: "OFFLOAD",
        title: "OFFLOAD — factures fournisseurs",
        job: "Chaque facture fournisseur est lue, quel qu'en soit le format, ses champs comptables extraits, la pièce classée par fournisseur puis transmise à votre cabinet dans un dossier complet. Ni ressaisie, ni pièce cherchée en catastrophe en fin de mois.",
        benefit: "Une comptabilité tenue à jour, sans ressaisie ni pièce manquante.",
      },
      {
        system: "BRIEF",
        title: "BRIEF — la matinale du dirigeant",
        job: "Chaque matin à 7 h, les encaissements de la veille, les relances en cours, les retards critiques et les clients à rappeler sont réunis dans un message unique, classé par ordre d'urgence.",
        benefit: "L'état réel de la boîte en un message, lu en deux minutes.",
      },
    ],
  },
  {
    id: "offensifs",
    tag: "Moteurs offensifs",
    accent: "text-gold",
    title1: "Le chiffre le moins cher",
    title2: "est déjà dans votre fichier.",
    desc: "Reconvaincre un client qui a déjà signé coûte une fraction de ce que coûte un inconnu à convaincre. Ces moteurs travaillent le fichier, l'actualité et la réputation que l'entreprise possède déjà.",
    cta: "Voir les moteurs offensifs",
    proof: {
      type: "quote",
      text: "Aller chercher un nouveau client coûte cher. Réveiller celui qui a déjà acheté chez vous coûte un message.",
      sub: "Clients sans commande depuis des mois, prospects jamais relancés, réseaux à l'abandon : ces moteurs exploitent ce que l'entreprise possède déjà.",
    },
    moteurs: [
      {
        system: "REVIVE",
        title: "REVIVE — clients dormants",
        job: "Vos clients silencieux sont identifiés dans votre historique de ventes, classés par valeur et par récence, puis recontactés un par un avec un message ancré dans leur historique réel : dernier achat, dernier passage, prestation habituelle.",
        benefit: "Une vague de réactivation par trimestre, jamais davantage.",
      },
      {
        system: "POSTD",
        title: "POSTD — studio de contenu",
        job: "Le calendrier éditorial du mois est bâti sur votre actualité réelle, les publications rédigées dans le ton défini avec vous, déclinées réseau par réseau et programmées aux heures d'audience.",
        benefit: "Une présence régulière validée en une seule relecture par mois.",
      },
      {
        system: "REACH",
        title: "REACH — prospection B2B",
        job: "Un fichier d'entreprises cibles est constitué puis validé avec vous. Les séquences partent de votre adresse et sous votre signature, les silences sont relancés, et chaque réponse est classée par niveau d'intérêt.",
        benefit: "Vous n'ouvrez que les conversations déjà intéressées.",
      },
      {
        system: "HIRED",
        title: "HIRED — tri de CV",
        job: "Chaque candidature reçoit un accusé de réception, passe les critères éliminatoires que vous avez fixés, puis est évaluée sur son adéquation réelle au poste. Vous recevez une shortlist argumentée, jamais un score opaque.",
        benefit: "Trois candidats sérieux au lieu de quatre-vingts CV à lire.",
      },
    ],
  },
  {
    id: "pepites",
    tag: "Pépites",
    accent: "text-sky",
    title1: "Certains problèmes",
    title2: "demandent un produit.",
    desc: "Conformité facture électronique, marchés publics, locations saisonnières, recouvrement en marque blanche : quatre chantiers construits pour un métier ou une échéance précise, déployés en semaines et jalonnés.",
    cta: "Découvrir les pépites",
    proof: {
      type: "quote",
      text: "Une obligation légale datée ou une procédure de marché public ne se traite pas avec un moteur générique.",
      sub: "Conformité, marchés publics, saisonnier, recouvrement — et quatre autres en préparation : PRICEBOOK, CARGO, BOOKD, ENTRY.",
    },
    moteurs: [
      {
        system: "BILLD",
        title: "BILLD — conformité facture élec.",
        job: "Le fichier client est d'abord audité — SIREN, adresses, mentions obligatoires — puis la facturation convertie au format Factur-X et l'entreprise raccordée au portail public. Chaque pièce émise passe ensuite un contrôle de conformité.",
        benefit: "En règle avant le 1ᵉʳ septembre 2026, sans changer d'outil.",
      },
      {
        system: "PUBLIQ",
        title: "PUBLIQ — marchés publics",
        job: "Les consultations publiées dans votre secteur et votre zone sont relevées chaque jour, filtrées sur vos capacités réelles — montants, délais, qualifications exigées — et les pièces administratives récurrentes du dossier sont tenues à jour.",
        benefit: "Vous décidez d'y aller — le dossier est déjà prêt.",
      },
      {
        system: "STAYD",
        title: "STAYD — locations saisonnières",
        job: "Les réservations sont centralisées quelle que soit la plateforme d'origine, les instructions d'arrivée envoyées au bon moment, le ménage coordonné entre deux séjours et l'avis du voyageur sollicité quand il est le plus enclin à le laisser.",
        benefit: "Vos locations tournent sans messages de minuit.",
      },
      {
        system: "COLLECT",
        title: "COLLECT — recouvrement",
        job: "Le recouvrement est opéré en marque blanche pour les cabinets comptables : le cabinet le propose sous sa propre marque, Omega exécute relances, suivi et reporting selon le protocole que le cabinet a validé.",
        benefit: "Le cabinet signe, Omega relance — sous sa marque à lui.",
      },
    ],
  },
];

export type Post = {
  slug: string;
  initials: string;
  author: string;
  date: string;
  cat: string;
  title: string;
  excerpt: string;
  /* photo de la cover composée (/blog) — bibliothèque public/photos,
     crédits dans CREDITS.txt */
  cover: string;
  body: { h?: string; p: string }[];
};

export const POSTS: Post[] = [
  {
    slug: "facturation-electronique-2026",
    initials: "PB",
    author: "Pôle conformité",
    date: "1 sept. 2026",
    cat: "Conformité",
    cover: "/photos/billd.jpg",
    title: "Facturation électronique : ce qui change au 1ᵉʳ septembre 2026",
    excerpt:
      "Toutes les entreprises devront recevoir des factures électroniques. Ce que la loi impose, le calendrier réel, et pourquoi attendre décembre coûtera plus cher que s'y mettre maintenant.",
    body: [
      {
        p: "La réforme de la facturation électronique n'est plus un horizon lointain : au 1ᵉʳ septembre 2026, toutes les entreprises établies en France, quelle que soit leur taille, doivent être en mesure de recevoir des factures électroniques au format structuré. Les grandes entreprises et les ETI devront également en émettre à cette date ; les PME, TPE et micro-entreprises suivront pour l'émission au 1ᵉʳ septembre 2027.",
      },
      {
        h: "Ce que la loi impose concrètement",
        p: "Une facture électronique au sens de la réforme n'est pas un PDF envoyé par mail. C'est un fichier structuré — Factur-X, UBL ou CII — qui transite par une plateforme agréée et dont les données sont transmises à l'administration fiscale. Chaque entreprise devra être raccordée au portail public de facturation ou à une plateforme partenaire immatriculée, et ses factures devront comporter des mentions supplémentaires : numéro SIREN du client, adresse de livraison si elle diffère, nature de l'opération.",
      },
      {
        h: "Ce que ça change pour une TPE antillaise",
        p: "Dès septembre 2026, vos fournisseurs peuvent basculer leurs envois vers le circuit électronique. Une entreprise qui n'est pas raccordée ne recevra plus certaines factures par les canaux habituels — avec les retards de traitement et les pénalités que cela implique. Côté émission, attendre l'échéance de 2027 pour s'équiper, c'est concentrer la migration, la formation et les corrections de données sur les mêmes semaines que des milliers d'autres entreprises.",
      },
      {
        h: "Le vrai risque : les données, pas l'outil",
        p: "L'expérience des pays déjà passés à la facture électronique le montre : le blocage vient rarement du logiciel, presque toujours de la qualité des données. Fichiers clients sans SIREN, adresses incomplètes, taux de TVA approximatifs — chaque anomalie devient une facture rejetée par la plateforme. Nettoyer sa base en amont, à froid, coûte quelques heures. Le faire en urgence, facture par facture rejetée, coûte des semaines.",
      },
      {
        h: "Comment BILLD traite le sujet",
        p: "Le moteur BILLD prend le chantier dans l'ordre : audit du fichier client et des mentions obligatoires, conversion de la facturation au format Factur-X, raccordement au portail public, puis contrôle de conformité automatique sur chaque pièce émise. L'objectif est simple : que l'échéance passe sans qu'aucune facture ne soit bloquée, et sans que vous ayez changé vos habitudes de travail.",
      },
      {
        p: "Le calendrier est connu, les textes sont publiés, les plateformes sont immatriculées. Ce qui reste ouvert, c'est l'ordre dans lequel les entreprises s'y mettront — et les dernières paieront leur retard en heures de correction. Un audit de trente minutes suffit à mesurer où vous en êtes.",
      },
    ],
  },
  {
    slug: "cheque-tic-financement",
    initials: "PF",
    author: "Pôle financement",
    date: "15 juil. 2026",
    cat: "Financement",
    cover: "/photos/paiement-terminal.jpg",
    title: "Chèque TIC : financer jusqu'à 80 % de votre installation",
    excerpt:
      "Le dispositif régional couvre l'essentiel du coût d'une automatisation pour les TPE de Guadeloupe. Qui est éligible, quels montants, et comment on monte le dossier avec vous.",
    body: [
      {
        p: "La Région Guadeloupe soutient la transformation numérique des petites entreprises à travers le dispositif Chèque TIC : une subvention qui couvre jusqu'à 80 % du coût d'un projet numérique porté par une TPE éligible. Un projet d'automatisation Omega — installation d'un moteur, raccordement aux outils, formation — entre précisément dans le champ de ce dispositif.",
      },
      {
        h: "Qui est éligible",
        p: "Le dispositif s'adresse aux très petites entreprises immatriculées en Guadeloupe, à jour de leurs obligations sociales et fiscales. Les critères précis — effectif, chiffre d'affaires, secteurs prioritaires, plafonds — sont fixés par la Région et évoluent selon les enveloppes votées. C'est la première chose que nous vérifions lors de l'audit : votre éligibilité est confirmée avant tout engagement, pas après.",
      },
      {
        h: "Ce que le dispositif couvre",
        p: "La subvention porte sur les dépenses du projet numérique : la prestation d'installation, le paramétrage des outils, l'accompagnement à la prise en main. Concrètement, sur une installation devisée, la part restant à la charge de l'entreprise peut être ramenée à une fraction du montant total — ce qui change complètement le calcul de retour sur investissement d'un moteur de relance ou d'un réceptionniste automatique.",
      },
      {
        h: "Comment le dossier se monte",
        p: "Un dossier de subvention demande des pièces administratives, un devis détaillé, une description du projet et de son impact. C'est un travail que la plupart des dirigeants repoussent — et c'est exactement pour cela que nous le prenons en charge. Omega constitue le dossier avec vous : nous rédigeons la description technique, préparons le devis au format attendu, et suivons l'instruction jusqu'à la décision.",
      },
      {
        p: "Le calendrier joue un rôle : les enveloppes régionales sont votées puis consommées, et les dossiers déposés tôt dans l'exercice sont instruits plus vite. Si votre entreprise est éligible, chaque mois d'attente est un mois de subvention potentiellement perdue et de problème non traité. L'audit gratuit inclut la vérification d'éligibilité — c'est le point de départ.",
      },
    ],
  },
  {
    slug: "rgpd-donnees-locales",
    initials: "PD",
    author: "Pôle données",
    date: "2 juin 2026",
    cat: "Données",
    cover: "/photos/offload-chip.jpg",
    title: "RGPD : pourquoi vos données restent dans vos outils",
    excerpt:
      "Nos moteurs ne recopient pas vos fichiers dans une base à eux : ils lisent vos données là où elles sont, le strict nécessaire à chaque tâche. Ce que ça change pour une TPE responsable de son fichier clients.",
    body: [
      {
        p: "Automatiser son entreprise, c'est confier à des machines l'accès à ce qu'elle a de plus sensible : le fichier clients, les factures, les échanges commerciaux. La question de savoir où ces données transitent et qui peut y accéder n'est pas un détail technique — c'est une obligation légale et un choix stratégique.",
      },
      {
        h: "Ce que le RGPD exige d'une TPE",
        p: "Le règlement s'applique à toutes les entreprises, sans seuil de taille. Une TPE qui utilise un fichier clients doit savoir où il est stocké, qui y accède, et être capable de répondre à une demande d'accès ou de suppression. Chaque outil qui touche à ces données est un sous-traitant au sens du règlement — et le dirigeant reste responsable de la chaîne complète, y compris des outils qu'il a branchés « pour essayer ».",
      },
      {
        h: "Le problème des outils qui aspirent vos données",
        p: "La plupart des outils d'automatisation grand public commencent par importer vos données : le fichier clients est recopié dans leur base, enrichi chez eux, et il y reste souvent après la résiliation. Vous voilà avec un double de votre actif le plus sensible chez un tiers — à devoir vérifier qui y accède, et comment le faire supprimer. Pour un fichier de clients guadeloupéens avec noms, téléphones et historiques d'achats, c'est une exposition que rien n'oblige à accepter.",
      },
      {
        h: "Le choix Omega : lire sur place, ne rien recopier",
        p: "Nos moteurs travaillent dans l'autre sens : vos données restent dans vos outils — votre tableur, votre messagerie — et le moteur vient les lire là où elles sont, au moment où la tâche l'exige. Aucune base parallèle n'est constituée. Les modèles d'intelligence artificielle utilisés reçoivent le strict nécessaire à chaque tâche, jamais l'intégralité d'un fichier, et rien n'est réutilisé à d'autres fins.",
      },
      {
        h: "Ce que ça change concrètement",
        p: "En cas de contrôle ou de demande d'un client, vous savez répondre : les données sont dans vos outils, traitées par ce moteur, pour cette finalité. Le registre des traitements est documenté à l'installation. Et le jour où vous arrêtez un moteur, il n'y a rien à rapatrier ni à faire supprimer — vos fichiers n'ont jamais quitté vos outils.",
      },
    ],
  },
  {
    slug: "impayes-guadeloupe",
    initials: "PC",
    author: "Pôle cash",
    date: "12 mai 2026",
    cat: "Cash",
    cover: "/photos/payd.jpg",
    title: "187 M€ d'impayés : le vrai coût d'attendre",
    excerpt:
      "En Guadeloupe, les retards de paiement immobilisent l'équivalent du budget annuel de certaines communes. Combien VOTRE boîte laisse dormir, et comment une relance systématique le récupère.",
    body: [
      {
        p: "Les retards de paiement sont endémiques aux Antilles : les délais y dépassent structurellement les moyennes nationales, et l'encours d'impayés des entreprises guadeloupéennes se chiffre en centaines de millions d'euros. Derrière ce chiffre global, une réalité par entreprise : des dizaines de milliers d'euros de travail déjà livré, déjà facturé, et toujours pas payé.",
      },
      {
        h: "Ce qu'un impayé coûte vraiment",
        p: "Le montant de la facture n'est que la partie visible. Un encours qui gonfle, c'est de la trésorerie qu'il faut compenser — par un découvert facturé par la banque, un fournisseur qu'on fait attendre à son tour, un investissement repoussé. C'est aussi du temps de dirigeant : chaque relance manuelle demande de retrouver le dossier, vérifier ce qui a été dit, choisir le ton. À dix relances par semaine, c'est une demi-journée perdue.",
      },
      {
        h: "Pourquoi la relance manuelle échoue",
        p: "Personne n'aime relancer. Résultat : on relance tard, on relance les gros montants en oubliant les petits, on saute une semaine parce que l'atelier déborde. Le client, lui, apprend vite qui relance systématiquement et qui laisse filer — et paie en priorité les fournisseurs organisés. L'irrégularité de la relance est exactement ce qui la rend inefficace.",
      },
      {
        h: "Ce qu'une relance systématique change",
        p: "Un moteur comme PAYD ne se fatigue pas et n'oublie rien : devis relancé à J+3 puis J+7, facture échue relancée à J+7 puis J+21, mise en demeure préparée au-delà — chaque message adapté à l'ancienneté du retard, chaque envoi soumis à votre validation. Les entreprises qui passent à la relance systématique constatent le même phénomène : ce ne sont pas les clients qui manquent de trésorerie qui paient plus vite, ce sont les clients qui payaient en dernier ceux qui ne relançaient pas.",
      },
      {
        p: "Le calcul à faire est simple : additionnez vos factures échues de plus de trente jours, ajoutez les devis restés sans réponse le mois dernier, et comparez au coût d'un moteur de relance — financé jusqu'à 80 % par le Chèque TIC pour les TPE éligibles. C'est précisément le chiffre que l'audit gratuit établit en trente minutes.",
      },
    ],
  },
];
