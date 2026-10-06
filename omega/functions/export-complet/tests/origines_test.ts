import { assertEquals } from "@std/assert";
import { listeOrigines, sujetDuJeton } from "../origines.ts";

Deno.test("origines : variable et réglage réunis, sans doublon ni valeur douteuse", () => {
  assertEquals(listeOrigines("https://omegaai.fr", "http://localhost:3010, https://omegaai.fr/"), [
    "https://omegaai.fr",
    "http://localhost:3010",
  ]);
  assertEquals(listeOrigines("https://omegaai.fr", null), ["https://omegaai.fr"]);
  assertEquals(listeOrigines("*, javascript:alert(1), https://a.fr/chemin", ""), []);
});

const b64url = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

Deno.test("sujet du jeton : l'identifiant de l'utilisateur, sinon null", () => {
  const sub = "33333333-3333-4333-8333-333333333333";
  assertEquals(sujetDuJeton(`${b64url({ alg: "HS256" })}.${b64url({ sub, role: "authenticated" })}.sig`), sub);
  assertEquals(sujetDuJeton(`${b64url({ alg: "HS256" })}.${b64url({ role: "anon" })}.sig`), null);
  assertEquals(sujetDuJeton("pas-un-jeton"), null);
});
