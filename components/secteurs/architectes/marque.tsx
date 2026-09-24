/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — marque.tsx

   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   marque.tsx`. Ce qui change :

   · LE SIGNE OFFICIEL (public/logos/lorani-mark.png, 512 × 512, fourni par
     Teo le 24/09) est lu À SA PLACE, `/logos/…`, pas recopié dans
     public/secteurs-architectes : il vit à côté des logos des autres
     systèmes. C'est un MASQUE ALPHA (RVB noir uniforme) : rendu comme
     `SystemLogo` (components/logos.tsx) et le `Glyphe` de Tamila, un fond
     `currentColor` découpé par `mask-image`, préfixe `-webkit-` compris.

   · `TuileSigne` remplace `public/marque.svg` de la source (une tuile
     #fafafa avec le signe incrusté en PNG) aux deux endroits où la page
     montrait Lorani comme une application : l'avatar de la réponse dans la
     maquette du « dossier » (Dossier.tsx) et la tuile centrale de l'appel
     (Appel.tsx). Sur le noir, la tuile claire se découpait seule ; sur le
     blanc, blanc sur blanc ne découpe plus rien : elle prend un filet.

   · `Logo` (le lockup), `Marque` et `PoweredByOmega` ne servaient qu'à
     l'entête et au pied du site source, qui ne viennent pas : retirés.
   ══════════════════════════════════════════════════════════════════════ */
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

const SIGNE: CSSProperties = {
  WebkitMaskImage: "url(/logos/lorani-mark.png)",
  maskImage: "url(/logos/lorani-mark.png)",
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
};

/* Le signe de Lorani, teinté par `text-…`. */
export function Signe({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block aspect-square shrink-0 bg-current", className)}
      style={SIGNE}
    />
  );
}

/* L'icône d'application : tuile claire filetée, signe à l'encre (les
   proportions de public/marque.svg : tuile 88/96, signe 54/96). */
export function TuileSigne({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex aspect-square shrink-0 items-center justify-center rounded-[35%] border border-[#e5e5e5] bg-[#fafafa] text-[#0a0a0a]",
        className,
      )}
    >
      <Signe className="size-[62%]" />
    </span>
  );
}
