// Les portes de l'ouvrier SORTIE (lot a4_33) : les dossiers à préparer avec leur manifeste, la déclaration de chaque
// volume écrit, l'échec, les dossiers expirés ; et, pour un gérant ou un admin, les volumes d'un dossier prêt (appelée
// avec SON jeton : c'est la base qui décide s'il a le droit). Jamais de lecture ni d'écriture directe dans une table.

import { type ConfigSupabase, rpc } from "@partage/portes.ts";

/** Un fichier reçu (chemin Storage, empreinte) ou un fichier produit par la base (contenu). */
export interface EntreeManifeste {
  volume: number;
  chemin_zip: string;
  chemin?: string;
  sha256?: string;
  octets?: number;
  contenu?: string;
}

export interface Dossier {
  id: string;
  client: string;
  chemin_base: string;
  volumes_total: number;
  faits: number[];
  manifeste: EntreeManifeste[];
}

export interface VolumeEcrit {
  n: number;
  chemin: string;
  sha256: string;
  octets: number;
}

export interface PortesSortie {
  aPreparer(limite: number): Promise<Dossier[]>;
  volume(sortie: string, v: VolumeEcrit): Promise<string>;
  echec(sortie: string, erreur: string): Promise<string>;
  expirees(limite: number): Promise<{ id: string; chemins: string[] }[]>;
  /** Avec le jeton de la personne : la base vérifie son rôle et journalise. */
  lien(jetonPersonne: string, sortie: string): Promise<{ sortie: string; expire_le: string; volumes: VolumeEcrit[] }>;
}

export class PortesSortieRpc implements PortesSortie {
  constructor(private readonly cfg: ConfigSupabase, private readonly cleAnon: string, private readonly fetchFn: typeof fetch = fetch) {}

  async aPreparer(limite: number): Promise<Dossier[]> {
    return (await rpc<Dossier[] | null>(this.cfg, this.fetchFn, "filed_sorties_a_preparer", { p_limite: limite })) ?? [];
  }
  volume(sortie: string, v: VolumeEcrit): Promise<string> {
    return rpc<string>(this.cfg, this.fetchFn, "filed_sortie_volume", {
      p_sortie: sortie,
      p_n: v.n,
      p_chemin: v.chemin,
      p_sha256: v.sha256,
      p_octets: v.octets,
    });
  }
  echec(sortie: string, erreur: string): Promise<string> {
    return rpc<string>(this.cfg, this.fetchFn, "filed_sortie_echec", { p_sortie: sortie, p_erreur: erreur });
  }
  async expirees(limite: number): Promise<{ id: string; chemins: string[] }[]> {
    return (await rpc<{ id: string; chemins: string[] }[] | null>(this.cfg, this.fetchFn, "filed_sorties_expirees", { p_limite: limite })) ?? [];
  }
  async lien(jetonPersonne: string, sortie: string): Promise<{ sortie: string; expire_le: string; volumes: VolumeEcrit[] }> {
    const rep = await this.fetchFn(`${this.cfg.url}/rest/v1/rpc/filed_sortie_lien`, {
      method: "POST",
      headers: { apikey: this.cleAnon, Authorization: `Bearer ${jetonPersonne}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_sortie: sortie }),
    });
    const t = await rep.text();
    if (!rep.ok) {
      let message = `HTTP ${rep.status}`;
      try {
        message = (JSON.parse(t) as { message?: string }).message ?? message;
      } catch { /* réponse non JSON */ }
      throw new RefusLien(rep.status === 401 ? 401 : 403, message);
    }
    return JSON.parse(t);
  }
}

export class RefusLien extends Error {
  constructor(readonly statut: number, message: string) {
    super(message);
  }
}
