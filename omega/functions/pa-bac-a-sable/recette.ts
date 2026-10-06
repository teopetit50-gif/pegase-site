// Entrée de recette de `pa-bac-a-sable` : réglages FIXES (garde.ts), sans secret Edge à poser.
// Garde dure : ils ne valent que si SUPABASE_URL est celle du projet de recette ; ailleurs la
// fonction répond 503 et ne sert rien. Coquille de déploiement : importer ce fichier.

import { servirBac } from "./edge.ts";
import { estRecette, PROJET_RECETTE, REGLAGES_RECETTE } from "./garde.ts";

const recette = estRecette(Deno.env.get("SUPABASE_URL"));
servirBac(
  recette ? REGLAGES_RECETTE : null,
  recette
    ? undefined
    : `réglages fixes refusés : ce projet n'est pas la recette (${PROJET_RECETTE})`,
);
