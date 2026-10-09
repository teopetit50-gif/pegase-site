/* Le thème du pilotage (09/10/2026) — demande de Teo : « une option pour
   mettre le dashboard en blanc ». Sombre par défaut ; « clair » est retenu
   dans ce navigateur (localStorage « omega.theme ») et posé sur <html>
   avant la première peinture, sans éclair de l'autre thème. Hors « use
   client » : le layout serveur reçoit la chaîne elle-même. */

export const CLE_THEME_OMEGA = "omega.theme";

export const AMORCE_THEME_OMEGA = `try{document.documentElement.dataset.v2Theme=localStorage.getItem("${CLE_THEME_OMEGA}")==="clair"?"light":"dark"}catch(e){document.documentElement.dataset.v2Theme="dark"}`;
