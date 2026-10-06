// Ouvrier MESSAGERIE — fonction Edge `messagerie`, appelée chaque minute (pg_cron → pg_net, clé de
// service), verify_jwt true. Relève les messageries connectées (Gmail) et y dépose les brouillons.
// Voir passage.ts. Sans GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET : travaux reportés, rien relevé.

import { configurationGoogleDepuisEnvironnement, gmail } from "./gmail.ts";
import { executerPassage } from "./passage.ts";
import { portesDepuisEnvironnement } from "./portes.ts";
import { stockageSupabase as stockageReception } from "../reception/commun.ts";
import { stockageSupabase as stockagePieces } from "../expediteur/stockage.ts";

const journal = {
  info: (m: string, d?: Record<string, unknown>) =>
    console.log(`[messagerie] ${m}`, d ? JSON.stringify(d) : ""),
  erreur: (m: string, d?: Record<string, unknown>) =>
    console.error(`[messagerie] ${m}`, d ? JSON.stringify(d) : ""),
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Méthode non autorisée", { status: 405 });
  }
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const cle = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const google = configurationGoogleDepuisEnvironnement();
  const bilan = await executerPassage({
    portes: portesDepuisEnvironnement(),
    gmail: google ? gmail(google) : null,
    stockage: stockageReception(url, cle),
    pieces: stockagePieces(url, cle),
    ouvrier: `messagerie@${Deno.env.get("DENO_DEPLOYMENT_ID") ?? "local"}:${
      crypto.randomUUID().slice(0, 8)
    }`,
    journal,
  });
  journal.info("passage terminé", { ...bilan });
  return new Response(JSON.stringify(bilan), {
    headers: { "Content-Type": "application/json" },
  });
});
