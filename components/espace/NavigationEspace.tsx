"use client";

/* Les trois onglets de l'espace. Côté client pour que l'onglet actif suive
   la route sans que chaque page ait à le dire deux fois. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ECRANS, type EcranEspace } from "./ecrans";

export default function NavigationEspace({ ecran }: { ecran: EcranEspace }) {
  const chemin = usePathname();
  return (
    <nav className="esp-nav" aria-label="Écrans de l'espace client">
      {ECRANS.map((e) => {
        const actif = chemin?.startsWith(e.href) || e.cle === ecran;
        return (
          <Link
            key={e.cle}
            href={e.href}
            className="esp-nav-lien"
            aria-current={actif ? "page" : undefined}
          >
            <span className="esp-nav-long">{e.libelle}</span>
            <span className="esp-nav-court">{e.court}</span>
          </Link>
        );
      })}
    </nav>
  );
}
