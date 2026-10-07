/* Le thème choisi, posé sur <html> avant la première peinture (le script
   est rendu par app/espace2/layout.tsx). Hors « use client » : le layout
   serveur doit recevoir la chaîne elle-même. */

export const CLE_THEME = "espace2.theme";

/* 07/10/2026 — demande de Teo : l'espace est en sombre, sans choix. */
export const AMORCE_THEME = `document.documentElement.dataset.v2Theme="dark"`;
