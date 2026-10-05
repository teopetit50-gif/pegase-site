// Porte du socle utilisée par le webhook Brevo : noter_remise.
// Signature lue sur la recette par le coordinateur (05/10/2026) :
//   noter_remise(p_fournisseur text, p_reference text, p_evenement text,
//                p_detail jsonb = '{}', p_survenu_le timestamptz = null, p_cle text) → boolean
// Clé = (fournisseur, reference_externe). Renvoie false si aucun envoi ne porte la référence.
// p_cle rend la porte idempotente : un événement déjà noté sous cette clé est ignoré.

export type EvenementRemise =
  | "remis"
  | "rebond_temporaire"
  | "rebond"
  | "plainte"
  | "refuse";

export type DetailRemise = { code: string; raison: string };

export interface Portes {
  noterRemise(
    fournisseur: string,
    reference: string,
    evenement: EvenementRemise,
    detail: DetailRemise,
    survenuLe: string | null,
    cle: string,
  ): Promise<boolean>;
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
    async noterRemise(
      fournisseur,
      reference,
      evenement,
      detail,
      survenuLe,
      cle,
    ) {
      const r = await rpc("noter_remise", {
        p_fournisseur: fournisseur,
        p_reference: reference.slice(0, 300),
        p_evenement: evenement,
        p_detail: {
          code: detail.code.slice(0, 100),
          raison: detail.raison.slice(0, 300),
        },
        p_survenu_le: survenuLe,
        p_cle: cle,
      });
      return r === true;
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
