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
  /* Prospect, Pilote, Client (le statut du tableau des associés) ; Partenaire, Réseau, Prestataire, Candidat, Autre dans l'exemple */
  type: string;
  /* une colonne du pipeline du tableau des associés (ETAPES_CLIENT) */
  etape: string;
  /* l'associé qui suit le prospect dans le tableau (Teo, Timothée), s'il est noté */
  suivi_par: string | null;
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
  /* Google Agenda, ou les rendez-vous du tableau des associés */
  origine: "google" | "tableau";
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
/* le tableau des associés : la session de Teo dessus est ouverte, absente, ou le tableau n'a pas répondu */
export type EtatTableau = "ok" | "absent" | "erreur";
export type Connexions = {
  google: EtatGoogle;
  whatsapp: EtatWhatsApp;
  tableau: EtatTableau;
  adresse: string | null;
  /* le compte ouvert sur le tableau des associés */
  compteTableau: string | null;
  detail: string | null;
};

/* ——— les valeurs des listes déroulantes des clients ———
   Depuis le 11/11 au soir, ce sont celles du TABLEAU DES ASSOCIÉS
   (omega-metiers/tableau, components/tableau/v2/etapes.ts et store.ts) :
   les clients de Mon espace SONT ses prospects, même pipeline, mêmes mots. */
export const TYPES_CLIENT = ["Prospect", "Pilote", "Client", "Partenaire", "Réseau", "Prestataire", "Candidat", "Autre"];
/* les colonnes du pipeline, dans l'ordre du tableau : clé en base → libellé */
export const PIPELINE: { cle: string; libelle: string; statut: string }[] = [
  { cle: "nouveau", libelle: "Nouveau lead", statut: "nouveau" },
  { cle: "appel1", libelle: "1er appel de prospection", statut: "contacte" },
  { cle: "appel2", libelle: "2e appel de prospection", statut: "contacte" },
  { cle: "appel3", libelle: "3e appel et +", statut: "contacte" },
  { cle: "r1", libelle: "R1", statut: "rdv" },
  { cle: "r2", libelle: "R2", statut: "pilote" },
  { cle: "r3", libelle: "R3", statut: "pilote" },
  { cle: "complique", libelle: "Compliqué", statut: "contacte" },
  { cle: "signe", libelle: "Signé", statut: "client" },
  { cle: "perdu", libelle: "Perdu", statut: "perdu" },
  { cle: "rc1", libelle: "À recontacter dans 1 mois", statut: "contacte" },
  { cle: "rc2", libelle: "À recontacter dans 2 mois", statut: "contacte" },
  { cle: "rc4", libelle: "À recontacter dans 4 mois", statut: "contacte" },
  { cle: "rc6", libelle: "À recontacter dans 6 mois", statut: "contacte" },
];
export const ETAPES_CLIENT = PIPELINE.map((e) => e.libelle);
/* les étapes où il n'y a plus rien à relancer */
export const ETAPES_FINIES = ["Signé", "Perdu"];
/* le canal d'un échange : ce que le tableau range dans appels.source */
export const CANAUX_ECHANGE = ["Appel", "Visite", "WhatsApp", "E-mail", "Rendez-vous", "Message LinkedIn"];
