"use client";

import * as React from "react";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { cva } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/* ══════════════════════════════════════════════════════════════════════
   navigation-menu — le menu déroulant du header (11/09/2026)

   Reprise du `navigation-menu` de ReUI (reui.io), lui-même le composant
   shadcn/ui bâti sur la primitive Radix. La mécanique est intacte :
   Root / List / Item / Trigger / Content / Link, le chevron qui pivote à
   l'ouverture, le `viewport` optionnel, les attributs `data-slot` et
   `data-motion` sur lesquels s'accroche la feuille. Rien de ce qui rend le
   composant accessible n'a été touché — c'est un vrai menu au clavier
   (flèches, Échap, focus piégé), pas une pile de <div> qui s'ouvre au
   survol.

   ─ Cinq adaptations, quatre imposées par ce dépôt, une par un défaut ─

   1. LA PRIMITIVE VIENT DE SON PROPRE PAQUET. L'original importe
      `{ NavigationMenu as NavigationMenuPrimitive } from "radix-ui"`, le
      paquet unifié. Ce site n'a que des paquets séparés
      (`@radix-ui/react-accordion`, `-tabs`, `-label`…) et a déjà une
      vingtaine de primitives internes installées à plat dans
      node_modules ; ajouter le paquet unifié en aurait embarqué un second
      jeu. On installe donc `@radix-ui/react-navigation-menu` seul, et
      l'import change en conséquence. Aucune autre ligne ne bouge.

   2. LES COULEURS SONT POSÉES, PAS HÉRITÉES. L'original s'habille avec la
      palette shadcn — `bg-background`, `hover:bg-accent`, `bg-popover`,
      `border-border`, `ring-ring`. ⚠ AUCUN de ces jetons n'existe ici :
      ce site a sa propre charte (`--bg`, `--panel`, `--line`, et les
      `--o-*` scopés sous `.offres`). Posées telles quelles, ces classes ne
      seraient pas « approximatives », elles seraient INVISIBLES — Tailwind
      n'émet rien pour une couleur inconnue, et le panneau serait un
      rectangle transparent sur fond transparent. Toutes passent donc par
      les variables `--omenu-*` définies dans menu-principal.css.

      C'est aussi ce qui permet au menu de suivre le header caméléon : le
      bandeau prend l'encre du monde qu'il survole (`.omenu--clair` ou
      non), tandis que le PANNEAU garde toujours sa surface blanche —
      exactement la doctrine du panneau plein écran depuis le 06/08 : il ne
      dépend pas de la page qu'il recouvre, il impose sa surface.

   3. LES ANIMATIONS SONT ÉCRITES EN CSS. L'original s'appuie sur
      `animate-in`, `fade-in`, `zoom-in-95`, `slide-in-from-left-52` —
      des utilitaires du greffon `tailwindcss-animate` / `tw-animate-css`,
      qui n'est PAS installé ici (vérifié : zéro occurrence dans le dépôt).
      Laissées en place, ces classes seraient du texte mort dans le
      balisage et le panneau apparaîtrait d'un coup. Elles sont retirées du
      TSX et refaites en `@keyframes` dans menu-principal.css, accrochées
      au `[data-state]` de la primitive. ⚠ Ni l'opacité ni la sortie ne sont
      animées, et ce n'est pas une simplification — la raison est mesurée et
      écrite en tête de menu-principal.css : une horloge d'animation gelée
      laisserait un panneau invisible qui intercepte les clics. Le respect de
      `prefers-reduced-motion` est ajouté au passage : l'original n'en a pas.

   4. LA GÉOMÉTRIE EST CELLE DU HEADER. `h-9`, `rounded-[10px]`, 14 px
      medium, `tracking-[-0.01em]` : les mêmes valeurs que le bouton
      « Commencer » posé à trois centimètres à droite, relevées le 30/07
      sur `.o-btn`. L'original est en `rounded-md` / `text-sm` / `px-4`,
      ce qui donnerait deux grammaires de bouton dans la même barre.
      Le rayon du panneau (12) est celui de `--radius-card`.

   5. `data-[active=true]` DEVIENT `data-[active]`, et c'est un vrai bug de
      l'original, pas une préférence. La primitive écrit
      `data-active={active ? "" : undefined}` — l'attribut est PRÉSENT et
      VIDE, jamais égal à « true » (vérifié dans
      @radix-ui/react-navigation-menu 1.2.22). Le sélecteur de shadcn ne
      peut donc jamais correspondre : l'entrée de la page courante ne
      s'allumait pas, en silence. Le sélecteur par présence attrape les
      deux écritures. Passer par la prop `active` plutôt que par un
      `data-active` posé à la main a un second effet : la primitive écrit
      aussi `aria-current="page"`.

   ─ Un écart assumé ─

   Le panneau porte une ombre douce, alors que la charte du site n'en met
   nulle part. Un panneau flottant posé sans ombre sur le hero sombre de
   l'accueil se lit comme un bloc collé à la page, pas comme une surface
   au-dessus d'elle. L'ombre est portée très diluée (28 % à 40 px), elle
   sert la profondeur, pas le relief.

   ─ Ce qui a été jeté ─

   `NavigationMenuIndicator` (la petite flèche qui glisse sous l'onglet
   actif) n'est pas repris : il n'a de sens qu'avec le `viewport`, et le
   header utilise `viewport={false}` — chaque panneau tombe sous SON
   intitulé, comme dans la démo d'origine. `NavigationMenuViewport` reste
   exporté et réencré, pour que rebasculer `viewport` un jour ne rende pas
   un rectangle transparent.
   ══════════════════════════════════════════════════════════════════════ */

function NavigationMenu({
  className,
  children,
  viewport = true,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Root> & {
  viewport?: boolean;
}) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      data-viewport={viewport}
      className={cn(
        "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
        className,
      )}
      {...props}
    >
      {children}
      {viewport && <NavigationMenuViewport />}
    </NavigationMenuPrimitive.Root>
  );
}

function NavigationMenuList({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn("group flex flex-1 list-none items-center justify-center gap-0.5", className)}
      {...props}
    />
  );
}

function NavigationMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn("relative", className)}
      {...props}
    />
  );
}

/* L'intitulé du bandeau : celui qui ouvre un panneau (Trigger) et celui qui
   est un simple lien (Link) partagent cette variante, sans quoi les deux
   n'auraient ni la même hauteur ni le même creux au survol. */
const navigationMenuTriggerStyle = cva(
  "group inline-flex h-9 w-max cursor-pointer items-center justify-center rounded-[10px] px-3 text-[14px] font-medium leading-none tracking-[-0.01em] text-[var(--omenu-encre)] outline-none transition-colors duration-200 hover:bg-[var(--omenu-survol)] focus-visible:bg-[var(--omenu-survol)] disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-[var(--omenu-survol)] data-[active]:bg-[var(--omenu-survol)]",
);

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerStyle(), "group", className)}
      {...props}
    >
      {children}
      <ChevronDown
        className="relative top-[1px] ms-1 size-3.5 opacity-55 transition-transform duration-300 group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </NavigationMenuPrimitive.Trigger>
  );
}

function NavigationMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        "top-0 left-0 w-full p-2 pr-2.5 md:absolute md:w-auto",
        /* `viewport={false}` : le panneau n'est plus glissé dans une boîte
           commune, il tombe sous son propre intitulé — il porte donc
           lui-même sa surface, son filet et son rayon. */
        "group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-2 group-data-[viewport=false]/navigation-menu:overflow-hidden group-data-[viewport=false]/navigation-menu:rounded-[12px] group-data-[viewport=false]/navigation-menu:border group-data-[viewport=false]/navigation-menu:border-[var(--omenu-panneau-filet)] group-data-[viewport=false]/navigation-menu:bg-[var(--omenu-panneau)] group-data-[viewport=false]/navigation-menu:p-1.5 group-data-[viewport=false]/navigation-menu:text-[var(--omenu-panneau-encre)] group-data-[viewport=false]/navigation-menu:shadow-[0_18px_44px_-14px_rgba(9,9,11,0.28)]",
        className,
      )}
      {...props}
    />
  );
}

function NavigationMenuViewport({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
  return (
    <div className="absolute top-full left-0 isolate z-50 flex justify-center">
      <NavigationMenuPrimitive.Viewport
        data-slot="navigation-menu-viewport"
        className={cn(
          "relative mt-2 h-[var(--radix-navigation-menu-viewport-height)] w-full origin-top overflow-hidden rounded-[12px] border border-[var(--omenu-panneau-filet)] bg-[var(--omenu-panneau)] p-1.5 text-[var(--omenu-panneau-encre)] shadow-[0_18px_44px_-14px_rgba(9,9,11,0.28)] md:w-[var(--radix-navigation-menu-viewport-width)]",
          className,
        )}
        {...props}
      />
    </div>
  );
}

function NavigationMenuLink({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Link>) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn(
        "flex flex-col gap-0.5 rounded-[8px] p-2.5 text-[14px] leading-snug outline-none transition-colors duration-150 hover:bg-[var(--omenu-panneau-survol)] focus-visible:bg-[var(--omenu-panneau-survol)] data-[active]:bg-[var(--omenu-panneau-survol)]",
        className,
      )}
      {...props}
    />
  );
}

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
};
