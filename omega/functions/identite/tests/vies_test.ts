// VIES : lecture des réponses, l'appel REST avec un faux fetch.

import { assert, assertEquals } from "@std/assert";
import { lireReponseVies, paysEtNumero, ViesRest } from "../vies.ts";

function fauxFetch(reponse: (url: string, init?: RequestInit) => { statut: number; corps?: unknown } | Error) {
  const appels: { url: string; init?: RequestInit }[] = [];
  const f = async (entree: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = String(entree);
    appels.push({ url, init });
    const r = reponse(url, init);
    if (r instanceof Error) throw r;
    return await Promise.resolve(
      new Response(r.corps === undefined ? "" : typeof r.corps === "string" ? r.corps : JSON.stringify(r.corps), { status: r.statut }),
    );
  };
  return { f: f as typeof fetch, appels };
}

Deno.test("lireReponseVies : valide avec nom et adresse, invalide, indisponible, forme refusée", () => {
  const ok = lireReponseVies("FR", "11123456782", {
    countryCode: "FR",
    vatNumber: "11123456782",
    requestDate: "2026-10-05T10:00:00.000Z",
    valid: true,
    name: "SAS ATELIER DURAND",
    address: "1 RUE DE LA PAIX\n75002 PARIS",
    userError: "VALID",
  });
  assertEquals(ok.etat, "valide");
  assertEquals(ok.preuve.nom, "SAS ATELIER DURAND");
  assertEquals(ok.preuve.adresse, "1 RUE DE LA PAIX 75002 PARIS");
  assertEquals(ok.preuve.consulte_le, "2026-10-05T10:00:00.000Z");

  const ko = lireReponseVies("FR", "11123456782", { valid: false, name: "---", address: "---", userError: "INVALID" });
  assertEquals(ko.etat, "invalide");
  assertEquals(ko.preuve.nom, undefined);
  assert(String(ko.preuve.motif).includes("ne reconnaît pas"));

  const ms = lireReponseVies("DE", "123456788", { valid: false, userError: "MS_UNAVAILABLE" });
  assertEquals(ms.etat, "indisponible");
  assertEquals(ms.motif, "VIES : MS_UNAVAILABLE");
  assertEquals(lireReponseVies("DE", "1", { valid: false, userError: "GLOBAL_MAX_CONCURRENT_REQ" }).etat, "indisponible");
  assertEquals(lireReponseVies("DE", "1", { valid: false, userError: "INVALID_INPUT" }).etat, "invalide");
  assertEquals(lireReponseVies("DE", "1", { valid: false, userError: "BIZARRE" }).etat, "indisponible");
  // Sans userError (anciennes réponses) : valid fait foi.
  assertEquals(lireReponseVies("BE", "0123456749", { valid: true, name: "X" }).etat, "valide");
});

Deno.test("ViesRest : corps JSON, 200, 500, réseau, illisible", async () => {
  const ok = fauxFetch(() => ({ statut: 200, corps: { valid: true, name: "X", address: "Y", userError: "VALID" } }));
  const v = new ViesRest(ok.f);
  assertEquals((await v.consulter("FR", "11123456782")).etat, "valide");
  assertEquals(ok.appels[0].url, "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number");
  assertEquals(JSON.parse(String(ok.appels[0].init?.body)), { countryCode: "FR", vatNumber: "11123456782" });
  assertEquals(ok.appels[0].init?.method, "POST");

  assertEquals((await new ViesRest(fauxFetch(() => ({ statut: 500, corps: "boom" })).f).consulter("FR", "1")).etat, "indisponible");
  assertEquals((await new ViesRest(fauxFetch(() => new Error("timeout")).f).consulter("FR", "1")).etat, "indisponible");
  assertEquals((await new ViesRest(fauxFetch(() => ({ statut: 200, corps: "<html>" })).f).consulter("FR", "1")).etat, "indisponible");
});

Deno.test("paysEtNumero", () => {
  assertEquals(paysEtNumero("FR11123456782"), { pays: "FR", numero: "11123456782" });
  assertEquals(paysEtNumero("123"), null);
});

Deno.test("lireReponseVies : une réponse d'erreur (errorWrappers, actionSucceed false) ou sans verdict n'est jamais « invalide »", () => {
  const env = lireReponseVies("FR", "89380129866", { actionSucceed: false, errorWrappers: [{ error: "MS_UNAVAILABLE", message: "x" }] });
  assertEquals(env.etat, "indisponible");
  assertEquals(env.motif, "VIES : MS_UNAVAILABLE");
  assertEquals(lireReponseVies("FR", "1", { actionSucceed: false, errorWrappers: [{ error: "MS_MAX_CONCURRENT_REQ" }] }).etat, "indisponible");
  assertEquals(lireReponseVies("FR", "1", { actionSucceed: false }).etat, "indisponible");
  assertEquals(lireReponseVies("FR", "1", { actionSucceed: false, errorWrappers: [{ error: "INVALID_INPUT" }] }).etat, "invalide");
  // Pas de champ valid : rien n'a été dit sur le numéro.
  assertEquals(lireReponseVies("FR", "1", { countryCode: "FR" }).etat, "indisponible");
  assertEquals(lireReponseVies("FR", "1", { valid: "false" }).etat, "indisponible");
  // Un vrai refus garde le code de VIES dans la preuve.
  assertEquals(lireReponseVies("FR", "1", { valid: false, userError: "INVALID" }).preuve.code_vies, "INVALID");
});

Deno.test("ViesRest : HTTP 200 avec errorWrappers → indisponible", async () => {
  const { f } = fauxFetch(() => ({
    statut: 200,
    corps: { actionSucceed: false, errorWrappers: [{ error: "MS_UNAVAILABLE", message: "Member State unavailable" }] },
  }));
  const r = await new ViesRest(f).consulter("FR", "89380129866");
  assertEquals(r.etat, "indisponible");
  assert(String(r.motif).includes("MS_UNAVAILABLE"));
});
