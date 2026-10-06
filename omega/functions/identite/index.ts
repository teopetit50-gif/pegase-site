// L'ouvrier IDENTITÉ d'Omega : fonction Edge Deno appelée chaque minute. Elle
// prend les travaux `identite.verifier`, confirme un SIREN auprès de Sirene
// (INSEE) ou un numéro de TVA auprès de VIES (et, dès que la base admet ces registres,
// une IDE suisse auprès du registre IDE et une TVA GB auprès de HMRC), vérifie la cohérence SIREN ↔ TVA,
// mémorise la réponse trente jours, et rend tout au socle par les portes du lot
// b7_01. Voir omega/NOTES-B7.md.

import { journal, messageDe } from "@partage/journal.ts";
import { configSupabaseDepuisEnv } from "@partage/portes.ts";
import { optionsDepuisEnv, passage } from "./passage.ts";
import { hmrcDepuisEnv } from "./hmrc.ts";
import { PortesIdentiteRpc } from "./portes.ts";
import { sireneDepuisEnv } from "./sirene.ts";
import { CACHE_JOURS_PAR_DEFAUT, type Contexte } from "./verifier.ts";
import { UidChSoap } from "./uid_ch.ts";
import { ViesRest } from "./vies.ts";

export function contexteDepuisEnv(env: { get(n: string): string | undefined } = Deno.env): Contexte {
  const supabase = configSupabaseDepuisEnv(env);
  const sirene = sireneDepuisEnv(env);
  if (sirene.nom === "repli") {
    journal("alerte", "SIRENE_API_KEY absente : les SIREN sont vérifiés par l'annuaire des entreprises (repli sans garantie).");
  } else if (sirene.nom === "aucun") {
    journal("alerte", "Aucun registre Sirene : SIRENE_API_KEY absente et repli coupé (SIRENE_REPLI=non). Les SIREN seront reportés.");
  } else {
    journal("info", "Sirene branché", { registre: sirene.nom });
  }
  const hmrc = hmrcDepuisEnv(env);
  const cache = Number(env.get("IDENTITE_CACHE_JOURS") ?? "");
  return {
    portes: new PortesIdentiteRpc(supabase),
    sirene,
    vies: new ViesRest(),
    uidCh: new UidChSoap(),
    hmrc,
    env,
    maintenant: () => new Date(),
    ouvrier: env.get("IDENTITE_NOM") || "identite",
    cacheJours: Number.isFinite(cache) && cache >= 0 ? cache : CACHE_JOURS_PAR_DEFAUT,
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
    const bilan = await passage(ctx, { ...optionsDepuisEnv(ctx.env), ...(Number.isInteger(nombre) && nombre > 0 ? { nombre: Math.min(nombre, 20) } : {}) });
    return new Response(JSON.stringify(bilan), { status: 200, headers: entetes });
  } catch (e) {
    // Même une panne de configuration répond proprement : le planificateur verra le motif.
    const erreur = messageDe(e);
    journal("erreur", "identite : passage impossible", { erreur });
    return new Response(JSON.stringify({ erreur }), { status: 200, headers: entetes });
  }
});
