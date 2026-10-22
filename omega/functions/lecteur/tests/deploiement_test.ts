// Le paquet de déploiement suit les imports depuis index.ts : aucun dossier oublié (analyse/, media/…).

import { assert, assertEquals } from "@std/assert";
import { assembler, importsDe } from "../outils/preparer_deploiement.ts";

Deno.test("déploiement : les imports relevés (from, import(), import nu)", () => {
  assertEquals(importsDe(`import { a } from "./a.ts";\nexport * from "../b.ts";\nconst m = await import("@partage/c.ts");\nimport "./d.ts";`), [
    "./a.ts",
    "../b.ts",
    "@partage/c.ts",
    "./d.ts",
  ]);
});

Deno.test("déploiement : le paquet contient tout ce qu'importe index.ts, rien des tests ni des outils", async () => {
  const noms = (await assembler()).map((f) => f.name);
  for (const n of ["index.ts", "analyse/moteur.ts", "analyse/travail.ts", "media/lire_media.ts", "schemas/facture.ts", "_partage/portes.ts", "_partage/plafond.ts"]) {
    assert(noms.includes(n), n);
  }
  assert(!noms.some((n) => n.startsWith("tests/") || n.startsWith("outils/") || n.endsWith("_test.ts")), noms.join(", "));
});
