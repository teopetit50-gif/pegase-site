"use client";

/* Le thème du nouvel espace : système, clair ou sombre. Le choix vit dans
   localStorage (clé `espace2.theme`) et se pose sur <html> en
   data-v2-theme, pour que les menus et fenêtres — rendus hors de l'arbre,
   dans <body> — prennent les mêmes couleurs. Le script de app/espace2/
   layout.tsx le pose avant la première peinture. */

import { useEffect, useSyncExternalStore } from "react";
import { CLE_THEME } from "./amorce";

export type Theme = "systeme" | "clair" | "sombre";

const ecouteurs = new Set<() => void>();
function lire(): Theme {
  try {
    const v = window.localStorage.getItem(CLE_THEME);
    return v === "clair" || v === "sombre" ? v : "systeme";
  } catch {
    return "systeme";
  }
}
function abonner(f: () => void) {
  ecouteurs.add(f);
  window.addEventListener("storage", f);
  return () => {
    ecouteurs.delete(f);
    window.removeEventListener("storage", f);
  };
}

export function changerTheme(t: Theme) {
  try {
    window.localStorage.setItem(CLE_THEME, t);
  } catch {
    /* sans mémoire, le choix vaut pour la page */
  }
  poser(t);
  ecouteurs.forEach((f) => f());
}

function poser(t: Theme) {
  const html = document.documentElement;
  if (t === "systeme") delete html.dataset.v2Theme;
  else html.dataset.v2Theme = t === "sombre" ? "dark" : "light";
}

export function useTheme(): Theme {
  const t = useSyncExternalStore(abonner, lire, () => "systeme" as Theme);
  useEffect(() => {
    poser(t);
  }, [t]);
  /* en quittant l'espace, le site retrouve son <html> */
  useEffect(() => () => void delete document.documentElement.dataset.v2Theme, []);
  return t;
}

