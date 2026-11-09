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
import { PORTAIL_DEPLOIEMENT, TEMOIN_PORTAIL, dansLePortail, lirePortail } from "@/components/espace2/portail";

const ANCIEN = "espace_ancien";

/* 06/10/2026, bascule accordée par Teo (coordinateur) : les écrans qui
   n'existent pas encore dans /espace2 restent sur l'ancien design, sans
   redirection, jusqu'à ce que C1 les reprenne. Retirer une entrée d'ici
   quand app/espace2/<écran> existe. Le soir même, C1 a repris cashd,
   offload et demandes : la liste est vide, gardée pour le prochain module
   (un nom de premier niveau sous /espace, ex. "nouveau-module"). */
const PAS_ENCORE_DANS_ESPACE2: string[] = [];
const pasEncore = (chemin: string) => PAS_ENCORE_DANS_ESPACE2.some((e) => chemin === `/espace/${e}` || chemin.startsWith(`/espace/${e}/`));

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/espace" || pathname.startsWith("/espace/")) {
    const demande = searchParams.get("ancien");
    if (!pasEncore(pathname) && (demande === "0" || (demande !== "1" && !request.cookies.has(ANCIEN)))) {
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
  /* 09/11/2026 — un déploiement dédié à un logiciel (NEXT_PUBLIC_PORTAIL,
     components/espace2/portail.ts) : sa racine ouvre directement l'espace
     de ce logiciel. Sur omegaai.fr la variable n'existe pas : l'accueil
     reste statique, le proxy n'y touche pas. */
  if (pathname === "/") {
    if (!PORTAIL_DEPLOIEMENT) return NextResponse.next();
    const cible = request.nextUrl.clone();
    cible.pathname = `/espace2/${PORTAIL_DEPLOIEMENT}`;
    return NextResponse.redirect(cible, 307);
  }
  /* 05/11/2026 — l'espace « un seul logiciel » (components/espace2/portail.ts) :
     omegaai.fr/daliro (et, depuis le 09/11, /tamila, /lorani, /tiroma,
     /tavaro, /varelo) pose le témoin et ouvre le logiciel ; tant qu'il est
     posé, les pages de /espace2 hors de cet espace renvoient vers lui ;
     /espace2?portail=complet l'efface — sauf sur un déploiement dédié, où
     le portail est imposé. */
  const entree = lirePortail(pathname.replace(/^\//, "").replace(/\/$/, ""));
  if (entree) {
    const cible = request.nextUrl.clone();
    cible.pathname = `/espace2/${entree}`;
    const redirection = NextResponse.redirect(cible, 307);
    redirection.cookies.set(TEMOIN_PORTAIL, entree, { path: "/", maxAge: 365 * 24 * 3600, sameSite: "lax", httpOnly: true, secure: true });
    return redirection;
  }
  if (pathname === "/espace2" || pathname.startsWith("/espace2/")) {
    if (searchParams.get("portail") === "complet" && !PORTAIL_DEPLOIEMENT) {
      const cible = request.nextUrl.clone();
      cible.searchParams.delete("portail");
      const redirection = NextResponse.redirect(cible, 307);
      redirection.cookies.delete({ name: TEMOIN_PORTAIL, path: "/" });
      return redirection;
    }
    const portail = PORTAIL_DEPLOIEMENT ?? lirePortail(request.cookies.get(TEMOIN_PORTAIL)?.value);
    if (portail && !dansLePortail(pathname, portail)) {
      const cible = request.nextUrl.clone();
      cible.pathname = `/espace2/${portail}`;
      cible.search = "";
      return NextResponse.redirect(cible, 307);
    }
  }
  return updateSession(request);
}

export const config = {
  /* 17/09 — /site/* sort du matcher : le tunnel de commande de site est
     supprimé (plus aucun compte ne se crée depuis omegaai.fr). */
  /* 09/10 — /omega (pilotage interne) : la session y est tenue à jour. */
  /* 05/11 — /daliro : l'entrée de l'espace « DALIRO seul » ; 09/11 — les
     cinq autres logiciels, et "/" pour la racine des déploiements dédiés
     (sur omegaai.fr elle passe tout droit, NextResponse.next()). */
  matcher: ["/", "/installation", "/auth/:path*", "/espace/:path*", "/espace2/:path*", "/daliro", "/tamila", "/lorani", "/tiroma", "/tavaro", "/varelo", "/omega", "/omega/:path*"],
};
