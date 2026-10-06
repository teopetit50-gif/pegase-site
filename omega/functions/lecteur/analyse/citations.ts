// Les citations d'une lecture longue : pièce, page, lignes, extrait exact. Les lignes sont celles du texte de la
// page découpé par fins de ligne, numérotées à partir de 1, comme l'écran les affiche. Une citation n'est
// « vérifiée » que si l'extrait se retrouve sur la page, dans les lignes citées à TOLERANCE_LIGNES près.

import { retrouver } from "@partage/texte.ts";

export const TOLERANCE_LIGNES = 2;

export interface Citation {
  piece: string;
  page: number;
  /** [première, dernière] ligne citée, à partir de 1. */
  lignes: [number, number];
  extrait: string;
  verifiee?: boolean;
  controle?: string;
}

/** Une page d'une pièce du dossier, en clair (déchiffrée en mémoire pour une pièce chiffrée). */
export interface PageDossier {
  piece: string;
  n: number;
  texte: string;
}

export function lignesDe(texte: string): string[] {
  return texte.split(/\r?\n/);
}

/** Le texte d'une page tel qu'on le montre au modèle : chaque ligne précédée de son numéro. */
export function pageNumerotee(texte: string): string {
  return lignesDe(texte).map((l, i) => `${String(i + 1).padStart(3, " ")}| ${l}`).join("\n");
}

/** Vérifie une citation contre les pages du dossier ; rend la citation complétée de verifiee et controle. */
export function verifierCitation(c: Citation, pages: ReadonlyMap<string, PageDossier>): Citation {
  const extrait = (c.extrait ?? "").trim();
  const page = pages.get(`${c.piece}:${c.page}`);
  if (!extrait) return { ...c, verifiee: false, controle: "citation sans extrait" };
  if (!page) return { ...c, verifiee: false, controle: `page ${c.page} introuvable dans la pièce citée` };
  const lignes = lignesDe(page.texte);
  const [a, b] = Array.isArray(c.lignes) && c.lignes.length === 2 ? c.lignes : [1, lignes.length];
  const debut = Math.max(1, Math.min(a, b) - TOLERANCE_LIGNES);
  const fin = Math.min(lignes.length, Math.max(a, b) + TOLERANCE_LIGNES);
  if (debut > lignes.length) return { ...c, verifiee: false, controle: `lignes ${a}-${b} au-delà de la page (${lignes.length} lignes)` };
  const zone = lignes.slice(debut - 1, fin).join("\n");
  if (retrouver(extrait, zone).trouve) return { ...c, verifiee: true, controle: `extrait retrouvé page ${c.page}, lignes ${a}-${b}` };
  if (retrouver(extrait, page.texte).trouve) return { ...c, verifiee: false, controle: `extrait sur la page ${c.page}, mais pas aux lignes ${a}-${b}` };
  return { ...c, verifiee: false, controle: `extrait introuvable page ${c.page}` };
}

export function indexerPages(pages: PageDossier[]): Map<string, PageDossier> {
  return new Map(pages.map((p) => [`${p.piece}:${p.n}`, p]));
}
