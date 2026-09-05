import { NextResponse, type NextRequest } from "next/server";
import { createClient, utilisateurCourant } from "@/lib/supabase/server";
import { COCKPIT_URL } from "@/lib/supabase/config";
import { creerLienCockpit } from "@/lib/cockpit";

/* ══════════════════════════════════════════════════════════════════════
   /compte/cockpit — « Ouvrir mon cockpit » (05/09/2026)

   Le client connecté clique : on vérifie son identité (JWT vérifié), on
   lit SON rattachement dans `comptes` (RLS : il ne voit que le sien), on
   signe un lien de passage de quelques minutes et on l'envoie sur la porte
   d'entrée du cockpit, qui l'échange contre sa session de 30 jours.

   Sans session → /connexion, puis retour ici. Sans rattachement → /compte
   (la carte y explique que le cockpit s'ouvre après l'installation). Sans
   secret configuré côté site → on retombe sur l'ancien comportement
   (/espace nu) plutôt que de casser le bouton.

   Route sous /compte : le proxy y rafraîchit la session Supabase avant
   nous. GET volontaire : c'est un lien, pas une action qui écrit.
   ══════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) {
    return NextResponse.redirect(new URL("/connexion?suite=%2Fcompte%2Fcockpit", request.url));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comptes")
    .select("client_id, cree_le")
    .order("cree_le", { ascending: false })
    .limit(1);

  const clientId = !error ? data?.[0]?.client_id : undefined;
  if (!clientId) {
    return NextResponse.redirect(new URL("/compte", request.url));
  }

  const jeton = creerLienCockpit(String(clientId));
  if (!jeton) {
    return NextResponse.redirect(`${COCKPIT_URL}/espace`);
  }
  return NextResponse.redirect(`${COCKPIT_URL}/espace/entrer?jeton=${encodeURIComponent(jeton)}`);
}
