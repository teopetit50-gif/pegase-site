/* ══════════════════════════════════════════════════════════════════════
   Client Supabase SERVEUR (02/09/2026)

   Pour les Server Components, les Route Handlers et les Server Functions.
   Un client NEUF par requête — jamais partagé — qui lit la session dans
   les cookies de la requête (cookies() est asynchrone en Next 16).

   setAll : un Server Component ne peut pas écrire de cookie (la réponse
   est déjà en cours) — l'appel lève, on l'avale. Ce n'est pas grave : le
   rafraîchissement du jeton est fait EN AMONT par proxy.ts (updateSession)
   sur toutes les routes qui portent une session. Depuis un Route Handler
   (/auth/confirm, /auth/signout), l'écriture passe.

   utilisateurCourant() : l'identité VÉRIFIÉE (signature du JWT via
   getClaims), ou null. C'est la seule façon de lire « qui est là » côté
   serveur — getSession() ne vérifie rien et ne doit pas être cru.
   ══════════════════════════════════════════════════════════════════════ */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";
import { utilisateurDepuis, type Utilisateur } from "@/lib/compte";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(aPoser) {
        try {
          aPoser.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* appelé depuis un Server Component : proxy.ts s'en charge */
        }
      },
    },
  });
}

export async function utilisateurCourant(): Promise<Utilisateur | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return utilisateurDepuis({
    id: claims.sub,
    email: claims.email,
    user_metadata: claims.user_metadata,
  });
}
