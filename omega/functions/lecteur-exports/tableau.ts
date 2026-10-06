// Décoder un export tabulaire : CSV (encodage et séparateur devinés) ou XLSX
// (SheetJS). Sortie : des feuilles, chacune avec une ligne d'en-tête et ses
// lignes, toutes les cellules en texte tel que lu.

export interface Feuille {
  nom: string;
  entetes: string[];
  lignes: string[][];
  /** Pour chaque ligne, son numéro dans le fichier (en-tête compris, à partir de 1). */
  numeros: number[];
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

/** Les enregistrements d'un CSV avec leur numéro de ligne, en tenant compte des sauts de ligne entre guillemets. */
function enregistrements(texte: string): { texte: string; ligne: number }[] {
  const sortie: { texte: string; ligne: number }[] = [];
  let courant = "";
  let debut = 1;
  let ligne = 1;
  let entre = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (c === '"') entre = !entre;
    const fin = c === "\n" || (c === "\r" && texte[i + 1] === "\n") || (c === "\r" && !entre);
    if (c === "\n" || c === "\r") {
      if (c === "\r" && texte[i + 1] === "\n") i++;
      ligne++;
      if (!entre) {
        sortie.push({ texte: courant, ligne: debut });
        courant = "";
        debut = ligne;
        continue;
      }
      courant += "\n";
      continue;
    }
    if (fin) continue;
    courant += c;
  }
  if (courant !== "") sortie.push({ texte: courant, ligne: debut });
  return sortie;
}

export function lireCsv(octets: Uint8Array, separateur?: string): Tableau {
  const { texte, encodage } = decoderTexte(octets);
  const sep = separateur ?? devinerSeparateur(texte);
  const brutes = enregistrements(texte).filter((l) => l.texte.trim() !== "");
  const [tete, ...reste] = brutes;
  const entetes = (tete ? decouperLigne(tete.texte, sep) : []).map((e) => e.trim().replace(/^\uFEFF/, ""));
  const lignes: string[][] = [];
  const numeros: number[] = [];
  for (const r of reste) {
    const l = decouperLigne(r.texte, sep).map((c) => c.trim());
    if (!l.some((c) => c !== "")) continue;
    // Une ligne plus courte que l'en-tête se complète ; plus longue, elle garde ses cellules en trop.
    while (l.length < entetes.length) l.push("");
    lignes.push(l);
    numeros.push(r.ligne);
  }
  return { format: "csv", encodage, separateur: sep, feuilles: [{ nom: "csv", entetes, lignes, numeros }] };
}

export async function lireXlsx(octets: Uint8Array): Promise<Tableau> {
  const XLSX = await import("xlsx");
  const classeur = XLSX.read(octets, { type: "array", cellDates: true, raw: false });
  const feuilles: Feuille[] = [];
  for (const nom of classeur.SheetNames) {
    const feuille = classeur.Sheets[nom];
    // Le texte affiché garde les zéros de tête et les formats de nombre ; mais une date au format
    // par défaut du classeur s'affiche à l'américaine (« 10/6/26 », heure perdue) : les dates se
    // reprennent donc de la valeur brute, en AAAA-MM-JJ[ HH:MM[:SS]], heure du classeur.
    const options = { header: 1, defval: "", blankrows: false } as const;
    const matrice = XLSX.utils.sheet_to_json<unknown[]>(feuille, { ...options, raw: false }) as unknown[][];
    const brute = XLSX.utils.sheet_to_json<unknown[]>(feuille, { ...options, raw: true }) as unknown[][];
    const texte = (v: unknown, b: unknown) =>
      b instanceof Date ? dateDuClasseur(b) : v === null || v === undefined ? "" : v instanceof Date ? dateDuClasseur(v) : String(v).trim();
    const lignesTexte = matrice.map((l, i) => l.map((v, k) => texte(v, brute[i]?.[k])));
    const premiere = lignesTexte.findIndex((l) => l.some((c) => c !== ""));
    if (premiere < 0) continue;
    const entetes = lignesTexte[premiere];
    const lignes: string[][] = [];
    const numeros: number[] = [];
    lignesTexte.forEach((l, i) => {
      if (i <= premiere || !l.some((c) => c !== "")) return;
      while (l.length < entetes.length) l.push("");
      lignes.push(l);
      numeros.push(i + 1);
    });
    feuilles.push({ nom, entetes, lignes, numeros });
  }
  return { format: "xlsx", feuilles };
}

/**
 * Une date de classeur (lue par SheetJS en heure locale du processus) en texte sans fuseau :
 * « 2026-10-06 », « 2026-10-06 08:30 », « 2026-10-06 08:30:15 », ou « 08:30 » pour une heure seule
 * (jour 0 du calendrier d'Excel). Arrondie à la seconde (SheetJS rend parfois 08:29:59.999).
 */
export function dateDuClasseur(d: Date): string {
  if (Number.isNaN(d.getTime())) return "";
  const r = new Date(Math.round(d.getTime() / 1000) * 1000);
  const deux = (n: number) => String(n).padStart(2, "0");
  const jour = `${r.getFullYear()}-${deux(r.getMonth() + 1)}-${deux(r.getDate())}`;
  const h = r.getHours(), m = r.getMinutes(), sec = r.getSeconds();
  const heure = h === 0 && m === 0 && sec === 0 ? "" : `${deux(h)}:${deux(m)}${sec ? `:${deux(sec)}` : ""}`;
  if (r.getFullYear() <= 1900 && r.getMonth() === 11 && r.getDate() >= 30) return heure || "00:00";
  return heure ? `${jour} ${heure}` : jour;
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
