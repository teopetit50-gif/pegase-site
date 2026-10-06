// Les contrôles de forme d'une cellule selon le type déclaré de sa colonne.
// On ne transforme rien : la valeur est déposée telle que lue ; on ne fait
// que signaler ce qui ne ressemble pas à ce que la colonne annonce.

import type { TypeColonne } from "./portes_releve.ts";

const ENTIER = /^[-+]?\d+$/;
const DECIMAL = /^[-+]?(\d{1,3}([   .]\d{3})+|\d+)([.,]\d+)?$|^[-+]?[.,]\d+$/;
const DATE = /^(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})$/;
const HEURE = /^\d{1,2}[:h]\d{2}(:\d{2})?$/;
const DATEHEURE = /^(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})[ T]\d{1,2}[:h]\d{2}(:\d{2})?/;
const BOOLEEN = new Set(["oui", "non", "true", "false", "vrai", "faux", "0", "1", "x", "o", "n", "y"]);

/** Une date du calendrier (le 31/02 n'existe pas) ; année sur deux chiffres = 20xx. */
function dateExiste(v: string): boolean {
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const fr = v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  const [a, m, j] = iso ? [+iso[1], +iso[2], +iso[3]] : fr ? [fr[3].length === 2 ? 2000 + +fr[3] : +fr[3], +fr[2], +fr[1]] : [0, 0, 0];
  if (a < 1900 || a > 2199) return false;
  const d = new Date(Date.UTC(a, m - 1, j));
  return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === j;
}

/** Une heure de 0 h à 23 h 59 (secondes ≤ 59). */
function heureExiste(v: string): boolean {
  const h = v.match(/(\d{1,2})[:h](\d{2})(?::(\d{2}))?\s*$/);
  return !!h && +h[1] <= 23 && +h[2] <= 59 && (h[3] === undefined || +h[3] <= 59);
}

/** Le motif d'anomalie d'une valeur non vide, ou null si elle a la forme attendue. */
export function anomalieDeForme(type: TypeColonne | string | undefined, valeur: string): string | null {
  const v = valeur.trim();
  if (v === "") return null;
  switch (type) {
    case "entier":
      return ENTIER.test(v.replace(/[   ]/g, "")) ? null : "entier illisible";
    case "decimal":
      return DECIMAL.test(v.replace(/€/g, "").trim()) ? null : "nombre illisible";
    case "date":
      return DATE.test(v) && dateExiste(v) ? null : "date illisible";
    case "dateheure":
      if (DATE.test(v)) return dateExiste(v) ? null : "date et heure illisibles";
      return DATEHEURE.test(v) && dateExiste(v) && heureExiste(v.replace(/\.\d+$/, "")) ? null : "date et heure illisibles";
    case "heure":
      return HEURE.test(v) && heureExiste(v) ? null : "heure illisible";
    case "booleen":
      return BOOLEEN.has(v.toLowerCase()) ? null : "booléen illisible";
    default:
      return null;
  }
}
