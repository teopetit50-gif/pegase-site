// Lorani — urbanisme : les pièces reçues de la mairie ou de l'huissier sur
// une demande d'autorisation (permis de construire, déclaration préalable…),
// telles que private.lorani_propositions les attend (B5, CHAMPS-LECTURE-LORANI.md).
// Six courriers, lorani_courrier_autre, la situation de travaux (b5_14) et les quatre pièces du contrôle du
// dossier (b5_16 : planche, CCTP, DPGF, règlement du PLU, champs à nom composé) ; dates en AAAA-MM-JJ.
// Les clés suivent les champs « obligatoires » de la fiche de B5 ; les autres champs sont facultatifs.
// Les pièces de chantier (b5_51, 25/10) : ordre de service, avenant, procès-verbal de réception ; la base en tire une
// lecture « à confirmer » (lorani_lectures_chantier), rien n'entre au marché sans le geste d'un membre.

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
  // b5_21 : RE2020, accessibilité, sécurité incendie
  "surface_habitable_m2",
  "sref_m2",
  "largeur_porte_m",
  "largeur_cheminement_m",
  "largeur_degagement_m",
  "pente_rampe_pct",
  "ressaut_m",
  "distance_escalier_m",
  "effectif_nb",
  "degagements_nb",
] as const;

/** Les indicateurs d'une attestation RE2020 (b5_21) : valeur du projet, et seuil sous le suffixe _max. */
export const INDICATEURS_RE2020 = ["bbio", "cep", "cep_nr", "ic_energie", "ic_construction", "dh"] as const;
const G = GRANDEURS.join("|");

const FAMILLES_CONTROLE: FamilleChamps[] = [
  {
    famille: "mesure.<grandeur>.<objet>",
    motif: `^mesure\\.(${G})\\.[a-z0-9_]{1,40}$`,
    type: "nombre",
    types: ["lorani_planche", "lorani_cctp", "lorani_cerfa", "lorani_attestation_re2020", "lorani_plan_bet", "lorani_notice"],
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
    types: ["lorani_metre", "lorani_planche", "lorani_offre"],
    description:
      "une quantité mesurée pour un poste (surface, longueur, volume, nombre), en nombre sans unité ; <référence> normalisée comme au CCTP. Sur une planche, seulement la quantité écrite pour ce poste (tu ne mesures rien sur le dessin).",
  },
  {
    famille: "prix_unitaire.<référence>",
    motif: "^prix_unitaire\\.[a-z0-9_]{1,40}$",
    type: "nombre",
    types: ["lorani_offre", "lorani_dpgf"],
    description: "le prix unitaire HT du poste, en euros, nombre sans unité ; <référence> = celle de la DPGF (8.1 → 8_1), ou celle de l'entreprise pour un poste qu'elle ajoute.",
  },
  {
    famille: "montant.<référence>",
    motif: "^montant\\.[a-z0-9_]{1,40}$",
    type: "nombre",
    types: ["lorani_offre", "lorani_dpgf"],
    description: "le montant HT du poste, en euros, nombre sans unité. Un poste vide, « néant » ou « inclus » n'est pas rendu ; « 0 » écrit est rendu 0.",
  },
  {
    famille: "reserve.<n>",
    motif: "^reserve\\.[0-9]{1,3}$",
    type: "texte",
    max: 500,
    types: ["lorani_offre"],
    description: "une réserve, variante ou exclusion écrite par l'entreprise, recopiée (une par numéro : reserve.1, reserve.2…).",
  },
  {
    famille: "unite.<référence>",
    motif: "^unite\\.[a-z0-9_]{1,40}$",
    type: "texte",
    max: 10,
    types: ["lorani_metre", "lorani_dpgf", "lorani_offre"],
    description: "l'unité du poste, ramenée à m2, ml, m3, u, kg, t, ens ou h (m² → m2, mètre linéaire → ml, unité / pièce → u, forfait / ensemble → ens).",
  },
  {
    famille: "re2020.<indicateur>[_max]",
    motif: `^re2020\\.(${INDICATEURS_RE2020.join("|")})(_max)?$`,
    type: "nombre",
    types: ["lorani_attestation_re2020"],
    description:
      `un indicateur de l'attestation RE2020, en nombre sans unité : la valeur du projet (re2020.bbio) et le seuil réglementaire (re2020.bbio_max). Indicateurs : ${INDICATEURS_RE2020.join(", ")}.`,
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

/** Le vocabulaire des activités garanties (b5_18, le même que lorani_lots.activites_requises). */
export const ACTIVITES_BTP = [
  "demolition", "terrassement", "vrd", "amelioration_sols", "fondations_speciales", "maconnerie_beton_arme", "pierre_taille",
  "charpente_bois", "charpente_metallique", "couverture", "etancheite_toiture", "etancheite_cuvelage", "facades_rideaux", "bardage",
  "menuiseries_exterieures", "ite", "ravalement", "menuiseries_interieures", "platrerie", "serrurerie", "vitrerie", "peinture",
  "revetements_durs", "revetements_souples", "isolation_interieure", "plomberie", "chauffage", "ventilation", "electricite",
  "photovoltaique", "ascenseurs", "ssi", "piscines", "amiante",
] as const;

export const DECISIONS_ARRETE = ["accorde", "refuse", "non_opposition", "opposition", "sursis"] as const;
export const TYPES_AUTORISATION = ["pc", "pcmi", "pa", "pd", "dp"] as const;
/** La nature d'un ordre de service (b5_19, b5_51). */
export const NATURES_OS = ["demarrage", "travaux_modificatifs", "travaux_supplementaires", "arret", "reprise", "autre"] as const;
/** Les colonnes d'une réserve d'un PV de réception (b5_51 lit intitule, lot, localisation, lever_avant). */
export const CHAMPS_RESERVE_LORANI = ["intitule", "lot", "localisation", "lever_avant"] as const;

export const SCHEMA_LORANI: SchemaModule = {
  module: "lorani",
  presentation:
    "le module d'urbanisme et de suivi de chantier d'une plateforme pour PME françaises : il lit les courriers et actes reçus de la mairie, de la préfecture ou d'un commissaire de justice (huissier) à propos d'une demande d'autorisation d'urbanisme (permis de construire, permis d'aménager, déclaration préalable, permis de démolir), les pièces du dossier, et, pendant le chantier, les pièces des marchés de travaux (situations, ordres de service, avenants, procès-verbaux de réception)",
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
      description: "la décomposition du prix global et forfaitaire d'un lot : le lot, une ligne par poste chiffré (poste.<référence>, valeur = quantité) et son unité (unite.<référence>) ; si la maîtrise d'œuvre l'a chiffrée (estimation), prix_unitaire.<référence> et montant.<référence>",
      champs: ["lot"],
      cles: [],
    },
    {
      type: "lorani_offre",
      libelle: "offre d'entreprise",
      description:
        "l'offre d'une entreprise pour un lot (DPGF remplie, devis, bordereau) : l'entreprise, son SIREN, le lot, le montant total HT, et par poste prix_unitaire.<référence>, quantite.<référence> (si écrite), montant.<référence>, unite.<référence>, avec les références de la DPGF ; chaque réserve, variante ou exclusion en reserve.<n>. Montants HT seulement",
      champs: ["entreprise", "siren", "lot", "montant_total_ht"],
      cles: ["entreprise", "montant_total_ht"],
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
      type: "lorani_attestation_decennale",
      libelle: "attestation décennale",
      description:
        "l'attestation d'assurance de responsabilité civile décennale d'une entreprise (modèle de l'arrêté du 5 janvier 2016) : assureur, police, assuré, SIREN, activités garanties, période de validité, plafond par sinistre",
      champs: ["assureur", "numero_police", "assure", "siren", "activites", "debut", "fin", "plafond_eur"],
      cles: ["assure", "activites", "debut", "fin", "plafond_eur"],
    },
    {
      type: "lorani_cerfa",
      libelle: "formulaire Cerfa",
      description:
        "le formulaire Cerfa de la demande (13406, 13409…) : les surfaces et nombres déclarés, en mesure.<grandeur>.projet (surface_plancher_m2, emprise_sol_m2, surface_taxable_m2, logements_nb, stationnement_nb, niveaux_nb)",
      champs: ["numero_dossier", "type_autorisation", "commune", "demandeur"],
      cles: [],
    },
    {
      type: "lorani_attestation_re2020",
      libelle: "attestation RE2020",
      description:
        "l'attestation de prise en compte de la RE2020 (au dépôt du permis ou à l'achèvement) : par indicateur re2020.<indicateur> et son seuil re2020.<indicateur>_max, et les surfaces en mesure.sref_m2.projet, mesure.surface_plancher_m2.projet",
      champs: [],
      cles: [],
    },
    {
      type: "lorani_plan_bet",
      libelle: "plan de bureau d'études",
      description:
        "un plan ou fond de plan d'un bureau d'études (structure, fluides) : les mesures écrites en mesure.<grandeur>.<objet>, avec les MÊMES objets que les planches de l'architecte (trémies, cotes, largeurs)",
      champs: ["reference", "indice", "lot"],
      cles: [],
    },
    {
      type: "lorani_notice",
      libelle: "notice",
      description:
        "une notice (accessibilité, sécurité incendie, descriptive) : les mesures qu'elle chiffre (effectif, dégagements, largeurs de portes et de cheminements, pentes de rampes, ressauts) en mesure.<grandeur>.<objet>",
      champs: ["reference"],
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
    {
      type: "lorani_ordre_service",
      libelle: "ordre de service",
      description:
        "un ordre de service (OS) de la maîtrise d'œuvre ou du maître d'ouvrage à une entreprise de travaux : démarrage, travaux modificatifs ou supplémentaires, arrêt ou reprise du chantier ; son numéro, sa date d'émission, sa date de notification, son incidence sur le montant HT (négative pour une moins-value) et sur le délai en jours (négative pour une réduction), le titulaire et le lot",
      champs: ["objet", "date_emission", "numero_os", "nature", "date_notification", "montant_ht", "delai_jours", "titulaire", "lot"],
      cles: ["objet", "date_emission"],
    },
    {
      type: "lorani_avenant",
      libelle: "avenant au marché",
      description:
        "un avenant au marché d'une entreprise de travaux : son objet, son montant HT (positif pour une plus-value, négatif pour une moins-value), son numéro, sa date de signature (seulement si l'avenant est signé et daté), le nouveau montant HT du marché s'il est écrit, le titulaire et le lot",
      champs: ["objet", "montant_ht", "numero_avenant", "date_signature", "montant_marche_ht", "titulaire", "lot"],
      cles: ["objet", "montant_ht"],
    },
    {
      type: "lorani_pv_reception",
      libelle: "procès-verbal de réception",
      description:
        "un procès-verbal de réception des travaux (ou des opérations préalables à la réception, OPR), avec ou sans réserves : la date de réception, s'il s'agit d'OPR, la mention « avec » ou « sans » réserves, le délai de levée en jours, et chaque réserve dans « reserves », dans l'ordre du PV",
      champs: ["date_reception", "origine", "avec_reserves", "delai_levee_jours", "reserves"],
      cles: ["date_reception"],
    },
  ],
  familles: FAMILLES_CONTROLE,
  reserves: {
    colonnes: [...CHAMPS_RESERVE_LORANI],
    principal: "intitule",
    description:
      "PV de réception seulement : chaque réserve, dans l'ordre du PV, telle qu'écrite. Rien de deviné : un lot ou une localisation seulement s'ils sont écrits, une date de levée seulement si elle est écrite.",
    proprietes: {
      intitule: { type: "string", description: "La réserve, telle qu'écrite." },
      lot: { type: ["string", "null"], description: "Le lot, tel qu'écrit (« 02 », « Menuiseries »)." },
      localisation: { type: ["string", "null"], description: "Le logement, la pièce ou l'ouvrage concerné." },
      lever_avant: { type: ["string", "null"], description: "La date avant laquelle la lever, en AAAA-MM-JJ, seulement si elle est écrite." },
    },
  },
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
    { champ: "date_notification", type: "date", description: "la date de notification de l'arrêté ou de l'ordre de service, si elle est écrite" },
    { champ: "date_certificat", type: "date", description: "la date du certificat de décision tacite" },
    { champ: "commissaire", type: "texte", max: 200, description: "le nom du commissaire de justice (huissier) ou de son étude" },
    { champ: "cumul_ht", type: "nombre", description: "situation : le montant HT cumulé des travaux exécutés à ce jour depuis le début du marché" },
    { champ: "numero_situation", type: "entier", min: 1, maximum: 999, description: "situation : son numéro (« Situation n° 3 »)" },
    { champ: "mois", type: "mois", description: "situation : le mois des travaux, en AAAA-MM" },
    { champ: "titulaire", type: "texte", max: 200, description: "situation, ordre de service, avenant : la raison sociale de l'entreprise titulaire, telle qu'écrite" },
    { champ: "lot", type: "texte", max: 20, description: "le numéro du lot, tel qu'écrit (« 02 », « 08.1 »)" },
    { champ: "montant_marche_ht", type: "nombre", description: "situation : le montant HT du marché ; avenant : le nouveau montant HT du marché, s'il est écrit" },
    { champ: "cumul_precedent_ht", type: "nombre", description: "situation : le cumul HT de la situation précédente" },
    { champ: "montant_periode_ht", type: "nombre", description: "situation : le montant HT des travaux du mois" },
    { champ: "reference", type: "texte", max: 40, description: "planche : sa référence (« PC2 », « A-102 »)" },
    { champ: "indice", type: "texte", max: 20, description: "planche : son indice (« B », « ind. C »)" },
    { champ: "zone", type: "texte", max: 20, description: "règlement du PLU : la zone (« UB »)" },
    { champ: "assureur", type: "texte", max: 120, description: "attestation décennale : la compagnie d'assurance (« SMABTP »)" },
    { champ: "numero_police", type: "texte", max: 60, description: "attestation décennale : le numéro du contrat (police), tel qu'imprimé" },
    { champ: "assure", type: "texte", max: 200, description: "attestation décennale : la raison sociale de l'assuré, telle qu'écrite" },
    { champ: "siren", type: "texte", max: 11, description: "attestation décennale, offre : le SIREN de l'assuré ou de l'entreprise, neuf chiffres (les 9 premiers d'un SIRET)" },
    { champ: "entreprise", type: "texte", max: 200, description: "offre : la raison sociale de l'entreprise, telle qu'écrite" },
    { champ: "montant_total_ht", type: "nombre", description: "offre : le montant total HT de l'offre, en euros, nombre sans unité" },
    {
      champ: "activites",
      type: "liste",
      choix: [...ACTIVITES_BTP],
      description:
        "attestation décennale : les activités garanties, ramenées au vocabulaire (la plus proche si l'intitulé diffère : « maçonnerie et béton armé » → maconnerie_beton_arme, « isolation thermique par l'extérieur » → ite) ; une ligne, un tableau",
    },
    { champ: "debut", type: "date", description: "attestation décennale : début de la période de validité" },
    { champ: "fin", type: "date", description: "attestation décennale : fin de la période de validité" },
    {
      champ: "plafond_eur",
      type: "nombre",
      description: "attestation décennale : le plafond de garantie par sinistre pour les ouvrages non soumis à l'obligation d'assurance, en euros, nombre sans unité",
    },
    { champ: "objet", type: "texte", max: 300, description: "ordre de service, avenant : son objet, tel qu'écrit" },
    { champ: "date_emission", type: "date", description: "ordre de service : sa date d'émission (la date de l'OS)" },
    { champ: "numero_os", type: "entier", min: 1, maximum: 999, description: "ordre de service : son numéro (« OS n° 6 » → 6)" },
    {
      champ: "nature",
      type: "choix",
      choix: [...NATURES_OS],
      description:
        "ordre de service : demarrage (ordre de commencer), travaux_modificatifs, travaux_supplementaires, arret (arrêt ou suspension), reprise, autre",
    },
    {
      champ: "montant_ht",
      type: "nombre",
      description: "ordre de service, avenant : le montant HT en euros, nombre sans unité, NÉGATIF pour une moins-value (« moins-value de 1 500 € » → -1500)",
    },
    {
      champ: "delai_jours",
      type: "entier",
      min: -3650,
      maximum: 3650,
      description: "ordre de service : l'incidence sur le délai, en jours (une prolongation est positive, une réduction négative) ; en semaines, ×7",
    },
    { champ: "numero_avenant", type: "entier", min: 1, maximum: 999, description: "avenant : son numéro (« Avenant n° 2 » → 2)" },
    { champ: "date_signature", type: "date", description: "avenant : la date de signature, seulement si l'avenant est signé et daté" },
    { champ: "date_reception", type: "date", description: "PV de réception : la date de la réception (ou des opérations préalables)" },
    {
      champ: "origine",
      type: "choix",
      choix: ["reception", "opr"],
      description: "PV de réception : reception (PV de réception), opr (PV des opérations préalables à la réception)",
    },
    { champ: "avec_reserves", type: "choix", choix: ["oui", "non"], description: "PV de réception : oui si la réception est prononcée avec réserves, non si sans réserve" },
    { champ: "delai_levee_jours", type: "entier", min: 1, maximum: 3650, description: "PV de réception : le délai de levée des réserves, en jours, s'il est écrit" },
  ],
  lignes: false,
};
