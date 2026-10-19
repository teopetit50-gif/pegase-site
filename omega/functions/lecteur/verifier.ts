// La vérification : une valeur n'est « vérifiée » que si sa citation se
// retrouve dans le texte de la page citée, et si les règles de forme (clé
// SIREN, clé de TVA, date, nombre) tiennent. Rien n'est inventé ici : on ne
// fait que confirmer ou douter.

import type { Boite, PageLue, ValeurLue } from "@partage/portes.ts";
import { dateIso, nombreDepuisTexte, retrouver, sirenValide, tvaFrValide } from "@partage/texte.ts";
import { boiteDe, type PagePdf } from "./pdf.ts";
import { CHAMPS_LIGNE, CHAMPS_PAR_NOM, CHAMPS_TAXE, CHAMPS_VENTILATION, MAX_LIGNES } from "./schemas/facture.ts";
import type { ChampDeclare } from "./schemas/modules.ts";

export interface ValeurBrute {
  champ: string;
  valeur: unknown;
  texte?: string;
  page?: number;
  confiance?: number;
  /** Position estimée par le modèle (lecture visuelle seulement). */
  boite?: unknown;
}

/** Une boîte normalisée plausible : quatre nombres entre 0 et 1, une surface non nulle. */
export function boiteEstimee(b: unknown): Boite | null {
  if (!b || typeof b !== "object") return null;
  const o = b as Record<string, unknown>;
  const n = (k: string) => (typeof o[k] === "number" && Number.isFinite(o[k]) ? (o[k] as number) : NaN);
  const x = n("x"), y = n("y"), l = n("l"), h = n("h");
  if ([x, y, l, h].some(Number.isNaN)) return null;
  if (x < 0 || y < 0 || l <= 0 || h <= 0 || x + l > 1.001 || y + h > 1.001) return null;
  const arr = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 10000) / 10000;
  return { x: arr(x), y: arr(y), l: arr(l), h: arr(h) };
}

export interface LigneBrute extends Record<string, unknown> {
  page?: number;
}

/** Un choix rendu sous une forme approchante (« Accordé », « non-opposition ») ramené à la valeur admise. */
function normaliserChoix(v: unknown): string {
  return String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/**
 * Une date et heure locale, sans fuseau : « AAAA-MM-JJTHH:MM », ou « AAAA-MM-JJ »
 * quand l'heure n'est pas donnée (Tamila lit alors « heure inconnue »). Admet
 * « 2027-02-04T09:30 », « 04/02/2027 à 9h30 », « 4 février 2027 à 9 h 30 »,
 * « 04/02/2027 09:30:00 ». Un fuseau ou un « Z » rendu par le modèle est refusé :
 * l'heure imprimée est locale et c'est le socle qui pose le fuseau.
 */
export function dateHeureLocale(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?)?$/);
  let jour: string | null;
  let h: string | undefined;
  let m: string | undefined;
  if (iso) {
    jour = dateIso(iso[1]);
    h = iso[2];
    m = iso[3];
  } else {
    if (/(?:Z|[+-]\d{2}:?\d{2})$/.test(s) && /\d{4}-\d{2}-\d{2}T/.test(s)) return null;
    const heure = s.match(/^(.*?)(?:\s*(?:,|à|a|-))?\s+(\d{1,2})\s*(?:h|:)\s*(\d{2})?(?::\d{2})?\s*$/i);
    if (heure) {
      jour = dateIso(heure[1].trim());
      h = heure[2];
      m = heure[3] ?? "00";
    } else {
      jour = dateIso(s);
    }
  }
  if (jour === null) return null;
  if (h === undefined) return jour;
  const hh = Number(h), mm = Number(m);
  if (!(hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59)) return null;
  return `${jour}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

const MOIS_FR = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];

/** Un mois en AAAA-MM : « 2026-03 », « 03/2026 », « mars 2026 ». */
export function moisIso(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  let m = s.match(/^(\d{4})-(\d{1,2})$/);
  let a: number | null = null, mo: number | null = null;
  if (m) [a, mo] = [Number(m[1]), Number(m[2])];
  else if ((m = s.match(/^(\d{1,2})[\/.\-](\d{4})$/))) [a, mo] = [Number(m[2]), Number(m[1])];
  else if ((m = s.match(/^([a-z]+)\.?\s+(\d{4})$/))) {
    const i = MOIS_FR.findIndex((x) => x.startsWith(m![1].slice(0, 3)));
    if (i >= 0) [a, mo] = [Number(m[2]), i + 1];
  }
  if (a === null || mo === null || mo < 1 || mo > 12 || a < 1900 || a > 2199) return null;
  return `${a}-${String(mo).padStart(2, "0")}`;
}

/** Met la valeur dans le type attendu par le module ; ok = false si elle n'y entre pas. */
export function typerValeur(
  champ: string,
  valeur: unknown,
  champs: ReadonlyMap<string, Pick<ChampDeclare, "type" | "min" | "maximum" | "choix">> = CHAMPS_PAR_NOM,
): { valeur: unknown; ok: boolean; detail?: string } {
  const def = champs.get(champ);
  if (!def) return { valeur, ok: false, detail: "champ inconnu du schéma" };
  switch (def.type) {
    case "nombre": {
      const n = nombreDepuisTexte(valeur);
      return n === null ? { valeur, ok: false, detail: "nombre illisible" } : { valeur: n, ok: true };
    }
    case "entier": {
      const n = nombreDepuisTexte(typeof valeur === "string" ? valeur.replace(/\s*(mois|jours?|er|e|ème|eme)\b.*$/i, "") : valeur);
      if (n === null || !Number.isInteger(n)) return { valeur, ok: false, detail: "entier illisible" };
      if ((def.min !== undefined && n < def.min) || (def.maximum !== undefined && n > def.maximum)) {
        return { valeur: n, ok: false, detail: `hors bornes (${def.min ?? "…"} à ${def.maximum ?? "…"})` };
      }
      return { valeur: n, ok: true };
    }
    case "choix": {
      const c = normaliserChoix(valeur);
      const admis = def.choix ?? [];
      const exact = admis.find((a) => a === c);
      if (exact) return { valeur: exact, ok: true };
      const proche = admis.filter((a) => c.startsWith(a) || a.startsWith(c) || c.includes(a));
      if (proche.length === 1 && c.length >= 4) return { valeur: proche[0], ok: true };
      return { valeur, ok: false, detail: `choix hors liste (${admis.join(", ")})` };
    }
    case "liste": {
      const elements = Array.isArray(valeur)
        ? valeur.map((x) => String(x ?? "").trim())
        : typeof valeur === "string"
        ? valeur.split(/[\n;,]|\s+et\s+/).map((x) => x.trim())
        : [];
      const propres = elements.filter((x) => x !== "").map((x) => x.slice(0, 200)).slice(0, 100);
      if (propres.length === 0) return { valeur, ok: false, detail: "liste vide" };
      if (def.choix) {
        // Une liste à vocabulaire fermé (les activités d'une attestation décennale) : chaque élément est un code admis.
        const codes = [...new Set(propres.map(normaliserChoix))];
        const hors = codes.filter((c) => !def.choix!.includes(c));
        return hors.length > 0 ? { valeur: codes, ok: false, detail: `hors vocabulaire : ${hors.slice(0, 5).join(", ")}` } : { valeur: codes, ok: true };
      }
      return { valeur: propres, ok: true };
    }
    case "date": {
      const d = dateIso(valeur);
      return d === null ? { valeur, ok: false, detail: "date illisible" } : { valeur: d, ok: true };
    }
    case "mois": {
      const m = moisIso(valeur);
      return m === null ? { valeur, ok: false, detail: "mois illisible (AAAA-MM)" } : { valeur: m, ok: true };
    }
    case "dateheure": {
      const d = dateHeureLocale(valeur);
      return d === null ? { valeur, ok: false, detail: "date et heure illisibles" } : { valeur: d, ok: true };
    }
    case "booleen": {
      if (typeof valeur === "boolean") return { valeur, ok: true };
      if (typeof valeur === "string") return { valeur: ["true", "oui", "1", "vrai"].includes(valeur.toLowerCase()), ok: true };
      return { valeur, ok: false, detail: "booléen attendu" };
    }
    default: {
      if (valeur === null || valeur === undefined) return { valeur, ok: false, detail: "vide" };
      let s = String(valeur).trim();
      if (champ.endsWith(".siren") || champ.endsWith(".siret")) s = s.replace(/\s/g, "");
      if (champ.endsWith(".tva")) s = s.replace(/[\s.\-]/g, "").toUpperCase();
      // Un IBAN garde ses caractères masqués (•, *, X…) : « FR76… » reste visible comme coupé.
      if (champ.endsWith(".iban")) s = normaliserIban(s);
      if (champ.endsWith(".pays") || champ === "devise") s = s.toUpperCase();
      return s === "" ? { valeur: s, ok: false, detail: "vide" } : { valeur: s, ok: true };
    }
  }
}

/** La longueur d'un IBAN complet, pour les pays qu'on rencontre (ISO 13616). */
const LONGUEUR_IBAN: Record<string, number> = {
  FR: 27, MC: 27, IT: 27, DE: 22, GB: 22, BE: 16, NL: 18, LU: 20, CH: 21, ES: 24, PT: 25, AT: 20, IE: 22,
};

/**
 * Un IBAN tel qu'imprimé, sans espaces : ses caractères masqués sont gardés (« … », « • », « [masqué] » → « … »),
 * et un IBAN coupé sans marque (plus court que la longueur de son pays) reçoit « … » : il reste visible comme
 * incomplet, jamais pris pour un IBAN entier à la clé fausse.
 */
export function normaliserIban(brut: string): string {
  let s = brut.replace(/\[[^\]]{0,30}\]/g, "…").replace(/\.{3}/g, "…").replace(/[\s.\-]/g, "").toUpperCase();
  s = s.replace(/…+/g, "…");
  const attendu = LONGUEUR_IBAN[s.slice(0, 2)];
  if (attendu && /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(s) && s.length < attendu) s += "…";
  return s;
}

/** Un IBAN dont une partie est cachée ou coupée à l'impression (•, *, …, XXX). */
export function ibanMasque(s: string): boolean {
  return /^[A-Z]{2}\d{2}/.test(s) && (/[•*…·]/.test(s) || /X{3,}/.test(s.slice(4)));
}

/** La clé d'un IBAN (ISO 13616, modulo 97). */
export function ibanValide(s: string): boolean {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const chiffres = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let reste = 0;
  for (const c of chiffres) reste = (reste * 10 + Number(c)) % 97;
  return reste === 1;
}

/** Les règles de forme que FILED applique ensuite : autant douter tout de suite. */
function regleDeForme(champ: string, valeur: unknown): string | null {
  const s = String(valeur ?? "");
  if (champ.endsWith(".siren") && !sirenValide(s)) return "clé SIREN invalide";
  if ((champ === "siren" || champ.endsWith("_siren")) && !sirenValide(s.replace(/\s+/g, ""))) return "clé SIREN invalide";
  if (champ.endsWith(".siret") && !(/^\d{14}$/.test(s) && sirenValide(s))) return "SIRET invalide";
  if (champ.endsWith(".tva") && s.startsWith("FR") && !tvaFrValide(s)) return "clé de TVA invalide";
  if (champ.endsWith(".pays") && !/^[A-Z]{2}$/.test(s)) return "code pays attendu sur deux lettres";
  if (champ === "devise" && !/^[A-Z]{3}$/.test(s)) return "devise ISO attendue sur trois lettres";
  if (champ.endsWith(".iban")) {
    if (ibanMasque(s)) return "IBAN partiellement masqué : à compléter";
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return "IBAN mal formé";
    const attendu = LONGUEUR_IBAN[s.slice(0, 2)];
    if (attendu && s.length !== attendu) return "IBAN mal formé";
    if (!ibanValide(s)) return "clé IBAN invalide";
  }
  return null;
}

export interface Verification {
  valeurs: ValeurLue[];
  /** Les champs clés dont la valeur n'a pas été vérifiée (ou manque). */
  clesDouteuses: string[];
}

export function verifierValeurs(
  brutes: ValeurBrute[],
  pages: PageLue[],
  pagesPdf: PagePdf[] | null,
  source: "ia" | "tableur" = "ia",
  champs: ReadonlyMap<string, ChampDeclare | import("./schemas/facture.ts").ChampFacture> = CHAMPS_PAR_NOM,
  cles: string[] = CHAMPS_FACTURE_CLES,
): Verification {
  const parNumero = new Map(pages.map((p) => [p.n, p]));
  const pdfParNumero = new Map((pagesPdf ?? []).map((p) => [p.n, p]));
  const valeurs: ValeurLue[] = [];
  const vus = new Set<string>();

  for (const b of brutes) {
    if (!b || typeof b.champ !== "string" || !/^[a-z][a-z0-9_.]{1,79}$/.test(b.champ)) continue;
    if (!champs.has(b.champ) || vus.has(b.champ)) continue;
    if (b.valeur === null || b.valeur === undefined || b.valeur === "") continue;
    vus.add(b.champ);

    const typage = typerValeur(b.champ, b.valeur, champs as ReadonlyMap<string, Pick<ChampDeclare, "type" | "min" | "maximum" | "choix">>);
    const citation = typeof b.texte === "string" ? b.texte.trim() : "";
    const page = Number.isInteger(b.page) ? (b.page as number) : undefined;
    const pageLue = page !== undefined ? parNumero.get(page) : undefined;

    let verifiee = false;
    let controle: string;
    let boite: Boite | undefined;

    if (!typage.ok) {
      controle = `valeur non retenue : ${typage.detail}`;
    } else if (citation === "") {
      controle = "sans citation";
    } else if (!pageLue) {
      controle = page === undefined ? "page non citée" : `page ${page} inexistante`;
    } else if (Array.isArray(typage.valeur) && !(champs.get(b.champ) as ChampDeclare | undefined)?.choix) {
      // Une liste : chaque élément doit se retrouver sur la page citée.
      const manquants = (typage.valeur as string[]).filter((x) => !retrouver(x, pageLue.texte).trouve);
      if (manquants.length === 0) {
        verifiee = true;
        controle = `${(typage.valeur as string[]).length} élément(s) retrouvés page ${page}`;
      } else {
        controle = `éléments introuvables page ${page} : ${manquants.slice(0, 5).join(", ")}`;
      }
    } else {
      // Une valeur simple, ou une liste de codes (vocabulaire fermé) : la citation doit se retrouver sur la page citée.
      const r = retrouver(citation, pageLue.texte);
      if (r.trouve) {
        verifiee = true;
        controle = `citation retrouvée page ${page}${r.mode === "compact" ? " (espaces près)" : ""}`;
        const pdf = pdfParNumero.get(page!);
        if (pdf) boite = boiteDe(pdf, citation) ?? undefined;
        if (!boite && (pageLue.methode === "vision" || pageLue.methode === "ocr_manuscrit")) {
          const estimee = boiteEstimee(b.boite);
          if (estimee) {
            boite = estimee;
            controle += " ; boîte estimée par le modèle";
          }
        }
      } else {
        controle = `citation introuvable page ${page}`;
      }
    }
    const forme = typage.ok ? regleDeForme(b.champ, typage.valeur) : null;
    if (forme) {
      verifiee = false;
      controle = `${controle} ; ${forme}`;
    }
    const confiance = typeof b.confiance === "number" ? Math.max(0, Math.min(1, b.confiance)) : undefined;
    valeurs.push({
      champ: b.champ,
      valeur: typage.valeur,
      texte: citation ? citation.slice(0, 2000) : undefined,
      page: pageLue ? page : undefined,
      boite,
      source,
      confiance,
      verifiee,
      controle: controle.slice(0, 300),
    });
  }

  const clesDouteuses: string[] = [];
  for (const champ of cles) {
    const v = valeurs.find((x) => x.champ === champ);
    if (!v || !v.verifiee) clesDouteuses.push(champ);
  }
  return { valeurs, clesDouteuses };
}

/** Les champs clés d'une facture FILED (compte pour « lue »). */
export const CHAMPS_FACTURE_CLES: string[] = [...CHAMPS_PAR_NOM.values()].filter((c) => c.cle).map((c) => c.champ);

function nettoyerLigne(l: LigneBrute, colonnes: readonly string[]): Record<string, unknown> {
  const sortie: Record<string, unknown> = {};
  for (const c of colonnes) {
    const v = l[c];
    if (v === undefined || v === null || v === "") continue;
    if (["quantite", "prix_unitaire", "prix_brut", "remise", "montant", "taux_tva", "taux", "base"].includes(c)) {
      const n = nombreDepuisTexte(v);
      if (n !== null) sortie[c] = n;
    } else {
      sortie[c] = String(v).trim();
    }
  }
  return sortie;
}

/** Les lignes de détail : une seule valeur « lignes », tableau jsonb, vérifiée si chaque libellé se retrouve sur sa page. */
export function valeurLignes(
  brutes: LigneBrute[] | undefined,
  pages: PageLue[],
  source: "ia" | "tableur" = "ia",
  colonnes: readonly string[] = CHAMPS_LIGNE,
): ValeurLue | null {
  if (!Array.isArray(brutes) || brutes.length === 0) return null;
  const parNumero = new Map(pages.map((p) => [p.n, p]));
  const lignes = brutes.slice(0, MAX_LIGNES).filter((l) => l && typeof l === "object");
  let retrouvees = 0;
  const nettoyees = lignes.map((l) => {
    const n = nettoyerLigne(l, colonnes);
    const page = Number.isInteger(l.page) ? parNumero.get(l.page as number) : undefined;
    if (page && typeof n.designation === "string" && retrouver(n.designation, page.texte).trouve) retrouvees++;
    return n;
  });
  const premierePage = lignes.find((l) => Number.isInteger(l.page))?.page as number | undefined;
  const verifiee = nettoyees.length > 0 && retrouvees === nettoyees.length;
  return {
    champ: "lignes",
    valeur: nettoyees,
    page: premierePage,
    source,
    verifiee,
    controle: `${retrouvees}/${nettoyees.length} libellés retrouvés sur leur page`,
  };
}

/** La ventilation de TVA : une seule valeur « tva.ventilation ». */
export function valeurVentilation(brutes: LigneBrute[] | undefined, pages: PageLue[], source: "ia" | "tableur" = "ia"): ValeurLue | null {
  if (!Array.isArray(brutes) || brutes.length === 0) return null;
  const parNumero = new Map(pages.map((p) => [p.n, p]));
  let retrouvees = 0;
  const lignes = brutes.filter((l) => l && typeof l === "object").map((l) => {
    const n = nettoyerLigne(l, CHAMPS_VENTILATION);
    const page = Number.isInteger(l.page) ? parNumero.get(l.page as number) : undefined;
    if (page && typeof n.montant === "number" && retrouver(montantFr(n.montant), page.texte).trouve) retrouvees++;
    return n;
  });
  const premierePage = brutes.find((l) => Number.isInteger(l?.page))?.page as number | undefined;
  return {
    champ: "tva.ventilation",
    valeur: lignes,
    page: premierePage,
    source,
    verifiee: lignes.length > 0 && retrouvees === lignes.length,
    controle: `${retrouvees}/${lignes.length} montants de TVA retrouvés sur leur page`,
  };
}

/** « 1234.5 » → « 1 234,50 » pour retrouver un montant tel qu'il s'imprime en France. */
export function montantFr(n: number): string {
  const [ent, dec = ""] = Math.abs(n).toFixed(2).split(".");
  return `${n < 0 ? "-" : ""}${ent.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${dec}`;
}

/** Les taxes hors TVA (octroi de mer…) : une seule valeur « taxes.autres », vérifiée si chaque montant se retrouve sur sa page. */
export function valeurTaxes(brutes: LigneBrute[] | undefined, pages: PageLue[], source: "ia" | "tableur" = "ia"): ValeurLue | null {
  if (!Array.isArray(brutes) || brutes.length === 0) return null;
  const parNumero = new Map(pages.map((p) => [p.n, p]));
  let retrouvees = 0;
  const taxes = brutes.filter((l) => l && typeof l === "object").map((l) => {
    const n = nettoyerLigne(l, CHAMPS_TAXE);
    const code = String(n.code ?? "").toUpperCase().replace(/[^A-Z]/g, "");
    n.code = code === "OMR" || code === "OMRI" ? code : "autre";
    const page = Number.isInteger(l.page) ? parNumero.get(l.page as number) : undefined;
    if (page && typeof n.montant === "number" && retrouver(montantFr(n.montant), page.texte).trouve) retrouvees++;
    return n;
  }).filter((n) => typeof n.montant === "number");
  if (taxes.length === 0) return null;
  const premierePage = brutes.find((l) => Number.isInteger(l?.page))?.page as number | undefined;
  return {
    champ: "taxes.autres",
    valeur: taxes,
    page: premierePage,
    source,
    verifiee: retrouvees === taxes.length,
    controle: `${retrouvees}/${taxes.length} montants de taxe retrouvés sur leur page`,
  };
}

// Ce que le modèle a laissé de côté alors que le texte le porte en toutes lettres. On ne complète qu'un champ
// absent, qu'une seule lecture possible, et la citation est le texte même de la page.
const RE_RCS = /\bR\.?\s?C\.?\s?S?\.?\s+([A-ZÀ-Ÿa-zà-ÿ' -]{2,40}?)\s+(?:[AB]\s+)?(\d{3}\s?\d{3}\s?\d{3})(?!\s?\d)/g;
const MASQUE_IBAN = String.raw`(?:\s?(?:…|\.{3}|\[[^\]]{0,30}\]|[•*·]{2,}|X{3,}))`;
const RE_IBAN = new RegExp(String.raw`\bI\.?B\.?A\.?N\.?\b\s*[:.]?\s*([A-Z]{2}\s?\d{2}(?:[\s\-]?[A-Z0-9•*…·]{1,4}){2,9}${MASQUE_IBAN}?)`, "gi");
// Sans étiquette : un IBAN FR coupé ou masqué (FR + 2 chiffres + au moins 12 caractères, puis une marque de masque).
const RE_IBAN_FR_MASQUE = new RegExp(String.raw`\bFR\d{2}(?:\s?[0-9A-Z]{4}){3,5}(?:\s?[0-9A-Z]{1,3})?${MASQUE_IBAN}`, "g");
const RE_SIREN_SIRET = /\bSIRE[NT]\b\s*(?:n[°o]\s*)?[:.]?\s*(\d{3}\s?\d{3}\s?\d{3}(?:\s?\d{5})?)(?!\s?\d)/gi;
const RE_IBAN_FR_NU = /\bFR\d{2}(?:\s?[0-9A-Z]{4}){5}\s?[0-9A-Z]{3}\b/g;
const RE_EXONERATION = /[^\n]*(?:exon[ée]r[ée]?(?:ation)?s?\b[^\n]*\bTVA\b|\bTVA\b[^\n]*exon[ée]r|art(?:icle|\.)?\s*(?:295|262\s*ter|261|275)\b[^\n]*\bCGI\b)[^\n]*/gi;

function seulesLectures(pages: PageLue[], re: RegExp, groupe: number): { valeur: string; texte: string; page: number }[] {
  const vues = new Map<string, { valeur: string; texte: string; page: number }>();
  for (const p of pages) {
    for (const m of p.texte.matchAll(re)) {
      const v = (m[groupe] ?? m[0]).trim();
      if (!vues.has(v)) vues.set(v, { valeur: v, texte: m[0].trim(), page: p.n });
    }
  }
  return [...vues.values()];
}

/** Le SIREN, l'IBAN et la mention d'exonération quand le modèle les a omis : relevés sur le texte des pages. */
export function completerDepuisTexte(valeurs: ValeurLue[], pages: PageLue[], champs: { has(champ: string): boolean }): ValeurLue[] {
  const ajouts: ValeurLue[] = [];
  const absent = (champ: string) => champs.has(champ) && !valeurs.some((v) => v.champ === champ);

  if (absent("fournisseur.siren")) {
    const acheteur = valeurs.find((v) => v.champ === "acheteur.siren")?.valeur;
    const rcs = seulesLectures(pages, RE_RCS, 2)
      .map((r) => ({ ...r, valeur: r.valeur.replace(/\s/g, "") }))
      .filter((r) => r.valeur !== acheteur);
    const distincts = [...new Set(rcs.map((r) => r.valeur))];
    if (distincts.length === 1) {
      const r = rcs[0];
      const valide = sirenValide(r.valeur);
      ajouts.push({
        champ: "fournisseur.siren",
        valeur: r.valeur,
        texte: r.texte,
        page: r.page,
        source: "ia",
        verifiee: valide,
        controle: `tiré du RCS imprimé page ${r.page}${valide ? "" : " ; clé SIREN invalide"}`,
      });
    }
  }

  if (absent("fournisseur.siren") && !ajouts.some((a) => a.champ === "fournisseur.siren")) {
    // « SIREN 413 130 972 », « SIRET 413 130 972 » (9 chiffres : un SIREN), « SIRET 413 130 972 00018 » (ses 9 premiers).
    const acheteur = valeurs.find((v) => v.champ === "acheteur.siren")?.valeur;
    const lus = seulesLectures(pages, RE_SIREN_SIRET, 1)
      .map((r) => ({ ...r, valeur: r.valeur.replace(/\s/g, "").slice(0, 9) }))
      .filter((r) => r.valeur !== acheteur);
    const distincts = [...new Set(lus.map((r) => r.valeur))];
    if (distincts.length === 1) {
      const valide = sirenValide(distincts[0]);
      ajouts.push({
        champ: "fournisseur.siren",
        valeur: distincts[0],
        texte: lus[0].texte,
        page: lus[0].page,
        source: "ia",
        verifiee: valide,
        controle: `relevé sur le texte de la page ${lus[0].page}${valide ? "" : " ; clé SIREN invalide"}`,
      });
    }
  }

  if (absent("fournisseur.iban")) {
    let ibans = seulesLectures(pages, RE_IBAN, 1);
    // Sans étiquette « IBAN » : FR + 2 chiffres + 23 caractères, jamais lu comme une TVA.
    if (ibans.length === 0) ibans = seulesLectures(pages, RE_IBAN_FR_NU, 0);
    if (ibans.length === 0) ibans = seulesLectures(pages, RE_IBAN_FR_MASQUE, 0);
    if (ibans.length === 1) {
      const t = typerValeur("fournisseur.iban", ibans[0].valeur, new Map([["fournisseur.iban", { type: "texte" }]]));
      const forme = regleDeForme("fournisseur.iban", t.valeur);
      ajouts.push({
        champ: "fournisseur.iban",
        valeur: t.valeur,
        texte: ibans[0].texte,
        page: ibans[0].page,
        source: "ia",
        verifiee: forme === null,
        controle: `relevé sur le texte de la page ${ibans[0].page}${forme ? ` ; ${forme}` : ""}`,
      });
    }
  }

  if (absent("mention.exoneration") && !valeurs.some((v) => v.champ === "mention.franchise_293b" && v.valeur === true)) {
    const mentions = seulesLectures(pages, RE_EXONERATION, 0).filter((m) => !/293\s*B/i.test(m.texte));
    if (mentions.length > 0) {
      const m = mentions[0];
      ajouts.push({
        champ: "mention.exoneration",
        valeur: m.texte.slice(0, 300),
        texte: m.texte.slice(0, 2000),
        page: m.page,
        source: "ia",
        verifiee: true,
        controle: `relevée sur le texte de la page ${m.page}`,
      });
    }
  }
  return ajouts;
}

/**
 * Une pièce exonérée (mention.exoneration) sans ventilation rendue : la base hors taxes en catégorie E, taux 0.
 * Sans elle, FILED déduirait la TVA de TTC − HT, octroi de mer compris (convenu avec A4, a4_58).
 */
export function ventilationExoneree(valeurs: ValeurLue[]): ValeurLue | null {
  if (valeurs.some((v) => v.champ === "tva.ventilation")) return null;
  const mention = valeurs.find((v) => v.champ === "mention.exoneration");
  const ht = valeurs.find((v) => v.champ === "montant_ht");
  const tva = valeurs.find((v) => v.champ === "montant_tva");
  if (!mention || !ht || typeof ht.valeur !== "number") return null;
  if (tva && typeof tva.valeur === "number" && tva.valeur !== 0) return null; // exonération partielle : au modèle de ventiler
  return {
    champ: "tva.ventilation",
    valeur: [{ categorie: "E", taux: 0, base: ht.valeur, montant: 0, motif: String(mention.valeur).slice(0, 300) }],
    page: ht.page,
    source: "ia",
    verifiee: ht.verifiee && mention.verifiee,
    controle: "déduite de la mention d'exonération et du total HT (catégorie E)",
  };
}

const TVA_FR = /^FR[0-9A-Z]{2}\d{9}$/;
// Un IBAN FR entier, ou coupé ou masqué : FR + 2 chiffres + au moins 12 caractères (une TVA FR n'en a que 11).
const IBAN_FR = /^FR\d{2}[0-9A-Z]{12}[0-9A-Z•*…·]*$/;

function citationRetrouvee(v: ValeurLue): boolean {
  return v.controle?.startsWith("citation retrouvée") === true || v.controle?.startsWith("relevé") === true;
}

/**
 * Les identifiants rangés sous la mauvaise étiquette (NOBAT, 19/10) : 9 chiffres sous « SIRET » sont un SIREN ;
 * un SIRET de 14 chiffres donne son SIREN ; « FR76 » suivi de 23 caractères est un IBAN, jamais une TVA
 * (une TVA FR, c'est FR + 2 caractères + 9 chiffres).
 */
export function reclasserIdentifiants(valeurs: ValeurLue[], champs: { has(champ: string): boolean }): ValeurLue[] {
  const sortie = [...valeurs];
  const trouver = (c: string) => sortie.find((v) => v.champ === c);
  for (const partie of ["fournisseur", "acheteur"]) {
    const siret = trouver(`${partie}.siret`);
    if (siret && champs.has(`${partie}.siren`)) {
      const chiffres = String(siret.valeur).replace(/\D/g, "");
      if (chiffres.length === 9 && !trouver(`${partie}.siren`)) {
        const valide = sirenValide(chiffres);
        sortie[sortie.indexOf(siret)] = {
          ...siret,
          champ: `${partie}.siren`,
          valeur: chiffres,
          verifiee: citationRetrouvee(siret) && valide,
          controle: `${siret.controle?.split(" ; ")[0] ?? ""} ; 9 chiffres sous « SIRET » : rangé en SIREN${valide ? "" : " ; clé SIREN invalide"}`.slice(0, 300),
        };
      } else if (chiffres.length === 14 && !trouver(`${partie}.siren`)) {
        const siren = chiffres.slice(0, 9);
        sortie.push({
          champ: `${partie}.siren`,
          valeur: siren,
          texte: siret.texte,
          page: siret.page,
          source: siret.source,
          verifiee: siret.verifiee && sirenValide(siren),
          controle: "déduit des 9 premiers chiffres du SIRET",
        });
      }
    }
    const tva = trouver(`${partie}.tva`);
    const tvaBrute = tva ? normaliserIban(String(tva.valeur)) : "";
    if (tva && IBAN_FR.test(tvaBrute) && !TVA_FR.test(String(tva.valeur))) {
      const iban = `${partie}.iban`;
      if (champs.has(iban) && !trouver(iban)) {
        const forme = regleDeForme(iban, tvaBrute);
        sortie[sortie.indexOf(tva)] = {
          ...tva,
          champ: iban,
          valeur: tvaBrute,
          verifiee: citationRetrouvee(tva) && forme === null,
          controle: `${tva.controle?.split(" ; ")[0] ?? ""} ; FR + 2 chiffres + plus de 11 caractères : un IBAN, pas une TVA${forme ? ` ; ${forme}` : ""}`.slice(0, 300),
        };
      } else {
        sortie.splice(sortie.indexOf(tva), 1); // un IBAN n'est jamais une TVA
      }
    }
  }
  return sortie;
}

/**
 * Une liste d'objets lus (les réserves d'un PV, les dispositions d'une note) : une seule valeur, chaque élément
 * avec sa page. Un élément sans son texte principal n'est pas rendu ; une échéance n'est gardée que si c'est une
 * date écrite. La liste est vérifiée si chaque texte principal se retrouve sur sa page.
 */
export function valeurListeObjets(
  champ: string,
  brutes: LigneBrute[] | undefined,
  pages: PageLue[],
  colonnes: readonly string[],
  principal: string,
): ValeurLue | null {
  if (!Array.isArray(brutes) || brutes.length === 0) return null;
  const parNumero = new Map(pages.map((p) => [p.n, p]));
  let retrouves = 0;
  const elements: Record<string, unknown>[] = [];
  for (const l of brutes.slice(0, MAX_LIGNES)) {
    if (!l || typeof l !== "object") continue;
    const e: Record<string, unknown> = {};
    for (const c of colonnes) {
      const v = l[c];
      if (v === undefined || v === null || String(v).trim() === "") continue;
      if (c === "echeance") {
        const d = dateIso(v);
        if (d) e[c] = d;
      } else {
        e[c] = String(v).trim().slice(0, 2000);
      }
    }
    if (typeof e[principal] !== "string") continue;
    const page = Number.isInteger(l.page) ? parNumero.get(l.page as number) : undefined;
    if (page) e.page = page.n;
    if (page && retrouver(e[principal] as string, page.texte).trouve) retrouves++;
    elements.push(e);
  }
  if (elements.length === 0) return null;
  return {
    champ,
    valeur: elements,
    page: elements.find((e) => typeof e.page === "number")?.page as number | undefined,
    source: "ia",
    verifiee: retrouves === elements.length,
    controle: `${retrouves}/${elements.length} éléments retrouvés sur leur page`,
  };
}

/** « 7h30 », « 7:30 », « 7,5 » → 7.5 ; null si ce n'est pas une durée. */
export function heuresDepuisTexte(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 && v <= 24 ? v : null;
  const t = String(v ?? "").trim().toLowerCase();
  const hm = t.match(/^(\d{1,2})\s*(?:h|:)\s*(\d{2})?$/);
  const n = hm ? Number(hm[1]) + (hm[2] ? Number(hm[2]) / 60 : 0) : nombreDepuisTexte(t.replace(/\s*h(eures?)?$/, ""));
  return n !== null && n >= 0 && n <= 24 ? Math.round(n * 100) / 100 : null;
}

/** Les formes imprimées d'une durée (7.5 → « 7,5 », « 7.5 », « 7h30 », « 7:30 »). */
function formesHeures(h: number): string[] {
  const ent = Math.floor(h);
  const min = Math.round((h - ent) * 60);
  const formes = [String(h).replace(".", ","), String(h), `${ent}h${String(min).padStart(2, "0")}`, `${ent}:${String(min).padStart(2, "0")}`];
  if (min === 0) formes.push(`${ent}h`, `${ent},00`, `${ent}.00`);
  return formes;
}

/** Les formes imprimées d'une date ISO (« 14/10/2026 », « 14/10/26 », « 14/10 », « 14.10.2026 »). */
function formesDate(iso: string): string[] {
  const [a, m, j] = iso.split("-");
  return [`${j}/${m}/${a}`, `${j}/${m}/${a.slice(2)}`, `${j}.${m}.${a}`, `${j}-${m}-${a}`, `${j}/${m}`, iso];
}

/**
 * Les heures d'un relevé d'intérimaire : une seule valeur « lignes » [{date, heures, taux?, page}]. Une ligne sans
 * date lisible ou sans heures n'est pas rendue. Vérifiée si chaque date et ses heures se retrouvent sur leur page,
 * et si la somme égale le total écrit (quand il l'est).
 */
export function valeurHeures(brutes: LigneBrute[] | undefined, pages: PageLue[], totalEcrit: number | null): ValeurLue | null {
  if (!Array.isArray(brutes) || brutes.length === 0) return null;
  const parNumero = new Map(pages.map((p) => [p.n, p]));
  let retrouvees = 0;
  const lignes: Record<string, unknown>[] = [];
  for (const l of brutes.slice(0, MAX_LIGNES)) {
    if (!l || typeof l !== "object") continue;
    const date = dateIso(l.date);
    const heures = heuresDepuisTexte(l.heures);
    if (!date || heures === null) continue;
    const e: Record<string, unknown> = { date, heures };
    const taux = l.taux === undefined || l.taux === null || l.taux === "" ? null : nombreDepuisTexte(l.taux);
    if (taux !== null) e.taux = taux;
    const page = Number.isInteger(l.page) ? parNumero.get(l.page as number) : undefined;
    if (page) {
      e.page = page.n;
      const ok = (formes: string[]) => formes.some((f) => retrouver(f, page.texte).trouve);
      if (ok(formesDate(date)) && ok(formesHeures(heures))) retrouvees++;
    }
    lignes.push(e);
  }
  if (lignes.length === 0) return null;
  const somme = Math.round(lignes.reduce((s, e) => s + (e.heures as number), 0) * 100) / 100;
  const ecart = totalEcrit !== null && Math.abs(somme - totalEcrit) > 0.01;
  return {
    champ: "lignes",
    valeur: lignes,
    page: lignes.find((e) => typeof e.page === "number")?.page as number | undefined,
    source: "ia",
    verifiee: retrouvees === lignes.length && !ecart,
    controle: `${retrouvees}/${lignes.length} jours retrouvés sur leur page ; somme ${somme} h` +
      (totalEcrit === null ? "" : ecart ? ` ≠ total écrit ${totalEcrit} h` : " = total écrit"),
  };
}
