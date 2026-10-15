/* Le thème choisi, posé sur <html> avant la première peinture (le script
   est rendu par app/espace2/layout.tsx). Hors « use client » : le layout
   serveur doit recevoir la chaîne elle-même. */

export const CLE_THEME = "espace2.theme";

/* 11/10/2026 — le dessin du pilotage /omega, cloné pour le client : sombre
   par défaut, « clair » retenu dans ce navigateur (menu du compte). */
export const AMORCE_THEME = `try{document.documentElement.dataset.v2Theme=localStorage.getItem("${CLE_THEME}")==="clair"?"light":"dark"}catch(e){document.documentElement.dataset.v2Theme="dark"}`;
