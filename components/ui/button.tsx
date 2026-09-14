import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/cn";

/* ══════════════════════════════════════════════════════════════════════
   button — le bouton originui (14/09/2026), posé pour le calendrier de
   réservation (calendar-scheduler).

   Copie de `originui/button`, à ceci près que le site n'a aucun des jetons
   shadcn (`--color-primary`, `--color-accent`, `--color-input`…) : une
   classe `bg-primary` n'y peint rien, sans un bruit. Chaque variante est
   donc écrite avec les couleurs de la charte : encre #050505, survol
   #262626, filet #e3e3e3, gris de survol #f5f5f5.
   ══════════════════════════════════════════════════════════════════════ */

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#050505]/70 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[#050505] text-white shadow-sm shadow-black/5 hover:bg-[#262626]",
        destructive: "bg-[#b42318] text-white shadow-sm shadow-black/5 hover:bg-[#b42318]/90",
        outline:
          "border border-[#e3e3e3] bg-white text-[#050505] shadow-sm shadow-black/5 hover:bg-[#f5f5f5]",
        secondary: "bg-[#f5f5f5] text-[#050505] shadow-sm shadow-black/5 hover:bg-[#e8e8e8]",
        ghost: "text-[#050505] hover:bg-[#f5f5f5]",
        link: "text-[#050505] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-lg px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

export default Button;
