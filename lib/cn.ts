import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/* ══════════════════════════════════════════════════════════════════════
   cn — la fusion de classes des composants shadcn (11/09/2026)

   `components.json` déclare l'alias `"utils": "@/lib/cn"` depuis le 21/07,
   mais le fichier n'avait jamais été écrit : aucune reprise ne s'en était
   servie. `features-4` s'en passait en composant ses classes à la main, et
   les six composants de `components/accueil/` ont été réencrés sans `cn()`
   — c'était même « l'adaptation nº 1 de chaque reprise ».

   Le menu de navigation, lui, en a besoin pour de bon : ses parties
   acceptent toutes un `className` de l'appelant, et sans `twMerge` un
   `px-3` passé à un `NavigationMenuTrigger` cohabiterait avec le `px-4` de
   la variante au lieu de le remplacer — l'ordre dans la feuille décide, pas
   l'appelant. Les deux dépendances étaient déjà installées.

   Écrire ce fichier ne change rien à l'existant : personne ne l'importait.
   ══════════════════════════════════════════════════════════════════════ */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
