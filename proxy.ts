/* ══════════════════════════════════════════════════════════════════════
   proxy.ts — convention Next 16 (ex-middleware.ts, voir
   node_modules/next/dist/docs/…/proxy.md) — 02/09/2026

   Une seule mission : tenir la session Supabase à jour (updateSession)
   sur les routes qui en ont une. Le matcher est volontairement RESTREINT :
   tout le reste du site — accueil, offres, tarifs, blog, l'audit et son
   calendrier — reste statique, sans cookie lu, sans proxy exécuté.

   /installation est dans la liste parce que c'est le parcours verrouillé
   (« connectez-vous pour réserver votre installation ») ; /reserver n'y
   est PAS : l'audit reste libre, décision Teo du 02/09.
   /site/* (02/09, même jour) : le tunnel de commande de site — un achat,
   donc un compte ; la page lit la session côté serveur et le jeton doit
   être à jour quand le brief part.

   15/09/2026 — /compte ET /connexion SORTENT DU MATCHER. Teo : « plus
   rien sur le site ne doit renvoyer à une page de connexion ». /connexion
   n'existe plus ; /compte n'est qu'une redirection vers app.omegaai.fr, et
   la garder derrière la session la faisait passer par /connexion — donc
   exactement ce qui devait disparaître. Le cockpit tient sa propre porte.
   ══════════════════════════════════════════════════════════════════════ */

/* 05/10/2026 — /espace/* ENTRE dans le matcher. Les écrans client
   (/espace/validations, /espace/filed, /espace/point) lisent la session côté
   serveur (utilisateurCourant) et signent les pièces avec elle
   (app/espace/filed/actions.ts) : le jeton doit être à jour quand la page
   se rend. Ils ne renvoient vers aucune page de connexion — sans session,
   ils montrent l'exemple. Décision du coordinateur, lot 19. */

/* BASCULE vers le nouvel espace client (préparée le 06/10/2026, session C1 ;
   à fusionner seulement après l'accord de Teo). /espace/* mène désormais au
   nouveau design, /espace2/* (redirection temporaire 307 : l'adresse
   /espace reste celle qu'on donne). L'ancien design reste joignable une
   semaine : /espace/…?ancien=1 l'ouvre et pose le témoin `espace_ancien`
   (7 jours, limité à /espace), qui garde la personne dans l'ancien design
   d'un écran à l'autre ; ?ancien=0 l'efface. /espace2/* entre dans le
   matcher : la session y est tenue à jour comme sur /espace. */

import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const ANCIEN = "espace_ancien";

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/espace" || pathname.startsWith("/espace/")) {
    const demande = searchParams.get("ancien");
    if (demande === "0" || (demande !== "1" && !request.cookies.has(ANCIEN))) {
      const cible = request.nextUrl.clone();
      cible.pathname = pathname.replace(/^\/espace/, "/espace2");
      cible.searchParams.delete("ancien");
      const redirection = NextResponse.redirect(cible, 307);
      if (demande === "0") redirection.cookies.delete({ name: ANCIEN, path: "/espace" });
      return redirection;
    }
    const reponse = await updateSession(request);
    if (demande === "1") reponse.cookies.set(ANCIEN, "1", { path: "/espace", maxAge: 7 * 24 * 3600, sameSite: "lax", httpOnly: true, secure: true });
    return reponse;
  }
  return updateSession(request);
}

export const config = {
  /* 17/09 — /site/* sort du matcher : le tunnel de commande de site est
     supprimé (plus aucun compte ne se crée depuis omegaai.fr). */
  matcher: ["/installation", "/auth/:path*", "/espace/:path*", "/espace2/:path*"],
};
