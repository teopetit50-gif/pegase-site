// Daliro (B6) : le devis d'une entreprise du bâtiment, lu en PDF, rendu en lignes que l'écran du marché importe
// (aperçu, puis btp_importer_lignes, b6_28 : une ligne = désignation, unité, quantité, prix unitaire, montant, lot,
// numéro). Le lecteur ne pose rien lui-même : le marché reste « à vérifier » et une personne confirme l'import.
// Les photos et vocaux du chantier passent par lecteur.media (CONTRAT-MEDIA.md), pas par ici.
// Le bon de livraison d'un fournisseur (b6_62, CHAMPS-LECTURE-DALIRO.md, 25/10) : souvent une photo prise au
// téléphone ; numéro, date de livraison, commande citée, fournisseur, lignes livrées (désignation, référence,
// quantité, unité) et réserves écrites à la réception. Daliro rapproche le bon de la commande ; rien n'est noté
// reçu sans une personne.

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
      type: "daliro_bon_livraison",
      libelle: "bon de livraison",
      description:
        "le bon de livraison d'un fournisseur (souvent une photo prise au téléphone, parfois annotée à la main) : son numéro, la date de livraison, la commande du client qu'il cite, le fournisseur, et TOUTES les lignes livrées dans « lignes » (désignation, référence, quantité livrée en nombre, unité telle qu'écrite) ; les réserves écrites à la réception (« 2 vitrages rayés ») dans « reserves ». Une facture, un devis ou une photo de chantier n'est pas un bon de livraison",
      champs: ["numero_bon", "date_livraison", "reference_commande", "fournisseur", "lignes", "reserves"],
      cles: ["numero_bon", "date_livraison", "lignes"],
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
    { champ: "numero_bon", type: "texte", max: 60, description: "bon de livraison : son numéro, tel qu'écrit (« BL-4471 », « 2026/10/0815 »)" },
    {
      champ: "date_livraison",
      type: "date",
      description: "bon de livraison : la date de livraison écrite sur le bon (à défaut, la date du bon), en AAAA-MM-JJ",
    },
    {
      champ: "reference_commande",
      type: "texte",
      max: 60,
      description: "bon de livraison : le numéro de commande du client cité par le bon, tel qu'écrit (« Votre commande : CDE 62 » → CDE 62)",
    },
    { champ: "fournisseur", type: "texte", max: 200, description: "bon de livraison : la raison sociale du fournisseur, telle qu'écrite" },
    {
      champ: "reserves",
      type: "texte",
      max: 1000,
      description: "bon de livraison : les réserves écrites (souvent à la main) à la réception, telles qu'écrites (« 2 vitrages rayés »)",
    },
  ],
  lignes: true,
  /** Les colonnes d'une ligne : devis (lot, prix, montant) ou bon de livraison (référence, quantité livrée, unité). */
  colonnesLigne: ["numero", "lot", "reference", "designation", "unite", "quantite", "prix_unitaire", "montant"],
};
