// deno-lint-ignore-file require-await
// Le client Scaleway, contre un faux fetch : les URL, l'en-tête X-Auth-Token, le base64, les données
// associées, et la lecture des erreurs. Aucun appel réseau.

import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { ErreurCoffre, keyManagerDepuisEnv, ScalewayKeyManager } from "../keymanager.ts";
import { depuisBase64, texte, versBase64 } from "../octets.ts";

interface Appel {
  url: string;
  methode: string;
  entetes: Record<string, string>;
  corps: Record<string, unknown> | null;
}

function fauxFetch(reponses: (a: Appel) => { statut: number; corps: unknown }) {
  const appels: Appel[] = [];
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    const a: Appel = {
      url: String(url),
      methode: init?.method ?? "GET",
      entetes: init?.headers as Record<string, string>,
      corps: init?.body ? JSON.parse(String(init.body)) : null,
    };
    appels.push(a);
    const r = reponses(a);
    return new Response(JSON.stringify(r.corps), { status: r.statut });
  }) as typeof fetch;
  return { f, appels };
}

const BASE = "https://api.scaleway.com/key-manager/v1alpha1/regions/fr-par";
const CLE = "0b5c1e2a-4d6f-4a8b-9c0d-1e2f3a4b5c6d";

Deno.test("trouverOuCreerCle : retrouve la clé du cabinet par son nom, sinon la crée (AES-256-GCM, protégée)", async () => {
  const { f, appels } = fauxFetch((a) =>
    a.methode === "GET" ? { statut: 200, corps: { keys: [], total_count: 0 } } : { statut: 200, corps: { id: CLE, name: "omega-tamila-x" } }
  );
  const km = new ScalewayKeyManager("SCW-SECRET", "projet-1", "fr-par", f);
  assertEquals(await km.trouverOuCreerCle("omega-tamila-x", "clé maître"), CLE);
  assertEquals(appels[0].url, `${BASE}/keys?project_id=projet-1&name=omega-tamila-x`);
  assertEquals(appels[0].entetes["X-Auth-Token"], "SCW-SECRET");
  assertEquals(appels[1].url, `${BASE}/keys`);
  assertEquals(appels[1].corps!.usage, { symmetric_encryption: "aes_256_gcm" });
  assertEquals(appels[1].corps!.unprotected, false);
  assertEquals(appels[1].corps!.project_id, "projet-1");

  const deja = fauxFetch(() => ({ statut: 200, corps: { keys: [{ id: CLE, name: "omega-tamila-x", state: "enabled" }] } }));
  assertEquals(await new ScalewayKeyManager("s", "p", "fr-par", deja.f).trouverOuCreerCle("omega-tamila-x", "d"), CLE);
  assertEquals(deja.appels.length, 1, "pas de seconde clé maître");
});

Deno.test("chiffrer / dechiffrer : base64, données associées = identifiant du dossier", async () => {
  const cle = crypto.getRandomValues(new Uint8Array(32));
  const { f, appels } = fauxFetch((a) =>
    a.url.endsWith("/encrypt") ? { statut: 200, corps: { key_id: CLE, ciphertext: versBase64(texte("ENVELOPPE")) } } : {
      statut: 200,
      corps: { key_id: CLE, plaintext: versBase64(cle) },
    }
  );
  const km = new ScalewayKeyManager("s", "p", "fr-par", f);
  const env = await km.chiffrer(CLE, cle, "dddddddd-0000-4000-8000-000000000001");
  assertEquals(new TextDecoder().decode(env), "ENVELOPPE");
  assertEquals(appels[0].url, `${BASE}/keys/${CLE}/encrypt`);
  assertEquals(depuisBase64(appels[0].corps!.plaintext as string), cle);
  assertEquals(new TextDecoder().decode(depuisBase64(appels[0].corps!.associated_data as string)), "dddddddd-0000-4000-8000-000000000001");
  assertEquals(await km.dechiffrer(CLE, env, "dddddddd-0000-4000-8000-000000000001"), cle);
  assertEquals(appels[1].url, `${BASE}/keys/${CLE}/decrypt`);
  assertEquals(depuisBase64(appels[1].corps!.ciphertext as string), env);
});

Deno.test("erreurs : 5xx et 429 indisponible, 4xx refus ; jamais la clé dans le message", async () => {
  const cle = crypto.getRandomValues(new Uint8Array(32));
  const km503 = new ScalewayKeyManager("s", "p", "fr-par", fauxFetch(() => ({ statut: 503, corps: { message: "maintenance" } })).f);
  const e1 = await assertRejects(() => km503.chiffrer(CLE, cle, "d"), ErreurCoffre);
  assertEquals(e1.code, "KM_INDISPONIBLE");
  const km403 = new ScalewayKeyManager("s", "p", "fr-par", fauxFetch(() => ({ statut: 403, corps: { message: "denied" } })).f);
  const e2 = await assertRejects(() => km403.dechiffrer(CLE, cle, "d"), ErreurCoffre);
  assertEquals(e2.code, "KM_REFUS");
  assertStringIncludes(e2.message, "403");
  assertEquals(e2.message.includes(versBase64(cle)), false);
  const kmCoupe = new ScalewayKeyManager("s", "p", "fr-par", (() => Promise.reject(new TypeError("réseau"))) as typeof fetch);
  assertEquals((await assertRejects(() => kmCoupe.chiffrer(CLE, cle, "d"), ErreurCoffre)).code, "KM_INDISPONIBLE");
});

Deno.test("les secrets : sans SCALEWAY_SECRET_KEY ou SCALEWAY_PROJECT_ID, pas de Key Manager ; fr-par par défaut", () => {
  const env = (o: Record<string, string>) => ({ get: (n: string) => o[n] });
  assertEquals(keyManagerDepuisEnv(env({})), null);
  assertEquals(keyManagerDepuisEnv(env({ SCALEWAY_SECRET_KEY: "s" })), null);
  assertEquals(keyManagerDepuisEnv(env({ SCALEWAY_SECRET_KEY: "s", SCALEWAY_PROJECT_ID: "p" }))!.region, "fr-par");
  assertEquals(keyManagerDepuisEnv(env({ SCALEWAY_SECRET_KEY: "s", SCALEWAY_PROJECT_ID: "p", SCALEWAY_REGION: "nl-ams" }))!.region, "nl-ams");
});
