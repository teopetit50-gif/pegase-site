// Daliro (B6, b6_28) : le devis PDF lu en lignes (lot, numéro, désignation, unité, quantité, prix, montant) que l'écran
// importe par btp_importer_lignes ; un long devis lu par morceaux, lignes réunies dans l'ordre ; FILED inchangé.

import { assert, assertEquals } from "@std/assert";
import { ecrirePdf, type LigneTexte } from "../banc/pdf_minimal.ts";
import type { EntreeIa } from "../ia.ts";
import { lirePiece } from "../lire_piece.ts";
import { SCHEMA_OUTIL_LECTURE } from "../schemas/facture.ts";
import { schemaOutilPour, schemaPour } from "../schemas/modules.ts";
import { contexteDeTest, pieceDeTest, travailDeTest } from "./doubles.ts";

const N = 150;
const lignesDevis = (k: number) => `${k}. Ouvrage ${k} - ${k % 2 ? "Lot 02 Gros œuvre" : "Lot 05 Menuiseries"} - m2 - ${k} x 10,00 = ${k * 10},00`;

function devisPdf(): Uint8Array {
  // 40 lignes par page : quatre pages.
  const pages = [];
  for (let p = 0; p < Math.ceil(N / 40); p++) {
    const textes = p === 0 ? ["DEVIS N° D-2026-118 du 02/10/2026", "Client : SCI Les Tilleuls"] : [];
    for (let k = p * 40 + 1; k <= Math.min(N, (p + 1) * 40); k++) textes.push(lignesDevis(k));
    if (p === Math.ceil(N / 40) - 1) textes.push("Total HT : 113250,00");
    pages.push({ type: "texte" as const, lignes: textes.map((texte, i): LigneTexte => ({ x: 30, y: 30 + i * 18, texte })) });
  }
  return ecrirePdf(pages);
}

Deno.test("daliro : schéma — devis avec lignes et lot ; FILED garde son outil", () => {
  assertEquals(schemaPour("daliro").module, "daliro");
  const outil = schemaOutilPour("daliro") as { properties: { lignes: { items: { properties: Record<string, unknown> } } } };
  assert("lot" in outil.properties.lignes.items.properties);
  assert(!("lot" in (SCHEMA_OUTIL_LECTURE as typeof outil).properties.lignes.items.properties), "FILED inchangé");
  assertEquals(schemaPour("daliro").types[0].cles, ["montant_total_ht"]);
});

Deno.test("daliro : un devis de 150 lignes lu par morceaux ; toutes les lignes, dans l'ordre, avec leur lot, vérifiées", async () => {
  const { ctx, portes, depot, ia } = contexteDeTest();
  const piece = pieceDeTest("cccccccc-0000-4000-8000-000000000096", "devis.pdf", "application/pdf", { module: "daliro", objet_type: "btp_marches", objet_id: "m" });
  portes.pieces.set(piece.id, piece);
  depot.fichiers.set(piece.chemin, devisPdf());
  ia!.repondre = (e: EntreeIa) => {
    const pages = e.mode === "texte" ? e.pages : [];
    const lignes = pages.flatMap((p) =>
      [...p.texte.matchAll(/^(\d+)\. (Ouvrage \d+) - (Lot \d+ [^-]+?) - m2 - (\d+) x 10,00 = (\d+),00$/gm)].map((m) => ({
        numero: m[1],
        lot: m[3],
        designation: m[2],
        unite: "m2",
        quantite: Number(m[4]),
        prix_unitaire: 10,
        montant: Number(m[5]),
        page: p.n,
      }))
    );
    const texte = pages.map((p) => p.texte).join("\n");
    const valeurs = [];
    if (texte.includes("DEVIS N°")) valeurs.push({ champ: "numero", valeur: "D-2026-118", texte: "DEVIS N° D-2026-118", page: 1 });
    if (texte.includes("Total HT")) valeurs.push({ champ: "montant_total_ht", valeur: 113250, texte: "Total HT : 113250,00", page: pages.at(-1)!.n });
    return { lisible: true, type_piece: "daliro_devis", confiance_type: 0.95, valeurs, lignes };
  };
  assertEquals(await lirePiece(ctx, travailDeTest(96, piece.id)), "lue");
  assert(ia!.appels.length >= 2, `${ia!.appels.length} appels`);
  const r = portes.enregistrements[0].resultat;
  const l = r.valeurs.find((v) => v.champ === "lignes")!;
  const lignes = l.valeur as Record<string, unknown>[];
  assertEquals(lignes.length, N);
  assertEquals(lignes.map((x) => Number(x.numero)), Array.from({ length: N }, (_, i) => i + 1));
  assertEquals(lignes[0].lot, "Lot 02 Gros œuvre");
  assertEquals(lignes[1].lot, "Lot 05 Menuiseries");
  assertEquals(l.verifiee, true, l.controle);
  assertEquals(r.valeurs.find((v) => v.champ === "montant_total_ht")!.valeur, 113250);
});
