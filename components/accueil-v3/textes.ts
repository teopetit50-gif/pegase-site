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
/* 22/11, 2ᵉ passe (Teo : « regarde Odoo comment ils ont fait, on ne comprend
   pas assez, les textes ne sont pas assez clairs ») — toute la page est
   réécrite à la manière de la page d'accueil d'Odoo, relevée le jour même :
     · des titres de six à neuf mots, un seul message chacun ;
     · des noms que tout le monde connaît (ventes, achats, stock, banque,
       comptabilité) plutôt que des notions (paramétrage, périmètre,
       processus, pilotage) ;
     · une idée par phrase, adressée au lecteur ;
     · sous le titre, la liste de ce que fait le logiciel, comme leur grille
       d'applications.
   Le dessin ne bouge pas : seuls les mots changent. */
export const HERO = {
  titre: "Le logiciel de gestion où l'IA travaille pour vous",
  chapo:
    "Omega est un ERP : ventes, achats, stock, banque et comptabilité au même endroit. L'IA l'adapte à votre activité et fait le travail répétitif. Vous validez.",
  bouton: "Réserver un audit offert",
};

/* 22/11 — le bandeau sous le titre listait les outils de nos clients (Gmail,
   Sage…) ; il liste maintenant ce que fait le logiciel, comme la grille
   d'applications d'Odoo : on comprend le produit en lisant des noms. Les
   outils raccordés restent dans la FAQ et sur /integrations. */
export const MODULES = [
  "Ventes",
  "Achats",
  "Stock",
  "Banque",
  "Comptabilité",
  "Documents",
  "Relances",
  "Demandes clients",
  "Factures fournisseurs",
  "Clients inactifs",
  "Modules métier",
  "Sur mesure",
];

/* 05/11 (Teo) — « essayez l'espace client en direct » remplacé par une
   vidéo de motion design (source : PEGASE/stories/reels/video-accueil),
   ralentie de 9 à 15 s le même jour (« on n'a pas trop le temps de lire »). */
export const DEMO = {
  surtitre: "Voir la démo",
  titre: "Omega, en quinze secondes",
  texte:
    "La nuit, les agents préparent le travail. Le matin, il vous reste une chose à faire : valider.",
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
  titre: ["Un seul logiciel pour tout gérer.", "Des agents IA pour le travail répétitif."],
};

export const AGENTS: Agent[] = [
  {
    id: "gestion",
    onglet: "Gestion",
    resume: "Ventes, achats, stock, banque, comptabilité, documents.",
    couleur: "blue",
    titre: "Toute votre gestion au même endroit",
    texte:
      "Ventes, achats, stock, banque, comptabilité et documents sont reliés : une information saisie une fois est à jour partout. Vous décrivez votre activité, l'IA fait les réglages : TVA, plan comptable, modèles de documents. Votre expert-comptable vérifie avant le démarrage.",
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
    titre: "Quatre agents font le travail répétitif",
    texte:
      "Ils relancent les impayés, répondent aux demandes, traitent les factures fournisseurs et recontactent les clients inactifs. Tout est prêt dans le logiciel. Il vous reste à valider.",
    lien: "/offres",
    bouton: "Voir les quatre agents",
    image: "/accueil/agents-clair.webp",
    alt: "La vue d'ensemble des agents dans l'espace client",
  },
  {
    id: "metiers",
    onglet: "Modules métier",
    resume: "BTP, avocats, architectes, hôtels : sept métiers ont leur module.",
    couleur: "purple",
    titre: "Un module fait pour votre métier",
    texte:
      "Un chantier a ses avenants, un dossier d'avocat ses pièces, un permis ses plans. Chaque module connaît les règles de son métier. Sept métiers ont le leur : BTP, avocats, architectes, loueurs automobiles, cabinets dentaires, hôtels et grands groupes.",
    lien: "/secteurs",
    bouton: "Trouver votre métier",
    image: "/accueil/metiers-clair.webp",
    alt: "Daliro, le module BTP : les avenants à chiffrer, valider et signer",
  },
  {
    id: "sur-mesure",
    onglet: "Sur mesure",
    resume: "Votre besoin n'est pas dans la liste ? Nous le construisons.",
    couleur: "orange",
    titre: "Il vous manque un module ? Nous le construisons.",
    texte:
      "Validation des achats, planning des équipes, tableaux à regrouper : nous regardons avec vous comment vous travaillez. Puis nous construisons le module et l'ajoutons à votre logiciel. Ce qu'il fait et son prix sont écrits avant de commencer.",
    lien: "/offres/sur-mesure",
    bouton: "Découvrir le sur-mesure",
    image: "/accueil/sur-mesure-clair.webp",
    alt: "Les automatisations d'une entreprise dans l'espace client",
  },
  {
    id: "pilotage",
    onglet: "Validation",
    resume: "Vous décidez de ce qui part.",
    couleur: "blue",
    titre: "L'IA prépare, vous décidez",
    texte:
      "Un seul écran vous montre ce qui est prêt, ce qui attend votre accord et ce qui a été fait. Vous validez ou vous corrigez en un clic. Un agent n'envoie seul que ce que vous avez autorisé d'avance, et chaque action est enregistrée.",
    lien: "/espace2",
    bouton: "Voir l'espace client",
    image: "/accueil/pilotage-clair.webp",
    alt: "Les validations du matin dans l'espace client",
  },
];

export const ETAPES_INTRO = {
  surtitre: "Comment ça marche",
  titre: "Trois étapes pour démarrer",
  texte:
    "Vous décrivez votre activité. Omega s'y adapte. Vous validez ce que les agents préparent.",
};

export const ETAPES = [
  {
    n: "01",
    couleur: "green" as const,
    titre: "Un audit de 30 minutes",
    texte:
      "Vous décrivez votre activité. Nous regardons ce qui vous prend du temps chaque mois. Vous repartez avec une proposition écrite : ce qui est compris, et à quel prix. C'est offert.",
    image: "/accueil/etape-1-clair.webp",
  },
  {
    n: "02",
    couleur: "purple" as const,
    titre: "L'IA installe votre logiciel",
    texte:
      "Elle vous pose quelques questions, puis fait les réglages : modules, TVA, plan comptable. Nous reprenons les données de votre logiciel actuel. Votre expert-comptable vérifie les réglages comptables.",
    image: "/accueil/etape-2-clair.webp",
  },
  {
    n: "03",
    couleur: "orange" as const,
    titre: "Il vous reste à valider",
    texte:
      "Chaque matin, ce qui est prêt vous attend. Un clic pour valider, un pour corriger. Vous décidez de ce qui part.",
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
      "Ce que nous automatisons, ce ne sont pas les gens. C'est tout ce qui les empêche de faire leur vrai travail.",
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
  titre: "Chaque métier a ses règles. Son module les connaît.",
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
      "Une demande arrive à 21 h. Sa réponse est rédigée aussitôt. Elle part seule si vous l'avez autorisé, sinon elle attend votre accord.",
    nom: "REPUT",
    role: "Agent · demandes clients",
    logo: "/logos/reput-mark.png",
  },
  {
    texte:
      "Factures, bons de livraison, attestations : chaque pièce reçue est lue, contrôlée et rangée. Vous validez, elle est comptabilisée.",
    nom: "FILED",
    role: "Agent · documents reçus",
    logo: "/logos/filed-mark.png",
  },
  {
    texte:
      "Chaque chantier est suivi du premier appel au décompte final. Le devis se dicte, l'avenant est signé avant les travaux, la situation de travaux est préparée.",
    nom: "Daliro",
    role: "Module métier · BTP",
    logo: "/logos/daliro-mark.png",
  },
  {
    texte:
      "Tout le groupe sur un seul plan : une fiche par société, client, fournisseur et contrat, remplie depuis vos logiciels sans rien y modifier. Des agents le lisent et proposent une action ; la direction décide.",
    nom: "Varelo",
    role: "Module métier · grands groupes",
    logo: "/logos/varelo-mark.png",
  },
  {
    texte:
      "Votre besoin n'est dans aucune liste : validation des achats, planning des équipes, tableaux à regrouper. Nous le construisons avec vous, dans votre logiciel de gestion ou sur vos outils actuels.",
    nom: "Sur mesure",
    role: "Ce qui n'existe que chez vous",
    logo: "/logos/surmesure-mark.svg",
  },
];

export const PRIX_INTRO = {
  surtitre: "Tarifs",
  titre: "Un tarif écrit avant tout engagement",
  texte:
    "Le prix dépend des modules que vous choisissez et du nombre de pièces que les agents traitent pour vous. Nous le calculons avec vous pendant l'audit.",
};

/* 22/11 — la carte du milieu, la carte forte, devient le logiciel de
   gestion ; les agents gardent leur formule à l'usage, en troisième. Aucun
   montant, comme avant : tout tarif est arrêté à l'audit. */
export const PRIX = [
  {
    nom: "Audit",
    texte: "Pour savoir ce qu'Omega peut faire chez vous, et à quel prix.",
    prix: "Offert",
    sous: "30 minutes, sans engagement",
    points: [
      "Votre activité, passée en revue avec vous",
      "Les modules et les agents utiles chez vous",
      "Une proposition écrite, prix compris",
      "Le calendrier de démarrage",
    ],
    bouton: "Réserver l'audit",
    href: AUDIT,
    fort: false,
  },
  {
    nom: "Logiciel de gestion",
    texte: "Toute votre gestion au même endroit, adaptée à votre activité par l'IA.",
    prix: "Sur devis",
    sous: "selon les modules choisis",
    points: [
      "Ventes, achats, stock, banque, comptabilité",
      "Sept modules métier, et du sur-mesure",
      "Vos données reprises de votre logiciel actuel",
      "Réglages vérifiés par votre expert-comptable",
      "Un interlocuteur dans notre équipe",
    ],
    bouton: "Parler à l'équipe",
    href: "/contact",
    fort: true,
  },
  {
    nom: "Agents",
    texte: "Un à quatre agents travaillent pour vous. Vous suivez tout au même endroit.",
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
    r: "Omega est un éditeur de logiciels français. Nous faisons un logiciel de gestion, un ERP : ventes, achats, stock, banque, comptabilité et documents au même endroit. L'IA l'adapte à votre activité. Des agents y font le travail répétitif : relances, demandes clients, factures fournisseurs, clients inactifs. Sept métiers ont leur module, et nous construisons sur mesure ce qui vous manque.",
  },
  {
    id: "erp",
    cat: "Général",
    q: "En quoi est-ce différent d'un ERP classique ?",
    r: "Avec Omega, l'installation part d'une conversation. Vous décrivez votre activité, l'IA pose les questions qui manquent, puis fait les réglages : modules, TVA, plan comptable, modèles de documents. Votre expert-comptable vérifie avant le démarrage. Ensuite, les agents font le travail répétitif : il vous reste à valider.",
  },
  {
    id: "sur-mesure",
    cat: "Général",
    q: "Pouvez-vous construire un module rien que pour nous ?",
    r: "Oui, c'est l'offre sur mesure. Pendant l'audit, nous regardons avec vous comment vous travaillez : qui fait quoi, sur quels logiciels, et qui valide. Vous repartez avec une proposition écrite, prix compris, avant tout engagement.",
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
    r: "Pas pour les agents : l'unité facturée est la pièce traitée : une facture lue, une demande reçue, une relance envoyée. Le tarif du logiciel de gestion dépend des modules activés et vous est remis écrit à l'audit. Nous ne prenons jamais de pourcentage sur vos encaissements.",
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
    r: "Dans un espace dédié à votre entreprise, chiffré, hébergé dans l'Union européenne et jamais mélangé à celui d'un autre client. L'IA ne reçoit que le strict nécessaire à chaque tâche, et rien n'est réutilisé à d'autres fins.",
  },
  {
    id: "accord",
    cat: "Sécurité",
    q: "Un agent peut-il envoyer quelque chose sans mon accord ?",
    r: "Pas sans que vous l'ayez décidé. Au départ, tout ce qui sort passe par votre validation : une relance, une réponse, un courriel. Ensuite, vous pouvez autoriser un agent à envoyer seul certains messages, et revenir en arrière à tout moment.",
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
    r: "Nous en parlons pendant l'audit. Raccorder un logiciel métier ou reprendre les données d'un logiciel absent de la liste fait partie de l'offre sur mesure. Ce qui est compris et le prix sont écrits avant de commencer.",
  },
  {
    id: "installation",
    cat: "Accompagnement",
    q: "Qui s'occupe de l'installation ?",
    r: "Notre équipe, du début à la fin. L'IA adapte le logiciel à partir de ce que vous lui décrivez, nous reprenons vos données, et votre expert-comptable vérifie les réglages comptables avant le démarrage. Pour les agents, rien n'est débité avant la fin de leur installation.",
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
  phrase: "Le logiciel de gestion où l'IA travaille pour vous : ventes, achats, stock, banque et comptabilité au même endroit. Vous décidez de ce qui part.",
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
