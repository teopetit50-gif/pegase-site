// Tamila — cabinets d'avocats : les avis et messages reçus par le RPVA (e-barreau)
// sur un dossier d'appel, tels que private.tamila_avis_lu les attend (B4,
// omega/modules/tamila/CHAMPS-LECTURE-TAMILA.md sur worker-b4, 66ec6fb) : un type par
// valeur de tamila_avis.type_avis, plus tamila_piece_autre pour le reste du dossier ; des
// champs qui portent le nom exact des clés de p_valeurs (date_avis,
// date_audience, date_cloture_previsible, date_limite, partie_visee, rang,
// depose_le), plus numero_rg pour que l'appelant calcule p_rg_concorde (le n° RG
// du dossier est chiffré : le lecteur ne le voit pas).
// date_audience et depose_le sont des heures locales du ressort, sans fuseau :
// tamila_avis_lu applique celui du territoire ; une date seule veut dire
// « heure inconnue ».

import type { SchemaModule } from "./modules.ts";

export const PARTIES_RPVA = ["appelant", "intime", "intervenant"] as const;

export const SCHEMA_TAMILA: SchemaModule = {
  module: "tamila",
  presentation:
    "le module des cabinets d'avocats d'une plateforme pour PME françaises : il lit les avis et messages reçus par le RPVA (e-barreau) du greffe d'une cour d'appel ou d'un confrère, dans un dossier d'appel en matière civile",
  types: [
    {
      type: "rpva_declaration_appel",
      libelle: "déclaration d'appel",
      description:
        "l'avis du greffe qui enregistre une déclaration d'appel (ou sa notification au confrère) : n° RG attribué, date de la déclaration ; partie_visee = la qualité (appelant ou intimé) de la partie que défend l'avocat destinataire",
      champs: ["numero_rg", "date_avis", "partie_visee"],
      cles: ["date_avis"],
    },
    {
      type: "rpva_avis_902",
      libelle: "avis de l'article 902",
      description:
        "l'avis du greffe à l'appelant d'avoir à signifier la déclaration d'appel à l'intimé qui n'a pas constitué avocat (article 902 du code de procédure civile)",
      champs: ["numero_rg", "date_avis"],
      cles: ["date_avis"],
    },
    {
      type: "rpva_avis_fixation",
      libelle: "avis de fixation à bref délai",
      description:
        "l'avis de fixation de l'affaire à bref délai (articles 906 et suivants) : date de l'avis, date et heure de l'audience de plaidoiries, parfois la date de clôture prévisible",
      champs: ["numero_rg", "date_avis", "date_audience", "date_cloture_previsible"],
      cles: ["date_avis"],
    },
    {
      type: "rpva_conclusions",
      libelle: "notification de conclusions",
      description:
        "la notification entre avocats de conclusions d'une partie : partie_visee = la partie qui conclut (appelant, intimé, intervenant) ; rang = 1 pour les premières conclusions, 2 pour les deuxièmes (conclusions récapitulatives n° 2), etc.",
      champs: ["numero_rg", "date_avis", "partie_visee", "rang"],
      cles: ["date_avis", "partie_visee"],
    },
    {
      type: "rpva_appel_incident",
      libelle: "appel incident",
      description: "la notification de conclusions portant appel incident (ou appel provoqué)",
      champs: ["numero_rg", "date_avis"],
      cles: ["date_avis"],
    },
    {
      type: "rpva_intervention",
      libelle: "intervention",
      description:
        "la notification d'une intervention forcée (assignation en intervention) ou de conclusions d'intervention volontaire ; partie_visee = intervenant",
      champs: ["numero_rg", "date_avis", "partie_visee"],
      cles: ["date_avis"],
    },
    {
      type: "rpva_ordonnance_mee",
      libelle: "ordonnance du conseiller de la mise en état",
      description:
        "une ordonnance ou un avis du conseiller de la mise en état (calendrier de procédure, injonction de conclure) : date limite fixée pour conclure, date de clôture prévisible",
      champs: ["numero_rg", "date_avis", "date_limite", "date_cloture_previsible"],
      cles: ["date_avis"],
    },
    {
      type: "rpva_avis_audience",
      libelle: "avis d'audience",
      description: "un avis du greffe qui fixe ou renvoie une audience (hors fixation à bref délai) : date et heure de l'audience",
      champs: ["numero_rg", "date_avis", "date_audience", "date_cloture_previsible"],
      cles: ["date_avis", "date_audience"],
    },
    {
      type: "rpva_accuse_depot",
      libelle: "accusé de dépôt",
      description: "l'accusé de réception RPVA du dépôt d'un acte ou de conclusions par le cabinet : date et heure exactes du dépôt",
      champs: ["numero_rg", "date_avis", "depose_le"],
      cles: ["date_avis", "depose_le"],
    },
    {
      type: "rpva_interruption",
      libelle: "interruption de l'instance",
      description:
        "l'avis d'un événement qui interrompt l'instance (décès d'une partie, ouverture d'une procédure collective, cessation des fonctions de l'avocat…)",
      champs: ["numero_rg", "date_avis"],
      cles: ["date_avis"],
    },
    {
      type: "tamila_piece_autre",
      libelle: "autre pièce du dossier",
      description:
        "toute autre pièce lisible du dossier, qui n'est aucun des avis RPVA ci-dessus (jugement de première instance, conclusions elles-mêmes, bordereau, pièce adverse, courrier du client) : seulement sa date si elle en porte une",
      champs: ["date_piece"],
      cles: [],
      lueSansValeur: true,
    },
  ],
  champs: [
    {
      champ: "numero_rg",
      type: "texte",
      max: 30,
      description: "le numéro de répertoire général (RG) du dossier à la cour, tel qu'imprimé (ex. RG 26/04512, N° RG 26/04512 - N° Portalis …)",
    },
    { champ: "date_avis", type: "date", description: "la date de l'avis, de la notification ou de l'ordonnance (date d'émission du message RPVA)" },
    {
      champ: "date_audience",
      type: "dateheure",
      description: "la date et l'heure de l'audience, heure locale de la cour ; la date seule si l'heure n'est pas imprimée",
    },
    { champ: "date_cloture_previsible", type: "date", description: "la date prévisible de l'ordonnance de clôture" },
    { champ: "date_limite", type: "date", description: "la date limite fixée par le conseiller de la mise en état pour conclure ou communiquer" },
    {
      champ: "partie_visee",
      type: "choix",
      choix: [...PARTIES_RPVA],
      description: "la partie en cause selon le type (voir le type) : appelant, intime (intimé) ou intervenant",
    },
    { champ: "rang", type: "entier", min: 1, maximum: 99, description: "le rang des conclusions notifiées (1 = premières conclusions)" },
    { champ: "depose_le", type: "dateheure", description: "la date et l'heure du dépôt accusé par le RPVA, heure locale" },
    { champ: "date_piece", type: "date", description: "la date portée sur une autre pièce du dossier (tamila_piece_autre)" },
  ],
  lignes: false,
};
