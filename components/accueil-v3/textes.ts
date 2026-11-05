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
     · quatre agents ... chaque titre est un RÉSULTAT, jamais un outil ;
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
     · sa vidéo de démo → l'espace client de démonstration, en direct
       (/espace2 est public et sert des données d'exemple).
   Les captures sont nos vrais écrans, thème sombre, relevées par
   outils/accueil-captures.mjs.
   ══════════════════════════════════════════════════════════════════════ */

export const AUDIT = "/reserver-un-audit";

export const NAV = [
  { label: "Offres", href: "/offres" },
  { label: "Métiers", href: "/secteurs" },
  { label: "Tarifs", href: "/tarifs" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export const HERO = {
  titre: "Confiez à des agents IA tout ce qui ralentit votre entreprise",
  chapo:
    "Ils relancent, répondent, trient et préparent sur vos outils actuels. Rien ne part sans votre accord.",
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

export const DEMO = {
  surtitre: "Voir la démo",
  titre: "Essayez l'espace client, en direct",
  texte:
    "Pas de vidéo montée : l'espace de démonstration est ouvert. Parcourez ce que nos agents ont préparé ce matin, comme le fera votre équipe.",
  pastille: "Données d'exemple",
};

export type Agent = {
  id: string;
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

export const AGENTS_INTRO = {
  surtitre: "Présentation d'Omega",
  titre: ["Quatre agents pour tout ce que", "personne n'a le temps de faire"],
};

export const AGENTS: Agent[] = [
  {
    id: "encaissements",
    onglet: "Encaissements",
    resume: "Les factures échues relancées chaque matin, dans votre ton.",
    couleur: "green",
    titre: "L'argent qu'on vous doit rentre, sans avoir à le réclamer",
    texte:
      "L'agent suit chaque facture échue, écrit la relance adaptée au client et à l'ancienneté de la dette, et vous la présente chaque matin. Vous validez, elle part. La relation reste la vôtre.",
    lien: "/offres/relances-impayes",
    bouton: "Découvrir CASHD",
    image: "/accueil/cashd.webp",
    alt: "CASHD — le tableau de bord des relances",
  },
  {
    id: "demandes",
    onglet: "Demandes",
    resume: "Chaque demande reçue obtient sa réponse, même à 21 h.",
    couleur: "purple",
    titre: "Plus une seule demande client sans réponse",
    texte:
      "Courriel, formulaire ou message : chaque demande est lue, qualifiée et reçoit une réponse préparée dans la minute. Le client servi, un avis lui est demandé. Celui qui attendait votre devis ne part plus chez celui qui a décroché.",
    lien: "/offres/demandes-clients",
    bouton: "Découvrir REPUT",
    image: "/accueil/reput.webp",
    alt: "REPUT — les demandes clients",
  },
  {
    id: "clients",
    onglet: "Clients",
    resume: "Les clients qui s'éteignent repérés avant qu'ils partent.",
    couleur: "orange",
    titre: "Vos anciens clients redeviennent des clients",
    texte:
      "Un client qui ne commande plus ne prévient pas. L'agent repère ceux qui s'éteignent dans votre historique et prépare la reprise de contact au bon moment. Vous décidez qui l'on rappelle.",
    lien: "/offres/nouvelles-affaires",
    bouton: "Découvrir OFFLOAD",
    image: "/accueil/offload.webp",
    alt: "OFFLOAD — les comptes à risque",
  },
  {
    id: "documents",
    onglet: "Documents",
    resume: "Chaque pièce reçue lue, contrôlée et rangée.",
    couleur: "blue",
    titre: "Chaque document reçu, lu et classé à votre place",
    texte:
      "Factures fournisseurs, bons de livraison, attestations : l'agent lit chaque pièce, la rapproche de la commande, signale l'écart et transmet un dossier complet à la comptabilité.",
    lien: "/offres/factures-fournisseurs",
    bouton: "Découvrir FILED",
    image: "/accueil/filed.webp",
    alt: "FILED — les documents reçus",
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
    image: "/accueil/etape-1.webp",
  },
  {
    n: "02",
    couleur: "purple" as const,
    titre: "L'installation, par notre équipe",
    texte:
      "Nous raccordons vos messageries, vos tableurs et votre comptabilité. Aucun débit avant la fin de l'installation.",
    image: "/accueil/etape-2.webp",
  },
  {
    n: "03",
    couleur: "orange" as const,
    titre: "Vous validez, ils exécutent",
    texte:
      "Chaque matin, ce qui est prêt vous attend. Un clic pour valider, un pour corriger. Rien ne part sans vous.",
    image: "/accueil/etape-3.webp",
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
    image: "/accueil/daliro.webp",
    pastille: null as string | null,
  },
  {
    nom: "Tamila",
    metier: "Cabinets d'avocats",
    texte: "Chaque fait renvoie à la pièce et à la page qui le fondent.",
    href: "/secteurs/avocats",
    image: "/accueil/tamila.webp",
    pastille: null,
  },
  {
    nom: "Lorani",
    metier: "Architectes",
    texte: "Les plans, le CCTP et la DPGF sont croisés avant le permis.",
    href: "/secteurs/architectes",
    image: "/accueil/lorani.webp",
    pastille: null,
  },
  {
    nom: "Varelo",
    metier: "Grands groupes",
    texte: "Toutes les sociétés du groupe travaillent avec la même IA, sur un seul référentiel.",
    href: "/secteurs/groupes",
    image: "/accueil/varelo.webp",
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

/* six situations, signées par ce qui les règle — aucun client nommé */
export const SITUATIONS = [
  {
    texte:
      "Les factures échues s'accumulent parce que relancer gêne tout le monde. Chaque matin, les relances sont écrites dans votre ton. Vous validez, elles partent.",
    nom: "CASHD",
    role: "Relances et encaissements",
    logo: "/logos/cashd-mark.png",
  },
  {
    texte:
      "Une demande reçue à 21 h obtient sa réponse à 21 h. Le client qui attendait un devis ne part plus chez le concurrent qui a décroché le premier.",
    nom: "REPUT",
    role: "Demandes clients",
    logo: "/logos/reput-mark.png",
  },
  {
    texte:
      "Un client qui ne commande plus ne prévient pas. L'agent repère ceux qui s'éteignent et prépare la reprise de contact avant qu'ils aient signé ailleurs.",
    nom: "OFFLOAD",
    role: "Clients inactifs",
    logo: "/logos/offload-mark.png",
  },
  {
    texte:
      "Factures, bons de livraison, attestations : chaque pièce reçue est lue, contrôlée et rangée. La comptabilité reçoit un dossier complet, pas une boîte mail.",
    nom: "FILED",
    role: "Documents reçus",
    logo: "/logos/filed-mark.png",
  },
  {
    texte:
      "Les travaux supplémentaires repérés dans les photos et les vocaux du chantier sont chiffrés sur vos prix et signés avant que l'ouvrage soit refermé.",
    nom: "Daliro",
    role: "Entreprises du BTP",
    logo: "/logos/daliro-mark.png",
  },
  {
    texte:
      "Toutes les sociétés du groupe lues par la même IA, en lecture seule. La direction reçoit chaque matin une page qui dit ce qui demande une décision.",
    nom: "Varelo",
    role: "Grands groupes",
    logo: "/logos/varelo-mark.png",
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
    r: "Omega est une startup d'intelligence artificielle née aux Antilles françaises. Nous installons des agents IA qui prennent en charge le travail répétitif d'une entreprise — relances, demandes clients, documents, suivi des clients — et des logiciels construits pour sept métiers.",
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
  phrase: "Des agents IA qui font tourner votre entreprise, sous votre validation.",
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
