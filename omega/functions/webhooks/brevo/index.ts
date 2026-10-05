// Webhook Brevo (remis, rebond, plainte, refus) — fonction Edge à déployer avec
// verify_jwt = false : Brevo n'envoie pas de JWT Supabase, l'authentification est
// le jeton BREVO_WEBHOOK_JETON (voir traitement.ts).

import { portesDepuisEnvironnement } from "./portes.ts";
import { traiterRequete } from "./traitement.ts";

const journal = {
  info: (message: string, detail?: Record<string, unknown>) =>
    console.log(
      `[webhooks/brevo] ${message}`,
      detail ? JSON.stringify(detail) : "",
    ),
  erreur: (message: string, detail?: Record<string, unknown>) =>
    console.error(
      `[webhooks/brevo] ${message}`,
      detail ? JSON.stringify(detail) : "",
    ),
};

Deno.serve((req: Request) =>
  traiterRequete(req, {
    portes: portesDepuisEnvironnement(),
    jeton: Deno.env.get("BREVO_WEBHOOK_JETON")?.trim() || null,
    journal,
  })
);
