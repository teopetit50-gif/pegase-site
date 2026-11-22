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
/* 22/11 (Teo, « on part sur le sujet ERP, ce qu'on veut faire ») — le hero
   ne dit plus « on automatise sur vos outils » mais ce qu'est le produit :
   un logiciel de gestion qui se configure avec l'IA, où des agents font le
   travail répétitif. La formule vient de la note produit de Yacer (22/11). */
export const HERO = {
  titre: "L'ERP qui se configure avec l'IA et travaille à votre place",
  chapo:
    "Omega réunit ventes, achats, stock, banque et comptabilité dans un seul logiciel. Vous décrivez votre activité, l'IA le règle et des agents font le travail répétitif, en PME comme en groupe.",
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
  id: "gestion" | "agents" | "metiers" | "sur-mesure" | "pilotage";
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
   logiciels métiers dans le deuxième, le sur-mesure a enfin sa place.

   22/11 (Teo, « on part sur le sujet ERP ») — la gestion passe en tête :
   c'est elle le produit, et les agents, les métiers et le sur-mesure en
   deviennent les modules. Sa capture est l'écran des factures fournisseurs
   de l'espace client (outils/accueil-captures.mjs, cadre « gestion »). */
export const AGENTS_INTRO = {
  surtitre: "Ce que fait Omega",
  titre: ["Toute votre gestion dans un seul logiciel,", "et des agents IA qui y travaillent"],
};

export const AGENTS: Agent[] = [
  {
    id: "gestion",
    onglet: "Gestion",
    resume: "Ventes, achats, stock, banque, comptabilité, documents.",
    couleur: "blue",
    titre: "Toute votre gestion au même endroit, réglée pour votre activité",
    texte:
      "Clients, ventes, achats, stock, banque, comptabilité et documents partagent les mêmes données. Vous décrivez votre activité : l'IA active les bons modules et règle la TVA, le plan comptable et vos modèles de documents. Votre expert-comptable valide le paramétrage avant la mise en route.",
    lien: AUDIT,
    bouton: "Réserver un audit",
    image: "/accueil/gestion-clair.webp",
    alt: "Les factures fournisseurs dans l'espace client : à payer, à valider, comptabilisées",
  },
  {
    id: "agents",
    onglet: "Agents IA",
    resume: "Relances, demandes clients, factures fournisseurs, clients inactifs.",
    couleur: "green",
    titre: "Quatre agents font le travail répétitif à votre place",
    texte:
      "Relancer les impayés, répondre aux demandes, traiter les factures fournisseurs, reprendre contact avec les clients devenus inactifs. Chaque agent prépare tout dans le logiciel : il ne vous reste qu'à valider.",
    lien: "/offres",
    bouton: "Voir les quatre agents",
    image: "/accueil/agents-clair.webp",
    alt: "La vue d'ensemble des agents dans l'espace client",
  },
  {
    id: "metiers",
    onglet: "Modules métier",
    resume: "Sept secteurs ont leur module, construit sur leurs règles.",
    couleur: "purple",
    titre: "Un module qui connaît déjà les règles de votre métier",
    texte:
      "Avenants de chantier, pièces d'un dossier d'avocat, plans d'un permis de construire, états des lieux d'un loueur, plannings d'un cabinet dentaire, réservations d'un hôtel, tableaux de bord d'un groupe : chaque secteur a ses contraintes, et son module est construit pour elles.",
    lien: "/secteurs",
    bouton: "Trouver votre secteur",
    image: "/accueil/metiers-clair.webp",
    alt: "Daliro, le module BTP : les avenants à chiffrer, valider et signer",
  },
  {
    id: "sur-mesure",
    onglet: "Sur mesure",
    resume: "Votre besoin n'est dans aucune liste ? On le construit.",
    couleur: "orange",
    titre: "Le module qui n'existe que chez vous, construit pour vous",
    texte:
      "Validation des achats, planning des équipes, tableaux à consolider, échanges entre services : nous cartographions le processus avec vous, puis nous le construisons et l'ajoutons à votre logiciel. Son périmètre et son prix sont écrits avant de commencer.",
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
      "Gestion, agents et modules remontent dans le même espace : ce qui est prêt, ce qui attend votre accord, ce qui a été fait. Rien ne part sans validation, et chaque action laisse une trace.",
    lien: "/espace2",
    bouton: "Voir l'espace client",
    image: "/accueil/pilotage-clair.webp",
    alt: "La file des validations du matin dans l'espace client",
  },
];

export const ETAPES_INTRO = {
  surtitre: "Comment ça marche",
  titre: "De l'audit au logiciel réglé pour votre activité",
  texte:
    "Trois étapes : vous décrivez votre activité, Omega se règle, et vous validez ce que les agents préparent.",
};

export const ETAPES = [
  {
    n: "01",
    couleur: "green" as const,
    titre: "Un audit de 30 minutes",
    texte:
      "Vous décrivez votre activité, nous relevons sur vos exports vos volumes et ce qui prend du temps chaque mois. Vous repartez avec le périmètre et le tarif, écrits. C'est offert.",
    image: "/accueil/etape-1-clair.webp",
  },
  {
    n: "02",
    couleur: "purple" as const,
    titre: "L'installation, guidée par l'IA",
    texte:
      "L'IA pose les questions qui manquent, active vos modules et règle la TVA et le plan comptable. Nous reprenons vos données et votre expert-comptable valide le paramétrage.",
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
    texte: "L'IA prépare, vous validez. Chaque action laisse une trace.",
    signe: "Omega",
    role: "Notre méthode",
  },
];

export const METIERS_INTRO = {
  surtitre: "Modules métier",
  titre: "Sept métiers ont déjà leur module",
};

export const METIERS = [
  {
    nom: "Daliro",
    metier: "BTP",
    texte: "Chaque chantier suivi du premier appel au décompte final.",
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

/* des engagements vérifiables, tous publiés sur /tarifs

   22/11 (Teo, « agents seulement ») — « 0 € avant l'installation » et
   « remboursé 30 jours » ne valent que pour les agents, pas pour le
   logiciel de gestion : les deux compteurs, la réponse « remboursement »
   et la réponse « installation » de la FAQ le disent, et l'étape 02 ne
   porte plus la phrase sur le débit. */
export const CHIFFRES_INTRO = {
  surtitre: "En chiffres",
  titre: "Des engagements, pas des promesses",
};
export const CHIFFRES = [
  { valeur: 30, suffixe: " min", titre: "Pour un audit offert", sous: "Votre tarif est écrit à la fin" },
  { valeur: 0, suffixe: " €", titre: "Débité avant l'installation", sous: "Vos agents : vous payez ce qui tourne" },
  { valeur: 30, suffixe: " j", titre: "Remboursement intégral", sous: "Vos agents : sans avoir à justifier" },
  { valeur: 7, suffixe: "", titre: "Modules métier", sous: "Du chantier au cabinet d'avocats" },
];

export const LOGICIELS_INTRO = {
  surtitre: "Pour chaque métier",
  titre: "Chaque métier a ses règles. Ses modules aussi.",
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
      "Factures, bons de livraison, attestations : chaque pièce reçue est lue, contrôlée, rangée et comptabilisée dans votre logiciel.",
    nom: "FILED",
    role: "Agent · documents reçus",
    logo: "/logos/filed-mark.png",
  },
  {
    texte:
      "Chaque chantier suivi du premier appel au décompte final : le devis dicté, les passages confirmés, le terrain lu, l'avenant signé avant l'ouvrage, la situation préparée, la réception suivie.",
    nom: "Daliro",
    role: "Module métier · BTP",
    logo: "/logos/daliro-mark.png",
  },
  {
    texte:
      "Le plan de tout le groupe, une fiche par société, client, fournisseur et contrat, rempli en lecture seule. Des agents le lisent et proposent une action ; la direction décide.",
    nom: "Varelo",
    role: "Module métier · grands groupes",
    logo: "/logos/varelo-mark.png",
  },
  {
    texte:
      "Votre processus n'est dans aucune liste : validation des achats, planning des équipes, tableaux à consolider. Nous le dessinons avec vous, puis nous le construisons dans votre logiciel de gestion ou sur vos outils actuels.",
    nom: "Sur mesure",
    role: "Processus propres à votre entreprise",
    logo: "/logos/surmesure-mark.svg",
  },
];

export const PRIX_INTRO = {
  surtitre: "Tarifs",
  titre: "Un tarif écrit avant tout engagement",
  texte:
    "Le montant dépend des modules que vous activez et du volume que les agents traitent pour vous. Nous le relevons sur vos exports pendant l'audit.",
};

/* 22/11 — la carte du milieu, la carte forte, devient le logiciel de
   gestion ; les agents gardent leur formule à l'usage, en troisième. Aucun
   montant, comme avant : tout tarif est arrêté à l'audit. */
export const PRIX = [
  {
    nom: "Audit",
    texte: "Pour savoir ce qu'Omega peut reprendre chez vous, et à quel prix.",
    prix: "Offert",
    sous: "30 minutes, sans engagement",
    points: [
      "Votre activité et vos volumes, relevés sur vos exports",
      "Les modules et les agents à activer, classés par gain",
      "Le périmètre et le tarif, écrits",
      "Le plan de mise en service",
    ],
    bouton: "Réserver l'audit",
    href: AUDIT,
    fort: false,
  },
  {
    nom: "Logiciel de gestion",
    texte: "Votre gestion au même endroit, réglée par l'IA pour votre activité.",
    prix: "Sur devis",
    sous: "selon les modules activés",
    points: [
      "Ventes, achats, stock, banque, comptabilité",
      "Sept modules métier, et du sur-mesure",
      "Vos données reprises de votre logiciel actuel",
      "Paramétrage validé par votre expert-comptable",
      "Un interlocuteur dédié dans notre équipe",
    ],
    bouton: "Parler à l'équipe",
    href: "/contact",
    fort: true,
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
    r: "Omega est un éditeur de logiciels français. Notre logiciel de gestion (ERP) se configure avec l'IA : ventes, achats, stock, banque, comptabilité et documents au même endroit, des agents qui y font le travail répétitif (relances, demandes clients, factures fournisseurs, clients inactifs), sept modules métier, et du sur-mesure pour ce qui n'existe que chez vous.",
  },
  {
    id: "erp",
    cat: "Général",
    q: "En quoi est-ce différent d'un ERP classique ?",
    r: "Avec Omega, le paramétrage part d'une conversation : vous décrivez votre activité, l'IA pose les questions qui manquent, puis active les modules et règle la TVA, le plan comptable et les modèles de documents. Votre expert-comptable valide avant la mise en route. Ensuite, les agents font le travail répétitif et vous présentent un résultat prêt à valider.",
  },
  {
    id: "sur-mesure",
    cat: "Général",
    q: "Pouvez-vous automatiser un processus propre à notre entreprise ?",
    r: "Oui, c'est l'offre sur mesure. Pendant l'audit, nous cartographions le processus avec vous : qui intervient, sur quels logiciels, avec quelles règles de validation. Vous repartez avec le périmètre et le prix, écrits avant tout engagement.",
  },
  {
    id: "difference",
    cat: "Général",
    q: "En quoi est-ce différent d'un assistant IA grand public ?",
    r: "Un assistant attend qu'on lui pose une question. Nos agents travaillent seuls, chaque jour, dans votre logiciel de gestion et sur vos outils, et vous présentent un travail prêt à valider. Personne n'a à rédiger de consigne ni à copier-coller.",
  },
  {
    id: "pour-qui",
    cat: "Général",
    q: "À qui s'adresse Omega ?",
    r: "Aux PME et aux groupes multi-sites, que vous vendiez des produits, des services ou des abonnements. Le BTP, les cabinets d'avocats, les architectes, les loueurs automobiles, les cabinets dentaires, les hôtels et les grands groupes ont en plus leur propre module.",
  },
  {
    id: "prix",
    cat: "Tarifs",
    q: "Pourquoi aucun prix n'est-il affiché ?",
    r: "Le montant dépend des modules que vous activez, du nombre de pièces traitées chaque mois et de la part qui revient à un opérateur. Ces chiffres se relèvent sur vos exports pendant l'audit : vous repartez avec un tarif écrit, avant tout engagement.",
  },
  {
    id: "utilisateur",
    cat: "Tarifs",
    q: "Faut-il payer par utilisateur ?",
    r: "Pas pour les agents : l'unité facturée est la pièce traitée, une facture lue, une demande reçue, une relance envoyée. Le tarif du logiciel de gestion dépend des modules activés et vous est remis écrit à l'audit. Nous ne prenons jamais de pourcentage sur vos encaissements.",
  },
  {
    id: "remboursement",
    cat: "Tarifs",
    q: "Que se passe-t-il si l'offre ne convient pas ?",
    r: "Pour les agents, le remboursement est intégral pendant trente jours à compter de la mise en service, sans justification à fournir. Au-delà, leur formule mensuelle reste résiliable à tout moment, et l'export complet de vos données vous est remis. Pour le logiciel de gestion, les conditions de sortie sont écrites dans votre devis, avant tout engagement.",
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
    r: "Vous choisissez. Omega peut devenir votre logiciel de gestion, avec la reprise des données de votre logiciel actuel, ou commencer par des agents branchés sur ce que vous utilisez déjà : Gmail, WhatsApp, Google Sheets, Google Drive, Sage, QuickBooks, HubSpot et bien d'autres.",
  },
  {
    id: "absent",
    cat: "Intégrations",
    q: "Et si notre logiciel n'est pas dans la liste ?",
    r: "Nous en parlons pendant l'audit. Raccorder un logiciel métier ou reprendre les données d'un logiciel absent de la liste fait partie de l'offre sur mesure, avec un périmètre et un tarif écrits avant de commencer.",
  },
  {
    id: "installation",
    cat: "Accompagnement",
    q: "Qui s'occupe de l'installation ?",
    r: "Notre équipe vous accompagne de bout en bout. L'IA règle le logiciel à partir de la description de votre activité, nous reprenons vos données, et votre expert-comptable valide le paramétrage comptable avant la mise en route. Pour les agents, aucun débit n'intervient avant la fin de leur installation.",
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
    "En 30 minutes, nous vous disons lesquelles Omega peut reprendre et ce que cela coûte. Offert, sans engagement.",
  principal: "Réserver un audit offert",
  second: "Ouvrir la démo",
};

export const PIED = {
  phrase: "L'ERP qui se configure avec l'IA : votre gestion au même endroit, des agents, des modules métier et du sur-mesure, sous votre validation.",
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
