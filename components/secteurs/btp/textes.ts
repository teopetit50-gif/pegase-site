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
  pastille: "Entreprises du bâtiment",
  titre: "Les travaux supplémentaires se perdent entre le chantier et la facture",
  texte:
    "Daliro repère chaque ouvrage hors devis dans les photos et les vocaux de vos équipes, le chiffre sur vos prix unitaires et prépare l'avenant, que le client signe avant l'exécution. Il confirme aussi vos sous-traitants deux jours avant leur passage.",
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
    summary: "Karim a photographié une reprise de dalle absente du devis. L'avenant, chiffré à 576 € HT, est prêt à signer sur place demain matin.",
    upcoming: { title: "Signature de l'avenant", dateLine: "Jeu. 4 déc., 8 h 00", day: "JEU", date: "04" },
    outreach: { step: 3, label: "Avenant chiffré", total: 9 },
    activities: [
      { type: "meeting", actor: "Karim B.", action: "a envoyé", target: "4 photos", time: "il y a 3 h", glyphe: "/secteurs-btp/glyphes/casque.svg" },
      { type: "event", actor: "Daliro", action: "a repéré", target: "un travail non prévu", time: "il y a 3 h", glyphe: "" },
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
    summary: "Les menuiseries du bâtiment B arrivent mardi, deux jours avant la pose. La livraison est proposée mercredi pour limiter le stockage sur site.",
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
    summary: "Les photos de la semaine montrent le cloisonnement du R+2 achevé aux trois quarts. La situation de travaux de fin de mois peut être établie sur cette base.",
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
  travaux: "Avenants",
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
  titre: "Le prix dépend du nombre de chantiers que vous suivez",
  sous: "Les trois formules se distinguent par le nombre de chantiers suivis et les fonctions ouvertes. Le prix est fixé pendant l'audit, une fois vos chantiers en cours examinés.",
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
    { title: "Travaux supplémentaires", description: "Daliro les repère dans ce que vos équipes envoient.", features: [
      { name: "Lecture des photos et vocaux", description: "Daliro lit ce que vos équipes envoient déjà par WhatsApp, SMS ou courriel.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Avenants chiffrés sur vos prix", description: "Chaque avenant est chiffré avec les prix unitaires de vos devis.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Signature sur place", description: "Le client signe sur le téléphone du chef d'équipe.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Chantiers ouverts", description: "Nombre de chantiers suivis en même temps.", values: { demarrage: "5", chantiers: "20", entreprise: "Sur mesure" } },
      { name: "Relance des avenants non signés", description: "Un avenant non signé reste dans la liste du matin jusqu'à sa signature.", values: { demarrage: false, chantiers: true, entreprise: true } },
    ] },
    { title: "Sous-traitants", description: "Ils confirment leur passage avant de se déplacer.", features: [
      { name: "Confirmation à J-2", description: "Chaque intervenant confirme son passage deux jours avant.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Remplaçants proposés", description: "Quand un intervenant ne répond pas, Daliro propose des remplaçants tirés de votre annuaire.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Ordre des lots recalé", description: "Quand un lot prend du retard, Daliro recale les lots suivants.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Alerte météo", description: "Quand de la pluie ou du gel est annoncé, Daliro propose un nouvel ordre d'intervention pour la semaine.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Annuaire des sous-traitants", description: "L'annuaire réunit vos intervenants, leurs lots et leurs disponibilités.", values: { demarrage: true, chantiers: true, entreprise: true } },
    ] },
    { title: "Approvisionnement", description: "Chaque livraison arrive le jour où elle sert.", features: [
      { name: "Liste cadencée depuis le devis", description: "Daliro reprend les quantités du devis et les dates du planning.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Livraisons calées sur la pose", description: "Chaque livraison est proposée pour le début de la pose, ce qui limite le stockage sur site.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Suivi des retours", description: "Daliro suit le matériel qui reste sur le chantier et doit repartir.", values: { demarrage: false, chantiers: false, entreprise: true } },
      { name: "Bons de livraison rapprochés", description: "Chaque bon de livraison est comparé à la commande.", values: { demarrage: false, chantiers: false, entreprise: true } },
      { name: "Avancement lu dans les photos", description: "Les photos de la semaine servent de base à la situation de fin de mois.", values: { demarrage: false, chantiers: false, entreprise: true } },
    ] },
    { title: "Équipe et accès", description: "Le bureau et le terrain travaillent sur les mêmes informations.", features: [
      { name: "Comptes bureau", description: "Accès pour les conducteurs de travaux, les assistants et la direction.", values: { demarrage: "2", chantiers: "5", entreprise: "Sur mesure" } },
      { name: "Chefs d'équipe", description: "Ils n'installent aucune application et écrivent comme d'habitude.", values: { demarrage: "Sans limite", chantiers: "Sans limite", entreprise: "Sans limite" } },
      { name: "Rôles et droits", description: "Vous décidez qui valide un avenant et qui voit les prix.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Journal des validations", description: "Le journal garde la trace de chaque validation, avec son auteur et son heure.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Données dans l'Union européenne", description: "Vos données sont hébergées dans l'Union européenne.", values: { demarrage: true, chantiers: true, entreprise: true } },
    ] },
    { title: "Accompagnement", description: "Omega met Daliro en service et suit votre compte.", features: [
      { name: "Installation par Omega", description: "Nous raccordons vos devis, votre planning et les messages de vos équipes.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Assistance en français", description: "Une équipe qui connaît le fonctionnement d'un chantier répond à vos questions.", values: { demarrage: true, chantiers: true, entreprise: true } },
      { name: "Point mensuel", description: "Chaque mois, nous rapprochons les travaux repérés des travaux facturés.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Formation des chefs d'équipe", description: "La formation se fait sur le chantier, avec vos équipes.", values: { demarrage: false, chantiers: true, entreprise: true } },
      { name: "Interlocuteur dédié", description: "Une seule personne suit votre compte du début à la fin.", values: { demarrage: false, chantiers: false, entreprise: true } },
    ] },
  ],
};

export const FAQ = {
  titre: "Questions fréquentes",
  sous: "Les questions que posent les dirigeants d'entreprises du bâtiment avant l'audit.",
  aria: "Catégories de questions",
  categories: [
    { id: "general", label: "Général", items: [
      { question: "Qu'est-ce que Daliro ?", answer: "Daliro est un logiciel qui lit ce que vos équipes envoient déjà (photos, vocaux, messages) et le compare à vos marchés et à votre planning. Avant le départ sur chantier, vous savez ce qui est à facturer, à confirmer et à livrer, sans avoir changé de logiciel de gestion." },
      { question: "Faut-il changer de logiciel de devis ?", answer: "Non. Daliro lit vos devis là où ils sont, depuis votre logiciel ou un export. Il ne remplace ni votre outil de devis, ni votre planning." },
      { question: "Les chefs d'équipe doivent-ils installer une application ?", answer: "Non. Ils continuent d'envoyer leurs photos et leurs vocaux comme aujourd'hui, et Daliro lit ces messages là où ils arrivent : WhatsApp, SMS ou courriel." },
      { question: "Qu'est-ce que Daliro ne fait pas ?", answer: "Daliro ne signe rien à votre place et n'envoie aucun avenant sans votre accord. La paie, la comptabilité et l'établissement des devis restent dans vos outils actuels." },
    ] },
    { id: "chantier", label: "Chantier", items: [
      { question: "Comment un travail supplémentaire est-il repéré ?", answer: "Daliro compare chaque photo et chaque vocal au marché signé. Un ouvrage qui n'y figure pas remonte avec la photo, le lot concerné et un prix calculé sur vos prix unitaires, puis vous le validez avant tout envoi." },
      { question: "Pourquoi faire signer l'avenant avant les travaux ?", answer: "Dans un marché à forfait, l'article 1793 du Code civil exclut toute augmentation de prix si les changements n'ont pas été autorisés par écrit et leur prix convenu avec le maître d'ouvrage. Un travail supplémentaire exécuté sans avenant signé se défend donc mal au moment du décompte." },
      { question: "Comment les sous-traitants sont-ils confirmés ?", answer: "Deux jours avant son passage, chaque sous-traitant reçoit une demande de confirmation. S'il ne répond pas, vous êtes prévenu le soir même, avec les remplaçants disponibles dans votre annuaire." },
      { question: "Que se passe-t-il quand la météo change ?", answer: "Quand de la pluie ou du gel est annoncé sur un chantier, Daliro propose un nouvel ordre d'intervention pour la semaine. Le conducteur de travaux le valide ou le modifie." },
      { question: "Comment l'approvisionnement est-il cadencé ?", answer: "Daliro reprend les quantités du devis et les dates du planning. Chaque livraison est proposée pour le début de la pose, ce qui limite le stockage sur site." },
    ] },
    { id: "formules", label: "Formules", items: [
      { question: "Quel est le prix ?", answer: "Le prix dépend du nombre de chantiers ouverts et des fonctions retenues. Il est fixé pendant l'audit, sur vos chantiers réels, avant tout engagement." },
      { question: "Comment se passe l'audit ?", answer: "Nous examinons les devis, le planning et les échanges d'un ou deux chantiers en cours. Vous repartez avec ce que nous y avons relevé, que vous poursuiviez ou non." },
      { question: "Où sont hébergées les données ?", answer: "Vos données sont hébergées dans l'Union européenne. Daliro lit vos fichiers sans jamais les modifier." },
      { question: "Qui édite Daliro ?", answer: "Daliro est conçu et développé en France par Omega, qui déploie des systèmes d'automatisation dans les entreprises et les groupes." },
    ] },
  ],
};
