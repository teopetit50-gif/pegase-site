/* Bouton shadcn de la référence (module 1770 du bundle 421-*.js) : variantes et tailles recopiées.

   COPIÉ le 24/09/2026 à 12 h 01 de `OMEGA/chantieros-site/src/components/ui/
   button.tsx`. Couleurs converties (règle 3, aucun `@theme` ici) :
   `bg-primary` / `text-primary-foreground` → `bg-[#171717]` / `text-[#ffffff]`,
   `bg-background` → `bg-[#ffffff]`, `bg-accent` / `text-accent-foreground` →
   `bg-[#f5f5f5]` / `text-[#171717]`, `bg-secondary` → `bg-[#f5f5f5]`,
   `ring-ring` → `ring-[#171717]`, `destructive` → `#ef4444`. Les sept
   utilitaires `dark:` sont retirés (monde clair figé, règle 4). `cn` vient
   de `@/lib/cn`, le même helper que les autres reprises shadcn du site. */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm outline-none transition-all focus-visible:border-[#171717] focus-visible:ring-[3px] focus-visible:ring-[#171717]/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-[#ef4444] aria-invalid:ring-[#ef4444]/20 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[#171717] text-[#ffffff] shadow-xs hover:bg-[#171717]/90",
        destructive: "bg-[#ef4444] text-white shadow-xs hover:bg-[#ef4444]/90 focus-visible:ring-[#ef4444]/20",
        outline: "border bg-[#ffffff] shadow-xs hover:bg-[#f5f5f5] hover:text-[#171717]",
        secondary: "bg-[#f5f5f5] text-[#171717] shadow-xs hover:bg-[#f5f5f5]/80",
        ghost: "hover:bg-[#f5f5f5] hover:text-[#171717]",
        link: "text-[#171717] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({ className, variant, size, asChild = false, ...props }:
  React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
