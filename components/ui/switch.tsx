"use client";

import * as React from "react";

import { cn } from "@/lib/cn";

/* ══════════════════════════════════════════════════════════════════════
   switch — l'interrupteur du module de prix (14/09/2026)

   Posé pour la bascule « Facturation annuelle » de /tarifs, qui remplace
   le sélecteur segmenté Mensuel | Annuel : le composant de référence
   (pricing-module) pose un `Switch` suivi d'un libellé cliquable.

   Écarts avec la référence, assumés :

   1. La référence propose `jolbol1/switch`, bâti sur `react-aria-components`.
      Le paquet n'est pas installé et ne l'est pas ailleurs sur le parc :
      pour UN interrupteur, c'est une dépendance de plus à maintenir. La
      géométrie de la référence est reprise telle quelle — piste 24 × 44,
      pouce de 20, course de 20 px — sur un `<button role="switch">`
      natif, qui porte déjà `aria-checked`, la barre d'espace et l'entrée.
   2. Le libellé est passé en `children` et vit DANS le bouton : un
      `<label htmlFor>` ne déclenche pas un `<button>`, et un `<input
      type="checkbox">` caché aurait rendu la course impossible à animer
      proprement. Le texte du libellé devient donc le nom accessible.
   3. Les jetons shadcn (`bg-input`, `bg-primary`, `bg-background`) ne
      peignent rien ici — le site n'en a aucun. Les couleurs de la charte
      sont écrites : piste éteinte #dcdcdc, piste allumée #050505, pouce
      blanc.
   4. `cursor-pointer` explicite : la préflight de Tailwind v4 met
      `cursor: default` sur les `<button>`.
   ══════════════════════════════════════════════════════════════════════ */

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  children,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "group inline-flex cursor-pointer items-center gap-3 rounded-full text-sm font-medium leading-none",
        "outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#050505]/70",
        "disabled:cursor-not-allowed disabled:opacity-70",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors",
          checked ? "bg-[#050505]" : "bg-[#dcdcdc] group-hover:bg-[#cfcfcf]",
        )}
      >
        <span
          className={cn(
            "pointer-events-none block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>
      {children}
    </button>
  );
}
