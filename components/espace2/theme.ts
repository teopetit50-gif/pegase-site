"use client";

/* Le thème du nouvel espace (11/10/2026, comme le pilotage /omega) :
   sombre par défaut, clair au choix dans le menu du compte, retenu dans ce
   navigateur. Il se pose sur <html> en data-v2-theme, pour que les menus et
   fenêtres — rendus hors de l'arbre, dans <body> — prennent les mêmes
   couleurs. Le script de app/espace2/layout.tsx le pose avant la première
   peinture ; ce crochet le reprend après une navigation côté client. */

import { useEffect } from "react";
import { CLE_THEME } from "./amorce";
import { ecrireStockage, useStockage } from "./Collection";

export type Theme = "sombre" | "clair";

export function useTheme(): [Theme, (t: Theme) => void] {
  const theme: Theme = useStockage(CLE_THEME) === "clair" ? "clair" : "sombre";
  useEffect(() => {
    document.documentElement.dataset.v2Theme = theme === "clair" ? "light" : "dark";
  }, [theme]);
  /* en quittant l'espace, le site retrouve son <html> */
  useEffect(() => () => void delete document.documentElement.dataset.v2Theme, []);
  return [theme, (t) => ecrireStockage(CLE_THEME, t)];
}
