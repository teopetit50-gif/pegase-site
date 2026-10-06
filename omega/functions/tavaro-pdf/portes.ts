// Portes du socle pour l'ouvrier TAVARO-PDF (session B2, 06/10/2026) : l'ouvrier ne voit Postgres que par ces
// fonctions, appelées en RPC avec la clé de service. Aucune écriture directe dans une table (contrat de l'ouvrier).
// Portes du module : loc_pdf_a_produire, loc_enregistrer_pdf, loc_pdf_impossible (migration b2_08).

export type Travail = {
  id: number;
  genre: string;
  charge: Record<string, unknown>;
  cle?: string | null;
  client_id?: string | null;
  essais?: number | null;
  essais_max?: number | null;
};

export type LigneFacture = {
  rang: number;
  libelle: string;
  quantite: number;
  unite: string | null;
  prix_unitaire: number | null;
  montant_ht: number;
  regime_tva: "taxable" | "hors_champ";
  taux_tva: number | null;
  montant_tva: number;
  montant_ttc: number;
};

export type FactureAProduire = {
  id: string;
  reference: string;
  nature: "frais" | "dommages";
  date_facture: string;
  echeance_le: string;
  a_debiter_avant: string | null;
  emetteur: Record<string, string>;
  destinataire: Record<string, string>;
  mentions: Record<string, unknown>;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  pdf_fait: boolean;
  lignes: LigneFacture[];
  photos: { chemin: string; prise_le?: string; legende?: string }[];
};

export type AProduire = {
  proposition: string;
  client: string;
  contrat: string;
  statut: string;
  factures: FactureAProduire[];
};

export type PieceProduite = {
  facture: string;
  nature: "pdf" | "photo";
  chemin: string;
  nom: string;
  mime: string;
  octets: number;
  sha256: string;
  legende?: string;
};

export interface Portes {
  prendreTravaux(genres: string[], nombre: number, bail: string, ouvrier: string): Promise<Travail[]>;
  finirTravail(id: number, resultat: Record<string, unknown>): Promise<void>;
  echouerTravail(id: number, erreur: string, reprendre: boolean): Promise<"repris" | "echec">;
  battreOuvrier(module: string, genres: string[], detail: Record<string, unknown>, attendu: string): Promise<number>;
  pdfAProduire(proposition: string): Promise<AProduire | null>;
  enregistrerPdf(proposition: string, pieces: PieceProduite[]): Promise<Record<string, unknown>>;
  pdfImpossible(proposition: string, erreur: string): Promise<Record<string, unknown>>;
}

export class ErreurPorte extends Error {
  constructor(public readonly porte: string, public readonly statut: number, public readonly corps: string) {
    super(`porte ${porte} : HTTP ${statut} ${corps.slice(0, 300)}`);
    this.name = "ErreurPorte";
  }
}

export type AppelRpc = (nom: string, params: Record<string, unknown>) => Promise<unknown>;

export function rpcSupabase(url: string, cleService: string, fetchImpl: typeof fetch = fetch): AppelRpc {
  return async (nom, params) => {
    const reponse = await fetchImpl(`${url}/rest/v1/rpc/${nom}`, {
      method: "POST",
      headers: { apikey: cleService, Authorization: `Bearer ${cleService}`, "Content-Type": "application/json" },
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
      const l = await rpc("prendre_travaux", { p_genres: genres, p_nombre: nombre, p_bail: bail, p_ouvrier: ouvrier });
      return Array.isArray(l) ? (l as Travail[]) : [];
    },
    async finirTravail(id, resultat) {
      await rpc("finir_travail", { p_id: id, p_resultat: resultat });
    },
    async echouerTravail(id, erreur, reprendre) {
      const r = await rpc("echouer_travail", { p_id: id, p_erreur: erreur, p_reprendre: reprendre });
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
    async pdfAProduire(proposition) {
      return (await rpc("loc_pdf_a_produire", { p_proposition: proposition })) as AProduire | null;
    },
    async enregistrerPdf(proposition, pieces) {
      return ((await rpc("loc_enregistrer_pdf", { p_proposition: proposition, p_pieces: pieces })) ?? {}) as Record<
        string,
        unknown
      >;
    },
    async pdfImpossible(proposition, erreur) {
      return ((await rpc("loc_pdf_impossible", { p_proposition: proposition, p_erreur: erreur })) ?? {}) as Record<
        string,
        unknown
      >;
    },
  };
}

export function portesDepuisEnvironnement(): Portes {
  return portesSupabase(
    rpcSupabase(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""),
  );
}
