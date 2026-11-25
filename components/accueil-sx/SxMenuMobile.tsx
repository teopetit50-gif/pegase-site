import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ══════════════════════════════════════════════════════════════════════
   LE MENU MOBILE — le seul bloc de la page que la référence n'a pas.

   Sous 1280 px, sa barre remplace les liens par un bouton « menu »… qui ne
   fait rien : c'est un gabarit de démonstration. Sur un site en ligne, un
   visiteur au téléphone n'aurait plus aucun moyen d'atteindre les tarifs.
   On garde donc son bouton, au pixel, et on lui donne ce panneau : les
   quatre entrées et les deux boutons de la barre large, au dessin du
   bouton originui « link » comme partout sur la page (25/11) — sx.css,
   « 5. LE MENU MOBILE ».

   Fermé par défaut (`hidden`) ; SxComportements l'ouvre et le referme.
   Les destinations sont celles de la barre : outils/sx/textes.py, LIENS.nav.
   ══════════════════════════════════════════════════════════════════════ */

const ENTREES: [string, string][] = [
  ["Logiciel", "/offres"],
  ["Métiers", "/secteurs"],
  ["Intégrations", "/integrations"],
  ["Tarifs", "/tarifs"],
];

export default function SxMenuMobile() {
  return (
    <div id="sx-menu" className="sx-menu" hidden>
      <nav aria-label="Navigation principale, version mobile">
        <ul>
          {ENTREES.map(([nom, href]) => (
            <li key={href}>
              <Link href={href}>{nom}</Link>
            </li>
          ))}
        </ul>
        <div className="sx-menu-actions">
          <Button asChild variant="link" className="px-0">
            <Link href="/contact">
              Parler à l&apos;équipe
              <ChevronRight className="ms-1 opacity-60" size={16} strokeWidth={2} aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="link" className="px-0">
            <Link href="/reserver-un-audit">
              Commencer
              <ChevronRight className="ms-1 opacity-60" size={16} strokeWidth={2} aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </nav>
    </div>
  );
}
