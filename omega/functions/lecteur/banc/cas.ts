// Les dix cas du banc : des pièces d'exemple entièrement fictives (noms,
// SIREN, IBAN inventés mais de forme valide), le texte de chaque page, la
// réponse que l'IA rendrait (le double), et ce qu'on attend à l'arrivée.
//
// Les fichiers sont engendrés par `deno task banc` dans banc/fichiers/, les
// attendus dans banc/attendus/. Les tests rejouent chaque cas avec un double
// des portes, du dépôt et de l'IA.

import type { SortieOutil } from "../ia.ts";
import type { LigneTexte } from "./pdf_minimal.ts";

/** Un SIREN de forme valide (clé Luhn) à partir de huit chiffres choisis. */
export function sirenSynthetique(huit: string): string {
  for (let c = 0; c <= 9; c++) {
    const s = huit + c;
    let somme = 0;
    for (let i = 0; i < 9; i++) {
      let n = Number(s[8 - i]);
      if (i % 2 === 1) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      somme += n;
    }
    if (somme % 10 === 0) return s;
  }
  throw new Error("pas de clé");
}

export function tvaFr(siren: string): string {
  const cle = (12 + 3 * (Number(siren) % 97)) % 97;
  return `FR${String(cle).padStart(2, "0")}${siren}`;
}

export const SIREN_FOURNISSEUR = sirenSynthetique("81234567"); // Ateliers Brindille
export const SIREN_ACHETEUR = sirenSynthetique("90876543"); // Sogexal Bâtiment
export const TVA_FOURNISSEUR = tvaFr(SIREN_FOURNISSEUR);
export const TVA_ACHETEUR = tvaFr(SIREN_ACHETEUR);
/** Un SIRET de forme valide : le SIREN, un NIC de quatre chiffres, puis la clé Luhn des quatorze. */
export function siretSynthetique(siren: string, nic4: string): string {
  for (let c = 0; c <= 9; c++) {
    const s = siren + nic4 + c;
    let somme = 0;
    for (let i = 0; i < 14; i++) {
      let n = Number(s[13 - i]);
      if (i % 2 === 1) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      somme += n;
    }
    if (somme % 10 === 0) return s;
  }
  throw new Error("pas de clé");
}
export const SIRET_FOURNISSEUR = siretSynthetique(SIREN_FOURNISSEUR, "0003");

export interface Attendu {
  /** Ce que le test vérifie dans le résultat enregistré ou l'issue du travail. */
  issue: string;
  statut?: string;
  type_piece?: string;
  methode?: string;
  nb_pages?: number;
  methode_page_1?: string;
  ia_appelee: boolean;
  /** Valeurs attendues (champ → valeur jsonb) parmi celles enregistrées. */
  valeurs?: Record<string, unknown>;
  /** Les champs qui doivent être vérifiés. */
  verifiees?: string[];
  /** Les champs qui doivent être présents mais NON vérifiés. */
  non_verifiees?: string[];
  source?: string;
  decoupage?: { pages: number[] }[];
  motif_contient?: string;
  erreur_contient?: string;
}

export interface Cas {
  id: string;
  fichier: string;
  mime: string;
  titre: string;
  /** Pages de texte (PDF natif), ou null pour une pièce image/XML/CSV. */
  pagesTexte?: LigneTexte[][];
  xml?: string;
  csv?: string;
  image?: "png";
  pagesImage?: number;
  pieceJointeXml?: string;
  chiffrement?: string | null;
  /** La réponse du double de l'IA ; absente quand l'IA ne doit pas être appelée. */
  ia?: SortieOutil;
  attendu: Attendu;
}

const entete = (y: number, lignes: string[]): LigneTexte[] => lignes.map((texte, i) => ({ x: 50, y: y + i * 16, texte }));

// ---------------------------------------------------------------------------
// 01 — facture native, une page
// ---------------------------------------------------------------------------

const facture01: LigneTexte[] = [
  { x: 50, y: 60, taille: 18, texte: "ATELIERS BRINDILLE SAS" },
  ...entete(90, [
    "12 rue des Charmilles, 69007 Lyon",
    `SIREN ${SIREN_FOURNISSEUR} - TVA ${TVA_FOURNISSEUR}`,
    `SIRET ${SIRET_FOURNISSEUR}`,
  ]),
  { x: 350, y: 60, taille: 16, texte: "FACTURE" },
  ...[
    "Numéro : F-2026-0417",
    "Date : 12/03/2026",
    "Échéance : 11/04/2026",
    "Votre référence : BC-7781",
  ].map((texte, i) => ({ x: 350, y: 90 + i * 16, texte })),
  ...entete(170, ["Facturé à : SOGEXAL BÂTIMENT", `SIREN ${SIREN_ACHETEUR}`, "4 avenue du Port, 13002 Marseille"]),
  ...entete(240, [
    "Désignation | Qté | PU HT | Montant HT",
    "Pose de cloisons placo, chantier Marseille | 12,00 | 85,00 | 1 020,00",
    "Fourniture plaques BA13 | 40,00 | 5,36 | 214,40",
  ]),
  ...entete(320, ["Total HT : 1 234,40 €", "TVA 20,00 % : 246,88 €", "Total TTC : 1 481,28 €", "Net à payer : 1 481,28 €"]),
  ...entete(400, ["Règlement par virement - IBAN FR76 3000 6000 0112 3456 7890 189", "Pénalités de retard : trois fois le taux d'intérêt légal."]),
];

const ia01: SortieOutil = {
  lisible: true,
  type_piece: "facture",
  confiance_type: 0.98,
  valeurs: [
    { champ: "numero", valeur: "F-2026-0417", texte: "Numéro : F-2026-0417", page: 1, confiance: 0.99 },
    { champ: "date", valeur: "2026-03-12", texte: "Date : 12/03/2026", page: 1, confiance: 0.99 },
    { champ: "echeance", valeur: "2026-04-11", texte: "Échéance : 11/04/2026", page: 1, confiance: 0.97 },
    { champ: "fournisseur.nom", valeur: "ATELIERS BRINDILLE SAS", texte: "ATELIERS BRINDILLE SAS", page: 1, confiance: 0.99 },
    { champ: "fournisseur.siren", valeur: SIREN_FOURNISSEUR, texte: `SIREN ${SIREN_FOURNISSEUR}`, page: 1, confiance: 0.98 },
    { champ: "fournisseur.siret", valeur: SIRET_FOURNISSEUR, texte: `SIRET ${SIRET_FOURNISSEUR}`, page: 1, confiance: 0.98 },
    { champ: "fournisseur.tva", valeur: TVA_FOURNISSEUR, texte: `TVA ${TVA_FOURNISSEUR}`, page: 1, confiance: 0.98 },
    { champ: "fournisseur.iban", valeur: "FR7630006000011234567890189", texte: "IBAN FR76 3000 6000 0112 3456 7890 189", page: 1, confiance: 0.95 },
    { champ: "acheteur.nom", valeur: "SOGEXAL BÂTIMENT", texte: "Facturé à : SOGEXAL BÂTIMENT", page: 1, confiance: 0.97 },
    { champ: "acheteur.siren", valeur: SIREN_ACHETEUR, texte: `SIREN ${SIREN_ACHETEUR}`, page: 1, confiance: 0.97 },
    { champ: "commande.reference", valeur: "BC-7781", texte: "Votre référence : BC-7781", page: 1, confiance: 0.9 },
    { champ: "montant_ht", valeur: 1234.4, texte: "Total HT : 1 234,40 €", page: 1, confiance: 0.99 },
    { champ: "montant_tva", valeur: 246.88, texte: "TVA 20,00 % : 246,88 €", page: 1, confiance: 0.99 },
    { champ: "montant_ttc", valeur: 1481.28, texte: "Total TTC : 1 481,28 €", page: 1, confiance: 0.99 },
    { champ: "net_a_payer", valeur: 1481.28, texte: "Net à payer : 1 481,28 €", page: 1, confiance: 0.98 },
    { champ: "devise", valeur: "EUR", texte: "€", page: 1, confiance: 0.9 },
  ],
  lignes: [
    { designation: "Pose de cloisons placo, chantier Marseille", quantite: 12, prix_unitaire: 85, montant: 1020, taux_tva: 20, page: 1 },
    { designation: "Fourniture plaques BA13", quantite: 40, prix_unitaire: 5.36, montant: 214.4, taux_tva: 20, page: 1 },
  ],
  tva_ventilation: [{ taux: 20, base: 1234.4, montant: 246.88, page: 1 }],
};

// ---------------------------------------------------------------------------
// 02 — facture scannée (image dans un PDF), lecture visuelle
// ---------------------------------------------------------------------------

const transcription02 = [
  "MENUISERIE DU VAL",
  `SIREN ${SIREN_FOURNISSEUR}`,
  "FACTURE N° 2026-088",
  "Date 5 février 2026",
  "Client : SOGEXAL BATIMENT",
  "Fourniture et pose porte coupe-feu 850,00",
  "Total HT 850,00",
  "TVA 10 % 85,00",
  "TOTAL TTC 935,00 EUR",
].join("\n");

const ia02: SortieOutil = {
  lisible: true,
  type_piece: "facture",
  confiance_type: 0.95,
  pages: [{ n: 1, texte: transcription02, confiance: 0.9 }],
  valeurs: [
    { champ: "numero", valeur: "2026-088", texte: "FACTURE N° 2026-088", page: 1, confiance: 0.95 },
    { champ: "date", valeur: "2026-02-05", texte: "Date 5 février 2026", page: 1, confiance: 0.9 },
    { champ: "fournisseur.nom", valeur: "MENUISERIE DU VAL", texte: "MENUISERIE DU VAL", page: 1, confiance: 0.95 },
    { champ: "fournisseur.siren", valeur: SIREN_FOURNISSEUR, texte: `SIREN ${SIREN_FOURNISSEUR}`, page: 1, confiance: 0.9 },
    { champ: "acheteur.nom", valeur: "SOGEXAL BATIMENT", texte: "Client : SOGEXAL BATIMENT", page: 1, confiance: 0.9 },
    { champ: "montant_ht", valeur: 850, texte: "Total HT 850,00", page: 1, confiance: 0.95 },
    { champ: "montant_tva", valeur: 85, texte: "TVA 10 % 85,00", page: 1, confiance: 0.95 },
    { champ: "montant_ttc", valeur: 935, texte: "TOTAL TTC 935,00 EUR", page: 1, confiance: 0.95 },
    { champ: "devise", valeur: "EUR", texte: "EUR", page: 1, confiance: 0.9 },
  ],
  lignes: [{ designation: "Fourniture et pose porte coupe-feu", montant: 850, taux_tva: 10, page: 1 }],
};

// ---------------------------------------------------------------------------
// 03 — deux factures dans un même fichier (pages 1-2 et 3-4)
// ---------------------------------------------------------------------------

const pageFacture = (num: string, date: string, ttc: string, ht: string, tva: string, suite: boolean): LigneTexte[] =>
  suite ? entete(60, [`Facture ${num} - page 2/2`, "Conditions générales de vente.", "Escompte : néant."]) : [
    { x: 50, y: 60, taille: 16, texte: "TRANSPORTS LOUVET" },
    ...entete(90, [`SIREN ${SIREN_FOURNISSEUR}`, `Facture ${num} - page 1/2`, `Date : ${date}`, "Client : SOGEXAL BÂTIMENT"]),
    ...entete(200, [`Total HT : ${ht} €`, `TVA 20 % : ${tva} €`, `Total TTC : ${ttc} €`]),
  ];

const ia03: SortieOutil = {
  lisible: true,
  type_piece: "facture",
  confiance_type: 0.97,
  valeurs: [
    { champ: "numero", valeur: "TL-1001", texte: "Facture TL-1001 - page 1/2", page: 1, confiance: 0.95 },
    { champ: "date", valeur: "2026-01-20", texte: "Date : 20/01/2026", page: 1, confiance: 0.97 },
    { champ: "fournisseur.nom", valeur: "TRANSPORTS LOUVET", texte: "TRANSPORTS LOUVET", page: 1, confiance: 0.97 },
    { champ: "fournisseur.siren", valeur: SIREN_FOURNISSEUR, texte: `SIREN ${SIREN_FOURNISSEUR}`, page: 1, confiance: 0.95 },
    { champ: "montant_ht", valeur: 300, texte: "Total HT : 300,00 €", page: 1, confiance: 0.97 },
    { champ: "montant_tva", valeur: 60, texte: "TVA 20 % : 60,00 €", page: 1, confiance: 0.97 },
    { champ: "montant_ttc", valeur: 360, texte: "Total TTC : 360,00 €", page: 1, confiance: 0.97 },
  ],
  decoupage: [
    { pages: [1, 2], type_piece: "facture", numero: "TL-1001" },
    { pages: [3, 4], type_piece: "facture", numero: "TL-1002" },
  ],
};

// ---------------------------------------------------------------------------
// 04 — Factur-X : PDF d'une page + factur-x.xml (CII) joint
// ---------------------------------------------------------------------------

export const XML_CII = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>FX-2026-0042</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">20260301</udt:DateTimeString></ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>1</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct><ram:SellerAssignedID>ABO-12</ram:SellerAssignedID><ram:Name>Abonnement supervision mensuel</ram:Name></ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>120.00</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="MON">1</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>20</ram:RateApplicablePercent></ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>120.00</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:BuyerReference>SERVICE-TECH</ram:BuyerReference>
      <ram:SellerTradeParty>
        <ram:Name>NUAGE ET CIE</ram:Name>
        <ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${SIREN_FOURNISSEUR}</ram:ID></ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress><ram:PostcodeCode>75011</ram:PostcodeCode><ram:CityName>Paris</ram:CityName><ram:CountryID>FR</ram:CountryID></ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${TVA_FOURNISSEUR}</ram:ID></ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>SOGEXAL BATIMENT</ram:Name>
        <ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${SIREN_ACHETEUR}</ram:ID></ram:SpecifiedLegalOrganization>
        <ram:PostalTradeAddress><ram:CountryID>FR</ram:CountryID></ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${TVA_ACHETEUR}</ram:ID></ram:SpecifiedTaxRegistration>
      </ram:BuyerTradeParty>
      <ram:BuyerOrderReferencedDocument><ram:IssuerAssignedID>PO-5567</ram:IssuerAssignedID></ram:BuyerOrderReferencedDocument>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>30</ram:TypeCode><ram:PayeePartyCreditorFinancialAccount><ram:IBANID>FR7630006000011234567890189</ram:IBANID></ram:PayeePartyCreditorFinancialAccount></ram:SpecifiedTradeSettlementPaymentMeans>
      <ram:ApplicableTradeTax><ram:CalculatedAmount>24.00</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode><ram:BasisAmount>120.00</ram:BasisAmount><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>20</ram:RateApplicablePercent></ram:ApplicableTradeTax>
      <ram:SpecifiedTradePaymentTerms><ram:DueDateDateTime><udt:DateTimeString format="102">20260331</udt:DateTimeString></ram:DueDateDateTime></ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>120.00</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>120.00</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">24.00</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>144.00</ram:GrandTotalAmount>
        <ram:TotalPrepaidAmount>0.00</ram:TotalPrepaidAmount>
        <ram:DuePayableAmount>144.00</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
`;

// ---------------------------------------------------------------------------
// 05 — UBL nu
// ---------------------------------------------------------------------------

export const XML_UBL = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017</cbc:CustomizationID>
  <cbc:ID>UBL-2026-7</cbc:ID>
  <cbc:IssueDate>2026-04-02</cbc:IssueDate>
  <cbc:DueDate>2026-05-02</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cac:OrderReference><cbc:ID>CMD-31</cbc:ID></cac:OrderReference>
  <cac:AccountingSupplierParty><cac:Party>
    <cac:PartyName><cbc:Name>Imprimerie Galet</cbc:Name></cac:PartyName>
    <cac:PostalAddress><cac:Country><cbc:IdentificationCode>FR</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
    <cac:PartyTaxScheme><cbc:CompanyID>${TVA_FOURNISSEUR}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>
    <cac:PartyLegalEntity><cbc:RegistrationName>IMPRIMERIE GALET SARL</cbc:RegistrationName><cbc:CompanyID schemeID="0009">${SIRET_FOURNISSEUR}</cbc:CompanyID></cac:PartyLegalEntity>
  </cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party>
    <cac:PartyName><cbc:Name>Sogexal Bâtiment</cbc:Name></cac:PartyName>
    <cac:PostalAddress><cac:Country><cbc:IdentificationCode>FR</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
    <cac:PartyLegalEntity><cbc:RegistrationName>SOGEXAL BATIMENT</cbc:RegistrationName><cbc:CompanyID schemeID="0002">${SIREN_ACHETEUR}</cbc:CompanyID></cac:PartyLegalEntity>
  </cac:Party></cac:AccountingCustomerParty>
  <cac:PaymentMeans><cbc:PaymentMeansCode>30</cbc:PaymentMeansCode><cac:PayeeFinancialAccount><cbc:ID>FR7630006000011234567890189</cbc:ID></cac:PayeeFinancialAccount></cac:PaymentMeans>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">11.00</cbc:TaxAmount>
    <cac:TaxSubtotal><cbc:TaxableAmount currencyID="EUR">200.00</cbc:TaxableAmount><cbc:TaxAmount currencyID="EUR">11.00</cbc:TaxAmount><cac:TaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>5.5</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">200.00</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">200.00</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">211.00</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">211.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">500</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">200.00</cbc:LineExtensionAmount>
    <cac:Item><cbc:Name>Cartes de visite 350 g</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>5.5</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="EUR">0.40</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>
</Invoice>
`;

// ---------------------------------------------------------------------------
// 06 — ticket manuscrit (photo)
// ---------------------------------------------------------------------------

const transcription06 = ["Chez Marthe - bar tabac", "le 14/03/26", "2 cafés 3,20", "1 sandwich 5,80", "Total 9,00 €", "Merci !"].join("\n");

const ia06: SortieOutil = {
  lisible: true,
  type_piece: "facture",
  confiance_type: 0.7,
  manuscrit: true,
  pages: [{ n: 1, texte: transcription06, confiance: 0.75, manuscrit: true }],
  valeurs: [
    { champ: "fournisseur.nom", valeur: "Chez Marthe - bar tabac", texte: "Chez Marthe - bar tabac", page: 1, confiance: 0.8 },
    { champ: "date", valeur: "2026-03-14", texte: "le 14/03/26", page: 1, confiance: 0.7 },
    { champ: "montant_ttc", valeur: 9, texte: "Total 9,00 €", page: 1, confiance: 0.85 },
  ],
  lignes: [
    { designation: "2 cafés", montant: 3.2, page: 1 },
    { designation: "1 sandwich", montant: 5.8, page: 1 },
  ],
};

// ---------------------------------------------------------------------------
// 07 — illisible
// ---------------------------------------------------------------------------

const ia07: SortieOutil = {
  lisible: false,
  motif: "Page uniformément grise : aucun caractère discernable.",
  type_piece: "autre",
  confiance_type: 0,
  pages: [{ n: 1, texte: "", confiance: 0 }],
  valeurs: [],
};

// ---------------------------------------------------------------------------
// 08 — avoir natif
// ---------------------------------------------------------------------------

const avoir08: LigneTexte[] = [
  { x: 50, y: 60, taille: 18, texte: "ATELIERS BRINDILLE SAS" },
  ...entete(90, [`SIREN ${SIREN_FOURNISSEUR}`, `TVA ${TVA_FOURNISSEUR}`]),
  { x: 350, y: 60, taille: 16, texte: "AVOIR" },
  ...["Numéro : AV-2026-0031", "Date : 02/04/2026"].map((texte, i) => ({ x: 350, y: 90 + i * 16, texte })),
  ...entete(140, ["Annule et remplace partiellement la facture F-2026-0417 du 12/03/2026"]),
  ...entete(180, ["Client : SOGEXAL BÂTIMENT", `SIREN ${SIREN_ACHETEUR}`]),
  ...entete(240, ["Remise commerciale sur plaques BA13 | -214,40"]),
  ...entete(300, ["Total HT : -214,40 €", "TVA 20 % : -42,88 €", "Total TTC : -257,28 €"]),
];

const ia08: SortieOutil = {
  lisible: true,
  type_piece: "avoir",
  confiance_type: 0.97,
  valeurs: [
    { champ: "numero", valeur: "AV-2026-0031", texte: "Numéro : AV-2026-0031", page: 1, confiance: 0.98 },
    { champ: "date", valeur: "2026-04-02", texte: "Date : 02/04/2026", page: 1, confiance: 0.98 },
    { champ: "fournisseur.nom", valeur: "ATELIERS BRINDILLE SAS", texte: "ATELIERS BRINDILLE SAS", page: 1, confiance: 0.98 },
    { champ: "fournisseur.siren", valeur: SIREN_FOURNISSEUR, texte: `SIREN ${SIREN_FOURNISSEUR}`, page: 1, confiance: 0.97 },
    { champ: "fournisseur.tva", valeur: TVA_FOURNISSEUR, texte: `TVA ${TVA_FOURNISSEUR}`, page: 1, confiance: 0.97 },
    { champ: "acheteur.nom", valeur: "SOGEXAL BÂTIMENT", texte: "Client : SOGEXAL BÂTIMENT", page: 1, confiance: 0.95 },
    { champ: "facture_origine.reference", valeur: "F-2026-0417", texte: "la facture F-2026-0417 du 12/03/2026", page: 1, confiance: 0.93 },
    { champ: "facture_origine.date", valeur: "2026-03-12", texte: "du 12/03/2026", page: 1, confiance: 0.9 },
    { champ: "montant_ht", valeur: -214.4, texte: "Total HT : -214,40 €", page: 1, confiance: 0.97 },
    { champ: "montant_tva", valeur: -42.88, texte: "TVA 20 % : -42,88 €", page: 1, confiance: 0.97 },
    { champ: "montant_ttc", valeur: -257.28, texte: "Total TTC : -257,28 €", page: 1, confiance: 0.97 },
  ],
  lignes: [{ designation: "Remise commerciale sur plaques BA13", montant: -214.4, page: 1 }],
};

// ---------------------------------------------------------------------------
// 09 — export tableur (CSV)
// ---------------------------------------------------------------------------

export const CSV_09 = [
  "Champ;Valeur",
  "Fournisseur;LOCAMAT SERVICES",
  `SIREN;${SIREN_FOURNISSEUR}`,
  "Numéro de facture;LM-2026-315",
  "Date;2026-02-28",
  "Client;SOGEXAL BATIMENT",
  "Désignation;Quantité;PU HT;Montant HT",
  "Location nacelle 12 m;3;180,00;540,00",
  "Total HT;540,00",
  "TVA 20 %;108,00",
  "Total TTC;648,00",
].join("\r\n");

const ia09: SortieOutil = {
  lisible: true,
  type_piece: "facture",
  confiance_type: 0.94,
  valeurs: [
    { champ: "numero", valeur: "LM-2026-315", texte: "Numéro de facture | LM-2026-315", page: 1, confiance: 0.95 },
    { champ: "date", valeur: "2026-02-28", texte: "Date | 2026-02-28", page: 1, confiance: 0.95 },
    { champ: "fournisseur.nom", valeur: "LOCAMAT SERVICES", texte: "Fournisseur | LOCAMAT SERVICES", page: 1, confiance: 0.95 },
    { champ: "fournisseur.siren", valeur: SIREN_FOURNISSEUR, texte: `SIREN | ${SIREN_FOURNISSEUR}`, page: 1, confiance: 0.95 },
    { champ: "acheteur.nom", valeur: "SOGEXAL BATIMENT", texte: "Client | SOGEXAL BATIMENT", page: 1, confiance: 0.9 },
    { champ: "montant_ht", valeur: 540, texte: "Total HT | 540,00", page: 1, confiance: 0.95 },
    { champ: "montant_tva", valeur: 108, texte: "TVA 20 % | 108,00", page: 1, confiance: 0.95 },
    { champ: "montant_ttc", valeur: 648, texte: "Total TTC | 648,00", page: 1, confiance: 0.95 },
  ],
  lignes: [{ designation: "Location nacelle 12 m", quantite: 3, prix_unitaire: 180, montant: 540, page: 1 }],
};

// ---------------------------------------------------------------------------

export const CAS: Cas[] = [
  {
    id: "01_facture_native",
    fichier: "01_facture_native.pdf",
    mime: "application/pdf",
    titre: "Facture PDF native, une page, toutes valeurs citées",
    pagesTexte: [facture01],
    ia: ia01,
    attendu: {
      issue: "lue",
      statut: "lue",
      type_piece: "facture",
      methode: "natif",
      nb_pages: 1,
      methode_page_1: "natif",
      ia_appelee: true,
      source: "ia",
      valeurs: {
        numero: "F-2026-0417",
        date: "2026-03-12",
        echeance: "2026-04-11",
        montant_ht: 1234.4,
        montant_tva: 246.88,
        montant_ttc: 1481.28,
        "fournisseur.nom": "ATELIERS BRINDILLE SAS",
        "fournisseur.siren": SIREN_FOURNISSEUR,
        "fournisseur.tva": TVA_FOURNISSEUR,
        "fournisseur.iban": "FR7630006000011234567890189",
        "acheteur.siren": SIREN_ACHETEUR,
        "commande.reference": "BC-7781",
      },
      verifiees: [
        "numero",
        "date",
        "montant_ht",
        "montant_tva",
        "montant_ttc",
        "fournisseur.nom",
        "fournisseur.siren",
        "fournisseur.siret",
        "fournisseur.tva",
        "acheteur.siren",
        "lignes",
        "tva.ventilation",
      ],
    },
  },
  {
    id: "02_facture_scannee",
    fichier: "02_facture_scannee.pdf",
    mime: "application/pdf",
    titre: "Facture scannée (PDF image), lecture visuelle par Claude",
    pagesImage: 1,
    ia: ia02,
    attendu: {
      issue: "lue",
      statut: "lue",
      type_piece: "facture",
      methode: "ocr",
      nb_pages: 1,
      methode_page_1: "vision",
      ia_appelee: true,
      valeurs: { numero: "2026-088", date: "2026-02-05", montant_ttc: 935, "fournisseur.siren": SIREN_FOURNISSEUR },
      verifiees: ["numero", "date", "montant_ht", "montant_tva", "montant_ttc", "fournisseur.nom", "fournisseur.siren"],
    },
  },
  {
    id: "03_multi_factures",
    fichier: "03_multi_factures.pdf",
    mime: "application/pdf",
    titre: "Deux factures dans un fichier : la première est lue, le découpage est rendu",
    pagesTexte: [
      pageFacture("TL-1001", "20/01/2026", "360,00", "300,00", "60,00", false),
      pageFacture("TL-1001", "20/01/2026", "360,00", "300,00", "60,00", true),
      pageFacture("TL-1002", "27/01/2026", "480,00", "400,00", "80,00", false),
      pageFacture("TL-1002", "27/01/2026", "480,00", "400,00", "80,00", true),
    ],
    ia: ia03,
    attendu: {
      issue: "lue",
      statut: "lue",
      type_piece: "facture",
      methode: "natif",
      nb_pages: 4,
      ia_appelee: true,
      valeurs: { numero: "TL-1001", montant_ttc: 360 },
      decoupage: [{ pages: [1, 2] }, { pages: [3, 4] }],
    },
  },
  {
    id: "04_facture_facturx",
    fichier: "04_facture_facturx.pdf",
    mime: "application/pdf",
    titre: "Factur-X : le XML CII joint fait foi, sans IA",
    pagesTexte: [[
      { x: 50, y: 60, taille: 16, texte: "NUAGE ET CIE - Facture FX-2026-0042" },
      ...entete(90, ["Abonnement supervision mensuel : 120,00 € HT", "Total TTC : 144,00 €"]),
    ]],
    pieceJointeXml: XML_CII,
    attendu: {
      issue: "lue",
      statut: "lue",
      type_piece: "facture",
      methode: "xml",
      nb_pages: 1,
      methode_page_1: "natif",
      ia_appelee: false,
      source: "xml",
      valeurs: {
        numero: "FX-2026-0042",
        date: "2026-03-01",
        echeance: "2026-03-31",
        montant_ht: 120,
        montant_tva: 24,
        montant_ttc: 144,
        net_a_payer: 144,
        type_code: "380",
        "fournisseur.nom": "NUAGE ET CIE",
        "fournisseur.siren": SIREN_FOURNISSEUR,
        "fournisseur.tva": TVA_FOURNISSEUR,
        "fournisseur.pays": "FR",
        "fournisseur.iban": "FR7630006000011234567890189",
        "acheteur.nom": "SOGEXAL BATIMENT",
        "acheteur.siren": SIREN_ACHETEUR,
        "acheteur.reference": "SERVICE-TECH",
        "commande.reference": "PO-5567",
        devise: "EUR",
      },
      verifiees: ["numero", "date", "montant_ttc", "fournisseur.siren", "fournisseur.tva", "lignes", "tva.ventilation"],
    },
  },
  {
    id: "05_facture_ubl",
    fichier: "05_facture_ubl.xml",
    mime: "application/xml",
    titre: "Facture UBL nue, sans IA",
    xml: XML_UBL,
    attendu: {
      issue: "lue",
      statut: "lue",
      type_piece: "facture",
      methode: "xml",
      nb_pages: 1,
      ia_appelee: false,
      source: "xml",
      valeurs: {
        numero: "UBL-2026-7",
        date: "2026-04-02",
        echeance: "2026-05-02",
        montant_ht: 200,
        montant_tva: 11,
        montant_ttc: 211,
        "fournisseur.nom": "IMPRIMERIE GALET SARL",
        "fournisseur.siret": SIRET_FOURNISSEUR,
        "fournisseur.tva": TVA_FOURNISSEUR,
        "acheteur.siren": SIREN_ACHETEUR,
        "commande.reference": "CMD-31",
      },
      verifiees: ["numero", "date", "montant_ttc", "fournisseur.siret", "lignes"],
    },
  },
  {
    id: "06_ticket_manuscrit",
    fichier: "06_ticket_manuscrit.png",
    mime: "image/png",
    titre: "Ticket manuscrit photographié : transcription, pas de numéro, à vérifier",
    image: "png",
    ia: ia06,
    attendu: {
      issue: "a_verifier",
      statut: "a_verifier",
      type_piece: "facture",
      methode: "ocr",
      nb_pages: 1,
      methode_page_1: "ocr_manuscrit",
      ia_appelee: true,
      valeurs: { date: "2026-03-14", montant_ttc: 9, "fournisseur.nom": "Chez Marthe - bar tabac" },
      verifiees: ["date", "montant_ttc", "fournisseur.nom"],
      motif_contient: "numero",
    },
  },
  {
    id: "07_illisible",
    fichier: "07_illisible.pdf",
    mime: "application/pdf",
    titre: "Page grise illisible : échec motivé, travail fini",
    pagesImage: 1,
    ia: ia07,
    attendu: { issue: "echec", statut: "echec", methode: "ocr", nb_pages: 1, ia_appelee: true, motif_contient: "grise" },
  },
  {
    id: "08_avoir_natif",
    fichier: "08_avoir_natif.pdf",
    mime: "application/pdf",
    titre: "Avoir PDF natif, référence à la facture d'origine",
    pagesTexte: [avoir08],
    ia: ia08,
    attendu: {
      issue: "lue",
      statut: "lue",
      type_piece: "avoir",
      methode: "natif",
      nb_pages: 1,
      ia_appelee: true,
      valeurs: { numero: "AV-2026-0031", montant_ttc: -257.28, "facture_origine.reference": "F-2026-0417", "facture_origine.date": "2026-03-12" },
      verifiees: ["numero", "date", "montant_ht", "montant_tva", "montant_ttc", "fournisseur.nom", "facture_origine.reference"],
    },
  },
  {
    id: "09_facture_tableur",
    fichier: "09_facture_tableur.csv",
    mime: "text/csv",
    titre: "Export tableur CSV : lu comme une page de texte",
    csv: CSV_09,
    ia: ia09,
    attendu: {
      issue: "lue",
      statut: "lue",
      type_piece: "facture",
      methode: "tableur",
      nb_pages: 1,
      methode_page_1: "natif",
      ia_appelee: true,
      valeurs: { numero: "LM-2026-315", montant_ttc: 648, "fournisseur.siren": SIREN_FOURNISSEUR },
      verifiees: ["numero", "date", "montant_ht", "montant_tva", "montant_ttc", "fournisseur.nom", "fournisseur.siren"],
    },
  },
  {
    id: "10_facture_chiffree",
    fichier: "10_facture_chiffree.pdf",
    mime: "application/pdf",
    titre: "Pièce d'un dossier chiffré : hors vague 1, reprise plus tard",
    pagesTexte: [facture01],
    chiffrement: "dossier:v1",
    attendu: { issue: "repris", ia_appelee: false, erreur_contient: "CHIFFREMENT_NON_PRIS_EN_CHARGE" },
  },
];
