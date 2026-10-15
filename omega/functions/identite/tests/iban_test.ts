// La forme d'un IBAN : longueur du pays, clé mod 97, masquage. IBAN fabriqués.

import { assert, assertEquals } from "@std/assert";
import { analyserIban, masquerIban, mod97, normaliserIban } from "../iban.ts";

Deno.test("mod97 : la clé des caractères déplacés, sans dépassement d'entier", () => {
  assertEquals(mod97("3214282912345698765432161182"), 1);
  assertEquals(mod97("A"), 10);
});

Deno.test("IBAN juste : France, Belgique, Allemagne ; normalisation des espaces", () => {
  const fr = analyserIban("FR76 3000 6000 0112 3456 7890 189");
  assert(fr.valide && fr.pays === "FR" && fr.sepa && fr.longueur_ok && fr.cle_ok);
  assertEquals(fr.banque_fr, "30006");
  assert(analyserIban("BE71 0961 2345 6769").valide);
  assert(analyserIban("DE89 3704 0044 0532 0130 00").valide);
  assertEquals(normaliserIban("fr76 3000-6000"), "FR7630006000");
});

Deno.test("IBAN faux : clé, longueur, pays inconnu, forme", () => {
  const cle = analyserIban("FR76 3000 6000 0112 3456 7890 188");
  assert(!cle.valide && cle.longueur_ok && !cle.cle_ok);
  assert(cle.motif.includes("clé"));
  const longueur = analyserIban("FR7630006000011234567890");
  assert(!longueur.valide && !longueur.longueur_ok);
  assert(longueur.motif.includes("Longueur"));
  const pays = analyserIban("ZZ76300060000112345678901");
  assert(!pays.valide && pays.motif.includes("inconnu"));
  const forme = analyserIban("1234");
  assert(!forme.valide && forme.motif.includes("Forme"));
});

Deno.test("hors SEPA : bien formé mais signalé", () => {
  const br = analyserIban("BR18 0000 0000 1414 5512 3924 100C 2");
  assert(br.valide && !br.sepa && br.motif.includes("hors zone SEPA"));
});

Deno.test("masquerIban : quatre caractères de chaque côté, le reste caché", () => {
  assertEquals(masquerIban("FR76 3000 6000 0112 3456 7890 189"), "FR76…0189");
  assertEquals(masquerIban("FR76"), "FR76");
});
