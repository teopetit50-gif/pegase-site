/* ══════════════════════════════════════════════════════════════════════
   Ostelo (hôtellerie) — les textes de la page /secteurs/hotellerie
   (04/11/2026)

   Teo, le 04/11, après un appel avec un hôtelier : « je veux une page
   spécialisée hôtel », copiée de la page BTP (elle-même copie de Vertex),
   puis : « tu dois pas vendre un regroupement de systèmes mais un logiciel
   lui-même nouveau, comme Daliro ou Tavaro : trouve un nom », « mets des
   features de ouf pour les hôteliers ».

   OSTELO — NOM DE TRAVAIL, proposé le 04/11 (de l'italien « ostello »,
   l'auberge ; trois syllabes en -o comme Daliro, Tavaro, Varelo). Signe
   PROVISOIRE : public/logos/ostelo-mark.png, monogramme « O » évidé dans un
   carré arrondi à 28 %, au format des logos de Teo (masque alpha, RVB
   noir), comme l'était celui de Tiroma avant son logo officiel. À remplacer
   par le vrai logo : aucun code à toucher, le nom de fichier suffit.

   LE LOGICIEL N'EST PAS ENCORE CONSTRUIT : cette page en est la vitrine.
   Ses six fonctions — demandes à toute heure, chambres libérées
   reproposées, propositions avant l'arrivée, extras rapprochés de la note,
   avis, anciens clients et séminaires — sont la promesse à tenir. Mêmes
   règles que les autres pages métier : aucun prix, aucun chiffre de
   traction, aucun client réel (les fiches sont des exemples).
   ══════════════════════════════════════════════════════════════════════ */
export const MARQUE = "Ostelo";
export const CONTACT = {
  audit: "/reserver-un-audit",
  demo: "/reserver-un-audit",
};

export const HERO = {
  pastille: "Le logiciel des hôtels indépendants et des groupes",
  titre: "Plus une seule réservation ne vous échappe, même à 2 h du matin",
  texte:
    "Ostelo répond à chaque client dans la minute, dans sa langue. Il remet en vente chaque chambre annulée, propose le surclassement avant l'arrivée et rattrape chaque extra oublié sur la note. Votre réception garde la main ; votre chiffre ne s'échappe plus.",
  audit: "Réserver un audit",
  demo: "Voir la démo",
  signature: "Conçu par",
};

/* Les quatre fiches de la pile : même forme que les contacts de Vertex, un client par onglet.
   Données d'exemple (aucun client réel). */
export type Activite = { type: "meeting" | "event" | "call"; actor: string; action: string; target: string; time: string; glyphe: string; success?: boolean };
export type Fiche = {
  id: string; accentClass: string; name: string; role: string; equipe: string; location: string;
  company: string; companyLocation: string; lastInteraction: string; glyphe: string; fil: string; summary: string;
  upcoming: { title: string; dateLine: string; day: string; date: string };
  outreach: { step: number; label: string; total: number };
  activities: Activite[];
};

export const LIBELLES_FICHE = {
  ecrire: "Écrire au client",
  note: "Ajouter une note", fusion: "Rattacher au séjour", tache: "Créer une tâche", plus: "Plus",
  essentiel: "L'essentiel", resume: "Résumé", fil: "Fil des messages", avenir: "À venir", devis: "Séjour",
  etape: "Étape", planning: "Suivi", activite: "Activité", details: "Détails",
  nom: "Client", nature: "Séjour", equipe: "Service", adresse: "Provenance", client: "Réservation", dernier: "Dernier message",
};

const G = "/secteurs-hotellerie/glyphes";

export const FICHES: Fiche[] = [
  {
    id: "demandes", accentClass: "bg-orange-500", name: "Emma Fischer", role: "Arrivée tardive · chambre double",
    equipe: "Réception", location: "Munich (Allemagne)", company: "Réservation directe", companyLocation: "2 nuits · petit-déjeuner inclus",
    lastInteraction: "il y a 3 h", glyphe: `${G}/valise.svg`, fil: "3 messages · en allemand",
    summary: "Emma a écrit en allemand à 23 h 40 pour une arrivée après minuit. Ostelo lui a répondu en allemand avec la marche à suivre et a prévenu l'équipe de nuit.",
    upcoming: { title: "Arrivée", dateLine: "Ven. 4 déc., 0 h 30", day: "VEN", date: "04" },
    outreach: { step: 3, label: "Réponse envoyée", total: 9 },
    activities: [
      { type: "meeting", actor: "Emma F.", action: "a écrit", target: "en allemand", time: "il y a 3 h", glyphe: `${G}/valise.svg` },
      { type: "event", actor: "Ostelo", action: "a répondu", target: "dans la minute", time: "il y a 3 h", glyphe: "" },
      { type: "call", actor: "Équipe de nuit", action: "a pris", target: "l'arrivée tardive", time: "il y a 1 h", glyphe: `${G}/cle.svg`, success: true },
    ],
  },
  {
    id: "liberees", accentClass: "bg-emerald-500", name: "Chambre 14", role: "Annulée à 17 h 52 · nuit de samedi",
    equipe: "Réception", location: "Vue jardin · 2 personnes", company: "Liste d'attente", companyLocation: "3 demandes pour ces dates",
    lastInteraction: "il y a 40 min", glyphe: `${G}/lit.svg`, fil: "Reprise en 38 min",
    summary: "La chambre 14 a été annulée à 17 h 52. Ostelo l'a proposée aux trois clients qui avaient demandé samedi sans obtenir de place ; la famille Martin l'a prise à 18 h 30.",
    upcoming: { title: "Arrivée Martin", dateLine: "Sam. 5 déc., 16 h 00", day: "SAM", date: "05" },
    outreach: { step: 6, label: "Chambre reprise", total: 9 },
    activities: [
      { type: "event", actor: "Ostelo", action: "a reproposé", target: "la chambre 14", time: "il y a 1 h", glyphe: "" },
      { type: "meeting", actor: "Claire V.", action: "a validé", target: "les propositions", time: "il y a 1 h", glyphe: `${G}/cle.svg` },
      { type: "call", actor: "Famille Martin", action: "a réservé", target: "en direct", time: "il y a 40 min", glyphe: `${G}/lit.svg`, success: true },
    ],
  },
  {
    id: "arrivee", accentClass: "bg-blue-500", name: "Thomas Lemaire", role: "Arrivée vendredi · chambre classique",
    equipe: "Réception", location: "Paris (75)", company: "Séjour d'affaires", companyLocation: "1 nuit · sans petit-déjeuner",
    lastInteraction: "il y a 5 h", glyphe: `${G}/etoile.svg`, fil: "Surclassement accepté",
    summary: "Deux jours avant son arrivée, Thomas a donné son heure d'arrivée et accepté le surclassement en chambre supérieure et le petit-déjeuner, aux prix que vous avez fixés.",
    upcoming: { title: "Arrivée", dateLine: "Ven. 4 déc., 19 h 00", day: "VEN", date: "04" },
    outreach: { step: 4, label: "Avant l'arrivée", total: 9 },
    activities: [
      { type: "event", actor: "Ostelo", action: "a proposé", target: "le surclassement", time: "il y a 1 j", glyphe: "" },
      { type: "meeting", actor: "Thomas L.", action: "a accepté", target: "2 propositions", time: "il y a 5 h", glyphe: `${G}/etoile.svg` },
      { type: "call", actor: "Julie M.", action: "a mis à jour", target: "la réservation", time: "il y a 4 h", glyphe: `${G}/cle.svg`, success: true },
    ],
  },
  {
    id: "avis", accentClass: "bg-rose-500", name: "Famille Moreau", role: "Départ ce matin · chambres 21 et 22",
    equipe: "Réception", location: "Lyon (69)", company: "Séjour loisirs", companyLocation: "3 nuits · 2 chambres",
    lastInteraction: "il y a 2 h", glyphe: `${G}/personnes.svg`, fil: "Note vérifiée",
    summary: "Avant le départ, Ostelo a relevé un parking de trois nuits absent de la note ; la réception l'a ajouté. La demande d'avis partira demain à 10 h.",
    upcoming: { title: "Demande d'avis", dateLine: "Jeu. 3 déc., 10 h 00", day: "JEU", date: "03" },
    outreach: { step: 7, label: "Après le départ", total: 9 },
    activities: [
      { type: "event", actor: "Ostelo", action: "a relevé", target: "un extra oublié", time: "il y a 3 h", glyphe: "" },
      { type: "meeting", actor: "Julie M.", action: "a ajouté", target: "le parking", time: "il y a 2 h", glyphe: `${G}/cle.svg` },
      { type: "call", actor: "M. Moreau", action: "a réglé", target: "sa note", time: "il y a 2 h", glyphe: `${G}/personnes.svg`, success: true },
    ],
  },
];

export const ONGLETS: Record<string, string> = {
  demandes: "Demandes",
  liberees: "Chambres libérées",
  arrivee: "Avant l'arrivée",
  avis: "Départ et avis",
};

/* Bandeau sous le héros : ce qu'Ostelo lit, en mots-marques typographiques (aucun logo de tiers). */
export const LU = {
  aria: "Ce qu'Ostelo lit",
  items: [
    { name: "Mails", fontFamily: "var(--font-jakarta)", fontWeight: 600, fontSize: 20 },
    { name: "WhatsApp", fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em" },
    { name: "Planning", fontFamily: "var(--font-geist-mono)", fontWeight: 500, fontSize: 15, uppercase: true, letterSpacing: "0.12em" },
    { name: "Avis", fontFamily: "var(--font-jakarta)", fontWeight: 500, fontSize: 20, italic: true },
    { name: "Réservations", fontWeight: 600, fontSize: 17, uppercase: true, letterSpacing: "0.06em" },
    { name: "Annulations", fontWeight: 500, fontSize: 16, letterSpacing: "-0.01em" },
    { name: "Notes", fontFamily: "var(--font-geist-mono)", fontWeight: 600, fontSize: 15 },
    { name: "Séminaires", fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: 20 },
    { name: "Extras", fontWeight: 800, fontSize: 19, letterSpacing: "0.04em" },
    { name: "SMS", fontFamily: "var(--font-geist-mono)", fontWeight: 500, fontSize: 16, uppercase: true, letterSpacing: "0.14em" },
  ],
};

/* Formules : aucun prix public (le prix s'estime, l'audit le fixe). */
export type Valeur = boolean | string;
export const FORMULES = {
  titre: "Un prix à la taille de votre hôtel, fixé après l'audit",
  sous: "Les trois formules se distinguent par le nombre de chambres, de canaux et de fonctions ouvertes. Le prix est fixé pendant l'audit, une fois vos réservations et vos outils examinés.",
  comparer: ["Comparer", "les formules"],
  prix: "Prix fixé à l'audit,",
  prixSous: "selon vos chambres et vos canaux",
  conseille: "Conseillé",
  plans: [
    { id: "demarrage", name: "Essentiel", cta: "Réserver un audit" },
    { id: "chantiers", name: "Hôtel", cta: "Réserver un audit" },
    { id: "entreprise", name: "Groupe", cta: "Réserver un audit" },
  ],
  groupes: [
    { title: "Demandes des clients", description: "Une réponse à toute heure, dans la langue du client.", features: [
      { name: "Réponse à toute heure", description: "Les mails et les WhatsApp reçoivent leur réponse sur leur canal, de jour comme de nuit.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Dans la langue du client", description: "Le client écrit en allemand, en anglais ou en espagnol : il reçoit sa réponse dans sa langue.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Disponibilités lues en direct", description: "Ostelo lit votre planning des chambres en lecture seule et propose les dates libres.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Transfert à la réception", description: "Une exception, une réclamation, un cas particulier : tout ce qui sort de vos règles part à un humain.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Demandes de séminaire qualifiées", description: "Date, participants, salle, budget : la demande arrive complète au commercial.", values: { demarrage: false, chantiers: true, entreprise: true } },
    ] },
    { title: "Chambres libérées", description: "Une annulation n'est plus une nuit perdue.", features: [
      { name: "Liste d'attente automatique", description: "Chaque demande refusée faute de place entre dans la liste d'attente de ses dates.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Chambre reproposée dans l'heure", description: "À chaque annulation, la chambre est proposée aux clients en attente pour ces dates.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Premier qui accepte", description: "La chambre va au premier client qui confirme ; les autres sont prévenus.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Non-présentations signalées", description: "Un client non arrivé à l'heure prévue est signalé à la réception avant la nuit.", values: { demarrage: false, chantiers: true, entreprise: true } },
    ] },
    { title: "Avant l'arrivée", description: "Ce qui reste à vendre est proposé à ceux qui arrivent.", features: [
      { name: "Heure d'arrivée demandée", description: "Deux jours avant, chaque client donne son heure d'arrivée et ses demandes particulières.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Surclassement proposé", description: "La catégorie supérieure, quand elle est libre, est proposée au prix que vous avez fixé.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Petit-déjeuner, parking, départ tardif", description: "Chaque extra disponible est proposé avant l'arrivée, aux prix de votre grille.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Demandes particulières transmises", description: "Lit bébé, anniversaire, allergie : la demande arrive au bon service avant le client.", values: { demarrage: true, chantiers: true, entreprise: true } },
    ] },
    { title: "Départ et avis", description: "Une note complète, puis un avis au bon moment.", features: [
      { name: "Extras rapprochés de la note", description: "Parking, petit-déjeuner, minibar, départ tardif : ce qui a été consommé est comparé à la note avant le départ.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Demande d'avis après le départ", description: "Chaque client parti reçoit un message court qui mène à la page d'avis de votre choix.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Réponses aux avis rédigées", description: "Chaque avis reçoit une réponse rédigée que vous relisez avant publication.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Problèmes récurrents relevés", description: "Le bruit de la 12, la douche de la 7 : ce que les avis répètent remonte chaque mois.", values: { demarrage: false, chantiers: false, entreprise: true } },
    ] },
    { title: "Anciens clients et séminaires", description: "Le chiffre qui dort dans votre fichier.", features: [
      { name: "Anciens clients recontactés", description: "Les clients venus l'an dernier reçoivent un message qui rappelle leur séjour et réservent en direct.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Clients des plateformes ramenés en direct", description: "Un client venu par une plateforme est invité à revenir en direct, sans commission.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Acomptes et factures relancés", description: "Séminaires, groupes, entreprises : la relance part à l'échéance, graduée selon le retard.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Liste des participants suivie", description: "La liste des chambres d'un groupe est réclamée, complétée et rapprochée de la réservation.", values: { demarrage: false, chantiers: false, entreprise: true } },
    ] },
    { title: "Équipe et accès", description: "La direction et la réception voient les mêmes informations.", features: [
      { name: "Comptes", description: "Accès pour la direction, la réception et le service commercial.", values: { demarrage: "2", chantiers: "5", entreprise: "Sur mesure" } },
      { name: "Le point du matin", description: "Chaque matin : arrivées, chambres libérées, demandes de la nuit, extras à vérifier.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Rien ne part sans votre accord", description: "Vous décidez ce qui part seul et ce qui attend votre validation.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Plusieurs établissements", description: "Un seul tableau pour tous vos hôtels, une page par établissement.", values: { demarrage: false, chantiers: false, entreprise: true } },
      { name: "Données dans l'Union européenne", description: "Vos données sont hébergées dans l'Union européenne.", values: { demarrage: true, chantiers: true, entreprise: true } },
    ] },
    { title: "Accompagnement", description: "Omega met Ostelo en service et suit votre compte.", features: [
      { name: "Installation par Omega", description: "Nous raccordons votre logiciel de réservation, vos boîtes mail et votre WhatsApp.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Assistance en français", description: "Une équipe qui connaît le fonctionnement d'une réception répond à vos questions.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Point mensuel", description: "Chaque mois, nous chiffrons avec vous les chambres reprises et les extras récupérés.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Formation de la réception", description: "La formation se fait dans votre hôtel, avec votre équipe.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Interlocuteur dédié", description: "Une seule personne suit votre compte du début à la fin.", values: { demarrage: false, chantiers: false, entreprise: true } },
    ] },
  ],
};

export const FAQ = {
  titre: "Questions fréquentes",
  sous: "Les questions que posent les hôteliers avant l'audit.",
  aria: "Catégories de questions",
  categories: [
    { id: "general", label: "Général", items: [
      { question: "Qu'est-ce qu'Ostelo ?", answer: "Ostelo est un logiciel pour les hôtels qui lit vos réservations, vos annulations et les messages de vos clients, puis agit à votre place là où une réception débordée laisse filer du chiffre : demandes sans réponse, chambres annulées jamais revendues, extras oubliés sur la note, avis jamais demandés." },
      { question: "Faut-il changer de logiciel de réservation ?", answer: "Non. Ostelo lit votre logiciel de réservation en lecture seule, ou ses exports, et travaille à côté. Il ne remplace ni votre logiciel, ni votre gestionnaire de canaux, ni votre caisse." },
      { question: "J'ai déjà des outils d'IA et des automatisations. Est-ce utile ?", answer: "Ostelo ne vient pas en ajouter une couche : il relie ce que vous avez déjà et prend en charge ce qu'aucun de vos outils ne fait. L'audit commence par la liste de ce qui tourne chez vous, et dit aussi ce qu'il ne faut pas toucher." },
      { question: "Qu'est-ce qu'Ostelo ne fait pas ?", answer: "Ostelo n'invente aucun prix et n'accorde aucune exception : il applique votre grille et vos règles, et passe le reste à la réception. Il ne modifie jamais une réservation sans validation." },
    ] },
    { id: "hotel", label: "Hôtel", items: [
      { question: "Comment Ostelo répond-il aux clients ?", answer: "À partir de vos disponibilités, lues en direct, et d'une base d'informations que votre équipe a validée : accès, horaires, parking, petit-déjeuner, services. Il répond dans la langue du client ; ce qui n'y figure pas n'est jamais inventé et part à la réception." },
      { question: "Comment une chambre annulée est-elle revendue ?", answer: "Chaque demande refusée faute de place entre dans une liste d'attente. Quand une chambre se libère pour ces dates, Ostelo la propose aux clients en attente ; le premier qui confirme la prend, et la réception valide." },
      { question: "Que propose-t-il avant l'arrivée ?", answer: "Deux jours avant, chaque client donne son heure d'arrivée et ses demandes particulières. Ostelo lui propose ce qui reste à vendre ce jour-là (surclassement, petit-déjeuner, parking, départ tardif), aux prix que vous avez fixés." },
      { question: "Comment les extras oubliés sont-ils repérés ?", answer: "Avant chaque départ, Ostelo compare ce qui a été demandé et consommé pendant le séjour (parking, petit-déjeuner, minibar, départ tardif) avec la note. Un écart remonte à la réception avant que le client ne règle." },
      { question: "Et si un client ne veut plus recevoir de message ?", answer: "Chaque message permet de ne plus en recevoir. La demande d'arrêt est définitive et vaut sur tous les canaux." },
    ] },
    { id: "formules", label: "Formules", items: [
      { question: "Quel est le prix ?", answer: "Le prix dépend du nombre de chambres, des canaux suivis et des fonctions retenues. Il est fixé pendant l'audit, sur vos réservations réelles, avant tout engagement." },
      { question: "Comment se passe l'audit ?", answer: "Nous examinons un mois de vos demandes, de vos annulations et de vos notes. Vous repartez avec ce que nous y avons relevé : demandes restées sans réponse, chambres non revendues, extras absents des notes, que vous poursuiviez ou non." },
      { question: "Où sont hébergées les données ?", answer: "Vos données sont hébergées dans l'Union européenne. Ostelo lit votre logiciel de réservation sans jamais rien y modifier sans validation." },
      { question: "Qui édite Ostelo ?", answer: "Ostelo est conçu et développé en France par Omega, qui déploie des systèmes d'automatisation dans les entreprises et les groupes." },
    ] },
  ],
};
