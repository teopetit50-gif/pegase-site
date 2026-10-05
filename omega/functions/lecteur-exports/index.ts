// L'ouvrier LECTEUR-EXPORTS d'Omega : fonction Edge Deno appelée chaque minute.
// Elle prend les travaux `releve.lire` déposés par recevoir_releve, lit le
// fichier de l'instantané (CSV ou XLSX) depuis le bucket, reconnaît le jeu et
// ses colonnes par leurs en-têtes, dépose les lignes par paquets et clôt
// l'instantané ; avancer_releves enchaîne vers le moteur du module. Pas d'IA.
// Voir omega/NOTES-A1.md (vague 2).

import { DepotStorage } from "@partage/depot.ts";
import { journal, messageDe } from "@partage/journal.ts";
import { configSupabaseDepuisEnv } from "@partage/portes.ts";
import type { Contexte } from "./lire_export.ts";
import { passage } from "./passage.ts";
import { PortesReleveRpc } from "./portes_releve.ts";

export function contexteDepuisEnv(env: { get(n: string): string | undefined } = Deno.env): Contexte {
  const supabase = configSupabaseDepuisEnv(env);
  const paquet = Number(env.get("EXPORTS_TAILLE_PAQUET") ?? "500");
  return {
    portes: new PortesReleveRpc(supabase),
    depot: new DepotStorage(supabase),
    maintenant: () => new Date(),
    ouvrier: env.get("LECTEUR_EXPORTS_NOM") || "lecteur-exports",
    taillePaquet: Number.isInteger(paquet) && paquet > 0 ? Math.min(paquet, 2000) : 500,
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
    journal("erreur", "lecteur-exports : passage impossible", { erreur });
    return new Response(JSON.stringify({ erreur }), { status: 200, headers: entetes });
  }
});
