import { assert, assertEquals } from "@std/assert";
import { ecartJours, francfort, jourOuvreTarget, paques } from "../calendrier.ts";

Deno.test("paques : 2024 à 2027", () => {
  assertEquals(paques(2024), "2024-03-31");
  assertEquals(paques(2025), "2025-04-20");
  assertEquals(paques(2026), "2026-04-05");
  assertEquals(paques(2027), "2027-03-28");
});

Deno.test("jourOuvreTarget : fermetures TARGET et week-ends", () => {
  assert(jourOuvreTarget("2026-10-06"));
  assert(!jourOuvreTarget("2026-10-03"), "samedi");
  assert(!jourOuvreTarget("2026-10-04"), "dimanche");
  assert(!jourOuvreTarget("2026-01-01"));
  assert(!jourOuvreTarget("2026-04-03"), "Vendredi saint");
  assert(!jourOuvreTarget("2026-04-06"), "lundi de Pâques");
  assert(!jourOuvreTarget("2026-05-01"));
  assert(!jourOuvreTarget("2026-12-25"));
  assert(!jourOuvreTarget("2026-12-26"));
  assert(jourOuvreTarget("2026-12-28"), "lundi 28/12 ouvré");
  assert(jourOuvreTarget("2026-05-14"), "l'Ascension n'est pas une fermeture TARGET");
  assert(jourOuvreTarget("2026-07-14"), "le 14 juillet non plus");
});

Deno.test("francfort : heure d'été et d'hiver", () => {
  assertEquals(francfort(new Date("2026-10-06T14:30:00Z")), { jour: "2026-10-06", heure: "16:30" });
  assertEquals(francfort(new Date("2026-01-15T15:30:00Z")), { jour: "2026-01-15", heure: "16:30" });
  assertEquals(francfort(new Date("2026-10-06T22:30:00Z")), { jour: "2026-10-07", heure: "00:30" });
  assertEquals(ecartJours("2026-10-02", "2026-10-06"), 4);
});
