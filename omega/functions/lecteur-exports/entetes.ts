// Reconnaître les colonnes d'un export par leur en-tête : normalisation puis
// rapprochement avec les en-têtes déclarés d'un jeu.

/** « N° de Dossier  » → « n_de_dossier » ; « Date naissance » → « date_naissance ». */
export function normaliserEntete(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[°º]/g, "")
    .replace(/[‘’'"«»]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export interface Rapprochement {
  /** Clé de colonne déclarée → index de la colonne dans le fichier. */
  index: Map<string, number>;
  /** Clés déclarées sans colonne dans le fichier. */
  absentes: string[];
  /** Index des colonnes du fichier qu'aucune déclaration ne réclame. */
  enTrop: number[];
}

/**
 * Pour chaque colonne déclarée, les en-têtes acceptés (la clé elle-même et
 * ses alias). Le rapprochement est exact sur la forme normalisée ; à défaut,
 * un en-tête du fichier qui commence par l'alias (ou l'inverse) est accepté
 * s'il est le seul candidat.
 */
export function rapprocher(entetesFichier: string[], declarees: Map<string, string[]>): Rapprochement {
  const normes = entetesFichier.map(normaliserEntete);
  const index = new Map<string, number>();
  const pris = new Set<number>();
  const absentes: string[] = [];

  const chercher = (alias: string[]): number => {
    for (const a of alias) {
      const i = normes.findIndex((n, k) => !pris.has(k) && n === a);
      if (i >= 0) return i;
    }
    for (const a of alias) {
      if (a.length < 3) continue;
      const candidats = normes.map((n, k) => (!pris.has(k) && n !== "" && (n.startsWith(a) || a.startsWith(n)) ? k : -1)).filter((k) => k >= 0);
      if (candidats.length === 1) return candidats[0];
    }
    return -1;
  };

  for (const [cle, alias] of declarees) {
    const formes = [cle, ...alias].map(normaliserEntete).filter((x) => x !== "");
    const i = chercher(formes);
    if (i >= 0) {
      index.set(cle, i);
      pris.add(i);
    } else absentes.push(cle);
  }
  const enTrop = normes.map((_, k) => k).filter((k) => !pris.has(k));
  return { index, absentes, enTrop };
}

/** Vrai si tous les en-têtes déclarés d'un jeu se retrouvent dans le fichier. */
export function entetesCouvertes(entetesFichier: string[], entetesJeu: string[]): boolean {
  if (entetesJeu.length === 0) return false;
  const normes = new Set(entetesFichier.map(normaliserEntete));
  return entetesJeu.every((e) => normes.has(normaliserEntete(e)));
}

/** Un motif de fichier déclaré (glob simple `*`, `?`) ou une expression régulière, contre le nom du fichier. */
export function motifReconnait(motif: string | null | undefined, nomFichier: string): boolean {
  if (!motif) return false;
  const nom = nomFichier.toLowerCase();
  try {
    if (/^[\w\s.*?\-]+$/.test(motif)) {
      const re = new RegExp("^" + motif.toLowerCase().replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
      return re.test(nom);
    }
    return new RegExp(motif, "i").test(nomFichier);
  } catch {
    return false;
  }
}
