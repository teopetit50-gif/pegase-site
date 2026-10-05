// Les règles sans réseau : clés de Luhn, clé de TVA française, découpage,
// ressemblance de deux raisons sociales. Numéros fabriqués pour tomber juste.

import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  analyserTvaFr,
  cleTvaFr,
  decomposerTva,
  luhn,
  motsDeNom,
  nomsConcordent,
  normaliser,
  sirenValide,
  siretValide,
  tvaFrDepuisSiren,
} from "../coherence.ts";

Deno.test("normaliser : majuscules, lettres et chiffres seulement, null si vide", () => {
  assertEquals(normaliser(" fr 12-345 678.901 "), "FR12345678901");
  assertEquals(normaliser(""), null);
  assertEquals(normaliser(null), null);
  assertEquals(normaliser(123456782), "123456782");
});

Deno.test("luhn, SIREN et SIRET : clés justes et fausses", () => {
  assert(luhn("123456782"));
  assert(!luhn("123456789"));
  assert(!luhn("12A456782"));
  assert(sirenValide("123 456 782"));
  assert(!sirenValide("123456789"));
  assert(!sirenValide("12345678"));
  assert(!sirenValide("12345678200010"), "un SIRET n'est pas un SIREN");
  assert(siretValide("12345678200010"));
  assert(!siretValide("12345678200011"));
  // La Poste : les SIRET en 356000000 ont une règle à part (somme des chiffres multiple de 5).
  assert(siretValide("35600000049837"), "SIRET La Poste : somme des chiffres multiple de 5");
  assert(!siretValide("35600000049838"));
});

Deno.test("clé de TVA française : (12 + 3 × (SIREN mod 97)) mod 97, sur deux chiffres", () => {
  assertEquals(cleTvaFr("123456782"), "11");
  assertEquals(tvaFrDepuisSiren("123 456 782"), "FR11123456782");
  assertEquals(cleTvaFr("100000009"), String((12 + 3 * (100000009 % 97)) % 97).padStart(2, "0"));
  assertThrows(() => cleTvaFr("1234"));
});

Deno.test("analyserTvaFr : juste, clé fausse, clé alphanumérique, pas français", () => {
  const ok = analyserTvaFr("FR 11 123 456 782");
  assert(ok && ok.cle_ok === true && ok.siren === "123456782" && ok.siren_ok);
  const faux = analyserTvaFr("FR12123456782");
  assert(faux && faux.cle_ok === false);
  const alnum = analyserTvaFr("FRAB123456782");
  assert(alnum && alnum.cle_ok === null, "une clé alphanumérique ne se vérifie pas");
  assertEquals(analyserTvaFr("DE123456788"), null);
  assertEquals(analyserTvaFr("FR11O23456782"), null, "la lettre O n'existe pas dans une clé");
  assertEquals(analyserTvaFr(null), null);
});

Deno.test("decomposerTva : pays et numéro", () => {
  assertEquals(decomposerTva("BE 0123.456.749"), { pays: "BE", numero: "0123456749" });
  assertEquals(decomposerTva("NL100000009B01"), { pays: "NL", numero: "100000009B01" });
  assertEquals(decomposerTva("123456782"), null);
  assertEquals(decomposerTva("F"), null);
});

Deno.test("motsDeNom : sans accent, sans forme juridique, sans ponctuation", () => {
  assertEquals(motsDeNom("S.A.S. Atelier Durand & Fils"), ["ATELIER", "DURAND", "FILS"]);
  assertEquals(motsDeNom("Société Générale de Plomberie SARL"), ["GENERALE", "PLOMBERIE"]);
  assertEquals(motsDeNom(""), []);
});

Deno.test("nomsConcordent : même entreprise sous deux écritures, ou pas", () => {
  assertEquals(nomsConcordent("SAS ATELIER DURAND", "Atelier Durand"), true);
  assertEquals(nomsConcordent("ATELIER DURAND", "ATELIER DURAND ET FILS"), true, "inclusion");
  assertEquals(nomsConcordent("LUMIFLUX ECLAIRAGE", "LUMIFLUX ECLAIRAGE INDUSTRIEL SERVICES"), true);
  assertEquals(nomsConcordent("ATELIER DURAND", "TRANSPORTS MARTIN"), false);
  assertEquals(nomsConcordent("", "ATELIER DURAND"), null);
  assertEquals(nomsConcordent("SAS", "SARL"), null, "deux formes juridiques seules : rien à comparer");
});
