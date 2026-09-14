/** Un écouteur de défilement qui ne dépend pas des images.
 *
 * Le réflexe est de cadencer un calcul de position à `requestAnimationFrame`.
 * Il a un défaut : quand le navigateur ne produit aucune image, le rAF ne tire
 * jamais et le calcul est perdu — l'indicateur reste bloqué sur sa valeur de
 * montage. Ça arrive en headless sans flux d'images, sous un volet replié, et
 * sur une machine qui attend le disque. Mesuré sur ce site : `rAF vivant =
 * false` alors que l'hydratation, elle, marchait.
 *
 * Ici : appel immédiat, puis un appel de queue au minuteur — qui tire sans
 * image. Trois lectures de rectangle par appel, plafonnées à 10 par seconde.
 */
export function ecouterDefilement(calculer: () => void, pas = 100) {
  let dernier = 0;
  let minuteur: ReturnType<typeof setTimeout> | undefined;

  const declencher = () => {
    dernier = performance.now();
    minuteur = undefined;
    calculer();
  };

  const surEvenement = () => {
    if (performance.now() - dernier >= pas) { declencher(); return; }
    if (minuteur === undefined) minuteur = setTimeout(declencher, pas);
  };

  calculer();
  window.addEventListener('scroll', surEvenement, { passive: true });
  window.addEventListener('resize', surEvenement, { passive: true });

  return () => {
    window.removeEventListener('scroll', surEvenement);
    window.removeEventListener('resize', surEvenement);
    if (minuteur !== undefined) clearTimeout(minuteur);
  };
}
