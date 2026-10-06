import { assert, assertEquals, assertThrows } from "@std/assert";
import { dernierJour, lireFluxBce, SourceBceHttp } from "../bce.ts";
import { HIST_DEUX_JOURS, QUOTIDIEN_2026_10_06 } from "./fixtures.ts";

Deno.test("lireFluxBce : le quotidien réel (guillemets simples), 29 devises au 6/10/2026", () => {
  const t = lireFluxBce(QUOTIDIEN_2026_10_06);
  assertEquals(t.length, 29);
  assert(t.every((x) => x.jour === "2026-10-06"));
  assertEquals(t.find((x) => x.devise === "USD")?.taux, "1.1269");
  assertEquals(t.find((x) => x.devise === "GBP")?.taux, "0.84880", "le texte publié est gardé tel quel");
  assertEquals(t.find((x) => x.devise === "CHF")?.taux, "0.9359");
  assertEquals(dernierJour(t), "2026-10-06");
});

Deno.test("lireFluxBce : le 90 jours réel (guillemets doubles), deux jours, le plus récent d'abord", () => {
  const t = lireFluxBce(HIST_DEUX_JOURS);
  const jours = [...new Set(t.map((x) => x.jour))];
  assertEquals(jours, ["2026-10-06", "2026-10-05"]);
  assertEquals(dernierJour(t), "2026-10-06");
  assertEquals(t.filter((x) => x.jour === "2026-10-05").length, 29);
});

Deno.test("lireFluxBce : rien de lisible → erreur ; une ligne fausse est sautée", () => {
  assertThrows(() => lireFluxBce("<html>maintenance</html>"), Error, "aucun jour");
  const t = lireFluxBce(
    "<Cube><Cube time='2026-10-06'><Cube currency='USD' rate='1.1'/><Cube currency='usd' rate='x'/><Cube currency='EUR' rate='1'/></Cube></Cube>",
  );
  assertEquals(t, [{ devise: "USD", jour: "2026-10-06", taux: "1.1" }]);
});

Deno.test("SourceBceHttp : 200 lu, 503 → erreur", async () => {
  const ok = new SourceBceHttp((async () => await Promise.resolve(new Response(QUOTIDIEN_2026_10_06, { status: 200 }))) as typeof fetch);
  assertEquals((await ok.lire("u")).length, 29);
  const ko = new SourceBceHttp((async () => await Promise.resolve(new Response("x", { status: 503 }))) as typeof fetch);
  let erreur = "";
  try {
    await ko.lire("u");
  } catch (e) {
    erreur = (e as Error).message;
  }
  assertEquals(erreur, "BCE : HTTP 503");
});
