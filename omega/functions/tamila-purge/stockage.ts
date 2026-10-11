// Le bucket omega-clients, par l'API Storage de Supabase (clé de service) : effacer des fichiers par leur chemin, lire
// une pièce, déposer une archive. Un fichier déjà absent n'est pas une erreur à l'effacement (idempotent).

export interface Stockage {
  /** Efface ces chemins du bucket (omega-clients par défaut) ; rend le nombre d'objets effacés. */
  effacer(chemins: string[], bucket?: string): Promise<number>;
  /** Les octets d'un fichier ; null s'il n'existe pas. */
  lire(chemin: string): Promise<Uint8Array | null>;
  /** Dépose un fichier neuf (jamais de réécriture). */
  deposer(chemin: string, octets: Uint8Array, type: string): Promise<void>;
}

export class StockageSupabase implements Stockage {
  constructor(
    private readonly url: string,
    private readonly cle: string,
    private readonly bucket = "omega-clients",
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async effacer(chemins: string[], bucket = this.bucket): Promise<number> {
    if (!chemins.length) return 0;
    const rep = await this.fetchFn(`${this.url.replace(/\/+$/, "")}/storage/v1/object/${encodeURIComponent(bucket)}`, {
      method: "DELETE",
      headers: { apikey: this.cle, Authorization: `Bearer ${this.cle}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: chemins }),
    });
    if (!rep.ok) throw new Error(`Storage ${rep.status} : ${(await rep.text()).slice(0, 300)}`);
    const effaces = await rep.json().catch(() => []) as unknown[];
    return Array.isArray(effaces) ? effaces.length : 0;
  }

  private objet(chemin: string) {
    return `${this.url.replace(/\/+$/, "")}/storage/v1/object/${this.bucket}/${chemin.split("/").map(encodeURIComponent).join("/")}`;
  }

  async lire(chemin: string): Promise<Uint8Array | null> {
    const rep = await this.fetchFn(this.objet(chemin), { headers: { apikey: this.cle, Authorization: `Bearer ${this.cle}` } });
    if (rep.status === 404 || rep.status === 400) {
      await rep.body?.cancel();
      return null;
    }
    if (!rep.ok) throw new Error(`Storage ${rep.status} : ${(await rep.text()).slice(0, 300)}`);
    return new Uint8Array(await rep.arrayBuffer());
  }

  async deposer(chemin: string, octets: Uint8Array, type: string): Promise<void> {
    const rep = await this.fetchFn(this.objet(chemin), {
      method: "POST",
      headers: { apikey: this.cle, Authorization: `Bearer ${this.cle}`, "Content-Type": type, "x-upsert": "false" },
      body: octets.slice(),
    });
    if (!rep.ok) throw new Error(`Storage ${rep.status} : ${(await rep.text()).slice(0, 300)}`);
  }
}
