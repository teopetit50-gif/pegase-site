// L'ouvrier REPUT d'Omega : fonction Edge Deno appelée chaque minute (cron omega-reput). Elle prend
// les travaux reput.preparer, rédige la réponse par Claude à partir de la base de connaissances du
// client seulement, la contrôle, et la dépose dans la file de validation par les portes (c3_02).
// Voir omega/NOTES-C3.md.

import { clientClaudeDepuisEnv } from "@partage/fournisseur_ia.ts";
import { journal, messageDe } from "@partage/journal.ts";
import { configSupabaseDepuisEnv } from "@partage/portes.ts";
import { type Contexte, passage } from "./passage.ts";
import { PortesReputRpc } from "./portes_reput.ts";

export function contexteDepuisEnv(env: { get(n: string): string | undefined } = Deno.env): Contexte {
  const supabase = configSupabaseDepuisEnv(env);
  const claude = clientClaudeDepuisEnv(env);
  if (!claude) journal("alerte", "IA non branchée : les réponses attendent (IA_NON_BRANCHEE).");
  else journal("info", "IA branchée", { fournisseur: claude.fournisseur, modele: claude.modele });
  return {
    portes: new PortesReputRpc(supabase),
    claude,
    env,
    maintenant: () => new Date(),
    ouvrier: env.get("REPUT_NOM") || "reput-reponse",
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
    const bilan = await passage(contexteDepuisEnv(), Number.isInteger(nombre) && nombre > 0 ? { nombre: Math.min(nombre, 20) } : {});
    return new Response(JSON.stringify(bilan), { status: 200, headers: entetes });
  } catch (e) {
    const erreur = messageDe(e);
    journal("erreur", "reput-reponse : passage impossible", { erreur });
    return new Response(JSON.stringify({ erreur }), { status: 200, headers: entetes });
  }
});
