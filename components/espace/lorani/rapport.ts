/* ══════════════════════════════════════════════════════════════════════
   Le rapport du contrôle du dossier (b5_16) — PDF annoté et Excel,
   fabriqués dans le navigateur, sans bibliothèque de plus (06/10/2026, B5)

   · Excel : un vrai .xlsx (Office Open XML) — deux feuilles, « Constats »
     (une ligne par valeur citée : n°, gravité, nature, constat, correction
     proposée, article, pièce, page, texte lu, valeur, statut, motif) et
     « Pièces ». Le zip est écrit ici, sans compression (méthode « stored »),
     avec son CRC-32 : Excel, LibreOffice et Numbers l'ouvrent.
   · PDF : les pages du rapport (le contrôle, puis chaque constat numéroté
     avec sa correction et ses citations), puis chaque page citée des pièces,
     rendue par pdf.js, avec un cadre rouge et le numéro du constat posés sur
     la boîte lue (fractions {x, y, l, h}, y depuis le haut — contrat de
     lecture). Le PDF est écrit à la main : Helvetica en WinAnsi pour le
     texte, les pages annotées en JPEG. Une pièce que le navigateur ne peut
     pas ouvrir (exemple, droit refusé) donne une page « non disponible »
     avec les cadres sur fond blanc, pour que le rapport reste complet.
   ══════════════════════════════════════════════════════════════════════ */

import type { Constat, Controle, ControlePiece, PieceProjet, Projet } from "./types";

export type DonneesRapport = {
  projet: Projet;
  controle: Controle;
  precedent: Controle | null;
  pieces: ControlePiece[];
  constats: Constat[];
  corriges: Constat[];
  pieceDe: (id: string | undefined) => PieceProjet | undefined;
  nommer: (id: string | null | undefined) => string;
  /* les octets d'une pièce (base réelle : fichier signé) ; null si on ne peut pas l'ouvrir */
  octets: (piece: PieceProjet) => Promise<Uint8Array | null>;
};

const GRAVITE: Record<Constat["gravite"], string> = { bloquant: "Bloquant", majeur: "Majeur", mineur: "Mineur" };
const NATURE: Record<Constat["nature"], string> = { incoherence: "Entre les planches", plu: "Contre le PLU", cctp_dpgf: "CCTP et DPGF" };
const STATUT: Record<Constat["statut"], string> = { ouvert: "Ouvert", corrige: "Corrigé", accepte: "Accepté", ecarte: "Écarté" };
const RANG: Record<Constat["gravite"], number> = { bloquant: 0, majeur: 1, mineur: 2 };

/* les constats dans l'ordre du rapport : ouverts d'abord, du plus grave au moins grave */
export function ordonner(constats: Constat[]): Constat[] {
  return [...constats].sort((a, b) => (a.statut === "ouvert" ? 0 : 1) - (b.statut === "ouvert" ? 0 : 1) || RANG[a.gravite] - RANG[b.gravite] || a.titre.localeCompare(b.titre));
}

const unite = (g: string | null) => (!g ? "" : g.endsWith("_m2") ? " m²" : g === "cote_altimetrique_m" ? " m NGF" : g.endsWith("_m") ? " m" : g.endsWith("_pct") ? " %" : "");
const dateFr = (d: string | null) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("fr-FR") : "—");
const nomFichier = (d: DonneesRapport, ext: string) =>
  `controle-${(d.projet.reference ?? d.projet.nom).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}-indice-${d.controle.indice}.${ext}`;

export function telecharger(nom: string, octets: Uint8Array, type: string) {
  const url = URL.createObjectURL(new Blob([octets as BlobPart], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ——— le zip « stored » ——— */

const TABLE_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = TABLE_CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function zip(fichiers: { nom: string; donnees: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let decalage = 0;
  for (const f of fichiers) {
    const nom = enc.encode(f.nom);
    const crc = crc32(f.donnees);
    const tete = new DataView(new ArrayBuffer(30));
    tete.setUint32(0, 0x04034b50, true);
    tete.setUint16(4, 20, true);
    tete.setUint16(6, 0x0800, true); /* noms en UTF-8 */
    tete.setUint16(8, 0, true); /* stored */
    tete.setUint16(10, 0, true);
    tete.setUint16(12, 0x21, true); /* 01/01/1980 */
    tete.setUint32(14, crc, true);
    tete.setUint32(18, f.donnees.length, true);
    tete.setUint32(22, f.donnees.length, true);
    tete.setUint16(26, nom.length, true);
    tete.setUint16(28, 0, true);
    parts.push(new Uint8Array(tete.buffer), nom, f.donnees);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, 0, true);
    c.setUint16(14, 0x21, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, f.donnees.length, true);
    c.setUint32(24, f.donnees.length, true);
    c.setUint16(28, nom.length, true);
    c.setUint32(42, decalage, true);
    central.push(new Uint8Array(c.buffer), nom);
    decalage += 30 + nom.length + f.donnees.length;
  }
  const tailleCentral = central.reduce((n, x) => n + x.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, fichiers.length, true);
  fin.setUint16(10, fichiers.length, true);
  fin.setUint32(12, tailleCentral, true);
  fin.setUint32(16, decalage, true);
  return concat([...parts, ...central, new Uint8Array(fin.buffer)]);
}
function concat(l: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(l.reduce((n, x) => n + x.length, 0));
  let i = 0;
  for (const x of l) {
    out.set(x, i);
    i += x.length;
  }
  return out;
}

/* ——— l'Excel ——— */

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
const colonne = (i: number) => (i < 26 ? String.fromCharCode(65 + i) : String.fromCharCode(64 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26)));

function feuille(lignes: (string | number | null)[][], largeurs: number[]): string {
  const cols = largeurs.map((l, i) => `<col min="${i + 1}" max="${i + 1}" width="${l}" customWidth="1"/>`).join("");
  const rows = lignes.map((l, r) => `<row r="${r + 1}">${l.map((v, c) => {
    const ref = `${colonne(c)}${r + 1}`;
    const style = r === 0 ? ' s="1"' : ' s="2"';
    if (v === null || v === "") return `<c r="${ref}"${style}/>`;
    if (typeof v === "number") return `<c r="${ref}"${style}><v>${v}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
  }).join("")}</row>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${rows}</sheetData><autoFilter ref="A1:${colonne(largeurs.length - 1)}${Math.max(1, lignes.length)}"/></worksheet>`;
}

export function excelControle(d: DonneesRapport): { nom: string; octets: Uint8Array } {
  const tous = ordonner(d.constats);
  const lignes: (string | number | null)[][] = [["N°", "Gravité", "Nature", "Constat", "Correction proposée", "Article", "Pièce", "Page", "Texte lu", "Valeur", "Statut", "Motif", "Décidé par", "Relevé depuis l'indice précédent"]];
  tous.forEach((k, i) => {
    const valeurs = k.valeurs.length ? k.valeurs : [{}];
    for (const v of valeurs as Constat["valeurs"]) {
      const piece = v.regle ? `${v.reference ?? "Règlement"} (règle : ${v.borne === "max" ? "au plus" : "au moins"} ${v.valeur ?? ""}${unite(k.grandeur)})` : v.reference ?? d.pieceDe(v.piece)?.nom_fichier ?? null;
      lignes.push([i + 1, GRAVITE[k.gravite], NATURE[k.nature], k.titre, k.correction, k.article ?? v.article ?? null, piece, v.page ?? null, v.texte ?? null,
        typeof v.valeur === "number" ? v.valeur : v.valeur ?? null, STATUT[k.statut], k.motif, k.decide_par ? d.nommer(k.decide_par) : null, k.precedent_id ? "oui" : null]);
    }
  });
  if (d.precedent) for (const k of d.corriges) lignes.push([null, GRAVITE[k.gravite], NATURE[k.nature], k.titre, k.correction, k.article, null, null, null, null, `Corrigé à l'indice ${d.controle.indice}`, k.motif, null, `indice ${d.precedent.indice}`]);
  const pieces: (string | number | null)[][] = [["Référence", "Rôle", "Fichier", "Lecture"], ...d.pieces.map((x) => {
    const p = d.pieceDe(x.piece_id);
    return [x.reference, { planche: "Planche", cctp: "CCTP", dpgf: "DPGF", plu: "Règlement du PLU", autre: "Autre" }[x.role], p?.nom_fichier ?? null, p?.statut ?? null];
  })];
  const enc = new TextEncoder();
  const f = (nom: string, s: string) => ({ nom, donnees: enc.encode(s) });
  const titre = `${d.projet.nom} — ${d.controle.intitule}, indice ${d.controle.indice}`.slice(0, 250);
  const octets = zip([
    f("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`),
    f("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`),
    f("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(titre)}</dc:title><dc:creator>Lorani</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>`),
    f("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Constats" sheetId="1" r:id="rId1"/><sheet name="Pièces" sheetId="2" r:id="rId2"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">Constats!$A$1:$N$${lignes.length}</definedName></definedNames></workbook>`),
    f("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    f("xl/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEDEDED"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs></styleSheet>`),
    f("xl/worksheets/sheet1.xml", feuille(lignes, [5, 10, 16, 60, 50, 10, 22, 6, 30, 10, 12, 30, 16, 14])),
    f("xl/worksheets/sheet2.xml", feuille(pieces, [14, 18, 44, 12])),
  ]);
  return { nom: nomFichier(d, "xlsx"), octets };
}

/* ——— le PDF ——— */

/* largeurs Helvetica (millièmes d'em) de l'espace (32) au tilde (126) */
const LARGEURS_HELV = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
/* Unicode → WinAnsi (cp1252) pour ce qui sort de Latin-1 */
const WIN: Record<string, number> = { "€": 0x80, "‚": 0x82, "„": 0x84, "…": 0x85, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "œ": 0x9c, "Œ": 0x8c, "™": 0x99 };
function winAnsi(s: string): number[] {
  const out: number[] = [];
  for (const ch of s.replace(/[   ]/g, " ")) {
    const c = ch.codePointAt(0)!;
    if (WIN[ch] !== undefined) out.push(WIN[ch]);
    else if (c >= 32 && c <= 255 && !(c >= 127 && c < 160)) out.push(c);
    else out.push(0x3f);
  }
  return out;
}
const largeurCar = (c: number, gras: boolean) => (c >= 32 && c <= 126 ? LARGEURS_HELV[c - 32] : c >= 0xc0 ? (c >= 0xe0 ? 556 : 667) : 556) * (gras ? 1.05 : 1);
const largeurTexte = (s: string, taille: number, gras = false) => winAnsi(s).reduce((n, c) => n + largeurCar(c, gras), 0) * taille / 1000;
function couper(s: string, taille: number, max: number, gras = false): string[] {
  const lignes: string[] = [];
  for (const para of s.split("\n")) {
    let l = "";
    for (const mot of para.split(/\s+/).filter(Boolean)) {
      const essai = l ? `${l} ${mot}` : mot;
      if (largeurTexte(essai, taille, gras) <= max || !l) l = essai;
      else {
        lignes.push(l);
        l = mot;
      }
    }
    lignes.push(l);
  }
  return lignes;
}
const chainePdf = (s: string) => {
  let o = "(";
  for (const c of winAnsi(s)) o += c === 0x28 || c === 0x29 || c === 0x5c ? `\\${String.fromCharCode(c)}` : c < 32 || c > 126 ? `\\${c.toString(8).padStart(3, "0")}` : String.fromCharCode(c);
  return `${o})`;
};

type PageTexte = { type: "texte"; flux: string };
type PageImage = { type: "image"; jpeg: Uint8Array; l: number; h: number; legende: string };

/* Les pages de texte du rapport, en A4 (595 × 842 points). */
class Mise {
  pages: PageTexte[] = [];
  private flux = "";
  private y = 0;
  constructor(private pied: string) {
    this.nouvelle();
  }
  private nouvelle() {
    if (this.flux) this.pages.push({ type: "texte", flux: this.flux });
    this.flux = `BT /F1 8 Tf 0.45 g 48 30 Td ${chainePdf(this.pied)} Tj ET\n`;
    this.y = 790;
  }
  fin() {
    this.pages.push({ type: "texte", flux: this.flux });
    this.flux = "";
  }
  texte(s: string, o: { taille?: number; gras?: boolean; gris?: boolean; rouge?: boolean; retrait?: number; apres?: number } = {}) {
    const taille = o.taille ?? 10;
    const x = 48 + (o.retrait ?? 0);
    const lignes = couper(s, taille, 595 - 48 - x, o.gras);
    for (const l of lignes) {
      if (this.y < 60) this.nouvelle();
      const couleur = o.rouge ? "0.75 0.1 0.1 rg" : o.gris ? "0.4 g" : "0 g";
      this.flux += `BT /${o.gras ? "F2" : "F1"} ${taille} Tf ${couleur} ${x} ${this.y.toFixed(1)} Td ${chainePdf(l)} Tj ET\n`;
      this.y -= taille * 1.35;
    }
    this.y -= o.apres ?? 0;
  }
  filet() {
    if (this.y < 70) this.nouvelle();
    this.flux += `0.85 G 0.5 w 48 ${(this.y + 4).toFixed(1)} m 547 ${(this.y + 4).toFixed(1)} l S\n`;
    this.y -= 8;
  }
  reste() {
    return this.y;
  }
  saut() {
    this.nouvelle();
  }
}

function ecrirePdf(pages: (PageTexte | PageImage)[], titre: string): Uint8Array {
  const enc = new TextEncoder();
  const objets: (Uint8Array | string)[] = [];
  const ajouter = (o: Uint8Array | string) => {
    objets.push(o);
    return objets.length;
  };
  ajouter("<< /Type /Catalog /Pages 2 0 R >>");
  ajouter(""); /* les pages, plus bas */
  const f1 = ajouter("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const f2 = ajouter("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const kids: number[] = [];
  for (const p of pages) {
    if (p.type === "texte") {
      const flux = enc.encode(p.flux);
      const c = ajouter(concat([enc.encode(`<< /Length ${flux.length} >>\nstream\n`), flux, enc.encode("\nendstream")]));
      kids.push(ajouter(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${c} 0 R >>`));
    } else {
      /* l'image tient dans la page A4 sous une légende */
      const echelle = Math.min(515 / p.l, 730 / p.h);
      const l = p.l * echelle;
      const h = p.h * echelle;
      const img = ajouter(concat([enc.encode(`<< /Type /XObject /Subtype /Image /Width ${p.l} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`), p.jpeg, enc.encode("\nendstream")]));
      const flux = enc.encode(`BT /F2 10 Tf 0 g 40 812 Td ${chainePdf(p.legende)} Tj ET\nq ${l.toFixed(2)} 0 0 ${h.toFixed(2)} ${((595 - l) / 2).toFixed(2)} ${(790 - h).toFixed(2)} cm /Im1 Do Q\n`);
      const c = ajouter(concat([enc.encode(`<< /Length ${flux.length} >>\nstream\n`), flux, enc.encode("\nendstream")]));
      kids.push(ajouter(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> /XObject << /Im1 ${img} 0 R >> >> /Contents ${c} 0 R >>`));
    }
  }
  objets[1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;
  /* les chaînes de /Info sont en PDFDocEncoding, pas en WinAnsi : le titre part en UTF-16BE */
  const utf16 = [...titre].map((ch) => ch.codePointAt(0)! > 0xffff ? "003F" : ch.codePointAt(0)!.toString(16).padStart(4, "0")).join("");
  const info = ajouter(`<< /Title <FEFF${utf16}> /Producer (Lorani) >>`);
  const morceaux: Uint8Array[] = [enc.encode("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")];
  const positions: number[] = [];
  let n = morceaux[0].length;
  objets.forEach((o, i) => {
    const corps = typeof o === "string" ? enc.encode(o) : o;
    const m = concat([enc.encode(`${i + 1} 0 obj\n`), corps, enc.encode("\nendobj\n")]);
    positions.push(n);
    morceaux.push(m);
    n += m.length;
  });
  const xref = `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n${positions.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objets.length + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${n}\n%%EOF\n`;
  morceaux.push(enc.encode(xref));
  return concat(morceaux);
}

/* ——— les pages annotées ——— */

type Pdfjs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
let pdfjs: Promise<Pdfjs> | null = null;
function chargerPdfjs(): Promise<Pdfjs> {
  if (!pdfjs) {
    pdfjs = import("pdfjs-dist/legacy/build/pdf.mjs").then((m) => {
      try {
        m.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
      } catch {
        /* sans worker, pdf.js travaille sur le fil principal */
      }
      return m;
    });
  }
  return pdfjs;
}

type Marque = { n: number; boite: { x: number; y: number; l: number; h: number } | null };

async function jpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
  return new Uint8Array(await (blob ?? new Blob()).arrayBuffer());
}

function annoter(ctx: CanvasRenderingContext2D, l: number, h: number, marques: Marque[]) {
  ctx.lineWidth = Math.max(2, l / 400);
  ctx.font = `bold ${Math.round(Math.max(14, l / 50))}px Helvetica, Arial, sans-serif`;
  marques.forEach((m, i) => {
    const b = m.boite ?? { x: 0.04, y: 0.08 + i * 0.05, l: 0.2, h: 0.03 };
    const x = b.x * l;
    const y = b.y * h;
    ctx.strokeStyle = "rgb(200, 20, 20)";
    ctx.strokeRect(x - 3, y - 3, b.l * l + 6, b.h * h + 6);
    const t = String(m.n);
    const r = Math.max(11, l / 70);
    ctx.fillStyle = "rgb(200, 20, 20)";
    ctx.beginPath();
    ctx.arc(x - r - 2, y + (b.h * h) / 2, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t, x - r - 2, y + (b.h * h) / 2 + 1);
  });
}

async function pageAnnotee(octets: Uint8Array | null, page: number, marques: Marque[], titre: string): Promise<{ jpeg: Uint8Array; l: number; h: number }> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  if (octets) {
    try {
      const lib = await chargerPdfjs();
      const tache = lib.getDocument({ data: octets.slice() });
      const doc = await tache.promise;
      const p = await doc.getPage(Math.min(Math.max(1, page), doc.numPages));
      const vue = p.getViewport({ scale: 1 });
      const vp = p.getViewport({ scale: Math.min(2, 1400 / vue.width) });
      canvas.width = Math.round(vp.width);
      canvas.height = Math.round(vp.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await p.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
      annoter(ctx, canvas.width, canvas.height, marques);
      void tache.destroy();
      return { jpeg: await jpeg(canvas), l: canvas.width, h: canvas.height };
    } catch {
      /* page illisible ici : on retombe sur la page blanche annotée */
    }
  }
  canvas.width = 1190;
  canvas.height = 1684;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#d4d4d4";
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
  ctx.fillStyle = "#737373";
  ctx.font = "28px Helvetica, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${titre}, page ${page} : fichier non disponible ici, emplacements lus seuls`, 48, canvas.height - 48);
  annoter(ctx, canvas.width, canvas.height, marques);
  return { jpeg: await jpeg(canvas), l: canvas.width, h: canvas.height };
}

export async function pdfControle(d: DonneesRapport): Promise<{ nom: string; octets: Uint8Array }> {
  const tous = ordonner(d.constats);
  const ouverts = tous.filter((k) => k.statut === "ouvert");
  const titre = `Contrôle du dossier — ${d.projet.nom}`;
  const m = new Mise(`${d.projet.nom} · ${d.controle.intitule}, indice ${d.controle.indice} · rapport du ${new Date().toLocaleDateString("fr-FR")} · Lorani`);
  m.texte(titre, { taille: 16, gras: true, apres: 2 });
  m.texte(`${d.controle.intitule}, indice ${d.controle.indice}${d.precedent ? ` (revérifie l'indice ${d.precedent.indice})` : ""} · contrôle passé le ${dateFr(d.controle.lance_le)}`, { gris: true });
  m.texte([d.projet.reference, d.projet.adresse, [d.projet.code_postal, d.projet.commune].filter(Boolean).join(" ")].filter(Boolean).join(" · "), { gris: true, apres: 8 });
  m.texte(`${ouverts.length} constat${ouverts.length > 1 ? "s" : ""} ouvert${ouverts.length > 1 ? "s" : ""}, dont ${ouverts.filter((k) => k.gravite === "bloquant").length} bloquant(s) · ${tous.length - ouverts.length} décidé(s)${d.precedent ? ` · ${d.corriges.length} corrigé(s) depuis l'indice ${d.precedent.indice}` : ""}.`, { gras: true, apres: 6 });
  m.texte("Pièces croisées", { gras: true });
  for (const x of d.pieces) m.texte(`${x.reference ?? "—"} · ${{ planche: "Planche", cctp: "CCTP", dpgf: "DPGF", plu: "Règlement du PLU", autre: "Autre pièce" }[x.role]} · ${d.pieceDe(x.piece_id)?.nom_fichier ?? "pièce"}`, { retrait: 10, gris: true });
  m.texte("", { apres: 4 });
  m.filet();
  tous.forEach((k, i) => {
    if (m.reste() < 140) m.saut();
    m.texte(`${i + 1}. ${GRAVITE[k.gravite]} · ${NATURE[k.nature]} · ${STATUT[k.statut]}${k.precedent_id && d.precedent ? ` · relevé depuis l'indice ${d.precedent.indice}` : ""}`, { gras: true, rouge: k.statut === "ouvert" && k.gravite === "bloquant" });
    m.texte(k.titre, { retrait: 14 });
    if (k.correction) m.texte(`Correction proposée : ${k.correction}`, { retrait: 14 });
    for (const v of k.valeurs) {
      m.texte(v.regle
        ? `Règle : ${v.borne === "max" ? "au plus" : "au moins"} ${String(v.valeur ?? "").replace(".", ",")}${unite(k.grandeur)}${v.article ? `, article ${v.article}` : ""} (${v.reference ?? "règlement"}${v.page ? `, p. ${v.page}` : ""})`
        : `${v.reference ?? d.pieceDe(v.piece)?.nom_fichier ?? "pièce"}${v.page ? `, p. ${v.page}` : ""}${v.texte ? ` : « ${v.texte} »` : ""}`, { retrait: 24, gris: true, taille: 9 });
    }
    if (k.statut !== "ouvert" && k.motif) m.texte(`Motif : ${k.motif}${k.decide_par ? ` (${d.nommer(k.decide_par)}, le ${dateFr(k.decide_le)})` : ""}`, { retrait: 14, gris: true, taille: 9 });
    m.texte("", { apres: 4 });
  });
  if (d.precedent && d.corriges.length) {
    m.filet();
    m.texte(`Corrigés depuis l'indice ${d.precedent.indice}`, { gras: true });
    for (const k of d.corriges) m.texte(`· ${k.titre}`, { retrait: 10, gris: true });
  }
  m.fin();

  /* les pages citées, une par (pièce, page), avec les numéros des constats */
  const parPage = new Map<string, { piece: PieceProjet | undefined; reference: string; page: number; marques: Marque[] }>();
  tous.forEach((k, i) => {
    for (const v of k.valeurs) {
      if (v.regle || !v.piece) continue;
      const cle = `${v.piece}|${v.page ?? 1}`;
      const e = parPage.get(cle) ?? { piece: d.pieceDe(v.piece), reference: v.reference ?? d.pieceDe(v.piece)?.nom_fichier ?? "pièce", page: v.page ?? 1, marques: [] };
      e.marques.push({ n: i + 1, boite: v.boite ?? null });
      parPage.set(cle, e);
    }
  });
  const images: PageImage[] = [];
  const cache = new Map<string, Promise<Uint8Array | null>>();
  for (const e of parPage.values()) {
    let octets: Uint8Array | null = null;
    if (e.piece) {
      if (!cache.has(e.piece.id)) cache.set(e.piece.id, d.octets(e.piece).catch(() => null));
      octets = await cache.get(e.piece.id)!;
    }
    const img = await pageAnnotee(octets, e.page, e.marques, e.reference);
    images.push({ type: "image", ...img, legende: `${e.reference}, page ${e.page} — constat${e.marques.length > 1 ? "s" : ""} n° ${[...new Set(e.marques.map((x) => x.n))].join(", ")}` });
  }
  return { nom: nomFichier(d, "pdf"), octets: ecrirePdf([...m.pages, ...images], titre) };
}
