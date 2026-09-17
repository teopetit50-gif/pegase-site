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

import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  /* 17/09 — /site/* sort du matcher : le tunnel de commande de site est
     supprimé (plus aucun compte ne se crée depuis omegaai.fr). */
  matcher: ["/installation", "/auth/:path*"],
};
