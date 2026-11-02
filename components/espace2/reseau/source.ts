/* TEMPORAIRE — écrit par la session « Messages » pour compiler seule, avant
   la fusion. Le vrai fichier est celui de la session « socle + Fil », avec
   la même signature : à la fusion, garder le sien et jeter celui-ci. */

/** Vrai quand le réseau montre ses données d'exemple ; faux en base réelle (aucune table encore). */
export function reseauEnExemple(source: string): boolean {
  return source === "exemple";
}
