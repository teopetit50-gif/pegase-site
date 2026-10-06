// Lorani (B5) : le métré (quantite.<réf>, unite.<réf>) ; la zone PLU du terrain donnée au modèle pour un règlement
// de PLUi, et une zone lue qui n'est pas celle du terrain → « à vérifier » ; sans zone connue, rien ne change.

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { ecrirePdf, type LigneTexte } from "../banc/pdf_minimal.ts";
import type { SortieOutil } from "../ia.ts";
import { lirePiece } from "../lire_piece.ts";
import { indicationPlu, type SourcePlu, SourcePluRest, zonesDe } from "../lorani_plu.ts";
import { champsPour, schemaPour } from "../schemas/modules.ts";
import { contexteDeTest, pieceDeTest, travailDeTest } from "./doubles.ts";

const PROJET = "aaaaaaaa-1111-4000-8000-000000000001";

function pdf(textes: string[]): Uint8Array {
  const lignes: LigneTexte[] = textes.map((texte, i) => ({ x: 50, y: 60 + i * 18, texte }));
  return ecrirePdf([{ type: "texte", lignes }]);
}

class PluFactice implements SourcePlu {
  demandes: string[] = [];
  constructor(private readonly zones: string[] | null) {}
  zonesDuProjet(_client: string, projet: string) {
    this.demandes.push(projet);
    return Promise.resolve(this.zones);
  }
}

async function lire(textes: string[], sortie: SortieOutil, plu: SourcePlu | null) {
  const { ctx, portes, depot, ia } = contexteDeTest();
  ctx.sourcePlu = plu;
  const piece = pieceDeTest("cccccccc-0000-4000-8000-000000000081", "reglement.pdf", "application/pdf", { module: "lorani", objet_type: "lorani_projet", objet_id: PROJET });
  portes.pieces.set(piece.id, piece);
  depot.fichiers.set(piece.chemin, pdf(textes));
  ia!.prochaine = sortie;
  const issue = await lirePiece(ctx, travailDeTest(81, piece.id));
  return { issue, r: portes.enregistrements[0].resultat, ia: ia! };
}

const REGLEMENT = [
  "PLAN LOCAL D'URBANISME INTERCOMMUNAL - RÈGLEMENT",
  "ZONE UMa",
  "Article UMa 10 : la hauteur au faîtage ne peut excéder 12 mètres.",
  "ZONE UB",
  "Article UB 10 : la hauteur au faîtage ne peut excéder 9 mètres.",
];

Deno.test("lorani : le métré — quantite.<réf> et unite.<réf> ; unite aussi sur une DPGF", () => {
  assert(schemaPour("lorani").types.some((t) => t.type === "lorani_metre"));
  const m = champsPour("lorani", "lorani_metre");
  assertEquals(m.get("quantite.2_3_1")!.type, "nombre");
  assertEquals(m.get("unite.2_3_1")!.type, "texte");
  assertEquals(champsPour("lorani", "lorani_dpgf").get("unite.go_04")!.type, "texte");
  assertEquals(champsPour("lorani", "lorani_planche").get("quantite.go_04")!.type, "nombre", "une planche peut porter une quantité écrite");
  assertEquals(champsPour("lorani", "lorani_cctp").get("quantite.go_04"), undefined);
});

Deno.test("lorani : métré lu → quantités et unités vérifiées", async () => {
  const { issue, r } = await lire(["MÉTRÉ - LOT 02 GROS ŒUVRE", "2.3.1 Dallage béton 312,40 m2", "2.3.2 Longrines 48,5 ml"], {
    lisible: true,
    type_piece: "lorani_metre",
    confiance_type: 0.93,
    valeurs: [
      { champ: "lot", valeur: "02", texte: "LOT 02", page: 1 },
      { champ: "quantite.2_3_1", valeur: 312.4, texte: "Dallage béton 312,40 m2", page: 1 },
      { champ: "unite.2_3_1", valeur: "m2", texte: "312,40 m2", page: 1 },
      { champ: "quantite.2_3_2", valeur: 48.5, texte: "Longrines 48,5 ml", page: 1 },
      { champ: "unite.2_3_2", valeur: "ml", texte: "48,5 ml", page: 1 },
    ],
  }, null);
  assertEquals(issue, "lue");
  const v = new Map(r.valeurs.map((x) => [x.champ, x]));
  assertEquals(v.get("quantite.2_3_1")!.valeur, 312.4);
  assertEquals(v.get("quantite.2_3_1")!.verifiee, true);
  assertEquals(v.get("unite.2_3_2")!.valeur, "ml");
});

Deno.test("lorani : PLUi — la zone du terrain est donnée au modèle ; ses règles seules, zone conforme → lue", async () => {
  const plu = new PluFactice(["UMa"]);
  const { issue, r, ia } = await lire(REGLEMENT, {
    lisible: true,
    type_piece: "lorani_plu_reglement",
    confiance_type: 0.95,
    valeurs: [
      { champ: "zone", valeur: "UMa", texte: "ZONE UMa", page: 1 },
      { champ: "regle.hauteur_faitage_m.max", valeur: 12, texte: "ne peut excéder 12 mètres", page: 1 },
      { champ: "regle.hauteur_faitage_m.article", valeur: "UMa 10", texte: "Article UMa 10", page: 1 },
    ],
  }, plu);
  assertEquals(plu.demandes, [PROJET]);
  assertStringIncludes(ia.appels[0].piece.indication!, "« UMa »");
  assertEquals(issue, "lue");
  assertEquals(r.statut, "lue");
});

Deno.test("lorani : PLUi — zone lue qui n'est pas celle du terrain → à vérifier, motif dit", async () => {
  const { issue, r } = await lire(REGLEMENT, {
    lisible: true,
    type_piece: "lorani_plu_reglement",
    confiance_type: 0.95,
    valeurs: [
      { champ: "zone", valeur: "UB", texte: "ZONE UB", page: 1 },
      { champ: "regle.hauteur_faitage_m.max", valeur: 9, texte: "ne peut excéder 9 mètres", page: 1 },
    ],
  }, new PluFactice(["UMa"]));
  assertEquals(issue, "a_verifier");
  assertStringIncludes(r.motif!, "Zone lue « UB »");
  assertStringIncludes(r.motif!, "« UMa »");
});

Deno.test("lorani : sans zone connue (pas de ligne lorani_plu, ou pièce hors projet) → aucune indication, rien ne change", async () => {
  const { issue, ia } = await lire(REGLEMENT, {
    lisible: true,
    type_piece: "lorani_plu_reglement",
    confiance_type: 0.95,
    valeurs: [{ champ: "zone", valeur: "UB", texte: "ZONE UB", page: 1 }],
  }, new PluFactice(null));
  assertEquals(ia.appels[0].piece.indication, null);
  assertEquals(issue, "lue");
});

Deno.test("lorani : zones de lorani_plu — la principale d'abord, libellés sans doublon ; lecture REST", async () => {
  assertEquals(zonesDe({ zone: "UMa", zones: [{ libelle: "UMa" }, { libelle: "N" }] }), ["UMa", "N"]);
  assertEquals(zonesDe({ zone: null, zones: [] }), null);
  assertStringIncludes(indicationPlu(["UMa", "N"]), "zones « UMa », « N »");
  assertStringIncludes(indicationPlu(["UMa", "N"]), "zone « UMa » (la principale)");
  let url = "";
  const f = ((u: string | URL | Request) => {
    url = String(u);
    return Promise.resolve(new Response(JSON.stringify([{ zone: "UCe1b", zones: [{ libelle: "UCe1b" }] }]), { status: 200 }));
  }) as typeof fetch;
  const z = await new SourcePluRest({ url: "https://x.supabase.co", cleService: "k" }, f).zonesDuProjet("c", PROJET);
  assertEquals(z, ["UCe1b"]);
  assertStringIncludes(url, `projet_id=eq.${PROJET}`);
  const ko = await new SourcePluRest({ url: "https://x.supabase.co", cleService: "k" }, () => Promise.resolve(new Response("{}", { status: 404 }))).zonesDuProjet("c", PROJET);
  assertEquals(ko, null);
});
