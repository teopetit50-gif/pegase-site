import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/* Le site source avait ce `cn` dans lib/utils.ts. Ce site n'en a pas — et
   `lib/` est partagé entre les quatre rapatriements du 11/09 : on garde donc
   l'outil DANS le dossier du produit, qui n'appartient qu'à lui. */
export function cn(...entrees: ClassValue[]) {
  return twMerge(clsx(entrees));
}
