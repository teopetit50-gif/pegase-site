/* ══════════════════════════════════════════════════════════════════════
   /integrations — métadonnées des outils (30/07/2026)

   Page de référence : ocoya.com/integrations. Les 28 marques et leurs logos
   vivent déjà dans components/offres/MediaMoteurs (tableau OUTILS, tiré de
   simple-icons) ; ce fichier n'ajoute que ce que la fiche affiche en plus du
   logo — la famille et la phrase de raccordement.

   Rien d'inventé : chaque phrase décrit ce qu'un moteur fait réellement de
   l'outil (lire, écrire, déclencher). Un outil sans entrée ici tombe sur la
   famille « Autres » et n'affiche pas de phrase — il ne faut donc jamais
   inventer pour combler.
   ══════════════════════════════════════════════════════════════════════ */

export type Famille =
  | "Messagerie"
  | "Tableur & base"
  | "Fichiers"
  | "Paiement"
  | "E-commerce"
  | "Agenda"
  | "Comptabilité"
  | "Automatisation"
  | "Projet & CRM"
  | "Formulaires"
  | "Réseaux sociaux"
  | "Site web";

/* Ordre d'affichage des familles dans le filtre et la grille. */
export const FAMILLES_OUTILS: Famille[] = [
  "Messagerie",
  "Tableur & base",
  "Fichiers",
  "Paiement",
  "E-commerce",
  "Agenda",
  "Comptabilité",
  "Automatisation",
  "Projet & CRM",
  "Formulaires",
  "Réseaux sociaux",
  "Site web",
];

type Fiche = { famille: Famille; role: string };

/* Clé = le `title` exact de simple-icons (voir OUTILS dans MediaMoteurs). */
export const OUTIL_INFOS: Record<string, Fiche> = {
  Gmail: {
    famille: "Messagerie",
    role: "L'agent lit les fils entrants, rédige les relances et les dépose en brouillon dans la messagerie. L'envoi reste le geste de vos équipes.",
  },
  WhatsApp: {
    famille: "Messagerie",
    role: "Les demandes reçues hors horaires ont leur réponse rédigée. Elle part seule si vous l'avez autorisé, sinon après votre validation.",
  },
  Telegram: {
    famille: "Messagerie",
    role: "Canal de notification : le point du matin et les alertes sur les gros retards de paiement arrivent là où vos équipes regardent déjà.",
  },
  "Google Sheets": {
    famille: "Tableur & base",
    role: "Si vous suivez vos factures dans un tableur, l'agent y lit les échéances et y note l'état de chaque relance.",
  },
  Airtable: {
    famille: "Tableur & base",
    role: "Même rôle qu'un tableur, avec des vues par statut, utile quand plusieurs services suivent le même encours.",
  },
  Notion: {
    famille: "Tableur & base",
    role: "Base de connaissances de REPUT : horaires, tarifs, conditions. L'agent y trouve ses réponses au lieu de les inventer.",
  },
  "Google Drive": {
    famille: "Fichiers",
    role: "Dépôt des pièces classées : chaque facture fournisseur lue est rangée par émetteur et par mois, prête pour la comptabilité.",
  },
  Dropbox: {
    famille: "Fichiers",
    role: "Même classement des pièces, quand vos dossiers vivent déjà là.",
  },
  Stripe: {
    famille: "Paiement",
    role: "L'agent lit les encaissements et cesse de relancer une facture réglée, ce qui évite la relance de trop.",
  },
  PayPal: {
    famille: "Paiement",
    role: "Même lecture des encaissements, pour les activités qui facturent par ce canal.",
  },
  Shopify: {
    famille: "E-commerce",
    role: "OFFLOAD lit l'historique de commandes pour identifier les clients inactifs et les classer par valeur et par récence.",
  },
  WooCommerce: {
    famille: "E-commerce",
    role: "Même lecture de l'historique de commandes, pour les sites marchands sous WordPress.",
  },
  "Google Calendar": {
    famille: "Agenda",
    role: "REPUT propose des créneaux vraiment libres et pose le rendez-vous, si vous l'y avez autorisé.",
  },
  Calendly: {
    famille: "Agenda",
    role: "Quand la prise de rendez-vous passe déjà par là, l'agent s'y connecte plutôt que d'ouvrir un second canal.",
  },
  "Google Meet": {
    famille: "Agenda",
    role: "Lien de visio généré à la confirmation du rendez-vous, joint au message de rappel.",
  },
  Zoom: {
    famille: "Agenda",
    role: "Même génération de lien, pour les entreprises déjà équipées.",
  },
  QuickBooks: {
    famille: "Comptabilité",
    role: "Après votre validation, les factures lues y arrivent avec leur montant, leur TVA et leur fournisseur, sans ressaisie.",
  },
  Sage: {
    famille: "Comptabilité",
    role: "Même transmission des factures, au format attendu par Sage.",
  },
  /* ⚠ 14/08/2026 — la fiche n8n a été RETIRÉE. Elle disait « le socle sur
     lequel tournent les moteurs » : c'était nommer notre outil interne sur
     une page publique. Nos automatisations ne se nomment pas ; seuls les
     outils du client figurent ici. Ne pas la remettre. */
  Zapier: {
    famille: "Automatisation",
    role: "Passerelle vers les outils métier qui ne sont pas raccordés en direct.",
  },
  Trello: {
    famille: "Projet & CRM",
    role: "Chaque relance sans réponse peut ouvrir une carte à traiter par l'équipe.",
  },
  Asana: {
    famille: "Projet & CRM",
    role: "Même remontée des dossiers à reprendre à la main, quand le suivi passe par là.",
  },
  HubSpot: {
    famille: "Projet & CRM",
    role: "Les réponses des clients recontactés sont classées par niveau d'intérêt et écrites dans la fiche du contact.",
  },
  /* clé « MailChimp » avec un C majuscule : c'est le `title` exact de
     simple-icons, et la fiche était silencieusement écartée sans lui */
  MailChimp: {
    famille: "Projet & CRM",
    role: "Les messages aux clients inactifs partent sous votre marque, validés par vous ou autorisés d'avance. Les ouvertures et les désinscriptions sont suivies.",
  },
  Typeform: {
    famille: "Formulaires",
    role: "Une réponse à un formulaire arrive chez l'agent, qui la classe et prépare la suite.",
  },
  "Google Forms": {
    famille: "Formulaires",
    role: "Même déclenchement, pour les entreprises qui collectent déjà par ce biais.",
  },
  Facebook: {
    famille: "Réseaux sociaux",
    role: "Publication programmée aux heures d'audience, à partir du calendrier éditorial validé avec vous.",
  },
  Instagram: {
    famille: "Réseaux sociaux",
    role: "Même programmation, déclinée au format du réseau.",
  },
  WordPress: {
    famille: "Site web",
    role: "Les demandes reçues par le formulaire du site arrivent chez REPUT, comme les autres demandes.",
  },
};

/* Ce que les quatre paquets qui s'installent consomment réellement. */
export const MOTEUR_OUTILS = [
  {
    system: "CASHD",
    slug: "relances-impayes",
    role: "Relances de devis et de factures",
    outils: ["Gmail", "Google Sheets", "Stripe", "WhatsApp"],
  },
  {
    system: "REPUT",
    slug: "demandes-clients",
    role: "Demandes clients et avis",
    outils: ["WhatsApp", "Gmail", "Google Calendar", "Notion"],
  },
  {
    system: "FILED",
    slug: "factures-fournisseurs",
    role: "Factures fournisseurs",
    outils: ["Gmail", "Google Drive", "QuickBooks", "Sage"],
  },
  {
    system: "OFFLOAD",
    slug: "nouvelles-affaires",
    role: "Clients inactifs recontactés",
    /* « MailChimp » : même casse que le `title` de simple-icons et que la
       clé d'OUTIL_INFOS plus haut, sans quoi le logo saute au rendu. */
    outils: ["Shopify", "Google Sheets", "MailChimp", "Gmail"],
  },
];

/* Les quatre étapes du raccordement — développement propre à Omega, la
   référence n'a pas cette section. */
export const RACCORDEMENT = [
  {
    n: "01",
    titre: "Nous relevons vos outils",
    texte:
      "Pendant l'audit, nous relevons les outils que vos équipes utilisent vraiment, et les données à reprendre si Omega devient votre logiciel de gestion.",
  },
  {
    n: "02",
    titre: "Omega lit avant d'écrire",
    texte:
      "Omega commence par lire : factures, historique, fils de discussion. Rien n'est écrit ni envoyé tant que vous n'avez pas vérifié ce qu'il a lu.",
  },
  {
    n: "03",
    titre: "Vos équipes décident de ce qui part",
    texte:
      "Les agents préparent chaque action et vous la présentent. Vos équipes l'envoient, la corrigent ou l'abandonnent. Elles peuvent ensuite autoriser certains envois à partir seuls.",
  },
  {
    n: "04",
    titre: "Vos données restent les vôtres",
    texte:
      "Chaque entreprise a son espace de données chiffré, séparé des autres. Si vous arrêtez, nous vous remettons l'export complet et nous effaçons l'espace à votre demande.",
  },
];
