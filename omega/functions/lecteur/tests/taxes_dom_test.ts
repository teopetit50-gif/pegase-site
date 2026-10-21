// Les pièces des Antilles (NOBAT, 19/10) : octroi de mer, exonération de TVA, SIREN tiré du RCS, IBAN masqué.
// Doublures seulement : les vraies pièces ne vont pas dans git.

import { assert, assertEquals } from "@std/assert";
import type { PageLue } from "@partage/portes.ts";
import type { SortieIa, SortieOutil } from "../ia.ts";
import { assembler } from "../lire_piece.ts";
import { schemaOutilPour } from "../schemas/modules.ts";
import { completerDepuisTexte, ibanMasque, ibanValide, reclasserIdentifiants, verifierValeurs } from "../verifier.ts";
import { CHAMPS_PAR_NOM } from "../schemas/facture.ts";

function ia(brut: Partial<SortieOutil>): SortieIa {
  return {
    brut: { lisible: true, type_piece: "facture", confiance_type: 0.95, valeurs: [], ...brut },
    usage: { tokens_entree: 0, tokens_sortie: 0 },
    modele: "double",
    cout_eur: 0,
  };
}

const page = (texte: string): PageLue => ({ n: 1, methode: "natif", texte, confiance: 1 });

const DEVIS_LAFARGE = page([
  "LAFARGE CIMENTS ANTILLES — DEVIS D-2026-0412",
  "Total HT 715,40",
  "OMR 2 % 14,24",
  "OMRI 2,5 % 17,81",
  "TVA 2,1 % 0,26",
  "Total TTC 747,71",
].join("\n"));

Deno.test("octroi de mer : OMR et OMRI rangés dans taxes.autres, montants retrouvés ; HT + TVA + taxes = TTC", () => {
  const b = assembler(
    ia({
      type_piece: "devis",
      valeurs: [
        { champ: "montant_ht", valeur: 715.4, texte: "Total HT 715,40", page: 1 },
        { champ: "montant_tva", valeur: 0.26, texte: "TVA 2,1 % 0,26", page: 1 },
        { champ: "montant_ttc", valeur: 747.71, texte: "Total TTC 747,71", page: 1 },
      ],
      taxes_autres: [
        { code: "OMR", libelle: "OMR", taux: 2, montant: 14.24, page: 1 },
        { code: "omri", libelle: "OMRI", taux: "2,5", montant: "17,81", page: 1 },
      ],
    }),
    null,
    [DEVIS_LAFARGE],
    "natif",
    0,
  );
  const taxes = b.resultat.valeurs.find((v) => v.champ === "taxes.autres")!;
  assert(taxes.verifiee, taxes.controle);
  assertEquals(taxes.valeur, [
    { code: "OMR", libelle: "OMR", taux: 2, montant: 14.24 },
    { code: "OMRI", libelle: "OMRI", taux: 2.5, montant: 17.81 },
  ]);
  const v = (c: string) => b.resultat.valeurs.find((x) => x.champ === c)!.valeur as number;
  const octroi = (taxes.valeur as { montant: number }[]).reduce((s, t) => s + t.montant, 0);
  assertEquals(Math.round((v("montant_ht") + v("montant_tva") + octroi) * 100) / 100, v("montant_ttc"));
});

Deno.test("octroi de mer : un code inconnu devient « autre » ; un montant introuvable laisse la valeur à vérifier", () => {
  const b = assembler(
    ia({ taxes_autres: [{ code: "éco-contribution", montant: 3.5, page: 1 }] }),
    null,
    [DEVIS_LAFARGE],
    "natif",
    0,
  );
  const taxes = b.resultat.valeurs.find((v) => v.champ === "taxes.autres")!;
  assertEquals((taxes.valeur as { code: string }[])[0].code, "autre");
  assert(!taxes.verifiee);
});

const FACTURE_GEDIMAT = page([
  "GEDIMAT GUADELOUPE — FACTURE FA-77120",
  "Total HT 1 250,00",
  "Exonération de TVA conformément à l'article 295 du CGI",
  "Total TTC 1 250,00",
  "SAS au capital de 40 000 € — RC Pointe-à-Pitre B 303 120 638",
  "IBAN : FR76 3000 •••• •••• •••• 1234 567",
].join("\n"));

Deno.test("Gedimat : mention d'exonération, SIREN du RCS et IBAN masqué relevés quand le modèle les omet", () => {
  const b = assembler(
    ia({
      valeurs: [
        { champ: "numero", valeur: "FA-77120", texte: "FA-77120", page: 1 },
        { champ: "montant_ht", valeur: 1250, texte: "Total HT 1 250,00", page: 1 },
      ],
    }),
    null,
    [FACTURE_GEDIMAT],
    "natif",
    0,
  );
  const v = (c: string) => b.resultat.valeurs.find((x) => x.champ === c);
  assertEquals(v("mention.exoneration")?.valeur, "Exonération de TVA conformément à l'article 295 du CGI");
  assert(v("mention.exoneration")?.verifiee);
  assertEquals(v("fournisseur.siren")?.valeur, "303120638");
  assert(v("fournisseur.siren")?.verifiee, v("fournisseur.siren")?.controle);
  assertEquals(v("fournisseur.siren")?.texte, "RC Pointe-à-Pitre B 303 120 638");
  const iban = v("fournisseur.iban")!;
  assert(iban, "un IBAN masqué n'est pas absent");
  assert(!iban.verifiee);
  assert(String(iban.valeur).startsWith("FR763000"), String(iban.valeur));
  assert(iban.controle?.includes("masqué"), iban.controle);
  const ventilation = v("tva.ventilation")!;
  assertEquals(ventilation.valeur, [
    { categorie: "E", taux: 0, base: 1250, montant: 0, motif: "Exonération de TVA conformément à l'article 295 du CGI" },
  ]);
  assert(ventilation.verifiee, ventilation.controle);
});

Deno.test("exonération : une ventilation rendue par le modèle, ou une TVA non nulle, n'est pas remplacée", async () => {
  const { ventilationExoneree } = await import("../verifier.ts");
  const base = [
    { champ: "mention.exoneration", valeur: "art. 295 du CGI", source: "ia" as const, verifiee: true },
    { champ: "montant_ht", valeur: 100, source: "ia" as const, verifiee: true },
  ];
  assertEquals(ventilationExoneree([...base, { champ: "montant_tva", valeur: 8.5, source: "ia" as const, verifiee: true }]), null);
  assertEquals(ventilationExoneree([...base, { champ: "tva.ventilation", valeur: [], source: "ia" as const, verifiee: true }]), null);
  assertEquals(ventilationExoneree([base[1]]), null);
});

Deno.test("Gedimat : ce que le modèle rend lui-même n'est pas doublé ; un IBAN masqué qu'il cite reste, à vérifier", () => {
  const brutes = [
    { champ: "fournisseur.iban", valeur: "FR76 3000 •••• •••• •••• 1234 567", texte: "FR76 3000 •••• •••• •••• 1234 567", page: 1 },
    { champ: "fournisseur.siren", valeur: "303 120 638", texte: "RC Pointe-à-Pitre B 303 120 638", page: 1 },
  ];
  const verif = verifierValeurs(brutes, [FACTURE_GEDIMAT], null);
  const iban = verif.valeurs.find((x) => x.champ === "fournisseur.iban")!;
  assert(!iban.verifiee);
  assert(iban.controle?.includes("partiellement masqué"), iban.controle);
  assert(verif.valeurs.find((x) => x.champ === "fournisseur.siren")!.verifiee);
  const ajouts = completerDepuisTexte(verif.valeurs, [FACTURE_GEDIMAT], CHAMPS_PAR_NOM);
  assertEquals(ajouts.map((a) => a.champ), ["mention.exoneration"]);
});

Deno.test("RCS : deux SIREN différents (émetteur et client) → on ne choisit pas ; celui de l'acheteur est écarté", () => {
  const deux = page("RCS Lyon 552 100 554\nClient : RCS Paris 732 829 320");
  assertEquals(completerDepuisTexte([], [deux], CHAMPS_PAR_NOM).filter((a) => a.champ === "fournisseur.siren"), []);
  const acheteur = [{ champ: "acheteur.siren", valeur: "732829320", source: "ia" as const, verifiee: true }];
  assertEquals(completerDepuisTexte(acheteur, [deux], CHAMPS_PAR_NOM).find((a) => a.champ === "fournisseur.siren")?.valeur, "552100554");
  assertEquals(
    completerDepuisTexte([], [page("SIRET 552 100 554 00012")], CHAMPS_PAR_NOM).find((a) => a.champ === "fournisseur.siren")?.valeur,
    "552100554",
    "un SIRET donne son SIREN",
  );
});

Deno.test("franchise 293 B : pas de mention d'exonération en double", () => {
  const p = page("TVA non applicable, art. 293 B du CGI");
  const franchise = [{ champ: "mention.franchise_293b", valeur: true, source: "ia" as const, verifiee: true }];
  assertEquals(completerDepuisTexte(franchise, [p], CHAMPS_PAR_NOM), []);
  assertEquals(completerDepuisTexte([], [p], CHAMPS_PAR_NOM), []);
});

Deno.test("IBAN : clé modulo 97, masques reconnus", () => {
  assert(ibanValide("GB82WEST12345698765432"));
  assert(!ibanValide("GB82WEST12345698765433"));
  assert(ibanMasque("FR763000••••1234"));
  assert(ibanMasque("FR7630004XXXXXXXXXX1234"));
  assert(ibanMasque("FR763000…"));
  assert(!ibanMasque("GB82WEST12345698765432"));
  const v = verifierValeurs([{ champ: "fournisseur.iban", valeur: "GB82 WEST 1234 5698 7654 33", texte: "GB82 WEST 1234 5698 7654 33", page: 1 }], [
    page("IBAN GB82 WEST 1234 5698 7654 33"),
  ], null).valeurs[0];
  assert(!v.verifiee);
  assert(v.controle?.includes("clé IBAN invalide"), v.controle);
});

Deno.test("format de lecture : taxes_autres dans l'outil FILED et ses dérivés, absent des modules sans lignes", () => {
  const props = (m: string) => (schemaOutilPour(m) as { properties: Record<string, unknown> }).properties;
  assert("taxes_autres" in props("filed"));
  assert("taxes_autres" in props("nobat"), "un module sans schéma propre lit comme FILED");
  assert(!("taxes_autres" in props("tamila")));
});

// Valeurs de doublure (SIREN 552 100 554 à clé valide ; IBAN d'exemple FR76 3000 6000 0112 3456 7890 189).
const IBAN_DOUBLURE = "FR76 3000 6000 0112 3456 7890 189";

Deno.test("SIRET à 9 chiffres : rangé en fournisseur.siren, sans fausse alerte", () => {
  const p = page("Société Essai SAS — SIRET 552 100 554");
  const verif = verifierValeurs([{ champ: "fournisseur.siret", valeur: "552 100 554", texte: "SIRET 552 100 554", page: 1 }], [p], null);
  assert(!verif.valeurs[0].verifiee, "9 chiffres ne font pas un SIRET");
  const r = reclasserIdentifiants(verif.valeurs, CHAMPS_PAR_NOM);
  assertEquals(r.map((v) => v.champ), ["fournisseur.siren"]);
  assertEquals(r[0].valeur, "552100554");
  assert(r[0].verifiee, r[0].controle);
});

Deno.test("SIRET à 14 chiffres : gardé, et son SIREN s'en déduit", () => {
  const p = page("SIRET 552 100 554 00012");
  const verif = verifierValeurs([{ champ: "fournisseur.siret", valeur: "552 100 554 00012", texte: "SIRET 552 100 554 00012", page: 1 }], [p], null);
  const r = reclasserIdentifiants(verif.valeurs, CHAMPS_PAR_NOM);
  assertEquals(r.map((v) => [v.champ, v.valeur]), [["fournisseur.siret", "55210055400012"], ["fournisseur.siren", "552100554"]]);
});

Deno.test("relevé de secours : « SIRET nnn nnn nnn » (9 chiffres) donne fournisseur.siren", () => {
  const ajouts = completerDepuisTexte([], [page("Fournisseur — SIRET 552 100 554 — Tél. 0590 00 00 00")], CHAMPS_PAR_NOM);
  assertEquals(ajouts.find((a) => a.champ === "fournisseur.siren")?.valeur, "552100554");
});

Deno.test("FR76 + 23 caractères rangé en TVA : reclassé en IBAN ; une vraie TVA FR reste une TVA", () => {
  const p = page(`TVA FR96 552 100 554\nRèglement : ${IBAN_DOUBLURE}`);
  const verif = verifierValeurs([{ champ: "fournisseur.tva", valeur: IBAN_DOUBLURE, texte: IBAN_DOUBLURE, page: 1 }], [p], null);
  const r = reclasserIdentifiants(verif.valeurs, CHAMPS_PAR_NOM);
  assertEquals(r.map((v) => v.champ), ["fournisseur.iban"]);
  assertEquals(r[0].valeur, "FR7630006000011234567890189");
  assert(r[0].verifiee, r[0].controle);
  const vraie = verifierValeurs([{ champ: "fournisseur.tva", valeur: "FR96552100554", texte: "FR96 552 100 554", page: 1 }], [p], null);
  assertEquals(reclasserIdentifiants(vraie.valeurs, CHAMPS_PAR_NOM).map((v) => v.champ), ["fournisseur.tva"]);
});

Deno.test("relevé de secours : un IBAN FR sans étiquette est un IBAN, jamais une TVA", () => {
  const ajouts = completerDepuisTexte([], [page(`Coordonnées bancaires ${IBAN_DOUBLURE}`)], CHAMPS_PAR_NOM);
  assertEquals(ajouts.find((a) => a.champ === "fournisseur.iban")?.valeur, "FR7630006000011234567890189");
  assertEquals(ajouts.filter((a) => a.champ.endsWith(".tva")), []);
});

// IBAN en partie couvert sur une photo (19/10) : doublure tirée de l'IBAN d'exemple, jamais l'IBAN réel.
const MASQUE_ATTENDU = "IBAN partiellement masqué : à compléter";

Deno.test("IBAN coupé par le modèle, avec ou sans marque de masque : rendu, à vérifier, « partiellement masqué »", () => {
  for (const imprime of ["FR76 3000 6000 0112 3456 7890 …", "FR76 3000 6000 0112 3456 7890 ...", "FR76 3000 6000 0112 3456 7890", "FR76 3000 6000 0112 3456 7890 [masqué]"]) {
    const p = page(`Règlement par virement — IBAN : ${imprime}`);
    const v = verifierValeurs([{ champ: "fournisseur.iban", valeur: imprime, texte: imprime, page: 1 }], [p], null).valeurs[0];
    assert(v, imprime);
    assertEquals(v.valeur, "FR763000600001123456 7890…".replace(" ", ""), imprime);
    assert(!v.verifiee, imprime);
    assert(v.controle?.endsWith(MASQUE_ATTENDU), `${imprime} → ${v.controle}`);
  }
});

Deno.test("IBAN masqué omis par le modèle : relevé sur le texte (étiquette en minuscules, sans étiquette)", () => {
  for (const texte of ["Iban : FR76 3000 6000 0112 3456 7890 ...", "Coordonnées bancaires FR76 3000 6000 0112 3456 7890 ••••", "RIB FR76 3000 6000 0112 3456 [masqué]"]) {
    const ajout = completerDepuisTexte([], [page(texte)], CHAMPS_PAR_NOM).find((a) => a.champ === "fournisseur.iban");
    assert(ajout, texte);
    assert(String(ajout.valeur).startsWith("FR7630006000"), texte);
    assert(ibanMasque(String(ajout.valeur)), String(ajout.valeur));
    assert(!ajout.verifiee);
    assert(ajout.controle?.includes(MASQUE_ATTENDU), ajout.controle);
  }
});

Deno.test("IBAN masqué rangé en TVA par le modèle : reclassé en IBAN, à vérifier", () => {
  const imprime = "FR76 3000 6000 0112 3456 7890 …";
  const verif = verifierValeurs([{ champ: "fournisseur.tva", valeur: imprime, texte: imprime, page: 1 }], [page(`IBAN ${imprime}`)], null);
  const r = reclasserIdentifiants(verif.valeurs, CHAMPS_PAR_NOM);
  assertEquals(r.map((v) => v.champ), ["fournisseur.iban"]);
  assert(String(r[0].valeur).endsWith("…"));
  assert(!r[0].verifiee && r[0].controle?.includes(MASQUE_ATTENDU), r[0].controle);
});

Deno.test("IBAN : un FR entier garde sa clé contrôlée ; un FR trop long est mal formé", () => {
  const v = (x: string) => verifierValeurs([{ champ: "fournisseur.iban", valeur: x, texte: x, page: 1 }], [page(`IBAN ${x}`)], null).valeurs[0];
  assert(v(IBAN_DOUBLURE).verifiee);
  assert(v(IBAN_DOUBLURE + "1").controle?.includes("IBAN mal formé"));
});

// Facture à trois codes de TVA (forme LEADER MAT, 21/10) : doublure, montants et IBAN d'exemple.
const FACTURE_TROIS_TAUX = page([
  "MATERIAUX ESSAI — FACTURE 900001",
  "Ciment 35 kg | 25,90 | 2",
  "Fer à béton | 53,55 | 1",
  "Visserie | 0,88 | 2",
  "TOTAL NET HT | CODE | TAUX TVA | TOTAL TVA",
  "53,55 | 1 | Exo",
  "26,78 | 2 | 8,50 | 2,28",
  "| 3 | 2,10",
  "80,33 | | 2,28 | 82,61 €",
  "FR 76 3000 6000 0112 3456 7890 189",
].join("\n"));

Deno.test("trois taux : tva.ventilation relevée sur le tableau (Exo en E, code sans base écarté), sommes = HT et TVA", () => {
  const b = assembler(
    ia({
      valeurs: [
        { champ: "montant_ht", valeur: 80.33, texte: "80,33", page: 1 },
        { champ: "montant_tva", valeur: 2.28, texte: "2,28", page: 1 },
        { champ: "montant_ttc", valeur: 82.61, texte: "82,61 €", page: 1 },
      ],
    }),
    null,
    [FACTURE_TROIS_TAUX],
    "natif",
    0,
  );
  const v = b.resultat.valeurs.find((x) => x.champ === "tva.ventilation")!;
  assertEquals(v.valeur, [
    { categorie: "E", taux: 0, base: 53.55, montant: 0, motif: "Exo" },
    { taux: 8.5, base: 26.78, montant: 2.28 },
  ]);
  assert(v.verifiee, v.controle);
  assertEquals(b.resultat.valeurs.filter((x) => x.champ === "tva.ventilation").length, 1, "pas de seconde ventilation « exonérée »");
});

Deno.test("trois taux : IBAN sans étiquette, groupes séparés dès « FR » → fournisseur.iban", () => {
  const ajout = completerDepuisTexte([], [FACTURE_TROIS_TAUX], CHAMPS_PAR_NOM).find((a) => a.champ === "fournisseur.iban")!;
  assertEquals(ajout.valeur, "FR7630006000011234567890189");
  assert(ajout.verifiee, ajout.controle);
  const faux = completerDepuisTexte([], [page("FR 76 3000 6000 0112 3456 7890 188")], CHAMPS_PAR_NOM).find((a) => a.champ === "fournisseur.iban")!;
  assert(!faux.verifiee && faux.controle?.includes("clé IBAN invalide"), faux.controle);
});

Deno.test("tableau de TVA : bases ≠ HT → à vérifier ; ventilation rendue par le modèle prioritaire", async () => {
  const { ventilationDepuisTableau } = await import("../verifier.ts");
  const ht = { champ: "montant_ht", valeur: 99, source: "ia" as const, verifiee: true };
  const v = ventilationDepuisTableau([ht], [FACTURE_TROIS_TAUX])!;
  assert(!v.verifiee && v.controle?.includes("≠ HT 99"), v.controle);
  assertEquals(ventilationDepuisTableau([{ champ: "tva.ventilation", valeur: [], source: "ia" as const, verifiee: true }], [FACTURE_TROIS_TAUX]), null);
});
