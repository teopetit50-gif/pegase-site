/* ══════════════════════════════════════════════════════════════════════
   Tamila (cabinets d'avocats) — bouton.tsx

   COPIÉ le 24/09/2026 à 13 h 37 de `OMEGA/cabinetos-site/src/components/ui/
   button.tsx` (variantes cva relevées dans le bundle de vetra-app, module
   4216, à la classe près). Tailles, rayons, soulèvement au survol
   inchangés. Ce qui change :

   COULEURS (règle 3, aucun `@theme` ici ; jetons CLAIRS, la source était
   sombre) : `bg-primary` / `text-primary-foreground` → `bg-[#171717]` /
   `text-[#ffffff]` ; `bg-foreground` / `text-background` (variante
   `white`) → `bg-[#171717]` / `text-[#ffffff]` ; `bg-background` →
   `bg-[#ffffff]` ; `bg-accent` / `text-accent-foreground` → `bg-[#f5f5f5]` /
   `text-[#171717]` ; `border-input` → `border-[#e6e6e6]` ; `ring-ring`,
   `ring-primary` → `ring-[#171717]` ; `ring-offset-background` →
   `ring-offset-[#ffffff]`.

   MONDE BLANC — le sens se garde, pas la valeur :
   · `default` et `white` étaient le bouton BLANC sur la page noire (le
     bouton qui contraste) ; ils deviennent le bouton ENCRE sur la page
     blanche. `blue` reste bleu.
   · `ghost` / `subtle` éclaircissaient au survol (`hover:bg-white/10`) ;
     ils foncent d'autant (`hover:bg-[#171717]/5`).

   RAYON : la source posait `--radius: 0.6rem` et `rounded-md` y valait
   `calc(var(--radius) - 2px)` (7,6 px) ; ici `rounded-md` vaut 6 px.
   Écrit en valeur : `rounded-[calc(0.6rem-2px)]`.
   `cn` vient de `@/lib/cn`.
   ══════════════════════════════════════════════════════════════════════ */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[calc(0.6rem-2px)] text-sm font-medium ring-offset-[#ffffff] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#171717] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:-translate-y-0.5 transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-[#171717] text-[#ffffff] hover:opacity-70 hover:ring-4 hover:ring-[#171717]/10",
        outline: "border border-[#e5e1d8] bg-[#ffffff] hover:bg-[#f3f1ec] hover:text-[#171717]",
        subtle: "border border-[#e5e1d8] bg-[#f3f1ec]/20 hover:bg-[#171717]/5 hover:text-[#171717]",
        /* 24/09 au soir : l'ancienne variante `blue` (bleu-500), passée au vert de Tamila. */
        marque: "border border-[#193a29] bg-[#193a29] text-white hover:bg-[#0f2a1c]",
        ghost: "hover:bg-[#171717]/5 hover:text-[#171717]",
        link: "text-[#171717] underline-offset-4 hover:underline",
        white: "bg-[#171717] text-[#ffffff] hover:opacity-70",
      },
      size: {
        default: "h-9 px-4 py-2",
        xs: "h-7 px-2",
        sm: "h-8 px-3",
        lg: "h-10 px-8",
        xl: "h-12 px-10",
        icon: "h-8 w-8",
        iconlg: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
