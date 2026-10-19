import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { ACCUEIL, type Boite, type ContexteAppels, type PortesAppels, SANS_MESSAGE, SANS_TRANSCRIPTION, texteDuMessage, type Transcripteur, type Voie, webhook } from "../appels.ts";

const BASE = "https://exemple.test/functions/v1/reput-appels";
const JETON = "jeton-essai";

class PortesFausses implements PortesAppels {
  boites = new Map<string, Boite>([["+33100000001", { client_id: "cccccccc-0000-4000-8000-00000000000c", entite_id: null, module: "reput" }]]);
  depots: { client: string; boite: string; identifiant: string; de: string | null; corps: string; detail: Record<string, unknown> }[] = [];
  resoudreBoite(n: string) { return Promise.resolve(this.boites.get(n) ?? null); }
  voies = new Map<string, Voie>();
  voie(c: string) { return Promise.resolve(this.voies.get(c) ?? "twilio"); }
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

const CLIENT = "cccccccc-0000-4000-8000-00000000000c";

class TwilioFaux {
  lus: string[] = [];
  effaces: string[] = [];
  fetch = ((u: string, init?: RequestInit) => {
    if (init?.method === "DELETE") { this.effaces.push(u); return Promise.resolve(new Response(null, { status: 204 })); }
    this.lus.push(u);
    return Promise.resolve(new Response(new Uint8Array([82, 73, 70, 70]), { status: 200 }));
  }) as typeof fetch;
}

const transcripteur = (texte: string | Error): Transcripteur => ({
  nom: "doublure-ue",
  transcrire: () => texte instanceof Error ? Promise.reject(texte) : Promise.resolve({ texte, confiance: 0.8 }),
});

Deno.test("voie « ue » : l'appel entrant enregistre court ; numéros dans l'URL signée du rappel ; pas d'écoute Twilio", async () => {
  const portes = new PortesFausses();
  portes.voies.set(CLIENT, "ue");
  const ctx: ContexteAppels = { portes, jeton: JETON, base: BASE };
  const p = { From: "+33600000021", To: "+33100000001", CallSid: "CA21" };
  const r = await appeler(ctx, "entrant", p, await signer(`${BASE}?evenement=entrant`, new URLSearchParams(p)));
  const x = await r.text();
  assertStringIncludes(x, '<Record maxLength="90"');
  assertStringIncludes(x, "evenement=enregistrement&amp;a=%2B33100000001&amp;de=%2B33600000021");
  assert(!x.includes('input="speech"'), "pas de reconnaissance Twilio sur la voie UE");
});

Deno.test("voie « ue » : l'audio est lu une fois, transcrit chez le fournisseur UE, effacé chez Twilio, le texte est déposé", async () => {
  const portes = new PortesFausses();
  const tw = new TwilioFaux();
  const ctx: ContexteAppels = { portes, jeton: JETON, base: BASE, compte: "ACessai", transcripteur: transcripteur("  Ma porte de garage est bloquée.  "), fetchTwilio: tw.fetch };
  const url = `${BASE}?evenement=enregistrement&a=%2B33100000001&de=%2B33600000022`;
  const p = { CallSid: "CA22", RecordingSid: "RE22", RecordingUrl: "https://api.twilio.com/2010-04-01/Accounts/ACessai/Recordings/RE22", RecordingStatus: "completed", RecordingDuration: "7" };
  const r = await silence(async () => webhook(ctx, new URL(url), new URLSearchParams(p), await signer(url, new URLSearchParams(p))));
  assertEquals(r.status, 204);
  assertEquals(tw.lus, ["https://api.twilio.com/2010-04-01/Accounts/ACessai/Recordings/RE22.wav"]);
  assertEquals(tw.effaces, ["https://api.twilio.com/2010-04-01/Accounts/ACessai/Recordings/RE22.json"]);
  const d = portes.depots[0];
  assertEquals([d.boite, d.identifiant, d.de, d.corps], ["+33100000001", "CA22", "+33600000022", "Ma porte de garage est bloquée."]);
  assertEquals([d.detail.transcription, d.detail.audio_efface, d.detail.duree], ["ue:doublure-ue", true, 7]);
});

Deno.test("voie « ue » : transcription en échec ou fournisseur non branché → « à rappeler », l'enregistrement est quand même effacé", async () => {
  for (const t of [transcripteur(new Error("panne")), null]) {
    const portes = new PortesFausses();
    const tw = new TwilioFaux();
    const ctx: ContexteAppels = { portes, jeton: JETON, base: BASE, compte: "ACessai", transcripteur: t, fetchTwilio: tw.fetch };
    const url = `${BASE}?evenement=enregistrement&a=%2B33100000001&de=%2B33600000023`;
    const p = { CallSid: "CA23", RecordingSid: "RE23", RecordingUrl: "https://api.twilio.com/2010-04-01/Accounts/ACessai/Recordings/RE23" };
    await silence(async () => webhook(ctx, new URL(url), new URLSearchParams(p), await signer(url, new URLSearchParams(p))));
    assertEquals(portes.depots[0].corps, SANS_TRANSCRIPTION);
    assertEquals(tw.effaces.length, 1);
  }
});

Deno.test("voie « ue » : un numéro inconnu n'est ni transcrit ni déposé, mais l'enregistrement est effacé ; une URL hors Twilio est refusée", async () => {
  const portes = new PortesFausses();
  const tw = new TwilioFaux();
  const ctx: ContexteAppels = { portes, jeton: JETON, base: BASE, compte: "ACessai", transcripteur: transcripteur("x"), fetchTwilio: tw.fetch };
  const url = `${BASE}?evenement=enregistrement&a=%2B33199999999`;
  const p = { CallSid: "CA24", RecordingSid: "RE24", RecordingUrl: "https://api.twilio.com/x/RE24" };
  await silence(async () => webhook(ctx, new URL(url), new URLSearchParams(p), await signer(url, new URLSearchParams(p))));
  assertEquals([portes.depots.length, tw.lus.length, tw.effaces.length], [0, 0, 1]);
  const q = { CallSid: "CA25", RecordingSid: "RE25", RecordingUrl: "https://ailleurs.example/RE25" };
  const u2 = `${BASE}?evenement=enregistrement&a=%2B33100000001`;
  const r = await silence(async () => webhook(ctx, new URL(u2), new URLSearchParams(q), await signer(u2, new URLSearchParams(q))));
  assertEquals(r.status, 400);
});

Deno.test("sans paramètre « evenement » (URL saisie nue chez Twilio) : traité comme un appel entrant", async () => {
  const ctx: ContexteAppels = { portes: new PortesFausses(), jeton: JETON, base: BASE };
  const p = { From: "+33600000026", To: "+33100000001", CallSid: "CA26" };
  const corps = new URLSearchParams(p);
  const r = await silence(async () => webhook(ctx, new URL(BASE), corps, await signer(BASE, corps)));
  assertStringIncludes(await r.text(), 'input="speech"');
});
