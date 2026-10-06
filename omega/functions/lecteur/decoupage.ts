// Un fichier qui contient plusieurs documents (plusieurs factures à la suite) : la pièce mère garde le premier,
// chaque autre groupe de pages devient une pièce fille. Le lecteur découpe le PDF (pdf-lib), range chaque fille
// dans le dépôt, puis appelle la porte de découpage du module (filed_creer_pieces_filles pour FILED), qui crée
// les pièces filles ; le socle dépose ensuite un lecteur.lire par fille.
// Tout est rejouable : l'identifiant du document d'une fille et son chemin se déduisent de la mère et des pages.
// Tant que la porte n'existe pas, rien n'est déposé et le découpage reste dans le résultat du travail.

import type { Depot } from "@partage/depot.ts";
import type { FilleADeposer, FilleCreee, Piece, Portes } from "@partage/portes.ts";
import { PORTES_DECOUPAGE } from "@partage/portes.ts";

export interface GroupeDecoupe {
  pages: number[];
  type_piece?: string;
}

export type BilanDecoupage =
  | { filles: FilleCreee[] }
  | { filles: "non_concerne"; raison: string }
  | { filles: "porte_absente" };

/** Un uuid stable tiré d'un texte (forme v4, octets du SHA-256) : la même mère et les mêmes pages donnent le même. */
export async function uuidStable(texte: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte))).slice(0, 16);
  h[6] = (h[6] & 0x0f) | 0x40;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = Array.from(h, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

async function sha256Hex(o: Uint8Array): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", o as unknown as ArrayBuffer));
  return Array.from(h, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Un nouveau PDF ne contenant que les pages données (numérotées à partir de 1), dans l'ordre. */
export async function extraireListePages(octets: Uint8Array, pages: number[]): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const source = await PDFDocument.load(octets, { ignoreEncryption: true, updateMetadata: false });
  const sortie = await PDFDocument.create();
  const copiees = await sortie.copyPages(source, pages.map((n) => n - 1));
  for (const p of copiees) sortie.addPage(p);
  return await sortie.save({ useObjectStreams: true });
}

/** « facture lot.pdf » + [3,4] → « facture lot-p3-4.pdf » ; [5] → « …-p5.pdf ». */
export function nomFille(nomMere: string, pages: number[]): string {
  const base = nomMere.replace(/\.pdf$/i, "");
  const plage = pages.length === 1 ? `${pages[0]}` : `${pages[0]}-${pages[pages.length - 1]}`;
  return `${base}-p${plage}.pdf`.slice(-200);
}

/** Une fille ne se redécoupe pas : on la reconnaît à sa mère, ou à défaut à son nom. */
export function estFille(piece: Pick<Piece, "nom_fichier" | "piece_mere_id">): boolean {
  if (piece.piece_mere_id) return true;
  return piece.piece_mere_id === undefined && /-p\d+(-\d+)?\.pdf$/i.test(piece.nom_fichier);
}

/** Les groupes à sortir en filles (tous sauf le premier, que la mère garde), propres et sans recouvrement. */
export function groupesFilles(decoupage: GroupeDecoupe[] | undefined, nbPages: number): GroupeDecoupe[] {
  if (!decoupage || decoupage.length < 2) return [];
  const vues = new Set<number>(decoupage[0].pages);
  const sortie: GroupeDecoupe[] = [];
  for (const g of decoupage.slice(1)) {
    const pages = [...new Set(g.pages)].filter((n) => Number.isInteger(n) && n >= 1 && n <= nbPages && !vues.has(n)).sort((a, b) => a - b);
    if (pages.length === 0) continue;
    pages.forEach((n) => vues.add(n));
    sortie.push({ pages, type_piece: g.type_piece });
  }
  return sortie;
}

export async function creerPiecesFilles(
  portes: Portes,
  depot: Depot,
  piece: Piece,
  decoupage: GroupeDecoupe[] | undefined,
  nbPages: number,
): Promise<BilanDecoupage> {
  const groupes = groupesFilles(decoupage, nbPages);
  if (groupes.length === 0) return { filles: "non_concerne", raison: "un seul document" };
  if (piece.chiffrement) return { filles: "non_concerne", raison: "pièce chiffrée" };
  if (estFille(piece)) return { filles: "non_concerne", raison: "pièce déjà fille" };
  if (!PORTES_DECOUPAGE[piece.module]) return { filles: "non_concerne", raison: `pas de découpage pour le module ${piece.module}` };
  if (!portes.creerPiecesFilles || !depot.deposer) return { filles: "porte_absente" };
  if (!/pdf/i.test(piece.mime) && !/\.pdf$/i.test(piece.nom_fichier)) return { filles: "non_concerne", raison: "pas un PDF" };

  // La porte existe-t-elle ? Un appel sans fille le dit, sans rien créer : on ne range aucun fichier pour rien.
  if ((await portes.creerPiecesFilles(piece.module, piece.id, [])) === null) return { filles: "porte_absente" };

  const t = await depot.telecharger(piece.chemin);
  if (!t.present) return { filles: "non_concerne", raison: "fichier de la mère absent" };
  const filles: FilleADeposer[] = [];
  for (const g of groupes) {
    const document = await uuidStable(`${piece.id}:${g.pages.join(",")}`);
    const nom = nomFille(piece.nom_fichier, g.pages);
    const octets = await extraireListePages(t.octets, g.pages);
    const chemin = `${piece.client_id}/${piece.objet_type ?? "filed_document"}/${document}/${nom}`;
    await depot.deposer(chemin, octets, "application/pdf");
    filles.push({
      document,
      chemin,
      nom_fichier: nom,
      octets: octets.length,
      sha256: await sha256Hex(octets),
      pages: g.pages,
      type_piece: g.type_piece && g.type_piece !== "autre" ? g.type_piece : null,
    });
  }
  const creees = await portes.creerPiecesFilles(piece.module, piece.id, filles);
  return creees === null ? { filles: "porte_absente" } : { filles: creees };
}
