// La lecture métier longue : citations page et lignes vérifiées, passe par pièce puis synthèse, constats sans
// source écartés, paliers (reprise après budget de temps), limites et plafond de coût.

import { assert, assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import type { ClientClaude, DemandeConverse, ReponseConverse } from "@partage/claude.ts";
import { indexerPages, pageNumerotee, verifierCitation } from "../analyse/citations.ts";
import { analyser, type PieceDossier, trancher, type TypeAnalyse } from "../analyse/moteur.ts";

class ClientFactice implements ClientClaude {
  readonly fournisseur = "anthropic" as const;
  readonly modele = "claude-test";
  readonly prix = { prixEntreeUsdMtok: 2, prixSortieUsdMtok: 10, tauxUsdEur: 1 };
  demandes: DemandeConverse[] = [];
  constructor(private reponses: ((d: DemandeConverse) => unknown)[]) {}
  converse(d: DemandeConverse): Promise<ReponseConverse> {
    this.demandes.push(d);
    const f = this.reponses.shift();
    if (!f) throw new Error("plus de réponse prévue");
    return Promise.resolve({ entree: f(d), usage: { tokens_entree: 10_000, tokens_sortie: 1_000 }, stopReason: "tool_use" });
  }
}

const TYPE: TypeAnalyse = {
  type: "essai.chronologie",
  libelle: "chronologie sourcée",
  consigne: "Relève chaque événement daté.",
  codes: ["evenement"],
  schemaDonnees: { properties: { date: { type: "string" } } },
  synthese: true,
  limites: { pieces: 10, pages: 50, coutMaxEur: 1 },
};

const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const pieces: PieceDossier[] = [
  { piece: A, nom: "assignation.pdf", role: "assignation", pages: [{ n: 1, texte: "TRIBUNAL JUDICIAIRE\nAssignation\nLe 3 mars 2026, la société a livré le chantier.\nFin." }] },
  { piece: B, nom: "conclusions.pdf", role: "conclusions", pages: [{ n: 1, texte: "CONCLUSIONS\nLa réception a eu lieu le 10 avril 2026.\nRéserves émises." }] },
];

const constat = (piece: string, lignes: [number, number], extrait: string, date: string) => ({
  code: "evenement",
  titre: `Événement du ${date}`,
  texte: "…",
  gravite: "info",
  donnees: { date },
  citations: [{ piece, page: 1, lignes, extrait }],
});

Deno.test("citations : retrouvées aux lignes (±2), ailleurs sur la page, ou introuvables", () => {
  const pages = indexerPages([{ piece: A, n: 1, texte: pieces[0].pages[0].texte }]);
  assertEquals(verifierCitation({ piece: A, page: 1, lignes: [3, 3], extrait: "la société a livré le chantier" }, pages).verifiee, true);
  assertEquals(verifierCitation({ piece: A, page: 1, lignes: [1, 1], extrait: "la société a livré le chantier" }, pages).verifiee, true, "à deux lignes près");
  const loin = verifierCitation({ piece: A, page: 1, lignes: [1, 1], extrait: "Fin." }, pages);
  assertEquals(loin.verifiee, false);
  assertStringIncludes(loin.controle!, "pas aux lignes");
  assertEquals(verifierCitation({ piece: A, page: 1, lignes: [3, 3], extrait: "le 4 mars" }, pages).verifiee, false);
  assertEquals(verifierCitation({ piece: A, page: 2, lignes: [1, 1], extrait: "x" }, pages).verifiee, false);
  assertStringIncludes(pageNumerotee("a\nb"), "  2| b");
});

Deno.test("analyse : une passe par pièce, puis la synthèse ; une citation inventée est écartée", async () => {
  const client = new ClientFactice([
    () => ({ constats: [constat(A, [3, 3], "Le 3 mars 2026, la société a livré le chantier.", "2026-03-03"), constat(A, [2, 2], "livraison le 5 mai", "2026-05-05")] }),
    () => ({ constats: [constat(B, [2, 2], "La réception a eu lieu le 10 avril 2026.", "2026-04-10")] }),
    (d) => {
      const recu = JSON.parse((d.contenu[0] as { text: string }).text) as { constats: unknown[] };
      assertEquals(recu.constats.length, 2, "seuls les constats sourcés vont à la synthèse");
      return {
        resume: "Livraison le 3 mars, réception le 10 avril.",
        constats: [constat(A, [3, 3], "Le 3 mars 2026, la société a livré le chantier.", "2026-03-03"), constat(B, [2, 2], "La réception a eu lieu le 10 avril 2026.", "2026-04-10")],
      };
    },
  ]);
  const r = await analyser(client, TYPE, pieces);
  assertEquals(r.fini, true);
  assertEquals(r.constats.length, 2);
  assert(r.constats.every((c) => c.source && c.citations.every((x) => x.verifiee)));
  assertEquals(r.resume, "Livraison le 3 mars, réception le 10 avril.");
  assertEquals(r.couts.appels_ia, 3);
  assertEquals(r.couts.cout_eur, 0.09);
  assertEquals(r.pieces_lues, 2);
  assertStringIncludes((client.demandes[0].contenu[0] as { text: string }).text, "  3| Le 3 mars 2026", "le modèle voit les lignes numérotées");
});

Deno.test("paliers : budget épuisé → non finie avec son état, puis reprise sans relire ce qui est fait", async () => {
  let t = 0;
  const premier = new ClientFactice([() => ({ constats: [constat(A, [3, 3], "Le 3 mars 2026, la société a livré le chantier.", "2026-03-03")] })]);
  const r1 = await analyser(premier, TYPE, pieces, { budgetMs: 5, maintenant: () => (t += 4) });
  assertEquals(r1.fini, false);
  assertEquals(r1.etat!.tranches_faites, [`${A}:1-1`]);
  assertEquals(r1.constats, []);
  const second = new ClientFactice([
    () => ({ constats: [constat(B, [2, 2], "La réception a eu lieu le 10 avril 2026.", "2026-04-10")] }),
    () => ({ resume: "r", constats: [constat(B, [2, 2], "La réception a eu lieu le 10 avril 2026.", "2026-04-10")] }),
  ]);
  const r2 = await analyser(second, TYPE, pieces, { etat: r1.etat });
  assertEquals(r2.fini, true);
  assertEquals(second.demandes.length, 2, "la pièce A n'est pas relue");
  assertEquals(r2.couts.appels_ia, 3, "les coûts du premier passage sont gardés");
});

Deno.test("limites et plafond : dossier trop grand refusé ; plafond de coût atteint en cours de route", async () => {
  await assertRejects(() => analyser(new ClientFactice([]), { ...TYPE, limites: { ...TYPE.limites, pieces: 1 } }, pieces), Error, "dossier trop grand");
  const client = new ClientFactice([() => ({ constats: [] }), () => ({ constats: [] })]);
  await assertRejects(() => analyser(client, { ...TYPE, limites: { ...TYPE.limites, coutMaxEur: 0.01 } }, pieces), Error, "plafond");
});

Deno.test("tranches : une grosse pièce se coupe par pages", () => {
  const grosse: PieceDossier = { piece: A, nom: "x", pages: [1, 2, 3, 4].map((n) => ({ n, texte: "x".repeat(50) })) };
  assertEquals(trancher([grosse], 120).map((t) => t.cle), [`${A}:1-2`, `${A}:3-4`]);
});
