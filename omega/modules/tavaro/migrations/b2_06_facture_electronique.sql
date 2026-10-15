-- b2_06 — La facture électronique côté module : CII EN 16931, contrôles, flux, SIREN du client
-- (session B2, 06/10/2026, vague 3, manque n° 2).
--
-- LE CALENDRIER : réception obligatoire pour toutes les entreprises au 1er septembre 2026 ; émission obligatoire pour les
-- PME et TPE au 1er septembre 2027. Une facture à un client professionnel établi en France passe par une plateforme
-- agréée, au format structuré (Factur-X, UBL ou CII) ; une vente à un particulier relève du e-reporting.
-- CE QUI EST AU MODULE (ici) : que chaque facture et chaque avoir TAVARO sorte en CII D16B conforme EN 16931 (le format
-- de la partie XML d'une Factur-X), qu'on sache avant l'échéance ce qui bloquerait (SIREN, TVA, adresses, catégories),
-- dans quel flux chaque pièce partira, et que l'agence puisse compléter le SIREN d'un client professionnel.
-- CE QUI EST AU SOCLE (coordinateur) : le raccordement à une plateforme agréée, le dépôt, les statuts de cycle de vie,
-- la transmission du e-reporting ; le PDF/A-3 qui porte ce XML. Le socle émet déjà les mentions (SIREN du client,
-- nature des opérations, option sur les débits) : rien n'est changé à l'émission.
--
-- CE QUE ÇA POSE (aucune table, aucune colonne retirée) :
--   · private.loc_siren_valide(text) : neuf chiffres et la clé de Luhn (La Poste 356000000 admise) ;
--   · private.loc_adresse(text) : « 12 rue de la Gare, 75010 Paris » → ligne, code postal, ville, pays FR ;
--   · private.loc_doc_facture(id) / private.loc_doc_avoir(id) : la pièce sous une forme unique (jsonb) ;
--   · private.loc_controler_doc(doc) : le flux (e_invoicing, e_reporting, a_completer) et la liste de ce qui manque ;
--   · private.loc_cii(doc) : le XML CII (rsm:CrossIndustryInvoice, contexte urn:cen.eu:en16931:2017) ;
--   · public.loc_facture_electronique(p_facture) et public.loc_avoir_electronique(p_avoir) : contrôle + XML, pour
--     l'agence qui voit la pièce ;
--   · public.loc_completer_locataire(p_locataire, p_valeurs) : SIREN (contrôlé), raison sociale, adresse d'un client ;
--   · public.loc_preparation_2027() : où en est le loueur (émetteur, clients pros sans SIREN, pièces récentes par flux).

CREATE OR REPLACE FUNCTION private.loc_siren_valide(p text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  v text := regexp_replace(coalesce(p, ''), '\s', '', 'g');
  s integer := 0;
  d integer;
  i integer;
begin
  if v !~ '^[0-9]{9}$' then
    return false;
  end if;
  if v = '356000000' then
    return true;
  end if;
  for i in 1..9 loop
    d := substr(v, i, 1)::integer;
    if i % 2 = 0 then
      d := d * 2;
      if d > 9 then d := d - 9; end if;
    end if;
    s := s + d;
  end loop;
  return s % 10 = 0;
end $function$;

CREATE OR REPLACE FUNCTION private.loc_adresse(p text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  m text[];
begin
  if nullif(btrim(p), '') is null then
    return null;
  end if;
  m := regexp_match(btrim(p), '^(.*?)[,\s]+([0-9]{5})\s+([^,0-9][^,]*)$');
  if m is null then
    return jsonb_build_object('ligne', left(btrim(p), 200), 'structuree', false);
  end if;
  return jsonb_build_object('ligne', left(btrim(m[1]), 200), 'cp', m[2], 'ville', left(btrim(m[3]), 100), 'pays', 'FR', 'structuree', true);
end $function$;

CREATE OR REPLACE FUNCTION private.loc_xml(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select replace(replace(replace(replace(replace(coalesce(p, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&apos;')
$function$;

CREATE OR REPLACE FUNCTION private.loc_dec(p numeric, p_echelle integer DEFAULT 2)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case when p_echelle = 2 then trim(to_char(round(coalesce(p, 0), 2), 'FM999999999990.00'))
              else trim(trailing '.' from trim(trailing '0' from trim(to_char(round(coalesce(p, 0), p_echelle), 'FM999999999990.' || repeat('0', p_echelle))))) end
$function$;

-- L'unité d'une ligne en code UN/ECE (recommandation 20).
CREATE OR REPLACE FUNCTION private.loc_unite_cefact(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case p when 'km' then 'KMT' when 'litre' then 'LTR' when 'jour_entame' then 'DAY' else 'C62' end
$function$;

-- Une facture TAVARO sous la forme commune : en-tête, parties, lignes, totaux.
CREATE OR REPLACE FUNCTION private.loc_doc_facture(p_facture uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'type', 'facture', 'type_code', '380', 'id', f.id, 'numero', f.reference, 'date', f.date_facture, 'echeance', f.echeance_le,
    'contrat', f.contrat_numero, 'emetteur', f.emetteur, 'destinataire', f.destinataire, 'mentions', f.mentions,
    'total_ht', f.total_ht, 'total_tva', f.total_tva, 'total_ttc', f.total_ttc,
    'lignes', coalesce((select jsonb_agg(jsonb_build_object('rang', l.rang, 'libelle', l.libelle, 'quantite', l.quantite, 'unite', l.unite,
                                                            'prix', coalesce(l.prix_unitaire, case when l.quantite <> 0 then round(l.montant_ht / l.quantite, 2) end),
                                                            'ht', l.montant_ht, 'regime', l.regime_tva, 'taux', l.taux_tva, 'tva', l.montant_tva) order by l.rang)
                        from public.loc_facture_lignes l where l.facture_id = f.id), '[]'::jsonb))
  from public.loc_factures f where f.id = p_facture
$function$;

-- Un avoir : une ligne par avoir (son motif), au régime de la facture d'origine ; la facture d'origine est citée.
CREATE OR REPLACE FUNCTION private.loc_doc_avoir(p_avoir uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'type', 'avoir', 'type_code', '381', 'id', a.id, 'numero', a.reference, 'date', a.date_avoir, 'echeance', a.date_avoir,
    'contrat', a.contrat_numero, 'facture_origine', a.facture_reference, 'facture_origine_date', f.date_facture,
    'emetteur', a.emetteur, 'destinataire', a.destinataire, 'mentions', a.mentions,
    'total_ht', a.montant_ht, 'total_tva', a.montant_tva, 'total_ttc', a.montant_ttc,
    'lignes', jsonb_build_array(jsonb_build_object('rang', 1, 'libelle', 'Avoir sur la facture ' || a.facture_reference || ' : ' || a.motif,
                                                   'quantite', 1, 'unite', 'forfait', 'prix', a.montant_ht, 'ht', a.montant_ht,
                                                   'regime', case when a.montant_tva > 0 then 'taxable' else 'hors_champ' end,
                                                   'taux', case when a.montant_ht > 0 and a.montant_tva > 0 then round(a.montant_tva * 100 / a.montant_ht, 2) end,
                                                   'tva', a.montant_tva)))
  from public.loc_avoirs a join public.loc_factures f on f.client_id = a.client_id and f.id = a.facture_id
  where a.id = p_avoir and a.statut = 'emis'
$function$;

-- Le flux de la pièce et ce qui la ferait rejeter par une plateforme agréée (règles EN 16931 et mentions françaises).
CREATE OR REPLACE FUNCTION private.loc_controler_doc(p_doc jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  e jsonb := coalesce(p_doc -> 'emetteur', '{}'::jsonb);
  d jsonb := coalesce(p_doc -> 'destinataire', '{}'::jsonb);
  m text[] := '{}';
  v_flux text;
  v_s boolean;
  v_o boolean;
  v_somme numeric;
begin
  select bool_or(l ->> 'regime' = 'taxable'), bool_or(l ->> 'regime' <> 'taxable'), coalesce(sum((l ->> 'ht')::numeric), 0)
    into v_s, v_o, v_somme
  from jsonb_array_elements(coalesce(p_doc -> 'lignes', '[]'::jsonb)) l;

  if not private.loc_siren_valide(e ->> 'siren') then m := array_append(m, 'siren_emetteur'); end if;
  if not coalesce((private.loc_adresse(e ->> 'adresse') ->> 'structuree')::boolean, false) then m := array_append(m, 'adresse_emetteur'); end if;
  if coalesce(v_s, false) and nullif(e ->> 'numero_tva', '') is null then m := array_append(m, 'numero_tva_emetteur'); end if;
  if coalesce(v_s, false) and coalesce(v_o, false) then m := array_append(m, 'categories_tva_melangees'); end if;
  if jsonb_array_length(coalesce(p_doc -> 'lignes', '[]'::jsonb)) = 0 then m := array_append(m, 'aucune_ligne'); end if;
  if abs(v_somme - coalesce((p_doc ->> 'total_ht')::numeric, 0)) > 0.01 then m := array_append(m, 'totaux_incoherents'); end if;

  if d ->> 'type' = 'professionnel' then
    if private.loc_siren_valide(d ->> 'siren') then
      v_flux := 'e_invoicing';
    else
      v_flux := 'a_completer';
      m := array_append(m, 'siren_client');
    end if;
    if nullif(d ->> 'raison_sociale', '') is null then m := array_append(m, 'raison_sociale_client'); end if;
    if not coalesce((private.loc_adresse(d ->> 'adresse') ->> 'structuree')::boolean, false) then m := array_append(m, 'adresse_client'); end if;
  elsif d ->> 'type' = 'particulier' then
    v_flux := 'e_reporting';
  else
    v_flux := 'a_completer';
    m := array_append(m, 'client');
  end if;
  return jsonb_build_object('flux', v_flux, 'pret', cardinality(m) = 0, 'manques', to_jsonb(m));
end $function$;

-- Le XML CII D16B, profil EN 16931. Les mentions françaises vont en notes (REG : mandat ; PMD : pénalités ; AAI : objet).
CREATE OR REPLACE FUNCTION private.loc_cii(p_doc jsonb)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  e jsonb := coalesce(p_doc -> 'emetteur', '{}'::jsonb);
  d jsonb := coalesce(p_doc -> 'destinataire', '{}'::jsonb);
  mt jsonb := coalesce(p_doc -> 'mentions', '{}'::jsonb);
  ae jsonb := coalesce(private.loc_adresse(e ->> 'adresse'), '{}'::jsonb);
  ad jsonb := coalesce(private.loc_adresse(d ->> 'adresse'), '{}'::jsonb);
  l jsonb;
  t record;
  v_hors boolean;
  v_debits boolean := mt ? 'option_debits';
  x text;
  v_nom_client text := coalesce(nullif(d ->> 'raison_sociale', ''), nullif(d ->> 'nom', ''), 'Client');
  v_motif_o text := 'Indemnité hors du champ de la TVA';
  v_date text := to_char((p_doc ->> 'date')::date, 'YYYYMMDD');
  v_pro boolean := d ->> 'type' = 'professionnel';
  v_livraison text;
begin
  -- la date de la prestation : la restitution du véhicule (mention du socle « JJ/MM/AAAA à HH:MI »), sinon la date de la pièce
  v_livraison := case when mt ->> 'restitution' ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}' then to_char(to_date(left(mt ->> 'restitution', 10), 'DD/MM/YYYY'), 'YYYYMMDD') else v_date end;
  select bool_or(z ->> 'regime' <> 'taxable') into v_hors from jsonb_array_elements(coalesce(p_doc -> 'lignes', '[]'::jsonb)) z;
  x := '<?xml version="1.0" encoding="UTF-8"?>' || E'\n'
    || '<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"'
    || ' xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"'
    || ' xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"'
    || ' xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">' || E'\n'
    -- BT-23, le cadre de facturation de la réforme : S1 = prestation de services, facture à payer
    || '<rsm:ExchangedDocumentContext><ram:BusinessProcessSpecifiedDocumentContextParameter><ram:ID>S1</ram:ID></ram:BusinessProcessSpecifiedDocumentContextParameter><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext>' || E'\n'
    || '<rsm:ExchangedDocument><ram:ID>' || private.loc_xml(p_doc ->> 'numero') || '</ram:ID><ram:TypeCode>' || (p_doc ->> 'type_code') || '</ram:TypeCode>'
    || '<ram:IssueDateTime><udt:DateTimeString format="102">' || v_date || '</udt:DateTimeString></ram:IssueDateTime>'
    || case when mt ? 'objet' then '<ram:IncludedNote><ram:Content>' || private.loc_xml(mt ->> 'objet') || '</ram:Content><ram:SubjectCode>AAI</ram:SubjectCode></ram:IncludedNote>' else '' end
    || case when mt ? 'mandat' then '<ram:IncludedNote><ram:Content>' || private.loc_xml(mt ->> 'mandat') || '</ram:Content><ram:SubjectCode>REG</ram:SubjectCode></ram:IncludedNote>' else '' end
    -- BR-FR-05 : pénalités de retard (PMD), indemnité forfaitaire de recouvrement (PMT), escompte (AAB) — mentions B2B
    || case when v_pro then
         '<ram:IncludedNote><ram:Content>' || private.loc_xml(coalesce(mt ->> 'penalites', 'En cas de retard de paiement : pénalités au taux de la BCE majoré de 10 points (C. com. L441-10).')) || '</ram:Content><ram:SubjectCode>PMD</ram:SubjectCode></ram:IncludedNote>'
         || '<ram:IncludedNote><ram:Content>Indemnité forfaitaire pour frais de recouvrement en cas de retard de paiement : 40 € (C. com. L441-10 et D441-5).</ram:Content><ram:SubjectCode>PMT</ram:SubjectCode></ram:IncludedNote>'
         || '<ram:IncludedNote><ram:Content>Pas d''escompte pour paiement anticipé.</ram:Content><ram:SubjectCode>AAB</ram:SubjectCode></ram:IncludedNote>'
       else '' end
    || case when mt ? 'tva' then '<ram:IncludedNote><ram:Content>' || private.loc_xml(mt ->> 'tva') || '</ram:Content><ram:SubjectCode>TXD</ram:SubjectCode></ram:IncludedNote>' else '' end
    || '</rsm:ExchangedDocument>' || E'\n'
    || '<rsm:SupplyChainTradeTransaction>' || E'\n';

  for l in select * from jsonb_array_elements(coalesce(p_doc -> 'lignes', '[]'::jsonb)) loop
    x := x || '<ram:IncludedSupplyChainTradeLineItem>'
      || '<ram:AssociatedDocumentLineDocument><ram:LineID>' || (l ->> 'rang') || '</ram:LineID></ram:AssociatedDocumentLineDocument>'
      || '<ram:SpecifiedTradeProduct><ram:Name>' || private.loc_xml(l ->> 'libelle') || '</ram:Name></ram:SpecifiedTradeProduct>'
      || '<ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>' || private.loc_dec((l ->> 'prix')::numeric, 2) || '</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>'
      || '<ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="' || private.loc_unite_cefact(l ->> 'unite') || '">' || private.loc_dec((l ->> 'quantite')::numeric, 3) || '</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>'
      || '<ram:SpecifiedLineTradeSettlement><ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode>'
      || case when l ->> 'regime' = 'taxable'
              then '<ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>' || private.loc_dec((l ->> 'taux')::numeric, 2) || '</ram:RateApplicablePercent>'
              else '<ram:CategoryCode>O</ram:CategoryCode>' end
      || '</ram:ApplicableTradeTax>'
      || '<ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>' || private.loc_dec((l ->> 'ht')::numeric, 2) || '</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation>'
      || '</ram:SpecifiedLineTradeSettlement></ram:IncludedSupplyChainTradeLineItem>' || E'\n';
  end loop;

  -- Les parties. Une pièce hors du champ de la TVA (catégorie O) ne porte aucun numéro de TVA (règle BR-O-2).
  x := x || '<ram:ApplicableHeaderTradeAgreement>'
    || '<ram:SellerTradeParty><ram:Name>' || private.loc_xml(e ->> 'nom') || '</ram:Name>'
    || case when e ? 'siren' then '<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">' || private.loc_xml(e ->> 'siren') || '</ram:ID></ram:SpecifiedLegalOrganization>' else '' end
    || '<ram:PostalTradeAddress>' || case when ae ? 'cp' then '<ram:PostcodeCode>' || (ae ->> 'cp') || '</ram:PostcodeCode>' else '' end
    || case when ae ? 'ligne' then '<ram:LineOne>' || private.loc_xml(ae ->> 'ligne') || '</ram:LineOne>' else '' end
    || case when ae ? 'ville' then '<ram:CityName>' || private.loc_xml(ae ->> 'ville') || '</ram:CityName>' else '' end
    || '<ram:CountryID>FR</ram:CountryID></ram:PostalTradeAddress>'
    -- BT-34 : l'adresse électronique de facturation, le SIREN dans l'annuaire de la réforme (schéma 0225), sinon le courriel
    || case when e ? 'siren' then '<ram:URIUniversalCommunication><ram:URIID schemeID="0225">' || private.loc_xml(e ->> 'siren') || '</ram:URIID></ram:URIUniversalCommunication>'
            when e ? 'email' then '<ram:URIUniversalCommunication><ram:URIID schemeID="EM">' || private.loc_xml(e ->> 'email') || '</ram:URIID></ram:URIUniversalCommunication>' else '' end
    || case when e ? 'numero_tva' and not coalesce(v_hors, false) then '<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">' || private.loc_xml(e ->> 'numero_tva') || '</ram:ID></ram:SpecifiedTaxRegistration>' else '' end
    || '</ram:SellerTradeParty>'
    || '<ram:BuyerTradeParty><ram:Name>' || private.loc_xml(v_nom_client) || '</ram:Name>'
    || case when d ->> 'type' = 'professionnel' and d ? 'siren' then '<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">' || private.loc_xml(d ->> 'siren') || '</ram:ID></ram:SpecifiedLegalOrganization>' else '' end
    -- l'adresse de l'acheteur (BG-8) est obligatoire en EN 16931, au moins son pays
    || '<ram:PostalTradeAddress>' || case when ad ? 'cp' then '<ram:PostcodeCode>' || (ad ->> 'cp') || '</ram:PostcodeCode>' else '' end
    || case when ad ? 'ligne' then '<ram:LineOne>' || private.loc_xml(ad ->> 'ligne') || '</ram:LineOne>' else '' end
    || case when ad ? 'ville' then '<ram:CityName>' || private.loc_xml(ad ->> 'ville') || '</ram:CityName>' else '' end
    || '<ram:CountryID>FR</ram:CountryID></ram:PostalTradeAddress>'
    -- BT-49 (BR-FR-12) : de même pour l'acheteur
    || case when v_pro and d ? 'siren' then '<ram:URIUniversalCommunication><ram:URIID schemeID="0225">' || private.loc_xml(d ->> 'siren') || '</ram:URIID></ram:URIUniversalCommunication>'
            when d ? 'email' then '<ram:URIUniversalCommunication><ram:URIID schemeID="EM">' || private.loc_xml(d ->> 'email') || '</ram:URIID></ram:URIUniversalCommunication>' else '' end
    || '</ram:BuyerTradeParty>'
    || case when p_doc ? 'contrat' then '<ram:ContractReferencedDocument><ram:IssuerAssignedID>' || private.loc_xml(p_doc ->> 'contrat') || '</ram:IssuerAssignedID></ram:ContractReferencedDocument>' else '' end
    || '</ram:ApplicableHeaderTradeAgreement>' || E'\n'
    || '<ram:ApplicableHeaderTradeDelivery><ram:ActualDeliverySupplyChainEvent><ram:OccurrenceDateTime><udt:DateTimeString format="102">' || v_livraison
    || '</udt:DateTimeString></ram:OccurrenceDateTime></ram:ActualDeliverySupplyChainEvent></ram:ApplicableHeaderTradeDelivery>' || E'\n'
    || '<ram:ApplicableHeaderTradeSettlement><ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>';

  -- La ventilation de la TVA, par catégorie et par taux.
  for t in
    select z ->> 'regime' as regime, (z ->> 'taux')::numeric as taux, sum((z ->> 'ht')::numeric) as base, sum(coalesce((z ->> 'tva')::numeric, 0)) as tva
    from jsonb_array_elements(coalesce(p_doc -> 'lignes', '[]'::jsonb)) z
    group by 1, 2 order by 1 desc, 2
  loop
    x := x || '<ram:ApplicableTradeTax><ram:CalculatedAmount>' || private.loc_dec(case when t.regime = 'taxable' then t.tva else 0 end, 2) || '</ram:CalculatedAmount>'
      || '<ram:TypeCode>VAT</ram:TypeCode>'
      || case when t.regime = 'taxable' then '' else '<ram:ExemptionReason>' || private.loc_xml(v_motif_o) || '</ram:ExemptionReason>' end
      || '<ram:BasisAmount>' || private.loc_dec(t.base, 2) || '</ram:BasisAmount>'
      || '<ram:CategoryCode>' || case when t.regime = 'taxable' then 'S' else 'O' end || '</ram:CategoryCode>'
      || case when t.regime = 'taxable' then '<ram:DueDateTypeCode>' || case when v_debits then '5' else '72' end || '</ram:DueDateTypeCode>'
                                           || '<ram:RateApplicablePercent>' || private.loc_dec(t.taux, 2) || '</ram:RateApplicablePercent>' else '' end
      || '</ram:ApplicableTradeTax>';
  end loop;

  x := x || '<ram:SpecifiedTradePaymentTerms>'
    || case when (p_doc ->> 'echeance')::date <= (p_doc ->> 'date')::date then '<ram:Description>À régler à réception</ram:Description>' else '' end
    || '<ram:DueDateDateTime><udt:DateTimeString format="102">' || to_char((p_doc ->> 'echeance')::date, 'YYYYMMDD') || '</udt:DateTimeString></ram:DueDateDateTime></ram:SpecifiedTradePaymentTerms>'
    || '<ram:SpecifiedTradeSettlementHeaderMonetarySummation>'
    || '<ram:LineTotalAmount>' || private.loc_dec((p_doc ->> 'total_ht')::numeric, 2) || '</ram:LineTotalAmount>'
    || '<ram:TaxBasisTotalAmount>' || private.loc_dec((p_doc ->> 'total_ht')::numeric, 2) || '</ram:TaxBasisTotalAmount>'
    || '<ram:TaxTotalAmount currencyID="EUR">' || private.loc_dec((p_doc ->> 'total_tva')::numeric, 2) || '</ram:TaxTotalAmount>'
    || '<ram:GrandTotalAmount>' || private.loc_dec((p_doc ->> 'total_ttc')::numeric, 2) || '</ram:GrandTotalAmount>'
    || '<ram:DuePayableAmount>' || private.loc_dec((p_doc ->> 'total_ttc')::numeric, 2) || '</ram:DuePayableAmount>'
    || '</ram:SpecifiedTradeSettlementHeaderMonetarySummation>'
    || case when p_doc ? 'facture_origine' then '<ram:InvoiceReferencedDocument><ram:IssuerAssignedID>' || private.loc_xml(p_doc ->> 'facture_origine') || '</ram:IssuerAssignedID>'
              || case when p_doc ? 'facture_origine_date' then '<ram:FormattedIssueDateTime><qdt:DateTimeString format="102">' || to_char((p_doc ->> 'facture_origine_date')::date, 'YYYYMMDD') || '</qdt:DateTimeString></ram:FormattedIssueDateTime>' else '' end
              || '</ram:InvoiceReferencedDocument>' else '' end
    || '</ram:ApplicableHeaderTradeSettlement>' || E'\n'
    || '</rsm:SupplyChainTradeTransaction>' || E'\n'
    || '</rsm:CrossIndustryInvoice>' || E'\n';
  return x;
end $function$;

-- ── Les portes ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.loc_facture_electronique(p_facture uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  f public.loc_factures := private.loc_facture_de_l_agence(p_facture);
  v_doc jsonb := private.loc_doc_facture(f.id);
begin
  return private.loc_controler_doc(v_doc)
      || jsonb_build_object('piece', f.reference, 'format', 'CII D16B — EN 16931 (XML d''une Factur-X)', 'fichier', f.reference || '.xml', 'xml', private.loc_cii(v_doc));
end $function$;

CREATE OR REPLACE FUNCTION public.loc_avoir_electronique(p_avoir uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  a public.loc_avoirs;
  v_doc jsonb;
begin
  select * into a from public.loc_avoirs where id = p_avoir;
  if not found then
    raise exception 'Avoir introuvable.' using errcode = 'P0002';
  end if;
  perform private.loc_facture_de_l_agence(a.facture_id);
  if a.statut <> 'emis' then
    raise exception 'Un avoir non émis n''a pas de forme électronique.' using errcode = '23514';
  end if;
  v_doc := private.loc_doc_avoir(a.id);
  return private.loc_controler_doc(v_doc)
      || jsonb_build_object('piece', a.reference, 'format', 'CII D16B — EN 16931 (XML d''une Factur-X)', 'fichier', a.reference || '.xml', 'xml', private.loc_cii(v_doc));
end $function$;

-- Le SIREN, la raison sociale et l'adresse d'un client, complétés par l'agence (la prochaine facture les portera).
CREATE OR REPLACE FUNCTION public.loc_completer_locataire(p_locataire uuid, p_valeurs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  l public.loc_locataires;
  v_siren text;
  v_rs text;
  v_adresse text;
  v_champs text[] := '{}';
begin
  if v_uid is null then
    raise exception 'Ce geste se fait par une personne connectée.' using errcode = '42501';
  end if;
  select * into l from public.loc_locataires where id = p_locataire for update;
  if not found or not exists (select 1 from public.comptes k where k.user_id = v_uid and k.client_id = l.client_id) then
    raise exception 'Client introuvable.' using errcode = 'P0002';
  end if;
  if not private.a_un_role(l.client_id, array['gerant', 'admin', 'valideur', 'collaborateur'])
     or not exists (select 1 from public.loc_contrats c where c.client_id = l.client_id and c.locataire_id = l.id and private.voit_entite(c.client_id, c.entite_id)) then
    raise exception 'Ce client n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  if l.anonymise_le is not null then
    raise exception 'Ce client est anonymisé.' using errcode = '23514';
  end if;
  if jsonb_typeof(p_valeurs) is distinct from 'object' then
    raise exception 'Les valeurs sont un objet.' using errcode = '22023';
  end if;
  if p_valeurs ? 'siren' then
    v_siren := regexp_replace(coalesce(p_valeurs ->> 'siren', ''), '\s', '', 'g');
    if not private.loc_siren_valide(v_siren) then
      raise exception 'Ce SIREN n''est pas valide (neuf chiffres, clé de contrôle) : vérifiez-le sur l''extrait Kbis ou annuaire-entreprises.data.gouv.fr.' using errcode = '22023';
    end if;
    v_champs := array_append(v_champs, 'siren');
  end if;
  v_rs := private.loc_lire_texte(p_valeurs, 'raison_sociale', 200);
  if v_rs is not null then v_champs := array_append(v_champs, 'raison_sociale'); end if;
  v_adresse := private.loc_lire_texte(p_valeurs, 'adresse', 500);
  if v_adresse is not null then v_champs := array_append(v_champs, 'adresse'); end if;
  if cardinality(v_champs) = 0 then
    raise exception 'Rien à compléter.' using errcode = '22023';
  end if;
  update public.loc_locataires
     set siren = coalesce(v_siren, siren), raison_sociale = coalesce(v_rs, raison_sociale), adresse = coalesce(v_adresse, adresse),
         type = case when v_siren is not null or v_rs is not null then 'professionnel' else type end
   where id = l.id;
  perform private.journaliser_module(l.client_id, 'tavaro', 'tavaro.locataire_complete', 'loc_locataires', l.id::text,
    jsonb_build_object('champs', to_jsonb(v_champs), 'par', v_uid), null);
  return jsonb_build_object('locataire', l.id, 'champs', to_jsonb(v_champs));
end $function$;

-- Où en est le loueur pour le 1er septembre 2027 : l'émetteur, les clients pros sans SIREN, les pièces des 90 derniers jours.
CREATE OR REPLACE FUNCTION public.loc_preparation_2027()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur'], 'La préparation à la facture électronique se lit par la direction ou un valideur.');
  v_emetteur jsonb;
  v_pieces jsonb;
  v_sans_siren integer;
begin
  select f.emetteur into v_emetteur from public.loc_factures f where f.client_id = v_client order by f.emise_le desc limit 1;
  if v_emetteur is null then
    select jsonb_strip_nulls(jsonb_build_object('nom', k.nom, 'siren', coalesce(e.siren, k.siren)) || coalesce(g.emetteur, '{}'::jsonb)) into v_emetteur
    from public.clients k
    left join public.entites e on e.client_id = k.id and e.principale
    left join public.loc_reglages g on g.client_id = k.id
    where k.id = v_client;
  end if;
  select count(*) into v_sans_siren from public.loc_locataires l
  where l.client_id = v_client and l.type = 'professionnel' and l.anonymise_le is null and not private.loc_siren_valide(l.siren)
    and exists (select 1 from public.loc_contrats c where c.client_id = l.client_id and c.locataire_id = l.id and c.depart_le > now() - interval '1 year');
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_pieces from (
    select c ->> 'flux' as flux, count(*) as n, count(*) filter (where (c ->> 'pret')::boolean) as prets
    from (select private.loc_controler_doc(private.loc_doc_facture(f.id)) as c
          from public.loc_factures f where f.client_id = v_client and f.emise_le > now() - interval '90 days') s
    group by 1 order by 1) x;
  return jsonb_build_object(
    'echeance_reception', date '2026-09-01', 'echeance_emission', date '2027-09-01',
    'emetteur', jsonb_build_object('siren', private.loc_siren_valide(v_emetteur ->> 'siren'), 'numero_tva', nullif(v_emetteur ->> 'numero_tva', '') is not null,
                                   'adresse', coalesce((private.loc_adresse(v_emetteur ->> 'adresse') ->> 'structuree')::boolean, false)),
    'clients_pro_sans_siren', v_sans_siren,
    'pieces_90_jours', v_pieces);
end $function$;

revoke all on function private.loc_siren_valide(text) from public, anon, authenticated;
revoke all on function private.loc_adresse(text) from public, anon, authenticated;
revoke all on function private.loc_xml(text) from public, anon, authenticated;
revoke all on function private.loc_dec(numeric, integer) from public, anon, authenticated;
revoke all on function private.loc_unite_cefact(text) from public, anon, authenticated;
revoke all on function private.loc_doc_facture(uuid) from public, anon, authenticated;
revoke all on function private.loc_doc_avoir(uuid) from public, anon, authenticated;
revoke all on function private.loc_controler_doc(jsonb) from public, anon, authenticated;
revoke all on function private.loc_cii(jsonb) from public, anon, authenticated;
grant execute on function private.loc_doc_facture(uuid) to service_role;
grant execute on function private.loc_doc_avoir(uuid) to service_role;
grant execute on function private.loc_controler_doc(jsonb) to service_role;
grant execute on function private.loc_cii(jsonb) to service_role;
revoke all on function public.loc_facture_electronique(uuid) from public, anon;
revoke all on function public.loc_avoir_electronique(uuid) from public, anon;
revoke all on function public.loc_completer_locataire(uuid, jsonb) from public, anon;
revoke all on function public.loc_preparation_2027() from public, anon;
grant execute on function public.loc_facture_electronique(uuid) to authenticated, service_role;
grant execute on function public.loc_avoir_electronique(uuid) to authenticated, service_role;
grant execute on function public.loc_completer_locataire(uuid, jsonb) to authenticated, service_role;
grant execute on function public.loc_preparation_2027() to authenticated, service_role;
