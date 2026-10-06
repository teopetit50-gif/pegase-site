// Lorani (B5, b5_18) : l'attestation décennale — activités ramenées au vocabulaire et vérifiées par leur citation,
// une activité hors vocabulaire n'est pas retenue, un SIREN à la clé fausse non plus ; période et plafond.

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { ecrirePdf, type LigneTexte } from "../banc/pdf_minimal.ts";
import { consigneSysteme, type SortieOutil } from "../ia.ts";
import { lirePiece } from "../lire_piece.ts";
import { champsPour } from "../schemas/modules.ts";
import { typerValeur } from "../verifier.ts";
import { contexteDeTest, pieceDeTest, travailDeTest } from "./doubles.ts";

const TEXTE = [
  "ATTESTATION D'ASSURANCE DE RESPONSABILITÉ CIVILE DÉCENNALE",
  "SMABTP - Contrat n° 123456 B 1234",
  "Assuré : PIERRES DE BOURGOGNE - SIREN 552 100 554",
  "Activités garanties : Ravalement de façades ; Pierre de taille ; Maçonnerie et béton armé",
  "Période de validité : du 01/01/2026 au 31/12/2026",
  "Plafond par sinistre (ouvrages non soumis) : 1 500 000 €",
];

function pdf(textes: string[]): Uint8Array {
  const lignes: LigneTexte[] = textes.map((texte, i) => ({ x: 50, y: 60 + i * 18, texte }));
  return ecrirePdf([{ type: "texte", lignes }]);
}

const valeurs = (activites: unknown, siren = "552 100 554") => [
  { champ: "assureur", valeur: "SMABTP", texte: "SMABTP", page: 1 },
  { champ: "numero_police", valeur: "123456 B 1234", texte: "Contrat n° 123456 B 1234", page: 1 },
  { champ: "assure", valeur: "PIERRES DE BOURGOGNE", texte: "Assuré : PIERRES DE BOURGOGNE", page: 1 },
  { champ: "siren", valeur: siren, texte: `SIREN ${siren}`, page: 1 },
  { champ: "activites", valeur: activites, texte: "Activités garanties : Ravalement de façades ; Pierre de taille ; Maçonnerie et béton armé", page: 1 },
  { champ: "debut", valeur: "2026-01-01", texte: "du 01/01/2026", page: 1 },
  { champ: "fin", valeur: "2026-12-31", texte: "au 31/12/2026", page: 1 },
  { champ: "plafond_eur", valeur: 1500000, texte: "1 500 000 €", page: 1 },
];

async function lire(sortie: SortieOutil, textes = TEXTE) {
  const { ctx, portes, depot, ia } = contexteDeTest();
  const piece = pieceDeTest("cccccccc-0000-4000-8000-000000000091", "decennale.pdf", "application/pdf", { module: "lorani", objet_type: "lorani_projet", objet_id: "p" });
  portes.pieces.set(piece.id, piece);
  depot.fichiers.set(piece.chemin, pdf(textes));
  ia!.prochaine = sortie;
  const issue = await lirePiece(ctx, travailDeTest(91, piece.id));
  const r = portes.enregistrements[0].resultat;
  return { issue, r, v: new Map(r.valeurs.map((x) => [x.champ, x])) };
}

Deno.test("décennale : lue — activités en codes du vocabulaire, vérifiées par leur citation ; tableau jsonb", async () => {
  const { issue, v } = await lire({
    lisible: true,
    type_piece: "lorani_attestation_decennale",
    confiance_type: 0.96,
    valeurs: valeurs(["ravalement", "Pierre taille", "maconnerie_beton_arme"]),
  });
  assertEquals(issue, "lue");
  assertEquals(v.get("activites")!.valeur, ["ravalement", "pierre_taille", "maconnerie_beton_arme"]);
  assertEquals(v.get("activites")!.verifiee, true);
  assertEquals(v.get("siren")!.verifiee, true);
  assertEquals(v.get("plafond_eur")!.valeur, 1500000);
  assertEquals(v.get("debut")!.valeur, "2026-01-01");
});

Deno.test("décennale : activité hors vocabulaire → non retenue, pièce à vérifier", async () => {
  const { issue, v } = await lire({
    lisible: true,
    type_piece: "lorani_attestation_decennale",
    confiance_type: 0.96,
    valeurs: valeurs(["ravalement", "taille de haies"]),
  });
  assertEquals(issue, "a_verifier");
  assertEquals(v.get("activites")!.verifiee, false);
  assertStringIncludes(v.get("activites")!.controle!, "hors vocabulaire : taille_de_haies");
});

Deno.test("décennale : SIREN à la clé fausse → non vérifié (la pièce reste lue : le SIREN n'est pas une clé)", async () => {
  const textes = TEXTE.map((t) => t.replace("552 100 554", "538 765 432"));
  const { issue, v } = await lire({
    lisible: true,
    type_piece: "lorani_attestation_decennale",
    confiance_type: 0.96,
    valeurs: valeurs(["ravalement"], "538 765 432"),
  }, textes);
  assertEquals(issue, "lue");
  assertEquals(v.get("siren")!.verifiee, false);
  assertStringIncludes(v.get("siren")!.controle!, "clé SIREN invalide");
});

Deno.test("décennale : le vocabulaire est dans la consigne ; une liste ordinaire reste vérifiée élément par élément", () => {
  const c = consigneSysteme("lorani");
  assertStringIncludes(c, "lorani_attestation_decennale");
  assertStringIncludes(c, "maconnerie_beton_arme");
  assert(champsPour("lorani", "lorani_attestation_decennale").get("activites")!.choix!.includes("ite"));
  assertEquals(typerValeur("pieces", ["PC5", "PC 8"], champsPour("lorani")).valeur, ["PC5", "PC 8"]);
});
