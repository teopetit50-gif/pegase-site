// Les appels non décrochés, transcrits (REPUT, lot 10) : fonction Edge Deno, webhook vocal Twilio. Déployée sans
// vérification JWT (Twilio ne porte pas de jeton Supabase) : chaque appel est vérifié par sa signature X-Twilio-Signature.
// Secrets : TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID (voie « ue » : lire puis effacer l'enregistrement), REPUT_APPELS_URL (l'URL
// publique de la fonction, EXACTEMENT celle saisie chez Twilio : schéma, hôte, chemin). Voir omega/NOTES-C3.md.

import { journal, messageDe } from "@partage/journal.ts";
import { configSupabaseDepuisEnv } from "@partage/portes.ts";
import { PortesAppelsRpc, transcripteurDepuisEnv, webhook } from "./appels.ts";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("méthode non permise", { status: 405 });
  try {
    const base = Deno.env.get("REPUT_APPELS_URL")?.replace(/\/+$/, "") ?? null;
    return await webhook({ portes: new PortesAppelsRpc(configSupabaseDepuisEnv()), jeton: Deno.env.get("TWILIO_AUTH_TOKEN") ?? null, base,
                           compte: Deno.env.get("TWILIO_ACCOUNT_SID") ?? null, transcripteur: transcripteurDepuisEnv(Deno.env) },
                         new URL(req.url), new URLSearchParams(await req.text()), req.headers.get("x-twilio-signature"));
  } catch (e) {
    journal("erreur", "reput-appels : webhook impossible", { erreur: messageDe(e) });
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`, { status: 200, headers: { "Content-Type": "text/xml" } });
  }
});
