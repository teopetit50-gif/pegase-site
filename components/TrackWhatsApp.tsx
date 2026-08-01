"use client";
import { useEffect } from "react";
import { track } from "@vercel/analytics";

/* Compte chaque départ vers WhatsApp — l'événement de conversion du site.
   Listener délégué : tout lien wa.me, présent ou futur, est couvert sans
   toucher aux composants. */
export default function TrackWhatsApp() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const cible = e.target as HTMLElement | null;
      if (cible?.closest?.('a[href^="https://wa.me/"]')) {
        track("whatsapp_click", { page: window.location.pathname });
      }
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
