/* ═════════════════════════════════════════════════
   Tiroma — le signe officiel (posé le 18/10/2026)

   Du 24/09 au 18/10, Tiroma n'avait pas de logo : ce composant dessinait un
   monogramme « T » en CSS (carré arrondi, dégradé vert d'eau), repris de la
   source OMEGA/dentaire-site. Teo a validé le signe redessiné le 18/10 :
   une dent en trois pièces inclinées, public/logos/tiroma-mark.png (512 × 512)
   et tiroma-lockup.png (1200 × 299), au format des logos du site : MASQUES
   ALPHA, RVB noir. On le rend comme `SigneDaliro`
   (components/secteurs/btp/marque.tsx) : un fond `currentColor` découpé par
   `mask-image`, la teinte vient de `text-…` sur l'élément ou son parent.
   Seul endroit dans la page : le nœud « Tiroma » du schéma (Schema.tsx).
   ═════════════════════════════════════════════════ */

import type { CSSProperties } from "react";

const SIGNE: CSSProperties = {
  WebkitMaskImage: "url(/logos/tiroma-mark.png)",
  maskImage: "url(/logos/tiroma-mark.png)",
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
};

export function MarqueTiroma({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`inline-block shrink-0 bg-current ${className}`} style={SIGNE} />;
}
