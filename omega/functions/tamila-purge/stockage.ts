// Le bucket omega-clients, par l'API Storage de Supabase (clé de service) : effacer des fichiers par leur chemin.
// Un fichier déjà absent n'est pas une erreur (l'effacement est idempotent).

export interface Stockage {
  effacer(chemins: string[]): Promise<number>;
}

export class StockageSupabase implements Stockage {
  constructor(
    private readonly url: string,
    private readonly cle: string,
    private readonly bucket = "omega-clients",
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async effacer(chemins: string[]): Promise<number> {
    if (!chemins.length) return 0;
    const rep = await this.fetchFn(`${this.url.replace(/\/+$/, "")}/storage/v1/object/${this.bucket}`, {
      method: "DELETE",
      headers: { apikey: this.cle, Authorization: `Bearer ${this.cle}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: chemins }),
    });
    if (!rep.ok) throw new Error(`Storage ${rep.status} : ${(await rep.text()).slice(0, 300)}`);
    const effaces = await rep.json().catch(() => []) as unknown[];
    return Array.isArray(effaces) ? effaces.length : 0;
  }
}
