import { assert, assertEquals } from "@std/assert";
import { corps, type Resume, sujet } from "../resume.ts";

const base: Resume = {
  calcule_le: "2026-10-11T05:17:00Z",
  alertes: [
    {
      id: "1",
      niveau: "critique",
      source: "sauvegarde",
      titre: "Sauvegarde manquante",
      client_id: null,
      cree_le: "2026-10-11T06:07:00Z",
    },
    {
      id: "2",
      niveau: "attention",
      source: "lecteur",
      titre: "Plafond IA atteint",
      client_id: "c1",
      cree_le: "2026-10-10T15:00:00Z",
    },
  ],
  alertes_total: 2,
  battements_en_retard: [{
    client_id: "c1",
    module: "lecteur",
    dernier_le: "2026-10-09T08:00:00Z",
    attendu_toutes: "00:05:00",
  }],
  crons_en_echec: [{ tache: "omega-lecteur", echecs: 3, dernier_le: "2026-10-11T04:00:00Z", message: "timeout" }],
  sauvegarde: null,
  sauvegarde_en_retard: true,
  a_signaler: true,
};

Deno.test("le sujet résume tout en une ligne", () => {
  assertEquals(
    sujet(base, "recette"),
    "[Omega recette] 1 critique, 1 à surveiller, 1 ouvrier(s) silencieux, 1 tâche(s) en échec, sauvegarde à vérifier",
  );
});

Deno.test("le corps liste chaque élément, à l'heure de Paris", () => {
  const c = corps(base, "recette");
  assert(c.includes("- [critique] Sauvegarde manquante (sauvegarde, 11/10/2026 08:07)"));
  assert(c.includes("client c1"));
  assert(c.includes("- lecteur (client c1) : dernier signe 09/10/2026 10:00, attendu toutes les 00:05:00"));
  assert(c.includes("- omega-lecteur : 3 échec(s)"));
  assert(c.includes("aucune sauvegarde enregistrée"));
});

Deno.test("rien à signaler : un sujet qui le dit", () => {
  const vide: Resume = {
    ...base,
    alertes: [],
    alertes_total: 0,
    battements_en_retard: [],
    crons_en_echec: [],
    sauvegarde_en_retard: false,
    a_signaler: false,
  };
  assertEquals(sujet(vide, "production"), "[Omega production] rien à signaler");
});
