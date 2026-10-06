// Les portes de l'ouvrier TAMILA-PURGE : la file des travaux (socle) et les deux portes de b4_10, appelées avec la
// clé de service. Jamais de lecture ni d'écriture directe dans une table.

export interface Travail {
  id: number;
  client_id: string | null;
  genre: string;
  charge: Record<string, unknown>;
  essais: number;
  essais_max: number;
}

export class ErreurPorte extends Error {
  constructor(readonly code: string, message: string, readonly reprendre: boolean) {
    super(message);
    this.name = "ErreurPorte";
  }
}

export interface Portes {
  prendreTravaux(genres: string[], nombre: number, bail: string, ouvrier: string): Promise<Travail[]>;
  finirTravail(id: number, resultat: unknown): Promise<void>;
  echouerTravail(id: number, erreur: string, reprendre: boolean): Promise<string>;
  battreOuvrier(module: string, genres: string[], detail: unknown): Promise<number>;
  /** tamila_reception_a_purger : les chemins à effacer au bucket. */
  aPurger(reception: number): Promise<{ reception: number; client: string; chemins: string[] }>;
  /** tamila_reception_purgee : la purge constatée. */
  purgee(reception: number, fichiers: number): Promise<void>;
}

export class PortesRpc implements Portes {
  constructor(private readonly url: string, private readonly cle: string, private readonly fetchFn: typeof fetch = fetch) {}

  private async rpc<T>(nom: string, params: Record<string, unknown>): Promise<T> {
    let rep: Response;
    try {
      rep = await this.fetchFn(`${this.url.replace(/\/+$/, "")}/rest/v1/rpc/${nom}`, {
        method: "POST",
        headers: { apikey: this.cle, Authorization: `Bearer ${this.cle}`, "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
    } catch (e) {
      throw new ErreurPorte("INJOIGNABLE", `porte ${nom} injoignable : ${(e as Error).message}`, true);
    }
    const brut = await rep.text();
    if (!rep.ok) {
      let code = String(rep.status), message = brut.slice(0, 300);
      try {
        const j = JSON.parse(brut) as { code?: string; message?: string };
        code = j.code ?? code;
        message = j.message ?? message;
      } catch { /* le statut suffit */ }
      // 55000 (rien à purger) et 42501 ne se reprennent pas ; le reste (réseau, 5xx) si.
      throw new ErreurPorte(code, message, !["55000", "42501", "22023", "P0002"].includes(code));
    }
    return (brut ? JSON.parse(brut) : null) as T;
  }

  prendreTravaux(genres: string[], nombre: number, bail: string, ouvrier: string) {
    return this.rpc<Travail[]>("prendre_travaux", { p_genres: genres, p_nombre: nombre, p_bail: bail, p_ouvrier: ouvrier });
  }
  async finirTravail(id: number, resultat: unknown) {
    await this.rpc("finir_travail", { p_id: id, p_resultat: resultat });
  }
  echouerTravail(id: number, erreur: string, reprendre: boolean) {
    return this.rpc<string>("echouer_travail", { p_id: id, p_erreur: erreur.slice(0, 2000), p_reprendre: reprendre });
  }
  battreOuvrier(module: string, genres: string[], detail: unknown) {
    return this.rpc<number>("battre_ouvrier", { p_module: module, p_genres: genres, p_detail: detail });
  }
  aPurger(reception: number) {
    return this.rpc<{ reception: number; client: string; chemins: string[] }>("tamila_reception_a_purger", { p_reception: reception });
  }
  async purgee(reception: number, fichiers: number) {
    await this.rpc("tamila_reception_purgee", { p_reception: reception, p_fichiers: fichiers });
  }
}
