"use client";

/* Tabs — la primitive **shadcn/ui** (MIT) posée sur `@radix-ui/react-tabs`,
 * habillée en « segmented control » comme le motif demandé.
 *
 * Deux adaptations, obligatoires ici :
 *   1. **les jetons.** Le fichier d'origine parle en `bg-muted`,
 *      `text-muted-foreground`, `bg-background` — des variables que ce site
 *      n'a pas. On peint donc avec la palette neutre du décalque
 *      (neutral-100 pour la piste, blanc + ombre pour l'onglet actif).
 *   2. **aucun utilitaire d'affichage dans la base.** Le fichier d'origine
 *      met `inline-flex` sur la piste : l'appelant qui demande `grid` sous sm
 *      ne l'obtient jamais, parce que deux utilitaires d'affichage
 *      s'arbitrent par l'ordre d'émission de la feuille et non par
 *      l'intention. L'affichage vient donc de l'appelant (cf. Bouton.tsx).
 *
 * Radix donne ce que la version maison n'avait pas : flèches du clavier,
 * `aria-selected`, association onglet ↔ panneau, focus visible.
 */

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      /* PAS d'utilitaire d'affichage ici : `inline-flex` en base gagne
         l'arbitrage d'ordre contre le `grid` de l'appelant, et la piste reste
         sur une ligne là où on l'avait passée en deux colonnes. */
      "items-center justify-center gap-1 rounded-xl bg-neutral-100 p-1 text-neutral-500",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      /* `max-sm:py-3` — 11/09/2026. En py-2, l'onglet fait 33 px de haut
         (17 px de libellé en mono 11 + 2 × 8) : c'est le réglage par défaut
         du composant d'origine, pensé pour une souris. À 390 px ces quatre
         onglets sont la seule façon de changer le contenu de la section, et
         33 px est court pour un pouce. Sous 640 seulement, ils passent à
         41 px. Rien ne bouge au-dessus. */
      "flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 max-sm:py-3 font-mono text-[11px] uppercase transition-all",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900",
      "hover:text-neutral-900 data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,.06)]",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
