// Un écrivain de PDF minimal, pour le banc : pages de texte en Helvetica
// (WinAnsi, accents compris), pages « scannées » (une image sans texte),
// pièces jointes (Factur-X). Aucune dépendance. Suffisant pour pdf.js.

export interface LigneTexte {
  x: number;
  y: number;
  taille?: number;
  texte: string;
}

export type PageSpec =
  | { type: "texte"; lignes: LigneTexte[] }
  | { type: "image"; largeur: number; hauteur: number; pixels: Uint8Array };

export interface PieceJointeSpec {
  nom: string;
  mime: string;
  octets: Uint8Array;
}

const LARGEUR = 595;
const HAUTEUR = 842;

/** Encodage WinAnsi (cp1252) des caractères courants du français. */
function winAnsi(s: string): Uint8Array {
  const sortie: number[] = [];
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c === 0x20ac) sortie.push(0x80);
    else if (c === 0x2019) sortie.push(0x92);
    else if (c === 0x201c) sortie.push(0x93);
    else if (c === 0x201d) sortie.push(0x94);
    else if (c === 0x2013) sortie.push(0x96);
    else if (c === 0x2014) sortie.push(0x97);
    else if (c === 0x0153) sortie.push(0x9c);
    else if (c === 0x00a0 || c === 0x202f) sortie.push(0x20);
    else if (c < 0x100) sortie.push(c);
    else sortie.push(0x3f);
  }
  return new Uint8Array(sortie);
}

function echapper(o: Uint8Array): Uint8Array {
  const sortie: number[] = [];
  for (const b of o) {
    if (b === 0x28 || b === 0x29 || b === 0x5c) sortie.push(0x5c, b);
    else if (b === 0x0d) sortie.push(0x5c, 0x72);
    else if (b === 0x0a) sortie.push(0x5c, 0x6e);
    else sortie.push(b);
  }
  return new Uint8Array(sortie);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
}

const enc = new TextEncoder();
const t = (s: string) => enc.encode(s);

export function ecrirePdf(pages: PageSpec[], piecesJointes: PieceJointeSpec[] = []): Uint8Array {
  const objets: Uint8Array[] = []; // index 0 = objet 1
  const ajouter = (contenu: Uint8Array): number => {
    objets.push(contenu);
    return objets.length;
  };
  const dict = (corps: string, flux?: Uint8Array): Uint8Array => {
    if (!flux) return t(`<< ${corps} >>`);
    return concat(t(`<< ${corps} /Length ${flux.length} >>\nstream\n`), flux, t("\nendstream"));
  };

  const numCatalogue = ajouter(new Uint8Array()); // réservé
  const numPages = ajouter(new Uint8Array()); // réservé
  const numPolice = ajouter(dict("/Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding"));

  const numerosPages: number[] = [];
  for (const p of pages) {
    if (p.type === "texte") {
      const morceaux: Uint8Array[] = [t("BT\n")];
      for (const l of p.lignes) {
        morceaux.push(t(`/F1 ${l.taille ?? 11} Tf 1 0 0 1 ${l.x} ${HAUTEUR - l.y} Tm (`), echapper(winAnsi(l.texte)), t(") Tj\n"));
      }
      morceaux.push(t("ET"));
      const numContenu = ajouter(dict("", concat(...morceaux)));
      numerosPages.push(
        ajouter(
          dict(
            `/Type /Page /Parent ${numPages} 0 R /MediaBox [0 0 ${LARGEUR} ${HAUTEUR}] /Resources << /Font << /F1 ${numPolice} 0 R >> >> /Contents ${numContenu} 0 R`,
          ),
        ),
      );
    } else {
      const numImage = ajouter(
        dict(`/Type /XObject /Subtype /Image /Width ${p.largeur} /Height ${p.hauteur} /ColorSpace /DeviceGray /BitsPerComponent 8`, p.pixels),
      );
      const numContenu = ajouter(dict("", t(`q ${LARGEUR - 40} 0 0 ${HAUTEUR - 40} 20 20 cm /Im1 Do Q`)));
      numerosPages.push(
        ajouter(
          dict(
            `/Type /Page /Parent ${numPages} 0 R /MediaBox [0 0 ${LARGEUR} ${HAUTEUR}] /Resources << /XObject << /Im1 ${numImage} 0 R >> >> /Contents ${numContenu} 0 R`,
          ),
        ),
      );
    }
  }
  objets[numPages - 1] = dict(`/Type /Pages /Kids [${numerosPages.map((n) => `${n} 0 R`).join(" ")}] /Count ${numerosPages.length}`);

  let noms = "";
  let af = "";
  if (piecesJointes.length > 0) {
    const refs: string[] = [];
    const specs: number[] = [];
    for (const pj of piecesJointes) {
      const numFlux = ajouter(dict(`/Type /EmbeddedFile /Subtype /${pj.mime.replace(/\//g, "#2F")} /Params << /Size ${pj.octets.length} >>`, pj.octets));
      const numSpec = ajouter(dict(`/Type /Filespec /F (${pj.nom}) /UF (${pj.nom}) /AFRelationship /Data /EF << /F ${numFlux} 0 R /UF ${numFlux} 0 R >>`));
      refs.push(`(${pj.nom}) ${numSpec} 0 R`);
      specs.push(numSpec);
    }
    const numNoms = ajouter(dict(`/Names [${refs.join(" ")}]`));
    noms = ` /Names << /EmbeddedFiles ${numNoms} 0 R >>`;
    af = ` /AF [${specs.map((n) => `${n} 0 R`).join(" ")}]`;
  }
  objets[numCatalogue - 1] = dict(`/Type /Catalog /Pages ${numPages} 0 R${noms}${af}`);

  const parts: Uint8Array[] = [t("%PDF-1.7\n%âãÏÓ\n")];
  let position = parts[0].length;
  const decalages: number[] = [];
  objets.forEach((o, i) => {
    decalages.push(position);
    const bloc = concat(t(`${i + 1} 0 obj\n`), o, t("\nendobj\n"));
    parts.push(bloc);
    position += bloc.length;
  });
  const xref = [`xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`, ...decalages.map((d) => `${String(d).padStart(10, "0")} 00000 n \n`)].join("");
  parts.push(t(xref));
  parts.push(t(`trailer\n<< /Size ${objets.length + 1} /Root ${numCatalogue} 0 R >>\nstartxref\n${position}\n%%EOF\n`));
  return concat(...parts);
}

/** Une image grise « bruitée », déterministe : ce que voit un scanner sur une page froissée. */
export function imageBruitee(largeur: number, hauteur: number, graine = 7): Uint8Array {
  const px = new Uint8Array(largeur * hauteur);
  let x = graine;
  for (let i = 0; i < px.length; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    px[i] = 180 + (x % 60);
  }
  return px;
}

// ---------------------------------------------------------------------------
// PNG minimal (niveaux de gris, 8 bits), pour les photos du banc.
// ---------------------------------------------------------------------------

function crc32(o: Uint8Array): number {
  let c = ~0;
  for (const b of o) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function u32(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
}

function morceau(type: string, donnees: Uint8Array): Uint8Array {
  const corps = concat(t(type), donnees);
  return concat(u32(donnees.length), corps, u32(crc32(corps)));
}

export async function ecrirePng(largeur: number, hauteur: number, pixels: Uint8Array): Promise<Uint8Array> {
  const brut = new Uint8Array((largeur + 1) * hauteur);
  for (let y = 0; y < hauteur; y++) {
    brut[y * (largeur + 1)] = 0;
    brut.set(pixels.subarray(y * largeur, (y + 1) * largeur), y * (largeur + 1) + 1);
  }
  const flux = new Blob([brut as BlobPart]).stream().pipeThrough(new CompressionStream("deflate"));
  const comprime = new Uint8Array(await new Response(flux).arrayBuffer());
  const ihdr = concat(u32(largeur), u32(hauteur), new Uint8Array([8, 0, 0, 0, 0]));
  return concat(
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    morceau("IHDR", ihdr),
    morceau("IDAT", comprime),
    morceau("IEND", new Uint8Array()),
  );
}
