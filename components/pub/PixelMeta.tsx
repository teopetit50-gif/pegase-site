"use client";

/* Charge le pixel quand le consentement est « oui », et compte une vue à
   chaque changement de route (le site navigue sans rechargement). Voir
   lib/pixel.ts pour les conditions. */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  EVT_CONSENTEMENT,
  PIXEL_ID,
  chargerPixel,
  lireConsentement,
  suivrePixel,
} from "@/lib/pixel";

export default function PixelMeta() {
  const pathname = usePathname();
  const premiere = useRef(true);

  useEffect(() => {
    if (!PIXEL_ID) return;
    if (lireConsentement() === "oui") chargerPixel();
    const onChoix = (e: Event) => {
      if ((e as CustomEvent).detail === "oui") chargerPixel();
    };
    window.addEventListener(EVT_CONSENTEMENT, onChoix);
    return () => window.removeEventListener(EVT_CONSENTEMENT, onChoix);
  }, []);

  useEffect(() => {
    /* la première vue est comptée par chargerPixel ; les suivantes ici */
    if (premiere.current) {
      premiere.current = false;
      return;
    }
    suivrePixel("PageView");
  }, [pathname]);

  return null;
}
