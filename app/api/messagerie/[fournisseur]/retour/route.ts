import { SUPABASE_URL } from "@/lib/supabase/config";

/* ══════════════════════════════════════════════════════════════════════
   GET /api/messagerie/{google|microsoft}/retour — le renvoi OAuth (06/10/2026)

   Quand un client connecte sa messagerie à Omega, Google ou Microsoft le
   renvoient à une « adresse de retour » déclarée dans l'application
   OAuth. En production, Google exige qu'elle soit sur un domaine qui
   appartient à Omega : omegaai.fr, pas supabase.co (omega/GUIDE-GMAIL.md,
   § « Passer en production »).

   Cette route ne fait que transmettre : elle renvoie (302) le navigateur
   vers la fonction `messagerie-oauth` d'Omega, qui échange le code, range
   les jetons au Vault et revient vers l'écran. Elle ne lit ni n'écrit
   rien, et ne garde rien. Seuls les paramètres OAuth connus passent, et
   jamais vers une autre adresse que celle de la fonction.

   L'adresse de la fonction : MESSAGERIE_OAUTH_URL si elle est posée sur
   Vercel (pour viser la recette), sinon celle de l'armoire du site
   (lib/supabase/config.ts). Côté fonction, MESSAGERIE_RETOUR_BASE doit
   valoir https://omegaai.fr/api/messagerie, pour que l'échange du code se
   fasse avec la même adresse de retour que le consentement.
   ══════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

const FOURNISSEURS = new Set(["google", "microsoft"]);
const PARAMETRES = ["code", "state", "error", "error_description", "error_uri", "scope", "session_state"];

const SANS_CACHE = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

export async function GET(req: Request, { params }: { params: Promise<{ fournisseur: string }> }) {
  const { fournisseur } = await params;
  if (!FOURNISSEURS.has(fournisseur)) {
    return new Response("Page introuvable", { status: 404, headers: SANS_CACHE });
  }
  const base = (process.env.MESSAGERIE_OAUTH_URL || `${SUPABASE_URL}/functions/v1/messagerie-oauth`).replace(/\/+$/, "");
  const source = new URL(req.url).searchParams;
  const cible = new URL(`${base}/${fournisseur}/retour`);
  for (const nom of PARAMETRES) {
    const valeur = source.get(nom);
    if (valeur !== null) cible.searchParams.set(nom, valeur.slice(0, 4000));
  }
  return new Response(null, { status: 302, headers: { ...SANS_CACHE, Location: cible.toString() } });
}
