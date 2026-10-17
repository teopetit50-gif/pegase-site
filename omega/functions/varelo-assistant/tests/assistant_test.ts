import { assertEquals, assertStringIncludes } from "@std/assert";
import type { ClientClaude, DemandeConverse } from "@partage/claude.ts";
import { ErreurOuvrier } from "@partage/erreurs.ts";
import { type Dependances, lireMessages, repondre } from "../assistant.ts";

function doubles(
  o: Partial<Dependances> = {},
  claude?: Partial<ClientClaude> & { demandes?: DemandeConverse[] },
) {
  const notes: unknown[][] = [];
  const contextes: string[] = [];
  const demandes: DemandeConverse[] = [];
  const c: ClientClaude = {
    fournisseur: "anthropic",
    modele: "claude-sonnet-5-5",
    prix: { prixEntreeUsdMtok: 2, prixSortieUsdMtok: 10, tauxUsdEur: 1 },
    converse: (d) => {
      demandes.push(d);
      return Promise.resolve({
        entree: {
          reponse: "Atelier Bertin — Siège : trésorerie de 149 500 €.",
        },
        usage: { tokens_entree: 1000, tokens_sortie: 100 },
        stopReason: "tool_use",
      });
    },
    ...claude,
  };
  const d: Dependances = {
    personne: (j) => Promise.resolve(j === "jeton-ok" ? "u1" : null),
    clientVarelo: () => Promise.resolve("c1"),
    budget: () =>
      Promise.resolve({ permis: true, depense_eur: 0, plafond_eur: 5 }),
    contexte: (j, cl) => {
      contextes.push(`${j}:${cl}`);
      return Promise.resolve({
        societes: [{ societe: "Atelier Bertin — Siège", tresorerie: 149500 }],
      });
    },
    noter: (...a) => {
      notes.push(a);
      return Promise.resolve();
    },
    claude: c,
    ...o,
  };
  return { d, notes, contextes, demandes };
}
const Q = [{ role: "user", content: "Quelle est la trésorerie du siège ?" }];

Deno.test("répond sur les données du groupe, lues sous la session de la personne, et note le coût", async () => {
  const { d, notes, contextes, demandes } = doubles();
  const r = await repondre(d, "jeton-ok", Q);
  assertEquals(r.statut, 200);
  assertStringIncludes(r.corps.reponse ?? "", "149 500");
  assertEquals(contextes, ["jeton-ok:c1"]);
  assertStringIncludes(
    (demandes[0].contenu[0] as { text: string }).text,
    "149500",
  );
  assertEquals(notes.length, 1);
  assertEquals(notes[0].slice(0, 5), [
    "c1",
    "u1",
    0.003,
    "claude-sonnet-5-5",
    "anthropic",
  ]);
});

Deno.test("sans jeton ou jeton refusé : 401, rien lu", async () => {
  const { d, contextes } = doubles();
  assertEquals((await repondre(d, null, Q)).statut, 401);
  assertEquals((await repondre(d, "jeton-faux", Q)).statut, 401);
  assertEquals(contextes.length, 0);
});

Deno.test("plafond du jour atteint : 429, ni lecture ni appel au modèle", async () => {
  const { d, contextes, demandes } = doubles({
    budget: () =>
      Promise.resolve({ permis: false, depense_eur: 5.2, plafond_eur: 5 }),
  });
  const r = await repondre(d, "jeton-ok", Q);
  assertEquals(r.statut, 429);
  assertStringIncludes(r.corps.erreur ?? "", "plafond");
  assertEquals(contextes.length + demandes.length, 0);
});

Deno.test("pas de Varelo : 404 ; pas d'IA branchée : 503", async () => {
  assertEquals(
    (await repondre(
      doubles({ clientVarelo: () => Promise.resolve(null) }).d,
      "jeton-ok",
      Q,
    )).statut,
    404,
  );
  assertEquals(
    (await repondre(doubles({ claude: null }).d, "jeton-ok", Q)).statut,
    503,
  );
});

Deno.test("fournisseur indisponible : 503, rien noté", async () => {
  const { d, notes } = doubles({}, {
    converse: () =>
      Promise.reject(new ErreurOuvrier("FOURNISSEUR_INDISPONIBLE", "HTTP 529")),
  });
  assertEquals((await repondre(d, "jeton-ok", Q)).statut, 503);
  assertEquals(notes.length, 0);
});

Deno.test("les messages : 20 au plus, 4 000 caractères, du premier au dernier message de la personne", () => {
  assertEquals(lireMessages([{ role: "assistant", content: "Bonjour" }]), null);
  assertEquals(lireMessages("x"), null);
  const longs = Array.from(
    { length: 25 },
    (_, i) => ({
      role: i % 2 ? "assistant" : "user",
      content: "a".repeat(5000),
    }),
  );
  const m = lireMessages(longs);
  assertEquals(m?.length, 19);
  assertEquals(m?.[0].role, "user");
  assertEquals(m?.[0].content.length, 4000);
});
