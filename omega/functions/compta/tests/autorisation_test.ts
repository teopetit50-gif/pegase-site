// L'autorisation OAuth (nonce à usage unique, échange du code, activation) et l'encodage ANSI du fichier TRA.

import { assert, assertEquals } from "@std/assert";
import { traiterRetour, urlAutorisation } from "../autorisation.ts";
import { ansi } from "../depot.ts";
import { env, Reseau } from "./doubles.ts";

const NONCE = "a".repeat(64);
const CFG = { url: "https://base.exemple", cleService: "cle-service" };
const ENV = env({ QBO_CLIENT_ID: "id-qbo", QBO_CLIENT_SECRET: "cle-qbo", COMPTA_URL_RETOUR: "https://omega.exemple/functions/v1/compta" });

Deno.test("Autorisation : l'adresse de QuickBooks porte le nonce en state, la portée comptable et l'adresse de retour", () => {
  const u = new URL(urlAutorisation("quickbooks", NONCE, ENV));
  assertEquals(u.origin + u.pathname, "https://appcenter.intuit.com/connect/oauth2");
  assertEquals(u.searchParams.get("state"), NONCE);
  assertEquals(u.searchParams.get("scope"), "com.intuit.quickbooks.accounting");
  assertEquals(u.searchParams.get("redirect_uri"), "https://omega.exemple/functions/v1/compta");
});

Deno.test("Autorisation : un nonce inconnu ou échu n'active rien", async () => {
  const reseau = new Reseau().quand("POST", /compta_consommer_autorisation/, { texte: "null" });
  const r = await traiterRetour(new URL(`https://f.exemple/?code=c&state=${NONCE}&realmId=9130`), CFG, ENV, reseau.fetch);
  assertEquals(r.ok, false);
  assertEquals(reseau.vers("POST", /tokens\/bearer|compta_activer/).length, 0);
});

Deno.test("Autorisation : le code est échangé, les jetons rangés au coffre, l'entreprise QuickBooks notée", async () => {
  const reseau = new Reseau()
    .quand("POST", /compta_consommer_autorisation/, { json: { connexion: "cx-1", editeur: "quickbooks" } })
    .quand("POST", /tokens\/bearer/, { json: { access_token: "acc", refresh_token: "ref", expires_in: 3600 } })
    .quand("POST", /compta_activer_connexion/, { texte: "" });
  const r = await traiterRetour(new URL(`https://f.exemple/?code=c-42&state=${NONCE}&realmId=9130`), CFG, ENV, reseau.fetch);
  assertEquals(r, { ok: true, message: "Connexion établie : les écritures partiront au prochain passage.", connexion: "cx-1" });
  const echange = reseau.vers("POST", /tokens\/bearer/)[0];
  assert(echange.corps!.includes("grant_type=authorization_code") && echange.corps!.includes("code=c-42"));
  const activer = JSON.parse(reseau.vers("POST", /compta_activer_connexion/)[0].corps!);
  assertEquals(activer.p_connexion, "cx-1");
  assertEquals(activer.p_parametres, { realm_id: "9130" });
  assertEquals(JSON.parse(activer.p_secret).refresh_token, "ref");
});

Deno.test("Autorisation : un refus chez l'éditeur est dit tel quel", async () => {
  const r = await traiterRetour(new URL("https://f.exemple/?error=access_denied"), CFG, ENV, new Reseau().fetch);
  assertEquals(r, { ok: false, message: "access_denied" });
});

Deno.test("ANSI : accents et euro en Windows-1252, le reste en « ? »", () => {
  assertEquals(Array.from(ansi("é€œ✓")), [0xe9, 0x80, 0x9c, 0x3f]);
});
