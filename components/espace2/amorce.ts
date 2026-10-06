/* Le thème choisi, posé sur <html> avant la première peinture (le script
   est rendu par app/espace2/layout.tsx). Hors « use client » : le layout
   serveur doit recevoir la chaîne elle-même. */

export const CLE_THEME = "espace2.theme";

export const AMORCE_THEME = `try{var t=localStorage.getItem(${JSON.stringify(CLE_THEME)});if(t==="sombre")document.documentElement.dataset.v2Theme="dark";else if(t==="clair")document.documentElement.dataset.v2Theme="light"}catch(e){}`;
