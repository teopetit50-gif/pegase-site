// Les portes propres aux relevés, formes confirmées par le coordinateur le
// 05/10/2026 (lues sur la recette) :
//   commencer_releve(p_instantane) → jsonb (null = plus rien à lire) ; vide les lignes d'un essai interrompu.
//   deposer_lignes(p_instantane, p_lignes jsonb) → integer ; chaque élément
//     {n ≥ 1 unique par instantané, ligne ≥ 1 ou null, cle 1..1000 UNIQUE par instantané,
//      valeurs objet (clé de colonne → valeur), anomalies objet non vide ou absent} ;
//     l'empreinte est calculée par le socle.
//   terminer_lecture(p_instantane, p_resultat, p_version) → jsonb ; statut lu | a_classer | rejete | echec ;
//     si lu : jeu (code, obligatoire) et lignes (= nombre déposé) ; colonnes et format rangés tels quels ;
//     motif ≤ 500. Autre statut : lignes supprimées, pièce et alerte posées par le socle.
// Plus prendre_travaux / finir_travail / echouer_travail / battre_ouvrier, identiques au lecteur.

import { ErreurOuvrier } from "@partage/erreurs.ts";
import { type ConfigSupabase, rpc, type Travail } from "@partage/portes.ts";

/** Un jeu déclaré sur le branchement, tel que commencer_releve le rend. */
export interface JeuDeclare {
  code: string;
  libelle: string;
  motif_fichier: string | null;
  /** Les en-têtes attendus dans le fichier (forme libre, normalisée par nous). */
  entetes: string[];
  /** Clé de colonne → déclaration (libelle, type, obligatoire, sensible, alias d'en-tête…). */
  colonnes: Record<string, ColonneDeclaree>;
  /** Les colonnes qui forment la clé d'une ligne. */
  cle: string[];
  options: Record<string, unknown>;
}

export type TypeColonne = "texte" | "entier" | "decimal" | "date" | "dateheure" | "heure" | "booleen";

/** Une colonne déclarée (private.colonnes_valides) : aucune autre clé n'est admise. */
export interface ColonneDeclaree {
  type: TypeColonne;
  /** Variantes d'en-tête acceptées dans le fichier. */
  entetes?: string[];
  format?: string;
  obligatoire?: boolean;
  facultative?: boolean;
  sensible?: boolean;
  libelle?: string;
}

/** Ce que commencer_releve rend. */
export interface InstantaneALire {
  instantane: string;
  client: string;
  branchement: string;
  module: string;
  logiciel: string;
  fuseau: string;
  nom_fichier: string;
  chemin: string;
  mime: string;
  octets: number | null;
  sha256: string;
  force: boolean;
  /** Code du jeu si l'instantané en a un. */
  jeu: string | null;
  jeux: JeuDeclare[];
}

/** Une ligne déposée, au format exact de deposer_lignes. */
export interface LigneDeposee {
  /** Rang dans le dépôt, à partir de 1, unique par instantané. */
  n: number;
  /** Numéro de la ligne dans le fichier (en-tête compris), ou null. */
  ligne: number | null;
  /** La clé métier du jeu (colonnes `cle` jointes), unique par instantané. */
  cle: string;
  /** Clé de colonne déclarée → valeur telle que lue. */
  valeurs: Record<string, string>;
  /** Clé de colonne → motif ; absent s'il n'y en a pas. Jamais la valeur elle-même (colonnes sensibles). */
  anomalies?: Record<string, string>;
}

export type StatutReleve = "lu" | "a_classer" | "rejete" | "echec";

export interface ResultatReleve {
  statut: StatutReleve;
  /** Code du jeu ; obligatoire quand le statut est « lu ». */
  jeu?: string;
  /** Nombre de lignes annoncé : égal au nombre déposé. */
  lignes: number;
  /** Rangé tel quel dans instantanes.colonnes : les colonnes du fichier dans l'ordre, clé déclarée ou en-tête normalisé. */
  colonnes: string[];
  /** Rangé tel quel dans instantanes.format. */
  format: { type: "csv" | "xlsx"; encodage?: string; separateur?: string; feuille?: string; entetes: string[]; anomalies: number };
  motif?: string;
}

export interface PortesReleve {
  prendreTravaux(genres: string[], nombre: number, bail: string, ouvrier: string): Promise<Travail[]>;
  finirTravail(id: number, resultat: unknown): Promise<void>;
  echouerTravail(id: number, erreur: string, reprendre?: boolean): Promise<"repris" | "echec">;
  battreOuvrier(module: string, genres: string[], detail: unknown, attendu?: string): Promise<number>;
  commencerReleve(instantane: string): Promise<InstantaneALire | null>;
  deposerLignes(instantane: string, lignes: LigneDeposee[]): Promise<number>;
  terminerLecture(instantane: string, resultat: ResultatReleve, version: string): Promise<unknown>;
}

export class PortesReleveRpc implements PortesReleve {
  constructor(private readonly cfg: ConfigSupabase, private readonly fetchFn: typeof fetch = fetch) {}

  async prendreTravaux(genres: string[], nombre: number, bail: string, ouvrier: string): Promise<Travail[]> {
    const l = await rpc<Travail[] | null>(this.cfg, this.fetchFn, "prendre_travaux", { p_genres: genres, p_nombre: nombre, p_bail: bail, p_ouvrier: ouvrier });
    return (l ?? []).map((t) => ({ ...t, id: Number(t.id) }));
  }
  async finirTravail(id: number, resultat: unknown): Promise<void> {
    await rpc<null>(this.cfg, this.fetchFn, "finir_travail", { p_id: id, p_resultat: resultat });
  }
  async echouerTravail(id: number, erreur: string, reprendre = true): Promise<"repris" | "echec"> {
    const r = await rpc<string>(this.cfg, this.fetchFn, "echouer_travail", { p_id: id, p_erreur: erreur.slice(0, 2000), p_reprendre: reprendre });
    return r === "echec" ? "echec" : "repris";
  }
  async battreOuvrier(module: string, genres: string[], detail: unknown, attendu = "15 minutes"): Promise<number> {
    return Number(
      (await rpc<number>(this.cfg, this.fetchFn, "battre_ouvrier", { p_module: module, p_genres: genres, p_detail: detail, p_attendu: attendu })) ?? 0,
    );
  }
  async commencerReleve(instantane: string): Promise<InstantaneALire | null> {
    const r = await rpc<InstantaneALire | null>(this.cfg, this.fetchFn, "commencer_releve", { p_instantane: instantane });
    if (!r || typeof r !== "object" || typeof r.instantane !== "string") return null;
    return { ...r, jeux: Array.isArray(r.jeux) ? r.jeux : [], jeu: r.jeu ?? null };
  }
  async deposerLignes(instantane: string, lignes: LigneDeposee[]): Promise<number> {
    if (lignes.length === 0) return 0;
    return Number((await rpc<number>(this.cfg, this.fetchFn, "deposer_lignes", { p_instantane: instantane, p_lignes: lignes })) ?? 0);
  }
  async terminerLecture(instantane: string, resultat: ResultatReleve, version: string): Promise<unknown> {
    return await rpc<unknown>(this.cfg, this.fetchFn, "terminer_lecture", { p_instantane: instantane, p_resultat: resultat, p_version: version.slice(0, 40) });
  }
}

export function exigerUuid(v: unknown, quoi: string): string {
  if (typeof v !== "string" || !/^[0-9a-f-]{36}$/i.test(v)) throw new ErreurOuvrier("ERREUR_INTERNE", `${quoi} absent ou mal formé`, false);
  return v;
}
