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
   ══════════════════════════════════════════════════════════════════════ */

import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/compte/:path*", "/connexion", "/installation", "/auth/:path*"],
};
