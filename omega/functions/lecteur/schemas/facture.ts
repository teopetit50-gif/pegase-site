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
  {
    champ: "montant_tva",
    type: "nombre",
    cle: true,
    description: "Total de TVA, et rien d'autre : l'octroi de mer (OMR, OMRI) et les autres taxes hors TVA vont dans taxes_autres.",
  },
  { champ: "montant_ttc", type: "nombre", cle: true, description: "Total toutes taxes comprises." },
  { champ: "net_a_payer", type: "nombre", description: "Net à payer s'il diffère du TTC (acompte déduit, retenue…)." },
  { champ: "montant_prepaye", type: "nombre", description: "Acompte ou montant déjà réglé, déduit du net à payer." },
  { champ: "type_code", type: "texte", max: 10, description: "Code de type de document (UNTDID 1001 : 380 facture, 381 avoir…) s'il est imprimé." },
  { champ: "cadre_facturation", type: "texte", max: 10, description: "Cadre de facturation (B1, S1…) s'il est imprimé." },

  { champ: "fournisseur.nom", type: "texte", max: 200, cle: true, description: "Raison sociale de l'émetteur de la facture." },
  {
    champ: "fournisseur.siren",
    type: "texte",
    description:
      "SIREN de l'émetteur : 9 chiffres (clé Luhn). Souvent seulement dans le RCS (« RCS Lyon 552 100 554 », « RC Pointe-à-Pitre B 303 120 638 ») ou en tête du SIRET : rends les 9 chiffres, avec ce passage pour citation.",
  },
  { champ: "fournisseur.siret", type: "texte", description: "SIRET de l'émetteur : 14 chiffres." },
  { champ: "fournisseur.tva", type: "texte", description: "Numéro de TVA intracommunautaire de l'émetteur (FRxx + 9 chiffres pour la France)." },
  {
    champ: "fournisseur.id_legal",
    type: "texte",
    max: 60,
    description: "Identifiant légal d'un émetteur étranger sans SIREN ni TVA (numéro de registre, EIN…).",
  },
  { champ: "fournisseur.pays", type: "texte", max: 2, description: "Pays de l'émetteur, code ISO à deux lettres." },
  {
    champ: "fournisseur.iban",
    type: "texte",
    description:
      "IBAN de règlement indiqué par l'émetteur. S'il est en partie masqué ou coupé (« FR76 •••• 1234 », « FR76 3000… »), rends-le quand même tel qu'imprimé, caractères masqués compris : il sera marqué à vérifier.",
  },

  { champ: "acheteur.nom", type: "texte", max: 200, description: "Raison sociale du destinataire (le client facturé)." },
  { champ: "acheteur.siren", type: "texte", description: "SIREN du destinataire, 9 chiffres (aussi dans son RCS ou en tête de son SIRET)." },
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
  {
    champ: "mention.exoneration",
    type: "texte",
    max: 300,
    description:
      "La mention d'exonération de TVA, telle qu'imprimée (« Exonération de TVA conformément à l'article 295 du CGI », « art. 262 ter I du CGI »…), hors franchise 293 B.",
  },
  {
    champ: "mention.tva_debits",
    type: "booleen",
    description: "true si la pièce porte « option pour le paiement de la taxe d'après les débits » (ou « TVA acquittée sur les débits »).",
  },

  { champ: "contre_valeur.taux_change", type: "nombre", description: "Facture en devise étrangère : le taux de conversion en euros imprimé." },
  { champ: "contre_valeur.montant_tva_eur", type: "nombre", description: "Facture en devise étrangère : le montant de la TVA en euros (contre-valeur)." },
  { champ: "contre_valeur.montant_ttc_eur", type: "nombre", description: "Facture en devise étrangère : le total TTC en euros, s'il est imprimé." },

  {
    champ: "mention.escompte",
    type: "texte",
    max: 300,
    description: "Conditions d'escompte pour paiement anticipé, telles qu'imprimées (y compris « pas d'escompte pour paiement anticipé »).",
  },
  { champ: "mention.penalites", type: "texte", max: 300, description: "Conditions des pénalités de retard, telles qu'imprimées." },
  { champ: "penalites.taux", type: "nombre", description: "Taux des pénalités de retard, en pourcentage, s'il est chiffré (pas « 3 fois le taux légal »)." },
  {
    champ: "mention.indemnite_recouvrement",
    type: "booleen",
    description: "true si la pièce mentionne l'indemnité forfaitaire pour frais de recouvrement (art. L.441-10 et D.441-5 du code de commerce).",
  },
  { champ: "indemnite_recouvrement.montant", type: "nombre", description: "Montant de l'indemnité forfaitaire pour frais de recouvrement, en euros (40 en général)." },
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

/**
 * Les documents de chantier (19/10, décision de Teo : ils vont à Daliro ; B6, DEMANDE-SOCLE-documents-chantier § 1).
 * Ils arrivent par FILED, dont le schéma les reconnaît ; FILED les classe, Daliro les reçoit. Hors TYPES_PIECE :
 * les natures de facture ne changent pas.
 */
export const TYPES_CHANTIER = ["chantier_pv_reserves", "chantier_plan", "chantier_note_technique"] as const;

/** Les champs scalaires des documents de chantier (« date » est celui des factures, même sens). */
export const CHAMPS_CHANTIER: ChampFacture[] = [
  { champ: "date_pv", type: "date", description: "PV de réserves : date du procès-verbal (OPR, réception, levée), en AAAA-MM-JJ." },
  { champ: "maitre_ouvrage", type: "texte", max: 200, description: "Document de chantier : le maître d'ouvrage, tel qu'écrit." },
  { champ: "operation", type: "texte", max: 200, description: "PV de réserves : l'opération ou le bâtiment, tel qu'écrit." },
  { champ: "redacteur", type: "texte", max: 200, description: "PV de réserves : le rédacteur (maître d'œuvre), tel qu'écrit." },
  {
    champ: "titre",
    type: "texte",
    max: 300,
    description:
      "Plan ou note technique : le titre, tel qu'écrit (cartouche ou en-tête) ; à défaut, le premier intitulé écrit qui désigne le dessin (« Détail sur scellement n° 1 », « Plan de fondations »), jamais un intitulé inventé.",
  },
  { champ: "numero_plan", type: "texte", max: 60, description: "Plan : le numéro du plan, tel qu'écrit (« Plan 101 » → « 101 », « N° S-101 » → « S-101 »)." },
  { champ: "indice", type: "texte", max: 20, description: "Plan : l'indice de révision (A, B, 02…)." },
  { champ: "echelle", type: "texte", max: 30, description: "Plan : l'échelle, telle qu'écrite (« 1/50 »)." },
  { champ: "phase", type: "texte", max: 30, description: "Plan : la phase (ESQ, APS, APD, PRO, DCE, EXE…), telle qu'écrite." },
  { champ: "auteur", type: "texte", max: 200, description: "Plan ou note technique : l'auteur (architecte, bureau d'études), tel qu'écrit." },
];

/** Le relevé d'heures d'un intérimaire (19/10, décision du bureau) : hors TYPES_PIECE, comme les documents de chantier. */
export const CHAMPS_RELEVE_HEURES: ChampFacture[] = [
  { champ: "agence", type: "texte", max: 200, description: "Relevé d'heures : l'agence d'intérim, telle qu'écrite." },
  { champ: "interimaire", type: "texte", max: 200, description: "Relevé d'heures : l'intérimaire, tel qu'écrit." },
  { champ: "client", type: "texte", max: 200, description: "Relevé d'heures : l'entreprise utilisatrice (le client de l'agence), telle qu'écrite." },
  { champ: "periode_du", type: "date", description: "Relevé d'heures : début de la période, en AAAA-MM-JJ, s'il est écrit." },
  { champ: "periode_au", type: "date", description: "Relevé d'heures : fin de la période, en AAAA-MM-JJ, s'il est écrit." },
  { champ: "total_heures", type: "nombre", description: "Relevé d'heures : le total d'heures écrit sur le relevé (7h30 = 7.5), pas une somme refaite." },
  {
    champ: "signature_client",
    type: "booleen",
    description: "Relevé d'heures : true si la signature du client est visible ; false si la case de signature est visiblement vide ; rien si on ne peut pas le voir.",
  },
];

/** Les colonnes d'une ligne d'heures (valeur « lignes » d'un relevé d'heures). */
export const CHAMPS_LIGNE_HEURES = ["date", "heures", "taux"] as const;

/** Les colonnes d'une réserve (valeur « reserves ») et d'une disposition (valeur « dispositions »). */
export const CHAMPS_RESERVE = ["numero", "localisation", "lot", "entreprise", "description", "echeance", "delai"] as const;
export const CHAMPS_DISPOSITION = ["texte", "reference"] as const;

/** Les colonnes d'une taxe hors TVA (octroi de mer…), valeur « taxes.autres » (nom convenu avec A4, a4_58). */
export const CHAMPS_TAXE = ["code", "libelle", "base", "taux", "montant"] as const;
export const CODES_TAXE = ["OMR", "OMRI", "autre"] as const;

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
    type_piece: {
      type: "string",
      enum: [...TYPES_PIECE, ...TYPES_CHANTIER, "releve_heures"],
      description:
        "La nature du document. Documents de chantier : chantier_pv_reserves = PV de réserves (OPR, réception, levée) ; chantier_plan = plan ou cartouche de plan ; chantier_note_technique = note technique ou de calcul, dispositions constructives. releve_heures = relevé d'heures d'un intérimaire.",
    },
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
          champ: { type: "string", enum: [...CHAMPS_FACTURE, ...CHAMPS_CHANTIER, ...CHAMPS_RELEVE_HEURES].map((c) => c.champ) },
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
      description:
        "La ventilation de TVA par taux, dès que le document porte un montant de TVA ou une exonération : une entrée par taux ; la base exonérée en catégorie E, taux 0, avec son motif. Jamais l'octroi de mer, qui va dans taxes_autres.",
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
    lignes_heures: {
      type: "array",
      description:
        "Relevé d'heures seulement : une entrée par jour travaillé, telle qu'écrite. Rien de deviné : pas de date déduite d'un jour de semaine, un taux seulement s'il est écrit.",
      items: {
        type: "object",
        required: ["date", "heures", "page"],
        properties: {
          date: { type: "string", description: "La date du jour, en AAAA-MM-JJ." },
          heures: { ...nombreOuTexte, description: "Les heures du jour (7h30 = 7.5)." },
          taux: { ...nombreOuTexte, description: "Le taux horaire, seulement s'il est écrit sur la ligne." },
          page: { type: "integer", minimum: 1 },
        },
      },
    },
    reserves: {
      type: "array",
      description:
        "PV de réserves seulement : chaque réserve, dans l'ordre du document. Rien de deviné : une échéance seulement si une date est écrite ; un délai tel qu'écrit (« 15 jours ») ; pas de lot ni d'entreprise déduits d'ailleurs.",
      items: {
        type: "object",
        required: ["description", "page"],
        properties: {
          numero: { type: ["string", "null"], description: "Le numéro de la réserve, tel qu'écrit." },
          localisation: { type: ["string", "null"], description: "Le logement, la pièce ou l'ouvrage concerné." },
          lot: { type: ["string", "null"], description: "Le lot, tel qu'écrit." },
          entreprise: { type: ["string", "null"], description: "L'entreprise désignée, telle qu'écrite." },
          description: { type: "string", description: "La réserve, telle qu'écrite." },
          echeance: { type: ["string", "null"], description: "La date de levée, en AAAA-MM-JJ, seulement si elle est écrite." },
          delai: { type: ["string", "null"], description: "Le délai tel qu'écrit (« 15 jours »)." },
          page: { type: "integer", minimum: 1 },
        },
      },
    },
    dispositions: {
      type: "array",
      description: "Note technique seulement : chaque disposition constructive prescrite, dans l'ordre, avec la norme ou l'article cité s'il est écrit.",
      items: {
        type: "object",
        required: ["texte", "page"],
        properties: {
          texte: { type: "string", description: "La disposition, telle qu'écrite." },
          reference: { type: ["string", "null"], description: "La norme ou l'article cité (« Eurocode 8 », « NF P 06-013 »), s'il est écrit." },
          page: { type: "integer", minimum: 1 },
        },
      },
    },
    taxes_autres: {
      type: "array",
      description:
        "Les taxes et droits facturés EN PLUS de la TVA, une entrée par taxe imprimée : octroi de mer (OMR), octroi de mer régional (OMRI), autre taxe (éco-contribution, taxe spéciale…). Jamais la TVA elle-même, qui va dans tva_ventilation.",
      items: {
        type: "object",
        required: ["code", "montant", "page"],
        properties: {
          code: { type: "string", enum: [...CODES_TAXE], description: "OMR = octroi de mer ; OMRI = octroi de mer régional ; autre = toute autre taxe hors TVA." },
          libelle: { type: ["string", "null"], description: "Le libellé imprimé (« OMR », « Octroi de mer régional »)." },
          base: nombreOuTexte,
          taux: { ...nombreOuTexte, description: "Le taux en pourcentage (2,5 pour « 2,5 % »)." },
          montant: { ...nombreOuTexte, description: "Le montant de la taxe." },
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
