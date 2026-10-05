// Le schéma d'extraction FILED pour une facture ou un avoir.
//
// Source de vérité : ce que lisent réellement private.filed_valeurs,
// private.filed_integrer_facture et private.filed_controler_facture sur la
// recette (relues le 05/10/2026). Les noms de champ sont EXACTS : ni préfixe
// « montant. » ni « date. » sur les scalaires de tête ; « fournisseur.* »,
// « acheteur.* », « commande.reference »… pour le reste ; « lignes » et
// « tva.ventilation » sont des tableaux.
//
// Chaque valeur va dans pieces_valeurs.valeur (jsonb) : nombre pour les
// montants (un texte « 1 234,56 » est aussi accepté par filed_nombre), texte
// 'AAAA-MM-JJ' pour les dates, booléen pour les mentions, tableau pour les
// lignes et la ventilation.

export type TypeChamp = "texte" | "nombre" | "date" | "booleen";

export interface ChampFacture {
  champ: string;
  type: TypeChamp;
  description: string;
  /** Longueur maximale appliquée par FILED (left(..., n)). */
  max?: number;
  /** Le champ compte pour le statut « lue » : s'il n'est pas vérifié, la pièce est « à vérifier ». */
  cle?: boolean;
}

/** Les champs scalaires lus par filed_integrer_facture, dans l'ordre où l'écran les montre. */
export const CHAMPS_FACTURE: ChampFacture[] = [
  { champ: "numero", type: "texte", max: 60, cle: true, description: "Numéro de la facture ou de l'avoir, tel qu'imprimé." },
  { champ: "date", type: "date", cle: true, description: "Date d'émission, en AAAA-MM-JJ." },
  { champ: "echeance", type: "date", description: "Date d'échéance de paiement, en AAAA-MM-JJ." },
  { champ: "devise", type: "texte", max: 3, description: "Devise ISO 4217 à trois lettres ; EUR si rien n'est dit." },
  { champ: "montant_ht", type: "nombre", cle: true, description: "Total hors taxes." },
  { champ: "montant_tva", type: "nombre", cle: true, description: "Total de TVA." },
  { champ: "montant_ttc", type: "nombre", cle: true, description: "Total toutes taxes comprises." },
  { champ: "net_a_payer", type: "nombre", description: "Net à payer s'il diffère du TTC (acompte déduit, retenue…)." },
  { champ: "montant_prepaye", type: "nombre", description: "Acompte ou montant déjà réglé, déduit du net à payer." },
  { champ: "type_code", type: "texte", max: 10, description: "Code de type de document (UNTDID 1001 : 380 facture, 381 avoir…) s'il est imprimé." },
  { champ: "cadre_facturation", type: "texte", max: 10, description: "Cadre de facturation (B1, S1…) s'il est imprimé." },

  { champ: "fournisseur.nom", type: "texte", max: 200, cle: true, description: "Raison sociale de l'émetteur de la facture." },
  { champ: "fournisseur.siren", type: "texte", description: "SIREN de l'émetteur : 9 chiffres (clé Luhn)." },
  { champ: "fournisseur.siret", type: "texte", description: "SIRET de l'émetteur : 14 chiffres." },
  { champ: "fournisseur.tva", type: "texte", description: "Numéro de TVA intracommunautaire de l'émetteur (FRxx + 9 chiffres pour la France)." },
  {
    champ: "fournisseur.id_legal",
    type: "texte",
    max: 60,
    description: "Identifiant légal d'un émetteur étranger sans SIREN ni TVA (numéro de registre, EIN…).",
  },
  { champ: "fournisseur.pays", type: "texte", max: 2, description: "Pays de l'émetteur, code ISO à deux lettres." },
  { champ: "fournisseur.iban", type: "texte", description: "IBAN de règlement indiqué par l'émetteur." },

  { champ: "acheteur.nom", type: "texte", max: 200, description: "Raison sociale du destinataire (le client facturé)." },
  { champ: "acheteur.siren", type: "texte", description: "SIREN du destinataire, 9 chiffres." },
  { champ: "acheteur.siret", type: "texte", description: "SIRET du destinataire, 14 chiffres." },
  { champ: "acheteur.tva", type: "texte", description: "Numéro de TVA intracommunautaire du destinataire." },
  { champ: "acheteur.pays", type: "texte", max: 2, description: "Pays du destinataire, code ISO à deux lettres." },
  { champ: "acheteur.reference", type: "texte", max: 100, description: "Référence acheteur / code client / service exécutant imprimé par l'émetteur." },

  { champ: "commande.reference", type: "texte", max: 100, description: "Numéro du bon de commande rappelé sur la facture." },
  { champ: "livraison.reference", type: "texte", max: 100, description: "Numéro du bon de livraison rappelé sur la facture." },
  { champ: "livraison.date", type: "date", description: "Date de livraison ou de prestation, en AAAA-MM-JJ." },
  { champ: "contrat.reference", type: "texte", max: 100, description: "Référence du contrat ou de l'abonnement." },
  { champ: "facture_origine.reference", type: "texte", max: 100, description: "Pour un avoir : numéro de la facture d'origine." },
  { champ: "facture_origine.date", type: "date", description: "Pour un avoir : date de la facture d'origine, en AAAA-MM-JJ." },

  { champ: "mention.autoliquidation", type: "booleen", description: "true si la pièce porte la mention « autoliquidation » (TVA due par le preneur)." },
  { champ: "mention.franchise_293b", type: "booleen", description: "true si la pièce porte « TVA non applicable, art. 293 B du CGI »." },
];

/** Les colonnes d'une ligne de facture (filed_factures_lignes). */
export const CHAMPS_LIGNE = [
  "numero",
  "reference_vendeur",
  "reference_acheteur",
  "gtin",
  "designation",
  "quantite",
  "unite",
  "prix_unitaire",
  "prix_brut",
  "remise",
  "montant",
  "taux_tva",
  "categorie_tva",
  "commande_ligne",
] as const;

/** Les colonnes d'une ligne de ventilation de TVA (filed_factures_tva). */
export const CHAMPS_VENTILATION = ["categorie", "taux", "base", "montant", "motif"] as const;

/** Les natures de pièce que private.filed_nature_de reconnaît ; tout autre type devient « autre ». */
export const TYPES_PIECE = [
  "facture",
  "avoir",
  "bon_commande",
  "bon_livraison",
  "devis",
  "releve",
  "contrat",
  "attestation_assurance",
  "autre",
] as const;
export type TypePiece = (typeof TYPES_PIECE)[number];

export const CHAMPS_PAR_NOM: ReadonlyMap<string, ChampFacture> = new Map(CHAMPS_FACTURE.map((c) => [c.champ, c]));

export const MAX_LIGNES = 5000;

/** Les champs dont FILED exige qu'ils soient « sûrs » pour reconnaître le fournisseur ou l'acheteur. */
export const CHAMPS_IDENTITE = ["fournisseur.siren", "fournisseur.siret", "fournisseur.tva", "acheteur.siren", "acheteur.siret", "acheteur.tva"];

// ---------------------------------------------------------------------------
// Le schéma de l'outil rendu par Claude (Converse tool use). Un seul outil,
// un seul appel : la sortie structurée complète de la lecture.
// ---------------------------------------------------------------------------

const nombreOuTexte = { type: ["number", "string", "null"] };

export const SCHEMA_OUTIL_LECTURE: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["lisible", "type_piece", "confiance_type", "valeurs"],
  properties: {
    lisible: {
      type: "boolean",
      description: "false si le document est vide, flou ou illisible au point qu'aucune valeur ne peut être citée.",
    },
    motif: { type: "string", description: "Si lisible est false, ou si le type est incertain : pourquoi, en une phrase (≤ 300 caractères)." },
    type_piece: { type: "string", enum: [...TYPES_PIECE], description: "La nature du document." },
    confiance_type: { type: "number", minimum: 0, maximum: 1 },
    manuscrit: { type: "boolean", description: "true si l'essentiel du document est écrit à la main." },
    pages: {
      type: "array",
      description:
        "Seulement quand le document a été fourni en image ou en PDF sans texte : la transcription fidèle de chaque page, dans l'ordre, sans rien omettre ni corriger.",
      items: {
        type: "object",
        required: ["n", "texte"],
        properties: {
          n: { type: "integer", minimum: 1 },
          texte: { type: "string" },
          confiance: { type: "number", minimum: 0, maximum: 1 },
          manuscrit: { type: "boolean" },
        },
      },
    },
    valeurs: {
      type: "array",
      description: "Une entrée par champ trouvé. Jamais de champ absent du document : pas de valeur devinée.",
      items: {
        type: "object",
        required: ["champ", "valeur", "texte", "page"],
        additionalProperties: false,
        properties: {
          champ: { type: "string", enum: CHAMPS_FACTURE.map((c) => c.champ) },
          valeur: {
            type: ["string", "number", "boolean"],
            description: "Nombre pour les montants (point décimal), AAAA-MM-JJ pour les dates, booléen pour les mentions, texte sinon.",
          },
          texte: {
            type: "string",
            description: "La citation EXACTE du document d'où vient la valeur, caractère pour caractère (espaces et virgules compris).",
          },
          page: { type: "integer", minimum: 1, description: "La page où se trouve la citation (1 = première)." },
          confiance: { type: "number", minimum: 0, maximum: 1 },
          boite: {
            type: "object",
            description:
              "Seulement quand le document est fourni en image ou en PDF sans texte : position approximative de la citation sur sa page, en fractions de la largeur et de la hauteur (origine en haut à gauche).",
            required: ["x", "y", "l", "h"],
            properties: {
              x: { type: "number", minimum: 0, maximum: 1 },
              y: { type: "number", minimum: 0, maximum: 1 },
              l: { type: "number", minimum: 0, maximum: 1 },
              h: { type: "number", minimum: 0, maximum: 1 },
            },
          },
        },
      },
    },
    lignes: {
      type: "array",
      description: "Les lignes de détail de la facture, dans l'ordre du document.",
      items: {
        type: "object",
        required: ["designation", "page"],
        properties: {
          numero: { type: ["string", "null"] },
          reference_vendeur: { type: ["string", "null"] },
          reference_acheteur: { type: ["string", "null"] },
          gtin: { type: ["string", "null"] },
          designation: { type: "string", description: "Le libellé, tel qu'imprimé." },
          quantite: nombreOuTexte,
          unite: { type: ["string", "null"] },
          prix_unitaire: nombreOuTexte,
          prix_brut: nombreOuTexte,
          remise: nombreOuTexte,
          montant: { ...nombreOuTexte, description: "Montant HT de la ligne." },
          taux_tva: nombreOuTexte,
          categorie_tva: { type: ["string", "null"], description: "Catégorie UNTDID 5305 (S, Z, E, AE, K, G, O…) si elle est imprimée." },
          commande_ligne: { type: ["string", "null"] },
          page: { type: "integer", minimum: 1 },
        },
      },
    },
    tva_ventilation: {
      type: "array",
      description: "La ventilation de TVA par taux, si le document la donne.",
      items: {
        type: "object",
        required: ["taux", "page"],
        properties: {
          categorie: { type: ["string", "null"] },
          taux: nombreOuTexte,
          base: nombreOuTexte,
          montant: nombreOuTexte,
          motif: { type: ["string", "null"], description: "Motif d'exonération imprimé, s'il y en a un." },
          page: { type: "integer", minimum: 1 },
        },
      },
    },
    decoupage: {
      type: "array",
      description:
        "Seulement si le fichier contient PLUSIEURS documents distincts (plusieurs factures) : un élément par document, avec ses pages. Les valeurs ci-dessus décrivent alors le PREMIER.",
      items: {
        type: "object",
        required: ["pages"],
        properties: {
          pages: { type: "array", items: { type: "integer", minimum: 1 }, minItems: 1 },
          type_piece: { type: "string", enum: [...TYPES_PIECE] },
          numero: { type: ["string", "null"] },
        },
      },
    },
  },
};

/** L'outil de transcription seule, pour les gros documents lus morceau par morceau. */
export const SCHEMA_OUTIL_TRANSCRIPTION: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["pages"],
  properties: {
    pages: {
      type: "array",
      description:
        "La transcription fidèle et complète de chaque page du morceau, dans l'ordre, sans rien omettre ni corriger. n est le numéro de page DANS LE DOCUMENT COMPLET (indiqué dans la consigne).",
      items: {
        type: "object",
        required: ["n", "texte"],
        properties: {
          n: { type: "integer", minimum: 1 },
          texte: { type: "string" },
          confiance: { type: "number", minimum: 0, maximum: 1 },
          manuscrit: { type: "boolean" },
        },
      },
    },
  },
};
