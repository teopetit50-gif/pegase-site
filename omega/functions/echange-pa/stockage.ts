// Bucket omega-clients (API Storage, clé de service) : lecture des factures émises et des
// CDAR fabriqués par le socle, dépôt en upsert des documents reçus de la PA.

export interface Stockage {
  lire(chemin: string): Promise<Uint8Array<ArrayBuffer>>;
  deposer(
    chemin: string,
    octets: Uint8Array<ArrayBuffer>,
    typeMime: string,
  ): Promise<void>;
}

export const BUCKET = "omega-clients";

/** Les documents reçus ne sont rattachés à un client que par le socle : préfixe neutre. */
export function cheminEntrant(flux: string, nom: string): string {
  const propre = (v: string) =>
    v.replace(/[<>]/g, "").replace(/[^A-Za-z0-9._@-]/g, "_").slice(0, 150) ||
    "document";
  return `_pa/entrants/${propre(flux)}/${propre(nom)}`;
}

export function stockageSupabase(
  url: string,
  cleService: string,
  fetchImpl: typeof fetch = fetch,
): Stockage {
  const adresse = (chemin: string) =>
    `${url}/storage/v1/object/${BUCKET}/${
      chemin.split("/").map(encodeURIComponent).join("/")
    }`;
  const entetes = { apikey: cleService, Authorization: `Bearer ${cleService}` };
  return {
    async lire(chemin) {
      const r = await fetchImpl(adresse(chemin), { headers: entetes });
      if (!r.ok) {
        throw new Error(
          `${chemin} illisible : HTTP ${r.status} ${
            (await r.text()).slice(0, 200)
          }`,
        );
      }
      return new Uint8Array(await r.arrayBuffer());
    },
    async deposer(chemin, octets, typeMime) {
      const r = await fetchImpl(adresse(chemin), {
        method: "POST",
        headers: {
          ...entetes,
          "Content-Type": typeMime || "application/octet-stream",
          "x-upsert": "true",
        },
        body: octets,
      });
      if (!r.ok) {
        throw new Error(
          `dépôt de ${chemin} refusé : HTTP ${r.status} ${
            (await r.text()).slice(0, 200)
          }`,
        );
      }
    },
  };
}
