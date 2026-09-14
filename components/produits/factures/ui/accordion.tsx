"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";

import { cn } from "@/components/produits/factures/utils";

/* Accordéon shadcn/Radix. Choisi plutôt qu'une pile de `<details>` :
   Radix gère l'ouverture unique, le clavier (flèches, Début, Fin) et les
   attributs ARIA que `<details>` ne donne pas.

   L'icône est un « + » qui pivote, pas un chevron : c'est le vocabulaire
   déjà posé sur le bloc « facturation électronique ». */

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b border-[#171717]/[0.12]", className)}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "group flex min-h-14 flex-1 items-center justify-between gap-6 py-4 text-left text-[15px] leading-snug text-[#2b2b2b] transition-colors hover:text-[#171717] sm:text-base",
        className
      )}
      {...props}
    >
      {children}
      <Plus
        aria-hidden="true"
        className="size-4 shrink-0 text-[#8f8f8f] transition-transform duration-300 group-data-[state=open]:rotate-45"
      />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden data-[state=closed]:animate-none data-[state=open]:animate-none"
    {...props}
  >
    <div className={cn("pb-5 pr-10 text-[14px] leading-relaxed text-[#737373] sm:text-[15px]", className)}>
      {children}
    </div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
