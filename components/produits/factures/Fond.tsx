"use client";

import { WovenCanvas } from "@/components/produits/factures/ui/woven-light-hero";

/* Fond du héros. La référence pose un <canvas> plein cadre, recouvert de
   deux dégradés : un horizontal qui éteint un flanc, un vertical qui
   éteint le bas. Le cadre est le même que celui de la page
   (max-w-[1344px], puis calc(100%-3.5rem) à partir de lg).

   Le canvas est le composant « Woven Light », en monochrome — voir
   ui/woven-light-hero.tsx pour les corrections apportées (allocations
   par image, fuite du rAF, mouvement réduit, cadrage) et, depuis le
   11/09, pour le passage de la lumière ajoutée à l'encre soustraite.

   Un troisième voile, radial et centré, creuse le milieu de la structure
   pour que le titre reste lisible par-dessus.

   ── PASSAGE EN CLAIR (11/09/2026) ────────────────────────────────────
   LES TROIS VOILES CHANGENT DE COULEUR PARCE QUE LEUR RÔLE, LUI, NE
   CHANGE PAS : ils ÉTEIGNENT l'image là où du texte va se poser. Sur du
   noir, éteindre c'est noircir ; sur du papier, éteindre c'est BLANCHIR.
   Mêmes positions, mêmes formes, couleur opposée — le titre retrouve
   exactement la même réserve.

   Les voiles blancs sont d'un cran plus opaques que ne l'étaient les
   noirs (0,86 contre 0,82 au centre, 0,75 contre 0,70 sur le flanc) : un
   dessin à l'encre a plus de présence qu'une lueur, il faut un peu plus
   de papier pour l'effacer.

   ET LA RÉSERVE CENTRALE S'ÉLARGIT SOUS sm. Le relevé la donne en
   `ellipse 46% 34%` : à 1280 elle couvre exactement le titre et le
   chapô. À 390 le même bloc de texte occupe 72 % de la largeur et la
   moitié de la hauteur du héros — l'ellipse du relevé n'en couvre plus
   que le tiers, et les cinq lignes du chapô se lisaient sur le dessin.
   En sombre le défaut existait aussi mais ne se voyait pas : du texte
   BLANC sur des points clairs très peu opaques restait franc. En clair,
   du texte d'encre sur des points d'encre, c'est la même matière des
   deux côtés — il faut vraiment dégager le fond. La valeur du relevé
   revient telle quelle à partir de sm. */
export default function Fond() {
  return (
    <div className="absolute inset-y-0 left-1/2 z-0 w-full max-w-[1344px] -translate-x-1/2 overflow-hidden sm:w-[calc(100%-2rem)] lg:w-[calc(100%-3.5rem)]">
      <div className="relative h-full w-full overflow-hidden bg-white">
        <WovenCanvas />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/75 via-white/35 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-white/65" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_54%_at_50%_54%,rgba(255,255,255,0.92),transparent_78%)] sm:bg-[radial-gradient(ellipse_46%_34%_at_50%_50%,rgba(255,255,255,0.86),transparent_72%)]" />
    </div>
  );
}
