import type { CSSProperties } from "react";
import Link from "next/link";
import { MARQUE_SITE } from "@/components/espace2/portail";

/* ══════════════════════════════════════════════════════════════════════
   L'en-tête d'un site dédié à un logiciel (10/11/2026)

   Teo : « Daliro est un SaaS à part entière. Rien à voir avec Omega. »
   Sur un déploiement portant NEXT_PUBLIC_PORTAIL, app/layout.tsx rend
   cette barre à la place de components/Header.tsx (menus Nos offres,
   Votre site, Tarifs… d'Omega). Même hauteur que l'en-tête d'Omega
   (h-16, 72 px dès `sm`) : les ancres des pages secteur (`scroll-mt-16
   sm:scroll-mt-[72px]`) et leurs sommaires collants restent justes. Même
   `viewTransitionName` : la barre est épinglée pendant les transitions
   de page (globals.css, ::view-transition-*(site-header)).

   Le logo est le lockup du logiciel (public/logos/<clé>-lockup.png), un
   masque alpha rendu comme components/secteurs/btp/marque.tsx : un fond
   `currentColor` découpé par `mask-image`. Trois entrées, pas plus : le
   logo vers l'accueil, le service client, et « Réserver un audit », le
   seul appel à l'action de la page.
   ══════════════════════════════════════════════════════════════════════ */
export default function EnTete() {
  const marque = MARQUE_SITE;
  if (!marque) return null;
  const masque: CSSProperties = {
    aspectRatio: "1200 / 326",
    WebkitMaskImage: `url(${marque.lockup})`,
    maskImage: `url(${marque.lockup})`,
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "left center",
    maskPosition: "left center",
  };
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-white/95 backdrop-blur" style={{ viewTransitionName: "site-header" }}>
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-2 px-4 sm:h-[72px] sm:px-10">
        <Link href="/" aria-label={`${marque.nom}, accueil`} className="flex shrink-0 items-center py-3 text-[#171717]">
          <span aria-hidden="true" className="block h-6 bg-current sm:h-7" style={masque} />
        </Link>
        <nav aria-label="Navigation du site" className="flex items-center gap-3 sm:gap-7">
          <Link href="/contact" className="hidden text-[14px] font-medium text-neutral-600 transition-colors hover:text-[#171717] sm:inline">
            Service client
          </Link>
          <Link
            href="/reserver-un-audit"
            className="inline-flex h-10 items-center rounded-full bg-[#171717] px-4 text-[14px] font-medium text-white transition-colors hover:bg-neutral-800"
          >
            Réserver un audit
          </Link>
        </nav>
      </div>
    </header>
  );
}
