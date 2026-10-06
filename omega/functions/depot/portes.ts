// Portes du socle pour le dépôt par lot (WebDAV). Lot SQL : omega/modules/socle/migrations/19am_depots.sql
// (numéro à confirmer par le coordinateur). Le mot de passe d'un dépôt n'est jamais gardé : seule son empreinte
// SHA-256 l'est (mot de passe tiré au hasard, 128 bits : une empreinte lente n'ajouterait rien).

export type DepotOuvert = {
  depot: string;
  client_id: string;
  entite_id: string | null;
  module: string;
  libelle: string;
};

/** Ce que le dépôt montre : les dossiers créés et les fichiers déposés depuis 30 jours. */
export type Element = {
  chemin: string;
  dossier: boolean;
  octets: number;
  /** vide : réservé (PUT de 0 octet de l'Explorateur) ; importe ; doublon ; ignore (fichier système) ; refuse. */
  etat: "vide" | "importe" | "doublon" | "ignore" | "refuse" | "dossier";
  reference: string | null;
  recu_le: string;
};

export type Noter = {
  chemin: string;
  dossier: boolean;
  octets: number;
  sha256: string | null;
  etat: Element["etat"];
  document: string | null;
  reference: string | null;
  motif: string | null;
};

export type DepotFiled = {
  depot: string;
  client: string;
  entite: string | null;
  document: string;
  nom: string;
  mime: string;
  octets: number;
  sha256: string;
  chemin: string;
  expediteur: string;
};

export interface Portes {
  /** null si l'identifiant ou le mot de passe est faux, le dépôt fermé, ou trop d'échecs récents. */
  ouvrir(
    identifiant: string,
    empreinte: string,
    ip: string | null,
  ): Promise<DepotOuvert | null>;
  lister(depot: string): Promise<Element[]>;
  noter(depot: string, n: Noter): Promise<void>;
  /** Renomme un dossier vide ou un fichier réservé / ignoré (l'Explorateur crée « Nouveau dossier » puis le renomme). */
  renommer(depot: string, de: string, vers: string): Promise<boolean>;
  deposerFiled(
    d: DepotFiled,
  ): Promise<{ document: string; reference: string | null; etat: string }>;
}

export class ErreurPorte extends Error {
  constructor(
    public readonly porte: string,
    public readonly statut: number,
    public readonly corps: string,
  ) {
    super(`porte ${porte} : HTTP ${statut} ${corps.slice(0, 300)}`);
    this.name = "ErreurPorte";
  }
}

export type AppelRpc = (
  nom: string,
  params: Record<string, unknown>,
) => Promise<unknown>;

export function rpcSupabase(
  url: string,
  cleService: string,
  fetchImpl: typeof fetch = fetch,
): AppelRpc {
  return async (nom, params) => {
    const r = await fetchImpl(`${url}/rest/v1/rpc/${nom}`, {
      method: "POST",
      headers: {
        apikey: cleService,
        Authorization: `Bearer ${cleService}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });
    const texte = await r.text();
    if (!r.ok) throw new ErreurPorte(nom, r.status, texte);
    if (texte === "" || texte === "null") return null;
    return JSON.parse(texte);
  };
}

export function portesSupabase(rpc: AppelRpc): Portes {
  return {
    async ouvrir(identifiant, empreinte, ip) {
      const r = await rpc("depot_ouvrir", {
        p_identifiant: identifiant,
        p_empreinte: empreinte,
        p_ip: ip,
      });
      return r && typeof r === "object" ? r as DepotOuvert : null;
    },
    async lister(depot) {
      const l = await rpc("depot_lister", { p_depot: depot });
      return Array.isArray(l) ? l as Element[] : [];
    },
    async noter(depot, n) {
      await rpc("depot_noter", {
        p_depot: depot,
        p_chemin: n.chemin,
        p_dossier: n.dossier,
        p_octets: n.octets,
        p_sha256: n.sha256,
        p_etat: n.etat,
        p_document: n.document,
        p_reference: n.reference,
        p_motif: n.motif,
      });
    },
    async renommer(depot, de, vers) {
      return (await rpc("depot_renommer", {
        p_depot: depot,
        p_de: de,
        p_vers: vers,
      })) === true;
    },
    async deposerFiled(d) {
      // La porte du dépôt impose le client et la société du dépôt : l'ouvrier ne peut pas déposer ailleurs.
      const r = await rpc("depot_deposer_filed", {
        p_depot: d.depot,
        p_document: d.document,
        p_nom_fichier: d.nom,
        p_mime: d.mime,
        p_octets: d.octets,
        p_sha256: d.sha256,
        p_chemin: d.chemin,
        p_origine: d.expediteur,
      }) as
        | { document?: string; reference?: string | null; etat?: string }
        | null;
      return {
        document: r?.document ?? d.document,
        reference: r?.reference ?? null,
        etat: r?.etat ?? "en_lecture",
      };
    },
  };
}

export function portesDepuisEnvironnement(): Portes {
  const url = Deno.env.get("SUPABASE_URL");
  const cle = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !cle) {
    throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis");
  }
  return portesSupabase(rpcSupabase(url, cle));
}
