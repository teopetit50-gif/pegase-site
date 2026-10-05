// Les portes de l'ouvrier IDENTITÉ : la file des travaux (socle partagé) et les
// trois portes du lot b7_01 : identite_a_verifier, noter_identite,
// identite_relancer. Jamais de lecture ni d'écriture directe dans une table.

import { ErreurOuvrier } from "@partage/erreurs.ts";
import { type ConfigSupabase, type Portes, PortesRpc } from "@partage/portes.ts";

export type Registre = "sirene" | "vies";
export type ResultatRegistre = "valide" | "invalide" | "indisponible";

/** Ce que rend identite_a_verifier. */
export interface Demande {
  id: string;
  client_id: string;
  fournisseur_id: string | null;
  registre: Registre;
  identifiant: string;
  demande_le: string;
  repondu_le: string | null;
  resultat: ResultatRegistre | null;
  fournisseur: { id: string; pays: string | null; siren: string | null; tva: string | null; statut: string | null } | null;
  cache: {
    resultat: ResultatRegistre;
    preuve: Record<string, unknown>;
    source: string;
    version: string | null;
    verifie_le: string;
    age_jours: number;
  } | null;
}

/** Une vérification faite en plus de celle demandée (Sirene sur le SIREN que porte une TVA FR). */
export interface Complement {
  registre: Registre;
  identifiant: string;
  resultat: ResultatRegistre;
  preuve: Record<string, unknown>;
  source: string;
}

export interface Notation {
  verification: string;
  deja_repondue: boolean;
  complements: number;
  recontrolees: number;
}

export type PortesFile = Pick<Portes, "prendreTravaux" | "finirTravail" | "echouerTravail" | "battreOuvrier">;

export interface PortesIdentite extends PortesFile {
  /** identite_a_verifier : la demande, son fournisseur, le cache ; null si elle n'existe pas. */
  aVerifier(verification: string): Promise<Demande | null>;
  /** noter_identite : la réponse, le cache, les compléments, le recontrôle des factures. */
  noter(
    verification: string,
    resultat: ResultatRegistre,
    preuve: Record<string, unknown>,
    source: string,
    complements?: Complement[],
  ): Promise<Notation>;
  /** identite_relancer : rouvre les « indisponible » plus vieux que p_heures. */
  relancer(heures: number): Promise<number>;
}

/** Les portes par RPC PostgREST : la file par le socle partagé, les portes d'identité par le même chemin. */
export class PortesIdentiteRpc implements PortesIdentite {
  private readonly file: PortesRpc;

  constructor(private readonly cfg: ConfigSupabase, private readonly fetchFn: typeof fetch = fetch) {
    this.file = new PortesRpc(cfg, fetchFn);
  }

  prendreTravaux(genres: string[], nombre: number, bail: string, ouvrier: string) {
    return this.file.prendreTravaux(genres, nombre, bail, ouvrier);
  }
  finirTravail(id: number, resultat: unknown) {
    return this.file.finirTravail(id, resultat);
  }
  echouerTravail(id: number, erreur: string, reprendre?: boolean) {
    return this.file.echouerTravail(id, erreur, reprendre);
  }
  battreOuvrier(module: string, genres: string[], detail: unknown, attendu?: string) {
    return this.file.battreOuvrier(module, genres, detail, attendu);
  }

  // Même mécanique que PortesRpc.rpc (privée là-bas) : 5xx/429 = panne, 401/403 = porte refusée, autre 4xx = erreur interne.
  private async rpc<T>(nom: string, params: Record<string, unknown>): Promise<T> {
    let rep: Response;
    try {
      rep = await this.fetchFn(`${this.cfg.url}/rest/v1/rpc/${nom}`, {
        method: "POST",
        headers: {
          apikey: this.cfg.cleService,
          Authorization: `Bearer ${this.cfg.cleService}`,
          "Content-Type": "application/json",
        },
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

  async aVerifier(verification: string): Promise<Demande | null> {
    const d = await this.rpc<Demande | null>("identite_a_verifier", { p_verification: verification });
    return d && typeof d === "object" && typeof d.id === "string" ? d : null;
  }

  async noter(verification: string, resultat: ResultatRegistre, preuve: Record<string, unknown>, source: string, complements: Complement[] = []) {
    const n = await this.rpc<Notation>("noter_identite", {
      p_verification: verification,
      p_resultat: resultat,
      p_preuve: preuve,
      p_source: source,
      p_complements: complements,
    });
    return {
      verification: n?.verification ?? verification,
      deja_repondue: n?.deja_repondue === true,
      complements: Number(n?.complements ?? 0),
      recontrolees: Number(n?.recontrolees ?? 0),
    };
  }

  async relancer(heures: number): Promise<number> {
    const n = await this.rpc<number | null>("identite_relancer", { p_heures: heures });
    return Number(n ?? 0);
  }
}
