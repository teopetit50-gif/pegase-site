// Les gros PDF sans texte : découpés en morceaux, transcrits un à un, puis une
// seule extraction sur le texte réuni. Et les boîtes estimées en lecture visuelle.

import { assert, assertEquals } from "@std/assert";
import { CAS } from "../banc/cas.ts";
import { octetsDuCas } from "../banc/generer.ts";
import { ecrirePdf, imageBruitee, type PageSpec } from "../banc/pdf_minimal.ts";
import { lirePiece } from "../lire_piece.ts";
import { decouperSousLimite, extrairePages, planifierMorceaux } from "../pdf_decouper.ts";
import { analyserPdf } from "../pdf.ts";
import { contexteDeTest, pieceDeTest, travailDeTest } from "./doubles.ts";

const cas02 = CAS.find((c) => c.id === "02_facture_scannee")!;
const cas01 = CAS.find((c) => c.id === "01_facture_native")!;

function pdfScanne(nbPages: number, premierePageTexte?: PageSpec): Uint8Array {
  const pages: PageSpec[] = [];
  if (premierePageTexte) pages.push(premierePageTexte);
  while (pages.length < nbPages) pages.push({ type: "image", largeur: 24, hauteur: 24, pixels: imageBruitee(24, 24, pages.length) });
  return ecrirePdf(pages);
}

Deno.test("planification et découpe des morceaux", async () => {
  assertEquals(planifierMorceaux(45, 20), [{ debut: 1, fin: 20 }, { debut: 21, fin: 40 }, { debut: 41, fin: 45 }]);
  assertEquals(planifierMorceaux(0), []);
  const pdf = pdfScanne(7);
  const m = await extrairePages(pdf, 3, 5);
  assertEquals((await analyserPdf(m)).nbPages, 3);
  const tous = await decouperSousLimite(pdf, 7, 10_000_000, 3);
  assertEquals(tous!.map((x) => x.morceau), [{ debut: 1, fin: 3 }, { debut: 4, fin: 6 }, { debut: 7, fin: 7 }]);
  // Une limite plus petite qu'une page : découpe impossible.
  assertEquals(await decouperSousLimite(pdf, 7, 10, 3), null);
});

Deno.test("gros PDF scanné (45 pages) : trois transcriptions puis une extraction sur le texte", async () => {
  const { ctx, portes, depot, ia } = contexteDeTest();
  const piece = pieceDeTest("bbbbbbbb-0000-4000-8000-000000000001", "gros_scan.pdf", "application/pdf");
  portes.pieces.set(piece.id, piece);
  depot.fichiers.set(piece.chemin, pdfScanne(45));
  const transcription02 = cas02.ia!.pages![0].texte;
  ia!.transcription = (n) => (n === 1 ? { n, texte: transcription02, confiance: 0.9 } : { n, texte: `Annexe page ${n}`, confiance: 0.9 });
  ia!.prochaine = { ...cas02.ia!, pages: undefined };

  assertEquals(await lirePiece(ctx, travailDeTest(1, piece.id)), "lue");
  assertEquals(ia!.morceaux.map((m) => [m.debut, m.fin]), [[1, 20], [21, 40], [41, 45]]);
  assertEquals(ia!.appels.length, 1);
  assertEquals(ia!.appels[0].entree.mode, "texte");
  const r = portes.enregistrements[0].resultat;
  assertEquals(r.pages.length, 45);
  assertEquals(r.methode, "ocr");
  assertEquals(r.pages[0].methode, "vision");
  assertEquals(r.pages[0].texte, transcription02);
  assertEquals(r.pages[44].texte, "Annexe page 45");
  const fini = portes.finis[0].resultat as { appels_ia: number; tokens_entree: number; cout_eur: number };
  assertEquals(fini.appels_ia, 4);
  assertEquals(fini.tokens_entree, 3 * 20000 + 1200);
  assertEquals(fini.cout_eur, Math.round((3 * 0.0966 + 0.00884) * 1e6) / 1e6);
});

Deno.test("gros PDF mixte : les morceaux entièrement natifs ne sont pas transcrits", async () => {
  const { ctx, portes, depot, ia } = contexteDeTest();
  const piece = pieceDeTest("bbbbbbbb-0000-4000-8000-000000000002", "mixte.pdf", "application/pdf");
  portes.pieces.set(piece.id, piece);
  // 25 pages : la première porte du texte, les 24 autres sont des images.
  const pages: PageSpec[] = [{ type: "texte", lignes: [{ x: 50, y: 60, texte: "TRANSPORTS LOUVET - bordereau récapitulatif, voir pages suivantes" }] }];
  while (pages.length < 25) pages.push({ type: "image", largeur: 24, hauteur: 24, pixels: imageBruitee(24, 24, pages.length) });
  depot.fichiers.set(piece.chemin, ecrirePdf(pages));
  ia!.prochaine = { lisible: true, type_piece: "autre", confiance_type: 0.5, motif: "Bordereau sans montant.", valeurs: [] };
  assertEquals(await lirePiece(ctx, travailDeTest(1, piece.id)), "a_classer");
  assertEquals(ia!.morceaux.length, 2);
  const r = portes.enregistrements[0].resultat;
  assertEquals(r.methode, "mixte");
  assertEquals(r.pages[0].methode, "natif");
  assertEquals(r.pages[1].methode, "vision");
  assertEquals(r.pages.length, 25);
});

Deno.test("boîte estimée : retenue en lecture visuelle, ignorée sur un PDF natif", async () => {
  // Lecture visuelle : la boîte du modèle est gardée et dite « estimée ».
  {
    const { ctx, portes, depot, ia } = contexteDeTest();
    const piece = pieceDeTest("bbbbbbbb-0000-4000-8000-000000000003", cas02.fichier, cas02.mime);
    portes.pieces.set(piece.id, piece);
    depot.fichiers.set(piece.chemin, await octetsDuCas(cas02));
    ia!.prochaine = {
      ...cas02.ia!,
      valeurs: cas02.ia!.valeurs.map((
        v,
      ) => (v.champ === "montant_ttc"
        ? { ...v, boite: { x: 0.6, y: 0.8, l: 0.3, h: 0.03 } }
        : v.champ === "numero"
        ? { ...v, boite: { x: 0.9, y: 0.9, l: 0.5, h: 0.5 } }
        : v)
      ),
    };
    assertEquals(await lirePiece(ctx, travailDeTest(1, piece.id)), "lue");
    const valeurs = portes.enregistrements[0].resultat.valeurs;
    const ttc = valeurs.find((v) => v.champ === "montant_ttc")!;
    assertEquals(ttc.boite, { x: 0.6, y: 0.8, l: 0.3, h: 0.03 });
    assert(ttc.controle!.includes("estimée"));
    assertEquals(valeurs.find((v) => v.champ === "numero")!.boite, undefined, "une boîte qui sort de la page est écartée");
  }
  // PDF natif : la boîte vient des mots du PDF, jamais du modèle.
  {
    const { ctx, portes, depot, ia } = contexteDeTest();
    const piece = pieceDeTest("bbbbbbbb-0000-4000-8000-000000000004", cas01.fichier, cas01.mime);
    portes.pieces.set(piece.id, piece);
    depot.fichiers.set(piece.chemin, await octetsDuCas(cas01));
    ia!.prochaine = { ...cas01.ia!, valeurs: cas01.ia!.valeurs.map((v) => ({ ...v, boite: { x: 0.1, y: 0.1, l: 0.1, h: 0.1 } })) };
    assertEquals(await lirePiece(ctx, travailDeTest(1, piece.id)), "lue");
    const ttc = portes.enregistrements[0].resultat.valeurs.find((v) => v.champ === "montant_ttc")!;
    assert(ttc.boite && ttc.boite.x !== 0.1, "boîte issue du PDF");
    assert(!ttc.controle!.includes("estimée"));
  }
});
