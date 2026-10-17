// L'assistant « questions » de DALIRO : fonction Edge Deno appelée chaque minute (cron daliro-questions). Elle prend
// les travaux daliro.question, répond par Claude à partir du seul contexte figé à la question (le tableau du chantier
// avec les droits de la personne, et le fil), contrôle la réponse et la dépose par les portes (b6_36).
// Même fournisseur et mêmes garde-fous que le lecteur : _partage/fournisseur_ia.ts, plafond par client et par jour.

import { clientClaudeDepuisEnv } from "@partage/fournisseur_ia.ts";
import { journal, messageDe } from "@partage/journal.ts";
import { configSupabaseDepuisEnv } from "@partage/portes.ts";
import { type Contexte, passage } from "./passage.ts";
import { PortesQuestionsRpc } from "./portes_questions.ts";

export function contexteDepuisEnv(env: { get(n: string): string | undefined } = Deno.env): Contexte {
  const supabase = configSupabaseDepuisEnv(env);
  const claude = clientClaudeDepuisEnv(env);
  if (!claude) journal("alerte", "IA non branchée : les questions attendent (IA_NON_BRANCHEE).");
  else journal("info", "IA branchée", { fournisseur: claude.fournisseur, modele: claude.modele });
  return {
    portes: new PortesQuestionsRpc(supabase),
    claude,
    env,
    maintenant: () => new Date(),
    ouvrier: env.get("DALIRO_QUESTIONS_NOM") || "daliro-questions",
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
    journal("erreur", "daliro-questions : passage impossible", { erreur });
    return new Response(JSON.stringify({ erreur }), { status: 200, headers: entetes });
  }
});
