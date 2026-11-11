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

   11/11/2026 (soir) — SUR /espace2/teo, UNE DEUXIÈME SESSION : celle de
   Teo sur le tableau des associés (lib/teo/tableau.ts, projet Supabase 1),
   dans son propre cookie (sb-<ref du projet 1>-auth-token). Même geste,
   même règle, seulement si le cookie est là. Les cookies réécrits par l'un
   et l'autre s'additionnent sur la réponse : chaque setAll les reporte
   tous, jamais l'un n'efface ceux de l'autre.
   ══════════════════════════════════════════════════════════════════════ */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";
import { TABLEAU_CLE, TABLEAU_COOKIE, TABLEAU_URL } from "@/lib/teo/tableau-config";

type Cookie = { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] };

export async function updateSession(request: NextRequest) {
  let reponse = NextResponse.next({ request });
  const poses: Cookie[] = [];
  const cookies = {
    getAll() {
      return request.cookies.getAll();
    },
    setAll(aPoser: Cookie[]) {
      aPoser.forEach(({ name, value }) => request.cookies.set(name, value));
      poses.push(...aPoser);
      reponse = NextResponse.next({ request });
      poses.forEach(({ name, value, options }) => reponse.cookies.set(name, value, options));
    },
  };

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, { cookies });

  /* La règle Supabase : rien entre la création du client et getClaims().
     C'est lui qui rafraîchit le jeton ; on jette sa valeur de retour, plus
     personne n'en décide ici depuis que la garde /compte est partie. */
  await supabase.auth.getClaims();

  const chemin = request.nextUrl.pathname;
  if ((chemin === "/espace2/teo" || chemin.startsWith("/espace2/teo/")) && request.cookies.getAll().some((c) => c.name.startsWith(TABLEAU_COOKIE))) {
    const tableau = createServerClient(TABLEAU_URL, TABLEAU_CLE, { cookies });
    await tableau.auth.getClaims();
  }

  return reponse;
}
