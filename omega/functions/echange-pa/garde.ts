// Réglages fixes de la recette : echange-pa y parle au faux serveur pa-bac-a-sable, avec ses
// identifiants publics (omega/functions/pa-bac-a-sable/garde.ts, mêmes valeurs, vérifié par test).
// Garde dure : seulement si SUPABASE_URL est celle du projet de recette.

import type { ConfigurationAfnor } from "./afnor.ts";

export const PROJET_RECETTE = "ygwbgpowzlbdaajlsqkn";

export function estRecette(url: string | undefined | null): boolean {
  try {
    return new URL(url ?? "").hostname === `${PROJET_RECETTE}.supabase.co`;
  } catch {
    return false;
  }
}

/** La PA du bac à sable de la recette, ou null hors recette. */
export function configurationBacRecette(
  url: string | undefined | null,
): ConfigurationAfnor | null {
  if (!estRecette(url)) return null;
  const base =
    `https://${PROJET_RECETTE}.supabase.co/functions/v1/pa-bac-a-sable`;
  return {
    racine: `${base}/flow/v1`,
    jetonUrl: `${base}/oauth/token`,
    clientId: "bac-recette",
    clientSecret: "bac-recette-pas-un-secret",
    scope: null,
  };
}
