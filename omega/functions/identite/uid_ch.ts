// Le registre IDE suisse (UID, Office fédéral de la statistique) : un fournisseur
// suisse existe-t-il, est-il encore actif, est-il inscrit à la TVA ? Service SOAP
// public, sans clé : https://www.uid-wse.admin.ch/V5.0/PublicServices.svc,
// opération GetByUID (une seule requête rend l'entreprise et son statut TVA).
// Pas encore branché sur verifier.ts : le registre `uid_ch` attend la décision
// d'A4 sur les contraintes de filed_verifications_tiers (NOTES-B7, section 12).
//
// Codes lus (norme eCH-0108 v5.1) :
//   uidregStatusEnterpriseDetail : 1 provisoire, 2 en réactivation, 3 définitif, 4 en mutation (3 et 4 = actif),
//                                  5 radié, 6 radié définitivement, 7 annulé (doublon) ;
//   vatStatus : 1 inconnu, 2 inscrit, 3 non inscrit.

import { normaliser } from "./coherence.ts";

export interface ReponseUidCh {
  etat: "valide" | "invalide" | "indisponible";
  preuve: Record<string, unknown>;
  motif?: string;
}

export interface RegistreUidCh {
  readonly nom: string;
  /** uid : les neuf chiffres de l'IDE ; tva : on vérifie un numéro de TVA (suffixe MWST, TVA ou IVA), pas seulement l'entreprise. */
  consulter(uid: string, tva: boolean): Promise<ReponseUidCh>;
}

const DELAI_MS = 12_000;
const URL_UID = "https://www.uid-wse.admin.ch/V5.0/PublicServices.svc";
const ACTION_GET_BY_UID = "http://www.uid.admin.ch/xmlns/uid-wse/IPublicServices/GetByUID";

export interface AnalyseUidCh {
  /** Les neuf chiffres. */
  uid: string;
  /** La forme officielle : CHE-123.456.789. */
  forme: string;
  /** Le numéro porte le suffixe de TVA (MWST, TVA, IVA). */
  tva: boolean;
  cle_ok: boolean;
}

/** La clé de l'IDE : poids 5 4 3 2 7 6 5 4 sur les huit premiers chiffres, 11 − (somme mod 11) ; 11 → 0, 10 → jamais attribué. */
export function cleUidChValide(chiffres: string): boolean {
  if (!/^[0-9]{9}$/.test(chiffres)) return false;
  const poids = [5, 4, 3, 2, 7, 6, 5, 4];
  const somme = poids.reduce((s, p, i) => s + p * Number(chiffres[i]), 0);
  const cle = 11 - (somme % 11);
  if (cle === 10) return false;
  return (cle === 11 ? 0 : cle) === Number(chiffres[8]);
}

/** Analyse « CHE-123.456.789 », « CHE123456789 MWST », « CHE-123.456.789 TVA » ; null si ce n'est pas une IDE suisse. */
export function analyserUidCh(valeur: unknown): AnalyseUidCh | null {
  const v = normaliser(valeur);
  if (v === null) return null;
  const m = /^CHE([0-9]{9})(MWST|TVA|IVA)?$/.exec(v);
  if (!m) return null;
  const uid = m[1];
  return {
    uid,
    forme: `CHE-${uid.slice(0, 3)}.${uid.slice(3, 6)}.${uid.slice(6)}`,
    tva: m[2] !== undefined,
    cle_ok: cleUidChValide(uid),
  };
}

function decoder(t: string): string {
  return t
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#([0-9]+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

/** Le texte du premier élément de ce nom (préfixe d'espace de noms ignoré), ou null. */
export function champXml(xml: string, nom: string): string | null {
  const m = new RegExp(`<(?:[A-Za-z0-9_]+:)?${nom}(?:\\s[^>]*)?>([^<]*)</(?:[A-Za-z0-9_]+:)?${nom}>`).exec(xml);
  if (!m) return null;
  const v = decoder(m[1]).replace(/\s+/g, " ").trim();
  return v === "" ? null : v;
}

/** Les blocs d'un élément (avec son contenu), dans l'ordre. */
function blocsXml(xml: string, nom: string): string[] {
  const re = new RegExp(`<(?:[A-Za-z0-9_]+:)?${nom}(?:\\s[^>]*)?>[\\s\\S]*?</(?:[A-Za-z0-9_]+:)?${nom}>`, "g");
  return xml.match(re) ?? [];
}

const STATUTS_IDE: Record<string, { libelle: string; actif: boolean | null }> = {
  "1": { libelle: "provisoire", actif: null },
  "2": { libelle: "en réactivation", actif: null },
  "3": { libelle: "définitif", actif: true },
  "4": { libelle: "en mutation", actif: true },
  "5": { libelle: "radié", actif: false },
  "6": { libelle: "radié définitivement", actif: false },
  "7": { libelle: "annulé (doublon)", actif: false },
};

const STATUTS_TVA: Record<string, string> = { "1": "inconnu", "2": "inscrit", "3": "non inscrit" };

/** Lit la réponse de GetByUID (HTTP 200) ; uid : les neuf chiffres demandés. */
export function lireReponseUidCh(uid: string, tva: boolean, xml: string, maintenant = new Date()): ReponseUidCh {
  const forme = `CHE-${uid.slice(0, 3)}.${uid.slice(3, 6)}.${uid.slice(6)}`;
  const base = { registre: "uid_ch", uid: forme, consulte_le: maintenant.toISOString() };
  if (!/GetByUIDResponse/.test(xml)) {
    return { etat: "indisponible", preuve: {}, motif: "Registre IDE : réponse illisible." };
  }
  const org = blocsXml(xml, "organisationType")[0];
  if (!org) {
    return { etat: "invalide", preuve: { ...base, etat: "inconnu", motif: "IDE inconnue du registre suisse." } };
  }
  const code = champXml(org, "uidregStatusEnterpriseDetail") ?? "";
  const statut = STATUTS_IDE[code] ?? { libelle: `code ${code || "absent"}`, actif: null };
  const preuve: Record<string, unknown> = { ...base, statut_ide: statut.libelle };
  const nom = champXml(org, "organisationName");
  if (nom) preuve.nom = nom;
  const forme_juridique = champXml(org, "legalForm");
  if (forme_juridique) preuve.forme_juridique = forme_juridique;
  const adresses = blocsXml(org, "address");
  const adresse = adresses.find((a) => champXml(a, "addressCategory") === "LEGAL") ?? adresses[0];
  if (adresse) {
    const rue = [champXml(adresse, "street"), champXml(adresse, "houseNumber")].filter(Boolean).join(" ");
    const ville = [champXml(adresse, "swissZipCode"), champXml(adresse, "town")].filter(Boolean).join(" ");
    const texte = [rue, ville].filter((s) => s !== "").join(", ");
    if (texte) preuve.adresse = texte;
    const canton = champXml(adresse, "cantonAbbreviation");
    if (canton) preuve.canton = canton;
  }
  const blocTva = blocsXml(org, "vatRegisterInformation")[0];
  const codeTva = blocTva ? champXml(blocTva, "vatStatus") ?? "" : "";
  const statutTva = STATUTS_TVA[codeTva] ?? "inconnu";
  preuve.tva = {
    statut: statutTva,
    ...(blocTva && champXml(blocTva, "vatEntryDate") ? { depuis: champXml(blocTva, "vatEntryDate") } : {}),
    ...(blocTva && champXml(blocTva, "vatLiquidationDate") ? { jusqu_au: champXml(blocTva, "vatLiquidationDate") } : {}),
  };

  if (statut.actif === false) {
    return { etat: "invalide", preuve: { ...preuve, etat: "radie", motif: `Entreprise ${statut.libelle} au registre IDE.` } };
  }
  if (tva && statutTva === "non inscrit") {
    return { etat: "invalide", preuve: { ...preuve, etat: "actif", motif: "Entreprise au registre IDE, mais pas inscrite à la TVA suisse." } };
  }
  if (statut.actif === null) {
    preuve.remarque = `Inscription ${statut.libelle} au registre IDE : l'entreprise existe, son inscription n'est pas encore définitive.`;
  }
  if (tva && statutTva === "inconnu") {
    preuve.remarque = [preuve.remarque, "Statut TVA inconnu du registre IDE."].filter(Boolean).join(" ");
  }
  return { etat: "valide", preuve: { ...preuve, etat: "actif" } };
}

/** Lit une faute SOAP : une IDE refusée (Data_validation_failed) est une réponse sur le numéro ; le reste est une panne. */
export function lireFauteUidCh(uid: string, xml: string, maintenant = new Date()): ReponseUidCh {
  const erreur = champXml(xml, "error") ?? champXml(xml, "faultstring") ?? "faute inconnue";
  const detail = champXml(xml, "errorDetail");
  if (/businessFault/.test(xml) && erreur === "Data_validation_failed") {
    return {
      etat: "invalide",
      preuve: {
        registre: "uid_ch",
        uid: `CHE-${uid.slice(0, 3)}.${uid.slice(3, 6)}.${uid.slice(6)}`,
        etat: "refuse",
        motif: `Le registre IDE refuse ce numéro${detail ? ` : ${detail}` : "."}`,
        consulte_le: maintenant.toISOString(),
      },
    };
  }
  return { etat: "indisponible", preuve: {}, motif: `Registre IDE : ${erreur}${detail ? ` (${detail})` : ""}` };
}

export class UidChSoap implements RegistreUidCh {
  readonly nom = "uid_ch";
  constructor(private readonly fetchFn: typeof fetch = fetch, private readonly url = URL_UID) {}

  async consulter(uid: string, tva: boolean): Promise<ReponseUidCh> {
    if (!cleUidChValide(uid)) {
      return {
        etat: "invalide",
        preuve: { registre: "uid_ch", uid, etat: "refuse", motif: "La clé de l'IDE ne tombe pas juste : pas de consultation du registre." },
      };
    }
    const corps = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" ' +
      'xmlns:uid="http://www.uid.admin.ch/xmlns/uid-wse" xmlns:ech="http://www.ech.ch/xmlns/eCH-0097/5">' +
      "<soapenv:Body><uid:GetByUID><uid:uid><ech:uidOrganisationIdCategorie>CHE</ech:uidOrganisationIdCategorie>" +
      `<ech:uidOrganisationId>${uid}</ech:uidOrganisationId></uid:uid></uid:GetByUID></soapenv:Body></soapenv:Envelope>`;
    let rep: Response;
    try {
      rep = await this.fetchFn(this.url, {
        method: "POST",
        headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: `"${ACTION_GET_BY_UID}"` },
        body: corps,
        signal: AbortSignal.timeout(DELAI_MS),
      });
    } catch (e) {
      return { etat: "indisponible", preuve: {}, motif: `Registre IDE injoignable : ${(e as Error).message}` };
    }
    const texte = await rep.text();
    if (/<(?:[A-Za-z0-9_]+:)?Fault>/.test(texte)) return lireFauteUidCh(uid, texte);
    if (!rep.ok) return { etat: "indisponible", preuve: {}, motif: `Registre IDE : HTTP ${rep.status} ${texte.slice(0, 200)}` };
    return lireReponseUidCh(uid, tva, texte);
  }
}
