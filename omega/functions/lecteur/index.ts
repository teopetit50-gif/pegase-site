// L'ouvrier LECTEUR d'Omega : fonction Edge Deno appelée chaque minute. Elle
// prend les travaux `lecteur.lire`, lit les pièces (PDF natif, OCR ou lecture
// visuelle, Factur-X/UBL, tableur), extrait les valeurs par Claude sur AWS
// Bedrock (région européenne), vérifie chaque citation, puis rend tout au
// socle par les portes. Voir omega/NOTES-A1.md.

import { ClientBedrock, configBedrockDepuisEnv } from "@partage/bedrock.ts";
import { DepotStorage } from "@partage/depot.ts";
import { journal, messageDe } from "@partage/journal.ts";
import { configSupabaseDepuisEnv, PortesRpc } from "@partage/portes.ts";
import { ExtracteurBedrock } from "./ia.ts";
import type { Contexte } from "./lire_piece.ts";
import { configMistralDepuisEnv, OcrMistral } from "./ocr.ts";
import { passage } from "./passage.ts";

export function contexteDepuisEnv(env: { get(n: string): string | undefined } = Deno.env): Contexte {
  const supabase = configSupabaseDepuisEnv(env);
  const bedrock = configBedrockDepuisEnv(env);
  const mistral = configMistralDepuisEnv(env);
  if (!bedrock) {
    journal(
      "alerte",
      "IA non branchée : AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY ou BEDROCK_MODEL_ID manque ; les lectures seront reprises plus tard (IA_NON_BRANCHEE)",
    );
  }
  return {
    portes: new PortesRpc(supabase),
    depot: new DepotStorage(supabase),
    extracteur: bedrock ? new ExtracteurBedrock(new ClientBedrock(bedrock)) : null,
    ocr: mistral ? new OcrMistral(mistral) : null,
    env,
    maintenant: () => new Date(),
    ouvrier: env.get("LECTEUR_NOM") || "lecteur",
  };
}

Deno.serve(async (req: Request) => {
  const entetes = { "Content-Type": "application/json; charset=utf-8" };
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ erreur: "méthode non permise" }), { status: 405, headers: entetes });
  }
  try {
    const url = new URL(req.url);
    const nombre = Number(url.searchParams.get("nombre") ?? "");
    const ctx = contexteDepuisEnv();
    const bilan = await passage(ctx, Number.isInteger(nombre) && nombre > 0 ? { nombre: Math.min(nombre, 20) } : {});
    return new Response(JSON.stringify(bilan), { status: 200, headers: entetes });
  } catch (e) {
    // Même une panne de configuration répond proprement : le planificateur verra le motif.
    const erreur = messageDe(e);
    journal("erreur", "lecteur : passage impossible", { erreur });
    return new Response(JSON.stringify({ erreur }), { status: 200, headers: entetes });
  }
});
