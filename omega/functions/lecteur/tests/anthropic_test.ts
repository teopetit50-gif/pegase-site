// Le fournisseur « anthropic » : choix par ANTHROPIC_API_KEY, forme exacte de
// la requête Messages API, réponse bien formée, clé refusée, report sur 429.

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { ClientAnthropic, configAnthropicDepuisEnv, prixParDefautAnthropic, traduireContenu } from "@partage/anthropic.ts";
import { coutEur, MOTIF_IA_NON_BRANCHEE } from "@partage/claude.ts";
import { ErreurOuvrier } from "@partage/erreurs.ts";
import { clientClaudeDepuisEnv } from "@partage/fournisseur_ia.ts";
import { ExtracteurClaude } from "../ia.ts";
import { CAS } from "../banc/cas.ts";
import { octetsDuCas } from "../banc/generer.ts";
import { lirePiece } from "../lire_piece.ts";
import { SCHEMA_OUTIL_LECTURE } from "../schemas/facture.ts";
import { contexteDeTest, envFactice, pieceDeTest, travailDeTest } from "./doubles.ts";

const cas01 = CAS.find((c) => c.id === "01_facture_native")!;

function fauxFetch(statut: number, corps: unknown) {
  const appels: { url: string; init: RequestInit }[] = [];
  const f = (entree: string | URL | Request, init?: RequestInit): Promise<Response> => {
    appels.push({ url: String(entree), init: init ?? {} });
    return Promise.resolve(new Response(JSON.stringify(corps), { status: statut }));
  };
  return { f: f as typeof fetch, appels };
}

const reponseOk = (entree: unknown) => ({
  id: "msg_x",
  type: "message",
  role: "assistant",
  model: "claude-sonnet-5-5",
  content: [{ type: "tool_use", id: "toolu_1", name: "lire_piece", input: entree }],
  stop_reason: "tool_use",
  usage: { input_tokens: 1500, output_tokens: 900 },
});

Deno.test("fournisseur : Anthropic si ANTHROPIC_API_KEY, Bedrock sinon, rien sans clé", () => {
  assertEquals(clientClaudeDepuisEnv(envFactice({})), null);
  const a = clientClaudeDepuisEnv(
    envFactice({ ANTHROPIC_API_KEY: "sk-test", AWS_ACCESS_KEY_ID: "a", AWS_SECRET_ACCESS_KEY: "b", BEDROCK_MODEL_ID: "eu.anthropic.claude-sonnet-4-5" }),
  )!;
  assertEquals(a.fournisseur, "anthropic");
  assertEquals(a.modele, "claude-sonnet-5-5");
  const b = clientClaudeDepuisEnv(envFactice({ AWS_ACCESS_KEY_ID: "a", AWS_SECRET_ACCESS_KEY: "b", BEDROCK_MODEL_ID: "eu.anthropic.claude-sonnet-4-5" }))!;
  assertEquals(b.fournisseur, "bedrock");
  assertEquals(configAnthropicDepuisEnv(envFactice({ ANTHROPIC_API_KEY: "sk", ANTHROPIC_MODEL_ID: "claude-opus-5-5", ANTHROPIC_EFFORT: "aucun" }))!.effort, "");
  assertEquals(prixParDefautAnthropic("claude-sonnet-5-5"), { entree: 2, sortie: 10 });
  assertEquals(prixParDefautAnthropic("claude-opus-5-5"), { entree: 4, sortie: 20 });
  assert(MOTIF_IA_NON_BRANCHEE.includes("ANTHROPIC_API_KEY") && MOTIF_IA_NON_BRANCHEE.includes("BEDROCK_MODEL_ID"));
});

Deno.test("anthropic : la requête Messages API (en-têtes, modèle, outil, blocs document avant texte)", async () => {
  const { f, appels } = fauxFetch(200, reponseOk({ lisible: true }));
  const cfg = configAnthropicDepuisEnv(envFactice({ ANTHROPIC_API_KEY: "sk-test" }))!;
  const client = new ClientAnthropic(cfg, f);
  const rep = await client.converse({
    system: "Consigne.",
    contenu: [{ text: "Lis." }, { document: { format: "pdf", name: "piece", source: { bytes: "AAAA" } } }],
    outil: { name: "lire_piece", description: "Lecture.", schema: SCHEMA_OUTIL_LECTURE },
    maxTokens: 16000,
  });
  assertEquals(rep.entree, { lisible: true });
  assertEquals(rep.usage, { tokens_entree: 1500, tokens_sortie: 900 });
  assertEquals(appels[0].url, "https://api.anthropic.com/v1/messages");
  const entetes = appels[0].init.headers as Record<string, string>;
  assertEquals(entetes["x-api-key"], "sk-test");
  assertEquals(entetes["anthropic-version"], "2023-06-01");
  assertEquals(entetes["content-type"], "application/json");
  const corps = JSON.parse(String(appels[0].init.body));
  assertEquals(corps.model, "claude-sonnet-5-5");
  assertEquals(corps.max_tokens, 16000);
  assertEquals(corps.tool_choice, { type: "auto", disable_parallel_tool_use: true });
  assertEquals(corps.tools[0].name, "lire_piece");
  assertEquals(corps.tools[0].input_schema, SCHEMA_OUTIL_LECTURE);
  assertEquals(corps.output_config, { effort: "medium" });
  assertEquals(corps.temperature, undefined);
  assertStringIncludes(corps.system, "lire_piece");
  assertEquals(corps.messages[0].content[0], { type: "document", source: { type: "base64", media_type: "application/pdf", data: "AAAA" } });
  assertEquals(corps.messages[0].content[1], { type: "text", text: "Lis." });
  assertEquals(traduireContenu([{ image: { format: "png", source: { bytes: "BB" } } }])[0], {
    type: "image",
    source: { type: "base64", media_type: "image/png", data: "BB" },
  });
});

Deno.test("anthropic : 401 → IA_NON_BRANCHEE, 429 et 529 → FOURNISSEUR_INDISPONIBLE, 400 → ERREUR_INTERNE, refus → ERREUR_INTERNE", async () => {
  const cfg = configAnthropicDepuisEnv(envFactice({ ANTHROPIC_API_KEY: "sk-test" }))!;
  const attendre = async (statut: number, corps: unknown, code: string) => {
    try {
      await new ClientAnthropic(cfg, fauxFetch(statut, corps).f).converse({
        system: "s",
        contenu: [{ text: "t" }],
        outil: { name: "lire_piece", description: "d", schema: {} },
      });
      assert(false, `aurait dû lever (${statut})`);
    } catch (e) {
      assert(e instanceof ErreurOuvrier, String(e));
      assertEquals(e.code, code);
    }
  };
  await attendre(401, { type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }, "IA_NON_BRANCHEE");
  await attendre(429, { type: "error", error: { type: "rate_limit_error", message: "trop" } }, "FOURNISSEUR_INDISPONIBLE");
  await attendre(529, { type: "error", error: { type: "overloaded_error", message: "surcharge" } }, "FOURNISSEUR_INDISPONIBLE");
  await attendre(400, { type: "error", error: { type: "invalid_request_error", message: "mauvaise requête" } }, "ERREUR_INTERNE");
  await attendre(
    200,
    { content: [{ type: "text", text: "Je ne peux pas." }], stop_reason: "refusal", stop_details: { category: "general_harms" }, usage: {} },
    "ERREUR_INTERNE",
  );
  await attendre(200, { content: [{ type: "text", text: "Voici…" }], stop_reason: "end_turn", usage: {} }, "ERREUR_INTERNE");
});

Deno.test("anthropic : lecture de bout en bout avec le double de l'API, coût en euros", async () => {
  const { f } = fauxFetch(200, reponseOk(cas01.ia));
  const cfg = configAnthropicDepuisEnv(envFactice({ ANTHROPIC_API_KEY: "sk-test" }))!;
  const extracteur = new ExtracteurClaude(new ClientAnthropic(cfg, f));
  const { ctx, portes, depot } = contexteDeTest({ ia: null });
  ctx.extracteur = extracteur;
  const piece = pieceDeTest("aaaaaaaa-0000-4000-8000-000000000010", cas01.fichier, cas01.mime);
  portes.pieces.set(piece.id, piece);
  depot.fichiers.set(piece.chemin, await octetsDuCas(cas01));
  assertEquals(await lirePiece(ctx, travailDeTest(1, piece.id)), "lue");
  const fini = portes.finis[0].resultat as { modele: string; tokens_entree: number; tokens_sortie: number; cout_eur: number };
  assertEquals(fini.modele, "claude-sonnet-5-5");
  assertEquals(fini.tokens_entree, 1500);
  assertEquals(fini.tokens_sortie, 900);
  assertEquals(fini.cout_eur, coutEur(cfg, { tokens_entree: 1500, tokens_sortie: 900 }));
  assertEquals(fini.cout_eur, 0.011040);
  assert(portes.enregistrements[0].version.endsWith("/claude-sonnet-5-5"));
  // Le plafond compte ce fournisseur comme l'autre : l'estimation est en euros, positive.
  assert(extracteur.estimer({ mode: "texte", pages: [{ n: 1, texte: "x".repeat(3500) }] }) > 0);
});

Deno.test("sans IA : le motif cite les deux options", async () => {
  const { ctx, portes, depot } = contexteDeTest({ ia: null });
  const piece = pieceDeTest("aaaaaaaa-0000-4000-8000-000000000011", cas01.fichier, cas01.mime);
  portes.pieces.set(piece.id, piece);
  depot.fichiers.set(piece.chemin, await octetsDuCas(cas01));
  assertEquals(await lirePiece(ctx, travailDeTest(1, piece.id)), "repris");
  assertStringIncludes(portes.echoues[0].erreur, "ANTHROPIC_API_KEY");
  assertStringIncludes(portes.echoues[0].erreur, "BEDROCK_MODEL_ID");
});
