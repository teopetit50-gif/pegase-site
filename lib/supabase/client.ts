/* ══════════════════════════════════════════════════════════════════════
   Client Supabase NAVIGATEUR (02/09/2026)

   Pour les composants « use client » : la connexion par code (ConnexionInline),
   l'icône compte du header, le jeton envoyé avec une réservation
   d'installation. createBrowserClient garde la session dans des COOKIES
   (pas localStorage) : c'est ce qui permet au serveur — proxy.ts, pages
   /compte et /installation — de la voir à la requête suivante.

   Un seul client par onglet : createBrowserClient est déjà un singleton,
   l'appeler plusieurs fois rend la même instance.
   ══════════════════════════════════════════════════════════════════════ */

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
