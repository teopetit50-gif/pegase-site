// Le Key Manager : une clé maître par cabinet, qui enveloppe et déballe les clés de dossier. La clé maître
// ne sort jamais de chez Scaleway ; on ne lui envoie qu'une clé de dossier (32 octets) à envelopper, ou son
// enveloppe à déballer, avec en données associées l'identifiant du dossier (une enveloppe d'un dossier ne
// se déballe pas au nom d'un autre).
//
// Scaleway Key Manager, API v1alpha1 (https://www.scaleway.com/en/developers/api/key-manager/) :
//   GET  /key-manager/v1alpha1/regions/{region}/keys?project_id=…&name=…&scheduled_for_deletion=false → {keys: Key[], total_count}
//   POST /key-manager/v1alpha1/regions/{region}/keys                  {project_id, name, description, usage, unprotected} → Key
//   POST /key-manager/v1alpha1/regions/{region}/keys/{id}/encrypt     {plaintext, associated_data}   → {key_id, ciphertext}
//   POST /key-manager/v1alpha1/regions/{region}/keys/{id}/decrypt     {ciphertext, associated_data}  → {key_id, plaintext, ciphertext?}
// Key = {id, name, state: enabled | disabled | pending_key_material | scheduled_for_deletion, usage, …}.
// Authentification : en-tête X-Auth-Token (clé secrète d'une application IAM limitée au Key Manager du projet).
// Tout en base64. Relevé le 18/10 sur le schéma OpenAPI officiel (v1alpha1/schema.yml) : scheduled_for_deletion est
// un paramètre REQUIS de la liste ; associated_data y est décrit comme un BytesValue ({value}), alors que les SDK
// l'envoient en chaîne base64 nue : on envoie la chaîne nue et, sur un 400 qui la vise, on retente une fois en {value}
// (sans effet de bord : chiffrer et déchiffrer ne changent rien chez Scaleway). Plaintext : 1 à 65 535 octets.

import { depuisBase64, texte, versBase64 } from "./octets.ts";

export class ErreurCoffre extends Error {
  constructor(readonly code: "KM_ABSENT" | "KM_INDISPONIBLE" | "KM_REFUS" | "KM_REPONSE", message: string, readonly http = 0) {
    super(message);
    this.name = "ErreurCoffre";
  }
}

export interface KeyManager {
  readonly nom: string;
  readonly region: string;
  /** L'identifiant de la clé maître de ce nom, ou null s'il n'y en a pas (rien n'est créé). */
  trouverCle(nom: string): Promise<string | null>;
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
      if (rep.status === 429 || rep.status >= 500) throw new ErreurCoffre("KM_INDISPONIBLE", `Key Manager ${rep.status} : ${motif}`, rep.status);
      throw new ErreurCoffre("KM_REFUS", `Key Manager ${rep.status} : ${motif}`, rep.status);
    }
    try {
      return JSON.parse(brut) as T;
    } catch {
      throw new ErreurCoffre("KM_REPONSE", "réponse du Key Manager illisible");
    }
  }

  async trouverCle(nom: string): Promise<string | null> {
    const q = new URLSearchParams({ project_id: this.projet, name: nom, scheduled_for_deletion: "false" });
    const liste = await this.appeler<{ keys?: { id?: string; name?: string; state?: string }[] }>("GET", `/keys?${q}`);
    // le filtre par nom de Scaleway n'est pas garanti exact : on compare nous-mêmes
    const memes = (liste.keys ?? []).filter((k) => k.name === nom && k.state !== "scheduled_for_deletion");
    const active = memes.find((k) => k.state === "enabled" && k.id);
    if (active) return active.id!;
    // une clé de ce nom existe mais ne sert pas : on n'en crée pas une seconde (les enveloppes resteraient orphelines)
    if (memes.length) {
      throw new ErreurCoffre(
        "KM_REFUS",
        `la clé maître ${nom} existe chez Scaleway mais n'est pas active (${memes[0].state ?? "état inconnu"}) : la réactiver`,
      );
    }
    return null;
  }

  async trouverOuCreerCle(nom: string, description: string): Promise<string> {
    const deja = await this.trouverCle(nom);
    if (deja) return deja;
    const cree = await this.appeler<{ id?: string; state?: string }>("POST", "/keys", {
      project_id: this.projet,
      name: nom,
      description,
      usage: { symmetric_encryption: "aes_256_gcm" },
      unprotected: false,
      tags: ["omega", "tamila"],
    });
    if (!cree.id) throw new ErreurCoffre("KM_REPONSE", "le Key Manager n'a pas rendu l'identifiant de la clé créée");
    if (cree.state && cree.state !== "enabled") throw new ErreurCoffre("KM_REPONSE", `la clé maître créée n'est pas active (${cree.state})`);
    return cree.id;
  }

  /** chiffrer / déchiffrer : associated_data en chaîne nue, puis en {value} si Scaleway refuse la première forme. */
  private adEnObjet = false;
  private async avecDonneesAssociees<T>(chemin: string, corps: Record<string, unknown>, ad: string): Promise<T> {
    const b64 = versBase64(texte(ad));
    try {
      return await this.appeler<T>("POST", chemin, { ...corps, associated_data: this.adEnObjet ? { value: b64 } : b64 });
    } catch (e) {
      if (this.adEnObjet || !(e instanceof ErreurCoffre) || e.http !== 400 || !/associated_data/i.test(e.message)) throw e;
      this.adEnObjet = true;
      return await this.appeler<T>("POST", chemin, { ...corps, associated_data: { value: b64 } });
    }
  }

  async chiffrer(cle: string, clair: Uint8Array, donneesAssociees: string): Promise<Uint8Array> {
    const r = await this.avecDonneesAssociees<{ ciphertext?: string }>(
      `/keys/${encodeURIComponent(cle)}/encrypt`,
      { plaintext: versBase64(clair) },
      donneesAssociees,
    );
    if (!r.ciphertext) throw new ErreurCoffre("KM_REPONSE", "le Key Manager n'a pas rendu d'enveloppe");
    return depuisBase64(r.ciphertext);
  }

  async dechiffrer(cle: string, chiffre: Uint8Array, donneesAssociees: string): Promise<Uint8Array> {
    const r = await this.avecDonneesAssociees<{ plaintext?: string }>(
      `/keys/${encodeURIComponent(cle)}/decrypt`,
      { ciphertext: versBase64(chiffre) },
      donneesAssociees,
    );
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
