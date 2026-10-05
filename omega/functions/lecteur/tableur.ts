// Les tableurs et fichiers texte : chaque feuille devient une page de texte,
// une ligne par ligne, cellules séparées par « | ». L'IA lit ensuite ce texte.

export interface FeuilleTexte {
  nom: string;
  texte: string;
}

/** CSV / TSV : séparateur deviné (;, , ou tabulation), guillemets respectés. */
export function lireCsv(contenu: string): FeuilleTexte[] {
  const texte = contenu.replace(/^﻿/, "");
  const premiere = texte.split(/\r?\n/, 1)[0] ?? "";
  const sep = [";", "\t", ","].map((s) => [s, premiere.split(s).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const lignes: string[] = [];
  let cellule = "";
  let ligne: string[] = [];
  let entreGuillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (entreGuillemets) {
      if (c === '"' && texte[i + 1] === '"') {
        cellule += '"';
        i++;
      } else if (c === '"') entreGuillemets = false;
      else cellule += c;
    } else if (c === '"') entreGuillemets = true;
    else if (c === sep) {
      ligne.push(cellule);
      cellule = "";
    } else if (c === "\n" || (c === "\r" && texte[i + 1] === "\n")) {
      if (c === "\r") i++;
      ligne.push(cellule);
      lignes.push(ligne.map((x) => x.trim()).join(" | "));
      ligne = [];
      cellule = "";
    } else cellule += c;
  }
  if (cellule !== "" || ligne.length > 0) {
    ligne.push(cellule);
    lignes.push(ligne.map((x) => x.trim()).join(" | "));
  }
  return [{ nom: "feuille", texte: lignes.filter((l) => l.replace(/\|/g, "").trim() !== "").join("\n") }];
}

/** XLSX par SheetJS, chargé à la demande : une page par feuille non vide. */
export async function lireXlsx(octets: Uint8Array): Promise<FeuilleTexte[]> {
  const XLSX = await import("xlsx");
  const classeur = XLSX.read(octets, { type: "array", cellDates: true });
  const feuilles: FeuilleTexte[] = [];
  for (const nom of classeur.SheetNames) {
    const csv = XLSX.utils.sheet_to_csv(classeur.Sheets[nom], { FS: ";", blankrows: false });
    const [f] = lireCsv(csv);
    if (f.texte.trim() !== "") feuilles.push({ nom, texte: f.texte });
  }
  return feuilles;
}
