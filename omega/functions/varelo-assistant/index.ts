// Fonction Edge varelo-assistant : POST { messages } avec le jeton de la personne (Authorization: Bearer …).
// Appelée par app/api/assistant/route.ts quand le groupe de la personne a Varelo. Voir assistant.ts.

import { clientClaudeDepuisEnv } from "@partage/fournisseur_ia.ts";
import { journal, messageDe } from "@partage/journal.ts";
import { configSupabaseDepuisEnv, rpc } from "@partage/portes.ts";
import { type Dependances, repondre } from "./assistant.ts";

export function dependancesDepuisEnv(
  env: { get(n: string): string | undefined } = Deno.env,
  fetchFn: typeof fetch = fetch,
): Dependances {
  const service = configSupabaseDepuisEnv(env);
  const anon = env.get("SUPABASE_ANON_KEY") ?? "";
  /* un appel sous la session de la personne : la RLS s'applique, auth.uid() est le sien */
  const commeLaPersonne = async <T>(
    jeton: string,
    nom: string,
    params: Record<string, unknown>,
  ): Promise<T> => {
    const rep = await fetchFn(`${service.url}/rest/v1/rpc/${nom}`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${jeton}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });
    const texte = await rep.text();
    if (!rep.ok) {
      throw new Error(
        `porte ${nom} : HTTP ${rep.status} ${texte.slice(0, 200)}`,
      );
    }
    return (texte === "" ? null : JSON.parse(texte)) as T;
  };
  return {
    async personne(jeton) {
      const rep = await fetchFn(`${service.url}/auth/v1/user`, {
        headers: { apikey: anon, Authorization: `Bearer ${jeton}` },
      });
      if (!rep.ok) return null;
      const u = (await rep.json()) as { id?: string };
      return u.id ?? null;
    },
    clientVarelo: (jeton) =>
      commeLaPersonne<string | null>(jeton, "grp_assistant_client", {}),
    budget: (client) =>
      rpc(service, fetchFn, "grp_assistant_budget", { p_client: client }),
    contexte: (jeton, client) =>
      commeLaPersonne(jeton, "grp_contexte", {
        p_client: client,
        p_motif: "assistant",
      }),
    noter: async (
      client,
      personne,
      cout,
      modele,
      fournisseur,
      entree,
      sortie,
    ) => {
      await rpc(service, fetchFn, "grp_assistant_noter", {
        p_client: client,
        p_personne: personne,
        p_cout_eur: cout,
        p_modele: modele,
        p_fournisseur: fournisseur,
        p_entree: entree,
        p_sortie: sortie,
      });
    },
    claude: clientClaudeDepuisEnv(env),
  };
}

Deno.serve(async (req: Request) => {
  const entetes = { "Content-Type": "application/json; charset=utf-8" };
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ erreur: "méthode non permise" }), {
      status: 405,
      headers: entetes,
    });
  }
  try {
    const jeton =
      (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "") ||
      null;
    const corps = (await req.json().catch(() => ({}))) as {
      messages?: unknown;
    };
    const r = await repondre(dependancesDepuisEnv(), jeton, corps.messages);
    return new Response(JSON.stringify(r.corps), {
      status: r.statut,
      headers: entetes,
    });
  } catch (e) {
    journal("erreur", "varelo-assistant : réponse impossible", {
      erreur: messageDe(e),
    });
    return new Response(
      JSON.stringify({ erreur: "L'assistant n'a pas pu répondre. Réessayez." }),
      { status: 500, headers: entetes },
    );
  }
});
