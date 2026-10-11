// La mesure sur corpus : verdicts champ par champ, « vérifiées et fausses », synthèse, rapport, squelette, lecture REST.

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { comparerPiece, egales, rapport, squelette, synthese } from "../mesure/comparer.ts";
import { mesurer, SourceRest } from "../outils/mesurer.ts";

const ATTENDU = {
  sha256: "a".repeat(64),
  fichier: "f1.pdf",
  type_piece: "facture",
  statut: "lue",
  valeurs: {
    numero: "F-2026-0417",
    date: "2026-03-12",
    montant_ttc: 1481.28,
    "fournisseur.nom": "Ateliers Brindille SAS",
    "fournisseur.tva": "FR19812345676",
    "fournisseur.iban": null,
    "commande.reference": "BC-7781",
    lignes: [{ montant: 1000 }, { montant: 234.4 }],
  },
};

const LU = {
  type_piece: "facture",
  statut: "lue",
  cout_eur: 0.0145,
  valeurs: [
    { champ: "numero", valeur: "F-2026-0417", verifiee: true },
    { champ: "date", valeur: "2026-03-12", verifiee: true },
    { champ: "montant_ttc", valeur: 1481.29, verifiee: true }, // à 0,01 : faux, et vérifié
    { champ: "fournisseur.nom", valeur: "ATELIERS BRINDILLE S.A.S.", verifiee: true },
    { champ: "fournisseur.tva", valeur: "FR 19 812 345 676", verifiee: true },
    { champ: "fournisseur.iban", valeur: "FR7630006000011234567890189", verifiee: false }, // inventé
    { champ: "lignes", valeur: [{ montant: 1000, quantite: 1 }, { montant: 234.4 }], verifiee: true },
  ],
};

Deno.test("mesure : égalités métier — nombres à 0,005 près, textes sans casse ni ponctuation, identifiants sans espaces, listes", () => {
  assert(egales(120, "120,00"));
  assert(!egales(120, 120.01));
  assert(egales("2026-03-12", "2026-03-12"));
  assert(egales("Ateliers Brindille SAS", "ATELIERS BRINDILLE S.A.S."));
  assert(egales("FR19812345676", "FR 19 812 345 676"));
  assert(egales(["pierre_taille", "ravalement"], ["ravalement", "pierre_taille"]));
  assert(!egales(["ravalement"], ["ravalement", "ite"]));
  assert(egales([{ montant: 10 }], [{ montant: 10, quantite: 2 }]), "l'attendu ne compare que ses clés");
});

Deno.test("mesure : verdicts d'une pièce — juste, faux vérifié, inventé, manquant", () => {
  const r = comparerPiece("f1.pdf", ATTENDU, LU);
  const v = Object.fromEntries(r.champs.map((c) => [c.champ, c.verdict]));
  assertEquals(v, {
    numero: "juste",
    date: "juste",
    montant_ttc: "faux",
    "fournisseur.nom": "juste",
    "fournisseur.tva": "juste",
    "fournisseur.iban": "invente",
    "commande.reference": "manquant",
    lignes: "juste",
  });
  const s = synthese([r]);
  assertEquals([s.justes, s.faux, s.inventes, s.manquants, s.attendus], [5, 1, 1, 1, 7]);
  assertEquals(s.verifiees_fausses, 1, "le TTC faux était donné pour vérifié");
  assertEquals(s.precision, 0.714);
  assertEquals(s.rappel, 0.714);
  assertEquals(s.precision_verifiees, 0.833);
  assertEquals(s.cout_moyen_eur, 0.0145);
});

Deno.test("mesure : rapport — synthèse, tableau par champ, écarts ; pièce introuvable", () => {
  const r = [comparerPiece("f1.pdf", ATTENDU, LU), comparerPiece("f2.pdf", { fichier: "f2.pdf", valeurs: { numero: "X" } }, null)];
  const t = rapport({ corpus: "pilote", module: "filed", pieces: [] }, r, "2026-10-11 14:00 Z");
  assertStringIncludes(t, "**Vérifiées et fausses** (le piège) : 1 sur 6");
  assertStringIncludes(t, "| `montant_ttc` | 0 / 1 | 1 | 1 |");
  assertStringIncludes(t, "f1.pdf · `montant_ttc` : faux **(vérifiée)** — attendu « 1481.28 », lu « 1481.29 »");
  assertStringIncludes(t, "f1.pdf · `fournisseur.iban` : invente");
  assertStringIncludes(t, "f2.pdf : **introuvable en base**");
  assert(!t.includes("F-2026-0417"), "aucune valeur affichée pour un champ juste");
});

Deno.test("mesure : squelette — les valeurs lues, à relire", () => {
  const s = squelette("pilote", "filed", [{ sha256: "b".repeat(64), nom: "f3.pdf", lu: LU }]);
  assertEquals(s.pieces[0].valeurs.numero, "F-2026-0417");
  assertEquals(s.pieces[0].type_piece, "facture");
});

Deno.test("mesure : lecture REST — pièce par sha256, valeurs, coût du travail ; pièce encore en lecture = introuvable ; chiffrée ignorée", async () => {
  const vus: string[] = [];
  const f = ((u: string | URL | Request) => {
    const url = String(u);
    vus.push(url);
    const json = (x: unknown) => Promise.resolve(new Response(JSON.stringify(x), { status: 200 }));
    if (url.includes("/pieces?") && url.includes("a".repeat(64))) return json([{ id: "p1", statut: "lue", type_piece: "facture", chiffrement: null }]);
    if (url.includes("/pieces?") && url.includes("nom_fichier=eq.f2.pdf")) return json([{ id: "p2", statut: "en_lecture", type_piece: null, chiffrement: null }]);
    if (url.includes("/pieces?")) return json([{ id: "p3", statut: "lue", type_piece: "rpva_avis_902", chiffrement: "dossier:v1" }]);
    if (url.includes("/pieces_valeurs?piece_id=eq.p1")) return json(LU.valeurs);
    if (url.includes("/travaux?")) return json([{ resultat: { cout_eur: 0.0145 } }]);
    return json([]);
  }) as typeof fetch;
  const source = new SourceRest("https://x.supabase.co", { apikey: "k" }, true, f);
  const r = await mesurer(source, {
    corpus: "pilote",
    module: "filed",
    pieces: [ATTENDU, { fichier: "f2.pdf", valeurs: { numero: "X" } }, { fichier: "avis.pdf", valeurs: { date_avis: "2026-10-01" } }],
  }, "cccccccc-0000-4000-8000-00000000000c");
  assertEquals(r.map((x) => !!x.introuvable), [false, true, true]);
  assertEquals(r[0].cout_eur, 0.0145);
  assert(vus.some((u) => u.includes("charge->>piece=eq.p1")));
});
