/* ══════════════════════════════════════════════════════════════════════
   updateSession — le rafraîchissement de session côté proxy (02/09/2026)

   Appelé par proxy.ts (racine) sur les SEULES routes qui portent une
   session : /installation, /site/*, /auth. Le reste du site reste
   statique et ne voit jamais ce code.

   Ce qu'il fait, dans l'ordre :
   1. lit les cookies de session de la requête ;
   2. getClaims() — vérifie le jeton et le RAFRAÎCHIT s'il a expiré ; le
      nouveau jeton est réécrit à la fois sur la requête (pour le rendu qui
      suit) et sur la réponse (pour le navigateur) via setAll.

   15/09/2026 — LA TROISIÈME ÉTAPE A DISPARU. Elle renvoyait /compte sans
   session vers /connexion ; les deux routes ont quitté le site (Teo :
   « plus rien sur le site ne doit renvoyer à une page de connexion »).
   Il ne reste donc que le rafraîchissement, pour les parcours qui portent
   encore une session — l'installation et la commande de site.

   Règle Supabase à ne pas contourner : pas de logique entre la création
   du client et getClaims(), et TOUJOURS renvoyer l'objet réponse qui
   porte les cookies — sinon la session se coupe au hasard.
   ══════════════════════════════════════════════════════════════════════ */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

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

  /* La règle Supabase : rien entre la création du client et getClaims().
     C'est lui qui rafraîchit le jeton ; on jette sa valeur de retour, plus
     personne n'en décide ici depuis que la garde /compte est partie. */
  await supabase.auth.getClaims();

  return reponse;
}
