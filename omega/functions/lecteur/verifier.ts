// La vérification : une valeur n'est « vérifiée » que si sa citation se
// retrouve dans le texte de la page citée, et si les règles de forme (clé
// SIREN, clé de TVA, date, nombre) tiennent. Rien n'est inventé ici : on ne
// fait que confirmer ou douter.

import type { Boite, PageLue, ValeurLue } from "@partage/portes.ts";
import { dateIso, nombreDepuisTexte, retrouver, sirenValide, tvaFrValide } from "@partage/texte.ts";
import { boiteDe, type PagePdf } from "./pdf.ts";
import { CHAMPS_LIGNE, CHAMPS_PAR_NOM, CHAMPS_VENTILATION, MAX_LIGNES } from "./schemas/facture.ts";

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

/** Met la valeur dans le type attendu par FILED ; null si elle n'y entre pas. */
export function typerValeur(champ: string, valeur: unknown): { valeur: unknown; ok: boolean; detail?: string } {
  const def = CHAMPS_PAR_NOM.get(champ);
  if (!def) return { valeur, ok: false, detail: "champ inconnu du schéma" };
  switch (def.type) {
    case "nombre": {
      const n = nombreDepuisTexte(valeur);
      return n === null ? { valeur, ok: false, detail: "nombre illisible" } : { valeur: n, ok: true };
    }
    case "date": {
      const d = dateIso(valeur);
      return d === null ? { valeur, ok: false, detail: "date illisible" } : { valeur: d, ok: true };
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
      if (champ.endsWith(".tva") || champ.endsWith(".iban")) s = s.replace(/[\s.\-]/g, "").toUpperCase();
      if (champ.endsWith(".pays") || champ === "devise") s = s.toUpperCase();
      return s === "" ? { valeur: s, ok: false, detail: "vide" } : { valeur: s, ok: true };
    }
  }
}

/** Les règles de forme que FILED applique ensuite : autant douter tout de suite. */
function regleDeForme(champ: string, valeur: unknown): string | null {
  const s = String(valeur ?? "");
  if (champ.endsWith(".siren") && !sirenValide(s)) return "clé SIREN invalide";
  if (champ.endsWith(".siret") && !(/^\d{14}$/.test(s) && sirenValide(s))) return "SIRET invalide";
  if (champ.endsWith(".tva") && s.startsWith("FR") && !tvaFrValide(s)) return "clé de TVA invalide";
  if (champ.endsWith(".pays") && !/^[A-Z]{2}$/.test(s)) return "code pays attendu sur deux lettres";
  if (champ === "devise" && !/^[A-Z]{3}$/.test(s)) return "devise ISO attendue sur trois lettres";
  if (champ.endsWith(".iban") && !/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return "IBAN mal formé";
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
): Verification {
  const parNumero = new Map(pages.map((p) => [p.n, p]));
  const pdfParNumero = new Map((pagesPdf ?? []).map((p) => [p.n, p]));
  const valeurs: ValeurLue[] = [];
  const vus = new Set<string>();

  for (const b of brutes) {
    if (!b || typeof b.champ !== "string" || !/^[a-z][a-z0-9_.]{1,79}$/.test(b.champ)) continue;
    if (!CHAMPS_PAR_NOM.has(b.champ) || vus.has(b.champ)) continue;
    if (b.valeur === null || b.valeur === undefined || b.valeur === "") continue;
    vus.add(b.champ);

    const typage = typerValeur(b.champ, b.valeur);
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
    } else {
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
  for (const def of CHAMPS_PAR_NOM.values()) {
    if (!def.cle) continue;
    const v = valeurs.find((x) => x.champ === def.champ);
    if (!v || !v.verifiee) clesDouteuses.push(def.champ);
  }
  return { valeurs, clesDouteuses };
}

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
export function valeurLignes(brutes: LigneBrute[] | undefined, pages: PageLue[], source: "ia" | "tableur" = "ia"): ValeurLue | null {
  if (!Array.isArray(brutes) || brutes.length === 0) return null;
  const parNumero = new Map(pages.map((p) => [p.n, p]));
  const lignes = brutes.slice(0, MAX_LIGNES).filter((l) => l && typeof l === "object");
  let retrouvees = 0;
  const nettoyees = lignes.map((l) => {
    const n = nettoyerLigne(l, CHAMPS_LIGNE);
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
