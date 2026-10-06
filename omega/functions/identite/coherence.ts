// Ce qui se vérifie sans réseau : la clé de Luhn d'un SIREN ou d'un SIRET, la
// clé d'un numéro de TVA français, le SIREN que porte un numéro FR, et la
// ressemblance de deux raisons sociales rendues par deux registres.

/** Lettres et chiffres en majuscules, rien d'autre ; null si vide. */
export function normaliser(valeur: unknown): string | null {
  const v = String(valeur ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return v === "" ? null : v;
}

export function luhn(chiffres: string): boolean {
  if (!/^[0-9]+$/.test(chiffres)) return false;
  let somme = 0;
  for (let i = 0; i < chiffres.length; i++) {
    let n = Number(chiffres[chiffres.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    somme += n;
  }
  return somme % 10 === 0;
}

export function sirenValide(siren: unknown): boolean {
  const s = normaliser(siren);
  return s !== null && /^[0-9]{9}$/.test(s) && luhn(s);
}

/** Un SIRET (14 chiffres) : Luhn sur l'ensemble. La Poste (356000000) fait exception : somme des chiffres multiple de 5. */
export function siretValide(siret: unknown): boolean {
  const s = normaliser(siret);
  if (s === null || !/^[0-9]{14}$/.test(s)) return false;
  if (s.startsWith("356000000")) {
    const somme = [...s].reduce((a, c) => a + Number(c), 0);
    return somme % 5 === 0;
  }
  return luhn(s);
}

/** La clé d'un numéro de TVA français pour un SIREN : (12 + 3 × (SIREN mod 97)) mod 97, sur deux chiffres. */
export function cleTvaFr(siren: string): string {
  const s = normaliser(siren) ?? "";
  if (!/^[0-9]{9}$/.test(s)) throw new Error("SIREN attendu : neuf chiffres.");
  const cle = (12 + 3 * (Number(s) % 97)) % 97;
  return String(cle).padStart(2, "0");
}

/** Le numéro de TVA français qu'un SIREN devrait porter. */
export function tvaFrDepuisSiren(siren: string): string {
  const s = normaliser(siren) ?? "";
  return `FR${cleTvaFr(s)}${s}`;
}

export interface AnalyseTvaFr {
  /** Le numéro, normalisé. */
  numero: string;
  /** Les deux caractères de clé. */
  cle: string;
  siren: string;
  /** La clé numérique tombe juste ; null pour une clé alphanumérique (anciens numéros), que l'on ne sait pas vérifier. */
  cle_ok: boolean | null;
  siren_ok: boolean;
}

/** Analyse d'un numéro de TVA français ; null si ce n'en est pas un. */
export function analyserTvaFr(tva: unknown): AnalyseTvaFr | null {
  const v = normaliser(tva);
  if (v === null) return null;
  const m = /^FR([0-9A-HJ-NP-Z]{2})([0-9]{9})$/.exec(v);
  if (!m) return null;
  const [, cle, siren] = m;
  const cle_ok = /^[0-9]{2}$/.test(cle) ? cle === cleTvaFr(siren) : null;
  return { numero: v, cle, siren, cle_ok, siren_ok: sirenValide(siren) };
}

/** Pays et numéro d'un identifiant de TVA de l'Union (deux lettres + le reste), ou null. */
export function decomposerTva(tva: unknown): { pays: string; numero: string } | null {
  const v = normaliser(tva);
  if (v === null) return null;
  const m = /^([A-Z]{2})([A-Z0-9]{2,13})$/.exec(v);
  return m ? { pays: m[1], numero: m[2] } : null;
}

// deno-fmt-ignore
const FORMES_JURIDIQUES = new Set([
  "SA", "SAS", "SASU", "SARL", "EURL", "SNC", "SCI", "SCM", "SCP", "SCOP", "SEL", "SELARL", "SELAS", "SELAFA", "SELCA",
  "GIE", "EARL", "GAEC", "SCEA", "EI", "EIRL", "SOCIETE", "STE", "SOC", "ETS", "ETABLISSEMENTS", "ETABLISSEMENT", "CIE",
  "COMPAGNIE", "GROUPE", "GMBH", "AG", "BV", "NV", "LTD", "LIMITED", "SRL", "SPA", "SL", "SRO", "SP", "ZOO", "OY", "AB", "AS",
  "APS", "KFT", "OOD", "DOO", "UAB", "SIA", "LLC", "INC", "PLC", "LE", "LA", "LES", "DE", "DU", "DES", "ET", "AND", "THE", "D", "L",
]);

/** Les mots utiles d'une raison sociale : sans accent, sans forme juridique, sans ponctuation. */
export function motsDeNom(nom: unknown): string[] {
  const sansAccent = String(nom ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  return sansAccent
    // « S.A.S. » et « E.U.R.L. » : les points d'abréviation collés aux lettres s'effacent avant la coupe.
    .replace(/\.(?=\S)/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .split(" ")
    .filter((m) => m.length > 0 && !FORMES_JURIDIQUES.has(m));
}

/**
 * Deux raisons sociales désignent-elles la même entreprise ? Vrai si les mots de l'une sont tous dans l'autre,
 * ou si plus de la moitié des mots sont communs. Null si l'un des deux noms est vide (rien à comparer).
 */
export function nomsConcordent(a: unknown, b: unknown): boolean | null {
  const ma = motsDeNom(a);
  const mb = motsDeNom(b);
  if (ma.length === 0 || mb.length === 0) return null;
  const sa = new Set(ma);
  const sb = new Set(mb);
  const communs = [...sa].filter((m) => sb.has(m)).length;
  if (communs === sa.size || communs === sb.size) return true;
  const union = new Set([...sa, ...sb]).size;
  return communs / union >= 0.5;
}
