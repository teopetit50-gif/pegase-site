// HMRC « Check a UK VAT number » v2 : la clé GB, l'analyse du numéro, la lecture des réponses (formes de la
// spécification OpenAPI de HMRC, v2.0), le jeton OAuth (demandé une fois, renouvelé), un faux fetch. Aucun appel réel.

import { assert, assertEquals } from "@std/assert";
import { analyserTvaGb, cleTvaGbValide, HMRC_BAC_A_SABLE, hmrcDepuisEnv, HmrcRest, lireReponseHmrc } from "../hmrc.ts";
import { HmrcFactice } from "./doubles.ts";

const QUAND = new Date("2026-10-06T15:00:00Z");

/** L'exemple de la spécification (lookup avec requérant). */
const EXEMPLE = {
  target: { name: "Credite Sberger Donal Inc.", vatNumber: "553557881", address: { line1: "131B Barton Hamlet", postcode: "SW97 5CK", countryCode: "GB" } },
  requester: "146295999727",
  consultationNumber: "ypAeKRPlW",
  processingDate: "2019-01-31T12:53:05+00:00",
};

Deno.test("cleTvaGbValide : mod 97 et mod 9755", () => {
  assert(cleTvaGbValide("980780684"));
  assert(cleTvaGbValide("220430231"));
  assert(!cleTvaGbValide("123456789"));
  assert(!cleTvaGbValide("12345678"));
});

Deno.test("analyserTvaGb : GB et XI, 9 ou 12 chiffres, espaces ; le reste n'en est pas", () => {
  assertEquals(analyserTvaGb("GB 980 7806 84"), { vrn: "980780684", pays: "GB", cle_ok: true });
  assertEquals(analyserTvaGb("gb980780684000")?.vrn, "980780684000");
  assertEquals(analyserTvaGb("XI980780684")?.pays, "XI");
  assertEquals(analyserTvaGb("GB123456789")?.cle_ok, false);
  assertEquals(analyserTvaGb("GBGD001"), null);
  assertEquals(analyserTvaGb("FR89380129866"), null);
  assertEquals(analyserTvaGb(""), null);
});

Deno.test("lireReponseHmrc : 200 → valide, nom, adresse, référence de consultation", () => {
  const r = lireReponseHmrc("553557881", 200, EXEMPLE, QUAND);
  assertEquals(r.etat, "valide");
  assertEquals(r.preuve, {
    registre: "hmrc",
    numero: "GB553557881",
    etat: "valide",
    consulte_le: "2019-01-31T12:53:05+00:00",
    nom: "Credite Sberger Donal Inc.",
    adresse: "131B Barton Hamlet, SW97 5CK",
    pays: "GB",
    reference: "ypAeKRPlW",
  });
  const sansRef = lireReponseHmrc("553557881", 200, {
    target: { ...EXEMPLE.target, address: { line1: "1 A", line2: "B", postcode: "X", countryCode: "GB" } },
    processingDate: "p",
  });
  assertEquals(sansRef.preuve.reference, undefined);
  assertEquals(sansRef.preuve.adresse, "1 A, B, X");
});

Deno.test("lireReponseHmrc : 404 NOT_FOUND et 400 sur targetVrn → invalide ; tout le reste → indisponible", () => {
  const nf = lireReponseHmrc("553557881", 404, { code: "NOT_FOUND", message: "targetVrn does not match a registered company" }, QUAND);
  assertEquals(nf.etat, "invalide");
  assertEquals(nf.preuve.motif, "HMRC : numéro de TVA non enregistré.");
  assertEquals(
    lireReponseHmrc("1", 400, { code: "INVALID_REQUEST", message: "Invalid targetVrn - Vrn parameters should be 9 or 12 digits" }, QUAND).etat,
    "invalide",
  );
  // Le requérant (notre numéro) refusé ne dit rien du fournisseur.
  assertEquals(lireReponseHmrc("553557881", 400, { code: "INVALID_REQUEST", message: "Invalid requesterVrn" }, QUAND).etat, "indisponible");
  assertEquals(
    lireReponseHmrc("553557881", 403, { code: "INVALID_REQUEST", message: "requesterVrn does not match a registered company" }, QUAND).etat,
    "indisponible",
  );
  const quota = lireReponseHmrc("553557881", 429, { code: "MESSAGE_THROTTLED_OUT", message: "x" }, QUAND);
  assertEquals(quota.etat, "indisponible");
  assertEquals(quota.motif, "HMRC : HTTP 429 MESSAGE_THROTTLED_OUT");
  assertEquals(lireReponseHmrc("553557881", 401, { code: "INVALID_CREDENTIALS" }, QUAND).etat, "indisponible");
  assertEquals(lireReponseHmrc("553557881", 500, { code: "INTERNAL_SERVER_ERROR" }, QUAND).etat, "indisponible");
  assertEquals(lireReponseHmrc("553557881", 200, null, QUAND).etat, "indisponible");
  assertEquals(lireReponseHmrc("553557881", 404, null, QUAND).etat, "indisponible", "un 404 sans le code NOT_FOUND n'est pas une réponse sur le numéro");
});

function fauxHmrc(lookup: (url: string, init?: RequestInit) => { statut: number; corps?: unknown } | Error) {
  const appels: { url: string; init?: RequestInit }[] = [];
  let jetons = 0;
  const f = async (entree: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = String(entree);
    appels.push({ url, init });
    if (url.endsWith("/oauth/token")) {
      jetons++;
      return await Promise.resolve(
        new Response(JSON.stringify({ access_token: `jeton-${jetons}`, token_type: "bearer", expires_in: 14400, scope: "read:vat" }), { status: 200 }),
      );
    }
    const r = lookup(url, init);
    if (r instanceof Error) throw r;
    return await Promise.resolve(new Response(r.corps === undefined ? "" : JSON.stringify(r.corps), { status: r.statut }));
  };
  return { f: f as typeof fetch, appels, jetons: () => jetons };
}

Deno.test("HmrcRest : jeton client_credentials read:vat, en-têtes v2, un seul jeton pour plusieurs appels, renouvelé à l'expiration", async () => {
  let horloge = 1_000_000;
  const { f, appels, jetons } = fauxHmrc(() => ({ statut: 200, corps: { target: EXEMPLE.target, processingDate: "p" } }));
  const h = new HmrcRest({ clientId: "id-essai", clientSecret: "secret-essai" }, f, HMRC_BAC_A_SABLE, () => horloge);
  const r = await h.consulter("553557881");
  assertEquals(r.etat, "valide");
  assertEquals(r.preuve.cle_ok, false, "la clé est notée, elle n'arrête pas la consultation");
  assertEquals(appels[0].url, "https://test-api.service.hmrc.gov.uk/oauth/token");
  const corpsJeton = new URLSearchParams(String(appels[0].init?.body));
  assertEquals(corpsJeton.get("grant_type"), "client_credentials");
  assertEquals(corpsJeton.get("scope"), "read:vat");
  assertEquals(corpsJeton.get("client_id"), "id-essai");
  assertEquals(appels[1].url, "https://test-api.service.hmrc.gov.uk/organisations/vat/check-vat-number/lookup/553557881");
  const en = appels[1].init?.headers as Record<string, string>;
  assertEquals(en.Accept, "application/vnd.hmrc.2.0+json");
  assertEquals(en.Authorization, "Bearer jeton-1");

  await h.consulter("980780684");
  assertEquals(jetons(), 1, "le jeton sert pour plusieurs consultations");
  horloge += 14_400_000;
  await h.consulter("980780684");
  assertEquals(jetons(), 2, "au bout de quatre heures, un nouveau jeton");
});

Deno.test("HmrcRest : requérant, 401 qui oublie le jeton, jeton refusé, réseau, forme refusée sans appel", async () => {
  let statut = 200;
  const { f, appels, jetons } = fauxHmrc(
    () => (statut === 0 ? new Error("connexion refusée") : { statut, corps: statut === 200 ? EXEMPLE : { code: "INVALID_CREDENTIALS" } }),
  );
  const h = new HmrcRest({ clientId: "a", clientSecret: "b", requerant: "146295999727" }, f, HMRC_BAC_A_SABLE);
  const r = await h.consulter("553557881");
  assertEquals(r.preuve.reference, "ypAeKRPlW");
  assert(appels[1].url.endsWith("/lookup/553557881/146295999727"));

  statut = 401;
  assertEquals((await h.consulter("553557881")).etat, "indisponible");
  statut = 200;
  await h.consulter("553557881");
  assertEquals(jetons(), 2, "après un 401, un nouveau jeton est demandé");

  statut = 0;
  const reseau = await h.consulter("553557881");
  assertEquals(reseau.etat, "indisponible");
  assert(String(reseau.motif).includes("injoignable"));

  const avant = appels.length;
  assertEquals((await h.consulter("12345")).etat, "invalide");
  assertEquals(appels.length, avant, "forme fausse : pas d'appel");

  const refus = async (): Promise<Response> => await Promise.resolve(new Response(JSON.stringify({ error: "invalid_client" }), { status: 401 }));
  const r2 = await new HmrcRest({ clientId: "a", clientSecret: "secret-a-ne-pas-montrer" }, refus as typeof fetch).consulter("553557881");
  assertEquals(r2.etat, "indisponible");
  assertEquals(r2.motif, "HMRC : jeton refusé (HTTP 401 invalid_client)");
  assert(!String(r2.motif).includes("secret"), "le secret ne passe jamais dans le motif");
});

Deno.test("HmrcFactice : le double rend ce qu'on lui a préparé et note les appels", async () => {
  const d = new HmrcFactice();
  d.reponses.set("553557881", { etat: "valide", preuve: { registre: "hmrc", nom: "X" } });
  assertEquals((await d.consulter("553557881")).etat, "valide");
  assertEquals((await d.consulter("980780684")).etat, "indisponible");
  assertEquals(d.appels, ["553557881", "980780684"]);
});

Deno.test("hmrcDepuisEnv : null sans identifiants ; bac à sable par HMRC_BASE ; requérant nettoyé", async () => {
  const env = (v: Record<string, string>) => ({ get: (n: string) => v[n] });
  assertEquals(hmrcDepuisEnv(env({})), null);
  assertEquals(hmrcDepuisEnv(env({ HMRC_CLIENT_ID: "a" })), null);
  const appels: string[] = [];
  const f = async (entree: string | URL | Request): Promise<Response> => {
    appels.push(String(entree));
    const corps = String(entree).endsWith("/oauth/token") ? { access_token: "j", expires_in: 14400 } : EXEMPLE;
    return await Promise.resolve(new Response(JSON.stringify(corps), { status: 200 }));
  };
  const h = hmrcDepuisEnv(
    env({ HMRC_CLIENT_ID: "a", HMRC_CLIENT_SECRET: "b", HMRC_BASE: "https://test-api.service.hmrc.gov.uk/", HMRC_VRN_REQUERANT: "GB 146 2959 99727" }),
    f as typeof fetch,
  );
  assert(h);
  await h.consulter("553557881");
  assertEquals(appels[0], "https://test-api.service.hmrc.gov.uk/oauth/token");
  assertEquals(appels[1], "https://test-api.service.hmrc.gov.uk/organisations/vat/check-vat-number/lookup/553557881/146295999727");
});
