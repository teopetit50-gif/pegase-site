// XML structurés : Factur-X (CII, profils BASIC / EN 16931) et UBL 2.1 Invoice.
function x(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function d(iso) { return iso ? iso.replace(/-/g, '') : ''; }
function m(n) { return (Math.round(n * 100) / 100).toFixed(2); }
function categorieTva(l, f) {
  if (f.mentions.some((s) => s.startsWith('Autoliquidation'))) return 'AE';
  if (l.taux_tva === 0 && f.mentions.some((s) => s.startsWith('TVA non applicable'))) return 'E';
  if (l.taux_tva === 0) return 'Z';
  return 'S';
}
function codeUnite(u) { return { u: 'C62', h: 'HUR', jour: 'DAY', mois: 'MON', an: 'ANN', kWh: 'KWH', m3: 'MTQ', m2: 'MTK', ml: 'MTR', tonne: 'TNE', forfait: 'LS', litre: 'LTR', paire: 'PR' }[u] ?? 'C62'; }
const CODE_PAIEMENT = { 'Virement bancaire': '30', 'Virement à 30 jours': '30', 'Prélèvement SEPA': '59', 'Chèque': '20', 'Carte bancaire': '48', 'Espèces': '10', 'Remboursement par virement': '30' };

export function facturXCii(f, profil = 'EN 16931') {
  const urn = profil === 'BASIC' ? 'urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic' : 'urn:cen.eu:en16931:2017';
  const typeCode = f.type_document === 'avoir' ? '381' : '380';
  const lignes = f.lignes.map((l, i) => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>${i + 1}</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>${l.code ? `<ram:SellerAssignedID>${x(l.code)}</ram:SellerAssignedID>` : ''}<ram:Name>${x(l.designation)}</ram:Name></ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>${m(l.prix_unitaire_ht * (1 - l.remise_pct / 100))}</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="${codeUnite(l.unite)}">${l.quantite}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>${categorieTva(l, f)}</ram:CategoryCode><ram:RateApplicablePercent>${l.taux_tva}</ram:RateApplicablePercent></ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${m(l.montant_ht)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`).join('');
  const taxes = f.tva.map((t) => `
      <ram:ApplicableTradeTax><ram:CalculatedAmount>${m(t.montant)}</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode>${t.taux === 0 && f.mentions[0].startsWith('TVA non applicable') ? '<ram:ExemptionReason>TVA non applicable, art. 293 B du CGI</ram:ExemptionReason>' : ''}<ram:BasisAmount>${m(t.base)}</ram:BasisAmount><ram:CategoryCode>${categorieTva({ taux_tva: t.taux }, f)}</ram:CategoryCode><ram:RateApplicablePercent>${t.taux}</ram:RateApplicablePercent></ram:ApplicableTradeTax>`).join('');
  const remise = f.remise_globale ? `
      <ram:SpecifiedTradeAllowanceCharge><ram:ChargeIndicator><udt:Indicator>false</udt:Indicator></ram:ChargeIndicator><ram:ActualAmount>${m(f.remise_globale)}</ram:ActualAmount><ram:Reason>Remise commerciale</ram:Reason><ram:CategoryTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>${f.tva[0].taux}</ram:RateApplicablePercent></ram:CategoryTradeTax></ram:SpecifiedTradeAllowanceCharge>` : '';
  const brutLignes = f.lignes.reduce((s, l) => s + l.montant_ht, 0);
  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100" xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100">
  <rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>${urn}</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument><ram:ID>${x(f.numero)}</ram:ID><ram:TypeCode>${typeCode}</ram:TypeCode><ram:IssueDateTime><udt:DateTimeString format="102">${d(f.date_emission)}</udt:DateTimeString></ram:IssueDateTime>${f.mentions.map((s) => `<ram:IncludedNote><ram:Content>${x(s)}</ram:Content></ram:IncludedNote>`).join('')}</rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>${lignes}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:BuyerReference>${x(f.client.code_client)}</ram:BuyerReference>
      <ram:SellerTradeParty><ram:Name>${x(f.fournisseur.raison_sociale)}</ram:Name><ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${f.fournisseur.siret}</ram:ID></ram:SpecifiedLegalOrganization><ram:PostalTradeAddress><ram:PostcodeCode>${f.fournisseur.code_postal}</ram:PostcodeCode><ram:LineOne>${x(f.fournisseur.adresse)}</ram:LineOne><ram:CityName>${x(f.fournisseur.ville)}</ram:CityName><ram:CountryID>FR</ram:CountryID></ram:PostalTradeAddress>${f.fournisseur.tva_intracom ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${f.fournisseur.tva_intracom}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}</ram:SellerTradeParty>
      <ram:BuyerTradeParty><ram:Name>${x(f.client.raison_sociale)}</ram:Name><ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${f.client.siret}</ram:ID></ram:SpecifiedLegalOrganization><ram:PostalTradeAddress><ram:PostcodeCode>${f.client.code_postal}</ram:PostcodeCode><ram:LineOne>${x(f.client.adresse)}</ram:LineOne><ram:CityName>${x(f.client.ville)}</ram:CityName><ram:CountryID>FR</ram:CountryID></ram:PostalTradeAddress><ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${f.client.tva_intracom}</ram:ID></ram:SpecifiedTaxRegistration></ram:BuyerTradeParty>
      ${f.references.commande ? `<ram:BuyerOrderReferencedDocument><ram:IssuerAssignedID>${x(f.references.commande)}</ram:IssuerAssignedID></ram:BuyerOrderReferencedDocument>` : ''}
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>${f.date_livraison ? `<ram:ActualDeliverySupplyChainEvent><ram:OccurrenceDateTime><udt:DateTimeString format="102">${d(f.date_livraison)}</udt:DateTimeString></ram:OccurrenceDateTime></ram:ActualDeliverySupplyChainEvent>` : ''}${f.references.bon_livraison ? `<ram:DespatchAdviceReferencedDocument><ram:IssuerAssignedID>${x(f.references.bon_livraison)}</ram:IssuerAssignedID></ram:DespatchAdviceReferencedDocument>` : ''}</ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      ${f.references.reference_paiement ? `<ram:PaymentReference>${x(f.references.reference_paiement)}</ram:PaymentReference>` : ''}
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>${CODE_PAIEMENT[f.mode_paiement] ?? '30'}</ram:TypeCode><ram:PayeePartyCreditorFinancialAccount><ram:IBANID>${f.fournisseur.iban}</ram:IBANID></ram:PayeePartyCreditorFinancialAccount><ram:PayeeSpecifiedCreditorFinancialInstitution><ram:BICID>${f.fournisseur.bic}</ram:BICID></ram:PayeeSpecifiedCreditorFinancialInstitution></ram:SpecifiedTradeSettlementPaymentMeans>${taxes}${remise}
      <ram:SpecifiedTradePaymentTerms>${f.date_echeance ? `<ram:DueDateDateTime><udt:DateTimeString format="102">${d(f.date_echeance)}</udt:DateTimeString></ram:DueDateDateTime>` : ''}</ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation><ram:LineTotalAmount>${m(brutLignes)}</ram:LineTotalAmount>${f.remise_globale ? `<ram:AllowanceTotalAmount>${m(f.remise_globale)}</ram:AllowanceTotalAmount>` : ''}<ram:TaxBasisTotalAmount>${m(f.total_ht)}</ram:TaxBasisTotalAmount><ram:TaxTotalAmount currencyID="EUR">${m(f.total_tva)}</ram:TaxTotalAmount><ram:GrandTotalAmount>${m(f.total_ttc)}</ram:GrandTotalAmount>${f.acompte ? `<ram:TotalPrepaidAmount>${m(f.acompte)}</ram:TotalPrepaidAmount>` : ''}<ram:DuePayableAmount>${m(f.net_a_payer)}</ram:DuePayableAmount></ram:SpecifiedTradeSettlementHeaderMonetarySummation>
      ${f.facture_rectifiee ? `<ram:InvoiceReferencedDocument><ram:IssuerAssignedID>${x(f.facture_rectifiee)}</ram:IssuerAssignedID></ram:InvoiceReferencedDocument>` : ''}
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
`;
}

export function ubl21(f) {
  const avoir = f.type_document === 'avoir';
  const racine = avoir ? 'CreditNote' : 'Invoice';
  const ns = avoir ? 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2' : 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2';
  const ligneTag = avoir ? 'cac:CreditNoteLine' : 'cac:InvoiceLine';
  const qteTag = avoir ? 'cbc:CreditedQuantity' : 'cbc:InvoicedQuantity';
  const lignes = f.lignes.map((l, i) => `
  <${ligneTag}>
    <cbc:ID>${i + 1}</cbc:ID>
    <${qteTag} unitCode="${codeUnite(l.unite)}">${Math.abs(l.quantite)}</${qteTag}>
    <cbc:LineExtensionAmount currencyID="EUR">${m(Math.abs(l.montant_ht))}</cbc:LineExtensionAmount>
    <cac:Item><cbc:Name>${x(l.designation)}</cbc:Name>${l.code ? `<cac:SellersItemIdentification><cbc:ID>${x(l.code)}</cbc:ID></cac:SellersItemIdentification>` : ''}<cac:ClassifiedTaxCategory><cbc:ID>${categorieTva(l, f)}</cbc:ID><cbc:Percent>${l.taux_tva}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="EUR">${m(l.prix_unitaire_ht)}</cbc:PriceAmount>${l.remise_pct ? `<cac:AllowanceCharge><cbc:ChargeIndicator>false</cbc:ChargeIndicator><cbc:Amount currencyID="EUR">${m(l.prix_unitaire_ht * l.remise_pct / 100)}</cbc:Amount><cbc:BaseAmount currencyID="EUR">${m(l.prix_unitaire_ht)}</cbc:BaseAmount></cac:AllowanceCharge>` : ''}</cac:Price>
  </${ligneTag}>`).join('');
  const sousTotaux = f.tva.map((t) => `
    <cac:TaxSubtotal><cbc:TaxableAmount currencyID="EUR">${m(Math.abs(t.base))}</cbc:TaxableAmount><cbc:TaxAmount currencyID="EUR">${m(Math.abs(t.montant))}</cbc:TaxAmount><cac:TaxCategory><cbc:ID>${categorieTva({ taux_tva: t.taux }, f)}</cbc:ID><cbc:Percent>${t.taux}</cbc:Percent>${t.taux === 0 && f.mentions[0].startsWith('TVA non applicable') ? '<cbc:TaxExemptionReason>TVA non applicable, art. 293 B du CGI</cbc:TaxExemptionReason>' : ''}<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>`).join('');
  const brutLignes = f.lignes.reduce((s, l) => s + Math.abs(l.montant_ht), 0);
  return `<?xml version="1.0" encoding="UTF-8"?>
<${racine} xmlns="${ns}" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${x(f.numero)}</cbc:ID>
  <cbc:IssueDate>${f.date_emission}</cbc:IssueDate>
  ${f.date_echeance && !avoir ? `<cbc:DueDate>${f.date_echeance}</cbc:DueDate>` : ''}
  <cbc:${avoir ? 'CreditNoteTypeCode' : 'InvoiceTypeCode'}>${avoir ? '381' : '380'}</cbc:${avoir ? 'CreditNoteTypeCode' : 'InvoiceTypeCode'}>
  ${f.mentions.map((s) => `<cbc:Note>${x(s)}</cbc:Note>`).join('\n  ')}
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>${x(f.client.code_client)}</cbc:BuyerReference>
  ${f.references.commande ? `<cac:OrderReference><cbc:ID>${x(f.references.commande)}</cbc:ID></cac:OrderReference>` : ''}
  ${f.facture_rectifiee ? `<cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>${x(f.facture_rectifiee)}</cbc:ID></cac:InvoiceDocumentReference></cac:BillingReference>` : ''}
  ${f.references.bon_livraison ? `<cac:DespatchDocumentReference><cbc:ID>${x(f.references.bon_livraison)}</cbc:ID></cac:DespatchDocumentReference>` : ''}
  <cac:AccountingSupplierParty><cac:Party><cbc:EndpointID schemeID="0009">${f.fournisseur.siret}</cbc:EndpointID><cac:PartyName><cbc:Name>${x(f.fournisseur.raison_sociale)}</cbc:Name></cac:PartyName><cac:PostalAddress><cbc:StreetName>${x(f.fournisseur.adresse)}</cbc:StreetName><cbc:CityName>${x(f.fournisseur.ville)}</cbc:CityName><cbc:PostalZone>${f.fournisseur.code_postal}</cbc:PostalZone><cac:Country><cbc:IdentificationCode>FR</cbc:IdentificationCode></cac:Country></cac:PostalAddress>${f.fournisseur.tva_intracom ? `<cac:PartyTaxScheme><cbc:CompanyID>${f.fournisseur.tva_intracom}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : ''}<cac:PartyLegalEntity><cbc:RegistrationName>${x(f.fournisseur.raison_sociale)}</cbc:RegistrationName><cbc:CompanyID schemeID="0002">${f.fournisseur.siren}</cbc:CompanyID></cac:PartyLegalEntity><cac:Contact><cbc:Telephone>${f.fournisseur.telephone}</cbc:Telephone><cbc:ElectronicMail>${f.fournisseur.courriel}</cbc:ElectronicMail></cac:Contact></cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party><cbc:EndpointID schemeID="0009">${f.client.siret}</cbc:EndpointID><cac:PartyName><cbc:Name>${x(f.client.raison_sociale)}</cbc:Name></cac:PartyName><cac:PostalAddress><cbc:StreetName>${x(f.client.adresse)}</cbc:StreetName><cbc:CityName>${x(f.client.ville)}</cbc:CityName><cbc:PostalZone>${f.client.code_postal}</cbc:PostalZone><cac:Country><cbc:IdentificationCode>FR</cbc:IdentificationCode></cac:Country></cac:PostalAddress><cac:PartyTaxScheme><cbc:CompanyID>${f.client.tva_intracom}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme><cac:PartyLegalEntity><cbc:RegistrationName>${x(f.client.raison_sociale)}</cbc:RegistrationName><cbc:CompanyID schemeID="0002">${f.client.siren}</cbc:CompanyID></cac:PartyLegalEntity></cac:Party></cac:AccountingCustomerParty>
  ${f.date_livraison ? `<cac:Delivery><cbc:ActualDeliveryDate>${f.date_livraison}</cbc:ActualDeliveryDate></cac:Delivery>` : ''}
  <cac:PaymentMeans><cbc:PaymentMeansCode>${CODE_PAIEMENT[f.mode_paiement] ?? '30'}</cbc:PaymentMeansCode>${f.references.reference_paiement ? `<cbc:PaymentID>${x(f.references.reference_paiement)}</cbc:PaymentID>` : ''}<cac:PayeeFinancialAccount><cbc:ID>${f.fournisseur.iban}</cbc:ID><cac:FinancialInstitutionBranch><cbc:ID>${f.fournisseur.bic}</cbc:ID></cac:FinancialInstitutionBranch></cac:PayeeFinancialAccount></cac:PaymentMeans>
  <cac:PaymentTerms><cbc:Note>${x(f.mentions[f.mentions.length - 2])}</cbc:Note></cac:PaymentTerms>
  ${f.remise_globale ? `<cac:AllowanceCharge><cbc:ChargeIndicator>false</cbc:ChargeIndicator><cbc:AllowanceChargeReason>Remise commerciale</cbc:AllowanceChargeReason><cbc:Amount currencyID="EUR">${m(f.remise_globale)}</cbc:Amount><cac:TaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>${f.tva[0].taux}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:AllowanceCharge>` : ''}
  <cac:TaxTotal><cbc:TaxAmount currencyID="EUR">${m(Math.abs(f.total_tva))}</cbc:TaxAmount>${sousTotaux}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="EUR">${m(brutLignes)}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="EUR">${m(Math.abs(f.total_ht))}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="EUR">${m(Math.abs(f.total_ttc))}</cbc:TaxInclusiveAmount>${f.remise_globale ? `<cbc:AllowanceTotalAmount currencyID="EUR">${m(f.remise_globale)}</cbc:AllowanceTotalAmount>` : ''}${f.acompte ? `<cbc:PrepaidAmount currencyID="EUR">${m(Math.abs(f.acompte))}</cbc:PrepaidAmount>` : ''}<cbc:PayableAmount currencyID="EUR">${m(Math.abs(f.net_a_payer))}</cbc:PayableAmount></cac:LegalMonetaryTotal>${lignes}
</${racine}>
`;
}
