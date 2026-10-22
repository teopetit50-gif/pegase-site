/* Le thème choisi, posé sur <html> avant la première peinture (le script
   est rendu par app/espace2/layout.tsx). Hors « use client » : le layout
   serveur doit recevoir la chaîne elle-même. */

export const CLE_THEME = "espace2.theme";

/* 11/10/2026 — le dessin du pilotage /omega, cloné pour le client : sombre
   par défaut, « clair » retenu dans ce navigateur (menu du compte).
   22/10/2026 — « doux » est un clair posé sur un gris : même data-v2-theme
   « light », plus data-v2-fond="doux" (voir espace2.css). */
export const AMORCE_THEME = `try{var t=localStorage.getItem("${CLE_THEME}"),h=document.documentElement;h.dataset.v2Theme=t==="clair"||t==="doux"?"light":"dark";if(t==="doux")h.dataset.v2Fond="doux"}catch(e){document.documentElement.dataset.v2Theme="dark"}`;
