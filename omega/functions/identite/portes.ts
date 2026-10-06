// Les portes de l'ouvrier IDENTITÉ : la file des travaux (socle partagé) et les
// portes des lots b7_01 et b7_03 : identite_a_verifier, noter_identite,
// identite_relancer, identite_balayer, par la fonction rpc() exportée du socle partagé (A1,
// commit 7425991). Jamais de lecture ni d'écriture directe dans une table.

import { type ConfigSupabase, type Portes, PortesRpc, rpc } from "@partage/portes.ts";

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
  /** Le résultat écrit (b7_04) : un refus douteux est écrit « indisponible ». */
  resultat?: ResultatRegistre | null;
  /** Vrai quand la porte a mis le refus en doute (b7_04). */
  doute: boolean;
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
  /** identite_balayer : ouvre une demande pour chaque fournisseur dont la dernière réponse a plus de p_jours, p_max au plus. */
  balayer(jours: number, max: number): Promise<number>;
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

  private rpc<T>(nom: string, params: Record<string, unknown>): Promise<T> {
    return rpc<T>(this.cfg, this.fetchFn, nom, params);
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
      resultat: n?.resultat ?? null,
      doute: n?.doute === true,
    };
  }

  async relancer(heures: number): Promise<number> {
    const n = await this.rpc<number | null>("identite_relancer", { p_heures: heures });
    return Number(n ?? 0);
  }

  async balayer(jours: number, max: number): Promise<number> {
    const n = await this.rpc<number | null>("identite_balayer", { p_jours: jours, p_max: max });
    return Number(n ?? 0);
  }
}
