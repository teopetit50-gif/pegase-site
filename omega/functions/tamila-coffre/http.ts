// La requête HTTP du coffre : qui appelle (le serveur, par la clé de service ; une personne, par son
// jeton), CORS pour l'écran /espace/tamila, et la réponse JSON. Séparé d'index.ts pour être testé.

import { type Appelant, type Contexte, type Demande, traiter } from "./coffre.ts";
import { egaux } from "./octets.ts";

export interface ReglagesHttp {
  cleService: string;
  /** Origines autorisées pour le navigateur (TAMILA_COFFRE_ORIGINES, séparées par des virgules). */
  origines: string[];
}

export const ORIGINES_PAR_DEFAUT = ["https://omegaai.fr", "https://www.omegaai.fr"];

function entetes(origine: string | null, r: ReglagesHttp): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
  if (origine && r.origines.includes(origine)) {
    h["Access-Control-Allow-Origin"] = origine;
    h["Access-Control-Allow-Headers"] = "authorization, apikey, content-type, x-client-info";
    h["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    h["Vary"] = "Origin";
  }
  return h;
}

export function appelantDe(req: Request, r: ReglagesHttp): Appelant | null {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "");
  if (!m) return null;
  const jeton = m[1].trim();
  return egaux(jeton, r.cleService) ? { type: "serveur" } : { type: "personne", jeton };
}

export async function repondre(req: Request, ctx: Contexte, r: ReglagesHttp): Promise<Response> {
  const h = entetes(req.headers.get("origin"), r);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (req.method !== "POST") return new Response(JSON.stringify({ erreur: "METHODE", message: "POST seulement" }), { status: 405, headers: h });
  const appelant = appelantDe(req, r);
  if (!appelant) return new Response(JSON.stringify({ erreur: "NON_AUTHENTIFIE", message: "jeton attendu" }), { status: 401, headers: h });
  let d: Demande;
  try {
    d = await req.json();
  } catch {
    return new Response(JSON.stringify({ erreur: "CORPS_ILLISIBLE", message: "JSON attendu" }), { status: 400, headers: h });
  }
  const rep = await traiter(ctx, appelant, d ?? {});
  return new Response(JSON.stringify(rep.corps), { status: rep.statut, headers: h });
}
