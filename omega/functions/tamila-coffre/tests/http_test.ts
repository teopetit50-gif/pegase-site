// L'entrée HTTP : qui appelle, CORS, méthodes ; et le client du lecteur contre le vrai repondre().

import { assertEquals, assertRejects } from "@std/assert";
import { chiffrer } from "../aesgcm.ts";
import { appelantDe, repondre } from "../http.ts";
import { clePourPiece, ErreurCleCoffre, lirePieceChiffree } from "../lecteur.ts";
import { depuisBase64, depuisHex, texte } from "../octets.ts";
import { CLIENT, contexte, GERANT } from "./doubles.ts";

const REGLAGES = { cleService: "cle-de-service-tres-longue", origines: ["https://omegaai.fr"] };

const requete = (corps: unknown, jeton: string | null, init: RequestInit = {}) =>
  new Request("https://x.supabase.co/functions/v1/tamila-coffre", {
    method: "POST",
    body: JSON.stringify(corps),
    ...init,
    headers: { ...(jeton ? { authorization: `Bearer ${jeton}` } : {}), origin: "https://omegaai.fr", ...(init.headers ?? {}) },
  });

Deno.test("appelant : la clé de service fait le serveur ; un autre jeton, une personne ; rien, personne", () => {
  assertEquals(appelantDe(requete({}, REGLAGES.cleService), REGLAGES), { type: "serveur" });
  assertEquals(appelantDe(requete({}, "eyJ.personne"), REGLAGES), { type: "personne", jeton: "eyJ.personne" });
  assertEquals(appelantDe(requete({}, null), REGLAGES), null);
});

Deno.test("HTTP : OPTIONS pour l'écran, 401 sans jeton, 405 hors POST, CORS limité aux origines connues", async () => {
  const { ctx } = contexte();
  const pre = await repondre(new Request("https://x/f", { method: "OPTIONS", headers: { origin: "https://omegaai.fr" } }), ctx, REGLAGES);
  assertEquals(pre.status, 204);
  assertEquals(pre.headers.get("access-control-allow-origin"), "https://omegaai.fr");
  const ailleurs = await repondre(new Request("https://x/f", { method: "OPTIONS", headers: { origin: "https://evil.example" } }), ctx, REGLAGES);
  assertEquals(ailleurs.headers.get("access-control-allow-origin"), null);
  assertEquals((await repondre(requete({ action: "activer" }, null), ctx, REGLAGES)).status, 401);
  assertEquals((await repondre(new Request("https://x/f", { method: "GET", headers: { authorization: "Bearer a" } }), ctx, REGLAGES)).status, 405);
  const r = await repondre(requete({ action: "activer", client: CLIENT }, GERANT), ctx, REGLAGES);
  assertEquals(r.status, 200);
  assertEquals(r.headers.get("cache-control"), "no-store");
});

Deno.test("lecteur : clePourPiece rend la clé, la pièce se lit ; un dossier local rend « local » ; 409 n'est pas repris", async () => {
  const { ctx, portes } = contexte();
  const cle = crypto.getRandomValues(new Uint8Array(32));
  await portes.ajouterDossier("dddddddd-0000-4000-8000-000000000001", cle, [GERANT]);
  await repondre(requete({ action: "activer", client: CLIENT }, GERANT), ctx, REGLAGES);
  const n = await (await repondre(requete({ action: "nouvelle_cle", client: CLIENT }, GERANT), ctx, REGLAGES)).json();
  const cleD2 = depuisBase64(n.cle);
  await portes.ajouterDossier(n.dossier, cleD2, [GERANT], "scaleway", depuisHex(n.enveloppe));
  portes.dossiers.get(n.dossier)!.pieces.set("eeeeeeee-0000-4000-8000-000000000002", "recue");
  portes.dossiers.get("dddddddd-0000-4000-8000-000000000001")!.pieces.set("eeeeeeee-0000-4000-8000-000000000003", "recue");

  const viaCoffre = ((input: string | URL | Request, init?: RequestInit) => repondre(new Request(String(input), init), ctx, REGLAGES)) as typeof fetch;
  const cfg = { url: "https://x.supabase.co/", cleService: REGLAGES.cleService };

  const c = await clePourPiece(cfg, "eeeeeeee-0000-4000-8000-000000000002", viaCoffre);
  assertEquals(c.fournisseur, "scaleway");
  const chiffre = await chiffrer(cleD2, texte("%PDF ordonnance"));
  if (c.fournisseur === "scaleway") {
    assertEquals(new TextDecoder().decode(await lirePieceChiffree(c.cle, chiffre)), "%PDF ordonnance");
    assertEquals(c.cle.every((b) => b === 0), true, "la clé est effacée après usage");
  }
  assertEquals((await clePourPiece(cfg, "eeeeeeee-0000-4000-8000-000000000003", viaCoffre)).fournisseur, "local");

  portes.dossiers.get(n.dossier)!.pieces.set("eeeeeeee-0000-4000-8000-000000000002", "lue");
  const e = await assertRejects(() => clePourPiece(cfg, "eeeeeeee-0000-4000-8000-000000000002", viaCoffre), ErreurCleCoffre);
  assertEquals([e.statut, e.reprendre], [409, false]);
  const coupe = await assertRejects(
    () => clePourPiece(cfg, "eeeeeeee-0000-4000-8000-000000000002", (() => Promise.reject(new TypeError("dns"))) as typeof fetch),
    ErreurCleCoffre,
  );
  assertEquals(coupe.reprendre, true);
});
