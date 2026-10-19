import "server-only";
import { createClient } from "@/lib/supabase/server";

/* Le premier passage est-il encore à faire ? (07/10/2026)

   Vrai seulement pour une session VÉRIFIÉE (getClaims) dont le compte n'a
   pas user_metadata.bienvenue_faite. Un visiteur sans session répond faux :
   il continue de voir l'exemple de /espace2, comme avant. Lu par le
   gabarit de /espace2 (qui redirige) et par /bienvenue (qui laisse passer
   ceux qui l'ont déjà fait). */
export async function bienvenueAFaire(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!claims?.sub) return false;
    const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
    return meta.bienvenue_faite !== true;
  } catch {
    return false;
  }
}
