import { createHash } from "node:crypto";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { adresseIp, appelPorte, limiteDepassee, lireJson, origineRefusee } from "@/lib/securite";

/* ══════════════════════════════════════════════════════════════════════
   POST /api/reservation — la réservation SANS compte (27/09/2026)

   Suite de l'audit sécurité du 25/09 (point « agenda saturable »). Avant,
   le navigateur appelait reserver_audit en direct avec la clé publique ;
   n'importe quel script pouvait en faire autant, et le plafond global de
   la fonction (6 demandes sans compte par heure, 20 par jour) devenait une
   arme : vingt appels, et plus personne ne réservait de la journée.

   Ici la demande passe par le serveur, qui connaît l'adresse IP réelle
   (Vercel réécrit x-forwarded-for) et en transmet l'empreinte, par la
   porte « routes-site » (appelPorte, lib/securite.ts), à
   reserver_audit_serveur : au plus 2 demandes par heure et 3 par jour et
   par adresse. Atteindre le plafond global demande alors de nombreuses
   adresses. L'en-tête x-omega-voie dit par où la demande est passée.

   L'installation (parcours « reglage ») ne passe pas ici : elle part avec
   la session du compte, en direct, et la base la rattache à auth.uid().

   Porte injoignable ou jeton refusé : l'appel d'avant, qui ne passe plus
   que tant que la base l'accepte.
   ══════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

/* les seuls champs que la fonction SQL connaît : tout le reste est jeté */
const CHAMPS = new Set([
  "p_parcours",
  "p_formule",
  "p_profil",
  "p_nom",
  "p_prenom",
  "p_email",
  "p_entreprise",
  "p_secteur",
  "p_telephone",
  "p_commune",
  "p_message",
  "p_creneau_debut",
  "p_modules",
  "p_periodicite",
  "p_pieces",
]);

function appel(fonction: string, corps: Record<string, unknown>): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/${fonction}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(corps),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
}

function refus(erreur: string, status: number) {
  return Response.json({ ok: false, erreur }, { status });
}

export async function POST(req: Request) {
  if (origineRefusee(req)) return refus("origine", 403);
  /* mémoire de l'instance, en plus de la limite comptée en base */
  if (limiteDepassee("reservation", req, 10, 10 * 60_000, 300)) return refus("agenda_sature", 429);
  const brut = await lireJson(req, 32_000);
  if (!brut || typeof brut !== "object" || Array.isArray(brut)) return refus("champs_invalides", 400);
  const corps: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(brut)) if (CHAMPS.has(k)) corps[k] = v;
  if (corps.p_parcours === "reglage") return refus("connexion_requise", 400);

  const empreinte = createHash("sha256").update(adresseIp(req)).digest("hex").slice(0, 32);
  try {
    const porte = await appelPorte(req, "reserver", { ip: empreinte, corps });
    if (porte?.ok) return Response.json(await porte.json(), { headers: { "x-omega-voie": "porte" } });
    if (porte?.status === 400) return refus("champs_invalides", 400);
    if (porte) console.error(`[securite] porte routes-site, réservation : HTTP ${porte.status}`);
    const r = await appel("reserver_audit", corps);
    if (!r.ok) return refus(r.status === 400 ? "champs_invalides" : "reseau", 502);
    return Response.json(await r.json(), { headers: { "x-omega-voie": "direct" } });
  } catch {
    return refus("reseau", 502);
  }
}
