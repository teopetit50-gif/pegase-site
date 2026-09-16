/* Les insécables du français, posées au RENDU.

   Les textes des fiches et des composants sont écrits avec des espaces
   ordinaires devant les deux-points, points-virgules, points d'exclamation
   et d'interrogation, et autour des guillemets français. Sur une colonne
   étroite la ligne se coupe donc AVANT le signe : « avec vous / : ce qui
   s'exécute seul ». On ne retouche pas le texte — on pose l'insécable à
   l'affichage.

   L'insécable est écrite en ÉCHAPPEMENT (`\u00A0`), jamais tapée : un
   caractère insécable posé en clair dans un fichier se perd une fois sur
   deux en repassant par un outil, et la correction disparaît sans bruit.

   Écrit le 16/09/2026 pour /offres/sur-mesure. Réutilisable ailleurs :
   la règle est la même sur tout le site. */
export const fr = (t: string) =>
  t.replace(/ ([:;!?\u00BB])/g, "\u00A0$1").replace(/(\u00AB) /g, "$1\u00A0");
