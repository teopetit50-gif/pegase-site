// L'ouvrier LECTEUR d'Omega : fonction Edge Deno appelée chaque minute. Elle
// prend les travaux `lecteur.lire`, lit les pièces (PDF natif, OCR ou lecture
// visuelle, Factur-X/UBL, tableur), extrait les valeurs par Claude (API
// Anthropic en direct, ou AWS Bedrock en région européenne), vérifie chaque
// citation, puis rend tout au socle par les portes. Voir omega/NOTES-A1.md.

import { MOTIF_IA_NON_BRANCHEE } from "@partage/claude.ts";
import { DepotStorage } from "@partage/depot.ts";
import { clientClaudeDepuisEnv } from "@partage/fournisseur_ia.ts";
import { journal, messageDe } from "@partage/journal.ts";
import { configSupabaseDepuisEnv, PortesRpc } from "@partage/portes.ts";
import { ExtracteurClaude } from "./ia.ts";
import { PortesAnalyseRpc } from "./analyse/travail.ts";
import { CoffreRpc } from "./coffre.ts";
import type { Contexte } from "./lire_piece.ts";
import { configMistralDepuisEnv, OcrMistral } from "./ocr.ts";
import { passage } from "./passage.ts";
import { SourcePluRest } from "./lorani_plu.ts";
import { PortesVareloRpc } from "./reception_varelo.ts";

export function contexteDepuisEnv(env: { get(n: string): string | undefined } = Deno.env): Contexte {
  const supabase = configSupabaseDepuisEnv(env);
  const claude = clientClaudeDepuisEnv(env);
  const mistral = configMistralDepuisEnv(env);
  if (!claude) journal("alerte", `IA non branchée : ${MOTIF_IA_NON_BRANCHEE} Les lectures seront reprises plus tard (IA_NON_BRANCHEE).`);
  else journal("info", "IA branchée", { fournisseur: claude.fournisseur, modele: claude.modele });
  return {
    portes: new PortesRpc(supabase),
    depot: new DepotStorage(supabase),
    coffre: new CoffreRpc(supabase),
    extracteur: claude ? new ExtracteurClaude(claude) : null,
    claude,
    // Les lectures longues : seulement quand le socle a posé commencer_analyse / terminer_analyse (LECTEUR_ANALYSES=1).
    portesAnalyse: env.get("LECTEUR_ANALYSES") === "1" ? new PortesAnalyseRpc(supabase) : null,
    sourcePlu: new SourcePluRest(supabase),
    varelo: new PortesVareloRpc(supabase),
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
