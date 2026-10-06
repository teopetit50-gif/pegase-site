// Démarrage de la fonction Edge `pa-bac-a-sable`, réglages donnés par l'appelant :
// index.ts les lit dans les secrets de la fonction, recette.ts les fixe (recette seulement).

import { depotBucket } from "./depot.ts";
import { creerBacASable } from "./serveur.ts";

export type Reglages = {
  clientId: string;
  clientSecret: string;
  cleJetons: string;
};

export function servirBac(reglages: Reglages | null, refus?: string): void {
  const servir = reglages
    ? creerBacASable({
      depot: depotBucket(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      ),
      ...reglages,
    })
    : null;
  Deno.serve((req: Request) =>
    servir ? servir(req) : Promise.resolve(
      Response.json({
        errorCode: "NOT_CONFIGURED",
        errorMessage: refus ?? "bac à sable non configuré",
      }, { status: 503 }),
    )
  );
}
