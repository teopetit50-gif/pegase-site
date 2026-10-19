// Les pièces des Antilles (NOBAT, 19/10) : octroi de mer, exonération de TVA, SIREN tiré du RCS, IBAN masqué.
// Doublures seulement : les vraies pièces ne vont pas dans git.

import { assert, assertEquals } from "@std/assert";
import type { PageLue } from "@partage/portes.ts";
import type { SortieIa, SortieOutil } from "../ia.ts";
import { assembler } from "../lire_piece.ts";
import { schemaOutilPour } from "../schemas/modules.ts";
import { completerDepuisTexte, ibanMasque, ibanValide, verifierValeurs } from "../verifier.ts";
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

Deno.test("octroi de mer : OMR et OMRI rangés dans taxes.hors_tva, montants retrouvés ; HT + TVA + taxes = TTC", () => {
  const b = assembler(
    ia({
      type_piece: "devis",
      valeurs: [
        { champ: "montant_ht", valeur: 715.4, texte: "Total HT 715,40", page: 1 },
        { champ: "montant_tva", valeur: 0.26, texte: "TVA 2,1 % 0,26", page: 1 },
        { champ: "montant_ttc", valeur: 747.71, texte: "Total TTC 747,71", page: 1 },
      ],
      taxes_hors_tva: [
        { nature: "OMR", libelle: "OMR", taux: 2, montant: 14.24, page: 1 },
        { nature: "omri", libelle: "OMRI", taux: "2,5", montant: "17,81", page: 1 },
      ],
    }),
    null,
    [DEVIS_LAFARGE],
    "natif",
    0,
  );
  const taxes = b.resultat.valeurs.find((v) => v.champ === "taxes.hors_tva")!;
  assert(taxes.verifiee, taxes.controle);
  assertEquals(taxes.valeur, [
    { nature: "OMR", libelle: "OMR", taux: 2, montant: 14.24 },
    { nature: "OMRI", libelle: "OMRI", taux: 2.5, montant: 17.81 },
  ]);
  const v = (c: string) => b.resultat.valeurs.find((x) => x.champ === c)!.valeur as number;
  const octroi = (taxes.valeur as { montant: number }[]).reduce((s, t) => s + t.montant, 0);
  assertEquals(Math.round((v("montant_ht") + v("montant_tva") + octroi) * 100) / 100, v("montant_ttc"));
});

Deno.test("octroi de mer : une nature inconnue devient « autre » ; un montant introuvable laisse la valeur à vérifier", () => {
  const b = assembler(
    ia({ taxes_hors_tva: [{ nature: "éco-contribution", montant: 3.5, page: 1 }] }),
    null,
    [DEVIS_LAFARGE],
    "natif",
    0,
  );
  const taxes = b.resultat.valeurs.find((v) => v.champ === "taxes.hors_tva")!;
  assertEquals((taxes.valeur as { nature: string }[])[0].nature, "autre");
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
    ia({ valeurs: [{ champ: "numero", valeur: "FA-77120", texte: "FA-77120", page: 1 }] }),
    null,
    [FACTURE_GEDIMAT],
    "natif",
    0,
  );
  const v = (c: string) => b.resultat.valeurs.find((x) => x.champ === c);
  assertEquals(v("mention.exoneration_tva")?.valeur, "Exonération de TVA conformément à l'article 295 du CGI");
  assert(v("mention.exoneration_tva")?.verifiee);
  assertEquals(v("fournisseur.siren")?.valeur, "303120638");
  assert(v("fournisseur.siren")?.verifiee, v("fournisseur.siren")?.controle);
  assertEquals(v("fournisseur.siren")?.texte, "RC Pointe-à-Pitre B 303 120 638");
  const iban = v("fournisseur.iban")!;
  assert(iban, "un IBAN masqué n'est pas absent");
  assert(!iban.verifiee);
  assert(String(iban.valeur).startsWith("FR763000"), String(iban.valeur));
  assert(iban.controle?.includes("masqué"), iban.controle);
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
  assertEquals(ajouts.map((a) => a.champ), ["mention.exoneration_tva"]);
});

Deno.test("RCS : deux SIREN différents (émetteur et client) → on ne choisit pas ; celui de l'acheteur est écarté", () => {
  const deux = page("RCS Lyon 552 100 554\nClient : RCS Paris 732 829 320");
  assertEquals(completerDepuisTexte([], [deux], CHAMPS_PAR_NOM).filter((a) => a.champ === "fournisseur.siren"), []);
  const acheteur = [{ champ: "acheteur.siren", valeur: "732829320", source: "ia" as const, verifiee: true }];
  assertEquals(completerDepuisTexte(acheteur, [deux], CHAMPS_PAR_NOM).find((a) => a.champ === "fournisseur.siren")?.valeur, "552100554");
  assertEquals(completerDepuisTexte([], [page("SIRET 552 100 554 00012")], CHAMPS_PAR_NOM), [], "un SIRET n'est pas un RCS");
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

Deno.test("format de lecture : taxes_hors_tva dans l'outil FILED et ses dérivés, absent des modules sans lignes", () => {
  const props = (m: string) => (schemaOutilPour(m) as { properties: Record<string, unknown> }).properties;
  assert("taxes_hors_tva" in props("filed"));
  assert("taxes_hors_tva" in props("nobat"), "un module sans schéma propre lit comme FILED");
  assert(!("taxes_hors_tva" in props("tamila")));
});
