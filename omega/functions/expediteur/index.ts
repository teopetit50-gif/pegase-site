// Ouvrier EXPÉDITEUR — fonction Edge appelée chaque minute (pg_cron → pg_net, clé de service).
// Prend les travaux envois.brevo / envois.brevo_sms (Brevo), envois.meta_whatsapp (WhatsApp Cloud API) et
// envois.ar24 (LRE) et les remet au fournisseur. Voir passage.ts.
// Environnement : BREVO_API_KEY ; META_ACCESS_TOKEN ; AR24_TOKEN, AR24_CLE_PRIVEE et AR24_URL (sans AR24_URL :
// le bac à sable https://sandbox.ar24.fr/api, aucune lettre réelle ne part).

import { clientAr24 } from "./ar24.ts";
import { clientBrevo } from "./brevo.ts";
import { clientWhatsApp } from "./meta.ts";
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
  const jetonMeta = Deno.env.get("META_ACCESS_TOKEN")?.trim() || null;
  const ar24Token = Deno.env.get("AR24_TOKEN")?.trim() || null;
  const ar24Cle = Deno.env.get("AR24_CLE_PRIVEE")?.trim() || null;
  const ar24Url = Deno.env.get("AR24_URL")?.trim() || undefined;
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
    whatsappPour: (jeton, phoneNumberId) =>
      clientWhatsApp(phoneNumberId, jeton),
    jetonMeta,
    ar24Pour: (acces) => clientAr24(acces, fetch, ar24Url),
    accesAr24: ar24Token && ar24Cle
      ? { token: ar24Token, clePrivee: ar24Cle }
      : null,
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
