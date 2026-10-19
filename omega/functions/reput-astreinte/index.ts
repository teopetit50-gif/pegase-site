// L'ouvrier d'astreinte REPUT d'Omega (c3_22) : fonction Edge Deno. Deux entrées :
//   · le passage (cron, chaque minute, en-tête x-reput-jeton = REPUT_ASTREINTE_JETON) : appelle les membres de garde ;
//   · les rappels de Twilio (?evenement=touche|statut&appel=…), vérifiés par leur signature.
// Déployée sans vérification JWT (Twilio ne porte pas de jeton Supabase) : le jeton du cron et la signature Twilio gardent
// les deux entrées. Voir omega/NOTES-C3.md.

import { journal, messageDe } from "@partage/journal.ts";
import { configSupabaseDepuisEnv } from "@partage/portes.ts";
import { type ContexteAstreinte, passer, PortesAstreinteRpc, rappel } from "./passage.ts";
import { configTwilioDepuisEnv } from "./twilio.ts";

function contexte(env: { get(n: string): string | undefined } = Deno.env): ContexteAstreinte {
  return { portes: new PortesAstreinteRpc(configSupabaseDepuisEnv(env)), twilio: configTwilioDepuisEnv(env), fetchTwilio: fetch };
}

Deno.serve(async (req: Request) => {
  const json = { "Content-Type": "application/json; charset=utf-8" };
  try {
    const url = new URL(req.url);
    if (url.searchParams.has("evenement")) {
      if (req.method !== "POST") return new Response("méthode non permise", { status: 405 });
      return await rappel(contexte(), url, new URLSearchParams(await req.text()), req.headers.get("x-twilio-signature"));
    }
    const jeton = Deno.env.get("REPUT_ASTREINTE_JETON");
    if (!jeton || req.headers.get("x-reput-jeton") !== jeton) {
      return new Response(JSON.stringify({ erreur: "jeton du cron absent ou faux" }), { status: 401, headers: json });
    }
    return new Response(JSON.stringify(await passer(contexte())), { status: 200, headers: json });
  } catch (e) {
    const erreur = messageDe(e);
    journal("erreur", "reput-astreinte : passage impossible", { erreur });
    return new Response(JSON.stringify({ erreur }), { status: 200, headers: json });
  }
});
