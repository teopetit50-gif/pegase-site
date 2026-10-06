// Fonction Edge `pa-bac-a-sable` (verify_jwt false : elle fait son propre OAuth2). Faux
// serveur AFNOR XP Z12-013 pour jouer l'ouvrier echange-pa de bout en bout sur la recette,
// sans compte chez une PA. Jamais en production. Voir serveur.ts.
// Secrets : PA_BAC_CLIENT_ID, PA_BAC_CLIENT_SECRET, PA_BAC_CLE_JETONS. Absents : 503.
// Flux gardés dans le bucket omega-clients sous `_pa/bac-a-sable/`.

import { depotBucket } from "./depot.ts";
import { creerBacASable } from "./serveur.ts";

const lire = (n: string) => Deno.env.get(n)?.trim() || null;
const clientId = lire("PA_BAC_CLIENT_ID");
const clientSecret = lire("PA_BAC_CLIENT_SECRET");
const cleJetons = lire("PA_BAC_CLE_JETONS");

const servir = clientId && clientSecret && cleJetons
  ? creerBacASable({
    depot: depotBucket(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    ),
    clientId,
    clientSecret,
    cleJetons,
  })
  : null;

Deno.serve((req: Request) =>
  servir ? servir(req) : Promise.resolve(
    Response.json({
      errorCode: "NOT_CONFIGURED",
      errorMessage: "bac à sable non configuré",
    }, { status: 503 }),
  )
);
