// Fonction Edge `depot` (verify_jwt false : l'authentification est celle du dépôt, Basic en HTTPS). Voir webdav.ts.
// Adresse à donner au cabinet : https://<projet>.supabase.co/functions/v1/depot/

import { creerDepot } from "./webdav.ts";
import { portesDepuisEnvironnement } from "./portes.ts";
import { stockageSupabase } from "../reception/commun.ts";

const servir = creerDepot({
  portes: portesDepuisEnvironnement(),
  stockage: stockageSupabase(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  ),
  base: Deno.env.get("DEPOT_BASE_CHEMIN")?.trim() || "/functions/v1/depot",
  journal: {
    info: (m, d) => console.log(`[depot] ${m}`, d ? JSON.stringify(d) : ""),
    erreur: (m, d) => console.error(`[depot] ${m}`, d ? JSON.stringify(d) : ""),
  },
});

Deno.serve(servir);
