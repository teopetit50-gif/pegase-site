// Portes du socle pour la réception. Les deux portes ci-dessous n'existent pas
// encore : leur forme est celle demandée au coordinateur le 05/10/2026 (voir
// omega/NOTES-A2.md), qui les pose sur la recette. Le code est écrit contre cette
// forme, avec des doubles pour les tests.
//
//   resoudre_boite(p_canal text, p_boite text) → jsonb
//     {"client_id": uuid, "entite_id": uuid|null, "module": text|null, "expediteur_id": uuid|null} | null
//   deposer_reception(p_client uuid, p_canal text, p_boite text, p_identifiant text,
//                     p_de text, p_de_nom text, p_sujet text, p_corps text, p_corps_html text,
//                     p_pieces jsonb, p_detail jsonb, p_recu_le timestamptz) → jsonb
//     {"id": bigint, "nouvelle": bool} — idempotente sur (client_id, canal, identifiant_externe)

export type Canal = "email" | "whatsapp" | "sms" | "formulaire";

export type Boite = {
  client_id: string;
  entite_id: string | null;
  module: string | null;
  expediteur_id: string | null;
};

export type PieceRecue = {
  nom: string;
  type_mime: string;
  taille: number | null;
  chemin: string;
};

export type Reception = {
  client: string;
  canal: Canal;
  boite: string;
  identifiant: string;
  de: string | null;
  deNom: string | null;
  sujet: string | null;
  corps: string;
  corpsHtml: string | null;
  pieces: PieceRecue[];
  detail: Record<string, unknown>;
  recuLe: string;
};

export type Depot = { id: number; nouvelle: boolean };

export interface Portes {
  resoudreBoite(canal: Canal, boite: string): Promise<Boite | null>;
  deposerReception(reception: Reception): Promise<Depot>;
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
    async resoudreBoite(canal, boite) {
      const r = await rpc("resoudre_boite", { p_canal: canal, p_boite: boite });
      if (!r || typeof r !== "object") return null;
      const o = r as Record<string, unknown>;
      if (typeof o.client_id !== "string") return null;
      return {
        client_id: o.client_id,
        entite_id: typeof o.entite_id === "string" ? o.entite_id : null,
        module: typeof o.module === "string" ? o.module : null,
        expediteur_id: typeof o.expediteur_id === "string"
          ? o.expediteur_id
          : null,
      };
    },
    async deposerReception(r) {
      const d = await rpc("deposer_reception", {
        p_client: r.client,
        p_canal: r.canal,
        p_boite: r.boite,
        p_identifiant: r.identifiant,
        p_de: r.de,
        p_de_nom: r.deNom,
        p_sujet: r.sujet,
        p_corps: r.corps,
        p_corps_html: r.corpsHtml,
        p_pieces: r.pieces,
        p_detail: r.detail,
        p_recu_le: r.recuLe,
      });
      const o = (d ?? {}) as Record<string, unknown>;
      return {
        id: typeof o.id === "number" ? o.id : Number(o.id ?? 0),
        nouvelle: o.nouvelle === true,
      };
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
