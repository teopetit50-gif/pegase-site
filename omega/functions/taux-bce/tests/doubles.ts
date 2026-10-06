// deno-lint-ignore-file require-await
// Les doubles : une table de taux en mémoire qui suit les règles de taux_bce_poser_lot, un flux BCE préparé.

import { lireFluxBce, type SourceBce, type Taux } from "../bce.ts";
import type { ContexteTaux } from "../passage.ts";
import type { BilanLot, EtatTaux, PortesTaux } from "../portes.ts";

export class PortesMemoire implements PortesTaux {
  /** devise|jour → { taux, source } */
  table = new Map<string, { taux: number; source: "bce" | "saisie" }>();
  passages: { detail: Record<string, unknown>; alerte: string | null }[] = [];
  lots: Taux[][] = [];

  async etat(): Promise<EtatTaux> {
    const jours = [...this.table.entries()].filter(([, v]) => v.source === "bce").map(([k]) => k.split("|")[1]).sort();
    const dernier = jours.length > 0 ? jours[jours.length - 1] : null;
    return { dernier_jour: dernier, devises: dernier ? jours.filter((j) => j === dernier).length : 0, dernier_passage: null };
  }

  async poserLot(taux: Taux[]): Promise<BilanLot> {
    this.lots.push(taux);
    const b: BilanLot = { recus: 0, poses: 0, inchanges: 0, saisies_gardees: 0, refuses: 0 };
    for (const t of taux) {
      b.recus++;
      const cle = `${t.devise}|${t.jour}`;
      const v = Number(t.taux);
      const e = this.table.get(cle);
      if (!/^[A-Z]{3}$/.test(t.devise) || t.devise === "EUR" || !(v > 0)) b.refuses++;
      else if (e?.source === "saisie") b.saisies_gardees++;
      else if (e && e.taux === v) b.inchanges++;
      else {
        this.table.set(cle, { taux: v, source: "bce" });
        b.poses++;
      }
    }
    return b;
  }

  async noterPassage(detail: Record<string, unknown>, alerte: string | null): Promise<number> {
    this.passages.push({ detail, alerte });
    return this.passages.length;
  }
}

export class SourceFactice implements SourceBce {
  appels: string[] = [];
  constructor(public flux: Record<string, string | Error>) {}
  async lire(url: string): Promise<Taux[]> {
    this.appels.push(url);
    const f = this.flux[url];
    if (f === undefined) throw new Error(`pas de flux préparé pour ${url}`);
    if (f instanceof Error) throw f;
    return lireFluxBce(f);
  }
}

export function contexte(flux: Record<string, string | Error>, instant: string): { ctx: ContexteTaux; portes: PortesMemoire; source: SourceFactice } {
  const portes = new PortesMemoire();
  const source = new SourceFactice(flux);
  return { ctx: { portes, source, maintenant: () => new Date(instant) }, portes, source };
}
