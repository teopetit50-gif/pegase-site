// Fonction Edge `widget` (verify_jwt false : le navigateur du visiteur n'a pas de jeton). Voir widget.ts.

import { creerWidget } from "./widget.ts";
import { portesDepuisEnvironnement } from "./portes.ts";

Deno.serve(creerWidget({
  portes: portesDepuisEnvironnement(),
  base: `${
    (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "")
  }/functions/v1/widget`,
  sel: Deno.env.get("WIDGET_SEL")?.trim() || "omega-widget",
  journal: {
    erreur: (m, d) =>
      console.error(`[widget] ${m}`, d ? JSON.stringify(d) : ""),
  },
}));
