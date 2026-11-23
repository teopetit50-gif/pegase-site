/* ══════════════════════════════════════════════════════════════════════
   LES TEXTES DE /gestion (22/11/2026, repris le 23/11 pour Crystal AI)

   Le dessin est celui de crystal-ai-v1.21st.app (gabarit Crystal AI de
   21st.dev), recopié au pixel ; le relevé et les écarts sont en tête de
   app/gestion/gestion.css. Le contenu est celui d'Omega : le logiciel de
   gestion (l'ERP), ses six modules reliés, les réglages faits par l'IA,
   le démarrage, les agents, les modules métier et le sur-mesure.

   D'OÙ VIENNENT LES FAITS. Tous sont repris de components/accueil-v3/
   textes.ts (HERO, AGENTS, ETAPES, PRIX, FAQ) et des métadonnées de
   /tarifs ; aucun n'est ajouté :
     · une information saisie une fois est à jour partout ;
     · vous décrivez votre activité, l'IA pose les questions qui manquent
       puis fait les réglages (modules, TVA, plan comptable, modèles de
       documents) ; votre expert-comptable vérifie avant le démarrage ;
       nous reprenons les données de votre logiciel actuel ;
     · quatre agents (relances, demandes clients, factures fournisseurs,
       clients inactifs), et rien ne part sans votre validation ;
     · sept métiers ont leur module, et nous construisons ce qui manque ;
     · le prix est sur devis, arrêté pendant un audit offert de 30 minutes.
   AUCUN montant. « 0 € avant l'installation » et « remboursé 30 jours » ne
   valent que pour les agents : ils ne sont pas écrits ici.

   CE QUI REMPLACE CE QUE LA RÉFÉRENCE INVENTE (règles maison) :
     · « Ranked #1 » et ses huit logos de clients → une conviction d'Omega
       et les sept métiers, en mots, plus « Votre métier » ;
     · ses cinq formules à prix affiché → ce que vous recevez, en cinq
       colonnes et quatre faits vérifiables (30 minutes d'audit offert,
       6 modules, 4 agents, 7 modules métier), sans aucun montant ;
     · ses captures d'écran et ses dessins → des écrans dessinés en code
       (components/gestion/visuels.tsx), sur des données d'exemple ;
     · « We're hiring! » → les quatre agents.

   LE BUDGET DE TEXTE. Chaque emplacement porte, en commentaire, le nombre
   de signes de la référence (« réf. ») : le français s'y tient, à quelques
   signes près.

   L'écriture suit l'accueil (Teo, 22/11 : « regarde Odoo, les textes
   doivent être clairs ») : des titres de six à neuf mots, des mots de tous
   les jours, une idée par phrase, « vous » pour le lecteur, « nous » pour
   Omega. Devant « ? » et « : », l'espace est insécable ( ) : sans
   elle, le signe part seul à la ligne.
   ══════════════════════════════════════════════════════════════════════ */

export const AUDIT = "/reserver-un-audit";
export const TARIFS = "/tarifs";
export const AGENTS = "/offres";

export type Bouton = { libelle: string; href: string; plein?: boolean };

export const META = {
  titre: "Logiciel de gestion : six modules reliés | Omega.AI",
  description:
    "Le logiciel de gestion d'Omega : ventes, achats, stock, banque, comptabilité et documents reliés. Une information saisie une fois est à jour partout. L'IA fait les réglages, des agents font le travail répétitif, vous validez.",
};

/* ── le héros ── réf. h1 en deux lignes de 23 et 12 signes ; chapô 157
   signes (4 lignes de 430 px à 1440) ; boutons de 19 et 13 signes. */
export const HERO = {
  titre: ["Toute votre gestion", "au même endroit"],
  chapo:
    "Ventes, achats, stock, banque, comptabilité, documents. Une information saisie une fois est à jour partout.",
  principal: { libelle: "Réserver un audit offert", href: AUDIT, plein: true } as Bouton,
  second: { libelle: "Voir les tarifs", href: TARIFS } as Bouton,
};

/* ── les onglets par module ── réf. titre 30 signes dont 9 accentués ;
   onglet 7 à 18 signes ; dans le panneau, titre 7 à 18 signes et texte
   136 signes (3 lignes de 360 px à 1440). Les onglets par secteur de la
   référence deviennent les modules ; l'identifiant désigne l'écran. */
export type OngletTexte = { id: string; titre: string; texte: string };
export const MODULES = {
  titre: ["Six modules reliés,", "une seule saisie."],
  onglets: [
    {
      id: "ventes",
      titre: "Ventes",
      texte: "Vos devis, vos commandes et vos factures. Une vente validée met à jour le stock et la comptabilité.",
    },
    {
      id: "achats",
      titre: "Achats",
      texte: "Vos commandes fournisseurs et leurs factures. Une réception met le stock à jour.",
    },
    {
      id: "stock",
      titre: "Stock",
      texte: "Chaque article, ses quantités et ses mouvements. Ventes et achats s'y inscrivent sans ressaisie.",
    },
    {
      id: "banque",
      titre: "Banque et comptabilité",
      texte: "Vos relevés, vos écritures, votre TVA. Les pièces des autres modules y arrivent déjà saisies.",
    },
  ] as OngletTexte[],
};

/* ── le bandeau des métiers ── réf. « Trusted by innovative teams
   worldwide », 37 signes ; à gauche « Ranked #1 » (9 signes) et 79 signes
   de texte ; huit logos de clients. Ici : aucun client, aucun classement.
   À gauche une conviction d'Omega (CITATIONS de l'accueil, même esprit),
   à droite les sept métiers et le sur-mesure, en mots ; la clé désigne
   l'icône et la page du métier (components/gestion/Metiers.tsx). */
export const METIERS = {
  titre: ["Sept métiers ont déjà", "leur module"],
  pari: {
    titre: "Notre pari",
    texte: "Un logiciel de gestion doit s'adapter à votre activité. Pas l'inverse.",
  },
  cases: [
    { cle: "btp", nom: "BTP" },
    { cle: "avocats", nom: "Avocats" },
    { cle: "architectes", nom: "Architectes" },
    { cle: "location-automobile", nom: "Loueurs automobiles" },
    { cle: "dentaire", nom: "Cabinets dentaires" },
    { cle: "hotellerie", nom: "Hôtels" },
    { cle: "groupes", nom: "Grands groupes" },
    { cle: "sur-mesure", nom: "Votre métier" },
  ],
};

/* ── les réglages par l'IA ── réf. titre 36 signes dont 13 accentués ;
   texte 211 signes (96 en gras puis 114) ; bouton 14 signes ; deux cartes :
   nom 5 signes, catégorie 14 signes, texte 75 signes (1 ligne à 1440). */
export const REGLAGES = {
  titre: ["Décrivez votre activité,", "l'IA fait les réglages."],
  fort: "Avec Omega, l'installation part d'une conversation.",
  suite:
    "L'IA pose les questions qui manquent, puis fait les réglages : modules, TVA, plan comptable, modèles de documents.",
  bouton: { libelle: "Réserver un audit offert", href: AUDIT, plein: true } as Bouton,
  cartes: [
    {
      id: "conversation",
      nom: "Conversation.",
      categorie: "Vous décrivez",
      texte: "Vous parlez de votre activité avec vos mots. L'IA complète par ses questions.",
      href: AUDIT,
    },
    {
      id: "comptes",
      nom: "Réglages.",
      categorie: "L'IA les fait",
      texte: "Elle active vos modules, règle la TVA et prépare votre plan comptable.",
      href: AUDIT,
    },
  ],
};

/* ── le démarrage ── réf. surtitre 14 signes entre crochets ; titre 51
   signes sur deux lignes (27 + 23) ; texte 171 signes (4 lignes de 352 px) ;
   bouton 13 signes ; quatre cartes : titre 12 à 14 signes, texte 68 à 76
   signes (2 lignes à 1440). La clé désigne l'icône (Demarrage.tsx). */
export const DEMARRAGE = {
  surtitre: "Pas à pas",
  titre: ["Nous préparons le démarrage", "avec vous"],
  texte:
    "Tout commence par un audit offert de 30 minutes. Nous reprenons ensuite vos données, et votre expert-comptable vérifie les réglages avant le démarrage.",
  bouton: { libelle: "Voir les tarifs", href: TARIFS } as Bouton,
  cartes: [
    {
      cle: "audit",
      titre: "L'audit offert",
      texte: "30 minutes pour décrire votre activité. Votre prix, sur devis, y est arrêté.",
    },
    {
      cle: "documents",
      titre: "Vos documents",
      texte: "Devis, factures, bons de livraison : vos modèles sont prêts, à votre en-tête.",
    },
    {
      cle: "donnees",
      titre: "Vos données",
      texte: "Nous reprenons les données de votre logiciel actuel.",
    },
    {
      cle: "comptable",
      titre: "Votre expert-comptable",
      texte: "Il vérifie les réglages comptables avant le démarrage.",
    },
  ],
};

/* ── les agents, les métiers, le sur-mesure ── réf. titre en deux lignes
   de 13 et 17 signes ; texte 177 signes (3 lignes de 482 px) ; accordéon
   de trois volets : intitulé 5 à 10 signes, texte 125 signes (2 lignes).
   L'identifiant désigne l'écran, la clé l'icône (Mesure.tsx). */
export const MESURE = {
  titre: ["Des agents, votre métier", "et du sur-mesure."],
  texte:
    "Quatre agents font le travail répétitif dans votre logiciel. Sept métiers ont leur module. Ce qui vous manque, nous le construisons sur mesure.",
  volets: [
    {
      id: "quatre-agents",
      titre: "Quatre agents",
      texte:
        "Relances, demandes clients, factures fournisseurs, clients inactifs. Vous décidez de ce qui part.",
    },
    {
      id: "metiers",
      titre: "Sept modules métier",
      texte:
        "BTP, avocats, architectes, loueurs automobiles, cabinets dentaires, hôtels, grands groupes : chacun a son module.",
    },
    {
      id: "sur-mesure",
      titre: "Sur mesure",
      texte: "Il vous manque un module ? Nous le construisons et l'ajoutons à votre logiciel.",
    },
  ] as OngletTexte[],
};

/* ── ce que vous recevez ── la grille des cinq formules de la référence
   (Free $0, Creator $15, Pro $59, Scale $349, Enterprise « Custom »).
   Aucun montant ici : la grande valeur est un fait, le prix est sur devis.
   Réf. nom 3 à 10 signes ; valeur 2 à 6 signes, suivie de « /mo » ; bouton
   10 à 14 signes (162 px utiles à 1440 : 22 signes au plus) ; deux lignes
   de 19 à 34 signes ; intertitre 24 signes ; quatre ou cinq points de 22
   à 39 signes. */
export type Colonne = {
  nom: string;
  valeur: string;
  suffixe?: string;
  bouton: Bouton;
  lignes: [string, string];
  intertitre?: string;
  points: string[];
};
export const OFFRE: Colonne[] = [
  {
    nom: "Audit",
    valeur: "30 min",
    suffixe: "offert",
    bouton: { libelle: "Réserver l'audit", href: AUDIT, plein: true },
    lignes: ["Avant tout engagement", "Votre prix y est arrêté"],
    points: [
      "Votre activité, passée en revue avec vous",
      "Les modules et les agents utiles chez vous",
      "Une proposition écrite, prix compris",
      "Le calendrier de démarrage",
    ],
  },
  {
    nom: "Gestion",
    valeur: "6",
    suffixe: "modules",
    bouton: { libelle: "Voir les tarifs", href: TARIFS },
    lignes: ["Une saisie, à jour partout", "Prix sur devis"],
    intertitre: "Vos six modules",
    points: ["Ventes", "Achats", "Stock", "Banque", "Comptabilité", "Documents"],
  },
  {
    nom: "Agents",
    valeur: "4",
    suffixe: "agents IA",
    bouton: { libelle: "Voir les quatre agents", href: AGENTS },
    lignes: ["Ils font le travail répétitif", "Vous validez"],
    intertitre: "Vos quatre agents",
    points: ["Relances", "Demandes clients", "Factures fournisseurs", "Clients inactifs"],
  },
  {
    nom: "Métiers",
    valeur: "7",
    suffixe: "modules métier",
    bouton: { libelle: "Réserver l'audit", href: AUDIT, plein: true },
    lignes: ["Un module par métier", "Prix sur devis"],
    intertitre: "Les sept métiers",
    points: [
      "BTP",
      "Avocats",
      "Architectes",
      "Loueurs automobiles",
      "Cabinets dentaires",
      "Hôtels",
      "Grands groupes",
    ],
  },
  {
    nom: "Sur mesure",
    valeur: "Sur devis",
    bouton: { libelle: "Réserver l'audit", href: AUDIT, plein: true },
    lignes: ["Il vous manque un module ?", "Nous le construisons"],
    intertitre: "Comment ça se passe",
    points: [
      "Votre besoin, étudié avec vous",
      "Un module construit pour vous",
      "Ajouté à votre logiciel",
      "Son rôle et son prix, écrits d'avance",
    ],
  },
];

/* ── les questions ── réf. « FAQs » (4 signes : la colonne du titre n'a que
   158 px utiles à 768 px, soit 9 signes) ; seize questions de 27 à 81
   signes. Ici six questions déjà publiées sur l'accueil (FAQ de
   components/accueil-v3/textes.ts : omega, erp, outils, installation,
   donnees, prix), recentrées sur le logiciel de gestion. Les outils cités
   sont tous dans lib/integrations.ts. */
export const QUESTIONS = {
  titre: "Questions",
  liste: [
    {
      id: "omega",
      q: "Qu'est-ce qu'Omega ?",
      r: "Omega est un éditeur de logiciels français. Nous faisons un logiciel de gestion, un ERP : ventes, achats, stock, banque, comptabilité et documents au même endroit. L'IA l'adapte à votre activité. Des agents y font le travail répétitif : relances, demandes clients, factures fournisseurs, clients inactifs. Sept métiers ont leur module, et nous construisons sur mesure ce qui vous manque.",
    },
    {
      id: "erp",
      q: "En quoi est-ce différent d'un ERP classique ?",
      r: "Avec Omega, l'installation part d'une conversation. Vous décrivez votre activité, l'IA pose les questions qui manquent, puis fait les réglages : modules, TVA, plan comptable, modèles de documents. Votre expert-comptable vérifie avant le démarrage. Ensuite, les agents font le travail répétitif : il vous reste à valider.",
    },
    {
      id: "outils",
      q: "Faut-il changer nos outils ?",
      r: "Vous choisissez. Omega peut devenir votre logiciel de gestion, avec la reprise des données de votre logiciel actuel, ou commencer par des agents branchés sur ce que vous utilisez déjà : Gmail, WhatsApp, Google Sheets, Google Drive, Sage, QuickBooks, HubSpot et bien d'autres.",
    },
    {
      id: "installation",
      q: "Qui s'occupe de l'installation ?",
      r: "Notre équipe, du début à la fin. L'IA adapte le logiciel à partir de ce que vous lui décrivez, nous reprenons vos données, et votre expert-comptable vérifie les réglages comptables avant le démarrage.",
    },
    {
      id: "donnees",
      q: "Où sont mes données ?",
      r: "Dans un espace dédié à votre entreprise, chiffré, hébergé dans l'Union européenne et jamais mélangé à celui d'un autre client. L'IA ne reçoit que le strict nécessaire à chaque tâche, et rien n'est réutilisé à d'autres fins.",
    },
    {
      id: "prix",
      q: "Pourquoi aucun prix n'est-il affiché ?",
      r: "Le prix du logiciel de gestion dépend des modules que vous activez. Nous le calculons avec vous pendant l'audit offert de 30 minutes : vous repartez avec un tarif écrit, avant tout engagement.",
    },
  ],
};

/* ── l'appel final ── réf. titre 33 signes ; deux cartes : 15 à 18 signes
   en gras puis 88 à 92 signes, un bouton ; bandeau du bas : 13 signes,
   une icône, 42 signes, un bouton de 14 signes. */
export const APPEL = {
  titre: "Par où commencer ?",
  cartes: [
    {
      fort: "Par un audit offert de 30 minutes.",
      texte: "Votre prix, sur devis, y est arrêté avec vous.",
      bouton: { libelle: "Réserver un audit offert", href: AUDIT, plein: true } as Bouton,
    },
    {
      fort: "Ou par les tarifs.",
      texte: "Le logiciel de gestion est sur devis : son prix dépend des modules que vous activez.",
      bouton: { libelle: "Voir les tarifs", href: TARIFS } as Bouton,
    },
  ],
  bandeau: {
    titre: "Quatre agents IA",
    texte: "Ils font le travail répétitif. Vous validez.",
    bouton: { libelle: "Voir les quatre agents", href: AGENTS } as Bouton,
  },
};

/* ── ce que montre chaque écran dessiné ── lu par les lecteurs d'écran à
   la place du dessin (role="img"). Les noms et les montants des écrans
   sont des exemples : un négoce de matériel électrique. */
export const ECRANS = {
  tableau:
    "Exemple d'écran : le tableau de bord du logiciel, avec les ventes du mois, ce qui reste à encaisser et à payer, le solde en banque, les tâches du jour et les dernières pièces.",
  devis: "Exemple d'écran : un devis en cours de rédaction, avec ses lignes, son total et l'état du stock.",
  commande: "Exemple d'écran : un bon de commande envoyé à un fournisseur, avec sa livraison attendue.",
  article: "Exemple d'écran : la fiche d'un article, son stock par dépôt et ses derniers mouvements.",
  rapprochement:
    "Exemple d'écran : le relevé bancaire du mois et les factures proposées pour chaque ligne.",
  conversation: "Exemple d'écran : la conversation où l'IA pose ses questions avant de faire les réglages.",
  comptes: "Exemple d'écran : le plan comptable et la TVA préparés par l'IA, à vérifier par l'expert-comptable.",
  modele: "Exemple d'écran : un modèle de facture à l'en-tête de l'entreprise.",
  reprise:
    "Exemple d'écran : la reprise des clients, des fournisseurs, des articles et des factures du logiciel actuel.",
  nuit: "Exemple d'écran : le travail des quatre agents pendant la nuit, prêt à valider le matin.",
  modules: "Exemple d'écran : les six modules de gestion actifs et les sept modules métier à ajouter.",
  planning: "Exemple d'écran : un module construit sur mesure, le planning des équipes de la semaine.",
};
