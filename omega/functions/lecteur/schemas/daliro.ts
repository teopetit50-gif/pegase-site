// Daliro (B6) : le devis d'une entreprise du bâtiment, lu en PDF, rendu en lignes que l'écran du marché importe
// (aperçu, puis btp_importer_lignes, b6_28 : une ligne = désignation, unité, quantité, prix unitaire, montant, lot,
// numéro). Le lecteur ne pose rien lui-même : le marché reste « à vérifier » et une personne confirme l'import.
// Les photos et vocaux du chantier passent par lecteur.media (CONTRAT-MEDIA.md), pas par ici.

import type { SchemaModule } from "./modules.ts";

export const SCHEMA_DALIRO: SchemaModule = {
  module: "daliro",
  presentation: "une plateforme qui lit les pièces d'une entreprise du bâtiment (devis, marchés, situations)",
  types: [
    {
      type: "daliro_devis",
      libelle: "devis",
      description:
        "un devis ou une proposition de prix de l'entreprise pour un chantier : son numéro, sa date, le client, le montant total HT, et TOUTES ses lignes chiffrées dans « lignes » (une ligne par ouvrage, avec le lot ou la section dont elle relève)",
      champs: ["numero", "date", "client", "objet", "montant_total_ht", "montant_ttc"],
      cles: ["montant_total_ht"],
    },
    {
      type: "daliro_piece_autre",
      libelle: "autre pièce",
      description: "toute autre pièce du chantier (plan, courrier, compte rendu) : rien à en extraire ici",
      champs: ["date"],
      cles: [],
      lueSansValeur: true,
    },
  ],
  champs: [
    { champ: "numero", type: "texte", max: 60, description: "devis : son numéro, tel qu'imprimé" },
    { champ: "date", type: "date", description: "devis : sa date" },
    { champ: "client", type: "texte", max: 200, description: "devis : le client (maître d'ouvrage), tel qu'écrit" },
    { champ: "objet", type: "texte", max: 300, description: "devis : l'objet ou le chantier, tel qu'écrit" },
    { champ: "montant_total_ht", type: "nombre", description: "devis : le total HT, en euros, nombre sans unité" },
    { champ: "montant_ttc", type: "nombre", description: "devis : le total TTC, s'il est écrit" },
  ],
  lignes: true,
  /** Les colonnes d'une ligne de devis : celles des factures, plus le lot (titre de section ou code de lot). */
  colonnesLigne: ["numero", "lot", "designation", "unite", "quantite", "prix_unitaire", "montant"],
};
