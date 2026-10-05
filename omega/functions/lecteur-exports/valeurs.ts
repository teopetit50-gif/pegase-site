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
      return DATE.test(v) ? null : "date illisible";
    case "dateheure":
      return DATEHEURE.test(v) || DATE.test(v) ? null : "date et heure illisibles";
    case "heure":
      return HEURE.test(v) ? null : "heure illisible";
    case "booleen":
      return BOOLEEN.has(v.toLowerCase()) ? null : "booléen illisible";
    default:
      return null;
  }
}
