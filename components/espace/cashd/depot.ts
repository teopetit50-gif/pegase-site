/* ══════════════════════════════════════════════════════════════════════
   CASHD — lire un export du facturier dans le navigateur (06/10/2026, C2)

   Le dépôt depuis l'écran lit le CSV ici (lireTableau de Varelo :
   séparateur deviné, guillemets respectés), rapproche les en-têtes avec
   les MÊMES synonymes que le modèle `modeles_jeux` cashd / tableur
   (c2_01_donnees.sql, § 8), puis envoie les lignes à cashd_importer. Les
   valeurs partent telles que lues : la base les interprète (« 1 234,56 »,
   « 06/10/26 », « Avoir »…), comme pour un export relu par le lecteur.
   L'XLSX passe par la chaîne de relevés (lecteur d'exports d'A1).
   ══════════════════════════════════════════════════════════════════════ */

import { lireTableau, type Lecture } from "../varelo/csv";

export type Jeu = "factures" | "reglements" | "devis" | "clients";

export const JEUX: { cle: Jeu; libelle: string; aide: string; complet: boolean }[] = [
  { cle: "factures", libelle: "Factures non soldées", aide: "L'export des factures ouvertes (ou de la balance âgée détaillée) : numéro, client, date, échéance, montant TTC, reste dû.", complet: true },
  { cle: "reglements", libelle: "Règlements reçus", aide: "Le journal des encaissements, ou le relevé bancaire filtré sur les crédits : date, montant, référence, client ou facture.", complet: false },
  { cle: "devis", libelle: "Devis envoyés", aide: "Les devis en attente de réponse : numéro, client, date d'envoi, montant, statut.", complet: true },
  { cle: "clients", libelle: "Fichier clients", aide: "Code client, raison sociale, courriel de facturation, plafond d'encours, délai de paiement.", complet: false },
];

/* Les synonymes d'en-têtes : ceux du modèle cashd / tableur v1, à l'identique. */
const SYNONYMES: Record<Jeu, Record<string, string[]>> = {
  factures: {
    numero: ["numero", "N° facture", "Numéro de facture", "N° de facture", "Numéro", "Facture", "Pièce", "N° pièce", "Invoice number", "Invoice", "Référence"],
    nature: ["nature", "Type", "Type de pièce", "Nature", "Type de document"],
    compte_ref: ["compte_ref", "Code client", "N° client", "Compte client", "Compte", "Compte auxiliaire", "Code tiers", "Tiers", "Customer ID"],
    compte_nom: ["compte_nom", "Client", "Nom du client", "Raison sociale", "Nom", "Intitulé", "Customer", "Customer name"],
    compte_siren: ["compte_siren", "SIREN", "SIRET", "N° SIREN"],
    compte_email: ["compte_email", "E-mail", "Email", "Courriel", "E-mail de facturation", "Email facturation"],
    date_emission: ["date_emission", "Date de facture", "Date facture", "Date d'émission", "Date", "Date pièce", "Invoice date"],
    echeance: ["echeance", "Échéance", "Date d'échéance", "Date échéance", "Due date", "À régler avant le"],
    montant_ht: ["montant_ht", "Montant HT", "Total HT", "HT", "Net HT", "Amount excl. tax"],
    montant_ttc: ["montant_ttc", "Montant TTC", "Total TTC", "TTC", "Montant", "Total", "Amount", "Total amount"],
    reste_du: ["reste_du", "Reste dû", "Reste à payer", "Restant dû", "Solde", "Solde dû", "Montant dû", "Reste à régler", "Balance due", "Amount due"],
    devise: ["devise", "Devise", "Currency"],
    commande_ref: ["commande_ref", "N° commande", "Bon de commande", "Référence commande", "PO", "Purchase order"],
  },
  reglements: {
    date: ["date", "Date de règlement", "Date règlement", "Date d'encaissement", "Date de paiement", "Date opération", "Date valeur", "Date", "Payment date"],
    montant: ["montant", "Montant", "Montant reçu", "Crédit", "Montant réglé", "Encaissement", "Amount"],
    compte_ref: ["compte_ref", "Code client", "N° client", "Compte client", "Compte", "Code tiers", "Tiers"],
    compte_nom: ["compte_nom", "Client", "Nom du client", "Raison sociale", "Payeur", "Émetteur"],
    facture_numero: ["facture_numero", "N° facture", "Facture", "Facture réglée", "Pièce lettrée", "Invoice"],
    reference: ["reference", "Référence", "Réf.", "Référence du virement", "N° chèque", "Reference"],
    libelle: ["libelle", "Libellé", "Libellé opération", "Description", "Motif"],
    mode: ["mode", "Mode", "Mode de règlement", "Moyen de paiement", "Type de paiement", "Payment method"],
  },
  devis: {
    numero: ["numero", "N° devis", "Numéro de devis", "Numéro", "Devis", "Référence"],
    compte_ref: ["compte_ref", "Code client", "N° client", "Compte client", "Code tiers"],
    compte_nom: ["compte_nom", "Client", "Prospect", "Nom du client", "Raison sociale", "Nom"],
    compte_email: ["compte_email", "E-mail", "Email", "Courriel"],
    date_emission: ["date_emission", "Date d'envoi", "Date du devis", "Date", "Envoyé le"],
    echeance: ["echeance", "Valide jusqu'au", "Validité", "Date de validité", "Expire le"],
    montant_ht: ["montant_ht", "Montant HT", "Total HT", "HT"],
    montant_ttc: ["montant_ttc", "Montant TTC", "Total TTC", "TTC", "Montant", "Total"],
    statut: ["statut", "Statut", "État", "Etat"],
  },
  clients: {
    code: ["code", "Code client", "N° client", "Code", "Compte", "Code tiers", "Customer ID"],
    nom: ["nom", "Raison sociale", "Nom", "Client", "Intitulé", "Dénomination", "Customer name"],
    groupe: ["groupe", "Groupe", "Maison mère", "Société mère"],
    siren: ["siren", "SIREN", "N° SIREN"],
    pays: ["pays", "Pays", "Code pays", "Country"],
    langue: ["langue", "Langue", "Langue de facturation", "Language"],
    devise: ["devise", "Devise", "Currency"],
    contact: ["contact", "Contact facturation", "Contact comptable", "Contact"],
    email: ["email", "E-mail de facturation", "Email facturation", "E-mail", "Email", "Courriel"],
    telephone: ["telephone", "Téléphone", "Tél.", "Phone"],
    email_commercial: ["email_commercial", "E-mail commercial", "Email commercial", "Commercial"],
    delai_paiement: ["delai_paiement", "Délai de paiement", "Conditions de paiement (jours)", "Délai (jours)"],
    plafond: ["plafond", "Plafond d'encours", "Encours autorisé", "Plafond", "Credit limit"],
  },
};

const OBLIGATOIRES: Record<Jeu, string[]> = {
  factures: ["numero", "date_emission", "montant_ttc"],
  reglements: ["date", "montant"],
  devis: ["numero", "date_emission"],
  clients: ["code", "nom"],
};

export const LIBELLES_CHAMPS: Record<string, string> = {
  numero: "numéro", date_emission: "date", montant_ttc: "montant TTC", date: "date", montant: "montant", code: "code client", nom: "nom",
};

export function lireDepot(texte: string, jeu: Jeu): Lecture & { sansClient: boolean } {
  const l = lireTableau(texte, SYNONYMES[jeu], OBLIGATOIRES[jeu]);
  const cles = new Set(l.reconnues.map((r) => r.cle));
  const sansClient = (jeu === "factures" || jeu === "devis") && !cles.has("compte_ref") && !cles.has("compte_nom");
  return { ...l, sansClient };
}

export const GABARIT_FACTURES = "N° facture;Type;Code client;Client;E-mail;Date de facture;Échéance;Montant TTC;Reste dû\nF-2026-101;Facture;C-LEFEVRE;SCI Lefèvre Patrimoine;compta@lefevre-patrimoine.fr;23/07/2026;22/08/2026;12 000,00;12 000,00";
