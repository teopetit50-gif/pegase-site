// Webhook AR24 (accusé, refus, négligence, rebond d'une LRE) — fonction Edge à déployer avec
// verify_jwt = false : AR24 n'envoie pas de JWT Supabase. L'authentification est le jeton
// AR24_WEBHOOK_JETON dans l'URL, puis la relecture de la LRE par l'API signée (voir traitement.ts).
// Environnement : AR24_WEBHOOK_JETON, AR24_TOKEN, AR24_CLE_PRIVEE, AR24_URL (vide = bac à sable).
// L'URL à donner à expediteur (AR24_WEBHOOK_URL) : https://<projet>.supabase.co/functions/v1/webhooks-ar24?jeton=<AR24_WEBHOOK_JETON>

import { clientAr24 } from "../../expediteur/ar24.ts";
import { portesDepuisEnvironnement } from "../brevo/portes.ts";
import { traiterRequete } from "./traitement.ts";

const journal = {
  info: (message: string, detail?: Record<string, unknown>) =>
    console.log(
      `[webhooks/ar24] ${message}`,
      detail ? JSON.stringify(detail) : "",
    ),
  erreur: (message: string, detail?: Record<string, unknown>) =>
    console.error(
      `[webhooks/ar24] ${message}`,
      detail ? JSON.stringify(detail) : "",
    ),
};

Deno.serve((req: Request) => {
  const env = (n: string) => Deno.env.get(n)?.trim() || null;
  const token = env("AR24_TOKEN");
  const clePrivee = env("AR24_CLE_PRIVEE");
  return traiterRequete(req, {
    portes: portesDepuisEnvironnement(),
    ar24: token && clePrivee
      ? clientAr24({ token, clePrivee }, fetch, env("AR24_URL") ?? undefined)
      : null,
    jeton: env("AR24_WEBHOOK_JETON"),
    journal,
  });
});
