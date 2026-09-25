import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/* ══════════════════════════════════════════════════════════════════════
   GET /api/sante — la sonde de disponibilité du site (25/09/2026)

   Audit sécurité du 25/09 : aucune alerte n'existait. Une panne de la base
   (réservation d'audit impossible) ne se découvrait que par un prospect.
   Un service de surveillance gratuit (UptimeRobot, Better Stack…) appelle
   cette adresse toutes les cinq minutes et prévient par e-mail ou SMS
   quand elle ne répond plus 200.

   Ce qu'elle vérifie : que le site répond ET que la base répond, en
   posant la même question que la page de réservation (agenda_public sur
   la journée : quelques centaines d'octets). 200 si tout va bien, 503 si
   la base ne répond pas en 8 secondes. Aucun détail interne dans la
   réponse, jamais mise en cache.

   Effet de bord utile tant que la base est en offre gratuite : un appel
   toutes les cinq minutes empêche sa mise en pause après sept jours sans
   activité.
   ══════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

export async function GET() {
  const debut = Date.now();
  const jour = new Date().toISOString().slice(0, 10);
  let base = false;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/agenda_public`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_depuis: jour, p_jusqua: jour }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    base = r.ok;
  } catch {
    base = false;
  }
  return Response.json(
    { ok: base, site: "ok", base: base ? "ok" : "injoignable", duree_ms: Date.now() - debut },
    { status: base ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
