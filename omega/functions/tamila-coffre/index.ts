// L'ouvrier TAMILA-COFFRE d'Omega : fonction Edge Deno (verify_jwt true). Il déballe les clés de dossier
// Tamila sous la clé maître Scaleway d'un cabinet, pour le lecteur (clé de service, action cle_piece) et
// pour un membre habilité (son jeton, action cle_dossier) ; il émet les clés des nouveaux dossiers et
// ré-enveloppe les clés locales. Les droits sont ceux des portes de b4_05. Voir omega/NOTES-B4.md § 10.
//
// Secrets : SCALEWAY_SECRET_KEY, SCALEWAY_PROJECT_ID, SCALEWAY_REGION (fr-par par défaut) ; facultatif :
// TAMILA_COFFRE_ORIGINES. Fournis par Supabase : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY.

import type { Contexte } from "./coffre.ts";
import { ORIGINES_PAR_DEFAUT, type ReglagesHttp, repondre } from "./http.ts";
import { keyManagerDepuisEnv } from "./keymanager.ts";
import { PortesCoffreRpc } from "./portes.ts";

function journal(niveau: "info" | "alerte" | "erreur", message: string, detail: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ ouvrier: "tamila-coffre", niveau, message, ...detail, le: new Date().toISOString() }));
}

function demarrer(): { ctx: Contexte; reglages: ReglagesHttp } {
  const url = Deno.env.get("SUPABASE_URL");
  const cleService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const clePublique = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !cleService || !clePublique) throw new Error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_ANON_KEY absente");
  const km = keyManagerDepuisEnv(Deno.env);
  if (!km) journal("alerte", "SCALEWAY_SECRET_KEY / SCALEWAY_PROJECT_ID absentes : le coffre répond 503 (KM_ABSENT) à tout déballage");
  const origines = (Deno.env.get("TAMILA_COFFRE_ORIGINES") ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  return {
    ctx: { portes: new PortesCoffreRpc({ url, cleService, clePublique }), km, journal },
    reglages: { cleService, origines: origines.length ? origines : ORIGINES_PAR_DEFAUT },
  };
}

const { ctx, reglages } = demarrer();
Deno.serve((req) => repondre(req, ctx, reglages));
