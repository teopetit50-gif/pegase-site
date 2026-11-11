/* ══════════════════════════════════════════════════════════════════════
   MON ESPACE — les données de l'espace personnel de Teo (11/11/2026)

   Les mêmes formes, qu'elles viennent de la base et de Google (lib/teo/*)
   ou de l'exemple (components/espace2/teo/exemples.ts). Les pages ne
   connaissent que ces types.
   ══════════════════════════════════════════════════════════════════════ */

/* ——— un client ou un prospect suivi (omega_contacts + omega_echanges) ——— */
export type EchangeTeo = { id: string; quand: string; canal: string; resume: string };
export type ClientTeo = {
  id: string;
  nom: string;
  entreprise: string | null;
  role: string | null;
  /* Prospect, Client, Partenaire, Réseau, Prestataire, Candidat, Autre */
  type: string;
  /* À contacter, Contacté, En conversation, Audit réservé, Audit tenu, Récap envoyé, Signé, Installé, En réel, Partenaire actif, En pause, Perdu */
  etape: string;
  telephone: string | null;
  courriel: string | null;
  commune: string | null;
  secteur: string | null;
  source: string | null;
  prochaine_action: string | null;
  prochaine_date: string | null;
  note: string | null;
  maj: string;
  echanges: EchangeTeo[];
};

/* ——— un rendez-vous de l'agenda Google ——— */
export type InviteRdv = { nom: string | null; email: string; reponse: "oui" | "non" | "peut-etre" | "attente" };
export type RendezVous = {
  id: string;
  titre: string;
  /* ISO ; pour une journée entière, le jour en « AAAA-MM-JJ » et journee = true */
  debut: string;
  fin: string;
  journee: boolean;
  lieu: string | null;
  description: string | null;
  /* le lien Meet, ou de visio, s'il y en a un */
  visio: string | null;
  invites: InviteRdv[];
  statut: "confirme" | "provisoire" | "annule";
  /* la page de l'événement dans Google Agenda */
  lien: string | null;
  /* l'agenda d'où il vient */
  agenda: string;
};

/* ——— une conversation WhatsApp (omega_whatsapp_messages) ——— */
export type MessageWa = {
  id: string;
  sens: "recu" | "envoye";
  type: "texte" | "image" | "audio" | "video" | "document" | "autre";
  texte: string;
  quand: string;
  lu: boolean;
  /* envoyé · remis · lu, pour nos messages */
  statut: "envoye" | "remis" | "lu" | "echec" | null;
};
export type ConversationWa = {
  /* le numéro au format international sans « + » (le wa_id de Meta) */
  numero: string;
  nom: string;
  messages: MessageWa[];
};

/* ——— un fil de la boîte Gmail ——— */
export type PieceMailTeo = { nom: string; taille: number };
export type MessageMailTeo = {
  id: string;
  de_nom: string;
  de_adresse: string;
  a: string;
  cc: string;
  quand: string;
  texte: string;
  pieces: PieceMailTeo[];
  /* parti de ma boîte */
  moi: boolean;
};
export type FilMail = {
  id: string;
  objet: string;
  de_nom: string;
  de_adresse: string;
  apercu: string;
  recu_le: string;
  non_lu: boolean;
  important: boolean;
  nb_messages: number;
  pieces: PieceMailTeo[];
  /* le dernier message est parti de ma boîte (une réponse envoyée) */
  repondu: boolean;
  /* les messages, lus à l'ouverture du fil */
  messages: MessageMailTeo[] | null;
};

/* ——— l'état des branchements, pour le dire honnêtement sur chaque page ——— */
export type EtatGoogle = "ok" | "absent" | "portee" | "erreur";
export type EtatWhatsApp = "ok" | "sans_table" | "absent" | "erreur";
export type Connexions = { google: EtatGoogle; whatsapp: EtatWhatsApp; adresse: string | null; detail: string | null };

/* ——— les valeurs des listes déroulantes des clients (celles de /omega/contacts) ——— */
export const TYPES_CLIENT = ["Prospect", "Client", "Partenaire", "Réseau", "Prestataire", "Candidat", "Autre"];
export const ETAPES_CLIENT = ["À contacter", "Contacté", "En conversation", "Audit réservé", "Audit tenu", "Récap envoyé", "Signé", "Installé", "En réel", "Partenaire actif", "En pause", "Perdu"];
export const CANAUX_ECHANGE = ["Appel", "Visite", "WhatsApp", "E-mail", "Rendez-vous", "Message LinkedIn"];
