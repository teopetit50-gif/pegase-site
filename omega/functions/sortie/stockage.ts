// Le bucket omega-clients, par l'API Storage avec la clé de service : lire une pièce, écrire un volume, signer un lien,
// retirer les volumes expirés.

import type { ConfigSupabase } from "@partage/portes.ts";

export interface Stockage {
  lire(chemin: string): Promise<Uint8Array>;
  ecrire(chemin: string, donnees: Uint8Array, type: string): Promise<void>;
  signer(chemin: string, secondes: number, nomTelechargement: string): Promise<string>;
  retirer(chemins: string[]): Promise<void>;
}

export class StockageSupabase implements Stockage {
  constructor(private readonly cfg: ConfigSupabase, private readonly bucket = "omega-clients", private readonly fetchFn: typeof fetch = fetch) {}

  private entetes(extra: Record<string, string> = {}) {
    return { apikey: this.cfg.cleService, Authorization: `Bearer ${this.cfg.cleService}`, ...extra };
  }
  private chemin(c: string) {
    return c.split("/").map(encodeURIComponent).join("/");
  }
  private async verifier(rep: Response, quoi: string): Promise<void> {
    if (!rep.ok) throw new Error(`${quoi} : HTTP ${rep.status} ${(await rep.text()).slice(0, 200)}`);
  }

  async lire(chemin: string): Promise<Uint8Array> {
    const rep = await this.fetchFn(`${this.cfg.url}/storage/v1/object/authenticated/${this.bucket}/${this.chemin(chemin)}`, { headers: this.entetes() });
    await this.verifier(rep, `lecture de ${chemin}`);
    return new Uint8Array(await rep.arrayBuffer());
  }
  async ecrire(chemin: string, donnees: Uint8Array, type: string): Promise<void> {
    const rep = await this.fetchFn(`${this.cfg.url}/storage/v1/object/${this.bucket}/${this.chemin(chemin)}`, {
      method: "POST",
      headers: this.entetes({ "Content-Type": type, "x-upsert": "true" }),
      body: new Blob([donnees as unknown as ArrayBuffer], { type }),
    });
    await this.verifier(rep, `écriture de ${chemin}`);
    await rep.body?.cancel();
  }
  async signer(chemin: string, secondes: number, nomTelechargement: string): Promise<string> {
    const rep = await this.fetchFn(`${this.cfg.url}/storage/v1/object/sign/${this.bucket}/${this.chemin(chemin)}`, {
      method: "POST",
      headers: this.entetes({ "Content-Type": "application/json" }),
      body: JSON.stringify({ expiresIn: secondes }),
    });
    await this.verifier(rep, `signature de ${chemin}`);
    const r = (await rep.json()) as { signedURL?: string };
    if (!r.signedURL) throw new Error("signature : réponse sans signedURL");
    const sep = r.signedURL.includes("?") ? "&" : "?";
    return `${this.cfg.url}/storage/v1${r.signedURL}${sep}download=${encodeURIComponent(nomTelechargement)}`;
  }
  async retirer(chemins: string[]): Promise<void> {
    if (chemins.length === 0) return;
    const rep = await this.fetchFn(`${this.cfg.url}/storage/v1/object/${this.bucket}`, {
      method: "DELETE",
      headers: this.entetes({ "Content-Type": "application/json" }),
      body: JSON.stringify({ prefixes: chemins }),
    });
    await this.verifier(rep, "retrait des volumes expirés");
    await rep.body?.cancel();
  }
}
