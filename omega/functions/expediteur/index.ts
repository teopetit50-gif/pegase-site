// Ouvrier EXPÉDITEUR — fonction Edge appelée chaque minute (pg_cron → pg_net, clé de service).
// Prend les travaux envois.brevo / envois.brevo_sms et les remet à Brevo. Voir passage.ts.

import { clientBrevo } from "./brevo.ts";
import { executerPassage } from "./passage.ts";
import { portesDepuisEnvironnement } from "./portes.ts";
import { stockageSupabase } from "./stockage.ts";

const journal = {
  info: (message: string, detail?: Record<string, unknown>) =>
    console.log(
      `[expediteur] ${message}`,
      detail ? JSON.stringify(detail) : "",
    ),
  erreur: (message: string, detail?: Record<string, unknown>) =>
    console.error(
      `[expediteur] ${message}`,
      detail ? JSON.stringify(detail) : "",
    ),
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Méthode non autorisée", { status: 405 });
  }
  const cleEnvironnement = Deno.env.get("BREVO_API_KEY")?.trim() || null;
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const cleService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const ouvrier = `expediteur@${
    Deno.env.get("DENO_DEPLOYMENT_ID") ?? "local"
  }:${crypto.randomUUID().slice(0, 8)}`;

  const bilan = await executerPassage({
    portes: portesDepuisEnvironnement(),
    brevoPour: (cleApi) => clientBrevo(cleApi),
    cleEnvironnement,
    stockage: stockageSupabase(url, cleService),
    ouvrier,
    journal,
  });
  journal.info("passage terminé", {
    pris: bilan.pris,
    remis: bilan.remis,
    non_envoyes: bilan.non_envoyes,
    reportes: bilan.reportes,
    echecs: bilan.echecs,
    duree_ms: bilan.duree_ms,
  });
  return new Response(JSON.stringify(bilan), {
    headers: { "Content-Type": "application/json" },
  });
});
