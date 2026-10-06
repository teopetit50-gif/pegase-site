// Les portes de l'ouvrier taux-bce (lot b7_07), par la fonction rpc() du socle partagé.
// Jamais de lecture ni d'écriture directe dans une table.

import { type ConfigSupabase, rpc } from "@partage/portes.ts";
import type { Taux } from "./bce.ts";

export interface EtatTaux {
  dernier_jour: string | null;
  devises: number;
  dernier_passage: string | null;
}

export interface BilanLot {
  recus: number;
  poses: number;
  inchanges: number;
  saisies_gardees: number;
  refuses: number;
}

export interface PortesTaux {
  /** taux_bce_etat : d'où repartir. */
  etat(): Promise<EtatTaux>;
  /** taux_bce_poser_lot : un lot en un appel ; un taux identique n'est pas réécrit. */
  poserLot(taux: Taux[]): Promise<BilanLot>;
  /** taux_bce_noter_passage : le battement, et l'alerte interne s'il y en a une. */
  noterPassage(detail: Record<string, unknown>, alerte: string | null): Promise<number>;
}

export class PortesTauxRpc implements PortesTaux {
  constructor(private readonly cfg: ConfigSupabase, private readonly fetchFn: typeof fetch = fetch) {}

  async etat(): Promise<EtatTaux> {
    const e = await rpc<Partial<EtatTaux> | null>(this.cfg, this.fetchFn, "taux_bce_etat", {});
    return { dernier_jour: e?.dernier_jour ?? null, devises: Number(e?.devises ?? 0), dernier_passage: e?.dernier_passage ?? null };
  }

  async poserLot(taux: Taux[]): Promise<BilanLot> {
    const b = await rpc<Partial<BilanLot> | null>(this.cfg, this.fetchFn, "taux_bce_poser_lot", { p_taux: taux });
    return {
      recus: Number(b?.recus ?? 0),
      poses: Number(b?.poses ?? 0),
      inchanges: Number(b?.inchanges ?? 0),
      saisies_gardees: Number(b?.saisies_gardees ?? 0),
      refuses: Number(b?.refuses ?? 0),
    };
  }

  async noterPassage(detail: Record<string, unknown>, alerte: string | null): Promise<number> {
    return Number(await rpc<number | null>(this.cfg, this.fetchFn, "taux_bce_noter_passage", { p_detail: detail, p_alerte: alerte }) ?? 0);
  }
}
