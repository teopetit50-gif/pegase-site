/* ══════════════════════════════════════════════════════════════════════
   L'index aveugle des parties (06/10/2026, session B4, b4_07)

   Les noms des parties sont chiffrés, chacun sous la clé de son dossier :
   le serveur ne peut pas les comparer. Le navigateur normalise donc le nom
   (minuscules, sans accents, sans forme sociale ni civilité, mots triés)
   et en calcule une empreinte HMAC-SHA-256 sous la CLÉ D'INDEX DU CABINET,
   que le serveur n'a jamais en clair. Deux écritures du même nom
   (« SCI du Moulin », « Moulin (SCI du) ») donnent la même empreinte ; un
   SIREN (ou les neuf premiers chiffres d'un SIRET) en donne une autre.
   ══════════════════════════════════════════════════════════════════════ */

/* Formes sociales, civilités et mots vides : ils ne distinguent pas une partie. */
const MOTS_VIDES = new Set([
  "sa", "sas", "sasu", "sarl", "eurl", "sci", "snc", "scp", "scm", "sel", "selarl", "selas", "selafa", "gie", "sca", "scs", "sem", "spl", "gmbh", "ltd", "llc", "inc", "bv", "nv", "spa", "srl",
  "societe", "ste", "cie", "compagnie", "groupe", "holding", "association", "assoc", "syndicat", "sdc",
  "m", "mme", "mlle", "mr", "mrs", "monsieur", "madame", "mademoiselle", "me", "maitre", "dr", "docteur", "pr", "professeur",
  "et", "de", "du", "des", "la", "le", "les", "l", "d", "en", "au", "aux",
]);

export function normaliserNom(nom: string): string {
  const mots = nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((m) => m.length > 1 && !MOTS_VIDES.has(m) && !/^\d+$/.test(m));
  return [...new Set(mots)].sort().join(" ");
}

/** Le SIREN d'un texte (9 chiffres, ou les 9 premiers d'un SIRET de 14) ; null s'il n'y en a pas. */
export function sirenDe(texte: string): string | null {
  const m = texte.replace(/[\s.]/g, "").match(/(?:^|\D)(\d{14}|\d{9})(?:\D|$)/);
  return m ? m[1].slice(0, 9) : null;
}

/** Les formes à indexer pour un nom : le nom normalisé, et le SIREN s'il y en a un. */
export function formesDe(nom: string): string[] {
  const formes: string[] = [];
  const n = normaliserNom(nom);
  if (n) formes.push(`nom:${n}`);
  const s = sirenDe(nom);
  if (s) formes.push(`siren:${s}`);
  return formes;
}

export async function cleHmac(brute: Uint8Array): Promise<CryptoKey> {
  if (brute.length !== 32) throw new Error("Une clé d'index fait 32 octets.");
  const t = new Uint8Array(brute).buffer as ArrayBuffer;
  return crypto.subtle.importKey("raw", t, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

/** Les empreintes d'un nom, en hexadécimal « \x… » (bytea pour la base). */
export async function empreintesDe(cle: CryptoKey, nom: string): Promise<string[]> {
  const sortie: string[] = [];
  for (const forme of formesDe(nom)) {
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(forme)));
    sortie.push("\\x" + Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join(""));
  }
  return sortie;
}
