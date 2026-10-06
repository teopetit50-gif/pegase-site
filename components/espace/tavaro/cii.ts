/* ══════════════════════════════════════════════════════════════════════
   La facture électronique, en mémoire pour l'exemple (06/10/2026, B2)

   Le même XML CII EN 16931 et le même contrôle que la base (migration
   b2_06 : private.loc_cii, private.loc_controler_doc), ligne pour ligne,
   pour que l'exemple montre exactement ce qu'une agence verra. En base
   réelle, l'écran lit la porte loc_facture_electronique et ne calcule
   rien ici. Le XML de la base a été validé hors base (XSD Factur-X
   EN 16931, schematrons EN 16931 et BR-FR Flux 2) : 0 erreur pour un
   professionnel.
   ══════════════════════════════════════════════════════════════════════ */

import type { Avoir, Facture, LigneFacture } from "./types";

export type FluxElectronique = "e_invoicing" | "e_reporting" | "a_completer";
export type FormeElectronique = { flux: FluxElectronique; pret: boolean; manques: string[]; piece: string; format: string; fichier: string; xml: string };

export const LIBELLES_FLUX: Record<FluxElectronique, string> = {
  e_invoicing: "facture électronique (plateforme agréée)",
  e_reporting: "e-reporting (client particulier)",
  a_completer: "à compléter avant envoi",
};

export const LIBELLES_MANQUES: Record<string, string> = {
  siren_emetteur: "le SIREN du loueur (absent ou clé fausse)",
  adresse_emetteur: "l'adresse du loueur, avec code postal et ville",
  numero_tva_emetteur: "le numéro de TVA intracommunautaire du loueur",
  categories_tva_melangees: "des lignes taxables et hors champ sur la même facture",
  aucune_ligne: "aucune ligne",
  totaux_incoherents: "des totaux qui ne font pas la somme des lignes",
  siren_client: "le SIREN du client professionnel",
  raison_sociale_client: "la raison sociale du client",
  adresse_client: "l'adresse du client, avec code postal et ville",
  client: "le client (inconnu ou anonymisé)",
};

export function sirenValide(p: string | null | undefined): boolean {
  const v = (p ?? "").replace(/\s/g, "");
  if (!/^[0-9]{9}$/.test(v)) return false;
  if (v === "356000000") return true;
  let s = 0;
  for (let i = 0; i < 9; i++) {
    let d = Number(v[i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    s += d;
  }
  return s % 10 === 0;
}

type Adresse = { ligne: string; cp?: string; ville?: string; structuree: boolean };
export function adresse(p: string | null | undefined): Adresse | null {
  const t = (p ?? "").trim();
  if (!t) return null;
  const m = t.match(/^(.*?)[,\s]+([0-9]{5})\s+([^,0-9][^,]*)$/);
  if (!m) return { ligne: t.slice(0, 200), structuree: false };
  return { ligne: m[1].trim().slice(0, 200), cp: m[2], ville: m[3].trim().slice(0, 100), structuree: true };
}

type LigneDoc = { rang: number; libelle: string; quantite: number; unite: string | null; prix: number | null; ht: number; regime: string; taux: number | null; tva: number };
type Doc = {
  type_code: "380" | "381"; numero: string; date: string; echeance: string; contrat: string; facture_origine?: string; facture_origine_date?: string;
  emetteur: Record<string, string>; destinataire: Record<string, string>; mentions: Record<string, unknown>;
  total_ht: number; total_tva: number; total_ttc: number; lignes: LigneDoc[];
};

export function docFacture(f: Facture, lignes: LigneFacture[]): Doc {
  return {
    type_code: "380", numero: f.reference, date: f.date_facture, echeance: f.echeance_le, contrat: f.contrat_numero,
    emetteur: f.emetteur, destinataire: f.destinataire, mentions: f.mentions, total_ht: f.total_ht, total_tva: f.total_tva, total_ttc: f.total_ttc,
    lignes: lignes.filter((l) => l.facture_id === f.id).sort((a, b) => a.rang - b.rang).map((l) => ({
      rang: l.rang, libelle: l.libelle, quantite: l.quantite, unite: l.unite, prix: l.prix_unitaire ?? (l.quantite ? Math.round((l.montant_ht / l.quantite) * 100) / 100 : null),
      ht: l.montant_ht, regime: l.regime_tva, taux: l.taux_tva, tva: l.montant_tva,
    })),
  };
}

export function docAvoir(a: Avoir, f: Facture): Doc {
  return {
    type_code: "381", numero: a.reference ?? "", date: a.date_avoir ?? a.cree_le.slice(0, 10), echeance: a.date_avoir ?? a.cree_le.slice(0, 10), contrat: a.contrat_numero,
    facture_origine: a.facture_reference, facture_origine_date: f.date_facture, emetteur: f.emetteur, destinataire: f.destinataire, mentions: {},
    total_ht: a.montant_ht, total_tva: a.montant_tva, total_ttc: a.montant_ttc,
    lignes: [{ rang: 1, libelle: `Avoir sur la facture ${a.facture_reference} : ${a.motif}`, quantite: 1, unite: "forfait", prix: a.montant_ht, ht: a.montant_ht,
      regime: a.montant_tva > 0 ? "taxable" : "hors_champ", taux: a.montant_ht > 0 && a.montant_tva > 0 ? Math.round((a.montant_tva * 10000) / a.montant_ht) / 100 : null, tva: a.montant_tva }],
  };
}

export function controler(doc: Doc): { flux: FluxElectronique; pret: boolean; manques: string[] } {
  const e = doc.emetteur ?? {};
  const d = doc.destinataire ?? {};
  const m: string[] = [];
  const s = doc.lignes.some((l) => l.regime === "taxable");
  const o = doc.lignes.some((l) => l.regime !== "taxable");
  const somme = doc.lignes.reduce((t, l) => t + l.ht, 0);
  if (!sirenValide(e.siren)) m.push("siren_emetteur");
  if (!adresse(e.adresse)?.structuree) m.push("adresse_emetteur");
  if (s && !e.numero_tva) m.push("numero_tva_emetteur");
  if (s && o) m.push("categories_tva_melangees");
  if (doc.lignes.length === 0) m.push("aucune_ligne");
  if (Math.abs(somme - doc.total_ht) > 0.01) m.push("totaux_incoherents");
  let flux: FluxElectronique;
  if (d.type === "professionnel") {
    if (sirenValide(d.siren)) flux = "e_invoicing";
    else {
      flux = "a_completer";
      m.push("siren_client");
    }
    if (!d.raison_sociale) m.push("raison_sociale_client");
    if (!adresse(d.adresse)?.structuree) m.push("adresse_client");
  } else if (d.type === "particulier") flux = "e_reporting";
  else {
    flux = "a_completer";
    m.push("client");
  }
  return { flux, pret: m.length === 0, manques: m };
}

const x = (t: unknown) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const dec = (n: number | null | undefined, e = 2) => (e === 2 ? (Math.round((n ?? 0) * 100) / 100).toFixed(2) : String(Math.round((n ?? 0) * 10 ** e) / 10 ** e));
const ymd = (d: string) => d.slice(0, 10).replace(/-/g, "");
const unite = (u: string | null) => (u === "km" ? "KMT" : u === "litre" ? "LTR" : u === "jour_entame" ? "DAY" : "C62");

export function cii(doc: Doc): string {
  const e = doc.emetteur ?? {};
  const d = doc.destinataire ?? {};
  const mt = doc.mentions ?? {};
  const ae = adresse(e.adresse);
  const ad = adresse(d.adresse);
  const pro = d.type === "professionnel";
  const hors = doc.lignes.some((l) => l.regime !== "taxable");
  const debits = "option_debits" in mt;
  const restitution = typeof mt.restitution === "string" && /^\d{2}\/\d{2}\/\d{4}/.test(mt.restitution) ? `${mt.restitution.slice(6, 10)}${mt.restitution.slice(3, 5)}${mt.restitution.slice(0, 2)}` : ymd(doc.date);
  const note = (texte: unknown, code: string) => `<ram:IncludedNote><ram:Content>${x(texte)}</ram:Content><ram:SubjectCode>${code}</ram:SubjectCode></ram:IncludedNote>`;
  const adr = (a: Adresse | null) => `<ram:PostalTradeAddress>${a?.cp ? `<ram:PostcodeCode>${a.cp}</ram:PostcodeCode>` : ""}${a?.ligne ? `<ram:LineOne>${x(a.ligne)}</ram:LineOne>` : ""}${a?.ville ? `<ram:CityName>${x(a.ville)}</ram:CityName>` : ""}<ram:CountryID>FR</ram:CountryID></ram:PostalTradeAddress>`;
  let s = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">\n'
    + '<rsm:ExchangedDocumentContext><ram:BusinessProcessSpecifiedDocumentContextParameter><ram:ID>S1</ram:ID></ram:BusinessProcessSpecifiedDocumentContextParameter><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext>\n'
    + `<rsm:ExchangedDocument><ram:ID>${x(doc.numero)}</ram:ID><ram:TypeCode>${doc.type_code}</ram:TypeCode><ram:IssueDateTime><udt:DateTimeString format="102">${ymd(doc.date)}</udt:DateTimeString></ram:IssueDateTime>`
    + (mt.objet ? note(mt.objet, "AAI") : "") + (mt.mandat ? note(mt.mandat, "REG") : "")
    + (pro ? note(mt.penalites ?? "En cas de retard de paiement : pénalités au taux de la BCE majoré de 10 points (C. com. L441-10).", "PMD")
      + note("Indemnité forfaitaire pour frais de recouvrement en cas de retard de paiement : 40 € (C. com. L441-10 et D441-5).", "PMT")
      + note("Pas d'escompte pour paiement anticipé.", "AAB") : "")
    + (mt.tva ? note(mt.tva, "TXD") : "")
    + "</rsm:ExchangedDocument>\n<rsm:SupplyChainTradeTransaction>\n";
  for (const l of doc.lignes) {
    s += `<ram:IncludedSupplyChainTradeLineItem><ram:AssociatedDocumentLineDocument><ram:LineID>${l.rang}</ram:LineID></ram:AssociatedDocumentLineDocument>`
      + `<ram:SpecifiedTradeProduct><ram:Name>${x(l.libelle)}</ram:Name></ram:SpecifiedTradeProduct>`
      + `<ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>${dec(l.prix)}</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>`
      + `<ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="${unite(l.unite)}">${dec(l.quantite, 3)}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>`
      + "<ram:SpecifiedLineTradeSettlement><ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode>"
      + (l.regime === "taxable" ? `<ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>${dec(l.taux)}</ram:RateApplicablePercent>` : "<ram:CategoryCode>O</ram:CategoryCode>")
      + `</ram:ApplicableTradeTax><ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${dec(l.ht)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation></ram:SpecifiedLineTradeSettlement></ram:IncludedSupplyChainTradeLineItem>\n`;
  }
  s += "<ram:ApplicableHeaderTradeAgreement>"
    + `<ram:SellerTradeParty><ram:Name>${x(e.nom)}</ram:Name>${e.siren ? `<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${x(e.siren)}</ram:ID></ram:SpecifiedLegalOrganization>` : ""}${adr(ae)}`
    + (e.siren ? `<ram:URIUniversalCommunication><ram:URIID schemeID="0225">${x(e.siren)}</ram:URIID></ram:URIUniversalCommunication>` : e.email ? `<ram:URIUniversalCommunication><ram:URIID schemeID="EM">${x(e.email)}</ram:URIID></ram:URIUniversalCommunication>` : "")
    + (e.numero_tva && !hors ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${x(e.numero_tva)}</ram:ID></ram:SpecifiedTaxRegistration>` : "")
    + "</ram:SellerTradeParty>"
    + `<ram:BuyerTradeParty><ram:Name>${x(d.raison_sociale || d.nom || "Client")}</ram:Name>${pro && d.siren ? `<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${x(d.siren)}</ram:ID></ram:SpecifiedLegalOrganization>` : ""}${adr(ad)}`
    + (pro && d.siren ? `<ram:URIUniversalCommunication><ram:URIID schemeID="0225">${x(d.siren)}</ram:URIID></ram:URIUniversalCommunication>` : d.email ? `<ram:URIUniversalCommunication><ram:URIID schemeID="EM">${x(d.email)}</ram:URIID></ram:URIUniversalCommunication>` : "")
    + "</ram:BuyerTradeParty>"
    + (doc.contrat ? `<ram:ContractReferencedDocument><ram:IssuerAssignedID>${x(doc.contrat)}</ram:IssuerAssignedID></ram:ContractReferencedDocument>` : "")
    + "</ram:ApplicableHeaderTradeAgreement>\n"
    + `<ram:ApplicableHeaderTradeDelivery><ram:ActualDeliverySupplyChainEvent><ram:OccurrenceDateTime><udt:DateTimeString format="102">${restitution}</udt:DateTimeString></ram:OccurrenceDateTime></ram:ActualDeliverySupplyChainEvent></ram:ApplicableHeaderTradeDelivery>\n`
    + "<ram:ApplicableHeaderTradeSettlement><ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>";
  const groupes = new Map<string, { regime: string; taux: number | null; base: number; tva: number }>();
  for (const l of doc.lignes) {
    const k = `${l.regime}|${l.taux ?? ""}`;
    const g = groupes.get(k) ?? { regime: l.regime, taux: l.taux, base: 0, tva: 0 };
    g.base += l.ht;
    g.tva += l.tva;
    groupes.set(k, g);
  }
  for (const g of [...groupes.values()].sort((a, b) => b.regime.localeCompare(a.regime) || (a.taux ?? 0) - (b.taux ?? 0))) {
    s += `<ram:ApplicableTradeTax><ram:CalculatedAmount>${dec(g.regime === "taxable" ? g.tva : 0)}</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode>`
      + (g.regime === "taxable" ? "" : "<ram:ExemptionReason>Indemnité hors du champ de la TVA</ram:ExemptionReason>")
      + `<ram:BasisAmount>${dec(g.base)}</ram:BasisAmount><ram:CategoryCode>${g.regime === "taxable" ? "S" : "O"}</ram:CategoryCode>`
      + (g.regime === "taxable" ? `<ram:DueDateTypeCode>${debits ? "5" : "72"}</ram:DueDateTypeCode><ram:RateApplicablePercent>${dec(g.taux)}</ram:RateApplicablePercent>` : "")
      + "</ram:ApplicableTradeTax>";
  }
  s += "<ram:SpecifiedTradePaymentTerms>" + (doc.echeance <= doc.date ? "<ram:Description>À régler à réception</ram:Description>" : "")
    + `<ram:DueDateDateTime><udt:DateTimeString format="102">${ymd(doc.echeance)}</udt:DateTimeString></ram:DueDateDateTime></ram:SpecifiedTradePaymentTerms>`
    + `<ram:SpecifiedTradeSettlementHeaderMonetarySummation><ram:LineTotalAmount>${dec(doc.total_ht)}</ram:LineTotalAmount><ram:TaxBasisTotalAmount>${dec(doc.total_ht)}</ram:TaxBasisTotalAmount>`
    + `<ram:TaxTotalAmount currencyID="EUR">${dec(doc.total_tva)}</ram:TaxTotalAmount><ram:GrandTotalAmount>${dec(doc.total_ttc)}</ram:GrandTotalAmount><ram:DuePayableAmount>${dec(doc.total_ttc)}</ram:DuePayableAmount></ram:SpecifiedTradeSettlementHeaderMonetarySummation>`
    + (doc.facture_origine ? `<ram:InvoiceReferencedDocument><ram:IssuerAssignedID>${x(doc.facture_origine)}</ram:IssuerAssignedID>${doc.facture_origine_date ? `<ram:FormattedIssueDateTime><qdt:DateTimeString format="102">${ymd(doc.facture_origine_date)}</qdt:DateTimeString></ram:FormattedIssueDateTime>` : ""}</ram:InvoiceReferencedDocument>` : "")
    + "</ram:ApplicableHeaderTradeSettlement>\n</rsm:SupplyChainTradeTransaction>\n</rsm:CrossIndustryInvoice>\n";
  return s;
}

export function formeLocale(doc: Doc): FormeElectronique {
  return { ...controler(doc), piece: doc.numero, format: "CII D16B — EN 16931 (XML d'une Factur-X)", fichier: `${doc.numero}.xml`, xml: cii(doc) };
}
