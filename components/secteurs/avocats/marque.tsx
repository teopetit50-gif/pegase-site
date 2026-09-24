"use client";
/* ══════════════════════════════════════════════════════════════════════
   Tamila (cabinets d'avocats) — marque.tsx

   COPIÉ le 24/09/2026 à 13 h 37 de `OMEGA/cabinetos-site/src/components/
   marque.tsx`. Ce qui change :

   · LE SIGNE OFFICIEL (public/logos/tamila-mark.png, 512 × 512, fourni par
     Teo le 24/09) est lu À SA PLACE, `/logos/…`, pas recopié dans
     public/secteurs-avocats : il vit à côté des logos des autres systèmes,
     et c'est là qu'une nouvelle version sera déposée. C'est un MASQUE
     ALPHA (RVB noir uniforme) : rendu comme `SystemLogo`
     (components/logos.tsx) et `SigneDaliro` (secteurs/btp/marque.tsx), un
     fond `currentColor` découpé par `mask-image`, préfixe `-webkit-`
     compris. La teinte vient de `text-…`.
     Où il sert : les six glyphes des orbites du héros (Heros.tsx),
     l'avatar et le fil d'Ariane de l'écran produit (ApercuDossier.tsx),
     l'icône d'application au centre des ondes (IconeApp, ci-dessous).

   · `Logo` (le lockup signe + mot) ne servait qu'à l'entête et au pied du
     site source, qui ne viennent pas : retiré.

   · ICÔNE D'APPLICATION — les dégradés reviennent. La source posait deux
     `IconeApp` (rangée mobile `lg:hidden`, ondes `hidden lg:flex`) avec
     les MÊMES identifiants de dégradé (`app-fond`, `app-dalle`). Le premier
     SVG du document gagne les `url(#…)`, et c'est celui qui est masqué :
     sur le site déployé, à 1440, le carré « bleu » s'affiche donc SANS
     fond, un simple contour bleu pâle autour du signe blanc (constaté sur
     la capture du 24/09 ; memory/deux-fois-le-meme-svg-degrades-morts.md).
     Ici chaque icône tire ses identifiants de `useId()` : le carré bleu
     que la source décrit (« le carré bleu au centre des ondes ») s'affiche
     enfin. Sur la page blanche, c'est ce bleu plein qui porte l'accent de
     la marque au centre des ondes. Le signe y reste blanc (`invert(1)` sur
     le masque noir, comme la source).
   ══════════════════════════════════════════════════════════════════════ */
import { useId, type CSSProperties } from "react";
import { cn } from "@/lib/cn";

const SIGNE: CSSProperties = {
  WebkitMaskImage: "url(/logos/tamila-mark.png)",
  maskImage: "url(/logos/tamila-mark.png)",
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
};

/* Le signe de Tamila. Même signature que la source : size-6 par défaut. */
export function Glyphe({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-6 shrink-0 bg-current", className)} style={SIGNE} />;
}

/* Icône d'application (le carré bleu au centre des ondes, size-24 dans la référence). Vert de Tamila depuis le
   24/09 au soir (registre d'un cabinet, avocats.css) : la teinte de sa carte sur /secteurs. */
export function IconeApp({ className }: { className?: string }) {
  const id = useId();
  const fond = `${id}-fond`;
  const dalle = `${id}-dalle`;
  return (
    <svg viewBox="0 0 96 96" className={cn("size-24", className)} aria-hidden="true">
      <defs>
        <linearGradient id={fond} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24503a" />
          <stop offset="1" stopColor="#12291d" />
        </linearGradient>
        <linearGradient id={dalle} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f6049" />
          <stop offset="1" stopColor="#193a29" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="88" height="88" rx="20" fill={`url(#${fond})`} />
      <rect x="4.5" y="4.5" width="87" height="87" rx="19.5" fill="none" stroke="#8fb09d" strokeOpacity=".5" />
      <rect x="18" y="18" width="60" height="60" rx="14" fill={`url(#${dalle})`} />
      <image href="/logos/tamila-mark.png" x="24" y="24" width="48" height="48" style={{ filter: "invert(1)" }} />
    </svg>
  );
}
