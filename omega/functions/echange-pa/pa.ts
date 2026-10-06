// Interface générique d'une plateforme agréée (PA) de la réforme de la facture électronique.
// L'ouvrier ne connaît qu'elle ; chaque PA a son adaptateur (afnor.ts : l'API normalisée
// AFNOR XP Z12-013, service « Flow »). Quatre gestes :
//   déposer une facture émise, relever les flux (factures reçues, statuts, accusés),
//   télécharger un flux, déposer un statut de cycle de vie (message CDAR).
// Un statut de cycle de vie est lui-même un flux (syntaxe CDAR) : il se dépose et se relève
// comme une facture.

/** Syntaxe du fichier, valeurs de la norme. */
export type Syntaxe = "Factur-X" | "UBL" | "CII" | "CDAR" | "FRR";
/** Profil, valeurs de la norme (facultatif). */
export type Profil = "Basic" | "CIUS" | "Extended-CTC-FR";
/** Règle de traitement, valeurs de la norme (facultative : la PA la calcule sinon). */
export type Regle =
  | "B2B"
  | "B2BInt"
  | "B2C"
  | "B2G"
  | "B2GInt"
  | "OutOfScope"
  | "B2GOutOfScope"
  | "ArchiveOnly"
  | "NotApplicable";
export type Sens = "entrant" | "sortant";
/** Accusé de la PA sur un flux : en attente de traitement, accepté, en erreur. */
export type Accuse = "en_attente" | "ok" | "erreur";

export type DetailAccuse = {
  niveau: string | null;
  element: string | null;
  code: string | null;
  message: string | null;
};

/** Ce que l'ouvrier dépose (facture émise ou message CDAR). */
export type FluxADeposer = {
  /** Clé d'idempotence côté PA (trackingId de la norme) : toujours l'id Omega de l'objet. */
  suivi: string;
  nom: string;
  syntaxe: Syntaxe;
  profil?: Profil | null;
  regle?: Regle | null;
  octets: Uint8Array<ArrayBuffer>;
  typeMime: string;
};

export type FluxDepose = {
  flux: string;
  depose_le: string | null;
  sha256: string | null;
};

/** Un flux tel que la PA le décrit au relevé. */
export type FluxReleve = {
  flux: string;
  suivi: string | null;
  nom: string;
  sens: Sens;
  /** Type de flux de la norme (CustomerInvoice, SupplierInvoice, CustomerInvoiceLC…). */
  type: string;
  syntaxe: string;
  profil: string | null;
  regle: string | null;
  depose_le: string;
  maj_le: string;
  accuse: Accuse;
  details: DetailAccuse[];
};

export type Fichier = { octets: Uint8Array<ArrayBuffer>; typeMime: string };

export interface PlateformeAgreee {
  /** Nom court de l'adaptateur, porté au journal et au résultat des travaux. */
  readonly nom: string;
  deposer(flux: FluxADeposer): Promise<FluxDepose>;
  /** Flux mis à jour strictement après `depuis` (entrants et sortants), du plus ancien au plus récent. */
  relever(depuis: Date | null, limite: number): Promise<FluxReleve[]>;
  /** Le document d'origine d'un flux (la facture reçue, le CDAR reçu). */
  telecharger(flux: string): Promise<Fichier>;
  sante(): Promise<boolean>;
}

/** Erreur d'une PA, classée : définitive (le même dépôt échouera toujours) ou transitoire. */
export class ErreurPA extends Error {
  constructor(
    public readonly statut: number,
    message: string,
    public readonly definitive: boolean,
  ) {
    super(message);
    this.name = "ErreurPA";
  }
}

/**
 * Classement des statuts HTTP de la norme. 400, 404, 413, 422 : le contenu est en cause,
 * le rejouer ne sert à rien. 401 et 403 : compte ou droits de la PA, à corriger par
 * un humain, mais le dépôt lui-même reste bon : transitoire (il repartira une fois le compte
 * réparé). 408, 409, 425, 429, 5xx, réseau : transitoire.
 */
export function definitivePourStatut(statut: number): boolean {
  return statut === 400 || statut === 404 || statut === 413 || statut === 422;
}

/** Les quatorze statuts de cycle de vie de la réforme (codes 200 à 213). */
export const STATUTS_CYCLE_DE_VIE: Readonly<Record<string, string>> = {
  "200": "Déposée",
  "201": "Émise par la plateforme",
  "202": "Reçue par la plateforme",
  "203": "Mise à disposition",
  "204": "Prise en charge",
  "205": "Approuvée",
  "206": "Approuvée partiellement",
  "207": "En litige",
  "208": "Suspendue",
  "209": "Complétée",
  "210": "Refusée",
  "211": "Paiement transmis",
  "212": "Encaissée",
  "213": "Rejetée",
};
/** Obligatoires et transmis à l'administration. */
export const STATUTS_OBLIGATOIRES = new Set(["200", "210", "212", "213"]);
/** Ceux qu'une entreprise (et donc Omega pour elle) émet ; les autres viennent des plateformes. */
export const STATUTS_EMIS_PAR_L_ENTREPRISE = new Set([
  "204",
  "205",
  "206",
  "207",
  "208",
  "209",
  "210",
  "211",
  "212",
]);
