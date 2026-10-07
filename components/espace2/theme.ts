"use client";

/* Le thème du nouvel espace — SOMBRE, sans choix (07/10/2026, demande de
   Teo : « mets que en thème sombre, enlève le thème clair »). Il se pose
   sur <html> en data-v2-theme, pour que les menus et fenêtres — rendus
   hors de l'arbre, dans <body> — prennent les mêmes couleurs. Le script
   de app/espace2/layout.tsx le pose avant la première peinture. */

import { useEffect } from "react";

export function useTheme() {
  useEffect(() => {
    document.documentElement.dataset.v2Theme = "dark";
    /* en quittant l'espace, le site retrouve son <html> */
    return () => void delete document.documentElement.dataset.v2Theme;
  }, []);
}
