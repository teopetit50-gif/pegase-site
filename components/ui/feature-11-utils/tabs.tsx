"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/cn";

/* ══════════════════════════════════════════════════════════════════════
   Les onglets de `feature-11` — 16/09/2026

   La fiche 21st.dev importe `@/components/ui/feature-11-utils/tabs` et
   s'en sert avec `orientation="vertical"`, `variant="line"` et des
   sélecteurs `group-data-[orientation=vertical]/tabs:…`. Les onglets
   shadcn fournis avec la fiche ne savent RIEN faire de tout ça : ni
   variante, ni orientation, ni groupe nommé. Les recopier tels quels
   aurait donné une barre horizontale grise, c'est-à-dire pas le
   composant.

   Ceux-ci ajoutent donc les trois choses que la fiche attend :
     · `data-orientation` sur la racine, et le groupe `/tabs` qui permet
       aux enfants de s'y accrocher ;
     · la variante « line » : un filet le long de la liste, et un trait
       plein sur l'onglet actif, à gauche en vertical, dessous en
       horizontal ;
     · le passage automatique en horizontal sous `lg`, parce qu'une
       colonne d'onglets de 20 rem n'a pas sa place sur un téléphone.

   Les couleurs ne sont PAS celles de shadcn : ce dépôt n'a pas les jetons
   `muted-foreground`, `border` ni `ring` — un utilitaire de thème absent
   ne peint rien, en silence ([[theme-scope-bat-les-utilitaires]]). Les
   classes sont nues (`f11-*`), habillées par le CSS de la page, qui leur
   donne aussi sa police.
   ══════════════════════════════════════════════════════════════════════ */

const Tabs = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Root ref={ref} className={cn("f11-tabs group/tabs", className)} {...props} />
));
Tabs.displayName = TabsPrimitive.Root.displayName;

const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { variant?: "line" | "plein" }
>(({ className, variant = "line", ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    data-variante={variant}
    className={cn("f11-liste", className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger ref={ref} className={cn("f11-onglet", className)} {...props} />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("f11-panneau", className)} {...props} />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
