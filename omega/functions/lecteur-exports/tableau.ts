// Décoder un export tabulaire : CSV (encodage et séparateur devinés) ou XLSX
// (SheetJS). Sortie : des feuilles, chacune avec une ligne d'en-tête et ses
// lignes, toutes les cellules en texte tel que lu.

export interface Feuille {
  nom: string;
  entetes: string[];
  lignes: string[][];
}

export interface Tableau {
  format: "csv" | "xlsx";
  encodage?: "utf-8" | "utf-8-bom" | "windows-1252";
  separateur?: string;
  feuilles: Feuille[];
}

const SEPARATEURS = [";", ",", "\t", "|"];

/** UTF-8 (avec ou sans BOM) si les octets sont valides, sinon Windows-1252 (les exports français d'antan). */
export function decoderTexte(octets: Uint8Array): { texte: string; encodage: NonNullable<Tableau["encodage"]> } {
  if (octets.length >= 3 && octets[0] === 0xef && octets[1] === 0xbb && octets[2] === 0xbf) {
    return { texte: new TextDecoder("utf-8").decode(octets.subarray(3)), encodage: "utf-8-bom" };
  }
  if (octets.length >= 2 && ((octets[0] === 0xff && octets[1] === 0xfe) || (octets[0] === 0xfe && octets[1] === 0xff))) {
    const utf16 = octets[0] === 0xff ? "utf-16le" : "utf-16be";
    return { texte: new TextDecoder(utf16).decode(octets.subarray(2)), encodage: "utf-8" };
  }
  try {
    return { texte: new TextDecoder("utf-8", { fatal: true }).decode(octets), encodage: "utf-8" };
  } catch {
    return { texte: new TextDecoder("windows-1252").decode(octets), encodage: "windows-1252" };
  }
}

/** Le séparateur qui donne le même nombre de champs (> 1) sur les premières lignes. */
export function devinerSeparateur(texte: string): string {
  const lignes = texte.split(/\r?\n/).filter((l) => l.trim() !== "").slice(0, 20);
  if (lignes.length === 0) return ";";
  let meilleur = ";";
  let meilleurScore = -1;
  for (const sep of SEPARATEURS) {
    const comptes = lignes.map((l) => decouperLigne(l, sep).length);
    const premier = comptes[0];
    if (premier < 2) continue;
    const stables = comptes.filter((c) => c === premier).length;
    const score = stables * 1000 + premier;
    if (score > meilleurScore) {
      meilleurScore = score;
      meilleur = sep;
    }
  }
  return meilleur;
}

/** Une ligne CSV en cellules : guillemets doublés respectés. */
export function decouperLigne(ligne: string, sep: string): string[] {
  const cellules: string[] = [];
  let cellule = "";
  let entre = false;
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (entre) {
      if (c === '"' && ligne[i + 1] === '"') {
        cellule += '"';
        i++;
      } else if (c === '"') entre = false;
      else cellule += c;
    } else if (c === '"') entre = true;
    else if (c === sep) {
      cellules.push(cellule);
      cellule = "";
    } else cellule += c;
  }
  cellules.push(cellule);
  return cellules;
}

/** Les enregistrements d'un CSV, en tenant compte des sauts de ligne entre guillemets. */
function enregistrements(texte: string): string[] {
  const sortie: string[] = [];
  let courant = "";
  let entre = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (c === '"') entre = !entre;
    if (!entre && (c === "\n" || (c === "\r" && texte[i + 1] === "\n"))) {
      if (c === "\r") i++;
      sortie.push(courant);
      courant = "";
      continue;
    }
    if (!entre && c === "\r") {
      sortie.push(courant);
      courant = "";
      continue;
    }
    courant += c;
  }
  if (courant !== "") sortie.push(courant);
  return sortie;
}

export function lireCsv(octets: Uint8Array, separateur?: string): Tableau {
  const { texte, encodage } = decoderTexte(octets);
  const sep = separateur ?? devinerSeparateur(texte);
  const brutes = enregistrements(texte).filter((l) => l.trim() !== "");
  const [tete, ...reste] = brutes.map((l) => decouperLigne(l, sep).map((c) => c.trim()));
  const entetes = (tete ?? []).map((e) => e.replace(/^﻿/, ""));
  const lignes = reste.filter((l) => l.some((c) => c !== "")).map((l) => {
    // Une ligne plus courte que l'en-tête se complète ; plus longue, elle garde ses cellules en trop.
    while (l.length < entetes.length) l.push("");
    return l;
  });
  return { format: "csv", encodage, separateur: sep, feuilles: [{ nom: "csv", entetes, lignes }] };
}

export async function lireXlsx(octets: Uint8Array): Promise<Tableau> {
  const XLSX = await import("xlsx");
  const classeur = XLSX.read(octets, { type: "array", cellDates: true, raw: false });
  const feuilles: Feuille[] = [];
  for (const nom of classeur.SheetNames) {
    const feuille = classeur.Sheets[nom];
    const matrice = XLSX.utils.sheet_to_json<unknown[]>(feuille, { header: 1, raw: false, defval: "", blankrows: false }) as unknown[][];
    const texte = (v: unknown) => (v === null || v === undefined ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim());
    const lignesTexte = matrice.map((l) => l.map(texte));
    const premiere = lignesTexte.findIndex((l) => l.some((c) => c !== ""));
    if (premiere < 0) continue;
    const entetes = lignesTexte[premiere];
    const lignes = lignesTexte.slice(premiere + 1).filter((l) => l.some((c) => c !== "")).map((l) => {
      while (l.length < entetes.length) l.push("");
      return l;
    });
    feuilles.push({ nom, entetes, lignes });
  }
  return { format: "xlsx", feuilles };
}

export function estXlsx(octets: Uint8Array): boolean {
  return octets.length >= 4 && octets[0] === 0x50 && octets[1] === 0x4b && octets[2] === 0x03 && octets[3] === 0x04;
}

export function estPdf(octets: Uint8Array): boolean {
  return octets.length >= 4 && octets[0] === 0x25 && octets[1] === 0x50 && octets[2] === 0x44 && octets[3] === 0x46;
}

/** CSV ou XLSX selon les octets, le MIME et le nom ; null si ce n'est ni l'un ni l'autre. */
export async function lireTableau(octets: Uint8Array, mime: string, nom: string): Promise<Tableau | null> {
  const ext = (nom.split(".").pop() ?? "").toLowerCase();
  if (estXlsx(octets)) {
    if (ext === "xlsx" || ext === "xlsm" || ext === "xls" || /spreadsheet|excel/i.test(mime)) return await lireXlsx(octets);
    return null; // une archive zip qui n'est pas un classeur
  }
  if (estPdf(octets)) return null;
  // Un vieux .xls binaire (BIFF) commence par D0 CF 11 E0 : SheetJS le lit aussi.
  if (octets.length >= 4 && octets[0] === 0xd0 && octets[1] === 0xcf && octets[2] === 0x11 && octets[3] === 0xe0) return await lireXlsx(octets);
  const { texte } = decoderTexte(octets.subarray(0, 4096));
  // Des octets de commande (hors tabulation et sauts de ligne) : un binaire inconnu, pas un texte.
  for (const ch of texte) {
    const c = ch.charCodeAt(0);
    if (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) return null;
  }
  return lireCsv(octets);
}
