// Le Key Manager : une clé maître par cabinet, qui enveloppe et déballe les clés de dossier. La clé maître
// ne sort jamais de chez Scaleway ; on ne lui envoie qu'une clé de dossier (32 octets) à envelopper, ou son
// enveloppe à déballer, avec en données associées l'identifiant du dossier (une enveloppe d'un dossier ne
// se déballe pas au nom d'un autre).
//
// Scaleway Key Manager, API v1alpha1 (https://www.scaleway.com/en/developers/api/key-manager/) :
//   GET  /key-manager/v1alpha1/regions/{region}/keys?project_id=…&name=…
//   POST /key-manager/v1alpha1/regions/{region}/keys                  {project_id, name, description, usage, unprotected}
//   POST /key-manager/v1alpha1/regions/{region}/keys/{id}/encrypt     {plaintext, associated_data}   → {ciphertext}
//   POST /key-manager/v1alpha1/regions/{region}/keys/{id}/decrypt     {ciphertext, associated_data}  → {plaintext}
// Authentification : en-tête X-Auth-Token (clé secrète d'une application IAM limitée au Key Manager du projet).
// Tout en base64. À revérifier sur le premier vrai compte : la forme exacte des réponses (NOTES-B4 § 10).

import { depuisBase64, texte, versBase64 } from "./octets.ts";

export class ErreurCoffre extends Error {
  constructor(readonly code: "KM_ABSENT" | "KM_INDISPONIBLE" | "KM_REFUS" | "KM_REPONSE", message: string) {
    super(message);
    this.name = "ErreurCoffre";
  }
}

export interface KeyManager {
  readonly nom: string;
  readonly region: string;
  /** L'identifiant de la clé maître de ce nom ; créée si elle n'existe pas (idempotent). */
  trouverOuCreerCle(nom: string, description: string): Promise<string>;
  chiffrer(cle: string, clair: Uint8Array, donneesAssociees: string): Promise<Uint8Array>;
  dechiffrer(cle: string, chiffre: Uint8Array, donneesAssociees: string): Promise<Uint8Array>;
}

export interface Env {
  get(nom: string): string | undefined;
}

/** Le nom de la clé maître d'un cabinet chez Scaleway. */
export function nomCleMaitre(client: string): string {
  return `omega-tamila-${client}`;
}

export class ScalewayKeyManager implements KeyManager {
  readonly nom = "scaleway";
  private readonly base: string;

  constructor(
    private readonly cleSecrete: string,
    private readonly projet: string,
    readonly region: string,
    private readonly fetchFn: typeof fetch = fetch,
    api = "https://api.scaleway.com",
  ) {
    if (!/^[a-z]{2}-[a-z]{3}$/.test(region)) throw new ErreurCoffre("KM_ABSENT", `région Scaleway illisible : ${region}`);
    this.base = `${api.replace(/\/+$/, "")}/key-manager/v1alpha1/regions/${region}`;
  }

  private async appeler<T>(methode: "GET" | "POST", chemin: string, corps?: unknown): Promise<T> {
    let rep: Response;
    try {
      rep = await this.fetchFn(this.base + chemin, {
        method: methode,
        headers: { "X-Auth-Token": this.cleSecrete, "Content-Type": "application/json" },
        ...(corps === undefined ? {} : { body: JSON.stringify(corps) }),
      });
    } catch (e) {
      throw new ErreurCoffre("KM_INDISPONIBLE", `Key Manager injoignable : ${(e as Error).message}`);
    }
    const brut = await rep.text();
    if (!rep.ok) {
      // Jamais le corps de la requête dans un message : il porte une clé ou une enveloppe.
      const motif = brut.slice(0, 300);
      if (rep.status === 429 || rep.status >= 500) throw new ErreurCoffre("KM_INDISPONIBLE", `Key Manager ${rep.status} : ${motif}`);
      throw new ErreurCoffre("KM_REFUS", `Key Manager ${rep.status} : ${motif}`);
    }
    try {
      return JSON.parse(brut) as T;
    } catch {
      throw new ErreurCoffre("KM_REPONSE", "réponse du Key Manager illisible");
    }
  }

  async trouverOuCreerCle(nom: string, description: string): Promise<string> {
    const q = new URLSearchParams({ project_id: this.projet, name: nom });
    const liste = await this.appeler<{ keys?: { id: string; name: string; state?: string }[] }>("GET", `/keys?${q}`);
    const deja = (liste.keys ?? []).find((k) => k.name === nom && k.state !== "pending_deletion" && k.state !== "deleted");
    if (deja) return deja.id;
    const cree = await this.appeler<{ id?: string }>("POST", "/keys", {
      project_id: this.projet,
      name: nom,
      description,
      usage: { symmetric_encryption: "aes_256_gcm" },
      unprotected: false,
      tags: ["omega", "tamila"],
    });
    if (!cree.id) throw new ErreurCoffre("KM_REPONSE", "le Key Manager n'a pas rendu l'identifiant de la clé créée");
    return cree.id;
  }

  async chiffrer(cle: string, clair: Uint8Array, donneesAssociees: string): Promise<Uint8Array> {
    const r = await this.appeler<{ ciphertext?: string }>("POST", `/keys/${encodeURIComponent(cle)}/encrypt`, {
      plaintext: versBase64(clair),
      associated_data: versBase64(texte(donneesAssociees)),
    });
    if (!r.ciphertext) throw new ErreurCoffre("KM_REPONSE", "le Key Manager n'a pas rendu d'enveloppe");
    return depuisBase64(r.ciphertext);
  }

  async dechiffrer(cle: string, chiffre: Uint8Array, donneesAssociees: string): Promise<Uint8Array> {
    const r = await this.appeler<{ plaintext?: string }>("POST", `/keys/${encodeURIComponent(cle)}/decrypt`, {
      ciphertext: versBase64(chiffre),
      associated_data: versBase64(texte(donneesAssociees)),
    });
    if (!r.plaintext) throw new ErreurCoffre("KM_REPONSE", "le Key Manager n'a pas rendu de clé");
    return depuisBase64(r.plaintext);
  }
}

/** Les secrets que Teo posera : SCALEWAY_SECRET_KEY, SCALEWAY_PROJECT_ID, SCALEWAY_REGION (fr-par par défaut). */
export function keyManagerDepuisEnv(env: Env, fetchFn: typeof fetch = fetch): KeyManager | null {
  const cle = env.get("SCALEWAY_SECRET_KEY");
  const projet = env.get("SCALEWAY_PROJECT_ID");
  if (!cle || !projet) return null;
  return new ScalewayKeyManager(cle, projet, env.get("SCALEWAY_REGION") || "fr-par", fetchFn, env.get("SCALEWAY_API") || undefined);
}
