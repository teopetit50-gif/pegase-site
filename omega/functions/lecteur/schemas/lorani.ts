// Lorani — urbanisme : les pièces reçues de la mairie ou de l'huissier sur
// une demande d'autorisation (permis de construire, déclaration préalable…),
// telles que private.lorani_propositions les attend (B5, CHAMPS-LECTURE-LORANI.md).
// Six courriers, lorani_courrier_autre, la situation de travaux (b5_14) et les quatre pièces du contrôle du
// dossier (b5_16 : planche, CCTP, DPGF, règlement du PLU, champs à nom composé) ; dates en AAAA-MM-JJ.
// Les clés suivent les champs « obligatoires » de la fiche de B5 ; les autres champs sont facultatifs.

import type { FamilleChamps, SchemaModule } from "./modules.ts";

/** Les grandeurs mesurées du contrôle du dossier (vocabulaire fermé de B5, b5_16) : l'unité fait partie du nom. */
export const GRANDEURS = [
  "hauteur_faitage_m",
  "hauteur_egout_m",
  "hauteur_acrotere_m",
  "recul_voie_m",
  "recul_limite_m",
  "distance_batiments_m",
  "emprise_sol_m2",
  "emprise_sol_pct",
  "surface_plancher_m2",
  "surface_taxable_m2",
  "espaces_verts_pct",
  "pleine_terre_pct",
  "stationnement_nb",
  "logements_nb",
  "niveaux_nb",
  "pente_toiture_pct",
  "longueur_m",
  "largeur_m",
  "cote_altimetrique_m",
] as const;
const G = GRANDEURS.join("|");

const FAMILLES_CONTROLE: FamilleChamps[] = [
  {
    famille: "mesure.<grandeur>.<objet>",
    motif: `^mesure\\.(${G})\\.[a-z0-9_]{1,40}$`,
    type: "nombre",
    types: ["lorani_planche", "lorani_cctp"],
    description:
      `une mesure lue (cote, surface, nombre), en nombre sans unité. <grandeur> parmi : ${GRANDEURS.join(", ")} ; <objet> = ce qu'elle qualifie, en minuscules sans accent (projet pour le tout, batiment_a, facade_sud, niveau_r1, limite_nord, voie_rue_x…) : deux pièces qui mesurent la même chose rendent le même objet. Une ligne par mesure, avec sa citation et sa page.`,
  },
  {
    famille: "poste.<référence> (CCTP)",
    motif: "^poste\\.[a-z0-9_]{1,40}$",
    type: "texte",
    max: 300,
    types: ["lorani_cctp"],
    description: "un poste décrit au CCTP : valeur = son intitulé ; <référence> = le numéro d'article normalisé (2.3.1 → 2_3_1, GO.04 → go_04).",
  },
  {
    famille: "poste.<référence> (DPGF)",
    motif: "^poste\\.[a-z0-9_]{1,40}$",
    type: "nombre",
    types: ["lorani_dpgf"],
    description: "un poste chiffré à la DPGF : valeur = sa quantité, en nombre ; <référence> normalisée comme au CCTP.",
  },
  {
    famille: "quantite.<référence>",
    motif: "^quantite\\.[a-z0-9_]{1,40}$",
    type: "nombre",
    types: ["lorani_metre", "lorani_planche"],
    description:
      "une quantité mesurée pour un poste (surface, longueur, volume, nombre), en nombre sans unité ; <référence> normalisée comme au CCTP. Sur une planche, seulement la quantité écrite pour ce poste (tu ne mesures rien sur le dessin).",
  },
  {
    famille: "unite.<référence>",
    motif: "^unite\\.[a-z0-9_]{1,40}$",
    type: "texte",
    max: 10,
    types: ["lorani_metre", "lorani_dpgf"],
    description: "l'unité du poste, ramenée à m2, ml, m3, u, kg, t, ens ou h (m² → m2, mètre linéaire → ml, unité / pièce → u, forfait / ensemble → ens).",
  },
  {
    famille: "regle.<grandeur>.max|min",
    motif: `^regle\\.(${G})\\.(max|min)$`,
    type: "nombre",
    types: ["lorani_plu_reglement"],
    description: "une règle chiffrée du règlement du PLU : la valeur maximale ou minimale permise, en nombre sans unité.",
  },
  {
    famille: "regle.<grandeur>.article",
    motif: `^regle\\.(${G})\\.article$`,
    type: "texte",
    max: 40,
    types: ["lorani_plu_reglement"],
    description: "l'article du règlement qui porte la règle, tel qu'écrit (« UB 10 »).",
  },
];

export const DECISIONS_ARRETE = ["accorde", "refuse", "non_opposition", "opposition", "sursis"] as const;
export const TYPES_AUTORISATION = ["pc", "pcmi", "pa", "pd", "dp"] as const;

export const SCHEMA_LORANI: SchemaModule = {
  module: "lorani",
  presentation:
    "le module d'urbanisme d'une plateforme pour PME françaises : il lit les courriers et actes reçus de la mairie, de la préfecture ou d'un commissaire de justice (huissier) à propos d'une demande d'autorisation d'urbanisme (permis de construire, permis d'aménager, déclaration préalable, permis de démolir)",
  types: [
    {
      type: "lorani_recepisse_depot",
      libelle: "récépissé de dépôt",
      description:
        "le récépissé de dépôt d'une demande d'autorisation d'urbanisme, remis par la mairie (Cerfa, cachet « déposé le ») ; OU, pour une demande déposée en ligne, l'accusé de réception électronique (ARE) ou l'accusé d'enregistrement électronique (AEE) envoyé par le guichet numérique d'urbanisme, qui tient lieu de récépissé (art. L.112-11 du CRPA, R*423-3 du code de l'urbanisme) : date_depot = la date de réception (ou d'enregistrement) qu'il indique ; il porte le numéro de dossier (PC, DP, PA, PD + commune + année + numéro), souvent le délai d'instruction de base",
      champs: ["numero_dossier", "date_depot", "type_autorisation", "commune", "demandeur"],
      cles: ["date_depot"],
    },
    {
      type: "lorani_lettre_delai",
      libelle: "lettre de délai",
      description:
        "la lettre de la mairie qui notifie ou modifie le délai d'instruction (majoration, prolongation, délai de base) : un délai en mois et la date de la lettre",
      champs: ["numero_dossier", "delai_mois", "date_lettre", "motif_majoration"],
      cles: ["delai_mois"],
    },
    {
      type: "lorani_demande_pieces",
      libelle: "demande de pièces complémentaires",
      description: "le courrier de la mairie qui demande des pièces manquantes ou complémentaires, désignées par leur code (PC5, PC 8, DP4, PA11…) ou leur nom",
      champs: ["numero_dossier", "date_lettre", "pieces", "delai_reponse_mois"],
      cles: ["date_lettre", "pieces"],
    },
    {
      type: "lorani_arrete",
      libelle: "arrêté",
      description:
        "l'arrêté du maire (ou du préfet) qui décide : permis accordé, refusé, non-opposition à une déclaration préalable, opposition, ou sursis à statuer ; avec sa date",
      champs: ["numero_dossier", "decision", "date_decision", "prescriptions", "date_notification"],
      cles: ["decision", "date_decision"],
    },
    {
      type: "lorani_certificat_tacite",
      libelle: "certificat de décision tacite",
      description:
        "le certificat délivré par la mairie attestant qu'un permis tacite ou une non-opposition tacite est acquis, avec la date à laquelle la décision tacite est née",
      champs: ["numero_dossier", "date_tacite", "date_certificat"],
      cles: ["date_tacite"],
    },
    {
      type: "lorani_constat_affichage",
      libelle: "constat d'affichage",
      description:
        "le procès-verbal de constat d'un commissaire de justice (huissier) attestant l'affichage de l'autorisation sur le terrain : date du constat et numéro du passage (1er, 2e ou 3e)",
      champs: ["numero_dossier", "date_constat", "passage", "commissaire"],
      cles: ["date_constat"],
    },
    {
      type: "lorani_courrier_autre",
      libelle: "autre courrier de la mairie",
      description:
        "un autre courrier de la mairie ou de l'administration sur la demande, qui n'est aucun des six ci-dessus (avis d'une commission, courrier d'information ; un accusé de réception ou d'enregistrement électronique du guichet numérique est un récépissé de dépôt, pas un autre courrier) : seulement sa date s'il en porte une ; un document qui n'est pas un courrier (plan, CCTP, photo) est « autre »",
      champs: ["numero_dossier", "date_lettre"],
      cles: [],
      lueSansValeur: true,
    },
    {
      type: "lorani_situation_travaux",
      libelle: "situation de travaux",
      description:
        "la situation (état d'acompte, projet de décompte mensuel) d'une entreprise de travaux pendant le chantier : le cumul HT des travaux exécutés depuis le début de son marché, envoyé chaque mois à l'architecte pour visa",
      champs: ["cumul_ht", "numero_situation", "mois", "titulaire", "lot", "montant_marche_ht", "cumul_precedent_ht", "montant_periode_ht"],
      cles: ["cumul_ht"],
    },
    {
      type: "lorani_planche",
      libelle: "planche graphique",
      description:
        "une planche graphique d'un dossier de permis ou d'un DCE (plan de masse, plans de niveaux, coupes, façades, notice ; PC1 à PC8, PCMI1 à PCMI8) : sa référence, son indice, et une ligne par mesure lue (mesure.<grandeur>.<objet>) ; tu ne mesures rien sur le dessin, tu ne rends que les cotes et surfaces écrites",
      champs: ["reference", "indice"],
      cles: [],
    },
    {
      type: "lorani_cctp",
      libelle: "CCTP",
      description: "le cahier des clauses techniques particulières d'un lot : le lot, une ligne par poste décrit (poste.<référence>) et les mesures écrites (mesure.<grandeur>.<objet>)",
      champs: ["lot"],
      cles: [],
    },
    {
      type: "lorani_dpgf",
      libelle: "DPGF",
      description: "la décomposition du prix global et forfaitaire d'un lot : le lot, une ligne par poste chiffré (poste.<référence>, valeur = quantité) et son unité (unite.<référence>)",
      champs: ["lot"],
      cles: [],
    },
    {
      type: "lorani_metre",
      libelle: "métré",
      description:
        "le métré d'un lot (par l'économiste) : le lot, et par poste sa quantité mesurée (quantite.<référence>) et son unité (unite.<référence>)",
      champs: ["lot"],
      cles: [],
    },
    {
      type: "lorani_plu_reglement",
      libelle: "règlement du PLU",
      description:
        "le règlement écrit du PLU (ou du PLUi) pour la zone du terrain : la zone, et par règle chiffrée regle.<grandeur>.max ou .min (la valeur) et regle.<grandeur>.article (l'article). Un règlement qui couvre plusieurs zones : seulement les règles de la zone du terrain, quand elle est indiquée dans le message",
      champs: ["zone"],
      cles: [],
    },
  ],
  familles: FAMILLES_CONTROLE,
  champs: [
    {
      champ: "numero_dossier",
      type: "texte",
      max: 60,
      description: "le numéro de dossier de la demande, tel qu'imprimé (ex. PC 069 123 26 A0042, DP 03412 26 00117)",
    },
    { champ: "date_depot", type: "date", description: "la date de dépôt de la demande en mairie ; pour un ARE / AEE du guichet numérique, la date de réception (ou d'enregistrement) qu'il indique" },
    { champ: "delai_mois", type: "entier", min: 1, maximum: 24, description: "le délai d'instruction notifié, en mois (de 1 à 24)" },
    { champ: "date_lettre", type: "date", description: "la date du courrier" },
    {
      champ: "pieces",
      type: "liste",
      description: "les pièces demandées, une par élément, par leur code ou leur nom tels qu'imprimés (PC5, PC 8, DP4, plan de masse…)",
    },
    {
      champ: "decision",
      type: "choix",
      choix: [...DECISIONS_ARRETE],
      description: "la décision de l'arrêté : accorde (permis accordé), refuse, non_opposition, opposition, sursis (sursis à statuer)",
    },
    { champ: "date_decision", type: "date", description: "la date de l'arrêté (date de signature ou de la décision)" },
    { champ: "date_tacite", type: "date", description: "la date à laquelle la décision tacite est acquise" },
    { champ: "date_constat", type: "date", description: "la date du constat d'affichage" },
    { champ: "passage", type: "entier", min: 1, maximum: 3, description: "le numéro du passage de l'huissier (1, 2 ou 3)" },
    {
      champ: "type_autorisation",
      type: "choix",
      choix: [...TYPES_AUTORISATION],
      description:
        "la nature de la demande : pc (permis de construire), pcmi (permis de construire une maison individuelle et/ou ses annexes), pa (permis d'aménager), pd (permis de démolir), dp (déclaration préalable)",
    },
    { champ: "commune", type: "texte", max: 120, description: "la commune où la demande est déposée, telle qu'écrite" },
    { champ: "demandeur", type: "texte", max: 200, description: "le nom du demandeur (personne ou société) tel qu'écrit" },
    {
      champ: "motif_majoration",
      type: "texte",
      max: 300,
      description: "le motif de la majoration ou prolongation du délai, en quelques mots (avis de l'architecte des Bâtiments de France, ERP, enquête publique…)",
    },
    {
      champ: "delai_reponse_mois",
      type: "entier",
      min: 1,
      maximum: 12,
      description: "le délai laissé pour fournir les pièces, en mois (souvent 3), s'il est écrit",
    },
    { champ: "prescriptions", type: "texte", max: 1000, description: "les prescriptions dont l'arrêté assortit la décision, résumées fidèlement" },
    { champ: "date_notification", type: "date", description: "la date de notification de l'arrêté, si elle est écrite" },
    { champ: "date_certificat", type: "date", description: "la date du certificat de décision tacite" },
    { champ: "commissaire", type: "texte", max: 200, description: "le nom du commissaire de justice (huissier) ou de son étude" },
    { champ: "cumul_ht", type: "nombre", description: "situation : le montant HT cumulé des travaux exécutés à ce jour depuis le début du marché" },
    { champ: "numero_situation", type: "entier", min: 1, maximum: 999, description: "situation : son numéro (« Situation n° 3 »)" },
    { champ: "mois", type: "mois", description: "situation : le mois des travaux, en AAAA-MM" },
    { champ: "titulaire", type: "texte", max: 200, description: "situation : la raison sociale de l'entreprise titulaire, telle qu'écrite" },
    { champ: "lot", type: "texte", max: 20, description: "le numéro du lot, tel qu'écrit (« 02 », « 08.1 »)" },
    { champ: "montant_marche_ht", type: "nombre", description: "situation : le montant HT du marché" },
    { champ: "cumul_precedent_ht", type: "nombre", description: "situation : le cumul HT de la situation précédente" },
    { champ: "montant_periode_ht", type: "nombre", description: "situation : le montant HT des travaux du mois" },
    { champ: "reference", type: "texte", max: 40, description: "planche : sa référence (« PC2 », « A-102 »)" },
    { champ: "indice", type: "texte", max: 20, description: "planche : son indice (« B », « ind. C »)" },
    { champ: "zone", type: "texte", max: 20, description: "règlement du PLU : la zone (« UB »)" },
  ],
  lignes: false,
};
