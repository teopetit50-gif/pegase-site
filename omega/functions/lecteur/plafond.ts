// Le plafond d'IA par client et par jour : réglage `plafond_ia_jour_client`
// dans public.parametres (en euros), sinon la variable d'environnement
// PLAFOND_IA_JOUR_CLIENT_EUR, sinon 5 €. La consommation du jour se lit dans
// les résultats des travaux déjà finis.

import { ErreurOuvrier } from "@partage/erreurs.ts";
import type { Portes } from "@partage/portes.ts";

export const CLE_PLAFOND = "plafond_ia_jour_client";
export const PLAFOND_PAR_DEFAUT_EUR = 5;

export interface EtatPlafond {
  plafond: number;
  consomme: number;
  estimation: number;
  source: "parametres" | "environnement" | "defaut";
}

export async function lirePlafond(portes: Portes, env: { get(n: string): string | undefined }): Promise<Pick<EtatPlafond, "plafond" | "source">> {
  const p = await portes.lireParametre(CLE_PLAFOND);
  const np = p === null ? NaN : Number(String(p).replace(",", "."));
  if (Number.isFinite(np)) return { plafond: np, source: "parametres" };
  const e = env.get("PLAFOND_IA_JOUR_CLIENT_EUR");
  const ne = e === undefined ? NaN : Number(e.replace(",", "."));
  if (Number.isFinite(ne)) return { plafond: ne, source: "environnement" };
  return { plafond: PLAFOND_PAR_DEFAUT_EUR, source: "defaut" };
}

/** Lève PLAFOND_IA (non définitif) si la lecture ferait dépasser le plafond du jour. */
export async function controlerPlafond(
  portes: Portes,
  env: { get(n: string): string | undefined },
  client: string,
  estimation: number,
): Promise<EtatPlafond> {
  const { plafond, source } = await lirePlafond(portes, env);
  const consomme = await portes.consommationIaDuJour(client);
  const etat: EtatPlafond = { plafond, consomme, estimation, source };
  if (plafond <= 0 || consomme + estimation > plafond) {
    throw new ErreurOuvrier(
      "PLAFOND_IA",
      `plafond ${plafond.toFixed(2)} € par jour (${source}) : ${consomme.toFixed(4)} € consommés, ${estimation.toFixed(4)} € estimés pour cette pièce.`,
      true,
    );
  }
  return etat;
}
