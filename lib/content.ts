/* Source unique du contenu : les paquets vendus + les articles.
   Consommé par l'accueil, /offres, /offres/[slug], le sitemap et /blog. */

/* Un paquet = ce que le client achète. Le `system` est son code (CASHD,
   RELOAD…), le `slug` son URL — volontairement descriptive, parce que
   personne ne tape « cashd » dans un moteur de recherche alors que
   « relance facture impayée » se tape. */
export type Moteur = {
  system: string;
  slug: string;
  title: string;
  /* Ce que le paquet fait, en une ligne concrète. */
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

/* ══════════════════════════════════════════════════════════════════════
   LES PAQUETS (05/08/2026)

   Ce fichier exposait douze « moteurs » regroupés en trois familles
   (défensifs, offensifs, pépites). Six d'entre eux — POSTD, REACH, HIRED,
   BILLD, STAYD, COLLECT — n'existaient dans aucun système : ils promettaient
   du contenu éditorial, de la prospection sortante et du tri de CV, c'est-à-
   dire les trois domaines qu'Omega a explicitement décidé de ne pas couvrir.
   Deux moteurs réels, à l'inverse, n'étaient nulle part : la sollicitation
   d'avis et la mémoire d'entreprise.

   Le catalogue interne compte 29 moteurs, dont 12 en service. Le client, lui,
   n'achète pas des moteurs : il achète un assistant qui fait quatre choses,
   plus deux qui viennent avec. D'où ces six paquets, nommés par leur
   RÉSULTAT — ce qui les rend insensibles au moteur qu'on ajoute dedans.

   La grammaire des codes : un nom qui finit par D est un paquet qui
   s'installe et se facture ; PULSE et VAULT ne finissent pas par D, ils sont
   compris. Deux noms sont réservés pour la suite et ne s'affichent pas tant
   qu'ils sont vides : AHEAD (tenir le client informé) et COVERD (délais et
   obligations).

   Rien de ce qui n'existe pas ne figure ici. C'est la règle qui a été
   enfreinte, et c'est elle qui prime.
   ══════════════════════════════════════════════════════════════════════ */

export const FAMILLES: Famille[] = [
  {
    id: "installes",
    tag: "Ce qui s'installe",
    accent: "text-gold",
    title1: "Quatre choses en moins",
    title2: "sur vos épaules.",
    desc: "Encaisser ce qu'on vous doit, retrouver le chiffre qui dort déjà chez vous, répondre à toute heure, classer la paperasse. Quatre postes, branchés sur les outils que vous tenez déjà.",
    cta: "Voir ce qui s'installe",
    proof: {
      type: "quote",
      text: "Une entreprise ne perd pas son chiffre d'un coup. Elle le perd par un devis sans réponse, un appel manqué, une facture jamais relancée.",
      sub: "Un garage qui rate des appels, un artisan dont les devis dorment, un restaurant qui classe sa compta le dimanche soir.",
    },
    moteurs: [
      {
        system: "CASHD",
        slug: "relances-impayes",
        title: "CASHD · relance devis & factures",
        job: "Vos devis restés sans réponse et vos factures échues font l'objet d'une relance graduée, écrite au cas par cas selon le montant en jeu, l'ancienneté du retard et l'historique du client. Le recouvrement de votre trésorerie cesse de dépendre de votre vigilance et de votre disponibilité du vendredi soir.",
        benefit: "Relance à J+3, J+7, J+21, aucun envoi sans votre validation.",
      },
      {
        system: "RELOAD",
        slug: "nouvelles-affaires",
        title: "RELOAD · clients dormants & marchés publics",
        job: "Vos clients silencieux sont retrouvés dans votre historique de ventes, classés par valeur et par récence, puis recontactés un par un avec un message ancré dans ce qu'ils ont réellement acheté. En parallèle, les consultations publiques de votre zone et de votre métier sont relevées chaque jour et filtrées sur vos capacités réelles.",
        benefit: "Vos clients silencieux triés par montant, les marchés de votre zone filtrés chaque jour.",
      },
      {
        system: "FRONTD",
        slug: "demandes-clients",
        title: "FRONTD · demandes entrantes & avis",
        job: "Les demandes reçues par mail et par WhatsApp (horaires, tarifs, disponibilités, prise de rendez-vous), trouvent une réponse à toute heure, tirée de ce que votre entreprise sait vraiment et jamais inventée. Et chaque client satisfait se voit demander un avis au moment où il est le plus enclin à le laisser.",
        benefit: "Une demande reçue à 21 h obtient sa réponse à 21 h.",
      },
      {
        system: "FILED",
        slug: "factures-fournisseurs",
        title: "FILED · la paperasse traitée",
        job: "Chaque facture fournisseur est lue quel qu'en soit le format, ses montants extraits puis contrôlés entre eux, la pièce classée par fournisseur et transmise à votre cabinet dans un dossier complet. Ni ressaisie du dimanche soir, ni pièce cherchée en catastrophe en fin de trimestre.",
        benefit: "La facture lue, ses montants recoupés, la pièce classée et transmise au cabinet.",
      },
    ],
  },
  {
    id: "compris",
    tag: "Ce qui vient avec",
    accent: "text-sky",
    title1: "Deux choses",
    title2: "qui ne se facturent pas.",
    desc: "Savoir où vous en êtes chaque matin, et la certitude que rien ne part sans vous. Ce ne sont pas des options : elles tournent chez tout le monde, dès le premier jour.",
    cta: "Voir ce qui vient avec",
    proof: {
      type: "quote",
      text: "Un système qui écrit à vos clients doit d'abord prouver ce qu'il refuse d'envoyer.",
      sub: "Un client qui a réglé, un client qui a dit stop, un dimanche soir à 23 h : trois envois qu'aucun réglage ne peut autoriser.",
    },
    moteurs: [
      {
        system: "PULSE",
        slug: "point-du-matin",
        title: "PULSE · le point du matin",
        job: "Chaque matin, un message unique : ce qui est parti la veille, ce qui attend votre validation, ce qui a coincé, où en est votre encours. Et chaque semaine, le système vous propose ce qu'il a compris de vos corrections : vous validez ou vous refusez, il ne retient que ce que vous avez accepté.",
        benefit: "L'état réel de la boîte en un message, lu en deux minutes.",
      },
      {
        system: "VAULT",
        slug: "securite",
        title: "VAULT · validation et verrous",
        job: "Rien ne part sans vous. Un « stop » d'un client arrête tout, définitivement et sur tous les canaux. Douze verrous inscrits dans la base de données elle-même refusent en silence ce qui ne doit pas partir : relancer quelqu'un qui a réglé, écrire un dimanche soir, envoyer deux messages coup sur coup à la même personne.",
        benefit: "Douze verrous, et un journal de tout ce qui est parti.",
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
        p: "Une facture électronique au sens de la réforme n'est pas un PDF envoyé par mail. C'est un fichier structuré (Factur-X, UBL ou CII) qui transite par une plateforme agréée et dont les données sont transmises à l'administration fiscale. Chaque entreprise devra être raccordée au portail public de facturation ou à une plateforme partenaire immatriculée, et ses factures devront comporter des mentions supplémentaires : numéro SIREN du client, adresse de livraison si elle diffère, nature de l'opération.",
      },
      {
        h: "Ce que ça change pour une petite entreprise",
        p: "Dès septembre 2026, vos fournisseurs peuvent basculer leurs envois vers le circuit électronique. Une entreprise qui n'est pas raccordée ne recevra plus certaines factures par les canaux habituels : avec les retards de traitement et les pénalités que cela implique. Côté émission, attendre l'échéance de 2027 pour s'équiper, c'est concentrer la migration, la formation et les corrections de données sur les mêmes semaines que des milliers d'autres entreprises.",
      },
      {
        h: "Le vrai risque : les données, pas l'outil",
        p: "L'expérience des pays déjà passés à la facture électronique le montre : le blocage vient rarement du logiciel, presque toujours de la qualité des données. Fichiers clients sans SIREN, adresses incomplètes, taux de TVA approximatifs : chaque anomalie devient une facture rejetée par la plateforme. Nettoyer sa base en amont, à froid, coûte quelques heures. Le faire en urgence, facture par facture rejetée, coûte des semaines.",
      },
      {
        h: "Ce qu'Omega.AI fait, et ce qu'il ne fait pas",
        p: "Nous ne vendons pas de mise en conformité : le raccordement à une plateforme immatriculée et la conversion au format Factur-X relèvent de votre outil de facturation et de votre comptable, et c'est très bien ainsi. Ce que l'audit apporte, c'est le point de départ que personne ne fait : l'état réel de votre fichier client, SIREN par SIREN, adresse par adresse. C'est là que se logent les factures rejetées, et c'est un travail qui coûte quelques heures à froid contre des semaines dans l'urgence.",
      },
      {
        p: "Le calendrier est connu, les textes sont publiés, les plateformes sont immatriculées. Ce qui reste ouvert, c'est l'ordre dans lequel les entreprises s'y mettront, et les dernières paieront leur retard en heures de correction. Un audit de trente minutes suffit à mesurer où vous en êtes.",
      },
    ],
  },
  {
    slug: "garage-fichier-clients",
    initials: "PM",
    author: "Pôle métiers",
    date: "3 août 2026",
    cat: "Métier",
    cover: "/photos/payd-comptoir.jpg",
    title: "Garage : vos anciens clients sont votre meilleure publicité",
    excerpt:
      "Chaque véhicule passé à l'atelier reviendra : chez vous ou chez un autre. Comment un garage indépendant fait revenir ses clients à la bonne date, sans embaucher personne à l'accueil.",
    body: [
      {
        p: "Un garage n'a pas un problème de clients : il en voit passer toute l'année. Son problème, c'est ce qui se passe après la restitution. Le véhicule repart, le dossier se ferme, et plus personne n'y pense : jusqu'à ce que le client revienne de lui-même, dans un an, ou n'importe quand, ou jamais. Pourtant la date de son prochain passage est presque écrite d'avance : une révision se refait à l'année, un contrôle technique a une échéance. Ce rendez-vous-là, quelqu'un le prendra. La seule question est de savoir avec qui.",
      },
      {
        h: "Le fichier dort, l'atelier déborde",
        p: "La plupart des garages ont ce fichier : des années de clients, avec la date du dernier passage et ce qui a été fait. Personne n'a le temps de l'exploiter : les journées se passent sous les ponts, pas au téléphone. Rappeler chaque client à l'approche de l'anniversaire de sa révision serait le travail le plus rentable de la semaine, et c'est précisément celui qui saute toujours.",
      },
      {
        h: "Ce que fait REVIVE dans un garage",
        p: "Le moteur REVIVE lit le fichier et repère les clients dont le dernier passage approche de l'année. Chacun reçoit un message personnel (le véhicule, la prestation réalisée, une proposition de faire un point avant le prochain contrôle), jamais une campagne de masse, jamais deux fois, et celui qui répond STOP ne sera plus jamais contacté. Le client a le sentiment d'un garagiste qui suit son véhicule ; le garage remplit son planning avec des rendez-vous qu'il aurait perdus.",
      },
      {
        h: "Pendant ce temps, l'accueil répond",
        p: "Les demandes de rendez-vous et de devis arrivent par téléphone pendant qu'on a les mains dans un moteur, par WhatsApp le soir, par mail n'importe quand. Le moteur ANSWR les reçoit dans une seule file, pose les bonnes questions (marque, modèle, immatriculation, symptôme, disponibilités pour déposer le véhicule), et transmet à l'atelier un dossier prêt à traiter. Il ne donne jamais un prix ni un délai : dès que c'est sérieux, c'est l'humain qui reprend.",
      },
      {
        h: "Et les factures d'atelier suivent le même chemin",
        p: "Pour les clients professionnels et les flottes qui règlent à réception, le moteur PAYD relance aux bonnes dates avec des messages que le patron valide, en proposant le règlement au comptoir, par virement ou en plusieurs fois. Chaque matin, le rapport BRIEF pose l'état en deux minutes : les véhicules à restituer, les devis en attente, les relances parties.",
      },
      {
        p: "Tout cela s'installe sur les outils déjà en place (le fichier existant, la boîte mail, le WhatsApp), sans changer de logiciel. Et l'installation commence par une mesure : l'audit gratuit compte les clients dormants exploitables du fichier et les demandes restées sans réponse. Si le chiffre ne justifie pas un moteur, la recommandation est de ne rien installer.",
      },
    ],
  },
  {
    slug: "btp-devis-jamais-relances",
    initials: "PM",
    author: "Pôle métiers",
    date: "3 août 2026",
    cat: "Métier",
    cover: "/photos/offload.jpg",
    title: "Artisan du bâtiment : les devis qu'on ne relance jamais",
    excerpt:
      "Des heures à chiffrer, puis plus rien : le devis part et le suivi s'arrête, parce que le chantier en cours passe d'abord. Ce qu'une relance organisée change pour une entreprise de travaux : sans y passer ses soirées.",
    body: [
      {
        p: "Un devis de travaux coûte cher à produire : la visite, le métré, les prix fournisseurs, la mise en page, souvent une heure ou deux par proposition, prises le soir. Et puis il part, et il ne se passe plus rien. Le chantier en cours prend le dessus, la relance se fait « quand on y pense », c'est-à-dire tard, ou jamais. Le particulier, lui, a demandé trois devis : il signe fréquemment avec l'entreprise qui a rappelé la première, pas avec la moins chère.",
      },
      {
        h: "Pourquoi le suivi saute toujours",
        p: "Ce n'est pas de la négligence, c'est une question de journées : on ne relance pas un prospect à 19 heures en rentrant d'un chantier, et le lundi il y a plus urgent. Le suivi des devis est un travail de bureau régulier dans un métier qui n'a pas de bureau régulier. C'est exactement le genre de tâche qui se confie à un système.",
      },
      {
        h: "Ce que fait PAYD sur les devis",
        p: "Le moteur PAYD reprend chaque devis envoyé et le suit : quelques jours sans réponse, et un message de suivi part, formulation cordiale, jamais le mot « relance », en proposant de passer voir le chantier ou de caler une date d'intervention. Une seconde relance suit si besoin, puis le moteur s'arrête : il n'insiste jamais au point d'abîmer la relation. Chaque message est rédigé dans le vocabulaire du métier (chantier, intervention, acompte, situation), et le patron valide le ton une fois pour toutes.",
      },
      {
        h: "Côté factures, la même discipline",
        p: "Une fois le chantier livré, les factures suivent le même chemin : rappel à l'échéance, relances progressives, proposition d'échelonnement pour les gros montants, et mise en demeure uniquement sur validation expresse du patron. Le détail de ce circuit, et de ce qu'il change pour la trésorerie, est dans notre article consacré aux impayés en Guadeloupe.",
      },
      {
        h: "Les demandes entrantes et la paperasse suivent",
        p: "Le moteur ANSWR accueille les demandes de devis qui arrivent par mail et WhatsApp (nature des travaux, commune du chantier, délai, photos), et escalade immédiatement tout ce qui ressemble à une urgence. Le moteur OFFLOAD lit les factures fournisseurs reçues par mail et les range au journal d'achats, prêtes pour le cabinet : la saisie du dimanche soir disparaît.",
      },
      {
        p: "L'installation se fait sur les outils existants, sans changer de méthode de travail. Elle commence par une mesure, pas par une promesse : l'audit gratuit compte les devis restés sans relance sur les trois derniers mois et leur montant cumulé. C'est souvent le chiffre le plus surprenant de l'entretien, et si le calcul ne justifie rien, la recommandation est de ne rien installer.",
      },
    ],
  },
  {
    slug: "immobilier-repondre-en-premier",
    initials: "PM",
    author: "Pôle métiers",
    date: "2 août 2026",
    cat: "Métier",
    cover: "/photos/answr-phone.jpg",
    title: "Agence immobilière : le premier qui répond décroche la visite",
    excerpt:
      "Les contacts arrivent par les portails, WhatsApp et le téléphone : pendant que les journées se passent en visites et en estimations. Comment une agence indépendante répond à tout sans embaucher, et ce qu'on mesure avant d'installer quoi que ce soit.",
    body: [
      {
        p: "Un acquéreur qui cherche ne contacte jamais une seule agence : il écrit à toutes celles qui ont un bien dans ses critères, souvent le soir même de sa recherche. Un vendeur qui compare des agences pour un mandat juge d'abord une chose : la vitesse et la tenue de la première réponse. Dans les deux cas, l'agence qui répond en premier prend l'avantage, et c'est rarement une question de compétence, presque toujours une question de disponibilité.",
      },
      {
        h: "D'où viennent les contacts, et où ils se perdent",
        p: "Une agence indépendante reçoit ses demandes par les portails d'annonces, le formulaire du site, WhatsApp et le téléphone, y compris pendant les visites, précisément quand personne ne peut répondre. Chaque canal vit sa vie : rien ne rassemble les demandes au même endroit, rien ne trace celles qui sont restées sans réponse. Les messages du soir et du week-end attendent le lundi ; le prospect, lui, n'attend pas : il a déjà rappelé l'agence suivante de sa liste.",
      },
      {
        h: "Ce qu'une réponse tardive coûte vraiment",
        p: "Le coût ne se limite pas à la visite manquée. Un contact mal qualifié fait perdre du temps à tout le monde : visites organisées sans vérifier le financement, critères jamais posés, allers-retours pour des informations qui tenaient en trois questions. Et pendant que l'entrant déborde, le stock dort : les acquéreurs dont le projet n'a pas abouti, les vendeurs qui « attendaient de voir », les contacts d'estimation restés sans suite, personne n'a le temps de les rappeler, alors que ce sont les affaires les moins chères à conclure.",
      },
      {
        h: "Ce que fait ANSWR dans une agence",
        p: "Le moteur ANSWR rassemble les demandes entrantes (mail, WhatsApp), dans une seule file. Il répond immédiatement aux questions simples et pose les questions de qualification qui évitent les visites pour rien : secteur recherché, calendrier, financement en cours. Il ne s'engage jamais sur un prix, une disponibilité ou un rendez-vous : dès qu'une demande est sérieuse ou sensible, elle est transmise à l'agent avec le résumé de l'échange, prête à être traitée. Plus rien n'attend vingt-quatre heures, et chaque conversation reste journalisée.",
      },
      {
        h: "REVIVE : la base dormante d'une agence vaut de l'or",
        p: "Chaque agence possède un fichier de contacts qui n'ont pas abouti, et qui n'ont jamais été recontactés. Le moteur REVIVE reprend cette base à cadence maîtrisée : un message personnel, adapté à l'historique du contact, jamais une campagne de masse. Celui qui répond sort du circuit automatique et revient à l'agent ; celui qui demande à ne plus être contacté ne l'est plus jamais. Le travail que personne n'a le temps de faire se fait : proprement.",
      },
      {
        h: "Le matin, deux minutes pour tout voir",
        p: "Chaque matin, le rapport BRIEF pose l'état de la veille : les demandes arrivées, celles qui attendent une décision, les reprises de contact parties. Il se lit en deux minutes avant la première visite. Et la règle de la maison s'applique ici comme partout : les messages types sont validés par vous avant la mise en route, et tout ce qui sort du cadre remonte à un humain au lieu de partir tout seul.",
      },
      {
        p: "L'installation se fait sur les outils déjà en place (la boîte mail, le WhatsApp, le tableur de contacts), sans changer de logiciel ni de méthode de travail. Et elle commence par une mesure, pas par une promesse : l'audit gratuit compte les demandes restées sans réponse sous vingt-quatre heures et les contacts dormants exploitables. Si le chiffre ne justifie pas un moteur, la recommandation est de ne rien installer.",
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
    title: "Chèque TIC : jusqu'à 10 000 € pour votre installation",
    excerpt:
      "Le dispositif régional couvre l'essentiel du coût d'une automatisation pour les entreprises de Guadeloupe. Qui est éligible, quels montants, et comment on monte le dossier avec vous.",
    body: [
      {
        p: "La Région Guadeloupe soutient la transformation numérique des petites entreprises à travers le dispositif Chèque TIC : une subvention plafonnée à 10 000 €, qui couvre de 40 à 80 % du coût d'un projet numérique selon la nature des dépenses, 80 % sur la présence web et la sécurité, 40 % sur les logiciels de gestion et le matériel. Un projet d'automatisation Omega.AI (installation d'un moteur, raccordement aux outils, formation), entre précisément dans le champ de ce dispositif.",
      },
      {
        h: "Qui est éligible",
        p: "Le dispositif s'adresse aux très petites entreprises immatriculées en Guadeloupe depuis au moins un an, à jour de leurs obligations sociales et fiscales. Les critères précis (effectif, chiffre d'affaires, secteurs prioritaires, plafonds), sont fixés par la Région et évoluent selon les enveloppes votées. C'est la première chose que nous vérifions lors de l'audit : votre éligibilité est confirmée avant tout engagement, pas après.",
      },
      {
        h: "Ce que le dispositif couvre",
        p: "La subvention porte sur les dépenses du projet numérique : la prestation d'installation, le paramétrage des outils, l'accompagnement à la prise en main. Concrètement, sur une installation devisée, la part restant à la charge de l'entreprise peut être ramenée à une fraction du montant total : ce qui change complètement le calcul de retour sur investissement d'un moteur de relance ou d'un réceptionniste automatique.",
      },
      {
        h: "Comment le dossier se monte",
        p: "Un dossier de subvention demande des pièces administratives, un devis détaillé, une description du projet et de son impact. C'est un travail que la plupart des dirigeants repoussent, et c'est exactement pour cela que nous le prenons en charge. Omega.AI constitue le dossier avec vous : nous rédigeons la description technique, préparons le devis au format attendu, et suivons l'instruction jusqu'à la décision.",
      },
      {
        p: "Le calendrier joue un rôle : les enveloppes régionales sont votées puis consommées, et les dossiers déposés tôt dans l'exercice sont instruits plus vite. Si votre entreprise est éligible, chaque mois d'attente est un mois de subvention potentiellement perdue et de problème non traité. L'audit gratuit inclut la vérification d'éligibilité : c'est le point de départ.",
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
    title: "RGPD : où vivent vos données chez Omega.AI",
    excerpt:
      "Un espace dédié par client : chiffré, hébergé dans l'Union européenne, jamais mélangé, jamais revendu, effaçable sur demande. Ce que ça change pour une petite entreprise responsable de son fichier clients.",
    body: [
      {
        p: "Automatiser son entreprise, c'est confier à des machines l'accès à ce qu'elle a de plus sensible : le fichier clients, les factures, les échanges commerciaux. La question de savoir où ces données transitent et qui peut y accéder n'est pas un détail technique : c'est une obligation légale et un choix stratégique.",
      },
      {
        h: "Ce que le RGPD exige d'une petite entreprise",
        p: "Le règlement s'applique à toutes les entreprises, sans seuil de taille. Une petite entreprise qui utilise un fichier clients doit savoir où il est stocké, qui y accède, et être capable de répondre à une demande d'accès ou de suppression. Chaque outil qui touche à ces données est un sous-traitant au sens du règlement, et le dirigeant reste responsable de la chaîne complète, y compris des outils qu'il a branchés « pour essayer ».",
      },
      {
        h: "Le problème des outils opaques",
        p: "La plupart des outils d'automatisation grand public mélangent vos données avec celles de milliers d'autres comptes, dans une base dont vous ne savez ni où elle est, ni qui y accède, ni ce qu'il en reste après résiliation. Pour un fichier de clients guadeloupéens avec noms, téléphones et historiques d'achats, c'est une exposition que rien n'oblige à accepter.",
      },
      {
        h: "Le choix Omega.AI : un espace dédié par client",
        p: "Chez Omega.AI, chaque entreprise a son espace de données propre : chiffré, hébergé dans l'Union européenne, strictement séparé de celui des autres clients. Vous gardez vos outils de tous les jours (messagerie, tableur, WhatsApp), et c'est là que les moteurs agissent. Les modèles d'intelligence artificielle utilisés reçoivent le strict nécessaire à chaque tâche, jamais l'intégralité d'un fichier, et rien n'est réutilisé à d'autres fins.",
      },
      {
        h: "Ce que ça change concrètement",
        p: "En cas de contrôle ou de demande d'un client, vous savez répondre : les données sont dans votre espace dédié, traitées par ce moteur, pour cette finalité. Le registre des traitements est documenté à l'installation. Et le jour où vous arrêtez, l'export complet vous est remis et l'espace est effacé : c'est contractuel, pas une promesse orale.",
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
        p: "Le montant de la facture n'est que la partie visible. Un encours qui gonfle, c'est de la trésorerie qu'il faut compenser : par un découvert facturé par la banque, un fournisseur qu'on fait attendre à son tour, un investissement repoussé. C'est aussi du temps de dirigeant : chaque relance manuelle demande de retrouver le dossier, vérifier ce qui a été dit, choisir le ton. À dix relances par semaine, c'est une demi-journée perdue.",
      },
      {
        h: "Pourquoi la relance manuelle échoue",
        p: "Personne n'aime relancer. Résultat : on relance tard, on relance les gros montants en oubliant les petits, on saute une semaine parce que l'atelier déborde. Le client, lui, apprend vite qui relance systématiquement et qui laisse filer, et paie en priorité les fournisseurs organisés. L'irrégularité de la relance est exactement ce qui la rend inefficace.",
      },
      {
        h: "Ce qu'une relance systématique change",
        p: "Un moteur comme PAYD ne se fatigue pas et n'oublie rien : devis relancé à J+3 puis J+7, facture échue relancée à J+7 puis J+21, mise en demeure préparée au-delà, chaque message adapté à l'ancienneté du retard, chaque envoi soumis à votre validation. Les entreprises qui passent à la relance systématique constatent le même phénomène : ce ne sont pas les clients qui manquent de trésorerie qui paient plus vite, ce sont les clients qui payaient en dernier ceux qui ne relançaient pas.",
      },
      {
        p: "Le calcul à faire est simple : additionnez vos factures échues de plus de trente jours, ajoutez les devis restés sans réponse le mois dernier, et comparez au coût d'un moteur de relance, financé en partie par le Chèque TIC, jusqu'à 10 000 €, pour les entreprises éligibles. C'est précisément le chiffre que l'audit gratuit établit en trente minutes.",
      },
    ],
  },
];
