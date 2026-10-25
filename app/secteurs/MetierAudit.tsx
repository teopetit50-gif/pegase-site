"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { CLE_SECTEUR_AUDIT, SECTEUR_DES_PAGES } from "@/lib/creneaux";

/* Sur les six pages métier, un clic vers /reserver-un-audit note le métier
   de la page : le formulaire d'audit coche la case « secteur » à l'arrivée.
   Écoute unique au niveau du document, donc tous les boutons des pages sont
   couverts sans toucher à leurs liens (Link ou <a>). */
export default function MetierAudit() {
  const chemin = usePathname();
  const secteur = SECTEUR_DES_PAGES[chemin.split("/")[2] ?? ""];

  useEffect(() => {
    if (!secteur) return;
    const surClic = (e: MouseEvent) => {
      const lien = (e.target as Element | null)?.closest?.("a[href]");
      if (!(lien instanceof HTMLAnchorElement)) return;
      if (new URL(lien.href).pathname !== "/reserver-un-audit") return;
      try {
        sessionStorage.setItem(CLE_SECTEUR_AUDIT, secteur);
      } catch {}
    };
    document.addEventListener("click", surClic, true);
    return () => document.removeEventListener("click", surClic, true);
  }, [secteur]);

  return null;
}
