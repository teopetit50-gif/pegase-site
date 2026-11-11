/* ══════════════════════════════════════════════════════════════════════
   MON ESPACE — l'exemple (11/11/2026)

   Ce que Teo voit en « Données d'exemple » (et ce qui se voit sans
   session, en développement) : des clients et prospects d'Omega en
   Guadeloupe, un agenda de gérant, des conversations WhatsApp et une
   boîte mail. Personnes, entreprises, numéros et adresses FICTIFS
   (adresses en @example.com) ; dates relatives au jour de la visite.
   Rien ici n'est écrit en base : les gestes joués sur l'exemple restent
   en mémoire le temps de la page.
   ══════════════════════════════════════════════════════════════════════ */

import type { ClientTeo, ConversationWa, FilMail, MessageWa, RendezVous } from "@/lib/teo/types";

/* « il y a j jours (ou dans j jours), à h:m », en ISO */
function a(j: number, h = 9, m = 0): string {
  const x = new Date();
  x.setDate(x.getDate() + j);
  x.setHours(h, m, 0, 0);
  return x.toISOString();
}
/* le jour, en « AAAA-MM-JJ » local */
function jour(j: number): string {
  const x = new Date();
  x.setDate(x.getDate() + j);
  return `${x.getFullYear()}-${`${x.getMonth() + 1}`.padStart(2, "0")}-${`${x.getDate()}`.padStart(2, "0")}`;
}
const ko = (n: number) => Math.round(n * 1024);

/* ——— les clients et prospects ——— */
const c = (
  id: number,
  nom: string,
  entreprise: string,
  type: string,
  etape: string,
  x: Partial<Omit<ClientTeo, "echanges">> & { echanges?: [number, string, string][] },
): ClientTeo => ({
  id: String(id),
  nom: x.nom ?? nom,
  entreprise,
  role: x.role ?? "Gérant",
  type,
  etape,
  telephone: x.telephone ?? null,
  courriel: x.courriel ?? null,
  commune: x.commune ?? null,
  secteur: x.secteur ?? null,
  source: x.source ?? null,
  prochaine_action: x.prochaine_action ?? null,
  prochaine_date: x.prochaine_date ?? null,
  note: x.note ?? null,
  maj: a(x.echanges?.[0]?.[0] ?? -1),
  echanges: (x.echanges ?? []).map(([j, canal, resume], i) => ({ id: `${id}-${i}`, quand: a(j, 10 + i), canal, resume })),
});

export const CLIENTS_EXEMPLE: ClientTeo[] = [
  c(1, "Marc Rolland", "Rolland Bâtiment", "Client", "En réel", {
    role: "Gérant",
    telephone: "+590690110201",
    courriel: "m.rolland@example.com",
    commune: "Baie-Mahault",
    secteur: "BTP",
    source: "Recommandation",
    prochaine_action: "Bilan J30 : relire les avenants signés depuis l'installation",
    prochaine_date: jour(2),
    note: "DALIRO installé le mois dernier. Trois chantiers ouverts, deux conducteurs. Veut la dictée de devis sur le terrain.",
    echanges: [
      [-3, "WhatsApp", "A envoyé la photo d'un avenant signé sur place : « ça marche nickel »."],
      [-12, "Rendez-vous", "Installation de DALIRO au bureau, 2 h, les deux conducteurs présents."],
      [-28, "Appel", "Audit tenu en visio. Trois chantiers, des avenants jamais signés : DALIRO."],
    ],
  }),
  c(2, "Dr Hélène Saint-Clair", "Cabinet dentaire Saint-Clair", "Client", "Installé", {
    role: "Praticienne",
    telephone: "+590690110202",
    courriel: "cabinet.saintclair@example.com",
    commune: "Le Gosier",
    secteur: "Dentaire",
    source: "Pub",
    prochaine_action: "Appeler pour la première semaine de TIROMA : les créneaux du matin",
    prochaine_date: jour(0),
    note: "Deux fauteuils, une secrétaire à mi-temps. Les appels non pris le lundi matin étaient le sujet.",
    echanges: [
      [-6, "Rendez-vous", "Installation de TIROMA, agenda et créneaux posés avec la secrétaire."],
      [-20, "Appel", "Récap envoyé puis signé le soir même."],
    ],
  }),
  c(3, "Maître Julien Delmas", "Delmas Avocats", "Prospect", "Audit réservé", {
    role: "Associé",
    telephone: "+590690110203",
    courriel: "j.delmas@example.com",
    commune: "Pointe-à-Pitre",
    secteur: "Avocats",
    source: "Réseau",
    prochaine_action: "Audit en visio : préparer la démo TAMILA sur un dossier type",
    prochaine_date: jour(1),
    note: "Quatre collaborateurs. Les honoraires facturés en retard sont le point d'entrée.",
    echanges: [[-4, "E-mail", "A réservé l'audit depuis le site, lien Meet envoyé."]],
  }),
  c(4, "Sandrine Lambert", "Garage Lambert", "Prospect", "En conversation", {
    role: "Gérante",
    telephone: "+590690110204",
    courriel: "garage.lambert@example.com",
    commune: "Les Abymes",
    secteur: "Automobile",
    source: "Appel à froid",
    prochaine_action: "Rappeler : elle voulait en parler à son associé",
    prochaine_date: jour(-2),
    note: "Location de véhicules de courtoisie, amendes qui reviennent au garage : TAVARO.",
    echanges: [
      [-9, "Appel", "Quinze minutes : intéressée par les amendes et les contrats, demande un retour la semaine prochaine."],
      [-16, "Appel", "Premier appel, a demandé un mail de présentation."],
    ],
  }),
  c(5, "Patrick Garnier", "Garnier Toitures", "Prospect", "Récap envoyé", {
    telephone: "+590690110205",
    courriel: "p.garnier@example.com",
    commune: "Sainte-Anne",
    secteur: "BTP",
    source: "Recommandation",
    prochaine_action: "Relancer sur le récap : la question du prix de la deuxième année",
    prochaine_date: jour(-1),
    echanges: [
      [-5, "E-mail", "Récap de l'audit envoyé avec le devis DALIRO."],
      [-8, "Rendez-vous", "Audit tenu sur son chantier de Sainte-Anne."],
    ],
  }),
  c(6, "Agnès Morel", "Morel & Associés, architectes", "Prospect", "Audit tenu", {
    role: "Architecte associée",
    telephone: "+590690110206",
    courriel: "a.morel@example.com",
    commune: "Basse-Terre",
    secteur: "Architectes",
    source: "Réseau",
    prochaine_action: "Envoyer le récap LORANI (permis et courrier)",
    prochaine_date: jour(0),
    echanges: [[-1, "Rendez-vous", "Audit tenu à l'agence : les permis à suivre et le courrier de la mairie."]],
  }),
  c(7, "Groupe Caraïbes Distribution", "Groupe Caraïbes Distribution", "Prospect", "Contacté", {
    nom: "Éric Vanier",
    role: "Directeur général",
    telephone: "+590690110207",
    courriel: "e.vanier@example.com",
    commune: "Jarry",
    secteur: "Groupes",
    source: "Partenaire",
    prochaine_action: "Proposer un créneau d'audit pour les cinq sociétés",
    prochaine_date: jour(4),
    echanges: [[-7, "Message LinkedIn", "A répondu sur LinkedIn : « intéressé pour le groupe, pas avant la fin du mois »."]],
  }),
  c(8, "Nadia Bertin", "Atelier Bertin", "Client", "En réel", {
    role: "Gérante",
    telephone: "+590690110208",
    courriel: "contact.bertin@example.com",
    commune: "Petit-Bourg",
    secteur: "BTP",
    source: "Visite",
    prochaine_action: "Revue mensuelle : les relances CASHD et les factures FILED",
    prochaine_date: jour(9),
    note: "Première cliente. Quatre modules. Témoignage à filmer.",
    echanges: [[-15, "Visite", "Revue mensuelle à l'atelier : 4 impayés relancés, 2 réglés."]],
  }),
  c(9, "Boulangerie Ma Mie", "Boulangerie Ma Mie", "Prospect", "À contacter", {
    nom: "Léa Fontaine",
    role: "Gérante",
    telephone: "+590690110209",
    commune: "Le Moule",
    secteur: "Commerce",
    source: "Visite",
    prochaine_action: "Passer à la boulangerie avec la fiche REPUT (les avis Google)",
    prochaine_date: jour(3),
  }),
  c(10, "Dr Samuel Noël", "Clinique vétérinaire du Lamentin", "Prospect", "Perdu", {
    role: "Vétérinaire",
    telephone: "+590690110210",
    courriel: "s.noel@example.com",
    commune: "Lamentin",
    secteur: "Santé",
    source: "Pub",
    note: "A choisi un logiciel métier vétérinaire tout-en-un. Garder le contact pour les appels.",
    echanges: [[-11, "Appel", "« On part sur autre chose, merci pour le temps passé. »"]],
  }),
  c(11, "Christophe Hugon", "Hugon Location", "Client", "Signé", {
    telephone: "+590690110211",
    courriel: "c.hugon@example.com",
    commune: "Saint-François",
    secteur: "Location automobile",
    source: "Recommandation",
    prochaine_action: "Installer TAVARO : importer le parc (22 véhicules) et les contrats",
    prochaine_date: jour(6),
    echanges: [
      [-2, "E-mail", "Contrat signé, acompte réglé."],
      [-13, "Rendez-vous", "Audit tenu à l'agence de Saint-François."],
    ],
  }),
  c(12, "Isabelle Chéry", "Chéry Expertise comptable", "Partenaire", "Partenaire actif", {
    role: "Expert-comptable",
    telephone: "+590690110212",
    courriel: "i.chery@example.com",
    commune: "Pointe-à-Pitre",
    secteur: "Comptabilité",
    source: "Réseau",
    prochaine_action: "Déjeuner trimestriel : ses clients BTP à présenter",
    prochaine_date: jour(14),
    note: "Trois clients envoyés depuis janvier.",
    echanges: [[-30, "Rendez-vous", "Déjeuner : deux cabinets d'architectes et un garage à présenter."]],
  }),
  c(13, "Kévin Loiseau", "Loiseau Électricité", "Prospect", "En pause", {
    telephone: "+590690110213",
    commune: "Capesterre-Belle-Eau",
    secteur: "BTP",
    source: "Appel à froid",
    prochaine_action: "Reprendre contact après la saison",
    prochaine_date: jour(45),
    echanges: [[-22, "Appel", "« Trop de chantiers d'ici décembre, rappelez-moi en janvier. »"]],
  }),
  c(14, "Mathilde Pierre", "Pierre & Fils, carrelage", "Prospect", "Audit réservé", {
    telephone: "+590690110214",
    courriel: "m.pierre@example.com",
    commune: "Morne-à-l'Eau",
    secteur: "BTP",
    source: "Contenu",
    prochaine_action: "Audit au bureau : voir ses devis en cours",
    prochaine_date: jour(5),
    echanges: [[-2, "E-mail", "A réservé l'audit depuis l'article sur les avenants."]],
  }),
];

/* ——— l'agenda ——— */
const r = (id: string, titre: string, j: number, h: number, duree: number, x: Partial<RendezVous> = {}): RendezVous => {
  const debut = a(j, Math.floor(h), Math.round((h % 1) * 60));
  const d = new Date(debut);
  return {
    id,
    titre,
    debut,
    fin: new Date(d.getTime() + duree * 60_000).toISOString(),
    journee: false,
    lieu: null,
    description: null,
    visio: null,
    invites: [],
    statut: "confirme",
    lien: "https://calendar.google.com/calendar/",
    agenda: "Omega",
    ...x,
  };
};
const journee = (id: string, titre: string, j: number, nbJours: number, x: Partial<RendezVous> = {}): RendezVous => ({ ...r(id, titre, j, 0, 0, x), debut: jour(j), fin: jour(j + nbJours - 1), journee: true });
const meet = "https://meet.google.com/abc-defg-hij";

export const AGENDA_EXEMPLE: RendezVous[] = [
  r("rdv-01", "Audit Delmas Avocats", 1, 9, 60, { visio: meet, description: "Audit réservé depuis le site. Préparer la démo TAMILA sur un dossier type.", invites: [{ nom: "Julien Delmas", email: "j.delmas@example.com", reponse: "oui" }] }),
  r("rdv-02", "Appel Dr Saint-Clair : première semaine TIROMA", 0, 11, 30, { invites: [{ nom: "Hélène Saint-Clair", email: "cabinet.saintclair@example.com", reponse: "attente" }] }),
  r("rdv-03", "Bilan J30 Rolland Bâtiment", 2, 14, 90, { lieu: "Rolland Bâtiment, ZI de Jarry, Baie-Mahault", invites: [{ nom: "Marc Rolland", email: "m.rolland@example.com", reponse: "oui" }] }),
  r("rdv-04", "Audit Pierre & Fils", 5, 10, 60, { lieu: "Pierre & Fils, Morne-à-l'Eau", invites: [{ nom: "Mathilde Pierre", email: "m.pierre@example.com", reponse: "peut-etre" }] }),
  r("rdv-05", "Installation TAVARO chez Hugon Location", 6, 9, 180, { lieu: "Hugon Location, Saint-François", description: "Importer le parc (22 véhicules) et les contrats en cours. Prévoir la clé de l'API amendes.", invites: [{ nom: "Christophe Hugon", email: "c.hugon@example.com", reponse: "oui" }] }),
  r("rdv-06", "Point hebdo Omega", 0, 17, 45, { visio: meet, invites: [{ nom: "Associé", email: "associe@example.com", reponse: "oui" }] }),
  r("rdv-07", "Tournage témoignage Atelier Bertin", 9, 15, 120, { lieu: "Atelier Bertin, Petit-Bourg", statut: "provisoire", invites: [{ nom: "Nadia Bertin", email: "contact.bertin@example.com", reponse: "attente" }] }),
  r("rdv-08", "Déjeuner Isabelle Chéry", 14, 12.5, 90, { lieu: "Le Petit Pavois, Pointe-à-Pitre", invites: [{ nom: "Isabelle Chéry", email: "i.chery@example.com", reponse: "oui" }] }),
  r("rdv-09", "Audit Groupe Caraïbes Distribution", 11, 9.5, 90, { visio: meet, statut: "provisoire", invites: [{ nom: "Éric Vanier", email: "e.vanier@example.com", reponse: "attente" }, { nom: "DAF", email: "daf.gcd@example.com", reponse: "attente" }] }),
  journee("rdv-10", "Salon Bâtir Caraïbes", 20, 2, { lieu: "Parc des expositions, Baie-Mahault" }),
  r("rdv-11", "Passage Boulangerie Ma Mie (fiche REPUT)", 3, 8.5, 30, { lieu: "Le Moule" }),
  r("rdv-12", "Rappel Garage Lambert", -2, 16, 15, { invites: [{ nom: "Sandrine Lambert", email: "garage.lambert@example.com", reponse: "attente" }] }),
  r("rdv-13", "Audit Morel & Associés", -1, 10, 60, { lieu: "Agence Morel, Basse-Terre", invites: [{ nom: "Agnès Morel", email: "a.morel@example.com", reponse: "oui" }] }),
  r("rdv-14", "Installation TIROMA Cabinet Saint-Clair", -6, 14, 120, { lieu: "Le Gosier", invites: [{ nom: "Hélène Saint-Clair", email: "cabinet.saintclair@example.com", reponse: "oui" }] }),
  r("rdv-15", "Audit Garnier Toitures", -8, 9, 60, { lieu: "Chantier de Sainte-Anne", invites: [{ nom: "Patrick Garnier", email: "p.garnier@example.com", reponse: "oui" }] }),
  r("rdv-16", "Audit Clinique vétérinaire du Lamentin", -11, 11, 60, { visio: meet, statut: "annule", invites: [{ nom: "Samuel Noël", email: "s.noel@example.com", reponse: "non" }] }),
  r("rdv-17", "Installation DALIRO Rolland Bâtiment", -12, 9, 120, { lieu: "Baie-Mahault" }),
  r("rdv-18", "Point hebdo Omega", -7, 17, 45, { visio: meet }),
  r("rdv-19", "Point hebdo Omega", 7, 17, 45, { visio: meet }),
  r("rdv-20", "Revue mensuelle Atelier Bertin", 9, 10, 60, { lieu: "Petit-Bourg" }),
];

/* ——— les conversations WhatsApp ——— */
const w = (numero: string, nom: string, messages: [number, number, number, "recu" | "envoye", string, MessageWa["type"]?, MessageWa["statut"]?, boolean?][]): ConversationWa => ({
  numero,
  nom,
  messages: messages.map(([j, h, m, sens, texte, type, statut, lu], i) => ({
    id: `${numero}-${i}`,
    sens,
    type: type ?? "texte",
    texte,
    quand: a(j, h, m),
    lu: lu ?? sens === "envoye",
    statut: sens === "envoye" ? (statut ?? "lu") : null,
  })),
});

export const WHATSAPP_EXEMPLE: ConversationWa[] = [
  w("590690110201", "Marc Rolland", [
    [-3, 7, 42, "recu", "", "image", null, true],
    [-3, 7, 43, "recu", "L'avenant des Tilleuls signé sur place ce matin, ça marche nickel 👍", "texte", null, true],
    [-3, 8, 10, "envoye", "Parfait Marc. Il est rangé dans le chantier, la situation de fin de mois le reprend.", "texte", "lu"],
    [0, 8, 5, "recu", "Teo, pour jeudi on fait ça au bureau ou sur le chantier ?", "texte", null, false],
  ]),
  w("590690110204", "Sandrine Lambert", [
    [-9, 15, 30, "envoye", "Bonjour Sandrine, merci pour l'échange. Je vous rappelle la semaine prochaine comme convenu.", "texte", "lu"],
    [-9, 15, 48, "recu", "Merci, j'en parle à mon associé d'ici là.", "texte", null, true],
    [-1, 18, 2, "recu", "Bonjour, mon associé est OK pour une démo. Vous auriez un créneau mardi ?", "texte", null, false],
  ]),
  w("590690110206", "Agnès Morel", [
    [-1, 12, 15, "recu", "Merci pour ce matin, c'était clair. J'attends le récap pour en parler à mes associés.", "texte", null, true],
    [-1, 12, 40, "envoye", "Avec plaisir Agnès. Le récap part ce soir, avec la partie permis et courrier.", "texte", "remis"],
  ]),
  w("590690110205", "Patrick Garnier", [
    [-5, 17, 20, "envoye", "Bonsoir Patrick, le récap de l'audit et le devis sont partis par mail. Je reste dispo pour vos questions.", "texte", "lu"],
    [-4, 7, 55, "recu", "", "audio", null, true],
    [-4, 8, 30, "envoye", "Bien reçu votre vocal : la deuxième année est au même prix, rien ne bouge sans votre accord.", "texte", "lu"],
  ]),
  w("590690110211", "Christophe Hugon", [
    [-2, 10, 5, "recu", "", "document", null, true],
    [-2, 10, 6, "recu", "Contrat signé ci-joint, l'acompte part aujourd'hui.", "texte", null, true],
    [-2, 10, 20, "envoye", "Merci Christophe, bienvenue ! On installe TAVARO la semaine prochaine, je vous envoie l'invitation.", "texte", "lu"],
    [0, 9, 12, "recu", "Pour l'installation, il faut que je prépare quoi côté parc ?", "texte", null, false],
  ]),
  w("590690110208", "Nadia Bertin", [
    [-15, 16, 0, "envoye", "Nadia, super revue ce matin : 4 relances parties, 2 réglées dans la journée.", "texte", "lu"],
    [-15, 16, 30, "recu", "Oui ! Et pour le témoignage vidéo, on dit le 20 ?", "texte", null, true],
    [-15, 16, 45, "envoye", "Je le note en provisoire, je confirme la semaine prochaine.", "texte", "lu"],
  ]),
  w("590690110203", "Julien Delmas", [
    [-4, 9, 30, "recu", "Bonjour, j'ai réservé l'audit depuis votre site, le lien Meet est bien arrivé. À demain.", "texte", null, true],
    [-4, 9, 50, "envoye", "Bonjour Maître, c'est noté. À demain 9 h.", "texte", "lu"],
  ]),
];

/* ——— la boîte mail ——— */
type Mex = { de: [string, string]; objet: string; j: number; h: number; texte: string; pieces?: [string, number][]; nonLu?: boolean; important?: boolean; reponse?: [number, number, string] };
const m = (i: number, x: Mex): FilMail => {
  const recu = a(x.j, x.h);
  const messages = [
    { id: `m-${i}-1`, de_nom: x.de[0], de_adresse: x.de[1], a: "teo@example.com", cc: "", quand: recu, texte: x.texte, pieces: (x.pieces ?? []).map(([nom, t]) => ({ nom, taille: ko(t) })), moi: false },
    ...(x.reponse ? [{ id: `m-${i}-2`, de_nom: "Teo", de_adresse: "teo@example.com", a: x.de[1], cc: "", quand: a(x.reponse[0], x.reponse[1]), texte: x.reponse[2], pieces: [], moi: true }] : []),
  ];
  const dernier = messages[messages.length - 1];
  return {
    id: `fil-${i}`,
    objet: x.objet,
    de_nom: x.de[0],
    de_adresse: x.de[1],
    apercu: x.texte.replace(/\s+/g, " ").trim().slice(0, 160),
    recu_le: dernier.quand,
    non_lu: x.nonLu ?? false,
    important: x.important ?? false,
    nb_messages: messages.length,
    pieces: messages.flatMap((y) => y.pieces),
    repondu: !!x.reponse,
    messages,
  };
};

export const MAILS_EXEMPLE: FilMail[] = [
  m(1, { de: ["Julien Delmas", "j.delmas@example.com"], objet: "Audit de demain : nos dossiers en cours", j: 0, h: 8, nonLu: true, important: true, texte: "Bonjour,\n\nPour l'audit de demain matin, je vous joins la liste anonymisée de nos dossiers en cours et le détail des honoraires en attente de facturation (hélas, le gros du sujet).\n\nMes deux collaborateurs assisteront à la visio.\n\nBien à vous,\nJulien Delmas", pieces: [["dossiers-en-cours.xlsx", 84], ["honoraires-attente.pdf", 312]] }),
  m(2, { de: ["Mathilde Pierre", "m.pierre@example.com"], objet: "Réservation d'audit confirmée", j: -2, h: 9, nonLu: true, texte: "Bonjour,\n\nJ'ai réservé un audit depuis votre article sur les avenants. On est quatre au bureau, les devis partent souvent en retard et les travaux supplémentaires ne sont presque jamais signés.\n\nÀ bientôt,\nMathilde Pierre" }),
  m(3, { de: ["Éric Vanier", "e.vanier@example.com"], objet: "Groupe Caraïbes Distribution — audit pour les cinq sociétés", j: -1, h: 16, nonLu: true, texte: "Bonjour Teo,\n\nSuite à notre échange sur LinkedIn : nous aurions un créneau la semaine du 23 pour un audit groupe. Notre DAF sera présent. Pouvez-vous nous proposer deux horaires ?\n\nCordialement,\nÉric Vanier" }),
  m(4, { de: ["Christophe Hugon", "c.hugon@example.com"], objet: "Contrat signé et acompte", j: -2, h: 10, texte: "Bonjour,\n\nVoici le contrat signé. L'acompte est parti ce matin.\n\nPour l'installation, je peux vous préparer la liste du parc en tableur si ça aide.\n\nChristophe", pieces: [["contrat-omega-hugon-signe.pdf", 1480]], reponse: [-2, 11, "Merci Christophe, bienvenue chez Omega !\n\nOui, un tableur avec immatriculation, modèle et date de mise en circulation nous fera gagner une heure le jour de l'installation. Je vous envoie l'invitation pour jeudi prochain.\n\nTeo"] }),
  m(5, { de: ["Patrick Garnier", "p.garnier@example.com"], objet: "Re: Récap de l'audit et devis DALIRO", j: -4, h: 7, nonLu: true, texte: "Bonjour,\n\nMerci pour le récap, c'est clair. Une question : le prix de la deuxième année est-il le même ? J'ai été échaudé par un logiciel qui doublait au renouvellement.\n\nPatrick Garnier" }),
  m(6, { de: ["Agnès Morel", "a.morel@example.com"], objet: "Merci pour ce matin", j: -1, h: 12, texte: "Bonjour Teo,\n\nMerci pour l'audit de ce matin. Mes associés attendent le récap pour décider : la partie permis et le courrier de la mairie les intéressent particulièrement.\n\nAgnès Morel" }),
  m(7, { de: ["Nadia Bertin", "contact.bertin@example.com"], objet: "Témoignage vidéo : le 20 ?", j: -15, h: 16, texte: "Bonjour Teo,\n\nPour le témoignage vidéo, le 20 après-midi me va. L'atelier sera calme.\n\nNadia", reponse: [-15, 17, "Parfait Nadia, je le note en provisoire et je confirme la semaine prochaine avec le vidéaste.\n\nTeo"] }),
  m(8, { de: ["Service client Vercel", "no-reply@example.com"], objet: "Votre facture de novembre", j: -3, h: 2, texte: "Bonjour,\n\nVotre facture du mois est disponible dans votre espace. Montant : 20,00 €.\n\nL'équipe", pieces: [["facture-2026-11.pdf", 42]] }),
  m(9, { de: ["Isabelle Chéry", "i.chery@example.com"], objet: "Déjeuner du 25 et deux cabinets à vous présenter", j: -6, h: 18, texte: "Bonjour Teo,\n\nJe confirme le déjeuner du 25. J'aurai deux cabinets d'architectes à vous présenter, et peut-être un garage.\n\nÀ bientôt,\nIsabelle" }),
  m(10, { de: ["Hélène Saint-Clair", "cabinet.saintclair@example.com"], objet: "TIROMA : les créneaux du matin", j: -1, h: 19, nonLu: true, texte: "Bonsoir,\n\nPremière semaine avec TIROMA : les appels du lundi matin sont bien pris, mais ma secrétaire voudrait décaler les créneaux de 8 h à 8 h 30. On en parle à notre appel de demain ?\n\nHélène Saint-Clair" }),
  m(11, { de: ["Marc Rolland", "m.rolland@example.com"], objet: "Avenant Tilleuls signé", j: -3, h: 8, texte: "Teo,\n\nL'avenant des Tilleuls est signé, photo en pièce jointe. On voit ça jeudi au bilan.\n\nMarc", pieces: [["avenant-tilleuls-signe.jpg", 2210]], reponse: [-3, 8, "Reçu Marc, il est rangé dans le chantier. À jeudi.\n\nTeo"] }),
  m(12, { de: ["Mairie de Baie-Mahault", "urbanisme@example.com"], objet: "Salon Bâtir Caraïbes : votre stand", j: -10, h: 14, texte: "Madame, Monsieur,\n\nNous confirmons votre stand au salon Bâtir Caraïbes (parc des expositions). Le montage se fait la veille à partir de 14 h.\n\nLe service événementiel" }),
];
