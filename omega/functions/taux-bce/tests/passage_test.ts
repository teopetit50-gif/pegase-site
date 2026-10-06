import { assert, assertEquals } from "@std/assert";
import { URL_90_JOURS, URL_QUOTIDIEN } from "../bce.ts";
import { passage } from "../passage.ts";
import { contexte } from "./doubles.ts";
import { HIST_DEUX_JOURS, QUOTIDIEN_2026_10_06 } from "./fixtures.ts";

const FLUX = { [URL_QUOTIDIEN]: QUOTIDIEN_2026_10_06, [URL_90_JOURS]: HIST_DEUX_JOURS };
// Mardi 6/10/2026, 16 h 30 à Francfort.
const MARDI_1630 = "2026-10-06T14:30:00Z";

Deno.test("premier passage : base vide → 90 jours, tout est posé ; battement sans alerte", async () => {
  const { ctx, portes, source } = contexte(FLUX, MARDI_1630);
  const b = await passage(ctx);
  assertEquals(source.appels, [URL_90_JOURS]);
  assertEquals(b.flux, "90_jours");
  assertEquals(b.lot?.poses, 58);
  assertEquals(portes.table.size, 58);
  assertEquals(b.alerte, null);
  assertEquals(portes.passages.length, 1);
  assertEquals(portes.passages[0].detail.jour_bce, "2026-10-06");
  assertEquals(portes.passages[0].detail.poses, 58);
});

Deno.test("rejouable : un second passage le même jour lit le quotidien et ne pose rien de plus", async () => {
  const { ctx, portes, source } = contexte(FLUX, MARDI_1630);
  await passage(ctx);
  const b = await passage(ctx);
  assertEquals(source.appels, [URL_90_JOURS, URL_QUOTIDIEN]);
  assertEquals(b.lot, { recus: 29, poses: 0, inchanges: 29, saisies_gardees: 0, refuses: 0 });
  assertEquals(portes.table.size, 58, "aucun doublon");
  assertEquals(b.alerte, null);
});

Deno.test("quotidien : seuls les jours depuis le dernier en base partent ; une saisie humaine n'est pas écrasée", async () => {
  const { ctx, portes, source } = contexte(FLUX, MARDI_1630);
  portes.table.set("USD|2026-10-05", { taux: 1.12, source: "bce" });
  portes.table.set("JPY|2026-10-06", { taux: 170, source: "saisie" });
  const b = await passage(ctx);
  assertEquals(source.appels, [URL_QUOTIDIEN]);
  assertEquals(b.lot?.recus, 29);
  assertEquals(b.lot?.saisies_gardees, 1);
  assertEquals(portes.table.get("JPY|2026-10-06"), { taux: 170, source: "saisie" });
  assertEquals(b.lot?.poses, 28);
});

Deno.test("trou de plus de quatre jours : relecture des 90 jours", async () => {
  const { ctx, portes, source } = contexte(FLUX, MARDI_1630);
  portes.table.set("USD|2026-09-28", { taux: 1.1, source: "bce" });
  await passage(ctx);
  assertEquals(source.appels, [URL_90_JOURS]);
  assertEquals(portes.lots[0].every((t) => t.jour >= "2026-09-28"), true);
});

Deno.test("alerte : jour ouvré, 16 h 30, le flux n'a que la veille → alerte nommant le dernier jour publié", async () => {
  const veille = QUOTIDIEN_2026_10_06.replace("time='2026-10-06'", "time='2026-10-05'");
  const { ctx, portes } = contexte({ [URL_QUOTIDIEN]: veille }, MARDI_1630);
  portes.table.set("USD|2026-10-05", { taux: 1, source: "bce" });
  const b = await passage(ctx);
  assertEquals(b.alerte, "Aucun taux BCE pour le 06/10/2026 (jour ouvré TARGET) à 16:30, heure de Francfort ; dernier jour publié : 05/10/2026.");
  assertEquals(portes.passages[0].alerte, b.alerte);
});

Deno.test("pas d'alerte : avant 16 h 15, le week-end, un jour férié TARGET", async () => {
  const veille = QUOTIDIEN_2026_10_06.replace("time='2026-10-06'", "time='2026-10-05'");
  for (const instant of ["2026-10-06T13:00:00Z", "2026-10-03T14:30:00Z", "2026-12-25T15:30:00Z"]) {
    const { ctx, portes } = contexte({ [URL_QUOTIDIEN]: veille }, instant);
    portes.table.set("USD|2026-10-05", { taux: 1, source: "bce" });
    const b = await passage(ctx);
    assertEquals(b.alerte, null, instant);
    assertEquals(portes.passages.length, 1, "le battement est noté quand même");
  }
});

Deno.test("BCE injoignable un jour ouvré : alerte avec le motif ; le passage est noté", async () => {
  const { ctx, portes } = contexte({ [URL_QUOTIDIEN]: new Error("connexion refusée") }, MARDI_1630);
  portes.table.set("USD|2026-10-05", { taux: 1, source: "bce" });
  const b = await passage(ctx);
  assert(String(b.alerte).includes("connexion refusée"));
  assertEquals(portes.passages[0].detail.erreur, "Error: connexion refusée");
});

Deno.test("taux du jour déjà en base : pas d'alerte même si le flux relu est vide de nouveauté", async () => {
  const { ctx, portes } = contexte(FLUX, "2026-10-06T16:00:00Z");
  portes.table.set("USD|2026-10-06", { taux: 1.1269, source: "bce" });
  const b = await passage(ctx);
  assertEquals(b.alerte, null);
});
