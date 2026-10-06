// Réglages fixes de la recette et leur garde. Rien n'y est secret : le bac à sable n'est pas
// une PA. Les mêmes valeurs sont dans omega/functions/echange-pa/garde.ts (vérifié par test).

export const PROJET_RECETTE = "ygwbgpowzlbdaajlsqkn";
export const REGLAGES_RECETTE = {
  clientId: "bac-recette",
  clientSecret: "bac-recette-pas-un-secret",
  cleJetons: "bac-recette-jetons",
};

/** Vrai seulement si l'URL désigne le projet de recette (hôte exact). */
export function estRecette(url: string | undefined | null): boolean {
  try {
    return new URL(url ?? "").hostname === `${PROJET_RECETTE}.supabase.co`;
  } catch {
    return false;
  }
}
