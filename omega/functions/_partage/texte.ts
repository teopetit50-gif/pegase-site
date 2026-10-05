// Comparer des textes comme un lecteur humain : sans accents, sans casse,
// sans se soucier des espaces (insécables compris) ni des tirets typographiques.

export function normaliser(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/ | | | /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Même chose, tous espaces retirés : pour « 1 234,56 » contre « 1234,56 ». */
export function compacter(s: string): string {
  return normaliser(s).replace(/\s/g, "");
}

/** Cherche la citation dans la page. Renvoie la position (dans le texte normalisé) ou -1. */
export function retrouver(citation: string, page: string): { trouve: boolean; mode: "exact" | "compact" | "aucun" } {
  const c = normaliser(citation);
  if (c.length === 0) return { trouve: false, mode: "aucun" };
  if (normaliser(page).includes(c)) return { trouve: true, mode: "exact" };
  const cc = compacter(citation);
  if (cc.length >= 2 && compacter(page).includes(cc)) return { trouve: true, mode: "compact" };
  return { trouve: false, mode: "aucun" };
}

/** Un montant français ou anglais en nombre : « 1 234,56 » → 1234.56 ; null si ce n'en est pas un. */
export function nombreDepuisTexte(t: unknown): number | null {
  if (typeof t === "number") return Number.isFinite(t) ? t : null;
  if (typeof t !== "string") return null;
  let s = t.replace(/[\s  ]/g, "").replace(/€|eur|\$|usd/gi, "");
  if (/^[-+]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "");
  if (/^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
  s = s.replace(",", ".");
  if (!/^[-+]?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Une date lue (JJ/MM/AAAA, AAAA-MM-JJ, 5 mars 2026…) en ISO ; null sinon. */
export function dateIso(t: unknown): string | null {
  if (typeof t !== "string") return null;
  const s = normaliser(t);
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return valider(m[1], m[2], m[3]);
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (m) {
    const a = m[3].length === 2 ? "20" + m[3] : m[3];
    return valider(a, m[2].padStart(2, "0"), m[1].padStart(2, "0"));
  }
  const mois = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
  m = s.match(/^(\d{1,2})(?:er)?\s+([a-z]+)\.?\s+(\d{4})$/);
  if (m) {
    const i = mois.findIndex((x) => x.startsWith(m![2].slice(0, 3)));
    if (i >= 0) return valider(m[3], String(i + 1).padStart(2, "0"), m[1].padStart(2, "0"));
  }
  return null;
}

function valider(a: string, m: string, j: string): string | null {
  const d = new Date(`${a}-${m}-${j}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.getUTCMonth() + 1 !== Number(m) || d.getUTCDate() !== Number(j)) return null;
  return `${a}-${m}-${j}`;
}

/** Clé Luhn d'un SIREN à 9 chiffres (ou d'un SIRET à 14). */
export function sirenValide(s: string): boolean {
  if (!/^\d{9}$|^\d{14}$/.test(s)) return false;
  let somme = 0;
  for (let i = 0; i < s.length; i++) {
    let n = Number(s[s.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    somme += n;
  }
  return somme % 10 === 0;
}

/** Numéro de TVA intracommunautaire français : FR + clé + SIREN, clé vérifiée. */
export function tvaFrValide(t: string): boolean {
  const s = t.replace(/[\s.\-]/g, "").toUpperCase();
  const m = s.match(/^FR(\d{2})(\d{9})$/);
  if (!m) return false;
  const cle = (12 + 3 * (Number(m[2]) % 97)) % 97;
  return cle === Number(m[1]) && sirenValide(m[2]);
}
