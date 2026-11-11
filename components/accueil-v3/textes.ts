/* ══════════════════════════════════════════════════════════════════════
   LES TEXTES DE L'ACCUEIL (05/11/2026)

   Le dessin est celui d'agent-ai-v1.21st.app, recopié au pixel. Le
   contenu, lui, est réécrit pour Omega (Teo : « refais une page d'accueil
   complètement en termes de contenu, du descriptif pro, avec les
   techniques d'Alex Hormozi pour que les gens cliquent »).

   Comment la page persuade, section par section — l'équation de valeur
   d'Hormozi (résultat rêvé × probabilité perçue ÷ délai × effort) :
     · hero ............ le résultat rêvé et l'effort ramené à rien
                         (« confiez », « rien ne part sans votre accord ») ;
     · ce que fait Omega  les trois façons d'automatiser (agents, logiciels
                         métiers, sur mesure) et le pilotage ; chaque titre
                         est un RÉSULTAT, jamais un outil ;
     · trois étapes .... le délai et l'effort : un audit, une installation
                         faite par nous, un clic pour valider ;
     · la grande phrase  le coût de l'inaction (Voss / Hormozi) ;
     · les chiffres .... la probabilité perçue — des engagements
                         vérifiables, pas une traction ;
     · les prix ........ l'inversion du risque : audit offert, aucun débit
                         avant l'installation, remboursé trente jours ;
     · l'appel final ... une question ouverte, puis l'action.

   CE QUI REMPLACE CE QUE LA RÉFÉRENCE INVENTE (règles maison de
   methode-site, qui priment sur la ressemblance) :
     · ses logos de fournisseurs d'IA → les outils de NOS CLIENTS, ceux de
       /integrations, en mots-symboles (on ne nomme jamais notre pile) ;
     · ses faux témoignages signés → trois convictions d'Omega, puis six
       cartes « situation » signées par l'agent ou le logiciel qui la règle ;
     · ses compteurs de traction → quatre engagements tirés de /tarifs ;
     · ses logos de clients → nos propres logiciels métiers ;
     · ses prix → aucun montant : « offert » pour l'audit (fait publié),
       « sur devis » pour le reste — tout tarif est arrêté à l'audit ;
     · SOC 2 / SSO → les formules données validées (espace dédié, hébergé
       dans l'Union européenne, export et suppression sur demande) ;
     · sa vidéo de démo → notre propre vidéo de motion design, 9 s, faite
       sur nos écrans (Remotion, PEGASE/stories/reels/video-accueil).
   Les captures sont nos vrais écrans, thème sombre, relevées par
   outils/accueil-captures.mjs.
   ══════════════════════════════════════════════════════════════════════ */

export const AUDIT = "/reserver-un-audit";


/* 05/11 (Teo, 2ᵉ passe) — « tu lis les premières lignes, tu sais exactement
   ce qu'on fait, comment, pourquoi, et pour qui ». La première version ne
   parlait que des quatre agents : le hero dit désormais le métier d'Omega
   (automatiser les processus pénibles), ses trois formes (agents, logiciels
   par métier, sur mesure), à qui il s'adresse (PME et groupes) et ce qui
   rassure (vos outils restent, rien ne part sans vous). */
export const HERO = {
  titre: "Automatisez les processus qui ralentissent votre entreprise",
  chapo:
    "Agents IA prêts à l'emploi, logiciels pensés pour votre métier ou développement sur mesure, branchés sur vos outils actuels. Pour les PME comme pour les groupes.",
  bouton: "Réserver un audit offert",
};

/* les outils de nos clients — liste de /integrations, en texte */
export const OUTILS = [
  "Gmail",
  "WhatsApp",
  "Google Sheets",
  "Google Drive",
  "Notion",
  "HubSpot",
  "Sage",
  "QuickBooks",
  "Shopify",
  "Stripe",
  "Calendly",
  "Airtable",
];

/* 05/11 (Teo) — « essayez l'espace client en direct » remplacé par une
   vidéo de motion design (source : PEGASE/stories/reels/video-accueil),
   ralentie de 9 à 15 s le même jour (« on n'a pas trop le temps de lire »). */
export const DEMO = {
  surtitre: "Voir la démo",
  titre: "Omega, en quinze secondes",
  texte:
    "Ce que vos agents préparent pendant la nuit, et la seule chose qui vous reste à faire le matin : valider.",
  /* 05/11 — refaite en blanc avec la page (noms neufs : aucun cache ne
     resservira la version sombre) */
  video: "/accueil/demo-clair-15s.mp4",
  duree: "0:15",
};

export type Agent = {
  id: "agents" | "metiers" | "sur-mesure" | "pilotage";
  onglet: string;
  resume: string;
  couleur: "green" | "purple" | "orange" | "blue";
  titre: string;
  texte: string;
  lien: string;
  bouton: string;
  image: string;
  alt: string;
};

/* 05/11 (Teo, 2ᵉ passe) — la section présentait les quatre SaaS un à un ;
   elle présente maintenant les TROIS façons d'automatiser et l'espace qui
   les pilote. Les quatre agents tiennent dans le premier onglet, les sept
   logiciels métiers dans le deuxième, le sur-mesure a enfin sa place. */
export const AGENTS_INTRO = {
  surtitre: "Ce que fait Omega",
  titre: ["Trois façons d'automatiser,", "un seul espace pour tout piloter"],
};

export const AGENTS: Agent[] = [
  {
    id: "agents",
    onglet: "Agents IA",
    resume: "Relances, demandes clients, documents, clients inactifs.",
    couleur: "green",
    titre: "Quatre agents pour les tâches que toutes les entreprises partagent",
    texte:
      "Relancer les impayés, répondre aux demandes, traiter les factures fournisseurs, reprendre contact avec les clients qui s'éteignent. Chaque agent travaille sur vos outils et prépare tout : il ne vous reste qu'à valider.",
    lien: "/offres",
    bouton: "Voir les quatre agents",
    image: "/accueil/agents-clair.webp",
    alt: "La vue d'ensemble des agents dans l'espace client",
  },
  {
    id: "metiers",
    onglet: "Logiciels métiers",
    resume: "Sept secteurs ont leur logiciel, construit sur leurs règles.",
    couleur: "purple",
    titre: "Un logiciel qui connaît déjà les règles de votre métier",
    texte:
      "Avenants de chantier, pièces d'un dossier d'avocat, plans d'un permis de construire, états des lieux d'un loueur, plannings d'un cabinet dentaire, reporting d'un groupe : chaque secteur a ses contraintes, et son logiciel est construit pour elles.",
    lien: "/secteurs",
    bouton: "Trouver votre secteur",
    image: "/accueil/metiers-clair.webp",
    alt: "Daliro, le logiciel du BTP : les avenants à chiffrer, valider et signer",
  },
  {
    id: "sur-mesure",
    onglet: "Sur mesure",
    resume: "Votre processus n'est dans aucune liste ? On le construit.",
    couleur: "orange",
    titre: "Le processus qui n'existe que chez vous, automatisé lui aussi",
    texte:
      "Validation des achats, planning des équipes, tableaux à consolider, échanges entre services : on cartographie le processus avec vous, on le construit et on le branche sur vos logiciels. Son périmètre et son prix sont écrits avant de commencer.",
    lien: "/offres/sur-mesure",
    bouton: "Découvrir le sur-mesure",
    image: "/accueil/sur-mesure-clair.webp",
    alt: "Les automatisations d'une entreprise dans l'espace client",
  },
  {
    id: "pilotage",
    onglet: "Pilotage",
    resume: "Tout passe par votre validation, dans un seul espace.",
    couleur: "blue",
    titre: "Vous gardez la main sur tout ce que fait l'IA",
    texte:
      "Agents, logiciels et automatisations remontent dans le même espace client : ce qui est prêt, ce qui attend votre accord, ce qui a été fait. Rien ne part sans validation, et chaque action laisse une trace.",
    lien: "/espace2",
    bouton: "Voir l'espace client",
    image: "/accueil/pilotage-clair.webp",
    alt: "La file des validations du matin dans l'espace client",
  },
];

export const ETAPES_INTRO = {
  surtitre: "Comment ça marche",
  titre: "De l'audit au premier agent en service, sans changer d'outils",
  texte:
    "Trois étapes, et rien à remplacer : nos agents se branchent sur ce que votre équipe utilise déjà.",
};

export const ETAPES = [
  {
    n: "01",
    couleur: "green" as const,
    titre: "Un audit de 30 minutes",
    texte:
      "On relève sur vos exports ce qui prend du temps chaque mois. Vous repartez avec le périmètre et le tarif, écrits. C'est offert.",
    image: "/accueil/etape-1-clair.webp",
  },
  {
    n: "02",
    couleur: "purple" as const,
    titre: "L'installation, par notre équipe",
    texte:
      "Nous raccordons vos messageries, vos tableurs et votre comptabilité. Aucun débit avant la fin de l'installation.",
    image: "/accueil/etape-2-clair.webp",
  },
  {
    n: "03",
    couleur: "orange" as const,
    titre: "Vous validez, ils exécutent",
    texte:
      "Chaque matin, ce qui est prêt vous attend. Un clic pour valider, un pour corriger. Rien ne part sans vous.",
    image: "/accueil/etape-3-clair.webp",
  },
];

export const ETAPES_PIED = {
  libelle: "Durée de l'audit, offert et sans engagement",
  valeur: "30 minutes",
  bouton: "Réserver mon audit",
};

/* la grande citation : trois convictions, pas trois clients inventés */
export const CITATIONS = [
  {
    texte:
      "Ce qu'on automatise, ce n'est pas les gens. C'est tout ce qui les empêche de faire leur vrai travail.",
    signe: "Omega",
    role: "Notre conviction",
  },
  {
    texte:
      "Chaque relance oubliée, chaque demande sans réponse, c'est un client qui signe ailleurs pendant que vous êtes occupé.",
    signe: "Omega",
    role: "Ce que coûte l'attente",
  },
  {
    texte: "Vous n'écrivez plus rien. Vous validez, ou pas.",
    signe: "Omega",
    role: "Notre méthode",
  },
];

export const METIERS_INTRO = {
  surtitre: "Logiciels métiers",
  titre: "Un logiciel construit pour votre métier",
};

export const METIERS = [
  {
    nom: "Daliro",
    metier: "BTP",
    texte: "Les travaux supplémentaires sont chiffrés et signés avant exécution.",
    href: "/secteurs/btp",
    image: "/accueil/daliro-clair.webp",
    pastille: null as string | null,
  },
  {
    nom: "Tamila",
    metier: "Cabinets d'avocats",
    texte: "Chaque fait renvoie à la pièce et à la page qui le fondent.",
    href: "/secteurs/avocats",
    image: "/accueil/tamila-clair.webp",
    pastille: null,
  },
  {
    nom: "Lorani",
    metier: "Architectes",
    texte: "Les plans, le CCTP et la DPGF sont croisés avant le permis.",
    href: "/secteurs/architectes",
    image: "/accueil/lorani-clair.webp",
    pastille: null,
  },
  {
    nom: "Varelo",
    metier: "Grands groupes",
    texte: "Le plan de tout le groupe, et des agents qui proposent une action que vous validez.",
    href: "/secteurs/groupes",
    image: "/accueil/varelo-clair.webp",
    pastille: "Lecture seule",
  },
];

export const DONNEES = {
  surtitre: "Vos données",
  titre: "Elles restent les vôtres",
  texte:
    "Un espace dédié à votre entreprise, chiffré, hébergé dans l'Union européenne. Export complet et suppression sur demande.",
};

/* des engagements vérifiables, tous publiés sur /tarifs */
export const CHIFFRES_INTRO = {
  surtitre: "En chiffres",
  titre: "Des engagements, pas des promesses",
};
export const CHIFFRES = [
  { valeur: 30, suffixe: " min", titre: "Pour un audit offert", sous: "Votre tarif est écrit à la fin" },
  { valeur: 0, suffixe: " €", titre: "Débité avant l'installation", sous: "Vous payez ce qui tourne" },
  { valeur: 30, suffixe: " j", titre: "Remboursement intégral", sous: "Après la mise en service, sans justifier" },
  { valeur: 7, suffixe: "", titre: "Logiciels métiers", sous: "Du chantier au cabinet d'avocats" },
];

export const LOGICIELS_INTRO = {
  surtitre: "Pour chaque métier",
  titre: "Chaque métier a ses règles. Ses logiciels aussi.",
};
export const LOGICIELS = [
  { nom: "Daliro", src: "/logos/daliro-lockup.png" },
  { nom: "Tamila", src: "/logos/tamila-lockup.png" },
  { nom: "Lorani", src: "/logos/lorani-lockup.png" },
  { nom: "Tavaro", src: "/logos/tavaro-lockup.png" },
  { nom: "Tiroma", src: "/logos/tiroma-lockup.png" },
  { nom: "Varelo", src: "/logos/varelo-lockup.png" },
  { nom: "CASHD", src: "/logos/cashd-lockup.png" },
  { nom: "REPUT", src: "/logos/reput-lockup.png" },
  { nom: "OFFLOAD", src: "/logos/offload-lockup.png" },
  { nom: "FILED", src: "/logos/filed-lockup.png" },
];

/* six processus pénibles, de la PME au groupe, jusqu'au sur-mesure —
   signés par ce qui les règle, aucun client nommé */
export const SITUATIONS = [
  {
    texte:
      "Les factures échues s'accumulent parce que relancer gêne tout le monde. Chaque matin, les relances sont écrites dans votre ton. Vous validez, elles partent.",
    nom: "CASHD",
    role: "Agent · relances et encaissements",
    logo: "/logos/cashd-mark.png",
  },
  {
    texte:
      "Une demande reçue à 21 h obtient sa réponse à 21 h. Le client qui attendait un devis ne part plus chez le concurrent qui a décroché le premier.",
    nom: "REPUT",
    role: "Agent · demandes clients",
    logo: "/logos/reput-mark.png",
  },
  {
    texte:
      "Factures, bons de livraison, attestations : chaque pièce reçue est lue, contrôlée et rangée. La comptabilité reçoit un dossier complet, pas une boîte mail.",
    nom: "FILED",
    role: "Agent · documents reçus",
    logo: "/logos/filed-mark.png",
  },
  {
    texte:
      "Les travaux supplémentaires repérés dans les photos et les vocaux du chantier sont chiffrés sur vos prix et signés avant que l'ouvrage soit refermé.",
    nom: "Daliro",
    role: "Logiciel métier · BTP",
    logo: "/logos/daliro-mark.png",
  },
  {
    texte:
      "Le plan de tout le groupe, une fiche par société, client, fournisseur et contrat, rempli en lecture seule. Des agents le lisent et proposent une action ; la direction décide.",
    nom: "Varelo",
    role: "Logiciel métier · grands groupes",
    logo: "/logos/varelo-mark.png",
  },
  {
    texte:
      "Votre processus n'est dans aucune liste : validation des achats, planning des équipes, tableaux à consolider. On le dessine avec vous, puis on l'automatise sur vos logiciels.",
    nom: "Sur mesure",
    role: "Processus propres à votre entreprise",
    logo: "/logos/surmesure-mark.svg",
  },
];

export const PRIX_INTRO = {
  surtitre: "Tarifs",
  titre: "Un tarif écrit avant tout engagement",
  texte:
    "Le montant dépend de ce que nos agents traitent pour vous, pas du nombre d'utilisateurs. Il se relève sur vos exports, pendant l'audit.",
};

export const PRIX = [
  {
    nom: "Audit",
    texte: "Pour savoir ce que l'IA peut reprendre chez vous, et à quel prix.",
    prix: "Offert",
    sous: "30 minutes, sans engagement",
    points: [
      "Vos volumes relevés sur vos exports",
      "Les tâches à confier, classées par gain",
      "Le périmètre et le tarif, écrits",
      "Le plan de mise en service",
    ],
    bouton: "Réserver l'audit",
    href: AUDIT,
    fort: false,
  },
  {
    nom: "Agents",
    texte: "Un à quatre agents en service, pilotés sur une seule file de validation.",
    prix: "À l'usage",
    sous: "facturé à la pièce traitée",
    points: [
      "Jamais de prix par utilisateur",
      "Jamais un pourcentage de vos encaissements",
      "Aucun débit avant la fin de l'installation",
      "Mensuel sans engagement, ou annuel −15 %",
      "Remboursé pendant 30 jours",
      "Export complet de vos données",
    ],
    bouton: "Voir les tarifs",
    href: "/tarifs",
    fort: true,
  },
  {
    nom: "Métier & sur mesure",
    texte: "Un logiciel pour votre métier, ou un processus hors catalogue.",
    prix: "Sur devis",
    sous: "selon vos règles de validation",
    points: [
      "Sept logiciels métiers",
      "Raccordé à vos outils actuels",
      "Plusieurs services, règles distinctes",
      "Lecture seule pour les groupes",
      "Un interlocuteur dans l'équipe",
    ],
    bouton: "Parler à l'équipe",
    href: "/contact",
    fort: false,
  },
];

export type Question = { id: string; cat: string; q: string; r: string };
export const FAQ_CATEGORIES = ["Tout", "Général", "Tarifs", "Sécurité", "Intégrations", "Accompagnement"];
export const FAQ: Question[] = [
  {
    id: "omega",
    cat: "Général",
    q: "Qu'est-ce qu'Omega ?",
    r: "Omega est une startup d'intelligence artificielle née aux Antilles françaises. Nous automatisons les processus répétitifs des entreprises de trois façons : des agents prêts à l'emploi (relances, demandes clients, documents, clients inactifs), des logiciels construits pour sept métiers, et des automatisations sur mesure.",
  },
  {
    id: "sur-mesure",
    cat: "Général",
    q: "Pouvez-vous automatiser un processus propre à notre entreprise ?",
    r: "Oui, c'est l'offre sur mesure. Pendant l'audit, on cartographie le processus avec vous : qui intervient, sur quels logiciels, avec quelles règles de validation. Vous repartez avec le périmètre et le prix, écrits avant tout engagement.",
  },
  {
    id: "difference",
    cat: "Général",
    q: "En quoi est-ce différent d'un assistant IA grand public ?",
    r: "Un assistant attend qu'on lui pose une question. Nos agents travaillent seuls, chaque jour, sur vos outils et vos données, et vous présentent un travail prêt à valider. Personne n'a à rédiger de consigne ni à copier-coller.",
  },
  {
    id: "pour-qui",
    cat: "Général",
    q: "À qui s'adresse Omega ?",
    r: "Aux PME et aux groupes multi-sites, quel que soit le secteur. Le BTP, les cabinets d'avocats, les architectes, les loueurs automobiles, les cabinets dentaires, les hôtels et les grands groupes ont en plus leur propre logiciel.",
  },
  {
    id: "prix",
    cat: "Tarifs",
    q: "Pourquoi aucun prix n'est-il affiché ?",
    r: "Le montant dépend du nombre de pièces traitées chaque mois et de la part qui revient à un opérateur. Ces deux chiffres se relèvent sur vos exports pendant l'audit : vous repartez avec un tarif écrit, avant tout engagement.",
  },
  {
    id: "utilisateur",
    cat: "Tarifs",
    q: "Faut-il payer par utilisateur ?",
    r: "Non. L'unité facturée est la pièce traitée : une facture lue, une demande reçue, une relance envoyée. Un compte de plus n'entraîne aucun surcoût, et nous ne prenons jamais de pourcentage sur vos encaissements.",
  },
  {
    id: "remboursement",
    cat: "Tarifs",
    q: "Que se passe-t-il si l'offre ne convient pas ?",
    r: "Le remboursement est intégral pendant trente jours à compter de la mise en service, sans justification à fournir. Au-delà, la formule mensuelle reste résiliable à tout moment, et l'export complet de vos données vous est remis.",
  },
  {
    id: "donnees",
    cat: "Sécurité",
    q: "Où sont mes données ?",
    r: "Dans un espace dédié à votre entreprise, chiffré, hébergé dans l'Union européenne et jamais mélangé à celui d'un autre client. Les modèles ne reçoivent que le strict nécessaire à chaque tâche, et rien n'est réutilisé à d'autres fins.",
  },
  {
    id: "accord",
    cat: "Sécurité",
    q: "Un agent peut-il envoyer quelque chose sans mon accord ?",
    r: "Non. Tout ce qui sort — une relance, une réponse, un courriel — passe d'abord par votre validation. Vous gardez la main sur ce qui part, et à qui.",
  },
  {
    id: "outils",
    cat: "Intégrations",
    q: "Faut-il changer nos outils ?",
    r: "Non. Les agents se branchent sur ce que vous utilisez déjà : Gmail, WhatsApp, Google Sheets, Google Drive, Sage, QuickBooks, HubSpot et bien d'autres. Votre équipe garde ses habitudes.",
  },
  {
    id: "absent",
    cat: "Intégrations",
    q: "Et si notre logiciel n'est pas dans la liste ?",
    r: "On en parle pendant l'audit. Un logiciel métier à raccorder fait partie de l'offre sur mesure, avec son périmètre et son tarif écrits avant de commencer.",
  },
  {
    id: "installation",
    cat: "Accompagnement",
    q: "Qui s'occupe de l'installation ?",
    r: "Notre équipe, de bout en bout. Le plan de mise en service est écrit pendant l'audit, et aucun débit n'intervient avant la fin de l'installation.",
  },
  {
    id: "support",
    cat: "Accompagnement",
    q: "Qui répond si j'ai une question ?",
    r: "Un membre de l'équipe, le jour même : par le formulaire du service client, par courriel ou par téléphone.",
  },
];

export const FAQ_INTRO = {
  surtitre: "FAQ",
  titre: "Les questions qu'on nous pose",
  texte:
    "Tout ce qu'il faut savoir avant l'audit. Une question manque ? Notre équipe vous répond le jour même.",
  carte: "Encore une question ?",
  carteSous: "Écrire à l'équipe",
};

export const APPEL = {
  surtitre: "Commencer",
  titre: "Combien d'heures votre équipe a-t-elle perdues cette semaine ?",
  texte:
    "En 30 minutes, on vous dit lesquelles nos agents peuvent reprendre, et ce que ça coûte. Offert, sans engagement.",
  principal: "Réserver un audit offert",
  second: "Ouvrir la démo",
};

export const PIED = {
  phrase: "On automatise les processus qui ralentissent les entreprises : agents IA, logiciels métiers et sur-mesure, sous votre validation.",
  colonnes: [
    {
      titre: "Agents",
      liens: [
        { label: "CASHD", href: "/offres/relances-impayes" },
        { label: "REPUT", href: "/offres/demandes-clients" },
        { label: "OFFLOAD", href: "/offres/nouvelles-affaires" },
        { label: "FILED", href: "/offres/factures-fournisseurs" },
        { label: "Sur mesure", href: "/offres/sur-mesure" },
      ],
    },
    {
      titre: "Métiers",
      liens: [
        { label: "BTP", href: "/secteurs/btp" },
        { label: "Avocats", href: "/secteurs/avocats" },
        { label: "Architectes", href: "/secteurs/architectes" },
        { label: "Loueurs automobiles", href: "/secteurs/location-automobile" },
        { label: "Cabinets dentaires", href: "/secteurs/dentaire" },
        { label: "Hôtels", href: "/secteurs/hotellerie" },
        { label: "Grands groupes", href: "/secteurs/groupes" },
      ],
    },
    {
      titre: "Ressources",
      liens: [
        { label: "Tarifs", href: "/tarifs" },
        { label: "Intégrations", href: "/integrations" },
        { label: "Modèles de site", href: "/modeles" },
        { label: "Blog", href: "/blog" },
      ],
    },
    {
      titre: "Omega",
      liens: [
        { label: "Réserver un audit", href: AUDIT },
        { label: "Espace client", href: "/espace2" },
        { label: "Service client", href: "/contact" },
        { label: "Où vont vos données", href: "/vos-donnees" },
      ],
    },
  ],
};
