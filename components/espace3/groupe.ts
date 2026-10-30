/* ══════════════════════════════════════════════════════════════════════
   /espace3 — les chiffres du groupe fictif (30/10/2026), pour la vue d'ensemble, le point du matin et l'utilisation

   Un groupe fictif, « Groupe Soléa » : six pôles, dix-huit sociétés, quatre
   territoires. Aucun groupe réel n'est nommé ni décrit. Les montants sont
   en milliers d'euros (k€) sauf mention contraire, les échéances en jours
   à partir d'aujourd'hui : rien ne dépend de l'horloge du serveur.

   Deux postes lisent ces données : le CEO (le groupe entier) et la
   direction marketing (les enseignes, les clients, les campagnes).
   ══════════════════════════════════════════════════════════════════════ */

export const GROUPE = { nom: "Groupe Soléa", sigle: "S", societes: 18, salaries: 2140 };

export type Territoire = "Guadeloupe" | "Martinique" | "Guyane" | "Hexagone";
export type Etat = "recu" | "retard" | "manquant";
export type Deploiement = "actif" | "pilote" | "non";

export type Pole = { cle: string; nom: string; couleur: string };

export const POLES: Pole[] = [
  { cle: "distribution", nom: "Distribution", couleur: "#3f82cf" },
  { cle: "auto", nom: "Automobile", couleur: "#3ecf8e" },
  { cle: "maison", nom: "Maison & bricolage", couleur: "#db8e00" },
  { cle: "import", nom: "Import & logistique", couleur: "#a46ede" },
  { cle: "immo", nom: "Immobilier commercial", couleur: "#e54d2e" },
  { cle: "services", nom: "Services & siège", couleur: "#8f8f8f" },
];

export type Societe = {
  id: string;
  nom: string;
  pole: string;
  territoire: Territoire;
  activite: string;
  effectif: number;
  /* ventes de la semaine hors intragroupe, k€ */
  ventes: number;
  vsS1: number;
  vsN1: number;
  /* atteinte de l'objectif cumulé, en % */
  objectif: number;
  resultat: number;
  tresorerie: number;
  plancher: number;
  echeances30: number;
  encours: number;
  echu90: number;
  aPayer: number;
  reporting: Etat;
  systemes: Record<CleSysteme, Deploiement>;
  sources: number;
  fraicheur: string;
};

export type CleSysteme = "filed" | "cashd" | "offload" | "reput" | "varelo";

export const SYSTEMES: { cle: CleSysteme; nom: string; role: string }[] = [
  { cle: "varelo", nom: "VARELO", role: "Le groupe sur une page, le point du matin" },
  { cle: "filed", nom: "FILED", role: "Factures fournisseurs lues, contrôlées, transmises" },
  { cle: "cashd", nom: "CASHD", role: "Encours clients suivis et relancés" },
  { cle: "offload", nom: "OFFLOAD", role: "Clients inactifs repérés et relancés" },
  { cle: "reput", nom: "REPUT", role: "Demandes entrantes traitées à toute heure" },
];

const s = (d: Partial<Record<CleSysteme, Deploiement>>): Record<CleSysteme, Deploiement> => ({ varelo: "actif", filed: "non", cashd: "non", offload: "non", reput: "non", ...d });

export const SOCIETES: Societe[] = [
  { id: "sm-jarry", nom: "Soléa Market Jarry", pole: "distribution", territoire: "Guadeloupe", activite: "Hypermarché", effectif: 214, ventes: 1284, vsS1: 3.1, vsN1: 5.4, objectif: 101, resultat: 2140, tresorerie: 3820, plancher: 1500, echeances30: 2960, encours: 312, echu90: 18, aPayer: 2410, reporting: "recu", systemes: s({ filed: "actif", cashd: "actif", offload: "actif", reput: "actif" }), sources: 7, fraicheur: "6 h 02" },
  { id: "sm-destreland", nom: "Soléa Market Destreland", pole: "distribution", territoire: "Guadeloupe", activite: "Supermarché", effectif: 142, ventes: 742, vsS1: -1.8, vsN1: 2.2, objectif: 97, resultat: 980, tresorerie: 1460, plancher: 900, echeances30: 1610, encours: 168, echu90: 9, aPayer: 1320, reporting: "recu", systemes: s({ filed: "actif", cashd: "actif", reput: "actif" }), sources: 6, fraicheur: "6 h 02" },
  { id: "sm-lamentin", nom: "Soléa Market Lamentin", pole: "distribution", territoire: "Martinique", activite: "Hypermarché", effectif: 198, ventes: 1106, vsS1: 1.2, vsN1: -2.6, objectif: 93, resultat: 1210, tresorerie: 2140, plancher: 1400, echeances30: 2380, encours: 274, echu90: 41, aPayer: 2050, reporting: "retard", systemes: s({ filed: "actif", cashd: "pilote", reput: "actif" }), sources: 7, fraicheur: "6 h 05" },
  { id: "sm-cayenne", nom: "Soléa Market Cayenne", pole: "distribution", territoire: "Guyane", activite: "Supermarché", effectif: 96, ventes: 521, vsS1: 6.4, vsN1: 9.8, objectif: 108, resultat: 640, tresorerie: 980, plancher: 600, echeances30: 1090, encours: 87, echu90: 4, aPayer: 860, reporting: "recu", systemes: s({ filed: "pilote", reput: "pilote" }), sources: 5, fraicheur: "6 h 11" },
  { id: "proxi", nom: "Proxi Soléa (12 magasins)", pole: "distribution", territoire: "Guadeloupe", activite: "Réseau de proximité", effectif: 131, ventes: 618, vsS1: 0.4, vsN1: 1.1, objectif: 99, resultat: 410, tresorerie: 540, plancher: 500, echeances30: 820, encours: 22, echu90: 0, aPayer: 690, reporting: "recu", systemes: s({ filed: "actif" }), sources: 13, fraicheur: "6 h 02" },

  { id: "auto-gp", nom: "Soléa Auto Guadeloupe", pole: "auto", territoire: "Guadeloupe", activite: "Concession", effectif: 88, ventes: 1420, vsS1: -6.2, vsN1: -11.4, objectif: 86, resultat: 760, tresorerie: 1240, plancher: 1200, echeances30: 2210, encours: 1180, echu90: 162, aPayer: 1940, reporting: "recu", systemes: s({ filed: "actif", cashd: "actif", offload: "actif", reput: "actif" }), sources: 5, fraicheur: "6 h 08" },
  { id: "auto-mq", nom: "Soléa Auto Martinique", pole: "auto", territoire: "Martinique", activite: "Concession", effectif: 71, ventes: 1035, vsS1: 2.9, vsN1: 4.1, objectif: 102, resultat: 690, tresorerie: 1380, plancher: 1000, echeances30: 1540, encours: 820, echu90: 64, aPayer: 1410, reporting: "recu", systemes: s({ filed: "actif", cashd: "actif", offload: "pilote" }), sources: 5, fraicheur: "6 h 08" },
  { id: "location", nom: "Soléa Location", pole: "auto", territoire: "Guadeloupe", activite: "Location courte durée", effectif: 46, ventes: 284, vsS1: 8.6, vsN1: 12.3, objectif: 111, resultat: 390, tresorerie: 610, plancher: 400, echeances30: 470, encours: 96, echu90: 12, aPayer: 380, reporting: "recu", systemes: s({ cashd: "actif", reput: "actif" }), sources: 4, fraicheur: "5 h 58" },
  { id: "pieces", nom: "Soléa Pièces", pole: "auto", territoire: "Guadeloupe", activite: "Pièces détachées", effectif: 39, ventes: 196, vsS1: -0.9, vsN1: 3.4, objectif: 98, resultat: 180, tresorerie: 310, plancher: 250, echeances30: 290, encours: 344, echu90: 58, aPayer: 260, reporting: "manquant", systemes: s({ cashd: "pilote" }), sources: 3, fraicheur: "hier 22 h 40" },

  { id: "brico-gp", nom: "Brico Soléa Guadeloupe", pole: "maison", territoire: "Guadeloupe", activite: "Bricolage", effectif: 112, ventes: 498, vsS1: 4.4, vsN1: 6.7, objectif: 104, resultat: 520, tresorerie: 870, plancher: 600, echeances30: 940, encours: 142, echu90: 11, aPayer: 810, reporting: "recu", systemes: s({ filed: "actif", offload: "actif", reput: "actif" }), sources: 6, fraicheur: "6 h 03" },
  { id: "brico-mq", nom: "Brico Soléa Martinique", pole: "maison", territoire: "Martinique", activite: "Bricolage", effectif: 84, ventes: 362, vsS1: -3.7, vsN1: -4.9, objectif: 91, resultat: 190, tresorerie: 420, plancher: 450, echeances30: 690, encours: 118, echu90: 22, aPayer: 640, reporting: "retard", systemes: s({ filed: "pilote", reput: "pilote" }), sources: 5, fraicheur: "6 h 04" },
  { id: "maison", nom: "Maison Soléa", pole: "maison", territoire: "Martinique", activite: "Ameublement", effectif: 52, ventes: 214, vsS1: 1.6, vsN1: -1.2, objectif: 95, resultat: -60, tresorerie: 190, plancher: 250, echeances30: 380, encours: 74, echu90: 9, aPayer: 330, reporting: "recu", systemes: s({ offload: "actif", reput: "actif" }), sources: 4, fraicheur: "6 h 04" },

  { id: "import", nom: "Soléa Import", pole: "import", territoire: "Guadeloupe", activite: "Grossiste-importateur", effectif: 64, ventes: 1612, vsS1: 0.8, vsN1: 3.9, objectif: 100, resultat: 1340, tresorerie: 2260, plancher: 1500, echeances30: 3120, encours: 1960, echu90: 214, aPayer: 2840, reporting: "recu", systemes: s({ filed: "actif", cashd: "actif" }), sources: 4, fraicheur: "6 h 00" },
  { id: "froid", nom: "Soléa Froid", pole: "import", territoire: "Guadeloupe", activite: "Entrepôt frigorifique", effectif: 41, ventes: 168, vsS1: 0.2, vsN1: 2.1, objectif: 99, resultat: 230, tresorerie: 340, plancher: 250, echeances30: 260, encours: 128, echu90: 6, aPayer: 210, reporting: "recu", systemes: s({ filed: "actif", cashd: "actif" }), sources: 3, fraicheur: "6 h 00" },
  { id: "transit", nom: "Soléa Transit", pole: "import", territoire: "Hexagone", activite: "Commissionnaire, Le Havre", effectif: 18, ventes: 94, vsS1: -2.4, vsN1: 1.5, objectif: 97, resultat: 110, tresorerie: 260, plancher: 150, echeances30: 140, encours: 210, echu90: 31, aPayer: 120, reporting: "recu", systemes: s({ filed: "actif" }), sources: 3, fraicheur: "11 h 00 (Paris)" },

  { id: "immo", nom: "Soléa Immobilier", pole: "immo", territoire: "Guadeloupe", activite: "Centres commerciaux (3)", effectif: 22, ventes: 236, vsS1: 0, vsN1: 2.8, objectif: 101, resultat: 1480, tresorerie: 1720, plancher: 800, echeances30: 610, encours: 412, echu90: 96, aPayer: 340, reporting: "recu", systemes: s({ cashd: "actif" }), sources: 3, fraicheur: "6 h 01" },
  { id: "gestion", nom: "Soléa Gestion", pole: "immo", territoire: "Martinique", activite: "Gestion locative", effectif: 14, ventes: 58, vsS1: 0, vsN1: 1.9, objectif: 100, resultat: 240, tresorerie: 380, plancher: 150, echeances30: 90, encours: 96, echu90: 14, aPayer: 60, reporting: "recu", systemes: s({ cashd: "pilote" }), sources: 2, fraicheur: "6 h 01" },

  { id: "holding", nom: "Soléa Holding (siège)", pole: "services", territoire: "Guadeloupe", activite: "Siège, fonctions support", effectif: 68, ventes: 0, vsS1: 0, vsN1: 0, objectif: 100, resultat: -420, tresorerie: 4210, plancher: 2000, echeances30: 980, encours: 0, echu90: 0, aPayer: 420, reporting: "recu", systemes: s({ filed: "actif" }), sources: 6, fraicheur: "6 h 00" },
];

export const societe = (id: string) => SOCIETES.find((x) => x.id === id);
export const pole = (cle: string) => POLES.find((p) => p.cle === cle);

/* ══ Les ventes du groupe, sur 12 semaines (k€, hors intragroupe) ══ */
export const VENTES_SEMAINES = [9310, 9580, 9420, 9850, 9730, 10070, 9840, 10230, 9990, 10360, 10396, 10448];
export const VENTES_SEMAINES_N1 = [9300, 9420, 9380, 9610, 9580, 9790, 9660, 9930, 9850, 10120, 10180, 10365];

/* ══ Le CEO ══════════════════════════════════════════════════════════ */

export type Decision = { id: string; titre: string; detail: string; societe?: string; direction: string; montant?: number; echeance: number; pieces: string[] };

export const DECISIONS_CEO: Decision[] = [
  { id: "d1", titre: "Avance de trésorerie à Maison Soléa", detail: "La trésorerie passe sous le plancher de 250 k€ le 12 novembre si les encaissements suivent le rythme d'octobre. Le siège peut avancer 180 k€ sur le compte courant d'associé.", societe: "maison", direction: "Finance", montant: 180, echeance: 2, pieces: ["Prévision de trésorerie à 30 jours", "Balance âgée fournisseurs", "Convention de trésorerie du groupe"] },
  { id: "d2", titre: "Ne pas reconduire le contrat de gardiennage des centres", detail: "Le contrat se reconduit tacitement pour 3 ans le 30 novembre. Préavis de 3 mois dépassé dans 2 jours. Deux devis concurrents sont 14 % moins chers.", societe: "immo", direction: "Juridique", montant: 312, echeance: 2, pieces: ["Contrat de gardiennage 2023", "Deux devis concurrents", "Historique des incidents"] },
  { id: "d3", titre: "Plafond d'encours du client Batimat Caraïbes", detail: "Ce client doit 486 k€ à trois sociétés du groupe (Import, Pièces, Brico Guadeloupe), dont 118 k€ échus à plus de 60 jours. La règle du groupe fixe le plafond à 400 k€.", direction: "Finance", montant: 486, echeance: 5, pieces: ["Encours consolidé du client", "Historique de paiement 24 mois", "Note de solvabilité"] },
];

export type Echeance = { id: string; type: "Contrat" | "Bail" | "Reporting" | "Réserve" | "Assurance" | "Litige"; titre: string; societe: string; jours: number; enjeu?: number; direction: string; etat: "a_faire" | "en_cours" | "fait" };

export const ECHEANCES: Echeance[] = [
  { id: "e1", type: "Réserve", titre: "Avarie conteneur MSCU 4821 — écrire au transporteur", societe: "import", jours: 1, enjeu: 38, direction: "Opérations", etat: "a_faire" },
  { id: "e2", type: "Contrat", titre: "Gardiennage des centres commerciaux — préavis", societe: "immo", jours: 2, enjeu: 312, direction: "Juridique", etat: "a_faire" },
  { id: "e3", type: "Reporting", titre: "Reporting mensuel à la marque automobile", societe: "auto-gp", jours: 3, direction: "Finance", etat: "en_cours" },
  { id: "e4", type: "Reporting", titre: "Reporting enseigne — chiffre et marge de septembre", societe: "sm-lamentin", jours: -2, direction: "Finance", etat: "a_faire" },
  { id: "e5", type: "Bail", titre: "Révision triennale du bail — Proxi Gosier", societe: "proxi", jours: 9, enjeu: 46, direction: "Juridique", etat: "a_faire" },
  { id: "e6", type: "Contrat", titre: "Maintenance des chambres froides — tacite reconduction", societe: "froid", jours: 14, enjeu: 74, direction: "Juridique", etat: "en_cours" },
  { id: "e7", type: "Assurance", titre: "Déclaration de sinistre — dégât des eaux réserve", societe: "brico-mq", jours: 4, enjeu: 27, direction: "Opérations", etat: "en_cours" },
  { id: "e8", type: "Litige", titre: "Contestation de facture — transport routier", societe: "transit", jours: 11, enjeu: 19, direction: "Juridique", etat: "en_cours" },
  { id: "e9", type: "Reporting", titre: "Liasse trimestrielle à la banque", societe: "holding", jours: 18, direction: "Finance", etat: "a_faire" },
  { id: "e10", type: "Contrat", titre: "Licence logiciel de caisse — 42 postes", societe: "sm-jarry", jours: 26, enjeu: 58, direction: "DSI", etat: "a_faire" },
  { id: "e11", type: "Reporting", titre: "Reporting enseigne — Brico Martinique", societe: "brico-mq", jours: -1, direction: "Finance", etat: "a_faire" },
  { id: "e12", type: "Bail", titre: "Renouvellement du bail — entrepôt de Jarry", societe: "froid", jours: 61, enjeu: 210, direction: "Juridique", etat: "a_faire" },
];

export type Direction = { cle: string; nom: string; responsable: string; enAttente: number; enRetard: number; lu: boolean; heureLecture?: string; decisionsMois: number; delaiMoyen: string; sujets: string[] };

export const DIRECTIONS: Direction[] = [
  { cle: "finance", nom: "Direction financière", responsable: "Mme Laurent", enAttente: 7, enRetard: 2, lu: true, heureLecture: "7 h 14", decisionsMois: 64, delaiMoyen: "5 h", sujets: ["2 reportings enseigne en retard", "Encours Batimat Caraïbes au-dessus du plafond", "Trésorerie Maison Soléa"] },
  { cle: "juridique", nom: "Direction juridique", responsable: "M. Bellay", enAttente: 4, enRetard: 0, lu: true, heureLecture: "7 h 32", decisionsMois: 21, delaiMoyen: "1 j", sujets: ["Préavis gardiennage dans 2 jours", "Révision du bail Proxi Gosier", "Litige transport routier"] },
  { cle: "operations", nom: "Direction des opérations", responsable: "M. Céleste", enAttente: 5, enRetard: 1, lu: false, decisionsMois: 48, delaiMoyen: "9 h", sujets: ["Réserve à émettre sur le conteneur MSCU 4821", "Sinistre Brico Martinique", "Ruptures fruits et légumes Lamentin"] },
  { cle: "marketing", nom: "Direction marketing", responsable: "Mme Rosan", enAttente: 6, enRetard: 0, lu: true, heureLecture: "6 h 51", decisionsMois: 112, delaiMoyen: "2 h", sujets: ["Campagne Toussaint à valider", "Note Google de Brico Martinique en baisse", "1 284 clients inactifs à relancer"] },
  { cle: "dsi", nom: "DSI", responsable: "M. Darius", enAttente: 2, enRetard: 0, lu: true, heureLecture: "7 h 05", decisionsMois: 9, delaiMoyen: "1 j", sujets: ["Branchement des caisses de Cayenne", "Licence caisses Jarry à renouveler"] },
  { cle: "rh", nom: "Ressources humaines", responsable: "Mme Ferly", enAttente: 1, enRetard: 0, lu: false, decisionsMois: 14, delaiMoyen: "1 j", sujets: ["Plan de formation à l'IA : 3 sessions restantes"] },
];

/* les décisions déjà prises, au journal */
export const JOURNAL = [
  { qui: "Le Président", quoi: "a validé l'avance de 120 k€ à Soléa Pièces", quand: "hier, 18 h 20", module: "VARELO" },
  { qui: "Mme Laurent (Finance)", quoi: "a validé 214 factures fournisseurs en lot", quand: "aujourd'hui, 7 h 40", module: "FILED" },
  { qui: "Mme Rosan (Marketing)", quoi: "a validé 38 réponses aux avis Google", quand: "aujourd'hui, 7 h 02", module: "REPUT" },
  { qui: "M. Bellay (Juridique)", quoi: "a dénoncé le contrat de nettoyage de Destreland", quand: "hier, 16 h 05", module: "VARELO" },
  { qui: "Mme Laurent (Finance)", quoi: "a autorisé 62 relances de deuxième niveau", quand: "hier, 11 h 30", module: "CASHD" },
  { qui: "M. Darius (DSI)", quoi: "a branché la caisse centrale de Soléa Market Cayenne", quand: "il y a 2 jours", module: "Coffre" },
];

/* ══ Le coffre du groupe ══ */

export type Source = { nom: string; type: "ERP" | "Caisses" | "Comptabilité" | "Messagerie" | "Tableurs" | "CRM" | "Banque" | "GED"; societes: number; volume: string; fraicheur: string; etat: "ok" | "lent" | "erreur" };

export const SOURCES: Source[] = [
  { nom: "ERP de gestion commerciale", type: "ERP", societes: 14, volume: "4,1 M lignes", fraicheur: "il y a 12 min", etat: "ok" },
  { nom: "Caisses des magasins (68 postes)", type: "Caisses", societes: 9, volume: "1,8 M tickets / mois", fraicheur: "il y a 4 min", etat: "ok" },
  { nom: "Comptabilité générale", type: "Comptabilité", societes: 18, volume: "2,3 M écritures", fraicheur: "cette nuit, 2 h", etat: "ok" },
  { nom: "Banques (5 établissements)", type: "Banque", societes: 18, volume: "41 comptes", fraicheur: "ce matin, 6 h", etat: "ok" },
  { nom: "Messageries des directions", type: "Messagerie", societes: 18, volume: "312 boîtes", fraicheur: "en continu", etat: "ok" },
  { nom: "Gestion de la relation client", type: "CRM", societes: 7, volume: "186 400 fiches", fraicheur: "il y a 1 h", etat: "lent" },
  { nom: "Tableurs partagés des pôles", type: "Tableurs", societes: 11, volume: "1 240 fichiers", fraicheur: "il y a 25 min", etat: "ok" },
  { nom: "Contrats, baux, assurances", type: "GED", societes: 18, volume: "6 830 documents", fraicheur: "hier, 23 h", etat: "ok" },
  { nom: "Logiciel de pièces (Soléa Pièces)", type: "ERP", societes: 1, volume: "92 000 lignes", fraicheur: "hier, 22 h 40", etat: "erreur" },
];

export const REFERENTIEL = { clients: { codes: 241_800, fiches: 186_400, doublons: 55_400 }, fournisseurs: { codes: 9_820, fiches: 3_910, doublons: 5_910 }, articles: { codes: 412_000, fiches: 168_300, doublons: 243_700 }, tauxRattachement: 96.4 };

/* ══ La consommation d'IA : tout le groupe (CEO) ou la seule direction marketing ══ */

export type Usage = { cle: string; libelle: string; direction: string; modele: string; requetes: number; jetons: number; cout: number; heures: number };

export const USAGES: Usage[] = [
  { cle: "point", libelle: "Point du matin des directions", direction: "Toutes", modele: "Claude Opus", requetes: 2_160, jetons: 61_400_000, cout: 1_240, heures: 310 },
  { cle: "questions", libelle: "Questions posées au coffre", direction: "Toutes", modele: "Claude Opus", requetes: 4_870, jetons: 88_200_000, cout: 1_980, heures: 640 },
  { cle: "factures", libelle: "Lecture des factures fournisseurs", direction: "Finance", modele: "Claude Sonnet", requetes: 31_400, jetons: 142_000_000, cout: 1_460, heures: 1_180 },
  { cle: "relances", libelle: "Relances clients rédigées", direction: "Finance", modele: "Claude Sonnet", requetes: 6_920, jetons: 18_600_000, cout: 240, heures: 260 },
  { cle: "contrats", libelle: "Lecture des contrats et baux", direction: "Juridique", modele: "Claude Opus", requetes: 840, jetons: 36_900_000, cout: 760, heures: 190 },
  { cle: "demandes", libelle: "Réponses aux demandes clients", direction: "Marketing", modele: "Claude Sonnet", requetes: 12_300, jetons: 27_100_000, cout: 410, heures: 420 },
  { cle: "contenus", libelle: "Rédaction des contenus et campagnes", direction: "Marketing", modele: "Claude Sonnet", requetes: 3_840, jetons: 22_400_000, cout: 380, heures: 230 },
  { cle: "avis", libelle: "Réponses aux avis Google", direction: "Marketing", modele: "Claude Haiku", requetes: 2_910, jetons: 4_100_000, cout: 30, heures: 95 },
  { cle: "segments", libelle: "Segmentation et clients inactifs", direction: "Marketing", modele: "Claude Opus", requetes: 410, jetons: 15_800_000, cout: 340, heures: 120 },
  { cle: "tri", libelle: "Tri du courrier et des pièces jointes", direction: "Toutes", modele: "Claude Haiku", requetes: 58_200, jetons: 39_500_000, cout: 160, heures: 380 },
  { cle: "reserves", libelle: "Réserves transport et sinistres", direction: "Opérations", modele: "Claude Sonnet", requetes: 690, jetons: 6_300_000, cout: 90, heures: 70 },
];

/* le coût par jour sur 30 jours (€), du plus ancien au plus récent */
export const COUT_JOURS_GROUPE = [211, 236, 256, 227, 102, 71, 248, 273, 287, 267, 260, 112, 83, 279, 303, 295, 288, 275, 120, 91, 308, 325, 317, 300, 304, 130, 97, 334, 349, 342];
export const COUT_JOURS_MARKETING = [32, 39, 43, 36, 14, 9, 40, 45, 48, 42, 41, 16, 11, 46, 53, 50, 47, 44, 17, 12, 52, 57, 54, 49, 51, 19, 13, 59, 62, 59];

export const BUDGET = { groupe: 8_000, marketing: 1_400 };

export const COUT_PAR_SOCIETE: { id: string; cout: number; utilisateurs: number }[] = [
  { id: "sm-jarry", cout: 1_010, utilisateurs: 46 },
  { id: "import", cout: 880, utilisateurs: 18 },
  { id: "auto-gp", cout: 760, utilisateurs: 24 },
  { id: "sm-lamentin", cout: 690, utilisateurs: 38 },
  { id: "holding", cout: 640, utilisateurs: 41 },
  { id: "sm-destreland", cout: 520, utilisateurs: 29 },
  { id: "auto-mq", cout: 470, utilisateurs: 19 },
  { id: "brico-gp", cout: 410, utilisateurs: 22 },
  { id: "proxi", cout: 300, utilisateurs: 26 },
  { id: "immo", cout: 270, utilisateurs: 7 },
  { id: "autres", cout: 1_140, utilisateurs: 52 },
];

/* le coût d'une heure de travail retenu pour valoriser le temps gagné (€) */
export const COUT_HORAIRE = 38;

/* ══ La direction marketing ══════════════════════════════════════════ */

export type Enseigne = { id: string; nom: string; pole: string; frequentation: number; vsN1: number; panier: number; clientsActifs: number; inactifs: number; noteGoogle: number; avisMois: number; reponseMediane: string; demandes: number; sansReponse: number };

export const ENSEIGNES: Enseigne[] = [
  { id: "sm-jarry", nom: "Soléa Market Jarry", pole: "distribution", frequentation: 38_400, vsN1: 3.8, panier: 33.4, clientsActifs: 61_200, inactifs: 312, noteGoogle: 4.3, avisMois: 214, reponseMediane: "4 min", demandes: 1_420, sansReponse: 0 },
  { id: "sm-destreland", nom: "Soléa Market Destreland", pole: "distribution", frequentation: 23_100, vsN1: 1.4, panier: 32.1, clientsActifs: 34_800, inactifs: 188, noteGoogle: 4.2, avisMois: 131, reponseMediane: "5 min", demandes: 860, sansReponse: 0 },
  { id: "sm-lamentin", nom: "Soléa Market Lamentin", pole: "distribution", frequentation: 33_900, vsN1: -3.1, panier: 32.6, clientsActifs: 52_400, inactifs: 266, noteGoogle: 3.9, avisMois: 188, reponseMediane: "6 min", demandes: 1_210, sansReponse: 3 },
  { id: "sm-cayenne", nom: "Soléa Market Cayenne", pole: "distribution", frequentation: 16_800, vsN1: 8.9, panier: 31.0, clientsActifs: 21_300, inactifs: 74, noteGoogle: 4.4, avisMois: 92, reponseMediane: "7 min", demandes: 540, sansReponse: 1 },
  { id: "auto-gp", nom: "Soléa Auto Guadeloupe", pole: "auto", frequentation: 1_940, vsN1: -9.6, panier: 24_800, clientsActifs: 8_900, inactifs: 1_284, noteGoogle: 4.1, avisMois: 46, reponseMediane: "3 min", demandes: 690, sansReponse: 2 },
  { id: "auto-mq", nom: "Soléa Auto Martinique", pole: "auto", frequentation: 1_420, vsN1: 3.6, panier: 23_900, clientsActifs: 6_400, inactifs: 812, noteGoogle: 4.5, avisMois: 38, reponseMediane: "4 min", demandes: 470, sansReponse: 0 },
  { id: "location", nom: "Soléa Location", pole: "auto", frequentation: 2_610, vsN1: 11.8, panier: 312, clientsActifs: 11_200, inactifs: 940, noteGoogle: 4.6, avisMois: 71, reponseMediane: "2 min", demandes: 1_030, sansReponse: 0 },
  { id: "brico-gp", nom: "Brico Soléa Guadeloupe", pole: "maison", frequentation: 14_200, vsN1: 5.9, panier: 48.6, clientsActifs: 19_700, inactifs: 486, noteGoogle: 4.2, avisMois: 84, reponseMediane: "6 min", demandes: 620, sansReponse: 0 },
  { id: "brico-mq", nom: "Brico Soléa Martinique", pole: "maison", frequentation: 10_100, vsN1: -5.2, panier: 46.2, clientsActifs: 14_100, inactifs: 402, noteGoogle: 3.6, avisMois: 67, reponseMediane: "14 min", demandes: 480, sansReponse: 6 },
  { id: "maison", nom: "Maison Soléa", pole: "maison", frequentation: 3_900, vsN1: -0.8, panier: 410, clientsActifs: 7_300, inactifs: 618, noteGoogle: 4.4, avisMois: 29, reponseMediane: "5 min", demandes: 310, sansReponse: 0 },
];

export type Campagne = { id: string; nom: string; enseigne: string; canal: "Facebook & Instagram" | "Google" | "SMS" | "E-mail" | "Radio" | "Affichage"; etat: "en_cours" | "a_valider" | "terminee" | "programmee"; budget: number; depense: number; contacts: number; leads: number; ventes: number; jours: number };

export const CAMPAGNES: Campagne[] = [
  { id: "c1", nom: "Toussaint — fleurs et bougies", enseigne: "sm-jarry", canal: "Facebook & Instagram", etat: "a_valider", budget: 4_000, depense: 0, contacts: 0, leads: 0, ventes: 0, jours: 1 },
  { id: "c2", nom: "Rentrée du carnaval — précommandes", enseigne: "sm-lamentin", canal: "SMS", etat: "programmee", budget: 1_200, depense: 0, contacts: 18_400, leads: 0, ventes: 0, jours: 6 },
  { id: "c3", nom: "Portes ouvertes SUV hybrides", enseigne: "auto-gp", canal: "Facebook & Instagram", etat: "en_cours", budget: 9_500, depense: 6_120, contacts: 142_000, leads: 318, ventes: 412_000, jours: -9 },
  { id: "c4", nom: "Révision avant la saison cyclonique (relance)", enseigne: "auto-mq", canal: "E-mail", etat: "en_cours", budget: 600, depense: 410, contacts: 6_400, leads: 742, ventes: 96_000, jours: -14 },
  { id: "c5", nom: "Clients inactifs — offre de retour", enseigne: "auto-gp", canal: "SMS", etat: "a_valider", budget: 900, depense: 0, contacts: 1_284, leads: 0, ventes: 0, jours: 2 },
  { id: "c6", nom: "Location week-end — résidents", enseigne: "location", canal: "Google", etat: "en_cours", budget: 3_200, depense: 2_380, contacts: 88_000, leads: 1_140, ventes: 61_800, jours: -21 },
  { id: "c7", nom: "Opération terrasse et jardin", enseigne: "brico-gp", canal: "Facebook & Instagram", etat: "terminee", budget: 5_000, depense: 4_960, contacts: 121_000, leads: 2_410, ventes: 148_000, jours: -35 },
  { id: "c8", nom: "Black Friday électroménager", enseigne: "maison", canal: "Radio", etat: "programmee", budget: 7_800, depense: 0, contacts: 0, leads: 0, ventes: 0, jours: 28 },
  { id: "c9", nom: "Carte fidélité — 2 000 points offerts", enseigne: "sm-destreland", canal: "E-mail", etat: "en_cours", budget: 400, depense: 260, contacts: 34_800, leads: 4_120, ventes: 52_400, jours: -12 },
  { id: "c10", nom: "Rentrée scolaire — fournitures", enseigne: "sm-cayenne", canal: "Affichage", etat: "terminee", budget: 2_600, depense: 2_600, contacts: 0, leads: 0, ventes: 71_000, jours: -58 },
];

export const enseigne = (id: string) => ENSEIGNES.find((e) => e.id === id);

export const DECISIONS_MARKETING: Decision[] = [
  { id: "m1", titre: "Lancer la campagne Toussaint de Soléa Market Jarry", detail: "4 visuels et 3 textes préparés, ciblage à 25 km, 4 000 € sur 5 jours. L'an dernier, la même semaine a fait +18 % sur le rayon fleurs.", societe: "sm-jarry", direction: "Marketing", montant: 4, echeance: 1, pieces: ["Visuels et textes proposés", "Résultats Toussaint 2025", "Ciblage et budget"] },
  { id: "m2", titre: "Relancer 1 284 clients inactifs de Soléa Auto Guadeloupe", detail: "Clients sans passage atelier depuis plus de 18 mois. SMS personnalisé avec le modèle du véhicule et une offre de révision. Les opposés au démarchage sont déjà retirés.", societe: "auto-gp", direction: "Marketing", montant: 0.9, echeance: 2, pieces: ["Liste et critères", "Message proposé", "Liste d'opposition vérifiée"] },
  { id: "m3", titre: "Répondre aux 6 avis négatifs de Brico Soléa Martinique", detail: "La note est passée de 3,9 à 3,6 en un mois. Les 6 avis portent sur l'attente en caisse le samedi. Réponses proposées, signées par le directeur du magasin.", societe: "brico-mq", direction: "Marketing", echeance: 0, pieces: ["Les 6 avis", "Réponses proposées", "Attente en caisse, samedis d'octobre"] },
];

export type Contenu = { id: string; titre: string; enseigne: string; format: "Post" | "Story" | "E-mail" | "SMS" | "Affiche" | "Réponse à un avis"; etat: "a_valider" | "programme" | "publie"; jours: number };

export const CONTENUS: Contenu[] = [
  { id: "p1", titre: "Arrivage chrysanthèmes — 3 visuels", enseigne: "sm-jarry", format: "Post", etat: "a_valider", jours: 0 },
  { id: "p2", titre: "Nouveau SUV hybride en essai ce week-end", enseigne: "auto-gp", format: "Story", etat: "a_valider", jours: 1 },
  { id: "p3", titre: "Newsletter de novembre — 34 800 abonnés", enseigne: "sm-destreland", format: "E-mail", etat: "a_valider", jours: 3 },
  { id: "p4", titre: "Réponse à l'avis de Marie-Claude L. (2★)", enseigne: "brico-mq", format: "Réponse à un avis", etat: "a_valider", jours: 0 },
  { id: "p5", titre: "Offre location week-end résidents", enseigne: "location", format: "Post", etat: "programme", jours: 2 },
  { id: "p6", titre: "Rappel révision — saison cyclonique", enseigne: "auto-mq", format: "SMS", etat: "programme", jours: 4 },
  { id: "p7", titre: "Opération terrasse — bilan en images", enseigne: "brico-gp", format: "Post", etat: "publie", jours: -2 },
  { id: "p8", titre: "Fidélité — 2 000 points offerts", enseigne: "sm-destreland", format: "Affiche", etat: "publie", jours: -5 },
];

export const SEGMENTS = [
  { nom: "Clients présents dans 2 enseignes ou plus", clients: 48_200, part: 21, valeur: "1 840 € / an", tendance: 4.2 },
  { nom: "Familles, panier > 80 € chaque semaine", clients: 22_600, part: 10, valeur: "4 620 € / an", tendance: 1.1 },
  { nom: "Propriétaires d'un véhicule de plus de 5 ans", clients: 12_900, part: 6, valeur: "720 € / an", tendance: -2.4 },
  { nom: "Clients inactifs depuis 6 mois", clients: 5_382, part: 2, valeur: "à reconquérir", tendance: 8.6 },
  { nom: "Professionnels (artisans, TPE)", clients: 6_140, part: 3, valeur: "9 300 € / an", tendance: 2.9 },
];

/* ══ L'équipe ══ */
export const MEMBRES = [
  { nom: "Le Président", role: "CEO", perimetre: "Tout le groupe", acces: "Lecture de tout, validation des décisions de plus de 150 k€" },
  { nom: "Mme Laurent", role: "Direction financière", perimetre: "Tout le groupe", acces: "Finance, trésorerie, encours, factures" },
  { nom: "Mme Rosan", role: "Direction marketing", perimetre: "Enseignes et clients", acces: "Campagnes, clients, avis, demandes — pas de données financières par société" },
  { nom: "M. Bellay", role: "Direction juridique", perimetre: "Tout le groupe", acces: "Contrats, baux, litiges, assurances" },
  { nom: "M. Céleste", role: "Direction des opérations", perimetre: "Distribution, Import & logistique", acces: "Stocks, réserves, sinistres, ruptures" },
  { nom: "M. Darius", role: "DSI", perimetre: "Tout le groupe", acces: "Sources, branchements, accès, journal — aucun montant" },
  { nom: "Directeurs de société (16)", role: "Gérant", perimetre: "Leur société", acces: "Leur point du matin et leurs validations" },
];

/* ══ Formats ══ */
export const keur = (v: number) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} k€`;
export const meur = (vk: number) => `${(vk / 1000).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M€`;
export const eur = (v: number) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`;
export const nb = (v: number) => v.toLocaleString("fr-FR");
export const pct = (v: number, signe = true) => `${signe && v > 0 ? "+" : ""}${v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
export const jetons = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M` : `${Math.round(v / 1000)} k`);
export const quand = (j: number) => (j < 0 ? `en retard de ${-j} j` : j === 0 ? "aujourd'hui" : j === 1 ? "demain" : `dans ${j} j`);
