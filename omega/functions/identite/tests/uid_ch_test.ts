// Registre IDE suisse : la clé, l'analyse du numéro, la lecture de GetByUID (réponse réelle relevée le
// 6/10/2026 sur un office fédéral, donnée publique), les fautes, l'appel SOAP avec un faux fetch.

import { assert, assertEquals } from "@std/assert";
import { analyserUidCh, champXml, cleUidChValide, lireFauteUidCh, lireReponseUidCh, UidChSoap } from "../uid_ch.ts";
import { UidChFactice } from "./doubles.ts";

/** GetByUID, CHE-116.068.369, relevé le 6/10/2026 à 14 h 40 Z (HTTP 200). */
const REEL =
  `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><GetByUIDResponse xmlns="http://www.uid.admin.ch/xmlns/uid-wse"><GetByUIDResult><organisationType><organisation xmlns="http://www.ech.ch/xmlns/eCH-0108/5"><organisationIdentification xmlns="http://www.ech.ch/xmlns/eCH-0098/5"><uid xmlns="http://www.ech.ch/xmlns/eCH-0097/5"><uidOrganisationIdCategorie>CHE</uidOrganisationIdCategorie><uidOrganisationId>116068369</uidOrganisationId></uid><OtherOrganisationId xmlns="http://www.ech.ch/xmlns/eCH-0097/5"><organisationIdCategory>CH.ESTVID</organisationIdCategory><organisationId>052.0053.3457</organisationId></OtherOrganisationId><organisationName xmlns="http://www.ech.ch/xmlns/eCH-0097/5">Bundesamt für Landestopografie (swisstopo)</organisationName><legalForm xmlns="http://www.ech.ch/xmlns/eCH-0097/5">0220</legalForm></organisationIdentification><address xmlns="http://www.ech.ch/xmlns/eCH-0098/5"><addressCategory>LEGAL</addressCategory><street>Seftigenstrasse</street><houseNumber>264</houseNumber><town>Wabern</town><swissZipCode>3084</swissZipCode><swissZipCodeAddOn>00</swissZipCodeAddOn><municipalityId>355</municipalityId><cantonAbbreviation>BE</cantonAbbreviation><EGID>1272199</EGID><countryIdISO2>CH</countryIdISO2><deliverableYesNo>true</deliverableYesNo><dateOfLastCheck>2026-09-28</dateOfLastCheck></address><address xmlns="http://www.ech.ch/xmlns/eCH-0098/5"><addressCategory>POBOX</addressCategory><town>Wabern</town><swissZipCode>3084</swissZipCode><swissZipCodeAddOn>00</swissZipCodeAddOn><cantonAbbreviation>BE</cantonAbbreviation><countryIdISO2>CH</countryIdISO2></address></organisation><uidregInformation xmlns="http://www.ech.ch/xmlns/eCH-0108/5"><uidregStatusEnterpriseDetail>3</uidregStatusEnterpriseDetail><uidregPublicStatus>1</uidregPublicStatus><uidregUidService>false</uidregUidService></uidregInformation><vatRegisterInformation xmlns="http://www.ech.ch/xmlns/eCH-0108/5"><vatStatus>2</vatStatus><vatEntryStatus>1</vatEntryStatus><vatEntryDate>1968-01-01</vatEntryDate><uidVat><uidOrganisationIdCategorie xmlns="http://www.ech.ch/xmlns/eCH-0097/5">CHE</uidOrganisationIdCategorie><uidOrganisationId xmlns="http://www.ech.ch/xmlns/eCH-0097/5">116068369</uidOrganisationId></uidVat></vatRegisterInformation></organisationType></GetByUIDResult></GetByUIDResponse></s:Body></s:Envelope>`;

/** GetByUID sur une IDE à clé fausse, relevé le 6/10/2026 (HTTP 500, faute métier). */
const FAUTE_CLE =
  `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><s:Fault><faultcode>s:Client</faultcode><faultstring xml:lang="de-CH">Data_validation_failed</faultstring><detail><businessFault xmlns="http://www.uid.admin.ch/xmlns/uid-wse" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><operation xmlns="http://www.uid.admin.ch/xmlns/uid-wse-shared/2">Data validation</operation><error xmlns="http://www.uid.admin.ch/xmlns/uid-wse-shared/2">Data_validation_failed</error><errorDetail xmlns="http://www.uid.admin.ch/xmlns/uid-wse-shared/2">Invalid UID. The checksum is invalid</errorDetail></businessFault></detail></s:Fault></s:Body></s:Envelope>`;

/** Une réponse réelle dont on change le statut IDE et le statut TVA. */
function variante(statutIde: string, statutTva: string): string {
  return REEL.replace("<uidregStatusEnterpriseDetail>3<", `<uidregStatusEnterpriseDetail>${statutIde}<`)
    .replace("<vatStatus>2<", `<vatStatus>${statutTva}<`);
}

const QUAND = new Date("2026-10-06T14:40:00Z");

Deno.test("cleUidChValide : poids 5 4 3 2 7 6 5 4, mod 11", () => {
  assert(cleUidChValide("116068369"));
  assert(cleUidChValide("100000006"));
  assert(!cleUidChValide("116068368"));
  assert(!cleUidChValide("100000003"));
  assert(!cleUidChValide("12345678"));
  assert(!cleUidChValide("ABCDEFGHI"));
});

Deno.test("analyserUidCh : formes acceptées, suffixe de TVA, ce qui n'en est pas", () => {
  assertEquals(analyserUidCh("CHE-116.068.369"), { uid: "116068369", forme: "CHE-116.068.369", tva: false, cle_ok: true });
  assertEquals(analyserUidCh("che116068369 mwst")?.tva, true);
  assertEquals(analyserUidCh("CHE-116.068.369 TVA")?.tva, true);
  assertEquals(analyserUidCh("CHE-116.068.369 IVA")?.forme, "CHE-116.068.369");
  assertEquals(analyserUidCh("CHE-116.068.368")?.cle_ok, false);
  assertEquals(analyserUidCh("FR89380129866"), null);
  assertEquals(analyserUidCh("CHE-116.068"), null);
  assertEquals(analyserUidCh(""), null);
});

Deno.test("lireReponseUidCh : la réponse réelle → valide, nom, adresse légale, canton, TVA inscrite", () => {
  const r = lireReponseUidCh("116068369", true, REEL, QUAND);
  assertEquals(r.etat, "valide");
  assertEquals(r.preuve.registre, "uid_ch");
  assertEquals(r.preuve.uid, "CHE-116.068.369");
  assertEquals(r.preuve.nom, "Bundesamt für Landestopografie (swisstopo)");
  assertEquals(r.preuve.adresse, "Seftigenstrasse 264, 3084 Wabern");
  assertEquals(r.preuve.canton, "BE");
  assertEquals(r.preuve.statut_ide, "définitif");
  assertEquals(r.preuve.tva, { statut: "inscrit", depuis: "1968-01-01" });
  assertEquals(r.preuve.etat, "actif");
  assertEquals(r.preuve.consulte_le, "2026-10-06T14:40:00.000Z");
  assertEquals(r.preuve.remarque, undefined);
});

Deno.test("lireReponseUidCh : radiée, annulée → invalide ; provisoire → valide avec remarque", () => {
  for (const code of ["5", "6", "7"]) {
    const r = lireReponseUidCh("116068369", false, variante(code, "2"), QUAND);
    assertEquals(r.etat, "invalide", `statut ${code}`);
    assert(String(r.preuve.motif).includes("registre IDE"));
  }
  const p = lireReponseUidCh("116068369", false, variante("1", "2"), QUAND);
  assertEquals(p.etat, "valide");
  assert(String(p.preuve.remarque).includes("provisoire"));
  assertEquals(lireReponseUidCh("116068369", false, variante("4", "2"), QUAND).etat, "valide");
});

Deno.test("lireReponseUidCh : TVA non inscrite → invalide si l'on vérifie un numéro de TVA, valide pour l'entreprise seule", () => {
  const t = lireReponseUidCh("116068369", true, variante("3", "3"), QUAND);
  assertEquals(t.etat, "invalide");
  assert(String(t.preuve.motif).includes("pas inscrite à la TVA"));
  assertEquals(lireReponseUidCh("116068369", false, variante("3", "3"), QUAND).etat, "valide");
  const inconnu = lireReponseUidCh("116068369", true, variante("3", "1"), QUAND);
  assertEquals(inconnu.etat, "valide");
  assert(String(inconnu.preuve.remarque).includes("Statut TVA inconnu"));
});

Deno.test("lireReponseUidCh : résultat vide → inconnue (invalide) ; autre chose → indisponible", () => {
  const vide =
    '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><GetByUIDResponse xmlns="http://www.uid.admin.ch/xmlns/uid-wse"><GetByUIDResult/></GetByUIDResponse></s:Body></s:Envelope>';
  const r = lireReponseUidCh("100000006", false, vide, QUAND);
  assertEquals(r.etat, "invalide");
  assertEquals(r.preuve.motif, "IDE inconnue du registre suisse.");
  assertEquals(lireReponseUidCh("100000006", false, "<html>maintenance</html>", QUAND).etat, "indisponible");
});

Deno.test("lireFauteUidCh : clé refusée par le registre → invalide ; faute d'infrastructure → indisponible", () => {
  const r = lireFauteUidCh("100000003", FAUTE_CLE, QUAND);
  assertEquals(r.etat, "invalide");
  assert(String(r.preuve.motif).includes("checksum"));
  const panne =
    '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><s:Fault><faultcode>s:Server</faultcode><faultstring>Request_limit_exceeded</faultstring><detail><infrastructureFault xmlns="http://www.uid.admin.ch/xmlns/uid-wse"><error xmlns="http://www.uid.admin.ch/xmlns/uid-wse-shared/2">Request_limit_exceeded</error></infrastructureFault></detail></s:Fault></s:Body></s:Envelope>';
  const p = lireFauteUidCh("116068369", panne, QUAND);
  assertEquals(p.etat, "indisponible");
  assertEquals(p.motif, "Registre IDE : Request_limit_exceeded");
});

Deno.test("champXml : préfixes ignorés, entités décodées, espaces repliés", () => {
  assertEquals(champXml('<a:nom x="1">  Caf&#233; &amp; Cie\n SA </a:nom>', "nom"), "Café & Cie SA");
  assertEquals(champXml("<nom></nom>", "nom"), null);
  assertEquals(champXml("<autre>x</autre>", "nom"), null);
});

Deno.test("UidChSoap : enveloppe SOAP, en-têtes, 200, faute 500, réseau, clé fausse sans appel", async () => {
  const appels: { url: string; init?: RequestInit }[] = [];
  let reponse: () => Response | Error = () => new Response(REEL, { status: 200 });
  const f = async (entree: string | URL | Request, init?: RequestInit): Promise<Response> => {
    appels.push({ url: String(entree), init });
    const r = reponse();
    if (r instanceof Error) throw r;
    return await Promise.resolve(r);
  };
  const reg = new UidChSoap(f as typeof fetch, "https://exemple.admin.ch/uid");
  const ok = await reg.consulter("116068369", true);
  assertEquals(ok.etat, "valide");
  assertEquals(appels[0].url, "https://exemple.admin.ch/uid");
  const h = appels[0].init?.headers as Record<string, string>;
  assertEquals(h.SOAPAction, '"http://www.uid.admin.ch/xmlns/uid-wse/IPublicServices/GetByUID"');
  assert(String(appels[0].init?.body).includes("<ech:uidOrganisationId>116068369</ech:uidOrganisationId>"));

  reponse = () => new Response(FAUTE_CLE.replace("100000003", "116068369"), { status: 500 });
  assertEquals((await reg.consulter("116068369", false)).etat, "invalide");
  reponse = () => new Response("Service Unavailable", { status: 503 });
  assertEquals((await reg.consulter("116068369", false)).etat, "indisponible");
  reponse = () => new Error("connexion refusée");
  const r = await reg.consulter("116068369", false);
  assertEquals(r.etat, "indisponible");
  assert(String(r.motif).includes("injoignable"));

  const avant = appels.length;
  const cle = await reg.consulter("116068368", false);
  assertEquals(cle.etat, "invalide");
  assertEquals(appels.length, avant, "clé fausse : pas d'appel réseau");
});

Deno.test("UidChFactice : le double rend ce qu'on lui a préparé et note les appels", async () => {
  const d = new UidChFactice();
  d.reponses.set("116068369", { etat: "valide", preuve: { registre: "uid_ch", nom: "X" } });
  assertEquals((await d.consulter("116068369", true)).etat, "valide");
  assertEquals((await d.consulter("100000006", false)).etat, "indisponible");
  assertEquals(d.appels, [{ uid: "116068369", tva: true }, { uid: "100000006", tva: false }]);
});
