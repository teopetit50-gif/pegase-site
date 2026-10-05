// Les exports d'exemple, entièrement fictifs : `deno task exemples`.
// - patients_tiroma.csv : séparateur « ; », Windows-1252, en-têtes accentués ;
// - articles_varelo.xlsx : un classeur SheetJS, deux feuilles dont une vide ;
// - mouvements_utf8_bom.csv : séparateur « , », UTF-8 avec BOM, guillemets et saut de ligne dans une cellule.

import * as XLSX from "xlsx";

const ici = new URL(".", import.meta.url);

export function csvPatients(): Uint8Array {
  const lignes = [
    "N° dossier;Nom;Prénom;Date de naissance;Téléphone;Dernière visite;Praticien",
    "D-0001;DURAND;Élodie;12/03/1988;06 12 34 56 78;02/09/2026;Dr Lefèvre",
    "D-0002;MARTIN;Noé;05/11/2015;;15/09/2026;Dr Lefèvre",
    "D-0003;NGUYEN;Linh;30/07/1979;06 98 76 54 32;;Dr Aït",
    '"D-0004";"PÉREZ, José";"Ángel";"01/01/1990";"07 00 00 00 00";"20/09/2026";"Dr Lefèvre"',
    ";;;;;;",
  ];
  return windows1252(lignes.join("\r\n") + "\r\n");
}

export function csvMouvements(): Uint8Array {
  const lignes = [
    "Référence,Désignation,Quantité,Prix unitaire HT,Date",
    'ART-1,"Vis inox 4x40, boîte de 200",12,"8,90",2026-09-01',
    'ART-2,"Plaque BA13\n(2,5 m)",40,"5,36",2026-09-02',
    "ART-3,Mastic acrylique,3,,2026-09-03",
  ];
  const corps = new TextEncoder().encode(lignes.join("\n") + "\n");
  const sortie = new Uint8Array(corps.length + 3);
  sortie.set([0xef, 0xbb, 0xbf], 0);
  sortie.set(corps, 3);
  return sortie;
}

export function xlsxArticles(): Uint8Array {
  const classeur = XLSX.utils.book_new();
  const vide = XLSX.utils.aoa_to_sheet([[]]);
  XLSX.utils.book_append_sheet(classeur, vide, "Notes");
  const articles = XLSX.utils.aoa_to_sheet([
    ["Code article", "Libellé", "Famille", "Stock", "PU HT", "Fournisseur"],
    ["A100", "Tube cuivre 12 mm", "Plomberie", 120, 3.2, "Cuivrex"],
    ["A101", "Coude PVC 40", "Plomberie", 0, 0.85, "Plastiq"],
    ["A200", "Disjoncteur 16 A", "Électricité", 35, 12.5, "Voltéo"],
  ]);
  XLSX.utils.book_append_sheet(classeur, articles, "Articles");
  return new Uint8Array(XLSX.write(classeur, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
}

/** Encodage Windows-1252 des caractères du français courant. */
export function windows1252(s: string): Uint8Array {
  const table: Record<number, number> = {
    0x20ac: 0x80,
    0x0153: 0x9c,
    0x0152: 0x8c,
    0x2019: 0x92,
    0x2018: 0x91,
    0x201c: 0x93,
    0x201d: 0x94,
    0x2013: 0x96,
    0x2014: 0x97,
    0x2026: 0x85,
  };
  const o: number[] = [];
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c < 0x100) o.push(c);
    else if (table[c] !== undefined) o.push(table[c]);
    else o.push(0x3f);
  }
  return new Uint8Array(o);
}

if (import.meta.main) {
  await Deno.writeFile(new URL("patients_tiroma.csv", ici), csvPatients());
  await Deno.writeFile(new URL("mouvements_utf8_bom.csv", ici), csvMouvements());
  await Deno.writeFile(new URL("articles_varelo.xlsx", ici), xlsxArticles());
  console.log("exemples écrits");
}
