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

/* `statut` (C5, 06/10/2026, omega/AUDIT-PROMESSES.md § 0 et § 3, points 10 et
   13) : « preparation » = le raccordement est en construction (A2) ;
   « demande » = l'outil se raccorde à la demande d'un client, aucun connecteur
   n'existe encore. Sans statut : le code du raccordement existe. La grille
   affiche la pastille correspondante ; on retire le statut quand l'ouvrier
   livre (relevé dans omega/NOTES-C5.md). */
type Fiche = { famille: Famille; role: string; statut?: "preparation" | "demande" };

/* Clé = le `title` exact de simple-icons (voir OUTILS dans MediaMoteurs). */
export const OUTIL_INFOS: Record<string, Fiche> = {
  Gmail: {
    famille: "Messagerie",
    role: "Le système lit les fils entrants, rédige les relances et les dépose en brouillon dans votre file de validation Omega. L'envoi reste le geste de vos équipes.",
    statut: "preparation",
  },
  WhatsApp: {
    famille: "Messagerie",
    role: "Les demandes reçues hors horaires trouvent une réponse, et tout ce qui sort du périmètre validé est transféré à vos équipes au lieu d'être approximé.",
  },
  Telegram: {
    famille: "Messagerie",
    role: "Canal de notification : le point du matin et les alertes de retard critique arrivent là où vos équipes regardent déjà.",
    statut: "demande",
  },
  "Google Sheets": {
    famille: "Tableur & base",
    role: "Beaucoup de services pilotent encore leur encours dans un tableur. Le système y lit les échéances et y réécrit l'état de chaque relance.",
    statut: "demande",
  },
  Airtable: {
    famille: "Tableur & base",
    role: "Même rôle qu'un tableur, avec des vues par statut, utile quand plusieurs services suivent le même encours.",
    statut: "demande",
  },
  Notion: {
    famille: "Tableur & base",
    role: "Base de connaissances de REPUT : horaires, tarifs, conditions. Le système y puise ses réponses au lieu de les inventer.",
    statut: "demande",
  },
  "Google Drive": {
    famille: "Fichiers",
    role: "Dépôt des pièces classées : chaque facture fournisseur extraite est rangée par émetteur et par mois, prête pour la comptabilité.",
    statut: "demande",
  },
  Dropbox: {
    famille: "Fichiers",
    role: "Même classement des pièces, quand vos dossiers vivent déjà là.",
    statut: "demande",
  },
  Stripe: {
    famille: "Paiement",
    role: "Le système lit les encaissements et cesse de relancer une facture réglée, ce qui évite la relance de trop.",
    statut: "demande",
  },
  PayPal: {
    famille: "Paiement",
    role: "Même lecture des encaissements, pour les activités qui facturent par ce canal.",
    statut: "demande",
  },
  Shopify: {
    famille: "E-commerce",
    role: "OFFLOAD lit l'historique de commandes pour identifier les clients inactifs et les classer par valeur et par récence.",
    statut: "demande",
  },
  WooCommerce: {
    famille: "E-commerce",
    role: "Même exploitation de l'historique de commandes, pour les sites marchands sous WordPress.",
    statut: "demande",
  },
  "Google Calendar": {
    famille: "Agenda",
    role: "REPUT propose des créneaux réellement libres et pose le rendez-vous, sans double réservation.",
    statut: "demande",
  },
  Calendly: {
    famille: "Agenda",
    role: "Quand la prise de rendez-vous passe déjà par là, le système s'y connecte plutôt que d'ouvrir un second canal.",
    statut: "demande",
  },
  "Google Meet": {
    famille: "Agenda",
    role: "Lien de visio généré à la confirmation du rendez-vous, joint au message de rappel.",
    statut: "demande",
  },
  Zoom: {
    famille: "Agenda",
    role: "Même génération de lien, pour les entreprises déjà équipées.",
    statut: "demande",
  },
  QuickBooks: {
    famille: "Comptabilité",
    role: "Les pièces classées partent en dossier complet, avec leurs champs comptables extraits, sans ressaisie ni pièce manquante.",
    statut: "demande",
  },
  Sage: {
    famille: "Comptabilité",
    role: "Même transmission structurée vers la comptabilité, au format attendu par l'outil.",
    statut: "demande",
  },
  /* ⚠ 14/08/2026 — la fiche n8n a été RETIRÉE. Elle disait « le socle sur
     lequel tournent les moteurs » : c'était nommer notre outil interne sur
     une page publique. Nos automatisations ne se nomment pas ; seuls les
     outils du client figurent ici. Ne pas la remettre. */
  Zapier: {
    famille: "Automatisation",
    role: "Passerelle vers les outils métier qui ne sont pas raccordés en direct.",
    statut: "demande",
  },
  Trello: {
    famille: "Projet & CRM",
    role: "Chaque relance sans réponse peut ouvrir une carte à traiter, pour que rien ne se perde entre deux dossiers.",
    statut: "demande",
  },
  Asana: {
    famille: "Projet & CRM",
    role: "Même remontée des dossiers à reprendre à la main, quand le suivi passe par là.",
    statut: "demande",
  },
  HubSpot: {
    famille: "Projet & CRM",
    role: "Les réponses de prospection sont classées par niveau d'intérêt et écrites dans la fiche du contact.",
    statut: "demande",
  },
  /* clé « MailChimp » avec un C majuscule : c'est le `title` exact de
     simple-icons, et la fiche était silencieusement écartée sans lui */
  MailChimp: {
    famille: "Projet & CRM",
    role: "Les vagues de réactivation partent sous votre marque, avec le suivi d'ouverture et de désinscription.",
    statut: "demande",
  },
  Typeform: {
    famille: "Formulaires",
    role: "Une réponse à un formulaire déclenche la chaîne : qualification, accusé de réception, puis suivi.",
    statut: "demande",
  },
  "Google Forms": {
    famille: "Formulaires",
    role: "Même déclenchement, pour les entreprises qui collectent déjà par ce biais.",
    statut: "demande",
  },
  Facebook: {
    famille: "Réseaux sociaux",
    role: "Publication programmée aux heures d'audience, à partir du calendrier éditorial validé avec vous.",
    statut: "demande",
  },
  Instagram: {
    famille: "Réseaux sociaux",
    role: "Même programmation, déclinée au format du réseau.",
    statut: "demande",
  },
  WordPress: {
    famille: "Site web",
    role: "Les demandes reçues par le formulaire du site entrent dans le même circuit que le reste.",
    statut: "demande",
  },
};

/* Ce que les quatre paquets qui s'installent consomment réellement. */
export const MOTEUR_OUTILS = [
  {
    system: "CASHD",
    slug: "relances-impayes",
    role: "Relance devis & factures",
    outils: ["Gmail", "Google Sheets", "Stripe", "WhatsApp"],
  },
  {
    system: "REPUT",
    slug: "demandes-clients",
    role: "Demandes entrantes & avis",
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
    role: "Relance des comptes inactifs",
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
      "Pendant le diagnostic, nous relevons les outils réellement utilisés par vos services, pas ceux de l'organigramme. Un tableur et une messagerie suffisent à faire tourner un système.",
  },
  {
    n: "02",
    titre: "La lecture précède l'écriture",
    texte:
      "Le système commence par lire : encours, historique, fils de discussion. Rien n'est écrit ni envoyé tant que cette lecture n'est pas validée.",
  },
  {
    n: "03",
    titre: "L'écriture passe par vos équipes",
    texte:
      "Le système prépare ensuite chaque action et la dépose dans la file de validation, où vos équipes l'envoient, la corrigent ou l'abandonnent.",
  },
  {
    n: "04",
    titre: "Les données restent chez vous",
    texte:
      "Chaque entreprise dispose d'un espace de données chiffré, séparé des autres. Le jour où vous arrêtez, l'export complet vous est remis, puis l'espace est effacé.",
  },
];
