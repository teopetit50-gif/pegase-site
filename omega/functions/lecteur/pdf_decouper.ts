// Découper un PDF en morceaux de pages (pdf-lib, chargé à la demande) : la
// lecture visuelle se fait alors morceau par morceau, dans les limites de
// Bedrock (4,5 Mo par document), puis l'extraction sur le texte réuni.

export interface Morceau {
  /** Première et dernière page du morceau, numérotées à partir de 1. */
  debut: number;
  fin: number;
}

export const PAGES_PAR_MORCEAU = 20;

/** Les morceaux d'un document de `nbPages` pages, par tranches de `taille`. */
export function planifierMorceaux(nbPages: number, taille = PAGES_PAR_MORCEAU): Morceau[] {
  const morceaux: Morceau[] = [];
  for (let d = 1; d <= nbPages; d += taille) morceaux.push({ debut: d, fin: Math.min(nbPages, d + taille - 1) });
  return morceaux;
}

/** Un nouveau PDF ne contenant que les pages [debut, fin] du document donné. */
export async function extrairePages(octets: Uint8Array, debut: number, fin: number): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const source = await PDFDocument.load(octets, { ignoreEncryption: true, updateMetadata: false });
  const sortie = await PDFDocument.create();
  const indices: number[] = [];
  for (let n = debut; n <= fin; n++) indices.push(n - 1);
  const pages = await sortie.copyPages(source, indices);
  for (const p of pages) sortie.addPage(p);
  return await sortie.save({ useObjectStreams: true });
}

/**
 * Découpe jusqu'à ce que chaque morceau tienne sous `maxOctets` ; un morceau
 * d'une seule page encore trop lourd fait échouer la découpe (null).
 */
export async function decouperSousLimite(
  octets: Uint8Array,
  nbPages: number,
  maxOctets: number,
  taille = PAGES_PAR_MORCEAU,
): Promise<{ morceau: Morceau; octets: Uint8Array }[] | null> {
  const sortie: { morceau: Morceau; octets: Uint8Array }[] = [];
  const file = planifierMorceaux(nbPages, taille);
  while (file.length > 0) {
    const m = file.shift()!;
    const o = await extrairePages(octets, m.debut, m.fin);
    if (o.length <= maxOctets) {
      sortie.push({ morceau: m, octets: o });
      continue;
    }
    if (m.debut === m.fin) return null;
    const milieu = Math.floor((m.debut + m.fin) / 2);
    file.unshift({ debut: m.debut, fin: milieu }, { debut: milieu + 1, fin: m.fin });
  }
  return sortie;
}
