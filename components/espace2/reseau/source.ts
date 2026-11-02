/* TEMPORAIRE (session « Membres ») — remplacé à la fusion par le fichier
   de la session « socle + Fil », qui porte la règle. Seule la signature
   compte ici : reseauEnExemple(source) dit si le réseau montre ses
   données d'exemple. En base réelle, le réseau n'a encore aucune table :
   jamais les faux membres. */

export function reseauEnExemple(source: string): boolean {
  return source === "exemple";
}
