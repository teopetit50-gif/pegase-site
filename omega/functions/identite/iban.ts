// L'IBAN : structure (ISO 13616), longueur selon le pays, clé mod 97. Aucun
// registre public ne dit à qui appartient un compte : ici, seulement la forme.

/** Longueur de l'IBAN par pays (registre SWIFT, pays de la zone SEPA et voisins). */
// deno-fmt-ignore
export const LONGUEURS_IBAN: Record<string, number> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29, BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24,
  DE: 22, DK: 18, DO: 28, EE: 20, EG: 29, ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28,
  HR: 21, HU: 28, IE: 22, IL: 23, IQ: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28, LC: 32, LI: 21, LT: 20, LU: 20,
  LV: 21, LY: 25, MC: 27, MD: 24, ME: 22, MK: 19, MR: 27, MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25,
  QA: 29, RO: 24, RS: 22, SA: 24, SC: 31, SD: 18, SE: 24, SI: 19, SK: 24, SM: 27, ST: 25, SV: 28, TL: 23, TN: 24, TR: 26,
  UA: 29, VA: 22, VG: 24, XK: 20,
};

/** Les pays dont l'IBAN est tenu dans la zone SEPA (virement SEPA possible). */
// deno-fmt-ignore
export const PAYS_SEPA = new Set([
  "AD", "AT", "BE", "BG", "CH", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GB", "GI", "GR", "HR", "HU", "IE", "IS", "IT",
  "LI", "LT", "LU", "LV", "MC", "MT", "NL", "NO", "PL", "PT", "RO", "SE", "SI", "SK", "SM", "VA",
]);

export interface AnalyseIban {
  iban: string;
  pays: string;
  /** Format, longueur du pays et clé mod 97 : tout tient. */
  valide: boolean;
  longueur_ok: boolean;
  cle_ok: boolean;
  sepa: boolean;
  /** Code banque pour un IBAN français (5 chiffres), sinon null. */
  banque_fr: string | null;
  motif: string;
}

export function normaliserIban(iban: unknown): string {
  return String(iban ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Clé mod 97 des caractères déplacés (les lettres valent A=10 … Z=35), calculée par tranches pour rester entier. */
export function mod97(chaine: string): number {
  let reste = 0;
  for (const c of chaine) {
    const v = c >= "A" && c <= "Z" ? String(c.charCodeAt(0) - 55) : c;
    for (const d of v) reste = (reste * 10 + Number(d)) % 97;
  }
  return reste;
}

export function analyserIban(iban: unknown): AnalyseIban {
  const v = normaliserIban(iban);
  const pays = v.slice(0, 2);
  const base = { iban: v, pays, sepa: PAYS_SEPA.has(pays), banque_fr: null as string | null };
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(v)) {
    return { ...base, valide: false, longueur_ok: false, cle_ok: false, motif: "Forme inattendue : deux lettres, deux chiffres, puis 11 à 30 caractères." };
  }
  const attendue = LONGUEURS_IBAN[pays];
  const longueur_ok = attendue !== undefined && v.length === attendue;
  const cle_ok = mod97(v.slice(4) + v.slice(0, 4)) === 1;
  const banque_fr = pays === "FR" && longueur_ok ? v.slice(4, 9) : null;
  let motif: string;
  if (attendue === undefined) motif = `Pays ${pays} inconnu du registre des IBAN.`;
  else if (!longueur_ok) motif = `Longueur ${v.length} pour ${pays}, attendue ${attendue}.`;
  else if (!cle_ok) motif = "La clé de contrôle ne tombe pas juste.";
  else motif = `IBAN ${pays} bien formé${base.sepa ? ", zone SEPA" : ", hors zone SEPA"}.`;
  return { ...base, valide: longueur_ok && cle_ok, longueur_ok, cle_ok, banque_fr, motif };
}

/** Les quatre premiers et les quatre derniers caractères, le reste masqué : ce qui peut s'écrire dans un journal. */
export function masquerIban(iban: unknown): string {
  const v = normaliserIban(iban);
  return v.length <= 8 ? v : `${v.slice(0, 4)}…${v.slice(-4)}`;
}
