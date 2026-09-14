import * as React from "react";

import { cn } from "@/lib/cn";

/* ══════════════════════════════════════════════════════════════════════
   card — la carte shadcn (14/09/2026), posée pour la grille de /tarifs

   Copie de `shadcn/card`, à une ligne près : la classe de base disait
   `border bg-card text-card-foreground`. Ce site n'a ni `--color-card` ni
   `--color-card-foreground` (aucune utilitaire n'en sort, sans un bruit),
   et sous Tailwind v4 un `border` seul peint en currentColor — sur une
   carte noire à texte blanc, c'était un filet blanc d'un pixel sous le
   cerclage. Les trois valeurs sont donc écrites : filet neutral-200, fond
   blanc, encre neutral-900. L'appelant les remplace comme sur l'original
   (`border-none bg-transparent`…), twMerge arbitre.
   ══════════════════════════════════════════════════════════════════════ */

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-neutral-200 bg-white text-neutral-900 shadow-sm",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-neutral-500", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
