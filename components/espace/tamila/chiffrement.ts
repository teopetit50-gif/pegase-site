/* ══════════════════════════════════════════════════════════════════════
   Le chiffrement des dossiers Tamila, dans le navigateur (05/10/2026, B4)

   Le socle ne garde que des bytea : référence, intitulé, n° RG, noms des
   parties, motif d'une muraille. Le format que vérifie
   private.tamila_chiffre_valide est : un octet de version (1), puis au
   moins 28 octets. Ici : 01 ‖ nonce (12) ‖ chiffré ‖ étiquette GCM (16),
   AES-256-GCM par WebCrypto — jamais une bibliothèque tierce.

   La clé d'un dossier (32 octets aléatoires) est ENVELOPPÉE avant d'être
   confiée au socle (tamila_cles.enveloppe, fournisseur « local ») :
   01 ‖ sel (16) ‖ nonce (12) ‖ clé chiffrée + étiquette (48), soit 77
   octets, sous une clé dérivée de la PHRASE DU CABINET (PBKDF2-SHA-256,
   310 000 tours). La phrase ne quitte pas le navigateur : elle vit dans
   sessionStorage le temps de l'onglet. Le serveur ne la connaît pas et ne
   peut donc rien lire — c'est le sens du secret professionnel sur la
   vitrine. Pour aller plus loin (coffre Scaleway, fournisseur « scaleway »),
   voir NOTES-B4.md.

   Les bytea voyagent en hexadécimal : « \x01ab… » (forme rendue par
   Supabase et acceptée par PostgREST pour les paramètres bytea).
   ══════════════════════════════════════════════════════════════════════ */

const VERSION = 1;
const TOURS = 310_000;
const CLE_PHRASE = "espace.tamila.phrase";

const enc = new TextEncoder();
const dec = new TextDecoder();

export function versHex(octets: Uint8Array): string {
  let s = "\\x";
  for (const o of octets) s += o.toString(16).padStart(2, "0");
  return s;
}

export function depuisHex(hex: string | null | undefined): Uint8Array | null {
  if (!hex) return null;
  const h = hex.startsWith("\\x") ? hex.slice(2) : hex;
  if (h.length % 2 || /[^0-9a-fA-F]/.test(h)) return null;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/* WebCrypto veut un ArrayBuffer « plein » : on recopie la vue (jamais partagée). */
function tampon(u: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(u.byteLength);
  new Uint8Array(out).set(u);
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const n = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(n);
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
}

function aleatoire(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

/** La phrase du cabinet mémorisée pour l'onglet (jamais envoyée). */
export function phraseMemorisee(): string | null {
  try {
    return window.sessionStorage.getItem(CLE_PHRASE);
  } catch {
    return null;
  }
}

export function memoriserPhrase(phrase: string | null) {
  try {
    if (phrase) window.sessionStorage.setItem(CLE_PHRASE, phrase);
    else window.sessionStorage.removeItem(CLE_PHRASE);
  } catch {
    /* sans mémoire de session, la phrase vaut pour la page */
  }
}

/** Une clé de dossier neuve (AES-256-GCM, exportable pour l'enveloppe). */
export async function genererCle(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function chiffrer(cle: CryptoKey, texte: string): Promise<string> {
  const nonce = aleatoire(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: tampon(nonce) }, cle, tampon(enc.encode(texte))));
  return versHex(concat(new Uint8Array([VERSION]), nonce, ct));
}

export async function dechiffrer(cle: CryptoKey, hex: string | null | undefined): Promise<string | null> {
  const b = depuisHex(hex);
  if (!b || b.length < 29 || b[0] !== VERSION) return null;
  try {
    const clair = await crypto.subtle.decrypt({ name: "AES-GCM", iv: tampon(b.slice(1, 13)) }, cle, tampon(b.slice(13)));
    return dec.decode(clair);
  } catch {
    return null;
  }
}

async function cleDePhrase(phrase: string, sel: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", tampon(enc.encode(phrase.normalize("NFKC"))), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: tampon(sel), iterations: TOURS, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

/** La clé du dossier enveloppée sous la phrase du cabinet : 77 octets. */
export async function envelopper(cle: CryptoKey, phrase: string): Promise<string> {
  const brute = new Uint8Array(await crypto.subtle.exportKey("raw", cle));
  const sel = aleatoire(16);
  const nonce = aleatoire(12);
  const k = await cleDePhrase(phrase, sel);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: tampon(nonce) }, k, tampon(brute)));
  return versHex(concat(new Uint8Array([VERSION]), sel, nonce, ct));
}

/** Déballe une enveloppe « local » ; null si la phrase n'est pas la bonne. */
export async function desenvelopper(enveloppeHex: string, phrase: string): Promise<CryptoKey | null> {
  const b = depuisHex(enveloppeHex);
  if (!b || b.length !== 77 || b[0] !== VERSION) return null;
  try {
    const k = await cleDePhrase(phrase, b.slice(1, 17));
    const brute = await crypto.subtle.decrypt({ name: "AES-GCM", iv: tampon(b.slice(17, 29)) }, k, tampon(b.slice(29)));
    return crypto.subtle.importKey("raw", brute, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  } catch {
    return null;
  }
}

/** Le trousseau d'un onglet : les clés déballées, par dossier. Rien n'est écrit nulle part. */
export class Trousseau {
  private cles = new Map<string, CryptoKey>();

  poser(dossier: string, cle: CryptoKey) {
    this.cles.set(dossier, cle);
  }

  lire(dossier: string): CryptoKey | null {
    return this.cles.get(dossier) ?? null;
  }

  async ouvrir(dossier: string, enveloppeHex: string, phrase: string): Promise<CryptoKey | null> {
    const deja = this.cles.get(dossier);
    if (deja) return deja;
    const k = await desenvelopper(enveloppeHex, phrase);
    if (k) this.cles.set(dossier, k);
    return k;
  }

  vider() {
    this.cles.clear();
  }
}
