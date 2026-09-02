import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* ══════════════════════════════════════════════════════════════════════
   /auth/signout — se déconnecter (02/09/2026)

   POST uniquement (un <form method="post"> dans « Mon dossier ») : une
   déconnexion ne doit jamais se déclencher par un simple lien suivi par
   un robot ou une pré-lecture du navigateur. signOut efface les cookies
   de session — possible ici parce qu'un Route Handler écrit la réponse —
   puis retour à l'accueil en 303 (POST → GET).
   ══════════════════════════════════════════════════════════════════════ */

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
