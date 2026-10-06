// Ouvrier ÉCHANGE-PA — fonction Edge appelée chaque minute (pg_cron → pg_net, clé de service),
// verify_jwt true. Dépose les factures émises et les statuts de cycle de vie à la plateforme
// agréée, relève ce qu'elle a reçu. Voir passage.ts.
// Sans PA_FLOW_URL / PA_TOKEN_URL / PA_CLIENT_ID / PA_CLIENT_SECRET : PA non branchée,
// les travaux sont reportés, rien n'est relevé, le battement le dit (pa_branchee false).

import {
  configurationAfnorDepuisEnvironnement,
  plateformeAfnor,
} from "./afnor.ts";
import { executerPassage } from "./passage.ts";
import { portesDepuisEnvironnement } from "./portes.ts";
import { stockageSupabase } from "./stockage.ts";

const journal = {
  info: (message: string, detail?: Record<string, unknown>) =>
    console.log(
      `[echange-pa] ${message}`,
      detail ? JSON.stringify(detail) : "",
    ),
  erreur: (message: string, detail?: Record<string, unknown>) =>
    console.error(
      `[echange-pa] ${message}`,
      detail ? JSON.stringify(detail) : "",
    ),
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Méthode non autorisée", { status: 405 });
  }
  const configuration = configurationAfnorDepuisEnvironnement();
  const bilan = await executerPassage({
    portes: portesDepuisEnvironnement(),
    pa: configuration ? plateformeAfnor(configuration) : null,
    stockage: stockageSupabase(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    ),
    ouvrier: `echange-pa@${Deno.env.get("DENO_DEPLOYMENT_ID") ?? "local"}:${
      crypto.randomUUID().slice(0, 8)
    }`,
    journal,
  });
  journal.info("passage terminé", { ...bilan });
  return new Response(JSON.stringify(bilan), {
    headers: { "Content-Type": "application/json" },
  });
});
