/* ══════════════════════════════════════════════════════════════════════
   /integrations — métadonnées des outils (30/07/2026)

   Page de référence : ocoya.com/integrations. Les 29 marques et leurs logos
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
    role: "Le moteur lit les fils entrants, rédige les relances et les dépose en brouillon dans votre boîte — l'envoi reste votre geste.",
  },
  WhatsApp: {
    famille: "Messagerie",
    role: "Les demandes reçues hors horaires trouvent une réponse, et tout ce qui sort du périmètre vous est transféré au lieu d'être approximé.",
  },
  Telegram: {
    famille: "Messagerie",
    role: "Canal de notification du desk : le brief du matin et les alertes de retard critique arrivent là où vous regardez déjà.",
  },
  "Google Sheets": {
    famille: "Tableur & base",
    role: "La plupart des TPE pilotent leur activité dans un tableur. Le moteur y lit l'encours et y réécrit l'état de chaque relance.",
  },
  Airtable: {
    famille: "Tableur & base",
    role: "Même rôle qu'un tableur, avec des vues par statut — utile quand plusieurs personnes suivent le même encours.",
  },
  Notion: {
    famille: "Tableur & base",
    role: "Base de connaissances du réceptionniste : horaires, tarifs, conditions. ANSWR y puise ses réponses au lieu de les inventer.",
  },
  "Google Drive": {
    famille: "Fichiers",
    role: "Dépôt des pièces classées : chaque facture fournisseur extraite est rangée par émetteur et par mois, prête pour le cabinet.",
  },
  Dropbox: {
    famille: "Fichiers",
    role: "Alternative au Drive pour le classement des pièces, quand c'est déjà là que vivent vos dossiers.",
  },
  Stripe: {
    famille: "Paiement",
    role: "Le moteur sait ce qui est encaissé et arrête de relancer une facture réglée — c'est ce qui évite la relance de trop.",
  },
  PayPal: {
    famille: "Paiement",
    role: "Même lecture des encaissements, pour les activités qui facturent par ce canal.",
  },
  Shopify: {
    famille: "E-commerce",
    role: "Historique de commandes lu par REVIVE pour identifier les clients dormants et les classer par valeur et par récence.",
  },
  WooCommerce: {
    famille: "E-commerce",
    role: "Même exploitation de l'historique de commandes, pour les boutiques sous WordPress.",
  },
  "Google Calendar": {
    famille: "Agenda",
    role: "Le réceptionniste propose des créneaux réellement libres et pose le rendez-vous, sans double réservation.",
  },
  Calendly: {
    famille: "Agenda",
    role: "Quand la prise de rendez-vous passe déjà par là, le moteur s'y branche plutôt que d'ouvrir un second canal.",
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
    role: "Les pièces classées partent en dossier complet, avec leurs champs comptables extraits — ni ressaisie, ni pièce manquante.",
  },
  Sage: {
    famille: "Comptabilité",
    role: "Même transmission structurée vers le cabinet, au format attendu par l'outil.",
  },
  n8n: {
    famille: "Automatisation",
    role: "Le socle sur lequel tournent les moteurs. C'est lui qui orchestre chaque tâche et va lire vos données dans vos outils, sans les recopier.",
  },
  Zapier: {
    famille: "Automatisation",
    role: "Passerelle vers les outils métier que le desk ne raccorde pas en direct.",
  },
  Trello: {
    famille: "Projet & CRM",
    role: "Chaque relance sans réponse peut ouvrir une carte à traiter, pour que rien ne se perde entre deux chantiers.",
  },
  Asana: {
    famille: "Projet & CRM",
    role: "Même remontée des dossiers à reprendre à la main, quand le suivi passe par là.",
  },
  HubSpot: {
    famille: "Projet & CRM",
    role: "Les réponses de prospection sont classées par niveau d'intérêt et écrites dans la fiche du contact.",
  },
  /* clé « MailChimp » avec un C majuscule : c'est le `title` exact de
     simple-icons, et la fiche était silencieusement écartée sans lui */
  MailChimp: {
    famille: "Projet & CRM",
    role: "Les vagues de réactivation partent sous votre marque, avec le suivi d'ouverture et de désinscription.",
  },
  Typeform: {
    famille: "Formulaires",
    role: "Une réponse à un formulaire déclenche la chaîne : qualification, accusé de réception, puis suivi.",
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
    role: "Les demandes reçues par le formulaire du site entrent dans le même circuit que le reste.",
  },
};

/* Ce que les quatre moteurs les plus installés consomment réellement. */
export const MOTEUR_OUTILS = [
  {
    system: "PAYD",
    role: "Relance devis & factures",
    outils: ["Gmail", "Google Sheets", "Stripe", "WhatsApp"],
  },
  {
    system: "ANSWR",
    role: "Réceptionniste 24/7",
    outils: ["WhatsApp", "Gmail", "Google Calendar", "Notion"],
  },
  {
    system: "OFFLOAD",
    role: "Factures fournisseurs",
    outils: ["Gmail", "Google Drive", "QuickBooks", "Sage"],
  },
  {
    system: "REVIVE",
    role: "Clients dormants",
    outils: ["Shopify", "Google Sheets", "Mailchimp", "Gmail"],
  },
];

/* Les quatre étapes du raccordement — développement propre à Omega, la
   référence n'a pas cette section. */
export const RACCORDEMENT = [
  {
    n: "01",
    titre: "On liste ce que vous avez",
    texte:
      "Pendant l'audit, on relève les outils réellement utilisés — pas ceux de la plaquette. Un tableur et une boîte mail suffisent à faire tourner un moteur.",
  },
  {
    n: "02",
    titre: "On se branche en lecture d'abord",
    texte:
      "Le moteur commence par lire : encours, historique, fils de discussion. Rien n'est écrit ni envoyé tant que la lecture n'est pas juste.",
  },
  {
    n: "03",
    titre: "L'écriture passe par vous",
    texte:
      "Puis le moteur prépare, et dépose dans votre file de validation. Vous envoyez, vous corrigez, ou vous laissez tomber.",
  },
  {
    n: "04",
    titre: "Les données restent chez vous",
    texte:
      "Le moteur lit vos données là où elles sont — dans vos outils — au lieu de les recopier dans une base à lui. Rien à rapatrier le jour où vous arrêtez.",
  },
];
