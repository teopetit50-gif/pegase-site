import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/components/produits/factures/utils";

/* Badge shadcn — dépendance de `feature-section-with-bento-grid`.
   Les variantes tapaient dans les jetons du site source (primary,
   secondary, destructive, ring). RÈGLE 3 du rapatriement : aucun de ces
   jetons n'existe dans le @theme d'omega-site-v3, donc aucune de ces
   utilitaires n'était émise — elles n'auraient rien peint, en silence.
   Elles sont écrites en valeur arbitraire, avec l'hexadécimal relevé
   dans le :root du site source.

   Le `border` nu tenait sa couleur du `* { border-color: var(--border) }`
   global du site source (#101215). Le défaut de Tailwind est
   `currentColor` : la couleur est donc écrite en clair, pour que le badge
   ne change pas d'aspect là où l'appelant n'en impose pas une.

   11/09 — passage en clair. Les quatre variantes s'inversent de surface
   (`default` devient un plein d'encre à texte blanc, `secondary` un gris
   clair à texte d'encre), et le rouge `destructive` est assombri à
   #c9000f : le #e40014 du relevé tombe à 4,4:1 sur blanc, sous le seuil
   des petits textes. Le `ring` de focus passe du crème à l'encre, sans
   quoi il serait invisible sur la page. */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-[#e6e6e6] px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#171717] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#171717] text-white hover:bg-[#171717]/85",
        secondary: "border-transparent bg-[#f5f5f5] text-[#171717] hover:bg-[#ededed]",
        destructive: "border-transparent bg-[#c9000f] text-white hover:bg-[#c9000f]/85",
        outline: "text-[#171717]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
