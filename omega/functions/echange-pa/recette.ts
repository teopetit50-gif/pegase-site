// Entrée de recette d'`echange-pa` : la PA est le faux serveur pa-bac-a-sable de la recette,
// identifiants fixes (garde.ts), sans secret Edge. Des secrets PA_* posés l'emportent (vraie PA).
// Hors du projet de recette : aucune PA (travaux reportés), jamais le bac à sable.
// Coquille de déploiement : importer ce fichier.

import { configurationAfnorDepuisEnvironnement } from "./afnor.ts";
import { servirOuvrier } from "./edge.ts";
import { configurationBacRecette } from "./garde.ts";

const secrets = configurationAfnorDepuisEnvironnement();
const bac = configurationBacRecette(Deno.env.get("SUPABASE_URL"));
servirOuvrier(
  secrets ?? bac,
  secrets ? "secrets" : bac ? "bac-a-sable-recette" : "aucune",
);
