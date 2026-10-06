// L'interrupteur des lectures longues : le secret prime, sinon le réglage lecteur_analyses ; panne → éteint.

import { assertEquals } from "@std/assert";
import { analysesActives } from "../analyse/interrupteur.ts";

const env = (v?: string) => ({ get: (n: string) => (n === "LECTEUR_ANALYSES" ? v : undefined) });
const portes = (v: string | null | Error) => ({
  lus: [] as string[],
  lireParametre(cle: string) {
    this.lus.push(cle);
    return v instanceof Error ? Promise.reject(v) : Promise.resolve(v);
  },
});

Deno.test("interrupteur : le secret prime sur le réglage", async () => {
  assertEquals(await analysesActives(env("1"), portes("non")), true);
  assertEquals(await analysesActives(env("oui"), portes(null)), true);
  const p = portes("oui");
  assertEquals(await analysesActives(env("0"), p), false);
  assertEquals(p.lus, [], "secret posé : la base n'est pas interrogée");
});

Deno.test("interrupteur : sans secret, le réglage lecteur_analyses = oui allume ; absent, autre valeur ou panne → éteint", async () => {
  const p = portes("oui");
  assertEquals(await analysesActives(env(undefined), p), true);
  assertEquals(p.lus, ["lecteur_analyses"]);
  assertEquals(await analysesActives(env(""), portes(" OUI ")), true);
  assertEquals(await analysesActives(env(undefined), portes(null)), false);
  assertEquals(await analysesActives(env(undefined), portes("1")), false);
  assertEquals(await analysesActives(env(undefined), portes(new Error("HTTP 404"))), false);
});
