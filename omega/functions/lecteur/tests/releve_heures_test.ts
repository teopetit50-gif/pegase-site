// Le relevé d'heures d'un intérimaire, lu par le schéma FILED (19/10, décision du bureau). Doublures seulement.

import { assert, assertEquals } from "@std/assert";
import type { PageLue } from "@partage/portes.ts";
import type { SortieIa, SortieOutil } from "../ia.ts";
import { assembler } from "../lire_piece.ts";
import { TYPES_PIECE } from "../schemas/facture.ts";
import { schemaOutilPour, typesPour } from "../schemas/modules.ts";
import { heuresDepuisTexte } from "../verifier.ts";

function ia(brut: Partial<SortieOutil>): SortieIa {
  return {
    brut: { lisible: true, type_piece: "releve_heures", confiance_type: 0.93, valeurs: [], ...brut },
    usage: { tokens_entree: 0, tokens_sortie: 0 },
    modele: "double",
    cout_eur: 0,
  };
}
const lire = (brut: Partial<SortieOutil>, texte: string) =>
  assembler(ia(brut), null, [{ n: 1, methode: "vision", texte, confiance: 0.9 }], "ocr", 0).resultat;
const valeur = (r: ReturnType<typeof lire>, champ: string) => r.valeurs.find((v) => v.champ === champ);

const RELEVE = [
  "AGENCE ESSAI INTÉRIM — Relevé d'heures",
  "Intérimaire : DUPONT Essai",
  "Client : BTP Essai SARL",
  "Semaine du 12/10/2026 au 16/10/2026",
  "12/10 | 7h30 | 13,50",
  "13/10 | 8h",
  "14/10 | 7,5",
  "Total : 23h",
  "Signature du client : [signé]",
].join("\n");

const TETE = [
  { champ: "agence", valeur: "AGENCE ESSAI INTÉRIM", texte: "AGENCE ESSAI INTÉRIM", page: 1 },
  { champ: "interimaire", valeur: "DUPONT Essai", texte: "Intérimaire : DUPONT Essai", page: 1 },
  { champ: "client", valeur: "BTP Essai SARL", texte: "Client : BTP Essai SARL", page: 1 },
  { champ: "periode_du", valeur: "2026-10-12", texte: "12/10/2026", page: 1 },
  { champ: "periode_au", valeur: "2026-10-16", texte: "16/10/2026", page: 1 },
  { champ: "total_heures", valeur: 23, texte: "Total : 23h", page: 1 },
  { champ: "signature_client", valeur: true, texte: "Signature du client : [signé]", page: 1 },
];

Deno.test("relevé d'heures : tête, lignes [{date, heures, taux si écrit, page}], somme = total → lu", () => {
  const r = lire({
    valeurs: TETE,
    lignes_heures: [
      { date: "2026-10-12", heures: "7h30", taux: "13,50", page: 1 },
      { date: "2026-10-13", heures: 8, page: 1 },
      { date: "2026-10-14", heures: "7,5", taux: null, page: 1 },
    ],
  }, RELEVE);
  assertEquals(r.type_piece, "releve_heures");
  assertEquals(r.statut, "lue", r.motif);
  const lignes = valeur(r, "lignes")!;
  assert(lignes.verifiee, lignes.controle);
  assertEquals(lignes.valeur, [
    { date: "2026-10-12", heures: 7.5, taux: 13.5, page: 1 },
    { date: "2026-10-13", heures: 8, page: 1 },
    { date: "2026-10-14", heures: 7.5, page: 1 },
  ]);
  assertEquals(valeur(r, "signature_client")?.valeur, true);
  assertEquals(valeur(r, "total_heures")?.valeur, 23);
});

Deno.test("relevé d'heures : somme ≠ total écrit → à vérifier ; ligne sans date ou sans heures non rendue", () => {
  const r = lire({
    valeurs: TETE,
    lignes_heures: [
      { date: "2026-10-12", heures: "7h30", page: 1 },
      { date: "2026-10-13", heures: 8, page: 1 },
      { date: "mardi", heures: 7, page: 1 },
      { date: "2026-10-14", heures: "", page: 1 },
    ],
  }, RELEVE);
  const lignes = valeur(r, "lignes")!;
  assertEquals((lignes.valeur as unknown[]).length, 2);
  assert(!lignes.verifiee);
  assert(lignes.controle?.includes("≠ total écrit 23"), lignes.controle);
  assertEquals(r.statut, "a_verifier");
});

Deno.test("relevé d'heures : un jour absent de la page laisse la liste à vérifier ; pas de lignes de facture", () => {
  const r = lire({
    valeurs: TETE.filter((v) => v.champ !== "total_heures"),
    lignes_heures: [{ date: "2026-10-15", heures: 7, page: 1 }],
    lignes: [{ designation: "x", page: 1 }],
  }, RELEVE);
  assert(!valeur(r, "lignes")!.verifiee);
  assertEquals((valeur(r, "lignes")!.valeur as Record<string, unknown>[])[0].designation, undefined, "les lignes de facture ne sont pas lues ici");
});

Deno.test("heures : 7h30, 7:30, 7,5, 8 h ; hors bornes refusé", () => {
  assertEquals([heuresDepuisTexte("7h30"), heuresDepuisTexte("7:30"), heuresDepuisTexte("7,5"), heuresDepuisTexte("8 h"), heuresDepuisTexte(8)], [7.5, 7.5, 7.5, 8, 8]);
  assertEquals(heuresDepuisTexte("30"), null);
  assertEquals(heuresDepuisTexte("lundi"), null);
});

Deno.test("format : releve_heures dans FILED, hors TYPES_PIECE et hors Varelo", () => {
  assert(typesPour("filed").includes("releve_heures"));
  assert(!typesPour("varelo").includes("releve_heures"));
  assert(!(TYPES_PIECE as readonly string[]).includes("releve_heures"));
  const props = (m: string) => (schemaOutilPour(m) as { properties: Record<string, unknown> }).properties;
  assert("lignes_heures" in props("filed") && !("lignes_heures" in props("daliro")));
});
