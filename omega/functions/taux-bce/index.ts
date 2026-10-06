// L'ouvrier TAUX-BCE d'Omega : fonction Edge Deno appelée chaque jour ouvré après
// 16 h (heure de Francfort). Elle lit le flux public des taux de référence de la
// BCE et les pose dans public.filed_taux_change par les portes du lot b7_07.
// Voir omega/NOTES-B7.md, section 15.

import { journal, messageDe } from "@partage/journal.ts";
import { configSupabaseDepuisEnv } from "@partage/portes.ts";
import { SourceBceHttp } from "./bce.ts";
import { passage } from "./passage.ts";
import { PortesTauxRpc } from "./portes.ts";

Deno.serve(async (req: Request) => {
  const entetes = { "Content-Type": "application/json; charset=utf-8" };
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ erreur: "méthode non permise" }), { status: 405, headers: entetes });
  }
  try {
    const bilan = await passage({ portes: new PortesTauxRpc(configSupabaseDepuisEnv()), source: new SourceBceHttp(), maintenant: () => new Date() });
    return new Response(JSON.stringify(bilan), { status: 200, headers: entetes });
  } catch (e) {
    const erreur = messageDe(e);
    journal("erreur", "taux-bce : passage impossible", { erreur });
    return new Response(JSON.stringify({ erreur }), { status: 200, headers: entetes });
  }
});
