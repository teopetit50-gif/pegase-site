// Où le bac à sable garde ses flux : en mémoire (tests, serveur local) ou dans le bucket
// omega-clients sous `_pa/bac-a-sable/` (fonction Edge : une instance ne garde rien entre
// deux appels). Aucune table : le bac à sable n'est pas une donnée d'Omega.

export type FluxBac = {
  flowId: string;
  trackingId?: string;
  name: string;
  processingRule?: string;
  flowSyntax: string;
  flowProfile?: string;
  sha256: string;
  submittedAt: string;
  updatedAt: string;
  flowType: string;
  processingRuleSource: string;
  flowDirection: "In" | "Out";
  acknowledgement: {
    status: "Pending" | "Ok" | "Error";
    details?: {
      level: string;
      item: string;
      reasonCode: string;
      reasonMessage: string;
    }[];
  };
  /** Propre au bac à sable : type du fichier, pour le rendre tel quel. */
  mime: string;
};

export interface Depot {
  lireFlux(id: string): Promise<FluxBac | null>;
  ecrireFlux(f: FluxBac): Promise<void>;
  listerFlux(): Promise<FluxBac[]>;
  lireFichier(id: string): Promise<Uint8Array<ArrayBuffer> | null>;
  ecrireFichier(
    id: string,
    octets: Uint8Array<ArrayBuffer>,
    mime: string,
  ): Promise<void>;
}

export function depotMemoire(): Depot & { flux: Map<string, FluxBac> } {
  const flux = new Map<string, FluxBac>();
  const fichiers = new Map<string, Uint8Array<ArrayBuffer>>();
  return {
    flux,
    lireFlux: (id) => Promise.resolve(flux.get(id) ?? null),
    ecrireFlux: (f) =>
      Promise.resolve(void flux.set(f.flowId, structuredClone(f))),
    listerFlux: () =>
      Promise.resolve([...flux.values()].map((f) => structuredClone(f))),
    lireFichier: (id) => Promise.resolve(fichiers.get(id) ?? null),
    ecrireFichier: (id, octets) =>
      Promise.resolve(void fichiers.set(id, octets)),
  };
}

const BUCKET = "omega-clients";
const PREFIXE = "_pa/bac-a-sable";

export function depotBucket(
  url: string,
  cleService: string,
  fetchImpl: typeof fetch = fetch,
): Depot {
  const entetes = { apikey: cleService, Authorization: `Bearer ${cleService}` };
  const objet = (chemin: string) =>
    `${url}/storage/v1/object/${BUCKET}/${PREFIXE}/${chemin}`;
  async function lire(chemin: string): Promise<Uint8Array<ArrayBuffer> | null> {
    const r = await fetchImpl(objet(chemin), { headers: entetes });
    if (r.status === 400 || r.status === 404) {
      await r.body?.cancel();
      return null;
    }
    if (!r.ok) {
      throw new Error(`bac à sable : lecture ${chemin} HTTP ${r.status}`);
    }
    return new Uint8Array(await r.arrayBuffer());
  }
  async function ecrire(
    chemin: string,
    octets: Uint8Array<ArrayBuffer>,
    mime: string,
  ) {
    const r = await fetchImpl(objet(chemin), {
      method: "POST",
      headers: { ...entetes, "Content-Type": mime, "x-upsert": "true" },
      body: octets,
    });
    if (!r.ok) {
      throw new Error(
        `bac à sable : écriture ${chemin} HTTP ${r.status} ${
          (await r.text()).slice(0, 200)
        }`,
      );
    }
  }
  const versJson = (o: Uint8Array | null) =>
    o ? JSON.parse(new TextDecoder().decode(o)) as FluxBac : null;
  return {
    async lireFlux(id) {
      return versJson(await lire(`flux/${encodeURIComponent(id)}.json`));
    },
    async ecrireFlux(f) {
      await ecrire(
        `flux/${encodeURIComponent(f.flowId)}.json`,
        new TextEncoder().encode(JSON.stringify(f)) as Uint8Array<ArrayBuffer>,
        "application/json",
      );
    },
    async listerFlux() {
      const r = await fetchImpl(`${url}/storage/v1/object/list/${BUCKET}`, {
        method: "POST",
        headers: { ...entetes, "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix: `${PREFIXE}/flux/`,
          limit: 1000,
          offset: 0,
        }),
      });
      if (!r.ok) throw new Error(`bac à sable : liste HTTP ${r.status}`);
      const noms = (await r.json() as { name: string }[]).map((o) => o.name)
        .filter((n) => n.endsWith(".json"));
      const flux = await Promise.all(
        noms.map(async (n) => versJson(await lire(`flux/${n}`))),
      );
      return flux.filter((f): f is FluxBac => f !== null);
    },
    lireFichier(id) {
      return lire(`fichiers/${encodeURIComponent(id)}`);
    },
    ecrireFichier(id, octets, mime) {
      return ecrire(`fichiers/${encodeURIComponent(id)}`, octets, mime);
    },
  };
}
