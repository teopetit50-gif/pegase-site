// Fonction Edge `pa-bac-a-sable` (verify_jwt false : elle fait son propre OAuth2). Faux
// serveur AFNOR XP Z12-013 pour jouer l'ouvrier echange-pa de bout en bout sur la recette,
// sans compte chez une PA. Jamais en production. Voir serveur.ts.
// Réglages par les secrets PA_BAC_CLIENT_ID, PA_BAC_CLIENT_SECRET, PA_BAC_CLE_JETONS
// (absents : 503). Sur la recette, recette.ts fixe ces réglages sans secret.
// Flux gardés dans le bucket omega-clients sous `_pa/bac-a-sable/`.

import { servirBac } from "./edge.ts";

const lire = (n: string) => Deno.env.get(n)?.trim() || null;
const clientId = lire("PA_BAC_CLIENT_ID");
const clientSecret = lire("PA_BAC_CLIENT_SECRET");
const cleJetons = lire("PA_BAC_CLE_JETONS");

servirBac(
  clientId && clientSecret && cleJetons
    ? { clientId, clientSecret, cleJetons }
    : null,
);
