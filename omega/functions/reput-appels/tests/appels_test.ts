import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { ACCUEIL, type Boite, type ContexteAppels, type PortesAppels, SANS_MESSAGE, texteDuMessage, webhook } from "../appels.ts";

const BASE = "https://exemple.test/functions/v1/reput-appels";
const JETON = "jeton-essai";

class PortesFausses implements PortesAppels {
  boites = new Map<string, Boite>([["+33100000001", { client_id: "cccccccc-0000-4000-8000-00000000000c", entite_id: null, module: "reput" }]]);
  depots: { client: string; boite: string; identifiant: string; de: string | null; corps: string; detail: Record<string, unknown> }[] = [];
  resoudreBoite(n: string) { return Promise.resolve(this.boites.get(n) ?? null); }
  deposer(r: PortesFausses["depots"][number]) { this.depots.push(r); return Promise.resolve({ id: 1, nouvelle: true }); }
}

async function signer(url: string, params: URLSearchParams): Promise<string> {
  const cles = [...new Set([...params.keys()])].sort();
  let t = url;
  for (const k of cles) for (const v of params.getAll(k)) t += k + v;
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(JETON), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(t)))));
}

function silence<T>(f: () => Promise<T>): Promise<T> {
  const o = { log: console.log, warn: console.warn, error: console.error };
  console.log = console.warn = console.error = () => {};
  return f().finally(() => Object.assign(console, o));
}

async function appeler(ctx: ContexteAppels, evenement: string, params: Record<string, string>, signature?: string) {
  const url = new URL(`${BASE}?evenement=${evenement}`);
  const corps = new URLSearchParams(params);
  return await silence(() => webhook(ctx, url, corps, signature ?? null));
}

Deno.test("l'appel entrant : accueil sans nom, écoute en français ; rien n'est enregistré", async () => {
  const ctx: ContexteAppels = { portes: new PortesFausses(), jeton: JETON, base: BASE };
  const p = { From: "+33600000011", To: "+33100000001", CallSid: "CA1" };
  const r = await appeler(ctx, "entrant", p, await signer(`${BASE}?evenement=entrant`, new URLSearchParams(p)));
  const x = await r.text();
  assertStringIncludes(x, 'input="speech" language="fr-FR"');
  assertStringIncludes(x, ACCUEIL);
  assert(!x.includes("<Record"), "aucun enregistrement audio");
});

Deno.test("le message reconnu devient une réception « appel » : boîte = numéro appelé, identifiant = CallSid", async () => {
  const portes = new PortesFausses();
  const ctx: ContexteAppels = { portes, jeton: JETON, base: BASE };
  const p = { From: "+33600000011", To: "+33100000001", CallSid: "CA2", SpeechResult: "  Bonjour, ma chaudière   fuit, rappelez-moi.  ", Confidence: "0.91" };
  const r = await appeler(ctx, "parole", p, await signer(`${BASE}?evenement=parole`, new URLSearchParams(p)));
  assertStringIncludes(await r.text(), "votre message est bien transmis");
  assertEquals(portes.depots.length, 1);
  const d = portes.depots[0];
  assertEquals([d.boite, d.identifiant, d.de, d.corps], ["+33100000001", "CA2", "+33600000011", "Bonjour, ma chaudière fuit, rappelez-moi."]);
  assertEquals(d.detail.confiance, 0.91);
});

Deno.test("sans message : l'appel manqué est quand même déposé ; numéro inconnu : rien", async () => {
  const portes = new PortesFausses();
  const ctx: ContexteAppels = { portes, jeton: JETON, base: BASE };
  const p = { From: "+33600000012", To: "+33100000001", CallSid: "CA3" };
  await appeler(ctx, "parole", p, await signer(`${BASE}?evenement=parole`, new URLSearchParams(p)));
  assertEquals(portes.depots[0].corps, SANS_MESSAGE);
  assertEquals(portes.depots[0].detail.sans_message, true);
  const q = { From: "+33600000013", To: "+33199999999", CallSid: "CA4", SpeechResult: "Allô" };
  await appeler(ctx, "parole", q, await signer(`${BASE}?evenement=parole`, new URLSearchParams(q)));
  assertEquals(portes.depots.length, 1);
});

Deno.test("une signature fausse est refusée, rien n'est déposé ; sans jeton : non branché", async () => {
  const portes = new PortesFausses();
  const r = await appeler({ portes, jeton: JETON, base: BASE }, "parole", { To: "+33100000001", CallSid: "CA5", SpeechResult: "x" }, "fausse");
  assertEquals(r.status, 403);
  assertEquals(portes.depots.length, 0);
  assertEquals((await appeler({ portes, jeton: null, base: BASE }, "entrant", {})).status, 503);
  assertEquals(texteDuMessage("   "), SANS_MESSAGE);
});
