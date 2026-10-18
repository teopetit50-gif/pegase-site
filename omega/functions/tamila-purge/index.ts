// L'ouvrier TAMILA-PURGE d'Omega : fonction Edge Deno appelée par le planificateur (toutes les 5 minutes). Il efface
// au bucket la copie en clair d'un avis RPVA reçu par courriel (b4_10), les fichiers d'un dossier à l'échéance de son
// effacement (b4_11), les archives échues, et fait détruire la clé d'un dossier effacé (passage.ts).
// Fournis par Supabase : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Voir omega/NOTES-B4.md § 15 et 16.

import { passage } from "./passage.ts";
import { PortesRpc } from "./portes.ts";
import { StockageSupabase } from "./stockage.ts";

Deno.serve(async () => {
  const entetes = { "Content-Type": "application/json; charset=utf-8" };
  const url = Deno.env.get("SUPABASE_URL");
  const cle = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !cle) return new Response(JSON.stringify({ erreur: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absente" }), { status: 200, headers: entetes });
  try {
    const bilan = await passage(
      new PortesRpc(url, cle),
      new StockageSupabase(url, cle),
      (m, d) => console.log(JSON.stringify({ ouvrier: "tamila-purge", m, ...d })),
    );
    return new Response(JSON.stringify(bilan), { status: 200, headers: entetes });
  } catch (e) {
    return new Response(JSON.stringify({ erreur: (e as Error).message }), { status: 200, headers: entetes });
  }
});
