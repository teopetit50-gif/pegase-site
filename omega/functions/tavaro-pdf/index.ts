// Ouvrier TAVARO-PDF — fonction Edge appelée par pg_cron → pg_net chaque minute, avec la clé de service (comme
// l'expéditeur d'A2). Prend les travaux tavaro.pdf_factures, compose les PDF des factures, joint les photos datées et
// fait partir le courriel. Voir passage.ts. Session B2, 06/10/2026.

import { executerPassage } from "./passage.ts";
import { portesDepuisEnvironnement } from "./portes.ts";
import { stockageSupabase } from "./stockage.ts";

const journal = {
  info: (m: string, d?: Record<string, unknown>) => console.log(`[tavaro-pdf] ${m}`, d ? JSON.stringify(d) : ""),
  erreur: (m: string, d?: Record<string, unknown>) => console.error(`[tavaro-pdf] ${m}`, d ? JSON.stringify(d) : ""),
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST" && req.method !== "GET") return new Response("Méthode non autorisée", { status: 405 });
  const bilan = await executerPassage({
    portes: portesDepuisEnvironnement(),
    stockage: stockageSupabase(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""),
    ouvrier: `tavaro-pdf@${Deno.env.get("DENO_DEPLOYMENT_ID") ?? "local"}:${crypto.randomUUID().slice(0, 8)}`,
    journal,
  });
  journal.info("passage terminé", bilan);
  return new Response(JSON.stringify(bilan), { headers: { "Content-Type": "application/json" } });
});
