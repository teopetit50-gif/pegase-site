// La table des types de pièce par module : ce que le lecteur sait classer et
// extraire selon le module de la pièce (pieces.module). FILED (factures) est
// le module par défaut ; Lorani (urbanisme) et Tamila (avis RPVA des cabinets
// d'avocats) ont leurs types.
// Le schéma d'outil et la consigne de Claude se construisent à partir d'ici,
// ainsi que les règles de statut (champs clés d'un type).

import { CHAMPS_FACTURE, SCHEMA_OUTIL_LECTURE, TYPES_PIECE } from "./facture.ts";
import { SCHEMA_LORANI } from "./lorani.ts";
import { SCHEMA_TAMILA } from "./tamila.ts";

export type TypeChampDeclare = "texte" | "nombre" | "entier" | "date" | "dateheure" | "booleen" | "choix" | "liste";

export interface ChampDeclare {
  champ: string;
  type: TypeChampDeclare;
  description: string;
  /** Longueur maximale (texte). */
  max?: number;
  /** Bornes (entier, nombre). */
  min?: number;
  maximum?: number;
  /** Les valeurs admises (choix), dans la forme rendue (minuscules, sans accent, `_`). */
  choix?: string[];
}

export interface TypeDeclare {
  /** Le type_piece rendu (^[a-z][a-z0-9_]{1,59}$). */
  type: string;
  libelle: string;
  /** Ce que le modèle doit reconnaître. */
  description: string;
  /** Les champs que ce type porte (noms de ChampDeclare du module). */
  champs: string[];
  /** Les champs qui doivent être vérifiés pour que la pièce soit « lue » ; vide = une valeur vérifiée suffit. */
  cles: string[];
  /** Sans clé : la pièce est « lue » même sans aucune valeur (une pièce que le module range sans en rien tirer). */
  lueSansValeur?: boolean;
}

export interface SchemaModule {
  module: string;
  /** La phrase qui dit au modèle ce qu'il lit. */
  presentation: string;
  types: TypeDeclare[];
  champs: ChampDeclare[];
  /** Le module attend des lignes de détail et une ventilation de TVA (factures). */
  lignes: boolean;
}

/** FILED, construit depuis schemas/facture.ts pour ne rien dupliquer. */
export const SCHEMA_FILED: SchemaModule = {
  module: "filed",
  presentation:
    "une plateforme qui lit les pièces comptables des PME françaises (factures, avoirs, bons de commande, bons de livraison, devis, relevés, contrats, attestations d'assurance, tickets)",
  types: TYPES_PIECE.filter((t) => t !== "autre").map((t) => ({
    type: t,
    libelle: t.replace(/_/g, " "),
    description: {
      facture: "une facture (ou un ticket, une note) : un émetteur réclame un paiement à un destinataire",
      avoir: "un avoir : l'émetteur annule ou rembourse tout ou partie d'une facture",
      bon_commande: "un bon de commande",
      bon_livraison: "un bon de livraison",
      devis: "un devis ou une proposition commerciale",
      releve: "un relevé (bancaire, de compte, de consommation)",
      contrat: "un contrat ou des conditions signées",
      attestation_assurance: "une attestation d'assurance",
    }[t] ?? t,
    champs: CHAMPS_FACTURE.map((c) => c.champ),
    cles: t === "facture" || t === "avoir" ? CHAMPS_FACTURE.filter((c) => c.cle).map((c) => c.champ) : [],
  })),
  champs: CHAMPS_FACTURE.map((c) => ({ champ: c.champ, type: c.type, description: c.description, max: c.max })),
  lignes: true,
};

export const SCHEMAS_PAR_MODULE: Record<string, SchemaModule> = {
  filed: SCHEMA_FILED,
  lorani: SCHEMA_LORANI,
  tamila: SCHEMA_TAMILA,
};

/** Le schéma d'un module ; FILED pour un module sans schéma propre (les factures se lisent partout). */
export function schemaPour(module: string | null | undefined): SchemaModule {
  return SCHEMAS_PAR_MODULE[module ?? ""] ?? SCHEMA_FILED;
}

export function champsPour(module: string | null | undefined): ReadonlyMap<string, ChampDeclare> {
  return new Map(schemaPour(module).champs.map((c) => [c.champ, c]));
}

export function typesPour(module: string | null | undefined): string[] {
  return [...schemaPour(module).types.map((t) => t.type), "autre"];
}

/** Le schéma de l'outil lire_piece pour un module : FILED garde le sien à l'identique. */
export function schemaOutilPour(module: string | null | undefined): Record<string, unknown> {
  const s = schemaPour(module);
  if (s.module === "filed") return SCHEMA_OUTIL_LECTURE;
  const base = structuredClone(SCHEMA_OUTIL_LECTURE) as Record<string, unknown>;
  const props = base.properties as Record<string, Record<string, unknown>>;
  props.type_piece = {
    type: "string",
    enum: typesPour(module),
    description: "La nature du document : " + s.types.map((t) => `${t.type} = ${t.description}`).join(" ; ") + " ; autre = rien de tout cela.",
  };
  const valeurs = props.valeurs as Record<string, unknown>;
  const items = valeurs.items as Record<string, unknown>;
  const itemProps = items.properties as Record<string, Record<string, unknown>>;
  itemProps.champ = { type: "string", enum: s.champs.map((c) => c.champ), description: s.champs.map((c) => `${c.champ} : ${c.description}`).join(" ; ") };
  itemProps.valeur = {
    type: ["string", "number", "boolean", "array"],
    items: { type: "string" },
    description: "AAAA-MM-JJ pour les dates" +
      (s.champs.some((c) => c.type === "dateheure") ? ", AAAA-MM-JJTHH:MM (heure locale, sans fuseau) pour une date et heure, AAAA-MM-JJ seul si l'heure n'est pas imprimée" : "") +
      ", nombre entier pour les durées, rangs et numéros de passage, l'une des valeurs admises pour un choix, tableau de textes pour une liste, texte sinon.",
  };
  if (!s.lignes) {
    delete props.lignes;
    delete props.tva_ventilation;
  }
  const decoupage = props.decoupage as Record<string, unknown>;
  const dItems = decoupage.items as Record<string, unknown>;
  (dItems.properties as Record<string, Record<string, unknown>>).type_piece = { type: "string", enum: typesPour(module) };
  return base;
}

/** La consigne système : les règles communes, puis le module et ses types. */
export function consignePour(module: string | null | undefined, reglesCommunes: string): string {
  const s = schemaPour(module);
  const typesTexte = s.types.map((t) => `- ${t.type} : ${t.description}. Champs : ${t.champs.join(", ")}.`).join("\n");
  const champsTexte = s.champs.map((c) => {
    const bornes = c.type === "choix" && c.choix
      ? ` (valeurs admises : ${c.choix.join(", ")})`
      : c.type === "entier" && c.min !== undefined
      ? ` (entier de ${c.min} à ${c.maximum})`
      : c.type === "dateheure"
      ? " (AAAA-MM-JJTHH:MM, heure locale sans fuseau ; AAAA-MM-JJ si l'heure n'est pas imprimée)"
      : "";
    return `- ${c.champ} (${c.type}${bornes}) : ${c.description}`;
  }).join("\n");
  return `Tu es le lecteur d'Omega, ${s.presentation}.\n\n${reglesCommunes}\n\nTypes de pièce du module « ${s.module} » :\n${typesTexte}\n- autre : rien de tout cela (motif court).\n\nChamps :\n${champsTexte}`;
}
