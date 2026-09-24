/* ══════════════════════════════════════════════════════════════════════
   Daliro (BTP) — les textes de la page /secteurs/btp

   COPIÉ le 24/09/2026 à 12 h 01 (heure de la Guadeloupe) de
   `OMEGA/chantieros-site/src/contenu/textes.ts`, au mot près. Le site
   source est encore travaillé par une autre session : c'est l'état du
   disque à cette heure-là, pas une version figée du produit. Le reste des
   textes (fonctionnalités, chiffres, métiers, appel) vit dans le balisage
   des composants, généré côté source par `outils/assembler.py`.

   CE QUI CHANGE PAR RAPPORT À LA SOURCE (règle 6 du rapatriement)
   · `CONTACT.audit` visait `https://omegaai.fr/reserver` : on est sur
     omegaai.fr, et la prise de rendez-vous du site est /reserver-un-audit.
   · `CONTACT.demo` ouvrait un client mail (`mailto:` « Démonstration
     Daliro »). Consigne de Teo du 24/09 : tous les boutons d'action mènent
     à /reserver-un-audit. La démonstration se fait pendant l'audit, sur
     les chantiers du visiteur : le libellé « Voir la démo » reste juste.
   · `CONTACT.connexion` et tout le bloc `NAV` sont partis avec l'entête du
     site source : c'est l'entête d'Omega qui sert.
   · Dans `LU`, `var(--font-tiempos)` (Newsreader, la serif des titres du
     site source) devient `var(--font-jakarta)`, la police de titre du site
     (règle 5). `var(--font-geist-mono)` existe ici et vaut la mono du site.
   · Chemins d'images : `/glyphes/…` → `/secteurs-btp/glyphes/…`.
   · Les activités de « Daliro » pointaient sur le glyphe `robot.svg` : le
     héros y affiche désormais le signe officiel (Heros.tsx, `SigneDaliro`),
     leur `glyphe` est vide et robot.svg n'est pas copié.
   ══════════════════════════════════════════════════════════════════════ */
export const MARQUE = "Daliro";
export const CONTACT = {
  audit: "/reserver-un-audit",
  demo: "/reserver-un-audit",
};

export const HERO = {
  pastille: "Le cerveau de chantier",
  titre: "Les travaux en plus, signés avant d'être faits",
  texte:
    "Vos équipes envoient déjà photos et vocaux. Daliro y repère le hors-devis, confirme vos sous-traitants à J-2 et cale les livraisons sur le planning.",
  audit: "Réserver un audit",
  demo: "Voir la démo",
  signature: "Conçu par",
};

/* Les quatre fiches de la pile : même forme que les contacts de Vertex, un chantier par onglet.
   Données d'exemple (aucun client réel). */
export type Activite = { type: "meeting" | "event" | "call"; actor: string; action: string; target: string; time: string; glyphe: string; success?: boolean };
export type Chantier = {
  id: string; accentClass: string; name: string; role: string; equipe: string; location: string;
  company: string; companyLocation: string; lastInteraction: string; glyphe: string; fil: string; summary: string;
  upcoming: { title: string; dateLine: string; day: string; date: string };
  outreach: { step: number; label: string; total: number };
  activities: Activite[];
};

export const LIBELLES_FICHE = {
  ecrire: "Écrire au client",
  note: "Ajouter une note", fusion: "Rattacher au devis", tache: "Créer une tâche", plus: "Plus",
  essentiel: "L'essentiel", resume: "Résumé", fil: "Fil du chantier", avenir: "À venir", devis: "Devis",
  etape: "Étape", planning: "Planning", activite: "Activité", details: "Détails",
  nom: "Chantier", nature: "Nature", equipe: "Équipe", adresse: "Adresse", client: "Client", dernier: "Dernier envoi",
};

export const CHANTIERS: Chantier[] = [
  {
    id: "travaux", accentClass: "bg-orange-500", name: "Maison Lefèvre", role: "Extension 38 m² · Rennes",
    equipe: "Équipe Karim", location: "Rennes (35)", company: "Particulier", companyLocation: "Devis n° 2025-114 · 18 400 € HT",
    lastInteraction: "il y a 3 h", glyphe: "/secteurs-btp/glyphes/truelle.svg", fil: "4 photos · 2 vocaux",
    summary: "Karim a photographié une reprise de dalle absente du devis. Avenant chiffré à 576 € HT, prêt à signer sur place demain matin.",
    upcoming: { title: "Signature de l'avenant", dateLine: "Jeu. 4 déc., 8 h 00", day: "JEU", date: "04" },
    outreach: { step: 3, label: "Avenant chiffré", total: 9 },
    activities: [
      { type: "meeting", actor: "Karim B.", action: "a envoyé", target: "4 photos", time: "il y a 3 h", glyphe: "/secteurs-btp/glyphes/casque.svg" },
      { type: "event", actor: "Daliro", action: "a repéré", target: "un hors-devis", time: "il y a 3 h", glyphe: "" },
      { type: "call", actor: "Julie M.", action: "a validé", target: "le prix unitaire", time: "il y a 1 h", glyphe: "/secteurs-btp/glyphes/cle.svg", success: true },
    ],
  },
  {
    id: "sous-traitants", accentClass: "bg-emerald-500", name: "Groupe scolaire Jules-Ferry", role: "Lot gros œuvre · Angers",
    equipe: "Équipe Nicolas", location: "Angers (49)", company: "Commune", companyLocation: "Marché public · lot 02",
    lastInteraction: "il y a 12 h", glyphe: "/secteurs-btp/glyphes/casque.svg", fil: "5 confirmations sur 6",
    summary: "Le plaquiste n'a pas confirmé son passage de lundi. Deux remplaçants sont libres ; l'ordre des lots est reproposé pour ne pas bloquer l'électricien.",
    upcoming: { title: "Passage du plaquiste", dateLine: "Lun. 8 déc., 7 h 30", day: "LUN", date: "08" },
    outreach: { step: 5, label: "Doublages", total: 9 },
    activities: [
      { type: "event", actor: "Daliro", action: "a demandé", target: "6 confirmations", time: "il y a 12 h", glyphe: "" },
      { type: "event", actor: "Plâtrerie D.", action: "n'a pas", target: "répondu", time: "il y a 2 h", glyphe: "/secteurs-btp/glyphes/rouleau.svg" },
      { type: "call", actor: "Électricité R.", action: "a confirmé", target: "mardi", time: "il y a 1 h", glyphe: "/secteurs-btp/glyphes/eclair.svg", success: true },
    ],
  },
  {
    id: "appro", accentClass: "bg-blue-500", name: "Résidence Les Tilleuls", role: "18 logements · Nantes",
    equipe: "Équipe Samir", location: "Nantes (44)", company: "Promoteur", companyLocation: "Bâtiment B · 9 logements",
    lastInteraction: "il y a 1 j", glyphe: "/secteurs-btp/glyphes/camion.svg", fil: "3 bons de livraison",
    summary: "Les menuiseries du bâtiment B arrivent mardi, la pose commence jeudi. Livraison proposée mercredi pour ne pas stocker trois jours sur site.",
    upcoming: { title: "Livraison des menuiseries", dateLine: "Mer. 3 déc., 10 h 00", day: "MER", date: "03" },
    outreach: { step: 1, label: "Menuiseries", total: 9 },
    activities: [
      { type: "event", actor: "Daliro", action: "a lu", target: "le planning", time: "il y a 1 j", glyphe: "" },
      { type: "meeting", actor: "Samir K.", action: "a photographié", target: "la zone de stockage", time: "il y a 1 j", glyphe: "/secteurs-btp/glyphes/casque.svg" },
      { type: "call", actor: "Fournisseur", action: "a accepté", target: "le décalage", time: "il y a 4 h", glyphe: "/secteurs-btp/glyphes/camion.svg", success: true },
    ],
  },
  {
    id: "avancement", accentClass: "bg-rose-500", name: "Bureaux Vauban", role: "Réhabilitation · Lille",
    equipe: "Équipe Hugo", location: "Lille (59)", company: "Foncière", companyLocation: "R+2 · plateau de 640 m²",
    lastInteraction: "il y a 6 h", glyphe: "/secteurs-btp/glyphes/marteau.svg", fil: "22 photos cette semaine",
    summary: "Les photos de la semaine montrent le cloisonnement du R+2 fini aux trois quarts. La situation de fin de mois peut partir sur cette base.",
    upcoming: { title: "Situation n° 4", dateLine: "Ven. 28 nov., 17 h 00", day: "VEN", date: "28" },
    outreach: { step: 2, label: "Cloisonnement", total: 9 },
    activities: [
      { type: "meeting", actor: "Hugo P.", action: "a envoyé", target: "22 photos", time: "il y a 6 h", glyphe: "/secteurs-btp/glyphes/casque.svg" },
      { type: "event", actor: "Daliro", action: "a estimé", target: "l'avancement", time: "il y a 5 h", glyphe: "" },
      { type: "call", actor: "Claire V.", action: "a relu", target: "la situation", time: "il y a 2 h", glyphe: "/secteurs-btp/glyphes/cle.svg", success: true },
    ],
  },
];

export const ONGLETS: Record<string, string> = {
  travaux: "Travaux en plus",
  "sous-traitants": "Sous-traitants",
  appro: "Approvisionnement",
  avancement: "Avancement",
};

/* Bandeau sous le héros : ce que Daliro lit, en mots-marques typographiques (aucun logo de tiers). */
export const LU = {
  aria: "Ce que Daliro lit",
  items: [
    { name: "Photos", fontFamily: "var(--font-jakarta)", fontWeight: 600, fontSize: 20 },
    { name: "Vocaux", fontFamily: "var(--font-geist-mono)", fontWeight: 500, fontSize: 15, uppercase: true, letterSpacing: "0.12em" },
    { name: "WhatsApp", fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em" },
    { name: "Devis", fontFamily: "var(--font-jakarta)", fontWeight: 500, fontSize: 20, italic: true },
    { name: "Planning", fontWeight: 600, fontSize: 17, uppercase: true, letterSpacing: "0.06em" },
    { name: "Bons de livraison", fontWeight: 500, fontSize: 16, letterSpacing: "-0.01em" },
    { name: "Situations", fontFamily: "var(--font-geist-mono)", fontWeight: 600, fontSize: 15 },
    { name: "Avenants", fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: 20 },
    { name: "PV", fontWeight: 800, fontSize: 20, letterSpacing: "0.08em" },
    { name: "SMS", fontFamily: "var(--font-geist-mono)", fontWeight: 500, fontSize: 16, uppercase: true, letterSpacing: "0.14em" },
  ],
};

/* Formules : aucun prix public (le prix s'estime, l'audit le fixe). */
export type Valeur = boolean | string;
export const FORMULES = {
  titre: "Trois formules, un prix fixé à l'audit",
  sous: "Le prix dépend du nombre de chantiers ouverts. On le fixe ensemble, après avoir vu les vôtres.",
  comparer: ["Comparer", "les formules"],
  prix: "Prix fixé à l'audit,",
  prixSous: "selon vos chantiers ouverts",
  conseille: "Conseillé",
  plans: [
    { id: "demarrage", name: "Démarrage", cta: "Réserver un audit" },
    { id: "chantiers", name: "Chantiers", cta: "Réserver un audit", popular: true },
    { id: "entreprise", name: "Entreprise", cta: "Réserver un audit" },
  ],
  groupes: [
    { title: "Travaux en plus", description: "Repérés dans ce que vos équipes envoient", features: [
      { name: "Lecture des photos et vocaux", description: "WhatsApp, SMS ou mail : ce que les équipes envoient déjà.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Avenants chiffrés sur vos prix", description: "Prix unitaires repris de vos devis.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Signature sur place", description: "Le client signe sur le téléphone du chef d'équipe.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Chantiers ouverts", description: "Nombre de chantiers suivis en même temps.", values: { demarrage: "5", chantiers: "20", entreprise: "Sur mesure" } },
      { name: "Relance des avenants non signés", description: "Un avenant oublié revient dans la liste du matin.", values: { demarrage: false, chantiers: true, entreprise: true } },
    ] },
    { title: "Sous-traitants", description: "Confirmés avant de se déplacer", features: [
      { name: "Confirmation à J-2", description: "Chaque intervenant confirme son passage deux jours avant.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Remplaçants proposés", description: "Tirés de votre annuaire quand quelqu'un ne répond pas.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Ordre des lots reproposé", description: "Quand un lot glisse, les suivants sont recalés.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Alerte météo", description: "Pluie ou gel annoncés : la semaine est reproposée.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Annuaire des sous-traitants", description: "Vos intervenants, leurs lots et leurs disponibilités.", values: { demarrage: true, chantiers: true, entreprise: true } },
    ] },
    { title: "Approvisionnement", description: "Livré le bon jour", features: [
      { name: "Liste cadencée depuis le devis", description: "Les quantités viennent du devis, les dates du planning.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Livraisons calées sur la pose", description: "Ni trois jours de stockage, ni une équipe qui attend.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Suivi des retours", description: "Ce qui reste sur le chantier et doit repartir.", values: { demarrage: false, chantiers: false, entreprise: true } },
      { name: "Bons de livraison rapprochés", description: "Chaque bon comparé à la commande.", values: { demarrage: false, chantiers: false, entreprise: true } },
      { name: "Avancement lu dans les photos", description: "La base de la situation de fin de mois.", values: { demarrage: false, chantiers: false, entreprise: true } },
    ] },
    { title: "Équipe et accès", description: "Le bureau et le terrain", features: [
      { name: "Comptes bureau", description: "Conducteurs de travaux, assistantes, gérant.", values: { demarrage: "2", chantiers: "5", entreprise: "Sur mesure" } },
      { name: "Chefs d'équipe", description: "Aucune application à installer : ils écrivent comme d'habitude.", values: { demarrage: "Sans limite", chantiers: "Sans limite", entreprise: "Sans limite" } },
      { name: "Rôles et droits", description: "Qui valide un avenant, qui voit les prix.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Journal des validations", description: "Qui a validé quoi, et quand.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Données dans l'Union européenne", description: "Hébergement de vos données dans l'Union européenne.", values: { demarrage: true, chantiers: true, entreprise: true } },
    ] },
    { title: "Accompagnement", description: "Quand quelque chose coince", features: [
      { name: "Installation par Omega", description: "Nous branchons vos devis, votre planning et vos équipes.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Réponse en français", description: "Par des gens qui connaissent vos chantiers.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Point mensuel", description: "Ce qui a été repéré, ce qui a été facturé.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Formation des chefs d'équipe", description: "Sur le chantier, pas en salle.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Interlocuteur dédié", description: "Une seule personne qui suit votre compte.", values: { demarrage: false, chantiers: false, entreprise: true } },
    ] },
  ],
};

export const FAQ = {
  titre: "Questions fréquentes.",
  sous: "Ce que les patrons du bâtiment demandent avant l'audit.",
  aria: "Catégories de questions",
  categories: [
    { id: "general", label: "Général", items: [
      { question: "Qu'est-ce que Daliro ?", answer: "Une couche qui lit ce que vos équipes envoient déjà (photos, vocaux, messages), le compare à vos devis et à votre planning, et vous rend chaque matin ce qui est à facturer, à confirmer et à livrer. Ce n'est pas un logiciel de gestion de plus." },
      { question: "Faut-il changer de logiciel de devis ?", answer: "Non. Daliro lit vos devis là où ils sont, depuis votre logiciel ou un export. Il ne remplace ni votre outil de devis, ni votre planning." },
      { question: "Mes chefs d'équipe doivent-ils installer une application ?", answer: "Non. Ils continuent d'envoyer photos et vocaux comme aujourd'hui. C'est Daliro qui s'adapte à leur façon de travailler." },
      { question: "Qu'est-ce que Daliro ne fait pas ?", answer: "Il ne signe rien à votre place et n'envoie aucun avenant sans votre accord. Il ne fait ni la paie, ni la comptabilité, ni vos devis." },
    ] },
    { id: "chantier", label: "Chantier", items: [
      { question: "Comment un travail en plus est-il repéré ?", answer: "Ce qui est photographié ou dit est comparé au devis. Ce qui n'y figure pas remonte avec la photo, le lot concerné et un prix tiré de vos prix unitaires. Vous validez avant tout envoi." },
      { question: "Comment les sous-traitants sont-ils confirmés ?", answer: "Deux jours avant leur passage, chacun reçoit un message qui lui demande de confirmer. Sans réponse, vous êtes prévenu le soir même, avec les remplaçants de votre annuaire." },
      { question: "Et quand la météo change ?", answer: "Quand la pluie ou le gel est annoncé sur un chantier, l'ordre des interventions de la semaine est reproposé. C'est vous qui choisissez." },
      { question: "Comment l'approvisionnement est-il cadencé ?", answer: "Les quantités viennent du devis, les dates du planning. Chaque livraison est proposée pour arriver quand la pose commence, pas trois jours avant." },
    ] },
    { id: "formules", label: "Formules", items: [
      { question: "Combien ça coûte ?", answer: "Le prix dépend du nombre de chantiers ouverts et de ce que vous voulez brancher. Il est fixé pendant l'audit, sur vos chantiers réels, avant tout engagement." },
      { question: "Comment se passe l'audit ?", answer: "Nous regardons vos devis, votre planning et les échanges d'un ou deux chantiers en cours. Vous repartez avec ce que nous y avons trouvé, que vous alliez plus loin ou non." },
      { question: "Où sont mes données ?", answer: "Hébergées dans l'Union européenne. Daliro lit vos fichiers ; il n'en modifie aucun." },
      { question: "Qui est derrière Daliro ?", answer: "Omega, une entreprise française qui installe des automatisations dans les PME. Daliro est un nom provisoire." },
    ] },
  ],
};
