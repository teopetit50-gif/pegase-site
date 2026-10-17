// Les lectures longues de Tamila (B4, 06/10/2026) : pré-lecture, chronologie sourcée, contradictions, bordereau.
// Les champs de « donnees » sont ceux que l'écran et la base de B4 attendent. Tout le résultat part chiffré sous la
// clé du dossier : les noms des parties peuvent y figurer, rien n'en sort en clair.

import type { Constat, TypeAnalyse } from "./moteur.ts";

const PARTIES = ["client", "adverse", "juge", "tiers"];
const LIMITES = { pieces: 200, pages: 3000, pagesParPiece: 400, coutMaxEur: 15 };
const DATE = { type: "string", description: "AAAA-MM-JJ" };

/** Trie par date (les constats sans date à la fin, dans leur ordre). */
function parDate(constats: Constat[]): Constat[] {
  const d = (c: Constat) => (typeof c.donnees.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(c.donnees.date) ? c.donnees.date : "9999-99-99");
  return constats.map((c, i) => ({ c, i })).sort((a, b) => d(a.c).localeCompare(d(b.c)) || a.i - b.i).map((x) => x.c);
}

export const TAMILA_PRELECTURE: TypeAnalyse = {
  type: "tamila.prelecture",
  libelle: "pré-lecture d'un dossier contentieux",
  consigne:
    "Tu prépares la pré-lecture d'un dossier d'avocat : relève les faits, les prétentions (ce que chaque partie demande, montants compris), les moyens (fondements juridiques invoqués) et les pièces visées par les écritures. Indique pour chacun la partie concernée (client, adverse, juge, tiers).",
  codes: ["fait", "pretention", "moyen", "piece_visee"],
  schemaDonnees: {
    properties: {
      partie: { type: "string", enum: PARTIES },
      date: DATE,
      montant_cents: { type: "integer", description: "montant en centimes" },
      fondement: { type: "string", description: "texte invoqué, ex. « art. 1240 C. civ. »" },
      piece_visee: { type: "object", properties: { numero: { type: "string" }, intitule: { type: "string" } } },
    },
    required: ["partie"],
  },
  synthese: true,
  limites: { ...LIMITES, pieces: 60 },
};

export const TAMILA_CHRONOLOGIE: TypeAnalyse = {
  type: "tamila.chronologie",
  libelle: "chronologie sourcée",
  consigne:
    "Relève chaque événement daté du dossier (faits, actes, étapes de procédure, paiements, courriers), avec sa date, sa précision (jour, mois, année, environ), l'acteur et la nature de l'événement. Un même événement cité par plusieurs pièces n'est rendu qu'une fois, avec toutes ses citations.",
  codes: ["evenement"],
  schemaDonnees: {
    properties: {
      date: DATE,
      precision: { type: "string", enum: ["jour", "mois", "annee", "environ"] },
      evenement: { type: "string" },
      acteur: { type: "string", enum: ["client", "adverse", "juge", "expert", "tiers"] },
      acteur_libelle: { type: "string" },
      nature: { type: "string", enum: ["fait", "acte", "procedure", "paiement", "courrier"] },
    },
    required: ["date", "precision", "evenement", "acteur", "nature"],
  },
  synthese: true,
  limites: LIMITES,
  finaliser: parDate,
};

export const TAMILA_CONTRADICTIONS: TypeAnalyse = {
  type: "tamila.contradictions",
  libelle: "contradictions entre pièces",
  consigne:
    "Relève les affirmations qui se contredisent d'une pièce à l'autre (ou dans une même pièce) : une date, un montant, un fait ou la qualité d'une personne. Chaque contradiction cite l'affirmation A puis l'affirmation B, chacune avec sa citation exacte.",
  codes: ["contradiction"],
  schemaDonnees: {
    properties: {
      sujet: { type: "string" },
      portee: { type: "string", enum: ["date", "montant", "fait", "qualite"] },
      affirmation_a: { type: "string" },
      piece_a: { type: "string" },
      affirmation_b: { type: "string" },
      piece_b: { type: "string" },
    },
    required: ["sujet", "portee", "affirmation_a", "piece_a", "affirmation_b", "piece_b"],
  },
  synthese: true,
  limites: LIMITES,
  // Sans les deux citations vérifiées, une contradiction n'est pas « critique » : au plus « attention ».
  finaliser: (constats) =>
    constats.map((c) =>
      c.citations.filter((x) => x.verifiee).length >= 2 || c.gravite !== "critique" ? c : { ...c, gravite: "attention" }
    ),
};

export const TAMILA_BORDEREAU: TypeAnalyse = {
  type: "tamila.bordereau",
  libelle: "bordereau de communication de pièces",
  consigne:
    "Pour chaque pièce du dossier, rends une entrée du bordereau de communication : intitulé descriptif, date de la pièce, nature (contrat, courrier, facture, constat, attestation, décision, conclusions, expertise, photo, autre), identifiant de la pièce et nombre de pages, et toute observation utile. Une entrée par pièce, citée sur sa première page.",
  codes: ["piece"],
  schemaDonnees: {
    properties: {
      numero: { type: "integer" },
      intitule: { type: "string" },
      date: DATE,
      nature: {
        type: "string",
        enum: ["contrat", "courrier", "facture", "constat", "attestation", "decision", "conclusions", "expertise", "photo", "autre"],
      },
      piece: { type: "string" },
      pages: { type: "integer" },
      deja_communiquee: { type: "boolean" },
      observations: { type: "string" },
    },
    required: ["intitule", "nature", "piece", "pages"],
  },
  synthese: false,
  limites: LIMITES,
  // Numérotation continue dans l'ordre chronologique (art. 954 et 768 CPC).
  finaliser: (constats) => parDate(constats).map((c, i) => ({ ...c, donnees: { ...c.donnees, numero: i + 1 } })),
};

/** Le numéro d'une pièce tel que la base le compare : « Pièce n° 12 », « pièce 12 », « P.12 » → « 12 ». */
export function numeroDePiece(v: unknown): string | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const m = String(v).match(/(\d+(?:[.-]\d+)*(?:\s*(?:bis|ter))?)/i);
  return m ? m[1].replace(/\s+/g, " ").toLowerCase() : null;
}

export const TAMILA_PIECES_CITEES: TypeAnalyse = {
  type: "tamila.pieces_citees",
  libelle: "relevé des pièces citées dans les écritures",
  consigne:
    "Tu lis des écritures (conclusions, assignation, dires) et tu relèves CHAQUE pièce qu'elles invoquent : « (pièce n° 12) », « cf. pièce adverse 4 », « voir le constat du 3 mars (pièce 7) ». Une ligne par pièce citée : son numéro tel qu'écrit, son intitulé ou ce qu'en dit l'écriture, sa date si elle est donnée, la partie qui la produit (celle qui l'invoque, sauf « pièce adverse ») et l'identifiant de l'écriture où elle est citée. Cite la phrase où elle apparaît. Tu ne juges pas si elle a été communiquée : la base le compare avec les bordereaux.",
  codes: ["piece_citee"],
  schemaDonnees: {
    properties: {
      numero: { type: "string", description: "le numéro de la pièce tel qu'écrit (« 12 », « 4 bis ») ; vide s'il n'y en a pas" },
      intitule: { type: "string", description: "ce que l'écriture en dit (« contrat de construction du 3 mars 2024 »)" },
      date: DATE,
      partie: { type: "string", enum: PARTIES, description: "la partie qui produit la pièce" },
      ecriture: { type: "string", description: "l'identifiant de l'écriture (pièce du dossier) où elle est citée" },
    },
    required: ["intitule", "partie", "ecriture"],
  },
  synthese: false,
  limites: LIMITES,
  // Une pièce citée plusieurs fois (dans plusieurs écritures ou paragraphes) ne fait qu'une ligne : même partie et même
  // numéro, ou, sans numéro, même intitulé. Ses autres citations restent jointes, et l'ordre suit les numéros.
  finaliser: (constats) => {
    const parCle = new Map<string, Constat>();
    for (const c of constats) {
      const num = numeroDePiece(c.donnees.numero);
      const cle = `${c.donnees.partie ?? "?"}|${num ?? String(c.donnees.intitule ?? "").toLowerCase().replace(/\s+/g, " ").trim()}`;
      const deja = parCle.get(cle);
      if (deja) {
        deja.citations = [...deja.citations, ...c.citations];
        const ecritures = new Set([...(deja.donnees.ecritures as string[] ?? [deja.donnees.ecriture]), c.donnees.ecriture].filter(Boolean) as string[]);
        deja.donnees = { ...deja.donnees, ecritures: [...ecritures] };
      } else {
        parCle.set(cle, { ...c, donnees: { ...c.donnees, numero: num ?? undefined, ecritures: [c.donnees.ecriture].filter(Boolean) } });
      }
    }
    const n = (c: Constat) => {
      const x = parseFloat(String(c.donnees.numero ?? ""));
      return Number.isFinite(x) ? x : Infinity;
    };
    return [...parCle.values()].map((c, i) => ({ c, i })).sort((a, b) =>
      String(a.c.donnees.partie).localeCompare(String(b.c.donnees.partie)) || n(a.c) - n(b.c) || a.i - b.i
    ).map((x) => x.c);
  },
};

export const TYPES_ANALYSE: Record<string, TypeAnalyse> = Object.fromEntries(
  [TAMILA_PRELECTURE, TAMILA_CHRONOLOGIE, TAMILA_CONTRADICTIONS, TAMILA_BORDEREAU, TAMILA_PIECES_CITEES].map((t) => [t.type, t]),
);
