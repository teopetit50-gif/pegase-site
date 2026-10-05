// Le passage : relance, prise, budget, battement toujours.

import { assert, assertEquals } from "@std/assert";
import { GENRES, MODULE, passage } from "../passage.ts";
import { contexteDeTest, demandeDeTest, sireneActif, travailDeTest } from "./doubles.ts";

Deno.test("passage à vide : relance, rien pris, battement avec le bilan", async () => {
  const { ctx, portes } = contexteDeTest({ env: { IDENTITE_VERSION: "identite/2026-10-05/t" } });
  portes.aRelancer = 2;
  const b = await passage(ctx);
  assertEquals(b.pris, 0);
  assertEquals(b.relancees, 2);
  assertEquals(portes.relances, [2]);
  assertEquals(portes.appels[1].porte, "prendreTravaux");
  assertEquals(portes.appels[1].args, [GENRES, 10, "5 minutes", "identite-test"]);
  assertEquals(portes.battements.length, 1);
  assertEquals(portes.battements[0].module, MODULE);
  assertEquals(portes.battements[0].genres, ["identite.verifier"]);
  const d = portes.battements[0].detail as Record<string, unknown>;
  assertEquals(d.version, "identite/2026-10-05/t");
  assertEquals(d.sirene, "sirene-factice");
  assertEquals(d.vies, "vies-factice");
  assertEquals(b.battus, 1);
});

Deno.test("passage : chaque travail compte dans son issue", async () => {
  const { ctx, portes, sirene } = contexteDeTest();
  const A = "11111111-0000-4000-8000-00000000000a";
  const B = "11111111-0000-4000-8000-00000000000b";
  portes.demandes.set(A, demandeDeTest(A, "sirene", "123456782"));
  portes.demandes.set(B, demandeDeTest(B, "sirene", "123456789"));
  sirene.reponses.set("123456782", sireneActif("123456782"));
  portes.travaux = [travailDeTest(1, A), travailDeTest(2, B), travailDeTest(3, "inconnue"), { ...travailDeTest(4, A), genre: "lecteur.lire" }];
  const b = await passage(ctx);
  assertEquals(b.pris, 3, "un travail d'un autre genre n'est pas pris");
  assertEquals(b.issues.valide, 1);
  assertEquals(b.issues.invalide, 1);
  assertEquals(b.issues.ignore, 1);
  assertEquals(portes.finis.length, 3);
});

Deno.test("passage : une relance en panne n'arrête rien ; la file en panne est un passage en erreur, battu quand même", async () => {
  const { ctx, portes } = contexteDeTest();
  portes.panne.relancer = new Error("identite_relancer : HTTP 500");
  const b = await passage(ctx);
  assertEquals(b.relancees, null);
  assertEquals(b.pris, 0);
  assertEquals(b.erreur, undefined);

  portes.panne.relancer = undefined;
  portes.panne.prendreTravaux = new Error("prendre_travaux : HTTP 503");
  const b2 = await passage(ctx);
  assert(b2.erreur?.includes("503"));
  assertEquals(portes.battements.length, 2);
  assert(((portes.battements[1].detail as Record<string, unknown>).erreur as string).includes("503"));
});

Deno.test("passage : budget de temps épuisé, les travaux restants sont laissés à leur bail", async () => {
  const { ctx, portes, sirene } = contexteDeTest();
  const A = "11111111-0000-4000-8000-00000000000a";
  portes.demandes.set(A, demandeDeTest(A, "sirene", "123456782"));
  sirene.reponses.set("123456782", sireneActif("123456782"));
  portes.travaux = [travailDeTest(1, A), travailDeTest(2, A)];
  const b = await passage(ctx, { budgetMs: -1 });
  assertEquals(b.pris, 2);
  assertEquals(b.reportes, 2);
  assertEquals(portes.finis.length, 0);
});

Deno.test("passage : le battement en panne ne fait pas tomber le passage", async () => {
  const { ctx, portes } = contexteDeTest();
  portes.panne.battreOuvrier = new Error("battre_ouvrier : HTTP 500");
  const b = await passage(ctx);
  assertEquals(b.battus, null);
  assertEquals(b.erreur, undefined);
});
