/* ══════════════════════════════════════════════════════════════════════
   Le monde d'EXEMPLE de l'écran LORANI (05/10/2026, session B5)

   Même entreprise fictive que les autres écrans (exemples/socle.ts :
   « Atelier Bertin », Lyon — ici, son pôle architecture dépose les permis
   de ses clients), cinq projets, six permis à tous les stades du
   calendrier : à déposer, pièces à fournir (avec une date lue à confirmer),
   en instruction, décision tacite à confirmer, accordé avant purge, purgé
   après un recours. Les identifiants commencent par 0000… : rien d'ici ne
   peut être confondu avec une ligne de la base, et rien n'est jamais écrit.

   Les dates sont RELATIVES au jour de la visite (j(n) = aujourd'hui + n
   jours) pour que les échéances restent vraies demain. Le `calcul` de
   chaque permis a la forme de la sortie de lorani_calendrier_permis
   (lorani.m4.1), écrite à la main d'après les règles du code de
   l'urbanisme que le socle applique.
   ══════════════════════════════════════════════════════════════════════ */

import { EXEMPLE_CLIENT_ID, EXEMPLE_MOI, CLAIRE, SIEGE, SOFIA, YANIS, aujourdHui, ilYa } from "../exemples/socle";
import type { CasRejet, DateLue, Dossier, Echeance, Etape, Intervenant, Lot, MembreProjet, Permis, PieceProjet, Projet, Recours } from "./types";

const C = EXEMPLE_CLIENT_ID;
const j = (n: number) => aujourdHui(n);
const fr = (n: number) => {
  const [a, m, d] = j(n).split("-");
  return `${d}/${m}/${a}`;
};
const id = (lettre: string, n: number) => `00000000-0000-4000-8000-00000000${lettre}${n.toString(16).padStart(3, "0")}`;

/* ——— les projets ——— */
const P_LEMOINE = id("b", 1);
const P_ENFANCE = id("b", 2);
const P_MARTIN = id("b", 3);
const P_MERCIERE = id("b", 4);
const P_DUBOIS = id("b", 5);

const projet = (p: Partial<Projet> & Pick<Projet, "id" | "nom" | "commune" | "code_postal" | "code_insee" | "nature">): Projet => ({
  client_id: C,
  entite_id: SIEGE,
  reference: null,
  adresse: null,
  parcelles: [],
  marche_public: false,
  phase: "pc",
  territoire: "metropole",
  actif: true,
  cree_le: ilYa(120),
  maj_le: ilYa(1),
  ...p,
});

export const PROJETS_EXEMPLE: Projet[] = [
  projet({ id: P_LEMOINE, nom: "Maison Lemoine", reference: "26-014", adresse: "12 rue des Hauts-Pavés", code_postal: "44000", commune: "Nantes", code_insee: "44109", parcelles: ["AB 123", "AB 124"], nature: "maison_individuelle" }),
  projet({ id: P_ENFANCE, nom: "Pôle enfance de Vaulx-en-Velin", reference: "26-009", adresse: "4 avenue Roger-Salengro", code_postal: "69120", commune: "Vaulx-en-Velin", code_insee: "69256", parcelles: ["BK 58"], nature: "erp", marche_public: true }),
  projet({ id: P_MARTIN, nom: "Maison Martin", reference: "26-011", adresse: "27 rue Bellecombe", code_postal: "69003", commune: "Lyon 3e", code_insee: "69383", parcelles: ["AV 212"], nature: "maison_individuelle" }),
  projet({ id: P_MERCIERE, nom: "Façade rue Mercière", reference: "25-031", adresse: "31 rue Mercière", code_postal: "69002", commune: "Lyon 2e", code_insee: "69382", parcelles: ["AC 77"], nature: "tertiaire", phase: "dce" }),
  projet({ id: P_DUBOIS, nom: "Surélévation Dubois", reference: "26-018", adresse: "8 rue Francis-de-Pressensé", code_postal: "69100", commune: "Villeurbanne", code_insee: "69266", parcelles: ["BD 301"], nature: "logement_collectif", phase: "apd" }),
];

/* ——— les permis et leur calendrier ——— */
const X_LEMOINE = id("c", 1);
const X_ENFANCE = id("c", 2);
const X_MARTIN_DP = id("c", 3);
const X_MARTIN_PC = id("c", 4);
const X_MERCIERE = id("c", 5);
const X_DUBOIS = id("c", 6);

const SRC_COMPLETUDE = "Code de l'urbanisme, art. R*423-22 et R*423-38 : la mairie dispose d'un mois après le dépôt pour réclamer des pièces.";
const SRC_PIECES = "Code de l'urbanisme, art. R*423-39 : trois mois pour adresser les pièces, sinon décision tacite de rejet.";
const SRC_PCMI = "Code de l'urbanisme, art. R*423-23, b : deux mois pour une maison individuelle.";
const SRC_ERP = "Code de l'urbanisme, art. R*423-28, b : cinq mois pour un établissement recevant du public.";
const SRC_DP = "Code de l'urbanisme, art. R*423-23, a : un mois pour une déclaration préalable.";
const SRC_RETRAIT = "Code de l'urbanisme, art. L424-5 : retrait possible pendant trois mois après la décision.";
const SRC_RECOURS = "Code de l'urbanisme, art. R*600-2 : deux mois à compter du premier jour d'affichage.";
const URL_LEGIFRANCE = "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006074075";

const etape = (e: Etape): Etape => e;

const permis = (p: Partial<Permis> & Pick<Permis, "id" | "projet_id" | "type_autorisation" | "intitule" | "etat" | "calcul">): Permis => ({
  client_id: C,
  entite_id: SIEGE,
  numero: null,
  secteur_protege: false,
  immeuble_inscrit_mh: false,
  erp_autorisation: false,
  igh: false,
  evaluation_environnementale: false,
  cas_rejet: [],
  date_depot: null,
  date_demande_pieces: null,
  date_pieces_fournies: null,
  delai_notifie_mois: null,
  date_notification_delai: null,
  decision: null,
  date_decision: null,
  date_affichage: null,
  actif: true,
  silence: "tacite",
  date_decision_attendue: null,
  date_purge: null,
  calcule_le: ilYa(0, 6),
  cree_le: ilYa(100),
  maj_le: ilYa(1),
  pieces_demandees: [],
  ...p,
});

const regime = (type: Permis["type_autorisation"], regle: string, dp = false) => ({
  type,
  regle_instruction: regle,
  silence: "tacite" as const,
  motifs_silence: [],
  effet_silence: dp ? "non-opposition tacite (art. R*424-1, a)" : "permis tacite (art. R*424-1, b)",
});

export const PERMIS_EXEMPLE: Permis[] = [
  /* 1. Maison Lemoine : pièces réclamées, à fournir d'ici 9 jours ; une lettre de délai lue attend */
  permis({
    id: X_LEMOINE,
    projet_id: P_LEMOINE,
    type_autorisation: "pcmi",
    intitule: "Maison Lemoine",
    numero: "PC04410926A0042",
    date_depot: j(-95),
    date_demande_pieces: j(-82),
    pieces_demandees: [{ code: "PC5" }, { code: "PC8" }],
    /* deux lettres : la seconde a ajouté PC8, le délai court depuis la première (b5_07) */
    demandes_pieces: [{ date: j(-82), pieces: [{ code: "PC5" }] }, { date: j(-78), pieces: [{ code: "PC5" }, { code: "PC8" }] }],
    etat: "pieces_demandees",
    calcul: {
      version: "lorani.m4.1",
      territoire: "metropole",
      aujourdhui: j(0),
      etat: "pieces_demandees",
      regime: regime("pcmi", "lorani.urbanisme.instruction_pcmi"),
      etapes: [
        etape({ nature: "depot", libelle: "Dépôt du dossier en mairie", date: j(-95), statut: "fait" }),
        etape({ nature: "completude", libelle: "Fin du délai de la mairie pour réclamer des pièces", date: j(-64), certitude: "certaine", statut: "fait", issue: `Pièces réclamées : demande reçue le ${fr(-82)}.`, regle: "lorani.urbanisme.completude", depart: j(-95), source: SRC_COMPLETUDE, source_url: URL_LEGIFRANCE }),
        etape({ nature: "demande_pieces", libelle: "Demande de pièces manquantes reçue", date: j(-82), statut: "fait" }),
        etape({ nature: "pieces", libelle: "Pièces manquantes à adresser à la mairie, au plus tard", date: j(9), certitude: "certaine", statut: "a_venir", regle: "lorani.urbanisme.pieces_manquantes", depart: j(-82), source: SRC_PIECES, source_url: URL_LEGIFRANCE }),
        etape({ nature: "instruction", libelle: "L'instruction commencera à la réception de toutes les pièces manquantes (art. R*423-39, c)", statut: "en_attente" }),
      ],
      avertissements: [],
    },
  }),
  /* 2. Pôle enfance : ERP, délai de cinq mois notifié, décision attendue dans 77 jours */
  permis({
    id: X_ENFANCE,
    projet_id: P_ENFANCE,
    type_autorisation: "pc",
    intitule: "Pôle enfance",
    numero: "PC06925626V0118",
    erp_autorisation: true,
    date_depot: j(-75),
    delai_notifie_mois: 5,
    date_notification_delai: j(-60),
    etat: "instruction",
    date_decision_attendue: j(77),
    calcul: {
      version: "lorani.m4.1",
      territoire: "metropole",
      aujourdhui: j(0),
      etat: "instruction",
      regime: { ...regime("pc", "lorani.urbanisme.instruction_erp_igh"), delai_notifie_mois: 5 },
      etapes: [
        etape({ nature: "depot", libelle: "Dépôt du dossier en mairie", date: j(-75), statut: "fait" }),
        etape({ nature: "completude", libelle: "Fin du délai de la mairie pour réclamer des pièces", date: j(-44), certitude: "certaine", statut: "passe", issue: "Aucune pièce réclamée à temps : le dossier est réputé complet au dépôt (art. R*423-22).", regle: "lorani.urbanisme.completude", depart: j(-75), source: SRC_COMPLETUDE, source_url: URL_LEGIFRANCE }),
        etape({ nature: "instruction", libelle: "Fin de l'instruction : décision de la mairie au plus tard", date: j(77), certitude: "certaine", depart: j(-75), statut: "a_venir", date_calculee: j(77), date_notifiee: j(77), regle: "lorani.urbanisme.instruction_erp_igh", source: SRC_ERP, source_url: URL_LEGIFRANCE }),
      ],
      date_decision_attendue: j(77),
      avertissements: [],
    },
  }),
  /* 3. Clôture Martin : déclaration préalable, non-opposition tacite née il y a 13 jours, à confirmer */
  permis({
    id: X_MARTIN_DP,
    projet_id: P_MARTIN,
    type_autorisation: "dp",
    intitule: "Clôture Martin",
    numero: "DP06938326N0107",
    date_depot: j(-45),
    etat: "decision_a_confirmer",
    date_decision_attendue: j(-14),
    calcul: {
      version: "lorani.m4.1",
      territoire: "metropole",
      aujourdhui: j(0),
      etat: "decision_a_confirmer",
      regime: regime("dp", "lorani.urbanisme.instruction_dp", true),
      etapes: [
        etape({ nature: "depot", libelle: "Dépôt du dossier en mairie", date: j(-45), statut: "fait" }),
        etape({ nature: "completude", libelle: "Fin du délai de la mairie pour réclamer des pièces", date: j(-14), certitude: "certaine", statut: "passe", issue: "Aucune pièce réclamée à temps : le dossier est réputé complet au dépôt (art. R*423-22).", regle: "lorani.urbanisme.completude", depart: j(-45), source: SRC_COMPLETUDE, source_url: URL_LEGIFRANCE }),
        etape({ nature: "instruction", libelle: "Fin de l'instruction : décision de la mairie au plus tard", date: j(-14), certitude: "certaine", depart: j(-45), statut: "passe", date_calculee: j(-14), regle: "lorani.urbanisme.instruction_dp", source: SRC_DP, source_url: URL_LEGIFRANCE }),
        etape({ nature: "decision", libelle: "Non-opposition tacite, si aucune décision ne vous a été notifiée", date: j(-13), statut: "a_confirmer", motif: `Délai d'instruction écoulé le ${fr(-14)} sans décision notifiée : non-opposition tacite (art. R*424-1).` }),
        etape({ nature: "affichage", libelle: "Affichage du permis sur le terrain, à faire et à saisir", date: j(2), statut: "a_venir", detail: `Relance le ${fr(2)}, quinze jours après la décision.` }),
        etape({ nature: "retrait", libelle: "Fin du délai de retrait par la mairie", date: j(78), certitude: "prevision", depart: j(-13), statut: "a_venir", regle: "lorani.urbanisme.retrait", source: SRC_RETRAIT, source_url: URL_LEGIFRANCE }),
      ],
      decision_implicite: { nature: "tacite", date: j(-13), motif: `Délai d'instruction écoulé le ${fr(-14)} sans décision notifiée : non-opposition tacite (art. R*424-1).` },
      date_decision_attendue: j(-14),
      avertissements: ["Tant que le permis n'est pas affiché sur le terrain, le délai de recours des tiers ne court pas (art. R*600-2) ; sans affichage, un recours reste possible jusqu'à six mois après l'achèvement des travaux (art. R600-3)."],
    },
  }),
  /* 4. Extension Martin : accordé, affiché, purgé dans 30 jours */
  permis({
    id: X_MARTIN_PC,
    projet_id: P_MARTIN,
    type_autorisation: "pcmi",
    intitule: "Extension Martin",
    numero: "PC06938326V0071",
    date_depot: j(-150),
    decision: "favorable",
    date_decision: j(-60),
    date_affichage: j(-50),
    etat: "accorde",
    date_decision_attendue: j(-89),
    date_purge: j(30),
    cree_le: ilYa(160),
    calcul: {
      version: "lorani.m4.1",
      territoire: "metropole",
      aujourdhui: j(0),
      etat: "accorde",
      regime: regime("pcmi", "lorani.urbanisme.instruction_pcmi"),
      etapes: [
        etape({ nature: "depot", libelle: "Dépôt du dossier en mairie", date: j(-150), statut: "fait" }),
        etape({ nature: "completude", libelle: "Fin du délai de la mairie pour réclamer des pièces", date: j(-119), certitude: "certaine", statut: "passe", issue: "Aucune pièce réclamée à temps : le dossier est réputé complet au dépôt (art. R*423-22).", regle: "lorani.urbanisme.completude", depart: j(-150), source: SRC_COMPLETUDE, source_url: URL_LEGIFRANCE }),
        etape({ nature: "instruction", libelle: "Fin de l'instruction : décision de la mairie au plus tard", date: j(-89), certitude: "certaine", depart: j(-150), statut: "fait", date_calculee: j(-89), regle: "lorani.urbanisme.instruction_pcmi", source: SRC_PCMI, source_url: URL_LEGIFRANCE }),
        etape({ nature: "decision", libelle: "Permis accordé", date: j(-60), statut: "fait" }),
        etape({ nature: "affichage", libelle: "Premier jour d'affichage sur le terrain", date: j(-50), statut: "fait" }),
        etape({ nature: "retrait", libelle: "Fin du délai de retrait par la mairie", date: j(30), certitude: "certaine", depart: j(-60), statut: "a_venir", regle: "lorani.urbanisme.retrait", source: SRC_RETRAIT, source_url: URL_LEGIFRANCE }),
        etape({ nature: "recours", libelle: "Fin du délai de recours des tiers : dernier jour pour agir", date: j(10), certitude: "certaine", depart: j(-50), statut: "a_venir", regle: "lorani.urbanisme.recours_tiers", source: SRC_RECOURS, source_url: URL_LEGIFRANCE }),
        etape({ nature: "purge", libelle: "Permis purgé de tout retrait et de tout recours des tiers, à l'issue du", date: j(30), certitude: "certaine", statut: "a_venir", detail: `La plus tardive des fins : retrait le ${fr(30)}, recours des tiers le ${fr(10)}.` }),
        etape({ nature: "chantier", libelle: "Chantier sans risque de retrait ni de recours des tiers à partir du", date: j(31), certitude: "certaine", statut: "a_venir" }),
      ],
      date_decision_attendue: j(-89),
      date_purge: j(30),
      chantier_sans_risque_le: j(31),
      avertissements: [],
    },
  }),
  /* 5. Façade rue Mercière : secteur protégé, accordé, recours gracieux rejeté, purgé depuis 110 jours */
  permis({
    id: X_MERCIERE,
    projet_id: P_MERCIERE,
    type_autorisation: "pc",
    intitule: "Façade rue Mercière",
    numero: "PC06938225V0344",
    secteur_protege: true,
    date_depot: j(-300),
    decision: "favorable",
    date_decision: j(-220),
    date_affichage: j(-210),
    etat: "purge",
    date_decision_attendue: j(-208),
    date_purge: j(-110),
    cree_le: ilYa(310),
    calcul: {
      version: "lorani.m4.1",
      territoire: "metropole",
      aujourdhui: j(0),
      etat: "purge",
      regime: regime("pc", "lorani.urbanisme.instruction_pc_protege"),
      etapes: [
        etape({ nature: "depot", libelle: "Dépôt du dossier en mairie", date: j(-300), statut: "fait" }),
        etape({ nature: "completude", libelle: "Fin du délai de la mairie pour réclamer des pièces", date: j(-269), certitude: "certaine", statut: "passe", issue: "Aucune pièce réclamée à temps : le dossier est réputé complet au dépôt (art. R*423-22).", regle: "lorani.urbanisme.completude", depart: j(-300), source: SRC_COMPLETUDE, source_url: URL_LEGIFRANCE }),
        etape({ nature: "instruction", libelle: "Fin de l'instruction : décision de la mairie au plus tard", date: j(-208), certitude: "certaine", depart: j(-300), statut: "fait", regle: "lorani.urbanisme.instruction_pc_protege", source: "Code de l'urbanisme, art. R*423-24, b et R*423-28 : trois mois, portés à quatre en site patrimonial remarquable (avis de l'architecte des Bâtiments de France).", source_url: URL_LEGIFRANCE }),
        etape({ nature: "decision", libelle: "Permis accordé", date: j(-220), statut: "fait" }),
        etape({ nature: "affichage", libelle: "Premier jour d'affichage sur le terrain", date: j(-210), statut: "fait" }),
        etape({ nature: "retrait", libelle: "Fin du délai de retrait par la mairie", date: j(-130), certitude: "certaine", depart: j(-220), statut: "passe", regle: "lorani.urbanisme.retrait", source: SRC_RETRAIT, source_url: URL_LEGIFRANCE }),
        etape({ nature: "recours", libelle: "Fin du délai de recours des tiers : dernier jour pour agir", date: j(-150), certitude: "certaine", depart: j(-210), statut: "passe", regle: "lorani.urbanisme.recours_tiers", source: SRC_RECOURS, source_url: URL_LEGIFRANCE }),
        etape({ nature: "recours_saisi", libelle: `Recours gracieux du ${fr(-200)}, rejeté le ${fr(-170)} : recours contentieux possible jusqu'au`, date: j(-110), certitude: "certaine", statut: "passe", regle: "lorani.urbanisme.recours_apres_gracieux", source: "Code de justice administrative, art. R421-1 et R421-2 : deux mois après le rejet du recours gracieux.", source_url: URL_LEGIFRANCE }),
        etape({ nature: "purge", libelle: "Permis purgé de tout retrait et de tout recours des tiers, à l'issue du", date: j(-110), certitude: "certaine", statut: "passe", detail: `La plus tardive des fins : retrait le ${fr(-130)}, recours des tiers le ${fr(-150)}, recours saisis le ${fr(-110)}.` }),
        etape({ nature: "chantier", libelle: "Chantier sans risque de retrait ni de recours des tiers à partir du", date: j(-109), certitude: "certaine", statut: "passe" }),
      ],
      date_decision_attendue: j(-208),
      date_purge: j(-110),
      chantier_sans_risque_le: j(-109),
      avertissements: [],
    },
  }),
  /* 6. Surélévation Dubois : le dossier n'est pas encore déposé */
  permis({
    id: X_DUBOIS,
    projet_id: P_DUBOIS,
    type_autorisation: "pc",
    intitule: "Surélévation Dubois",
    etat: "a_deposer",
    cree_le: ilYa(6),
    calcul: {
      version: "lorani.m4.1",
      territoire: "metropole",
      aujourdhui: j(0),
      etat: "a_deposer",
      regime: regime("pc", "lorani.urbanisme.instruction_pc"),
      etapes: [],
      avertissements: [],
    },
  }),
];

/* ——— les dates lues sur les courriers ——— */
const PIECE_RECEPISSE = id("d", 1);
const PIECE_DEMANDE = id("d", 2);
const PIECE_LETTRE = id("d", 3);
const PIECE_RECEPISSE_DP = id("d", 4);
const PIECE_ARRETE = id("d", 5);
const PIECE_CONSTAT = id("d", 6);

export const PIECES_EXEMPLE: PieceProjet[] = [
  { id: PIECE_RECEPISSE, objet_id: P_LEMOINE, nom_fichier: "recepisse-depot-PC04410926A0042.pdf", mime: "application/pdf", statut: "lue", type_piece: "lorani_recepisse_depot", cree_le: ilYa(93) },
  { id: PIECE_DEMANDE, objet_id: P_LEMOINE, nom_fichier: "demande-pieces-mairie-nantes.pdf", mime: "application/pdf", statut: "lue", type_piece: "lorani_demande_pieces", cree_le: ilYa(80) },
  { id: PIECE_LETTRE, objet_id: P_LEMOINE, nom_fichier: "lettre-delai-majore.pdf", mime: "application/pdf", statut: "lue", type_piece: "lorani_lettre_delai", cree_le: ilYa(0, 8) },
  { id: PIECE_RECEPISSE_DP, objet_id: P_MARTIN, nom_fichier: "ARE_DP06938326N0107.pdf", mime: "application/pdf", statut: "lue", type_piece: "lorani_recepisse_depot", source: "courriel", cree_le: ilYa(44) },
  { id: PIECE_ARRETE, objet_id: P_MERCIERE, nom_fichier: "arrete-PC06938225V0344.pdf", mime: "application/pdf", statut: "lue", type_piece: "lorani_arrete", cree_le: ilYa(218) },
  { id: PIECE_CONSTAT, objet_id: P_MERCIERE, nom_fichier: "constat-affichage-huissier.pdf", mime: "application/pdf", statut: "lue", type_piece: "lorani_constat_affichage", cree_le: ilYa(209) },
];

const dateLue = (d: Partial<DateLue> & Pick<DateLue, "id" | "projet_id" | "permis_id" | "piece_id" | "type_piece" | "nature" | "proposition" | "citations">): DateLue => ({
  client_id: C,
  entite_id: SIEGE,
  verifiee: true,
  statut: "confirmee",
  confirme: null,
  decide_par: EXEMPLE_MOI,
  decide_le: null,
  motif: null,
  cree_le: ilYa(1),
  maj_le: ilYa(1),
  ...d,
});

export const DATES_LUES_EXEMPLE: DateLue[] = [
  dateLue({
    id: id("e", 1), projet_id: P_LEMOINE, permis_id: X_LEMOINE, piece_id: PIECE_LETTRE, type_piece: "lorani_lettre_delai", nature: "delai_notifie",
    proposition: { delai_notifie_mois: 3, date_notification_delai: j(-70) },
    citations: [
      { champ: "delai_mois", texte: "le délai d'instruction de votre demande est porté à 3 mois", page: 1, verifiee: true },
      { champ: "date_lettre", texte: `Nantes, le ${fr(-70)}`, page: 1, verifiee: true },
    ],
    statut: "proposee", decide_par: null, cree_le: ilYa(0, 8), maj_le: ilYa(0, 8),
  }),
  dateLue({
    id: id("e", 2), projet_id: P_LEMOINE, permis_id: X_LEMOINE, piece_id: PIECE_DEMANDE, type_piece: "lorani_demande_pieces", nature: "demande_pieces",
    proposition: { date_demande_pieces: j(-82), pieces: [{ code: "PC5" }, { code: "PC8" }] },
    citations: [
      { champ: "date_lettre", texte: `Nantes, le ${fr(-82)}`, page: 1, verifiee: true },
      { champ: "pieces", texte: "PC5 — plan des façades et des toitures", page: 1, verifiee: true },
      { champ: "pieces", texte: "PC8 — photographie du terrain dans son environnement proche", page: 1, verifiee: true },
    ],
    confirme: { date_demande_pieces: j(-82), pieces: [{ code: "PC5" }, { code: "PC8" }] }, decide_le: ilYa(80), cree_le: ilYa(80), maj_le: ilYa(80),
  }),
  dateLue({
    id: id("e", 3), projet_id: P_LEMOINE, permis_id: X_LEMOINE, piece_id: PIECE_RECEPISSE, type_piece: "lorani_recepisse_depot", nature: "depot",
    proposition: { date_depot: j(-95), numero: "PC04410926A0042" },
    citations: [
      { champ: "date_depot", texte: `Dossier déposé le ${fr(-95)}`, page: 1, verifiee: true },
      { champ: "numero_dossier", texte: "N° PC 044109 26 A0042", page: 1, verifiee: true },
    ],
    confirme: { date_depot: j(-95), numero: "PC04410926A0042" }, decide_le: ilYa(93), cree_le: ilYa(93), maj_le: ilYa(93),
  }),
  dateLue({
    id: id("e", 4), projet_id: P_MARTIN, permis_id: X_MARTIN_DP, piece_id: PIECE_RECEPISSE_DP, type_piece: "lorani_recepisse_depot", nature: "depot",
    proposition: { date_depot: j(-45), numero: "DP06938326N0107" },
    citations: [{ champ: "date_depot", texte: `Reçu le ${fr(-45)}`, page: 1, verifiee: true }, { champ: "numero_dossier", texte: "DP 069383 26 N0107", page: 1, verifiee: true }],
    confirme: { date_depot: j(-45), numero: "DP06938326N0107" }, decide_par: YANIS, decide_le: ilYa(44), cree_le: ilYa(44), maj_le: ilYa(44),
  }),
  dateLue({
    id: id("e", 5), projet_id: P_MERCIERE, permis_id: X_MERCIERE, piece_id: PIECE_ARRETE, type_piece: "lorani_arrete", nature: "decision",
    proposition: { decision: "favorable", date_decision: j(-220) },
    citations: [{ champ: "decision", texte: "ARRÊTE : le permis de construire est ACCORDÉ", page: 1, verifiee: true }, { champ: "date_decision", texte: `Fait à Lyon, le ${fr(-220)}`, page: 2, verifiee: true }],
    confirme: { decision: "favorable", date_decision: j(-220) }, decide_le: ilYa(218), cree_le: ilYa(218), maj_le: ilYa(218),
  }),
  dateLue({
    id: id("e", 6), projet_id: P_MERCIERE, permis_id: X_MERCIERE, piece_id: PIECE_CONSTAT, type_piece: "lorani_constat_affichage", nature: "affichage",
    proposition: { date_affichage: j(-210) },
    citations: [{ champ: "date_constat", texte: `constatons ce jour, ${fr(-210)}, la présence du panneau`, page: 1, verifiee: true }],
    confirme: { date_affichage: j(-210) }, decide_le: ilYa(209), cree_le: ilYa(209), maj_le: ilYa(209),
  }),
];

/* ——— les échéances posées dans delais (vue lorani_echeances_permis) ——— */
const echeance = (e: Partial<Echeance> & Pick<Echeance, "permis_id" | "projet_id" | "nature" | "libelle" | "echeance" | "statut">): Echeance => ({
  delai_id: id("f", 999),
  echeance_calculee: e.echeance,
  echeance_notifiee: null,
  rappels: [],
  rappels_faits: [],
  regle_code: null,
  regle_version: null,
  detail: null,
  source: null,
  source_url: null,
  source_notification: null,
  responsable: EXEMPLE_MOI,
  action_attendue: null,
  ...e,
});

export const ECHEANCES_EXEMPLE: Echeance[] = [
  echeance({ delai_id: id("f", 1), permis_id: X_LEMOINE, projet_id: P_LEMOINE, nature: "completude", libelle: "PCMI « Maison Lemoine » : fin du délai de la mairie pour réclamer des pièces", echeance: j(-64), statut: "tenu", regle_code: "lorani.urbanisme.completude", regle_version: 1 }),
  echeance({ delai_id: id("f", 2), permis_id: X_LEMOINE, projet_id: P_LEMOINE, nature: "pieces", libelle: "PCMI « Maison Lemoine » : pièces manquantes à adresser à la mairie", echeance: j(9), statut: "ouvert", rappels: [10, 3, 0], rappels_faits: [10], regle_code: "lorani.urbanisme.pieces_manquantes", regle_version: 1, detail: "Trois mois à compter de la réception de la demande.", source: SRC_PIECES, source_url: URL_LEGIFRANCE, action_attendue: "Adresser à la mairie toutes les pièces demandées (art. R*423-39), puis saisir la date de leur réception." }),
  echeance({ delai_id: id("f", 3), permis_id: X_ENFANCE, projet_id: P_ENFANCE, nature: "completude", libelle: "PC « Pôle enfance de Vaulx-en-Velin » : fin du délai de la mairie pour réclamer des pièces", echeance: j(-44), statut: "tenu", regle_code: "lorani.urbanisme.completude", regle_version: 1 }),
  echeance({ delai_id: id("f", 4), permis_id: X_ENFANCE, projet_id: P_ENFANCE, nature: "instruction", libelle: "PC « Pôle enfance de Vaulx-en-Velin » : fin de l'instruction, décision de la mairie au plus tard", echeance: j(77), echeance_notifiee: j(77), statut: "ouvert", rappels: [7], regle_code: "lorani.urbanisme.instruction_erp_igh", regle_version: 1, source: SRC_ERP, source_url: URL_LEGIFRANCE, source_notification: `Délai de 5 mois notifié par la mairie le ${fr(-60)}.`, responsable: YANIS, action_attendue: "Surveiller la décision de la mairie ; sans décision notifiée, le calendrier dit l'effet du silence." }),
  echeance({ delai_id: id("f", 5), permis_id: X_MARTIN_DP, projet_id: P_MARTIN, nature: "instruction", libelle: "DP « Maison Martin » : fin de l'instruction, décision de la mairie au plus tard", echeance: j(-14), statut: "depasse", rappels: [7], rappels_faits: [7], regle_code: "lorani.urbanisme.instruction_dp", regle_version: 1, source: SRC_DP, source_url: URL_LEGIFRANCE, responsable: YANIS }),
  echeance({ delai_id: id("f", 6), permis_id: X_MARTIN_PC, projet_id: P_MARTIN, nature: "affichage", libelle: "PCMI « Maison Martin » : affichage du permis sur le terrain à saisir", echeance: j(-45), statut: "tenu", rappels: [0], responsable: YANIS }),
  echeance({ delai_id: id("f", 7), permis_id: X_MARTIN_PC, projet_id: P_MARTIN, nature: "retrait", libelle: "PCMI « Maison Martin » : fin du délai de retrait par la mairie", echeance: j(30), statut: "ouvert", regle_code: "lorani.urbanisme.retrait", regle_version: 1, source: SRC_RETRAIT, source_url: URL_LEGIFRANCE, responsable: YANIS }),
  echeance({ delai_id: id("f", 8), permis_id: X_MARTIN_PC, projet_id: P_MARTIN, nature: "recours", libelle: "PCMI « Maison Martin » : fin du délai de recours des tiers", echeance: j(10), statut: "ouvert", regle_code: "lorani.urbanisme.recours_tiers", regle_version: 1, source: SRC_RECOURS, source_url: URL_LEGIFRANCE, responsable: YANIS }),
  echeance({ delai_id: id("f", 9), permis_id: X_MARTIN_PC, projet_id: P_MARTIN, nature: "purge", libelle: "PCMI « Maison Martin » : permis purgé de tout retrait et de tout recours", echeance: j(30), statut: "ouvert", source: `Lorani : la plus tardive des fins : retrait le ${fr(30)}, recours des tiers le ${fr(10)}. (C. urb., art. L424-5 et R*600-2)`, responsable: YANIS }),
  echeance({ delai_id: id("f", 10), permis_id: X_MERCIERE, projet_id: P_MERCIERE, nature: "purge", libelle: "PC « Façade rue Mercière » : permis purgé de tout retrait et de tout recours", echeance: j(-110), statut: "tenu" }),
];

/* ——— les recours ——— */
export const RECOURS_EXEMPLE: Recours[] = [
  {
    id: id("a", 1), client_id: C, entite_id: SIEGE, projet_id: P_MERCIERE, permis_id: X_MERCIERE,
    nature: "gracieux", date_recours: j(-200), auteur: "Copropriété du 29 rue Mercière", issue: "rejete", date_issue: j(-170),
    cree_le: ilYa(199), maj_le: ilYa(169),
  },
];

/* ——— les lots, les intervenants, l'équipe ——— */
export const LOTS_EXEMPLE: Lot[] = [
  { id: id("1", 1), projet_id: P_LEMOINE, numero: "01", intitule: "Gros œuvre", activites_requises: ["maconnerie", "beton_arme"] },
  { id: id("1", 2), projet_id: P_LEMOINE, numero: "02", intitule: "Charpente — couverture", activites_requises: ["charpente", "couverture"] },
  { id: id("1", 3), projet_id: P_LEMOINE, numero: "03", intitule: "Menuiseries extérieures", activites_requises: ["menuiserie_ext"] },
  { id: id("1", 4), projet_id: P_ENFANCE, numero: "01", intitule: "Terrassement — VRD", activites_requises: [] },
  { id: id("1", 5), projet_id: P_ENFANCE, numero: "02", intitule: "Gros œuvre", activites_requises: ["beton_arme"] },
  { id: id("1", 6), projet_id: P_ENFANCE, numero: "08", intitule: "Électricité — SSI", activites_requises: ["electricite", "ssi"] },
  { id: id("1", 7), projet_id: P_MARTIN, numero: "01", intitule: "Maçonnerie", activites_requises: [] },
  { id: id("1", 8), projet_id: P_MERCIERE, numero: "01", intitule: "Ravalement — pierre de taille", activites_requises: ["pierre"] },
];

export const INTERVENANTS_EXEMPLE: Intervenant[] = [
  { id: id("2", 1), projet_id: P_LEMOINE, nature: "maitre_ouvrage", organisme: "M. et Mme Lemoine", contact: "Pierre Lemoine", email: "p.lemoine@exemple.fr", telephone: "06 12 34 56 78", siren: null, lot_id: null, actif: true },
  { id: id("2", 2), projet_id: P_LEMOINE, nature: "bet_structure", organisme: "BET Structures de Loire", contact: "Hélène Cadot", email: "h.cadot@bet-loire.exemple", telephone: null, siren: "812345678", lot_id: id("1", 1), actif: true },
  { id: id("2", 3), projet_id: P_LEMOINE, nature: "geometre", organisme: "Cabinet Géomètres Nantais", contact: null, email: null, telephone: "02 40 00 00 00", siren: "423456789", lot_id: null, actif: true },
  { id: id("2", 4), projet_id: P_ENFANCE, nature: "maitre_ouvrage", organisme: "Ville de Vaulx-en-Velin — direction du patrimoine", contact: "Nadia Benali", email: "n.benali@vaulx.exemple", telephone: null, siren: "216902563", lot_id: null, actif: true },
  { id: id("2", 5), projet_id: P_ENFANCE, nature: "controleur_technique", organisme: "Bureau Véritas construction", contact: "Olivier Tassin", email: null, telephone: null, siren: "775690621", lot_id: null, actif: true },
  { id: id("2", 6), projet_id: P_ENFANCE, nature: "coordonnateur_sps", organisme: "SPS Rhône", contact: null, email: null, telephone: null, siren: null, lot_id: null, actif: true },
  { id: id("2", 7), projet_id: P_MARTIN, nature: "maitre_ouvrage", organisme: "Famille Martin", contact: "Julie Martin", email: "j.martin@exemple.fr", telephone: null, siren: null, lot_id: null, actif: true },
  { id: id("2", 8), projet_id: P_MERCIERE, nature: "entreprise", organisme: "Taille de pierre Vieux-Lyon", contact: "Marc Roussel", email: null, telephone: null, siren: "538765432", lot_id: id("1", 8), actif: true },
];

export const MEMBRES_EXEMPLE: MembreProjet[] = [
  { id: id("3", 1), projet_id: P_LEMOINE, user_id: EXEMPLE_MOI, role_projet: "chef_projet" },
  { id: id("3", 2), projet_id: P_LEMOINE, user_id: SOFIA, role_projet: "dessinateur" },
  { id: id("3", 3), projet_id: P_ENFANCE, user_id: YANIS, role_projet: "chef_projet" },
  { id: id("3", 4), projet_id: P_ENFANCE, user_id: EXEMPLE_MOI, role_projet: "associe" },
  { id: id("3", 5), projet_id: P_ENFANCE, user_id: SOFIA, role_projet: "economiste" },
  { id: id("3", 6), projet_id: P_MARTIN, user_id: YANIS, role_projet: "chef_projet" },
  { id: id("3", 7), projet_id: P_MERCIERE, user_id: EXEMPLE_MOI, role_projet: "chef_projet" },
  { id: id("3", 8), projet_id: P_DUBOIS, user_id: CLAIRE, role_projet: "associe" },
  { id: id("3", 9), projet_id: P_DUBOIS, user_id: EXEMPLE_MOI, role_projet: "chef_projet" },
];

/* ——— les cas de rejet tacite (art. R*424-2), tels que le socle les liste ——— */
export const CAS_REJET_EXEMPLE: CasRejet[] = [
  { code: "r424_2_a", article: "R*424-2, a", libelle: "Travaux soumis à autorisation du ministre de la Défense ou de la Culture, ou à une autorisation au titre des sites classés ou des réserves naturelles", source_url: URL_LEGIFRANCE },
  { code: "r424_2_b", article: "R*424-2, b", libelle: "Projet faisant l'objet d'une évocation par le ministre chargé des sites ou des monuments historiques", source_url: URL_LEGIFRANCE },
  { code: "r424_2_c", article: "R*424-2, c", libelle: "Travaux sur un immeuble inscrit au titre des monuments historiques", source_url: URL_LEGIFRANCE },
  { code: "r424_2_d", article: "R*424-2, d", libelle: "Projet soumis à enquête publique", source_url: URL_LEGIFRANCE },
  { code: "r424_2_e", article: "R*424-2, e", libelle: "Projet nécessitant une dérogation aux règles d'accessibilité", source_url: URL_LEGIFRANCE },
  { code: "r424_2_f", article: "R*424-2, f", libelle: "Projet soumis à l'avis conforme du préfet (zones sans PLU)", source_url: URL_LEGIFRANCE },
  { code: "r424_2_ii", article: "R*424-2, II", libelle: "Déclaration préalable : travaux soumis à autorisation du ministre de la Défense ou dans un site classé", source_url: URL_LEGIFRANCE },
  { code: "r424_2_1", article: "R424-2-1", libelle: "Projet soumis à évaluation environnementale (demandes déposées depuis le 31/12/2025)", source_url: URL_LEGIFRANCE },
];

export function dossierExemple(): Dossier {
  return {
    projets: PROJETS_EXEMPLE,
    permis: PERMIS_EXEMPLE,
    datesLues: DATES_LUES_EXEMPLE,
    echeances: ECHEANCES_EXEMPLE,
    recours: RECOURS_EXEMPLE,
    lots: LOTS_EXEMPLE,
    intervenants: INTERVENANTS_EXEMPLE,
    membres: MEMBRES_EXEMPLE,
    casRejet: CAS_REJET_EXEMPLE,
    pieces: PIECES_EXEMPLE,
    noms: {},
    moi: { user_id: EXEMPLE_MOI, client_id: C, role: "valideur" },
  };
}
