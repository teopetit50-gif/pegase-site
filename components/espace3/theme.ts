"use client";

/* Le thème du nouvel espace (11/10/2026, comme le pilotage /omega) :
   sombre par défaut, clair au choix dans le menu du compte, retenu dans ce
   navigateur. Il se pose sur <html> en data-v2-theme, pour que les menus et
   fenêtres — rendus hors de l'arbre, dans <body> — prennent les mêmes
   couleurs. Le script de app/espace3/layout.tsx le pose avant la première
   peinture ; ce crochet le reprend après une navigation côté client. */

import { useEffect } from "react";
import { CLE_THEME } from "./amorce";
import { ecrireStockage, useStockage } from "./Collection";

export type Theme = "sombre" | "clair";

export function useTheme(): [Theme, (t: Theme) => void] {
  /* « doux » est le nom de l'ancienne option : elle reste lue comme « clair » */
  const choisi = useStockage(CLE_THEME);
  const theme: Theme = choisi === "clair" || choisi === "doux" ? "clair" : "sombre";
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.v2Theme = theme === "sombre" ? "dark" : "light";
    if (theme === "clair") html.dataset.v2Fond = "doux";
    else delete html.dataset.v2Fond;
  }, [theme]);
  /* en quittant l'espace, le site retrouve son <html> */
  useEffect(
    () => () => {
      delete document.documentElement.dataset.v2Theme;
      delete document.documentElement.dataset.v2Fond;
    },
    [],
  );
  return [theme, (t) => ecrireStockage(CLE_THEME, t)];
}
