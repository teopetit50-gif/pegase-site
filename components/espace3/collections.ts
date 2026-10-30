import type { ConfigCollection } from "./Collection";

/* Les collections de l'équipe, d'après le menu d'Attio (Tasks, Notes,
   Calls, Companies, People). Une entrée ici = une page /espace3/<cle>. */
export const COLLECTIONS: Record<string, ConfigCollection> = {
  taches: {
    cle: "taches",
    titre: "Tâches",
    intro: "Ce qu'il reste à faire dans l'équipe, avec une échéance. Cochez une tâche quand elle est faite.",
    une: "une tâche",
    coche: true,
    champs: [
      { cle: "titre", libelle: "Tâche", requis: true },
      { cle: "echeance", libelle: "Échéance", type: "date" },
      { cle: "qui", libelle: "Pour qui" },
    ],
    vide: "Aucune tâche pour l'instant.",
  },
  notes: {
    cle: "notes",
    titre: "Notes",
    intro: "Comptes rendus, idées, consignes : ce qu'on veut retrouver plus tard.",
    une: "une note",
    champs: [
      { cle: "titre", libelle: "Titre", requis: true },
      { cle: "texte", libelle: "Note", type: "long" },
    ],
    vide: "Aucune note pour l'instant.",
  },
  appels: {
    cle: "appels",
    titre: "Appels",
    intro: "Le journal des appels : avec qui, quand, et ce qui a été dit.",
    une: "un appel",
    champs: [
      { cle: "avec", libelle: "Avec qui", requis: true },
      { cle: "date", libelle: "Date", type: "date" },
      { cle: "resume", libelle: "Ce qui a été dit", type: "long" },
    ],
    vide: "Aucun appel noté pour l'instant.",
  },
  entreprises: {
    cle: "entreprises",
    titre: "Entreprises",
    intro: "Vos clients, fournisseurs et partenaires, avec leurs coordonnées.",
    une: "une entreprise",
    champs: [
      { cle: "nom", libelle: "Nom", requis: true },
      { cle: "type", libelle: "Client, fournisseur, partenaire…" },
      { cle: "ville", libelle: "Commune" },
      { cle: "telephone", libelle: "Téléphone", type: "tel" },
    ],
    vide: "Aucune entreprise pour l'instant.",
  },
  contacts: {
    cle: "contacts",
    titre: "Contacts",
    intro: "Les personnes à qui vous parlez, et l'entreprise où elles travaillent.",
    une: "un contact",
    champs: [
      { cle: "nom", libelle: "Nom", requis: true },
      { cle: "entreprise", libelle: "Entreprise" },
      { cle: "email", libelle: "E-mail", type: "email" },
      { cle: "telephone", libelle: "Téléphone", type: "tel" },
    ],
    vide: "Aucun contact pour l'instant.",
  },
};

/* ══════════════════════════════════════════════════════════════════════
   30/10/2026 — les jeux d'exemple des collections tenues à la main
   (tâches, appels) : le monde de la démo, Groupe Soléa (fictif). Posés
   une seule fois sur l'appareil, en « Données d'exemple », tant que la
   clé n'a jamais été écrite (Collection.tsx, useAmorceExemples) ; ensuite
   ce sont des fiches comme les autres, à modifier ou supprimer.
   Les dates sont relatives au jour de la visite.
   ══════════════════════════════════════════════════════════════════════ */
type FicheExemple = { id: string; cree: string; fait?: boolean } & Record<string, unknown>;

const JOUR_MS = 86_400_000;
/** une date calendaire (AAAA-MM-JJ), à n jours d'aujourd'hui (heure locale) */
function jourDans(n: number): string {
  const d = new Date(Date.now() + n * JOUR_MS);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/** un instant, il y a n jours, à l'heure h */
function instant(n: number, h = 9): string {
  const d = new Date(Date.now() - n * JOUR_MS);
  d.setHours(h, 0, 0, 0);
  return d.toISOString();
}

/* les tâches de la direction du groupe — champs de taches/ListeTaches.tsx
   (statut, priorité 1 urgente … 4 basse, étiquettes séparées par des virgules) */
function tachesExemple(): FicheExemple[] {
  let num = 0;
  const t = (id: string, titre: string, qui: string, statut: string, priorite: number, echeance: number | null, etiquettes: string, description: string, cree: number): FicheExemple => ({
    id: `ex-t-${id}`,
    cree: instant(cree, 8),
    num: ++num,
    titre,
    qui,
    statut,
    priorite,
    ...(echeance === null ? {} : { echeance: jourDans(echeance) }),
    etiquettes,
    description,
    ...(statut === "fait" || statut === "annule" ? { fait: true } : {}),
  });
  return [
    t("banquier", "Appeler le banquier pour la ligne de crédit de Maison Soléa", "Vous", "todo", 1, 0, "Trésorerie, Banque",
      "Maison Soléa passe sous son plancher de trésorerie (250 000 €) le 12 novembre. Demander au Crédit Caraïbe Atlantique une hausse temporaire de la ligne avant de décider l'avance de 180 000 € du siège.", 3),
    t("codir", "Préparer le comité de direction de lundi", "Vous", "en_cours", 2, 3, "Comité de direction",
      "Ordre du jour : trésorerie de Maison Soléa, encours de Batimat Caraïbes, recul de Soléa Auto Guadeloupe, gardiennage des centres commerciaux.", 2),
    t("lamentin", "Relire le reporting de Soléa Market Lamentin", "Vous", "todo", 3, 1, "Reporting, Distribution",
      "Ventes et stock du mois pour la centrale d'achat. Vérifier l'écart de 37 500 € avec Soléa Import (conteneur en transit).", 1),
    t("gardiennage", "Dénoncer ou renégocier le gardiennage des centres commerciaux", "Patrick Bellay", "en_cours", 1, 2, "Contrats, Immobilier",
      "Sécurité Atlantique, 312 000 € sur trois ans (Soléa Immobilier). Reconduction tacite si la dénonciation ne part pas sous deux jours.", 4),
    t("avance", "Décider l'avance de 180 000 € du siège à Maison Soléa", "Hélène Laurent", "todo", 1, 5, "Trésorerie",
      "Après la réponse de la banque. Prévisionnel de trésorerie à 13 semaines à joindre.", 2),
    t("batimat", "Bloquer les commandes de Batimat Caraïbes au-delà du plafond du groupe", "Hélène Laurent", "en_cours", 2, 1, "Encours clients",
      "486 000 € d'encours sur Soléa Import, Soléa Pièces et Brico Soléa Guadeloupe, dont 118 000 € échus à plus de 60 jours. Plafond du groupe : 400 000 €.", 5),
    t("brico-mq", "Plan d'action sur l'attente en caisse du samedi — Brico Soléa Martinique", "Maëva Rosan", "todo", 2, 6, "Avis clients, Maison & bricolage",
      "La note Google du magasin est passée de 3,9 à 3,6. Les avis récents parlent de l'attente en caisse le samedi.", 6),
    t("portes-ouvertes", "Faire le point sur la campagne « Portes ouvertes SUV hybrides »", "Maëva Rosan", "todo", 3, 4, "Marketing, Automobile",
      "Soléa Auto Guadeloupe : 318 contacts inscrits à ce jour. Comparer avec l'objectif de la concession.", 7),
    t("atelier", "Relancer les 1 284 clients atelier inactifs de Soléa Auto Guadeloupe", "Maëva Rosan", "backlog", 3, null, "Marketing, Automobile",
      "Clients sans passage à l'atelier depuis 18 mois. Proposer un contrôle offert avant la saison des pluies.", 9),
    t("conseil", "Préparer les points pour le conseil d'administration", "Vous", "backlog", 3, 14, "Conseil",
      "Résultats à fin septembre par pôle, risques (encours, trésorerie de Maison Soléa), avance en compte courant à faire voter.", 8),
    t("budget-si", "Arbitrer les budgets informatiques 2027 des pôles", "Didier Darius", "todo", 3, 10, "Informatique",
      "Six pôles, dix-huit sociétés : priorités communes et projets propres à chaque pôle.", 10),
    t("transit", "Brancher la comptabilité de Soléa Transit (tenue au tableur)", "Didier Darius", "backlog", 4, null, "Informatique, Import & logistique",
      "Sa dernière balance a plus d'un mois : les comptes réciproques avec le siège ne se rapprochent pas.", 12),
    t("semestriels", "Signer les comptes consolidés semestriels", "Vous", "fait", 2, -12, "Comptes",
      "Remis au pool bancaire avec les covenants du crédit syndiqué.", 25),
  ];
}

/* les appels de la direction — champs de lin/FilAppels.tsx (priorité 4 urgente … 1 basse) */
function appelsExemple(): FicheExemple[] {
  const a = (id: string, avec: string, il: number, resume: string, priorite: number, extra: Record<string, unknown> = {}): FicheExemple => ({
    id: `ex-a-${id}`,
    cree: instant(il, 10),
    avec,
    date: jourDans(-il),
    resume,
    priorite,
    ...extra,
  });
  return [
    a("cca", "Olivier Marie-Sainte — Crédit Caraïbe Atlantique", 1,
      "Ligne de crédit de Maison Soléa. La banque étudie une hausse temporaire de 300 000 € jusqu'à fin janvier, sur la base du prévisionnel de trésorerie à 13 semaines. Dossier à envoyer avant vendredi.", 4, { suivi: jourDans(2) }),
    a("securite", "Corinne Théodose — Sécurité Atlantique", 1,
      "Gardiennage des trois centres commerciaux. Prête à baisser de 8 % si le contrat repasse à un an renouvelable. Demander une offre écrite avant la date limite de dénonciation.", 4, { suivi: jourDans(1) }),
    a("batimat", "Jean-Marc Célestine — Batimat Caraïbes", 2,
      "Encours de 486 000 € sur trois sociétés du groupe, dont 118 000 € échus à plus de 60 jours. Propose un échéancier sur trois mois ; attend le paiement d'un maître d'ouvrage public mi-novembre.", 3, { suivi: jourDans(5) }),
    a("lubin", "Ludovic Lubin — Transports Lubin", 4,
      "Demande une hausse de 4,5 % au 1er janvier sur les livraisons des magasins. Réponse après le regroupement des deux contrats du groupe.", 3, { suivi: jourDans(9) }),
    a("alizes", "Sandrine Bellance — Hôtel Les Alizés", 6,
      "Satisfaite des livraisons de Soléa Froid. Souhaite un tarif cadre du groupe pour 2027 (alimentaire, boissons, froid).", 2, { suivi: jourDans(12) }),
    a("banque-iles", "Nadège Ramassamy — Banque des Îles", 8,
      "Covenants du crédit syndiqué respectés au 30 septembre. La banque attend les comptes consolidés semestriels signés.", 2, { clos: instant(5, 16), fait: true }),
    a("ferly", "Thierry Ferly — Cabinet Ferly & Associés", 11,
      "Audit intérim du 17 au 28 novembre : le siège d'abord, puis Soléa Import et Soléa Market Jarry. Liste des pièces envoyée à Hélène Laurent.", 1, { clos: instant(10, 15), fait: true }),
  ];
}

export const EXEMPLES_COLLECTIONS: Record<string, () => FicheExemple[]> = {
  taches: tachesExemple,
  appels: appelsExemple,
};
