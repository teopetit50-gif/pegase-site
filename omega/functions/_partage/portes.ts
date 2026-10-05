// Les PORTES : les seules voies d'un ouvrier vers la base. Des fonctions du
// schéma public réservées au rôle de service, appelées par RPC avec la clé de
// service que Supabase fournit aux fonctions Edge. Jamais d'écriture directe,
// et depuis le lot 19 du socle plus aucune lecture directe non plus :
// piece_a_lire, consommation_ia_jour et lire_parametre sont des portes.

import { ErreurOuvrier } from "./erreurs.ts";

export interface Travail {
  id: number;
  client_id: string | null;
  module: string;
  genre: string;
  charge: Record<string, unknown>;
  cle: string | null;
  essais: number;
  essais_max: number;
}

export interface Piece {
  id: string;
  client_id: string;
  module: string;
  objet_type: string | null;
  objet_id: string | null;
  source: string;
  nom_fichier: string;
  mime: string;
  octets: number;
  sha256: string;
  chemin: string;
  statut: string;
  chiffrement: string | null;
}

/** Une page lue, au format exact de private.enregistrer_lecture. */
export interface PageLue {
  n: number;
  methode: "natif" | "ocr" | "ocr_manuscrit" | "vision";
  texte: string;
  confiance?: number;
  largeur?: number;
  hauteur?: number;
}

export interface Boite {
  x: number;
  y: number;
  l: number;
  h: number;
}

/** Une valeur lue, au format exact de private.enregistrer_lecture. */
export interface ValeurLue {
  champ: string;
  valeur: unknown;
  texte?: string;
  page?: number;
  boite?: Boite;
  source: "ia" | "xml" | "regle" | "tableur";
  confiance?: number;
  verifiee: boolean;
  controle?: string;
}

export type StatutLecture = "lue" | "a_verifier" | "a_classer" | "rejetee" | "echec";

export interface ResultatLecture {
  statut: StatutLecture;
  type_piece?: string;
  confiance_type?: number;
  methode?: "natif" | "ocr" | "mixte" | "xml" | "tableur";
  nb_pages?: number;
  motif?: string;
  pages: PageLue[];
  valeurs: ValeurLue[];
}

export interface Portes {
  prendreTravaux(genres: string[], nombre: number, bail: string, ouvrier: string): Promise<Travail[]>;
  finirTravail(id: number, resultat: unknown): Promise<void>;
  echouerTravail(id: number, erreur: string, reprendre?: boolean): Promise<"repris" | "echec">;
  commencerLecture(piece: string): Promise<boolean>;
  enregistrerLecture(
    piece: string,
    resultat: ResultatLecture,
    version: string,
  ): Promise<{ pages: number; valeurs: number; statut: string }>;
  battreOuvrier(module: string, genres: string[], detail: unknown, attendu?: string): Promise<number>;

  /** piece_a_lire : la ligne de public.pieces ; null si la pièce n'existe pas. */
  lirePiece(id: string): Promise<Piece | null>;
  /** consommation_ia_jour : somme des cout_eur des travaux lecteur.lire finis depuis minuit Paris. */
  consommationIaDuJour(client: string): Promise<number>;
  /** lire_parametre : un réglage global (private.reglages) ; null s'il n'existe pas. */
  lireParametre(cle: string): Promise<string | null>;
}

export interface ConfigSupabase {
  url: string;
  cleService: string;
}

export function configSupabaseDepuisEnv(env: { get(n: string): string | undefined } = Deno.env): ConfigSupabase {
  const url = env.get("SUPABASE_URL");
  const cleService = env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !cleService) {
    throw new ErreurOuvrier("ERREUR_INTERNE", "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absente de l'environnement.");
  }
  return { url: url.replace(/\/+$/, ""), cleService };
}

/** Les portes par RPC PostgREST, avec la clé de service. */
export class PortesRpc implements Portes {
  constructor(private readonly cfg: ConfigSupabase, private readonly fetchFn: typeof fetch = fetch) {}

  private entetes(extra: Record<string, string> = {}): Record<string, string> {
    return {
      apikey: this.cfg.cleService,
      Authorization: `Bearer ${this.cfg.cleService}`,
      "Content-Type": "application/json",
      ...extra,
    };
  }

  private async rpc<T>(nom: string, params: Record<string, unknown>): Promise<T> {
    let rep: Response;
    try {
      rep = await this.fetchFn(`${this.cfg.url}/rest/v1/rpc/${nom}`, {
        method: "POST",
        headers: this.entetes(),
        body: JSON.stringify(params),
      });
    } catch (e) {
      throw new ErreurOuvrier("FOURNISSEUR_INDISPONIBLE", `porte ${nom} injoignable : ${(e as Error).message}`);
    }
    const texte = await rep.text();
    if (!rep.ok) {
      if (rep.status >= 500 || rep.status === 429) {
        throw new ErreurOuvrier("FOURNISSEUR_INDISPONIBLE", `porte ${nom} : HTTP ${rep.status} ${texte.slice(0, 300)}`);
      }
      if (rep.status === 401 || rep.status === 403) {
        throw new ErreurOuvrier("PORTE_REFUSEE", `porte ${nom} : HTTP ${rep.status} ${texte.slice(0, 300)}`, true);
      }
      throw new ErreurOuvrier("ERREUR_INTERNE", `porte ${nom} : HTTP ${rep.status} ${texte.slice(0, 300)}`, true);
    }
    return (texte === "" ? null : JSON.parse(texte)) as T;
  }

  async prendreTravaux(genres: string[], nombre: number, bail: string, ouvrier: string): Promise<Travail[]> {
    const lignes = await this.rpc<Travail[] | null>("prendre_travaux", {
      p_genres: genres,
      p_nombre: nombre,
      p_bail: bail,
      p_ouvrier: ouvrier,
    });
    return (lignes ?? []).map((t) => ({ ...t, id: Number(t.id) }));
  }

  async finirTravail(id: number, resultat: unknown): Promise<void> {
    await this.rpc<null>("finir_travail", { p_id: id, p_resultat: resultat });
  }

  async echouerTravail(id: number, erreur: string, reprendre = true): Promise<"repris" | "echec"> {
    const r = await this.rpc<string>("echouer_travail", { p_id: id, p_erreur: erreur.slice(0, 2000), p_reprendre: reprendre });
    return r === "echec" ? "echec" : "repris";
  }

  async commencerLecture(piece: string): Promise<boolean> {
    return (await this.rpc<boolean>("commencer_lecture", { p_piece: piece })) === true;
  }

  async enregistrerLecture(piece: string, resultat: ResultatLecture, version: string) {
    return await this.rpc<{ pages: number; valeurs: number; statut: string }>("enregistrer_lecture", {
      p_piece: piece,
      p_resultat: resultat,
      p_version: version.slice(0, 40),
    });
  }

  async battreOuvrier(module: string, genres: string[], detail: unknown, attendu = "15 minutes"): Promise<number> {
    const n = await this.rpc<number>("battre_ouvrier", { p_module: module, p_genres: genres, p_detail: detail, p_attendu: attendu });
    return Number(n ?? 0);
  }

  async lirePiece(id: string): Promise<Piece | null> {
    const p = await this.rpc<Piece | null>("piece_a_lire", { p_piece: id });
    return p && typeof p === "object" && typeof p.id === "string" ? p : null;
  }

  async consommationIaDuJour(client: string): Promise<number> {
    const n = Number(await this.rpc<number | string | null>("consommation_ia_jour", { p_client: client }));
    return Number.isFinite(n) ? n : 0;
  }

  async lireParametre(cle: string): Promise<string | null> {
    const v = await this.rpc<string | null>("lire_parametre", { p_cle: cle });
    return v === null || v === undefined || v === "" ? null : String(v);
  }
}

/** Minuit à Paris, le jour où tombe l'instant donné. */
export function debutDuJourParis(instant: Date): Date {
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(instant).map((x) => [x.type, x.value]));
  const h = Number(p.hour === "24" ? "0" : p.hour);
  const ecoules = ((h * 60 + Number(p.minute)) * 60 + Number(p.second)) * 1000;
  return new Date(instant.getTime() - ecoules - instant.getMilliseconds());
}
