// Portes du socle : l'ouvrier ne voit Postgres que par ces fonctions,
// appelées en RPC avec la clé de service fournie par Supabase à la fonction.
// Aucune écriture directe dans une table. Signatures lues sur la recette par le
// coordinateur (05/10/2026), voir omega/NOTES-A2.md.

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
  chemin: string;
  nom: string;
  mime: string;
  octets?: number | null;
  sha256?: string | null;
};

/** Réponse de commencer_envoi quand l'envoi n'est pas à envoyer. */
export type EnvoiRefuse = {
  envoyer: false;
  statut: string;
  verrou?: string | null;
  motif?: string | null;
  reprise_le?: string | null;
};

/** Réponse de commencer_envoi quand l'envoi est passé en 'en_cours'. */
export type EnvoiAEnvoyer = {
  envoyer: true;
  envoi: string;
  mode: "reel" | "essai";
  module: string;
  canal: "email" | "sms" | "whatsapp" | "lre" | string;
  fournisseur: string;
  expediteur: {
    identite: string;
    nom_affiche: string | null;
    repondre_a: string | null;
    parametres: Record<string, unknown>;
    /** true : la clé API vient du coffre, par secret_expediteur. */
    secret: boolean;
  };
  destinataire: {
    adresse: string;
    nom: string | null;
    langue: string | null;
    professionnel: boolean | null;
  };
  sujet: string | null;
  corps: string;
  pieces: PieceAEnvoyer[];
  modele_externe: string | null;
  langue: string | null;
  parametres_modele: Record<string, unknown> | null;
  repondre_a: string | null;
  transactionnel: boolean;
  /** Clés du lot santé (trou commun n° 7), absentes tant que le socle ne les expose pas. */
  donnees_sante?: boolean | null;
  fournisseur_hds?: boolean | null;
  /**
   * Lot socle 19ah : vrai seulement sur la recette, en mode essai, quand le client a déclaré
   * des données de santé fictives (reglages_envois.essai_donnees_fictives). Absent ailleurs.
   */
  donnees_fictives?: boolean | null;
  /** = id de l'envoi : clé d'idempotence côté fournisseur. */
  cle: string;
  objet: { type: string | null; id: string | null } | null;
};

export type ReponseCommencer = EnvoiRefuse | EnvoiAEnvoyer;
export type ResultatEchecTravail = "repris" | "echec";
export type ResultatEchecEnvoi = "pret" | "echec";

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
  ): Promise<ResultatEchecTravail>;
  battreOuvrier(
    module: string,
    genres: string[],
    detail: Record<string, unknown>,
    attendu: string,
  ): Promise<number>;
  /** Lecture ET transition : verrouille, passe en 'en_cours' (essais+1, bail 15 min) ou refuse. */
  commencerEnvoi(envoi: string): Promise<ReponseCommencer>;
  /** Clé API du fournisseur pour cet envoi, lue dans le coffre. */
  secretExpediteur(envoi: string): Promise<string | null>;
  /** Passe l'envoi à 'envoye' avec la référence du fournisseur. Rejouable. */
  confirmerEnvoi(envoi: string, reference: string): Promise<void>;
  /** 'pret' (reconfié plus tard) ou 'echec' (définitif). */
  echouerEnvoi(
    envoi: string,
    erreur: string,
    definitif: boolean,
  ): Promise<ResultatEchecEnvoi>;
  /** Dépose un travail, idempotent sur (genre, cle). Rend l'id du travail. */
  deposerTravail(
    client: string,
    module: string,
    genre: string,
    charge: Record<string, unknown>,
    cle: string,
    priorite: number,
  ): Promise<number>;
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
    async commencerEnvoi(envoi) {
      const r = await rpc("commencer_envoi", { p_envoi: envoi });
      if (!r || typeof r !== "object") {
        return {
          envoyer: false,
          statut: "introuvable",
          motif: "commencer_envoi a rendu null",
        };
      }
      return r as ReponseCommencer;
    },
    async secretExpediteur(envoi) {
      const r = await rpc("secret_expediteur", { p_envoi: envoi });
      return typeof r === "string" && r.trim() !== "" ? r.trim() : null;
    },
    async confirmerEnvoi(envoi, reference) {
      await rpc("confirmer_envoi", {
        p_envoi: envoi,
        p_reference: reference.slice(0, 300),
      });
    },
    async echouerEnvoi(envoi, erreur, definitif) {
      const r = await rpc("echouer_envoi", {
        p_envoi: envoi,
        p_erreur: erreur,
        p_definitif: definitif,
      });
      return r === "echec" ? "echec" : "pret";
    },
    async deposerTravail(client, module, genre, charge, cle, priorite) {
      const r = await rpc("deposer_travail", {
        p_client: client,
        p_module: module,
        p_genre: genre,
        p_charge: charge,
        p_cle: cle,
        p_priorite: priorite,
      });
      return typeof r === "number" ? r : Number(r ?? 0);
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
