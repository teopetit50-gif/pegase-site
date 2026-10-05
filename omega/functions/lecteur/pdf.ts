// Lecture d'un PDF : texte natif page par page avec la position des mots,
// taille des pages, pièces jointes (Factur-X). unpdf embarque pdf.js sans DOM.

import { getDocumentProxy } from "unpdf";

export interface MotPositionne {
  texte: string;
  /** Boîte normalisée sur la page, origine en haut à gauche. */
  x: number;
  y: number;
  l: number;
  h: number;
}

export interface PagePdf {
  n: number;
  texte: string;
  largeur: number;
  hauteur: number;
  mots: MotPositionne[];
}

export interface AnalysePdf {
  nbPages: number;
  pages: PagePdf[];
  piecesJointes: { nom: string; octets: Uint8Array }[];
}

interface ItemTexte {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL?: boolean;
}

/** Une page est « sans texte » quand elle ne porte presque rien d'exploitable. */
export function pageSansTexte(p: Pick<PagePdf, "texte">): boolean {
  return p.texte.replace(/\s+/g, "").length < 20;
}

export async function analyserPdf(octets: Uint8Array, maxPages = 60): Promise<AnalysePdf> {
  const pdf = await getDocumentProxy(new Uint8Array(octets));
  const nbPages = pdf.numPages;
  const pages: PagePdf[] = [];
  for (let n = 1; n <= Math.min(nbPages, maxPages); n++) {
    const page = await pdf.getPage(n);
    const vue = page.getViewport({ scale: 1 });
    const contenu = await page.getTextContent();
    const mots: MotPositionne[] = [];
    let texte = "";
    let precedentY: number | null = null;
    for (const brut of contenu.items as unknown[]) {
      const it = brut as ItemTexte;
      if (typeof it.str !== "string") continue;
      const [a, b, , d, e, f] = it.transform;
      const hauteurMot = Math.abs(it.height || Math.hypot(b, d) || Math.abs(d) || Math.abs(a));
      const largeurMot = Math.abs(it.width || 0);
      if (it.str.trim().length > 0) {
        mots.push({
          texte: it.str,
          x: e / vue.width,
          y: 1 - (f + hauteurMot) / vue.height,
          l: largeurMot / vue.width,
          h: hauteurMot / vue.height,
        });
      }
      // Les lignes : un saut quand pdf.js le dit, ou quand l'ordonnée change nettement.
      if (precedentY !== null && Math.abs(f - precedentY) > hauteurMot * 0.6 && !texte.endsWith("\n")) texte += "\n";
      texte += it.str;
      if (it.hasEOL) texte += "\n";
      else if (!it.str.endsWith(" ")) texte += " ";
      precedentY = f;
    }
    pages.push({
      n,
      texte: texte.replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim(),
      largeur: Math.round(vue.width),
      hauteur: Math.round(vue.height),
      mots,
    });
  }
  const piecesJointes: { nom: string; octets: Uint8Array }[] = [];
  try {
    const pj = (await pdf.getAttachments()) as Record<string, { filename?: string; content?: Uint8Array }> | null;
    if (pj) {
      for (const [cle, v] of Object.entries(pj)) {
        if (v?.content) piecesJointes.push({ nom: v.filename ?? cle, octets: new Uint8Array(v.content) });
      }
    }
  } catch {
    // Pas de pièces jointes lisibles : ce n'est pas une erreur.
  }
  return { nbPages, pages, piecesJointes };
}

/** La boîte qui englobe les mots d'une page portant une citation (null si introuvable). */
export function boiteDe(page: PagePdf, citation: string): { x: number; y: number; l: number; h: number } | null {
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, "");
  const cible = norm(citation);
  if (cible.length === 0) return null;
  const mots = page.mots;
  for (let i = 0; i < mots.length; i++) {
    let cumul = "";
    for (let j = i; j < mots.length && j < i + 40; j++) {
      cumul += norm(mots[j].texte);
      if (cumul.includes(cible)) {
        // Resserrer à gauche : ne garder que les mots nécessaires à la citation.
        let k = i;
        while (k < j && mots.slice(k + 1, j + 1).map((m) => norm(m.texte)).join("").includes(cible)) k++;
        const choisis = mots.slice(k, j + 1);
        const x = Math.min(...choisis.map((m) => m.x));
        const y = Math.min(...choisis.map((m) => m.y));
        const x2 = Math.max(...choisis.map((m) => m.x + m.l));
        const y2 = Math.max(...choisis.map((m) => m.y + m.h));
        const arr = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 10000) / 10000;
        return { x: arr(x), y: arr(y), l: arr(x2 - x), h: arr(y2 - y) };
      }
      if (cumul.length > cible.length + 60) break;
    }
  }
  return null;
}
