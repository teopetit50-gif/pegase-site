// Le dépôt d'un fichier TRA (Cegid Loop le lit à une adresse) : Storage, bucket des clients, avec la clé de service ;
// le fichier est encodé en ANSI (Windows-1252), comme Cegid l'attend, puis une adresse signée est demandée.

import type { ConfigSupabase } from "@partage/portes.ts";
import type { DepotSigne } from "./editeurs/cegid_loop.ts";
import { ErreurEditeur } from "./editeurs/commun.ts";

export const BUCKET_COMPTA = "omega-clients";

// Les caractères de 0x80 à 0x9F de Windows-1252.
const CP1252: Record<string, number> = {
  "€": 0x80,
  "‚": 0x82,
  "ƒ": 0x83,
  "„": 0x84,
  "…": 0x85,
  "†": 0x86,
  "‡": 0x87,
  "ˆ": 0x88,
  "‰": 0x89,
  "Š": 0x8a,
  "‹": 0x8b,
  "Œ": 0x8c,
  "Ž": 0x8e,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "•": 0x95,
  "–": 0x96,
  "—": 0x97,
  "˜": 0x98,
  "™": 0x99,
  "š": 0x9a,
  "›": 0x9b,
  "œ": 0x9c,
  "ž": 0x9e,
  "Ÿ": 0x9f,
};

/** Un texte en Windows-1252 ; un caractère hors de la table devient « ? ». */
export function ansi(texte: string): Uint8Array {
  const octets: number[] = [];
  for (const c of texte) {
    const code = c.codePointAt(0)!;
    if (code < 0x80 || (code >= 0xa0 && code <= 0xff)) octets.push(code);
    else octets.push(CP1252[c] ?? 0x3f);
  }
  return new Uint8Array(octets);
}

export class DepotStorageSigne implements DepotSigne {
  constructor(private readonly cfg: ConfigSupabase, private readonly bucket = BUCKET_COMPTA, private readonly fetchFn: typeof fetch = fetch) {}

  private entetes(extra: Record<string, string> = {}) {
    return { apikey: this.cfg.cleService, Authorization: `Bearer ${this.cfg.cleService}`, ...extra };
  }
  private chemin(c: string) {
    return c.split("/").map(encodeURIComponent).join("/");
  }

  async deposer(chemin: string, contenu: string): Promise<void> {
    let rep: Response;
    try {
      rep = await this.fetchFn(`${this.cfg.url}/storage/v1/object/${this.bucket}/${this.chemin(chemin)}`, {
        method: "POST",
        headers: this.entetes({ "Content-Type": "text/plain; charset=windows-1252", "x-upsert": "true" }),
        body: new Blob([ansi(contenu) as unknown as ArrayBuffer], { type: "text/plain" }),
      });
    } catch (e) {
      throw new ErreurEditeur("temporaire", `dépôt injoignable : ${(e as Error).message}`);
    }
    const t = await rep.text();
    if (!rep.ok) throw new ErreurEditeur("temporaire", `dépôt : HTTP ${rep.status} ${t.slice(0, 200)}`);
  }

  async signer(chemin: string, secondes: number): Promise<string> {
    let rep: Response;
    try {
      rep = await this.fetchFn(`${this.cfg.url}/storage/v1/object/sign/${this.bucket}/${this.chemin(chemin)}`, {
        method: "POST",
        headers: this.entetes({ "Content-Type": "application/json" }),
        body: JSON.stringify({ expiresIn: secondes }),
      });
    } catch (e) {
      throw new ErreurEditeur("temporaire", `signature injoignable : ${(e as Error).message}`);
    }
    const t = await rep.text();
    if (!rep.ok) throw new ErreurEditeur("temporaire", `signature : HTTP ${rep.status} ${t.slice(0, 200)}`);
    const r = JSON.parse(t) as { signedURL?: string };
    if (!r.signedURL) throw new ErreurEditeur("temporaire", "signature : réponse sans signedURL");
    return `${this.cfg.url}/storage/v1${r.signedURL}`;
  }
}
