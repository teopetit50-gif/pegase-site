import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { type AppelAPasser, type ContexteAstreinte, passer, type PortesAstreinte, rappel } from "../passage.ts";
import { type ConfigTwilio, issueDuStatut, signatureValide, twimlAppel } from "../twilio.ts";

const TWILIO: ConfigTwilio = { compte: "ACessai", jeton: "jeton-essai", numero: "+15005550006", base: "https://exemple.test/functions/v1/reput-astreinte" };

class PortesFausses implements PortesAstreinte {
  a: AppelAPasser[] = [];
  issues: { appel: string; issue: string; reference?: string | null }[] = [];
  appelsAPasser(): Promise<AppelAPasser[]> { return Promise.resolve(this.a.splice(0)); }
  issue(appel: string, issue: "sonne" | "pris" | "sans_reponse" | "echec", reference: string | null = null): Promise<void> {
    this.issues.push({ appel, issue, reference });
    return Promise.resolve();
  }
}

function silence<T>(f: () => Promise<T>): Promise<T> {
  const o = { log: console.log, warn: console.warn, error: console.error };
  console.log = console.warn = console.error = () => {};
  return f().finally(() => Object.assign(console, o));
}

async function signer(url: string, params: URLSearchParams): Promise<string> {
  const cles = [...new Set([...params.keys()])].sort();
  let t = url;
  for (const k of cles) for (const v of params.getAll(k)) t += k + v;
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(TWILIO.jeton), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(t)))));
}

Deno.test("l'appel ne dit que l'organisation ; touche 1 pour prendre ; le texte est échappé", () => {
  const x = twimlAppel(TWILIO, "aaaa", "Atelier <Bertin> & fils");
  assertStringIncludes(x, "Une demande urgente attend chez Atelier &lt;Bertin&gt; &amp; fils");
  assertStringIncludes(x, 'numDigits="1"');
  assertStringIncludes(x, "evenement=touche&amp;appel=aaaa");
});

Deno.test("un passage : chaque appel part chez Twilio, la référence est notée ; un refus de Twilio note l'échec", async () => {
  const p = new PortesFausses();
  p.a = [{ appel: "a1", telephone: "+33600000001", rang: 1, organisation: "Banc" }, { appel: "a2", telephone: "+33600000002", rang: 1, organisation: "Banc" }];
  const envoyes: string[] = [];
  const fetchTwilio = ((_u: string, init: RequestInit) => {
    const corps = new URLSearchParams(String(init.body));
    envoyes.push(corps.get("To")!);
    if (corps.get("To") === "+33600000002") return Promise.resolve(new Response('{"message":"refus"}', { status: 400 }));
    assertStringIncludes(corps.get("StatusCallback")!, "evenement=statut&appel=a1");
    return Promise.resolve(new Response('{"sid":"CA123"}', { status: 201 }));
  }) as typeof fetch;
  const ctx: ContexteAstreinte = { portes: p, twilio: TWILIO, fetchTwilio };
  const b = await silence(() => passer(ctx));
  assertEquals(b, { appeles: 1, echecs: 1, branche: true });
  assertEquals(envoyes, ["+33600000001", "+33600000002"]);
  assertEquals(p.issues, [{ appel: "a1", issue: "sonne", reference: "CA123" }, { appel: "a2", issue: "echec", reference: null }]);
});

Deno.test("sans Twilio : aucun appel n'est pris (la base escalade au délai)", async () => {
  const p = new PortesFausses();
  p.a = [{ appel: "a1", telephone: "+33600000001", rang: 1, organisation: "Banc" }];
  const b = await silence(() => passer({ portes: p, twilio: null, fetchTwilio: fetch }));
  assertEquals(b.branche, false);
  assertEquals(p.a.length, 1);
});

Deno.test("touche 1, signée : l'urgence est prise ; une signature fausse est refusée, rien n'est noté", async () => {
  const p = new PortesFausses();
  const ctx: ContexteAstreinte = { portes: p, twilio: TWILIO, fetchTwilio: fetch };
  const url = new URL(`${TWILIO.base}?evenement=touche&appel=a1`);
  const corps = new URLSearchParams({ Digits: "1", CallSid: "CA123" });
  const r = await rappel(ctx, url, corps, await signer(url.toString(), corps));
  assertEquals(r.status, 200);
  assertStringIncludes(await r.text(), "L'urgence est à vous");
  assertEquals(p.issues, [{ appel: "a1", issue: "pris", reference: "CA123" }]);
  const faux = await silence(() => rappel(ctx, url, corps, "faux"));
  assertEquals(faux.status, 403);
  assertEquals(p.issues.length, 1);
});

Deno.test("une autre touche ne prend rien ; les statuts : sans réponse, échec, rien pour « sonne »", async () => {
  const p = new PortesFausses();
  const ctx: ContexteAstreinte = { portes: p, twilio: TWILIO, fetchTwilio: fetch };
  const u1 = new URL(`${TWILIO.base}?evenement=touche&appel=a1`);
  const c1 = new URLSearchParams({ Digits: "2" });
  await rappel(ctx, u1, c1, await signer(u1.toString(), c1));
  const u2 = new URL(`${TWILIO.base}?evenement=statut&appel=a1`);
  for (const s of ["in-progress", "no-answer", "failed"]) {
    const c = new URLSearchParams({ CallStatus: s, CallSid: "CA1" });
    await rappel(ctx, u2, c, await signer(u2.toString(), c));
  }
  assertEquals(p.issues.map((x) => x.issue), ["sans_reponse", "echec"]);
  assertEquals(issueDuStatut("ringing"), null);
  assert(await signatureValide("k", "u", new URLSearchParams(), null) === false);
});
