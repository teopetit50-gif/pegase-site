/* ══════════════════════════════════════════════════════════════════════
   Cadencer un calcul sur la position de défilement (16/09/2026)

   ⚠ NE PAS ÉCOUTER `scroll` SUR `window` DANS CE SITE.

   Le site fait défiler avec Lenis (components/LenisRoot.tsx). En
   production, `scrollY` change et les rectangles bougent, mais AUCUN
   événement `scroll` n'arrive aux écouteurs de `window` — vérifié le
   16/09 sur omegaai.fr : un compteur posé sur `window` reste à zéro
   pendant que `scrollY` passe de 1714 à 2614.

   Conséquence, et c'est ce qui a coûté la découverte : un composant qui
   écoute `scroll` fonctionne parfaitement en développement et ne fait
   RIEN en production, sans une erreur, sans un avertissement. Le repli
   du hero et l'élargissement de la citation étaient tous deux dans ce
   cas — la valeur était écrite une fois au montage et ne bougeait plus.

   La parade est de ne pas dépendre de l'événement : on lit la position à
   chaque image tant que l'élément est à l'écran, et on ne fait rien
   quand il n'y est pas. Un observateur d'intersection allume et éteint
   la boucle ; hors écran, il ne reste rien qui tourne.

   `peindre` doit être bon marché et ne rien écrire quand la valeur n'a
   pas bougé — c'est à l'appelant de tenir ce seuil.
   ══════════════════════════════════════════════════════════════════════ */

export function cadencer(_cible: Element, peindre: () => void) {
  let raf = 0;

  const image = () => {
    peindre();
    raf = requestAnimationFrame(image);
  };
  const lancer = () => {
    if (!raf && !document.hidden) raf = requestAnimationFrame(image);
  };
  const arreter = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  /* ⚠ PAS DE GARDE PAR OBSERVATEUR D'INTERSECTION.

     La première version n'allumait la boucle que lorsque l'élément
     entrait à l'écran. En production, l'observateur ne s'est JAMAIS
     redéclenché : vérifié le 16/09 sur omegaai.fr — le nouveau code était
     bien déployé, le rectangle de l'élément passait à 500 px du haut de
     la fenêtre, et la variable restait à la valeur écrite au montage.
     Sous Lenis, ni l'événement `scroll` ni l'observateur ne sont un
     signal fiable ; seul le rectangle dit la vérité.

     La boucle tourne donc tant que le composant est monté. Ce n'est pas
     un gaspillage : `peindre` sort immédiatement quand la valeur n'a pas
     bougé — un `getBoundingClientRect` par image sur UN élément — et le
     site fait déjà tourner Lenis et GSAP à la même cadence. La seule
     mise en veille qui compte est l'onglet caché, où le navigateur
     suspend de toute façon `requestAnimationFrame`.

     Le paramètre `_cible` est conservé pour ne pas avoir à toucher les
     appelants le jour où une garde fiable existerait. */
  const surVisibilite = () => (document.hidden ? arreter() : lancer());
  document.addEventListener("visibilitychange", surVisibilite);
  window.addEventListener("resize", peindre);

  peindre();
  lancer();

  return () => {
    arreter();
    document.removeEventListener("visibilitychange", surVisibilite);
    window.removeEventListener("resize", peindre);
  };
}
