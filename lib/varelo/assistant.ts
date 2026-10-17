/* L'assistant de l'espace, pour un groupe qui a Varelo (B1, 17/10/2026 ; accord de Teo du 17/10).

   La question part à la fonction Edge varelo-assistant (omega/functions/varelo-assistant) avec le jeton de
   la personne : elle vérifie ce jeton auprès de Supabase, lit les données du groupe sous sa session (RLS,
   lecture journalisée), applique le plafond d'IA du jour du client et appelle le modèle du lecteur
   (API Anthropic ou Bedrock, au choix de l'environnement). Rien n'est écrit dans les données du groupe.

   Rend null quand la personne n'a pas Varelo ou que la fonction ne répond pas : l'assistant général
   répond alors comme avant. Le jeton se lit par getSession() pour être transmis, pas pour être cru :
   c'est la fonction Edge qui le vérifie. */

import { createClient } from "@/lib/supabase/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

type Entree = { role: "user" | "assistant"; content: string };

export async function reponseVarelo(messages: Entree[]): Promise<Response | null> {
  const supabase = await createClient();
  const { data: client, error } = await supabase.rpc("grp_assistant_client");
  if (error || !client) return null;
  const { data } = await supabase.auth.getSession();
  const jeton = data.session?.access_token;
  if (!jeton) return null;
  let rep: Response;
  try {
    rep = await fetch(`${SUPABASE_URL}/functions/v1/varelo-assistant`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jeton}`, apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      cache: "no-store",
    });
  } catch {
    return null;
  }
  /* fonction pas encore déployée, ou groupe sans Varelo : l'assistant général prend la main */
  if (rep.status === 404) return null;
  const corps = (await rep.json().catch(() => null)) as { reponse?: string; erreur?: string } | null;
  const texte = corps?.reponse ?? corps?.erreur ?? "L'assistant n'a pas pu répondre. Réessayez.";
  return new Response(texte, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
