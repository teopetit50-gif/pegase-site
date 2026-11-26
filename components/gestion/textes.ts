/* ══════════════════════════════════════════════════════════════════════
   LES TEXTES DE /gestion (22/11/2026, repris le 23/11 pour Crystal AI,
   réécrits le 23/11 au soir dans le registre de la charte)

   Le dessin est celui de crystal-ai-v1.21st.app (gabarit Crystal AI de
   21st.dev), recopié au pixel ; le relevé et les écarts sont en tête de
   app/gestion/gestion.css. Le contenu est celui d'Omega : le logiciel de
   gestion (l'ERP), ses six modules reliés, les réglages faits par l'IA,
   le démarrage, les agents, les modules métier et le sur-mesure.

   D'OÙ VIENNENT LES FAITS. Tous sont repris de components/accueil-v3/
   textes.ts (HERO, AGENTS, ETAPES, PRIX, FAQ), des métadonnées de /tarifs
   et de ce que montrent les écrans de cette page (ECRANS, en bas, et
   components/gestion/visuels.tsx) ; aucun n'est ajouté :
     · une information saisie une fois est à jour partout ;
     · vous décrivez votre activité, l'IA pose les questions qui manquent
       puis fait les réglages (modules, TVA, plan comptable, modèles de
       documents) ; votre expert-comptable vérifie avant le démarrage ;
       nous reprenons les données de votre logiciel actuel ;
     · quatre agents (relances, demandes clients, factures fournisseurs,
       clients inactifs), et vous décidez de ce qui part ;
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
   de signes de la référence (« réf. ») : le français s'en approche, et le
   rendu est vérifié aux cinq largeurs quand un texte le dépasse.

   L'ÉCRITURE (Teo, 23/11 : « la page gestion n'est pas assez travaillée,
   les textes sont pas assez pro », puis, devant six exemples : « Oui,
   réécris tout »). La première version était taillée au nombre de signes
   du gabarit anglais : des listes sans verbe (« Vos devis, vos commandes
   et vos factures. »), des phrases de trois mots, des « Il » et « Elle »
   seuls en tête de phrase. La prose suit maintenant la charte
   (OMEGA/DOCTRINE-TEXTES-SAAS.md, §11, 12 et 16, l'étalon Qonto) :
     1. le logiciel est sujet d'un verbe conjugué (« le module Ventes
        suit », « Omega propose ») ; « vous » arrive dans la proposition
        suivante, sujet de son propre geste ;
     2. un bloc porte deux ou trois phrases : ce que c'est, ce que cela
        fait, ce qui vous reste ;
     3. le lien logique s'écrit : comme, quand, puis, dès que, si ;
     4. les termes sont ceux du métier (bon de commande, réception, dépôt,
        seuil, relevé, plan comptable, TVA), mais seulement ceux que la
        page montre déjà dans ses écrans : aucune fonction n'est ajoutée ;
     5. une seule question sur la page, celle de l'appel final.
   Les libellés (onglets, noms de cartes, colonnes, points de liste,
   boutons) restent nominaux : ce sont des étiquettes, pas de la prose.
   « Vous » pour le lecteur, « nous » pour Omega. Devant « ? » et « : »,
   l'espace est insécable ( ) : sans elle, le signe part seul à la ligne.
   ══════════════════════════════════════════════════════════════════════ */

export const AUDIT = "/reserver-un-audit";
export const TARIFS = "/tarifs";
export const AGENTS = "/offres";

export type Bouton = { libelle: string; href: string; plein?: boolean };

export const META = {
  titre: "L'ERP : six modules, les mêmes données | Omega.AI",
  description:
    "Omega réunit ventes, achats, stock, banque, comptabilité et documents dans un seul ERP. L'IA le paramètre pour votre activité, les agents font le travail répétitif, vous validez.",
};

/* ── le héros ── réf. h1 en deux lignes de 23 et 12 signes ; chapô 157
   signes (4 lignes de 430 px à 1440) ; boutons de 19 et 13 signes. */
export const HERO = {
  titre: ["Un seul système", "pour toute la gestion."],
  chapo:
    "Ventes, achats, stock, banque, comptabilité et documents, dans un seul ERP. Les modules partagent les mêmes données : une pièce saisie une fois est à jour partout.",
  principal: { libelle: "Réserver un audit offert", href: AUDIT, plein: true } as Bouton,
  second: { libelle: "Voir les tarifs", href: TARIFS } as Bouton,
};

/* ── les onglets par module ── réf. titre 30 signes dont 9 accentués ;
   onglet 7 à 18 signes ; dans le panneau, titre 7 à 18 signes et texte
   136 signes (3 lignes de 360 px à 1440). Les onglets par secteur de la
   référence deviennent les modules ; l'identifiant désigne l'écran.
   Ces quatre textes et ce titre sont aussi lus par le bloc des onglets
   de l'accueil (components/essai/OngletsGestion). */
export type OngletTexte = { id: string; titre: string; texte: string };
export const MODULES = {
  titre: ["Six modules.", "Les mêmes données."],
  onglets: [
    {
      id: "ventes",
      titre: "Ventes",
      texte:
        "Ventes suit chaque affaire, du devis à l'encaissement. Une vente validée met à jour le stock et la comptabilité.",
    },
    {
      id: "achats",
      titre: "Achats",
      texte:
        "Achats suit vos commandes fournisseurs, de l'envoi à la facture. Une livraison réceptionnée met à jour le stock.",
    },
    {
      id: "stock",
      titre: "Stock",
      texte:
        "Stock tient chaque article par dépôt, avec son seuil d'alerte. Ventes et achats y inscrivent leurs mouvements. Sans ressaisie.",
    },
    {
      id: "banque",
      titre: "Banque et comptabilité",
      texte:
        "Omega propose une pièce pour chaque ligne de relevé et suit votre TVA. Ventes et achats y passent leurs écritures.",
    },
  ] as OngletTexte[],
};

/* ── le bandeau des métiers ── réf. « Trusted by innovative teams
   worldwide », 37 signes ; à gauche « Ranked #1 » (9 signes) et 79 signes
   de texte ; huit logos de clients. Ici : aucun client, aucun classement.
   À gauche une conviction d'Omega (CITATIONS de l'accueil, même esprit),
   à droite les sept métiers et le sur-mesure, en mots ; la clé désigne
   l'icône et la page du métier (components/gestion/Metiers.tsx). */
/* 25/11 (Teo : « arrête de parler ou montrer comme exemple les trucs BTP
   etc, les SaaS métier ; focus sur l'ERP, les agents qu'on vend ») — le
   bandeau ne nomme plus les sept métiers : il nomme les six modules, les
   agents et le sur-mesure, ce que vous recevez. Aucune case n'est un lien. */
export const METIERS = {
  titre: ["Six modules et des agents.", "Un seul ERP."],
  pari: {
    titre: "Notre pari",
    texte: "Un ERP doit s'adapter à votre façon de travailler. Pas l'inverse.",
  },
  cases: [
    { cle: "ventes", nom: "Ventes" },
    { cle: "achats", nom: "Achats" },
    { cle: "stock", nom: "Stock" },
    { cle: "banque", nom: "Banque" },
    { cle: "comptabilite", nom: "Comptabilité" },
    { cle: "documents", nom: "Documents" },
    { cle: "agents", nom: "Agents IA" },
    { cle: "sur-mesure", nom: "Sur mesure" },
  ],
};

/* ── les réglages par l'IA ── réf. titre 36 signes dont 13 accentués ;
   texte 211 signes (96 en gras puis 114) ; bouton 14 signes ; deux cartes :
   nom 5 signes, catégorie 14 signes, texte 75 signes (1 ligne à 1440). */
export const REGLAGES = {
  titre: ["Décrivez votre activité.", "L'IA fait les réglages."],
  fort: "Un ERP paramétré à partir d'une conversation.",
  suite:
    "L'IA pose les questions qui manquent, puis paramètre vos modules, votre TVA, votre plan comptable et vos modèles de documents.",
  bouton: { libelle: "Réserver un audit offert", href: AUDIT, plein: true } as Bouton,
  cartes: [
    {
      id: "conversation",
      nom: "Conversation.",
      categorie: "Vous décrivez",
      texte: "Vous décrivez votre activité, puis l'IA pose les questions qui manquent.",
      href: AUDIT,
    },
    {
      id: "comptes",
      nom: "Réglages.",
      categorie: "L'IA paramètre",
      texte: "L'IA active vos modules, paramètre la TVA et prépare votre plan comptable.",
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
  titre: ["Votre mise en service,", "préparée avec vous."],
  texte:
    "Tout commence par un audit offert de 30 minutes. Nous reprenons vos données, puis votre expert-comptable vérifie le paramétrage avant le démarrage.",
  bouton: { libelle: "Voir les tarifs", href: TARIFS } as Bouton,
  cartes: [
    {
      cle: "audit",
      titre: "L'audit offert",
      texte: "30 minutes pour passer votre activité en revue et fixer votre prix.",
    },
    {
      cle: "documents",
      titre: "Vos documents",
      texte: "Vos devis, factures et bons de livraison, à votre en-tête.",
    },
    {
      cle: "donnees",
      titre: "Vos données",
      texte: "Vos clients, articles, factures en cours et soldes, repris.",
    },
    {
      cle: "comptable",
      titre: "Votre expert-comptable",
      texte: "Il vérifie le plan comptable et la TVA avant le démarrage.",
    },
  ],
};

/* ── les agents, les métiers, le sur-mesure ── réf. titre en deux lignes
   de 13 et 17 signes ; texte 177 signes (3 lignes de 482 px) ; accordéon
   de trois volets : intitulé 5 à 10 signes, texte 125 signes (2 lignes).
   L'identifiant désigne l'écran, la clé l'icône (Mesure.tsx). */
export const MESURE = {
  titre: ["L'ERP qui fait", "le travail."],
  texte:
    "Quatre agents font le travail répétitif dans votre ERP. Des automatisations s'ajoutent en une fois. Et si un module manque, nous le construisons.",
  volets: [
    {
      id: "quatre-agents",
      titre: "Quatre agents",
      texte:
        "Relances, demandes clients, factures fournisseurs, clients inactifs : les agents traitent, vous validez.",
    },
    {
      id: "metiers",
      titre: "Automatisations",
      texte:
        "Une alerte de stock, un seuil de trésorerie, un rapport du mois. Installée une fois, elle travaille seule.",
    },
    {
      id: "sur-mesure",
      titre: "Sur mesure",
      texte: "Un besoin qu'aucun module ne couvre ? Nous construisons le module et l'ajoutons à votre ERP.",
    },
  ] as OngletTexte[],
};

/* ── ce que vous recevez ── la grille des cinq formules de la référence
   (Free $0, Creator $15, Pro $59, Scale $349, Enterprise « Custom »).
   Aucun montant ici : la grande valeur est un fait, le prix est sur devis.
   Réf. nom 3 à 10 signes ; valeur 2 à 6 signes, suivie de « /mo » ; bouton
   10 à 14 signes (162 px utiles à 1440 : 22 signes au plus) ; deux lignes
   de 19 à 34 signes ; intertitre 24 signes ; quatre ou cinq points de 22
   à 39 signes. Tout y est étiquette : rien ne se conjugue. */
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
    valeur: "30 min",
    suffixe: "offert",
    bouton: { libelle: "Réserver l'audit", href: AUDIT, plein: true },
    lignes: ["Avant tout engagement", "Votre prix y est arrêté"],
    points: [
      "Votre activité, passée en revue avec vous",
      "Les modules et les agents dont vous avez besoin",
      "Une proposition écrite, prix compris",
      "Le calendrier de mise en service",
    ],
  },
  {
    nom: "Gestion",
    valeur: "6",
    suffixe: "modules",
    bouton: { libelle: "Voir les tarifs", href: TARIFS },
    lignes: ["Une saisie, à jour partout", "34,90\u00a0€ HT par utilisateur et par mois"],
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
    nom: "Automatisations",
    valeur: "Une",
    suffixe: "seule fois",
    bouton: { libelle: "Voir les prix", href: "/tarifs#automatisations" },
    lignes: ["Dès 49\u00a0€ HT d'installation", "L'IA payée à la tâche"],
    intertitre: "Trois cas",
    points: ["Sans IA", "Avec IA", "Sur mesure"],
  },
  {
    nom: "Sur mesure",
    valeur: "Sur devis",
    bouton: { libelle: "Réserver l'audit", href: AUDIT, plein: true },
    lignes: ["Un module vous manque", "Nous le construisons"],
    intertitre: "Comment nous procédons",
    points: [
      "Votre besoin, étudié avec vous",
      "Un module construit pour vous",
      "Ajouté à votre ERP",
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
      r: "Un ERP, édité en France. Ventes, achats, stock, banque, comptabilité et documents y partagent les mêmes données. L'IA le paramètre pour votre activité, puis des agents y font le travail répétitif : relances, demandes clients, factures fournisseurs, clients inactifs. Si un module vous manque, nous le construisons.",
    },
    {
      id: "erp",
      q: "En quoi est-ce différent d'un ERP classique ?",
      r: "Sur trois points. Il remplace votre logiciel de gestion et les outils autour par un seul système. Il est déployé par nos modèles d'IA : vous décrivez votre activité, l'IA paramètre les modules, la TVA et le plan comptable, et votre expert-comptable vérifie. Et des agents y font le travail répétitif, sous votre validation.",
    },
    {
      id: "outils",
      q: "Faut-il changer nos outils ?",
      r: "C'est vous qui choisissez. Omega peut devenir votre ERP : nous reprenons alors les données de votre logiciel actuel. Ou commencer par des agents branchés sur vos outils : Gmail, WhatsApp, Google Sheets, Google Drive, Sage, QuickBooks, HubSpot et d'autres.",
    },
    {
      id: "installation",
      q: "Qui s'occupe de l'installation ?",
      r: "Nous, du début à la fin. L'IA paramètre l'ERP à partir de ce que vous lui décrivez. Nous reprenons vos données, puis votre expert-comptable vérifie le paramétrage avant le démarrage.",
    },
    {
      id: "donnees",
      q: "Où sont mes données ?",
      r: "Dans un espace réservé à votre entreprise, chiffré et hébergé dans l'Union européenne. L'IA ne reçoit que le strict nécessaire à chaque tâche. Rien n'est réutilisé.",
    },
    {
      id: "prix",
      q: "Combien coûte l'ERP\u00a0?",
      r: "34,90\u00a0€ HT par utilisateur et par mois, dès le premier et sans minimum. Les six modules sont inclus. Aucun pourcentage sur vos encaissements. L'installation se paie une fois, au prix écrit au devis. Les agents ont leur propre prix, fixé à l'audit.",
    },
  ],
};

/* ── l'appel final ── réf. titre 33 signes ; deux cartes : 15 à 18 signes
   en gras puis 88 à 92 signes, un bouton ; bandeau du bas : 13 signes,
   une icône, 42 signes, un bouton de 14 signes. Le titre est la seule
   question de la page ; les deux amorces en gras y répondent. */
export const APPEL = {
  titre: "Par où commencer ?",
  cartes: [
    {
      fort: "Par un audit offert de 30 minutes.",
      texte: "Nous passons votre activité en revue et fixons votre prix avec vous.",
      bouton: { libelle: "Réserver un audit offert", href: AUDIT, plein: true } as Bouton,
    },
    {
      fort: "Ou par les tarifs.",
      texte: "L'ERP coûte 34,90\u00a0€ HT par utilisateur et par mois, dès le premier.",
      bouton: { libelle: "Voir les tarifs", href: TARIFS } as Bouton,
    },
  ],
  bandeau: {
    titre: "Quatre agents IA",
    texte: "Vous validez ce que préparent les agents.",
    bouton: { libelle: "Voir les quatre agents", href: AGENTS } as Bouton,
  },
};

/* ── ce que montre chaque écran dessiné ── lu par les lecteurs d'écran à
   la place du dessin (role="img"). Les noms et les montants des écrans
   sont des exemples : un négoce de matériel électrique. */
export const ECRANS = {
  tableau:
    "Exemple d'écran : le tableau de bord de l'ERP, avec les ventes du mois, ce qui reste à encaisser et à payer, le solde en banque, les tâches du jour et les dernières pièces.",
  devis: "Exemple d'écran : un devis en cours de rédaction, avec ses lignes, son total et l'état du stock.",
  commande: "Exemple d'écran : un bon de commande envoyé à un fournisseur, avec sa livraison attendue.",
  article: "Exemple d'écran : la fiche d'un article, son stock par dépôt et ses derniers mouvements.",
  rapprochement:
    "Exemple d'écran : le relevé bancaire du mois et les factures proposées pour chaque ligne.",
  conversation: "Exemple d'écran : la conversation où l'IA pose ses questions avant de faire les réglages.",
  comptes: "Exemple d'écran : le plan comptable et la TVA préparés par l'IA, à vérifier par l'expert-comptable.",
  modele: "Exemple d'écran : un modèle de facture à l'en-tête de l'entreprise.",
  reprise:
    "Exemple d'écran : la reprise des clients, des fournisseurs, des articles et des factures du logiciel actuel.",
  nuit: "Exemple d'écran : le travail des quatre agents pendant la nuit, prêt à valider le matin.",
  modules: "Exemple d'écran : les six modules actifs et les automatisations à ajouter.",
  planning: "Exemple d'écran : un module construit sur mesure, le planning des équipes de la semaine.",
};
