/* ══════════════════════════════════════════════════════════════════════
   updateSession — le rafraîchissement de session côté proxy (02/09/2026)

   Appelé par proxy.ts (racine) sur les SEULES routes qui portent une
   session : /compte, /connexion, /installation, /auth. Le reste du site
   reste statique et ne voit jamais ce code.

   Ce qu'il fait, dans l'ordre :
   1. lit les cookies de session de la requête ;
   2. getClaims() — vérifie le jeton et le RAFRAÎCHIT s'il a expiré ; le
      nouveau jeton est réécrit à la fois sur la requête (pour le rendu qui
      suit) et sur la réponse (pour le navigateur) via setAll ;
   3. /compte sans session → redirection vers /connexion?suite=/compte…
      (la page refait le contrôle de son côté : le proxy est un raccourci,
      pas la garantie).

   Règle Supabase à ne pas contourner : pas de logique entre la création
   du client et getClaims(), et TOUJOURS renvoyer l'objet réponse qui
   porte les cookies — sinon la session se coupe au hasard.
   ══════════════════════════════════════════════════════════════════════ */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";
import { suiteSure } from "@/lib/compte";

export async function updateSession(request: NextRequest) {
  let reponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(aPoser) {
        aPoser.forEach(({ name, value }) => request.cookies.set(name, value));
        reponse = NextResponse.next({ request });
        aPoser.forEach(({ name, value, options }) => reponse.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const connecte = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  if (!connecte && pathname.startsWith("/compte")) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = "";
    url.searchParams.set("suite", suiteSure(pathname + search));
    return avecCookies(NextResponse.redirect(url), reponse);
  }

  return reponse;
}

/* Une redirection remplace la réponse construite plus haut : on lui
   recopie les cookies (un jeton rafraîchi, typiquement) pour ne pas les
   perdre en route. */
function avecCookies(cible: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((c) => cible.cookies.set(c));
  return cible;
}
