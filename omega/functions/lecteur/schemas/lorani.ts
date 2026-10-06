// Lorani — urbanisme : les pièces reçues de la mairie ou de l'huissier sur
// une demande d'autorisation (permis de construire, déclaration préalable…),
// telles que private.lorani_propositions les attend (B5, CHAMPS-LECTURE-LORANI.md).
// Six types ; numero_dossier partout ; dates en AAAA-MM-JJ.

import type { SchemaModule } from "./modules.ts";

export const DECISIONS_ARRETE = ["accorde", "refuse", "non_opposition", "opposition", "sursis"] as const;

export const SCHEMA_LORANI: SchemaModule = {
  module: "lorani",
  presentation:
    "le module d'urbanisme d'une plateforme pour PME françaises : il lit les courriers et actes reçus de la mairie, de la préfecture ou d'un commissaire de justice (huissier) à propos d'une demande d'autorisation d'urbanisme (permis de construire, permis d'aménager, déclaration préalable, permis de démolir)",
  types: [
    {
      type: "lorani_recepisse_depot",
      libelle: "récépissé de dépôt",
      description:
        "le récépissé de dépôt d'une demande d'autorisation d'urbanisme, remis par la mairie : il porte le numéro de dossier (PC, DP, PA, PD + commune + année + numéro) et la date de dépôt, souvent le délai d'instruction de base",
      champs: ["numero_dossier", "date_depot"],
      cles: ["numero_dossier", "date_depot"],
    },
    {
      type: "lorani_lettre_delai",
      libelle: "lettre de délai",
      description:
        "la lettre de la mairie qui notifie ou modifie le délai d'instruction (majoration, prolongation, délai de base) : un délai en mois et la date de la lettre",
      champs: ["numero_dossier", "delai_mois", "date_lettre"],
      cles: ["numero_dossier", "delai_mois", "date_lettre"],
    },
    {
      type: "lorani_demande_pieces",
      libelle: "demande de pièces complémentaires",
      description: "le courrier de la mairie qui demande des pièces manquantes ou complémentaires, désignées par leur code (PC5, PC 8, DP4, PA11…) ou leur nom",
      champs: ["numero_dossier", "date_lettre", "pieces"],
      cles: ["numero_dossier", "date_lettre", "pieces"],
    },
    {
      type: "lorani_arrete",
      libelle: "arrêté",
      description:
        "l'arrêté du maire (ou du préfet) qui décide : permis accordé, refusé, non-opposition à une déclaration préalable, opposition, ou sursis à statuer ; avec sa date",
      champs: ["numero_dossier", "decision", "date_decision"],
      cles: ["numero_dossier", "decision", "date_decision"],
    },
    {
      type: "lorani_certificat_tacite",
      libelle: "certificat de décision tacite",
      description:
        "le certificat délivré par la mairie attestant qu'un permis tacite ou une non-opposition tacite est acquis, avec la date à laquelle la décision tacite est née",
      champs: ["numero_dossier", "date_tacite"],
      cles: ["numero_dossier", "date_tacite"],
    },
    {
      type: "lorani_constat_affichage",
      libelle: "constat d'affichage",
      description:
        "le procès-verbal de constat d'un commissaire de justice (huissier) attestant l'affichage de l'autorisation sur le terrain : date du constat et numéro du passage (1er, 2e ou 3e)",
      champs: ["numero_dossier", "date_constat", "passage"],
      cles: ["numero_dossier", "date_constat", "passage"],
    },
  ],
  champs: [
    {
      champ: "numero_dossier",
      type: "texte",
      max: 60,
      description: "le numéro de dossier de la demande, tel qu'imprimé (ex. PC 069 123 26 A0042, DP 03412 26 00117)",
    },
    { champ: "date_depot", type: "date", description: "la date de dépôt de la demande en mairie" },
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
  ],
  lignes: false,
};
