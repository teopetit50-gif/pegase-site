// Factures électroniques : Factur-X / ZUGFeRD (CII) et UBL. La structure se
// lit sans IA : chaque valeur vient d'une balise nommée, source « xml »,
// vérifiée par construction.

import { XMLParser } from "fast-xml-parser";
import type { ValeurLue } from "@partage/portes.ts";
import { nombreDepuisTexte, sirenValide, tvaFrValide } from "@partage/texte.ts";
import type { TypePiece } from "./schemas/facture.ts";

export interface LectureXml {
  norme: "cii" | "ubl";
  type_piece: TypePiece;
  valeurs: ValeurLue[];
}

type Noeud = Record<string, unknown> | string | number | boolean | null | undefined;

const parseur = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  textNodeName: "#text",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

function premier(n: Noeud): Noeud {
  return Array.isArray(n) ? n[0] : n;
}

function tous(n: Noeud): Noeud[] {
  if (n === undefined || n === null) return [];
  return Array.isArray(n) ? n : [n];
}

/** Descend un chemin « a.b.c » en prenant le premier élément des tableaux. */
function noeud(racine: Noeud, chemin: string): Noeud {
  let n: Noeud = racine;
  for (const pas of chemin.split(".")) {
    n = premier(n);
    if (n === null || typeof n !== "object") return undefined;
    n = (n as Record<string, Noeud>)[pas];
    if (n === undefined) return undefined;
  }
  return premier(n);
}

function texte(n: Noeud): string | null {
  const p = premier(n);
  if (p === undefined || p === null) return null;
  if (typeof p === "object") {
    const t = (p as Record<string, Noeud>)["#text"];
    return t === undefined || t === null ? null : String(t).trim() || null;
  }
  const s = String(p).trim();
  return s || null;
}

function attribut(n: Noeud, nom: string): string | null {
  const p = premier(n);
  if (p && typeof p === "object") {
    const a = (p as Record<string, Noeud>)["@_" + nom];
    return a === undefined || a === null ? null : String(a);
  }
  return null;
}

function dateDe(t: string | null): string | null {
  if (!t) return null;
  const m = t.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function typeDepuisCode(code: string | null, racine: "Invoice" | "CreditNote" | null): TypePiece {
  if (code === "381" || racine === "CreditNote") return "avoir";
  return "facture";
}

export function estXmlFacture(xml: string): boolean {
  return /CrossIndustryInvoice|<(\w+:)?Invoice[\s>]|<(\w+:)?CreditNote[\s>]/.test(xml.slice(0, 4000));
}

export function lireXmlFacture(xml: string): LectureXml | null {
  let doc: Record<string, Noeud>;
  try {
    doc = parseur.parse(xml) as Record<string, Noeud>;
  } catch {
    return null;
  }
  if (doc.CrossIndustryInvoice) return lireCii(doc.CrossIndustryInvoice);
  if (doc.Invoice) return lireUbl(doc.Invoice, "Invoice");
  if (doc.CreditNote) return lireUbl(doc.CreditNote, "CreditNote");
  return null;
}

class Collecteur {
  valeurs: ValeurLue[] = [];
  constructor(private readonly norme: string) {}

  texte(champ: string, n: Noeud, balise: string, transformer?: (s: string) => string | null) {
    const t = texte(n);
    if (!t) return;
    const v = transformer ? transformer(t) : t;
    if (v === null || v === "") return;
    this.pose(champ, v, t, balise);
  }

  nombre(champ: string, n: Noeud, balise: string) {
    const t = texte(n);
    const v = nombreDepuisTexte(t);
    if (t === null || v === null) return;
    this.pose(champ, v, t, balise);
  }

  date(champ: string, n: Noeud, balise: string) {
    const t = texte(n);
    const d = dateDe(t);
    if (!t || !d) return;
    this.pose(champ, d, t, balise);
  }

  booleen(champ: string, v: boolean, t: string, balise: string) {
    this.pose(champ, v, t, balise);
  }

  tableau(champ: string, v: unknown[], balise: string) {
    if (v.length === 0) return;
    this.valeurs.push({ champ, valeur: v, source: "xml", confiance: 1, verifiee: true, controle: `${v.length} élément(s) lus dans ${this.norme} ${balise}` });
  }

  private pose(champ: string, valeur: unknown, t: string, balise: string) {
    if (this.valeurs.some((v) => v.champ === champ)) return;
    let verifiee = true;
    let controle = `lu dans ${this.norme} ${balise}`;
    if ((champ.endsWith(".siren") && !sirenValide(String(valeur))) || (champ.endsWith(".siret") && !/^\d{14}$/.test(String(valeur)))) {
      verifiee = false;
      controle += " ; identifiant invalide";
    }
    if (champ.endsWith(".tva") && String(valeur).toUpperCase().startsWith("FR") && !tvaFrValide(String(valeur))) {
      verifiee = false;
      controle += " ; clé de TVA invalide";
    }
    this.valeurs.push({ champ, valeur, texte: t.slice(0, 2000), source: "xml", confiance: 1, verifiee, controle: controle.slice(0, 300) });
  }
}

function partieCii(c: Collecteur, p: Noeud, prefixe: "fournisseur" | "acheteur", balise: string) {
  c.texte(`${prefixe}.nom`, noeud(p, "Name"), `${balise}/Name`);
  for (
    const id of tous(noeud(p, "SpecifiedLegalOrganization") ? (premier(noeud(p, "SpecifiedLegalOrganization")) as Record<string, Noeud>)["ID"] : undefined)
  ) {
    const schema = attribut(id, "schemeID");
    const t = texte(id);
    if (!t) continue;
    const chiffres = t.replace(/\s/g, "");
    if (schema === "0002" || (/^\d{9}$/.test(chiffres) && schema !== "0009")) c.texte(`${prefixe}.siren`, chiffres, `${balise}/SpecifiedLegalOrganization/ID`);
    else if (schema === "0009" || /^\d{14}$/.test(chiffres)) c.texte(`${prefixe}.siret`, chiffres, `${balise}/SpecifiedLegalOrganization/ID`);
    else c.texte(`${prefixe}.id_legal`, t, `${balise}/SpecifiedLegalOrganization/ID`);
  }
  for (const tr of tous((premier(p) as Record<string, Noeud>)?.["SpecifiedTaxRegistration"])) {
    const id = (premier(tr) as Record<string, Noeud>)?.["ID"];
    if (attribut(id, "schemeID") === "VA" || attribut(id, "schemeID") === null) {
      c.texte(`${prefixe}.tva`, id, `${balise}/SpecifiedTaxRegistration/ID`, (s) => s.replace(/[\s.\-]/g, "").toUpperCase());
    }
  }
  c.texte(`${prefixe}.pays`, noeud(p, "PostalTradeAddress.CountryID"), `${balise}/PostalTradeAddress/CountryID`, (s) => s.toUpperCase());
}

function lireCii(racine: Noeud): LectureXml {
  const c = new Collecteur("CII");
  const doc = noeud(racine, "ExchangedDocument");
  const code = texte(noeud(doc, "TypeCode"));
  c.texte("numero", noeud(doc, "ID"), "ExchangedDocument/ID");
  c.texte("type_code", noeud(doc, "TypeCode"), "ExchangedDocument/TypeCode");
  c.date("date", noeud(doc, "IssueDateTime.DateTimeString"), "ExchangedDocument/IssueDateTime");

  const tx = noeud(racine, "SupplyChainTradeTransaction");
  const accord = noeud(tx, "ApplicableHeaderTradeAgreement");
  const livraison = noeud(tx, "ApplicableHeaderTradeDelivery");
  const reglement = noeud(tx, "ApplicableHeaderTradeSettlement");

  c.texte("acheteur.reference", noeud(accord, "BuyerReference"), "BuyerReference");
  partieCii(c, noeud(accord, "SellerTradeParty"), "fournisseur", "SellerTradeParty");
  partieCii(c, noeud(accord, "BuyerTradeParty"), "acheteur", "BuyerTradeParty");
  c.texte("commande.reference", noeud(accord, "BuyerOrderReferencedDocument.IssuerAssignedID"), "BuyerOrderReferencedDocument");
  c.texte("contrat.reference", noeud(accord, "ContractReferencedDocument.IssuerAssignedID"), "ContractReferencedDocument");
  c.texte("livraison.reference", noeud(livraison, "DespatchAdviceReferencedDocument.IssuerAssignedID"), "DespatchAdviceReferencedDocument");
  c.date("livraison.date", noeud(livraison, "ActualDeliverySupplyChainEvent.OccurrenceDateTime.DateTimeString"), "ActualDeliverySupplyChainEvent");

  c.texte("devise", noeud(reglement, "InvoiceCurrencyCode"), "InvoiceCurrencyCode", (s) => s.toUpperCase());
  c.texte(
    "fournisseur.iban",
    noeud(reglement, "SpecifiedTradeSettlementPaymentMeans.PayeePartyCreditorFinancialAccount.IBANID"),
    "PayeePartyCreditorFinancialAccount/IBANID",
    (s) => s.replace(/\s/g, "").toUpperCase(),
  );
  c.date("echeance", noeud(reglement, "SpecifiedTradePaymentTerms.DueDateDateTime.DateTimeString"), "SpecifiedTradePaymentTerms/DueDateDateTime");
  const somme = noeud(reglement, "SpecifiedTradeSettlementHeaderMonetarySummation");
  c.nombre("montant_ht", noeud(somme, "TaxBasisTotalAmount"), "TaxBasisTotalAmount");
  c.nombre("montant_tva", noeud(somme, "TaxTotalAmount"), "TaxTotalAmount");
  c.nombre("montant_ttc", noeud(somme, "GrandTotalAmount"), "GrandTotalAmount");
  c.nombre("montant_prepaye", noeud(somme, "TotalPrepaidAmount"), "TotalPrepaidAmount");
  c.nombre("net_a_payer", noeud(somme, "DuePayableAmount"), "DuePayableAmount");
  c.texte("facture_origine.reference", noeud(reglement, "InvoiceReferencedDocument.IssuerAssignedID"), "InvoiceReferencedDocument");
  c.date(
    "facture_origine.date",
    noeud(reglement, "InvoiceReferencedDocument.FormattedIssueDateTime.DateTimeString"),
    "InvoiceReferencedDocument/FormattedIssueDateTime",
  );

  const ventilation: Record<string, unknown>[] = [];
  let autoliquidation = false;
  let franchise = false;
  for (const t of tous((premier(reglement) as Record<string, Noeud>)?.["ApplicableTradeTax"])) {
    const categorie = texte(noeud(t, "CategoryCode"));
    const motif = texte(noeud(t, "ExemptionReason"));
    if (categorie === "AE") autoliquidation = true;
    if (motif && /293\s?B/i.test(motif)) franchise = true;
    ventilation.push({
      categorie,
      taux: nombreDepuisTexte(texte(noeud(t, "RateApplicablePercent"))),
      base: nombreDepuisTexte(texte(noeud(t, "BasisAmount"))),
      montant: nombreDepuisTexte(texte(noeud(t, "CalculatedAmount"))),
      motif,
    });
  }
  c.tableau("tva.ventilation", ventilation, "ApplicableTradeTax");
  if (autoliquidation) c.booleen("mention.autoliquidation", true, "CategoryCode AE", "ApplicableTradeTax/CategoryCode");
  if (franchise) c.booleen("mention.franchise_293b", true, "ExemptionReason 293 B", "ApplicableTradeTax/ExemptionReason");

  const lignes: Record<string, unknown>[] = [];
  for (const l of tous((premier(tx) as Record<string, Noeud>)?.["IncludedSupplyChainTradeLineItem"])) {
    const produit = noeud(l, "SpecifiedTradeProduct");
    const qte = noeud(l, "SpecifiedLineTradeDelivery.BilledQuantity");
    lignes.push({
      numero: texte(noeud(l, "AssociatedDocumentLineDocument.LineID")),
      reference_vendeur: texte(noeud(produit, "SellerAssignedID")),
      reference_acheteur: texte(noeud(produit, "BuyerAssignedID")),
      gtin: texte(noeud(produit, "GlobalID")),
      designation: texte(noeud(produit, "Name")),
      quantite: nombreDepuisTexte(texte(qte)),
      unite: attribut(qte, "unitCode"),
      prix_unitaire: nombreDepuisTexte(texte(noeud(l, "SpecifiedLineTradeAgreement.NetPriceProductTradePrice.ChargeAmount"))),
      prix_brut: nombreDepuisTexte(texte(noeud(l, "SpecifiedLineTradeAgreement.GrossPriceProductTradePrice.ChargeAmount"))),
      remise: nombreDepuisTexte(texte(noeud(l, "SpecifiedLineTradeAgreement.GrossPriceProductTradePrice.AppliedTradeAllowanceCharge.ActualAmount"))),
      montant: nombreDepuisTexte(texte(noeud(l, "SpecifiedLineTradeSettlement.SpecifiedTradeSettlementLineMonetarySummation.LineTotalAmount"))),
      taux_tva: nombreDepuisTexte(texte(noeud(l, "SpecifiedLineTradeSettlement.ApplicableTradeTax.RateApplicablePercent"))),
      categorie_tva: texte(noeud(l, "SpecifiedLineTradeSettlement.ApplicableTradeTax.CategoryCode")),
      commande_ligne: texte(noeud(l, "SpecifiedLineTradeAgreement.BuyerOrderReferencedDocument.LineID")),
    });
  }
  c.tableau("lignes", lignes, "IncludedSupplyChainTradeLineItem");

  return { norme: "cii", type_piece: typeDepuisCode(code, null), valeurs: c.valeurs };
}

function partieUbl(c: Collecteur, p: Noeud, prefixe: "fournisseur" | "acheteur", balise: string) {
  const nom = texte(noeud(p, "PartyLegalEntity.RegistrationName")) ?? texte(noeud(p, "PartyName.Name"));
  if (nom) c.texte(`${prefixe}.nom`, nom, `${balise}/PartyLegalEntity/RegistrationName`);
  const ids: Noeud[] = [
    ...tous((premier(noeud(p, "PartyLegalEntity")) as Record<string, Noeud>)?.["CompanyID"]),
    ...tous((premier(p) as Record<string, Noeud>)?.["PartyIdentification"]).map((x) => (premier(x) as Record<string, Noeud>)?.["ID"]),
  ];
  for (const id of ids) {
    const t = texte(id);
    if (!t) continue;
    const chiffres = t.replace(/\s/g, "");
    const schema = attribut(id, "schemeID");
    if (schema === "0002" || /^\d{9}$/.test(chiffres)) c.texte(`${prefixe}.siren`, chiffres, `${balise}/CompanyID`);
    else if (schema === "0009" || /^\d{14}$/.test(chiffres)) c.texte(`${prefixe}.siret`, chiffres, `${balise}/CompanyID`);
    else c.texte(`${prefixe}.id_legal`, t, `${balise}/CompanyID`);
  }
  for (const ts of tous((premier(p) as Record<string, Noeud>)?.["PartyTaxScheme"])) {
    c.texte(`${prefixe}.tva`, noeud(ts, "CompanyID"), `${balise}/PartyTaxScheme/CompanyID`, (s) => s.replace(/[\s.\-]/g, "").toUpperCase());
  }
  c.texte(`${prefixe}.pays`, noeud(p, "PostalAddress.Country.IdentificationCode"), `${balise}/PostalAddress/Country`, (s) => s.toUpperCase());
}

function lireUbl(racine: Noeud, nomRacine: "Invoice" | "CreditNote"): LectureXml {
  const c = new Collecteur("UBL");
  const code = texte(noeud(racine, nomRacine === "Invoice" ? "InvoiceTypeCode" : "CreditNoteTypeCode"));
  c.texte("numero", noeud(racine, "ID"), `${nomRacine}/ID`);
  c.texte("type_code", code, `${nomRacine}TypeCode`);
  c.date("date", noeud(racine, "IssueDate"), "IssueDate");
  c.date("echeance", noeud(racine, "DueDate"), "DueDate");
  c.texte("devise", noeud(racine, "DocumentCurrencyCode"), "DocumentCurrencyCode", (s) => s.toUpperCase());
  c.texte("acheteur.reference", noeud(racine, "BuyerReference"), "BuyerReference");
  c.texte("commande.reference", noeud(racine, "OrderReference.ID"), "OrderReference/ID");
  c.texte("livraison.reference", noeud(racine, "DespatchDocumentReference.ID"), "DespatchDocumentReference/ID");
  c.texte("contrat.reference", noeud(racine, "ContractDocumentReference.ID"), "ContractDocumentReference/ID");
  c.texte("facture_origine.reference", noeud(racine, "BillingReference.InvoiceDocumentReference.ID"), "BillingReference/InvoiceDocumentReference/ID");
  c.date("facture_origine.date", noeud(racine, "BillingReference.InvoiceDocumentReference.IssueDate"), "BillingReference/InvoiceDocumentReference/IssueDate");
  partieUbl(c, noeud(racine, "AccountingSupplierParty.Party"), "fournisseur", "AccountingSupplierParty");
  partieUbl(c, noeud(racine, "AccountingCustomerParty.Party"), "acheteur", "AccountingCustomerParty");
  c.date("livraison.date", noeud(racine, "Delivery.ActualDeliveryDate"), "Delivery/ActualDeliveryDate");
  c.texte(
    "fournisseur.iban",
    noeud(racine, "PaymentMeans.PayeeFinancialAccount.ID"),
    "PaymentMeans/PayeeFinancialAccount/ID",
    (s) => s.replace(/\s/g, "").toUpperCase(),
  );

  const total = noeud(racine, "LegalMonetaryTotal");
  c.nombre("montant_ht", noeud(total, "TaxExclusiveAmount"), "LegalMonetaryTotal/TaxExclusiveAmount");
  c.nombre("montant_tva", noeud(racine, "TaxTotal.TaxAmount"), "TaxTotal/TaxAmount");
  c.nombre("montant_ttc", noeud(total, "TaxInclusiveAmount"), "LegalMonetaryTotal/TaxInclusiveAmount");
  c.nombre("montant_prepaye", noeud(total, "PrepaidAmount"), "LegalMonetaryTotal/PrepaidAmount");
  c.nombre("net_a_payer", noeud(total, "PayableAmount"), "LegalMonetaryTotal/PayableAmount");

  const ventilation: Record<string, unknown>[] = [];
  let autoliquidation = false;
  let franchise = false;
  for (const tt of tous((premier(racine) as Record<string, Noeud>)?.["TaxTotal"])) {
    for (const st of tous((premier(tt) as Record<string, Noeud>)?.["TaxSubtotal"])) {
      const cat = noeud(st, "TaxCategory");
      const categorie = texte(noeud(cat, "ID"));
      const motif = texte(noeud(cat, "TaxExemptionReason"));
      if (categorie === "AE") autoliquidation = true;
      if (motif && /293\s?B/i.test(motif)) franchise = true;
      ventilation.push({
        categorie,
        taux: nombreDepuisTexte(texte(noeud(cat, "Percent"))),
        base: nombreDepuisTexte(texte(noeud(st, "TaxableAmount"))),
        montant: nombreDepuisTexte(texte(noeud(st, "TaxAmount"))),
        motif,
      });
    }
  }
  c.tableau("tva.ventilation", ventilation, "TaxSubtotal");
  if (autoliquidation) c.booleen("mention.autoliquidation", true, "TaxCategory AE", "TaxCategory/ID");
  if (franchise) c.booleen("mention.franchise_293b", true, "TaxExemptionReason 293 B", "TaxCategory/TaxExemptionReason");

  const lignes: Record<string, unknown>[] = [];
  const nomLigne = nomRacine === "Invoice" ? "InvoiceLine" : "CreditNoteLine";
  for (const l of tous((premier(racine) as Record<string, Noeud>)?.[nomLigne])) {
    const qte = noeud(l, nomRacine === "Invoice" ? "InvoicedQuantity" : "CreditedQuantity");
    const article = noeud(l, "Item");
    lignes.push({
      numero: texte(noeud(l, "ID")),
      reference_vendeur: texte(noeud(article, "SellersItemIdentification.ID")),
      reference_acheteur: texte(noeud(article, "BuyersItemIdentification.ID")),
      gtin: texte(noeud(article, "StandardItemIdentification.ID")),
      designation: texte(noeud(article, "Name")),
      quantite: nombreDepuisTexte(texte(qte)),
      unite: attribut(qte, "unitCode"),
      prix_unitaire: nombreDepuisTexte(texte(noeud(l, "Price.PriceAmount"))),
      prix_brut: null,
      remise: nombreDepuisTexte(texte(noeud(l, "Price.AllowanceCharge.Amount"))),
      montant: nombreDepuisTexte(texte(noeud(l, "LineExtensionAmount"))),
      taux_tva: nombreDepuisTexte(texte(noeud(article, "ClassifiedTaxCategory.Percent"))),
      categorie_tva: texte(noeud(article, "ClassifiedTaxCategory.ID")),
      commande_ligne: texte(noeud(l, "OrderLineReference.LineID")),
    });
  }
  c.tableau("lignes", lignes, nomLigne);

  return { norme: "ubl", type_piece: typeDepuisCode(code, nomRacine), valeurs: c.valeurs };
}
