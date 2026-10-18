// Le bucket omega-clients, par l'API Storage avec la clé de service : lire une photo (pour la joindre), déposer un PDF.

export interface Stockage {
  lire(chemin: string): Promise<Uint8Array>;
  deposer(chemin: string, octets: Uint8Array, mime: string): Promise<void>;
}

export const BUCKET = "omega-clients";

const encoder = (chemin: string) => chemin.split("/").map(encodeURIComponent).join("/");

export function stockageSupabase(url: string, cleService: string, fetchImpl: typeof fetch = fetch): Stockage {
  const entetes = { apikey: cleService, Authorization: `Bearer ${cleService}` };
  return {
    async lire(chemin) {
      const r = await fetchImpl(`${url}/storage/v1/object/${BUCKET}/${encoder(chemin)}`, { headers: entetes });
      if (!r.ok) throw new Error(`lecture ${chemin} : HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
      return new Uint8Array(await r.arrayBuffer());
    },
    async deposer(chemin, octets, mime) {
      const r = await fetchImpl(`${url}/storage/v1/object/${BUCKET}/${encoder(chemin)}`, {
        method: "POST",
        headers: { ...entetes, "Content-Type": mime, "x-upsert": "true" },
        body: new Uint8Array(octets), // une copie sur un ArrayBuffer : ce que fetch accepte comme corps
      });
      if (!r.ok) throw new Error(`dépôt ${chemin} : HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
    },
  };
}

export async function sha256(octets: Uint8Array): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new Uint8Array(octets));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function mimeDe(chemin: string): string {
  const e = chemin.toLowerCase().split(".").pop() ?? "";
  return e === "png"
    ? "image/png"
    : e === "webp"
    ? "image/webp"
    : e === "heic"
    ? "image/heic"
    : e === "pdf"
    ? "application/pdf"
    : "image/jpeg";
}
