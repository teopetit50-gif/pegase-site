import { assertEquals } from "@std/assert";
import { sirenAcheteur, sirenAcheteurXml } from "./acheteur.ts";

const CII =
  `<rsm:CrossIndustryInvoice xmlns:rsm="r" xmlns:ram="a"><rsm:SupplyChainTradeTransaction>` +
  `<ram:SellerTradeParty><ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">380129866</ram:ID></ram:SpecifiedLegalOrganization></ram:SellerTradeParty>` +
  `<ram:BuyerTradeParty><ram:Name>Banc</ram:Name><ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">842 115 763</ram:ID></ram:SpecifiedLegalOrganization></ram:BuyerTradeParty>` +
  `</rsm:SupplyChainTradeTransaction></rsm:CrossIndustryInvoice>`;

const enc = (t: string) =>
  new TextEncoder().encode(t) as Uint8Array<ArrayBuffer>;

async function deflate(t: string): Promise<Uint8Array> {
  const flux = new Blob([enc(t)]).stream().pipeThrough(
    new CompressionStream("deflate"),
  );
  return new Uint8Array(await new Response(flux).arrayBuffer());
}

function pdfAvec(...flux: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const morceaux: Uint8Array[] = [
    enc("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n"),
  ];
  flux.forEach((f, i) => {
    morceaux.push(
      enc(
        `${
          i + 2
        } 0 obj\n<< /Filter /FlateDecode /Length ${f.length} >>\nstream\n`,
      ),
      f,
      enc("\nendstream\nendobj\n"),
    );
  });
  morceaux.push(enc("%%EOF\n"));
  const total = new Uint8Array(morceaux.reduce((n, m) => n + m.length, 0));
  let o = 0;
  for (const m of morceaux) {
    total.set(m, o);
    o += m.length;
  }
  return total;
}

Deno.test("CII : SIREN de l'acheteur (pas du vendeur), espaces retirés", () => {
  assertEquals(sirenAcheteurXml(CII), "842115763");
});

Deno.test("UBL : CompanyID 0002, sinon SIRET 0009 (9 premiers chiffres), sinon routage 0225", () => {
  const ubl = (corps: string) =>
    `<Invoice><cac:AccountingCustomerParty><cac:Party>${corps}</cac:Party></cac:AccountingCustomerParty></Invoice>`;
  assertEquals(
    sirenAcheteurXml(
      ubl(
        `<cbc:EndpointID schemeID="0225">842115763_SERV</cbc:EndpointID><cac:PartyLegalEntity><cbc:CompanyID schemeID="0002">842115763</cbc:CompanyID></cac:PartyLegalEntity>`,
      ),
    ),
    "842115763",
  );
  assertEquals(
    sirenAcheteurXml(
      ubl(
        `<cac:PartyIdentification><cbc:ID schemeID="0009">84211576300017</cbc:ID></cac:PartyIdentification>`,
      ),
    ),
    "842115763",
  );
  assertEquals(
    sirenAcheteurXml(
      ubl(`<cbc:EndpointID schemeID="0225">842115763</cbc:EndpointID>`),
    ),
    "842115763",
  );
  assertEquals(
    sirenAcheteurXml(
      ubl(`<cbc:EndpointID schemeID="0088">3012345678901</cbc:EndpointID>`),
    ),
    null,
  );
});

Deno.test("Factur-X : XML joint compressé parmi d'autres flux du PDF ; non compressé ; PDF sans XML", async () => {
  const pdf = pdfAvec(
    await deflate("BT /F1 12 Tf (Facture) Tj ET"),
    await deflate(CII),
  );
  assertEquals(
    await sirenAcheteur(pdf, "Factur-X", "application/pdf"),
    "842115763",
  );
  assertEquals(
    await sirenAcheteur(
      enc(`%PDF-1.7\nstream\n${CII}\nendstream`),
      "Factur-X",
      "application/pdf",
    ),
    "842115763",
  );
  assertEquals(
    await sirenAcheteur(
      pdfAvec(await deflate("rien")),
      "Factur-X",
      "application/pdf",
    ),
    null,
  );
});

Deno.test("XML illisible ou sans acheteur : null (la porte classera le flux orphelin)", async () => {
  assertEquals(
    await sirenAcheteur(enc("<Invoice/>"), "UBL", "application/xml"),
    null,
  );
});
