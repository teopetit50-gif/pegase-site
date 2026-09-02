import { NextResponse, type NextRequest } from "next/server";
import { suiteSure } from "@/lib/compte";
import { createClient } from "@/lib/supabase/server";

/* ══════════════════════════════════════════════════════════════════════
   /auth/confirm — l'échange d'un LIEN de connexion (02/09/2026)

   Le parcours normal n'en a pas besoin : le code à six chiffres se
   vérifie dans la page, sans redirection. Cette route est le REPLI pour
   un e-mail qui porte un lien — modèle Supabase pas encore passé à
   {{ .Token }}, ou lien d'invitation/changement d'adresse :
     /auth/confirm?token_hash=…&type=email&next=/compte

   verifyOtp({ token_hash, type }) ouvre la session et l'écrit dans les
   cookies (un Route Handler peut le faire, contrairement à un Server
   Component), puis on renvoie vers `next` — filtré, jamais externe. En
   cas d'échec : /connexion?erreur=lien, où le code reste possible.

   Pour que Supabase envoie ici, Teo doit ajouter l'URL du site (et
   http://localhost:3000 en local) aux « Redirect URLs » de Auth.
   ══════════════════════════════════════════════════════════════════════ */

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const suite = suiteSure(searchParams.get("next"));

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      /* les types acceptés par Supabase pour un lien e-mail ; tout autre
         mot tombe sur `email`, le cas courant */
      type: ["email", "magiclink", "signup", "invite", "recovery", "email_change"].includes(type)
        ? (type as "email" | "magiclink" | "signup" | "invite" | "recovery" | "email_change")
        : "email",
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(suite, request.url), { status: 303 });
    }
  }

  const retour = new URL("/connexion", request.url);
  retour.searchParams.set("erreur", "lien");
  if (suite !== "/compte") retour.searchParams.set("suite", suite);
  return NextResponse.redirect(retour, { status: 303 });
}
