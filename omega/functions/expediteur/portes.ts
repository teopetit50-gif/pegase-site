// Portes du socle : l'ouvrier ne voit Postgres que par ces fonctions,
// appelées en RPC avec la clé de service fournie par Supabase à la fonction.
// Aucune écriture directe dans une table.

export type Travail = {
  id: number;
  genre: string;
  charge: Record<string, unknown>;
  cle?: string | null;
  client_id?: string | null;
  essais?: number | null;
};

export type PieceAEnvoyer = {
  id: string;
  nom: string;
  type_mime: string;
  taille: number | null;
  chemin?: string | null;
  url?: string | null;
};

export type EnvoiARemettre = {
  id: string;
  client_id: string;
  module: string;
  canal: string;
  statut: string;
  essais: number;
  reference_externe: string | null;
  cle_idempotence: string;
  destinataire: {
    adresse: string;
    nom: string | null;
    langue: string;
    fuseau: string;
    territoire: string | null;
  };
  expediteur: {
    id: string;
    identite: string;
    nom_affiche: string | null;
    repondre_a: string | null;
    fournisseur: string;
    parametres: Record<string, unknown>;
  } | null;
  repondre_a: string | null;
  sujet: string | null;
  corps: string;
  transactionnel: boolean;
  donnees_sante: boolean;
  pieces: PieceAEnvoyer[];
};

export type ResultatEchec = "repris" | "echec";

export interface Portes {
  prendreTravaux(
    genres: string[],
    nombre: number,
    bail: string,
    ouvrier: string,
  ): Promise<Travail[]>;
  finirTravail(id: number, resultat: Record<string, unknown>): Promise<void>;
  echouerTravail(
    id: number,
    erreur: string,
    reprendre: boolean,
  ): Promise<ResultatEchec>;
  battreOuvrier(
    module: string,
    genres: string[],
    detail: Record<string, unknown>,
    attendu: string,
  ): Promise<number>;
  /** Porte demandée au coordinateur (voir NOTES-A2.md). NULL si l'envoi est inconnu. */
  envoiARemettre(envoi: string): Promise<EnvoiARemettre | null>;
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

/** Appel RPC PostgREST brut, avec la clé de service. */
export function rpcSupabase(
  url: string,
  cleService: string,
  fetchImpl: typeof fetch = fetch,
): AppelRpc {
  return async (nom, params) => {
    const reponse = await fetchImpl(`${url}/rest/v1/rpc/${nom}`, {
      method: "POST",
      headers: {
        apikey: cleService,
        Authorization: `Bearer ${cleService}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });
    const texte = await reponse.text();
    if (!reponse.ok) throw new ErreurPorte(nom, reponse.status, texte);
    if (texte === "" || texte === "null") return null;
    return JSON.parse(texte);
  };
}

export function portesSupabase(rpc: AppelRpc): Portes {
  return {
    async prendreTravaux(genres, nombre, bail, ouvrier) {
      const lignes = await rpc("prendre_travaux", {
        p_genres: genres,
        p_nombre: nombre,
        p_bail: bail,
        p_ouvrier: ouvrier,
      });
      return Array.isArray(lignes) ? (lignes as Travail[]) : [];
    },
    async finirTravail(id, resultat) {
      await rpc("finir_travail", { p_id: id, p_resultat: resultat });
    },
    async echouerTravail(id, erreur, reprendre) {
      const r = await rpc("echouer_travail", {
        p_id: id,
        p_erreur: erreur,
        p_reprendre: reprendre,
      });
      return r === "echec" ? "echec" : "repris";
    },
    async battreOuvrier(module, genres, detail, attendu) {
      const r = await rpc("battre_ouvrier", {
        p_module: module,
        p_genres: genres,
        p_detail: detail,
        p_attendu: attendu,
      });
      return typeof r === "number" ? r : 0;
    },
    async envoiARemettre(envoi) {
      const r = await rpc("envoi_a_remettre", { p_envoi: envoi });
      return (r as EnvoiARemettre | null) ?? null;
    },
  };
}

export function portesDepuisEnvironnement(): Portes {
  const url = Deno.env.get("SUPABASE_URL");
  const cle = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !cle) {
    throw new Error(
      "SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (fournis par Supabase à la fonction)",
    );
  }
  return portesSupabase(rpcSupabase(url, cle));
}
