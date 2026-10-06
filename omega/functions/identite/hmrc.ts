// HMRC « Check a UK VAT number » v2 : un numéro de TVA britannique (GB) est-il
// enregistré, à quel nom et à quelle adresse. Depuis 2021, VIES ne sert plus que
// XI (Irlande du Nord). La v1 ouverte a été retirée le 17/02/2025 : la v2 exige
// une application déclarée sur le Developer Hub de HMRC (NOTES-B7, section 13),
// jeton OAuth 2 « client credentials », scope read:vat, valable 4 heures.
// Pas encore branché sur verifier.ts, ni appelé en réel : les secrets
// HMRC_CLIENT_ID / HMRC_CLIENT_SECRET n'existent pas encore.
//
//   POST {base}/oauth/token     client_id, client_secret, grant_type=client_credentials, scope=read:vat
//   GET  {base}/organisations/vat/check-vat-number/lookup/{targetVrn}[/{requesterVrn}]
//        Accept: application/vnd.hmrc.2.0+json, Authorization: Bearer <jeton>
//   200 {target: {name, vatNumber, address: {line1…, postcode, countryCode}}, processingDate[, requester, consultationNumber]}
//   404 NOT_FOUND (numéro non enregistré), 400 INVALID_REQUEST, 401/403 (jeton), 429 MESSAGE_THROTTLED_OUT (3 req/s), 5xx.

import { normaliser } from "./coherence.ts";

export interface ReponseHmrc {
  etat: "valide" | "invalide" | "indisponible";
  preuve: Record<string, unknown>;
  motif?: string;
}

export interface RegistreHmrc {
  readonly nom: string;
  /** vrn : les 9 (ou 12) chiffres du numéro GB, sans préfixe. */
  consulter(vrn: string): Promise<ReponseHmrc>;
}

export const HMRC_PRODUCTION = "https://api.service.hmrc.gov.uk";
export const HMRC_BAC_A_SABLE = "https://test-api.service.hmrc.gov.uk";
const DELAI_MS = 12_000;
const ACCEPT = "application/vnd.hmrc.2.0+json";

export interface AnalyseTvaGb {
  /** Les chiffres envoyés à HMRC (9, ou 12 avec le code d'établissement). */
  vrn: string;
  pays: "GB" | "XI";
  /** La clé (mod 97 ou mod 9755) des neuf premiers chiffres tombe juste. Indicatif : HMRC fait foi. */
  cle_ok: boolean;
}

/** Clé d'un numéro de TVA britannique à 9 chiffres : poids 8 à 2 sur les sept premiers, plus les deux derniers ; mod 97 (anciens) ou mod 9755 (+55). */
export function cleTvaGbValide(neuf: string): boolean {
  if (!/^[0-9]{9}$/.test(neuf)) return false;
  const poids = [8, 7, 6, 5, 4, 3, 2];
  const somme = poids.reduce((s, p, i) => s + p * Number(neuf[i]), 0) + Number(neuf.slice(7));
  return somme % 97 === 0 || (somme + 55) % 97 === 0;
}

/** « GB 123 4567 89 », « GB123456789000 », « XI… » ; null sinon (les numéros GD/HA des administrations ne passent pas par cette API). */
export function analyserTvaGb(valeur: unknown): AnalyseTvaGb | null {
  const v = normaliser(valeur);
  if (v === null) return null;
  const m = /^(GB|XI)([0-9]{9}|[0-9]{12})$/.exec(v);
  if (!m) return null;
  return { vrn: m[2], pays: m[1] as "GB" | "XI", cle_ok: cleTvaGbValide(m[2].slice(0, 9)) };
}

function propre(valeur: unknown): string | null {
  if (valeur === null || valeur === undefined) return null;
  const v = String(valeur).replace(/\s+/g, " ").trim();
  return v === "" ? null : v;
}

/** Lit la réponse de lookup (statut HTTP et corps déjà décodé, ou null s'il n'est pas du JSON). */
export function lireReponseHmrc(vrn: string, statut: number, corps: Record<string, unknown> | null, maintenant = new Date()): ReponseHmrc {
  const code = propre(corps?.code)?.toUpperCase() ?? "";
  if (statut === 200 && corps && typeof corps.target === "object" && corps.target !== null) {
    const t = corps.target as Record<string, unknown>;
    const a = (typeof t.address === "object" && t.address !== null ? t.address : {}) as Record<string, unknown>;
    const lignes = Object.keys(a).filter((k) => /^line[0-9]+$/.test(k)).sort().map((k) => propre(a[k])).filter((l): l is string => l !== null);
    const cp = propre(a.postcode);
    const preuve: Record<string, unknown> = {
      registre: "hmrc",
      numero: `GB${propre(t.vatNumber) ?? vrn}`,
      etat: "valide",
      consulte_le: propre(corps.processingDate) ?? maintenant.toISOString(),
    };
    const nom = propre(t.name);
    if (nom) preuve.nom = nom;
    const adresse = [...lignes, cp].filter(Boolean).join(", ");
    if (adresse) preuve.adresse = adresse;
    const pays = propre(a.countryCode);
    if (pays) preuve.pays = pays;
    const ref = propre(corps.consultationNumber);
    if (ref) preuve.reference = ref;
    return { etat: "valide", preuve };
  }
  if (statut === 404 && code === "NOT_FOUND") {
    return {
      etat: "invalide",
      preuve: { registre: "hmrc", numero: `GB${vrn}`, etat: "invalide", motif: "HMRC : numéro de TVA non enregistré.", consulte_le: maintenant.toISOString() },
    };
  }
  if (statut === 400 && code === "INVALID_REQUEST" && /targetVrn/i.test(String(corps?.message ?? ""))) {
    return {
      etat: "invalide",
      preuve: { registre: "hmrc", numero: `GB${vrn}`, etat: "refuse", motif: "HMRC refuse la forme du numéro.", consulte_le: maintenant.toISOString() },
    };
  }
  // Tout le reste ne dit rien du numéro : jeton refusé (401/403), quota (429), requérant refusé, panne (5xx), corps illisible.
  return { etat: "indisponible", preuve: {}, motif: `HMRC : HTTP ${statut}${code ? ` ${code}` : ""}` };
}

/** HMRC depuis l'environnement : HMRC_CLIENT_ID et HMRC_CLIENT_SECRET (secrets Edge), HMRC_BASE (bac à sable), HMRC_VRN_REQUERANT ; null s'il en manque. */
export function hmrcDepuisEnv(env: { get(n: string): string | undefined }, fetchFn: typeof fetch = fetch): HmrcRest | null {
  const clientId = env.get("HMRC_CLIENT_ID")?.trim();
  const clientSecret = env.get("HMRC_CLIENT_SECRET")?.trim();
  if (!clientId || !clientSecret) return null;
  const requerant = env.get("HMRC_VRN_REQUERANT")?.replace(/[^0-9]/g, "") || undefined;
  const base = env.get("HMRC_BASE")?.trim().replace(/\/+$/, "") || HMRC_PRODUCTION;
  return new HmrcRest({ clientId, clientSecret, requerant }, fetchFn, base);
}

/** Le jeton : demandé à la première consultation, gardé jusqu'à une minute avant son expiration. */
export class HmrcRest implements RegistreHmrc {
  readonly nom = "hmrc";
  private jeton: { valeur: string; jusqua: number } | null = null;

  constructor(
    private readonly identifiants: { clientId: string; clientSecret: string; requerant?: string },
    private readonly fetchFn: typeof fetch = fetch,
    private readonly base = HMRC_PRODUCTION,
    private readonly maintenant: () => number = Date.now,
  ) {}

  private async obtenirJeton(): Promise<string | ReponseHmrc> {
    if (this.jeton && this.jeton.jusqua > this.maintenant()) return this.jeton.valeur;
    let rep: Response;
    try {
      rep = await this.fetchFn(`${this.base}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({
          client_id: this.identifiants.clientId,
          client_secret: this.identifiants.clientSecret,
          grant_type: "client_credentials",
          scope: "read:vat",
        }).toString(),
        signal: AbortSignal.timeout(DELAI_MS),
      });
    } catch (e) {
      return { etat: "indisponible", preuve: {}, motif: `HMRC injoignable (jeton) : ${(e as Error).message}` };
    }
    let corps: Record<string, unknown> = {};
    try {
      corps = JSON.parse(await rep.text());
    } catch { /* corps vide ou illisible : traité ci-dessous */ }
    const valeur = propre(corps.access_token);
    if (!rep.ok || !valeur) {
      // Le secret n'apparaît jamais dans le motif ; seulement le statut et le code d'erreur rendu.
      return { etat: "indisponible", preuve: {}, motif: `HMRC : jeton refusé (HTTP ${rep.status}${corps.error ? ` ${String(corps.error)}` : ""})` };
    }
    const duree = Number(corps.expires_in);
    const secondes = Number.isFinite(duree) && duree > 120 ? duree : 14_400;
    this.jeton = { valeur, jusqua: this.maintenant() + (secondes - 60) * 1000 };
    return valeur;
  }

  async consulter(vrn: string): Promise<ReponseHmrc> {
    if (!/^[0-9]{9}([0-9]{3})?$/.test(vrn)) {
      return { etat: "invalide", preuve: { registre: "hmrc", numero: `GB${vrn}`, etat: "refuse", motif: "Un numéro GB a 9 ou 12 chiffres." } };
    }
    // La clé (mod 97 / 9755) n'arrête pas la consultation : les numéros du bac à sable de HMRC ne la respectent pas,
    // et HMRC fait foi. Elle est notée dans la preuve.
    const cle_ok = cleTvaGbValide(vrn.slice(0, 9));
    const jeton = await this.obtenirJeton();
    if (typeof jeton !== "string") return jeton;
    const requerant = this.identifiants.requerant ? `/${encodeURIComponent(this.identifiants.requerant)}` : "";
    let rep: Response;
    try {
      rep = await this.fetchFn(`${this.base}/organisations/vat/check-vat-number/lookup/${vrn}${requerant}`, {
        method: "GET",
        headers: { Accept: ACCEPT, Authorization: `Bearer ${jeton}` },
        signal: AbortSignal.timeout(DELAI_MS),
      });
    } catch (e) {
      return { etat: "indisponible", preuve: {}, motif: `HMRC injoignable : ${(e as Error).message}` };
    }
    if (rep.status === 401) this.jeton = null; // jeton expiré ou révoqué : on en redemandera un au prochain appel.
    let corps: Record<string, unknown> | null = null;
    try {
      corps = JSON.parse(await rep.text());
    } catch {
      corps = null;
    }
    const r = lireReponseHmrc(vrn, rep.status, corps);
    if (r.etat !== "indisponible") r.preuve.cle_ok = cle_ok;
    return r;
  }
}
