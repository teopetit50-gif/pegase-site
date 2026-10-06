// Démarrage de la fonction Edge `echange-pa`, PA donnée par l'appelant : index.ts la lit dans
// les secrets PA_*, recette.ts prend le bac à sable de la recette.

import { type ConfigurationAfnor, plateformeAfnor } from "./afnor.ts";
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

export function servirOuvrier(
  configuration: ConfigurationAfnor | null,
  origine: string,
): void {
  Deno.serve(async (req: Request) => {
    if (req.method !== "POST" && req.method !== "GET") {
      return new Response("Méthode non autorisée", { status: 405 });
    }
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
    journal.info("passage terminé", { origine, ...bilan });
    return new Response(JSON.stringify({ origine, ...bilan }), {
      headers: { "Content-Type": "application/json" },
    });
  });
}
