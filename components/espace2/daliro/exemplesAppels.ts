/* ══════════════════════════════════════════════════════════════════════
   DALIRO, les appels d'exemple (05/11/2026)

   Ce que l'agent téléphonique d'Omega fait des appels d'une entreprise du
   bâtiment : il décroche quand personne ne peut (chantier, soir, week-end),
   transcrit, résume, rattache l'appel au chantier et ouvre les suites. Les
   appels pris au bureau et les messages vocaux passent par le même journal.

   Personnes, numéros et chantiers fictifs (les chantiers d'exemple de
   ./exemplesEtoffes) ; dates relatives au jour de la visite. Rien ici n'est
   jamais écrit en base.
   ══════════════════════════════════════════════════════════════════════ */

const d = (n: string) => `00000000-0000-4000-8000-00000000d${n}`;

export type IssueAppel = "agent" | "bureau" | "rappele" | "messagerie" | "filtre";
export type EtatAppel = "tri" | "cours" | "fait";
export type EtatSuite = "fait" | "cours" | "afaire" | "tri";

export type Appel = {
  id: string;
  numero: string;
  titre: string;
  appelant: string;
  telephone: string;
  qualite: string;
  connu: boolean;
  quand: string;
  duree: string;
  issue: IssueAppel;
  /* qui a pris l'appel au bureau, s'il a été pris au bureau */
  pris_par?: string;
  etat: EtatAppel;
  priorite: 0 | 1 | 2 | 3;
  motif: string;
  chantier_id: string | null;
  chantier_nom: string | null;
  resume: string;
  transcription: [string, string, string][];
  suites: { libelle: string; etat: EtatSuite; detail?: string }[];
  journal: { qui: string; quoi: string; quand: string }[];
};

/* « il y a j jours, à h:m » */
function a(j: number, h: number, m = 0): string {
  const x = new Date();
  x.setDate(x.getDate() - j);
  x.setHours(h, m, 0, 0);
  return x.toISOString();
}
function plus(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString();
}

export const ISSUES: Record<IssueAppel, string> = {
  agent: "Décroché par l'agent",
  bureau: "Pris au bureau",
  rappele: "Manqué, rappelé par l'agent",
  messagerie: "Message vocal transcrit",
  filtre: "Filtré par l'agent",
};
export const ETATS: Record<EtatAppel, string> = { tri: "À traiter", cours: "En cours", fait: "Traité" };
export const PRIORITES = ["Aucune priorité", "Urgent", "Haute", "Normale"] as const;

const DUR = d("740");
const ROL = d("002");
const SCL = d("720");
const MAM = d("730");
const VEN = d("750");
const GAR = d("760");
const TIL = d("001");

const q1 = a(0, 19, 12);
const q2 = a(0, 12, 5);
const q3 = a(0, 9, 41);
const q4 = a(0, 7, 18);
const q5 = a(1, 17, 52);
const q6 = a(1, 16, 3);
const q7 = a(1, 11, 27);
const q8 = a(2, 20, 40);
const q9 = a(2, 13, 15);
const q10 = a(3, 6, 55);
const q11 = a(3, 18, 30);

export const APPELS_EXEMPLE: Appel[] = [
  {
    id: "apl-31", numero: "APL-31", titre: "Fuite dans le local technique de la terrasse", appelant: "Mme Duret", telephone: "+590 690 73 19 44", qualite: "Cliente", connu: true,
    quand: q1, duree: "2 min 40", issue: "agent", etat: "tri", priorite: 1, motif: "Urgence chantier", chantier_id: DUR, chantier_nom: "Villa Duret — terrasse",
    resume: "Mme Duret signale de l'eau qui coule le long du mur du local technique, côté terrasse, depuis la pluie de ce matin. L'agent a demandé une photo (reçue à 19 h 15 par WhatsApp), vérifié que la pompe de piscine n'est pas touchée et promis un rappel du conducteur de travaux demain à 7 h 30. L'étanchéité du local n'est pas encore faite (lot 05, passage prévu dans six jours) : à vérifier si c'est un défaut de la structure ou l'attente normale du lot.",
    transcription: [
      ["Agent", "0:00", "Bonsoir, entreprise de bâtiment, je suis l'assistant de l'équipe. Je vous écoute."],
      ["Mme Duret", "0:05", "Oui bonsoir, c'est Mme Duret, la terrasse au Gosier. Il pleut dans le local technique, l'eau coule le long du mur."],
      ["Agent", "0:16", "Je note. L'eau arrive près de la pompe de la piscine ?"],
      ["Mme Duret", "0:21", "Non, de l'autre côté, mais il y a une flaque. Ça a commencé avec la pluie de ce matin."],
      ["Agent", "0:33", "Pouvez-vous m'envoyer une photo sur ce numéro par WhatsApp ? Je la joins au dossier du chantier."],
      ["Mme Duret", "1:02", "C'est envoyé."],
      ["Agent", "1:10", "Bien reçue. Le conducteur de travaux vous rappelle demain à 7 h 30. En attendant, gardez la porte du local fermée."],
      ["Mme Duret", "1:24", "D'accord, merci."],
    ],
    suites: [
      { libelle: "Photo de la fuite jointe au chantier", etat: "fait", detail: "WhatsApp, 19 h 15" },
      { libelle: "Rappeler Mme Duret demain à 7 h 30", etat: "afaire", detail: "Yanis Dupré" },
      { libelle: "Vérifier : défaut de structure ou étanchéité pas encore posée (lot 05)", etat: "tri" },
    ],
    journal: [
      { qui: "Ligne du bureau", quoi: "a reçu l'appel, hors horaires", quand: q1 },
      { qui: "L'agent", quoi: "a décroché, transcrit et résumé l'appel", quand: plus(q1, 3) },
      { qui: "L'agent", quoi: "a rattaché l'appel à Villa Duret — terrasse", quand: plus(q1, 3) },
      { qui: "L'agent", quoi: "a créé la tâche « Rappeler Mme Duret » pour Yanis Dupré", quand: plus(q1, 4) },
    ],
  },
  {
    id: "apl-30", numero: "APL-30", titre: "Demande de devis : salle de bain complète au Gosier", appelant: "M. Bernard", telephone: "+590 690 21 47 85", qualite: "Nouveau client", connu: false,
    quand: q2, duree: "4 min 10", issue: "agent", etat: "cours", priorite: 2, motif: "Demande de devis", chantier_id: null, chantier_nom: null,
    resume: "M. Bernard, villa à Pliane (Le Gosier), veut refaire entièrement une salle de bain d'environ 8 m² : douche à l'italienne, carrelage sol et murs, meuble double vasque. Début souhaité en janvier, budget annoncé de 12 000 à 15 000 €. L'équipe était sur chantier : l'agent a proposé une visite, acceptée pour jeudi 13 novembre à 9 h, et créé la fiche client.",
    transcription: [
      ["Agent", "0:00", "Bonjour, entreprise de bâtiment, je suis l'assistant de l'équipe, qui est sur chantier ce matin. Que puis-je faire pour vous ?"],
      ["M. Bernard", "0:07", "Bonjour, je voudrais un devis pour refaire ma salle de bain, au Gosier, à Pliane."],
      ["Agent", "0:15", "Avec plaisir. Quelle surface, à peu près, et qu'aimeriez-vous changer ?"],
      ["M. Bernard", "0:21", "Huit mètres carrés. Tout : la baignoire devient une douche à l'italienne, le carrelage, le meuble."],
      ["Agent", "1:40", "Pour un chiffrage juste, le conducteur de travaux passe voir la pièce. Jeudi 13 à 9 h, cela vous convient ?"],
      ["M. Bernard", "1:52", "Jeudi 9 h, c'est parfait."],
      ["Agent", "2:05", "C'est noté. Vous recevez un SMS de confirmation avec l'adresse que vous m'avez donnée."],
    ],
    suites: [
      { libelle: "Fiche client créée : M. Bernard, Pliane, Le Gosier", etat: "fait" },
      { libelle: "Visite jeudi 13 novembre à 9 h", etat: "fait", detail: "SMS de confirmation envoyé" },
      { libelle: "Préparer le devis après la visite", etat: "afaire", detail: "Yanis Dupré" },
    ],
    journal: [
      { qui: "Ligne du bureau", quoi: "a reçu l'appel, personne de libre", quand: q2 },
      { qui: "L'agent", quoi: "a décroché et proposé une visite", quand: plus(q2, 1) },
      { qui: "L'agent", quoi: "a envoyé le SMS de confirmation de la visite", quand: plus(q2, 5) },
    ],
  },
  {
    id: "apl-29", numero: "APL-29", titre: "Plâtrerie Morel absente vendredi et samedi", appelant: "Plâtrerie Morel", telephone: "+590 690 41 22 03", qualite: "Sous-traitant", connu: true,
    quand: q3, duree: "1 min 55", issue: "bureau", pris_par: "Claire Morel", etat: "cours", priorite: 2, motif: "Sous-traitant", chantier_id: SCL, chantier_nom: "Cabinet médical Saint-Clair",
    resume: "Le gérant de Plâtrerie Morel prévient qu'un de ses plâtriers est en arrêt maladie : l'équipe ne viendra pas vendredi et samedi au cabinet Saint-Clair (bandes et enduits). L'absence est notée dans Équipes ; le passage est à revoir, et les faux plafonds (lot 04) qui suivent risquent de glisser.",
    transcription: [
      ["Plâtrerie Morel", "0:00", "Bonjour Claire, c'est Morel. J'ai un gars en arrêt, on ne pourra pas être à Saint-Clair vendredi et samedi."],
      ["Claire Morel", "0:09", "D'accord. Vous reprenez lundi ?"],
      ["Plâtrerie Morel", "0:13", "Lundi oui, avec deux personnes, pour rattraper."],
      ["Claire Morel", "0:20", "Je note l'absence et je regarde avec les plafonds. Je vous confirme le planning ce soir."],
    ],
    suites: [
      { libelle: "Absence notée du vendredi au samedi", etat: "fait", detail: "Équipes" },
      { libelle: "Recaler les faux plafonds (lot 04) après les enduits", etat: "cours" },
      { libelle: "Confirmer le nouveau planning à Plâtrerie Morel", etat: "afaire", detail: "ce soir" },
    ],
    journal: [
      { qui: "Claire Morel", quoi: "a pris l'appel au bureau", quand: q3 },
      { qui: "L'agent", quoi: "a transcrit et rattaché l'appel au cabinet Saint-Clair", quand: plus(q3, 2) },
      { qui: "Claire Morel", quoi: "a noté l'absence dans Équipes", quand: plus(q3, 6) },
    ],
  },
  {
    id: "apl-28", numero: "APL-28", titre: "Carrelage du laboratoire : livraison reportée au 14", appelant: "Négoce Matériaux Jarry", telephone: "+590 590 26 18 30", qualite: "Fournisseur", connu: true,
    quand: q4, duree: "1 min 20", issue: "agent", etat: "fait", priorite: 3, motif: "Fournisseur", chantier_id: MAM, chantier_nom: "Boulangerie Ma Mie — agencement",
    resume: "Le négoce prévient que le conteneur du carrelage antidérapant est débarqué au port de Jarry avec deux jours de retard : livraison sur le chantier le 14 au lieu du 12. L'agent a reporté la livraison dans l'approvisionnement et prévenu Carrelage Bonne-Terre.",
    transcription: [
      ["Négoce Matériaux Jarry", "0:00", "Bonjour, c'est le négoce de Jarry pour la commande de la boulangerie Ma Mie. Le bateau a deux jours de retard, on livre le 14."],
      ["Agent", "0:11", "Bien noté : livraison le 14 au lieu du 12, même créneau du matin ?"],
      ["Négoce Matériaux Jarry", "0:17", "Oui, avant 9 h."],
      ["Agent", "0:21", "Je mets à jour la commande et je préviens le carreleur. Merci."],
    ],
    suites: [
      { libelle: "Livraison reportée au 14 avant 9 h", etat: "fait", detail: "Approvisionnement" },
      { libelle: "Carrelage Bonne-Terre prévenu du report", etat: "fait", detail: "WhatsApp" },
    ],
    journal: [
      { qui: "L'agent", quoi: "a décroché, transcrit et résumé l'appel", quand: q4 },
      { qui: "L'agent", quoi: "a reporté la livraison au 14 dans l'approvisionnement", quand: plus(q4, 2) },
      { qui: "Carrelage Bonne-Terre", quoi: "a confirmé avoir lu le report", quand: plus(q4, 40) },
    ],
  },
  {
    id: "apl-27", numero: "APL-27", titre: "Plan de prévention à signer avant la démolition", appelant: "M. Céleste, Ville des Abymes", telephone: "+590 590 48 00 00", qualite: "Maître d'ouvrage", connu: true,
    quand: q5, duree: "3 min 05", issue: "rappele", etat: "fait", priorite: 2, motif: "Administration", chantier_id: VEN, chantier_nom: "École Jean-Moulin — préaux",
    resume: "M. Céleste, des services techniques, a appelé pendant la réunion de chantier ; l'agent l'a rappelé dix minutes plus tard. Le plan de prévention avec l'école doit être signé avant toute intervention : rendez-vous fixé mardi à 10 h à l'école, avec la directrice.",
    transcription: [
      ["Agent", "0:00", "Bonjour M. Céleste, je vous rappelle de la part de l'entreprise, vous avez cherché à nous joindre."],
      ["M. Céleste", "0:06", "Oui, pour les préaux de Jean-Moulin. Il nous faut le plan de prévention signé avant que vous commenciez."],
      ["Agent", "0:15", "Bien sûr. Quand la directrice est-elle disponible ?"],
      ["M. Céleste", "0:20", "Mardi matin, 10 h, à l'école."],
      ["Agent", "0:26", "C'est noté pour mardi 10 h. Le conducteur de travaux apporte le plan prêt à signer."],
    ],
    suites: [
      { libelle: "Rendez-vous mardi à 10 h à l'école", etat: "fait", detail: "Agenda du conducteur" },
      { libelle: "Imprimer le plan de prévention en deux exemplaires", etat: "afaire" },
    ],
    journal: [
      { qui: "Ligne du bureau", quoi: "a manqué l'appel (réunion de chantier)", quand: q5 },
      { qui: "L'agent", quoi: "a rappelé M. Céleste", quand: plus(q5, 10) },
      { qui: "L'agent", quoi: "a posé le rendez-vous de mardi", quand: plus(q5, 14) },
    ],
  },
  {
    id: "apl-26", numero: "APL-26", titre: "Réouverture : le four est arrivé, la date tient-elle ?", appelant: "M. Lacroix, Boulangerie Ma Mie", telephone: "+590 590 82 77 15", qualite: "Client", connu: true,
    quand: q6, duree: "2 min 15", issue: "agent", etat: "tri", priorite: 1, motif: "Suivi de chantier", chantier_id: MAM, chantier_nom: "Boulangerie Ma Mie — agencement",
    resume: "M. Lacroix confirme que le four est arrivé au port et demande si la réouverture du samedi 29 tient. L'agent a répondu depuis le planning : comptoirs posés la semaine prochaine, mais la ligne triphasée du four n'est pas confirmée (Électricité Ferrand a décliné le 6). Le client attend un rappel ce soir avec la nouvelle date de raccordement.",
    transcription: [
      ["M. Lacroix", "0:00", "Bonjour, c'est Lacroix, de la boulangerie. Le four est arrivé à Jarry. On rouvre toujours le 29 ?"],
      ["Agent", "0:09", "Bonjour M. Lacroix. Les comptoirs sont posés la semaine prochaine. Le raccordement du four reste à caler avec l'électricien."],
      ["M. Lacroix", "0:21", "Il faut que ce soit fait avant, sinon je ne peux rien cuire."],
      ["Agent", "0:27", "Je le note comme prioritaire. Le conducteur de travaux vous rappelle ce soir avec la date."],
    ],
    suites: [
      { libelle: "Obtenir une date ferme de la ligne triphasée", etat: "tri", detail: "Électricité Ferrand propose le 10" },
      { libelle: "Rappeler M. Lacroix ce soir", etat: "afaire", detail: "Yanis Dupré" },
    ],
    journal: [
      { qui: "L'agent", quoi: "a décroché, transcrit et résumé l'appel", quand: q6 },
      { qui: "L'agent", quoi: "a marqué le raccordement du four comme urgent", quand: plus(q6, 3) },
    ],
  },
  {
    id: "apl-25", numero: "APL-25", titre: "Démarchage : assurance professionnelle", appelant: "Numéro inconnu", telephone: "+590 590 00 41 77", qualite: "Inconnu", connu: false,
    quand: q7, duree: "0 min 40", issue: "filtre", etat: "fait", priorite: 0, motif: "Démarchage", chantier_id: null, chantier_nom: null,
    resume: "Proposition commerciale d'un courtier en assurance. L'agent a pris les coordonnées sans transférer l'appel ; rien à faire.",
    transcription: [
      ["Appelant", "0:00", "Bonjour, je vous appelle pour votre assurance décennale, nous avons des offres…"],
      ["Agent", "0:06", "Merci, je note vos coordonnées. L'équipe vous recontactera si besoin. Bonne journée."],
    ],
    suites: [{ libelle: "Coordonnées notées, pas de suite", etat: "fait" }],
    journal: [{ qui: "L'agent", quoi: "a filtré l'appel (démarchage)", quand: q7 }],
  },
  {
    id: "apl-24", numero: "APL-24", titre: "Réserve : joint de la baie coulissante", appelant: "Mme Garnier", telephone: "+590 690 64 02 77", qualite: "Cliente", connu: true,
    quand: q8, duree: "1 min 50", issue: "agent", etat: "cours", priorite: 2, motif: "Réception et réserves", chantier_id: GAR, chantier_nom: "Maison Garnier — extension",
    resume: "Mme Garnier demande quand le joint de la baie coulissante (réserve n° 1 de la réception) sera repris : l'eau passe quand il pleut fort. L'agent a proposé l'intervention de Pose B mardi matin, acceptée ; la levée de la réserve débloquera la retenue de garantie.",
    transcription: [
      ["Mme Garnier", "0:00", "Bonsoir, c'est Mme Garnier. Le joint de la baie, quand est-ce que vous venez ? Avec la pluie, l'eau passe."],
      ["Agent", "0:08", "Bonsoir Mme Garnier. Je peux vous proposer mardi matin, à partir de 8 h, pour une demi-journée."],
      ["Mme Garnier", "0:16", "Mardi, oui."],
      ["Agent", "0:19", "C'est noté. Vous recevez un SMS la veille."],
    ],
    suites: [
      { libelle: "Intervention de Pose B mardi à 8 h", etat: "fait", detail: "Planning" },
      { libelle: "Lever la réserve n° 1 après l'intervention", etat: "afaire" },
      { libelle: "Demander la libération de la retenue (2 140 €)", etat: "afaire" },
    ],
    journal: [
      { qui: "Ligne du bureau", quoi: "a reçu l'appel, hors horaires", quand: q8 },
      { qui: "L'agent", quoi: "a décroché et posé l'intervention", quand: plus(q8, 1) },
    ],
  },
  {
    id: "apl-23", numero: "APL-23", titre: "Électricité Ferrand : pas possible le 6, propose le 10", appelant: "Électricité Ferrand", telephone: "+590 690 41 22 04", qualite: "Sous-traitant", connu: true,
    quand: q9, duree: "0 min 52", issue: "messagerie", etat: "tri", priorite: 1, motif: "Sous-traitant", chantier_id: MAM, chantier_nom: "Boulangerie Ma Mie — agencement",
    resume: "Message vocal d'Électricité Ferrand : l'équipe est bloquée sur un autre chantier le 6 et propose le 10 pour la ligne triphasée du four. À décider : accepter le 10 (la réouverture du 29 tient) ou chercher un remplaçant dans l'annuaire.",
    transcription: [
      ["Électricité Ferrand", "0:00", "Oui bonjour, c'est Ferrand. Pour la boulangerie, le 6 on ne pourra pas, on est coincés aux Abymes. Le 10 au matin, ça irait. Rappelez-moi."],
    ],
    suites: [
      { libelle: "Accepter le 10 ou chercher un remplaçant", etat: "tri", detail: "2 électriciens disponibles dans l'annuaire" },
    ],
    journal: [
      { qui: "Messagerie", quoi: "a enregistré un message de 52 s", quand: q9 },
      { qui: "L'agent", quoi: "a transcrit le message et l'a rattaché à la boulangerie Ma Mie", quand: plus(q9, 1) },
    ],
  },
  {
    id: "apl-22", numero: "APL-22", titre: "Deux plots béton de plus côté piscine", appelant: "Karim B., chef d'équipe Pose A", telephone: "+590 690 55 10 32", qualite: "Équipe", connu: true,
    quand: q10, duree: "1 min 30", issue: "bureau", pris_par: "Yanis Dupré", etat: "fait", priorite: 2, motif: "Travaux supplémentaires", chantier_id: DUR, chantier_nom: "Villa Duret — terrasse",
    resume: "Karim appelle du chantier : le terrain est plus meuble que prévu côté piscine, il faut deux plots supplémentaires pour tenir les lambourdes. Travail hors devis : l'avenant a été préparé sur le prix unitaire des plots (225 € HT l'unité) et attend la signature des clients.",
    transcription: [
      ["Karim B.", "0:00", "Yanis, c'est Karim. Côté piscine ça s'enfonce, il me faut deux plots de plus sinon les lambourdes vont bouger."],
      ["Yanis Dupré", "0:09", "D'accord, fais-moi une photo, je prépare l'avenant pour les Duret."],
      ["Karim B.", "0:15", "Je t'envoie ça."],
    ],
    suites: [
      { libelle: "Photo reçue et jointe", etat: "fait" },
      { libelle: "Avenant préparé : 2 plots × 225 € HT", etat: "fait", detail: "Avenants" },
      { libelle: "Faire signer l'avenant aux clients", etat: "cours" },
    ],
    journal: [
      { qui: "Yanis Dupré", quoi: "a pris l'appel", quand: q10 },
      { qui: "L'agent", quoi: "a repéré un travail hors devis et proposé l'avenant", quand: plus(q10, 3) },
    ],
  },
  {
    id: "apl-21", numero: "APL-21", titre: "Date de démarrage de l'extension", appelant: "Mme Rolland", telephone: "+590 690 55 23 18", qualite: "Cliente", connu: true,
    quand: q11, duree: "1 min 05", issue: "agent", etat: "fait", priorite: 3, motif: "Suivi de chantier", chantier_id: ROL, chantier_nom: "Maison Rolland — extension",
    resume: "Mme Rolland demande quand le chantier commence. L'agent a répondu depuis le planning : implantation et fouilles par Terrassement VRD Grande-Terre dans trois semaines, accès camion par le chemin de Montauban à dégager ce jour-là.",
    transcription: [
      ["Mme Rolland", "0:00", "Bonjour, c'est Mme Rolland. Vous commencez quand, chez nous ?"],
      ["Agent", "0:05", "Bonjour Mme Rolland. Le terrassement démarre dans trois semaines, le matin. Pouvez-vous dégager l'accès par le chemin de Montauban ce jour-là ?"],
      ["Mme Rolland", "0:15", "Oui, pas de souci."],
    ],
    suites: [{ libelle: "Réponse donnée depuis le planning", etat: "fait" }],
    journal: [{ qui: "L'agent", quoi: "a décroché et répondu depuis le planning", quand: q11 }],
  },
];

/* les chantiers cités, pour les liens (TIL n'a pas d'appel cette semaine) */
export const CHANTIERS_APPELS = [DUR, ROL, SCL, MAM, VEN, GAR, TIL];
