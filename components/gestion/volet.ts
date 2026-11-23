/* ══════════════════════════════════════════════════════════════════════
   Le volet d'un accordéon de /gestion, partagé par Depliant.tsx et
   Questions.tsx.

   La référence anime ses volets avec deux images clés, accordion-down et
   accordion-up (0,2 s ease-out), qui vont de 0 à la hauteur du contenu,
   que son composant Radix mesure. Ici la mesure se fait au clic, avant le
   changement d'état : la hauteur est posée en variable sur le volet
   (`--ge-hauteur`), et `data-anime` autorise l'animation à partir de ce
   premier clic seulement (app/gestion/gestion.css, `ge-volet`). Le volet
   est un système extérieur à React : on y écrit directement, comme le
   fait Apparition.tsx.
   ══════════════════════════════════════════════════════════════════════ */

export function preparerVolet(id: string) {
  const volet = document.getElementById(id);
  const contenu = volet?.firstElementChild;
  if (!volet || !contenu) return;
  volet.style.setProperty("--ge-hauteur", `${contenu.scrollHeight}px`);
  volet.dataset.anime = "";
}
