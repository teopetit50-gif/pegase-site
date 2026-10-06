// Le dépôt des fichiers : le bucket Storage `omega-clients`, lu avec la clé de
// service. Un fichier absent n'est pas une panne : c'est une pièce illisible.

import { ErreurOuvrier } from "./erreurs.ts";
import type { ConfigSupabase } from "./portes.ts";

export const BUCKET_CLIENTS = "omega-clients";

export type Telechargement = { present: true; octets: Uint8Array; mime: string | null } | { present: false };

export interface Depot {
  telecharger(chemin: string): Promise<Telechargement>;
  /** Range un fichier (pièces filles d'un découpage). Un fichier déjà présent au même chemin est laissé tel quel. */
  deposer?(chemin: string, octets: Uint8Array, mime: string): Promise<void>;
}

export class DepotStorage implements Depot {
  constructor(
    private readonly cfg: ConfigSupabase,
    private readonly bucket: string = BUCKET_CLIENTS,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async telecharger(chemin: string): Promise<Telechargement> {
    const url = `${this.cfg.url}/storage/v1/object/${this.bucket}/${chemin.split("/").map(encodeURIComponent).join("/")}`;
    let rep: Response;
    try {
      rep = await this.fetchFn(url, {
        headers: { apikey: this.cfg.cleService, Authorization: `Bearer ${this.cfg.cleService}` },
      });
    } catch (e) {
      throw new ErreurOuvrier("FOURNISSEUR_INDISPONIBLE", `dépôt injoignable : ${(e as Error).message}`);
    }
    if (rep.status === 404 || rep.status === 400) {
      await rep.text();
      return { present: false };
    }
    if (!rep.ok) {
      const t = await rep.text();
      throw new ErreurOuvrier("FOURNISSEUR_INDISPONIBLE", `dépôt : HTTP ${rep.status} ${t.slice(0, 200)}`);
    }
    return { present: true, octets: new Uint8Array(await rep.arrayBuffer()), mime: rep.headers.get("content-type") };
  }

  async deposer(chemin: string, octets: Uint8Array, mime: string): Promise<void> {
    const url = `${this.cfg.url}/storage/v1/object/${this.bucket}/${chemin.split("/").map(encodeURIComponent).join("/")}`;
    let rep: Response;
    try {
      rep = await this.fetchFn(url, {
        method: "POST",
        headers: { apikey: this.cfg.cleService, Authorization: `Bearer ${this.cfg.cleService}`, "Content-Type": mime, "x-upsert": "false" },
        body: new Blob([octets as unknown as ArrayBuffer], { type: mime }),
      });
    } catch (e) {
      throw new ErreurOuvrier("FOURNISSEUR_INDISPONIBLE", `dépôt injoignable : ${(e as Error).message}`);
    }
    const t = await rep.text();
    // Déjà là (rejeu d'un travail) : le chemin porte le n° des pages, le contenu est le même.
    if (rep.ok || rep.status === 409 || /already exists|Duplicate/i.test(t)) return;
    throw new ErreurOuvrier(
      rep.status >= 500 || rep.status === 429 ? "FOURNISSEUR_INDISPONIBLE" : "ERREUR_INTERNE",
      `dépôt (écriture) : HTTP ${rep.status} ${t.slice(0, 200)}`,
    );
  }
}
