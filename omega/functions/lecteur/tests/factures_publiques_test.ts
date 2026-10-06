// Factures électroniques réelles, publiques (banc/publics/LISEZMOI.md) : Factur-X / ZUGFeRD 2.3 aux profils
// MINIMUM, BASIC et EN16931, un vrai PDF/A-3 Factur-X, deux UBL. Tout se lit sans IA, source « xml »,
// confiance 1, une ligne par champ ; le PDF visible est rapproché du XML, qui fait foi.

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import type { PageLue, ResultatLecture } from "@partage/portes.ts";
import { concorder, formesImprimees } from "../concordance.ts";
import { detecter } from "../detecter.ts";
import { lirePiece } from "../lire_piece.ts";
import { estXmlFacture, lireXmlFacture, typeDepuisCode } from "../xml_facture.ts";
import { contexteDeTest, pieceDeTest, travailDeTest } from "./doubles.ts";

const ici = new URL("../banc/publics/", import.meta.url);
let rang = 60;

async function lire(fichier: string, mime: string): Promise<{ issue: string; r: ResultatLecture; appelsIa: number }> {
  const { ctx, portes, depot, ia } = contexteDeTest();
  const n = rang++;
  const piece = pieceDeTest(`cccccccc-0000-4000-8000-0000000000${n}`, fichier, mime);
  portes.pieces.set(piece.id, piece);
  depot.fichiers.set(piece.chemin, await Deno.readFile(new URL(fichier, ici)));
  const issue = await lirePiece(ctx, travailDeTest(n, piece.id));
  return { issue, r: portes.enregistrements[0]?.resultat, appelsIa: ia!.appels.length };
}

function valeursDe(r: ResultatLecture): Map<string, unknown> {
  return new Map(r.valeurs.map((v) => [v.champ, v.valeur]));
}

function regleCommune(r: ResultatLecture) {
  const champs = r.valeurs.map((v) => v.champ);
  assertEquals(champs.length, new Set(champs).size, "une ligne par champ");
  for (const v of r.valeurs) {
    assertEquals(v.source, "xml", v.champ);
    assertEquals(v.confiance, 1, v.champ);
  }
}

Deno.test("Factur-X MINIMUM (XML seul) : en-tête et totaux, sans lignes, sans IA", async () => {
  const { issue, r, appelsIa } = await lire("zugferd_2p3_MINIMUM_Rechnung.xml", "application/xml");
  assertEquals(issue, "lue");
  assertEquals(appelsIa, 0);
  assertEquals(r.methode, "xml");
  regleCommune(r);
  const v = valeursDe(r);
  assertEquals(v.get("numero"), "471102");
  assertEquals(v.get("date"), "2024-11-15");
  assertEquals(v.get("montant_ht"), 198);
  assertEquals(v.get("montant_tva"), 37.62);
  assertEquals(v.get("montant_ttc"), 235.62);
  assertEquals(v.get("fournisseur.tva"), "DE123456789");
  assertEquals(v.has("lignes"), false, "le profil MINIMUM ne porte pas de lignes");
});

Deno.test("Factur-X BASIC (XML seul) : échéance, lignes et ventilation en tableaux jsonb", async () => {
  const { issue, r, appelsIa } = await lire("zugferd_2p3_BASIC_Einfach.xml", "application/xml");
  assertEquals(issue, "lue");
  assertEquals(appelsIa, 0);
  regleCommune(r);
  const v = valeursDe(r);
  assertEquals(v.get("echeance"), "2024-12-15");
  assertEquals(v.get("montant_ttc"), 235.62);
  const lignes = v.get("lignes") as Record<string, unknown>[];
  assert(Array.isArray(lignes) && lignes.length >= 1);
  assertEquals(lignes[0].quantite !== null && lignes[0].montant !== null, true);
  assertEquals(v.get("tva.ventilation"), [{ categorie: "S", taux: 19, base: 198, montant: 37.62, motif: null }]);
});

Deno.test("Factur-X EN16931 (XML seul) : deux taux de TVA, lignes, TTC", async () => {
  const { issue, r } = await lire("zugferd_2p3_EN16931_Einfach.xml", "text/xml");
  assertEquals(issue, "lue");
  regleCommune(r);
  const v = valeursDe(r);
  assertEquals(v.get("montant_ht"), 473);
  assertEquals(v.get("montant_tva"), 56.87);
  assertEquals(v.get("montant_ttc"), 529.87);
  assertEquals((v.get("tva.ventilation") as unknown[]).length, 2);
  assertEquals((v.get("lignes") as unknown[]).length, 2);
});

Deno.test("vrai PDF/A-3 Factur-X EN16931 : XML joint lu sans IA, chaque total retrouvé dans le PDF visible", async () => {
  const { issue, r, appelsIa } = await lire("EN16931_Einfach.pdf", "application/pdf");
  assertEquals(issue, "lue");
  assertEquals(appelsIa, 0, "le XML joint suffit, pas de modèle");
  assertEquals(r.methode, "xml");
  assertEquals(r.nb_pages, 2);
  regleCommune(r);
  const ttc = r.valeurs.find((v) => v.champ === "montant_ttc")!;
  assertEquals(ttc.valeur, 529.87);
  assertEquals(ttc.page, 2);
  assert(ttc.boite, "boîte issue du PDF");
  assertStringIncludes(ttc.controle!, "concorde avec le PDF page 2");
  assertEquals(r.motif, undefined, "aucune divergence");
});

Deno.test("UBL XRechnung : la TVA vient du régime VAT, pas du numéro fiscal national (FC)", async () => {
  const { issue, r } = await lire("XRECHNUNG_Einfach.ubl.xml", "application/xml");
  assertEquals(issue, "lue");
  regleCommune(r);
  const v = valeursDe(r);
  assertEquals(v.get("fournisseur.tva"), "DE123456789");
  assertEquals(v.get("fournisseur.iban"), "DE02120300000000202051");
  assertEquals(v.get("montant_ttc"), 529.87);
});

Deno.test("UBL CreditNote : un avoir, commande et contrat rappelés, acompte", async () => {
  const { issue, r } = await lire("ubl-creditnote.xml", "application/xml");
  assertEquals(issue, "lue");
  assertEquals(r.type_piece, "avoir");
  regleCommune(r);
  const v = valeursDe(r);
  assertEquals(v.get("commande.reference"), "123");
  assertEquals(v.get("contrat.reference"), "Contract321");
  assertEquals(v.get("net_a_payer"), 729);
});

Deno.test("divergence XML / PDF visible : notée, le XML fait foi, la valeur n'est pas touchée", () => {
  const pages: PageLue[] = [{
    n: 1,
    methode: "natif",
    confiance: 1,
    texte: "FACTURE 471102 du 15/11/2024\nTotal HT 473,00 €\nTVA 56,87 €\nTotal TTC 530,00 €\nNet à payer 530,00 €",
  }];
  const valeurs = [
    { champ: "numero", valeur: "471102", source: "xml" as const, confiance: 1, verifiee: true, controle: "lu dans CII ExchangedDocument/ID" },
    { champ: "montant_ttc", valeur: 529.87, source: "xml" as const, confiance: 1, verifiee: true, controle: "lu dans CII GrandTotalAmount" },
    { champ: "devise", valeur: "EUR", source: "xml" as const, confiance: 1, verifiee: true, controle: "lu dans CII InvoiceCurrencyCode" },
  ];
  const c = concorder(valeurs, pages, []);
  assertEquals(c.divergences, ["montant_ttc"]);
  const ttc = c.valeurs.find((v) => v.champ === "montant_ttc")!;
  assertEquals(ttc.valeur, 529.87);
  assertEquals(ttc.verifiee, true, "le XML fait foi");
  assertStringIncludes(ttc.controle!, "non retrouvée dans le PDF visible");
  assertEquals(c.valeurs.find((v) => v.champ === "numero")!.page, 1);
  assertEquals(c.valeurs.find((v) => v.champ === "devise")!.controle, "lu dans CII InvoiceCurrencyCode", "champ non comparé : intact");
  // Un PDF sans texte (image) : rien n'est comparé, rien n'est noté.
  assertEquals(concorder(valeurs, [{ n: 1, methode: "natif", confiance: 1, texte: "" }], []).divergences, []);
});

Deno.test("formes imprimées : montants et dates", () => {
  assert(formesImprimees("montant_ttc", 1481.28).includes("1 481,28"));
  assert(formesImprimees("montant_ttc", 1481.28).includes("1.481,28"));
  assert(formesImprimees("montant_ttc", 1481.28).includes("1,481.28"));
  assertEquals(formesImprimees("montant_prepaye", 0), []);
  assert(formesImprimees("date", "2024-11-15").includes("15.11.2024"));
  assert(formesImprimees("date", "2024-11-15").includes("15 novembre 2024"));
});

Deno.test("un XML qui ouvre sur un long commentaire (licence FeRD) est reconnu", async () => {
  const octets = await Deno.readFile(new URL("zugferd_2p3_EN16931_Einfach.xml", ici));
  const texte = new TextDecoder().decode(octets);
  assert(texte.indexOf("CrossIndustryInvoice") > 4000, "la racine est bien loin dans le fichier");
  assert(estXmlFacture(texte));
  assertEquals(detecter(octets, "application/octet-stream", "facture").famille, "xml", "sans extension ni MIME XML");
});

Deno.test("facture rectificative (384) à total négatif : un avoir, avec son code et son total signé", async () => {
  const { issue, r } = await lire("zugferd_2p3_EN16931_Rechnungskorrektur.xml", "application/xml");
  assertEquals(issue, "lue");
  assertEquals(r.type_piece, "avoir");
  regleCommune(r);
  const v = valeursDe(r);
  assertEquals(v.get("type_code"), "384");
  assertEquals(v.get("montant_ttc"), -8.79);
});

Deno.test("nature d'après le code UNTDID 1001 : avoirs, rectificative, factures", () => {
  for (const code of ["381", "261", "262", "396", "502", "503"]) assertEquals(typeDepuisCode(code, null), "avoir", code);
  for (const code of ["380", "386", "389", "393", "501", "751"]) assertEquals(typeDepuisCode(code, null), "facture", code);
  assertEquals(typeDepuisCode("384", null, 120), "facture", "rectificative positive : une facture");
  assertEquals(typeDepuisCode("384", null, -8.79), "avoir", "rectificative négative : un avoir de fait");
  assertEquals(typeDepuisCode("380", "CreditNote"), "avoir", "racine UBL CreditNote");
});

Deno.test("cadre de facturation français (B1, S1, M1…) lu dans le contexte du document, pas un autre processus", async () => {
  const xml = new TextDecoder().decode(await Deno.readFile(new URL("zugferd_2p3_EN16931_Einfach.xml", ici)));
  const avec = (id: string) =>
    xml.replace(
      /<rsm:ExchangedDocumentContext>/,
      `<rsm:ExchangedDocumentContext><ram:BusinessProcessSpecifiedDocumentContextParameter><ram:ID>${id}</ram:ID></ram:BusinessProcessSpecifiedDocumentContextParameter>`,
    );
  const cadre = (x: string) => lireXmlFacture(x)!.valeurs.find((v) => v.champ === "cadre_facturation")?.valeur;
  assertEquals(cadre(avec("B1")), "B1");
  assertEquals(cadre(avec("S1")), "S1");
  assertEquals(cadre(avec("Baurechnung")), undefined);
  assertEquals(cadre(xml), undefined);
});
