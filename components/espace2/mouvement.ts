"use client";

/* Réduire les animations — réglage de l'appareil, comme le thème. La
   classe `v2-calme` sur <html> coupe transitions et animations
   (espace2.css). Lue au montage de la coquille, écrite par Réglages. */

import { useEffect, useState } from "react";

const CLE = "espace2-calme";
const EVENEMENT = "espace2-calme";

function lire(): boolean {
  try {
    return localStorage.getItem(CLE) === "1";
  } catch {
    return false;
  }
}

function appliquer(oui: boolean) {
  document.documentElement.classList.toggle("v2-calme", oui);
}

export function changerCalme(oui: boolean) {
  try {
    localStorage.setItem(CLE, oui ? "1" : "0");
  } catch {}
  appliquer(oui);
  window.dispatchEvent(new Event(EVENEMENT));
}

export function useCalme(): boolean {
  const [calme, setCalme] = useState(false);
  useEffect(() => {
    const maj = () => {
      const v = lire();
      setCalme(v);
      appliquer(v);
    };
    maj();
    window.addEventListener(EVENEMENT, maj);
    return () => window.removeEventListener(EVENEMENT, maj);
  }, []);
  return calme;
}
