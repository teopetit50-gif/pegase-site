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

export function cadencer(cible: Element, peindre: () => void) {
  let raf = 0;
  let visible = true;

  const image = () => {
    raf = 0;
    peindre();
    if (visible && !document.hidden) raf = requestAnimationFrame(image);
  };
  const lancer = () => {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(image);
  };
  const arreter = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const io = new IntersectionObserver(
    ([e]) => {
      visible = e?.isIntersecting ?? true;
      if (visible) lancer();
      else {
        arreter();
        /* Une dernière passe hors écran : sinon la valeur reste figée à
           mi-course quand on quitte la zone d'un coup de molette. */
        peindre();
      }
    },
    /* Marge généreuse : le calcul doit déjà être juste quand l'élément
       apparaît, pas commencer à l'instant où il touche le bord. */
    { rootMargin: "200px 0px" }
  );
  io.observe(cible);

  const surVisibilite = () => (document.hidden ? arreter() : lancer());
  document.addEventListener("visibilitychange", surVisibilite);
  window.addEventListener("resize", peindre);

  peindre();
  lancer();

  return () => {
    arreter();
    io.disconnect();
    document.removeEventListener("visibilitychange", surVisibilite);
    window.removeEventListener("resize", peindre);
  };
}
