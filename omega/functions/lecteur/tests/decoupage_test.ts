// Le découpage d'un fichier à plusieurs factures en pièces filles : la mère garde la première, chaque autre
// groupe de pages devient un PDF rangé dans le dépôt puis une pièce fille par la porte du module. Rejouable ;
// sans porte, rien n'est déposé et le découpage reste dans le résultat.

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import type { FilleADeposer, FilleCreee } from "@partage/portes.ts";
import { octetsDuCas } from "../banc/generer.ts";
import { CAS } from "../banc/cas.ts";
import { estFille, groupesFilles, nomFille, uuidStable } from "../decoupage.ts";
import { lirePiece } from "../lire_piece.ts";
import { analyserPdf } from "../pdf.ts";
import { contexteDeTest, pieceDeTest, travailDeTest } from "./doubles.ts";

const cas03 = CAS.find((c) => c.id === "03_multi_factures")!;

async function preparer(avecPorte: boolean) {
  const t = contexteDeTest();
  const piece = pieceDeTest("00000000-0000-4000-8000-000000000003", "lot janvier.pdf", "application/pdf");
  t.portes.pieces.set(piece.id, piece);
  t.depot.fichiers.set(piece.chemin, await octetsDuCas(cas03));
  t.ia!.prochaine = cas03.ia!;
  const deposes: { chemin: string; octets: Uint8Array }[] = [];
  t.depot.deposer = (chemin: string, octets: Uint8Array) => {
    deposes.push({ chemin, octets });
    t.depot.fichiers.set(chemin, octets);
    return Promise.resolve();
  };
  const appels: { module: string; mere: string; filles: FilleADeposer[] }[] = [];
  if (avecPorte) {
    t.portes.creerPiecesFilles = (module: string, mere: string, filles: FilleADeposer[]): Promise<FilleCreee[]> => {
      if (filles.length > 0) appels.push({ module, mere, filles });
      return Promise.resolve(filles.map((f, i) => ({ pages: f.pages, piece: `ffffffff-0000-4000-8000-00000000000${i}`, document: f.document, reference: `R2026-00010${i}`, deja: false })));
    };
  } else {
    t.portes.creerPiecesFilles = () => Promise.resolve(null); // PGRST202 : porte pas encore posée
  }
  return { ...t, piece, deposes, appels };
}

Deno.test("deux factures dans un fichier : la mère garde la première, la seconde devient une fille (PDF des pages 3-4)", async () => {
  const { ctx, portes, piece, deposes, appels } = await preparer(true);
  assertEquals(await lirePiece(ctx, travailDeTest(3, piece.id)), "lue");
  assertEquals(portes.enregistrements[0].resultat.valeurs.find((v) => v.champ === "numero")!.valeur, "TL-1001");
  assertEquals(appels.length, 1);
  assertEquals(appels[0].module, "filed");
  assertEquals(appels[0].mere, piece.id);
  const f = appels[0].filles[0];
  assertEquals(f.pages, [3, 4]);
  assertEquals(f.nom_fichier, "lot janvier-p3-4.pdf");
  assertEquals(f.chemin, `${piece.client_id}/filed_document/${f.document}/lot janvier-p3-4.pdf`);
  assertEquals(f.document, await uuidStable(`${piece.id}:3,4`), "document stable : rejouable");
  assert(/^[0-9a-f]{64}$/.test(f.sha256));
  // Le PDF déposé porte bien les deux pages de la seconde facture, et elles seules.
  assertEquals(deposes.length, 1);
  assertEquals(deposes[0].octets.length, f.octets);
  const fille = await analyserPdf(deposes[0].octets);
  assertEquals(fille.nbPages, 2);
  assertStringIncludes(fille.pages[0].texte, "TL-1002");
  assert(!fille.pages.some((p) => p.texte.includes("TL-1001")));
  const fin = portes.finis[0].resultat as Record<string, unknown>;
  assertEquals((fin.filles as FilleCreee[])[0].reference, "R2026-000100");
  assertEquals((fin.decoupage as unknown[]).length, 2, "le découpage reste dit dans le résultat");
});

Deno.test("porte pas encore posée : comportement d'avant, rien de cassé", async () => {
  const { ctx, portes, piece, deposes } = await preparer(false);
  assertEquals(await lirePiece(ctx, travailDeTest(3, piece.id)), "lue");
  assertEquals((portes.finis[0].resultat as Record<string, unknown>).filles, "porte_absente");
  assertEquals(deposes.length, 0, "aucun fichier rangé pour rien");
  assertEquals(portes.echoues.length, 0);
});

Deno.test("porte en panne : la lecture de la mère tient, l'erreur est dite", async () => {
  const { ctx, portes, piece } = await preparer(true);
  portes.creerPiecesFilles = (_m: string, _p: string, filles: FilleADeposer[]) => (filles.length === 0 ? Promise.resolve([]) : Promise.reject(new Error("HTTP 503")));
  assertEquals(await lirePiece(ctx, travailDeTest(3, piece.id)), "lue");
  const fin = portes.finis[0].resultat as Record<string, unknown>;
  assertEquals(fin.filles, "erreur");
  assertStringIncludes(String(fin.filles_erreur), "503");
  assertEquals(portes.echoues.length, 0);
});

Deno.test("une fille ne se redécoupe pas ; groupes nettoyés ; noms", () => {
  assertEquals(estFille({ nom_fichier: "x.pdf", piece_mere_id: "m" }), true);
  assertEquals(estFille({ nom_fichier: "lot-p3-4.pdf", piece_mere_id: undefined }), true);
  assertEquals(estFille({ nom_fichier: "lot-p3-4.pdf", piece_mere_id: null }), false, "la base dit : pas de mère");
  assertEquals(estFille({ nom_fichier: "facture.pdf", piece_mere_id: undefined }), false);
  assertEquals(groupesFilles([{ pages: [1, 2] }], 4), []);
  assertEquals(groupesFilles([{ pages: [1, 2] }, { pages: [2, 3, 3, 9] }, { pages: [4] }], 4), [{ pages: [3], type_piece: undefined }, { pages: [4], type_piece: undefined }]);
  assertEquals(nomFille("Lot.PDF", [5]), "Lot-p5.pdf");
});
