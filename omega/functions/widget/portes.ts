// Portes du socle pour la messagerie instantanée des sites (lot 19ap_widgets, numéro à confirmer).

export type Apparence = {
  libelle: string;
  couleur: string;
  accueil: string;
  origines: string[];
};

export type Message = {
  cle: string;
  origine: string;
  ipEmpreinte: string;
  conversation: string;
  message: string;
  texte: string;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  page: string | null;
  consentement: boolean;
};

export type Issue =
  | { statut: "recu"; deja?: boolean }
  | {
    statut: "refuse";
    motif: "cle" | "origine" | "message" | "coordonnees" | "plafond";
  };

export interface Portes {
  apparence(cle: string): Promise<Apparence | null>;
  deposer(m: Message): Promise<Issue>;
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
    if (!r.ok) {
      throw new Error(`porte ${nom} : HTTP ${r.status} ${texte.slice(0, 300)}`);
    }
    return texte === "" || texte === "null" ? null : JSON.parse(texte);
  };
}

export function portesSupabase(rpc: AppelRpc): Portes {
  return {
    async apparence(cle) {
      const r = await rpc("widget_apparence", { p_cle: cle });
      return r && typeof r === "object" ? r as Apparence : null;
    },
    async deposer(m) {
      return await rpc("widget_deposer", {
        p_cle: m.cle,
        p_origine: m.origine,
        p_ip_empreinte: m.ipEmpreinte,
        p_conversation: m.conversation,
        p_message: m.message,
        p_texte: m.texte,
        p_nom: m.nom,
        p_email: m.email,
        p_telephone: m.telephone,
        p_page: m.page,
        p_consentement: m.consentement,
      }) as Issue;
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
