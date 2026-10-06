// VIES, le service de la Commission européenne qui confirme un numéro de TVA
// intracommunautaire. Sans clé. Les bases nationales derrière lui sont coupées
// par moments : « indisponible » n'est jamais une réponse définitive.

import { decomposerTva } from "./coherence.ts";

export interface ReponseVies {
  etat: "valide" | "invalide" | "indisponible";
  preuve: Record<string, unknown>;
  motif?: string;
}

export interface Vies {
  readonly nom: string;
  consulter(pays: string, numero: string): Promise<ReponseVies>;
}

const DELAI_MS = 12_000;

/** Les codes de VIES qui ne sont pas une réponse sur le numéro. */
export const CODES_INDISPONIBLE = new Set([
  "MS_UNAVAILABLE",
  "SERVICE_UNAVAILABLE",
  "TIMEOUT",
  "MS_MAX_CONCURRENT_REQ",
  "GLOBAL_MAX_CONCURRENT_REQ",
  "MS_MAX_CONCURRENT_REQ_TIME",
  "GLOBAL_MAX_CONCURRENT_REQ_TIME",
  "IP_BLOCKED",
  "VAT_BLOCKED",
]);

export class ViesRest implements Vies {
  readonly nom = "vies";
  constructor(private readonly fetchFn: typeof fetch = fetch, private readonly url = "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number") {}

  async consulter(pays: string, numero: string): Promise<ReponseVies> {
    let rep: Response;
    try {
      rep = await this.fetchFn(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ countryCode: pays, vatNumber: numero }),
        signal: AbortSignal.timeout(DELAI_MS),
      });
    } catch (e) {
      return { etat: "indisponible", preuve: {}, motif: `VIES injoignable : ${(e as Error).message}` };
    }
    const texte = await rep.text();
    if (!rep.ok) {
      return { etat: "indisponible", preuve: {}, motif: `VIES : HTTP ${rep.status} ${texte.slice(0, 200)}` };
    }
    let corps: Record<string, unknown>;
    try {
      corps = JSON.parse(texte);
    } catch {
      return { etat: "indisponible", preuve: {}, motif: "VIES : réponse illisible." };
    }
    return lireReponseVies(pays, numero, corps);
  }
}

function propre(valeur: unknown): string | null {
  if (valeur === null || valeur === undefined) return null;
  const v = String(valeur).replace(/\s+/g, " ").trim();
  return v === "" || v === "---" ? null : v;
}

export function lireReponseVies(pays: string, numero: string, corps: Record<string, unknown>): ReponseVies {
  const code = String(corps.userError ?? "").toUpperCase();
  if (code && code !== "VALID" && code !== "INVALID") {
    if (CODES_INDISPONIBLE.has(code)) return { etat: "indisponible", preuve: {}, motif: `VIES : ${code}` };
    if (code === "INVALID_INPUT") {
      return {
        etat: "invalide",
        preuve: { registre: "vies", pays, numero, motif: "VIES refuse la forme du numéro (INVALID_INPUT).", consulte_le: new Date().toISOString() },
      };
    }
    return { etat: "indisponible", preuve: {}, motif: `VIES : code inattendu ${code}` };
  }
  const valide = corps.valid === true;
  const preuve: Record<string, unknown> = {
    registre: "vies",
    pays,
    numero,
    etat: valide ? "valide" : "invalide",
    consulte_le: propre(corps.requestDate) ?? new Date().toISOString(),
  };
  if (valide) {
    const nom = propre(corps.name);
    const adresse = propre(corps.address);
    if (nom) preuve.nom = nom;
    if (adresse) preuve.adresse = adresse;
    const ref = propre(corps.requestIdentifier);
    if (ref) preuve.reference = ref;
  } else {
    preuve.motif = "VIES ne reconnaît pas ce numéro de TVA.";
  }
  return { etat: valide ? "valide" : "invalide", preuve };
}

/** Découpe un identifiant de TVA (FR12345678901 → FR, 12345678901) ; null s'il n'a pas cette forme. */
export function paysEtNumero(tva: string): { pays: string; numero: string } | null {
  return decomposerTva(tva);
}
